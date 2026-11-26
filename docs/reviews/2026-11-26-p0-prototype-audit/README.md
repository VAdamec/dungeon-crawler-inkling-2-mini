# REVIEW/P0 — current gameplay prototypes

2026-11-26. **P0 complete; implementation phases remain open.** Audited current unreleased prototypes against the companion, travel and canonical market plans. This review changes documentation/evidence only; no runtime, source art, player documentation or repository tests were edited by this task. Existing user edits/staging were preserved. No git/release action.

## Snapshot and evidence limits

The working tree is active. Copied the three runtime scripts, HTML/CSS and behavioral tests to `/tmp/dungeon-p0-audit-20261126` before execution; [snapshot hashes](snapshot-hashes.json) identify that revision. Runtime/HTML/CSS still matched the snapshot when checked after the probes. Another process changed the Pip assertion during review; both test runs are distinguished below. Findings refer to the hashed runtime, not a promise about future edits.

Read the [master contract](../../plans/implementation-plan.md), [companion plan](../../plans/companion-selection-plan.md), [travel/debug plan](../../plans/teleportation-scenarios-plan.md) and [canonical cart design](../../plans/2026-11-26-market-transactions-design.md). The concurrent `market-menu-plan.md` live-mutation proposal conflicts with the user's explicit cart decision and is not the transaction authority.

## Phase readiness

| Phase | Observed prototype | Remaining work / status |
| --- | --- | --- |
| P0 | Source/test inventory, guarded-path audit, focused tests and diagnostic probes | Complete for the recorded snapshot; no implementation authorized |
| T1 | `teleportTown`, existing save/enterTown/return path, cheat reason/log and open-portal rejection | Partial. Strict zero arity, hidden/player-menu exclusions and invariant/blocked-return/J coverage missing |
| T2 | `addScrolls`, console startup/help strings and basic invalid-input tests | Partial. Safe decimal/total validation, exact arity, eligibility and developer guide missing. Travel plan's T3 discovery/tests are acceptance work within T1/T2, not a separate master phase |
| C1 | Eleven registry entries, starters/unlocks, `makeCompanion`, generalized join and boss adoption | Partial. Reset/entry latch, correct roles, duplicate-starter lifecycle and targeting/quote details incomplete |
| C2 | Launch cards, town landmark, roster rendering, locked Choose buttons, Esc/Tab handling | Partial. Post art, launch arrows, range/session validation, fixed modal styling, focus/inert handling incomplete |
| C3 | Existing travel placement and baseline companion tests retained | Not accepted. Cross-modal, restart/death/ending, stale callback and browser coverage incomplete |
| M1 | Live operations plus partial snapshot restore | Conflicts with chosen design. No isolated reducer/cart, Undo/Reset, pure preview or complete operation journal |
| M2 | Buy/Sell rows and Confirm/Cancel buttons, existing price formulas | Partial UI only. Confirm does not apply a cart; buys/sales already happened. Stable session rows/context validation and nearby town access missing |
| M3 | Some `state.trade` guards and one fallback test | Not accepted. Focus/layout/clock/teardown/persistence/mobile evidence and meaningful cart tests absent |

No feature phase can be closed by the focused test result alone.

## Findings requiring implementation

### 1. Trading violates Confirm/Cancel and corrupts cancelled state — high priority

Evidence: `js/game.js:2207` (`tradeSnapshot`), `:2266` (`closeTrade`), `:2311` (`tradeBuy`), `:2330` (`tradeSell`). Buy/Sell directly change gold, stock, gear, potions, scrolls and spells; notices/bubbles can fire immediately. Confirm merely closes. Cancel restores a subset and logs another message. There is no pure cart, Undo or Reset.

[Diagnostic probes](probes.json) reproduced:

- Equipped ring at HP/max HP **75/80** → sell → Cancel: ring is restored but HP/max HP remains **60/60**.
- Buy Frostbolt → Cancel: gold and stock return but Frostbolt remains learned. `learnSpell` also updates readiness, which the snapshot omits.

Stock is live merchant state shared with floor/town saves; staging mutates those aliases. `closeTrade(false)` restores equipment by assignment, bypassing `equipItem` health effects. `tradeBuy` removes an already-known spellbook instead of leaving it disabled. The fallback `buyFromMerchant`/`sellToMerchant` paths still perform immediate first-item/sell-all transactions. The new fallback test explicitly protects those shortcuts; replace its interaction expectations when implementing M1/M2, retaining economic/persistence assertions.

Implement the planned isolated draft and once-only validated commit; extending the rollback snapshot alone does not satisfy the user's cart decision.

### 2. Player menu lifecycle is incomplete — high priority

Evidence: `openCompanionBoard`/`selectCompanion` (`js/game.js:2216`, `:2242`), `openTrade`/`closeTrade` (`:2252`, `:2266`), keydown (`:3863`), `motionPlayable` (`:1171`), `openHelp`/`openConsole` (`:3788`, `:3666`).

- Roster state lives only in DOM visibility, not an identity-bound `state.companionPicker`. `selectCompanion` accepts unlocked town choices without checking an open session, board range, current modal or callback identity. A direct stale Choose call changed the active companion with the board closed.
- Trade callbacks use current `state.trade` and numeric live-stock indices, so an old button can address a new session/row. No immutable merchant/run/map identity check precedes Confirm.
- `newGame`, `enterTown`, `enterFloor`, `loadLevel`, death and ending do not consistently dismiss both overlays and discard pending sessions. `newGame` sets `trade=null` without hiding the new trade/roster DOM. Forced transitions cannot be treated as safe cancellation.
- `motionPlayable()` ignores both player menus; the shop probe returned true. Town/hazard code contains some DOM roster checks, but this is not a complete freeze contract. Do not claim all simulation continues: existing `townTick` and dungeon trade guards do stop their covered paths.
- Help/console opening reject trade, but not the roster. `?` and console routing happen before roster handling; Help stacked over a visible roster in a probe. M and R are swallowed by both menu branches before their normal handlers. Existing Tab loops are useful but not full focus isolation/inert handling.
- Only `#helpOverlay` has fixed backdrop positioning in CSS; new IDs have dialog contents but no equivalent fixed overlay shell. Mobile/layout/input acceptance needs an actual browser check. No browser outcome is asserted here.

### 3. Companion run/entry and town actor lifecycle is incomplete — high priority

Evidence: registry (`js/game.js:60`), join (`:244`), reset (`:374`), town interaction (`:886`), floor entry (`:2123`), selection (`:2242`).

- `newGame` carries `selectedCompanion`/`companionChoice` from the previous run while resetting unlocks. Probe: reset with Mimic selected leaves **selected=mimic, unlocked=[marmalade,pip]**. This violates the default starter rule and can feed a locked boss into the generalized join path.
- No independent `companionEntryDone` exists. Pip still uses `entranceCat.recruited`; manual join does not set `entered`, and a later first-descent join returns early if already recruited. Repair compatibility latches and test manual/automatic paths.
- `townInteract` only dispatches manual recruitment for selected Marmalade, not Pip. `selectCompanion` does not synchronize hidden/restored town starter actors or clear the old motion/direction state. Switching to a starter through the board can leave a duplicate visible town animal.
- Cook/Bartender registry roles are still Orc/Skeleton. `drawCompanion` currently masks that with name-based dedicated art, so this is registry/migration debt rather than proof they visibly render as Orc/Skeleton.
- Pip has a sidekick label but `companionTalk` uses the boss pool for non-cat entries. `companionTick` picks the first visible non-cat target, not deterministic nearest as planned. Existing damage/cat preference paths are present; preserve them.
- Launch arrows still reach the general any-key `startGame` branch; no card-arrow selection exists. Post at `(34,26)` is walkable in the probe but hard-coded; full reachability/occupation/path and visual acceptance are unverified.
- Post role `noticeBoard` is absent from both legacy and prepared art (`SPRITES`/`artHas` false); no special code-drawn post painter found. Use the planned explicit marker, not an unresolved art name.
- Death/ending clear the actor/cat but leave new selection/unlock state; session/run teardown requires explicit coverage. Existing once-only retirement latch is present and town selection does not explicitly forbid reselecting Marmalade; those paths still need integration tests.

### 4. Debug commands accept invalid input and disallowed contexts — medium priority

Evidence: `teleportTown`, `addScrolls`, `submitConsole` (`js/game.js:3738–3781`).

- Dispatcher ignores extra tokens. Hidden `teleportTown extra` still reached town and opened a cheat portal in a probe. Helper lacks hidden/trade/roster checks; console itself must remain allowed.
- `addScrolls` accepts exponent/hex strings, unsafe integers, extra tokens and mutations after game over. Observed accepted inputs: `1e2`→100, `0x10`→16, `3 extra`→3, `9007199254740992`→unsafe total. Missing safe-result overflow and active-context checks.
- Core portal creation/return and both console help strings already exist; preserve them. `DOCUMENTATION.md` does not yet list these new commands.

### 5. Tests currently overstate UI readiness — medium priority

The Node stub does not implement real focus, CSS or `document.createElement`; `openTrade` falls back to immediate buying, and roster opening returns without constructing a dialog. Its `hidden:false` default also differs from initial HTML `hidden` attributes. Direct helper tests therefore do not prove actual dialog interactions. Improve fixtures meaningfully when implementing menus; do not weaken semantic assertions to make prototypes pass.

## Checks actually run

- Syntax: `node --check` on each of the three **snapshot** runtime scripts — pass.
- Focused existing tests selected with `--test-name-pattern='teleportTown|addScrolls|console help lists|trade menu buy|companion registry|Pip can|boss defeat unlocks'`.
- First snapshot run: **7 pass, 1 fail** ([output](focused-tests.txt)); failure was Pip's `hidden` value `undefined` compared strictly to `false`, after earlier auto-join assertions passed. This failure alone is not a gameplay defect.
- Another process corrected that assertion during this review; a second frozen test copy was rerun against the same runtime: **8 pass, 0 fail**. See [latest focused output](focused-tests-latest.txt) and [latest test hash](latest-test-hash.json). This review did not change repository tests.
- Nine temporary diagnostic scenarios reused the current VM harness in `/tmp`, normalizing initial overlay hidden attributes to the HTML state; no production functions were replaced. Their observations are in [probes.json](probes.json). These are diagnostic reproductions, not newly installed regression tests or browser acceptance. The Help probe reports `motionPlayable=false` after Help opens; that is Help's own freeze, not evidence the roster freezes motion.

No full game/preview/bake/smoke/performance/browser acceptance run was requested or performed for P0. No new art exists, and no new screenshots are claimed. **GR-09 native background-tab/minimize observation remains unverified.** Historical 181/27 release counts do not validate this prototype snapshot.

## Next bounded implementation

Proceed with **T1 only when implementation is requested**: harden debug portal arity/context checks, retain existing return/save behavior, add resource/return/hidden/modal regressions, and record evidence. Then T2 strict scroll parsing/discovery; C1–C3 companion lifecycle/modal work; M1–M3 pure cart and UI integration. Trading and shared modal defects are the highest acceptance risks; do not present the present trade UI as safe or completed while following that sequence.

No blocking product question remains for P0. The user's transaction choice is explicit; implementation should follow it without another cart/rollback design vote.

Documentation checks: 24 local links across the audit/master/earlier review resolve; scoped `git diff --check` passes. [Protected-file comparison](protected-file-check.json) distinguishes concurrent game/test edits since review start from this task's documentation writes. Final `game.js` still matched the frozen runtime snapshot; no claims are made about later concurrent changes.
