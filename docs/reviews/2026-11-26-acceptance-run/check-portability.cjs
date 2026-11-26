const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {chromium}=require('/opt/homebrew/lib/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'../../..'),workspace=fs.mkdtempSync('/tmp/dungeon-s4-portability-');
 const copy=path.join(workspace,'portable game copy');fs.mkdirSync(path.join(copy,'js'),{recursive:true});
 for(const f of ['index.html','style.css','js/art-runtime.js','js/sprites.js','js/game.js'])fs.copyFileSync(path.join(root,f),path.join(copy,f));
 const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'))).rows;
 const contexts=[],pages=[],issues=[],remote=[];
 try{
  for(const [i,gamePath]of [root,copy].entries()){
   const ctx=await chromium.launchPersistentContext(path.join(workspace,'profile-'+i),{channel:'chrome',headless:true,acceptDownloads:true,
    viewport:i?{width:390,height:844}:{width:1440,height:1000},isMobile:!!i,hasTouch:!!i});contexts.push(ctx);
   await ctx.addInitScript(()=>{
    const original=setInterval;window.timers=[];window.setInterval=(...a)=>{const id=original(...a);timers.push(id);return id;};
    for(const key of ['getItem','setItem','removeItem','clear'])Storage.prototype[key]=()=>{throw new Error('Browser storage must not be used');};
    indexedDB.open=()=>{throw new Error('IndexedDB must not be used');};
   });
   const p=ctx.pages()[0];pages.push(p);p.on('pageerror',e=>issues.push(e.message));p.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
   p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
   await p.goto(pathToFileURL(path.join(gamePath,'index.html')).href);await p.evaluate(()=>timers.forEach(clearInterval));
  }
  async function open(p){
   const origin=await p.evaluate(()=>!state.started?'launch':state.gameOver?'death':'help');
   if(origin==='help'&&!await p.evaluate(()=>state.helpOpen))await p.keyboard.press('?');
   await p.locator(origin==='launch'?'#launchLoadGame':origin==='death'?'#deathLoadGame':'#loadGameButton').click();
  }
  async function load(p,file){await open(p);await p.locator('#saveLoadFile').setInputFiles(file);
   await p.waitForFunction(()=>state.loadSession&&state.loadSession.ui.phase==='ready',null,{timeout:120000});
   const started=Date.now();await p.locator('#confirmSaveLoad').click();
   await p.waitForFunction(()=>state.loadSession===null,null,{timeout:120000});return Date.now()-started;
  }
  async function save(p,file){if(!await p.evaluate(()=>state.helpOpen))await p.keyboard.press('?');
   const event=p.waitForEvent('download',{timeout:120000});await p.locator('#saveGameButton').click();await(await event).saveAs(file);}
  async function exact(p,expected){const actual=await p.evaluate(time=>serializeSaveData(state,{createdAt:time,hidden:false,tradeOpen:false,companionOpen:false}),expected.createdAt);
   assert.equal(JSON.stringify(JSON.parse(actual).run),JSON.stringify(expected.run),'durable run differs');
   assert.equal(await p.evaluate(()=>state.audio===window.receivingAudio&&state.art===window.receivingArt),true);
   assert.equal(await p.evaluate(()=>state.audio.enabled),false);
   assert.equal(await p.evaluate(()=>{const t=state.town;return t.store===t.landmarks.store&&t.props.includes(t.landmarks.companionBoard)
    &&state.inn===t.landmarks.inn&&state.townGate===t.landmarks.gate&&Object.values(state.floors).every(f=>f.visited instanceof Set)
    &&(state.area==='town'?state.map===t.map&&state.merchant===t.store:state.map===state.floors[state.depth].map&&(!state.boss||state.monsters.includes(state.boss)));}),true);
  }
  const results=[];
  // Large/max-boundary files also travel through native UI; no unbounded fixture is claimed valid.
  for(const row of rows){
   const expected=JSON.parse(fs.readFileSync(row.path,'utf8'));
   for(const p of pages)await p.evaluate(()=>{window.receivingAudio=state.audio;window.receivingArt=state.art;state.audio.enabled=false;});
   const firstMs=await load(pages[0],row.path);await exact(pages[0],expected);
   const a=path.join(workspace,row.name+'-source-download.json');await save(pages[0],a);
   const downloaded=JSON.parse(fs.readFileSync(a,'utf8'));assert.equal(JSON.stringify(downloaded.run),JSON.stringify(expected.run));
   const secondMs=await load(pages[1],a);await exact(pages[1],downloaded);
   const b=path.join(workspace,row.name+'-target-download.json');await save(pages[1],b);
   await load(pages[0],b);await exact(pages[0],JSON.parse(fs.readFileSync(b,'utf8')));
   // Resume real mechanics after transport, with simulation interval stopped for deterministic assertions.
   await pages[1].keyboard.press('Escape');
   const behavior=await pages[1].evaluate(name=>{
    const gold=state.gold,kills=state.kills,maxHp=state.player.maxHp,mp=state.player.mp,scrolls=state.townScrolls;
    if(name==='scroll'){
     const exit={...state.townExit};returnThroughTownPortal();
     return {returned:state.area==='dungeon'&&state.depth===exit.depth&&state.player.x===exit.x&&state.player.y===exit.y,
      once:!state.townPortalOpen&&state.townExit===null&&state.townScrolls===scrolls,hp:state.player.hp===37};
    }
    if(name==='retreat'){
     const deadline=state.retreatReadyAt;enterDungeonFromTown();
     return {safeFallback:state.area==='dungeon'&&state.map[state.player.y][state.player.x]===0&&state.townExit===null,
      cooldown:state.retreatReadyAt===deadline,mp:state.player.mp===mp};
    }
    if(name==='cross-floor-portal'){
     const exit={...state.townExit};enterTown();returnThroughTownPortal();
     return {oldFloor:state.depth===exit.depth,safeFallback:state.map[state.player.y][state.player.x]===0,once:!state.townPortalOpen&&state.townExit===null};
    }
    if(name==='dungeon'){
     const potions=state.potions.length,stock=state.merchant.stock.length;
     state.player.x=state.stairs.x;state.player.y=state.stairs.y;descendStairs();
     const noReward=state.gold===gold;enterFloor(2,true);
     return {noReward,loot:state.potions.length===potions,stock:state.merchant.stock.length===stock,
      key:state.floorKey.collected,rescue:state.prisoner.rescued,respawn:state.monsters.every(m=>m.hp===m.maxHp),ring:state.player.maxHp===maxHp};
    }
    if(name==='guards'){
     const rows=state.monsters.filter(m=>m.isGuard).length,maxId=Math.max(...state.monsters.map(m=>m.id));
     for(const m of state.monsters)if(m.isGuard)m.hp=0;state.activeTime=state.bossSummonAt;summonThroneGuards();
     return {history:rows===200,newId:Math.max(...state.monsters.map(m=>m.id))>maxId};
    }
    if(name==='final'){
     const ready=state.bossDefeated&&!state.princess.rescued&&state.ending===null;
     enterTown();enterFloor(100,false);
     return {pending:ready,noBoss:state.boss===null,rewards:state.gold===gold&&state.kills===kills};
    }
    return {ring:state.player.maxHp===maxHp,mp:state.player.mp===mp};
   },row.name);
   assert.equal(Object.values(behavior).every(Boolean),true,row.name+': resumed behavior failed');
   results.push({name:row.name,fixtureBytes:row.bytes,sourceDownloadBytes:fs.statSync(a).size,targetDownloadBytes:fs.statSync(b).size,
    sourceCommitMs:firstMs,targetCommitMs:secondMs,semanticEquality:true,aliasesAndReceivingResources:true,bidirectionalProfilesAndPaths:true,behavior});
  }
  // Actual reload at relocated path, then death entry using the portable town file.
  const town=path.join(workspace,'town-source-download.json');await pages[1].reload();await pages[1].evaluate(()=>timers.forEach(clearInterval));
  await load(pages[1],town);await pages[1].evaluate(()=>die());await load(pages[1],town);
  assert.equal(await pages[1].evaluate(()=>state.started&&!state.gameOver&&state.gold===293),true);
  // Native-file rejection at the late floor and prototype-sensitive keys, not just tiny parse errors.
  const late=JSON.parse(fs.readFileSync('/tmp/dungeon-s4-large.json'));late.run.floors[100].map[63][95]=3;
  const lateFile=path.join(workspace,'invalid-last-floor.json');fs.writeFileSync(lateFile,JSON.stringify(late));
  const poison=path.join(workspace,'dangerous-field.json');fs.writeFileSync(poison,'{"__proto__":{"polluted":true},'+fs.readFileSync('/tmp/dungeon-s4-large.json','utf8').slice(1));
  for(const file of [lateFile,poison]){
   const p=pages[1],before=await p.evaluate(()=>JSON.stringify({player:state.player,gold:state.gold,floors:state.floors,messages:state.messages},(k,v)=>v instanceof Set?[...v]:v));
   await open(p);await p.locator('#saveLoadFile').setInputFiles(file);await p.waitForFunction(()=>state.loadSession.ui.phase==='error',null,{timeout:120000});
   assert.equal(await p.locator('#confirmSaveLoad').isDisabled(),true);await p.keyboard.press('Escape');
   assert.equal(await p.evaluate(()=>JSON.stringify({player:state.player,gold:state.gold,floors:state.floors,messages:state.messages},(k,v)=>v instanceof Set?[...v]:v)),before);
   assert.equal(await p.evaluate(()=>({}).polluted),undefined);
  }
  assert.deepEqual(issues,[]);assert.deepEqual(remote,[]);
  fs.writeFileSync(path.join(__dirname,'portability.json'),JSON.stringify({workspace,originalPath:root,copiedPath:copy,
   profiles:'two fresh persistent Chrome profiles; target uses390×844 touch emulation; storage APIs throw if accessed',results,
   relocatedReloadAndDeath:true,largeLateSchemaAndDangerousFieldRejection:true,issues,remote,nativeGR09:'unverified'},null,2)+'\n');
  console.log(JSON.stringify({cases:results.length,profiles:2,paths:2,issues,remote}));
 }finally{for(const c of contexts)await c.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
