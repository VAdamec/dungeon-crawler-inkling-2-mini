# Coherent static pixel-art refresh

Approved by the user on 2026-11-23 after selecting a coherent dungeon/character/item pass with no new animation.

## Direction
Original, crisp pixel artwork: slate-blue masonry, worn stone slabs, recessed wall edges, cracks/moss, warm brass and amber torchlight. Full-body characters have consistent outlines, shading, and ground shadows; monsters retain distinct silhouettes. Large dragon/Mimic art remains scaled for their arenas. Items, stairs, and hazards must be recognizable at the existing browser viewport size.

Inspiration: https://indie-vova.itch.io/dungeons-and-pixels-starter-pack/devlog/1019407/devlog-2-dungeons-pixels-starter-pack-future-plans . Use the general pixel-dungeon direction, not copied asset grids or purchased artwork. All artwork in this pass is original code-native pixel data and Canvas tile painting. No external asset download or image-generation runtime.

## Boundaries
Preserve the plain two-script architecture, offline file:// launch, 32px tiles, 72×48 floors, 36×24 viewport, minimap secrecy, current progression/combat, traps and discovered stairs. Existing ending and boss-defeat scenes retain their timing/input behavior and use the refreshed sprites. No new animation, dependencies, engine, or gameplay mechanics.

## Rendering
Use detailed pixel grids with explicit logical dimensions so higher-resolution art keeps existing positions, boss bounds, and cinematic scale. Rasterize static sprites and tile variations into small offscreen canvases on first use; keep disposable caches under state and reuse them across restarts. Use nearest-neighbor drawImage for rendering. Retain a direct painter fallback for the existing no-DOM smoke harness. Terrain variation is coordinate-derived and consumes no gameplay randomness. Draw only viewport terrain and visible entities. Torchlight is static and limited to decorative wall fixtures; hidden spikes remain invisible.

## Checks and completion
- [x] Refresh characters/bosses, props/items/stairs, and cohesive terrain/light/shadows.
- [x] Add cached rendering with unchanged world dimensions and deterministic scenery.
- [x] Run behavior/syntax/smoke checks; cover atlas dimensions/cache reuse and rendering secrecy.
- [x] Inspect normal gameplay, items, large bosses, boss defeat, ending and mobile in Chrome. Measure warm rendering time and total runtime size.
- [x] Update README, tasks, guidance and handover; preserve user edits and staging; no commit.

The user requested visual review before implementation and approved the rendered preview with “Perfect.” Saved sheets and a portable gallery are in `docs/previews/2026-11-23-static-graphics/`. Implementation verified with 67 tests plus syntax/smoke and actual Chrome gameplay/cinematic/mobile checks. Measured warm render median 0.5ms/p95 0.7ms locally; runtime files about 164 KiB.
