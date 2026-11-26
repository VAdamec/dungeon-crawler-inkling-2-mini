# Market / Buy-Sell Menu Plan

Status: **superseded historical proposal**. Use the [canonical isolated-cart design](2026-11-26-market-transactions-design.md), which rejects the live-mutation approach below. M1 pure core is complete ([evidence](../reviews/2026-11-26-m1-market/README.md)); M2 UI/confirmed commits are complete ([evidence](../reviews/2026-11-26-m2-market/README.md)); M3 integration/recovery is complete within [recorded acceptance](../reviews/2026-11-26-m3-market/README.md); native GR-09 remains unverified. Do not implement the historical snapshot-revert proposal.

## Goal
Replace immediate "buy first stock item / sell all gear" interactions with a selectable menu for town Store and dungeon Merchants, supporting buy and sell selections and mistake recovery before closing.

## Current behavior
- `pickup()` on merchant/store tile calls `buyFromMerchant()`; `X` calls `sellToMerchant()`.
- `buyFromMerchant()` buys `stock[0]` only; `sellToMerchant()` sells all equipped gear.
- Stock is shown as plain text in `#merchantStock`.
- Town Store stock persists in `state.town.store.stock`; dungeon merchant stock persists in floor merchant.

## Design
1. **Trade session state (transient, not floor-saved)**
   - `state.trade = { kind:'merchant'|'store', actor, snapshot, cart }` while open.
   - Snapshot includes deep-cloned `gold`, `inventory`, `townScrolls`, `equipment`, `actor.stock`, and `selectedCompanion`? No, not needed. Enough to restore player/trade actor stock.
   - `cart` records applied operations for display; actual state changes apply immediately to keep rendering simple, but `Cancel trade` restores snapshot fully.

2. **UI**
   - Add fixed modal `#tradeOverlay` outside `#wrap`, like help/dev console.
   - Sections: Buy (stock list with name, stats, price, Buy button), Sell (equipped weapon/armor/ring with sell price, Sell button), footer with gold, Confirm, Cancel/Revert.
   - Keyboard: Up/Down moves focus in active list, Tab cycles lists/buttons, Enter/Space activates, Esc cancels/reverts. Trap focus.
   - Mouse/touch: click buttons.

3. **Rules**
   - Buy uses existing price scale: `Math.round(item.gold * (1.5 + Math.max(0, state.depth - 1) * 0.03))` in dungeon, same formula in town unless specified; keep current behavior.
   - Sell price `Math.round(item.gold * 0.5)`.
   - Buying spellbook already known: reject with message, keep item.
   - Buying removes selected item from stock; selling adds nothing back to stock (current behavior) unless we want buyback - not required; revert handles mistakes.
   - Confirm closes overlay keeping current state. Cancel restores snapshot exactly (gold, inventory, townScrolls, equipment, stock, logs? logs can remain). Render after both.
   - While trade open, freeze simulation/timers like help; block movement/combat; allow audio controls? overlay blocks main.

4. **Integration**
   - `buyFromMerchant()`/`sellToMerchant()` become compatibility wrappers opening/applying? Better: `openTrade(kind)` opens menu; Space on merchant opens trade; `X` opens trade focused on sell. Keep old function names for tests if used, but tests currently call them directly - update/wrap.
   - `pickup()` on merchant/store calls `openTrade()`.

5. **Tests**
   - Opening trade shows stock and sellable gear.
   - Buy selected item deducts gold, removes from stock, grants item.
   - Sell selected equipped item grants gold, unequips slot.
   - Cancel reverts all changes made during session.
   - Confirm keeps changes.
   - Existing merchant/town store tests updated for menu flow where they directly call buy/sell helpers.

6. **Files**
   - `js/game.js`: trade state/helpers/open/close/render/buy/sell/cancel/confirm, key routing.
   - `index.html`: trade overlay markup.
   - `style.css`: overlay styling.
   - `tests/game.test.cjs`: trade menu tests; adjust direct buy/sell tests.