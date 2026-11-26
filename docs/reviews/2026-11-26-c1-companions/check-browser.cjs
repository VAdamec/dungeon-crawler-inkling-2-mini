// Development-only file:// acceptance; existing external Playwright/Chrome required.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require(process.env.OX72_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.c1Intervals=[];window.setInterval=(...a)=>{const id=original(...a);c1Intervals.push(id);return id;};
   let seed=713;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  await p.locator('[data-companion-choice="pip"]').click();
  await p.locator('#startGame').click();await p.evaluate(()=>c1Intervals.forEach(clearInterval));
  assert.equal(await p.evaluate(()=>state.selectedCompanion),'pip');
  // Manual join is a staged model fixture; Pip's nearby-Space UI remains C2.
  await p.evaluate(()=>{joinSelectedCompanion(false);window.c1Starter=state.companion;});
  await p.keyboard.press('`');
  const command=async text=>{await p.locator('#consoleInput').fill(text);await p.keyboard.press('Enter');};
  await command('loadLevel 1');
  assert.equal(await p.evaluate(()=>state.companion===c1Starter&&state.companionEntryDone&&state.entranceCat.entered),true);
  assert.equal(await p.evaluate(()=>state.town.animals.find(a=>a.name==='Pip').hidden),true);
  const bosses=[];
  for(const [depth,id,sprite] of [[3,'cook','cook'],[5,'mimic','mimic'],[7,'bartender','bartender'],[10,'hydra','hydra'],
   [20,'boar','boar'],[30,'medusa','medusa'],[40,'wizard','darkWizard'],[50,'skeletonKing','skeletonKing'],[100,'dragon','dragonBoss']]){
   await command(`loadLevel ${depth}`);
   const result=await p.evaluate(()=>{
    const boss=state.boss;state.player.xpNext=10000000;
    const before=[state.gold,state.player.xp,state.kills];damageMonster(boss,boss.hp);
    const after=[state.gold,state.player.xp,state.kills];damageMonster(boss,1000);
    const frames=[];
    for(const direction of ['front','back','left','right']){
     state.motion.directions.companion=direction;
     const pose=actorAnimationPose(state.companion.sprite,state.companion);
     const frame=artFrame(state.companion.sprite,pose.frame,direction);
     drawCompanion();frames.push(Number.isInteger(pose.frame)&&typeof frame.r==='string');
    }
    const old=state.bossDefeat;skipBossDefeat();bossDefeatFrame(999999,old);
    return {id:state.companion.id,sprite:state.companion.sprite,frames,
     rewards:[after[0]-before[0],after[1]-before[1],after[2]-before[2]],expected:[boss.gold||0,boss.xp,1],
     noDuplicateReward:JSON.stringify(after)===JSON.stringify([state.gold,state.player.xp,state.kills]),
     unlocked:state.unlockedCompanions.filter(x=>x===state.companion.id).length,
     saved:state.floors[state.depth].bossDefeated};
   });
   assert.equal(result.id,id);assert.equal(result.sprite,sprite);assert.ok(result.frames.every(Boolean));
   assert.deepEqual(result.rewards,result.expected);assert.equal(result.noDuplicateReward,true);
   assert.equal(result.unlocked,1);assert.equal(result.saved,true);bosses.push({depth,id,sprite,validFrames:true});
  }
  const ending=await p.evaluate(()=>{
   state.player.x=state.princess.x;state.player.y=state.princess.y;pickup();closeConsole();stopEndingAnimation();
   const phases=[];for(const elapsed of [2,3,3,6]){advanceEnding(elapsed);draw();phases.push(state.ending.phase);}
   return {phases,won:state.gameOver&&state.won,companion:state.companion,selected:state.selectedCompanion,unlocked:state.unlockedCompanions};
  });
  assert.equal(ending.won,true);assert.equal(ending.companion,null);assert.equal(ending.selected,'marmalade');
  assert.deepEqual(ending.unlocked,['marmalade','pip']);
  await p.keyboard.press('r');
  assert.deepEqual(await p.evaluate(()=>[state.started,state.area,state.selectedCompanion,state.companionEntryDone,state.companion]),
   [true,'town','marmalade',false,null]);
  assert.equal(await p.locator('#launchScreen').isVisible(),false);
  assert.equal(await p.locator('[data-companion-choice="marmalade"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({width,protocol:'file:',realLaunchChoice:true,manualRecruitment:'staged model helper, not C2 Space UI acceptance',
   firstDescentIdempotent:true,bosses,endingPhases:ending.phases,restartDefaultWithoutLaunch:true,errors,remote});
  await p.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,method:'real launch/console/R keys; stopped enemy intervals; staged kills/directions/ending advances; browser rAF API present',nativeBackgroundVerified:false},null,2)+'\n');
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
