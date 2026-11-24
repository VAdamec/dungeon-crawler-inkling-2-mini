# Classic JRPG graphics — revised focus proposal (draft)


Latest outcome: both design stages and runtime integration were approved. See [implemented graphics and verification](../../reviews/2026-11-24-jrpg-implementation.md). Earlier authoring limits below describe the design-only stage; the game now contains self-contained baked grids, not a dependency on this gallery.

Status: **approved reference artwork; integrated in the working game after an explicit user request**.

This is the concrete visual proposal requested before any implementation. It follows the agreed Knights of Xentar /
PC-98-inspired overhead pixel-art direction. The first draft exposed real harness bugs: the new hero was named
`front` / `back` / `side` while the scenes asked for `hero`, shaped town props were never called and their grid
helper threw, non-hero props were recolors of old grids, and water was sent through the wall painter. This revision
fixes those issues and deliberately shows **one town and one dungeon sample first**. Boss, full monster, item and
throne-sheet expansion is deferred until these two samples pass. **Do not treat this as approval.**

## What the gallery shows

- `index.html` — dependency-free gallery. Open directly from disk; no server, modules or remote assets.
- `before-sprites.js` — isolated copy of the current runtime sprite grids/palettes for the “before” half.
- `proposal-sprites.js` — proposed original hero, ordinary-enemy and NPC/animal grids; shaped town/dungeon props;
  coordinate-derived biome painters.
- `preview.js` — isolated harness. It draws two 18×12 scenes at 2× display scale, then true grayscale copies. It
  never loads or boots the game.
- `before-*.png` / `after-*.png` / `gray-before-*.png` / `gray-after-*.png` — captured comparisons for color and
  grayscale review.
- `gallery-full.png` — full-page capture of the presented revision.

Grayscale is generated from the rendered pixels, not a CSS filter, so the captures prove the redesign survives
without palette. Dense sheets and the throne/boss sample are intentionally absent until after this focus gate.

## Shared rules for every proposed asset

- Square grid, fixed overhead camera. No diamond tiles, perspective warp, 3D or battle screen.
- World constants stay 96×64, 32 px logical tiles, 18×12 viewport, 2× zoom, 1152×768 canvas, 288×192 minimap.
- One consistent light direction (upper-left): dark outline, mid-tone body, a warm rim highlight on the lit edge.
- Foot anchoring: every actor's feet land on the same logical tile point across directions and walk frames.
- Bounds: ordinary actors 16×16 logical px (32 px drawn at 2×); large boss bounds remain a later task.
- No new animation system: proposed walk frames reuse the existing 0–3 frame clock and pose transforms.
- Ground tiles have no embossed square border. Grass, road and dungeon floor vary by coordinate but read as
  continuous surfaces across tile seams.
- Hidden spikes must remain pixel-identical to ordinary floor until revealed. No proposal changes that semantics.

## Palette proposal

Warm earth and muted greens in town; cool slate/teal in crypts; warm kitchen/tavern accents; distinct throne
colors reserved for later. Amber light throughout, restrained highlights, dark outlines. Biomes must not converge
on uniform brown. Grayscale contrast is checked separately.

| Role | Proposed colors |
|---|---|
| Outline | `#17131b` (near-black plum, not flat black) |
| Steel / lit steel | `#9aafbd` / `#c2d0d9` |
| Brass / brass highlight | `#c89745` / `#f0d384` |
| Crimson cloth / shade | `#963f4a` / `#5f2833` |
| Skin / shade | `#e2b98d` / `#b98361` |
| Town grass / dark | `#6e8b4e` / `#3f5c38` |
| Sand road / light | `#c2a878` / `#e0c99b` |
| River / lit ripple / bank | `#164452` / `#3d8fa0` / `#b49a6b` |
| Town roof / timber | `#a9503a` / `#775034` |
| Crypt wall top / face | `#43576d` / `#121c2a` |
| Cavern wall / face | `#2c4847` / `#142627` |
| Kitchen / tavern floor | `#5b4530` / `#4a3329` |
| Amber lamp / flame | `#f5b35b` → `#da8b33` |

## Figures

The town scene draws the new hero in front, side and back views; the dungeon scene draws the new side-view hero
walking with Marmalade. The mapping is explicit (`view: 'front' | 'side' | 'back'`), so the scene no longer falls
back to the old `knight` sprite. Feet share one anchor across directions. The new ordinary monsters in the dungeon
sample use original grids, not recolored runtime grids.

Readability constraints: preserve ground shadows, foot anchors, HP bars, speech bubbles, warning badges and
companion scale. Enlarged figure sheets remain deferred with the rest of the full asset gallery.

## Town

The town sample uses shaped props from `PROP_TOWN`: stepped pitched gables, shaded facades, lit window rows, doors
and eaves for Inn/Store/huts; an arched gate; rounded, irregular tree canopies; plank-and-rail bridge; and a simple
doorstep. `propTownSprite()` now returns a mutable 32×32 char grid and no longer throws.

Water is a separate tile kind (`w`) with blue surface, ripples and foam at banks. Bank tiles (`a`) are distinct
sand/stone strips with a waterline on the river-facing side. Sand roads and grass have no embossed border; their
speckles and marks do not form tile frames.

## Dungeon

The dungeon sample uses `PROP_DUNGEON` for stairs, chest, potion, key, torch and revealed spikes: each is a new
shape, not a recolored old grid. Walls have a lit top surface, a hard cap/overhang, a darker front facade with
pilasters and brick courses, and chamfered upper corners. Floors are continuous, with coordinate-derived cracks
and flags rather than square outlines. Fog edges and narrow corridor topology remain unchanged.

## Items and effects

Coverage was reduced for this revision. No boss, throne, equipment or hazard sheet is presented. The displayed
dungeon props demonstrate the intended outline/light direction; hidden spikes remain unchanged until revealed.

## Readiness / open decisions for the user

- Approve or reject the two concrete focus scenes and palette. General agreement to the JRPG direction is not
  approval of these images.
- Check them in both color and grayscale. The captured grayscale deltas are town 0.649 pixels changed / 43.98 mean
  delta / 0.221 edge change; dungeon 0.543 / 18.33 / 0.141. These are evidence, not a human aesthetic judgement.
- Confirm that the shaped facades, trees, riverbanks and wall faces are substantial enough to continue.
- Focus approval permits a later requested JRPG-02B gallery expansion only. JRPG-03 still requires full-gallery approval and a separate request to start runtime integration. If rejected, revise only the isolated preview when requested; no runtime changes occur.

## Updated acceptance policy — 2026-11-24

The user requires structural building, terrain and character changes, not merely new colors. Apply the [review requirements](../../reviews/2026-11-24-jrpg-preview-review.md) and [JRPG-02A/02B gates](../../plans/2026-11-24-classic-jrpg-graphics-plan.md). Revision-2 metrics and claims above are historical checkpoint evidence, not independent acceptance or approval. Current authorization is documentation updates only; this pass did not redraw, recapture or validate the revised artwork.

## Latest proposal — design study 03

The user subsequently asked the primary agent to prepare the visual design. The latest candidate is [design-v3/index.html](design-v3/index.html), with its own [design and bounds notes](design-v3/design.md). This revision-2 study remains archived. Study 03 is isolated JRPG-02A work, not approved art or runtime integration.
