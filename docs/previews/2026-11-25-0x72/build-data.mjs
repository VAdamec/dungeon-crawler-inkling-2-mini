import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const src = fs.readFileSync(path.join(root,'js/sprites.js'),'utf8');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.__V=JRPG_VARIANTS;globalThis.__G=JRPG_GRIDS;', sandbox);
const V = sandbox.__V, G = sandbox.__G;
const tileList = fs.readFileSync(path.join(root,'assets/source/0x72-dungeontileset-ii-v1.7/tile_list_v1.7'),'utf8').trim().split(/\n/).filter(Boolean)
  .map(line => { const [name,x,y,w,h]=line.trim().split(/\s+/); return {name,x:+x,y:+y,w:+w,h:+h}; });
const cropByName = Object.fromEntries(tileList.map(t=>[t.name,t]));
const group = name => name.replace(/_anim_f\d+$/,'').replace(/_f\d+$/,'');
const groups = {};
for (const t of tileList) (groups[group(t.name)] ||= []).push(t);
for (const k of Object.keys(groups)) groups[k].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));

const runtime = Object.entries(V).map(([name,dirs]) => {
  const flat = Object.values(dirs).flat();
  const unique = [...new Set(flat)];
  const dims = unique.map(i=>({w:Math.max(...G[i].map(r=>r.length)),h:G[i].length}));
  const maxW=Math.max(...dims.map(d=>d.w)), maxH=Math.max(...dims.map(d=>d.h));
  return {
    name,
    logical:[maxW/2,maxH/2],
    source:[maxW,maxH],
    directions:Object.keys(dirs),
    frameCounts:Object.fromEntries(Object.entries(dirs).map(([d,f])=>[d,new Set(f).size])),
    frames:unique.length,
    uniqueFrames:unique.length,
    anchor: 'bottom-center',
    world:[maxW,maxH],
    screen:[maxW*2,maxH*2],
    alias: name==='dragon' ? 'dragonBoss' : null,
  };
});

const roles = {
  knight: { category:'hero', pack:[], status:'custom', proposed:{source:'knight-reference-v1/walk-sheet.png',status:'preview-ready',directions:['front','back','left','right'],framesPerDirection:4}, note:'User-selected silver-helmet/navy-tabard reference. A generated transparent 4-direction × 4-frame walking sheet is included in the standalone preview, normalized to a 64px cell with fixed (32,56) feet. This baseline row still describes the unchanged 1.0.1 runtime dimensions/frames, not the proposed sheet. Preview only; no runtime integration.' },
  slime: { category:'monster', pack:['slug_anim_f0..3','tiny_slug_anim_f0..3','swampy_anim_f0..3','muddy_anim_f0..3'], status:'gap', note:'No named slime. Closest source family is slug/swampy/muddy; needs custom 0x72-style slime or explicit review of slug substitute.' },
  bat: { category:'monster', pack:['tiny_zombie_* (not faithful) / no bat'], status:'custom', note:'No bat crop in pack. Custom bat required, preserving small flying silhouette and wing animation.' },
  goblin:{ category:'monster', pack:['goblin_idle_anim_f0..3','goblin_run_anim_f0..3'], status:'modified', note:'Direct name match. Add 4-direction mapping if used directionally; current runtime has four directions, which must be retained.'},
  skeleton:{ category:'monster', pack:['skelet_idle_anim_f0..3','skelet_run_anim_f0..3'], status:'modified', note:'Direct family match (skelet).'},
  orc:{ category:'monster', pack:['orc_warrior_idle_anim_f0..3','orc_warrior_run_anim_f0..3','masked_orc_*'], status:'modified', note:'orc_warrior is closest ordinary orc.'},
  wasp:{ category:'monster', pack:[], status:'custom', note:'No wasp/insect in pack; custom required.'},
  mage:{ category:'monster', pack:['wizzard_m_idle/run/hit'], status:'modified', note:'wizzard_m family match; needs directional pose mapping for 4-way runtime role.'},
  healer:{ category:'monster', pack:['wizzard_f_idle/run/hit','elf_f_idle/run/hit'], status:'modified', note:'No healer role in pack; closest robed/caster or elf-female base needs recolor/role adaptation.'},
  mimic:{ category:'boss', pack:['chest_mimic_open_anim_f0..2','chest_full_open_anim_f0..2'], status:'modified', note:'Chest mimic frames exist but boss requires large 32x22 logical sprite, idle/attack behavior and boss presentation; custom expansion needed.'},
  hydra:{ category:'boss', pack:[], status:'custom', note:'No hydra in pack; custom boss required.'},
  boar:{ category:'boss', pack:[], status:'custom', note:'No boar in pack; custom boss required (or heavily modified existing creature, not recommended as silent substitution).'},
  medusa:{ category:'boss', pack:[], status:'custom', note:'No medusa in pack; custom boss required.'},
  darkWizard:{ category:'boss', pack:['necromancer_anim_f0..3','wizzard_m_*'], status:'custom', note:'Necromancer/wizard can inspire palette/silhouette but boss needs dedicated large art and identity.'},
  skeletonKing:{ category:'boss', pack:['skelet_*','big_zombie_*?'], status:'custom', note:'No skeleton king; custom boss required preserving throne-room scale.'},
  dragonBoss:{ category:'boss', pack:[], status:'custom', note:'No dragon; custom boss required. Final cinematic also uses dragonBoss.'},
  cook:{ category:'boss', pack:['orc_warrior_*','pumpkin_dude_*?'], status:'custom', note:'Themed boss Cook has no direct source; custom/modified orc/cook figure required.'},
  bartender:{ category:'boss', pack:['skelet_*','doc_*?'], status:'custom', note:'Themed boss Bartender has no direct source; custom figure required.'},
  merchant:{ category:'npc', pack:['elf_m_*','wizzard_m_*','lizard_m_*'], status:'custom', note:'No merchant; custom NPC needed. Current runtime has 4 directions.'},
  prisoner:{ category:'npc', pack:['knight_f_*','elf_f_*'], status:'custom', note:'No prisoner sprite; custom 4-direction NPC required.'},
  princess:{ category:'npc', pack:['elf_f_*','wizzard_f_*'], status:'custom', note:'No princess sprite; custom 4-direction NPC required for rescue/ending.'},
  villager:{ category:'npc', pack:['elf_m_*','dwarf_m_*','knight_m_*'], status:'modified', note:'Can derive from humanoid base but needs villager identity and 4 directions.'},
  catCompanion:{ category:'companion', pack:[], status:'custom', note:'No cat; custom companion required, preserve larger Marmalade scale/personality readability.'},
  cat:{ category:'animal', pack:[], status:'custom', note:'No cat; custom small cat required.'},
  dog:{ category:'animal', pack:[], status:'custom', note:'No dog; custom animal required (Pip/planned companion relevance).'},
  chicken:{ category:'animal', pack:[], status:'custom', note:'No chicken; custom animal required.'},
  sword:{ category:'item', pack:['weapon_knight_sword','weapon_regular_sword','weapon_rusty_sword'], status:'modified', note:'Several sword crops exist; pick and normalize icon/world scale.'},
  bow:{ category:'item', pack:['weapon_bow','weapon_bow_2','weapon_arrow'], status:'modified', note:'Bow crops exist.'},
  armor:{ category:'item', pack:[], status:'custom', note:'No armor icon/body item; custom required.'},
  helmet:{ category:'item', pack:[], status:'custom', note:'No helmet item; custom required.'},
  shield:{ category:'item', pack:[], status:'custom', note:'No shield item; custom required.'},
  ring:{ category:'item', pack:[], status:'custom', note:'No ring item; custom required.'},
  elixir:{ category:'item', pack:['flask_big_yellow','flask_yellow'], status:'modified', note:'Use flask variant; preserve game meaning.'},
  potion:{ category:'item', pack:['flask_big_red','flask_red'], status:'modified', note:'Red flask match.'},
  chest:{ category:'item', pack:['chest_empty_open_anim_f0..2','chest_full_open_anim_f0..2'], status:'modified', note:'Chest frames exist; map to open/closed/state as needed.'},
  key:{ category:'item', pack:[], status:'custom', note:'No key icon; custom required.'},
  townScroll:{ category:'item', pack:[], status:'custom', note:'No scroll; custom required.'},
  townPortal:{ category:'effect/item', pack:[], status:'custom', note:'No portal; custom required (matches town gate state).'},
  spellbook:{ category:'item', pack:[], status:'custom', note:'No book/spellbook; custom required.'},
  frostboltTome:{ category:'item', pack:[], status:'custom', note:'Spellbook variant; custom required.'},
  greaterHealTome:{ category:'item', pack:[], status:'custom', note:'Spellbook variant; custom required.'},
  barrierTome:{ category:'item', pack:[], status:'custom', note:'Spellbook variant; custom required.'},
  stairsUp:{ category:'terrain/prop', pack:['floor_ladder','floor_stairs'], status:'modified', note:'Ladder/stairs crops exist; decide semantics for ascent/descent.'},
  stairsDown:{ category:'terrain/prop', pack:['floor_ladder','floor_stairs'], status:'modified', note:'Same family; distinguish clearly from stairsUp.'},
  torch:{ category:'prop', pack:['wall_fountain_mid_red_anim_f0..2','wall_fountain_basin_red_anim_f0..2'], status:'modified', note:'Proposed red fountain/flame-and-bowl adaptation; previewed as a wall fire. Not an unchanged native torch. Four-frame clock mapping still pending.'},
  flameOff:{ category:'hazard', pack:[], status:'custom', note:'No dormant flame vent; custom required, must preserve unrevealed/active states.'},
  flameOn:{ category:'hazard', pack:[], status:'custom', note:'No active flame vent; custom animated hazard required.'},
  spikes:{ category:'hazard', pack:['floor_spikes_anim_f0..3'], status:'modified', note:'Direct match. Hidden/unrevealed state must remain pixel-identical to floor until triggered.'},
  rockCrack:{ category:'hazard', pack:['floor_* cracked variant? none'], status:'custom', note:'No cracked floor warning tile; custom required.'},
  rockSpent:{ category:'hazard', pack:[], status:'custom', note:'No spent rock hazard; custom required.'},
  rubble:{ category:'prop', pack:[], status:'custom', note:'No rubble; custom required.'},
  pillar:{ category:'prop', pack:['column','column_wall'], status:'modified', note:'Column crops exist; check bounds/footprint and do not imply collision change.'},
  tombstone:{ category:'prop', pack:[], status:'custom', note:'No tombstone; custom required.'},
  crystal:{ category:'prop', pack:[], status:'custom', note:'No crystal; custom required.'},
  cookingPot:{ category:'prop', pack:[], status:'custom', note:'No cooking pot; custom required for kitchen/throne/themed areas as needed.'},
  barCounter:{ category:'prop', pack:[], status:'custom', note:'No bar counter; custom required.'},
  banner:{ category:'prop', pack:['wall_banner_blue','wall_banner_green','wall_banner_red','wall_banner_yellow'], status:'modified', note:'Wall banners exist; map to in-world prop carefully.'},
  throne:{ category:'prop', pack:[], status:'custom', note:'No throne prop; custom required for depth-50 throne room.'},
  inn:{ category:'town', pack:[], status:'custom', note:'No building; custom town architecture in 0x72 style required.'},
  store:{ category:'town', pack:[], status:'custom', note:'No building; custom required.'},
  hut:{ category:'town', pack:[], status:'custom', note:'No building; custom required.'},
  tree:{ category:'town', pack:[], status:'custom', note:'No tree; custom required.'},
  bridge:{ category:'town', pack:['floor_ladder? no','doors/wood? no'], status:'custom', note:'No bridge; custom required.'},
  water:{ category:'town', pack:['wall_fountain_basin_*','wall_goo*? not water'], status:'custom', note:'No water tile; custom required.'},
  townGate:{ category:'town', pack:['doors_frame_*','doors_leaf_closed/open'], status:'modified', note:'Door frames/leaves exist; can inspire gate but town gate has portal/state behavior and larger footprint.'},
  doorstep:{ category:'town', pack:[], status:'custom', note:'No doorstep marker; custom/subtle required.'},
  dragon:{ category:'alias', pack:[], status:'alias', note:'Legacy alias to dragonBoss; keep mapping, no new asset needed.'},
  arrowFX:{ category:'fx', pack:['weapon_arrow'], status:'modified', note:'Arrow projectile exists as weapon sprite; needs FX orientation/scale treatment.'},
  stingerFX:{ category:'fx', pack:[], status:'custom', note:'No stinger projectile; custom required.'},
  boneFX:{ category:'fx', pack:[], status:'custom', note:'No bone projectile; custom required.'},
  beerFX:{ category:'fx', pack:[], status:'custom', note:'No beer projectile; custom required.'},
  fireballFX:{ category:'fx', pack:[], status:'custom', note:'No fireball; custom required.'},
  frostboltFX:{ category:'fx', pack:[], status:'custom', note:'No frostbolt; custom required.'},
  healFX:{ category:'fx', pack:['ui_heart_full? no'], status:'custom', note:'No heal effect; custom required.'},
  greaterHealFX:{ category:'fx', pack:[], status:'custom', note:'No greater heal effect; custom required.'},
  magicBarrierFX:{ category:'fx', pack:[], status:'custom', note:'No barrier effect; custom required.'},
};

for (const a of runtime) {
  const r = roles[a.name];
  if (!r) throw new Error('missing role '+a.name);
  a.category=r.category; a.pack=r.pack; a.status=r.status; a.note=r.note; if(r.proposed)a.proposed=r.proposed;
}
// Prepared character sheets override old pack-candidate notes, never runtime data.
const collectionFile=path.join(root,'docs/previews/2026-11-25-0x72/characters-v1/manifest.json');
if(fs.existsSync(collectionFile)){
  const collection=JSON.parse(fs.readFileSync(collectionFile,'utf8'));
  if(collection.complete)for(const a of runtime){
    const proposed=collection.assets.find(c=>c.id===(collection.aliases[a.name]||a.name));
    if(!proposed)continue;
    a.proposed={source:proposed.sheet,status:'preview-ready',directions:proposed.directions,framesPerDirection:4,cellSize:proposed.cellSize,anchor:proposed.anchor,screenScale:2};
    if(a.alias)continue;
    a.status='custom';a.pack=[];
    a.note='Prepared reference-derived '+proposed.name+' sheet: four directions × four '+proposed.motion+' poses. Transparent cells, fixed shared scale/anchor; preview only, new collection awaiting review. Runtime dimensions and frame counts in this row remain the unchanged 1.0.1 baseline.';
  }
}
const missingInRoles = Object.keys(roles).filter(k=>!runtime.find(r=>r.name===k));
if (missingInRoles.length) throw new Error('extra roles '+missingInRoles);

fs.writeFileSync(path.join(root,'docs/previews/2026-11-25-0x72/runtime-inventory.json'), JSON.stringify({count:runtime.length, uniqueFrames:new Set(Object.values(V).flatMap(d=>Object.values(d).flat())).size, assets:runtime},null,2));
fs.writeFileSync(path.join(root,'docs/previews/2026-11-25-0x72/pack-crops.json'), JSON.stringify({count:tileList.length, groups:Object.keys(groups).sort(), crops:tileList},null,2));

// generate inventory md
const statusOrder = {pack:'pack-native candidate', modified:'modified-from-pack', custom:'custom-required', gap:'gap-needs-decision', alias:'alias'};
const lines = [];
lines.push('# 0x72 runtime asset inventory (OX-01)');
lines.push('');
lines.push('Status: planning artifact. No runtime art integrated. Existing 1.0.1 art remains active.');
lines.push('');
lines.push(`Baseline runtime roles: **${runtime.length}**. Unique decoded frame grids: **${new Set(Object.values(V).flatMap(d=>Object.values(d).flat())).size}**. Pack crop rows: **${tileList.length}**.`);
lines.push('');
lines.push('## Coverage summary');
const counts = {};
for (const a of runtime) counts[a.status]=(counts[a.status]||0)+1;
for (const [k,v] of Object.entries(counts)) lines.push(`- ${k}: ${v}`);
lines.push('');
lines.push('## Units and anchors');
lines.push('');
lines.push('Source pixels are the baked grids at ART_DENSITY=2; logical dimensions divide those by two. The world/screen columns explicitly use the ordinary 2× actor scale and 2× map zoom, not boss scale 3 or Marmalade scale 1.5. All ordinary world actors/props are bottom-center anchored; terrain is tile-aligned. Town buildings use their existing multi-tile footprint fitter. The v3 scene ledger reports actual companion scale separately. Required custom frames are not implemented merely because a role is inventoried.');
lines.push('');
lines.push('## Role table');
lines.push('');
lines.push('| Runtime name | Category | Baked source px | Logical px | World px at 2× | Screen px at 2× zoom | Dirs | Unique frames by direction | Status | Pack candidates | Notes |');
lines.push('|---|---|---:|---:|---:|---:|---|---|---|---|---|');
for (const a of runtime) {
  lines.push(`| ${a.name}${a.alias?` (alias→${a.alias})`:''} | ${a.category} | ${a.source.join('×')} | ${a.logical.join('×')} | ${a.world.join('×')} | ${a.screen.join('×')} | ${a.directions.join(', ')} | ${Object.entries(a.frameCounts).map(([d,n])=>d+': '+n).join(', ')} | ${a.status} | ${a.pack.join('; ')||'—'} | ${a.note.replace(/\|/g,'/')} |`);
}
lines.push('');
lines.push('## Key gaps / decisions');
lines.push('');
lines.push('- **Hero size**: the current proposal uses the user-reference knight (64px cells, visible height ≤48px, 2× screen scale). The older knight_m candidate is 16x28 in pack; current hero is 16×22 logical / 32×44 baked source / 32×44 world / 64×88 screen. Native source-to-world 2× gives 32×56 world and 64×112 screen, taller than current. First preview must show this before bounds approval.');
lines.push('- **Missing directions**: pack humanoids are mostly front-facing/side-run sets; current runtime expects front/back/left/right for knight, goblin, skeleton, orc, mage, healer, merchant, prisoner, princess, villager. The reference-derived player now has four proposed directions/walking poses in preview; matching back/side work remains for the other humanoids.');
lines.push('- **No direct pack match**: bat, wasp, hydra, boar, medusa, skeletonKing, dragonBoss, cook, bartender, cat/catCompanion/dog/chicken, most town buildings/landscape, key/scrolls/spellbooks, many hazards/FX, armor/helmet/shield/ring, throne, flame vents, rubble/tombstone/crystal/cookingPot/barCounter/doorstep/water/bridge.');
lines.push('- **Direct/close pack matches**: goblin, skelet, orc_warrior, wizzard families, chest/flasks, floor_spikes, stairs/ladder, columns, banners, doors, weapons/bows/arrow, floor/wall atlases.');
lines.push('- **Pip/planned companion**: if implemented by integration time, Pip needs a custom dog-companion mapping in the manifest; not a new gameplay feature in this art pass.');
fs.writeFileSync(path.join(root,'docs/previews/2026-11-25-0x72/inventory.md'), lines.join('\n')+'\n');

console.log('ok', runtime.length);

// Keep source metadata reproducible, including reference-only high walls.
const sourceDir=path.join(root,'assets/source/0x72-dungeontileset-ii-v1.7');
const provenanceRows=fs.readdirSync(sourceDir).sort().filter(n=>fs.statSync(path.join(sourceDir,n)).isFile()).map(name=>{
  const data=fs.readFileSync(path.join(sourceDir,name));
  const dims=name.endsWith('.png')?data.readUInt32BE(16)+'×'+data.readUInt32BE(20):'text';
  return '| `'+name+'` | '+data.length+' | '+dims+' | `'+createHash('sha256').update(data).digest('hex')+'` |';
});
fs.writeFileSync(path.join(root,'docs/previews/2026-11-25-0x72/assets/provenance.md'),[
 '# 0x72 DungeonTileset II v1.7 — source provenance','',
 'Generated from copied repository sources. Author: 0x72 / Robert. [Author page](https://0x72.itch.io/dungeontileset-ii) · [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Credit is voluntary and retained. No third-party extensions are included.','',
 'Source copies live in `assets/source/0x72-dungeontileset-ii-v1.7/`; this preview has local PNG/crop-list copies. The high-wall atlas was copied for reference/inspection only and is not used by v3. Builders resolve repository sources relative to their own location, never Downloads. Custom cat and composited low-wall topology are preview derivatives, not unchanged source assets.','',
 '| File | Bytes | Dimensions | SHA-256 |','| --- | ---: | --- | --- |',...provenanceRows,''
].join('\n'));
