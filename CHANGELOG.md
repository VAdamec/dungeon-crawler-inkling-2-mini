# Changelog

Versions below distinguish the current working build from committed releases. Entries summarize local source, plans and git history; dates are local commit/review dates. Intermediate working-version numbers are not reconstructed as releases.

## Unreleased — working build 0.20.0

Reviewed 2026-11-24; latest committed version is 0.16.3.

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
