const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('/opt/homebrew/lib/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[],remote=[];
const shots=path.join(__dirname,'screenshots');fs.mkdirSync(shots,{recursive:true});
try{for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(()=>{const original=setInterval;window.timers=[];window.setInterval=(...args)=>{const id=original(...args);timers.push(id);return id;};});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);await p.keyboard.press('Enter');await p.evaluate(()=>timers.forEach(clearInterval));
 const press=async selector=>mobile?await p.locator(selector).tap():await p.locator(selector).click();
 const snap=()=>p.evaluate(()=>JSON.stringify(state,(key,value)=>['trade','art','motion','audio','lastTick','helpFocus','loadSession'].includes(key)?undefined:value instanceof Set?[...value]:value));
 for(const area of ['town','dungeon']){
  await p.evaluate(area=>{
   if(area==='dungeon')enterFloor(2,false,true);
   state.gold=500;state.player.hp=60;state.player.spells={fireball:true,heal:true};state.spellReadyAt.frostbolt=0;equipItem('weapon',{...ITEM_TABLE[2]});
   state.merchant.stock=[ITEM_TABLE[0],ITEM_TABLE[1],ITEM_TABLE[5],ITEM_TABLE[8],ITEM_TABLE[11],ITEM_TABLE[6]].map((item,i)=>({...item,id:100+i}));
   state.player.x=state.merchant.x+(area==='town'?1:0);state.player.y=state.merchant.y;render(true);document.getElementById('game').focus();
  },area);
  await p.keyboard.press('Space');assert.equal(await p.locator('#tradeOverlay').isVisible(),true);
  const before=await snap();await p.evaluate(()=>window.freezeCheck=setInterval(enemyTick,220));await p.waitForTimeout(520);await p.evaluate(()=>clearInterval(window.freezeCheck));assert.equal(await snap(),before);
  // Native row Enter selects without adding or confirming.
  await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>state.trade.selectedBuy),'stock:1');
  assert.equal(await p.evaluate(()=>state.trade.cart.draft.operations.length),0);assert.match(await p.locator('#tradeBuyDetails').innerText(),/Replaces Bow/);
  await p.keyboard.press('b');assert.equal(await p.evaluate(()=>state.trade.cart.draft.operations.length),1);assert.equal(await snap(),before);
  await press('#undoTrade');assert.equal(await p.evaluate(()=>state.trade.cart.draft.operations.length),0);
  await press('#tradeSellList [data-trade-key="weapon"]');await press('#addTradeSale');
  await press('#tradeBuyList [data-trade-key="stock:1"]');await press('#addTradePurchase');
  await press('#resetTrade');assert.equal(await snap(),before);
  await press('#tradeSellList [data-trade-key="weapon"]');await press('#addTradeSale');
  await press('#tradeBuyList [data-trade-key="stock:3"]');await press('#addTradePurchase');
  await p.locator('#tradeOrder').scrollIntoViewIfNeeded();
  await p.screenshot({path:path.join(shots,`${mobile?'mobile':'desktop'}-${area}.png`)});
  const layout=await p.evaluate(()=>{
   const dialog=document.querySelector('.trade-dialog').getBoundingClientRect(),confirm=document.getElementById('confirmTrade').getBoundingClientRect(),cancel=document.getElementById('cancelTrade').getBoundingClientRect();
   return {fits:dialog.x>=0&&dialog.right<=innerWidth&&dialog.y>=0&&dialog.bottom<=innerHeight,footer:confirm.bottom<=innerHeight&&cancel.bottom<=innerHeight,
    widthOverflow:document.documentElement.scrollWidth>innerWidth,minButton:Math.min(...[...document.querySelectorAll('.trade-actions button')].map(b=>b.getBoundingClientRect().height))};
  });assert.equal(layout.fits&&layout.footer&&!layout.widthOverflow,true);assert.ok(layout.minButton>=44);
  await p.locator('#closeTrade').focus();await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'tradeAudioToggle');
  const audio=await p.evaluate(()=>state.audio.enabled);await p.keyboard.press('m');assert.equal(await p.evaluate(()=>state.audio.enabled),!audio);
  await p.keyboard.press('?');await p.keyboard.press('~');assert.equal(await p.evaluate(()=>state.helpOpen||state.consoleOpen),false);
  await press('#cancelTrade');assert.equal(await snap(),before);assert.equal(await p.evaluate(()=>state.trade),null);
  await p.keyboard.press('x');assert.equal(await p.evaluate(()=>state.trade.mode),'sell');
  await press('#tradeSellList [data-trade-key="weapon"]');await press('#addTradeSale');
  await press('#tradeBuyList [data-trade-key="stock:3"]');await press('#addTradePurchase');
  const expected=await p.evaluate(()=>({gold:state.trade.cart.draft.gold,hp:state.trade.cart.draft.player.hp,maxHp:state.trade.cart.draft.player.maxHp}));
  await p.evaluate(()=>{window.oldConfirm=document.getElementById('confirmTrade').onclick;window.tradeMerchantRef=state.merchant;});
  await press('#confirmTrade');assert.equal(await p.locator('#tradeOverlay').isVisible(),false);
  assert.deepEqual(await p.evaluate(()=>({gold:state.gold,hp:state.player.hp,maxHp:state.player.maxHp})),expected);
  assert.equal(await p.evaluate(()=>state.player.spells.frostbolt&&!state.equipment.weapon),true);assert.equal(await p.evaluate(()=>window.oldConfirm()),false);
  await p.evaluate(area=>{if(area==='town'){enterDungeonFromTown();enterTown();}else{enterFloor(4,false);enterFloor(2,false);}},area);
  assert.equal(await p.evaluate(()=>state.merchant===window.tradeMerchantRef&&state.merchant.stock.length===5&&state.player.spells.frostbolt),true);
  results.push({mobile,area,layout,nativeSelectionUndoResetCancelConfirm:true,freeze520ms:true,revisit:true});
 }
 await ctx.close();
}}finally{await browser.close();}assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({results,errors,remote,note:'Actual file:// Chrome, desktop and touch emulation (tap on mobile), staged merchant/progression setup. Native GR-09 remains unverified; M3 wider integration matrix pending.'},null,2)+'\n');console.log('BROWSER_OK');})().catch(e=>{console.error(e);process.exitCode=1});
