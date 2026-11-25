/* Dev-only deterministic exporter: checked-in preview PNGs + manifests -> plain-script runtime data.
   No runtime dependency on PNGs, fetch, Node, or preview directories. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodePNG } = require('./prepare-knight.cjs');

const ROOT = __dirname;
const OUT = path.join(ROOT, '..', '..', '..', 'js', 'art-runtime.js');
const readJSON = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

function rgbaKey(data, i) { return (data[i] << 24) | (data[i+1] << 16) | (data[i+2] << 8) | data[i+3]; }
function hexRGB(r,g,b) { return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join(''); }

function encodeFrame(rgba, w, h) {
  // Palette-indexed RLE. Index 0 = transparent. Palette stores [r,g,b,a] as hex8 for non-transparent.
  const colors = new Map();
  const palette = ['00000000'];
  const idx = new Uint16Array(w * h);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    const a = rgba[i+3];
    if (a === 0) { idx[p] = 0; continue; }
    const key = rgbaKey(rgba, i);
    let id = colors.get(key);
    if (id === undefined) {
      id = palette.length;
      colors.set(key, id);
      palette.push([rgba[i],rgba[i+1],rgba[i+2],a].map(v=>v.toString(16).padStart(2,'0')).join(''));
    }
    idx[p] = id;
  }
  // RLE: [count, index] pairs, count 1-65535. Encode as base64 of uint16 LE pairs.
  const runs = [];
  for (let i = 0; i < idx.length;) {
    let j = i + 1;
    while (j < idx.length && idx[j] === idx[i] && j - i < 65535) j++;
    runs.push(j - i, idx[i]);
    i = j;
  }
  const buf = Buffer.allocUnsafe(runs.length * 2);
  for (let i = 0; i < runs.length; i++) buf.writeUInt16LE(runs[i], i * 2);
  return { w, h, p: palette, r: buf.toString('base64') };
}

function cropRGBA(src, crop) {
  const [cx, cy, cw, ch] = crop;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    src.data.copy(out, y * cw * 4, ((cy + y) * src.w + cx) * 4, ((cy + y) * src.w + cx + cw) * 4);
  }
  return out;
}

function encodeSheetFrames(sheetPath, frames) {
  const src = decodePNG(fs.readFileSync(path.join(ROOT, sheetPath)));
  return frames.map(f => {
    const rgba = cropRGBA(src, f.crop);
    const enc = encodeFrame(rgba, f.crop[2], f.crop[3]);
    enc.a = f.anchor; // [ax,ay] in frame pixels
    if (f.bounds) enc.b = f.bounds;
    if (f.empty) enc.empty = true;
    if (f.direction) enc.dir = f.direction;
    if (f.frame !== undefined) enc.fi = f.frame;
    if (f.label) enc.label = f.label;
    return enc;
  });
}

function coverageMap() {
  const coverage = readJSON('environment-v1/final-coverage.json');
  const map = new Map();
  for (const s of coverage.sources) map.set(s.runtime, s);
  return { coverage, map };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function buildCharacters(covMap) {
  const manifest = readJSON('characters-v1/manifest.json');
  const knight = readJSON('knight-reference-v1/manifest.json');
  const out = {};
  // knight
  const kSrc = decodePNG(fs.readFileSync(path.join(ROOT, knight.sheet)));
  const kFrames = {};
  for (const dir of knight.directions) {
    const frames = knight.frames.filter(f => f.direction === dir).sort((a,b)=>a.frame-b.frame);
    assert(frames.length > 0, `knight missing dir ${dir}`);
    kFrames[dir] = frames.map(f => {
      const rgba = cropRGBA(kSrc, f.crop);
      const enc = encodeFrame(rgba, f.crop[2], f.crop[3]);
      enc.a = f.anchor; enc.b = f.bounds;
      return enc;
    });
  }
  const kCov = covMap.get('knight');
  const kWorld = kCov?.baselineWorld || null, kScreen = kCov?.baselineScreen || null;
  out.knight = { kind:'hero', cell:[knight.cellSize[0],knight.cellSize[1]], dirs:kFrames, source:knight.sheet, sha:knight.sourceSHA256, world:kWorld, screen:kScreen, worldScale: kWorld&&kScreen ? +(kScreen[0]/kWorld[0]).toFixed(4) : null };
  for (const asset of manifest.assets) {
    const src = decodePNG(fs.readFileSync(path.join(ROOT, asset.sheet)));
    const dirs = {};
    for (const dir of asset.directions) {
      const frames = asset.frames.filter(f => f.direction === dir).sort((a,b)=>a.frame-b.frame);
      assert(frames.length > 0, `${asset.id} missing dir ${dir}`);
      dirs[dir] = frames.map(f => {
        const rgba = cropRGBA(src, f.crop);
        const enc = encodeFrame(rgba, f.crop[2], f.crop[3]);
        enc.a = f.anchor; enc.b = f.bounds;
        return enc;
      });
    }
    const cov = covMap.get(asset.id);
    const world = cov?.baselineWorld || null, screen = cov?.baselineScreen || null;
    out[asset.id] = { kind:asset.group, cell:asset.cellSize, dirs, source:asset.sheet, sha:asset.sourceSHA256, world, screen, worldScale: world&&screen ? +(screen[0]/world[0]).toFixed(4) : null };
  }
  return out;
}

function buildItems(covMap) {
  const manifest = readJSON('items-effects-v1/manifest.json');
  const out = {};
  for (const asset of manifest.assets) {
    const src = decodePNG(fs.readFileSync(path.join(ROOT, asset.sheet)));
    assert(asset.frames.length > 0, `${asset.id} has no frames`);
    const frames = asset.frames.map(f => {
      const rgba = cropRGBA(src, f.crop);
      const enc = encodeFrame(rgba, f.crop[2], f.crop[3]);
      enc.a = asset.anchor; // item manifest has shared anchor
      enc.b = f.bounds;
      enc.empty = !!f.empty;
      enc.label = f.label;
      return enc;
    });
    const cov = covMap.get(asset.id);
    const world = cov?.baselineWorld || null, screen = cov?.baselineScreen || null;
    out[asset.id] = { kind:asset.group, cell:[asset.cell,asset.cell], anchor:asset.anchor, screenScale:asset.screenScale, states:asset.states, frames, source:asset.sheet, sha:asset.sha256, world, screen, worldScale: world&&screen ? +(screen[0]/world[0]).toFixed(4) : null };
  }
  const itemAliases = Object.fromEntries(Object.entries(manifest.aliases || {}).filter(([k]) => !['flameOff','flameOn','stairsUp','stairsDown'].includes(k)).map(([k,v]) => [k, { ...v, fixed: v.fixed !== false }]));
  return { items: out, aliases: itemAliases };
}

function buildEnvironment(covMap) {
  const manifest = readJSON('environment-v1/manifest.json');
  const out = {};
  for (const asset of manifest.assets) {
    const src = decodePNG(fs.readFileSync(path.join(ROOT, asset.file)));
    const cov = covMap.get(asset.id);
    const world = cov?.baselineWorld || null, screen = cov?.baselineScreen || null;
    const worldScale = world&&screen ? +(screen[0]/world[0]).toFixed(4) : null;
    if (asset.kind === 'material') {
      const parts = {};
      for (const rec of asset.records) {
        const rgba = cropRGBA(src, rec.crop);
        parts[rec.name] = encodeFrame(rgba, rec.crop[2], rec.crop[3]);
      }
      out[asset.id] = { kind:'material', parts, source:asset.file, sha:asset.sha256, world, screen, worldScale };
    } else {
      assert(asset.records.length > 0, `${asset.id} missing records`);
      const rec = asset.records[0];
      const rgba = cropRGBA(src, rec.crop);
      const enc = encodeFrame(rgba, rec.crop[2], rec.crop[3]);
      enc.a = rec.anchor;
      enc.b = rec.bounds;
      out[asset.id] = { kind:'sprite', frame:enc, size:asset.size, maxVisible:asset.maxVisible, source:asset.file, sha:asset.sha256, world, screen, worldScale };
    }
  }
  return out;
}

function validatePayload(payload, coverage) {
  const errors = [];
  const cov = new Set(coverage.sources.map(s => s.runtime));
  const got = new Set();
  for (const [id, c] of Object.entries(payload.characters)) {
    got.add(id);
    for (const dir of ['front','back','left','right']) {
      const frames = c.dirs?.[dir];
      if (!Array.isArray(frames) || !frames.length) errors.push(`char ${id} missing dir ${dir}`);
      for (const f of frames || []) {
        if (!f || !f.w || !f.h || !Array.isArray(f.a) || f.a.length !== 2) errors.push(`char ${id}/${dir} bad frame/anchor`);
        if (!f.b || typeof f.b.x !== 'number') errors.push(`char ${id}/${dir} bad bounds`);
        if (typeof f.r !== 'string' || !Array.isArray(f.p)) errors.push(`char ${id}/${dir} bad encoding`);
      }
    }
  }
  for (const [id, it] of Object.entries(payload.items)) {
    got.add(id);
    if (!Array.isArray(it.frames) || !it.frames.length) errors.push(`item ${id} missing frames`);
    for (const f of it.frames || []) {
      if (!f || !f.w || !f.h || !Array.isArray(f.a) || f.a.length !== 2) errors.push(`item ${id} bad frame/anchor`);
      if (f.empty !== true && (!f.b || typeof f.b.x !== 'number')) errors.push(`item ${id} bad bounds`);
      if (typeof f.r !== 'string' || !Array.isArray(f.p)) errors.push(`item ${id} bad encoding`);
    }
  }
  for (const [id, env] of Object.entries(payload.environment)) {
    got.add(id);
    if (env.kind === 'material') {
      for (const part of ['floor','top','face','accent','grass','dirt','cobble','water']) {
        if (!env.parts?.[part]) continue;
        const f = env.parts[part];
        if (!f.w || !f.h || typeof f.r !== 'string') errors.push(`env ${id}.${part} bad frame`);
      }
      const expected = id === 'town' ? ['grass','dirt','cobble','water'] : ['floor','top','face','accent'];
      for (const part of expected) if (!env.parts?.[part]) errors.push(`env ${id} missing ${part}`);
    } else if (env.kind === 'sprite') {
      const f = env.frame;
      if (!f || !f.w || !f.h || !Array.isArray(f.a) || !f.b) errors.push(`env ${id} bad sprite frame`);
    } else errors.push(`env ${id} bad kind`);
  }
  // known semantic aliases resolved in runtime, not direct assets
  const semantic = payload.aliases || {};
  for (const n of cov) if (!got.has(n) && !payload.itemAliases?.[n] && !semantic[n]) errors.push(`coverage role missing from runtime: ${n}`);
  function kindOf(name) {
    if (payload.characters[name]) return 'character';
    if (payload.items[name]) return 'item';
    const env = payload.environment[name];
    if (env && env.kind === 'sprite') return 'environment';
    if (env && env.kind === 'material') return 'material';
    return null;
  }
  function resolveAlias(name, stack = []) {
    if (stack.includes(name)) { errors.push(`alias cycle: ${[...stack, name].join(' -> ')}`); return null; }
    const sem = semantic[name];
    if (sem) {
      if (!['character','material','environment','item'].includes(sem.kind)) { errors.push(`alias ${name} has unsupported kind ${sem.kind}`); return null; }
      if (sem.kind === 'material') {
        const mat = sem.material || sem.id;
        const part = sem.part || 'floor';
        const env = payload.environment[mat];
        if (!env || env.kind !== 'material' || !env.parts || !env.parts[part]) errors.push(`alias ${name} -> missing material ${mat}.${part}`);
        return { kind:'material', fixed: !!sem.fixed };
      }
      const id = sem.id;
      if (!id) { errors.push(`alias ${name} missing id`); return null; }
      const nextSem = semantic[id];
      const nextItem = payload.itemAliases?.[id];
      if (nextSem || nextItem) return resolveAlias(id, stack.concat(name));
      const k = kindOf(id);
      if (sem.kind !== k) errors.push(`alias ${name} -> ${id} expected ${sem.kind} got ${k || 'missing'}`);
      if (sem.kind === 'item') {
        const it = payload.items[id];
        const frame = sem.fixed ? (sem.frame || 0) : (sem.frame || 0);
        if (it && (frame < 0 || frame >= it.frames.length)) errors.push(`alias ${name} frame out of range`);
      }
      return { kind: sem.kind, fixed: !!sem.fixed };
    }
    const ia = payload.itemAliases?.[name];
    if (ia) {
      if (!ia.id) { errors.push(`item alias ${name} missing id`); return null; }
      if (semantic[ia.id] || payload.itemAliases[ia.id]) return resolveAlias(ia.id, stack.concat(name));
      const it = payload.items[ia.id];
      if (!it) errors.push(`item alias ${name} -> missing item ${ia.id}`);
      const frame = ia.frame || 0;
      if (it && (frame < 0 || frame >= it.frames.length)) errors.push(`item alias ${name} frame out of range`);
      if (ia.fixed !== undefined && typeof ia.fixed !== 'boolean') errors.push(`item alias ${name} fixed must be boolean`);
      return { kind:'item', fixed: ia.fixed !== false };
    }
    return null;
  }

  for (const [k,v] of Object.entries(payload.itemAliases || {})) {
    if (!v || typeof v.id !== 'string') { errors.push(`item alias ${k} missing id`); continue; }
    if (typeof v.frame !== 'number') { errors.push(`item alias ${k} missing numeric frame`); continue; }
    resolveAlias(k);
  }
  for (const [k] of Object.entries(semantic)) resolveAlias(k);
  for (const n of cov) {
    if (got.has(n)) continue;
    if (payload.itemAliases?.[n]) continue;
    if (semantic[n]) continue;
    errors.push(`coverage role missing from runtime: ${n}`);
  }
  // Validate all covered roles resolve to concrete frame/dimensions where applicable.
  for (const c of payload.coverage || []) {
    const name = c.runtime;
    const sema = semantic[name];
    const ia = payload.itemAliases?.[name];
    if (sema) {
      if (sema.kind === 'character' && !payload.characters[sema.id]) errors.push(`coverage ${name} -> missing character ${sema.id}`);
      if (sema.kind === 'item' && !payload.items[sema.id]) errors.push(`coverage ${name} -> missing item ${sema.id}`);
      if (sema.kind === 'environment' && !(payload.environment[sema.id] && payload.environment[sema.id].kind === 'sprite')) errors.push(`coverage ${name} -> missing environment sprite ${sema.id}`);
      if (sema.kind === 'material') {
        const env = payload.environment[sema.material];
        if (!env || !env.parts || !env.parts[sema.part]) errors.push(`coverage ${name} -> missing material ${sema.material}.${sema.part}`);
      }
    } else if (ia) {
      if (!payload.items[ia.id]) errors.push(`coverage ${name} -> missing item ${ia.id}`);
    } else {
      const k = kindOf(name);
      if (!k) errors.push(`coverage ${name} unresolved`);
    }
  }
  if (payload.artDensity !== 2) errors.push('artDensity must be 2');
  if (!payload.topology || payload.topology.maxPatterns !== 47) errors.push('topology metadata missing/invalid');
  for (const c of payload.coverage || []) {
    if (!Array.isArray(c.world) || !Array.isArray(c.screen)) errors.push(`coverage ${c.runtime} missing world/screen`);
  }
  if (errors.length) throw new Error('ART_RUNTIME validation failed:\n' + errors.join('\n'));
}

function buildPayload() {
  const { coverage, map: covMap } = coverageMap();
  const characters = buildCharacters(covMap);
  const items = buildItems(covMap);
  const environment = buildEnvironment(covMap);
  const payload = {
    version: 2,
    generated: '2026-11-25',
    artDensity: 2,
    source: '0x72 reference-derived preview assets; see docs/previews/2026-11-25-0x72/environment-v1/final-coverage.json',
    topology: {
      type: 'normalized-8-neighbor-47-pattern',
      bits: { N:1, E:2, S:4, W:8, NE:16, SE:32, SW:64, NW:128 },
      normalize: 'clear diagonal if either adjacent cardinal missing',
      maxPatterns: 47,
    },
    aliases: {
      throne: { kind: 'environment', id: 'dais', fixed: true },
      dragon: { kind: 'character', id: 'dragonBoss', fixed: false },
      water: { kind: 'material', material: 'town', part: 'water', fixed: true },
      rubble: { kind: 'environment', id: 'rock', fixed: true },
      stairsUp: { kind: 'item', id: 'stairs', frame: 0, fixed: true },
      stairsDown: { kind: 'item', id: 'stairs', frame: 1, fixed: true },
      flameOff: { kind: 'item', id: 'fireVent', frame: 0, fixed: true },
      flameOn: { kind: 'item', id: 'fireVent', frame: 2, fixed: true },
    },
    coverage: coverage.sources.map(s => ({ runtime:s.runtime, kind:s.kind, selectedId:s.selectedId, source:s.source, alias:s.alias||null, world:s.baselineWorld||null, screen:s.baselineScreen||null })),
    characters, items: items.items, itemAliases: items.aliases, environment
  };
  validatePayload(payload, coverage);
  return payload;
}

function buildJS(payload = buildPayload()) {
  const json = JSON.stringify(payload);
  return `/* Generated dev-only by docs/previews/2026-11-25-0x72/bake-runtime.cjs. Do not hand-edit. */\nconst ART_RUNTIME = ${json};\nif (typeof globalThis !== 'undefined') globalThis.ART_RUNTIME = ART_RUNTIME;\n`;
}

function main(argv = process.argv.slice(2)) {
  const check = argv.includes('--check');
  const outIdx = argv.indexOf('--out');
  const out = outIdx >= 0 ? path.resolve(argv[outIdx + 1]) : OUT;
  const js = buildJS();
  if (check) {
    const existing = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
    if (existing !== js) {
      console.error('ART_RUNTIME out of date:', out);
      process.exit(1);
    }
    console.log('ok', out, (Buffer.byteLength(js)/1024/1024).toFixed(2)+'MB');
    return;
  }
  fs.writeFileSync(out, js);
  console.log('wrote', out, (Buffer.byteLength(js)/1024/1024).toFixed(2)+'MB', 'chars='+Object.keys(buildPayload().characters || {}).length);
}

module.exports = { buildPayload, buildJS, validatePayload, encodeFrame, cropRGBA, decodePNG, OUT };

if (require.main === module) main();
