const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {decodePNG}=require('./prepare-knight.cjs'),{exportItems}=require('./prepare-items.cjs');
const root=path.join(__dirname,'items-effects-v1');
function manifest(){return JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));}
function pixels(a,f){return decodePNG(fs.readFileSync(path.join(root,a.id,f.file)));}
test('export is complete and every checked-in transparent frame matches its sheet',()=>{
 const m=manifest();assert.equal(m.complete,true);assert.equal(m.assets.length,31);
 for(const a of m.assets){const sheet=decodePNG(fs.readFileSync(path.join(__dirname,a.sheet)));assert.equal(sheet.w,a.cell*a.frames.length);assert.equal(sheet.h,a.cell);
 for(const f of a.frames){const p=pixels(a,f);assert.equal(p.w,a.cell);assert.equal(p.h,a.cell);assert.ok(p.data.some((v,i)=>i%4===3&&v===0));
 for(let y=0;y<a.cell;y++)assert.deepEqual(p.data.subarray(y*a.cell*4,(y+1)*a.cell*4),sheet.data.subarray((y*sheet.w+f.index*a.cell)*4,(y*sheet.w+(f.index+1)*a.cell)*4));
 if(!f.empty){assert.ok(f.bounds.width>0&&f.bounds.height>0);assert.ok(f.bounds.x>0&&f.bounds.y>0);assert.ok(f.bounds.x+f.bounds.width<a.cell);assert.ok(f.bounds.y+f.bounds.height<a.cell);}}
 }
});
test('hidden spikes and closed portal contain no color or alpha information',()=>{
 for(const id of ['spikes','townPortal']){const a=manifest().assets.find(a=>a.id===id),f=a.frames[0];assert.equal(f.empty,true);const p=pixels(a,f);assert.ok(p.data.every(v=>v===0));assert.equal(a.frames.length,5);assert.ok(pixels(a,a.frames[1]).data.some((v,i)=>i%4===3&&v>0));
 // Alpha composite over arbitrary colored floor preserves every channel.
 const floor=Buffer.from(Array.from({length:p.data.length},(_,i)=>(i*37+11)%256)),out=Buffer.from(floor);for(let i=0;i<out.length;i+=4){const alpha=p.data[i+3]/255;for(let c=0;c<3;c++)out[i+c]=Math.round(p.data[i+c]*alpha+floor[i+c]*(1-alpha));}assert.deepEqual(out,floor);}
});
test('animation sheets have distinct visible phases without independently rescaling them',()=>{
 for(const a of manifest().assets.filter(a=>a.sourceFrames>1)){const visible=a.frames.filter(f=>!f.empty);assert.ok(new Set(visible.map(f=>f.sha256)).size>=2,a.id);assert.ok(a.sharedScale>0);}
});
test('projectiles remain small relative to knight and hidden floor has no grate alias',()=>{
 const m=manifest(),dart=m.assets.find(a=>a.id==='stingerFX');assert.ok(dart.frames[0].bounds.width<=14);assert.ok(dart.frames[0].bounds.height<=6);assert.equal(dart.nativeDirection,'right');assert.deepEqual(m.aliases.spikesHidden,{id:'spikes',frame:0});assert.deepEqual(m.aliases.stairsUp,{id:'stairs',frame:0});assert.deepEqual(m.aliases.stairsDown,{id:'stairs',frame:1});
});
test('strict export fails if any requested generated source is absent',()=>{
 // Inspect the strict path in an isolated temporary copy; never rename approved artwork.
 const os=require('node:os'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'item-export-'));try{fs.copyFileSync(path.join(__dirname,'prepare-items.cjs'),path.join(tmp,'prepare-items.cjs'));fs.copyFileSync(path.join(__dirname,'prepare-knight.cjs'),path.join(tmp,'prepare-knight.cjs'));fs.mkdirSync(path.join(tmp,'items-effects-v1'));fs.writeFileSync(path.join(tmp,'items-effects-v1/roster.json'),JSON.stringify([{id:'missing'}]));assert.throws(()=>require(path.join(tmp,'prepare-items.cjs')).exportItems(),/Missing sources: missing/);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
