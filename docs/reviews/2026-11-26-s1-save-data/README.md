# S1 — pure save-data serialization and validation

2026-11-26. Explicit request: implement **S1 only**, regression tests, developer docs/tasks/handover. [S0 audit](../2026-11-26-s0-save-load/README.md) · [82-field contract](../2026-11-26-s0-save-load/schema-matrix.md) · [phase plan](../../plans/2026-11-26-save-load-plan.md).

## Delivered API and schema

Plain-script helpers in game.js: `captureSaveData(source, context)`, `serializeSaveData(source, context)`, `parseSaveData(text)` and `validateSaveData(dto)`. Results are detached JSON DTOs/text, never runtime hydration or a state swap. Invalid data throws an `Error` beginning `Invalid save:`. Metadata time is supplied explicitly; helpers consume no wall-clock progression, RNG or gameplay actions. Context requires createdAt plus hidden/tradeOpen/companionOpen booleans supplied by the future caller; no DOM dependency is hidden in the pure API.

Envelope: dungeon-crawler-save, formatVersion 1, gameVersion, canonical ISO createdAt, run. Explicit allowlists cover the S0 durable fields, category limits and cross-field checks. Unknown fields, malformed/wrong/null records, dangerous prototype-sensitive names, bad identities/modifiers/positions/flags/numbers and unsupported versions reject without repair. Item records retain validated ITEM_TABLE fields plus scoped coordinates/ID; static companion attributes are replaced by registry ID plus exact x/y.

| S0 risk | S1 handling / evidence |
| --- | --- |
| Active arrays/scalars newer than floor cache | Overlay every FLOOR_FIELDS entry into a detached active-floor DTO; retain cached wrapper descentRewarded. Never call saveFloor/saveTown. Active town map/visited/props/merchant override town copies. |
| Alias identities | Store one town store, omit duplicated landmark store, record companionBoardIndex into town props. Current bossId references the exact encounter row. S2 must reconstruct runtime aliases/Sets; S1 returns JSON only. |
| Current encounter vs respawn templates | Current positions/HP/nextAttackAt/array order, all dead rows and guard history remain separate from immutable-health templates; bossIntroSeen/bossSummonAt retained. No regeneration, placement, rewards or pruning. |
| XP beyond safe range | Match the actual rounded recurrence for all 100 levels. Finite integer XP and exact thresholds at 83–99 survive; capped level100 requires xp0/xpNext1. Counts/IDs/currency stay safe integers. |
| Ring/market side effects | Preserve hero/gear together, including 37/80 ring HP, without equipItem or deriving maxHP. No repair of market leaks or mid-trade export. |
| Companions/return points | All 11 roster IDs/selected/choice/entry/cat flags/deadlines retained; exact position without adjacency repair. Town depth, blocked return points, scroll/retreat/cheat reasons and open portal during another debug floor are accepted. |
| Trap/once-only state | Hidden/revealed/spent hazard flags/deadlines, key drop/collection/carrier, rescue/stock and descent/boss flags preserved. Dead final dragon with princess rescue pending accepted; completed rescue rejected for living v1 saves. |
| UI/resources/transients | Exclude art/audio/DOM/focus/motion/session/console/god snapshot/bubbles/in-progress cinematics. Stable living saves allow own Help but block hidden/console/god/menu/pause/dead/cinematic contexts. Load-context/session/commit rules remain S2/S3. |

## Bounded parsing and refusal

UTF-8 input/output <=33,554,432 bytes, including whitespace on input; text nesting checked before JSON.parse. Iterative descriptor-based preflight counts <=4,000,000 values/containers and <=16 container levels with a depth-bounded work stack. It rejects functions/undefined/bigint/symbols/nonfinite values, cycles, custom prototypes, accessors, sparse/extended arrays and non-enumerable execution hooks before stringify. Direct object APIs expect ordinary DTO/runtime data, not executable proxies; JSON text is the untrusted import boundary.

Known schema records have <=128 fields; no schema array exceeds 65,536 rows. Per-category S0 bounds remain stricter (maps64×96, visited6144 unique canonical coordinates, up to100 floors, rooms32, templates41, depth-dependent objects/hazards, town104 props/4 NPCs/6 animals, stock6, roster11, journal80×512). Objects/arrays are checked before category loops; histories exceeding the supported format fail clearly rather than truncating or mutating the adventure. No claim to accept infinitely accumulating guard/debug history. S3 still must check File.size before reading a file.

## Tests and measurements

Twelve regression groups are in tests/game.test.cjs. [Original-runtime run](before-implementation.txt): all 12 fail before implementation. [Focused run](focused-tests.txt): 12/12 pass. Covers pure detached round trips/no-RNG/action sentinels; stale floor/town cache; levels1–100; 100 guard-summon cycles/200 guard rows and negative corpses; eleven companions/ring/blocked and cross-depth portals/patrol mismatch; blocked contexts/Help; table-driven corrupt and wrong-type/null data; UTF-8 byte/nesting/node limits, getters/toJSON/prototype hazards; revealed/spent hazards, stock/rescue/key/reward flags and final boss corpse/revisit; actual100-floor+10k inventory fixture; over-limit refusal and exact82-field inventory/Unicode journal/detached validation.

[Final full game suite](full-tests.txt): **241/241 pass**, zero failures/skips (229 pre-S1 +12 new regression groups). [Preview tests](preview-tests.txt) pass 27/27; [non-writing bake](bake.txt) and external [SMOKE_OK](smoke.txt) pass. [Syntax](syntax.txt), [runtime delta](game-delta.patch), [test delta](tests-delta.patch), [protected-file comparison](file-checks.json).

[Reproducible final DTO stress runner](check-size.cjs) · [measurements](size.json). Two real-generation, full-exploration/content-retention fixtures (seeds713/42), not completed player campaigns:

| Seed | Final JSON UTF-8 bytes | Nodes | With10,000 stored potions |
| --- | ---: | ---: | ---: |
| 713 | 8,380,532 (~7.99 MiB) | 1,458,973 | 8,960,531 (~8.55 MiB) |
| 42 | 8,377,938 (~7.99 MiB) | 1,458,666 | 8,957,937 (~8.54 MiB) |

Capture including validation ~2.2s; parse+validation ~2.5s; stringify alone ~12ms on this machine in Node. These measurements include structured validation and are much slower than S0's raw stringify/parse projections. They do **not** establish browser/mobile responsiveness or an absolute maximum. Browser large-file responsiveness must be measured before S3/S4 acceptance; no asynchronous file session or performance claim is added here.

## File browser scope and remaining phases

[Pure API file:// runner](check-browser.cjs) · [results](browser.json): Chrome desktop1440×1000 and touch-emulated390×844, actual launch click/tap and Help keyboard host, town/dungeon API round trips/detachment/atomic invalid-gold rejection, unchanged semantic state and RNG/sound sentinels; zero page/console errors or remote requests. Simulation intervals are stopped and area entry is staged. This is **not** native file-dialog/download/import, a loaded playable save, native mobile keyboard or large-file/browser performance acceptance.

S2 remains required for detached runtime hydration/canonical aliases/atomic identity-bound commit; S3 for accessible file controls/read/preview/cancel/download; S4 for actual download→reload/import/another path-profile/mobile and complete acceptance. S1 does not make save/load playable. No player README/Help, HTML/CSS, graphics, economics, combat, market, release/version or git staging/commit changes. Existing dirty worktree preserved; removing the S1 section yields the exact pre-S1 game.js bytes.

**GR-09 native background-tab/minimize remains unverified.**
