# T1 — debug portal hardening

2026-11-26. **T1 implemented and verified; the full worktree suite is not green.** Six existing companion/cinematic test failures reproduce on the pre-T1 snapshot. T2/C1–C3/M1–M3 remain open. Release stays 2.0.0; no staging, commit or publication.

## Change and boundaries

`teleportTown(...args)` rejects every nonzero argument count before touching game state. The console dispatcher forwards the full argument list instead of silently dropping extras; case-insensitive command names and surrounding whitespace still work.

The helper now rejects hidden pages, zero-HP heroes (even before gameOver is set), trade/companion sessions and visible player-menu overlays, in addition to its existing launch/gameOver/help/health/retreat/ending/boss-cinematic exclusions. DOM checks cover the current roster prototype, which has no identity-bound session yet; `state.companionPicker` also covers the planned replacement. **The developer console remains allowed.** Invalid commands produce console feedback only, without world/journal/audio effects.

Kept the existing free portal save/enterTown/return flow. Valid travel consumes no scroll, restores no HP/MP, grants no reward, does not reset retreat cooldown and does not overwrite an existing portal. J and Space use the existing saved-floor return and safe-tile fallback. The existing cheat-return wording and one magic cue remain.

No change to `addScrolls` (T2), companion registry/adoption, trading semantics, normal scroll/retreat mechanics, graphics, HTML/CSS, player README/Help, version or generated art. [Runtime delta against the actual starting worktree](runtime-delta.patch) isolates this task from pre-existing prototype changes in git diff. [Protected-file hashes](file-checks.json) confirm unrelated files remain unchanged.

## Regression coverage

Added six T1 behavioral tests ([test delta](tests-delta.patch)):

1. Extra arguments through console and direct helper are atomic rejections; mixed-case zero-argument input works.
2. Fourteen blocked contexts preserve semantic state and emit no sound: launch, gameOver, zero HP, hidden, Help, health/retreat, ending, intro/defeat, trade/roster sessions and both visible overlays.
3. Valid departure saves exact current floor contents/exploration and keeps HP/MP, progression, inventory, gear, spells/readiness, gold, scrolls, companion identity/selection/unlocks, active time and cooldown unchanged. No departure RNG or repeated magic/story cue.
4. Repeated town commands and `loadLevel` followed by a second teleport cannot replace the original return point.
5. Real J/Space key handlers return once to the exact saved floor/tile with collected contents preserved and map identity unchanged.
6. A newly blocked return tile uses the existing safe fallback and clears the portal once.

The Node element fixture now initializes the two prototype player-menu overlays as hidden, matching `index.html`. Without this correction the stub reports those HTML-hidden menus visible and falsely blocks every debug command under the new guards. Existing assertions were not weakened or skipped. This is not a general DOM/focus harness rewrite.

## Verification actually run

| Check | Result |
| --- | --- |
| Initial six new tests before runtime fix | 4 pass / 2 fail: invalid arity reproduced; the other failure was the new blocked-context fixture's uninitialized console input, corrected before the passing run |
| Focused portal/scroll/retreat tests | **20/20 pass** ([output](focused-tests.txt)) |
| Full `tests/game.test.cjs` | **189/195 pass; 6 fail**, ~110.4s ([output](full-tests.txt)) |
| Same six failing cases against untouched pre-T1 source/tests | **All six reproduce** ([baseline output](baseline-failures.txt)); no new full-suite failure names |
| Three runtime `node --check` commands | Pass |
| Prepared-source preview tests | **27/27 pass** ([output](preview-tests.txt)) |
| Non-writing runtime bake check | Pass ([output](bake.txt)); generated payload unchanged |
| Existing external smoke | `SMOKE_OK` ([output](smoke.txt)); includes all three scripts |
| Normal Chrome `file://`, 1440px and 390px viewports | Pass ([browser evidence](browser.json)); real launch/console/J/Space inputs, valid travel, invalid arity, explicit hidden fixture, resource preservation, return-point rejection after loadLevel and normal scroll consumption; no page/console errors or remote requests |

The first sandboxed Chrome launch aborted; the same local acceptance runner succeeded outside the sandbox through the tool approval mechanism. No runtime dependency was installed. Browser intervals are stopped after launch for deterministic acceptance. The hidden check explicitly overrides `document.hidden`; **it is not native background-tab/minimize verification**. No new graphics/performance or subjective audio acceptance is claimed. GR-09 native observation remains **unverified**.

## Existing failures carried forward

- `defeated bosses become tiny companions that chip in and comment ironically`
- `the first boss kill retires Marmalade once before the boss companion joins`
- `restart cancels the ending frame and rejects stale callbacks from an old ending`
- `GR-08 throne guards collapse using skeleton art and cannot attack or award extra rewards afterward`
- `GR-08 every boss cinematic freezes and rejects stale callbacks after skip, travel and restart`
- `GR-08 ending milestones stay once-only with muted skip and no catch-up or stale resurrection`

The first two show incorrect themed companion identity in the existing registry/adoption path; the others throw during prepared companion-art decoding after boss defeat/restart. Those paths were already broken in the saved prototype snapshot. Preserve the evidence and resolve them in companion integration; do not label the overall suite accepted or hide them by disabling tests. Market Cancel/ring/spell defects from P0 also remain outside T1.

## Reproduce

Use a working external Node; on this machine prepend `env DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib` and use `/opt/homebrew/bin/node`.

```sh
node --test --test-name-pattern='T1 |teleportTown|Town Scroll|retreat' tests/game.test.cjs
node --test tests/game.test.cjs
node --check js/art-runtime.js
node --check js/sprites.js
node --check js/game.js
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
OX72_PLAYWRIGHT=/opt/homebrew/lib/node_modules/playwright node docs/reviews/2026-11-26-t1-debug-portal/check-browser.cjs
```

The pre-T1 snapshot and original external smoke remain temporary local artifacts at `/tmp/dungeon-t1-before` and the smoke path recorded in `agents.md`. Evidence files are retained here; temporary copies are not runtime dependencies.

**Next phase:** T2 strict safe decimal/arity/overflow/context handling for `addScrolls`, console discovery and developer documentation. Do not start C1 or market work without the corresponding request. Keep the six baseline failures and native GR-09 exception visible throughout later handoffs.
