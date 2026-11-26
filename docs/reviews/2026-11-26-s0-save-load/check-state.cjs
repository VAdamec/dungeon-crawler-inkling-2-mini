// Development-only REVIEW/S0 diagnostics. No runtime dependency, save API or loader.
const outerFs = require('node:fs');
const outerPath = require('node:path');
const outerVm = require('node:vm');
const projectRoot = outerPath.resolve(__dirname, '../../..');
const harnessSource = outerFs.readFileSync(outerPath.join(projectRoot, 'tests/game.test.cjs'), 'utf8');
const harnessPrefix = harnessSource.split("\ntest('floors preserve layout", 1)[0];
const diagnosticBody = outerFs.readFileSync(__filename, 'utf8').split('// BEGIN S0 DIAGNOSTIC BODY\n')[1];
outerVm.runInThisContext('(function(require,__dirname){\n' + harnessPrefix + '\n' + diagnosticBody + '\nrunS0Diagnostics();\n})', {filename:__filename})(require, outerPath.join(projectRoot, 'tests'));
// BEGIN S0 DIAGNOSTIC BODY
function runS0Diagnostics() {
const result = { purpose: 'REVIEW/S0 only: current-state probes and size estimates; no save/load implementation', seeds: [] };
const g = game(713, true, 'town');
g.run('render=()=>{};playSound=()=>{};tone=()=>{}');
result.initialKeys = g.json('Object.keys(state).sort()');
result.initialFieldTypes = g.json('Object.fromEntries(Object.entries(state).map(([key,value])=>[key,value instanceof Set ? "Set" : Array.isArray(value) ? "Array" : value===null ? "null" : typeof value]))');
result.townAliases = g.json('({map:state.map===state.town.map,visited:state.visited===state.town.visited,props:state.props===state.town.props,merchant:state.merchant===state.town.store,landmarkStore:state.merchant===state.town.landmarks.store,inn:state.inn===state.town.landmarks.inn,gate:state.townGate===state.town.landmarks.gate,boardInProps:state.props.includes(state.town.landmarks.companionBoard)})');
g.run('enterDungeonFromTown()');
result.floorAliasesBefore = g.json('Object.fromEntries(FLOOR_FIELDS.map(k=>[k,state[k]===state.floors[state.depth][k]]))');
g.run('state.potions=state.potions.slice(1); state.hazardTime=3.75');
result.staleActiveCache = g.json('({potionsSame:state.potions===state.floors[1].potions,currentPotions:state.potions.length,cachedPotions:state.floors[1].potions.length,currentHazardTime:state.hazardTime,cachedHazardTime:state.floors[1].hazardTime,descentRewarded:state.floors[1].descentRewarded,inFloorFields:FLOOR_FIELDS.includes("descentRewarded")})');
g.run('enterFloor(50,false,true); state.companion=null; state.activeTime=100');
result.guards = [];
for (const cycles of [1,10,100]) {
 g.run(`while((state._reviewGuardCycles||0)<${cycles}){for(const m of state.monsters)if(m.isGuard)m.hp=0; state.activeTime+=6; summonThroneGuards(); state._reviewGuardCycles=(state._reviewGuardCycles||0)+1;} saveFloor()`);
 result.guards.push({cycles,...g.json('({activeRows:state.monsters.length,guardRows:state.monsters.filter(m=>m.isGuard).length,livingGuards:state.monsters.filter(m=>m.isGuard&&m.hp>0).length,templateGuards:state.monsterSpawns.filter(m=>m.isGuard).length,cachedTemplateGuards:state.floors[50].monsterSpawns.filter(m=>m.isGuard).length,maxId:Math.max(...state.monsters.map(m=>m.id))})')});
}
result.guardRecordKeys = g.json('Object.keys(state.monsters.find(m=>m.isGuard)).sort()');
g.run('delete state._reviewGuardCycles; state.bossDefeated=false; state.player.lvl=1;state.player.xp=0;state.player.xpNext=40;state.player.maxHp=60;state.player.hp=60;state.player.maxMp=20;state.player.mp=20;state.player.str=12;state.player.dex=10;state.player.def=3');
result.levelThresholds=[];
for(let level=1;level<=100;level++) {
 result.levelThresholds.push(g.json('({level:state.player.lvl,xpNext:state.player.xpNext,safe:Number.isSafeInteger(state.player.xpNext)})'));
 if(level<100)g.run('damageMonster({id:1000000,name:"review threshold",sprite:"slime",hp:1,maxHp:1,xp:state.player.xpNext,gold:0},1)');
}
result.highLevelJsonRoundTrip = result.levelThresholds.every(row => JSON.parse(JSON.stringify(row)).xpNext === row.xpNext);
// Explicit semantic field projection for sizing only. Keys are copied from the review design,
// not a production DTO API; no parser, validator, loader or runtime scaffold is introduced.
const runKeys=['depth','area','kills','turn','player','spellReadyAt','inventory','townScrolls','gold','equipment','warnedLow','warnedCritical','combatElapsed','healElapsed','activeTime','manaRegenAt','retreatReadyAt','selectedCompanion','unlockedCompanions','companionChoice','companionEntryDone','companion','companionSpeechReadyAt','companionQuoteIndex','companionAttackAt','entranceCat','townExit','townPortalOpen','monsterSpeechReadyAt','monsterQuoteIndex','messages'];
const floorKeys=g.json('FLOOR_FIELDS');
const union={};
const addShape=(name,row)=>{if(!row)return;const fields=union[name] ||= {};for(const [key,value]of Object.entries(row)){const types=fields[key] ||= [];const type=value===null?'null':Array.isArray(value)?'Array':typeof value;if(!types.includes(type))types.push(type);}};
for(const seed of [713,42]) {
 const h=game(seed,true,'town');h.run('render=()=>{};playSound=()=>{};tone=()=>{}');
 const start=performance.now(); h.run("state.visited=new Set(Array.from({length:W*H},(_,i)=>String(i%W)+','+Math.floor(i/W))); saveTown()");
 // This is conservative content-retention stress, not a playable no-cheat campaign:
 // bypass floor gates, retain every generated loot object/template, reveal all cells.
 for(let depth=1;depth<=100;depth++)h.run(`enterFloor(${depth},false); state.visited=new Set(Array.from({length:W*H},(_,i)=>String(i%W)+','+Math.floor(i/W))); saveFloor()`);
 const projected=h.json(`(()=>{const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]])); const floors=Object.fromEntries(Object.entries(state.floors).map(([d,f])=>[d,{...pick(f,${JSON.stringify(floorKeys)}),visited:[...f.visited],descentRewarded:!!f.descentRewarded}])); const t=state.town;return {format:'dungeon-crawler-save',formatVersion:1,gameVersion:GAME_VERSION,createdAt:'2026-11-26T00:00:00.000Z',run:{...pick(state,${JSON.stringify(runKeys)}),floors,town:{map:t.map,visited:[...t.visited],props:t.props,npcs:t.npcs,animals:t.animals,spawn:t.spawn,store:t.store,landmarks:t.landmarks,tick:t.tick,quoteIndex:t.quoteIndex,nextTalkAt:t.nextTalkAt},encounter:{monsters:state.monsters,bossId:state.boss&&state.boss.id,bossIntroSeen:state.bossIntroSeen,bossSummonAt:state.bossSummonAt}}};})()`);
 const counts={};
 for(const [depth,f]of Object.entries(projected.run.floors)){
  for(const key of floorKeys)if(Array.isArray(f[key])&&key!=='map'&&key!=='visited')counts[key]=Math.max(counts[key]||0,f[key].length);
  for(const key of ['rooms','potions','treasures','props','hazards','obstacles','monsterSpawns'])for(const row of f[key]||[])addShape(key,row);
  for(const key of ['stairs','upstairs','merchant','prisoner','princess','floorKey'])addShape(key,f[key]);
 }
 for(const key of ['npcs','animals'])for(const row of projected.run.town[key])addShape('town.'+key,row);
 addShape('player',projected.run.player);addShape('town',projected.run.town);addShape('companion',projected.run.companion);
 const stringifyAt=performance.now(),text=JSON.stringify(projected),stringifyMs=performance.now()-stringifyAt;
 const parseAt=performance.now();JSON.parse(text);const parseMs=performance.now()-parseAt;
 const originalBytes=Buffer.byteLength(text);
 // Extra independent envelope: retain all world content and additionally store 10,000 potions.
 projected.run.inventory=Array.from({length:10000},()=>({name:'Potion',kind:'heal',heal:0.5999999999999999}));
 const padded=JSON.stringify(projected);
 result.seeds.push({seed,floorCount:Object.keys(projected.run.floors).length,visitedCoordinates:100*96*64,bytes:originalBytes,MiB:originalBytes/2**20,with10000StoredPotionsBytes:Buffer.byteLength(padded),countMaxima:counts,townCounts:{npcs:projected.run.town.npcs.length,animals:projected.run.town.animals.length,props:projected.run.town.props.length,stock:projected.run.town.store.stock.length},stringifyMs,parseMs,totalFixtureMs:performance.now()-start});
}
result.observedRecordFields=union;
const src=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../js/sprites.js'),'utf8');
result.allReferencedStateKeys=[...new Set([...src.matchAll(/\bstate\.([A-Za-z0-9_]+)/g)].map(m=>m[1]))].sort();
result.sourceBounds = {rooms:32, ordinaryTemplates:40, totalTemplates:41, props:76, potions:37, treasures:29, obstacles:64, hazards:124, merchantStock:6, naturalPotionInventoryUpperBound:Array.from({length:100},(_,i)=>4+Math.floor((i+1)/3)+4+Math.floor((i+1)/4)).reduce((a,b)=>a+b,0)+40*6+6};
assert.equal(Object.values(result.townAliases).every(Boolean),true);
assert.equal(result.staleActiveCache.potionsSame,false);
assert.equal(result.staleActiveCache.inFloorFields,false);
assert.equal(result.guards[2].guardRows,200);
assert.equal(result.guards[2].templateGuards,0);
assert.equal(result.levelThresholds.find(row=>!row.safe).level,83);
assert.equal(result.highLevelJsonRoundTrip,true);
for(const row of result.seeds){assert.equal(row.floorCount,100);assert.equal(row.visitedCoordinates,614400);assert.ok(row.with10000StoredPotionsBytes<32*2**20);}
result.assertions='pass';
console.log(JSON.stringify(result,null,2));
}
