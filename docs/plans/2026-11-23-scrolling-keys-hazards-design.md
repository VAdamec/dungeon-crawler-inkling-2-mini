# Scrolling floors, keys, hazards, and obstacles

Approved by the user on 2026-11-23. Key carriers remain hidden until killed.

## Scope and architecture
Retain the plain HTML/CSS/two-script runtime and file:// launch. Use 72x48 world tiles with a fixed 36x24-tile viewport (canvas remains 1152x768). All entities, map memory, and floor saves use world coordinates. A clamped integer-tile camera follows the player; rendering loops and entity drawing are limited to the viewport. HUD and sidebars remain fixed.

## Generation and reachability
Generate about 22 rooms of varied size, connect them with a branching nearest-room spanning tree, and add corridor loops. Pick distant stairs. Add blocking pillars/rubble only if flood-fill still reaches every remaining floor tile; reserve stairs, NPCs, loot, and monster spawns. Monster and object placement use the full world dimensions.

## Floor keys
Each floor 1–9 assigns one random ordinary monster as a hidden carrier. Death drops one floor key at its tile. Space picks up the key, permanently unlocking that floor's downward stairs. Save carrier identity, dropped-key position, and collection state with the floor. Returning monsters cannot duplicate a dropped/collected key. A key on stairs or an NPC tile has pickup priority. Depth 5 additionally requires Mimic defeat; depth 10 retains dragon-then-rescue victory and needs no descent key. Show key availability/unlock status in HUD and objectives, without exposing the living carrier.

## Hazards and obstacles
- Flames are visible vents cycling on/off, dealing 4 + depth damage at most once per second while the player stands on active fire.
- Falling-rock tiles are visible; stepping there gives a 1.2-second dust warning before a one-shot impact (8 + 2*depth damage). Moving away avoids it. Spent debris remains passable.
- Spikes are invisible before stepping on them; they deal 6 + depth damage once, then remain revealed/spent.
- Static pillars and rubble block movement, but never disconnect the floor.
- Keep hazards at least four tiles from both stair arrivals and off NPC/loot/initial monster tiles. Do not place blocking obstacles on protected entities.
- Use a saved, floor-local hazard clock that advances only during active visible play on that floor. Pauses, launch, hidden tabs, and absence from the floor freeze timers. Save revealed/spent states and fire damage cooldowns. Route damage through hurtPlayer so low-health pauses and death interrupt immediately; hazards ignore armor, whose protection remains for monster attacks.

## Data flow and edge cases
Generate layout, connect/loop rooms, place entities, validate blocking obstacles, place hazards, choose carrier, capture monster templates, and save. On travel save/load all floor fields, reposition player and camera, recreate ordinary monsters safely, and preserve collected items, keys, boss defeats, and trap state. Hazard evaluation runs after movement and during active ticks. No runtime debris can block a key or staircase.

## Verification
Retain existing tests with explicit key-unlocked fixtures where keys are unrelated to the test. Add real key/drop/collection campaign flows, anti-duplication and collision priority checks; flood-fill varied floors and protected arrivals; test all hazards, pause/hidden/off-floor timers and health/death integration; check camera clamps, full-world movement, screen transforms, and viewport-only drawing. Verify the game via file URL and inspect scrolled screenshots. Update help, README, agents, tasks, and handover. No commits.
