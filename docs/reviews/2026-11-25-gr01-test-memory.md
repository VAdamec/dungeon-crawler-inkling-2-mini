# GR-01 test-memory stability evidence

Date: 2026-11-25
Scope: GR-01 only (test-memory stability). No gameplay/runtime behavior changes intended except a small test-harness compatibility fix and one pre-existing wall-edge logic mismatch exposed during full-suite run.

## Baseline / reproduction

- Command (repo default, with required Node dylib path in this environment):
  - `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --test tests/game.test.cjs`
- Baseline result before fix: Node test runner terminated with V8 heap OOM / JavaScript heap exhaustion around default ~4 GiB heap (observed in prior review and reproduced locally). Full suite did not complete.
- Measured draw-call amplification from current no-DOM art fallback: single `startGame(); enterDungeonFromTown(); render()` produced ~322k recorded canvas calls / ~4883 minimap calls with old Proxy recorder; heap ~117MB after one render while retaining call arrays.

## Root cause (measured)

- `tests/game.test.cjs` recorded every canvas call into unbounded arrays (`calls`, `minimapCalls`) via Proxy. With `ART_RUNTIME` loaded and no-DOM direct-pixel fallback in `js/sprites.js`, art decoding/drawing emits very high volumes of small `fillRect` calls, causing recorder retention/OOM before suite completion.
- Secondary issue exposed after recorder fix: full suite had 3 failures unrelated to memory cap fix:
  1. `Dragon defeat uses a screen-space cinematic...` and `boss defeat frames are clamped...` hit recorder overflow because they inspect draw calls after heavy scenes.
  2. `connected wall edges follow the blocked footprint...` expected out-of-bounds neighbors not to count as exposed edges; `dungeonWallEdges()` in `js/sprites.js` counted them as exposed.

## Changes made

- `tests/game.test.cjs`
  - Replaced unbounded Proxy call arrays with bounded recorder (`makeRecorder`) with explicit overflow error; default limits: 250000 main, 50000 minimap.
  - Recorder supports existing test usage patterns (`length=0` clear, indexing, iteration, `some/filter/find/findIndex/findLastIndex/map/forEach/slice`).
  - Filtered per-pixel no-DOM art fallback `fillRect` calls with |w|<=1 and |h|<=1 from recorder to avoid OOM; added `filtered` counter for tests that need proof of drawing.
  - Added canvas context state properties (`canvas`, `globalAlpha`, `imageSmoothingEnabled`, etc.) and `createImageData/getImageData/putImageData` stubs for compatibility.
  - Updated two tests for art-runtime compatibility while preserving intent:
    - `boss animations map every roster and themed boss to a distinct visual kind`: accepts ART_RUNTIME-backed `spriteDimensions('hydra')` metadata and verifies art decode/positive dimensions instead of legacy grid mutation when art is present.
    - `biome variants use coordinate-derived tile palettes and saved props`: accepts filtered draw evidence (`calls.filtered > 0` / drawImage/fillRect) as proof biome props painted.

- `js/sprites.js`
  - `dungeonWallEdges()` now treats in-bounds non-wall neighbors as exposed edges and out-of-bounds as not exposed, matching the existing test contract and footprint semantics for edge decoration. This is a small correctness fix exposed during full-suite verification.

## Verification

- `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --check js/game.js && ... --check js/sprites.js` ✅
- Targeted failing/related tests after fixes: ✅
  - `Dragon defeat uses a screen-space cinematic...`
  - `boss defeat frames are clamped...`
  - `connected wall edges follow the blocked footprint...`
  - `wall tile cache distinguishes changed neighboring openings...`
  - `biome variants use coordinate-derived tile palettes...`
  - `static sprite and terrain raster caches reuse surfaces...`
- Full suite: `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --test tests/game.test.cjs` ✅
  - **155 tests, 155 pass, 0 fail**
  - Duration: ~74.42s
  - `/usr/bin/time -l` max RSS: ~594,313,216 bytes (~566.8 MB)
  - Peak memory footprint: ~21,990,088 bytes (mach metric), instructions retired ~1,059,522,686

## Risks / follow-up

- Recorder filters 1x1 fillRect calls; tests that specifically need pixel-level draw evidence should use targeted capture or inspect `calls.filtered` / art caches. Existing tests were adjusted minimally where impacted.
- `dungeonWallEdges` behavior change affects wall edge rendering at map boundaries; this aligns with test contract and should be visually checked in GR-05.
- Full acceptance items from recovery plan (smoke, file:// browser, seeded state, same-browser perf, asset/provenance gates) remain pending under their respective GR tasks.
