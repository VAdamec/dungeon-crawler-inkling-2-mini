# Campaign and balance design

Approved by the user on 2026-11-23 after review of the controlled playtest findings.

## Scope and goals
Complete a ten-floor campaign. The depth-5 Mimic is an intermediate gate; defeating the depth-10 dragon unlocks rescuing the princess there, which wins. Improve late-floor combat, recovery pacing, and audio adjustment without changing the real-time controls or file-based launch.

## Architecture and responsibilities
Keep top-level functions and all mutable data in `state`. Store `bossDefeated` with each floor so bosses cannot respawn or relock gates; ordinary monsters still respawn. Add active simulation time for shared enemy attack cooldowns and the retreat timer. Keep audio preferences/context across R and add independent music/effect gain buses with labeled controls.

## Campaign and data flow
- Depth 5: no princess. Block descent until the Mimic dies. Killing it awards XP/gold and enables descent without winning.
- Depth 10: no further descent. Princess cannot be rescued until the dragon dies. Dragon death awards XP/gold and enables rescue without winning. Space at the princess then awards the rescue reward and wins.
- Save boss defeats immediately and skip defeated bosses on future spawns. Display the current objective and retreat availability in the HUD. R resets campaign progress.

## Balance
- Keep XP/gold scaling while reducing normal-monster HP growth to 20% per depth and attack growth to 15% per depth (previously both 35%).
- Use the same gentler HP/attack scales for the Mimic; use 15% HP growth and 8% attack growth for the final dragon to remove the diagnostic spike. Validate resulting matchups before completion.
- Each monster shares one 0.8-second attack cooldown between retaliation and real-time attacks; dodged attacks consume it too. Floor changes do not reset the global clock.
- Retreat still heals fully and returns one floor (or the depth-1 entrance), but can be used only once per 60 active seconds. Cancel does not consume availability; pause/hidden time and ordinary floor travel do not bypass the timer. Show remaining time in HUD/dialog.
- Autoheal 2% maximum HP (rounded, minimum 1) every two seconds after six combat-free seconds, with no living monster within three tiles. Keep existing pause and nearby-enemy behavior.
- Separate music and effects volume sliders, with master M/button mute. Changing a volume while muted must not unmute; preferences survive R. Do not claim a human audible-quality assessment.

## Edge cases
Lethal damage still kills. Both health pauses stop all further attacks. A princess interaction before dragon defeat changes no rewards/progress. Boss defeat and NPC rescue survive revisits without repeated rewards. Depth-10 stairs cannot generate depth 11. Cooldowns freeze with simulation pauses and hidden tabs. Dialog buttons retain keyboard/focus behavior.

## Verification
Extend existing VM tests for the entire campaign, locked gates, nonwinning boss kills, permanent defeats and one-time boss rewards, final rescue/win, reset, shared cooldown/dodge/per-monster independence, active retreat timers, scaled recovery, and independent audio volumes/mute. Run syntax and legacy smoke checks, compare controlled boss diagnostics before/after, and verify real browser objectives/controls/volume buses over file://. Update README, tasks, agents, and handover with final behavior and limits.
