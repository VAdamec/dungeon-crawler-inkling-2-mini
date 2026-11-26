// Staged mechanics audit: teleported positions and direct lethal damage, not natural play or balance acceptance.
const F=require('node:fs'),P=require('node:path'),V=require('node:vm');
const root=P.resolve(__dirname,'../../..');
const prefix=F.readFileSync(P.join(root,'tests/game.test.cjs'),'utf8').split("\ntest('floors preserve layout",1)[0];
const body=F.readFileSync(__filename,'utf8').split('// BEGIN AUDIT\n')[1];
V.runInThisContext('(function(require,__dirname){'+prefix+'\n'+body+'\nrunAcceptance();})',{filename:__filename})(require,P.join(root,'tests'));
// BEGIN AUDIT
function runAcceptance(){
 const g=game(20261126,true,'dungeon');
 g.run('render=()=>{};draw=()=>{};playSound=()=>{};tone=()=>{}');
 const rows=[],checkpoints=[],began=performance.now();
 for(let d=1;d<=100;d++){
  assert.equal(g.run('state.depth'),d);
  assert.equal(g.run('state.godMode'),false);
  const row={depth:d};
  if(d<100){
   g.run('window.carrier=state.monsters.find(m=>m.id===state.floorKey.carrierId);damageMonster(window.carrier,window.carrier.hp);state.player.x=state.floorKey.drop.x;state.player.y=state.floorKey.drop.y;pickup()');
   assert.equal(g.run('state.floorKey.dropped&&state.floorKey.collected&&state.floorKey.drop===null'),true);
   row.realCarrierDeathAndKeyCollection=true;
  }
  if(g.run('!!state.boss&&!state.bossDefeated')){
   row.boss=g.run('state.boss.name');
   if(d===100){g.run('state.player.x=state.princess.x;state.player.y=state.princess.y;rescuePrincess()');assert.equal(g.run('state.princess.rescued||state.won'),false);}
   g.run('damageMonster(state.boss,state.boss.hp);clearBossDefeat()');
   assert.equal(g.run('state.bossDefeated&&!state.gameOver'),true);
   const rewards=g.json('[state.gold,state.kills,state.player.lvl,state.player.xp]');
   g.run('damageMonster(state.boss,Number.MAX_SAFE_INTEGER)');
   assert.deepEqual(g.json('[state.gold,state.kills,state.player.lvl,state.player.xp]'),rewards);
   row.onceOnlyBossRewards=true;
  }
  if([1,5,50,100].includes(d)){
   const checkpoint=g.run(`(()=>{const context={createdAt:'2026-11-26T18:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false};const text=serializeSaveData(state,context),dto=JSON.parse(text);const detached=hydrateSaveData(dto);return {bytes:text.length,exact:JSON.stringify(JSON.parse(serializeSaveData(detached,context)).run)===JSON.stringify(dto.run),floors:Object.keys(dto.run.floors).length};})()`);
   assert.equal(checkpoint.exact,true);checkpoints.push({depth:d,...checkpoint});
  }
  if(d<100){g.run('state.player.x=state.stairs.x;state.player.y=state.stairs.y;descendStairs()');assert.equal(g.run('state.depth'),d+1);}
  rows.push(row);
 }
 g.run('state.player.x=state.stairs.x;state.player.y=state.stairs.y;descendStairs()');assert.equal(g.run('state.depth'),100);
 g.run('state.player.x=state.princess.x;state.player.y=state.princess.y;rescuePrincess()');assert.equal(g.run('state.won&&state.gameOver&&!!state.ending'),true);
 const rewards=g.json('[state.gold,state.kills]');const scenes=[];
 for(const delta of [0,2.2,1.8,2,3,5]){g.run(`advanceEnding(${delta},true)`);scenes.push(g.json('({elapsed:state.ending.elapsed,phase:state.ending.phase,dragonHp:state.ending.dragon.hp})'));}
 assert.equal(g.run('state.ending.completed&&state.ending.dragon.hp===state.ending.dragon.maxHp'),true);
 g.run('rescuePrincess();skipEnding()');assert.deepEqual(g.json('[state.gold,state.kills]'),rewards);
 g.run('restartFromEnding()');assert.equal(g.run('state.area===\'town\'&&state.depth===1&&!state.ending&&!state.won'),true);
 fs.writeFileSync(path.join(__dirname,'../docs/reviews/2026-11-26-acceptance-run/campaign.json'),JSON.stringify({seed:20261126,rows,checkpoints,endingScenes:scenes,noDepth101:true,onceOnlyRescue:true,restart:true,elapsedMs:performance.now()-began,nativeGR09:'unverified',scope:'Staged VM mechanics: teleported positions/direct lethal damage; render/audio disabled. Not a human campaign, balance, visible animation, audible quality or native background test.'},null,2)+'\n');
 console.log('CAMPAIGN_MECHANICS_OK');
}
