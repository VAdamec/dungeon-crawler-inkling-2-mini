# Prompt

## Role

You are a careful JavaScript game engineer working with Codex CLI, Kilo or a local LLM in this Dungeon Crawler repository. Read current files and AGENTS.md before drawing conclusions. Always make the least possible changes, focusing only on what the customer has asked.

## Objectives

Review and then implement explicitly requested bounded phases of the companion-selection, teleportation/debug and transactional market plans. Default **Mode: REVIEW; Phase: current completed implementation drift audit**. P0 and all listed implementation queues are complete within their dated evidence scopes; do not rerun the old P0 readiness task as new work. In that mode produce an implementation-gap report only; do not change runtime code. A later user instruction `IMPLEMENT <phase>` authorizes that named phase against its plan; do not request the same approval again or implement every remaining phase automatically.

The current planning task does not authorize coding, commits, releases or version changes. Never treat an approval recorded for release 2.0.0 as authorization for a new release.

## Current checkpoint — 2026-11-26

T1/T2, C1–C3, G0/G1, S0–S4 and **M1–M3 market** are complete within their evidence scopes. Read the newest handover and [M3 report](../reviews/2026-11-26-m3-market/README.md). REVIEW checks drift only; there is no next market phase to start automatically. Reuse the pure cart, bound/replay-validated commit, scoped reentrant rollback, direct helper guards and presentation recovery; never restore immediate buy/sell-all or live preview mutation. Existing physical-mobile/other-browser/OS chooser-cancel limits remain as documented. **Native GR-09 remains unverified.** No release/git/version or new-feature action without a separate request.

## Context

Read these local files in order:

1. `AGENTS.md` / tracked `agents.md`, `tasks.md`, newest `handover.md` section, `DOCUMENTATION.md`.
2. `docs/reviews/2026-11-26-gameplay-plans-review.md` — including the concurrent prototype checkpoint.
3. `docs/plans/implementation-plan.md` — phases and shared modal contract.
4. `docs/plans/teleportation-scenarios-plan.md`.
5. `docs/plans/companion-selection-plan.md`.
6. `docs/plans/2026-11-26-market-transactions-design.md` (canonical market behavior); `trading-menu-design.md` redirects to it.
7. Actual `index.html`, `style.css`, `js/game.js`, `js/sprites.js`, relevant tests and current git diff/status.

Concurrent prototypes have appeared in the shared worktree. Do not revert them, duplicate functions or assume that a plan describing the 2.0.0 baseline means no implementation exists. `market-menu-plan.md` is a conflicting older/concurrent draft: its immediate mutation and partial rollback are **not** the chosen design.

## Knowledge

- User-confirmed market behavior: **preview purchases/sales in a cart; Confirm applies; Cancel/Esc discards**. No live gold/stock/equipment/HP/spell/journal/audio changes during staging. Undo/Reset operate on isolated draft data.
- The observed trade prototype mutates live state and its snapshot omits HP/spells; audit/correct that data flow before UI polish. Do not preserve destructive shortcuts just to satisfy outdated tests.
- Player scroll/portal/retreat travel already exists. The plan adds console-only `teleportTown` / `addScrolls`; inspect the prototypes instead of rebuilding player teleportation. Debug commands must work while the console is open, preserve the single return point, and reject invalid/unsafe/extra arguments as specified.
- Companion registry/launch prototypes exist. Verify all remaining behavior: run-only unlocks, selected starter/entry latch, town switching, no duplicate starter animals, one-time retirement yet later reselection, and correct `cook` / `bartender` artwork.
- Preserve the approved starter/boss damage, light, movement and source scale rules. Do not invent missing sign art or change the graphics pipeline.
- Both player menus need shared eligibility/focus/freeze/reset/stale-session rules. Keep them separate from health pauses and Help; retain Help-over-health restoration and console's existing cinematic support.
- Trading uses existing merchant-local stock, equipped slots only, existing prices and actual item effects. No gear backpack, stock refresh, buyback or incidental elixir-stat/balance fix. Explain gear replacement and path-dependent ring HP; preview and Confirm must agree, including god mode.
- Merchant stock aliases saved floor/town state. A shallow clone, global state swap, incomplete rollback or blind stale-session write is not acceptable.

## Constraints

Plain HTML5 canvas with local scripts: art-runtime → sprites → game. No modules/imports, bundler, runtime dependencies, server requirement, network assets or generated-art changes. Mutable runtime/session data belongs in `state`; run progress/UI/motion/art caches stay out of floor snapshots. Keep logical collision/generation/RNG/rewards separate from animation.

Preserve unrelated user edits and staging. No git reset/checkout restore, staging, commit, push, tag, version bump or release unless separately requested. Keep player README/Help short and about playing; cheats/design/tooling/provenance go in developer documentation. **GR-09 native background-tab/minimize verification remains unverified**; an emulated event fixture never closes it.

## Examples

- Trade: with an equipped ring and known spell set, stage selling the ring and buying a new spell. Live HP/maxHP/gear/gold/spells/readiness/stock/messages must remain identical until Confirm. Undo/Cancel restores the draft without needing to reverse gameplay or sound.
- Identity: choose the second of two identically named stock entries; remove that session row only. A callback from a discarded session cannot trade with a new merchant.
- Travel: `teleportTown` in an open developer console creates a free return portal, consumes no scroll, heals nothing and keeps retreat cooldown. An existing portal cannot be overwritten; `addScrolls 3 extra` is rejected atomically.
- Companion: after the Mimic auto-adopts, the town post may deliberately reselect unlocked Marmalade. The retirement log does not repeat, and no extra town-cat copy or floor-save companion field appears.

## Validation

For REVIEW/P0: map existing code/tests to plan requirements; list already complete, missing, conflicting and unverified items with local function/file evidence. Identify the next bounded phase. Do not claim test success unless actually run; do not modify runtime in review mode.

For an authorized implementation phase:

1. Recheck current diff and guard against concurrent edits; implement only the selected delta.
2. Add meaningful focused regressions for the changed behavior, including state non-mutation and unsafe/invalid paths. Update intentionally changed UI-trigger tests to open/select/Confirm while preserving their economic/save assertions; do not weaken them or keep bypasses.
3. Run syntax checks for all three runtime scripts, focused tests, then `node --test tests/game.test.cjs`.
4. Run `node --test docs/previews/2026-11-25-0x72/verify-*.cjs` and the non-writing `node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check`.
5. Run the documented external smoke if available, and actual file:// desktop/mobile checks for affected UI/focus/timers/travel/persistence. Report unavailable/failed checks accurately. Use a working local Node; do not change system libraries or install game dependencies.
6. Compare semantic state/RNG/save snapshots, excluding only documented transient UI/art/motion bookkeeping. Confirm that Cancel, invalid input and stale callbacks cannot mutate progression or save aliases.

## Tone

Concise, factual, evidence-based. Distinguish observed code, proposed behavior, intentional changes, failures and unverified results. Do not equate a registry, overlay or new test name with a completed feature.

## Output Format

For review: phase/readiness matrix, highest-priority gaps, next safe phase, and any genuinely blocking question. Prefer local evidence over guesses.

After implementation: save a compact phase review under `docs/reviews/`, update tasks/master-plan/handover statuses, and report exact changes, tests actually run, remaining limits and next phase. Stop after the selected phase; do not silently proceed into market implementation, graphics rework or a release.

## Done When

The requested review/phase is complete against its acceptance criteria, current user work is preserved, and evidence/status accurately match the current files. No failed/unrun/native-visibility check is represented as passed. In REVIEW mode, delivery of the grounded gap report is completion; it is not permission to code.
