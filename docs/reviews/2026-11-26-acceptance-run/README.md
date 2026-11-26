# Acceptance execution — 2026-11-26

**Available checks executed; manual/platform acceptance remains incomplete. Native GR-09 remains UNVERIFIED.** No game/runtime/test/art/version change, staging, commits, tags or publishing. This evaluates the same unreleased candidate as the [readiness review](../2026-11-26-release-readiness/README.md), not a new release.

## Candidate and environment

- Exact [five-file package manifest](package.json) / [fresh integrity results](package-integrity.json). ZIP SHA-256 `a272a32116799f04302016e46f5020fd85ce993fc054b962faffce99137c33a0`; source fingerprint `f22ae47c75be29fbb3d294241fe52f7c0cceb57564975f3745fc4081cacf7611`.
- Branding remains 2.0.0; current worktree feature content differs from the older published release. Hashes identify this candidate.
- macOS 26.7.3 / arm64, Node 26.12.1; Chrome 158.0.8127.37 and Playwright WebKit 27.2. [Host record](environment.json). WebKit is a Playwright test build, not Safari.app or an iPhone.
- Independent clean runtime folder and relocated ZIP extraction, including spaces in paths. Browser contexts offline with Storage/IndexedDB methods made to throw for package checks. No relaxed file-access flags; no runtime development dependency.
- External Playwright was already installed; Firefox/WebKit test binaries were downloaded to `/tmp/dungeon-acceptance-browsers` ([installation log](browser-install.txt)). No dependency/build/server added to the game.

## Executed results

| Check | Result / evidence |
| --- | --- |
| Full behavior regression suite | **307/307 pass**, 0 failed/cancelled/skipped/todo; fresh [log](game-tests.txt), about 212 seconds. Includes existing save/market/modal/recovery, audio scheduling, hidden-handler and boss/ending groups. No separate 87-test focused rerun claimed. |
| Prepared-art source tests | **27/27 pass**, fresh [log](preview-tests.txt) |
| Payload determinism / extracted smoke | Fresh non-writing [bake](bake.txt) pass and [SMOKE_OK](smoke.txt); retained root-adapted external smoke, original external script untouched |
| ZIP and source preservation | Exact whitelist, CRC, source/copy/extracted/ZIP hashes pass; [integrity](package-integrity.json), [final file checks](file-checks.json). Six protected source/test files match task-start/readiness hashes; staged diff unchanged. |
| Chrome package flows | **Pass**, desktop 1440×1000 and narrow/touch-emulated 390×844, fresh contexts; [results](package-chromium.json), [log](package-chromium.txt) |
| Another engine: WebKit | **Pass within tested scope**, same two sizes/folders; [results](package-webkit.json), [log](package-webkit.txt). No Safari.app/physical-iOS claim. |
| Firefox package runner | **Incomplete / harness failed** at first desktop profile's final `requests.length>=10` assertion; [failure](package-firefox.txt). Earlier awaited flow assertions and desktop capture were reached, but no completed runner result or narrow-profile pass. |
| Bidirectional files/profiles/relocation | **12/12 scenarios pass**, two fresh persistent Chrome profiles; [results](portability.json), [log](portability.txt), [runner](check-portability.cjs), [fixture paths](fixtures.json) |
| Staged 100-floor mechanics | **Pass**, 99 real carrier deaths/drop collections, 13 boss encounters (including Cook/Bartender), actual stair descent, four exact save/hydrate checkpoints, once-only final rescue/ending/restart, no depth 101; [results](campaign.json), [runner](check-campaign.cjs), [log](campaign.txt) |
| Pure save-data limits/rejection/timing | **Pass**, 8,960,545-byte and exact 33,554,432-byte files, exact detached round trips; corrupt/unsupported-version and 32 MiB+1 refusal leave live state unchanged. [Results](save-model.json), [runner](check-save-model.cjs), [log](save-model.txt) |
| Native file chooser / background / minimize | **Not observed. GR-09 UNVERIFIED.** Native CUA `file://` tab action was rejected by browser URL policy (HTTP/HTTPS only). No workaround attempted, native driver stopped. [Record](native-observation.json) |
| Physical mobile / natural campaign / listening / final visual approval | **Not run / pending**. Headless, viewport emulation and staged state do not establish them. |

No runtime defect was demonstrated in the completed checks. The Firefox harness failure is retained and prevents an overall Firefox acceptance claim; it is not hidden by the successful WebKit result.

## Scope of actual file/browser checks

The package flows exercised native keyboard/pointer/tap events: launch and Pip choice/recruitment, actual monster/key drop and Space collection, connecting stairs, market Cancel then Confirm, real Blob download to disk, reload, file input/FileReader checked preview and explicit Load. Restored full durable `.run` equals the selected downloaded DTO; receiving audio preference is retained. One-use Town Scroll portal and blocked-wall movement assertions pass. Only the five runtime files were requested; Chrome/WebKit results contain no page/console errors or HTTP requests.

Normal simulation intervals were stopped and progression/positions/resources staged to make these probes deterministic. Browser file-input assignment is not manual native OS chooser interaction. Audio preference checks are not audible-quality acceptance. [Inspected captures](screenshots/README.md) establish only what those frames show, not final human approval of all biomes/cinematics.

The 12 transported scenarios include town, damaged dungeon encounters, scroll/retreat/cross-floor returns, guard history, final floor before rescue, levels 83/99/100, a 100-floor 10,000-potion file and the exact 32 MiB padded input boundary. Each imports/downloads in profile A, imports/downloads in profile B's independent five-file folder, then imports back in A. Complete durable equality, Sets/object aliases, receiving resource identities and resumed mechanics are asserted. Reload and death-screen imports work; late-floor map corruption and prototype-sensitive inputs leave the adventure unchanged with no pollution. Input padding tests the byte boundary, not 32 MiB of distinct gameplay content.

The VM campaign bypasses travel/combat effort through staged coordinates and direct lethal damage, disables rendering/audio and does not advance normal enemy ticks. It demonstrates gates, persistent progress and ending state, not natural-play difficulty, win rate, balance, visible animation or listening quality. Four checkpoint sizes were 43,816 / 140,554 / 1,556,367 / 3,607,698 bytes at depths 1/5/50/100.

## Performance observations

Fresh portability wall-clock Load samples were 66–67 ms for small files and 516–547 ms for the large/exact-byte-boundary fixtures. These include automation/polling overhead, are single samples and do not measure worst-frame gaps or physical-device speed.

Fresh synchronous Node/VM parse+validate / hydrate / serialize+validate samples:

| Input | Parse+validate ms | Hydrate ms | Serialize+validate ms |
| --- | ---: | ---: | ---: |
| 8,960,545 bytes | 2291 | 1968 | 2006 |
| 33,554,432 bytes, padded | 3075 | 2014 | 2013 |

These synchronous model timings exclude the browser cooperative driver, UI/paint, native files and audio. They are not comparable to browser cancellation latency/FPS or a before/after optimization. Earlier [S4 constrained-browser performance](../2026-11-26-s4-acceptance/README.md#paired-browser-performance) and [M3 market samples](../2026-11-26-m3-market/README.md#measured-performance) remain dated evidence, not newly rerun measurements.

## Harness findings and remaining work

1. **Firefox runner:** requiring at least ten request events assumes that reload reports every cached file again. That count is not a game requirement. The failure log does not record the actual count; do not invent it or infer a full Firefox pass. The [original executed runner](check-package-original.cjs) is retained. The [corrected review runner](check-package.cjs) now checks the exact unique five-path whitelist, allowing cache reuse, and uses engine-specific download names to avoid shared scratch paths between simultaneous engine runs. It has syntax validation but **has not been browser-rerun** after the native URL-policy rejection. Retest Firefox in a permitted environment before closing that coverage.
2. **Pure-model fixture:** the first added negative test attempted to replace `version` instead of the real `formatVersion`, leaving that file valid. Its expected-exception failure is retained [here](save-model-initial-fixture-error.txt). Corrected the review fixture only and reran successfully; no validator weakening or runtime change.
3. **Native policy limit:** CUA selected the existing Chrome app instead of the disposable test process; no actions were taken in user content. A new acceptance `file://` tab request was then denied by URL policy. No alternate UI/CDP/surface workaround followed. Automated package/portability runs had already been started independently before that rejection; subsequent additional execution was pure Node/VM and file/hash checks. No synthetic/native visibility pass is claimed.
4. Still require native tab/minimize gameplay, animation, boss/ending and pending-dialog observations; genuine OS chooser Cancel/Esc/retry; actual target-phone portrait/landscape file/input/audio behavior; another-engine audio/restart/native chooser coverage; natural full campaign/balance/listening; final human runtime visual acceptance. Keep manual boxes open until the stated observation occurs.

[Checklist/results](../2026-11-26-release-readiness/manual-acceptance.md), [tasks](../../../tasks.md) and [handover](../../../handover.md) are updated. Completed implementation queues stay complete within their recorded scope. Optional themed extras remain separate. No approval to commit, publish, bump versions or waive remaining acceptance is inferred.

## Reproduction

Use the same runtime hashes and the recorded package paths. Host Node needs `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node`; standard working Node elsewhere needs no such override. Full game tests, prepared-source tests, `bake-runtime.cjs --check` and the two pure Node review runners are independent of browser UI access.

The original package runner produced the archived browser results; its revised successor is an unrerun harness correction. Browser runners use external Playwright and development-only temporary profiles/downloads/fixtures. Temporary fixture paths are in fixtures.json; recreate with the original S4 fixture generator if absent (do not claim a successful run without them). Do not bypass a tool's browser URL restrictions to rerun browser/native cases. The game requires none of these tools or fixture files to play.
