# GR-07 — Motion and semantic visual states

Date: 2026-11-25. Scope: approved GR-07 only. Release branding remains 1.0.1. No staging, commit, new artwork or runtime dependency.

## Fixes

- Prepared character sheets now supply gait, wings and deformation directly. Removed duplicate procedural squashing/hopping/bobbing for covered actors; retained legacy fallback animation. Actor/shadow ground points use stable union height rather than the changing frame height. Logical movement and interpolation remain unchanged.
- Visible open town portals now request animation frames; closed and offscreen portals do not drive the loop. Open poses stay in 1–4, and blank closed/hidden semantic aliases remain zero-alpha.
- Fire vents select ignition/active/cooling/inactive poses from the existing six-second hazard phase (0–0.4s ignition, 0.4–2.6s active art, 2.6–3s cooling, 3–6s inactive). The existing damaging on-window is still 0–3s. Motion time cannot turn an inactive vent into a burning one.
- Rock cracks render only during the existing 1.2s warning and progress through four source poses. Existing `impactAt` and `hazardTime` select impact/dust/settled rubble, ending at frame 3 after 0.45s. No new hazard clock or damage callback.
- Hidden/armed spikes do not render. The existing once-triggered state uses the retracted/spent pose, never a repeating armed cycle. Gameplay has no timed rise/retraction state; no new timer or repeat damage was introduced to play unused source poses.
- Greater Heal uses its own gold starburst rather than Heal's green effect. Fireball, Frostbolt, Heal, Greater Heal and Barrier select source phases from existing projectile lifetime. Barrier uses the impact pose only when its actual push encounters a blocker; companion pulses/clear pushes do not claim an impact.
- All directional projectile source art (including bone/tankard) rotates from native rightward along the real flight vector. Tiny stinger remains a dart. Projectile pixels are suppressed where their current position is under undiscovered fog. Endpoints, travel duration and immediate damage semantics are preserved.

## Dispatch audit

| Source family / role | Runtime selection and contract |
| --- | --- |
| sword, bow, armor, helmet, shield, ring | Static source frame 0; equipment icons stay independent at 32×32. Helmet remains available artwork without adding a new gameplay slot. |
| potion, elixir, townScroll, key | Static source frame 0; existing inventory, pickups and travel logic preserved. World potion grounding is the completed GR-05/06 fix. |
| chest | Ordinary treasure draws closed frame 0. Opening/full/empty source variants do not invent new loot mechanics. Mimic stays a separate actor sheet. |
| spellbook, frostboltTome, greaterHealTome, barrierTome | Static frame 0; existing unlock depths and learning effects unchanged. |
| stairs / stairsUp / stairsDown | Fixed ascending frame 0 / descending frame 1. Existing visited rules and depth-1 ascent to town preserved. |
| arrowFX, stingerFX, boneFX, beerFX | Static source pose 0, rotated along source→target. Stinger's source width stays below arrow width. |
| fireballFX, frostboltFX | Animated phases 0–3 from current projectile lifetime. |
| healFX, greaterHealFX | Distinct green/gold sheets, phases 0–3; same original heal amounts, costs and cooldowns. |
| magicBarrierFX | Initial pulse 0, push 1, blocked impact 2, dissipating 3. Clear push skips impact 2. No defensive buff. |
| townPortal / portalClosed | Open frames 1–4; closed alias is genuinely empty. Drawing cannot consume a scroll or alter portal fields. |
| torch | Existing four stable-mount composites from GR-05/06; no source or bake edit. |
| fireVent / flameOff / flameOn | Actual hazard uses phase-derived fireVent states; fixed aliases remain valid inactive/active art roles. |
| spikes / spikesHidden | Hidden alias is empty; undisclosed trap is omitted; triggered trap shows retracted/spent pose 4. |
| rockCrack | Warning only; source phase 0–3 from time remaining before impact. |
| rockSpent | Impact/dust/settled source phase 0–3 from elapsed time after existing impact. |
| 26 character sheets | Four authored directions and motion poses; stable union feet, no extra mirroring or procedural deformation. NPC, hero, ordinary monsters and companions share this path. Direct cinematic poses are GR-08. |

All 31 item/effect families are accounted for. Source availability does not require every source pose to be used where gameplay has no corresponding state.

## Verification

- Seven new regression tests cover hazard phases/render purity, prepared gait, portal animation/empty aliases, actual Greater Heal and Barrier rules, projectile orientations/phases/fog, all 26×4×4 actor draws (416 cases), and pause/travel/stale-frame lifecycle.
- The five initial issue-focused tests failed before the fixes and pass afterward. The old procedural-slime assertion was split to verify the authored pose/no second hop **and** retain its legacy fallback-hop check; it was not removed.
- Focused graphics plus legacy-animation check: eight pass, zero failures. Existing nearest-target spell checks also pass.
- **Full game suite: 171 pass, 0 fail, 0 skipped, ~98.9s**, default heap. No enlarged heap flag.
- Standalone preview tests: 27 pass, zero failures/skips. Runtime/script syntax, non-writing `bake-runtime.cjs --check`, and whitespace checks pass.
- [Normal file:// Chrome proof](browser.json): real casts of Bow and all five spells, spike one-shot, rock warning/impact, fire damage cooldown, movement interpolation, help pause, stale travel callback, and native portal rAF progression. No relaxed flags, remote requests or page errors. The test disables the periodic AI interval for deterministic setup; it invokes actual gameplay functions, and portal animation uses native rAF.
- **Actual complete-canvas pixel comparisons:** hidden spikes and untriggered rocks leave the baseline unchanged; unexplored chest/potion/key/stairs/Mimic leave the baseline unchanged; minimap pixels do not reveal traps/loot. Direct blank-alias alpha is zero and Heal/Greater Heal pixels differ.
- [Combat effects capture](combat-effects.png) uses the actual game renderer with a staged open test area and overlapping spells at controlled phases. It is a regression capture, not a proposed encounter layout.
- [Seeded before/after state comparison](state-parity.json): seed 20261125, **17 scenarios** (town/patrols, floors 1/2/3/7/50/100, town return, all five spell casts, spikes/rocks/fire). Maps, actors, progression, loot, inventory, hazard states and clocks, spell cooldowns and turns match the task-start sources. Disposable art/motion metadata is deliberately excluded.
- All **823** protected files match their task-start hashes, including source PNGs, baked payload, index/styles and unrelated gameplay plans.

## Reproduction and remaining work

Run `node --test tests/game.test.cjs`, `node --test docs/previews/2026-11-25-0x72/verify-*.cjs`, and `node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check`. This machine uses `/opt/homebrew/bin/node` with `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`.

Optional external development-only browser proof: `OX72_PLAYWRIGHT=/absolute/path/to/playwright node docs/previews/2026-11-25-0x72/check-gr07-browser.cjs`. Browser output is written beside this report.

Next is GR-08: all boss intro/defeat/ending direct draw sites, cinematic art decisions and lifecycle audit. GR-09 broad acceptance/smoke/performance and GR-10 delivery documentation remain open. These focused checks do not close cinematic or whole-migration visual/performance acceptance. `js/art-runtime.js` remains generated/untracked; delivery decision stays in GR-10.
