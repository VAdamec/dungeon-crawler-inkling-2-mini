# Monster combat speech bubbles

Approved by the user on 2026-11-23.

## Behavior
Show one monster-anchored speech bubble at a time during combat. The first eligible surviving monster attacked, or monster making a real attack attempt, speaks immediately. Subsequent speech is limited to one bubble per four active seconds, and each bubble lasts 2.5 active seconds. Pause, hidden tab, launch, and ending behavior follow existing simulation boundaries.

Rotate a small pool of very short Monty Python and the Holy Grail quotes. Avoid drawing combat randomness for dialogue selection. The pool is deliberately brief, with attribution links to official material: https://www.montypython.com/media and https://www.youtube.com/watch?v=KlYrn2bXsc4 . No audio clips or other media are copied/downloaded.

## Architecture and data flow
Use separate state.monsterSpeech, state.monsterSpeechReadyAt, and state.monsterQuoteIndex, keeping NPC state.bubble independent. Store the speaking live monster ID, text, and expiration, not a persistent floor entity. Trigger only through real combat functions and only for living visible actors. Cooldowns apply globally so group fights do not produce overlapping dialogue.

Resolve the live actor on each draw so speech follows movement/camera scrolling. Match monster fog/viewport visibility, clamp the rectangle inside the camera viewport, and move it below an actor at the top edge. Draw the bubble after world/fog/player layers, with rock warnings above it. Never mark hidden key carriers or change damage, dodge rolls, attack cooldowns, or rewards.

Expire on active time; clear on monster death, travel/respawn, restart, player death, and ending. Travel resets dialogue readiness but keeps quote rotation for variety during the run. R resets all speech state. Do not store speech in FLOOR_FIELDS or monster spawn templates.

## Verification
Retain existing gameplay/ending tests. Check player- and enemy-initiated speech, attack-cooldown gating, no speech for lethal hits/dead actors, global duration/cooldown and rotation, paused/hidden clocks, no added RNG calls, independent NPC dialogue, travel/restart/ending cleanup, visibility/camera edges, and actual file-URL browser speech rendering. Update README, tasks, agents, and handover. No commits.
