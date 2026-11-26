# T2 — safe addScrolls and developer discovery

2026-11-26. **T2 implemented and verified within its scope.** T1/T2 travel/debug work is complete. C1–C3 and M1–M3 remain open, including six existing companion/cinematic suite failures. No staging, commit, version change or release; branding stays 2.0.0.

## Changes

`addScrolls(...args)` requires exactly one string token containing only ASCII decimal digits, a positive safe integer count, a valid nonnegative safe integer current inventory, and a safe resulting total. The dispatcher forwards all tokens so `addScrolls 3 extra` can no longer silently add three. Signed values, fractions, decimal-point/exponent/hex/binary notation, separators, empty/NaN/Infinity, unsafe values and extra arguments are rejected. Leading zeros are decimal (`0003` adds three). Totals may reach but never exceed `Number.MAX_SAFE_INTEGER`.

Eligibility matches the hardened portal command: a started living visible run, with no Help, health/retreat pause, ending, boss intro/defeat, trade or companion session/visible menu. The console itself remains allowed. Success works in town and dungeon, including god mode, changes the scroll count once, updates HUD/spell list, and reports the new total. An existing portal and its return point remain untouched. If a portal is already open, its existing “Portal ready” label takes precedence over the scroll ability label.

No gameplay journal, sound, RNG, gold, HP/MP, gear, inventory items, readiness, rewards, floors, travel, active time or retreat cooldown changes occur. Invalid commands may update only console history/output/input as usual. Invalid current inventory is rejected rather than silently repaired. T1 and player Town Scroll/retreat behavior are unchanged.

Expanded [developer console documentation](../../../DOCUMENTATION.md#developer-console) with syntax, safe bounds, rejection/eligibility rules, portal behavior and a reproducible command sequence. Both existing console discovery strings already list the two commands; tests and actual browser checks verify startup and `help`. Player README and Help remain unchanged.

See [runtime delta](runtime-delta.patch), [test delta](tests-delta.patch), [developer-doc delta](developer-docs-delta.patch) and [file hashes](file-checks.json) against the actual starting worktree. Existing unreleased prototypes were preserved.

## Regression tests

Four new T2 test groups cover:

- Nineteen invalid console forms plus eight invalid direct-call signatures, with complete semantic before/after snapshots; no partial grants or stock/save changes.
- Exact safe-integer boundary, count overflow, resulting-total overflow and invalid current counts.
- Fourteen blocked states across town/dungeon, preserving semantic state and emitting no sound.
- Valid mixed-case/whitespace/leading-zero input in both areas with an existing portal and god mode: only scroll count changes; HUD/ability state updates; no RNG or audio.

Initial run reproduced input, overflow and eligibility bugs. Its fourth failure was a new test's incorrect expectation that an existing portal show the scroll-count ability label; corrected that expectation to preserve current Portal-ready behavior. No existing assertion was weakened, test disabled or unrelated behavior changed.

## Verification

| Check | Result |
| --- | --- |
| Focused T1/T2/scroll/retreat/discovery | **25/25 pass** ([output](focused-tests.txt)) |
| Full game suite | **193/199 pass, 6 existing failures**, ~115.9s ([output](full-tests.txt)) |
| Same six known failures on untouched pre-T2 source/tests | All six reproduce ([baseline output](baseline-failures.txt)) |
| Runtime scripts and game-test syntax | Pass |
| Prepared-source tests | **27/27 pass** ([output](preview-tests.txt)) |
| Non-writing bake | Pass ([output](bake.txt)); payload unchanged |
| External smoke | `SMOKE_OK` ([output](smoke.txt)) |
| Chrome normal `file://` | Pass at desktop 1440px and emulated mobile 390px widths; real launch/console/J keyboard input, strict forms, safe boundary, hidden/trade rejection, town/dungeon, HUD/discovery, existing portal preservation and ordinary scroll cost. No errors or remote requests ([evidence](browser.json)) |

Browser intervals are stopped after launch for deterministic checks. Hidden-page testing uses an explicit `document.hidden` fixture; **GR-09 native background-tab/minimize observation remains unverified**. No mobile-hardware, new performance, graphics or subjective audio acceptance claim. Browser automation used an existing external Playwright/Chrome installation outside the sandbox through tool approval; no dependency was added to the game.

The full-suite exception remains the six companion/cinematic tests carried from T1: themed identity in `defeated bosses become tiny companions…` / `the first boss kill retires…`, plus art-decoding failures in restart/ending and three GR-08 scenarios. Exact names and stacks are in the full/baseline logs. Keep them visible for C1–C3 rather than changing companion/art logic during T2. The P0 trading cancellation leaks also remain open.

## Reproduce

```sh
node --test --test-name-pattern='T1 |T2 |teleportTown|addScrolls|console help lists|Town Scroll|retreat' tests/game.test.cjs
node --test tests/game.test.cjs
node --check js/art-runtime.js
node --check js/sprites.js
node --check js/game.js
node --check tests/game.test.cjs
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
OX72_PLAYWRIGHT=/opt/homebrew/lib/node_modules/playwright node docs/reviews/2026-11-26-t2-add-scrolls/check-browser.cjs
```

On this machine use `/opt/homebrew/bin/node` with `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`; the external smoke path is recorded in `agents.md`. Pre-T2 source/tests were copied to `/tmp/dungeon-t2-before` for baseline checks. Those local copies are not runtime dependencies.

**Next bounded phase:** C1 companion registry/run-model corrections, including the baseline companion failures; then C2/C3 and market M1–M3. No later phase is authorized by T2 completion.
