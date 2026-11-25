/* Standalone final composition, immutable layout snapshots, no game bootstrap. */
(async function(){'use strict';
 const D=ENVIRONMENT_DATA,F=FINAL_FIXTURES,env=new Map(D.assets.map(a=>[a.id,a])),chars=new Map(CHARACTERS_DATA.assets.map(a=>[a.id,a])),items=new Map(ITEM_DATA.assets.map(a=>[a.id,a])),images={},ci={},ii={},heroImage=new Image();
 const $=id=>document.getElementById(id),cv=$('sceneCanvas'),ctx=cv.getContext('2d'),state={scene:'town',frame:1,direction:'front',playing:false,collision:false,fog:false,portal:false},audit={};
 function load(img,src){return new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Missing preview image'));img.src=src;});}
 function requireEnv(id){const a=env.get(id);if(!a||!images[id])throw Error('Missing environment '+id);return a;}
 function tile(c,id,part,x,y,size){const a=requireEnv(id),r=a.records.find(r=>r.name===part);if(!r)throw Error('Missing material '+id+':'+part);c.drawImage(images[id],...r.crop,x,y,size,size);}
 function sprite(c,id,x,foot,scale=2){const a=requireEnv(id),r=a.records[0];c.drawImage(images[id],0,0,...a.size,Math.round(x-r.anchor[0]*scale),Math.round(foot-r.anchor[1]*scale),a.size[0]*scale,a.size[1]*scale);}
 function shadow(c,x,foot,r){c.fillStyle='#070b1360';c.beginPath();c.ellipse(x,foot-3,r,r*.28,0,0,Math.PI*2);c.fill();}
 function actor(c,id,x,foot,scale=2,direction=state.direction){
  shadow(c,x,foot,id==='catCompanion'?15*scale:12*scale);
  if(id==='knight'){const f=KNIGHT_DATA.frames.find(f=>f.direction===direction&&f.frame===state.frame);c.drawImage(heroImage,...f.crop,x-32*scale,foot-56*scale,64*scale,64*scale);return;}
  const a=chars.get(id);if(!a)throw Error('Missing character '+id);const f=a.frames.find(f=>f.direction===direction&&f.frame===state.frame),hover=a.anchorMode==='hover-center'?20*scale:0;
  c.drawImage(ci[id],...f.crop,Math.round(x-a.anchor[0]*scale),Math.round(foot-hover-a.anchor[1]*scale),f.crop[2]*scale,f.crop[3]*scale);
 }
 function item(c,id,x,foot,frame=0,scale=2){const alias=ITEM_DATA.aliases[id];if(alias){id=alias.id;frame=alias.frame;}const a=items.get(id);if(!a)throw Error('Missing item '+id);const f=a.frames[frame%a.frames.length];if(f.empty)return;const b=f.bounds;c.drawImage(ii[id],...f.crop,x-a.cell/2*scale,foot-(b.y+b.height)*scale,a.cell*scale,a.cell*scale);}
 const edgesPalette={crypt:['#9b9e94','#161b20'],cavern:['#8f8879','#171a1c'],kitchen:['#b5a28c','#211c1b'],tavern:['#a38b5d','#19191a'],throne:['#c3b68a','#1b2023']};
 function wall(c,map,b,x,y,left,top,size){
  // Whole wall tile remains opaque. No walkable floor is drawn beneath it.
  const raw=OX72_WALLS.maskAt(map,x,y),p=OX72_WALLS.plan(raw),unit=size/32,[light,dark]=edgesPalette[b];
  c.save();c.beginPath();c.rect(left,top,size,size);c.clip();tile(c,b,'top',left,top,size);c.fillStyle='#050c1466';c.fillRect(left,top,size,size);
  const line=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(left+x*unit,top+y*unit,w*unit,h*unit);};
  if(p.edges&4){const a=requireEnv(b),r=a.records.find(r=>r.name==='face');c.drawImage(images[b],r.crop[0],r.crop[1]+20,32,12,left,top+20*unit,size,12*unit);line(0,18,32,2,light);line(0,31,32,1,dark);}
  if(p.edges&1){line(0,0,32,2,light);line(0,2,32,1,dark);}
  if(p.edges&8){line(0,0,2,32,light);line(2,0,1,32,dark);}
  if(p.edges&2){line(30,0,2,32,light);line(29,0,1,32,dark);}
  for(const [cx,cy]of p.corners)line(cx*2,cy*2,4,4,light);
  c.restore();audit.walls=(audit.walls||0)+1;
 }
 function label(c,text,x,y){c.font='bold 16px Georgia';const w=c.measureText(text).width;c.fillStyle='#0e151bdc';c.fillRect(x-w/2-7,y-18,w+14,24);c.fillStyle='#efd5a6';c.fillText(text,x-w/2,y);}
 function marker(c,x,y,color){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x,y-8);c.lineTo(x+8,y);c.lineTo(x,y+8);c.lineTo(x-8,y);c.closePath();c.stroke();}
 function roadTiles(){const t=F.town,road=new Set();for(let y=16;y<=44;y++)for(let x=20;x<=60;x++)if(t.map[y][x]===0&&((y>=28&&y<=30)||(x>=37&&x<=40)))road.add(x+','+y);
  for(const p of t.props.filter(p=>p.sprite==='doorstep')){const start=p.x+','+p.y,queue=[{x:p.x,y:p.y}],prev=new Map([[start,null]]);let end=null;for(let i=0;i<queue.length&&!end;i++){const at=queue[i],key=at.x+','+at.y;if(road.has(key)){end=key;break;}for(const[dx,dy]of[[0,1],[1,0],[-1,0],[0,-1]]){const q={x:at.x+dx,y:at.y+dy},k=q.x+','+q.y;if(t.map[q.y]?.[q.x]===0&&!prev.has(k)){prev.set(k,key);queue.push(q);}}}while(end){road.add(end);end=prev.get(end);}}
  return road;}
 const roads=roadTiles();
 function drawTown(){const overview=state.scene==='overview',gate=state.scene==='gate',size=overview?32:64,scale=size/32,camera=overview?{x:18,y:14}:gate?{x:43,y:22}:{x:23,y:17},cols=overview?45:18,rows=overview?33:12;
 cv.width=cols*size;cv.height=rows*size;ctx.imageSmoothingEnabled=false;const sx=x=>(x-camera.x)*size,sy=y=>(y-camera.y)*size,t=F.town,layers=[];
 for(let y=camera.y;y<camera.y+rows;y++)for(let x=camera.x;x<camera.x+cols;x++){
  const river=(x===48||x===49)&&y>=16&&y<=44;
  const part=river?'water':roads.has(x+','+y)?(x>=37&&x<=40?'cobble':'dirt'):'grass';tile(ctx,'town',part,sx(x),sy(y),size);
  if(river){ctx.fillStyle='#a18f6f';if(x===48)ctx.fillRect(sx(x),sy(y),3*scale,size);if(x===49)ctx.fillRect(sx(x+1)-3*scale,sy(y),3*scale,size);}
  if((x<20||x>60||y<16||y>44)){ctx.fillStyle='#07120d55';ctx.fillRect(sx(x),sy(y),size,size);if((x+2*y)%3===0)layers.push({foot:y+1,draw:()=>sprite(ctx,'pine',sx(x+.5),sy(y+1),scale)});}
 }
 for(const p of t.props){if(p.sprite==='water')continue;
  if(p.bounds){const b=p.bounds,a=requireEnv(p.sprite),r=a.records[0],width=(b.x1-b.x0+1)*size,height=(b.y1-b.y0+1)*size,fit=width/r.bounds.width;layers.push({foot:b.y1+1,draw:()=>{shadow(ctx,sx((b.x0+b.x1+1)/2),sy(b.y1+1),width*.46);sprite(ctx,p.sprite,sx((b.x0+b.x1+1)/2),sy(b.y1+1),fit);if(p.sprite!=='hut')label(ctx,p.sprite==='inn'?'INN':'GENERAL STORE',sx((b.x0+b.x1+1)/2),sy(b.y1+1)-r.bounds.height*fit-12);}});continue;}
  if(p.sprite==='bridge'){layers.push({foot:p.y+.7,draw:()=>{const a=requireEnv('bridge'),fit=2*size/a.records[0].bounds.width;ctx.save();ctx.translate(sx(49),sy(30));ctx.scale(1,.85);sprite(ctx,'bridge',0,0,fit);ctx.restore();audit.bridgeWidth=2*size;}});continue;}
  if(p.sprite==='doorstep'){layers.push({foot:p.y+.3,draw:()=>sprite(ctx,'doorstep',sx(p.x+.5),sy(p.y+.35),scale)});continue;}
  if(p.sprite==='tree'){layers.push({foot:p.y+1,draw:()=>sprite(ctx,(p.x+p.y)%3===0?'pine':'tree',sx(p.x+.5),sy(p.y+1),scale*1.5)});continue;}
  if(p.sprite==='townGate'){layers.push({foot:p.y+1,draw:()=>{sprite(ctx,'townGate',sx(p.x+.5),sy(p.y+1),scale*1.5);label(ctx,'DUNGEON',sx(p.x+.5),sy(p.y-1.7));}});}
 }
 for(const a of [...t.npcs,...t.animals])layers.push({foot:a.y+1,draw:()=>actor(ctx,a.sprite,sx(a.x+.5),sy(a.y+1),scale*(a.sprite==='catCompanion'?1.5:1))});
 layers.sort((a,b)=>a.foot-b.foot).forEach(l=>l.draw());
 if(state.portal)item(ctx,'townPortal',sx(55.5),sy(30),1+state.frame,scale*1.4);
 const hero=gate?{x:52,y:29}:t.spawn;actor(ctx,'knight',sx(hero.x+.5),sy(hero.y+1),scale);
 if(state.collision){for(let y=camera.y;y<camera.y+rows;y++)for(let x=camera.x;x<camera.x+cols;x++)if(t.map[y]?.[x]!==0){ctx.fillStyle='#e85b5b40';ctx.fillRect(sx(x),sy(y),size,size);}for(const a of Object.values(t.landmarks))marker(ctx,sx(a.x+.5),sy(a.y+.5),'#a0f2b7');}
 audit.hero={...hero};audit.townPeaceful=true;audit.actors=t.npcs.length+t.animals.length+1;
 $('sceneTitle').textContent=overview?'The whole village':gate?'Across the bridge, toward the dungeon':'The village · Inn and market';$('sceneDescription').textContent='Current town layout, buildings, river crossing and interaction points. New roofs, timber, stonework, trees and ground materials; reviewed NPCs and animals. Hero is drawn last. '+(overview?'Overview at half play scale.':'Actual 1152 × 768 play scale.');
 }
 const info={crypt:['Crypt','Large worn flagstones, dark masonry, graves and torchlight.'],cavern:['Cavern','Natural rough rock and angular crystals; no brick pattern.'],kitchen:['Kitchen · the Cook','Worn ceramic checker tiles, warm brick and iron cooking pots.'],tavern:['Tavern · the Bartender','Broad oak floorboards, heavy timber walls, counters and barrels.'],throne:['Skeleton King throne room','Carved pale masonry, polished stone, gold accents, crimson banners and the saved stepped dais.'],dragon:['Depth 100 · Dragon hall','Wide final arena, royal materials, a large dragon and the princess.']};
 function drawDungeon(){const s=F.scenes.find(s=>s.id===state.scene);if(!s)throw Error('Missing scene '+state.scene);cv.width=1152;cv.height=768;ctx.imageSmoothingEnabled=false;const size=64,camera=s.camera,sx=x=>(x-camera.x)*size,sy=y=>(y-camera.y)*size,map=s.map.map(r=>r.map(v=>v===1?'#':'.').join('')),b=s.biome,layers=[];
 for(let y=camera.y;y<camera.y+12;y++)for(let x=camera.x;x<camera.x+18;x++){
  const blocked=s.map[y]?.[x]===1;if(blocked){wall(ctx,map,b,x,y,sx(x),sy(y),size);continue;}
  const carpet=b==='throne'&&Math.abs(x-s.room.cx)<=1&&y>=s.room.y+2;
  const part=b==='throne'?(carpet?'accent':'floor'):((x*17+y*11)%19===0?'accent':'floor');
  if(carpet){const a=requireEnv(b),r=a.records.find(r=>r.name==='accent'),left=x===s.room.cx-1?0:2,right=x===s.room.cx+1?32:30;ctx.drawImage(images[b],r.crop[0]+left,r.crop[1],right-left,32,sx(x),sy(y),size,size);}else tile(ctx,b,part,sx(x),sy(y),size);
  if(s.map[y]?.[x]===2)layers.push({foot:y+1,draw:()=>sprite(ctx,'rock',sx(x+.5),sy(y+1),2)});
 }
 const inView=p=>p.x>=camera.x&&p.x<camera.x+18&&p.y>=camera.y&&p.y<camera.y+12;
 const theme={crypt:'tombstone',cavern:'crystal',kitchen:'cookingPot',tavern:'barCounter',throne:'pillar',dragon:'pillar'}[s.id];
 for(const p of s.props){if(!inView(p))continue;const id=p.sprite==='throne'?'dais':p.sprite==='tombstone'&&b==='throne'?'pillar':env.has(p.sprite)?p.sprite:null;if(id)layers.push({foot:p.y+1,draw:()=>sprite(ctx,id,sx(p.x+.5),sy(p.y+1),2)});else if(items.has(p.sprite))layers.push({foot:p.y+1,draw:()=>item(ctx,p.sprite,sx(p.x+.5),sy(p.y+1),state.frame)});else throw Error('Unmapped saved prop '+p.sprite);}
 // Extra review props use walkable unoccupied tiles. No layout or gameplay mutation.
 const occupied=[s.hero,s.companion,...s.actors];const reviewProps=[];
 for(const [ox,oy]of[[2,3],[15,3],[3,7],[15,10]]){const p={x:camera.x+ox,y:camera.y+oy};if(s.map[p.y]?.[p.x]===0&&occupied.every(a=>Math.max(Math.abs(a.x-p.x),Math.abs(a.y-p.y))>=2)){reviewProps.push(p);layers.push({foot:p.y+1,draw:()=>sprite(ctx,theme,sx(p.x+.5),sy(p.y+1),2)});}}
 for(const p of [s.stairs,s.upstairs].filter(Boolean)){if(inView(p))layers.push({foot:p.y+.8,draw:()=>item(ctx,p===s.stairs?'stairsDown':'stairsUp',sx(p.x+.5),sy(p.y+1))});}
 for(const x of [camera.x+3,camera.x+13]){let y=camera.y;while(y<camera.y+4&&s.map[y]?.[x]!==1)y++;if(y<camera.y+4)layers.push({foot:y+.8,draw:()=>item(ctx,'torch',sx(x+.5),sy(y+.9),state.frame)});}
 if(s.id==='throne'||s.id==='dragon')for(const x of [camera.x+5,camera.x+14])if(s.map[camera.y]?.[x]===1)layers.push({foot:camera.y+1,draw:()=>sprite(ctx,'banner',sx(x+.5),sy(camera.y+1),2)});
 for(const a of s.actors)layers.push({foot:a.y+1,draw:()=>actor(ctx,a.sprite,sx(a.x+.5),sy(a.y+1),2,a.direction)});
 if(s.id==='dragon'){const p={x:camera.x+15,y:camera.y+6};if(s.map[p.y]?.[p.x]===0)layers.push({foot:p.y+1,draw:()=>actor(ctx,'princess',sx(p.x+.5),sy(p.y+1),2)});}
 const companionSprite=s.depth<5?'catCompanion':s.depth<40?'mimic':'darkWizard';
 layers.push({foot:s.companion.y+1,draw:()=>actor(ctx,companionSprite,sx(s.companion.x+.5),sy(s.companion.y+1),s.depth<5?3:.55)});
 layers.sort((a,b)=>a.foot-b.foot).forEach(l=>l.draw());actor(ctx,'knight',sx(s.hero.x+.5),sy(s.hero.y+1));
 if(state.fog){for(let y=camera.y;y<camera.y+12;y++)for(let x=camera.x;x<camera.x+18;x++){const d=Math.max(Math.abs(x-s.hero.x),Math.abs(y-s.hero.y));if(d>5){ctx.fillStyle=d>7?'#050912ed':'#05091299';ctx.fillRect(sx(x),sy(y),size,size);}}}
 if(state.collision)for(let y=camera.y;y<camera.y+12;y++)for(let x=camera.x;x<camera.x+18;x++){const v=s.map[y]?.[x];if(v){ctx.fillStyle=v===1?'#e85b5b48':'#e8be5748';ctx.fillRect(sx(x),sy(y),size,size);}}
 audit.actors=s.actors.length+2;audit.hero=s.hero;audit.reviewProps=reviewProps;audit.layoutDepth=s.depth;
 $('sceneTitle').textContent=info[s.id][0];$('sceneDescription').textContent=info[s.id][1]+' Real generated depth-'+s.depth+' map; encounter/extra prop positions staged only for artwork. '+(s.id==='throne'?'Existing throne-room prop coordinates are retained.':'');
 }
 function render(){audit.walls=0;state.scene==='town'||state.scene==='gate'||state.scene==='overview'?drawTown():drawDungeon();}
 try{
  await Promise.all([load(heroImage,D.knight),...D.assets.map(a=>{images[a.id]=new Image();return load(images[a.id],D.images[a.id]);}),...CHARACTERS_DATA.assets.map(a=>{ci[a.id]=new Image();return load(ci[a.id],D.characters[a.id]);}),...ITEM_DATA.assets.map(a=>{ii[a.id]=new Image();return load(ii[a.id],ITEM_DATA.imageData[a.id]);})]);
  if(!D.complete)throw Error('Environment collection incomplete: '+D.missing.join(', '));
  for(const a of D.assets.filter(a=>a.kind==='material')){const article=document.createElement('article'),h=document.createElement('h3'),c=document.createElement('canvas'),p=document.createElement('small');h.textContent=a.id;c.width=c.height=64;c.getContext('2d').drawImage(images[a.id],0,0);p.textContent=a.parts.join(' · ');article.append(h,c,p);$('materials').append(article);}
  $('scene').onchange=e=>{state.scene=e.target.value;render();};$('direction').onchange=e=>{state.direction=e.target.value;render();};
  for(const id of ['collision','fog','portal'])$(id).onchange=e=>{state[id]=e.target.checked;render();};
  $('play').onclick=()=>{state.playing=!state.playing;$('play').textContent=state.playing?'Pause poses':'Play poses';};
  $('download').onclick=()=>{const a=document.createElement('a');a.href=cv.toDataURL();a.download='dungeon-graphics-'+state.scene+'.png';a.click();};
  let last=0;function tick(t){if(!document.hidden&&state.playing&&t-last>=150){state.frame=(state.frame+1)%4;last=t;render();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
  render();$('status').textContent=D.assets.length+' environment families loaded locally. All graphics remain review assets; playable release is unchanged at 1.0.1.';window.FINAL_REVIEW={state,render,audit,fixtures:F,materials:D.assets.filter(a=>a.kind==='material').map(a=>a.id),wall};
 }catch(e){$('status').textContent='Preview failed: '+e.message;throw e;}
})();
