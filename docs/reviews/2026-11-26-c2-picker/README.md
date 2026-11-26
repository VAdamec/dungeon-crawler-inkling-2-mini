# C2 — companion picker and town post

2026-11-26. **C2 complete.** Launch selection, both starter recruitment paths, the post and accessible picker now use the C1 model. C3's full integration audit and market M1–M3 remain open. No git staging/commit, version change or release; 2.0.0 branding retained.

## Result

- Launch arrows change/focus starter cards without starting. Enter/Space on a card explicitly starts with that companion. Mouse/touch card selection and the Start button also work; Tab does not start a run.
- Space beside either selected starter recruits it. The unselected animal cannot override the choice. First descent preserves an already-recruited actor and its clocks; C1 manages one follower and hidden/restored town animals.
- Replaced unresolved `noticeBoard` artwork with a small code-drawn wood post. Its deterministic tile selection validates reachable walkable ground, avoids occupied/decorated/patrol tiles and other landmark interaction zones, and consumes no RNG. Current generated position is near `(34,26)`. Saved collision/layout and actor routes remain unchanged.
- The post shows a nearby Space hint. A **Companions** HUD button appears only nearby, giving touch and keyboard users a native entry control. No permanent footer or new map movement system.
- Fixed backdrop and bounded dialog; only the roster scrolls. Eleven named cards show active/Keep, unlocked/Choose or disabled Locked with defeat hints. Controls have a 44px minimum height, visible keyboard focus and accessible names. Header Cancel and footer sound controls remain visible at desktop/mobile sizes.
- Opening creates an identity-bound `state.companionPicker` with map/town/post and prior focus/inert state. Selection validates the captured session, eligibility, location and unlock before invalidating/activating once. Cancel/Esc, focus movement and Keep do not change companion/readiness/journal. Old callbacks cannot select or close a newer session.
- Tab/Shift-Tab wrap within enabled dialog controls; Up/Down/Home/End move choice focus without applying. Native Enter/Space activate the focused button once. World keys are intercepted; Help/console/trade cannot stack. M and the dialog sound button remain usable; R discards/restarts with launch hidden.
- Town and motion clocks stop while the picker is open; relevant direct action entries also reject it. Open/close reset existing timestamps, restore inert state/focus, and request animation only on return. Travel, valid loadLevel, reset, death and ending teardown through shared close/reset paths; no implicit choice commit.

Core functions remain flat and state transient. No picker/DOM state is floor/town-saved. No source PNGs, prepared sprites, generated payload, combat/reward/economy changes or new runtime dependencies. One C1 retirement test now opens a real picker session before deliberately reselecting Marmalade; its retirement assertions remain unchanged. The old trade prototype is preserved except for refusing entry during this picker.

Player Help has one concise updated starter/post tip; developer internals stay in [DOCUMENTATION.md](../../../DOCUMENTATION.md#companion-picker). [Game](game-delta.patch), [markup](markup-delta.patch), [styles](styles-delta.patch), [tests](tests-delta.patch) and [developer docs](developer-docs-delta.patch) deltas are relative to this task's starting worktree, preserving earlier user/prototype changes.

## Regression and acceptance evidence

Eight new behavioral groups cover launch keyboard/pointer choice, deterministic post placement/painting, both Space recruitment paths, focus/cancel/same choice, once-only/locked/stale/range selection, fourteen invalid contexts, simulation/action/modal/audio/restart behavior, and forced transition/death teardown.

The Node fixture has an **optional** small DOM model for this UI: native nodes/attributes/children, focus/ancestor/contains checks, button queries and canvas contexts. Existing non-DOM/economy fixtures retain their prior mode; no compatibility trade bypass was introduced. Initial checks corrected missing fixture methods/native-button simulation and caught an actual missing direct `useTownScroll` guard, which is fixed. Actual browser acceptance verifies native button events and rendering beyond the fixture.

| Check | Result |
| --- | --- |
| Full game suite | **215/215 pass**, 0 fail, ~127.4s ([output](full-tests.txt)) |
| Expanded companion/travel focus | **56/56 pass** ([output](focused-tests.txt)) |
| Preview/prepared sources | **27/27 pass** ([output](preview-tests.txt)) |
| Runtime and game-test syntax | Pass |
| Non-writing bake | Pass, payload unchanged ([output](bake.txt)) |
| External smoke | `SMOKE_OK` ([output](smoke.txt)) |
| Nine seeded before/after world/progression/reward/next-RNG scenarios | Exact match ([record](seeded-state-check.json)) |
| Chrome ordinary file:// desktop 1440×1000 | Pass: real walking, Space recruitment/post, native Enter/Space selection, focus/Keep/Cancel/audio/boss choice/restart; independent wheel scrolling |
| Chrome touch-emulated mobile 390×844 | Pass: same walking/recruitment plus contextual-button taps and choice taps, native touch swipes through the long roster, fixed Cancel/audio controls and no horizontal overflow |
| Live interval behind picker | Town actors/tick, motion, active/hazard time and hero snapshot remain frozen over 500ms with a real enemy interval running |

[Browser checks and measured dialog bounds](browser.json) report zero page/console errors or remote requests. The runner stops initial intervals to make walking reproducible, restores a live interval for freeze checks, and stages one Mimic unlock to test an available boss row; it does not bypass picker selection or recruitment. Screenshot map stills clear transient companion/NPC speech for legibility, retaining the actual nearby post hint. Mobile is viewport/touch emulation, not physical-device proof. The final Help-tip text-only update is additionally covered by [Help/launch focused checks](help-tests.txt).

## Screenshots inspected

| View | Desktop | Mobile |
| --- | --- | --- |
| Post on actual map | [Map](desktop-post.png) | [Map](mobile-post.png) |
| Picker at top | [Dialog](desktop-picker.png) | [Dialog](mobile-picker.png) |
| Roster scrolled; fixed controls | [Dialog](desktop-picker-scrolled.png) | [Dialog](mobile-picker-scrolled.png) |

## Remaining scope

**C3 next when requested:** finish the broader companion/fog/light/combat/retirement/campaign travel and modal lifecycle audit and acceptance matrix. C2 has targeted coverage for its new UI/session transitions, not a claim that every historical companion scenario has received native/manual acceptance. Hidden-tab/new-run edge coverage must remain explicit. **GR-09 native background-tab/minimize observation remains unverified.** Passing unit visibility fixtures or this modal-freeze check does not close it.

M1–M3 isolated trading cart/Confirm/Cancel and the P0 ring/spell cancellation leaks remain open. Do not infer market safety from the companion modal. No new art approval, full human campaign, subjective audio or performance-baseline acceptance is claimed.

## Reproduce

```sh
node --test tests/game.test.cjs
node --test --test-name-pattern='C1 |C2 |companion|Marmalade|cat waits|cat exactly|Pip|T1 |T2 |teleportTown|addScrolls|Town Scroll|retreat' tests/game.test.cjs
node --test --test-name-pattern='help|HUD|launch' tests/game.test.cjs
node --check js/game.js
node --check js/sprites.js
node --check js/art-runtime.js
node --check tests/game.test.cjs
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
OX72_PLAYWRIGHT=/opt/homebrew/lib/node_modules/playwright node docs/reviews/2026-11-26-c2-picker/check-browser.cjs
```

This machine uses `/opt/homebrew/bin/node` with `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`. Browser automation uses an existing external Playwright/Chrome installation and the tool's outside-sandbox approval; no package added to the game. The documented external smoke remains outside the repo. Baseline copies at `/tmp/dungeon-c2-before`; [file hashes](file-checks.json) distinguish this task's changes from pre-existing edits.
