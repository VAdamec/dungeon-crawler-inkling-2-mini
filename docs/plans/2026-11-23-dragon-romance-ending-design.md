# Princess and dragon plot-twist ending

Approved by the user on 2026-11-23.

## Scope
Replace the normal rescue victory after depth-10 dragon defeat with a roughly 14-second staged canvas ending. Keep the existing trigger: Space at the princess after the dragon is down. Reuse sprites and draw the scenery procedurally, preserving file:// and the two-script structure.

## Sequence
- 0–2 seconds: establish the wounded dragon, princess, and hopeful hero.
- 2–5 seconds: princess says “I love him!”, runs to the dragon, and heals him with hearts/glow and a refilling health bar.
- 5–8 seconds: princess rides the recovered dragon and both fly away. Hero: “…Oh.”
- 8–14 seconds: fade to a warm sunset; slumped hero walks away toward the sun, becomes smaller, and sheds animated blue tears.
- At 14 seconds: hold the sunset with THE END and run stats.

Esc skips to the final sunset scene; R restarts at any point. Keep audio/mute/volume behavior functional. Use a short healing cue and a sad musical phrase where available, respecting master mute and the music/effects buses.

## State and animation boundaries
Store all mutable ending state in state.ending. Mark the campaign completed when the valid final interaction begins, prevent repeated rewards, and freeze monsters, hazards, healing, active-time cooldowns, movement, pickup, and retreat. Preserve battle/progression rewards and the existing once-only princess interaction reward; change its dialogue/context to match the twist.

Draw the staged ending in screen coordinates before ordinary world rendering and outside the camera transform. Use requestAnimationFrame only for this sequence, with a clamped elapsed delta and hidden-tab freeze. Bind callbacks to their ending identity, cancel the outstanding frame on skip/restart, and reject stale callbacks. A separate advancement helper supports deterministic tests and fires phase events once even if skipping. Keep the final scene on canvas instead of covering it with the generic YOU WIN overlay.

## Verification
- Existing campaign flow still requires keys, Mimic, dragon defeat, and final princess interaction; the twist cannot start early or repeat rewards.
- Verify stage transitions, princess motion/healing, dragon recovery/escape, sunset hero motion/tears, final card/stats, and canvas context balance.
- Freeze dungeon clocks/entities during both the animation and final hold; test skip from each stage, R during animation/hold, hidden-tab behavior, stale callback rejection, and mute/volume compatibility.
- Run syntax, behavioral suite, external smoke, and real file-URL browser checks including actual timed playback and visual snapshots of each scene.
- Update README, tasks, agents, and handover; do not commit.

## Separate status check
The user asked whether Monty Python monster quotes existed. Code inspection confirmed they are not implemented; only merchant and rescued-NPC bubbles exist. That question alone did not request adding a new dialogue system.
