# Implementation checklist

1. Separate world and viewport dimensions; generate connected rooms, branches/loops, and connectivity-checked obstacles.
2. Persist floor keys, handle monster drops and pickup priority, gate descent, and add HUD/objective feedback.
3. Persist hazards and floor-local time; implement visible fire/rock warnings and hidden one-shot spikes through central damage.
4. Add clamped camera and viewport culling to every draw layer, preserving world-coordinate exploration.
5. Extend behavioral tests, run syntax/smoke and seeded generation checks, and inspect a file-URL browser.
6. Update docs and handover; do not stage or commit.
