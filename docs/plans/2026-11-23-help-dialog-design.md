# Help and settings window

Approved by the user on 2026-11-23, including a HUD ? button.

Move the permanent below-map instructions and audio controls into a fixed, in-game Help & settings modal. Toggle with ?; close with ? / Esc / Close. Add a small accessible ? HUD button. Keep IDs for existing audio controls, volumes, and mute behavior. Move merchant stock into the equipment panel, and ending controls into the map's ending overlay; no permanent footer controls remain.

Use independent transient `state.helpOpen` and saved focus so health/retreat dialogs are preserved underneath. Block gameplay and freeze active time, hazards, recovery, speech, and cinematic progression while help is open. Reset tick/cinematic timestamps on close to prevent catch-up. Music/effect preferences remain editable; M stays usable. Do not replace the health pause object or allow help's Escape to also dismiss it or skip a cutscene.

Keep the modal outside launch/game containers, make those containers inert while open, trap keyboard focus among Close/audio controls, restore focus when closing, and make content scroll within narrow/short windows. Help on the launch screen must not start a run; restart resets help cleanly. Preserve plain scripts/file://.

- [x] Rehome controls and add accessible dialog/button.
- [x] Implement modal lifecycle, keyboard routing, pause/focus, and cinematic clock guards.
- [x] Verify behavioral tests, syntax/smoke, browser keyboard/focus/audio/mobile and cinematic pause; update documentation.

Completed in v0.11.0. All 72 tests, syntax/smoke and isolated Chrome checks pass, including ? on launch, native keyboard audio controls, focus/inert, modal/world/cinematic pause and nested health dialogs, ending/merchant placement, and 390×700 mobile fit. Screenshots inspected and archived in `docs/previews/2026-11-23-help-dialog/`.
