# Classic JRPG preview review — 2026-11-24

Historical first-draft findings. Both revised design stages and runtime integration were subsequently approved and completed; see [implementation and checks](2026-11-24-jrpg-implementation.md). The authorization state below records the earlier review stage.


## Decision and scope

The user found the first draft largely limited to colors. Review of its captured town/dungeon scenes and source confirmed it did not meet the agreed structural redesign. The user requested updated planning/instructions requiring real building, terrain and character changes, with **no runtime changes yet**.

An existing revision-2 preview now claims fixes. Those artifacts are preserved; this documentation update does not independently validate or approve them, regenerate images or change preview/runtime code. The original findings below are historical defects to keep as regression checks, not a claim that each remains in revision 2.

## First-draft findings

| Finding | Evidence from reviewed first draft | Required revision evidence |
| --- | --- | --- |
| Hero not displayed | Scene used `dir: 'hero'`; proposed grids were `front`, `back`, `side`, causing old-knight fallback | Resolve explicit views and show new directional hero inside both focus-scene evidence and the asset manifest |
| New town art not used | Scene dispatch never invoked `propTownSprite()` | Verify displayed Inn/Store/huts/trees use the new painter, with visibly different silhouettes |
| Town grid code broken | Calling `propTownSprite('inn')` produced `TypeError: r.join is not a function`; grid rows were strings rather than mutable character arrays | Invoke every displayed town prop painter and validate dimensions/row types/palette glyphs |
| Old shapes recolored | Generic fallback reused `spriteFrameGrid(name, frame)` with `PROP_PALETTE`; bosses/props explicitly kept old shapes | New shapes/details for redesign coverage; explicit unchanged/deferred labels for exceptions, with original palette for reused secondary assets |
| River became masonry | `paintPropTile()` received `wall || water` after a water fill and overwrote it | Distinct water/bank dispatch and visible non-wall river surfaces |
| Completion evidence too weak | Console-error and changed-pixel checks passed while important proposed painters were unused | Exercise actual scene paths, verify resolved asset IDs, inspect at play scale and compare grayscale/silhouettes |

## Revised visual requirements

- **Buildings:** pitched roofs/gables, eaves, shaded facades, clear doors/windows and grounded shadows. Replace tiny flat icon silhouettes with convincing building forms. Visual overhang may extend around existing anchors, without moving collision or interaction tiles.
- **Terrain:** remove embossed borders from every grass/road tile; create continuous surfaces, organic tree canopies, distinct banks/water, and connected wall tops/front faces/corners with clear height.
- **Characters:** newly drawn directional hero, NPC and monster with visible shape/proportion/equipment differences at the actual 2× gameplay scale. Show front/back/side hero views; use stable foot anchors. Changing only colors is insufficient.
- **Fair comparison:** same map, camera, positions/scales, fog and lighting within each before/after pair; label any baseline-rendering correction separately. Show color, grayscale and representative building/tree/hero silhouettes or edges.
- **Evidence:** maintain a scene asset manifest identifying actual source grids/painters and new/reused/deferred status. Required redesigned assets must not silently fall back to old art. Pixel/edge deltas are diagnostic, never aesthetic acceptance thresholds.

## Task and approval sequence

1. Future explicitly requested **JRPG-02A**: verify/revise one town and one dungeon focus scene only. Stop after presenting them.
2. After explicit focus-scene approval and a request to continue, **JRPG-02B** expands into the complete biome/character/boss/item gallery. Show intentional reuse and outstanding coverage honestly.
3. Full-gallery approval plus a separate request to begin runtime integration is required before JRPG-03. No current preview is approved; model-written checkpoints cannot grant approval.

See [updated plan](../plans/2026-11-24-classic-jrpg-graphics-plan.md) and [local LLM instructions](../prompts/classic-jrpg-local-llm.md).
