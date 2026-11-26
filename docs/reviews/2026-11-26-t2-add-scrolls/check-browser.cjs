// Development-only file:// regression runner; Playwright stays external to the game.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OX72_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.t2Intervals=[];window.setInterval=(...a)=>{const id=original(...a);t2Intervals.push(id);return id;};});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  await p.locator('#startGame').click();await p.evaluate(()=>t2Intervals.forEach(clearInterval));
  await p.keyboard.press('`');
  const command=async text=>{await p.locator('#consoleInput').fill(text);await p.keyboard.press('Enter');};
  const snapshot=()=>p.evaluate(()=>JSON.stringify({area:state.area,depth:state.depth,player:state.player,gold:state.gold,
   inventory:state.inventory,equipment:state.equipment,spells:state.spellReadyAt,scrolls:state.townScrolls,
   exit:state.townExit,portal:state.townPortalOpen,floors:state.floors,map:state.map,visited:[...state.visited],
   companion:state.companion,selected:state.selectedCompanion,unlocked:state.unlockedCompanions,
   active:state.activeTime,retreat:state.retreatReadyAt,messages:state.messages}));
  assert.match(await p.locator('#consoleOutput').textContent(),/addScrolls/);
  await command('help');assert.match(await p.locator('#consoleOutput').textContent(),/teleportTown.*addScrolls/);
  await command('AdDsCrOlLs 0003');assert.equal(await p.evaluate(()=>state.townScrolls),3);
  assert.equal(await p.locator('#scrolls').textContent(),'3');
  assert.match(await p.locator('#spellList').textContent(),/J Town Scroll \(3\)/);
  const invalid=['addScrolls','addScrolls 0','addScrolls -1','addScrolls +3','addScrolls 1.5','addScrolls 1e2',
   'addScrolls 0x10','addScrolls 0b10','addScrolls Infinity','addScrolls 3 extra','addScrolls 9007199254740992'];
  for(const text of invalid){const before=await snapshot();await command(text);assert.equal(await snapshot(),before,text);
   assert.match(await p.locator('#consoleOutput').textContent(),/Usage: addScrolls <positive integer>/);}
  await p.evaluate(()=>state.townScrolls=Number.MAX_SAFE_INTEGER-1);
  await command('addScrolls 1');assert.equal(await p.evaluate(()=>state.townScrolls),Number.MAX_SAFE_INTEGER);
  let before=await snapshot();await command('addScrolls 1');assert.equal(await snapshot(),before);
  await p.evaluate(()=>state.townScrolls=3);
  await p.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
  before=await snapshot();await command('addScrolls 2');assert.equal(await snapshot(),before);
  assert.match(await p.locator('#consoleOutput').textContent(),/Cannot add scrolls now/);
  await p.evaluate(()=>delete document.hidden);
  await p.evaluate(()=>state.trade={snapshot:{gold:123}});before=await snapshot();
  await command('addScrolls 2');assert.equal(await snapshot(),before);
  await p.evaluate(()=>state.trade=null);
  await command('loadLevel 2');await command('addScrolls 2');
  assert.equal(await p.evaluate(()=>state.townScrolls),5);
  await command('teleportTown');const exit=await p.evaluate(()=>state.townExit);
  before=await snapshot();await command('addScrolls 2');
  const after=JSON.parse(await snapshot()),expected=JSON.parse(before);expected.scrolls+=2;assert.deepEqual(after,expected);
  assert.equal(await p.locator('#scrolls').textContent(),'7');
  assert.match(await p.locator('#spellList').textContent(),/J Town Portal \(ready\)/);
  await p.keyboard.press('Escape');await p.keyboard.press('j');
  assert.deepEqual(await p.evaluate(()=>[state.area,state.depth,state.player.x,state.player.y,state.townScrolls,state.townPortalOpen]),
   ['dungeon',exit.depth,exit.x,exit.y,7,false]);
  await p.keyboard.press('j');assert.deepEqual(await p.evaluate(()=>[state.area,state.townScrolls]),['town',6]);
  await p.keyboard.press('j');assert.deepEqual(await p.evaluate(()=>[state.area,state.townScrolls]),['dungeon',6]);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({width,protocol:'file:',consoleDiscovery:true,strictInput:true,safeIntegerBoundary:true,
   hiddenCheck:'explicit document.hidden fixture',tradeExclusion:true,townAndDungeon:true,portalPreserved:true,
   hudUpdated:true,normalScrollCost:true,errors,remote});await p.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,nativeBackgroundObserved:'unverified; not attempted'},null,2)+'\n');
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
