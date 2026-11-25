# Character collection v1 — review only

> **Historical preparation record.** The notes below describe source/preview preparation before integration. The current worktree now renders this collection through `js/art-runtime.js`; these galleries remain isolated review pages. See the [current delivery/documentation record](../../../reviews/2026-11-25-graphics-recovery/gr10/README.md) for runtime status and the still-unverified GR-09 native background-tab check.

Prepared 2026-11-25. **25 additional characters, 400 transparent frames.** With the separately approved knight, the review set has 26 characters and 416 frames. No playable game files, stats, collision, maps or simulation clocks have changed.

[Interactive character gallery](../characters.html) · [Dungeon/NPC comparison](../design-v3.html) · [Collection manifest](manifest.json) · [Overview](review/overview.png)

## What is included

- Eight ordinary monsters: slime/blob, bat, goblin, skeleton, orc, wasp, mage and healer.
- Nine unique bosses: Mimic, Hydra, Wild Boar, Medusa, Dark Wizard, Skeleton King, Dragon, Cook and Bartender. Repeated campaign encounters reuse their species art; `dragon` aliases `dragonBoss`.
- Four humanoid NPCs: merchant, prisoner, princess and villager.
- Marmalade and three town animals: cat, dog/Pip and chicken.

Every role has four directions in row order **front, back, left, right**, with four motion states in columns 0–3. Humanoids and quadrupeds walk; slime squashes/hops; bat/wasp beat their wings; Medusa slithers. Mimic uses closed chest → eye peeking → toothed mouth/tongue → clawed movement. It does not pretend a chest has ordinary human walking legs in every state.

Marmalade follows the user's **charcoal cat with leather harness and satchel**, superseding the earlier orange prototype. The separate orange street cat has no harness. Dragon keeps the supplied red scales/green belly and wing membranes; Boar, Orc, Goblin and pale blue Blob use the supplied creature sheet. Mimic follows the separate gold-banded wooden chest reference, including an innocent closed state with no visible limbs.

## Sources and provenance

Created with the built-in image_gen tool, with one source sheet per character. The approved knight is the style reference; the three supplied references are retained here as user-monster-reference.png, user-marmalade-reference.png and user-mimic-reference.png. Those images are references only: their dungeon, grid and UI are not sprite backgrounds. Each role directory retains the selected generated-source.png and exact prompt.md. Mimic's closed-state and Wasp's wing-edge corrections also retain correction prompts and prior source variants. These are generated adaptations, **not assets supplied under the 0x72 pack's CC0 license**; source provenance is kept separate and the game license is unchanged.

No API/CLI fallback was used. The deterministic exporter does no creative drawing or generation: it crops source cells, applies one nearest-neighbor scale per character, removes faint alpha below 64, aligns feet/hover centers, and writes PNGs plus frame metadata. Original generated sheets remain unchanged for reproduction.

## Deliverables per role

- `generated-source.png`: selected full source generation.
- `walk-sheet.png`: 4×4 transparent RGBA sheet.
- `front-walk.png`, `back-walk.png`, `left-walk.png`, `right-walk.png`: four transparent strips.
- `frames/<direction>-<0..3>.png`: 16 transparent individual frames.
- `manifest.json`: crops, source/decoded-frame hashes, alpha bounds, shared scale and anchor.
- `prompt.md`: exact initial generation prompt; correction prompts where applicable.

Ordinary characters use 64×64 cells; bosses use 128×128 cells. Feet sit at (32,56) or (64,116); flying creatures use a documented center anchor so wingbeats do not force their feet to the floor. Transparent margins are not part of visible sprite size. The gallery shows proposed **2× screen scale** beside the approved knight. Bosses retain large, distinct silhouettes. Final runtime bounds/scale adaptation remains a separate integration task; these are proposed render sizes, not changes to logical footprints or gameplay stats.

| Character | Group | Motion | Maximum proposed visible screen bounds | Records |
| --- | --- | --- | ---: | --- |
| [Goblin](goblin/walk-sheet.png) | monster | walking | ≤56×72 | [manifest](goblin/manifest.json), [prompt](goblin/prompt.md) |
| [Orc](orc/walk-sheet.png) | monster | heavy walking | ≤94×86 | [manifest](orc/manifest.json), [prompt](orc/prompt.md) |
| [Slime / blob](slime/walk-sheet.png) | monster | squash-and-stretch hopping, four genuinely different compression/extension phases, never add legs | ≤62×48 | [manifest](slime/manifest.json), [prompt](slime/prompt.md) |
| [Bat](bat/walk-sheet.png) | monster | flying wingbeat: wings raised, spread, lowered, recovering; keep body center steady | ≤88×56 | [manifest](bat/manifest.json), [prompt](bat/prompt.md) |
| [Skeleton](skeleton/walk-sheet.png) | monster | walking | ≤58×88 | [manifest](skeleton/manifest.json), [prompt](skeleton/prompt.md) |
| [Wasp](wasp/walk-sheet.png) | monster | hovering wingbeat: raised, spread, downstroke, recovery, legs tucked; stable body center | ≤76×62 | [manifest](wasp/manifest.json), [prompt](wasp/prompt.md) |
| [Mage](mage/walk-sheet.png) | monster | walking with visible alternating boots and moving robe hem | ≤60×92 | [manifest](mage/manifest.json), [prompt](mage/prompt.md) |
| [Healer](healer/walk-sheet.png) | monster | walking with visible alternating boots and robe hem | ≤56×92 | [manifest](healer/manifest.json), [prompt](healer/prompt.md) |
| [Mimic](mimic/walk-sheet.png) | boss | reveal/hop: column 1 convincingly closed innocent chest, column 2 lid slightly open with eye peeking, column 3 open toothed mouth with tongue, column 4 clawed-limb stepping/hopping open-mouth pose. The rear views show chest back, not a front face pasted on its back | ≤140×132 | [manifest](mimic/manifest.json), [prompt](mimic/prompt.md) |
| [Hydra](hydra/walk-sheet.png) | boss | ponderous four-legged walking with three necks swaying and alternating feet | ≤214×192 | [manifest](hydra/manifest.json), [prompt](hydra/prompt.md) |
| [Wild Boar](boar/walk-sheet.png) | boss | four-legged walking/trotting, alternate diagonal leg pairs; do not duplicate standing poses | ≤152×144 | [manifest](boar/manifest.json), [prompt](boar/prompt.md) |
| [Medusa](medusa/walk-sheet.png) | boss | four flowing slither phases with tail S-curve changing and snake hair swaying; never add human legs | ≤126×192 | [manifest](medusa/manifest.json), [prompt](medusa/prompt.md) |
| [Dark Wizard](darkWizard/walk-sheet.png) | boss | slow walking with alternating boots, robe hem and staff movement | ≤156×192 | [manifest](darkWizard/manifest.json), [prompt](darkWizard/prompt.md) |
| [Skeleton King](skeletonKing/walk-sheet.png) | boss | regal heavy walking, alternating leg bones and boots, cape following each step | ≤192×204 | [manifest](skeletonKing/manifest.json), [prompt](skeletonKing/prompt.md) |
| [Dragon](dragonBoss/walk-sheet.png) | boss | four-legged walking with restrained wing flex/wingbeats and tail counter-sway, four unique phases. Four legs PLUS two wings; full wings and tail never clipped | ≤238×208 | [manifest](dragonBoss/manifest.json), [prompt](dragonBoss/prompt.md) |
| [Cook](cook/walk-sheet.png) | boss | heavy walking with alternating boots and subtle cleaver/pan swing | ≤128×132 | [manifest](cook/manifest.json), [prompt](cook/prompt.md) |
| [Bartender](bartender/walk-sheet.png) | boss | walking, alternating boots and careful tankard swing; no spilling particle effects | ≤78×120 | [manifest](bartender/manifest.json), [prompt](bartender/prompt.md) |
| [Merchant](merchant/walk-sheet.png) | npc | walking | ≤52×88 | [manifest](merchant/manifest.json), [prompt](merchant/prompt.md) |
| [Prisoner](prisoner/walk-sheet.png) | npc | cautious walking with alternating feet; whole body visible | ≤48×88 | [manifest](prisoner/manifest.json), [prompt](prisoner/prompt.md) |
| [Princess](princess/walk-sheet.png) | npc | walking/running-ready four-step loop, skirt and hair swaying with alternate feet; no single static gown repeated | ≤56×96 | [manifest](princess/manifest.json), [prompt](princess/prompt.md) |
| [Villager](villager/walk-sheet.png) | npc | walking | ≤46×88 | [manifest](villager/manifest.json), [prompt](villager/prompt.md) |
| [Marmalade](catCompanion/walk-sheet.png) | companion | quadruped walking | ≤52×56 | [manifest](catCompanion/manifest.json), [prompt](catCompanion/prompt.md) |
| [Town cat](cat/walk-sheet.png) | animal | quadruped walking with alternating paws and tail sway | ≤36×40 | [manifest](cat/manifest.json), [prompt](cat/prompt.md) |
| [Pip / town dog](dog/walk-sheet.png) | animal | four-legged walking/trotting with diagonal paw pairs | ≤56×56 | [manifest](dog/manifest.json), [prompt](dog/prompt.md) |
| [Chicken](chicken/walk-sheet.png) | animal | walking with alternating bird feet and gentle head bob | ≤40×52 | [manifest](chicken/manifest.json), [prompt](chicken/prompt.md) |

## Verification

All **17 preview tests pass** (six wall/manifest checks, five knight checks, six collection checks), including full roster coverage, all 400 unique frames, transparent margins, fixed anchors, changing silhouettes, wing/blob motion, large boss sizes, Mimic's closed/open size relationship and source hashes. Browser verification exercises group filters, all direction/frame choices, play/pause/hidden-page guard, main dungeon/NPC scene loading, missing-role failure and the dragon alias using normal file:// Chrome with no remote requests or errors. [Evidence](review/browser.json).

The 155-test game baseline remains unchanged; this asset-only addition does not change production/test sources. It is not a substitute for future gameplay regression checks after runtime integration.

## Reproduce

From the repository root, with Node (no runtime package install):

```sh
node docs/previews/2026-11-25-0x72/prepare-characters.cjs
node docs/previews/2026-11-25-0x72/build-data.mjs
node docs/previews/2026-11-25-0x72/build-design-data.mjs
node --test docs/previews/2026-11-25-0x72/verify-preview.cjs docs/previews/2026-11-25-0x72/verify-knight.cjs docs/previews/2026-11-25-0x72/verify-characters.cjs
```

The strict exporter refuses to call an incomplete roster complete. `--partial` is only for explicitly labeled work-in-progress previews. Optional browser verification uses an existing development Playwright installation (OX72_PLAYWRIGHT can point to its module directory):

```sh
node docs/previews/2026-11-25-0x72/check-characters-browser.cjs /tmp/character-review
```

Open ../characters.html directly to review without Node, a server, a build or browser security overrides. Filters select monsters/bosses/NPCs/companions/animals; direction, frame and Play controls expose every loop. Full sheets and exact prompts are linked per card. The new collection awaits visual approval; item/terrain/town-building work and runtime integration are separate.
