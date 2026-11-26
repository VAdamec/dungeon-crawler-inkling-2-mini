// Development-only acceptance runner. External Playwright/Chrome; no game dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OX72_PLAYWRIGHT||'/opt/homebrew/lib/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const mobile of [false,true]){
  const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
  const p=await context.newPage(),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.g1Intervals=[];
   window.setInterval=(...a)=>{const id=original(...a);g1Intervals.push(id);return id;};});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  if(mobile)await p.locator('#startGame').tap();else await p.locator('#startGame').click();
  // Stop simulation intervals for repeatable command snapshots; keyboard/DOM handlers remain real.
  await p.evaluate(()=>g1Intervals.forEach(clearInterval));
  await p.keyboard.press('`');
  const command=async text=>{await p.locator('#consoleInput').fill(text);await p.keyboard.press('Enter');};
  const snapshot=()=>p.evaluate(()=>JSON.stringify(state,(key,value)=>{
   if(['art','motion','audio','consoleLines','consoleHistory','consoleHistoryIndex'].includes(key))return undefined;
   if(value instanceof Set)return [...value];return value;
  }));
  const reply=()=>p.evaluate(()=>state.consoleLines.at(-1));
  assert.match(await reply(),/goldADD <amount>/);
  await command('clear');await command('help');assert.match(await reply(),/goldADD <amount>/);
  for(const area of ['town','dungeon'])for(const god of [false,true]){
   // Staged area/progression fixture; travel itself is covered by the existing full suite.
   await p.evaluate(({area,god})=>{
    if(area!==state.area)enterDungeonFromTown();
    state.gold=40;state.player.hp=37;state.player.mp=7;
    state.retreatReadyAt=72;state.townPortalOpen=true;
    state.townExit={depth:1,x:12,y:9,reason:'cheat'};
    setGodMode(god?'1':'0');render();
    window.g1OriginalRandom=Math.random;window.g1OriginalSound=playSound;
    Math.random=()=>{throw new Error('goldADD consumed RNG');};
    playSound=()=>{throw new Error('goldADD played sound');};
   },{area,god});
   for(const [text,amount] of [['goldADD 250',250],['GOLDADD 0003',3]]){
    const before=JSON.parse(await snapshot());await command(text);
    const expected={...before,gold:before.gold+amount};
    assert.deepEqual(JSON.parse(await snapshot()),expected);
    assert.equal(await p.locator('#gold').textContent(),String(expected.gold));
    assert.match(await reply(),new RegExp(`Added ${amount} gold; total ${expected.gold}\\.`));
    assert.equal(await p.locator('#consoleInput').inputValue(),'');
   }
   for(const text of ['goldADD','goldADD 0','goldADD -1','goldADD +3','goldADD 1.5','goldADD 1e2',
     'goldADD 0x10','goldADD 0b10','goldADD Infinity','goldADD 3 extra','goldADD 9007199254740992']){
    const before=await snapshot(),hud=await p.locator('#gold').textContent();await command(text);
    assert.equal(await snapshot(),before,text);assert.equal(await p.locator('#gold').textContent(),hud);
    assert.match(await reply(),/Usage: goldADD <positive integer>/);
   }
   await p.evaluate(()=>{Math.random=g1OriginalRandom;playSound=g1OriginalSound;});
  }
  await p.evaluate(()=>{setGodMode('0');state.gold=Number.MAX_SAFE_INTEGER-1;render();});
  await command('goldADD 1');assert.equal(await p.locator('#gold').textContent(),'9007199254740991');
  const before=await snapshot();await command('goldADD 1');assert.equal(await snapshot(),before);
  assert.match(await reply(),/Usage: goldADD <positive integer>/);
  await p.evaluate(()=>{state.gold=293;render();});
  for(const setup of ['state.trade={snapshot:{gold:123}}','Object.defineProperty(document,"hidden",{configurable:true,value:true})']){
   await p.evaluate(code=>(0,eval)(code),setup);
   const before=await snapshot();await command('goldADD 2');assert.equal(await snapshot(),before);
   assert.match(await reply(),/Cannot add gold now/);
   await p.evaluate(()=>{state.trade=null;delete document.hidden;});
  }
  await command('clear');await command('goldADD 7');
  await p.locator('#gold').scrollIntoViewIfNeeded();
  assert.equal(await p.locator('#gold').isVisible(),true);
  assert.equal(await p.locator('#gold').textContent(),'300');
  await p.screenshot({path:path.join(__dirname,mobile?'mobile.png':'desktop.png')});
  await p.keyboard.press('Escape');assert.equal(await p.locator('#devConsole').isVisible(),false);
  assert.equal(await p.locator('#gold').textContent(),'300');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({viewport,mobileTouchEmulation:mobile,protocol:'file:',nativeConsoleEnter:true,
   discovery:true,exactDeltaAndHud:true,strictInput:true,safeBoundary:true,townDungeonGodMode:true,
   semanticSnapshotUnchangedExceptGold:true,noRngOrSound:true,tradeBlocked:true,
   hiddenCheck:'explicit document.hidden fixture; not native background observation',errors,remote});
  await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,nativeBackgroundObserved:'unverified'},null,2)+'\n');
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
