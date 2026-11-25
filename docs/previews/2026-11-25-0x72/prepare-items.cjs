/* Preview-only deterministic RGBA export. No painting or production dependencies. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {decodePNG,encodePNG,bounds}=require('./prepare-knight.cjs');
const root=path.join(__dirname,'items-effects-v1');
function exportItems(partial=false){
 const roster=JSON.parse(fs.readFileSync(path.join(root,'roster.json'))),assets=[];
 const missing=roster.filter(a=>!fs.existsSync(path.join(root,a.id,'generated-source.png')));
 if(missing.length&&!partial)throw Error('Missing sources: '+missing.map(a=>a.id).join(', '));
 for(const a of roster){
  const dir=path.join(root,a.id),file=path.join(dir,'generated-source.png');if(!fs.existsSync(file))continue;
  const source=decodePNG(fs.readFileSync(file)),cells=[];
  for(let i=0;i<a.sourceFrames;i++){
   const cols=a.columns,rows=Math.ceil(a.sourceFrames/cols),x0=Math.round(i%cols*source.w/cols),y0=Math.round(Math.floor(i/cols)*source.h/rows),x1=Math.round((i%cols+1)*source.w/cols),y1=Math.round((Math.floor(i/cols)+1)*source.h/rows),w=x1-x0,h=y1-y0,data=Buffer.alloc(w*h*4);
   for(let y=0;y<h;y++)source.data.copy(data,y*w*4,((y0+y)*source.w+x0)*4,((y0+y)*source.w+x1)*4);
   cells.push({w,h,data,b:bounds(data,w,h),sourceCell:[x0,y0,w,h]});
  }
  // Shared union around source-cell centers preserves animation expansion and positioning.
  const left=Math.min(...cells.map(f=>f.b.x-f.w/2)),right=Math.max(...cells.map(f=>f.b.x+f.b.width-f.w/2)),top=Math.min(...cells.map(f=>f.b.y-f.h/2)),bottom=Math.max(...cells.map(f=>f.b.y+f.b.height-f.h/2));
  const scale=Math.min(a.maxVisible[0]/(right-left),a.maxVisible[1]/(bottom-top)),size=a.cell,cx=(left+right)/2,cy=(top+bottom)/2;
  const blank=a.id==='spikes'||a.id==='townPortal',frames=[];if(blank)frames.push({data:Buffer.alloc(size*size*4),label:a.id==='spikes'?'hidden':'closed',empty:true});
  const labels=a.states.split(';').map(s=>s.trim());
  cells.forEach((f,index)=>{
   const data=Buffer.alloc(size*size*4);
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const sx=Math.floor(f.w/2+cx+(x+.5-size/2)/scale),sy=Math.floor(f.h/2+cy+(y+.5-size/2)/scale);
    if(sx<0||sy<0||sx>=f.w||sy>=f.h)continue;
    const si=(sy*f.w+sx)*4,di=(y*size+x)*4;if(f.data[si+3]<64)continue;f.data.copy(data,di,si,si+4);
   }
   frames.push({data,label:labels[index]||('phase '+index),empty:false,sourceCell:f.sourceCell});
  });
  fs.mkdirSync(path.join(dir,'frames'),{recursive:true});const sheet=Buffer.alloc(size*frames.length*size*4),records=[];
  frames.forEach((f,i)=>{
   const name='frames/'+i+'.png';fs.writeFileSync(path.join(dir,name),encodePNG(size,size,f.data));
   for(let y=0;y<size;y++)f.data.copy(sheet,(y*size*frames.length+i*size)*4,y*size*4,(y+1)*size*4);
   records.push({index:i,label:f.label,empty:f.empty,file:name,crop:[i*size,0,size,size],bounds:f.empty?null:bounds(f.data,size,size),sourceCell:f.sourceCell,sha256:crypto.createHash('sha256').update(f.data).digest('hex')});
  });
  fs.writeFileSync(path.join(dir,'sheet.png'),encodePNG(size*frames.length,size,sheet));
  const manifest={...a,sheet:'items-effects-v1/'+a.id+'/sheet.png',anchor:[size/2,size/2],screenScale:2,alphaCutoff:64,sharedScale:scale,nativeDirection:a.group==='projectiles'?'right':null,source:'generated-source.png',frames:records,scope:'preview only; awaiting review'};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');assets.push(manifest);
 }
 const aliases={flameOff:{id:'fireVent',frame:0},flameOn:{id:'fireVent',frame:2},stairsUp:{id:'stairs',frame:0},stairsDown:{id:'stairs',frame:1},spikesHidden:{id:'spikes',frame:0},portalClosed:{id:'townPortal',frame:0}};
 const data={version:1,scope:'preview only',complete:!missing.length,missing:missing.map(a=>a.id),assets,aliases};
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(data,null,2)+'\n');
 const uri=file=>'data:image/png;base64,'+fs.readFileSync(file).toString('base64');
 const browserData={...data,imageData:Object.fromEntries(assets.map(a=>[a.id,uri(path.join(__dirname,a.sheet))])),floorData:uri(path.join(__dirname,'assets/floors.png')),knightData:uri(path.join(__dirname,'knight-reference-v1/walk-sheet.png'))};
 fs.writeFileSync(path.join(__dirname,'items-effects-data.js'),'// Generated preview data, no production dependency.\nwindow.ITEM_DATA = '+JSON.stringify(browserData)+';\n');
 console.log('Exported '+assets.length+'/'+roster.length+' item/effect families');return data;
}
if(require.main===module)exportItems(process.argv.includes('--partial'));module.exports={exportItems};
