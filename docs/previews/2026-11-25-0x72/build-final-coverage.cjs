/* Dev-only ledger: every current runtime name has an explicit selected source. */
const fs=require('node:fs'),path=require('node:path'),root=__dirname;
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
const runtime=read('runtime-inventory.json'),characters=read('characters-v1/manifest.json'),items=read('items-effects-v1/manifest.json'),environment=read('environment-v1/manifest.json');
for(const m of [characters,items,environment])if(!m.complete)throw Error('Collection incomplete');
const rows=[];
for(const a of runtime.assets){const id=a.name;let kind,source,records,note='',selectedId=id;
 if(id==='knight'){kind='hero';source='knight-reference-v1/walk-sheet.png';records=read('knight-reference-v1/manifest.json').frames;}
 else if(characters.assets.some(a=>a.id===(id==='dragon'?'dragonBoss':id))){kind='character';selectedId=id==='dragon'?'dragonBoss':id;const c=characters.assets.find(a=>a.id===selectedId);source=c.sheet;records=c.frames;note=id==='dragon'?'Legacy alias to dragonBoss':'';}
 else if(items.assets.some(a=>a.id===(items.aliases[id]?.id||id))){kind='item/effect';selectedId=items.aliases[id]?.id||id;const c=items.assets.find(a=>a.id===selectedId);source=c.sheet;records=c.frames;note=items.aliases[id]?'Fixed state alias '+JSON.stringify(items.aliases[id]):'';}
 else{kind='environment';selectedId={rubble:'rock',throne:'dais',water:'town'}[id]||id;const c=environment.assets.find(a=>a.id===selectedId);if(!c)throw Error('No selected source for '+id);source=c.file;records=c.records;note=id==='water'?'Use town material water crop':id==='rubble'?'Reuse boulder/settled-rock role without changing obstacle collision':id==='throne'?'Saved throne-room dais role':'';}
 if(!fs.existsSync(path.join(root,source)))throw Error('Missing selected source '+source);rows.push({runtime:id,kind,selectedId,source,poses:records.length,baselineWorld:a.world,baselineScreen:a.screen,note,status:'prepared; final visual acceptance and runtime bake pending'});
}
const data={date:'2026-11-25',runtimeNames:rows.length,gameplay:'unchanged 1.0.1',sources:rows};fs.writeFileSync(path.join(root,'environment-v1/final-coverage.json'),JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(path.join(root,'environment-v1/final-coverage.md'),'# Final selected-source coverage\n\nAll '+rows.length+' current runtime names have an explicit source. This proves source availability, not runtime integration or cinematic acceptance. Prepared role aliases must retain semantic state dispatch. The existing runtime-inventory file still describes baseline sizes; use source manifests and the final preview for proposed sizes.\n\n| Runtime role | Kind | Selected source | Prepared poses/states | Notes |\n| --- | --- | --- | ---: | --- |\n'+rows.map(r=>'| '+r.runtime+' | '+r.kind+' | ['+r.source+'](../'+r.source+') | '+r.poses+' | '+r.note+' |').join('\n')+'\n');console.log('Mapped '+rows.length+' runtime roles');
