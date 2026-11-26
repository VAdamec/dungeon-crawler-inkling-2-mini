# M2 — selected market UI and confirmed trade commits

2026-11-26. Explicit M2 request complete within the checks below. M1 is reused; M3 remains pending. **Native GR-09 background-tab/minimize remains unverified.** No staging/commit/release/version/art regeneration. Existing worktree and staging preserved.

## Result

The former menu changed live equipment/spells/gold before Confirm and only partly reversed them. M2 replaces it with the isolated M1 cart. Space opens Buy, X opens Sell. Row click/native Enter selects; Add purchase / Buy & equip or B stages the selected row; Add sale or S stages one equipped slot. U/Shift+U Undo/Reset. Explicit Confirm applies the retained cart; Cancel/Esc/Close discards. Empty Confirm closes silently. The immediate first-buy and sell-all compatibility paths are removed, including the no-DOM harness. Nine existing economic/persistence interaction tests now explicitly open, stage and Confirm; their substantive price/HP/spell/stock/revisit assertions remain.

The fixed modal shows prepared icons, safe plain-text item effects, replacement warning, accepted operation list and projected gold/HP/STR/ATK/DEF/DEX/potion/scroll totals. Known/unaffordable/pending entries remain visible, disabled with reasons. No automatic resale or backpack. Elixir states its actual base-gold refund, without suggesting a stat boost. Two scrollable lists, scrollable body/order and a fixed summary/action footer keep controls accessible; desktop columns stack on mobile. Ordinary buttons use `aria-pressed`, status is polite live text, focus traps among enabled buttons; no incomplete listbox role.

## Access, identity and commit

- One `tradeMerchant()` resolver: current persistent town Store at nearbyTile range, dungeon merchant on its exact tile. Active visible living run only, with no conflicting player menu/pause/Help/console/load/cinematic. No new shop/stock/pricing tiers.
- Transient `state.trade` captures owner/run/map/area/depth/live merchant, immutable opening/rules/M1 cart, selection/mode/status and focus/inert flags. Still83 initialized state keys and v1 save format. Nothing enters floor/town/templates or a save file.
- Static and row handlers capture the opening session. Old Select/Add/Confirm/Cancel callbacks cannot act on another shop/session/run. Close/discard clears those callbacks and dynamic rows so hidden DOM does not retain an old run/cart. New sessions render fresh controls.
- Confirm checks current identity/range/context and freshly captured affected values/rules against the original. It replays accepted operations through M1 and requires an exact proposed-result match. Stale/changed/forged carts leave newer progress untouched and require Cancel/reopen. Hidden confirmation retains the cart; visibility never auto-confirms.
- Synchronous application uses a reentry guard. Changed gear goes through `equipItem`; final scoped currency/inventory/scrolls/spells/readiness/stock and path-correct HP/maxHP apply once, then god-mode freeze, active `saveTown`/`saveFloor` and presentation-only paint. Source world/merchant/town/floor identities are preserved. Replacement rules and same-bonus ring behavior stay unchanged.
- Before application it captures affected values/references, equipment slots and shallow active floor/town cache records. Injected equipment/save/paint failures restore those values/cache aliases before any trade notice and leave a safe error/reopen route. It does not clone art/world or invoke gameplay inverses. The paint-failure test restores model and redraws prior HUD; this is not a claim of S2-style bitmap rollback under a permanently broken renderer.
- On success it consumes session identity before emitting notices from retained accepted operations. Each purchase/sale has one cue and matching text; new tome adds one learned-spell line. Buy→sell is two real operations; undone/reset/cancelled actions emit none. Only confirmed purchases emptying previously nonempty stock request a companion merchant remark. No source RNG is consumed by validation, application or notices.
- Dismissal restores inert/focus/clocks without cancellation logs, HP/latch changes or inverse trades. Forced restart/floor/town/death/ending discard first. Existing simulation guards stop timed gameplay/animation; no new pause timer. M/audio remain usable, ?/~ do not stack overlays and R restarts.

## Verification

| Check | Result / evidence |
| --- | --- |
| Full game |296/296: [initial full run](game-tests.txt), [final full run after close-reference cleanup](game-tests-final.txt) |
| Focused market/economic tests |32/32:10 M1 +13 M2 +9 migrated legacy interactions; [log](focused-tests.txt) |
| New M2 regressions |13/13: [log](m2-tests.txt); all13 fail against pre-M2 source ([before](before-regressions.txt)) |
| Prepared sources |27/27 [preview tests](preview-tests.txt) |
| Syntax / deterministic payload / smoke |Allthree runtime scripts, tests, development runners; non-writing [bake](bake.txt) and external [SMOKE_OK](smoke.txt) |
| Ordinary semantic/RNG comparison |18 matches:3 seeds × town/gear/spells/scroll-return/retreat/god-mode; state, effective stats and next8 RNG values [match pre-M2](seeded-state.json) |
| Browser |Four actual file:// profiles/scenarios: desktop1440×1000 and390×844 touch emulation × town/dungeon; [results](browser.json) |
| Protected files / links / whitespace |[Before hashes](before-hashes.json), [final manifest](file-checks.json) |

Regressions cover nearby/exact access, blocked contexts, selected-row and no-live-preview effects, HP/spell Cancel leaks, retained and undone notices, sold-out companion guard, ring/level/god-mode parity, known/unaffordable/empty rows, sale-funded purchases, stale source/context/cart rejection, stale callbacks, injected partial equipment/town/floor-save/paint failure, exact rollback references, persisted stock/gear/spells and portable snapshots, keyboard/focus/audio/hidden retention/restart/forced teardown and text-safe replacement/elixir details. Test snapshots exclude only transient trade/load/help-focus/wall-clock and disposable audio/art/motion; no gameplay arrays are omitted to hide preview effects.

Browser [runner](check-browser.cjs): real native Space/X and row Enter, B, Undo, Reset, selected sale/non-first purchase, Cancel and explicit Confirm; desktop click and mobile tap, no automatic row commit. Compares source state during preview/cancel,520ms live-tick freeze, focus trap/M/?/~, source merchant identity and exact spell/stock persistence after revisits, duplicate old Confirm rejection. Footer fits, no width overflow, action targets at least44px. Zero page/console errors or HTTP requests. Progression/stock/location setup is staged and intervals isolated except the documented live freeze interval; not a natural campaign or physical-mobile test. [Screenshot setup and images](screenshots/README.md).

## Changed files and handoff

`js/game.js` replaces the prototype, adds binding/replay/commit/rollback/render/controller helpers and narrow lifecycle/input/audio integration. `index.html`/`style.css` provide the fixed responsive modal. Tests add13 groups and migrate9 old interactions. Minimal README/Help/guide controls now describe the playable cart rather than immediate buying/sell-all; developer docs, tasks, canonical/master/superseded plans, prompt and handover updated. CREDITS/CHANGELOG, sprites/art payload/source and version unchanged. Review deltas are in [runtime](game-delta.patch), [tests](tests-delta.patch), [developer docs](developer-docs-delta.patch).

**M3 next only on request**: complete the wider clock/lifecycle/forced-transition/portal/companion/god-mode/recovery/mobile/performance and documentation matrix. Basic M2 prerequisites do not close all M3 acceptance. **Native GR-09 background-tab/minimize remains unverified.** Physical mobile/other browser engines and S4's native OS chooser-cancel limitation remain unverified. No release/git action is implied.

## Reproduce

Use the host's working Node with its simdutf path, full `node --test tests/game.test.cjs`, focused `--test-name-pattern='M[12] |trade entry|merchant|ring pickup|Inn and Store|town gate enters|Town Scroll can'`, preview tests, syntax/non-writing bake and documented external smoke. [Seed runner](check-seeded.cjs) requires the pre-M2 source snapshot at `/tmp/dungeon-m2-before`; it fails visibly if absent. Browser runner uses external installed Playwright/Chrome, stores profiles outside the game and needs no runtime build/module/dependency/network.
