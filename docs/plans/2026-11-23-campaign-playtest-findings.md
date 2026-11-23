# Campaign and balance findings

Date: 2026-11-23. Baseline recorded before implementation; final measurements follow below.

## Campaign decision from the user
Victory requires defeating the depth-10 dragon and then rescuing the princess there. The depth-5 Mimic must not end the run.

## Controlled browser playtest
The real page loaded over `file://` in isolated Chrome. Existing browser checks passed: floor round trips and collected potion persistence, current progression, low/critical health dialogs, frozen movement, H potion use and HUD count, focus restoration, retreat confirm/cancel, full healing, and audio context/mute state. No JavaScript errors. This uses controlled state setup and actual keyboard/button interactions; it is not a full human playthrough. Audio output quality/volume preference has not been heard or rated.

## Combat diagnostic
Temporary runner: `/tmp/dungeon-balance-baseline.cjs`, deterministic seed 42. Defeated every normal monster through the normal XP award function, entered fresh floors, and recorded boss matchups. No gear, no incoming damage, and no boss XP were applied. This isolates progression/scaling and does not estimate actual completion rates.

| Encounter | Player level / max HP | Player attack / defense | Boss HP / attack | Hits needed | Damage per retaliation |
| --- | --- | --- | --- | --- | --- |
| Depth-5 Mimic | 10 / 150 | 39 / 15 | 192 / 43 | 6 | 28 |
| Depth-10 Dragon | 14 / 190 | 51 / 20 | 664 / 108 | 16 | 88 |

Before dodge, 15 dragon retaliations would deal 1,320 damage; real-time enemy attacks are additional. Gear and consumables improve this matchup, but the jump is large. Defeating normal monsters on floors 1–10 produced levels 3, 5, 7, 8, 10, 10, 11, 12, 13, 14 in this seed.

Repeated confirmed retreats from 1 HP each restored full HP without a cooldown or cost. At 190 maximum HP the current fixed 1 HP per two seconds can take more than six minutes to recover from near death, excluding interruptions.

## Direction proposed at baseline (subsequently approved)
Keep real-time controls and existing floor persistence. Make the Mimic an intermediate gate, finish at depth 10 after dragon defeat and rescue, and retain defeated boss state on revisits so the campaign cannot relock. Add explicit objective feedback. Tune scaling and enemy attack cadence, preserve full-health retreat but limit repeat use with an active-time cooldown, and scale recovery with maximum HP. Expose separate music/effect volume controls so volume preference can be adjusted without claiming a subjective audio assessment.

## After implementation
The approved design is implemented in `2026-11-23-campaign-balance-design.md`. Re-running the same seed/method keeps normal-monster XP progression unchanged and yields:

| Encounter | Before HP / attack | After HP / attack | Before hits / retaliation damage | After hits / retaliation damage |
| --- | --- | --- | --- | --- |
| Mimic | 192 / 43 | 144 / 29 | 6 / 28 | 5 / 14 |
| Dragon | 664 / 108 | 376 / 45 | 16 / 88 | 9 / 25 |

The diagnostic dragon's total retaliation damage before dodge drops from 1,320 to 200; the new shared attack cooldown also prevents retaliation and timed attacks from landing back-to-back. This is not a full-run win-rate measurement. A separate prepared no-gear duel with full HP, two stored potions, no dodges, one attack per second, and no additional attackers can finish the dragon encounter and rescue using the real game functions.

The repeated-retreat diagnostic now restores HP on the first retreat and blocks the immediate second retreat. At 190 max HP, rest now heals 4 HP every two eligible seconds rather than 1. Independent music/effects volumes allow preference adjustments while retaining master mute. Subjective audible quality has not been assessed.
