# GR-10 — Player/developer documentation and release delivery

Date: 2026-11-25. **GR-10 complete; release 2.0.0 explicitly requested. GR-09 native background-tab/minimize observation remains UNVERIFIED.** Documentation and release work do not close that acceptance item or invent final human visual approval.

## Player versus developer information

- [README](../../../../README.md): short introduction, download/open instructions, essential controls, a few play tips and two current game views. No AI design/export/process narrative.
- [Player guide](../../../PLAYER_GUIDE.md): detailed mechanics, illustrated bestiary, encounter stats, spells and equipment for interested players. Developer-console instructions are excluded.
- In-game Help: concise controls/tips and existing sound settings; removed lengthy implementation/companion descriptions and developer commands. Modal controls, focus behavior and IDs remain intact.
- [Developer guide](../../../../DOCUMENTATION.md): script load order, artifact/bake/source maintenance, renderer conventions, checks and developer-console commands.
- [Credits](../../../../CREDITS.md): distinct provenance for generated adaptations, user references, earlier project grids and the 0x72 source pack. Publisher attribution/license link checked; no new blanket license applied to references or custom art.
- Source-collection READMEs are marked as historical preparation records; the master FG plan now points to current recovery evidence instead of the obsolete heap-failure checkpoint.

## Current images and live reference data

[Capture directory and reproduction](../../../screenshots/2026-11-25-integrated/README.md) contains eight actual browser captures, eighteen transparent runtime-rendered bestiary figures and a nine-boss contact sheet. Desktop game captures include the whole HUD/log/map/equipment layout; Help also has a 390×844 viewport capture. The initial logo/version shows 2.0.0.

The scene metadata labels staged actor positions/stats/gear/spells and queued animation clocks. Captures are not natural-spawn, campaign-balance, native frame-rate or physical-phone evidence. Old dated images remain historical. Monster tables were checked against live ordinary/boss/themed values, not rewritten for graphics changes.

## Required runtime and source delivery

The [artifact ledger](artifact-ledger.json) records SHA-256, byte sizes and tracking state for all **five required runtime files**, **88 actual bake inputs**, collection manifests, and screenshots/capture metadata. The script load order is:

1. `js/art-runtime.js`
2. `js/sprites.js`
3. `js/game.js`

Together with `index.html` and `style.css`, these are the complete browser-play payload. Source PNGs, prompts, manifests, optional source-pack copies, preview pages and development tools are retained in the source repository but are not fetched during play. The user explicitly requested release 2.0.0; the generated art payload is included in that delivery rather than silently omitted as untracked output. Unrelated companion-selection, implementation, teleportation and trading drafts are excluded from the release commit.

Reproduce the payload without overwriting it:

```sh
node docs/previews/2026-11-25-0x72/bake-runtime.cjs --out /tmp/dungeon-art-runtime.js
cmp js/art-runtime.js /tmp/dungeon-art-runtime.js
```

The current bake is byte-identical to the generated runtime script. Do not hand-edit it. No build, package install, external image/font/audio service or relaxed browser file-access flag is needed to play. The two imported 0x72 README copies retain their upstream final blank line to preserve source hashes; project-owned changes pass the whitespace check.

## Scope and checks

GR-10 changed documentation/screenshots. The later user requests also authorize the concise player Help copy and `GAME_VERSION` 2.0.0. Game mechanics, source PNGs, source manifests and generated art pixels are unchanged. Release verification includes the full behavior/preview suites, syntax, bake/smoke and the actual extracted five-file ZIP over `file://`; exact results are recorded in [verification.json](verification.json).

[Release notes](../../../releases/2.0.0.md) keep the native visibility limit visible. The [GR-09 report](../gr09/README.md) and its `nativeBackgroundObserved: false` result remain unchanged. Native background/minimize freeze and no catch-up still require observation in an ordinary user-controlled browser; an explicit hidden/event fixture is not native proof. A full human campaign, subjective audio playtest and final visual decisions are not inferred from documentation completion.
