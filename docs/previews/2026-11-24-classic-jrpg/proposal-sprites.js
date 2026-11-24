// Classic JRPG visual proposal — original, isolated artwork. Not loaded by the game.
// Same code-native grid approach as js/sprites.js so the proposal can be judged at real scale.

const PROP_PALETTE = {
  k: '#17131b', // outline
  s: '#9aafbd', S: '#64798c', w: '#c2d0d9', // steel, shade, lit
  y: '#c89745', Y: '#f0d384', // brass, highlight
  r: '#963f4a', R: '#5f2833', // crimson cloth
  f: '#e2b98d', F: '#b98361', // skin
  b: '#775034', B: '#a8784a', d: '#3a2b22', // leather, wood, dark
  g: '#6b9b52', G: '#9bc46f', m: '#4f6b3c', // greens
  p: '#7a5aa0', P: '#a483cc', v: '#6a4a82', V: '#9370a8', // purple/violet
  t: '#3f6f61', T: '#62968a', // teal cloth
  l: '#e0d6b8', L: '#a89c7d', // bone / sand bank
  W: '#f6f2e0', e: '#1a1410', c: '#7fd6d0', o: '#d7ac5e',
  h: '#6b4a2f', H: '#a07a4a', O: '#e8b45c',
  u: '#164452', U: '#3d8fa0', q: '#0e2d38' // river water, lit ripple, deep edge
};

const rows = (...lines) => {
  const clean = lines.map(line => line.replace(/ /g, '.'));
  const width = Math.max(...clean.map(line => line.length), 32);
  const out = clean.map(line => line.padEnd(width, '.'));
  while (out.length < 32) out.push('.'.repeat(width));
  return out;
};

// Mutable 32x32 grid helpers for shaped props. rows() returns strings; these return char arrays.
const propGrid = () => rows('').map(row => row.split(''));
const propRect = (g, x, y, w, h, color) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx >= 0 && yy >= 0 && xx < 32 && yy < 32) g[yy][xx] = color;
  }
};
const finishGrid = g => g.map(row => row.join(''));

// Hero: front / back / right side (left mirrors). Frame 1 is a stride variant.
const PROP_HERO = {
  front: rows(
    '.........rr.................',
    '........rRRr................',
    '.......krrrrk...............',
    '......kssssssk..............',
    '.....kssssssssk.............',
    '.....ksYYYYYYsk.............',
    '.....ksSSSSSSsk.............',
    '.....kseekkeesk.............',
    '.....kskeffefsk.............',
    '.....kskeffefsk.............',
    '.....ksseFFFessk............',
    '......kssssssssk............',
    '......kksssssskk............',
    '.....kyyyyyyyyyk............',
    '....ksssYyyyYsssk...........',
    '...kssssSSSSSSssssk.........',
    '...ksssySSrrSSysssk.........',
    '...ksssySSrrSSysssk.........',
    '...ksssySSSSSSysssk.........',
    '....kkkkyyyyyykkkk..........',
    '......krrrrrrrrk............',
    '......krrrrrrrrk............',
    '......krrk..krrk............',
    '......krrk..krrk............',
    '......krrk..krrk............',
    '......kbbk..kbbk............',
    '......kBBk..kBBk............',
    '.....kkbbk..kkbbkk..........',
    '......kkkk..kkkk............'
  ),
  back: rows(
    '.........rr.................',
    '........rRRr................',
    '.......krrrrk...............',
    '......kssssssk..............',
    '.....kssssssssk.............',
    '.....ksYYYYYYsk.............',
    '.....ksSSSSSSsk.............',
    '.....ksSSSSSSsk.............',
    '......kssssssssk............',
    '......kttttttttk............',
    '.....kttttttttttk...........',
    '....ktttttyytttttk..........',
    '....ktttttyytttttk..........',
    '....kttttSSSSttttk..........',
    '....kttttSSSSttttk..........',
    '....kttttttttttttk..........',
    '.....kttttttttttk...........',
    '......kttttttttk............',
    '......kttk..kttk............',
    '......kttk..kttk............',
    '......kbbk..kbbk............',
    '......kBBk..kBBk............',
    '.....kkbbk..kkbbkk..........',
    '......kkkk..kkkk............'
  ),
  side: rows(
    '.........rr.................',
    '........rRRr................',
    '.......krrrrk...............',
    '......kssssssk..............',
    '.....kssssssssk.............',
    '.....ksYYYYYYsk.............',
    '.....ksSSSSSSsk.............',
    '.....kseekkkssk.............',
    '.....kskeffefs..............',
    '.....kskeffefs..............',
    '......kseFFFss..............',
    '......ksssssssk.............',
    '......kkyyyyyyk.............',
    '.....ksssYYsssk.............',
    '....ksssySSSsssk............',
    '....ksssySSSsssk............',
    '.....kkkyyyykkk.............',
    '......krrrrrrk..............',
    '......krrrrrrk..............',
    '......krrk.krrk.............',
    '......krrk.krrk.............',
    '......kbbk.kbbk.............',
    '......kBBk.kBBk.............',
    '.....kkbbk.kkbbkk...........',
    '......kkkk.kkkk.............'
  )
};
// sword hilt and scabbard on the back/side views
for (const dir of ['back', 'side']) {
  const g = PROP_HERO[dir];
  for (let y = 9; y <= 14; y++) g[y] = g[y].slice(0, 6) + 'ky' + g[y].slice(8);
  for (let y = 15; y <= 20; y++) g[y] = g[y].slice(0, 6) + 'kb' + g[y].slice(8);
}

// Eight ordinary enemies, re-drawn with the shared palette and clearer silhouettes.
const PROP_MONSTERS = {
  slime: rows(
    '.......kkkkkkk..............',
    '......kgggggggk.............',
    '.....kgGGGGGGGgk............',
    '....kgGGllllGGGgk...........',
    '...kgGlfffWlfGGGgk..........',
    '...kgGlkeeklGGGgk...........',
    '..kgGGlfffWlGGGGgk..........',
    '..kgGGGGGGGGGGGGgk..........',
    '.kgGGGGGGGGGGGGGgk..........',
    '.kgGGGkkkkkGGGGGgk..........',
    '.kgggGGGGGGGGgggk...........',
    'kgggGGGGGGGGGGgggk..........',
    'kddgggGGGGGGGgggdk..........',
    '.kdddggggggggdddk...........',
    '..kkddddddddddkk............',
    '....kkkkkkkkkk..............'
  ),
  bat: rows(
    '.k.......k.......k..........',
    '.ktk.....ktk.....ktk........',
    'kttTk...ktttk...kTttk.......',
    'kttRTkkktttkkkkktTRtk.......',
    'kttRRTTTvTTRRTTTtRttk.......',
    '.kttRRTTvvTT RRtRtk.........',
    '..ktttRRvffvRRttt k.........',
    '...kktttffftttkk............',
    '......kvffffv.k.............',
    '......kvfeefvk..............',
    '......kffeeffk..............',
    '.......kffffk...............',
    '........kkkk................'
  ),
  wasp: rows(
    '.......YY...YY..............',
    '.......YY...YY..............',
    '......kYYk.kYYk.............',
    '.....kyykyykyyk.............',
    '....kyylTTTTlyyk............',
    '...klylTTTTTTlylk...........',
    '...klylTTkkTTlylk...........',
    '...kyylTkeekTlyyk...........',
    '....kylTkkkkTlyk............',
    '....kyyyYYYYyyyk............',
    '.....kyyYYYYyyk.............',
    '.....kyyYYYYyyk.............',
    '......kyykkkyyk.............',
    '.......kykkkyk..............',
    '........kkkkk...............'
  ),
  mage: rows(
    '......kppppppk..............',
    '.....kppppppppk.............',
    '....kppPPPPPPppk............',
    '....kpPkkkkkkPpk............',
    '....kpPkeeeekPpk............',
    '....kpPkffffkPpk............',
    '.....kppffffppk.............',
    '....kppppppppppk............',
    '...kppppPPppppppk...........',
    '..kpppppPPpppppppk.....c....',
    '..kpppppPPpppppppk.....k....',
    '..kpppppPPpppppppk.....y....',
    '...kpppPPPPpppppk......y....',
    '....kpppPPPPpppk.......y....',
    '.....kppppppppk........y....',
    '......kkkkkkkk..............'
  ),
  healer: rows(
    '......kWWWWWWk..............',
    '.....kWWWWWWWWk.............',
    '....kWffffffWWk.............',
    '....kWfkeekfWWk.............',
    '....kWffffffWWk.............',
    '.....kWfffffWk..............',
    '....kWWWWWWWWWWk............',
    '...kWWWWWrrWWWWWk...........',
    '...kWWWWWrrWWWWWk.......W...',
    '...kWWWWWrrWWWWWk.......y...',
    '...kWWWWWrrWWWWWk.......y...',
    '....kWWWWrrWWWWk........y...',
    '.....kWWWWWWWWk.........y...',
    '......kkkkkkkk..............'
  ),
  goblin: rows(
    '.....kggggggk...............',
    '....kggGGGGggk..............',
    '...kgggGGGGgggk.............',
    '...kgGkYYkGggk..............',
    '...kgGkkkkGggk..............',
    '....kgggGGgggk..............',
    '.....kkkGGkkk...............',
    '...kbbkGGkbbk...............',
    '..kbbbbGGbbbbk..............',
    '..kbbbYYYYbbbbk........ks...',
    '..kbbbYYYYbbbbk.......kss...',
    '...kbbYYYYbbbk........kss...',
    '....kbbkkbbk..........kss...',
    '....kbbk.kbbk...............',
    '....kbbk.kbbk...............',
    '....kddk.kddk...............',
    '....kddk.kddk...............',
    '....kkkk.kkkk...............'
  ),
  skeleton: rows(
    '.....kllllllk...............',
    '....klLLLLLLlk..............',
    '....klkkeekkllk.............',
    '....klkkeekkllk.............',
    '....kllkkkkllk..............',
    '.....kllllllk...............',
    '.....klLllLlk...............',
    '....klllLLlllk..............',
    '....kllLLLLllk.........ks...',
    '....kllkkkkllk.........ks...',
    '.....kllkkllk..........ks...',
    '......kllllk...........ks...',
    '......kl..lk................',
    '......kl..lk................',
    '......kd..dk................',
    '......kd..dk................',
    '......kk..kk................'
  ),
  orc: rows(
    '....kkkgggggkkk.............',
    '...kgggGGGGGgggk............',
    '..kgggGGGGGGGgggk...........',
    '..kggkYYkYYkgggk............',
    '..kggkkkkkkkgggk............',
    '...kgkWkkkWkggk.............',
    '..kbbbgggggbbbbk............',
    '.kbbbbgggggbbbbbk...........',
    '.kbbbYgggggYbbbbk...........',
    '.kbbbbbbbbbbbbbbk.....ks....',
    '.kbbbYYYYYYbbbbbk....kss....',
    '..kbbbYYYYbbbbbk.....kss....',
    '...kbbbbbbbbbbk......kss....',
    '....kbbkkkkbbk..............',
    '....kbbk..kbbk..............',
    '....kddk..kddk..............',
    '....kddk..kddk..............',
    '....kkkk..kkkk..............'
  )
};

// Representative NPCs and animals re-drawn in the same hand.
const PROP_PEOPLE = {
  merchant: rows(
    '......kppppppk..............',
    '.....kppPPPPppk.............',
    '....kpppPPppppk.............',
    '....kpPkeekPpk..............',
    '....kpPkffkPpk..............',
    '....kppkffkppk..............',
    '...kbbbbffbbbbk.............',
    '..kbbbbbbbbbbbbk............',
    '..kbbbYYYYbbbbbk.....o......',
    '..kbbbYYYYbbbbbk.....y......',
    '..kbbbYYYYbbbbbk....oyyo....',
    '..kbbbbbbbbbbbbk.....y......',
    '...kbbbbbbbbbbk......y......',
    '....kbbkkkbbbk..............',
    '....kbbk.kbbk...............',
    '....kddk.kddk...............',
    '....kkkk.kkkk...............'
  ),
  villager: rows(
    '......khhhHhhk..............',
    '.....khHHHHHHhk.............',
    '.....khkffefkhk.............',
    '.....khkeffekhk.............',
    '......kfffffk...............',
    '.....kttttttt tk............',
    '....kttttttttt tk...........',
    '....kttYYYYYYttk............',
    '....kttttttttt tk...........',
    '.....kttttttt tk............',
    '.....kbbk.kbbk..............',
    '.....kbbk.kbbk..............',
    '.....kddk.kddk..............',
    '.....kkkk.kkkk..............'
  ),
  princess: rows(
    '.....kYYYYYYk...............',
    '....kYYYYYYYYk..............',
    '....kYyYyYyYyYk.............',
    '....kffffffflk..............',
    '....kfkeekfflk..............',
    '....kffffffflk..............',
    '...kppppppppppk.............',
    '..kpppPPPPppppppk...........',
    '..kppPPPPPPpppppk...........',
    '..kppPPPPPPpppppk...........',
    '..kppPPPPPPpppppk...........',
    '...kppppppppppk.............',
    '....kppppppppk..............',
    '.....kkkkkkkk...............'
  ),
  prisoner: rows(
    '......khhhHhk...............',
    '.....khHHHHHhk..............',
    '.....khkeeehkk..............',
    '.....khffffhk...............',
    '......kffffk................',
    '.....kbbbbbbb k.............',
    '....kbbbbbbbbbk.............',
    '....kbbbbbbbbbk.............',
    '....kbbbbbbbbbk.............',
    '.....kbbbbbbbk..............',
    '.....kbbk.kbbk..............',
    '.....kbbk.kbbk..............',
    '.....kddk.kddk..............',
    '.....kkkk.kkkk..............'
  ),
  cat: rows(
    '............................',
    '..kk......kk................',
    '..kf......kf................',
    '.kffffffkffff...............',
    '.kfkeekffkeefk..............',
    '.kffffYffffffk..............',
    '..kfffffffkffk..............',
    '...kkfffffkkk...............',
    '....kffffffk................',
    '...kfffffffk................',
    '...kffkkffk.................',
    '..kkffkkffkk................',
    '....kk..kk..................'
  ),
  catCompanion: rows(
    '..kk......kk................',
    '..kf......kf................',
    '.kffffffkffff...............',
    '.kfkeekffkeefk..............',
    '.kffffYffffffk..............',
    '..kfffffffkffk..............',
    '...kkfffffkkk...............',
    '....kffffffk................',
    '...kffrrrrffk...............',
    '...kffrYYrffk...............',
    '...kfffffffk................',
    '...kffkkffk.................',
    '..kkffkkffkk................',
    '....kk..kk..................'
  ),
  dog: rows(
    '............................',
    '........kkk.................',
    '.......kBffBk...............',
    '......kBfffbBk..............',
    '.....kbbbbbbbbk.............',
    '...kbbbbbbbbbbbk............',
    '..kbbbbbbbbbbbbbk...........',
    '..kbbbbbbbbbbbbbk...........',
    '...kbbbYYYYbbbbk............',
    '....kbbbbbbbbbk.............',
    '....kbbk..kbbk..............',
    '....kddk..kddk..............',
    '....kkkk..kkkk..............'
  ),
  chicken: rows(
    '............................',
    '..............krrk..........',
    '.............krrrrk.........',
    '............kWWWWWWk........',
    '...........kWkeekWWk........',
    '...........kWYYYYWWk........',
    '............kWWWWWk.........',
    '.....kWWWWWWWWWWWWk.........',
    '....kWWWWWWWWWWWWWWk........',
    '....kWffffWWffffWWk.........',
    '....kWWWWWWWWWWWWWWk........',
    '.....kWWWWWWWWWWWWk.........',
    '......kkWWWWWWkk............',
    '.......kkkkkkkk.............'
  )
};

// Town props with real silhouette changes: pitched gables, facades, organic canopies and river structures.
function propTownSprite(kind) {
  const g = propGrid();
  const rect = (x, y, w, h, color) => propRect(g, x, y, w, h, color);
  const gable = (top, rows, roof, trim) => {
    for (let dy = 0; dy < rows; dy++) {
      const half = 2 + dy, yy = top + dy;
      rect(16 - half, yy, half * 2 + 1, 1, roof);
      g[yy][16 - half] = 'k'; g[yy][16 + half] = 'k';
      if (dy > 1) g[yy][16 - half + 1] = trim;
    }
  };
  if (kind === 'inn' || kind === 'store') {
    const roof = kind === 'inn' ? 'r' : 't', trim = kind === 'inn' ? 'R' : 'T';
    rect(4, 12, 24, 19, 'b');               // shaded front facade
    rect(4, 12, 24, 2, 'B');                // lit fascia
    rect(5, 14, 22, 3, 'd');                // beam shadow under eaves
    rect(6, 18, 7, 7, 'W'); rect(19, 18, 7, 7, 'W');
    rect(7, 19, 5, 5, 'y'); rect(20, 19, 5, 5, 'y');
    rect(3, 19, 3, 3, 'd'); rect(26, 19, 3, 3, 'd');
    rect(13, 21, 6, 10, 'd'); rect(14, 22, 4, 9, 'k');
    rect(15, 27, 1, 1, 'Y'); rect(3, 31, 26, 1, 'k');
    gable(3, 9, roof, trim);                 // pitched roof: 9 stepped courses
    rect(2, 12, 28, 1, 'k');                 // eave shadow
    rect(21, 2, 4, 6, 's'); rect(21, 2, 4, 1, 'w'); // chimney
    rect(9, 13, 14, 3, 'b'); rect(10, 14, 12, 1, trim); // signboard
    rect(13, 15, 6, 1, 'W');
  } else if (kind === 'hut') {
    rect(5, 14, 22, 17, 'b'); rect(5, 14, 22, 2, 'B');
    rect(7, 19, 6, 6, 'W'); rect(19, 19, 6, 6, 'W');
    rect(8, 20, 4, 4, 'y'); rect(20, 20, 4, 4, 'y');
    rect(13, 22, 6, 9, 'd'); rect(14, 23, 4, 8, 'k');
    gable(6, 8, 'r', 'B');
    rect(3, 14, 26, 1, 'k');
  } else if (kind === 'townGate') {
    rect(4, 7, 24, 5, 'b'); rect(5, 5, 22, 2, 'Y'); // lintel with lit cap
    rect(5, 10, 7, 21, 's'); rect(20, 10, 7, 21, 's');
    rect(5, 10, 7, 2, 'w'); rect(20, 10, 7, 2, 'w');
    rect(6, 14, 5, 2, 'S'); rect(21, 14, 5, 2, 'S');
    for (let y = 10; y <= 14; y++) {        // stepped arch, not a flat opening
      const half = 6 - (y - 10);
      rect(16 - half, y, half * 2 + 1, 1, 'k');
    }
    rect(9, 15, 14, 16, 'd'); rect(11, 16, 10, 15, 'S');
    rect(15, 19, 2, 12, 'k');
    rect(14, 8, 4, 3, 'W'); rect(6, 27, 4, 3, 'S'); rect(22, 27, 4, 3, 'S');
  } else if (kind === 'tree') {
    rect(14, 19, 5, 12, 'b'); rect(15, 20, 2, 10, 'B');
    for (let y = 5; y <= 19; y++) {         // irregular rounded canopy
      const t = (y - 12) / 7.5;
      const half = Math.max(2, Math.round(10 * Math.sqrt(Math.max(0, 1 - t * t))));
      rect(16 - half, y, half * 2 + 1, 1, y < 10 ? 'G' : y > 16 ? 'm' : 'g');
    }
    rect(7, 10, 5, 4, 'G'); rect(21, 11, 4, 4, 'g');
    rect(9, 17, 4, 3, 'G'); rect(19, 17, 5, 3, 'g');
    rect(12, 6, 5, 3, 'G'); rect(11, 12, 4, 2, 'm');
    rect(16, 9, 3, 2, 'G'); rect(23, 14, 3, 2, 'G');
  } else if (kind === 'bridge') {
    rect(0, 4, 32, 24, 'b');
    rect(0, 4, 32, 2, 'B'); rect(0, 26, 32, 2, 'B');
    for (let x = 3; x < 32; x += 6) rect(x, 6, 2, 20, 'd'); // plank joins
    rect(1, 8, 30, 1, 'B'); rect(1, 22, 30, 1, 'B');
    rect(1, 2, 3, 28, 'b'); rect(28, 2, 3, 28, 'b'); // rail posts
    rect(2, 3, 2, 26, 'Y'); rect(28, 3, 2, 26, 'Y');
  } else if (kind === 'doorstep') {
    rect(10, 6, 12, 13, 'd'); rect(11, 7, 10, 11, 'k');
    rect(13, 4, 6, 3, 'Y'); rect(7, 19, 18, 4, 'l');
    rect(4, 23, 24, 4, 'L'); rect(1, 27, 30, 3, 'l');
  }
  return finishGrid(g);
}

const PROP_TOWN = {
  inn: propTownSprite('inn'), store: propTownSprite('store'), hut: propTownSprite('hut'),
  townGate: propTownSprite('townGate'), tree: propTownSprite('tree'),
  bridge: propTownSprite('bridge'), doorstep: propTownSprite('doorstep')
};

// Dungeon props are shaped from scratch too; no old grid is recoloured here.
function propDungeonSprite(kind) {
  const g = propGrid();
  const rect = (x, y, w, h, color) => propRect(g, x, y, w, h, color);
  if (kind === 'stairsUp' || kind === 'stairsDown') {
    rect(2, 4, 28, 24, 's'); rect(3, 5, 26, 22, 'S');
    rect(5, 8, 22, 4, 'w'); rect(7, 13, 18, 4, 'w'); rect(9, 18, 14, 4, 'w');
    rect(3, 22, 26, 2, 'k'); rect(3, 4, 26, 1, 'w');
    if (kind === 'stairsUp') {
      rect(13, 11, 6, 2, 'Y'); rect(15, 8, 2, 8, 'Y');
      rect(14, 9, 4, 2, 'Y');
    } else {
      rect(13, 20, 6, 2, 'Y'); rect(15, 16, 2, 8, 'Y');
      rect(14, 22, 4, 2, 'Y');
    }
  } else if (kind === 'chest') {
    rect(4, 12, 24, 16, 'b'); rect(4, 8, 24, 6, 'B');
    rect(5, 9, 22, 2, 'd'); rect(5, 14, 22, 12, 'd');
    rect(8, 8, 3, 20, 'y'); rect(21, 8, 3, 20, 'y');
    rect(13, 10, 6, 6, 'Y'); rect(15, 12, 2, 4, 'k');
    rect(6, 27, 20, 2, 'k');
  } else if (kind === 'potion') {
    rect(13, 3, 6, 4, 'b'); rect(12, 7, 8, 3, 'w');
    rect(9, 10, 14, 19, 'w'); rect(11, 12, 10, 15, 't');
    rect(12, 13, 8, 12, 'T'); rect(12, 24, 8, 4, 'y');
    rect(10, 10, 2, 17, 'W'); rect(14, 15, 3, 2, 'c');
    rect(8, 28, 16, 2, 'k');
  } else if (kind === 'key') {
    rect(7, 6, 12, 12, 'y'); rect(9, 8, 8, 8, 'k');
    rect(11, 10, 4, 4, 'Y');
    rect(15, 15, 5, 3, 'y'); rect(18, 18, 5, 3, 'y');
    rect(21, 21, 4, 3, 'y'); rect(22, 24, 3, 3, 'Y');
    rect(6, 5, 14, 1, 'Y');
  } else if (kind === 'torch') {
    rect(14, 5, 4, 15, 'b'); rect(13, 17, 6, 5, 's');
    rect(11, 21, 10, 3, 'S');
    rect(14, 2, 4, 5, 'O'); rect(13, 4, 6, 4, 'y');
    rect(15, 1, 2, 5, 'Y'); rect(12, 7, 2, 3, 'r');
    rect(18, 7, 2, 3, 'r');
  } else if (kind === 'spikes') {
    rect(4, 26, 24, 3, 'S');
    for (let x = 6; x <= 24; x += 4) {
      for (let y = 9; y <= 24; y++) {
        const half = Math.max(0, Math.floor((y - 9) / 3));
        rect(x - half, y, half * 2 + 1, 1, y < 18 ? 'w' : 's');
      }
    }
    rect(4, 28, 24, 2, 'k');
  }
  return finishGrid(g);
}

const PROP_DUNGEON = {
  stairsUp: propDungeonSprite('stairsUp'), stairsDown: propDungeonSprite('stairsDown'),
  chest: propDungeonSprite('chest'), potion: propDungeonSprite('potion'),
  key: propDungeonSprite('key'), torch: propDungeonSprite('torch'),
  spikes: propDungeonSprite('spikes')
};

// Terrain palettes: restrained facades, distinct biomes, amber light.
const PROP_TILES = {
  crypt: { top: '#43576d', edge: '#6b8198', line: '#1a2635', brick: '#526b85', face: '#121c2a', faceEdge: '#586f87', faceLight: '#8aa1b5', faceLine: '#0b131f', floor: ['#4a5968', '#526172', '#455464', '#4c5b6a'], light: '#7b8f9e', dark: '#2c3948', crack: '#334252', speck: '#9aabb4', accent: '#5d7a58' },
  cavern: { top: '#2c4847', edge: '#48716d', line: '#142627', brick: '#3a5d58', face: '#142627', faceEdge: '#3c625c', faceLight: '#6c9690', faceLine: '#0e1c1d', floor: ['#2c4542', '#33504a', '#273e3c', '#2e4945'], light: '#55807a', dark: '#1c3130', crack: '#243c39', speck: '#88ad9f', accent: '#4a7560' },
  kitchen: { top: '#5b4530', edge: '#876544', line: '#2e2118', brick: '#6d5034', face: '#2e2118', faceEdge: '#7a5736', faceLight: '#a17c50', faceLine: '#211710', floor: ['#6a5138', '#72583c', '#614a34', '#68503a'], light: '#94714c', dark: '#493624', crack: '#533c2a', speck: '#b99a6c', accent: '#85663b' },
  tavern: { top: '#4a3329', edge: '#725043', line: '#251815', brick: '#5a3b31', face: '#251815', faceEdge: '#66473a', faceLight: '#94705a', faceLine: '#1a100e', floor: ['#5b4133', '#634838', '#543b30', '#5a4033'], light: '#896650', dark: '#402c23', crack: '#4b3429', speck: '#a98765', accent: '#6f4a36' },
  throne: { top: '#3b3154', edge: '#5c4c7b', line: '#211a35', brick: '#4a3d66', face: '#211a35', faceEdge: '#51436e', faceLight: '#8978ab', faceLine: '#171129', floor: ['#42395d', '#493f64', '#3a3253', '#40365a'], light: '#6d5c8d', dark: '#2e2746', crack: '#362d50', speck: '#b7a06f', accent: '#867142' },
  town: { top: '#6e8b4e', edge: '#91a96b', line: '#3f5c38', brick: '#7d9958', face: '#3f5c38', faceEdge: '#6d8a4c', faceLight: '#a7bd7d', faceLine: '#30482c', floor: ['#759055', '#7d985c', '#6e8a50', '#78925a'], light: '#a4b77e', dark: '#566e42', crack: '#647d4a', speck: '#c0c48f', accent: '#8a9d5b', sand: '#c2a878', sandLight: '#e0c99b', sandDark: '#9d845c', sandSpeck: '#f2e3b9', bank: '#b49a6b', bankLight: '#d8bd8a', bankDark: '#6f5c40', bankSpeck: '#efe0b5', water: '#164452', waterLight: '#3d8fa0', waterDark: '#0e2d38', foam: '#9ad7d4' }
};

// kind: '#' wall, 'w' water, 'a' bank, 's' road, '.' floor/grass.
// Ground tiles have no embossed border: variation is coordinate-derived and continuous across tile seams.
function paintPropTile(c, kind, front, variant, biome, edges) {
  const p = PROP_TILES[biome] || PROP_TILES.crypt;
  const n = variant;
  const touches = dir => !!(edges && edges[dir]);

  if (kind === '#') {
    c.fillStyle = p.top; c.fillRect(0, 0, 32, 32);
    c.fillStyle = p.edge; c.fillRect(0, 0, 32, 3); c.fillRect(0, 0, 3, 32);
    c.fillStyle = p.line; c.fillRect(0, 9, 32, 2); c.fillRect(n % 2 ? 9 : 20, 0, 2, 9);
    c.fillStyle = p.brick; c.fillRect(4, 4, 7, 1); c.fillRect(14, 6, 8, 1); c.fillRect(23, 3, 5, 1);
    if (front) {
      c.fillStyle = p.face; c.fillRect(0, 11, 32, 21);
      c.fillStyle = p.faceEdge; c.fillRect(0, 9, 32, 2);
      c.fillStyle = p.faceLight; c.fillRect(1, 8, 30, 1);
      c.fillStyle = p.faceLine; c.fillRect(0, 12, 32, 1); c.fillRect(0, 30, 32, 2);
      c.fillStyle = p.dark; c.fillRect(29, 11, 3, 21);
      c.fillStyle = p.faceEdge; c.fillRect(n % 2 ? 14 : 17, 13, 2, 17); // pilaster
      c.fillStyle = p.faceLine; c.fillRect(n % 2 ? 10 : 21, 13, 2, 8); c.fillRect(n % 2 ? 23 : 8, 23, 2, 7);
      c.fillStyle = p.brick; c.fillRect(3, 16, 6, 1); c.fillRect(5, 27, 7, 1); c.fillRect(23, 16, 5, 1);
    } else {
      c.fillStyle = p.line; c.fillRect(0, 0, 4, 3); c.fillRect(28, 0, 4, 3);
      c.fillRect(1, 29, 30, 3); c.fillRect(29, 3, 3, 26);
    }
    return;
  }

  if (kind === 'w') {
    c.fillStyle = p.water; c.fillRect(0, 0, 32, 32);
    c.fillStyle = p.waterDark; c.fillRect(0, 28, 32, 4); c.fillRect(0, 0, 3, 32);
    c.fillStyle = p.waterLight;
    c.fillRect(4 + (n % 3), 6, 9, 2); c.fillRect(18 - (n % 4), 14, 10, 2); c.fillRect(7 + (n % 5), 23, 8, 2);
    c.fillStyle = p.foam;
    if (touches('up')) c.fillRect(0, 0, 32, 2);
    if (touches('down')) c.fillRect(0, 30, 32, 2);
    if (touches('left')) c.fillRect(0, 0, 2, 32);
    if (touches('right')) c.fillRect(30, 0, 2, 32);
    c.fillRect(12 + (n % 7), 10, 3, 1); c.fillRect(23, 25, 2, 1);
    return;
  }

  if (kind === 'a') {
    c.fillStyle = p.bank; c.fillRect(0, 0, 32, 32);
    c.fillStyle = p.bankLight; c.fillRect(2 + (n % 4), 3, 8, 2); c.fillRect(18 - (n % 3), 20, 9, 2);
    c.fillStyle = p.bankDark; c.fillRect(0, 29, 32, 3);
    c.fillStyle = p.waterDark;
    if (touches('down')) c.fillRect(0, 29, 32, 3);
    if (touches('up')) c.fillRect(0, 0, 32, 3);
    if (touches('left')) c.fillRect(0, 0, 3, 32);
    if (touches('right')) c.fillRect(29, 0, 3, 32);
    c.fillStyle = p.bankSpeck; c.fillRect(11 + (n % 5), 12, 2, 1); c.fillRect(24, 17, 1, 1);
    return;
  }

  if (kind === 's') {
    c.fillStyle = p.sand; c.fillRect(0, 0, 32, 32);
    c.fillStyle = p.sandLight; c.fillRect(3 + (n % 5), 8, 10, 1); c.fillRect(17 - (n % 4), 22, 8, 1);
    c.fillStyle = p.sandDark; c.fillRect(6 + (n % 3), 17, 7, 1);
    c.fillStyle = p.sandSpeck; c.fillRect(12, 5 + (n % 6), 2, 1); c.fillRect(25, 13, 1, 1);
    return;
  }

  c.fillStyle = p.floor[n % 4]; c.fillRect(0, 0, 32, 32);
  c.fillStyle = p.light; c.fillRect(3 + (n % 6), 4, 6, 1); c.fillRect(20 - (n % 5), 25, 5, 1);
  c.fillStyle = p.dark; c.fillRect(5 + (n % 4), 20, 7, 1);
  if (n % 3 === 0) { c.fillStyle = p.crack; c.fillRect(8, 12, 7, 1); c.fillRect(14, 13, 1, 5); }
  if (n % 4 === 1) { c.fillStyle = p.speck; c.fillRect(18, 7, 2, 1); c.fillRect(24, 21, 1, 1); }
  if (biome === 'town') { c.fillStyle = n % 2 ? p.accent : p.speck; c.fillRect(7 + (n % 5), 16, 2, 3); c.fillRect(22 - (n % 4), 10, 2, 3); }
}
