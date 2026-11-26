# Market menu — draft transactions and selected-item trading

Date: 2026-11-26. **User-confirmed behavior:** preview trades in a cart; Confirm applies them; Cancel/Esc discards them. M1 was subsequently explicitly requested and is complete: [core implementation and evidence](../reviews/2026-11-26-m1-market/README.md). M2 was subsequently requested and completed: [UI/confirmed-commit evidence](../reviews/2026-11-26-m2-market/README.md). M3 is now complete within its documented acceptance scope: [integration/recovery evidence](../reviews/2026-11-26-m3-market/README.md). Older planning-only wording records the original baseline; native GR-09 remains unverified. [Coordinated phases](implementation-plan.md) · [LLM prompt](../prompts/2026-11-26-companions-travel-trading-local-llm.md).
> **Historical P0 prototype checkpoint:** the earlier concurrent live-mutation/partial prototypes were subsequently reviewed and corrected by T1/T2, C1–C3 and M1–M3. Their original baseline descriptions below are historical. Current scope/remaining manual checks: [release readiness](../reviews/2026-11-26-release-readiness/README.md). Preserve all worktree changes; do not restart completed queues.


## Problem and alternatives

The released 2.0.0 baseline buys `stock[0]` on Space and sells all three equipped slots on X. A concurrent uncommitted prototype adds a menu but applies trades live; it does not meet the confirmed isolated-cart design. A mistake immediately changes gold, items and ring HP, with no menu undo.

| Approach | Advantages | Cost/risk / decision |
| --- | --- | --- |
| Isolated preview cart, explicit Confirm | Cancel has no gameplay effects; selected buys/sales fund each other; undo/reset are local | Moderate draft/reducer work; best fit for plain state/paused modals. **Chosen by user.** |
| Immediate trades with inverse rollback | HUD changes immediately | Must reverse HP clipping, spells, stock, journal, sounds and save aliases; high rollback risk. Rejected. |
| Separate confirmation for each item | Small UI change | Cannot undo a set of purchases before closing; repeated prompts. Does not meet the requested cart behavior. |

## Player flow

Space at a shop opens Buy; X opens Sell rather than selling immediately. Show two labeled lists with item icons/names, prices, short modifiers and an order summary. Each action says **Add purchase** or **Add sale**; equipment says **Buy & equip**. Click/Enter on an item row selects it; the explicit Add purchase/Add sale button or B/S stages it. Nothing is bought or sold until **Confirm trade**. Buttons: Undo last, Reset cart, Confirm trade, Cancel. Closing × and Esc always cancel; closing is never an implicit commit. The first implementation closes after a successful Confirm, so no post-confirm undo is promised.

- Buy any available stock row, including the second/last item; each row is one existing stock unit, not an unlimited quantity.
- Sell only selected **currently equipped** weapon/armor/ring, matching the game's existing ownership model. Potions, scrolls and unequipped gear are not a new sellable backpack.
- Purchasing gear still equips it. The old piece is not automatically sold or added to a new inventory: detail text must warn `Replaces Sword; sell it first to receive its sale value.` The player can Undo and sell first. Do not silently change replacement/economy rules.
- Draft sale proceeds may fund later purchases in the same cart. Validate affordability at each action against draft gold; no negative-gold draft or loan mechanic.
- Previously staged entries are visible, individually understandable and removable through Undo; Reset returns to the original state. No failed action enters history.
- Disable known spellbooks with an `Already learned` explanation; never remove a known book merely by selecting it. This intentionally improves the old known-book branch, which discarded the first book.
- Keep Help/player README concise: one sentence about choosing purchases/sales and Confirm/Cancel. Detailed workings remain in developer docs.

## Access and merchant identity

Current `townInteract()` offers nearby Store interaction but `buyFromMerchant()` ultimately checks exact `merchantAt()` coordinates. Remove that inconsistent no-op path deliberately:

- Town Store: allow the existing nearby interaction zone (`nearbyTile`, at most one tile), for both Space and X.
- Dungeon merchant: preserve the existing exact tile requirement, for both Space and X. Do not silently extend dungeon reach.
- One shared resolver provides the eligible merchant and validates it at open/confirm. No new shop locations, maps, stock refreshes or pricing tiers.

A session captures area, depth, active map identity, merchant object identity and original affected values. Stock item IDs are only merchant-local; `100` or `200` is not a global ownership key. Generate stable **session-local row IDs** on cloned entries, never by consuming gameplay RNG or writing IDs into source/live saved stock. Sell rows use slot identity. Duplicate names are separate units.

## Economy and item effects to preserve

Extract parameterized pure helpers and let existing wrappers delegate. Do not maintain separate price/stat rules for the menu and live functions.

- Buy: `round(item.gold * (1.5 + max(0, pricingDepth - 1) * 0.03))`.
- Sell: `round(item.gold * 0.5)`.
- Capture `pricingDepth = state.depth` when opening, including town's existing remembered depth. Do not invent a fixed town price or new resale spread in this task.
- Potion: append a stored potion, no automatic drinking. Scroll: increment `townScrolls`.
- Gear: existing slot assignment/bonuses, including ring HP rules below.
- Spellbook: learn only on Confirm and set the new spell's readiness to the current active time, matching `learnSpell()`; no learning/log/cooldown mutation while previewing.
- **Elixir audit finding:** current merchant/pickup code credits `item.gold` after payment, rather than applying the strength/dexterity effect suggested by older prose. Preserve this actual behavior for this feature and label its effect honestly. Changing elixir balance is a separate task, not an incidental market fix.
- No new loot weights, stock contents, level scaling, combat formulas or merchant restocking. Sold items do not appear as new buy stock in this scope.

## Data model and pure draft operations

Use transient `state.trade = null | session`; keep the overlay/session out of `FLOOR_FIELDS`, saved town data, actor templates and player progression. Store immutable original affected data, an isolated working draft and ordered accepted operations. Snapshot arrays/items/spells so nested references do not alias the live world or `state.floors[depth].merchant` / `state.town.store`.

Affected values: gold, inventory, townScrolls, player HP/maxHP/spells and spell readiness, equipment and this merchant's stock. Read base player attributes and god-mode snapshot for accurate preview; do not copy or overwrite unrelated player progression, floor contents, companion unlocks, time or return portal fields.

`applyTradeAction(draft, action, rules)` returns a new draft or a validation error. Use pure helpers such as `buyPrice(item,depth)`, `sellPrice(item)`, `equipmentBonusFor(equipment,stat)` and `equipDraft(...)`; existing global helpers can wrap them. **Never temporarily swap `state.player`, `state.equipment`, live stock or DOM HUD values to compute a preview.** Icons/details render into their own dialog elements.

Ring changes must match `equipItem()` exactly:

1. Compute the old/new equipment max-HP bonus and its delta.
2. `maxHp += delta`; `hp = min(maxHp, hp + max(0, delta))`.
3. Apply the existing frozen hero fields if god mode is on, so preview and commit agree.

A same-bonus replacement gives no additional heal. Removing a ring clips HP only when needed. Undo restores the prior HP exactly, including clipping; a final-only equipment diff cannot reconstruct all path-dependent HP changes. Preserve the computed final draft HP and validate maxHP against the equipment result. Do not add max-HP changes twice on Confirm.

Before each accepted action retain the prior draft and append its operation. Undo removes that operation and restores its prior draft; Reset restores original and clears operations. The original must remain available regardless of any history bound. No cloning the entire game/art cache, JSON-serializing Sets/maps/canvases or generating randomness.

## Confirm and cancellation

Confirm is an identity-bound, synchronous, once-only operation:

1. Verify `state.trade === session`, run is active, area/depth/map/merchant match, live affected data still equals the original, and all selected rows/prices/final numeric values remain valid. A stale or externally changed session cannot commit. Show a safe error and require reopen; never overwrite newer state.
2. If nothing remains staged, close without trading logs/sounds. Otherwise compute/validate the complete final result before live writes; disable duplicate Confirm.
3. Apply changed equipment through `equipItem()`; apply the final scoped gold/inventory/scroll/spell/stock and path-correct HP values exactly once, then `freezePlayerStats()`. Refactor pure spell transitions/deferred notices if needed; do not call logging/saving helpers while merely previewing or before validation succeeds.
4. Preserve merchant/town references correctly (`merchant.stock` updated on the resolved live merchant). Save the active floor or town using existing helpers after a successful commit.
5. Emit notices from the **remaining accepted operation journal**, not every click and not just the final equipment slots. For example, buy then sell a new ring is two real retained operations; an undone purchase produces no bought/learned/sold notice. Emit each learned-spell/purchase/sale sound/log once after successful state application.
6. `companionTalk('merchant')` fires only if confirmed purchases actually empty previously nonempty stock. Undo/reset/cancel cannot trigger it. Close and restore focus/clocks.

Cancellation is discard, not inverse gameplay actions. Cancel/Esc/×, death, ending, forced travel, loadLevel or restart discard pending operations with no gold/HP/stock/spell/journal/audio effects. Hidden tabs freeze and retain the draft; they do not confirm/cancel. Follow shared teardown guards. Validate before writes; if an unexpected helper failure occurs during application, restore only the captured affected values and report failure before emitting commit notices. Add a targeted partial-failure regression if commit helpers can throw.

`buyFromMerchant()` / `sellToMerchant()` names may remain as entry wrappers that open the relevant menu. Do **not** retain a player-accessible immediate-buy/sell-all bypass to keep old interaction tests green. Update tests whose UI trigger intentionally changes to open → select → Confirm, preserving their economic and persistence assertions.

## Modal, input and accessibility

Use fixed `#tradeOverlay` outside `#wrap`, consistent with existing dialogs. Two scrollable Buy/Sell lists plus details, projected gold and actual derived HP/attack/defense/strength/dexterity. No shop carousel artwork or new asset pipeline. Stack on mobile; keep summary/Confirm/Cancel reachable.

Prefer ordinary semantic item buttons and explicit selected state. If using `role=listbox`, implement its complete focus/selection semantics, not decorative ARIA alone. Disabled rows explain sold/pending/unaffordable/known/empty states. Error text uses a polite live region.

Tab/Shift-Tab trap enabled controls; arrows navigate lists; B/S stage the current row; U undoes, Shift+U resets. Enter activates the focused item/button, **not a global Confirm shortcut**. Esc/× cancels. M remains mute. `?`/`~` do not stack another overlay; close the player menu first. R may cancel and restart through the normal restart path. Keep audio controls and existing health/Help semantics intact.

Simulation, hazards, healing/mana, town patrols, companions, active-time cooldowns and animation freeze while open. Reset existing tick/animation/cinematic timestamps on close so there is no catch-up. Do not reuse `state.pause` for the cart or drop an underlying health dialog. The shared contract in the master plan applies to both player menus.

## Bounded implementation tasks

- **M1 — Economy/draft core (complete 2026-11-26):** source audit, pure shared price/equipment/spell helpers, isolated snapshots, reducer, operations, Undo/Reset. Tests prove no live mutations before Confirm.
- **M2 — Selected-item UI/commit (complete 2026-11-26):** town/dungeon eligibility, Buy/Sell entry paths, accessible lists/details, validated once-only commit and persistence. Update intentional old interaction tests rather than preserving destructive bypasses.
- **M3 — Integration/recovery (complete 2026-11-26):** clocks, focus/mobile, stale/forced teardown, god-mode preview, comp/portal interaction and file:// proof. Update concise player Help/guide only when implemented; retain GR-09 native visibility as unverified unless actually observed.

## Required regressions

1. Buy second/last/duplicate-name stock units by stable row identity; stock order and other items remain correct. Sell just the chosen slot; no sell-all action remains on X.
2. Live semantic snapshots (including nested floor/town stock references, HP, spell readiness, inventory, gold, messages) remain equal through staging/selection/failed action/Undo/Reset/Cancel; disposable UI/art caches are excluded explicitly.
3. Insufficient gold, empty/disabled/stale rows, negative/NaN/unsafe numeric results and duplicate Confirm cannot apply partial trades. Staged sale proceeds can fund a purchase.
4. Undo/reset recover potion/scroll/spell/gear/HP/maxHP/stock/gold; known books remain untouched. Buy → sell and sell → buy sequences log only surviving operations.
5. Ring scenarios: same bonus replacement, ring sold at full/low HP, sell then buy, Undo after clipping, existing level-up-derived HP, and god mode. Preview and committed values must agree exactly.
6. Confirm persists the correct merchant across floor/town revisits, with no regeneration/restocking; Cancel and a different merchant session cannot alter old stock. Forced restart/travel invalidates old listeners/session.
7. All current pauses and both player modals exclude each other, freeze all simulation/motion clocks and reset on close. Hidden draft is retained, not auto-committed. Help's health-dialog restoration remains unchanged.
8. file:// desktop/mobile: open town and dungeon menus, choose non-first purchase and one sale, Undo, Reset, Cancel, Confirm, reopen and revisit; keyboard-only focus, pointer buttons, contrast/scrolling, no overflow/errors/network requests.

No new runtime dependencies, graphics regeneration, release or git action without a separate instruction.

## M1 result — 2026-11-26

[Economy/draft core and verification](../reviews/2026-11-26-m1-market/README.md). Shared pure price/stat/gear/spell helpers now feed live wrappers and the detached immutable cart; stable local rows, accepted operation journal, selected-slot sales, safe numeric results and exact Undo/Reset preserve ring/god-mode HP and all current item effects. No live mutations, RNG, logs/audio or save writes during drafting. 283 full game /10 new M1 /27 preview pass; all10 new groups fail pre-M1. Syntax/bake/SMOKE_OK,18 seeded semantic/stat/RNG comparisons and actual desktop/touch-emulated file:// model/Help/audio/connected-stair checks pass. Still83 initialized state keys/v1 save format; no art/HTML/CSS/player docs/release/git changes.

**M1 complete; M2 next only when requested.** The current player trade prototype is deliberately not wired to the new model in this core phase, and its live-mutation/Cancel leaks and immediate-buy/sell-all paths remain unaccepted M2 work. M2 must add bound sessions, selected UI and validated once-only atomic commit/persistence/notices; M3 finishes lifecycle/mobile/recovery acceptance. Native GR-09 remains **unverified**.

## M2 result — 2026-11-26

[Selected-item UI, confirmed commits, rollback and browser evidence](../reviews/2026-11-26-m2-market/README.md). M1 is wired to a fixed accessible market with Buy/Sell entry, icons/details, selected rows, operation order/projected totals, Add/Undo/Reset and explicit Confirm/Cancel. Shared resolver preserves exact dungeon reach and fixes nearby Store reach. Session-captured callbacks and run/map/merchant/original-data checks plus reducer replay reject stale/forged commits; reentry guard/identity consumption prevents duplicates. Equipment/path-HP/spell/currency/stock application and active town/floor saving precede retained-operation notices; injected equipment/save/paint failures restore scoped values/cache aliases before notices. Immediate-buy/sell-all and live-preview rollback prototype removed; legacy economic/persistence tests now explicitly stage/Confirm.

296 full game /32 focused /27 preview pass;13 new M2 regression groups,18 ordinary seeded before/after state/stat/RNG matches, syntax/bake/SMOKE_OK. Real file:// Chrome desktop and touch-emulated mobile town/dungeon native keyboard/click/tap/Undo/Reset/Cancel/Confirm,520ms freeze, focus/audio/layout/revisit checks pass; screenshots inspected. Minimal player controls corrected; developer docs/tasks/prompt/handover updated. Still83 initialized state keys/v1 schema, same art/offline three scripts; no release/git action. **M2 complete; M3 next only on request. Native GR-09 remains unverified.**

## M3 result — 2026-11-26

[Integration/recovery audit, actual browser matrix, performance and regression evidence](../reviews/2026-11-26-m3-market/README.md). Fixed direct action helpers bypassing the open-market guard, closing-paint catch-up time and failed-render focus/modal ownership. Added identity-bound backdrop cleanup, optional audio recovery and scoped rollback before forced transitions inside equipment/save/paint hooks; stale commit work stops without affecting the newer run/world. Eleven new groups, five failing on pre-M3;307 full game /87 focused /27 preview pass, syntax/bake/SMOKE_OK and24 seeded state/stat/RNG comparisons match. Native file:// town/dungeon keyboard/click/tap plus desktop/touch/narrow/landscape recovery, portal/companion/cooldown/health-Help/restart checks pass, with controlled visibility explicitly distinguished from native GR-09. 10k/65,536-potion timings recorded; max throttled Confirm131.5ms, heartbeat140.5ms in sampled largest case, no unbounded/per-device guarantee. Player/developer docs, plans/prompt/tasks/handover updated; no new art/schema/dependency/balance/git/release action.

**M1–M3 complete within the recorded acceptance scope. Native GR-09 background-tab/minimize remains unverified.** Physical mobile/other-browser engines and S4 manual native chooser-cancel limitations remain unverified. Do not restart completed phases or infer another release/feature request.
