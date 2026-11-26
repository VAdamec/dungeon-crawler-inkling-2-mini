// S3 real local file API/UI checks. Broader S4 portability/stress and native OS dialogs remain separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OX72_PLAYWRIGHT||'/opt/homebrew/lib/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 const bad='/tmp/dungeon-s3-invalid.json',huge='/tmp/dungeon-s3-oversize.json';
 fs.writeFileSync(bad,'{broken');fs.writeFileSync(huge,'');fs.truncateSync(huge,33554433);
 try{for(const mobile of [false,true]){
  const viewport=mobile?{width:390,height:844}:{width:1440,height:1000};
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  const p=await context.newPage(),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.addInitScript(()=>{const original=setInterval;window.s3Intervals=[];
   window.setInterval=(...args)=>{const id=original(...args);s3Intervals.push(id);return id;};});
  const click=async selector=>mobile?await p.locator(selector).tap():await p.locator(selector).click();
  const choose=async filename=>{
   const event=p.waitForEvent('filechooser');await click('#saveLoadFile');const chooser=await event;await chooser.setFiles(filename);
  };
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  await click('#startGame');await p.evaluate(()=>s3Intervals.forEach(clearInterval));
  await p.evaluate(()=>{
   equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=37;state.player.mp=7;state.gold=293;state.townScrolls=3;
   state.activeTime=15.25;state.retreatReadyAt=72.5;state.warnedLow=true;
   window.s3Snapshot=()=>JSON.stringify(state,(key,value)=>{
    if(['art','audio','motion','helpFocus','loadSession','lastTick'].includes(key))return undefined;
    return value instanceof Set?[...value]:value;
   });render(true);
  });
  await p.keyboard.press('?');const before=await p.evaluate(()=>s3Snapshot());
  const downloadEvent=p.waitForEvent('download');await click('#saveGameButton');const download=await downloadEvent;
  const savedPath=`/tmp/dungeon-s3-${mobile?'mobile':'desktop'}.json`;
  await download.saveAs(savedPath);assert.match(download.suggestedFilename(),/^dungeon-crawler-.*\.json$/);
  const dto=JSON.parse(fs.readFileSync(savedPath,'utf8'));
  assert.equal(dto.format,'dungeon-crawler-save');assert.equal(dto.run.player.hp,37);assert.equal(dto.run.player.maxHp,80);
  assert.equal(dto.run.gold,293);assert.equal(await p.evaluate(()=>s3Snapshot()),before);
  assert.match(await p.locator('#saveGameStatus').textContent(),/Download requested/);
  await p.evaluate(()=>{state.gold=42;render(true);});
  await click('#loadGameButton');assert.equal(await p.locator('#saveLoadOverlay').isVisible(),true);
  assert.equal(await p.evaluate(()=>document.activeElement===state.loadSession.ui.input),true);
  assert.equal(await p.locator('#confirmSaveLoad').isDisabled(),true);
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'saveLoadAudioToggle');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'saveLoadFile');
  await p.evaluate(()=>{window.s3Before=s3Snapshot();window.s3Live=setInterval(enemyTick,220);});
  await p.keyboard.press('ArrowRight');await p.keyboard.press('h');await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>s3Snapshot()===s3Before),true);await p.evaluate(()=>clearInterval(s3Live));
  await p.evaluate(()=>{window.s3ReadCount=0;window.s3NativeRead=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(...args){s3ReadCount++;return s3NativeRead.apply(this,args);};});
  await choose(huge);await p.waitForFunction(()=>document.getElementById('saveLoadStatus').textContent.includes('32 MiB'));
  assert.equal(await p.evaluate(()=>s3ReadCount),0,'oversize must reject before FileReader.readAsText');
  await choose(bad);await p.waitForFunction(()=>state.loadSession.ui.phase==='error');
  assert.equal(await p.locator('#confirmSaveLoad').isDisabled(),true);assert.equal(await p.evaluate(()=>state.gold),42);
  await choose(savedPath);await p.waitForFunction(()=>state.loadSession.ui.phase==='ready');
  assert.match(await p.locator('#saveLoadPreview').textContent(),/HP 37\/80/);assert.equal(await p.evaluate(()=>state.gold),42);
  // Actual cancel event handler; not a native OS chooser-cancel observation.
  await p.locator('#saveLoadFile').dispatchEvent('cancel');
  assert.match(await p.locator('#saveLoadStatus').textContent(),/selection canceled/);
  assert.equal(await p.locator('#confirmSaveLoad').isDisabled(),true);
  await choose(savedPath);await p.waitForFunction(()=>state.loadSession.ui.phase==='ready');
  const bounds=await p.locator('.save-load-dialog').boundingBox(),cancel=await p.locator('#cancelSaveLoad').boundingBox();
  assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1);
  assert.ok(cancel.height>=44&&cancel.y+cancel.height<=viewport.height);
  await p.screenshot({path:path.join(__dirname,mobile?'mobile-preview.png':'desktop-preview.png')});
  await click('#saveLoadAudioToggle');assert.equal(await p.evaluate(()=>state.audio.enabled),false);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#saveLoadOverlay').isVisible(),false);
  assert.deepEqual(await p.evaluate(()=>({help:state.helpOpen,inert:document.getElementById('helpOverlay').inert,focus:document.activeElement.id})),{help:true,inert:false,focus:'loadGameButton'});
  assert.equal(await p.evaluate(()=>state.gold),42);
  await click('#loadGameButton');await choose(savedPath);await p.waitForFunction(()=>state.loadSession.ui.phase==='ready');
  await click('#confirmSaveLoad');await p.waitForFunction(()=>state.loadSession===null);
  assert.equal(await p.evaluate(()=>state.audio.enabled),false);
  const current=await p.evaluate(createdAt=>captureSaveData(state,{createdAt,hidden:false,tradeOpen:false,companionOpen:false}),dto.createdAt);
  assert.deepEqual(current,dto);assert.equal(await p.locator('#hpText').textContent(),'37/80');assert.equal(await p.locator('#gold').textContent(),'293');
  assert.equal(await p.evaluate(()=>document.activeElement===canvas),true);
  // Basic actual download -> page reload -> chosen file load; S4 still owns broad portability/stress.
  await p.reload();await p.evaluate(()=>s3Intervals.forEach(clearInterval));
  await click('#launchLoadGame');await choose(savedPath);await p.waitForFunction(()=>state.loadSession.ui.phase==='ready');
  assert.equal(await p.evaluate(()=>state.started),false);
  await click('#confirmSaveLoad');await p.waitForFunction(()=>state.loadSession===null&&state.started);
  assert.equal(await p.locator('#launchScreen').isVisible(),false);
  await p.evaluate(()=>die());await click('#deathLoadGame');await choose(savedPath);await p.waitForFunction(()=>state.loadSession.ui.phase==='ready');
  await click('#confirmSaveLoad');await p.waitForFunction(()=>state.loadSession===null&&!state.gameOver);
  assert.equal(await p.locator('#hpText').textContent(),'37/80');
  // Also round-trip an active damaged dungeon encounter through actual browser files.
  await p.evaluate(()=>{enterDungeonFromTown();state.monsters[0].hp=4;state.monsters[0].nextAttackAt=19.75;render(true);});
  await p.keyboard.press('?');
  const dungeonDownload=p.waitForEvent('download');await click('#saveGameButton');
  const dungeonPath=savedPath.replace('.json','-dungeon.json');await (await dungeonDownload).saveAs(dungeonPath);
  const dungeonDto=JSON.parse(fs.readFileSync(dungeonPath,'utf8'));
  await p.evaluate(()=>{state.monsters[0].hp=1;state.gold=8;render(true);});
  await click('#loadGameButton');await choose(dungeonPath);await p.waitForFunction(()=>state.loadSession.ui.phase==='ready');
  await click('#confirmSaveLoad');await p.waitForFunction(()=>state.loadSession===null);
  assert.deepEqual(await p.evaluate(createdAt=>captureSaveData(state,{createdAt,hidden:false,tradeOpen:false,companionOpen:false}),dungeonDto.createdAt),dungeonDto);
  assert.equal(await p.evaluate(()=>state.monsters[0].hp),4);
  await p.keyboard.press('?');await click('#loadGameButton');
  // Delay the start of a native reader to deterministically deliver its event after R.
  await p.evaluate(()=>{
   window.s3DelayedRead=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(...args){const reader=this;window.s3Late=()=>s3DelayedRead.apply(reader,args);};
  });
  await choose(savedPath);assert.equal(await p.evaluate(()=>state.loadSession.ui.phase),'reading');
  await p.keyboard.press('r');assert.equal(await p.locator('#saveLoadOverlay').isVisible(),false);
  await p.evaluate(()=>{window.s3RestartState=state;window.s3Late();});await p.waitForTimeout(100);
  assert.equal(await p.evaluate(()=>state===s3RestartState&&state.gold===0&&state.loadSession===null),true);
  assert.equal(await p.evaluate(()=>!document.getElementById('gameLayout').inert&&!document.getElementById('helpOverlay').inert),true);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({viewport,mobileTouchEmulation:mobile,protocol:'file:',actualDownloadBytes:fs.statSync(savedPath).size,
   exportPure:true,nativeFileReader:true,oversizeBeforeRead:true,invalidFileReversible:true,validatedPreview:true,
   explicitConfirm:true,sameFileReselection:true,cancelEvent:'controlled DOM cancel event, not native OS observation',
   focusTrapAndReturn:true,liveIntervalFrozen:true,mutingPreserved:true,basicDownloadReloadLoad:true,activeDungeonEncounterRoundTrip:true,launchAndDeathEntry:true,
   delayedNativeReaderAfterRestart:'controlled start delay; late native read ignored',modalFits:true,errors,remote});
  await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,nativeBackgroundObserved:false,
  nativeOsChooserCancellationObserved:false,S4FullPortabilityAndLargeFileAcceptanceComplete:false},null,2)+'\n');console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
