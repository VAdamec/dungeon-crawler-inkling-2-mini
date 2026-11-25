// Optional external Chrome/Playwright evidence, no game dependency or relaxed file flags.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OX72_PLAYWRIGHT||'playwright');
(async()=>{const out=path.resolve(process.argv[2]||path.join(__dirname,'../../reviews/2026-11-25-graphics-recovery/gr08'));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1800,height:1200}}),errors=[],remote=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 await p.addInitScript(()=>{window.setInterval=()=>0;let id=0;const callbacks=new Map();window.requestAnimationFrame=cb=>{callbacks.set(++id,cb);return id;};window.cancelAnimationFrame=n=>callbacks.delete(n);});
 await p.goto(pathToFileURL(path.join(__dirname,'../../../index.html')).href);await p.keyboard.press('Enter');await p.evaluate(()=>{state.audio.enabled=false;});
 const save=async name=>{const uri=await p.evaluate(()=>{draw();return canvas.toDataURL();});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(uri.split(',')[1],'base64'));};
 const bosses=[];
 for(const depth of [5,10,20,30,40,50,100,3,7]){
  const intro=await p.evaluate(depth=>{enterFloor(depth,false,true);clearBossIntro();clearBossDefeat();const boss=state.boss;state.player.x=boss.x-2;state.player.y=boss.y;updateCamera();revealAroundPlayer();
    startBossIntro(boss);advanceBossIntro(.7);return {depth,kind:state.bossIntro.kind,sprite:state.bossIntro.visual.sprite,hp:boss.hp,gold:state.gold,kills:state.kills};},depth);
  await save(intro.kind+'-intro');
  const defeat=await p.evaluate(()=>{const old=state.bossIntro;skipBossIntro();bossIntroFrame(99999,old);const introStale=state.bossIntro===null;
    if(state.boss.isThroneBoss){state.bossSummonAt=0;summonThroneGuards();}damageMonster(state.boss,state.boss.hp);const reward=JSON.stringify([state.gold,state.kills,state.player.xp,state.bossDefeated]);
    const kind=state.bossDefeat.kind;advanceBossDefeat(kind==='mimic'?.9:kind==='dragon'?1.1:1);return {kind,introStale,guards:state.bossDefeat.guards.length,guardsCollapsed:!state.monsters.some(m=>m.isGuard&&m.hp>0),reward};});
  assert.equal(defeat.introStale,true);assert.equal(defeat.guardsCollapsed,true);await save(intro.kind+'-defeat');
  const lifecycle=await p.evaluate(()=>{const old=state.bossDefeat,elapsed=old.elapsed;state.helpOpen=true;bossDefeatFrame(99999,old);advanceBossDefeat(99);const frozen=old.elapsed===elapsed;state.helpOpen=false;bossDefeatFrame(100000,old);const noCatchup=old.elapsed===elapsed;
    const before=JSON.stringify([state.gold,state.kills,state.player.xp,state.bossDefeated]);skipBossDefeat();bossDefeatFrame(100001,old);const stale=state.bossDefeat===null;return {frozen,noCatchup,stale,rewardsOnce:before===JSON.stringify([state.gold,state.kills,state.player.xp,state.bossDefeated])};});
  for(const pass of Object.values(lifecycle))assert.equal(pass,true);bosses.push({...intro,...defeat,lifecycle});
  // Actual adopted companion rendered after the boss flourish; retain its tiny scale.
  await p.evaluate(()=>{state.companion.x=state.player.x+1;state.companion.y=state.player.y;render();});await save(intro.kind+'-companion');
 }
 assert.equal(new Set(bosses.map(b=>b.kind)).size,9);
 // Final sequence through its real gated interaction, after the final dragon flourish.
 await p.evaluate(()=>{enterFloor(100,false,true);clearBossIntro();damageMonster(state.boss,state.boss.hp);});await p.keyboard.press('Escape');
 await p.evaluate(()=>{state.player.x=state.princess.x;state.player.y=state.princess.y;render();});await p.keyboard.press('Space');assert.equal(await p.evaluate(()=>state.ending.phase),'reveal');
 const reward=await p.evaluate(()=>JSON.stringify([state.gold,state.kills,state.player.xp,state.princess.rescued]));
 const ending=[];let last=0;
 for(const [time,label]of [[.5,'reveal'],[2.7,'run'],[4.3,'heal'],[6.2,'escape'],[11,'sunset'],[14,'done']]){
  const scene=await p.evaluate(dt=>{advanceEnding(dt);return {phase:state.ending.phase,hp:state.ending.dragon.hp,maxHp:state.ending.dragon.maxHp,health:endingScene().dragon.health,overlay:document.getElementById('overlay').style.display};},time-last);last=time;ending.push(scene);await save('ending-'+label);
 }
 assert.deepEqual(ending.map(s=>s.phase),['reveal','heal','heal','escape','sunset','done']);assert.equal(ending[3].hp,ending[3].maxHp);assert.equal(ending[5].health,1);assert.ok(ending.every(s=>s.overlay==='none'));
 assert.equal(await p.evaluate(()=>JSON.stringify([state.gold,state.kills,state.player.xp,state.princess.rescued])),reward);
 const restart=await p.evaluate(()=>{const old=state.ending;restartFromEnding();endingFrame(999999,old);return state.ending===null&&state.area==='town'&&state.depth===1;});assert.equal(restart,true);
 // Exercise real skip from the healing phase, then R while the sunset holds.
 await p.evaluate(()=>{enterFloor(100,false,true);clearBossIntro();damageMonster(state.boss,state.boss.hp);skipBossDefeat();state.player.x=state.princess.x;state.player.y=state.princess.y;pickup();advanceEnding(4.2);});await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>state.ending.elapsed),14);await p.keyboard.press('r');assert.equal(await p.evaluate(()=>state.ending),null);
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);const report={protocol:'normal file:// Chrome; no relaxed flags',controlledAnimationClock:true,bosses,ending,restart,realSkipAndRestart:true,errors,remote};fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({bossKinds:9,companionCaptures:9,endingScenes:6,restart,errors,remote}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
