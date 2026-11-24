# Companion visibility, adjacent following, and fog

Status: implemented on 2026-11-24. `js/game.js` now gives companions logical adjacent tiles, interpolated drawing, source-based attacks, and fog/exploration lighting; `tests/game.test.cjs` covers the behavior.

## Goal
Make the defeated-boss minion clearly visible, keep it in the tile next to the hero, and let it affect the dungeon fog instead of floating at a fixed screen offset.

## Assumptions
- “Minion” means the existing tiny `state.companion` adopted from a defeated boss.
- “Next box” means one logical tile adjacent to the hero, normally the tile the hero just left or the tile behind the hero’s facing.
- “Affect fog” means the companion acts as a small light source: tiles near it are drawn with reduced fog and added to explored terrain.

## Design
1. Give the companion a real logical position:
   - Extend `state.companion` with `{ x, y, facing }` in addition to `{ name, sprite }`.
   - Keep it transient and outside `FLOOR_FIELDS`; it follows the hero across floors for the current run and resets on `newGame()`, death, and ending.
   - Reuse `actorRenderPosition(companion)` and `actorMotionKey(companion)` so the companion can interpolate with `moveActorTo()` like other actors.
2. Add `placeCompanionNearPlayer()`:
   - Choose an adjacent walkable tile, never the hero’s tile.
   - Prefer the companion’s current tile if still adjacent, then the tile behind the hero’s last movement direction, then clockwise/alternate fallbacks.
   - Skip walls, blocking obstacles, and occupied monster tiles; do not let the companion block player/monster collision or NPC interaction.
   - Call it after every successful player move and after `enterFloor()`, retreat, town/dungeon transitions, and recreation.
3. Replace the fixed-offset drawing:
   - `drawCompanion()` should use `actorRenderPosition(companion)` instead of `companionRenderPosition()` hard-coded offsets.
   - Draw at the existing small scale (0.55) with foot anchoring and keep the speech bubble above the companion, clamped to the camera view.
   - Health bars, bubbles, and minimap must not show the companion as a discoverable secret; it is always drawn while in camera and fog is not full.
4. Make the companion light nearby tiles:
   - Extend `fogLevel(x, y)` to take the minimum of player distance and companion distance plus a small radius (start with companion radius 1 or 2).
   - Extend exploration so tiles near the companion become visited: add `revealAroundCompanion()` and call it from the same active-tick places as `revealAroundPlayer()`.
   - Minimap continues to draw only `state.visited`; no monster, loot, key, or trap is revealed directly. Fog changes only visibility/darkness and explored terrain around the follower.
5. Keep combat behavior unchanged:
   - `companionTick()` still deals exactly 1 damage to the nearest visible monster within three tiles every three active seconds.
   - Companion speech and attack use the companion’s logical tile as the source for projectiles and line of sight.
6. Lifecycle:
   - On travel/recreation, place the companion near the arrival tile before `render()`.
   - On retreat-to-town and town-scroll work, the companion follows into town and lights a small area there too.
   - On `gameOver(false)`, ending, or `newGame()`, clear companion position, speech, timers, and motion tracks.

## Files
- `js/game.js`: companion state, placement helper, fog/reveal helpers, draw/motion integration, lifecycle calls.
- `tests/game.test.cjs`: adjacency/follow, collision, fog, minimap exploration, and cleanup tests.
- `AGENTS.md`, `README.md`, `tasks.md`: describe the companion as a logical visible follower and light source.

## Tests
- Companion is placed on a walkable tile adjacent to the hero after spawn and after movement.
- It does not take the hero tile, a wall tile, or a monster tile.
- Its rendered position follows interpolated movement and camera scrolling.
- `fogLevel()` is lower near the companion than player distance alone would allow.
- Tiles revealed only by the companion are added to `state.visited`.
- Companion position/state never appears in floor saves.
- Travel, retreat, town scroll, death, restart, and ending clear or replace the companion correctly.

## Verification
- `node --check js/game.js && node --check js/sprites.js`
- `node --test tests/game.test.cjs`
- External smoke script from the temp directory.
- Browser `file://` check: visually confirm the minion is beside the hero, follows smoothly, and visibly lifts fog without exposing hidden dungeon secrets.

## Implementation result
- Added `COMPANION_FOG_RADIUS`, `companionTileOpen()`, `placeCompanionNearPlayer()`, `revealAroundActor()`, and `revealAroundCompanion()`; companion state now includes logical `x`/`y`.
- `actorMotionKey()` handles the companion, `drawCompanion()` uses `actorRenderPosition()`/`drawActorSprite()`, and `companionTick()` targets from the companion tile.
- `fogLevel()` and the terrain fog overlay use companion light; companion motion keeps its own frame in `state.motion`.
- Death and ending clear the companion; floor saves remain unchanged. Syntax, 110 behavior tests, the external smoke script, and a headless `file://` browser check pass; the browser check confirmed an adjacent follower, one-tile follow movement, fog `0` with the companion versus `2` without, and companion-lit visited terrain.
