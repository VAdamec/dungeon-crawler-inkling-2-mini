# Launch and gameplay layout

User-specified design, 2026-11-23: move health/level/etc. to the top in place of the persistent title; move log/chat to the left of the map; show Dungeon Crawler with a fantasy dungeon logo and version only at launch.

## Implementation
- Version `0.2.0` is defined by `GAME_VERSION` and shown only on the initial launch screen. A local inline SVG doorway/swords emblem and styled serif wordmark need no image/font downloads.
- The launch screen offers Enter the dungeon or any non-modifier gameplay key. Simulation is frozen until start. The initiating key starts only, without also moving or opening retreat. R restarts directly in the game; reload shows the launch screen again.
- During play, the HUD is the first row, followed by the objective. The map and a bounded, scrolling adventure journal sit side by side. The journal retains the latest 80 plain-text messages in `state.messages`; a new run clears them.
- The canvas keeps its logical 1152x768 resolution and scales to the available desktop width. On narrow screens the journal moves below the map to keep both usable.
- Keep the existing plain-script order, current gameplay mechanics, and file:// compatibility. Add no runtime dependencies.

## Verification
Check launch pause/start/restart behavior in VM; inspect launch, 1440px and 1280px desktop screenshots; verify HUD above map, journal to its left, real log overflow/autoscroll, no horizontal overflow, and hidden branding during play. Rerun campaign/recovery/audio browser checks against the final layout.

## User follow-up: equipment panel and item effects
Place weapon, armor, and ring slots to the right of the map with icons and HP/strength bonuses. Follow-up clarification explicitly requests ring HP, sword attack, and shield protection.

The sidebar uses local inline SVG sword/shield/ring icons, item modifiers, total gear HP/strength bonuses, and effective hero stats. Ring adds 20 max/current HP when equipped; equal replacement does not stack/heal again, and removal reduces max HP and caps current HP. Retain the sword's +6 attack/+2 strength, and add a Shield armor-slot item with +5 defense. Keep existing Armor/Helmet choices and other ring modifiers. Route pickups, purchases, and sales through `equipItem()` and verify level-up/travel preserve totals. At small widths the right panel moves below the map with the journal.
