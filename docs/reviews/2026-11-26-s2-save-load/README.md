# S2 — detached hydration and atomic loading

2026-11-26. Explicitly requested **S2 only**, with regressions/developer docs/tasks/handover. [S0 state/alias contract](../2026-11-26-s0-save-load/schema-matrix.md) · [S1 DTO](../2026-11-26-s1-save-data/README.md) · [phase plan](../../plans/2026-11-26-save-load-plan.md).

## Implementation

`hydrateSaveData(dto)` revalidates with S1 and allocates a detached complete runtime candidate. All visited arrays become Sets; active floor fields alias its canonical floor, town map/visited/props/store and landmark store/board link once, inn/gate link town landmarks, and bossId links the actual current encounter row. Current monster HP/coordinates/deadlines/order/dead guards stay separate from respawn templates. Companions derive static attributes from COMPANIONS at exact saved coordinates. Hero/gear and all durable clocks/flags are copied, never reapplied. Pure candidates have null art/audio and lastTick0, fresh motion/UI/console/god/cinematic state; no global state, DOM, RNG or gameplay action calls.

`beginSaveLoad()` returns an identity-bound transient session (or null when blocked). `saveLoadSessionCurrent(session)` checks owner state/map/area/depth/launch/death context and current eligibility. `commitSaveLoad(session,dto)` revalidates/hydrates before any mutation, rechecks after hydration and presentation preparation, consumes the token, swaps one complete candidate, reuses receiving audio/preferences/context and art cache, paints HUD/minimap/journal, focuses canvas and sets lastTick after painting. It returns true on success, false on stale/blocked confirmation; corrupt data or preparation/presentation errors throw. A caller-mutable candidate cannot bypass validation: commit accepts the DTO and makes its own candidate.

S1 data format remains version1; no transport/schema migration. Snapshot now rejects an in-flight load. `state.loadSession` is the new **83rd initialized transient state field**, never serialized or floor/town-saved. S0's historical82-field classification stays dated; its existing coverage test explicitly accounts for this one new field. Semantic fixtures exclude session/DOM/resources/visual/wall-clock fields while separately checking token identity, focus/resources and lastTick reset.

## Eligibility, freeze and lifecycle

Allowed: launch, stable living play (including receiver god mode), ordinary death and own Help. Blocked: hidden, health/retreat, console, trade/picker state or visible overlays, boss intro/defeat, ending/won. Every successful restore resumes a living started run with god mode off and branding hidden.

Pending sessions freeze simulation/active-time/hazards/mana/recovery/companion/town/motion paths and existing player/launch/merchant/debug-grant inputs. Audio remains usable; R restarts, Esc cancels; Help retains normal Tab/native button behavior. No new visual dialog is added. New session supersedes old identity; Cancel, newGame/R, forced floor/town/debug travel, death/ending and closing Help invalidate. All discards reset wall-clock/frame timestamps, including forced travel without visual resume; waiting time never earns active-time credit. Changed or hidden context rejects a pending confirmation without replacing the run.

Pure hydration/validation/allocation or presentation-snapshot errors preserve old run/focus and a retryable session. Commit-paint failure rolls back to the **same previous state object**, restores saved existing DOM properties and canvas pixels (including resetting any incomplete canvas transform stack), preserves Help/inert/focus, consumes the failed token and resumes old visual scheduling. Recovery does not re-render the old state through health/action code. A fresh session is needed to retry after paint failure. Audio/art resource identities remain local. Old motion/cinematic callbacks are canceled when scheduled and identity-rejected if already delivered. Reentrant restart during preparation cannot be overwritten.

One subtle fix is tested explicitly: normal render runs health checks that can change saved warning latches even at healthy HP. Commit uses `render(true)` for presentation-only first paint, and pending-load render/checkHealth avoid progression checks. Normal gameplay retains its existing health behavior after resume.

## Verification

[Focused tests](focused-tests.txt): **15/15 pass**. [Pre-S2 runtime](before-implementation.txt): all15 groups fail without the new APIs. [Final full suite](full-tests.txt): **256/256 pass**, zero failures/skips (241 existing +15 new regression groups). [Preview tests](preview-tests.txt)27/27, [syntax](syntax.txt), [non-writing bake](bake.txt) and external [SMOKE_OK](smoke.txt) pass.

| Regression family | Covered behavior |
| --- | --- |
| Pure hydration/detachment | Town/dungeon complete state, Sets/aliases, input/old-run preservation, action/RNG throw sentinels; null resources/fresh transients. |
| Exact live commit | HP37/80 ring and MP7, gold/items/spells/stock/loot/key/reward/cache/hazard/warning/recovery/retreat deadlines, journal/HUD; receiving audio/art identity, no ring reapply/heal/reward/reveal/RNG. |
| Context/session | Launch/Help/god/death; blocked/modal/hidden/context-binding changes; frozen active and town ticks/actions/launch choices; cancel/forced discard wall clocks. |
| Stale results | Cancel, restart, forced town/floor/loadLevel, death, ending, Help close, newer session, consumed confirmation; old cancel cannot close a newer session. |
| Failure rollback | Corrupt input, hydration allocation failure, canvas/presentation preparation failure, injected paint failure, Help/HUD/focus restoration and retry rules; reentrant reset. |
| Encounter vs revisit | Current damaged/dead rows, guards/negative HP/boss links/summon readiness; later ordinary respawns and guard dropping remain existing behavior, defeated final dragon never respawns or reawards, princess stays pending. |
| Companion/XP/portal | All11 companions at exact nonadjacent positions, roles/readiness; levels83/99/100; portal return once, scroll count, repeated ring/reward preservation. |
| Time/content stress | Rock warning resumes at saved hazard time, no early/repeated impact; fully explored real-generation100-floor DTO loads/recaptures exactly, no RNG. |

[Browser runner](check-browser.cjs) · [results](browser.json). Actual file:// Chrome1440×1000 and touch-emulated390×844: real launch click/tap and Help, live500ms enemy interval and keyboard freeze, invalid DTO rejection, injected failure **after actual candidate rendering**, exact old map/minimap pixel restoration, HUD/Help/inert/focus rollback, success with exact DTO/HP37/80/gold293/audio/art identity, stale/repeated confirmation rejection, launch/death restore, native Esc cancellation and R restart invalidation. No page/console errors or remote requests. DOM/buttons/canvases and game handlers are real; source/receiver positions, DTO calls, lifecycle transitions and fault injection are staged, with simulation intervals stopped outside the explicit freeze probe. No native file input, download/import, native mobile keyboard or large-file browser performance acceptance.

[Runtime delta](game-delta.patch) · [test delta](tests-delta.patch) · [protected-file hashes](file-checks.json). Existing dirty worktree is preserved. Player README/Help, HTML/CSS, graphics, art payload and sprite code unchanged; no combat/economy/market/release/version/staging/commit changes. Test helper exclusions/classification were adapted only for the new transient session; existing gameplay assertions remain.

## S3 handoff and remaining limits

S2 is a loading **core**, not player-accessible portable-file save/load. S3 must implement file size-before-read, Blob/download, input/preview/explicit confirmation/cancel/focus/UI sessions, native cancellation/same-file behavior and error feedback. Bind read/preview/confirmation/cancel to the exact S2 token, check current identity before using late results, and discard old DTO/session refs on close. S3 must manage its new presentation controls during commit/rollback; do not assume this existing-node snapshot automatically covers future Load UI.

S4 still owes actual download→reload/import, another profile/path, real files and maximal valid100-floor/browser/mobile responsiveness. S1's measured ~8MiB DTO validation takes seconds in Node; no new browser responsiveness claim is made. Native RNG future sequence is not restored. Market M1–M3 independent. **GR-09 native background-tab/minimize remains unverified.** No next phase or release starts automatically.
