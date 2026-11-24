# JRPG expanded artwork collection


Latest outcome: both design stages and runtime integration were approved. See [implemented graphics and verification](../../../../reviews/2026-11-24-jrpg-implementation.md). Earlier authoring limits below describe the design-only stage; the game now contains self-contained baked grids, not a dependency on this gallery.

Status: **approved reference artwork; integrated in the working game after an explicit user request**.

## Approval and authorization

The user approved the study-03 town/dungeon/character direction: “Looks good, approved. Prepare the remaining monsters, bosses, items and biomes in the same style. No runtime changes yet.” This grants focus-design approval and authorizes this isolated collection. It does not approve unseen expanded artwork or authorize production changes.

The approved source and images remain in the parent folder. `base-art.js` copies its original painters verbatim through `vignette()` and exposes them for this isolated gallery. It does not load the game or a legacy sprite atlas. New paintings are in `collection.js`, with strict registry lookup and no fallback to old or recolored grids.

## Review the collection

Open [index.html](index.html) through `file://`. The expanded page provides resting/alternate-pose and grayscale controls plus a selector for six prepared environment views.

- [Eight ordinary monsters](monsters.png) / [alternate pose study](monsters-alternate.png).
- [Nine boss figures](bosses.png) / [alternate pose study](bosses-alternate.png).
- [Items, traps and props](items.png).
- [Biome overview](biome-overview.png): overview thumbnails only; full-size samples below.
- [Crypt](crypt.png), [Cavern](cavern.png), [Kitchen](kitchen.png), [Tavern](tavern.png), [Skeleton King throne room](throne.png), [final dragon hall](dragon-hall.png).
- [Supporting cast](cast.png), [companion size studies](companions.png), [projectile and spell motifs](effects.png).

All full-size environments use 1152×768 canvases representing 18×12 logical tiles at the existing 2× map display. Creature/item sheets use the same world-to-display scale, with a full-size knight beside each boss. These are prepared compositions, not generated floors or gameplay captures.

## Coverage

| Group | Designs and rationale |
| --- | --- |
| Ordinary monsters: 8 | Slime, Bat, Goblin, Skeleton, Orc, Wasp, Mage, Healer. Mage/Skeleton reuse the approved original study painters; six new figures add different anatomies, silhouettes, equipment and materials. |
| Campaign bosses: 7 unique | Mimic (hinged chest/jaws), Hydra (three necks and grounded body), Wild Boar (full body/hooves/tusks), Medusa (serpentine hair and coiled lower body), Dark Wizard (hooded floating robe, staff and tome), Skeleton King (crown, plate, cloak, sword/shield), Dragon (wings, neck, body, tail and feet). Repeated encounter depths share the same figure. |
| Themed encounters: 2 | Cook extends the Orc with chef hat/apron; Bartender extends the approved Skeleton with waistcoat and beer mug. These are ancestry-preserving role variants, not invented campaign bosses or new attacks. |
| Inventory: all 12 entries | Potion, Sword, Bow, Armor, Helmet, Ring, Elixir, Shield, Frostbolt Tome, Greater Heal Tome, Magic Barrier Tome, Town Scroll. Tomes have different symbols as well as materials. |
| World objects / props | Chest, key, return portal, up/down stairs, torch, pillar, rubble, tombstone, crystal, cooking pot, bar counter, banner and throne. Approved study painters are reused where already accepted. |
| Hazard states | Ordinary floor, hidden spikes (no marker), revealed spikes, inactive/active vent, rock warning and spent rocks. No new trap mechanics or timing. |
| Supporting cast: 7 | Merchant, prisoner, princess, villager, Marmalade, dog and chicken. Villager/Marmalade use approved painters; other figures extend the same proportions/materials. |
| Companion scale studies | Hero beside Marmalade or one of seven tiny boss figures. Scale is normalized in this preview; it is not a new production scale constant. |
| Effect motifs: 9 | Arrow, stinger, bone, beer, fireball, frostbolt, Heal, Greater Heal and Magic Barrier. These are illustrative stills, not new damage or targeting logic. |

There are **66 strict registry entries**: 8 ordinary + 9 boss/themed + 33 item/prop/hazard + 7 cast + 9 effects. Inventory and world objects share the 33-entry group; this does not mean 33 purchasable items. [roster.json](roster.json) records the current source metadata: 8 ordinary types, 11 campaign boss depths, 12 item entries and 5 biomes. Stats, encounter depths and mechanics are not edited by this gallery.

## Five architectural identities

- **Crypt:** worn flagstones, masonry caps/front faces, burial alcoves and tombstones. A full-body Skeleton and approved Mage provide scale.
- **Cavern:** faceted rock walls, irregular floor plates, scattered rubble, crystals and a mineral pool. No masonry texture painted over a differently colored floor. Decorative pool/crystals do not add game collision or hazards.
- **Kitchen:** ceramic floor squares, brick stove, copper extractor/chimney, cauldron, barrels and prep table. Cook/Wasp establish the theme. Stove flame is illustrative scenery here, not an implemented hazard.
- **Tavern:** continuous wooden floorboards, plaster/timber framing, tables/stools, barrels and bar counter. Bartender/Goblin use the same scale as the hero.
- **Throne:** marble-like slabs, carpet inlay, paired columns, royal banners and stepped dais/throne. The Skeleton King stands in front of the throne. An additional final-hall composition shows the Dragon in the same architecture.

These structures are compositional design references. Current procedural generation, protected tiles, map connectivity and hazard buffers have not been changed or validated for this scenery.

## Shape, scale and integration limits

- The accepted knight's proposed height is about 42 world pixels. That is the reference for these designs; the 2× map zoom remains unchanged.
- [asset-manifest.json](asset-manifest.json) records measured resting-pose bounds, relative to the foot anchor, including shadows. Large examples: Mimic 85×67, Hydra 98×94, Skeleton King 73×104 and Dragon 120×109 painted pixels including shadow. These are **proposed painter bounds**, not silently applied replacements for current `spriteDimensions()` or collision dimensions. A later integration must normalize source density/scale and account separately for shadows, bars, bubbles, culling and cinematic bounds.
- Wings, necks, robes, crowns and staff poses need explicit maximum visual bounds across animation frames. Alternate stills demonstrate direction, not a production-ready animation atlas.
- Art-aware wall clipping was checked in these compositions so diagonal beams and rock facets do not overpaint corridor/stair gaps. A later runtime task still needs actual fog, scrolling overscan, collision-free interaction positions, player visibility and secret-trap checks.
- Supporting humanoids are front/rest studies, not complete four-direction walking sets. Hero directions/walk samples remain in the approved focus gallery. Complete humanoid/animal movement poses, all boss intro/defeat/ending poses and timed effects are not claimed as finished production atlases.
- The user requested no runtime changes. No production scripts, HTML, CSS, tests, save formats, stats, targeting rules, audio or version constants were changed. No new gameplay or campaign balance is implied by the designs.

## Validation

[verification.json](verification.json) records the actual isolated Chrome `file://` checks and asset inventory:

- Both isolated JavaScript files pass `node --check`.
- Every registered asset is invoked and renders nonempty pixels without clipping in a generous measurement surface. Unknown asset lookup throws instead of silently reusing old art.
- Hidden-spike and ordinary-floor renders are byte-identical. This validates these two preview samples only; it is not a live-game secrecy test.
- Scene exports are deterministic; no legacy `SPRITES` atlas is present in the expanded page.
- Pose control changes creature/boss sheets, grayscale and biome controls work, and a 390px viewport has no horizontal overflow.
- No page JavaScript errors or remote requests occurred. The full-size monster/boss/item sheets and all five biome themes/final hall were inspected through captures/overview; placement and clipping issues found in review were corrected.
- Runtime/test and approved focus art hashes were compared separately. Existing focus HTML receives approval/navigation text only; its painters and PNGs are preserved. No staging or commits were performed.

The game behavior suite was not rerun for this isolated artwork task. Earlier game test counts remain historical. Runtime performance, real procedural-map overlaps, battle readability while moving, cinematic lifecycle and full campaign play are not established by these design images.

## Next decision

Review this expanded collection for consistency, silhouette, scale, biome character and item readability. Request revisions or approve it. Only a separate explicit request may begin runtime integration after the necessary art approval; no such request is inferred from approval of the earlier focus design.
