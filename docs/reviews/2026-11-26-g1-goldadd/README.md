# G1 — goldADD implementation and acceptance

2026-11-26. Explicit user authorization: implement G1, regressions, console/HUD checks and developer docs/tasks/handover. [Plan](../../plans/2026-11-26-goldadd-plan.md) · [G0 audit](../2026-11-26-g0-goldadd/README.md).

## Implemented behavior

`goldADD <amount>` dispatches case-insensitively to flat `addGold(...args)`. Exactly one nonempty positive ASCII-digit string is accepted; leading zeros are decimal. Reject signs, fractional/exponent/base-prefixed/separated/nonfinite/unsafe numbers, extra/missing tokens and non-string direct calls. The current gold must be a nonnegative safe integer and the sum must remain safe. No clamping or silent repair.

The helper permits the open console and god mode in a started living visible town/dungeon run. It rejects launch/death, hidden, Help, health/retreat pauses, pending trade/picker state or visible overlays, boss intro/defeat and ending. It deliberately does not reuse simulationBlocked, which blocks console-open simulation. Existing T1/T2 helpers remain unchanged.

Success increments gold once, calls render once, then reports added amount and total in the console. No gameplay journal, audio, RNG, progression, HP/MP, equipment, inventory, spells, world/floors/merchant stock, portal or cooldown change. Both console startup and help reply list the public command; developer documentation explains usage and limits. Player README/Help are unchanged.

## Regression evidence

[Before implementation](before-fix.txt): all five new regression groups fail against the original runtime. [Focused run](focused-tests.txt): **19/19 pass**, including the five new groups and existing console/travel coverage. The new groups cover:

- Town/dungeon × god mode off/on, three command spellings, exact additive delta/HUD, exactly one render and full semantic state equality after normalizing only gold. RNG/sound throw sentinels remain silent.
- Invalid CLI syntax, extra tokens, non-ASCII digits and direct helper arity/types/whitespace, including a trailing newline; no state/HUD change.
- Zero-current maximum grant and exact safe-integer boundary; overflow/unsafe/nonfinite/negative/fractional/string/null/undefined current gold rejected atomically.
- Sixteen inactive/invalid-area/hidden/dead/menu/health/retreat/cinematic contexts, including state-only and DOM-only overlays.
- Startup and actual help reply discovery, independently of echoed command history.

The semantic snapshot retains all gameplay fields, Sets and nonfinite sentinels; it excludes disposable art/motion/audio objects and permitted console output/history fields. Separate render-count and sound/RNG sentinels cover those paths. Existing assertions were preserved.

[Full game suite](full-tests.txt): **229/229 pass**, zero failures/skips (224 existing + five new regression groups). [Preview run](preview-tests.txt): **27/27 pass**. [Non-writing bake](bake.txt) confirms deterministic art payload; [external smoke](smoke.txt) prints **SMOKE_OK**. All three runtime scripts, game tests and browser runner pass node --check.

## Actual browser checks

[Runner](check-browser.cjs) · [results](browser.json) · [desktop screenshot](desktop.png) · [mobile screenshot](mobile.png).

Actual local file:// Chrome at 1440×1000 and touch-emulated 390×844: launch click/tap, real keyboard console opening/native Enter/clear/help/Esc, town/dungeon and god-mode grants, invalid forms/extra args, maximum HUD and overflow, pending trade rejection and controlled hidden fixture. Successful commands preserve the complete semantic snapshot except gold, with RNG/sound throw sentinels. Both screenshots were inspected: console feedback and Gold 300 are visible; Escape leaves the updated HUD. No page/console errors or remote requests.

Simulation intervals are stopped for deterministic snapshots; actor/progression/portal values, god mode, area entry, trade state and hidden property are staged fixtures, not manual campaign or native mobile keyboard testing. Rendering, file loading, input handlers and DOM display are real. Controlled hidden checks do **not** verify native background-tab/minimize behavior.

## Scope and remaining work

[File hashes](file-checks.json) compare with the completed S0 checkpoint; [runtime delta](game-delta.patch) and [test delta](tests-delta.patch) isolate G1 from the preexisting dirty worktree. HTML, CSS, art payload, sprite code, player README/Help, credits and agent guide are unchanged. No dependencies/network assets, floor-schema changes, market fixes or save/load implementation. No staging/commit/version/release action.

**G1 complete.** S1 save DTO/validation and market M1–M3 remain independent pending phases. **GR-09 native background-tab/minimize remains unverified.**
