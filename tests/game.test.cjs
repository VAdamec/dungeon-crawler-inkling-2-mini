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

function game(seed = 42, start = true, area = 'dungeon', withDom = false) {
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
  let fixtureDocument;
  const nodes=[];
  function enhance(el,tag='DIV') {
    el.tagName=tag;el.children=[];el.dataset={};el.attributes={};el.isConnected=true;
    el.classList={toggle:noop};el.appendChild=child=>{el.children.push(child);child.parentElement=el;if(child.id)elements[child.id]=child;return child;};
    el.contains=node=>{for(let n=node;n;n=n.parentElement)if(n===el)return true;return false;};
    el.setAttribute=(name,value)=>{el.attributes[name]=String(value);};el.getAttribute=name=>el.attributes[name]??null;
    Object.defineProperty(el,'innerHTML',{get:()=>'',set:()=>{for(const child of el.children)child.isConnected=false;el.children=[];}});
    const matches=(node,selector)=>selector.split(',').some(part=>{
      part=part.trim();if(part==='button')return node.tagName==='BUTTON';
      if(part==='[inert]')return !!node.inert;if(part==='[hidden]')return !!node.hidden;
      if(part.startsWith('[data-companion-')){
        const field=part.includes('choice')?'companionChoice':'companionId',value=part.match(/="([^"\]]+)"/);
        return node.dataset[field]!==undefined&&(!value||node.dataset[field]===value[1]);
      }return false;
    });
    el.querySelectorAll=selector=>{const found=[];function visit(node){for(const child of node.children){if(matches(child,selector))found.push(child);visit(child);}}visit(el);return found;};
    el.closest=selector=>{for(let n=el;n;n=n.parentElement)if(matches(n,selector))return n;return null;};
    el.focus=()=>{if(!el.disabled&&!el.closest('[hidden], [inert]'))fixtureDocument.activeElement=el;};
    nodes.push(el);return el;
  }
  function element(id) {
    const el=elements[id] ||= { style: {}, hidden: ['tradeOverlay', 'companionOverlay', 'saveLoadOverlay'].includes(id), disabled: false,
      textContent: '', value: '', ariaPressed: '', addEventListener: (name, fn) => { listeners[`${id}:${name}`] = fn; },
      getContext: () => id === 'minimap' ? minimapCtx : ctx, focus: noop };
    if(withDom&&!el.children)enhance(el,id==='consoleInput'?'INPUT':/startGame|closeCompanionBoard|companionPostAction|companionAudioToggle|saveGameButton|loadGameButton|launchLoadGame|deathLoadGame|confirmSaveLoad|cancelSaveLoad|cancelSavePreparation|saveLoadAudioToggle|closeTrade|cancelTrade|confirmTrade|addTradePurchase|addTradeSale|undoTrade|resetTrade|tradeAudioToggle/.test(id)?'BUTTON':'DIV');
    return el;
  }
  fixtureDocument={getElementById:element,addEventListener:(name,fn)=>{listeners[name]=fn;}};
  if(withDom){
    fixtureDocument.createElement=tag=>{const node=enhance({style:{},hidden:false,disabled:false,textContent:'',value:''},tag.toUpperCase());if(tag==='canvas')node.getContext=()=>ctx;return node;};
    for(const id of ['marmalade','pip']){const btn=enhance({style:{},hidden:false,disabled:false,textContent:'',value:'',addEventListener:(name,fn)=>{listeners[`choice_${id}:${name}`]=fn;}},'BUTTON');
      btn.dataset.companionChoice=id;element('launchScreen').appendChild(btn);}
    fixtureDocument.querySelectorAll=selector=>{
      if(selector.startsWith('[data-companion-choice'))return element('launchScreen').querySelectorAll(selector);
      return [];
    };
    fixtureDocument.querySelector=selector=>fixtureDocument.querySelectorAll(selector)[0]||null;
    element('gameLayout').appendChild(element('game'));
    element('gameLayout').appendChild(element('companionPostAction'));
    const trade=element('tradeOverlay');
    for(const id of ['closeTrade','tradeBuyList','addTradePurchase','tradeSellList','addTradeSale','undoTrade','resetTrade','confirmTrade','cancelTrade','tradeAudioToggle'])trade.appendChild(element(id));
    const overlay=element('companionOverlay');
    for(const id of ['closeCompanionBoard','companionBoardList','companionAudioToggle'])overlay.appendChild(element(id));
  }
  const sandbox = vm.createContext({
    document: fixtureDocument,
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
    key: (key, extra = {}) => listeners.keydown({ key, target:withDom?fixtureDocument.activeElement:undefined, preventDefault: noop, ...extra }),
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
    pickup(); tradeBuy('stock:0'); tradeBuy('stock:1'); confirmTrade(); sellToMerchant(); tradeSell('weapon'); confirmTrade();
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
  g.run(`state.player.hp=89; state.merchant={x:state.player.x,y:state.player.y,stock:[]}; sellToMerchant();tradeSell('ring');confirmTrade()`);
  assert.equal(g.run('state.player.maxHp'), 70);
  assert.equal(g.run('state.player.hp'), 70, 'selling clamps HP to new maximum');
  assert.equal(g.elements.gearHpBonus.textContent, '+0');
  assert.equal(g.elements.ringName.textContent, 'Empty slot');
});

test('merchant ring purchase applies health and gear bonuses persist across floor changes', () => {
  const g = game(); down(g);
  g.run(`state.gold=500; state.merchant.stock=[{...ITEM_TABLE.find(it=>it.kind==='ring')}];
    state.player.x=state.merchant.x;state.player.y=state.merchant.y;buyFromMerchant();tradeBuy('stock:0');confirmTrade()`);
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
  ] }; buyFromMerchant();tradeBuy('stock:0');confirmTrade();`);
  assert.equal(g.run('!!state.player.spells.greaterHeal'), true);
  assert.equal(g.run('state.gold'), 200 - Math.round(85 * 1.5));
  assert.equal(g.run('state.merchant.stock.length'), 1, 'known spellbook remains in stock');
  g.run("buyFromMerchant();tradeBuy('stock:0');confirmTrade()");
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
      stock: [{ ...ITEM_TABLE[1], id: 100 }] }; buyFromMerchant();tradeBuy('stock:0');confirmTrade();`);
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
  assert.deepEqual(g.json('[state.companion.name, state.companion.sprite]'), ['Cook', 'cook']);
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
  g.run('state.gold = 500; state.player.x = state.merchant.x; state.player.y = state.merchant.y; pickup();tradeBuy("stock:0");confirmTrade()');
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
  g.run('state.gold = 500; state.player.x = state.merchant.x; state.player.y = state.merchant.y; pickup();tradeBuy("stock:0");confirmTrade()');
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
    state.player.x = state.merchant.x; state.player.y = state.merchant.y; pickup();tradeBuy('stock:0');confirmTrade()`);
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

test('teleportTown creates a debug portal without consuming scrolls and returns through it', () => {
  const g = game();
  g.run('enterFloor(2,false); state.townScrolls = 3; state.player.x=12; state.player.y=9; state.map[9][12]=0;');
  g.key('`');
  const input = g.elements.consoleInput;
  input.value = 'teleportTown'; g.key('Enter', { target: input });
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.townScrolls'), 3);
  assert.deepEqual(g.json('state.townExit'), { depth: 2, x: 12, y: 9, reason: 'cheat' });
  assert.equal(g.run('state.townPortalOpen'), true);
  assert.ok(g.elements.consoleOutput.textContent.includes('Teleported to town; debug portal open.'));
  g.run('closeConsole(); state.player.x = state.townGate.x; state.player.y = state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.deepEqual(g.json('[state.depth,state.player.x,state.player.y]'), [2, 12, 9]);
  assert.equal(g.run('state.townPortalOpen'), false);
  assert.equal(g.run('state.townExit'), null);
  assert.match(g.json('state.messages.at(-1)'), /debug portal/);
});

test('teleportTown rejects when portal open, in town, or blocked states', () => {
  const g = game();
  g.run('state.townPortalOpen = true; state.townExit = {depth:1,x:1,y:1,reason:"scroll"};');
  g.key('`'); const input = g.elements.consoleInput;
  input.value = 'teleportTown'; g.key('Enter', { target: input });
  assert.ok(g.elements.consoleOutput.textContent.includes('already open'));
  assert.equal(g.run('state.area'), 'dungeon');
  g.run('closeConsole(); enterTown(); render();');
  g.key('`'); input.value = 'teleportTown'; g.key('Enter', { target: input });
  assert.ok(g.elements.consoleOutput.textContent.includes('Already in town.'));
  g.run('closeConsole(); enterDungeonFromTown(); state.gameOver = true; render();');
  g.key('`'); input.value = 'teleportTown'; g.key('Enter', { target: input });
  assert.ok(g.elements.consoleOutput.textContent.includes('Cannot teleport now.'));
});

function debugPortalSnapshot(g) {
  return g.json(`({ area:state.area, depth:state.depth, player:state.player,
    exit:state.townExit, portal:state.townPortalOpen, scrolls:state.townScrolls,
    gold:state.gold, inventory:state.inventory, equipment:state.equipment, spells:state.spellReadyAt,
    companion:state.companion, selected:state.selectedCompanion, unlocked:state.unlockedCompanions,
    floors:state.floors, visited:[...state.visited], map:state.map, hazards:state.hazards,
    active:state.activeTime, retreat:state.retreatReadyAt, recovery:[state.healElapsed,state.combatElapsed,state.manaRegenAt],
    pause:state.pause, messages:state.messages, kills:state.kills, turn:state.turn })`);
}

test('T1 debug portal rejects extra arguments atomically and accepts case-insensitive zero-argument commands', () => {
  const g = game();
  g.key('`');
  for (const command of ['teleportTown extra', 'teleportTown 1 2']) {
    const before = debugPortalSnapshot(g);
    g.elements.consoleInput.value = command;
    g.key('Enter', { target:g.elements.consoleInput });
    assert.deepEqual(debugPortalSnapshot(g), before, command);
    assert.match(g.elements.consoleOutput.textContent, /Usage: teleportTown/);
  }
  const before = debugPortalSnapshot(g);
  g.run('teleportTown("extra")');
  assert.deepEqual(debugPortalSnapshot(g), before, 'direct calls must not ignore arguments either');
  g.elements.consoleInput.value = '  TeLePoRtToWn  ';
  g.key('Enter', { target:g.elements.consoleInput });
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.townExit.reason'), 'cheat');
});

test('T1 debug portal rejects hidden, dead, paused, cinematic and player-menu contexts without changing gameplay', () => {
  const cases = [
    'state.started=false', 'state.gameOver=true', 'state.player.hp=0', 'document.hidden=true',
    'state.helpOpen=true', 'state.pause={kind:"health"}', 'state.pause={kind:"retreat"}',
    'state.ending={completed:false}', 'state.bossIntro={completed:false}', 'state.bossDefeat={completed:false}',
    'state.trade={snapshot:{gold:123}}', 'state.companionPicker={id:123}',
    'document.getElementById("companionOverlay").hidden=false',
    'document.getElementById("tradeOverlay").hidden=false',
  ];
  for (const setup of cases) {
    const g = game();
    g.key('`');
    g.run(`state.consoleOpen=true; window.t1Sounds=[]; playSound=name=>window.t1Sounds.push(name); ${setup}`);
    const before = debugPortalSnapshot(g);
    g.elements.consoleInput.value = 'teleportTown';
    g.key('Enter', { target:g.elements.consoleInput });
    assert.deepEqual(debugPortalSnapshot(g), before, setup);
    assert.match(g.elements.consoleOutput.textContent, /Cannot teleport now/, setup);
    assert.deepEqual(g.json('window.t1Sounds'), [], setup);
  }
});

test('T1 debug travel saves the current floor without healing, RNG, rewards or resource changes', () => {
  const g = game();
  g.run(`enterFloor(2,false); state.player.hp=37;state.player.mp=7;state.player.xp=19;
    state.gold=123;state.townScrolls=3;state.inventory=[{...ITEM_TABLE.find(i=>i.kind==='heal')}];
    state.activeTime=15;state.retreatReadyAt=72;state.floorKey.collected=true;
    state.potions=state.potions.slice(1);state.treasures=state.treasures.slice(1);state.visited.add('12,9');
    window.t1Map=state.map;window.t1World=JSON.stringify([state.map,state.potions,state.treasures,state.merchant,state.floorKey,state.hazards]);
    window.t1Progress=JSON.stringify([snapshotPlayerStats(),state.equipment,state.inventory,state.gold,state.townScrolls,
      state.activeTime,state.retreatReadyAt,state.selectedCompanion,state.unlockedCompanions,state.kills,state.turn,
      state.companion&&[state.companion.id,state.companion.name,state.companion.kind],state.spellReadyAt]);
    window.t1Sounds=[];playSound=name=>window.t1Sounds.push(name);window.t1Rng=0;
    const t1Random=Math.random;Math.random=()=>{window.t1Rng++;return t1Random();};`);
  const exit = g.json('({depth:state.depth,x:state.player.x,y:state.player.y,reason:"cheat"})');
  g.key('`');
  g.elements.consoleInput.value = 'teleportTown';
  g.key('Enter', { target:g.elements.consoleInput });
  assert.equal(g.run('state.area'), 'town');
  assert.equal(g.run('state.consoleOpen'), true, 'the command must work with its console open');
  assert.deepEqual(g.json('state.townExit'), exit);
  assert.equal(g.run('state.townPortalOpen'), true);
  assert.equal(g.run('state.floors[2].map===window.t1Map'), true);
  assert.equal(g.run(`JSON.stringify([state.floors[2].map,state.floors[2].potions,state.floors[2].treasures,
    state.floors[2].merchant,state.floors[2].floorKey,state.floors[2].hazards])===window.t1World`), true);
  assert.equal(g.run("state.floors[2].visited.has('12,9')"), true);
  assert.equal(g.run(`JSON.stringify([snapshotPlayerStats(),state.equipment,state.inventory,state.gold,state.townScrolls,
    state.activeTime,state.retreatReadyAt,state.selectedCompanion,state.unlockedCompanions,state.kills,state.turn,
    state.companion&&[state.companion.id,state.companion.name,state.companion.kind],state.spellReadyAt])===window.t1Progress`), true);
  assert.equal(g.run('window.t1Rng'), 0);
  assert.equal(g.json('window.t1Sounds').filter(name=>name==='magic').length, 1);
  assert.equal(g.json('state.messages').filter(line=>line.includes('A debug portal snaps open')).length, 1);
});

test('T1 debug portal cannot replace a return point after loadLevel or repeated town commands', () => {
  const g = game();
  g.key('`');
  for (const command of ['teleportTown', 'teleportTown', 'loadLevel 2']) {
    g.elements.consoleInput.value = command;g.key('Enter', { target:g.elements.consoleInput });
  }
  const before = debugPortalSnapshot(g);
  g.elements.consoleInput.value = 'teleportTown';g.key('Enter', { target:g.elements.consoleInput });
  assert.deepEqual(debugPortalSnapshot(g), before);
  assert.match(g.elements.consoleOutput.textContent, /already open/);
  assert.equal(g.run('state.townExit.depth'), 1);
});

test('T1 J and Space return through the saved debug portal once without regenerating its floor', () => {
  for (const key of ['j', ' ']) {
    const g = game();
    g.run(`enterFloor(2,false);state.townScrolls=3;state.floorKey.collected=true;
      state.player.x=12;state.player.y=9;state.map[9][12]=0;
      state.hazards=state.hazards.filter(h=>h.x!==12||h.y!==9);
      state.merchant=null;state.prisoner=null;state.princess=null;
      state.potions=state.potions.slice(1);state.treasures=state.treasures.slice(1);
      window.t1World=JSON.stringify([state.map,state.potions,state.treasures,state.floorKey]);window.t1Map=state.map;`);
    g.key('`');g.elements.consoleInput.value='teleportTown';g.key('Enter',{target:g.elements.consoleInput});
    g.key('Escape');
    g.run('state.player.x=state.townGate.x;state.player.y=state.townGate.y');
    g.key(key);
    assert.deepEqual(g.json('[state.area,state.depth,state.player.x,state.player.y]'), ['dungeon',2,12,9], key);
    assert.equal(g.run('state.map===window.t1Map'), true);
    assert.equal(g.run('JSON.stringify([state.map,state.potions,state.treasures,state.floorKey])===window.t1World'), true);
    assert.deepEqual(g.json('[state.townExit,state.townPortalOpen,state.townScrolls]'), [null,false,3]);
    const before = debugPortalSnapshot(g);
    assert.equal(g.run('returnThroughTownPortal()'), false);
    assert.deepEqual(debugPortalSnapshot(g), before);
  }
});

test('T1 debug portal uses the existing safe fallback when its return tile becomes blocked', () => {
  const g = game();
  g.run(`state.player.x=12;state.player.y=9;state.map[9][12]=0;teleportTown();
    state.floors[1].map[9][12]=1;window.t1Safe=safeTownExitTile(state.townExit);
    state.player.x=state.townGate.x;state.player.y=state.townGate.y;`);
  const safe = g.json('window.t1Safe');
  assert.notDeepEqual(safe, {x:12,y:9});
  g.key(' ');
  assert.deepEqual(g.json('({x:state.player.x,y:state.player.y})'), safe);
  assert.equal(g.run('state.map[state.player.y][state.player.x]'), 0);
  assert.deepEqual(g.json('[state.townExit,state.townPortalOpen]'), [null,false]);
});

test('addScrolls validates input and updates HUD', () => {
  const g = game();
  g.key('`'); const input = g.elements.consoleInput;
  input.value = 'addScrolls 3'; g.key('Enter', { target: input });
  assert.equal(g.run('state.townScrolls'), 3);
  assert.match(g.elements.spellList.textContent, /J Town Scroll \(3\)/);
  assert.ok(g.elements.consoleOutput.textContent.includes('Added 3 Town Scroll(s); total 3.'));
  for (const bad of ['0', '-1', '1.5', 'abc', '']) {
    const before = g.run('state.townScrolls');
    input.value = bad ? `addScrolls ${bad}` : 'addScrolls'; g.key('Enter', { target: input });
    assert.equal(g.run('state.townScrolls'), before, bad);
    assert.ok(g.elements.consoleOutput.textContent.includes('Usage: addScrolls <positive integer>'));
  }
});

test('T2 addScrolls rejects non-decimal text and wrong arity without changing gameplay', () => {
  const g = game();
  g.key('`');
  const invalid = ['', '0', '-1', '+3', '1.5', '3.0', '1e2', '1E2', '0x10', '0b10',
    'NaN', 'Infinity', 'abc', '1_000', '1,000', '3 extra', '1 2',
    '9007199254740992', '9999999999999999999999999999999999999999'];
  for (const text of invalid) {
    const before = debugPortalSnapshot(g);
    g.elements.consoleInput.value = `addScrolls ${text}`;
    g.key('Enter', {target:g.elements.consoleInput});
    assert.deepEqual(debugPortalSnapshot(g), before, text);
    assert.match(g.elements.consoleOutput.textContent, /Usage: addScrolls <positive integer>/, text);
  }
  for (const args of ['"3","extra"', '', 'null', 'true', '3', '[3]', '{}', '" 3 "']) {
    const before = debugPortalSnapshot(g);
    g.run(`addScrolls(${args})`);
    assert.deepEqual(debugPortalSnapshot(g), before, `direct helper: ${args}`);
    assert.match(g.elements.consoleOutput.textContent, /Usage: addScrolls <positive integer>/);
  }
});

test('T2 addScrolls rejects unsafe totals without losing the exact safe-integer boundary', () => {
  const g = game();
  g.key('`');
  g.run('state.townScrolls=Number.MAX_SAFE_INTEGER-1');
  g.elements.consoleInput.value='addScrolls 1';g.key('Enter',{target:g.elements.consoleInput});
  assert.equal(g.run('state.townScrolls'), Number.MAX_SAFE_INTEGER);
  for (const total of ['Number.MAX_SAFE_INTEGER', 'Number.MAX_SAFE_INTEGER-1', '-1', 'NaN', 'Infinity', '1.5']) {
    g.run(`state.townScrolls=${total}`);
    const before = debugPortalSnapshot(g);
    g.elements.consoleInput.value='addScrolls 2';g.key('Enter',{target:g.elements.consoleInput});
    assert.deepEqual(debugPortalSnapshot(g), before, total);
    assert.match(g.elements.consoleOutput.textContent, /Usage: addScrolls <positive integer>/);
  }
  g.run('state.townScrolls=0');
  g.elements.consoleInput.value=`addScrolls ${Number.MAX_SAFE_INTEGER}`;
  g.key('Enter',{target:g.elements.consoleInput});
  assert.equal(g.run('state.townScrolls'), Number.MAX_SAFE_INTEGER);
});

test('T2 addScrolls rejects inactive, hidden, dead, paused, cinematic and player-menu contexts', () => {
  const cases = ['state.started=false', 'state.gameOver=true', 'state.player.hp=0', 'document.hidden=true',
    'state.helpOpen=true', 'state.pause={kind:"health"}', 'state.pause={kind:"retreat"}',
    'state.ending={completed:false}', 'state.bossIntro={completed:false}', 'state.bossDefeat={completed:false}',
    'state.trade={snapshot:{gold:123}}', 'state.companionPicker={id:123}',
    'document.getElementById("companionOverlay").hidden=false',
    'document.getElementById("tradeOverlay").hidden=false'];
  for (const [index,setup] of cases.entries()) {
    const g=game(42,true,index%2?'town':'dungeon');
    g.key('`');
    g.run(`window.t2Sounds=[];playSound=name=>window.t2Sounds.push(name);${setup}`);
    const before=debugPortalSnapshot(g);
    g.elements.consoleInput.value='addScrolls 3';g.key('Enter',{target:g.elements.consoleInput});
    assert.deepEqual(debugPortalSnapshot(g),before,setup);
    assert.match(g.elements.consoleOutput.textContent,/Cannot add scrolls now/,setup);
    assert.deepEqual(g.json('window.t2Sounds'),[],setup);
  }
});

test('T2 addScrolls changes only the count in town or dungeon, including with an existing portal and god mode', () => {
  for (const area of ['town','dungeon']) {
    const g=game(42,true,area);
    g.run(`state.townScrolls=2;state.gold=123;state.player.hp=37;state.player.mp=7;
      state.activeTime=15;state.retreatReadyAt=72;state.townPortalOpen=true;
      state.townExit={depth:1,x:12,y:9,reason:'cheat'};setGodMode('1');`);
    g.key('`');
    const before=debugPortalSnapshot(g);
    const godStats=g.json('state.godModeStats');
    g.run(`window.t2Sounds=[];playSound=name=>window.t2Sounds.push(name);
      Math.random=()=>{throw new Error('addScrolls must not consume RNG');};`);
    g.elements.consoleInput.value='  AdDsCrOlLs   0003  ';
    g.key('Enter',{target:g.elements.consoleInput});
    const after=debugPortalSnapshot(g);
    assert.equal(after.scrolls,5);
    after.scrolls=before.scrolls;
    assert.deepEqual(after,before,area);
    assert.deepEqual(g.json('state.godModeStats'),godStats);
    assert.equal(g.run('state.consoleOpen'),true);
    assert.equal(String(g.elements.scrolls.textContent),'5');
    assert.match(g.elements.spellList.textContent,/J Town Portal \(ready\)/);
    assert.match(g.elements.consoleOutput.textContent,/Added 3 Town Scroll\(s\); total 5\./);
    assert.deepEqual(g.json('window.t2Sounds'),[]);
  }
});


// Exclude disposable rendering/UI state while retaining every gameplay field, Sets and nonfinite sentinels.
function goldSnapshot(g) {
  return g.run(`JSON.stringify(state, (key,value) => {
    if (['art','motion','audio','consoleLines','consoleHistory','consoleHistoryIndex','loadSession'].includes(key)) return undefined;
    if (value instanceof Set) return [...value];
    if (typeof value==='number' && !Number.isFinite(value)) return String(value);
    return value;
  })`);
}

test('G1 goldADD adds exactly once in town/dungeon and god mode, changing only gold', () => {
  for (const area of ['town','dungeon']) for (const god of [false,true]) {
    const g=game(42,true,area);
    g.run(`state.gold=40;state.player.hp=37;state.player.mp=7;state.activeTime=15;
      state.retreatReadyAt=72;state.townPortalOpen=true;
      state.townExit={depth:1,x:12,y:9,reason:'cheat'};${god?"setGodMode('1');":''}`);
    g.key('`');
    g.run(`window.g1Renders=0;window.g1Render=render;render=()=>{window.g1Renders++;window.g1Render();};
      playSound=()=>{throw new Error('goldADD must not play sound');};
      Math.random=()=>{throw new Error('goldADD must not consume RNG');};`);
    for (const [command,amount] of [['goldADD 250',250],['  GOLDADD   0003  ',3],['goldadd 1',1]]) {
      const before=goldSnapshot(g),gold=g.run('state.gold'),renders=g.run('window.g1Renders');
      g.elements.consoleInput.value=command;g.key('Enter',{target:g.elements.consoleInput});
      assert.equal(g.run('state.gold'),gold+amount);
      assert.equal(String(g.elements.gold.textContent),String(gold+amount));
      assert.equal(g.run('window.g1Renders'),renders+1);
      assert.match(g.run('state.consoleLines.at(-1)'),new RegExp(`Added ${amount} gold; total ${gold+amount}\\.`));
      g.run(`state.gold=${gold}`);assert.equal(goldSnapshot(g),before,`${area}/${god}/${command}`);
      g.run(`state.gold=${gold+amount}`);
    }
    assert.equal(g.run('state.consoleOpen'),true);
  }
});

test('G1 goldADD rejects invalid text, extra arguments and non-string helper inputs atomically', () => {
  const g=game();g.key('`');
  g.run(`state.gold=40;render();Math.random=()=>{throw new Error('invalid gold RNG');};
    playSound=()=>{throw new Error('invalid gold sound');};`);
  const invalid=['','0','-1','+3','1.5','3.0','1e2','1E2','0x10','0b10','NaN','Infinity','abc',
    '1_000','1,000','3 extra','1 2','9007199254740992','9999999999999999999999999999999999999999','٣','３'];
  for (const text of invalid) {
    const before=goldSnapshot(g);
    g.elements.consoleInput.value=`goldADD ${text}`;g.key('Enter',{target:g.elements.consoleInput});
    assert.equal(goldSnapshot(g),before,text);
    assert.equal(String(g.elements.gold.textContent),'40');
    assert.match(g.run('state.consoleLines.at(-1)'),/Usage: goldADD <positive integer>/);
  }
  for (const args of ['"3","extra"','','null','undefined','true','3','[3]','{}','" 3 "','"3\\n"']) {
    const before=goldSnapshot(g);g.run(`addGold(${args})`);
    assert.equal(goldSnapshot(g),before,`helper ${args}`);
    assert.match(g.run('state.consoleLines.at(-1)'),/Usage: goldADD <positive integer>/);
  }
});

test('G1 goldADD preserves exact safe-integer limits and rejects invalid current gold', () => {
  const g=game();g.key('`');
  g.run('state.gold=Number.MAX_SAFE_INTEGER-1;addGold("1")');
  assert.equal(g.run('state.gold'),Number.MAX_SAFE_INTEGER);
  assert.equal(String(g.elements.gold.textContent),String(Number.MAX_SAFE_INTEGER));
  for (const gold of ['Number.MAX_SAFE_INTEGER','Number.MAX_SAFE_INTEGER-1','Number.MAX_SAFE_INTEGER+1',
    '-1','NaN','Infinity','-Infinity','1.5','"40"','null','undefined']) {
    g.run(`state.gold=${gold}`);const before=goldSnapshot(g);
    g.run('addGold("2")');assert.equal(goldSnapshot(g),before,gold);
    assert.match(g.run('state.consoleLines.at(-1)'),/Usage: goldADD <positive integer>/);
  }
  g.run('state.gold=0;addGold("9007199254740991")');
  assert.equal(g.run('state.gold'),Number.MAX_SAFE_INTEGER);
});

test('G1 goldADD blocks inactive, hidden, dead, menu and cinematic contexts', () => {
  const cases=['state.started=false','state.area="invalid"','state.gameOver=true','state.player.hp=0','state.player.hp=-1',
    'document.hidden=true','state.helpOpen=true','state.pause={kind:"health"}','state.pause={kind:"retreat"}',
    'state.ending={completed:false}','state.bossIntro={completed:false}','state.bossDefeat={completed:false}',
    'state.trade={snapshot:{gold:123}}','state.companionPicker={id:123}',
    'document.getElementById("companionOverlay").hidden=false',
    'document.getElementById("tradeOverlay").hidden=false'];
  for (const [index,setup] of cases.entries()) {
    const g=game(42,true,index%2?'town':'dungeon');g.key('`');
    g.run(`state.gold=40;render();${setup};Math.random=()=>{throw new Error('blocked gold RNG');};
      playSound=()=>{throw new Error('blocked gold sound');};`);
    const before=goldSnapshot(g);g.elements.consoleInput.value='goldADD 250';
    g.key('Enter',{target:g.elements.consoleInput});
    assert.equal(goldSnapshot(g),before,setup);
    assert.equal(String(g.elements.gold.textContent),'40');
    assert.match(g.run('state.consoleLines.at(-1)'),/Cannot add gold now/,setup);
  }
});

test('G1 goldADD discovery appears in startup and help reply without depending on command echoes', () => {
  const g=game();g.key('`');
  assert.match(g.run('state.consoleLines[0]'),/goldADD <amount>/);
  g.elements.consoleInput.value='clear';g.key('Enter',{target:g.elements.consoleInput});
  g.elements.consoleInput.value='help';g.key('Enter',{target:g.elements.consoleInput});
  assert.match(g.run('state.consoleLines.at(-1)'),/goldADD <amount>/);
  assert.equal(g.elements.consoleInput.value,'');
});

test('console help lists teleportTown and addScrolls', () => {
  const g = game();
  g.key('`'); const input = g.elements.consoleInput;
  assert.ok(g.elements.consoleOutput.textContent.includes('teleportTown'), g.elements.consoleOutput.textContent);
  assert.ok(g.elements.consoleOutput.textContent.includes('addScrolls'));
  input.value = 'help'; g.key('Enter', { target: input });
  assert.ok(g.elements.consoleOutput.textContent.includes('teleportTown · addScrolls <n>'));
});

test('trade entry helpers always open a cart in the no-DOM harness and never buy or sell immediately', () => {
  const g=game();g.run(`enterFloor(2,false,true);state.gold=500;equipItem('weapon',{...ITEM_TABLE[1]});
    state.merchant.stock=[{...ITEM_TABLE[5],id:111}];state.player.x=state.merchant.x;state.player.y=state.merchant.y;buyFromMerchant()`);
  assert.equal(g.run('state.merchant.stock.length'),1);assert.equal(g.run('state.gold'),500);
  g.run(`tradeBuy('stock:0');closeTrade(false)`);assert.equal(g.run('state.player.maxHp'),60);assert.equal(g.run('state.gold'),500);
  g.run(`sellToMerchant()`);assert.equal(g.run('state.equipment.weapon.name'),'Sword');
  g.run(`tradeSell('weapon');confirmTrade()`);assert.equal(g.run('state.equipment.weapon'),null);assert.equal(g.run('state.gold'),520);
});

test('companion registry and selection state initialize', () => {
  const g = game();
  assert.equal(g.run('!!COMPANIONS.marmalade && !!COMPANIONS.pip && !!COMPANIONS.dragon'), true);
  assert.deepEqual(g.json('state.unlockedCompanions'), ['marmalade','pip']);
  assert.equal(g.run('state.selectedCompanion'), 'marmalade');
  assert.equal(g.run('Object.keys(state.floors).length === 0 || !Object.keys(state.floors[1]||{}).includes("selectedCompanion")'), true);
});

test('Pip can be selected as starting companion and auto-joins', () => {
  const g = game(42, true, 'town');
  g.run('setCompanionChoice("pip"); render()');
  assert.equal(g.run('state.selectedCompanion'), 'pip');
  g.run('state.player.x=state.townGate.x; state.player.y=state.townGate.y; pickup()');
  assert.equal(g.run('state.area'), 'dungeon');
  assert.equal(g.run('state.companion.name'), 'Pip');
  assert.equal(g.run('state.companion.behavior || state.companion.kind'), 'sidekick');
  assert.ok(!g.run('entranceCatActor().hidden'));
  const pipHidden = g.run(`(() => { const a=((state.town&&state.town.animals)||[]).find(x=>x.name==='Pip'); return a ? !!a.hidden : null; })()`);
  assert.equal(pipHidden, true);
});

test('boss defeat unlocks companion and adoption selects it', () => {
  const g = game();
  g.run(`enterFloor(5,false,true); const b=state.boss; damageMonster(b,b.hp);`);
  assert.equal(g.run('state.unlockedCompanions.includes("mimic")'), true);
  assert.equal(g.run('state.selectedCompanion'), 'mimic');
  assert.equal(g.run('state.companion.name'), 'Mimic');
});


test('C1 registry roles and string-ID actor poses resolve authored frames for every companion', () => {
  const g=game();enableMotion(g);
  const rows=g.json(`(()=>{const rows=[];for(const id of Object.keys(COMPANIONS)){
    const c=makeCompanion(id,5,5);state.companion=c;
    for(const direction of ['front','back','left','right'])for(const time of [0,.125,.5,1.5]){
      state.motion.time=time;state.motion.directions.companion=direction;
      const pose=actorAnimationPose(c.sprite,c),frame=artFrame(c.sprite,pose.frame,direction);
      rows.push({id,sprite:c.sprite,scale:c.scale,frame:pose.frame,valid:!!frame&&typeof frame.r==='string'});
    }}return rows;})()`);
  const roles={marmalade:'catCompanion',pip:'dog',mimic:'mimic',hydra:'hydra',boar:'boar',medusa:'medusa',
    wizard:'darkWizard',skeletonKing:'skeletonKing',dragon:'dragonBoss',cook:'cook',bartender:'bartender'};
  for(const row of rows){assert.equal(row.sprite,roles[row.id]);assert.equal(row.valid,true,JSON.stringify(row));
    assert.ok(Number.isInteger(row.frame)&&row.frame>=0&&row.frame<4,JSON.stringify(row));
    assert.equal(row.scale,row.id==='marmalade'?1.5:row.id==='pip'?.7:.55);}
  assert.equal(g.run("makeCompanion('missing',5,5)"),null);
  assert.equal(g.run("actorAnimationPose('dragonBoss',{id:7}).frame"),3,'numeric monster phase stays unchanged at time 1.5');
});

test('C1 restart, death and ending reset companion run progress without reopening branding', () => {
  for(const end of ['restart','death','ending']){
    const g=game();
    g.run(`unlockCompanion('mimic');activateCompanion('mimic');state.companionChoice='pip';
      state.companionPicker={old:true};document.getElementById('companionOverlay').hidden=false;`);
    if(end==='restart')g.run('newGame()');
    else if(end==='death')g.run('gameOver(false)');
    else reachEnding(g);
    assert.deepEqual(g.json('[state.selectedCompanion,state.companionChoice,state.unlockedCompanions,state.companionEntryDone,state.companionPicker,state.companion]'),
      ['marmalade','marmalade',['marmalade','pip'],false,null,null],end);
    assert.equal(g.elements.companionOverlay.hidden,true,end);
    assert.equal(g.run('state.started'),true);
    assert.equal(g.elements.launchScreen.hidden,true);
  }
});

test('C1 both starters join once across manual recruitment, first descent and town returns', () => {
  for(const id of ['marmalade','pip'])for(const manual of [false,true]){
    const g=game(42,true,'town');
    g.run(`setCompanionChoice('${id}')`);
    if(manual){assert.equal(g.run('joinSelectedCompanion(false)'),true);g.run('window.c1First=state.companion');}
    g.run('enterDungeonFromTown()');
    assert.equal(g.run('state.companion.id'),id);
    assert.equal(g.run('state.companionEntryDone&&state.entranceCat.entered'),true);
    if(manual)assert.equal(g.run('state.companion===window.c1First'),true,'first descent preserves manually recruited actor');
    const before=g.json('[state.companion.id,state.companionAttackAt,state.companionQuoteIndex]');
    g.run('enterTown();enterDungeonFromTown()');
    assert.deepEqual(g.json('[state.companion.id,state.companionAttackAt,state.companionQuoteIndex]'),before);
    assert.equal(g.run('joinSelectedCompanion(true)'),false);
    assert.equal(g.run("!!entranceCatActor().hidden"),id==='marmalade');
    assert.equal(g.run("!!state.town.animals.find(a=>a.name==='Pip').hidden"),id==='pip');
  }
  const g=game(42,true,'town');
  g.run("setCompanionChoice('pip');state.entranceCat={recruited:true,entered:true,retired:true}");
  assert.equal(g.run('joinSelectedCompanion(false)'),true,'Pip does not depend on cat lifecycle latches');
  assert.equal(g.run('state.companion.id'),'pip');
});

test('C1 all nine boss species unlock once, adopt correct art and preserve rewards and defeated floors', () => {
  const g=game();
  for(const [depth,id] of [[3,'cook'],[5,'mimic'],[7,'bartender'],[10,'hydra'],[20,'boar'],[30,'medusa'],[40,'wizard'],[50,'skeletonKing'],[100,'dragon']]){
    g.run(`enterFloor(${depth},false,true);clearBossIntro();state.player.xpNext=10000000;
      window.c1Boss=state.boss;window.c1Before=[state.gold,state.player.xp,state.kills];
      damageMonster(state.boss,state.boss.hp);`);
    assert.equal(g.run('state.companion.id'),id);
    assert.equal(g.run('state.selectedCompanion'),id);
    assert.equal(g.run(`state.unlockedCompanions.filter(x=>x==='${id}').length`),1);
    assert.equal(g.run('state.gold-window.c1Before[0]'),g.run('window.c1Boss.gold||0'));
    assert.equal(g.run('state.player.xp-window.c1Before[1]'),g.run('window.c1Boss.xp'));
    assert.equal(g.run('state.kills-window.c1Before[2]'),1);
    const before=g.json('[state.gold,state.player.xp,state.kills,state.unlockedCompanions,state.messages]');
    g.run('damageMonster(window.c1Boss,1000)');
    assert.deepEqual(g.json('[state.gold,state.player.xp,state.kills,state.unlockedCompanions,state.messages]'),before);
    assert.equal(g.run(`state.floors[${depth}].bossDefeated`),true);
    g.run(`enterTown();enterFloor(${depth},false)`);
    assert.equal(g.run('state.boss'),null);
    assert.equal(g.run('state.companion.id'),id);
    assert.equal(g.run('state.unlockedCompanions.length'),new Set(g.json('state.unlockedCompanions')).size);
    for(const field of ['companion','selectedCompanion','companionChoice','unlockedCompanions','companionEntryDone','companionPicker']){
      assert.equal(g.run(`FLOOR_FIELDS.includes('${field}')||Object.hasOwn(state.floors[${depth}],'${field}')||Object.hasOwn(state.town,'${field}')`),false,field);
    }
  }
});

test('C1 activation clears follower motion and restores town starter actors without moving their patrols', () => {
  const g=game(42,true,'town');enableMotion(g);
  g.run(`window.c1Animals=JSON.stringify(state.town.animals.map(({hidden,...a})=>a));
    joinSelectedCompanion(false);state.activeTime=20;state.companionSpeech={text:'old'};
    state.motion.moves.companion={fromX:100,fromY:100,x:100,y:100,at:0,duration:99};
    window.c1Move=state.motion.moves.companion;state.motion.directions.companion='back';
    state.motion.facing.companion=-1;activateCompanion('pip');`);
  assert.equal(g.run('state.motion.moves.companion===window.c1Move'),false);
  assert.notEqual(g.run('state.motion.directions.companion'),'back');
  assert.deepEqual(g.json('[state.companionSpeech,state.companionSpeechReadyAt,state.companionAttackAt]'),[null,20,23]);
  assert.equal(g.run('!!entranceCatActor().hidden'),false);
  assert.equal(g.run("!!state.town.animals.find(a=>a.name==='Pip').hidden"),true);
  g.run("unlockCompanion('cook');activateCompanion('cook')");
  assert.equal(g.run('!!entranceCatActor().hidden'),false);
  assert.equal(g.run("!!state.town.animals.find(a=>a.name==='Pip').hidden"),false);
  assert.equal(g.run('JSON.stringify(state.town.animals.map(({hidden,...a})=>a))===window.c1Animals'),true);
});

test('C1 invalid or locked selection cannot silently create Marmalade or unlock a boss', () => {
  const g=game(42,true,'town');
  const before=g.json('[state.selectedCompanion,state.companionChoice,state.unlockedCompanions,state.companion,state.messages]');
  g.run("setCompanionChoice('mimic');setCompanionChoice('missing');activateCompanion('mimic');adoptBossCompanion({name:'Mimic'})");
  assert.deepEqual(g.json('[state.selectedCompanion,state.companionChoice,state.unlockedCompanions,state.companion,state.messages]'),before);
  assert.equal(g.run("unlockCompanion('missing')"),false);
  assert.equal(g.run("unlockCompanion('mimic')"),true);
  const logs=g.run('state.messages.length');
  assert.equal(g.run("unlockCompanion('mimic')"),false);
  assert.equal(g.run('state.messages.length'),logs);
});

test('C1 Marmalade may be reselected after retirement without repeating its once-only remark', () => {
  const g=game(42,true,'dungeon',true);
  g.run('enterFloor(5,false,true);damageMonster(state.boss,state.boss.hp);enterTown();state.player.x=state.town.landmarks.companionBoard.x;state.player.y=state.town.landmarks.companionBoard.y;openCompanionBoard();selectCompanion("marmalade",state.companionPicker)');
  assert.equal(g.run('state.companion.id'),'marmalade');
  assert.equal(g.run('state.entranceCat.retired'),true);
  g.run('enterFloor(7,false,true);damageMonster(state.boss,state.boss.hp)');
  assert.equal(g.run('state.companion.id'),'bartender');
  assert.equal(g.run('state.messages.filter(m=>/household budget/i.test(m)).length'),1);
});

test('C1 Pip uses sidekick remarks and nearest deterministic targeting while preserving three-second cadence', () => {
  const g=game(42,true,'town');
  g.run(`setCompanionChoice('pip');enterDungeonFromTown();state.player.x=4;state.player.y=5;
    state.companion.x=5;state.companion.y=5;state.hazards=[];
    for(let y=3;y<9;y++)for(let x=3;x<10;x++)state.map[y][x]=0;
    state.monsters=[{id:9,x:8,y:5},{id:6,x:6,y:5},{id:2,x:5,y:6}].map(m=>({...m,name:'Slime',sprite:'slime',hp:10,maxHp:10,def:0,xp:0}));
    updateCamera();revealAroundPlayer();state.activeTime=20;state.companionAttackAt=0;
    state.companionSpeechReadyAt=0;Math.random=()=>{throw new Error('companion choice consumed RNG');};
    companionTalk('boss');companionTick();`);
  assert.equal(g.run('COMPANION_LINES.sidekick.includes(state.companionSpeech.text)'),true);
  assert.deepEqual(g.json('state.monsters.map(m=>[m.id,m.hp])'),[[9,10],[6,10],[2,9]]);
  assert.equal(g.run('state.companionAttackAt'),23);
  g.run('state.activeTime=22.99;companionTick()');
  assert.equal(g.run('state.monsters[2].hp'),9);
  g.run('state.activeTime=23;companionTick()');
  assert.equal(g.run('state.monsters[2].hp'),8);
});

function c2AtPost(g) {
  g.run(`{const c2Post=state.town.landmarks.companionBoard;state.player.x=c2Post.x;state.player.y=c2Post.y;
    updateCamera();render();document.getElementById('companionPostAction').focus();}`);
}

test('C2 launch arrows select and focus without starting; Enter or Space explicitly starts with that card', () => {
  for(const key of ['Enter',' ']){
    const g=game(42,false,'town',true);
    g.key('ArrowRight');assert.equal(g.run('state.started'),false);
    assert.equal(g.run('state.companionChoice'),'pip');
    assert.equal(g.run('document.activeElement.dataset.companionChoice'),'pip');
    g.key('ArrowLeft');assert.equal(g.run('state.companionChoice'),'marmalade');
    g.key('End');assert.equal(g.run('state.companionChoice'),'pip');
    g.key('Tab');assert.equal(g.run('state.started'),false);
    g.key(key);assert.equal(g.run('state.started'),true);
    assert.equal(g.run('state.selectedCompanion'),'pip');
  }
  const g=game(42,false,'town',true);g.click('choice_pip');
  assert.equal(g.run('state.started'),false);assert.equal(g.run('state.companionChoice'),'pip');
  g.click('startGame');assert.equal(g.run('state.selectedCompanion'),'pip');
});

test('C2 post is reachable, clear of landmarks and actor paths, and drawn without missing artwork', () => {
  for(const seed of [1,42,713]){
    const g=game(seed,true,'town');
    assert.equal(g.run(`(()=>{const b=state.town.landmarks.companionBoard;
      return !!b&&state.map[b.y][b.x]===0&&floorDistances(state.map,state.town.spawn).has(b.x+','+b.y)
      &&![state.inn,state.merchant,state.townGate,state.town.spawn].some(p=>nearbyTile(b.x,b.y,p))
      &&![...state.town.npcs,...state.town.animals].some(a=>[a,...(a.path||[])].some(p=>p.x===b.x&&p.y===b.y))
      &&state.props.filter(p=>p.isCompanionBoard).length===1&&!b.sprite;})()`),true);
    g.run('state.player.x=state.town.landmarks.companionBoard.x;state.player.y=state.town.landmarks.companionBoard.y;updateCamera();clearMovementAnimation()');
    g.calls.clear();g.run('drawCompanionPost(state.town.landmarks.companionBoard)');
    assert.ok(g.calls.filter(c=>c[0]==='fillRect').length>=10);
  }
});

test('C2 Space recruits either selected starter and never swaps to the other town animal', () => {
  for(const id of ['pip','marmalade']){
    const g=game(42,true,'town');
    g.run(`setCompanionChoice('${id}');const c2Starter=selectedCompanionActor();state.player.x=c2Starter.x;state.player.y=c2Starter.y`);
    g.key(' ');assert.equal(g.run('state.companion.id'),id);
    g.run('window.c2Starter=state.companion;enterDungeonFromTown()');
    assert.equal(g.run('state.companion===window.c2Starter'),true);
    assert.equal(g.run("!!entranceCatActor().hidden"),id==='marmalade');
    assert.equal(g.run("!!state.town.animals.find(a=>a.name==='Pip').hidden"),id==='pip');
  }
  const g=game(42,true,'town');g.run("setCompanionChoice('marmalade');const c2Other=state.town.animals.find(a=>a.name==='Pip');state.player.x=c2Other.x;state.player.y=c2Other.y");
  g.key(' ');assert.equal(g.run('state.selectedCompanion'),'marmalade');assert.equal(g.run('state.companion'),null);
});

test('C2 picker traps focus, preserves cancel and same-choice state, and labels locked companions', () => {
  const g=game(42,true,'town',true);g.run('joinSelectedCompanion(false)');c2AtPost(g);
  const before=debugPortalSnapshot(g);g.click('companionPostAction');
  assert.equal(g.run('!!state.companionPicker'),true);assert.equal(g.elements.gameLayout.inert,true);
  assert.equal(g.elements.launchScreen.inert,true);assert.equal(g.run('document.activeElement===document.getElementById("closeCompanionBoard")'),true);
  assert.equal(g.run("document.getElementById('companionOverlay').querySelectorAll('[data-companion-id]').length"),11);
  assert.equal(g.run("document.getElementById('companionOverlay').querySelectorAll('[data-companion-id]').filter(b=>b.disabled).length"),9);
  g.key('Tab',{shiftKey:true});assert.equal(g.run('document.activeElement===document.getElementById("companionAudioToggle")'),true);
  g.key('Tab');assert.equal(g.run('document.activeElement===document.getElementById("closeCompanionBoard")'),true);
  g.key('ArrowDown');g.key('ArrowDown');assert.equal(g.run('document.activeElement.dataset.companionId'),'pip');
  assert.deepEqual(debugPortalSnapshot(g),before,'focus is only a preview');
  g.key('Escape');assert.deepEqual(debugPortalSnapshot(g),before);
  assert.equal(g.run('state.companionPicker'),null);assert.equal(g.elements.gameLayout.inert,false);
  assert.equal(g.run('document.activeElement===document.getElementById("companionPostAction")'),true);
  g.click('companionPostAction');
  g.run("document.getElementById('companionBoardList').querySelectorAll('[data-companion-id]').find(b=>b.dataset.companionId==='marmalade').onclick()");
  assert.deepEqual(debugPortalSnapshot(g),before,'keeping the active companion cannot reset attack/speech readiness');
});

test('C2 confirmed choice applies once; locked, stale, moved and closed-session callbacks cannot select', () => {
  const g=game(42,true,'town',true);c2AtPost(g);g.click('companionPostAction');
  g.run("window.c2Old=state.companionPicker;window.c2OldChoose=document.getElementById('companionBoardList').querySelectorAll('[data-companion-id]').find(b=>b.dataset.companionId==='pip').onclick");
  let before=debugPortalSnapshot(g);
  assert.equal(g.run("selectCompanion('mimic',state.companionPicker)"),false);
  assert.deepEqual(debugPortalSnapshot(g),before);
  g.key('Escape');g.click('companionPostAction');before=debugPortalSnapshot(g);
  g.run('window.c2OldChoose();closeCompanionBoard(window.c2Old)');assert.deepEqual(debugPortalSnapshot(g),before);
  assert.equal(g.run('!!state.companionPicker'),true);
  g.run('state.player.x+=5');before=debugPortalSnapshot(g);
  assert.equal(g.run("selectCompanion('pip',state.companionPicker)"),false);
  assert.deepEqual(debugPortalSnapshot(g),before);g.key('Escape');c2AtPost(g);g.click('companionPostAction');
  g.run("window.c2Choose=document.getElementById('companionBoardList').querySelectorAll('[data-companion-id]').find(b=>b.dataset.companionId==='pip').onclick;window.c2Choose()");
  assert.equal(g.run('state.companion.id'),'pip');assert.equal(g.run('state.companionPicker'),null);
  before=debugPortalSnapshot(g);g.run('window.c2Choose();window.c2OldChoose()');assert.deepEqual(debugPortalSnapshot(g),before);
});

test('C2 picker rejects launch, dungeon, distance, hidden and conflicting overlays', () => {
  const cases=['state.started=false',"state.area='dungeon'",'state.player.x+=5','state.gameOver=true','state.player.hp=0',
    'document.hidden=true','state.helpOpen=true','state.consoleOpen=true','state.trade={}',
    'state.pause={kind:"health"}','state.pause={kind:"retreat"}','state.ending={completed:false}',
    'state.bossIntro={completed:false}','state.bossDefeat={completed:false}'];
  for(const setup of cases){const g=game(42,true,'town',true);c2AtPost(g);g.run(setup);
    const before=debugPortalSnapshot(g);assert.equal(g.run('openCompanionBoard()'),false,setup);
    assert.deepEqual(debugPortalSnapshot(g),before,setup);assert.equal(g.run('state.companionPicker'),null);}
});

test('C2 picker freezes actions and town motion, blocks nested overlays and supports M and R', () => {
  const g=game(42,true,'town',true);enableMotion(g);c2AtPost(g);g.click('companionPostAction');
  const before=debugPortalSnapshot(g),town=g.json('[state.town.tick,state.town.npcs,state.town.animals,state.motion.time]');
  g.key('?');g.key('`');g.key('ArrowRight');g.key('f');g.key('j');
  g.run('openHelp();openConsole();openTrade();townTick();enemyTick();advanceMotion(50);advanceActiveTime(50);movePlayer(1,0);pickup();useTownScroll();castSpell("heal");restAtInn()');
  assert.deepEqual(debugPortalSnapshot(g),before);
  assert.deepEqual(g.json('[state.town.tick,state.town.npcs,state.town.animals,state.motion.time]'),town);
  assert.deepEqual(g.json('[state.helpOpen,state.consoleOpen]'),[false,false]);
  const enabled=g.run('state.audio.enabled');g.key('m');assert.equal(g.run('state.audio.enabled'),!enabled);
  assert.equal(g.run('!!state.companionPicker'),true);
  g.key('r');assert.equal(g.run('state.companionPicker'),null);assert.equal(g.elements.companionOverlay.hidden,true);
  assert.equal(g.elements.launchScreen.hidden,true);assert.equal(g.elements.gameLayout.inert,false);
  assert.equal(g.run('state.audio.enabled'),!enabled);assert.equal(g.run('state.selectedCompanion'),'marmalade');
});

test('C2 forced travel, loadLevel and death discard a picker before old choices can act', () => {
  for(const action of ['enterFloor(2,false)','loadLevel("2")','gameOver(false)']){
    const g=game(42,true,'town',true);c2AtPost(g);g.click('companionPostAction');
    g.run(`window.c2Stale=state.companionPicker;${action}`);
    const before=debugPortalSnapshot(g);g.run("selectCompanion('pip',window.c2Stale)");
    assert.deepEqual(debugPortalSnapshot(g),before,action);
    assert.equal(g.run('state.companionPicker'),null);assert.equal(g.elements.companionOverlay.hidden,true);
    assert.equal(g.elements.gameLayout.inert,false);
  }
});

function c3Snapshot(g) {
  return [debugPortalSnapshot(g),g.json('[state.monsters,state.companionAttackAt,state.companionSpeech,state.companionSpeechReadyAt,state.motion.time,state.motion.projectiles,state.hazardTime]')];
}

function c3CombatFixture(g) {
  g.run(`state.player.x=5;state.player.y=5;state.player.hp=37;state.player.mp=0;
    state.companion.x=6;state.companion.y=5;state.activeTime=20;state.companionAttackAt=0;
    state.combatElapsed=10;state.healElapsed=0;state.manaRegenAt=0;state.pause=null;
    for(let y=2;y<=11;y++)for(let x=2;x<=13;x++)state.map[y][x]=0;
    state.monsters=[{id:1,name:'Bat',sprite:'bat',x:7,y:5,hp:100,maxHp:100,def:0,xp:0}];
    state.hazards=[{type:'rocks',x:5,y:5,revealed:true,stage:'warning',impactAt:0}];
    clearBossIntro();clearBossDefeat();updateCamera();revealAroundPlayer();`);
}

test('C3 simulation helpers independently freeze companion combat, hazards, recovery, mana and motion', () => {
  const cases=['state.started=false','state.gameOver=true','document.hidden=true','state.helpOpen=true',
    'state.consoleOpen=true','state.pause={kind:"health"}','state.pause={kind:"retreat"}',
    'state.trade={}','state.companionPicker={}','state.ending={completed:false}',
    'state.bossIntro={completed:false}','state.bossDefeat={completed:false}'];
  for(const setup of cases){
    const g=game();enableMotion(g);c3CombatFixture(g);g.run(setup);
    let before=c3Snapshot(g);g.run('companionTick();hazardTick();applyPlayerHazards()');
    assert.deepEqual(c3Snapshot(g),before,setup+' combat/hazards');
    g.run('state.monsters=[]');before=c3Snapshot(g);
    g.run('recoveryTick(10);regenMana();advanceActiveTime(10);advanceMotion(10)');
    assert.deepEqual(c3Snapshot(g),before,setup+' recovery/clocks');
  }
});

test('C3 direct retreat cannot journal or stack a pause behind a companion picker', () => {
  const g=game(42,true,'town',true);c2AtPost(g);g.click('companionPostAction');
  const before=c3Snapshot(g);g.run('retreat();confirmRetreat();cancelRetreat();continueGame()');
  assert.deepEqual(c3Snapshot(g),before);assert.equal(g.run('!!state.companionPicker'),true);
});

test('C3 all companion identities and deadlines survive stairs, scroll returns and retreat', () => {
  const g=game(42,true,'town',true);
  for(const id of g.json('Object.keys(COMPANIONS)')){
    g.run(`enterTown();unlockCompanion('${id}');`);c2AtPost(g);g.click('companionPostAction');
    g.run(`selectCompanion('${id}',state.companionPicker);window.c3Actor=state.companion;
      state.player.hp=37;state.player.mp=7;state.activeTime=50;state.retreatReadyAt=0;state.townScrolls=2;
      window.c3Ready=state.companionAttackAt;window.c3Roster=JSON.stringify(state.unlockedCompanions);enterFloor(2,false);`);
    const exit=g.json('[state.depth,state.player.x,state.player.y]');
    g.run('useTownScroll()');assert.equal(g.run('state.area'),'town');
    assert.equal(g.run('state.companion===window.c3Actor'),true,id);
    assert.deepEqual(g.json('[state.player.hp,state.player.mp,state.townScrolls]'),[37,7,1]);
    g.run('useTownScroll()');assert.deepEqual(g.json('[state.depth,state.player.x,state.player.y]'),exit);
    up(g);assert.equal(g.run('state.depth'),1);g.run('enterFloor(2,false)');
    assert.equal(g.run('state.companionAttackAt===window.c3Ready'),true,id);
    g.run('state.player.hp=5;checkHealth();retreat();confirmRetreat()');
    assert.equal(g.run('state.area'),'town');assert.equal(g.run('state.townExit.reason'),'retreat');
    assert.equal(g.run('state.player.hp===state.player.maxHp'),true);
    assert.deepEqual(g.json('[state.player.mp,state.townScrolls,state.retreatReadyAt,state.activeTime]'),[7,1,110,50]);
    assert.equal(g.run('state.companion===window.c3Actor&&JSON.stringify(state.unlockedCompanions)===window.c3Roster'),true,id);
    g.run('enterDungeonFromTown()');
    assert.equal(g.run('state.companion===window.c3Actor&&state.companion.id===state.selectedCompanion'),true,id);
    assert.equal(g.run('Math.max(Math.abs(state.companion.x-state.player.x),Math.abs(state.companion.y-state.player.y))===1&&companionTileOpen(state.companion.x,state.companion.y)'),true,id);
    assert.equal(g.run('state.companionAttackAt===window.c3Ready'),true,id);
    assert.equal(g.run('!!entranceCatActor().hidden'),id==='marmalade');
    assert.equal(g.run("!!state.town.animals.find(a=>a.name==='Pip').hidden"),id==='pip');
    for(const field of ['companion','selectedCompanion','unlockedCompanions','companionPicker','companionEntryDone'])
      assert.equal(g.run(`Object.hasOwn(state.floors[2],'${field}')||Object.hasOwn(state.town,'${field}')`),false,field);
  }
});

test('C3 every companion preserves its damage, target policy and three-active-second cadence', () => {
  const g=game();
  for(const id of g.json('Object.keys(COMPANIONS)')){
    g.run(`unlockCompanion('${id}');activateCompanion('${id}');`);
    c3CombatFixture(g);
    g.run(`state.hazards=[];state.monsters=[{id:7,name:'Slime',sprite:'slime',x:6,y:6,hp:100,maxHp:100,def:0,xp:0},
      {id:2,name:'Bat',sprite:'bat',x:7,y:5,hp:100,maxHp:100,def:0,xp:0}];
      Math.random=()=>{throw new Error('companion consumed RNG');};companionTick()`);
    assert.deepEqual(g.json('state.monsters.map(m=>m.hp)'),id==='marmalade'?[100,98]:id==='pip'?[100,99]:[99,100],id);
    assert.equal(g.run('state.companionAttackAt'),23);
    const hp=g.json('state.monsters.map(m=>m.hp)');g.run('state.activeTime=22.99;companionTick()');
    assert.deepEqual(g.json('state.monsters.map(m=>m.hp)'),hp,id);
    g.run('state.activeTime=23;companionTick()');
    assert.deepEqual(g.json('state.monsters.map(m=>m.hp)'),id==='marmalade'?[100,96]:id==='pip'?[100,98]:[98,100],id);
  }
});

test('C3 every companion lights and explores terrain without minimap entity or hidden-spike leakage', () => {
  const g=game();
  for(const id of g.json('Object.keys(COMPANIONS)')){
    g.run(`unlockCompanion('${id}');activateCompanion('${id}');state.player.x=5;state.player.y=5;
      state.companion.x=8;state.companion.y=5;state.visited=new Set();state.monsters=[];state.props=[];
      state.stairs=null;state.upstairs=null;state.floorKey=null;state.hazards=[];state.treasures=[];state.potions=[];
      for(let y=1;y<12;y++)for(let x=1;x<18;x++)state.map[y][x]=0;
      updateCamera();clearMovementAnimation();revealAroundPlayer();`);
    assert.equal(g.run("state.visited.has('10,5')"),true,id);assert.equal(g.run('fogLevel(10,5)'),0,id);
    assert.equal(g.run("state.visited.has('11,5')"),false,id);assert.equal(g.run('fogLevel(13,5)'),3,id);
    g.minimapCalls.clear();g.run('renderMinimap()');const chart=JSON.stringify(g.minimapCalls.toArray());
    g.run(`state.monsters=[{id:91,x:15,y:5,sprite:'goblin',hp:10,maxHp:10}];
      state.hazards=[{type:'spikes',x:10,y:5,revealed:false,triggered:false}];
      state.potions=[{x:15,y:5}];state.treasures=[{x:15,y:5}];state.floorKey={drop:{x:15,y:5}};`);
    g.minimapCalls.clear();g.run('renderMinimap()');assert.equal(JSON.stringify(g.minimapCalls.toArray()),chart,id);
    assert.equal(g.run('state.hazards[0].revealed||state.hazards[0].triggered'),false,id);
  }
});

test('C3 hidden picker keeps its session and rejects selection until visibility returns without catch-up', () => {
  const g=game(42,true,'town',true);enableMotion(g);c2AtPost(g);g.click('companionPostAction');
  g.run('window.c3Session=state.companionPicker;document.hidden=true');g.visibility();
  const before=c3Snapshot(g);
  assert.equal(g.run("selectCompanion('pip',window.c3Session)"),false);
  g.run('enemyTick();townTick();advanceActiveTime(99);advanceMotion(99)');assert.deepEqual(c3Snapshot(g),before);
  assert.equal(g.run('state.companionPicker===window.c3Session'),true);
  g.run('document.hidden=false');g.visibility();
  assert.equal(g.run('state.motion.lastTimestamp'),null);
  assert.equal(g.run("selectCompanion('pip',window.c3Session)"),true);
  assert.equal(g.run('state.companion.id'),'pip');assert.equal(g.run('state.companionPicker'),null);
  assert.equal(g.elements.gameLayout.inert,false);
});

test('C3 restart and ending discard picker sessions and cannot resurrect companions via old callbacks', () => {
  for(const action of ['newGame()',`state.depth=100;state.bossDefeated=true;state.princess={rescued:true};state.boss={hp:0,maxHp:160,sprite:'dragonBoss',isDragon:true};startEnding()`]){
    const g=game(42,true,'town',true);c2AtPost(g);g.click('companionPostAction');
    g.run(`window.c3Old=state.companionPicker;window.c3Click=document.getElementById('companionBoardList').querySelectorAll('[data-companion-id]').find(b=>b.dataset.companionId==='pip').onclick;${action}`);
    const before=c3Snapshot(g);g.run('window.c3Click();closeCompanionBoard(window.c3Old)');
    assert.deepEqual(c3Snapshot(g),before);assert.equal(g.run('state.companionPicker'),null);
    assert.equal(g.elements.companionOverlay.hidden,true);assert.equal(g.elements.gameLayout.inert,false);
    assert.equal(g.run('state.companion'),null);
  }
});

test('C3 companion-delivered boss kill awards once, retires Marmalade once and adopts after rewards', () => {
  const g=game();c3CombatFixture(g);
  g.run(`state.player.xpNext=1000000;state.hazards=[];state.monsters=[{id:999,name:'Cook',sprite:'orc',
    x:7,y:5,hp:1,maxHp:1,isBoss:true,def:0,xp:10,gold:11}];
    window.c3Boss=state.monsters[0];window.c3Rewards=[state.gold,state.player.xp,state.kills];companionTick()`);
  assert.deepEqual(g.json('[state.gold-window.c3Rewards[0],state.player.xp-window.c3Rewards[1],state.kills-window.c3Rewards[2]]'),[11,10,1]);
  assert.equal(g.run('state.companion.id'),'cook');assert.equal(g.run('state.bossDefeated&&state.floors[state.depth].bossDefeated'),true);
  assert.equal(g.run('state.messages.filter(m=>/household budget/i.test(m)).length'),1);
  assert.equal(g.run("state.unlockedCompanions.filter(id=>id==='cook').length"),1);
  const before=c3Snapshot(g);g.run('damageMonster(window.c3Boss,1000);companionTick()');assert.deepEqual(c3Snapshot(g),before);
});

test('C3 companion boss kill stops the current enemy tick before surviving monsters can attack', () => {
  const g=game();c3CombatFixture(g);
  g.run(`state.hazards=[];state.player.xpNext=1000000;state.bossIntroSeen=true;state.boss=null;
    state.monsters=[{id:999,name:'Cook',sprite:'orc',x:7,y:5,hp:1,maxHp:1,isBoss:true,def:0,xp:0,gold:0},
      {id:12,name:'Guard',sprite:'skeleton',x:8,y:5,hp:100,maxHp:100,ranged:true,range:9,atk:999,nextAttackAt:0}];
    window.c3EnemyRng=0;Math.random=()=>{window.c3EnemyRng++;return .5;};enemyTick()`);
  assert.equal(g.run('state.player.hp'),37);
  assert.equal(g.run('state.gameOver'),false);
  assert.equal(g.run('bossDefeatActive()'),true);
  assert.equal(g.run('state.monsters[1].nextAttackAt'),0);
  assert.equal(g.run('window.c3EnemyRng'),0);
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

const SAVE_TEST_CONTEXT = {createdAt:'2026-11-26T12:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false};
function saveFixture(g) { return g.json(`captureSaveData(state,${JSON.stringify(SAVE_TEST_CONTEXT)})`); }
function saveParse(g, dto) { return g.json(`parseSaveData(${JSON.stringify(JSON.stringify(dto))})`); }
function saveReject(g, dto, message) {
  const before=goldSnapshot(g);
  assert.throws(()=>saveParse(g,dto),/Invalid save:/,message);
  assert.equal(goldSnapshot(g),before,message);
}

test('S1 snapshot is detached, deterministic and pure in town/dungeon, overlaying stale caches', () => {
  for (const area of ['town','dungeon']) {
    const g=game(713,true,area);
    g.run(`state.gold=293;state.player.hp=37;state.player.mp=7;state.activeTime=14.75;
      state.warnedLow=true;state.retreatReadyAt=72.5;state.inventory=[{name:'Potion',kind:'heal',heal:.499}];
      state.spellReadyAt.fireball=17.25;state.monsterQuoteIndex=7;state.companionQuoteIndex=3;
      state.helpOpen=true;state.bubble={text:'omit',ttl:5};`);
    if (area==='dungeon') g.run('state.potions=state.potions.slice(1);state.hazardTime=3.75;state.monsters[0].hp=4;state.monsters[0].nextAttackAt=16.25');
    else g.run('state.visited=new Set(["38,26"]);state.props=state.props.slice();state.merchant={...state.merchant,stock:state.merchant.stock.slice(1)}');
    const before=goldSnapshot(g);
    g.run(`Math.random=()=>{throw new Error('save consumed RNG');};
      for(const name of ['render','log','playSound','saveFloor','saveTown','equipItem','revealAroundPlayer','activateCompanion','newGame','genLevel','genTown','enterFloor','recreateMonsters'])
        globalThis[name]=()=>{throw new Error('save called '+name);};`);
    const dto=saveFixture(g),again=saveFixture(g);
    assert.deepEqual(dto,again); assert.equal(goldSnapshot(g),before);
    assert.deepEqual(saveParse(g,dto),dto);
    assert.equal(dto.run.player.hp,37);assert.equal(dto.run.gold,293);
    assert.equal('helpOpen' in dto.run,false);assert.equal('art' in dto.run,false);
    if (area==='dungeon') {
      assert.equal(dto.run.floors[1].potions.length,g.run('state.potions.length'));
      assert.notEqual(dto.run.floors[1].potions.length,g.run('state.floors[1].potions.length'));
      assert.equal(dto.run.floors[1].hazardTime,3.75);
      assert.equal(dto.run.encounter.monsters[0].hp,4);
      assert.equal(dto.run.encounter.monsters[0].nextAttackAt,16.25);
    } else {
      assert.equal(dto.run.encounter,null);assert.deepEqual(dto.run.town.visited,['38,26']);
      assert.equal(dto.run.town.store.stock.length,5);
      assert.equal(g.run('state.town.store.stock.length'),6);
      assert.equal(dto.run.town.props[dto.run.town.landmarks.companionBoardIndex].isCompanionBoard,true);
      assert.equal('store' in dto.run.town.landmarks,false);
    }
    dto.run.player.hp=1;dto.run.floors[1].map[0][0]=0;
    assert.equal(g.run('state.player.hp'),37);assert.equal(g.run('state.floors[1].map[0][0]'),1);
  }
});

test('S1 XP round trips preserve levels 1 through 100 including unsafe integer thresholds', () => {
  const g=game(42,true,'town');
  let threshold=40;
  for(let level=1;level<=100;level++) {
    const xpNext=level===100?1:threshold;
    g.run(`state.player.lvl=${level};state.player.xpNext=${xpNext};state.player.xp=${level===100?0:Math.floor(xpNext/2)}`);
    const dto=saveFixture(g);assert.deepEqual(saveParse(g,dto),dto);
    if(level===83||level===99)assert.equal(Number.isSafeInteger(dto.run.player.xpNext),false);
    threshold=Math.round(threshold*1.5);
  }
  const dto=saveFixture(g);dto.run.player.xp=1;saveReject(g,dto,'level cap XP');
  dto.run.player.xp=0;dto.run.player.xpNext=40;saveReject(g,dto,'threshold mismatch');
});

test('S1 current encounter keeps corpse order, dead guard history, boss links and negative HP', () => {
  const g=game();g.run(`render=()=>{};playSound=()=>{};enterFloor(50,false,true);
    for(let i=0;i<100;i++){for(const m of state.monsters)if(m.isGuard)m.hp=-7;state.activeTime+=6;summonThroneGuards();}
    state.bossIntroSeen=true;state.player.hp=37;state.monsters[0].hp=-43;`);
  const before=goldSnapshot(g),dto=saveFixture(g);
  assert.equal(dto.run.encounter.monsters.filter(m=>m.isGuard).length,200);
  assert.equal(dto.run.floors[50].monsterSpawns.some(m=>m.isGuard),false);
  assert.deepEqual(dto.run.encounter.monsters,g.json('state.monsters'));
  assert.equal(dto.run.encounter.bossId,g.run('state.boss.id'));
  assert.equal(dto.run.encounter.bossSummonAt,g.run('state.bossSummonAt'));
  assert.deepEqual(saveParse(g,dto),dto);assert.equal(goldSnapshot(g),before);
  const bad=structuredClone(dto);bad.run.encounter.bossId=12;saveReject(g,bad,'boss alias');
  bad.run.encounter.bossId=999;bad.run.encounter.monsters[0].id=bad.run.encounter.monsters[1].id;saveReject(g,bad,'duplicate encounter ID');
});

test('S1 all eleven companions, ring stats, portals and exact town patrol state round trip', () => {
  for(const id of ['marmalade','pip','mimic','hydra','boar','medusa','wizard','skeletonKing','dragon','cook','bartender']) {
    const g=game(42,true,'town');
    g.run(`unlockCompanion('${id}');activateCompanion('${id}');equipItem('ring',{...ITEM_TABLE[5]});
      state.player.hp=37;state.townExit={depth:1,x:0,y:0,reason:'cheat'};state.townPortalOpen=true;
      state.town.npcs[0].pathIndex=2;state.companionAttackAt=12.75;state.retreatReadyAt=80.5;`);
    const dto=saveFixture(g);assert.deepEqual(saveParse(g,dto),dto);
    assert.equal(dto.run.player.maxHp,80);assert.equal(dto.run.player.hp,37);
    assert.equal(dto.run.townExit.x,0);assert.equal(dto.run.town.map[0][0],1);
    assert.equal(dto.run.companion.id,id);assert.equal(dto.run.companionAttackAt,12.75);
    assert.equal(dto.run.town.npcs[0].pathIndex,2);assert.equal(dto.run.town.npcs[0].x,34);
  }
  const g=game();g.run(`state.townExit={depth:1,x:0,y:0,reason:'scroll'};state.townPortalOpen=true;enterFloor(2,false,true)`);
  const dto=saveFixture(g);assert.deepEqual(saveParse(g,dto),dto);
  assert.equal(dto.run.depth,2);assert.equal(dto.run.townExit.depth,1);
  g.run('enterTown();state.townExit.reason="retreat";state.townPortalOpen=false');
  const town=saveFixture(g);assert.equal(town.run.depth,2);assert.deepEqual(saveParse(g,town),town);
});

test('S1 snapshot refuses conflicting contexts but allows own Help and leaves state unchanged', () => {
  const setups=['state.started=false','state.gameOver=true','state.won=true','state.player.hp=0','state.godMode=true',
    'state.consoleOpen=true','state.pause={kind:"health"}','state.pause={kind:"retreat"}',
    'state.trade={}','state.companionPicker={}','state.ending={completed:true}',
    'state.bossIntro={completed:false}','state.bossDefeat={completed:false}'];
  for(const setup of setups) {
    const g=game(42,true,'town');g.run(setup);const before=goldSnapshot(g);
    assert.throws(()=>saveFixture(g),/Invalid save:/,setup);assert.equal(goldSnapshot(g),before);
  }
  const g=game();
  for(const key of ['hidden','tradeOpen','companionOpen']) {
    const before=goldSnapshot(g),context={...SAVE_TEST_CONTEXT,[key]:true};
    assert.throws(()=>g.run(`captureSaveData(state,${JSON.stringify(context)})`),/Invalid save:/,key);
    assert.equal(goldSnapshot(g),before);
  }
  g.run('state.helpOpen=true');assert.ok(saveFixture(g));
  assert.throws(()=>g.run('captureSaveData(state,{})'),/Invalid save:/);
});

test('S1 validator rejects malformed, unknown and cross-field data without mutating DTO or game', () => {
  const g=game(),base=saveFixture(g);
  const cases=[
    d=>{d.format='other';},d=>{d.formatVersion=2;},d=>{d.extra=true;},d=>{delete d.run.gold;},
    d=>{d.run.gold=-1;},d=>{d.run.gold=1.5;},d=>{d.run.gold=Number.MAX_SAFE_INTEGER+1;},
    d=>{d.gameVersion='x'.repeat(129);},d=>{d.createdAt='2026-02-31T00:00:00.000Z';},
    d=>{d.run.player.hp=0;},d=>{d.run.player.hp=d.run.player.maxHp+1;},
    d=>{d.run.player.xpNext=41;},d=>{d.run.player.spells.fake=true;},
    d=>{d.run.equipment.weapon={...d.run.floors[1].treasures[0],atk:999};},
    d=>{d.run.inventory=[{name:'Potion',kind:'heal',heal:1}];},
    d=>{d.run.floors[1].map.pop();},d=>{d.run.floors[1].map[0][0]=3;},
    d=>{d.run.floors[1].visited=['01,2'];},d=>{d.run.floors[1].visited=['1,2','1,2'];},
    d=>{d.run.floors[1].visited=['96,0'];},d=>{d.run.floors['01']=d.run.floors[1];},
    d=>{d.run.floors[1].floorKey.carrierId=999;},
    d=>{d.run.floors[1].floorKey.collected=true;},
    d=>{d.run.floors[1].hazards.find(h=>h.type==='spikes').revealed=true;},
    d=>{d.run.floors[1].hazards.find(h=>h.type==='rocks').stage='warning';},
    d=>{d.run.floors[1].monsterSpawns[0].hp=1;},
    d=>{d.run.encounter.monsters[0].sprite='knight';},
    d=>{d.run.encounter.monsters[0].atk+=1;},
    d=>{d.run.encounter.monsters[0].id=999;},
    d=>{d.run.town.landmarks.companionBoardIndex=0;},
    d=>{d.run.town.props.find(p=>p.sprite==='water').scale=3;},
    d=>{d.run.town.animals[0].name='Unknown';},
    d=>{d.run.town.npcs[0].pathIndex=4;},
    d=>{d.run.selectedCompanion='hydra';},d=>{d.run.companion.id='fake';},
    d=>{d.run.unlockedCompanions.push('pip');},
    d=>{d.run.townPortalOpen=true;},
    d=>{d.run.townExit={depth:2,x:1,y:1,reason:'cheat'};d.run.townPortalOpen=true;},
    d=>{d.run.messages=['a'.repeat(513)];},d=>{d.run.messages=Array(81).fill('x');}
  ];
  for(const [index,mutate] of cases.entries()) {
    const dto=structuredClone(base);mutate(dto);const text=JSON.stringify(dto);
    saveReject(g,dto,`case ${index}`);assert.equal(JSON.stringify(dto),text);
  }
  for(const text of ['','{','null','[]','{"format":"dungeon-crawler-save"}',
    '{"__proto__":{"polluted":true}}','{"constructor":{}}','{"prototype":{}}']) {
    assert.throws(()=>g.run(`parseSaveData(${JSON.stringify(text)})`),/Invalid save:/,text);
  }
  assert.equal(g.run('({}).polluted'),undefined);
});

test('S1 parser bounds bytes and nesting, rejecting non-JSON object hazards without executing code', () => {
  const g=game(),before=goldSnapshot(g);
  for(const expression of [
    '" ".repeat(SAVE_MAX_BYTES+1)',
    '" ".repeat(SAVE_MAX_BYTES-1)+"é"',
    '"[".repeat(17)+"0"+"]".repeat(17)'
  ]) assert.throws(()=>g.run(`parseSaveData(${expression})`),/Invalid save:/,expression);
  for(const expression of [
    '({run:NaN})','({run:Infinity})','({run:undefined})','({run:()=>1})','({run:1n})',
    '({run:new Date()})','({run:new Set()})','(()=>{const a={};a.a=a;return a;})()',
    '({get run(){throw new Error("getter executed");}})',
    '({toJSON(){throw new Error("toJSON executed");}})',
    '({run:Array(3)})','({run:Object.create({gold:2})})',
    '({run:new Array(4000000).fill(null)})'
  ]) assert.throws(()=>g.run(`validateSaveData(${expression})`),/Invalid save:/,expression);
  assert.equal(goldSnapshot(g),before);
  assert.equal(g.run('saveTextBudget(JSON.stringify("😀é"))'),8);
  assert.equal(g.run('saveTextBudget(JSON.stringify("[not nesting]"))'),15);
});

test('S1 valid revealed/spent hazards, key collection, rescue and final boss defeat retain once-only data', () => {
  const g=game();g.run(`render=()=>{};playSound=()=>{};enterFloor(2,false,true);
    state.prisoner.rescued=true;state.merchant.stock=state.merchant.stock.slice(2);
    state.floorKey.dropped=true;state.floorKey.collected=true;state.floorKey.drop=null;
    state.floors[2].descentRewarded=true;
    const spikes=state.hazards.find(h=>h.type==='spikes');spikes.triggered=true;spikes.revealed=true;
    const rocks=state.hazards.find(h=>h.type==='rocks');rocks.triggered=true;rocks.stage='spent';rocks.impactAt=2.75;
    state.hazardTime=4.5;`);
  let dto=saveFixture(g);assert.deepEqual(saveParse(g,dto),dto);
  assert.equal(dto.run.floors[2].descentRewarded,true);assert.equal(dto.run.floors[2].prisoner.rescued,true);
  g.run(`enterFloor(100,false,true);damageMonster(state.boss,state.boss.hp+7);clearBossDefeat();`);
  dto=saveFixture(g);assert.deepEqual(saveParse(g,dto),dto);
  assert.equal(dto.run.floors[100].bossDefeated,true);assert.equal(dto.run.floors[100].princess.rescued,false);
  assert.equal(dto.run.encounter.monsters.find(m=>m.id===dto.run.encounter.bossId).hp,-7);
  const gold=dto.run.gold,kills=dto.run.kills;
  assert.equal(saveParse(g,dto).run.gold,gold);assert.equal(g.run('state.kills'),kills);
  dto.run.floors[100].princess.rescued=true;saveReject(g,dto,'rescue already ended run');
  g.run('enterTown();enterFloor(100,false)');
  dto=saveFixture(g);assert.equal(dto.run.encounter.bossId,null);assert.deepEqual(saveParse(g,dto),dto);
});

test('S1 structural validator rejects null/wrong record types and hidden executable array properties', () => {
  const g=game(),base=saveFixture(g);
  for(const path of ['run.floors','run.town','run.player','run.equipment','run.entranceCat','run.companion',
    'run.floors.1.rooms.0','run.floors.1.floorKey','run.floors.1.monsterSpawns.0',
    'run.floors.1.hazards.0','run.floors.1.props.0','run.town.props.0','run.town.animals.0',
    'run.town.landmarks','run.town.store.stock.0','run.encounter']) {
    for(const value of [null,1,[],true]) {
      const dto=structuredClone(base),parts=path.split('.');let parent=dto;
      for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]=value;
      // Null companion is an intentionally supported empty party.
      if(path==='run.companion' && value===null)continue;
      saveReject(g,dto,`${path}=${JSON.stringify(value)}`);
    }
  }
  assert.throws(()=>g.run(`validateSaveData({run:Object.defineProperty([],'toJSON',{value:()=>{throw new Error('executed');}})})`),/Invalid save:/);
  assert.throws(()=>g.run('saveStructure(Array.from({length:65},()=>Array(65536).fill(0)))'),/Invalid save: structure exceeds 4000000 nodes/);
});

test('S1 actual DTO accepts a fully explored 100-floor content-retention fixture below format limits', () => {
  const g=game(713,true,'town');
  g.run(`render=()=>{};playSound=()=>{};state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveTown();`);
  for(let depth=1;depth<=100;depth++)g.run(`enterFloor(${depth},false);state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveFloor()`);
  g.run(`state.inventory=Array.from({length:10000},()=>({name:'Potion',kind:'heal',heal:0.5999999999999999}));
    Math.random=()=>{throw new Error('size fixture RNG');};
    window.s1Text=serializeSaveData(state,${JSON.stringify(SAVE_TEST_CONTEXT)});
    window.s1Parsed=parseSaveData(window.s1Text);`);
  assert.equal(g.run('Object.keys(window.s1Parsed.run.floors).length'),100);
  assert.equal(g.run('window.s1Parsed.run.inventory.length'),10000);
  assert.ok(g.run('saveTextBudget(window.s1Text)')<32*2**20);
  assert.ok(g.run('saveStructure(window.s1Parsed)')<4000000);
  assert.equal(g.run('JSON.stringify(window.s1Parsed)===window.s1Text'),true);
  assert.equal(g.run('window.s1Parsed.run.floors[50].rooms.some(r=>r.isThroneRoom)'),true);
});

test('S1 over-limit histories and inventory refuse losslessly rather than pruning live data', () => {
  for(const field of ['inventory','monsters']) {
    const g=game();
    if(field==='inventory')g.run("state.inventory=Array.from({length:65537},()=>({name:'Potion',kind:'heal',heal:.35}))");
    else g.run('state.monsters=Array.from({length:65537},(_,id)=>({...state.monsters[0],id,hp:-3}))');
    const before=goldSnapshot(g);
    assert.throws(()=>saveFixture(g),/Invalid save:/,field);
    assert.equal(goldSnapshot(g),before);assert.equal(g.run(`state.${field}.length`),65537);
  }
});

test('S1 keeps the S0 state inventory explicit and Unicode journal text lossless', () => {
  const g=game(42,true,'town');
  const classified=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reviews/2026-11-26-s0-save-load/state-classification.json'),'utf8'));
  assert.deepEqual(g.json('Object.keys(state).filter(k=>k!=="loadSession").sort()'),Object.keys(classified).sort());
  g.run(`state.messages=['A dragon says: "[hello]" 🐉 é <script>plain text</script>'];`);
  const dto=saveFixture(g);assert.deepEqual(saveParse(g,dto),dto);
  assert.deepEqual(dto.run.messages,g.json('state.messages'));
  assert.equal(g.run('saveTextBudget(" ".repeat(SAVE_MAX_BYTES))'),32*2**20);
  const detached=g.run(`(()=>{const d=captureSaveData(state,${JSON.stringify(SAVE_TEST_CONTEXT)});const v=validateSaveData(d);
    v.run.messages[0]='changed';return d.run.messages[0]!==v.run.messages[0];})()`);
  assert.equal(detached,true);
});

function s2Snapshot(g) {
  return g.run(`JSON.stringify(state,(key,value)=>{
    if (['art','motion','audio','consoleLines','consoleHistory','consoleHistoryIndex','loadSession','lastTick','helpFocus'].includes(key)) return undefined;
    return value instanceof Set?[...value]:value;
  })`);
}
function s2InstallDto(g, dto) { g.run(`window.s2Dto=JSON.parse(${JSON.stringify(JSON.stringify(dto))})`); }
function s2Load(g, dto) { s2InstallDto(g,dto); return g.run('commitSaveLoad(beginSaveLoad(),window.s2Dto)'); }
function s2Aliases(g) {
  return g.run(`(()=>{const t=state.town,f=state.floors[state.depth];return state.inn===t.landmarks.inn&&state.townGate===t.landmarks.gate
    &&t.store===t.landmarks.store&&t.props.includes(t.landmarks.companionBoard)
    &&t.visited instanceof Set&&Object.values(state.floors).every(f=>f.visited instanceof Set)
    &&(state.area==='town'?state.map===t.map&&state.props===t.props&&state.visited===t.visited&&state.merchant===t.store
      :FLOOR_FIELDS.every(k=>state[k]===f[k])&&(!state.boss||state.monsters.includes(state.boss)));})()`);
}

test('S2 detached hydration reconstructs every alias without touching source, live state or action helpers', () => {
  for(const area of ['town','dungeon']) {
    const g=game(713,true,area),dto=saveFixture(g);s2InstallDto(g,dto);
    const before=s2Snapshot(g);
    g.run(`Math.random=()=>{throw new Error('hydration RNG');};
      for(const name of ['render','log','playSound','equipItem','activateCompanion','placeCompanionNearPlayer','revealAroundPlayer','saveTown','saveFloor','newGame','genLevel','genTown','enterFloor','recreateMonsters'])
        globalThis[name]=()=>{throw new Error('hydration called '+name);};
      window.s2Candidate=hydrateSaveData(window.s2Dto);`);
    assert.equal(s2Snapshot(g),before);
    assert.deepEqual(g.json('window.s2Dto'),dto);
    assert.deepEqual(g.json(`captureSaveData(window.s2Candidate,${JSON.stringify(SAVE_TEST_CONTEXT)})`),dto);
    assert.equal(g.run('window.s2Candidate.audio'),null);assert.equal(g.run('window.s2Candidate.art'),null);
    assert.equal(g.run('window.s2Candidate.lastTick'),0);
    assert.equal(g.run('Object.keys(window.s2Candidate).length===Object.keys(state).length'),true);
    g.run('window.s2Candidate.player.hp=1;window.s2Candidate.town.store.stock.length=0');
    assert.equal(s2Snapshot(g),before);assert.deepEqual(g.json('window.s2Dto'),dto);
  }
});

test('S2 atomic load restores exact progression/world/deadlines and retains receiver audio/art', () => {
  for(const area of ['town','dungeon']) {
    const source=game(713,true,area);
    source.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=37;state.player.mp=7;
      state.gold=293;state.activeTime=15.25;state.retreatReadyAt=72.5;state.warnedLow=true;
      state.combatElapsed=3.5;state.healElapsed=1.25;state.spellReadyAt.fireball=17.75;
      state.inventory=[{name:'Potion',kind:'heal',heal:.499}];state.townScrolls=3;
      state.townExit={depth:1,x:0,y:0,reason:'cheat'};state.townPortalOpen=true;
      state.messages=['Exact saved log','<plain text>'];`);
    if(area==='dungeon')source.run('state.monsters[0].hp=4;state.monsters[0].nextAttackAt=17.5;state.potions=state.potions.slice(1);state.hazardTime=3.75');
    const dto=saveFixture(source),g=game(42,true,'town');
    s2InstallDto(g,dto);
    g.run(`window.s2Audio=state.audio;window.s2Art=state.art;state.audio.enabled=false;state.audio.musicVolume=.19;state.audio.effectsVolume=.31;
      state.consoleHistory=['old command'];state.godModeStats={hp:2};state.motion.time=123;
      Math.random=()=>{throw new Error('load RNG');};
      for(const name of ['log','playSound','equipItem','activateCompanion','placeCompanionNearPlayer','revealAroundPlayer','newGame','genLevel','genTown','enterFloor','recreateMonsters'])
        globalThis[name]=()=>{throw new Error('load called '+name);};`);
    assert.equal(g.run('commitSaveLoad(beginSaveLoad(),window.s2Dto)'),true);
    assert.deepEqual(saveFixture(g),dto,area);
    assert.equal(s2Aliases(g),true);
    assert.equal(g.run('state.audio===window.s2Audio&&state.art===window.s2Art'),true);
    assert.deepEqual(g.json('[state.audio.enabled,state.audio.musicVolume,state.audio.effectsVolume]'),[false,.19,.31]);
    assert.equal(String(g.elements.hpText.textContent),'37/80');assert.equal(String(g.elements.gold.textContent),'293');
    assert.equal(g.elements.log.textContent,'<plain text>\n\nExact saved log');
    assert.equal(g.elements.launchScreen.hidden,true);assert.equal(g.elements.gameLayout.hidden,false);
    assert.deepEqual(g.json('[state.godMode,state.godModeStats,state.helpOpen,state.consoleHistory,state.pause,state.ending,state.bossIntro,state.bossDefeat,state.loadSession]'),[false,null,false,[],null,null,null,null,null]);
    assert.equal(g.run('state.lastTick>Date.now()-1000'),true);
    assert.equal(g.run('state.motion.time'),0);
    assert.deepEqual(g.json('state.motion.moves'),{});
  }
});

test('S2 load is allowed from launch, Help, stable god mode and ordinary death with correct focus/overlays', () => {
  const dto=saveFixture(game(713,true,'town'));
  for(const origin of ['launch','help','god','death']) {
    const g=game(42,origin!=='launch','town',true);s2InstallDto(g,dto);
    if(origin==='help')g.run('openHelp()');
    if(origin==='god')g.run('setGodMode("1")');
    if(origin==='death')g.run('die()');
    assert.equal(g.run('commitSaveLoad(beginSaveLoad(),window.s2Dto)'),true,origin);
    assert.equal(g.run('state.started&&!state.gameOver&&!state.won&&!state.godMode'),true);
    assert.equal(g.elements.helpOverlay.hidden,true);assert.equal(g.elements.devConsole.hidden,true);
    assert.equal(g.elements.overlay.style.display,'none');assert.equal(g.elements.pauseOverlay.style.display,'none');
    assert.equal(g.elements.gameLayout.inert,false);assert.equal(g.elements.launchScreen.inert,false);
    assert.equal(g.run('document.activeElement===canvas'),true);
    assert.deepEqual(saveFixture(g),dto);
  }
});

test('S2 pending load freezes simulation, player actions and launch choices without charging time', () => {
  for(const area of ['town','dungeon']) {
    const g=game(42,true,area);g.run('window.s2Session=beginSaveLoad()');
    const before=s2Snapshot(g);
    g.run(`advanceActiveTime(20);enemyTick();townTick();companionTick();hazardTick();recoveryTick(20);regenMana();advanceMotion(20);
      movePlayer(1,0);castSpell('heal');shootBow();drinkPotion();pickup();useTownScroll();descendStairs();ascendStairs();retreat();
      openTrade();openCompanionBoard();openConsole();openHelp();buyFromMerchant();sellToMerchant();`);
    g.key('ArrowRight');g.key('h');g.key('j');g.key('x');g.key('`');
    assert.equal(s2Snapshot(g),before,area);
    assert.throws(()=>saveFixture(g),/Invalid save:/,'cannot save an unconfirmed load session');
    assert.equal(g.run('cancelSaveLoad(window.s2Session)'),true);
    assert.equal(g.run('state.loadSession'),null);assert.equal(g.run('state.activeTime'),JSON.parse(before).activeTime);
    assert.equal(g.run('state.lastTick>Date.now()-1000'),true);
    g.run('beginSaveLoad();state.lastTick=1;cancelSaveLoad(state.loadSession,false)');
    assert.equal(g.run('state.lastTick>Date.now()-1000'),true,'forced discard must not credit pending-load time');
  }
  const g=game(42,false,'town');g.run('beginSaveLoad();setCompanionChoice("pip");startGame()');
  assert.equal(g.run('state.started'),false);assert.equal(g.run('state.companionChoice'),'marmalade');
});

test('S2 stale or cancelled confirmations cannot replace restart, travel, death or a newer session', () => {
  const dto=saveFixture(game(713,true,'town'));
  const transitions=['cancelSaveLoad()','newGame()','enterFloor(2,false,true)','enterTown()','loadLevel("3")',
    'die()','startEnding()','closeHelp()','window.s2New=beginSaveLoad()'];
  for(const transition of transitions) {
    const g=game();s2InstallDto(g,dto);g.run(`window.s2Old=beginSaveLoad();${transition}`);
    const before=s2Snapshot(g);
    assert.equal(g.run('commitSaveLoad(window.s2Old,window.s2Dto)'),false,transition);
    assert.equal(s2Snapshot(g),before,transition);
    if(transition.includes('s2New')) {
      assert.equal(g.run('cancelSaveLoad(window.s2Old)'),false);
      assert.equal(g.run('state.loadSession===window.s2New'),true);
      assert.equal(g.run('commitSaveLoad(window.s2New,window.s2Dto)'),true);
    }
  }
  const g=game();s2InstallDto(g,dto);g.run('window.s2Token=beginSaveLoad()');
  assert.equal(g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),true);
  const before=s2Snapshot(g);assert.equal(g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),false);
  assert.equal(s2Snapshot(g),before);
});

test('S2 conflicting load contexts and changed bindings reject without state or focus changes', () => {
  const dto=saveFixture(game());
  for(const setup of ['document.hidden=true','state.pause={kind:"health"}','state.pause={kind:"retreat"}',
    'state.consoleOpen=true','state.trade={}','state.companionPicker={}',
    'state.ending={completed:true}','state.bossIntro={completed:false}','state.bossDefeat={completed:false}',
    'state.won=true','document.getElementById("tradeOverlay").hidden=false','document.getElementById("companionOverlay").hidden=false']) {
    const g=game();g.run(setup);const before=s2Snapshot(g);
    assert.equal(g.run('beginSaveLoad()'),null,setup);assert.equal(s2Snapshot(g),before);
  }
  for(const setup of ['document.hidden=true','state.pause={kind:"health"}','state.map=state.map.map(row=>row.slice())','state.depth=2']) {
    const g=game();s2InstallDto(g,dto);g.run(`window.s2Token=beginSaveLoad();${setup}`);
    const before=s2Snapshot(g);assert.equal(g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),false,setup);
    assert.equal(s2Snapshot(g),before);
  }
});

test('S2 malformed or failed hydration preserves the exact old run and retryable session', () => {
  const g=game(42,true,'town',true),dto=saveFixture(g);s2InstallDto(g,dto);
  g.run('openHelp();window.s2Token=beginSaveLoad();window.s2OldState=state;window.s2Focus=document.activeElement');
  const before=s2Snapshot(g);
  assert.throws(()=>g.run('commitSaveLoad(window.s2Token,{})'),/Invalid save:/);
  assert.equal(s2Snapshot(g),before);assert.equal(g.run('state===window.s2OldState&&state.loadSession===window.s2Token&&document.activeElement===window.s2Focus'),true);
  g.run('window.s2Hydrate=hydrateSaveData;hydrateSaveData=()=>{throw new Error("hydrate allocation failure");}');
  assert.throws(()=>g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),/hydrate allocation failure/);
  assert.equal(s2Snapshot(g),before);
  g.run('hydrateSaveData=window.s2Hydrate');
  assert.equal(g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),true);
});

test('S2 failed commit presentation restores old state, HUD, Help and focus without replaying render', () => {
  const g=game(42,true,'town',true),dto=saveFixture(game(713));s2InstallDto(g,dto);
  g.run(`state.gold=42;render();openHelp();window.s2Token=beginSaveLoad();window.s2OldState=state;
    window.s2Focus=document.activeElement;window.s2Render=render;
    render=()=>{document.getElementById('gold').textContent='partly changed';throw new Error('paint failure');};`);
  const before=s2Snapshot(g),gold=g.elements.gold.textContent;
  assert.throws(()=>g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),/paint failure/);
  assert.equal(s2Snapshot(g),before);assert.equal(g.run('state===window.s2OldState'),true);
  assert.equal(g.elements.gold.textContent,gold);assert.equal(g.elements.helpOverlay.hidden,false);
  assert.equal(g.elements.gameLayout.inert,true);assert.equal(g.run('document.activeElement===window.s2Focus'),true);
  assert.equal(g.run('state.loadSession'),null);assert.equal(g.run('commitSaveLoad(window.s2Token,window.s2Dto)'),false);
  g.run('render=window.s2Render');assert.equal(g.run('commitSaveLoad(beginSaveLoad(),window.s2Dto)'),true);
});

test('S2 active encounter, guards and final dragon restore exactly while later revisits retain respawn rules', () => {
  const source=game();source.run(`render=()=>{};playSound=()=>{};enterFloor(50,false,true);
    state.activeTime=20;summonThroneGuards();state.monsters[0].hp=-7;state.monsters.find(m=>m.isGuard).hp=-13;
    state.monsters[1].hp=4;state.monsters[1].nextAttackAt=21.5;state.bossIntroSeen=true;`);
  const dto=saveFixture(source),g=game();assert.equal(s2Load(g,dto),true);
  assert.deepEqual(saveFixture(g),dto);assert.equal(s2Aliases(g),true);
  g.run('enterTown();enterFloor(50,false)');
  assert.equal(g.run('state.monsters.some(m=>m.isGuard)'),false);
  assert.equal(g.run('state.monsters.every(m=>m.hp===m.maxHp)'),true);
  assert.equal(g.run('state.boss.hp'),g.run('state.boss.maxHp'));
  source.run('enterFloor(100,false,true);damageMonster(state.boss,state.boss.hp+7);clearBossDefeat()');
  const final=saveFixture(source),receiving=game();assert.equal(s2Load(receiving,final),true);
  assert.deepEqual(saveFixture(receiving),final);const gold=receiving.run('state.gold'),kills=receiving.run('state.kills');
  receiving.run('enterTown();enterFloor(100,false)');
  assert.equal(receiving.run('state.boss'),null);assert.equal(receiving.run('state.princess.rescued'),false);
  assert.equal(receiving.run('state.gold'),gold);assert.equal(receiving.run('state.kills'),kills);
});

test('S2 restored portal returns once and ring HP, stock, keys, loot and descent rewards stay once-only', () => {
  const source=game();source.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=37;state.player.mp=7;
    state.potions=state.potions.slice(1);state.floorKey.dropped=true;state.floorKey.collected=true;state.floorKey.drop=null;
    state.floors[1].descentRewarded=true;state.gold=123;state.townScrolls=3;useTownScroll();`);
  const dto=saveFixture(source),g=game();assert.equal(s2Load(g,dto),true);
  assert.equal(g.run('state.player.maxHp'),80);assert.equal(g.run('state.player.hp'),37);
  const potionCount=g.run('state.floors[1].potions.length'),exit=g.json('state.townExit');
  g.key('j');assert.equal(g.run('state.area'),'dungeon');assert.equal(g.run('state.townScrolls'),2);
  assert.deepEqual(g.json('[state.player.x,state.player.y]'),[exit.x,exit.y]);
  assert.equal(g.run('state.townPortalOpen'),false);assert.equal(g.run('state.townExit'),null);
  assert.equal(g.run('state.potions.length'),potionCount);assert.equal(g.run('state.floorKey.collected'),true);
  g.run('state.player.x=state.stairs.x;state.player.y=state.stairs.y;descendStairs()');
  assert.equal(g.run('state.gold'),123,'descent reward must not duplicate');
  assert.equal(s2Load(g,dto),true);assert.equal(g.run('state.player.maxHp'),80);assert.equal(g.run('state.player.hp'),37);
});

test('S2 stale motion/cinematic callbacks and reentrant reset cannot overwrite a loaded or newer run', () => {
  const g=game(),dto=saveFixture(game(713,true,'town'));s2InstallDto(g,dto);
  g.run(`window.s2OldMotion=state.motion;window.s2Intro={completed:false,frameId:31};
    window.s2Defeat={completed:false,frameId:32};window.s2Ending={completed:false,frameId:33};
    window.s2Cancelled=[];window.cancelAnimationFrame=id=>window.s2Cancelled.push(id);
    state.bossIntro={completed:true,frameId:31};state.bossDefeat={completed:true,frameId:32};
    window.s2Session=beginSaveLoad();`);
  assert.equal(g.run('commitSaveLoad(window.s2Session,window.s2Dto)'),true);
  const before=s2Snapshot(g);
  g.run('motionFrame(99999,window.s2OldMotion);bossIntroFrame(99999,window.s2Intro);bossDefeatFrame(99999,window.s2Defeat);endingFrame(99999,window.s2Ending)');
  assert.equal(s2Snapshot(g),before);assert.deepEqual(g.json('window.s2Cancelled'),[31,32]);
  const other=game();s2InstallDto(other,dto);
  other.run('window.s2Session=beginSaveLoad();window.s2OriginalHydrate=hydrateSaveData;hydrateSaveData=v=>{const c=window.s2OriginalHydrate(v);newGame();return c;}');
  assert.equal(other.run('commitSaveLoad(window.s2Session,window.s2Dto)'),false);
  assert.equal(other.run('state.depth'),1);assert.equal(other.run('state.gold'),0);
});

test('S2 all companions and high-level XP hydrate with exact positions, static roles and readiness', () => {
  const source=game(713,true,'town'),g=game();
  for(const [i,id] of ['marmalade','pip','mimic','hydra','boar','medusa','wizard','skeletonKing','dragon','cook','bartender'].entries()) {
    source.run(`unlockCompanion('${id}');activateCompanion('${id}');state.companion.x=34;state.companion.y=27;
      state.companionAttackAt=19.75;state.companionSpeechReadyAt=17.25;state.companionQuoteIndex=8;
      state.player.lvl=${i%3===0?83:i%3===1?99:100};var s2Threshold=40;
      for(let level=1;level<state.player.lvl;level++)s2Threshold=Math.round(s2Threshold*1.5);
      state.player.xpNext=state.player.lvl===100?1:s2Threshold;state.player.xp=state.player.lvl===100?0:Math.floor(s2Threshold/2);`);
    const dto=saveFixture(source);assert.equal(s2Load(g,dto),true,id);
    assert.deepEqual(saveFixture(g),dto,id);assert.deepEqual(g.json('state.companion'),source.json('state.companion'));
    assert.equal(g.run('state.companion.x'),34);assert.equal(g.run('state.companionAttackAt'),19.75);
    assert.equal(s2Aliases(g),true);
  }
});

test('S2 restored hazard warnings and cooldowns use saved active time without replay or catch-up', () => {
  const source=game();source.run(`enterFloor(2,false,true);state.activeTime=10;state.retreatReadyAt=70;
    state.hazardTime=4;const rock=state.hazards.find(h=>h.type==='rocks');rock.triggered=true;rock.stage='warning';rock.impactAt=4.5;
    state.player.x=rock.x;state.player.y=rock.y;state.companion.x=rock.x;state.companion.y=rock.y;`);
  const dto=saveFixture(source),g=game();assert.equal(s2Load(g,dto),true);
  const hp=g.run('state.player.hp');assert.deepEqual(saveFixture(g),dto);
  assert.equal(g.run('retreatRemaining()'),60);
  g.run('advanceActiveTime(.4);hazardTick()');assert.equal(g.run('state.player.hp'),hp);
  g.run('advanceActiveTime(.2);hazardTick()');assert.equal(g.run('state.player.hp'),hp-12);
  g.run('hazardTick()');assert.equal(g.run('state.player.hp'),hp-12,'spent impact must not repeat');
  assert.ok(Math.abs(g.run('retreatRemaining()')-59.4)<1e-8);
});

test('S2 presentation preparation errors and reentrant commits reject before touching the current run', () => {
  const g=game(42,true,'town',true),dto=saveFixture(game());s2InstallDto(g,dto);
  g.run('openHelp();window.s2Session=beginSaveLoad();window.s2Presentation=captureLoadPresentation;captureLoadPresentation=()=>{throw new Error("canvas read failure");}');
  const before=s2Snapshot(g);
  assert.throws(()=>g.run('commitSaveLoad(window.s2Session,window.s2Dto)'),/canvas read failure/);
  assert.equal(s2Snapshot(g),before);assert.equal(g.run('state.loadSession===window.s2Session'),true);
  g.run('captureLoadPresentation=()=>{const p=window.s2Presentation();newGame();return p;}');
  assert.equal(g.run('commitSaveLoad(window.s2Session,window.s2Dto)'),false);
  assert.equal(g.run('state.gold'),0);assert.equal(g.run('state.area'),'town');
});

test('S2 hydrates and atomically loads the final fully explored 100-floor DTO without mutation or RNG', () => {
  const source=game(713,true,'town');source.run('render=()=>{};playSound=()=>{}');
  for(let depth=1;depth<=100;depth++)source.run(`enterFloor(${depth},false);state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveFloor()`);
  const dto=saveFixture(source),g=game();s2InstallDto(g,dto);
  g.run(`Math.random=()=>{throw new Error('large load RNG');};playSound=()=>{throw new Error('large load sound');};
    window.s2Detached=hydrateSaveData(window.s2Dto);`);
  assert.equal(g.run('Object.keys(window.s2Detached.floors).length'),100);
  assert.equal(g.run('window.s2Detached.visited instanceof Set'),true);
  assert.equal(g.run('commitSaveLoad(beginSaveLoad(),window.s2Dto)'),true);
  assert.equal(s2Aliases(g),true);assert.deepEqual(saveFixture(g),dto);
});

function s3Files(g) {
  g.run(`var s3=window.s3={readers:[],jobs:new Map(),next:0,revoked:[],blobs:[],downloads:[]};
    window.setTimeout=(fn,delay)=>{const id=++s3.next;s3.jobs.set(id,{fn,delay});return id;};
    window.clearTimeout=id=>s3.jobs.delete(id);
    var s3Flush=window.s3Flush=()=>{for(const [id,job]of [...s3.jobs])if(job.delay===0){s3.jobs.delete(id);job.fn();}};
    var s3Finish=window.s3Finish=(index,text)=>{const r=s3.readers[index];r.readyState=2;r.result=text;r.onload?.();};
    window.FileReader=class{constructor(){this.readyState=0;s3.readers.push(this);}readAsText(file,encoding){this.file=file;this.encoding=encoding;this.readyState=1;if(s3.readError)throw new Error('read failed');}
      abort(){this.aborted=true;this.readyState=2;this.onabort?.();}};
    window.Blob=class{constructor(parts,options){if(s3.blobError)throw new Error('blob failed');this.parts=parts;this.options=options;s3.blobs.push(this);}};
    window.URL={createObjectURL:blob=>'blob:test-'+s3.blobs.indexOf(blob),revokeObjectURL:url=>s3.revoked.push(url)};
    var s3Create=window.s3Create=document.createElement;
    document.createElement=tag=>{const el=s3Create(tag);if(tag==='a'){el.click=()=>{if(s3.clickError)throw new Error('click failed');s3.downloads.push({url:el.href,name:el.download});};
      el.remove=()=>{el.isConnected=false;if(el.parentElement)el.parentElement.children=el.parentElement.children.filter(c=>c!==el);};}return el;};
    document.body=document.createElement('body');
    const host=document.getElementById('saveLoadOverlay');
    for(const id of ['saveLoadFileHost','saveLoadStatus','saveLoadSelectedFile','saveLoadPreview','confirmSaveLoad','cancelSaveLoad','saveLoadAudioToggle'])host.appendChild(document.getElementById(id));
    for(const id of ['loadGameButton','saveGameButton','cancelSavePreparation'])document.getElementById('helpOverlay').appendChild(document.getElementById(id));
    document.getElementById('launchScreen').appendChild(document.getElementById('launchLoadGame'));
    document.getElementById('overlay').appendChild(document.getElementById('deathLoadGame'));
    updateSaveFileButtons();`);
}
function s3Select(g,dto,name='adventure.json') {
  const text=typeof dto==='string'?dto:JSON.stringify(dto);
  g.run(`document.getElementById('saveLoadFile').files=[{name:${JSON.stringify(name)},size:${Buffer.byteLength(text)}}];document.getElementById('saveLoadFile').onchange()`);
  return text;
}
function s3Ready(g,dto,name) {
  const index=g.run('s3.readers.length'),text=s3Select(g,dto,name);
  g.run(`s3Finish(${index},${JSON.stringify(text)});s3Flush()`);
}

test('S3 save requests portable JSON without progress/RNG/audio changes and cleans each URL independently', () => {
  const g=game(42,true,'town',true);s3Files(g);
  g.run(`openHelp();state.gold=293;state.player.hp=37;Math.random=()=>{throw new Error('save RNG');};playSound=()=>{throw new Error('save sound');};`);
  const before=s2Snapshot(g);assert.equal(g.run('saveGameFile()'),true);assert.equal(s2Snapshot(g),before);
  assert.equal(g.run('s3.downloads.length'),1);assert.match(g.run('s3.downloads[0].name'),/^dungeon-crawler-.*\.json$/);
  assert.equal(g.run('s3.blobs[0].options.type'),'application/json;charset=utf-8');
  assert.equal(g.run('parseSaveData(s3.blobs[0].parts[0]).run.gold'),293);
  assert.equal(g.run('document.body.children.length'),0);assert.deepEqual(g.json('s3.revoked'),[]);
  assert.match(g.elements.saveGameStatus.textContent,/Download requested/);
  g.run(`window.s3Cleanup=[...s3.jobs.values()][0].fn;state.gold=9;`);const later=s2Snapshot(g);
  g.run('window.s3Cleanup()');assert.deepEqual(g.json('s3.revoked'),['blob:test-0']);assert.equal(s2Snapshot(g),later);
});

test('S3 unsupported/failed export leaves adventure and URLs intact or cleaned with honest feedback', () => {
  for(const setup of ['delete window.Blob','s3.blobError=true','s3.clickError=true']) {
    const g=game(42,true,'town',true);s3Files(g);g.run(setup);const before=s2Snapshot(g);
    assert.equal(g.run('saveGameFile()'),false);assert.equal(s2Snapshot(g),before);
    assert.match(g.elements.saveGameStatus.textContent,/Could not prepare/);
    if(setup.includes('clickError'))assert.deepEqual(g.json('s3.revoked'),['blob:test-0']);
    assert.equal(g.run('document.body.children.length'),0);
  }
  const g=game(42,true,'town',true);s3Files(g);g.run('state.godMode=true;updateSaveFileButtons()');
  assert.equal(g.elements.saveGameButton.disabled,true);assert.equal(g.run('saveGameFile()'),false);
});

test('S3 Help/launch/death Load opens one frozen accessible dialog and Cancel restores focus/inert context', () => {
  for(const origin of ['launch','help','death']) {
    const g=game(42,origin!=='launch','town',true);s3Files(g);
    if(origin==='help')g.run('openHelp()');if(origin==='death')g.run('die()');
    const id=origin==='launch'?'launchLoadGame':origin==='help'?'loadGameButton':'deathLoadGame';
    g.run(`document.getElementById('${id}').focus()`);const before=s2Snapshot(g);
    g.click(id);assert.equal(g.elements.saveLoadOverlay.hidden,false);
    assert.equal(g.run('!!state.loadSession.ui'),true);assert.equal(g.run('document.activeElement===state.loadSession.ui.input'),true);
    assert.equal(g.elements.gameLayout.inert,true);assert.equal(g.elements.launchScreen.inert,true);assert.equal(g.elements.helpOverlay.inert,true);
    assert.equal(g.run('openLoadGame()'),null);assert.equal(g.elements.confirmSaveLoad.disabled,true);
    g.key('Tab');assert.equal(g.run('document.activeElement===document.getElementById("cancelSaveLoad")'),true);
    g.key('Tab',{shiftKey:true});assert.equal(g.run('document.activeElement===state.loadSession.ui.input'),true);
    assert.equal(g.elements[id].disabled,true);
    g.key('Escape');assert.equal(g.run('state.loadSession'),null);assert.equal(g.elements.saveLoadOverlay.hidden,true);
    assert.equal(g.elements[id].disabled,false);
    assert.equal(s2Snapshot(g),before);assert.equal(g.run(`document.activeElement===document.getElementById('${id}')`),true);
    assert.equal(!!g.elements.helpOverlay.inert,false);
  }
});

test('S3 real read phases validate before preview and only explicit deferred confirmation loads', () => {
  const dto=saveFixture(game(713,true,'town')),g=game(42,true,'town',true);s3Files(g);
  g.run('openHelp();openLoadGame()');const before=s2Snapshot(g),text=s3Select(g,dto,'<img src=x>.json');
  assert.equal(g.run('state.loadSession.ui.phase'),'reading');assert.equal(g.elements.confirmSaveLoad.disabled,true);
  assert.equal(g.run('s3.readers[0].encoding'),'UTF-8');assert.equal(g.run('state.loadSession.ui.input.value'),'');
  assert.equal(g.elements.saveLoadSelectedFile.textContent,'Selected: <img src=x>.json');
  g.run(`s3Finish(0,${JSON.stringify(text)})`);assert.equal(g.run('state.loadSession.ui.data'),null);
  g.run('s3Flush()');assert.equal(g.run('state.loadSession.ui.phase'),'ready');assert.equal(g.elements.confirmSaveLoad.disabled,false);
  assert.match(g.elements.saveLoadPreview.textContent,/Town · Hero level 1/);assert.equal(s2Snapshot(g),before);
  g.run('document.getElementById("confirmSaveLoad").onclick()');assert.equal(g.run('state.loadSession.ui.phase'),'loading');
  assert.equal(s2Snapshot(g),before,'confirmation yields before replacing state');
  g.run('s3Flush()');assert.equal(g.run('state.loadSession'),null);assert.equal(g.elements.saveLoadOverlay.hidden,true);
  assert.deepEqual(saveFixture(g),dto);assert.equal(g.run('document.activeElement===canvas'),true);
  assert.equal(g.run('document.getElementById("saveLoadFileHost").children.length'),0);
});

test('S3 file size is checked before reading and corrupt/future/read errors remain reversible', () => {
  const g=game(42,true,'town',true);s3Files(g);g.run('openHelp();openLoadGame()');const before=s2Snapshot(g);
  g.run('readSaveGameFile(state.loadSession,state.loadSession.ui.input,{name:"large.json",size:SAVE_MAX_BYTES+1})');
  assert.equal(g.run('s3.readers.length'),0);assert.match(g.elements.saveLoadStatus.textContent,/32 MiB/);
  for(const text of ['{bad','{"formatVersion":100}','null']) {
    const index=g.run('s3.readers.length'),body=s3Select(g,text);g.run(`s3Finish(${index},${JSON.stringify(body)});s3Flush()`);
    assert.equal(g.run('state.loadSession.ui.phase'),'error');assert.equal(g.elements.confirmSaveLoad.disabled,true);assert.equal(s2Snapshot(g),before);
  }
  const future=saveFixture(game());future.formatVersion=100;s3Ready(g,future);
  assert.match(g.elements.saveLoadStatus.textContent,/save version is not supported/);
  g.run('s3.readError=true');s3Select(g,'{}');assert.match(g.elements.saveLoadStatus.textContent,/Could not read/);
  assert.equal(s2Snapshot(g),before);g.key('Escape');assert.equal(g.run('state.loadSession'),null);
});

test('S3 replacement reads, same-file reselection and native cancel ignore old results', () => {
  const a=saveFixture(game(713,true,'town')),b=structuredClone(a);b.run.gold=123;
  const g=game(42,true,'town',true);s3Files(g);g.run('openLoadGame()');
  const first=s3Select(g,a,'same.json');const second=s3Select(g,b,'same.json');
  assert.equal(g.run('s3.readers[0].aborted'),true);
  g.run(`s3Finish(0,${JSON.stringify(first)});s3Flush()`);assert.equal(g.run('state.loadSession.ui.data'),null);
  g.run(`s3Finish(1,${JSON.stringify(second)});s3Flush()`);assert.equal(g.run('state.loadSession.ui.data.run.gold'),123);
  g.run('state.loadSession.ui.input.oncancel()');assert.equal(g.run('state.loadSession.ui.phase'),'choose');
  assert.equal(g.run('state.loadSession.ui.data'),null);assert.equal(g.elements.confirmSaveLoad.disabled,true);
  assert.match(g.elements.saveLoadStatus.textContent,/selection canceled/);
  s3Ready(g,b,'same.json');assert.equal(g.run('state.loadSession.ui.data.run.gold'),123);
});

test('S3 stale file events and queued validation/confirmation cannot affect a newer session or run', () => {
  const dto=saveFixture(game(713,true,'town'));
  for(const transition of ['cancelSaveLoad()','newGame()','enterFloor(2,false,true)','die()','closeHelp()','beginSaveLoad()']) {
    const g=game(42,true,'town',true);s3Files(g);g.run('openHelp();window.s3Old=openLoadGame();window.s3Input=window.s3Old.ui.input');
    const text=s3Select(g,dto);g.run(transition);const before=s2Snapshot(g);
    g.run(`s3Finish(0,${JSON.stringify(text)});window.s3Input.oncancel();s3Flush()`);
    assert.equal(s2Snapshot(g),before,transition);assert.equal(g.run('confirmSaveGameLoad(window.s3Old)'),false);
  }
  const g=game(42,true,'town',true);s3Files(g);g.run('window.s3Old=openLoadGame()');s3Ready(g,dto);
  g.run('window.s3OldConfirm=document.getElementById("confirmSaveLoad").onclick;window.s3OldConfirm();window.s3Queued=[...s3.jobs.values()][0].fn;cancelSaveLoad();openLoadGame()');
  const before=s2Snapshot(g);g.run('window.s3Queued();window.s3OldConfirm()');assert.equal(s2Snapshot(g),before);
  assert.equal(g.run('!!state.loadSession.ui'),true);
  // A newly selected file in the same modal must also invalidate a queued confirmation.
  s3Ready(g,dto);g.run('confirmSaveGameLoad(state.loadSession);window.s3PreviousCommit=[...s3.jobs.values()][0].fn');
  const latest=structuredClone(dto);latest.run.gold=123;s3Ready(g,latest);
  const unchanged=s2Snapshot(g);g.run('window.s3PreviousCommit()');
  assert.equal(s2Snapshot(g),unchanged);assert.equal(g.run('state.loadSession.ui.phase'),'ready');
  assert.equal(g.run('state.loadSession.ui.data.run.gold'),123);
});

test('S3 deferred validation while hidden stays owned and permits confirmation only after visibility returns', () => {
  const g=game(42,true,'town',true),dto=saveFixture(game(713,true,'town'));s3Files(g);g.run('openLoadGame()');
  const text=s3Select(g,dto);g.run(`document.hidden=true;s3Finish(0,${JSON.stringify(text)});s3Flush()`);
  assert.equal(g.run('state.loadSession.ui.phase'),'ready');assert.equal(g.elements.confirmSaveLoad.disabled,true);
  assert.equal(g.run('confirmSaveGameLoad(state.loadSession)'),false);
  g.run('document.hidden=false');g.visibility();assert.equal(g.elements.confirmSaveLoad.disabled,false);
  const before=s2Snapshot(g);g.run('confirmSaveGameLoad(state.loadSession);document.hidden=true;s3Flush()');
  assert.equal(g.run('state.loadSession.ui.phase'),'ready');assert.equal(s2Snapshot(g),before);
  g.run('document.hidden=false');g.visibility();
  g.key('Escape');assert.equal(g.run('state.loadSession'),null);
});

test('S3 failed commit returns to the origin with error feedback and releases read/UI resources', () => {
  const dto=saveFixture(game(713)),g=game(42,true,'town',true);s3Files(g);
  g.run('openHelp();document.getElementById("loadGameButton").focus();openLoadGame()');s3Ready(g,dto);
  const before=s2Snapshot(g);g.run('window.s3Render=render;render=()=>{throw new Error("paint fail");};document.getElementById("confirmSaveLoad").onclick();s3Flush()');
  assert.equal(s2Snapshot(g),before);assert.equal(g.run('state.loadSession'),null);
  assert.equal(g.elements.saveLoadOverlay.hidden,true);assert.equal(g.elements.helpOverlay.hidden,false);
  assert.equal(g.elements.helpOverlay.inert,false);assert.equal(g.run('document.activeElement===document.getElementById("loadGameButton")'),true);
  assert.match(g.elements.saveGameStatus.textContent,/adventure is unchanged/);
  g.run('render=window.s3Render;openLoadGame()');assert.equal(g.elements.saveLoadOverlay.hidden,false);
});

test('S3 cancel aborts an active reader and R clears dialog/status without serializing UI', () => {
  const g=game(42,true,'town',true);s3Files(g);g.run('openLoadGame()');s3Select(g,'{}');
  g.run('window.s3Old=state.loadSession;fileActionMessage("Old status")');g.key('r');
  assert.equal(g.run('state.loadSession'),null);assert.equal(g.run('window.s3Old.ui'),null);
  assert.equal(g.run('s3.readers[0].aborted'),true);assert.equal(g.elements.saveLoadOverlay.hidden,true);
  assert.equal(g.elements.saveGameStatus.textContent,'');assert.equal(g.run('Object.keys(state).length'),83);
  assert.equal('loadSession' in saveFixture(g).run,false);
});


// S4 deliberately advances one cooperative yield per queued task so races are repeatable.
function s4Pacing(g) {
  g.run(`window.s4Clock=0;window.performance={now:()=>window.s4Clock+=9};
    var s4Drain=()=>{let count=0;while([...s3.jobs.values()].some(j=>j.delay===0)){
      if(++count>20000)throw new Error('save work did not settle');s3Flush();}return count;};`);
}
function s4Fixture() {
  const g=game(713,true,'town');g.run('state.inventory=Array.from({length:300},()=>({name:"Potion",kind:"heal",heal:0.5}));state.gold=321');
  return saveFixture(g);
}

test('S4 chunked UTF-8/nesting scanner matches native byte lengths across escapes and surrogate boundaries', () => {
  const g=game();
  for(const text of [' '.repeat(65535)+'😀', '"'+'a'.repeat(65534)+'\\"'+ '{}'.repeat(100)+'"',
    '['+' '.repeat(65534)+'["é😀"]]', '"'+' '.repeat(65534)+'\\\\"']) {
    assert.equal(g.run(`drainSaveSteps(saveTextBudgetSteps(${JSON.stringify(text)}))`),Buffer.byteLength(text));
  }
  const nested=' '.repeat(65530)+'['.repeat(17)+']'.repeat(17);
  assert.throws(()=>g.run(`drainSaveSteps(saveTextBudgetSteps(${JSON.stringify(nested)}))`),/nesting/);
});

test('S4 cooperative validation never commits before explicit Load and reconstructs exact detached data', () => {
  const dto=s4Fixture(),g=game(42,true,'town',true);s3Files(g);s4Pacing(g);
  g.run('openHelp();openLoadGame();Math.random=()=>{throw new Error("save RNG");};playSound=()=>{throw new Error("save sound");}');
  const before=s2Snapshot(g),text=s3Select(g,JSON.stringify(dto)+' '.repeat(70000));
  g.run(`s3Finish(0,${JSON.stringify(text)});s3Flush();s3Flush()`);
  assert.equal(g.run('!!state.loadSession.work'),true);assert.equal(s2Snapshot(g),before);
  assert.ok(g.run('s4Drain()')>2);assert.equal(g.run('state.loadSession.ui.phase'),'ready');assert.equal(s2Snapshot(g),before);
  g.run('confirmSaveGameLoad(state.loadSession);s3Flush();s3Flush()');
  assert.equal(g.run('!!state.loadSession.work'),true);assert.equal(s2Snapshot(g),before);
  g.run('s4Drain()');assert.equal(g.run('state.loadSession'),null);assert.equal(s2Aliases(g),true);
  assert.deepEqual(saveFixture(g),dto);
});

test('S4 cancel/replacement/restart reject an already queued validation task without changing either run', () => {
  const dto=s4Fixture();
  for(const action of ['cancelSaveLoad()','newGame()','openLoadGame()']) {
    const g=game(42,true,'town',true);s3Files(g);s4Pacing(g);g.run('openLoadGame()');
    const text=s3Select(g,JSON.stringify(dto)+' '.repeat(70000));
    g.run(`s3Finish(0,${JSON.stringify(text)});s3Flush();s3Flush();window.s4Late=[...s3.jobs.values()].find(j=>j.delay===0).fn;`);
    g.run(action);const before=s2Snapshot(g);g.run('window.s4Late();s4Drain()');assert.equal(s2Snapshot(g),before,action);
  }
  const g=game(42,true,'town',true);s3Files(g);s4Pacing(g);g.run('openLoadGame()');
  const text=s3Select(g,JSON.stringify(dto)+' '.repeat(70000));g.run(`s3Finish(0,${JSON.stringify(text)});s3Flush();s3Flush()`);
  const next=structuredClone(dto);next.run.gold=999;s3Ready(g,next);g.run('s4Drain()');
  assert.equal(g.run('state.loadSession.ui.data.run.gold'),999);
});

test('S4 cooperative confirmation cancellation and late schema errors preserve atomicity', () => {
  const dto=s4Fixture();
  for(const action of ['cancelSaveLoad()','newGame()']) {
    const g=game(42,true,'town',true);s3Files(g);s4Pacing(g);g.run('openLoadGame()');s3Ready(g,dto);g.run('s4Drain()');
    const before=s2Snapshot(g);g.run('confirmSaveGameLoad(state.loadSession);s3Flush();s3Flush()');
    assert.equal(s2Snapshot(g),before);assert.equal(g.run('!!state.loadSession.work'),true);
    g.run('window.s4Late=[...s3.jobs.values()].find(j=>j.delay===0).fn');g.run(action);
    const after=s2Snapshot(g);g.run('window.s4Late();s4Drain()');assert.equal(s2Snapshot(g),after);
  }
  const g=game(42,true,'town',true);s3Files(g);s4Pacing(g);g.run('openLoadGame()');s3Ready(g,dto);g.run('s4Drain()');
  const before=s2Snapshot(g);g.run('state.loadSession.ui.data.run.town.map[63][95]=3;confirmSaveGameLoad(state.loadSession);s3Flush();s4Drain()');
  assert.equal(s2Snapshot(g),before);assert.equal(g.run('state.loadSession.ui.phase'),'error');
  assert.match(g.elements.saveLoadStatus.textContent,/unchanged/);g.run('cancelSaveLoad()');
  const h=game(42,true,'town',true);s3Files(h);s4Pacing(h);h.run('openHelp();openLoadGame()');s3Ready(h,dto);h.run('s4Drain()');
  const previous=s2Snapshot(h);h.run('render=()=>{throw new Error("large paint failure");};confirmSaveGameLoad(state.loadSession);s3Flush();s4Drain()');
  assert.equal(s2Snapshot(h),previous);assert.equal(h.run('state.loadSession'),null);
  assert.equal(h.elements.saveLoadOverlay.hidden,true);assert.match(h.elements.saveGameStatus.textContent,/unchanged/);
  const hidden=game(42,true,'town',true);s3Files(hidden);s4Pacing(hidden);hidden.run('openLoadGame()');s3Ready(hidden,dto);hidden.run('s4Drain()');
  const unchanged=s2Snapshot(hidden);hidden.run('confirmSaveGameLoad(state.loadSession);s3Flush();s3Flush();document.hidden=true;s4Drain()');
  assert.equal(s2Snapshot(hidden),unchanged);assert.equal(hidden.run('state.loadSession.ui.phase'),'ready');
  hidden.run('document.hidden=false');hidden.visibility();assert.equal(s2Snapshot(hidden),unchanged);hidden.run('cancelSaveLoad()');
});

test('S4 large export freezes source, stays cancellable and emits no late download after cancellation', () => {
  for(const action of ['cancelSaveLoad()','newGame()','closeHelp()']) {
    const g=game(42,true,'town',true);s3Files(g);s4Pacing(g);
    g.run('state.inventory=Array.from({length:300},()=>({name:"Potion",kind:"heal",heal:0.5}));openHelp()');
    const before=s2Snapshot(g);assert.equal(g.run('saveGameFile()'),true);
    assert.equal(g.elements.cancelSavePreparation.hidden,false);assert.equal(g.run('state.loadSession.exporting'),true);
    g.run('s3Flush();enemyTick();movePlayer(1,0)');assert.equal(s2Snapshot(g),before);
    g.run('window.s4Late=[...s3.jobs.values()].find(j=>j.delay===0).fn');g.run(action);
    const after=s2Snapshot(g);g.run('window.s4Late();s4Drain()');assert.equal(s2Snapshot(g),after);
    assert.equal(g.run('s3.downloads.length'),0);assert.equal(g.elements.cancelSavePreparation.hidden,true);
  }
});

test('S4 cooperative export is lossless and refuses malformed history without pruning it', () => {
  const g=game(42,true,'town',true);s3Files(g);s4Pacing(g);
  g.run('state.inventory=Array.from({length:300},()=>({name:"Potion",kind:"heal",heal:0.5}));openHelp()');
  const before=s2Snapshot(g),expected=saveFixture(g);g.run('saveGameFile();s4Drain()');
  assert.equal(g.run('s3.downloads.length'),1);assert.equal(g.run('state.loadSession'),null);assert.equal(s2Snapshot(g),before);
  assert.deepEqual(g.json('parseSaveData(s3.blobs[0].parts[0]).run'),expected.run);
  g.run('state.inventory[299].heal=-1');const invalid=s2Snapshot(g);g.run('saveGameFile();s4Drain()');
  assert.equal(g.run('s3.downloads.length'),1);assert.equal(s2Snapshot(g),invalid);
  assert.match(g.elements.saveGameStatus.textContent,/Could not prepare/);
});

test('S4 bounded format accepts 65536 stored potions losslessly and refuses the next row', () => {
  const g=game(713,true,'town');
  g.run('state.inventory=Array.from({length:65536},()=>({name:"Potion",kind:"heal",heal:.5999999999999999}))');
  assert.equal(g.run(`parseSaveData(serializeSaveData(state,${JSON.stringify(SAVE_TEST_CONTEXT)})).run.inventory.length`),65536);
  g.run('state.inventory.push({name:"Potion",kind:"heal",heal:.5})');const before=s2Snapshot(g);
  assert.throws(()=>saveFixture(g),/Invalid save:/);assert.equal(s2Snapshot(g),before);
});

function m1Setup(g, stock = 'ITEM_TABLE') {
  g.run(`state.gold=2000;state.activeTime=37.25;state.inventory=[{name:'Potion',kind:'heal',heal:.499}];
    state.merchant.stock=${stock}.map((item,index)=>({...item,id:100+index}));`);
}
function m1Cart(g) { g.run('window.m1Cart=createTradeDraft(state,state.merchant)'); }
function m1Stage(g, action) { g.run(`window.m1Cart=stageTradeAction(window.m1Cart,${JSON.stringify(action)})`); }

test('M1 shared prices preserve every catalog item/depth including remembered town depth and reject unsafe money', () => {
  const g=game(713,true,'town');
  for(const depth of [1,2,50,100]) {
    g.run(`state.depth=${depth}`);
    assert.equal(g.run(`ITEM_TABLE.every(it=>buyPrice(it,${depth})===Math.round(it.gold*(1.5+(${depth}-1)*.03))
      &&tradePrice(it)===buyPrice(it,${depth})&&sellPrice(it)===Math.round(it.gold*.5)&&tradeSellPrice(it)===sellPrice(it))`),true);
  }
  for(const expression of ['buyPrice({gold:NaN},1)','buyPrice({gold:-1},1)','buyPrice({gold:"15"},1)',
    'buyPrice({gold:Number.MAX_SAFE_INTEGER},100)','sellPrice({gold:Infinity})','buyPrice(ITEM_TABLE[0],0)',
    'buyPrice(ITEM_TABLE[0],101)','buyPrice(ITEM_TABLE[0],2.5)']) assert.throws(()=>g.run(expression),/Invalid trade:/,expression);
});

test('M1 opening snapshot and all pure cart operations stay detached from town/floor aliases and side effects', () => {
  for(const area of ['town','dungeon']) {
    const g=game(713,true,area);if(area==='dungeon')g.run('enterFloor(2,false,true)');m1Setup(g,'[ITEM_TABLE[0],ITEM_TABLE[8],ITEM_TABLE[5]]');
    g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;
      window.m1Stock=state.merchant.stock;window.m1Inventory=state.inventory;window.m1Spells=state.player.spells;
      Math.random=()=>{throw new Error('draft RNG');};log=()=>{throw new Error('draft log');};
      playSound=()=>{throw new Error('draft sound');};render=()=>{throw new Error('draft render');};`);
    const before=s2Snapshot(g),dto=saveFixture(g);m1Cart(g);
    for(const action of [{type:'buy',rowId:'stock:0'},{type:'buy',rowId:'stock:1'},{type:'sell',slot:'ring'}])m1Stage(g,action);
    g.run('window.m1Cart=undoTradeAction(window.m1Cart);window.m1Cart=resetTradeDraft(window.m1Cart)');
    assert.equal(s2Snapshot(g),before);assert.deepEqual(saveFixture(g),dto);
    assert.equal(g.run(`state.merchant.stock===window.m1Stock&&state.inventory===window.m1Inventory&&state.player.spells===window.m1Spells
      &&window.m1Cart.original.stock[0].item!==state.merchant.stock[0]&&window.m1Cart.original.inventory[0]!==state.inventory[0]
      &&window.m1Cart.original.equipment.ring!==state.equipment.ring&&window.m1Cart.original.player.spells!==state.player.spells
      &&window.m1Cart.original.spellReadyAt!==state.spellReadyAt&&Object.isFrozen(window.m1Cart.original.player.spells)
      &&Object.isFrozen(window.m1Cart.original.stock[0].item)&&Object.isFrozen(window.m1Cart.rules)&&Object.isFrozen(window.m1Cart.history)
      &&!Object.isFrozen(state.merchant.stock[0])&&!Object.isFrozen(state.inventory[0])`),true);
    assert.throws(()=>g.run(`(()=>{'use strict';window.m1Cart.original.stock[0].item.gold=0;})()`),/read only/);
    assert.equal(g.run('state.trade'),null);assert.equal(g.run('Object.keys(state).length'),83);
  }
});

test('M1 second and last duplicate stock units use stable local row identities without source-ID writes', () => {
  const g=game(713,true,'town');m1Setup(g,'[ITEM_TABLE[0],ITEM_TABLE[0],ITEM_TABLE[0]]');
  g.run('state.merchant.stock.forEach(item=>item.id=100)');const before=s2Snapshot(g);m1Cart(g);
  m1Stage(g,{type:'buy',rowId:'stock:1'});m1Stage(g,{type:'buy',rowId:'stock:2'});
  assert.deepEqual(g.json('window.m1Cart.draft.stock.map(row=>row.rowId)'),['stock:0']);
  assert.deepEqual(g.json('window.m1Cart.draft.operations.map(op=>op.rowId)'),['stock:1','stock:2']);
  assert.equal(g.run('window.m1Cart.draft.gold'),1954);assert.equal(g.run('window.m1Cart.draft.inventory.length'),3);
  const cart=g.json('window.m1Cart');assert.throws(()=>m1Stage(g,{type:'buy',rowId:'stock:1'}),/unavailable/);
  assert.deepEqual(g.json('window.m1Cart'),cart);assert.equal(s2Snapshot(g),before);
  assert.equal(g.run('state.merchant.stock.every(it=>it.id===100&&!Object.hasOwn(it,"rowId"))'),true);
});

test('M1 only selected gear is sold and draft proceeds fund later purchases without loans', () => {
  const g=game(713,true,'town');m1Setup(g,'[ITEM_TABLE[1]]');
  g.run(`state.gold=30;equipItem('weapon',{...ITEM_TABLE[1]});equipItem('armor',{...ITEM_TABLE[3]});equipItem('ring',{...ITEM_TABLE[5]})`);
  const before=s2Snapshot(g);m1Cart(g);m1Stage(g,{type:'sell',slot:'weapon'});
  assert.equal(g.run('window.m1Cart.draft.gold'),50);assert.equal(g.run('window.m1Cart.draft.equipment.weapon'),null);
  assert.throws(()=>m1Stage(g,{type:'buy',rowId:'stock:0'}),/not enough/);
  assert.equal(g.run('window.m1Cart.history.length'),1);
  m1Stage(g,{type:'sell',slot:'armor'});m1Stage(g,{type:'buy',rowId:'stock:0'});
  assert.equal(g.run('window.m1Cart.draft.gold'),13);assert.equal(g.run('window.m1Cart.draft.equipment.weapon.name'),'Sword');
  assert.equal(g.run('window.m1Cart.draft.equipment.ring.name'),'Ring');assert.equal(s2Snapshot(g),before);
  assert.throws(()=>m1Stage(g,{type:'sell',slot:'inventory'}),/sell slot/);
});

test('M1 potion, scroll, elixir and spell drafts match actual effects without learning or drinking live', () => {
  const g=game(713,true,'town');m1Setup(g,'[...ITEM_TABLE,ITEM_TABLE[8]]');g.run('state.player.hp=23');
  const before=s2Snapshot(g);m1Cart(g);
  for(const index of [0,11,6,8])m1Stage(g,{type:'buy',rowId:'stock:'+index});
  assert.equal(g.run('window.m1Cart.draft.player.hp'),23);assert.equal(g.run('window.m1Cart.draft.inventory.length'),2);
  assert.equal(g.run('window.m1Cart.draft.inventory[1].heal'),.35);assert.equal(g.run('window.m1Cart.draft.townScrolls'),1);
  assert.equal(g.run('window.m1Cart.draft.gold'),1759);assert.equal(g.run('window.m1Cart.draft.player.str'),12);
  assert.equal(g.run('window.m1Cart.draft.player.dex'),10);assert.equal(g.run('window.m1Cart.draft.player.spells.frostbolt'),true);
  assert.equal(g.run('window.m1Cart.draft.spellReadyAt.frostbolt'),37.25);
  const staged=g.json('window.m1Cart');assert.throws(()=>m1Stage(g,{type:'buy',rowId:'stock:12'}),/already learned/);
  assert.deepEqual(g.json('window.m1Cart'),staged);assert.equal(s2Snapshot(g),before);
  g.run('window.m1Cart=resetTradeDraft(window.m1Cart)');assert.deepEqual(g.json('window.m1Cart.draft'),g.json('window.m1Cart.original'));
  assert.equal(g.run('window.m1Cart.draft.operations.length'),0);
});

test('M1 path-correct ring HP and Undo preserve clipping, same-bonus replacement and level-derived health', () => {
  for(const [maxHp,hp,afterSell,afterBuy]of [[80,75,60,80],[80,20,20,40],[140,139,120,140]]) {
    const g=game(713,true,'town');m1Setup(g,'[ITEM_TABLE[5]]');
    g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.maxHp=${maxHp};state.player.hp=${hp}`);
    const before=s2Snapshot(g);m1Cart(g);m1Stage(g,{type:'buy',rowId:'stock:0'});
    assert.equal(g.run('window.m1Cart.draft.player.hp'),hp);assert.equal(g.run('window.m1Cart.draft.player.maxHp'),maxHp);
    g.run('window.m1Cart=resetTradeDraft(window.m1Cart)');m1Stage(g,{type:'sell',slot:'ring'});
    assert.equal(g.run('window.m1Cart.draft.player.hp'),afterSell);assert.equal(g.run('window.m1Cart.draft.player.maxHp'),maxHp-20);
    m1Stage(g,{type:'buy',rowId:'stock:0'});assert.equal(g.run('window.m1Cart.draft.player.hp'),afterBuy);
    assert.equal(g.run('window.m1Cart.draft.player.maxHp'),maxHp);
    g.run('window.m1Cart=undoTradeAction(window.m1Cart)');assert.equal(g.run('window.m1Cart.draft.player.hp'),afterSell);
    g.run('window.m1Cart=undoTradeAction(window.m1Cart)');assert.equal(g.run('window.m1Cart.draft.player.hp'),hp);
    assert.equal(s2Snapshot(g),before);
  }
});

test('M1 god-mode preview freezes hero fields while equipment-derived bonuses follow proposed gear', () => {
  const g=game(713,true,'town');m1Setup(g,'[ITEM_TABLE[5],ITEM_TABLE[1]]');
  g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;state.godMode=true;state.godModeStats=snapshotPlayerStats()`);
  const before=s2Snapshot(g);m1Cart(g);m1Stage(g,{type:'sell',slot:'ring'});m1Stage(g,{type:'buy',rowId:'stock:1'});
  assert.equal(g.run('GOD_STAT_FIELDS.every(key=>window.m1Cart.draft.player[key]===state.godModeStats[key])'),true);
  assert.deepEqual(g.json('equipmentStatsFor(window.m1Cart.draft.player,window.m1Cart.draft.equipment)'),{hp:75,maxHp:80,str:14,dex:10,atk:20,def:5});
  assert.equal(g.run('window.m1Cart.rules.godModeStats!==state.godModeStats'),true);assert.equal(s2Snapshot(g),before);
  g.run(`equipItem('ring',null);equipItem('weapon',{...ITEM_TABLE[1]})`);
  assert.deepEqual(g.json('equipmentStatsFor(window.m1Cart.draft.player,window.m1Cart.draft.equipment)'),g.json('({hp:state.player.hp,maxHp:state.player.maxHp,str:effectiveStr(),dex:effectiveDex(),atk:effectiveAtk(),def:effectiveDef()})'));
});

test('M1 Undo and Reset retain only accepted operations including buy-then-sell and replacement notices', () => {
  const g=game(713,true,'town');m1Setup(g,'[ITEM_TABLE[1],ITEM_TABLE[5],ITEM_TABLE[8]]');
  g.run(`equipItem('weapon',{...ITEM_TABLE[2]})`);const before=s2Snapshot(g);m1Cart(g);
  m1Stage(g,{type:'buy',rowId:'stock:0'});assert.equal(g.run('window.m1Cart.draft.operations[0].replaced.name'),'Bow');
  assert.equal(g.run('window.m1Cart.draft.gold'),1940,'replacement does not automatically sell Bow');
  m1Stage(g,{type:'buy',rowId:'stock:1'});m1Stage(g,{type:'sell',slot:'ring'});
  assert.deepEqual(g.json('window.m1Cart.draft.operations.map(op=>op.type+":"+op.item.name)'),['buy:Sword','buy:Ring','sell:Ring']);
  g.run('window.m1Cart=undoTradeAction(window.m1Cart)');assert.equal(g.run('window.m1Cart.draft.equipment.ring.name'),'Ring');
  g.run('window.m1Cart=undoTradeAction(window.m1Cart)');assert.equal(g.run('window.m1Cart.draft.operations.length'),1);
  assert.deepEqual(g.json('window.m1Cart.draft.stock.map(row=>row.rowId)'),['stock:1','stock:2']);
  m1Stage(g,{type:'buy',rowId:'stock:2'});g.run('window.m1Cart=resetTradeDraft(window.m1Cart)');
  assert.equal(g.run('window.m1Cart.draft===window.m1Cart.original&&window.m1Cart.history.length===0'),true);
  g.run('window.m1Same=window.m1Cart;window.m1Cart=undoTradeAction(window.m1Cart)');assert.equal(g.run('window.m1Same===window.m1Cart'),true);
  assert.equal(s2Snapshot(g),before);
});

test('M1 rejects invalid source values and overflowing actions without altering source or accepted history', () => {
  for(const setup of ['state.gold=-1','state.gold=NaN','state.gold=Number.MAX_SAFE_INTEGER+1','state.townScrolls=Infinity',
    'state.player.hp=NaN','state.merchant.stock[0].gold=-1','state.merchant.stock[0].gold=NaN',
    'state.merchant.stock[0].atk=Number.MAX_SAFE_INTEGER+1','state.merchant.stock[0].extra={nested:true}',
    'state.inventory[0].extra={nested:true}','state.spellReadyAt.extra={}']) {
    const g=game(713,true,'town');m1Setup(g);g.run(setup);const before=s2Snapshot(g);
    assert.throws(()=>m1Cart(g),/Invalid trade:/,setup);assert.equal(s2Snapshot(g),before,setup);
  }
  for(const [setup,action]of [
    ['state.gold=Number.MAX_SAFE_INTEGER;equipItem("ring",{...ITEM_TABLE[5]})',{type:'sell',slot:'ring'}],
    ['state.townScrolls=Number.MAX_SAFE_INTEGER',{type:'buy',rowId:'stock:11'}],
    ['state.player.str=Number.MAX_SAFE_INTEGER',{type:'buy',rowId:'stock:1'}],
    ['',{type:'sell',slot:'__proto__'}],['',{type:'sell',slot:'ring'}],['',{type:'buy',rowId:-1}],['',{type:'confirm'}]]) {
    const g=game(713,true,'town');m1Setup(g);g.run(setup);m1Cart(g);const before=s2Snapshot(g),cart=g.json('window.m1Cart');
    assert.throws(()=>m1Stage(g,action),/Invalid trade:/);assert.deepEqual(g.json('window.m1Cart'),cart);assert.equal(s2Snapshot(g),before);
  }
});

test('M1 immutable captured depth/time/stock/spells keep a draft independent of later live changes', () => {
  const g=game(713,true,'town');m1Setup(g,'[ITEM_TABLE[8]]');g.run('state.depth=50');m1Cart(g);
  g.run('state.depth=1;state.activeTime=99;state.gold=0;state.merchant.stock.length=0;state.player.spells.frostbolt=true');
  const before=s2Snapshot(g);m1Stage(g,{type:'buy',rowId:'stock:0'});
  assert.equal(g.run('window.m1Cart.draft.gold'),1792);assert.equal(g.run('window.m1Cart.draft.spellReadyAt.frostbolt'),37.25);
  assert.equal(g.run('window.m1Cart.rules.pricingDepth'),50);assert.equal(s2Snapshot(g),before);
  // M2 must reject committing this stale cart; M1 deliberately has no live commit API.
});

function m2Setup(area='town') {
  const g=game(713,true,area,true);if(area==='dungeon')g.run('enterFloor(2,false,true)');
  g.run(`state.gold=1000;state.activeTime=37.25;state.merchant.stock=[ITEM_TABLE[0],ITEM_TABLE[1],ITEM_TABLE[5],ITEM_TABLE[8],ITEM_TABLE[11],ITEM_TABLE[6]].map((it,i)=>({...it,id:100+i}));
    state.player.x=state.merchant.x;state.player.y=state.merchant.y;render();`);return g;
}
function m2Snapshot(g) {
  return g.run(`JSON.stringify(state,(key,value)=>['trade','art','motion','audio','lastTick','helpFocus','loadSession'].includes(key)?undefined:value instanceof Set?[...value]:value)`);
}
function m2AssertSame(g, before, label='') {
  const after=m2Snapshot(g);
  function difference(a,b,path='state') {
    if(JSON.stringify(a)===JSON.stringify(b))return '';
    if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
      const found=difference(a[key],b[key],path+'.'+key);if(found)return found;
    }
    return path+': '+JSON.stringify(a)+' -> '+JSON.stringify(b);
  }
  assert.equal(after===before,true,label+' '+(after===before?'':difference(JSON.parse(before),JSON.parse(after))));
}
function m2Click(g,id) { return g.run(`document.getElementById('${id}').onclick()`); }

test('M2 Space and X open Buy/Sell carts with nearby town and exact dungeon access, never an immediate trade', () => {
  for(const area of ['town','dungeon']) {
    const g=m2Setup(area);g.run('state.player.x++;render(true)');const before=m2Snapshot(g);
    assert.equal(g.run('openTrade()'),area==='town');
    if(area==='town') { assert.equal(g.run('state.trade.mode'),'buy');g.run('closeTrade(false)');m2AssertSame(g,before); }
    g.run('state.player.x=state.merchant.x;render(true)');const exact=m2Snapshot(g);g.key('x');
    assert.equal(g.run('state.trade.mode'),'sell');assert.equal(g.run('state.trade.cart.draft.operations.length'),0);
    m2AssertSame(g,exact);g.key('Escape');m2AssertSame(g,exact);
    g.key(' ');assert.equal(g.run('!!state.trade'),true);assert.equal(g.elements.tradeOverlay.hidden,false);
    assert.equal(g.elements.gameLayout.inert,true);g.run('closeTrade(false)');assert.equal(g.elements.gameLayout.inert,false);
  }
  for(const setup of ['state.started=false','state.pause={kind:"health"}','state.consoleOpen=true','state.helpOpen=true','document.hidden=true','state.companionPicker={}','state.loadSession={}']) {
    const g=m2Setup();g.run(setup);assert.equal(g.run('openTrade()'),false,setup);
  }
});

test('M2 selecting rows and staging purchases/sales/Undo/Reset/Cancel leaves live state, aliases, HUD and notices unchanged', () => {
  const g=m2Setup();g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;render();
    window.m2Stock=state.merchant.stock;window.m2Spells=state.player.spells;
    window.m2Calls=[];log=()=>window.m2Calls.push('log');playSound=()=>window.m2Calls.push('sound');Math.random=()=>{throw new Error('preview RNG');};`);
  const before=m2Snapshot(g),hud=g.elements.hpText.textContent;g.run('openTrade()');
  assert.equal(g.run('selectTradeRow(state.trade,"buy","stock:3")'),true);assert.equal(g.run('state.trade.cart.draft.operations.length'),0);
  m2Click(g,'addTradePurchase');g.run(`tradeSell('ring');tradeBuy('stock:0');tradeBuy('stock:4')`);
  assert.equal(g.run('state.trade.cart.draft.operations.length'),4);m2AssertSame(g,before);
  assert.equal(g.elements.hpText.textContent,hud);assert.equal(g.run('state.merchant.stock===window.m2Stock&&state.player.spells===window.m2Spells'),true);
  m2Click(g,'undoTrade');m2Click(g,'resetTrade');m2AssertSame(g,before);
  g.run(`tradeBuy('stock:2');tradeSell('ring');tradeBuy('stock:3')`);m2Click(g,'cancelTrade');
  m2AssertSame(g,before);assert.deepEqual(g.json('window.m2Calls'),[]);assert.equal(g.run('state.trade'),null);
  assert.equal(g.elements.tradeBuyList.children.length,0);assert.equal(g.elements.confirmTrade.onclick,null);
});

test('M2 Confirm applies retained operations once, defers spell/purchase/sale notices and companion sold-out remarks', () => {
  const g=m2Setup();g.run(`state.merchant.stock=[{...ITEM_TABLE[5]},{...ITEM_TABLE[8]},{...ITEM_TABLE[11]}];
    Math.random=()=>{throw new Error('trade commit RNG');};window.m2Sounds=[];window.m2Comp=0;playSound=name=>window.m2Sounds.push(name);companionTalk=kind=>{if(kind==='merchant')window.m2Comp++;};`);
  const originalMessages=g.json('state.messages');g.run(`openTrade();window.m2Session=state.trade;tradeBuy('stock:0');tradeSell('ring');tradeBuy('stock:1');tradeBuy('stock:2')`);
  assert.deepEqual(g.json('state.messages'),originalMessages);assert.deepEqual(g.json('window.m2Sounds'),[]);
  assert.equal(g.run('confirmTrade(window.m2Session)'),true);assert.equal(g.run('confirmTrade(window.m2Session)'),false);
  assert.equal(g.run('state.gold'),732);assert.equal(g.run('state.player.maxHp'),60);assert.equal(g.run('state.equipment.ring'),null);
  assert.equal(g.run('state.player.spells.frostbolt'),true);assert.equal(g.run('state.spellReadyAt.frostbolt'),37.25);
  assert.equal(g.run('state.townScrolls'),1);assert.equal(g.run('state.merchant.stock.length'),0);
  assert.equal(g.run('window.m2Sounds.length'),4);assert.equal(g.run('window.m2Comp'),1);
  assert.equal(g.run('state.messages.filter(s=>s.includes("Bought Ring")).length'),1);
  assert.equal(g.run('state.messages.filter(s=>s.includes("Sold Ring")).length'),1);
  assert.equal(g.run('state.messages.filter(s=>s.includes("learned Frostbolt")).length'),1);
  g.run('openTrade();confirmTrade()');assert.equal(g.run('window.m2Comp'),1);assert.equal(g.run('window.m2Sounds.length'),4);
});

test('M2 committed ring/god-mode HP equals the path-dependent preview including same-bonus replacements', () => {
  for(const [maxHp,hp,god,sale]of [[80,75,false,true],[80,20,false,true],[140,139,false,true],[80,75,false,false],[80,75,true,true]]) {
    const g=m2Setup();g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.maxHp=${maxHp};state.player.hp=${hp};
      state.godMode=${god};state.godModeStats=${god} ? snapshotPlayerStats() : null;openTrade()`);
    if(sale)g.run(`tradeSell('ring')`);g.run(`tradeBuy('stock:2');window.m2Expected=state.trade.cart.draft.player`);
    const expected=g.json('window.m2Expected');assert.equal(g.run('confirmTrade()'),true);
    assert.equal(g.run('state.player.hp'),expected.hp);assert.equal(g.run('state.player.maxHp'),expected.maxHp);
    assert.equal(g.run('state.equipment.ring.name'),'Ring');
  }
});

test('M2 known/unaffordable/pending rows remain visible and disabled; no invalid or empty sale enters the cart', () => {
  const g=m2Setup();g.run('state.player.spells.frostbolt=true;state.gold=0;openTrade()');
  assert.equal(g.elements.tradeBuyList.children[3].children[0].disabled,true);
  assert.equal(g.elements.tradeBuyList.children[3].children[1].textContent,'Already learned');
  assert.equal(g.elements.tradeBuyList.children[0].children[1].textContent,'Not enough gold');
  const before=m2Snapshot(g);assert.equal(g.run(`tradeBuy('stock:3')`),false);assert.equal(g.run(`tradeSell('ring')`),false);
  assert.equal(g.run('state.trade.cart.history.length'),0);m2AssertSame(g,before);
  g.run('confirmTrade()');m2AssertSame(g,before);
});

test('M2 staged sales fund selected purchases and removed/undone operations emit no notices', () => {
  const g=m2Setup();g.run(`state.gold=30;equipItem('weapon',{...ITEM_TABLE[1]});equipItem('armor',{...ITEM_TABLE[3]});openTrade();
    tradeSell('weapon');tradeSell('armor');tradeBuy('stock:0');editTradeCart(state.trade,false);tradeBuy('stock:1')`);
  assert.equal(g.run('state.trade.cart.draft.gold'),13);
  assert.equal(g.run('confirmTrade()'),true);assert.equal(g.run('state.gold'),13);assert.equal(g.run('state.equipment.armor'),null);
  assert.equal(g.run('state.equipment.weapon.name'),'Sword');assert.equal(g.run('state.inventory.length'),0);
  assert.equal(g.run('state.messages.some(s=>s.includes("Bought Potion"))'),false);
});

test('M2 Confirm rejects changed context, source values and forged cart results without overwriting newer progress', () => {
  for(const change of ['state.gold++','state.player.hp--','state.inventory.push({name:"Potion",kind:"heal",heal:.5})',
    'state.player.spells.frostbolt=true','state.spellReadyAt.heal++','state.merchant.stock[0].gold++',
    'state.activeTime++','state.godMode=true;state.godModeStats=snapshotPlayerStats()',
    'state.player.x+=3','state.map=state.map.map(row=>row.slice())','state.merchant={...state.merchant}',
    'state.trade.cart={...state.trade.cart,draft:{...state.trade.cart.draft,gold:999999}}']) {
    const g=m2Setup();g.run(`openTrade();tradeBuy('stock:0')`);g.run(change);g.run('render(true)');const before=m2Snapshot(g);
    assert.equal(g.run('confirmTrade()'),false,change);m2AssertSame(g,before,change);
    assert.equal(g.elements.confirmTrade.disabled,true);assert.match(g.elements.tradeStatus.textContent,/out of date/);
    g.run('closeTrade(false)');m2AssertSame(g,before);
  }
});

test('M2 callbacks capture session identity so stale select/add/Confirm/Cancel cannot affect another shop', () => {
  const g=m2Setup();g.run(`openTrade();window.m2Old=state.trade;window.m2OldSelect=document.getElementById('tradeBuyList').children[1].children[0].onclick;
    window.m2OldAdd=document.getElementById('addTradePurchase').onclick;window.m2OldConfirm=document.getElementById('confirmTrade').onclick;
    window.m2OldCancel=document.getElementById('cancelTrade').onclick;closeTrade(false);openTrade();`);
  const before=m2Snapshot(g);g.run('window.m2OldSelect();window.m2OldAdd();window.m2OldConfirm();window.m2OldCancel()');
  m2AssertSame(g,before);assert.equal(g.run('state.trade!==window.m2Old'),true);assert.equal(g.run('state.trade.cart.draft.operations.length'),0);
});

test('M2 failed equipment application or save restores exact scoped values and cached town/floor aliases before notices', () => {
  for(const area of ['town','dungeon'])for(const failure of ['equip','save','paint']) {
    const g=m2Setup(area);g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;render();
      window.m2Refs=[state.inventory,state.player.spells,state.spellReadyAt,state.merchant.stock,state.equipment,state.merchant];
      window.m2Sounds=0;playSound=()=>window.m2Sounds++;openTrade();tradeSell('ring');tradeBuy('stock:3');tradeBuy('stock:0');`);
    const before=m2Snapshot(g);
    if(failure==='equip')g.run('window.m2Equip=equipItem;equipItem=(...args)=>{window.m2Equip(...args);throw new Error("equip failed");}');
    if(failure==='save')g.run(area==='town'?'window.m2Save=saveTown;saveTown=()=>{window.m2Save();throw new Error("town save failed");}':'window.m2Save=saveFloor;saveFloor=()=>{window.m2Save();throw new Error("floor save failed");}');
    if(failure==='paint')g.run('window.m2Render=render;window.m2Paint=0;render=(...args)=>{window.m2Render(...args);if(!window.m2Paint++)throw new Error("paint failed");}');
    assert.equal(g.run('confirmTrade()'),false,area+failure);m2AssertSame(g,before,area+failure);
    assert.equal(g.run('window.m2Refs.every((ref,i)=>ref===[state.inventory,state.player.spells,state.spellReadyAt,state.merchant.stock,state.equipment,state.merchant][i])'),true);
    assert.equal(g.run('window.m2Sounds'),0);assert.match(g.elements.tradeStatus.textContent,/unchanged/);assert.equal(g.run('state.trade.invalid'),true);
  }
});

test('M2 confirmed store/merchant stock, gear and spell knowledge persist across revisits and portable snapshots', () => {
  for(const area of ['town','dungeon']) {
    const g=m2Setup(area);g.run(`window.m2Merchant=state.merchant;openTrade();tradeBuy('stock:1');tradeBuy('stock:3');confirmTrade()`);
    const expected=g.json('[state.gold,state.equipment,state.player.spells,state.merchant.stock]');
    if(area==='town')g.run('enterDungeonFromTown();enterTown()');else g.run('enterFloor(4,false);enterFloor(2,false)');
    assert.deepEqual(g.json('[state.gold,state.equipment,state.player.spells,state.merchant.stock]'),expected);
    assert.equal(g.run('state.merchant===window.m2Merchant'),true);assert.equal('trade' in saveFixture(g).run,false);
  }
});

test('M2 keyboard selection/shortcuts, trapped focus, audio, hidden retention and restart have guarded behavior', () => {
  const g=m2Setup();g.run('openTrade()');g.key('ArrowDown');assert.equal(g.run('state.trade.selectedBuy'),'stock:1');
  g.key('Enter');assert.equal(g.run('state.trade.cart.draft.operations.length'),0,'Enter is not global Confirm');
  g.key('b');assert.equal(g.run('state.trade.cart.draft.operations.length'),1);g.key('u');assert.equal(g.run('state.trade.cart.draft.operations.length'),0);
  g.key('b');g.key('u',{shiftKey:true});assert.equal(g.run('state.trade.cart.draft.operations.length'),0);
  g.run('document.getElementById("closeTrade").focus()');g.key('Tab',{shiftKey:true});assert.equal(g.run('document.activeElement===document.getElementById("tradeAudioToggle")'),true);
  const enabled=g.run('state.audio.enabled');g.key('m');assert.equal(g.run('state.audio.enabled'),!enabled);
  g.key('?');g.key('~');assert.equal(g.run('state.helpOpen||state.consoleOpen'),false);
  g.run(`tradeBuy('stock:0');document.hidden=true`);assert.equal(g.run('confirmTrade()'),false);assert.equal(g.run('state.trade.cart.draft.operations.length'),1);
  g.run('document.hidden=false');g.visibility();assert.equal(g.run('state.inventory.length'),0);g.key('r');
  assert.equal(g.run('state.trade'),null);assert.equal(g.elements.tradeOverlay.hidden,true);assert.equal(g.run('state.gold'),0);
});

test('M2 forced travel, death and restart discard drafts without spell/HP/item/currency effects or stale commits', () => {
  for(const transition of ['enterFloor(4,false,true)','enterTown()','newGame()','gameOver(false)']) {
    const g=m2Setup('dungeon');g.run(`openTrade();window.m2Old=state.trade;window.m2Stock=state.merchant.stock;tradeBuy('stock:2');tradeBuy('stock:3')`);
    const before=g.json('[state.gold,state.player.hp,state.player.maxHp,state.inventory,state.player.spells]');g.run(transition);
    assert.equal(g.run('state.trade'),null);assert.equal(g.elements.tradeOverlay.hidden,true);assert.equal(g.run('confirmTrade(window.m2Old)'),false);
    if(transition==='enterFloor(4,false,true)'||transition==='enterTown()')assert.deepEqual(g.json('[state.gold,state.player.hp,state.player.maxHp,state.inventory,state.player.spells]'),before);
    assert.equal(g.run('window.m2Stock.length'),6);
  }
});

test('M2 item details warn about gear replacement, label elixir honestly and render names as plain text', () => {
  const g=m2Setup();g.run(`equipItem('weapon',{...ITEM_TABLE[2]});state.merchant.stock[1].name='Sword <img src=x>';openTrade();selectTradeRow(state.trade,'buy','stock:1')`);
  assert.match(g.elements.tradeBuyDetails.textContent,/Replaces Bow; sell it first/);assert.equal(g.elements.addTradePurchase.textContent,'Buy & equip (B)');
  assert.match(g.elements.tradeBuyList.children[1].children[0].children[1].textContent,/<img src=x>/);
  g.run(`selectTradeRow(state.trade,'buy','stock:5')`);assert.match(g.elements.tradeBuyDetails.textContent,/60 gold.*no stat bonus/);
});

test('M3 direct player/combat/portal helpers independently honor an open market without side effects', () => {
  const g=m2Setup('dungeon');g.run(`equipItem('weapon',{...ITEM_TABLE[2]});state.player.hp=35;state.player.mp=10;state.townScrolls=3;openTrade();
    window.m3Target=state.monsters[0];window.m3Random=Math.random;Math.random=()=>{throw new Error('blocked market RNG');};`);
  const before=m2Snapshot(g);
  for(const call of ['movePlayer(1,0)','attackMonster(window.m3Target)','enemyAttack(window.m3Target)','shootBow()',
    'castSpell("heal")','hurtPlayer(3,"stale damage")','pickup()','rescuePrisoner()','rescuePrincess()',
    'ascendStairs()','descendStairs()','useTownScroll()']) {
    g.run(call);m2AssertSame(g,before,call);
  }
  g.run('Math.random=window.m3Random;closeTrade(false);enterTown();state.player.x=state.merchant.x;state.player.y=state.merchant.y;state.player.hp=30;render(true);openTrade()');
  const town=m2Snapshot(g);for(const call of ['townInteract()','restAtInn()','townNpcTalk(state.town.npcs[0])','townEncounter()','returnThroughTownPortal()']){g.run(call);m2AssertSame(g,town,call);}
});

test('M3 market freezes every timed subsystem and resumes without charging menu or slow-paint time', () => {
  for(const area of ['town','dungeon']) {
    const clock=Date.now;try {
    const g=m2Setup(area);g.run(`state.player.hp=35;state.player.mp=7;state.combatElapsed=10;state.healElapsed=1.75;state.retreatReadyAt=100;
      state.manaRegenAt=1;render(true);openTrade();window.m3Date=Date.now;window.m3Now=window.m3Date();Date.now=()=>window.m3Now;
      window.m3Random=Math.random;Math.random=()=>{throw new Error('paused RNG');};`);
    const before=m2Snapshot(g);
    g.run('window.m3Now+=120000;enemyTick();advanceActiveTime(120);townTick();hazardTick();recoveryTick(120);regenMana();companionTick()');
    m2AssertSame(g,before,area);assert.equal(g.run('motionPlayable()'),false);
    g.run(`Math.random=window.m3Random;window.m3Render=render;render=(...args)=>{window.m3Render(...args);window.m3Now+=2000;};closeTrade(false)`);
    assert.equal(g.run('state.lastTick===window.m3Now'),true,'close paint earns no catch-up time');
    g.run('render=window.m3Render;Date.now=window.m3Date');
    } finally { Date.now=clock; }
  }
});

test('M3 failed opening and closing paints release modal ownership, inert flags, callbacks and focus for retry', () => {
  const g=m2Setup();g.run(`document.getElementById('game').focus();window.m3Render=render;render=()=>{throw new Error('open paint');}`);
  const before=m2Snapshot(g);assert.equal(g.run('openTrade()'),false);m2AssertSame(g,before);
  assert.equal(g.run('state.trade'),null);assert.equal(g.elements.tradeOverlay.hidden,true);assert.equal(g.elements.gameLayout.inert,false);
  g.run('render=window.m3Render;openTrade();render=()=>{throw new Error("close paint");}');
  assert.equal(g.run('closeTrade(false)'),true);assert.equal(g.run('state.trade'),null);assert.equal(g.run('document.activeElement===canvas'),true);
  g.run('render=window.m3Render;openTrade()');assert.equal(g.run('!!state.trade'),true);
});

test('M3 shop/companion/Help/health/retreat/load dialogs exclude each other and preserve underlying warnings', () => {
  const g=m2Setup();g.run('openTrade();window.m3Cart=state.trade;openCompanionBoard();openHelp();openConsole()');
  assert.equal(g.run('state.trade===window.m3Cart&&!state.helpOpen&&!state.consoleOpen&&!state.companionPicker'),true);
  assert.equal(g.run('beginSaveLoad()'),null);g.run('closeTrade(false)');
  for(const kind of ['health','retreat']) {
    g.run(`state.pause={kind:${JSON.stringify(kind)}};state.warnedLow=true;state.warnedCritical=true;`);
    assert.equal(g.run('openTrade()'),false);g.run('openHelp();closeHelp()');
    assert.equal(g.run('state.pause.kind'),kind);assert.equal(g.run('state.warnedLow&&state.warnedCritical'),true);
  }
});

test('M3 scroll/debug/retreat returns survive shopping exactly once without changing companions or cooldowns', () => {
  for(const reason of ['scroll','cheat','retreat']) {
    const g=game(713,true,'town',true);g.run(`enterFloor(2,false,true);state.townScrolls=3;state.activeTime=50;state.player.mp=7;
      state.retreatReadyAt=0;`);
    if(reason==='scroll')g.run('useTownScroll()');
    else if(reason==='cheat')g.run('teleportTown()');
    else g.run('state.pause={kind:"retreat"};confirmRetreat()');
    g.run(`state.gold=1000;state.player.x=state.merchant.x;state.player.y=state.merchant.y;render(true);
      window.m3Return=JSON.stringify([state.townExit,state.townPortalOpen,state.retreatReadyAt,state.player.mp,state.companion,state.unlockedCompanions,state.companionAttackAt]);
      openTrade();tradeBuy('stock:0');confirmTrade();`);
    assert.equal(g.run('JSON.stringify([state.townExit,state.townPortalOpen,state.retreatReadyAt,state.player.mp,state.companion,state.unlockedCompanions,state.companionAttackAt])===window.m3Return'),true);
    const scrolls=g.run('state.townScrolls');g.run('enterDungeonFromTown()');assert.equal(g.run('state.depth'),2);
    assert.equal(g.run('state.townExit'),null);assert.equal(g.run('state.townPortalOpen'),false);assert.equal(g.run('state.townScrolls'),scrolls);
    assert.equal(g.run('returnThroughTownPortal()'),false);
  }
});

test('M3 every companion can shop without reselection, retirement, unlock or attack-time changes', () => {
  const g=m2Setup();g.run('window.m3Ids=Object.keys(COMPANIONS)');
  for(const id of g.json('window.m3Ids')) {
    g.run(`unlockCompanion(${JSON.stringify(id)});activateCompanion(${JSON.stringify(id)});state.gold=1000;
      state.merchant.stock=[{...ITEM_TABLE[0]},{...ITEM_TABLE[11]}];state.player.x=state.merchant.x;state.player.y=state.merchant.y;render(true)`);
    const before=g.json('[state.companion,state.selectedCompanion,state.unlockedCompanions,state.entranceCat,state.companionEntryDone,state.companionAttackAt]');
    g.run(`openTrade();tradeBuy('stock:0');confirmTrade()`);
    assert.deepEqual(g.json('[state.companion,state.selectedCompanion,state.unlockedCompanions,state.entranceCat,state.companionEntryDone,state.companionAttackAt]'),before,id);
  }
});

test('M3 successful market commit survives save/hydrate, god-mode freeze and once-only ordinary revisit rules', () => {
  const g=m2Setup('dungeon');g.run(`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;state.godMode=true;state.godModeStats=snapshotPlayerStats();
    openTrade();tradeSell('ring');tradeBuy('stock:3');confirmTrade()`);
  assert.equal(g.run('state.player.hp'),75);assert.equal(g.run('state.player.maxHp'),80);assert.equal(g.run('state.player.spells.frostbolt'),true);
  g.run('state.godMode=false;state.godModeStats=null');const dto=saveFixture(g);
  const h=game();s2InstallDto(h,dto);assert.equal(h.run('commitSaveLoad(beginSaveLoad(),window.s2Dto)'),true);
  assert.deepEqual(saveFixture(h),dto);h.run('enterFloor(4,false);enterFloor(2,false)');
  assert.equal(h.run('state.player.spells.frostbolt'),true);assert.equal(h.run('state.merchant.stock.length'),5);assert.equal(h.run('state.equipment.ring'),null);
});

test('M3 forced boss-ending/debug transitions discard pending carts and reject all saved shop handlers', () => {
  for(const transition of ['loadLevel("5")','enterTown()','gameOver(false)','newGame()']) {
    const g=m2Setup('dungeon');g.run(`openTrade();tradeBuy('stock:3');window.m3Session=state.trade;
      window.m3Callbacks=['confirmTrade','cancelTrade','addTradePurchase'].map(id=>document.getElementById(id).onclick)`);
    g.run(transition);const before=m2Snapshot(g);g.run('window.m3Callbacks.forEach(fn=>fn())');m2AssertSame(g,before);
    assert.equal(g.elements.tradeOverlay.hidden,true);assert.equal(g.elements.gameLayout.inert,false);assert.equal(g.run('!!state.player.spells.frostbolt'),false);
  }
});

test('M3 forced transitions inside equipment/save/paint hooks roll back before switching context and stop stale commit work', () => {
  for(const hook of ['equip','save','paint'])for(const transition of ['newGame()','enterFloor(4,false,true)']) {
    const g=m2Setup('dungeon');g.run(`window.m3Merchant=state.merchant;openTrade();tradeBuy('stock:2');tradeBuy('stock:3');window.m3Confirm=document.getElementById('confirmTrade').onclick`);
    if(hook==='equip')g.run(`window.m3Equip=equipItem;equipItem=(...args)=>{window.m3Equip(...args);equipItem=window.m3Equip;${transition};}`);
    else if(hook==='save')g.run(`window.m3Save=saveFloor;saveFloor=()=>{window.m3Save();saveFloor=window.m3Save;${transition};}`);
    else g.run(`window.m3Render=render;render=(...args)=>{window.m3Render(...args);render=window.m3Render;${transition};}`);
    assert.equal(g.run('window.m3Confirm()'),false,hook+transition);
    assert.equal(g.run('state.trade'),null);assert.equal(g.run('state.player.maxHp'),60);assert.equal(g.run('state.equipment.ring'),null);
    assert.equal(g.run('!!state.player.spells.frostbolt'),false);assert.equal(g.run('window.m3Merchant.stock.length'),6);
    assert.equal(g.run('state.gold'),transition==='newGame()'?0:1000);assert.equal(g.run('state.messages.some(s=>s.includes("Bought Ring")||s.includes("Bought Frostbolt"))'),false);
    const before=m2Snapshot(g);g.run('window.m3Confirm()');m2AssertSame(g,before);
  }
});

test('M3 stale backdrop callbacks and unavailable audio cannot cancel newer shops or repeat a successful trade', () => {
  const g=m2Setup();g.run(`openTrade();window.m3Backdrop=document.getElementById('tradeOverlay').onclick;closeTrade(false);openTrade();`);
  assert.equal(g.run('typeof window.m3Backdrop'),'function');g.run(`window.m3Backdrop({target:{id:'tradeOverlay'}})`);
  assert.equal(g.run('!!state.trade'),true);
  g.run(`tradeBuy('stock:0');window.m3Session=state.trade;playSound=()=>{throw new Error('audio device unavailable');}`);
  assert.equal(g.run('confirmTrade()'),true);assert.equal(g.run('state.inventory.length'),1);assert.equal(g.run('state.gold'),977);
  assert.equal(g.run('state.messages.filter(s=>s.includes("Bought Potion")).length'),1);assert.equal(g.run('confirmTrade(window.m3Session)'),false);
  assert.equal(g.run('document.activeElement===canvas'),true);
});

test('M3 final ending discards a staged cart and cannot carry its session into ending skip or restart', () => {
  const g=m2Setup('dungeon');g.run(`enterFloor(100,false,true);state.bossDefeated=true;state.princess.rescued=true;
    state.merchant={x:state.player.x,y:state.player.y,stock:[{...ITEM_TABLE[8]}]};state.gold=1000;openTrade();
    tradeBuy('stock:0');window.m3Old=state.trade;gameOver(true)`);
  assert.equal(g.run('!!state.ending'),true);assert.equal(g.run('state.trade'),null);assert.equal(g.elements.tradeOverlay.hidden,true);
  assert.equal(g.run('!!state.player.spells.frostbolt'),false);assert.equal(g.run('confirmTrade(window.m3Old)'),false);
  g.run('skipEnding();newGame()');assert.equal(g.run('state.trade'),null);assert.equal(g.elements.gameLayout.inert,false);
});
