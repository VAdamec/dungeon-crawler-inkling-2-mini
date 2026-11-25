# Reference-derived silver knight — preview asset v1

> **Historical preparation record.** The notes below describe source/preview preparation before integration. The current worktree now renders this collection through `js/art-runtime.js`; these galleries remain isolated review pages. See the [current delivery/documentation record](../../../reviews/2026-11-25-graphics-recovery/gr10/README.md) for runtime status and the still-unverified GR-09 native background-tab check.

Prepared 2026-11-25 from the knight design supplied by the user in “Screenshot 2026-11-25 at 11.00.33.png”. The attachment was used as a visual reference; it is not bundled here. The generated adaptation has a steel helmet and curved silver crest, navy tabard, chainmail, brown boots, sword and wooden shield with a gold cross.

Generated with the built-in image_gen tool, followed by a targeted correction of back-view equipment placement. This is custom generated artwork, not an asset in 0x72's CC0 pack. The supplied screenshot's original source/license is not established by this export; do not describe the reference as CC0 or claim these are extracted original sprites. [Exact prompts](prompts.md).

## Deliverables

- `generated-source.png`: selected transparent generation, preserved unchanged.
- `walk-sheet.png`: 256×256 RGBA sheet, 4×4 cells of 64×64 pixels.
- `front-walk.png`, `back-walk.png`, `left-walk.png`, `right-walk.png`: transparent 256×64 directional strips.
- `frames/`: 16 transparent individual 64×64 PNGs.
- `manifest.json`: crop rectangles, per-frame alpha bounds, hashes, shared scale and anchors.

Rows are front/down, back/up, left, right. Each row contains four distinct stride/passing phases in order 0–3. The preview defaults to paused frame 1; controls permit stepping, changing direction and playing a 600ms loop. These are walking frames, not attacks or damage frames.

## Export and placement

`../prepare-knight.cjs` reads the generated RGBA source using built-in Node libraries only. It finds each generated cell's visible alpha bounds, uses **one shared scale for all 16 figures** (maximum visible height 48 source pixels), performs nearest-neighbor resampling, clears only faint alpha below 64, and places the bottom-center foot anchor at **(32,56)** in every 64×64 frame. It never independently stretches frames, paints limbs or generates missing poses. The source PNG is retained so the export can be reproduced.

The preview draws the cell at 2× screen scale, yielding a maximum 96px visible body height within a 128px transparent cell. Foot anchor is (64,112) screen pixels from the cell origin. Transparency is real alpha; checkerboards and review baselines are HTML/CSS/canvas decorations, not sprite pixels. The more detailed knight deliberately has a finer pixel density than the 16px 0x72 figures; review this at actual scene scale before any runtime integration.

Run from the repository root:

```sh
node docs/previews/2026-11-25-0x72/prepare-knight.cjs
node --test docs/previews/2026-11-25-0x72/verify-knight.cjs
```

All consuming code lives in the standalone preview. No `js/game.js`, `js/sprites.js`, production HTML/CSS or game tests were changed. The generated source does not itself guarantee a finished animation; browser review of the four loops and scene placement is part of acceptance. Runtime integration and any further polish remain separate from preparing this preview.
