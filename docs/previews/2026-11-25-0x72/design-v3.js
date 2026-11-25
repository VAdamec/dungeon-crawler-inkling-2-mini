/* 0x72 focus preview v3 — standalone, file://, no live-game bootstrap.
   Draws actual pack crops at the game's 1152x768 play size.

   Scale: a pack 16x16 tile is drawn at 64x64 screen pixels (4x). The 0x72
   knight is 16x28 source, so 64x112 screen. The current-art comparison uses
   the copied 1.0.1 painters at their real screen scale for an honest match.

   No gameplay code is imported. before-sprites.js is a read-only copy of the
   current painters, used only for the visual comparison. */
(function () {
  'use strict';

  const TILE = 64;
  const W = 1152;
  const H = 768;
  const S = 4; // pack px -> screen px
  const DATA = window.DESIGN_DATA;

  let atlas = null, lowWalls = null, knightSheet = null;
  const KNIGHT=window.KNIGHT_DATA;
  let knightDirection='front',knightFrame=1,knightPlaying=false;
  const wallCache = new Map();
  let overlayOpen = false;
  const requiredCrops = new Set();
  const cropCache = new Map();

  const $ = (id) => document.getElementById(id);

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load ' + src));
      img.src = src;
    });
  }

  function crop(name) {
    if (cropCache.has(name)) return cropCache.get(name);
    const c = DATA.crops[name];
    if (!c || !atlas) throw new Error('Missing required crop: '+name);
    if(c.length!==4 || c.some(n=>!Number.isInteger(n)) || c[0]<0 || c[1]<0 || c[2]<=0 || c[3]<=0 || c[0]+c[2]>atlas.width || c[1]+c[3]>atlas.height)throw new Error('Invalid crop bounds: '+name);
    requiredCrops.add(name);
    const cv = document.createElement('canvas');
    cv.width = c[2];
    cv.height = c[3];
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, c[0], c[1], c[2], c[3], 0, 0, c[2], c[3]);
    cropCache.set(name, cv);
    return cv;
  }

  function drawCropAt(ctx, name, left, top, scale = S, alpha = 1) {
    const img = crop(name);
    if (!img) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(left), Math.round(top), img.width * scale, img.height * scale);
    ctx.restore();
    return true;
  }

  function drawCropBottom(ctx, name, cx, footY, scale = S, alpha = 1) {
    const img = crop(name);
    if (!img) return false;
    return drawCropAt(ctx, name, cx - img.width * scale / 2, footY - img.height * scale, scale, alpha);
  }

  function drawCropCenter(ctx, name, cx, cy, scale = S, alpha = 1) {
    const img = crop(name);
    if (!img) return false;
    return drawCropAt(ctx, name, cx - img.width * scale / 2, cy - img.height * scale / 2, scale, alpha);
  }

  function drawCell(ctx, name, x, y, alpha = 1) {
    drawCropAt(ctx, name, x * TILE, y * TILE, S, alpha);
  }

  function hash(x, y, salt = 0) {
    let h = (x * 374761393 + y * 668265263 + salt * 1442695041) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return h;
  }

  const FLOORS = ['floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6'];

  /* ---------------------------------------------------------------- */
  /* Wall construction                                                 */
  /* ---------------------------------------------------------------- */

  const wallAt = window.OX72_WALLS.wallAt;
  function wallTile(map,x,y) {
    const mask=window.OX72_WALLS.maskAt(map,x,y);
    if(!wallCache.has(mask)) {
      const cv=document.createElement('canvas');cv.width=cv.height=16;
      window.OX72_WALLS.paint(cv.getContext('2d'),lowWalls,atlas,DATA.crops.wall_mid,mask);
      wallCache.set(mask,cv);
    }
    return wallCache.get(mask);
  }
  function drawRoom(ctx,map,before) {
    for(let y=0;y<map.length;y++)for(let x=0;x<map[0].length;x++) {
      const wall=map[y][x]==='#';
      if(before) {
        const cv=document.createElement('canvas');cv.width=cv.height=32;
        paintDungeonTile(cv.getContext('2d'),wall,(x*37+y*71)%11,!!(beforeEdges(map,x,y)&4),'crypt',false,x%6,y%6,0,wall?beforeEdges(map,x,y):0);
        ctx.drawImage(cv,x*TILE,y*TILE,TILE,TILE);
      } else if(wall)ctx.drawImage(wallTile(map,x,y),x*TILE,y*TILE,TILE,TILE);
      else {
        drawCell(ctx,FLOORS[hash(x,y)%FLOORS.length],x,y);
        if(map[y][x]==='~')drawCell(ctx,'floor_7',x,y);
      }
      // Identical contact shadow in both comparison panels.
      if(!wall) {
        ctx.fillStyle='rgba(13,21,40,0.25)';
        if(y>0&&map[y-1][x]==='#')ctx.fillRect(x*TILE,y*TILE,TILE,14);
        if(x>0&&map[y][x-1]==='#')ctx.fillRect(x*TILE,y*TILE,10,TILE);
      }
    }
  }
  function drawOverlay(ctx,map) {
    if(!overlayOpen)return;
    ctx.save();ctx.font='12px monospace';ctx.textAlign='center';
    for(let y=0;y<map.length;y++)for(let x=0;x<map[0].length;x++){
      ctx.fillStyle=map[y][x]==='#'?'rgba(255,80,70,0.24)':'rgba(80,220,160,0.08)';
      ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);
      if(map[y][x]==='#'){ctx.fillStyle='#fff';ctx.fillText('BLOCKED',x*TILE+32,y*TILE+34);}
    }ctx.restore();
  }

  function beforeEdges(map, x, y) {
    let edges = 0;
    for (const [dx, dy, bit] of [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]]) {
      const nx = x + dx, ny = y + dy;
      if (ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length && map[ny][nx] !== '#') edges |= bit;
    }
    return edges;
  }

  /* ---------------------------------------------------------------- */
  /* Light + fog                                                       */
  /* ---------------------------------------------------------------- */

  function drawGlow(ctx, cx, cy, r, rgb, alpha) {
    const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(0.42, 'rgba(' + rgb + ',' + (alpha * 0.52) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  function drawAtmosphere(ctx,opts={}) {
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgba(150,168,206,0.12)';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();
    if(opts.lights!==false)for(const p of HERO_WALL_PROPS)if(p.kind==='torch')drawTorchLight(ctx,p.x,p.y,0.8);
    if(opts.fog)drawFog(ctx,7.5,8);
  }

  // Torch position is the tile holding the flame. The bowl is the tile below.
  function drawTorchLight(ctx, tx, ty, strength) {
    const cx = (tx + 0.5) * TILE;
    const cy = (ty + 0.62) * TILE;
    drawGlow(ctx, cx, cy, 235 * strength, '255,158,64', 0.20 * strength);
    drawGlow(ctx, cx, cy, 70, '255,196,120', 0.30 * strength);
  }

  function drawFog(ctx, fx, fy) {
    const cx = fx * TILE, cy = fy * TILE;
    const g = ctx.createRadialGradient(cx, cy, TILE * 1.7, cx, cy, TILE * 6.2);
    g.addColorStop(0, 'rgba(3,6,11,0)');
    g.addColorStop(0.5, 'rgba(3,6,11,0.34)');
    g.addColorStop(1, 'rgba(3,6,11,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(3,6,11,0.12)';
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------------------------------------------------------------- */
  /* Dungeon hero scene                                                */
  /* ---------------------------------------------------------------- */

  const HERO_MAP = [
    '##################',
    '##################',
    '##################',
    '#................#',
    '#..........####..#',
    '#..........####..#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '..................'
  ];

  const HERO_WALL_PROPS = [
    { kind: 'door', x: 7, y: 1 },
    { kind: 'torch', x: 3, y: 1 },
    { kind: 'torch', x: 12, y: 1 },
    { kind: 'banner', x: 1, y: 1, color: 'red' },
    { kind: 'banner', x: 16, y: 1, color: 'blue' },
    { kind: 'banner', x: 10, y: 1, color: 'green' }
  ];

  const HERO_PROPS = [
    { kind: 'column', x: 1, y: 3 },
    { kind: 'column', x: 16, y: 8 },
    { kind: 'chest', x: 3, y: 9 },
    { kind: 'potion', x: 4, y: 9 },
    { kind: 'sword', x: 2, y: 7 },
    { kind: 'stairs', x: 9, y: 10 },
    { kind: 'spikes', x: 11, y: 9 },
    { kind: 'potion', x: 15, y: 3 }
  ];

  const HERO_ACTORS = [
    { kind: 'knight', x: 7, y: 7 },
    { kind: 'slime', x: 3, y: 4 },
    { kind: 'bat', x: 5, y: 5 },
    { kind: 'wasp', x: 10, y: 7 },
    { kind: 'cat', x: 8, y: 7 },
    { kind: 'orc', x: 2, y: 5 },
    { kind: 'goblin', x: 9, y: 4 },
    { kind: 'wizzard', x: 15, y: 5 },
    { kind: 'skelet', x: 12, y: 7 },
    { kind: 'goblin', x: 13, y: 9 }
  ];

  const ACTOR_CROP = {
    knight: 'knight_m_idle_anim_f0',
    goblin: 'goblin_idle_anim_f0',
    skelet: 'skelet_idle_anim_f0',
    chort: 'chort_idle_anim_f0',
    orc: 'orc_warrior_idle_anim_f0',
    wizzard: 'wizzard_m_idle_anim_f0',
    swampy: 'swampy_anim_f0',
    mimic: 'chest_mimic_open_anim_f0',
    imp: 'imp_idle_anim_f0',
    knightF: 'knight_f_idle_anim_f0',
    elfM: 'elf_m_idle_anim_f0',
    dwarfM: 'dwarf_m_idle_anim_f0',
    lizardM: 'lizard_m_idle_anim_f0',
    doc: 'doc_idle_anim_f0',
    pumpkin: 'pumpkin_dude_idle_anim_f0'
  };

  const BEFORE_ACTOR = {slime:'slime',bat:'bat',wasp:'wasp',
    knight: 'knight', cat: 'catCompanion', goblin: 'goblin', imp: 'slime',
    chort: 'orc', skelet: 'skeleton', orc: 'orc', wizzard: 'mage',
    swampy: 'slime', mimic: 'mimic', knightF: 'knight', elfM: 'knight',
    dwarfM: 'knight', lizardM: 'orc', doc: 'villager', pumpkin: 'merchant'
  };

  function drawTorch(ctx, x, y, frame) {
    // The red "wall_fountain" family is the pack's wall torch: a flame tile
    // over an oil bowl. It is two tiles tall, mounted on the two face rows.
    drawCell(ctx, 'wall_fountain_mid_red_anim_f' + (frame % 3), x, y);
    drawCell(ctx, 'wall_fountain_basin_red_anim_f' + ((frame + 1) % 3), x, y + 1);
  }

  function drawBanner(ctx, x, y, color) {
    drawCell(ctx, 'wall_banner_' + color, x, y);
  }

  function drawFountain(ctx, x, y) {
    drawCell(ctx, 'wall_fountain_top_1', x, y);
    drawCell(ctx, 'wall_fountain_mid_blue_anim_f0', x, y + 1);
    drawCell(ctx, 'wall_fountain_basin_blue_anim_f0', x, y + 2);
    drawGlow(ctx, x * TILE + 32, (y + 1) * TILE + 46, 170, '92,168,220', 0.12);
  }

  function drawDoor(ctx, x, y) {
    // doors_leaf_* is 32x32 and already contains its full stone arch, so it is
    // drawn straight over the two face rows with no extra frame.
    drawCropAt(ctx, 'doors_leaf_closed', x * TILE, y * TILE, S);
  }

  function drawWallProps(ctx) {
    for (const p of HERO_WALL_PROPS) {
      if (p.kind === 'door') drawDoor(ctx, p.x, p.y);
      else if (p.kind === 'torch') drawTorch(ctx, p.x, p.y, 1);
      else if (p.kind === 'banner') drawBanner(ctx, p.x, p.y, p.color);
      else if (p.kind === 'fountain') drawFountain(ctx, p.x, p.y);
      else if (p.kind === 'hole') drawCell(ctx, 'wall_hole_1', p.x, p.y);
      else if (p.kind === 'goo') drawCell(ctx, 'wall_goo', p.x, p.y);
    }
  }

  function drawFloorProp(ctx, p) {
    const cx = p.x * TILE + TILE / 2;
    const foot = (p.y + 1) * TILE;
    switch (p.kind) {
      case 'column': drawCropBottom(ctx, 'column', cx, foot, S); break;
      case 'chest': ITEM_ART.draw(ctx, 'chest', cx, foot, 0); break;
      case 'potion': ITEM_ART.draw(ctx, 'potion', cx, foot); break;
      case 'sword': ITEM_ART.draw(ctx, 'sword', cx, foot); break;
      case 'skull': drawCropBottom(ctx, 'skull', cx, foot - 10, S); break;
      case 'crate': drawCropBottom(ctx, 'crate', cx, foot, S); break;
      case 'stairs': ITEM_ART.draw(ctx, 'stairsDown', cx, foot); break;
      case 'spikes': ITEM_ART.draw(ctx, 'spikesHidden', cx, foot); break;
      case 'rubble': drawCell(ctx, 'floor_8', p.x, p.y); break;
      default: throw new Error('Unknown floor prop: '+p.kind);
    }
  }

  const CHARACTER_ROLES={cat:'catCompanion',wizzard:'mage',skelet:'skeleton'};
  function drawActor(ctx,a){
    if(a.kind==='knight'){drawKnight(ctx,(a.x+0.5)*TILE,(a.y+1)*TILE);return;}
    const role=CHARACTER_ROLES[a.kind]||a.kind;
    if(window.CHARACTER_ART.has(role)){window.CHARACTER_ART.draw(ctx,role,(a.x+0.5)*TILE,(a.y+1)*TILE,knightDirection,knightFrame);return;}

    if(a.kind==='cat')throw Error('Marmalade missing from character collection');
    const name = ACTOR_CROP[a.kind];
    if (!name) throw new Error('Unknown actor role: '+a.kind);
    // Pack actors are cropped at the feet; a 4px lift keeps them on the floor
    // rather than floating on the tile boundary.
    drawCropBottom(ctx, name, a.x * TILE + TILE / 2, (a.y + 1) * TILE, S);

  }

  function drawActorShadow(ctx, x, y, name) {
    const img = crop(name);
    if (!img) return;
    const w = Math.min(img.width * S * 0.6, TILE * 0.8);
    const cx = x * TILE + TILE / 2;
    const cy = (y + 1) * TILE - 3;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, w / 2);
    g.addColorStop(0, 'rgba(2,4,8,0.5)');
    g.addColorStop(1, 'rgba(2,4,8,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Custom addition: the pack has no cat. 14x14 grid, drawn at 4x like the
  // rest of the scene, warm palette with a red collar and gold tag so it reads
  // as Marmalade rather than a generic blob.
  const CAT_GRID = [
    '..............',
    '...o......o...',
    '..oPo....oPo..',
    '..obbo..obbo..',
    '..obbbbbbbbo..',
    '.obbbbbbbbbbo.',
    '.obkbbbbbbkbo.',
    '.obbbbllbbbbo.',
    '.obbbllllbbbo.',
    '.obbbbbbbbbbo.',
    '.obbrrrrrrbbo.',
    '.odbbbbgbbbdo.',
    '.obbbbbbbbbbo.',
    '...oo..oo..o..'
  ];
  const CAT_PALETTE = {
    o: '#241b15',
    b: '#c98a4b',
    l: '#eccb96',
    P: '#d99a8f',
    k: '#161c20',
    r: '#a8433c',
    g: '#e8c25a',
    d: '#8a5a33'
  };

  function drawCustomCat(ctx, x, y) {
    const u = 4;
    const w = CAT_GRID[0].length * u;
    const h = CAT_GRID.length * u;
    const left = Math.round(x * TILE + TILE / 2 - w / 2);
    const top = Math.round((y + 1) * TILE - h);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const g = ctx.createRadialGradient(left + w / 2, top + h - 2, 2, left + w / 2, top + h - 2, w / 2);
    g.addColorStop(0, 'rgba(2,4,8,0.5)');
    g.addColorStop(1, 'rgba(2,4,8,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(left + w / 2, top + h - 2, w / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let row = 0; row < CAT_GRID.length; row++) {
      for (let col = 0; col < CAT_GRID[row].length; col++) {
        const color = CAT_PALETTE[CAT_GRID[row][col]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(left + col * u, top + row * u, u, u);
      }
    }
    ctx.restore();
  }

  function drawCurrentSprite(ctx,name,cx,foot,scale=1) {
    const size=spriteDimensions(name),width=size.width*4*scale,height=size.height*4*scale;
    const cv=document.createElement('canvas');cv.width=size.width*2;cv.height=size.height*2;
    paintSprite(cv.getContext('2d'),name,0,0,1,name==='knight'||window.CHARACTER_ART.has(name)?knightFrame:0,name==='knight'||window.CHARACTER_ART.has(name)?knightDirection:'front');
    ctx.drawImage(cv,Math.round(cx-width/2),Math.round(foot-height),width,height);
  }
  const OLD_PROPS={column:'pillar',chest:'chest',potion:'potion',sword:'sword',stairs:'stairsDown',spikes:'spikes'};
  function drawBeforeScene(ctx,opts={}) { drawHeroScene(ctx,{...opts,before:true}); }
  function drawHeroScene(ctx,opts={}) {
    ctx.fillStyle='#0a0e16';ctx.fillRect(0,0,W,H);
    drawRoom(ctx,HERO_MAP,!!opts.before);
    for(const p of HERO_WALL_PROPS){
      if(!opts.before){
        if(p.kind==='door')drawDoor(ctx,p.x,p.y);
        else if(p.kind==='torch')drawTorch(ctx,p.x,p.y,0);
        else if(p.kind==='banner')drawBanner(ctx,p.x,p.y,p.color);
        else if(p.kind==='goo')drawCell(ctx,'wall_goo',p.x,p.y);
      }else if(p.kind!=='goo'){
        const name=p.kind==='door'?'townGate':p.kind==='torch'?'torch':'banner';
        const cx=p.kind==='door'?(p.x+1)*TILE:(p.x+0.5)*TILE;
        drawCurrentSprite(ctx,name,cx,(p.y+(p.kind==='banner'?1:2))*TILE,1);
      }
    }
    const items=[];
    for(const p of HERO_PROPS)items.push({foot:(p.y+1)*TILE,draw:()=>opts.before?
      drawCurrentSprite(ctx,OLD_PROPS[p.kind],(p.x+0.5)*TILE,(p.y+1)*TILE,1):drawFloorProp(ctx,p)});
    for(const a of HERO_ACTORS)items.push({foot:(a.y+1)*TILE,draw:()=>{
      ctx.fillStyle='rgba(2,4,8,0.35)';ctx.beginPath();ctx.ellipse((a.x+0.5)*TILE,(a.y+1)*TILE-2,22,6,0,0,Math.PI*2);ctx.fill();
      if(opts.before)drawCurrentSprite(ctx,BEFORE_ACTOR[a.kind],(a.x+0.5)*TILE,(a.y+1)*TILE,a.kind==='cat'?0.75:1);else drawActor(ctx,a);
    }});
    items.sort((a,b)=>a.foot-b.foot);for(const item of items)item.draw();
    drawAtmosphere(ctx,opts);drawOverlay(ctx,HERO_MAP);
  }

  function drawRoomTile(ctx, name, x, y) {
    // Stairs and floor hazards are floor tiles, not foot-anchored actors.
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    const size = spriteDimensions(name);
    const c = cv.getContext('2d');
    paintSprite(c, name, (32 - size.width) / 2, (32 - size.height) / 2, 1, 0, 'front');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, x * TILE + TILE / 2 - 32, y * TILE + TILE / 2 - 32, 64, 64);
  }

  /* ---------------------------------------------------------------- */
  /* Town gate concept                                                 */
  /* ---------------------------------------------------------------- */

  const TOWN_MAP = [
    '##################',
    '##################',
    '##################',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '..................'
  ];

  const TOWN_ACTORS = [
    {kind:'merchant',x:6,y:6},{kind:'villager',x:11,y:6},
    {kind:'prisoner',x:4,y:9},{kind:'princess',x:13,y:8},
    {kind:'dog',x:10,y:10},{kind:'cat',x:7,y:10}
  ];

  function drawTownScene(ctx) {
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, H);
    drawRoom(ctx, TOWN_MAP, false);

    // Gate: doors_leaf_open is a 32x32 stone arch with the passage open, so it
    // replaces the closed leaf one-for-one and needs no extra frame pieces.
    drawCropAt(ctx, 'doors_leaf_open', 8 * TILE, TILE, S);

    drawTorch(ctx, 4, 1, 0);
    drawTorch(ctx, 12, 1, 2);
    drawBanner(ctx, 2, 2, 'green');
    drawBanner(ctx, 14, 2, 'yellow');
    drawFountain(ctx, 15, 1);
    drawCell(ctx, 'wall_hole_2', 3, 2);

    const items = [];
    for (const p of [
      { kind: 'column', x: 2, y: 4 },
      { kind: 'column', x: 15, y: 7 },
      { kind: 'crate', x: 3, y: 10 },
      { kind: 'crate', x: 4, y: 10 },
      { kind: 'chest', x: 13, y: 10 },
      { kind: 'sword', x: 5, y: 10 },
      { kind: 'skull', x: 15, y: 5 }
    ]) items.push({ foot: (p.y + 1) * TILE, draw: () => drawFloorProp(ctx, p) });
    for (const a of TOWN_ACTORS) items.push({ foot: (a.y + 1) * TILE, draw: () => drawActor(ctx, a) });
    items.sort((a, b) => a.foot - b.foot);
    for (const item of items) item.draw();

    // Daylight coming through the open gate; the outpost is still stone.
    drawGlow(ctx, 8.9 * TILE, 2.1 * TILE, 240, '150,190,220', 0.14);
    drawAtmosphere(ctx, {});
  }

  /* ---------------------------------------------------------------- */
  /* Topology fixtures                                                 */
  /* ---------------------------------------------------------------- */

  const FIXTURES = [
    {id:'fixtureIsolated',label:'One isolated tile',map:['.....','..#..','.....','.....']},
    {id:'fixtureLine',label:'One-tile wall',map:['.....','.###.','.....','.....']},
    {id:'fixtureThick',label:'Solid block',map:['.....','.###.','.###.','.###.']},
    {id:'fixtureL',label:'L corner',map:['.....','.##..','.#...','.#...']},
    {id:'fixtureT',label:'T junction',map:['.....','..#..','.###.','..#..']},
    {id:'fixtureInner',label:'Concave corner',map:['.....','.###.','.#...','.#.#.','...#.']},
    {id:'fixtureCross',label:'Cross junction',map:['.....','..#..','.###.','..#..','.....']},
    {id:'fixtureDiagonal',label:'Diagonal contact',map:['.....','.##..','.#.#.','..##.','.....']},
    {id:'fixtureBorder',label:'Map border',map:['#####','#....','#....','#....']},
    {id:'fixtureObstacle',label:'Obstacle is floor, not masonry',map:['.....','.###.','.~#~.','.....']},
    {id:'fixtureCorridor',label:'One-tile lane',map:['#####','#...#','###.#','#...#','#####']}
  ];

  function drawFixture(canvas, fixture) {
    const ctx = canvas.getContext('2d');
    canvas.width = fixture.map[0].length * TILE;
    canvas.height = fixture.map.length * TILE;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw the fixture in the lower-left so the transparent cap row reads as
    // part of an interior room, then add a torch and a hero for scale.
    const map = fixture.map;
    drawRoom(ctx, map, false);
    drawOverlay(ctx,map);
    const items = [];
    const heroX = 4, heroY = 3;
    if (map[heroY][heroX] === '.') items.push({ foot: (heroY + 1) * TILE, draw: () => drawActor(ctx, { kind: 'knight', x: heroX, y: heroY }) });
    items.sort((a, b) => a.foot - b.foot);
    for (const item of items) item.draw();
    drawAtmosphere(ctx, { fog: false, lights: false });
  }

  /* ---------------------------------------------------------------- */
  /* Proportion strip                                                  */
  /* ---------------------------------------------------------------- */

  function drawProportion(ctx) {
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, H);
    const base = 360;
    const cols = [
      { x: 120, label: 'Current 1.0.1 hero', sub: '64 x 88 screen', draw: () => drawCurrentSprite(ctx, 'knight', 120, base, 1) },
      { x: 360, label: 'Reference knight', sub: 'fixed 64px cell × 2; visible height ≤96px', draw: () => drawKnight(ctx,360,base) },
      { x: 600, label: '0x72 knight_m (3x option)', sub: '48 x 84', draw: () => drawCropBottom(ctx, 'knight_m_idle_anim_f0', 600, base, 3) },
      { x: 840, label: 'Current goblin', sub: '80 x 88 screen', draw: () => drawCurrentSprite(ctx, 'goblin', 840, base, 1) },
      { x: 1040, label: '0x72 goblin', sub: '64 x 64 (16x -> 4x)', draw: () => drawCropBottom(ctx, 'goblin_idle_anim_f0', 1040, base, S) }
    ];

    // Tile reference grid: one 64px tile behind each figure.
    for (const c of cols) {
      ctx.strokeStyle = 'rgba(232,198,141,0.18)';
      ctx.strokeRect(c.x - TILE / 2, base - TILE, TILE, TILE);
      ctx.strokeRect(c.x - TILE, base - TILE * 2, TILE * 2, TILE * 2);
    }
    for (const c of cols) c.draw();

    ctx.save();
    for (const c of cols) {
      ctx.fillStyle = '#e8c68d';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x, base + 46);
      ctx.fillStyle = '#8d9faf';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(c.sub, c.x, base + 64);
    }
    ctx.fillStyle = '#8d9faf';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Same 64px world tile. Reference knight: 64px source cell, 2× crisp screen scale, fixed foot anchor.',32,34);
    ctx.fillText('The current hero is 64×88 screen. The reference-derived knight is more detailed; size differences are explicit.',32,56);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- */
  /* Frame strips + table                                              */
  /* ---------------------------------------------------------------- */

  function renderStrip(el, label, names, scale = 6) {
    const row = document.createElement('div');
    row.className = 'strip-row';
    const cap = document.createElement('div');
    cap.className = 'strip-label';
    cap.textContent = label;
    row.appendChild(cap);
    const line = document.createElement('div');
    line.className = 'strip-images';
    for (const name of names) {
      const img = crop(name);
      if (!img) continue;
      const cv = document.createElement('canvas');
      cv.width = img.width * scale;
      cv.height = img.height * scale;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(img, 0, 0, cv.width, cv.height);
      const cell = document.createElement('div');
      cell.className = 'strip-cell';
      cell.appendChild(cv);
      const lab = document.createElement('div');
      lab.className = 'strip-cap';
      lab.textContent = name.replace(/_anim|_anim_f\d+|_f\d+$/g, '');
      cell.appendChild(lab);
      line.appendChild(cell);
    }
    row.appendChild(line);
    el.appendChild(row);
  }

  function renderTable() {
    const wrap = $('roleTable');
    const tbl = document.createElement('table');
    tbl.innerHTML = '<thead><tr><th>Role</th><th>Category</th><th>Status</th><th>0x72 source / action</th><th>Note</th></tr></thead>';
    const tb = document.createElement('tbody');
    const order = ['modified', 'custom', 'alias'];
    const sorted = DATA.assets.slice().sort((a, b) => {
      const ai = order.indexOf(a.status), bi = order.indexOf(b.status);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
    for (const a of sorted) {
      const tr = document.createElement('tr');
      tr.className = 'status-' + a.status;
      tr.innerHTML =
        '<td><b>' + a.name + '</b>' + (a.alias ? ' <span class="muted">-&gt; ' + a.alias + '</span>' : '') + '</td>' +
        '<td>' + a.category + '</td>' +
        '<td>' + a.status + '</td>' +
        '<td>' + ((a.pack || []).join(', ') || '—') + '</td>' +
        '<td>' + a.note + '</td>';
      tb.appendChild(tr);
    }
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
  }

  function renderSummary() {
    const counts = DATA.counts;
    const el = $('summary');
    el.innerHTML =
      '<b>' + DATA.assets.length + '</b> runtime roles inventoried · <b>' + DATA.cropCount + '</b> pack crops parsed · ' +
      '<span class="status-modified">modified ' + (counts.modified || 0) + '</span> · ' +
      '<span class="status-custom">custom ' + (counts.custom || 0) + '</span> · ' +
      '<span class="status-alias">alias ' + (counts.alias || 0) + '</span>';
  }

  /* ---------------------------------------------------------------- */
  /* Boot                                                              */
  /* ---------------------------------------------------------------- */

  function setupCanvas(id, width = W, height = H) {
    const cv = $(id);
    if (!cv) return null;
    cv.width = width;
    cv.height = height;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, width, height);
    return ctx;
  }

  async function init() {
    try {
      atlas = await loadImage('assets/atlas.png');
      lowWalls = await loadImage('assets/walls-low.png');
      knightSheet = await loadImage(KNIGHT.sheet);
      await window.CHARACTER_ART.loadAll();
      await window.ITEM_ART.loadAll();
      validate();

      const hero = setupCanvas('heroCanvas');
      if (hero) drawHeroScene(hero, {});

      const before = setupCanvas('beforeCanvas');
      if (before) drawBeforeScene(before, {});

      const after = setupCanvas('afterCanvas');
      if (after) drawHeroScene(after, {});

      const fog = setupCanvas('fogCanvas');
      if (fog) drawHeroScene(fog, { fog: true });

      const gray = setupCanvas('grayCanvas');
      if (gray) drawHeroScene(gray, {});

      const grayFog = setupCanvas('grayFogCanvas');
      if (grayFog) drawHeroScene(grayFog, { fog: true });

      const beforeFog = setupCanvas('beforeFogCanvas');if(beforeFog)drawBeforeScene(beforeFog,{fog:true});
      const beforeGray = setupCanvas('beforeGrayCanvas');if(beforeGray)drawBeforeScene(beforeGray);
      const town = setupCanvas('townCanvas');
      if (town) drawTownScene(town);

      const prop = setupCanvas('proportionCanvas', W, 420);
      if (prop) drawProportion(prop);

      for (const f of FIXTURES) {
        const cv = $(f.id);
        if (cv) drawFixture(cv, f);
      }

      const strips = $('strips');
      if (strips) {
        renderStrip(strips, 'knight_m idle', ['knight_m_idle_anim_f0', 'knight_m_idle_anim_f1', 'knight_m_idle_anim_f2', 'knight_m_idle_anim_f3']);
        renderStrip(strips, 'knight_m run', ['knight_m_run_anim_f0', 'knight_m_run_anim_f1', 'knight_m_run_anim_f2', 'knight_m_run_anim_f3']);
        renderStrip(strips, 'goblin idle', ['goblin_idle_anim_f0', 'goblin_idle_anim_f1', 'goblin_idle_anim_f2', 'goblin_idle_anim_f3']);
        renderStrip(strips, 'skelet idle', ['skelet_idle_anim_f0', 'skelet_idle_anim_f1', 'skelet_idle_anim_f2', 'skelet_idle_anim_f3']);
        renderStrip(strips, 'orc_warrior idle', ['orc_warrior_idle_anim_f0', 'orc_warrior_idle_anim_f1', 'orc_warrior_idle_anim_f2', 'orc_warrior_idle_anim_f3']);
        renderStrip(strips, 'wizzard_m idle', ['wizzard_m_idle_anim_f0', 'wizzard_m_idle_anim_f1', 'wizzard_m_idle_anim_f2', 'wizzard_m_idle_anim_f3']);
        renderStrip(strips, 'wall torch (red fountain family)', ['wall_fountain_mid_red_anim_f0', 'wall_fountain_mid_red_anim_f1', 'wall_fountain_mid_red_anim_f2']);
        renderStrip(strips, 'floor spikes', ['floor_spikes_anim_f0', 'floor_spikes_anim_f1', 'floor_spikes_anim_f2', 'floor_spikes_anim_f3']);
        renderStrip(strips, 'chest + mimic', ['chest_full_open_anim_f0', 'chest_mimic_open_anim_f0', 'chest_mimic_open_anim_f1', 'chest_mimic_open_anim_f2']);
      }

      renderSummary();
      const ledger=$('sizeLedger');
      const screenSize=(name,scale=2)=>{const d=spriteDimensions(name);return `${d.width*scale*2}×${d.height*scale*2}`;};
      const proposedSize=id=>{const a=window.CHARACTER_ART.get(id);return `≤${Math.max(...a.frames.map(f=>f.bounds.width))*2}×${Math.max(...a.frames.map(f=>f.bounds.height))*2} visible (all poses)`;};
      const sourceSize=name=>`${DATA.crops[name][2]*S}×${DATA.crops[name][3]*S}`;
      const rows=[['Hero',screenSize('knight'),'reference: ≤96px visible height, 128×128 transparent cell'],['Goblin',screenSize('goblin'),proposedSize('goblin')],['Skeleton',screenSize('skeleton'),proposedSize('skeleton')],['Orc',screenSize('orc'),proposedSize('orc')],['Mage',screenSize('mage'),proposedSize('mage')],['Marmalade',screenSize('catCompanion',1.5)+' (actual companion scale)',proposedSize('catCompanion')+' charcoal harness/satchel cat'],['Column',screenSize('pillar'),sourceSize('column')],['Wall fire',screenSize('torch'),'64×128 (two source tiles)']];
      ledger.innerHTML='<tr><th>Role</th><th>Current screen bounds</th><th>Proposed source-native screen bounds</th></tr>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('');
      $('toggleGrid')?.addEventListener('click',()=>{overlayOpen=!overlayOpen;$('toggleGrid').ariaPressed=String(overlayOpen);redraw();});
      renderTable();
      setupKnightReview();

      const checks = $('checks');
      if (checks) {
        checks.innerHTML = [
          'Atlas loaded: ' + atlas.width + ' x ' + atlas.height + ' px.',
          'Crop rows embedded: ' + DATA.cropCount + ' (no fetch, file:// safe).',
          'Runtime roles mapped: ' + DATA.assets.length + '.',
          'Preview scale: pack 16px -> 64px screen tile (4x), matching 1152x768 / 18x12 view.',
          'Reference knight: 4 directions × 4 walking frames; 64px transparent cells at 2× screen scale, fixed feet.',
          'Preparation assertions: '+validate()+' passed; '+requiredCrops.size+' required crops dispatched.',
          'Same shared map, actor/prop/light positions, fog parameters and foot anchors in both panels.',
          'Approved knight plus '+window.CHARACTER_ART.data.assets.length+' proposed character sheets; new collection awaits review.',
          'Live game bootstrapped: no. Playable files changed: no. This is OX-01/OX-02 evidence only.'
        ].map((x) => '<div>• ' + x + '</div>').join('');
      }
    } catch (err) {
      console.error(err);
      const box = $('checks');
      if (box) box.innerHTML = '<div class="error">Preview failed: ' + String(err && err.message || err) + '</div>';
    }
  }

  function drawKnight(ctx,cx,foot,direction=knightDirection,frame=knightFrame,scale=KNIGHT.screenScale){
    const record=KNIGHT.frames.find(f=>f.direction===direction&&f.frame===frame);
    if(!record)throw Error('Missing knight pose '+direction+':'+frame);
    const [x,y,w,h]=record.crop;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(knightSheet,x,y,w,h,Math.round(cx-KNIGHT.anchor[0]*scale),Math.round(foot-KNIGHT.anchor[1]*scale),w*scale,h*scale);
    ctx.restore();
  }
  function drawKnightReview(){
    for(const direction of KNIGHT.directions){
      const cv=$('knight-'+direction),c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
      c.strokeStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(0,168);c.lineTo(192,168);c.stroke();
      drawKnight(c,96,168,direction,knightFrame,3);
    }
    $('knightStatus').textContent=knightDirection+' · frame '+knightFrame+' / 3 · '+(knightPlaying?'walking':'paused')+' · fixed feet at source (32,56)';
    $('knightFrame').value=knightFrame;
    $('knightPlay').textContent=knightPlaying?'Pause walking':'Play walking';
    $('knightPlay').setAttribute('aria-pressed',String(knightPlaying));
  }
  function setupKnightReview(){
    $('knightDirection').addEventListener('change',e=>{knightDirection=e.target.value;redraw();});
    $('knightPlay').addEventListener('click',()=>{knightPlaying=!knightPlaying;drawKnightReview();});
    $('knightFrame').addEventListener('input',e=>{knightPlaying=false;knightFrame=Number(e.target.value);redraw();});
    setInterval(()=>{if(knightPlaying&&!document.hidden){knightFrame=(knightFrame+1)%4;redraw();}},KNIGHT.cycleMs/4);
    drawKnightReview();
  }
  function redraw(){
    drawBeforeScene($('beforeCanvas').getContext('2d'));
    drawBeforeScene($('beforeGrayCanvas').getContext('2d'));
    drawBeforeScene($('beforeFogCanvas').getContext('2d'),{fog:true});
    for(const id of ['heroCanvas','afterCanvas','grayCanvas'])drawHeroScene($(id).getContext('2d'));
    for(const id of ['fogCanvas','grayFogCanvas'])drawHeroScene($(id).getContext('2d'),{fog:true});
    for(const f of FIXTURES)drawFixture($(f.id),f);
    if(knightSheet){drawKnightReview();drawProportion($('proportionCanvas').getContext('2d'));drawTownScene($('townCanvas').getContext('2d'));}
  }
  function validate(){
    let count=0;
    for(const [name,r] of Object.entries(DATA.crops)){
      if(r.length!==4||r.some(n=>!Number.isInteger(n))||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>atlas.width||r[1]+r[3]>atlas.height)throw Error('Invalid crop '+name);
      count++;
    }
    for(const a of HERO_ACTORS)if(a.kind!=='knight'&&(!window.CHARACTER_ART.has(CHARACTER_ROLES[a.kind]||a.kind)||!BEFORE_ACTOR[a.kind]))throw Error('Unmapped scene actor '+a.kind);
    for(const p of HERO_PROPS)if(!OLD_PROPS[p.kind])throw Error('Unmapped shared prop '+p.kind);
    for(const a of DATA.assets){if(!a.frames||!a.logical||!a.frameCounts)throw Error('Incomplete inventory '+a.name);count++;}
    for(const f of FIXTURES){if(!f.map.length||!f.map.every(r=>r.length===f.map[0].length))throw Error('Non-rectangular fixture '+f.id);count++;}
    if(lowWalls.width!==192||lowWalls.height!==64)throw Error('Wrong low-wall sheet');
    if(knightSheet.width!==256||knightSheet.height!==256||KNIGHT.frames.length!==16)throw Error('Incomplete knight sheet');
    return count+1;
  }
  window.OX72_PREVIEW={fixtures:FIXTURES,map:HERO_MAP,props:HERO_PROPS,actors:HERO_ACTORS,wallProps:HERO_WALL_PROPS,validate,drawHeroScene,drawBeforeScene,drawRoom,crop,knightState:()=>({direction:knightDirection,frame:knightFrame,playing:knightPlaying}),drawKnight};
  window.addEventListener('DOMContentLoaded', init);
})();
