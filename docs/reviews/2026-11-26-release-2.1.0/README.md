# Release 2.1.0 — alpha

2026-11-26. User explicitly authorized release 2.1.0 and deferred remaining acceptance to alpha testing. This supersedes the earlier no-commit/no-publishing instruction for this delivery. **Native GR-09 remains UNVERIFIED.** Deferred checks remain open; publication is not represented as their passing result.

Tag: `2.1.0`. GitHub delivery: **prerelease**, labelled alpha; runtime version remains exactly `2.1.0`. [Release page](https://github.com/VAdamec/dungeon-crawler-inkling-2-mini/releases/tag/2.1.0) · [release notes](release-notes.md) · [alpha checklist](../2026-11-26-release-readiness/manual-acceptance.md).

## Included work

Current companion selection/post/cinematic corrections, hardened developer travel/scroll commands, `goldADD`, manual portable Save/Load with cancellable large-file processing, selected market Buy/Sell cart and confirmed atomic/recovery integration. Includes current player/developer docs, plans, regressions and dated acceptance evidence. The user-corrected credits/provenance text is preserved. No new artwork or balance change in the release preparation.

The sole runtime change since the acceptance snapshot is `GAME_VERSION` from 2.0.0 to 2.1.0. Launch and exported save metadata use that constant; save schema stays version 1. [Protected-file scope/hashes](file-checks.json) establish that index/style/sprites/art payload/game tests are unchanged during release preparation, and the game source differs by that version constant only. Prior source feature changes are intentionally included in the release, not reset.

## Final versioned verification

- Fresh final **307/307 game tests** ([log](game-tests.txt)) and **27/27 prepared-source tests** ([log](preview-tests.txt)).
- All three runtime scripts pass syntax at source, copied package and relocated extraction; review runner/Python syntax pass ([checks](file-checks.json)).
- Non-writing deterministic art [bake](bake.txt), extracted offline VM [SMOKE_OK](smoke.txt).
- VM/DOM-stub launch branding `v2.1.0`, export `gameVersion: 2.1.0`, schema v1 and exact durable progress when importing/re-exporting a 2.0.0-branded v1 file: [results](version.json), [runner](check-version.cjs), [log](version.txt).
- Five-file ZIP whitelist/CRC/extraction, unchanged source/copy hashes and checksum pass. No source PNGs, docs, development tools or external runtime assets needed by the package.

Earlier [acceptance execution](../2026-11-26-acceptance-run/README.md) records actual offline Chrome/WebKit package flows, 12 bidirectional fresh-profile/copied-folder save cases and staged 100-floor mechanics. Those browser checks used the behavior-identical 2.0.0-branded pre-version snapshot; no final native/browser rerun is claimed after the file-tab URL-policy rejection. Final extracted smoke is VM-based, not an OS tab/minimize observation.

Final staging found one trailing space in an older draft plan; removed it. Archived raw test diagnostics and patch context intentionally retain their original whitespace. Source/docs whitespace validation excludes those raw `.txt`/`.patch` evidence files rather than rewriting their captured bytes. [Check scope](file-checks.json).

## Package

[Manifest](package.json) / [standard-library packager](package-release.py). Archive contains only index.html, style.css, js/art-runtime.js, js/sprites.js and js/game.js, preserving relative paths and script order.

- Asset: **dungeon-crawler-2.1.0.zip**, 4,545,098 bytes compressed / 11,957,538 bytes runtime.
- SHA-256: `c69a5ff682eb4b842d6eac0fe1e6a300d3893abd4701c8ecb0552a3fcb6af498`.
- Source fingerprint: `fc84f66c1cf5d2d034dca5a635d4a966f3506bd7c5212d32a5a06cc150962a30`.
- Companion asset: **SHA256SUMS.txt**. Packaging is deterministic for these bytes; no runtime build step.

The remote tag/release/assets are verified after publishing. This report records the reproducible inputs/evidence without embedding its own commit hash. Previous 2.0.0-branded review archives remain historical; use the 2.1.0 assets for new alpha observations.

## Alpha testing still open

- **Native GR-09 UNVERIFIED:** real background/tab/minimize freeze/resume for active gameplay/animation, boss intros/defeats, ending and pending dialogs.
- Genuine OS file-chooser Cancel/Esc/retry; physical mobile/rotation/input/file/audio behavior.
- Natural 100-floor play, balance/boss pacing, listening/audible quality and final human runtime visual acceptance.
- Corrected Firefox harness retest and remaining other-engine/native UI combinations. The earlier failed request-count assertion is retained, not relabelled as a full Firefox pass. WebKit is a test build, not Safari.app or a physical iPhone.

The browser tool rejected native file:// tab access (http/https-only policy); no workaround or synthetic visibility pass is claimed. The owner accepted moving remaining checks into alpha. Tasks/handover/checklist preserve these gaps; do not silently close them or infer authorization for another release.
