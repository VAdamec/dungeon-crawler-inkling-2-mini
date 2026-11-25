/* Preview-only sheet painter, independent of game and export code. */
(function(){
 const images=new Map(),assets=new Map(ITEM_DATA.assets.map(a=>[a.id,a]));
 function get(id){const alias=ITEM_DATA.aliases[id],a=assets.get(alias?alias.id:id);if(!a)throw Error('Missing item art: '+id);return {a,frame:alias?.frame};}
 async function loadAll(){await Promise.all(ITEM_DATA.assets.map(a=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(a.id,img);resolve();};img.onerror=()=>reject(Error('Missing item PNG '+a.sheet));img.src=a.sheet;})));}
 function draw(ctx,id,x,foot,frame=0,scale=2){const found=get(id),a=found.a,f=a.frames[(found.frame??frame)%a.frames.length],img=images.get(a.id);if(!img)throw Error('Item not loaded: '+id);if(f.empty)return;ctx.imageSmoothingEnabled=false;const b=f.bounds;ctx.drawImage(img,...f.crop,x-a.cell/2*scale,foot-(b.y+b.height)*scale,a.cell*scale,a.cell*scale);}
 window.ITEM_ART={get,loadAll,draw};
})();
