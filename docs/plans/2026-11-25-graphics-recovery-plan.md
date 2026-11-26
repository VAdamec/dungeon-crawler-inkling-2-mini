# Graphics integration recovery and next tasks

Date: 2026-11-25. Status: **GR-01–GR-08 and GR-10 complete; GR-09 partial (native visibility unverified)**. Current [readiness review](../reviews/2026-11-26-release-readiness/README.md) and [manual acceptance](../reviews/2026-11-26-release-readiness/manual-acceptance.md) supersede stale execution defaults; old counts below are historical. See [current evidence and remaining limit](../reviews/2026-11-25-graphics-recovery/gr09/README.md).

This is the completed graphics implementation record; only GR-09 native visibility and separate human visual acceptance remain open. Current readiness/manual work is linked below. It refines [FG-01–08](2026-11-25-final-graphics-implementation-plan.md); preserve the detailed gameplay boundaries and final art direction in that plan. Use the [local LLM prompt](../prompts/2026-11-25-graphics-recovery-local-llm.md) when assigning work. Do not restart the graphics project or regenerate accepted artwork.

## Historical starting point (before GR-01)

The latest review found runtime changes in `index.html`, `js/sprites.js`, `js/game.js`, `tests/game.test.cjs`, and a generated/untracked `js/art-runtime.js`. The page loads the new data before the existing scripts. `bake-runtime.cjs` exists under the preview directory. This is partial integration, not preview-only work, despite stale handover/plan text.

- Syntax checks for all three runtime scripts pass; 27 standalone preview tests pass.
- The ordinary `node --test tests/game.test.cjs` command terminated with JavaScript heap exhaustion around the default 4 GiB heap. This is a failed suite, not 155 passes. Root cause is not established. Potential contributors to investigate include per-pixel call recording in the VM canvas stub, decoded frame caches, repeated payload parsing and retained VM contexts.
- Normal Chrome `file://` launch and pressing Enter reach town without JS errors or remote requests. This only verifies startup, not gameplay acceptance or cinematic coverage.
- `artFrame('knight')` resolves; `artFrame('throne')` returns null. The intended dais source exists, but the runtime name `throne` also names a material and has no explicit dais alias in the current bake.
- `artHas()` is declared twice; the later declaration overrides the earlier alias-aware version.
- Graphics assertions were relaxed: boss minimum dimensions went from 96×64 to 32×32 world pixels; exact dimensions/cache checks were replaced with weaker checks. New source-driven contracts are needed.
- `js/art-runtime.js` is 11,299,031 bytes. Current HTML/CSS/runtime scripts total 11,824,556 bytes versus 507,406 tracked bytes previously, approximately 23.3×. This is a size measurement, not a measured browser slowdown.
- Town terrain still dispatches through legacy painters; some other rendering paths remain mixed. Boss/cinematic/semantic coverage is not complete.
- Runtime changes and generated output are uncommitted; release branding remains 1.0.1. Source availability for 76 roles and old standalone browser evidence do not establish new runtime correctness.

Re-read actual files before editing; another local agent may have progressed since this snapshot. Never overwrite concurrent work or the unrelated companion/teleportation/trading drafts.

## Execution discipline

Do one task per run by default. Follow dependencies; report the task ID, exact changes and checks. Complete the current bounded task before expanding scope. After a passing task, update its checkbox, `tasks.md`, `handover.md` and a task-specific evidence file under `docs/reviews/2026-11-25-graphics-recovery/`. Evidence files may be Markdown plus compact JSON; do not save full pixel arrays, generated payloads or unbounded console output.

Use the actual local Node installation. On the reviewed machine Homebrew Node needs:

```sh
env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --test tests/game.test.cjs
```

This library path is environment-specific, not a project dependency. A normal working `node` elsewhere is sufficient. Do not install a runtime package or alter system libraries to make the game work.

Keep plain scripts, shared globals and `file://`; no modules, bundler, CDN, remote assets or startup fetch. Preserve 96×64 maps, 18×12 view, 2× zoom, all logical positions/collision/generation/RNG, progression and saves. Drawing/animation must not advance combat or change stats. Keep caches transient. No release/version change, staging, commit, tag or publishing without a separate request. Required generated output is now tracked and included in recorded2.0.0 and the clean review package; continue verifying it rather than omitting it.

The final human visual acceptance record remains pending; GR-08 completed the technical cinematic audit. Record actual user decisions, never invent approval. Stabilizing the existing integration and tests does not require approving unseen art. Before broadening the visual implementation, use the session's actual authorized scope and flag unresolved visual decisions explicitly; do not repeatedly ask for already-given permission.

## Queue

| ID | Priority | Work | Depends on | FG mapping |
| --- | --- | --- | --- | --- |
| GR-01 | P0 | Diagnose/fix game test heap exhaustion | none | FG-02/07 |
| GR-02 | P0 | Unify role resolution and fix semantic aliases | GR-01 | FG-02/05 |
| GR-03 | P0 | Restore precise art/anchor/boss contracts | GR-02 | FG-01/04/07 |
| GR-04 | P1 | Prove bake fidelity and measure data/runtime costs | GR-03 | FG-02/07 |
| GR-05 | P1 | Finish dungeon material/topology parity | GR-03 | FG-03 |
| GR-06 | P1 | Finish town rendering and exact interaction alignment | GR-04, GR-05 | FG-05 |
| GR-07 | P1 | Finish actor motion, items, traps and effect semantics | GR-03, GR-04 | FG-04/05 |
| GR-08 | P1 | Complete boss and ending art coverage | GR-05–07 | FG-01/06 |
| GR-09 | P1 | Full runtime/offline/secrecy/state/performance acceptance | GR-01–08 | FG-07 |
| GR-10 | P2 | Refresh docs/screenshots/credits and delivery ledger | GR-09 | FG-08 |

### GR-01 — make the full game test suite finish reliably

- [x] Reproduce and classify heap exhaustion with bounded logs. Record Node version, command, elapsed time, peak memory and the phase/test reached. Do not infer the cause merely from the 11 MB source file.
- [x] Inspect the canvas proxy in `tests/game.test.cjs`, `drawArtDecoded()`, `artDrawMaterialPart()`, `graphicsCache()` and per-VM loading. Profile retained call count/bytes and decoded frame count with compact counters. Inspect whether reading/compiling immutable source once per process helps; keep every game's mutable state/caches isolated.
- [x] Apply the smallest evidence-supported fix. The mechanics harness may use opt-in draw capture, counters or bounded explicit recorders, while dedicated rendering tests retain exact required calls/pixels. Never silently truncate a recorder and then claim its drawing assertions passed. Test overflow behavior if using a bound.
- [x] Keep a real no-DOM/no-ImageData fallback test with representative source pixels, transparent/partial alpha, scaled bounds and non-mutation. Do not bypass the new renderer entirely to hide the regression.
- [x] Remove profiling instrumentation after diagnosis or keep a development-only opt-in mode. Do not raise default heap limits, skip tests, delete assertions or change game behavior to obtain a green suite.

Files: `tests/game.test.cjs`, optional `tests/` helper; `js/sprites.js` only if a real runtime allocation defect is demonstrated. Read `js/art-runtime.js` selectively/programmatically, never print its giant JSON line.

Done: ordinary full game suite terminates without OOM under the default heap, all expected tests execute, and the dedicated rendering fallback remains covered. Report pass/fail counts and measured memory. If behavioral failures become visible after fixing OOM, report and repair them without dropping cases; do not call GR-01 complete with a failing suite.

**2026-11-25 evidence:** `docs/reviews/2026-11-25-gr01-test-memory.md`. Node v26.12.1, required `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`. Full suite: **155/155 pass, 0 fail, ~74.6s, 594MB max RSS** (`/usr/bin/time -l`). Root cause: unbounded canvas call recorder retained massive per-pixel no-DOM ART_RUNTIME fillRect calls. Fix: bounded recorder + filtered 1x1 art-decode fillRect recording with `filtered` counter; explicit overflow error; canvas state/ImageData stubs. Side effect fixes exposed by full run: `dungeonWallEdges()` out-of-bounds boundary semantics corrected; two art-runtime-era tests made intent-preserving (boss dimensions/art decode, biome prop paint evidence). Full acceptance/browser/smoke/perf/secrecy remain in GR-07/GR-09.

### GR-02 — one strict resolver for every required role/state

- [x] Remove duplicate `artHas()` definitions and route existence, frame selection, dimensions and anchors through one normalized resolver.
- [x] Fix aliases in the **bake source**, including `throne` → environment sprite `dais` while preserving material `throne` for terrain; `dragon` → `dragonBoss`; `water` → town water material; `rubble` → rock; stair and flame fixed states. Rebuild output; do not hand-edit `js/art-runtime.js`.
- [x] Validate every coverage row against actual source kind and required state/direction. A material name collision must not satisfy a required sprite role. Validate aliases of every supported kind and reject cycles/bad targets/out-of-range states.
- [x] Make missing required art fail descriptively in development/tests. A legitimate empty frame is valid; absence is not. Do not silently choose legacy art or a front pose for a missing required back/side direction.
- [x] Define fixed-state versus animated aliases explicitly. Do not let `flameOff`, `stairsUp` or `stairsDown` accidentally walk into another state by adding an arbitrary frame index.

Files: `bake-runtime.cjs`, `js/sprites.js`, generated data, focused runtime graphics tests.

Done: all 76 roles and required directions/states resolve; the actual `throne` draw paints the dais; water and alias dimensions/anchors are consistent; unknown role/direction tests fail clearly; full game suite passes.

**2026-11-25 evidence:** `docs/reviews/2026-11-25-graphics-recovery/gr02-resolution-aliases.md`. Unified `artNormalizeRole()` resolver; removed duplicate `artHas()`; bake aliases/validation updated and `js/art-runtime.js` regenerated (10.78MB). Added GR-02 focused test; one intent-preserving anchored-stairs assertion updated. Syntax checks pass. GR-02 test 1/1 pass. Full suite: **156 pass, 0 fail, 0 skipped, ~78.1s, 607,338,496 bytes max RSS** (`/usr/bin/time -l env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --test tests/game.test.cjs`).

### GR-03 — replace weakened tests with the accepted visual contract

- [x] Added manifest/coverage-driven contract in tests: 76 coverage roles covered, character/item bounds/anchors/union bounds from manifests, accepted per-role boss world scale 2. Baseline ledger sizes not auto-applied; explicit per-role contract used.
- [x] Fixed `spriteDimensions()`, `spriteAnchor()`, `monsterVisual()` to use union visible bounds across poses with frame anchors; `monsterSpeechLayout()` anchors to interpolated visual center. Feet/anchor metadata stable across 4 dirs×4 frames for key roles in tests.
- [x] Restored meaningful boss guarantees with accepted per-role source union minima at scale 2 and bar placement/width checks; no 32×32-only minimum.
- [x] Replaced weakened cache assertions with explicit drawImage reuse, stable cache key separation by frame/direction, and icon 32x32 clear+draw contract. No generic any-fillRect-as-asset-proof in strengthened GR-03 paths.
- [x] Covered tiny boss companion/Marmalade 1.5 scale contract, bat/wasp foot-anchor stability, bars/bubbles/shadows placement, viewport-edge culling contract, and equipment icons.

**Evidence:** `docs/reviews/2026-11-25-graphics-recovery/gr03-visual-contract.md`. Full suite 157/157 pass, 0 fail, ~75.7s, 606MB max RSS default heap. Browser/file:// headless screenshots captured for town, Marmalade, flying, bosses 5-100; **final human visual comparison against `final-preview.html` still required before 1.0.1 sign-off**.

### GR-04 — prove the bake and control cost

- [x] Added non-writing `--check` mode and exported pure builders/helpers (`buildPayload`, `buildJS`, `validatePayload`, encode/crop/decode) in `bake-runtime.cjs`; deterministic rebuild produces identical bytes and generated/untracked `js/art-runtime.js` matches bake.
- [x] Added GR-04 test decoding every baked frame/material and comparing RGBA to selected PNG crops (530 frame checks, 2 empty states), including anchor/bounds/crop references and partial-alpha RGBA.
- [x] Recorded size/cost: 11,299,262B art-runtime; 530 frames/528 non-empty/4,124,812 px; unique RLE 530/530, unique palettes 529/530; RLE 2,987,964B, palette JSON 7,235,428B; decode-all ~58.71ms, parse ~20.45ms avg, heap delta ~0.15MB in Node micro-probe.
- [x] No quality-changing compression. Dedup opportunity low; palette serialization dominates. Kept lossless format and plain-script bootstrap/no-DOM decode path. Any future format change requires explicit review.
- [x] Bake/build uses repository preview sources only; no Downloads/machine-generated runtime paths.

**Evidence:** `docs/reviews/2026-11-25-graphics-recovery/gr04-bake-fidelity.md`. Full suite 158/158 pass, 0 fail, ~74.5s, 708,329,472 bytes max RSS default heap. Browser same-baseline startup/perf still required in GR-09.

### GR-05 — finish dungeon walls and biome parity

- [x] Retain 256 raw/47 normalized neighborhoods, boundaries and map-value-2 distinction.
- [x] Fix material source-identity caching; preserve all 24 distinct surfaces across warm orders.
- [x] Match accepted face/coping/edge and 4×4 concave corners; opaque tile coverage and zero out-of-tile paint.
- [x] Compare all 1,280 runtime wall outputs against the independent approved preview in a real browser: exact alpha, maximum RGB rounding difference 1/255. Continuous throne carpet treatment verified without changing arena/world data.

### GR-06 — complete town materials/buildings/bridge

- [x] Dispatch town grass/dirt/cobble/water through prepared materials, including water beneath the bridge.
- [x] Fit Inn/Store/huts using source feet and exact existing facade-door interaction points; hero stays drawn last.
- [x] Fit bridge to both crossing tiles/banks and align deck to crossing row; align gate/portal and retain full-art viewport culling.
- [x] Cosmetic paths follow existing walkable cells without RNG/map changes. Town visibility/patrols/peaceful simulation behavior preserved.
- [x] Actual file:// bridge crossing and blocked river movement, Inn/Store/gate interaction and exact portal return; nine seeded state comparisons and screenshot/numeric alignment evidence captured.

**Current evidence for GR-05/06:** [completion report](../reviews/2026-11-25-graphics-recovery/gr0506/README.md), compact browser/state JSON and runtime screenshots. Full suite 164/164, preview suite 27/27. Torch mounts and ground-item placement also fixed from user screenshots; broader semantics/motion remain GR-07. Final human visual acceptance remains separately recorded under FG-01/GR-10.

### GR-07 — finish semantic frames and motion

- [x] Audit every item/hazard/effect dispatch. Blank spikes/closed portal must be genuinely empty. Fire inactive cannot animate into active. Rock cracks show only during warning; settled rock uses the settled state. Hidden traps stay undisclosed under real fog/visited logic.
- [x] Keep trap clocks/damage/reveal/spent behavior; derive animation from existing phases, not new triggers/timers. Portal animation never changes inventory or opens a portal.
- [x] Preserve ordinary chest versus Mimic identity, clear up/down stairs including depth-1 town ascent, stored potions and gear icons.
- [x] Apply prepared walking/wing/deformation frames without duplicate procedural gait or mirrored front/back substitution. Keep interpolation logical and freeze/reset clocks during all current pauses/travel/restart/hidden states.
- [x] Verify rightward projectile source orientation versus real flight vectors, small stinger, distinct Heal/Greater Heal, Barrier push/impact and unchanged costs/cooldowns/nearest-target rules.

Done: focused state-transition tests and actual casts/trap/portal/movement scenarios pass; pixel comparisons prove unrevealed content is not leaked. No stat/damage/clock/RNG changes.

**2026-11-25 completion:** [GR-07 dispatch audit, browser pixel/state evidence and regressions](../reviews/2026-11-25-graphics-recovery/gr07/README.md). 171 game tests and 27 preview tests pass. Seven new tests; 416 authored actor direction/pose draws; all 31 item/effect families audited. Spike gameplay has no timed retraction phase, so triggered spikes use the spent/retracted pose rather than adding a clock. No source PNG/bake or gameplay changes.

### GR-08 — audit and finish cinematic coverage

- [x] Write a call-site matrix for every boss intro/defeat, guards, companion draw and ending shot: role/source, frame, direction, scale/anchor, procedural transform and coverage verdict.
- [x] Inspect all nine boss kinds, not only dragon. Remove obsolete character-art fallback; retain current procedural particles/rotation/fade where adequate. Prepare/review new poses only where a required shot cannot be represented faithfully.
- [x] Exercise the depth-100 princess/dragon twist, healing/HP refill, escape and crying-hero sunset. Preserve trigger/reward flags, phase timing, audio, skip and restart.
- [x] Verify identity-bound callbacks, hidden-tab pause, restart mid-scene and stale-frame rejection.

Done: completed matrix, representative stills/short recordings and lifecycle tests; any missing art is explicit. Do not call locomotion-sheet coverage proof of cinematic acceptance.

**2026-11-25 completion:** [GR-08 call-site matrix, decisions and real browser evidence](../reviews/2026-11-25-graphics-recovery/gr08/README.md). All nine intro/defeat/companion kinds and six ending phases captured; eight new regressions, 33 seeded comparisons, unchanged source/baked art. Guard collapse now removes live guards without additional rewards; this intentional correction is explicitly tested. Existing poses plus documented procedural motifs express the cinematic shots; no bespoke death/crying art was invented. Final user visual acceptance remains separate.

### GR-09 — full acceptance on the actual game

- [x] Run all required syntax/behavior/preview/focused graphics tests, external smoke and the automated normal `file://` scenarios from FG-07; native visibility remains the exception below. Update the external smoke loader if its old two-script assumption needs the new data file; keep that smoke script outside the repo.
- [x] Automated actual file:// browser scenarios cover launch, movement/walls/biomes, interactions/travel/loot/combat/spells/health/Help/audio/companions/bosses/ending and mobile viewport layout, as recorded in GR-09. Controlled visibility-handler evidence is separate.
- [ ] **Native GR-09 remains unverified:** observe genuine background-tab/minimize freeze/resume without catch-up in an ordinary browser; use the current manual checklist. This is not completed by the automated scenarios above.
- [x] Compare seeded gameplay snapshots to committed pre-art baseline or captured baseline using controlled harnesses, excluding only documented visual metadata. Never rewrite expected gameplay snapshots to hide drift.
- [x] Compare hidden-spike/unexplored content pixels and real fog/minimap secrecy. Final-preview fog is illustrative and cannot substitute for this.
- [x] Compare cold parse/load, file sizes, warm draw p50/p95, cache memory and animation rate using same browser/machine/scenes. Separate measured facts from suspected bottlenecks.

**2026-11-25 checkpoint:** [GR-09 report](../reviews/2026-11-25-graphics-recovery/gr09/README.md). Automated scenarios, 33 committed-baseline state comparisons, eight fair visual pairs, external smoke and paired performance/cache checks completed. Two fixed regressions: living-monster anchors and continuous cinematic-scale cache growth. **Native visibility still open:** headed/headless automation, background/minimize attempts never exposed a native hidden state; explicit handler fixture passes, not native proof. Final human visual review remains separate.

Done: compact reproducible evidence, zero unexpected browser errors/network requests, no gameplay drift, all required checks pass. Failed/skipped/OOM is not a pass; unresolved significant regressions block acceptance.

### GR-10 — reconcile documentation and delivery

- [x] Update handover/tasks/master plan to actual completed stages and remaining limitations. Keep historical preview evidence labeled historical.
- [x] Replace README/bestiary imagery with actual integrated screenshots; update art credits/provenance, load-order/exporter guidance and changelog truthfully.
- [x] Document required generated output and reproducible source. Do not hand-edit generated data or leave referenced files absent from the eventual delivery. User must explicitly request any staging/commit/release/tag/publish action; keep current2.0.0 branding unchanged unless a new version action is explicitly requested.

Done: docs agree with code and evidence; current source/artifact list is clear; no unrelated drafts changed.

**2026-11-25 completion:** User explicitly requested GR-10 while retaining the GR-09 exception. [Documentation, screenshots, source hashes and delivery record](../reviews/2026-11-25-graphics-recovery/gr10/README.md). Source pixels/generated payload unchanged; a later explicit user request authorizes simplified player Help and release 2.0.0, including its required generated artifact. Unrelated gameplay drafts remain excluded. Native background-tab observation and final human visual decisions are not claimed as verified.

## Per-task handoff template

```markdown
Task: GR-XX — title
Status: complete / partial / failed
Changed files:
Checks actually run and results:
Evidence path:
Gameplay/state/RNG impact:
Measured memory/size/performance where relevant:
Remaining issues:
Next eligible task:
```

Keep summaries short. If a command fails, quote the relevant error and investigate the bounded cause; do not repeat costly runs unchanged or claim a future task is completed.
