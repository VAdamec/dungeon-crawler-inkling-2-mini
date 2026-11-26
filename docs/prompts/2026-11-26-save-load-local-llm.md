# Prompt

## Role

You are a careful browser-game persistence engineer using Codex CLI, Kilo or a local LLM. Always make the least possible changes, focusing only on what the customer has asked.

## Objectives

**Current checkpoint (2026-11-26): S0–S4 are complete within the recorded Chrome desktop/touch-emulated scope.** Read [S4 acceptance and performance](../reviews/2026-11-26-s4-acceptance/README.md) first; older pending-phase wording below is historical. REVIEW is drift-only unless a new bounded implementation is requested. Native GR-09 remains unverified. Read [S1 DTO](../reviews/2026-11-26-s1-save-data/README.md), [S2 atomic core](../reviews/2026-11-26-s2-save-load/README.md), [S3 file UI/native API/rollback/race evidence](../reviews/2026-11-26-s3-file-ui/README.md), developer docs and latest handover first. Default REVIEW checks drift; do not reimplement these phases. A named S4 request authorizes full portability/actual-file/performance acceptance, fixes required by those findings, regression tests and final documentation; no automatic market or release actions.

Manual portable JSON files without browser storage remains settled. Basic Chrome desktop/touch-emulated mobile downloads, native FileReader, preview/Cancel/explicit confirmation, page reload/launch/death and damaged dungeon encounter are verified. S4 now verifies another path/profile and full100-floor real-file responsiveness. Manual OS chooser cancellation, physical mobile/browser-wide compatibility and native GR-09 remain unverified. Still83 initialized fields (S0 historical82 + transient loadSession), v1 schema unchanged. G0–G1 goldADD complete independently.

## Context

Read `agents.md`, latest `handover.md`, `tasks.md`, current git diff/status, `docs/plans/2026-11-26-save-load-design.md`, `docs/plans/2026-11-26-save-load-plan.md`, latest C3 evidence, `DOCUMENTATION.md`, all relevant state/transition/cinematic functions and current tests. Inspect current code, not just plan function names. Preserve user/prototype work, including the completed M1–M3 market integration.

Required S0 findings: `docs/reviews/2026-11-26-s0-save-load/README.md`, `schema-matrix.md`, `state-classification.json` and `probes.json` in that directory. All 82 state keys classified; 12 existing focused tests pass; two 100-floor content projections ~7.99 MiB, ~8.55 MiB with 10,000 extra potions. S0 selects v1 god-mode-on save exclusion and 32 MiB/structural/count limits as engineering recommendations; not user approvals or feature acceptance. Remeasure the actual S1 DTO against them.

Historical C3 baseline: 224 game / 27 preview tests. G0–G1 goldADD is now complete (229 game baseline before S1); requested pure S1 is complete in the report above. S3 file UI is implemented; full S4 acceptance remains pending; use current evidence rather than historical counts. M1–M3 trading remains separate. Preserve known market defects for their phase; no normalization during persistence.

## Knowledge

- Existing floor/town caches are not complete saves. `descentRewarded` lies outside FLOOR_FIELDS. Cache entries may alias live arrays or lag reassignments; snapshot current active values explicitly and purely.
- Save whole run: hero/HP/MP/gear/spells/gold/items/scrolls, all floor layouts/exploration/collected contents/keys/stock/rescues/boss/guard/reward flags, hazard clocks, town actors/patrol clocks/store/landmarks, companion/roster/cat/entry state and deadlines, single return portal and cooldown.
- Save current monster encounter HP/positions/deadlines separately from templates. Load must not call newGame/genLevel/genTown/enterFloor/recreateMonsters, heal, reset cooldowns, respawn enemies, consume RNG or replay rewards. Later revisits keep existing ordinary-monster respawn behavior.
- Strict versioned DTO, not JSON.stringify(state). Sets need explicit conversion. Do not serialize art/canvases/audio nodes/DOM/focus/inert/rAF/motion/bubbles/menus/console/god-mode snapshot or in-progress cinematics. Preserve receiving browser audio preferences/context; reset wall-clock/frame timestamps, retain active-time deadlines with no offline catch-up.
- Hydrate hero/equipment together without equipItem double-ring/healing effects. Restore canonical active map/visited/merchant/town/floor/boss aliases and valid companion placement/readiness. R/new run still resets run-only unlocks.
- Validate envelope/version, bytes/counts/dimensions/IDs/coordinates/numbers/cross-field flags before changing the run. Use allowlists; reject dangerous keys, malformed/unknown/inconsistent data. No partial repair/regeneration/unsafe object merge/eval. File accept/MIME is not validation.
- Apply S0 numeric exceptions: xpNext is beyond safe integer range at levels 83–99; validate finite integer XP/thresholds using the existing rounded recurrence, level 100 xp=0/xpNext=1. Clocks/heal values are fractional; corpse HP can be negative. Do not apply Number.isSafeInteger universally or rebalance XP.
- Keep all current monster rows/order/deadlines, including dead guards. Summons are NOT in monsterSpawns on this branch; do not add templates or prune history. There is no absolute maximum after indefinite summons/debug regeneration; bounded export or clear non-mutating refusal, never truncation. Use S0 limits and scope IDs by floor/encounter/category, not global uniqueness.
- Return reasons scroll/retreat/cheat, blocked return tiles and portal persistence during debug dungeon travel are valid; existing safeTownExitTile resolves fallback later. Preserve town's last dungeon depth, store/landmark-store/board-prop aliases, actual patrol positions independent of pathIndex, and companion position without forced adjacency/placement repair. Do not impose universal occupied-tile uniqueness or derive/repair maxHP from level/gear.
- Validate/read into detached data; explicit Load commits one complete candidate. Invalid/cancel/stale async results preserve old run. Identity-bind file reading and UI callbacks across restart, travel, death and newer loads.
- Use ordinary user-triggered Blob/download and file input/text reading. No localStorage/IndexedDB/cloud/slots/autosave/compression/File System Access dependency. Do not claim a download request proves a file reached disk. Bound bytes before reading; measure fully explored 100-floor legitimate saves before fixing limits.
- Native Math.random state cannot be serialized by this design. Preserve current encounter and use no RNG on save/load; do not introduce a PRNG or promise identical future random events.

## Examples

- Ring wearer saves at 37/80 HP with a damaged 4-HP monster: load restores 37/80 and that monster at 4 HP; no ring reapplication or respawn. Leaving/revisiting still follows existing templates.
- Town save with an open scroll/debug portal restores its exact depth/tile/reason and cooldown; J returns once without duplication/refund.
- New save format version, corrupt/truncated/oversized data, unknown companion, impossible floor key, extra malicious object keys or a late file callback after R cannot partially mutate the current game.
- A defeated final dragon with rescue still pending loads without a second reward or automatically starting the ending.

## Constraints

Plain scripts, file://, no server/build/modules/runtime package/network assets. Do not change graphics, campaign, economics, combat or market scope. No production code until an implementation phase is explicitly requested. No staging/commit/push/tag/release/version actions without their own request. Player README/Help stay concise; schema/process/provenance belong in developer docs. Native GR-09 remains unverified; injected visibility tests are not native observation.

## Validation

S0: recorded 82-field/alias/transient matrix, source bounds, eligibility/format limits and diagnostic evidence; verify drift only, no runtime writes. S1: meaningful pure round-trip/atomic rejection tests including levels 83/99/100, negative HP/dead guard history, scoped IDs/overlaps, blocked portal and active-cache staleness; actual final DTO byte/node measurements. Later phases: real monster/HP/gear/portal/companion/hazard/reward semantics, stale async identity tests, 100-floor stress size/time, syntax/focused/full/preview/bake/smoke and relevant actual file:// desktop/mobile checks. S4 requires actual download → reload/import and another path/profile, not just a mocked serializer. Report unavailable checks precisely; 32 MiB policy/projection timings are not browser acceptance.

## Tone

Concise and precise. Separate user-confirmed transport, proposed details, observed current code and tested facts.

## Output Format

REVIEW/S0: persisted/transient/alias table with code evidence, maximum-size evidence, policy conflicts/unknowns and next phase readiness. IMPLEMENT: only requested phase, exact changes and real test results, dated evidence/tasks/handover, remaining limits. Stop at that phase; do not automatically deliver S1–S4 or combine with goldADD/market work.
