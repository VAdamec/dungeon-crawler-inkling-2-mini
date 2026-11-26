# 0x72 graphics implementation checklist

Date: 2026-11-25. Status: **historical preparation checklist; runtime integration completed through GR-01–08/10**. Native GR-09 remains unverified. See [current readiness/manual acceptance](../reviews/2026-11-26-release-readiness/README.md).

Immediate work queue: [graphics recovery GR-01–10](2026-11-25-graphics-recovery-plan.md); [local LLM prompt](../prompts/2026-11-25-graphics-recovery-local-llm.md). The original heap failure was resolved by GR-01. M3 records307 game/27 preview tests passing. The unchecked preparation rows below are historical criteria, not a new implementation queue.

Master execution plan: [final graphics integration, FG-01–08](2026-11-25-final-graphics-implementation-plan.md). It supersedes provisional pack-actor/source choices below with the user-selected reference-derived collection. [Final preview](../previews/2026-11-25-0x72/final-preview.html) · [all 76 runtime source mappings](../previews/2026-11-25-0x72/environment-v1/final-coverage.md).

[Design, boundaries and acceptance criteria](2026-11-25-0x72-graphics-design.md). This is a separate graphics workstream; preserve the user's companion, teleportation and trading plan edits. The checklist is not runtime authorization. Release stays 1.0.1 until separately requested.

## Execution rules

- Read agents.md, tasks.md, handover.md, this design and actual git state before starting. Preserve staging and unrelated edits; do not stage/commit without a request.
- Complete tasks in order; do not integrate a partially reviewed asset collection. Record preview decisions explicitly, without inferring approval of unseen figures.
- Preserve the supplied pack and its provenance separately. Use the selected reference-derived knight/characters/items/environment sources in the final collection. These generated adaptations were explicitly requested and supersede provisional pack-only choices. Do not replace them with approximate rectangles, recolors of old figures or unrelated stand-ins.
- Keep flat shared-global plain scripts, offline file:// operation, existing gameplay and all state boundaries. Optional art tooling is development-only.
- Keep evidence/status current. A task is done only when its deliverables and checks exist. This planning pass completes none of the implementation checkboxes below.

## OX-01 — baseline, coverage and source preparation

- [ ] Reconcile the latest branch with the recorded 1.0.1 baseline; capture runtime state, source sizes, screenshots and same-browser performance without overwriting user changes. Run existing syntax/behavior/smoke checks and record actual results.
- [x] Prepare `docs/previews/2026-11-25-0x72/inventory.md` with all runtime roles (76 at baseline), directions/frames, bounds, anchors, props/biomes/FX and usage paths. Track aliases and any newly implemented companion roles.
- [x] Verify the source files/checksums against the design. Copy only required source files under `assets/source/0x72-dungeontileset-ii-v1.7/`; preserve the pack README and add provenance/CC0/credit records. No runtime edits.
- [x] Build a coverage table mapping each role to an exact source crop, required modification or missing custom asset. Separate pack-native, derivative, retained-for-preview and missing statuses. Record hero 16×28 proportions, direction gaps, missing bosses/animals/town and special biome work.
- [ ] Record explicit visual acceptance of the assembled scenes and an integration request before FG-02+ runtime migration; final preview acceptance is not implied.
- [ ] Audit cinematic/boss-intro/defeat/ending coverage against current branch before full integration.

Deliverables: source/provenance record, inventory/gap report, reproducible baseline. Exit: no crop/scale assumptions hidden; game unchanged. FG-02 bake/validation hardening is in progress in worktree (generated `js/art-runtime.js`, strict exporter validation, round-trip checks).

## OX-02 — standalone focus preview and first review

- [x] Create a dependency-free standalone preview under `docs/previews/2026-11-25-0x72/`, opening directly via file://. Use the actual pack and prepared derivatives; do not modify/load the live game bootstrap.
- [x] Show identical before/after layout, positions, camera, zoom and lighting at 1152×768. Include thick/thin walls, L/T/cross/concave and diagonal corners, a one-tile passage, stairs/doorway, torch, hero, representative enemies, companion and treasure. Keep decorative door/column footprints honest.
- [x] Present native-scale hero proportions and proposed front/back/side poses plus walking frames; show normal fog and fully revealed topology, color and grayscale. Label missing/reused art rather than disguising it.
- [x] Exercise scene dispatch and crop validation; check seams, transparent edges, crisp integer scaling and wall paint bounds. Capture stills/frame strips and record file:// errors/network requests.
- [ ] Present the focus scene and record the user's decision. Stop before full collection work if revisions are requested. **User has asked to proceed with integration; explicit visual sign-off still needs recording.**

Exit: explicit visual direction approval, including hero size and wall style. Runtime FG-03 has started with normalized 8-neighbor topology/material integration behind ART_RUNTIME, but visual acceptance remains pending.

## Character preview progress — 2026-11-25

The user approved the reference knight and explicitly requested the remaining characters. The [character gallery](../previews/2026-11-25-0x72/characters.html) now contains 25 additional sheets / 400 transparent poses across four directions: ordinary monsters, all boss kinds, humanoid NPCs, Marmalade and town animals. Seventeen preview checks and standard file:// browser checks pass. This completes the requested character-preview preparation, not all of OX-03. The user subsequently reviewed the characters. Additional cinematic-specific needs and the remaining non-character collection still require review. Runtime integration remains unauthorized. Exact prompts, selected generated sources, frame/strip/sheet exports, anchors and source hashes are retained with the collection.

### Item/effect preview follow-up

Prepared 31 reference-derived item/effect/hazard/stair families in the [new gallery](../previews/2026-11-25-0x72/items-effects.html), including transparent secret spikes/closed portal, a dart-shaped stinger, separate healing strengths and a directional Barrier push. Exact prompts and deterministic exports are retained. New artwork is review-pending. Town/biome preparation is now completed in the final preview below; cinematic runtime adaptation/audit remains separate. Production remains 1.0.1 and unchanged.

### Final town/biome composition follow-up

Prepared 24 environment families: 18 transparent scenery/prop sprites and six material atlases (town plus crypt/cavern/kitchen/tavern/throne), with revised low-frequency textures after inspection. The [final preview](../previews/2026-11-25-0x72/final-preview.html) assembles nine town/dungeon scenes using current map snapshots, reviewed characters and corrected items. Source coverage resolves every current runtime name. This completes requested preview preparation, not visual approval or runtime implementation. Follow the new FG plan for exact anchoring, semantic states, baking, cinematic coverage and gameplay/offline/performance acceptance.

## OX-03 — complete coherent collection and second review

Requires accepted OX-02.

- [ ] Finish every required ordinary monster, hero/NPC direction, boss and companion. Preserve identities and large boss presentation; draw missing dragon/Hydra/Medusa/Marmalade and any other inventory gaps in the pack's style.
- [ ] Finish town buildings, vegetation, water/bridge, villagers/animals, Inn/Store/gate/portal states and doorsteps without moving existing collision/interaction points.
- [ ] Complete crypt/cavern/kitchen/tavern/throne materials, stairs, gear/icons, loot/tomes, traps/obstacles/props, source-compatible torches and all spell/projectile effects. Preserve undisclosed spikes and hazard states.
- [ ] Complete movement, four-direction humanoid views, wings/flames, boss poses and intro/defeat/ending/companion uses. Show real frame strips; static previews alone do not prove coverage.
- [ ] Validate palettes/transparency/frame bounds, show the complete gallery at play scale, and resolve every required manifest gap. Include large-boss rooms, the Skeleton King throne room and town compositions.
- [ ] Record explicit collection approval. Runtime integration remains a separate requested step.

Exit: accepted complete artwork, per-role bounds/scale manifest and no silent old-art fallbacks. No runtime edits.

## OX-04 — reproducible baked asset pipeline

Requires accepted OX-03 and a request to integrate runtime graphics.

- [ ] Add a development-only exporter/recipe that maps source crops and custom art into the existing compact-grid representation, preserving transparent pixels and animation frames. Record any tool installation requirements for maintainers only.
- [ ] Normalize grid density with ART_DENSITY=2 deliberately; do not feed a native 16px grid into a 32-source-pixel assumption and accidentally halve its logical size. Use integer enlargement/padding or a documented size manifest.
- [ ] Verify crop-to-grid round trips for representative terrain, translucent FX, actor directions and bosses. Ensure exporter output is deterministic and approved output is checked in.
- [ ] Keep runtime drawing usable without source assets, image fetching, a generator, Node packages, modules or a server. Preserve the no-DOM harness painter path and independent icon/world cache keys.

Likely files: js/sprites.js, optional development-only tooling and source manifests. Exit: reproducible art data with unchanged gameplay.

## OX-05 — integrate dungeon terrain

- [ ] Implement named terrain selection from normalized 3×3 neighborhoods, including required diagonals. Keep map values 0/1/2 and floor/obstacle boundaries intact; use bounded topology/material cache keys.
- [ ] Replace terrain art while keeping every wall top/face within the blocked tile. Maintain the 1.0.1 corridor and cache regressions; never restore the 48px overlay.
- [ ] Apply five reviewed biome materials and the saved throne-room presentation using existing state/prop positions. Preserve camera culling/scrolling, shadows, torch clocks and fog/minimap secrecy.
- [ ] Add focused tests for topology, diagonals/concave corners, cache separation and draw bounds. Compare fixed browser fixtures to the accepted preview.

Likely files: js/sprites.js and narrowly scoped rendering helpers in js/game.js. Exit: readable connected dungeon with unchanged maps/RNG/collision.

## OX-06 — integrate actors, items, town and cinematics

- [ ] Replace approved grids/palettes and wire shared explicit bounds/feet/scale through sprite dimensions, actor rendering, culling, health bars, speech, shadows, companions and icons.
- [ ] Reuse existing movement/animation clocks and freeze/cleanup rules. Keep source hit/idle/run frames from adding new combat delays, damage callbacks or timers.
- [ ] Integrate town/gear/loot/hazards/FX; keep map footprints, player-last visibility and interaction coordinates. Ensure new art doesn't leak hidden objects.
- [ ] Integrate every boss, companion, intro/defeat and final princess/dragon ending. Preserve boss arena fit, reward flags and all scene phases/skip/restart behavior.
- [ ] Validate strict required-role/frame/direction coverage; retain aliases only when intentional and documented. No placeholder art in the finished collection.

Exit: all approved art is actually dispatched in game; no unintended legacy paths or gameplay changes.

## OX-07 — regression, offline and performance acceptance

- [ ] Run `node --check js/game.js`, `node --check js/sprites.js`, `node --test tests/game.test.cjs` and the documented external smoke script. Keep full existing behavior coverage and meaningful new graphics checks.
- [ ] Test actual file:// startup, all camera boundaries, narrow-corridor movement/wall rejection, bows/spells, floor/town/portal travel, Help/health/retreat/developer-console/hidden-tab pauses, companions and restart. Preserve audio after user interaction.
- [ ] Test all boss kinds/themed encounters, throne room, intros/defeats, final rescue/ending/skip and mobile HUD/help. Check warnings, bubbles and boss bars against tall sprites.
- [ ] Verify unexplored content and unrevealed spikes remain hidden; compare seeded pre/post player/floor state excluding deliberate visual metadata.
- [ ] Compare cold startup, file sizes, warm draw p50/p95, cache memory and animation rate with OX-01 in the same browser. Document measurements and resolve material regressions; do not invent performance claims.
- [ ] Record failures/limits and the bounded rollback path; retest only affected areas after fixes plus required full checks.

Exit: evidence supports visual and gameplay acceptance, with no remote runtime requests or missing assets.

## OX-08 — documentation and delivery

- [ ] Refresh real runtime README screenshots, bestiary portraits, controls/art notes and current tasks/handover/agent guidance. Keep prepared scenes labeled.
- [ ] Add credits/provenance and document the optional exporter; revise claims that all bundled artwork is original to this project. Do not change the game's code license just because the assets are CC0.
- [ ] Update changelog with actual implementation and verification results. Archive accepted previews, inventory and evidence; mark these tasks according to completed work.
- [ ] Keep 1.0.1 branding until a release/version change is explicitly requested. Do not commit, tag or publish implicitly.

Exit: complete reviewable integration with honest documentation and preserved user staging.

## Scheduling and exclusions

Preview/gap assessment determines the art workload; do not promise hours/token totals before that assessment. Existing teleportation/debug, companion-selection and trading tasks remain independent workstreams. Rebase this plan's role inventory onto whichever gameplay changes have actually landed; do not bundle those features into the art migration or overwrite their drafts.
