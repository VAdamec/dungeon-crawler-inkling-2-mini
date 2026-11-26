const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('/opt/homebrew/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[],remote=[];
try{for(const mobile of [false,true]){
 const ctx=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(()=>{const original=setInterval;window.timers=[];window.setInterval=(...args)=>{const id=original(...args);timers.push(id);return id;};});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);
 await p.keyboard.press('Enter');await p.evaluate(()=>timers.forEach(clearInterval));
 await p.keyboard.press('?');assert.equal(await p.locator('#helpOverlay').isVisible(),true);
 const enabled=await p.evaluate(()=>state.audio.enabled);await p.keyboard.press('m');assert.equal(await p.evaluate(()=>state.audio.enabled),!enabled);
 const result=await p.evaluate(()=>{
  state.gold=500;state.activeTime=37.25;equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;render();
  const source=()=>serializeSaveData(state,{createdAt:'2026-11-26T12:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false});
  const before=source(),hud=document.getElementById('hpText').textContent,refs=[state.town.store,state.town.store.stock,state.player.spells,state.inventory];
  const oldRandom=Math.random,oldLog=log,oldSound=playSound;let cart;
  try{
   Math.random=()=>{throw new Error('preview RNG');};log=()=>{throw new Error('preview log');};playSound=()=>{throw new Error('preview sound');};
   cart=createTradeDraft(state,state.town.store);
   cart=stageTradeAction(cart,{type:'sell',slot:'ring'});
   if(cart.draft.player.hp!==60||cart.draft.player.maxHp!==60)throw new Error('ring draft');
   cart=stageTradeAction(cart,{type:'buy',rowId:'stock:4'}); // The non-first Frostbolt tome.
   if(!cart.draft.player.spells.frostbolt||cart.draft.spellReadyAt.frostbolt!==37.25)throw new Error('spell draft');
   cart=undoTradeAction(cart);cart=resetTradeDraft(cart);
  }finally{Math.random=oldRandom;log=oldLog;playSound=oldSound;}
  return {same:source()===before,hudSame:document.getElementById('hpText').textContent===hud,
   aliases:refs[0]===state.town.store&&refs[1]===state.merchant.stock&&refs[2]===state.player.spells&&refs[3]===state.inventory,
   reset:cart.draft===cart.original&&cart.draft.operations.length===0,stateKeys:Object.keys(state).length,tradeAttached:state.trade!==null};
 });
 assert.deepEqual(result,{same:true,hudSame:true,aliases:true,reset:true,stateKeys:83,tradeAttached:false});
 await p.keyboard.press('Escape');assert.equal(await p.locator('#helpOverlay').isVisible(),false);
 await p.evaluate(()=>{enterFloor(1,false,true);state.player.x=state.upstairs.x;state.player.y=state.upstairs.y;render();});
 await p.keyboard.press('Space');assert.equal(await p.evaluate(()=>state.area),'town');
 await p.evaluate(()=>{state.player.x=state.townGate.x;state.player.y=state.townGate.y;render();});await p.keyboard.press('Space');
 assert.equal(await p.evaluate(()=>state.area==='dungeon'&&state.depth===1),true);
 results.push({mobile,model:result,nativeHelpAudioAndConnectedTownStairs:true});await ctx.close();
}}finally{await b.close();}assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,errors,remote,note:'Actual file:// Chrome; touch emulation is not physical mobile. Model setup/probes are staged. No M2 market UI/commit acceptance or native GR-09 observation.'},null,2)+'\n');console.log('BROWSER_OK');})().catch(e=>{console.error(e);process.exitCode=1});
