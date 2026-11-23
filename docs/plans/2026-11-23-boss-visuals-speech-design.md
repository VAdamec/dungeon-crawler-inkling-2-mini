# Larger bosses and longer combat speech

Approved visual-only sizing on 2026-11-23; user additionally requested boss floors with larger halls and rooms.

- Show quotes for five active seconds and append each accepted quote once to the left journal, prefixed with its monster name. Use a five-second global interval so another attacker cannot replace an unexpired quote. Preserve paused/hidden timing and cleanup.
- Add dedicated winged, horned dragon pixel artwork at least 2×2 tiles; enlarge the Mimic into a toothed chest about three tiles wide. Keep single-tile movement, targeting, and combat statistics as approved. Use shared visual bounds for sprite drawing, health bars, and speech placement.
- Reserve a large boss chamber before ordinary room generation on floors 5 and 10. Widen boss-floor connecting halls to three tiles. Place stairs away from the boss center; keep the arena free of blocking props/traps and the boss spawn clear of ordinary monsters/loot. Preserve connected terrain, key/campaign gates, saved floors, and arrival safety.
- Keep normal monster sprites/scales and the existing ending timeline intact. No dependencies or image downloads; pixel artwork stays in the plain sprite script.
- Verify five-second expiry, once-only log entries, pause/cooldown behavior, sprite bounds, boss-room clearance/connectivity, floor revisits and campaign flow. Inspect actual browser screenshots of both bosses and combat chat.

Alternatives considered: scaling existing small faces would preserve their weak silhouettes; multi-tile collision would require a broader combat/pathfinding redesign. Dedicated art with shared visual bounds fits the existing flat rendering architecture.

Implementation checklist:
- [x] Artwork and shared boss bounds: dragon 120×96, Mimic 96×66; refined dragon reused in ending.
- [x] Larger boss rooms/halls and spawn clearance: 22×18/18×14 arenas, three-tile halls, clear centers, preserved floor saves.
- [x] Five-second speech plus journal entries, with matching interval to prevent early replacement.
- [x] Automated and browser checks; update handover/tasks. All 59 tests, syntax checks, and external smoke pass. Chrome measured 5.145 seconds to speech disappearance with a 220ms simulation tick; chat, both bosses, arena, ending, and restart pass without errors. Screenshots inspected.
