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
  { name: 'Frostbolt Tome', sprite: 'frostboltTome', gold: 70, kind: 'spellbook', spell: 'frostbolt', minDepth: 2 },
  { name: 'Greater Heal Tome', sprite: 'greaterHealTome', gold: 85, kind: 'spellbook', spell: 'greaterHeal', minDepth: 4 },
  { name: 'Magic Barrier Tome', sprite: 'barrierTome', gold: 95, kind: 'spellbook', spell: 'magicBarrier', minDepth: 5 },
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
  boss: ['I was much taller before our little arrangement.', 'Congratulations. I now yearn for a smaller office.', 'Technically, I still haunt this floor. Rent free.'],
  trap: ['You walked into that with such confidence.', 'The floor warned you. I admired your commitment.', 'I died to one of those once. You are doing fine.'],
  retreat: ['A strategic retreat. A very noble word for jogging away.', 'Cowardice with excellent timing.', 'I approve. Mostly because I am not carrying you.'],
  merchant: ['Bought everything? The pouch is now a memorial.', 'That merchant smiled like you were the Quest.', 'You now own six things you cannot use. Character growth.'],
  rescue: ['Another prisoner rescued. My old union is impressed.', 'You cut the ropes. I will take the credit in small font.', 'Heroic. Expensive. Occasionally useful.'],
  sidekick: ['I am here for backup and moral support. Mostly backup.', 'Keep moving. I have a reputation for bravery to maintain.', 'If this goes badly, I was never here.'],
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

const COMPANION_FOG_RADIUS = 2, CAT_COMPANION_SCALE = 1.5, CAT_BAT_BONUS = 1;

const COMPANIONS = {
  marmalade: { id: 'marmalade', name: 'Marmalade', sprite: 'catCompanion', scale: CAT_COMPANION_SCALE, kind: 'cat', behavior: 'cat', linePool: 'cat', damage: 1, batBonus: CAT_BAT_BONUS, unlock: 'start', townActor: 'isEntranceCat', desc: 'Gate cat. Prefers bats, talks about payroll.' },
  pip: { id: 'pip', name: 'Pip', sprite: 'dog', scale: 0.7, kind: 'sidekick', behavior: 'sidekick', linePool: 'sidekick', damage: 1, unlock: 'start', townActor: 'Pip', desc: 'Town dog. Loyal, simple, hits for 1.' },
  mimic: { id: 'mimic', name: 'Mimic', sprite: 'mimic', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Mimic to unlock.' },
  hydra: { id: 'hydra', name: 'Hydra', sprite: 'hydra', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Hydra to unlock.' },
  boar: { id: 'boar', name: 'Wild Boar', sprite: 'boar', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Wild Boar to unlock.' },
  medusa: { id: 'medusa', name: 'Medusa', sprite: 'medusa', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Medusa to unlock.' },
  wizard: { id: 'wizard', name: 'Dark Wizard', sprite: 'darkWizard', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Dark Wizard to unlock.' },
  skeletonKing: { id: 'skeletonKing', name: 'Skeleton King', sprite: 'skeletonKing', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Skeleton King to unlock.' },
  dragon: { id: 'dragon', name: 'Dragon', sprite: 'dragonBoss', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Dragon to unlock.' },
  cook: { id: 'cook', name: 'Cook', sprite: 'cook', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Cook to unlock.' },
  bartender: { id: 'bartender', name: 'Bartender', sprite: 'bartender', scale: 0.55, kind: 'boss', behavior: 'boss', linePool: 'boss', damage: 1, unlock: 'defeat', desc: 'Defeat Bartender to unlock.' },
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
const GAME_VERSION = '2.1.0';
// Brief quotations from Monty Python and the Holy Grail; official sources in README.
const MONSTER_QUOTES = ['Ni!', 'None shall pass!', "'Tis but a scratch.", 'Run away!'];
const MONSTER_SPEECH_DURATION = 5, MONSTER_SPEECH_INTERVAL = 5;
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
  if (name === 'cook') return 'cook';
  if (name === 'bartender') return 'bartender';
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
  const learned = learnSpellState(state.player.spells, state.spellReadyAt, spellName, state.activeTime);
  if (!learned) return false;
  state.player.spells[spellName] = learned.spells[spellName];
  state.spellReadyAt[spellName] = learned.spellReadyAt[spellName];
  const spell = SPELLS[spellName];
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

function companionDef(id) {
  return COMPANIONS[id] || null;
}

function isCompanionUnlocked(id) {
  return !!state.unlockedCompanions && state.unlockedCompanions.includes(id);
}

function unlockCompanion(id) {
  if (!id || !COMPANIONS[id]) return false;
  if (!state.unlockedCompanions) state.unlockedCompanions = ['marmalade', 'pip'];
  if (state.unlockedCompanions.includes(id)) return false;
  state.unlockedCompanions.push(id);
  log(`${COMPANIONS[id].name} is now available at the companion board.`);
  return true;
}

function makeCompanion(id, x, y) {
  const def = companionDef(id);
  if (!def) return null;
  return { id: def.id, name: def.name, sprite: def.sprite, kind: def.kind, behavior: def.behavior, linePool: def.linePool,
    damage: def.damage || 1, batBonus: def.batBonus || 0, scale: def.scale, x, y };
}

function selectedCompanionActor() {
  const id = state.selectedCompanion || 'marmalade';
  if (id === 'marmalade') return entranceCatActor();
  if (id === 'pip') return state.town && (state.town.animals || []).find(a => a.name === 'Pip') || null;
  return null;
}

function clearCompanionMotion() {
  if (!state.motion) return;
  delete state.motion.moves.companion;
  delete state.motion.directions.companion;
  delete state.motion.facing.companion;
}

function syncStarterActors() {
  if (!state.town) return;
  const active = state.companion && state.companion.id;
  for (const actor of state.town.animals || []) {
    if (actor.isEntranceCat) actor.hidden = active === 'marmalade';
    else if (actor.name === 'Pip') actor.hidden = active === 'pip';
  }
}

function activateCompanion(id, x = state.player.x, y = state.player.y) {
  if (!isCompanionUnlocked(id)) return false;
  const companion = makeCompanion(id, x, y);
  if (!companion) return false;
  clearCompanionMotion();
  state.companion = companion;
  state.selectedCompanion = id;
  state.companionSpeech = null;
  state.companionSpeechReadyAt = state.activeTime;
  state.companionAttackAt = state.activeTime + 3;
  if (id === 'marmalade' && state.entranceCat) state.entranceCat.recruited = true;
  syncStarterActors();
  placeCompanionNearPlayer();
  return true;
}

function resetCompanionRun() {
  closeCompanionBoard(state && state.companionPicker, false);
  clearCompanionMotion();
  state.companion = null;
  state.companionSpeech = null;
  state.companionSpeechReadyAt = 0;
  state.companionQuoteIndex = 0;
  state.companionAttackAt = 0;
  state.selectedCompanion = 'marmalade';
  state.companionChoice = 'marmalade';
  state.unlockedCompanions = ['marmalade', 'pip'];
  state.companionEntryDone = false;
  state.companionPicker = null;
  state.entranceCat = freshEntranceCatState();
  document.getElementById('companionOverlay').hidden = true;
  syncStarterActors();
}

function joinSelectedCompanion(auto) {
  if (state.companion || state.companionEntryDone) return false;
  const selected = companionDef(state.selectedCompanion);
  const id = selected && selected.unlock === 'start' && isCompanionUnlocked(selected.id) ? selected.id : 'marmalade';
  state.selectedCompanion = id;
  const actor = selectedCompanionActor();
  if (!activateCompanion(id, actor ? actor.x : state.player.x, actor ? actor.y : state.player.y)) return false;
  if (auto) {
    state.companionEntryDone = true;
    state.entranceCat.entered = true;
  }
  if (id === 'marmalade') {
    log(auto ? 'Marmalade hops in before you can leave. "Someone has to buy the meat."' : 'Marmalade agrees to join you. "The wife and children are counting on this."');
  } else {
    log(auto ? `${state.companion.name} trots in before you can leave.` : `${state.companion.name} joins your party.`);
  }
  return true;
}

function joinEntranceCat(auto) { return joinSelectedCompanion(auto); }

function talkToEntranceCat() {
  if (state.trade) return;
  if (!joinSelectedCompanion(false)) return false;
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
  if (!m || !m.isBoss) return false;
  const id = bossKind(m);
  unlockCompanion(id);
  if (!activateCompanion(id)) return false;
  log(`${m.name} agrees to join you as a tiny, reluctant companion.`);
  return true;
}

function companionTalk(kind) {
  if (!state.companion || state.gameOver || state.activeTime < state.companionSpeechReadyAt) return;
  const def = companionDef(state.companion.id);
  const poolName = def ? def.linePool : state.companion.kind === 'cat' ? 'cat' : 'boss';
  const pool = poolName === 'sidekick' ? COMPANION_LINES.sidekick
    : poolName === 'cat' ? (CAT_LINES[kind] || COMPANION_LINES[kind]) : (COMPANION_LINES[kind] || CAT_LINES[kind]);
  if (!pool || !pool.length) return;
  const text = pool[state.companionQuoteIndex % pool.length];
  state.companionQuoteIndex++;
  state.companionSpeech = { text, expiresAt: state.activeTime + 5 };
  state.companionSpeechReadyAt = state.activeTime + 7;
  log(`${state.companion.name}: “${text}”`);
}

function simulationBlocked() {
  return !state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.pause
    || state.trade || state.companionPicker || state.loadSession || document.hidden || state.ending || bossCinematicActive();
}

function companionTick() {
  if (state.area === 'town' || simulationBlocked()) return;
  const companion = state.companion;
  if (!companion || state.gameOver) return;
  if (state.companionSpeech && state.activeTime >= state.companionSpeech.expiresAt) state.companionSpeech = null;
  if (state.activeTime < state.companionAttackAt) return;
  state.companionAttackAt = state.activeTime + 3;
  const targets = visibleTargets(3, companion);
  if (!targets.length) return;
  const behavior = companion.behavior || (companion.kind === 'cat' ? 'cat' : 'boss');
  const target = behavior === 'cat' ? (targets.find(m => m.sprite === 'bat') || targets[0])
    : behavior === 'sidekick' ? nearestVisibleTarget(3, companion) : targets[0];
  if (behavior === 'cat' && target.sprite === 'bat') companionTalk('bat');
  spawnProjectile('bolt', companion, target, 0.25);
  const damage = behavior === 'cat' && target.sprite === 'bat' ? (companion.damage || 1) + (companion.batBonus || 0) : (companion.damage || 1);
  damageMonster(target, damage);
}

function drawCompanion() {
  const companion = state.companion;
  if (!companion || state.gameOver || !Number.isInteger(companion.x) || !Number.isInteger(companion.y)) return;
  const scale = companion.scale || 0.55;
  const sprite = companion.kind==='boss' && companion.name==='Cook' ? 'cook' : companion.kind==='boss' && companion.name==='Bartender' ? 'bartender' : companion.sprite;
  if (!inArtCamera(sprite,companion.x,companion.y,scale) || fogLevel(companion.x,companion.y)>=3) return;
  const position = actorRenderPosition(companion);
  const cx = position.x * TILE + TILE / 2, cy = worldSpriteCenterY(sprite,position.y,scale);
  drawActorSprite(sprite, cx, cy, scale, companion);
  if (!state.companionSpeech || bossCinematicActive()) return;
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

// Portable save format v1: explicit DTO and strict validation; live commit/transport are separate below.
const SAVE_FORMAT = 'dungeon-crawler-save', SAVE_FORMAT_VERSION = 1;
const SAVE_MAX_BYTES = 32 * 1024 * 1024, SAVE_MAX_NODES = 4000000, SAVE_MAX_DEPTH = 16;
const SAVE_RUN_FIELDS = ['depth','area','kills','turn','player','spellReadyAt','inventory','townScrolls','gold','equipment',
  'warnedLow','warnedCritical','combatElapsed','healElapsed','activeTime','manaRegenAt','retreatReadyAt',
  'selectedCompanion','unlockedCompanions','companionChoice','companionEntryDone','companion',
  'companionSpeechReadyAt','companionQuoteIndex','companionAttackAt','entranceCat','townExit','townPortalOpen',
  'monsterSpeechReadyAt','monsterQuoteIndex','messages'];
const SAVE_MONSTER_FIELDS = ['name','sprite','x','y','hp','maxHp','atk','def','xp','gold','id','minDepth','range',
  'ranged','projectile','magic','magicType','magicRange','isBoss','isThemed','themedType','throne','summons',
  'dragon','isDragon','isThroneBoss','nextAttackAt','isGuard'];

function saveRequire(condition, message) {
  if (!condition) throw new Error(`Invalid save: ${message}`);
}

function saveFields(value, required, optional = []) {
  saveRequire(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected record');
  const allowed = required.concat(optional);
  saveRequire(Object.keys(value).every(key => allowed.includes(key)), 'unknown record field');
  saveRequire(required.every(key => Object.prototype.hasOwnProperty.call(value, key)), 'missing record field');
}

function saveList(value, max, min = 0) {
  saveRequire(Array.isArray(value) && value.length >= min && value.length <= max, 'array length/type');
}

function saveNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false) {
  saveRequire(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    && (!integer || Number.isInteger(value)), 'number range/type');
}

function saveCount(value, min = 0, max = Number.MAX_SAFE_INTEGER) { saveNumber(value, min, max, true); }
function saveBoolean(value) { saveRequire(typeof value === 'boolean', 'expected boolean'); }
function saveEnum(value, choices) { saveRequire(choices.includes(value), 'unknown identity'); }
function saveText(value, max) { saveRequire(typeof value === 'string' && value.length <= max, 'text length/type'); }

function savePoint(value, map = null) {
  saveCount(value.x, 0, W - 1); saveCount(value.y, 0, H - 1);
  if (map) saveRequire(map[value.y][value.x] === 0, 'actor/object on blocked tile');
}

function saveTile(value, map = null) { saveFields(value, ['x','y']); savePoint(value, map); }

// UTF-8 accounting without a runtime TextEncoder dependency (also works in the no-DOM VM).
function scanSaveText(text, scan, end) {
  let i=scan.index, bytes=scan.bytes, depth=scan.depth, quoted=scan.quoted, escaped=scan.escaped;
  for (;i<end;i++) {
    const code=text.charCodeAt(i), char=text[i];
    if (code<128) bytes++;
    else if (code<2048) bytes+=2;
    else if (code>=0xd800 && code<=0xdbff && text.charCodeAt(i+1)>=0xdc00 && text.charCodeAt(i+1)<=0xdfff) { bytes+=4;i++; }
    else bytes+=3;
    saveRequire(bytes<=SAVE_MAX_BYTES,'UTF-8 size exceeds 32 MiB');
    if (quoted) { if (escaped) escaped=false; else if (char==='\\') escaped=true; else if (char==='"') quoted=false; }
    else if (char==='"') quoted=true;
    else if (char==='{' || char==='[') { depth++;saveRequire(depth<=SAVE_MAX_DEPTH,'nesting exceeds 16'); }
    else if (char==='}' || char===']') depth--;
  }
  scan.index=i;scan.bytes=bytes;scan.depth=depth;scan.quoted=quoted;scan.escaped=escaped;
}

function* saveTextBudgetSteps(text) {
  saveText(text,SAVE_MAX_BYTES);
  const scan={index:0,bytes:0,depth:0,quoted:false,escaped:false};
  while(scan.index<text.length) { scanSaveText(text,scan,Math.min(text.length,scan.index+65536));yield; }
  return scan.bytes;
}

function drainSaveSteps(steps) {
  let next;do { next=steps.next(); } while(!next.done);return next.value;
}

function saveTextBudget(text) { return drainSaveSteps(saveTextBudgetSteps(text)); }

function saveScalarBytes(value) {
  const text=JSON.stringify(value);
  return /^[\x00-\x7f]*$/.test(text) ? text.length : saveTextBudget(text);
}

// Iterative preflight before stringify/typed validation: no getters, custom prototypes, cycles or coercion.
function* saveStructureSteps(value) {
  const stack = [{ value, depth: 0 }], ancestors = new WeakSet();
  let nodes = 0, bytes = 0, work=0;
  while (stack.length) {
    if (++work%4096===0) yield;
    const item = stack.pop(), v = item.value;
    if (item.keys) {
      if (item.index === item.keys.length) { ancestors.delete(v); continue; }
      const key = item.keys[item.index++];
      saveRequire(!['__proto__','prototype','constructor'].includes(key), 'dangerous field');
      const descriptor = Object.getOwnPropertyDescriptor(v,key);
      saveRequire(Object.prototype.hasOwnProperty.call(descriptor,'value'), 'accessor field');
      if (!Array.isArray(v)) bytes += saveScalarBytes(key) + 1;
      stack.push(item, { value:descriptor.value, depth:item.depth+1 });
      continue;
    }
    saveRequire(++nodes <= SAVE_MAX_NODES, 'structure exceeds 4000000 nodes');
    if (v === null || ['boolean','string','number'].includes(typeof v)) {
      if (typeof v === 'number') saveRequire(Number.isFinite(v), 'nonfinite number');
      if (typeof v === 'string') saveText(v,512);
      bytes += saveScalarBytes(v);
      saveRequire(bytes <= SAVE_MAX_BYTES, 'UTF-8 size exceeds 32 MiB');
      continue;
    }
    saveRequire(typeof v === 'object', 'non-JSON value');
    saveRequire(item.depth < SAVE_MAX_DEPTH && !ancestors.has(v), 'nesting/cycle');
    const array = Array.isArray(v), prototype = Object.getPrototypeOf(v);
    saveRequire(prototype === (array ? Array.prototype : Object.prototype) || (!array && prototype === null), 'custom prototype');
    if (array) saveRequire(v.length<=65536,'array exceeds format limit');
    const keys = Object.keys(v);
    saveRequire(keys.length <= SAVE_MAX_NODES - nodes, 'structure exceeds 4000000 nodes');
    saveRequire(array || keys.length<=128, 'record field limit');
    saveRequire(Object.getOwnPropertySymbols(v).length === 0, 'symbol field');
    saveRequire(Object.getOwnPropertyNames(v).length === keys.length+(array?1:0), 'non-enumerable field');
    if (array) saveRequire(keys.length === v.length && keys.every((key,i) => key === String(i)), 'sparse/extended array');
    bytes += 2 + Math.max(0,keys.length-1);
    saveRequire(bytes <= SAVE_MAX_BYTES, 'UTF-8 size exceeds 32 MiB');
    ancestors.add(v); stack.push({ value:v, keys, index:0, depth:item.depth });
  }
  return nodes;
}

function saveStructure(value) { return drainSaveSteps(saveStructureSteps(value)); }

function saveMap(map) {
  saveList(map, H, H);
  for (const row of map) { saveList(row,W,W); for (const tile of row) saveCount(tile,0,2); }
}

function saveVisited(visited) {
  saveList(visited,W*H);
  const seen = new Set();
  for (const key of visited) {
    saveText(key,5); saveRequire(/^(0|[1-9][0-9]*),(0|[1-9][0-9]*)$/.test(key), 'noncanonical visited coordinate');
    const [x,y] = key.split(',').map(Number); savePoint({x,y});
    saveRequire(!seen.has(key),'duplicate visited coordinate'); seen.add(key);
  }
}

function saveUniqueIds(rows) {
  const ids = new Set();
  for (const row of rows) {
    saveRequire(row !== null && typeof row === 'object' && !Array.isArray(row),'ID record');
    saveCount(row.id); saveRequire(!ids.has(row.id),'duplicate scoped ID'); ids.add(row.id);
  }
}

function saveItem(item, map = null) {
  saveFields(item,['name'],['sprite','gold','kind','heal','atk','str','range','def','dex','maxHp','spell','minDepth','scroll','lootWeight','x','y','id']);
  const def = ITEM_TABLE.find(d => d.name === item.name);
  saveRequire(!!def,'unknown item');
  saveFields(item,Object.keys(def),['x','y','id']);
  for (const key of Object.keys(def)) saveRequire(item[key] === def[key],'item identity/modifier mismatch');
  if ('id' in item) saveCount(item.id);
  saveRequire(('x' in item) === ('y' in item),'partial item position');
  if ('x' in item) savePoint(item,map);
}

function saveMerchant(merchant, map, town = false) {
  saveFields(merchant,['x','y','isMerchant','stock'].concat(town?['sprite']:[]));
  savePoint(merchant,map); saveRequire(merchant.isMerchant === true,'merchant role');
  if (town) saveRequire(merchant.sprite === 'store','town store role');
  saveList(merchant.stock,6); saveUniqueIds(merchant.stock);
  for (const item of merchant.stock) { saveItem(item); saveRequire('id' in item && !('x' in item),'stock placement'); }
}

function saveMonsterDefinition(monster, depth) {
  if (monster.isBoss) {
    const boss = bossForDepth(depth), themed = THEMED_FLOORS[depth];
    if (boss) return { ...boss, maxHp:boss.hp, id:999, isBoss:true, isDragon:boss.dragon, isThroneBoss:!!boss.throne };
    saveRequire(!!themed,'boss at wrong depth');
    const scale = 1 + (depth-1)*0.35;
    return {name:themed.name,sprite:themed.sprite,maxHp:Math.round(100*(1+(depth-1)*0.2)),
      atk:Math.round(20*(1+(depth-1)*0.15)),def:6+Math.floor(depth/5),xp:Math.round(150*scale),
      gold:Math.round(100*scale),id:999,isBoss:true,isThemed:true,themedType:themed.kind,
      ranged:themed.kind==='pub',range:themed.kind==='pub'?4:0,projectile:'beer'};
  }
  const def = MONSTER_TYPES.find(d => d.name === monster.name);
  saveRequire(!!def && depth >= (def.minDepth || 1),'ordinary monster identity/depth');
  if (monster.isGuard) saveRequire(depth === 50 && def.name === 'Skeleton' && monster.id >= 1000,'guard identity/depth');
  else saveCount(monster.id,0,39);
  return {...def,maxHp:Math.round(def.hp*(1+(depth-1)*0.2)),
    atk:Math.round(def.atk*(1+(depth-1)*(def.ranged||def.magic?0.1:0.15))),
    def:def.def+Math.floor((depth-1)/2),xp:Math.round(def.xp*(1+(depth-1)*0.35)),
    gold:Math.max(2,Math.round(5*(1+(depth-1)*0.35))),id:monster.id,...(monster.isGuard?{isGuard:true}:{})};
}

function saveMonster(monster, depth, map, current) {
  saveFields(monster,['name','sprite','x','y','hp','maxHp','atk','def','xp','gold','id'].concat(current?['nextAttackAt']:[]),SAVE_MONSTER_FIELDS);
  savePoint(monster,map); saveCount(monster.id); saveNumber(monster.hp,-Number.MAX_SAFE_INTEGER,monster.maxHp,true);
  if (current) saveNumber(monster.nextAttackAt);
  else saveRequire(monster.hp === monster.maxHp && !('nextAttackAt' in monster) && !('isGuard' in monster),'template mutable state');
  const expected = saveMonsterDefinition(monster,depth);
  for (const key of SAVE_MONSTER_FIELDS) {
    if (['x','y','hp','nextAttackAt'].includes(key)) continue;
    saveRequire(monster[key] === expected[key],`monster definition: ${key}`);
  }
}

function saveFloorData(floor, depth) {
  saveFields(floor,FLOOR_FIELDS.concat('descentRewarded'));
  saveMap(floor.map); saveVisited(floor.visited); saveBoolean(floor.descentRewarded); saveBoolean(floor.bossDefeated);
  saveRequire(floor.biome === biomeForDepth(depth),'floor biome/depth'); saveNumber(floor.hazardTime);
  saveList(floor.rooms,32,1);
  for (const room of floor.rooms) {
    saveFields(room,['x','y','w','h','cx','cy'],['isArena','isThroneRoom']); savePoint(room);
    saveCount(room.w,1,W-room.x); saveCount(room.h,1,H-room.y);
    saveRequire(room.cx === room.x+(room.w>>1) && room.cy === room.y+(room.h>>1),'room center');
    for (const key of ['isArena','isThroneRoom']) if (key in room) saveBoolean(room[key]);
    if (room.isThroneRoom) saveRequire(depth === 50 && room.isArena,'throne room role');
  }
  const bossFloor = !!(BOSSES[depth] || THEMED_FLOORS[depth]);
  saveRequire(floor.rooms.filter(r=>r.isArena).length === (bossFloor?1:0),'arena/depth');
  saveList(floor.monsterSpawns,41); saveUniqueIds(floor.monsterSpawns);
  for (const monster of floor.monsterSpawns) saveMonster(monster,depth,floor.map,false);
  saveRequire(floor.monsterSpawns.filter(m=>m.isBoss).length === (bossFloor?1:0),'boss template/depth');
  if (!bossFloor) saveRequire(!floor.bossDefeated,'defeat on non-boss floor');
  saveTile(floor.stairs,floor.map); saveTile(floor.upstairs,floor.map);
  saveList(floor.potions,4+Math.floor(depth/3));
  for (const potion of floor.potions) { saveFields(potion,['x','y','heal']); savePoint(potion,floor.map); saveNumber(potion.heal,0.25,0.6); saveRequire(potion.heal<0.6,'potion fraction'); }
  saveList(floor.treasures,4+Math.floor(depth/4)); saveUniqueIds(floor.treasures);
  for (const item of floor.treasures) { saveItem(item,floor.map); saveRequire('x' in item && 'id' in item,'world item placement'); }
  const merchantFloor = !bossFloor && depth%2 === 0;
  saveRequire((floor.merchant !== null) === merchantFloor && (floor.prisoner !== null) === merchantFloor,'NPC/depth');
  if (floor.merchant) saveMerchant(floor.merchant,floor.map);
  if (floor.prisoner) { saveFields(floor.prisoner,['x','y','rescued','isPrisoner']); savePoint(floor.prisoner,floor.map); saveBoolean(floor.prisoner.rescued); saveRequire(floor.prisoner.isPrisoner === true,'prisoner role'); }
  saveRequire((floor.princess !== null) === (depth === FINAL_DEPTH),'princess/depth');
  if (floor.princess) { saveFields(floor.princess,['x','y','rescued','isPrincess']); savePoint(floor.princess,floor.map); saveRequire(floor.princess.isPrincess === true && floor.princess.rescued === false,'living princess state'); }
  if (depth === FINAL_DEPTH) saveRequire(floor.floorKey === null,'final floor key');
  else {
    const key = floor.floorKey; saveFields(key,['carrierId','dropped','collected','drop']);
    saveCount(key.carrierId); saveBoolean(key.dropped); saveBoolean(key.collected);
    saveRequire(floor.monsterSpawns.some(m=>m.id===key.carrierId && !m.isBoss),'key carrier template');
    saveRequire(key.collected ? key.dropped && key.drop === null : key.dropped === (key.drop !== null),'key drop/collection');
    if (key.drop !== null) saveTile(key.drop,floor.map);
  }
  saveList(floor.obstacles,14+Math.floor(depth/2));
  const blocked = new Set();
  for (const obstacle of floor.obstacles) {
    saveFields(obstacle,['x','y','type']); savePoint(obstacle); saveEnum(obstacle.type,['pillar','rubble']);
    const key = `${obstacle.x},${obstacle.y}`;
    saveRequire(floor.map[obstacle.y][obstacle.x] === 2 && !blocked.has(key),'obstacle/map'); blocked.add(key);
  }
  saveRequire(floor.map.reduce((n,row)=>n+row.filter(v=>v===2).length,0) === blocked.size,'unrecorded obstacle');
  saveList(floor.props,76);
  for (const prop of floor.props) { saveFields(prop,['x','y','sprite']); savePoint(prop,floor.map); saveEnum(prop.sprite,[BIOMES[floor.biome].prop,...(depth===50?['throne','torch','banner','tombstone']:[])]); }
  saveList(floor.hazards,24+depth);
  const hazardTiles = new Set();
  for (const hazard of floor.hazards) {
    saveFields(hazard,['x','y','type','revealed','triggered','stage','offset','nextDamageAt','impactAt']);
    savePoint(hazard,floor.map); saveEnum(hazard.type,['spikes','flame','rocks']); saveEnum(hazard.stage,['idle','warning','spent']);
    saveBoolean(hazard.revealed); saveBoolean(hazard.triggered); saveNumber(hazard.offset,0,6); saveRequire(hazard.offset<6,'hazard offset');
    saveNumber(hazard.nextDamageAt);
    const key = `${hazard.x},${hazard.y}`; saveRequire(!hazardTiles.has(key),'duplicate hazard'); hazardTiles.add(key);
    if (hazard.type === 'rocks') {
      saveRequire(hazard.revealed && hazard.triggered === (hazard.stage !== 'idle'),'rock state');
      if (hazard.triggered) saveNumber(hazard.impactAt); else saveRequire(hazard.impactAt === null,'idle rock impact');
    } else {
      saveRequire(hazard.stage === 'idle' && hazard.impactAt === null,'hazard stage/impact');
      if (hazard.type === 'spikes') saveRequire(hazard.revealed === hazard.triggered && hazard.nextDamageAt === 0,'spike secrecy/state');
      else saveRequire(hazard.revealed && !hazard.triggered,'flame state');
    }
  }
}

function saveTownData(town) {
  saveFields(town,['map','visited','props','npcs','animals','spawn','store','landmarks','tick','quoteIndex','nextTalkAt']);
  saveMap(town.map); saveVisited(town.visited); saveTile(town.spawn,town.map);
  saveCount(town.tick); saveCount(town.quoteIndex); saveNumber(town.nextTalkAt); saveMerchant(town.store,town.map,true);
  saveList(town.props,104,104);
  let boards = 0;
  for (const prop of town.props) {
    saveFields(prop,['x','y'],['isCompanionBoard','sprite','scale']);
    if (prop.isCompanionBoard) { saveFields(prop,['x','y','isCompanionBoard']); savePoint(prop,town.map); saveRequire(prop.isCompanionBoard===true,'board role'); boards++; }
    else { saveFields(prop,['x','y','sprite','scale']); savePoint(prop); saveEnum(prop.sprite,['water','bridge','tree','inn','store','hut','doorstep','townGate']); saveRequire(prop.scale === {water:1.6,bridge:2,tree:2,inn:3,store:3,hut:2,doorstep:1,townGate:2}[prop.sprite],'town prop scale/role'); }
  }
  saveRequire(boards === 1,'town board count');
  saveFields(town.landmarks,['inn','gate','companionBoardIndex']);
  for (const [key,sprite] of [['inn','inn'],['gate','townGate']]) {
    const mark = town.landmarks[key]; saveFields(mark,['x','y','sprite']); savePoint(mark,town.map); saveRequire(mark.sprite===sprite,'landmark role');
  }
  saveCount(town.landmarks.companionBoardIndex,0,town.props.length-1);
  saveRequire(town.props[town.landmarks.companionBoardIndex].isCompanionBoard === true,'board reference');
  const roles = {Mira:['villager',5],Bran:['villager',7],Eda:['villager',6],Tobin:['villager',8],
    Mochi:['cat',3],Pip:['dog',4],Hen:['chicken',2],Cluck:['chicken',3],Dot:['chicken',4],Marmalade:['catCompanion']};
  for (const [field,names] of [['npcs',['Mira','Bran','Eda','Tobin']],['animals',['Mochi','Pip','Hen','Cluck','Dot','Marmalade']]]) {
    saveList(town[field],names.length,names.length); const seen = new Set();
    for (const actor of town[field]) {
      saveFields(actor,['name','sprite','x','y'],['pathIndex','step','path','hidden','scale','isEntranceCat']);
      saveEnum(actor.name,names); saveRequire(!seen.has(actor.name),'duplicate town actor'); seen.add(actor.name);
      savePoint(actor,town.map); const [sprite,step] = roles[actor.name]; saveRequire(actor.sprite===sprite,'town actor role');
      if (actor.name === 'Marmalade') { saveFields(actor,['name','sprite','x','y','scale','isEntranceCat'],['hidden']); saveRequire(actor.scale===CAT_COMPANION_SCALE && actor.isEntranceCat===true,'gate cat role'); }
      else {
        saveFields(actor,['name','sprite','x','y','step','pathIndex','path'],actor.name==='Pip'?['hidden']:[]);
        saveRequire(actor.step===step,'patrol cadence'); saveList(actor.path,3,1); saveCount(actor.pathIndex,0,actor.path.length-1);
        for (const tile of actor.path) saveTile(tile,town.map);
      }
      if ('hidden' in actor) saveBoolean(actor.hidden);
    }
  }
}

function* saveRunDataSteps(run) {
  saveFields(run,SAVE_RUN_FIELDS.concat(['floors','town','encounter']));
  saveCount(run.depth,1,FINAL_DEPTH); saveEnum(run.area,['town','dungeon']);
  for (const key of ['kills','turn','townScrolls','gold','companionQuoteIndex','monsterQuoteIndex']) saveCount(run[key]);
  for (const key of ['combatElapsed','healElapsed','activeTime','manaRegenAt','retreatReadyAt','companionSpeechReadyAt','companionAttackAt','monsterSpeechReadyAt']) saveNumber(run[key]);
  for (const key of ['warnedLow','warnedCritical','companionEntryDone','townPortalOpen']) saveBoolean(run[key]);
  saveFields(run.floors,[],Array.from({length:FINAL_DEPTH},(_,i)=>String(i+1)));
  const depths = Object.keys(run.floors); saveRequire(depths.length>=1 && depths.length<=FINAL_DEPTH,'floor count');
  for (const key of depths) { saveRequire(/^[1-9][0-9]*$/.test(key),'floor depth key'); saveCount(Number(key),1,FINAL_DEPTH); saveFloorData(run.floors[key],Number(key)); yield; }
  saveRequire(!!run.floors[run.depth] && !!run.floors[1],'missing current/initial floor');
  saveTownData(run.town);
  const map = run.area === 'town' ? run.town.map : run.floors[run.depth].map, p = run.player;
  saveFields(p,['x','y','hp','maxHp','mp','maxMp','str','dex','def','lvl','xp','xpNext','spells']); savePoint(p,map);
  saveCount(p.maxHp,1); saveCount(p.hp,1,p.maxHp); saveCount(p.maxMp); saveCount(p.mp,0,p.maxMp);
  for (const key of ['str','dex','def']) saveCount(p[key]);
  saveCount(p.lvl,1,MAX_LEVEL);
  let threshold = 40; for (let level=1;level<p.lvl;level++) threshold=Math.round(threshold*1.5);
  if (p.lvl === MAX_LEVEL) threshold=1;
  saveRequire(p.xpNext === threshold,'XP threshold/level');
  saveNumber(p.xp,0,p.lvl===MAX_LEVEL?0:threshold,true); saveRequire(p.lvl===MAX_LEVEL || p.xp<threshold,'unapplied XP level');
  saveFields(p.spells,['fireball','heal'],Object.keys(SPELLS));
  for (const key of Object.keys(p.spells)) saveBoolean(p.spells[key]);
  saveRequire(p.spells.fireball && p.spells.heal,'starter spells');
  saveFields(run.spellReadyAt,Object.keys(SPELLS)); for (const value of Object.values(run.spellReadyAt)) saveNumber(value);
  saveFields(run.equipment,['weapon','armor','ring']);
  for (const slot of ['weapon','armor','ring']) if (run.equipment[slot] !== null) { saveItem(run.equipment[slot]); saveRequire(run.equipment[slot].kind===slot,'equipment slot'); }
  saveList(run.inventory,65536);
  let inventoryIndex=0;
  for (const item of run.inventory) { saveFields(item,['name','kind','heal']); saveRequire(item.name==='Potion' && item.kind==='heal','inventory role'); saveNumber(item.heal,0.25,0.6); saveRequire(item.heal<0.6,'inventory heal'); if(++inventoryIndex%256===0)yield; }
  saveList(run.messages,80); for (const line of run.messages) saveText(line,512);
  saveEnum(run.selectedCompanion,Object.keys(COMPANIONS)); saveEnum(run.companionChoice,['marmalade','pip']);
  saveList(run.unlockedCompanions,11,2); saveRequire(new Set(run.unlockedCompanions).size===run.unlockedCompanions.length,'duplicate companion unlock');
  for (const id of run.unlockedCompanions) saveEnum(id,Object.keys(COMPANIONS));
  saveRequire(['marmalade','pip',run.selectedCompanion].every(id=>run.unlockedCompanions.includes(id)),'selected/starter unlock');
  saveFields(run.entranceCat,['recruited','entered','retired']); for (const value of Object.values(run.entranceCat)) saveBoolean(value);
  saveRequire(run.entranceCat.entered===run.companionEntryDone && (!run.entranceCat.retired || run.entranceCat.recruited),'cat entry/retirement');
  if (run.companion !== null) {
    saveFields(run.companion,['id','x','y']); savePoint(run.companion,map);
    saveRequire(run.companion.id===run.selectedCompanion,'active companion selection');
    if (run.companion.id==='marmalade') saveRequire(run.entranceCat.recruited,'cat recruitment');
  }
  for (const actor of run.town.animals) if (actor.name==='Pip' || actor.name==='Marmalade') {
    const active = !!run.companion && run.companion.id === (actor.name==='Pip'?'pip':'marmalade');
    saveRequire(!!actor.hidden===active,'duplicate starter visibility');
  }
  if (run.townExit !== null) {
    saveFields(run.townExit,['depth','x','y','reason']); saveCount(run.townExit.depth,1,FINAL_DEPTH); savePoint(run.townExit);
    saveEnum(run.townExit.reason,['scroll','retreat','cheat']); saveRequire(!!run.floors[run.townExit.depth],'return floor absent');
    saveRequire(run.townPortalOpen ? run.townExit.reason!=='retreat' : run.townExit.reason==='retreat','portal reason/open state');
  } else saveRequire(!run.townPortalOpen,'portal missing return point');
  if (run.area === 'town') saveRequire(run.encounter===null,'town encounter');
  else {
    const encounter=run.encounter, floor=run.floors[run.depth];
    saveFields(encounter,['monsters','bossId','bossIntroSeen','bossSummonAt']);
    saveBoolean(encounter.bossIntroSeen); saveNumber(encounter.bossSummonAt);
    saveList(encounter.monsters,65536); saveUniqueIds(encounter.monsters);
    let encounterIndex=0;
    for (const monster of encounter.monsters) {
      saveMonster(monster,run.depth,map,true);
      if (!monster.isGuard) saveRequire(floor.monsterSpawns.some(m=>m.id===monster.id && m.name===monster.name),'encounter/template link');
      if (floor.bossDefeated && (monster.isBoss || monster.isGuard)) saveRequire(monster.hp<=0,'defeated boss/guard alive');
      if(++encounterIndex%128===0)yield;
    }
    const bosses=encounter.monsters.filter(m=>m.isBoss); saveRequire(bosses.length<=1,'multiple current bosses');
    saveRequire(encounter.bossId === (bosses.length ? bosses[0].id : null),'boss link');
    if ((BOSSES[run.depth] || THEMED_FLOORS[run.depth]) && !floor.bossDefeated) saveRequire(bosses.length===1 && bosses[0].hp>0,'missing living boss');
  }
}

function* validateSaveDataSteps(value) {
  yield* saveStructureSteps(value);
  const text=JSON.stringify(value); yield;
  yield* saveTextBudgetSteps(text);
  const data=JSON.parse(text); yield; // Detached JSON data, never a hydrated runtime or untrusted merge.
  saveFields(data,['format','formatVersion','gameVersion','createdAt','run']);
  saveRequire(data.format===SAVE_FORMAT,'format'); saveRequire(data.formatVersion===SAVE_FORMAT_VERSION,'unsupported format version');
  saveText(data.gameVersion,128); saveRequire(/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?$/.test(data.gameVersion),'game version metadata');
  saveText(data.createdAt,64); saveRequire(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.createdAt)
    && Number.isFinite(Date.parse(data.createdAt)) && new Date(data.createdAt).toISOString()===data.createdAt,'createdAt metadata');
  yield* saveRunDataSteps(data.run);
  return data;
}

function* parseSaveDataSteps(text) {
  yield* saveTextBudgetSteps(text);
  let data;
  try { data=JSON.parse(text); } catch (error) { throw new Error('Invalid save: malformed JSON'); }
  yield;
  return yield* validateSaveDataSteps(data);
}

function saveRunData(run) { return drainSaveSteps(saveRunDataSteps(run)); }
function validateSaveData(value) { return drainSaveSteps(validateSaveDataSteps(value)); }
function parseSaveData(text) { return drainSaveSteps(parseSaveDataSteps(text)); }

function savePick(source, fields) {
  saveRequire(source !== null && typeof source === 'object','missing source record');
  const copy={}; for (const key of fields) if (source[key] !== undefined) copy[key]=source[key];
  return copy;
}

function saveCaptureVisited(visited) {
  saveRequire(visited instanceof Set && visited.size<=W*H,'source exploration Set'); return [...visited];
}

function projectSaveData(source, context) {
  saveFields(context,['createdAt','hidden','tradeOpen','companionOpen']);
  for (const key of ['hidden','tradeOpen','companionOpen']) saveBoolean(context[key]);
  saveRequire(source && source.started && !source.gameOver && !source.won && source.player.hp>0
    && !source.loadSession && !source.godMode && !source.consoleOpen && !source.pause && !source.trade && !source.companionPicker
    && !source.ending && !(source.bossIntro && !source.bossIntro.completed) && !(source.bossDefeat && !source.bossDefeat.completed)
    && !context.hidden && !context.tradeOpen && !context.companionOpen,'snapshot context is not stable living play');
  const run=savePick(source,SAVE_RUN_FIELDS);
  run.companion=source.companion === null ? null : savePick(source.companion,['id','x','y']);
  run.floors={};
  saveRequire(source.floors && Object.keys(source.floors).length<=FINAL_DEPTH,'source floor count');
  for (const depth of Object.keys(source.floors)) {
    saveRequire(/^[1-9][0-9]*$/.test(depth) && Number(depth)<=FINAL_DEPTH,'source floor depth');
    const cached=source.floors[depth], active=source.area==='dungeon' && Number(depth)===source.depth;
    const floor=savePick(active?source:cached,FLOOR_FIELDS);
    floor.descentRewarded=cached.descentRewarded;
    floor.visited=saveCaptureVisited(floor.visited);
    saveList(floor.monsterSpawns,41);
    floor.monsterSpawns=floor.monsterSpawns.map(m=>savePick(m,SAVE_MONSTER_FIELDS));
    run.floors[depth]=floor;
  }
  const town=source.town, active=source.area==='town';
  run.town=savePick(town,['map','visited','props','npcs','animals','spawn','store','tick','quoteIndex','nextTalkAt']);
  if (active) { run.town.map=source.map; run.town.visited=source.visited; run.town.props=source.props; run.town.store=source.merchant; }
  run.town.visited=saveCaptureVisited(run.town.visited);
  saveList(run.town.props,104);
  run.town.landmarks={inn:town.landmarks.inn,gate:town.landmarks.gate,
    companionBoardIndex:run.town.props.indexOf(town.landmarks.companionBoard)};
  run.encounter=null;
  if (source.area==='dungeon') {
    saveList(source.monsters,65536);
    run.encounter={monsters:source.monsters.map(m=>savePick(m,SAVE_MONSTER_FIELDS)),
      bossId:source.boss?source.boss.id:null,bossIntroSeen:source.bossIntroSeen,bossSummonAt:source.bossSummonAt};
  }
  return {format:SAVE_FORMAT,formatVersion:SAVE_FORMAT_VERSION,gameVersion:GAME_VERSION,createdAt:context.createdAt,run};
}

function captureSaveData(source,context) { return validateSaveData(projectSaveData(source,context)); }

function serializeSaveData(source, context) { return JSON.stringify(captureSaveData(source,context)); }

// Cooperative UI driver. Synchronous model APIs drain the exact same validators.
function cancelSaveWork(session) {
  const work=session && session.work;
  if (!work) return;
  session.work=null;
  if (work.timer!==null) window.clearTimeout?.(work.timer);
  try { work.steps.return?.(); } catch (ignored) { /* No live state belongs to a detached pipeline. */ }
  work.done=null;work.fail=null;work.guard=null;
}

function saveWorkNow() { return window.performance && typeof window.performance.now==='function' ? window.performance.now() : Date.now(); }

function startSaveWork(session,steps,guard,done,fail) {
  cancelSaveWork(session);
  const work={steps,guard,done,fail,timer:null};session.work=work;
  work.timer=window.setTimeout(()=>advanceSaveWork(session,work),0);
  return work;
}

function advanceSaveWork(session,work) {
  if (session.work!==work) return;
  if (!saveLoadSessionBound(session) || !work.guard()) { cancelSaveWork(session);return; }
  work.timer=null;
  const deadline=saveWorkNow()+8;
  try {
    for(let count=0;count<32;count++) {
      const next=work.steps.next();
      if (next.done) { session.work=null;work.done(next.value);return; }
      if (saveWorkNow()>=deadline) break;
    }
    work.timer=window.setTimeout(()=>advanceSaveWork(session,work),0);
  } catch(error) {
    if (session.work===work) session.work=null;
    if (saveLoadSessionBound(session) && work.guard()) work.fail(error);
  }
}

function* serializeSaveDataSteps(projected) {
  const data=yield* validateSaveDataSteps(projected);
  return JSON.stringify(data);
}

function saveNeedsCooperation(value) {
  return Object.keys(value.run.floors).length>2 || value.run.inventory.length>256
    || (value.run.encounter && value.run.encounter.monsters.length>256);
}

function saveGameFileCooperatively(owner,context) {
  const projected=projectSaveData(owner,context); // Logical boundary; no event can interleave before freeze.
  const session=beginSaveLoad();
  if (!session) return false;
  session.exporting=true;
  fileActionMessage('Preparing save… Cancel or Esc keeps your adventure unchanged.');updateSaveFileButtons();
  startSaveWork(session,serializeSaveDataSteps(projected),()=>!!session.exporting,
    text=>{
      const visible=saveLoadSessionCurrent(session);
      session.exporting=false;cancelSaveLoad(session);
      if (visible && state===owner) deliverSaveGameFile(owner,text,context);
      else if (state===owner) fileActionMessage('Save canceled. Return to the game and try again.');
    },error=>{
      session.exporting=false;cancelSaveLoad(session);
      if(state===owner) fileActionMessage('Could not prepare this save. Your adventure is unchanged or exceeds the supported limits.');
    });
  return true;
}

function finishSaveFileValidation(session,read,data) {
  if (!saveFileReadCurrent(session,read)) return;
  const ui=session.ui;
  ui.reader=null;ui.data=data;ui.phase='ready';ui.message='Save checked. Load replaces your current adventure; Cancel keeps it.';
  renderSaveLoadUI(session);
}

function commitSaveFileData(session,ui,data,candidate) {
  if (!saveLoadSessionBound(session) || session.ui!==ui || ui.data!==data || ui.phase!=='loading') return;
  if (!saveLoadSessionCurrent(session)) {
    ui.phase='ready';ui.message='Loading is unavailable right now. Return to the game, or Cancel.';renderSaveLoadUI(session);return;
  }
  try {
    const loaded=candidate ? commitHydratedSaveLoad(session,candidate) : commitSaveLoad(session,data);
    if(!loaded && session.ui===ui && saveLoadSessionBound(session)) {
      ui.phase='ready';ui.message='Loading is unavailable right now. Return to the game, or Cancel.';renderSaveLoadUI(session);
    }
  } catch(error) { failSaveFileCommit(session,ui); }
}

function failSaveFileCommit(session,ui) {
  if(session.ui===ui && saveLoadSessionBound(session)) {
    ui.data=null;ui.phase='error';ui.message='Could not load this save. Your adventure is unchanged. Choose a file or Cancel.';renderSaveLoadUI(session);
  } else if(state===session.owner) fileActionMessage('Could not load this save. Your adventure is unchanged. Choose Load to try again.');
}

// S3 transport/UI is transient and belongs to the existing identity-bound load session.
function fileActionMessage(text) {
  for (const id of ['saveGameStatus','launchFileStatus','deathFileStatus']) document.getElementById(id).textContent=text;
}

function canSaveGameFile() {
  return saveLoadAllowed() && state.started && !state.gameOver && !state.godMode && !state.loadSession;
}

function fileSnapshotContext() {
  return {createdAt:new Date().toISOString(),hidden:!!document.hidden,
    tradeOpen:!document.getElementById('tradeOverlay').hidden,companionOpen:!document.getElementById('companionOverlay').hidden};
}

function saveGameFile() {
  if (!canSaveGameFile()) return false;
  const owner=state, context=fileSnapshotContext();
  try {
    if (Object.keys(state.floors).length>2 || state.inventory.length>256 || state.monsters.length>256)
      return saveGameFileCooperatively(owner,context);
    return deliverSaveGameFile(owner,serializeSaveData(owner,context),context);
  } catch(error) {
    fileActionMessage('Could not prepare this save. Your adventure is unchanged or exceeds the supported limits.');resetHelpClock();return false;
  }
}

function deliverSaveGameFile(owner,text,context) {
  let url=null, link=null;
  try {
    if (typeof window.Blob!=='function' || !window.URL || typeof window.URL.createObjectURL!=='function'
      || typeof window.URL.revokeObjectURL!=='function' || typeof window.setTimeout!=='function') throw new Error('File API unavailable');
    const blob=new window.Blob([text],{type:'application/json;charset=utf-8'});
    url=window.URL.createObjectURL(blob);
    link=document.createElement('a'); link.href=url;
    link.download=`dungeon-crawler-${context.createdAt.replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(link); link.click();
    const downloadUrl=url;
    window.setTimeout(()=>window.URL.revokeObjectURL(downloadUrl),30000);
    url=null; // This timer only releases its own URL; it never touches a later run/UI.
    if (state===owner) fileActionMessage('Download requested. Keep the .json file to continue this adventure later.');
    return true;
  } catch (error) {
    if (state===owner) fileActionMessage(error.message.includes('32 MiB') || error.message.includes('limit') || error.message.includes('array')
      ? 'This adventure exceeds the supported save limits. Nothing was changed.'
      : 'Could not prepare a save file. Nothing was changed. Try again in a supported browser.');
    return false;
  } finally {
    link?.remove?.();
    if (url!==null) { try { window.URL.revokeObjectURL(url); } catch (ignored) { /* No game/UI callback depends on URL cleanup. */ } }
    if (state===owner) resetHelpClock();
  }
}

function updateSaveFileButtons() {
  document.getElementById('saveGameButton').disabled=!canSaveGameFile();
  document.getElementById('cancelSavePreparation').hidden=!(state.loadSession && state.loadSession.exporting);
  for (const id of ['loadGameButton','launchLoadGame','deathLoadGame']) document.getElementById(id).disabled=!saveLoadAllowed() || !!state.loadSession;
  if (state.loadSession && state.loadSession.ui) renderSaveLoadUI(state.loadSession);
}

function disposeSaveLoadUI(session, restoreBackground, restoreFocus) {
  const ui=session && session.ui;
  if (!ui) return;
  session.ui=null;
  const reader=ui.reader;
  ui.read=null; ui.data=null; ui.reader=null;
  if (ui.task!==null) { window.clearTimeout?.(ui.task); ui.task=null; }
  if (reader && reader.readyState===1) { try { reader.abort(); } catch (error) { /* The invalidated read cannot update UI. */ } }
  if (state.loadSession && state.loadSession!==session && state.loadSession.ui) return;
  if (document.getElementById('saveLoadFile')===ui.input) {
    ui.input.value=''; document.getElementById('saveLoadFileHost').innerHTML='';
    document.getElementById('saveLoadOverlay').hidden=true;
    document.getElementById('saveLoadPreview').textContent='';
    document.getElementById('saveLoadPreview').hidden=true;
    document.getElementById('confirmSaveLoad').disabled=true;
    document.getElementById('saveLoadSelectedFile').textContent='';
    document.getElementById('saveLoadStatus').textContent='';
  }
  if (restoreBackground) {
    document.getElementById('gameLayout').inert=ui.gameInert;
    document.getElementById('launchScreen').inert=ui.launchInert;
    document.getElementById('helpOverlay').inert=ui.helpInert;
    updateSaveFileButtons(); // Re-enable the origin control before trying to focus it.
    if (restoreFocus) (ui.focus && ui.focus.isConnected!==false ? ui.focus
      : state.helpOpen ? document.getElementById('closeHelp') : state.started ? canvas : document.getElementById('startGame')).focus?.();
  }
}

function openLoadGame() {
  if (state.loadSession) return null;
  const session=beginSaveLoad();
  if (!session) return null;
  const ui={focus:document.activeElement,gameInert:!!document.getElementById('gameLayout').inert,
    launchInert:!!document.getElementById('launchScreen').inert,helpInert:!!document.getElementById('helpOverlay').inert,
    input:null,reader:null,read:null,task:null,data:null,phase:'choose',message:'Choose a save file. Your current adventure stays unchanged until you load.'};
  session.ui=ui;
  try {
    const input=document.createElement('input');
    input.id='saveLoadFile'; input.type='file'; input.accept='.json,application/json';
    input.disabled=typeof window.FileReader!=='function';
    input.onchange=()=>{
      const file=input.files && input.files[0];
      input.value=''; // Also handles selecting the exact same file again using keyboard/native controls.
      readSaveGameFile(session,input,file);
    };
    input.onclick=()=>{ if (saveLoadSessionBound(session) && session.ui===ui) { input.value=''; resetSaveFileRead(session); } };
    input.oncancel=()=>{
      if (!saveLoadSessionBound(session) || session.ui!==ui) return;
      resetSaveFileRead(session);
      ui.message='File selection canceled. Choose another file, or Cancel to resume.'; renderSaveLoadUI(session);
    };
    ui.input=input;
    const host=document.getElementById('saveLoadFileHost'); host.innerHTML=''; host.appendChild(input);
    if (input.disabled) ui.message='This browser cannot read save files. Cancel to resume.';
    document.getElementById('gameLayout').inert=true;
    document.getElementById('launchScreen').inert=true;
    document.getElementById('helpOverlay').inert=true;
    document.getElementById('saveLoadOverlay').hidden=false;
    fileActionMessage(''); updateSaveFileButtons();
    (input.disabled?document.getElementById('cancelSaveLoad'):input).focus?.();
    return session;
  } catch (error) {
    cancelSaveLoad(session);
    fileActionMessage('Could not open the file chooser. Your adventure is unchanged.');
    return null;
  }
}

function resetSaveFileRead(session) {
  cancelSaveWork(session);
  const ui=session.ui;
  if (!ui) return;
  const reader=ui.reader;
  ui.read=null; ui.data=null; ui.reader=null; ui.phase='choose';
  if (ui.task!==null) { window.clearTimeout?.(ui.task); ui.task=null; }
  if (reader && reader.readyState===1) { try { reader.abort(); } catch (error) { /* Replaced selection is already invalid. */ } }
  document.getElementById('saveLoadSelectedFile').textContent='';
  ui.message='Choose a save file. Cancel keeps your current adventure.';
  renderSaveLoadUI(session);
}

function saveFileReadCurrent(session, read) {
  const ui=session && session.ui;
  return saveLoadSessionBound(session) && !!ui && ui.read===read && ui.input===read.input
    && document.getElementById('saveLoadFile')===read.input && read.input.isConnected!==false;
}

function renderSaveLoadUI(session) {
  if (!saveLoadSessionBound(session) || !session.ui) return;
  const ui=session.ui;
  document.getElementById('saveLoadStatus').textContent=ui.message;
  const preview=document.getElementById('saveLoadPreview');
  preview.hidden=!ui.data;
  if (ui.data) {
    const d=ui.data, run=d.run, p=run.player;
    preview.textContent=`${run.area==='town'?'Town':`Dungeon depth ${run.depth}`} · Hero level ${p.lvl}\nHP ${p.hp}/${p.maxHp} · MP ${p.mp}/${p.maxMp} · Gold ${run.gold}\nSaved ${new Date(d.createdAt).toLocaleString()} · Game v${d.gameVersion}`;
  } else preview.textContent='';
  document.getElementById('confirmSaveLoad').disabled=ui.phase!=='ready' || !ui.data || !saveLoadSessionCurrent(session);
  const confirm=document.getElementById('confirmSaveLoad');
  confirm.onclick=()=>confirmSaveGameLoad(session);
  document.getElementById('cancelSaveLoad').onclick=()=>cancelSaveLoad(session);
  document.getElementById('saveLoadAudioToggle').textContent=`Sound: ${state.audio.enabled?'On':'Off'} (M)`;
}

function saveFileReadError(session, read, message) {
  if (!saveFileReadCurrent(session,read)) return;
  session.ui.data=null; session.ui.phase='error'; session.ui.message=message;
  renderSaveLoadUI(session);
}

function readSaveGameFile(session, input, file) {
  if (!saveLoadSessionBound(session) || !session.ui || session.ui.input!==input) return;
  resetSaveFileRead(session);
  const ui=session.ui, read={input}; ui.read=read;
  if (!file) { saveFileReadError(session,read,'No file selected. Choose a file, or Cancel to resume.'); return; }
  if (!Number.isSafeInteger(file.size) || file.size<0 || file.size>SAVE_MAX_BYTES) {
    saveFileReadError(session,read,'This file is larger than 32 MiB or cannot be read. Choose a smaller save.'); return;
  }
  document.getElementById('saveLoadSelectedFile').textContent=`Selected: ${String(file.name || 'save file').slice(0,128)}`;
  ui.phase='reading'; ui.message='Reading and checking your save… Cancel keeps your current adventure.';
  renderSaveLoadUI(session);
  try {
    const reader=new window.FileReader(); ui.reader=reader;
    reader.onload=()=>{
      if (!saveFileReadCurrent(session,read)) return;
      const text=reader.result;
      // Yield a task so progress/cancel controls can paint before bounded synchronous validation.
      ui.task=window.setTimeout(()=>{
        if (!saveFileReadCurrent(session,read)) return;
        ui.task=null;
        try {
          if (typeof text==='string' && text.length>65536) {
            startSaveWork(session,parseSaveDataSteps(text),()=>saveFileReadCurrent(session,read),
              data=>finishSaveFileValidation(session,read,data),
              error=>saveFileReadError(session,read,error.message.includes('unsupported format version')
                ? 'This save version is not supported by this game.' : 'This file is not a supported saved adventure. Choose another file or Cancel.'));
          } else finishSaveFileValidation(session,read,parseSaveData(text));
        } catch (error) {
          saveFileReadError(session,read,error.message.includes('unsupported format version')
            ? 'This save version is not supported by this game.' : 'This file is not a supported saved adventure. Choose another file or Cancel.');
        }
      },0);
    };
    reader.onerror=()=>saveFileReadError(session,read,'Could not read this file. Choose it again, or Cancel to resume.');
    reader.onabort=()=>saveFileReadError(session,read,'File reading stopped. Choose a file, or Cancel to resume.');
    reader.readAsText(file,'UTF-8');
  } catch (error) { saveFileReadError(session,read,'Could not read this file. Choose it again, or Cancel to resume.'); }
}

function confirmSaveGameLoad(session) {
  if (!saveLoadSessionCurrent(session) || !session.ui || session.ui.phase!=='ready' || !session.ui.data) return false;
  const ui=session.ui, data=ui.data;
  ui.phase='loading'; ui.message='Loading adventure…'; renderSaveLoadUI(session);
  ui.task=window.setTimeout(()=>{
    if (!saveLoadSessionBound(session) || session.ui!==ui || ui.data!==data || ui.phase!=='loading') return;
    ui.task=null;
    if (!saveLoadSessionCurrent(session)) {
      ui.phase='ready'; ui.message='Loading is unavailable right now. Return to the game, or Cancel.'; renderSaveLoadUI(session); return;
    }
    if (saveNeedsCooperation(data)) {
      startSaveWork(session,hydrateSaveDataSteps(data),()=>session.ui===ui && ui.data===data && ui.phase==='loading',
        candidate=>commitSaveFileData(session,ui,data,candidate),()=>failSaveFileCommit(session,ui));
    } else commitSaveFileData(session,ui,data,null);
  },0);
  return true; // Confirmation queued; only S2 commit's result means a run was replaced.

}

// S2 model hydration: validated detached data only; resources are attached at the commit boundary.
function* hydrateSaveDataSteps(value) {
  const run = (yield* validateSaveDataSteps(value)).run;
  const town = run.town;
  for (const floor of Object.values(run.floors)) { floor.visited = new Set(floor.visited);yield; }
  town.visited = new Set(town.visited); town.speech = null;
  town.landmarks = { inn:town.landmarks.inn, store:town.store, gate:town.landmarks.gate,
    companionBoard:town.props[town.landmarks.companionBoardIndex] };
  const candidate = {
    ...savePick(run,SAVE_RUN_FIELDS), floors:run.floors, town,
    companion:run.companion ? makeCompanion(run.companion.id,run.companion.x,run.companion.y) : null,
    inn:town.landmarks.inn, townGate:town.landmarks.gate,
    started:true, gameOver:false, won:false, helpOpen:false, helpFocus:null,
    consoleOpen:false, consoleLines:[], consoleHistory:[], consoleHistoryIndex:0,
    godMode:false, godModeStats:null, trade:null, companionPicker:null, loadSession:null, pause:null,
    ending:null, bossIntro:null, bossDefeat:null, bubble:null, monsterSpeech:null, companionSpeech:null,
    lastTick:0, audio:null, art:null, motion:freshMotionState(),
    camera:{ x:Math.max(0,Math.min(W-VIEW_W,run.player.x-Math.floor(VIEW_W/2))),
      y:Math.max(0,Math.min(H-VIEW_H,run.player.y-Math.floor(VIEW_H/2))) },
  };
  if (run.area === 'dungeon') {
    for (const field of FLOOR_FIELDS) candidate[field] = run.floors[run.depth][field];
    candidate.monsters = run.encounter.monsters;
    candidate.boss = candidate.monsters.find(m=>m.id===run.encounter.bossId) || null;
    candidate.bossIntroSeen = run.encounter.bossIntroSeen;
    candidate.bossSummonAt = run.encounter.bossSummonAt;
  } else {
    candidate.map=town.map; candidate.visited=town.visited; candidate.props=town.props;
    candidate.merchant=town.store; candidate.rooms=[]; candidate.potions=[]; candidate.treasures=[];
    candidate.stairs=null; candidate.upstairs=null; candidate.prisoner=null; candidate.princess=null;
    candidate.monsterSpawns=[]; candidate.monsters=[]; candidate.boss=null; candidate.bossDefeated=false;
    candidate.floorKey=null; candidate.obstacles=[]; candidate.hazards=[]; candidate.hazardTime=0;
    candidate.biome='town'; candidate.bossIntroSeen=false; candidate.bossSummonAt=0;
  }
  return candidate;
}

function hydrateSaveData(value) { return drainSaveSteps(hydrateSaveDataSteps(value)); }

function saveLoadAllowed() {
  const roster=document.getElementById('companionOverlay'), trade=document.getElementById('tradeOverlay');
  if (!state || document.hidden || state.won || state.ending || state.pause || state.consoleOpen
    || state.trade || state.companionPicker || bossCinematicActive()
    || (roster && !roster.hidden) || (trade && !trade.hidden)) return false;
  return state.gameOver ? state.started && state.player.hp<=0 : state.player.hp>0;
}

function beginSaveLoad() {
  if (!saveLoadAllowed()) return null;
  if (state.loadSession) cancelSaveLoad(state.loadSession,false);
  const session={ owner:state, map:state.map, area:state.area, depth:state.depth,
    started:state.started, gameOver:state.gameOver };
  state.loadSession=session; // Replacing this identity invalidates every older read/confirmation.
  stopMotionAnimation();
  return session;
}

function saveLoadSessionBound(session) {
  return !!session && state.loadSession===session && session.owner===state && session.map===state.map
    && session.area===state.area && session.depth===state.depth && session.started===state.started
    && session.gameOver===state.gameOver;
}

function saveLoadSessionCurrent(session) { return saveLoadSessionBound(session) && saveLoadAllowed(); }

function cancelSaveLoad(session = state && state.loadSession, resume = true) {
  if (!session || !state || state.loadSession!==session) return false;
  state.loadSession=null;
  const exporting=!!session.exporting;session.exporting=false;cancelSaveWork(session);
  if (exporting) fileActionMessage('Save canceled. Your adventure is unchanged.');
  updateSaveFileButtons();
  disposeSaveLoadUI(session,true,resume);
  resetHelpClock();
  if (resume) requestMotionFrame();
  return true;
}

// Only existing presentation nodes are touched. Snapshots retain nodes/listeners and canvas pixels.
const SAVE_LOAD_UI_IDS = ['launchScreen','gameLayout','overlay','pauseOverlay','helpOverlay','helpToggle',
  'tradeOverlay','companionOverlay','devConsole','consoleInput','consoleOutput','endingControls','skipEnding',
  'log','hpText','hpfill','mpText','mpfill','lvl','xpfill','depth','kills','turn','gold','potions','scrolls',
  'keyStatus','posText','retreatStatus','companionStat','companionName','companionPostAction','companionAudioToggle',
  'godModeStat','objective','musicVolume','musicVolumeText','effectsVolume','effectsVolumeText','audioToggle',
  'weaponSlot','weaponName','weaponBonuses','armorSlot','armorName','armorBonuses','ringSlot','ringName','ringBonuses',
  'gearHpBonus','gearStrBonus','heroMaxHp','heroStrength','heroAttack','heroDefense','heroDexterity','spellList',
  'merchantStock','minimapDepth','saveLoadOverlay','saveLoadFile','saveLoadStatus','saveLoadPreview','saveLoadSelectedFile',
  'confirmSaveLoad','cancelSaveLoad','saveLoadAudioToggle','saveGameButton','loadGameButton','launchLoadGame','deathLoadGame',
  'saveGameStatus','launchFileStatus','deathFileStatus','cancelSavePreparation'];

function captureLoadPresentation() {
  const nodes=SAVE_LOAD_UI_IDS.map(id=>{
    const node=document.getElementById(id);
    if (!node) return null;
    return {node, text:node.children && node.children.length ? null : node.textContent,
      hidden:node.hidden, disabled:node.disabled, inert:node.inert, value:node.value,
      ariaPressed:node.ariaPressed, ariaExpanded:node.ariaExpanded, className:node.className,
      css:node.style.cssText, display:node.style.display, width:node.style.width, scrollTop:node.scrollTop};
  }).filter(Boolean);
  const canvases=[];
  for (const id of ['game','minimap','weaponIcon','armorIcon','ringIcon']) {
    const surface=document.getElementById(id);
    if (surface.width && surface.height) canvases.push({surface,width:surface.width,height:surface.height,
      pixels:surface.getContext('2d').getImageData(0,0,surface.width,surface.height)});
  }
  return {nodes,canvases,focus:document.activeElement};
}

function restoreLoadPresentation(saved) {
  for (const row of saved.nodes) {
    const node=row.node;
    if (row.text!==null) node.textContent=row.text;
    for (const key of ['hidden','disabled','inert','value','ariaPressed','ariaExpanded','className','scrollTop']) {
      if (key!=='value' || node.type!=='file') node[key]=row[key];
    }
    if (row.css!==undefined) node.style.cssText=row.css;
    else { node.style.display=row.display; node.style.width=row.width; }
  }
  for (const row of saved.canvases) {
    // Width reset also unwinds any canvas transform/save stack left by a failed painter.
    row.surface.width=row.width; row.surface.height=row.height;
    const context=row.surface.getContext('2d'); context.imageSmoothingEnabled=false;
    context.putImageData(row.pixels,0,0);
  }
  saved.focus?.focus?.();
}

function cancelSaveLoadFrames(owner) {
  for (const item of [owner.motion,owner.ending,owner.bossIntro,owner.bossDefeat]) {
    if (!item) continue;
    if (item.frameId!==null && typeof window.cancelAnimationFrame==='function') {
      try { window.cancelAnimationFrame(item.frameId); } catch (error) { /* Identity guards still reject stale frames. */ }
    }
    item.frameId=null;
  }
}

function commitSaveLoad(session, value) {
  if (!saveLoadSessionCurrent(session)) return false;
  const candidate=hydrateSaveData(value); // All validation/allocation happens before changing the old run/UI.
  return commitHydratedSaveLoad(session,candidate);
}

// Private boundary: only the validated hydration pipelines call this; never pass raw file objects here.
function commitHydratedSaveLoad(session,candidate) {
  if (!saveLoadSessionCurrent(session)) return false;
  const previous=state, presentation=captureLoadPresentation();
  if (!saveLoadSessionCurrent(session)) return false;
  candidate.audio=previous.audio; candidate.art=previous.art;
  candidate.lastTick=Date.now();
  previous.loadSession=null; // Invalidate the confirmation before swapping; a consumed token never retries.
  state=candidate;
  try {
    for (const id of ['helpOverlay','tradeOverlay','companionOverlay','devConsole','endingControls','saveLoadOverlay']) document.getElementById(id).hidden=true;
    document.getElementById('overlay').style.display='none';
    document.getElementById('pauseOverlay').style.display='none';
    document.getElementById('helpToggle').ariaExpanded='false';
    document.getElementById('helpOverlay').inert=false;
    document.getElementById('gameLayout').inert=false;
    document.getElementById('launchScreen').inert=false;
    document.getElementById('launchScreen').hidden=true;
    document.getElementById('gameLayout').hidden=false;
    document.getElementById('consoleInput').value='';
    document.getElementById('consoleOutput').textContent='';
    const journal=document.getElementById('log');
    journal.textContent=[...candidate.messages].reverse().join('\n\n'); journal.scrollTop=0;
    render(true); // Presentation-only: preserve saved warning latches/HP rather than running checkHealth.
    if (state!==candidate) return false;
    canvas.focus?.();
    if (state!==candidate) return false;
    candidate.lastTick=Date.now();
    cancelSaveLoadFrames(previous);
    disposeSaveLoadUI(session,false,false);
    fileActionMessage('');
    return true;
  } catch (error) {
    cancelSaveLoadFrames(candidate);
    if (state===candidate) {
      state=previous;
      state.lastTick=Date.now(); // Failed presentation/cancel time earns no active-time credit.
      restoreLoadPresentation(presentation);
      disposeSaveLoadUI(session,true,true);
      try { requestMotionFrame(); } catch (ignored) { /* Original render error remains the reported failure. */ }
    }
    throw error;
  }
}

let state;

function newGame() {
  dismissTrade(state && state.trade, false);
  cancelSaveLoad(state && state.loadSession, false);
  fileActionMessage('');
  closeCompanionBoard(state && state.companionPicker, false);
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
    selectedCompanion: 'marmalade',
    unlockedCompanions: ['marmalade', 'pip'],
    companionChoice: 'marmalade', companionEntryDone: false, companionPicker: null,
    trade: null, loadSession: null,
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
  document.getElementById('companionOverlay').hidden = true;
  document.getElementById('helpToggle').ariaExpanded = 'false';
  document.getElementById('gameLayout').inert = false;
  document.getElementById('launchScreen').inert = false;
  document.getElementById('launchScreen').hidden = started;
  document.getElementById('gameLayout').hidden = !started;
  document.getElementById('launchVersion').textContent = `v${GAME_VERSION}`;
  genLevel();
  genTown();
  revealAroundPlayer();
  setCompanionChoice('marmalade');
  log('You arrive in the village. Rest at the Inn, visit the Store, or enter the dungeon.');
}

function setCompanionChoice(id) {
  if (state.loadSession) return;
  const def = companionDef(id);
  if (!def || def.unlock !== 'start' || state.companionEntryDone) return false;
  state.companionChoice = id;
  state.selectedCompanion = id;
  (document.querySelectorAll?.('[data-companion-choice]')||[]).forEach(btn => {
    const on = btn.dataset.companionChoice === id;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function startGame() {
  if (state.loadSession) return;
  if (state.started) return;
  state.selectedCompanion = state.companionChoice || state.selectedCompanion || 'marmalade';
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
    const t = pool[Math.floor(Math.random() * pool.length)];
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

function companionPostTile(map, props, actors, spawn, landmarks) {
  const reachable = floorDistances(map, spawn), reserved = new Set();
  for (const item of [...props, ...actors]) {
    reserved.add(`${item.x},${item.y}`);
    for (const tile of item.path || []) reserved.add(`${tile.x},${tile.y}`);
  }
  const candidates = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!reachable.has(`${x},${y}`) || map[y][x] !== 0 || reserved.has(`${x},${y}`)) continue;
    if (landmarks.some(o => nearbyTile(x,y,o))) continue;
    candidates.push({x,y});
  }
  candidates.sort((a,b) => (Math.abs(a.x-34)+Math.abs(a.y-26))-(Math.abs(b.x-34)+Math.abs(b.y-26)) || a.y-b.y || a.x-b.x);
  return candidates[0] || null;
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
  const postTile = companionPostTile(map, props, [...npcs,...animals], spawn, [inn,store,gate,spawn]);
  const companionBoard = postTile && { ...postTile, isCompanionBoard: true };
  if (companionBoard) props.push(companionBoard);
  state.town = {
    map, visited: state.visited, props, npcs, animals, spawn, store,
    landmarks: { inn, store, gate, companionBoard }, tick: 0, quoteIndex: 0, nextTalkAt: 0, speech: null,
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
  dismissTrade(state && state.trade, false);
  cancelSaveLoad(state && state.loadSession, false);
  closeCompanionBoard(state && state.companionPicker, false);
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
      log(exit.reason === 'scroll'
        ? 'You step back through the town portal.'
        : exit.reason === 'cheat'
          ? 'You step back through the debug portal.'
          : `You return to depth ${exit.depth} where you retreated.`);
      return;
    }
    clearTownReturn();
  }
  enterFloor(depth, false, false, arrival);
  log('You descend into the dungeon.');
}

function returnThroughTownPortal() {
  if (state.trade) return false;
  if (state.area !== 'town' || !state.townPortalOpen || !state.townExit) return false;
  playSound('magic');
  enterDungeonFromTown();
  return true;
}

function useTownScroll() {
  if (state.loadSession) return;
  if (state.companionPicker) return;
  if (state.gameOver || state.helpOpen || state.consoleOpen || state.trade || state.pause || state.ending || bossCinematicActive()) return;
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
  if (state.loadSession) return;
  const companionOverlayOpen = typeof document !== 'undefined' && document.getElementById && document.getElementById('companionOverlay') && !document.getElementById('companionOverlay').hidden;
  if (!state.started || state.gameOver || state.helpOpen || state.consoleOpen || state.trade || companionOverlayOpen || state.pause || document.hidden) return false;
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
    moveActorTo(actor,tile.x,tile.y); changed = true;
  }
  return changed;
}

function nearbyTile(x, y, target) {
  return !!target && Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) <= 1;
}

function townEncounter() {
  if (state.trade) return;
  const town = state.town;
  if (!town || town.tick < town.nextTalkAt) return;
  const npc = town.npcs.find(n => nearbyTile(state.player.x, state.player.y, n));
  if (!npc) return;
  townNpcTalk(npc);
  town.nextTalkAt = town.tick + 8;
}

function townNpcTalk(npc) {
  if (state.trade) return;
  const town = state.town;
  if (!town || !npc) return;
  const line = TOWN_NPC_LINES[town.quoteIndex % TOWN_NPC_LINES.length];
  town.quoteIndex++;
  town.speech = { name: npc.name, text: line, expiresAt: town.tick + 6 };
  log(`${npc.name}: "${line}"`);
}

function townInteract() {
  if (state.trade) return;
  if (state.loadSession) return;
  if (state.companionPicker) return;
  if (state.area !== 'town') return false;
  const p = state.player;
  const starter = selectedCompanionActor();
  if (!state.companion && !state.companionEntryDone && starter && !starter.hidden && nearbyTile(p.x,p.y,starter)) return talkToEntranceCat();
  if (nearbyTile(p.x, p.y, state.townGate)) {
    if (!state.townPortalOpen || !returnThroughTownPortal()) enterDungeonFromTown();
    return true;
  }
  if (nearbyTile(p.x, p.y, state.inn)) {
    restAtInn();
    return true;
  }
  if (nearbyTile(p.x, p.y, state.merchant)) {
    openTrade();
    return true;
  }
  const board = state.town && state.town.landmarks && state.town.landmarks.companionBoard;
  if (board && nearbyTile(p.x, p.y, board)) {
    openCompanionBoard();
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
  if (state.trade) return;
  if (state.companionPicker) return;
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
    if (actor.hidden || !inArtCamera(actor.sprite,actor.x,actor.y,actor.scale||1.5)) continue;
    const scale = actor.scale || (actor.sprite === 'villager' ? 1.5 : 0.75);
    const position=actorRenderPosition(actor);
    drawActorSprite(actor.sprite, position.x * TILE + TILE / 2, worldSpriteCenterY(actor.sprite,position.y,scale), scale, actor);
  }
}

function drawTownSpeech() {
  const starter = selectedCompanionActor();
  if (!state.companion && !state.companionEntryDone && starter && !starter.hidden && nearbyTile(state.player.x,state.player.y,starter) && inRenderCamera(starter.x,starter.y)) {
    drawBubble(`Space: recruit ${starter.name}`, (starter.x+.5)*TILE, starter.y*TILE-10);
  }
  const board = state.town && state.town.landmarks.companionBoard;
  if (board && nearbyTile(state.player.x,state.player.y,board) && inRenderCamera(board.x,board.y)) {
    drawBubble('Space: companions', (board.x+.5)*TILE, board.y*TILE-10);
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
  return { time: 0, moves: {}, facing: {}, directions: {}, camera: null, projectiles: [], frameId: null, lastTimestamp: null, lastPaint: null };
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
  return actor.name && !Number.isInteger(actor.id) ? `town:${actor.name}` : `monster:${actor.id}`;
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
  faceActor(actor, x-actor.x, y-actor.y);
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
  return !simulationBlocked();
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
  if (state.area === 'town' && state.townPortalOpen && state.townGate && inArtCamera('townPortal',state.townGate.x,state.townGate.y)) return true;
  if (state.motion.projectiles.some(projectileVisible)) return true;
  if (actorIsMoving(state.player)) return true;
  if(state.area==='town' && state.town && [...state.town.npcs,...state.town.animals].some(a=>!a.hidden&&actorIsMoving(a)&&inArtCamera(a.sprite,a.x,a.y,a.scale||1.5)))return true;
  const companion = state.companion;
  if (companion && Number.isInteger(companion.x) && Number.isInteger(companion.y) && inRenderCamera(companion.x, companion.y) && fogLevel(companion.x, companion.y) < 3 &&
    (actorIsMoving(companion) || ['bat', 'wasp', 'dragonBoss'].includes(companion.sprite))) return true;
  if (state.monsters.some(m => m.hp > 0 &&
    inRenderCamera(m.x, m.y) && fogLevel(m.x, m.y) < 3 &&
    (actorIsMoving(m) || ['bat', 'wasp', 'mage', 'healer', 'hydra', 'medusa', 'darkWizard', 'skeletonKing'].includes(m.sprite) || m.isDragon))) return true;
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
  const companionOverlayOpen = typeof document !== 'undefined' && document.getElementById && document.getElementById('companionOverlay') && !document.getElementById('companionOverlay').hidden;
  if (state.area === 'town' || simulationBlocked() || companionOverlayOpen) return;
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
  if (state.area === 'town' || simulationBlocked()) return;
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
function equipmentBonus(stat) { return equipmentBonusFor(state.equipment, stat); }
function equipItem(slot, item) {
  const change = equipmentTransition(state.player, state.equipment, slot, item);
  state.equipment[slot] = change.equipment[slot];
  state.player.maxHp = change.maxHp; state.player.hp = change.hp;
  freezePlayerStats();
}

function effectiveStr() { return equipmentStatsFor(state.player, state.equipment).str; }
function effectiveDex() { return equipmentStatsFor(state.player, state.equipment).dex; }
function effectiveAtk() { return equipmentStatsFor(state.player, state.equipment).atk; }
function effectiveDef() { return equipmentStatsFor(state.player, state.equipment).def; }
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
  if (state.trade) return;
  if (state.loadSession) return;
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

function nearestVisibleTarget(range, source = state.player) {
  let nearest = null, nearestDistance = Infinity;
  for (const monster of visibleTargets(range, source)) {
    const distance = Math.max(Math.abs(monster.x - source.x), Math.abs(monster.y - source.y));
    if (distance < nearestDistance || (distance === nearestDistance && monster.id < nearest.id)) {
      nearest = monster;
      nearestDistance = distance;
    }
  }
  return nearest;
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
  if (state.trade) return;
  if (state.loadSession) return;
  if (state.companionPicker) return;
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
  if (state.trade) return;
  if (state.loadSession) return;
  if (state.companionPicker) return;
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
    const target = nearestVisibleTarget(4);
    if (target) {
      spawnProjectile('frost', p, target, 0.35);
      damageMonster(target, heroDamage(target, Math.max(1, Math.round(effectiveAtk() * 1.6) - Math.floor(target.def / 2))));
      if (target.hp > 0) enemyAttack(target);
      log(`You cast Frostbolt at ${target.name}.`);
    } else log('Frostbolt dissolves into empty air.');
  } else if (spellName === 'magicBarrier') {
    const target = nearestVisibleTarget(3);
    if (!target) log('Magic Barrier flares and fades.');
    else {
      spawnProjectile('bolt', p, target, 0.3);
      const barrier = state.motion.projectiles[state.motion.projectiles.length - 1];
      const horizontal = Math.abs(target.x - p.x) >= Math.abs(target.y - p.y);
      const sx = horizontal ? Math.sign(target.x - p.x) : 0;
      const sy = horizontal ? 0 : Math.sign(target.y - p.y);
      let x = target.x, y = target.y, pushed = 0, impact = false;
      for (let i = 0; i < 3; i++) {
        const nx = x + sx, ny = y + sy;
        if (!state.map[ny] || state.map[ny][nx] !== 0 || monsterAt(nx, ny) || (nx === p.x && ny === p.y)) { impact = true; break; }
        x = nx; y = ny; pushed++;
      }
      barrier.impact = impact || !pushed;
      if (pushed) moveActorTo(target, x, y);
      const damage = Math.max(2, Math.round(effectiveAtk() * 1.4) - Math.floor(target.def / 2));
      if (impact || !pushed) {
        damageMonster(target, heroDamage(target, damage));
        log(`Magic Barrier slams ${target.name} into the wall for ${damage} damage!`);
      } else log(`Magic Barrier shoves ${target.name} ${pushed} tiles away.`);
      if (target.hp > 0) enemyAttack(target);
    }
  } else {
    spawnProjectile(spellName === 'greaterHeal' ? 'greaterHeal' : 'heal', p, p, 0.6);
    const fraction = spellName === 'greaterHeal' ? 0.55 : 0.3;
    const amount = Math.max(1, Math.round(p.maxHp * fraction));
    p.hp = Math.min(p.maxHp, p.hp + amount);
    log(`You cast ${spell.name} and recover ${amount} HP.`);
  }
  freezePlayerStats();
  render();
}

function regenMana() {
  if (state.area === 'town' || state.godMode || simulationBlocked()) return;
  const p = state.player;
  if (state.combatElapsed < 4) return;
  if (state.monsters.some(m => m.hp > 0 && Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) <= 3)) return;
  if (state.activeTime < (state.manaRegenAt || 0)) return;
  state.manaRegenAt = state.activeTime + 2;
  if (p.mp < p.maxMp) p.mp = Math.min(p.maxMp, p.mp + 1);
}

function enemyAttack(m) {
  if (state.trade) return;
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
  const visual = monsterVisual(monster);
  const height = 28, anchorX = visual.x;
  const camera = renderCamera();
  const viewportLeft = camera.x * TILE, viewportTop = camera.y * TILE;
  const x = Math.max(viewportLeft + 6, Math.min(viewportLeft + VIEW_W * TILE - width - 6, anchorX - width / 2));
  const below = visual.top - 44 < viewportTop + 4;
  const y = Math.max(viewportTop + 4, Math.min(viewportTop + VIEW_H * TILE - height - 4, below ? visual.bottom + 12 : visual.top - 44));
  return { x, y, width, height, text: speech.text, below, anchorX,
    tipY: Math.max(viewportTop + 3, Math.min(viewportTop + VIEW_H * TILE - 3, below ? visual.bottom + 3 : visual.top - 3)) };
}

function actorDrawScale(name, fallback=2) {
  const rt = typeof artRuntime === 'function' ? artRuntime() : null;
  if (rt && rt.characters && rt.characters[name] && rt.characters[name].worldScale) return rt.characters[name].worldScale;
  return fallback;
}
function monsterVisual(monster) {
  const sprite = monster.isDragon ? 'dragonBoss' : monster.isThemed ? (monster.themedType === 'kitchen' ? 'cook' : 'bartender') : monster.sprite;
  const scale = monster.isBoss ? (actorDrawScale(sprite, 3)) : 2;
  const size = spriteDimensions(sprite);
  const position = actorRenderPosition(monster);
  const footX = position.x * TILE + TILE / 2;
  const footY = (position.y + 1) * TILE;
  const ax = (size.anchorX != null ? size.anchorX : size.width / 2) * scale;
  const ay = (size.anchorY != null ? size.anchorY : size.height) * scale;
  const left = footX - ax + (size.unionX || 0) * scale;
  const top = footY - ay + (size.unionY || 0) * scale;
  const width = size.width * scale, height = size.height * scale;
  const x = left + width / 2, y = top + height / 2;
  return { sprite, scale, x, y, footX, footY, width, height, left, right: left + width, top, bottom: top + height, cellW: (size.cellW || size.width) * scale, cellH: (size.cellH || size.height) * scale };
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
  dismissTrade(state && state.trade, false);
  cancelSaveLoad(state.loadSession, false);
  if (won) { startEnding(); return; }
  clearBossIntro();
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  clearTownReturn();
  resetCompanionRun();
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
  if (state.loadSession) return;
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
  const direction = state.motion.directions[actorMotionKey(m)] || 'front';
  const frame = actorAnimationPose(visual.sprite,m).frame;
  const guards = m.isThroneBoss ? state.monsters.filter(g => g.isGuard && g.hp > 0).map(g => {
    const v = monsterVisual(g);
    return { dx:v.footX-visual.footX, dy:v.footY-visual.footY, sprite:v.sprite, scale:v.scale, frame:actorAnimationPose(v.sprite,g).frame, direction:state.motion.directions[actorMotionKey(g)] || 'front' };
  }) : [];
  clearBossIntro();
  clearMovementAnimation();
  state.bossDefeat = {
    kind, label: m.name, elapsed: 0, phase: isDragon ? 'roar' : meta.phases[0][1], completed: false,
    duration: meta.defeat,
    frameId: null, lastTimestamp: null, events: new Set(),
    visual: { sprite: visual.sprite, scale: visual.scale, direction, frame, x: visual.x, y: visual.y, footX:visual.footX, footY:visual.footY,
      width: visual.width, height: visual.height, left: visual.left, right: visual.right,
      top: visual.top, bottom: visual.bottom, tileX: m.x, tileY: m.y },
    guards,
  };
  // The captured guard art falls once; live guards cannot survive that collapse.
  if (m.isThroneBoss) for (const guard of state.monsters) if (guard.isGuard) guard.hp = 0;
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
  if (state.trade) return;
  if (state.loadSession) return;
  if (state.companionPicker) return;
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
  dismissTrade(state.trade, false);
  cancelSaveLoad(state.loadSession, false);
  closeCompanionBoard(state.companionPicker, false);
  clearBossIntro();
  clearBossDefeat();
  state.bossIntroSeen = false;
  state.bossSummonAt = state.activeTime + 4;
  if (state.area === 'town' && !state.companionEntryDone) {
    if (!state.companion) joinSelectedCompanion(true);
    state.companionEntryDone = true;
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
  if (state.trade) return;
  if (state.loadSession) return;
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
  if (state.trade) return;
  if (state.loadSession) return;
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
// M1 model only: no DOM, live-state writes, RNG, notices, saving or commit here.
function tradeRequire(condition, message) {
  if (!condition) throw new Error(`Invalid trade: ${message}`);
}

function tradeAmount(value, name = 'amount') {
  tradeRequire(Number.isSafeInteger(value) && value >= 0, `${name} must be a nonnegative safe integer`);
  return value;
}

function buyPrice(item, depth) {
  tradeRequire(item && typeof item === 'object', 'missing item');
  tradeAmount(item.gold, 'item gold');
  tradeRequire(Number.isInteger(depth) && depth >= 1 && depth <= FINAL_DEPTH, 'pricing depth');
  return tradeAmount(Math.round(item.gold * (1.5 + Math.max(0, depth - 1) * 0.03)), 'buy price');
}

function sellPrice(item) {
  tradeRequire(item && typeof item === 'object', 'missing item');
  return tradeAmount(Math.round(tradeAmount(item.gold, 'item gold') * 0.5), 'sell price');
}

function equipmentBonusFor(equipment, stat) {
  return Object.values(equipment).reduce((sum, item) =>
    tradeAmount(sum + (item && item[stat] !== undefined ? tradeAmount(item[stat], stat) : 0), stat), 0);
}

function equipmentStatsFor(player, equipment) {
  const str = tradeAmount(player.str + equipmentBonusFor(equipment, 'str'), 'strength');
  const dex = tradeAmount(player.dex + equipmentBonusFor(equipment, 'dex'), 'dexterity');
  return { hp: player.hp, maxHp: player.maxHp, str, dex,
    atk: tradeAmount(str + equipmentBonusFor(equipment, 'atk'), 'attack'),
    def: tradeAmount(player.def + equipmentBonusFor(equipment, 'def') + Math.floor(dex / 5), 'defense') };
}

function equipmentTransition(player, equipment, slot, item) {
  tradeRequire(['weapon','armor','ring'].includes(slot) && (item === null || item.kind === slot), 'equipment slot');
  const next = { ...equipment, [slot]:item };
  const delta = equipmentBonusFor(next, 'maxHp') - equipmentBonusFor(equipment, 'maxHp');
  const maxHp = tradeAmount(player.maxHp + delta, 'maximum HP');
  tradeRequire(maxHp > 0, 'maximum HP');
  return { equipment:next, maxHp, hp:Math.min(maxHp, tradeAmount(player.hp + Math.max(0, delta), 'HP')) };
}

function learnSpellState(spells, spellReadyAt, name, activeTime) {
  if (!Object.prototype.hasOwnProperty.call(SPELLS, name) || spells[name]) return null;
  tradeRequire(Number.isFinite(activeTime) && activeTime >= 0, 'spell time');
  return { spells:{ ...spells, [name]:true }, spellReadyAt:{ ...spellReadyAt, [name]:activeTime } };
}

function freezeTradeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTradeData(child);
    Object.freeze(value);
  }
  return value;
}

function validateTradeItem(item) {
  tradeRequire(item && typeof item === 'object' && !Array.isArray(item), 'missing item');
  tradeRequire(typeof item.name === 'string' && item.name.length > 0, 'item name');
  tradeRequire(['heal','weapon','armor','ring','elixir','spellbook','scroll'].includes(item.kind), 'item kind');
  tradeAmount(item.gold, 'item gold');
  // Source items are flat records. Reject nested/executable values instead of retaining live references.
  for (const value of Object.values(item)) tradeRequire(value === null || ['string','boolean','number'].includes(typeof value), 'item field');
  for (const value of Object.values(item)) if (typeof value === 'number') tradeRequire(Number.isFinite(value), 'item number');
  for (const stat of ['atk','def','str','dex','maxHp','range']) if (item[stat] !== undefined) tradeAmount(item[stat], stat);
  if (item.kind === 'heal') tradeRequire(Number.isFinite(item.heal) && item.heal > 0 && item.heal <= 1, 'potion healing');
  if (item.kind === 'spellbook') tradeRequire(Object.prototype.hasOwnProperty.call(SPELLS, item.spell), 'spellbook');
  if (item.kind === 'scroll') tradeRequire(item.scroll === 'town', 'scroll');
}

function validateTradeDraft(draft) {
  tradeAmount(draft.gold, 'gold'); tradeAmount(draft.townScrolls, 'Town Scrolls');
  const p = draft.player;
  for (const field of GOD_STAT_FIELDS) tradeRequire(Number.isFinite(p[field]) && p[field] >= 0, `player ${field}`);
  for (const field of ['hp','maxHp','mp','maxMp','str','dex','def','lvl']) tradeAmount(p[field], field);
  tradeRequire(p.maxHp > 0 && p.hp <= p.maxHp && p.mp <= p.maxMp, 'player health/mana');
  tradeRequire(p.lvl >= 1 && p.lvl <= MAX_LEVEL, 'player level');
  for (const [name, known] of Object.entries(p.spells)) tradeRequire(Object.prototype.hasOwnProperty.call(SPELLS,name) && typeof known === 'boolean', 'spell knowledge');
  for (const [name, time] of Object.entries(draft.spellReadyAt)) tradeRequire(Object.prototype.hasOwnProperty.call(SPELLS,name) && Number.isFinite(time) && time >= 0, 'spell readiness');
  for (const name of Object.keys(SPELLS)) tradeRequire(Number.isFinite(draft.spellReadyAt[name]), 'missing spell readiness');
  for (const slot of ['weapon','armor','ring']) {
    const item = draft.equipment[slot];
    if (item !== null) { validateTradeItem(item); tradeRequire(item.kind === slot, 'equipped item'); }
  }
  equipmentStatsFor(p, draft.equipment);
  for (const potion of draft.inventory) tradeRequire(Object.keys(potion).length === 3 && potion.name === 'Potion' && potion.kind === 'heal'
    && Number.isFinite(potion.heal) && potion.heal > 0 && potion.heal <= 1, 'stored potion');
  const rows = new Set();
  for (const row of draft.stock) {
    tradeRequire(typeof row.rowId === 'string' && !rows.has(row.rowId), 'stock row identity');
    rows.add(row.rowId); validateTradeItem(row.item);
  }
}

function createTradeDraft(source, merchant) {
  tradeRequire(source && merchant && Array.isArray(merchant.stock), 'trade source');
  const player = Object.fromEntries(GOD_STAT_FIELDS.map(key => [key, source.player[key]]));
  player.spells = { ...source.player.spells };
  const original = { gold:source.gold, townScrolls:source.townScrolls, player,
    spellReadyAt:{ ...source.spellReadyAt }, inventory:source.inventory.map(item => ({ ...item })),
    equipment:Object.fromEntries(['weapon','armor','ring'].map(slot => [slot, source.equipment[slot] === null ? null : { ...source.equipment[slot] }])),
    stock:merchant.stock.map((item, index) => ({ rowId:`stock:${index}`, item:{ ...item } })), operations:[] };
  validateTradeDraft(original);
  const rules = { pricingDepth:source.depth, activeTime:source.activeTime,
    godModeStats:source.godMode && source.godModeStats ? Object.fromEntries(GOD_STAT_FIELDS.map(key => [key, source.godModeStats[key]])) : null };
  tradeRequire(Number.isInteger(rules.pricingDepth) && rules.pricingDepth >= 1 && rules.pricingDepth <= FINAL_DEPTH, 'pricing depth');
  tradeRequire(Number.isFinite(rules.activeTime) && rules.activeTime >= 0, 'trade time');
  if (rules.godModeStats) {
    const frozen = { ...original, player:{ ...player, ...rules.godModeStats } };
    validateTradeDraft(frozen);
  }
  // Opening values/rules/history are immutable; no live item, spell, potion or stock reference escapes.
  return freezeTradeData({ original, draft:original, rules, history:[] });
}

function equipDraft(draft, slot, item, rules) {
  const change = equipmentTransition(draft.player, draft.equipment, slot, item);
  const player = { ...draft.player, hp:change.hp, maxHp:change.maxHp };
  if (rules.godModeStats) Object.assign(player, rules.godModeStats);
  return { ...draft, player, equipment:change.equipment };
}

// Returns a new immutable draft or throws Invalid trade; rejected actions never enter the journal.
function applyTradeAction(draft, action, rules) {
  tradeRequire(action && typeof action === 'object', 'action');
  let next = { ...draft }, operation;
  if (action.type === 'buy') {
    const index = draft.stock.findIndex(row => row.rowId === action.rowId);
    tradeRequire(index >= 0, 'stock row is unavailable');
    const row = draft.stock[index], item = row.item, price = buyPrice(item, rules.pricingDepth);
    validateTradeItem(item);
    tradeRequire(item.kind !== 'spellbook' || !draft.player.spells[item.spell], 'spell already learned');
    tradeRequire(draft.gold >= price, 'not enough gold');
    next.gold = tradeAmount(draft.gold - price, 'gold');
    next.stock = draft.stock.filter((_, i) => i !== index);
    const replaced = ['weapon','armor','ring'].includes(item.kind) ? draft.equipment[item.kind] : null;
    if (item.kind === 'heal') next.inventory = [...draft.inventory, { name:'Potion', kind:'heal', heal:item.heal }];
    else if (['weapon','armor','ring'].includes(item.kind)) next = equipDraft(next, item.kind, item, rules);
    else if (item.kind === 'elixir') next.gold = tradeAmount(next.gold + item.gold, 'gold');
    else if (item.kind === 'scroll') next.townScrolls = tradeAmount(next.townScrolls + 1, 'Town Scrolls');
    else if (item.kind === 'spellbook') {
      const learned = learnSpellState(draft.player.spells, draft.spellReadyAt, item.spell, rules.activeTime);
      next.player = { ...draft.player, spells:learned.spells }; next.spellReadyAt = learned.spellReadyAt;
    }
    operation = { type:'buy', rowId:row.rowId, item, price, replaced };
  } else if (action.type === 'sell') {
    tradeRequire(['weapon','armor','ring'].includes(action.slot), 'sell slot');
    const item = draft.equipment[action.slot];
    tradeRequire(!!item, 'slot is empty');
    validateTradeItem(item);
    const price = sellPrice(item);
    next = equipDraft(next, action.slot, null, rules);
    next.gold = tradeAmount(draft.gold + price, 'gold');
    operation = { type:'sell', slot:action.slot, item, price };
  } else tradeRequire(false, 'unknown action');
  next.operations = [...draft.operations, operation];
  validateTradeDraft(next);
  return freezeTradeData(next);
}

function stageTradeAction(cart, action) {
  const draft = applyTradeAction(cart.draft, action, cart.rules);
  return freezeTradeData({ ...cart, draft, history:[...cart.history, cart.draft] });
}

function undoTradeAction(cart) {
  if (!cart.history.length) return cart;
  return freezeTradeData({ ...cart, draft:cart.history[cart.history.length - 1], history:cart.history.slice(0,-1) });
}

function resetTradeDraft(cart) {
  return freezeTradeData({ ...cart, draft:cart.original, history:[] });
}

function tradePrice(it) { return buyPrice(it, state.depth); }
function tradeSellPrice(it) { return sellPrice(it); }
function companionPostContext() {
  if (!state.started || state.area !== 'town' || state.gameOver || state.player.hp <= 0 || document.hidden
    || state.helpOpen || state.consoleOpen || state.trade || state.pause || state.ending || bossCinematicActive()) return null;
  const trade = document.getElementById('tradeOverlay');
  if (trade && !trade.hidden) return null;
  const board = state.town && state.town.landmarks.companionBoard;
  return board && state.map === state.town.map && state.map[board.y][board.x] === 0
    && nearbyTile(state.player.x,state.player.y,board) ? board : null;
}

function restoreCompanionFocus(session) {
  const focus = session.focus;
  if (focus && focus.isConnected && !focus.disabled && !focus.hidden && !focus.closest?.('[inert], [hidden]')) focus.focus?.();
  else canvas.focus?.();
}

function openCompanionBoard() {
  if (state.loadSession) return;
  const board = companionPostContext();
  if (!board || state.companionPicker) return false;
  const overlay = document.getElementById('companionOverlay'), list = document.getElementById('companionBoardList');
  if (!overlay || !list || typeof document.createElement !== 'function') return false;
  const session = { town:state.town, map:state.map, board, focus:document.activeElement,
    gameInert:!!document.getElementById('gameLayout').inert, launchInert:!!document.getElementById('launchScreen').inert };
  state.companionPicker = session;
  list.innerHTML = '';
  for (const id of Object.keys(COMPANIONS)) {
    const def = COMPANIONS[id], unlocked = isCompanionUnlocked(id), active = state.companion && state.companion.id === id;
    const row = document.createElement('div'); row.className = 'companion-card';
    const details = document.createElement('div'), name = document.createElement('strong'), hint = document.createElement('p');
    name.textContent = `${def.name}${active ? ' · Active' : ''}`;
    hint.textContent = unlocked ? def.desc : `Locked. ${def.desc}`;
    details.appendChild(name); details.appendChild(hint);
    const btn = document.createElement('button'); btn.type='button'; btn.dataset.companionId=id;
    btn.textContent = active ? 'Keep' : unlocked ? 'Choose' : 'Locked'; btn.disabled = !unlocked;
    btn.setAttribute('aria-label', `${active ? 'Keep' : unlocked ? 'Choose' : 'Locked:'} ${def.name}`);
    btn.onclick = () => selectCompanion(id, session);
    row.appendChild(details); row.appendChild(btn); list.appendChild(row);
  }
  overlay.hidden = false;
  document.getElementById('gameLayout').inert = true;
  document.getElementById('launchScreen').inert = true;
  resetHelpClock(); stopMotionAnimation(); render();
  document.getElementById('closeCompanionBoard').focus?.();
  return true;
}

function closeCompanionBoard(session = state && state.companionPicker, restoreFocus = true) {
  if (!state || !session || state.companionPicker !== session) return false;
  state.companionPicker = null;
  document.getElementById('companionOverlay').hidden = true;
  document.getElementById('gameLayout').inert = session.gameInert || false;
  document.getElementById('launchScreen').inert = session.launchInert || false;
  resetHelpClock();
  if (restoreFocus) { render(); requestMotionFrame(); restoreCompanionFocus(session); }
  return true;
}

function selectCompanion(id, session) {
  if (!session || state.companionPicker !== session || session.town !== state.town || session.map !== state.map
    || companionPostContext() !== session.board || !isCompanionUnlocked(id) || !companionDef(id)) return false;
  if (state.companion && state.companion.id === id) return closeCompanionBoard(session);
  closeCompanionBoard(session, false);
  if (!activateCompanion(id)) return false;
  log(`${companionDef(id).name} is now your active companion.`);
  render(); requestMotionFrame(); restoreCompanionFocus(session);
  return true;
}

function tradeMerchant() {
  const m = state.merchant;
  if (!m) return null;
  if (state.area === 'town') return state.town && state.map === state.town.map && m === state.town.store
    && nearbyTile(state.player.x,state.player.y,m) ? m : null;
  return merchantAt(state.player.x,state.player.y);
}

function tradeAccessAllowed() {
  return state.started && !state.gameOver && !state.won && state.player.hp > 0 && !document.hidden
    && !state.helpOpen && !state.consoleOpen && !state.pause && !state.ending && !bossCinematicActive()
    && !state.companionPicker && !state.loadSession && document.getElementById('companionOverlay').hidden;
}

function tradeSessionBound(session) {
  return !!session && state.trade === session && session.owner === state && session.map === state.map
    && session.area === state.area && session.depth === state.depth && session.actor === tradeMerchant();
}

function tradeSessionCurrent(session) {
  return tradeSessionBound(session) && tradeAccessAllowed() && !session.committing && !session.invalid;
}

function openTrade(mode = 'buy') {
  if (state.trade || !tradeAccessAllowed() || !document.getElementById('tradeOverlay').hidden) return false;
  const actor = tradeMerchant();
  if (!actor) { log('No merchant here.'); render(); return false; }
  let cart;
  try { cart = createTradeDraft(state,actor);for (const row of cart.original.stock) buyPrice(row.item,cart.rules.pricingDepth); } catch (error) { return false; }
  const session = { owner:state, actor, map:state.map, area:state.area, depth:state.depth,
    cart, opening:cart.original, rules:cart.rules, selectedBuy:cart.original.stock[0]?.rowId || null,
    selectedSell:['weapon','armor','ring'].find(slot=>cart.original.equipment[slot]) || null,
    mode:mode === 'sell' ? 'sell' : 'buy', message:'Choose items, then add purchases or sales. Confirm applies your cart.',
    focus:document.activeElement, gameInert:!!document.getElementById('gameLayout').inert,
    launchInert:!!document.getElementById('launchScreen').inert };
  state.trade = session;
  document.getElementById('tradeOverlay').hidden = false;
  document.getElementById('gameLayout').inert = true;
  document.getElementById('launchScreen').inert = true;
  resetHelpClock(); stopMotionAnimation();
  try {
    renderTrade(session); render(true);
    const list=document.getElementById(mode === 'sell' ? 'tradeSellList' : 'tradeBuyList');
    ([...(list.querySelectorAll?.('button') || [])].find(button=>!button.disabled) || document.getElementById('closeTrade')).focus?.();
    return true;
  } catch (error) {
    dismissTrade(session,false);resumeAfterTrade(session);return false;
  }
}

function resumeAfterTrade(session) {
  try { render(true); } catch (ignored) { /* A failed paint must not strand input in the closed dialog. */ }
  try {
    requestMotionFrame();
    const focus=session.focus;
    if (focus && focus.isConnected && !focus.disabled && !focus.hidden && !focus.closest?.('[inert], [hidden]')) focus.focus?.();
    else canvas.focus?.();
  } finally { resetHelpClock(); } // Painting/focus time must not become active gameplay time.
}

function dismissTrade(session, resume = true) {
  if (!session || state.trade !== session) return false;
  if (session.rollback) session.rollback(); // Forced teardown during a helper must precede the new world/run.
  state.trade = null;
  document.getElementById('tradeOverlay').hidden = true;
  // Release captured owner/cart references instead of retaining the previous run in hidden controls.
  for (const id of ['tradeOverlay','closeTrade','cancelTrade','confirmTrade','addTradePurchase','addTradeSale','undoTrade','resetTrade','tradeAudioToggle']) document.getElementById(id).onclick=null;
  for (const id of ['tradeBuyList','tradeSellList','tradeOrder']) document.getElementById(id).innerHTML='';
  document.getElementById('gameLayout').inert = session.gameInert || false;
  document.getElementById('launchScreen').inert = session.launchInert || false;
  resetHelpClock();
  if (resume) resumeAfterTrade(session);
  return true;
}

function closeTrade(confirm, session = state.trade) {
  return confirm ? confirmTrade(session) : dismissTrade(session);
}

function tradeItemDetails(item) {
  if (item.kind === 'heal') return `Stores a potion (${Math.round(item.heal*100)}% healing).`;
  if (item.kind === 'scroll') return 'Adds one Town Scroll.';
  if (item.kind === 'spellbook') return `Learn ${SPELLS[item.spell].name}.`;
  if (item.kind === 'elixir') return `Returns ${item.gold} gold after payment; no stat bonus.`;
  return ['maxHp','str','atk','def','dex'].filter(stat=>item[stat]).map(stat=>`${stat === 'maxHp' ? 'HP' : stat.toUpperCase()} +${item[stat]}`).join(' · ');
}

function drawTradeItemIcon(surface, item) {
  const target=surface.getContext('2d'); target.imageSmoothingEnabled=false;
  const decoded=artDecoded(item.sprite,0,'front');
  if (decoded) {
    const b=decoded.bounds || {x:0,y:0,width:decoded.w,height:decoded.h}, ratio=Math.min(28/b.width,28/b.height);
    drawArtDecoded(target,decoded,(32-b.width*ratio)/2-b.x*ratio,(32-b.height*ratio)/2-b.y*ratio,decoded.w*ratio,decoded.h*ratio);
  } else if (!artCovered(item.sprite) && SPRITES[item.sprite]) {
    const size=spriteDimensions(item.sprite), ratio=Math.min(28/size.width,28/size.height);
    paintLegacySprite(target,item.sprite,(32-size.width*ratio)/2,(32-size.height*ratio)/2,ratio/ART_DENSITY);
  }
}

function tradeRowReason(session, row) {
  const draft=session.cart.draft;
  if (!draft.stock.some(current=>current.rowId===row.rowId)) return 'Pending purchase';
  if (row.item.kind === 'spellbook' && draft.player.spells[row.item.spell]) return 'Already learned';
  try { if (buyPrice(row.item,session.rules.pricingDepth)>draft.gold) return 'Not enough gold'; }
  catch (error) { return 'Unavailable price'; }
  return '';
}

function selectTradeRow(session, mode, key) {
  if (!tradeSessionCurrent(session)) return false;
  session.mode=mode;
  if (mode === 'buy') session.selectedBuy=key; else session.selectedSell=key;
  renderTrade(session);
  const list=document.getElementById(mode === 'buy' ? 'tradeBuyList' : 'tradeSellList');
  [...(list.querySelectorAll?.('button') || [])].find(b=>b.dataset.tradeKey===key)?.focus?.();
  return true;
}

function renderTrade(session = state.trade) {
  if (!session || state.trade !== session || !session.cart) return;
  document.getElementById('tradeOverlay').onclick=e=>{if(e.target.id==='tradeOverlay')closeTrade(false,session);};
  for (const id of ['closeTrade','cancelTrade']) document.getElementById(id).onclick=()=>closeTrade(false,session);
  document.getElementById('confirmTrade').onclick=()=>confirmTrade(session);
  document.getElementById('addTradePurchase').onclick=()=>tradeBuy(session.selectedBuy,session);
  document.getElementById('addTradeSale').onclick=()=>tradeSell(session.selectedSell,session);
  document.getElementById('undoTrade').onclick=()=>editTradeCart(session,false);
  document.getElementById('resetTrade').onclick=()=>editTradeCart(session,true);
  document.getElementById('tradeAudioToggle').onclick=()=>{ if(state.trade===session) { startAudio();toggleAudio(); } };
  const draft=session.cart.draft, selected=session.cart.original.stock.find(row=>row.rowId===session.selectedBuy);
  const selectedGear=draft.equipment[session.selectedSell];
  document.getElementById('tradeTitle').textContent=session.area === 'town' ? 'Village Store' : 'Dungeon Merchant';
  document.getElementById('tradeStatus').textContent=session.message;
  document.getElementById('tradeGold').textContent=`Gold: ${session.opening.gold} → ${draft.gold}`;
  const stats=equipmentStatsFor(draft.player,draft.equipment);
  document.getElementById('tradeStats').textContent=`After trade: HP ${stats.hp}/${stats.maxHp} · STR ${stats.str} · ATK ${stats.atk} · DEF ${stats.def} · DEX ${stats.dex} · Potions ${draft.inventory.length} · Scrolls ${draft.townScrolls}`;
  let details=selected ? `${selected.item.name}: ${tradeItemDetails(selected.item)}` : 'No stock to select.';
  if (selected && ['weapon','armor','ring'].includes(selected.item.kind) && draft.equipment[selected.item.kind])
    details+=` Replaces ${draft.equipment[selected.item.kind].name}; sell it first to receive its sale value.`;
  document.getElementById('tradeBuyDetails').textContent=details;
  document.getElementById('tradeSellDetails').textContent=selectedGear ? `${selectedGear.name}: ${tradeItemDetails(selectedGear)}` : 'Select an equipped item to sell.';
  document.getElementById('addTradePurchase').textContent=selected && ['weapon','armor','ring'].includes(selected.item.kind) ? 'Buy & equip (B)' : 'Add purchase (B)';
  document.getElementById('addTradePurchase').disabled=!!session.invalid || !selected || !!tradeRowReason(session,selected);
  document.getElementById('addTradeSale').disabled=!!session.invalid || !selectedGear;
  for (const id of ['undoTrade','resetTrade']) document.getElementById(id).disabled=!!session.invalid || !draft.operations.length;
  document.getElementById('confirmTrade').disabled=!!session.invalid || !!session.committing;
  document.getElementById('tradeAudioToggle').textContent=state.audio.enabled ? 'Sound: On (M)' : 'Sound: Off (M)';
  if (typeof document.createElement !== 'function') return; // Static no-DOM test harness: never trade immediately.
  const buy=document.getElementById('tradeBuyList'), sell=document.getElementById('tradeSellList'), order=document.getElementById('tradeOrder');
  buy.innerHTML=''; sell.innerHTML=''; order.innerHTML='';
  const appendRow=(host,item,key,mode,label,reason,active)=>{
    const row=document.createElement('div'); row.className='trade-item';
    const button=document.createElement('button'); button.type='button'; button.dataset.tradeMode=mode; button.dataset.tradeKey=key;
    button.setAttribute('aria-pressed',String(active)); button.disabled=!!reason || !!session.invalid;
    const icon=document.createElement('canvas'); icon.width=32; icon.height=32; icon.setAttribute('aria-hidden','true'); drawTradeItemIcon(icon,item);
    const text=document.createElement('span'); text.textContent=label;
    button.appendChild(icon); button.appendChild(text); button.onclick=()=>selectTradeRow(session,mode,key);
    const hint=document.createElement('p'); hint.className='meta'; hint.textContent=reason || tradeItemDetails(item);
    row.appendChild(button); row.appendChild(hint); host.appendChild(row);
  };
  for (const row of session.cart.original.stock) appendRow(buy,row.item,row.rowId,'buy',`${row.item.name} · ${buyPrice(row.item,session.rules.pricingDepth)} gold`,tradeRowReason(session,row),session.selectedBuy===row.rowId);
  for (const slot of ['weapon','armor','ring']) if (draft.equipment[slot]) {
    const item=draft.equipment[slot];appendRow(sell,item,slot,'sell',`${item.name} · ${slot} · ${sellPrice(item)} gold`,'',session.selectedSell===slot);
  }
  if (!session.cart.original.stock.length) buy.textContent='Sold out. Nothing to buy.';
  if (!Object.values(draft.equipment).some(Boolean)) sell.textContent='No equipped gear to sell.';
  for (const op of draft.operations) { const row=document.createElement('li');row.textContent=`${op.type === 'buy' ? 'Buy' : 'Sell'} ${op.item.name} · ${op.type === 'buy' ? '−' : '+'}${op.price} gold`;order.appendChild(row); }
  if (!draft.operations.length) order.textContent='Cart is empty.';
}

function stageMarketAction(session, action) {
  if (!tradeSessionCurrent(session)) return false;
  try { session.cart=stageTradeAction(session.cart,action); session.message='Added to cart. Your adventure changes only on Confirm.'; }
  catch (error) { session.message=error.message; renderTrade(session); document.getElementById('cancelTrade').focus?.();return false; }
  renderTrade(session);document.getElementById('undoTrade').focus?.();return true;
}
function tradeBuy(rowId, session = state.trade) { return stageMarketAction(session,{type:'buy',rowId}); }
function tradeSell(slot, session = state.trade) { return stageMarketAction(session,{type:'sell',slot}); }
function editTradeCart(session, reset) {
  if (!tradeSessionCurrent(session)) return false;
  session.cart=reset ? resetTradeDraft(session.cart) : undoTradeAction(session.cart);
  session.message=reset ? 'Cart reset. Nothing has changed in your adventure.' : 'Last action undone.';
  renderTrade(session);document.getElementById('cancelTrade').focus?.();return true;
}

function tradeCommitNotices(operations) {
  for (const op of operations) {
    const item=op.item;
    if (op.type === 'sell') log(`Sold ${item.name} for ${op.price} gold.`);
    else {
      if (item.kind === 'spellbook') { const spell=SPELLS[item.spell];log(`You learned ${spell.name}! Press ${spell.key} to cast it.`); }
      const effect=item.kind === 'heal' ? ' Press H to drink.' : item.kind === 'scroll' ? ' Press J in the dungeon to open a portal home.'
        : item.kind === 'elixir' ? ` +${item.gold} gold` : op.replaced ? ` (replaced ${op.replaced.name})` : '';
      log(`Bought ${item.name}!${effect}`);
    }
    try { playSound('pickup'); } catch (ignored) { /* Optional audio cannot invalidate a committed trade. */ }
  }
}

function confirmTrade(session = state.trade) {
  if (!session || state.trade !== session || session.committing || session.invalid) return false;
  if (document.hidden) { session.message='Return to the game before confirming.';renderTrade(session);return false; }
  let draft;
  try {
    tradeRequire(tradeSessionCurrent(session),'shop context changed; cancel and reopen');
    const fresh=createTradeDraft(state,session.actor);
    tradeRequire(JSON.stringify(fresh.original)===JSON.stringify(session.opening) && JSON.stringify(fresh.rules)===JSON.stringify(session.rules),'adventure changed; cancel and reopen');
    let replay=fresh;
    for (const op of session.cart.draft.operations) replay=stageTradeAction(replay,op.type === 'buy' ? {type:'buy',rowId:op.rowId} : {type:op.type,slot:op.slot});
    tradeRequire(JSON.stringify(replay.draft)===JSON.stringify(session.cart.draft),'cart changed; cancel and reopen');
    draft=replay.draft;
  } catch (error) {
    session.invalid=true;session.message='Trade is out of date. Cancel and reopen the shop; your adventure was not changed.';renderTrade(session);document.getElementById('cancelTrade').focus?.();return false;
  }
  if (!draft.operations.length) return dismissTrade(session);
  const owner=state, actor=session.actor, equipment=state.equipment, player=state.player;
  const prior={ gold:state.gold, inventory:state.inventory, townScrolls:state.townScrolls, slots:{...equipment},
    hp:player.hp, maxHp:player.maxHp, spells:player.spells, ready:state.spellReadyAt, stock:actor.stock,
    floor:state.floors[state.depth], floorFields:state.floors[state.depth] ? {...state.floors[state.depth]} : null,
    town:state.town, townFields:state.town ? {...state.town} : null };
  session.committing=true;
  session.rollback=()=>{
    session.rollback=null;session.committing=false;
    owner.gold=prior.gold;owner.inventory=prior.inventory;owner.townScrolls=prior.townScrolls;
    Object.assign(equipment,prior.slots);player.hp=prior.hp;player.maxHp=prior.maxHp;player.spells=prior.spells;owner.spellReadyAt=prior.ready;actor.stock=prior.stock;
    if (prior.floor) { for (const key of Object.keys(prior.floor)) if (!Object.hasOwn(prior.floorFields,key)) delete prior.floor[key];Object.assign(prior.floor,prior.floorFields);owner.floors[session.depth]=prior.floor; }
    else delete owner.floors[session.depth];
    if (prior.town) Object.assign(prior.town,prior.townFields);
  };
  try {
    for (const slot of ['weapon','armor','ring']) if (JSON.stringify(equipment[slot])!==JSON.stringify(draft.equipment[slot])) {
      equipItem(slot,draft.equipment[slot] ? {...draft.equipment[slot]} : null);
      tradeRequire(tradeSessionBound(session),'application context changed');
    }
    state.gold=draft.gold;state.inventory=draft.inventory.map(item=>({...item}));state.townScrolls=draft.townScrolls;
    player.hp=draft.player.hp;player.maxHp=draft.player.maxHp;player.spells={...draft.player.spells};state.spellReadyAt={...draft.spellReadyAt};
    actor.stock=draft.stock.map(row=>({...row.item}));freezePlayerStats();
    tradeRequire(tradeSessionBound(session),'application context changed');
    if (state.area === 'town') saveTown(); else saveFloor();
    tradeRequire(tradeSessionBound(session),'save context changed');
    render(true);
    tradeRequire(tradeSessionBound(session),'presentation context changed');
  } catch (error) {
    if (state === owner && state.trade === session) {
      session.rollback?.();
      session.committing=false;session.invalid=true;session.message='Could not confirm trade. Your adventure is unchanged. Cancel and reopen to retry.';
      try { render(true); } catch (ignored) { /* Preserve the model and error controls if painting still fails. */ }
      renderTrade(session);document.getElementById('cancelTrade').focus?.();
    }
    return false;
  }
  session.rollback=null;
  dismissTrade(session,false); // Consume identity before notices or any repeat activation.
  tradeCommitNotices(draft.operations);
  state.bubble={text:'Pleasure doing business!',ttl:90};
  if (session.opening.stock.length && !actor.stock.length && draft.operations.some(op=>op.type==='buy')) companionTalk('merchant');
  resumeAfterTrade(session);
  return true;
}

function buyFromMerchant() { return openTrade('buy'); }
function sellToMerchant() { return openTrade('sell'); }


function prisonerAt(x, y) {
  return state.prisoner && state.prisoner.x === x && state.prisoner.y === y ? state.prisoner : null;
}
function rescuePrisoner() {
  if (state.trade) return;
  if (state.loadSession) return;
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
  if (state.trade) return;
  if (state.loadSession) return;
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
  if (state.trade) return;
  if (state.loadSession) return;
  if (state.companionPicker) return;
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
  if (merchantAt(p.x, p.y)) { openTrade(); return; }
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
  if (state.loadSession) return;
  if (state.companionPicker) return;
  if (state.gameOver || state.helpOpen || state.trade || (state.pause && state.pause.kind !== 'health')) return;
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
  if (state.trade) return;
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
  if (state.loadSession) return;
  freezePlayerStats();
  if (state.area === 'town' || state.gameOver || state.helpOpen || state.trade || state.godMode) return;
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
  if (state.trade) return;
  if (state.helpOpen || !state.pause || state.pause.kind !== 'health') return;
  state.pause = null;
  state.lastTick = Date.now();
  render();
}

function retreatRemaining() {
  return Math.max(0, state.retreatReadyAt - state.activeTime);
}

function advanceActiveTime(elapsed) {
  if (state.area === 'town' || simulationBlocked()) return;
  state.activeTime += Math.max(0, elapsed);
  state.hazardTime += Math.max(0, elapsed);
  updateMonsterSpeech();
}

function retreat() {
  if (state.loadSession) return;
  if (!state.started || state.companionPicker || state.trade || state.consoleOpen || state.helpOpen || document.hidden || state.ending || bossCinematicActive()) return;
  if (state.area === 'town') { log('No need to retreat while you are in town.'); render(); return; }
  if (state.gameOver || state.helpOpen || (state.pause && state.pause.kind === 'retreat')) return;
  if (retreatRemaining() > 0) { log(`Retreat recovers in ${Math.ceil(retreatRemaining())} active seconds.`); render(); return; }
  state.pause = { kind: 'retreat', previous: state.pause };
  render();
}

function cancelRetreat() {
  if (state.trade) return;
  if (state.helpOpen || !state.pause || state.pause.kind !== 'retreat') return;
  state.pause = state.pause.previous;
  state.lastTick = Date.now();
  render();
}

function confirmRetreat() {
  if (state.trade) return;
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
  if (state.area === 'town' || simulationBlocked()) return;
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
  if (simulationBlocked()) return;
  if (state.area === 'town') {
    musicTick();
    if (townTick()) render();
    return;
  }
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
  if (simulationBlocked()) { render(); return; }
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

function worldSpriteCenterY(name, tileY, scale = 2) {
  return (tileY + 1) * TILE - spriteDimensions(name).height * scale / 2;
}
function worldSpriteFootY(name, tileY) { return (tileY + 1) * TILE; }
function worldSpritePoint(size, x, y, scale) {
  let px=(x+.5)*TILE, py=(y+1)*TILE;
  // Item sheets use icon-center anchors. In the world, their visible union
  // rests on the floor; keep that ground point fixed through animated states.
  if(size.art && size.kind==='item') {
    px+=(size.anchorX-size.unionX-size.width/2)*scale;
    py+=(size.anchorY-size.unionY-size.height)*scale;
  }
  return {x:px,y:py};
}
function inArtCamera(name, x, y, scale = 2) {
  const camera = renderCamera(), size = spriteDimensions(name), point=worldSpritePoint(size,x,y,scale), foot=point.y, cx=point.x;
  const w = (size.cellW || size.width) * scale, h = (size.cellH || size.height) * scale;
  const ax = size.anchorX != null ? size.anchorX * scale : w / 2;
  const ay = size.anchorY != null ? size.anchorY * scale : h;
  const left = cx - ax, top = foot - ay;
  return left + w >= camera.x * TILE && left <= (camera.x + VIEW_W) * TILE && top + h >= camera.y * TILE && top <= (camera.y + VIEW_H) * TILE;
}
function drawWorldSprite(name, x, y, scale = 2, frame = 0) {
  const size = spriteDimensions(name);
  const point=worldSpritePoint(size,x,y,scale), footX=point.x, footY=point.y;
  if (size.art && typeof drawSpriteAnchored === 'function') {
    drawSpriteAnchored(name, footX, footY, scale, frame);
  } else {
    drawSprite(name, footX, worldSpriteCenterY(name, y, scale), scale, frame);
  }
}
function faceActor(actor, dx, dy) {
  const key=actorMotionKey(actor);
  if(dx)state.motion.facing[key]=Math.sign(dx);
  if(dx || dy)state.motion.directions[key]=Math.abs(dx)>=Math.abs(dy) ? (dx<0?'left':'right') : (dy<0?'back':'front');
}
function drawCompanionPost(prop) {
  if (!inRenderCamera(prop.x,prop.y)) return;
  const x=prop.x*TILE, y=prop.y*TILE;
  ctx.fillStyle='#1b1714'; ctx.fillRect(x+7,y+28,21,3);
  ctx.fillStyle='#38281d'; ctx.fillRect(x+14,y+13,6,17);
  ctx.fillStyle='#957047'; ctx.fillRect(x+15,y+13,2,16);
  ctx.fillStyle='#251d19'; ctx.fillRect(x+3,y+4,26,17);
  ctx.fillStyle='#8a6036'; ctx.fillRect(x+5,y+6,22,13);
  ctx.fillStyle='#d5ad63'; ctx.fillRect(x+5,y+6,22,2);
  ctx.fillStyle='#f1d593';
  for (const [dx,dy,w,h] of [[12,12,8,5],[9,9,3,3],[14,8,3,3],[19,9,3,3],[22,12,2,3]]) ctx.fillRect(x+dx,y+dy,w,h);
}

function townBuildingBounds(prop) {
  const art=graphicsCache();
  if(!art.townBuildings || art.townBuildings.map!==state.map) art.townBuildings={map:state.map,bounds:{}};
  const key=`${prop.x},${prop.y}`;
  if(art.townBuildings.bounds[key])return art.townBuildings.bounds[key];
  const excluded=new Set(state.props.filter(p=>p.sprite==='water'||p.sprite==='tree').map(p=>`${p.x},${p.y}`));
  const queue=[{x:prop.x,y:prop.y}],seen=new Set();let x0=prop.x,x1=prop.x,y0=prop.y,y1=prop.y;
  for(let i=0;i<queue.length && seen.size<100;i++){
    const p=queue[i],k=`${p.x},${p.y}`;
    if(seen.has(k)||excluded.has(k)||!state.map[p.y]||state.map[p.y][p.x]!==1)continue;
    seen.add(k);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx,y:p.y+dy});
  }
  const result={x0,x1,y0,y1};art.townBuildings.bounds[key]=result;return result;
}
function townSceneryTiles() {
  const art=graphicsCache();
  if(art.townTerrain && art.townTerrain.map===state.map)return art.townTerrain.tiles;
  const tiles=new Set();
  for(const prop of state.props){
    if(prop.sprite==='water'||prop.sprite==='tree')tiles.add(`${prop.x},${prop.y}`);
    if(['inn','store','hut'].includes(prop.sprite)){
      const b=townBuildingBounds(prop);
      for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++)tiles.add(`${x},${y}`);
    }
  }
  art.townTerrain={map:state.map,tiles};return tiles;
}
// Disposable cosmetic paths/river coverage. The saved map and props are read-only.
function townMaterialLayout() {
  const art = graphicsCache();
  if (art.townMaterials && art.townMaterials.map === state.map && art.townMaterials.props === state.props) return art.townMaterials;
  const water = new Set(), roads = new Set();
  for (const p of state.props) {
    if (p.sprite === 'water') water.add(`${p.x},${p.y}`);
    if (p.sprite === 'bridge') for (let x=p.x; x<p.x+2; x++) water.add(`${x},${p.y}`);
  }
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    if (state.map[y][x] === 0 && ((y>=28 && y<=30) || (x>=37 && x<=40))) roads.add(`${x},${y}`);
  }
  for (const door of state.props.filter(p=>p.sprite === 'doorstep')) {
    const start = `${door.x},${door.y}`, queue = [{x:door.x,y:door.y}], previous = new Map([[start,null]]);
    let end = null;
    for (let i=0; i<queue.length; i++) {
      const at = queue[i], key = `${at.x},${at.y}`;
      if (roads.has(key)) { end=key; break; }
      for (const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]) {
        const x=at.x+dx, y=at.y+dy, next=`${x},${y}`;
        if (state.map[y] && state.map[y][x]===0 && !previous.has(next)) { previous.set(next,key); queue.push({x,y}); }
      }
    }
    while (end) { roads.add(end); end=previous.get(end); }
  }
  return art.townMaterials = {map:state.map,props:state.props,water,roads};
}

// Source coordinates identify facade doors/deck rather than transparent cell centers.
const TOWN_DOOR_SOURCE_X = {inn:114, store:90, hut:55};
function townBuildingVisual(prop) {
  const b=townBuildingBounds(prop), dec=artDecoded(prop.sprite), width=(b.x1-b.x0+1)*TILE;
  const pixelScale=width/dec.bounds.width, foot=(b.y1+1)*TILE;
  const door=state.props.find(p=>p.sprite==='doorstep' && p.y===b.y1+1 && p.x>=b.x0 && p.x<=b.x1);
  const targetX=door ? (door.x+.5)*TILE : (b.x0+b.x1+1)*TILE/2;
  const sourceX=TOWN_DOOR_SOURCE_X[prop.sprite] || dec.anchor[0];
  const left=targetX-sourceX*pixelScale, top=foot-dec.anchor[1]*pixelScale;
  return {left,top,right:left+dec.w*pixelScale,bottom:top+dec.h*pixelScale,
    cx:left+dec.w*pixelScale/2,cy:top+dec.h*pixelScale/2,scale:pixelScale*ART_DENSITY,doorX:targetX,foot};
}
function townBridgeVisual(prop) {
  const dec=artDecoded('bridge'), pixelScale=2*TILE/dec.bounds.width;
  // In this authored source, the walking deck ends at source row 28;
  // the arch projects below it over water. Align that deck edge to hero feet.
  const left=prop.x*TILE-dec.bounds.x*pixelScale, deckY=(prop.y+1)*TILE;
  const top=deckY-28*pixelScale;
  return {left,top,right:left+dec.w*pixelScale,bottom:top+dec.h*pixelScale,
    cx:left+dec.w*pixelScale/2,cy:top+dec.h*pixelScale/2,scale:pixelScale*ART_DENSITY,
    bankLeft:prop.x*TILE,bankRight:(prop.x+2)*TILE,deckY};
}
function inWorldArtBounds(b) {
  const c=renderCamera();
  return b.right>=c.x*TILE && b.left<=(c.x+VIEW_W)*TILE && b.bottom>=c.y*TILE && b.top<=(c.y+VIEW_H)*TILE;
}
function drawTownBuilding(prop) {
  const v=townBuildingVisual(prop);
  if (inWorldArtBounds(v)) drawSprite(prop.sprite,v.cx,v.cy,v.scale);
}

function drawFloorDetails() {
  const themed = THEMED_FLOORS[state.depth];
  if (themed) {
    const arena = state.rooms.find(r => r.isArena);
    if (arena) for (const [ox, oy] of [[-4, -3], [4, 3]]) {
      const x = arena.cx + ox, y = arena.cy + oy;
      if (inRenderCamera(x, y) && state.visited.has(`${x},${y}`)) drawWorldSprite(themed.prop, x, y, 2);
    }
  }
  for (const prop of [...state.props].sort((a,b)=>a.y-b.y)) {
    if (state.area==='town' && prop.isCompanionBoard) { drawCompanionPost(prop); continue; }
    if(state.area==='town' && ['inn','store','hut'].includes(prop.sprite)){drawTownBuilding(prop);continue;}
    // Water is already painted tile-aligned, including beneath the bridge.
    if(state.area==='town' && prop.sprite==='water') continue;
    if(prop.sprite==='bridge'){
      const v=townBridgeVisual(prop);
      if(inWorldArtBounds(v)) drawSprite('bridge',v.cx,v.cy,v.scale);
      continue;
    }
    if(state.area==='town' && prop.sprite==='townGate' && state.townGate){
      const gate=state.townGate;
      if(inArtCamera('townGate',gate.x,gate.y,prop.scale||2)) drawSpriteAnchored('townGate',(gate.x+.5)*TILE,(gate.y+1)*TILE,prop.scale||2);
      continue;
    }
    const sprite=prop.sprite==='tombstone'&&artBiomeAt(prop.x,prop.y)==='throne'?'pillar':prop.sprite;
    const scale=sprite==='water'?2:prop.scale||2;
    if (!inArtCamera(sprite,prop.x,prop.y,scale)) continue;
    if (state.area !== 'town' && !state.visited.has(`${prop.x},${prop.y}`)) continue;
    if(prop.sprite==='doorstep'){
      drawSprite('doorstep',(prop.x+.5)*TILE,prop.y*TILE+spriteDimensions('doorstep').height*scale/2,scale);
    }else{
      drawWorldSprite(sprite,prop.x,prop.y,scale);
    }
  }
  if (state.area === 'town' && state.townPortalOpen && state.townGate && inRenderCamera(state.townGate.x, state.townGate.y)) {
    drawWorldSprite('townPortal', state.townGate.x, state.townGate.y, 2, 1 + (environmentAnimationFrame(state.townGate.x, state.townGate.y) % 4));
  }
  for (const obstacle of state.obstacles) {
    if (!inArtCamera(obstacle.type,obstacle.x,obstacle.y) || !state.visited.has(`${obstacle.x},${obstacle.y}`)) continue;
    drawWorldSprite(obstacle.type, obstacle.x, obstacle.y, 2);
  }
  for (const hazard of state.hazards) {
    if (!hazard.revealed || !inRenderCamera(hazard.x, hazard.y) || !state.visited.has(`${hazard.x},${hazard.y}`)) continue;
    const x = hazard.x * TILE, y = hazard.y * TILE;
    let sprite, frame = 0;
    if (hazard.type === 'flame') {
      const phase = (state.hazardTime + hazard.offset) % 6;
      sprite = 'fireVent'; frame = phase < .4 ? 1 : phase < 2.6 ? 2 : phase < 3 ? 3 : 0;
    }
    else if (hazard.type === 'rocks') {
      if (hazard.stage !== 'warning' && hazard.stage !== 'spent') continue;
      const elapsed = hazard.stage === 'warning' ? state.hazardTime - (hazard.impactAt - 1.2) : state.hazardTime - hazard.impactAt;
      sprite = hazard.stage === 'spent' ? 'rockSpent' : 'rockCrack';
      frame = Math.min(3, Math.max(0, Math.floor(elapsed / (hazard.stage === 'warning' ? .3 : .15))));
    } else {
      // Spikes are a one-shot trap: never animate hidden/armed cells into view.
      if (!hazard.triggered) continue;
      sprite = 'spikes'; frame = 4;
    }
    drawWorldSprite(sprite, hazard.x, hazard.y, 2, frame);
    if (hazard.type === 'rocks' && hazard.stage === 'warning') {
      const fall = Math.max(0, Math.min(1, 1 - (hazard.impactAt - state.hazardTime) / 1.2));
      ctx.fillStyle = '#ac9981'; ctx.fillRect(x + 6, y - 10 + Math.round(fall * 20), 7, 6); ctx.fillRect(x + 22, y - 8 + Math.round(fall * 20), 5, 5);
    }
  }
  const drop = state.floorKey && state.floorKey.drop;
  if (drop && inRenderCamera(drop.x, drop.y) && state.visited.has(`${drop.x},${drop.y}`)) {
    drawWorldSprite('key', drop.x, drop.y, 2);
  }
}

function drawHazardWarnings() {
  for (const hazard of state.hazards) {
    if (hazard.type !== 'rocks' || hazard.stage !== 'warning' || !inRenderCamera(hazard.x, hazard.y) || fogLevel(hazard.x, hazard.y) >= 3) continue;
    const x = hazard.x * TILE, top = (hazard.y+1)*TILE-spriteDimensions('knight').height*2;
    ctx.fillStyle = '#ffd07a'; ctx.fillRect(x + 8, top - 23, 16, 19);
    ctx.fillStyle = '#211b15'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x + 16, top - 13);
  }
}

function drawCinematicActor(name, x, y, scale, frame = 0, direction = 'front') {
  const size = spriteDimensions(name);
  const ax = x + (size.anchorX - size.unionX - size.width / 2) * scale;
  const ay = y + (size.anchorY - size.unionY - size.height / 2) * scale;
  drawSpriteAnchored(name, ax, ay, scale, frame, direction);
}

function drawMimicDefeat(scene) {
  const visual = state.bossDefeat.visual;
  if (!inWorldArtBounds(visual)) return;
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  ctx.translate(visual.footX + scene.shake, visual.footY + scene.rise);
  ctx.scale(1 + scene.squash * 0.25, 1 - scene.squash);
  drawSpriteAnchored(visual.sprite, 0, 0, visual.scale, visual.frame, visual.direction);
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
  ctx.scale(1,1-Math.min(0.12,scene.wing/1000));
  drawCinematicActor('dragonBoss', 0, 0, 4, Math.floor(scene.t * 8) % 4);
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
  if (!inWorldArtBounds(visual)) return;
  ctx.save();
  ctx.globalAlpha = scene.alpha;
  ctx.translate(visual.footX + scene.shake, visual.footY + scene.rise);
  ctx.scale(1 + scene.squash * 0.22, 1 - scene.squash);
  drawSpriteAnchored(visual.sprite, 0, 0, visual.scale, visual.frame, visual.direction);
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
      ctx.save(); ctx.translate(visual.footX - visual.x + guard.dx, visual.footY - visual.y + guard.dy + fall * 10); ctx.rotate(fall * (guard.dx > 0 ? 1.1 : -1.1));
      drawSpriteAnchored(guard.sprite, 0, 0, guard.scale, guard.frame, guard.direction);
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
  const portrait = spriteDimensions(scene.sprite);
  const portraitScale = 260 / Math.max(portrait.width, portrait.height);
  drawCinematicActor(scene.sprite, 0, 0, portraitScale, Math.floor(scene.t * 8 || 0) % 4);
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
    if (fogLevel(Math.floor(point.x / TILE), Math.floor(point.y / TILE)) >= 3) continue;
    const angle = Math.atan2(projectile.toY - projectile.fromY, projectile.toX - projectile.fromX);
    ctx.save();
    ctx.translate(point.x, point.y);
    const effect={arrow:'arrowFX',stinger:'stingerFX',bone:'boneFX',beer:'beerFX',fireball:'fireballFX',frost:'frostboltFX',heal:'healFX',greaterHeal:'greaterHealFX',bolt:'magicBarrierFX'}[projectile.kind]||'magicBarrierFX';
    const phase = Math.min(3, Math.floor(point.t * 4));
    let frame = ['fireball','frost','heal','greaterHeal','bolt'].includes(projectile.kind) ? phase : 0;
    if (projectile.kind === 'bolt' && !projectile.impact && frame === 2) frame = 1;
    if (['arrow','stinger','bone','beer','fireball','frost','bolt'].includes(projectile.kind)) ctx.rotate(angle);
    if (projectile.kind === 'heal' || projectile.kind === 'greaterHeal') ctx.translate(0,-point.t*18);
    drawSprite(effect,0,-4,1,frame);
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
    drawWorldSprite(spriteName, stairs.x, stairs.y, 2);
  }
  for (const t of state.treasures) {
    if (!inRenderCamera(t.x, t.y) || !state.visited.has(`${t.x},${t.y}`)) continue;
    drawWorldSprite('chest', t.x, t.y, 2);
  }
  for (const pot of state.potions) {
    if (!inRenderCamera(pot.x, pot.y) || !state.visited.has(`${pot.x},${pot.y}`)) continue;
    drawWorldSprite('potion', pot.x, pot.y, 2);
  }
  if (state.prisoner && inArtCamera('prisoner',state.prisoner.x, state.prisoner.y) && !state.prisoner.rescued && fogLevel(state.prisoner.x, state.prisoner.y) < 3) {
    const px = state.prisoner.x * TILE + TILE / 2, py = worldSpriteCenterY('prisoner',state.prisoner.y,2);
    drawActorSprite('prisoner', px, py, 2);
  }
  if (state.princess && inArtCamera('princess',state.princess.x, state.princess.y) && !state.princess.rescued && fogLevel(state.princess.x, state.princess.y) < 3) {
    const px = state.princess.x * TILE + TILE / 2, py = worldSpriteCenterY('princess',state.princess.y,2);
    drawActorSprite('princess', px, py, 2);
  }
  if (state.merchant && inArtCamera('merchant',state.merchant.x, state.merchant.y) && (inTown || fogLevel(state.merchant.x, state.merchant.y) < 3)) {
    const px = state.merchant.x * TILE + TILE / 2, py = worldSpriteCenterY('merchant',state.merchant.y,2);
    drawActorSprite('merchant', px, py, 2);
  }
  if (inTown) drawTownNpcs();
  for (const m of state.monsters) {
    if (m.hp <= 0) continue;
    const visual = monsterVisual(m);
    if (!inArtCamera(visual.sprite, m.x, m.y, visual.scale)) continue;
    if (fogLevel(m.x, m.y) >= 3) continue;
    drawActorSprite(visual.sprite, visual.footX, visual.footY - spriteDimensions(visual.sprite).height * visual.scale / 2, visual.scale, m);
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
    if (m.hp <= 0) continue;
    const visual = monsterVisual(m);
    if (!inArtCamera(visual.sprite, m.x, m.y, visual.scale) || fogLevel(m.x, m.y) >= 3) continue;
    const barWidth = m.isBoss ? Math.max(24, visual.width - 12) : 24;
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
  const px = position.x * TILE + TILE / 2, py = worldSpriteCenterY('knight',position.y,2);
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
  dismissTrade(state && state.trade, false);
  cancelSaveLoad(state && state.loadSession, false);
  if (state.ending || state.depth !== FINAL_DEPTH || !state.bossDefeated || !state.princess || !state.princess.rescued) return;
  const dragon = state.boss || state.monsterSpawns.find(m => m.isDragon);
  state.ending = { elapsed: 0, phase: 'reveal', completed: false, frameId: null,
    lastTimestamp: null, events: new Set(), dragon: { ...dragon, hp: 0 } };
  clearBossIntro();
  clearBossDefeat();
  clearMonsterSpeech();
  clearMovementAnimation();
  clearTownReturn();
  resetCompanionRun();
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
      y: t < 5 ? 500 : dragonY - 68 },
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
  ctx.save();
  ctx.globalAlpha = 0.5 + health * 0.5;
  drawCinematicActor('dragonBoss',x,y+(flying?Math.sin(time*10)*4:0),3,flying?Math.floor(time*8)%4:0,'right');
  ctx.restore();
}

function drawEndingHero(hero, time) {
  const moving = hero.crying && state.ending.phase !== 'done';
  const headY = -spriteDimensions('knight').height * hero.scale * .32;
  ctx.save(); ctx.translate(hero.x, hero.y);
  if (hero.crying) ctx.rotate(0.15);
  drawCinematicActor('knight',0,0,hero.scale,moving?Math.floor(time*12)%4:0,hero.crying?'back':'front');
  if (hero.crying) {
    ctx.fillStyle = '#8ae2ff';
    ctx.fillRect(2 * hero.scale, headY, hero.scale, 3 * hero.scale);
  }
  ctx.restore();
  if (hero.crying) for (let i = 0; i < 9; i++) {
    const age = (time * 1.7 + i * 0.23) % 2;
    ctx.fillStyle = `rgba(125, 216, 255, ${0.85 * (1 - age / 2)})`;
    const size = Math.max(2, hero.scale * 0.8);
    ctx.fillRect(hero.x + 2 * hero.scale - age * 20, hero.y + headY + age * 24, size, size * 1.5);
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
    if (scene.time >= 3.6 && scene.time < 5) drawCinematicActor('greaterHealFX',scene.dragon.x,scene.dragon.y-30,2,Math.min(3,Math.floor((scene.time-3.6)/1.4*4)));
    const running = scene.time >= 2 && scene.time < 3.6;
    drawCinematicActor('princess', scene.princess.x, scene.princess.y, 4, running ? Math.floor(scene.time * 12) % 4 : 0, scene.time < 2 ? 'front' : 'right');
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
    const selected = state.selectedCompanion || 'marmalade';
    if (selected === 'marmalade' && state.entranceCat && !state.entranceCat.recruited && !state.entranceCat.retired && !state.companion) return 'A huge cat waits by the gate. Press Space beside it to recruit it.';
    if (selected === 'pip' && state.entranceCat && !state.entranceCat.recruited && !state.companion) return 'Pip waits in town. Enter the dungeon to bring your dog companion.';
    return state.townExit
      ? 'Rest at the Inn, trade at the Store, use the companion board, or return to the dungeon at the gate.'
      : 'Rest at the Inn, trade at the Store, use the companion board, or enter the dungeon at the gate.';
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
  if (state.loadSession) return;
  if (state.consoleOpen || state.helpOpen || state.trade || state.companionPicker) return;
  state.consoleOpen = true;
  state.consoleLines = [];
  state.consoleHistoryIndex = state.consoleHistory.length;
  document.getElementById('devConsole').hidden = false;
  const input = document.getElementById('consoleInput');
  input.value = '';
  consoleMessage('Commands: loadLevel <1-100> · godMode 0|1 · teleportTown · addScrolls <n> · goldADD <amount> · help · clear');
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
  cancelSaveLoad(state.loadSession, false);
  closeCompanionBoard(state.companionPicker, false);
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
  if (state.loadSession) return;
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

function teleportTown(...args) {
  if (args.length) { consoleMessage('Usage: teleportTown'); return; }
  // The console itself is allowed; player menus and hidden simulation are not.
  // Check DOM visibility too while the companion prototype has no session state.
  const roster = document.getElementById('companionOverlay');
  const trade = document.getElementById('tradeOverlay');
  if (!state.started || state.gameOver || state.player.hp <= 0 || document.hidden
    || state.ending || state.helpOpen || state.pause || bossCinematicActive()
    || state.trade || state.companionPicker || state.loadSession || (roster && !roster.hidden) || (trade && !trade.hidden)) {
    consoleMessage('Cannot teleport now.'); return;
  }
  if (state.area === 'town') { consoleMessage('Already in town.'); return; }
  if (state.townPortalOpen) { consoleMessage('A town portal is already open; return through it first.'); return; }
  state.townExit = { depth: state.depth, x: state.player.x, y: state.player.y, reason: 'cheat' };
  state.townPortalOpen = true;
  playSound('magic');
  enterTown();
  log('A debug portal snaps open at the town gate.');
  consoleMessage('Teleported to town; debug portal open.');
  render();
}

function addScrolls(...args) {
  const raw = args[0];
  const count = typeof raw === 'string' && /^[0-9]+$/.test(raw) ? Number(raw) : NaN;
  if (args.length !== 1 || !Number.isSafeInteger(count) || count <= 0
    || !Number.isSafeInteger(state.townScrolls) || state.townScrolls < 0
    || !Number.isSafeInteger(state.townScrolls + count)) {
    consoleMessage('Usage: addScrolls <positive integer>'); return;
  }
  const roster = document.getElementById('companionOverlay');
  const trade = document.getElementById('tradeOverlay');
  if (!state.started || state.gameOver || state.player.hp <= 0 || document.hidden
    || state.ending || state.helpOpen || state.pause || bossCinematicActive()
    || state.trade || state.companionPicker || state.loadSession || (roster && !roster.hidden) || (trade && !trade.hidden)) {
    consoleMessage('Cannot add scrolls now.'); return;
  }
  state.townScrolls += count;
  render();
  consoleMessage(`Added ${count} Town Scroll(s); total ${state.townScrolls}.`);
}

function addGold(...args) {
  const raw = args[0];
  const amount = typeof raw === 'string' && raw.length > 0 && !/[^0-9]/.test(raw) ? Number(raw) : NaN;
  if (args.length !== 1 || !Number.isSafeInteger(amount) || amount <= 0
    || !Number.isSafeInteger(state.gold) || state.gold < 0
    || !Number.isSafeInteger(state.gold + amount)) {
    consoleMessage('Usage: goldADD <positive integer>'); return;
  }
  // Allow the console and god mode, but never change a pending player transaction.
  const roster = document.getElementById('companionOverlay');
  const trade = document.getElementById('tradeOverlay');
  if (!state.started || state.gameOver || state.player.hp <= 0 || document.hidden
    || (state.area !== 'town' && state.area !== 'dungeon')
    || state.ending || state.helpOpen || state.pause || bossCinematicActive()
    || state.trade || state.companionPicker || state.loadSession || (roster && !roster.hidden) || (trade && !trade.hidden)) {
    consoleMessage('Cannot add gold now.'); return;
  }
  state.gold += amount;
  render();
  consoleMessage(`Added ${amount} gold; total ${state.gold}.`);
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
  else if (command === 'teleporttown') teleportTown(...args);
  else if (command === 'addscrolls') addScrolls(...args);
  else if (command === 'goldadd') addGold(...args);
  else if (command === 'clear') { state.consoleLines = []; document.getElementById('consoleOutput').textContent = ''; }
  else if (command === 'help') consoleMessage('loadLevel <1-100> · godMode 0|1 · teleportTown · addScrolls <n> · goldADD <amount> · help · clear');
  else consoleMessage(`Unknown command: ${name}`);
}

function consoleHistoryStep(delta) {
  if (!state.consoleHistory.length) return;
  state.consoleHistoryIndex = Math.max(0, Math.min(state.consoleHistory.length, state.consoleHistoryIndex + delta));
  document.getElementById('consoleInput').value = state.consoleHistory[state.consoleHistoryIndex] || '';
}

function openHelp() {
  if (state.loadSession) return;
  if (state.helpOpen || state.trade || state.companionPicker) return;
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
  cancelSaveLoad(state.loadSession, false);
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

function render(preserveSaveState = false) {
  if (!preserveSaveState && !state.loadSession) { freezePlayerStats(); checkHealth(); }
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
  const postAction=document.getElementById('companionPostAction');
  postAction.hidden=!companionPostContext(); postAction.ariaExpanded=String(!!state.companionPicker);
  document.getElementById('companionAudioToggle').textContent=`Sound: ${state.audio.enabled?'On':'Off'} (M)`;
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
  document.getElementById('tradeAudioToggle').textContent=state.audio.enabled ? 'Sound: On (M)' : 'Sound: Off (M)';
  document.getElementById('endingControls').hidden = !state.ending;
  document.getElementById('skipEnding').disabled = !!(state.ending && state.ending.completed);
  renderEquipment();
  const m = state.merchant;
  const stock = m && m.stock && m.stock.length ? m.stock.map(i => i.name).join(', ') : '(sold out)';
  document.getElementById('merchantStock').textContent = m ? `${state.area === 'town' ? 'Store' : 'Merchant'}: ${stock}` : '';
  document.getElementById('merchantStock').hidden = !m;
  updateSaveFileButtons();
}

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (state.loadSession) {
    const fileUI=state.loadSession.ui;
    if (fileUI && k==='tab') {
      const controls=[fileUI.input,document.getElementById('confirmSaveLoad'),document.getElementById('cancelSaveLoad'),document.getElementById('saveLoadAudioToggle')].filter(el=>el&&!el.disabled&&!el.hidden);
      const index=controls.indexOf(document.activeElement);
      const next=index<0?(e.shiftKey?controls.length-1:0):(index+(e.shiftKey?-1:1)+controls.length)%controls.length;
      e.preventDefault();controls[next]?.focus?.();return;
    }
    if (fileUI && e.target===fileUI.input && ['enter',' '].includes(k)) return;
    if (k==='escape') { e.preventDefault(); cancelSaveLoad(); return; }
    if (k==='r' && !e.repeat) { e.preventDefault(); restartFromEnding(); return; }
    if (k==='m' && !e.repeat) { e.preventDefault(); toggleAudio(); return; }
    if (k!=='tab') {
      if (!(e.target && e.target.tagName==='BUTTON' && ['enter',' '].includes(k))) e.preventDefault();
      return;
    }
  }
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
  if (state.companionPicker) {
    const overlay = document.getElementById('companionOverlay');
    if (k === 'escape') { e.preventDefault(); closeCompanionBoard(); }
    else if (k === 'm' && !e.repeat) { e.preventDefault(); toggleAudio(); }
    else if (k === 'r' && !e.repeat) { e.preventDefault(); restartFromEnding(); }
    else if (k === 'tab') {
      const controls = [...overlay.querySelectorAll('button')].filter(el => !el.disabled && !el.hidden);
      if (controls.length) {
        const index=controls.indexOf(document.activeElement), step=e.shiftKey?-1:1;
        const next=index<0 ? (e.shiftKey?controls.length-1:0) : (index+step+controls.length)%controls.length;
        e.preventDefault(); controls[next].focus();
      }
    } else if (['arrowup','arrowdown','home','end'].includes(k)) {
      const choices=[...overlay.querySelectorAll('[data-companion-id]')].filter(el=>!el.disabled);
      if (choices.length) {
        const index=choices.indexOf(document.activeElement), step=k==='arrowup'?-1:1;
        const next=k==='home'?0:k==='end'?choices.length-1:index<0?0:(index+step+choices.length)%choices.length;
        e.preventDefault(); choices[next].focus();
      }
    }
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
  if (state.trade) {
    const session=state.trade, overlay=document.getElementById('tradeOverlay');
    if (k === 'escape') { e.preventDefault(); closeTrade(false,session); }
    else if (k === 'm' && !e.repeat) { e.preventDefault();toggleAudio(); }
    else if (k === 'r' && !e.repeat) { e.preventDefault();restartFromEnding(); }
    else if (k === 'tab') {
      const controls=[...(overlay.querySelectorAll?.('button') || [])].filter(el=>!el.disabled&&!el.hidden);
      const index=controls.indexOf(document.activeElement),next=index<0?(e.shiftKey?controls.length-1:0):(index+(e.shiftKey?-1:1)+controls.length)%controls.length;
      e.preventDefault();controls[next]?.focus?.();
    } else if (['arrowup','arrowdown','home','end'].includes(k)) {
      e.preventDefault();
      const mode=document.activeElement?.dataset?.tradeMode || session.mode;
      const list=document.getElementById(mode === 'sell' ? 'tradeSellList' : 'tradeBuyList');
      const rows=[...(list.querySelectorAll?.('button') || [])].filter(el=>!el.disabled);
      const index=rows.indexOf(document.activeElement),step=k === 'arrowup' ? -1 : 1;
      const next=k === 'home' ? 0 : k === 'end' ? rows.length-1 : index<0 ? 0 : (index+step+rows.length)%rows.length;
      if (rows[next]) selectTradeRow(session,mode,rows[next].dataset.tradeKey);
    } else if (!e.repeat && ['b','s','u'].includes(k)) {
      e.preventDefault();
      if (k === 'b') tradeBuy(session.selectedBuy,session);
      else if (k === 's') tradeSell(session.selectedSell,session);
      else editTradeCart(session,!!e.shiftKey);
    } else if (!['enter',' '].includes(k) || e.target?.tagName !== 'BUTTON') e.preventDefault();
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
  if (!state.started && ['arrowup','arrowdown','arrowleft','arrowright','home','end'].includes(k)) {
    e.preventDefault();
    const next = k==='home' ? 'marmalade' : k==='end' ? 'pip' : state.companionChoice==='pip' ? 'marmalade' : 'pip';
    setCompanionChoice(next);
    document.querySelector?.(`[data-companion-choice="${next}"]`)?.focus?.();
    return;
  }
  if (!state.started && e.target && e.target.dataset && e.target.dataset.companionChoice && ['enter',' '].includes(k)) {
    e.preventDefault(); setCompanionChoice(e.target.dataset.companionChoice); startGame(); return;
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
  updateSaveFileButtons();
});

for (const [id, action] of [
  ['skipEnding', skipEnding], ['restartEnding', restartFromEnding], ['startGame', startGame], ['drinkPotion', drinkPotion], ['continueGame', continueGame], ['retreatChoice', retreat],
  ['confirmRetreat', confirmRetreat], ['cancelRetreat', cancelRetreat], ['audioToggle', toggleAudio],
  ['helpToggle', toggleHelp], ['closeHelp', closeHelp], ['consoleClose', closeConsole],
  ['closeCompanionBoard', () => closeCompanionBoard()], ['companionPostAction', openCompanionBoard], ['companionAudioToggle', toggleAudio],
]) document.getElementById(id).addEventListener('click', () => { startAudio(); action(); });
for (const id of ['loadGameButton','launchLoadGame','deathLoadGame']) document.getElementById(id).addEventListener('click',openLoadGame);
document.getElementById('saveGameButton').addEventListener('click',saveGameFile);
document.getElementById('cancelSavePreparation').addEventListener('click',()=>cancelSaveLoad());
document.getElementById('saveLoadAudioToggle').addEventListener('click',()=>{ startAudio();toggleAudio(); });
document.getElementById('companionOverlay').addEventListener('click', e => { if (e.target.id === 'companionOverlay') closeCompanionBoard(); });
document.querySelectorAll?.('[data-companion-choice]')?.forEach?.(btn => btn.addEventListener('click', () => { setCompanionChoice(btn.dataset.companionChoice); }));

for (const channel of ['music', 'effects']) {
  document.getElementById(`${channel}Volume`).addEventListener('input', e => {
    startAudio(); setAudioVolume(channel, e.target.value);
  });
}

newGame();
render();
setInterval(enemyTick, 220);
