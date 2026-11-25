const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{test}=require('node:test');
const {decodePNG,bounds,encodePNG}=require('./prepare-knight.cjs');
const dir=path.join(__dirname,'knight-reference-v1'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),sheet=decodePNG(fs.readFileSync(path.join(dir,'walk-sheet.png')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('knight has four directions and four unique walking frames per direction',()=>{
 assert.deepEqual(manifest.directions,['front','back','left','right']);assert.equal(manifest.frames.length,16);assert.equal(new Set(manifest.frames.map(f=>f.sha256)).size,16);
 for(const d of manifest.directions){const f=manifest.frames.filter(f=>f.direction===d);assert.deepEqual(f.map(a=>a.frame),[0,1,2,3]);}
});
test('all PNG frames have real transparent margins, a uniform scale and the same foot baseline',()=>{
 assert.deepEqual(manifest.anchor,[32,56]);assert.ok(manifest.sharedResampleScale>0);
 for(const f of manifest.frames){const img=decodePNG(fs.readFileSync(path.join(dir,'frames',`${f.direction}-${f.frame}.png`)));assert.equal(img.w,64);assert.equal(img.h,64);assert.equal(hash(img.data),f.sha256);const b=bounds(img.data,64,64);assert.deepEqual(b,f.bounds);assert.equal(b.y+b.height,56);assert.ok(b.height<=48&&b.x>=8&&b.x+b.width<=56&&b.y>=8);
  assert.ok(img.data.some((v,i)=>i%4===3&&v>0));for(let x=0;x<64;x++){assert.equal(img.data[x*4+3],0);assert.equal(img.data[((63*64)+x)*4+3],0);}for(let y=0;y<64;y++){assert.equal(img.data[(y*64)*4+3],0);assert.equal(img.data[(y*64+63)*4+3],0);}
 }
});
test('walking phases change the lower-body silhouettes, not only equipment or colors',()=>{
 for(const d of manifest.directions){const poses=[];for(let f=0;f<4;f++){const img=decodePNG(fs.readFileSync(path.join(dir,'frames',`${d}-${f}.png`))),alpha=[];for(let y=40;y<56;y++)for(let x=0;x<64;x++)alpha.push(img.data[(y*64+x)*4+3]>0?1:0);poses.push(hash(Buffer.from(alpha)));}assert.ok(new Set(poses).size>=3,`${d} needs distinct walking foot silhouettes`);}
});
test('sheet crops and directional strips exactly match the individual exported frames',()=>{
 assert.equal(sheet.w,256);assert.equal(sheet.h,256);
 for(let row=0;row<4;row++){const strip=decodePNG(fs.readFileSync(path.join(dir,manifest.directions[row]+'-walk.png')));assert.equal(strip.w,256);assert.equal(strip.h,64);for(let y=0;y<64;y++)assert.deepEqual(strip.data.subarray(y*256*4,(y+1)*256*4),sheet.data.subarray(((row*64+y)*256)*4,((row*64+y+1)*256)*4));}
 for(const f of manifest.frames){const[x,y,w,h]=f.crop,data=Buffer.alloc(w*h*4);for(let yy=0;yy<h;yy++)sheet.data.copy(data,yy*w*4,((y+yy)*256+x)*4,((y+yy)*256+x+w)*4);assert.equal(hash(data),f.sha256);}
});
test('RGBA codec round-trips alpha and colors without a runtime or image dependency',()=>{
 const png=encodePNG(sheet.w,sheet.h,sheet.data),decoded=decodePNG(png);assert.deepEqual(decoded.data,sheet.data);
 assert.equal(hash(fs.readFileSync(path.join(dir,'generated-source.png'))),manifest.sourceSHA256);
});
