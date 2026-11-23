const TILE = 32, W = 72, H = 48, MAP_ZOOM = 2, VIEW_W = 18, VIEW_H = 12;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;


const MONSTER_TYPES = [
  { name: 'Slime',    sprite: 'slime',    hp: 14, atk: 5,  def: 0, xp: 10 },
  { name: 'Bat',      sprite: 'bat',      hp: 10, atk: 7,  def: 1, xp: 14 },
  { name: 'Goblin',   sprite: 'goblin',   hp: 22, atk: 9,  def: 2, xp: 22 },
  { name: 'Skeleton', sprite: 'skeleton', hp: 28, atk: 12, def: 4, xp: 32 },
  { name: 'Orc',      sprite: 'orc',      hp: 40, atk: 16, def: 5, xp: 50 },
];

const ITEM_TABLE = [
  { name: 'Potion',   sprite: 'potion',  gold: 15, kind: 'heal', heal: 0.35 },
  { name: 'Sword',    sprite: 'sword',   gold: 40, kind: 'weapon', atk: 6, str: 2 },
  { name: 'Armor',    sprite: 'armor',   gold: 45, kind: 'armor', def: 4, str: 1 },
  { name: 'Helmet',   sprite: 'helmet',  gold: 30, kind: 'armor', def: 2, dex: 2 },
  { name: 'Ring',     sprite: 'ring',    gold: 80, kind: 'ring', maxHp: 20, atk: 3, def: 2, str: 1, dex: 2 },
  { name: 'Elixir',   sprite: 'elixir',  gold: 60, kind: 'elixir', str: 2, dex: 2 },
  { name: 'Shield',   sprite: 'shield',  gold: 55, kind: 'armor', def: 5 },
];

const GAME_VERSION = '0.12.0';
// Brief quotations from Monty Python and the Holy Grail; official sources in README.
const MONSTER_QUOTES = ['Ni!', 'None shall pass!', "'Tis but a scratch.", 'Run away!'];
const MONSTER_SPEECH_DURATION = 5, MONSTER_SPEECH_INTERVAL = 5;
const ENDING_DURATION = 14;
const MIMIC_DEFEAT_DURATION = 1.6, DRAGON_DEFEAT_DURATION = 2.6;
const GOLD_PER_LEVEL = 3;
const FINAL_DEPTH = 10, ENEMY_ATTACK_INTERVAL = 0.8, RETREAT_COOLDOWN = 60;
const HEAL_FRACTION = 0.02;
const FLOOR_FIELDS = ['map', 'rooms', 'potions', 'stairs', 'upstairs', 'treasures',
  'merchant', 'prisoner', 'princess', 'visited', 'monsterSpawns', 'bossDefeated', 'floorKey', 'obstacles', 'hazards', 'hazardTime'];

let state;

function newGame() {
  stopMotionAnimation();
  stopEndingAnimation();
  stopBossDefeatAnimation();
  const started = state ? state.started : false;
  const art = state ? state.art : null;
  const audio = state ? state.audio : { context: null, master: null, musicBus: null, effectsBus: null, musicVolume: 0.45, effectsVolume: 0.8, enabled: true, step: 0, nextNote: 0 };
  document.getElementById('overlay').style.display = 'none';
  state = {
    depth: 1, kills: 0, turn: 0, started, messages: [], helpOpen: false, helpFocus: null,
    player: { x: 0, y: 0, hp: 60, maxHp: 60, str: 12, dex: 10, def: 3, lvl: 1, xp: 0, xpNext: 40 },
    inventory: [],
    gold: 0, equipment: { weapon: null, armor: null, ring: null },
    map: null, rooms: [], monsters: [], potions: [], stairs: null,
    treasures: [], merchant: null, boss: null, prisoner: null, princess: null,
    monsterSpeech: null, monsterSpeechReadyAt: 0, monsterQuoteIndex: 0,
    gameOver: false, won: false, ending: null, bossDefeat: null, bubble: null, visited: new Set(), floors: {},
    upstairs: null, monsterSpawns: [], pause: null, warnedLow: false, warnedCritical: false,
    combatElapsed: 0, healElapsed: 0, activeTime: 0, retreatReadyAt: 0, bossDefeated: false,
    camera: { x: 0, y: 0 }, floorKey: null, obstacles: [], hazards: [], hazardTime: 0,
    lastTick: Date.now(), audio, art, motion: freshMotionState(),
  };
  document.getElementById('endingControls').hidden = true;
  document.getElementById('helpOverlay').hidden = true;
  document.getElementById('helpToggle').ariaExpanded = 'false';
  document.getElementById('gameLayout').inert = false;
  document.getElementById('launchScreen').inert = false;
  document.getElementById('launchScreen').hidden = started;
  document.getElementById('gameLayout').hidden = !started;
  document.getElementById('launchVersion').textContent = `v${GAME_VERSION}`;
  genLevel();
  revealAroundPlayer();
  log('Enter the dungeon. A hidden monster carries the key to the next floor.');
}

function startGame() {
  if (state.started) return;
  state.started = true;
  state.lastTick = Date.now();
  document.getElementById('launchScreen').hidden = true;
  document.getElementById('gameLayout').hidden = false;
  startAudio();
  canvas.focus?.();
  render();
}

function genLevel() {
  const map = [];
  for (let y = 0; y < H; y++) map.push(new Array(W).fill(1)); // 1 = wall
  const rooms = [{ x: 2, y: 2, w: 8, h: 6, cx: 6, cy: 5 }];
  for (let y = 2; y < 8; y++) for (let x = 2; x < 10; x++) map[y][x] = 0;
  const isBossLevel = state.depth % 5 === 0;
  if (isBossLevel) {
    const w = state.depth === FINAL_DEPTH ? 22 : 18, h = state.depth === FINAL_DEPTH ? 18 : 14;
    const x = W - w - 3, y = H - h - 3;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), isArena: true });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) map[yy][xx] = 0;
  }
  for (let i = 0; i < 420 && rooms.length < 22; i++) {
    const w = 5 + Math.floor(Math.random() * 6);
    const h = 4 + Math.floor(Math.random() * 4);
    const x = 1 + Math.floor(Math.random() * (W - w - 2));
    const y = 1 + Math.floor(Math.random() * (H - h - 2));
    if (rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) map[yy][xx] = 0;
  }
  for (let i = 1; i < rooms.length; i++) {
    const previous = rooms.slice(0, i).sort((a, b) =>
      Math.abs(a.cx - rooms[i].cx) + Math.abs(a.cy - rooms[i].cy) - Math.abs(b.cx - rooms[i].cx) - Math.abs(b.cy - rooms[i].cy))[0];
    carveCorridor(map, rooms[i], previous, isBossLevel ? 3 : 1);
  }
  // Extra connections form loops instead of one chain of rooms.
  for (let i = 2; i < rooms.length; i += 3) {
    const other = rooms[Math.floor(Math.random() * i)];
    carveCorridor(map, rooms[i], other, isBossLevel ? 3 : 1);
  }
  const distances = floorDistances(map, { x: rooms[0].cx, y: rooms[0].cy });
  let farthest = 1;
  for (let i = 2; i < rooms.length; i++) {
    if (distances.get(`${rooms[i].cx},${rooms[i].cy}`) > distances.get(`${rooms[farthest].cx},${rooms[farthest].cy}`)) farthest = i;
  }
  rooms.push(rooms.splice(isBossLevel ? rooms.findIndex(r => r.isArena) : farthest, 1)[0]);
  state.map = map; state.rooms = rooms;

  const p = state.player;
  p.x = rooms[0].cx; p.y = rooms[0].cy;
  const stairsRoom = rooms[rooms.length - 1];
  state.stairs = { x: stairsRoom.cx, y: stairsRoom.isArena ? stairsRoom.y + stairsRoom.h - 3 : stairsRoom.cy };
  state.upstairs = { x: rooms[0].cx, y: rooms[0].cy };

  state.monsters = [];
  state.bossDefeated = false;
  const count = 5 + state.depth * 2;
  for (let i = 0; i < count; i++) {
    const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
    const tx = room.x + Math.floor(Math.random() * room.w);
    const ty = room.y + Math.floor(Math.random() * room.h);
    if (tx === p.x && ty === p.y) continue;
    if (room.isArena && Math.max(Math.abs(tx - room.cx), Math.abs(ty - room.cy)) <= 3) continue;
    const t = MONSTER_TYPES[Math.min(MONSTER_TYPES.length - 1, Math.floor(Math.random() * (2 + state.depth)))];
    const scale = 1 + (state.depth - 1) * 0.35;
    state.monsters.push({
      ...t,
      x: tx, y: ty,
      maxHp: Math.round(t.hp * (1 + (state.depth - 1) * 0.2)), hp: Math.round(t.hp * (1 + (state.depth - 1) * 0.2)),
      atk: Math.round(t.atk * (1 + (state.depth - 1) * 0.15)), def: t.def + Math.floor((state.depth - 1) / 2),
      xp: Math.round(t.xp * scale),
      gold: Math.max(2, Math.round(5 * scale)),
      id: i,
    });
  }

  state.potions = [];
  const potions = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < potions; i++) {
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const px = room.x + Math.floor(Math.random() * room.w);
    const py = room.y + Math.floor(Math.random() * room.h);
    if (px === p.x && py === p.y) continue;
    state.potions.push({ x: px, y: py, heal: 0.25 + Math.random() * 0.35 });
  }

  state.treasures = [];
  const treasureCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < treasureCount; i++) {
    const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
    const px = room.x + Math.floor(Math.random() * room.w);
    const py = room.y + Math.floor(Math.random() * room.h);
    if (px === p.x && py === p.y) continue;
    const it = ITEM_TABLE[Math.floor(Math.random() * ITEM_TABLE.length)];
    state.treasures.push({ x: px, y: py, ...it, id: i });
  }

  const isDragonLevel = state.depth % 10 === 0;
  state.merchant = null;
  state.boss = null;
  state.prisoner = null;
  state.princess = null;
  if (isBossLevel && !isDragonLevel) {
    const room = rooms[rooms.length - 1];
    const scale = 1 + (state.depth - 1) * 0.35;
    state.boss = {
      name: 'Mimic', sprite: 'mimic',
      x: room.cx, y: room.cy,
      maxHp: Math.round(80 * (1 + (state.depth - 1) * 0.2)), hp: Math.round(80 * (1 + (state.depth - 1) * 0.2)),
      atk: Math.round(18 * (1 + (state.depth - 1) * 0.15)), def: 4 + Math.floor(state.depth / 5),
      xp: Math.round(120 * scale), gold: Math.round(80 * scale),
      id: 999, isBoss: true,
    };
    state.monsters.push(state.boss);
    state.merchant = null;
  } else if (isDragonLevel) {
    const room = rooms[rooms.length - 1];
    const scale = 1 + (state.depth - 1) * 0.35;
    state.boss = {
      name: 'Dragon', sprite: 'dragon',
      x: room.cx, y: room.cy,
      maxHp: Math.round(160 * (1 + (state.depth - 1) * 0.15)), hp: Math.round(160 * (1 + (state.depth - 1) * 0.15)),
      atk: Math.round(26 * (1 + (state.depth - 1) * 0.08)), def: 6 + Math.floor(state.depth / 5),
      xp: Math.round(250 * scale), gold: Math.round(200 * scale),
      id: 999, isBoss: true, isDragon: true,
    };
    state.monsters.push(state.boss);
    state.princess = { x: room.x + (room.w >> 1), y: room.y + (room.h - 1), rescued: false, isPrincess: true };
    if (state.princess.y === state.boss.y) state.princess.y = room.y;
    if (state.princess.x === state.boss.x && state.princess.y === state.boss.y) state.princess.x = room.x;
    state.merchant = null;
  } else {
    // merchant on levels 2..4 (not boss/dragon)
    if (state.depth >= 2 && state.depth <= 4) {
      const merchantRoom = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
      state.merchant = { x: merchantRoom.cx, y: merchantRoom.cy, isMerchant: true, stock: merchantStock() };
    }
    // prisoner on even non-boss levels
    if (state.depth % 2 === 0) {
      const pRoom = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
      state.prisoner = { x: pRoom.cx, y: pRoom.cy, rescued: false, isPrisoner: true };
      if (state.merchant && state.merchant.x === state.prisoner.x && state.merchant.y === state.prisoner.y) {
        state.prisoner.y = pRoom.y + (pRoom.h - 1);
        if (state.prisoner.y === state.merchant.y) state.prisoner.y = pRoom.y;
      }
      if (state.stairs && state.stairs.x === state.prisoner.x && state.stairs.y === state.prisoner.y) {
        state.prisoner.x = pRoom.x + 1; state.prisoner.y = pRoom.y;
      }
    }
  }

  placeFloorObjects();
  state.obstacles = [];
  state.hazards = [];
  state.hazardTime = 0;
  generateObstacles();
  generateHazards();
  const carriers = state.monsters.filter(m => !m.isBoss);
  state.floorKey = state.depth < FINAL_DEPTH
    ? { carrierId: carriers[Math.floor(Math.random() * carriers.length)].id, dropped: false, collected: false, drop: null }
    : null;
  state.visited = new Set();
  state.bubble = null;
  state.monsterSpawns = state.monsters.map(m => ({ ...m, hp: m.maxHp }));
  recreateMonsters();
  saveFloor();
}

function carveCorridor(map, from, to, width = 1) {
  let x = from.cx, y = from.cy;
  const horizontalFirst = Math.random() < 0.5;
  const radius = Math.floor(width / 2);
  for (;;) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (x + dx > 0 && x + dx < W - 1 && y + dy > 0 && y + dy < H - 1) map[y + dy][x + dx] = 0;
    }
    if (x === to.cx && y === to.cy) break;
    if ((horizontalFirst && x !== to.cx) || y === to.cy) x += Math.sign(to.cx - x);
    else y += Math.sign(to.cy - y);
  }
}

function bossArenaContains(x, y) {
  return state.rooms.some(r => r.isArena && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

function bossSpawnBuffer(x, y) {
  return state.rooms.some(r => r.isArena && Math.max(Math.abs(x - r.cx), Math.abs(y - r.cy)) <= 3);
}

function floorDistances(map, start) {
  const distances = new Map([[`${start.x},${start.y}`, 0]]);
  const queue = [{ x: start.x, y: start.y }];
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i];
    const distance = distances.get(`${tile.x},${tile.y}`) + 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = tile.x + dx, y = tile.y + dy, key = `${x},${y}`;
      if (!map[y] || map[y][x] !== 0 || distances.has(key)) continue;
      distances.set(key, distance); queue.push({ x, y });
    }
  }
  return distances;
}

function protectedFloorTiles() {
  return [state.stairs, state.upstairs, state.merchant, state.prisoner, state.princess,
    ...state.potions, ...state.treasures, ...state.monsters].filter(Boolean);
}

function generateObstacles() {
  const reserved = new Set(protectedFloorTiles().map(o => `${o.x},${o.y}`));
  let floorCount = state.map.reduce((sum, row) => sum + row.filter(t => t === 0).length, 0);
  for (let attempt = 0; attempt < 180 && state.obstacles.length < 10 + Math.floor(state.depth / 2); attempt++) {
    const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    if (room.isArena) continue;
    const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
    if (state.map[y][x] !== 0 || reserved.has(`${x},${y}`)) continue;
    if ([state.upstairs, state.stairs].some(o => Math.max(Math.abs(x - o.x), Math.abs(y - o.y)) <= 3)) continue;
    state.map[y][x] = 2;
    if (floorDistances(state.map, state.upstairs).size !== floorCount - 1) { state.map[y][x] = 0; continue; }
    floorCount--;
    state.obstacles.push({ x, y, type: state.obstacles.length % 2 ? 'rubble' : 'pillar' });
  }
}

function generateHazards() {
  const reserved = new Set(protectedFloorTiles().map(o => `${o.x},${o.y}`));
  const candidates = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (bossArenaContains(x, y)) continue;
    if (state.map[y][x] !== 0 || reserved.has(`${x},${y}`)) continue;
    if ([state.upstairs, state.stairs].some(o => Math.max(Math.abs(x - o.x), Math.abs(y - o.y)) <= 3)) continue;
    candidates.push({ x, y });
  }
  const count = 15 + Math.floor(state.depth / 2);
  for (let i = 0; i < count && candidates.length; i++) {
    const tile = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    const type = ['flame', 'rocks', 'spikes'][i % 3];
    state.hazards.push({ ...tile, type, revealed: type !== 'spikes', triggered: false,
      stage: 'idle', offset: Math.random() * 6, nextDamageAt: 0, impactAt: null });
  }
}

function updateCamera() {
  state.camera.x = Math.max(0, Math.min(W - VIEW_W, state.player.x - Math.floor(VIEW_W / 2)));
  state.camera.y = Math.max(0, Math.min(H - VIEW_H, state.player.y - Math.floor(VIEW_H / 2)));
}

function inCamera(x, y) {
  return x >= state.camera.x && y >= state.camera.y && x < state.camera.x + VIEW_W && y < state.camera.y + VIEW_H;
}

function freshMotionState() {
  return { time: 0, moves: {}, facing: {}, camera: null, frameId: null, lastTimestamp: null, lastPaint: null };
}

function stopMotionAnimation() {
  const motion = state && state.motion;
  if (!motion) return;
  if (motion.frameId !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(motion.frameId);
  motion.frameId = null; motion.lastTimestamp = null; motion.lastPaint = null;
}

function clearMovementAnimation() {
  stopMotionAnimation();
  state.motion = freshMotionState();
}

function actorMotionKey(actor) {
  return actor === state.player ? 'player' : `monster:${actor.id}`;
}

function motionProgress(move) {
  return Math.max(0, Math.min(1, (state.motion.time - move.at) / move.duration));
}

function actorRenderPosition(actor) {
  const move = state.motion.moves[actorMotionKey(actor)];
  if (!move || move.x !== actor.x || move.y !== actor.y || typeof window.requestAnimationFrame !== 'function') return { x: actor.x, y: actor.y };
  const t = motionProgress(move);
  return { x: move.fromX + (move.x - move.fromX) * t, y: move.fromY + (move.y - move.fromY) * t };
}

function renderCamera() {
  const move = state.motion.moves.player, camera = state.motion.camera;
  if (!move || !camera || move.x !== state.player.x || move.y !== state.player.y || camera.x !== state.camera.x || camera.y !== state.camera.y || typeof window.requestAnimationFrame !== 'function') return state.camera;
  const t = motionProgress(move);
  return { x: camera.fromX + (camera.x - camera.fromX) * t, y: camera.fromY + (camera.y - camera.fromY) * t };
}

function renderViewport() {
  const camera = renderCamera();
  return { camera, x0: Math.max(0, Math.floor(camera.x)), y0: Math.max(0, Math.floor(camera.y)),
    x1: Math.min(W, Math.ceil(camera.x + VIEW_W)), y1: Math.min(H, Math.ceil(camera.y + VIEW_H)) };
}

function inRenderCamera(x, y) {
  const view = renderViewport();
  return x >= view.x0 && y >= view.y0 && x < view.x1 && y < view.y1;
}

function moveActorTo(actor, x, y) {
  updateCamera();
  const key = actorMotionKey(actor);
  const dx = x - actor.x;
  if (dx) state.motion.facing[key] = Math.sign(dx);
  if (actor !== state.player && (!inRenderCamera(actor.x, actor.y) || fogLevel(actor.x, actor.y) >= 3)) {
    actor.x = x; actor.y = y; delete state.motion.moves[key]; return;
  }
  const from = actorRenderPosition(actor), camera = { ...renderCamera() };
  actor.x = x; actor.y = y;
  const distance = Math.max(1, Math.hypot(x - from.x, y - from.y));
  state.motion.moves[key] = { fromX: from.x, fromY: from.y, x, y, at: state.motion.time, duration: Math.max(0.04, 0.18 / (distance * distance)) };
  if (actor === state.player) {
    updateCamera();
    state.motion.camera = { fromX: camera.x, fromY: camera.y, x: state.camera.x, y: state.camera.y };
  }
}

function motionPlayable() {
  return state.started && !state.gameOver && !state.helpOpen && !state.pause && !document.hidden && !bossDefeatActive();
}

function actorIsMoving(actor) {
  const move = state.motion.moves[actorMotionKey(actor)];
  return !!(move && move.x === actor.x && move.y === actor.y && motionProgress(move) < 1 && typeof window.requestAnimationFrame === 'function');
}

function motionNeeded() {
  if (actorIsMoving(state.player) || state.monsters.some(m => m.hp > 0 &&
    inRenderCamera(m.x, m.y) && fogLevel(m.x, m.y) < 3 && (actorIsMoving(m) || m.sprite === 'bat' || m.isDragon))) return true;
  const view = renderViewport();
  for (let y = view.y0; y < view.y1; y++) for (let x = view.x0; x < view.x1; x++) {
    if (state.visited.has(`${x},${y}`) && wallTorchAt(x, y)) return true;
  }
  return state.hazards.some(h => h.type === 'flame' && h.revealed && flameActive(h) && inRenderCamera(h.x, h.y) && state.visited.has(`${h.x},${h.y}`));
}

function requestMotionFrame() {
  if (!motionPlayable() || !motionNeeded()) { stopMotionAnimation(); return; }
  const motion = state.motion;
  if (motion.frameId !== null || typeof window.requestAnimationFrame !== 'function') return;
  motion.frameId = window.requestAnimationFrame(timestamp => motionFrame(timestamp, motion));
}

function advanceMotion(elapsed) {
  if (!motionPlayable()) return;
  state.motion.time += Math.max(0, elapsed);
  for (const [key, move] of Object.entries(state.motion.moves)) {
    if (motionProgress(move) >= 1) delete state.motion.moves[key];
  }
  if (!state.motion.moves.player) state.motion.camera = null;
}

function motionFrame(timestamp, motion) {
  if (state.motion !== motion) return;
  motion.frameId = null;
  if (!motionPlayable()) { stopMotionAnimation(); return; }
  const elapsed = motion.lastTimestamp === null ? 0 : Math.min(0.05, Math.max(0, (timestamp - motion.lastTimestamp) / 1000));
  motion.lastTimestamp = timestamp;
  advanceMotion(elapsed);
  if (motion.lastPaint === null || motion.time - motion.lastPaint >= 1 / 30 || !motionNeeded()) {
    motion.lastPaint = motion.time;
    draw(); renderMinimap();
  }
  requestMotionFrame();
}

function flameActive(hazard) {
  return (state.hazardTime + hazard.offset) % 6 < 3;
}

function applyPlayerHazards() {
  if (!state.started || state.gameOver || state.helpOpen || state.pause || document.hidden) return;
  const p = state.player;
  const hazard = state.hazards.find(h => h.x === p.x && h.y === p.y);
  if (!hazard) return;
  if (hazard.type === 'spikes' && !hazard.triggered) {
    hazard.triggered = true; hazard.revealed = true;
    hurtPlayer(6 + state.depth, 'Hidden spikes pierce your boots!');
  } else if (hazard.type === 'rocks' && !hazard.triggered) {
    hazard.triggered = true; hazard.stage = 'warning';
    hazard.impactAt = state.hazardTime + 1.2;
    log('Dust and falling stones! Move off the cracked tile!');
    playSound('hit');
  } else if (hazard.type === 'flame' && flameActive(hazard) && state.hazardTime >= hazard.nextDamageAt) {
    hazard.nextDamageAt = state.hazardTime + 1;
    hurtPlayer(4 + state.depth, 'The flames burn you!');
  }
}

function hazardTick() {
  if (!state.started || state.gameOver || state.helpOpen || state.pause || document.hidden) return;
  for (const hazard of state.hazards) {
    if (hazard.type !== 'rocks' || hazard.stage !== 'warning' || state.hazardTime < hazard.impactAt) continue;
    hazard.stage = 'spent';
    if (state.player.x === hazard.x && state.player.y === hazard.y) {
      hurtPlayer(8 + 2 * state.depth, 'Falling rocks strike you!');
      if (state.gameOver || state.helpOpen || state.pause) return;
    }
  }
  applyPlayerHazards();
}

function log(msg) {
  state.messages.push(String(msg));
  if (state.messages.length > 80) state.messages.shift();
  const panel = document.getElementById('log');
  panel.textContent = state.messages.join('\n\n');
  panel.scrollTop = panel.scrollHeight;
}

function monsterAt(x, y) {
  return state.monsters.find(m => m.hp > 0 && m.x === x && m.y === y);
}
function potionAt(x, y) {
  return state.potions.find(p => p.x === x && p.y === y);
}


function treasureAt(x, y) {
  return state.treasures.find(t => t.x === x && t.y === y);
}
function equipmentBonus(stat) {
  return Object.values(state.equipment).reduce((sum, item) => sum + (item ? item[stat] || 0 : 0), 0);
}
function equipItem(slot, item) {
  const oldHealthBonus = equipmentBonus('maxHp');
  state.equipment[slot] = item;
  const healthChange = equipmentBonus('maxHp') - oldHealthBonus;
  state.player.maxHp += healthChange;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.max(0, healthChange));
}

function effectiveStr() {
  return state.player.str + equipmentBonus('str');
}
function effectiveDex() {
  return state.player.dex + equipmentBonus('dex');
}
function effectiveAtk() {
  return effectiveStr() + equipmentBonus('atk');
}
function effectiveDef() {
  return state.player.def + equipmentBonus('def') + Math.floor(effectiveDex() / 5);
}
function dodgeChance() {
  return Math.min(0.45, Math.max(0, (effectiveDex() - 10) * 0.02));
}
function die() {
  state.player.hp = 0;
  playSound('death');
  gameOver(false);
  render();
}

function fogLevel(x, y) {
  const p = state.player;
  const d = Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
  if (d <= 1) return 0;
  if (d === 2) return 1;
  if (d === 3) return 2;
  return 3;
}

function damageMonster(m, dmg) {
  if (state.gameOver || m.hp <= 0) return;
  m.hp -= dmg;
  if (m.hp <= 0) {
    state.kills++;
    if (state.monsterSpeech && state.monsterSpeech.monsterId === m.id) state.monsterSpeech = null;
    const keyDropped = state.floorKey && !state.floorKey.dropped && !state.floorKey.collected && m.id === state.floorKey.carrierId;
    if (keyDropped) {
      state.floorKey.dropped = true;
      state.floorKey.drop = { x: m.x, y: m.y };
    }
    const p = state.player;
    p.xp += m.xp;
    let msg = `${m.name} ${m.isDragon ? 'defeated' : 'slain'}! +${m.xp} XP`;
    if (m.gold) { state.gold += m.gold; msg += ` +${m.gold} gold`; }
    log(msg);
    if (m.isBoss) {
      state.bossDefeated = true;
      saveFloor();
      startBossDefeat(m);
    }
    delete state.motion.moves[actorMotionKey(m)];
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.lvl++;
      p.xpNext = Math.round(p.xpNext * 1.5);
      p.maxHp += 10; p.str += 3; p.dex += 1; p.def += 1; p.hp = Math.min(p.maxHp, p.hp + 20);
      log(`Level up! You are now level ${p.lvl}!`);
    }
    if (m.isBoss) log(`${msg}. ${m.isDragon ? 'Rescue the princess to win!' : state.floorKey.collected ? 'The stairs are unlocked!' : 'Find this floor’s key to open the stairs.'}`);
    if (keyDropped) log('A golden floor key drops! Stand on it and press Space.');
  }
}

function attackMonster(m) {
  if (state.gameOver || state.helpOpen || state.pause) return;
  markCombat();
  playSound('slash');
  const dmg = Math.max(1, effectiveAtk() - m.def);
  damageMonster(m, dmg);
  if (m.hp > 0) { monsterTalk(m); enemyAttack(m); }
}

function enemyAttack(m) {
  if (state.gameOver || state.helpOpen || state.pause || m.hp <= 0 || state.activeTime < (m.nextAttackAt || 0)) return;
  m.nextAttackAt = state.activeTime + ENEMY_ATTACK_INTERVAL;
  monsterTalk(m);
  markCombat();
  if (Math.random() < dodgeChance()) {
    log(`You dodge the ${m.name}'s strike!`);
    return;
  }
  const damage = Math.max(1, m.atk - effectiveDef());
  hurtPlayer(damage, `${m.name} hits you for ${damage}!`);
}

function clearMonsterSpeech() {
  state.monsterSpeech = null;
  state.monsterSpeechReadyAt = state.activeTime;
}

function monsterTalk(monster) {
  if (!state.started || state.gameOver || state.ending || state.helpOpen || state.pause || document.hidden || monster.hp <= 0) return;
  if (!Number.isInteger(monster.id) || !state.monsters.includes(monster) || !inCamera(monster.x, monster.y) || fogLevel(monster.x, monster.y) >= 3) return;
  if (state.activeTime < state.monsterSpeechReadyAt) return;
  state.monsterSpeech = { monsterId: monster.id, text: MONSTER_QUOTES[state.monsterQuoteIndex], expiresAt: state.activeTime + MONSTER_SPEECH_DURATION };
  log(`${monster.name}: “${state.monsterSpeech.text}”`);
  state.monsterQuoteIndex = (state.monsterQuoteIndex + 1) % MONSTER_QUOTES.length;
  state.monsterSpeechReadyAt = state.activeTime + MONSTER_SPEECH_INTERVAL;
}

function updateMonsterSpeech() {
  const speech = state.monsterSpeech;
  if (speech && (state.activeTime >= speech.expiresAt || !state.monsters.some(m => m.id === speech.monsterId && m.hp > 0))) state.monsterSpeech = null;
}

function monsterSpeechLayout() {
  const speech = state.monsterSpeech;
  if (!speech || state.gameOver || state.ending || state.activeTime >= speech.expiresAt) return null;
  const monster = state.monsters.find(m => m.id === speech.monsterId && m.hp > 0);
  if (!monster || !inRenderCamera(monster.x, monster.y) || fogLevel(monster.x, monster.y) >= 3) return null;
  ctx.save(); ctx.font = '12px monospace';
  const width = ctx.measureText(speech.text).width + 20;
  ctx.restore();
  const position = actorRenderPosition(monster);
  const height = 28, anchorX = position.x * TILE + TILE / 2;
  const visual = monsterVisual(monster);
  const camera = renderCamera();
  const viewportLeft = camera.x * TILE, viewportTop = camera.y * TILE;
  const x = Math.max(viewportLeft + 6, Math.min(viewportLeft + VIEW_W * TILE - width - 6, anchorX - width / 2));
  const below = visual.top - 44 < viewportTop + 4;
  const y = Math.max(viewportTop + 4, Math.min(viewportTop + VIEW_H * TILE - height - 4, below ? visual.bottom + 12 : visual.top - 44));
  return { x, y, width, height, text: speech.text, below, anchorX,
    tipY: Math.max(viewportTop + 3, Math.min(viewportTop + VIEW_H * TILE - 3, below ? visual.bottom + 3 : visual.top - 3)) };
}

function monsterVisual(monster) {
  const sprite = monster.isDragon ? 'dragonBoss' : monster.sprite;
  const scale = monster.isBoss ? 3 : 2;
  const size = spriteDimensions(sprite);
  const width = size.width * scale, height = size.height * scale;
  const position = actorRenderPosition(monster);
  const x = position.x * TILE + TILE / 2;
  const y = monster.isBoss ? (position.y + 1) * TILE - height / 2 : position.y * TILE + TILE / 2;
  return { sprite, scale, x, y, width, height, left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
}

function drawMonsterSpeech() {
  const bubble = monsterSpeechLayout();
  if (!bubble) return;
  ctx.save();
  ctx.fillStyle = '#f3e9cd'; ctx.strokeStyle = '#bd9856'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(bubble.x, bubble.y, bubble.width, bubble.height, 6); ctx.fill(); ctx.stroke();
  const baseX = Math.max(bubble.x + 10, Math.min(bubble.x + bubble.width - 10, bubble.anchorX));
  const baseY = bubble.below ? bubble.y : bubble.y + bubble.height;
  ctx.beginPath(); ctx.moveTo(baseX - 5, baseY); ctx.lineTo(bubble.anchorX, bubble.tipY); ctx.lineTo(baseX + 5, baseY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#27211b'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, bubble.x + bubble.width / 2, bubble.y + bubble.height / 2);
  ctx.restore();
}

function gameOver(won) {
  if (won) { startEnding(); return; }
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  state.gameOver = true; state.won = won; state.pause = null;
  const ov = document.getElementById('overlay');
  document.getElementById('ovTitle').textContent = 'GAME OVER';
  document.getElementById('ovTitle').style.color = '#ff3d3d';
  document.getElementById('ovText').textContent = `Slain at depth ${state.depth}. ${state.kills} kills.`;
  ov.style.display = 'flex';
}

function bossDefeatActive() {
  return !!(state && state.bossDefeat && !state.bossDefeat.completed);
}

function defeatClamp(value) {
  return Math.max(0, Math.min(1, value));
}

function stopBossDefeatAnimation() {
  const anim = state && state.bossDefeat;
  if (!anim) return;
  if (anim.frameId !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(anim.frameId);
  anim.frameId = null;
}

function clearBossDefeat() {
  stopBossDefeatAnimation();
  if (state) state.bossDefeat = null;
}

function bossDefeatPhase(anim) {
  const t = anim.elapsed;
  if (anim.kind === 'dragon') {
    if (t < 0.9) return 'roar';
    if (t < 1.8) return 'fall';
    return 'legacy';
  }
  if (t < 0.4) return 'snap';
  if (t < 0.9) return 'coins';
  return 'collapse';
}

function playBossDefeatSound(kind) {
  if (kind === 'dragon') {
    tone(65, 0.9, 'sawtooth', 0.35, 0, 'effects');
    [196, 233.08, 261.63, 392].forEach((note, i) => tone(note, 0.55, 'triangle', 0.26, i * 0.18, 'music'));
    tone(130.81, 0.8, 'square', 0.18, 0.3, 'effects');
  } else {
    tone(110, 0.18, 'square', 0.32, 0, 'effects');
    tone(82.41, 0.34, 'square', 0.28, 0.12, 'effects');
    tone(330, 0.14, 'triangle', 0.24, 0.28, 'effects');
  }
}

function startBossDefeat(m) {
  if (!m || !m.isBoss || state.gameOver || state.ending || state.bossDefeat) return;
  const isDragon = !!m.isDragon;
  const visual = monsterVisual(m);
  clearMovementAnimation();
  const kind = isDragon ? 'dragon' : 'mimic';
  state.bossDefeat = {
    kind, elapsed: 0, phase: isDragon ? 'roar' : 'snap', completed: false,
    duration: isDragon ? DRAGON_DEFEAT_DURATION : MIMIC_DEFEAT_DURATION,
    frameId: null, lastTimestamp: null, events: new Set(),
    visual: { sprite: visual.sprite, scale: visual.scale, x: visual.x, y: visual.y,
      width: visual.width, height: visual.height, left: visual.left, right: visual.right,
      top: visual.top, bottom: visual.bottom, tileX: m.x, tileY: m.y },
  };
  clearMonsterSpeech();
  playBossDefeatSound(kind);
  draw();
  requestBossDefeatFrame(state.bossDefeat);
}

function requestBossDefeatFrame(anim) {
  if (state.bossDefeat !== anim || anim.completed || typeof window.requestAnimationFrame !== 'function') return;
  anim.frameId = window.requestAnimationFrame(timestamp => bossDefeatFrame(timestamp, anim));
}

function bossDefeatFrame(timestamp, anim) {
  if (state.bossDefeat !== anim || anim.completed) return;
  anim.frameId = null;
  if (document.hidden || state.helpOpen) {
    anim.lastTimestamp = null;
    requestBossDefeatFrame(anim);
    return;
  }
  const elapsed = anim.lastTimestamp === null ? 0 : Math.min(0.1, Math.max(0, (timestamp - anim.lastTimestamp) / 1000));
  anim.lastTimestamp = timestamp;
  advanceBossDefeat(elapsed);
  draw();
  requestBossDefeatFrame(anim);
}

function advanceBossDefeat(elapsed) {
  const anim = state && state.bossDefeat;
  if (!anim || anim.completed || document.hidden || state.helpOpen) return;
  anim.elapsed = Math.min(anim.duration, anim.elapsed + Math.max(0, elapsed));
  anim.phase = bossDefeatPhase(anim);
  const milestones = anim.kind === 'dragon' ? [[0.9, 'roar'], [1.8, 'fall']] : [[0.4, 'snap'], [0.9, 'coins']];
  for (const [at, event] of milestones) {
    if (anim.elapsed < at || anim.events.has(event)) continue;
    anim.events.add(event);
    if (anim.kind === 'dragon' && event === 'roar') tone(72, 0.7, 'sawtooth', 0.34, 0, 'effects');
    else if (anim.kind === 'dragon') tone(98, 0.5, 'square', 0.22, 0, 'effects');
    else if (event === 'snap') tone(160, 0.08, 'square', 0.34, 0, 'effects');
    else tone(880, 0.1, 'triangle', 0.22, 0, 'effects');
  }
  if (anim.elapsed >= anim.duration) {
    anim.completed = true;
    clearBossDefeat();
  }
}

function skipBossDefeat() {
  if (!bossDefeatActive() || document.hidden || state.helpOpen) return;
  clearBossDefeat();
  draw();
  canvas.focus?.();
}

function bossDefeatScene() {
  const anim = state && state.bossDefeat;
  if (!anim) return null;
  const t = anim.elapsed, progress = defeatClamp(t / anim.duration);
  if (anim.kind === 'mimic') {
    const snap = 1 - defeatClamp(t / 0.4);
    const fall = defeatClamp((t - 0.6) / 1);
    const reveal = defeatClamp((t - 0.2) / 0.3);
    const fade = defeatClamp((t - 1.2) / 0.4);
    const coins = Array.from({ length: 12 }, (_, i) => {
      const angle = i / 12 * Math.PI * 2;
      const travel = Math.max(0, t - 0.25 - (i % 3) * 0.06);
      const radius = 18 + travel * 52;
      return { x: Math.cos(angle) * radius,
        y: -6 + Math.sin(angle) * radius * 0.55 - travel * 18 + travel * travel * 34,
        alpha: 1 - defeatClamp(travel / 1.1), size: 3 + i % 3 };
    });
    return { kind: 'mimic', phase: anim.phase, t, progress, shake: Math.sin(t * 90) * 4 * snap,
      squash: fall * 0.55, rise: fall * 16, alpha: 1 - fade, coins,
      bannerAlpha: reveal * (1 - defeatClamp((t - 1.3) / 0.3)), bannerRise: reveal * 10 };
  }
  const fall = defeatClamp((t - 0.8) / 1);
  const flare = 1 - defeatClamp(t / 0.9);
  const fade = defeatClamp((t - 2) / 0.6);
  const banner = defeatClamp((t - 0.5) / 0.4);
  return { kind: 'dragon', phase: anim.phase, t, progress,
    shake: Math.sin(t * 60) * 6 * flare + Math.sin(t * 30) * 4 * fall * (1 - fall),
    dragonY: 430 + fall * 120, alpha: 1 - fade,
    wing: 18 + 50 * fall + Math.sin(t * 14) * 10 * (1 - fall),
    boltAlpha: 1 - defeatClamp(t / 1.3),
    emberAlpha: defeatClamp(t / 0.4) * (1 - defeatClamp((t - 1.6) / 1)),
    bannerAlpha: banner * (1 - defeatClamp((t - 2.35) / 0.25)),
    dim: (0.25 + 0.47 * defeatClamp(t / 0.5)) * (1 - defeatClamp((t - 2.1) / 0.5)) };
}

function movePlayer(dx, dy) {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  const nx = p.x + dx, ny = p.y + dy;
  if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
  if (state.map[ny][nx] !== 0) return;
  const m = monsterAt(nx, ny);
  if (m) { state.turn++; attackMonster(m); render(); return; }
  state.bubble = null;
  moveActorTo(p, nx, ny);
  state.turn++;
  revealAroundPlayer();
  applyPlayerHazards();
  render();
}

function revealAroundPlayer() {
  const p = state.player;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const x = p.x + dx, y = p.y + dy;
    if (x >= 0 && y >= 0 && x < W && y < H) state.visited.add(`${x},${y}`);
  }
}

function placeFloorObjects() {
  const used = new Set([state.stairs, state.upstairs].map(o => `${o.x},${o.y}`));
  for (const room of state.rooms.filter(r => r.isArena)) {
    for (let y = room.cy - 3; y <= room.cy + 3; y++) for (let x = room.cx - 3; x <= room.cx + 3; x++) used.add(`${x},${y}`);
  }
  for (const item of [state.merchant, state.prisoner, state.princess, ...state.potions, ...state.treasures].filter(Boolean)) {
    if (used.has(`${item.x},${item.y}`)) {
      let tile = null;
      for (let y = 1; y < H - 1 && !tile; y++) for (let x = 1; x < W - 1; x++) {
        if (state.map[y][x] === 0 && !used.has(`${x},${y}`)) { tile = { x, y }; break; }
      }
      if (tile) { item.x = tile.x; item.y = tile.y; }
    }
    used.add(`${item.x},${item.y}`);
  }
}

function saveFloor() {
  const floor = state.floors[state.depth] || { descentRewarded: false };
  for (const field of FLOOR_FIELDS) floor[field] = state[field];
  state.floors[state.depth] = floor;
}

function recreateMonsters() {
  clearMovementAnimation();
  clearMonsterSpeech();
  state.monsters = [];
  const p = state.player;
  const available = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (state.map[y][x] !== 0 || Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) <= 2) continue;
    if ([state.stairs, state.upstairs, state.merchant, state.prisoner, state.princess, state.floorKey && state.floorKey.drop, ...state.hazards]
      .some(o => o && o.x === x && o.y === y)) continue;
    available.push({ x, y });
  }
  for (const spawn of state.monsterSpawns) {
    if (spawn.isBoss && state.bossDefeated) continue;
    const preferred = available.findIndex(t => (spawn.isBoss || !bossSpawnBuffer(t.x, t.y)) && t.x === spawn.x && t.y === spawn.y);
    const index = preferred >= 0 ? preferred : available.findIndex(t => spawn.isBoss ? bossSpawnBuffer(t.x, t.y) : !bossSpawnBuffer(t.x, t.y));
    if (index < 0) continue;
    const tile = available.splice(index, 1)[0];
    state.monsters.push({ ...spawn, ...tile, hp: spawn.maxHp, nextAttackAt: state.activeTime });
  }
  state.boss = state.monsters.find(m => m.isBoss) || null;
}

function enterFloor(depth, fromBelow) {
  if (depth < 1 || depth > FINAL_DEPTH) return;
  clearBossDefeat();
  saveFloor();
  state.depth = depth;
  const floor = state.floors[depth];
  if (floor) {
    for (const field of FLOOR_FIELDS) state[field] = floor[field];
  } else {
    genLevel();
  }
  const arrival = fromBelow ? state.stairs : state.upstairs;
  state.player.x = arrival.x; state.player.y = arrival.y;
  recreateMonsters();
  state.bubble = null;
  state.healElapsed = 0;
  revealAroundPlayer();
  playSound('stairs');
}

function descendStairs() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  if (p.x !== state.stairs.x || p.y !== state.stairs.y) return;
  if (state.depth === FINAL_DEPTH) { log('The dungeon ends here. Defeat the dragon, then rescue the princess.'); render(); return; }
  if (state.depth === 5 && !state.bossDefeated) { log('The Mimic guards the stairs. Defeat it first!'); render(); return; }
  if (!state.floorKey.collected) { log('The stairs are locked. A monster carries this floor’s key.'); render(); return; }
  saveFloor();
  const floor = state.floors[state.depth];
  let bonus = 0;
  if (!floor.descentRewarded) {
    bonus = GOLD_PER_LEVEL;
    if (!state.monsters.some(m => m.hp > 0)) bonus += 20 + (state.depth + 1) * 5;
    floor.descentRewarded = true;
    state.gold += bonus;
  }
  enterFloor(state.depth + 1, false);
  log(`You descend to depth ${state.depth}.${bonus ? ` +${bonus} gold` : ''}`);
  render();
}

function ascendStairs() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  if (state.depth <= 1) { log('There is no floor above this entrance.'); return; }
  if (p.x !== state.upstairs.x || p.y !== state.upstairs.y) {
    log('Stand on the up stairs (▲) to ascend.'); return;
  }
  enterFloor(state.depth - 1, true);
  log(`You ascend to depth ${state.depth}.`);
  render();
}


function merchantStock() {
  const stock = [];
  const count = 3;
  for (let i = 0; i < count; i++) {
    const it = ITEM_TABLE[Math.floor(Math.random() * ITEM_TABLE.length)];
    stock.push({ ...it, id: 100 + i });
  }
  return stock;
}
function merchantAt(x, y) {
  return state.merchant && state.merchant.x === x && state.merchant.y === y ? state.merchant : null;
}
function buyFromMerchant() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  const m = merchantAt(p.x, p.y);
  if (!m || !m.stock || m.stock.length === 0) { log('Nothing for sale here.'); render(); return; }
  const it = m.stock[0];
  const cost = Math.round(it.gold * 1.5);
  if (state.gold < cost) { log(`Not enough gold (${cost} needed).`); render(); return; }
  state.gold -= cost;
  m.stock.shift();
  state.bubble = { text: 'Pleasure doing business!', ttl: 90 };
  if (it.kind === 'heal') {
    storePotion(it);
    log(`Bought ${it.name}! Press H to drink.`);
  } else if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'ring') {
    const slot = it.kind === 'weapon' ? 'weapon' : it.kind === 'armor' ? 'armor' : 'ring';
    const prev = state.equipment[slot];
    equipItem(slot, it);
    log(`Bought ${it.name}!${prev ? ` (replaced ${prev.name})` : ''}`);
  } else if (it.kind === 'elixir') {
    state.gold += it.gold;
    log(`Bought ${it.name}! +${it.gold} gold`);
  } else {
    log(`Bought ${it.name}!`);
  }
  render();
}
function sellToMerchant() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  const m = merchantAt(p.x, p.y);
  if (!m) { log('No merchant here.'); render(); return; }
  const slots = ['weapon', 'armor', 'ring'];
  let sold = false;
  for (const slot of slots) {
    const it = state.equipment[slot];
    if (!it) continue;
    const price = Math.round(it.gold * 0.5);
    state.gold += price;
    equipItem(slot, null);
    log(`Sold ${it.name} for ${price} gold.`);
    state.bubble = { text: 'Fair trade!', ttl: 90 };
    sold = true;
  }
  if (!sold) log('You have no gear to sell.');
  render();
}


function prisonerAt(x, y) {
  return state.prisoner && state.prisoner.x === x && state.prisoner.y === y ? state.prisoner : null;
}
function rescuePrisoner() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  const pr = prisonerAt(p.x, p.y);
  if (!pr) { log('Nothing to rescue here.'); render(); return; }
  if (pr.rescued) { log('The prisoner is already free.'); render(); return; }
  pr.rescued = true;
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3));
  const prisonerGold = 20 + state.depth * 5;
  state.gold += prisonerGold;
  log(`You rescue the prisoner! +30% HP, +${prisonerGold} gold.`);
  state.bubble = { text: 'Thank you!', ttl: 90 };
  render();
}


function princessAt(x, y) {
  return state.princess && state.princess.x === x && state.princess.y === y ? state.princess : null;
}
function rescuePrincess() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  const pr = princessAt(p.x, p.y);
  if (!pr) { log('Nothing to rescue here.'); render(); return; }
  if (pr.rescued) { log('The princess is already free.'); render(); return; }
  if (state.depth !== FINAL_DEPTH || !state.bossDefeated) { log('Defeat the dragon before rescuing the princess!'); render(); return; }
  pr.rescued = true;
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5));
  const princessGold = 40 + state.depth * 10;
  state.gold += princessGold;
  log(`You reach the princess. Your journey earns +${princessGold} gold.`);
  state.bubble = null;
  saveFloor();
  gameOver(true);
  render();
}

function pickup() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  const key = state.floorKey;
  if (key && key.drop && key.drop.x === p.x && key.drop.y === p.y) {
    key.collected = true; key.drop = null;
    saveFloor(); playSound('pickup');
    log(state.depth === 5 && !state.bossDefeated ? 'Key collected! Defeat the Mimic to unlock the stairs.' : 'Key collected! This floor’s stairs are permanently unlocked.');
    render(); return;
  }
  if (state.stairs && p.x === state.stairs.x && p.y === state.stairs.y) { descendStairs(); return; }
  if (state.depth > 1 && p.x === state.upstairs.x && p.y === state.upstairs.y) { ascendStairs(); return; }
  if (merchantAt(p.x, p.y)) { buyFromMerchant(); return; }
  const pr = prisonerAt(p.x, p.y);
  if (pr) { rescuePrisoner(); return; }
  const prin = princessAt(p.x, p.y);
  if (prin) { rescuePrincess(); return; }
  const pot = potionAt(p.x, p.y);
  if (pot) {
    storePotion(pot);
    state.potions = state.potions.filter(x => x !== pot);
    log('Potion stored! Press H to drink.');
    render();
    return;
  }
  const t = treasureAt(p.x, p.y);
  if (!t) { log('Nothing to pick up.'); return; }
  state.treasures = state.treasures.filter(x => x !== t);
  if (t.kind !== 'heal') playSound('pickup');
  if (t.kind === 'heal') {
    storePotion(t);
    log(`${t.name} stored! Press H to drink.`);
  } else if (t.kind === 'weapon' || t.kind === 'armor' || t.kind === 'ring') {
    const slot = t.kind === 'weapon' ? 'weapon' : t.kind === 'armor' ? 'armor' : 'ring';
    const prev = state.equipment[slot];
    equipItem(slot, t);
    log(`${t.name} equipped${prev ? ` (replacing ${prev.name})` : ''}!`);
  } else if (t.kind === 'elixir') {
    state.gold += t.gold;
    log(`${t.name}! +${t.gold} gold`);
  } else {
    state.gold += t.gold;
    log(`${t.name}! +${t.gold} gold`);
  }
  render();
}

function storePotion(item) {
  state.inventory.push({ name: 'Potion', kind: 'heal', heal: item.heal });
  playSound('pickup');
}

function drinkPotion() {
  if (state.gameOver || state.helpOpen || (state.pause && state.pause.kind !== 'health')) return;
  const p = state.player;
  if (!state.inventory.length) { log('No potions stored.'); return; }
  if (p.hp >= p.maxHp) { log('Already at full health.'); return; }
  const potion = state.inventory.shift();
  const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * potion.heal));
  p.hp += heal;
  playSound('heal');
  log(`You drink a potion. +${heal} HP`);
  render();
}

function markCombat() {
  state.combatElapsed = 0;
  state.healElapsed = 0;
}

function hurtPlayer(damage, message) {
  if (state.gameOver || state.helpOpen || state.pause) return;
  markCombat();
  state.player.hp -= damage;
  log(message);
  playSound('hit');
  if (state.player.hp <= 0) die();
  else checkHealth();
}

function checkHealth() {
  if (state.gameOver || state.helpOpen) return;
  const ratio = state.player.hp / state.player.maxHp;
  if (ratio >= 0.2) state.warnedLow = false;
  if (ratio >= 0.1) state.warnedCritical = false;
  if (state.pause) return;
  if (ratio < 0.1 && !state.warnedCritical) {
    state.warnedLow = true; state.warnedCritical = true;
    state.pause = { kind: 'health' };
  } else if (ratio < 0.2 && !state.warnedLow) {
    state.warnedLow = true;
    state.pause = { kind: 'health' };
  }
}

function continueGame() {
  if (state.helpOpen || !state.pause || state.pause.kind !== 'health') return;
  state.pause = null;
  state.lastTick = Date.now();
  render();
}

function retreatRemaining() {
  return Math.max(0, state.retreatReadyAt - state.activeTime);
}

function advanceActiveTime(elapsed) {
  if (!state.started || state.gameOver || state.helpOpen || state.pause || document.hidden) return;
  state.activeTime += Math.max(0, elapsed);
  state.hazardTime += Math.max(0, elapsed);
  updateMonsterSpeech();
}

function retreat() {
  if (state.gameOver || state.helpOpen || (state.pause && state.pause.kind === 'retreat')) return;
  if (retreatRemaining() > 0) { log(`Retreat recovers in ${Math.ceil(retreatRemaining())} active seconds.`); render(); return; }
  state.pause = { kind: 'retreat', previous: state.pause };
  render();
}

function cancelRetreat() {
  if (state.helpOpen || !state.pause || state.pause.kind !== 'retreat') return;
  state.pause = state.pause.previous;
  state.lastTick = Date.now();
  render();
}

function confirmRetreat() {
  if (state.gameOver || state.helpOpen || !state.pause || state.pause.kind !== 'retreat' || retreatRemaining() > 0) return;
  state.retreatReadyAt = state.activeTime + RETREAT_COOLDOWN;
  state.pause = null;
  if (state.depth > 1) enterFloor(state.depth - 1, true);
  else {
    state.player.x = state.upstairs.x; state.player.y = state.upstairs.y;
    recreateMonsters();
    revealAroundPlayer();
  }
  state.player.hp = state.player.maxHp;
  state.warnedLow = false; state.warnedCritical = false;
  markCombat();
  state.lastTick = Date.now();
  playSound('heal');
  log(`You retreat to ${state.depth === 1 ? 'the first floor' : `depth ${state.depth}`} with full health.`);
  render();
}

function recoveryTick(elapsed) {
  if (!state.started || state.gameOver || state.helpOpen || state.pause) return;
  const before = state.combatElapsed;
  state.combatElapsed += elapsed;
  const p = state.player;
  const nearby = state.monsters.some(m => m.hp > 0 && Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) <= 3);
  if (nearby || p.hp >= p.maxHp) { state.healElapsed = 0; return; }
  state.healElapsed += Math.max(0, state.combatElapsed - Math.max(6, before));
  while (state.healElapsed >= 2 && p.hp < p.maxHp) {
    state.healElapsed -= 2;
    p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * HEAL_FRACTION)));
  }
}

function renderPause() {
  const pause = state.pause;
  const overlay = document.getElementById('pauseOverlay');
  if (state.helpOpen) { overlay.style.display = 'none'; return; }
  overlay.style.display = pause ? 'flex' : 'none';
  if (!pause) {
    if (document.activeElement && overlay.contains(document.activeElement)) canvas.focus();
    return;
  }
  const confirming = pause.kind === 'retreat';
  const critical = state.player.hp / state.player.maxHp < 0.1;
  document.getElementById('pauseTitle').textContent = confirming ? 'RETREAT?' : critical ? 'CRITICAL HEALTH' : state.player.hp / state.player.maxHp >= 0.2 ? 'HEALTH RESTORED' : 'LOW HEALTH';
  document.getElementById('pauseText').textContent = confirming
    ? `Return ${state.depth > 1 ? 'to the previous floor' : 'to this floor’s entrance'} with full HP?`
    : `Time is paused. ${state.inventory.length} potion(s) stored. H: drink · C: continue${critical ? retreatRemaining() > 0 ? ` · Retreat: ${Math.ceil(retreatRemaining())} active seconds remaining` : ' · T: retreat' : ''}`;
  document.getElementById('drinkPotion').hidden = confirming;
  document.getElementById('drinkPotion').disabled = !state.inventory.length || state.player.hp >= state.player.maxHp;
  document.getElementById('continueGame').hidden = confirming;
  document.getElementById('retreatChoice').hidden = confirming || !critical;
  document.getElementById('retreatChoice').disabled = retreatRemaining() > 0;
  document.getElementById('confirmRetreat').hidden = !confirming;
  document.getElementById('cancelRetreat').hidden = !confirming;
  if (document.activeElement && (!overlay.contains(document.activeElement) || document.activeElement.hidden || document.activeElement.disabled)) {
    document.getElementById(confirming ? 'cancelRetreat' : state.inventory.length && state.player.hp < state.player.maxHp ? 'drinkPotion' : 'continueGame').focus();
  }
}

function enemyTick() {
  const now = Date.now();
  const elapsed = Math.min(0.5, Math.max(0, (now - state.lastTick) / 1000));
  state.lastTick = now;
  if (!state.started || state.gameOver || state.helpOpen || state.pause || document.hidden || bossDefeatActive()) return;
  checkHealth();
  if (state.pause) { render(); return; }
  advanceActiveTime(elapsed);
  musicTick();
  hazardTick();
  if (state.gameOver || state.helpOpen || state.pause) { render(); return; }
  const p = state.player;
  if (state.bubble && state.bubble.ttl > 0) state.bubble.ttl--;
  for (const m of state.monsters) {
    if (m.hp <= 0) continue;
    if (Math.random() < 0.6) {
      const dx = Math.sign(p.x - m.x), dy = Math.sign(p.y - m.y);
      const options = [];
      if (dx !== 0) options.push([dx, 0]);
      if (dy !== 0) options.push([0, dy]);
      if (Math.random() < 0.3) options.push([-dx, -dy]);
      if (!options.length) continue;
      const [mx, my] = options[Math.floor(Math.random() * options.length)];
      const nx = m.x + mx, ny = m.y + my;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (state.map[ny][nx] !== 0) continue;
      if (nx === p.x && ny === p.y) {
        enemyAttack(m);
        if (state.gameOver || state.helpOpen || state.pause) { render(); return; }
        continue;
      }
      if (monsterAt(nx, ny)) continue;
      moveActorTo(m, nx, ny);
    }
  }
  recoveryTick(elapsed);
  render();
}

function drawFloorDetails() {
  for (const obstacle of state.obstacles) {
    if (!inRenderCamera(obstacle.x, obstacle.y) || !state.visited.has(`${obstacle.x},${obstacle.y}`)) continue;
    drawSprite(obstacle.type, obstacle.x * TILE + TILE / 2, obstacle.y * TILE + TILE / 2, 2);
  }
  for (const hazard of state.hazards) {
    if (!hazard.revealed || !inRenderCamera(hazard.x, hazard.y) || !state.visited.has(`${hazard.x},${hazard.y}`)) continue;
    const x = hazard.x * TILE, y = hazard.y * TILE;
    const sprite = hazard.type === 'flame' ? (flameActive(hazard) ? 'flameOn' : 'flameOff')
      : hazard.type === 'rocks' ? (hazard.stage === 'spent' ? 'rockSpent' : 'rockCrack') : 'spikes';
    drawSprite(sprite, x + TILE / 2, y + TILE / 2, 2, sprite === 'flameOn' ? environmentAnimationFrame(hazard.x, hazard.y) : 0);
    if (hazard.type === 'rocks' && hazard.stage === 'warning') {
      const fall = Math.max(0, Math.min(1, 1 - (hazard.impactAt - state.hazardTime) / 1.2));
      ctx.fillStyle = '#ac9981'; ctx.fillRect(x + 6, y - 10 + Math.round(fall * 20), 7, 6); ctx.fillRect(x + 22, y - 8 + Math.round(fall * 20), 5, 5);
    }
  }
  const drop = state.floorKey && state.floorKey.drop;
  if (drop && inRenderCamera(drop.x, drop.y) && state.visited.has(`${drop.x},${drop.y}`)) {
    drawSprite('key', drop.x * TILE + TILE / 2, drop.y * TILE + TILE / 2, 2);
  }
}

function drawHazardWarnings() {
  for (const hazard of state.hazards) {
    if (hazard.type !== 'rocks' || hazard.stage !== 'warning' || !inRenderCamera(hazard.x, hazard.y) || fogLevel(hazard.x, hazard.y) >= 3) continue;
    const x = hazard.x * TILE, y = hazard.y * TILE;
    ctx.fillStyle = '#ffd07a'; ctx.fillRect(x + 8, y - 23, 16, 19);
    ctx.fillStyle = '#211b15'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x + 16, y - 13);
  }
}

function drawMimicDefeat(scene) {
  const visual = state.bossDefeat.visual;
  if (!inRenderCamera(visual.tileX, visual.tileY)) return;
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  ctx.translate(visual.x + scene.shake, visual.y + scene.rise);
  ctx.scale(1 + scene.squash * 0.25, 1 - scene.squash);
  drawSprite(visual.sprite, 0, 0, visual.scale);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  for (const coin of scene.coins) {
    ctx.fillStyle = coin.size % 2 ? '#f4cf78' : '#ffe9a8';
    ctx.fillRect(visual.x + coin.x, visual.y + coin.y, coin.size + 2, coin.size);
  }
  ctx.fillStyle = `rgba(180, 160, 130, ${0.42 * scene.alpha})`;
  for (let i = 0; i < 7; i++) {
    const spread = (i - 3) * 14 + scene.shake;
    ctx.fillRect(visual.x + spread, visual.bottom - 6 - Math.abs(spread) * 0.12 + scene.rise, 16, 7);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = scene.bannerAlpha;
  ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = visual.top - 28 - scene.bannerRise;
  ctx.strokeStyle = '#14110e'; ctx.lineWidth = 4; ctx.strokeText('MIMIC DEFEATED', visual.x, y);
  ctx.fillStyle = '#ffdf8a'; ctx.fillText('MIMIC DEFEATED', visual.x, y);
  ctx.restore();
}

function drawDragonDefeatDragon(scene) {
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  ctx.translate(576 + scene.shake, scene.dragonY);
  ctx.fillStyle = '#23432d'; ctx.strokeStyle = '#6b9b69'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-30, -10); ctx.lineTo(-150, -70 + scene.wing); ctx.lineTo(-134, 12); ctx.lineTo(-48, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, -10); ctx.lineTo(150, -70 + scene.wing); ctx.lineTo(134, 12); ctx.lineTo(48, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 30); ctx.quadraticCurveTo(100, 80, 150, 40); ctx.stroke();
  drawSprite('dragonBoss', 0, 0, 4);
  ctx.restore();
}

function drawDragonDefeat(scene) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(5, 7, 14, ${scene.dim})`; ctx.fillRect(0, 0, 1152, 768);
  const glow = ctx.createRadialGradient(576, scene.dragonY - 20, 10, 576, scene.dragonY - 20, 240);
  glow.addColorStop(0, 'rgba(255, 96, 60, 0.45)'); glow.addColorStop(1, 'rgba(255, 96, 60, 0)');
  ctx.fillStyle = glow; ctx.fillRect(336, scene.dragonY - 260, 480, 480);
  ctx.strokeStyle = `rgba(156, 220, 255, ${scene.boltAlpha})`; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const x = 300 + i * 190, top = 140 + i % 2 * 48;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 22, top + 62); ctx.lineTo(x - 12, top + 108);
    ctx.lineTo(x + 16, top + 168); ctx.lineTo(x - 8, top + 220); ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const rise = (scene.t * (40 + i * 3) + i * 37) % 260;
    const alpha = scene.emberAlpha * (1 - rise / 260);
    if (alpha <= 0) continue;
    ctx.fillStyle = `rgba(255, ${120 + i % 4 * 30}, 60, ${alpha})`;
    ctx.fillRect(240 + (i * 79) % 680 + Math.sin(i + scene.t * 4) * 20, 610 - rise, 3, 3);
  }
  drawDragonDefeatDragon(scene);
  ctx.globalAlpha = scene.bannerAlpha;
  ctx.fillStyle = '#080b12'; ctx.fillRect(0, 624, 1152, 144);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe4ac'; ctx.font = 'bold 44px Georgia, serif'; ctx.fillText('DRAGON SLAIN', 576, 672);
  ctx.fillStyle = '#d8c5ad'; ctx.font = '16px monospace'; ctx.fillText('The princess is waiting…', 576, 716);
  ctx.restore();
}

function draw() {
  if (state.ending) { drawEnding(); return; }
  const defeat = state.bossDefeat ? bossDefeatScene() : null;
  const p = state.player;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateCamera();
  const view = renderViewport();
  ctx.save();
  ctx.scale(MAP_ZOOM, MAP_ZOOM);
  ctx.translate(-Math.round(view.camera.x * TILE * MAP_ZOOM) / MAP_ZOOM, -Math.round(view.camera.y * TILE * MAP_ZOOM) / MAP_ZOOM);
  for (let y = view.y0; y < view.y1; y++) {
    for (let x = view.x0; x < view.x1; x++) {
      drawDungeonTile(x, y);
    }
  }
  drawDungeonTorches();
  drawFloorDetails();
  for (const [stairs, glyph] of [[state.depth < FINAL_DEPTH ? state.stairs : null, '▼'], [state.depth > 1 ? state.upstairs : null, '▲']]) {
    if (!stairs || !inRenderCamera(stairs.x, stairs.y) || !state.visited.has(`${stairs.x},${stairs.y}`)) continue;
    const spriteName = glyph === '▼' ? 'stairsDown' : 'stairsUp';
    drawSprite(spriteName, stairs.x * TILE + TILE / 2, stairs.y * TILE + TILE / 2, 2);
  }
  for (const t of state.treasures) {
    if (!inRenderCamera(t.x, t.y) || !state.visited.has(`${t.x},${t.y}`)) continue;
    drawSprite('chest', t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, 2);
  }
  for (const pot of state.potions) {
    if (!inRenderCamera(pot.x, pot.y) || !state.visited.has(`${pot.x},${pot.y}`)) continue;
    drawSprite('potion', pot.x * TILE + TILE / 2, pot.y * TILE + TILE / 2, 2);
  }
  if (state.prisoner && inRenderCamera(state.prisoner.x, state.prisoner.y) && !state.prisoner.rescued && fogLevel(state.prisoner.x, state.prisoner.y) < 3) {
    const px = state.prisoner.x * TILE + TILE / 2, py = state.prisoner.y * TILE + TILE / 2;
    drawActorSprite('prisoner', px, py, 2);
  }
  if (state.princess && inRenderCamera(state.princess.x, state.princess.y) && !state.princess.rescued && fogLevel(state.princess.x, state.princess.y) < 3) {
    const px = state.princess.x * TILE + TILE / 2, py = state.princess.y * TILE + TILE / 2;
    drawActorSprite('princess', px, py, 2);
  }
  if (state.merchant && inRenderCamera(state.merchant.x, state.merchant.y) && fogLevel(state.merchant.x, state.merchant.y) < 3) {
    const px = state.merchant.x * TILE + TILE / 2, py = state.merchant.y * TILE + TILE / 2;
    drawActorSprite('merchant', px, py, 2);
  }
  for (const m of state.monsters) {
    if (m.hp <= 0 || !inRenderCamera(m.x, m.y)) continue;
    if (fogLevel(m.x, m.y) >= 3) continue;
    const visual = monsterVisual(m);
    drawActorSprite(visual.sprite, visual.x, visual.y, visual.scale, m);
  }
  for (let y = view.y0; y < view.y1; y++) {
    for (let x = view.x0; x < view.x1; x++) {
      const d = Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
      if (d <= 1) continue;
      const key = `${x},${y}`;
      if (state.visited.has(key)) {
        ctx.fillStyle = 'rgba(5, 6, 10, 0.45)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      } else {
        const a = Math.min(0.95, (d - 1) * 0.35);
        ctx.fillStyle = `rgba(5, 6, 10, ${a})`;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
  // Keep visible actors' health bars readable above the terrain fog.
  for (const m of state.monsters) {
    if (m.hp <= 0 || !inRenderCamera(m.x, m.y) || fogLevel(m.x, m.y) >= 3) continue;
    const visual = monsterVisual(m);
    const barWidth = m.isBoss ? visual.width - 12 : 24;
    ctx.fillStyle = '#333'; ctx.fillRect(visual.x - barWidth / 2, visual.top - 7, barWidth, 4);
    ctx.fillStyle = '#ff3d3d'; ctx.fillRect(visual.x - barWidth / 2, visual.top - 7, barWidth * (m.hp / m.maxHp), 4);
  }
  if (state.bubble && state.bubble.ttl > 0) {
    const text = state.bubble.text;
    const position = actorRenderPosition(p);
    const px = position.x * TILE + TILE / 2, py = position.y * TILE - 8;
    ctx.font = '11px monospace';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = '#f4f1e6';
    ctx.beginPath(); ctx.roundRect(px - w / 2, py - 22, w, 18, 5); ctx.fill();
    ctx.fillStyle = '#11131c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, px, py - 13);
  }
  const position = actorRenderPosition(p);
  const px = position.x * TILE + TILE / 2, py = position.y * TILE + TILE / 2;
  ctx.save(); ctx.translate(px, py);
  drawActorSprite('knight', 0, 0, 2, p);
  ctx.restore();
  drawMonsterSpeech();
  drawHazardWarnings();
  if (defeat && defeat.kind === 'mimic') drawMimicDefeat(defeat);
  ctx.restore();
  if (defeat && defeat.kind === 'dragon') drawDragonDefeat(defeat);
  requestMotionFrame();
}

function endingPhase(time) {
  if (time < 2) return 'reveal';
  if (time < 5) return 'heal';
  if (time < 8) return 'escape';
  if (time < ENDING_DURATION) return 'sunset';
  return 'done';
}

function endingCaption() {
  const ending = state.ending;
  if (!ending) return '';
  if (ending.phase === 'reveal') return 'At last, you reach the princess.';
  if (ending.phase === 'heal') return ending.elapsed < 3.6 ? 'Princess: “I love him!”' : 'She heals the dragon.';
  if (ending.phase === 'escape') return 'The princess and her dragon fly away together. Hero: “…Oh.”';
  if (ending.phase === 'sunset') return 'The hero walks toward the sunset, crying.';
  return 'THE END — The princess chose the dragon.';
}

function startEnding() {
  if (state.ending || state.depth !== FINAL_DEPTH || !state.bossDefeated || !state.princess || !state.princess.rescued) return;
  const dragon = state.boss || state.monsterSpawns.find(m => m.isDragon);
  state.ending = { elapsed: 0, phase: 'reveal', completed: false, frameId: null,
    lastTimestamp: null, events: new Set(), dragon: { ...dragon, hp: 0 } };
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  state.gameOver = true; state.won = true; state.pause = null; state.bubble = null;
  document.getElementById('overlay').style.display = 'none';
  log('At last, you reach the princess.');
  render();
  requestEndingFrame(state.ending);
}

function requestEndingFrame(ending) {
  if (state.ending !== ending || ending.completed || typeof window.requestAnimationFrame !== 'function') return;
  ending.frameId = window.requestAnimationFrame(timestamp => endingFrame(timestamp, ending));
}

function stopEndingAnimation() {
  const ending = state && state.ending;
  if (!ending) return;
  if (ending.frameId !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(ending.frameId);
  ending.frameId = null;
}

function endingFrame(timestamp, ending) {
  if (state.ending !== ending || ending.completed) return;
  ending.frameId = null;
  if (document.hidden || state.helpOpen) {
    ending.lastTimestamp = null;
    requestEndingFrame(ending);
    return;
  }
  const elapsed = ending.lastTimestamp === null ? 0 : Math.min(0.1, Math.max(0, (timestamp - ending.lastTimestamp) / 1000));
  ending.lastTimestamp = timestamp;
  advanceEnding(elapsed);
  draw();
  requestEndingFrame(ending);
}

function advanceEnding(elapsed, silent = false) {
  const ending = state.ending;
  if (!ending || ending.completed || document.hidden || state.helpOpen) return;
  ending.elapsed = Math.min(ENDING_DURATION, ending.elapsed + Math.max(0, elapsed));
  ending.phase = endingPhase(ending.elapsed);
  const milestones = [
    [2, 'love', 'Princess: “I love him!”'],
    [3.6, 'healing', 'The princess runs to the wounded dragon and heals him.'],
    [5, 'escape', 'The dragon is healed. They fly away together.'],
    [8, 'sunset', 'Hero: “…Oh.” He walks toward the sunset, crying.'],
  ];
  for (const [at, event, message] of milestones) {
    if (ending.elapsed < at || ending.events.has(event)) continue;
    ending.events.add(event); log(message);
    if (!silent && event === 'healing') playSound('heal');
    if (!silent && event === 'sunset') {
      [392, 349.23, 311.13, 261.63, 233.08, 196].forEach((note, i) => tone(note, 0.65, 'triangle', 0.25, i * 0.45, 'music'));
    }
  }
  const recovery = Math.max(0, Math.min(1, (ending.elapsed - 3.6) / 1.4));
  ending.dragon.hp = Math.round(ending.dragon.maxHp * recovery);
  ending.completed = ending.elapsed >= ENDING_DURATION;
  if (ending.completed) stopEndingAnimation();
  const caption = endingCaption();
  if (document.getElementById('objective').textContent !== caption) document.getElementById('objective').textContent = caption;
  document.getElementById('skipEnding').disabled = ending.completed;
}

function skipEnding() {
  if (!state.ending || state.ending.completed || document.hidden || state.helpOpen) return;
  stopEndingAnimation();
  advanceEnding(ENDING_DURATION, true);
  render();
  canvas.focus?.();
}

function restartFromEnding() {
  newGame(); render(); canvas.focus?.();
}

function endingScene() {
  const ending = state.ending;
  const t = ending.elapsed;
  const flight = Math.max(0, Math.min(1, (t - 5) / 3));
  const walk = Math.max(0, Math.min(1, (t - 8) / 6));
  const run = Math.max(0, Math.min(1, (t - 2) / 1.6));
  const dragonX = 875 + 470 * flight, dragonY = 510 - 330 * flight;
  return { time: t, phase: ending.phase, flight, walk,
    hero: { x: t < 8 ? 230 : 460 + 116 * walk, y: t < 8 ? 505 : 585 - 137 * walk,
      scale: t < 8 ? 4 : 4.2 - 2.4 * walk, crying: t >= 8 },
    princess: { x: t < 5 ? 520 + 285 * run : dragonX + 5,
      y: t < 5 ? 500 - (run > 0 && run < 1 ? Math.abs(Math.sin(t * 18)) * 5 : 0) : dragonY - 68 },
    dragon: { x: dragonX, y: dragonY, health: Math.max(0, Math.min(1, (t - 3.6) / 1.4)) } };
}

function drawEndingHeart(x, y, size) {
  const pixels = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
  ctx.fillStyle = '#ffa4c2';
  for (let row = 0; row < pixels.length; row++) for (let col = 0; col < pixels[row].length; col++) {
    if (pixels[row][col] === 'x') ctx.fillRect(x + col * size, y + row * size, size, size);
  }
}

function drawEndingDragon(x, y, time, health, flying) {
  const flap = flying ? Math.sin(time * 10) * 35 : 15 * (1 - health);
  ctx.save();
  ctx.globalAlpha = 0.5 + health * 0.5;
  ctx.fillStyle = '#294b32'; ctx.strokeStyle = '#689465'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 28, y - 10); ctx.lineTo(x - 110, y - 65 - flap); ctx.lineTo(x - 96, y + 8); ctx.lineTo(x - 45, y + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 28, y - 10); ctx.lineTo(x + 110, y - 65 - flap); ctx.lineTo(x + 96, y + 8); ctx.lineTo(x + 45, y + 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 30, y + 24); ctx.quadraticCurveTo(x + 95, y + 65, x + 130, y + 15); ctx.stroke();
  drawSprite('dragonBoss', x, y + (flying ? Math.sin(time * 10) * 4 : 0), 3);
  ctx.restore();
}

function drawEndingHero(hero, time) {
  const stride = Math.sin(time * 9);
  const moving = hero.crying && state.ending.phase !== 'done';
  const bob = moving ? Math.abs(stride) * hero.scale * 0.7 : 0;
  ctx.save(); ctx.translate(hero.x, hero.y - bob);
  if (hero.crying) ctx.rotate(0.15);
  drawSprite('knight', 0, 0, hero.scale);
  ctx.fillStyle = '#343944';
  ctx.fillRect(-4 * hero.scale, 7 * hero.scale + (moving ? stride * hero.scale : 0), 3 * hero.scale, 2 * hero.scale);
  ctx.fillRect(hero.scale, 7 * hero.scale - (moving ? stride * hero.scale : 0), 3 * hero.scale, 2 * hero.scale);
  if (hero.crying) {
    ctx.fillStyle = '#262a34'; ctx.fillRect(-3 * hero.scale, -4.5 * hero.scale, 6 * hero.scale, 2 * hero.scale);
    ctx.fillStyle = '#8ae2ff';
    ctx.fillRect(2 * hero.scale, -3 * hero.scale, hero.scale, 3 * hero.scale);
  }
  ctx.restore();
  if (hero.crying) for (let i = 0; i < 9; i++) {
    const age = (time * 1.7 + i * 0.23) % 2;
    ctx.fillStyle = `rgba(125, 216, 255, ${0.85 * (1 - age / 2)})`;
    const size = Math.max(2, hero.scale * 0.8);
    ctx.fillRect(hero.x + 2 * hero.scale - age * 20, hero.y - 3 * hero.scale + age * 24, size, size * 1.5);
  }
}

function drawEndingBubble(text, x, y) {
  ctx.font = '18px monospace';
  const width = ctx.measureText(text).width + 28;
  ctx.fillStyle = '#f4eedc'; ctx.beginPath(); ctx.roundRect(x - width / 2, y - 22, width, 36, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 7, y + 12); ctx.lineTo(x, y + 24); ctx.lineTo(x + 7, y + 12); ctx.fill();
  ctx.fillStyle = '#252734'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 3);
}

function drawEndingSunset(scene) {
  const sky = ctx.createLinearGradient(0, 0, 0, 768);
  sky.addColorStop(0, '#34203e'); sky.addColorStop(0.5, '#d47862'); sky.addColorStop(1, '#f2b76e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1152, 768);
  ctx.fillStyle = '#ffdb87'; ctx.beginPath(); ctx.arc(576, 340, 88, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8c28b66'; ctx.fillRect(420, 322, 310, 8); ctx.fillRect(470, 360, 240, 7);
  ctx.fillStyle = '#69506b';
  ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(135, 320); ctx.lineTo(265, 421); ctx.lineTo(400, 340); ctx.lineTo(530, 435); ctx.lineTo(725, 360); ctx.lineTo(860, 415); ctx.lineTo(1000, 305); ctx.lineTo(1152, 432); ctx.lineTo(1152, 768); ctx.lineTo(0, 768); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d3849'; ctx.fillRect(0, 449, 1152, 319);
  ctx.fillStyle = '#a77559';
  ctx.beginPath(); ctx.moveTo(558, 449); ctx.lineTo(588, 449); ctx.lineTo(860, 768); ctx.lineTo(180, 768); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c09269';
  ctx.beginPath(); ctx.moveTo(568, 449); ctx.lineTo(579, 449); ctx.lineTo(715, 768); ctx.lineTo(345, 768); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#292a38';
  for (let i = 0; i < 12; i++) {
    const x = (i * 137 + 27) % 1152, y = 495 + (i * 73) % 190;
    if (x > 300 && x < 820) continue;
    ctx.fillRect(x, y, 26, 7); ctx.fillRect(x + 8, y - 10, 3, 16);
  }
  drawEndingHero(scene.hero, scene.time);
  if (scene.phase === 'done') {
    ctx.fillStyle = '#ffe4ac'; ctx.font = 'bold 50px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('THE END', 576, 115);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#f4d6b6'; ctx.fillText('The princess chose the dragon.', 576, 151);
  }
}

function drawEnding() {
  const scene = endingScene();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1152, 768);
  ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  if (scene.time < 8) {
    const sky = ctx.createLinearGradient(0, 0, 0, 768);
    sky.addColorStop(0, '#101622'); sky.addColorStop(1, '#34302e'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 1152, 768);
    ctx.strokeStyle = '#414552'; ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(i * 220 - 20, 565); ctx.lineTo(i * 220 - 20, 270); ctx.quadraticCurveTo(i * 220 + 80, 130, i * 220 + 180, 270); ctx.lineTo(i * 220 + 180, 565); ctx.stroke();
    }
    ctx.fillStyle = '#28251f'; ctx.fillRect(0, 550, 1152, 218);
    ctx.strokeStyle = '#463c30'; ctx.lineWidth = 2;
    for (let y = 570; y < 670; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1152, y); ctx.stroke(); }
    drawEndingHero(scene.hero, scene.time);
    if (scene.time >= 3.6 && scene.time < 5) {
      const glow = ctx.createRadialGradient(875, 500, 10, 875, 500, 150);
      glow.addColorStop(0, '#8af9b37f'); glow.addColorStop(1, '#8af9b300'); ctx.fillStyle = glow;
      ctx.fillRect(720, 330, 310, 310);
    }
    drawEndingDragon(scene.dragon.x, scene.dragon.y, scene.time, scene.dragon.health, scene.time >= 5);
    drawSprite('princess', scene.princess.x, scene.princess.y, 4);
    if (scene.time < 2) drawEndingBubble('At last!', 230, 425);
    else if (scene.time < 3.6) drawEndingBubble('I love him!', scene.princess.x, 425);
    else if (scene.time < 5) {
      ctx.fillStyle = '#18251d'; ctx.fillRect(815, 405, 124, 10);
      ctx.fillStyle = '#82e9a4'; ctx.fillRect(817, 407, 120 * scene.dragon.health, 6);
      for (let i = 0; i < 6; i++) drawEndingHeart(816 + Math.sin(scene.time * 2 + i) * 45, 470 - ((scene.time * 60 + i * 23) % 130), 2);
    } else drawEndingBubble('…Oh.', 230, 425);
    ctx.fillStyle = '#d7c39a'; ctx.font = '15px monospace'; ctx.textAlign = 'center'; ctx.fillText('THE LAST CHAMBER', 576, 112);
  } else drawEndingSunset(scene);
  // Letterboxing keeps captions clear of the actors and sunset path.
  ctx.fillStyle = '#080b12'; ctx.fillRect(0, 0, 1152, 48); ctx.fillRect(0, 658, 1152, 110);
  ctx.fillStyle = '#e8dcc5'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const caption = scene.phase === 'done' ? `Depth ${state.depth} · Level ${state.player.lvl} · ${state.kills} ${state.kills === 1 ? 'kill' : 'kills'} · ${state.gold} gold` : endingCaption();
  ctx.fillText(caption, 576, 696);
  ctx.font = '12px monospace'; ctx.fillStyle = '#a5adbd'; ctx.fillText(scene.phase === 'done' ? 'Press R for a new adventure' : 'Esc: skip to the sunset · R: new adventure', 576, 737);
  const fade = scene.time >= 7.5 && scene.time < 8 ? (scene.time - 7.5) / 0.5 : scene.time >= 8 && scene.time < 8.6 ? 1 - (scene.time - 8) / 0.6 : 0;
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, 1152, 768); }
  ctx.restore();
}

function startAudio() {
  const audio = state.audio;
  if (!audio.enabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    if (!audio.context) {
      audio.context = new AudioContextClass();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.12;
      audio.master.connect(audio.context.destination);
      audio.musicBus = audio.context.createGain();
      audio.effectsBus = audio.context.createGain();
      audio.musicBus.gain.value = audio.musicVolume;
      audio.effectsBus.gain.value = audio.effectsVolume;
      audio.musicBus.connect(audio.master);
      audio.effectsBus.connect(audio.master);
    }
    if (audio.context.state === 'suspended') audio.context.resume().catch(() => {});
  } catch (_) {
    audio.enabled = false;
  }
}

function tone(frequency, duration, type, volume, delay, channel = 'effects') {
  const audio = state.audio;
  if (!audio.enabled || !audio.context || audio.context.state !== 'running') return;
  const at = audio.context.currentTime + (delay || 0);
  const osc = audio.context.createOscillator();
  const gain = audio.context.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  osc.connect(gain); gain.connect(channel === 'music' ? audio.musicBus : audio.effectsBus);
  osc.start(at); osc.stop(at + duration + 0.01);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}

function playSound(name) {
  const notes = {
    slash: [180, 90], hit: [90, 65], heal: [330, 440, 660],
    death: [220, 165, 110, 55], pickup: [440, 660], stairs: [220, 330, 440],
  }[name] || [];
  notes.forEach((note, i) => tone(note, 0.12, name === 'slash' ? 'sawtooth' : 'square', 0.3, i * 0.09));
}

function musicTick() {
  const audio = state.audio;
  if (!audio.enabled || !audio.context || audio.context.state !== 'running') return;
  if (audio.context.currentTime < audio.nextNote) return;
  const melody = [220, 0, 330, 294, 262, 0, 196, 220, 165, 0, 220, 262, 247, 196, 165, 0];
  const note = melody[audio.step % melody.length];
  if (note) tone(note, 0.2, 'triangle', 0.18, 0, 'music');
  if (audio.step % 4 === 0) tone(audio.step % 8 === 0 ? 110 : 82.41, 0.32, 'triangle', 0.22, 0, 'music');
  audio.step++;
  audio.nextNote = audio.context.currentTime + 0.27;
}

function toggleAudio() {
  state.audio.enabled = !state.audio.enabled;
  if (state.audio.master) state.audio.master.gain.value = state.audio.enabled ? 0.12 : 0;
  if (state.audio.enabled) startAudio();
  render();
}

function setAudioVolume(channel, percent) {
  if (!['music', 'effects'].includes(channel) || !Number.isFinite(Number(percent))) return;
  const volume = Math.max(0, Math.min(1, Number(percent) / 100));
  state.audio[`${channel}Volume`] = volume;
  const bus = state.audio[`${channel}Bus`];
  if (bus) bus.gain.value = volume;
  render();
}

function objectiveText() {
  if (state.ending) return endingCaption();
  let campaign;
  if (!state.floors[5] || !state.floors[5].bossDefeated) campaign = 'Defeat the Mimic at depth 5 to unlock the lower dungeon.';
  else if (!state.floors[FINAL_DEPTH] || !state.floors[FINAL_DEPTH].bossDefeated) campaign = 'Defeat the dragon at depth 10.';
  else campaign = 'Rescue the princess at depth 10 — stand on her tile and press Space.';
  if (state.floorKey && !state.floorKey.collected) return `${state.floorKey.drop ? 'Collect the dropped floor key (Space).' : 'Find the hidden key carrier.'} ${campaign}`;
  return campaign;
}

function signedBonus(value) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function renderEquipment() {
  for (const slot of ['weapon', 'armor', 'ring']) {
    const item = state.equipment[slot];
    drawEquipmentIcon(slot, item);
    document.getElementById(`${slot}Slot`).className = item ? 'gear-slot equipped' : 'gear-slot empty';
    document.getElementById(`${slot}Name`).textContent = item ? item.name : 'Empty slot';
    const bonuses = [`HP ${signedBonus(item ? item.maxHp || 0 : 0)}`, `STR ${signedBonus(item ? item.str || 0 : 0)}`];
    for (const stat of ['atk', 'def', 'dex']) {
      if (item && item[stat]) bonuses.push(`${stat.toUpperCase()} ${signedBonus(item[stat])}`);
    }
    document.getElementById(`${slot}Bonuses`).textContent = bonuses.join(' · ');
  }
  document.getElementById('gearHpBonus').textContent = signedBonus(equipmentBonus('maxHp'));
  document.getElementById('gearStrBonus').textContent = signedBonus(equipmentBonus('str'));
  document.getElementById('heroMaxHp').textContent = state.player.maxHp;
  document.getElementById('heroStrength').textContent = effectiveStr();
  document.getElementById('heroAttack').textContent = effectiveAtk();
  document.getElementById('heroDefense').textContent = effectiveDef();
  document.getElementById('heroDexterity').textContent = effectiveDex();
}

function renderMinimap() {
  const mapCanvas = document.getElementById('minimap');
  const mapCtx = mapCanvas.getContext('2d');
  const scale = 3;
  mapCtx.fillStyle = '#070b10';
  mapCtx.fillRect(0, 0, W * scale, H * scale);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!state.visited.has(`${x},${y}`)) continue;
    mapCtx.fillStyle = state.map[y][x] === 0 ? '#51626b' : state.map[y][x] === 2 ? '#8c7957' : '#242d39';
    mapCtx.fillRect(x * scale, y * scale, scale, scale);
  }
  mapCtx.strokeStyle = '#9aaac1'; mapCtx.lineWidth = 1;
  const camera = renderCamera();
  mapCtx.strokeRect(camera.x * scale + 0.5, camera.y * scale + 0.5, VIEW_W * scale - 1, VIEW_H * scale - 1);
  for (const [stairs, color] of [[state.depth > 1 ? state.upstairs : null, '#8ecaff'], [state.depth < FINAL_DEPTH ? state.stairs : null, '#f4cf78']]) {
    if (!stairs || !state.visited.has(`${stairs.x},${stairs.y}`)) continue;
    mapCtx.fillStyle = color;
    mapCtx.fillRect(stairs.x * scale, stairs.y * scale, scale, scale);
  }
  const position = actorRenderPosition(state.player);
  const px = position.x * scale, py = position.y * scale;
  mapCtx.fillStyle = '#07151a'; mapCtx.fillRect(px - 1, py - 1, scale + 2, scale + 2);
  mapCtx.fillStyle = '#86f2c3'; mapCtx.fillRect(px, py, scale, scale);
  document.getElementById('minimapDepth').textContent = `D${state.depth}`;
}

function resetHelpClock() {
  state.lastTick = Date.now();
  if (state.ending) state.ending.lastTimestamp = null;
  if (state.bossDefeat) state.bossDefeat.lastTimestamp = null;
  state.motion.lastTimestamp = null;
}

function openHelp() {
  if (state.helpOpen) return;
  state.helpFocus = document.activeElement;
  state.helpOpen = true;
  resetHelpClock();
  document.getElementById('helpOverlay').hidden = false;
  document.getElementById('gameLayout').inert = true;
  document.getElementById('launchScreen').inert = true;
  document.getElementById('helpToggle').ariaExpanded = 'true';
  render();
  document.getElementById('closeHelp').focus?.();
}

function closeHelp() {
  if (!state.helpOpen) return;
  const focus = state.helpFocus;
  state.helpOpen = false; state.helpFocus = null;
  resetHelpClock();
  document.getElementById('helpOverlay').hidden = true;
  document.getElementById('gameLayout').inert = false;
  document.getElementById('launchScreen').inert = false;
  document.getElementById('helpToggle').ariaExpanded = 'false';
  render();
  if (state.pause) return; // renderPause restores the health/retreat dialog's focus.
  const target = focus && focus.isConnected && focus !== document.body ? focus : state.started ? canvas : document.getElementById('startGame');
  target.focus?.();
}

function toggleHelp() {
  if (state.helpOpen) closeHelp(); else openHelp();
}

function render() {
  checkHealth();
  renderPause();
  const p = state.player;
  draw();
  renderMinimap();
  document.getElementById('hpText').textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById('hpfill').style.width = (100 * p.hp / p.maxHp) + '%';
  document.getElementById('lvl').textContent = p.lvl;
  document.getElementById('xpfill').style.width = (100 * p.xp / p.xpNext) + '%';
  document.getElementById('depth').textContent = state.depth;
  document.getElementById('kills').textContent = state.kills;
  document.getElementById('turn').textContent = state.turn;
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('potions').textContent = state.inventory.length;
  document.getElementById('keyStatus').textContent = !state.floorKey ? '—' : state.floorKey.collected ? 'Unlocked' : state.floorKey.drop ? 'Dropped' : 'Missing';
  document.getElementById('posText').textContent = `${p.x + 1},${p.y + 1}`;
  document.getElementById('retreatStatus').textContent = retreatRemaining() > 0 ? `${Math.ceil(retreatRemaining())}s` : 'Ready';
  const objective = objectiveText();
  if (document.getElementById('objective').textContent !== objective) document.getElementById('objective').textContent = objective;
  for (const channel of ['music', 'effects']) {
    const percent = Math.round(state.audio[`${channel}Volume`] * 100);
    document.getElementById(`${channel}Volume`).value = percent;
    document.getElementById(`${channel}VolumeText`).textContent = `${percent}%`;
  }
  document.getElementById('audioToggle').textContent = state.audio.enabled ? 'Sound: on (M)' : 'Sound: off (M)';
  document.getElementById('audioToggle').ariaPressed = String(state.audio.enabled);
  document.getElementById('endingControls').hidden = !state.ending;
  document.getElementById('skipEnding').disabled = !!(state.ending && state.ending.completed);
  renderEquipment();
  const m = state.merchant;
  const stock = m && m.stock && m.stock.length ? m.stock.map(i => i.name).join(', ') : '(sold out)';
  document.getElementById('merchantStock').textContent = m ? `Merchant: ${stock}` : '';
  document.getElementById('merchantStock').hidden = !m;
}

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === '?') {
    e.preventDefault();
    if (!e.repeat) toggleHelp();
    return;
  }
  if (state.helpOpen) {
    if (k === 'escape') { e.preventDefault(); closeHelp(); }
    else if (k === 'm' && !e.repeat) toggleAudio();
    else if (k === 'tab') {
      const controls = [...document.getElementById('helpOverlay').querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && !el.hidden);
      const index = controls.indexOf(document.activeElement);
      const next = index < 0 ? (e.shiftKey ? controls.length - 1 : 0) : (index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
      e.preventDefault(); controls[next].focus();
    }
    return;
  }
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.target && e.target.tagName === 'BUTTON' && [' ', 'enter'].includes(k)) return;
  if (k === 'tab' && state.pause) {
    const buttons = [...document.getElementById('pauseOverlay').querySelectorAll('button')].filter(b => !b.hidden && !b.disabled);
    const index = buttons.indexOf(document.activeElement);
    const next = (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    e.preventDefault(); buttons[next].focus(); return;
  }
  if (['arrowup','arrowdown','arrowleft','arrowright',' ', 'backspace', 'enter'].includes(k)) e.preventDefault();
  if (!state.started) {
    if (!e.repeat && !['shift', 'control', 'alt', 'meta', 'tab', 'escape'].includes(k)) startGame();
    return;
  }
  startAudio();
  if (k === 'm') { toggleAudio(); return; }
  if (k === 'r') { restartFromEnding(); return; }
  if (bossDefeatActive()) {
    if (k === 'escape' && !e.repeat) skipBossDefeat();
    return;
  }
  if (state.ending) {
    if (k === 'escape' && !e.repeat) { e.preventDefault(); skipEnding(); }
    return;
  }
  if (state.gameOver) return;
  if (state.pause) {
    if (e.repeat) return;
    if (state.pause.kind === 'retreat') {
      if (k === 'y' || k === 'enter') confirmRetreat();
      else if (k === 'n' || k === 'escape') cancelRetreat();
    } else {
      if (k === 'h') drinkPotion();
      else if (k === 'c' || k === 'escape') continueGame();
      else if ((k === 't' || k === 'enter') && state.player.hp / state.player.maxHp < 0.1) retreat();
    }
    return;
  }
  if (k === 'arrowup' || k === 'w') movePlayer(0, -1);
  else if (k === 'arrowdown' || k === 's') movePlayer(0, 1);
  else if (k === 'arrowleft' || k === 'a') movePlayer(-1, 0);
  else if (k === 'arrowright' || k === 'd') movePlayer(1, 0);
  else if (e.repeat) return;
  else if (k === ' ') pickup();
  else if (k === 'h') drinkPotion();
  else if (k === 'x') sellToMerchant();
  else if (k === 'q' || k === 'backspace') ascendStairs();
  else if (k === 'enter') retreat();
});

document.addEventListener('visibilitychange', () => {
  state.lastTick = Date.now();
  if (state.ending) state.ending.lastTimestamp = null;
  if (state.bossDefeat) state.bossDefeat.lastTimestamp = null;
  stopMotionAnimation(); requestMotionFrame();
});

for (const [id, action] of [
  ['skipEnding', skipEnding], ['restartEnding', restartFromEnding], ['startGame', startGame], ['drinkPotion', drinkPotion], ['continueGame', continueGame], ['retreatChoice', retreat],
  ['confirmRetreat', confirmRetreat], ['cancelRetreat', cancelRetreat], ['audioToggle', toggleAudio],
  ['helpToggle', toggleHelp], ['closeHelp', closeHelp],
]) document.getElementById(id).addEventListener('click', () => { startAudio(); action(); });

for (const channel of ['music', 'effects']) {
  document.getElementById(`${channel}Volume`).addEventListener('input', e => {
    startAudio(); setAudioVolume(channel, e.target.value);
  });
}

newGame();
render();
setInterval(enemyTick, 220);
