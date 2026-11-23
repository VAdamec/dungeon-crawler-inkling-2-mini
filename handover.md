# Handover — Dungeon Crawler

Last updated: 2026-11-23. Current build: v0.6.0.

## Objective and result
Implemented the approved Monty Python monster combat speech bubbles on top of the princess/dragon romance ending, larger scrolling floors, persistent hidden-carrier keys, hazards/obstacles, and earlier campaign, recovery, audio, and layout features. No commits made.

Latest approved follow-up: combat quotes last five active seconds with a five-second global interval and enter the left journal once per accepted utterance. `monsterVisual()` shares foot-anchored bounds for boss art, health bars, and bubble placement. Mimic is now a 96×66 toothed chest; dedicated `dragonBoss` art is 120×96 with wings, neck, horns, claws, and tail, also reused in the ending. Single-tile collision/combat remains as approved.

Boss generation reserves an `isArena` room before ordinary rooms: 18×14 for the Mimic and 22×18 for the dragon, connected with three-tile halls. Stairs sit away from center. Arenas have no hazards/obstacles; center buffers keep ordinary monsters and loot away from the boss. `rooms` already persists arena metadata. `recreateMonsters()` keeps ordinary respawns out of those buffers. Generation still passes full connectivity, arrival/key/hazard safety, and campaign tests.

Follow-up correction: a local LLM introduced `stairsUp`/`stairsDown` sprites that exactly duplicated the knight. Replaced those grids/palettes in `js/sprites.js` with stone steps and gold directional arrows. Existing sprite calls, discovery, camera culling, and travel behavior remain intact. Updated the old glyph-based rendering assertion for sprite-based stairs; all 59 tests and syntax checks pass. Browser captures are `/tmp/dungeon-stairs.png` and `/tmp/dungeon-stairs-detail.png`.

## Read first
- `agents.md` — architecture and conventions.
- `README.md` — launch, controls, campaign/recovery rules, and verification commands.
- `tasks.md` — completed criteria and remaining human playtest follow-up.
- `docs/plans/2026-11-23-boss-visuals-speech-design.md` — latest approved design. Earlier ending, scrolling/keys/hazards, campaign/balance, and launch/layout designs remain in this directory.
- `docs/plans/2026-11-23-launch-layout-design.md` — user-specified layout and launch behavior.
- `docs/plans/2026-11-23-campaign-playtest-findings.md` — controlled baseline and before/after diagnostics, with limitations.
- `js/game.js` and `tests/game.test.cjs` — implementation and dependency-free behavior checks.

## Runtime and state
Still plain HTML/CSS plus `js/sprites.js` then `js/game.js`; no runtime dependencies, modules, build, server, external fonts, or downloaded audio assets. All mutable game state stays in `state`; functions stay flat/top-level. `GAME_VERSION` is 0.6.0.

Floor saves (`state.floors`, `FLOOR_FIELDS`, `saveFloor`) retain map/rooms/stairs/visited Set, remaining loot, merchant stock, rescues, monster templates, permanent boss defeat, floor key state, obstacles, hazards/local time, and once-only descent rewards. They do not snapshot player progression. Ordinary monsters respawn from templates on return; defeated bosses never respawn. Collected items remain collected. Saves last within the run; R/reload resets them.

## Campaign and combat
- Floors 1–9 need their collected floor key for descent. Depth 5 additionally requires Mimic defeat; no princess there. Killing it awards XP/gold and unlocks stairs, without winning.
- Depth 10: no further descent. Dragon defeat awards XP/gold and unlocks the final princess interaction. Space there starts the plot-twist ending rather than the old rescue victory overlay.
- `bossDefeated` saves immediately and survives travel; dead monsters cannot award kill rewards twice. `objectiveText()` updates the HUD only when the objective changes.
- Normal HP growth is 20% per depth and attack growth 15%; XP/gold retain 35% growth. Mimic uses the gentler HP/attack scales. Dragon uses 15% HP and 8% attack growth: depth-10 stats are 376 HP/45 attack, previously 664/108.
- `enemyAttack()` shares one 0.8-second cooldown per monster across retaliation and timed attacks; dodges consume it. Cooldowns use `state.activeTime`, advanced only in active visible simulation.

## Scrolling worlds, keys, and hazards
- World constants are 72×48 tiles (`W`,`H`); viewport constants are 36×24 (`VIEW_W`,`VIEW_H`). Canvas stays 1152×768. `updateCamera()` follows/clamps to the player. All stored positions and visited keys use world coordinates. `draw()` translates the camera, loops only viewport tiles, culls entities with `inCamera()`, and balances context save/restore.
- About 22 varied rooms connect through a nearest-previous-room spanning tree plus extra loop corridors. Down stairs use the room farthest from the entrance by flood-fill distance. `generateObstacles()` accepts pillars/rubble (map value 2) only if every remaining floor tile stays connected; 0 remains walkable and 1 is wall. Protected entities are reserved.
- Floors 1–9 save `floorKey = {carrierId,dropped,collected,drop}`. One ordinary monster is a hidden carrier; death drops exactly one key. Space collection takes priority over stairs/NPCs and permanently unlocks that floor. Dropped keys and collection survive revisits; carriers respawn without duplicating keys. Depth 10 has null floorKey. HUD reports Key state and one-based world Pos; objectives mention missing/dropped keys without exposing the living carrier.
- `hazards`, `obstacles`, and `hazardTime` are saved floor fields. `advanceActiveTime()` advances the current floor's hazard clock only in active visible play; absence from the floor freezes its timers.
- Fire vents cycle 3s on/3s off with phase offsets and deal 4+depth damage at most once/second on an occupied active tile. Rocks start a 1.2s warning on entry, then deal 8+2*depth on impact if still occupied; spent debris stays passable. Spikes have no marker until stepped on, deal 6+depth once, and remain revealed/spent. All damage goes through hurtPlayer and ignores monster-defense armor.
- Hazards stay more than three Chebyshev tiles from both stairs, off NPC/loot/initial monster tiles, and off obstacles. Recreated monsters also avoid hazards and dropped keys. `applyPlayerHazards()` runs after movement and `hazardTick()` during active ticks; health pauses/death interrupt immediately. Rock-warning badges draw above the player; small stones animate downward during the warning.

## Monster combat speech
- The user explicitly requested and approved this feature after the earlier status-only question. `MONSTER_QUOTES` contains four very short attributed film quotations; README links official sources. No audio clips or downloaded media were added.
- `monsterTalk()` runs after a surviving player hit and on an eligible enemy attack attempt. It rotates quotes without consuming RNG or changing combat damage/attack cooldowns. One bubble globally every five active seconds, visible for five; pauses and hidden tabs freeze those clocks.
- Transient `state.monsterSpeech` stores live monster ID/text/expiration; `monsterSpeechReadyAt` and `monsterQuoteIndex` govern timing/rotation. These fields are separate from NPC `state.bubble`, floor saves, and monster templates. Travel/recreation clears speech/readiness while retaining rotation; R resets rotation too. Actor death clears its bubble but retains the global cooldown; player death and ending clear speech.
- `monsterSpeechLayout()` resolves the living actor, checks fog/camera visibility, and clamps the measured rectangle inside the viewport, placing it below top-edge actors. `drawMonsterSpeech()` draws after world/fog/player layers and below hazard warnings. Speech follows actor/camera movement and hides unseen/offscreen actors.

## Plot-twist ending
- `gameOver(true)` delegates to guarded `startEnding()` after the once-only final princess interaction; `gameOver(false)` still shows GAME OVER. Completion sets gameOver/won and freezes normal simulation. Existing final interaction rewards remain once-only.
- Staged canvas timeline: reveal (0–2s); princess runs toward her dragon, says “I love him!”, and heals him with glow/hearts/refilling HP (2–5s); she rides him away as his wings flap and the hero says “…Oh.” (5–8s); crossfade to a sunset with the slumped hero walking toward the sun, receding, and crying pixel tears (8–14s); THE END/run stats remain over the sunset.
- `state.ending` stores elapsed time, phase, completion, identity-bound rAF handle/timestamp, one-shot event Set, and a separate cinematic dragon actor. The recovered actor does not revive combat or undo saved boss defeat. Ending state is not in FLOOR_FIELDS.
- `advanceEnding()` handles deterministic phase progression, once-only journal/audio events, and actor HP. `endingScene()` derives actor poses; `drawEnding()` uses screen coordinates and balances context state, bypassing the world camera.
- Esc/Skip to sunset silently finishes all story milestones; R/New adventure cancels frames and restarts without launch branding. Completed skip is disabled. Old callbacks cannot alter a fresh run or ending. Hidden tabs freeze the animation and clear its timestamp; frame deltas are capped at 0.1s. Normal 220ms enemy ticks do not animate the cutscene.
- Healing and a short sad musical phrase respect master mute and music/effects buses. Objective/captions update only when their text changes. No external media assets or dependencies.

## Recovery and audio
- Potions from ground/treasure/merchant are stored in `inventory`; H drinks one without wasting at full HP.
- `hurtPlayer()` handles damage/death and threshold pauses immediately. Below 20% HP pauses with Drink/Continue; below 10% adds Retreat. Warnings rearm only on recovery to the threshold; lethal damage still kills. Drinking leaves the dialog open until Continue.
- Confirmed retreat goes up one floor with full HP (depth 1 returns to its entrance) and sets `retreatReadyAt` to activeTime + 60 seconds. Cancel consumes nothing. Pause/hidden time and stair travel do not bypass cooldown. Availability appears in HUD and critical dialog.
- Rest heals 2% max HP (rounded, minimum 1) every two seconds after six seconds without combat, with no living monster within three tiles. Pause/hidden/launch time does not accumulate healing or cooldown progress.
- Separate music/effects gain buses and sliders feed master mute. Defaults: music 45%, effects 80%. M/Sound mutes both; changing sliders while muted keeps master muted. Preferences/context survive R and reset on reload. Sound remains locally synthesized and optional.

## Launch and layout
- `#launchScreen` contains a local inline SVG dungeon doorway/swords emblem, fantasy wordmark, version, and Start button. It appears only on initial page load. A non-modifier key or button starts; the initiating key performs no gameplay action. Simulation stays frozen until `state.started` is true.
- R preserves `started` and goes directly into a new run. Reload shows launch branding again.
- `#gameLayout` begins with stats and objective. `#playArea` places a bounded scrolling adventure journal left of the map on desktop; at narrow widths it moves below the map. Canvas logical resolution remains 1152x768 and CSS scales it to fit.
- Equipment now sits on the right, with local SVG sword/shield/ring icons, per-item HP/strength/attack/defense/dexterity modifiers, total HP/strength bonuses, and effective hero stats. Side panels can scroll while the map stays at its native aspect ratio.
- `equipItem()` handles every real pickup/purchase/sale equipment change. Ring adds 20 max/current HP when increasing its health bonus; equal replacement does not stack/heal again. Removal lowers max HP and caps current HP. Level-up HP and floor travel retain the correct totals. Sword retains +6 attack/+2 strength; Shield is a new armor-slot item with +5 defense. ITEM_TABLE now has seven entries.
- `log()` stores the last 80 messages as plain text in `state.messages`, displays history, and scrolls to the latest. R starts a fresh journal.
- Fixed browser default Enter activation: opening retreat no longer immediately clicks the newly focused Cancel button. Y confirms; Enter/Space activates a focused native button. Tab stays in health/retreat dialogs and closing returns focus to canvas.

## Verification and limits
- Syntax: `node --check js/game.js` and `node --check js/sprites.js` pass.
- `node --test tests/game.test.cjs`: 59 pass. Includes floor persistence and 130 varied generation checks, health/recovery/audio tests, complete campaign state flow, permanent boss defeats and reward guards, cooldown timing/dodges, volume controls/mute persistence, prepared endgame duel, Enter default-action regression, launch lifecycle, ring pickup/purchase/replacement/sale with level-up and travel, actual sword/shield combat modifiers, full-world reachability/protection, real floor-key campaign flows, key anti-duplication/priority, every hazard type and timer/death integration, camera clamping/culling, rock-warning layer order, all ending phases/poses, healed actor HP, skip at every phase, world/input freeze, repeated-reward prevention, hidden timing, stale callback rejection, restart cleanup, and screen-coordinate ending drawing. Eight new speech tests cover both combat triggers, rotation, active timing, crowd cooldown, paused/hidden clocks, NPC independence, no added randomness/damage changes, lethal-hit/death/travel/respawn/restart/ending cleanup, visibility, all viewport edges, and drawing layer/context balance.
- Legacy external startup smoke prints `SMOKE_OK`: `/var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/opencode/smoke.js`. It remains outside the repo and unchanged.
- Latest follow-up adds three tests (59 total) for named once-only chat, five-second speech/cooldown guards, boss visual bounds/bars/bubbles across revisits, and varied boss-arena clearance/connectivity plus three-wide hall carving. Syntax and external smoke pass; sprite/palette counts are now 14 each.
- New Chrome check (`/tmp/dungeon-boss-visuals-browser-check.js`) measured quote disappearance after 5.145 real seconds (simulation ticks every 220ms), and verified no duplicate chat, next-quote logging, both boss sizes and bubble/bar placement, clear 22×18 dragon arena, refined ending artwork, skip, and restart. No JavaScript errors. Inspected `/tmp/dungeon-large-dragon.png`, `/tmp/dungeon-large-mimic.png`, and `/tmp/dungeon-refined-ending-dragon.png`; arena overview is `/tmp/dungeon-dragon-arena.png`.
- Controlled Chrome checks over file:// pass for campaign gates/objectives, final rescue victory, boss persistence, retreat cooldown/frozen pauses, scaled healing, separate real audio gains, mute/preferences, and Enter/button controls without JavaScript errors. Real Web Audio gains require floating-point comparison tolerance.
- New scrolling/hazard browser checks over file:// followed a 58-step keyboard route beyond the old viewport bounds, verified the camera and 72×48 world/1152×768 canvas, locked stairs and real key collection/return persistence, pixel-identical hidden spikes before trigger, rock warning/dodge, fire damage, and frozen hazard time during health pause. No JavaScript errors; scrolled and hazard screenshots inspected. Campaign browser flow now collects actual keys before descending and passes final rescue/recovery/audio checks.
- Ending browser check over file:// played the complete animation in 14.05 real seconds, inspected/captured reveal, love, healing, flight, sunset, and THE END frames, and verified frozen dungeon state, Esc skip, button/R restart, and restart during playback. No JavaScript errors. A native canvas/MediaRecorder preview with audio was saved as `/tmp/dungeon-ending.webm` (about 2.3 MB); screenshot stages are `/tmp/dungeon-ending-*.png`. The CLI recording helper lacked ffmpeg, so browser-native recording avoided an installation.
- Launch/layout browser checks verify launch pause, start via button/Enter, hidden branding across R, top stats, left-side journal history/autoscroll, right-side equipment/icon/HP/strength readouts, and no horizontal overflow at desktop widths. Screenshots inspected.
- Monster-speech Chrome check over file:// passes real keyboard combat, real-time expiration/global cooldown, rotation, independent NPC dialogue, scrolled and top/right-edge placement, actor death, travel, restart, and ending cleanup with no JavaScript errors. Scrolled/edge screenshots were visually inspected. Script: `/tmp/dungeon-monster-speech-browser-check.js`; captures: `/tmp/dungeon-monster-speech.png`, `/tmp/dungeon-monster-speech-scrolled.png`, `/tmp/dungeon-monster-speech-edge.png`.
- Prior v0.2 balance baseline and after-tuning diagnostics use the same seed, normal-monster XP, and no gear/incoming damage; they are not a full human campaign. Dragon matchup changes from 16 hits/88 damage per retaliation to 9 hits/25. A separate prepared no-gear duel (full HP, two potions, no dodges, one attack/second, no other attackers) can finish and rescue with real game functions. Human completion rate and subjective audible quality remain unassessed.

## Files and tools
Modified in the latest boss/speech/arena follow-up: `js/game.js`, `js/sprites.js`, `tests/game.test.cjs`, `README.md`, `agents.md`, `tasks.md`, `handover.md`; added boss-visuals-speech design/checklist in `docs/plans/`. Shell/styles and legacy external smoke are unchanged by this follow-up. Earlier design/plan documents remain for context.

Browser tools/scripts/screenshots use temporary locations, including `/tmp/dungeon-ending-browser-check.js`, `/tmp/dungeon-ending.webm`, `/tmp/dungeon-scrolling-browser-check.js`, `/tmp/dungeon-scrolling.png`, `/tmp/dungeon-hazards.png`, `/tmp/dungeon-campaign-browser-check.js`, `/tmp/dungeon-layout-browser-check.js`, `/tmp/dungeon-launch.png`, and `/tmp/dungeon-layout.png`. The Playwright CLI uses temporary npm cache/session paths; no runtime package was added.

## Repository and next action
Workspace: `/Users/vadamec/workspace/ai_tmp/opencode_testing`. Branch `main` now has existing history (latest observed `7f8200d`, `v4`); older handovers describing an untracked repository are stale. The new design file is already staged with additional working changes; staging was left as observed. No commits were made in this follow-up. Do not alter user staging or commit unless asked.

Monty Python monster combat bubbles are implemented and verified following the user's explicit follow-up request and design approval.

No implementation blockers. The next useful step is a human full-run difficulty and audio-preference playtest. Preserve file:// compatibility, plain-script order, current progression/key/trap persistence, world/viewport coordinate separation, campaign gates, and launch-only branding in future work.
