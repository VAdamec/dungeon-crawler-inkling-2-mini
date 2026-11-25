# Companion Selection Feature Plan (Corrected)

Status: corrected design only. No implementation yet.

## Current behavior

- `state.companion` is the single active companion object and is transient. It is not in `FLOOR_FIELDS` and is cleared by death/ending/restart.
- `state.entranceCat` tracks Marmalade’s `{ recruited, entered, retired }` state. It is also transient.
- Marmalade is recruited by Space beside the gate cat or auto-joins once on the first dungeon descent via `joinEntranceCat(true)` in `enterFloor()`.
- Boss and themed-boss kills call `adoptBossCompanion(m)`, which replaces the active companion. The cat retires once with a log before the first boss companion joins.
- `companionTick()`, `companionTalk()`, `drawCompanion()`, and `fogLevel()` currently branch mostly on `companion.kind === 'cat'` vs everything else.
- Town already has a second animal that can become a starting companion without new art: Pip the dog (`sprite: 'dog'`), created in `genTown()`.

## Corrections from review

1. Selection and unlocked companions are **run-wide state**, not floor data.
   - Add `state.selectedCompanion` and `state.unlockedCompanions` to the `newGame()` state object.
   - Do **not** add either to `FLOOR_FIELDS`.
   - Do not save them in floor snapshots, templates, or town store state.
   - `newGame()` resets them; death/ending also clear/reset them as part of ending the run.
2. Define more than one starting choice.
   - `marmalade`: gate cat, `catCompanion`, scale `1.5`, cat behavior, `CAT_LINES`, bat preference and `CAT_BAT_BONUS`.
   - `pip`: town dog, `dog`, scale about `0.7`, sidekick behavior, one damage, no bat bonus, new generic sidekick line pool.
3. Define unlock rules and switching rules explicitly (below).

## Companion registry

Add a flat `COMPANIONS` registry in `js/game.js` beside `CAT_LINES` / `COMPANION_LINES`. Each entry should contain everything needed to build the transient active companion:

```js
const COMPANIONS = {
  marmalade: { name: 'Marmalade', sprite: 'catCompanion', scale: CAT_COMPANION_SCALE,
    kind: 'cat', behavior: 'cat', linePool: 'cat', damage: 1, batBonus: CAT_BAT_BONUS,
    unlock: 'start', townActor: 'isEntranceCat' },
  pip: { name: 'Pip', sprite: 'dog', scale: 0.7,
    kind: 'sidekick', behavior: 'sidekick', linePool: 'sidekick', damage: 1,
    unlock: 'start', townActor: 'Pip' },

  mimic: { name: 'Mimic', sprite: 'mimic', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  hydra: { name: 'Hydra', sprite: 'hydra', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  boar: { name: 'Wild Boar', sprite: 'boar', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  medusa: { name: 'Medusa', sprite: 'medusa', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  wizard: { name: 'Dark Wizard', sprite: 'darkWizard', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  skeletonKing: { name: 'Skeleton King', sprite: 'skeletonKing', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  dragon: { name: 'Dragon', sprite: 'dragonBoss', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  cook: { name: 'Cook', sprite: 'orc', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
  bartender: { name: 'Bartender', sprite: 'skeleton', kind: 'boss', behavior: 'boss', linePool: 'boss', unlock: 'defeat' },
};
```

Use IDs that match `bossKind(m)` so `adoptBossCompanion()` and unlock calls do not need a second naming scheme. Keep `Cook`/`Bartender` drawing behavior via the existing `drawCompanion()` outfit rewrite.

Add a small `COMPANION_LINES.sidekick` pool so Pip does not speak with boss lines.

## State model

```js
// in newGame()
selectedCompanion: 'marmalade',
unlockedCompanions: ['marmalade', 'pip'], // Set is fine internally; store as array for easy tests/JSON.
```

- `state.selectedCompanion` is the run’s chosen active companion ID.
- `state.unlockedCompanions` is the run-wide collection of IDs the player may choose.
- `state.companion` remains the transient rendered/attacking object built from `COMPANIONS[state.selectedCompanion]`.
- `state.entranceCat` remains for backward-compatible Marmalade tests. Its `entered` flag is reused as the one-time “first descent companion joined” latch, even when Pip is selected.
- No companion fields are added to `FLOOR_FIELDS`.

## Starting choices

1. Add a compact companion picker to the launch card.
   - Two cards: Marmalade and Pip.
   - Marmalade is the default so current behavior and existing tests remain the baseline.
   - Arrow keys / Tab choose a card; the existing start button or any-key start uses the highlighted choice.
   - Guard the launch keydown handler so arrow keys while a launch picker button is focused change the choice instead of starting the game.
2. `startGame()` applies the chosen ID before town/dungeon simulation begins.
3. On first dungeon descent, `joinSelectedCompanion(true)` builds the active companion from the registry exactly once.
   - If Marmalade is selected, hide `entranceCatActor()` as today.
   - If Pip is selected, hide the town animal named `Pip` and leave the gate cat visible but non-recruitable for that choice.
   - The objective/HUD text should reflect the selected companion, not hard-code Marmalade.

## Unlock rules

- New run: `['marmalade', 'pip']`.
- Whenever `adoptBossCompanion(m)` would run, first call `unlockCompanion(bossKind(m))`.
  - If the ID is new, add it once and log `{name} is now available at the companion board.`
  - If already unlocked, do not log again.
- This covers boss gates and themed bosses (`Cook`, `Bartender`).
- Unlocks are transient run state. They survive floor changes, travel, retreat, Town Scrolls, and town visits. They do not survive death, ending, restart, or reload.
- Boss defeats still award XP/gold and set `bossDefeated` exactly once via existing floor flags.

## When switching is allowed

- Switching is allowed only in town, beside a new `companionBoard` landmark/prop placed near the Inn (for example around `{ x: 34, y: 26 }`, on a walkable tile).
- Add `companionBoard` to `state.town.landmarks` and to `state.town.props`; save it with the town as existing props are saved.
- `townInteract()` checks the board before NPC/gate interactions. Space at the board opens the selection dialog.
- Not allowed while:
  - in the dungeon;
  - game over, ending, boss intro/defeat, health or retreat pause, help, dev console, or trade menu is open;
  - the page is hidden.
- While the dialog is open, town time and all timers freeze; reset `state.lastTick` on close so there is no catch-up.
- Selecting an unlocked companion:
  - updates `state.selectedCompanion`;
  - rebuilds `state.companion` from the registry near the player with `placeCompanionNearPlayer()`;
  - clears companion speech/motion for the old companion;
  - logs a short attribution line and calls `render()`;
  - never changes HP, MP, gold, equipment, potions, scrolls, or floor data.
- Esc/Cancel leaves the current companion unchanged.
- Boss adoption on a kill still overrides the current selection for the rest of the run and updates `state.selectedCompanion`; existing one-time cat retirement stays intact.

## Input/UI

- Add `#companionOverlay` as a fixed modal outside `#wrap`, following the help/dev-console pattern.
- Dialog contents: title, roster of unlocked companions with name/description/behavior, locked entries shown greyed out with their unlock hint, Select and Cancel buttons.
- Keyboard: Up/Down moves focus, Enter/click selects, Esc cancels, Tab is trapped among dialog controls. Route this branch before normal movement and after console/help precedence is decided.
- Update `#help` copy to mention the town companion board and that bosses unlock more choices.
- Update `#companionStat` / objective text to use `state.companion.name`, already the case in `render()`.

## Behavior generalization

- Refactor `joinEntranceCat()` into `joinSelectedCompanion(auto)` plus a small `makeCompanion(id, actor)` helper. Keep `joinEntranceCat()` as a thin compatibility wrapper if existing tests or call sites need it.
- Change `companionTick()` to read `behavior` from the registry:
  - `cat`: current bat preference and `damage + batBonus` vs bats.
  - `sidekick`: nearest visible target within three tiles, exactly `damage` (1).
  - `boss`: current nearest-target behavior, exactly 1 damage.
- Change `companionTalk()` to choose `linePool` from the registry instead of hard-coding `kind === 'cat'`.
- `drawCompanion()` keeps using `companion.scale || 0.55` and the existing Cook/Bartender sprite rewrite.

## Tests to add in `tests/game.test.cjs`

- Registry contains both starters and all boss/themed IDs; `COMPANIONS` entries have sprite/name/behavior.
- `state.selectedCompanion` and `state.unlockedCompanions` are not keys in `state.floors[depth]`.
- Launch choice Pip makes Pip auto-join once, hides the town dog, and leaves Marmalade waiting.
- Launch choice Marmalade preserves the existing gate-cat tests.
- Switching works only in town and only for unlocked IDs; cancel preserves the active companion.
- Boss/themed defeat unlocks the corresponding ID once, even on repeat simulation; no duplicate unlock log.
- Boss adoption sets `selectedCompanion`, retires Marmalade once, and HUD shows the new name.
- Death/ending/restart reset selection/unlocks and active companion.
- Existing tests for cat damage, boss damage, fog radius, and no floor saving remain green.

## Out of scope

- Multiple simultaneous companions.
- New sprite sheets or audio for new companions.
- Carrying unlocked companions across runs/reloads.
- Companion inventory, equipment, or leveling.
