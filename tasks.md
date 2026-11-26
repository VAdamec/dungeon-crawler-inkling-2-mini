# Tasks — Dungeon Crawler

**Release 2.1.0 — alpha (2026-11-26):** user authorized release/publishing and deferred remaining acceptance to alpha testing. [Release record](docs/reviews/2026-11-26-release-2.1.0/README.md) · [alpha checklist](docs/reviews/2026-11-26-release-readiness/manual-acceptance.md). Companion/travel/gold/save/market queues remain complete within their recorded scopes. **Native GR-09 remains UNVERIFIED.** This decision defers the remaining checks; it does not pass them.

## Release 2.1.0 and alpha follow-up

- [x] Set runtime/export/launch version to 2.1.0, preserve save format v1, update player/developer release text and changelog; classify delivery as an alpha GitHub prerelease.
- [x] Prepare deterministic five-file offline ZIP/checksum, final version/older-branded-v1 compatibility check, package integrity/syntax, non-writing bake, extracted smoke and final regression evidence. [Release report](docs/reviews/2026-11-26-release-2.1.0/README.md).
- [ ] Alpha: genuine native GR-09 background/minimize freeze/resume across gameplay/animation/boss/ending and pending dialogs. **UNVERIFIED**.
- [ ] Alpha: genuine OS file-chooser Cancel/Esc/retry, physical mobile/rotation/file/audio behavior, natural full campaign/balance/listening and explicit final visual acceptance.
- [ ] Alpha: rerun corrected Firefox acceptance harness and expand other-engine/native UI coverage. Previous failure remains recorded; no full Firefox pass.

## Pre-release acceptance execution — 2026-11-26

- [x] AC-01 — revalidated exact review ZIP, five-file source/copy/extraction hashes, syntax, non-writing bake, extracted smoke, all 307 game tests and 27 prepared-source tests; runtime/tests/staging preserved.
- [x] AC-02 — recorded available offline Chrome/WebKit desktop/narrow-touch launch/recruitment/key/stair, market Cancel/Confirm, download/reload/file-input/explicit Load, portal and collision flows; 12 bidirectional staged save scenarios across fresh Chrome profiles/relocated folder. Results are automation, not an OS chooser/physical-device observation.
- [x] AC-03 — staged VM mechanics through every floor with real key drops/collection, all 13 boss encounters, four exact save/hydrate checkpoints, final rescue/ending/restart; pure save-model rejection/timing checks. Does not close human campaign/balance/listening/art approval.
- [x] AC-04 — updated checklist, tasks and handover with results, test-harness failure and platform/manual gaps. [Evidence](docs/reviews/2026-11-26-acceptance-run/README.md).
- [ ] AC-05 — complete remaining real native background/minimize and OS chooser observations, physical mobile, natural campaign/balance/listening, final human visual acceptance. **Native GR-09 UNVERIFIED**; native file-tab attempt blocked by tool URL policy, no bypass.
- [ ] AC-06 — finish Firefox acceptance: first desktop flow reached a request-count assertion failure; reload-request assumption was corrected in the review harness; the corrected runner still needs a real Firefox retest in a permitted isolated environment. No overall Firefox pass; WebKit passing does not cover all other browser engines.


## Release-readiness review —2026-11-26

- [x] RR-01 — reconciled current task/agent/developer/plan/prompt status: completed feature/GR queues are distinguished from historical FG/prototype checkpoints; tracked payload and completed GR-08 cinematic audit are explicit.
- [x] RR-02 — prepared [manual acceptance checklist](docs/reviews/2026-11-26-release-readiness/manual-acceptance.md), with tester/device/browser/package identity, procedures/evidence and all manual results still pending. Preparing the checklist does not execute it.
- [x] RR-03 — verified a deterministic minimal five-runtime-file review ZIP and relocated extraction: hashes/CRC/script order/dependencies, fresh offline/storage-disabled Chrome desktop/touch native market/save-download/reload/import/portal/stair/collision checks, adapted external package smoke, syntax/non-writing bake/27 preview tests. [Review/manifest](docs/reviews/2026-11-26-release-readiness/README.md). Full307 game/87 focused results are reused from matching-hash M3, not claimed rerun here.

**Still open after the acceptance run:** native GR-09 **UNVERIFIED**; manual chooser cancellation, physical mobile, remaining browser/Firefox coverage, human campaign/audio/balance and final human visual acceptance. WebKit automation is now recorded above. See the manual checklist. Review preparation/technical package verification was complete within that earlier request; subsequent user approval selected 2.1.0 alpha and deferred remaining checks as recorded above. Deferred themed extras remain optional scope decisions.

**Historical graphics checkpoint (2026-11-25):** GR-01–GR-08 complete; **GR-09 partially open only for native background-tab visibility observation**. **181 game tests and 27 preview tests pass.** Automated behavior/browser/secrecy/state/performance checks and two fixes are recorded in [GR-09 evidence](docs/reviews/2026-11-25-graphics-recovery/gr09/README.md). Automated Chrome never exposed a native hidden state; the explicitly emulated visibility handler passes and is not claimed as native coverage. Release 2.0.0 is now explicitly authorized after documentation and checks; unrelated gameplay drafts must remain outside the release. GR-10 documentation is complete by explicit user request; it does not close GR-09. Finish the native visibility observation before closing acceptance.

Last reviewed: 2026-11-26. **Release 2.0.0** includes the integrated reference-led graphics and simplified player documentation. The following v1.0.1 description is a historical gameplay baseline: release v1.0.1 includes connected walls confined to blocked tiles, readable crypt flagstones, and smooth movement, walking/wing/flame animation, the ? Help & settings dialog, 2× world zoom (18×12 view), the approved static graphics refresh, boss-defeat flourishes, the explored-area minimap with a compact Hero stats panel above a larger log and Spells under Gear bonuses, monster combat quotes, larger bosses/arenas, ranged/magic combat with out-of-combat mana regeneration and Magic Barrier, tiny defeated-boss companions with adjacent-tile following, fog light, 1 damage and ironic remarks, the persistent fully visible town hub with grass/sand roads, huts, Inn, Store, villagers, wandering animals, river, bridge and dungeon gate, retreat-to-town with an exact saved dungeon return point, Town Scrolls with one-use town portals, depth 1 ▲ stairs back to town, five biomes on 96×64 floors, the 100-floor boss campaign with surprise bosses and a max hero level of 100, dedicated boss art and intro/defeat animations, the Skeleton King throne room, the ~ developer console with hero-stat-freezing, monster-killing god mode, and the plot-twist ending. See `handover.md` for details and `README.md` for controls.

Historical wall-patch verification (2026-11-24): **155 behavior tests**, script syntax checks and external smoke passed; current unreleased implementation evidence is307 game/27 preview tests in M3. Offline Chrome checks cover wall materials, narrow-corridor collision/movement, Help and restart; see [wall rendering evidence](docs/reviews/2026-11-24-wall-rendering.md). Weighted spawning and nearest spell targeting were resolved in 1.0.0. The [JRPG implementation review](docs/reviews/2026-11-24-jrpg-implementation.md) records the earlier graphics-only comparison. Historical verification counts below refer to their implementation dates.

## Existing gameplay
- [x] Keep a thin HTML shell, CSS, and three ordered plain scripts with no runtime dependencies or build step; launch over `file://`.
- [x] Equipment bonuses, trading, rescues, gold rewards, HUD, speech bubbles, turn counter, and centralized death handling.
- [x] Hundred-floor campaign: floor keys plus data-driven boss gates unlock lower stairs; dragon defeat unlocks the final princess interaction; it starts the animated plot twist.

## Persistent floors — complete
- [x] Preserve layout, rooms, stairs, exploration, remaining treasures/potions, merchant stock, and rescue state across floor changes.
- [x] Preserve current HP, stats, XP, gear, potion inventory, gold, kills, and turn count; remove old player snapshot rollback.
- [x] Recreate ordinary monsters at full HP from independent templates on return, away from arrival tiles and without duplicate positions. Defeated bosses remain defeated.
- [x] Use Space on ▲/▼; Q/Backspace also ascends at ▲. Arrive at the connecting staircase; depth-1 ascent returns to town.
- [x] Keep explored terrain and discovered stairs, treasures, and potions visible; render treasure chests.
- [x] Keep collected treasures/potions collected. This follows the later wording and replaces the earlier conflicting potion-respawn request.
- [x] Award descent/full-clear descent rewards once per floor, preventing repeated staircase rewards.
- [x] Verify floor round trips and persistent merchant/rescue state; prevent generated NPC/loot overlap with stairs and one another.

## Health and retreat — complete
- [x] Store found/purchased potions; H drinks one, caps healing, and does not consume at full HP. Show count in HUD.
- [x] Pause below 20% HP with Drink/Continue; below 10% add Retreat. Lethal damage still kills. Warnings rearm only after recovering to their threshold.
- [x] Freeze enemies, healing, and combat cooldown while paused. Stop remaining attacks immediately when a threshold is crossed.
- [x] Confirm or cancel retreat. Confirmation returns to town with full HP and saves the exact dungeon depth/tile; the gate returns there once. A 60-second active-time cooldown prevents repeated full heals; HUD/dialog show availability.
- [x] Heal 2% maximum HP (rounded, minimum 1) per two active seconds after six seconds without combat and no living monster within three tiles; paused/hidden time does not accumulate.
- [x] Support dialog buttons, keyboard shortcuts, focus restoration, and trapped Tab navigation.

## Audio and help — complete
- [x] Generate retro music and attack/hit/heal/death/pickup/stair effects locally. Start audio on user interaction; M/button mutes both music and effects.
- [x] Handle unavailable audio without breaking gameplay; retain mute and separate music/effects volume settings across R. Sliders do not override master mute.
- [x] Expand in-game help and add `README.md` with launch instructions, controls, rules, and checks.
- [x] Update agent guidance, handover, and task status; record approved design and implementation checklist in `docs/plans/`.

## Campaign and balance — complete
- [x] Gate depth-5 descent on Mimic defeat; make final depth-100 dragon defeat unlock rescue rather than immediately win.
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
- [x] Generate 96×64-tile worlds targeting 32 rooms, branching corridors, loops, and distant stairs; use an 18×12-tile camera viewport at 2× zoom.
- [x] Follow the player with a clamped camera, cull every drawing layer to the viewport, and retain world-coordinate exploration on revisits.
- [x] Secretly assign one ordinary key carrier per floor 1–99; drop/Space-collect the key, permanently unlock stairs, and preserve dropped/collected state without duplicates.
- [x] Keep depth-5 Mimic defeat as an additional gate; use the data-driven boss gates through depth 100 and final dragon-then-rescue ending.
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
- [x] `node --test tests/game.test.cjs`: all 132 tests pass in the 2026-11-24 review. Earlier test counts below are historical.
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
- [x] Review all phases with syntax, 132 behavior tests, external smoke, selected Chrome file:// scenarios and updated docs on 2026-11-24. Full human campaign playtesting remains open. Local Node can use `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`; no symlink is required.

## Implemented — companion, town hub, retreat, and Town Scroll (2026-11-24)
- [x] Implemented: make the defeated-boss minion a logical adjacent follower that is clearly visible and affects fog/exploration. `docs/plans/2026-11-24-companion-follow-fog-plan.md`.
- [x] Implemented: start runs in a small persistent, fully visible town with grass/sand roads, huts, Inn/Store doorsteps, talking villagers, wandering cats/dogs/chickens, river, trees, bridge, and a dungeon gate. `docs/plans/2026-11-24-town-hub-plan.md`.
- [x] Implemented: change confirmed retreat to return to town while preserving full HP, the 60-second active-time cooldown, and an exact saved dungeon return point. `docs/plans/2026-11-24-retreat-to-town-plan.md`.
- [x] Implemented: add a Town Scroll item/shortcut that teleports to town and opens a one-use return portal to the exact dungeon tile. `docs/plans/2026-11-24-town-scroll-plan.md`.
- [x] Implemented all 2026-11-24 plans in dependency order and updated syntax, behavior tests, smoke, browser checks, help, README, agent guidance, and task status as each plan landed.
- [x] Implemented the first companion: a very sarcastic twice-size talking cat waiting near the dungeon entrance, joining before the first descent to bring meat and money home to its wife and children, with a tiny attack and a special love of killing bats. `docs/plans/2026-11-24-first-companion-cat-plan.md`.

## Review follow-ups — 2026-11-24

- [x] Prepare release 1.0.1: launch version, README, dedicated changelog entry and current handover/tasks; retain the committed 1.0.0 history.

- [x] Fix fragmented wall rendering and apparent wall walking: join exposed wall edges, confine faces to blocked tiles, distinguish crypt flagstones, and verify corners/cache/paint bounds plus one-tile corridor collision. All 155 tests and offline arrow-key corridor checks pass; [evidence and previews](docs/reviews/2026-11-24-wall-rendering.md).
- [x] Update changelog, README screenshots, illustrated bestiary and magic reference; reconcile current plan/handover status.
- [x] Sample the entire weighted `spawnPool()` using its length; regression cases drive every weighted slot on floors 1, 2 and 100, preserving biome duplicates and minimum-depth gating.
- [x] Make both Magic Barrier and Frostbolt choose the nearest eligible enemy by tile distance, breaking equal-distance ties by lowest monster ID without RNG or live-array sorting. Cover ordering, eligibility, range boundaries, mana/cooldowns, push/damage and empty casts.
- [x] Verify these fixes: 151 behavior tests pass, both scripts pass syntax checks, external smoke reports `SMOKE_OK`, and both spell hotkeys select the nearest enemy in offline Chrome without browser errors or network requests.
Human campaign/audio follow-up is the same open playtest tracked above and in the current manual checklist; it is not a second independent campaign requirement.
- [ ] Decide whether to schedule the expansion design’s deferred themed extras: recurring themed encounters, Cook throwing-pan attacks and extra themed food/mug/stool content.
- [x] REVIEW/P0 (2026-11-26) — [prototype audit and readiness matrix](docs/reviews/2026-11-26-p0-prototype-audit/README.md). Syntax passes; latest focused snapshot 8/8 after a concurrent assertion correction (initial 7/8). Diagnostic probes reproduce cancelled ring HP/spell leaks, unsafe debug inputs, locked selection after R and missing menu guards/art. Documentation only; no runtime/test edits by this task. At the P0 checkpoint T1/T2, C1–C3, M1–M3 remained open; later T1 completion is recorded below.
- [x] Companion selection — [plan](docs/plans/companion-selection-plan.md): **C1–C3 complete** with the separate native GR-09 exception retained. Core model, picker/post and companion integration verified.
- [x] Teleportation/debug extensions — [plan](docs/plans/teleportation-scenarios-plan.md): T1/T2 complete, including command discovery and developer documentation. Existing player scroll/portal/retreat stays intact. The six historical companion/cinematic failures were resolved by C1 below.
- [x] T1 debug-portal hardening (2026-11-26) — exact zero arity, hidden/living/modal guards, preserved free save/return path and six regression groups. [Evidence](docs/reviews/2026-11-26-t1-debug-portal/README.md): 20 focused + 27 preview tests pass; syntax/bake/SMOKE_OK and actual file:// desktop/mobile pass. Full suite **189/195**, with all six companion/cinematic failures reproduced on pre-T1 source. No full-suite acceptance claim; preserve those failures for companion work.
- [x] T2 `addScrolls` hardening (2026-11-26) — exact arity/ASCII decimal input, positive safe count and safe total, living/visible/modal guards; town/dungeon/god-mode/portal preservation. Four new regression groups and expanded [developer command guide](DOCUMENTATION.md#developer-console). [Evidence](docs/reviews/2026-11-26-t2-add-scrolls/README.md): 25 focused + 27 preview tests pass, syntax/bake/SMOKE_OK and actual desktop/mobile-width file:// checks pass. Full suite **193/199**, same six failures reproduced on pre-T2 source. Next phase C1 when requested; native GR-09 remains unverified.
- [x] C1 companion registry/run-model corrections (2026-11-26) — dedicated themed roles, finite animation phase for string IDs, strict factory/activation, independent first-entry latch, starter/reset/retirement/unlock lifecycle and Pip targeting/remarks. Eight new regression groups. [Evidence](docs/reviews/2026-11-26-c1-companions/README.md): **207/207 game tests**, 48 focused, 27 preview, syntax/bake/SMOKE_OK and actual file:// desktop/mobile-width boss/ending checks pass; nine seeded world/progression/RNG snapshots match. C2/C3 and native GR-09 remain open.
- [x] C2 companion picker/post UI (2026-11-26) — safe code-drawn post, reachable placement, nearby Space/touch entry, both starter recruitments, launch arrows, identity-bound accessible fixed modal, Keep/Cancel/readiness/focus preservation, locked/stale/range guards and M/R controls. Eight new regression groups. [Evidence and screenshots](docs/reviews/2026-11-26-c2-picker/README.md): **215/215 game tests**, 56 focused, 13 Help/launch and 27 preview tests pass; syntax/bake/SMOKE_OK, nine seeded state/RNG matches and desktop/mobile touch-swipe browser checks pass. C3 next when requested; native GR-09 remains unverified.
- [x] C3 companion integration (2026-11-26) — common simulation guards; stop the current enemy tick when a companion starts boss defeat. Nine new regression groups. [Matrix/evidence](docs/reviews/2026-11-26-c3-integration/README.md): **224/224 full game**, 75 focused, 27 preview; syntax/bake/SMOKE_OK, nine seeded state/RNG matches, eleven-companion full-canvas/minimap secrecy and desktop/mobile travel/health/retirement/lifecycle checks pass. Native GR-09 remains unverified. Market M1 is next in the original sequence; new gold/save plans below do not authorize implementation.
- [x] Fix all six baseline companion/cinematic test failures — resolved in C1. Cook/Bartender identity is explicit; string companion IDs no longer produce NaN animation frames. One old Cook sprite expectation changed to the planned dedicated art; all combat/progression and cinematic timing/stale-callback assertions remain active. Historical failure logs retained in T1/T2/C1 reports.
- [x] Prepare market buy/sell plan (2026-11-26) — [canonical cart design](docs/plans/2026-11-26-market-transactions-design.md). User chose preview cart, Confirm applies, Cancel/Esc discards; Undo/Reset before confirmation.
- [x] M1 economy/draft core (2026-11-26) — shared pure pricing/stats/equipment/spell transitions, detached frozen opening/rules/draft/history, stable local stock rows, accepted operation journal, safe arithmetic, selected-item buys/sales and exact Undo/Reset including ring/god-mode HP. [Evidence](docs/reviews/2026-11-26-m1-market/README.md): **283 full game /10 M1 /27 preview pass**, syntax/bake/SMOKE_OK;18 seeded before/after state/stat/RNG scenarios and desktop/touch-emulated file:// model/Help/audio/connected-stair checks pass. No UI wiring/commit/state-field/schema/art/player-doc/release changes. Native GR-09 remains **unverified**.
- [x] M2 selected-item market UI/commit (2026-11-26) — fixed accessible Buy/Sell/cart dialog, nearby Store/exact dungeon access, session-captured controls, projected details/HP/stats/operation list, Undo/Reset, guarded explicit replay-validated once-only commit/save and scoped rollback; live-mutation/first-buy/sell-all paths removed. Thirteen new regression groups and nine migrated economic/persistence interaction tests. [Evidence/screenshots](docs/reviews/2026-11-26-m2-market/README.md): **296 full game /32 focused /27 preview pass**, syntax/bake/SMOKE_OK,18 seeded state/stat/RNG matches, real file:// desktop/touch-emulated town/dungeon keyboard/click/tap/Cancel/Confirm/revisit checks pass. Minimal player controls corrected, developer docs/plans/prompt/handover updated. M3 remains open; native GR-09 remains **unverified**. No art/schema/release/git changes.
- [x] M3 integration/recovery (2026-11-26) — direct action/attack helper guards, post-paint clock reset, failed open/close and audio recovery, identity-bound backdrop, forced-during-commit rollback before world/run switches. Eleven new groups; [evidence/matrix/screenshots](docs/reviews/2026-11-26-m3-market/README.md): **307 full game /87 focused /27 preview pass**, syntax/bake/SMOKE_OK;24 seeded state/stat/RNG matches, actual desktop/touch/narrow/landscape file:// shopping/recovery/portal/companion/health-Help/restart checks pass. Bounded large-inventory timings recorded; player/developer docs, plans/prompt/tasks/handover updated. Market queue complete within recorded scope; **native GR-09 remains unverified**, with physical mobile/other-engine and S4 native chooser-cancel limits unchanged. No release/git/art/schema/balance changes.
- [x] Review all three plans and prepare [bounded local LLM prompt](docs/prompts/2026-11-26-companions-travel-trading-local-llm.md), [master phases](docs/plans/implementation-plan.md) and [findings](docs/reviews/2026-11-26-gameplay-plans-review.md). Planning only; REVIEW/P0 is now complete; see the audit above. T1, T2, C1 and C2 were subsequently requested and completed; C3 was subsequently completed; new feature phases need their own request. Historical test totals do not validate the concurrent edits; GR-09 native visibility remains unverified.

## GoldADD implementation and portable save/load plans (2026-11-26)

G1 goldADD and S0–S4 portable save/load are complete within the recorded Chrome desktop/touch-emulated acceptance scope. See S4 below for measured performance and remaining platform limits. M1–M3 market are complete within the documented acceptance scope. No additional phase is implicitly authorized.

- [x] Prepare [goldADD plan](docs/plans/2026-11-26-goldadd-plan.md) and [local LLM prompt](docs/prompts/2026-11-26-goldadd-local-llm.md). Public command `goldADD <amount>`; strict additive safe-decimal behavior proposed.
- [x] REVIEW/G0 goldADD (2026-11-26) — [current-code gap/readiness audit](docs/reviews/2026-11-26-g0-goldadd/README.md). Command/helper/discovery absent; strict T2 pattern and HUD ready for reuse. 14/14 existing focused tests pass; four VM contexts/twelve submissions confirm Unknown command and no semantic mutation. Protected runtime/tests unchanged. G0 found no blocking design question; **G1 was subsequently requested and completed below**.
- [x] G1 goldADD (2026-11-26) — strict additive ASCII-decimal helper/dispatch, safe current/amount/total, console/god-mode allowed and player-menu/cinematic/hidden/dead guards. Five regression groups; startup/help/HUD and developer guide updated. [Evidence](docs/reviews/2026-11-26-g1-goldadd/README.md): 229 full game / 19 focused / 27 preview tests pass. Syntax, non-writing bake, external SMOKE_OK and actual desktop/touch-emulated mobile file:// console/HUD checks pass with no RNG/audio/other gameplay mutation. Native GR-09 remains unverified. Save phases are tracked below; market M1–M3 remains pending.
- [x] Confirm save transport with user: **manual portable JSON files, no browser-storage dependence**. Prepare [save/load design](docs/plans/2026-11-26-save-load-design.md), [bounded phases](docs/plans/2026-11-26-save-load-plan.md), [LLM prompt](docs/prompts/2026-11-26-save-load-local-llm.md) and [planning findings](docs/reviews/2026-11-26-gold-save-planning.md). S0 recommendations below refine the detailed policies; implementation still requires a phase request.
- [x] REVIEW/S0 (2026-11-26) — [82-field/schema/alias audit and size evidence](docs/reviews/2026-11-26-s0-save-load/README.md). Active cache overlays, high-level XP unsafe-integer exception, current-only/unbounded dead guard history, scoped IDs, blocked/debug return points and town aliases reconciled. Two 100-floor content/exploration projections ~7.99 MiB; ~8.55 MiB with 10,000 extra potions. Keep 32 MiB plus structural/count limits, explicit over-limit refusal; no claim to accept infinite histories. 12 existing focused tests and review diagnostics pass; protected runtime/tests unchanged. **S1 was subsequently requested and completed below.**
- [x] S1 pure save-data (2026-11-26) — explicit detached version-1 capture/serialize/parse/validate APIs; bounded UTF-8/structure/schema and cross-field checks, active-cache overlays, exact encounter/guard history, XP exceptions, companions/portal/ring/once-only data. Twelve new regression groups; [evidence](docs/reviews/2026-11-26-s1-save-data/README.md): **241 full game /12 focused /27 preview pass**, syntax/bake/SMOKE_OK pass. Two final 100-floor DTOs ~7.99 MiB / ~1.46M nodes (~8.55 MiB with 10k potions). Node validation ~2.5s; browser large-file responsiveness remains pending. Pure API desktop/touch-emulated mobile file:// checks pass; no download/hydration/UI or live loading. S2 followed in the next checkpoint; S3–S4 remain open and native GR-09 unverified.
- [x] S2 detached hydration/atomic loading (2026-11-26) — complete runtime candidate/Sets/aliases, exact hero/gear/current encounter/dead guards/companions/portal/clocks, receiving audio/art reuse and fresh transients; identity-bound load sessions freeze play and reject stale/cancelled/repeated/forced-transition confirmations. Presentation-only paint preserves warning latches; injected paint failure rolls back old state, canvas pixels, HUD/Help/focus. [Evidence](docs/reviews/2026-11-26-s2-save-load/README.md): **256 full game /15 focused /27 preview pass**, with fifteen new regression groups. Syntax/bake/SMOKE_OK and actual desktop/touch-emulated mobile file:// commit/rollback/launch/death checks pass. New transient loadSession is never serialized; forced discard resets clocks without credit. S3 file UI followed below; S4 remains pending and native GR-09 unverified.
- [x] S3 file controls (2026-11-26) — Help Save/Load and launch/death Load; local Blob JSON downloads with honest feedback/URL cleanup; fresh session-bound input/read identity, size-before-read, validated preview and explicit deferred confirmation; same-file, native-cancel handler/visible Cancel fallback, focus trap/return/audio and stale read/validation/commit cleanup. [Evidence](docs/reviews/2026-11-26-s3-file-ui/README.md): **266 full game /12 focused /27 preview pass** (10 new groups), syntax/bake/SMOKE_OK. Actual desktop/touch-emulated mobile file:// download/reload/import, town and damaged dungeon encounter, oversize-before-read, cancellation/focus/reselection/late reader checks pass; screenshots inspected. Native OS chooser cancellation/GR-09 and full S4 portability/large-file performance remain unverified. No release/market/art changes.
- [x] S4 (2026-11-26) — twelve actual JSON scenarios bidirectionally across two fresh Chrome profiles and original/copied file:// paths, reload/death imports, storage disabled, zero remote requests/errors. Fully explored100-floor/10k-potion and exact32MiB-input files accepted; UI stalls fixed with cancellable shared validation/hydration/export steps. Seven new regression groups; **273 full game /44 save /27 preview tests pass**, syntax/bake/SMOKE_OK. Player/developer docs, screenshots, credits and changelog updated. [Acceptance/performance/evidence](docs/reviews/2026-11-26-s4-acceptance/README.md). Native GR-09 remains **unverified**; physical mobile/other-browser compatibility and manual OS chooser-cancel observation are not established. No market/art/release/git actions.

Save/load must preserve collected content and once-only rewards while restoring the current monster encounter; later floor revisits retain existing ordinary respawns. No raw state serialization, browser object persistence, ring reapplication, load regeneration/healing or offline catch-up. Native GR-09 remains unverified.

See [review findings](docs/reviews/2026-11-24-status-review.md#findings).

## Graphics completion and remaining acceptance — reconciled2026-11-26

GR-01–GR-08 and GR-10 are complete. `js/art-runtime.js` is required, tracked, present in the recorded2.0.0 tag and included in the current clean review package. The earlier partial-migration/test-memory checkpoint is historical; do not restart that work. GR-08 completed the technical cinematic audit. **GR-09 remains open only for native background/minimize observation; final human visual acceptance is separate.** Current feature/testing status is the header and latest handover, not older counts below.

The [graphics recovery plan](docs/plans/2026-11-25-graphics-recovery-plan.md) and [FG design record](docs/plans/2026-11-25-final-graphics-implementation-plan.md) retain earlier task details. Use the [current manual checklist](docs/reviews/2026-11-26-release-readiness/manual-acceptance.md) for outstanding observations; technical graphics/feature implementation is complete within its recorded scope.

- [x] Prepare selected knight, 25 character sheets, 31 item/effect families, 24 environment families, nine final scene views and all 76 current-role source mappings. This is source/preparation coverage, not runtime acceptance.
- [x] Start deterministic bake and runtime rendering integration. GR-04 verifies full source-crop RGBA round trips; complete cinematic, semantic and browser performance acceptance remains pending.
- [x] GR-01 (P0, 2026-11-25): fixed full game test heap exhaustion without bigger heap defaults, skips, or silent recorder truncation. Bounded canvas recorder + 1x1 art-decode filter/counter, overflow error, canvas ImageData/state stubs; preserved no-DOM rendering coverage. Full suite now 155/155 pass, ~74.6s, ~567MB max RSS. Evidence: `docs/reviews/2026-11-25-gr01-test-memory.md`. Side fixes exposed by full run: `dungeonWallEdges()` boundary semantics; two intent-preserving art-runtime-era tests.
- [x] GR-02 (P0, after GR-01): unify strict kind-aware resolution, remove duplicate `artHas()`, fix `throne`→dais and semantic aliases in bake source; regenerate and verify all roles/states/directions.
- [x] GR-03 (P0, after GR-02): replace weakened assertions with independent source/scale/anchor/union-bounds contracts, including large bosses, feet, culling and cache reuse.
- [x] GR-04 (P1, after GR-03): prove deterministic full RGBA bake round trips; measure and address justified size/memory/startup/render costs.
- [x] GR-05 (P1, after GR-03): runtime parity for five materials, all raw/normalized wall masks and accepted edge/corner fixtures.
- [x] GR-06 (P1, after GR-04/05): new town terrain, door/bridge/gate alignment and unchanged layout/travel/actors.
- [x] GR-07 (P1, 2026-11-25): phase-correct trap/effect dispatch, distinct animated heals, directional projectiles, authored actor gait/stable feet, visible portal loop, fog secrecy and seven new regressions. [Evidence](docs/reviews/2026-11-25-graphics-recovery/gr07/README.md).
- [x] GR-08 (P1, 2026-11-25): all-nine boss/guard/companion/ending call-site matrix, source-anchored defeats and fitted portraits, real guard collapse, authored wing/run/sunset poses, eight new regressions and actual file:// captures. [Audit and evidence](docs/reviews/2026-11-25-graphics-recovery/gr08/README.md).
- [ ] GR-09 (next; P1): automated suites/smoke/browser scenarios, strict secrecy pixels, 33 committed-baseline state comparisons and paired performance measurements completed; fixed live-monster foot anchors and scale-dependent sprite cache growth with two regressions. **Remaining: native hidden/background transition**, unavailable under automation despite headed/background/minimize attempts; handler fixture passes separately. [Evidence and measured limits](docs/reviews/2026-11-25-graphics-recovery/gr09/README.md).
- [x] GR-10 (2026-11-25, documentation authorized with GR-09 exception retained): refreshed README/bestiary figures and actual runtime captures, credits/provenance, developer/agent guidance, plans and delivery/hash ledger. Runtime/source pixels unchanged; required generated art is now tracked and present. **GR-09 native background-tab check is still unverified.** [Evidence](docs/reviews/2026-11-25-graphics-recovery/gr10/README.md). Subsequently authorized release 2.0.0 includes the required generated payload; unrelated gameplay drafts remain excluded.

GR-05/06 follow-ups also stabilize wall torch mounts and ground item placement (including the reported potion overlap). The broader GR-07 motion/semantic/secrecy audit is now complete; GR-08 cinematic coverage is now complete. Automated graphics acceptance/performance and GR-10 delivery are complete; native GR-09 and final human visual acceptance remain open.

FG-01's final human visual acceptance record remains pending; its technical cinematic coverage audit was completed by GR-08. Original unchecked FG rows are historical design criteria mapped to GR evidence, not new implementation work. T1/T2, C1–C3, G0/G1, S0–S4 and M1–M3 are complete in their dated scopes; preserve all existing worktree changes.

## Implemented — classic JRPG graphics (2026-11-24)

Both artwork stages and runtime integration were explicitly approved. The graphics refresh is implemented; [verification and limits](docs/reviews/2026-11-24-jrpg-implementation.md) are recorded. Existing gameplay, clocks, map dimensions and offline launch remain intact. No staging/commits.

[Design and task details](docs/plans/2026-11-24-classic-jrpg-graphics-plan.md) · [Runtime asset inventory](docs/previews/2026-11-24-classic-jrpg/inventory.md)

- [x] JRPG-01: baseline, asset/direction/frame inventory, before captures and same-browser performance comparison.
- [x] JRPG-02A: structural town/dungeon/character focus preview, approved by the user.
- [x] JRPG-02B: remaining monsters, bosses, items and biomes, approved by the user with an explicit implementation request.
- [x] JRPG-03: original dungeon materials, known wall faces and shared visual helpers.
- [x] JRPG-04: directional humanoids, explicit art bounds and preserved walking/wing/cast/flame clocks.
- [x] JRPG-05: town architecture/scenery, NPC/animal art, companion visibility and unchanged interaction footprints.
- [x] JRPG-06: complete monster/boss/item/hazard/FX catalog and refreshed cinematic artwork with existing lifecycle/timing.
- [x] JRPG-07: 138 tests, syntax, smoke, selected file:// browser scenarios, pixel secrecy and rendering-cost comparison.
- [x] JRPG-08: runtime screenshots/bestiary, changelog, agent guidance, inventory and handoff.

Unrelated gameplay fixes and full human difficulty/audio playtesting remain separate backlog items.

## Constraints
- All runtime files are in this project directory. No runtime installation or server is needed.
- Live state persists in memory; R/reload clears unsaved progress. Manual JSON Save/Load restores an explicitly saved adventure without browser-storage dependence.
- Keep functions flat and mutable game state in `state`; no modules, dependencies, or build step.
- Keep the legacy smoke test outside the repo: `/var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/opencode/smoke.js`.
- Branch `main` has existing history. Check current git status rather than relying on old handover commit IDs; preserve user changes/staging and do not stage or commit unless explicitly asked.
