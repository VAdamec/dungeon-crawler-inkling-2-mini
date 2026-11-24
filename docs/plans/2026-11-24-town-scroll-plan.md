# Town Scroll: one-shot town shortcut with return portal

Status: implemented on 2026-11-24. Town Scrolls are low-weight loot and town Store items; `J` consumes one to save the exact dungeon exit and open a one-use portal at the town gate, and `J`/Space at the gate returns through it via the shared `safeTownExitTile()` path. Duplicate use, retreat/death/ending/restart cleanup, dungeon travel persistence, saved-floor reuse, HUD/ability/objective text, portal art, tests, help, README, agent guidance, and task status are updated.

## Goal
Add a Town Scroll item and magic shortcut that teleports the hero to town from the dungeon, remembers the exact dungeon point, and lets the hero return once. The scroll/portal is consumed after the return trip.

## Dependencies
- Requires the town hub plan: `docs/plans/2026-11-24-town-hub-plan.md`.
- Coordinates with the retreat plan: `docs/plans/2026-11-24-retreat-to-town-plan.md`.

## Assumptions
- “Disappear after teleport back” means the scroll is consumed when it opens the shortcut, and the opened portal disappears after it is used to return. Only one portal can be open at a time.
- The Town Scroll is item-fueled magic; it does not cost MP and is not permanently learned.
- The shortcut key will be `J`; if a conflict is found during implementation, update help/tests/README consistently.

## Design
1. Add the item:
   - Add `Town Scroll` to `ITEM_TABLE` with a dedicated sprite and short description.
   - Add it to town Store stock and a low-weight monster/loot drop pool available from early depths.
   - Store count in `state.player.inventory.townScroll` or the existing inventory map, following the potion/inventory convention.
2. Add the shortcut:
   - Add `J` to input routing and help text.
   - In dungeon, `useTownScroll()` requires at least one scroll. If a portal is already open, log that the existing portal must be used first and do not consume another scroll.
   - On use, record `state.townExit = { depth: state.depth, x: hero.x, y: hero.y, reason: 'scroll' }`, set `state.townPortalOpen = true`, decrement the scroll count, play a teleport cue, log the action, and call `enterTown()`.
   - The scroll “disappears” from inventory at this moment; the visible return link is the portal represented by `state.townExit`.
3. Add the return:
   - In town, `J` or Space at the town gate/dungeon gate calls `returnThroughTownPortal()` when `state.townPortalOpen` is true.
   - `returnThroughTownPortal()` loads the saved dungeon floor at `state.townExit`, places the hero on the recorded tile or nearest safe walkable tile, clears `state.townExit`, sets `state.townPortalOpen = false`, plays the teleport cue, and logs the return.
   - The portal disappears here; it cannot be reused.
   - If no portal is open, town gate falls back to normal dungeon entry as described in the town hub plan.
4. State and persistence:
   - `state.townExit` and `state.townPortalOpen` are run-level transient state, not in `FLOOR_FIELDS` and not saved in monster templates.
   - The target dungeon floor itself remains saved normally through `state.floors`; returning does not regenerate it fresh.
   - Preserve ordinary monster templates, cleared loot, merchant stock, boss flags, keys, hazards, and visited tiles exactly as they were when the scroll was used.
5. Safety and conflicts:
   - If the recorded tile became blocked/occupied, use the nearest safe tile with the existing arrival-buffer rules.
   - Retreat closes any open Town Scroll portal and replaces `state.townExit` with a retreat exit.
   - Death, `newGame()`, ending, and R clear both portal fields.
   - Travel within the dungeon while a portal is open does not move the portal; the shortcut still points to the exact tile where it was created.
6. UI:
   - Show `J Town Scroll` in the Spell/ability list only when a scroll is available or a portal is open.
   - HUD/help text distinguishes “scroll available”, “town portal open”, and “no portal”.
   - Add a small town gate/portal visual or bubble when `state.townPortalOpen` is true.
   - Add log messages for use, blocked duplicate use, return, and portal closure by retreat.
7. Art/audio:
   - Add a scroll sprite in `js/sprites.js` and a tiny portal flourish using existing cached drawing.
   - Reuse synthesized teleport/magic cues; no external assets.

## Files
- `js/game.js`: item definition, loot/store inclusion, inventory count, `J` routing, portal state, teleport/travel helpers, UI log/help text.
- `js/sprites.js`: Town Scroll sprite and portal visual.
- `index.html`: help/controls text if needed.
- `style.css`: portal/ability row styling if needed.
- `tests/game.test.cjs`: item acquisition, portal lifecycle, exact return, conflicts, and persistence tests.
- `README.md`, `AGENTS.md`, `tasks.md`: document the new item and shortcut.

## Tests
- Town Scroll can be bought, dropped, picked up, and counted in inventory.
- `J` in dungeon with a scroll opens a portal, records exact depth/x/y, consumes one scroll, and sends the hero to town.
- `J` in town returns to the saved dungeon tile and clears portal state.
- A second `J` in dungeon while a portal is open does not consume another scroll.
- Return uses the saved floor and does not regenerate monsters/loot/boss flags.
- Blocked/occupied return tile resolves safely.
- Retreat, death, ending, and `newGame()` clear the portal; depth travel does not.
- Help/HUD text reflects scroll availability and open portal state.

## Verification
- `node --check js/game.js && node --check js/sprites.js`
- `node --test tests/game.test.cjs`
- External smoke script from the temp directory.
- Browser `file://` check: buy/find a scroll, use `J` in dungeon, see town portal, return with `J` and gate, confirm no reuse, and verify retreat/death cleanup.
