# Trading Menu Design

Status: design only. Implementation is a later iteration, after companion selection.

## Current behavior

- Space at a merchant/town Store calls `buyFromMerchant()`, which buys only `m.stock[0]`.
- `X` calls `sellToMerchant()`, which sells every equipped weapon/armor/ring at once.
- Buy price is `Math.round(item.gold * priceScale)` where `priceScale = 1.5 + Math.max(0, state.depth - 1) * 0.03`.
- Sell price is `Math.round(item.gold * 0.5)`.
- Potions and Town Scrolls are stored in `state.inventory` / `state.townScrolls`; spells are learned via `learnSpell()`.
- Gear is equipped through `equipItem()`, which is the only current source of ring maximum-HP adjustment and `freezePlayerStats()`.
- Merchant stock is saved: town Store stock in `state.town.store`, dungeon merchant stock through `saveFloor()` / `FLOOR_FIELDS`.
- `#merchantStock` is currently a plain text line in the equipment panel.

## Goals

1. Let the player choose which stock item to buy instead of always taking the first.
2. Let the player choose which equipped item to sell instead of selling all gear.
3. Preview price, gold, equipment bonuses, and projected HP before committing.
4. Permit undo of individual actions and reset of all pending actions until the menu closes.
5. Make canceling the menu leave the world completely unchanged.
6. Work identically for the town Store and dungeon merchants.
7. Preserve existing economy rules and legacy function behavior used by tests.

## UI

Add a fixed `#tradeOverlay` outside `#wrap`, alongside `#helpOverlay` and `#devConsole`.

Structure:

```html
<div id="tradeOverlay" role="dialog" aria-modal="true" aria-labelledby="tradeTitle" hidden>
  <section class="trade-dialog">
    <header>
      <h2 id="tradeTitle">Store</h2>
      <p>Gold: <b id="tradeGold"></b></p>
      <button id="tradeCancelX" type="button" aria-label="Cancel trade">×</button>
    </header>
    <div class="trade-columns">
      <section>
        <h3>Buy</h3>
        <div id="tradeBuyList" role="listbox"></div>
      </section>
      <section>
        <h3>Sell</h3>
        <div id="tradeSellList" role="listbox"></div>
      </section>
    </div>
    <aside id="tradeDetail"></aside>
    <p id="tradeStats"></p>
    <p id="tradeMessage" aria-live="polite"></p>
    <footer>
      <button id="tradeBuy" type="button">Buy selected (B)</button>
      <button id="tradeSell" type="button">Sell selected (S)</button>
      <button id="tradeUndo" type="button">Undo (U)</button>
      <button id="tradeReset" type="button">Reset all (Shift+U)</button>
      <button id="tradeConfirm" type="button">Confirm trade</button>
      <button id="tradeCancel" type="button">Cancel (Esc)</button>
    </footer>
  </section>
</div>
```

- Buy rows show item name, kind, price, and short effect/bonus summary. Known spellbooks are shown disabled with `Already known`; selecting them does nothing.
- Sell rows show the three equipment slots and their items; empty slots are disabled.
- `#tradeDetail` explains the selected row. `#tradeStats` shows projected gold, max HP, HP, strength, attack, defense, and dexterity from the draft.
- Live HUD/equipment stays unchanged until Confirm; the modal preview is the only place draft changes appear.

## Transient state

```js
state.trade = {
  open: false,
  merchant: null,
  mode: 'buy',           // 'buy' or 'sell'
  focusIndex: 0,
  draft: null,
  history: [],           // prior draft snapshots, newest last, capped (e.g. 50)
  original: null,
  message: '',
};
```

- `state.trade` is transient. Never add it to `FLOOR_FIELDS` or town saved state.
- Reset it in `newGame()`, on travel, death, ending, and any overlay teardown that already clears help/console state.

Draft shape:

```js
{
  gold,
  hp,
  maxHp,
  inventory,      // cloned
  townScrolls,
  spells,         // cloned
  equipment,      // cloned weapon/armor/ring
  stock,          // cloned merchant stock
}
```

## Opening and closing

- `openTrade(mode)` is allowed when the player is adjacent to `state.merchant` and there is no gameOver, ending, boss cinematic, health/retreat pause, help, console, or already-open trade.
- `pickup()` / `townInteract()` at a merchant call `openTrade('buy')` instead of `buyFromMerchant()`.
- `X` calls `openTrade('sell')` instead of `sellToMerchant()`.
- While open:
  - movement and all normal key actions are blocked;
  - `enemyTick()`, `townTick()`, `hazardTick()`, `recoveryTick()`, `regenMana()`, companion attacks, boss timers, active-time advancement, and motion frames freeze;
  - reset `state.lastTick` and animation timestamps on close to prevent catch-up;
  - `?` and `~` are ignored until the trade dialog closes, so there is only one modal layer.
- `cancelTrade()` (Esc, ×, Cancel button) discards `draft` and `history`, changes nothing, and restores focus to the canvas/start control.
- `confirmTrade()` applies the final draft, flushes logs, saves the active floor/town, closes, and renders.

## Transaction operations

Extract shared helpers from the current functions so both legacy behavior and the menu use one economy implementation:

- `priceFor(item)` — existing buy-price formula.
- `sellPriceFor(item)` — existing `round(gold * 0.5)`.
- `applyBuyToDraft(draft, item)` — subtract gold, remove stock, then apply the same item effects as `buyFromMerchant()`.
- `applySellToDraft(draft, slot)` — add sale gold, clear the slot with the same maximum-HP adjustment as `equipItem()`.

Buy effects to preserve:

- `heal`: push a stored potion into `draft.inventory`.
- `weapon` / `armor` / `ring`: equip into `draft.equipment[slot]`.
- `elixir`: keep the current net-gold behavior (`state.gold += it.gold` after paying).
- `spellbook`: set `draft.spells[spell] = true`; known spellbooks are disabled rather than bought.
- `scroll`: increment `draft.townScrolls`.

Sell effects to preserve:

- Only equipped weapon/armor/ring are sellable in this iteration.
- Potions and Town Scrolls are not sellable yet; this matches current `sellToMerchant()` scope.

Undo/reset:

- Before every accepted buy/sell, push a deep copy of the current draft onto `history`.
- `U` or Undo pops the last draft. Shift+U / Reset all restores `original`.
- Undo also restores stock, gold, inventory, scrolls, spells, equipment, current HP, and maximum HP.
- Actions that fail (not enough gold, disabled row, empty stock) push nothing and show a message.

## Equipment and HP preview rules

`applyEquipToDraft(draft, slot, item)` must mirror `equipItem()` exactly:

1. Compute old total `maxHp` bonus from `draft.equipment`.
2. Assign the new item to the slot.
3. Compute the new total bonus; `delta = newBonus - oldBonus`.
4. `draft.maxHp += delta`.
5. `draft.hp = Math.min(draft.maxHp, draft.hp + Math.max(0, delta))`.

This preserves current behavior:

- Equipping a Ring adds `maxHp: 20` and raises current HP by 20.
- Selling/removing a Ring lowers maximum HP and only clamps current HP down when it exceeds the new maximum.
- Rebuying a Ring does not stack maximum HP with a level-up; it re-applies the equipment bonus once.

The detail panel shows the projected stats from the draft, including equipment bonuses via the same `equipmentBonus()` logic. God mode still wins on commit: commit uses `equipItem()` and `freezePlayerStats()`, so the trade cannot alter frozen hero stats.

## Commit details

1. If the final draft equals `original`, just close with no logs.
2. Apply changed equipment slots with `equipItem(slot, draft.equipment[slot])` so HP/god-mode handling stays correct.
3. Copy final `gold`, `inventory`, `townScrolls`, `spells`, `stock`, and clamped `hp` into live state.
4. Generate log messages from the final draft diff, not from every intermediate action. Undone purchases/sells must leave no message.
5. Call `companionTalk('merchant')` only when a purchase actually empties the stock, matching current behavior.
6. Call `saveFloor()` in the dungeon or `saveTown()` in town so stock/progress changes persist.
7. `render()` and close.

## Keyboard and focus

- Tab / Shift-Tab are trapped among enabled dialog controls.
- Up/Down moves selection in the active list; Left/Right switches mode between Buy and Sell.
- `B` buys the selected item; `S` sells the selected slot; `U` undoes; `Shift+U` resets; Esc cancels.
- Enter activates the focused button. There is no global Enter-to-confirm shortcut, which avoids accidentally committing while trying to buy.
- Buttons use the existing click-listener wiring pattern at the bottom of `js/game.js`.

## Tests to add when implementing

- Space at town Store and at dungeon merchant opens the menu in Buy mode; `X` opens Sell mode.
- Selecting the second stock item buys that item, not `stock[0]`; price matches `priceFor()`.
- Not enough gold produces a message and no draft change.
- Buying a Town Scroll increments `townScrolls`; buying a potion stores it; buying a spellbook marks it known; known spellbook rows are disabled.
- Selling a single chosen slot leaves the other equipment untouched.
- Undo restores gold, stock, equipment, HP/maxHp, scrolls, potions, and spells; Reset all restores the original snapshot; Cancel leaves live state byte-for-byte unchanged.
- Ring buy/sell preview and commit follow the `equipItem()` HP rules; no stacked maximum HP with level-ups.
- Confirm writes stock back and saves the active floor/town.
- Simulation time and cooldowns do not advance while the menu is open.
- Existing `buyFromMerchant()` / `sellToMerchant()` tests remain green.

## Files

- `index.html`: add `#tradeOverlay` and update help text for Space/B/S/U/Esc behavior.
- `style.css`: modal layout, two-column lists, disabled rows, projected-stat panel; mobile stacking.
- `js/game.js`: trade state/functions, input routing, click wiring, shared pricing/equip helpers.
- `tests/game.test.cjs`: tests listed above.
