# GR-05 / GR-06 completion evidence

Date: 2026-11-25. Status: implementation and automated verification complete; screenshots available for visual review. Release stays 1.0.1. No staging, commit or release performed.

## Fixed

- **Dungeon materials:** cached surfaces now use immutable source identity through a WeakMap. Previously equally sized floor/wall parts collided, so cache warming could turn floors into wall fragments. Real source pixels are preserved across paint orders.
- **Walls:** concave corner size/position now match the approved `final-preview.js` reference (4×4 at 0/28). All tiles remain opaque and bounded. Five biome material sets and continuous throne carpet treatment are retained.
- **Town:** prepared grass, dirt, cobble and water replace covered legacy terrain paths. Water stays tile-aligned and continuous beneath the bridge. Cosmetic doorstep paths follow existing walkable cells without RNG or map changes.
- **Bridge/buildings/gate:** bridge visible width spans both river cells, and its deck ends on the existing crossing row. Building facade doors align to actual interaction doorsteps; gate art aligns to its existing interaction tile. Visual culling uses full source-cell bounds. Hero remains drawn last.
- **Torch follow-up:** a fixed frame-zero mount is composed with aligned animated flames. All four mount pixel regions stay identical; flame pixels change. Source PNGs and baked data are untouched.
- **Latest screenshot follow-up:** ground items use visible animation-union bounds when placed on the map. Potions no longer hang below their floor tile; icon/source anchors remain unchanged. Regression covers potion, key, chest, both stairs, revealed spikes and portal. The portal intentionally has a wider effect envelope.

## Verification

- Full game suite: **164 tests pass** (~97.4s), zero failures/skips (default heap; no enlarged heap flag).
- Standalone preview suite: **27 tests pass**, zero failures/skips.
- Syntax: `js/game.js`, `js/sprites.js`, `js/art-runtime.js`, browser verification script; `git diff --check` clean.
- Deterministic `bake-runtime.cjs --check`: pass, 10.78 MiB output unchanged.
- Source protection: all **823** snapshotted files unchanged, including prepared PNGs, baked data, stylesheet and unrelated gameplay drafts.
- Seed 20261125: nine before/after state comparisons pass (initial town, ten patrol ticks, floors 1/2/3/7/50/100, return to saved town). See [state-parity.json](state-parity.json).
- Actual game and independent approved preview run in ordinary Chrome over `file://`, with no relaxed flags, remote requests or console/page errors. See [browser.json](browser.json).
- **1,280 real-canvas wall comparisons:** 256 raw masks × five biomes, covering 47 normalized patterns per biome. Exact alpha, fully opaque inside each 32×32 tile and zero paint outside. Maximum RGB delta **1/255**, allowed for browser compositing rounding; this is shape/material parity, not byte-identical RGB.
- **48 exact RGBA material checks**, 24 distinct source surfaces across forward/reverse warm order. VM regression also covers replacement source identity.
- Actual keyboard bridge crossing and return; blocked river movement; Inn healing; Store purchase; gate entry; Town Scroll return to the exact dungeon tile. Town map/props/landmarks remain unchanged.
- Bridge bank bounds differ by less than 0.5 world pixel from x=1536/1600; deck y=960 exactly. Numeric source-bound checks cover all six building doors and the gate.
- Actual torch draw pixels confirm fixed mount/changing flame. Actual potion pixels stay within their own floor (x=328..344, y=328..352 for tile 10,10). Mobile layout fits at 390px.

## Captures and reproduction

- [Town bridge](town-bridge.png), [Inn](town-inn.png), [Store](town-store.png), [gate](town-gate.png), [portal](town-portal.png), [mobile town](mobile-town.png).
- Runtime biome fixtures: [crypt](dungeon-crypt.png), [cavern](dungeon-cavern.png), [kitchen](dungeon-kitchen.png), [tavern](dungeon-tavern.png), [throne](dungeon-throne.png). These use saved approved fixture layouts in the actual game renderer; actor/prop staging is a review setup, not a generated gameplay snapshot.
- `wall-masks-{crypt,cavern,kitchen,tavern,throne}.png` contains all raw mask outputs.
- Optional browser proof: `OX72_PLAYWRIGHT=/absolute/path/to/playwright node docs/previews/2026-11-25-0x72/check-gr0506-browser.cjs`. Playwright/Chrome are external development tools, never game dependencies.
- Game: `node --test tests/game.test.cjs`. Preview: `node --test docs/previews/2026-11-25-0x72/verify-*.cjs`. This machine requires `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib` with `/opt/homebrew/bin/node`.

## Remaining scope

GR-07 remains open: full item/trap/effect state, actor motion and fog/secrecy audit. The two screenshot follow-ups above do not close that broader task. GR-08 cinematic coverage, GR-09 full acceptance/performance/external smoke, and GR-10 delivery documentation remain open. These focused checks do not establish whole-migration visual acceptance or performance parity. Generated `js/art-runtime.js` remains untracked; its eventual delivery decision belongs to GR-10.
