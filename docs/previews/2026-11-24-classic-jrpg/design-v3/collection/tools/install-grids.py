# Optional development-only exporter: updates the sprite-data prefix, preserving rendering functions.
from pathlib import Path
import json,itertools,sys
if len(sys.argv)!=3: raise SystemExit('Usage: python3 install-grids.py /path/to/dungeon-jrpg-baked.json /path/to/js/sprites.js')
assets=json.load(open(sys.argv[1]));unique=[];ids={}
def b36(n):
 s='';digits='0123456789abcdefghijklmnopqrstuvwxyz'
 while n:s=digits[n%36]+s;n//=36
 return s or '0'
def rle(rows):return '|'.join(''.join(ch+b36(len(list(g)))+',' for ch,g in itertools.groupby(row)) for row in rows)
variants={};palettes={}
for name,a in assets.items():
 palettes[name]=a['palette'];variants[name]={}
 for direction,frames in a['variants'].items():
  indices=[]
  for grid in frames:
   assert grid and all(len(r)==len(grid[0]) for r in grid)
   assert any(ch!='.' for row in grid for ch in row),name
   key='\n'.join(grid)
   if key not in ids:ids[key]=len(unique);unique.append(rle(grid))
   indices.append(ids[key])
  variants[name][direction]=indices
header='''// Approved original JRPG artwork, baked from the local design painters.\n// Self-contained run-length pixel grids: no preview files, image loading or build step at runtime.\n// Two source pixels per logical sprite pixel; palette alpha is retained for translucent wings.\nconst ART_DENSITY = 2;\nfunction decodeSpriteGrid(encoded) {\n  return encoded.split('|').map(row => Array.from(row.matchAll(/(.)([0-9a-z]+),/gu), m => m[1].repeat(parseInt(m[2], 36))).join(''));\n}\nconst JRPG_GRIDS = [\n'''
header+='\n'.join('  '+json.dumps(s,ensure_ascii=False)+',' for s in unique)+'\n].map(decodeSpriteGrid);\n'
header+='const JRPG_VARIANTS = '+json.dumps(variants,ensure_ascii=False,separators=(',',':'))+';\n'
header+='const SPRITE_PALETTES = '+json.dumps(palettes,ensure_ascii=False,separators=(',',':'))+';\n'
header+='const SPRITES = Object.fromEntries(Object.entries(JRPG_VARIANTS).map(([name, dirs]) => [name, JRPG_GRIDS[dirs.front[0]]]));\n\n'
p=Path(sys.argv[2]);s=p.read_text();a=s.index('// Disposable raster caches');p.write_text(header+s[a:]);print('Installed',len(assets),'sprites in',p.stat().st_size,'bytes')
