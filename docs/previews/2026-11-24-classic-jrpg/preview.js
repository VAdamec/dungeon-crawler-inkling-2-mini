// Focused JRPG-02 revision harness. Loads before-sprites.js + proposal-sprites.js first.
// Isolated from runtime: never boots or mutates the live game.
(function () {
  'use strict';
  const ATLAS = { before: {}, after: {} };

  function afterGrid(name) {
    return PROP_HERO[name] || PROP_MONSTERS[name] || PROP_PEOPLE[name] ||
      PROP_TOWN[name] || PROP_DUNGEON[name];
  }

  function heroFrame(name, frame) {
    const grid = PROP_HERO[name];
    if (!grid || !frame) return grid;
    const stride = frame % 4 === 1 ? 1 : -1;
    const out = grid.map(row => row.split('.'));
    for (let y = 22; y < out.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === '.') continue;
        const nx = x + (x < grid[y].length / 2 ? -1 : 1) * stride;
        if (nx >= 0 && nx < out[y].length) out[y][nx] = grid[y][x];
      }
    }
    return out.map(row => row.join(''));
  }

  function raster(mode, name, frame) {
    frame = frame || 0;
    const key = name + ':' + frame;
    if (ATLAS[mode][key]) return ATLAS[mode][key];
    let grid, palette;
    if (mode === 'before') {
      grid = spriteFrameGrid(name, frame);
      palette = SPRITE_PALETTES[name];
    } else if (afterGrid(name)) {
      grid = PROP_HERO[name] ? heroFrame(name, frame) : afterGrid(name);
      palette = PROP_PALETTE;
    } else {
      // No recolor fallback. Anything without a new grid stays visibly unchanged.
      grid = spriteFrameGrid(name, frame);
      palette = SPRITE_PALETTES[name];
    }
    const width = Math.max(...grid.map(row => row.length));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = grid.length;
    const c = canvas.getContext('2d');
    for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
      const color = palette[grid[y][x]];
      if (!color) continue;
      c.fillStyle = color; c.fillRect(x, y, 1, 1);
    }
    ATLAS[mode][key] = canvas;
    return canvas;
  }

  function sprite(c, mode, name, cx, cy, worldScale, frame, facing) {
    const atlas = raster(mode, name, frame || 0);
    const w = (atlas.width / 2) * worldScale, h = (atlas.height / 2) * worldScale;
    c.save(); c.translate(Math.round(cx), Math.round(cy)); c.scale(facing || 1, 1);
    c.imageSmoothingEnabled = false;
    c.drawImage(atlas, -w / 2, -h / 2, w, h);
    c.restore();
  }

  function shadow(c, cx, cy, radius) {
    c.save(); c.fillStyle = 'rgba(8,14,24,0.45)';
    c.beginPath(); c.ellipse(cx, cy + radius * 0.55, radius, Math.max(3, radius * 0.2), 0, 0, Math.PI * 2);
    c.fill(); c.restore();
  }

  function glow(c, cx, cy, radius) {
    const g = c.createRadialGradient(cx, cy, 3, cx, cy, radius);
    g.addColorStop(0, 'rgba(245,179,91,0.42)');
    g.addColorStop(0.5, 'rgba(218,139,51,0.19)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  function grayscale(source) {
    const cv = document.createElement('canvas');
    cv.width = source.width; cv.height = source.height;
    const c = cv.getContext('2d');
    c.drawImage(source, 0, 0);
    const image = c.getImageData(0, 0, cv.width, cv.height);
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = gray; d[i + 1] = gray; d[i + 2] = gray;
    }
    c.putImageData(image, 0, 0);
    return cv;
  }

  const SCENES = {
    town: {
      biome: 'town', fog: false,
      map: [
        '##################',
        '#................#',
        '#..s..........s..#',
        '#..s..........s..#',
        '#..s..........s..#',
        '#aaaaaaaaaaaaaaaa#',
        '#wwwwwwwbbwwwwwww#',
        '#wwwwwwwbbwwwwwww#',
        '#aaaaaaaaaaaaaaaa#',
        '#..s....ss....s..#',
        '#..s....ss....s..#',
        '##################'
      ],
      props: [
        { name: 'inn', x: 3, y: 3, scale: 2 },
        { name: 'store', x: 14, y: 3, scale: 2 },
        { name: 'hut', x: 2, y: 9, scale: 2 },
        { name: 'hut', x: 15, y: 9, scale: 2 },
        { name: 'townGate', x: 9, y: 10, scale: 2 },
        { name: 'tree', x: 6, y: 2, scale: 2 },
        { name: 'tree', x: 11, y: 2, scale: 2 },
        { name: 'tree', x: 5, y: 9, scale: 2 },
        { name: 'tree', x: 12, y: 9, scale: 2 },
        { name: 'doorstep', x: 3, y: 4, scale: 2 },
        { name: 'doorstep', x: 14, y: 4, scale: 2 },
        { name: 'bridge', x: 8, y: 6, scale: 2 },
        { name: 'bridge', x: 9, y: 6, scale: 2 },
        { name: 'bridge', x: 8, y: 7, scale: 2 },
        { name: 'bridge', x: 9, y: 7, scale: 2 },
        { name: 'knight', view: 'front', x: 8, y: 4, scale: 2, actor: true },
        { name: 'knight', view: 'side', x: 3, y: 9, scale: 2, frame: 1, actor: true },
        { name: 'knight', view: 'back', x: 8, y: 9, scale: 2, actor: true },
        { name: 'villager', x: 6, y: 10, scale: 2, actor: true },
        { name: 'merchant', x: 12, y: 10, scale: 2, actor: true },
        { name: 'catCompanion', x: 6, y: 5, scale: 2, actor: true, small: true },
        { name: 'dog', x: 11, y: 4, scale: 2, actor: true }
      ]
    },
    dungeon: {
      biome: 'crypt', fog: true,
      map: [
        '##################',
        '#.....#.....#.....#',
        '#.###.#.###.#.###.#',
        '#.#...#...#...#.#.#',
        '#.#.#####.#####.#.#',
        '#...#.....#.....#.#',
        '###.#.###.#.###.#.#',
        '#...#.#...#.#...#.#',
        '#.###.#.###.#.###.#',
        '#.....#.....#.....#',
        '#.#############.#.#',
        '##################'
      ],
      props: [
        { name: 'stairsUp', x: 2, y: 1, scale: 2 },
        { name: 'stairsDown', x: 15, y: 9, scale: 2 },
        { name: 'chest', x: 4, y: 5, scale: 2 },
        { name: 'potion', x: 8, y: 3, scale: 2 },
        { name: 'key', x: 13, y: 5, scale: 2 },
        { name: 'torch', x: 6, y: 2, scale: 2, light: true },
        { name: 'torch', x: 12, y: 8, scale: 2, light: true },
        { name: 'spikes', x: 14, y: 3, scale: 2 },
        { name: 'slime', x: 4, y: 3, scale: 2, actor: true },
        { name: 'goblin', x: 8, y: 9, scale: 2, actor: true },
        { name: 'skeleton', x: 14, y: 1, scale: 2, actor: true },
        { name: 'knight', view: 'side', x: 8, y: 7, scale: 2, frame: 1, actor: true },
        { name: 'catCompanion', x: 7, y: 7, scale: 2, actor: true, small: true }
      ]
    }
  };

  function drawScene(canvas, sceneName, mode) {
    canvas.width = 1152; canvas.height = 768;
    const c = canvas.getContext('2d');
    const spec = SCENES[sceneName];
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#0b1019'; c.fillRect(0, 0, 1152, 768);
    c.scale(2, 2); // 18x12 world tiles at 2x display scale
    const H = spec.map.length, Wd = spec.map[0].length;
    const at = (x, y) => (spec.map[y] && spec.map[y][x]) || '#';

    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const kind = spec.map[y][x];
      const wall = kind === '#', sand = kind === 's', water = kind === 'w';
      const front = wall && at(x, y + 1) !== '#';
      const variant = (x * 37 + y * 71) % 11;
      c.save(); c.translate(x * 32, y * 32);
      if (mode === 'before') {
        paintDungeonTile(c, wall, variant, front, spec.biome, sand);
        // The live game draws river water as a sprite over floor, not as a wall tile.
        if (water) sprite(c, 'before', 'water', 16, 16, 2, 0);
      } else {
        paintPropTile(c, kind, front, variant, spec.biome, {
          up: at(x, y - 1) === 'w', down: at(x, y + 1) === 'w',
          left: at(x - 1, y) === 'w', right: at(x + 1, y) === 'w'
        });
      }
      c.restore();
    }

    for (const p of spec.props) {
      const cx = p.x * 32 + 16, cy = p.y * 32 + 16;
      if (p.light) glow(c, cx, cy, 76);
      const name = mode === 'after' && p.view ? p.view : p.name;
      const scale = p.small ? (mode === 'after' ? 2 : 3) : p.scale;
      if (p.actor) shadow(c, cx, cy, 12);
      sprite(c, mode, name, cx, cy, scale, p.frame || 0, 1);
    }

    if (spec.fog) {
      const g = c.createRadialGradient(288, 192, 90, 288, 192, 340);
      g.addColorStop(0, 'rgba(5,9,18,0)'); g.addColorStop(1, 'rgba(5,9,18,0.68)');
      c.fillStyle = g; c.fillRect(0, 0, 576, 384);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  function addShot(container, id, label, canvas) {
    canvas.id = id; canvas.className = 'scene';
    const figure = document.createElement('figure'); figure.className = 'shot';
    const caption = document.createElement('figcaption'); caption.textContent = label;
    figure.append(canvas, caption); container.append(figure);
  }

  function build() {
    for (const key of ['town', 'dungeon']) {
      const container = document.getElementById('scene-' + key);
      const before = document.createElement('canvas');
      const after = document.createElement('canvas');
      drawScene(before, key, 'before');
      drawScene(after, key, 'after');
      addShot(container, 'before-' + key, 'Current artwork · color', before);
      addShot(container, 'after-' + key, 'Proposed artwork · color', after);
      addShot(container, 'gray-before-' + key, 'Current artwork · grayscale', grayscale(before));
      addShot(container, 'gray-after-' + key, 'Proposed artwork · grayscale', grayscale(after));
    }
    document.getElementById('render-note').textContent =
      'Rendered ' + new Date().toISOString() +
      ' · current left/before, proposed right/after · color and grayscale · no runtime files loaded.';
  }

  window.addEventListener('DOMContentLoaded', build);
})();
