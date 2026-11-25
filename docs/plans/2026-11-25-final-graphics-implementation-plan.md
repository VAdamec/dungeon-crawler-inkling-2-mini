# Final graphics integration plan

Date: 2026-11-25. **Integrated graphics worktree; documentation refreshed under GR-10. GR-09 native background-tab observation remains unverified.**

Current execution record: [GR-10 documentation/delivery ledger](../reviews/2026-11-25-graphics-recovery/gr10/README.md), [GR-09 measured checks and remaining limit](../reviews/2026-11-25-graphics-recovery/gr09/README.md), [recovery task queue](2026-11-25-graphics-recovery-plan.md). GR-01–GR-08 are complete. Latest runtime verification is 181 passing game tests and 27 passing preview tests; the original test-memory failure was resolved in GR-01. The explicit visibility-handler fixture passes, but native background/minimize behavior has not been observed in automated Chrome. Do not close that item or infer final user visual acceptance from documentation completion.

This plan retains the original FG contract and earlier checklist below as the design record; GR-01–10 and their evidence files are the current implementation status. The user approved the reference-led source style and runtime integration, then authorized GR-10 documentation while explicitly keeping the GR-09 exception open. The later user request explicitly authorizes concise player Help and release 2.0.0 after checks. Source art/game mechanics remain unchanged; unrelated gameplay drafts remain excluded. No blanket completion of FG-01/FG-07 is implied.

## Review package and source of truth

- [Final interactive preview](../previews/2026-11-25-0x72/final-preview.html): town market, bridge/gate, whole village, crypt, cavern, kitchen, tavern, Skeleton King throne room and final dragon hall. Play-size views are 1152×768 / 18×12 tiles; village overview is half scale. Includes collision guide, illustrative dungeon fog, portal state, directional poses and PNG export.
- [All characters](../previews/2026-11-25-0x72/characters.html): knight 16 poses plus 25 character sheets / 400 poses. User-selected charcoal Marmalade has a leather harness/satchel. No orange-cat substitution for the companion.
- [Items/effects](../previews/2026-11-25-0x72/items-effects.html): 31 families / 72 transparent frames, including corrected stinger, genuinely hidden spikes and distinct healing/push effects.
- [Environment sources and prompts](../previews/2026-11-25-0x72/environment-v1/README.md): 24 families, including six four-part material atlases (town plus five dungeon biomes).
- [Current-role source mapping](../previews/2026-11-25-0x72/environment-v1/final-coverage.md) and [machine-readable coverage](../previews/2026-11-25-0x72/environment-v1/final-coverage.json): all 76 names in the current runtime inventory. These prove source availability, not gameplay/cinematic acceptance.
- [Recorded fixtures](../previews/2026-11-25-0x72/environment-v1/fixtures.json) come from an isolated read-only VM of the current game. Town buildings/river/doorsteps and dungeon maps/rooms are preserved. Dungeon actor positions and extra theme props are explicitly staged for art review; do not copy these into generation or spawn balance.

The original 0x72 pack remains separately archived and credited. Its low-wall direction/topology informed the preview. Selected figures, equipment and new environment images are generated adaptations of the user's references, not CC0 pack crops. Do not overwrite the new art with low-resolution pack characters merely to match the old plan's provisional table. Do not describe the whole new collection as 0x72-authored or as entirely hand-drawn project art.

## Fixed boundaries

The current load order is `index.html` → `js/art-runtime.js` → `js/sprites.js` → `js/game.js`. Keep these as plain scripts, flat shared globals and no modules, dependencies, server, fetch pipeline, CDN or runtime build. The checked-in game must work via `file://` and in the Node no-DOM harness. Preview PNG/data-URL loading is a review mechanism, not the proposed production architecture.

Keep map dimensions 96×64, viewport 18×12, MAP_ZOOM=2, all generation/RNG calls, collision values, interaction coordinates, keys/loot persistence, monster recreation, stats/combat/targeting, town travel/portals, companions, pauses/help/console, audio and campaign behavior unchanged. All map positions stay in world tiles. Do not move buildings, add doors, widen arenas, introduce new theme props/spawns or add town monsters to fit a screenshot. New road textures are cosmetic and must stay on existing walkable tiles; the preview's derived paths do not change the map.

State caches remain disposable `state.art`; motion remains transient `state.motion`; do not put either into floor saves/templates. Save layouts/progression exactly as before. Preserve all user edits/staging, especially companion, teleportation and trading drafts. Do not commit, tag, publish or change 1.0.1 branding without a separate request.

## FG-01 — accept and freeze the art contract

- [x] Prepare town buildings/scenery and five materially distinct biomes with final map compositions, hero, NPCs/animals, monsters and bosses.
- [x] Prepare exact source prompts, transparent/opaque exports, source hashes, fixtures and a complete current-role source ledger.
- [ ] Record visual acceptance of the assembled scenes and any requested revisions. Mark the selected source hashes as accepted; do not infer approval of unseen variants.
- [ ] Reconcile the ledger against the actual branch when integration starts. Add mappings for any gameplay work that landed after this snapshot; never overwrite it.
- [ ] Record each role's source cell, visible union bounds, source anchor, runtime source-pixel scale, direction/frame semantics and maximum render bounds. Inspect door artwork against the exact current doorstep coordinates, bridge ends against both crossing tiles, and boss bars against the largest frames.
- [ ] Audit existing cinematic calls. Locomotion sheets are not bespoke death/healing poses. Reuse reviewed source poses plus current rotations/fades/squash/FX where adequate; explicitly prepare/review extra artwork if a shot requires more. Never silently retain old characters in intros, companions or the ending.

Exit: accepted source set and a separate request to integrate. A final preview is not a claim that runtime migration or cinematic coverage is finished.

## FG-02 — bake self-contained source data

Likely files: new optional development-only exporter/manifest and generated sections in `js/sprites.js`; no production edits to generation/combat.

- [ ] Build a deterministic dependency-free Node exporter from the checked-in PNGs/manifests. Reuse the existing PNG codec and strict coverage checks. Fail on an unknown/missing role, state, direction, bad crop or anchor; no old-art fallback.
- [ ] Preserve source colors and alpha. First measure lossless compact-grid/RLE size. If palette reduction becomes necessary, document limits and pixel-difference evidence and review the changed output rather than silently degrading art. Keep fully transparent pixels empty; no matte color or background rectangle.
- [ ] Keep `ART_DENSITY=2` deliberate. One new authored source pixel should match the final preview: default `scale=2` in world drawing plus MAP_ZOOM=2 gives two screen pixels per source pixel. The new 32px material cells therefore cover one 32-world-pixel / 64-screen-pixel tile. Do not apply the pack's former 4× native-16px scale again.
- [ ] Keep source cell dimensions and explicit anchors in generated metadata (`cell`, `anchorPx`, `contentBounds`, `directions`, `frames`, `worldScale`, `hover`). At world scale S, destination top-left is `(worldAnchor - sourceAnchor * S / ART_DENSITY)`. Use content bounds for visible bars/bubbles and the full maximum art envelope for culling. Do not count transparent padding as a visible body or align padded cell bottoms to feet.
- [ ] Reconcile the old `monster.isBoss ? 3 : 2` scale: the new boss sheets are already authored larger. Use explicit per-role scale matching the accepted scene rather than multiplying every boss by 1.5 again. Keep single-tile targeting/collision.
- [ ] Round-trip decode exported grids and compare RGBA/anchor coordinates to the selected PNGs. Check every prepared source/direction/state, not only the first frame. Confirm cached and no-DOM painting match.
- [ ] Keep the runtime usable without PNGs, preview directories, Node, package installation or the exporter. The output belongs in existing plain-script data/painters; adding an extra production script requires an explicit documented reason and preserved load order.

Exit: deterministic checked-in data with all role mappings, no startup image races and unchanged game behavior.

## FG-03 — integrate terrain and connected wall geometry

Likely files: terrain painters/cache keys in `js/sprites.js`, `dungeonWallEdges()`/`drawDungeonTile()` and narrowly scoped render helpers in `js/game.js`.

- [ ] Adopt normalized eight-neighbor / 47-pattern topology from the tested preview. Map value 1 alone joins masonry; value 2 is a blocking prop standing on floor. Outside-map behavior is explicit and consistent.
- [ ] Keep each wall fully opaque and clipped to its blocked tile. No floor below a wall, no northward overhang, no disjoint coping fragments. Faces use authored face rows within the lower part of that same tile. Keep corner/side strips connected in one-tile passages.
- [ ] Include biome, normalized topology, deterministic variant and art revision in cache keys. Rendering may not use gameplay RNG or mutate arrays/maps.
- [ ] Use separate material structures: flagstone/stacked masonry crypt; natural rock cavern; ceramic-checker/brick kitchen; oak-board/timber tavern; polished/carved stone, carpet and gold throne room. Do not substitute palette filters.
- [ ] Route throne-room special materials through current `artBiomeAt()`/`throneCarpetAt()` and saved room/prop bounds. Preserve the depth-50 dais, torch rows, banners and guard alcoves. The dragon arena uses the current final-floor geometry.
- [ ] Preserve render-camera entering strips, viewport culling, fog and minimap secrecy. Preview fog is illustrative; verify actual game FOV and discovery rules separately.

Exit: all wall-mask/bounds regressions pass and accepted surfaces appear in the unchanged generated world.

## FG-04 — integrate actors, anchors and existing animation

- [ ] Use reviewed four-direction source sheets for knight, all ordinary monsters, bosses, NPCs, Marmalade and town animals. `dragon` aliases `dragonBoss`; no generic monster replacement or mirrored front-to-back view.
- [ ] Apply the same anchor/scale contract to `spriteDimensions()`, `drawSprite()`, `drawActorSprite()`, `monsterVisual()`, `worldSpriteCenterY()`, art culling, shadows, health bars, speech bubbles, minimap motion and companions. A decorative PNG's transparent margin must not displace its feet.
- [ ] Map four walking/wing/deformation poses to current `state.motion`, `actorAnimationPose()` and `motionFrame()`. Logical movement commits immediately; no collision, damage, RNG, reward or cooldown changes in animation callbacks.
- [ ] Idle uses a stable approved pose; moving uses the corresponding loop. Preserve Mimic's believable closed state and reveal semantics. Do not cycle an idle chest through open-mouth poses at random. Avoid applying redundant procedural flips/deformations over already-authored directional frames.
- [ ] Keep offscreen movement immediate; cap visible drawing at 30fps and freeze/reset timestamps during help, health/retreat dialogs, console, hidden tabs, boss scenes, travel/restart/death/ending.
- [ ] Keep Marmalade's explicit 1.5 scale and tiny boss companions relative to each role's new visual bounds. Check following, light, speech placement and travel/replacement without altering companion damage or recruitment.

Exit: every actor renders with stable feet and complete facing/motion coverage; all gameplay snapshots remain equal.

## FG-05 — integrate town, items, traps and effects

- [ ] Fit Inn/Store/huts to existing `townBuildingBounds()` and exact doorsteps; verify the selected facade door against the interaction point, not merely the center of the PNG. If a door is visibly offset, adjust/review source or anchoring; do not move its map coordinate.
- [ ] Use grass/dirt/cobble/water materials, stone bridge, trees and cave gate without changing the river, crossing, scenery footprints, spawn, shop/Inn interaction, patrol paths or portal return points. Town remains fully revealed and has no combat monsters. Draw the player last.
- [ ] Keep UI text/signs separate from PNG backgrounds. Replace props by semantic role, including `throne`→dais and `rubble`→rock, without inventing interactions.
- [ ] Use source-frame state adapters, not arbitrary modulo for hazards: hidden spikes = blank frame 0; visible spike phases = 1–4; fire vent inactive = 0 and active/cooling = authored phases; cracks only during current warning; settled rock uses final rubble frame. Warning badges remain separate and above actors. No early trap hint.
- [ ] Portal closed = blank frame 0, open = 1–4. Frame changes never open/close/consume a real portal. Preserve scroll state and gate interactions.
- [ ] `stairsUp` = stairs frame 0; `stairsDown` = frame 1. Both remain discoverable under existing rules, including depth-1 ascent to town.
- [ ] Ordinary treasure starts as the reviewed closed chest. Open/full/empty source states do not add new treasure mechanics. Potion/elixir/key/tomes retain existing effects. Equipment icon caches remain independent and readable at 32×32.
- [ ] Map projectile orientation explicitly: arrow/stinger/fireball/frostbolt native rightward, rotated from actual source-to-target vector; small stinger never becomes a wasp sprite. Preserve projectile clocks/damage. Bone/tankard preserve their authored shapes under current spin/rotation.
- [ ] Heal and Greater Heal remain distinct; Magic Barrier is a push/impact pulse, never a defensive buff. Tie source phase to current effect lifetime. Preserve nearest-target selection, costs, cooldowns and push/collision damage.

Exit: semantic state tests, hidden-spike pixel identity and actual travel/portal/gear/spell scenarios pass.

## FG-06 — boss and campaign cinematic coverage

- [ ] Walk through every intro and defeat motif using new art: Mimic, Hydra, boar, Medusa, Dark Wizard, Skeleton King, Cook, Bartender and dragon. Include guards, tiny companions and bars/speech. Preserve identity-bound callbacks and pause/skip/cleanup behavior.
- [ ] Run the complete final sequence using new princess, knight, dragon, healing/heart effects and sunset composition: reveal, princess run/heal, refilled dragon HP, couple escape, crying hero, final stats. Preserve the depth-100/dragon-defeated/princess trigger and once-only rewards.
- [ ] Keep bespoke ending effects/timing/audio as current behavior; replace legacy sprite references throughout. Record any procedural effect intentionally retained rather than claiming it is a new generated asset.
- [ ] Verify Esc skips, restart during every stage, hidden-tab freeze and stale-callback rejection. Missing pose coverage blocks completion, not permission to fall back silently.

## FG-07 — regression and acceptance evidence

- [ ] Refresh pre-change source hashes, seeded world/player snapshots and same-browser performance baseline immediately before integration, preserving any concurrent gameplay changes.
- [ ] Syntax: `node --check js/game.js` and `node --check js/sprites.js`. Behavior: `node --test tests/game.test.cjs` (155 cases at this snapshot). External smoke path is documented in agent guidance; keep the smoke script outside the repo.
- [ ] Keep all preview checks and add focused runtime tests for anchors/culling/cache dimensions, all 47 normalized topology patterns, out-of-bounds wall paint, unknown asset failures, semantic frame adapters, alpha, hidden traps and seeded non-mutation. Do not replace behavioral checks with image counts.
- [ ] Chrome with normal `file://` and no relaxed access flags: launch/move/scroll/corridor wall rejection; NPCs/Inn/store; all stairs; keys/loot/potions; Bow and five spells; town scroll/portal/retreat; low-health/help/console/hidden-tab pauses; music/effects after interaction; companions; all boss scenes; ending/skip/restart; desktop/mobile HUD/help. Zero remote requests or missing assets.
- [ ] Compare accepted play-size scenes to real runtime captures using the same map, camera, actor positions, phase and fog. Document intentional visual differences. Final review scenes include staged actor/prop placement; they are not gameplay balance fixtures.
- [ ] Compare seeded gameplay state before/after excluding only explicitly documented visual metadata. Generated rooms, RNG consumption, save contents, combat and progression must match.
- [ ] Measure cold startup, source/bundle size, warm draw p50/p95, active animation rate and cache count/memory in the same browser. Check the 30fps cap and viewport culling. Record actual measurements and investigate regressions; no invented performance claims.

Exit: full runtime verification evidence, accepted visuals, no gameplay regression and a clear bounded rollback diff.

## FG-08 — documentation and delivery

- [x] Refresh README and bestiary with actual integrated screenshots; keep staged captures labeled. Update credits/provenance, artwork/exporter notes, changelog, tasks, handover and agent guide to the final implementation.
- [x] Archive the accepted source hashes and previews, record verification limits and remove stale “missing” claims only for completed coverage.
- [x] Keep gameplay expansion plans separate. No staging, commit, release tag, publication or version bump without a user request.

**Current evidence:** [GR-10 record](../reviews/2026-11-25-graphics-recovery/gr10/README.md). Source hashes and review artifacts are cataloged; final human visual choices and GR-09 native visibility remain open rather than being invented as accepted. Required generated payload is included in the explicitly requested 2.0.0 delivery.

## Work order and rollback

FG-01 → FG-02 → FG-03 → FG-04 → FG-05 → FG-06 → FG-07 → FG-08. Work in a bounded render/data diff. Capture the original production files before touching them; rollback only this integration's edits and generated output, never reset the user's other changes. After a failed check, fix the relevant rendering/data boundary, then rerun affected tests plus the required final suite. Mark tasks complete only when the deliverables and recorded checks exist.
