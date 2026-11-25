/* Isolated file:// art review. Does not load game.js or mutate game state. */
(async function(){
 const data=window.ITEM_DATA,images={},cards=[],state={frame:0,playing:true},floor=new Image(),knight=new Image();
 function load(img,src){return new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Cannot load '+src));img.src=src;});}
 try{
 await Promise.all([load(floor,data.floorData),load(knight,data.knightData),...data.assets.map(a=>{images[a.id]=new Image();return load(images[a.id],data.imageData[a.id]);})]);
 const group=document.getElementById('group');[...new Set(data.assets.map(a=>a.group))].forEach(g=>{const o=document.createElement('option');o.value=o.textContent=g;group.append(o);});
 function tile(ctx,x,y){ctx.imageSmoothingEnabled=false;ctx.drawImage(floor,0,0,16,16,x,y,64,64);}
 function drawAsset(ctx,a,x,y,frame){const f=a.frames[frame%a.frames.length],c=f.crop;ctx.drawImage(images[a.id],...c,x-a.cell,y-a.cell,a.cell*2,a.cell*2);}
 function drawCard(ctx,a,frame){
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#252c38';ctx.fillRect(0,0,320,200);ctx.fillStyle='#303745';ctx.fillRect(0,145,320,55);
 tile(ctx,180,132);tile(ctx,64,132);
 // Match approved knight's 64px cell and 2× scale; foot at y=190.
 ctx.drawImage(knight,64,0,64,64,32,78,128,128);
 const grounded=['hazards','stairs','travel'].includes(a.group);
 const bottom=Math.max(...a.frames.filter(f=>f.bounds).map(f=>f.bounds.y+f.bounds.height));
 const y=grounded?190-(bottom-a.cell/2)*2:(['equipment','books','loot'].includes(a.group)?150:124);
 drawAsset(ctx,a,212,y,frame);
 ctx.fillStyle='#cec5b1';ctx.font='12px system-ui';ctx.fillText('knight · same scale',18,20);ctx.fillText('64px tile',180,20);
 }
 data.assets.forEach(a=>{const card=document.createElement('article'),h=document.createElement('h2'),canvas=document.createElement('canvas'),p=document.createElement('p');h.textContent=a.id;canvas.width=320;canvas.height=200;card.dataset.id=a.id;card.dataset.group=a.group;p.textContent='';card.append(h,canvas,p);document.getElementById('cards').append(card);cards.push({a,card,canvas,p});});
 function render(){for(const c of cards){drawCard(c.canvas.getContext('2d'),c.a,state.frame);c.p.textContent=c.a.frames[state.frame%c.a.frames.length].label;}document.getElementById('phase').value=state.frame;document.getElementById('phaseLabel').textContent=state.frame;}
 group.onchange=()=>cards.forEach(c=>c.card.hidden=group.value!=='all'&&c.a.group!==group.value);
 document.getElementById('play').onclick=()=>{state.playing=!state.playing;document.getElementById('play').textContent=state.playing?'Pause':'Play';};
 document.getElementById('phase').oninput=e=>{state.playing=false;document.getElementById('play').textContent='Play';state.frame=+e.target.value;render();};
 const proof=document.getElementById('hiddenProof'),ctx=proof.getContext('2d');ctx.fillStyle='#252c38';ctx.fillRect(0,0,480,128);tile(ctx,88,32);tile(ctx,328,32);
 const before=ctx.getImageData(328,32,64,64).data;const spikes=data.assets.find(a=>a.id==='spikes');
 if(spikes)drawAsset(ctx,spikes,360,64,0);
 const after=ctx.getImageData(328,32,64,64).data;const equal=!!spikes&&before.every((v,i)=>v===after[i]);
 document.getElementById('proofResult').textContent=equal?'PASS: hidden spikes leave every floor pixel unchanged.':'Incomplete: hidden spike export still pending.';
 function overview(){const out=document.createElement('canvas');out.width=1280;out.height=Math.ceil(cards.length/4)*240;const c=out.getContext('2d');c.fillStyle='#171b23';c.fillRect(0,0,out.width,out.height);cards.forEach((r,i)=>{const x=i%4*320,y=Math.floor(i/4)*240;c.drawImage(r.canvas,x,y);c.fillStyle='#eee0bf';c.font='16px system-ui';c.fillText(r.a.id,x+12,y+223);});return out;}
 document.getElementById('overview').onclick=()=>{const a=document.createElement('a');a.download='items-effects-overview.png';a.href=overview().toDataURL();a.click();};
 render();let last=0;function tick(t){if(!document.hidden&&state.playing&&t-last>=250){state.frame=(state.frame+1)%5;render();last=t;}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 document.getElementById('status').textContent=data.complete?`${cards.length} families loaded locally. Review pending.`:`DRAFT: ${cards.length} families ready; ${data.missing.length} generating.`;
 window.ITEM_REVIEW={state,render,overview,hiddenIdentical:equal,data,cards};
 }catch(e){document.getElementById('status').textContent=e.message;throw e;}
})();
