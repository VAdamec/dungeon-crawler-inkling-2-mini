# Agent Guide — Dungeon Crawler

Plain HTML5 canvas game. No build step, no dependencies, no modules — everything must keep working over `file://`.

## File map
- `index.html` — launch-only SVG logo/version and start screen; top stats, a left-side scrolling adventure log, and an equipment sidebar on the right; canvas `#game` (1152x768), game-over and health/retreat overlays, HUD, equipment/merchant display, controls, and sound toggle. Loads `style.css`, then plain scripts `js/sprites.js` and `js/game.js`.
- `style.css` — dark palette, canvas, HUD, dialog/button styles, and help layout.
- `js/sprites.js` — `SPRITES` and `SPRITE_PALETTES` (14 each, including distinct stone stairs with up/down arrows), plus `drawSprite` (references global `ctx` at call time).
- `js/game.js` — generation, floor persistence, combat, NPCs/items, potion inventory, health/retreat dialogs, healing, synthesized audio, drawing, and input. Initializes with `newGame(); render(); setInterval(enemyTick, 220);`.
- `tests/game.test.cjs` — dependency-free Node VM behavioral tests, with stubbed DOM/canvas/audio. The separate legacy smoke script stays outside the repository.
- `docs/plans/2026-11-23-boss-visuals-speech-design.md` — latest approved design and completed implementation checklist. Earlier ending, persistence, and balance designs remain in the same directory.

## Conventions
- No ES modules, no imports/exports, no bundler. `sprites.js` loads before `game.js`; both are plain scripts sharing global scope.
- All mutable game state lives in `state`, including `started`, journal `messages`, `floors`, potion `inventory`, `pause`, warning latches, `activeTime`, `retreatReadyAt`, recovery timers, `bossDefeated`, `floorKey`, `hazards`, `hazardTime`, `obstacles`, `camera`, `ending`, and `audio`. Floor saves contain world contents and monster templates, never player progression. `FLOOR_FIELDS` lists saved fields; save the active floor before transitions.
- The launch screen freezes simulation until `startGame()`. Preserve `started` across R; version branding is initial-launch only. `log()` retains at most 80 plain-text messages in `state.messages` and scrolls the sidebar; R clears it.
- Use `equipItem(slot, item)` for equipment changes, including sales. It adjusts ring maximum/current HP without stacking; direct equipment writes bypass those effects. Ring adds `maxHp: 20`; Shield is an armor-slot item with `def: 5`; sword retains attack/strength modifiers. `renderEquipment()` populates icon cards, modifiers, and effective hero stats.
- Route player damage through `hurtPlayer()` so death and threshold pauses stop attacks immediately. Pauses freeze simulation; `render()` updates the HUD, canvas, and dialog focus.
- World dimensions are `W=72`, `H=48`; viewport dimensions are `VIEW_W=36`, `VIEW_H=24`. Keep all stored positions in world coordinates. `draw()` wraps its viewport loops/entity layers in a camera translation; use `inCamera()` for entity culling and keep warning badges above the player. Map values: 0 walkable, 1 wall, 2 blocking obstacle.
- Boss floors reserve an `isArena` room before other generation: Mimic 18×14, dragon 22×18, with three-tile halls. Keep arenas free of obstacles/hazards, center spawn buffers free of loot/ordinary monsters, and stairs away from the boss center. `rooms` persists these bounds. `monsterVisual()` supplies shared foot-anchored art bounds for sprites/bars/bubbles: Mimic 96×66, dragonBoss 120×96; targeting/collision remains single-tile. The ending reuses dragonBoss artwork with its existing animation.
- `state.ending` is a global campaign finale, not a floor-save field. `gameOver(true)` starts the guarded final sequence; `gameOver(false)` keeps the death overlay. Ending callbacks must be bound to their object identity and canceled by `newGame()`/skip. During the ending, `gameOver/won` mark campaign completion and freeze normal simulation; a separate requestAnimationFrame clock drives screen-coordinate `drawEnding()`.
- Keep functions top-level and flat. `log()` writes to `#log`; `render()` redraws canvas + HUD; `draw()` is canvas-only.
- Do not stage or commit without being asked. Preserve existing user changes and staging.

## Verify
- Syntax: `node --check js/game.js && node --check js/sprites.js`
- Behavior: `node --test tests/game.test.cjs`.
- Run: open `index.html` in a browser via `file://`; test dialogs, connected stairs, and sound after a user interaction.
- Smoke test (temp dir, not repo): `/var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/opencode/smoke.js` — uses vm + stubbed document/canvas, prints `SMOKE_OK`.

## Current behavior to preserve
- Larger floors have branching/looped room connections. `floorDistances()` flood-fills reachability; generated blocking obstacles may not disconnect any walkable floor tile or cover protected objects.
- A random ordinary monster carries each floor 1–9 key with no visible marker. Save its identity/drop/collection in `floorKey`; `pickup()` must check keys before stairs or NPCs. Returning carriers cannot duplicate a dropped/collected key. Depth 10 has no descent key.
- Hazards are saved with a floor-local `hazardTime`; advance only alongside active simulation on the current floor. Fire repeats at most once/second during on phases, rocks warn 1.2s before one impact, spikes stay hidden until one trigger. `hurtPlayer()` handles trap damage without armor. Preserve revealed/spent states and arrival safety buffers.
- Collected potions/treasures, layout, exploration, merchant stock, and rescue state survive floor changes within the run. R/reload starts a new run.
- Ordinary monsters respawn from templates on revisits, away from arrival tiles; bosses whose floor `bossDefeated` flag is true never respawn. Current player progression carries across floors. Descent rewards are once per floor.
- Potions are stored; H drinks. Below 20% HP pauses; below 10% offers confirmed retreat with full HP. At depth 1 retreat returns to its entrance. Confirmed retreat sets a 60-second active-time cooldown; cancellation and floor travel do not reset it.
- Autohealing: 2% maximum HP (rounded, minimum 1) per two seconds after six seconds without combat and no monster within three tiles. Pause/hidden-tab time does not count.
- `enemyAttack()` enforces one shared per-monster 0.8-second cooldown for retaliation and timed attacks, including dodges. Advance `activeTime` only during active simulation.
- Monster combat speech uses transient `state.monsterSpeech`, `monsterSpeechReadyAt`, and `monsterQuoteIndex`, independent of NPC `state.bubble`. Surviving player hits and eligible enemy attempts call `monsterTalk()`. Rotate the brief attributed pool without consuming combat RNG; one bubble per five active seconds, lasting five. Resolve the living actor ID each draw, respect fog/camera bounds, and draw below hazard warnings. Clear on actor death, travel/recreation, restart, player death, and ending; keep speech out of floor saves/templates.
- `monsterTalk()` appends the speaker and quote to `log()` only when speech is accepted, never on render or a blocked/cooldown attack.
- Audio has separate music/effects gain buses and sliders plus master mute. Preserve preferences/context across R, and keep synthesis local.
- Campaign: floors 1–9 require a collected key to descend; depth-5 Mimic death is an additional gate, depth-10 dragon death unlocks princess rescue, and Space at that princess completes the campaign by starting the plot-twist ending. No princess at depth 5 and no descent past depth 10. Boss kills award XP/gold and save permanent floor defeats without ending the run. `objectiveText()` feeds the objective HUD.

See `tasks.md` for status and remaining work.

## Ending behavior
- Keep the final trigger gated by depth 10, dragon defeat, and the once-only princess interaction. Preserve rewards without repeating them.
- 0–2s reveal; 2–5s princess runs/heals with hearts and a refilling dragon HP bar; 5–8s the couple flies off; 8–14s hero walks toward sunset crying; then THE END/stats hold.
- `advanceEnding()` updates time, phase, one-shot story/audio milestones, and the cinematic dragon's HP. Use clamped identity-bound rAF callbacks; hidden tabs freeze/reset timestamps. `endingScene()` derives poses for rendering/tests.
- Esc/skip ends the animation silently at the final scene; R/button restarts at any point and rejects stale frames. Mute/volume remain functional. Do not show the generic victory overlay over the sunset.
