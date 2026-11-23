# Smooth movement and sprite animation

Approved by the user on 2026-11-23: smooth tile-to-tile movement plus walking frames, bat/dragon wing flapping, and moving slime squash/stretch.

Logical positions, collisions, attacks, hazards, exploration, AI frequency and combat clocks remain immediate and unchanged. Track transient rendered movement separately in `state.motion`, interpolate short steps, and retarget from the current visual position when keys repeat. Move the visual camera with the same player interpolation; draw a one-tile overscan strip when the camera lies between tiles. Health bars, speech, shadows, and minimap positions follow rendered actors/camera; fog/discovery and targeting still use logical tiles.

Use original code-native sprite frames rasterized lazily into existing canvas caches. Walking cycles only while an actor moves; bats/dragon flap while visible, and moving slimes hop/squash. NPCs stay still. Use a separate capped 30fps requestAnimationFrame drawing clock; it must never advance gameplay timers or RNG. Draw only when movement or visible wing cycles require it. Preserve two-times zoom and existing cinematic clocks/art.

Pause visual clocks during Help, health/retreat, hidden tabs, boss-defeat/ending. Reset timestamps to avoid catch-up. Clear transient tracks/callbacks on travel, respawn, retreat, death, ending and restart; never save animation in floors/templates. Bind callbacks to their state object so stale callbacks cannot alter a new run. No-rAF environments retain immediate static rendering for the external smoke harness.

- [ ] Transient movement clock, retargeting and smooth camera/overlay integration.
- [ ] Walking/wing frames and slime poses with cached rasterization.
- [ ] Meaningful tests for interpolation, timing, lifecycle, frame variation, RNG and visibility; browser checks and recorded preview.
- [ ] Documentation/handover/task updates; no staging or commits.
