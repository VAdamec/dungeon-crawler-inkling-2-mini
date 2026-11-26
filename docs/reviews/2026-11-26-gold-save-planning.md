# Planning review — goldADD and portable save/load

2026-11-26. User requested tasks/plans/prompts, then chose **manual save/load JSON files without browser-storage dependence**. This is planning only for the two new features. C3 runtime fixes were separately authorized/completed in the same ongoing work; no gold/save runtime implementation was made.

## Decisions and findings

- Public command `goldADD <amount>`; propose the proven T2 strict decimal/arity/safe-total pattern, console-allowed eligibility and gold-only semantic delta. `simulationBlocked()` includes consoleOpen, so it cannot be copied as the command's whole guard. Keep cheats in developer docs.
- File-based save/load fits existing offline plain-script delivery. Browser slots are not part of the chosen transport. `localStorage` behavior on `file:` origins is undefined ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)); no guarantee or fallback dependency is introduced.
- Existing `saveFloor`/`saveTown` are aliasing in-run caches, not a persistent save format. `descentRewarded`, actual active monsters and global hero/companion/portal/timing state must be accounted for beyond FLOOR_FIELDS.
- Full state includes Sets, cached canvases, audio nodes, DOM/focus/session objects and identity-bound animation callbacks. Explicit export/hydration is required, with parser validation before any live-state replacement.
- Reusing normal travel/newGame on load would recreate monsters, reset clocks/state, consume RNG or replay effects. Ring equipment effects must not be applied twice. The plans require exact current encounter restoration while preserving ordinary respawn on later travel.
- Proposed detailed eligibility, god-mode save gating and maximum-byte budget are explicit review items, not decisions attributed to the user. User-confirmed portable-file transport is settled. Native Math.random continuation is not serialized; no PRNG rewrite proposed.

## Deliverables

- [Gold plan / G0–G1](../plans/2026-11-26-goldadd-plan.md) and [gold prompt](../prompts/2026-11-26-goldadd-local-llm.md).
- [Save design](../plans/2026-11-26-save-load-design.md), [S0–S4 phases](../plans/2026-11-26-save-load-plan.md), [save prompt](../prompts/2026-11-26-save-load-local-llm.md).
- Tasks/master plan/handover separate preparation from feature completion and retain original market work order. Prompts default to REVIEW; no code until the corresponding implementation phase is requested.

C3 final validation remains 224 game / 75 focused / 27 preview passing tests, plus its actual browser/seeded/smoke/bake evidence. These are historical baseline facts for future work, not tests of unimplemented gold/save features. Planning validation checks local links and source references; no additional game tests needed for prose. Native GR-09 remains unverified; no git/release/version action.
