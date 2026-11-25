# Item and effect artwork — review collection

> **Historical preparation record.** The notes below describe source/preview preparation before integration. The current worktree now renders this collection through `js/art-runtime.js`; these galleries remain isolated review pages. See the [current delivery/documentation record](../../../reviews/2026-11-25-graphics-recovery/gr10/README.md) for runtime status and the still-unverified GR-09 native background-tab check.

Standalone preview only. Open [the gallery](../items-effects.html) directly using `file://`. The game remains 1.0.1 with its existing artwork and behavior. This collection awaits visual review.

## What was corrected

- Wasp stinger is a tiny rightward venom dart, not a complete insect.
- Hidden spikes are an entirely empty RGBA frame. They add no grate, crack, outline or other hint. The gallery compares identical floor tiles and checks every pixel after compositing.
- Heal and Greater Heal have separate names and distinct strength/size. Magic Barrier is a directional push/impact pulse, consistent with gameplay.
- Elixir is one item, without the duplicate caption in the reference. Equipment pickup icons have no mannequin or pedestal.
- Ordinary treasure has closed/open-full/open-empty states without Mimic anatomy.
- Portal closed state is absence; the open arch has a transparent center.
- Torch includes its mount, not only a detached flame. Fire vent has inactive/ignition/active/cooling phases. Cracks, impact/dust and settled rocks are separate states; warning triangles remain UI overlays.
- Stone stairs have explicit up/down variants, without borrowing a character sprite.

## Files and provenance

`roster.json` records 31 asset families. Each directory contains the exact `prompt.md`, selected `generated-source.png`, transparent `sheet.png`, numbered `frames/` and `manifest.json`. The collection manifest also records preview aliases for fire states, hidden spikes, portal absence and stairs. Reference screenshots are preserved as `user-item-reference.png` and `user-town-reference.png`.

Artwork was prepared with the **built-in image_gen tool**, guided by the supplied item sheet. These are generated adaptations, separate from the CC0 0x72 source pack. Labels, floor, knight and scale guides are gallery decorations, not part of exported transparent PNGs. User-provided reference provenance remains the user's; no new claim about third-party rights is made here.

`../prepare-items.cjs` performs deterministic alpha-aware export using the existing Node PNG codec. There are no new packages. A single scale and common source-cell coordinate system are used across each animation, preserving expansion. Pixels use nearest-neighbor sampling with alpha cutoff 64; accepted source alpha is retained. Blank logical states contain zero in all four RGBA channels. The gallery embeds the same PNG bytes as data URLs so Chrome can perform pixel reads and downloads directly over `file://` without special flags. The normal exported PNG files remain available independently. Production integration must decide which phases to use with existing clocks rather than adding gameplay.

Run from the project root with a working Node installation:

```sh
node docs/previews/2026-11-25-0x72/prepare-items.cjs
node --test docs/previews/2026-11-25-0x72/verify-items.cjs
```

Strict export fails for missing sources; `--partial` exists for explicitly incomplete drafts only. The optional `check-items-browser.cjs` uses an externally installed Playwright, never a runtime dependency. Review captures and browser evidence are in `review/`.

## Still separate

The town screenshot helps define materials, timber buildings, cave entrance, roads, water, bridge and vegetation. It is preserved as a reference; town architecture, remaining biome materials and cinematic-specific poses need their own environment/cinematic pass. Do not paste the angled whole-town illustration into the collision grid. Approved characters and their footprints are unchanged.

No runtime, campaign, item-stat, trap-damage, spell-targeting, collision or release changes are part of this preview.

## Verification

31 families / 72 transparent frames; all 22 preview tests pass. Offline Chrome checks cover categories, phases, play/pause/hidden-tab freeze, pixel-identical hidden floor, PNG export and revised dungeon. No browser errors or remote requests. The 603 protected files match starting hashes. See [browser evidence](review/browser.json) and [overview](review/overview.png).
