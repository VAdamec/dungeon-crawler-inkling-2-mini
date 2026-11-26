const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('/opt/homebrew/lib/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[],errors=[],remote=[];
try{for(const profile of [{name:'desktop',width:1440,height:1000},{name:'touch',width:390,height:844,mobile:true},
 {name:'narrow',width:320,height:568,mobile:true},{name:'landscape',width:844,height:390,mobile:true}]){
 const ctx=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile}),p=await ctx.newPage();
 await p.addInitScript(()=>{const original=setInterval;window.timers=[];window.setInterval=(...args)=>{const id=original(...args);timers.push(id);return id;};});
 p.on('pageerror',e=>errors.push(profile.name+':'+e.message));p.on('console',m=>{if(m.type()==='error')errors.push(profile.name+':'+m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);await p.keyboard.press('Enter');await p.evaluate(()=>timers.forEach(clearInterval));
 const click=async selector=>profile.mobile?await p.locator(selector).tap():await p.locator(selector).click();
 await p.evaluate(()=>{state.gold=0;state.player.x=state.merchant.x;state.player.y=state.merchant.y;render(true);canvas.focus();});await p.keyboard.press('Space');
 assert.equal(await p.evaluate(()=>document.activeElement.id),'closeTrade','disabled rows must not strand focus');
 const layout=await p.evaluate(()=>{const d=document.querySelector('.trade-dialog').getBoundingClientRect(),c=document.getElementById('cancelTrade').getBoundingClientRect(),f=document.getElementById('confirmTrade').getBoundingClientRect();
  return {fits:d.x>=0&&d.right<=innerWidth&&d.y>=0&&d.bottom<=innerHeight,footer:c.bottom<=innerHeight&&f.bottom<=innerHeight,body:document.querySelector('.trade-content').clientHeight};});
 assert.equal(layout.fits&&layout.footer,true);assert.ok(layout.body>0);await click('#cancelTrade');
 // One-shot opening paint failure must leave an interactive canvas and allow retry.
 await p.evaluate(()=>{window.m3Render=render;render=()=>{throw new Error('injected open paint');};});await p.keyboard.press('Space');
 assert.equal(await p.evaluate(()=>state.trade===null&&!document.getElementById('gameLayout').inert&&document.activeElement===canvas),true);
 await p.evaluate(()=>{render=window.m3Render;state.gold=1000;});await p.keyboard.press('Space');
 await click('#tradeBuyList [data-trade-key="stock:0"]');await click('#addTradePurchase');
 // Simulated visibility only, deliberately not a native GR-09 observation.
 await p.evaluate(()=>{window.hiddenFixture=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.hiddenFixture});document.dispatchEvent(new Event('visibilitychange'));});
 await click('#confirmTrade');assert.equal(await p.evaluate(()=>!!state.trade&&state.inventory.length===0),true);
 await p.evaluate(()=>{window.hiddenFixture=false;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.evaluate(()=>state.inventory.length),0);
 // Save helper fails after writing; old state must return before retry.
 const gold=await p.evaluate(()=>state.gold);await p.evaluate(()=>{window.m3Save=saveTown;saveTown=()=>{window.m3Save();throw new Error('injected save');};});
 await click('#confirmTrade');assert.match(await p.locator('#tradeStatus').innerText(),/unchanged/);assert.equal(await p.evaluate(()=>state.gold),gold);
 await p.screenshot({path:path.join(__dirname,'screenshots',profile.name+'-recovery.png')});
 await click('#cancelTrade');await p.evaluate(()=>{saveTown=window.m3Save;});await p.keyboard.press('Space');await click('#addTradePurchase');await click('#confirmTrade');
 assert.equal(await p.evaluate(()=>state.inventory.length),1);assert.equal(await p.evaluate(()=>state.merchant.stock.length),5);
 // Source portal and chosen companion survive both Cancel and Confirm in town.
 await p.evaluate(()=>{enterFloor(2,false,true);unlockCompanion('hydra');activateCompanion('hydra');state.townScrolls=3;state.player.hp=37;state.player.mp=7;state.activeTime=50;state.retreatReadyAt=110;useTownScroll();
  state.merchant.stock=townStoreStock();state.gold=1000;state.player.x=state.merchant.x;state.player.y=state.merchant.y;render(true);canvas.focus();window.m3Return=JSON.stringify([state.townExit,state.townPortalOpen,state.retreatReadyAt,state.player.mp,state.companion,state.unlockedCompanions,state.companionAttackAt]);});
 await p.keyboard.press('Space');await click('#tradeBuyList [data-trade-key="stock:5"]');await click('#addTradePurchase');await click('#cancelTrade');
 assert.equal(await p.evaluate(()=>JSON.stringify([state.townExit,state.townPortalOpen,state.retreatReadyAt,state.player.mp,state.companion,state.unlockedCompanions,state.companionAttackAt])===window.m3Return),true);
 await p.keyboard.press('Space');await click('#tradeBuyList [data-trade-key="stock:5"]');await click('#addTradePurchase');await click('#confirmTrade');
 assert.equal(await p.evaluate(()=>JSON.stringify([state.townExit,state.townPortalOpen,state.retreatReadyAt,state.player.mp,state.companion,state.unlockedCompanions,state.companionAttackAt])===window.m3Return),true);
 const scrolls=await p.evaluate(()=>state.townScrolls);await p.keyboard.press('j');assert.equal(await p.evaluate(()=>state.area==='dungeon'&&state.depth===2&&!state.townPortalOpen&&!state.townExit),true);assert.equal(await p.evaluate(()=>state.townScrolls),scrolls);
 // Health Help restoration and modal exclusivity after shopping.
 await p.evaluate(()=>{state.player.hp=5;state.warnedLow=false;state.warnedCritical=false;checkHealth();render();});await p.keyboard.press('?');
 assert.equal(await p.locator('#helpOverlay').isVisible(),true);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>state.pause.kind),'health');
 await p.evaluate(()=>{continueGame();state.player.hp=60;state.player.mp=20;state.player.x=state.merchant.x;state.player.y=state.merchant.y;render(true);canvas.focus();});
 await p.keyboard.press('x');assert.equal(await p.evaluate(()=>!!state.trade),true);await p.keyboard.press('r');assert.equal(await p.evaluate(()=>state.trade===null&&!document.getElementById('gameLayout').inert),true);
 rows.push({profile:profile.name,layout,disabledFocus:true,openPaintRecovery:true,saveFailureRetry:true,controlledHiddenRetention:true,portalCompanionAndCooldown:true,healthHelpRestore:true,restart:true});await ctx.close();
}}finally{await browser.close();}assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);fs.writeFileSync(path.join(__dirname,'recovery.json'),JSON.stringify({rows,errors,remote,nativeGR09:'unverified',note:'Actual Chrome file:// keyboard/click/tap with staged world/progression and injected failure/visibility fixtures. Emulated touch sizes are not physical devices.'},null,2)+'\n');console.log('RECOVERY_OK');})().catch(e=>{console.error(e);process.exitCode=1});
