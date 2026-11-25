# Runtime wall and bridge review

Date: 2026-11-25. Scope: inspect current worktree and user screenshots at 19:03:48 / 19:19:04. No runtime/test/asset changes were made during this review.

## Progress verified

- Current full game suite: **159 pass, 0 fail, 0 skipped**, approximately 79.4 seconds, default Node heap. The earlier OOM is resolved.
- Standalone preview suite: **27 pass, 0 fail**.
- GR-02 role resolution/dais alias and duplicate artHas issues are fixed in current source. GR-03 visual contracts and GR-04 bake round-trip evidence/code have been added.
- GR-05 has an evidence report claiming completion, but the actual runtime remains visually incorrect and must be reopened for the material cache issue below. Source availability/topology count is not visual parity.
- Town terrain still bypasses prepared materials; GR-06 onward remains unfinished. Handover/tasks are behind the GR-03/04/05 evidence files; do not infer status only from old checklist entries.

## P1: all material parts collide in the runtime surface cache

Location: `js/sprites.js`, `artPartSurface()`, around lines 756–760.

The key derives its signature from `part.d` or `part.b64`, while actual baked data uses `part.r` (RLE) and `part.p` (palette). These 32×32 material parts have neither of the checked fields and no anchor, so the key is always `mat:32:32:0:0:0`. Top/face/floor/accent and different biomes reuse the first surface. This explains the screenshot's wall-like floor pattern and why a hero appears to stand on masonry despite walking on logical floor.

Confirmed in normal Chrome using the real file:// game:

- Requested `crypt.floor`, `crypt.top`, `crypt.face`, `cavern.floor`, `throne.floor`.
- All five returned the same cached surface; the decoded source pixels are distinct.
- With a cold cache, painted a crypt wall then a crypt floor. The floor's RGBA **exactly matched crypt wall-top pixels**, and did **not** match crypt floor pixels.

The outer tile cache includes biome/topology, but this inner surface-cache collision defeats that separation. Use immutable part identity or an explicit stable biome/part/art-revision key; dimensions/anchor/encoded length are not unique identities. Avoid hashing full pixel data on every tile paint. Validate warm/cold and order-independent results before calling GR-05 complete.

## P1: water material is anchored half a tile too low

Locations: `decodeArtFrame()` default anchor versus `spriteDimensions()` default anchor in `js/sprites.js`, and `drawWorldSprite()` in `js/game.js`.

The 32×32 water material has no explicit source anchor. Decoder returns `[16,16]`, while dimensions assumes bottom-center `[16,32]` (reported logical anchor Y 16). `drawWorldSprite()` draws it using the foot position of a sprite. At scale 2 and ART_DENSITY 2, the actual water image moves down 16 world pixels: half a tile, or 32 screen pixels at normal map zoom. Shoreline strips still use original tile boundaries. This contributes to the disconnected banks and gaps around the crossing.

Materials should be painted as tile rectangles with top-left coordinates, or use one explicit consistent anchor contract. Do not solve this by moving river or crossing map cells. The metadata/draw/culling contract must agree.

## P1: bridge still uses legacy centered-cell sizing

Location: `drawFloorDetails()` bridge special case in `js/game.js`, around line 2589.

Current draw translates to `(prop.x+1, prop.y+0.5)` tiles, applies Y scale 2/3, then centers `drawSprite('bridge',0,0,2)`. This is the old sprite placement recipe, not a fit of the new bridge's visible deck to its crossing.

Prepared source: cell 80×48, visible bounds `{x:12,y:8,width:56,height:32}`, ground anchor `[40,40]`. Under the current transform the visible width is 56 world pixels against a 64-world-pixel/two-tile river crossing: about 12.5% too narrow. Visible height is about 21.3 world pixels after compression. Whole-cell center/ground anchor do not define the walkable deck center, so vertical deck alignment also needs an explicit contract.

The crossing currently omits water props on row 29, exposing the sand/road floor under transparent bridge pixels. Combined with shifted water and the undersized/old-positioned bridge this matches the broken crossing in the user's screenshot. Keep map walkability unchanged; paint river background continuously below the bridge and fit visible bank contacts/deck to the existing two crossing tiles. If deck and ground anchors differ, record a deck rectangle/anchor rather than guessing from transparent cell margins.

## Why the tests missed it

The GR-05 test checks painter success, opacity, repeated-output determinism and a manually constructed set of `biome:mask` strings. It does not compare requested surface content to expected source pixels, nor check actual material-surface cache identities. A deterministic wrong shared texture passes. Its synthetic buffers also clip writes to 32×32, so they cannot prove absence of writes outside that area.

Add runtime checks that:

1. Distinct material sources get independent cached surfaces while repeated same-part draws reuse a surface.
2. Floor output matches selected floor source after warming cache with top/face/other biomes, in several orders; compare relevant wall construction against accepted preview independently.
3. Real canvas or draw instrumentation detects out-of-tile writes without silently clipping them away.
4. Water occupies each intended tile rectangle, bank strips align, and camera interpolation does not change placement.
5. Bridge bank-contact width spans exactly the existing crossing and its walkable deck aligns vertically; compare geometry to hero feet/collision guide.
6. River/map/door/NPC/actor positions and RNG snapshots remain unchanged.

## Next local implementation order

1. Reopen **GR-05-R1**: fix material cache identity and add order-dependent RGBA regression coverage; refresh five runtime biome captures.
2. Complete **GR-06-A**: unify water tile placement/background and fit bridge visible deck/bank contacts; verify walking across both directions at actual file:// play scale.
3. Reconcile task/handover status with GR-01–04 evidence, and leave GR-05 visual parity/GR-06 incomplete until those checks pass.
4. Continue GR-07/08 and full GR-09 acceptance afterward. No release/commit/version changes are implied.

Probe results: [wall-bridge-audit.json](wall-bridge-audit.json). Browser probe used actual runtime plus isolated offscreen Canvas comparisons, with no JS errors. The first screenshot attempt left launch UI hidden and timed out; it was corrected by invoking startGame before capture. Final probe completed. Full behavioral and preview suites pass despite these visual regressions.
