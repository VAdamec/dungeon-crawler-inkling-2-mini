# Companion selection — reviewed implementation plan

Originally reviewed against 2.0.0 on 2026-11-26. **C1–C3 complete; native GR-09 remains unverified.** [Coordinated tasks/modal contract](implementation-plan.md) · [Local LLM prompt](../prompts/2026-11-26-companions-travel-trading-local-llm.md).
> **Historical P0 prototype checkpoint:** the earlier concurrent live-mutation/partial prototypes were subsequently reviewed and corrected by T1/T2, C1–C3 and M1–M3. Their original baseline descriptions below are historical. Current scope/remaining manual checks: [release readiness](../reviews/2026-11-26-release-readiness/README.md). Preserve all worktree changes; do not restart completed queues.


## Current phase status — 2026-11-26

**C1–C3 complete within companion scope.** [C3 report/matrix](../reviews/2026-11-26-c3-integration/README.md): 224/224 game, 75 focused and 27 preview tests pass, plus syntax/bake/smoke, nine seeded state/RNG matches and desktop/mobile integration and eleven-role pixel secrecy. `selectCompanion(id, session)` retains captured-session validation. The independent **GR-09 native background-tab/minimize observation remains unverified**; no full human campaign, hardware or subjective approval claim.

Subsequent S1–S4 explicitly preserve companion selection/unlocks in manual JSON files. The original C1 no-cross-reload-storage boundary below predates that approved feature; it does not prohibit portable-file restoration. Browser storage/autosave were not added.

## Scope and current facts

Keep one active companion, add Marmalade/Pip as starting choices, unlock defeated boss species, and permit later selection in town. All choices/unlocks last only for the current run. Do not add companion inventory, levels, equipment, multiple followers, cross-reload storage or new combat balance.

Current `state.companion` and `state.entranceCat` are transient. `joinEntranceCat()` supports manual gate recruitment and first-descent auto-join; `enterFloor()` now uses `companionEntryDone` independently and keeps `entranceCat.entered` consistent for compatibility. `damageMonster()` awards boss rewards before `adoptBossCompanion()`. `companionTick()`, `companionTalk()`, `drawCompanion()` and fog use the active object. Preserve those ordering and lifecycle contracts while generalizing them.

## Registry and state

Use stable IDs matching `bossKind()`:

| ID | Sprite | Scale | Behavior / unlock |
| --- | --- | --- | --- |
| marmalade | catCompanion | 1.5 | Starting cat; damage 1, damage 2 against preferred bats; existing CAT_LINES |
| pip | dog | 0.7 | Starting sidekick; damage 1, no bat preference; small dedicated sidekick quote pool |
| mimic | mimic | 0.55 | Boss defeat |
| hydra | hydra | 0.55 | Boss defeat |
| boar | boar | 0.55 | Boss defeat |
| medusa | medusa | 0.55 | Boss defeat |
| wizard | darkWizard | 0.55 | Boss defeat |
| skeletonKing | skeletonKing | 0.55 | Boss defeat |
| dragon | dragonBoss | 0.55 | Boss defeat |
| cook | cook | 0.55 | Themed defeat |
| bartender | bartender | 0.55 | Themed defeat |

**Correction:** Cook/Bartender have dedicated prepared sprites. Do not put `orc`/`skeleton` in new registry entries or generate replacement art. Existing compatibility drawing for legacy themed companions may remain until all relevant call sites migrate.

Registry fields: id/name/sprite/scale, behavior, line pool, damage/bat bonus and unlock rule. Mutable run data belongs in `state`:

- `selectedCompanion`: defaults to `marmalade`.
- `unlockedCompanions`: unique IDs, initially the two starters; an array is sufficient.
- `companionEntryDone`: one-time first-descent latch, independent of the cat's identity.
- `companion`: existing active actor, with registry ID and its own motion key.
- `companionPicker`: transient dialog session or null, following the shared modal contract.

Never add these to `FLOOR_FIELDS`, town snapshots or monster templates. Retain `entranceCat` for existing cat behavior/tests, but do not make Pip's eligibility depend on cat recruitment/retirement. On first descent, ensure the selected starter is present only if no companion is already active, then set the entry latch; keep the legacy cat entry flag consistent for compatibility. Manual recruitment must not create a second follower on descent.

Death/ending clear active/picker/unlocks/selection appropriately; a new run initializes the two starters/default selection. R still skips the launch branding once started; it must not reopen launch just to show the picker. Starting choices remain available from the town post after restart.

## Starting and town selection

- Add two compact launch choices, Marmalade/Pip. Default remains Marmalade. Tab and card arrows select; explicit Start/Enter/Space begins the run. Arrows on the picker must not accidentally trigger any-key start. Other existing start shortcuts may start using the selected card.
- The default path must retain Space recruitment of Marmalade near the gate. When Pip is selected, Space near Pip recruits Pip. The unselected starter can be talked to, but cannot silently override the selected companion through its old recruitment branch.
- The active starter's town animal is hidden to prevent duplicates; restore an inactive starter's original town actor when appropriate. Change only `hidden`/interaction eligibility: preserve named actors, home coordinates, patrol paths and clocks. Returning to town cannot display both the active Pip/Marmalade and an identical recruitable copy.
- Town switching uses a companion post near the Inn. Find a walkable, unoccupied, reachable tile near the proposed `(34,26)`; do not hard-code a coordinate without checking generation/doorsteps/NPC paths. Save only its landmark/prop with town data, never the run roster/session.
- No `companionBoard` sprite exists in the current prepared art. Use a simple **code-drawn wooden sign/paw marker with a “Companions” interaction hint** for this small UI landmark, or reuse an existing suitable marker after visual review. Do not add an unresolved art role, rebake arbitrary new artwork or repurpose a character sprite. A focused file:// still must show the marker and its interaction tile before calling the phase complete.
- Space beside the post opens `#companionOverlay` outside `#wrap`. Display unlocked choices and disabled locked entries with defeat hints. Preview/highlighting does not alter the active actor. Select applies one choice; Cancel/Esc leaves it unchanged.
- Switching is town-only, beside the post, during an active run, with no help/console/health/retreat/cinematic/player-menu/hidden state. Follow the shared focus, freeze and teardown rules.

## Unlocking, adoption and combat

- Each eligible boss/themed kill unlocks its ID once, after existing rewards/flags; duplicate species encounters never duplicate the unlock or unlock log. No re-farming XP/gold through selection.
- Preserve immediate adoption on a boss kill, update `selectedCompanion`, and keep the one-time Marmalade retirement remark. **Adoption is not permanent:** the player may choose any unlocked companion again at the town post.
- `entranceCat.retired` is the once-only automatic retirement/story latch, not a ban on deliberately selecting Marmalade later. Reselecting her must not repeat the retirement remark at the next boss.
- Starter cat keeps its existing bat preference/damage. Pip and boss companions deal exactly 1 damage on the existing three-active-second cadence; use deterministic nearest eligible targeting for Pip and preserve established boss targeting unless explicitly changed. No new attack timers/RNG.
- Use registry line pools so Pip does not use boss lines. Preserve boss speech suppression during cinematic flourishes, companion light radius, fog secrecy, travel placement and damage/reward timing.
- Clear the old actor's motion/direction/speech on confirmed switch; build/place the new actor through `placeCompanionNearPlayer()`. A cancelled preview must not reset attack or speech readiness.

## Tasks / acceptance

- **C1 — Registry/run model (complete):** registry, unlock helper, selected-entry lifecycle, compatibility recruitment wrappers, correct art. Tests cover both starters, all nine boss IDs, no floor-save pollution, idempotent unlock/adoption and reward preservation.
- **C2 — Picker/post (complete):** launch cards, town marker, modal and focus; test both recruitment paths, no accidental arrow-key start, locked/cancel/same-choice paths, duplicate town animals, default R behavior and town-only range checks.
- **C3 — Integration (complete):** cat retirement/reselection once-only, correct Pip/boss damage, bat preference, light/secrecy, travel/retreat/scroll returns, hidden/help/console/trade exclusion, teardown/stale-session rejection and file:// desktop/mobile captures.

Keep source art, game stats, single-tile collision, floor generation and existing unrelated tests intact. Update the few tests whose launch/selection behavior intentionally changes; do not erase economic/fog/cat invariants to make the feature pass. See the master plan for exact check commands and phase handoff.
