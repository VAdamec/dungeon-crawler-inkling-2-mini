# Retreat returns to town

Status: implemented on 2026-11-24. Confirmed retreat now returns to town at full HP, records `state.townExit` with the exact dungeon depth/tile, closes any portal flag, and the town gate returns to that saved tile (or the nearest safe walkable tile) before clearing the return point. Cooldown, MP, death/ending/restart cleanup, and fixed town spawn behavior are preserved; tests, help, README, agent guidance, and tasks are updated.

## Goal
Change confirmed retreat so the hero returns to the persistent town hub instead of automatically moving one dungeon floor upward or to the depth-1 entrance.

## Dependencies
- Requires the town hub plan: `docs/plans/2026-11-24-town-hub-plan.md`.
- Shares `state.townExit` with the Town Scroll plan.

## Design
1. Replace the retreat destination:
   - `confirmRetreat()` records `state.townExit = { depth: state.depth, x: hero.x, y: hero.y, reason: 'retreat' }` before changing area.
   - Call `enterTown()` and place the hero at the town spawn, away from buildings/water/NPCs.
   - Depth 1 no longer has a special “return to entrance” path; it uses the same town return.
2. Preserve the existing safety contract:
   - Retreat still restores full HP on confirmation.
   - Retreat still requires the low-health warning path and explicit confirmation.
   - The 60-second active-time cooldown stays unchanged. Because town is safe time, `activeTime` does not advance there, so the cooldown is effectively paused while resting in town.
   - MP is not automatically refilled by retreat; the Inn can restore MP if the player rests.
3. Make the saved return point useful:
   - The town dungeon gate should use `state.townExit` to return to the exact dungeon depth/tile when present.
   - If the exact tile is no longer walkable or is occupied, use the nearest safe tile with the existing arrival-buffer logic.
   - Preserve that dungeon floor’s saved objects and monster templates; retreat must not regenerate the target floor fresh.
4. Interaction with Town Scroll:
   - If a Town Scroll portal is open when retreat is confirmed, close it and log that the retreat overwrote the shortcut.
   - This prevents two competing exits from town. The scroll portal plan owns the cleanup helper.
5. UI/docs:
   - Update retreat dialog copy and objective text to say “Retreat to town”.
   - Update HUD retreat status tooltip/help so cooldown wording still matches.
   - Update README and `AGENTS.md` “Current behavior to preserve” to remove the old one-floor-up behavior.
6. Lifecycle:
   - Clear `state.townExit` on `newGame()`, player death, ending, and any explicit “start new dungeon from depth 1” action.
   - Do not clear it on ordinary floor travel unless that travel intentionally sets a new return point.

## Files
- `js/game.js`: `confirmRetreat()`, `enterTown()`, town gate return handling, dialog/objective/help copy, cleanup.
- `index.html`: retreat dialog wording if text lives in markup.
- `tests/game.test.cjs`: retreat destination, cooldown pause, exact return, depth-1 case, scroll-portal conflict.
- `README.md`, `AGENTS.md`, `tasks.md`: document new behavior.

## Tests
- Confirming retreat from depth N sets `state.area === 'town'` and records `{ depth: N, x, y, reason: 'retreat' }`.
- Depth 1 retreat goes to town and town gate can return to depth 1.
- HP is full after retreat; MP follows existing rules; retreat cooldown is unchanged.
- Cooldown does not decrease while in town.
- Return uses the saved dungeon floor, not a freshly generated floor; stepped-on/cleared objects remain cleared.
- Occupied or blocked return tiles resolve to a safe adjacent tile.
- Retreat closes an open Town Scroll portal.
- Cancel/low-health threshold/focus behavior is unchanged.

## Verification
- `node --check js/game.js && node --check js/sprites.js`
- `node --test tests/game.test.cjs`
- External smoke script from the temp directory.
- Browser `file://` check: trigger low-health retreat at depth 1 and a deeper floor, rest in town, return through the gate, and verify cooldown/focus/dialog behavior.

## Review clarification — 2026-11-24

Implemented behavior also allows Enter to request retreat during ordinary dungeon play, subject to confirmation and the active-time cooldown. The critical-health dialog is another entry point, not a requirement for every retreat. See the [current review](../reviews/2026-11-24-status-review.md).
