// S2 actual file:// model/commit/rollback checks. No native file UI, download or import claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OX72_PLAYWRIGHT||'/opt/homebrew/lib/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const mobile of [false,true]){
  const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
  const p=await context.newPage(),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.s2Intervals=[];
   window.setInterval=(...args)=>{const id=original(...args);s2Intervals.push(id);return id;};});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  if(mobile)await p.locator('#startGame').tap();else await p.locator('#startGame').click();
  await p.evaluate(()=>s2Intervals.forEach(clearInterval));
  const cases=[];
  for(const area of ['town','dungeon']){
   await p.evaluate(area=>{
    if(area==='dungeon')enterDungeonFromTown();
    equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=37;state.player.mp=7;state.gold=293;
    state.activeTime=15.25;state.retreatReadyAt=72.5;state.warnedLow=true;state.townScrolls=3;
    state.townExit={depth:1,x:0,y:0,reason:'cheat'};state.townPortalOpen=true;
    if(area==='dungeon'){state.monsters[0].hp=4;state.monsters[0].nextAttackAt=17.5;state.hazardTime=3.75;}
    const ctx={createdAt:'2026-11-26T12:00:00.000Z',hidden:document.hidden,tradeOpen:false,companionOpen:false};
    window.s2Expected=captureSaveData(state,ctx);
    // Deliberately different receiving viewport and HUD to make rollback observable.
    const tile=area==='town'?{x:20,y:16}:state.stairs;state.player.x=tile.x;state.player.y=tile.y;state.gold=42;render(true);
   },area);
   await p.keyboard.press('?');assert.equal(await p.locator('#helpOverlay').isVisible(),true);
   await p.evaluate(()=>{
    window.s2Snapshot=()=>JSON.stringify(state,(key,value)=>{
     if(['art','audio','motion','helpFocus','loadSession','lastTick'].includes(key))return undefined;
     return value instanceof Set?[...value]:value;
    });
    window.s2Session=beginSaveLoad();window.s2Before=s2Snapshot();window.s2Focus=document.activeElement;
    window.s2Live=setInterval(enemyTick,220);
   });
   await p.keyboard.press('ArrowRight');await p.keyboard.press('h');await p.waitForTimeout(500);
   assert.equal(await p.evaluate(()=>s2Snapshot()===s2Before),true);
   await p.evaluate(()=>clearInterval(s2Live));
   await p.keyboard.press('Escape');
   assert.equal(await p.evaluate(()=>state.loadSession===null&&state.helpOpen),true);
   await p.evaluate(()=>{window.s2Session=beginSaveLoad();window.s2Before=s2Snapshot();});
   const result=await p.evaluate(()=>{
    const originalRandom=Math.random,originalSound=playSound,originalRender=render;
    const map=document.getElementById('game'),mini=document.getElementById('minimap');
    const beforeMap=map.toDataURL(),beforeMini=mini.toDataURL(),beforeState=state;
    let invalidRejected=false,paintRejected=false;
    try{
     Math.random=()=>{throw new Error('load consumed RNG');};playSound=()=>{throw new Error('load played sound');};
     try{commitSaveLoad(s2Session,{});}catch(e){invalidRejected=/Invalid save:/.test(e.message);}
     if(!invalidRejected||state!==beforeState||state.loadSession!==s2Session||s2Snapshot()!==s2Before)throw new Error('invalid-data rollback failed');
     render=(...args)=>{originalRender(...args);document.getElementById('gold').textContent='BROKEN';throw new Error('injected paint failure');};
     try{commitSaveLoad(s2Session,s2Expected);}catch(e){paintRejected=/injected paint failure/.test(e.message);}
     render=originalRender;
     if(!paintRejected||state!==beforeState||state.loadSession!==null||s2Snapshot()!==s2Before)throw new Error('state rollback failed');
     if(map.toDataURL()!==beforeMap||mini.toDataURL()!==beforeMini)throw new Error('canvas rollback failed');
     if(document.getElementById('gold').textContent!=='42'||document.getElementById('helpOverlay').hidden
       ||!document.getElementById('gameLayout').inert||document.activeElement!==s2Focus)throw new Error('HUD/focus/Help rollback failed');
     if(commitSaveLoad(s2Session,s2Expected)!==false)throw new Error('failed session reused');
     const audio=state.audio,art=state.art,token=beginSaveLoad();
     if(!commitSaveLoad(token,s2Expected))throw new Error('commit rejected');
     if(state.audio!==audio||state.art!==art)throw new Error('resource identity lost');
     const ctx={createdAt:s2Expected.createdAt,hidden:false,tradeOpen:false,companionOpen:false};
     if(JSON.stringify(captureSaveData(state,ctx))!==JSON.stringify(s2Expected))throw new Error('restored DTO differs');
     if(state.player.hp!==37||state.player.maxHp!==80||state.gold!==293)throw new Error('progression changed');
     if(document.getElementById('hpText').textContent!=='37/80'||document.getElementById('gold').textContent!=='293')throw new Error('HUD stale');
     if(!document.getElementById('helpOverlay').hidden||!document.getElementById('launchScreen').hidden
       ||document.getElementById('gameLayout').inert||document.activeElement!==canvas)throw new Error('loaded UI/focus wrong');
     if(commitSaveLoad(token,s2Expected)!==false)throw new Error('confirmation reused');
     return {area:state.area,liveIntervalAndInputFrozen:true,invalidRejected,paintRejected,
      semanticRollback:true,canvasPixelRollback:true,hudHelpFocusRollback:true,exactRestore:true,
      noRngOrSound:true,resourceIdentity:true,consumedTokenRejected:true};
    }finally{Math.random=originalRandom;playSound=originalSound;render=originalRender;}
   });
   cases.push(result);
  }
  const dto=await p.evaluate(()=>s2Expected);
  await p.reload();await p.evaluate(()=>s2Intervals.forEach(clearInterval));
  assert.equal(await p.evaluate(data=>commitSaveLoad(beginSaveLoad(),data),dto),true);
  assert.equal(await p.evaluate(()=>state.started&&!state.gameOver&&document.getElementById('launchScreen').hidden),true);
  await p.evaluate(()=>die());
  assert.equal(await p.evaluate(data=>commitSaveLoad(beginSaveLoad(),data),dto),true);
  await p.evaluate(()=>{window.s2Old=beginSaveLoad();});
  await p.keyboard.press('r');
  assert.equal(await p.evaluate(data=>commitSaveLoad(s2Old,data),dto),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({viewport,mobileTouchEmulation:mobile,protocol:'file:',cases,launchAndDeathLoad:true,nativeEscapeCancel:true,nativeRestartInvalidates:true,
   scope:'Staged DTO and API calls; no native file selection/download/import. Not native mobile-keyboard or large-file performance acceptance.',errors,remote});
  await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,nativeBackgroundObserved:false},null,2)+'\n');console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
