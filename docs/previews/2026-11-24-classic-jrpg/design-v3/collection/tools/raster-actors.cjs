// Optional development-only exporter; never loaded by the game.
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');const artFile=path.join(process.env.JRPG_BAKE_DIR||os.tmpdir(),'dungeon-jrpg-baked.json');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});try{const p=await b.newPage();await p.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../index.html')).href);await p.waitForFunction(()=>!!window.jrpgCollection);const result=await p.evaluate(async()=>{
const spec={knight:[32,44,'hero'],slime:[44,28],bat:[64,40],goblin:[40,44],skeleton:[32,40],orc:[64,56],wasp:[52,48],mage:[40,44],healer:[40,44],mimic:[64,44],hydra:[72,64],boar:[72,48],medusa:[48,64],darkWizard:[48,64],skeletonKing:[56,72],dragonBoss:[80,72],cook:[36,44],bartender:[24,30],merchant:[32,40],prisoner:[32,40],princess:[32,50],villager:[32,40],catCompanion:[40,24,'marmalade'],cat:[26,18,'marmalade'],dog:[38,28],chicken:[28,28],sword:[32,40],bow:[48,40],armor:[32,40],helmet:[32,40],shield:[32,40],ring:[32,36],elixir:[24,36],potion:[20,24],chest:[32,28],key:[40,36],townScroll:[32,36],townPortal:[48,56],spellbook:[32,32,'frostbolt'],frostboltTome:[32,32,'frostbolt'],greaterHealTome:[32,32,'greaterHeal'],barrierTome:[32,32,'magicBarrier'],stairsUp:[32,32],stairsDown:[32,32],torch:[24,40],flameOff:[32,40],flameOn:[32,40],spikes:[32,32],rockCrack:[32,32],rockSpent:[40,32],rubble:[40,24],pillar:[32,56],tombstone:[32,36],crystal:[48,48],cookingPot:[40,48],barCounter:[64,48],banner:[40,60],throne:[64,84]};
const dirs=new Set(['knight','goblin','orc','skeleton','mage','healer','merchant','prisoner','princess','villager']);
function cv(w,h){const a=document.createElement('canvas');a.width=w;a.height=h;return a;}
async function raw(name,frame,dir){if(name==='knight'){const a=cv(384,256);jrpgArt.hero(a.getContext('2d'),192,210,dir,frame,true);return a;}
const im=new Image();im.src=jrpgCollection.exportAsset(spec[name][2]||name,frame);await im.decode();const a=cv(384,256);a.getContext('2d').drawImage(im,0,0);return a;}
const output={};
for(const [name,[w,h]]of Object.entries(spec)){
const variants={};let palette={},colorToChar=new Map();let next=0;
for(const dir of dirs.has(name)?['front','back','left','right']:['front']){
variants[dir]=[];
for(let frame=0;frame<4;frame++){
const phase=[0,1,0,2][frame],source=await raw(name,phase===2?0:phase,dir);const sc=source.getContext('2d'),pixels=sc.getImageData(0,0,384,256);let minX=384,maxX=0,minY=256,maxY=0;
for(let y=0;y<256;y++)for(let x=0;x<384;x++){const i=(y*384+x)*4;if(pixels.data[i+3]&&pixels.data[i]===24&&pixels.data[i+1]===44&&pixels.data[i+2]===50&&pixels.data[i+3]<100)pixels.data[i+3]=0;if(pixels.data[i+3]>100){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
sc.putImageData(pixels,0,0);
const dst=cv(w,h),c=dst.getContext('2d');c.imageSmoothingEnabled=false;
// Normalize boss paintings to the existing scale-3 API; other figures use scale 2.
const boss=['mimic','hydra','boar','medusa','darkWizard','skeletonKing','dragonBoss','cook','bartender'].includes(name),factor=Math.min((w-2)/Math.max(2*(192-minX),2*(maxX-192+1)),(h-2)/Math.max(1,210-minY));
const fixedFactor=boss?Math.min(factor,2/3):factor;
c.drawImage(source,0,0,384,256,w/2-192*fixedFactor,h-1-210*fixedFactor,384*fixedFactor,256*fixedFactor);
let data=c.getImageData(0,0,w,h).data;
// Directional NPC/monster silhouettes: separate rear head/garment, narrowed side profile.
if(name!=='knight'&&dirs.has(name)&&dir==='back'){
const hair=['mage','healer'].includes(name)?(name==='mage'?'#666276':'#c5c7a9'):name==='skeleton'?'#c2c1a8':name==='orc'||name==='goblin'?'#839361':name==='princess'?'#b19258':'#65583d';
c.fillStyle=hair;c.fillRect(Math.round(w*.35),Math.round(h*.13),Math.round(w*.3),Math.round(h*.18));c.fillStyle='#ffffff22';c.fillRect(Math.round(w*.42),Math.round(h*.14),1,Math.round(h*.12));
}else if(name!=='knight'&&dirs.has(name)&&(dir==='left'||dir==='right')){
const copy=cv(w,h);copy.getContext('2d').drawImage(dst,0,0);c.clearRect(0,0,w,h);c.save();if(dir==='left'){c.translate(w,0);c.scale(-1,1);}c.drawImage(copy,0,0,w,h,Math.round(w*.13),0,Math.round(w*.75),h);c.restore();}
// Preserve a second stride for all walking figures (their approved rest silhouette stays frame 0).
if(frame%2&& !['slime','bat','wasp','mimic','hydra','medusa','darkWizard','skeletonKing','dragonBoss','torch','flameOn'].includes(name)&&!['sword','bow','armor','helmet','shield','ring','elixir','potion','chest','key','townScroll','townPortal','spellbook','frostboltTome','greaterHealTome','barrierTome','stairsUp','stairsDown','flameOff','spikes','rockCrack','rockSpent','rubble','pillar','tombstone','crystal','cookingPot','barCounter','banner','throne'].includes(name)){
const before=c.getImageData(0,0,w,h),out=c.createImageData(w,h),start=Math.floor(h*.72),stride=frame===1?1:-1;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=y>=start?(x<w/2?-stride:stride):0,dy=y>=start&&((x<w/2)===(stride>0))?-1:0,nx=x+dx,ny=y+dy;if(nx>=0&&nx<w&&ny>=0&&ny<h)out.data.set(before.data.slice((y*w+x)*4,(y*w+x)*4+4),(ny*w+nx)*4);}c.putImageData(out,0,0);}
// Small caster/crown pulses and flame poses use the existing four-frame visual clock.
if(['mage','healer'].includes(name)&&frame%2){const before=cv(w,h);before.getContext('2d').drawImage(dst,0,0);c.clearRect(w-10,0,10,Math.round(h*.35));c.drawImage(before,w-10,0,10,Math.round(h*.35),w-10,frame===1?1:0,10,Math.round(h*.35));}
if(['torch','flameOn'].includes(name)&&frame%2){const copy=cv(w,h);copy.getContext('2d').drawImage(dst,0,0);const flameH=name==='torch'?Math.floor(h*.52):Math.floor(h*.7);c.clearRect(0,0,w,flameH);c.drawImage(copy,0,0,w,flameH,frame===1?1:-1,0,w,flameH);}
data=c.getImageData(0,0,w,h).data;
const rows=[];for(let y=0;y<h;y++){let row='';for(let x=0;x<w;x++){const i=(y*w+x)*4,a=data[i+3];if(a<96){row+='.';continue;}const rgb=[data[i],data[i+1],data[i+2]].map(n=>Math.round(n/8)*8).map(n=>Math.min(255,n));const color='#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('')+(a<220?'b0':'');if(!colorToChar.has(color)){const ch=String.fromCharCode(0x100+next++);colorToChar.set(color,ch);palette[ch]=color;}row+=colorToChar.get(color);}rows.push(row);}variants[dir].push(rows);
}
}output[name]={palette,variants};
}
return output;});fs.writeFileSync(artFile,JSON.stringify(result));console.log('Baked',Object.keys(result).length,'assets');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
