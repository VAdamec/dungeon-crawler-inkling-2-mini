# Integrated runtime screenshots — 2026-11-25

These are actual local `index.html` captures using `art-runtime.js`, `sprites.js` and `game.js`, not standalone preview compositions. Captured for release 2.0.0; the release record identifies the final tag and source commit. See [capture.json](capture.json) for seed, actor positions, source frame/scale and live stat tables.

| Files | Setup / limits |
| --- | --- |
| `launch.png` | Initial launch-only logo/version before starting |
| `town.png` | Generated village, hero positioned at the Inn approach |
| `marmalade.png` | Generated bridge/gate area, actual recruitment via Space; hero/companion positioned for the shot; speech bubble hidden for an unobscured still, journal retained |
| `dungeon.png` | Staged depth-6 cavern encounter: four prepared monster positions, gear, stats, inventory and all spells; not a natural spawn or balance/progression example |
| `help.png`, `mobile-help.png` | Actual ? key/Help dialog; mobile is a 390×844 emulated viewport, not a device performance test |
| `skeleton-king.png` | Fresh generated depth-50 arena, prepared hero/exploration, existing guard summoning; inherited staged stats are not an endgame example |
| `boss-intro.png` | Actual Skeleton King intro at 0.7s |
| `bosses.png` | Nine runtime-rendered boss illustrations in a labeled contact sheet; normalized for documentation, not comparative world scale |
| `monsters/*.png` | 18 transparent runtime-rendered figures at normalized display scales; Mimic pose 2, other figures front pose 0 |

Desktop viewport is 1800×1200. Gameplay views crop to the complete `#gameLayout` (HUD, log, map, floor chart and equipment); launch/desktop Help show the viewport. The seed is 20261125. Periodic AI is disabled and rAF callbacks are queued for reproducible stills; no timing/performance claim is based on these screenshots. Game source, generated data and prepared PNGs are unchanged.

## Reproduce

With an existing external development-only Playwright/Chrome installation:

```sh
OX72_PLAYWRIGHT=/absolute/path/to/playwright node docs/previews/2026-11-25-0x72/capture-readme.cjs
```

Optional output directory: append it as the script's first argument. The game itself has no Playwright dependency. This machine uses `/opt/homebrew/bin/node` and `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`.

The script opens normal `file://` without relaxed access flags, captures the UI, draws the bestiary through `drawCinematicActor()` and records current monster/boss/spell values. It fails on page/console errors or remote requests. These documentation captures do not replace gameplay checks or establish new user visual acceptance.

**GR-09 native background-tab/minimize verification remains UNVERIFIED.** No native visibility observation is performed here; the explicitly simulated visibility-handler result remains separate. [GR-09 report](../../reviews/2026-11-25-graphics-recovery/gr09/README.md).

Older captures remain in their dated directories as historical artwork. [Credits/provenance](../../../CREDITS.md).
