# M1 — market economy and isolated draft core

2026-11-26. Explicitly requested M1 complete; M2/M3 remain pending. **Native GR-09 background-tab/minimize remains unverified.** Existing worktree/staging preserved; no commit, release/version, artwork or player-document changes.

## Source audit and phase boundary

[Canonical design](../../plans/2026-11-26-market-transactions-design.md) supersedes the immediate-mutation proposal. M1 is the shared pure calculations/draft/reducer/history phase. M2 owns selected-item UI and identity-bound, once-only validated atomic commit/persistence/notices; M3 owns remaining modal/recovery/mobile integration. Adding a model must not be mistaken for completing the player-facing market.

| Existing source | M1 change / remaining work |
| --- | --- |
| `tradePrice` / `tradeSellPrice` | Delegate to explicit-depth `buyPrice` / `sellPrice`; same current formula, including town's remembered depth |
| Equipment/effective stats / `equipItem` | Share pure `equipmentBonusFor`, `equipmentStatsFor`, `equipmentTransition`; preserve live object/item identity and god-mode freezing |
| `learnSpell` | Delegates its transition to `learnSpellState`; keeps live in-place knowledge/readiness update and one log |
| Potion / Town Scroll / Elixir | Draft stores potion, increments scrolls, refunds elixir base gold after payment; no autoheal/strength/dex boost |
| Existing `tradeSnapshot`, `tradeBuy`, `tradeSell`, `closeTrade` and UI | Untouched unaccepted live-mutation/partial-rollback prototype; ring/spell cancellation leaks remain M2 work |
| `buyFromMerchant` / `sellToMerchant` compatibility paths | Existing immediate first-buy/sell-all behavior still present; M2 must replace these entry paths, not retain them just for old tests |
| Save/load, floor/town aliases, art/script order | No state key/schema/transport/art change; draft is not attached to live state or persisted |

Only `js/game.js`, behavioral tests, developer/planning/task/handover records and this development evidence change in M1. HTML/CSS/player README/Help and all artwork/sprites remain byte-identical to the pre-M1 snapshot. [Before hashes](before-hashes.json) · [final checks](file-checks.json).

## Model API and invariants

- `createTradeDraft(source,merchant)` → frozen `{original,draft,rules,history}`. Explicit scoped data: gold, inventory, Town Scrolls, gear, hero frozen-stat fields/spells, readiness, this merchant's stock. No merchant/world/canvas/audio/DOM references. Original/rules/nested data are detached and frozen, without freezing source objects.
- Stock rows are `{rowId:'stock:<opening index>',item}`. IDs are local to this cart, stable after staging/Undo and never written to live/saved stock. Duplicate source IDs and names are separate units. M2 must still capture/check session identity across callbacks.
- `applyTradeAction(draft,{type:'buy',rowId}|{type:'sell',slot},rules)` → new frozen draft, or throws `Invalid trade: ...`. `stageTradeAction(cart,action)` appends the prior immutable draft to history only after acceptance. No failed/empty action enters the journal.
- `draft.operations` retains accepted buys/sales with item, row/slot, captured price and replaced gear for buys. Buy→sell is two retained operations; no implicit replacement sale, backpack, restocking or buyback. Sale proceeds fund only subsequent affordable purchases; no negative currency/loans.
- Undo restores the exact previous draft, including path-dependent HP clipping, spell readiness and accepted operation journal. Reset restores immutable original values/history regardless of action order. Discarding a model cart has no live effects; there is no M1 commit API.
- Same-bonus ring replacement does not heal. Ring removal at75/80 clips to60/60; rebuy produces80/80; Undo sale restores75/80 exactly. Low and level-derived HP cases and captured god-mode fields are covered. HP changes are not reconstructed from a final-only equipment diff.
- Known tomes reject without removing the row; newly learned draft spells are ready at captured active time. Elixir's actual gold-refund behavior is preserved honestly. Safe money/count/stat arithmetic rejects negatives, NaN/Infinity, unsafe results and overflow. High-level XP values remain finite numbers, without blanket safe-integer coercion.
- No logs, sounds, bubbles, RNG, render, save writes or global player/equipment/stock swaps occur during drafting. `state.trade` is unchanged. Source records are ordinary runtime data, not untrusted file DTOs; S1 still validates file input.

## Verification

- [10/10 M1 regression groups](m1-tests.txt), [28 existing merchant/ring/spell/god/mana groups](existing-focused.txt), [283/283 full game](game-tests.txt), [27/27 preview](preview-tests.txt).
- All10 new M1 groups fail against the pre-M1 runtime ([before result](before-regressions.txt)); its source is identified by before hashes. Original live-trade tests remain unchanged for the M1 model phase; M2 must intentionally migrate their UI assumptions.
- Regressions cover catalog/depth pricing and invalid money, deeply detached/frozen town/dungeon snapshots and source aliases, duplicate rows, selected-slot proceeds funding, all item types/known books, ring/level/god-mode HP, accepted notices/history, Undo/Reset and safe atomic failure. Semantic save DTOs and full relevant live snapshots remain equal through drafting; sentinels reject log/audio/RNG/render calls.
- [18 seeded comparisons](seeded-state.json) using3 seeds × town/gear/spells/scroll-return/retreat/god-mode scenarios match pre-M1 semantic state, effective stats and next8 RNG samples. [Development runner](check-seeded.cjs); source backup lives outside repo at `/tmp/dungeon-m1-before` and can be recreated from the recorded pre-M1 source.
- Actual `file://` Chrome1440×1000 and390×844 touch-emulated checks pass ([results](browser.json), [runner](check-browser.cjs)): staged pure cart sale/non-first tome/Undo/Reset, exact durable data/HUD/aliases, no live `trade` attachment; native Help open/close, mute after user interaction and connected depth1 town/dungeon stairs. Zero page/console errors or HTTP requests. Intervals stopped to isolate probes; no new market UI/Confirm or physical-mobile claim.
- Syntax allthree runtime scripts, tests and development runners; deterministic non-writing [bake](bake.txt); external [SMOKE_OK](smoke.txt); local Markdown links, protected-file hashes and whitespace checks in [final manifest](file-checks.json).

## Handoff

M2 must wrap this model in a run/map/area/depth/merchant/range/original-values-bound session; wire selected rows and Add/Undo/Reset/Confirm/Cancel, use text-safe details and honest gear replacement/elixir effects, remove the immediate destructive paths, validate the complete result before writes, apply equipment and final path-HP once, save the right town/floor merchant and emit only retained notices after success. Preserve the originating game on failure; test injected partial application failure. Closing a model draft does not authorize reusing the old rollback scheme. M3 follows separately; no automatic next phase or release action.

**Native GR-09 remains unverified.** This model/browser check does not observe native OS background/minimize, native chooser cancellation, physical mobile or other browser engines. Save/load's existing platform limits remain recorded in S4. Player Help/README stay unchanged until M2/M3 make the new flow playable.

## Reproduce

Use the host's working Node (`DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node`), `--test --test-name-pattern='M1 ' tests/game.test.cjs`, then full game/preview/syntax/non-writing bake and documented external smoke. Browser runner uses external `/opt/homebrew/lib/node_modules/playwright` and installed Chrome, with no game dependency or runtime build step. Seed comparison requires the pre-M1 backup at the documented temp path; it fails visibly if unavailable rather than inventing a baseline.
