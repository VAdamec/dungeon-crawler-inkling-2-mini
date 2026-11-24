# Tasks — Dungeon Crawler

Last reviewed: 2026-11-23. Build v0.16.2 adds smooth movement, walking/wing/flame animation, the ? Help & settings dialog, 2× world zoom (18×12 view), the approved static graphics refresh, boss-defeat flourishes, the explored-area minimap with a compact Hero stats panel above a larger log and Spells under Gear bonuses, monster combat quotes, larger bosses/arenas, ranged/magic combat with out-of-combat mana regeneration and Magic Barrier, tiny defeated-boss companions with 1 damage and ironic remarks, five biomes on 96×64 floors, the 100-floor boss campaign with surprise bosses and a max hero level of 100, dedicated boss art and intro/defeat animations, the Skeleton King throne room, the ~ developer console with hero-stat-freezing, monster-killing god mode, and the plot-twist ending. See `handover.md` for details and `README.md` for controls.

## Existing gameplay
- [x] Keep a thin HTML shell, CSS, and two plain scripts with no runtime dependencies or build step; launch over `file://`.
- [x] Equipment bonuses, trading, rescues, gold rewards, HUD, speech bubbles, turn counter, and centralized death handling.
- [x] Hundred-floor campaign: floor keys plus data-driven boss gates unlock lower stairs; dragon defeat unlocks the final princess interaction; it starts the animated plot twist.

## Persistent floors — complete
- [x] Preserve layout, rooms, stairs, exploration, remaining treasures/potions, merchant stock, and rescue state across floor changes.
- [x] Preserve current HP, stats, XP, gear, potion inventory, gold, kills, and turn count; remove old player snapshot rollback.
- [x] Recreate ordinary monsters at full HP from independent templates on return, away from arrival tiles and without duplicate positions. Defeated bosses remain defeated.
- [x] Use Space on ▲/▼; Q/Backspace also ascends at ▲. Arrive at the connecting staircase; no ascent above depth 1.
- [x] Keep explored terrain and discovered stairs, treasures, and potions visible; render treasure chests.
- [x] Keep collected treasures/potions collected. This follows the later wording and replaces the earlier conflicting potion-respawn request.
- [x] Award descent/full-clear descent rewards once per floor, preventing repeated staircase rewards.
- [x] Verify floor round trips and persistent merchant/rescue state; prevent generated NPC/loot overlap with stairs and one another.

## Health and retreat — complete
- [x] Store found/purchased potions; H drinks one, caps healing, and does not consume at full HP. Show count in HUD.
- [x] Pause below 20% HP with Drink/Continue; below 10% add Retreat. Lethal damage still kills. Warnings rearm only after recovering to their threshold.
- [x] Freeze enemies, healing, and combat cooldown while paused. Stop remaining attacks immediately when a threshold is crossed.
- [x] Confirm or cancel retreat. Confirmation returns one floor up with full HP; at depth 1 return to its entrance. A 60-second active-time cooldown prevents repeated full heals; HUD/dialog show availability.
- [x] Heal 2% maximum HP (rounded, minimum 1) per two active seconds after six seconds without combat and no living monster within three tiles; paused/hidden time does not accumulate.
- [x] Support dialog buttons, keyboard shortcuts, focus restoration, and trapped Tab navigation.

## Audio and help — complete
- [x] Generate retro music and attack/hit/heal/death/pickup/stair effects locally. Start audio on user interaction; M/button mutes both music and effects.
- [x] Handle unavailable audio without breaking gameplay; retain mute and separate music/effects volume settings across R. Sliders do not override master mute.
- [x] Expand in-game help and add `README.md` with launch instructions, controls, rules, and checks.
- [x] Update agent guidance, handover, and task status; record approved design and implementation checklist in `docs/plans/`.

## Campaign and balance — complete
- [x] Gate depth-5 descent on Mimic defeat; make depth-10 dragon defeat unlock rescue rather than immediately win.
- [x] Spawn the princess only at depth 100, require dragon defeat before the final princess interaction, and prevent depth 101.
- [x] Persist defeated bosses across revisits and prevent repeated boss rewards; preserve ordinary monster respawns.
- [x] Show the current campaign objective and retreat availability in the HUD.
- [x] Reduce normal HP growth to 20%/depth and attack growth to 15%/depth; use gentler final-dragon growth while retaining XP/gold scaling.
- [x] Share one 0.8-second attack cooldown per monster between retaliation and timed attacks, including dodges.
- [x] Compare controlled before/after boss diagnostics and verify a prepared no-gear endgame duel using real combat, potion, and rescue functions.

## Launch and layout — complete
- [x] Put health, level, XP, depth, kills, turns, gold, potions, and retreat status at the top instead of a permanent title.
- [x] Put weapon, armor/shield, and ring cards with icons to the right of the map; display per-item modifiers, combined HP/strength bonuses, and effective hero stats.
- [x] Apply real ring +20 max/current HP, sword attack/strength bonuses, and Shield +5 defense; handle replacement, sale, level-up, and floor persistence correctly.
- [x] Put a scrolling adventure log with message history to the left of the map on desktop; keep it bounded to the map height.
- [x] Show a local fantasy doorway/swords logo, Dungeon Crawler wordmark, and current version only at launch. Starting hides the branding; R restarts directly into play.
- [x] Freeze simulation before start; prevent the start key from also triggering a gameplay action. Keep canvas resolution and file:// support.

## Scrolling floors, keys, and hazards — complete
- [x] Generate 72×48-tile worlds with about 22 rooms, branching corridors, loops, and distant stairs; use an 18×12-tile camera viewport at 2× zoom.
- [x] Follow the player with a clamped camera, cull every drawing layer to the viewport, and retain world-coordinate exploration on revisits.
- [x] Secretly assign one ordinary key carrier per floor 1–9; drop/Space-collect the key, permanently unlock stairs, and preserve dropped/collected state without duplicates.
- [x] Keep depth-5 Mimic defeat as an additional gate; retain depth-10 dragon-then-rescue victory.
- [x] Add visible cycling flame vents, warned one-shot falling rocks, hidden one-shot spikes, and persistent trap state/local clocks.
- [x] Add blocking pillars/rubble only if flood-fill still reaches every remaining floor tile; reserve key carriers, stairs, NPCs, and loot.
- [x] Keep hazards outside three-tile arrival/stair buffers and off protected initial objects; use central damage for health pauses/death and freeze timers on pause/hidden/launch/other floors.
- [x] Add Key/Pos HUD feedback and help; place rock-warning badges above the player so they cannot be covered by the sprite.

## Plot-twist ending — complete
- [x] Replace ordinary rescue victory with the princess revealing her love for the wounded dragon, running to him, healing him, and fleeing on his back.
- [x] Follow with a slumped hero walking toward the sunset, shrinking into the distance and shedding animated blue tears; hold THE END and run stats.
- [x] Use a roughly 14-second staged sequence on the existing canvas with reused sprites, hearts/glow/HP recovery, wing motion, captions, and audio cues.
- [x] Freeze dungeon entities, hazards, healing, active-time cooldowns, and gameplay input throughout animation/final hold. Keep sound/mute controls working.
- [x] Add Esc/skip and R/restart controls. Cancel pending frames, reject stale callbacks, freeze hidden-tab timing, and prevent repeat interaction rewards.
- [x] Keep the generic victory overlay out of the ending; retain normal death behavior.

## Boss defeat flourishes — complete
- [x] Commit boss XP/gold/flags/floor saves/logs first, then start a transient visual-only animation snapshot outside `FLOOR_FIELDS`.
- [x] Give the Mimic a short in-world snap, coin burst, collapse, and **MIMIC DEFEATED** banner.
- [x] Give the dragon a longer screen-space cinematic with darkened hall, lightning, embers, drooping wings, falling dragon, and **DRAGON SLAIN** banner.
- [x] Freeze enemy ticks, hazards, recovery, and gameplay input during the flourish while keeping sound controls and R available; Esc skips.
- [x] Use clamped identity-bound rAF frames with hidden-tab freeze and one-shot audio; clear on completion, travel, death, ending, skip, and restart, rejecting stale callbacks.
- [x] Verify both animations, scene phases, rendering transforms, timing/lifecycle cleanup, and unchanged boss rewards in automated tests.

## Verification
- [x] `node --check js/game.js` and `node --check js/sprites.js`.
- [x] `node --test tests/game.test.cjs`: 78 tests pass, including 130 varied floor-generation checks, eight monster-speech tests, and three boss-defeat animation tests.
- [x] Existing external startup/input smoke prints `SMOKE_OK`.
- [x] Isolated Chrome over `file://`: floor round trip, stored potion/HUD, health and critical dialogs, frozen movement, focus restoration, retreat confirm/cancel, healing HUD, running audio context, and mute/unmute pass without JavaScript errors. Follow-up checks cover campaign gates/final rescue victory, boss persistence, active retreat cooldown/dialogs, scaled healing, separate volume buses and preferences. Launch/layout checks also verify click/Enter start, paused launch, branding hidden across restart, top stats, left journal history/scroll, right equipment panel/icons/bonuses, and desktop width behavior. Scrolling checks also verify a 58-step real keyboard path beyond old bounds, key drop/collection/return persistence, invisible-spike pixel equality before trigger, rock warnings/dodge, flame damage, and hazard pauses. Ending checks cover all story phases, hidden-tab/skip/restart timing, frozen world state, once-only rewards/events, and screen-coordinate rendering. Real-time ending playback took 14.05 seconds, with all six scenes, world freeze, skip, and restart checked without JavaScript errors; a native canvas preview was recorded. Screenshots inspected.
- [x] Chrome check over `file://` played both boss-defeat flourishes in real time, verified frozen player/monster/activeTime/hazardTime during key input, confirmed Escape skip, and reported no JavaScript errors. Five animation-frame captures were saved to `/tmp` for human visual review.
- Audible output quality was not assessed; audio initialization/scheduling and mute behavior were checked.

## Monster combat quotes — complete
- [x] Rotate a brief attributed Monty Python quote pool on surviving player hits and eligible monster attacks, without changing combat RNG, damage, or cooldowns.
- [x] Display one monster-anchored bubble for five active seconds, with a global five-second interval; keep NPC dialogue independent.
- [x] Follow actor/camera movement, clamp to the viewport, place below top-edge actors, and hide dead/unseen/offscreen actors. Preserve hazard-warning priority.
- [x] Freeze timers during pauses/hidden tabs and clear speech on actor death, travel/respawn, restart, player death, and ending; exclude it from floor saves/templates.
- [x] Cover timing, lifecycle, visibility, rendering, and RNG independence in eight automated tests; verify real keyboard combat and bubbles in Chrome over file://.

## Remaining follow-up
- [x] Add smooth actor/camera movement, walking poses, visible bat/dragon wing cycles, slime hops, and wall-torch/active-vent flame animation. Keep logical collisions, AI, combat and damage timing unchanged; move overlays/minimap with rendered positions.
- [x] Cache sprite poses, cap drawing at 30fps with viewport overscan, freeze on all pauses/hidden/cinematics, and clear tracks/callbacks across travel/respawn/retreat/death/restart. No extra combat RNG or saved animation state.
- [x] Verify 78 tests, syntax/smoke, actual browser interpolation/pixel changes/pause/cleanup/mobile/performance; save a native canvas WebM preview and link it in README.
- [x] Move permanent instructions/audio controls into Help & settings, toggled by ? and a HUD ? button, closed by ?/Esc/Close. Pause world/cinematic clocks, preserve nested health/retreat dialogs and audio settings, trap/restore focus, and fit mobile screens. Move merchant stock into equipment and ending buttons over the canvas; remove footer controls. All 72 tests plus browser/smoke/syntax checks pass.
- [x] Apply approved 2× whole-map zoom with an 18×12 viewport, camera bounds/culling, smaller minimap outline, enlarged in-world overlays, and readable boss health bars above fog. Preserve HUD/sidebar sizes and cinematic framing. All 68 tests and browser/smoke/syntax checks pass.
- [x] Implement the approved static graphics preview: full-body cast, cohesive large bosses, blue-grey stonework, worn floors/recessed walls, static torches/light, ground shadows, and matching item/stair/trap/equipment art.
- [x] Cache sprite/terrain/light canvases under disposable `state.art`, preserve logical sprite bounds with source density, avoid scenery RNG, and retain file:// plus existing boss/ending animations. Save all preview sheets in `docs/previews/2026-11-23-static-graphics/`.
- [x] Verify 67 tests, syntax, external smoke, real keyboard exploration, hidden-spike pixel equality, both boss-defeat scenes/ending/restart, mobile layout, no remote requests, and warm browser rendering cost.
- [x] Add a right-side explored-area minimap above equipment, with floor label, player, discovered stairs, and camera outline; preserve secrets and floor-local exploration without new state. Verify hidden-content drawing, travel/restart, and responsive layout.
- [x] Extend combat bubbles to five active seconds without early replacement; log each accepted quote once with the speaker name.
- [x] Add dedicated winged/horned dragon artwork (120×96) and a large toothed Mimic (96×66), with shared bounds for health bars and bubbles; preserve single-tile combat.
- [x] Generate larger boss arenas (18×14/22×18), three-tile halls, separated stairs, and clear spawn buffers; retain floor connectivity/persistence/campaign gates.
- [x] Correct local-LLM staircase sprites that duplicated the knight: use stone steps with distinct gold up/down arrows. Keep existing stair discovery/camera/travel rules; update the rendering check for sprite-based stairs.
- [ ] Human difficulty/feel, boss-defeat animation pacing, and subjective music/effect playtest across an entire run. Controlled tests and prepared encounters pass, but do not estimate a human completion rate; volume can now be adjusted independently.

## Expansion — design: docs/plans/2026-11-23-expansion-design.md
- [x] Add Wasp (ranged), Mage (magic attack) and Healer (magic heal) ordinary monsters with shared enemy cooldown, line of sight, dodge and sound; let them fire from outside melee range during active ticks.
- [x] Add player archery (Bow treasure, E to shoot nearest visible target in range with line of sight) and magic (F Fireball, G Heal, MP pool with active-time regeneration, HUD bar, help text, merchant/sprite groundwork).
- [x] Add themed floors 3 (Orc's Kitchen/Cook) and 7 (Skeleton Pub/Bartender) with reserved arenas, unique boss names, props, ranged beer throwing, and per-floor boss-defeat persistence; keep normal key descent rules.
- [x] Draw dedicated Wasp/Mage/Healer sprites, wing/cast frames and animated projectile visuals (stinger, bolt, beer, arrow, fireball, heal) driven by the transient motion clock.
- [x] Add spellbook learning/merchant stock, Frostbolt and Greater Heal, per-spell cooldowns, spell HUD/help text, depth-gated ranged/magic enemies and enemy accuracy/damage/heal balancing.
- [x] Grow worlds to 96x64 with ~32 rooms, more monsters, five biome variants with saved props and tiled palettes, and a merchant on every even non-boss floor with depth-scaled stock/prices; re-verify reachability, culling and minimap.
- [x] Extend the campaign to 100 floors with data-driven gates, a boss every tenth floor (Hydra, Wild Boar, Medusa, Dark Wizard and others), the dragon/ending at depth 100, and per-boss scaled rewards. Verified with 92 tests, syntax checks, and the external smoke script.
- [x] Build unique encounter and death animations for every boss with dedicated large sprites/frame poses and identity-bound, skippable, fully cleaned-up rAF scenes. Verified with 96 tests, syntax checks, and the external smoke script.
- [x] Build the depth-50 Skeleton King throne room with unique art, long-range attacks, adds, intro/death scenes and non-repeatable rewards.
- [x] Add a `~` developer console with `loadLevel <1-100>` (fresh boss-floor loading) and `godMode 0|1` (immortality) for scenario testing.
- [ ] Verify all phases with syntax, behavior tests, external smoke, browser file:// play and updated docs; local Node needs a temporary `DYLD_LIBRARY_PATH` symlink for `libsimdutf.37.dylib`.

## Constraints
- All runtime files are in this project directory. No runtime installation or server is needed.
- State persists in memory within a run; R/reload resets floors and progression.
- Keep functions flat and mutable game state in `state`; no modules, dependencies, or build step.
- Keep the legacy smoke test outside the repo: `/var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/opencode/smoke.js`.
- Branch `main` has existing history. Check current git status rather than relying on old handover commit IDs; preserve user changes/staging and do not stage or commit unless explicitly asked.
