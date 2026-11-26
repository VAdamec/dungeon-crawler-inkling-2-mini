# M3 — market integration and recovery acceptance

2026-11-26. Requested M3 complete within the Node/Chrome scope below. M1–M3 market queue complete. **Native GR-09 background-tab/minimize remains unverified.** No staging/commit/release/version, art regeneration, schema or balance change. Existing worktree/staging preserved.

## Findings and fixes

| Finding | Fix / proof |
| --- | --- |
| Keyboard/tick guards blocked ordinary UI, but direct movement, attacks, spells, damage, pickups, rescues, stairs, Inn and town-chatter helpers could mutate the source during a cart | Independent `state.trade` guards on user/attack entry helpers; portal-return action also rejects. Forced world/debug transition primitives intentionally remain forceable and discard. Full semantic snapshots/RNG sentinel cover direct calls. |
| Closing reset clocks before render, allowing slow painting to become up to a half-second of next-tick active gameplay | Shared `resumeAfterTrade` resets clocks after presentation/focus;120-second paused interval and2-second injected closing paint earn no time. |
| Failed opening render left modal ownership/inert state stuck; closing paint could strand focus | Failed open discards ownership/controls and recovers presentation/focus best-effort. Closing paint cannot prevent focus/clock cleanup or retry. |
| Application/save/paint helper could force travel/restart, after which stale Confirm work continued | Scoped `session.rollback` runs before forced teardown changes the world/run; post-helper identity checks stop old writes/notices. Injected equipment/save/paint hooks × new run/new floor cover both owner replacement and same-owner travel. |
| Startup backdrop handler used current session rather than its opening identity | Backdrop now captures the opening session, is cleared with controls, and old callbacks cannot cancel a newer cart. |
| Optional audio error after commit could throw through the trade UI | Trade sound failure is isolated after successful application; inventory/gold/logs commit once, focus recovers, duplicate Confirm is rejected. |

No gameplay/economy rebalance. Elixir guide text now reflects the existing gold refund, not the old claimed strength/dexterity increase. No new modal/state/storage framework or async trade architecture: measured large inventories remained bounded enough for this implementation.

## Acceptance matrix

| Area | Evidence / result |
| --- | --- |
| Source isolation / selected trading / existing M1–M2 behavior | Full M1/M2 groups remain green; pure staging, accepted operations, Undo/Reset, safe prices, ring clipping/god mode, known books, retained notices and scoped rollback retained |
| Simulation / helpers / clocks | Direct action/helper snapshot equality; enemy/town/hazard/recovery/mana/companion/active-time freeze; motion disabled, no RNG/time catch-up |
| Modal / focus / recovery | Health/retreat and Help restoration, shop/companion/console/load exclusion; open/close paint failure, save-failure Cancel/reopen retry, disabled-row fallback, session-captured backdrop, sound failure |
| Lifecycle / stale callbacks | Restart, loadLevel, town/floor, death and valid final ending→skip→restart discard; forced transitions within application hooks roll back before switching, no stale notices into new context |
| Portal / companion / persistence | Scroll/debug/retreat returns remain one-use, exact return metadata/cooldown/MP preserved; all11 companion identities/unlocks/retirement/attack readiness retained; god-mode trade→save/hydrate and ordinary revisit semantics pass |
| Browser / mobile | Native file:// keyboard/click/tap town/dungeon flow plus recovery at desktop/touch/narrow/landscape sizes, no HTTP/page/console errors |
| Performance |10k and65,536-potion before/after samples at1× desktop and4× CPU touch viewport; no unbounded/per-device/FPS claim |
| Native visibility | **GR-09 unverified**. Hidden-state browser test is injected; it does not close native background/minimize acceptance |

## Tests and deterministic comparisons

- **307/307 full game** [log](game-tests.txt); **87/87 focused** market/companion/save groups [log](focused-tests.txt); **27/27 prepared-source** [log](preview-tests.txt).
- Eleven new M3 groups. [Pre-M3 run](before-regressions.txt) reproduces5 failing groups, with6 passing acceptance extensions. Existing M1/M2/cart/save/cinematic coverage remains green. No tests or expected counts are hidden to close M3.
- **24 seeded comparisons**:3 seeds × town/gear/spells/scroll-return/retreat/god/cancelled shopping/confirmed shopping. Pre-M3 and current semantic state/effective stats/next8 RNG samples match [results](seeded-state.json), [runner](check-seeded.cjs). Backup source identified by [before hashes](before-hashes.json); temp path `/tmp/dungeon-m3-before` is a development input, not a game dependency.
- Allthree runtime scripts, tests and development runners pass syntax; deterministic non-writing [bake](bake.txt), external [SMOKE_OK](smoke.txt), protected-file/link/whitespace checks [manifest](file-checks.json).

## Actual browser checks

[Standard interaction runner](check-browser.cjs) / [results](browser.json): desktop1440×1000 and touch390×844 × town/dungeon, native row Enter selecting only, B/Add, selected sale/non-first purchase, Undo/Reset/Cancel/Confirm, trapped focus/audio/?/~,520ms live-tick freeze, repeat Confirm rejection, reopen/revisit stock/spell persistence. Mobile actions use tap; desktop uses click. Merchant/progression/location setups are staged, not a natural campaign.

[Recovery runner](check-recovery.cjs) / [results](recovery.json):1440×1000,390×844,320×568 and844×390. Covers all-unaffordable rows focusing Close, injected opening paint failure and retry, injected post-save failure with exact old currency/inventory then Cancel/reopen/Confirm, scroll-return metadata/selected Hydra companion/cooldown/MP preservation through Cancel/Confirm, one-use native J return, health-Help restoration and R cleanup. Footer remains on-screen with a positive-height scrollable body. No runtime HTTP requests or page/console errors. Visibility is controlled through an explicitly injected document property/event; there is no native GR-09 claim. [Inspected captures and setup](screenshots/README.md).

## Measured performance

[Before](performance-before.json) · [After](performance-after.json) · [runner](check-performance.cjs). One sample per profile/content size, same Chrome/host, intervals stopped to isolate work and20ms heartbeat active. Open/individual stage/Confirm function times; browser scheduling/heartbeat is measured separately. A sequence of8 retained buys/sales exercises validation/replay; small row counts are actual merchant scope.

| Potions | Profile | Before open / Confirm ms | After open / Confirm ms | After worst individual stage ms | Before / after max heartbeat gap ms |
| ---: | --- | ---: | ---: | ---: | ---: |
|10,000 |1× desktop |6.0 /8.6 |6.4 /9.0 |2.2 |21.8 /21.2 |
|65,536 |1× desktop |11.1 /33.4 |12.2 /32.3 |4.4 |50.4 /36.5 |
|10,000 |4× touch-emulated |19.5 /32.3 |23.3 /35.0 |11.8 |44.1 /50.0 |
|65,536 |4× touch-emulated |39.5 /124.0 |47.0 /131.5 |23.4 |129.0 /140.5 |

These paired samples establish scale, not a speed improvement/statistical guarantee. Operations remain synchronous; the largest constrained Confirm may pause input for roughly0.13s. Touch/CPU emulation is not physical mobile. The65,536 start case buys one more potion: that remains valid live run inventory, but S1 explicitly refuses an over-limit save without truncation. No new inventory cap was introduced. No peak-memory, infinite-history or all-browser compatibility claim.

## Implementation and handoff

`js/game.js` contains narrow market guards, post-paint recovery, session-bound backdrop and synchronous scoped rollback/identity checks. `tests/game.test.cjs` adds11 groups. README/Help/guide remain concise/play-focused; Elixir effect and unreleased cart availability corrected. Developer docs/changelog/plans/prompt/tasks/handover mark M1–M3 complete within this scope. Required art payload/sprites/source materials, CSS and version unchanged. No commits/releases; existing worktree preserved. Review deltas: [runtime](game-delta.patch), [tests](tests-delta.patch), [developer docs](developer-docs-delta.patch).

**Native GR-09 remains unverified.** Physical mobile/other browser engines and S4's manual OS chooser-cancel limitations remain unverified; controlled visibility and touch tests do not establish those. There is no next market phase to start automatically and no new release authorization.

## Reproduce

Use the host's working Node with its simdutf path, full/focused game tests, preview tests, syntax/non-writing bake and documented external smoke. Browser runners use external installed Playwright/Chrome, with no game build/runtime dependency. Performance runner takes an output JSON path; seed runner needs the recorded pre-M3 temp source snapshot and fails visibly if absent. Fixtures, overrides and profile scopes are specified in runners/results rather than silently treated as natural gameplay/native OS observations.
