const TILE = 32, W = 96, H = 64, MAP_ZOOM = 2, VIEW_W = 18, VIEW_H = 12;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;


const MONSTER_TYPES = [
  { name: 'Slime',    sprite: 'slime',    hp: 14, atk: 5,  def: 0, xp: 10 },
  { name: 'Bat',      sprite: 'bat',      hp: 10, atk: 7,  def: 1, xp: 14 },
  { name: 'Goblin',   sprite: 'goblin',   hp: 22, atk: 9,  def: 2, xp: 22 },
  { name: 'Skeleton', sprite: 'skeleton', hp: 28, atk: 12, def: 4, xp: 32 },
  { name: 'Orc',      sprite: 'orc',      hp: 40, atk: 16, def: 5, xp: 50 },
  { name: 'Wasp',     sprite: 'wasp',     hp: 18, atk: 8,  def: 1, xp: 20, minDepth: 2, range: 3, ranged: true, projectile: 'stinger' },
  { name: 'Mage',     sprite: 'mage',     hp: 25, atk: 10, def: 2, xp: 28, minDepth: 4, magic: true, magicType: 'attack', magicRange: 4 },
  { name: 'Healer',   sprite: 'healer',   hp: 30, atk: 6,  def: 3, xp: 35, minDepth: 5, magic: true, magicType: 'heal', magicRange: 3 },
];

const ITEM_TABLE = [
  { name: 'Potion',   sprite: 'potion',  gold: 15, kind: 'heal', heal: 0.35 },
  { name: 'Sword',    sprite: 'sword',   gold: 40, kind: 'weapon', atk: 6, str: 2 },
  { name: 'Bow',      sprite: 'bow',     gold: 50, kind: 'weapon', atk: 8, str: 1, range: 3 },
  { name: 'Armor',    sprite: 'armor',   gold: 45, kind: 'armor', def: 4, str: 1 },
  { name: 'Helmet',   sprite: 'helmet',  gold: 30, kind: 'armor', def: 2, dex: 2 },
  { name: 'Ring',     sprite: 'ring',    gold: 80, kind: 'ring', maxHp: 20, atk: 3, def: 2, str: 1, dex: 2 },
  { name: 'Elixir',   sprite: 'elixir',  gold: 60, kind: 'elixir', str: 2, dex: 2 },
  { name: 'Shield',   sprite: 'shield',  gold: 55, kind: 'armor', def: 5 },
  { name: 'Frostbolt Tome', sprite: 'spellbook', gold: 70, kind: 'spellbook', spell: 'frostbolt', minDepth: 2 },
  { name: 'Greater Heal Tome', sprite: 'spellbook', gold: 85, kind: 'spellbook', spell: 'greaterHeal', minDepth: 4 },
  { name: 'Magic Barrier Tome', sprite: 'spellbook', gold: 95, kind: 'spellbook', spell: 'magicBarrier', minDepth: 5 },
  { name: 'Town Scroll', sprite: 'townScroll', gold: 55, kind: 'scroll', scroll: 'town', minDepth: 1, lootWeight: 1 },
];

const SPELLS = {
  fireball: { name: 'Fireball', cost: 8, cooldown: 1.5, key: 'F' },
  heal: { name: 'Heal', cost: 12, cooldown: 2, key: 'G' },
  frostbolt: { name: 'Frostbolt', cost: 10, cooldown: 3, key: 'V' },
  greaterHeal: { name: 'Greater Heal', cost: 18, cooldown: 6, key: 'B' },
  magicBarrier: { name: 'Magic Barrier', cost: 14, cooldown: 4, key: 'Z' },
};
const COMPANION_LINES = {
  boss: ['I was much taller before our little arrangement.', 'Congratulations. I now years for a smaller office.', 'Technically, I still haunt this floor. Rent free.'],
  trap: ['You walked into that with such confidence.', 'The floor warned you. I admired your commitment.', 'I died to one of those once. You are doing fine.'],
  retreat: ['A strategic retreat. A very noble word for jogging away.', 'Cowardice with excellent timing.', 'I approve. Mostly because I am not carrying you.'],
  merchant: ['Bought everything? The pouch is now a memorial.', 'That merchant smiled like you were the Quest.', 'You now own six things you cannot use. Character growth.'],
  rescue: ['Another prisoner rescued. My old union is impressed.', 'You cut the ropes. I will take the credit in small font.', 'Heroic. Expensive. Occasionally useful.'],
};
const CAT_LINES = {
  intro: ['I am here for the meat and the money. The wife and children have standards.', 'Try to look heroic. I need material for the family ledger.'],
  bat: ['A bat. Finally, payroll with wings.', 'I hate bats. They start rumors in the rafters.', 'That one owes me nine mice and an apology.'],
  boss: ['That should cover the household budget. I am retiring vertically.', 'I have secured enough meat for a small army of kittens. Do not squander it.'],
  trap: ['You walked into that with impressive confidence.', 'The floor warned you. I admire the commitment.'],
  retreat: ['A strategic retreat. A noble word for jogging away.', 'I approve. Mostly because I am not carrying you.'],
  merchant: ['Bought everything? The pantry is now a memorial.', 'That merchant smiled like you were the Quest.'],
  rescue: ['Another prisoner rescued. My union is impressed.', 'You cut the ropes. I will take credit in small font.'],
};
const TOWN_NPC_LINES = [
  'The dungeon gets louder every year. I sell maps now. Mostly.',
  'If you find a key, keep it. Nobody remembers finders around here.',
  'The Inn heals free. The Store does not. Priorities.',
  'Bridge is sturdy. River is not. Do not test either.',
  'That little dragon following you is new. I would not ask.',
  'Depth fifty has a throne. I hear the skeletons gossip there.',
  'Prices rise deeper down. Shocking, I know.',
  'I waved at a hero once. They ran into a wall.',
];

const THEMED_FLOORS = { 3: { name: 'Cook', sprite: 'orc', kind: 'kitchen', prop: 'cookingPot' },
  7: { name: 'Bartender', sprite: 'skeleton', kind: 'pub', prop: 'barCounter' } };
const BIOMES = {
  crypt: { prop: 'tombstone', hazards: ['spikes', 'flame', 'rocks'], monsters: ['Skeleton', 'Mage'] },
  cavern: { prop: 'crystal', hazards: ['rocks', 'flame', 'spikes'], monsters: ['Bat', 'Orc'] },
  kitchen: { prop: 'cookingPot', hazards: ['flame', 'spikes', 'rocks'], monsters: ['Orc', 'Wasp'] },
  tavern: { prop: 'barCounter', hazards: ['flame', 'rocks', 'spikes'], monsters: ['Goblin', 'Healer'] },
  throne: { prop: 'banner', hazards: ['flame', 'spikes', 'rocks'], monsters: ['Skeleton', 'Mage', 'Healer'] },
};
const BOSSES = {
  5: { name: 'Mimic', sprite: 'mimic', hp: 80, atk: 18, def: 4, xp: 120, gold: 80 },
  10: { name: 'Hydra', sprite: 'hydra', hp: 110, atk: 20, def: 5, xp: 150, gold: 100 },
  20: { name: 'Wild Boar', sprite: 'boar', hp: 130, atk: 22, def: 6, xp: 170, gold: 115 },
  30: { name: 'Medusa', sprite: 'medusa', hp: 115, atk: 21, def: 5, xp: 175, gold: 120, magic: true, magicType: 'attack', magicRange: 4 },
  40: { name: 'Dark Wizard', sprite: 'darkWizard', hp: 120, atk: 23, def: 5, xp: 185, gold: 130, magic: true, magicType: 'attack', magicRange: 5 },
  50: { name: 'Skeleton King', sprite: 'skeletonKing', hp: 150, atk: 24, def: 7, xp: 210, gold: 150, reward: { xp: 1.2, gold: 1.2 }, throne: true, ranged: true, range: 6, projectile: 'bone', summons: true },
  60: { name: 'Hydra', sprite: 'hydra', hp: 115, atk: 21, def: 6, xp: 195, gold: 140 },
  70: { name: 'Wild Boar', sprite: 'boar', hp: 140, atk: 23, def: 7, xp: 210, gold: 150 },
  80: { name: 'Medusa', sprite: 'medusa', hp: 125, atk: 22, def: 6, xp: 220, gold: 160, magic: true, magicType: 'attack', magicRange: 4 },
  90: { name: 'Dark Wizard', sprite: 'darkWizard', hp: 130, atk: 25, def: 6, xp: 230, gold: 170, magic: true, magicType: 'attack', magicRange: 5 },
  100: { name: 'Dragon', sprite: 'dragon', hp: 160, atk: 26, def: 6, xp: 250, gold: 200, dragon: true },
};
const GAME_VERSION = '0.20.0';
// Brief quotations from Monty Python and the Holy Grail; official sources in README.
const MONSTER_QUOTES = ['Ni!', 'None shall pass!', "'Tis but a scratch.", 'Run away!'];
const MONSTER_SPEECH_DURATION = 5, MONSTER_SPEECH_INTERVAL = 5;
const COMPANION_FOG_RADIUS = 2, CAT_COMPANION_SCALE = 1.5, CAT_BAT_BONUS = 1;
const ENDING_DURATION = 14;
const MIMIC_DEFEAT_DURATION = 1.6, DRAGON_DEFEAT_DURATION = 2.6, BOSS_INTRO_DURATION = 1.6;
const BOSS_ANIMATIONS = {
  mimic: { accent: '#d7a94b', intro: 1.5, defeat: 1.6, phases: [[0.4, 'snap'], [0.9, 'coins']], motif: 'jaws' },
  hydra: { accent: '#6fbf73', intro: 1.6, defeat: 2, phases: [[0.5, 'heads'], [1.1, 'regrow'], [1.6, 'collapse']], motif: 'heads' },
  boar: { accent: '#d98b5f', intro: 1.5, defeat: 1.8, phases: [[0.4, 'charge'], [1, 'tumble'], [1.4, 'dust']], motif: 'tusks' },
  medusa: { accent: '#a5d6c4', intro: 1.7, defeat: 2, phases: [[0.45, 'gaze'], [1, 'petrify'], [1.5, 'shatter']], motif: 'snakes' },
  wizard: { accent: '#a99bff', intro: 1.7, defeat: 2, phases: [[0.45, 'cast'], [1, 'burst'], [1.5, 'banish']], motif: 'runes' },
  skeletonKing: { accent: '#e4d9b8', intro: 1.6, defeat: 2, phases: [[0.45, 'summon'], [1, 'crown'], [1.5, 'fall']], motif: 'crown' },
  cook: { accent: '#f0b46b', intro: 1.5, defeat: 1.8, phases: [[0.4, 'sizzle'], [0.9, 'scraps'], [1.4, 'collapse']], motif: 'pans' },
  bartender: { accent: '#f2d08a', intro: 1.5, defeat: 1.8, phases: [[0.4, 'pour'], [0.9, 'mugs'], [1.4, 'collapse']], motif: 'mugs' },
  dragon: { accent: '#ff8a54', intro: 1.8, defeat: DRAGON_DEFEAT_DURATION, phases: [[0.9, 'roar'], [1.8, 'fall']], motif: 'wings' },
};
const GOLD_PER_LEVEL = 3;
function spawnPool(depth, biome) {
  const pool = MONSTER_TYPES.filter(t => depth >= (t.minDepth || 1));
  const favored = BIOMES[biome] && BIOMES[biome].monsters;
  return favored ? pool.flatMap(t => favored.includes(t.name) ? [t, t] : [t]) : pool;
}

function biomeForDepth(depth) {
  if (depth === FINAL_DEPTH) return 'throne';
  const themed = THEMED_FLOORS[depth];
  if (themed) return themed.kind === 'pub' ? 'tavern' : 'kitchen';
  return ['crypt', 'cavern', 'kitchen', 'tavern'][(depth - 1) % 4];
}

function bossForDepth(depth) {
  const base = BOSSES[depth];
  if (!base) return null;
  const tier = Math.ceil(depth / 10);
  const hpScale = 1 + (depth - 1) * 0.12;
  const atkScale = 1 + (depth - 1) * 0.16;
  const rewardScale = 1 + (depth - 1) * 0.25;
  return {
    name: base.name, sprite: base.sprite, minDepth: depth,
    hp: Math.round(base.hp * hpScale), atk: Math.round(base.atk * atkScale),
    def: base.def + (tier - 1) * 2,
    xp: Math.round(base.xp * rewardScale * (base.reward && base.reward.xp || 1)),
    gold: Math.round(base.gold * rewardScale * (base.reward && base.reward.gold || 1)),
    magic: !!base.magic, magicType: base.magicType, magicRange: base.magicRange,
    ranged: !!base.ranged, range: base.range, projectile: base.projectile,
    throne: !!base.throne, summons: !!base.summons, dragon: !!base.dragon,
  };
}

function bossGateAt(depth) {
  return depth === 5 || !!BOSSES[depth];
}

function bossDepthList() {
  return Object.keys(BOSSES).map(Number).sort((a, b) => a - b);
}

function bossKind(m) {
  if (!m) return 'mimic';
  if (m.isDragon || m.dragon) return 'dragon';
  if (m.isThemed) return m.themedType === 'pub' ? 'bartender' : 'cook';
  const name = String(m.name || '').toLowerCase();
  if (name.includes('mimic')) return 'mimic';
  if (name.includes('hydra')) return 'hydra';
  if (name.includes('boar')) return 'boar';
  if (name.includes('medusa')) return 'medusa';
  if (name.includes('wizard')) return 'wizard';
  if (name.includes('skeleton king')) return 'skeletonKing';
  return 'mimic';
}

function bossAnimation(m) {
  return BOSS_ANIMATIONS[bossKind(m)] || BOSS_ANIMATIONS.mimic;
}

function lootPool(depth) {
  return ITEM_TABLE.filter(it => depth >= (it.minDepth || 1))
    .flatMap(it => Array(it.lootWeight || 4).fill(it));
}

function learnSpell(spellName) {
  const spell = SPELLS[spellName];
  if (!spell) return false;
  if (state.player.spells[spellName]) return false;
  state.player.spells[spellName] = true;
  state.spellReadyAt[spellName] = state.activeTime;
  log(`You learned ${spell.name}! Press ${spell.key} to cast it.`);
  return true;
}

function snapshotPlayerStats() {
  return Object.fromEntries(GOD_STAT_FIELDS.map(field => [field, state.player[field]]));
}

function freezePlayerStats() {
  if (!state.godMode || !state.godModeStats) return;
  for (const field of GOD_STAT_FIELDS) state.player[field] = state.godModeStats[field];
}

function freshEntranceCatState() {
  return { recruited: false, entered: false, retired: false };
}

function entranceCatActor() {
  return state.town && (state.town.animals || []).find(actor => actor.isEntranceCat) || null;
}

function joinEntranceCat(auto) {
  if (!state.entranceCat || state.entranceCat.recruited || state.entranceCat.retired || state.companion) return false;
  const cat = entranceCatActor();
  state.companion = { name: 'Marmalade', sprite: 'catCompanion', kind: 'cat', scale: CAT_COMPANION_SCALE, damage: 1, batBonus: CAT_BAT_BONUS,
    x: cat ? cat.x : state.player.x, y: cat ? cat.y : state.player.y };
  if (cat) cat.hidden = true;
  state.entranceCat.recruited = true;
  state.companionSpeech = null;
  state.companionSpeechReadyAt = state.activeTime;
  state.companionAttackAt = state.activeTime + 3;
  placeCompanionNearPlayer();
  log(auto ? 'Marmalade hops in before you can leave. "Someone has to buy the meat."' : 'Marmalade agrees to join you. "The wife and children are counting on this."');
  return true;
}

function talkToEntranceCat() {
  if (!joinEntranceCat(false)) return false;
  state.companionSpeechReadyAt = 0;
  companionTalk('intro');
  render();
  return true;
}

function companionTileOpen(x, y) {
  if (!state.map || !state.map[y] || state.map[y][x] !== 0) return false;
  if (x === state.player.x && y === state.player.y) return false;
  return !monsterAt(x, y);
}

function placeCompanionNearPlayer(dx = 0, dy = 0) {
  const companion = state.companion;
  if (!companion || !state.map) return;
  if (!Number.isInteger(companion.x) || !Number.isInteger(companion.y)) {
    companion.x = state.player.x; companion.y = state.player.y;
    delete state.motion.moves[actorMotionKey(companion)];
  }
  if (Math.max(Math.abs(companion.x - state.player.x), Math.abs(companion.y - state.player.y)) <= 1 && companionTileOpen(companion.x, companion.y)) return;
  const p = state.player;
  const facing = state.motion.facing.player || 1;
  const candidates = [];
  if (dx || dy) candidates.push({ x: p.x - dx, y: p.y - dy });
  candidates.push({ x: p.x - facing, y: p.y }, { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 }, { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y });
  for (const tile of candidates) {
    if (!companionTileOpen(tile.x, tile.y)) continue;
    moveActorTo(companion, tile.x, tile.y);
    return;
  }
}

function adoptBossCompanion(m) {
  state.companion = { name: m.name, sprite: m.isDragon ? 'dragonBoss' : m.sprite || bossKind(m), kind: 'boss', x: state.player.x, y: state.player.y };
  state.companionSpeech = null;
  state.companionSpeechReadyAt = state.activeTime;
  state.companionAttackAt = state.activeTime + 3;
  placeCompanionNearPlayer();
  log(`${m.name} agrees to join you as a tiny, reluctant companion.`);
}

function companionTalk(kind) {
  if (!state.companion || state.gameOver || state.activeTime < state.companionSpeechReadyAt) return;
  const pool = state.companion.kind === 'cat' ? (CAT_LINES[kind] || COMPANION_LINES[kind]) : COMPANION_LINES[kind];
  if (!pool || !pool.length) return;
  const text = pool[state.companionQuoteIndex % pool.length];
  state.companionQuoteIndex++;
  state.companionSpeech = { text, expiresAt: state.activeTime + 5 };
  state.companionSpeechReadyAt = state.activeTime + 7;
  log(`${state.companion.name}: “${text}”`);
}

function companionTick() {
  if (state.area === 'town') return;
  const companion = state.companion;
  if (!companion || state.gameOver) return;
  if (state.companionSpeech && state.activeTime >= state.companionSpeech.expiresAt) state.companionSpeech = null;
  if (state.activeTime < state.companionAttackAt) return;
  state.companionAttackAt = state.activeTime + 3;
  const targets = visibleTargets(3, companion);
  if (!targets.length) return;
  const target = companion.kind === 'cat' ? (targets.find(m => m.sprite === 'bat') || targets[0]) : targets[0];
  if (companion.kind === 'cat' && target.sprite === 'bat') companionTalk('bat');
  spawnProjectile('bolt', companion, target, 0.25);
  const damage = companion.kind === 'cat' && target.sprite === 'bat' ? 1 + (companion.batBonus || 0) : 1;
  damageMonster(target, damage);
}

function drawCompanion() {
  const companion = state.companion;
  if (!companion || state.gameOver || !Number.isInteger(companion.x) || !Number.isInteger(companion.y)) return;
  if (!inRenderCamera(companion.x, companion.y) || fogLevel(companion.x, companion.y) >= 3) return;
  const position = actorRenderPosition(companion);
  const cx = position.x * TILE + TILE / 2, cy = position.y * TILE + TILE / 2;
  const scale = companion.scale || 0.55;
  drawActorSprite(companion.sprite, cx, cy, scale, companion);
  if (!state.companionSpeech) return;
  const text = state.companionSpeech.text;
  ctx.font = '10px monospace';
  const width = ctx.measureText(text).width + 10;
  const x = cx - width / 2, y = cy - Math.round(18 + 16 * scale);
  ctx.fillStyle = '#f4e7c8';
  ctx.beginPath(); ctx.roundRect(x, y, width, 15, 4); ctx.fill();
  ctx.fillStyle = '#2b241d';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + 8);
}

const FINAL_DEPTH = 100, MAX_LEVEL = 100, ENEMY_ATTACK_INTERVAL = 0.8, RETREAT_COOLDOWN = 60;
const HEAL_FRACTION = 0.02;
const GOD_STAT_FIELDS = ['hp', 'maxHp', 'mp', 'maxMp', 'str', 'dex', 'def', 'lvl', 'xp', 'xpNext'];
const FLOOR_FIELDS = ['map', 'rooms', 'potions', 'stairs', 'upstairs', 'treasures', 'merchant', 'prisoner',
  'princess', 'visited', 'monsterSpawns', 'bossDefeated', 'floorKey', 'obstacles', 'hazards', 'hazardTime', 'biome', 'props'];

let state;

function newGame() {
  stopMotionAnimation();
  stopEndingAnimation();
  stopBossIntroAnimation();
  stopBossDefeatAnimation();
  const started = state ? state.started : false;
  const art = state ? state.art : null;
  const audio = state ? state.audio : { context: null, master: null, musicBus: null, effectsBus: null, musicVolume: 0.45, effectsVolume: 0.8, enabled: true, step: 0, nextNote: 0 };
  document.getElementById('overlay').style.display = 'none';
  state = {
    depth: 1, area: 'dungeon', town: null, townExit: null, townPortalOpen: false, inn: null, townGate: null, kills: 0, turn: 0, started, messages: [], helpOpen: false, helpFocus: null,
    consoleOpen: false, consoleLines: [], consoleHistory: [], consoleHistoryIndex: 0, godMode: false, godModeStats: null,
    player: { x: 0, y: 0, hp: 60, maxHp: 60, mp: 20, maxMp: 20, str: 12, dex: 10, def: 3, lvl: 1, xp: 0, xpNext: 40, spells: { fireball: true, heal: true } },
    spellReadyAt: { fireball: 0, heal: 0, frostbolt: 0, greaterHeal: 0, magicBarrier: 0 },
    inventory: [], townScrolls: 0,
    gold: 0, equipment: { weapon: null, armor: null, ring: null },
    map: null, rooms: [], monsters: [], potions: [], stairs: null, biome: 'crypt', props: [],
    treasures: [], merchant: null, boss: null, prisoner: null, princess: null,
    monsterSpeech: null, monsterSpeechReadyAt: 0, monsterQuoteIndex: 0,
    companion: null, companionSpeech: null, companionSpeechReadyAt: 0, companionQuoteIndex: 0, companionAttackAt: 0,
    entranceCat: freshEntranceCatState(),
    gameOver: false, won: false, ending: null, bossIntro: null, bossIntroSeen: false, bossDefeat: null, bubble: null, visited: new Set(), floors: {},
    upstairs: null, monsterSpawns: [], pause: null, warnedLow: false, warnedCritical: false,
    combatElapsed: 0, healElapsed: 0, activeTime: 0, manaRegenAt: 0, retreatReadyAt: 0, bossDefeated: false, bossSummonAt: 0,
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
  genTown();
  revealAroundPlayer();
  log('You arrive in the village. Rest at the Inn, visit the Store, or enter the dungeon.');
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
  state.biome = biomeForDepth(state.depth);
  const map = [];
  for (let y = 0; y < H; y++) map.push(new Array(W).fill(1)); // 1 = wall
  const rooms = [{ x: 2, y: 2, w: 8, h: 6, cx: 6, cy: 5 }];
  for (let y = 2; y < 8; y++) for (let x = 2; x < 10; x++) map[y][x] = 0;
  const bossData = bossForDepth(state.depth);
  const isBossLevel = !!bossData || !!THEMED_FLOORS[state.depth];
  if (isBossLevel) {
    const w = state.depth === FINAL_DEPTH ? 22 : state.depth === 50 ? 24 : 18;
    const h = state.depth === FINAL_DEPTH ? 18 : state.depth === 50 ? 18 : 14;
    const x = W - w - 3, y = H - h - 3;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), isArena: true, isThroneRoom: state.depth === 50 });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) map[yy][xx] = 0;
  }
  for (let i = 0; i < 900 && rooms.length < 32; i++) {
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
  const count = Math.min(40, 6 + state.depth * 3);
  const usedSpawns = new Set([`${p.x},${p.y}`]);
  for (let i = 0; i < count; i++) {
    const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
    const tx = room.x + Math.floor(Math.random() * room.w);
    const ty = room.y + Math.floor(Math.random() * room.h);
    if (tx === p.x && ty === p.y || usedSpawns.has(`${tx},${ty}`)) continue;
    if (room.isArena && Math.max(Math.abs(tx - room.cx), Math.abs(ty - room.cy)) <= 3) continue;
    usedSpawns.add(`${tx},${ty}`);
    const pool = spawnPool(state.depth, state.biome);
    const t = pool[Math.min(pool.length - 1, Math.floor(Math.random() * (2 + state.depth)))];
    const scale = 1 + (state.depth - 1) * 0.35;
    const attackScale = t.ranged || t.magic ? 0.1 : 0.15;
    state.monsters.push({
      ...t,
      x: tx, y: ty,
      maxHp: Math.round(t.hp * (1 + (state.depth - 1) * 0.2)), hp: Math.round(t.hp * (1 + (state.depth - 1) * 0.2)),
      atk: Math.round(t.atk * (1 + (state.depth - 1) * attackScale)), def: t.def + Math.floor((state.depth - 1) / 2),
      xp: Math.round(t.xp * scale),
      gold: Math.max(2, Math.round(5 * scale)),
      id: i,
    });
  }

  state.potions = [];
  const potions = 3 + Math.floor(state.depth / 3) + Math.floor(Math.random() * 2);
  for (let i = 0; i < potions; i++) {
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const px = room.x + Math.floor(Math.random() * room.w);
    const py = room.y + Math.floor(Math.random() * room.h);
    if (px === p.x && py === p.y) continue;
    state.potions.push({ x: px, y: py, heal: 0.25 + Math.random() * 0.35 });
  }

  state.treasures = [];
  const treasureCount = 3 + Math.floor(state.depth / 4) + Math.floor(Math.random() * 2);
  for (let i = 0; i < treasureCount; i++) {
    const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
    const px = room.x + Math.floor(Math.random() * room.w);
    const py = room.y + Math.floor(Math.random() * room.h);
    if (px === p.x && py === p.y) continue;
    const pool = lootPool(state.depth);
    const it = pool[Math.floor(Math.random() * pool.length)];
    state.treasures.push({ x: px, y: py, ...it, id: i });
  }

  const themed = THEMED_FLOORS[state.depth];
  state.merchant = null;
  state.boss = null;
  state.prisoner = null;
  state.princess = null;

  if (themed && !bossData) {
    const room = rooms[rooms.length - 1];
    const scale = 1 + (state.depth - 1) * 0.35;
    state.boss = {
      name: themed.name, sprite: themed.sprite,
      x: room.cx, y: room.cy,
      maxHp: Math.round(100 * (1 + (state.depth - 1) * 0.2)), hp: Math.round(100 * (1 + (state.depth - 1) * 0.2)),
      atk: Math.round(20 * (1 + (state.depth - 1) * 0.15)), def: 6 + Math.floor(state.depth / 5),
      xp: Math.round(150 * scale), gold: Math.round(100 * scale),
      id: 999, isBoss: true, isThemed: true, themedType: themed.kind,
      ranged: themed.kind === 'pub', range: themed.kind === 'pub' ? 4 : 0, projectile: 'beer',
    };
    state.monsters.push(state.boss);
  } else if (bossData) {
    const room = rooms[rooms.length - 1];
    state.boss = { ...bossData, x: room.cx, y: room.cy, maxHp: bossData.hp, hp: bossData.hp,
      id: 999, isBoss: true, isDragon: bossData.dragon, isThroneBoss: !!bossData.throne };
    state.monsters.push(state.boss);
    if (bossData.dragon) {
      state.princess = { x: room.x + (room.w >> 1), y: room.y + (room.h - 1), rescued: false, isPrincess: true };
      if (state.princess.y === state.boss.y) state.princess.y = room.y;
      if (state.princess.x === state.boss.x && state.princess.y === state.boss.y) state.princess.x = room.x;
    }
  } else {
    if (state.depth >= 2 && state.depth % 2 === 0) {
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
  state.props = [];
  generateThroneRoom();
  generateProps();
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

function townStoreStock() {
  return [ITEM_TABLE[0], ITEM_TABLE[1], ITEM_TABLE[3], ITEM_TABLE[5], ITEM_TABLE[8], ITEM_TABLE[11]]
    .map((item, index) => ({ ...item, id: 200 + index }));
}

function genTown() {
  const map = [];
  for (let y = 0; y < H; y++) map.push(new Array(W).fill(1));
  for (let y = 16; y <= 44; y++) for (let x = 20; x <= 60; x++) map[y][x] = 0;
  for (let y = 28; y <= 30; y++) for (let x = 22; x <= 58; x++) map[y][x] = 0;
  for (let y = 18; y <= 42; y++) for (let x = 37; x <= 40; x++) map[y][x] = 0;
  const props = [];
  for (let y = 16; y <= 44; y++) {
    for (const x of [48, 49]) {
      map[y][x] = 1;
      if (y !== 29) props.push({ x, y, sprite: 'water', scale: 1.6 });
    }
  }
  for (let x = 48; x <= 49; x++) map[29][x] = 0;
  props.push({ x: 48, y: 29, sprite: 'bridge', scale: 2 });
  const trees = [[22, 18], [24, 18], [26, 18], [33, 18], [35, 18], [53, 18], [55, 18], [57, 18],
    [22, 20], [22, 23], [22, 26], [22, 33], [22, 36], [22, 39], [24, 42], [27, 42], [30, 42], [33, 42],
    [36, 42], [43, 42], [46, 42], [51, 42], [54, 42], [57, 42], [59, 20], [59, 23], [59, 26], [59, 33],
    [59, 36], [59, 39], [43, 18], [46, 18], [51, 18]];
  for (const [x, y] of trees) {
    map[y][x] = 1;
    props.push({ x, y, sprite: 'tree', scale: 2 });
  }
  const buildings = [
    { x1: 26, y1: 20, x2: 31, y2: 24, sprite: 'inn', door: { x: 29, y: 25 } },
    { x1: 43, y1: 20, x2: 47, y2: 24, sprite: 'store', door: { x: 45, y: 25 } },
    { x1: 23, y1: 33, x2: 26, y2: 36, sprite: 'hut', door: { x: 24, y: 37 } },
    { x1: 32, y1: 34, x2: 35, y2: 37, sprite: 'hut', door: { x: 33, y: 38 } },
    { x1: 42, y1: 33, x2: 45, y2: 36, sprite: 'hut', door: { x: 43, y: 37 } },
    { x1: 52, y1: 33, x2: 55, y2: 36, sprite: 'hut', door: { x: 53, y: 37 } },
  ];
  for (const b of buildings) {
    for (let y = b.y1; y <= b.y2; y++) for (let x = b.x1; x <= b.x2; x++) map[y][x] = 1;
    map[b.door.y][b.door.x] = 0;
    const scale = b.sprite === 'hut' ? 2 : 3;
    const cy = b.sprite === 'hut' ? b.y1 + 2 : b.y1 + 3;
    props.push({ x: b.x1 + 2, y: cy, sprite: b.sprite, scale });
    props.push({ x: b.door.x, y: b.door.y, sprite: 'doorstep', scale: 1 });
  }
  const spawn = { x: 38, y: 26 };
  const inn = { ...buildings[0].door, sprite: 'inn' };
  const store = { ...buildings[1].door, sprite: 'store', isMerchant: true, stock: townStoreStock() };
  const gate = { x: 55, y: 29, sprite: 'townGate' };
  props.push({ x: 56, y: 29, sprite: 'townGate', scale: 2 });
  const npcs = [
    { name: 'Mira', sprite: 'villager', x: 34, y: 28, pathIndex: 0, step: 5, path: [{ x: 34, y: 28 }, { x: 35, y: 28 }, { x: 34, y: 27 }] },
    { name: 'Bran', sprite: 'villager', x: 41, y: 30, pathIndex: 0, step: 7, path: [{ x: 41, y: 30 }, { x: 40, y: 31 }, { x: 41, y: 32 }] },
    { name: 'Eda', sprite: 'villager', x: 36, y: 39, pathIndex: 0, step: 6, path: [{ x: 36, y: 39 }, { x: 36, y: 38 }, { x: 36, y: 37 }] },
    { name: 'Tobin', sprite: 'villager', x: 52, y: 31, pathIndex: 0, step: 8, path: [{ x: 52, y: 31 }, { x: 53, y: 31 }, { x: 52, y: 32 }] },
  ];
  const animals = [
    { name: 'Mochi', sprite: 'cat', x: 31, y: 31, pathIndex: 0, step: 3, path: [{ x: 31, y: 31 }, { x: 32, y: 31 }, { x: 31, y: 32 }] },
    { name: 'Pip', sprite: 'dog', x: 41, y: 33, pathIndex: 0, step: 4, path: [{ x: 41, y: 33 }, { x: 41, y: 34 }, { x: 42, y: 32 }] },
    { name: 'Hen', sprite: 'chicken', x: 27, y: 27, pathIndex: 0, step: 2, path: [{ x: 27, y: 27 }, { x: 28, y: 27 }, { x: 27, y: 26 }] },
    { name: 'Cluck', sprite: 'chicken', x: 46, y: 32, pathIndex: 0, step: 3, path: [{ x: 46, y: 32 }, { x: 47, y: 32 }, { x: 46, y: 33 }] },
    { name: 'Dot', sprite: 'chicken', x: 54, y: 28, pathIndex: 0, step: 4, path: [{ x: 54, y: 28 }, { x: 55, y: 28 }, { x: 54, y: 27 }] },
    { name: 'Marmalade', sprite: 'catCompanion', x: 53, y: 30, scale: CAT_COMPANION_SCALE, isEntranceCat: true },
  ];
  const gateCat = animals.find(actor => actor.isEntranceCat);
  if (map[gateCat.y][gateCat.x] !== 0) {
    for (const tile of [{ x: 53, y: 30 }, { x: 54, y: 30 }, { x: 53, y: 31 }, { x: 52, y: 30 }]) {
      if (map[tile.y][tile.x] === 0) { gateCat.x = tile.x; gateCat.y = tile.y; break; }
    }
  }
  state.area = 'town';
  state.biome = 'town';
  state.map = map;
  state.rooms = [];
  state.props = props;
  state.visited = new Set();
  state.merchant = store;
  state.inn = inn;
  state.townGate = gate;
  state.town = {
    map, visited: state.visited, props, npcs, animals, spawn, store,
    landmarks: { inn, store, gate }, tick: 0, quoteIndex: 0, nextTalkAt: 0, speech: null,
  };
  state.monsters = [];
  state.monsterSpawns = [];
  state.boss = null;
  state.prisoner = null;
  state.princess = null;
  state.potions = [];
  state.treasures = [];
  state.hazards = [];
  state.obstacles = [];
  state.hazardTime = 0;
  state.floorKey = null;
  state.stairs = null;
  state.upstairs = null;
  state.bossDefeated = false;
  state.bubble = null;
  state.monsterSpeech = null;
  state.companionSpeech = null;
  state.player.x = spawn.x;
  state.player.y = spawn.y;
  updateCamera();
  revealAroundPlayer();
}

function saveTown() {
  if (!state.town || state.area !== 'town') return;
  state.town.map = state.map;
  state.town.visited = state.visited;
  state.town.props = state.props;
  state.town.store = state.merchant || state.town.store;
}

function enterTown() {
  if (state.area === 'town' || !state.town) return;
  saveFloor();
  clearBossIntro();
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  state.area = 'town';
  state.biome = 'town';
  state.map = state.town.map;
  state.rooms = [];
  state.props = state.town.props;
  state.visited = state.town.visited;
  state.merchant = state.town.store;
  state.inn = state.town.landmarks.inn;
  state.townGate = state.town.landmarks.gate;
  state.monsters = [];
  state.monsterSpawns = [];
  state.boss = null;
  state.prisoner = null;
  state.princess = null;
  state.potions = [];
  state.treasures = [];
  state.hazards = [];
  state.obstacles = [];
  state.hazardTime = 0;
  state.floorKey = null;
  state.stairs = null;
  state.upstairs = null;
  state.bossDefeated = false;
  state.bubble = null;
  state.monsterSpeech = null;
  state.companionSpeech = null;
  state.player.x = state.town.spawn.x;
  state.player.y = state.town.spawn.y;
  updateCamera();
  placeCompanionNearPlayer();
  revealAroundPlayer();
  playSound('stairs');
  render();
}

function clearTownReturn() {
  state.townExit = null;
  state.townPortalOpen = false;
}

function safeTownExitTile(exit) {
  const floor = exit && state.floors[exit.depth];
  if (!floor || !floor.map) return null;
  const occupied = [floor.merchant, floor.prisoner, floor.princess, ...(floor.hazards || [])].filter(Boolean);
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && floor.map[y] && floor.map[y][x] === 0
    && !occupied.some(actor => actor.x === x && actor.y === y);
  if (open(exit.x, exit.y)) return { x: exit.x, y: exit.y };
  const seen = new Set([`${exit.x},${exit.y}`]);
  const queue = [{ x: exit.x, y: exit.y }];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of directions) {
      const x = current.x + dx, y = current.y + dy, key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (open(x, y)) return { x, y };
      if (x >= 0 && y >= 0 && x < W && y < H) queue.push({ x, y });
    }
  }
  if (floor.upstairs && open(floor.upstairs.x, floor.upstairs.y)) return { x: floor.upstairs.x, y: floor.upstairs.y };
  return null;
}

function enterDungeonFromTown(depth = state.depth, arrival = null) {
  if (state.area !== 'town') return;
  if (arrival === null && state.townExit) {
    const exit = state.townExit;
    const tile = safeTownExitTile(exit);
    if (tile) {
      enterFloor(exit.depth, false, false, tile);
      clearTownReturn();
      log(exit.reason === 'scroll' ? 'You step back through the town portal.' : `You return to depth ${exit.depth} where you retreated.`);
      return;
    }
    clearTownReturn();
  }
  enterFloor(depth, false, false, arrival);
  log('You descend into the dungeon.');
}

function returnThroughTownPortal() {
  if (state.area !== 'town' || !state.townPortalOpen || !state.townExit) return false;
  playSound('magic');
  enterDungeonFromTown();
  return true;
}

function useTownScroll() {
  if (state.gameOver || state.helpOpen || state.consoleOpen || state.pause || state.ending || bossCinematicActive()) return;
  if (state.area === 'town') {
    if (!returnThroughTownPortal()) { log('No town portal is open.'); render(); }
    return;
  }
  if (state.townPortalOpen) {
    log('A town portal is already open. Use it at the gate first.');
    render(); return;
  }
  if (!state.townScrolls) {
    log('No Town Scroll stored. Buy one at the town Store or find one in loot.');
    render(); return;
  }
  state.townScrolls--;
  state.townExit = { depth: state.depth, x: state.player.x, y: state.player.y, reason: 'scroll' };
  state.townPortalOpen = true;
  playSound('magic');
  log('The Town Scroll opens a return portal at the town gate.');
  enterTown();
  render();
}

function townTick() {
  if (!state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.pause || document.hidden) return false;
  const town = state.town;
  if (!town) return false;
  town.tick++;
  let changed = false;
  if (town.speech && town.tick >= town.speech.expiresAt) { town.speech = null; changed = true; }
  if (state.bubble && state.bubble.ttl > 0) { state.bubble.ttl--; changed = true; }
  for (const actor of [...town.npcs, ...(town.animals || [])]) {
    if (actor.hidden) continue;
    if (!actor.path || actor.path.length < 2 || town.tick % actor.step !== 0) continue;
    actor.pathIndex = (actor.pathIndex + 1) % actor.path.length;
    const tile = actor.path[actor.pathIndex];
    if (!state.map[tile.y] || state.map[tile.y][tile.x] !== 0) continue;
    if (tile.x === state.player.x && tile.y === state.player.y) continue;
    actor.x = tile.x; actor.y = tile.y; changed = true;
  }
  return changed;
}

function nearbyTile(x, y, target) {
  return !!target && Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) <= 1;
}

function townEncounter() {
  const town = state.town;
  if (!town || town.tick < town.nextTalkAt) return;
  const npc = town.npcs.find(n => nearbyTile(state.player.x, state.player.y, n));
  if (!npc) return;
  townNpcTalk(npc);
  town.nextTalkAt = town.tick + 8;
}

function townNpcTalk(npc) {
  const town = state.town;
  if (!town || !npc) return;
  const line = TOWN_NPC_LINES[town.quoteIndex % TOWN_NPC_LINES.length];
  town.quoteIndex++;
  town.speech = { name: npc.name, text: line, expiresAt: town.tick + 6 };
  log(`${npc.name}: "${line}"`);
}

function townInteract() {
  if (state.area !== 'town') return false;
  const p = state.player;
  const cat = entranceCatActor();
  if (cat && !cat.hidden && state.entranceCat && !state.entranceCat.recruited && nearbyTile(p.x, p.y, cat)) return talkToEntranceCat();
  if (nearbyTile(p.x, p.y, state.townGate)) {
    if (!state.townPortalOpen || !returnThroughTownPortal()) enterDungeonFromTown();
    return true;
  }
  if (nearbyTile(p.x, p.y, state.inn)) {
    restAtInn();
    return true;
  }
  if (nearbyTile(p.x, p.y, state.merchant)) {
    buyFromMerchant();
    return true;
  }
  const npc = state.town.npcs.find(n => nearbyTile(p.x, p.y, n));
  if (npc) {
    townNpcTalk(npc);
    render();
    return true;
  }
  log('Nothing to interact with here.');
  render();
  return true;
}

function restAtInn() {
  if (state.area !== 'town') return;
  state.player.hp = state.player.maxHp;
  state.player.mp = state.player.maxMp;
  freezePlayerStats();
  state.warnedLow = false;
  state.warnedCritical = false;
  state.combatElapsed = 0;
  state.healElapsed = 0;
  state.manaRegenAt = state.activeTime + 4;
  state.companionAttackAt = state.activeTime + 3;
  state.lastTick = Date.now();
  log('The Inn restores your health and mana.');
  playSound('heal');
  render();
}

function drawBubble(text, x, y) {
  ctx.save();
  ctx.font = '11px monospace';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = '#f4f1e6';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 22, w, 18, 5); ctx.fill();
  ctx.fillStyle = '#11131c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - 13);
  ctx.restore();
}

function drawTownNpcs() {
  if (!state.town) return;
  const actors = [...state.town.npcs, ...(state.town.animals || [])].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.hidden || !inRenderCamera(actor.x, actor.y)) continue;
    const scale = actor.scale || (actor.sprite === 'villager' ? 1.5 : 0.75);
    drawActorSprite(actor.sprite, actor.x * TILE + TILE / 2, actor.y * TILE + TILE / 2, scale, actor);
  }
}

function drawTownSpeech() {
  const cat = entranceCatActor();
  if (cat && !cat.hidden && state.entranceCat && !state.entranceCat.recruited && nearbyTile(state.player.x, state.player.y, cat) && inRenderCamera(cat.x, cat.y)) {
    drawBubble('Space: talk to Marmalade', cat.x * TILE + TILE / 2, cat.y * TILE - 16);
  }
  if (state.townPortalOpen && state.townGate && inRenderCamera(state.townGate.x, state.townGate.y)) {
    drawBubble('Portal ready (J)', state.townGate.x * TILE + TILE / 2, state.townGate.y * TILE - 12);
  }
  const speech = state.town && state.town.speech;
  if (!speech) return;
  const npc = state.town.npcs.find(n => n.name === speech.name);
  if (!npc || !inRenderCamera(npc.x, npc.y)) return;
  drawBubble(speech.text, npc.x * TILE + TILE / 2, npc.y * TILE - 12);
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
    ...state.potions, ...state.treasures, ...state.props, ...state.monsters].filter(Boolean);
}

function generateProps() {
  const reserved = new Set(protectedFloorTiles().map(o => `${o.x},${o.y}`));
  const sprite = BIOMES[state.biome].prop;
  for (let i = 0; i < state.rooms.length; i++) {
    const room = state.rooms[i];
    if (room.isArena) continue;
    const count = i === 0 ? 1 : 1 + Math.floor(Math.random() * 2);
    for (let j = 0; j < count; j++) {
      const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
      const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
      const key = `${x},${y}`;
      if (state.map[y][x] !== 0 || reserved.has(key)) continue;
      state.props.push({ x, y, sprite });
      reserved.add(key);
    }
  }
}

function generateThroneRoom() {
  if (state.depth !== 50) return;
  const room = state.rooms.find(r => r.isThroneRoom);
  if (!room) return;
  const reserved = new Set(protectedFloorTiles().map(o => `${o.x},${o.y}`));
  const decor = [{ x: room.cx, y: room.y + 2, sprite: 'throne' }];
  for (const x of [room.x + 2, room.x + room.w - 3]) {
    for (const y of [room.y + 3, room.y + 8, room.y + room.h - 4]) decor.push({ x, y, sprite: 'torch' });
  }
  for (const y of [room.y + 4, room.cy + 4]) {
    decor.push({ x: room.x + 4, y, sprite: 'banner' });
    decor.push({ x: room.x + room.w - 5, y, sprite: 'banner' });
  }
  for (const [dx, dy] of [[-6, -2], [6, 2], [-6, 3], [6, -3]]) {
    decor.push({ x: room.cx + dx, y: room.cy + dy, sprite: 'tombstone' });
  }
  for (const prop of decor) {
    const key = `${prop.x},${prop.y}`;
    if (state.map[prop.y] && state.map[prop.y][prop.x] === 0 && !reserved.has(key)) {
      state.props.push(prop);
      reserved.add(key);
    }
  }
}

function generateObstacles() {
  const reserved = new Set(protectedFloorTiles().map(o => `${o.x},${o.y}`));
  let floorCount = state.map.reduce((sum, row) => sum + row.filter(t => t === 0).length, 0);
  for (let attempt = 0; attempt < 320 && state.obstacles.length < 14 + Math.floor(state.depth / 2); attempt++) {
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
  const count = 24 + state.depth;
  for (let i = 0; i < count && candidates.length; i++) {
    const tile = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    const type = BIOMES[state.biome].hazards[i % 3];
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
  return { time: 0, moves: {}, facing: {}, camera: null, projectiles: [], frameId: null, lastTimestamp: null, lastPaint: null };
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
  if (actor === state.player) return 'player';
  if (actor === state.companion) return 'companion';
  return `monster:${actor.id}`;
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
  return state.started && !state.gameOver && !state.helpOpen && !state.consoleOpen && !state.pause && !document.hidden && !bossCinematicActive();
}

function actorIsMoving(actor) {
  const move = state.motion.moves[actorMotionKey(actor)];
  return !!(move && move.x === actor.x && move.y === actor.y && motionProgress(move) < 1 && typeof window.requestAnimationFrame === 'function');
}

function projectileVisible(projectile) {
  const fromTile = { x: Math.floor(projectile.fromX / TILE), y: Math.floor(projectile.fromY / TILE) };
  const toTile = { x: Math.floor(projectile.toX / TILE), y: Math.floor(projectile.toY / TILE) };
  return inRenderCamera(fromTile.x, fromTile.y) || inRenderCamera(toTile.x, toTile.y);
}

function motionNeeded() {
  if (state.motion.projectiles.some(projectileVisible)) return true;
  if (actorIsMoving(state.player)) return true;
  const companion = state.companion;
  if (companion && Number.isInteger(companion.x) && Number.isInteger(companion.y) && inRenderCamera(companion.x, companion.y) && fogLevel(companion.x, companion.y) < 3 &&
    (actorIsMoving(companion) || ['bat', 'wasp', 'dragonBoss'].includes(companion.sprite))) return true;
  if (state.monsters.some(m => m.hp > 0 &&
    inRenderCamera(m.x, m.y) && fogLevel(m.x, m.y) < 3 &&
    (actorIsMoving(m) || ['bat', 'wasp', 'mage', 'healer'].includes(m.sprite) || m.isDragon))) return true;
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
  for (const projectile of state.motion.projectiles) projectile.elapsed += Math.max(0, elapsed);
  state.motion.projectiles = state.motion.projectiles.filter(projectile => projectile.elapsed < projectile.duration);
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
    companionTalk('trap');
  } else if (hazard.type === 'rocks' && !hazard.triggered) {
    hazard.triggered = true; hazard.stage = 'warning';
    hazard.impactAt = state.hazardTime + 1.2;
    log('Dust and falling stones! Move off the cracked tile!');
    companionTalk('trap');
    playSound('hit');
  } else if (hazard.type === 'flame' && flameActive(hazard) && state.hazardTime >= hazard.nextDamageAt) {
    hazard.nextDamageAt = state.hazardTime + 1;
    hurtPlayer(4 + state.depth, 'The flames burn you!');
    companionTalk('trap');
  }
}

function hazardTick() {
  if (state.area === 'town') return;
  if (!state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.pause || document.hidden) return;
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
  panel.textContent = [...state.messages].reverse().join('\n\n');
  panel.scrollTop = 0;
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
  freezePlayerStats();
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

function fogDistanceLevel(distance, radius) {
  if (distance <= radius - 2) return 0;
  if (distance <= radius - 1) return 1;
  if (distance <= radius) return 2;
  return 3;
}

function fogLevel(x, y) {
  const p = state.player;
  let level = fogDistanceLevel(Math.max(Math.abs(x - p.x), Math.abs(y - p.y)), 3);
  const companion = state.companion;
  if (companion && Number.isInteger(companion.x) && Number.isInteger(companion.y)) {
    const companionDistance = Math.max(Math.abs(x - companion.x), Math.abs(y - companion.y));
    level = Math.min(level, fogDistanceLevel(companionDistance, COMPANION_FOG_RADIUS + 2));
  }
  return level;
}

function heroDamage(m, dmg) {
  return state.godMode ? Math.max(1, m.hp) : dmg;
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
    const xpGain = p.lvl >= MAX_LEVEL ? 0 : m.xp;
    p.xp += xpGain;
    let msg = `${m.name} ${m.isDragon ? 'defeated' : m.isThemed ? 'defeated' : 'slain'}! +${xpGain} XP`;
    if (m.gold) { state.gold += m.gold; msg += ` +${m.gold} gold`; }
    log(msg);
    if (m.sprite === 'bat') companionTalk('bat');
    if (m.isBoss) {
      state.bossDefeated = true;
      if (state.companion && state.companion.kind === 'cat' && state.entranceCat && !state.entranceCat.retired) {
        log(`${state.companion.name}: "That should cover the household budget. I am going home."`);
        state.entranceCat.retired = true;
        state.companionSpeech = null;
      }
      adoptBossCompanion(m);
      companionTalk('boss');
      saveFloor();
      startBossDefeat(m);
    }
    delete state.motion.moves[actorMotionKey(m)];
    while (p.lvl < MAX_LEVEL && p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.lvl++;
      p.xpNext = Math.round(p.xpNext * 1.5);
      p.maxHp += 10; p.maxMp += 4; p.mp = Math.min(p.maxMp, p.mp + 4);
      p.str += 3; p.dex += 1; p.def += 1; p.hp = Math.min(p.maxHp, p.hp + 20);
      log(`Level up! You are now level ${p.lvl}!`);
      if (p.lvl >= MAX_LEVEL) {
        p.xp = 0; p.xpNext = 1;
        log('Maximum level reached!');
      }
    }
    if (p.lvl >= MAX_LEVEL) { p.xp = 0; p.xpNext = 1; }
    if (m.isBoss) {
      const themed = m.isThemed && THEMED_FLOORS[state.depth];
      const hint = themed ? `${m.name} is defeated! The ${themed.kind} is safe now.`
        : m.isThroneBoss ? 'The throne falls silent. Its guards crumble, and the stairs are unlocked.'
          : m.isDragon ? `Rescue the princess at depth ${FINAL_DEPTH} to win!`
          : bossGateAt(state.depth) ? `${m.name} is defeated! The stairs are unlocked.`
            : state.floorKey && state.floorKey.collected ? 'The stairs are unlocked!' : 'Find this floor’s key to open the stairs.';
      log(`${msg}. ${hint}`);
    }
    if (keyDropped) log('A golden floor key drops! Stand on it and press Space.');
  }
  freezePlayerStats();
}

function attackMonster(m) {
  if (state.gameOver || state.helpOpen || state.pause) return;
  markCombat();
  playSound('slash');
  const dmg = Math.max(1, effectiveAtk() - m.def);
  damageMonster(m, heroDamage(m, dmg));
  if (m.hp > 0) { monsterTalk(m); enemyAttack(m); }
}

function rangedWeapon() {
  const weapon = state.equipment.weapon;
  return weapon && weapon.range ? weapon : null;
}

function hasLineOfSight(x0, y0, x1, y1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 1; i < steps; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / steps);
    const y = Math.round(y0 + (y1 - y0) * i / steps);
    if (state.map[y] && state.map[y][x] !== 0) return false;
  }
  return true;
}

function visibleTargets(range, source = state.player) {
  return state.monsters.filter(m => m.hp > 0 && inCamera(m.x, m.y) && fogLevel(m.x, m.y) < 3 &&
    Math.max(Math.abs(m.x - source.x), Math.abs(m.y - source.y)) <= range && hasLineOfSight(source.x, source.y, m.x, m.y));
}

function spawnProjectile(kind, source, target, duration = 0.35) {
  const from = actorRenderPosition(source), to = actorRenderPosition(target);
  const projectiles = state.motion.projectiles;
  if (projectiles.length >= 24) projectiles.shift();
  projectiles.push({ kind,
    fromX: (from.x + 0.5) * TILE, fromY: (from.y + 0.5) * TILE,
    toX: (to.x + 0.5) * TILE, toY: (to.y + 0.5) * TILE,
    elapsed: 0, duration });
}

function shootBow() {
  if (state.area === 'town') return;
  if (!state.started || state.gameOver || state.helpOpen || state.pause || bossCinematicActive()) return;
  const weapon = rangedWeapon();
  if (!weapon) { log('You need a bow to shoot.'); render(); return; }
  const targets = visibleTargets(weapon.range).sort((a, b) =>
    Math.max(Math.abs(a.x - state.player.x), Math.abs(a.y - state.player.y)) -
    Math.max(Math.abs(b.x - state.player.x), Math.abs(b.y - state.player.y)));
  const target = targets[0];
  if (!target) { log('No monster in bow range.'); render(); return; }
  markCombat();
  playSound('shoot');
  state.turn++;
  spawnProjectile('arrow', state.player, target);
  damageMonster(target, heroDamage(target, Math.max(1, effectiveAtk() - target.def)));
  if (target.hp > 0) { monsterTalk(target); enemyAttack(target); }
  log(`You shoot ${target.name} with your ${weapon.name}.`);
  render();
}

function castSpell(spellName) {
  if (state.area === 'town') return;
  if (!state.started || state.gameOver || state.helpOpen || state.pause || bossCinematicActive()) return;
  const spell = SPELLS[spellName];
  if (!spell) return;
  const p = state.player;
  if (!p.spells[spellName]) {
    log(`You have not learned ${spell.name}.`); render(); return;
  }
  const readyAt = state.spellReadyAt[spellName] || 0;
  if (state.activeTime < readyAt) {
    log(`${spell.name} recharges for ${(readyAt - state.activeTime).toFixed(1)}s.`); render(); return;
  }
  if (!state.godMode && p.mp < spell.cost) { log(`Not enough mana for ${spell.name} (${p.mp}/${p.maxMp}).`); render(); return; }
  if (!state.godMode) p.mp -= spell.cost;
  state.spellReadyAt[spellName] = state.activeTime + spell.cooldown;
  markCombat();
  playSound('magic');
  state.turn++;
  if (spellName === 'fireball') {
    const targets = visibleTargets(3);
    for (const m of targets) {
      spawnProjectile('fireball', p, m, 0.45);
      damageMonster(m, heroDamage(m, Math.max(1, Math.round(effectiveAtk() * 0.8) - Math.floor(m.def / 2))));
      if (m.hp > 0) enemyAttack(m);
    }
    log(targets.length ? `You cast Fireball at ${targets.length} monster${targets.length === 1 ? '' : 's'}.`
      : 'Fireball scorches empty air.');
  } else if (spellName === 'frostbolt') {
    const target = visibleTargets(4)[0];
    if (target) {
      spawnProjectile('frost', p, target, 0.35);
      damageMonster(target, heroDamage(target, Math.max(1, Math.round(effectiveAtk() * 1.6) - Math.floor(target.def / 2))));
      if (target.hp > 0) enemyAttack(target);
      log(`You cast Frostbolt at ${target.name}.`);
    } else log('Frostbolt dissolves into empty air.');
  } else if (spellName === 'magicBarrier') {
    const target = visibleTargets(3)[0];
    if (!target) log('Magic Barrier flares and fades.');
    else {
      spawnProjectile('bolt', p, target, 0.3);
      const horizontal = Math.abs(target.x - p.x) >= Math.abs(target.y - p.y);
      const sx = horizontal ? Math.sign(target.x - p.x) : 0;
      const sy = horizontal ? 0 : Math.sign(target.y - p.y);
      let x = target.x, y = target.y, pushed = 0, impact = false;
      for (let i = 0; i < 3; i++) {
        const nx = x + sx, ny = y + sy;
        if (!state.map[ny] || state.map[ny][nx] !== 0 || monsterAt(nx, ny) || (nx === p.x && ny === p.y)) { impact = true; break; }
        x = nx; y = ny; pushed++;
      }
      if (pushed) moveActorTo(target, x, y);
      const damage = Math.max(2, Math.round(effectiveAtk() * 1.4) - Math.floor(target.def / 2));
      if (impact || !pushed) {
        damageMonster(target, heroDamage(target, damage));
        log(`Magic Barrier slams ${target.name} into the wall for ${damage} damage!`);
      } else log(`Magic Barrier shoves ${target.name} ${pushed} tiles away.`);
      if (target.hp > 0) enemyAttack(target);
    }
  } else {
    spawnProjectile('heal', p, p, 0.6);
    const fraction = spellName === 'greaterHeal' ? 0.55 : 0.3;
    const amount = Math.max(1, Math.round(p.maxHp * fraction));
    p.hp = Math.min(p.maxHp, p.hp + amount);
    log(`You cast ${spell.name} and recover ${amount} HP.`);
  }
  freezePlayerStats();
  render();
}

function regenMana() {
  if (state.area === 'town' || state.godMode) return;
  const p = state.player;
  if (state.combatElapsed < 4) return;
  if (state.monsters.some(m => m.hp > 0 && Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) <= 3)) return;
  if (state.activeTime < (state.manaRegenAt || 0)) return;
  state.manaRegenAt = state.activeTime + 2;
  if (p.mp < p.maxMp) p.mp = Math.min(p.maxMp, p.mp + 1);
}

function enemyAttack(m) {
  if (state.gameOver || state.helpOpen || state.pause || m.hp <= 0 || state.activeTime < (m.nextAttackAt || 0)) return;
  m.nextAttackAt = state.activeTime + ENEMY_ATTACK_INTERVAL;
  monsterTalk(m);
  markCombat();
  const distance = Math.max(Math.abs(m.x - state.player.x), Math.abs(m.y - state.player.y));
  const inLine = hasLineOfSight(m.x, m.y, state.player.x, state.player.y);
  if (m.ranged && distance <= m.range && inLine) {
    const projectile = m.projectile === 'bone' ? 'bone' : m.projectile === 'beer' ? 'beer' : 'stinger';
    spawnProjectile(projectile, m, state.player);
    if (Math.random() < dodgeChance()) { log(`You dodge ${m.name}'s ${m.projectile}!`); return; }
    if (Math.random() < Math.min(0.8, 0.55 + state.depth * 0.02)) {
      playSound('shoot');
      const damage = Math.max(1, m.atk);
      hurtPlayer(damage, `${m.name} shoots you with a ${m.projectile} for ${damage}!`);
    } else log(`${m.name}'s ${m.projectile} misses!`);
    return;
  }
  if (m.magic && distance <= m.magicRange && inLine) {
    if (m.magicType === 'attack') {
      spawnProjectile('bolt', m, state.player);
      if (Math.random() < dodgeChance()) { log(`You dodge ${m.name}'s spell!`); return; }
      if (Math.random() < Math.min(0.75, 0.45 + state.depth * 0.025)) {
        playSound('magic');
        const damage = Math.max(1, m.atk);
        hurtPlayer(damage, `${m.name} casts a spell and hits you for ${damage}!`);
      } else log(`${m.name}'s spell fizzles!`);
    } else if (m.magicType === 'heal') {
      const patient = [m, ...state.monsters.filter(other => other !== m && other.hp > 0 && other.hp < other.maxHp
        && Math.max(Math.abs(other.x - m.x), Math.abs(other.y - m.y)) <= m.magicRange
        && hasLineOfSight(m.x, m.y, other.x, other.y))]
        .filter(other => other.hp < other.maxHp)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (patient) {
        spawnProjectile('heal', m, patient, 0.6);
        const healAmount = Math.max(1, Math.round(patient.maxHp * 0.15));
        patient.hp = Math.min(patient.maxHp, patient.hp + healAmount);
        log(`${m.name} casts a healing spell on ${patient === m ? 'themselves' : patient.name} for ${healAmount} HP!`);
      }
    }
    return;
  }
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
  clearBossIntro();
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  clearTownReturn();
  state.companion = null;
  state.companionSpeech = null;
  state.entranceCat = freshEntranceCatState();
  state.gameOver = true; state.won = won; state.pause = null;
  const ov = document.getElementById('overlay');
  document.getElementById('ovTitle').textContent = 'GAME OVER';
  document.getElementById('ovTitle').style.color = '#ff3d3d';
  document.getElementById('ovText').textContent = `Slain at depth ${state.depth}. ${state.kills} kills.`;
  ov.style.display = 'flex';
}

function bossIntroActive() {
  return !!(state && state.bossIntro && !state.bossIntro.completed);
}

function bossCinematicActive() {
  return bossIntroActive() || bossDefeatActive();
}

function stopBossIntroAnimation() {
  const anim = state && state.bossIntro;
  if (!anim) return;
  if (anim.frameId !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(anim.frameId);
  anim.frameId = null;
}

function clearBossIntro() {
  stopBossIntroAnimation();
  if (state) state.bossIntro = null;
}

function bossIntroPhase(t) {
  if (t < 0.45) return 'reveal';
  if (t < 1.15) return 'roar';
  return 'hold';
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
  const t = anim.elapsed, phases = BOSS_ANIMATIONS[anim.kind] || BOSS_ANIMATIONS.mimic;
  if (anim.kind === 'dragon') {
    if (t < 0.9) return 'roar';
    if (t < 1.8) return 'fall';
    return 'legacy';
  }
  if (anim.kind === 'mimic') {
    if (t < 0.4) return 'snap';
    if (t < 0.9) return 'coins';
    return 'collapse';
  }
  let phase = phases.phases[0][1];
  for (const [at, name] of phases.phases) if (t >= at) phase = name;
  return phase;
}

function playBossIntroSound(kind) {
  if (kind === 'dragon') {
    tone(58, 0.7, 'sawtooth', 0.3, 0, 'effects');
    tone(116.54, 0.5, 'square', 0.2, 0.2, 'effects');
  } else if (kind === 'hydra') {
    [110, 138.59, 164.81].forEach((note, i) => tone(note, 0.35, 'sawtooth', 0.18, i * 0.11, 'effects'));
  } else if (kind === 'boar') {
    tone(92, 0.4, 'square', 0.28, 0, 'effects');
    tone(72, 0.5, 'triangle', 0.2, 0.18, 'effects');
  } else if (kind === 'medusa') {
    tone(440, 0.5, 'sine', 0.18, 0, 'effects');
    tone(659.25, 0.4, 'triangle', 0.14, 0.18, 'effects');
  } else if (kind === 'wizard') {
    [261.63, 329.63, 392, 523.25].forEach((note, i) => tone(note, 0.28, 'sine', 0.14, i * 0.08, 'effects'));
  } else if (kind === 'skeletonKing') {
    tone(73.42, 0.6, 'square', 0.24, 0, 'effects');
    tone(146.83, 0.5, 'triangle', 0.18, 0.22, 'effects');
  } else if (kind === 'bartender') {
    tone(392, 0.18, 'sine', 0.16, 0, 'effects');
    tone(523.25, 0.22, 'sine', 0.14, 0.14, 'effects');
  } else if (kind === 'cook') {
    tone(220, 0.2, 'square', 0.2, 0, 'effects');
    tone(330, 0.22, 'triangle', 0.16, 0.16, 'effects');
  } else {
    tone(120, 0.22, 'square', 0.24, 0, 'effects');
    tone(180, 0.18, 'triangle', 0.18, 0.16, 'effects');
  }
}

function checkBossIntro() {
  if (state.area === 'town') return;
  const m = state && state.boss;
  if (!m || m.hp <= 0 || state.bossIntroSeen || !state.started || state.gameOver || state.helpOpen || state.pause || bossCinematicActive()) return;
  const p = state.player;
  if (Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) > 4 || !hasLineOfSight(p.x, p.y, m.x, m.y)) return;
  startBossIntro(m);
}

function startBossIntro(m) {
  if (!m || !m.isBoss || m.hp <= 0 || !state.started || state.gameOver || state.helpOpen || state.pause || bossCinematicActive()) return;
  const kind = bossKind(m), meta = BOSS_ANIMATIONS[kind], visual = monsterVisual(m);
  state.bossIntroSeen = true;
  clearMovementAnimation();
  clearMonsterSpeech();
  state.bossIntro = {
    kind, label: m.name, accent: meta.accent, elapsed: 0, phase: 'reveal', completed: false,
    duration: meta.intro, hpRatio: Math.max(0, m.hp / m.maxHp), frameId: null,
    lastTimestamp: null, events: new Set(),
    visual: { sprite: visual.sprite, scale: visual.scale, width: visual.width, height: visual.height },
  };
  playBossIntroSound(kind);
  draw();
  requestBossIntroFrame(state.bossIntro);
}

function requestBossIntroFrame(anim) {
  if (state.bossIntro !== anim || anim.completed || typeof window.requestAnimationFrame !== 'function') return;
  anim.frameId = window.requestAnimationFrame(timestamp => bossIntroFrame(timestamp, anim));
}

function bossIntroFrame(timestamp, anim) {
  if (state.bossIntro !== anim || anim.completed) return;
  anim.frameId = null;
  if (document.hidden || state.helpOpen || state.consoleOpen) {
    anim.lastTimestamp = null;
    requestBossIntroFrame(anim);
    return;
  }
  const elapsed = anim.lastTimestamp === null ? 0 : Math.min(0.1, Math.max(0, (timestamp - anim.lastTimestamp) / 1000));
  anim.lastTimestamp = timestamp;
  advanceBossIntro(elapsed);
  draw();
  requestBossIntroFrame(anim);
}

function advanceBossIntro(elapsed) {
  const anim = state && state.bossIntro;
  if (!anim || anim.completed || document.hidden || state.helpOpen || state.consoleOpen) return;
  anim.elapsed = Math.min(anim.duration, anim.elapsed + Math.max(0, elapsed));
  anim.phase = bossIntroPhase(anim.elapsed);
  for (const [at, event] of [[0.45, 'reveal'], [1.15, 'roar']]) {
    if (anim.elapsed < at || anim.events.has(event)) continue;
    anim.events.add(event);
    playBossIntroSound(anim.kind);
  }
  if (anim.elapsed >= anim.duration) {
    anim.completed = true;
    clearBossIntro();
    draw();
  }
}

function skipBossIntro() {
  if (!bossIntroActive() || document.hidden || state.helpOpen) return;
  clearBossIntro();
  draw();
  canvas.focus?.();
}

function bossIntroScene() {
  const anim = state && state.bossIntro;
  if (!anim) return null;
  const t = anim.elapsed, progress = defeatClamp(t / anim.duration);
  const reveal = defeatClamp(t / 0.45), roar = defeatClamp((t - 0.45) / 0.7);
  const fade = defeatClamp((t - anim.duration + 0.3) / 0.3);
  return {
    kind: anim.kind, label: anim.label, phase: anim.phase, accent: anim.accent,
    sprite: anim.visual.sprite, scale: anim.visual.scale,
    t, progress, hpRatio: anim.hpRatio,
    alpha: reveal * (1 - fade), bannerAlpha: reveal * (1 - fade),
    shake: Math.sin(t * 70) * 4 * (1 - roar) + Math.sin(t * 22) * 2 * roar,
    zoom: 1 + roar * 0.16,
    particles: Array.from({ length: 10 }, (_, i) => {
      const angle = i / 10 * Math.PI * 2 + anim.kind.length * 0.13;
      const radius = 40 + i * 9 + roar * 26;
      return { x: 576 + Math.cos(angle) * radius, y: 318 + Math.sin(angle) * radius * 0.65,
        alpha: (1 - fade) * (0.35 + 0.65 * roar), size: 3 + i % 3 };
    }),
  };
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
  const kind = bossKind(m), meta = BOSS_ANIMATIONS[kind];
  const visual = monsterVisual(m);
  clearBossIntro();
  clearMovementAnimation();
  state.bossDefeat = {
    kind, label: m.name, elapsed: 0, phase: isDragon ? 'roar' : meta.phases[0][1], completed: false,
    duration: meta.defeat,
    frameId: null, lastTimestamp: null, events: new Set(),
    visual: { sprite: visual.sprite, scale: visual.scale, x: visual.x, y: visual.y,
      width: visual.width, height: visual.height, left: visual.left, right: visual.right,
      top: visual.top, bottom: visual.bottom, tileX: m.x, tileY: m.y },
    guards: m.isThroneBoss ? state.monsters.filter(g => g.isGuard && g.hp > 0)
      .map(g => ({ dx: (g.x - m.x) * TILE, dy: (g.y - m.y) * TILE })) : [],
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
  if (document.hidden || state.helpOpen || state.consoleOpen) {
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
  if (!anim || anim.completed || document.hidden || state.helpOpen || state.consoleOpen) return;
  anim.elapsed = Math.min(anim.duration, anim.elapsed + Math.max(0, elapsed));
  anim.phase = bossDefeatPhase(anim);
  const milestones = anim.kind === 'dragon' ? [[0.9, 'roar'], [1.8, 'fall']]
    : anim.kind === 'mimic' ? [[0.4, 'snap'], [0.9, 'coins']]
      : BOSS_ANIMATIONS[anim.kind].phases;
  for (const [at, event] of milestones) {
    if (anim.elapsed < at || anim.events.has(event)) continue;
    anim.events.add(event);
    if (anim.kind === 'dragon' && event === 'roar') tone(72, 0.7, 'sawtooth', 0.34, 0, 'effects');
    else if (anim.kind === 'dragon') tone(98, 0.5, 'square', 0.22, 0, 'effects');
    else if (anim.kind === 'mimic' && event === 'snap') tone(160, 0.08, 'square', 0.34, 0, 'effects');
    else if (anim.kind === 'mimic') tone(880, 0.1, 'triangle', 0.22, 0, 'effects');
    else tone(event === 'crown' || event === 'shatter' || event === 'banish' ? 660 : 196, 0.18, 'triangle', 0.2, 0, 'effects');
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
  if (anim.kind !== 'dragon') {
    const meta = BOSS_ANIMATIONS[anim.kind] || BOSS_ANIMATIONS.mimic;
    const reveal = defeatClamp((t - 0.2) / 0.3);
    const fade = defeatClamp((t - anim.duration + 0.4) / 0.4);
    const drop = defeatClamp((t - 0.5) / 1.2);
    const particles = Array.from({ length: 12 }, (_, i) => {
      const angle = i / 12 * Math.PI * 2 + anim.kind.length * 0.17;
      const travel = Math.max(0, t - 0.35 - (i % 3) * 0.05);
      const radius = 12 + travel * (38 + i % 4 * 8);
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.6 - travel * 22 + travel * travel * 28,
        alpha: 1 - defeatClamp(travel / 1.1), size: 3 + i % 4, spin: travel * (i % 2 ? 4 : -4) };
    });
    const crownShards = meta.motif === 'crown' ? Array.from({ length: 8 }, (_, i) => {
      const angle = i / 8 * Math.PI * 2;
      const travel = Math.max(0, t - 0.45);
      return { x: Math.cos(angle) * (8 + travel * 46), y: -72 + Math.sin(angle) * 18 - travel * 16 + travel * travel * 22,
        alpha: 1 - defeatClamp(travel / 1.2), size: 4 + i % 3, spin: travel * (i % 2 ? 5 : -5) };
    }) : [];
    return { kind: anim.kind, phase: anim.phase, t, progress, accent: meta.accent, motif: meta.motif,
      shake: Math.sin(t * 78) * 4 * (1 - drop), squash: drop * 0.45, rise: drop * 12,
      alpha: 1 - fade, particles, crownShards, guards: anim.guards || [],
      bannerAlpha: reveal * (1 - defeatClamp((t - anim.duration + 0.3) / 0.3)), bannerRise: reveal * 10 };
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
  if (state.gameOver || state.helpOpen || state.pause || bossCinematicActive()) return;
  const p = state.player;
  const nx = p.x + dx, ny = p.y + dy;
  if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
  if (state.map[ny][nx] !== 0) return;
  if (state.area === 'town') {
    const npc = state.town.npcs.find(actor => actor.x === nx && actor.y === ny);
    if (npc) { townNpcTalk(npc); render(); return; }
  }
  const m = monsterAt(nx, ny);
  if (m) { state.turn++; attackMonster(m); render(); return; }
  state.bubble = null;
  moveActorTo(p, nx, ny);
  placeCompanionNearPlayer(dx, dy);
  state.turn++;
  revealAroundPlayer();
  if (state.area === 'town') townEncounter();
  else { applyPlayerHazards(); checkBossIntro(); }
  render();
}

function revealAroundActor(actor, radius) {
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const x = actor.x + dx, y = actor.y + dy;
    if (x >= 0 && y >= 0 && x < W && y < H) state.visited.add(`${x},${y}`);
  }
}

function revealAroundCompanion() {
  if (state.companion && Number.isInteger(state.companion.x) && Number.isInteger(state.companion.y)) revealAroundActor(state.companion, COMPANION_FOG_RADIUS);
}

function revealAroundPlayer() {
  revealAroundActor(state.player, 3);
  revealAroundCompanion();
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
  if (state.area === 'town') return;
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
    if ((spawn.isBoss || spawn.isGuard) && state.bossDefeated) continue;
    const preferred = available.findIndex(t => (spawn.isBoss || !bossSpawnBuffer(t.x, t.y)) && t.x === spawn.x && t.y === spawn.y);
    const index = preferred >= 0 ? preferred : available.findIndex(t => spawn.isBoss ? bossSpawnBuffer(t.x, t.y) : !bossSpawnBuffer(t.x, t.y));
    if (index < 0) continue;
    const tile = available.splice(index, 1)[0];
    state.monsters.push({ ...spawn, ...tile, hp: spawn.maxHp, nextAttackAt: state.activeTime });
  }
  state.boss = state.monsters.find(m => m.isBoss) || null;
}

function enterFloor(depth, fromBelow, fresh = false, arrivalTile = null) {
  if (depth < 1 || depth > FINAL_DEPTH) return;
  clearBossIntro();
  clearBossDefeat();
  state.bossIntroSeen = false;
  state.bossSummonAt = state.activeTime + 4;
  if (state.area === 'town' && state.entranceCat && !state.entranceCat.entered) {
    joinEntranceCat(true);
    state.entranceCat.entered = true;
  }
  if (state.area === 'town') saveTown(); else saveFloor();
  state.area = 'dungeon';
  state.depth = depth;
  const floor = fresh ? null : state.floors[depth];
  if (floor) {
    for (const field of FLOOR_FIELDS) state[field] = floor[field];
  } else {
    genLevel();
  }
  const arrival = arrivalTile || (fromBelow ? state.stairs : state.upstairs);
  state.player.x = arrival.x; state.player.y = arrival.y;
  recreateMonsters();
  state.bubble = null;
  state.healElapsed = 0;
  placeCompanionNearPlayer();
  revealAroundPlayer();
  playSound('stairs');
}

function descendStairs() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  const p = state.player;
  if (p.x !== state.stairs.x || p.y !== state.stairs.y) return;
  if (state.depth === FINAL_DEPTH) { log('The dungeon ends here. Defeat the dragon, then rescue the princess.'); render(); return; }
  if (bossGateAt(state.depth) && state.boss && !state.bossDefeated) {
    log(`${state.boss.name} guards the stairs. Defeat it first!`); render(); return;
  }
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
  if (!state.upstairs || p.x !== state.upstairs.x || p.y !== state.upstairs.y) {
    log('Stand on the up stairs (▲) to ascend.'); return;
  }
  if (state.depth === 1) {
    enterTown();
    log('You climb the stairs back to town.');
    render();
    return;
  }
  enterFloor(state.depth - 1, true);
  log(`You ascend to depth ${state.depth}.`);
  render();
}


function merchantStock() {
  const stock = [];
  const count = Math.min(6, 3 + Math.floor(state.depth / 4));
  for (let i = 0; i < count; i++) {
    const pool = lootPool(state.depth).filter(it => it.kind !== 'spellbook' || !state.player.spells[it.spell]);
    const it = pool[Math.floor(Math.random() * pool.length)];
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
  if (it.kind === 'spellbook' && state.player.spells[it.spell]) {
    log(`You already know ${SPELLS[it.spell].name}.`);
    m.stock.shift(); render(); return;
  }
  const priceScale = 1.5 + Math.max(0, state.depth - 1) * 0.03;
  const cost = Math.round(it.gold * priceScale);
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
  } else if (it.kind === 'spellbook') {
    learnSpell(it.spell);
    log(`Bought ${it.name}!`);
  } else if (it.kind === 'scroll') {
    state.townScrolls++;
    log(`Bought ${it.name}! Press J in the dungeon to open a portal home.`);
  } else {
    log(`Bought ${it.name}!`);
  }
  if (!m.stock.length) companionTalk('merchant');
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
  companionTalk('rescue');
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
  companionTalk('rescue');
  state.bubble = null;
  saveFloor();
  gameOver(true);
  render();
}

function pickup() {
  if (state.gameOver || state.helpOpen || state.pause) return;
  if (state.area === 'town') { townInteract(); return; }
  const p = state.player;
  const key = state.floorKey;
  if (key && key.drop && key.drop.x === p.x && key.drop.y === p.y) {
    key.collected = true; key.drop = null;
    saveFloor(); playSound('pickup');
    const gate = bossGateAt(state.depth) && state.boss && !state.bossDefeated;
    log(gate ? `Key collected! Defeat ${state.boss.name} to unlock the stairs.` : 'Key collected! This floor’s stairs are permanently unlocked.');
    render(); return;
  }
  if (state.stairs && p.x === state.stairs.x && p.y === state.stairs.y) { descendStairs(); return; }
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
  if (!t) {
    if (state.upstairs && p.x === state.upstairs.x && p.y === state.upstairs.y) { ascendStairs(); return; }
    log('Nothing to pick up.'); return;
  }
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
  } else if (t.kind === 'spellbook') {
    learnSpell(t.spell);
    log(`${t.name}!`);
  } else if (t.kind === 'scroll') {
    state.townScrolls++;
    log(`${t.name} stored! Press J in the dungeon to open a portal home.`);
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
  if (state.godMode) { log('God mode holds your health steady; the potion stays stored.'); render(); return; }
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
  state.manaRegenAt = state.activeTime + 4;
}

function hurtPlayer(damage, message) {
  if (state.gameOver || state.helpOpen || state.pause) return;
  if (state.godMode) {
    markCombat();
    log(`${message} (god mode blocks the damage)`);
    return;
  }
  markCombat();
  state.player.hp -= damage;
  log(message);
  playSound('hit');
  if (state.player.hp <= 0) die();
  else checkHealth();
}

function checkHealth() {
  freezePlayerStats();
  if (state.area === 'town' || state.gameOver || state.helpOpen || state.godMode) return;
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
  if (state.area === 'town') return;
  if (!state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.pause || document.hidden || bossCinematicActive()) return;
  state.activeTime += Math.max(0, elapsed);
  state.hazardTime += Math.max(0, elapsed);
  updateMonsterSpeech();
}

function retreat() {
  if (state.area === 'town') { log('No need to retreat while you are in town.'); render(); return; }
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
  const exit = { depth: state.depth, x: state.player.x, y: state.player.y, reason: 'retreat' };
  const portalClosed = state.townPortalOpen;
  state.retreatReadyAt = state.activeTime + RETREAT_COOLDOWN;
  state.pause = null;
  companionTalk('retreat');
  state.townExit = exit;
  state.townPortalOpen = false;
  if (portalClosed) log('The town portal collapses as you retreat.');
  enterTown();
  state.player.hp = state.player.maxHp;
  state.warnedLow = false; state.warnedCritical = false;
  markCombat();
  state.lastTick = Date.now();
  playSound('heal');
  log('You retreat to town with full health.');
  render();
}

function recoveryTick(elapsed) {
  if (state.area === 'town') return;
  if (!state.started || state.gameOver || state.helpOpen || state.pause) return;
  freezePlayerStats();
  if (state.godMode) { state.combatElapsed += elapsed; return; }
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
    ? 'Retreat to town with full HP?'
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

function summonThroneGuards() {
  const boss = state && state.boss;
  if (!boss || !boss.isThroneBoss || boss.hp <= 0 || state.bossDefeated || state.activeTime < state.bossSummonAt) return;
  state.bossSummonAt = state.activeTime + 6;
  const room = state.rooms.find(r => r.isThroneRoom);
  if (!room) return;
  const alive = state.monsters.filter(m => m.isGuard && m.hp > 0).length;
  const needed = Math.min(3 - alive, 2);
  if (needed <= 0) return;
  const template = MONSTER_TYPES.find(t => t.name === 'Skeleton') || MONSTER_TYPES[3];
  const candidates = [];
  for (const dx of [-6, 6]) for (const dy of [-4, -2, 2, 4]) {
    const x = room.cx + dx, y = room.cy + dy;
    if (state.map[y] && state.map[y][x] === 0 && !state.props.some(p => p.x === x && p.y === y)) candidates.push({ x, y });
  }
  let id = Math.max(0, ...state.monsters.map(m => m.id)) + 1;
  let summoned = 0;
  for (const tile of candidates) {
    if (summoned >= needed) break;
    if (tile.x === state.player.x && tile.y === state.player.y || state.monsters.some(m => m.hp > 0 && m.x === tile.x && m.y === tile.y)) continue;
    const scale = 1 + (state.depth - 1) * 0.2, attackScale = 1 + (state.depth - 1) * 0.15;
    state.monsters.push({ ...template, ...tile,
      maxHp: Math.round(template.hp * scale), hp: Math.round(template.hp * scale),
      atk: Math.round(template.atk * attackScale), def: template.def + Math.floor((state.depth - 1) / 2),
      xp: Math.round(template.xp * (1 + (state.depth - 1) * 0.35)), gold: Math.round(5 * (1 + (state.depth - 1) * 0.35)),
      id: id++, isGuard: true, nextAttackAt: state.activeTime });
    summoned++;
  }
  if (summoned) {
    log(`The Skeleton King summons ${summoned} skeletal guard${summoned === 1 ? '' : 's'}!`);
    tone(82.41, 0.5, 'square', 0.24, 0, 'effects');
  }
}

function enemyTick() {
  const now = Date.now();
  const elapsed = Math.min(0.5, Math.max(0, (now - state.lastTick) / 1000));
  state.lastTick = now;
  freezePlayerStats();
  if (state.area === 'town') {
    if (!state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.pause || document.hidden) return;
    musicTick();
    if (townTick()) render();
    return;
  }
  if (!state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.pause || document.hidden || bossCinematicActive()) return;
  checkHealth();
  if (state.pause) { render(); return; }
  advanceActiveTime(elapsed);
  musicTick();
  hazardTick();
  if (state.gameOver || state.helpOpen || state.pause) { render(); return; }
  checkBossIntro();
  if (bossIntroActive()) { render(); return; }
  summonThroneGuards();
  const p = state.player;
  regenMana();
  companionTick();
  if (state.bubble && state.bubble.ttl > 0) state.bubble.ttl--;
  for (const m of state.monsters) {
    if (m.hp <= 0) continue;
    const attackRange = m.ranged ? m.range : m.magic ? m.magicRange : 0;
    if (attackRange) {
      const distance = Math.max(Math.abs(p.x - m.x), Math.abs(p.y - m.y));
      if (distance <= attackRange && hasLineOfSight(m.x, m.y, p.x, p.y)) {
        enemyAttack(m);
        if (state.gameOver || state.helpOpen || state.pause) { render(); return; }
        continue;
      }
    }
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
  const themed = THEMED_FLOORS[state.depth];
  if (themed) {
    const arena = state.rooms.find(r => r.isArena);
    if (arena) for (const [ox, oy] of [[-4, -3], [4, 3]]) {
      const x = arena.cx + ox, y = arena.cy + oy;
      if (inRenderCamera(x, y) && state.visited.has(`${x},${y}`)) drawSprite(themed.prop, x * TILE + TILE / 2, y * TILE + TILE / 2, 2);
    }
  }
  for (const prop of state.props) {
    if (!inRenderCamera(prop.x, prop.y)) continue;
    if (state.area !== 'town' && !state.visited.has(`${prop.x},${prop.y}`)) continue;
    drawSprite(prop.sprite, prop.x * TILE + TILE / 2, prop.y * TILE + TILE / 2, prop.scale || 2);
  }
  if (state.area === 'town' && state.townPortalOpen && state.townGate && inRenderCamera(state.townGate.x, state.townGate.y)) {
    drawSprite('townPortal', state.townGate.x * TILE + TILE / 2, state.townGate.y * TILE + TILE / 2 - 4, 2);
  }
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
  const label = `${(state.bossDefeat.label || 'Mimic').toUpperCase()} DEFEATED`;
  ctx.strokeStyle = '#14110e'; ctx.lineWidth = 4; ctx.strokeText(label, visual.x, y);
  ctx.fillStyle = '#ffdf8a'; ctx.fillText(label, visual.x, y);
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

function drawBossDefeat(scene) {
  const anim = state.bossDefeat;
  const visual = anim.visual;
  if (!inRenderCamera(visual.tileX, visual.tileY)) return;
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  ctx.translate(visual.x + scene.shake, visual.y + scene.rise);
  ctx.scale(1 + scene.squash * 0.22, 1 - scene.squash);
  drawSprite(visual.sprite, 0, 0, visual.scale);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  ctx.translate(visual.x, visual.y);
  ctx.strokeStyle = scene.accent; ctx.fillStyle = scene.accent; ctx.lineWidth = 3;
  if (scene.motif === 'heads') {
    for (let i = 0; i < 3; i++) {
      const swing = Math.sin(scene.t * 6 + i * 2) * 10;
      ctx.beginPath(); ctx.arc((i - 1) * 26 + swing, -54 - i * 8, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo((i - 1) * 26 + swing, -45 - i * 8); ctx.lineTo((i - 1) * 30 + swing, -22); ctx.stroke();
    }
  } else if (scene.motif === 'tusks') {
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 18, -8); ctx.quadraticCurveTo(side * 40, -22, side * 34, -48); ctx.stroke();
    }
    for (let i = 0; i < 5; i++) ctx.fillRect(-60 + i * 26 + scene.t * 14 % 26, 32 + (i % 2) * 7, 12, 5);
  } else if (scene.motif === 'snakes') {
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + scene.t;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, -48 + Math.sin(a) * 6);
      ctx.quadraticCurveTo(Math.cos(a + 1) * 34, -70, Math.cos(a + 2) * 42, -52); ctx.stroke();
    }
  } else if (scene.motif === 'runes') {
    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + scene.t;
      ctx.strokeRect(Math.cos(a) * 46 - 7, -36 + Math.sin(a) * 30 - 8, 14, 16);
      ctx.fillText('✦', Math.cos(a) * 46, -36 + Math.sin(a) * 30);
    }
  } else if (scene.motif === 'crown') {
    ctx.beginPath(); ctx.moveTo(-24, -62); ctx.lineTo(-18, -84); ctx.lineTo(-6, -70); ctx.lineTo(0, -90);
    ctx.lineTo(6, -70); ctx.lineTo(18, -84); ctx.lineTo(24, -62); ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 5; i++) ctx.fillRect((i - 2) * 19, 36 + (i % 2) * 9, 10, 6);
  } else if (scene.motif === 'pans') {
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + scene.t * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 42, -28 + Math.sin(a) * 24, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillRect(Math.cos(a + 0.6) * 56, -28 + Math.sin(a + 0.6) * 34, 7, 7);
    }
  } else if (scene.motif === 'mugs') {
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 22 + Math.sin(scene.t * 5 + i) * 6;
      ctx.strokeRect(x - 6, -50 - i * 5, 12, 17);
      ctx.fillRect(x - 5, -55 - i * 5, 10, 5);
    }
  }
  if (scene.motif === 'crown') {
    for (const shard of scene.crownShards || []) {
      ctx.globalAlpha = scene.alpha * shard.alpha;
      ctx.save(); ctx.translate(shard.x, shard.y); ctx.rotate(shard.spin);
      ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
      ctx.restore();
    }
    const fall = defeatClamp((scene.t - 0.7) / 1.2);
    for (const guard of scene.guards || []) {
      ctx.globalAlpha = scene.alpha;
      ctx.save(); ctx.translate(guard.dx, guard.dy + fall * 10); ctx.rotate(fall * (guard.dx > 0 ? 1.1 : -1.1));
      ctx.fillStyle = '#d8d3c1'; ctx.fillRect(-5, -18, 10, 14); ctx.fillRect(-8, -4, 16, 4);
      ctx.fillStyle = '#131b26'; ctx.fillRect(-3, -14, 2, 3); ctx.fillRect(1, -14, 2, 3);
      ctx.restore();
    }
  }
  for (const particle of scene.particles) {
    ctx.globalAlpha = scene.alpha * particle.alpha;
    ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(particle.spin);
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = scene.bannerAlpha;
  ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = visual.top - 28 - scene.bannerRise;
  const label = `${(anim.label || 'Boss').toUpperCase()} DEFEATED`;
  ctx.strokeStyle = '#14110e'; ctx.lineWidth = 4; ctx.strokeText(label, visual.x, y);
  ctx.fillStyle = '#ffdf8a'; ctx.fillText(label, visual.x, y);
  ctx.restore();
}

function drawBossIntro(scene) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = scene.alpha;
  ctx.fillStyle = 'rgba(6, 8, 16, 0.66)'; ctx.fillRect(0, 0, 1152, 768);
  const glow = ctx.createRadialGradient(576, 318, 20, 576, 318, 260);
  glow.addColorStop(0, `${scene.accent}88`); glow.addColorStop(1, `${scene.accent}00`);
  ctx.fillStyle = glow; ctx.fillRect(316, 58, 520, 520);
  for (const particle of scene.particles) {
    ctx.globalAlpha = scene.alpha * particle.alpha;
    ctx.fillStyle = scene.accent;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = scene.alpha;
  ctx.save();
  ctx.translate(576 + scene.shake, 336);
  ctx.scale(scene.zoom, scene.zoom);
  const meta = BOSS_ANIMATIONS[scene.kind] || BOSS_ANIMATIONS.mimic;
  if (meta.motif === 'heads') {
    for (let i = -1; i <= 1; i++) {
      ctx.save(); ctx.translate(i * 42, -58 - Math.abs(i) * 12); ctx.rotate(i * 0.28);
      drawSprite(scene.sprite, 0, 0, scene.scale); ctx.restore();
    }
  } else {
    drawSprite(scene.sprite, 0, 0, scene.scale);
  }
  ctx.restore();
  ctx.globalAlpha = scene.bannerAlpha;
  ctx.fillStyle = '#0a0c13'; ctx.fillRect(176, 600, 800, 112);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = scene.accent; ctx.font = 'bold 38px Georgia, serif';
  ctx.fillText(scene.label.toUpperCase(), 576, 634);
  ctx.fillStyle = '#333'; ctx.fillRect(276, 664, 600, 16);
  ctx.fillStyle = '#ff5563'; ctx.fillRect(276, 664, 600 * scene.hpRatio, 16);
  ctx.restore();
}

function projectilePoint(projectile) {
  const t = Math.max(0, Math.min(1, projectile.elapsed / projectile.duration));
  return { x: projectile.fromX + (projectile.toX - projectile.fromX) * t,
    y: projectile.fromY + (projectile.toY - projectile.fromY) * t - Math.sin(t * Math.PI) * 12, t };
}

function drawProjectiles() {
  for (const projectile of state.motion.projectiles) {
    if (!projectileVisible(projectile)) continue;
    const point = projectilePoint(projectile);
    const angle = Math.atan2(projectile.toY - projectile.fromY, projectile.toX - projectile.fromX);
    ctx.save();
    ctx.translate(point.x, point.y);
    if (projectile.kind === 'stinger') {
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = '#f3d891';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#131b26'; ctx.fillRect(-1, 1, 2, 4);
    } else if (projectile.kind === 'arrow') {
      ctx.rotate(angle);
      ctx.strokeStyle = '#74513a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.fillStyle = '#e8e3cf';
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();
    } else if (projectile.kind === 'beer') {
      ctx.fillStyle = '#a3764b'; ctx.fillRect(-5, -6, 10, 12);
      ctx.fillStyle = '#f3e9cd'; ctx.fillRect(-5, -7, 10, 3);
      ctx.strokeStyle = '#f3e9cd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(7, 0, 4, -1.2, 1.2); ctx.stroke();
    } else if (projectile.kind === 'fireball') {
      ctx.fillStyle = `rgba(255, 140, 50, ${1 - point.t * 0.3})`;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe4ac'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else if (projectile.kind === 'bone') {
      ctx.rotate(angle);
      ctx.fillStyle = '#e8e3cf';
      ctx.fillRect(-9, -2, 14, 4);
      ctx.beginPath(); ctx.arc(-9, -3, 3, 0, Math.PI * 2); ctx.arc(-9, 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -3, 3, 0, Math.PI * 2); ctx.arc(6, 3, 3, 0, Math.PI * 2); ctx.fill();
    } else if (projectile.kind === 'frost') {
      ctx.rotate(angle);
      ctx.fillStyle = '#a8d2cd';
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -5); ctx.lineTo(-8, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e3cf'; ctx.fillRect(-3, -1, 8, 2);
    } else if (projectile.kind === 'heal') {
      const rise = point.t * 18;
      ctx.fillStyle = '#a8d2cd';
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + point.t * 3;
        ctx.fillRect(Math.cos(a) * 8 - 1, Math.sin(a) * 8 - rise, 3, 3);
      }
      ctx.fillStyle = '#e8e3cf'; ctx.fillRect(-2, -2 - rise, 4, 4);
    } else {
      ctx.fillStyle = '#9ab4ff'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e3cf'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function draw() {
  if (state.ending) { drawEnding(); return; }
  const defeat = state.bossDefeat ? bossDefeatScene() : null;
  const intro = state.bossIntro ? bossIntroScene() : null;
  const p = state.player;
  const inTown = state.area === 'town';
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
  for (const [stairs, glyph] of [[state.depth < FINAL_DEPTH ? state.stairs : null, '▼'], [state.upstairs, '▲']]) {
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
  if (state.merchant && inRenderCamera(state.merchant.x, state.merchant.y) && (inTown || fogLevel(state.merchant.x, state.merchant.y) < 3)) {
    const px = state.merchant.x * TILE + TILE / 2, py = state.merchant.y * TILE + TILE / 2;
    drawActorSprite('merchant', px, py, 2);
  }
  if (inTown) drawTownNpcs();
  for (const m of state.monsters) {
    if (m.hp <= 0 || !inRenderCamera(m.x, m.y)) continue;
    if (fogLevel(m.x, m.y) >= 3) continue;
    const visual = monsterVisual(m);
    drawActorSprite(visual.sprite, visual.x, visual.y, visual.scale, m);
  }
  if (!inTown) {
    for (let y = view.y0; y < view.y1; y++) {
      for (let x = view.x0; x < view.x1; x++) {
        const fog = fogLevel(x, y);
        if (fog === 0) continue;
        const key = `${x},${y}`;
        if (state.visited.has(key)) {
          ctx.fillStyle = 'rgba(5, 6, 10, 0.45)';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        } else {
          const a = Math.min(0.95, fog * 0.35);
          ctx.fillStyle = `rgba(5, 6, 10, ${a})`;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
  }
  if (inTown) drawTownSpeech();
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
  drawCompanion();
  drawProjectiles();
  drawMonsterSpeech();
  drawHazardWarnings();
  if (defeat && defeat.kind === 'mimic') drawMimicDefeat(defeat);
  else if (defeat && defeat.kind !== 'dragon') drawBossDefeat(defeat);
  ctx.restore();
  if (defeat && defeat.kind === 'dragon') drawDragonDefeat(defeat);
  if (intro) drawBossIntro(intro);
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
  clearBossIntro();
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  clearTownReturn();
  state.companion = null;
  state.companionSpeech = null;
  state.entranceCat = freshEntranceCatState();
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
  if (document.hidden || state.helpOpen || state.consoleOpen) {
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
  if (!ending || ending.completed || document.hidden || state.helpOpen || state.consoleOpen) return;
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
    shoot: [520, 300], magic: [294, 392, 587],
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
  if (state.area === 'town') {
    if (state.townPortalOpen) return 'A Town Scroll portal waits at the gate. Press J there for a one-way return.';
    if (state.entranceCat && !state.entranceCat.recruited && !state.entranceCat.retired && !state.companion) return 'A huge cat waits by the gate. Press Space beside it to recruit it.';
    return state.townExit
      ? 'Rest at the Inn, trade at the Store, or return to the dungeon at the gate.'
      : 'Rest at the Inn, trade at the Store, or enter the dungeon at the gate.';
  }
  let campaign;
  if (state.boss && bossGateAt(state.depth) && !state.bossDefeated) {
    campaign = `Defeat ${state.boss.name} here to unlock the stairs.`;
  } else {
    const finalCleared = state.floors[FINAL_DEPTH] && state.floors[FINAL_DEPTH].bossDefeated;
    campaign = finalCleared ? `Rescue the princess at depth ${FINAL_DEPTH} — stand on her tile and press Space.`
      : `Descend toward depth ${FINAL_DEPTH}.`;
  }
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
  const abilities = Object.keys(SPELLS)
    .filter(name => state.player.spells[name])
    .map(name => `${SPELLS[name].key} ${SPELLS[name].name}`);
  if (state.townPortalOpen) abilities.push('J Town Portal (ready)');
  else if (state.townScrolls > 0) abilities.push(`J Town Scroll (${state.townScrolls})`);
  document.getElementById('spellList').textContent = abilities.join(' · ');
}

function renderMinimap() {
  const mapCanvas = document.getElementById('minimap');
  const mapCtx = mapCanvas.getContext('2d');
  const scale = 3;
  mapCtx.fillStyle = '#070b10';
  mapCtx.fillRect(0, 0, W * scale, H * scale);
  const inTown = state.area === 'town';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (inTown && (x < 20 || x > 60 || y < 16 || y > 44)) continue;
    if (!inTown && !state.visited.has(`${x},${y}`)) continue;
    if (inTown) {
      const sand = (y >= 28 && y <= 30) || (x >= 37 && x <= 40);
      mapCtx.fillStyle = state.map[y][x] === 0 ? (sand ? '#cbb182' : '#6d7c52') : '#2d5b6e';
    } else {
      mapCtx.fillStyle = state.map[y][x] === 0 ? '#51626b' : state.map[y][x] === 2 ? '#8c7957' : '#242d39';
    }
    mapCtx.fillRect(x * scale, y * scale, scale, scale);
  }
  mapCtx.strokeStyle = '#9aaac1'; mapCtx.lineWidth = 1;
  const camera = renderCamera();
  mapCtx.strokeRect(camera.x * scale + 0.5, camera.y * scale + 0.5, VIEW_W * scale - 1, VIEW_H * scale - 1);
  for (const [stairs, color] of [[state.upstairs, '#8ecaff'], [state.depth < FINAL_DEPTH ? state.stairs : null, '#f4cf78']]) {
    if (!stairs || !state.visited.has(`${stairs.x},${stairs.y}`)) continue;
    mapCtx.fillStyle = color;
    mapCtx.fillRect(stairs.x * scale, stairs.y * scale, scale, scale);
  }
  const position = actorRenderPosition(state.player);
  const px = position.x * scale, py = position.y * scale;
  mapCtx.fillStyle = '#07151a'; mapCtx.fillRect(px - 1, py - 1, scale + 2, scale + 2);
  mapCtx.fillStyle = '#86f2c3'; mapCtx.fillRect(px, py, scale, scale);
  document.getElementById('minimapDepth').textContent = state.area === 'town' ? 'Town' : `D${state.depth}`;
}

function resetHelpClock() {
  state.lastTick = Date.now();
  if (state.ending) state.ending.lastTimestamp = null;
  if (state.bossIntro) state.bossIntro.lastTimestamp = null;
  if (state.bossDefeat) state.bossDefeat.lastTimestamp = null;
  state.motion.lastTimestamp = null;
}

function consoleMessage(text) {
  state.consoleLines.push(String(text));
  if (state.consoleLines.length > 8) state.consoleLines.shift();
  document.getElementById('consoleOutput').textContent = state.consoleLines.join('\n');
}

function openConsole() {
  if (state.consoleOpen || state.helpOpen) return;
  state.consoleOpen = true;
  state.consoleLines = [];
  state.consoleHistoryIndex = state.consoleHistory.length;
  document.getElementById('devConsole').hidden = false;
  const input = document.getElementById('consoleInput');
  input.value = '';
  consoleMessage('Commands: loadLevel <1-100> · godMode 0|1 · help · clear');
  stopMotionAnimation();
  input.focus?.();
}

function closeConsole() {
  if (!state.consoleOpen) return;
  state.consoleOpen = false;
  document.getElementById('devConsole').hidden = true;
  state.lastTick = Date.now();
  if (state.ending) state.ending.lastTimestamp = null;
  if (state.bossIntro) state.bossIntro.lastTimestamp = null;
  if (state.bossDefeat) state.bossDefeat.lastTimestamp = null;
  stopMotionAnimation(); requestMotionFrame();
  (state.started ? canvas : document.getElementById('startGame')).focus?.();
}

function toggleConsole() {
  if (state.consoleOpen) closeConsole(); else openConsole();
}

function loadLevel(raw) {
  const depth = Number(raw);
  if (!Number.isInteger(depth) || depth < 1 || depth > FINAL_DEPTH) {
    consoleMessage(`Usage: loadLevel <1-${FINAL_DEPTH}>`);
    return;
  }
  if (!state.started) startGame();
  clearBossIntro();
  clearBossDefeat();
  clearMonsterSpeech();
  stopEndingAnimation();
  clearMovementAnimation();
  state.ending = null;
  state.gameOver = false;
  state.won = false;
  state.pause = null;
  state.bossIntroSeen = false;
  state.player.hp = state.player.maxHp;
  state.player.mp = state.player.maxMp;
  state.combatElapsed = 0;
  state.healElapsed = 0;
  state.manaRegenAt = state.activeTime;
  state.lastTick = Date.now();
  enterFloor(depth, false, true);
  log(`Cheat: loaded depth ${depth}.`);
  consoleMessage(`Loaded depth ${depth} (${state.biome})${state.boss ? ` — ${state.boss.name}` : ''}.`);
  render();
}

function setGodMode(raw) {
  const value = String(raw ?? '').toLowerCase();
  const enabled = value === '1' || value === 'on' || value === 'true' ? true
    : value === '0' || value === 'off' || value === 'false' ? false
      : value === '' ? !state.godMode : null;
  if (enabled === null) { consoleMessage('Usage: godMode 0|1'); return; }
  if (enabled && !state.godMode) state.godModeStats = snapshotPlayerStats();
  if (!enabled) state.godModeStats = null;
  state.godMode = enabled;
  freezePlayerStats();
  consoleMessage(`God mode ${state.godMode ? 'enabled' : 'disabled'}; hero stats are frozen.`);
  render();
}

function submitConsole() {
  const input = document.getElementById('consoleInput');
  const text = input.value.trim();
  input.value = '';
  if (!text) return;
  if (!state.consoleHistory.length || state.consoleHistory[state.consoleHistory.length - 1] !== text) state.consoleHistory.push(text);
  state.consoleHistoryIndex = state.consoleHistory.length;
  consoleMessage(`> ${text}`);
  const [name, ...args] = text.split(/\s+/);
  const command = name.toLowerCase();
  if (command === 'loadlevel') loadLevel(args[0]);
  else if (command === 'godmode') setGodMode(args[0]);
  else if (command === 'clear') { state.consoleLines = []; document.getElementById('consoleOutput').textContent = ''; }
  else if (command === 'help') consoleMessage('loadLevel <1-100> · godMode 0|1 · help · clear');
  else consoleMessage(`Unknown command: ${name}`);
}

function consoleHistoryStep(delta) {
  if (!state.consoleHistory.length) return;
  state.consoleHistoryIndex = Math.max(0, Math.min(state.consoleHistory.length, state.consoleHistoryIndex + delta));
  document.getElementById('consoleInput').value = state.consoleHistory[state.consoleHistoryIndex] || '';
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
  freezePlayerStats();
  checkHealth();
  renderPause();
  const p = state.player;
  draw();
  renderMinimap();
  document.getElementById('hpText').textContent = `${p.hp}/${p.maxHp}`;
  document.getElementById('hpfill').style.width = (100 * p.hp / p.maxHp) + '%';
  document.getElementById('mpText').textContent = `${p.mp}/${p.maxMp}`;
  document.getElementById('mpfill').style.width = (100 * p.mp / p.maxMp) + '%';
  document.getElementById('lvl').textContent = p.lvl;
  document.getElementById('xpfill').style.width = (100 * p.xp / p.xpNext) + '%';
  document.getElementById('depth').textContent = state.area === 'town' ? 'Town' : state.depth;
  document.getElementById('kills').textContent = state.kills;
  document.getElementById('turn').textContent = state.turn;
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('potions').textContent = state.inventory.length;
  document.getElementById('scrolls').textContent = state.townScrolls;
  document.getElementById('keyStatus').textContent = !state.floorKey ? '—' : state.floorKey.collected ? 'Unlocked' : state.floorKey.drop ? 'Dropped' : 'Missing';
  document.getElementById('posText').textContent = `${p.x + 1},${p.y + 1}`;
  document.getElementById('retreatStatus').textContent = retreatRemaining() > 0 ? `${Math.ceil(retreatRemaining())}s` : 'Ready';
  document.getElementById('companionStat').hidden = !state.companion;
  document.getElementById('companionName').textContent = state.companion ? state.companion.name : '';
  document.getElementById('godModeStat').hidden = !state.godMode;
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
  document.getElementById('merchantStock').textContent = m ? `${state.area === 'town' ? 'Store' : 'Merchant'}: ${stock}` : '';
  document.getElementById('merchantStock').hidden = !m;
}

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  const consoleInput = document.getElementById('consoleInput');
  if (state.consoleOpen) {
    if (k === '`' || k === '~' || k === 'escape') { e.preventDefault(); closeConsole(); return; }
    if (e.target === consoleInput) {
      if (k === 'enter') { e.preventDefault(); submitConsole(); }
      else if (k === 'arrowup') { e.preventDefault(); consoleHistoryStep(-1); }
      else if (k === 'arrowdown') { e.preventDefault(); consoleHistoryStep(1); }
      else if (k === 'tab') { e.preventDefault(); document.getElementById('consoleClose').focus?.(); }
      return;
    }
    e.preventDefault();
    if (k === 'enter' || k === 'tab') consoleInput.focus?.();
    return;
  }
  if (k === '`' || k === '~') {
    e.preventDefault();
    if (!e.repeat) toggleConsole();
    return;
  }
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
  if (bossCinematicActive()) {
    if (k === 'escape' && !e.repeat) {
      if (bossIntroActive()) skipBossIntro(); else skipBossDefeat();
    }
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
  else if (k === 'j') useTownScroll();
  else if (k === 'x') sellToMerchant();
  else if (k === 'q' || k === 'backspace') ascendStairs();
  else if (k === 'enter') retreat();
  else if (k === 'e') shootBow();
  else if (k === 'f') castSpell('fireball');
  else if (k === 'g') castSpell('heal');
  else if (k === 'v') castSpell('frostbolt');
  else if (k === 'b') castSpell('greaterHeal');
  else if (k === 'z') castSpell('magicBarrier');
});

document.addEventListener('visibilitychange', () => {
  state.lastTick = Date.now();
  if (state.ending) state.ending.lastTimestamp = null;
  if (state.bossIntro) state.bossIntro.lastTimestamp = null;
  if (state.bossDefeat) state.bossDefeat.lastTimestamp = null;
  stopMotionAnimation(); requestMotionFrame();
});

for (const [id, action] of [
  ['skipEnding', skipEnding], ['restartEnding', restartFromEnding], ['startGame', startGame], ['drinkPotion', drinkPotion], ['continueGame', continueGame], ['retreatChoice', retreat],
  ['confirmRetreat', confirmRetreat], ['cancelRetreat', cancelRetreat], ['audioToggle', toggleAudio],
  ['helpToggle', toggleHelp], ['closeHelp', closeHelp], ['consoleClose', closeConsole],
]) document.getElementById(id).addEventListener('click', () => { startAudio(); action(); });

for (const channel of ['music', 'effects']) {
  document.getElementById(`${channel}Volume`).addEventListener('input', e => {
    startAudio(); setAudioVolume(channel, e.target.value);
  });
}

newGame();
render();
setInterval(enemyTick, 220);
