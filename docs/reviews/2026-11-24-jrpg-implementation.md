# Approved JRPG graphics — implementation and checks

Date: 2026-11-24. Base commit: **5c5a6b0**, version 0.20.0. Status: implemented in the working tree after the user approved both artwork stages and explicitly requested game integration. The user subsequently designated this graphics release **1.0.0**; launch branding and release documentation are updated. No release commit/tag or staging action was performed.

## Result

The existing two-script, offline Canvas game now uses the approved original JRPG artwork: directional full-body figures, broad roof/facade town buildings, organic trees, continuous grass/roads and water, raised dungeon wall faces, five biome materials, redesigned ordinary and boss creatures, themed Cook/Bartender variants, equipment/items, hazards, props and projectile/spell motifs.

The runtime contains **76 sprite/FX names and 211 shared decoded grids**. Compact run-length source is checked into `js/sprites.js`; original painter references and optional maintenance exporters remain under the preview directory. The game never reads preview files, images, JSON inventories or browser tooling. It still loads `sprites.js` before `game.js`, with no build, server, imports, engine, remote fonts or downloaded media. The four runtime files total **506,887 bytes (about 495 KiB)**.

## Rendering changes

- `spriteFrameGrid(name,frame,direction)` resolves fixed-size baked variants; front defaults preserve static/cinematic callers. Direction/frame and icon caches have independent keys. Four-way humanoid views and walking, wing, cast, crown and flame poses use the existing visual clocks.
- Foot anchors use `worldSpriteCenterY()` consistently for actors and world props. `inArtCamera()` includes visible overhangs while logical targeting and map visibility remain tile-based. Monster bars and combat speech share `monsterVisual()` bounds. Rock warnings now sit above the taller hero.
- Town buildings derive their draw bounds from the existing blocked map footprint, with cached exclusions for tree/water tiles. The map, doorstep/gate interactions and paths are not moved. Doorstep art connects at the building edge; the bridge spans the existing two river columns. Exterior blockers retain hedge art. Town patrols keep their old logical cadence/routes, with motion interpolation/direction bookkeeping isolated in `state.motion`.
- Terrain caches use bounded coordinate phases so large surfaces join across tile edges. Crypts use masonry/flagstones, caverns irregular rock, kitchens brick/ceramic, taverns timber/boards, throne rooms marble/carpet. Depth-50 material and decorative-column overrides are rendering-only; its saved `biome`, props and arena geometry remain unchanged.
- Complete new boss bodies are reused by intros/defeats and companions. Hydra intros no longer duplicate the entire full-body figure as if it were a single head; dragon cinematics use the new wing poses instead of drawing an extra set of old wings over them. Existing phases, durations, audio events, rewards and lifecycle guards remain.
- Projectiles use approved cached motifs while retaining their old logical effects, endpoints, travel clocks and pause/cleanup behavior. Audio code is unchanged. Three tome sprite identifiers are visual metadata only.

## Gameplay preservation

All **138 dependency-free behavior tests passed** (132 existing tests plus 6 focused graphics/state contracts). Existing art assertions were updated for the approved dimensions and cached projectile painters, retaining checks for palette coverage, stable bounds, animation changes, fixture stability and boss arena fit. New tests cover directional cache separation, fixed foot anchors, untouched town footprints/interaction tiles, saved throne-floor contents and hidden-art/culling behavior.

A seeded before/after comparison against the saved pre-change source matched the town, ten patrol ticks, and depths 1, 2, 3, 4, 5, 10, 20, 30, 40, 50 and 100. Compared fields included map/rooms, player/progression, props, NPC/animal positions, keys, monster templates, loot, hazards/obstacles, equipment/inventory, scrolls, gold/kills/turns. Sprite identifiers were excluded because intentional visual metadata changed. This is targeted evidence, not an exhaustive equivalence proof.

The graphics-only pass did not bundle the weighted-spawn/targeting fixes or change gameplay rules. A subsequent explicitly authorized follow-up now fixes weighted spawning and nearest targeting for both Frostbolt and Magic Barrier, as recorded in tasks/changelog. Historical graphics verification below predates that intentional behavior change.

## Browser and performance checks

[Browser evidence](2026-11-24-jrpg-browser.json) records actual isolated Chrome `file://` checks:

- Launch freezes simulation; start uses an actual button interaction.
- Space recruitment/gate descent, J scroll consumption/exact-tile return, connected stairs/layout persistence and confirmed retreat-to-town.
- Real keyboard movement/interpolation, directional hero art, Help/health animation freezes, dialog controls and 390px mobile Help without horizontal overflow.
- All nine unique/themed boss intro/defeat kinds, frozen input during defeat, Esc skipping, princess interaction, healing/sunset ending phases, Help freeze during ending, skip and restart. Prepared phase advancement was used; this was not a human-length campaign or a new subjective timing review.
- Audio preferences survive restart; a separate check observed a running AudioContext after a user interaction. Audible quality remains unassessed.
- No JavaScript errors or remote requests in checked scenarios.

[Pixel/performance evidence](2026-11-24-jrpg-performance.json) additionally verifies hidden-spike pixel equality, four distinct hero views and changing bat/dragon/torch frames. Tests cover hidden-tab and stale-frame lifecycle behavior; the browser pass did not independently repeat every historical check.

Same-browser warm draw-plus-minimap benchmark, prepared depth-50 fixture, 80 warm-ups + 240 samples:

| Build | Median | p95 |
| --- | ---: | ---: |
| Before | 0.6 ms | 2.3 ms |
| After | 0.8 ms | 2.5 ms |

These are local observations, not universal FPS guarantees. The p95 increase was about 9%; the capped on-demand 30fps loop remains intact. New art is lazily cached; no gameplay RNG or clocks advance during painting.

Syntax checks and external startup smoke passed (`SPRITES loaded: 76`, `PALETTES loaded: 76`, `SMOKE_OK`). After the final equivalent palette-table cleanup, 13 focused rendering/material checks passed as well. No behavioral test assertions were relaxed to hide a gameplay failure.

## Screenshots and maintenance

Runtime captures/bestiary portraits: [docs/screenshots/2026-11-24-jrpg](../screenshots/2026-11-24-jrpg/). README uses implemented art. Town recruitment is exercised through input; dungeon/throne images are labeled prepared encounters with controlled camera/exploration and characters. They are not claims of organic campaign completion. Prior design/implementation screenshots remain archived.

[Runtime inventory](../previews/2026-11-24-classic-jrpg/inventory.md) · [Machine-readable asset bounds](2026-11-24-jrpg-runtime-assets.json) · [Optional export recipes](../previews/2026-11-24-classic-jrpg/design-v3/collection/tools/README.md)

Remaining work is the pre-existing human campaign/audio assessment and unrelated gameplay backlog. A complete human run, every procedural-map overlap and all hardware/browser combinations were not tested. Existing CSS/sidebar behavior was preserved; prepared long-log full-page captures are not a new layout redesign.
