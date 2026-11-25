const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{test}=require('node:test');
const {decodePNG,bounds}=require('./prepare-knight.cjs'),root=path.join(__dirname,'characters-v1');
const roster=JSON.parse(fs.readFileSync(path.join(root,'roster.json'))),collection=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('requested monster/boss/NPC/companion/animal roster is complete, with one dragon alias',()=>{
 assert.equal(roster.length,25);assert.equal(collection.complete,true);assert.deepEqual(collection.missing,[]);assert.equal(collection.assets.length,25);
 const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-inventory.json'))),expected=inventory.assets.filter(a=>['monster','boss','npc','companion','animal'].includes(a.category)).map(a=>a.name).sort();assert.deepEqual(collection.assets.map(a=>a.id).sort(),expected);assert.equal(collection.aliases.dragon,'dragonBoss');
});
test('each character has 16 unique transparent poses, correct sheet dimensions and source hashes',()=>{
 for(const a of collection.assets){
  assert.equal(a.frames.length,16);assert.deepEqual(a.directions,['front','back','left','right']);assert.equal(new Set(a.frames.map(f=>f.sha256)).size,16,a.id+' repeated poses');
  const source=fs.readFileSync(path.join(root,a.id,'generated-source.png'));assert.equal(hash(source),a.sourceSHA256);
  const sheet=decodePNG(fs.readFileSync(path.join(__dirname,a.sheet)));assert.deepEqual([sheet.w,sheet.h],a.sheetSize);
  for(const f of a.frames){const img=decodePNG(fs.readFileSync(path.join(root,a.id,'frames',`${f.direction}-${f.frame}.png`)));assert.deepEqual([img.w,img.h],a.cellSize);assert.equal(hash(img.data),f.sha256);}
 }
});
test('all character frames fit their declared bounds with real alpha margins and consistent anchors',()=>{
 for(const a of collection.assets)for(const f of a.frames){
  const img=decodePNG(fs.readFileSync(path.join(root,a.id,'frames',`${f.direction}-${f.frame}.png`))),b=bounds(img.data,img.w,img.h);
  assert.deepEqual(f.bounds,b);assert.deepEqual(f.anchor,a.anchor);assert.ok(b.x>=3&&b.y>=3&&b.x+b.width<=img.w-3&&b.y+b.height<=img.h-3,a.id+' clipping');
  assert.ok(b.width<=a.w+1&&b.height<=a.h+1,a.id+' exceeded common size limit');
  if(a.anchorMode==='feet')assert.equal(b.y+b.height,a.anchor[1],a.id+' foot jitter');
  for(let x=0;x<img.w;x++){assert.equal(img.data[x*4+3],0);assert.equal(img.data[((img.h-1)*img.w+x)*4+3],0);}
 }
});
test('walking and creature loops change silhouette; wings and blob deformation are real',()=>{
 for(const a of collection.assets){for(const direction of a.directions){const masks=[];for(const f of a.frames.filter(f=>f.direction===direction)){const img=decodePNG(fs.readFileSync(path.join(root,a.id,'frames',`${direction}-${f.frame}.png`))),alpha=Buffer.alloc(img.w*img.h);for(let i=0;i<alpha.length;i++)alpha[i]=img.data[i*4+3]>0?1:0;masks.push(hash(alpha));}assert.ok(new Set(masks).size>=3,a.id+':'+direction+' needs different silhouettes');}}
 for(const id of ['bat','wasp']){const a=collection.assets.find(a=>a.id===id);assert.equal(a.anchorMode,'hover-center');assert.ok(new Set(a.frames.filter(f=>f.direction==='front').map(f=>f.bounds.height)).size>1,id+' static wings');}
});
test('bosses remain visibly larger than the knight and Mimic has a closed-to-open sequence',()=>{
 for(const a of collection.assets.filter(a=>a.group==='boss'))assert.ok(Math.max(...a.frames.map(f=>Math.max(f.bounds.width,f.bounds.height)*a.screenScale))>96,a.id+' too small');
 const m=collection.assets.find(a=>a.id==='mimic');assert.ok(m.frames.find(f=>f.direction==='front'&&f.frame===0).bounds.height<m.frames.find(f=>f.direction==='front'&&f.frame===3).bounds.height);
});
test('Marmalade and user-specific references are preserved as explicit, separate custom artwork',()=>{
 for(const name of ['user-monster-reference.png','user-marmalade-reference.png','user-mimic-reference.png'])assert.ok(fs.statSync(path.join(root,name)).size>1000);
 const cat=collection.assets.find(a=>a.id==='catCompanion');assert.equal(cat.name,'Marmalade');assert.ok(cat.desc.includes('charcoal'));assert.equal(cat.reference,'user-marmalade-reference.png');
});
