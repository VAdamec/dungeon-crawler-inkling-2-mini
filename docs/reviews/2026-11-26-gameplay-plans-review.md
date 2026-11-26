# Companion / travel / market planning review

**Follow-up:** [REVIEW/P0 prototype audit complete](2026-11-26-p0-prototype-audit/README.md). The observations below are the earlier planning checkpoint; use the newer hashed audit for readiness and test evidence.

2026-11-26, local 2.0.0 code inspected. This planning task writes documentation only. **Concurrent runtime/test edits appeared during the review**; they were not made or reverted by this task. Source/art/player-document hashes are checked and concurrent differences reported, not misrepresented as unchanged. User selected **isolated trade cart → Confirm applies / Cancel or Esc discards**.

## Findings addressed in the revised plans

| Finding in earlier drafts | Correction / boundary |
| --- | --- |
| Companion Cook/Bartender entries used Orc/Skeleton and an outfit rewrite | Dedicated prepared `cook` / `bartender` roles; preserve legacy compatibility only where still needed |
| Cat retirement used as an implicit selection ban; boss choice described as “rest of run” | Retirement is once-only story/auto-recruit state, while unlocked roster permits later deliberate reselection |
| Pip recruitment reused the cat latch/hidden actor without a full lifecycle | Separate first-entry latch, stable registry IDs, explicit duplicate-animal/selected-starter rules and R behavior |
| Town board assumed new art existed | Named missing-art boundary; small code-drawn post marker and visual check, no phantom runtime sprite |
| “Teleportation system” could imply redoing implemented player travel | Current scroll/portal/retreat behavior already covered; scope is two console-only additions |
| Debug portal might call the player helper while console is open | Explicit console-allowed debug path; player helper rejects console and consumes a scroll |
| addScrolls validated only integer conversion | Exact arity/decimal input, safe integer and total-overflow tests |
| Teleport/companion/trade drafts used incompatible overlay assumptions | One shared modal eligibility/freeze/focus/teardown contract, no new modal framework |
| Shop opening assumed one uniform range | Actual town nearby dispatch versus exact `merchantAt()` mismatch is documented; town nearby menu is intentional, dungeon exact access remains |
| Preserving legacy immediate buy/sell behavior for old tests bypassed the new cart | All player entry paths open the menu; update changed interaction tests while retaining economy/save assertions |
| Draft helpers might reuse global stat helpers by swapping live state | Pure parameterized helpers; deeply isolated affected values and immutable opening snapshot |
| Final equipment diff alone missed path-dependent ring HP and bought-then-sold items | Prior-draft Undo, final path-correct HP, retained operation journal, deferred once-only notices |
| Cart could alias saved merchant stock or stale session after travel | Session-local row identity, merchant/map/run checks, atomic once-only apply and forced discard |
| Spell learning / god mode preview missed readiness/frozen fields | Stage knowledge locally, commit readiness correctly, freeze preview and commit consistently |
| Elixir prose claimed stats that current code does not apply | Preserve the actual existing gold-credit branch for this scope; do not smuggle a balance fix into trading |

## Source anchors inspected

`js/game.js`: `newGame`, `FLOOR_FIELDS`, `joinEntranceCat`, `adoptBossCompanion`, `companionTick`, `drawCompanion`, `enterFloor`, `townInteract`, `saveTown`/`saveFloor`, `useTownScroll`, `returnThroughTownPortal`, `enterDungeonFromTown`, `merchantAt`, `buyFromMerchant`, `sellToMerchant`, `equipItem`, `equipmentBonus`, `learnSpell`, `openHelp`, `openConsole`, `submitConsole` and motion/simulation guards. Existing game tests already cover the baseline cat, boss, stock, ring and portal behaviors; the new plans specify deltas rather than claiming all tests are missing.

## Deliverables

- [Master phases and shared modal contract](../plans/implementation-plan.md).
- [Companion selection](../plans/companion-selection-plan.md).
- [Teleportation debug extension](../plans/teleportation-scenarios-plan.md).
- [Market cart design](../plans/2026-11-26-market-transactions-design.md), with the [previous trading entry point](../plans/trading-menu-design.md) redirected to it.
- [Local LLM prompt](../prompts/2026-11-26-companions-travel-trading-local-llm.md).

No game tests were rerun to validate prose. Local plan links, referenced runtime names and protected runtime/source/test hashes are checked. No staging, commit, release or version change. GR-09 native background-tab/minimize observation remains unverified; planning these features does not close it.

## Concurrent prototype checkpoint (not acceptance)

While the plans were being prepared, the working tree gained changes in `index.html`, `style.css`, `js/game.js` and `tests/game.test.cjs`, plus `docs/plans/market-menu-plan.md`. Do not overwrite those files from the released baseline or assume these observations remain the latest state.

- `COMPANIONS`, starter-choice code, `makeCompanion()` / `joinSelectedCompanion()` and some tests now exist. Cook/Bartender registry entries still use Orc/Skeleton at this checkpoint; the proposed registry corrects their direct roles. Town roster/post and all lifecycle paths require actual verification.
- `teleportTown()` / `addScrolls()` and console dispatch now exist. The observed `addScrolls()` uses `Number.isInteger`, and dispatch passes only `args[0]`; safe-total/strict text/extra-token handling still needs review. Player-menu and hidden-state exclusions need verification.
- `openTrade()` / `tradeBuy()` / `tradeSell()` / `closeTrade()` are a live-mutation prototype. `tradeBuy()` writes live gold/stock and calls potion/spell/log/audio helpers; `tradeSell()` changes live gear/HP. **This contradicts the user-confirmed preview cart.**
- `tradeSnapshot()` at this checkpoint omits HP/maxHP and spell knowledge/readiness. Cancel restores equipment directly rather than through the equipment transition, and does not reverse learned spells, ring HP changes or emitted notices. It is not a safe substitute for an isolated draft.
- The concurrent `market-menu-plan.md` explicitly recommends applying live changes and leaving logs on cancel. Keep it as a read-only concurrent draft until reconciled; the latest user decision and dated market design take precedence. No runtime fixes were made here.

P0 must reassess the latest code and preserve useful prototype work. For trading, change the data flow before polishing the menu: first prove that staging/cancelling leaves all live semantic values and save aliases unchanged. Existing function names or added test counts are not completion evidence. No runtime tests were run against this moving worktree as part of the planning-only review.

## Planning validation

Checked 24 local Markdown links across the seven revised/new plan, review and prompt documents: none broken. Scoped `git diff --check` passes for this documentation set, tasks and handover. The protected-file snapshot still matches `js/art-runtime.js`, `js/sprites.js`, README, CREDITS and DOCUMENTATION; HTML/CSS/game differences are concurrent work, not changes made by this planning task. Test-file status also changed during the review, so no acceptance inference is made from its current diff. Runtime suites and browser checks were not run for this documentation-only delivery.
