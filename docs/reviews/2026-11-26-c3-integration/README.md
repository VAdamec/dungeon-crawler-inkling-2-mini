# C3 — companion integration audit and acceptance

2026-11-26. **C3 completed within the companion scope**, with the existing native GR-09 visibility exception retained. C1–C3 companion selection is complete; market M1–M3 is separate. No staging, commit, version change or release.

## Fixes found by the audit

**Incomplete simulation guards.** Direct companion/hazard/healing/mana helper calls could advance while launched-paused, hidden, in the console, in health/retreat dialogs or boss cinematics; trade did not stop the motion loop. Added the flat, read-only `simulationBlocked()` predicate and applied it consistently to timed simulation helpers and motion. It covers launch, gameOver, Help, console, health/retreat pause, trade, companion picker, hidden, ending and boss intro/defeat. Each helper retains its town/god-mode rules. Retreat also rejects conflicting overlays/hidden/cinematics before its town feedback, so it cannot log or stack behind the picker. [Two before-fix regressions](guards-before-fix.txt).

**A companion kill could start a boss defeat halfway through an enemy tick, then let a surviving monster attack.** Added an immediate post-companion simulation check before remaining AI, bubble TTL and recovery. The regression uses a surviving ranged guard with lethal attack: hero HP, the guard's attack deadline and combat RNG stay unchanged after the companion starts the defeat scene. It failed before this boundary fix ([output](mid-tick-before-fix.txt)). Rewards/adoption still commit once before the cinematic; no combat rebalance or cinematic timing change.

[Runtime delta](game-delta.patch) is against the actual starting C2 worktree. No new timers, art, entity visibility rules, progression, rewards, spawn generation, companion damage/cadence or market transaction behavior. This work fixes pause boundaries; it does not repair the known live-mutation shop cart/Cancel defects.

## Audit matrix

| Area / source interfaces | Verified contract | Evidence |
| --- | --- | --- |
| `companionTick`, `hazardTick`, `applyPlayerHazards`, `regenMana`, `recoveryTick`, `advanceActiveTime`, `motionPlayable`/`advanceMotion`, `enemyTick` | Direct and parent tick paths respect blocked states; town stops dungeon clocks; boss defeat interrupts the current tick | New C3 guard/kill-boundary tests and existing hazard/mana/health/motion/cinematic tests |
| `companionTalk`, `drawCompanion`, boss reward/adoption | Timed attacks/speech expiry freeze. Scripted retreat/boss remarks remain attributed and once-only; bubbles stay suppressed during boss flourishes | All-role combat, companion kill/rewards, retirement tests, existing GR-08 flourish/speech assertions |
| `activateCompanion`, registry, town starter actors | Cat bat preference and 2/1 damage; Pip nearest/lowest-ID tie; bosses keep established first-target/1 damage; three active seconds; no RNG/array order drift | All eleven companion combat rows; C1/C2 regressions |
| `enterFloor`/stairs, scroll/portal return, `confirmRetreat`/town/gate | Same active object/roster/deadline across travel; adjacent walkable placement; no duplicate town starters; retreat heals HP only and preserves active-time cooldown | Eleven-role travel matrix; real J/Q/Space/T/N/Y browser interactions |
| `FLOOR_FIELDS`, `saveFloor`, `saveTown`, recreation | Run companion/selection/unlocks/picker/entry state never floor/town-saved; boss/loot/progression persistence unaffected | All-role save-boundary checks, existing round-trip/boss/key/loot tests, nine seeded state comparisons |
| `fogLevel`, exploration, world/entity draw, minimap | Existing terrain light/exploration radius and soft boundary retained; unknown entities and speech remain hidden; lit hidden spikes remain invisible; minimap gains no secret markers | Eleven-role unit matrix and full-canvas/minimap pixel equality in Chrome at both sizes |
| Picker open/choose/close + Help/console/trade | Eligibility/range/session checks, no stacking, focus/inert restoration, Cancel/Keep preserve readiness; audio/restart usable | Existing C2 real interaction/screenshot evidence plus C3 hidden/lifecycle regressions |
| Visibility and resume | Picker persists during hidden fixture, cannot choose while hidden; time/motion do not catch up; selection valid after visible reset | Real visibilitychange handler + explicit document.hidden fixture in unit/browser; native transition remains unverified |
| Death/ending/new run/forced travel/loadLevel | Discard before context switch; old row/close callbacks cannot mutate a fresh run/session or resurrect companions | C2 teardown + C3 ending/new-run tests and browser old-run callback check |
| Health/retreat dialogs + Help | Help preserves the underlying pause; cancelling retreat restores it; confirmation carries companion and MP/readiness/cooldown correctly | Real browser health → Help → T/N → T/Y interaction plus health/retreat unit suite |

The common simulation predicate is not applied to trusted forced travel/loadLevel or health-dialog actions that intentionally work while paused. Their own eligibility and session teardown remain authoritative. Scripted remarks and the separate identity-bound cinematic clocks retain their existing contracts.

## Regressions and checks

Nine new groups cover helper isolation across twelve blocked states, retreat/picker exclusion, eleven-role travel, eleven-role combat/cadence, eleven-role fog/minimap boundaries, hidden picker resume, ending/new-run stale callbacks, companion-delivered once-only boss rewards, and the current-tick cinematic stop. No existing tests were skipped or assertions weakened. [Test delta](tests-delta.patch).

| Check | Result |
| --- | --- |
| Full game suite | **224/224 pass**, 0 fail, ~133.5s ([output](full-tests.txt)) |
| Expanded companion/travel/health/mana/hazard focus | **75/75 pass** ([output](focused-tests.txt)) |
| Prepared-source tests | **27/27 pass** ([output](preview-tests.txt)) |
| Three runtime + game-test syntax | Pass |
| Non-writing bake | Pass ([output](bake.txt)); generated payload unchanged |
| External smoke | `SMOKE_OK` ([output](smoke.txt)) |
| Nine seeded active-play before/after scenarios | Exact world/progression/reward/next-RNG match ([record](seeded-state-check.json)); intended pause/boundary differences tested separately |
| Desktop 1440×1000 and touch-emulated mobile 390×844 file:// | All eleven full-canvas/minimap secrecy rows pass; real picker/travel/retreat/Help/ending/restart interactions pass with no page/console errors or remote requests ([report](browser.json)) |

Browser fixtures stop enemy intervals, stage positions/unlocks/kills/maps and then use normal keyboard/touch UI for the specified interactions. The lethal surviving-guard scenario is staged. Pixel comparisons use a fixed motion clock and staged companion offset to isolate terrain light and unknown objects. No relaxed file-origin flags/server/network assets. Mobile is emulated touch/viewport, not physical hardware. The runner uses T/N/Y for the advertised retreat shortcuts; Enter/Space retain native focused-button behavior.

Screenshots after the explicit hidden/visible fixture, before dismissing the retained picker: [desktop](desktop-retained-picker.png), [mobile](mobile-retained-picker.png). C2's [post/picker/top/scrolled screenshots](../2026-11-26-c2-picker/README.md#screenshots-inspected) remain current; no UI redesign here. [Source/protected-file hashes](file-checks.json) record the scope.

## Remaining work

**Next bounded phase: M1 isolated trading draft/cart and pure transitions when requested.** Existing shop Cancel can still leave ring HP or learned spells changed; do not treat shared pause guards as transaction safety. M2/M3 follow its phase plan.

**GR-09 native background-tab/minimize observation remains unverified.** C3's explicit document.hidden + real visibilitychange-handler fixtures are controlled checks, not a native browser transition. The previous native-observation exception is not closed by this integration audit. Full human campaign, subjective audio/visual approval and hardware/performance-baseline claims also remain separate. Release stays 2.0.0.

## Reproduce

```sh
node --test tests/game.test.cjs
node --test --test-name-pattern='C1 |C2 |C3 |companion|Marmalade|cat waits|cat exactly|Pip|T1 |T2 |teleportTown|addScrolls|Town Scroll|retreat|mana|healing|hazard' tests/game.test.cjs
node --check js/game.js
node --check js/sprites.js
node --check js/art-runtime.js
node --check tests/game.test.cjs
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
OX72_PLAYWRIGHT=/opt/homebrew/lib/node_modules/playwright node docs/reviews/2026-11-26-c3-integration/check-browser.cjs
```

On this machine use `/opt/homebrew/bin/node` and `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`. Existing external Playwright/Chrome ran through tool approval outside the sandbox; no runtime dependency installed. Baseline at `/tmp/dungeon-c3-before`; external smoke location is documented in `agents.md`.
