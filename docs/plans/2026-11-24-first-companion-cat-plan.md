# First companion: Marmalade, the gate cat

Status: implemented on 2026-11-24. Marmalade waits beside the town gate at 1.5 scale, recruits with Space or auto-joins on the first descent, uses `CAT_LINES`, prefers bats for 2 damage while dealing 1 to other monsters, follows through travel/town transitions, retires once before the first boss companion, and stays transient with `state.entranceCat`. Sprite, help, README, agent guidance, tests, and task status are updated.

## Goal
Make the first companion a large, sarcastic talking cat waiting beside the town dungeon gate. The hero can recruit it before the first descent; it follows into the dungeon, helps in a deliberately tiny way, obsesses over bats, and explains that it is doing this for meat and money for its wife and children.

## Dependencies
- Requires the town hub plan: `docs/plans/2026-11-24-town-hub-plan.md`.
- Builds on the companion/follow/fog plan: `docs/plans/2026-11-24-companion-follow-fog-plan.md`.
- Coordinates with boss companions and the single active `state.companion` slot.

## Assumptions and decisions
- The cat is named **Marmalade** to distinguish it from the ordinary town cat `Mochi`.
- “First companion” means the initial companion before the first boss kill. Later boss kills keep the existing behavior of replacing the active companion; Marmalade retires once with a log line before that handoff.
- Recruitment is normally by Space while adjacent to the waiting cat. If the hero enters the dungeon without talking to it, Marmalade auto-joins on that first entry so the requested “accompany him before first entry” always happens.
- “Very small attack” means 1 damage to ordinary monsters, still on the existing three-second companion cadence. Its bat obsession grants only +1 damage against bats (2 total) and first-target priority; boss companions remain exactly 1 damage.
- “Bring meat and money home” is narrative motivation, not an inventory/quest system. It is expressed in intro, bat, gold, and retirement lines; no new item or quest state is required.
- The cat uses a dedicated `catCompanion` sprite derived from the existing cat art, with a collar/tag so it reads as a specific character. No external assets.

## Design
1. Add the waiting town actor:
   - In `genTown()`, add `{ name: 'Marmalade', sprite: 'catCompanion', x: 53, y: 30, scale: 1.5, isEntranceCat: true }` to `state.town.animals`, using a nearby walkable tile if that coordinate is ever blocked. It is deliberately two tiles from the gate tile so gate interaction is not stolen.
   - Keep it non-blocking and non-colliding like existing animals; `townTick()` should not patrol it before recruitment.
   - Extend `drawTownNpcs()` to honor an actor `scale` field so the waiting cat renders at 1.5, exactly twice the ordinary town cat’s 0.75 scale.
   - Add a small gate-side bubble when the hero is adjacent and the cat is unrecruited, such as `Space: negotiate with Marmalade`.
2. Add recruitment state and helper:
   - Add transient run-level `state.entranceCat = { recruited: false, entered: false, retired: false }` in `newGame()`. Never add it to `FLOOR_FIELDS`, monster templates, or floor saves.
   - Add `joinEntranceCat(auto)`:
     - Return if already recruited/retired or if an active companion exists.
     - Set `state.companion = { name: 'Marmalade', sprite: 'catCompanion', kind: 'cat', scale: 1.5, damage: 1, batBonus: 1, x: cat.x, y: cat.y }`.
     - Mark the town actor hidden and `state.entranceCat.recruited = true`.
     - Reset companion speech/timers, call `placeCompanionNearPlayer()`, log the explicit or auto-join introduction, and play a soft familiar/meow cue if one exists.
   - Add `talkToEntranceCat()` that calls `joinEntranceCat(false)` and then a `companionTalk('intro')` line.
3. Route interaction and first entry:
   - In `townInteract()`, check the unrecruited entrance cat before the gate so Space near the cat never accidentally enters the dungeon.
   - In `enterFloor()`, when leaving town and `!state.entranceCat.entered`, call `joinEntranceCat(true)` first and set `entered = true`. This covers the gate, Town Scroll returns, and `loadLevel <depth>` from town without duplicating logic.
   - Once recruited, the cat uses normal `placeCompanionNearPlayer()` calls, follows across floors, follows through retreat/Town Scroll returns, and is drawn by `drawCompanion()` in town and dungeon like other companions.
4. Give the cat its own voice:
   - Add `CAT_LINES` with `intro`, `bat`, `boss`, `trap`, `retreat`, `merchant`, and `rescue` pools. Lines should be dry and family/provision-themed; examples: `I am here for the meat and the money. The wife and children have standards.` and `A bat. Finally, payroll with wings.`
   - Update `companionTalk(kind)` to select `CAT_LINES[kind]` when `state.companion.kind === 'cat'`, otherwise keep the existing `COMPANION_LINES` pool. Keep the shared cooldown, duration, quote rotation, and attributed `log()` behavior.
   - Call `companionTalk('bat')` when a visible bat becomes Marmalade’s target and when a bat dies, subject to the existing cooldown. Do not log on every render.
5. Adjust combat minimally:
   - In `companionTick()`, keep `visibleTargets(3, companion)` and the three-second cadence.
   - For `kind === 'cat'`, prefer a bat target over the nearest ordinary target. Damage is `1 + (target.sprite === 'bat' ? companion.batBonus : 0)`; all non-cat companions still use exactly 1.
   - Preserve projectile sourcing from the companion logical tile, fog/camera checks, active-time gating, and god-mode/death/ending freezes.
6. Retire on the first boss companion:
   - In the boss-kill path before `adoptBossCompanion(m)`, if the active companion is Marmalade and `!state.entranceCat.retired`, log a one-time retirement line, mark `retired = true`, and clear the cat speech bubble before the boss companion replaces `state.companion`.
   - Do not attach the retirement line to the new boss companion. Do not re-add the waiting town cat after retirement.
7. Visuals and UI:
   - Add `catCompanion` to `townSpriteGrid()` and `SPRITES`/`SPRITE_PALETTES` in `js/sprites.js`: reuse the cat silhouette, add a collar and small bright tag, and keep normal sprite dimensions.
   - `drawCompanion()` uses `companion.scale || 0.55`; for Marmalade this is 1.5. Move its speech bubble upward based on scale so it clears the larger sprite.
   - `#companionStat` continues to show the active companion name; no new HUD element is required.
   - `objectiveText()` in town shows `A huge cat waits by the gate. Press Space beside it to recruit it.` until recruitment, preserving Town Scroll portal/return hints when applicable.
   - Update `index.html` help and `README.md` with the gate cat, Space recruitment, cat attack/bat preference, and its family-motivated sarcasm.
8. Lifecycle and persistence:
   - Marmalade is transient like other companions: no floor save fields, no template changes, no town save beyond the waiting actor’s hidden flag being reflected in `state.town`.
   - Death, ending, and `newGame()` clear `state.companion` and reset `state.entranceCat`; R produces a fresh waiting cat.
   - Retreat and Town Scroll keep the recruited cat as the active companion while returning to town.

## Files
- `js/game.js`: `CAT_LINES`, entrance-cat state, town actor, recruitment/entry helpers, `townInteract()`, `enterFloor()`, `companionTalk()`, `companionTick()`, `adoptBossCompanion()` boss handoff, drawing scale, objective/help text.
- `js/sprites.js`: `catCompanion` grid and palette derived from `cat`.
- `index.html`: help text for recruiting and cat behavior.
- `README.md`: player-facing description of Marmalade.
- `tests/game.test.cjs`: recruitment, auto-join, visual scale, bat combat, speech, retirement, persistence, and cleanup tests.
- `agents.md`, `tasks.md`, `handover.md`: document the new first-companion behavior and task status.

## Tests
- `genTown()` places a non-blocking 1.5-scale entrance cat near the gate.
- Space adjacent to the cat recruits Marmalade without entering the dungeon or duplicating the waiting actor.
- First dungeon entry without explicit recruitment auto-joins Marmalade exactly once.
- `state.entranceCat` and `state.companion` are absent from floor saves and monster templates.
- Marmalade follows movement/travel and survives retreat/Town Scroll returns like existing companions.
- `drawCompanion()` uses scale 1.5 and places the bubble above the larger sprite.
- `companionTick()` prefers bats, deals 2 to bats and 1 to non-bats, and leaves boss companions at 1 damage.
- Cat-specific intro/bat/trap/retreat/merchant/rescue lines are attributed to Marmalade and obey the shared cooldown.
- The first boss kill logs the retirement once and installs the boss companion; later boss kills do not re-run retirement.
- Death, ending, and `newGame()` reset the waiting cat and companion.
- Objective/help text reflects unrecruited, recruited, retired, portal, and return states without conflicts.

## Verification
- `node --check js/game.js && node --check js/sprites.js`
- `node --test tests/game.test.cjs`
- External smoke script from the temp directory.
- Browser `file://` check: see the oversized cat by the gate, recruit with Space, verify it follows into floor 1, check a bat encounter/target line, confirm first-boss retirement handoff, and ensure no JavaScript errors.
