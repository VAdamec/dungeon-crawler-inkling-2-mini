# Two-times map zoom

Approved by the user on 2026-11-23: zoom the entire map 2×, showing 18×12 tiles instead of 36×24 in the same 1152×768 canvas.

Keep 32px world tiles, 72×48 floors, all saved coordinates and game mechanics. Introduce `MAP_ZOOM=2`, use an 18×12 camera viewport, and scale the world context before applying the camera translation. This doubles terrain, actors, items, health bars, speech, and warnings together. Camera clamping, culling, speech bounds, and minimap outline use the smaller viewport constants.

Keep HUD, log, equipment, minimap dimensions, and dialog sizes intact. Restore the world context before screen-coordinate dragon-defeat overlays; ending rendering remains outside the world zoom. Mimic defeat stays in the world and scales with it. Preserve nearest-neighbor filtering and balanced transforms.

Verify camera edges, viewport draw bounds, minimap rectangle, world/cinematic transform separation, bubbles and warnings, floor travel/restart, boss figures and scenes, and responsive layout. Inspect browser screenshots and run existing behavior/syntax/smoke checks. No new animation, dependencies, staging, or commits.

- [x] Apply world zoom and viewport constants.
- [x] Update camera/minimap checks and verify world versus cinematic rendering.
- [x] Browser inspection, documentation, and handover.

Verified: 68 tests, syntax and legacy smoke; isolated Chrome checks confirm a 64px logical hero, all camera edges, crisp pixels, readable speech/warnings/boss bars, unscaled dragon-defeat/ending transforms, restart and mobile layout. Visible monsters’ bars now draw above terrain fog. Screenshots are archived in `docs/previews/2026-11-23-map-zoom/`.
