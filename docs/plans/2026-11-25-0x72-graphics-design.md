# 0x72 DungeonTileset II integration design

Date: 2026-11-25. Status: **planning proposal prepared at the user's request; visual previews and runtime implementation are not yet approved**.

[Implementation checklist](2026-11-25-0x72-graphics-plan.md) · [Current wall correction](../reviews/2026-11-24-wall-rendering.md)

## Problem and scope

Adopt the actual 0x72 DungeonTileset II v1.7 artwork, with matching modifications and additions, to give the dungeon coherent connected walls, readable floors, consistent actors and animated props. This is a new art direction, distinct from the completed original JRPG graphics pass. Existing 1.0.1 art remains the playable baseline until the proposed replacement has been previewed and integration is requested.

The user requested implementation tasks and plans after a compatibility review. This document records that proposed approach; it does not claim artwork approval or authorize production edits. There are no runtime changes, asset imports or version changes in this planning pass.

Known: the game is a two-script, dependency-free Canvas game working through file://. The pack supplies 16px tiles, connected wall atlases, animated actors/items, and a named crop list. Its README distinguishes 16×16 low walls from overlapping 16×32 high walls. Current art has 76 runtime names and four-direction humanoid variants. The supplied knight has idle/run/hit sequences, not a complete four-direction replacement.

Proposed scope: dungeon materials and props, hero and monster art, equipment/items/hazards/effects, matching custom bosses/companions/NPCs, and a coherent town pass. New companion/trading/teleportation functionality remains in its existing plans; this work only skins whatever behavior is implemented at integration time. Changing the campaign, procedural room topology, collision, map dimensions or camera zoom is outside scope. “Dungeon design” here means visual construction of existing rooms and corridors, not a new level generator.

## Selected player reference — 2026-11-25 follow-up

The user explicitly selected the supplied silver-helmet/navy-tabard knight as the player reference and requested transparent four-direction walking frames for the preview. This supersedes the pack knight as the primary player candidate in the earlier role table below. A generated adaptation now provides front/back/left/right × four distinct walking frames; [assets, provenance and export notes](../previews/2026-11-25-0x72/knight-reference-v1/README.md). The preview uses 64×64 transparent cells at 2× screen scale with fixed (32,56) feet and visible body height at most 48px (96px screen). Old 0x72 hero proportions remain as a comparison only. The adaptation is not part of the CC0 pack; generated source and prompts are separate. The user subsequently approved the knight frames; runtime integration remains a separate step. Other humanoid directions, bosses, town and missing artwork remain separate collection work.

## Remaining character references and preparation — 2026-11-25

After approving the knight, the user requested matching monsters/bosses/NPCs and supplied creature, Mimic and Marmalade reference sheets. Marmalade is now a charcoal cat with leather harness/satchel, superseding the earlier orange design. The pale blue blob, green orc/goblin, tusked brown boar, red/green dragon and gold-banded wooden Mimic follow the supplied identities. Matching custom remaining roles are prepared in the [25-character gallery](../previews/2026-11-25-0x72/characters.html), with four-direction walking or creature-appropriate motion loops. The collection has 400 transparent frames plus the approved knight's 16, all with source/provenance/anchor records. Proposed scale is shown beside the knight; final runtime size adaptation remains a separate task. The user subsequently reviewed the characters; runtime integration remains a separate step. Town buildings/landscape, item/terrain/effect art and additional cinematic-specific coverage remain separate work.

## Alternatives and recommendation

| Approach | Benefit | Tradeoff / risk | Fit |
| --- | --- | --- | --- |
| Dungeon tiles only, retain current figures | Smallest change; quickly proves wall topology | Mixed pixel density, proportions and outlines; incomplete visual result | Useful preview experiment, not the proposed final scope |
| Low walls plus a coherent pack-derived/custom art pass | Clear collision boundaries; reuse current caches, foot anchors and clocks | Requires original missing figures and additional directional poses | **Recommended**, staged behind two visual reviews |
| High walls and layered room presentation | More visible wall height and architectural depth | Overhang/occlusion rules and extra culling; may repeat the wall-walking illusion | Defer as a separate design after the low-wall pass |

## Source and provenance

Inspected local source: `/Users/vadamec/Downloads/0x72_DungeonTilesetII_v1.7/`.

- Main atlas: `0x72_DungeonTilesetII_v1.7.png`, 512×512, 39,623 bytes.
- Low walls: `atlas_walls_low-16x16.png`, 192×64.
- High walls: `atlas_walls_high-16x32.png`, 384×128; reference only for this proposal.
- Floors: `atlas_floor-16x16.png`, 112×112.
- `tile_list_v1.7` records crop names and x/y/width/height; separate frames are also provided.
- The author's [asset page](https://0x72.itch.io/dungeontileset-ii) identifies the artwork as CC0 and says attribution is optional. [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/) permit modification and redistribution. Preserve a source/license record and voluntarily credit 0x72 (Robert). Third-party extensions linked from the author's page are not included or automatically covered.

When asset preparation is authorized, copy the required originals, README and provenance into `assets/source/0x72-dungeontileset-ii-v1.7/`. Keep derivatives and custom additions separate. The runtime and any optional exporter must not reference Downloads or depend on the original local path. Do not copy the full Downloads directory indiscriminately.

Reference SHA-256 values:

| File | SHA-256 |
| --- | --- |
| Main atlas | `b222e563f9006e609cb0a5ec99878b7ef9a92953de3abf4cf2ae9d2aff1355d2` |
| Low-wall atlas | `3326eec4c0eba7ddfa606918becc75ab30a45fc09ca6b87432db2ca60b33c52e` |
| Floor atlas | `0f12a514fa61cd82db9cd9f61371c22f715cd3d34de28fb488cfe1f76a49fbe1` |
| Crop list | `7ef0043788db7f5a28a4e2a139a7c23073874ed4d795728b7556c776e5e4b448` |

## Components and boundaries

### Asset manifest and offline representation

Use an explicit role manifest: runtime name, original crop/atlas, provenance (unchanged/modified/custom), logical footprint, source bounds, foot anchor, render bounds, integer scale, directions, frames, and completion status. Cover all 76 current names, including the legacy dragon alias and cinematic/companion uses; include any newly implemented companion such as Pip if present by integration time. An unimplemented planned companion is a tracked future mapping, not a new gameplay feature in this pass.

Preferred runtime representation: bake approved image crops and custom pixel artwork into compact grids compatible with the existing plain-script sprite/terrain painters. Reuse caching and the no-DOM direct-paint fallback. Preserve source PNGs and a reproducible, development-only exporter; the checked-in output must run without that exporter or any installed package. New format/export changes must be round-trip checked against source crops, including transparency and frame bounds.

This avoids introducing asynchronous image loading or file:// pixel-read restrictions into startup/tests. A direct local-PNG renderer is an alternative only if separately documented and verified in browsers and the Node harness; do not silently add a fetch pipeline, engine, module system, runtime dependency or CDN.

### Terrain and dungeon composition

- Map pack-native 16×16 low-wall/floor art onto the existing 32-world-pixel tiles, with 2× source enlargement followed by the existing MAP_ZOOM=2. Keep W=96, H=64 and VIEW_W=18, VIEW_H=12.
- Select wall tops, ends, convex/concave corners and T/cross junctions from a normalized 3×3 neighborhood, including relevant diagonals. Cardinal edge bits alone are insufficient for all source corners. Read map topology without mutating it or using gameplay RNG.
- Map value 1 is wall. Value 2 remains an obstacle occupying floor, never an adjoining masonry cell. Define out-of-map neighbors consistently as solid boundaries.
- Include biome/material, normalized topology and any deterministic variant in cache keys. Draw within blocked tiles; do not restore the removed 48px wall overlay.
- Use authored floor variants sparingly and deterministically. Keep walls, floors, obstacles and harmless decorative objects visually distinct. Decorative doors/arches/columns must not imply routes or barriers that collision does not support. Do not add functional doors or new collision to fit the artwork.
- Show recognizable crypt, cavern, kitchen, tavern and throne materials with actual matching details, not just five tint filters. Preserve the saved depth-50 carpet/dais/guard-alcove layout and large boss halls.
- Keep existing room generation, stairs/arrival safety, exploration/minimap data, props and hazards intact. Decorations may use existing saved positions; do not create a new world-generation/RNG pass for this art task.

### Actors, animation and missing content

Provisional source candidates below are subjects for visual review, not silent final substitutions:

| Game role | Source / work needed |
| --- | --- |
| Hero | `knight_m_idle_anim_f0..3`, run frames and hit frame; custom matching back/side poses required to retain current directional behavior |
| Goblin / Skeleton / Orc / mage types | Candidate goblin, skelet, orc_warrior/orc_shaman and wizard/necromancer families; review silhouettes and class distinctions |
| Chest, potions, weapons, coins, spikes | Pack crops such as chest/flask/weapon/coin/floor_spikes families; preserve game-specific meanings and hidden/spent states |
| Walls, floors, columns, banners | Low-wall/floor atlases and matching named props; columns/arches need bounds checks |
| Dragon, Hydra, Medusa, themed/named bosses | Matching custom work where no faithful replacement exists; do not rename an unrelated pack monster or stretch an ordinary monster to fill a boss role |
| Marmalade, other missing companions/animals | Matching custom art preserving recognizable identities, companion sizes and remarks |
| Town buildings/landscape, stairs, spellbooks, remaining effects/props | Explicit manifest gap analysis; create matching missing art and directions/states rather than quietly falling back to the old style |

The source knight is 16×28. A native 2× world enlargement would be 32×56, taller than the current 32×44 hero. Demonstrate that actual size in the first preview before approving final render bounds. Do not squeeze it to fit using fractional scaling. Pad/crop transparent space where valid; custom redraws may be needed for proportions. Preserve the single logical actor tile, feet alignment and HUD/bubble clearance. Keep large bosses recognizably large within their approved halls; record intentional visual-size changes explicitly.

Retain current motion interpolation, facing, walking/wing/flame behavior, pause/hidden-tab freezing, capped draw loop, projectile clocks and boss/ending timing. Map source frames onto those clocks instead of running a second timer. Do not invent four-direction support by repeating the same front pose or mirror a front view into a back view. Missing directions and wing/flame/FX frames are production artwork tasks.

### Rendering, state and data flow

Source crops/custom artwork → explicit manifest → optional exporter → checked-in grids/palettes/terrain tables → existing sprite/tile caches → current actor/camera/fog/HUD/cinematic draw paths.

Keep cache data in disposable `state.art` and motion in `state.motion`; neither belongs in FLOOR_FIELDS or monster templates. Keep semantic sprite identifiers stable where possible. Drawing must not reorder monsters, advance time, consume RNG or change player/floor data. Changes to dimensions must flow through shared bounds used by draw/culling, shadows, health bars, bubbles, companions and cinematics.

Town art must preserve doorsteps, NPC interaction points, gate/portal state and player-last visibility. Equipment icons must remain separate from directional/world caches. Legacy sprites must not reappear in companions, boss intros/defeats or the princess ending after the replacement is declared complete.

## Review stages and error handling

1. A standalone file:// comparison scene at actual 1152×768 play size, using the real source crops, modified assets and honest gap labels. Show the same fixture before/after: narrow corridor, thick/thin wall, L/T junction, inner corner, doorway/stairs, torch, hero, representative enemies, loot and companion. Include normal fog and a fully revealed topology view. Review color and grayscale, plus motion/frame strips. Do not bootstrap or modify the playable game for this preview.
2. After the direction is accepted, prepare complete ordinary/boss/item/biome/town coverage and all required motion/directional poses. Present a manifest of new/modified/temporarily retained/missing entries. Missing required roles prevent calling the collection complete.
3. After the complete collection is accepted and runtime integration is requested, apply the rendering changes with regression checks. Do not treat acceptance of this planning document as approval of unseen artwork.

Invalid crops, unavailable sources, unknown roles and missing required frames must fail preparation checks visibly, with an actionable report. Never hide them behind an old-art fallback and call the migration complete. Keep the existing game usable while preview work is incomplete. A failed integration should be reversible through the bounded render diff/source snapshot without resetting unrelated user changes or staging.

## Acceptance and verification

- Approved source/derivative provenance and complete role/frame/direction manifest; no external asset/network dependency at runtime.
- Low-wall topology fixtures pass for isolated tiles, lines, ends, L/T/cross junctions, diagonal/concave cases, borders and obstacles; rendered wall geometry remains inside its blocked footprint.
- A hero can walk along one-tile corridors while wall/corridor-end collision still rejects movement. Foot anchors, shadows, bubbles and bars remain stable through interpolation and camera scrolling.
- Fog and minimap continue hiding undiscovered content; unrevealed spikes are pixel-identical to the same scene without spikes.
- Existing tests still pass (155 at planning baseline); add focused regression coverage for asset/palette/frame/anchor/caching/topology changes. Do not substitute test counts for visual inspection.
- Syntax checks, external smoke and actual file:// browser tests cover startup, movement, combat/spells, travel/portals, pauses/help, companions, all boss kinds, throne room, ending/skip/restart and mobile. Record results, not presumed passes.
- Compare seeded pre/post world and player data excluding explicitly approved visual metadata. No gameplay changes are bundled with the art migration.
- Measure cold load, runtime/source size, warm draw p50/p95, cache size and visible-animation rate against the same-browser baseline. Investigate material regressions before completion; keep the current 30fps cap and viewport culling.

## Decisions still requiring visual review

The plan recommends full coherent coverage, low walls and baked runtime grids. Final source substitutions, hero proportions, custom missing creatures, town treatment and complete directional/animation poses remain subject to the two preview stages. High walls, a new level generator, additional gameplay and a new release number are separate decisions. No fixed completion-time estimate is promised before the missing-art inventory and first preview are assessed.


## Reference items/effects follow-up — 2026-11-25

The supplied reference is adapted into 31 transparent asset families in the [item/effect gallery](../previews/2026-11-25-0x72/items-effects.html). Correct semantics are mandatory: stinger is a small dart, hidden spikes reveal no pixel, closed portal is absent, Barrier is a directional push/impact, healing strengths are distinguishable, and ordinary chest states contain no Mimic anatomy. Torch mount and explicit up/down stairs complete missing details. Alpha/phase/scale records and exact prompts accompany the source PNGs. This new collection awaits review. Town illustration is a materials/architecture reference for a later grid-compatible environment pass. No runtime change is authorized by this preview work.


## Final environment and composition follow-up — 2026-11-25

The user requested town/biomes, final map previews with hero/monsters, and implementation plans. Prepared 24 environment families, with actual material structures rather than color filters: broad crypt flagstones, rough cavern rock, ceramic checker/brick kitchen, oak-board/timber tavern, carved/polished stone and carpet/gold throne room. Town uses timber/plaster/terracotta Inn and Store, thatched cottages, trees, stone bridge, cave gate, grass/dirt/cobble and water. Exact source/revision prompts, source hashes and deterministic PNG exports are workspace-local. Six material sources were refined after native-scale review to reduce pattern noise. No flat opaque backdrop is used behind buildings.

The [final preview](../previews/2026-11-25-0x72/final-preview.html) has nine scenes: town Inn road, bridge/gate, village overview, all five biomes and the depth-100 dragon arena. It reuses current game maps and coordinates captured in an isolated read-only VM. Enemy/hero encounter positions, companion examples and extra theme props are staged explicitly for art review; do not port those placements into generation. Town remains peaceful. Building width follows existing blocked plots; roof/chimney art uses existing style of above-foot overhang. Precise visible doorway alignment remains a runtime anchor acceptance check against the unchanged doorstep coordinates.

[Selected-source mapping](../previews/2026-11-25-0x72/environment-v1/final-coverage.md) covers all 76 current runtime roles. [Final integration plan](2026-11-25-final-graphics-implementation-plan.md) supersedes earlier provisional source choices while retaining offline grids, low-wall geometry and gameplay boundaries. It explicitly handles source anchors/transparent padding, already-large boss art, trap/portal state adapters and cinematic audits. Final visual acceptance and an integration request are still required before runtime changes.
