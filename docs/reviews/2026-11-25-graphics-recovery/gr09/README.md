# GR-09 — Acceptance and performance checks

Date: 2026-11-25. **Status: automated checks and fixes complete; native background-tab visibility verification remains open.** Keep GR-09 partially open for that specific check. Release remains 1.0.1; no staging, commit, new art or release performed.

## Issues fixed

1. **Monster render anchors:** the actual dungeon draw call passed a visible-union center to a renderer that expects a tile foot anchor. This introduced small lateral/vertical shifts from health bars/culling bounds and the captured defeat pose. It now passes the original interpolated foot position. A regression covers eleven ordinary/boss/themed/flying roles through the actual `draw()` path, not only metadata.
2. **Cinematic cache growth:** cached canvases contain source-resolution pixels, but the cache key included floating-point display scale. Shrinking the sunset hero created another identical canvas on every new scale value, and repeated endings could continue growing the cache. Raw source canvases are now keyed only by role/direction/frame; `drawImage` still controls output size. A regression stresses 400 unique scale draws: four canvases for four poses, with zero further growth on the second set. The old scale-specific key assertions now require the corresponding source-pose keys while retaining direction/frame separation checks.

Both regressions failed before their fixes. No gameplay state, RNG, timings, collision, rewards or artwork changed in GR-09.

## Automated acceptance matrix

| Area | Checks and evidence |
| --- | --- |
| Syntax, full behavior, focused graphics, preview source checks | Final counts recorded below. No skips, enlarged heap flags or weakened checks. Non-writing bake check passes. |
| External smoke | Updated the documented temporary smoke loader to load art-runtime before sprites/game; `SMOKE_OK`. Script remains outside the repository. |
| Launch, input and audio | Simulation remains frozen at launch; Enter starts the run and resumes a real AudioContext; separate music/effects buses and sliders respond. |
| Town/NPC/Store/Inn/bridge/gate | GR-05/06 actual file:// keyboard crossings, blocked river, Inn heal, Store purchase, gate/portal alignment and exact return; current full acceptance also recruits Marmalade through Space. |
| Dungeon walking/camera/walls | Real movement keys reject a blocked corridor, move through open tiles and scroll the camera. All 1,280 wall masks compared against independent preview: exact alpha, RGB rounding difference ≤1. |
| Keys, stairs, loot and gear | Real generated potion/treasure pickups, actual hidden carrier death/key pickup, descent/ascent/revisit preserve collected items/key; depth-1 ascent returns to town. Gear icons have nontransparent pixels; re-equipping a ring does not stack its HP. |
| Bow and all five spells / traps / portals | Real combat functions and source phases verified by GR-07 browser proof; distinct heals, Barrier impact, one-shot spikes, rock warning/impact, fire cooldown, portal animation/one-use exact return. |
| Low-health/Help/retreat | Real keys open Help over the health pause, trap focus, restore the underlying pause, drink a stored potion, cancel and confirm critical retreat. Retreat preserves MP, restores HP, returns to the exact saved tile and keeps the 60s active cooldown. |
| Console / restart | Actual console text submission exercises loadLevel and godMode on/off; closes normally. R restarts in town without re-showing launch branding. |
| All boss kinds and ending | GR-08 browser proof re-run: nine intros/defeats/adopted companions; six ending phases, gated princess interaction, dragon HP refill, once-only rewards, skip and restart. |
| Fog, traps and minimap secrecy | Actual full-canvas pixel equality with/without hidden spikes, armed rocks and unexplored chest/potion/key/stairs/Mimic; minimap unchanged by secret loot/traps. Closed portal/hidden spike aliases are zero-alpha. |
| Desktop/mobile | Actual desktop file:// layout and 390×844 viewport Help/town screenshots; no horizontal overflow; modal input/focus remain usable. This is viewport emulation, not a physical-phone performance test. |
| Visibility handler | Explicit document.hidden fixture + real visibilitychange event freezes active/hazard/motion/HP and resets resume timestamps. Existing regressions cover hidden-tab lifecycle, capped gaps and stale callbacks. **Native tab transition remains unverified; see below.** |

Browser reports: [extended acceptance](acceptance.json), [walls/town](gr0506-browser.json), [semantics/secrecy](gr07-browser.json), [bosses/ending](gr08-browser.json). Normal Chrome `file://`, no relaxed file-access flags, no page/console errors or remote HTTP(S) requests in passing suites. Tests stage positions/state to reach scenarios; they are not a complete human campaign playthrough.

## Native visibility limitation — remaining check

Headless and visible automated Chrome both continued reporting the native `document.hidden === false` / visibilityState `visible` after background-tab and native-window-minimize attempts. Same-context tabs and disabling forced-focus emulation did not expose a hidden state. Native hidden-target creation was also unavailable through this debugging environment. These failed attempts are harness/environment evidence, **not a pass and not evidence that the game's hidden-state guard failed**.

The acceptance report preserves `nativeBackgroundObserved: false`. The explicit visibility fixture validates the game's handler separately and is never labeled a real native-tab transition. Remaining closure check: in an ordinary user-controlled browser, background/minimize during movement/combat and a cinematic; verify no world/cinematic progression while hidden and no catch-up on return. Keep this GR-09 item open until that result is observed. Do not substitute a passing emulated flag test or invent approval.

## Committed baseline / gameplay comparison

The baseline is a fresh temporary export of HEAD `0f093cd` (pre-art runtime, release ancestry 1.0.1), not a previously measured browser session. Four baseline runtime files total 507,406 bytes. Candidate snapshots include the generated plain-script art payload. Files/source hashes are recorded in state/performance evidence.

[State comparison](state-parity.json): seed 20261125, **33 matched scenarios** spanning town/patrols, six representative generated depths, town return, all spells/traps, all nine boss-kind rewards and the full gated ending's phase/events/HP. Maps, actors, player progression, inventory, loot, active/hazard time, turns, spell/retreat cooldowns and rewards match the committed pre-art baseline. Art/motion caches are excluded explicitly. The earlier intentional GR-08 Skeleton King guard-collapse fix is verified separately with actual summoned guards and no extra XP/gold/kills; it is not hidden as visual metadata in the baseline comparison.

## Fair visual comparisons

[Eight paired play-size scenes](visual/pairs.json): town, gate, crypt, cavern, kitchen, tavern, throne and dragon. Same recorded map, camera, hero/monster positions, facing and pose zero; fog disabled in both isolated review views. The runtime page temporarily disables automatic camera following solely to hold the exact review camera. The half-scale whole-village overview is not a runtime viewport and is excluded from the play-size comparison.

For each scene, `visual/<scene>-preview.png` and `visual/<scene>-runtime.png` are available. Full-canvas pixel equality is intentionally not claimed: production adds real HP bars, lighting, coordinate-derived torches, saved obstacle/decor identities and interaction-aligned buildings/bridge/gate. Preview adds illustrative props/signs, shadows, hover offsets and different NPC/cat sizes. Existing runtime NPC/Marmalade/tiny-companion scale policy is retained; those differences remain visible for FG-01/GR-10 final visual review, rather than silently changing approved gameplay-size constants. Wall/source pixel fidelity has its own strict independent checks. These staged pairs do not prove fog secrecy; the separate actual-fog pixel tests do.

Examples: [crypt runtime](visual/crypt-runtime.png) / [preview](visual/crypt-preview.png), [gate runtime](visual/gate-runtime.png) / [preview](visual/gate-preview.png). No new final user visual acceptance is inferred.

## Performance

Final measurements and method are in [performance.json](performance.json). The table below is generated from the final paired run. Fresh contexts in the same Chrome process/machine, alternating baseline/candidate order over three trials; warm filesystem; no simultaneous game tests/other acceptance browser runs during timing. Seven matched seeded scenes, 20 warmups and 100 `draw()+renderMinimap()` samples each. Native rAF measurement uses an active bat at the same location. Static and changing-scale cache stress are separate.

Fresh-page launch includes file reading, parse/execute/layout and automation visibility waiting; it is not cold-machine startup. CDP script time excludes some compilation/load work; constructor compilation is a lazy-function diagnostic, not isolated eager parse time. JS heap is forced-GC V8 usage; decoded typed-array and canvas RGBA backing sizes are reported separately. Neither cache estimate is whole-browser RSS/GPU memory or a guarantee for physical phones. No quality-reducing compression or new runtime dependency was introduced.

| Metric | Committed baseline | Final candidate |
| --- | --- | --- |
| Fresh-page launch median | 57.1 ms | 124.3 ms |
| Initial CDP script time | 30.1 ms | 32.4 ms |
| Constructor compilation diagnostic | 1.9 ms | 54.0 ms |
| Runtime source total | 507,406 bytes | 11,840,998 bytes |
| Peak sampled GC JS heap | 3.84 MiB | 18.90 MiB |
| Canvas RGBA cache after seven scenes | 5.63 MiB | 0.96 MiB |
| Decoded typed-array cache after seven scenes | 0.00 MiB | 0.63 MiB |
| Active native rAF paint rate | 21.4 fps | 22.4 fps |
| 200 new scales / second 200 scales | 4 / 0 new canvases | 4 / 0 new canvases |

| Scene | Baseline p50 / p95 | Candidate p50 / p95 |
| --- | --- | --- |
| town | 0.2 / 0.4 ms | 0.2 / 0.3 ms |
| crypt | 0.4 / 0.5 ms | 0.4 / 0.5 ms |
| cavern | 0.4 / 0.5 ms | 0.4 / 0.5 ms |
| kitchen | 0.4 / 0.5 ms | 0.4 / 0.5 ms |
| tavern | 0.4 / 0.5 ms | 0.4 / 0.5 ms |
| throne | 0.4 / 0.6 ms | 0.5 / 0.6 ms |
| dragon | 0.4 / 0.5 ms | 0.4 / 0.5 ms |

Warm draw+minimap remains comfortably below the 33.3ms 30fps frame budget. Both variants paint around 21–22fps in this headless rAF sample (the existing cap is an upper limit, not a guarantee of exactly 30). Cache counts plateau for 500 static draws and 400 changing-scale draws. The source/heap/startup increases are real costs of the lossless baked data; this is **not** a claim of unchanged startup or memory. No sustained draw-time regression requiring a new asset format was observed on this desktop. Absolute mobile hardware/startup and whole-browser memory remain outside this measurement.


## Verification and handoff

- **181/181 game tests pass**, zero failures/skips, ~111.4s with default heap.
- **27/27 preview tests pass**, zero failures/skips; **11 focused graphics tests pass**.
- Runtime and three new verification-script syntax checks, deterministic bake `--check`, external `SMOKE_OK`, whitespace checks and 823 protected-file hashes pass.
- Final suites and the one outstanding native visibility check are summarized in [checks.json](checks.json). Full state/source hashes are preserved; no failed check is counted as passed.

The required generated payload is unchanged and remains untracked pending GR-10's explicit delivery decision. All source PNGs, index/styles and unrelated gameplay drafts retain their task-start hashes. Only the two bounded runtime fixes, their regressions, dev-only verification scripts and evidence/status docs changed in GR-09.

Reproduce extended acceptance with `GR09_HEADED=1 OX72_PLAYWRIGHT=/absolute/path/to/playwright node docs/previews/2026-11-25-0x72/check-gr09-browser.cjs`. Existing GR-05/06/07/08 browser scripts can be rerun with a temporary output directory. Fair pairs use `check-gr09-visual.cjs`. Performance: `node check-gr09-performance.cjs <committed-export-dir> <candidate-snapshot-dir> <output-dir>` with external Playwright. This machine uses `/opt/homebrew/bin/node` and `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`.

Next: finish the native visibility observation to close GR-09; then GR-10 README/bestiary screenshots, credits/provenance, final visual decisions and generated-output delivery guidance. No staging/commit/release/tag/publish without request.
