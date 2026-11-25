# Dungeon Crawler development documentation

Updated 2026-11-25 for the integrated graphics worktree. See [agent conventions](agents.md), [tasks](tasks.md), [handover](handover.md) and [credits/provenance](CREDITS.md). Release version: 2.0.0. **GR-09 native background-tab/minimize observation remains unverified**; an explicit visibility-handler fixture is not a native transition test.

## Project background

This project began as a local LLM playground. The original author recorded roughly 30 hours to v0.11.0, using Apple M1/M5 machines and an RTX 4070 Ti PC, with inkling-2-mini, qwen3 and gemma. Graphics provenance and generation/export history belong in [CREDITS.md](CREDITS.md) and source records, rather than the player README or in-game Help.

## Runtime and delivery

Open `index.html` directly over `file://`. No server, build step, package installation or module loader is used during play. Ship these five files together, preserving relative paths:

1. `index.html`
2. `style.css`
3. `js/art-runtime.js` — generated data, loaded first
4. `js/sprites.js` — art resolution/rendering, loaded second
5. `js/game.js` — gameplay/bootstrap, loaded last

The art payload is a required generated distribution artifact included with release 2.0.0; never silently omit it. Subsequent staging/commits/releases still require a user request. Source PNGs, prompts, preview galleries, screenshot scripts and bakers are developer/review files, not runtime fetches. See the [artifact ledger](docs/reviews/2026-11-25-graphics-recovery/gr10/artifact-ledger.json).

## Maintaining prepared artwork

- Selected knight/character/item/environment PNGs and manifests live under `docs/previews/2026-11-25-0x72/`. Keep the exact prompts, original selected source and correction provenance. Do not edit approved PNGs merely to make a test pass.
- `environment-v1/final-coverage.json` maps runtime roles to selected source families; `bake-runtime.cjs` resolves aliases, validates coverage and encodes lossless data. Keep material names separate from scenery names (`throne` resolves to the dais sprite; the throne material is still a material).
- Add a reviewed source/manifests/mapping when adding production art. The old `SPRITES`/palette grids are a fallback/prototyping path, not a substitute for a missing covered asset. Required art failures must remain explicit.
- Use `spriteDimensions()`/source anchors and union bounds, not raw grid dimensions or transparent cell size, for positioning and culling. `ART_DENSITY=2` is distinct from `MAP_ZOOM=2`.
- Raw sprite canvases are source-resolution and keyed by role/direction/frame, **not display scale**. Material surfaces use source-object identity. Keep icon caches separate. Rendering must not consume gameplay RNG.

Check or reproduce the existing bake with a working Node:

```sh
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --out /tmp/dungeon-art-runtime.js
cmp js/art-runtime.js /tmp/dungeon-art-runtime.js
```

When approved source pixels actually change, regenerate the payload with `node docs/previews/2026-11-25-0x72/bake-runtime.cjs` and run source round-trip, alpha/anchor/state and affected browser checks. Do not hand-edit the generated JS. Preparation exporters (`prepare-knight.cjs`, `prepare-characters.cjs`, `prepare-items.cjs`, `prepare-environments.cjs`) package sources; their collection READMEs document exact inputs/exports. None is a browser-play prerequisite.

## Gameplay changes

Add ordinary monster definitions to `MONSTER_TYPES` in `js/game.js`, including sprite role, base HP/ATK/DEF/XP and optional minimum depth/ranged/magic fields. Generation samples the full eligible weighted pool. Use `BOSSES`/`bossForDepth()` and `BOSS_ANIMATIONS` for bosses; keep final princess rescue gated by depth 100 and dragon defeat. Keep targeting/collision single-tile despite large art.

Add item definitions to `ITEM_TABLE` and route equipment changes through `equipItem()` so ring HP does not stack. Damage goes through `hurtPlayer()`/`damageMonster()`. Preserve floor-local saves versus run progression/transient UI/motion/art state; collected items stay collected and ordinary monsters recreate on return. Town time remains separate from dungeon simulation.

Actor movement commits through `moveActorTo()`; interpolation is visual. Prepared walking/wing/deformation poses must not receive a second procedural gait. Hazards select authored semantic states using existing clocks: hidden spikes/closed portals are empty, cracks appear only during warning, settled rubble uses the final pose, and an inactive vent cannot animate into burning. Changing a frame never deals damage, spends a scroll or advances combat.

Cinematic draw calls use the captured feet for in-world collapse and `drawCinematicActor()` for visible-union-centered screen shots. Preserve identity-bound callbacks, one-shot events, rewards, skip/restart and the finale's 0–2 / 2–5 / 5–8 / 8–14s schedule. Skeleton guards collapse without extra rewards. A new motion sheet is not automatically a bespoke attack/death/crying pose; record visual choices.

## Checks and documentation

```sh
node --check js/art-runtime.js
node --check js/sprites.js
node --check js/game.js
node --test tests/game.test.cjs
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
```

The existing external smoke script is outside the repo, loads all three scripts, and prints `SMOKE_OK`. Browser tools under the preview directory require an external development-only Playwright/Chrome installation; no npm dependency is added to the game. [GR-09 evidence](docs/reviews/2026-11-25-graphics-recovery/gr09/README.md) documents commands, matched baselines, source hashes and measured limits.

After gameplay/rendering changes, verify actual `file://` controls, dialogs, travel, fog/secrecy and sound following user interaction. Documentation-only changes do not require rerunning the full behavior suite if runtime/data/source pixels remain byte-identical. [Screenshot reproduction](docs/screenshots/2026-11-25-integrated/README.md) uses actual runtime rendering and labels every staged setup. Update counts/stat tables from current code and keep historical evidence dated.

## Developer console

Use **~ / `** to open the console; it pauses play. `loadLevel <1-100>` generates a fresh floor with its boss and refills HP/MP. `godMode 0|1` toggles frozen hero stats and one-hit player attacks while monsters remain mutable. `help` and `clear` are also available. These testing commands intentionally stay out of player Help.
