# GR-02 — Unified role resolution and semantic aliases

Date: 2026-11-25
Status: complete (bounded to GR-02)

## Scope
- `js/sprites.js`: unified kind-aware art resolution; removed duplicate `artHas`; added strict normalization/validation behavior for aliases, fixed states, and missing required directions.
- `docs/previews/2026-11-25-0x72/bake-runtime.cjs`: fixed bake-source semantic aliases and item-alias fixed-state metadata; added alias/kind/cycle/range/coverage validation.
- `js/art-runtime.js`: regenerated via bake script.
- `tests/game.test.cjs`: added focused GR-02 resolver/alias/collision/fixed-state coverage; made one existing stairs-draw assertion intent-preserving for anchored sprite drawing.

## Key changes
- `artNormalizeRole()` is the single resolver for character/item/environment/material roles, semantic aliases, and item aliases. It tracks coverage, fixed-state behavior, missing/cycle/error cases.
- `artFrame()`/`artDecoded()`/`artCovered()`/`artHas()`/`spriteDimensions()`/`spriteAnchor()`/`drawSprite()` now route through normalized resolution.
- Missing required direction for a covered character role now warns and returns null (no silent front fallback).
- `artRequire()` throws descriptive error for covered/missing required art.
- Bake aliases now include: `throne -> environment dais (fixed)`, `dragon -> character dragonBoss`, `water -> material town.water (fixed)`, `rubble -> environment rock (fixed)`, `stairsUp/stairsDown/flameOff/flameOn -> fixed item states`. `throne` material remains available as `environment.throne`.
- Item aliases `flameOff/flameOn/stairsUp/stairsDown` removed from itemAliases to avoid duplicate/conflicting resolution; represented as semantic aliases with `fixed:true`.
- Bake validation now checks alias kind support, target kind match, cycles, missing ids, out-of-range frames, fixed boolean shape, and coverage resolvability.

## Intent-preserving test adjustment
- `remembered stairs, loot, and terrain render without showing distant monsters`: drawSprite for anchored ART_RUNTIME sprites uses foot-anchor y (`(tileY+1)*TILE`) rather than center y; test now accepts anchored foot position or legacy center-equivalent proximity. Gameplay/visibility assertions unchanged.

## Checks
- `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --check js/sprites.js js/game.js tests/game.test.cjs` — pass.
- `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node docs/previews/2026-11-25-0x72/bake-runtime.cjs` — pass; wrote `js/art-runtime.js` 10.78MB.
- `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --test --test-name-pattern="GR-02" tests/game.test.cjs` — 1/1 pass.
- Full suite: `/usr/bin/time -l env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node --test tests/game.test.cjs` — **156 pass, 0 fail, 0 skipped, ~78.1s, 607338496 bytes max RSS**.

## Risks / follow-ups
- `artHas()` currently returns true for materials; confirm intended API contract in GR-03/GR-05 as material/sprite distinctions become stricter in rendering paths.
- Resolver warns on missing required directions; callers that intentionally probe may need to handle null. GR-03 should add explicit contract tests per role/direction/state.
- No browser/file:// visual acceptance performed here; GR-05/GR-06/GR-09 cover rendering/cinematic acceptance.
