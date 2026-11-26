// Real offline UI checks. Existing external Playwright/Chrome; no game dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require(process.env.OX72_PLAYWRIGHT||'playwright');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const width of [1440,390]){
  const mobile=width<700,p=await b.newPage({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.c2Intervals=[];window.setInterval=(...a)=>{const id=original(...a);c2Intervals.push(id);return id;};});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>state.started),false);
  assert.equal(await p.evaluate(()=>state.companionChoice),'pip');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.companionChoice),'pip');
  await p.keyboard.press('ArrowLeft');assert.equal(await p.evaluate(()=>state.started),false);
  await p.keyboard.press('End');await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>state.selectedCompanion),'pip');
  await p.evaluate(()=>c2Intervals.forEach(clearInterval));
  const tap=async selector=>mobile?await p.locator(selector).tap():await p.locator(selector).click();
  // Actual arrows walk the saved walkable map; no positioning shortcut for recruitment/post.
  const walk=async target=>{
   const keys=await p.evaluate(kind=>{
    const goal=kind==='pip'?state.town.animals.find(a=>a.name==='Pip'):state.town.landmarks.companionBoard;
    const start={x:state.player.x,y:state.player.y,keys:[]},queue=[start],seen=new Set([start.x+','+start.y]);
    const dirs=[[1,0,'ArrowRight'],[-1,0,'ArrowLeft'],[0,1,'ArrowDown'],[0,-1,'ArrowUp']];
    for(let i=0;i<queue.length;i++){const cur=queue[i];if(nearbyTile(cur.x,cur.y,goal))return cur.keys;
     for(const [dx,dy,key] of dirs){const x=cur.x+dx,y=cur.y+dy,k=x+','+y;
      if(seen.has(k)||!state.map[y]||state.map[y][x]!==0||state.town.npcs.some(n=>n.x===x&&n.y===y))continue;
      seen.add(k);queue.push({x,y,keys:[...cur.keys,key]});}}
    throw Error('No walking path to '+kind);
   },target);
   await p.locator('#game').focus();for(const key of keys)await p.keyboard.press(key);
   await p.waitForTimeout(250);
  };
  await walk('pip');await p.keyboard.press('Space');
  assert.equal(await p.evaluate(()=>state.companion.id),'pip');
  assert.equal(await p.evaluate(()=>state.town.animals.find(a=>a.name==='Pip').hidden),true);
  await walk('post');
  assert.equal(await p.locator('#companionPostAction').isVisible(),true);
  await p.evaluate(()=>{state.companionSpeech=null;state.town.speech=null;draw();}); // still capture: clear transient speech only
  await p.locator('#game').screenshot({path:path.join(__dirname,`${mobile?'mobile':'desktop'}-post.png`)});
  const open=async()=>{if(mobile)await tap('#companionPostAction');else{await p.locator('#game').focus();await p.keyboard.press('Space');}};
  await p.evaluate(()=>{window.c2Active=state.companion;window.c2Ready=[state.companionAttackAt,state.companionSpeechReadyAt];window.c2Live=setInterval(enemyTick,220);});
  await open();
  assert.equal(await p.locator('#companionOverlay').isVisible(),true);
  assert.equal(await p.evaluate(()=>document.activeElement.id),'closeCompanionBoard');
  assert.equal(await p.evaluate(()=>document.getElementById('gameLayout').inert),true);
  assert.equal(await p.locator('#companionBoardList button:disabled').count(),9);
  const frozen=await p.evaluate(()=>JSON.stringify([state.town.tick,state.town.npcs,state.town.animals,state.motion.time,state.activeTime,state.hazardTime,state.player]));
  await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>JSON.stringify([state.town.tick,state.town.npcs,state.town.animals,state.motion.time,state.activeTime,state.hazardTime,state.player])),frozen);
  await p.keyboard.press('?');await p.keyboard.press('`');
  assert.deepEqual(await p.evaluate(()=>[state.helpOpen,state.consoleOpen]),[false,false]);
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'companionAudioToggle');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'closeCompanionBoard');
  await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.companionId),'pip');
  assert.equal(await p.evaluate(()=>state.companion===c2Active),true);
  await p.keyboard.press('Enter');
  assert.equal(await p.locator('#companionOverlay').isVisible(),false);
  assert.equal(await p.evaluate(()=>state.companion===c2Active&&JSON.stringify(c2Ready)===JSON.stringify([state.companionAttackAt,state.companionSpeechReadyAt])),true);
  await p.evaluate(()=>{clearInterval(c2Live);c2Intervals.forEach(clearInterval);});
  await open();
  const audio=await p.evaluate(()=>state.audio.enabled);await tap('#companionAudioToggle');
  assert.equal(await p.evaluate(()=>state.audio.enabled),!audio);
  await p.locator('#companionOverlay').screenshot({path:path.join(__dirname,`${mobile?'mobile':'desktop'}-picker.png`)});
  const scroller=p.locator('.companion-dialog .help-content');
  if(mobile){
   const rect=await scroller.boundingBox(),cdp=await p.context().newCDPSession(p);
   const x=Math.round(rect.x+60),y=Math.round(rect.y+rect.height-20);
   for(let swipe=0;swipe<2;swipe++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*40}]});await p.waitForTimeout(20);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(180);
   }
   await cdp.detach();
  }else{await scroller.hover();await p.mouse.wheel(0,1400);await p.waitForTimeout(200);}
  assert.ok(await scroller.evaluate(el=>el.scrollTop)>50,'long roster scrolls within the dialog');
  assert.equal(await p.locator('#closeCompanionBoard').isVisible(),true);
  await p.locator('#companionOverlay').screenshot({path:path.join(__dirname,`${mobile?'mobile':'desktop'}-picker-scrolled.png`)});
  const dimensions=await p.evaluate(()=>{
   const d=document.querySelector('.companion-dialog').getBoundingClientRect();
   const controls=['closeCompanionBoard','companionAudioToggle'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};});
   return {x:d.x,y:d.y,w:d.width,h:d.height,viewport:[innerWidth,innerHeight],pageWidth:document.documentElement.scrollWidth,controls};});
  assert.ok(dimensions.x>=0&&dimensions.y>=0&&dimensions.x+dimensions.w<=dimensions.viewport[0]+1&&dimensions.y+dimensions.h<=dimensions.viewport[1]+1);
  assert.ok(dimensions.pageWidth<=dimensions.viewport[0]+1);
  for(const c of dimensions.controls)assert.ok(c.h>=44&&c.y>=0&&c.y+c.h<=dimensions.viewport[1]+1);
  // Capture an old row handler, cancel, reopen, and prove it cannot act on a new session.
  await p.evaluate(()=>{c2Old=state.companionPicker;c2OldChoose=document.querySelector('[data-companion-id="marmalade"]').onclick;});
  await tap('#closeCompanionBoard');assert.equal(await p.evaluate(()=>state.companion===c2Active),true);
  await open();await p.evaluate(()=>c2OldChoose());
  assert.equal(await p.locator('#companionOverlay').isVisible(),true);assert.equal(await p.evaluate(()=>state.companion.id),'pip');
  assert.equal(await p.evaluate(()=>selectCompanion('mimic',state.companionPicker)),false);
  if(mobile)await tap('[data-companion-id="marmalade"]');else{await p.locator('[data-companion-id="marmalade"]').focus();await p.keyboard.press('Enter');}
  assert.equal(await p.evaluate(()=>state.companion.id),'marmalade');
  assert.equal(await p.evaluate(()=>state.messages.filter(m=>m.includes('Marmalade is now your active companion.')).length),1);
  assert.equal(await p.evaluate(()=>!!entranceCatActor().hidden&&!state.town.animals.find(a=>a.name==='Pip').hidden),true);
  // Staged unlock only: the actual UI must select the boss and scroll rows normally.
  await p.evaluate(()=>unlockCompanion('mimic'));await open();
  assert.equal(await p.locator('[data-companion-id="mimic"]').isEnabled(),true);
  if(mobile)await tap('[data-companion-id="mimic"]');else{await p.locator('[data-companion-id="mimic"]').focus();await p.keyboard.press('Space');}
  assert.equal(await p.evaluate(()=>state.companion.id),'mimic');
  await open();await p.keyboard.press('End');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.companionId),'mimic');
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.getElementById('gameLayout').inert),false);
  await open();await p.keyboard.press('r');
  assert.deepEqual(await p.evaluate(()=>[state.started,state.area,state.selectedCompanion,state.companionPicker]),[true,'town','marmalade',null]);
  assert.equal(await p.locator('#launchScreen').isVisible(),false);
  assert.equal(await p.evaluate(()=>document.getElementById('gameLayout').inert),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({width,mobileTouch:mobile,launchArrows:true,realWalkingRecruitment:true,postEntry:mobile?'touch button':'Space',
   liveTownAndMotionFrozen:true,focusTrap:true,cancelAndSameChoicePreserved:true,singleNativeActivation:true,lockedAndStaleRejected:true,
   bossChoice:true,independentRosterScroll:true,audioUsable:true,restartWithoutLaunch:true,dimensions,errors,remote});await p.close();
 }}finally{await b.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,method:'normal file:// Chrome; real launch/arrows/Space and click/tap interactions; stopped initial enemy intervals for deterministic walking; live interval restored for modal freeze check; one staged boss unlock',nativeBackgroundVerified:false},null,2)+'\n');
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
