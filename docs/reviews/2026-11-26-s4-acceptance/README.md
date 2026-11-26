# S4 — save/load portability and performance acceptance

2026-11-26. Requested S4 is complete within the Chrome desktop/touch-emulated scope below. **Native GR-09 background-tab/minimize remains unverified.** No staging, commit, release/version, artwork or market changes.

## Findings and fix

The S3 UI accepted large files, but synchronous validation/hydration/export blocked the constrained browser for1.1–1.3 seconds. S4 shares generator-based validators between the synchronous model APIs and a cancellable UI driver. It slices structural/UTF-8/schema/floor/record/Set work; no workers, modules, extra scripts or dependencies. Large export projects at a stable logical boundary then freezes through the existing session before yielding. Help offers **Cancel save (Esc)**. Work/timers/closures belong to `loadSession`, not a new state field. Cancellation, replacement, restart and lifecycle invalidation reject late work before commit/download. v1 schema,83 initialized fields and atomic presentation rollback remain intact.

`commitSaveLoad(dto)` is still the public validating path. A private atomic boundary accepts only the completed candidate from validated internal hydration; UI never accepts an external prehydrated candidate. The first loaded paint does not replay rewards/healing/RNG. Receiving audio preferences/context and art caches survive; canonical world/store/board/boss aliases and Sets are reconstructed.

Native JSON parse/stringify, a bounded floor validation and presentation paint are indivisible. Chunk scheduling aims for8 ms, with at most32 yielded steps per task; it is not a hard frame deadline. Total wall time increases in exchange for processing Cancel/Esc/R between chunks. Over-limit histories refuse without truncation.

## Actual portable-file matrix

[Runner](check-portability.cjs) · [results](portability.json) · [fixture generator](make-fixtures.cjs) · [manifest](fixtures.json). Each row travels through real native input/FileReader → checked preview → explicit Load → Blob download in profileA, imports/downloads in profileB, then imports back inA. Entire durable `.run` equality, aliases and receiving resource identity are asserted at every import. Both persistent profiles start fresh. ProfileB runs an independent copy containing only index/style/threeJS, in a path with spaces. Storage/IndexedDB methods throw if called; zero HTTP requests and console/page errors. A relocated reload and ordinary-death import also pass.

| Scenario | Initial file bytes | Additional resumed-play coverage |
| --- | ---: | --- |
| large | 8,960,545 | 100 fully explored floors +10,000 stored potions; damaged encounter and saved clocks |
| max-bytes | 33,554,432 | Same valid content padded with JSON whitespace to the exact32MiB input limit |
| town | 42,080 | Ring/sword/shield, stored inventory, selected Pip/unlocks, patrol/store, Unicode/plain text |
| dungeon | 66,298 | Damaged/dead encounter, key/loot/rescue/stock/hazard; revisit respawn and once-only reward |
| scroll | 65,034 | Open portal returns once; no extra scroll/heal |
| retreat | 65,094 | Blocked saved tile finds safe fallback; cooldown/MP retained |
| cross-floor-portal | 90,693 | Debug portal retains originating floor across fresh-level travel; once-only safe return |
| guards | 120,052 | 200 historical dead guard rows; next summons have fresh IDs |
| final | 95,712 | Dragon remains dead, no repeated XP/gold, princess still pending |
| level-83 | 42,273 | Rounded unsafe-integer XP threshold retained |
| level-99 | 42,278 | Rounded unsafe-integer XP threshold retained |
| level-100 | 42,243 | Capped XP0/next1 retained |

Fixtures use real seeded generation and actual travel/summon/kill helpers plus explicitly staged exploration/content/progression. They are not completed campaigns or absolute lifetime maxima. The32MiB file tests the input byte boundary, not32MiB of distinct world contents. Inventory65,536 acceptance/65,537 refusal is additionally covered in Node; unlimited guard accumulation is deliberately unsupported by the bounded format. Large late-floor schema corruption and prototype-sensitive input are rejected with the old run unchanged and no pollution.

## Paired browser performance

[Before](performance-before.json) · [After](performance-after.json) · [exact32MiB input](performance-max-bytes.json) · [runner](check-performance.cjs). Same browser/host, native local files, one paired sample per profile; intervals stopped to isolate file work. Native timers provide a20ms heartbeat and PerformanceObserver records long tasks. Chrome1440×1000 at1×,390×844 touch-emulated at CDP4× CPU slowdown. This is not physical mobile. Times include native UI/file/download steps and polling; no statistical performance guarantee.

| Profile / step | Before total ms | After total ms | Before max heartbeat gap ms | After max gap ms |
| --- | ---: | ---: | ---: | ---: |
| 1× / Preview | 339 | 563 | 308 | 50 |
| 1× / Load | 306 | 542 | 305 | 33 |
| 1× / Save | 325 | 537 | 275 | 33 |
| 4× / Preview | 1299 | 1907 | 1273 | 94 |
| 4× / Load | 1145 | 1718 | 1166 | 84 |
| 4× / Save | 1156 | 1712 | 1121 | 94 |

Exact32MiB padded input: preview679ms desktop /2239ms4×, maximum gaps37/106ms; load529/1708ms and export543/1679ms. Compact output remains8,960,545 bytes. Some native operations still cause50–100ms long tasks under throttling; total large-file work is not instantaneous. No frame-time/FPS or peak-memory claim.

[Real cancellation runner](check-cancellation.cjs) · [results](cancellation.json): Cancel during native large-file validation, Esc during hydration, Help's Cancel save during export, and R during a second export all preserve the appropriate owner/new run and produce no late download. Sample UI cancellation15–95ms at4× on desktop/touch viewports. Ready previews and preparing-save screenshots were inspected for clipping/readability; mobile Help scroll keeps Cancel reachable.

## Automated verification

- Full game273/273; save-focused44/44 (seven new S4 groups), prepared source27/27. [Full log](game-tests.txt), [save log](save-tests.txt), [final expanded S4 atomic rollback/hidden-state group run](s4-tests.txt), [preview log](preview-tests.txt).
- S4 covers scanner escape/surrogate chunk boundaries, cooperative no-early-commit/equality, stale/cancel/replacement/restart, explicit-load revalidation failure, frozen cancellable export, lossless export/error refusal and65,536-row inventory boundary. Existing S1–S3 semantic/adversarial/rollback/hidden-state regressions remain passing.
- Syntax checks allthree runtime scripts, tests and new development runners; non-writing [bake check](bake.txt); external [SMOKE_OK](smoke.txt). [Final file/hash/links checks](file-checks.json).
- [Inspected runtime UI screenshots and setup](../../screenshots/2026-11-26-save-load/README.md). Player README/guide, developer API/scheduling docs, credits, changelog, plans/prompt, tasks and handover updated.

## Remaining limits

**GR-09 native background-tab/minimize remains unverified.** No native visibility claim follows from controlled handler fixtures. Physical mobile, other browser engines and manual native OS chooser-cancel observation are not established; the native cancel event handler and always-visible Cancel/Esc fallback are covered separately. No autosave/browser-storage/server feature, RNG sequence portability promise or save migration beyond v1. Published2.0.0 predates this unreleased work. MarketM1–M3 remain independent and require their own request.

## Reproduce

Use Node with the host's required simdutf library path. Generate fixtures first using `node make-fixtures.cjs`; then run `check-portability.cjs`, `check-cancellation.cjs`, and `check-performance.cjs <output.json> [fixture.json]` from this directory or by absolute path. Development runners use external `/opt/homebrew/lib/node_modules/playwright` and installed Chrome, keeping dependencies/profiles/downloads outside the game; no runtime build or network dependency. Baseline before timings were captured against the S3 source backup before this fix, not regenerated against the final runtime. Temporary fixture/profile/download paths are recorded for reproducibility and can be regenerated.
