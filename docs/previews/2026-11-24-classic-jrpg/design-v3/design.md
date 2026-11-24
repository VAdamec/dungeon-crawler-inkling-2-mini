# Stone, timber & steel — JRPG design study 03


Latest outcome: both design stages and runtime integration were approved. See [implemented graphics and verification](../../../reviews/2026-11-24-jrpg-implementation.md). Earlier authoring limits below describe the design-only stage; the game now contains self-contained baked grids, not a dependency on this gallery.

Status: **approved reference artwork; integrated in the working game after an explicit user request**.

The user asked the primary agent to prepare the design after local-model difficulty. This authorizes the isolated visual proposal, not runtime changes. Earlier local-model revisions are preserved in the parent folder. This new study is in `design-v3/` so its artwork, source and evidence are distinct.

## View the proposal

Open [index.html](index.html) directly through `file://`. It needs only local scripts; it never loads `js/game.js` or boots the game.

- [Town](proposed-town.png) / [current-art comparison](current-town.png).
- [Dungeon](proposed-dungeon.png) / [current-art comparison](current-dungeon.png).
- [Directional knight sheet](characterSheet.png).
- [Town grayscale](proposed-town-gray.png) / [current grayscale](current-town-gray.png).
- [Dungeon grayscale](proposed-dungeon-gray.png) / [current grayscale](current-dungeon-gray.png).
- [Solid silhouettes](silhouettes.png).

The gallery switches current/proposed modes and grayscale without changing layout or anchors. Individual scene exports are 1152×768: 18×12 logical tiles at 2×, rendered from a 576×384 art composition. These are prepared art compositions, not screenshots of a generated playable floor.

## Design

**Buildings:** broad pitched roof masses with staggered tiles, eaves, chimneys and dormers above timber-framed plaster facades. Separate windows, doors, foundation stones, signs and steps establish depth. Inn and shop have different roof materials. Buildings may visually overhang their existing anchor; this is deliberately more substantial than a one-tile icon.

**Landscape:** continuous grass and dirt paths with sparse deterministic texture, small flowers, irregular layered canopies and visible tree trunks. The river has wavy banks and separate water highlights, with a planked bridge and rails. No per-tile grass/path bevel. The proposal uses a subdued earth/steel palette; its geometry is visible in grayscale and solid masks.

**Dungeon:** tall front-facing masonry above the collision footprint, stone caps, dark mortar, structural columns, a worn central runner and larger staggered flagstones. Torchlight and edge darkness are identical between modes so they do not manufacture the redesign. Gold stairs and chest trim, a red potion and pale bone keep interactables and enemies distinct.

**Characters:** a helmeted knight with a small visible face, separate breastplate/limbs/boots, brass belt, sword, shield and red cloak. Four directions and three stance/walk poses share a fixed ground point. The shield-side and sword-side profiles are distinct. A taller robed caster, articulated skeleton, villager and cat demonstrate the same light direction and foot anchoring.

## Scope and integration questions

This is a visual review proposal, not a claim that all runtime constraints have already been implemented:

- The knight reaches approximately 42 world pixels above its foot anchor, compared with the current roughly 32px actor bounds. This is an intentional proposed proportion change, not increased map zoom. It needs explicit visual approval and bounds/bar/bubble/culling integration later. Collision remains a single existing tile.
- Building art spans roughly 4–5 tiles in width and overhangs upward around its anchor. The prepared composition leaves space for it, but the current generated town has not been changed or verified to accommodate every overhang. Later integration must resolve any overlap through approved visual bounds/cutaways or smaller approved variants, without silently changing the town map or collision.
- Raised dungeon facades/columns require art-aware viewport overscan and player visibility checks when integrated. No live fog/hidden-trap logic is used or tested by these compositions. Do not infer secrecy safety from static images.
- There is one hero per focus scene. The other human figures are villagers; directional alternatives are on the separate sheet.
- Bosses, remaining enemies, other biomes, all equipment/hazards, complete town landmarks and cinematic poses remain deferred to JRPG-02B. The current-art snapshot is comparison material only.
- Full-scene current/proposed versions use the same prepared ground layout, object positions, world scale, annotations, camera, lighting and vignette. Proposed asset silhouettes/bounds differ intentionally. Terrain materials and actor shapes are the changes under review.

## Source manifest

All proposed imagery comes from original painters in [design.js](design.js). There is no proposed-mode fallback to old sprite grids or color remapping. The baseline view uses the existing isolated `../before-sprites.js` snapshot only. No new production asset library, engine or external request was introduced.

| Role | Proposed painter | Visible coverage / anchor |
| --- | --- | --- |
| Inn/shop | `building()` | Broad roof/facade/door assembly; bottom interaction anchor |
| Trees | `tree()` | Irregular pixel canopies, branches/trunk; trunk foot |
| Grass/road, stone floor | `ground()` | Continuous deterministic scenery, no gameplay RNG |
| River/banks | `river()` | Explicit water surface and bank strips; never wall dispatch |
| Bridge | `bridge()` | Fixed bridge position, planks and rails |
| Wall faces/caps | `wall()` | Same abstract wall footprint, visual upward height |
| Columns | `pillar()` | Stone column with separate capital/base; base foot |
| Hero | `hero()` | Front/back/left/right; rest and two step poses; shared foot |
| Villager | `villager()` | Three town stand-ins; foot anchor |
| Caster/skeleton | `mage()` / `skeleton()` | Distinct body/robe/bone shapes; foot anchor |
| Marmalade study | `cat()` | New small cat silhouette, face and curved tail; foot anchor |
| Chest/potion/stairs | `chest()` / `potion()` / `stairs()` | New shaped props, gold down marker |
| Torches | `torch()` | New fixture/flame with separate shared lighting |

## Verification and limits

Browser evidence is recorded in [verification.json](verification.json). It checks actual `file://` loading, exported scene dimensions, exercised painters, comparison/grayscale controls, zero JS errors and zero remote requests, plus a 390px mobile viewport without horizontal overflow. The proposal script passed `node --check`. Town, dungeon and directional-sheet captures were visually inspected.

Color/grayscale/solid-mask views are available for human judgement; changed-pixel percentages are not treated as style acceptance. Painter invocation counters establish code paths ran, not that the artwork is approved or that game behavior is safe. Runtime/test file hashes are compared separately in the task handoff.

No game behavior suite was rerun for this isolated artwork-only work. Earlier 132-test game results remain historical. Browser performance and campaign behavior of an eventual integration remain unassessed.

## Approval and next collection

The user approved this focus design and requested the remaining monsters, bosses, items and biomes in the same style, with no runtime changes. The expanded [JRPG-02B collection](collection/index.html) and its [design notes](collection/design.md) are now prepared for separate review. This acceptance covers the focus look; it does not authorize production integration or approve unseen expanded artwork.
