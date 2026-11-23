# Explored-area minimap

User approved on 2026-11-23.

Add a small read-only map above the equipment in the right sidebar, about 180×120 CSS pixels at desktop sidebar widths. Reuse the existing floor map, visited Set, player, stairs, and camera. Do not introduce duplicated exploration state or reveal unexplored terrain, monsters, key carriers, items, or hidden traps.

Use a 216×144 canvas (three pixels per world tile), styled to fit the sidebar. Draw only visited terrain, discovered up/down stairs, a camera outline, and a contrasting player marker. Include a small legend and current floor label. Refresh from render(), preserving floor-local exploration on travel, retreat, and restart through the existing state lifecycle. The panel is hidden with gameplay at launch and remains a frozen dungeon chart during the ending.

Wrap chart and equipment into the existing right grid column. Keep chart visible above the independently scrolling equipment content; retain desktop map/log placement. Stack naturally at mobile widths. Keep all runtime code local/plain-script and compatible with file://.

Compared with a full-floor chart, explored-only rendering preserves exploration and secrets. A second canvas keeps tiny chart coordinates independent of the world canvas camera and cinematic transforms. No interaction or new key bindings are needed.

Verification: pixel/call-level checks for exploration and secret visibility, discovered stairs/player/camera markers, travel/restart state, and no mutation of gameplay data; real browser checks at desktop/mobile widths and pixel comparison for hidden entities. Run existing syntax/tests/smoke and update tasks/handover.

- [x] Add panel, responsive layout, and rendering.
- [x] Verify secrecy and lifecycle, browser layout, and existing checks. All 61 tests, syntax, and external smoke pass. Chrome checks include 70 keyboard moves, pixel equality with secret changes, floor travel/restart, and widths 1440/1280/900/390 with no JavaScript errors.
- [x] Update documentation and handover.
