# Implementation Plan for Next Iterations (Corrected)

This document tracks the next four items. The order follows review: correct the plans, extend teleportation/debug coverage, implement companion selection, then design the trading menu.

## Status

| Item | Status | Plan file |
| --- | --- | --- |
| Correct existing plans | Done in this iteration | `companion-selection-plan.md`, `teleportation-scenarios-plan.md`, this file |
| Extend teleportation/debug coverage | Next | `teleportation-scenarios-plan.md` |
| Implement companion selection | After teleportation/debug | `companion-selection-plan.md` |
| Design trading menu | After companion implementation | `trading-menu-design.md` |

Trading menu implementation is a separate follow-up after its design is reviewed.

## Phase 1 — Correct the plans

Completed:

- Companion selection/unlocks are run-wide state, never added to `FLOOR_FIELDS`.
- Companion plan now defines two starting choices (Marmalade and Pip), boss/themed unlocks, and town-only switching.
- Teleportation plan now preserves the single-portal rule and defines `teleportTown` as a free scroll-style debug portal.
- `addScrolls <count>` must validate a positive integer.
- Trading gets its own design instead of being folded into the companion plan.

## Phase 2 — Extend teleportation/debug coverage

Files: `js/game.js`, `tests/game.test.cjs`, optionally `index.html`.

- Add `teleportTown`: free scroll-style debug portal with `reason: 'cheat'`; refuses to overwrite an existing portal.
- Add `addScrolls <count>`: strict positive-integer validation.
- Update console help strings.
- Add only the new focused tests listed in `teleportation-scenarios-plan.md`; do not duplicate existing scroll/retreat/portal tests.
- Verify with syntax checks and the full Node test suite.

Success criteria:

- Single-portal rule holds for normal scrolls, retreat, and both new commands.
- Debug commands are easy to use from `~` and are covered by tests.
- No floor-save shape changes.

## Phase 3 — Implement companion selection

Files: `js/game.js`, `index.html`, `style.css`, `tests/game.test.cjs`.

- Add the `COMPANIONS` registry and sidekick line pool.
- Add run-wide `selectedCompanion` / `unlockedCompanions`; do not add them to `FLOOR_FIELDS`.
- Add launch picker for Marmalade and Pip.
- Add `joinSelectedCompanion()` / `makeCompanion(id, actor)` and update first-descent auto-join.
- Add town companion board and selection modal.
- Generalize `companionTick()` / `companionTalk()` to read behavior and line pool from the registry.
- Keep boss adoption, cat retirement, fog light, damage rules, and all existing tests intact.

Success criteria:

- Players can start with Marmalade or Pip.
- Boss/themed defeats unlock additional choices once.
- Switching happens only in town and never mutates floor data or hero stats.
- Death/ending/restart reset run-wide companion state.

## Phase 4 — Design trading menu

Files: `docs/plans/trading-menu-design.md` (design only in this phase), then implementation files in a later iteration.

- Produce the transactional buy/sell menu design with explicit undo/cancel/commit semantics.
- Define how equipment changes affect HP/maximum HP and bonuses.
- Reuse existing economy rules and keep legacy `buyFromMerchant()` / `sellToMerchant()` behavior for tests.
- No code changes in this phase unless the design is explicitly approved for implementation.

Success criteria:

- Design covers town Store and dungeon merchant.
- Undo/reset works before the menu closes; cancel discards all changes.
- Preview shows gold, stock, equipment bonuses, and projected HP.
- Tests are scoped and listed before implementation begins.

## Global constraints

- Plain scripts only; no modules, imports, bundler, or build step.
- Preserve `file://` behavior.
- Keep mutable game state in `state`; transient UI state stays out of floor saves.
- Do not stage or commit unless asked.
