# Town and biome artwork — final composition review

> **Historical preparation record.** The notes below describe source/preview preparation before integration. The current worktree now renders this collection through `js/art-runtime.js`; these galleries remain isolated review pages. See the [current delivery/documentation record](../../../reviews/2026-11-25-graphics-recovery/gr10/README.md) for runtime status and the still-unverified GR-09 native background-tab check.

Prepared 2026-11-25 with the **built-in image_gen tool**, guided by the user's town reference and selected classic JRPG direction. This is a generated adaptation, separate from the CC0 0x72 pack. The initial prompt for each source is saved in its own `prompt.md`; refined material sources use the additional exact `revision-2-prompt.md`; selected full-size sources are `generated-source.png`. The original user references remain in `../items-effects-v1/`.

Open [the final preview](../final-preview.html) directly via `file://`. No server, package installation or browser flags are needed. It does not load the game bootstrap. Current playable release stays 1.0.1.

## Environment collection

24 asset families:

- Town sprites: Inn, General Store, thatched cottage, cave gate, horizontal stone bridge, broadleaf tree, pine and doorstep.
- Dungeon/theme props: tombstone, cave crystal, iron cauldron, wooden tavern counter, crimson royal banner, stone pillar and stepped throne-room dais.
- Blocking/utility props: crate, barrel and boulder. Extra props do not authorize extra runtime placements or interactions.
- Six four-part material atlases: crypt, cavern, kitchen, tavern, throne and town. Dungeon atlases contain floor / wall top / wall face / accent; town contains grass / dirt road / cobble / water. Material samples are authored separately, not recolors of one pattern.

Each exported sprite has real transparent margins and a recorded foot anchor. Materials are opaque, four 32×32 source cells in a 64×64 atlas. The existing anchor/alpha-aware Node PNG codec and deterministic `../prepare-environments.cjs` perform packaging only; no generated scenery is painted by a procedural substitute. The exporter also supports opaque RGB PNG sources. Scaling uses nearest neighbor and alpha cutoff 64, with accepted source alpha retained.

Geometry/coping/concave joints are code-native wall construction based on the tested normalized 47-pattern topology. The material is drawn within that geometry, not used as a stretched full-room image. Every blocked tile is opaque, faces stay inside it, and no floor is drawn underneath. Trees/buildings use explicit source bounds; building width follows the existing blocked plot, with roof/chimney art above the foot anchor as in the current renderer. There are no flat opaque backdrop rectangles. Final visual acceptance should inspect facade doors against the guide's exact interaction diamonds.

## Scenes and fidelity

The preview provides nine views: market/Inn, bridge/gate, whole village and six dungeon compositions (five biomes plus the final dragon arena). The hero, NPCs, animals and monsters come from the prepared character sources; item effects come from the corrected collection. No old runtime figures are silently substituted.

`fixtures.json` is a read-only snapshot of current game generation under seed 20261125. Town layout, building footprints, bridge crossing, doorsteps, NPC paths/animals, saved dungeon props, maps and arena dimensions are retained. Dungeon encounter positions and extra theme props are staged to inspect artwork, not proposed spawn/balance changes. Town has no hostile monsters. The hero is drawn last. Whole-town view uses half play scale; other views are 1152×768 at 18×12 tiles.

The collision guide exposes actual map values and interaction points. The fog toggle is an illustrative review mask, not a replacement for runtime fog/visited logic. Pose playback is isolated from game simulation. Opening the town portal in this page only changes its review appearance.

Town road branches are derived deterministically over already-walkable tiles to connect existing doorsteps; they are a cosmetic composition proposal, not map edits. Buildings retain current blocking plots and stone doorstep positions. Gate/tree proportions and the bridge must be validated against actual runtime motion during integration.

## Reproduce exports and checks

From project root with a working Node:

```sh
node docs/previews/2026-11-25-0x72/build-final-fixtures.cjs
node docs/previews/2026-11-25-0x72/prepare-environments.cjs
node docs/previews/2026-11-25-0x72/build-final-coverage.cjs
node --test docs/previews/2026-11-25-0x72/verify-environments.cjs
```

The fixture builder reads the current game in an isolated VM using the existing harness setup; it does not edit it. The exporter refuses missing sources; `--partial` is only for explicitly incomplete work. `environment-data.js` embeds exported image bytes for safe direct-file PNG export; it is preview data, never a production dependency.

`../check-final-browser.cjs` is an optional developer evidence tool using an external Playwright install. It checks all scenes, pose/freeze controls, collision/fog/portal toggles, PNG export, unchanged fixtures, mobile fit, all 1,280 raw wall masks across five materials, and no browser errors/network requests. Captures and actual results live in `review/` after verification. See [coverage ledger](final-coverage.md) and [implementation plan](../../../plans/2026-11-25-final-graphics-implementation-plan.md).

## Remaining work

Final visual acceptance, runtime bake, exact scale/door/companion/cinematic audits and full gameplay/offline/performance acceptance are implementation tasks. Source coverage does not by itself prove every cinematic shot. Do not change version, commit, publish or implement gameplay expansions as part of this preview.

## Verification result

27 preview tests pass. Nine scenes, 1,280 bounded opaque wall cases, state-preserving controls, local PNG export and mobile fit pass in ordinary `file://` Chrome without remote requests or errors. All 749 protected files are hash-unchanged. [Verification summary](verification.json) · [Browser report](review/browser.json) · [Nine-scene contact sheet](review/final-contact.png). Runtime integration/performance and full campaign testing remain future tasks.
