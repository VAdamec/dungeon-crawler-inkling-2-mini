/* 0x72 focus preview v2 — standalone, file://, no live-game bootstrap.
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

  let atlas = null;
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
    if (!c || !atlas) return null;
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

  // Treat out-of-bounds as floor for cap placement: the top border takes a
  // cap, the bottom border does not.
  function wallAt(map, x, y) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return false;
    return map[y][x] === '#';
  }

  function capName(map, x, y) {
    const west = wallAt(map, x - 1, y);
    const east = wallAt(map, x + 1, y);
    if (!west && !east) return 'wall_top_mid';
    if (!west) return 'wall_top_left';
    if (!east) return 'wall_top_right';
    return 'wall_top_mid';
  }

  function faceName(map, x, y) {
    const west = wallAt(map, x - 1, y);
    const east = wallAt(map, x + 1, y);
    if (!west) return 'wall_left';
    if (!east) return 'wall_right';
    return 'wall_mid';
  }

  // A wall cell gets the 4px cap strip only when it has a wall below it. That
  // keeps one-tile walls and the south border from showing a north-facing cap
  // on the wrong side.
  function isCapCell(map, x, y) {
    return wallAt(map, x, y) && !wallAt(map, x, y - 1) && wallAt(map, x, y + 1);
  }

  function drawRoom(ctx, map, before) {
    const h = map.length, w = map[0].length;

    if (before) {
      // Current 1.0.1 painters: 32px logical tiles drawn to the 64px screen tile.
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const wall = map[y][x] === '#';
          const edges = wall ? beforeEdges(map, x, y) : 0;
          const front = !!(edges & 4);
          const variant = (x * 37 + y * 71) % 11;
          const cv = document.createElement('canvas');
          cv.width = 32;
          cv.height = 32;
          paintDungeonTile(cv.getContext('2d'), wall, variant, front, 'crypt', false, x % 6, y % 6, 0, edges);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cv, x * TILE, y * TILE, TILE, TILE);
          if (!wall) {
            ctx.fillStyle = 'rgba(13,21,40,0.25)';
            if (y > 0 && map[y - 1][x] === '#') ctx.fillRect(x * TILE, y * TILE, TILE, 8);
            if (x > 0 && map[y][x - 1] === '#') ctx.fillRect(x * TILE, y * TILE, 6, TILE);
          }
        }
      }
      return;
    }

    // Floors first, including the floor showing through an interior wall's
    // transparent cap row. Top-border cap rows stay void above the wall.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wall = map[y][x] === '#';
        const cap = wall && isCapCell(map, x, y);
        if (wall && !(cap && y > 0)) continue;
        const hh = hash(x, y);
        drawCell(ctx, FLOORS[hh % FLOORS.length], x, y);
        if (hh % 19 === 0) drawCell(ctx, hh % 2 ? 'floor_7' : 'floor_8', x, y);
        if (map[y][x] === '~') drawCell(ctx, 'floor_7', x, y);
      }
    }

    // Brick faces.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!wallAt(map, x, y)) continue;
        if (isCapCell(map, x, y)) continue;
        drawCell(ctx, faceName(map, x, y), x, y);
      }
    }

    // Caps over the face rows.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isCapCell(map, x, y)) continue;
        drawCell(ctx, capName(map, x, y), x, y);
      }
    }

    // Contact shadow over the floor south of a wall face.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!wallAt(map, x, y) || wallAt(map, x, y + 1)) continue;
        const g = ctx.createLinearGradient(0, (y + 1) * TILE, 0, (y + 1) * TILE + 22);
        g.addColorStop(0, 'rgba(3,5,10,0.62)');
        g.addColorStop(1, 'rgba(3,5,10,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x * TILE, (y + 1) * TILE, TILE, 22);
      }
    }
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

  function drawAtmosphere(ctx, opts) {
    const before = opts.mode === 'before';
    const town = opts.mode === 'town';
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    // Cool ambient cast. Kept light so the pack's own brown/charcoal values
    // survive; a heavier multiply turned the brick and flagstones into mud.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = before ? 'rgba(186,198,222,0.30)'
      : town ? 'rgba(158,176,204,0.10)'
        : 'rgba(150,168,206,0.17)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();

    if (town) {
      // Daylight outpost: cool sky wash plus a bright wedge through the gate.
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, 'rgba(152,182,222,0.18)');
      sky.addColorStop(0.55, 'rgba(152,182,222,0.05)');
      sky.addColorStop(1, 'rgba(40,52,72,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
      drawGlow(ctx, 9 * TILE, 2.2 * TILE, 340, '178,208,232', 0.15);
      drawTorchLight(ctx, 4, 1, 0.55);
      drawTorchLight(ctx, 12, 1, 0.55);
    } else if (!before) {
      // Warm pools that only touch nearby pixels.
      if (opts.lights !== false) {
        drawTorchLight(ctx, 4, 1, 0.95);
        drawTorchLight(ctx, 11, 1, 0.85);
        // Cold spill from the closed door: a thin wedge of "outside" air.
        drawGlow(ctx, 7.9 * TILE, 2.4 * TILE, 150, '96,150,200', 0.10);
      }
    } else {
      drawGlow(ctx, 4 * TILE + 32, 2 * TILE, 190, '245,179,91', 0.14);
      drawGlow(ctx, 11 * TILE + 32, 2 * TILE, 190, '245,179,91', 0.14);
    }

    const v = ctx.createRadialGradient(cw * 0.48, ch * 0.50, 250, cw * 0.48, ch * 0.50, 800);
    v.addColorStop(0, 'rgba(4,7,13,0)');
    v.addColorStop(0.7, town ? 'rgba(4,7,13,0.12)' : 'rgba(4,7,13,0.20)');
    v.addColorStop(1, town ? 'rgba(4,7,13,0.40)' : 'rgba(4,7,13,0.56)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cw, ch);

    if (opts.fog) drawFog(ctx, opts.fogX || 7.5, opts.fogY || 8);
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
    { kind: 'goo', x: 10, y: 2 }
  ];

  const HERO_PROPS = [
    { kind: 'column', x: 1, y: 3 },
    { kind: 'column', x: 16, y: 8 },
    { kind: 'chest', x: 3, y: 9 },
    { kind: 'potion', x: 4, y: 9 },
    { kind: 'crate', x: 13, y: 10 },
    { kind: 'skull', x: 6, y: 5 },
    { kind: 'sword', x: 2, y: 7 },
    { kind: 'stairs', x: 9, y: 10 },
    { kind: 'spikes', x: 11, y: 9 },
    { kind: 'rubble', x: 15, y: 3 }
  ];

  const HERO_ACTORS = [
    { kind: 'knight', x: 7, y: 7 },
    { kind: 'cat', x: 8, y: 7 },
    { kind: 'chort', x: 3, y: 4 },
    { kind: 'orc', x: 2, y: 5 },
    { kind: 'goblin', x: 9, y: 4 },
    { kind: 'wizzard', x: 15, y: 5 },
    { kind: 'skelet', x: 12, y: 7 },
    { kind: 'imp', x: 10, y: 6 },
    { kind: 'swampy', x: 5, y: 10 },
    { kind: 'mimic', x: 13, y: 9 }
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

  const BEFORE_ACTOR = {
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
      case 'chest': drawCropBottom(ctx, 'chest_full_open_anim_f0', cx, foot - 4, S); break;
      case 'potion': drawCropBottom(ctx, 'flask_red', cx, foot - 8, S); break;
      case 'sword': drawCropBottom(ctx, 'weapon_knight_sword', cx, foot - 6, S); break;
      case 'skull': drawCropBottom(ctx, 'skull', cx, foot - 10, S); break;
      case 'crate': drawCropBottom(ctx, 'crate', cx, foot, S); break;
      case 'stairs': drawCell(ctx, 'floor_stairs', p.x, p.y); break;
      case 'spikes': drawCell(ctx, 'floor_spikes_anim_f0', p.x, p.y); break;
      case 'rubble': drawCell(ctx, 'floor_8', p.x, p.y); break;
      default: break;
    }
  }

  function drawActor(ctx, a) {
    if (a.kind === 'cat') {
      drawCustomCat(ctx, a.x, a.y);
      return;
    }
    const name = ACTOR_CROP[a.kind];
    if (!name) return;
    // Pack actors are cropped at the feet; a 4px lift keeps them on the floor
    // rather than floating on the tile boundary.
    drawCropBottom(ctx, name, a.x * TILE + TILE / 2, (a.y + 1) * TILE - 4, S);
    drawActorShadow(ctx, a.x, a.y, name);
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
    const top = Math.round((y + 1) * TILE - h - 4);
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

  function drawHeroScene(ctx, opts) {
    opts = opts || {};
    const before = opts.mode === 'before';
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, H);
    drawRoom(ctx, HERO_MAP, before);

    if (!before) drawWallProps(ctx);

    const items = [];
    for (const p of HERO_PROPS) {
      items.push({ foot: (p.y + 1) * TILE, draw: () => drawFloorProp(ctx, p) });
    }
    for (const a of HERO_ACTORS) {
      items.push({ foot: (a.y + 1) * TILE, draw: () => drawActor(ctx, a) });
    }
    items.sort((a, b) => a.foot - b.foot);
    for (const item of items) item.draw();

    drawAtmosphere(ctx, opts);
  }

  /* ---------------------------------------------------------------- */
  /* Current-art comparison                                            */
  /* ---------------------------------------------------------------- */

  const BEFORE_WALL_PROPS = [
    { kind: 'gate', x: 7, y: 1 },
    { kind: 'torch', x: 4, y: 1 },
    { kind: 'torch', x: 11, y: 1 },
    { kind: 'banner', x: 2, y: 2 },
    { kind: 'banner', x: 14, y: 2 }
  ];

  const BEFORE_PROPS = [
    { kind: 'pillar', x: 1, y: 5, scale: 0.8 },
    { kind: 'pillar', x: 16, y: 9, scale: 0.8 },
    { kind: 'chest', x: 4, y: 9, scale: 0.8 },
    { kind: 'potion', x: 5, y: 9, scale: 0.55 },
    { kind: 'sword', x: 2, y: 8, scale: 0.55 },
    { kind: 'tombstone', x: 6, y: 6, scale: 0.7 },
    { kind: 'rubble', x: 9, y: 10, scale: 0.7 },
    { kind: 'stairsDown', x: 3, y: 10, tile: true },
    { kind: 'spikes', x: 7, y: 10, tile: true }
  ];

  function drawCurrentSprite(ctx, name, cx, foot, scale) {
    // Current game screen size: logical sprite px x actor scale(2) x MAP_ZOOM(2).
    const size = spriteDimensions(name);
    const width = size.width * 4 * scale;
    const height = size.height * 4 * scale;
    const left = Math.round(cx - width / 2);
    const top = Math.round(foot - height);
    const cv = document.createElement('canvas');
    cv.width = Math.round(size.width * 2);
    cv.height = Math.round(size.height * 2);
    paintSprite(cv.getContext('2d'), name, 0, 0, 1, 0, 'front');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, left, top, width, height);
  }

  function drawBeforeScene(ctx, opts) {
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, H);
    drawRoom(ctx, HERO_MAP, true);

    for (const p of BEFORE_WALL_PROPS) {
      const cx = p.x * TILE + TILE / 2;
      if (p.kind === 'gate') {
        drawCurrentSprite(ctx, 'townGate', cx, 3 * TILE, 0.9);
      } else if (p.kind === 'torch') {
        drawCurrentSprite(ctx, 'torch', cx, 3 * TILE - 4, 0.62);
      } else if (p.kind === 'banner') {
        drawCurrentSprite(ctx, 'banner', cx, 3 * TILE - 4, 0.5);
      }
    }

    for (const p of BEFORE_PROPS) {
      if (p.tile) drawRoomTile(ctx, p.kind, p.x, p.y);
    }

    const items = [];
    for (const p of BEFORE_PROPS) {
      if (p.tile) continue;
      items.push({ foot: (p.y + 1) * TILE, draw: () => drawCurrentSprite(ctx, p.kind, p.x * TILE + TILE / 2, (p.y + 1) * TILE - 4, p.scale || 1) });
    }
    for (const a of HERO_ACTORS) {
      const name = BEFORE_ACTOR[a.kind] || 'knight';
      items.push({ foot: (a.y + 1) * TILE, draw: () => drawCurrentSprite(ctx, name, a.x * TILE + TILE / 2, (a.y + 1) * TILE - 4, 1) });
    }
    items.sort((a, b) => a.foot - b.foot);
    for (const item of items) item.draw();

    drawAtmosphere(ctx, { mode: 'before' });
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
    { kind: 'knightF', x: 6, y: 6 },
    { kind: 'elfM', x: 11, y: 6 },
    { kind: 'dwarfM', x: 4, y: 9 },
    { kind: 'lizardM', x: 13, y: 8 },
    { kind: 'doc', x: 10, y: 10 },
    { kind: 'cat', x: 7, y: 10 }
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
    { id: 'fixtureIsolated', label: 'Isolated pillar', map: [
      '.....',
      '..#..',
      '..#..',
      '.....'
    ] },
    { id: 'fixtureLine', label: 'Thin wall run', map: [
      '.....',
      '.###.',
      '.....',
      '.....'
    ] },
    { id: 'fixtureThick', label: 'Thick wall band', map: [
      '.....',
      '.###.',
      '.###.',
      '.###.'
    ] },
    { id: 'fixtureL', label: 'L corner', map: [
      '.....',
      '.##..',
      '.#...',
      '.#...'
    ] },
    { id: 'fixtureT', label: 'T junction', map: [
      '.....',
      '..#..',
      '.###.',
      '..#..'
    ] },
    { id: 'fixtureInner', label: 'Inner corner + corridor', map: [
      '.....',
      '.###.',
      '.#...',
      '.#.#.',
      '...#.'
    ] }
  ];

  function drawFixture(canvas, fixture) {
    const ctx = canvas.getContext('2d');
    canvas.width = 6 * TILE;
    canvas.height = 5 * TILE;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw the fixture in the lower-left so the transparent cap row reads as
    // part of an interior room, then add a torch and a hero for scale.
    const map = fixture.map;
    drawRoom(ctx, map, false);
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
      { x: 360, label: '0x72 knight_m', sub: '64 x 112 (16x -> 4x)', draw: () => drawCropBottom(ctx, 'knight_m_idle_anim_f0', 360, base, S) },
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
    ctx.fillText('Same 64px world tile. The 0x72 hero at native 4x is 64 x 112 screen; the 3x option is 48 x 84.', 32, 34);
    ctx.fillText('The current hero is 64 x 88 screen. The pack heroes are taller and narrower, with cleaner silhouettes.', 32, 56);
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
      renderTable();

      const checks = $('checks');
      if (checks) {
        checks.innerHTML = [
          'Atlas loaded: ' + atlas.width + ' x ' + atlas.height + ' px.',
          'Crop rows embedded: ' + DATA.cropCount + ' (no fetch, file:// safe).',
          'Runtime roles mapped: ' + DATA.assets.length + '.',
          'Preview scale: pack 16px -> 64px screen tile (4x), matching 1152x768 / 18x12 view.',
          'Hero scale: pack 16x28 -> 64x112 screen; the 3x option is shown for comparison.',
          'Live game bootstrapped: no. Playable files changed: no. This is OX-01/OX-02 evidence only.'
        ].map((x) => '<div>• ' + x + '</div>').join('');
      }
    } catch (err) {
      console.error(err);
      const box = $('checks');
      if (box) box.innerHTML = '<div class="error">Preview failed: ' + String(err && err.message || err) + '</div>';
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
