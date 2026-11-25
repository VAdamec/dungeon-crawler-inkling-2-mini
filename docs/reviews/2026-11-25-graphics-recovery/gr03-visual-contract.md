# GR-03 — Visual contract restoration

Date: 2026-11-25
Status: complete (code/tests/evidence); browser screenshots captured for review, not a substitute for final human visual sign-off

## Changes
- `js/sprites.js`: `artBounds()`/`artUnionBounds()` ignore empty/null bounds. `spriteDimensions()` returns union visible bounds across all ART_RUNTIME frames/directions for a role, plus `cellW/cellH`, `anchorX/anchorY`, `unionX/unionY`, `kind/target/material`. `spriteAnchor()` returns frame anchor, frame visible bounds, and union bounds metadata.
- `js/game.js`: `monsterVisual()` uses foot anchor + union bounds and per-role `actorDrawScale()` (no front-frame-only visual box), returns `footX/footY`, `cellW/cellH`. Monster draw/cull/HP-bar loops use visual scale/union-aware culling. `monsterSpeechLayout()` anchors to `visual.x` (interpolated visual center) for consistent bars/bubbles/speech during motion.
- `tests/game.test.cjs`: strengthened boss contract to accepted per-role source union bounds at scale 2 and bar placement/width checks; cache reuse test asserts drawImage reuse and stable sprite cache keys; added `GR-03 visual contract` covering all 76 coverage roles present, manifest-derived character/item bounds/anchors, boss bounds/scales, foot-anchor stability across 4 dirs×4 frames for key roles, tiny boss companion/Marmalade scale contract, bat/wasp hovering bounds/foot stability, frame/direction cache separation, 32x32 equipment icon draw contract, empty semantic states, HP bar/speech/shadow placement, and viewport-edge culling contract. Movement interpolation test adjusted to reveal fog around interpolated monster (intent-preserving visibility for speech layout).

## Checks
- `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --check js/sprites.js js/game.js tests/game.test.cjs` — pass.
- Targeted GR-03/boss/cache/movement tests — pass.
- Full suite: **157 pass, 0 fail, 0 skipped, ~75.7s, 605,995,008 bytes max RSS** (default heap, with required DYLD_LIBRARY_PATH).

## Browser evidence (headless Chromium, file:// index.html)
Captured to `docs/reviews/2026-11-25-graphics-recovery/`:
- `town-real.png`, `marmalade.png`, `flying.png`
- `boss-5.png`, `boss-10.png`, `boss-20.png`, `boss-30.png`, `boss-40.png`, `boss-50.png`, `boss-60.png`, `boss-70.png`, `boss-80.png`, `boss-90.png`, `boss-100.png`

These are evidence artifacts; final human visual comparison against `docs/previews/2026-11-25-0x72/final-preview.html` is still required by GR-03 acceptance where visual sign-off matters.

## Gameplay/state/RNG impact
- Rendering metadata/culling/speech-anchor alignment only; no combat stats, RNG, floor save fields, templates, or interaction logic changed intentionally.

## Remaining / follow-up
- Human visual review of captured screenshots vs final preview for all 76 roles/bosses/town/companions/icons remains needed for final acceptance sign-off.
- GR-04+ items from recovery plan remain open (terrain/topology, animation timing, FX/hazards, gameplay regression audit, perf evidence, docs).
