# Release-readiness review — 2026-11-26

**Technical review/package verification complete. Manual acceptance remains pending. Native GR-09 remains UNVERIFIED.** No runtime/test/art/version changes, staging, commits, tags or publication. This is a review of current unreleased working-tree bytes, not approval or creation of another release.

## Subsequent acceptance execution

The [acceptance run](../2026-11-26-acceptance-run/README.md) freshly reruns available checks against these same runtime bytes and updates the [checklist](manual-acceptance.md). Chrome/WebKit package and bidirectional Chrome save portability checks pass; Firefox runner coverage is incomplete. Human/platform gaps and **native GR-09 UNVERIFIED** remain explicit. The fresh-versus-reused table below describes this earlier readiness pass, not the later execution.

## Deliverables

- [Manual acceptance checklist](manual-acceptance.md): tester/device/browser/candidate identity, genuine native background/minimize observations, native chooser cancellation, another engine/physical mobile, human campaign/audio/balance and final visual decision. Every manual result starts **Not run / Not observed / Pending**; none is inferred from automation.
- [Exact package inventory/hashes/paths](package.json): five runtime files, deterministic ZIP, CRC-tested relocated extraction, source fingerprint and script order.
- [Actual offline browser results](package-browser.json) / [runner](check-package.cjs), [package smoke](package-smoke.txt), [fresh syntax/protected-file/status/links checks](file-checks.json).
- Current task/agent/developer/planning/handover/prompt status reconciled. Old dated evidence and original FG criteria remain historical records, not silently rewritten as passed human approval.

## Status reconciliation

| Previous ambiguity | Current authoritative status |
| --- | --- |
| Graphics still partial / generated payload untracked | GR-01–08/10 complete; payload tracked and present in recorded 2.0.0 tag and current package. `git ls-files` and tag object existence checked locally. |
| FG unchecked criteria imply all migration must be repeated | FG original design checklist retained with explicit mapping to completed GR evidence. No blanket human visual acceptance inferred. |
| FG-01 cinematic audit still open | GR-08 completed technical intro/defeat/ending coverage. Final human runtime visual acceptance is separately pending. |
| Heap crash / old155/181 counts presented as current | Resolved by GR-01; M3 evidence records 307 game/87 focused/27 preview passing. This review separately marks fresh versus reused checks. |
| T2 “latest193/199 / next C1” | Historical T2 result; C1 fixed the six failures and C1–C3 is complete. |
| Current prototype/concurrent-work banners / pending market references | Historical P0 context distinguished from completed T/C/G/S/M queues. No automatic next market phase. |
| Original companion no-cross-reload scope | Later approved S1–S4 preserve companion selection/unlocks through manual files; no browser-storage/autosave dependency. |
| Graphics prompt defaults to redo GR-01 | Current ROCKET handoff defaults to REVIEW/drift audit; native GR-09 cannot be closed by injected flags. |
| Version 2.0.0 might identify new features | Recorded2.0.0 is the earlier graphics release. Current feature work is unreleased with unchanged branding; exact candidate is identified by hashes below. |

Reconciled `tasks.md`, `handover.md`, `agents.md`, `DOCUMENTATION.md`, current master/graphics/companion/travel/gold/save/market plan headers and stale prompt context. Original dated reports and release 2.0.0 notes stay intact. Player README/Help and all five runtime files are unchanged by this readiness pass. The build-prompts skill was applied to the corrected [graphics handoff](../../prompts/2026-11-25-graphics-recovery-local-llm.md).

## Clean distribution package

A minimal playable review archive contains **only**:

1. index.html
2. style.css
3. js/art-runtime.js
4. js/sprites.js
5. js/game.js

The HTML references only the local stylesheet/three ordered scripts; CSS adds no external assets. Runtime source PNGs, previews, source pack, docs, test harnesses, development tools, git metadata and node_modules are absent. This whitelist verifies playable runtime independence; it does not decide future source/docs release packaging. The archive is temporary and intentionally outside the repository; recreate using [package-review.py](package-review.py). It does not modify git or runtime sources.

Current artifact:

- **4,545,098 bytes** compressed; **11,957,538 bytes** runtime uncompressed.
- ZIP SHA-256: `a272a32116799f04302016e46f5020fd85ce993fc054b962faffce99137c33a0`.
- Source fingerprint: `f22ae47c75be29fbb3d294241fe52f7c0cceb57564975f3745fc4081cacf7611`.
- [Review ZIP](/var/folders/lp/737kz569419gglsqmvs0x0200000gn/T/dungeon-release-readiness-_m45croa/dungeon-crawler-review-f22ae47c75be.zip).
- All five entries are tracked source paths; the review includes their current working-tree content, not just HEAD. Relative paths are preserved; no symlinks/absolute/traversal entries. CRC and extracted hashes match originals. A relocation with spaces in the folder name also passed.

Regenerate/reverify if any runtime byte changes. Date-fixed ZIP entries make its bytes reproducible for this snapshot; the manifest records actual temporary locations. Do not use the branding alone as candidate identity.

## Fresh verification on this review

| Check | Result / evidence |
| --- | --- |
| ZIP whitelist, CRC, extraction, source hashes |Pass; [manifest](package.json) and builder |
| Source and copied/extracted runtime syntax |Pass; all three scripts plus unchanged tests and review runner [manifest](file-checks.json) |
| Prepared sources |27/27 [fresh preview tests](preview-tests.txt) |
| Non-writing payload reconstruction |Pass; [bake](bake.txt), no generated-file write |
| Clean extracted-package startup/input smoke |SMOKE_OK; [log](package-smoke.txt). Temporary copy of documented external smoke with only its hard-coded root adapted; original external script untouched. |
| Original clean folder + relocated ZIP extraction |Pass, fresh Chrome desktop 1440×1000 and 390×844 touch-emulated contexts with network **offline** and Storage/IndexedDB methods made to throw |
| Actual dependency access |Only the five whitelist files, including after reload; zero HTTP requests/page/console errors |
| Native browser flows |Launch/Pip choice and recruitment, actual carrier death/key drop/Space collection, connected stairs/descent, market select/Add/Cancel/Confirm, Blob save download, page reload, real file-input/FileReader preview and explicit Load, exact complete durable-run equality, receiving audio preference, one-use portal, wall rejection |
| Inspection |[Desktop/touch runtime captures](screenshots/README.md), inspected; staged positions/resources are documented |
| Source/staging preservation |Runtime/tests equal task-start/M3 hashes; staged diff unchanged; no commit/tag/publish command. Final status/hash evidence in file-checks.json |

Tests stage positions/resources and stop normal intervals to make assertions repeatable; this is not a natural human campaign. The first package probe incorrectly staged only a collected-key flag; S1 correctly refused that impossible key history. The runner now uses real carrier death, key drop and native Space collection, then passes save validation/download/load without runtime changes. The corrected fixture is not a relaxation of the validator.

**Reused evidence, not rerun here:** M3's 307/307 full game and 87/87 focused tests, because all five runtime files and tests exactly match the recorded M3 hashes. [M3 acceptance](../2026-11-26-m3-market/README.md), [full log](../2026-11-26-m3-market/game-tests.txt). No logic/test change justified repeating the multi-minute suite. M3 performance/seed comparisons and S4 broad portability/limits remain dated evidence, not newly measured in this pass.

## Remaining acceptance and release boundary

- **Native GR-09: UNVERIFIED.** Need real hidden/background/minimize transitions during active gameplay and cinematics, frozen native-event state and no catch-up. No injected visibility test is substituted.
- Manual native OS chooser cancellation, another browser engine and physical mobile: not observed/run. Browser file input automation and touch emulation do not establish them.
- Human natural 100-floor campaign, difficulty/boss pacing/audible quality and final explicit runtime visual acceptance: pending.
- Optional themed extras are deferred scope decisions; they are not unresolved implementation defects or silently added requirements.
- Publication approval/version selection/commit scope: not requested by this review. Existing 2.0.0 branding stays unchanged and all current uncommitted/untracked user work is preserved.

**Next:** execute/record the [manual checklist](manual-acceptance.md) against this exact archive. Technical review completion is not a blanket release sign-off or permission to publish. Record any later residual-risk/visual/release decision explicitly; do not auto-close manual items.

## Reproduce

Run `python3 docs/reviews/2026-11-26-release-readiness/package-review.py`, then the review browser runner with the host's working Node/externally installed Playwright/Chrome. The current host needs `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib /opt/homebrew/bin/node`; another working Node needs no such setting. Packaging uses Python standard library only; none of these development tools is needed to play. The temporary root-adapted external smoke is recorded in the validation manifest. No runtime build/server/network dependency is introduced.
