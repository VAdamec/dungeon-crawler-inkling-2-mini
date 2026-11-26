# Dungeon Crawler development documentation

Updated2026-11-26 for completed companion/travel/gold/save/market work and release readiness. See [agent conventions](agents.md), [tasks](tasks.md), [handover](handover.md) and [credits/provenance](CREDITS.md). Release version: 2.1.0 (alpha). **GR-09 native background-tab/minimize observation remains unverified**; an explicit visibility-handler fixture is not a native transition test.

## Project background

This project began as a local LLM playground. The original author recorded roughly 30 hours to v0.11.0, using Apple M1/M5 machines and an RTX 4070 Ti PC, with inkling-2-mini, qwen3 and gemma. Graphics provenance and generation/export history belong in [CREDITS.md](CREDITS.md) and source records, rather than the player README or in-game Help.

## Runtime and delivery

Open `index.html` directly over `file://`. No server, build step, package installation or module loader is used during play. Ship these five files together, preserving relative paths:

1. `index.html`
2. `style.css`
3. `js/art-runtime.js` — generated data, loaded first
4. `js/sprites.js` — art resolution/rendering, loaded second
5. `js/game.js` — gameplay/bootstrap, loaded last

The art payload is a tracked required generated distribution artifact included with recorded release2.0.0 and the current review package; never silently omit it. Subsequent staging/commits/releases still require a user request. Source PNGs, prompts, preview galleries, screenshot scripts and bakers are developer/review files, not runtime fetches. See the [artifact ledger](docs/reviews/2026-11-25-graphics-recovery/gr10/artifact-ledger.json).

## Release 2.1.0 — alpha testing

[Current review/package manifest](docs/reviews/2026-11-26-release-readiness/README.md) and [manual acceptance checklist](docs/reviews/2026-11-26-release-readiness/manual-acceptance.md) distinguish technical verification from human/platform sign-off. The earlier five-file review ZIP identifies the pre-release 2.0.0-branded snapshot. The user subsequently authorized release 2.1.0, with remaining acceptance moved to alpha testing. The [2.1.0 record](docs/reviews/2026-11-26-release-2.1.0/README.md) identifies the final versioned package and checks. Tests/artifacts are not installed or fetched by the game; save format stays version 1.

T1/T2, C1–C3, G0/G1, S0–S4 and M1–M3 are complete within their evidence scopes. [Available acceptance checks](docs/reviews/2026-11-26-acceptance-run/README.md) now include fresh 307/27 tests, Chrome/WebKit offline package flows and 12 Chrome profile/path file cases. Native GR-09 remains **unverified**; manual native chooser cancellation, physical mobile, remaining browser coverage (Firefox harness incomplete), a full human campaign/audible balance playtest and final visual acceptance are still pending. The native file-tab attempt was blocked by the browser tool URL policy, with no bypass. Earlier FG checkboxes, heap-failure notes, partial-migration/untracked-payload claims and historical test totals do not reopen completed implementation. Deferred themed extras require a separate scope decision.

## Maintaining prepared artwork

- Selected knight/character/item/environment PNGs and manifests live under `docs/previews/2026-11-25-0x72/`. Keep the exact prompts, original selected source and correction provenance. Do not edit approved PNGs merely to make a test pass.
- `environment-v1/final-coverage.json` maps runtime roles to selected source families; `bake-runtime.cjs` resolves aliases, validates coverage and encodes lossless data. Keep material names separate from scenery names (`throne` resolves to the dais sprite; the throne material is still a material).
- Add a reviewed source/manifests/mapping when adding production art. The old `SPRITES`/palette grids are a fallback/prototyping path, not a substitute for a missing covered asset. Required art failures must remain explicit.
- Use `spriteDimensions()`/source anchors and union bounds, not raw grid dimensions or transparent cell size, for positioning and culling. `ART_DENSITY=2` is distinct from `MAP_ZOOM=2`.
- Raw sprite canvases are source-resolution and keyed by role/direction/frame, **not display scale**. Material surfaces use source-object identity. Keep icon caches separate. Rendering must not consume gameplay RNG.

Check or reproduce the existing bake with a working Node:

```sh
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --out /tmp/dungeon-art-runtime.js
cmp js/art-runtime.js /tmp/dungeon-art-runtime.js
```

When approved source pixels actually change, regenerate the payload with `node docs/previews/2026-11-25-0x72/bake-runtime.cjs` and run source round-trip, alpha/anchor/state and affected browser checks. Do not hand-edit the generated JS. Preparation exporters (`prepare-knight.cjs`, `prepare-characters.cjs`, `prepare-items.cjs`, `prepare-environments.cjs`) package sources; their collection READMEs document exact inputs/exports. None is a browser-play prerequisite.

## Gameplay changes

Add ordinary monster definitions to `MONSTER_TYPES` in `js/game.js`, including sprite role, base HP/ATK/DEF/XP and optional minimum depth/ranged/magic fields. Generation samples the full eligible weighted pool. Use `BOSSES`/`bossForDepth()` and `BOSS_ANIMATIONS` for bosses; keep final princess rescue gated by depth 100 and dragon defeat. Keep targeting/collision single-tile despite large art.

Add item definitions to `ITEM_TABLE` and route equipment changes through `equipItem()` so ring HP does not stack. Damage goes through `hurtPlayer()`/`damageMonster()`. Preserve floor-local saves versus run progression/transient UI/motion/art state; collected items stay collected and ordinary monsters recreate on return. Town time remains separate from dungeon simulation.

Actor movement commits through `moveActorTo()`; interpolation is visual. Prepared walking/wing/deformation poses must not receive a second procedural gait. Hazards select authored semantic states using existing clocks: hidden spikes/closed portals are empty, cracks appear only during warning, settled rubble uses the final pose, and an inactive vent cannot animate into burning. Changing a frame never deals damage, spends a scroll or advances combat.

Cinematic draw calls use the captured feet for in-world collapse and `drawCinematicActor()` for visible-union-centered screen shots. Preserve identity-bound callbacks, one-shot events, rewards, skip/restart and the finale's 0–2 / 2–5 / 5–8 / 8–14s schedule. Skeleton guards collapse without extra rewards. A new motion sheet is not automatically a bespoke attack/death/crying pose; record visual choices.

## Checks and documentation

```sh
node --check js/art-runtime.js
node --check js/sprites.js
node --check js/game.js
node --test tests/game.test.cjs
node --test docs/previews/2026-11-25-0x72/verify-*.cjs
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --check
```

The existing external smoke script is outside the repo, loads all three scripts, and prints `SMOKE_OK`. Browser tools under the preview directory require an external development-only Playwright/Chrome installation; no npm dependency is added to the game. [GR-09 evidence](docs/reviews/2026-11-25-graphics-recovery/gr09/README.md) documents commands, matched baselines, source hashes and measured limits.

After gameplay/rendering changes, verify actual `file://` controls, dialogs, travel, fog/secrecy and sound following user interaction. Documentation-only changes do not require rerunning the full behavior suite if runtime/data/source pixels remain byte-identical. [Screenshot reproduction](docs/screenshots/2026-11-25-integrated/README.md) uses actual runtime rendering and labels every staged setup. Update counts/stat tables from current code and keep historical evidence dated.

## Save/load files and data API (S1–S4)

Version-1 snapshots, atomic loading and player file controls are implemented. Help offers Save/Load; launch and ordinary death offer Load. S4 acceptance is complete for the recorded Chrome desktop/touch-emulated profiles; see [S4 files, timings and limitations](docs/reviews/2026-11-26-s4-acceptance/README.md). S1/S2 remain pure/model APIs; S3 uses local Blob downloads and FileReader, with no browser storage, network or new script dependency. [S0 schema contract](docs/reviews/2026-11-26-s0-save-load/schema-matrix.md) · [S1 implementation evidence](docs/reviews/2026-11-26-s1-save-data/README.md).

The four S1 helpers below are plain-script functions in game.js. They return detached JSON data/text or throw `Error` with an `Invalid save:` message; they never render, write caches, award rewards, use RNG, heal, reveal terrain or mutate their inputs/live run.

```js
// Context must be supplied by the future UI caller at the snapshot boundary.
const context = {
  createdAt: '2026-11-26T12:00:00.000Z', // caller-supplied canonical UTC ISO timestamp
  hidden: document.hidden,
  tradeOpen: !document.getElementById('tradeOverlay').hidden,
  companionOpen: !document.getElementById('companionOverlay').hidden,
};
const dto = captureSaveData(state, context); // detached explicit envelope
const json = serializeSaveData(state, context); // capture + validated JSON text
const checked = parseSaveData(json); // bounded text -> validated detached DTO
const checkedCopy = validateSaveData(dto); // same schema, detached result
// These functions do not load checked into the game.
```

Snapshot eligibility permits stable visible living town/dungeon play and its own Help host. Console, god mode, player dialogs, trade/picker state or visible overlays, death and unfinished boss/ending scenes are refused. Input parsing is independent of the current run; S2 uses separate live load-eligibility/session checks, and S3 binds its reader and preview callbacks to those sessions. Context booleans are mandatory caller observations, not inferred from a global DOM inside the pure layer.

Envelope fields are `format: 'dungeon-crawler-save'`, `formatVersion: 1`, `gameVersion`, `createdAt`, and `run`. Schema version is independent of the release. Unsupported format versions, unknown fields/identities, inconsistent flags, malformed values and dangerous keys reject; there is no implicit migration, coercion, repair or truncation. Items retain validated ITEM_TABLE fields/modifiers and optional scoped ID/coordinates; companions use only registry ID and exact logical x/y. Sets become ordered unique coordinate arrays. Current FLOOR_FIELDS overlay stale cached fields in a detached floor; `descentRewarded` is retained separately. Current encounter rows/order/HP/deadlines, including negative corpses and summoned guards, remain separate from templates. XP uses the actual rounded recurrence through levels 83–99 despite exceeding safe-integer range; level 100 requires xp=0/xpNext=1. Hero/gear values are preserved without deriving HP from equipment.

DTO alias rules implemented by S2: link active map/visited/world fields to the decoded active floor or town; reconstruct Sets; link encounter boss by `bossId`. Store appears once as `run.town.store` (landmarks intentionally omit a second store copy). Link `town.landmarks.store` and the active town merchant to that object. `run.town.landmarks.companionBoardIndex` references the single board prop; inn/gate remain landmark records. Town saves keep the last dungeon depth. Preserve return reason scroll/retreat/cheat even when the saved tile is blocked or an open portal coexists with a different debug dungeon floor. Restore static companion attributes from COMPANIONS without activation/placement/resetting deadlines.

Limits: 32 MiB UTF-8 on input/output (including input whitespace), 16 container levels, 4,000,000 values/containers, 100 maps of 64×96, and the S0 per-category bounds. Encounter and inventory each allow at most 65,536 rows; dead rows count. Journal is at most 80 entries of 512 UTF-16 units. Preflight is iterative with bounded work stacks and rejects sparse/extended arrays, accessors, custom prototypes, non-JSON/nonfinite values, cycles and prototype-sensitive keys before stringify. `parseSaveData` accepts JSON text; callers of the object API must supply ordinary data, not executable proxies. S3 checks File.size before creating/starting a reader. Over-limit histories refuse clearly without changing or pruning the adventure.

The two final 100-floor/full-exploration DTOs measure ~7.99 MiB (~8.55 MiB with 10,000 potions), not an absolute lifetime maximum. Measured Node capture/validation is ~2.2 seconds and parse plus validation ~2.5 seconds for these large fixtures; raw stringify alone is ~12 ms. Those are historical synchronous Node measurements, not UI timings. S4 verifies actual two-profile/two-path files and cooperative browser performance below. Native Math.random state is not serialized and future random events are not promised identical. **GR-09 native background-tab/minimize remains unverified.**

### Detached hydration and atomic loading (S2)

[S2 implementation, regressions and browser rollback evidence](docs/reviews/2026-11-26-s2-save-load/README.md). `hydrateSaveData(dto)` revalidates and returns a detached, complete runtime candidate. It reconstructs all Sets, active floor/town aliases, one town store/board and current boss reference; companions derive static attributes from the registry at their exact saved positions. No generation, placement, equipment actions, reveal, healing, rewards, RNG, DOM or receiving resources are involved. Candidate audio/art are null and lastTick is zero until live commit.

```js
const dto = parseSaveData(json); // S1: detached validated data
const candidate = hydrateSaveData(dto); // optional pure model work; does not load
const session = beginSaveLoad(); // null if currently blocked; freezes play
if (session) {
  try {
    // In S3 this call belongs only to explicit Load, bound to this exact session.
    const loaded = commitSaveLoad(session, dto); // true on success; false if stale/blocked
  } catch (error) {
    // Show failure in the Load UI, not in the adventure journal.
  } finally {
    cancelSaveLoad(session); // safe even after consumption or a newer session
  }
}
```

S3 begins the session **before** asynchronous file reading/preview, not after it; the example's json is already available. Keep the exact token in reader/confirmation/cancel closures. Use `saveLoadSessionCurrent(session)` before accepting a late result; `commitSaveLoad` checks again before/after hydration and after presentation preparation. Pass the DTO to commit (it revalidates and builds its own candidate), never assign a caller-mutable candidate to state.

Load is allowed from launch, stable living play (including god mode) and ordinary death, with own Help allowed. Hidden, health/retreat, console, shop/picker state or visible overlays, boss cinematics, ending/won are blocked. `state.loadSession` is the new transient field (83 initialized state keys: S0's82 plus this session); it never enters the DTO/floor/town. It binds owner state, active map/area/depth and launch/death flags. New session replaces the old identity. Cancel, R/newGame, forced floor/town/debug travel, death, ending and closing Help invalidate it. Hidden/changed/conflicting context rejects commit without replacing the run; cancel/resume remains available. World simulation/motion/town AI and player actions/launch choices freeze, while audio controls remain usable; R restarts and Esc cancels. Help retains its normal Tab behavior. S3 adds the FileReader/chooser lifecycle and dialog described below.

Successful commit consumes the token before a single synchronous state swap, reuses receiving audio/context/preferences and art cache identities, creates fresh motion/UI/console/god state, hides launch branding and stale overlays, redraws HUD/minimap/journal without adding messages, focuses the canvas and resets lastTick after painting. Saved active-time/hazard/cooldown/warning/recovery values remain exact. `render(true)` skips progression checks on this first paint, and render/checkHealth also avoid changing warning latches during a pending load. Later normal gameplay retains the existing health/revisit rules.

Malformed data/hydration/allocation or presentation-preparation errors leave old state, focus and session retryable. If candidate presentation fails after the swap, rollback restores the exact previous state object and existing DOM properties/canvas pixels/Help/focus, consumes the failed session, resets only wall-clock timing and resumes old visual scheduling. It does not call normal render to recover (which could heal/change flags or throw again). Start a fresh session to retry after this kind of failure. S3 integrates its controls with this presentation rollback and releases old DTO/session references on close. Stale motion/intro/defeat/ending callbacks remain identity-rejected; old scheduled frame IDs are canceled on success.

Loaded encounters retain damage/dead rows and deadlines; later travel still recreates ordinary monsters from templates and never respawns defeated bosses. Repeated loads do not stack ring HP, duplicate rewards or consume/refund scrolls. Native RNG sequence restoration is not promised. S3 verifies basic real files and its UI below; S4 extends portability and performance acceptance. Native OS chooser cancellation, physical mobile/other-browser compatibility and native GR-09 remain unverified. Market changes require their own request.

### Portable file controls (S3)

[S3 tests, native file API checks and UI screenshots](docs/reviews/2026-11-26-s3-file-ui/README.md). In Help, **Save game** captures a stable living run and requests a timestamped `.json` download. It uses the S1 size-bounded serializer, Blob and an attached temporary download link; feedback says “Download requested,” never that a file reached disk. Failure leaves the run unchanged. The link is removed and its object URL is revoked after 30 seconds (immediately on failure); delayed cleanup only revokes that exact URL and cannot write to another run. Export resets wall-clock/frame timestamps so serialization time earns no active-time credit.

**Load game / Load adventure** opens a fixed modal before choosing/reading a file and obtains an S2 session immediately. Its Cancel remains visible, Tab/Shift+Tab stay inside, Esc cancels, R restarts and M/sound remains usable. The underlying launch/game/Help surfaces become inert; cancellation restores their prior flags and the enabled origin control's focus. Save/Load eligibility is reflected in the entry controls. No browser-reserved save/load hotkey is added.

The native file input is created fresh per dialog, with callbacks bound to that exact S2 session/input. File extension/MIME is only a chooser hint. Size is checked before FileReader creation/readAsText; the parser independently checks UTF-8 bytes/schema. Each selection clears old data, aborts/replaces an active reader and invalidates queued work; resetting the input permits choosing the same file again. Reader errors, invalid/future files and oversize get plain feedback without journal/game changes. Native input `cancel` resets to a choice prompt with explicit Cancel/Esc available; browsers without that event retain the visible Cancel route. No focus-return timeout guesses whether the user picked a file.

`session.ui` owns focus/inert snapshots, the input/reader/read identity, one queued task, validated DTO, phase and message. Phases are choose, reading, ready, loading or error. A ready preview shows location, hero level/HP/MP/gold, time and game version as textContent. Reading and preview never load. Only an explicit **Load adventure** queues a guarded S2 commit. S4 makes large validation/hydration cooperative, with the same strict validators as the synchronous APIs; see below. Replacing a file, Cancel, restart/travel/death/new session makes late callbacks no-ops. Pure read/validation results may finish while hidden; confirmation stays disabled and checks visible/current eligibility again before committing. A confirmation that becomes blocked returns to a ready prompt, without auto-loading on visibility return.

`saveGameFile()`, `openLoadGame()`, `readSaveGameFile(session,input,file)` and `confirmSaveGameLoad(session)` are transport/controller helpers; confirmation's true return means queued, not committed. S1/S2 APIs still enforce data and atomicity. On success the UI releases its reader/data/input and leaves the candidate's active presentation/focus intact. Parse/read errors remain reversible inside the modal. Commit-paint failure uses S2 rollback, closes/releases the consumed modal, restores its underlying origin and shows error feedback there; a fresh Load retries. Rollback skips assignment of nonempty file-input values, which browsers prohibit. No new top-level state field, save schema/version or script order was introduced.

Actual file:// Chrome at desktop1440×1000 and touch-emulated390×844 verifies downloads, native FileReader, invalid/oversize/same-file paths, preview/Cancel/explicit load, town and damaged dungeon encounter round trips, basic download→reload→load from launch and death, focus/audio and live-tick freeze, and late native reader completion after a staged start delay plus R. No remote requests or browser errors. Cancel-event dispatch and delayed-start tests are controlled fixtures, not native OS chooser-cancel observation. S4 closes the tested profile/path/gameplay-file matrix and measured responsiveness below. Physical mobile/other-browser compatibility, manual OS chooser cancellation and native GR-09 remain unverified. Player README/guide and dated save/load screenshots now describe the working controls; published release 2.0.0 predates this unreleased work.

### Large-file scheduling and S4 acceptance

Large reads use cooperative `parseSaveDataSteps`; large confirmed loads use `hydrateSaveDataSteps`. Both share the strict generator validators drained by the synchronous model APIs. Preflight yields every 4,096 traversal iterations, UTF-8/depth scanning every 65,536 characters, typed checks between floors/inventory/monster batches and Set hydration between floors. `advanceSaveWork` runs at most 32 yielded steps or roughly 8 ms before a new timer task. Native JSON parse/stringify, a floor check and presentation paint remain indivisible: this is measured responsiveness, not an 8 ms hard ceiling. Small reads (≤65,536 characters) and small source histories retain a synchronous path.

Large export (more than two floors, 256 inventory rows or 256 current monster rows) projects the explicit DTO at the logical boundary, then freezes the owner using the existing load session before yielding. **Cancel save (Esc)** is visible in Help. `session.work` owns iterator/timer/callbacks; cancel/reselection/restart/lifecycle invalidation clears them and stale callbacks recheck identity. There is no new top-level state key, worker, module, storage or dependency. `projectSaveData` is internal and may alias source arrays until validation detaches them: never expose it as a detached snapshot API or unfreeze the source mid-export.

Only validated internal hydration calls the private `commitHydratedSaveLoad` atomic boundary; public callers still pass DTOs to `commitSaveLoad`. The private candidate stays inside the session-owned pipeline until the final visible/current check. Failed schema validation leaves the old run and reversible error modal; a post-swap paint failure retains S2 rollback behavior. Loading never replays gameplay/rewards/RNG or overwrites receiving audio/art preferences.

[S4 acceptance](docs/reviews/2026-11-26-s4-acceptance/README.md): twelve actual JSON cases round-trip bidirectionally across two fresh persistent Chrome profiles and original/copied `file://` paths (spaces included), with browser storage methods made to throw and zero HTTP requests/errors. Covers town, damaged encounter/corpse, portal/retreat/fallback return, collected items/key/rescue/stock, 200 dead guards, final boss/princess and levels83/99/100. Fully explored 100-floor fixture is 8,960,545 bytes with10,000 potions. A whitespace-padded valid input tests the exact33,554,432-byte boundary; this is not an absolute gameplay-history maximum. Unit regression also accepts65,536 potions and rejects65,537 without pruning.

For the 8.55 MiB fixture, desktop preview/commit/export take563/542/537 ms, maximum20 ms-heartbeat gaps50/33/33 ms; at4× CPU slowdown with390×844 touch viewport,1907/1718/1712 ms with94/84/94 ms gaps. Before the fix, throttled gaps were1273/1166/1121 ms. The exact32 MiB padded input previews in2239 ms at4× with106 ms maximum gap. Chunking trades throughput for cancellation opportunities; native operations still produce50–100 ms long tasks on the constrained profile. Measured native UI cancellation is15–95 ms in these samples, with no late commit/download. Hardware/emulation/runner details are in the report; physical mobile, other browsers and OS-level chooser-cancel were not manually observed. **Native GR-09 background-tab/minimize remains unverified.**

## Developer console

Use **~ / `** to open the console; it pauses play. Type a command and press Enter; Esc closes it. Command names are case-insensitive. Startup hints and `help` list the commands. These testing commands stay out of player README/Help.

| Command | Effect |
| --- | --- |
| `loadLevel <1-100>` | Generate a fresh floor with its boss and refill HP/MP; this intentionally recreates that floor for testing. |
| `godMode 0\|1` | Toggle frozen hero stats and one-hit player attacks; monsters remain mutable. |
| `teleportTown` | Open a free debug return portal from the dungeon. Takes no arguments; preserve the exact saved floor/tile, scroll count, HP/MP and retreat cooldown. Refuse if already in town or another portal is open. |
| `addScrolls <count>` | Add Town Scrolls in town or dungeon, without gold cost, healing, travel or portal changes. Requires exactly one positive decimal integer. |
| `goldADD <amount>` | Add gold in town or dungeon. Exactly one positive ASCII decimal integer; no spending, healing, items or travel. |
| `help` / `clear` | Show commands / clear console output. |

For `addScrolls`, use ASCII digits only: `addScrolls 3` is valid; leading zeros are interpreted as decimal (`0003` adds 3). Zero, negative/signed values, fractions, exponent/hex/binary notation, separators, missing values and extra tokens are rejected. Both the count and resulting total must be safe integers, at most `9007199254740991` (`Number.MAX_SAFE_INTEGER`). Invalid input, overflow or an invalid current count leaves inventory/world state unchanged and prints usage. A successful command updates the count, HUD and spell list once; an already-open portal retains its existing return point and “Portal ready” label.

`teleportTown`, `addScrolls` and `goldADD` require a started, living, visible run with no Help, health/retreat pause, boss intro/defeat, ending or player shop/companion menu. The developer console itself is allowed; both grant commands also work with god mode. Blocked commands leave inventory/world state unchanged and report that they cannot run now. Closing the console resumes normal play.

For `goldADD`, `goldADD 250` adds exactly 250; `GOLDADD 0003` adds 3. It accepts the same strict positive ASCII decimal syntax as `addScrolls`, with exactly one argument. The amount, existing nonnegative gold and resulting total must all be safe integers (maximum `9007199254740991`). Invalid input, overflow or invalid current gold prints usage without clamping or repairing state. A blocked context reports “Cannot add gold now.” Success updates gold/HUD once and reports the amount and total in the console; it does not write the adventure log, play audio, consume RNG, or change HP/MP, gear, inventory, spells, stock, floors, portals or cooldowns. An open developer console and god mode are allowed; pending shop/companion menus are blocked. [G1 implementation and acceptance evidence](docs/reviews/2026-11-26-g1-goldadd/README.md).

Example: open the console, run `loadLevel 2`, `addScrolls 3`, then `teleportTown`. Close it and press J to return through the saved portal; Space at the town gate also returns. Debug travel consumes no scroll. A normal J cast in the dungeon still consumes one Town Scroll. Debug commands do not change the single-return-point rule or clear the existing retreat cooldown.

Implementation evidence: [T1 debug portal](docs/reviews/2026-11-26-t1-debug-portal/README.md) and [T2 scroll command](docs/reviews/2026-11-26-t2-add-scrolls/README.md). Their historical six-failure baseline is resolved by [C1 companion corrections](docs/reviews/2026-11-26-c1-companions/README.md); the native GR-09 check remains unverified.

## Market draft core (M1)

M1 implements the pure economy/cart model; M2 now wires it into the player market UI and confirmed commits described below. [M1 evidence](docs/reviews/2026-11-26-m1-market/README.md) · [canonical design](docs/plans/2026-11-26-market-transactions-design.md). M2 replaces the live-mutation prototype and immediate-buy/sell-all paths. Preview and cancellation now discard detached data; they never reverse live equipment/spell operations.

`createTradeDraft(source, merchant)` reads only explicit affected values and returns a deeply frozen cart `{ original, draft, rules, history }`. It copies gold, stored potions/scrolls, equipment, scoped hero fields/spells/readiness and this merchant's stock, with no live merchant/map/floor/DOM references. The hero snapshot includes `GOD_STAT_FIELDS` for exact god-mode preview; unsafe-integer XP/threshold values at high levels remain finite numbers, not rounded/repaired. It does not copy position, journal, progression history, portal, companion or resources. Rules capture remembered `source.depth` (including town), active time and a detached god-mode stat snapshot. Actual modal context/identity/staleness checks belong to M2.

```js
const cart = createTradeDraft(source, merchant);
const staged = stageTradeAction(cart, { type: 'buy', rowId: 'stock:1' });
const withSale = stageTradeAction(staged, { type: 'sell', slot: 'ring' });
const undone = undoTradeAction(withSale);
const reset = resetTradeDraft(undone);
// No live commit API in M1. Discarding these values has no gameplay effects.
```

Each cloned stock row has `{ rowId: 'stock:<opening index>', item }`. IDs are session-local and stay stable after removal/Undo; duplicate merchant IDs/names stay separate. Never write these IDs to saved stock or treat them as cross-session identity. `draft.operations` contains only accepted, retained buys/sales (item, row/slot, captured price and replaced equipment for buys). `history` retains prior immutable drafts. Undo restores exact prior HP/stock/spells/currency/operation journal; Reset returns the same immutable opening values and clears all operations/history. No empty/rejected action enters history; validation errors throw `Invalid trade: ...`, leaving the supplied cart unchanged. M1 never emits game logs/audio/bubbles, saves, consumes RNG, paints or writes `state.trade`.

`applyTradeAction(draft, action, rules)` returns a new frozen draft. Buy accepts an available row, checks known spells and affordability before payment, and applies the item's current effect. Sell accepts just an equipped weapon/armor/ring slot; no backpack sales, restocking or buyback. Provisional sale proceeds can fund a later purchase. Potions stay stored; scrolls increment the count; tomes learn in the draft and become ready at captured active time. Elixir refunds its base `item.gold` after payment, preserving the actual existing behavior; it adds no strength/dexterity. Replacement discards old gear without sale proceeds; the operation retains the old item for M2's replacement warning. Buy then sell is two retained operations; undone actions must produce no eventual notices.

Shared helpers: `buyPrice(item, depth)` uses `round(gold*(1.5+max(0,depth-1)*.03))`, `sellPrice(item)` uses `round(gold*.5)`; legacy price wrappers delegate. `equipmentBonusFor`, `equipmentStatsFor` and `equipmentTransition` accept explicit inputs; live `equipmentBonus`, effective-stat helpers and `equipItem` delegate while keeping equipment object/item identities and the existing `freezePlayerStats()` call. `equipDraft` applies the same HP delta/clipping and then captured god-mode fields, preserving path-dependent HP. A same-bonus ring replacement does not heal; removing at75/80 clips to60/60, buying again yields80/80, and Undo restores the exact preceding values. This cannot be reconstructed from only the final gear diff.

`learnSpellState` returns a pure spells/readiness transition (or null for unknown/already-known); live `learnSpell` keeps its existing in-place field updates and one learning log. Currency/counts, item bonuses and derived stats reject negative/nonfinite/unsafe values and overflow; the source must contain ordinary game records. This is not a replacement for S1's untrusted-file schema/parser.

**M2 implemented:** the controller below binds this model to the shop UI and confirmed commits. M3 completes the tested lifecycle/mobile/recovery matrix below. Player controls and item-effect text now match the playable cart. **Native GR-09 background-tab/minimize remains unverified.**

## Market UI and confirmed commits (M2)

[M2 audit, regressions, browser results and screenshots](docs/reviews/2026-11-26-m2-market/README.md). Space opens Buy; X opens Sell. `buyFromMerchant()` and `sellToMerchant()` are entry wrappers only: **no immediate first-item or sell-all fallback**, including in the no-DOM harness. `tradeMerchant()` is the shared resolver for opening/staging/confirmation: town Store accepts `nearbyTile` at the current persistent Store/map, dungeon merchants require the exact tile. `tradeAccessAllowed` excludes launch/death/hidden/pauses/Help/console/other player menus/cinematics/load sessions.

`state.trade` is an identity-bound transient session: owner state, area/depth/map/merchant identity, immutable opening/rules, current M1 cart, selected Buy row/Sell slot, mode, status and prior focus/inert flags. No new top-level state key or v1 save field. Row and static-control callbacks capture the opening session, so old Select/Add/Confirm/Cancel cannot target a later shop. `tradeSessionCurrent` guards action eligibility; Confirm additionally compares freshly captured affected values/rules against the opening snapshot. Stale context or source values invalidate the cart and require Cancel/reopen, preserving newer progress. Hidden confirmation retains the draft and requires a later explicit action; visibility does not auto-confirm.

The fixed modal has independent Buy/Sell scroll lists, prepared-art icons, ordinary selected-state buttons, item effects/replacement warnings, accepted order list and projected gold/HP/STR/ATK/DEF/DEX/potion/scroll totals. Text uses `textContent`. Known/unaffordable/pending stock rows stay visible with explanations and are disabled. Row click/native Enter selects only; **Add purchase / Buy & equip** or B stages a buy, **Add sale** or S stages a selected-slot sale. U undoes, Shift+U resets, arrows/Home/End navigate the current list; Tab/Shift+Tab stay within enabled controls. Confirm is an explicit button, never a global Enter shortcut. Close/Cancel/Esc discard; M/audio remain usable, R restarts and ?/~ cannot stack another modal. Footer controls remain reachable on mobile; touch targets are at least44px in measured profiles.

`confirmTrade(session)` revalidates identity/location/source and replays the retained operation journal through the M1 reducer. The replay must exactly equal the proposed final draft, rejecting tampered prices/results/stock/spells. Empty Confirm closes without trade notices. Nonempty application sets a reentry guard, applies changed equipment through `equipItem`, assigns final scoped currency/inventory/scroll/spell/readiness/stock and path-correct HP/maxHP once, calls `freezePlayerStats`, then `saveTown` or `saveFloor` and a presentation-only paint. No preview or prevalidation log/sound/save call. Gear replacement has no automatic resale; elixir keeps its actual gold refund.

Before application it captures affected live values/references, equipment slots and shallow active floor/town cache records. Equipment/save/paint exceptions restore those scoped values and cache aliases before any trade notices, leave a safe error dialog and require reopen. It does not clone the world/art or replay gameplay to undo. On success the session is consumed before emitting one purchase/sale cue per retained operation and learned-spell text where appropriate. Buy→sell remains two retained notices; undone actions emit none. A companion merchant remark is requested only when confirmed purchases empty previously nonempty stock. Final bubble/journal/UI updates occur after application; duplicate Confirm is a no-op.

`dismissTrade(session,resume)` performs discard/focus/inert/clock cleanup without inverse transactions or cancellation notices. It runs before restart, floor/town transitions, death and ending; the existing simulation guards freeze all timed gameplay/motion while the session is open. Cancel uses presentation-only rendering so it cannot change HP/warning latches. No new timer implements a pause. The M2 browser matrix covers native keyboard/pointer/touch selection/Undo/Reset/Cancel/Confirm,520ms live-tick freeze, focus/audio, reopen and stock/spell persistence across town/dungeon revisits. M3 completes the recorded lifecycle/portal/companion/performance/recovery matrix below; touch emulation is not physical-mobile coverage. **Native GR-09 background-tab/minimize remains unverified.**

## Market integration and recovery (M3)

[M3 acceptance matrix, regressions, performance and screenshots](docs/reviews/2026-11-26-m3-market/README.md). M1–M3 are complete within the recorded Chrome/Node scope. No new state keys, v1 file schema, stock/economy/balance, artwork, script order or runtime dependency. The player guide corrects the old Elixir stat-boost claim to its actual gold effect; no balance change implements that wording.

The audit found that document key routing and timed simulation guards stopped normal input, but direct movement/combat/rescue/Inn/stair/portal/town-chatter helpers could still mutate a live cart's source. These user/attack entry helpers now independently reject while `state.trade` exists. The intentionally forceable `enterFloor`, `enterTown`, `enterDungeonFromTown`, `loadLevel`, death/ending and restart still discard the cart before transitions. Internal raw model/debug primitives are not converted into player actions. Existing timed guards cover hazards, AI, healing/mana, companion attacks, patrol/chatter, active-time cooldowns and motion. Modal exclusion and Help's underlying health/retreat restoration remain intact.

`resumeAfterTrade(session)` performs best-effort presentation/focus recovery and resets wall/motion/cinematic clocks **after** closing paint and focus work. Menu, serialization and slow-paint time cannot become active gameplay time. Failed opening render discards its partial modal ownership/inert state and permits retry; closing paint failure cannot strand focus inside hidden controls. Backdrop callbacks now capture their opening session and are released with the other controls, so an old backdrop cannot cancel a newer shop.

While a synchronous Confirm application is in progress, `session.rollback` owns the scoped prior values/cache references. It clears itself before restoring. Forced teardown invokes it **before** switching floor/run; application/save/paint identity checks stop any remaining old commit work. A helper that triggers restart/travel cannot carry purchased gear/spells/currency into that newer context or emit stale purchase notices there. Normal helper failure restores the originating run and leaves the safe Cancel/reopen route; success clears rollback before consuming the session. Optional audio failure after a successful application cannot turn it into an error or duplicate the trade.

Eleven new regression groups include direct-helper freeze,120-second/slow-paint clock isolation, failed open/close retry, modal/health/retreat/load exclusions, scroll/debug/retreat return preservation, all11 companions, save/hydrate plus god-mode behavior, forced debug/death/restart/ending cleanup, reentrant equipment/save/paint transition rollback, stale backdrop and unavailable audio. Five groups fail on pre-M3; six extend acceptance for already-correct integration. 307 full game /87 focused market+companion+save /27 preview pass;24 seeded before/after model/effective-stat/RNG comparisons include cancelled and confirmed shopping.

Native file:// browser checks cover the M2 town/dungeon keyboard/click/tap flow and M3 recovery at1440×1000,390×844,320×568 and844×390, including reachable footer controls, disabled-row focus fallback, injected opening/save errors, controlled hidden retention, portal/companion/cooldown preservation, health-Help restoration and restart. No errors/HTTP. Injected visibility is explicitly a fixture, not native background/minimize acceptance. **Native GR-09 remains unverified.** Physical mobile/other browser engines and S4's manual OS chooser-cancel limits remain unverified.

Single-sample browser performance for10,000/65,536 stored potions is recorded before/after. Final desktop open6.4/12.2ms, Confirm9.0/32.3ms;4× CPU touch-emulated open23.3/47.0ms, Confirm35.0/131.5ms. Worst observed heartbeat gap140.5ms at the largest throttled case; typical inventory case50ms. Operations remain synchronous and bounded by actual contents: no frame-time, hardware-wide or unbounded-history guarantee. One new potion beyond the save-format65,536 limit remains valid live inventory; S1 refuses an over-limit export explicitly without truncation, as designed. No inventory cap or async trading architecture was added merely to improve these measurements.

## Companion picker

Choose Marmalade or Pip on launch; arrows change/focus the card without starting, Enter/Space starts. Space beside the selected starter recruits it; first descent still auto-recruits if needed. The wood companion post near the Inn supports Space or its nearby **Companions** button, including touch input. The fixed picker shows active/unlocked/locked entries; Tab stays inside, Up/Down/Home/End move focus, and native Enter/Space or click/tap selects. Cancel/Esc and Keep preserve the actor and attack/speech readiness. M or the dialog sound button toggles audio; R restarts without launch branding.

`state.companionPicker` is a transient identity-bound session containing town/map/post identity, prior focus and inert flags. Row handlers capture their opening session and call `selectCompanion(id, session)`; a missing, closed, stale, distant or ineligible session cannot select. Open/close reset existing clocks and restore focus/inert state; forced travel/loadLevel/reset/death dismiss before context switches. No picker data enters floor/town saves. `companionPostTile` validates reachability and avoids actors/patrol tiles and other interaction landmarks; `drawCompanionPost` paints directly without a missing sprite or art bake.

[C2 verification and screenshots](docs/reviews/2026-11-26-c2-picker/README.md) covers desktop and touch-emulated mobile interactions. [C3 integration audit](docs/reviews/2026-11-26-c3-integration/README.md) is complete; M1–M3 market core, confirmed commits and tested integration/recovery are complete above. Native GR-09 visibility verification remains unverified.

C3 uses `simulationBlocked()` for timed companion/hazard/recovery/mana/active-time and motion paths. `enemyTick` rechecks it immediately after a companion attack, so starting a boss-defeat scene cannot leave surviving monsters an extra action in that tick. Forced travel and health-dialog actions keep their own eligibility rules.
