# Changelog

Versions below distinguish the current working build from committed releases. Entries summarize local source, plans and git history; dates are local commit/review dates. Intermediate working-version numbers are not reconstructed as releases.

## 2.1.0 — 2026-11-26 (alpha)

Released for alpha testing by explicit user decision. Remaining native/platform/manual acceptance checks are deferred to alpha testing, not marked passed. **Native GR-09 background-tab/minimize remains UNVERIFIED.** [Release verification and alpha follow-up](docs/reviews/2026-11-26-release-2.1.0/README.md).

- Added starter companion selection and the town companion post for choosing unlocked companions, with corrected companion/cinematic behavior and input/focus handling.
- Hardened developer-console travel and inventory commands; added `goldADD <amount>` with strict numeric/overflow checks and immediate gold display updates. Developer commands remain outside player Help.

- Added a selectable Buy/Sell cart with item details, projected stats, Undo/Reset and explicit Confirm/Cancel. Town Store and dungeon merchant stock, gear and learned spells persist correctly; known tomes stay in stock disabled.
- Completed market recovery checks: guarded direct actions during shopping, excluded closing paint time from gameplay, recovered failed dialog paints/audio and rejected stale or interrupted commits. [Market integration results](docs/reviews/2026-11-26-m3-market/README.md). **Native GR-09 background-tab/minimize remains unverified.**

- Added portable manual JSON Save/Load in Help, with Load on the start and death screens, a checked preview, explicit confirmation and Cancel. Files preserve progression, explored floors, current encounters, companions and town portals without browser storage.
- S4 fixed long UI stalls on large files by validating and hydrating in cancellable chunks. Save preparation now has a Cancel button; stale work cannot load or download after cancellation/restart.
- Verified real files in both directions between two fresh Chrome profiles and a copied game folder, including 100 explored floors and the exact 32 MiB input boundary. Added seven S4 regression groups and updated player instructions/screenshots. [S4 results and performance limits](docs/reviews/2026-11-26-s4-acceptance/README.md). Physical mobile and native OS chooser-cancel observation remain unverified; later acceptance added passing WebKit package flows while Firefox coverage remains incomplete; **native GR-09 background-tab/minimize remains unverified**.

## 2.0.0 — 2026-11-25

Integrated graphics release, with a concise player README/Help and separate player reference/developer documentation. Includes the required offline art payload; no install, server or runtime network dependency. **GR-09 native background-tab/minimize observation remains unverified**; the explicit visibility-handler fixture passing is not native validation.

### Graphics and documentation

- Completed GR-10 documentation: fresh integrated runtime/Help/mobile screenshots, 18 bestiary figures and nine-boss sheet, verified stat tables, credits/provenance, current offline load-order/bake guidance and artifact/hash ledger. GR-10 itself changes documentation, player Help and release branding; no game mechanics or source art changes. **GR-09 native background-tab/minimize verification remains unverified**; documentation completion does not close it. [GR-10 record](docs/reviews/2026-11-25-graphics-recovery/gr10/README.md).

- GR-09 acceptance follow-up fixes live-monster foot alignment and unbounded duplicate canvases from continuous cinematic scaling; adds two regressions. Full browser/secrecy/state and paired performance evidence is recorded; native background-tab visibility remains unverified in automation. [GR-09 report](docs/reviews/2026-11-25-graphics-recovery/gr09/README.md).

- Completed GR-08 cinematic audit: fitted/anchored boss portraits and defeats, authored dragon wings and princess run, rear-facing sunset hero with corrected tears, real skeleton guard collapse and unobscured defeat scenes. Guards now stop fighting after the king's collapse without extra rewards. Added eight regressions and file:// captures for all nine boss kinds/companions and six ending phases. [Audit and evidence](docs/reviews/2026-11-25-graphics-recovery/gr08/README.md).

- Completed GR-07: removed duplicate procedural gait from prepared actors and stabilized feet; corrected vent/rock/spike visual states, animated spell phases and projectile orientation, separated Greater Heal art, kept projectile pixels under fog and enabled visible portal animation. Added seven regressions and file:// casts/trap/motion/secrecy checks. [GR-07 evidence](docs/reviews/2026-11-25-graphics-recovery/gr07/README.md).

- Completed GR-05/06: fixed material-cache collisions behind fragmented dungeon floors/walls, matched approved wall corners, enabled prepared town terrain, and aligned bridge deck/banks, building doors and gate to existing interaction tiles.
- Stabilized wall torch mounts while retaining animated flames; grounded world potions/items on their own floor tile without changing icon anchors or collision.
- Verified 164 game tests, 27 preview tests, normal `file://` browser wall/town/portal scenarios and nine seeded before/after state comparisons. [Evidence and screenshots](docs/reviews/2026-11-25-graphics-recovery/gr0506/README.md). Wider graphics integration remains in progress; release branding is 2.0.0.

## 1.0.1 — 2026-11-24

Wall readability patch on committed 1.0.0 (`0218989`). Runtime launch branding is now 1.0.1.

### Fixed

- Joined dungeon walls using exposed neighbor edges instead of repeating standalone facades. Wall tops and lower faces now fit inside their blocked 32×32 tile, removing the 48px overhang that painted onto walkable corridors. Crypt floors use flat chipped flagstones to distinguish them from walls. Added footprint, corner/cache and narrow-corridor movement regressions; all 155 tests pass.
- Preserved existing collision and movement rules; offline Chrome verifies blocked walls and corridor ends, walkable narrow passages, animated torches, throne-room rendering, Help and restart without browser errors or network requests.
- Updated README, tasks, handover and agent guidance with the correction and controlled before/after captures. Both script syntax checks and external `SMOKE_OK` pass. See [wall rendering evidence](docs/reviews/2026-11-24-wall-rendering.md).

## 1.0.0 — 2026-11-24

Commit `0218989`: classic JRPG graphics release, based on 0.20.0 (`5c5a6b0`), including weighted spawning and nearest spell targeting. Launch branding at this release was 1.0.0.

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
