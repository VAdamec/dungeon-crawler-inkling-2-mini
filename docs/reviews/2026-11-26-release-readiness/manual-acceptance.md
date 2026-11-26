# Acceptance checklist — baseline and 2.1.0 alpha follow-up

**Release decision:** the user subsequently authorized 2.1.0, with remaining checks carried into alpha testing. [Versioned release record](../2026-11-26-release-2.1.0/README.md). Use that release package/hash for new alpha observations; the execution below identifies its older pre-version-bump baseline. No manual checkbox is closed by this release decision. Native GR-09 remains **UNVERIFIED**.

Prepared 2026-11-26; available-check execution recorded in the [acceptance run](../2026-11-26-acceptance-run/README.md). **Native GR-09 is UNVERIFIED.** The human-only checkboxes below remain open; automation establishes only the explicitly recorded portions. Use the current [review ZIP/source fingerprint](package.json), not the older published 2.0.0 package. Branding remains 2.0.0.

## Execution results — 2026-11-26

| Checklist area | Observed result / remaining gap |
| --- | --- |
| Candidate identity | Same five runtime files/ZIP as readiness review; fresh hashes, CRC and source/copy/extraction comparison pass. Runtime/tests unchanged. |
| Regression checks | Fresh 307/307 game and 27/27 prepared-art tests; non-writing bake and extracted-package smoke pass. Full suite includes modal/file rejection/recovery, audio scheduling, boss and ending regressions. |
| Ordinary portable files | Chrome and Playwright WebKit desktop/narrow-touch emulation passed real Blob downloads, reload, file-input/FileReader preview and explicit Load, complete durable-run equality, market Cancel/Confirm and one-use portal. This does not exercise an OS chooser or physical phone. |
| Relocation/profiles/large files | All 12 staged save scenarios passed both directions across two fresh Chrome profiles and a separate five-file folder with spaces; exact 32 MiB input, aliases/resources, stock/loot/key/companion/portal/guard/high-level progression retained. Late invalid/prototype-sensitive files were rejected without replacing the adventure. |
| Another engine | WebKit 27.2 functional transport/market/portal checks passed. Firefox first desktop flow reached its final request-count assertion, which failed; the two-profile runner is incomplete there, not a Firefox compatibility pass. Safari.app/audio/native chooser/restart combinations remain untested in that engine. |
| Native OS chooser cancellation | **Not observed.** Native file-tab testing was blocked by the browser tool's http/https-only URL policy; no workaround attempted. In-game/model Cancel/error/retry is covered separately, not substituted. |
| Native GR-09 | **UNVERIFIED.** No genuine hidden/minimize event plus frozen/resumed game/cinematic snapshots directly observed. No synthetic visibility was used in this execution. |
| Campaign/ending | Additional staged VM chain covered all 100 floors, 99 actual carrier drops/collections, 13 boss encounters, exact save/hydrate checkpoints, gated once-only rescue, ending phases, no depth 101 and restart. Positioning/lethal damage staged and drawing/audio disabled: natural-play/balance/visual/audio acceptance stays open. |
| Physical mobile, listening, final approval | Not available from emulated/headless/VM checks. All corresponding human acceptance rows remain pending. |

The [run report](../2026-11-26-acceptance-run/README.md) records commands, environment, source identity, passes, the Firefox harness failure and remaining limits. Those earlier results did not authorize publication; the later explicit user request authorizes 2.1.0 alpha as recorded above.

## Record before testing

| Field | Tester entry |
| --- | --- |
| Tester / date | Pending |
| ZIP SHA-256 / source fingerprint | Copy exact values from package.json |
| OS / hardware / physical device | Pending |
| Browser / version | Pending |
| Launch method / extracted folder | Pending; use normal file://, no relaxed access flags |
| Natural run or staged setup | Pending; label every staged scenario |
| Evidence / defects | Pending; reference screenshots, observations or issue paths |

Save a portable backup before destructive/restart/death scenarios. Keep independent copies of saved JSON. Record **Pass**, **Fail**, **Not observed** or **Not run**, plus evidence. A checked item requires an actual human observation of this candidate. Do not equate a staged battle with a complete campaign or viewport emulation with physical-device testing.

## Native background/minimize — GR-09

**Status: UNVERIFIED. Leave open until genuine native transitions are observed.** No redefinition of document.hidden/visibilityState and no synthetic visibilitychange events. Normal browser only. Test tab switching and native window minimize separately; release movement keys before switching.

- [ ] Active gameplay: start alive with no Help/shop/health/console/cinematic pause and god mode off. Capture progression, hazards and nearby monster/hero state at the actual hidden event. Background for 10–20s; return. Repeat with window minimize. Expect hidden state observed, frozen simulation and no hidden-time catch-up on return.
- [ ] Walking/environment animation: background during visible movement/wing/torch/portal animation; verify motion resumes smoothly without a large interpolation jump or extra game turns.
- [ ] Boss intro/defeat: background during a running scene longer than its normal duration. Expect the same captured cinematic elapsed/phase on the native return event, then ordinary visible-frame continuation; skip/restart still work.
- [ ] Final ending: background during princess healing or flight. Expect no hidden phase advancement, HP refill/story milestone replay or jump to sunset; complete/skip afterward and check once-only rewards.
- [ ] Shop and load preview: retain an unconfirmed cart/validated file preview while switching/minimizing. Expect no implicit purchase/load; Cancel and later explicit Confirm remain correct.

Optional read-only developer observation, installed in DevTools before testing, then close DevTools and perform real tab/minimize actions:

```js
window.releaseVisibilityAudit = [];
window.releaseVisibilityObserver = () => releaseVisibilityAudit.push({
  hidden: document.hidden, visibility: document.visibilityState, wallTime: Date.now(),
  run: JSON.stringify({
    area: state.area, depth: state.depth, activeTime: state.activeTime,
    hazardTime: state.hazardTime, motionTime: state.motion.time,
    hp: state.player.hp, mp: state.player.mp, turn: state.turn, kills: state.kills,
    monsters: state.monsters.map(m => [m.id, m.x, m.y, m.hp, m.nextAttackAt]),
    ending: state.ending && [state.ending.elapsed, state.ending.phase],
    intro: state.bossIntro && [state.bossIntro.elapsed, state.bossIntro.phase],
    defeat: state.bossDefeat && [state.bossDefeat.elapsed, state.bossDefeat.phase]
  })
});
document.addEventListener('visibilitychange', releaseVisibilityObserver);
```

This records native flags and reads state; it does not generate a transition. Compare the hidden-event run snapshot with the corresponding visible-event snapshot, not with a screenshot taken seconds before/after normal foreground gameplay. Capture real hidden:true / visibility:hidden. If the environment never exposes a native hidden state, record **Not observed**, not Pass. Remove the observer with `document.removeEventListener('visibilitychange', releaseVisibilityObserver)` after recording results. Do not reuse the earlier injected-visibility fixture as native evidence.

## Native file transport and another browser engine

- [ ] Save an ordinary living town/dungeon run; confirm a real JSON file exists on disk. Reload, choose it from launch, review then explicitly Load. Verify gold/HP/MP/gear/companions/stock/collected content and the current damaged encounter.
- [ ] Open the native file chooser and cancel through the OS Cancel/Esc route. Expect no game replacement, clear retry/Cancel behavior and correct focus. Retry the same file. If the native chooser never appears, record Not observed.
- [ ] Cancel an in-game preview after choosing a valid file; select a corrupt/unsupported/oversize file and retry a valid one. Expect original adventure unchanged until explicit successful Load, with usable Cancel/Close/audio.
- [ ] Move the extracted five-file folder and a save file to another location/profile. Open offline and import the file; verify portal return, merchant stock, learned spells and progression. No source/docs/PNG folders should be required.
- [ ] Repeat launch, market Confirm/Cancel, native save/load, audio and restart in another browser engine. Record its actual name/version; do not infer compatibility from Chrome.

## Physical mobile and input

- [ ] On an actual target phone/tablet, record OS/browser and whether the normal intended launch method supports this local package. If the OS blocks the launch/file chooser, distinguish that environment restriction from a demonstrated game defect.
- [ ] Check portrait and landscape HUD/help/shop/load layout; scroll Buy/Sell/body/cart, review totals and reach Confirm/Cancel without overflow. Check taps, focus/keyboard behavior available on the device, rotation while a cart is pending and preservation of its data.
- [ ] Verify save/download selection and import on that device, audio after interaction, mute/volume and recovery after an interrupted interaction. Emulated 390px/320px views are already automated evidence, not this item.

## Human campaign, difficulty, audio and visual acceptance

- [ ] Complete a natural campaign through depth 100, allowing manual save/load across sessions. Record actual active time, chosen companion, deaths/reloads and any debug/staged exceptions; do not infer a completion rate from automated encounters.
- [ ] Check economy and difficulty across early/middle/late depths: key discovery, potions/scrolls, selected purchases/sales, replacing gear, spell unlocks/MP, retreat cooldown and boss encounters. Record balance problems before changing formulas.
- [ ] Listen to music/effects through ordinary play and boss/ending scenes. Assess level balance, clipping, repetition and pacing; verify separate sliders/mute. Automated AudioContext/scheduling checks do not assess audible quality.
- [ ] Review final actual town/dungeon/biome/boss/ending artwork against [recorded graphics comparisons](../2026-11-25-graphics-recovery/gr09/README.md#fair-visual-comparisons). Record approved runtime presentation or requested changes with reviewer/date/source fingerprint. GR-08's technical cinematic audit is complete; this is final subjective acceptance, not a new migration task.

## Decision record

| Area | Result / evidence / reviewer |
| --- | --- |
| Native GR-09 | **UNVERIFIED** — pending real observations |
| Native chooser cancellation | Not observed; native file-tab tool policy blocked the attempt |
| Other engine / physical mobile | WebKit automation passed within recorded scope; Firefox runner incomplete; physical device not run |
| Human full campaign / audible quality | Not run |
| Final runtime visual acceptance | Pending explicit record |
| Publication approval | Subsequently authorized for 2.1.0 alpha only; remaining tests deferred, not passed |

Deferred themed encounters/Cook pan attacks/extra props are optional future scope, not requirements silently added to this acceptance pass. Record any later explicit scope or residual-risk decision separately; do not auto-close failed/unrun checks.
