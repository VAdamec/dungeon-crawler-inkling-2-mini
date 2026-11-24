# Status review — 2026-11-24

Reviewed working build **0.20.0** against local source, plans, tests and git history. Latest committed release is **0.16.3** (`895af42`); later working-tree features are not described as published releases. This pass changes documentation and screenshots only, preserving existing runtime edits and staging.

## Latest changes

- The committed expansion adds ranged/magic enemies and player attacks, tomes, five biomes on 96×64 worlds, a 100-floor campaign, dedicated boss art/intros/defeats, the depth-50 throne room, developer console and defeated-boss companions. The latest commit adjusts the adventure log.
- The current working tree adds the persistent fully visible town, Inn/Store/NPCs/animals, dungeon gate and depth-1 return stairs; retreat-to-town with an exact return point; Town Scrolls with a one-use portal; adjacent companion following/light and Marmalade recruitment/combat/commentary.
- Current layout has top stats, Hero panel above the newest-first log on the left, and minimap/equipment/Spells on the right. The viewport remains 18×12 tiles at 2× zoom. Local runtime artwork contains 62 sprite entries; the four runtime files total 307,857 bytes (about 301 KiB).

## Plans

The [expansion checklist](../plans/2026-11-23-expansion-design.md) records all six implementation phases as complete. Two source-level gaps remain below; implementation checkmarks do not establish campaign balance.

Some expansion design ideas are not present in the current runtime: recurring themed encounters beyond floors 3/7, a ranged throwing-pan Cook, and extra themed food/mug/stool content. Treat those as deferred ideas rather than completed behavior. The current Cook is melee; README reflects this.

All five 2026-11-24 plans have implemented status and matching source/tests:

| Plan | Current result |
| --- | --- |
| [Companion follow and fog](../plans/2026-11-24-companion-follow-fog-plan.md) | Adjacent logical follower, independent render motion and radius-2 light |
| [Town hub](../plans/2026-11-24-town-hub-plan.md) | Persistent visible village, interactions, patrols and stopped dungeon clocks |
| [Retreat to town](../plans/2026-11-24-retreat-to-town-plan.md) | Full HP, preserved MP/cooldown, exact dungeon return point |
| [Town Scroll](../plans/2026-11-24-town-scroll-plan.md) | Stored item, J shortcut, one-use return portal and cleanup |
| [First companion cat](../plans/2026-11-24-first-companion-cat-plan.md) | Marmalade recruitment, bat preference, tiny attacks and attributed remarks |

The town plan's old “separate planned work” statement and expansion's obsolete test/environment notes have been reconciled. Earlier test counts in dated implementation notes remain historical. README, tasks, agent guidance and handover now identify the current build; the changelog separates working changes from verified commit versions.

## Findings

### Spawn selection does not sample the full weighted pool

In [game.js](../../js/game.js), `genLevel()` obtains `spawnPool(depth, biome)` but draws an index using `2 + state.depth`, then clamps to the last entry. The expanded pool has its own length and duplicated biome-favored entries. At depth 2 in the cavern pool, Wasp is eligible at index 7 while only indexes 0–3 can be selected. On deep floors, most index draws clamp to the final entry, disproportionately spawning that type.

**Follow-up:** sample `Math.floor(Math.random() * pool.length)` and verify low-depth eligibility plus deep-floor weighting. README minimum depths describe configuration, not guaranteed appearances. No runtime fix was made in this documentation pass.

### Magic Barrier does not select the nearest target

`castSpell('magicBarrier')` takes `visibleTargets(3)[0]`; `visibleTargets()` filters without distance sorting. Frostbolt does the same at range 4. By contrast, `shootBow()` explicitly sorts eligible targets by distance. Barrier's current behavior differs from the nearest-target wording in agent guidance.

**Follow-up:** sort Barrier targets by distance with deterministic ties and add a case where a farther monster precedes a nearer one. Decide whether Frostbolt should follow the same rule. README describes current first-eligible behavior. No runtime fix was made here.

## Verification

- Syntax: `node --check js/game.js` and `node --check js/sprites.js` passed.
- Behavior: all **132 tests** in `tests/game.test.cjs` passed.
- External legacy smoke script printed **SMOKE_OK**.
- Isolated Chrome loaded `index.html` through `file://`: launch/start, town recruitment, gate descent, scroll consumption/open portal/exact-tile return, developer `loadLevel 50`, desktop captures and mobile Help at 390×780. No JavaScript errors or remote requests were observed; mobile had no horizontal overflow.
- Browser checks used selected scenarios and prepared encounters, not a human 100-floor run. Subjective difficulty, full-run pacing and audible quality remain unassessed. Earlier browser checks in handover are historical and were not all repeated in this review.

Local Homebrew Node can run with `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`, which supplies the compatible installed library. No library symlink or system modification is required. This is local tooling, not a game dependency.

## Screenshots and documentation

Current PNGs are in [docs/screenshots/2026-11-24](../screenshots/2026-11-24/). Town and recruitment show browser interactions. The depth-8 encounter and depth-50 throne view use prepared actor/camera/exploration state for documentation; they are labeled in README. Bestiary portraits and sheets use the actual runtime painter, enlarged without changing game assets. Boss stats come from `bossForDepth()` at each listed depth; ordinary monster tables show unscaled `MONSTER_TYPES` values. Art previews from 2026-11-23 remain archived.

## Next steps

1. Correct weighted monster selection and nearest-target Barrier behavior, with focused behavior tests.
2. Playtest progression through representative early, middle and late floors, then a full human campaign. Assess boss pacing, healing/MP economy and audio by listening.
3. Record the resulting balance decisions before changing gameplay; keep `file://`, transient animations and floor persistence intact.
