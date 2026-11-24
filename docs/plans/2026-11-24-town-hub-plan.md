# Town hub: starting village, Inn, Store, NPCs, river, and trees

Status: implemented and visually refined on 2026-11-24. `newGame()` now pre-generates floor 1 and starts in a persistent town; `js/game.js` adds `state.area`, `genTown()`, `saveTown()`, `enterTown()`, `enterDungeonFromTown()`, town-safe simulation guards, `townTick()`, `townInteract()`, and Inn/Store/NPC/gate behavior. The town is fully visible without dungeon fog, with grass and sand roads, Inn/Store buildings with doorsteps, extra huts, trees, villagers, and wandering cats/dogs/chickens. NPC tiles block movement into dialogue so the player never disappears under a town actor. `js/sprites.js` adds town sprite grids, palettes, and a town tile palette. `tests/game.test.cjs` covers the new start flow, connected layout, interactions, safe time, persistence, visibility, décor, animals, and overlap avoidance. The dependent return flows are also implemented: see [retreat-to-town](2026-11-24-retreat-to-town-plan.md) and [Town Scroll](2026-11-24-town-scroll-plan.md). Current audit: [2026-11-24 review](../reviews/2026-11-24-status-review.md).

## Goal
Start the run in a small persistent village instead of directly on dungeon depth 1. The village is a safe hub with an Inn, a Store, wandering/talking townspeople, a river with a crossing, trees, and a dungeon entrance.

## Assumptions
- The town is part of the same run, not a new campaign mode.
- Town time is safe time: it does not advance dungeon monsters, hazards, monster/mana/companion combat timers, retreat cooldown, or boss cinematics.
- The dungeon entrance in town leads to the current dungeon return point when one exists, otherwise depth 1.

## Design
1. Add an area switch:
   - Add `state.area = 'town' | 'dungeon'`.
   - `newGame()` initializes the run in town and prepares depth 1 lazily or immediately, but the player starts on the town map.
   - Keep `state.depth` as the last/current dungeon depth. HUD shows `Town` instead of a depth number while `state.area === 'town'`.
   - `state.map` remains the active map so existing movement/camera/render code can be reused; dungeon maps stay in `state.floors[depth]`, town map stays in `state.town`.
2. Add persistent town state:
   - `state.town = { map, visited, props, npcs, storeStock, landmarks, banners? }`. It is per-run state, not a dungeon floor save and not reset by floor travel.
   - `FLOOR_FIELDS` should not be extended for town fields. Town generation and stock persist in `state.town` until `newGame()`.
   - Add `state.townExit = null | { depth, x, y, reason }` as the shared return point used by retreat and Town Scroll. Town gate consumes it when configured to do so.
3. Generate a fixed, compact town layout with `genTown()`:
   - Around 40×28 tiles, biome `town`, with a central road, a river crossing via one bridge, scattered trees/props, Inn, Store, houses, and a dungeon gate.
   - Water and tree tiles are blocking; the bridge is walkable. Decorative props are non-blocking.
   - Use flood-fill to prove every walkable town tile is reachable before accepting the map. No RNG should be consumed by static tile painting; use fixed or coordinate-derived scenery.
   - Add `townProps` with logical positions for Inn/Store signs, trees, benches, flowers, fences, and lamplights.
4. Add town sprites/art:
    - In `js/sprites.js`, add small pixel sprites for Inn, Store, villager, tree, water, bridge, dungeon gate, huts, doorsteps, and cats/dogs/chickens.
    - Add a cached town biome tile painter with grass and coordinate-derived sand roads using the existing terrain/light cache system. Keep logical bounds via `spriteDimensions()`.
   - Reuse existing equipment/actor rendering paths; no image assets or network requests.
5. Add town NPCs:
   - `state.town.npcs` holds villager positions, facing, sprite pose, and idle phrase index.
   - They move slowly on town ticks or stand near landmarks; they never block the player.
   - On adjacency or Space interaction, show a speech bubble and append an attributed line to `state.messages` using a deterministic `TOWN_LINES` pool. Do not consume combat RNG.
   - NPC speech is transient; NPC positions and phrase index are part of `state.town` so they survive revisits.
6. Add Inn interaction:
   - Space near the Inn door/innkeeper opens a simple confirmation dialog or one-key prompt: sleep/rest.
   - `restAtInn()` restores HP and MP to maximum, clears low-health warning latches, resets combat/healing/mana/companion clocks, and logs a short rest message.
   - Resting is free but only available in town. It must not advance dungeon active time or affect retreat cooldown except by preserving the frozen timer.
7. Add Store interaction:
   - Space near the Store opens the existing merchant stock panel, or reuses `buyFromMerchant()` / `sellToMerchant()` with a town-specific stock object.
   - Town store stock persists in `state.town.storeStock`; buying removes stock, selling adds town stock back when appropriate.
   - Town Scroll should be included here in the separate Town Scroll plan. Known spellbooks should still be filtered out by existing rules.
8. Add dungeon gate interaction:
   - Space at the gate calls `enterDungeonFromTown()`.
   - If `state.townExit` is set, return to that depth/tile using the saved floor; otherwise generate/use depth 1 entrance.
   - Clear or preserve `state.townExit` according to its source: retreat/scroll handling will define this in their plans.
9. Freeze dungeon simulation in town:
   - `enemyTick()`, hazard updates, monster speech, companion attack timers, mana regeneration, autoheal, boss intro/defeat scenes, and active-time progression all skip while `state.area === 'town'`.
   - Cinematic rAF clocks stay frozen/reset. Help and dev console continue to work.
    - Town drawing skips dungeon fog and visited culling; the player is drawn after townsfolk/animals. `renderMinimap()` labels the current area as Town and reveals the village, grass, sand roads, and water without showing monsters, loot, keys, or traps.
10. Routing and objective:
    - `pickup()`/`interact()` must check town objects (Inn, Store, NPCs, gate) before dungeon stairs/loot paths.
    - `objectiveText()` in town suggests resting, shopping, or entering the dungeon.
    - Help and README document Space interactions in town.

## Files
- `js/game.js`: area state, town generation, town interactions, safe-time guards, rendering/minimap labels, objective text.
- `js/sprites.js`: town sprites, town tile painter, landmark art.
- `index.html`: any dialog copy for Inn/Store, HUD/help text if needed.
- `style.css`: town-specific dialog/store/landmark label styling if needed.
- `tests/game.test.cjs`: generation, routing, persistence, and safe-time tests.
- `README.md`, `AGENTS.md`, `tasks.md`: update start flow and state model.

## Tests
- `newGame()` starts in town, with town map/stock/NPCs initialized and `state.area === 'town'`.
- Town map is connected; river blocks without bridge and bridge is walkable; trees/buildings block or route correctly.
- Inn restores HP/MP and does not advance dungeon timers or retreat cooldown.
- Store buys/sells through existing merchant helpers and persists stock across town visits.
- Town NPC interaction logs deterministic attributed speech without changing combat RNG.
- Dungeon gate enters depth 1 initially and honors `state.townExit` when set.
- No dungeon monsters, hazards, keys, or boss flags are generated in town.
- Town renders without fog, includes visible Inn/Store buildings with doorsteps plus huts/trees/animals, keeps the player visible on NPC contact, and the minimap reveals the village terrain without exposing dungeon actors.

## Verification
- `node --check js/game.js && node --check js/sprites.js`
- `node --test tests/game.test.cjs`
- External smoke script from the temp directory.
- Browser `file://` check: start in town, walk around river/trees, talk to NPCs, rest at Inn, buy/sell at Store, enter dungeon, return to town, and confirm no errors or remote requests.
