# Tasks — Dungeon Crawler

Last reviewed: 2026-11-23. Build v0.5.0 includes the approved monster combat quotes, persistence/recovery/audio, campaign/balance, scrolling/keys/hazards, and plot-twist ending. See `handover.md` for details and `README.md` for controls.

## Existing gameplay
- [x] Keep a thin HTML shell, CSS, and two plain scripts with no runtime dependencies or build step; launch over `file://`.
- [x] Equipment bonuses, trading, rescues, gold rewards, HUD, speech bubbles, turn counter, and centralized death handling.
- [x] Ten-floor campaign: floor keys plus Mimic unlock lower stairs; dragon defeat unlocks the final princess interaction; it starts the animated plot twist.

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
- [x] Spawn the princess only at depth 10, require dragon defeat before the final princess interaction, and prevent depth 11.
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
- [x] Generate 72×48-tile worlds with about 22 rooms, branching corridors, loops, and distant stairs; keep a fixed 36×24-tile camera viewport.
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

## Verification
- [x] `node --check js/game.js` and `node --check js/sprites.js`.
- [x] `node --test tests/game.test.cjs`: 56 tests pass, including 110 varied floor-generation checks and eight monster-speech tests.
- [x] Existing external startup/input smoke prints `SMOKE_OK`.
- [x] Isolated Chrome over `file://`: floor round trip, stored potion/HUD, health and critical dialogs, frozen movement, focus restoration, retreat confirm/cancel, healing HUD, running audio context, and mute/unmute pass without JavaScript errors. Follow-up checks cover campaign gates/final rescue victory, boss persistence, active retreat cooldown/dialogs, scaled healing, separate volume buses and preferences. Launch/layout checks also verify click/Enter start, paused launch, branding hidden across restart, top stats, left journal history/scroll, right equipment panel/icons/bonuses, and desktop width behavior. Scrolling checks also verify a 58-step real keyboard path beyond old bounds, key drop/collection/return persistence, invisible-spike pixel equality before trigger, rock warnings/dodge, flame damage, and hazard pauses. Ending checks cover all story phases, hidden-tab/skip/restart timing, frozen world state, once-only rewards/events, and screen-coordinate rendering. Real-time ending playback took 14.05 seconds, with all six scenes, world freeze, skip, and restart checked without JavaScript errors; a native canvas preview was recorded. Screenshots inspected.
- Audible output quality was not assessed; audio initialization/scheduling and mute behavior were checked.

## Monster combat quotes — complete
- [x] Rotate a brief attributed Monty Python quote pool on surviving player hits and eligible monster attacks, without changing combat RNG, damage, or cooldowns.
- [x] Display one monster-anchored bubble for 2.5 active seconds, with a global four-second interval; keep NPC dialogue independent.
- [x] Follow actor/camera movement, clamp to the viewport, place below top-edge actors, and hide dead/unseen/offscreen actors. Preserve hazard-warning priority.
- [x] Freeze timers during pauses/hidden tabs and clear speech on actor death, travel/respawn, restart, player death, and ending; exclude it from floor saves/templates.
- [x] Cover timing, lifecycle, visibility, rendering, and RNG independence in eight automated tests; verify real keyboard combat and bubbles in Chrome over file://.

## Remaining follow-up
- [ ] Human difficulty/feel playtest across an entire run and subjective music/effect assessment. Controlled tests and prepared encounters pass, but do not estimate a human completion rate; volume can now be adjusted independently.

## Constraints
- All runtime files are in this project directory. No runtime installation or server is needed.
- State persists in memory within a run; R/reload resets floors and progression.
- Keep functions flat and mutable game state in `state`; no modules, dependencies, or build step.
- Keep the legacy smoke test outside the repo: `/var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/opencode/smoke.js`.
- Branch `main` has no commits and files remain untracked. Do not commit unless explicitly asked.
