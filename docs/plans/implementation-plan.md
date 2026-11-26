# Next gameplay iterations — coordinated task plan

Planning baseline reviewed 2026-11-26 against released 2.0.0; later explicit phase requests are recorded below. The user confirmed preview-cart trading: Confirm applies changes, Cancel/Esc discards them. The task list below is prepared for a local LLM; a later instruction to implement a named phase authorizes that phase, not unrelated features or release actions.
> **Historical P0 prototype checkpoint:** the earlier concurrent live-mutation/partial prototypes were subsequently reviewed and corrected by T1/T2, C1–C3 and M1–M3. Their original baseline descriptions below are historical. Current scope/remaining manual checks: [release readiness](../reviews/2026-11-26-release-readiness/README.md). Preserve all worktree changes; do not restart completed queues.


## Current readiness —2026-11-26

All named T/C/G/S/M implementation queues are complete within their evidence scopes. [Current technical package review](../reviews/2026-11-26-release-readiness/README.md) verifies the unreleased worktree as a clean five-file offline artifact; [manual acceptance](../reviews/2026-11-26-release-readiness/manual-acceptance.md) is still pending. **Native GR-09 remains unverified.** Older “next phase” statements below are dated checkpoints; no new implementation/commit/publication is inferred.

## Documents and readiness

| Feature | Current reality | Proposed next work | Plan |
| --- | --- | --- | --- |
| Teleportation | Player travel preserved; T1/T2 debug commands verified within scope | Travel and market queues complete; manual acceptance is separate | [Travel/debug plan](teleportation-scenarios-plan.md) |
| Companion selection | C1–C3 implemented and verified | Companion queue complete; native GR-09 separate | [Companion plan](companion-selection-plan.md) |
| Market | M1–M3 isolated cart, selected UI/confirmed commits and integration/recovery complete | Queue complete within recorded scope; native GR-09 remains separate | [Market design](2026-11-26-market-transactions-design.md) |

[Review findings](../reviews/2026-11-26-gameplay-plans-review.md) · [Copy-ready local LLM prompt](../prompts/2026-11-26-companions-travel-trading-local-llm.md). Old “plan ready” checkboxes and new function names do not prove implementation/verification. The concurrent `market-menu-plan.md` immediate-mutation proposal conflicts with the user-confirmed cart; treat it as a draft reference, not authority to apply trades live. The original planning request did not authorize runtime work; later explicit T1 and T2 requests authorized those phases. The later explicit C1 request authorized its corrections and six-failure repair; The subsequent C2 request authorized its picker/post UI and regressions. C3 was subsequently requested/completed; later feature phases still need their own request.

## C3 result — 2026-11-26

**C1–C3 complete within companion scope.** [C3 evidence](../reviews/2026-11-26-c3-integration/README.md): 224/224 game, 75 focused, 27 preview, syntax/bake/smoke, nine seeded state/RNG matches and desktop/mobile travel/lifecycle/eleven-role pixel secrecy pass. Fixed inconsistent helper guards and post-companion boss-kill tick continuation. Native GR-09 remains unverified. Original next phase is M1; separately requested gold/save plans are review-only until selected for implementation.

## C2 result — 2026-11-26

**C2 complete; C3 next when requested.** [Evidence/screenshots](../reviews/2026-11-26-c2-picker/README.md): 215/215 game tests, 56 focused, 13 Help/launch, 27 preview, syntax/bake/smoke and actual desktop/touch-emulated mobile file:// interactions pass. Launch/card/post/Space recruitment, accessible bounded picker, captured-session range/unlock/once-only selection, Keep/Cancel/focus/audio/restart and live modal freeze are verified. Nine seeded world/progression/RNG scenarios match. C3 broader integration, market M1–M3 and native GR-09 remain open; older checkpoints below are historical.

## C1 result — 2026-11-26

**C1 complete; all six previous companion/cinematic failures resolved.** [C1 evidence](../reviews/2026-11-26-c1-companions/README.md): eight regression groups, 207/207 full game tests, 48 focused, 27 preview, syntax/bake/smoke and actual file:// desktop/mobile-width boss/ending checks pass. Nine seeded world/progression/reward/RNG snapshots match. String-ID animation phases, themed identity, registry/run/entry/reset/activation and Pip behavior are corrected. **C2 next when requested**; C3, market M1–M3 and native GR-09 stay open. T1/T2/P0 matrices below are historical checkpoints.

## T2 result — 2026-11-26

**T1/T2 and their shared discovery/tests are complete; C1 is next when requested.** [T2 evidence](../reviews/2026-11-26-t2-add-scrolls/README.md): four regression groups; 25 focused tests, 27 preview tests, syntax/bake/smoke and desktop/mobile-width file:// checks pass. Expanded developer docs; player README/Help unchanged. Full suite **193/199**, same six companion/cinematic failures reproduced on pre-T2 source/tests. Keep those, market defects and native GR-09 open. Earlier P0/T1 matrices below are historical checkpoints.

## T1 result — 2026-11-26

**T1 implemented/verified; T2 is next when requested.** [Evidence](../reviews/2026-11-26-t1-debug-portal/README.md): 20 focused tests, 27 preview tests, syntax/bake/smoke and actual desktop/mobile file:// checks pass. Full suite is **189/195**; all six companion/cinematic failures also reproduce in pre-T1 source/tests and remain open for companion integration. T2/C1–C3/M1–M3 and native GR-09 are not closed by T1. The P0 matrix below is historical.

## P0 result — 2026-11-26

**Review complete; no implementation phase accepted.** [Snapshot audit/evidence](../reviews/2026-11-26-p0-prototype-audit/README.md): T1/T2/C1/C2 partial, C3 unaccepted, M1 conflicting, M2 partial UI, M3 unaccepted. Latest focused tests 8/8 do not cover the diagnosed ring/spell cancellation leaks or menu/browser contract. Next bounded implementation is T1 when requested. Preserve concurrent work, replace the live-mutation trade design in M1, and keep native GR-09 unverified.

## Shared contract — decide once, use in both player menus

Use flat helpers/state, not a new framework: `state.trade` and `state.companionPicker` are null or identity-bound sessions; a single `playerMenuOpen()` predicate can guard them. Neither enters `FLOOR_FIELDS`, town saves or actor templates. Existing Help/console and `state.pause` remain separate.

| Situation | Contract |
| --- | --- |
| Open roster/shop | Active visible run, correct location, no gameOver/ending/boss intro/defeat/health/retreat/help/console/other player menu |
| Open Help/console during player menu | Ignore until the player menu closes; do not stack overlays or lose its draft |
| Existing Help over health/retreat | Preserve exactly; this work must not break current modal restoration |
| Audio | M stays usable; never mutate audio preferences on menu close/reset |
| Input | Player menu owns movement/combat/interact keys; trap Tab/Shift-Tab, arrows/select as documented, Esc cancels. R cancels and follows existing new-run behavior without reopening launch branding |
| Simulation | Guard enemy/town/hazard/recovery/mana/companion/active-time/boss/animation advancement and normal player actions; opening a menu cannot advance or consume combat RNG |
| Hidden tab | Retain session/draft and freeze; no automatic confirmation. Reset timestamps on resume/close. **GR-09 native visibility remains unverified unless actually observed** |
| Confirm/select | Check exact current session identity and context before mutation; invalidate it before duplicate/stale callbacks can act |
| Death/ending/travel/loadLevel/restart | Discard sessions before switching context; never commit a pending cart. Active companion/run unlocks follow their own intended lifecycle, not UI teardown |
| Close | Restore prior valid focus or canvas; reset existing tick/motion/cinematic timestamps, preserve underlying pause state; no catch-up |

Audit guards/call sites explicitly: `enemyTick`, `townTick`, `hazardTick`, `recoveryTick`, `regenMana`, `companionTick`, `advanceActiveTime`, `motionPlayable`, player movement/attack/spell/pickup/travel entry points, Help/console opening, and forced lifecycle transitions. Do not merely block keyboard movement while monsters, passive recovery or native rAF continue behind a menu. Do not add timers to implement a pause. Keep developer console's existing cinematic use; only add the new player-menu exclusion.

Capture ordinary game/player/floor/merchant semantic snapshots excluding only disposable art/motion/UI metadata. A closed/cancelled preview may affect focus/timestamp bookkeeping; it must not alter HP, gold, stock, spell readiness, inventory, saved world state or progression. No deep-cloning `state.art`/DOM/canvases or global state swapping for previews.

## Bounded work order

Execute **one phase per LLM invocation** by default. Review current files/status first; another local LLM may have progressed. Do not reimplement completed work or change the scope to make a test pass.

| Phase | Depends on | Deliverable / acceptance | Main files |
| --- | --- | --- | --- |
| P0 | None | Inventory concurrent prototypes first; map each existing function/test to pass/gap/conflict, especially live-mutation trading. Review-only, no empty framework/scaffold | plans / review note |
| T1 (complete) | P0 | Console debug portal, one-return-point preservation, resource invariants, exact J/Space return | game.js, game tests |
| T2 (complete) | T1 | Strict safe `addScrolls`, console discovery/help, developer doc; invalid args/overflow atomic | game.js, game tests, DOCUMENTATION.md |
| C1 (complete) | P0/T2 | Registry, two starters, run selection/unlocks/entry latch; boss adoption/retirement idempotence, dedicated art | game.js, sprites.js, game tests |
| C2 (complete) | C1 | Accessible launch choice + town post/picker, default recruitment and cancel behavior, art marker/range visual proof | index.html, style.css, game.js, game tests |
| C3 (complete) | C2 | Companion/modal/portal lifecycle, no duplicate town starters, no stat/floor pollution, focused browser proof | game tests / evidence |
| M1 (complete) | C3 | Shared pure pricing/stats/item transitions; isolated cart, accepted operations, Undo/Reset, path-correct HP/god-mode preview | game.js, game tests |
| M2 (complete) | M1 | Buy/Sell lists + menu entry, selected rows, confirmed once-only commit/save; no immediate player bypass | index.html, style.css, game.js, game tests |
| M3 (complete) | M2 | Modal/clock/teardown/mobile/persistence/regression scenarios and concise player guide/Help updates | tests / browser evidence / docs |

The travel extension is small and provides useful debug setup for later UI checks. Companion menus establish the shared contract before trading's richer draft state. That sequencing is not permission to rewrite the portal system or broaden shop inventory/economy.

## Intentional versus forbidden behavior changes

Intentional: choose a starter/unlocked companion; replace first-item/sell-all input with a menu; allow town Store nearby Space/X consistently instead of its current nearby/exact-check mismatch; leave known spellbooks in stock disabled; explicit confirmation replaces immediate mutation.

Preserve: prices and item effects as actually coded, source artwork/anchors/scales except the explicitly proposed Pip scale, weighted generation/RNG, connected stairs/keys, floor loot persistence, boss rewards/guards/cinematics, single active companion/return portal, ring HP rules, modal/audio behavior, offline three-script load order and 2.0.0 branding. Elixir stat behavior, gear backpacks, new stock, marketplace NPCs, new graphics, cross-run unlocks and release/version changes are out of scope.

No promise to keep obsolete “Space immediately buys first item” assertions literally green. Update interaction setup to stage/Confirm while preserving their substantive price/item/save assertions; add regressions for the intentional change. Never retain a destructive shortcut solely for old tests.

## Verification and handoff per phase

- Syntax: `node --check js/art-runtime.js`, `node --check js/sprites.js`, `node --check js/game.js`.
- Targeted new regressions first, then `node --test tests/game.test.cjs`.
- `node --test docs/previews/2026-11-25-0x72/verify-*.cjs`; `node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check`. Existing assets should remain byte-identical; do not regenerate them without need.
- Existing external smoke uses all three scripts and prints `SMOKE_OK`; discover the documented local path. If unavailable, report not run rather than inventing success.
- Actual normal file:// desktop and 390px mobile viewport; real input/focus/dialog/return-state checks, zero unexpected errors or remote requests. Distinguish controlled hidden/event tests from native visibility observation.
- Record relevant before/after RNG/gameplay/save snapshots; only documented feature state may differ. Check default Marmalade path and existing scroll/retreat paths after every affected phase.

Save a compact phase review under `docs/reviews/` with changed files, actual tests/results, intentional differences, limitations and next phase. Update this table/tasks/handover with **implementation status**, not just a plan link. Do not mark future phases or the native GR-09 check complete. Keep player README/Help limited to how to play; internals/cheats/provenance belong in developer docs.

Baseline note: 2.0.0 previously passed 181 game and 27 preview tests; those are historical counts until rerun on a changed implementation. Use a working local Node; do not install game dependencies or modify system libraries to force commands through. No staging, commit, push, tag or release without a separate request for this new work.

## Added review queues — 2026-11-26

User requested plans/prompts, not implementation, for [goldADD](2026-11-26-goldadd-plan.md) (G0 review → G1 requested implementation) and [portable JSON save/load](2026-11-26-save-load-design.md) ([S0–S4 tasks](2026-11-26-save-load-plan.md)). Manual save files without browser-storage dependence were explicitly chosen. [Gold prompt](../prompts/2026-11-26-goldadd-local-llm.md) and [save prompt](../prompts/2026-11-26-save-load-local-llm.md) default to review only. These independent queues do not silently replace the original next M1 phase; ask which named implementation the user wants only when needed, not whether to reapprove settled storage choice. New features remain unimplemented.

### G0 checkpoint — 2026-11-26

[REVIEW/G0 complete](../reviews/2026-11-26-g0-goldadd/README.md): goldADD is absent, not a partially accepted feature. T2 pattern/HUD can support a bounded G1; 14 existing focused tests pass and twelve console submissions across town/dungeon/god-mode confirm the no-op unknown-command path. G1 is ready when requested, not authorized by G0. S0 and market phases remain pending; no runtime/test changes or new acceptance claim for missing features.

### S0 checkpoint — 2026-11-26

[REVIEW/S0 complete](../reviews/2026-11-26-s0-save-load/README.md): all 82 state fields classified with nested schema/alias rules; two 100-floor content/exploration projections ~7.99 MiB (~8.55 MiB with 10,000 extra potions). Retain bounded 32 MiB v1 format and explicit over-limit refusal: current dead guard history/debug accumulation has no finite lifetime maximum. Correct blanket safe-integer XP validation (levels 83–99 exceed the safe range), current-only guard persistence, blocked/debug return points, scoped IDs/overlaps, town identity and active-cache overlays. 12 existing focused tests and diagnostic assertions pass; runtime/tests unchanged. **S1 pure DTO/validation ready only when requested.** No save UI/loader or gold runtime changes; G1/market queues independent. Native GR-09 remains unverified; older pending-S0 wording above is historical.

### G1 checkpoint — 2026-11-26

[Requested G1 complete](../reviews/2026-11-26-g1-goldadd/README.md): goldADD strict additive command, console/help discovery, gold HUD, five regression groups and developer docs. 229 full game / 19 focused / 27 preview pass; syntax/bake/SMOKE_OK and actual desktop/touch-emulated mobile file:// acceptance pass. No RNG/sound/other gameplay changes. Gold queue complete. S0 is complete; S1 pure save-data/validation and market M1–M3 remain pending separate requests. Native GR-09 remains unverified; no git/release/version action.

### S1 checkpoint — 2026-11-26

[Requested S1 complete](../reviews/2026-11-26-s1-save-data/README.md): pure explicit version1 capture/serialize/parse/validate DTO APIs, bounded structural/schema validation and twelve regression groups for all S0 exceptions, cache overlays, encounter/guard order/HP, companions/ring/portal/hazards/once-only state. 241 full game /12 focused /27 preview pass; syntax/bake/SMOKE_OK and actual desktop/mobile-emulated file:// pure API checks pass. Final100-floor DTOs~7.99MiB/~1.46M nodes (~8.55MiB with10k potions); Node validation~2.5s, browser large-file responsiveness remains open. **No playable save/load:** S2 runtime hydration/atomic commit, S3 file UI and S4 actual portable-file acceptance remain pending separate requests. Gold G1 complete; market M1–M3 independent; native GR-09 unverified.

### S2 checkpoint — 2026-11-26

[Requested S2 complete](../reviews/2026-11-26-s2-save-load/README.md): pure complete candidate hydration, canonical Sets/aliases/current encounter and exact hero/gear/companion/portal/clocks; identity-bound transient loadSession freezes source play, handles cancellation/lifecycle/stale confirmations and zero-time forced discard. Atomic commit preserves receiving audio/art, fresh transients, first-paint warning latches and no rewards/RNG/reveal; injected paint failure restores same old state/canvas/HUD/Help/focus. 256 full game /15 focused /27 preview pass. Syntax/bake/SMOKE_OK and actual desktop/mobile-emulated file:// checks pass. **S3 file UI and S4 actual portable-file/browser-performance acceptance remain pending separate requests.** Gold complete, market independent, native GR-09 unverified; no release/git changes.

### S3 checkpoint — 2026-11-26

[Next-phase S3 complete](../reviews/2026-11-26-s3-file-ui/README.md): portable JSON Save/Load in Help and Load on launch/death, bounded FileReader plus preview/explicit confirmation, fresh file/read/session identities, same-file/cancel/focus/audio/error/race handling; Blob download with honest request feedback and scoped URL cleanup. 266 full game /12 focused /27 preview pass, syntax/bake/SMOKE_OK and actual desktop/mobile-emulated file:// file round trips/reload/damaged dungeon encounter pass; UI screenshots inspected. Native OS cancel only controlled-event tested. **S4 broad portability/path-profile/large-file performance/final player-doc acceptance pending**; native GR-09 unverified. Still83 state keys/v1 DTO, no art/market/release/git action.

## S4 acceptance checkpoint — 2026-11-26

[Portability, scheduling fix, regressions and measured limits](../reviews/2026-11-26-s4-acceptance/README.md). Twelve actual file scenarios travel both ways between fresh Chrome profiles and an independently copied game directory, with storage disabled, exact durable data/alias/resource checks and resumed gameplay assertions. Large100-floor/full-exploration+10k-potion file and exact32MiB input accepted; cooperative strict validation/hydration/export fixes long stalls while preserving v1/83 state keys/atomic rollback. Cancel/Esc/R stop real work without late commit/download. 273 full game /44 save /27 preview pass; syntax/bake/SMOKE_OK. Player README/guide, screenshots, credits, changelog/tasks/handover updated. Native GR-09, physical mobile/other-browser coverage and manual OS chooser cancellation remain unverified. Save queue complete; no automatic market/git/release action.

## M1 result — 2026-11-26

[Economy/draft core and verification](../reviews/2026-11-26-m1-market/README.md). Shared pure price/stat/gear/spell helpers now feed live wrappers and the detached immutable cart; stable local rows, accepted operation journal, selected-slot sales, safe numeric results and exact Undo/Reset preserve ring/god-mode HP and all current item effects. No live mutations, RNG, logs/audio or save writes during drafting. 283 full game /10 new M1 /27 preview pass; all10 new groups fail pre-M1. Syntax/bake/SMOKE_OK,18 seeded semantic/stat/RNG comparisons and actual desktop/touch-emulated file:// model/Help/audio/connected-stair checks pass. Still83 initialized state keys/v1 save format; no art/HTML/CSS/player docs/release/git changes.

**M1 complete; M2 next only when requested.** The current player trade prototype is deliberately not wired to the new model in this core phase, and its live-mutation/Cancel leaks and immediate-buy/sell-all paths remain unaccepted M2 work. M2 must add bound sessions, selected UI and validated once-only atomic commit/persistence/notices; M3 finishes lifecycle/mobile/recovery acceptance. Native GR-09 remains **unverified**.

## M2 result — 2026-11-26

[Selected-item UI, confirmed commits, rollback and browser evidence](../reviews/2026-11-26-m2-market/README.md). M1 is wired to a fixed accessible market with Buy/Sell entry, icons/details, selected rows, operation order/projected totals, Add/Undo/Reset and explicit Confirm/Cancel. Shared resolver preserves exact dungeon reach and fixes nearby Store reach. Session-captured callbacks and run/map/merchant/original-data checks plus reducer replay reject stale/forged commits; reentry guard/identity consumption prevents duplicates. Equipment/path-HP/spell/currency/stock application and active town/floor saving precede retained-operation notices; injected equipment/save/paint failures restore scoped values/cache aliases before notices. Immediate-buy/sell-all and live-preview rollback prototype removed; legacy economic/persistence tests now explicitly stage/Confirm.

296 full game /32 focused /27 preview pass;13 new M2 regression groups,18 ordinary seeded before/after state/stat/RNG matches, syntax/bake/SMOKE_OK. Real file:// Chrome desktop and touch-emulated mobile town/dungeon native keyboard/click/tap/Undo/Reset/Cancel/Confirm,520ms freeze, focus/audio/layout/revisit checks pass; screenshots inspected. Minimal player controls corrected; developer docs/tasks/prompt/handover updated. Still83 initialized state keys/v1 schema, same art/offline three scripts; no release/git action. **M2 complete; M3 next only on request. Native GR-09 remains unverified.**

## M3 result — 2026-11-26

[Integration/recovery audit, actual browser matrix, performance and regression evidence](../reviews/2026-11-26-m3-market/README.md). Fixed direct action helpers bypassing the open-market guard, closing-paint catch-up time and failed-render focus/modal ownership. Added identity-bound backdrop cleanup, optional audio recovery and scoped rollback before forced transitions inside equipment/save/paint hooks; stale commit work stops without affecting the newer run/world. Eleven new groups, five failing on pre-M3;307 full game /87 focused /27 preview pass, syntax/bake/SMOKE_OK and24 seeded state/stat/RNG comparisons match. Native file:// town/dungeon keyboard/click/tap plus desktop/touch/narrow/landscape recovery, portal/companion/cooldown/health-Help/restart checks pass, with controlled visibility explicitly distinguished from native GR-09. 10k/65,536-potion timings recorded; max throttled Confirm131.5ms, heartbeat140.5ms in sampled largest case, no unbounded/per-device guarantee. Player/developer docs, plans/prompt/tasks/handover updated; no new art/schema/dependency/balance/git/release action.

**M1–M3 complete within the recorded acceptance scope. Native GR-09 background-tab/minimize remains unverified.** Physical mobile/other-browser engines and S4 manual native chooser-cancel limitations remain unverified. Do not restart completed phases or infer another release/feature request.
