# Dungeon Crawler 2.1.0 — alpha

Released for alpha testing. The remaining manual/platform checks are deferred to alpha testing by the project owner; they have not been marked passed.

- Choose a starting companion and switch between unlocked companions at the town post.
- Save and load portable JSON files from Help or the launch/death screen, with a preview, explicit Load and cancellable preparation. No browser storage or autosave required.
- Select purchases and equipped-item sales in the market cart. Review projected stats, Undo/Reset, then Confirm; Cancel/Esc discards the cart.
- Improved companion/cinematic handling, travel/debug commands, market recovery and large-save responsiveness. Added developer command `goldADD <amount>`.

Download **dungeon-crawler-2.1.0.zip**, extract it, and open **index.html**. The archive contains all five required runtime files. No installation, server, build step or internet connection is needed to play. Keep the JSON files downloaded by Save game to continue your adventures.

## Verification and alpha follow-up

307 game tests and 27 prepared-art tests pass. Pre-version-bump offline Chrome/WebKit package flows, 12 two-profile save/load scenarios and staged 100-floor mechanics checks passed. Final version/export compatibility, offline extracted-package smoke, syntax, art determinism and ZIP integrity checks pass. Save format remains version 1.

**Native GR-09 background-tab/minimize behavior remains UNVERIFIED.** Real tab/window freeze/resume, native OS file-chooser cancellation, physical mobile, natural-play difficulty/audio and final human visual acceptance remain alpha follow-up. Firefox's full acceptance run is incomplete after a test-harness request-count failure; its corrected harness still needs a browser retest. WebKit test-build results do not establish Safari.app or physical iOS compatibility.

The native browser tool rejected file:// tab access; no policy workaround or native-visibility pass is claimed. The launch version change does not imply those checks were completed.

[Player guide](https://github.com/VAdamec/dungeon-crawler-inkling-2-mini/blob/2.1.0/docs/PLAYER_GUIDE.md) · [Credits](https://github.com/VAdamec/dungeon-crawler-inkling-2-mini/blob/2.1.0/CREDITS.md) · [Changelog](https://github.com/VAdamec/dungeon-crawler-inkling-2-mini/blob/2.1.0/CHANGELOG.md)
