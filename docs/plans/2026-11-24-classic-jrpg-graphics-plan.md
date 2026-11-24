# Classic JRPG graphics — design and implementation tasks

Date: 2026-11-24. Status: **focus, collection and implementation approved; runtime integration complete**.

The user selected a classic JRPG overhead look, agreed to the recommended Knights of Xentar / PC-98-inspired direction, and requested only a plan, tasks and instructions for local LLMs. General direction is agreed; detailed artwork must be previewed before runtime integration. The later explicit implementation request authorized completing the runtime tasks in this document.

## Implementation result — 2026-11-24

After approving the expanded collection, the user explicitly requested implementation while preserving gameplay, animations and offline support. All eight tasks are complete. See [implementation evidence](../reviews/2026-11-24-jrpg-implementation.md) and [runtime inventory](../previews/2026-11-24-classic-jrpg/inventory.md): 76 sprite/FX names, 211 shared decoded grids, 138 passing tests, syntax/smoke, seeded old/new gameplay comparison and selected Chrome file:// checks. Actual graphics live only in the existing two runtime scripts; optional art-export recipes are not needed to play. No staging/commits.

The approval gates and draft feedback below record the process that led to this implementation; they are satisfied, not pending permission requests. Full human playtesting remains separate.

## Preview review update — 2026-11-24

The first draft did not meet the requested JRPG direction: most scene differences were palette changes, and several new drawings were not connected to the scene painter. See [review findings](../reviews/2026-11-24-jrpg-preview-review.md). The user now explicitly requires a revised preview with real changes to buildings, terrain and characters. A revision-2 artifact already exists, but its checkpoint claims are not independent verification or user approval. Review it against the requirements below; do not assume that revision numbering means acceptance.

The user subsequently asked the primary agent to prepare the isolated focus design. The resulting [design study 03](../previews/2026-11-24-classic-jrpg/design-v3/index.html) is now approved, and the user explicitly authorized the [expanded isolated JRPG-02B collection](../previews/2026-11-24-classic-jrpg/design-v3/collection/index.html), with no runtime changes. That collection was approved, followed by an explicit runtime-integration request. Earlier documentation-only restrictions describe the previous pass. The subsequent full-art approval and explicit implementation request satisfied the runtime gate.

## Goal and boundaries

Create an original, coherent overhead pixel-art presentation: detailed readable figures, earthy colors, shaded building facades, visible wall height and richer scenery. Keep the existing square grid and real-time dungeon gameplay. Do not introduce diamond tiles, perspective warping, 3D, separate JRPG battle screens or turn-based combat.

Preserve the plain offline architecture: `index.html`, `style.css`, `js/sprites.js` then `js/game.js`; no imports, modules, engine, bundler, remote fonts/assets or runtime server. Prefer original code-native pixel grids and Canvas painters, matching the existing asset system.

Keep world 96×64, 32px logical tiles, viewport 18×12 at 2× zoom, canvas 1152×768 and minimap 288×192. Preserve layout, controls, generated maps, collision, stats, progression, AI, RNG, timings, sound, dialogue, saves and the 100-floor campaign. No balance changes or unrelated bug fixes. Do not update the runtime version merely for planning.

## Chosen approach and alternatives

**Chosen:** incremental art replacement plus small shared rendering helpers. Continue using coordinate-derived tiles, cached original sprite grids and existing logical positions. This fits the repository and lets a small model complete one bounded task per session.

**Cheaper alternative:** palette and texture refresh only. Low integration risk, but does not deliver directional figures and convincing building/wall height.

**Larger alternative:** imported sprite-sheet library or a new rendering engine. More integration and asset-management work; unnecessary for the agreed scope and incompatible with the dependency constraint if it requires new runtime tooling.

## Visual specification

- Perspective: overhead ground plane, front-facing vertical wall/building faces and visible roof/top surfaces; fixed square-grid camera.
- Palette: warm earth and muted greens in town, cool slate/teal in crypts, warmer kitchen/tavern accents, distinct throne-room colors. Use amber lighting, restrained highlights, dark outlines and readable silhouettes. Avoid making all biomes uniformly brown or too dark.
- Figures: compact full-body proportions with readable faces, hands, equipment and feet; detailed PC-98-inspired silhouettes rather than oversized chibi heads. Four directions for the hero and walking humanoids; symmetric creatures may share mirrored side art. Bosses retain their identity, current logical dimensions and single-tile collision; bounds preservation does not mean that palette-only boss replacements satisfy the full redesign.
- Town: clearly recognizable Inn, Store, huts, gate, river and bridge; roofs, shaded facades, doorsteps, trunks/canopies and differentiated grass/roads/water. Decorative height must not imply new walkable or blocked tiles.
- Dungeon: connected-looking wall tops/faces/corners, varied stone floors, stairs unmistakably up/down, richer existing props. Improve painters rather than adding generated objects or consuming RNG.
- Items and effects: consistent outline/light direction; clear potion/chest/key/scroll/equipment shapes; keep projectile, wing, flame and walking animation readable.
- Readability: preserve relative scales, large bosses, companion distinction, HP bars, combat bubbles and warning priority. Hidden spikes must remain visually identical to ordinary terrain until revealed.

## Architecture and data flow

1. Gameplay still commits tile positions through existing movement/combat paths.
2. `actorRenderPosition()` and `renderCamera()` supply existing interpolated positions.
3. Rendering derives a direction/pose and selects a cached original sprite frame; use foot anchors consistently so actors do not slide when frames change.
4. Terrain painters derive their palette/variation from biome and coordinates. Any neighbor-aware wall shape uses existing map data without exposing unexplored contents.
5. Draw scenery with stable layers and local overlap handling; keep the existing player-last visibility invariant, especially in town. Do not sort/mutate `state.monsters`, NPC lists or saved prop arrays in place: sorting gameplay arrays could change targeting/AI behavior. Sort temporary draw descriptors only if necessary.
6. Draw bars/bubbles/warnings from the same visual bounds as actors. Projectiles and in-world boss effects keep their endpoints/anchors aligned. Screen-space boss intros, dragon defeat and ending retain their separate transforms and clocks.
7. Cache completed sprites/tiles/light under disposable `state.art`. Any new direction bookkeeping belongs in transient `state.motion`, never player/floor/template progression.

Keep `spriteDimensions()` and existing default `drawSprite()` calls compatible. If direction is added to sprite/frame lookup, include it in cache keys; preserve the static/front default for equipment icons, cinematic calls and the no-DOM harness. Extend functions minimally rather than changing every call signature at once.

Raised scenery must not cover the player, a revealed trap warning, an interaction tile or unreadable stairs. Prefer restrained facade height and visual cutaways over changing collision, map generation or camera geometry. Review edge clipping while the camera scrolls and while large bosses approach the viewport boundary. Do not reveal secret terrain through fades or fog changes.

## Asset coverage inventory

At JRPG-01, derive an explicit inventory from current source; the reviewed baseline had 62 runtime sprite entries, including aliases and town art. This is not 62 unique characters requiring four directions each.

Track each asset in a small table: identifier, role, current bounds, planned directions, existing animation frames, preview status, runtime status. Include:

- Hero; villagers/merchant/prisoner/princess; town animals; Marmalade.
- Slime, Bat, Goblin, Skeleton, Orc, Wasp, Mage and Healer.
- Mimic, Hydra, Wild Boar, Medusa, Dark Wizard, Skeleton King and dragon; Cook/Bartender reuse Orc/Skeleton artwork. Tiny boss companions and the legacy dragon alias must remain compatible.
- Stairs, chest, potions, keys, scroll/portal, tomes, weapon/armor/ring icons, hazards and obstacles.
- Dungeon and town terrain; torches, existing decorative props and throne-room dais/banners/alcoves.

## Ordered task checklist

Run one ID per local-model session. Check a task only after its acceptance evidence exists. Checkboxes below mean accepted completion, not simply that files exist. JRPG-02 has a rejected first draft, archived revision-2 artifacts and an approved primary-agent focus study 03 and a prepared JRPG-02B collection awaiting separate approval; both preview stages and integration are now accepted/implemented as recorded above. Do not mark JRPG-01 complete without its inventory/baseline evidence.

### JRPG-01 — baseline and asset inventory

- [x] Read current guidance, status and relevant render functions; record current git status and existing checks without discarding changes.
- [x] Write `docs/previews/2026-11-24-classic-jrpg/inventory.md` with actual assets, bounds, directions and frames; identify aliases instead of duplicating them.
- [x] Record before screenshots and a warm rendering baseline in the same browser/viewport. If browser access is unavailable, state it; do not invent screenshots/performance results.
- Scope: documentation and preview evidence only. Done when coverage and baseline are reproducible; runtime unchanged.

### JRPG-02 — revised standalone visual proposal

**Status: both preview stages approved; approved artwork integrated.** Work in two review stages, not a full gallery first.

#### JRPG-02A — prove the direction in two focus scenes

Accepted by the user on 2026-11-24; see the latest [approval record](../previews/2026-11-24-classic-jrpg/progress.md). Historical sub-checklists below describe the criteria; the accepted focus is study 03.

- [x] Inspect existing revision-2 artifacts and label what is actually fixed, still failing or unverified against the first-draft findings. Keep the current source snapshot for a fair before comparison.
- [x] Work only under `docs/previews/2026-11-24-classic-jrpg/`. Use a dependency-free isolated harness; never load/boot or modify the live game to produce the proposal.
- [x] Produce one convincing town scene and one dungeon scene, each 18×12 at actual 2× display scale (1152×768). Within each before/after pair keep map, positions, camera, actor scales, lighting and fog constant so art changes can be assessed fairly. Identify any necessary baseline correction, such as water rendering, separately.
- [x] Buildings: draw visibly new roof/gable silhouettes, eaves, facades, windows/doors and grounded shadows. Inn/Store/huts must read as buildings rather than recolored one-tile icons. Visual art may overhang its existing tile/anchor when needed; do not change collision, interaction tiles, world or viewport dimensions. Demonstrate how overlapping art preserves player visibility.
- [x] Terrain: create continuous grass/road surfaces without an embossed frame on every tile, irregular tree canopies/trunks, distinct riverbanks and water, and connected dungeon wall tops/faces/corners with clear height. Texture or value shifts alone do not satisfy this requirement.
- [x] Characters: show the actual newly drawn hero front/back/side in scenes, with recognizable face/body/equipment/feet and a stable foot anchor; include a representative redesigned NPC and monster. Silhouette/proportion/equipment changes must remain recognizable at play scale, not only on enlarged sheets. Do not substitute the old knight through a fallback.
- [x] Show color and grayscale before/after views at identical scale. Add a silhouette/edge or mask comparison of representative hero, building and tree shapes. Explain at least one concrete geometry/shape change in each of buildings, terrain and characters. A different palette or a higher changed-pixel count is not acceptance evidence.
- [x] Exercise the actual scene dispatch: verify direction names resolve, town props call the proposed painter, grid creation returns valid rows, and water/banks never enter the wall branch. Fail visibly for any missing required redesigned asset rather than silently using old/recolored art.
- [x] Keep a manifest for displayed assets: scene role, actual source identifier/painter, new/reused/deferred, and bounds. Any unchanged secondary asset must retain its original palette and be labeled as reused; it cannot count toward redesign coverage.
- [x] Verify previews open through `file://`, syntax is valid, all scene painters are actually called and no runtime file changed. Use focused harness checks for the known dispatch/grid/water defects. No console errors alone is insufficient because unused broken functions do not run.
- [x] Present the two focus scenes and record the user's explicit decision. **Stop here.** Do not expand the full gallery or integrate runtime code automatically.

#### JRPG-02B — expand approved direction into complete coverage

The user requested this continuation. The [expanded collection](../previews/2026-11-24-classic-jrpg/design-v3/collection/index.html) is prepared with [coverage and remaining atlas work](../previews/2026-11-24-classic-jrpg/design-v3/collection/design.md); the user subsequently approved the expanded art and requested runtime integration.

Only after explicit approval of JRPG-02A and a request to continue this preview task:

- [x] Expand the asset inventory/gallery to all ordinary monsters, unique bosses, Marmalade, humanoid directions/walking samples, town animals, items/equipment/hazards, five biome samples and throne/boss composition.
- [x] Require coherent new shapes/details across the expanded artwork. Do not quietly narrow bosses, NPCs or props to recolors; mark intentional reuse/deferred work explicitly for user review. Preserve boss identity/bounds and gameplay footprints.
- [x] Keep dense sheets separate from in-game-size scenes. Verify stairs, fog edges, traps, companions, large boss bounds, wall overlaps and warnings remain readable.
- [x] Present the complete revised gallery with color/grayscale evidence and the source manifest. Record a second explicit approval of the full coverage.
- **Runtime gate:** JRPG-03 requires completion/approval of JRPG-02B **and a separate explicit request to start runtime integration**. Approval of a focus scene, broad style agreement, model-generated success metrics or this document is not runtime authorization.

### JRPG-03 — dungeon terrain and shared visual helpers

Depends on explicit JRPG-02B full-preview approval and a separate request to start runtime integration.

- [x] Integrate the approved five-biome floor/wall painters, existing props, torch fixtures and light treatment.
- [x] Add only necessary shared visual-anchor/layer/cache helpers. Keep actor dimensions and map topology unchanged.
- [x] Verify connected walls, doorway readability, camera edges, deterministic terrain, culling, cache reuse and hidden-spike pixel equality.
- Expected runtime files: primarily `js/sprites.js`; `js/game.js` only for necessary rendering integration.

### JRPG-04 — hero and ordinary characters

Depends on JRPG-03.

- [x] Integrate approved hero, eight ordinary enemies and humanoid direction/walk frames in small batches.
- [x] Derive visual direction from committed movement; vertical moves must select front/back. Keep existing interpolation and frame clocks; define a stable initial/resting direction.
- [x] Preserve wing/hop/cast poses, ground shadows, foot anchors, monster bars, speech and projectile alignment. Support static/front callers and no-rAF/no-DOM fallbacks.
- [x] Check cached variants do not collide and rendering changes do not alter combat targets, RNG or saved fields.

### JRPG-05 — town and companions

Depends on JRPG-04.

- [x] Integrate approved town painters/building facades, trees, water/bridge, existing NPC/animal art, Marmalade and tiny boss-companion rendering compatibility.
- [x] Preserve exact gate/doorstep interaction and collision tiles, patrols, player-last visibility, town map/minimap visibility and persistent town state.
- [x] Verify recruitment, adjacent following/light, area travel, retreat and scroll portal visuals without changing those mechanics.

### JRPG-06 — bosses, items and effects

Depends on JRPG-05.

- [x] Integrate approved unique bosses, throne decor and all remaining item/equipment/hazard art; update inventory statuses for complete coverage.
- [x] Reuse shared art in boss companions, intro/defeat scenes and the ending; keep original bounds, rewards, phase durations, audio events and skip/restart cleanup.
- [x] Check every boss type, spell projectile, equipment icon, portal and trap state. No new animation system or sound design.

### JRPG-07 — regression and visual verification

Depends on JRPG-06; run relevant checks during earlier tasks as well.

- [x] Run both syntax checks, the full current behavior suite and available external smoke. Preserve or extend meaningful visual-contract tests; do not weaken failing assertions merely to pass new art.
- [x] Browser `file://`: launch; four-direction walking and camera edges; town interactions; dungeon stairs/persistence; combat/archery/spells; companions; traps/fog; all boss art/intros/defeats; ending, skip and restart.
- [x] Exercise help/health/retreat/console/hidden-tab freezes and audio after a user gesture. Check desktop layout and mobile Help/stacking without horizontal overflow.
- [x] Compare hidden vs ordinary trap pixels before reveal, actor bounds, item visibility and warning priority. Check no external requests, console errors, gameplay RNG changes or new persistent render state.
- [x] Compare warm render median/p95 and asset/cache size with JRPG-01 on the same machine. Investigate a repeatable >25% p95 increase rather than claiming a universal FPS target. Idle drawing must retain the existing capped on-demand behavior.
- [x] Record actual results, limitations and unresolved issues. Do not claim a full human campaign or audible-quality review from prepared screenshots/tests.

### JRPG-08 — documentation and handoff

Depends on JRPG-07.

- [x] Refresh README gameplay screenshots/bestiary images from implemented art, retaining personal hardware/model notes and accurate stats.
- [x] Add an actual changelog entry, update tasks/handover/agent guidance where behavior or rendering conventions changed, and archive the approved preview and checks.
- [x] Summarize changed files, remaining risks and validation. No staging or commits unless separately requested. Leave version naming to the user's release choice.

## Validation commands

```sh
node --check js/game.js
node --check js/sprites.js
node --test tests/game.test.cjs
```

The reviewed baseline was 132 behavior tests, but future sessions must discover the current count. Optional existing external smoke, if still present:

```sh
node /var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/opencode/smoke.js
```

If local Node has its previously observed library problem, inspect installed compatible libraries; do not create system symlinks or install dependencies just for the game. Browser tooling may stay outside the repository. Record unavailable checks honestly.

## Local-model execution and checkpoint rules

Use [the local LLM prompt](../prompts/classic-jrpg-local-llm.md). Default mode is read-only planning; select one task explicitly to execute it later. For small context windows, read the common instructions, chosen task and relevant functions, rather than loading the entire sprite file and all old plans. Work sequentially; no parallel edits to shared rendering files.

At the end of each task record: ID/status; files changed; acceptance evidence; checks and actual output summary; preview approval evidence if relevant; remaining blockers; next ID. A new session must verify the files against this checkpoint. A token limit is a checkpoint boundary, not evidence that a task is done.

The earlier 5–10 active-hour / 80k–160k-token JRPG estimate was preliminary, not a measured local-model benchmark. Complete directional art coverage and local-model retries could exceed it. Re-estimate after JRPG-02 using actual throughput and approved artwork scope. Token accounting varies with model and repeated context; do not present it as a billing or completion guarantee.

## Unrelated backlog

Weighted spawning, nearest-target Magic Barrier, deferred themed encounters and campaign balance remain separate tasks from the status review. Do not silently bundle their fixes into this graphics pass.
