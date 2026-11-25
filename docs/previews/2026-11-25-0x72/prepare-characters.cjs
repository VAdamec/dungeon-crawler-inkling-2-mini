// Development-only deterministic PNG export. Artwork comes from image_gen;
// this only crops, uniformly resamples, anchors and packs transparent frames.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {decodePNG,encodePNG,bounds}=require('./prepare-knight.cjs');
const root=path.join(__dirname,'characters-v1'),roster=JSON.parse(fs.readFileSync(path.join(root,'roster.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const directions=['front','back','left','right'];
function prepare(spec){
 const dir=path.join(root,spec.id),bytes=fs.readFileSync(path.join(dir,'generated-source.png')),source=decodePNG(bytes),parts=[];
 const size=spec.group==='boss'?128:64,flying=['bat','wasp'].includes(spec.id),anchor=[size/2,flying?size/2:size===128?116:56];
 let maxW=0,maxH=0,maxDx=0,maxUp=0,maxDown=0;
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const x0=Math.round(col*source.w/4),x1=Math.round((col+1)*source.w/4),y0=Math.round(row*source.h/4),y1=Math.round((row+1)*source.h/4),w=x1-x0,h=y1-y0,data=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)source.data.copy(data,y*w*4,((y+y0)*source.w+x0)*4,((y+y0)*source.w+x1)*4);
  const b=bounds(data,w,h),sourceAnchor=[w/2,flying?h/2:b.y+b.height];
  maxW=Math.max(maxW,b.width);maxH=Math.max(maxH,b.height);
  maxDx=Math.max(maxDx,Math.abs(b.x-sourceAnchor[0]),Math.abs(b.x+b.width-sourceAnchor[0]));
  maxUp=Math.max(maxUp,sourceAnchor[1]-b.y);maxDown=Math.max(maxDown,b.y+b.height-sourceAnchor[1]);
  parts.push({row,col,w,h,x0,y0,data,bounds:b,sourceAnchor});
 }
 const scale=Math.min(spec.w/maxW,spec.h/maxH,(anchor[0]-4)/maxDx,(anchor[1]-4)/Math.max(1,maxUp),(size-anchor[1]-4)/Math.max(1,maxDown));
 if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid scale '+spec.id);
 const sheet=Buffer.alloc(size*4*size*4*4),records=[];fs.mkdirSync(path.join(dir,'frames'),{recursive:true});
 for(const f of parts){
  const data=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const sx=Math.floor(f.sourceAnchor[0]+(x+.5-anchor[0])/scale),sy=Math.floor(f.sourceAnchor[1]+(y+.5-anchor[1])/scale);
   if(sx<0||sy<0||sx>=f.w||sy>=f.h)continue;
   const si=(sy*f.w+sx)*4,di=(y*size+x)*4;if(f.data[si+3]<64)continue;f.data.copy(data,di,si,si+4);
  }
  const b=bounds(data,size,size),name=`${directions[f.row]}-${f.col}.png`;
  if(b.x<3||b.y<3||b.x+b.width>size-3||b.y+b.height>size-3)throw Error('Export clips '+spec.id+':'+name);
  fs.writeFileSync(path.join(dir,'frames',name),encodePNG(size,size,data));
  for(let y=0;y<size;y++)data.copy(sheet,((f.row*size+y)*size*4+f.col*size)*4,y*size*4,(y+1)*size*4);
  records.push({direction:directions[f.row],frame:f.col,crop:[f.col*size,f.row*size,size,size],anchor,bounds:b,sha256:hash(data),sourceCell:[f.x0,f.y0,f.w,f.h],sourceBounds:f.bounds});
 }
 fs.writeFileSync(path.join(dir,'walk-sheet.png'),encodePNG(size*4,size*4,sheet));
 for(let row=0;row<4;row++){const data=Buffer.alloc(size*4*size*4);sheet.copy(data,0,row*size*size*4*4,(row+1)*size*size*4*4);fs.writeFileSync(path.join(dir,directions[row]+'-walk.png'),encodePNG(size*4,size,data));}
 const manifest={...spec,scope:'standalone preview only',generator:'Built-in image_gen; prompt.md retains exact request',sourceSHA256:hash(bytes),sourceSize:[source.w,source.h],sheet:`characters-v1/${spec.id}/walk-sheet.png`,sheetSize:[size*4,size*4],cellSize:[size,size],directions,framesPerDirection:4,frames:records,anchor,anchorMode:flying?'hover-center':'feet',screenScale:2,sharedResampleScale:scale,alphaCutoff:64,reference:spec.id==='catCompanion'?'user-marmalade-reference.png':spec.id==='mimic'?'user-mimic-reference.png':['orc','slime','goblin','boar','dragonBoss'].includes(spec.id)?'user-monster-reference.png':'approved knight style'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
function exportAll(partial=false){
 const missing=[],assets=[];for(const spec of roster){if(!fs.existsSync(path.join(root,spec.id,'generated-source.png'))){missing.push(spec.id);continue;}assets.push(prepare(spec));}
 if(missing.length&&!partial)throw Error('Missing source artwork: '+missing.join(', '));
 const collection={version:1,scope:'preview only',expected:roster.length,complete:missing.length===0,missing,assets,aliases:{dragon:'dragonBoss'}};
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(collection,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'characters-data.js'),'// Generated preview manifest; never loaded by the game.\nwindow.CHARACTERS_DATA = '+JSON.stringify(collection)+';\n');
 console.log('Character sheets:',assets.length+'/'+roster.length,'frames:',assets.length*16,'missing:',missing.join(', ')||'none');return collection;
}
if(require.main===module)exportAll(process.argv.includes('--partial'));module.exports={exportAll,prepare};
