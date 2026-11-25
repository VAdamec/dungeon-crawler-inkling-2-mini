# Teleportation Scenarios Plan (Corrected)

Status: corrected design for the next debug/verification iteration. No implementation yet.

## What already exists

Most scenario coverage requested in the earlier draft is already present in `tests/game.test.cjs`. Do not duplicate these tests:

- Town Scroll is a real loot item: `ITEM_TABLE` entry with `kind: 'scroll'`, `minDepth: 1`, `lootWeight: 1`; `lootPool()` includes it.
- Town Store stock includes Town Scroll via `townStoreStock()`.
- Buying and finding scrolls increments `state.townScrolls` and does not mix with potions.
- `J` in the dungeon consumes one scroll, saves `{ depth, x, y, reason: 'scroll' }` in `state.townExit`, opens the portal, and calls `enterTown()`.
- `J`/Space at the gate returns through the portal to the exact saved tile.
- A second scroll is not consumed while a portal is already open.
- The portal survives dungeon travel.
- The saved floor is reused instead of regenerated.
- Blocked exit tiles resolve through `safeTownExitTile()`.
- Retreat closes an open portal, stores `{ reason: 'retreat' }`, applies the 60-second active-time cooldown, and returns to town with full HP.
- Portal state clears on retreat, death, ending, and restart.
- HUD/help text already describes scroll and portal state.

Current key functions: `useTownScroll()`, `returnThroughTownPortal()`, `enterDungeonFromTown()`, `safeTownExitTile()`, `clearTownReturn()`, `confirmRetreat()`, `townInteract()`.

## Single-portal rule to preserve

There can be at most one return point and one portal at a time:

- `state.townExit` holds one `{ depth, x, y, reason }` object.
- `state.townPortalOpen` is the boolean gate for the open portal.
- Any action that would create a new portal while one is open must refuse without consuming a scroll and without overwriting `state.townExit`.
- `confirmRetreat()` may replace a scroll/debug portal with a retreat return point, but must close the portal first and log the collapse as it does today.
- Death, ending, restart, and successful return call `clearTownReturn()`.

## Debug commands to add

Add two console-only commands in `submitConsole()` and include them in both `openConsole()`’s startup line and the `help` response.

### `teleportTown`

Decision: `teleportTown` is a **free Town Scroll-style debug shortcut that creates a return point**. It does not consume a Town Scroll and does not act like a retreat.

Behavior:

- Parse as `command === 'teleporttown'`; display as `teleportTown`.
- Require `state.started`, dungeon area, and no gameOver/ending/help/pause/cinematic state. If already in town, report `Already in town.` and change nothing.
- If `state.townPortalOpen`, report `A town portal is already open; return through it first.` and change nothing. This preserves the single-portal rule.
- Otherwise:
  - save `{ depth: state.depth, x: state.player.x, y: state.player.y, reason: 'cheat' }` into `state.townExit`;
  - set `state.townPortalOpen = true`;
  - play the magic sound;
  - call `enterTown()`;
  - log a short debug-portal message and `consoleMessage('Teleported to town; debug portal open.')`;
  - `render()`.
- Do not restore HP/MP, do not change `retreatReadyAt`, and do not consume `state.townScrolls`.
- Extend `enterDungeonFromTown()`’s return log so `reason === 'cheat'` reads as stepping back through the debug portal; do not add a new state field.
- Existing `returnThroughTownPortal()` and `safeTownExitTile()` remain unchanged.
- No new floor-save field; `townExit`/`townPortalOpen` stay transient.

### `addScrolls <count>`

- Parse with `Number(args[0])`; require `Number.isInteger(count) && count > 0`.
- Reject empty, `0`, negative, fractional, `NaN`, and extra non-count input with `Usage: addScrolls <positive integer>` and no state change.
- On success: `state.townScrolls += count`; `render()`; `consoleMessage('Added N Town Scroll(s); total M.')`.
- Keep cheat feedback in the console and HUD; do not add the earlier proposed `logTeleportEvent()` runtime logging layer.

## Tests to extend, not duplicate

Add only the gaps created by the new commands:

1. `teleportTown` from dungeon creates exactly one portal
   - `townExit.reason === 'cheat'`, exact saved depth/tile, `townPortalOpen === true`, scroll count unchanged, area is town.
2. Second `teleportTown` while portal is open is rejected
   - No scroll change, no overwrite of the saved tile.
3. Return through the debug portal works via `J` and via Space at the gate
   - Restores the exact floor/tile and clears both return fields.
4. `teleportTown` is rejected in town and while gameOver/ending/pause
   - State remains unchanged.
5. `addScrolls 3` increments the HUD count and `#spellList`; `0`, `-1`, `1.5`, `abc`, and no argument are rejected without changing the count.
6. Console help lists both commands.
7. Existing town-scroll, retreat, cooldown, blocked-tile, death/ending/restart tests remain green.

## Files

- `js/game.js`: `openConsole()`, `submitConsole()`, `enterDungeonFromTown()` log branch, optional small helper such as `addTownScrolls(raw)`.
- `index.html`: dev-console/help text may mention the new commands only if desired; the console help string is authoritative.
- `tests/game.test.cjs`: add the focused tests above.

## Verification

- `node --check js/game.js && node --check js/sprites.js`
- `node --test tests/game.test.cjs`
- Manual `file://` check: `~`, `loadLevel 2`, `addScrolls 1`, `teleportTown`, then `J` at the gate returns to the saved depth-2 tile.
