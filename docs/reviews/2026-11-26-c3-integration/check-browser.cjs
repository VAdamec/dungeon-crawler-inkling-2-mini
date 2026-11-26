// External development runner; actual file:// UI plus explicitly staged integration fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require(process.env.OX72_PLAYWRIGHT||'playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const width of [1440,390]){
  const mobile=width<700,p=await b.newPage({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile}),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.c3Intervals=[];window.setInterval=(...a)=>{const id=original(...a);c3Intervals.push(id);return id;};});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);await p.locator('#startGame').click();
  await p.evaluate(()=>{c3Intervals.forEach(clearInterval);enterDungeonFromTown();});
  const matrix=await p.evaluate(()=>{
   const rows=[],equal=(a,b)=>{if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;};
   const shot=()=>{draw();return new Uint32Array(ctx.getImageData(0,0,canvas.width,canvas.height).data.buffer);};
   const mini=()=>{renderMinimap();return new Uint32Array(document.getElementById('minimap').getContext('2d').getImageData(0,0,288,192).data.buffer);};
   for(const id of Object.keys(COMPANIONS)){
    unlockCompanion(id);activateCompanion(id);state.map=Array.from({length:H},()=>Array(W).fill(0));
    state.player.x=5;state.player.y=5;state.companion.x=8;state.companion.y=5;
    state.monsters=[];state.hazards=[];state.props=[];state.potions=[];state.treasures=[];state.obstacles=[];
    state.stairs=null;state.upstairs=null;state.floorKey=null;state.merchant=null;state.prisoner=null;state.princess=null;
    state.companionSpeech=null;state.monsterSpeech=null;state.bubble=null;state.visited=new Set();clearMovementAnimation();updateCamera();revealAroundPlayer();
    const base=shot(),chart=mini();
    state.hazards=[{type:'spikes',x:10,y:5,revealed:false,triggered:false}];const hiddenSpikes=equal(base,shot());
    state.hazards=[];state.monsters=[{id:77,x:15,y:5,sprite:'goblin',hp:30,maxHp:30}];
    state.monsterSpeech={monsterId:77,text:'SECRET',expiresAt:state.activeTime+5};state.potions=[{x:15,y:5}];state.treasures=[{x:15,y:5}];state.floorKey={drop:{x:15,y:5}};
    const unknownEntities=equal(base,shot()),minimapSecret=equal(chart,mini());
    rows.push({id,hiddenSpikes,unknownEntities,minimapSecret,companionLight:fogLevel(10,5)===0&&state.visited.has('10,5'),darkBoundary:fogLevel(13,5)===3});
   }return rows;
  });
  for(const row of matrix)for(const key of ['hiddenSpikes','unknownEntities','minimapSecret','companionLight','darkBoundary'])assert.equal(row[key],true,row.id+' '+key);
  const midTickStop=await p.evaluate(()=>{
   newGame();enterDungeonFromTown();state.map=Array.from({length:H},()=>Array(W).fill(0));
   state.player.x=5;state.player.y=5;state.player.hp=37;state.player.xpNext=1000000;
   state.companion.x=6;state.companion.y=5;state.companionAttackAt=0;state.activeTime=20;
   state.hazards=[];state.boss=null;state.bossIntroSeen=true;clearBossIntro();clearBossDefeat();
   state.monsters=[{id:999,name:'Cook',sprite:'orc',x:7,y:5,hp:1,maxHp:1,isBoss:true,def:0,xp:0,gold:0},
    {id:12,name:'Guard',sprite:'skeleton',x:8,y:5,hp:100,maxHp:100,ranged:true,range:9,atk:999,nextAttackAt:0}];
   updateCamera();revealAroundPlayer();const random=Math.random;Math.random=()=>.5;
   try{enemyTick();}finally{Math.random=random;}
   return state.player.hp===37&&!state.gameOver&&bossDefeatActive()&&state.monsters[1].nextAttackAt===0;
  });assert.equal(midTickStop,true);
  // Staged positions/unlocks, real post entry and native choice events.
  const atPost=async()=>{await p.evaluate(()=>{const c=state.town.landmarks.companionBoard;state.player.x=c.x;state.player.y=c.y;updateCamera();clearMovementAnimation();render();});
   if(mobile)await p.locator('#companionPostAction').tap();else{await p.locator('#game').focus();await p.keyboard.press('Space');}};
  const choose=async id=>{if(mobile)await p.locator(`[data-companion-id="${id}"]`).tap();else{await p.locator(`[data-companion-id="${id}"]`).focus();await p.keyboard.press('Enter');}};
  await p.evaluate(()=>{newGame();enterDungeonFromTown();enterFloor(5,false,true);damageMonster(state.boss,state.boss.hp);skipBossDefeat();enterTown();});
  assert.equal(await p.evaluate(()=>state.companion.id),'mimic');await atPost();await choose('marmalade');
  await p.evaluate(()=>{enterFloor(7,false,true);damageMonster(state.boss,state.boss.hp);skipBossDefeat();enterTown();});
  assert.equal(await p.evaluate(()=>state.messages.filter(m=>/household budget/i.test(m)).length),1);
  await atPost();await choose('pip');
  await p.evaluate(()=>{enterFloor(2,false,true);state.townScrolls=2;state.player.hp=37;state.player.mp=7;state.activeTime=20;state.retreatReadyAt=0;
   window.c3Actor=state.companion;window.c3Exit=[state.depth,state.player.x,state.player.y];window.c3Deadline=state.companionAttackAt;render();});
  await p.keyboard.press('j');assert.equal(await p.evaluate(()=>state.area),'town');await p.keyboard.press('j');
  assert.deepEqual(await p.evaluate(()=>[state.depth,state.player.x,state.player.y]),await p.evaluate(()=>c3Exit));
  await p.evaluate(()=>{state.player.x=state.upstairs.x;state.player.y=state.upstairs.y;});await p.keyboard.press('q');assert.equal(await p.evaluate(()=>state.depth),1);
  await p.evaluate(()=>{state.floorKey.collected=true;state.player.x=state.stairs.x;state.player.y=state.stairs.y;});await p.keyboard.press('Space');assert.equal(await p.evaluate(()=>state.depth),2);
  await p.evaluate(()=>{state.player.hp=5;checkHealth();render();window.c3Health=state.pause;});
  await p.keyboard.press('?');assert.equal(await p.evaluate(()=>state.helpOpen),true);await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(()=>state.pause===c3Health),true);
  await p.keyboard.press('t');await p.keyboard.press('n');assert.equal(await p.evaluate(()=>state.pause===c3Health),true);
  await p.keyboard.press('t');await p.keyboard.press('y');assert.equal(await p.evaluate(()=>state.area),'town');
  assert.equal(await p.evaluate(()=>state.companion===c3Actor&&state.companionAttackAt===c3Deadline),true);
  assert.deepEqual(await p.evaluate(()=>[state.player.hp===state.player.maxHp,state.player.mp,state.townScrolls,state.retreatReadyAt]),[true,7,1,80]);
  await atPost();
  await p.evaluate(()=>{window.c3Session=state.companionPicker;window.c3OldClick=document.querySelector('[data-companion-id="marmalade"]').onclick;
   Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await choose('marmalade');assert.equal(await p.evaluate(()=>state.companion.id),'pip');
  assert.equal(await p.evaluate(()=>state.companionPicker===c3Session),true);
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await p.evaluate(()=>state.motion.lastTimestamp),null);
  await p.locator('#companionOverlay').screenshot({path:path.join(__dirname,`${mobile?'mobile':'desktop'}-retained-picker.png`)});
  await p.evaluate(()=>enterFloor(2,false));assert.equal(await p.locator('#companionOverlay').isVisible(),false);
  await p.evaluate(()=>c3OldClick());assert.equal(await p.evaluate(()=>state.companion.id),'pip');
  await p.evaluate(()=>{enterFloor(100,false,true);damageMonster(state.boss,state.boss.hp);});await p.keyboard.press('Escape');
  await p.evaluate(()=>{state.player.x=state.princess.x;state.player.y=state.princess.y;});await p.keyboard.press('Space');
  assert.deepEqual(await p.evaluate(()=>[state.gameOver,state.won,state.companion,state.companionPicker,state.unlockedCompanions]),[true,true,null,null,['marmalade','pip']]);
  await p.keyboard.press('Escape');await p.keyboard.press('r');await atPost();await p.evaluate(()=>c3OldClick());
  assert.equal(await p.evaluate(()=>!!state.companionPicker),true);assert.equal(await p.evaluate(()=>state.companion),null);
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.getElementById('gameLayout').inert),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({width,mobileTouch:mobile,secrecy:matrix,retirementReselectionOnce:true,companionBossKillStopsCurrentTick:midTickStop,realScrollAndStairs:true,
   helpPreservesHealthAndRetreatCancel:true,retreatPreservesActorDeadline:true,hiddenPicker:'explicit document.hidden + visibilitychange fixture',
   forcedTravelAndEndingTeardown:true,oldRunCallbackRejected:true,errors,remote});await p.close();
 }}finally{await b.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,nativeBackgroundVerified:false,method:'normal file:// Chrome; keyboard/touch picker, J/Q/Space/retreat/Help/R; staged positions/unlocks/boss kills and pixel fixtures, intervals stopped for deterministic state'},null,2)+'\n');console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
