(async function(){
  'use strict';
  const TILE=32, SCALE=2, W=18, H=12;
  const manifest = await (await fetch('runtime-inventory.json')).json();
  const pack = await (await fetch('pack-crops.json')).json();
  const crops = Object.fromEntries(pack.crops.map(c=>[c.name,c]));
  const atlas = await loadImage('assets/atlas.png');
  const wallsLow = await loadImage('assets/walls-low.png');
  const floors = await loadImage('assets/floors.png');

  function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error(src)); i.src=src; }); }
  function crop(name){ const c=crops[name]; if(!c) return null; const cv=document.createElement('canvas'); cv.width=c.w; cv.height=c.h; cv.getContext('2d').drawImage(atlas,c.x,c.y,c.w,c.h,0,0,c.w,c.h); return cv; }
  function cropMany(prefix,n=4){ const out=[]; for(let i=0;i<n;i++){ const name=`${prefix}_f${i}`; if(crops[name]) out.push(crop(name)); } return out; }
  function gray(src){ const cv=document.createElement('canvas'); cv.width=src.width; cv.height=src.height; const c=cv.getContext('2d'); c.drawImage(src,0,0); const d=c.getImageData(0,0,cv.width,cv.height).data; for(let i=0;i<d.length;i+=4){ const g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]); d[i]=d[i+1]=d[i+2]=g; } c.putImageData(new ImageData(d,cv.width,cv.height),0,0); return cv; }

  // Before renderer from copied current runtime sprites.js globals.
  const beforeCache={};
  function beforeSprite(name,frame=0,dir='front'){
    const key=name+':'+dir+':'+frame; if(beforeCache[key]) return beforeCache[key];
    const grid=spriteFrameGrid(name,frame,dir), pal=SPRITE_PALETTES[name];
    const w=Math.max(...grid.map(r=>r.length)), cv=document.createElement('canvas'); cv.width=w; cv.height=grid.length;
    const c=cv.getContext('2d');
    for(let y=0;y<grid.length;y++) for(let x=0;x<grid[y].length;x++){ const col=pal[grid[y][x]]; if(!col) continue; c.fillStyle=col; c.fillRect(x,y,1,1); }
    beforeCache[key]=cv; return cv;
  }
  function drawBeforeTile(c, kind, x,y,front,biome='town'){
    c.save(); c.translate(x*TILE,y*TILE);
    const wall = kind==='#';
    const sand = kind==='s';
    if(typeof paintDungeonTile==='function') paintDungeonTile(c, wall, (x*37+y*71)%11, front, biome, sand, x%6,y%6,false,0);
    else { c.fillStyle=wall?'#555':'#334'; c.fillRect(0,0,TILE,TILE); }
    c.restore();
  }
  function drawSpriteCanvas(c, img, cx,cy, scale, label){
    if(!img){ placeholder(c,cx,cy,scale,label); return; }
    const w=img.width*scale, h=img.height*scale;
    c.imageSmoothingEnabled=false; c.drawImage(img, Math.round(cx-w/2), Math.round(cy-h/2), w, h);
  }
  function placeholder(c,cx,cy,scale,label){
    const w=24*scale,h=24*scale,x=cx-w/2,y=cy-h/2;
    c.save(); c.fillStyle='rgba(150,60,60,.35)'; c.strokeStyle='#ff8e8e'; c.lineWidth=1;
    c.fillRect(x,y,w,h); c.strokeRect(x+.5,y+.5,w-1,h-1);
    c.fillStyle='#ffd0d0'; c.font='8px monospace'; c.textAlign='center'; c.fillText('MISSING',cx,cy-2);
    c.fillStyle='#ffb0b0'; c.font='7px monospace'; wrap(c,label,cx,cy+8, w-4,8);
    c.restore();
  }
  function wrap(c,text,x,y,maxW,lineH){ const words=String(text).split(/\s+/); let line='', yy=y; for(const w of words){ const t=line?line+' '+w:w; if(c.measureText(t).width>maxW && line){ c.fillText(line,x,yy); line=w; yy+=lineH; } else line=t; } if(line) c.fillText(line,x,yy); }

  // After scene uses actual crops where obvious; missing are labeled.
  const AFTER = {
    floor: crop('floor_1'),
    floor2: crop('floor_2'),
    wallTop: crop('wall_top_mid'),
    wallMid: crop('wall_mid'),
    wallLeft: crop('wall_left'),
    wallRight: crop('wall_right'),
    wallInner: crop('wall_inner_corner_mid_left') || crop('wall_top_left'),
    column: crop('column_wall') || crop('column'),
    banner: crop('wall_banner_red'),
    doorClosed: crop('doors_leaf_closed'),
    doorOpen: crop('doors_leaf_open'),
    doorFrameL: crop('doors_frame_left'),
    doorFrameR: crop('doors_frame_right'),
    doorFrameT: crop('doors_frame_top'),
    stairs: crop('floor_stairs') || crop('floor_ladder'),
    chest: crop('chest_empty_open_anim_f0'),
    chestOpen: crop('chest_full_open_anim_f0'),
    potion: crop('flask_red'),
    elixir: crop('flask_yellow'),
    spikes: crop('floor_spikes_anim_f0'),
    sword: crop('weapon_knight_sword'),
    bow: crop('weapon_bow'),
    arrow: crop('weapon_arrow'),
    knightF: cropMany('knight_m_idle_anim',4),
    knightRun: cropMany('knight_m_run_anim',4),
    knightHit: [crop('knight_m_hit_anim_f0')],
    goblin: cropMany('goblin_idle_anim',4),
    skelet: cropMany('skelet_idle_anim',4),
    orc: cropMany('orc_warrior_idle_anim',4),
    wizard: cropMany('wizzard_m_idle_anim',4),
  };

  function drawAfterFloor(c,x,y,kind){ const img = (kind==='s') ? AFTER.floor2 : AFTER.floor; c.imageSmoothingEnabled=false; c.drawImage(img||AFTER.floor, x*TILE,y*TILE,TILE,TILE); }
  function drawAfterWall(c,map,x,y){ // illustrative only: uses low-wall atlas pieces; not runtime-accurate topology.
    const wall=map[y][x]==='#'; if(!wall) return;
    const N=y>0&&map[y-1][x]==='#', S=y<H-1&&map[y+1][x]==='#', E=x<W-1&&map[y][x+1]==='#', Ww=x>0&&map[y][x-1]==='#';
    const px=x*TILE, py=y*TILE;
    c.imageSmoothingEnabled=false;
    // base fill
    c.fillStyle='#1a1410'; c.fillRect(px,py,TILE,TILE);
    // choose from low-wall atlas by simple neighborhood
    let src=null;
    if(!S && !E && !Ww) src={img:wallsLow,sx:16,sy:16,sw:16,sh:16};
    else if(!S && !E) src={img:wallsLow,sx:32,sy:16,sw:16,sh:16};
    else if(!S && !Ww) src={img:wallsLow,sx:0,sy:16,sw:16,sh:16};
    else if(!S) src={img:wallsLow,sx:16,sy:16,sw:16,sh:16};
    else if(!N && !E && !Ww) src={img:wallsLow,sx:16,sy:0,sw:16,sh:16};
    else if(!N && !E) src={img:wallsLow,sx:32,sy:0,sw:16,sh:16};
    else if(!N && !Ww) src={img:wallsLow,sx:0,sy:0,sw:16,sh:16};
    else if(!N) src={img:wallsLow,sx:16,sy:0,sw:16,sh:16};
    else src={img:wallsLow,sx:16,sy:32,sw:16,sh:16};
    if(src) c.drawImage(src.img,src.sx,src.sy,src.sw,src.sh,px,py,TILE,TILE);
    c.strokeStyle='rgba(232,198,141,.18)'; c.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
  }

  const SCENES={
    town:{ fog:false, biome:'town', map:[
      '##################',
      '#................#',
      '#..s..........s..#',
      '#..s..........s..#',
      '#..s....##....s..#',
      '#aaaaaaaDDaaaaaaa#',
      '#wwwwwwwbbwwwwwww#',
      '#wwwwwwwbbwwwwwww#',
      '#aaaaaaaDDaaaaaaa#',
      '#..s....ss....s..#',
      '#..s....ss....s..#',
      '##################'
    ], props:[
      {kind:'label',x:2,y:1,text:'Inn/custom'},
      {kind:'after',img:null,label:'Inn',x:3,y:3,scale:2},
      {kind:'after',img:null,label:'Store',x:14,y:3,scale:2},
      {kind:'after',img:null,label:'Hut',x:2,y:9,scale:2},
      {kind:'after',img:null,label:'Hut',x:15,y:9,scale:2},
      {kind:'after',img:null,label:'Tree',x:6,y:2,scale:2},
      {kind:'after',img:null,label:'Tree',x:11,y:2,scale:2},
      {kind:'after',img:null,label:'Bridge',x:8,y:6,scale:2},
      {kind:'after',img:AFTER.doorClosed,label:'Gate/door',x:9,y:4,scale:2},
      {kind:'after',img:null,label:'Water',x:5,y:7,scale:2},
      {kind:'actor',name:'knight',view:'front',x:8,y:9,scale:2},
      {kind:'actor',name:'villager',x:6,y:10,scale:2},
      {kind:'actor',name:'merchant',x:12,y:10,scale:2},
      {kind:'actor',name:'catCompanion',x:6,y:5,scale:2,small:true},
      {kind:'actor',name:'dog',x:11,y:4,scale:2},
    ]},
    dungeon:{ fog:true, biome:'crypt', map:[
      '##################',
      '#.....#.....#....#',
      '#.###.#.###.#.##.#',
      '#.#...#...#...#..#',
      '#.#.#####.#####.##',
      '#...#.....#......#',
      '###.#.###.#.####.#',
      '#...#.#...#.#....#',
      '#.###.#.###.#.##.#',
      '#.....#.....#....#',
      '#.#############..#',
      '##################'
    ], props:[
      {kind:'after',img:AFTER.stairs,label:'stairs',x:2,y:1,scale:2},
      {kind:'after',img:AFTER.chest,label:'chest',x:4,y:5,scale:2},
      {kind:'after',img:AFTER.potion,label:'potion',x:8,y:3,scale:2},
      {kind:'after',img:null,label:'key',x:13,y:5,scale:2},
      {kind:'after',img:AFTER.spikes,label:'spikes',x:14,y:3,scale:2},
      {kind:'after',img:AFTER.column,label:'column',x:10,y:1,scale:2},
      {kind:'after',img:AFTER.banner,label:'banner',x:6,y:1,scale:2},
      {kind:'after',img:AFTER.doorClosed,label:'door',x:8,y:5,scale:2},
      {kind:'actor',name:'knight',view:'side',x:8,y:7,scale:2,frame:1},
      {kind:'actor',name:'slime',x:4,y:3,scale:2},
      {kind:'actor',name:'goblin',x:14,y:1,scale:2},
      {kind:'actor',name:'skeleton',x:15,y:9,scale:2},
      {kind:'actor',name:'catCompanion',x:7,y:7,scale:2,small:true},
    ]}
  };

  function drawScene(key, mode, fogOverride){
    const spec=SCENES[key]; const fog = fogOverride!==undefined?fogOverride:spec.fog;
    const cv=document.createElement('canvas'); cv.width=1152; cv.height=768; const c=cv.getContext('2d');
    c.imageSmoothingEnabled=false; c.fillStyle='#0b1019'; c.fillRect(0,0,1152,768); c.scale(SCALE,SCALE);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const ch=spec.map[y][x];
      const front = ch==='#' && y<H-1 && spec.map[y+1][x]!=='#';
      if(mode==='before') drawBeforeTile(c,ch,x,y,front,spec.biome==='town'?'town':'crypt');
      else { if(ch!=='#') drawAfterFloor(c,x,y,ch); }
    }
    if(mode==='after'){
      for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(spec.map[y][x]==='#') drawAfterWall(c,spec.map,x,y);
    }
    for(const p of spec.props){
      const cx=p.x*TILE+16, cy=p.y*TILE+16;
      if(p.kind==='label') continue;
      if(mode==='before'){
        if(p.kind==='actor') { drawActorBefore(c,p,cx,cy); }
        else drawSpriteCanvas(c, beforeSprite(p.imgName||'chest'), cx,cy, p.scale||2, p.label);
      } else {
        if(p.kind==='actor') drawActorAfter(c,p,cx,cy);
        else drawSpriteCanvas(c,p.img,cx,cy,p.scale||2,p.label);
      }
    }
    if(fog){ const g=c.createRadialGradient(288,192,90,288,192,340); g.addColorStop(0,'rgba(5,9,18,0)'); g.addColorStop(1,'rgba(5,9,18,.68)'); c.fillStyle=g; c.fillRect(0,0,576,384); }
    c.setTransform(1,0,0,1,0,0);
    label(c, `${mode.toUpperCase()} · ${key} · ${fog?'fog':'no fog'}`);
    return cv;
  }
  function drawActorBefore(c,p,cx,cy){
    const dir=p.view==='side'?'left':(p.view==='back'?'back':'front');
    const img=beforeSprite(p.name,p.frame||0,dir);
    const scale=p.small?3:(p.scale||2);
    drawSpriteCanvas(c,img,cx,cy,scale,p.name);
  }
  function drawActorAfter(c,p,cx,cy){
    const scale=p.small?2:(p.scale||2);
    if(p.name==='knight'){
      const frames = p.view==='side'?AFTER.knightRun:AFTER.knightF;
      const img=frames[(p.frame||0)%frames.length];
      drawSpriteCanvas(c,img,cx,cy,scale,p.view==='back'?'knight back(custom)':'knight');
      if(p.view==='back') note(c,cx,cy+26,'missing back pose');
      if(p.view==='side') note(c,cx,cy+26,'side from run frames');
      return;
    }
    const map={goblin:AFTER.goblin[0],skeleton:AFTER.skelet[0],orc:AFTER.orc[0],mage:AFTER.wizard[0]};
    if(map[p.name]) return drawSpriteCanvas(c,map[p.name],cx,cy,scale,p.name);
    if(p.name==='slime') return placeholder(c,cx,cy,scale,'slime');
    placeholder(c,cx,cy,scale,p.name);
  }
  function label(c,text){ c.fillStyle='rgba(11,16,24,.72)'; c.fillRect(8,8,520,22); c.fillStyle='#e8c68d'; c.font='12px monospace'; c.fillText(text,14,23); }
  function note(c,x,y,text){ c.fillStyle='rgba(11,16,24,.75)'; c.fillRect(x-52,y-10,104,14); c.fillStyle='#ffcf8a'; c.font='9px monospace'; c.textAlign='center'; c.fillText(text,x,y); c.textAlign='start'; }

  function mountScene(secId,key){
    const sec=document.getElementById(secId);
    const grid=document.createElement('div'); grid.className='grid'; sec.appendChild(grid);
    const pairs=[['before',false],['after',false],['before-gray',false],['after-gray',false]];
    const before=drawScene(key,'before',SCENES[key].fog);
    const after=drawScene(key,'after',SCENES[key].fog);
    const figs=[['Current · color',before],['0x72 proposal · color (labeled gaps)',after],['Current · grayscale',gray(before)],['0x72 proposal · grayscale',gray(after)]];
    if(SCENES[key].fog){
      const beforeR=drawScene(key,'before',false), afterR=drawScene(key,'after',false);
      figs.push(['Current · revealed topology',beforeR],['0x72 proposal · revealed topology',afterR]);
    }
    for(const [cap,cv] of figs){ const f=document.createElement('figure'); const cc=cv; cc.className='scene'; const fg=document.createElement('figcaption'); fg.textContent=cap; f.append(cc,fg); grid.appendChild(f); }
  }

  mountScene('townSec','town');
  mountScene('dungeonSec','dungeon');

  // frame strips
  const strips=document.getElementById('strips');
  const stripDefs=[
    ['knight_m idle', AFTER.knightF], ['knight_m run', AFTER.knightRun], ['knight_m hit', AFTER.knightHit],
    ['goblin idle', AFTER.goblin], ['skelet idle', AFTER.skelet], ['orc_warrior idle', AFTER.orc], ['wizzard_m idle', AFTER.wizard],
    ['floor_spikes', cropMany('floor_spikes_anim',4)], ['chest_full_open', cropMany('chest_full_open_anim',3)], ['flasks', [crop('flask_red'),crop('flask_blue'),crop('flask_green'),crop('flask_yellow')]],
  ];
  for(const [name,imgs] of stripDefs){
    const row=document.createElement('div'); row.style.margin='10px 0'; row.innerHTML=`<div class="note"><b style="color:#e8c68d">${name}</b></div>`;
    const sc=document.createElement('div'); sc.className='strip';
    for(const img of imgs){ if(!img) continue; const c=document.createElement('canvas'); c.width=img.width*4; c.height=img.height*4; const cx=c.getContext('2d'); cx.imageSmoothingEnabled=false; cx.drawImage(img,0,0,c.width,c.height); sc.appendChild(c); }
    row.appendChild(sc); strips.appendChild(row);
  }

  // summary/table
  const counts={}; for(const a of manifest.assets) counts[a.status]=(counts[a.status]||0)+1;
  document.getElementById('summary').innerHTML = `76 runtime roles. Status counts: ${Object.entries(counts).map(([k,v])=>`<span class="status-${k}">${k}: ${v}</span>`).join(' · ')}. Pack crop rows: ${pack.count}. <br>Hero source size: current 32x44 source px (16x22 logical). 0x72 knight_m is 16x28 source; native 2x to world gives 32x56 before bounds decision — taller than current, so preview/review must decide padding/crop/custom redraw.`;
  const tableWrap=document.getElementById('tableWrap');
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>Role</th><th>Cat</th><th>Current src</th><th>Dirs</th><th>Status</th><th>Pack candidates</th><th>Gap/notes</th></tr></thead>';
  const tb=document.createElement('tbody');
  for(const a of manifest.assets){
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${a.name}${a.alias?` <span class="status-alias">(alias→${a.alias})</span>`:''}</td><td>${a.category}</td><td>${a.source[0]}x${a.source[1]}</td><td>${a.directions.join(', ')}</td><td class="status-${a.status}">${a.status}</td><td>${(a.pack||[]).join(', ')||'—'}</td><td>${a.note}</td>`;
    tb.appendChild(tr);
  }
  tbl.appendChild(tb); tableWrap.appendChild(tbl);

  // checks
  const errors=[]; window.addEventListener('error',e=>errors.push(String(e.message||e)));
  await new Promise(r=>setTimeout(r,250));
  const checks=document.getElementById('checks');
  checks.innerHTML = [
    `Rendered at ${new Date().toISOString()}`,
    `Atlas loaded: ${atlas.width}x${atlas.height}, walls-low: ${wallsLow.width}x${wallsLow.height}, floors: ${floors.width}x${floors.height}`,
    `Crop rows parsed: ${pack.count}`,
    `Runtime roles: ${manifest.count}, unique frames: ${manifest.uniqueFrames}`,
    `Window errors: ${errors.length?errors.join('; '):'none'}`,
    `Network note: standalone preview uses local files only; check browser devtools/network during review for no remote requests.`,
    `No live game bootstrap loaded. No runtime game files modified.`
  ].map(x=>`<div>• ${x}</div>`).join('');
})();
