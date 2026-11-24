# Changelog

Versions below distinguish the current working build from committed releases. Entries summarize local source, plans and git history; dates are local commit/review dates. Intermediate working-version numbers are not reconstructed as releases.

## 1.0.0 — 2026-11-24

Classic JRPG graphics release, based on 0.20.0 (`5c5a6b0`). Runtime launch branding is now 1.0.0.

### Fixed — 2026-11-24

- Ordinary monster spawning now samples every slot of the depth-filtered, biome-weighted pool. This fixes excluded eligible types on early floors and excessive last-entry spawning at depth. Configured minimum depths, duplicate weights and monster stats are unchanged; the encounter mix can change on both early and late floors.
- Frostbolt and Magic Barrier now target the nearest living, visible enemy within their existing range and line of sight. Distance uses the larger tile-axis difference; equal distances choose the lowest monster ID, independently of monster-list order. Target selection consumes no RNG and does not reorder the live array.
- Added regression coverage for generated floors 1/2/100, target order/ties, visibility/LOS/camera eligibility, spell ranges and unchanged mana/cooldown/empty-cast behavior. Existing Barrier push/impact and spell damage rules remain intact.
- Verified 151 passing behavior tests, both script syntax checks, external smoke and both spell hotkeys in offline Chrome, with no browser errors or network requests.

### Graphics update — 2026-11-24

- Integrated the user-approved classic JRPG artwork across town, all ordinary/themed/campaign monsters, equipment/items, hazards, props and projectile effects. Four-direction humanoids, walking poses, wings, torches and existing cinematic clocks remain local and pause-aware.
- Fitted buildings to their existing blocked town footprints; added art-aware culling, stable foot anchors and throne-room material/column treatment without changing generated maps, collision or campaign rules.
- Stored 76 original sprite/FX names as compact pixel grids in the existing two-script runtime; no external assets, dependencies or build step. Launch branding identifies release 1.0.0.
- Updated runtime screenshots/bestiary and recorded 138 passing behavior tests, smoke, offline-browser checks, matching seeded gameplay fixtures and a warm rendering comparison. See [implementation evidence](docs/reviews/2026-11-24-jrpg-implementation.md).

## 0.20.0 — 2026-11-24

Commit `5c5a6b0`: town, companions and teleport flows, with the then-current documentation and screenshots.

### Added

- Persistent town hub with Inn, Store, villagers, animals, river/bridge and dungeon gate; runs now start in town and depth-1 up stairs return there.
- Retreat-to-town with an exact saved dungeon return point, full HP and preserved MP/active-time cooldown.
- Stored Town Scrolls and a one-use return portal at the town gate.
- Marmalade, the recruitable talking cat companion, with bat preference and tiny attacks; adjacent companion following and fog light.
- Updated README screenshots and illustrated monster/boss stats, spell costs/effects, archery and companion reference.

### Documentation

- Reconciled tasks, handover and plan status with the current 100-floor, 96×64-world build.
- Recorded 132 passing behavior tests, syntax/smoke and selected offline Chrome checks in the [status review](docs/reviews/2026-11-24-status-review.md).
- Recorded open weighted-spawn and Barrier-targeting issues; this documentation pass does not change gameplay.

## 0.16.3 — 2026-11-24

Commit `895af42`: adventure-log fix. Hero stats occupy a compact left panel above a larger internally scrolling log.

## 0.16.2 — 2026-11-23

Commit `24e6b26`:

- Expanded campaign to 100 floors, with additional bosses, dedicated art/intro/defeat scenes, depth-50 Skeleton King throne room and final dragon/princess ending at depth 100.
- Added ranged/magic monsters, Bow attacks, player spells/tomes, mana and regeneration, five biome variants and larger 96×64 worlds.
- Added defeated-boss companions and developer console with level loading and god mode.

## 0.12.0 — 2026-11-23

Commits `fe2ab95`, `eb252b6`, `b9f2ab7`: movement interpolation, walking poses, wings, hops and animated wall/vent flames, with cached frames and pause-aware visual clocks.

## 0.11.0 — 2026-11-23

Commit `e0b2056` bundles the original pixel-art redesign, 2× map zoom, Help & settings modal, boss animations and associated previews/documentation.

## Earlier milestones — 2026-11-23

- `e69e024` (0.7): explored-area minimap.
- `b35f653` (0.6): larger bosses and accommodating halls/arenas.
- `7f8200d` (initial repository milestone): existing dungeon game foundation. Earlier implementation details remain in [handover](handover.md) and dated [plans](docs/plans/).
