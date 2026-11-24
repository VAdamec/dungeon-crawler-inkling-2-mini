# Optional art export tools

These tools reproduce the checked-in original pixel grids from the approved local design painters. **They are not required to open or play the game.** Do not add a build or installation step to the runtime.

Requirements for artwork maintenance only: Node, Python 3, Chrome and an externally available Playwright module. Set `PLAYWRIGHT_MODULE` to its module directory if it is not otherwise resolvable. Do not install dependencies into the game repository just to run the exporter.

Run from any directory, in this order:

```sh
node raster-actors.cjs
node raster-town.cjs
node raster-effects.cjs
python3 install-grids.py /tmp/dungeon-jrpg-baked.json /absolute/path/to/project/js/sprites.js
```

Use absolute script paths when outside this directory. The intermediate JSON defaults to the operating system temporary directory, which may differ from `/tmp`; `JRPG_BAKE_DIR` can select a specific existing directory. Pass the actual intermediate path to Python.

The first exporter starts a fresh intermediate file. The next two extend it. `install-grids.py` replaces only the data prefix before `// Disposable raster caches` and preserves current runtime rendering functions. Review the diff and run syntax, behavior and browser checks afterward. Do not use the earlier one-off installer from `/tmp`, which was specific to the initial migration.

Actors retain a stable foot anchor. Four-way humanoid views and four pose slots are normalized into explicit bounds; unchanged pose slots share decoded grids. Palette quantization and run-length encoding keep local data compact. Boss frames normalize to the existing scale-3 draw API; ordinary figures use scale 2. Ground shadows are kept separate where possible. Tool changes require visual inspection; this is a renderer migration recipe, not an automatic guarantee of artwork quality.

The game reads only `js/sprites.js` and `js/game.js`; it never reads this directory, intermediate JSON, browser automation tools or preview pages.
