# Teleportation — reviewed debug extension plan

Originally reviewed against 2.0.0 on 2026-11-26. **T1/T2 implemented after explicit requests**, including the shared discovery/tests below. Existing player travel remains intact. [Coordinated tasks](implementation-plan.md) · [LLM prompt](../prompts/2026-11-26-companions-travel-trading-local-llm.md).
> **Historical P0 prototype checkpoint:** the earlier concurrent live-mutation/partial prototypes were subsequently reviewed and corrected by T1/T2, C1–C3 and M1–M3. Their original baseline descriptions below are historical. Current scope/remaining manual checks: [release readiness](../reviews/2026-11-26-release-readiness/README.md). Preserve all worktree changes; do not restart completed queues.


## Current phase status — 2026-11-26

**T1 and T2 complete.** [T1 report](../reviews/2026-11-26-t1-debug-portal/README.md) and [T2 report](../reviews/2026-11-26-t2-add-scrolls/README.md). Strict command arity, safe decimal count/total and living/visible/player-menu checks are verified; existing save/return behavior is preserved. Developer discovery/docs and shared tests (the T3 section below) are covered within T1/T2. At the T2 checkpoint the full suite was193/199; C1 subsequently fixed those six companion/cinematic failures, and M3 now records307/307 passing. Focused travel/console 25/25 and preview 27/27 pass; native GR-09 remains unverified. No next travel/companion implementation phase remains.

## Preserve the existing player system

`useTownScroll()`, `returnThroughTownPortal()`, `enterDungeonFromTown()`, `safeTownExitTile()`, `clearTownReturn()` and `confirmRetreat()` already implement scroll loot/store inventory, J travel, one return point/portal, exact saved-floor return, blocked-tile fallback, retreat cooldown and lifecycle cleanup. Tests already cover these. This task does **not** add a second player teleportation system, free player teleport button, arbitrary floor selection or new portal UI.

Existing state is `townExit: {depth,x,y,reason}|null`, `townPortalOpen`, `townScrolls`, `retreatReadyAt`. Keep return state transient, never in `FLOOR_FIELDS`; active floors/town are saved through existing transition helpers. No healing, key/loot duplication, free descent rewards, regeneration or floor recreation during debug travel.

## T1 — `teleportTown`

Console-only free Town-Scroll-style debug portal:

- Exact command token `teleportTown`, case-insensitive dispatch; **zero arguments**. Invalid arity prints usage, without changing state.
- Requires started living dungeon run, visible page, no ending/boss cinematic/help/health/retreat/player menu. If already in town, report that and do nothing.
- **The developer console is expected to be open.** Do not copy `useTownScroll()`'s `consoleOpen` rejection into this command, or call that function as a shortcut: it would reject the command or charge a scroll.
- If a portal is already open, refuse without changing count or overwriting its original return point. Test this in a dungeon reached through console `loadLevel` while another portal remains open, as well as repeated use from town.
- Save `{depth,x,y,reason:'cheat'}` from the exact current logical tile, open the portal and call `enterTown()` through the existing save path. Keep HP/MP, scroll count, gold/inventory, companion selection/unlocks, active time and retreat deadline unchanged. Play the existing magic cue once and show clear console/journal debug feedback.
- J/Space at the town gate uses the same existing return functions and clears the two return fields once. Add only the `reason:'cheat'` log distinction to `enterDungeonFromTown()`; do not create a debug-only return implementation or bypass `safeTownExitTile()`.
- Normal retreat may close/replace the portal exactly as now; ordinary player travel/restart/death/ending semantics remain unchanged.

Reuse/extract a small shared portal-opening data/transition helper if it prevents duplication, with explicit normal versus debug eligibility/cost policies. Do not introduce a general travel framework for two commands.

## T2 — `addScrolls <count>`

Console-only inventory aid:

- Exactly one decimal positive-integer argument. Validate both text/arity and `Number.isSafeInteger(count)`; reject zero, negatives, fractions, empty/NaN/Infinity, exponent/hex shorthand and extra tokens. Reject addition when the resulting total exceeds `Number.MAX_SAFE_INTEGER`.
- Use a visible active run with no game over/ending/cinematic/help/health/retreat/player menu. Allow town or dungeon, and allow the console itself. No hidden-page mutation.
- On success increment `townScrolls` once, render the HUD/spell list, and report the new total in the console. No gold cost, portal creation, HP/MP change, RNG or new floor field. Do not add a broad teleport-event logging service.

## T3 — Discovery and focused tests (covered by completed T1/T2)

Update only developer console startup/help strings and `DOCUMENTATION.md`. **Do not put cheats in player README/Help.** Update compact player text only if an actual player-facing rule changes (none is proposed here).

Add focused coverage, reusing existing fixtures:

1. Valid debug travel saves exact depth/tile/reason, preserves HP/MP/progression/scroll count/cooldown/companion, saves the floor and reaches town.
2. Existing open portal and invalid command arity cannot overwrite state or consume resources.
3. Return via J and Space restores the saved floor/tile, resolves a blocked return safely and clears the portal once. Floors are loaded, not freshly generated.
4. Command works while consoleOpen, but rejects town travel, hidden/dead/ending/cinematic/health/retreat states and each player modal without semantic changes.
5. `addScrolls 3` updates inventory/HUD; invalid/safe-integer/overflow/extra-argument cases are atomic no-ops.
6. Both console help paths list both commands. Existing scroll purchase/loot, duplicate portal, retreat, death/ending/restart and persistence regressions still pass.
7. file:// sequence: `~`, `loadLevel 2`, `addScrolls 1`, `teleportTown`, close console, J at gate returns exactly. Check normal scroll consumption separately.

No version bump, release, staging or commit is part of this future implementation task unless requested separately.
