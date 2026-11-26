# goldADD — developer-command plan

2026-11-26. G0/G1 are complete after their explicit requests; current readiness/manual acceptance is recorded in the [review](../reviews/2026-11-26-release-readiness/README.md). See the G1 checkpoint below for current results. Canonical command spelling: **`goldADD <amount>`**. [LLM prompt](../prompts/2026-11-26-goldadd-local-llm.md).

## G0 review result — 2026-11-26

**G0 complete; G1 ready when explicitly requested.** [Observed code/test matrix](../reviews/2026-11-26-g0-goldadd/README.md): helper/dispatch/discovery are missing; T2 validation/eligibility and existing HUD can be reused. 14 focused existing tests and four diagnostic contexts pass their baseline/absence checks; no gold runtime code exists. Guard against false-positive discovery assertions that match command echoes instead of the help response. No blocking design question. Native GR-09 remains unverified.

## Grounding and scope

Read `agents.md`, latest `handover.md`, `tasks.md`, `submitConsole`, `addScrolls`, `teleportTown`, `simulationBlocked`, HUD rendering and their tests. C3 baseline is 224 passing game / 27 preview tests; verify the current worktree rather than assuming those totals remain current. Existing prototypes/user changes must be preserved.

The command adds gold; it does not spend/replace/set it or grant other items. Case-insensitive dispatcher recognizes `goldADD` / `goldadd` / `GOLDADD`, preserving the user's public command name in docs/help. No new player button, market behavior, currency type, gold cap/balance or release change.

## G1 behavior

- Exactly one positive ASCII decimal integer token. `goldADD 250` adds 250 once; leading zeros are decimal. Reject missing/extra arguments, zero, negatives, signs, fractions/decimal-point notation, exponents, hex/binary, separators, NaN/Infinity and unsafe values.
- Require a nonnegative safe integer current `state.gold`, safe integer amount and resulting total <= `Number.MAX_SAFE_INTEGER`. Reject overflow/invalid state atomically; do not clamp or repair it silently.
- Require started living visible town/dungeon run; reject Help, console-conflicting player dialogs, health/retreat, trade/picker, boss intro/defeat, ending and gameOver. **Allow the developer console itself and god mode.** Do not call `simulationBlocked()` as the sole eligibility test: it deliberately blocks console-open simulation, which would make this command unusable. Mirror the T1/T2 debug eligibility policy or share a small explicit-policy helper with regression proof.
- Forward the complete parsed argument array so `goldADD 250 extra` cannot succeed. Suggested internal helper `addGold(...args)`; do not infer that it already exists.
- Success changes only `state.gold`, updates HUD once and prints added amount/new total in console. Invalid/blocked commands may update console input/history/output only. No gameplay log, sound, MP/HP, inventory, equipment, spell readiness, active time, retreat cooldown, portal, merchant stock, floor save/schema, RNG or generation changes.
- Developer console startup and `help` plus `DOCUMENTATION.md` list the command. Keep cheats out of player README/Help. No placeholder framework or broad command-parser rewrite.

## Bounded tasks

| Task | Deliverable |
| --- | --- |
| G0 REVIEW (complete) | Audit latest console helpers, shared guard policy and tests; report any conflict. No runtime writes. |
| G1 IMPLEMENT (complete 2026-11-26) | Strict helper/dispatch, regressions, developer discovery/docs, validation and tasks/handover/evidence. |

Regression families: valid town/dungeon and god mode; exact delta with semantic snapshots and unchanged RNG; zero/max-safe boundaries and overflow; all invalid forms/extra args/direct helper calls; hidden/dead/health/retreat/help/trade/picker/cinematic blocks; successful use with console open; startup/help/HUD; preservation of T1/T2 travel and C1–C3 behavior. Pending shop transactions must block the command to avoid stale pricing/commit state; do not implement the market cart here.

Verification: syntax all three runtime scripts, targeted tests then full `tests/game.test.cjs`, preview tests, non-writing bake, documented external smoke, actual `file://` desktop/mobile console sequence (`goldADD 250`, invalid extra argument, Help discovery, HUD). Record actual results, unavailable checks and no-RNG/no-side-effect snapshots. Keep native GR-09 **unverified** unless independently observed. No staging/commit/push/tag/version/release.

Definition of done for planning: proposed behavior/tasks/prompt recorded; not feature completion. Definition for later G1: requested implementation and checks pass, with current evidence and handover. Preserve existing artifact/source art and offline three-script load order.

## G1 implementation checkpoint — 2026-11-26

Explicit user request completed: strict addGold helper/dispatch, startup/help discovery, developer command documentation and five new regression groups. [G1 report and evidence](../reviews/2026-11-26-g1-goldadd/README.md): 229 full game / 19 focused / 27 preview tests pass. Syntax, non-writing bake, external SMOKE_OK and actual desktop/touch-emulated mobile file:// console/HUD checks pass. Exact safe boundaries, rejected contexts, gold-only semantic state, no RNG/audio and one-render success are covered. No market/save/load/art/player-help/release changes. Gold queue complete; native GR-09 remains unverified.
