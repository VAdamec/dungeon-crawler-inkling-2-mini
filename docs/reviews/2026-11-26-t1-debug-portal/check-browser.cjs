// Development-only file:// acceptance. Supply an existing external Playwright install.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.OX72_PLAYWRIGHT || 'playwright');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const results = [];
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:1000}});
      const errors=[],remote=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
      await page.addInitScript(()=>{const interval=window.setInterval;window.t1Intervals=[];
        window.setInterval=(...args)=>{const id=interval(...args);window.t1Intervals.push(id);return id;};});
      await page.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
      await page.locator('#startGame').click();
      await page.evaluate(()=>window.t1Intervals.forEach(clearInterval));
      await page.keyboard.press('`');
      const command=async text=>{await page.locator('#consoleInput').fill(text);await page.keyboard.press('Enter');};
      await command('loadLevel 2');
      await command('addScrolls 1'); // Existing valid path; T2 parsing is out of scope.
      const before=await page.evaluate(()=>{state.player.hp=37;state.player.mp=7;state.retreatReadyAt=80;
        return {depth:state.depth,x:state.player.x,y:state.player.y,hp:state.player.hp,mp:state.player.mp,
          scrolls:state.townScrolls,active:state.activeTime,retreat:state.retreatReadyAt};});
      await command('teleportTown extra');
      assert.equal(await page.evaluate(()=>state.area),'dungeon');
      assert.match(await page.locator('#consoleOutput').textContent(),/Usage: teleportTown/);
      // Explicit visibility fixture, not native background-tab acceptance.
      await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
      await command('teleportTown');
      assert.equal(await page.evaluate(()=>state.area),'dungeon');
      await page.evaluate(()=>delete document.hidden);
      await command('TeLePoRtToWn');
      assert.equal(await page.evaluate(()=>state.area),'town');
      assert.deepEqual(await page.evaluate(()=>state.townExit),{depth:before.depth,x:before.x,y:before.y,reason:'cheat'});
      assert.deepEqual(await page.evaluate(()=>[state.player.hp,state.player.mp,state.townScrolls,state.activeTime,state.retreatReadyAt]),
        [before.hp,before.mp,before.scrolls,before.active,before.retreat]);
      await command('teleportTown');
      assert.match(await page.locator('#consoleOutput').textContent(),/Already in town/);
      await page.keyboard.press('Escape');
      await page.keyboard.press('j');
      assert.deepEqual(await page.evaluate(()=>[state.area,state.depth,state.player.x,state.player.y,state.townExit,state.townPortalOpen]),
        ['dungeon',before.depth,before.x,before.y,null,false]);
      await page.keyboard.press('`');
      await command('teleportTown');
      await command('loadLevel 3');
      const saved=await page.evaluate(()=>JSON.stringify(state.townExit));
      await command('teleportTown');
      assert.equal(await page.evaluate(()=>state.area),'dungeon');
      assert.equal(await page.evaluate(()=>JSON.stringify(state.townExit)),saved);
      assert.match(await page.locator('#consoleOutput').textContent(),/already open/);
      // Return to the existing portal through shared town path; Space at gate.
      await page.evaluate(()=>enterTown());
      await page.keyboard.press('Escape');
      await page.evaluate(()=>{state.player.x=state.townGate.x;state.player.y=state.townGate.y;});
      await page.keyboard.press('Space');
      assert.deepEqual(await page.evaluate(()=>[state.depth,state.player.x,state.player.y,state.townExit,state.townPortalOpen]),
        [before.depth,before.x,before.y,null,false]);
      // The ordinary scroll still costs exactly one and uses its normal reason.
      await page.keyboard.press('j');
      assert.deepEqual(await page.evaluate(()=>[state.area,state.townScrolls,state.townExit.reason]),['town',0,'scroll']);
      await page.keyboard.press('j');
      assert.deepEqual(await page.evaluate(()=>[state.area,state.townScrolls,state.townPortalOpen]),['dungeon',0,false]);
      assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
      results.push({width,protocol:'file:',consoleKeyboard:true,invalidArity:true,explicitHiddenFixture:true,
        preservesResources:true,jAndSpaceReturns:true,loadLevelCannotReplacePortal:true,normalScrollCost:true,errors,remote});
      await page.close();
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,nativeBackgroundObserved:'unverified; not attempted'},null,2)+'\n');
  console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
