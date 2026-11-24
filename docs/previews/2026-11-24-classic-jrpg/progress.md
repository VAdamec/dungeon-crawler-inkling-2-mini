# JRPG-02 checkpoint — classic JRPG visual proposal (revision 2)

Latest outcome: **both collections approved; runtime implementation complete**. See the final entry and [implementation review](../../reviews/2026-11-24-jrpg-implementation.md). Earlier checkpoint status below is historical.

Status: **revised and presented; approval still pending**. The earlier draft was rejected by the user for concrete
harness/art defects. This revision fixes them and narrows scope to one town and one dungeon sample before any
full-gallery expansion. **JRPG-03 has not started.**

## User feedback received

- The new hero was named `front` / `back` / `side`, but scenes requested `hero`, so old `knight` art was drawn.
- `propTownSprite()` was never called and threw `TypeError: r.join is not a function`; buildings/trees kept old silhouettes.
- Bosses and many props were explicit recolors of existing grids through the fallback painter.
- Water was passed to the wall painter, making the river look like masonry.
- Required revision: substantial shape changes (pitched roofs, facades, organic canopies, distinct banks, convincing
  wall height), actual new directional hero in scenes, no embossed square border on grass/road, grayscale review,
  and one convincing town + dungeon sample before expanding the full gallery.

## Revision changes

- `proposal-sprites.js`:
  - Added `propGrid()` / `propRect()` / `finishGrid()` char-grid helpers; `propTownSprite()` now returns valid mutable grids.
  - Rebuilt Inn/Store/huts with stepped pitched gables, eaves, lit facades, windows and doors; gate with a stepped arch; trees with irregular rounded canopies; bridge planks/rails.
  - Added `PROP_TOWN` and `PROP_DUNGEON`. Dungeon stairs, chest, potion, key, torch and spikes are drawn from new grids; no recolor fallback is used for displayed assets.
  - Removed `PROP_BOSS_NAMES` and the boss recolor plan from this focus revision.
  - Replaced `paintPropTile()` with kind-based painting: `#` wall, `w` water, `a` bank, `s` road, `.` floor/grass. Ground no longer has an embossed square border; bank edges react to adjacent water.
  - Strengthened crypt wall/floor values so shape and height survive grayscale.
- `preview.js`:
  - `raster()` uses `PROP_HERO` / `PROP_MONSTERS` / `PROP_PEOPLE` / `PROP_TOWN` / `PROP_DUNGEON` for after art; if no new grid exists it keeps the old palette instead of recoloring.
  - Scene props use explicit `view` (`front`, `side`, `back`) for the new hero. Town shows front/side/back; dungeon shows side.
  - Water is drawn as a blue tile plus bank tiles, never as a wall; the baseline now draws live-style river water sprites for a fair before comparison.
  - Scene list reduced to town and dungeon. Each renders color before/after and generated grayscale before/after canvases at 1152×768.
- `index.html` — focused gallery: two scenes, four captures each, revision notes, deferred full-gallery notice.
- `design.md` — status, palette, shaped-prop rules, grayscale numbers and revised open decisions.
- PNG captures regenerated: `before-town.png`, `after-town.png`, `gray-before-town.png`, `gray-after-town.png`, `before-dungeon.png`, `after-dungeon.png`, `gray-before-dungeon.png`, `gray-after-dungeon.png`, `gallery-full.png`. Stale throne PNGs removed.
- `progress.md` — this checkpoint.

## Checks and actual output

- `node --check` passed for `proposal-sprites.js` and `preview.js`.
- Grid validation: 33 proposed grids (hero, monsters, people, town props, dungeon props), all 32×32 with even rows; all glyphs mapped to the 34-color palette.
- System Chrome capture: 8 scene canvases at 1152×768, zero page/console errors.
- Browse console capture in the user’s Chrome after reload: zero console entries/errors. Tab group `JRPG-02 proposal`, tab `928239149`.
- Color changed-pixel ratio: town 1.000, dungeon 1.000.
- Grayscale changed-pixel ratio / mean gray delta / edge-change ratio: town 0.649 / 43.98 / 0.221; dungeon 0.543 / 18.33 / 0.141. These measurements support “visible without palette” but are not a human approval.
- Runtime isolation: `git diff --exit-code -- js/ index.html style.css tests/` clean. No runtime file, task checkbox or staging state changed.
- Earlier runtime baseline in this session: 62 sprite/palette entries, both runtime files syntax-clean, 132/132 tests pass, `SMOKE_OK`. Not rerun for this preview-only revision.

## Approval record

- First draft: rejected by user; feedback recorded above.
- Revision 2: presented in Chrome and in chat; awaiting user decision.
- Still no approval. Broad JRPG direction agreement does not approve these images.

## Remaining blocker and next task

- Blocker: explicit user approval/rejection of the two focus scenes, including grayscale.
- If approved, expand the remaining gallery and only then proceed to JRPG-03 after a separate concrete approval gate.
- Next actionable task is **JRPG-02A — verify/revise the two focus scenes** when explicitly requested. Then JRPG-02B expands full coverage after focus approval and a continuation request. JRPG-03 remains gated and not started.

## Planning update after review — 2026-11-24

The user requested stricter planning/instructions and no runtime changes. The [review record](../../reviews/2026-11-24-jrpg-preview-review.md) preserves first-draft defects as regression checks. The updated plan requires visible building/terrain/character shape changes, fair color/grayscale/silhouette comparisons and a manifest proving proposed assets are actually displayed. Pixel-change metrics or console success do not meet the visual acceptance criteria.

No revision-2 artwork acceptance, runtime authorization or new browser verification is recorded by this documentation update. Current permission is documentation only. Full-gallery approval and a separate runtime-integration request are required before JRPG-03. Earlier implementation/check claims above are retained as the preview author's checkpoint, not rerun or independently confirmed here.

## Primary-agent design study 03 — latest, 2026-11-24

The user explicitly requested the primary agent prepare the design after local-LLM difficulty. This supersedes the previous documentation-only authorization for isolated preview work, but does not authorize runtime integration.

Latest proposal: [design-v3/index.html](design-v3/index.html), with [notes/source manifest](design-v3/design.md), [town](design-v3/proposed-town.png), [dungeon](design-v3/proposed-dungeon.png), [directional characters](design-v3/characterSheet.png), matched baseline/grayscale exports and solid-mask comparisons. Earlier local-model source/images are retained. Only the parent gallery gained a link to the new study; old proposal painters were not rewritten.

Prepared JRPG-02A focus coverage includes substantial roof/facade geometry, organic canopy/trunk shapes, continuous ground, explicit banks/water, raised stone walls, new knight/NPC/caster/skeleton/cat painters and shaped props. Proposed mode has no old-art fallback. The hero is intentionally about 42 world pixels tall, and buildings visually span several tiles: these proposed bounds and town-overhang compatibility need review/integration rather than assuming old bounds suffice.

Verification: the new preview script passes syntax; actual Chrome file:// checks record zero JS errors/remote requests, working current/proposed/grayscale controls, deterministic scene export, exact 1152×768 scene canvases and true RGB-equal grayscale exports, with no horizontal overflow at 390px. Town/dungeon/character/grayscale captures were visually inspected. [verification.json](design-v3/verification.json) records exercised painters and browser evidence. Hash comparison confirmed index.html, style.css, js/game.js, js/sprites.js and tests/game.test.cjs unchanged. Runtime behavior tests were not rerun for this isolated art work.

Status: **JRPG-02A proposal prepared; user approval pending**. JRPG-02A checkbox remains unchecked until acceptance. Next: review the concrete study; request JRPG-02B full coverage only after focus approval. No runtime code, production art, gameplay version, staging or commits were changed.

## Approved focus and expanded collection — 2026-11-24

The user explicitly approved study 03: “Looks good, approved. Prepare the remaining monsters, bosses, items and biomes in the same style. No runtime changes yet.” **JRPG-02A is accepted.** This authorizes isolated JRPG-02B design work only.

Latest review candidate: [expanded collection](design-v3/collection/index.html), with [design/coverage/bounds notes](design-v3/collection/design.md), [66-entry measured manifest](design-v3/collection/asset-manifest.json) and [browser evidence](design-v3/collection/verification.json). Coverage: all 8 ordinary monsters, 7 unique campaign bosses + Cook/Bartender, all 12 inventory entries within 33 item/prop/hazard samples, 5 distinct biomes + final dragon scale scene, 7 supporting cast members, companion scales and 9 effect motifs. Earlier approved painters are explicitly reused; no legacy atlas/recolor fallback is loaded.

The expanded assets are **prepared for review, not approved or integrated**. Rest/alternate figures and front/rest NPC studies do not constitute complete directional/cinematic atlases. Proposed large-boss painter bounds include shadows and need normalization/visual-bound integration later. Scenery is designed, not installed into procedural maps.

Checks: isolated syntax, actual Chrome file:// rendering, strict lookup/nonempty measured assets, identical hidden-spike/normal-floor samples, deterministic exports, pose/grayscale/biome controls, zero browser errors/remote requests and no mobile overflow. Captures were visually inspected; wall-footprint clipping and prop placement were refined. Runtime/test files and approved painter/PNG hashes are preserved; focus HTML has approval/navigation edits only. Game behavior tests were not rerun for isolated artwork. No staging/commits.

Next: user reviews the expanded collection. JRPG-02B accepted completion remains unchecked. JRPG-03 requires collection approval plus a separate explicit runtime-integration request; the current instruction remains no runtime changes.

## Runtime integration complete — 2026-11-24

The user approved the expanded collection and explicitly requested implementation while preserving gameplay, animations and offline support. The completed integration is recorded in [implementation evidence](../../reviews/2026-11-24-jrpg-implementation.md) and [runtime inventory](inventory.md). JRPG-02B and JRPG-03 through JRPG-08 are complete. Runtime uses 76 sprite/FX names and 211 shared decoded grids in the existing two scripts; no preview files are runtime dependencies.

138 behavior tests, syntax and external smoke pass. Seeded old/new gameplay fixtures match excluding sprite metadata; selected actual file:// browser scenarios cover movement, travel/dialogs, all boss kinds and ending/restart. Pixel secrecy and running audio were checked. Warm median/p95 draw+minimap is 0.8/2.5 ms versus 0.6/2.3 ms before on the same machine. README/bestiary screenshots now show implemented art. The user subsequently designated release 1.0.0; launch branding and release documentation now match. No release commit/tag or staging commands were issued. Human campaign/audio assessment and unrelated behavior backlog remain separate.
