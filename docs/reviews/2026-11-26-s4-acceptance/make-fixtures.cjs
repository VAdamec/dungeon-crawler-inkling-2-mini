// Real generation plus staged retained content/exploration. Not a completed campaign.
const F=require('node:fs'),P=require('node:path'),V=require('node:vm');
const root=P.resolve(__dirname,'../../..');
const prefix=F.readFileSync(P.join(root,'tests/game.test.cjs'),'utf8').split("\ntest('floors preserve layout",1)[0];
const body=F.readFileSync(__filename,'utf8').split('// BEGIN FIXTURES\n')[1];
V.runInThisContext('(function(require,__dirname){'+prefix+'\n'+body+'\nrunFixtures();})',{filename:__filename})(require,P.join(root,'tests'));
// BEGIN FIXTURES
function runFixtures(){
const g=game(713,true,'town');g.run('render=()=>{};playSound=()=>{};tone=()=>{}');
g.run("state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveTown()");
for(let d=1;d<=100;d++)g.run(`enterFloor(${d},false);state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveFloor()`);
g.run(`state.inventory=Array.from({length:10000},()=>({name:'Potion',kind:'heal',heal:.5999999999999999}));state.gold=12345;state.player.hp=37;
 state.player.mp=7;state.activeTime=600.25;state.retreatReadyAt=650.5;state.bossIntroSeen=true;state.monsters[0].hp=4;state.monsters[0].nextAttackAt=602.75;`);
const text=g.run("serializeSaveData(state,{createdAt:'2026-11-26T12:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false})");
fs.writeFileSync('/tmp/dungeon-s4-large.json',text);
const rows=[{name:'large',path:'/tmp/dungeon-s4-large.json',bytes:Buffer.byteLength(text)}];
// Exact byte boundary: valid full-content DTO plus JSON whitespace, not additional game progress.
fs.writeFileSync('/tmp/dungeon-s4-max-bytes.json',text+' '.repeat(32*2**20-Buffer.byteLength(text)));
rows.push({name:'max-bytes',path:'/tmp/dungeon-s4-max-bytes.json',bytes:32*2**20});
const context="{createdAt:'2026-11-26T12:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false}";
function small(){const h=game(713,true,'town');h.run(`render=()=>{};playSound=()=>{};tone=()=>{};equipItem('ring',{...ITEM_TABLE[5]});
 equipItem('weapon',{...ITEM_TABLE[1]});equipItem('armor',{...ITEM_TABLE[7]});state.player.hp=37;state.player.mp=7;state.gold=293;
 state.inventory=[{name:'Potion',kind:'heal',heal:.499}];state.townScrolls=3;state.player.spells.frostbolt=true;
 state.activeTime=50.25;state.retreatReadyAt=100.5;state.companionAttackAt=52.75;`);return h;}
function emit(h,name){const value=h.run('serializeSaveData(state,'+context+')');const file='/tmp/dungeon-s4-'+name+'.json';fs.writeFileSync(file,value);rows.push({name,path:file,bytes:Buffer.byteLength(value)});}
const town=small();town.run(`unlockCompanion('hydra');joinSelectedCompanion(true);state.entranceCat.retired=true;activateCompanion('pip');
 state.town.npcs[0].pathIndex=2;state.town.store.stock=state.town.store.stock.slice(2);state.messages=['Portable 🐉 save','Plain <text>'];`);emit(town,'town');
const dungeon=small();dungeon.run(`enterFloor(2,false,true);state.monsters[0].hp=4;state.monsters[0].nextAttackAt=52.75;state.monsters[1].hp=-7;
 state.potions=state.potions.slice(1);state.treasures=state.treasures.slice(1);state.merchant.stock=state.merchant.stock.slice(2);state.prisoner.rescued=true;
 state.floorKey.dropped=true;state.floorKey.collected=true;state.floorKey.drop=null;state.floors[2].descentRewarded=true;
 state.hazardTime=4;const r=state.hazards.find(h=>h.type==='rocks');r.triggered=true;r.stage='warning';r.impactAt=4.75;`);emit(dungeon,'dungeon');
const scroll=small();scroll.run('enterFloor(2,false,true);useTownScroll()');emit(scroll,'scroll');
const retreat=small();retreat.run(`enterFloor(2,false,true);state.retreatReadyAt=0;state.pause={kind:'retreat',previous:null};confirmRetreat();state.townExit.x=0;state.townExit.y=0;`);emit(retreat,'retreat');
const debug=small();debug.run(`enterFloor(2,false,true);teleportTown();loadLevel('3');state.townExit.x=0;state.townExit.y=0;`);emit(debug,'cross-floor-portal');
const guards=small();guards.run(`enterFloor(50,false,true);for(let i=0;i<100;i++){for(const m of state.monsters)if(m.isGuard)m.hp=-13;state.activeTime+=6;summonThroneGuards();}state.bossIntroSeen=true;`);emit(guards,'guards');
const final=small();final.run(`enterFloor(100,false,true);damageMonster(state.boss,state.boss.hp+7);clearBossDefeat();`);emit(final,'final');
for(const lvl of [83,99,100]){const h=small();h.run(`let threshold=40;for(let l=1;l<${lvl};l++)threshold=Math.round(threshold*1.5);state.player.lvl=${lvl};state.player.xpNext=${lvl}===100?1:threshold;state.player.xp=${lvl}===100?0:Math.floor(threshold/2);`);emit(h,'level-'+lvl);}
fs.writeFileSync(path.join(__dirname,'../docs/reviews/2026-11-26-s4-acceptance/fixtures.json'),JSON.stringify({rows,note:'Seed713 real generation, staged retained contents/exploration/progression. max-bytes is valid large JSON plus whitespace to the exact32MiB input boundary; not an absolute gameplay maximum.'},null,2)+'\n');
console.log(JSON.stringify(rows));
}
