const SPRITES = {
  knight: [
    '......kkkk......',
    '.....kSSSSk.....',
    '....kSSSSSSk....',
    '....kSwwSSSk....',
    '....kSSSSSSk....',
    '....kvvvvvvk....',
    '....kvvvvvvk....',
    '....kSSSSSSk....',
    '...kkSSSSSSkk...',
    '..kSSkSSSSkSSk..',
    '..kSSkSSSSkSSk..',
    '..kkk.kyyk.kkk..',
    '......kyyk......',
    '......kSSk......',
    '......kSSk......',
    '......kkkk......',
  ],
  slime: [
    '......kkkk......',
    '....kkmmmmkk....',
    '...kmmmmmmmmk...',
    '..kmmmmmmmmmmk..',
    '.kmmmmmmmmmmmmk.',
    '.kmmmmmmmmmmmmk.',
    '.kmmwwmmmmwwmmk.',
    '.kmmwkmmmmwkmmk.',
    '.kmmmmmmmmmmmmk.',
    '.kmmmmmmmmmmmmk.',
    '..kmmmmmmmmmmk..',
    '...kkkkkkkkkk...',
  ],
  bat: [
    '..kk........kk..',
    '..kmmk....kmmk..',
    '..kmmmk..kmmmk..',
    '..kmmmmkkmmmmk..',
    '..kmmmmmmmmmmk..',
    '...kmmwwmmwwk...',
    '...kmmkmmkmmk...',
    '...kmmmmmmmmk...',
    '....kmmmmmmk....',
    '.....kkkkkk.....',
  ],
  goblin: [
    '......kkkk......',
    '....kkmmmmkk....',
    '..kkkmmmmmmkkk..',
    '.kkmmmmmmmmmmkk.',
    '.kmmwmmmmmmwmmk.',
    '.kmmwkmmmmwkmmk.',
    '.kmmmmmmmmmmmmk.',
    '.kkmmmmmmmmmmkk.',
    '...kmmmmmmmmk...',
    '...kmmwkkwmmk...',
    '....kkkkkkkk....',
  ],
  skeleton: [
    '....kkkkkkkk....',
    '...kwwwwwwwwk...',
    '...kwwwwwwwwk...',
    '...kwvwwwwvwk...',
    '...kwwwwwwwwk...',
    '...kwwwwvwwk....',
    '....kwwwwwwk....',
    '....kwvkwvk.....',
    '....kkkkkkk.....',
    '.....kwkwk......',
    '.....kwkwk......',
    '.....kkkkk......',
  ],
  orc: [
    '......kkkk......',
    '....kkmmmmkk....',
    '...kmmmmmmmmk...',
    '..kmmmmmmmmmmk..',
    '..kmmwkmmwkmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmwkkkkwmmk..',
    '...kmmmmmmmmk...',
    '..kkmmmmmmmmkk..',
    '..kmmmmmmmmmmk..',
    '...kkkkkkkkkk...',
  ],
  mimic: [
    '......kkkk......',
    '....kkttttkk....',
    '...kttttttttk...',
    '..kttttttttttk..',
    '..kttkkttkkttk..',
    '..kttttttttttk..',
    '..kttwkttkwttk..',
    '..kttttttttttk..',
    '...kttttttttk...',
    '....kkttttkk....',
    '...kkkkkkkkkk...',
  ],
  merchant: [
    '......kkkk......',
    '....kkttttkk....',
    '...kttttttttk...',
    '...kttwwttttk...',
    '...kttttttttk...',
    '....kttttttk....',
    '...kkttttttkk...',
    '..ktttktttkttk..',
    '..kttktttttktk..',
    '..kttttttttttk..',
    '...kkkkkkkkkk...',
  ],
  prisoner: [
    '......kkkk......',
    '....kkppppkk....',
    '...kppppppppk...',
    '...kpwwpwwpk....',
    '...kppppppppk...',
    '....kpppppk.....',
    '..kkpppppppkk...',
    '..kpppkkkkppk...',
    '..kpppkkkkppk...',
    '..kkkkkkkkkkk...',
  ],
  princess: [
    '......kkkk......',
    '....kkccccck....',
    '...kcccccccck...',
    '...kcwwccwwck...',
    '...kcccccccck...',
    '....kccccck.....',
    '...kkccccckk....',
    '..kccckcckcck...',
    '..kcccckcckcck..',
    '..kccccccccck...',
    '...kkkkkkkkkk...',
  ],
  dragon: [
    '...kk......kk...',
    '..kmmk....kmmk..',
    '..kmmmk..kmmmk..',
    '...kmmmkkmmmk...',
    '....kmmmmmmk....',
    '....kmmwwmmk....',
    '....kmmmmmmk....',
    '...kmmmmmmmmk...',
    '..kmmmmmmmmmmk..',
    '..kmmmkkkkmmmk..',
    '...kkkkkkkkkk...',
  ],
};


const SPRITE_PALETTES = {
  knight: { k: '#11131c', S: '#8a8f9c', w: '#ffffff', v: '#22262f', y: '#d8b45a' },
  slime:    { k: '#0f3d17', m: '#4cd964', w: '#eaffea' },
  bat:      { k: '#241a3a', m: '#b084ff', w: '#ffffff' },
  goblin:   { k: '#3a1503', m: '#ff8a3d', w: '#ffffff' },
  skeleton: { k: '#26262a', w: '#e8e6df', v: '#1a1a1e' },
  orc:      { k: '#3d0f0f', m: '#ff3d3d', w: '#ffffff' },
  mimic:    { k: '#1c1503', t: '#8a6d1f', w: '#ffffff' },
  merchant: { k: '#1a0f2e', t: '#7a4fd0', w: '#ffffff' },
  prisoner: { k: '#15110a', p: '#c9a86a', w: '#1a1a1e' },
  princess: { k: '#2e1030', c: '#ff7ad9', w: '#ffffff' },
  dragon:   { k: '#101c0a', m: '#3fae4a', w: '#ffffff' },
};


function drawSprite(name, cx, cy, scale) {
  const grid = SPRITES[name];
  const pal = SPRITE_PALETTES[name];
  const h = grid.length;
  const w = Math.max(...grid.map(r => r.length));
  const x0 = cx - (w * scale) / 2;
  const y0 = cy - (h * scale) / 2;
  for (let j = 0; j < h; j++) {
    const row = grid[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const color = pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x0 + i * scale, y0 + j * scale, scale, scale);
    }
  }
}

