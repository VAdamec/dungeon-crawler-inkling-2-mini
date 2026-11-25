# Local LLM progress and draft review — 2026-11-25

Scope: OX-01/OX-02 source preparation and graphics previews, plus the corrected companion/teleportation/trading drafts. Review only: no preview, production, task-status or other plan files were changed by this review.

Verdict: **useful progress, but OX-01 is partial and OX-02 needs revisions before visual acceptance. Runtime integration should not start from this draft.** This review is not an artwork approval.

## Verified progress

| Stage | Actual evidence | Assessment |
| --- | --- | --- |
| OX-01 | Source PNGs/crop list copied; checksums match inspected originals; 76-role inventory and baseline JSON; a baseline screenshot | Partial: manifest errors and missing performance baseline remain |
| OX-02 | Standalone v1 and v2 previews, actual pack crops, custom cat, size comparison, grayscale/fog views, six topology fixtures and source-frame strips | Draft exists; v2 opens offline, but comparison/topology/directional criteria are incomplete |
| OX-03 | Coverage notes identify custom-required roles; small custom cat in focus scene | Full collection not prepared; no complete boss/town/directional/animation coverage |
| OX-04–08 | No implementation changes in production files | Not started, appropriately awaiting visual review/integration request |

`git diff HEAD -- index.html style.css js tests` is empty. The game remains 1.0.1. Existing tasks still leave OX-01/OX-02 unchecked; that is appropriate while exit criteria remain unmet. Handover says no assets imported, which describes the earlier planning pass and now needs a new progress entry rather than treating it as current source-preparation status.

## Findings in priority order

### 1. Wall topology still recreates ambiguous blocked/floor boundaries — high priority

`design-v2.js:93–114` selects caps/faces from west/east and a north/south cap heuristic. It never inspects diagonal neighbors, so it cannot implement the planned 3×3 corner/junction rules. At `:144–152`, interior cap cells deliberately receive floor art beneath the mostly transparent cap despite remaining `#` blocked cells. The first tile of the two-tile “isolated pillar” is a clear example: most of the blocked tile looks like traversable floor. Thick walls and the L/T/inner fixtures show stepped/repeated facade ends rather than a continuous solid mass.

The preview uses named atlas cap/face crops, not the supplied low-wall autotile arrangement. That can be a valid starting material, but these selection rules do not yet establish correct corners or visual collision boundaries. The claimed isolated fixture is two cells, not a one-cell case, and diagonal, map-border and obstacle cases are absent.

Required correction: use a normalized neighborhood selector with deliberate corner/diagonal handling; render a recognizable solid top/mass on every blocked cell; keep face paint within collision bounds. Add genuine one-cell, thin/thick, L/T/cross, concave, diagonal, border and obstacle fixtures, with an optional collision-grid overlay. Do not copy the current cap/floor heuristic into runtime OX-05.

### 2. Before/after comparison changes the scene and lighting — medium priority

`design-v2.js:529–542` has separate BEFORE_WALL_PROPS/BEFORE_PROPS; these do not match HERO_WALL_PROPS/HERO_PROPS. Torches move from x=4/11 to x=3/12, and chest/potion/stairs/spikes positions also change. `drawAtmosphere()` at `:213` applies different ambient/light parameters to before and after. `drawBeforeScene()` at `:560` applies arbitrary prop scale multipliers and renders every actor through one ordinary-sprite scaling path, including the Mimic boss.

This prevents the pair from isolating the artwork change, despite the “current sizes” and controlled comparison intent. Required correction: one shared semantic fixture and identical camera, positions, lighting/fog parameters and approved role-specific scale rules. Keep the atmospheric beauty shot separate and label it as such. Record proposed size changes in the proportion panel instead of quietly changing the baseline.

### 3. Default preview entry point is broken under normal file:// Chrome — medium priority

Opening `docs/previews/2026-11-25-0x72/index.html` without relaxed browser security produces local-fetch CORS errors from `preview.js:4–5`. The page stays at “Rendering…” with zero canvases. By contrast, `design-v2.html` works with embedded data: 49 canvases, 76 table rows, no browser errors and no HTTP(S) requests in this check.

Required correction: make index.html the working v2 entry point, or explicitly link to it and label the old preview as superseded. Do not require a server or a browser security override. Adding explanatory text to the broken page alone does not make it an offline preview.

### 4. Inventory generation has unit/frame errors and inconsistent sources — medium priority

All 76 rows of inventory.md show `undefined` under Frames. `build-data.mjs:144` prints `a.frames`, which the generator never defines. The “Logical src px” column prints `a.source`, although `a.logical` is available; the hero is 16×22 logical, 32×44 baked-source pixels, and 64×88 current drawn screen pixels. The footnote incorrectly calls 32×44 the current logical size. The goblin note also says front-only although its directions column correctly lists four directions.

`build-design-data.mjs` separately patches torch/slime status while inventory.md/runtime-inventory.json keep old decisions. Its torch note mentions top_1, while the displayed preview uses the red basin crop. These are useful experimental choices, but there is no single consistent mapping record. Status values such as “custom” mean required work, not that all those assets have been drawn.

Both builders hard-code the author's workspace; build-data.mjs also reads Downloads despite copied source files existing in the repository. They are not portable/reproducible from a fresh checkout.

Required correction: show source/logical/world/screen dimensions separately, define per-direction frame counts and validate them, resolve mapping decisions in one manifest, use repository-relative copied sources, and report missing roles/frames explicitly.

### 5. Preview checks do not prove readiness; focus direction work remains incomplete — medium priority

`design-v2.js:913–920` reports load/count/scale information, not assertions about topology, crop validity or complete frames. `crop()`/`drawCropAt()` at `:32–49` silently return null/false for a missing crop, so an omitted sprite can coexist with a success-looking checks panel. Fixed actor crop names inspected in this review exist, but the silent-failure mechanism remains unsafe.

The frame strips show real pack idle/run frames and are useful. They do not show the proposed custom hero back/side poses, moving companion or complete custom animation coverage required by OX-02/OX-03. Town is honestly labeled as a stone-gate concept, not the existing village; its huts/Inn/Store/river/bridge/animals remain custom work. It is not a complete town replacement.

Required correction: fail visibly for invalid/missing required crops; assert topology/bounds/manifest contracts; add the proposed directional hero samples and retain missing-role labels until drawn. Finish the first review gate before commissioning the whole collection.

### 6. Provenance details and progress evidence need cleanup — lower priority

The copied main/low-wall/floor/crop-list SHA-256 values match the originals. However, preview assets/provenance.md lists incorrect sizes: low wall is 2,119 bytes (not 7,288), floor is 3,023 (not 3,064), crop list is 12,092 (not 12,052). It says the high-wall atlas was not copied, but both source and preview contain it. The main copy is correct at 39,623 bytes.

There is no recorded same-browser cold/warm rendering/cache baseline completing OX-01; a role-inventory JSON and a screenshot do not provide those measurements. The saved JPEG filenames also are not reliable navigation to the newest v2 design (for example focus-03-dungeon.jpeg currently depicts frame strips).

Required correction: generate provenance sizes/checksums from actual files, describe the high atlas as reference-only if retained, and add a compact progress/evidence page naming the canonical preview, current limitations and reproducible checks. Keep OX-01 partial until baseline evidence exists.

## Other corrected drafts

- Teleportation draft addresses the earlier main issues: run-wide portal fields, explicit free scroll-style debug portal, single-portal refusal, positive-integer validation and tests that extend existing coverage. No implementation exists yet. Before coding, specify cinematic/death/health-pause command guards and integer safety bounds; `Number.isInteger()` alone does not guarantee a safe integer total.
- Companion draft now keeps selection/unlocks out of FLOOR_FIELDS and defines Marmalade/Pip, boss unlocks and town switching. Clarify “boss adoption ... for the rest of the run” at companion-selection-plan.md:109 versus subsequent town switching, actor hide/unhide behavior after switches, and what R does to the chosen starter since branding is launch-only. Its description of existing boss targeting as nearest also differs from current companionTick(), which selects targets[0]; explicitly decide whether that behavior changes in this feature.
- Trading draft is a substantive design with staging, Undo/Reset/Cancel, selected purchases/sales and HP rules. It remains unapproved/unimplemented. Add representative ordered multi-operation commits and a final god-mode invariant check, and ensure transaction log generation accounts for purchases/sales followed by undo or equipment replacement rather than only final slot equality. These are design/verification details, not observed runtime regressions.

## Checks performed by this review

- Read actual source, role/crop manifests, both preview implementations and corrected gameplay drafts.
- Compared copied source hashes against the supplied download; verified before-sprites.js is byte-identical to current js/sprites.js.
- Opened both preview HTML pages in normal headless Chrome via file://, without --allow-file-access-from-files. Captured the v2 hero room, baseline, proportions, town and topology fixtures; inspected the room/baseline/fixture images.
- Syntax checks pass for preview.js and design-v2.js.
- All **155 existing behavior tests pass**. These protect the unchanged game; they do not validate the draft wall algorithm or missing new artwork.
- No remote requests occurred in either preview; the v1 failure is a blocked local JSON fetch. No game/runtime/test files were changed by this review.

## Recommended next local-LLM iteration

1. Repair the canonical preview entry and inventory/provenance generation using copied repository sources.
2. Replace the wall-selection heuristic and add the collision-overlay/topology fixtures.
3. Rebuild a controlled shared before/after fixture; separate the atmospheric concept shot.
4. Add actual proposed hero directional samples, honest role/animation status and executable preparation checks.
5. Record the missing OX-01 measurements and a concise progress page, then present revised OX-02 for visual review. Do not start runtime integration or claim OX-03 complete.
