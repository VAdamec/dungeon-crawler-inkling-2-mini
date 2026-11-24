# JRPG runtime asset inventory

Status: integrated after the user approved both design stages and explicitly requested runtime implementation on 2026-11-24. Inventory is generated from the checked-in runtime arrays, not inferred from the preview roster.

76 sprite names use 211 unique decoded grids. Boss scales remain 3, ordinary actor scales remain 2; logical dimensions below are source pixels divided by `ART_DENSITY=2`. Rendered footprints may be larger than one gameplay tile; collision remains single-tile. Town buildings are fitted to the existing blocked footprint by rendering only. Nine FX names use the same art cache with scale 1.

[Implementation and verification](../../reviews/2026-11-24-jrpg-implementation.md) · [Machine-readable inventory](../../reviews/2026-11-24-jrpg-runtime-assets.json)

| Runtime name | Source grid | Logical bounds | Direction variants | Pose slots |
| --- | --- | --- | --- | ---: |
| `knight` | 32×44 | 16×22 | front, back, left, right | 4 |
| `slime` | 44×28 | 22×14 | front | 4 |
| `bat` | 64×40 | 32×20 | front | 4 |
| `goblin` | 40×44 | 20×22 | front, back, left, right | 4 |
| `skeleton` | 32×40 | 16×20 | front, back, left, right | 4 |
| `orc` | 64×56 | 32×28 | front, back, left, right | 4 |
| `wasp` | 52×48 | 26×24 | front | 4 |
| `mage` | 40×44 | 20×22 | front, back, left, right | 4 |
| `healer` | 40×44 | 20×22 | front, back, left, right | 4 |
| `mimic` | 64×44 | 32×22 | front | 4 |
| `hydra` | 72×64 | 36×32 | front | 4 |
| `boar` | 72×48 | 36×24 | front | 4 |
| `medusa` | 64×64 | 32×32 | front | 4 |
| `darkWizard` | 64×64 | 32×32 | front | 4 |
| `skeletonKing` | 64×72 | 32×36 | front | 4 |
| `dragonBoss` | 80×72 | 40×36 | front | 4 |
| `cook` | 36×44 | 18×22 | front | 4 |
| `bartender` | 24×30 | 12×15 | front | 4 |
| `merchant` | 32×40 | 16×20 | front, back, left, right | 4 |
| `prisoner` | 32×40 | 16×20 | front, back, left, right | 4 |
| `princess` | 32×50 | 16×25 | front, back, left, right | 4 |
| `villager` | 32×40 | 16×20 | front, back, left, right | 4 |
| `catCompanion` | 40×24 | 20×12 | front | 4 |
| `cat` | 26×18 | 13×9 | front | 4 |
| `dog` | 38×28 | 19×14 | front | 4 |
| `chicken` | 28×28 | 14×14 | front | 4 |
| `sword` | 32×40 | 16×20 | front | 4 |
| `bow` | 48×40 | 24×20 | front | 4 |
| `armor` | 32×40 | 16×20 | front | 4 |
| `helmet` | 32×40 | 16×20 | front | 4 |
| `shield` | 32×40 | 16×20 | front | 4 |
| `ring` | 32×36 | 16×18 | front | 4 |
| `elixir` | 24×36 | 12×18 | front | 4 |
| `potion` | 20×24 | 10×12 | front | 4 |
| `chest` | 32×28 | 16×14 | front | 4 |
| `key` | 40×36 | 20×18 | front | 4 |
| `townScroll` | 32×36 | 16×18 | front | 4 |
| `townPortal` | 48×56 | 24×28 | front | 4 |
| `spellbook` | 32×32 | 16×16 | front | 4 |
| `frostboltTome` | 32×32 | 16×16 | front | 4 |
| `greaterHealTome` | 32×32 | 16×16 | front | 4 |
| `barrierTome` | 32×32 | 16×16 | front | 4 |
| `stairsUp` | 32×32 | 16×16 | front | 4 |
| `stairsDown` | 32×32 | 16×16 | front | 4 |
| `torch` | 24×40 | 12×20 | front | 4 |
| `flameOff` | 32×40 | 16×20 | front | 4 |
| `flameOn` | 32×40 | 16×20 | front | 4 |
| `spikes` | 32×32 | 16×16 | front | 4 |
| `rockCrack` | 32×32 | 16×16 | front | 4 |
| `rockSpent` | 40×32 | 20×16 | front | 4 |
| `rubble` | 40×24 | 20×12 | front | 4 |
| `pillar` | 32×56 | 16×28 | front | 4 |
| `tombstone` | 32×36 | 16×18 | front | 4 |
| `crystal` | 48×48 | 24×24 | front | 4 |
| `cookingPot` | 40×48 | 20×24 | front | 4 |
| `barCounter` | 64×48 | 32×24 | front | 4 |
| `banner` | 40×60 | 20×30 | front | 4 |
| `throne` | 64×84 | 32×42 | front | 4 |
| `inn` | 128×112 | 64×56 | front | 4 |
| `store` | 112×112 | 56×56 | front | 4 |
| `hut` | 128×120 | 64×60 | front | 4 |
| `tree` | 80×80 | 40×40 | front | 4 |
| `bridge` | 64×48 | 32×24 | front | 4 |
| `water` | 32×32 | 16×16 | front | 4 |
| `townGate` | 48×64 | 24×32 | front | 4 |
| `doorstep` | 32×16 | 16×8 | front | 4 |
| `dragon` | 80×72 | 40×36 | front | 4 |
| `arrowFX` | 48×48 | 24×24 | front | 4 |
| `stingerFX` | 48×48 | 24×24 | front | 4 |
| `boneFX` | 48×48 | 24×24 | front | 4 |
| `beerFX` | 48×48 | 24×24 | front | 4 |
| `fireballFX` | 48×48 | 24×24 | front | 4 |
| `frostboltFX` | 48×48 | 24×24 | front | 4 |
| `healFX` | 48×48 | 24×24 | front | 4 |
| `greaterHealFX` | 48×48 | 24×24 | front | 4 |
| `magicBarrierFX` | 48×48 | 24×24 | front | 4 |

Repeated slots share decoded grids. Distinct direction caches include direction and frame in their keys; terrain and icon caches are independent. Equipment icons fit their own 32×32 surface. Static front defaults support cinematic callers and the no-DOM/no-rAF harness. Optional exporter recipes are archived under `design-v3/collection/tools/`; no export or build is required to play.
