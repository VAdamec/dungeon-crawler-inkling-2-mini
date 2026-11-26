# S3 — portable file controls

2026-11-26. Requested next phase after S2: **S3 only**, local JSON save/load controls and regression/desktop-mobile checks. [Phase plan](../../plans/2026-11-26-save-load-plan.md) · [S1 DTO](../2026-11-26-s1-save-data/README.md) · [S2 atomic core](../2026-11-26-s2-save-load/README.md).

## Delivered player controls

Help now has a short Your adventure section with Save game and Load game. Launch and ordinary death offer Load adventure. Save requests a timestamped portable JSON download using the existing validated serializer, Blob and temporary attached anchor. Feedback says Download requested, not guaranteed disk persistence. URL cleanup is scoped to its own URL after30s; failure removes the anchor/revokes the URL without changing the adventure. No storage account, localStorage/IndexedDB, network API, module/build/dependency or browser-reserved hotkey.

Load opens a bounded fixed dialog with a labelled native file input, selected filename, status, validated location/hero/HP/MP/gold/time/version preview and explicit Load/Cancel/sound footer. Save/Load controls reflect eligibility; Cancel stays in view, Tab/Shift+Tab are trapped, native buttons/Enter work, Esc cancels, R restarts, M/sound remains usable. Existing launch/game/Help backgrounds are inert and exact prior focus/inert flags return on cancel. Text/filenames use textContent. Screenshots below were inspected at1440×1000 and390×844.

[Desktop preview](desktop-preview.png) · [Mobile preview](mobile-preview.png).

## Read and confirmation lifetime

All transient transport state lives inside the existing `state.loadSession.ui`; **83 initialized top-level state keys, unchanged v1 schema**. A fresh file input captures each dialog session, and each file selection owns a separate read identity. Size is checked before reader creation/readAsText; S1 independently checks decoded UTF-8/schema. Selecting again resets data/input value, aborts an active reader and clears queued work; same-file selection works. A native input cancel event returns to a choice prompt; the visible Cancel/Esc route also works when the browser supplies no cancel event. No unreliable focus-return inference automatically resumes or loads.

Reader errors, bad/future/oversized saves remain reversible inside the modal; parse/preview never changes the run. Validation yields a task. Explicit Load queues a separate guarded commit: Cancel/reselection/restart/travel/death/new session makes old reader/validation/confirmation callbacks no-ops, including a replaced file in the same modal. Pure validation may finish while hidden, but confirmation checks visible/current S2 eligibility at request and execution; a blocked queued confirmation returns to ready without auto-loading later.

Success releases reader/data/input and retains S2's fresh active presentation. Paint failure after a state swap uses S2 rollback, closes/releases the consumed modal, restores underlying Help/launch/death focus/inert state and reports failure there. Retry opens a fresh token. S2's presentation snapshot now includes file controls and skips assigning file input values (browser restriction). Export/cancel/forced discards reset wall-clock timestamps, never active-time deadlines. No generation/healing/rewards/RNG/journal effects were added.

## Regression tests

**266/266 full game tests pass**, zero failures/skips ([full output](full-tests.txt)); **12/12 focused pass** (10 new S3 groups plus2 existing S2 stale/rollback groups, [output](focused-tests.txt)). All10 new groups fail against pre-S3 runtime ([red run](before-implementation.txt)). Existing tests were preserved; the small DOM fixture now registers dynamic IDs and initializes the new hidden overlay to match HTML.

New groups cover pure export and independent URL cleanup; unsupported/failed Blob/download cleanup; launch/Help/death modal/focus/Cancel; reader→validation→preview→explicit deferred commit; size-before-read and invalid/future/read errors; replacement/same-file/cancel; old callbacks and confirmation after newer file/session/run; hidden validation/blocked queued confirmation; failed commit origin/error/resource cleanup; active-reader abort/R reset/format exclusion.

The real browser caught a focus defect before completion: sound-triggered render disabled the underlying origin button, so Cancel could not focus it. [Before-fix browser failure](cancel-focus-before-fix.txt). Fixed eligibility refresh before focus restoration, with disabled→enabled origin-control regression and real sound/Cancel checks.

**27/27 preview tests pass** ([output](preview-tests.txt)); [syntax](syntax.txt), deterministic [non-writing bake](bake.txt), external [SMOKE_OK](smoke.txt), local links and diff whitespace pass. [Runtime](game-delta.patch), [HTML](html-delta.patch), [CSS](style-delta.patch), [test delta](tests-delta.patch) and [file hashes](file-checks.json) isolate this phase from the preexisting dirty worktree.

## Actual file:// browser checks

[Runner](check-browser.cjs) · [results](browser.json). Headless Chrome desktop1440×1000 and touch-emulated390×844 with actual native Blob/download events and FileReader:

- Download file to /tmp, parse its bytes, verify version/hero37/80/gold293 and unchanged source progress/RNG-independent semantics. Status honestly reports request.
- Select a real sparse33,554,433-byte file: rejection occurs before readAsText (native prototype counter remains0). Corrupt file is reversible; same-file re-selection works.
- Real Help entry, native file-chooser selection through Playwright, validation/preview without loading, sound controls, Cancel/focus return, Tab trap and bounded44px footer controls.
- Live500ms interval and world key input freeze behind modal. Explicit confirm restores exact DTO and receiving mute preference.
- Actual basic download→page reload→file selection/confirm from launch and after ordinary death. A second native dungeon file restores a4HP monster/current encounter exactly without respawn.
- Controlled DOM cancel event exercises supported handler (not native OS cancellation observation). Controlled delay before a native reader starts lets its real completion arrive after R; new run/UI remains unchanged.

No page/console errors or remote requests. Source/receiver stats/positions and fault/race scheduling are labelled fixtures; browser File/Blob/download/FileReader/controls are real. Screenshots inspected. The small town files are ~42KB; these are not100-floor stress/performance results or physical-mobile/browser-wide compatibility claims.

## Remaining acceptance and scope

**S3 implementation complete; S4 remains pending.** S4 must cover another game-file path/profile, broader world/travel/portal/hazard/campaign portable-file scenarios, maximum valid100-floor actual files, browser/mobile responsiveness and final player documentation/screenshots/credits/changelog acceptance. Basic Chrome reload/import is now verified; do not call all file transport unverified, or mark the whole S4 matrix complete from these examples. Native OS chooser cancellation and native GR-09 background-tab/minimize remain unverified. The explicit Cancel fallback is implemented/tested; no OS cancellation observation is claimed.

Validation/commit remain bounded synchronous work after a task yield; S1's large DTO validation takes seconds in Node. File-backed UI is usable, but large-file UI responsiveness still needs S4 measurement. Release/version remains2.0.0; no staging/commit/tag/release. Art/sprites/campaign/combat/market unchanged. Existing player README is the release baseline, retained for S4's documentation acceptance; in-game Help contains only concise play/file instructions. No automatic next phase.
