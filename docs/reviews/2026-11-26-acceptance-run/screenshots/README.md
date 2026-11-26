# Acceptance captures — 2026-11-26

Fresh offline runtime screenshots from the exact five-file review candidate. Viewports: desktop 1440×1000 and narrow/touch-emulated 390×844. State/positions staged; simulation intervals stopped. They show the game after transport/market/portal/collision probes, not a natural campaign, physical device, full graphics acceptance or native GR-09 observation.

- Chrome: [desktop](chromium/clean-desktop.png), [touch emulation](chromium/unzipped-touch.png).
- Playwright WebKit 27.2: [desktop](webkit/clean-desktop.png), [touch emulation](webkit/unzipped-touch.png).
- Firefox: [first desktop frame](firefox/clean-desktop.png), captured before the harness request-count assertion failed. No complete Firefox acceptance or narrow result.

Chrome desktop and WebKit narrow frames inspected at native dimensions: HUD/map/log remain readable; no visible broken sprite or displaced wall face in those specific frames. This does not approve all town/biome/boss/ending artwork. Remaining captures are evidence links, not a claim that every pixel or all offscreen content was reviewed.

[Execution report and limits](../README.md). Native GR-09 remains **unverified**.
