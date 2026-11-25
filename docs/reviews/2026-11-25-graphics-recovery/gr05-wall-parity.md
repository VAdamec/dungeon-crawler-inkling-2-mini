# GR-05 — Dungeon wall/biome parity

Date: 2026-11-25
Status: superseded by the completed GR-05/GR-06 verification below.

**Current evidence:** [completion report](gr0506/README.md). Follow-up found and fixed a material-cache identity collision and corrected concave corner geometry. The independent real-browser comparison now covers all 1,280 wall/biome combinations (exact alpha, maximum RGB rounding delta 1). Earlier checks below are historical and did not catch those defects.

## Changes
- `js/sprites.js`: updated `paintArtWallTile()` to match accepted final-preview wall treatment: opaque full-tile top, dark overlay, exposed south face uses `face` crop at lower tile band (`0,20,32x12` from 32x32 face, source row offset 20), edge/coping lines by biome palette, concave corner marks; all drawing clipped to tile bounds. Keeps 47-mask normalization, cardinal/diagonal rules, and map value 2 distinct from wall connectivity.
- `tests/game.test.cjs`: added `GR-05 dungeon wall topology/material parity covers 256 masks, 5 biomes, fixtures, and cache keys` covering 11 explicit topology fixtures, 256 raw masks normalizing to 47 plans, 256 raw masks × 5 biomes painted by actual runtime painter with opacity and in-bounds checks, normalized cache-key contract (47×5), and deterministic same-input/same-pixels paint.

## Checks
- `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --check js/sprites.js js/game.js tests/game.test.cjs` — pass (syntax checked during run).
- Targeted: `--test-name-pattern="GR-05|wall tile cache|connected wall edges|hero walks along a one-tile corridor"` — **4 pass, 0 fail**.
- Full suite: **159 pass, 0 fail, 0 skipped, ~74.4s, 607,961,088 bytes max RSS** (default heap, required DYLD path).

## Evidence
- Browser/file:// screenshots (headless Chromium): `gr05-crypt.png`, `gr05-cavern.png`, `gr05-kitchen.png`, `gr05-tavern.png`, `gr05-throne.png` in this directory. Captures used real `index.html` gameplay rendering; biome was set explicitly per scene to exercise each material while keeping normal map/camera/render path.
- 11 fixtures covered: isolated, horizontal-line, vertical-line, end-n, end-s, corner-L, junction-T, cross, diagonal-concave, border, obstacle-neighbor.

## Gameplay/state/RNG impact
- Rendering-only wall painter change. No map generation, RNG, collision, interaction, save/floor fields, or stats changed.

## Risks / follow-up
- GR-05 plan also asks for comparison against `final-preview.js` and 11 original topology fixtures from design artifacts; fixtures used are explicit representative set matching design categories. Human visual comparison against final preview still recommended.
- GR-06+ remain.
