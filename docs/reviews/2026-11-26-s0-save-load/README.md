# REVIEW/S0 — portable save/load readiness

2026-11-26. **S0 complete; S1 ready for a separate implementation request.** Manual portable JSON files without browser-storage dependence remain the user-confirmed transport. Save/load and goldADD are still unimplemented. No runtime/test/player-guide changes, staging, commit, version or release action. G0 is complete independently; market M1–M3 remains separate.

Reviewed the current C3 candidate, agent guide, developer docs, plans/prompts, tasks/handover, source/test changes and [C3 acceptance evidence](../2026-11-26-c3-integration/README.md). The [field/schema/alias matrix](schema-matrix.md) classifies **all 82 initialized/referenced state keys**, with observed nested fields and precise S1/S2 requirements. [Machine-readable classification](state-classification.json), [VM diagnostics/size records](probes.json), [diagnostic runner](check-state.cjs).

## Findings that change implementation instructions

| Finding | Observed code / diagnostic | Required handling |
| --- | --- | --- |
| Existing caches are not a complete or pure save | game.js:422/:2175; wrapper descentRewarded absent from FLOOR_FIELDS. Probe after filtering/clock change: live potions 3 vs cache 4, hazardTime 3.75 vs 0. | Detached floor copy with all active values overlaid and once-only wrapper flag retained; never call saveFloor/saveTown as part of pure export. |
| Load must preserve encounter rather than revisit it | :2182 recreates HP/positions/deadlines from monsterSpawns; :2205 resets intro/summon/recovery and consumes generation RNG when needed. | Store current monsters separately, with bossId/introSeen/summon deadline. No newGame/generation/travel/recreation/action helpers during validation/hydration. |
| **Valid high-level XP exceeds safe integer range** | :1464 recurrence; actual damageMonster probe reaches level 83 threshold **11,075,777,856,849,744**, level 99 **7,275,023,182,095,170,000**; level 100 resets threshold 1. JSON round trips preserve the current JS numbers. | Use finite integer XP/threshold validation with the existing rounded recurrence and level cap, not Number.isSafeInteger for every numeric field. Do not rebalance XP in persistence. |
| **Guard history has no fixed source maximum** | :2751 summon appends guards; dead actors stay in state.monsters; next ID comes from max over all rows. After 100 staged summon/kill cycles: 200 guard rows, 2 alive; 0 guard templates, also 0 after saveFloor. | Preserve dead/current rows and order, including negative corpse HP. Bound the format; do not assume at most 44 active rows, prune history or add guards to templates. The guide's claim that summons are saved in monsterSpawns does not match this branch. Later revisit behavior remains unchanged. |
| Return-point policy needs real branch semantics | :839–918/:3870; reasons scroll/retreat/**cheat**, fallback supports blocked tiles. T1 preserves an open portal during debug floor changes. | Bounded return coordinates with referenced floor, not necessarily walkable/current depth/town area. Preserve one-use portal and closed retreat return; no refund/repair. |
| Town and actor identity need explicit reconstruction | :684–843; all eight alias probes true, including store=landmark store and board object in props. Patrol increments pathIndex before testing collision. | One canonical town store/board, linked landmarks; persist actual actor position independently of pathIndex. Keep current dungeon depth while in town. |
| Overly broad uniqueness/HP checks reject source states | :1433 damage may leave negative HP; IDs repeat across floors/categories; monster movement ignores loot/hazards/companion tiles. | Scoped uniqueness, known semantic roles, bounded coordinates and correct hero HP; no universal tile-uniqueness rule or corpse HP clamp. |
| Current trading is unsafe to serialize mid-menu | :2292/:2373–2410 partial rollback/live mutation; known P0 HP/spell leaks remain. | Reject trade/picker state or stale visible overlays. No unconfirmed draft export. Persistence must not fix/normalize existing market behavior; M1–M3 remains independent. |

## Size evidence and bounded-format policy

The review-only projection copies the design's explicit semantic categories, converts Sets to coordinate arrays, excludes art/audio/UI/motion, and keeps one active encounter. It is **not a production serializer/parser/loader or proof that a final DTO works**. Two seeded fixtures generate all 100 floors using real generation, retain every generated loot/template object and set all 6144 coordinates visited on each floor and town. Gates are bypassed for content-retention stress; this is not a claimed completed player campaign. An additional variant adds 10,000 stored potions without removing world loot, deliberately overcounting content.

| Seed | 100-floor projection bytes | MiB | With 10,000 additional stored potions |
| --- | ---: | ---: | ---: |
| 713 | 8,381,362 | 7.9931 | 8,961,361 bytes |
| 42 | 8,378,768 | 7.9906 | 8,958,767 bytes |

Observed maxima across these fixtures:32 rooms, 41 templates, 37 potions, 29 treasures, 64 obstacles, 124 hazards, 60 props per floor. Town has 4 NPCs, 6 animals, 104 props and 6 stock entries. Source-derived bounds differ from observed maxima: dungeon props can reach a conservative 76 (throne decor plus room props), and treasure/potion limits depend on depth. With no debug regeneration, a loose all-potion natural inventory bound is **3921**, counting every possible potion/treasure plus all merchant/store stock as potions. This is an upper bound, not an achievable drop distribution.

**There is no finite absolute maximum save across arbitrary play:** repeated throne summons accumulate corpses, native counters can grow with play time, and debug loadLevel can regenerate collectible content. The selected v1 policy is bounded, lossless export or explicit refusal; it never silently truncates a run or changes gameplay caps. The two fixtures measure full geometry/exploration stress, not a mathematical maximum or exhaustive seed proof.

| Format limit selected in S0 | Contract for S1 |
| --- | --- |
| UTF-8 bytes | **32 MiB = 33,554,432**, both import and export. Check File.size before reading in S3; parser direct entry checks its own input byte budget. Reject excess whitespace too. |
| Structure | At most 16 nested container levels and 4,000,000 visited values/containers; iterative traversal, no unbounded recursive key walk or untrusted merges. Check type/length before iterating. |
| Floors/maps/exploration | At most 100 keyed depths 1–100; each map 64×96; visited at most 6144 unique canonical coordinate strings per map. |
| Per-floor content | rooms≤32; templates≤41; potions≤4+floor(depth/3); treasures≤4+floor(depth/4); hazards≤24+depth; obstacles≤14+floor(depth/2); props≤76; stock≤6. Retain source roles and cross-field rules. |
| Current encounter / inventory | Each≤65,536 rows; byte/structural caps still apply first. Dead encounter rows count. Large imported histories and debug-accumulated inventories can exceed the supported format; export fails clearly without mutation. No claim to accept unbounded histories. |
| Town/roster | Known 4 named NPCs and 6 animals, paths≤3, 104 props, fixed landmarks/store≤6; unlocked companion list unique/known≤11; spells limited to 5 known IDs. Empty/hidden starter actor still present. |
| Text | Journal≤80 plain-text entries, each≤512 UTF-16 code units; metadata strings≤128, createdAt≤64. Other text uses known enum/definition identities or explicit short field bounds, never arbitrary nested HTML/URLs. |
| Numbers | Resource counts/IDs/currency nonnegative safe integers; living HP and known item/monster stats finite integers; clocks/heal fractions finite in real source ranges; XP/threshold exception above. Nonfinite values and inconsistent cross-fields reject, never clamp. |

These limits accept the measured content stress and offer room above ordinary generated inventory. They are selected engineering constraints for a requested S1, not user-approved runtime changes. Recheck **final schema** size/node counts in S1 and maximal valid/adversarial file responsiveness in S4; the projection is not final validation/performance acceptance. Raw Node stringify about 11 ms and parse about 20–30 ms on this machine exclude validation, hydration, browser memory/download and mobile costs.

## Eligibility and remaining architecture decisions

The [matrix](schema-matrix.md#s0-selected-implementation-policies) settles the reviewable v1 recommendations: saves from stable visible living play, own Help/file UI allowed, conflicting dialogs/cinematics/console/trade/picker and godMode-on excluded. Loading is available from launch/stable play/ordinary death, separately gated, and restores godMode-off plus the receiving audio preferences/context. Existing cheat-granted gold/scrolls are ordinary progress; no anti-cheat claim. No new user choice is needed for pure S1 work.

S1 owns only the explicit version 1 DTO and pure bounded snapshot/parser/validator tests. S2 owns detached candidate/alias reconstruction and identity-bound atomic commit, then S3 actual file UI, S4 full acceptance. Persist warning latches, deadlines, active encounter and once-only progress; clear visual effects/bubbles/unfinished cinematics without damage replay, heal, reveal or reward. No native RNG serialization promise. Future market schema changes must be reconciled before implementing against a changed branch.

## Checks and scope

- **12/12 existing focused persistence/travel/ring/key/hazard/throne/overflow tests pass** ([output](focused-tests.txt)). These verify current behavior only, not the missing feature.
- Diagnostic assertions pass: 82-key inventory, real aliases/stale cache,100-cycle guard growth, levels 1–100 threshold recurrence/JSON numeric round trip, both 100-floor content projections below the cap. Probe runner is development-only; it adds no repository game tests.
- All three copied runtime scripts and the diagnostic runner pass syntax. [Validation](validation.json), [protected-file comparison](protected-file-check.json), [starting hashes](protected-before.json). Ten protected runtime/test/art/HTML/CSS/player/developer-doc files are unchanged; current runtime/tests match accepted C3 hashes.
- C3's 224/224 full game and 27/27 preview acceptance remain historical. Full/preview/bake/smoke/browser checks were **not rerun** for S0. Actual save files, parser rejection, atomic load and file:// dialogs/download/import do not yet exist and are unverified.
- **GR-09 native background-tab/minimize remains unverified.** No controlled visibility fixture closes it.

Reproduce from repository root: `node docs/reviews/2026-11-26-s0-save-load/check-state.cjs` and `node --test --test-name-pattern='^floors preserve|^ring pickup|^merchant ring|^hidden key|^uncollected key|^key pickup|^hazard clocks|^depth 50 has|^Town Scroll return|^Town Scroll portal|^T2 addScrolls rejects unsafe|^C3.*travel|^C3.*retirement' tests/game.test.cjs`. On this machine prefix Node with `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node`.

**Next in this queue: IMPLEMENT/S1 only when requested.** No production implementation was authorized by this planning-only handoff. G1 gold and market M1–M3 are independent alternatives; none started by S0.
