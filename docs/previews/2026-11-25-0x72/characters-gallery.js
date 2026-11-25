(function(){
 'use strict';let frame=1,direction='front',playing=false,knight=null,atlas=null;const $=id=>document.getElementById(id),art=window.CHARACTER_ART;
 const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Missing '+src));i.src=src;});
 function drawKnight(c,cx,foot){const f=KNIGHT_DATA.frames.find(f=>f.direction===direction&&f.frame===frame),[x,y,w,h]=f.crop;c.drawImage(knight,x,y,w,h,cx-64,foot-112,w*2,h*2);}
 function drawCard(c,a){
  c.imageSmoothingEnabled=false;c.clearRect(0,0,384,288);
  for(let y=0;y<288;y+=64)for(let x=0;x<384;x+=64)c.drawImage(atlas,16,64,16,16,x,y,64,64);
  c.fillStyle='rgba(4,9,14,.25)';c.fillRect(0,0,384,288);c.strokeStyle='rgba(170,205,205,.15)';
  for(let x=0;x<384;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,288);c.stroke();}c.beginPath();c.moveTo(0,240);c.lineTo(384,240);c.stroke();
  c.fillStyle='rgba(0,0,0,.35)';for(const [x,r]of [[48,18],[248,a.group==='boss'?56:24]]){c.beginPath();c.ellipse(x,238,r,6,0,0,Math.PI*2);c.fill();}
  drawKnight(c,48,240);art.draw(c,a.id,248,240,direction,frame,2);
  c.font='11px monospace';c.fillStyle='#e8c68d';c.fillText('approved knight',8,278);c.fillText('new '+a.name,190,278);
 }
 function render(){
  const group=$('group').value;for(const a of art.data.assets){const el=$('card-'+a.id);el.hidden=group!=='all'&&group!==a.group;if(!el.hidden)drawCard(el.querySelector('canvas').getContext('2d'),a);}
  $('pose').textContent=direction+' · frame '+frame+' / 3 · '+(playing?'playing':'paused');$('frame').value=frame;$('play').textContent=playing?'Pause cycles':'Play cycles';$('play').setAttribute('aria-pressed',String(playing));
 }
 function overview(){
  const cv=document.createElement('canvas');cv.width=1536;cv.height=1440;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  c.fillStyle='#101b25';c.fillRect(0,0,cv.width,cv.height);
  const entries=[{id:'knight',name:'Approved knight',group:'approved'},...art.data.assets];
  entries.forEach((a,i)=>{const x=(i%6)*256,y=Math.floor(i/6)*288;c.save();c.beginPath();c.rect(x,y,256,288);c.clip();
   c.strokeStyle='#31434c';c.strokeRect(x+.5,y+.5,255,287);c.fillStyle='#172630';c.fillRect(x+1,y+1,254,238);
   c.strokeStyle='#35464c';c.beginPath();c.moveTo(x,y+240);c.lineTo(x+256,y+240);c.stroke();
   if(a.id==='knight')drawKnight(c,x+128,y+240);else art.draw(c,a.id,x+128,y+240,direction,frame,2);
   c.fillStyle='#e8c68d';c.font='bold 16px Georgia';c.textAlign='center';c.fillText(a.name,x+128,y+260);c.font='11px monospace';c.fillStyle='#9ab1bc';c.fillText(a.group+' · '+direction+' · pose '+frame,x+128,y+278);c.restore();});
  return cv;
 }
 async function init(){try{
  [knight,atlas]=await Promise.all([image(KNIGHT_DATA.sheet),image('assets/atlas.png'),art.loadAll()]);
  for(const a of art.data.assets){
   const card=document.createElement('article');card.className='card';card.id='card-'+a.id;
   const title=document.createElement('h3');title.textContent=a.name+' · '+a.group;card.append(title);
   const canvas=document.createElement('canvas');canvas.width=384;canvas.height=288;canvas.setAttribute('aria-label',a.name+' beside approved knight');card.append(canvas);
   const note=document.createElement('p');note.className='muted';note.textContent=a.motion+' · 4 directions × 4 frames · '+a.cellSize.join('×')+' source cell, 2× display';card.append(note);
   const links=document.createElement('p');links.innerHTML='<a href="'+a.sheet+'">Transparent sheet</a> · <a href="characters-v1/'+a.id+'/manifest.json">Frame manifest</a> · <a href="characters-v1/'+a.id+'/prompt.md">Prompt</a>';card.append(links);
   const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='All 16 frames';detail.append(summary);const img=document.createElement('img');img.src=a.sheet;img.alt=a.name+' all four-direction poses';img.width=a.sheetSize[0]===256?512:a.sheetSize[0];detail.append(img);card.append(detail);$('cards').append(card);
  }
  $('summary').textContent=art.data.assets.length+' / '+art.data.expected+' character sheets · '+art.data.assets.length*16+' transparent frames'+(art.data.complete?' · complete requested roster':' · missing: '+art.data.missing.join(', '));
  $('checks').textContent='Local sheets loaded; '+art.data.assets.length+' roles × 16 poses. Production game not bootstrapped. Missing roles never fall back to old art.';
  if(!art.data.complete)$('checks').className='warning';
  $('direction').addEventListener('change',e=>{direction=e.target.value;render();});$('group').addEventListener('change',render);$('play').addEventListener('click',()=>{playing=!playing;render();});$('frame').addEventListener('input',e=>{playing=false;frame=Number(e.target.value);render();});
  setInterval(()=>{if(playing&&!document.hidden){frame=(frame+1)%4;render();}},180);render();
  window.COLLECTION_REVIEW={overview,state:()=>({frame,direction,playing,group:$('group').value}),render};
 }catch(e){$('checks').textContent='Collection failed: '+e.message;$('checks').className='error';console.error(e);}}
 window.addEventListener('DOMContentLoaded',init);
})();
