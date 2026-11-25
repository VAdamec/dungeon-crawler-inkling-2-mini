# GR-08 — Boss and ending cinematic audit

Date: 2026-11-25. Status: implementation, call-site audit and focused browser verification complete; final whole-migration visual acceptance remains FG-01/GR-10. Release stays 1.0.1. No staging/commit/release, artwork regeneration or dependency change.

## Fixes and visual decisions

- Boss defeat snapshots now retain the original interpolated foot point, facing and authored pose. The one-shot collapse scales around those feet instead of the transparent source cell's center. Large sprites use captured art bounds for viewport culling, so a visible body is not dropped just because its logical tile lies outside the viewport.
- Screen-space actors share `drawCinematicActor()`, which centers their visible animation union and uses source anchors. Intro portraits fit a 260px longest edge before the existing zoom, replacing inconsistent/tiny portraits. World boss scale remains unchanged.
- Dragon defeat cycles all four authored wing poses instead of effectively staying on pose 1. Existing lightning, fall, embers, fade, sound and banner timing remain.
- Skeleton King guards use their actual skeleton art/pose/facing for the rotating collapse. Their live HP becomes zero when the captured collapse starts, preventing duplicated living guards and attacks after the king dies. This is the **intentional gameplay correction**: guards no longer survive their scripted collapse. It awards no guard XP, gold or kills; boss rewards and permanent defeat flags remain once-only, and revisits still omit guards.
- Companion art remains its existing tiny scale (Marmalade retains its separate scale). Companion speech is suppressed during boss flourishes and resumes afterward; the attributed journal remark and its existing lifetime are preserved. It no longer covers defeat art.
- Princess runs right using authored walk poses during 2–3.6s, then holds her healing/riding pose. Removed the extra procedural run bob. Dragon faces its escape direction with all four wing frames. Healing uses the prepared Greater Heal sparkle in front of the dragon, retaining the procedural glow/hearts and refilling HP bar.
- Sunset hero uses rear-facing authored walking poses toward the sun, then a static rear pose at THE END. Removed the duplicate bob and dark face rectangle painted over the new helmet; retained a slight slump and repositioned procedural tears beside the helmet/trailing behind.
- No custom roar/death/rider/crying sheets were supplied. These shots deliberately combine reviewed directional poses with existing procedural dramatic transforms, particles and tears. No shot requires an invented character or a fallback grid. This is an explicit implementation choice, not a claim that walking sheets are bespoke cinematic art or that the user has given final visual acceptance.

## Complete call-site matrix

All sources below are local prepared/baked art. `characters-v1/<id>/walk-sheet.png` supplies character poses; knight uses `knight-reference-v1/walk-sheet.png`. Screen coordinates are the fixed 1152×768 canvas; world points remain under the existing camera/2× zoom.

| Call site / shot | Source role / poses / direction | Scale and anchor | Procedural treatment / verdict |
| --- | --- | --- | --- |
| `drawBossIntro()` — all nine kinds | mimic, hydra, boar, medusa, darkWizard, skeletonKing, cook, bartender, dragonBoss; frames floor(t×8)%4, front | Longest union edge 260px, visible-center source anchor | Existing reveal/zoom/shake/glow/particles/card retained. Audited all nine portraits; no clipped or tiny portraits. |
| `drawMimicDefeat()` | mimic, captured current pose/facing | Captured world scale/foot point | Snap/squash/coin/dust/fade retained; corrected pivot and art-bound culling. Ordinary loot remains chest art. |
| `drawBossDefeat()` — Hydra | hydra, captured pose/facing | Captured world scale/feet | Collapse plus abstract green regrowth wisps; retained as a magic motif, not replacement head art. |
| `drawBossDefeat()` — Wild Boar | boar, captured pose/facing | Captured world scale/feet | Tusk/charge trails, dust and tumble squash retained. |
| `drawBossDefeat()` — Medusa | medusa, captured pose/facing | Captured world scale/feet | Snake-like magic arcs, stone particles and fade retained. |
| `drawBossDefeat()` — Dark Wizard | darkWizard, captured pose/facing | Captured world scale/feet | Rune symbols/burst/banish particles retained. |
| `drawBossDefeat()` — Skeleton King | skeletonKing, captured pose/facing | Captured world scale/feet | Crown outline/shards and fall retained; corrected body anchor. |
| `drawBossDefeat()` — summoned guards | skeleton, captured frame/facing | Captured guard scale/foot offset relative to boss | Real art replaces placeholder rectangles; rotation/fall/fade retained. Live guards collapse once without rewards. |
| `drawBossDefeat()` — Cook | cook, captured pose/facing | Captured world scale/feet | Pan/scrap/sizzle symbols and collapse retained. No ordinary Orc substitution. |
| `drawBossDefeat()` — Bartender | bartender, captured pose/facing | Captured world scale/feet | Mug/foam symbols and collapse retained. No ordinary skeleton substitution. |
| `drawDragonDefeatDragon()` | dragonBoss, four wing poses, front | Screen center at (576+shake,dragonY), scale 4, union-centered | Existing fall/wing compression retained; genuine frame cycling fixed. `drawDragonDefeat()` keeps lightning/embers/banner. |
| `drawCompanion()` | All nine adopted boss sources, plus catCompanion | Existing 0.55 boss / 1.5 Marmalade scales, interpolated feet, GR-07 authored gait | No cinematic replacement sprite. Cook/Bartender aliases retained; speech waits during boss flourishes. Nine actual companion captures inspected. |
| `drawEndingHero()` — reveal/heal/escape | knight, static frame 0, front | Existing scene position/scale 4, union-centered | Stationary reaction while couple departs; procedural letterbox/captions retained. |
| `drawEnding()` — princess reveal | princess, frame 0, front | Scene position/scale 4, union-centered | Reveal bubble retained. |
| `drawEnding()` — princess run | princess, four walk poses, right | Existing 2–3.6s path/scale 4, union-centered | No second procedural gait. Love bubble retained. |
| `drawEnding()` — princess healing/riding | princess, frame 0, right | Existing heal position, then dragon-relative rider position; scale 4 | No new gameplay interaction. Pose held intentionally. |
| `drawEndingDragon()` — wounded/healed | dragonBoss, frame 0, right | Existing scene position/scale 3, union-centered | HP-dependent opacity and HP bar retained; sparkle overlays actual art. |
| `drawEnding()` — healing effect | greaterHealFX, 0–3 by 3.6–5s progress | Scale 2, source anchor/union center above dragon | Local baked sparkle plus existing procedural hearts/glow. |
| `drawEndingDragon()` — escape | dragonBoss, four wing poses, right | Existing 5–8s flight path, scale 3 | Small existing flight sway retained; princess follows the same dragon scene coordinates. |
| `drawEndingHero()` / `drawEndingSunset()` — sunset/done | knight, four walk poses then frame 0, back | Existing 8–14s path and shrinking scale 4.2→1.8, union-centered | Procedural sunset, path, slump and tears retained. No replacement face rectangle; final stats/THE END hold. |

## Verification

- Eight new regressions: all-nine foot/facing anchors; portrait padding/wing poses; guard art/liveness/rewards; ending poses/healing effect; all-nine lifecycle/skip/travel; ending events/audio/hidden states/restart; large-body viewport edge; portrait fit and companion speech gating.
- The initial four issue-focused regressions failed before the fixes and pass afterward. No prior assertions weakened or removed.
- Focused GR-08: **8 pass, 0 fail**, ~10.7s. Hidden tab, Help and console freeze/reset timestamps for all nine intro/defeat kinds; stale frames cannot resurrect a skipped/travelled/restarted scene. Ending tests check one-shot healing audio, silent skip, full HP refill and unchanged rewards.
- **Full game suite: 179 pass, 0 fail, 0 skipped, ~107.6s**, default heap without enlarged heap flags. Standalone preview suite: **27 pass, 0 fail, 0 skipped**. Syntax, non-writing bake check and `git diff --check` pass.
- [Browser evidence](browser.json): ordinary Chrome `file://`, no relaxed flags, no page/console errors or remote requests. Real boss kills for all nine kinds; captured intro/defeat and adopted companion for each. Depth-100 dragon defeat → actual Esc → actual Space at rescued princess starts the finale; six phase captures, HP refill, reward stability, skip and R/restart verified. Deterministic setup disables periodic AI and queues rAF callbacks; game functions and handlers are real, and lifecycle frames are explicitly driven. This is not a native-frame-rate performance measurement.
- [Seeded before/after evidence](state-parity.json): **33** scenarios compare town/floors, all spells/traps, every boss kind's rewards and the full gated ending's phases/events/dragon HP against task-start source. Maps, player progression, inventories, loot, clocks and rewards match. These baseline scenarios do not summon guards; the intentional guard-collapse correction is covered separately by the focused/browser tests, not hidden as visual metadata.
- All **824** protected files unchanged: source PNGs/baked data, sprite renderer, HTML/styles and unrelated gameplay plans. Only game rendering/cinematic guard cleanup, regressions, browser proof and task/evidence docs changed in this task.

## Captures and reproduction

For each `mimic`, `hydra`, `boar`, `medusa`, `wizard`, `skeletonKing`, `dragon`, `cook`, `bartender`, this directory contains `<kind>-intro.png`, `<kind>-defeat.png` and `<kind>-companion.png`. Images use actual game maps, camera and renderer with controlled test positioning, not the standalone preview.

Ending: [reveal](ending-reveal.png), [run](ending-run.png), [heal](ending-heal.png), [escape](ending-escape.png), [sunset](ending-sunset.png), [done](ending-done.png).

Run `node --test tests/game.test.cjs` and `node --test docs/previews/2026-11-25-0x72/verify-*.cjs`. Optional browser proof: `OX72_PLAYWRIGHT=/absolute/path/to/playwright node docs/previews/2026-11-25-0x72/check-gr08-browser.cjs`. This machine requires `/opt/homebrew/bin/node` with `DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/simdutf/9.3.2_1/lib`.

Next: GR-09 full acceptance, external smoke, actual browser scenarios and same-browser performance comparison; then GR-10 delivery/docs and final visual decisions. No release, performance-parity or new-art acceptance claim. `js/art-runtime.js` remains generated/untracked pending the explicit delivery decision.
