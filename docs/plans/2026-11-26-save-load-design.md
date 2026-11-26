# Save/load — portable adventure files

2026-11-26. **Current checkpoint: S0–S4 complete within the documented Chrome desktop/touch-emulated scope.** [S4 acceptance and performance](../reviews/2026-11-26-s4-acceptance/README.md). Native GR-09 remains unverified. [S3 file UI and basic native file checks](../reviews/2026-11-26-s3-file-ui/README.md). [S2 implemented core/session/rollback evidence](../reviews/2026-11-26-s2-save-load/README.md). [S1 implemented DTO/API and evidence](../reviews/2026-11-26-s1-save-data/README.md). Older proposal-only wording below records the original planning baseline. S1 alone was model-only; subsequent S2–S4 made file save/load playable and verified within their documented scope.

**User-confirmed transport: manual save/load JSON files, without browser-storage dependence.** Detailed policies below are a reviewable proposal, not implementation approval. No save/load runtime code is added by this planning task. [Tasks](2026-11-26-save-load-plan.md) · [LLM prompt](../prompts/2026-11-26-save-load-local-llm.md).

**S0 review complete:** [field/schema/alias matrix](../reviews/2026-11-26-s0-save-load/schema-matrix.md) and [audit/limits/evidence](../reviews/2026-11-26-s0-save-load/README.md) refine this design against the current C3 branch. Pure S1 is ready for a separate request. Existing224/27 C3 test counts do not verify save/load. Use the S0 limits and source-state exceptions below; no runtime implementation yet.

## Feasibility and alternatives

Browser save/load is feasible with a user-triggered Blob/download and file input/text reader, keeping ordinary `file://` play, no server/modules/build/runtime dependencies. Files can move between computers/browsers and remain independent of the game file's path.

| Approach | Advantages | Tradeoffs / decision |
| --- | --- | --- |
| Manual portable JSON files | Explicit backups, portable, no browser database dependency | User manages files; **chosen by user** |
| Browser slots + export/import | Quick local access | Extra storage/quota/cleanup handling; file-origin behavior unreliable; deferred |
| Cloud/account saves | Cross-device automatic sync | Needs service/account/network; out of scope |

`localStorage` behavior for `file:` URLs is undefined and can vary; it must not be required for the chosen design. A file reader loads the file into memory, so check its size before reading. Browser download handling varies; report a file as prepared/download requested, not as guaranteed written to disk. Sources consulted 2026-11-26: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [MDN readAsText](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsText), [MDN anchor download](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#download). Use Blob URLs and ordinary file input; no File System Access API permission flow required.

## Grounded constraints and critical distinctions

- Plain scripts load art-runtime → sprites → game. Everything works offline via `file://`.
- `FLOOR_FIELDS` are a floor cache, **not a complete game save schema**. `saveFloor()`/`saveTown()` copy references into caches and are not pure export functions. `descentRewarded` is a floor wrapper field outside `FLOOR_FIELDS`; omitting it duplicates rewards.
- Returning to a floor recreates ordinary monsters from templates. Loading a game must instead restore the saved **active encounter's actual monster positions/HP/cooldowns**. Do not call `newGame`, `genLevel`, `genTown`, `enterFloor` or `recreateMonsters` as a shortcut to load. Later travel keeps the existing respawn rules.
- `visited` is a Set. Active town/map/store/landmark and active floor references have aliases that must be rebuilt coherently; blind `JSON.stringify(state)` / `Object.assign(state, parsed)` is unsuitable.
- Equipment is already reflected in hero HP/maxHP. Reapplying a ring through `equipItem` on load can double its bonus or heal; hydrate validated hero/gear together without replaying equipment transitions.
- Companion selection/unlocks/entry/cat state are run progress: include them in an external run save despite excluding them from floor caches. R still resets them for a new run.
- Existing `Math.random` has no serializable native state. Capture current world/encounter and consume no RNG during save/load; do not promise identical future native RNG or introduce a PRNG merely for this task.
- `xpNext` exceeds Number.MAX_SAFE_INTEGER from level83 through99 under the actual rounded progression; use finite integer XP/threshold validation compatible with that recurrence. Level100 resets xp=0/xpNext=1. Do not change leveling to simplify the save schema.
- Current summons append guards only to `state.monsters`; dead rows accumulate and influence subsequent IDs. They are absent from `monsterSpawns`, even after saveFloor. Preserve current rows (including negative corpse HP) without creating new guard templates or pruning history; later travel retains existing recreation behavior.

## Proposed user flow and eligibility

- Keep player UI simple: Save game / Load game in Help; Load adventure on launch and death screen. File picker accepts JSON but file extensions/MIME never substitute for validation. Avoid browser-reserved keyboard shortcuts. No browser slots, autosave, cloud, automatic overwrite, compression or game-file modification in v1.
- Save a started living visible run at a stable simulation boundary, including between combat ticks. Reject health/retreat prompts, console, trade, companion picker (also stale visible overlays), boss intro/defeat, ending and gameOver. S0 recommends v1 disable saving while god mode is enabled; this avoids ambiguous frozen-stat/equipment restoration. Cheat-granted gold/scrolls are ordinary saved progress. This engineering policy is not a user decision or anti-cheat claim.
- Opening the game's Save/Load UI freezes simulation. Help may host the controls; explicitly validate the underlying game state rather than rejecting solely because Help/its own save dialog is open. Do not charge resources, advance clocks or RNG, heal, regenerate or commit a shop cart.
- Load from launch, a stable living run or death screen; not mid-cinematic/ending/health/retreat/trade/picker/console. User chooses a file, sees validated summary (version/depth/area/hero), then explicitly loads, replacing the current adventure. Cancel/error preserves the previous run. New adventure does not delete external save files.
- After load, resume the saved town/dungeon and living hero with initial launch branding hidden. Audio playback still follows browser user-interaction rules. No generic victory screen or cinematic is re-triggered by loading.
- Native file-dialog cancellation must not trap the game paused. Prefer an explicit in-game Cancel/Resume control and an identity-bound read session; handle browser file-input cancel where supported and same-file reselection.

## Envelope and explicit data transfer object

Proposed envelope: `format: 'dungeon-crawler-save'`, `formatVersion: 1`, `gameVersion`, `createdAt` (metadata only), `run`. Schema version is independent from release 2.0.0. Unknown future format versions are rejected clearly. No undocumented backwards migration or permissive arbitrary-field merge.

| Run category | Required saved semantics |
| --- | --- |
| Hero/progression | Validated player stats/HP/MP/level/XP/threshold/spell knowledge; gold, stored potion inventory, equipped items, scroll count, kills/turn |
| Run timing | `activeTime`, retreat deadline, spell readiness, mana/combat/healing timers and warning latches; no offline elapsed-time credit |
| Dungeon caches | All visited floors' maps/rooms/biomes/props, exploration, collected loot, stairs, merchant stock, rescue/key/obstacle/hazard state, floor-local hazard time, monster templates, boss/guard flags and `descentRewarded` |
| Active dungeon encounter | Actual remaining monsters/positions/HP/nextAttackAt/other mutable AI fields and active boss link/status, summon deadline, intro-seen state as needed for exact living resume; keep separate from templates |
| Town | Saved map/exploration/props/buildings/post, spawn/landmarks, persistent store stock, named NPC/animal positions/path indices/patrol/chatter clocks; export semantic data, not UI callbacks |
| Companion/run roster | Active registry ID and actor position; starter choice/selected ID/unlocks/entry latch/cat recruitment+retirement; attack/quote readiness and quote index; no duplicate town animal |
| Return point | Single `townExit` depth/tile/reason and `townPortalOpen`; preserve normal scroll/retreat/debug reasons and cooldown without refund or duplication |
| Journal/quote counters | Optional bounded plain-text last 80 messages; deterministic quote counters preserved where meaningful; no HTML |

The S0 matrix inventories all 82 actual state fields and aliases, including mutable monster AI and town clocks; consult it rather than guessing omitted keys. Export the active world's current values into the DTO even when an old cache entry is stale; do it without mutating live aliases. Copy Sets to bounded coordinate arrays; never sort live gameplay arrays. Preserve town's last dungeon depth and canonical store/landmark/board references. No embedded PNG/art payload.

Exclude: `state.art`/canvases, AudioContext/nodes, DOM/focus/inert state, event callbacks, rAF IDs/timestamps, `lastTick`, motion/interpolation/projectile visuals, Help/console/history, trade/cart/picker/read-session state, transient NPC/monster/companion bubbles, in-progress intro/defeat/ending objects, dev godMode/snapshot. Fresh UI/motion/cinematics are rebuilt. Preserve the receiving browser's audio preferences/context; never serialize them as objects.

## Validation before mutation

Read size before allocating text. S0 retains **32 MiB** after two 100-floor full-exploration/content-retention projections measured ~7.99 MiB (~8.55 MiB with 10,000 extra stored potions). Use the [selected byte/depth/node/count/text limits](../reviews/2026-11-26-s0-save-load/README.md#size-evidence-and-bounded-format-policy). No unbounded arrays, dimensions, recursion or per-frame import work. Reject oversized content before text read. Guard corpses/debug regeneration mean there is no absolute lifetime maximum: over-limit export must refuse clearly without truncating or mutating progress. S1 must measure the final DTO; S4 must verify actual browser files and responsiveness.

Validate JSON/envelope/version and reject dangerous property names (`__proto__`, `prototype`, `constructor`) and executable/URL payloads outside the semantic schema with a bounded iterative walk. Use explicit allowlists and known IDs, not dynamic function names/eval or arbitrary assignment. Validate safe resource counts/IDs/currency, finite XP/thresholds compatible with the high-level recurrence, finite fractional clocks/heal values, living hero HP/MP ranges, level <=100, exact 96×64 maps with 0/1/2 values, depth1–100, bounded coordinates/scoped unique IDs, known roles/items/spells/companions and cross-field consistency. Preserve negative corpse HP. Enforce actual S0 limits rather than broad bans on decorated/occupied tiles or duplicate coordinates across unrelated categories.

Cross-check portal/exits and saved floors, floor keys/drop/carrier/collection, boss defeat/rescue/final-floor gates, guard cleanup, one active companion/unlocked selection and starter hidden state. Avoid duplicate rewards/loot/learned spells/ring bonuses. Do not silently regenerate, replace unknown data, drop malformed floors, clamp values or partially load a file.

Return reasons are scroll/retreat/**cheat**. Return tiles may be blocked (safeTownExitTile handles fallback); an open portal may persist while debugging another dungeon floor. Do not demand area=town or exit.depth=current depth. Actor IDs are scoped to their floor/encounter/category; corpse/town patrol/companion coordinates follow the real branch, not universal uniqueness/adjacency rules. Do not infer derived level→maxHP consistency or repair existing market cancellation leaks during load.

A living saved finale may have the final dragon defeated with princess rescue pending; it must not replay rewards. A rescued final princess with no completed/ending state is not a valid v1 living snapshot. Dead/ending snapshots are not exported under the proposed eligibility rule, but a prior valid save can be loaded after death.

## Atomic hydration and lifecycle

1. Bind file reading/preview to an identity-bound UI session and current run. Check file size, parse and validate into a detached DTO. On errors/cancel retain old semantic state, focus and underlying dialog; never call `newGame` during validation.
2. Build a candidate in memory: new Sets, canonical floors/town/store/map references, validated hero/gear, current encounter and boss reference, companion/roster/clocks. Reuse only the receiving browser's disposable art/audio resources; do not call action helpers that emit rewards, heal, reposition valid actors or reset readiness.
3. On explicit Load, recheck session/run identity and invalidate before commit. Cancel existing identity-bound motion/cinematic callbacks, swap only the complete candidate, initialize fresh transient UI/console/motion, set `lastTick=Date.now()` and reset frame timestamps. Keep saved active-time deadlines and floor hazard clocks. Establish focus/HUD/minimap with launch hidden and no stale overlays.
4. `state.map` / visited / merchant must alias the correct active floor or town objects. Reconnect boss reference to the restored live monster (or null when defeated). Keep the active encounter as saved; leave future revisit recreation unchanged.
5. Stale reads/events after R, travel, another load, death or session cancellation cannot replace the new run. Loading consumes no RNG and emits no combat/level/reward/merchant milestones. No wall-clock catch-up.

No promise to reconstruct midway projectiles or unfinished cinematics: v1 saves exclude those transient visuals and cinematic save points. Active monster state/HP still resumes exactly; visual effects may finish/clear as defined and documented, without new damage.

## Acceptance

- Real downloaded file can be imported after reload, from launch/death and another browser/profile/game-file path; no storage API or server needed. Portable-data test and actual file:// export/import required, not just a mocked round trip.
- Town/dungeon round trips preserve hero/ring HP and spells/inventory; collected loot/stock/rescues/keys; current damaged monsters; defeated bosses/guard templates/descent rewards; companion+retirement/unlocks+readiness; portal return/cooldown and hazard phases. Later revisits still respawn ordinary monsters as before.
- Invalid/corrupt/truncated/future/oversized/unknown-ID/polluted/nonfinite/out-of-bounds/inconsistent files and cancelled/stale async reads are atomic no-ops. Same file can be selected twice.
- Large valid 100-floor fixture fits bounded validation and UI remains responsive; no art payload/RNG/audio/DOM serialization. Load repeats never multiply a ring bonus or reward.
- Desktop and touch-emulated mobile file input/download controls, focus, pause/resume, errors and exact return tested with no remote requests. Keep native GR-09 observation **unverified** unless truly observed; no cloud/security/anti-cheat promise for editable local files.
