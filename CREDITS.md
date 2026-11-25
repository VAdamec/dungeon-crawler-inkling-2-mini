# Credits and artwork provenance

Updated 2026-11-25 for the integrated graphics worktree; release version is 2.0.0. This document records attribution and source boundaries, without changing the game's license or assigning a blanket license to reference images.

## Current custom artwork

The knight, remaining characters, items/effects, town scenery and dungeon materials were prepared with the built-in OpenAI image generation tool, guided by the user's selected references and review feedback. Deterministic local exporters crop/align/scale the selected PNGs; the runtime bake preserves their selected source pixels. These are generated adaptations, **not sprites extracted from the supplied reference screenshots and not assets from the 0x72 pack**.

| Collection | Source/provenance record | Runtime use |
| --- | --- | --- |
| Silver-helmet/navy-tabard knight | [Knight sources and exact prompts](docs/previews/2026-11-25-0x72/knight-reference-v1/README.md) | 16 directional walking poses |
| Monsters, bosses, NPCs, Marmalade and town animals | [Character sources/prompts/manifests](docs/previews/2026-11-25-0x72/characters-v1/README.md) | 25 sheets / 400 poses; charcoal Marmalade has a harness/satchel |
| Equipment, loot, spells, stairs and hazards | [Item/effect sources and corrections](docs/previews/2026-11-25-0x72/items-effects-v1/README.md) | 31 families / 72 frames; separate Heal/Greater Heal, empty hidden/closed states |
| Town and dungeon environments | [Environment sources and revision prompts](docs/previews/2026-11-25-0x72/environment-v1/README.md) | 24 families including six material atlases |
| Runtime selection | [76-role source mapping](docs/previews/2026-11-25-0x72/environment-v1/final-coverage.json) | Baked into `js/art-runtime.js`; PNGs are not fetched during play |

Per-role `prompt.md`, `generated-source.png`, correction/revision files and manifests retain the selected generations and export hashes. Source screenshots remain in the preparation directories as references, with their original provenance unspecified here. Their rights are not established by the generated export and are not relabeled CC0. The earlier procedural JRPG grids remain as project legacy/fallback art, separate from the new prepared collection.

## 0x72 source/reference pack

**16×16 DungeonTileset II v1.7 — 0x72 / Robert**, with GrafxKid credited by the publisher for recoloring. The [publisher's asset page](https://0x72.itch.io/dungeontileset-ii) identifies the asset license as **Creative Commons Zero v1.0 Universal (CC0)**; checked 2026-11-25. This attribution applies to that pack, not to custom generated adaptations or user reference screenshots.

Local pack copies are retained in [assets/source/0x72-dungeontileset-ii-v1.7](assets/source/0x72-dungeontileset-ii-v1.7/) and the earlier [pack-preview assets/provenance ledger](docs/previews/2026-11-25-0x72/assets/provenance.md). The high-wall atlas was retained for inspection; original pack atlases and early derivatives belong to the reference/preview history. Current prepared character/item/environment PNGs and the baked runtime payload are a separate collection. No third-party extension pack is claimed or included by this refresh.

## Dialogue, music and implementation

Monster combat remarks include brief quotations attributed to *Monty Python and the Holy Grail*; see [official Monty Python media](https://www.montypython.com/media). Only short text remarks are included, with no film audio, video or image assets. Companion/NPC remarks and the princess/dragon finale are project game content.

Music and effects are synthesized locally through Web Audio. No recorded soundtrack, external sound library, remote font or audio service is required. Canvas/code supply the HUD, logo, fog, particles, warning badges, hearts, tears and sunset; character art is not substituted with an uncredited external sprite library.

Documentation screenshots and bestiary figures are rendered from the current game. [Capture setup and source metadata](docs/screenshots/2026-11-25-integrated/README.md) distinguish staged encounters and normalized illustrations from natural gameplay or in-world size comparisons. Historical captures retain their dated directories.
