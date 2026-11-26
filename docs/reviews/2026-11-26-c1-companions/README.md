# C1 — companion registry and run model

2026-11-26. **C1 complete; all six previous companion/cinematic failures fixed.** C2 picker/post UI and C3 full integration remain open. No staging, commit, version change or release. Native GR-09 visibility remains unverified.

## Root causes and corrections

1. **String companion IDs produced NaN animation frames.** `actorAnimationPose()` used `(actor.id || 0) % 4`. Registry IDs such as `dragon`, `hydra` and `skeletonKing` are strings, so authored-frame indexing yielded an empty frame and art decoding failed on an undefined base64 payload. Use a numeric phase only for finite numeric IDs; string IDs use phase zero. Normal numeric monster phases, direction selection, frame rates, union anchors and authored artwork stay unchanged. No payload regeneration or missing-art fallback was added. [Animation delta](animation-delta.patch).
2. **Themed identity fell back to Mimic.** `bossKind` recognized themed flags but not legacy Cook/Bartender objects carrying only their names. Added those two explicit name cases; dedicated registry roles are now `cook`/`bartender` with explicit 0.55 boss scale. All nine boss species keep stable IDs and immediate adoption. Logical monster sprite/stat fields are not rewritten. One old test now expects the dedicated Cook companion role instead of `orc`; its name, combat, placement, speech, reset and progression assertions remain. The other five failing tests pass without changed assertions.
3. **Restart carried a locked previous selection into a fresh roster.** New runs explicitly initialize Marmalade, the two starter unlocks, null picker and a false `companionEntryDone`; launch card pressed state also resets without reopening launch branding during R. Death and ending clear the companion run model and roster overlay, preserving the existing campaign completion/restart timing.
4. **First entry reused the cat's recruitment state.** A separate run latch now owns first descent. Both starters support direct manual recruitment or automatic first-entry join without replacing an already-recruited actor. The legacy `entranceCat.entered` stays consistent; Pip does not depend on the cat's recruited/retired flags. Factory lookup is strict, locked IDs cannot activate, and launch-choice setters reject non-starters.
5. **Actor replacement retained old motion and town duplicates.** Flat shared activation clears follower interpolation/direction/facing/speech, initializes the existing three-second attack deadline, places the new follower and synchronizes starter hidden flags. Original animal coordinates, paths and clocks are preserved. Retirement remains a once-only story latch; deliberately reselecting Marmalade is allowed.
6. **Pip's behavior used generic boss paths.** The existing dedicated sidekick remarks are now selected, and Pip targets the nearest visible eligible monster with the existing lowest-ID tie break. Damage stays exactly one and cadence three active seconds; cat bat preference/bonus and established boss targeting remain.

[Game delta](game-delta.patch) and [test delta](tests-delta.patch) are relative to the actual starting worktree, preserving earlier prototypes and T1/T2. All run state remains outside `FLOOR_FIELDS`, town saves and monster templates. No new UI, graphics, market, inventory, timer or reward system.

## Regressions and verification

Eight new C1 groups cover all eleven registry entries/authored directions and string/numeric ID phases; reset/death/ending; both manual/automatic starters; all nine boss unlocks/once-only rewards/defeated-floor revisits; motion and starter-actor synchronization; invalid/locked IDs; retirement/reselection; and Pip targeting/remarks/cadence/RNG. Existing cat light, bat damage, following and travel tests remain active.

| Check | Result |
| --- | --- |
| Pre-C1 six-failure reproduction | All six fail as before ([baseline](baseline-six-failures.txt)) |
| Same six plus eight new groups | **14/14 pass** ([output](fixed-six-and-new-tests.txt)) |
| Expanded companion/travel/T1/T2 focused run | **48/48 pass** ([output](focused-tests.txt)) |
| Full game suite | **207/207 pass, 0 fail**, ~124.4s ([output](full-tests.txt)) |
| Runtime and test syntax | Pass |
| Prepared-source tests | **27/27 pass** ([output](preview-tests.txt)) |
| Non-writing bake | Pass, payload unchanged ([output](bake.txt)) |
| External smoke | `SMOKE_OK` ([output](smoke.txt)) |
| Nine seeded before/after scenarios | Exact world/progression/reward/next-RNG match ([record](seeded-state-check.json)) |
| Chrome `file://` desktop/mobile widths | Pass, all nine boss adoptions with four directional companion frame checks, once-only reward checks, ending phases and restart default; no errors/remote requests ([evidence](browser.json)) |

The six repaired test names are `restart cancels the ending frame and rejects stale callbacks from an old ending`, `defeated bosses become tiny companions that chip in and comment ironically`, `the first boss kill retires Marmalade once before the boss companion joins`, plus GR-08 throne-guard collapse, every-boss cinematic freeze/stale callbacks, and ending milestone/skip/restart coverage. Exact names/stacks are retained in the baseline and full logs. This resolves the T1/T2 full-suite exception; their historical reports are not rewritten.

Browser evidence uses actual launch-card/start, console and R key handlers at 1440px/390px widths. It stops enemy intervals and stages model recruitment, boss kills/directions and ending time advances. rAF is available, exercising the string-ID failure path. **Manual Pip recruitment was invoked through the model helper, not the uncompleted nearby-Space UI.** The output labels those fixtures. This is emulated mobile layout, not mobile hardware or native background-tab acceptance. The ending still follows the existing reveal/heal/escape/sunset/hold sequence; existing identity, timing and once-only audio tests pass.

No source PNGs/manifests, generated art, HTML/CSS, player README/Help or gameplay economics were changed. Hashes/deltas are recorded in [file checks](file-checks.json). No new performance, human campaign, subjective audio or final visual-approval claim.

## Remaining scope / next phase

**C2 next when requested:** nearby Pip Space recruitment, launch arrow behavior, a real/validated companion-post marker (current `noticeBoard` role is unresolved), accessible fixed picker layout, range/session validation, locked/same-choice/cancel/focus handling. The shared model now supports it; the existing prototype UI is not accepted by C1. C3 still owns full modal freeze, stale callbacks, hidden/travel and desktop/mobile interaction acceptance. Core starter visibility/motion is corrected here; C2/C3 must connect and verify every UI path.

Market cart M1–M3 and P0's Cancel HP/spell leaks remain open. **GR-09 native background-tab/minimize remains unverified**, irrespective of passing explicit visibility fixtures and the now-green unit suite.

## Reproduce

```sh
node --test --test-name-pattern='C1 |companion|Marmalade|cat waits|cat exactly|Pip|T1 |T2 |teleportTown|addScrolls|Town Scroll|retreat' tests/game.test.cjs
node --test tests/game.test.cjs
node --check js/game.js
node --check js/sprites.js
node --check js/art-runtime.js
node --check tests/game.test.cjs
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
OX72_PLAYWRIGHT=/opt/homebrew/lib/node_modules/playwright node docs/reviews/2026-11-26-c1-companions/check-browser.cjs
```

This machine uses `/opt/homebrew/bin/node` with `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`; Playwright/Chrome are existing external development tools. Browser launch used the tool's outside-sandbox approval; no game dependency installed. Temporary baseline at `/tmp/dungeon-c1-before`; external smoke path remains in `agents.md`.
