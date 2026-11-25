/* Shared, preview-only character PNG reader. No gameplay or external requests. */
(function(){
 'use strict';
 const data=window.CHARACTERS_DATA,images=new Map(),byId=new Map(data.assets.map(a=>[a.id,a]));
 function get(id){return byId.get(data.aliases[id]||id);}
 async function loadAll(){await Promise.all(data.assets.map(a=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{if(img.width!==a.sheetSize[0]||img.height!==a.sheetSize[1])return reject(Error('Wrong sheet dimensions '+a.id));images.set(a.id,img);resolve();};img.onerror=()=>reject(Error('Missing character sheet '+a.id));img.src=a.sheet;})));}
 function draw(ctx,id,cx,foot,direction='front',frame=1,scale=2){
  const a=get(id);if(!a)throw Error('Missing character role '+id);const img=images.get(a.id);if(!img)throw Error('Unloaded character '+id);
  const f=a.frames.find(f=>f.direction===direction&&f.frame===frame);if(!f)throw Error('Missing pose '+id+':'+direction+':'+frame);
  const[x,y,w,h]=f.crop,hover=a.anchorMode==='hover-center'?40:0;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x,y,w,h,Math.round(cx-a.anchor[0]*scale),Math.round(foot-hover-a.anchor[1]*scale),w*scale,h*scale);ctx.restore();
 }
 window.CHARACTER_ART={data,get,has:id=>!!get(id),loadAll,draw};
})();
