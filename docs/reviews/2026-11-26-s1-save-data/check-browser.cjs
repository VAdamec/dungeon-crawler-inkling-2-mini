// Optional S1 pure-API file:// smoke. No download/import/dialog/hydration claim.
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
  await p.addInitScript(()=>{const original=setInterval;window.s1Intervals=[];
   window.setInterval=(...args)=>{const id=original(...args);s1Intervals.push(id);return id;};});
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
  if(mobile)await p.locator('#startGame').tap();else await p.locator('#startGame').click();
  await p.evaluate(()=>s1Intervals.forEach(clearInterval));
  const cases=[];
  for(const area of ['town','dungeon']){
   if(area==='dungeon')await p.evaluate(()=>enterDungeonFromTown());
   // Real Help host; world data/intervals staged for deterministic pure-API comparison.
   await p.keyboard.press('?');assert.equal(await p.locator('#helpOverlay').isVisible(),true);
   const result=await p.evaluate(()=>{
    const ctx={createdAt:'2026-11-26T12:00:00.000Z',hidden:document.hidden,
     tradeOpen:!document.getElementById('tradeOverlay').hidden,companionOpen:!document.getElementById('companionOverlay').hidden};
    const snapshot=()=>JSON.stringify(state,(key,value)=>{
     if(['art','audio','motion','helpFocus'].includes(key))return undefined;
     return value instanceof Set?[...value]:value;
    });
    const before=snapshot(),random=Math.random,sound=playSound;
    try{
     Math.random=()=>{throw new Error('save consumed RNG');};playSound=()=>{throw new Error('save played sound');};
     const text=serializeSaveData(state,ctx),data=parseSaveData(text);
     if(JSON.stringify(data)!==text)throw new Error('round trip differs');
     const detached=validateSaveData(data);detached.run.player.hp=1;
     if(data.run.player.hp!==state.player.hp)throw new Error('detachment failed');
     data.run.gold=-1;let rejected=false;
     try{parseSaveData(JSON.stringify(data));}catch(e){rejected=/Invalid save:/.test(e.message);}
     if(!rejected)throw new Error('invalid gold accepted');
     if(snapshot()!==before)throw new Error('live state changed');
     return {area:state.area,roundTrip:true,detached:true,rejectedAtomically:true,sourceUnchanged:true,noRngOrSound:true,ownHelpAllowed:true};
    }finally{Math.random=random;playSound=sound;}
   });
   cases.push(result);await p.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({viewport,mobileTouchEmulation:mobile,protocol:'file:',cases,errors,remote});await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,scope:'Pure DTO API only. No files, native dialogs, live loading, performance or native background-tab acceptance.'},null,2)+'\n');
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
