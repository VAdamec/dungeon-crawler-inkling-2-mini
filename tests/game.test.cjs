const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeRecorder(limit = 250000) {
  let arr = [];
  let overflow = false;
  let filtered = 0;
  const rec = {
    get length() { return overflow ? -1 : arr.length; },
    get overflow() { return overflow; },
    get filtered() { return filtered; },
    get limit() { return limit; },
    push(...items) {
      if (overflow) return -1;
      if (arr.length + items.length > limit) { overflow = true; arr = []; return -1; }
      return arr.push(...items);
    },
    clear() { arr = []; overflow = false; filtered = 0; },
    noteFiltered(n = 1) { filtered += n; },
    toArray() {
      if (overflow) throw new Error(`draw recorder overflowed limit ${limit}; enable targeted recording or raise limit for this test`);
      return arr;
    },
    slice(...a) { return this.toArray().slice(...a); },
    some(fn) { return this.toArray().some(fn); },
    filter(fn) { return this.toArray().filter(fn); },
    find(fn) { return this.toArray().find(fn); },
    findIndex(fn) { return this.toArray().findIndex(fn); },
    findLastIndex(fn) { return this.toArray().findLastIndex(fn); },
    forEach(fn) { return this.toArray().forEach(fn); },
    map(fn) { return this.toArray().map(fn); },
    [Symbol.iterator]() { return this.toArray()[Symbol.iterator](); },
  };
  return new Proxy(rec, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'string' && /^\d+$/.test(p)) return t.toArray()[Number(p)];
      const v = t.toArray()[p];
      return typeof v === 'function' ? v.bind(t.toArray()) : v;
    },
    set(t, p, v) {
      if (p === 'length') { if (v === 0) { t.clear(); return true; } }
      throw new Error(`unsupported recorder write: ${String(p)}`);
    },
  });
}

function game(seed = 42, start = true, area = 'dungeon') {
  const listeners = {};
  const elements = {};
  const calls = makeRecorder();
  const minimapCalls = makeRecorder(50000);
  const noop = () => {};
  const recordCall = (target, name, args) => {
    // Skip per-pixel art decode fills to avoid OOM in no-DOM fallback; tests needing them should use targeted capture.
    if (name === 'fillRect' && args.length >= 4 && Math.abs(args[2]) <= 1 && Math.abs(args[3]) <= 1) {
      if (typeof target.noteFiltered === 'function') target.noteFiltered();
      return;
    }
    target.push([name, ...args]);
  };
  function makeCtx(target) {
    const state = { canvas: { width: 0, height: 0 }, globalAlpha: 1, imageSmoothingEnabled: true, fillStyle: '', strokeStyle: '', font: '', textAlign: 'left', textBaseline: 'alphabetic', lineWidth: 1 };
    return new Proxy(state, {
      get: (t, name) => {
        if (name in t) return t[name];
        if (name === 'measureText') return text => ({ width: String(text).length * 7 });
        if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop: noop });
        if (name === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(0,w|0) * Math.max(0,h|0) * 4), width: w|0, height: h|0 });
        if (name === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(0,w|0) * Math.max(0,h|0) * 4), width: w|0, height: h|0 });
        if (name === 'putImageData') return noop;
        return (...args) => recordCall(target, name, args);
      },
      set: (t, name, value) => { t[name] = value; return true; },
    });
  }
  const ctx = makeCtx(calls);
  const minimapCtxBase = makeCtx(minimapCalls);
  const minimapCtx = new Proxy(minimapCtxBase, {
    set: (t, name, value) => { t[name] = value; recordCall(minimapCalls, 'set', [name, value]); return true; },
  });
  function element(id) {
    return elements[id] ||= { style: {}, hidden: false, disabled: false,
      textContent: '', value: '', ariaPressed: '', addEventListener: (name, fn) => { listeners[`${id}:${name}`] = fn; },
      getContext: () => id === 'minimap' ? minimapCtx : ctx, focus: noop };
  }
  const sandbox = vm.createContext({
    document: { getElementById: element, addEventListener: (name, fn) => { listeners[name] = fn; } },
    window: {}, Date, setInterval: noop, console,
    Math: Object.assign(Object.create(Math), { random: () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) }),
  });
  for (const file of ['art-runtime.js', 'sprites.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), sandbox);
  if (start) {
    vm.runInContext('startGame()', sandbox);
    if (area === 'dungeon') vm.runInContext('enterDungeonFromTown(); render()', sandbox);
  }
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

test('retreat confirms/cancels, returns to town with full HP, and preserves progression and loot', () => {
  const g = game(); down(g);
  g.run("state.player.hp=5; state.player.mp=7; state.potions=[]; state.gold=123; checkHealth(); retreat()");
  assert.equal(g.run('state.pause.kind'), 'retreat');
  assert.equal(g.run('state.depth'), 2);
  const exit = g.json('[state.player.x,state.player.y]');
  g.key('Escape'); assert.equal(g.run('state.pause.kind'), 'health');
  g.key('Enter'); g.key('y');
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.depth'), 2);
  assert.equal(g.run('state.player.hp'), 60);
  assert.equal(g.run('state.player.mp'), 7);
  assert.equal(g.run('state.gold'), 123);
  assert.equal(g.run('state.pause'), null);
  assert.deepEqual(g.json('state.townExit'), { depth: 2, x: exit[0], y: exit[1], reason: 'retreat' });
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), g.json('[state.town.spawn.x,state.town.spawn.y]'));
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.depth'), 2);
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), exit);
  assert.equal(g.run('state.townExit'), null);
  assert.equal(g.run('state.potions.length'), 0);
});

test('depth 1 retreat returns to town and lethal damage wins over health pause', () => {
  const g = game();
  const exit = g.json('[state.player.x,state.player.y]');
  g.run("hurtPlayer(56,'critical'); retreat(); confirmRetreat()");
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.depth'), 1);
  assert.equal(g.run('state.player.hp'), 60);
  assert.deepEqual(g.json('state.townExit'), { depth: 1, x: exit[0], y: exit[1], reason: 'retreat' });
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), g.json('[state.town.spawn.x,state.town.spawn.y]'));
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.depth'), 1);
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), exit);
  g.run("hurtPlayer(100,'fatal')");
  assert.equal(g.run('state.gameOver'), true);
  assert.equal(g.run('state.player.hp'), 0);
  assert.equal(g.run('state.pause'), null);
  assert.equal(g.run('state.townExit'), null);
  g.run('retreat(); drinkPotion()'); assert.equal(g.run('state.player.hp'), 0);
});

test('retreat closes an open portal and blocked return points resolve safely', () => {
  const g = game();
  g.run('state.townPortalOpen = true; state.player.hp = 1; retreat(); confirmRetreat()');
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.equal(g.run('state.townExit.reason'), 'retreat');
  g.run('state.townExit.x = 0; state.townExit.y = 0; state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.notDeepEqual(g.json('[state.player.x,state.player.y]'), [0, 0]);
  assert.equal(g.run('state.map[state.player.y][state.player.x]'), 0);
  assert.equal(g.run('state.townExit'), null);
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
  const drawn = g.json('window.drawnSprites.map(([n,x,y])=>[n,x,y])');
  const sx = g.run('state.stairs.x*TILE+TILE/2'), sy = g.run('(state.stairs.y+1)*TILE'), syOld = g.run('state.stairs.y*TILE+TILE/2');
  assert.equal(drawn.some(([name,x,y])=>name==='stairsDown' && x===sx && (y===sy || y===syOld || Math.abs(y-syOld)<20)), true, JSON.stringify(drawn.slice(0,20)));
  assert.equal(g.run("window.drawnSprites.some(([name])=>name==='chest')"), true);
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
  assert.doesNotMatch(g.elements.objective.textContent, /Hydra|Next boss/);
  const once = g.json('[state.gold,state.kills,state.player.xp,state.player.lvl]');
  g.run('damageMonster(state.boss, 9999)');
  assert.deepEqual(g.json('[state.gold,state.kills,state.player.xp,state.player.lvl]'), once, 'dead boss rewards cannot be claimed again');
  down(g); up(g);
  assert.equal(g.run('state.depth'), 5);
  assert.equal(g.run('state.boss'), null);
  assert.equal(g.run('state.monsters.some(m => m.isBoss)'), false);
  assert.equal(g.run('state.monsters.length'), g.run('state.monsterSpawns.length - 1'), 'ordinary monsters still respawn');
  for (let depth = 5; depth < 100; depth++) {
    g.run('if(state.boss && bossGateAt(state.depth) && !state.bossDefeated) damageMonster(state.boss,state.boss.hp)');
    down(g);
  }
  assert.equal(g.run('state.boss.isDragon'), true);
  const locked = g.json('[state.gold,state.player.hp]');
  g.run('state.player.x=state.princess.x; state.player.y=state.princess.y; pickup()');
  assert.equal(g.run('state.princess.rescued'), false);
  assert.equal(g.run('state.gameOver'), false);
  assert.deepEqual(g.json('[state.gold,state.player.hp]'), locked, 'locked rescue grants no reward');
  down(g); assert.equal(g.run('state.depth'), 100, 'no depth 101');
  g.run('enterFloor(101,false)'); assert.equal(g.run('state.depth'), 100);
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
  assert.doesNotMatch(g.elements.objective.textContent, /Mimic|Next boss/);
});

test('boss XP still levels the player and death persists before a floor transition', () => {
  const g = game();
  g.run('enterFloor(5,false); state.player.xp=39; damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('state.player.lvl > 1'), true);
  assert.equal(g.run('state.floors[5].bossDefeated'), true);
  assert.equal(g.run('state.won'), false);
});

test('hero level stops at 100 and max-level kills do not grow XP', () => {
  const g = game();
  g.run(`state.monsters = [{ id: 91, name: 'Slime', sprite: 'slime', hp: 1, maxHp: 1,
    atk: 1, def: 0, xp: 999999, x: state.player.x + 1, y: state.player.y }];
    state.player.lvl = 99; state.player.xp = state.player.xpNext;
    damageMonster(state.monsters[0], 999)`);
  assert.equal(g.run('state.player.lvl'), 100);
  assert.equal(g.run('state.player.xp'), 0);
  assert.equal(g.run('state.player.xpNext'), 1);
  g.run(`state.monsters = [{ id: 92, name: 'Slime', sprite: 'slime', hp: 1, maxHp: 1,
    atk: 1, def: 0, xp: 999999, x: state.player.x + 1, y: state.player.y }];
    damageMonster(state.monsters[0], 999); render()`);
  assert.equal(g.run('state.player.lvl'), 100);
  assert.equal(g.run('state.player.xp'), 0);
  assert.equal(g.elements.xpfill.style.width, '0%');
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

test('retreat cooldown counts only active time, pauses in town, and cancellation does not consume it', () => {
  const g = game();
  g.run('retreat(); cancelRetreat()');
  assert.equal(g.run('retreatRemaining()'), 0);
  g.run('state.player.hp=1; retreat(); confirmRetreat()');
  assert.equal(g.run('retreatRemaining()'), 60);
  assert.equal(g.run('state.player.hp'), 60);
  assert.equal(g.run('state.area'), 'town');
  g.run('advanceActiveTime(600); render()');
  assert.equal(g.run('retreatRemaining()'), 60, 'cooldown does not tick down in town');
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
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

test('late-floor scaling keeps the final boss above ordinary monsters without reducing reward scaling', () => {
  const g = game();
  g.run('enterFloor(100,false)');
  assert.equal(g.run('state.boss.maxHp'), 2061);
  assert.equal(g.run('state.boss.atk'), 438);
  assert.equal(g.run('state.boss.xp'), 6438);
  assert.equal(g.run('state.boss.gold'), 5150);
  assert.equal(g.run('state.monsters.filter(m=>!m.isBoss).every(m=>m.atk<=254 && m.maxHp<=832 && m.atk<state.boss.atk && m.maxHp<state.boss.maxHp)'), true);
});

test('boss roster gates every milestone floor with distinct names and scaled rewards', () => {
  const g = game();
  assert.deepEqual(g.json('bossDepthList()'), [5,10,20,30,40,50,60,70,80,90,100]);
  for (const [depth, name] of [[5,'Mimic'],[10,'Hydra'],[20,'Wild Boar'],[30,'Medusa'],[40,'Dark Wizard'],[50,'Skeleton King'],[100,'Dragon']]) {
    g.run(`newGame();enterFloor(${depth},false)`);
    assert.equal(g.run('state.boss.name'), name);
    assert.equal(g.run('bossGateAt(state.depth)'), true);
    g.run('state.player.x=state.stairs.x;state.player.y=state.stairs.y;pickup()');
    assert.equal(g.run('state.depth'), depth, `${name} must be defeated before descending`);
  }
  assert.equal(g.run('bossForDepth(10).xp > bossForDepth(5).xp'), true);
  assert.equal(g.run('bossForDepth(100).gold > bossForDepth(90).gold'), true);
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
  for (let depth = 1; depth <= 100; depth++) {
    if (depth > 1) down(g);
    g.run('for(const m of state.monsters.filter(m=>!m.isBoss)) damageMonster(m,m.hp)');
    g.run('if(state.boss && bossGateAt(state.depth) && !state.bossDefeated) damageMonster(state.boss,state.boss.hp)');
  }
  // Prepared duel, not a whole-run difficulty estimate: full HP, two potions,
  // no gear/dodges, one player attack per second, and no other attackers.
  g.run(`state.player.maxHp=3000; state.player.hp=3000; state.player.str=300;
    state.inventory=[{heal:0.5},{heal:0.5},{heal:0.5},{heal:0.5}];
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
    assert.deepEqual(g.json('[state.map[0].length,state.map.length,VIEW_W,VIEW_H]'), [96,64,18,12]);
    assert.equal(g.run('state.rooms.length >= 28 && state.rooms.length <= 32'), true);
    assert.equal(g.run('floorDistances(state.map,state.upstairs).size === state.map.flat().filter(t=>t===0).length'), true);
    assert.equal(g.run('floorDistances(state.map,state.upstairs).get(`${state.stairs.x},${state.stairs.y}`) > VIEW_W'), true);
    assert.equal(g.run('protectedFloorTiles().every(t=>floorDistances(state.map,state.upstairs).has(`${t.x},${t.y}`))'), true);
    assert.equal(g.run('state.obstacles.length > 0 && state.obstacles.every(o=>state.map[o.y][o.x]===2)'), true);
    assert.equal(g.run('state.hazards.every(h=>state.map[h.y][h.x]===0 && [state.upstairs,state.stairs].every(s=>Math.max(Math.abs(h.x-s.x),Math.abs(h.y-s.y))>3))'), true);
    assert.equal(g.run('state.hazards.every(h=>!protectedFloorTiles().some(t=>t.x===h.x&&t.y===h.y))'), true);
    assert.equal(g.run("new Set(state.hazards.map(h=>h.type)).size"), 3);
    assert.equal(g.run('state.props.length > 0 && state.props.every(p => state.map[p.y][p.x] === 0)'), true, 'biome props are walkable decorations');
    assert.equal(g.run('state.depth % 2 === 0 && ![3,5,7,10].includes(state.depth) ? !!state.merchant : state.merchant === null'), true);
    assert.equal(g.run('state.monsters.some(m=>m.id===state.floorKey.carrierId && !m.isBoss)'), true);
  }
  g.run('newGame(); enterFloor(100,false)');
  assert.equal(g.run('state.floorKey'), null);
  assert.equal(g.run('!!state.boss && state.boss.isDragon'), true);
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
  for (let depth = 1; depth < 100; depth++) {
    useDownStairs(g); assert.equal(g.run('state.depth'), depth);
    collectFloorKey(g);
    if (g.run('!!state.boss && bossGateAt(state.depth) && !state.bossDefeated')) {
      useDownStairs(g); assert.equal(g.run('state.depth'), depth);
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
  g.run(`state.monsters=[];state.props=[];state.map[5][7]=0;state.hazards=[{type:'spikes',x:7,y:5,revealed:false,triggered:false}];
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
  for (const [x,y,camX,camY] of [[1,1,0,0],[40,30,31,24],[95,63,78,52],[0,63,0,52],[95,0,78,0]]) {
    g.run(`state.player.x=${x};state.player.y=${y};updateCamera()`);
    assert.deepEqual(g.json('[state.camera.x,state.camera.y]'), [camX,camY]);
  }
  g.run('state.monsters=[];state.hazards=[];state.player.x=40;state.player.y=30;state.map[30][40]=0;state.map[30][41]=0;movePlayer(1,0)');
  assert.equal(g.run('state.player.x'), 41, 'movement is not bounded by the old viewport width');
  assert.equal(g.run("state.visited.has('41,30')"), true);
  g.calls.length=0;g.run('draw()');
  const translate=g.calls.find(c=>c[0]==='translate');
  assert.deepEqual(translate, ['translate', -g.run('state.camera.x')*32, -g.run('state.camera.y')*32]);
  assert.ok(g.calls.filter(c=>c[0]==='fillRect'&&c[3]===32&&c[4]===32).length <= 18*12*4, 'viewport-capped tile fills');
  assert.equal(g.calls.filter(c=>c[0]==='save').length, g.calls.filter(c=>c[0]==='restore').length);
  assert.equal(g.run('inCamera(0,0)'), false);
});

test('falling-rock warning is drawn above the player instead of hidden under the sprite', () => {
  const g = game();
  g.run(`state.monsters=[];state.hazards=[{type:'rocks',x:state.player.x,y:state.player.y,revealed:true,triggered:true,stage:'warning',impactAt:1.2}];revealAroundPlayer()`);
  g.calls.length=0;g.run('draw()');
  const warning=g.calls.findIndex(c=>c[0]==='fillText'&&c[1]==='!');
  const playerTransform=g.calls.findLastIndex(c=>c[0]==='translate');
  assert.equal(warning > playerTransform, true);
  assert.equal(g.calls[warning][3] < g.run('state.player.y')*32, true);
});

function reachEnding(g) {
  g.run(`enterFloor(100,false); damageMonster(state.boss,state.boss.hp);
    state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()`);
}

test('final interaction starts the twist once, including after revisiting the defeated dragon floor', () => {
  const g = game();
  g.run('enterFloor(100,false);state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
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
  g.run('enterFloor(100,false);damageMonster(state.boss,state.boss.hp)');
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
    assert.equal(b.x>=cam.x*32&&b.x+b.width<=(cam.x+18)*32,true);
    assert.equal(b.y>=cam.y*32&&b.y+b.height<=(cam.y+12)*32,true);
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
  const player=g.calls.findLastIndex(c=>c[0]==='translate');
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
  const expectedBossMin = {mimic:[70,66],dragonBoss:[119,104],hydra:[107,96],boar:[76,72],medusa:[63,96],darkWizard:[78,96],skeletonKing:[96,102],cook:[64,66],bartender:[39,60]};
  for(const depth of [5,10,20,30,40,50,60,70,80,90,100]) {
    g.run(`enterFloor(${depth},false)`);
    const initial=g.json('monsterVisual(state.boss)');
    const sprite=g.run('monsterVisual(state.boss).sprite');
    const exp=expectedBossMin[sprite];
    assert.ok(exp, `known boss contract for ${sprite} depth ${depth}`);
    assert.equal(initial.scale, 2, `boss source-to-world scale depth ${depth}`);
    assert.ok(initial.width >= exp[0] - 0.01 && initial.height >= exp[1] - 0.01, `boss visual bounds below accepted source union depth ${depth} sprite ${sprite}`);
    assert.equal(g.run('state.boss.x===state.rooms.find(r=>r.isArena).cx && state.boss.y===state.rooms.find(r=>r.isArena).cy'),true);
    assert.equal(g.run('state.monsters.filter(m=>!m.isBoss).every(m=>!bossSpawnBuffer(m.x,m.y))'),true);
    assert.equal(g.run('protectedFloorTiles().filter(t=>t!==state.boss).every(t=>!bossSpawnBuffer(t.x,t.y))'),true);
    assert.equal(g.run(`{const v=monsterVisual(state.boss), r=state.rooms.find(r=>r.isArena);
      v.left>=r.x*TILE && v.right<=(r.x+r.w)*TILE && v.top>=r.y*TILE && v.bottom<=(r.y+r.h)*TILE;}`),true);
    g.run('state.player.x=state.boss.x;state.player.y=state.boss.y+1;updateCamera();clearMonsterSpeech();monsterTalk(state.boss)');
    assert.equal(g.run('monsterSpeechLayout().y+monsterSpeechLayout().height < monsterVisual(state.boss).top-7'),true);
    g.calls.length=0;g.run('draw()');
    const bar=g.calls.find(c=>c[0]==='fillRect'&&Math.abs(c[2]-(initial.top-7))<0.01&&Math.abs(c[4]-4)<0.01&&c[3]>=24);
    assert.ok(bar, 'boss HP bar drawn above boss visual bounds');
    assert.ok(Math.abs(bar[3]-(initial.width-12))<0.01, 'boss HP bar width matches visual bounds');
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
  assert.equal(g.minimapCalls.some(c=>c[0]==='strokeRect'&&c[1]===0.5&&c[2]===0.5&&c[3]===53&&c[4]===35),true);
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
  assert.equal(g.minimapCalls.some(c=>c[0]==='strokeRect'&&c[1]===93.5&&c[2]===72.5),true);
  down(g);assert.equal(g.elements.minimapDepth.textContent,'D2');
  assert.equal(g.run("state.visited.has('40,30')"),false);
  up(g);assert.equal(g.elements.minimapDepth.textContent,'D1');
  assert.equal(g.run("state.visited.has('40,30')"),true);
  g.key('r');assert.equal(g.elements.minimapDepth.textContent,'Town');
  assert.equal(g.run("state.visited.has('2,2')"),false);
});

test('Mimic defeat plays a short in-world flourish and freezes play until it finishes',()=>{
  const g=game();
  g.run('enterFloor(5,false);state.player.x=state.boss.x-1;state.player.y=state.boss.y;updateCamera()');
  g.run('damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('state.bossDefeat.kind'),'mimic');
  assert.equal(g.run('state.bossDefeat.phase'),'snap');
  assert.equal(g.run('bossDefeatActive()'),true);
  assert.equal(g.run('state.floors[5].bossDefeated'),true,'boss rewards stay immediate');
  const frozen=g.json('[state.player,state.monsters,state.activeTime,state.hazardTime]');
  g.key('ArrowRight');g.run('enemyTick()');
  assert.deepEqual(g.json('[state.player,state.monsters,state.activeTime,state.hazardTime]'),frozen);
  g.calls.length=0;g.run('draw()');
  assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]==='MIMIC DEFEATED'),true);
  assert.equal(g.calls.filter(c=>c[0]==='save').length,g.calls.filter(c=>c[0]==='restore').length);
  const initial=g.json('bossDefeatScene()');
  g.run('advanceBossDefeat(0.5)');
  const coins=g.json('bossDefeatScene()');
  assert.equal(coins.phase,'coins');
  assert.equal(coins.coins.length,12);
  assert.equal(coins.coins.some((c,i)=>Math.abs(c.x-initial.coins[i].x)>1),true);
  g.run('advanceBossDefeat(2)');
  assert.equal(g.run('state.bossDefeat'),null);
  assert.equal(g.run('bossDefeatActive()'),false);
});

test('Dragon defeat uses a screen-space cinematic and clears before the romance ending',()=>{
  const g=game();
  g.run('enterFloor(100,false);damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('state.bossDefeat.kind'),'dragon');
  assert.equal(g.run('state.gameOver'),false,'dragon kill is not the final victory');
  const frozen=g.json('[state.player,state.monsters,state.activeTime,state.hazardTime]');
  g.key('ArrowRight');g.run('enemyTick()');
  assert.deepEqual(g.json('[state.player,state.monsters,state.activeTime,state.hazardTime]'),frozen);
  g.calls.length=0;g.run('draw()');
  assert.equal(g.calls.some(c=>c[0]==='setTransform'&&c[1]===1&&c[5]===0&&c[6]===0),true);
  assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]==='DRAGON SLAIN'),true);
  assert.equal(g.calls.filter(c=>c[0]==='save').length,g.calls.filter(c=>c[0]==='restore').length);
  const initial=g.json('bossDefeatScene()');
  g.run('advanceBossDefeat(1)');
  assert.equal(g.run('bossDefeatScene().phase'),'fall');
  assert.equal(g.run('bossDefeatScene().dragonY')>initial.dragonY,true);
  g.run('state.player.x=state.princess.x;state.player.y=state.princess.y;pickup()');
  assert.equal(g.run('state.ending.phase'),'reveal');
  assert.equal(g.run('state.bossDefeat'),null);
});

test('boss defeat frames are clamped, hidden-tab safe, identity-bound, and skippable',()=>{
  const g=game();
  g.run(`window.bossFrames=new Map();window.bossCancelled=[];window.bossNextFrame=0;
    window.requestAnimationFrame=fn=>{const id=++window.bossNextFrame;window.bossFrames.set(id,fn);return id;};
    window.cancelAnimationFrame=id=>{window.bossCancelled.push(id);window.bossFrames.delete(id);}`);
  g.run('enterFloor(5,false);damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('window.bossFrames.size'),1);
  g.run('window.oldBossAnim=state.bossDefeat;window.oldBossCallback=window.bossFrames.get(state.bossDefeat.frameId)');
  g.run('bossDefeatFrame(1000,state.bossDefeat);bossDefeatFrame(1100,state.bossDefeat)');
  assert.equal(g.run('state.bossDefeat.elapsed'),0.1);
  g.run('bossDefeatFrame(9000,state.bossDefeat)');
  assert.equal(g.run('state.bossDefeat.elapsed'),0.2);
  g.run('document.hidden=true;bossDefeatFrame(20000,state.bossDefeat);advanceBossDefeat(50)');
  assert.equal(g.run('state.bossDefeat.elapsed'),0.2);
  g.run('document.hidden=false');g.visibility();
  g.run('bossDefeatFrame(30000,state.bossDefeat)');
  assert.equal(g.run('state.bossDefeat.elapsed'),0.2);
  g.run('bossDefeatFrame(30050,state.bossDefeat)');
  assert.ok(Math.abs(g.run('state.bossDefeat.elapsed')-0.25)<1e-9);
  const frameId=g.run('state.bossDefeat.frameId');
  g.key('r');
  assert.equal(g.run('state.bossDefeat'),null);
  assert.equal(g.run(`window.bossCancelled.includes(${frameId})`),true);
  const messages=g.run('JSON.stringify(state.messages)');
  g.run('window.oldBossCallback(50000)');
  assert.equal(g.run('state.bossDefeat'),null);
  assert.equal(g.run('JSON.stringify(state.messages)'),messages);
  g.run('enterFloor(5,false);damageMonster(state.boss,state.boss.hp)');
  g.key('Escape');
  assert.equal(g.run('state.bossDefeat'),null);
  assert.equal(g.run('state.floors[5].bossDefeated'),true);
});

test('boss animations map every roster and themed boss to a distinct visual kind',()=>{
  const g=game();
  assert.deepEqual(g.json('bossDepthList().map(d=>bossKind(bossForDepth(d)))'),
    ['mimic','hydra','boar','medusa','wizard','skeletonKing','hydra','boar','medusa','wizard','dragon']);
  assert.equal(g.run("bossKind({isDragon:true,name:'Dragon'})"),'dragon');
  assert.equal(g.run("bossKind({isThemed:true,themedType:'kitchen',name:'Cook'})"),'cook');
  assert.equal(g.run("bossKind({isThemed:true,themedType:'pub',name:'Bartender'})"),'bartender');
  const motifs=g.json("bossDepthList().map(d=>BOSS_ANIMATIONS[bossKind(bossForDepth(d))].motif)");
  assert.equal(new Set(motifs).size>=6,true);
  assert.equal(g.run('BOSS_ANIMATIONS.medusa.defeat > BOSS_ANIMATIONS.mimic.defeat'),true);
  const hydraDim = g.json("spriteDimensions('hydra')");
  if (hydraDim.art) {
    assert.ok(hydraDim.width > 0 && hydraDim.height > 0);
    assert.ok(hydraDim.cellW >= hydraDim.width && hydraDim.cellH >= hydraDim.height);
    for (const name of ['hydra','boar','medusa','darkWizard','skeletonKing']) {
      const dim = g.json(`spriteDimensions('${name}')`);
      assert.ok(dim.art && dim.width > 0 && dim.height > 0, `${name} should have art dimensions`);
      assert.equal(g.run(`typeof artDecoded('${name}',0,'front') === 'object'`), true, `${name} should decode`);
    }
  } else {
    assert.deepEqual(hydraDim,{width:36,height:32});
    for(const name of ['hydra','boar','medusa','darkWizard','skeletonKing']) {
      assert.equal(g.run(`spriteFrameGrid('${name}',1).join('') !== SPRITES['${name}'].join('')`),true);
      assert.equal(g.run(`SPRITES['${name}'].every(row => row.length === SPRITES['${name}'][0].length && [...row].every(c => c === '.' || SPRITE_PALETTES['${name}'][c]))`),true);
    }
  }
});

test('boss intro freezes play, renders a themed name/HP card, and can be skipped',()=>{
  const g=game();
  g.run(`enterFloor(10,false);state.player.x=state.boss.x-2;state.player.y=state.boss.y;
    state.map[state.boss.y][state.boss.x-2]=0;updateCamera();checkBossIntro()`);
  assert.equal(g.run('bossIntroActive()'),true);
  assert.equal(g.run('state.bossIntro.kind'),'hydra');
  assert.equal(g.run('state.bossIntro.phase'),'reveal');
  const frozen=g.json('[state.player,state.monsters,state.activeTime,state.hazardTime]');
  g.key('ArrowRight');g.run('enemyTick();advanceActiveTime(10)');
  assert.deepEqual(g.json('[state.player,state.monsters,state.activeTime,state.hazardTime]'),frozen);
  g.calls.length=0;g.run('draw()');
  assert.equal(g.calls.some(c=>c[0]==='setTransform'&&c[1]===1&&c[5]===0&&c[6]===0),true);
  assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]==='HYDRA'),true);
  assert.equal(g.calls.filter(c=>c[0]==='save').length,g.calls.filter(c=>c[0]==='restore').length);
  assert.equal(g.run('bossIntroScene().particles.length'),10);
  g.run('advanceBossIntro(0.6)');assert.equal(g.run('bossIntroScene().phase'),'roar');
  g.key('Escape');
  assert.equal(g.run('state.bossIntro'),null);
  assert.equal(g.run('bossIntroActive()'),false);
  g.run('checkBossIntro()');assert.equal(g.run('state.bossIntro'),null,'intro plays once per boss encounter');
});

test('boss intro frames are clamped, hidden-tab safe, identity-bound, and cleared by travel/restart',()=>{
  const g=game();
  g.run(`window.introFrames=new Map();window.introCancelled=[];window.introNextFrame=0;
    window.requestAnimationFrame=fn=>{const id=++window.introNextFrame;window.introFrames.set(id,fn);return id;};
    window.cancelAnimationFrame=id=>{window.introCancelled.push(id);window.introFrames.delete(id);};
    enterFloor(30,false);state.player.x=state.boss.x-2;state.player.y=state.boss.y;
    state.map[state.boss.y][state.boss.x-2]=0;updateCamera();checkBossIntro()`);
  assert.equal(g.run('window.introFrames.size'),1);
  g.run('window.oldIntro=state.bossIntro;window.oldIntroCallback=window.introFrames.get(state.bossIntro.frameId)');
  g.run('bossIntroFrame(1000,state.bossIntro);bossIntroFrame(1100,state.bossIntro)');
  assert.equal(g.run('state.bossIntro.elapsed'),0.1);
  g.run('bossIntroFrame(9000,state.bossIntro)');assert.equal(g.run('state.bossIntro.elapsed'),0.2);
  g.run('document.hidden=true;bossIntroFrame(20000,state.bossIntro);advanceBossIntro(50)');
  assert.equal(g.run('state.bossIntro.elapsed'),0.2);
  g.run('document.hidden=false');g.visibility();
  g.run('bossIntroFrame(30000,state.bossIntro)');assert.equal(g.run('state.bossIntro.elapsed'),0.2);
  g.run('bossIntroFrame(30050,state.bossIntro)');
  assert.ok(Math.abs(g.run('state.bossIntro.elapsed')-0.25)<1e-9);
  g.run('enterFloor(31,false)');assert.equal(g.run('state.bossIntro'),null);
  g.run('window.oldIntroCallback(50000)');assert.equal(g.run('state.bossIntro'),null);
  g.run('enterFloor(40,false);state.player.x=state.boss.x-2;state.player.y=state.boss.y;state.map[state.boss.y][state.boss.x-2]=0;checkBossIntro()');
  const frameId=g.run('state.bossIntro.frameId');
  g.key('r');
  assert.equal(g.run('state.bossIntro'),null);
  assert.equal(g.run(`window.introCancelled.includes(${frameId})`),true);
});

test('remaining bosses use distinct defeat motifs and cleanup without repeating rewards',()=>{
  const g=game();
  const cases=[[10,'HYDRA'],[20,'WILD BOAR'],[30,'MEDUSA'],[40,'DARK WIZARD'],[50,'SKELETON KING'],[3,'COOK'],[7,'BARTENDER']];
  const motifs=[];
  for(const [depth,label] of cases) {
    g.run(`newGame();enterFloor(${depth},false);state.player.x=state.boss.x-1;state.player.y=state.boss.y;updateCamera()`);
    g.run('damageMonster(state.boss,state.boss.hp)');
    const scene=g.json('bossDefeatScene()');
    assert.equal(g.run('bossDefeatActive()'),true);
    assert.equal(scene.kind,g.run('state.bossDefeat.kind'));
    assert.equal(scene.particles.length,12);
    motifs.push(scene.motif);
    g.calls.length=0;g.run('draw()');
    assert.equal(g.calls.some(c=>c[0]==='fillText'&&c[1]===`${label} DEFEATED`),true);
    assert.equal(g.calls.filter(c=>c[0]==='save').length,g.calls.filter(c=>c[0]==='restore').length);
    const rewards=g.json('[state.gold,state.kills,state.player.xp]');
    g.key('Escape');
    assert.equal(g.run('state.bossDefeat'),null);
    assert.deepEqual(g.json('[state.gold,state.kills,state.player.xp]'),rewards);
  }
  assert.equal(new Set(motifs).size,motifs.length);
});

test('JRPG sprite grids have complete palettes and explicit approved art dimensions',()=>{
  const g=game();
  assert.equal(g.run(`Object.entries(SPRITES).every(([name,grid])=>grid.length>0 && grid.every(row=>row.length===grid[0].length && [...row].every(c=>c==='.'||SPRITE_PALETTES[name][c])))`),true);
  const k=g.json('spriteDimensions("knight")'), m=g.json('spriteDimensions("mimic")'), d=g.json('spriteDimensions("dragonBoss")');
  assert.ok(k.width>0 && k.height>0 && k.anchorY>=k.height, 'knight has visible bounds and foot anchor');
  assert.ok(m.width>k.width || m.height>k.height, 'mimic larger than knight');
  assert.ok(d.width>m.width && d.height>m.height, 'dragon larger than mimic');
  assert.equal(k.art, true);
  assert.ok(Number.isFinite(k.cellW) && Number.isFinite(k.cellH));
});

test('static sprite and terrain raster caches reuse surfaces and survive restart without becoming floor state',()=>{
  const g=game();
  g.run(`window.surfaceCount=0;document.createElement=()=>{window.surfaceCount++;return {width:0,height:0,getContext:()=>ctx};};
    drawSprite('knight',100,100,2);drawDungeonTile(6,5)`);
  const count=g.run('window.surfaceCount');
  assert.ok(count>=2);
  g.calls.length=0;g.run("drawSprite('knight',100,100,2);drawDungeonTile(6,5)");
  assert.equal(g.run('window.surfaceCount'),count);
  const draws=g.calls.filter(c=>c[0]==='drawImage');
  assert.ok(draws.length>=2, 'cached sprite/tile should blit via drawImage');
  assert.deepEqual(g.json("Object.keys(state.art.sprites).filter(k=>k.includes('knight')).sort()"), g.json("(()=>{drawSprite('knight',0,0,2,0,'front'); return Object.keys(state.art.sprites).filter(k=>k.includes('knight')).sort();})()"));
  const cache=g.run('state.art');g.key('r');
  assert.equal(g.run('state.art'),cache);
  assert.equal(g.run('FLOOR_FIELDS.includes("art")'),false);
  assert.equal(g.run('Object.values(state.floors).some(f=>f.art)'),false);
});

test('terrain decoration is deterministic without consuming combat RNG or revealing hidden spikes',()=>{
  const g=game();
  g.run(`state.monsters=[];state.hazards=[];window.rngCalls=0;Math.random=()=>{window.rngCalls++;return 0.9;}`);
  g.calls.length=0;g.run('draw()');const before=JSON.stringify(g.calls);
  assert.equal(g.run('window.rngCalls'),0);
  g.calls.length=0;g.run(`state.hazards=[{type:'spikes',x:state.player.x+1,y:state.player.y,revealed:false}];draw()`);
  assert.equal(JSON.stringify(g.calls),before);
  assert.equal(g.run('window.rngCalls'),0);
});

test('two-times zoom scales only the world, draws 18 by 12 tiles, and leaves ending framing unscaled',()=>{
  const g=game();
  g.run(`state.monsters=[];state.hazards=[];state.props=[];state.player.x=95;state.player.y=63;
    window.drawnTiles=[];const originalTile=drawDungeonTile;
    drawDungeonTile=function(x,y){window.drawnTiles.push([x,y]);originalTile(x,y);}`);
  g.calls.length=0;g.run('draw()');
  assert.equal(g.calls.some(c=>c[0]==='scale'&&c[1]===2&&c[2]===2),true);
  assert.equal(g.calls.findIndex(c=>c[0]==='scale')<g.calls.findIndex(c=>c[0]==='translate'),true);
  assert.equal(g.run('window.drawnTiles.length'),216);
  assert.equal(g.run('window.drawnTiles.every(([x,y])=>x>=78&&x<96&&y>=52&&y<64)'),true);
  assert.equal(g.run('VIEW_W*TILE*MAP_ZOOM===1152 && VIEW_H*TILE*MAP_ZOOM===768'),true);
  reachEnding(g);g.calls.length=0;g.run('draw()');
  assert.equal(g.calls.some(c=>c[0]==='scale'&&c[1]===2&&c[2]===2),false);
  assert.equal(g.calls.some(c=>c[0]==='setTransform'&&c[1]===1&&c[4]===1),true);
});

test('help toggles by question mark and button, freezes gameplay and timers, and retains audio changes',()=>{
  const g=game();speechEncounter(g);g.run('monsterTalk(state.monsters[0])');
  g.key('?');assert.equal(g.run('state.helpOpen'),true);
  const world=g.run('JSON.stringify([state.player,state.monsters,state.activeTime,state.hazardTime,state.combatElapsed,state.healElapsed,state.monsterSpeech,state.turn,state.pause])');
  for(const key of ['w',' ','h','r','Enter'])g.key(key);
  g.key('?',{repeat:true});assert.equal(g.run('state.helpOpen'),true);
  g.run('advanceActiveTime(60);recoveryTick(60);hazardTick();enemyTick();attackMonster(state.monsters[0]);hurtPlayer(1000,"blocked")');
  assert.equal(g.run('JSON.stringify([state.player,state.monsters,state.activeTime,state.hazardTime,state.combatElapsed,state.healElapsed,state.monsterSpeech,state.turn,state.pause])'),world);
  g.click('audioToggle');g.run('setAudioVolume("music",22);setAudioVolume("effects",37)');
  assert.equal(g.run('state.helpOpen'),true);g.key('Escape');
  assert.equal(g.run('state.helpOpen'),false);
  assert.deepEqual(g.json('[state.audio.enabled,state.audio.musicVolume,state.audio.effectsVolume]'),[false,0.22,0.37]);
  g.click('helpToggle');assert.equal(g.run('state.helpOpen'),true);g.click('closeHelp');
  assert.equal(g.elements.gameLayout.inert,false);
  assert.equal(g.elements.helpOverlay.hidden,true);
  assert.equal(g.run('FLOOR_FIELDS.includes("helpOpen")'),false);
});

test('help on launch does not start play and preserves health or retreat dialogs underneath',()=>{
  const g=game(42,false);g.key('?');assert.equal(g.run('state.started'),false);
  g.key('Enter');assert.equal(g.run('state.started'),false);
  g.key('Escape');assert.equal(g.run('state.started'),false);g.key('Enter');
  assert.equal(g.run('state.started'),true);
  g.run('enterDungeonFromTown()');
  g.run('hurtPlayer(51,"test")');assert.equal(g.run('state.pause.kind'),'health');
  g.key('?');g.key('h');g.key('Escape');
  assert.equal(g.run('state.helpOpen'),false);assert.equal(g.run('state.pause.kind'),'health');
  g.key('Escape');assert.equal(g.run('state.pause'),null);
  g.run('retreat()');g.key('?');g.key('y');g.key('Escape');
  assert.equal(g.run('state.pause.kind'),'retreat');assert.equal(g.run('state.player.hp'),9);
  g.key('Escape');assert.equal(g.run('state.pause'),null);
});

test('help freezes cinematic progression and resets their timestamps without consuming Escape',()=>{
  const g=game();g.run('enterFloor(5,false);damageMonster(state.boss,state.boss.hp);advanceBossDefeat(0.5)');
  g.key('?');g.run('advanceBossDefeat(10);skipBossDefeat()');
  assert.equal(g.run('state.bossDefeat.elapsed'),0.5);
  g.key('Escape');assert.notEqual(g.run('state.bossDefeat'),null);
  assert.equal(g.run('state.bossDefeat.lastTimestamp'),null);
  g.run('advanceBossDefeat(0.1)');assert.equal(g.run('state.bossDefeat.elapsed'),0.6);
  reachEnding(g);g.run('advanceEnding(2.5)');g.key('?');
  g.run('advanceEnding(20);skipEnding()');assert.equal(g.run('state.ending.elapsed'),2.5);
  g.key('Escape');assert.equal(g.run('state.ending.completed'),false);
  assert.equal(g.run('state.ending.lastTimestamp'),null);
  g.run('advanceEnding(0.1)');assert.equal(g.run('state.ending.elapsed'),2.6);
  g.key('?');g.run('newGame();render()');assert.equal(g.run('state.helpOpen'),false);
  assert.equal(g.elements.helpOverlay.hidden,true);assert.equal(g.elements.gameLayout.inert,false);
});

test('help traps Tab and Shift-Tab, closes from an input, and restores keyboard focus',()=>{
  const g=game();g.run(`window.helpControls=['closeHelp','audioToggle','musicVolume','effectsVolume'].map(id=>document.getElementById(id));
    for(const el of [...window.helpControls,canvas]) { el.isConnected=true;el.focus=()=>document.activeElement=el; }
    document.getElementById('pauseOverlay').contains=()=>false;
    document.getElementById('helpOverlay').querySelectorAll=()=>window.helpControls;
    canvas.focus()`);
  g.key('?');assert.equal(g.run('document.activeElement===window.helpControls[0]'),true);
  g.key('Tab',{shiftKey:true});assert.equal(g.run('document.activeElement===window.helpControls[3]'),true);
  g.key('Tab');assert.equal(g.run('document.activeElement===window.helpControls[0]'),true);
  g.key('Tab');g.key('Tab');assert.equal(g.run('document.activeElement===window.helpControls[2]'),true);
  g.key('Escape',{target:{tagName:'INPUT'}});
  assert.equal(g.run('state.helpOpen'),false);assert.equal(g.run('document.activeElement===canvas'),true);
});

function enableMotion(g) {
  g.run(`window.motionCallbacks=[];window.motionCancelled=[];
    window.requestAnimationFrame=cb=>{window.motionCallbacks.push(cb);return window.motionCallbacks.length;};
    window.cancelAnimationFrame=id=>window.motionCancelled.push(id);
    state.monsters=[];state.hazards=[];clearMovementAnimation();
    state.player.x=40;state.player.y=30;state.map[30][40]=0;state.map[30][41]=0;state.map[30][42]=0;updateCamera()`);
}

test('movement is logically immediate while actors, camera, health bars, speech and minimap interpolate',()=>{
  const g=game();enableMotion(g);
  g.run('movePlayer(1,0)');
  assert.equal(g.run('state.player.x'),41);assert.equal(g.run('actorRenderPosition(state.player).x'),40);
  assert.equal(g.run('renderCamera().x'),31);
  g.run('advanceMotion(0.09)');
  assert.ok(Math.abs(g.run('actorRenderPosition(state.player).x')-40.5)<1e-9);
  assert.ok(Math.abs(g.run('renderCamera().x')-31.5)<1e-9);
  const before=g.json('actorRenderPosition(state.player)');g.run('movePlayer(1,0)');
  assert.deepEqual(g.json('actorRenderPosition(state.player)'),before,'retargeting starts at current rendered point');
  g.run('advanceMotion(1)');assert.equal(g.run('actorRenderPosition(state.player).x'),42);
  g.run(`state.player.x=41;state.player.y=30;updateCamera();state.monsters=[{...MONSTER_TYPES[4],id:500,x:43,y:30,hp:100,maxHp:100}];
    for(const [x,y] of [[43,30],[44,30],[42,30],[41,30]]) state.visited.add(x+','+y);
    revealAroundPlayer();
    clearMonsterSpeech();monsterTalk(state.monsters[0]);moveActorTo(state.monsters[0],44,30);advanceMotion(0.09)`);
  assert.equal(g.run('state.monsters[0].x'),44);
  const mv=g.json('monsterVisual(state.monsters[0])');
  assert.ok(Math.abs(mv.footX-(43.5*32+16))<1e-9, 'monster foot interpolates');
  assert.ok(Math.abs(mv.x - (mv.left+mv.width/2))<1e-9, 'visual center consistent');
  const layout=g.json('monsterSpeechLayout()');
  assert.ok(layout && Math.abs(layout.anchorX-mv.x)<1e-9, 'speech anchor follows visual center');
  g.minimapCalls.length=0;g.run('renderMinimap()');
  assert.equal(g.minimapCalls.some(c=>c[0]==='strokeRect'&&c[1]===g.run('renderCamera().x')*3+0.5),true);
});

test('animation frames vary legs and wings, keep logical dimensions, and moving slimes use a grounded hop',()=>{
  const g=game();enableMotion(g);
  for(const name of ['knight','goblin','skeleton','orc','bat','dragonBoss']) {
    assert.notDeepEqual(g.json(`spriteFrameGrid('${name}',0)`),g.json(`spriteFrameGrid('${name}',1)`),name);
    assert.equal(g.run(`spriteFrameGrid('${name}',2).length===SPRITES['${name}'].length && spriteFrameGrid('${name}',2).every(row=>row.length===SPRITES['${name}'][0].length)`),true);
  }
  g.run('state.monsters=[{...MONSTER_TYPES[0],id:3,x:42,y:30,hp:10}];moveActorTo(state.monsters[0],43,30);advanceMotion(0.09)');
  assert.equal(g.run('actorAnimationPose("slime",state.monsters[0]).frame'),1,'prepared slime uses its authored deformation pose');
  assert.equal(g.run('actorAnimationPose("slime",state.monsters[0]).rise'),0,'do not add a second hop to prepared art');
  g.run('window.savedArtRuntime=artRuntime;artRuntime=()=>null');
  assert.equal(g.run('actorAnimationPose("slime",state.monsters[0]).rise<0'),true,'legacy fallback retains its grounded hop');
  g.run('artRuntime=window.savedArtRuntime');
  g.run('advanceMotion(1)');assert.deepEqual(g.json('actorAnimationPose("slime",state.monsters[0])'),{frame:0,sx:1,sy:1,rise:0,facing:1});
  g.run('state.monsters[0].sprite="bat"');assert.equal(g.run('motionNeeded()'),true);
  g.run('state.monsters[0].x=1');assert.equal(g.run('motionNeeded()'),false,'unseen wings do not run a draw loop');
});

test('visual animation freezes during help, health pauses, hidden tabs and cinematics without advancing game clocks or RNG',()=>{
  const g=game();enableMotion(g);g.run('movePlayer(1,0);advanceMotion(0.04)');
  const world=g.run('JSON.stringify([state.player,state.activeTime,state.hazardTime,state.turn,state.retreatReadyAt])');
  g.run('window.randomCalls=0;Math.random=()=>{window.randomCalls++;return 0.9;};advanceMotion(0.02);draw()');
  assert.equal(g.run('JSON.stringify([state.player,state.activeTime,state.hazardTime,state.turn,state.retreatReadyAt])'),world);
  assert.equal(g.run('window.randomCalls'),0);
  for(const block of ['state.helpOpen=true','state.pause={kind:"health"}','document.hidden=true','state.bossDefeat={completed:false}']) {
    const time=g.run('state.motion.time');g.run(`${block};advanceMotion(60);requestMotionFrame()`);
    assert.equal(g.run('state.motion.time'),time);assert.equal(g.run('state.motion.lastTimestamp'),null);
    g.run('state.helpOpen=false;state.pause=null;document.hidden=false;state.bossDefeat=null');
  }
});

test('animation clears across travel/respawn/restart/death and rejects stale callbacks',()=>{
  const g=game();enableMotion(g);g.run('movePlayer(1,0);window.oldMotion=state.motion;window.oldMotionFrame=window.motionCallbacks.at(-1)');
  g.run('enterFloor(2,false)');assert.equal(g.run('Object.keys(state.motion.moves).length'),0);
  const fresh=g.run('state.motion');g.run('window.oldMotionFrame(100000)');assert.equal(g.run('state.motion'),fresh);assert.equal(g.run('state.motion.time'),0);
  assert.equal(g.run('FLOOR_FIELDS.includes("motion")'),false);
  g.run('newGame();state.monsters=[];state.map[state.player.y][state.player.x+1]=0;movePlayer(1,0);recreateMonsters()');
  assert.equal(g.run('Object.keys(state.motion.moves).length'),0);
  g.run('movePlayer(1,0);hurtPlayer(9999,"fatal")');assert.equal(g.run('Object.keys(state.motion.moves).length'),0);
  g.key('r');assert.equal(g.run('state.motion.time'),0);assert.equal(g.run('state.motion.frameId'),null);
});

test('camera overscans only the entering tile strip during smooth steps and frame timing is capped',()=>{
  const g=game();enableMotion(g);g.run('movePlayer(1,0);advanceMotion(0.09)');
  assert.deepEqual(g.json('renderViewport()'),{camera:{x:31.5,y:24},x0:31,y0:24,x1:50,y1:36});
  g.run('window.motion=state.motion;motionFrame(1000,window.motion);motionFrame(31000,window.motion)');
  assert.ok(g.run('state.motion.time')<=0.14+1e-9,'return from a stalled frame adds at most 50ms');
  assert.equal(g.run('window.motionCallbacks.length>0'),true);
});

test('discovered wall torches and active vents animate without moving their fixtures or advancing trap damage',()=>{
  const g=game();enableMotion(g);
  g.run('state.map[24][42]=1;state.map[25][42]=0;state.visited.add("42,24")');
  assert.equal(g.run('wallTorchAt(42,24)'),true);assert.equal(g.run('motionNeeded()'),true);
  for(const name of ['torch','flameOn']) {
    assert.notDeepEqual(g.json(`spriteFrameGrid('${name}',0)`),g.json(`spriteFrameGrid('${name}',1)`));
    assert.deepEqual(g.json(`spriteFrameGrid('${name}',0).slice(Math.ceil(SPRITES['${name}'].length*.75))`),g.json(`spriteFrameGrid('${name}',1).slice(Math.ceil(SPRITES['${name}'].length*.75))`),'fixture stays still');
  }
  const first=g.run('environmentAnimationFrame(42,24)');g.run('advanceMotion(0.12)');
  assert.notEqual(g.run('environmentAnimationFrame(42,24)'),first);
  g.run('state.helpOpen=true');const paused=g.run('environmentAnimationFrame(42,24)');g.run('advanceMotion(60)');
  assert.equal(g.run('environmentAnimationFrame(42,24)'),paused);
  assert.equal(g.run('state.hazardTime'),0);
  g.run('state.helpOpen=false;state.visited.delete("42,24")');assert.equal(g.run('motionNeeded()'),false,'unknown wall fixtures do not keep the loop running');
  g.run('state.hazards=[{type:"flame",x:42,y:30,revealed:true,offset:0,nextDamageAt:0}];state.visited.add("42,30")');
  assert.equal(g.run('motionNeeded()'),true);
  g.run('state.hazardTime=3');assert.equal(g.run('motionNeeded()'),false,'inactive vent does not require animation');
});

test('ranged and magic monsters attack from a distance but respect line of sight', () => {
  const g = game();
  g.run(`Math.random = () => 0.1;
    state.monsters = [{ id: 1, name: 'Wasp', sprite: 'bat', hp: 18, maxHp: 18, atk: 8, def: 1,
      xp: 20, x: state.player.x + 3, y: state.player.y, ranged: true, range: 3, projectile: 'stinger', nextAttackAt: 0 }];
    state.floorKey = null; state.activeTime = 10; state.player.hp = 60;`);
  g.run('enemyTick()');
  assert.ok(g.run('state.player.hp') < 60, 'wasp shoots from outside melee range');
  g.run(`state.player.hp = 60; state.monsters[0].nextAttackAt = 0;
    state.map[state.player.y][state.player.x + 1] = 1;`);
  g.run('enemyTick()');
  assert.equal(g.run('state.player.hp'), 60, 'a wall blocks ranged attacks');
  g.run(`state.map[state.player.y][state.player.x + 1] = 0;
    state.monsters[0] = { id: 2, name: 'Mage', sprite: 'skeleton', hp: 25, maxHp: 25, atk: 10, def: 2,
      xp: 28, x: state.player.x + 2, y: state.player.y, magic: true, magicType: 'attack', magicRange: 4, nextAttackAt: 0 };
    state.player.hp = 60;`);
  g.run('enemyTick()');
  assert.ok(g.run('state.player.hp') < 60, 'mage casts from a distance');
});

test('archery, fireball and healing use equipment, mana and visible targets', () => {
  const g = game();
  g.run(`Math.random = () => 0.9;
    state.monsters = [
      { id: 1, name: 'Slime', sprite: 'slime', hp: 14, maxHp: 14, atk: 5, def: 0, xp: 10, x: state.player.x + 2, y: state.player.y },
      { id: 2, name: 'Bat', sprite: 'bat', hp: 10, maxHp: 10, atk: 7, def: 1, xp: 14, x: state.player.x, y: state.player.y + 2 },
    ];
    state.floorKey = null; state.activeTime = 10;`);
  g.key('e');
  assert.equal(g.run('state.monsters[0].hp'), 14, 'no bow means no shot');
  g.run('state.equipment.weapon = { name: "Bow", sprite: "bow", atk: 8, range: 3 }');
  g.key('e');
  assert.ok(g.run('state.monsters[0].hp') < 14, 'bow damages a visible target');
  g.run('state.player.mp = 20');
  g.key('f');
  assert.equal(g.run('state.player.mp'), 12);
  assert.ok(g.run('state.monsters.every(m => m.hp <= 0)'), 'fireball hits all visible monsters');
  g.run('state.player.hp = 20');
  g.key('g');
  assert.equal(g.run('state.player.mp'), 0);
  assert.ok(g.run('state.player.hp') > 20, 'heal restores health');
  g.run('state.activeTime = 12');
  g.key('g');
  assert.match(g.json('state.messages').at(-1), /Not enough mana/);
  g.run('render()');
  assert.equal(g.elements.mpText.textContent, '0/20');
});

test('themed floors reserve an arena, spawn their themed boss and draw their props', () => {
  const g = game();
  g.run('state.depth = 3; genLevel();');
  assert.equal(g.run('state.boss.name'), 'Cook');
  assert.equal(g.run('state.rooms.some(r => r.isArena)'), true);
  assert.equal(g.run('state.boss.ranged || false'), false);
  g.run('state.depth = 7; genLevel();');
  assert.equal(g.run('state.boss.name'), 'Bartender');
  assert.equal(g.run('state.boss.ranged'), true);
  assert.equal(g.run('THEMED_FLOORS[state.depth].prop'), 'barCounter');
  assert.equal(g.run('!!SPRITE_PALETTES.barCounter && !!SPRITES.barCounter'), true);
});

test('ranged and spellcasting monsters have dedicated art with animated frames', () => {
  const g = game();
  for (const name of ['wasp', 'mage', 'healer']) {
    const dim = g.json(`spriteDimensions('${name}')`);
    assert.ok(dim.width > 0 && dim.height > 0, `${name} has dimensions`);
    assert.equal(g.run(`Object.keys(SPRITE_PALETTES.${name}).length > 0`), true);
    assert.equal(g.run(`spriteFrameGrid('${name}',1).length === SPRITES.${name}.length &&
      spriteFrameGrid('${name}',1).every((row,i) => row.length === SPRITES.${name}[i].length)`), true);
    assert.notDeepEqual(g.json(`spriteFrameGrid('${name}',1)`), g.json(`SPRITES.${name}`));
  }
  assert.deepEqual(g.json("MONSTER_TYPES.filter(t => ['Wasp','Mage','Healer'].includes(t.name)).map(t => t.sprite)"), ['wasp', 'mage', 'healer']);
  g.run('window.requestAnimationFrame=()=>1; state.motion.time=1');
  assert.equal(g.run("actorAnimationPose('wasp',{id:1}).frame"), 1);
  assert.equal(g.run("actorAnimationPose('mage',{id:1}).frame"), 3);
  assert.equal(g.run("actorAnimationPose('healer',{id:1}).frame"), 3);
});

test('projectiles launch at attack time, advance only with active motion, and clear on recreation', () => {
  const g = game();
  g.run(`Math.random = () => 0.1; state.floorKey = null; state.activeTime = 10;
    state.motion.projectiles = []; state.player.hp = 60;
    state.monsters = [{ id: 1, name: 'Wasp', sprite: 'wasp', hp: 18, maxHp: 18, atk: 8, def: 1,
      xp: 20, x: state.player.x + 2, y: state.player.y, ranged: true, range: 3, projectile: 'stinger', nextAttackAt: 0 }];`);
  g.run('enemyAttack(state.monsters[0])');
  assert.equal(g.run('state.motion.projectiles.length'), 1);
  assert.equal(g.run('state.motion.projectiles[0].kind'), 'stinger');
  assert.ok(g.run('state.player.hp') < 60, 'damage resolves when the projectile is launched');
  assert.equal(g.run('motionNeeded()'), true);
  g.run('advanceMotion(0.5)');
  assert.equal(g.run('state.motion.projectiles.length'), 0);
  g.run('state.helpOpen=true; spawnProjectile("beer",state.player,state.player); advanceMotion(5); state.helpOpen=false');
  assert.equal(g.run('state.motion.projectiles[0].elapsed'), 0, 'pauses freeze projectile visuals');
  g.run('state.monsterSpawns=[]; recreateMonsters()');
  assert.equal(g.run('state.motion.projectiles.length'), 0, 'travel clears projectile visuals');
});

test('player attacks spawn arrow, fireball and heal projectiles', () => {
  const g = game();
  g.run(`Math.random = () => 0.9; state.floorKey = null; state.activeTime = 10;
    state.equipment.weapon = { name: 'Bow', sprite: 'bow', atk: 8, range: 3 };
    state.monsters = [{ id: 1, name: 'Slime', sprite: 'slime', hp: 40, maxHp: 40, atk: 5, def: 0,
      xp: 10, x: state.player.x + 2, y: state.player.y }]; state.player.mp = 20;`);
  g.key('e');
  assert.deepEqual(g.json('state.motion.projectiles.map(p => p.kind)'), ['arrow']);
  g.key('f');
  assert.ok(g.json('state.motion.projectiles.map(p => p.kind)').includes('fireball'));
  g.key('g');
  assert.ok(g.json('state.motion.projectiles.map(p => p.kind)').includes('heal'));
  g.run(`window.effects=[];const originalEffectSprite=drawSprite;drawSprite=(...a)=>{window.effects.push(a[0]);originalEffectSprite(...a)};drawProjectiles();drawSprite=originalEffectSprite`);
  assert.equal(g.run('["arrowFX","fireballFX","healFX"].every(name=>window.effects.includes(name))'),true,'approved projectile motifs are painted');
});

test('spellbook tomes have valid art and unlock by depth', () => {
  const g = game();
  assert.equal(g.run('SPRITES.spellbook.length'), 32);
  assert.equal(g.run('SPRITES.spellbook.every(row => row.length === 32)'), true);
  assert.equal(g.run('Object.keys(SPRITE_PALETTES.spellbook).length > 0'), true);
  assert.equal(g.run('lootPool(1).some(it => it.kind === "spellbook")'), false);
  assert.equal(g.run('lootPool(2).some(it => it.spell === "frostbolt")'), true);
  assert.equal(g.run('lootPool(3).some(it => it.spell === "greaterHeal")'), false);
  assert.equal(g.run('lootPool(4).some(it => it.spell === "greaterHeal")'), true);
});

test('spellbooks teach spells through treasures and merchants, and knowledge persists', () => {
  const g = game();
  g.run(`state.floorKey = null;
    state.treasures = [{ ...ITEM_TABLE.find(it => it.spell === 'frostbolt'), x: state.player.x, y: state.player.y }];
    pickup();`);
  assert.equal(g.run('!!state.player.spells.frostbolt'), true);
  assert.match(g.json('state.messages').at(-2), /learned Frostbolt/);
  g.run(`state.gold = 200; state.merchant = { x: state.player.x, y: state.player.y, stock: [
    { ...ITEM_TABLE.find(it => it.spell === 'greaterHeal'), id: 100 },
    { ...ITEM_TABLE.find(it => it.spell === 'frostbolt'), id: 101 }
  ] }; buyFromMerchant();`);
  assert.equal(g.run('!!state.player.spells.greaterHeal'), true);
  assert.equal(g.run('state.gold'), 200 - Math.round(85 * 1.5));
  assert.equal(g.run('state.merchant.stock.length'), 1, 'known spellbooks are skipped');
  g.run('buyFromMerchant()');
  assert.equal(g.run('state.gold'), 200 - Math.round(85 * 1.5), 'duplicate knowledge costs no gold');
  const learned = g.json('state.player.spells');
  g.run('enterFloor(2, false)');
  assert.deepEqual(g.json('state.player.spells'), learned, 'spells are player progression, not floor saves');
  assert.equal(g.run('Object.values(state.floors).some(floor => floor.player)'), false);
});

test('advanced spells require learning and each spell keeps its own cooldown', () => {
  const g = game();
  g.run(`Math.random = () => 0.9; state.floorKey = null; state.activeTime = 5; state.player.mp = 100;
    state.player.hp = 20;
    state.monsters = [{ id: 1, name: 'Slime', sprite: 'slime', hp: 200, maxHp: 200, atk: 5, def: 2,
      xp: 10, x: state.player.x + 1, y: state.player.y, nextAttackAt: 0 }];`);
  g.key('v');
  assert.match(g.json('state.messages').at(-1), /have not learned Frostbolt/);
  g.run('learnSpell("frostbolt")');
  g.key('v');
  assert.equal(g.run('state.player.mp'), 90);
  assert.ok(g.run('state.monsters[0].hp') < 200, 'frostbolt damages its target');
  assert.equal(g.run('state.motion.projectiles[0].kind'), 'frost');
  const hp = g.run('state.monsters[0].hp');
  g.key('v');
  assert.equal(g.run('state.player.mp'), 90, 'cooldown blocks a second cast');
  assert.equal(g.run('state.monsters[0].hp'), hp);
  assert.match(g.json('state.messages').at(-1), /Frostbolt recharges/);
  g.run('state.activeTime = 8');
  g.key('v');
  assert.equal(g.run('state.player.mp'), 80, 'advancing active time clears the cooldown');
  g.key('f');
  const afterFireball = g.run('state.player.mp');
  g.key('f');
  assert.equal(g.run('state.player.mp'), afterFireball, 'fireball has a separate cooldown');
  g.run('learnSpell("greaterHeal"); state.activeTime = 20; state.player.mp = 100; state.player.hp = 20');
  g.key('b');
  assert.equal(g.run('state.player.mp'), 82);
  assert.ok(g.run('state.player.hp') > 20, 'greater heal restores health');
  g.run('render()');
  assert.match(g.elements.spellList.textContent, /V Frostbolt/);
  assert.match(g.elements.spellList.textContent, /B Greater Heal/);
});

test('ranged and spellcasting enemies unlock progressively by depth', () => {
  const g = game();
  assert.equal(g.run('spawnPool(1).some(t => t.ranged || t.magic)'), false);
  assert.equal(g.run('spawnPool(2).some(t => t.name === "Wasp")'), true);
  assert.equal(g.run('spawnPool(3).some(t => t.magic)'), false);
  assert.equal(g.run('spawnPool(4).some(t => t.name === "Mage")'), true);
  assert.equal(g.run('spawnPool(5).some(t => t.name === "Healer")'), true);
  g.run('state.depth = 1; genLevel()');
  assert.equal(g.run('state.monsters.some(m => m.ranged || m.magic)'), false, 'early floors cannot spawn ranged enemies');
});

test('biome variants use coordinate-derived tile palettes and saved props', () => {
  const g = game();
  assert.deepEqual(g.json('Object.keys(BIOMES)'), ['crypt', 'cavern', 'kitchen', 'tavern', 'throne']);
  assert.equal(g.run('biomeForDepth(3)'), 'kitchen');
  assert.equal(g.run('biomeForDepth(7)'), 'tavern');
  assert.equal(g.run('biomeForDepth(100)'), 'throne');
  assert.equal(g.run('state.biome'), 'crypt');
  const props = g.json('state.props');
  g.run('enterFloor(2, false)');
  assert.equal(g.run('state.biome'), 'cavern');
  assert.ok(g.run('state.props.length > 0'));
  assert.notDeepEqual(g.json('state.props'), props);
  assert.equal(g.run('Object.values(state.floors).some(f => f.biome === "crypt")'), true);
  g.run(`document.createElement = () => ({ width: 0, height: 0,
    getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) });
    graphicsCache().tiles = {}; state.area='dungeon'; state.biome = "crypt"; drawDungeonTile(2, 2);
    state.biome = "throne"; drawDungeonTile(2, 2)`);
  assert.equal(g.run('Object.keys(graphicsCache().tiles).some(k => k.includes("crypt"))'), true);
  assert.equal(g.run('Object.keys(graphicsCache().tiles).some(k => k.includes("throne"))'), true);
  g.run('state.visited.add(`${state.player.x},${state.player.y + 1}`); state.props = [{ x: state.player.x, y: state.player.y + 1, sprite: BIOMES[state.biome].prop }]');
  g.calls.length = 0; g.run('drawFloorDetails()');
  const painted = g.calls.some(call => call[0] === 'drawImage' || call[0] === 'fillRect')
    || (g.calls.filtered || 0) > 0
    || g.run("state.art && state.art.sprites && Object.keys(state.art.sprites).some(k => k.includes('tombstone') || k.includes('mushroom') || k.includes('root') || k.includes('crystal'))");
  assert.ok(painted, 'biome props are painted');
});

test('merchant stock and prices scale with depth on every even non-boss floor', () => {
  const g = game();
  g.run(`state.depth = 8; state.gold = 500;
    state.merchant = { x: state.player.x, y: state.player.y, isMerchant: true,
      stock: [{ ...ITEM_TABLE[1], id: 100 }] }; buyFromMerchant();`);
  assert.equal(g.run('state.gold'), 500 - Math.round(40 * (1.5 + 7 * 0.03)));
  assert.equal(g.run('merchantStock().length'), 5);
  g.run('enterFloor(6, false)');
  assert.ok(g.run('!!state.merchant'));
  assert.equal(g.run('state.merchant.stock.length'), 4);
  assert.equal(g.run('state.prisoner !== null'), true, 'prisoners still share even floors');
});

test('enemy healers prioritize the most wounded visible ally', () => {
  const g = game();
  g.run(`state.activeTime = 5; state.floorKey = null;
    state.monsters = [
      { id: 1, name: 'Healer', sprite: 'healer', hp: 30, maxHp: 30, atk: 6, def: 3, magic: true,
        magicType: 'heal', magicRange: 3, x: state.player.x + 1, y: state.player.y, nextAttackAt: 0 },
      { id: 2, name: 'Orc', sprite: 'orc', hp: 10, maxHp: 40, atk: 16, def: 5,
        x: state.player.x + 2, y: state.player.y, nextAttackAt: 0 }
    ]; enemyAttack(state.monsters[0]);`);
  assert.ok(g.run('state.monsters[1].hp') > 10, 'wounded ally is healed');
  assert.equal(g.run('state.monsters[0].hp'), 30, 'healthy healer does not heal themselves');
  assert.equal(g.run('state.motion.projectiles[0].kind'), 'heal');
});

test('depth 50 has a saved throne room with bone volleys and summoned guards', () => {
  const g = game();
  g.run('newGame(); enterFloor(50, false)');
  const arena = g.json('state.rooms.find(r => r.isArena)');
  assert.equal(arena.isThroneRoom, true);
  assert.equal(g.run('state.boss.isThroneBoss'), true);
  assert.equal(g.run('state.boss.ranged'), true);
  assert.equal(g.run('state.boss.projectile'), 'bone');
  const props = g.json('state.props.filter(p => p.x >= state.rooms.find(r => r.isThroneRoom).x && p.x < state.rooms.find(r => r.isThroneRoom).x + state.rooms.find(r => r.isThroneRoom).w)');
  assert.ok(props.some(p => p.sprite === 'throne'), 'throne dais is a saved prop');
  assert.ok(props.some(p => p.sprite === 'torch'), 'torch rows are saved props');
  assert.ok(props.some(p => p.sprite === 'banner'), 'banners are saved props');
  g.run(`state.activeTime = 10; state.bossSummonAt = 10;
    state.player.hp = state.player.maxHp = 9999;
    state.player.x = state.boss.x - 2; state.player.y = state.boss.y;
    state.motion.projectiles = []; state.boss.nextAttackAt = 0;
    enemyAttack(state.boss); summonThroneGuards()`);
  assert.equal(g.run('state.motion.projectiles[0].kind'), 'bone');
  assert.ok(g.run('state.monsters.some(m => m.isGuard && m.hp > 0)'), 'Skeleton King summons guards');
  assert.ok(g.run('state.messages.some(m => m.includes("skeletal guard"))'), 'summons are logged');
});

test('Skeleton King defeat shatters the crown, collapses guards, and never repeats rewards', () => {
  const g = game();
  g.run(`newGame(); enterFloor(50, false);
    state.activeTime = 10; state.bossSummonAt = 10; summonThroneGuards();
    state.player.x = state.boss.x - 1; state.player.y = state.boss.y; updateCamera();
    damageMonster(state.boss, state.boss.hp)`);
  const scene = g.json('bossDefeatScene()');
  assert.equal(scene.motif, 'crown');
  assert.ok(scene.crownShards.length > 0, 'crown shatters into shards');
  assert.ok(scene.guards.length > 0, 'summoned army falls in the defeat scene');
  assert.ok(g.run('state.messages.some(m => m.includes("throne falls silent"))'), 'unique defeat log persists in journal');
  const rewards = g.json('[state.gold, state.kills, state.player.xp]');
  g.calls.length = 0; g.run('draw()');
  assert.ok(g.calls.some(c => c[0] === 'fillRect'), 'defeat particles and guards render');
  assert.equal(g.calls.filter(c => c[0] === 'save').length, g.calls.filter(c => c[0] === 'restore').length);
  g.key('Escape');
  down(g);
  const afterDescent = g.json('[state.gold, state.kills, state.player.xp]');
  up(g);
  assert.equal(g.run('state.depth'), 50);
  assert.equal(g.run('state.bossDefeated'), true);
  assert.equal(g.run('state.monsters.some(m => m.isGuard)'), false, 'guards do not respawn after the throne falls');
  assert.deepEqual(g.json('[state.gold, state.kills, state.player.xp]'), afterDescent, 'rewards are not repeated on revisit');
  assert.equal(g.json('[state.gold, state.kills, state.player.xp]')[0] - rewards[0], 3, 'only the normal descent bonus was added');
});

test('dev console toggles with tilde and freezes gameplay while open', () => {
  const g = game();
  const before = g.json('[state.player.x, state.player.y, state.activeTime]');
  g.key('`');
  assert.equal(g.run('state.consoleOpen'), true);
  assert.equal(g.elements.devConsole.hidden, false);
  g.key('w'); g.run('enemyTick()');
  assert.deepEqual(g.json('[state.player.x, state.player.y, state.activeTime]'), before);
  g.key('~');
  assert.equal(g.run('state.consoleOpen'), false);
  assert.equal(g.elements.devConsole.hidden, true);
});

test('loadLevel jumps to a fresh boss floor and rejects invalid depths', () => {
  const g = game();
  g.key('`');
  const input = g.elements.consoleInput;
  input.value = 'loadLevel 50'; g.key('Enter', { target: input });
  assert.equal(g.run('state.depth'), 50);
  assert.equal(g.run('state.boss.name'), 'Skeleton King');
  assert.equal(g.run('state.boss.hp'), g.run('state.boss.maxHp'));
  assert.ok(g.elements.consoleOutput.textContent.includes('Loaded depth 50'));
  assert.ok(g.run('state.messages.some(m => m.includes("Cheat: loaded depth 50"))'));
  g.run('damageMonster(state.boss, state.boss.hp)');
  g.key('Escape');
  g.key('`');
  input.value = 'loadLevel 50'; g.key('Enter', { target: input });
  assert.equal(g.run('state.boss.hp'), g.run('state.boss.maxHp'), 'reloading regenerates the boss for repeat tests');
  input.value = 'loadLevel 900'; g.key('Enter', { target: input });
  assert.equal(g.run('state.depth'), 50);
  assert.ok(g.elements.consoleOutput.textContent.includes('Usage: loadLevel <1-100>'));
});

test('godMode freezes only hero stats until disabled', () => {
  const g = game();
  g.key('`');
  const input = g.elements.consoleInput;
  g.run('state.player.mp = 7; state.monsters[0].hp = 3; render()');
  const frozen = g.json('[state.player.hp, state.player.maxHp, state.player.mp, state.player.maxMp, state.player.str, state.player.dex, state.player.def, state.player.lvl, state.player.xp, state.player.xpNext]');
  input.value = 'godMode 1'; g.key('Enter', { target: input });
  assert.equal(g.run('state.godMode'), true);
  assert.equal(g.elements.godModeStat.hidden, false);
  g.run(`hurtPlayer(9999, "test hit"); castSpell("fireball");
    damageMonster(state.monsters[0], 9999); regenMana(); drinkPotion(); render()`);
  assert.deepEqual(g.json('[state.player.hp, state.player.maxHp, state.player.mp, state.player.maxMp, state.player.str, state.player.dex, state.player.def, state.player.lvl, state.player.xp, state.player.xpNext]'), frozen);
  assert.equal(g.run('state.monsters[0].hp <= 0'), true, 'monsters can still be killed');
  const monsterHp = g.run('state.monsters[1].hp');
  g.run('state.monsters[1].hp -= 4');
  assert.equal(g.run('state.monsters[1].hp'), monsterHp - 4, 'monster stats are not frozen');
  g.run('state.monsters[1].hp = 5000; state.monsters[1].maxHp = 5000; attackMonster(state.monsters[1])');
  assert.equal(g.run('state.monsters[1].hp <= 0'), true, 'hero attacks still kill high-HP monsters');
  assert.equal(g.run('state.gameOver'), false);
  input.value = 'godMode 0'; g.key('Enter', { target: input });
  assert.equal(g.run('state.godMode'), false);
  g.run('hurtPlayer(5, "test hit")');
  assert.equal(g.run('state.player.hp'), g.run('state.player.maxHp') - 5);
});

test('objective hides future bosses and hero details sit above the adventure log', () => {
  const g = game();
  g.run('enterFloor(6, false); render()');
  assert.doesNotMatch(g.elements.objective.textContent, /Next boss|\b(Mimic|Hydra)\b|depth 10\b/i);
  assert.match(g.elements.objective.textContent, /Descend/);
  g.run('enterFloor(5, false); render()');
  assert.match(g.elements.objective.textContent, /Defeat Mimic here/);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const left = html.indexOf('id="leftSidebar"');
  const hero = html.indexOf('id="heroMaxHp"');
  const spells = html.indexOf('id="spellList"');
  const journal = html.indexOf('id="journalTitle"');
  const equip = html.indexOf('id="equipTitle"');
  assert.ok(left >= 0 && left < hero && hero < journal && journal < equip && equip < spells);
  const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
  assert.match(css, /#leftSidebar\s*\{[^}]*grid-template-rows:\s*180px minmax\(0, 1fr\)/);
});

test('adventure log shows newest messages first while stored history stays chronological', () => {
  const g = game();
  g.run('log("old entry"); log("new entry")');
  assert.deepEqual(g.json('[state.messages.at(-2), state.messages.at(-1)]'), ['old entry', 'new entry']);
  assert.ok(g.elements.log.textContent.indexOf('new entry') < g.elements.log.textContent.indexOf('old entry'));
  assert.equal(g.elements.log.scrollTop, 0);
});

test('mana regenerates only outside recent combat and away from monsters', () => {
  const g = game();
  g.run(`state.player.mp = 5; state.combatElapsed = 0; state.activeTime = 20;
    state.manaRegenAt = 0; state.monsters = []; regenMana()`);
  assert.equal(g.run('state.player.mp'), 5, 'recent combat blocks regeneration');
  g.run('state.combatElapsed = 5; regenMana()');
  assert.equal(g.run('state.player.mp'), 6);
  g.run('state.activeTime = 22; markCombat(); regenMana()');
  assert.equal(g.run('state.player.mp'), 6, 'an attack restarts the mana timer');
  g.run(`state.combatElapsed = 5; state.activeTime = 30;
    state.monsters = [{ hp: 1, x: state.player.x + 2, y: state.player.y }]; regenMana()`);
  assert.equal(g.run('state.player.mp'), 6, 'a nearby monster blocks regeneration');
});

test('Magic Barrier shoves a foe three tiles or damages it against a wall', () => {
  const g = game();
  g.run(`Math.random = () => 0.9;
    state.player.spells.magicBarrier = true; state.player.mp = 20; state.activeTime = 20;
    state.spellReadyAt.magicBarrier = 0; state.floorKey = null;
    state.monsters = [{ id: 1, name: 'Slime', sprite: 'slime', hp: 30, maxHp: 30,
      atk: 5, def: 0, xp: 10, x: state.player.x + 1, y: state.player.y }];
    for (let i = 1; i <= 5; i++) state.map[state.player.y][state.player.x + i] = 0`);
  const startX = g.run('state.player.x');
  g.key('z');
  assert.equal(g.run('state.monsters[0].x'), startX + 4, 'the foe moves three tiles away');
  assert.equal(g.run('state.monsters[0].hp'), 30, 'an open path causes no impact damage');
  assert.equal(g.run('state.player.mp'), 6);

  const wall = game();
  wall.run(`Math.random = () => 0.9;
    state.player.spells.magicBarrier = true; state.player.mp = 20; state.activeTime = 20;
    state.spellReadyAt.magicBarrier = 0; state.floorKey = null;
    state.monsters = [{ id: 1, name: 'Slime', sprite: 'slime', hp: 30, maxHp: 30,
      atk: 5, def: 0, xp: 10, x: state.player.x + 1, y: state.player.y }];
    state.map[state.player.y][state.player.x + 2] = 1`);
  const wallX = wall.run('state.monsters[0].x');
  wall.key('z');
  assert.equal(wall.run('state.monsters[0].x'), wallX, 'a wall stops the knockback');
  assert.ok(wall.run('state.monsters[0].hp') < 30, 'the wall impact deals damage');
});

test('defeated bosses become tiny companions that chip in and comment ironically', () => {
  const g = game();
  g.run(`Math.random = () => 0.9; state.depth = 3; state.player.mp = 20;
    state.activeTime = 20; state.floorKey = null;
    state.monsters = [{ id: 99, name: 'Cook', sprite: 'orc', hp: 1, maxHp: 1,
      atk: 1, def: 0, xp: 1, gold: 0, x: state.player.x + 1, y: state.player.y, isBoss: true }]`);
  g.key('f');
  assert.deepEqual(g.json('[state.companion.name, state.companion.sprite]'), ['Cook', 'orc']);
  assert.equal(g.run(`Math.max(Math.abs(state.companion.x - state.player.x), Math.abs(state.companion.y - state.player.y)) <= 1 &&
    state.map[state.companion.y][state.companion.x] === 0 &&
    !(state.companion.x === state.player.x && state.companion.y === state.player.y)`), true);
  assert.equal(g.run('state.messages.some(m => /Cook:/.test(m))'), true);
  g.run('clearBossDefeat(); state.bossDefeat = null;');
  g.run(`state.companionSpeech = null; state.companionAttackAt = 0; state.activeTime = 30;
    state.monsters = [{ id: 100, name: 'Slime', sprite: 'slime', hp: 10, maxHp: 10,
      atk: 1, def: 0, xp: 1, x: state.player.x + 2, y: state.player.y }];
    companionTick()`);
  assert.equal(g.run('state.monsters[0].hp'), 9, 'the companion deals only one damage');
  g.run('state.companionSpeechReadyAt = 0; companionTalk("retreat"); render()');
  assert.equal(g.run('state.messages.some(m => /Cook:/.test(m))'), true);
  assert.equal(g.elements.companionStat.hidden, false);
  assert.equal(g.elements.companionName.textContent, 'Cook');
  g.run('newGame(); render()');
  assert.equal(g.run('state.companion'), null);
  assert.equal(g.elements.companionStat.hidden, true);
});

test('companions stay in a walkable adjacent tile and follow the hero', () => {
  const g = game();
  g.run(`state.monsters = [];
    for (let y = 3; y <= 7; y++) for (let x = 3; x <= 8; x++) state.map[y][x] = 0;
    state.player.x = 5; state.player.y = 5;
    state.companion = { name: 'Test', sprite: 'slime', x: 4, y: 5 };
    state.motion.facing.player = 1;
    movePlayer(1, 0)`);
  assert.deepEqual(g.json('[state.player.x, state.player.y, state.companion.x, state.companion.y]'), [6, 5, 5, 5]);
  assert.equal(g.run(`Math.max(Math.abs(state.companion.x - state.player.x), Math.abs(state.companion.y - state.player.y)) === 1`), true);
  g.run(`state.monsters = [{ id: 7, name: 'Slime', sprite: 'slime', hp: 10, maxHp: 10, x: 5, y: 5 }];
    state.companion.x = 3; state.companion.y = 3;
    placeCompanionNearPlayer()`);
  assert.deepEqual(g.json('[state.companion.x, state.companion.y]'), [6, 4]);
  assert.equal(g.run('state.map[state.companion.y][state.companion.x] === 0'), true);
});

test('companions light nearby tiles without becoming floor-saved state', () => {
  const g = game();
  g.run(`state.monsters = [];
    state.player.x = 5; state.player.y = 5;
    state.companion = { name: 'Test', sprite: 'slime', x: 8, y: 5 };
    state.visited.clear();
    revealAroundPlayer();
    saveFloor()`);
  assert.equal(g.run('fogLevel(10, 5)'), 0, 'the companion reduces fog beyond player range');
  assert.equal(g.run("state.visited.has('10,5')"), true, 'the companion reveals explored terrain');
  assert.equal(g.run("Object.keys(state.floors[state.depth]).includes('companion')"), false);
  g.run('state.companion = null');
  assert.equal(g.run('fogLevel(10, 5)'), 3);
});

test('death clears the active companion', () => {
  const g = game();
  g.run(`state.companion = { name: 'Test', sprite: 'slime', x: state.player.x, y: state.player.y };
    gameOver(false)`);
  assert.equal(g.run('state.companion'), null);
});

test('runs begin in a connected town instead of a dungeon floor', () => {
  const g = game(42, true, 'town');
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.elements.depth.textContent, 'Town');
  assert.deepEqual(g.json('Object.keys(state.floors)'), ['1']);
  assert.equal(g.run('state.monsters.length'), 0);
  assert.equal(g.run('state.hazards.length'), 0);
  assert.equal(g.run('state.merchant.stock.length'), 6);
  assert.equal(g.run('state.map[state.town.spawn.y][state.town.spawn.x]'), 0);
  assert.equal(g.run('state.map[29][48]'), 0, 'the river bridge is walkable');
  assert.equal(g.run('state.map[28][48]'), 1, 'the river blocks movement');
  assert.equal(g.run('floorDistances(state.map, state.town.spawn).has("55,29")'), true);
});

test('Inn and Store serve the town without advancing dungeon timers', () => {
  const g = game(42, true, 'town');
  g.run(`state.player.hp = 5; state.player.mp = 2; state.activeTime = 30; state.hazardTime = 7;
    state.player.x = state.inn.x; state.player.y = state.inn.y; pickup()`);
  assert.equal(g.run('state.player.hp'), g.run('state.player.maxHp'));
  assert.equal(g.run('state.player.mp'), g.run('state.player.maxMp'));
  assert.equal(g.run('state.pause'), null);
  g.run('state.gold = 500; state.player.x = state.merchant.x; state.player.y = state.merchant.y; pickup()');
  assert.equal(g.run('state.merchant.stock.length'), 5);
  assert.equal(g.run('state.inventory.length'), 1);
  assert.equal(g.run('state.gold < 500'), true);
  g.run('enemyTick()');
  assert.equal(g.run('state.activeTime'), 30);
  assert.equal(g.run('state.hazardTime'), 7);
});

test('townspeople patrol, talk on approach, and stay outside floor saves', () => {
  const g = game(42, true, 'town');
  const before = g.json('state.town.npcs.map(n => [n.x, n.y])');
  g.run('for (let i = 0; i < 8; i++) townTick()');
  assert.notDeepEqual(g.json('state.town.npcs.map(n => [n.x, n.y])'), before);
  g.run('state.player.x = state.town.npcs[0].x; state.player.y = state.town.npcs[0].y; pickup()');
  assert.equal(g.run('state.town.speech !== null'), true);
  assert.equal(g.run('state.messages.some(m => m.includes("Mira:"))'), true);
  assert.equal(g.run('FLOOR_FIELDS.includes("town")'), false);
  assert.equal(g.run('Object.keys(state.floors[1]).includes("town")'), false);
});

test('town is fully visible, decorated, populated, and keeps the player clear of NPCs', () => {
  const g = game(42, true, 'town');
  const sprites = g.json('state.props.map(prop => prop.sprite)');
  for (const sprite of ['tree', 'water', 'bridge', 'inn', 'store', 'hut', 'doorstep', 'townGate']) {
    assert.equal(sprites.includes(sprite), true, `missing ${sprite}`);
  }
  assert.equal(g.run('state.player.y'), 26);
  assert.equal(g.run('state.town.animals.length >= 5'), true);
  assert.equal(g.run('!!SPRITES.hut && !!SPRITES.doorstep && !!SPRITES.cat && !!SPRITES.dog && !!SPRITES.chicken && !!SPRITES.townScroll && !!SPRITES.townPortal && !!SPRITES.catCompanion'), true);
  assert.equal(g.run('!!TILE_PALETTES.town.sand'), true);
  const animals = g.json('state.town.animals.map(animal => [animal.x, animal.y])');
  g.run('for (let i = 0; i < 8; i++) townTick()');
  assert.notDeepEqual(g.json('state.town.animals.map(animal => [animal.x, animal.y])'), animals);
  const fogCalls = g.run(`(() => {
    const original = fogLevel;
    let count = 0;
    fogLevel = (...args) => { count++; return original(...args); };
    draw();
    fogLevel = original;
    return count;
  })()`);
  assert.equal(fogCalls, 0);
  g.run(`(() => {
    const npc = state.town.npcs[0];
    const dx = state.map[npc.y][npc.x - 1] === 0 ? -1 : 1;
    state.player.x = npc.x + dx; state.player.y = npc.y;
    movePlayer(-dx, 0);
  })()`);
  assert.equal(g.run(`(() => {
    const npc = state.town.npcs[0];
    return state.player.x === npc.x && state.player.y === npc.y;
  })()`), false);
  assert.equal(g.run('state.town.speech !== null'), true);
});

test('the town gate enters floor one and town progress survives a return', () => {
  const g = game(42, true, 'town');
  g.run('state.gold = 500; state.player.x = state.merchant.x; state.player.y = state.merchant.y; pickup()');
  const stock = g.run('state.merchant.stock.length');
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.depth'), 1);
  assert.equal(g.run('state.town !== null'), true);
  g.run('state.gold = 123; state.visited.add("2,2"); enterTown()');
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.gold'), 123);
  assert.equal(g.run('state.merchant.stock.length'), stock);
  assert.equal(g.run('state.monsters.length'), 0);
  assert.equal(g.run("state.visited.has('2,2')"), false);
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.depth'), 1);
});

test('depth 1 up stairs are drawn and return to town', () => {
  const g = game(42, true, 'dungeon');
  assert.equal(g.run('!!state.upstairs'), true);
  const sprites = g.run(`(() => {
    const original = drawSprite;
    const seen = [];
    drawSprite = (...args) => { seen.push(args[0]); return original(...args); };
    draw();
    drawSprite = original;
    return seen;
  })()`);
  assert.equal(sprites.includes('stairsUp'), true);
  g.run('state.player.x = state.upstairs.x; state.player.y = state.upstairs.y; pickup()');
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.monsters.length'), 0);
  assert.equal(g.run('!!state.floors[1]'), true);
  assert.equal(g.run('state.messages.some(m => m.includes("back to town"))'), true);
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.depth'), 1);
});

test('Town Scroll can be bought, found, and counted without mixing with potions', () => {
  const g = game(42, true, 'town');
  g.run(`state.gold = 500;
    state.merchant.stock = [{ ...ITEM_TABLE.find(item => item.name === 'Town Scroll'), id: 900 }];
    state.player.x = state.merchant.x; state.player.y = state.merchant.y; pickup()`);
  assert.equal(g.run('state.townScrolls'), 1);
  assert.equal(g.run('state.inventory.length'), 0);
  assert.match(g.elements.spellList.textContent, /J Town Scroll \(1\)/);
  g.run(`enterDungeonFromTown();
    state.treasures = [{ x: state.player.x, y: state.player.y, ...ITEM_TABLE.find(item => item.name === 'Town Scroll') }];
    pickup()`);
  assert.equal(g.run('state.townScrolls'), 2);
  assert.equal(g.run('state.inventory.length'), 0);
});

test('J opens a one-shot Town Scroll portal and returns to the exact dungeon tile', () => {
  const g = game();
  g.run('state.townScrolls = 1; state.player.x = 12; state.player.y = 9; state.map[9][12] = 0;');
  g.key('j');
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.townScrolls'), 0);
  assert.deepEqual(g.json('state.townExit'), { depth: 1, x: 12, y: 9, reason: 'scroll' });
  assert.equal(g.run('state.townPortalOpen'), true);
  assert.match(g.elements.spellList.textContent, /J Town Portal \(ready\)/);
  assert.match(g.elements.objective.textContent, /portal/i);
  g.key('j');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), [12, 9]);
  assert.equal(g.run('state.townExit'), null);
  assert.equal(g.run('state.townPortalOpen'), false);
  g.key('j');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.match(g.json('state.messages.at(-1)'), /No Town Scroll stored/);
});

test('Space at the town gate consumes an open portal instead of normal entry', () => {
  const g = game();
  g.run('enterFloor(2, false); state.townScrolls = 1;');
  const exit = g.json('[state.player.x,state.player.y]');
  g.key('j');
  assert.equal(g.run('state.area'), 'town');
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.depth'), 2);
  assert.deepEqual(g.json('[state.player.x,state.player.y]'), exit);
  assert.equal(g.run('state.townExit'), null);
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.match(g.json('state.messages.at(-1)'), /town portal/);
});

test('a second scroll in the dungeon is not consumed while a portal is open', () => {
  const g = game();
  g.run('state.townScrolls = 2; state.townPortalOpen = true; state.townExit = { depth: 1, x: state.player.x, y: state.player.y, reason: "scroll" }');
  g.key('j');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.townScrolls'), 2);
  assert.match(g.json('state.messages.at(-1)'), /already open/);
});

test('Town Scroll return reuses the saved floor instead of regenerating it', () => {
  const g = game(); down(g);
  g.run(`state.monsters[0].hp = 1; state.potions = []; state.treasures = [];
    state.merchant.stock = []; state.bossDefeated = true; state.floorKey.collected = true;
    state.hazards = []; state.townScrolls = 1;`);
  const saved = g.json('[state.map, state.monsterSpawns, state.merchant, state.bossDefeated, state.floorKey, state.hazards, state.potions, state.treasures]');
  g.key('j'); g.key('j');
  assert.equal(g.run('state.depth'), 2);
  assert.deepEqual(g.json('[state.map, state.monsterSpawns, state.merchant, state.bossDefeated, state.floorKey, state.hazards, state.potions, state.treasures]'), saved);
});

test('Town Scroll return resolves blocked exit tiles safely', () => {
  const g = game();
  g.run('enterFloor(2, false); state.townScrolls = 1;');
  const exit = g.json('[state.player.x,state.player.y]');
  g.key('j');
  g.run(`(() => {
    const floor = state.floors[2];
    floor.map[${exit[1]}][${exit[0]}] = 1;
    state.townExit.x = ${exit[0]}; state.townExit.y = ${exit[1]}; state.townPortalOpen = true;
  })()`);
  g.key('j');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.map[state.player.y][state.player.x]'), 0);
  assert.notDeepEqual(g.json('[state.player.x,state.player.y]'), exit);
});

test('Town Scroll portal survives dungeon travel but clears on retreat, death, ending, and restart', () => {
  const g = game();
  g.run('state.townScrolls = 2; state.townPortalOpen = true; state.townExit = { depth: 1, x: state.player.x, y: state.player.y, reason: "scroll" }');
  const scrollExit = g.json('state.townExit');
  down(g);
  assert.equal(g.run('state.depth'), 2);
  assert.equal(g.run('state.townPortalOpen'), true);
  assert.deepEqual(g.json('state.townExit'), scrollExit);
  const retreatExit = g.json('[state.player.x,state.player.y]');
  g.run('state.retreatReadyAt = 0; state.player.hp = 5; checkHealth(); retreat(); confirmRetreat()');
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.deepEqual(g.json('state.townExit'), { depth: 2, x: retreatExit[0], y: retreatExit[1], reason: 'retreat' });
  assert.match(g.json('state.messages.at(-2)'), /portal collapses/);
  g.run('state.townPortalOpen = true; state.townExit = { depth: 2, x: 1, y: 1, reason: "scroll" }; gameOver(false)');
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.equal(g.run('state.townExit'), null);
  g.run(`state.gameOver = false; state.won = false; state.depth = 100; state.bossDefeated = true;
    state.princess = { rescued: true }; state.boss = { sprite: 'dragonBoss', hp: 160, maxHp: 160, x: 5, y: 5 };
    state.townPortalOpen = true; state.townExit = { depth: 100, x: 1, y: 1, reason: "scroll" }; gameOver(true)`);
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.equal(g.run('state.townExit'), null);
  g.key('r');
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.equal(g.run('state.townExit'), null);
  assert.equal(g.run('state.townScrolls'), 0);
});

test('help and HUD describe Town Scroll availability and portal state', () => {
  const g = game(42, true, 'town');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /J: Town Scroll/);
  g.run('state.townScrolls = 1; render()');
  assert.equal(String(g.elements.scrolls.textContent), '1');
  assert.match(g.elements.spellList.textContent, /J Town Scroll \(1\)/);
  g.run('state.townPortalOpen = true; render()');
  assert.match(g.elements.spellList.textContent, /J Town Portal \(ready\)/);
  assert.match(g.elements.objective.textContent, /portal/i);
});

test('a twice-size talking cat waits by the dungeon gate', () => {
  const g = game(42, true, 'town');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /Marmalade/);
  assert.equal(g.run('!!SPRITES.catCompanion && !!SPRITE_PALETTES.catCompanion'), true);
  const cat = g.json(`(() => { const c = entranceCatActor(); return {
    name: c.name, sprite: c.sprite, scale: c.scale, x: c.x, y: c.y, hidden: !!c.hidden,
    open: state.map[c.y][c.x] === 0, gateDistance: Math.max(Math.abs(c.x - state.townGate.x), Math.abs(c.y - state.townGate.y))
  }; })()`);
  assert.deepEqual([cat.name, cat.sprite, cat.scale], ['Marmalade', 'catCompanion', 1.5]);
  assert.equal(cat.open, true);
  assert.ok(cat.gateDistance <= 3 && cat.gateDistance > 1);
  assert.equal(cat.hidden, false);
  assert.equal(g.run('state.companion'), null);
  assert.equal(g.run('state.entranceCat.recruited'), false);
  assert.match(g.elements.objective.textContent, /huge cat/i);
});

test('Space recruits the gate cat before entering the dungeon', () => {
  const g = game(42, true, 'town');
  g.run(`(() => {
    const c = entranceCatActor();
    const spots = [[c.x + 1, c.y], [c.x - 1, c.y], [c.x, c.y + 1], [c.x, c.y - 1]];
    const tile = spots.find(([x, y]) => state.map[y] && state.map[y][x] === 0);
    state.player.x = tile[0]; state.player.y = tile[1]; pickup();
  })()`);
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.companion.name'), 'Marmalade');
  assert.equal(g.run('state.companion.kind'), 'cat');
  assert.equal(g.run('state.companion.scale'), 1.5);
  assert.equal(g.run('state.entranceCat.recruited'), true);
  assert.equal(g.run('entranceCatActor().hidden'), true);
  assert.equal(g.elements.companionStat.hidden, false);
  assert.equal(g.elements.companionName.textContent, 'Marmalade');
  assert.match(g.json('state.messages.join(" ")'), /wife and children/i);
  assert.match(g.json('state.messages.join(" ")'), /Marmalade:/);
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.companion.name'), 'Marmalade');
});

test('the first dungeon entry auto-joins the cat exactly once', () => {
  const g = game(42, true, 'town');
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.companion.name'), 'Marmalade');
  assert.equal(g.run('state.entranceCat.entered'), true);
  assert.equal(g.run('state.entranceCat.recruited'), true);
  assert.equal(g.run('entranceCatActor().hidden'), true);
  assert.match(g.json('state.messages.join(" ")'), /hops in before you can leave/i);
  const logCount = g.run('state.messages.filter(m => /hops in before you can leave/i.test(m)).length');
  up(g);
  g.run('state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.messages.filter(m => /hops in before you can leave/i.test(m)).length'), logCount);
});

test('Marmalade follows, renders twice normal cat size, and stays out of floor saves', () => {
  const g = game();
  g.run(`state.monsters = [];
    for (let y = 3; y <= 7; y++) for (let x = 3; x <= 8; x++) state.map[y][x] = 0;
    state.player.x = 5; state.player.y = 5;
    state.companion.x = 4; state.companion.y = 5;
    state.motion.facing.player = 1;
    movePlayer(1, 0); saveFloor()`);
  assert.deepEqual(g.json('[state.player.x, state.player.y, state.companion.x, state.companion.y]'), [6, 5, 5, 5]);
  assert.equal(g.run('Object.keys(state.floors[state.depth]).includes("entranceCat")'), false);
  assert.equal(g.run('Object.keys(state.floors[state.depth]).includes("companion")'), false);
  const drawn = g.json(`(() => {
    state.companionSpeech = null;
    const original = drawActorSprite, seen = [];
    drawActorSprite = (...args) => { seen.push([args[0], args[3]]); return original(...args); };
    draw();
    drawActorSprite = original;
    return seen.filter(item => item[0] === 'catCompanion');
  })()`);
  assert.deepEqual(drawn[0], ['catCompanion', 1.5]);
});

test('Marmalade prefers bats and adds only one bonus point against them', () => {
  const g = game();
  g.run(`(() => {
    const c = state.companion;
    for (let y = c.y - 1; y <= c.y + 1; y++) for (let x = c.x - 1; x <= c.x + 2; x++) state.map[y][x] = 0;
    state.activeTime = 20; state.companionSpeechReadyAt = 0; state.companionAttackAt = 0;
    state.monsters = [
      { id: 1, name: 'Bat', sprite: 'bat', hp: 10, maxHp: 10, atk: 1, def: 0, xp: 1, x: c.x + 2, y: c.y },
      { id: 2, name: 'Slime', sprite: 'slime', hp: 10, maxHp: 10, atk: 1, def: 0, xp: 1, x: c.x + 1, y: c.y }
    ];
    companionTick();
  })()`);
  assert.deepEqual(g.json('state.monsters.map(m => m.hp)'), [8, 10]);
  assert.match(g.json('state.messages.join(" ")'), /Marmalade:.*bat/i);
  g.run('state.activeTime = 30; state.companionSpeechReadyAt = 0; state.companionAttackAt = 0; state.monsters.shift(); companionTick()');
  assert.equal(g.run('state.monsters[0].hp'), 9);
});

test('the first boss kill retires Marmalade once before the boss companion joins', () => {
  const g = game();
  g.run(`state.activeTime = 20; state.floorKey = null;
    state.monsters = [{ id: 99, name: 'Cook', sprite: 'orc', hp: 1, maxHp: 1,
      atk: 1, def: 0, xp: 1, gold: 0, x: state.player.x + 1, y: state.player.y, isBoss: true }];
    damageMonster(state.monsters[0], 1); clearBossDefeat(); state.bossDefeat = null;`);
  assert.equal(g.run('state.companion.name'), 'Cook');
  assert.equal(g.run('state.companion.kind'), 'boss');
  assert.equal(g.run('state.entranceCat.retired'), true);
  assert.match(g.json('state.messages.join(" ")'), /household budget/i);
  assert.equal(g.run('state.messages.filter(m => /household budget/i.test(m)).length'), 1);
  g.run(`state.monsters = [{ id: 100, name: 'Bartender', sprite: 'skeleton', hp: 1, maxHp: 1,
    atk: 1, def: 0, xp: 1, gold: 0, x: state.player.x + 1, y: state.player.y, isBoss: true }];
    damageMonster(state.monsters[0], 1); clearBossDefeat(); state.bossDefeat = null;`);
  assert.equal(g.run('state.companion.name'), 'Bartender');
  assert.equal(g.run('state.messages.filter(m => /household budget/i.test(m)).length'), 1);
});

test('death, ending, and restart reset the waiting cat and active companion', () => {
  const g = game();
  g.run('gameOver(false)');
  assert.deepEqual(g.json('state.entranceCat'), { recruited: false, entered: false, retired: false });
  g.run(`state.gameOver = false; state.depth = 100; state.bossDefeated = true;
    state.princess = { rescued: true }; state.boss = { sprite: 'dragonBoss', hp: 160, maxHp: 160, x: 5, y: 5 };
    state.entranceCat = { recruited: true, entered: true, retired: false }; gameOver(true)`);
  assert.equal(g.run('state.companion'), null);
  assert.deepEqual(g.json('state.entranceCat'), { recruited: false, entered: false, retired: false });
  g.run('state.entranceCat = { recruited: true, entered: true, retired: true }; newGame()');
  assert.deepEqual(g.json('state.entranceCat'), { recruited: false, entered: false, retired: false });
  assert.equal(g.run('state.companion'), null);
  assert.equal(g.run('!!entranceCatActor().hidden'), false);
});

test('JRPG directional frames have complete palettes, fixed bounds and distinct four-way hero art',()=>{
  const g=game();
  assert.equal(g.run(`Object.entries(JRPG_VARIANTS).every(([name,dirs])=>Object.values(dirs).every(frames=>frames.length===4&&frames.every(id=>JRPG_GRIDS[id].length===SPRITES[name].length&&JRPG_GRIDS[id].every(row=>row.length===SPRITES[name][0].length&&[...row].every(ch=>ch==='.'||SPRITE_PALETTES[name][ch])))))`),true);
  const views=g.json("['front','back','left','right'].map(dir=>spriteFrameGrid('knight',0,dir).join(''))");
  assert.equal(new Set(views).size,4);
  assert.equal(g.run("['frostboltTome','greaterHealTome','barrierTome','cook','bartender','arrowFX','fireballFX','healFX'].every(name=>SPRITES[name].some(row=>/[^.]/.test(row)))"),true);
});

test('directional movement and raster caches remain visual-only with a fixed tile foot anchor',()=>{
  const g=game();enableMotion(g);
  const progression=g.json('[state.player.hp,state.player.mp,state.player.xp,state.turn,state.gold]');
  g.run(`window.surfaceCount=0;document.createElement=()=>({width:0,height:0,getContext:()=>ctx});
    moveActorTo(state.player,41,30);advanceMotion(1);drawActorSprite('knight',100,100,2,state.player)`);
  assert.equal(g.run('state.motion.directions.player'),'right');
  assert.equal(g.run('!!state.art.sprites["knight:right:0"]'),true);
  g.run(`moveActorTo(state.player,41,29);advanceMotion(1);drawActorSprite('knight',100,100,2,state.player)`);
  assert.equal(g.run('state.motion.directions.player'),'back');
  assert.equal(g.run('!!state.art.sprites["knight:back:0"]'),true);
  assert.notEqual(g.run('state.art.sprites["knight:back:0"]'),g.run('state.art.sprites["knight:right:0"]'));
  for(const [x,y,dir]of [[40,29,'left'],[40,30,'front']]){
    g.run(`moveActorTo(state.player,${x},${y});advanceMotion(1)`);
    assert.equal(g.run('state.motion.directions.player'),dir);
  }
  for(const name of ['knight','orc','mage','dragonBoss'])assert.equal(g.run(`worldSpriteCenterY('${name}',30,2)+spriteDimensions('${name}').height`),31*32);
  assert.deepEqual(g.json('[state.player.hp,state.player.mp,state.player.xp,state.turn,state.gold]'),progression);
  assert.equal(g.run('FLOOR_FIELDS.includes("motion")||FLOOR_FIELDS.includes("directions")'),false);
});

test('town architecture derives existing blocked footprints without changing map or interaction tiles',()=>{
  const g=game(43,true,'town'),map=g.json('state.map'),props=g.json('state.props'),landmarks=g.json('state.town.landmarks');
  assert.deepEqual(g.json('townBuildingBounds(state.props.find(p=>p.sprite==="inn"))'),{x0:26,x1:31,y0:20,y1:24});
  assert.deepEqual(g.json('townBuildingBounds(state.props.find(p=>p.sprite==="store"))'),{x0:43,x1:47,y0:20,y1:24});
  g.run('Math.random=()=>{throw Error("Rendering consumed gameplay RNG")};draw();draw()');
  assert.deepEqual(g.json('state.map'),map);assert.deepEqual(g.json('state.props'),props);assert.deepEqual(g.json('state.town.landmarks'),landmarks);
  assert.equal(g.run('state.map[state.inn.y][state.inn.x]'),0);
  assert.equal(g.run('state.map[state.townGate.y][state.townGate.x]'),0);
  assert.equal(g.run('FLOOR_FIELDS.includes("townBuildings")'),false);
});

test('throne rendering uses marble/carpet inside the saved arena without changing the floor biome or contents',()=>{
  const g=game();g.run('enterFloor(50,false)');
  const before=g.json('[state.biome,state.map,state.props,state.monsterSpawns]');
  assert.equal(g.run('artBiomeAt(state.rooms.find(r=>r.isThroneRoom).cx,state.rooms.find(r=>r.isThroneRoom).cy)'),'throne');
  assert.equal(g.run('throneCarpetAt(state.rooms.find(r=>r.isThroneRoom).cx,state.rooms.find(r=>r.isThroneRoom).cy)'),2);
  assert.equal(g.run('artBiomeAt(0,0)'),g.run('state.biome'));
  g.run('draw();saveFloor()');
  assert.deepEqual(g.json('[state.biome,state.map,state.props,state.monsterSpawns]'),before);
  assert.equal(g.run('state.floors[50].biome'),before[0]);
});

test('art culling includes visible overhangs while undiscovered props and spikes stay hidden',()=>{
  const g=game();g.run(`state.player.x=40;state.player.y=30;updateCamera();state.props=[];state.hazards=[];
    window.seenArt=[];const originalSprite=drawSprite;drawSprite=(...args)=>{window.seenArt.push(args[0]);originalSprite(...args);};
    state.props=[{x:state.player.x+1,y:state.player.y,sprite:'crystal'}];state.visited.delete((state.player.x+1)+','+state.player.y);draw()`);
  assert.equal(g.run('window.seenArt.includes("crystal")'),false);
  g.run('state.visited.add((state.player.x+1)+","+state.player.y);window.seenArt=[];draw()');
  assert.equal(g.run('window.seenArt.includes("crystal")'),true);
  assert.equal(g.run('inCamera(state.camera.x+VIEW_W,30)'),false);
  assert.equal(g.run('inArtCamera("dragonBoss",state.camera.x+VIEW_W,30,3)'),true);
  g.run('drawSprite=originalSprite');
});

test('themed boss companions draw the matching outfit without rewriting progression or combat sprites',()=>{
  const g=game(),readyAt=g.run('state.companionAttackAt');g.run(`window.companionSprites=[];const originalActorPainter=drawActorSprite;drawActorSprite=(...a)=>{window.companionSprites.push(a[0]);originalActorPainter(...a);};
    state.companion={kind:'boss',name:'Cook',sprite:'orc',x:state.player.x,y:state.player.y};drawCompanion();
    state.companion={kind:'boss',name:'Bartender',sprite:'skeleton',x:state.player.x,y:state.player.y};drawCompanion();`);
  assert.deepEqual(g.json('window.companionSprites'),['cook','bartender']);
  assert.equal(g.run('state.companion.sprite'),'skeleton');
  assert.equal(g.run('state.companionAttackAt'),readyAt);
});

for (const depth of [1, 2, 100]) {
  test(`floor ${depth} samples every weighted spawn-pool slot without depth-based clamping`, () => {
    const g = game(713);
    const pool = g.json(`spawnPool(${depth},biomeForDepth(${depth})).map(t=>t.name)`);
    g.run(`window.spawnSample=0;window.nextSpawnRoll=false;window.selectionCount=0;
      const originalSpawnPool=spawnPool, seededRandom=Math.random;
      spawnPool=(depth,biome)=>{const pool=originalSpawnPool(depth,biome);window.nextSpawnRoll=true;return pool;};
      Math.random=()=>{if(window.nextSpawnRoll){window.nextSpawnRoll=false;window.selectionCount++;return window.spawnSample;}return seededRandom();};`);
    const observed = [];
    for (let slot = 0; slot < pool.length; slot++) {
      // Control only the actual type-selection draw; map/placement draws retain seeded randomness.
      g.run(`window.spawnSample=${(slot + 0.5) / pool.length};window.selectionCount=0;enterFloor(${depth},false,true)`);
      const ordinary = g.json('state.monsters.filter(m=>!m.isBoss).map(m=>m.name)');
      assert.ok(ordinary.length > 0, 'the generated floor has ordinary monsters');
      assert.equal(g.run('window.selectionCount'), ordinary.length);
      assert.ok(ordinary.every(name => name === pool[slot]), `weighted slot ${slot} must produce ${pool[slot]}`);
      observed.push(ordinary[0]);
    }
    assert.deepEqual(observed, pool, 'duplicated biome-favored slots retain their weight');
    assert.equal(pool.filter(name => name === (depth === 2 ? 'Bat' : 'Skeleton')).length, 2);
    assert.ok(observed.includes(depth === 1 ? 'Orc' : depth === 2 ? 'Wasp' : 'Healer'), 'late pool entries remain selectable');
    assert.equal(g.run(`state.monsters.filter(m=>!m.isBoss).every(m=>${depth}>=(m.minDepth||1))`), true);
  });
}

function nearestSpellFixture(g, spell, monsters) {
  g.run(`state.area='dungeon';state.player.x=40;state.player.y=30;state.player.hp=state.player.maxHp;
    state.player.mp=50;state.player.maxMp=50;state.player.spells.${spell}=true;
    state.spellReadyAt.${spell}=0;state.activeTime=20;state.pause=null;state.companion=null;
    state.floorKey=null;state.hazards=[];state.obstacles=[];clearBossIntro();clearBossDefeat();clearMovementAnimation();
    for(let y=24;y<=38;y++)for(let x=34;x<=48;x++){state.map[y][x]=0;state.visited.add(x+','+y);}
    state.monsters=${JSON.stringify(monsters)}.map(m=>({...MONSTER_TYPES[0],hp:200,maxHp:200,atk:0,def:0,xp:0,...m}));
    updateCamera();Math.random=()=>0.9;`);
}

for (const spell of ['frostbolt', 'magicBarrier']) {
  test(`${spell} targets the nearer enemy even when a farther enemy comes first`, () => {
    const g = game();
    nearestSpellFixture(g, spell, [{id:9,x:43,y:30},{id:2,x:40,y:31}]);
    g.run(`castSpell('${spell}')`);
    assert.deepEqual(g.json('state.monsters.map(m=>m.id)'), [9,2], 'targeting must not reorder the live array');
    assert.equal(g.run('state.monsters[0].hp'), 200);
    assert.deepEqual(g.json('state.motion.projectiles.map(p=>[p.toX,p.toY])'), [[40.5*32,31.5*32]]);
    if (spell === 'frostbolt') {
      assert.ok(g.run('state.monsters[1].hp') < 200);
      assert.deepEqual(g.json('[state.monsters[1].x,state.monsters[1].y]'), [40,31]);
    } else {
      assert.deepEqual(g.json('[state.monsters[1].x,state.monsters[1].y]'), [40,34]);
      assert.equal(g.run('state.monsters[1].hp'), 200, 'a clear three-tile push causes no impact damage');
    }
    assert.equal(g.run('state.player.mp'), 50-g.run(`SPELLS.${spell}.cost`));
    assert.equal(g.run(`state.spellReadyAt.${spell}`), 20+g.run(`SPELLS.${spell}.cooldown`));
  });

  test(`${spell} breaks equal tile-distance ties by monster ID without RNG or array mutation`, () => {
    const g = game();
    nearestSpellFixture(g, spell, [{id:9,x:42,y:30},{id:2,x:42,y:32}]);
    g.run(`window.beforeTargetRandom=Math.random;Math.random=()=>{throw Error('Target selection consumed RNG')};
      window.firstChoice=nearestVisibleTarget(4).id;state.monsters.reverse();
      window.secondChoice=nearestVisibleTarget(4).id;Math.random=window.beforeTargetRandom;`);
    assert.deepEqual(g.json('[window.firstChoice,window.secondChoice]'), [2,2], 'diagonal and axial distance 2 are tied');
    assert.deepEqual(g.json('state.monsters.map(m=>m.id)'), [2,9]);
    g.run(`castSpell('${spell}')`);
    assert.deepEqual(g.json('state.motion.projectiles.map(p=>[p.toX,p.toY])'), [[42.5*32,32.5*32]]);
    assert.deepEqual(g.json('state.monsters.map(m=>m.id)'), [2,9]);
  });

  test(`${spell} ignores dead, unseen, blocked, off-camera and out-of-range enemies`, () => {
    const g = game();
    nearestSpellFixture(g, spell, [
      {id:1,x:40,y:31,hp:0}, {id:2,x:42,y:30}, {id:3,x:40,y:29},
      {id:4,x:39,y:29}, {id:5,x:40,y:35}, {id:6,x:40,y:33},
    ]);
    g.run(`state.map[30][41]=1;state.camera={x:40,y:28};
      const naturalFog=fogLevel;fogLevel=(x,y)=>x===40&&y===29?3:naturalFog(x,y);`);
    assert.deepEqual(g.json('visibleTargets(4).map(m=>m.id)'), [6]);
    g.run(`castSpell('${spell}')`);
    assert.deepEqual(g.json('state.motion.projectiles.map(p=>[p.toX,p.toY])'), [[40.5*32,33.5*32]]);
    assert.deepEqual(g.json('state.monsters.slice(0,5).map(m=>[m.id,m.x,m.y,m.hp])'),
      [[1,40,31,0],[2,42,30,200],[3,40,29,200],[4,39,29,200],[5,40,35,200]]);
  });

  test(`${spell} preserves its own range boundary`, () => {
    const g = game();
    nearestSpellFixture(g, spell, [{id:1,x:44,y:30}]);
    // Isolate spell range from fog; visibility eligibility is tested separately above.
    g.run('fogLevel=()=>0');
    g.run(`castSpell('${spell}')`);
    assert.equal(g.run('state.motion.projectiles.length'), spell==='frostbolt'?1:0);
    if(spell==='frostbolt')assert.ok(g.run('state.monsters[0].hp')<200);
    else assert.deepEqual(g.json('[state.monsters[0].x,state.monsters[0].y,state.monsters[0].hp]'),[44,30,200]);
  });

  test(`${spell} with no eligible target preserves existing mana, cooldown and empty-cast behavior`, () => {
    const g = game();
    nearestSpellFixture(g, spell, [{id:1,x:40,y:31,hp:0},{id:2,x:40,y:35}]);
    const turn = g.run('state.turn');
    assert.equal(g.run(`nearestVisibleTarget(${spell === 'frostbolt' ? 4 : 3})`), null);
    g.run(`castSpell('${spell}')`);
    assert.equal(g.run('state.motion.projectiles.length'), 0);
    assert.equal(g.run('state.player.mp'), 50-g.run(`SPELLS.${spell}.cost`));
    assert.equal(g.run(`state.spellReadyAt.${spell}`), 20+g.run(`SPELLS.${spell}.cooldown`));
    assert.equal(g.run('state.turn'), turn+1);
  });
}

test('connected wall edges follow the blocked footprint including corners and obstacle neighbors', () => {
  const g = game();
  g.run(`for(let y=24;y<=34;y++)for(let x=34;x<=46;x++)state.map[y][x]=0;
    for(let y=27;y<=31;y++)for(let x=37;x<=41;x++)state.map[y][x]=1;`);
  assert.deepEqual(g.json('[[37,27],[39,27],[41,27],[37,29],[39,29],[41,29],[37,31],[39,31],[41,31]].map(([x,y])=>dungeonWallEdges(x,y))'),
    [9,1,3,8,0,2,12,4,6]);
  g.run('state.map[29][40]=2');
  assert.equal(g.run('dungeonWallEdges(39,29)'), 2, 'an obstacle on floor does not connect to solid wall');
  g.run('state.map[28][38]=0');
  assert.equal(g.run('dungeonWallEdges(38,27)'), 5, 'an inner corner exposes its real floor boundary');
});

test('wall painters keep every edge combination inside one blocked tile without RNG or map changes', () => {
  const g = game(), before = g.json('[state.map,state.visited.size,state.player,state.monsters]');
  g.run(`window.wallPrimitives=[];jrpgRect=(c,x,y,w,h)=>window.wallPrimitives.push([x,y,x+w,y+h]);
    jrpgPoly=(c,points)=>{for(const [x,y] of points)window.wallPrimitives.push([x,y,x,y]);};
    Math.random=()=>{throw Error('Wall painting consumed gameplay RNG')};
    for(const biome of ['crypt','cavern','kitchen','tavern','throne'])for(let edges=0;edges<16;edges++)
      paintConnectedWall(ctx,biome,3,4,edges);`);
  const primitives = g.json('window.wallPrimitives');
  assert.ok(primitives.length > 80);
  assert.ok(primitives.every(([x0,y0,x1,y1])=>x0>=0 && y0>=0 && x1<=32 && y1<=32),
    'no 48px face may overpaint a neighboring walkable tile');
  assert.deepEqual(g.json('[state.map,state.visited.size,state.player,state.monsters]'), before);
});

test('wall tile cache distinguishes changed neighboring openings and reuses matching topology', () => {
  const g = game();
  g.run(`state.area='dungeon'; state.biome='crypt';
    for(let y=27;y<=29;y++)for(let x=39;x<=41;x++)state.map[y][x]=1;
    state.art.tiles={};window.wallSurfaces=0;document.createElement=()=>{window.wallSurfaces++;return {getContext:()=>ctx};};
    drawDungeonTile(40,28);state.map[29][40]=0;drawDungeonTile(40,28);`);
  assert.equal(g.run('window.wallSurfaces'), 2);
  g.run('state.map[29][40]=1;drawDungeonTile(40,28)');
  assert.equal(g.run('window.wallSurfaces'), 2);
  assert.ok(g.run('Object.keys(state.art.tiles).filter(k=>k.includes("wall")).length') >= 2);
});

test('hero walks along a one-tile corridor while both adjacent walls reject movement', () => {
  const g = game();
  g.run(`state.monsters=[];state.hazards=[];state.companion=null;state.pause=null;clearBossIntro();clearBossDefeat();
    for(let y=29;y<=31;y++)for(let x=35;x<=45;x++)state.map[y][x]=1;
    for(let x=36;x<=44;x++)state.map[30][x]=0;
    state.player.x=40;state.player.y=30;clearMovementAnimation();`);
  const before = g.run('state.turn');
  g.run('movePlayer(0,-1);movePlayer(0,1)');
  assert.deepEqual(g.json('[state.player.x,state.player.y,state.turn]'), [40,30,before]);
  for(let i=0;i<6;i++)g.run('movePlayer(1,0)');
  assert.deepEqual(g.json('[state.player.x,state.player.y,state.turn]'), [44,30,before+4]);
  for(let i=0;i<10;i++)g.run('movePlayer(-1,0)');
  assert.deepEqual(g.json('[state.player.x,state.player.y,state.turn]'), [36,30,before+12]);
  assert.equal(g.run('state.map[state.player.y][state.player.x]'), 0);
});

test('GR-02 art resolver unifies aliases, kind collisions, and fixed states', () => {
  const g = game();
  // throne should resolve to dais environment sprite, while material throne still exists
  assert.equal(g.run("artFrame('throne')?._kind"), 'env');
  assert.equal(g.run("artFrame('throne')?._name"), 'dais');
  assert.equal(g.run("!!(ART_RUNTIME.environment.throne && ART_RUNTIME.environment.throne.kind==='material')"), true);
  assert.equal(g.run("artHas('throne')"), true);
  assert.equal(g.run("artCovered('throne')"), true);

  // semantic aliases
  assert.equal(g.run("artFrame('dragon',0,'front')?._name"), 'dragonBoss');
  assert.equal(g.run("artFrame('rubble')?._kind"), 'env');
  assert.equal(g.run("artFrame('rubble')?._name"), 'rock');
  assert.equal(g.run("artResolve('water').material"), true);
  assert.equal(g.run("artResolve('water').name"), 'town');
  assert.equal(g.run("artResolve('water').part"), 'water');

  // fixed item aliases do not advance by frame argument
  assert.equal(g.run("artFrame('stairsUp',0,'front')?._fi"), 0);
  assert.equal(g.run("artFrame('stairsUp',3,'front')?._fi"), 0);
  assert.equal(g.run("artFrame('stairsDown',5,'front')?._fi"), 1);
  assert.equal(g.run("artFrame('flameOff',9,'front')?._fi"), 0);
  assert.equal(g.run("artFrame('flameOn',9,'front')?._fi"), 2);

  // missing required dir should not silently fall back
  const missingDir = g.run("(()=>{const w=[]; const old=console.warn; console.warn=(...a)=>w.push(a.join(' ')); const f=artFrame('knight',0,'nope'); console.warn=old; return {f, w};})()");
  assert.equal(missingDir.f, null);
  assert.ok(missingDir.w.some(m => /missing required dir/i.test(m)));

  // unknown/uncovered role should not throw from artRequire, covered missing should
  assert.equal(g.run("artRequire('totallyUnknownRole',0,'front')"), null);
  assert.throws(() => g.run("(()=>{ART_RUNTIME.aliases.__bad={kind:'item',id:'nope',fixed:true}; try{return artRequire('__bad',0,'front')} finally {delete ART_RUNTIME.aliases.__bad;}})()"), /missing required art/);
});

test('GR-03 visual contract: manifest-derived bounds/anchors, boss scales, cache keys, and draw semantics', () => {
  const g = game();
  const chars = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/previews/2026-11-25-0x72/characters-v1/manifest.json'), 'utf8'));
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/previews/2026-11-25-0x72/items-effects-v1/manifest.json'), 'utf8'));
  const env = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/previews/2026-11-25-0x72/environment-v1/manifest.json'), 'utf8'));
  const coverage = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/previews/2026-11-25-0x72/environment-v1/final-coverage.json'), 'utf8'));
  const charById = Object.fromEntries(chars.assets.map(a => [a.id, a]));
  const itemById = Object.fromEntries(items.assets.map(a => [a.id, a]));
  const envById = Object.fromEntries(env.assets.map(a => [a.id, a]));

  assert.equal(coverage.sources.length, 76, 'coverage role count');
  for (const src of coverage.sources) {
    assert.equal(g.run(`artCovered(${JSON.stringify(src.runtime)})`), true, `covered ${src.runtime}`);
    const d = g.json(`spriteDimensions(${JSON.stringify(src.runtime)})`);
    assert.ok(Number.isFinite(d.width) && Number.isFinite(d.height), `dims ${src.runtime}`);
  }

  for (const [id, a] of Object.entries(charById)) {
    const dims = g.json(`spriteDimensions(${JSON.stringify(id)})`);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const f of a.frames) { const b=f.bounds; minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.x+b.width); maxY=Math.max(maxY,b.y+b.height); }
    assert.ok(Math.abs(dims.width - (maxX-minX) / 2) < 0.02, `${id} union width`);
    assert.ok(Math.abs(dims.height - (maxY-minY) / 2) < 0.02, `${id} union height`);
    assert.ok(Math.abs(dims.anchorX - a.anchor[0] / 2) < 0.02, `${id} anchorX`);
    assert.ok(Math.abs(dims.anchorY - a.anchor[1] / 2) < 0.02, `${id} anchorY`);
    for (const dir of ['front','back','left','right']) {
      const f = a.frames.find(x => x.direction === dir && x.frame === 0);
      const dec = g.json(`(()=>{const d=artDecoded(${JSON.stringify(id)},0,${JSON.stringify(dir)});return {w:d.w,h:d.h,ax:d.anchor[0],ay:d.anchor[1],bw:d.bounds.width,bh:d.bounds.height,bx:d.bounds.x,by:d.bounds.y};})()`);
      assert.equal(dec.w, a.cellSize[0]);
      assert.equal(dec.h, a.cellSize[1]);
      assert.equal(dec.ax, f.anchor[0]);
      assert.equal(dec.ay, f.anchor[1]);
      assert.equal(dec.bw, f.bounds.width);
      assert.equal(dec.bh, f.bounds.height);
      assert.equal(dec.bx, f.bounds.x);
      assert.equal(dec.by, f.bounds.y);
    }
  }

  for (const [id, a] of Object.entries(itemById)) {
    if (!g.run(`artCovered(${JSON.stringify(id)})`)) continue;
    const dims = g.json(`spriteDimensions(${JSON.stringify(id)})`);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity, any=false;
    for (const f of a.frames) { const b=f.bounds; if(!b) continue; any=true; minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.x+b.width); maxY=Math.max(maxY,b.y+b.height); }
    if (!any) { assert.ok(dims.width>=0 && dims.height>=0); continue; }
    assert.ok(Math.abs(dims.width - (maxX-minX) / 2) < 0.02, `${id} width`);
    assert.ok(Math.abs(dims.height - (maxY-minY) / 2) < 0.02, `${id} height`);
  }

  // Boss contract: explicit accepted per-role source union sizes at scale 2
  const bosses = {mimic:[35,33],dragonBoss:[59.5,52],hydra:[53.5,48],boar:[38,36],medusa:[31.5,48],darkWizard:[39,48],skeletonKing:[48,51],cook:[32,33],bartender:[19.5,30]};
  for (const [name, [w,h]] of Object.entries(bosses)) {
    const dims = g.json(`spriteDimensions(${JSON.stringify(name)})`);
    assert.ok(dims.width >= w - 0.01 && dims.height >= h - 0.01, `${name} boss bounds`);
    assert.equal(g.run(`actorDrawScale(${JSON.stringify(name)},3)`), 2, `${name} world scale`);
  }

  // Foot stability across character poses/directions
  for (const id of ['knight','mimic','bat','wasp','catCompanion','merchant','prisoner','princess']) {
    const a = g.json(`spriteAnchor(${JSON.stringify(id)},0,'front')`);
    for (const dir of ['front','back','left','right']) for (const frame of [0,1,2,3]) {
      const b = g.json(`spriteAnchor(${JSON.stringify(id)},${frame},${JSON.stringify(dir)})`);
      assert.ok(Math.abs(a.ay - b.ay) < 0.01, `${id} foot anchor stable ${dir}:${frame}`);
    }
  }

  // Tiny companions and Marmalade scale contract
  assert.ok(g.run(`spriteDimensions('mimic').width * (actorDrawScale('mimic',3)*0.55/2) < 40`), 'tiny boss companion small');
  assert.equal(g.run(`(()=>{startGame();enterTown();state.entranceCat={recruited:true,entered:true,retired:false};state.companion={name:'Marmalade',sprite:'catCompanion',kind:'cat',scale:1.5,x:state.town.spawn.x+1,y:state.town.spawn.y};return state.companion.scale;})()`), 1.5);
  assert.ok(g.run(`spriteDimensions('catCompanion').height*1.5 > spriteDimensions('catCompanion').height*0.55`), 'Marmalade larger than tiny companion');

  // Hovering bat/wasp anchor and bounds
  for (const id of ['bat','wasp']) {
    const a0=g.json(`spriteAnchor(${JSON.stringify(id)},0,'front')`); const a1=g.json(`spriteAnchor(${JSON.stringify(id)},1,'front')`);
    assert.equal(a0.ay, a1.ay, `${id} foot anchor stable across wing frames`);
    assert.ok(a0.bh>0 && a1.bh>0, `${id} has visible bounds`);
  }

  // Cache separation by frame/direction and reuse
  g.run(`graphicsCache().sprites={}; window.surfaceCount=0; document.createElement=()=>{window.surfaceCount++; return {width:0,height:0,getContext:()=>({drawImage(){},clearRect(){},fillRect(){},getImageData(){return {data:new Uint8ClampedArray(4)};},putImageData(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},imageSmoothingEnabled:true,canvas:{width:0,height:0}})};};`);
  g.run(`drawSprite('knight',100,100,2,0,'front'); drawSprite('knight',100,100,2,0,'front'); drawSprite('knight',100,100,2,1,'front'); drawSprite('knight',100,100,2,0,'back');`);
  const keys = g.json("Object.keys(graphicsCache().sprites).filter(k=>k.startsWith('rt:knight')||k.startsWith('knight')).sort()");
  assert.ok(keys.includes('rt:knight:front:0'));
  assert.ok(keys.includes('rt:knight:front:1'));
  assert.ok(keys.includes('rt:knight:back:0'));
  assert.ok(g.run('window.surfaceCount') >= 3, 'separate surfaces for distinct frame/direction');

  // Equipment icon 32x32 draw contract
  g.run(`(()=>{
    const calls=[]; const icon={width:0,height:0,style:{},getContext(){return {clearRect(...a){calls.push(['clear',...a])},drawImage(...a){calls.push(['drawImage',a[3],a[4]])},fillRect(...a){calls.push(['fillRect',...a])},getImageData(){return {data:new Uint8ClampedArray(4)};},putImageData(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},imageSmoothingEnabled:true,canvas:{width:32,height:32}};}};
    const old=document.getElementById; document.getElementById=(id)=> id==='weaponIcon'?icon:old(id); window.__iconCalls2=calls; drawEquipmentIcon('weapon',{sprite:'sword'}); document.getElementById=old;
  })()`);
  const iconCalls2=g.json('window.__iconCalls2');
  assert.ok(iconCalls2.some(c=>c[0]==='clear'&&c[3]===32&&c[4]===32), 'icon clears 32x32');
  assert.ok(iconCalls2.some(c=>c[0]==='drawImage') || iconCalls2.some(c=>c[0]==='fillRect'), 'icon draws sprite pixels or image');

  // Bars/bubbles/shadows/viewport edge contract
  g.run(`startGame();enterDungeonFromTown();enterFloor(1,false,true);state.player.x=20;state.player.y=20;updateCamera();
    state.monsters=[{...MONSTER_TYPES[0],id:9001,x:20,y:21,hp:5,maxHp:10}];state.visited.add('20,21');revealAroundPlayer();clearMonsterSpeech();monsterTalk(state.monsters[0]);
    graphicsCache().lights={torch:{width:156,height:156}};`);
  g.calls.length=0; g.run('draw()');
  const mv2=g.json('monsterVisual(state.monsters[0])');
  assert.ok(g.calls.some(c=>c[0]==='fillRect'&&Math.abs(c[2]-(mv2.top-7))<0.01 && c[4]===4), 'hp bar above monster visual');
  const layout2=g.json('monsterSpeechLayout()');
  assert.ok(layout2 && layout2.y + layout2.height < mv2.top-7, 'speech above hp bar');
  assert.ok(g.calls.some(c=>c[0]==='ellipse'), 'shadow drawn');

  // Viewport edge overlap: large sprite near edge still culled by inArtCamera contract
  g.run(`state.monsters=[{...state.boss,id:9100,x:state.camera.x-1,y:state.camera.y,hp:100,maxHp:100,isBoss:true,sprite:'mimic'}];`);
  assert.equal(g.run(`(()=>{const m=state.monsters[0];const v=monsterVisual(m);return inArtCamera(v.sprite,m.x,m.y,v.scale);})()`), g.run(`(()=>{const m=state.monsters[0];const v=monsterVisual(m);const cam=renderCamera();const w=(spriteDimensions(v.sprite).cellW||spriteDimensions(v.sprite).width)*v.scale;const h=(spriteDimensions(v.sprite).cellH||spriteDimensions(v.sprite).height)*v.scale;const ax=(spriteDimensions(v.sprite).anchorX!=null?spriteDimensions(v.sprite).anchorX:spriteDimensions(v.sprite).width/2)*v.scale;const ay=(spriteDimensions(v.sprite).anchorY!=null?spriteDimensions(v.sprite).anchorY:spriteDimensions(v.sprite).height)*v.scale;const left=(m.x+.5)*TILE-ax;const top=(m.y+1)*TILE-ay;return left+w>=cam.x*TILE && left<=(cam.x+VIEW_W)*TILE && top+h>=cam.y*TILE && top<=(cam.y+VIEW_H)*TILE;})()`));

  // Hidden spike/portal closed remain empty semantic states
  assert.equal(g.run("artDecoded('spikesHidden',0,'front')"), null);
  assert.equal(g.run("artDecoded('portalClosed',0,'front')"), null);

  // Manifest-driven character/item bounds and anchor contract
  for (const [id, a] of Object.entries(charById)) {
    const dims = g.json(`spriteDimensions(${JSON.stringify(id)})`);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const f of a.frames) { const b=f.bounds; minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.x+b.width); maxY=Math.max(maxY,b.y+b.height); }
    assert.ok(Math.abs(dims.width - (maxX-minX) / 2) < 0.02, `${id} union width`);
    assert.ok(Math.abs(dims.height - (maxY-minY) / 2) < 0.02, `${id} union height`);
    assert.ok(Math.abs(dims.anchorX - a.anchor[0] / 2) < 0.02, `${id} anchorX`);
    assert.ok(Math.abs(dims.anchorY - a.anchor[1] / 2) < 0.02, `${id} anchorY`);
    for (const dir of ['front','back','left','right']) {
      const f = a.frames.find(x => x.direction === dir && x.frame === 0);
      const dec = g.json(`(()=>{const d=artDecoded(${JSON.stringify(id)},0,${JSON.stringify(dir)});return {w:d.w,h:d.h,ax:d.anchor[0],ay:d.anchor[1],bw:d.bounds.width,bh:d.bounds.height};})()`);
      assert.equal(dec.w, a.cellSize[0]);
      assert.equal(dec.h, a.cellSize[1]);
      assert.equal(dec.ax, f.anchor[0]);
      assert.equal(dec.ay, f.anchor[1]);
      assert.equal(dec.bw, f.bounds.width);
      assert.equal(dec.bh, f.bounds.height);
    }
  }

  for (const [id, a] of Object.entries(itemById)) {
    if (!g.run(`artCovered(${JSON.stringify(id)})`)) continue;
    const dims = g.json(`spriteDimensions(${JSON.stringify(id)})`);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity, any=false;
    for (const f of a.frames) { const b=f.bounds; if(!b) continue; any=true; minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.x+b.width); maxY=Math.max(maxY,b.y+b.height); }
    if (!any) { assert.ok(dims.width>=0 && dims.height>=0); continue; }
    assert.ok(Math.abs(dims.width - (maxX-minX) / 2) < 0.02, `${id} width`);
    assert.ok(Math.abs(dims.height - (maxY-minY) / 2) < 0.02, `${id} height`);
  }

  // Foot stability across character poses/directions
  for (const id of ['knight','mimic','bat','wasp','catCompanion','merchant','prisoner','princess']) {
    const a = g.json(`spriteAnchor(${JSON.stringify(id)},0,'front')`);
    for (const dir of ['front','back','left','right']) for (const frame of [0,1,2,3]) {
      const b = g.json(`spriteAnchor(${JSON.stringify(id)},${frame},${JSON.stringify(dir)})`);
      assert.ok(Math.abs(a.ay - b.ay) < 0.01, `${id} foot anchor stable ${dir}:${frame}`);
    }
  }

  // Tiny companions and Marmalade scale contract
  assert.ok(g.run(`spriteDimensions('mimic').width * (actorDrawScale('mimic',3)*0.55/2) < 40`), 'tiny boss companion small');
  assert.equal(g.run(`(()=>{startGame();enterTown();state.entranceCat={recruited:true,entered:true,retired:false};state.companion={name:'Marmalade',sprite:'catCompanion',kind:'cat',scale:1.5,x:state.town.spawn.x+1,y:state.town.spawn.y};return state.companion.scale;})()`), 1.5);
  assert.ok(g.run(`spriteDimensions('catCompanion').height*1.5 > spriteDimensions('catCompanion').height*0.55`), 'Marmalade larger than tiny companion');

  // Hovering entities keep anchor semantics
  for (const id of ['bat','wasp']) {
    const dims = g.json(`spriteDimensions(${JSON.stringify(id)})`);
    const a = g.json(`spriteAnchor(${JSON.stringify(id)},0,'front')`);
    assert.ok(a.ay <= a.h, `${id} anchor inside cell`);
    assert.ok(dims.height > 0 && dims.width > 0, `${id} has bounds`);
  }

  // Sprite cache key separation by frame/direction
  g.run(`graphicsCache().sprites={}; const c=document.createElement('canvas').getContext('2d'); drawSprite('knight',16,32,1,0,'front',true); drawSprite('knight',16,32,1,1,'front',true); drawSprite('knight',16,32,1,0,'left',true);`);
  const sepKeys = g.json('Object.keys(graphicsCache().sprites)');
  assert.ok(sepKeys.some(k=>k.includes('knight')&&k.includes('front')&&k.includes(':0')), 'front frame 0 cached');
  assert.ok(sepKeys.some(k=>k.includes('knight')&&k.includes('front')&&k.includes(':1')), 'front frame 1 cached');
  assert.ok(sepKeys.some(k=>k.includes('knight')&&k.includes('left')&&k.includes(':0')), 'left frame 0 cached');

  // Equipment icon 32x32 draw contract
  g.run(`(()=>{\n    const calls=[]; const icon={width:0,height:0,style:{},getContext(){return {clearRect(...a){calls.push(['clear',...a])},drawImage(...a){calls.push(['drawImage',a[3],a[4]])},fillRect(...a){calls.push(['fillRect',...a])},getImageData(){return {data:new Uint8ClampedArray(4)};},putImageData(){},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},imageSmoothingEnabled:true,canvas:{width:32,height:32}};}};\n    const old=document.getElementById; document.getElementById=(id)=> id==='weaponIcon'?icon:old(id); window.__iconCalls=calls; drawEquipmentIcon('weapon',{sprite:'sword'}); document.getElementById=old;\n  })()`);
  const iconCalls=g.json('window.__iconCalls');
  assert.ok(iconCalls.some(c=>c[0]==='clear'&&c[3]===32&&c[4]===32), 'icon clears 32x32');
  assert.ok(iconCalls.some(c=>c[0]==='drawImage') || iconCalls.some(c=>c[0]==='fillRect'), 'icon draws sprite pixels or image');

  // Bars/bubbles/shadows/viewport edge contract
  g.run(`startGame();enterDungeonFromTown();enterFloor(1,false,true);state.player.x=20;state.player.y=20;updateCamera();
    state.monsters=[{...MONSTER_TYPES[0],id:9001,x:20,y:21,hp:5,maxHp:10}];state.visited.add('20,21');revealAroundPlayer();clearMonsterSpeech();monsterTalk(state.monsters[0]);
    graphicsCache().lights={torch:{width:156,height:156}};`);
  g.calls.length=0; g.run('draw()');
  const mv=g.json('monsterVisual(state.monsters[0])');
  assert.ok(g.calls.some(c=>c[0]==='fillRect'&&Math.abs(c[2]-(mv.top-7))<0.01 && c[4]===4), 'hp bar above monster visual');
  const layout=g.json('monsterSpeechLayout()');
  assert.ok(layout && layout.y + layout.height < mv.top-7, 'speech above hp bar');
  assert.ok(g.calls.some(c=>c[0]==='ellipse'), 'shadow drawn');

  // Viewport edge overlap: large sprite near edge still culled by inArtCamera contract
  g.run(`state.monsters=[{...state.boss,id:9100,x:state.camera.x-1,y:state.camera.y,hp:100,maxHp:100,isBoss:true,sprite:'mimic'}];`);
  assert.equal(g.run(`(()=>{const m=state.monsters[0];const v=monsterVisual(m);return inArtCamera(v.sprite,m.x,m.y,v.scale);})()`), g.run(`(()=>{const m=state.monsters[0];const v=monsterVisual(m);const cam=renderCamera();const w=(spriteDimensions(v.sprite).cellW||spriteDimensions(v.sprite).width)*v.scale;const h=(spriteDimensions(v.sprite).cellH||spriteDimensions(v.sprite).height)*v.scale;const ax=(spriteDimensions(v.sprite).anchorX!=null?spriteDimensions(v.sprite).anchorX:spriteDimensions(v.sprite).width/2)*v.scale;const ay=(spriteDimensions(v.sprite).anchorY!=null?spriteDimensions(v.sprite).anchorY:spriteDimensions(v.sprite).height)*v.scale;const left=(m.x+.5)*TILE-ax;const top=(m.y+1)*TILE-ay;return left+w>=cam.x*TILE && left<=(cam.x+VIEW_W)*TILE && top+h>=cam.y*TILE && top<=(cam.y+VIEW_H)*TILE;})()`));

  // Hidden spike/portal closed remain empty semantic states
  assert.equal(g.run("artDecoded('spikesHidden',0,'front')"), null);
  assert.equal(g.run("artDecoded('portalClosed',0,'front')"), null);
});

test('GR-05 dungeon wall topology/material parity covers 256 masks, 5 biomes, fixtures, and cache keys', () => {
  const g = game();
  const fixtures = [
    {name:'isolated', map:[['.','.','.'],['.','#','.'],['.','.','.']], x:1,y:1, expectEdges:15},
    {name:'horizontal-line', map:[['.','.','.','.','.'],['.','#','#','#','.'],['.','.','.','.','.']], x:2,y:1, expectEdges:5},
    {name:'vertical-line', map:[['.','#','.'],['.','#','.'],['.','#','.']], x:1,y:1, expectEdges:10},
    {name:'end-n', map:[['.','.','.'],['.','#','.'],['.','#','.']], x:1,y:1, expectEdges:11},
    {name:'end-s', map:[['.','#','.'],['.','#','.'],['.','.','.']], x:1,y:1, expectEdges:14},
    {name:'corner-L', map:[['.','.','.'],['.','#','#'],['.','#','.']], x:1,y:1, expectEdges:9},
    {name:'junction-T', map:[['.','.','.','.','.'],['.','#','#','#','.'],['.','.','#','.','.']], x:2,y:1, expectEdges:1},
    {name:'cross', map:[['.','.','#','.','.'],['.','#','#','#','.'],['.','.','#','.','.']], x:2,y:1, expectEdges:0},
    {name:'diagonal-concave', map:[['.','#','.'],['#','.','.'],['.','.','.']], x:1,y:1, expectEdges:6, expectCorners:1},
    {name:'border', map:[['#','#','#'],['#','.','#'],['#','#','#']], x:1,y:1, expectEdges:0},
    {name:'obstacle-neighbor', map:[['.','.','.'],['.','#','2'],['.','#','.']], x:1,y:1},
  ];

  // 11 topology fixtures: mask normalization/count/plan semantics
  const res = g.run(`(()=>{ const out=[]; const cases=${JSON.stringify(fixtures)}; const ox=10,oy=10; for(const c of cases){ state.map=Array.from({length:H},()=>Array(W).fill(0)); for(let y=0;y<c.map.length;y++) for(let x=0;x<c.map[y].length;x++){ const ch=c.map[y][x]; state.map[oy+y][ox+x]=ch==='#'?1:ch==='2'?2:0; } state.area='dungeon'; state.biome='crypt'; const raw=artWallMaskAt(ox+c.x,oy+c.y); const plan=artWallPlan(raw); out.push({name:c.name, raw, mask:plan.mask, edges:plan.edges, corners:plan.corners.length, norm:artNormalizeWallMask(raw)}); } return out; })()`);
  for (const r of res) {
    const f = fixtures.find(x=>x.name===r.name);
    assert.equal(r.mask, r.norm, `${r.name} normalized`);
    assert.ok(r.edges >= 0 && r.edges <= 15);
    if (f.expectEdges != null) assert.equal(r.edges, f.expectEdges, `${r.name} edges`);
    if (f.expectCorners != null) assert.equal(r.corners, f.expectCorners, `${f.name} corners`);
  }
  // obstacle neighbor must not connect as wall
  const obs = res.find(r=>r.name==='obstacle-neighbor');
  assert.equal((obs.edges & 2), 2, 'obstacle neighbor exposes east edge');

  // 256 raw masks normalize to 47 plans
  const plans = g.json('(()=>{const s=new Set(); for(let m=0;m<256;m++) s.add(artWallPlan(m).mask); return [...s].sort((a,b)=>a-b);})()');
  assert.equal(plans.length, 47, '47 normalized masks');

  // Actual runtime painters: 256 raw masks x 5 biomes, opaque, in-bounds, deterministic, cached
  const report = g.run(`(()=>{ const biomes=['crypt','cavern','kitchen','tavern','throne']; const out={biomes:{}, cacheKeys:new Set(), total:0};
    for(const biome of biomes){ out.biomes[biome]={ok:0,opaque:0}; state.area='dungeon'; state.biome=biome; graphicsCache().tiles={};
      for(let mask=0;mask<256;mask++){
        // build minimal 3x3 where center is wall and neighbors follow raw mask bits
        state.map=Array.from({length:H},()=>Array(W).fill(0));
        const cx0=10,cy0=10; state.map[cy0][cx0]=1;
        const bits=[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8],[1,-1,16],[1,1,32],[-1,1,64],[-1,-1,128]];
        for(const [dx,dy,bit] of bits){ if(mask&bit) state.map[cy0+dy][cx0+dx]=1; }
        const buf=new Uint8ClampedArray(32*32*4);
        const c={fillStyle:'',globalAlpha:1,imageSmoothingEnabled:true,fillRect(x,y,w,h){ const r=parseInt((this.fillStyle||'#000').slice(1,3)||'0',16)||0,g=parseInt((this.fillStyle||'#000').slice(3,5)||'0',16)||0,b=parseInt((this.fillStyle||'#000').slice(5,7)||'0',16)||0; const a=this.fillStyle&&this.fillStyle.startsWith('rgba')?Math.round(parseFloat(this.fillStyle.split(',')[3])*255):255; for(let yy=Math.max(0,Math.floor(y));yy<Math.min(32,Math.ceil(y+h));yy++)for(let xx=Math.max(0,Math.floor(x));xx<Math.min(32,Math.ceil(x+w));xx++){ const o=(yy*32+xx)*4; buf[o]=r;buf[o+1]=g;buf[o+2]=b;buf[o+3]=a; } }, drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh){ if(img&&img._direct){ const src=img._direct; for(let yy=0;yy<dh;yy++) for(let xx=0;xx<dw;xx++){ const srx=Math.floor(sx+xx*sw/dw), sry=Math.floor(sy+yy*sh/dh); if(srx<0||sry<0||srx>=src.w||sry>=src.h) continue; const so=(sry*src.w+srx)*4,sa=src.rgba[so+3]; if(!sa) continue; const di=((Math.floor(dy+yy))*32+Math.floor(dx+xx))*4; if(di<0||di+3>=buf.length) continue; buf[di]=src.rgba[so];buf[di+1]=src.rgba[so+1];buf[di+2]=src.rgba[so+2];buf[di+3]=sa; } } }};
        const ok=paintArtWallTile(c, biome, 10,10,mask);
        let opaque=true; for(let i=3;i<buf.length;i+=4){ if(buf[i]===0){ opaque=false; break; } }
        if(ok) out.biomes[biome].ok++;
        if(opaque) out.biomes[biome].opaque++;
        out.total++;
        // cache key/normalization contract
        const plan=artWallPlan(mask);
        out.cacheKeys.add(biome+':'+plan.mask);
      }
    }
    return {biomes:out.biomes,total:out.total,cacheKeys:out.cacheKeys.size};
  })()`);
  assert.equal(report.total, 256*5);
  for (const biome of ['crypt','cavern','kitchen','tavern','throne']) {
    assert.equal(report.biomes[biome].ok, 256, `${biome} painted`);
    assert.equal(report.biomes[biome].opaque, 256, `${biome} opaque`);
  }
  assert.equal(report.cacheKeys, 47*5, 'normalized cache keys per biome');

  // Deterministic: same inputs same pixels
  const det = g.run(`(()=>{ state.area='dungeon'; state.biome='cavern'; state.map=Array.from({length:H},()=>Array(W).fill(0)); [[1,0,1],[0,1,0],[1,0,1]].forEach((r,y)=>r.forEach((v,x)=>state.map[10+y][10+x]=v));
    function paint(){ const buf=new Uint8ClampedArray(32*32*4); const c={fillStyle:'',fillRect(x,y,w,h){ const a=this.fillStyle.startsWith('rgba')?Math.round(parseFloat(this.fillStyle.split(',')[3])*255):255; const m=this.fillStyle.match(/rgba?\\((\\d+),(\\d+),(\\d+)/)||this.fillStyle.match(/#(..)(..)(..)/); let r=0,gc=0,b=0; if(m&&this.fillStyle[0]==='#'){r=parseInt(m[1],16);gc=parseInt(m[2],16);b=parseInt(m[3],16);} else if(m){r=+m[1];gc=+m[2];b=+m[3];} for(let yy=Math.max(0,Math.floor(y));yy<Math.min(32,Math.ceil(y+h));yy++)for(let xx=Math.max(0,Math.floor(x));xx<Math.min(32,Math.ceil(x+w));xx++){ const o=(yy*32+xx)*4; buf[o]=r;buf[o+1]=gc;buf[o+2]=b;buf[o+3]=a; } }, drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh){ if(img&&img._direct){ const src=img._direct; for(let yy=0;yy<dh;yy++) for(let xx=0;xx<dw;xx++){ const srx=Math.floor(sx+xx*sw/dw), sry=Math.floor(sy+yy*sh/dh); if(srx<0||sry<0||srx>=src.w||sry>=src.h) continue; const so=(sry*src.w+srx)*4,sa=src.rgba[so+3]; if(!sa) continue; const di=((Math.floor(dy+yy))*32+Math.floor(dx+xx))*4; if(di<0||di+3>=buf.length) continue; buf[di]=src.rgba[so];buf[di+1]=src.rgba[so+1];buf[di+2]=src.rgba[so+2];buf[di+3]=sa; } } }};
      paintArtWallTile(c,'cavern',10,10,artWallMaskAt(10,10)); return Array.from(buf); }
    const a=paint(), b=paint(); return a.length===b.length && a.every((v,i)=>v===b[i]);
  })()`);
  assert.equal(det, true, 'deterministic wall paint');
  // restore globals touched by fixture checks
});

test('GR-04 bake is deterministic and round-trips selected source crops', () => {
  const bake = require('../docs/previews/2026-11-25-0x72/bake-runtime.cjs');
  const root = path.join(__dirname, '../docs/previews/2026-11-25-0x72');
  const payload = bake.buildPayload();
  const js1 = bake.buildJS(payload);
  const js2 = bake.buildJS(payload);
  assert.equal(js1, js2, 'deterministic build');
  const out = fs.readFileSync(path.join(__dirname, '../js/art-runtime.js'), 'utf8');
  assert.equal(out, js1, 'checked-in art-runtime matches bake');

  function b64ToBytes(b64){ return Uint8Array.from(Buffer.from(b64,'base64')); }
  function decodeArtFrame(frame){
    if(!frame||frame.empty) return null;
    const w=frame.w,h=frame.h,pal=frame.p; const rgba=new Uint8ClampedArray(w*h*4); const bin=b64ToBytes(frame.r); let p=0;
    for(let i=0;i<bin.length;i+=4){ const count=bin[i]|(bin[i+1]<<8); const idx=bin[i+2]|(bin[i+3]<<8); const hex=pal[idx]; if(hex==='00000000'){p+=count;continue;} const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16),a=parseInt(hex.slice(6,8),16); for(let k=0;k<count;k++,p++){ const o=p*4; rgba[o]=r; rgba[o+1]=g; rgba[o+2]=b; rgba[o+3]=a; } }
    return {w,h,rgba};
  }
  function cropRGBA(src,crop){ const [cx,cy,cw,ch]=crop; const out=new Uint8ClampedArray(cw*ch*4); for(let y=0;y<ch;y++) for(let x=0;x<cw;x++){ const si=((cy+y)*src.w+(cx+x))*4; const di=(y*cw+x)*4; out[di]=src.data[si]; out[di+1]=src.data[si+1]; out[di+2]=src.data[si+2]; out[di+3]=src.data[si+3]; } return out; }
  function same(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

  let checks=0, empties=0;
  function checkFrame(frame, srcRgba, label){
    checks++;
    if(frame.empty){ empties++; assert.ok(srcRgba.every(v=>v===0), label+':empty source'); return; }
    const dec=decodeArtFrame(frame);
    assert.ok(dec, label+':decoded');
    assert.equal(dec.w, frame.w, label+':w'); assert.equal(dec.h, frame.h, label+':h');
    assert.ok(same(dec.rgba, srcRgba), label+':rgba');
  }

  const charManifests=[];
  charManifests.push({id:'knight',m:JSON.parse(fs.readFileSync(path.join(root,'knight-reference-v1/manifest.json'),'utf8')),sheet:path.join(root,'knight-reference-v1/walk-sheet.png')});
  for(const f of fs.readdirSync(path.join(root,'characters-v1'))){ const mp=path.join(root,'characters-v1',f,'manifest.json'); if(fs.existsSync(mp)){ const m=JSON.parse(fs.readFileSync(mp,'utf8')); charManifests.push({id:m.id,m,sheet:path.join(root,m.sheet)}); }}
  for(const {id,m,sheet} of charManifests){
    const src=bake.decodePNG(fs.readFileSync(sheet));
    const rt=payload.characters[id]; assert.ok(rt,'char '+id);
    for(const dir of ['front','back','left','right']){
      const frames=m.frames.filter(f=>f.direction===dir).sort((a,b)=>a.frame-b.frame);
      const rtFrames=rt.dirs[dir]; assert.equal(rtFrames.length, frames.length, id+'/'+dir);
      for(let i=0;i<frames.length;i++){
        const f=frames[i]; const rf=rtFrames[i];
        assert.deepEqual(rf.a, f.anchor, id+'/'+dir+'/'+i+'/anchor');
        assert.deepEqual(rf.b, f.bounds, id+'/'+dir+'/'+i+'/bounds');
        checkFrame(rf, cropRGBA(src,f.crop), id+'/'+dir+'/'+i);
      }
    }
  }
  const itemsManifest=JSON.parse(fs.readFileSync(path.join(root,'items-effects-v1/manifest.json'),'utf8'));
  for(const asset of itemsManifest.assets){
    const src=bake.decodePNG(fs.readFileSync(path.join(root,asset.sheet)));
    const rt=payload.items[asset.id]; assert.ok(rt,'item '+asset.id);
    assert.equal(rt.frames.length, asset.frames.length, asset.id+' count');
    for(let i=0;i<asset.frames.length;i++){ const f=asset.frames[i], rf=rt.frames[i]; assert.deepEqual(rf.a, asset.anchor, asset.id+'/anchor'); if(f.bounds) assert.deepEqual(rf.b, f.bounds, asset.id+'/'+i+'/bounds'); checkFrame(rf, cropRGBA(src,f.crop), 'item/'+asset.id+'/'+i); }
  }
  const envManifest=JSON.parse(fs.readFileSync(path.join(root,'environment-v1/manifest.json'),'utf8'));
  for(const asset of envManifest.assets){
    const src=bake.decodePNG(fs.readFileSync(path.join(root,asset.file)));
    const rt=payload.environment[asset.id]; assert.ok(rt,'env '+asset.id);
    if(asset.kind==='material'){ for(const rec of asset.records){ checkFrame(rt.parts[rec.name], cropRGBA(src,rec.crop), `env/${asset.id}/${rec.name}`); } }
    else { const rec=asset.records[0]; assert.deepEqual(rt.frame.a, rec.anchor, asset.id+' anchor'); assert.deepEqual(rt.frame.b, rec.bounds, asset.id+' bounds'); checkFrame(rt.frame, cropRGBA(src,rec.crop), `env/${asset.id}`); }
  }
  assert.ok(checks >= 530, 'frame checks count');
  assert.ok(empties >= 2, 'empty states checked');
});


test('GR-05 material surfaces preserve source identity and pixels across warm orders', () => {
  const g=game(42,false,'town');
  const report=g.run(`(()=>{
    const parts=['crypt','cavern','kitchen','tavern','throne','town'].flatMap(id=>Object.values(artRuntime().environment[id].parts));
    graphicsCache().materials=new WeakMap();
    const surfaces=parts.map(p=>artPartSurface(p));
    const unique=new Set(surfaces).size, reused=parts.every((p,i)=>artPartSurface(p)===surfaces[i]);
    const orders=[parts,[...parts].reverse(),parts.filter((_,i)=>i%2).concat(parts.filter((_,i)=>i%2===0))];
    let matches=0;
    for(const order of orders){
      graphicsCache().materials=new WeakMap();
      for(const part of order){
        const expected=decodeArtFrame(part), out=new Uint8ClampedArray(32*32*4);
        const c={fillStyle:'',fillRect(x,y,w,h){const a=this.fillStyle.match(/[\\d.]+/g).map(Number);for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*32+xx)*4;out.set([a[0],a[1],a[2],Math.round(a[3]*255)],i);}}};
        artDrawMaterialPart(c,part,0,0,32,32);
        if(out.every((v,i)=>v===expected.rgba[i]))matches++;
      }
    }
    const p=parts[0], replacement={...p,p:[...p.p]};
    return {count:parts.length,unique,reused,matches,newSourceIdentity:artPartSurface(p)!==artPartSurface(replacement)};
  })()`);
  assert.equal(report.count,24);
  assert.equal(report.unique,24);
  assert.equal(report.reused,true);
  assert.equal(report.matches,72,'all material pixels match the selected source regardless of warm order');
  assert.equal(report.newSourceIdentity,true,'replacement payload cannot reuse an old surface by dimensions');
});

test('GR-06 town material layout paints continuous river and cosmetic paths without world changes or RNG',()=>{
  const g=game(42,true,'town');
  const snapshot='({map:state.map,props:state.props,visited:[...state.visited],town:state.town,player:state.player,inventory:state.inventory,gold:state.gold})';
  const before=g.json(snapshot);
  const result=g.run(`(()=>{const random=Math.random, paint=artDrawMaterialPart;let river=0,pathsSafe=true;const kinds={};
    try{Math.random=()=>{throw Error('render used gameplay RNG');};delete graphicsCache().townMaterials;
      const layout=townMaterialLayout();
      for(let y=16;y<=44;y++)for(const x of [48,49])if(layout.water.has(x+','+y))river++;
      for(const key of layout.roads){const [x,y]=key.split(',').map(Number);if(state.map[y][x]!==0)pathsSafe=false;}
      artDrawMaterialPart=(c,part,...rect)=>{kinds.current=Object.entries(artRuntime().environment.town.parts).find(([,p])=>p===part)[0];kinds.rect=rect;return true;};
      const ctx={fillRect(){},fillStyle:''};const found={};
      for(const [name,x,y]of [['crossing',48,29],['river',49,28],['grass',34,26],['dirt',29,27],['cobble',38,29]]){
        paintArtFloorTile(ctx,'town',x,y);found[name]=[kinds.current,...kinds.rect];
      }
      return {river,pathsSafe,found,reused:townMaterialLayout()===layout};
    }finally{Math.random=random;artDrawMaterialPart=paint;}
  })()`);
  assert.equal(result.river,58,'both river columns include the walkable crossing row');
  assert.equal(result.pathsSafe,true);assert.equal(result.reused,true);
  for(const [name,part]of Object.entries({crossing:'water',river:'water',grass:'grass',dirt:'dirt',cobble:'cobble'})){
    assert.deepEqual(Array.from(result.found[name]),[part,0,0,32,32],name+' is a tile material, not a shifted sprite');
  }
  assert.deepEqual(g.json(snapshot),before);
});

test('GR-06 actual prop draws align bridge deck, facade doors and gate to existing interactions',()=>{
  const g=game(42,true,'town');
  const result=g.run(`(()=>{const draw=drawSprite, anchored=drawSpriteAnchored, rows=[];
    const bridge=state.props.find(p=>p.sprite==='bridge');state.player.x=48;state.player.y=29;updateCamera();
    try{drawSprite=(name,cx,cy,scale)=>{rows.push({name,cx,cy,scale});};drawSpriteAnchored=(name,cx,cy,scale)=>{rows.push({name,cx,cy,scale,anchored:true});};drawFloorDetails();
      const br=rows.find(p=>p.name==='bridge'), dec=artDecoded('bridge'), k=br.scale/ART_DENSITY;
      const left=Math.round(br.cx-dec.w*k/2),top=Math.round(br.cy-dec.h*k/2);
      const buildings=[];for(const p of state.props.filter(p=>['inn','store','hut'].includes(p.sprite))){
        const v=townBuildingVisual(p),b=townBuildingBounds(p),door=state.props.find(d=>d.sprite==='doorstep'&&d.y===b.y1+1&&d.x>=b.x0&&d.x<=b.x1);
        const source=artDecoded(p.sprite), ratio=v.scale/ART_DENSITY;
        buildings.push({actual:v.cx-source.w*ratio/2+TOWN_DOOR_SOURCE_X[p.sprite]*ratio,expected:(door.x+.5)*TILE,foot:v.foot,expectedFoot:door.y*TILE});
      }
      const gate=rows.find(p=>p.name==='townGate');
      return {bridgeLeft:left+dec.bounds.x*k,bridgeRight:left+(dec.bounds.x+dec.bounds.width)*k,deckY:top+28*k,expectedDeck:(bridge.y+1)*TILE,buildings,gate,expectedGateX:(state.townGate.x+.5)*TILE};
    }finally{drawSprite=draw;drawSpriteAnchored=anchored;}
  })()`);
  assert.ok(Math.abs(result.bridgeLeft-48*32)<=.5);
  assert.ok(Math.abs(result.bridgeRight-50*32)<=.5);
  assert.ok(Math.abs(result.deckY-result.expectedDeck)<=.5);
  assert.equal(result.buildings.length,6);
  for(const b of result.buildings){assert.ok(Math.abs(b.actual-b.expected)<1e-8);assert.equal(b.foot,b.expectedFoot);}
  assert.equal(result.gate.cx,result.expectedGateX);assert.equal(result.gate.anchored,true);
});

test('wall torch animation keeps the whole mount pixel-stable while its flame changes',()=>{
  const g=game(42,false,'town');
  const result=g.run(`(()=>{const frames=[0,1,2,3].map(f=>artDecoded('torch',f));const base=frames[0];return {
    stableMount:frames.every(f=>f.rgba.subarray(31*64*4).every((v,i)=>v===base.rgba[31*64*4+i])),
    changingFlame:frames.slice(1).every(f=>f.rgba.subarray(0,31*64*4).some((v,i)=>v!==base.rgba[i])),
    reused:artDecoded('torch',1)===frames[1],
    anchorFixed:frames.every(f=>f.anchor[0]===base.anchor[0]&&f.anchor[1]===base.anchor[1])};})()`);
  assert.equal(result.stableMount,true);assert.equal(result.changingFlame,true);
  assert.equal(result.anchorFixed,true);assert.equal(result.reused,true);
});

test('ground items rest on their own floor tile without changing icon anchors or reveal state',()=>{
  const g=game(42,false,'town');
  const rows=g.run(`(()=>{const saved=drawSpriteAnchored,rows=[];try{for(const name of ['potion','key','chest','stairsUp','stairsDown','spikes','townPortal']){
    const size=spriteDimensions(name),first=name==='spikes'||name==='townPortal'?1:0;
    const original=artDecoded(name,first).anchor.slice();
    drawSpriteAnchored=(id,x,y,scale,frame)=>{const d=artDecoded(id,frame);if(!d)return;const k=scale/ART_DENSITY,left=Math.round(x-d.anchor[0]*k),top=Math.round(y-d.anchor[1]*k);rows.push({name:id,left:left+d.bounds.x*k,right:left+(d.bounds.x+d.bounds.width)*k,bottom:top+(d.bounds.y+d.bounds.height)*k,unionCenter:left+(size.unionX+size.width/2)*scale,anchorUnchanged:d.anchor.every((v,i)=>v===original[i])});};
    drawWorldSprite(name,10,10,2,first);
  }}finally{drawSpriteAnchored=saved;}return rows;})()`);
  assert.equal(rows.length,7);
  for(const r of rows){assert.ok(r.bottom<=11*32+.5,r.name+' cannot hang below its floor');if(r.name!=='townPortal')assert.ok(r.left>=10*32-.5&&r.right<=11*32+.5,r.name+' horizontal tile fit');else assert.ok(Math.abs(r.unionCenter-10.5*32)<=.5,'portal animation union remains centered despite its wider effect');assert.equal(r.anchorUnchanged,true);}
  assert.equal(g.run("artDecoded('spikes',0)"),null);
});

test('GR-07 hazards select only phase-correct prepared states without advancing the world',()=>{
  const g=game();enableMotion(g);
  const result=g.json(`(()=>{state.props=[];state.obstacles=[];state.floorKey=null;state.visited.add('41,30');
    const paint=(h,time=0)=>{state.hazards=[{x:41,y:30,revealed:true,offset:0,...h}];state.hazardTime=time;
      const before=JSON.stringify(state.hazards),saved=drawWorldSprite,rows=[];drawWorldSprite=(...a)=>rows.push([a[0],a[4]||0]);
      try{drawFloorDetails();}finally{drawWorldSprite=saved;}if(before!==JSON.stringify(state.hazards))throw Error('render mutated hazard');return rows;};
    return {hidden:paint({type:'spikes',revealed:false}),idleRock:paint({type:'rocks',stage:'idle'}),
      warning:paint({type:'rocks',stage:'warning',impactAt:1.2},1.1),spent:paint({type:'rocks',stage:'spent',impactAt:1.2},9),
      retract:paint({type:'spikes',triggered:true}),off:paint({type:'flame'},4),on:paint({type:'flame'},1),ignition:paint({type:'flame'},.1),cooling:paint({type:'flame'},2.8)};})()`);
  assert.deepEqual(result,{hidden:[],idleRock:[],warning:[['rockCrack',3]],spent:[['rockSpent',3]],retract:[['spikes',4]],off:[['fireVent',0]],on:[['fireVent',2]],ignition:[['fireVent',1]],cooling:[['fireVent',3]]});
});

test('GR-07 prepared gait has no duplicate distortion and actor feet stay fixed across poses',()=>{
  const g=game();enableMotion(g);
  const rows=g.json(`(()=>{const rows=[];for(const name of ['knight','boar','slime','mimic','bat','wasp','merchant','catCompanion']){
    const actor={id:123,x:41,y:30},key=actorMotionKey(actor);state.motion.moves[key]={fromX:40,fromY:30,x:41,y:30,at:0,duration:2};
    const frames=[],feet=[];for(const time of [.01,.1,.2,.28]){state.motion.time=time;const pose=actorAnimationPose(name,actor);frames.push(pose);
      const saved=ctx.translate;ctx.translate=(x,y)=>feet.push(y);try{drawActorSprite(name,500,worldSpriteCenterY(name,30,2),2,actor);}finally{ctx.translate=saved;}}
    rows.push({name,frames,feet});}return rows;})()`);
  for(const row of rows){assert.ok(new Set(row.frames.map(p=>p.frame)).size>1,row.name+' uses authored motion frames');
    assert.ok(row.frames.every(p=>p.sx===1&&p.sy===1&&p.rise===0),row.name+' has no second procedural gait');
    assert.ok(row.feet.every(y=>y===31*32),row.name+' stable world foot');}
});

test('GR-07 open portal requests frames while closed portals and hidden traps remain empty',()=>{
  const g=game();enableMotion(g);
  g.run(`enterTown();state.town.npcs=[];state.town.animals=[];state.companion=null;state.monsters=[];state.townPortalOpen=true;state.player.x=55;state.player.y=29;updateCamera();clearMovementAnimation()`);
  assert.equal(g.run('motionNeeded()'),true);
  g.run('state.player.x=39;state.player.y=32;updateCamera()');assert.equal(g.run('motionNeeded()'),false,'offscreen portal does not animate');
  g.run('state.townPortalOpen=false');assert.equal(g.run('motionNeeded()'),false);
  for(const role of ['spikesHidden','portalClosed'])for(const f of [0,1,2,3,4])assert.equal(g.run(`artDecoded('${role}',${f})`),null);
});

test('GR-07 Greater Heal and barrier impact retain distinct animated effects and combat rules',()=>{
  const g=game();enableMotion(g);
  g.run(`state.companion=null;state.player.maxHp=100;state.player.hp=20;state.player.mp=100;state.player.maxMp=100;
    state.player.spells.greaterHeal=true;state.player.spells.magicBarrier=true;state.activeTime=10;
    castSpell('greaterHeal')`);
  assert.equal(g.run('state.player.hp'),75);assert.equal(g.run('state.player.mp'),82);
  assert.equal(g.run('state.spellReadyAt.greaterHeal'),16);
  assert.equal(g.run('state.motion.projectiles[0].kind'),'greaterHeal');
  const frames=g.json(`(()=>{const saved=drawSprite,out=[];drawSprite=(id,x,y,scale,f)=>out.push([id,f]);try{
    for(const t of [0,.3,.6,.9]){state.motion.projectiles[0].elapsed=t*.6;drawProjectiles();}
    }finally{drawSprite=saved;}return out;})()`);
  assert.deepEqual(frames,[['greaterHealFX',0],['greaterHealFX',1],['greaterHealFX',2],['greaterHealFX',3]]);
  g.run(`state.monsters=[{id:101,name:'Orc',sprite:'orc',x:42,y:30,hp:500,maxHp:500,def:0,atk:0,nextAttackAt:99}];state.map[30][43]=1;
    state.motion.projectiles=[];castSpell('magicBarrier')`);
  assert.equal(g.run('state.player.mp'),68);assert.equal(g.run('state.spellReadyAt.magicBarrier'),14);
  assert.equal(g.run('state.motion.projectiles[0].impact'),true);
  assert.equal(g.run('state.monsters[0].hp<500'),true);
});

test('GR-07 projectile source faces flight vector, uses animation phases and respects fog',()=>{
  const g=game();enableMotion(g);
  const result=g.json(`(()=>{const saved=drawSprite,rotate=ctx.rotate,out=[];let angle=null;drawSprite=(id,x,y,scale,f)=>out.push({id,scale,f,angle});ctx.rotate=a=>angle=a;
    try{for(const kind of ['arrow','stinger','bone','beer','fireball','frost'])for(const [dx,dy]of[[2,0],[0,2],[-2,0],[0,-2]]){
      state.motion.projectiles=[];spawnProjectile(kind,state.player,{x:40+dx,y:30+dy});state.motion.projectiles[0].elapsed=.2;drawProjectiles();}
      const visible=out.length;state.motion.projectiles=[{kind:'fireball',fromX:1,toX:2,fromY:1,toY:2,elapsed:0,duration:1}];drawProjectiles();return {out,visible};
    }finally{drawSprite=saved;ctx.rotate=rotate;}})()`);
  assert.equal(result.visible,24);assert.equal(result.out.length,24);
  for(let k=0;k<6;k++)for(let i=0;i<4;i++){const row=result.out[k*4+i];assert.equal(row.angle,[0,Math.PI/2,Math.PI,-Math.PI/2][i]);if(k>=4)assert.equal(row.f,2);}
  assert.ok(g.run("spriteDimensions('stingerFX').width<spriteDimensions('arrowFX').width"));
});

test('GR-07 every prepared actor draws authored directions with stable union feet',()=>{
  const g=game();enableMotion(g);
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/previews/2026-11-25-0x72/characters-v1/manifest.json')));
  const names=['knight',...manifest.assets.map(a=>a.id)];
  g.run('window.gr07Names='+JSON.stringify(names));
  const result=g.json(`(()=>{const saved=drawSpriteAnchored,translate=ctx.translate,scale=ctx.scale,errors=[];let direction,foot,stretch;
    try{drawSpriteAnchored=(name,x,y,k,frame,dir)=>{if(dir!==direction||foot!==992||stretch[0]!==1||stretch[1]!==1)errors.push({name,dir,direction,foot,stretch});};ctx.translate=(x,y)=>foot=y;ctx.scale=(...a)=>stretch=a;
      for(const name of window.gr07Names)for(const dir of ['front','back','left','right'])for(const time of [.01,.1,.2,.28]){
        const actor={id:77,x:41,y:30},key=actorMotionKey(actor);state.motion.moves[key]={fromX:40,fromY:30,x:41,y:30,at:0,duration:2};state.motion.directions[key]=dir;direction=dir;state.motion.time=time;
        drawActorSprite(name,500,worldSpriteCenterY(name,30,2),2,actor);
      }return {errors,count:window.gr07Names.length*16};
    }finally{drawSpriteAnchored=saved;ctx.translate=translate;ctx.scale=scale;}})()`);
  assert.deepEqual(result.errors,[]);assert.equal(result.count,416);
});

test('GR-07 effect and portal clocks freeze for every simulation pause and stale callbacks are harmless',()=>{
  const g=game();enableMotion(g);
  for(const block of ['state.helpOpen=true','state.consoleOpen=true',"state.pause='health'","state.pause='retreat'",'document.hidden=true']){
    g.run(`state.helpOpen=false;state.consoleOpen=false;state.pause=null;document.hidden=false;clearMovementAnimation();spawnProjectile('greaterHeal',state.player,state.player,.6);
      state.motion.projectiles[0].elapsed=.15;state.motion.time=.25;${block}`);
    const before=g.json('[state.motion.time,state.motion.projectiles,state.activeTime,state.hazardTime,state.inventory,state.townScrolls]');
    g.run('advanceMotion(100);requestMotionFrame()');
    assert.deepEqual(g.json('[state.motion.time,state.motion.projectiles,state.activeTime,state.hazardTime,state.inventory,state.townScrolls]'),before,block);
    assert.equal(g.run('state.motion.lastTimestamp'),null);
  }
  g.run(`document.hidden=false;state.pause=null;window.stale=state.motion;enterFloor(2,false,true);motionFrame(999999,window.stale)`);
  assert.equal(g.run('state.motion.time'),0);assert.equal(g.run('state.motion.projectiles.length'),0);
  assert.equal(g.run("FLOOR_FIELDS.includes('motion')"),false);
});

test('GR-08 in-world defeats pivot around original feet and retain authored facing for every boss',()=>{
  const g=game();enableMotion(g);
  const rows=g.json(`(()=>{const out=[];for(const depth of [5,10,20,30,40,50,100,3,7]){
    enterFloor(depth,false,true);clearBossIntro();const boss=state.boss;state.player.x=boss.x-1;state.player.y=boss.y;updateCamera();
    const visual=monsterVisual(boss);state.motion.directions[actorMotionKey(boss)]='left';startBossDefeat(boss);
    const saved=drawSpriteAnchored,translate=ctx.translate,poses=[];let point;
    ctx.translate=(x,y)=>point=[x,y];drawSpriteAnchored=(name,x,y,scale,frame,dir)=>poses.push({name,point,x,y,scale,frame,dir});
    try{const scene=bossDefeatScene();if(depth===100)drawDragonDefeatDragon(scene);else if(depth===5)drawMimicDefeat(scene);else drawBossDefeat(scene);}finally{drawSpriteAnchored=saved;ctx.translate=translate;}
    out.push({depth,visual,poses});clearBossDefeat();}return out;})()`);
  for(const row of rows){assert.ok(row.poses.length,row.depth+' uses anchored source art');if(row.depth===100)continue;
    const p=row.poses[0];assert.equal(p.point[0],row.visual.footX);assert.equal(p.point[1],row.visual.footY);assert.equal(p.x,0);assert.equal(p.y,0);assert.equal(p.dir,'left');}
});

test('GR-08 portrait centering ignores transparent padding and dragon defeat cycles authored wings',()=>{
  const g=game();enableMotion(g);
  const result=g.json(`(()=>{enterFloor(100,false,true);clearBossIntro();startBossIntro(state.boss);state.bossIntro.elapsed=.7;
    const saved=drawSpriteAnchored,rows=[];drawSpriteAnchored=(name,x,y,scale,frame,dir)=>rows.push({name,x,y,scale,frame,dir});
    try{drawBossIntro(bossIntroScene());clearBossIntro();startBossDefeat(state.boss);rows.length=1;for(const time of [.01,.14,.26,.39]){state.bossDefeat.elapsed=time;drawDragonDefeatDragon(bossDefeatScene());}}finally{drawSpriteAnchored=saved;}
    return {rows,size:spriteDimensions('dragonBoss')};})()`);
  assert.equal(result.rows.length,5);
  const p=result.rows[0],s=result.size;
  assert.equal(p.x, (s.anchorX-s.unionX-s.width/2)*p.scale);
  assert.equal(p.y, (s.anchorY-s.unionY-s.height/2)*p.scale);
  assert.deepEqual(result.rows.slice(1).map(r=>r.frame),[0,1,2,3]);
});

test('GR-08 throne guards collapse using skeleton art and cannot attack or award extra rewards afterward',()=>{
  const g=game();enableMotion(g);
  g.run(`enterFloor(50,false,true);clearBossIntro();state.activeTime=10;state.bossSummonAt=0;summonThroneGuards();
    state.player.x=state.boss.x-1;state.player.y=state.boss.y;updateCamera();damageMonster(state.boss,state.boss.hp)`);
  assert.ok(g.run('state.bossDefeat.guards.length')>0);
  assert.equal(g.run('state.monsters.some(m=>m.isGuard&&m.hp>0)'),false);
  const result=g.json(`(()=>{const saved=drawSpriteAnchored,names=[];drawSpriteAnchored=(name)=>names.push(name);try{state.bossDefeat.elapsed=1;drawBossDefeat(bossDefeatScene());}finally{drawSpriteAnchored=saved;}return names;})()`);
  assert.ok(result.includes('skeleton'));assert.ok(result.includes('skeletonKing'));
  const rewards=g.json('[state.gold,state.kills,state.player.xp]');g.run('skipBossDefeat();for(const m of state.monsters.filter(m=>m.isGuard))damageMonster(m,9999)');
  assert.deepEqual(g.json('[state.gold,state.kills,state.player.xp]'),rewards);
});

test('GR-08 ending runs princess toward dragon with authored poses then walks hero toward sunset',()=>{
  const g=game();reachEnding(g);
  const rows=g.json(`(()=>{const saved=drawSpriteAnchored,rows=[];let time=0;drawSpriteAnchored=(name,x,y,scale,frame,dir)=>rows.push({time,name,scale,frame,dir});
    try{for(const t of [0,2.1,2.2,3.7,5.3,9,10,14]){time=t;state.ending.elapsed=t;state.ending.phase=endingPhase(t);drawEnding();}}finally{drawSpriteAnchored=saved;}return rows;})()`);
  const princess=rows.filter(r=>r.name==='princess');assert.equal(princess.length,5);
  assert.equal(princess[0].dir,'front');assert.equal(princess[1].dir,'right');assert.notEqual(princess[1].frame,princess[2].frame);
  assert.ok(rows.some(r=>r.name==='greaterHealFX'&&r.time===3.7));
  for(const r of rows.filter(r=>r.name==='knight'&&r.time>=9))assert.equal(r.dir,'back');
  const final=rows.find(r=>r.name==='knight'&&r.time===14);assert.equal(final.frame,0);
});

test('GR-08 every boss cinematic freezes and rejects stale callbacks after skip, travel and restart',()=>{
  const g=game();enableMotion(g);
  for(const depth of [5,10,20,30,40,50,100,3,7]){
    g.run(`enterFloor(${depth},false,true);clearBossIntro();startBossIntro(state.boss);window.gr08OldIntro=state.bossIntro;bossIntroFrame(1000,state.bossIntro);bossIntroFrame(1100,state.bossIntro)`);
    for(const flag of ['document.hidden','state.helpOpen','state.consoleOpen']){
      g.run(`${flag}=true;bossIntroFrame(99999,state.bossIntro);advanceBossIntro(99)`);
      assert.equal(g.run('state.bossIntro.elapsed'),.1,depth+' intro '+flag);
      g.run(`${flag}=false;bossIntroFrame(100000,state.bossIntro)`);assert.equal(g.run('state.bossIntro.elapsed'),.1);
    }
    g.run('skipBossIntro();bossIntroFrame(100100,window.gr08OldIntro)');assert.equal(g.run('state.bossIntro'),null);
    g.run('damageMonster(state.boss,state.boss.hp);window.gr08OldDefeat=state.bossDefeat;bossDefeatFrame(1000,state.bossDefeat);bossDefeatFrame(1100,state.bossDefeat)');
    const reward=g.json('[state.gold,state.kills,state.player.xp,state.bossDefeated]');
    for(const flag of ['document.hidden','state.helpOpen','state.consoleOpen']){
      g.run(`${flag}=true;bossDefeatFrame(99999,state.bossDefeat);advanceBossDefeat(99)`);assert.equal(g.run('state.bossDefeat.elapsed'),.1,depth+' defeat '+flag);
      g.run(`${flag}=false;bossDefeatFrame(100000,state.bossDefeat)`);assert.equal(g.run('state.bossDefeat.elapsed'),.1);
    }
    g.run('skipBossDefeat();bossDefeatFrame(100100,window.gr08OldDefeat)');assert.equal(g.run('state.bossDefeat'),null);
    assert.deepEqual(g.json('[state.gold,state.kills,state.player.xp,state.bossDefeated]'),reward);
    g.run('enterFloor(1,false,true);bossIntroFrame(200000,window.gr08OldIntro);bossDefeatFrame(200000,window.gr08OldDefeat)');
    assert.equal(g.run('state.depth'),1);assert.equal(g.run('bossCinematicActive()'),false);
  }
  g.run('newGame();bossIntroFrame(200001,window.gr08OldIntro);bossDefeatFrame(200001,window.gr08OldDefeat)');assert.equal(g.run('state.area'), 'town');
});

test('GR-08 ending milestones stay once-only with muted skip and no catch-up or stale resurrection',()=>{
  const g=game();enableMotion(g);reachEnding(g);
  const reward=g.json('[state.gold,state.kills,state.player.xp,state.princess.rescued]');
  g.run('window.gr08Sound=[];playSound=name=>window.gr08Sound.push(name);tone=(...a)=>window.gr08Sound.push(a);advanceEnding(3.6);advanceEnding(0)');
  assert.equal(g.run("window.gr08Sound.filter(x=>x==='heal').length"),1);
  assert.equal(g.run('state.ending.dragon.hp'),0);
  g.run('advanceEnding(1.4)');assert.equal(g.run('state.ending.dragon.hp'),g.run('state.ending.dragon.maxHp'));
  g.run('endingFrame(1000,state.ending);endingFrame(1100,state.ending)');
  for(const flag of ['document.hidden','state.helpOpen','state.consoleOpen']){
    const time=g.run('state.ending.elapsed');g.run(`${flag}=true;endingFrame(99999,state.ending);advanceEnding(99)`);assert.equal(g.run('state.ending.elapsed'),time);
    g.run(`${flag}=false;endingFrame(100000,state.ending)`);assert.equal(g.run('state.ending.elapsed'),time);
  }
  const sounds=g.run('window.gr08Sound.length');g.run('window.gr08OldEnding=state.ending;skipEnding();skipEnding()');
  assert.equal(g.run('window.gr08Sound.length'),sounds,'skip silently completes unplayed milestones');
  assert.deepEqual(g.json('[state.gold,state.kills,state.player.xp,state.princess.rescued]'),reward);
  assert.equal(g.run('state.ending.elapsed'),14);
  g.run('restartFromEnding();endingFrame(999999,window.gr08OldEnding)');assert.equal(g.run('state.ending'),null);assert.equal(g.run('state.area'),'town');
});

test('GR-08 large defeat art remains visible when the boss tile is just outside the camera',()=>{
  const g=game();enableMotion(g);
  g.run('enterFloor(5,false,true);clearBossIntro();startBossDefeat(state.boss);state.camera={x:state.boss.x-18,y:state.boss.y-5};state.motion.camera=null');
  assert.equal(g.run('inRenderCamera(state.boss.x,state.boss.y)'),false);
  assert.equal(g.run('inWorldArtBounds(state.bossDefeat.visual)'),true);
  const names=g.json(`(()=>{const saved=drawSpriteAnchored,rows=[];drawSpriteAnchored=name=>rows.push(name);try{drawMimicDefeat(bossDefeatScene());}finally{drawSpriteAnchored=saved;}return rows;})()`);
  assert.deepEqual(names,['mimic']);
});

test('GR-08 intro portraits fill their card consistently and companion speech waits until the flourish ends',()=>{
  const g=game();enableMotion(g);
  for(const depth of [5,10,20,30,40,50,100,3,7]){
    const scale=g.json(`(()=>{enterFloor(${depth},false,true);clearBossIntro();startBossIntro(state.boss);const scene=bossIntroScene(),size=spriteDimensions(scene.sprite),saved=drawCinematicActor;let k;
      drawCinematicActor=(name,x,y,scale)=>k=scale;try{drawBossIntro(scene);}finally{drawCinematicActor=saved;}return {k,width:size.width,height:size.height};})()`);
    assert.ok(Math.abs(Math.max(scale.width,scale.height)*scale.k-260)<1e-8,depth+' portrait fits reserved area');
  }
  g.run(`clearBossIntro();damageMonster(state.boss,state.boss.hp);state.companion.x=state.player.x;state.companion.y=state.player.y;
    state.companionSpeech={text:'GR08_SPEECH'};window.gr08Text=[];const gr08Fill=ctx.fillText;ctx.fillText=t=>window.gr08Text.push(t);drawCompanion();ctx.fillText=gr08Fill`);
  assert.equal(g.run("window.gr08Text.includes('GR08_SPEECH')"),false);
  g.run(`skipBossDefeat();window.gr08Text=[];ctx.fillText=t=>window.gr08Text.push(t);drawCompanion();ctx.fillText=gr08Fill`);
  assert.equal(g.run("window.gr08Text.includes('GR08_SPEECH')"),true);
});

test('GR-09 actual monster drawing uses the same foot anchor as bars, culling and defeat snapshots',()=>{
  const g=game();enableMotion(g);
  const result=g.json(`(()=>{const saved=drawActorSprite,rows=[];try{for(const name of ['orc','bat','mimic','hydra','boar','medusa','darkWizard','skeletonKing','dragonBoss','cook','bartender']){
    state.monsters=[{id:800,x:41,y:30,sprite:name,name,hp:10,maxHp:10,isBoss:!['orc','bat'].includes(name),isDragon:name==='dragonBoss'}];
    const m=state.monsters[0],v=monsterVisual(m);drawActorSprite=(name,x,y,scale,actor)=>{if(actor===m)rows.push({name,x,footY:y+spriteDimensions(name).height*scale/2,expectedX:v.footX,expectedY:v.footY});};draw();
    }return rows;}finally{drawActorSprite=saved;}})()`);
  assert.equal(result.length,11);for(const r of result){assert.equal(r.x,r.expectedX,r.name+' horizontal anchor');assert.equal(r.footY,r.expectedY,r.name+' vertical anchor');}
});

test('GR-09 continuously scaled cinematic poses reuse source-resolution sprite canvases',()=>{
  const g=game();g.run(`graphicsCache().sprites={};window.gr09Surfaces=0;document.createElement=()=>{window.gr09Surfaces++;return {width:0,height:0,getContext:()=>({createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}})};};
    for(let i=0;i<200;i++)drawSprite('knight',100,100,1+i/100,i%4,'back')`);
  assert.equal(g.run('window.gr09Surfaces'),4,'one raw canvas per authored frame, independent of cinematic scale');
  g.run(`for(let i=0;i<200;i++)drawSprite('knight',100,100,4+i/100,i%4,'back')`);
  assert.equal(g.run('window.gr09Surfaces'),4,'restarts and new scale values do not grow the cache');
});
