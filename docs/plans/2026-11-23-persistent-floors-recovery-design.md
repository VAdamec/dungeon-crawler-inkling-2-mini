# Persistent floors, recovery, and audio

Approved by the user on 2026-11-23.

## Problem and approach
Floor ascent currently restores old player snapshots and regenerates the world. Store floor contents in `state.floors`, separately from current player progression. Compared with seed regeneration, storing contents needs less pickup/NPC bookkeeping. Whole-game snapshots would retain the existing rollback problem.

## Approved behavior
- Preserve layout, exploration, remaining potions/treasures, merchant stock, and rescues across transitions. Restore monsters from a separate spawn template on every return. Floor changes never roll back player progression.
- Space uses up/down stair tiles. Arrive at the connecting staircase. Keep explored terrain and discovered stairs visible. Award descent bonuses once per floor.
- Store found and purchased potions; H drinks a potion, and the HUD shows the count.
- Pause below 20% HP with Drink/Continue. Below 10%, also offer Retreat. Freeze enemies and healing during pauses. Warnings rearm only after recovery above their threshold; lethal damage still kills.
- Confirm retreat before moving one floor up with full HP; at depth 1 recover at its entrance.
- Heal 1 HP every two seconds after six seconds without combat, with no live monster within three tiles. Use elapsed active time; pause time does not accumulate.
- Generate original retro music and effects locally, with mute control. No downloaded assets, dependencies, modules, or build step.

## Architecture and flow
All state remains in `state`; functions remain top-level. Save floor fields before transitions, load or generate destination, place player, recreate destination monsters safely away from the arrival tile, reveal arrival, render. Save immutable monster templates separately from damaged/moving live monsters. Keep floor reward flags with the floor. Initial floor state and saves are in memory for the current run; R starts a new run.

Centralize player damage and health-warning checks. A custom pause dialog offers keyboard and button controls; a separate confirmation state supports canceling retreat back to the prior dialog. Healing potions remain usable while the health dialog is open. Track combat cooldown and healing progress only during active simulation. Browser audio starts after user input and degrades gracefully if unavailable.

## Verification and acceptance criteria
- Down/up/down preserves both maps, visits, removed loot, merchant transactions/rescues, and current player stats/inventory; monster HP and positions reset safely on revisits.
- Repeated descent does not repeat rewards. Stairs require the correct tile. Remembered terrain/stairs and treasures render.
- Both health thresholds pause immediately, stop subsequent enemy attacks, permit healing/continuation, and rearm after recovery. Confirmation/cancel, depth 1 retreat, full HP retreat, and lethal damage work.
- Autohealing observes combat/nearby-enemy constraints and excludes pause time. Potions are not consumed at full health.
- Audio initializes on user input, music/effects run, mute silences playback, and missing audio support does not break gameplay.
- Syntax checks, existing external smoke test, focused behavioral tests, and a real browser check via file URL pass. Update handover, tasks, help, and README.

## Open questions
None blocking. Existing boss-death victory behavior remains outside this batch.
