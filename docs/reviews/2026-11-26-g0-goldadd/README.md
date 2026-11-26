# REVIEW/G0 — goldADD readiness

2026-11-26. **G0 complete; G1 ready for an explicit implementation request.** `goldADD` remains unimplemented. No runtime, tests, player/developer guide, art, git staging or release changes were made by this review. Existing worktree edits are preserved.

Read the [G0/G1 plan](../../plans/2026-11-26-goldadd-plan.md), [handoff prompt](../../prompts/2026-11-26-goldadd-local-llm.md), agent conventions, current code/test diff, tasks/handover and developer console documentation. This is an audit of the current C3 candidate, not authority to start G1 or another feature.

## Current code versus plan

| Requirement | Current evidence | G1 work / readiness |
| --- | --- | --- |
| Recognize `goldADD <amount>` case-insensitively | `js/game.js:3912` submitConsole lowercases names, but only dispatches loadlevel/godmode/teleporttown/addscrolls/clear/help; no addGold helper | Missing helper and branch; existing parser supports a small addition |
| Exactly one positive ASCII decimal argument | `addScrolls` at `:3892` already validates string/regex/arity and safe arithmetic; dispatcher forwards `...args` | Reuse that pattern for gold; forward every token, do not silently accept extras |
| Safe existing gold/amount/result | `newGame` initializes state.gold to 0; economy modifies the global value; no gold-grant validator | Validate nonnegative safe existing balance and positive safe count/result, reject instead of clamp/repair |
| Console allowed, town/dungeon + god mode | T1/T2 permit consoleOpen and use explicit living/visible/modal checks; `simulationBlocked` at `:375` blocks console simulation | Do not use simulationBlocked as the whole command guard. Mirror T2 policy; no need for a broad guard/parser rewrite |
| Reject Help/health/retreat/trade/picker/hidden/boss/ending/dead | `openConsole` at `:3797` only blocks Help/trade/picker; it deliberately opens on launch/death for other debug commands | The new helper needs its own full eligibility check, including DOM-visible stale player overlays as in T2. Opening console alone does not prove eligibility |
| Gold-only change, including god mode | GOD_STAT_FIELDS at `:421` contains hero stats, not gold; `freezePlayerStats` at `:203` restores only those fields | Gold may change under god mode; assert stats/preferences/resources/stock/portal/clocks remain equal |
| HUD once + feedback | `render` at `:3969` writes state.gold directly to #gold (`:3985`); consoleMessage at `:3791` writes bounded console output | Existing render/feedback suffices. No new DOM, animation, gameplay journal or sound needed |
| Discovery / developer docs | Startup string `:3805`, help `:3927`, DOCUMENTATION developer table omit goldADD | Update all three only in G1; keep cheats out of player README/Help |
| Regression coverage | Four T2 groups, six T1 groups, basic scroll/portal/help tests already exist; no goldADD tests | Add gold-specific cases, retain existing assertions; use current helper fixtures rather than duplicating a harness |
| Save/floor boundary | Gold lives in run state, absent from FLOOR_FIELDS. Existing tradeSnapshot captures it and Cancel can restore it | No floor schema or save/load implementation. Reject trading during gold grants; do not repair the known market prototype here |

`submitConsole` clears input on submission, preserves command history, and the key handler routes console Enter before world actions. A G1 command should follow that protocol. The existing `<n>` help syntax for addScrolls need not be renamed to add the new command. Public spelling remains **goldADD**; lower-case dispatch is an implementation detail.

## Diagnostic observations

[VM probes](probes.json) exercised town/dungeon × god mode off/on with 40 gold, using the existing fixture copied into `/tmp`. Each context submitted `goldADD 250`, `GOLDADD 0003`, and `goldadd 10 extra` through actual console key dispatch. All twelve submissions returned **Unknown command**, kept HUD/gold at 40 and preserved semantic state (hero/gear/items/spells/world/visited/monsters/hazards/merchant/companion/portal/clocks/journal/god snapshot). RNG/sound sentinels were not triggered. `typeof addGold` is undefined; simulationBlocked is true with console open.

This proves absence and no-op fallback, **not a passing goldADD implementation**. No local function was added to simulate the future feature.

Discovery-check detail: inspect the startup/help response itself, or clear output before checking. A broad `/goldadd/i` search over the whole console can match an echoed unknown command and falsely report help support. The recorded probe checks only the help response's final line; it correctly reports false. G1's tests/browser acceptance should do the same.

## Checks run

- Existing focused debug/travel suite: **14/14 pass**, 0 fail ([output](focused-tests.txt)). Pattern: `T1 |T2 |teleportTown|addScrolls|console help lists`.
- Syntax: all three copied runtime scripts pass `node --check`.
- Four VM diagnostic contexts / twelve unknown-command submissions pass the absence/no-mutation assertions above.
- Runtime and game-test SHA-256 hashes match the recorded C3 candidate. Its 224/224 full game / 27 preview counts remain the historical acceptance baseline; **full/preview/bake/smoke/browser suites were not rerun for this read-only review**.
- Protected runtime/test/art/HTML/CSS/player/developer-doc files remain byte-identical during G0; see [before](protected-before.json) and [final comparison](protected-file-check.json). Planning/review/tasks/handover are the only edits from this task.

The probe reuses the fixture prefix from the copied `tests/game.test.cjs`, initializes 40 gold/37 HP/7 MP, enables/disables god mode, then opens console before injecting throw-on-RNG/sound sentinels. It compares semantic state with Set-aware serialization, excluding only console UI/history metadata. Copies/scripts remain under `/tmp/dungeon-g0-review`; they are not runtime dependencies or repository regressions.

## G1 implementation checklist

1. Add a small strict helper (suggested `addGold(...args)`) and lower-case `goldadd` dispatcher branch forwarding all arguments. Keep public spelling `goldADD <amount>`.
2. Cover valid town/dungeon and god mode; console-open success; exact 40+250=290 and leading-zero cases; safe maximum, overflow and invalid current balance; wrong types/forms/arity; full blocked context matrix. For success compare before/after excluding only gold/console metadata; for rejections compare the whole semantic snapshot. Count render/apply calls once and assert no RNG/sound/journal/stock/save changes.
3. Add startup/help/developer documentation and verify real discovery response, HUD and native console Enter on desktop/touch-emulated mobile file://. Preserve T1/T2/C1–C3 and source art. Do not implement save/load or the cart.
4. Run the plan's syntax/focused/full/preview/non-writing bake/external smoke/browser checks; record actual results and limitations. Update tasks/master/handover with G1 status, leaving other queues and native visibility claims separate.

**No blocking design question found.** The reviewed plan is sufficient for a bounded G1 request. G1 is still pending; REVIEW/S0 save/load and market M1–M3 are independent. **GR-09 native background-tab/minimize remains unverified.** No version/commit/release action.
