# Expansion: ranged/magic combat, 100 floors, themed levels and bosses

Status: design + implementation checklist. Approved scope from the user on 2026-11-23.
A partial implementation already exists in the working tree (Wasp/Mage/Healer, Bow, player
Fireball/Heal, themed floors 3/7, themed bosses, ranged enemy AI, 81 passing tests). This
document describes the full requested feature set. All six phases are implemented,
including Phase 6 (Skeleton King throne room).

## 1. Architecture constraints (unchanged)
- Plain HTML5 canvas, no modules, no dependencies, no build step; `sprites.js` then `game.js`;
  everything works over `file://`.
- All mutable state stays in `state`; floor saves contain world contents and monster
  templates only. `FLOOR_FIELDS` must be extended only for new per-floor world objects.
- Logical positions stay in world coordinates; animations stay transient (`state.motion`,
  `state.bossDefeat`, `state.bossIntro`) and never enter floor saves.
- Sim time (`activeTime`, hazard/speech/mana clocks) advances only during active, visible,
  unpaused play. Pauses, help, hidden tabs, cinematics and boss scenes freeze it and reset
  timestamps on resume.
- Damage goes through `hurtPlayer()`; equipment changes go through `equipItem()`; boss
  callbacks are identity-bound and canceled by travel/death/restart/ending.

## 2. Combat: ranged enemies, magic enemies, archery and spells
Already implemented (repair pass):
- `MONSTER_TYPES` has Wasp (`range`, `projectile`), Mage (`magic`, `magicType: 'attack'`,
  `magicRange`) and Healer (`magicType: 'heal'`); they reuse existing artwork.
- `enemyAttack()` resolves range, `hasLineOfSight()`, dodge, hit chance and sound before
  melee fallback; `enemyTick()` lets ranged/magic monsters fire from outside melee range
  while keeping their shared 0.8s cooldown.
- Player: `rangedWeapon()` + `visibleTargets()` + `shootBow()` (E), `castSpell()` (F/G),
  `state.player.mp/maxMp`, 2-second active-time mana regeneration, HUD bar, help text,
  and `Bow` treasure with a dedicated sprite. Fireball costs 8 MP and hits visible foes
  within 3 tiles; Heal costs 12 MP and restores 30% max HP.

Remaining work:
1. [done] Art: dedicated Wasp, Mage and Healer pixel grids/palettes, wing/cast frames via
   `spriteFrameGrid()` and `actorAnimationPose()`, and motion-driven frames while visible.
2. [done] Projectiles: transient `state.motion.projectiles` (kind, from/to world pixels,
   elapsed, duration) driven by the motion clock; stingers, bolts, beer mugs, arrows,
   fireballs and heal sparkles draw above actors. Damage resolves at launch, never in draw.
3. [done] Spellbook/magic progression: Frostbolt and Greater Heal learn from treasures and
   merchant stock; `state.player.spells` is player progression (never a floor save); each
   spell has an active-time cooldown in `state.spellReadyAt`, an MP cost and a key binding;
   known spells appear in the sidebar. Base Fireball/Heal remain known from the start.
4. [done] Balance pass: ranged/magic monsters unlock by `minDepth`, their accuracy and
   attack scaling rise with depth, heals shrink to 15% and enemy healers target the most
   wounded visible ally. Fireball never stuns, so no stun-lock path exists.
5. [done] Merchant stock and loot draw from a depth-filtered pool that includes Bow and
   spellbooks on applicable floors; already-known tomes are skipped without charging gold.

## 3. Environments: larger maps, more enemies, merchant every second floor
1. [done] `W=96`, `H=64` with a 32-room target and 900 placement attempts; viewport stays
   18x12 at `MAP_ZOOM=2`, so draw cost is unchanged. Camera clamps, culling, flood-fill,
   hazard/obstacle placement, minimap canvas (288x192) and tests now derive from constants.
2. [done] Ordinary monsters scale to `min(40, 6 + depth*3)` with unique spawn tiles;
   composition is depth-gated and biome-biased, with hidden key carriers still chosen from
   ordinary monsters and arrival buffers preserved.
3. [done] Five biomes (crypt, cavern, kitchen, tavern, throne) select coordinate-derived
   cached tile palettes, non-blocking saved props, hazard mixes and favored monster types.
   Props are included in `protectedFloorTiles()` so obstacles and hazards avoid them.
4. [done] Merchants spawn on every even non-boss floor with stock count and prices scaling
   by depth; they share even floors with prisoners without overlap via `placeFloorObjects()`.
5. [done] Flood-fill reachability, safe spawns, scrolled viewport culling, minimap scaling
   and hidden-secret checks pass for 50 varied floors plus the full behavior suite.

## 4. Campaign: 100 floors and a boss every tenth floor
1. Change `FINAL_DEPTH` from 10 to 100 and make all gates data-driven: depth bands,
   key requirement on every non-final floor, boss gates, objectives, HUD depth labels,
   launch tagline, ending guard, and descent rewards. Depth 100 has no descent key and is
   the dragon/ending floor.
2. Define a boss roster table keyed by depth: mimic at 5 (existing gate), then a new boss
   every 10 floors (10,20,...,90) plus dragon at 100. Rotate Hydra, Wild Boar, Medusa
   (magic attacks), Dark Wizard (long-range magic), and reuse/extend Mimic with new
   mechanics at higher tiers. Floor 50 is the Skeleton King throne room (see section 6).
3. Scale boss HP/attack/XP/gold from a tier curve so deep bosses remain dangerous without
   breaking level-up pacing; keep boss-defeated flags permanent per floor and prevent
   respawns on revisit. Keep ordinary monster templates and key carriers on boss floors.
4. Boss arenas: generalize the reserved `isArena` room from the current Mimic/dragon sizes
   to a per-boss footprint in the boss table; keep three-tile halls, clear spawn buffers,
   hazard-free arenas and stairs away from the boss center.
5. Boss animation framework: add `state.bossIntro` and a per-kind defeat descriptor.
   Encounter: freeze input/simulation, pan or flash, show boss name/HP, run a short
   identity-bound rAF scene, skip with Esc, then hand control back. Death: a distinct
   in-world or screen-space scene per boss (hydra heads regrow/collapse, boar charge and
   fall, medusa petrify shards, wizard burst/banish, skeleton king crown shatters).
   Reuse the existing clamped/identity-bound `bossDefeat` infrastructure; clear every
   transient on travel, restart, death, ending and skip. No stale callbacks may mutate a
   fresh run.
6. Art/frames: dedicated large sprites for each new boss in `sprites.js` with palettes and
   logical bounds from `spriteDimensions()`; extend `spriteFrameGrid()`/`actorAnimationPose()`
   with per-kind wing/hop/cast/charge frames while keeping single-tile combat and shared
   bounds for bars, bubbles and cinematics.

Implementation note: Phase 4 added the roster, gates, scaling and generic defeat labels.
Phase 5 added dedicated large sprites/frame poses for the new bosses plus the identity-bound
intro/defeat animation framework; the Skeleton King throne room remains Phase 6.

## 5. Special themed levels
1. Keep floors 3 (Orc's Kitchen) and 7 (Skeleton Pub) as the first themed rooms; add more
   from a table so they recur in later depth bands with scaled bosses and loot.
2. Orc's Kitchen: lots of Orc cooks/underlings, cauldron props (already added), a large
   Cook boss with throwing-pan ranged attacks; ambient sizzles, food treasure.
3. Skeleton Pub: skeleton patrons, bar counter props (already added), a large Skeleton
   Bartender boss who throws beers at range (already flagged `ranged`, `projectile: 'beer'`);
   mugs, stools, and a "last call" one-shot audio cue.
4. Each themed floor must use the same generation contract: reserved arena, reachability,
   hidden key unless final floor, saved per-floor boss-defeat flag, no duplicated rewards
   on revisit, objective text naming the floor, and a themed encounter/death flourish.
5. Do not let themed floors bypass the descent key; they add flavor, not campaign shortcuts.

## 6. Floor 50: Skeleton King's throne room
1. [done] Register depth 50 as a named boss floor that overrides the generic tenth-floor boss.
2. [done] Build a distinct throne-room layout (long central aisle, throne dais, torch rows,
   banners, guard alcoves) as saved world objects/props; keep the arena and stairs rules.
3. [done] Skeleton King: large skeleton artwork with crown, long-range bone projectiles and
   summoned skeleton guards; unique intro and death animation (crown shatters, army falls).
4. [done] Defeat flag, rewards, objective and log text survive revisits; no duplicate XP/gold.

## 7. Verification and rollout
- Syntax: `node --check js/game.js && node --check js/sprites.js`; behavior: `node --test
  tests/game.test.cjs`; external smoke script in the temp directory. Note: the local Node
  26.12.1 currently needs `DYLD_LIBRARY_PATH` pointing at a symlink from `libsimdutf.37.dylib`
  to the installed `.38` library; this is an environment workaround, not a code dependency.
- Extend tests per phase: ranged LOS/cooldown, spell costs/MP/HUD, merchant cadence, larger
  world connectivity/culling, boss table/gates through depth 100, themed floors, intro/defeat
  cleanup, and floor-50 throne rules. Keep the current 81 tests green.
- Manually verify over `file://`: keyboard combat, dialogs, cinematics/skips, sound after a
  user gesture, minimap, mobile layout, and no remote requests.
- Update `AGENTS.md`, `tasks.md`, help text and preview artifacts as each phase lands. Do not
  stage or commit without an explicit request.
