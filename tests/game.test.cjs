const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function game(seed = 42, start = true) {
  const listeners = {};
  const elements = {};
  const calls = [];
  const minimapCalls = [];
  const noop = () => {};
  const ctx = new Proxy({}, {
    get: (_, name) => name === 'measureText' ? text => ({ width: text.length * 7 }) : ['createLinearGradient','createRadialGradient'].includes(name) ? () => ({addColorStop:noop}) : (...args) => calls.push([name, ...args]),
    set: () => true,
  });
  const minimapCtx = new Proxy({}, {
    get: (_, name) => (...args) => minimapCalls.push([name, ...args]),
    set: (_, name, value) => { minimapCalls.push(['set', name, value]); return true; },
  });
  function element(id) {
    return elements[id] ||= { style: {}, hidden: false, disabled: false,
      textContent: '', ariaPressed: '', addEventListener: (name, fn) => { listeners[`${id}:${name}`] = fn; },
      getContext: () => id === 'minimap' ? minimapCtx : ctx, focus: noop };
  }
  const sandbox = vm.createContext({
    document: { getElementById: element, addEventListener: (name, fn) => { listeners[name] = fn; } },
    window: {}, Date, setInterval: noop, console,
    Math: Object.assign(Object.create(Math), { random: () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) }),
  });
  for (const file of ['sprites.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), sandbox);
  if (start) vm.runInContext('startGame()', sandbox);
  return {
    run: code => vm.runInContext(code, sandbox),
    json: code => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, sandbox)),
    key: (key, extra = {}) => listeners.keydown({ key, preventDefault: noop, ...extra }),
    click: id => listeners[`${id}:click`](),
    visibility: () => listeners.visibilitychange(), elements, calls, minimapCalls,
  };
}

// Fixtures for unrelated mechanics bypass only the new key prerequisite.
// Dedicated key/campaign tests below exercise real drops and collection.
function down(g) { g.run('if(state.floorKey) state.floorKey.collected=true; state.player.x = state.stairs.x; state.player.y = state.stairs.y; pickup()'); }
function up(g) { g.run('state.player.x = state.upstairs.x; state.player.y = state.upstairs.y; pickup()'); }

test('floors preserve layout, exploration, collected loot, and current progression on round trips', () => {
  const g = game();
  const map1 = g.json('state.map');
  g.run(`state.monsters[0].hp = 0;
    state.player.hp = 40;
    state.player.x = state.potions[0].x; state.player.y = state.potions[0].y; pickup()`);
  assert.equal(g.run('state.player.hp'), 40, 'collecting a potion does not heal');
  g.run(`state.player.x = state.treasures[0].x; state.player.y = state.treasures[0].y; pickup();
    state.visited.add('0,0')`);
  const loot1 = g.json('[state.potions, state.treasures]');
  down(g);
  const map2 = g.json('state.map');
  assert.equal(g.run('state.depth'), 2);
  g.run(`state.gold += 100; state.kills += 3; state.turn += 9; state.player.xp = 17;
    state.player.str += 4; state.player.dex += 2; state.player.hp = 35;
    state.player.lvl = 3; state.player.maxHp = 80; state.player.def += 1;
    state.equipment.weapon = { ...ITEM_TABLE[1] };
    state.visited.add('35,23');
    state.potions = []; state.treasures = [];
    state.monsters.forEach(m => m.hp = 1)`);
  const progression = g.json('[state.gold, state.kills, state.turn, state.player.hp, state.player.xp, state.player.str, state.player.dex, state.player.lvl, state.player.maxHp, state.player.def, state.equipment, state.inventory]');
  up(g);
  assert.deepEqual(g.json('state.map'), map1);
  assert.deepEqual(g.json('[state.potions, state.treasures]'), loot1);
  assert.equal(g.run("state.visited.has('0,0')"), true);
  assert.equal(g.run('state.monsters.every(m => m.hp === m.maxHp)'), true);
  assert.equal(g.run('state.monsters.length'), g.run('state.monsterSpawns.length'));
  assert.deepEqual(g.json('[state.player.x, state.player.y]'), g.json('[state.stairs.x, state.stairs.y]'));
  down(g);
  assert.deepEqual(g.json('state.map'), map2);
  assert.equal(g.run("state.visited.has('35,23')"), true);
  assert.equal(g.run('state.potions.length + state.treasures.length'), 0);
  assert.deepEqual(g.json('[state.gold, state.kills, state.turn, state.player.hp, state.player.xp, state.player.str, state.player.dex, state.player.lvl, state.player.maxHp, state.player.def, state.equipment, state.inventory]'), progression);
  assert.equal(g.run('state.monsters.every(m => m.hp === m.maxHp && Math.max(Math.abs(m.x-state.player.x),Math.abs(m.y-state.player.y)) > 2)'), true);
});

test('merchant purchases, sales, and rescues stay resolved on revisits', () => {
  const g = game(); down(g);
  g.run(`state.gold = 500;
    state.merchant.stock = [{ ...ITEM_TABLE[0] }, { ...ITEM_TABLE[1] }];
    state.player.x = state.merchant.x; state.player.y = state.merchant.y;
    pickup(); pickup(); sellToMerchant();
    state.player.x = state.prisoner.x; state.player.y = state.prisoner.y; pickup()`);
  const progress = g.json('[state.gold, state.inventory, state.equipment]');
  down(g); up(g);
  assert.equal(g.run('state.merchant.stock.length'), 0);
  assert.equal(g.run('state.prisoner.rescued'), true);
  g.run('state.player.x = state.prisoner.x; state.player.y = state.prisoner.y; pickup()');
  assert.deepEqual(g.json('[state.gold, state.inventory, state.equipment]'), [progress[0] + 3, progress[1], progress[2]]);
});

test('stairs require their tile, arrival connects both ways, and descent rewards happen once', () => {
  const g = game();
  g.run('descendStairs()'); assert.equal(g.run('state.depth'), 1);
  g.run('state.monsters.forEach(m => m.hp = 0)'); down(g);
  assert.equal(g.run('state.gold'), 33);
  assert.deepEqual(g.json('[state.player.x,state.player.y]'),g.json('[state.upstairs.x,state.upstairs.y]'));
  g.run('state.player.x = state.stairs.x; state.player.y = state.stairs.y; ascendStairs()');
  assert.equal(g.run('state.depth'), 2);
  up(g); down(g);
  assert.equal(g.run('state.gold'), 33);
  g.run('newGame()');
  assert.deepEqual(g.json('Object.keys(state.floors)'), ['1']);
  assert.equal(g.run('state.gold'), 0);
});

test('safe monster spawns and accessible loot over varied floor generation', () => {
  const g = game();
  for (let i = 0; i < 60; i++) {
    g.run('newGame(); enterFloor(2, false)');
    assert.equal(g.run('state.monsters.every(m => state.map[m.y][m.x] === 0 && Math.max(Math.abs(m.x-state.player.x), Math.abs(m.y-state.player.y)) > 2)'), true);
    assert.equal(g.run('new Set(state.monsters.map(m => `${m.x},${m.y}`)).size === state.monsters.length'), true);
    assert.equal(g.run(`new Set([...state.potions,...state.treasures,state.stairs,state.upstairs,state.merchant,state.prisoner].filter(Boolean).map(o => o.x+','+o.y)).size === state.potions.length + state.treasures.length + 4`), true);
  }
});

test('stored potions heal only on use, cap at max HP, and are not wasted at full health', () => {
  const g = game();
  g.run('storePotion({heal:0.35})'); g.key('h');
  assert.equal(g.run('state.inventory.length'), 1);
  g.run('state.player.hp = 59'); g.key('h');
  assert.equal(g.run('state.player.hp'), 60);
  assert.equal(g.run('state.inventory.length'), 0);
  g.key('h'); assert.equal(g.run('state.player.hp'), 60);
});

test('both thresholds pause immediately, freeze simulation, rearm on recovery, and allow healing', () => {
  const g = game();
  g.run("hurtPlayer(49, 'hit'); render()");
  assert.equal(g.run('state.pause.kind'), 'health');
  assert.equal(g.elements.retreatChoice.hidden, true);
  const before = g.json('[state.monsters,state.turn,state.combatElapsed,state.player]');
  g.key('ArrowRight'); g.run("enemyTick(); recoveryTick(100); hurtPlayer(5,'blocked')");
  assert.deepEqual(g.json('[state.monsters,state.turn,state.combatElapsed,state.player]'), before);
  g.key('c'); assert.equal(g.run('state.pause'), null);
  g.run('checkHealth()'); assert.equal(g.run('state.pause'), null, 'no repeated warning until recovery');
  g.run("hurtPlayer(6, 'critical'); render()");
  assert.equal(g.run('state.player.hp'), 5);
  assert.equal(g.elements.retreatChoice.hidden, false);
  g.run('storePotion({heal:0.35})'); g.key('h');
  assert.equal(g.run('state.player.hp'), 26);
  assert.equal(g.run('state.pause.kind'), 'health', 'healing retains pause until explicit continue');
  g.key('c');
  g.run("hurtPlayer(15, 'again')");
  assert.equal(g.run('state.pause.kind'), 'health', 'warning rearmed above 20%');
});

test('enemy attack that crosses threshold stops remaining attackers in the same tick', () => {
  const g = game();
  g.run(`state.hazards=[]; state.player.x = 10; state.player.y = 10; state.player.hp = 13;
    state.map[10][9] = 0; state.map[10][10] = 0;
    state.monsters = [0,1].map(id => ({id,x:9,y:10,hp:100,maxHp:100,atk:8,def:0,name:'Test',sprite:'slime'}));
    Math.random = () => 0.4; enemyTick()`);
  assert.equal(g.run('state.player.hp'), 10);
  assert.equal(g.run('state.pause.kind'), 'health');
});

test('retreat confirms/cancels, returns one floor with full HP, and preserves progression and loot', () => {
  const g = game(); down(g);
  g.run("state.player.hp=5; state.potions=[]; state.gold=123; checkHealth(); retreat()");
  assert.equal(g.run('state.pause.kind'), 'retreat');
  assert.equal(g.run('state.depth'), 2);
  g.key('Escape'); assert.equal(g.run('state.pause.kind'), 'health');
  g.key('Enter'); g.key('y');
  assert.equal(g.run('state.depth'), 1);
  assert.equal(g.run('state.player.hp'), 60);
  assert.equal(g.run('state.gold'), 123);
  assert.equal(g.run('state.pause'), null);
  down(g); assert.equal(g.run('state.potions.length'), 0);
});

test('depth 1 retreat heals at entrance; lethal damage wins over health pause', () => {
  const g = game();
  g.run("hurtPlayer(56,'critical'); retreat(); confirmRetreat()");
  assert.equal(g.run('state.depth'), 1);
  assert.equal(g.run('state.player.hp'), 60);
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), g.json('[state.upstairs.x,state.upstairs.y]'));
  g.run("hurtPlayer(100,'fatal')");
  assert.equal(g.run('state.gameOver'), true);
  assert.equal(g.run('state.player.hp'), 0);
  assert.equal(g.run('state.pause'), null);
  g.run('retreat(); drinkPotion()'); assert.equal(g.run('state.player.hp'), 0);
});

test('autohealing respects active time, cooldown, nearby enemies, pauses, and HP cap', () => {
  const g = game();
  g.run('state.player.hp=40; state.monsters=[]; markCombat(); recoveryTick(6)');
  assert.equal(g.run('state.player.hp'), 40);
  g.run('recoveryTick(1)'); assert.equal(g.run('state.player.hp'), 40);
  g.run('recoveryTick(1)'); assert.equal(g.run('state.player.hp'), 41);
  g.run('retreat(); recoveryTick(500)'); assert.equal(g.run('state.player.hp'), 41);
  g.run('cancelRetreat(); recoveryTick(2)'); assert.equal(g.run('state.player.hp'), 42);
  g.run('state.monsters=[{hp:1,x:state.player.x+3,y:state.player.y}]; recoveryTick(50)');
  assert.equal(g.run('state.player.hp'), 42);
  g.run("state.monsters=[]; hurtPlayer(1,'combat'); recoveryTick(7)");
  assert.equal(g.run('state.player.hp'), 41);
  g.run('recoveryTick(1)'); assert.equal(g.run('state.player.hp'), 42);
  g.run('recoveryTick(100)'); assert.equal(g.run('state.player.hp'), 60);
});

test('hidden tabs and visibility changes do not accumulate recovery time', () => {
  const g = game();
  g.run('state.monsters=[]; state.player.hp=40; state.combatElapsed=6; document.hidden=true; state.lastTick=0; enemyTick()');
  assert.equal(g.run('state.player.hp'), 40);
  assert.equal(g.run('state.combatElapsed'), 6);
  g.run('document.hidden=false; state.lastTick=0');
  const before = Date.now();
  g.visibility();
  assert.equal(g.run('state.lastTick') >= before, true);
  g.run('enemyTick()');
  assert.equal(g.run('state.player.hp'), 40);
});

test('remembered stairs, loot, and terrain render without showing distant monsters', () => {
  const g = game();
  g.run(`state.player.x=state.stairs.x; state.player.y=state.stairs.y; state.treasures=[{x:state.player.x+1,y:state.player.y}]; state.visited.add(\`\${state.stairs.x},\${state.stairs.y}\`); state.visited.add(\`\${state.treasures[0].x},\${state.treasures[0].y}\`);
    window.drawnSprites=[]; const originalDrawSprite=drawSprite;
    drawSprite=function(...args) { window.drawnSprites.push(args); originalDrawSprite(...args); }`);
  g.calls.length = 0; g.run('draw()');
  assert.equal(g.run("window.drawnSprites.some(([name,x,y])=>name==='stairsDown' && x===state.stairs.x*TILE+TILE/2 && y===state.stairs.y*TILE+TILE/2)"), true);
  assert.equal(g.calls.some(c => c[0] === 'strokeRect'), true);
});

test('equipment with absent optional stats keeps combat numbers finite', () => {
  const g = game();
  for (const index of [1,2,3,4]) {
    g.run(`state.equipment[ITEM_TABLE[${index}].kind === 'weapon' ? 'weapon' : ITEM_TABLE[${index}].kind === 'ring' ? 'ring' : 'armor'] = {...ITEM_TABLE[${index}]}`);
    assert.equal(g.run('[effectiveStr(),effectiveDex(),effectiveAtk(),effectiveDef(),dodgeChance()].every(Number.isFinite)'), true);
  }
});

test('audio starts on interaction, schedules tones, mutes output, and survives restart', () => {
  const g = game();
  g.run(`window.AudioContext = class {
    constructor() { this.state='running'; this.currentTime=0; this.destination={}; this.tones=0; }
    createGain() { return {gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}; }
    createOscillator() { this.tones++; return {frequency:{value:0},connect(){},disconnect(){},start(){},stop(){}}; }
  }`);
  assert.equal(g.run('state.audio.context'), null);
  g.key('h');
  g.run("musicTick(); playSound('slash'); playSound('heal'); playSound('death')");
  assert.equal(g.run('state.audio.context.tones > 5'), true);
  g.key('m'); assert.equal(g.run('state.audio.master.gain.value'), 0);
  const before = g.run('state.audio.context.tones');
  g.run("playSound('hit'); musicTick()"); assert.equal(g.run('state.audio.context.tones'), before);
  g.key('r'); assert.equal(g.run('state.audio.enabled'), false);
  g.key('m'); assert.equal(g.run('state.audio.master.gain.value'), 0.12);
});

test('audio absence or initialization failure does not break input or rendering', () => {
  const g = game(); g.key('h');
  g.run('window.AudioContext = class {constructor(){throw Error("unavailable")}}');
  g.key('h'); g.run('render()');
  assert.equal(g.run('state.gameOver'), false);
  assert.equal(g.run('state.audio.enabled'), false);
});

test('ten-floor campaign gates the Mimic, requires dragon defeat then princess rescue, and preserves boss defeats', () => {
  const g = game();
  for (let depth = 1; depth < 5; depth++) {
    assert.equal(g.run('state.princess'), null);
    down(g);
  }
  assert.equal(g.run('state.depth'), 5);
  assert.equal(g.run('state.princess'), null);
  down(g); assert.equal(g.run('state.depth'), 5, 'cannot bypass Mimic');
  g.run('damageMonster(state.boss, state.boss.hp); render()');
  assert.equal(g.run('state.gameOver'), false, 'Mimic is not the final encounter');
  assert.equal(g.run('state.floors[5].bossDefeated'), true);
  assert.match(g.elements.objective.textContent, /dragon/);
  const once = g.json('[state.gold,state.kills,state.player.xp,state.player.lvl]');
  g.run('damageMonster(state.boss, 9999)');
  assert.deepEqual(g.json('[state.gold,state.kills,state.player.xp,state.player.lvl]'), once, 'dead boss rewards cannot be claimed again');
  down(g); up(g);
  assert.equal(g.run('state.depth'), 5);
  assert.equal(g.run('state.boss'), null);
  assert.equal(g.run('state.monsters.some(m => m.isBoss)'), false);
  assert.equal(g.run('state.monsters.length'), g.run('state.monsterSpawns.length - 1'), 'ordinary monsters still respawn');
  for (let depth = 5; depth < 10; depth++) down(g);
  assert.equal(g.run('state.boss.isDragon'), true);
  const locked = g.json('[state.gold,state.player.hp]');
  g.run('state.player.x=state.princess.x; state.player.y=state.princess.y; pickup()');
  assert.equal(g.run('state.princess.rescued'), false);
  assert.equal(g.run('state.gameOver'), false);
  assert.deepEqual(g.json('[state.gold,state.player.hp]'), locked, 'locked rescue grants no reward');
  down(g); assert.equal(g.run('state.depth'), 10, 'no depth 11');
  g.run('enterFloor(11,false)'); assert.equal(g.run('state.depth'), 10);
  g.run('damageMonster(state.boss,state.boss.hp); render()');
  assert.equal(g.run('state.gameOver'), false, 'dragon kill alone is not victory');
  assert.match(g.elements.objective.textContent, /Rescue the princess/);
  up(g); down(g);
  assert.equal(g.run('state.boss'), null, 'dragon stays defeated after leaving');
  g.run('state.player.x=state.princess.x; state.player.y=state.princess.y; pickup()');
  assert.equal(g.run('state.won && state.gameOver && state.princess.rescued'), true);
  assert.equal(g.run('state.ending.phase'), 'reveal');
  assert.equal(g.elements.overlay.style.display, 'none');
  const gold = g.run('state.gold');
  g.run('pickup(); rescuePrincess()'); assert.equal(g.run('state.gold'), gold);
  g.key('r');
  assert.equal(g.run('state.depth'), 1);
  assert.deepEqual(g.json('Object.keys(state.floors)'), ['1']);
  assert.equal(g.run('state.bossDefeated'), false);
  assert.match(g.elements.objective.textContent, /Mimic/);
});

test('boss XP still levels the player and death persists before a floor transition', () => {
  const g = game();
  g.run('enterFloor(5,false); state.player.xp=39; damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('state.player.lvl > 1'), true);
  assert.equal(g.run('state.floors[5].bossDefeated'), true);
  assert.equal(g.run('state.won'), false);
});

test('retaliation and timed enemy attacks share a per-monster cooldown including dodges', () => {
  const g = game();
  g.run(`state.monsters=[{hp:10000,maxHp:10000,atk:8,def:0,name:'Test',sprite:'slime'}];
    Math.random=()=>0.9; attackMonster(state.monsters[0])`);
  assert.equal(g.run('state.player.hp'), 57);
  g.run('attackMonster(state.monsters[0]); enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.player.hp'), 57, 'no immediate double attack');
  g.run('advanceActiveTime(0.79); enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.player.hp'), 57);
  g.run('advanceActiveTime(0.02); enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.player.hp'), 54);
  g.run(`state.monsters.push({hp:10000,atk:8,name:'Other'}); enemyAttack(state.monsters[1])`);
  assert.equal(g.run('state.player.hp'), 51, 'separate monsters keep separate cooldowns');
  g.run('state.player.dex=30; Math.random=()=>0; advanceActiveTime(1); enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.player.hp'), 51, 'attack dodged');
  g.run('Math.random=()=>0.9; enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.player.hp'), 51, 'dodging still consumes enemy attack window');
});

test('retreat cooldown counts only active time, survives travel, and cancellation does not consume it', () => {
  const g = game();
  g.run('retreat(); cancelRetreat()');
  assert.equal(g.run('retreatRemaining()'), 0);
  g.run('state.player.hp=1; retreat(); confirmRetreat()');
  assert.equal(g.run('retreatRemaining()'), 60);
  assert.equal(g.run('state.player.hp'), 60);
  g.run('state.player.hp=5; checkHealth(); retreat(); advanceActiveTime(600); render()');
  assert.equal(g.run('state.pause.kind'), 'health', 'unavailable retreat keeps recovery dialog');
  assert.equal(g.run('retreatRemaining()'), 60, 'cannot wait out cooldown while paused');
  assert.equal(g.elements.retreatChoice.disabled, true);
  assert.match(g.elements.pauseText.textContent, /60 active seconds remaining/);
  g.run('continueGame(); document.hidden=true; advanceActiveTime(600); document.hidden=false');
  assert.equal(g.run('retreatRemaining()'), 60);
  g.run('advanceActiveTime(59); render()');
  assert.equal(g.elements.retreatStatus.textContent, '1s');
  down(g); up(g);
  assert.equal(g.run('retreatRemaining()'), 1, 'stairs cannot reset cooldown');
  g.run('advanceActiveTime(1); retreat(); cancelRetreat()');
  assert.equal(g.run('retreatRemaining()'), 0);
  g.run('retreat(); confirmRetreat()');
  assert.equal(g.run('state.player.hp'), 60);
  assert.equal(g.run('retreatRemaining()'), 60);
  g.key('r'); assert.equal(g.run('retreatRemaining()'), 0);
});

test('healing scales with max HP, retains safety checks, and caps the final heal', () => {
  const g = game();
  g.run('state.player.maxHp=190; state.player.hp=100; state.monsters=[]; markCombat(); recoveryTick(8)');
  assert.equal(g.run('state.player.hp'), 104);
  g.run('state.player.hp=189; recoveryTick(2)');
  assert.equal(g.run('state.player.hp'), 190);
  g.run('state.player.hp=100; state.monsters=[{hp:1,x:state.player.x,y:state.player.y+3}]; recoveryTick(50)');
  assert.equal(g.run('state.player.hp'), 100);
});

test('late-floor scaling removes the dragon damage spike without reducing XP and gold scaling', () => {
  const g = game();
  g.run('enterFloor(10,false)');
  assert.equal(g.run('state.boss.maxHp'), 376);
  assert.equal(g.run('state.boss.atk'), 45);
  assert.equal(g.run('state.boss.xp'), 1038);
  assert.equal(g.run('state.boss.gold'), 830);
  assert.equal(g.run('state.monsters.filter(m=>!m.isBoss).every(m=>m.atk<=38 && m.maxHp<=112)'), true);
});

test('independent volume settings clamp, update their own buses, preserve mute, and survive restart', () => {
  const g = game();
  g.run(`window.AudioContext=class {
    constructor(){this.state='running';this.destination={};this.currentTime=0;}
    createGain(){return {gain:{value:1},connect(){}};}
  }; startAudio()`);
  g.run("setAudioVolume('music',20)");
  assert.equal(g.run('state.audio.musicBus.gain.value'), 0.2);
  assert.equal(g.run('state.audio.effectsBus.gain.value'), 0.8);
  assert.equal(g.elements.musicVolumeText.textContent, '20%');
  g.key('m');
  g.run("setAudioVolume('effects',35)");
  assert.equal(g.run('state.audio.master.gain.value'), 0);
  assert.equal(g.run('state.audio.effectsBus.gain.value'), 0.35);
  g.key('r');
  assert.equal(g.run('state.audio.musicVolume'), 0.2);
  assert.equal(g.run('state.audio.effectsVolume'), 0.35);
  assert.equal(g.run('state.audio.enabled'), false);
  g.key('m');
  assert.equal(g.run('state.audio.master.gain.value'), 0.12);
  g.run("setAudioVolume('music',-100); setAudioVolume('effects',200)");
  assert.equal(g.run('state.audio.musicVolume'), 0);
  assert.equal(g.run('state.audio.effectsVolume'), 1);
  g.run("setAudioVolume('music','invalid'); setAudioVolume('other',50)");
  assert.equal(g.run('state.audio.musicVolume'), 0);
});

test('prepared no-gear endgame duel can finish using stored potions and the real combat/rescue functions', () => {
  const g = game();
  for (let depth = 1; depth <= 10; depth++) {
    if (depth > 1) down(g);
    g.run('for(const m of state.monsters.filter(m=>!m.isBoss)) damageMonster(m,m.hp)');
    if (depth === 5) g.run('damageMonster(state.boss,state.boss.hp)');
  }
  // Prepared duel, not a whole-run difficulty estimate: full HP, two potions,
  // no gear/dodges, one player attack per second, and no other attackers.
  g.run(`state.player.hp=state.player.maxHp;
    state.inventory=[{heal:0.35},{heal:0.35}];
    state.monsters=[state.boss]; Math.random=()=>0.9;
    for(let round=0;round<30 && state.boss.hp>0 && !state.gameOver;round++) {
      attackMonster(state.boss);
      if(state.player.hp/state.player.maxHp < 0.35) drinkPotion();
      if(state.pause) continueGame();
      advanceActiveTime(1);
    }`);
  assert.equal(g.run('state.bossDefeated && !state.gameOver'), true);
  assert.equal(g.run('state.player.hp > 0'), true);
  g.run('state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
  assert.equal(g.run('state.won'), true);
});

test('Enter used by gameplay prevents native activation of the newly focused dialog button', () => {
  const g = game();
  let prevented = false;
  g.key('Enter', { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(g.run('state.pause.kind'), 'retreat');
});

test('launch screen freezes play, first key only starts, and restart keeps launch branding hidden', () => {
  const g = game(42, false);
  assert.equal(g.run('state.started'), false);
  assert.equal(g.elements.launchScreen.hidden, false);
  assert.equal(g.elements.gameLayout.hidden, true);
  assert.match(g.elements.launchVersion.textContent, /^v\d+\.\d+\.\d+$/);
  const initial = g.json('[state.player,state.monsters,state.activeTime]');
  g.run('state.lastTick=0; enemyTick(); advanceActiveTime(10); recoveryTick(10)');
  assert.deepEqual(g.json('[state.player,state.monsters,state.activeTime]'), initial);
  g.key('Shift'); assert.equal(g.run('state.started'), false);
  g.key('Enter');
  assert.equal(g.run('state.started'), true);
  assert.equal(g.run('state.pause'), null, 'starting with Enter must not request retreat');
  assert.equal(g.elements.launchScreen.hidden, true);
  assert.equal(g.elements.gameLayout.hidden, false);
  g.key('r');
  assert.equal(g.run('state.started'), true);
  assert.equal(g.elements.launchScreen.hidden, true);
  assert.equal(g.run('state.messages.length'), 1, 'new run starts a fresh adventure log');
});

test('ring pickup increases real HP, replacement does not stack, and selling removes only the gear health bonus', () => {
  const g = game();
  g.run(`state.player.hp=40; state.potions=[];
    state.treasures=[{...ITEM_TABLE.find(it=>it.kind==='ring'), x:state.player.x,y:state.player.y}]; pickup()`);
  assert.equal(g.run('state.player.maxHp'), 80);
  assert.equal(g.run('state.player.hp'), 60);
  assert.equal(g.elements.gearHpBonus.textContent, '+20');
  assert.equal(g.elements.gearStrBonus.textContent, '+1');
  assert.match(g.elements.ringBonuses.textContent, /HP \+20.*STR \+1/);
  g.run(`state.treasures=[{...ITEM_TABLE.find(it=>it.kind==='ring'), x:state.player.x,y:state.player.y}]; pickup()`);
  assert.equal(g.run('state.player.maxHp'), 80);
  assert.equal(g.run('state.player.hp'), 60, 'same-bonus replacement must not grant another heal');
  g.run(`state.player.xp=state.player.xpNext-1;
    damageMonster({hp:1,maxHp:1,xp:1,gold:0,name:'Test'},1)`);
  assert.equal(g.run('state.player.maxHp'), 90, 'level-up stacks with equipped ring');
  g.run(`state.player.hp=89; state.merchant={x:state.player.x,y:state.player.y,stock:[]}; sellToMerchant()`);
  assert.equal(g.run('state.player.maxHp'), 70);
  assert.equal(g.run('state.player.hp'), 70, 'selling clamps HP to new maximum');
  assert.equal(g.elements.gearHpBonus.textContent, '+0');
  assert.equal(g.elements.ringName.textContent, 'Empty slot');
});

test('merchant ring purchase applies health and gear bonuses persist across floor changes', () => {
  const g = game(); down(g);
  g.run(`state.gold=500; state.merchant.stock=[{...ITEM_TABLE.find(it=>it.kind==='ring')}];
    state.player.x=state.merchant.x;state.player.y=state.merchant.y;buyFromMerchant()`);
  assert.equal(g.run('state.player.maxHp'), 80);
  assert.equal(g.run('state.player.hp'), 80);
  down(g); up(g);
  assert.equal(g.run('state.player.maxHp'), 80);
  assert.equal(g.run('state.player.hp'), 80);
});

test('sword raises actual attack and shield reduces actual incoming monster damage', () => {
  const g = game();
  const baseAttack = g.run('effectiveAtk()');
  g.run(`equipItem('weapon',{...ITEM_TABLE.find(it=>it.name==='Sword')}); render()`);
  assert.equal(g.run('effectiveAtk()'), baseAttack + 8, 'sword gives 6 attack and 2 strength');
  assert.equal(g.elements.heroStrength.textContent, 14);
  assert.match(g.elements.weaponBonuses.textContent, /STR \+2.*ATK \+6/);
  g.run(`Math.random=()=>0.9; enemyAttack({hp:100,atk:20,name:'Test'});`);
  const unshielded = 60 - g.run('state.player.hp');
  g.run(`state.player.hp=60; equipItem('armor',{...ITEM_TABLE.find(it=>it.name==='Shield')});
    enemyAttack({hp:100,atk:20,name:'Test'}); render()`);
  assert.equal(60 - g.run('state.player.hp'), unshielded - 5);
  assert.match(g.elements.armorBonuses.textContent, /DEF \+5/);
  assert.equal(g.elements.armorName.textContent, 'Shield');
  assert.equal(g.elements.heroDefense.textContent, g.run('effectiveDef()'));
});

function collectFloorKey(g) {
  g.run(`if(state.floorKey && !state.floorKey.collected) {
    if(!state.floorKey.drop) {
      const carrier=state.monsters.find(m=>m.id===state.floorKey.carrierId);
      damageMonster(carrier,carrier.hp);
    }
    state.player.x=state.floorKey.drop.x; state.player.y=state.floorKey.drop.y; pickup();
  }`);
}
function useDownStairs(g) { g.run('state.player.x=state.stairs.x; state.player.y=state.stairs.y; pickup()'); }

test('larger generated worlds keep all floor tiles, key carriers, stairs and NPCs reachable around obstacles', () => {
  const g = game();
  for (let i = 0; i < 50; i++) {
    g.run(`newGame(); enterFloor(${1 + i % 10},false)`);
    assert.deepEqual(g.json('[state.map[0].length,state.map.length,VIEW_W,VIEW_H]'), [72,48,36,24]);
    assert.equal(g.run('state.rooms.length >= 18 && state.rooms.length <= 22'), true);
    assert.equal(g.run('floorDistances(state.map,state.upstairs).size === state.map.flat().filter(t=>t===0).length'), true);
    assert.equal(g.run('floorDistances(state.map,state.upstairs).get(`${state.stairs.x},${state.stairs.y}`) > VIEW_W'), true);
    assert.equal(g.run('protectedFloorTiles().every(t=>floorDistances(state.map,state.upstairs).has(`${t.x},${t.y}`))'), true);
    assert.equal(g.run('state.obstacles.length > 0 && state.obstacles.every(o=>state.map[o.y][o.x]===2)'), true);
    assert.equal(g.run('state.hazards.every(h=>state.map[h.y][h.x]===0 && [state.upstairs,state.stairs].every(s=>Math.max(Math.abs(h.x-s.x),Math.abs(h.y-s.y))>3))'), true);
    assert.equal(g.run('state.hazards.every(h=>!protectedFloorTiles().some(t=>t.x===h.x&&t.y===h.y))'), true);
    assert.equal(g.run("new Set(state.hazards.map(h=>h.type)).size"), 3);
    if (i % 10 < 9) assert.equal(g.run('state.monsters.some(m=>m.id===state.floorKey.carrierId && !m.isBoss)'), true);
    else assert.equal(g.run('state.floorKey'), null);
  }
});

test('hidden key carrier drops a key, stairs stay locked until Space collects it, and unlock persists', () => {
  const g = game();
  assert.equal(g.run('state.floorKey.drop'), null);
  assert.equal(g.elements.keyStatus.textContent, 'Missing');
  useDownStairs(g); assert.equal(g.run('state.depth'), 1);
  g.run(`const other=state.monsters.find(m=>m.id!==state.floorKey.carrierId); damageMonster(other,other.hp)`);
  assert.equal(g.run('state.floorKey.drop'), null);
  g.run(`const carrier=state.monsters.find(m=>m.id===state.floorKey.carrierId); damageMonster(carrier,carrier.hp); render()`);
  assert.equal(g.run('state.floorKey.dropped && !state.floorKey.collected'), true);
  assert.equal(g.elements.keyStatus.textContent, 'Dropped');
  useDownStairs(g); assert.equal(g.run('state.depth'), 1);
  collectFloorKey(g);
  assert.equal(g.elements.keyStatus.textContent, 'Unlocked');
  assert.equal(g.run('state.floorKey.drop'), null);
  useDownStairs(g); assert.equal(g.run('state.depth'), 2);
  up(g);
  assert.equal(g.run('state.floorKey.collected'), true);
  const gold = g.run('state.gold');
  g.run(`const returned=state.monsters.find(m=>m.id===state.floorKey.carrierId); damageMonster(returned,returned.hp)`);
  assert.equal(g.run('state.floorKey.drop'), null, 'respawned carrier cannot duplicate a collected key');
  const afterKill = g.run('state.gold');
  useDownStairs(g);
  assert.equal(g.run('state.depth'), 2);
  assert.equal(g.run('state.gold'), afterKill, 'unlocking again does not repeat descent reward');
  assert.equal(afterKill > gold, true, 'normal monster rewards still work');
});

test('uncollected key drop survives travel and another carrier death without duplication', () => {
  const g = game(); collectFloorKey(g); useDownStairs(g);
  g.run(`{const carrier=state.monsters.find(m=>m.id===state.floorKey.carrierId); damageMonster(carrier,carrier.hp);}`);
  const drop = g.json('state.floorKey.drop');
  up(g); useDownStairs(g);
  assert.deepEqual(g.json('state.floorKey.drop'), drop);
  g.run(`{const carrier=state.monsters.find(m=>m.id===state.floorKey.carrierId); damageMonster(carrier,carrier.hp);}`);
  assert.deepEqual(g.json('state.floorKey.drop'), drop);
  collectFloorKey(g); assert.equal(g.run('state.floorKey.collected'), true);
});

test('key pickup takes priority over stairs and NPC interaction on the same tile', () => {
  const g = game();
  g.run('state.floorKey.drop={...state.stairs};state.floorKey.dropped=true;state.player.x=state.stairs.x;state.player.y=state.stairs.y;pickup()');
  assert.equal(g.run('state.depth'), 1);
  assert.equal(g.run('state.floorKey.collected'), true);
  useDownStairs(g); assert.equal(g.run('state.depth'), 2);
  g.run('state.floorKey.drop={x:state.merchant.x,y:state.merchant.y};state.floorKey.dropped=true;state.player.x=state.merchant.x;state.player.y=state.merchant.y;state.gold=0;pickup()');
  assert.equal(g.run('state.floorKey.collected'), true);
  assert.equal(g.run('state.gold'), 0);
});

test('complete campaign can progress with real key drops and still requires both Mimic defeat and final rescue', () => {
  const g = game();
  for (let depth = 1; depth < 10; depth++) {
    useDownStairs(g); assert.equal(g.run('state.depth'), depth);
    collectFloorKey(g);
    if (depth === 5) {
      useDownStairs(g); assert.equal(g.run('state.depth'), 5);
      g.run('damageMonster(state.boss,state.boss.hp)');
    }
    useDownStairs(g); assert.equal(g.run('state.depth'), depth + 1);
  }
  assert.equal(g.run('state.floorKey'), null);
  g.run('damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('state.gameOver'), false);
  g.run('state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
  assert.equal(g.run('state.won'), true);
});

test('spikes are invisible before stepping, deal damage once, and remain revealed after revisiting', () => {
  const g = game();
  g.run(`state.monsters=[];state.map[5][7]=0;state.hazards=[{type:'spikes',x:7,y:5,revealed:false,triggered:false}];
    state.player.x=6;state.player.y=5;state.visited.add('7,5')`);
  g.calls.length=0; g.run('updateCamera();drawFloorDetails()');
  assert.equal(g.calls.length, 0, 'unrevealed spikes have no visual marker');
  g.run('movePlayer(1,0)');
  assert.equal(g.run('state.player.hp'), 53);
  assert.equal(g.run('state.hazards[0].triggered && state.hazards[0].revealed'), true);
  g.run('movePlayer(-1,0);movePlayer(1,0);hazardTick()');
  assert.equal(g.run('state.player.hp'), 53);
  down(g); up(g);
  assert.equal(g.run('state.hazards[0].triggered && state.hazards[0].revealed'), true);
  g.run('state.player.x=7;state.player.y=5;hazardTick()');
  assert.equal(g.run('state.player.hp'), 53);
});

test('flames cycle on/off and do not deal damage faster than once per active second', () => {
  const g = game();
  g.run(`state.monsters=[]; state.hazards=[{type:'flame',x:state.player.x,y:state.player.y,offset:0,revealed:true,nextDamageAt:0}]; hazardTick()`);
  assert.equal(g.run('state.player.hp'), 55);
  g.run('hazardTick();advanceActiveTime(0.9);hazardTick()');
  assert.equal(g.run('state.player.hp'), 55);
  g.run('advanceActiveTime(0.2);hazardTick()');
  assert.equal(g.run('state.player.hp'), 50);
  g.run('advanceActiveTime(2);hazardTick()');
  assert.equal(g.run('state.player.hp'), 50, 'off phase does no damage');
  g.run('advanceActiveTime(3);hazardTick()');
  assert.equal(g.run('state.player.hp'), 45);
});

test('falling rocks warn before one impact, can be dodged by moving, and leave passable spent debris', () => {
  const g = game();
  g.run(`state.monsters=[];state.map[5][7]=0;state.hazards=[{type:'rocks',x:7,y:5,revealed:true,triggered:false,stage:'idle'}];state.player.x=6;state.player.y=5;movePlayer(1,0)`);
  assert.equal(g.run('state.hazards[0].stage'), 'warning');
  assert.equal(g.run('state.player.hp'), 60);
  g.run('advanceActiveTime(1);hazardTick()');
  assert.equal(g.run('state.player.hp'), 60);
  g.run('advanceActiveTime(0.3);hazardTick()');
  assert.equal(g.run('state.player.hp'), 50);
  assert.equal(g.run('state.hazards[0].stage'), 'spent');
  assert.equal(g.run('state.map[5][7]'), 0);
  g.run('advanceActiveTime(10);hazardTick()');assert.equal(g.run('state.player.hp'), 50);
  g.run("state.hazards[0].triggered=false;state.hazards[0].stage='idle';hazardTick();movePlayer(-1,0);advanceActiveTime(1.3);hazardTick()");
  assert.equal(g.run('state.player.hp'), 50, 'moving off warning tile avoids impact');
});

test('hazard clocks and warnings freeze during pauses, hidden tabs, launch, and absence from the floor', () => {
  const g = game();
  g.run(`state.monsters=[];state.hazards=[{type:'rocks',x:state.player.x,y:state.player.y,revealed:true,triggered:false,stage:'idle'}];hazardTick();advanceActiveTime(0.5);retreat();advanceActiveTime(100);hazardTick()`);
  assert.equal(g.run('state.hazardTime'), 0.5);
  assert.equal(g.run('state.hazards[0].stage'), 'warning');
  g.run('cancelRetreat();document.hidden=true;advanceActiveTime(100);hazardTick();document.hidden=false');
  assert.equal(g.run('state.hazardTime'), 0.5);
  down(g); g.run('advanceActiveTime(100)'); up(g);
  assert.equal(g.run('state.hazardTime'), 0.5);
  assert.equal(g.run('state.hazards[0].stage'), 'warning');
  g.run('state.player.x=state.hazards[0].x;state.player.y=state.hazards[0].y;advanceActiveTime(0.8);hazardTick()');
  assert.equal(g.run('state.player.hp'), 50);
  const launch = game(42,false); launch.run('advanceActiveTime(100);hazardTick()');
  assert.equal(launch.run('state.hazardTime'), 0);
});

test('hazards use centralized damage so threshold pauses and lethal hits stop immediately', () => {
  const g = game();
  g.run(`state.player.hp=13;state.monsters=[];state.hazards=[{type:'spikes',x:state.player.x,y:state.player.y,revealed:false,triggered:false}];hazardTick();render()`);
  assert.equal(g.run('state.player.hp'), 6);
  assert.equal(g.run('state.pause.kind'), 'health');
  g.run('advanceActiveTime(100);hazardTick()');assert.equal(g.run('state.player.hp'), 6);
  g.run("continueGame();state.hazards=[{type:'spikes',x:state.player.x,y:state.player.y,revealed:false,triggered:false}];hazardTick()");
  assert.equal(g.run('state.player.hp'), 0);
  assert.equal(g.run('state.gameOver'), true);
});

test('blocking obstacles stop both player movement and monster movement without losing exploration', () => {
  const g = game();
  g.run('state.monsters=[];state.hazards=[];state.player.x=6;state.player.y=5;state.map[5][7]=2;movePlayer(1,0)');
  assert.equal(g.run('state.player.x'), 6);
  g.run('state.player.x=8;state.map[5][8]=0;state.monsters=[{x:6,y:5,hp:10,name:"Test",sprite:"slime"}];Math.random=()=>0.4;enemyTick()');
  assert.equal(g.run('state.monsters[0].x'), 6);
});

test('camera follows full-world movement, clamps at every edge, and draws only a viewport', () => {
  const g = game();
  for (const [x,y,camX,camY] of [[1,1,0,0],[40,30,22,18],[71,47,36,24],[0,47,0,24],[71,0,36,0]]) {
    g.run(`state.player.x=${x};state.player.y=${y};updateCamera()`);
    assert.deepEqual(g.json('[state.camera.x,state.camera.y]'), [camX,camY]);
  }
  g.run('state.monsters=[];state.hazards=[];state.player.x=40;state.player.y=30;state.map[30][40]=0;state.map[30][41]=0;movePlayer(1,0)');
  assert.equal(g.run('state.player.x'), 41, 'movement is not bounded by the old viewport width');
  assert.equal(g.run("state.visited.has('41,30')"), true);
  g.calls.length=0;g.run('draw()');
  const translate=g.calls.find(c=>c[0]==='translate');
  assert.deepEqual(translate, ['translate', -g.run('state.camera.x')*32, -g.run('state.camera.y')*32]);
  assert.equal(g.calls.filter(c=>c[0]==='fillRect'&&c[3]===32&&c[4]===32).length <= 36*24*2, true);
  assert.equal(g.calls.filter(c=>c[0]==='save').length, g.calls.filter(c=>c[0]==='restore').length);
  assert.equal(g.run('inCamera(0,0)'), false);
});

test('falling-rock warning is drawn above the player instead of hidden under the sprite', () => {
  const g = game();
  g.run(`state.monsters=[];state.hazards=[{type:'rocks',x:state.player.x,y:state.player.y,revealed:true,triggered:true,stage:'warning',impactAt:1.2}];revealAroundPlayer()`);
  g.calls.length=0;g.run('draw()');
  const warning=g.calls.findIndex(c=>c[0]==='fillText'&&c[1]==='!');
  const playerTransform=g.calls.findLastIndex(c=>c[0]==='rotate');
  assert.equal(warning > playerTransform, true);
  assert.equal(g.calls[warning][3] < g.run('state.player.y')*32, true);
});

function reachEnding(g) {
  g.run(`enterFloor(10,false); damageMonster(state.boss,state.boss.hp);
    state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()`);
}

test('final interaction starts the twist once, including after revisiting the defeated dragon floor', () => {
  const g = game();
  g.run('enterFloor(10,false);state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
  assert.equal(g.run('state.ending'), null);
  g.run('damageMonster(state.boss,state.boss.hp)');
  up(g);down(g);
  assert.equal(g.run('state.boss'), null);
  g.run('state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
  assert.equal(g.run('state.ending.phase'), 'reveal');
  assert.equal(g.run('state.ending.dragon.isDragon'), true);
  assert.equal(g.run('state.ending.dragon.hp'), 0);
  assert.equal(g.run('state.gameOver && state.won'), true);
  assert.equal(g.elements.overlay.style.display, 'none');
  assert.equal(g.elements.endingControls.hidden, false);
  const before=g.json('[state.gold,state.player.hp,state.messages.length]');
  g.run('rescuePrincess();pickup();startEnding();gameOver(true)');
  assert.deepEqual(g.json('[state.gold,state.player.hp,state.messages.length]'), before);
});

test('ending phases run, heal, escape, and finish with a smaller crying hero walking toward the sun', () => {
  const g=game();reachEnding(g);
  const initial=g.json('endingScene()');
  g.run('advanceEnding(2.8)');
  assert.equal(g.run('state.ending.phase'), 'heal');
  assert.equal(g.run('endingScene().princess.x')>initial.princess.x, true);
  assert.equal(g.run('state.ending.dragon.hp'), 0);
  g.run('advanceEnding(1.5)');
  assert.equal(g.run('state.ending.dragon.hp>0 && state.ending.dragon.hp<state.ending.dragon.maxHp'), true);
  g.run('advanceEnding(0.7)');
  assert.equal(g.run('state.ending.phase'), 'escape');
  assert.equal(g.run('state.ending.dragon.hp===state.ending.dragon.maxHp'), true);
  const flight=g.json('endingScene()');
  g.run('advanceEnding(2)');
  assert.equal(g.run('endingScene().dragon.x')>flight.dragon.x, true);
  assert.equal(g.run('endingScene().dragon.y')<flight.dragon.y, true);
  g.run('advanceEnding(1.5)');
  const sunset=g.json('endingScene()');
  assert.equal(sunset.phase,'sunset');assert.equal(sunset.hero.crying,true);
  g.run('advanceEnding(5.5);render()');
  const final=g.json('endingScene()');
  assert.equal(final.phase,'done');
  assert.equal(final.hero.x>sunset.hero.x && final.hero.y<sunset.hero.y && final.hero.scale<sunset.hero.scale,true);
  assert.equal(g.run('state.ending.completed'),true);
  assert.equal(g.elements.skipEnding.disabled,true);
  assert.match(g.elements.objective.textContent,/THE END/);
  assert.equal(g.run('state.messages.filter(m=>m.includes("I love him")).length'),1);
  assert.equal(g.run('state.messages.filter(m=>m.includes("fly away together")).length'),1);
});

test('dungeon simulation and gameplay input freeze during the ending and its final hold',()=>{
  const g=game();reachEnding(g);
  const before=g.json('[state.player,state.monsters,state.hazards,state.hazardTime,state.activeTime,state.turn,state.gold,state.equipment,state.inventory]');
  g.key('ArrowRight');g.key(' ');g.key('h');g.key('Enter');g.key('q');
  g.run('enemyTick();advanceActiveTime(100);recoveryTick(100);hazardTick();hurtPlayer(100,"blocked");retreat()');
  assert.deepEqual(g.json('[state.player,state.monsters,state.hazards,state.hazardTime,state.activeTime,state.turn,state.gold,state.equipment,state.inventory]'),before);
  g.run('advanceEnding(14)');g.key('ArrowRight');g.run('enemyTick();hazardTick()');
  assert.deepEqual(g.json('[state.player,state.monsters,state.hazards,state.hazardTime,state.activeTime,state.turn,state.gold,state.equipment,state.inventory]'),before);
});

test('Esc and the skip button finish from every phase without repeating story events',()=>{
  for(const time of [0,2.5,4.2,6,10,13.9]){
    const g=game();reachEnding(g);g.run(`advanceEnding(${time})`);g.key('Escape');
    assert.equal(g.run('state.ending.completed'),true);
    assert.equal(g.run('state.ending.elapsed'),14);
    assert.equal(g.run('state.ending.dragon.hp===state.ending.dragon.maxHp'),true);
    const before=g.run('state.messages.length');g.key('Escape');g.click('skipEnding');
    assert.equal(g.run('state.messages.length'),before);
  }
});

test('restart cancels the ending frame and rejects stale callbacks from an old ending',()=>{
  const g=game();
  g.run(`window.frames=new Map();window.cancelled=[];window.nextFrame=0;
    window.requestAnimationFrame=fn=>{const id=++window.nextFrame;window.frames.set(id,fn);return id;};
    window.cancelAnimationFrame=id=>{window.cancelled.push(id);window.frames.delete(id);}`);
  reachEnding(g);
  const frameId=g.run('state.ending.frameId');
  g.run('window.oldEnding=state.ending;window.oldCallback=window.frames.get(state.ending.frameId)');
  g.key('r');
  assert.equal(g.run('state.ending'),null);
  assert.equal(g.run(`window.cancelled.includes(${frameId})`),true);
  const fresh=g.json('[state.player,state.activeTime,state.messages]');
  g.run('window.oldCallback(50000)');
  assert.deepEqual(g.json('[state.player,state.activeTime,state.messages]'),fresh);
  reachEnding(g);g.run('window.oldCallback(51000)');
  assert.equal(g.run('state.ending.elapsed'),0,'old frame cannot advance a new ending');
  g.click('restartEnding');assert.equal(g.run('state.ending'),null);
  assert.equal(g.elements.launchScreen.hidden,true);
  reachEnding(g);g.run('skipEnding()');g.key('r');
  assert.equal(g.run('state.depth'),1);assert.equal(g.run('state.ending'),null);
});

test('animation clock clamps frame gaps, freezes hidden tabs, and resumes without jumping',()=>{
  const g=game();reachEnding(g);
  g.run('endingFrame(1000,state.ending);endingFrame(1100,state.ending)');
  assert.equal(g.run('state.ending.elapsed'),0.1);
  g.run('endingFrame(9000,state.ending)');
  assert.equal(g.run('state.ending.elapsed'),0.2);
  g.run('document.hidden=true;endingFrame(20000,state.ending);advanceEnding(50);skipEnding()');
  assert.equal(g.run('state.ending.elapsed'),0.2);
  g.run('document.hidden=false');g.visibility();
  g.run('endingFrame(30000,state.ending)');
  assert.equal(g.run('state.ending.elapsed'),0.2);
  g.run('endingFrame(30050,state.ending)');
  assert.equal(Math.abs(g.run('state.ending.elapsed')-0.25)<1e-9,true);
});

test('ending drawing uses screen coordinates, renders tears/end stats, and balances canvas state',()=>{
  const g=game();reachEnding(g);
  for(const time of [0,2.8,4.3,6.5,9,12,14]){
    g.run(`state.ending.elapsed=${time};state.ending.phase=endingPhase(${time})`);
    g.calls.length=0;g.run('draw()');
    assert.equal(g.calls.some(c=>c[0]==='setTransform'&&c[1]===1&&c[5]===0&&c[6]===0),true);
    assert.equal(g.calls.filter(c=>c[0]==='save').length,g.calls.filter(c=>c[0]==='restore').length);
    assert.equal(g.calls.some(c=>c[0]==='translate'&&c[1]===-g.run('state.camera.x')*32&&c[2]===-g.run('state.camera.y')*32),false);
    if(time===14){
      assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]==='THE END'),true);
      assert.equal(g.calls.some(c=>c[0]==='fillText'&&/\bkill(s)?\b/.test(c[1])&&c[1].includes('gold')),true);
    }
  }
});

function speechEncounter(g) {
  g.run(`state.hazards=[];state.monsters=[{...MONSTER_TYPES[4],id:500,x:state.player.x+1,y:state.player.y,hp:500,maxHp:500,atk:1,def:0}];updateCamera()`);
}

test('surviving player hits and eligible enemy attacks trigger one rotating monster quote',()=>{
  const g=game();speechEncounter(g);
  g.run('attackMonster(state.monsters[0])');
  assert.equal(g.run('state.monsterSpeech.monsterId'),500);
  assert.equal(g.run('state.monsterSpeech.text===MONSTER_QUOTES[0]'),true);
  assert.equal(g.run('state.monsterQuoteIndex'),1,'retaliation does not cause a second quote');
  assert.equal(g.run('state.monsterSpeech.expiresAt-state.activeTime'),5);
  g.run('advanceActiveTime(5);enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.monsterSpeech.text===MONSTER_QUOTES[1]'),true);
  const other=game();speechEncounter(other);
  other.run('state.monsters[0].nextAttackAt=1;enemyAttack(state.monsters[0])');
  assert.equal(other.run('state.monsterSpeech'),null,'attack cooldown blocks speech too');
  other.run('advanceActiveTime(1);enemyAttack(state.monsters[0])');
  assert.equal(other.run('state.monsterSpeech.monsterId'),500);
});

test('speech stays for five active seconds without replacement and a global cooldown prevents crowd spam',()=>{
  const g=game();speechEncounter(g);
  g.run('state.monsters.push({...state.monsters[0],id:501,x:state.player.x-1});monsterTalk(state.monsters[0]);monsterTalk(state.monsters[1])');
  assert.equal(g.run('state.monsterSpeech.monsterId'),500);
  g.run('advanceActiveTime(4.99)');assert.notEqual(g.run('monsterSpeechLayout()'),null);
  g.run('monsterTalk(state.monsters[1])');assert.equal(g.run('state.monsterSpeech.monsterId'),500);
  g.run('advanceActiveTime(0.01)');assert.equal(g.run('state.monsterSpeech'),null);
  g.run('monsterTalk(state.monsters[1])');
  assert.equal(g.run('state.monsterSpeech.monsterId'),501);
  assert.equal(g.run('state.monsterQuoteIndex'),2);
});

test('quote timers freeze during pauses and hidden tabs, independently of NPC dialogue',()=>{
  const g=game();speechEncounter(g);
  g.run('state.bubble={text:"NPC hello",ttl:90};monsterTalk(state.monsters[0]);retreat()');
  const before=g.json('[state.monsterSpeech,state.monsterSpeechReadyAt,state.activeTime,state.bubble]');
  g.run('advanceActiveTime(60);monsterTalk(state.monsters[0]);enemyTick()');
  assert.deepEqual(g.json('[state.monsterSpeech,state.monsterSpeechReadyAt,state.activeTime,state.bubble]'),before);
  g.run('cancelRetreat();document.hidden=true;advanceActiveTime(60);monsterTalk(state.monsters[0]);enemyTick()');
  assert.deepEqual(g.json('[state.monsterSpeech,state.monsterSpeechReadyAt,state.activeTime,state.bubble]'),before);
  g.run('document.hidden=false;advanceActiveTime(5)');
  assert.equal(g.run('state.monsterSpeech'),null);
  assert.deepEqual(g.json('state.bubble'),{text:'NPC hello',ttl:90});
});

test('lethal hits and player death clear speech without enabling an immediate crowd quote',()=>{
  const g=game();speechEncounter(g);
  g.run('monsterTalk(state.monsters[0]);damageMonster(state.monsters[0],10000)');
  assert.equal(g.run('state.monsterSpeech'),null);
  assert.equal(g.run('state.monsterSpeechReadyAt'),5);
  g.run('state.monsters=[{...MONSTER_TYPES[4],id:501,x:7,y:5,hp:1}];attackMonster(state.monsters[0])');
  assert.equal(g.run('state.monsterSpeech'),null,'a one-shot kill never leaves a ghost bubble');
  g.run('state.monsters=[{...MONSTER_TYPES[4],id:502,x:7,y:5,hp:100}];advanceActiveTime(5);monsterTalk(state.monsters[0]);hurtPlayer(10000,"fatal")');
  assert.equal(g.run('state.gameOver'),true);assert.equal(g.run('state.monsterSpeech'),null);
});

test('travel, respawn, restart, and the ending clear transient monster speech',()=>{
  const g=game();speechEncounter(g);g.run('monsterTalk(state.monsters[0])');
  down(g);assert.equal(g.run('state.monsterSpeech'),null);
  assert.equal(g.run('state.monsterSpeechReadyAt'),g.run('state.activeTime'));
  speechEncounter(g);g.run('monsterTalk(state.monsters[0]);recreateMonsters()');
  assert.equal(g.run('state.monsterSpeech'),null);
  g.key('r');assert.equal(g.run('state.monsterQuoteIndex'),0);assert.equal(g.run('state.monsterSpeech'),null);
  g.run('enterFloor(10,false);damageMonster(state.boss,state.boss.hp)');
  speechEncounter(g);g.run('monsterTalk(state.monsters[0]);state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
  assert.notEqual(g.run('state.ending'),null);assert.equal(g.run('state.monsterSpeech'),null);
  g.run('monsterTalk(state.monsters[0])');assert.equal(g.run('state.monsterSpeech'),null);
});

test('speech follows its actor, hides with fog/offscreen/death, and stays clamped at camera edges',()=>{
  const g=game();speechEncounter(g);g.run('monsterTalk(state.monsters[0])');
  const first=g.json('monsterSpeechLayout()');
  g.run('state.monsters[0].x++');
  assert.equal(g.run('monsterSpeechLayout().anchorX'),first.anchorX+32);
  g.run('state.monsters[0].x=state.player.x+10');assert.equal(g.run('monsterSpeechLayout()'),null);
  g.run('state.monsters[0].x=71');assert.equal(g.run('monsterSpeechLayout()'),null);
  for(const [px,py,mx,my] of [[1,1,1,0],[70,1,71,0],[1,46,0,47],[70,46,71,47],[40,30,41,30]]){
    g.run(`state.player.x=${px};state.player.y=${py};state.monsters[0].x=${mx};state.monsters[0].y=${my};state.monsterQuoteIndex=2;updateCamera();clearMonsterSpeech();monsterTalk(state.monsters[0])`);
    const b=g.json('monsterSpeechLayout()');const cam=g.json('state.camera');
    assert.notEqual(b,null);
    assert.equal(b.x>=cam.x*32&&b.x+b.width<=(cam.x+36)*32,true);
    assert.equal(b.y>=cam.y*32&&b.y+b.height<=(cam.y+24)*32,true);
    if(my===0) assert.equal(b.below,true);
  }
  g.run('state.monsters[0].hp=0');assert.equal(g.run('monsterSpeechLayout()'),null);
});

test('quotes do not consume combat randomness or change damage outcomes',()=>{
  const g=game();speechEncounter(g);
  g.run('window.randomCalls=0;Math.random=()=>{window.randomCalls++;return 0.9;};attackMonster(state.monsters[0])');
  assert.equal(g.run('window.randomCalls'),1,'only the existing dodge check draws randomness');
  assert.equal(g.run('state.monsters[0].hp'),488);
  assert.equal(g.run('state.player.hp'),59);
  g.run('advanceActiveTime(5);window.randomCalls=0;monsterTalk(state.monsters[0])');
  assert.equal(g.run('window.randomCalls'),0);
});

test('speech draws after world/player layers without replacing NPC bubbles or leaking offscreen actors',()=>{
  const g=game();speechEncounter(g);
  g.run('state.bubble={text:"NPC hello",ttl:90};monsterTalk(state.monsters[0])');
  const text=g.run('state.monsterSpeech.text');g.calls.length=0;g.run('draw()');
  const bubble=g.calls.findIndex(c=>c[0]==='fillText'&&c[1]===text);
  const player=g.calls.findLastIndex(c=>c[0]==='rotate');
  assert.equal(bubble>player,true);
  assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]==='NPC hello'),true);
  assert.equal(g.calls.filter(c=>c[0]==='save').length,g.calls.filter(c=>c[0]==='restore').length);
  g.run('state.monsters[0].x=71');g.calls.length=0;g.run('drawMonsterSpeech()');
  assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]===text),false);
});

test('accepted combat quotes enter the journal once with the speaker name, including cooldown and pause guards',()=>{
  const g=game();speechEncounter(g);
  g.run('monsterTalk(state.monsters[0]);monsterTalk(state.monsters[0]);render();draw()');
  assert.equal(g.run('state.messages.filter(m=>m===`Orc: “${MONSTER_QUOTES[0]}”`).length'),1);
  assert.equal(g.elements.log.textContent.includes('Orc: “'),true);
  g.run('advanceActiveTime(4.99);monsterTalk(state.monsters[0]);retreat();advanceActiveTime(20);monsterTalk(state.monsters[0])');
  assert.equal(g.run('state.messages.filter(m=>m.startsWith("Orc: ")).length'),1);
  g.run('cancelRetreat();advanceActiveTime(0.01);monsterTalk(state.monsters[0])');
  assert.equal(g.run('state.messages.filter(m=>m.startsWith("Orc: ")).length'),2);
  g.run('damageMonster(state.monsters[0],9999)');
  assert.equal(g.run('state.messages.some(m=>m===`Orc: “${MONSTER_QUOTES[0]}”`)'),true,'speech history survives actor death');
});

test('large boss artwork fits its clear arena on generation and revisits, with health bars and speech above its bounds',()=>{
  const g=game();
  for(const depth of [5,10]) {
    g.run(`enterFloor(${depth},false)`);
    const initial=g.json('monsterVisual(state.boss)');
    assert.equal(initial.width>=96,true);
    if(depth===10) assert.equal(initial.height>=64,true);
    assert.equal(g.run('state.boss.x===state.rooms.find(r=>r.isArena).cx && state.boss.y===state.rooms.find(r=>r.isArena).cy'),true);
    assert.equal(g.run('state.monsters.filter(m=>!m.isBoss).every(m=>!bossSpawnBuffer(m.x,m.y))'),true);
    assert.equal(g.run('protectedFloorTiles().filter(t=>t!==state.boss).every(t=>!bossSpawnBuffer(t.x,t.y))'),true);
    assert.equal(g.run(`{const v=monsterVisual(state.boss), r=state.rooms.find(r=>r.isArena);
      v.left>=r.x*TILE && v.right<=(r.x+r.w)*TILE && v.top>=r.y*TILE && v.bottom<=(r.y+r.h)*TILE;}`),true);
    g.run('state.player.x=state.boss.x;state.player.y=state.boss.y+1;updateCamera();clearMonsterSpeech();monsterTalk(state.boss)');
    assert.equal(g.run('monsterSpeechLayout().y+monsterSpeechLayout().height < monsterVisual(state.boss).top-7'),true);
    g.calls.length=0;g.run('draw()');
    assert.equal(g.calls.some(c=>c[0]==='fillRect'&&c[2]===initial.top-7&&c[3]===initial.width-12&&c[4]===4),true);
    g.run('enterFloor(1,false)');g.run(`enterFloor(${depth},false)`);
    assert.deepEqual(g.json('monsterVisual(state.boss)'),initial);
  }
});

test('boss floors retain large connected halls and trap-free arenas over varied generations',()=>{
  const g=game();
  for(let i=0;i<20;i++) {
    const depth=i%2?5:10;
    g.run(`newGame();enterFloor(${depth},false)`);
    assert.equal(g.run(`{const r=state.rooms.find(r=>r.isArena);r.w>=18 && r.h>=14 &&
      state.map.slice(r.y,r.y+r.h).every(row=>row.slice(r.x,r.x+r.w).every(t=>t===0));}`),true);
    assert.equal(g.run('state.hazards.every(h=>!bossArenaContains(h.x,h.y))'),true);
    assert.equal(g.run('floorDistances(state.map,state.upstairs).size===state.map.flat().filter(t=>t===0).length'),true);
  }
  g.run(`window.corridorMap=Array.from({length:H},()=>Array(W).fill(1));carveCorridor(window.corridorMap,{cx:5,cy:5},{cx:15,cy:5},3)`);
  assert.equal(g.run('window.corridorMap.slice(4,7).every(row=>row.slice(4,17).every(t=>t===0))'),true);
});

test('minimap draws only explored terrain, discovered stairs, player and viewport without exposing hidden actors or traps',()=>{
  const g=game();
  g.run(`state.visited=new Set(['2,2','3,2','4,2']);state.map[2][2]=0;state.map[2][3]=1;state.map[2][4]=2;
    state.player.x=2;state.player.y=2;state.stairs={x:30,y:20};updateCamera()`);
  g.minimapCalls.length=0;g.run('renderMinimap()');
  const first=JSON.stringify(g.minimapCalls);
  assert.equal(g.minimapCalls.filter(c=>c[0]==='fillRect').length,6,'background, three known tiles, player border and player');
  assert.equal(g.minimapCalls.some(c=>c[0]==='strokeRect'&&c[1]===0.5&&c[2]===0.5&&c[3]===107&&c[4]===71),true);
  assert.equal(g.minimapCalls.some(c=>c[0]==='set'&&c[2]==='#f4cf78'),false,'undiscovered stair is hidden');
  g.run(`state.map[20][20]=0;state.monsters=[{id:1,x:3,y:2,hp:10}];state.floorKey.carrierId=1;
    state.floorKey.drop={x:3,y:2};state.hazards=[{x:3,y:2,type:'spikes',revealed:false}];state.treasures=[{x:3,y:2}]`);
  g.minimapCalls.length=0;g.run('renderMinimap()');
  assert.equal(JSON.stringify(g.minimapCalls),first,'secret content cannot change the chart');
  g.run("state.visited.add('30,20')");g.minimapCalls.length=0;g.run('renderMinimap()');
  assert.equal(g.minimapCalls.some(c=>c[0]==='set'&&c[2]==='#f4cf78'),true);
  assert.equal(g.minimapCalls.some(c=>c[0]==='fillRect'&&c[1]===90&&c[2]===60&&c[3]===3&&c[4]===3),true);
});

test('minimap follows floor-local exploration, scrolling and restart without mutating gameplay state',()=>{
  const g=game();
  g.run("state.visited.add('40,30');state.player.x=40;state.player.y=30;updateCamera()");
  const before=g.run('JSON.stringify(state)');
  g.minimapCalls.length=0;g.run('renderMinimap();renderMinimap()');
  assert.equal(g.run('JSON.stringify(state)'),before);
  assert.equal(g.minimapCalls.some(c=>c[0]==='strokeRect'&&c[1]===66.5&&c[2]===54.5),true);
  down(g);assert.equal(g.elements.minimapDepth.textContent,'D2');
  assert.equal(g.run("state.visited.has('40,30')"),false);
  up(g);assert.equal(g.elements.minimapDepth.textContent,'D1');
  assert.equal(g.run("state.visited.has('40,30')"),true);
  g.key('r');assert.equal(g.elements.minimapDepth.textContent,'D1');
  assert.equal(g.run("state.visited.has('40,30')"),false);
});
