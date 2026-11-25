/* Deterministic asset export only: generated RGBA → alpha-aware bounds,
   one shared nearest-neighbor scale, fixed feet, frame/strip/sheet PNGs.
   No drawing, generative work, recoloring, external packages or runtime use. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
function decodePNG(bytes){
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
 if(bytes[24]!==8||bytes[25]!==6||bytes[28]!==0)throw Error('Expected non-interlaced RGBA8 PNG');
 let offset=8,chunks=[];while(offset<bytes.length){const n=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+n));offset+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(chunks)),data=Buffer.alloc(w*h*4),stride=w*4;
 const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Bad filter');for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?data[i-4]:0,b=y?data[i-stride]:0,c=y&&x>=4?data[i-stride-4]:0;data[i]=(raw[y*(stride+1)+x+1]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
 return {w,h,data};
}
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function encodePNG(w,h,data){
 const chunk=(type,payload)=>{const t=Buffer.from(type),n=Buffer.alloc(4),crc=Buffer.alloc(4);n.writeUInt32BE(payload.length);crc.writeUInt32BE(crc32(Buffer.concat([t,payload])));return Buffer.concat([n,t,payload,crc]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
 const rows=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)data.copy(rows,y*(w*4+1)+1,y*w*4,(y+1)*w*4);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
function bounds(data,w,h,threshold=64){let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>=threshold){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)throw Error('Empty frame');return {x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};}
function exportKnight(){
 const dir=path.join(__dirname,'knight-reference-v1'),bytes=fs.readFileSync(path.join(dir,'generated-source.png')),source=decodePNG(bytes),directions=['front','back','left','right'],frames=[];
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const x0=Math.round(col*source.w/4),y0=Math.round(row*source.h/4),x1=Math.round((col+1)*source.w/4),y1=Math.round((row+1)*source.h/4),w=x1-x0,h=y1-y0,data=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)source.data.copy(data,y*w*4,((y0+y)*source.w+x0)*4,((y0+y)*source.w+x1)*4);
  frames.push({direction:directions[row],row,col,x0,y0,w,h,data,bounds:bounds(data,w,h)});
 }
 const scale=48/Math.max(...frames.map(f=>f.bounds.height)),size=64,anchor=[32,56],sheet=Buffer.alloc(256*256*4),records=[];
 fs.mkdirSync(path.join(dir,'frames'),{recursive:true});
 for(const f of frames){
  const out=Buffer.alloc(size*size*4),foot=f.bounds.y+f.bounds.height;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const sx=Math.floor(f.w/2+(x+.5-anchor[0])/scale),sy=Math.floor(foot+(y+.5-anchor[1])/scale);
   if(sx<0||sx>=f.w||sy<0||sy>=f.h)continue;
   const si=(sy*f.w+sx)*4,di=(y*size+x)*4;if(f.data[si+3]<64)continue;
   f.data.copy(out,di,si,si+4);
  }
  const name=`${f.direction}-${f.col}.png`,b=bounds(out,size,size);
  fs.writeFileSync(path.join(dir,'frames',name),encodePNG(size,size,out));
  for(let y=0;y<size;y++)out.copy(sheet,((f.row*size+y)*256+f.col*size)*4,y*size*4,(y+1)*size*4);
  records.push({direction:f.direction,frame:f.col,crop:[f.col*size,f.row*size,size,size],anchor,bounds:b,sourceCell:[f.x0,f.y0,f.w,f.h],sourceBounds:f.bounds,sha256:crypto.createHash('sha256').update(out).digest('hex')});
 }
 fs.writeFileSync(path.join(dir,'walk-sheet.png'),encodePNG(256,256,sheet));
 for(let row=0;row<4;row++){const data=Buffer.alloc(256*64*4);sheet.copy(data,0,row*64*256*4,(row+1)*64*256*4);fs.writeFileSync(path.join(dir,directions[row]+'-walk.png'),encodePNG(256,64,data));}
 const manifest={version:1,scope:'standalone preview only',reference:{description:'User-provided Screenshot 2026-11-25 at 11.00.33.png, used as the design reference',bundled:false},source:'generated-source.png',sourceSize:[source.w,source.h],sourceSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),generator:'Built-in image_gen; see prompts.md',exporter:'../prepare-knight.cjs',sheet:'knight-reference-v1/walk-sheet.png',sheetSize:[256,256],cellSize:[64,64],anchor,screenScale:2,maximumVisibleHeight:48,alphaCutoff:64,sharedResampleScale:scale,directions,framesPerDirection:4,cycleMs:600,frames:records};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'knight-data.js'),'// Preview-only generated manifest.\nwindow.KNIGHT_DATA = '+JSON.stringify(manifest)+';\n');
 console.log('Exported 16 frames, 4 strips and transparent 256×256 sheet. Uniform scale:',scale);
}
if(require.main===module)exportKnight();module.exports={decodePNG,encodePNG,bounds,exportKnight};
