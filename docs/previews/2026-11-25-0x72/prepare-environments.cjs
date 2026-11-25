/* Deterministic environment packaging only; no creative painting, no game imports. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {decodePNG,encodePNG,bounds}=require('./prepare-knight.cjs');
function readPNG(file){const b=fs.readFileSync(file);if(b[25]===6)return decodePNG(b);if(b[24]!==8||b[25]!==2||b[28]!==0)throw Error('Expected RGB/RGBA8 PNG: '+file);
 const w=b.readUInt32BE(16),h=b.readUInt32BE(20),stride=w*3,parts=[];for(let o=8;o<b.length;){const n=b.readUInt32BE(o);if(b.toString('ascii',o+4,o+8)==='IDAT')parts.push(b.subarray(o+8,o+8+n));o+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),rgb=Buffer.alloc(w*h*3),data=Buffer.alloc(w*h*4);const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 for(let y=0;y<h;y++)for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=3?rgb[i-3]:0,bb=y?rgb[i-stride]:0,c=y&&x>=3?rgb[i-stride-3]:0,f=raw[y*(stride+1)];rgb[i]=(raw[y*(stride+1)+x+1]+[0,a,bb,Math.floor((a+bb)/2),paeth(a,bb,c)][f])&255;}
 for(let i=0;i<w*h;i++){rgb.copy(data,i*4,i*3,i*3+3);data[i*4+3]=255;}return {w,h,data};}
function exportEnvironments(partial=false){const root=path.join(__dirname,'environment-v1'),roster=JSON.parse(fs.readFileSync(path.join(root,'roster.json'))),missing=roster.filter(a=>!fs.existsSync(path.join(root,a.id,'generated-source.png')));if(missing.length&&!partial)throw Error('Missing environments: '+missing.map(a=>a.id).join(', '));const assets=[];
 for(const a of roster){const dir=path.join(root,a.id),file=path.join(dir,'generated-source.png');if(!fs.existsSync(file))continue;const src=readPNG(file);let w,h,out,records=[];
 if(a.kind==='material'){
  w=64;h=64;out=Buffer.alloc(w*h*4);
  a.parts.forEach((part,i)=>{const col=i%2,row=Math.floor(i/2),sx0=Math.round(col*src.w/2),sy0=Math.round(row*src.h/2),sw=Math.round((col+1)*src.w/2)-sx0,sh=Math.round((row+1)*src.h/2)-sy0;
   // Nearest-neighbor extraction of full equal-cell material, retaining pattern scale.
   for(let y=0;y<32;y++)for(let x=0;x<32;x++){const sx=sx0+Math.floor((x+.5)*sw/32),sy=sy0+Math.floor((y+.5)*sh/32),di=((row*32+y)*w+col*32+x)*4;src.data.copy(out,di,(sy*src.w+sx)*4,(sy*src.w+sx)*4+4);if(out[di+3]!==255)throw Error('Material contains transparency: '+a.id);}
   records.push({name:part,crop:[col*32,row*32,32,32],sourceCell:[sx0,sy0,sw,sh]});});
 }else{
  const b=bounds(src.data,src.w,src.h),scale=Math.min(a.maxVisible[0]/b.width,a.maxVisible[1]/b.height);w=a.maxVisible[0]+16;h=a.maxVisible[1]+16;out=Buffer.alloc(w*h*4);
  const cx=b.x+b.width/2,foot=b.y+b.height;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.floor(cx+(x+.5-w/2)/scale),sy=Math.floor(foot+(y+.5-(h-8))/scale);if(sx<0||sy<0||sx>=src.w||sy>=src.h)continue;const si=(sy*src.w+sx)*4;if(src.data[si+3]<64)continue;src.data.copy(out,(y*w+x)*4,si,si+4);}
  records=[{name:'sprite',crop:[0,0,w,h],bounds:bounds(out,w,h),anchor:[w/2,h-8],sourceBounds:b,scale}];
 }
 const png=encodePNG(w,h,out);fs.writeFileSync(path.join(dir,'atlas.png'),png);const manifest={...a,file:'environment-v1/'+a.id+'/atlas.png',size:[w,h],records,sha256:crypto.createHash('sha256').update(png).digest('hex'),sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),scope:'standalone review; runtime unchanged'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');assets.push(manifest);
 }
 const data={version:1,complete:!missing.length,missing:missing.map(a=>a.id),assets};fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(data,null,2)+'\n');
 const uri=file=>'data:image/png;base64,'+fs.readFileSync(file).toString('base64');const browser={...data,images:Object.fromEntries(assets.map(a=>[a.id,uri(path.join(__dirname,a.file))])),knight:uri(path.join(__dirname,'knight-reference-v1/walk-sheet.png')),characters:Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname,'characters-v1/manifest.json'))).assets.map(a=>[a.id,uri(path.join(__dirname,a.sheet))]))};
 fs.writeFileSync(path.join(__dirname,'environment-data.js'),'// Preview-only local assets; data URLs permit file:// exports without flags.\nwindow.ENVIRONMENT_DATA = '+JSON.stringify(browser)+';\n');console.log('Exported '+assets.length+'/'+roster.length+' environments');return data;
}
if(require.main===module)exportEnvironments(process.argv.includes('--partial'));module.exports={readPNG,exportEnvironments};
