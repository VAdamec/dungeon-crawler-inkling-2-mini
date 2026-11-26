const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('/opt/homebrew/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const rate of [1,4])for(const count of [10000,65536]){
 const c=await b.newContext({viewport:rate===1?{width:1440,height:1000}:{width:390,height:844},isMobile:rate!==1,hasTouch:rate!==1}),p=await c.newPage();
 await p.addInitScript(()=>{const set=setInterval;window.timers=[];window.setInterval=(...a)=>{const id=set(...a);timers.push(id);return id;};});
 await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);await p.keyboard.press('Enter');await p.evaluate(()=>timers.forEach(clearInterval));
 if(rate!==1){const cdp=await c.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate});}
 await p.evaluate(count=>{state.inventory=Array.from({length:count},()=>({name:'Potion',kind:'heal',heal:.5}));state.gold=1000;
  state.merchant.stock=[...ITEM_TABLE.slice(0,2),ITEM_TABLE[5],ITEM_TABLE[8],ITEM_TABLE[11],ITEM_TABLE[6]].map(it=>({...it}));
  state.player.x=state.merchant.x;state.player.y=state.merchant.y;render();window.gaps=[];let last=performance.now();setInterval(()=>{const n=performance.now();gaps.push(n-last);last=n;},20);},count);
 const times={};times.open=await p.evaluate(()=>{const at=performance.now();openTrade();return performance.now()-at;});
 const actions=[['buy','stock:0'],['buy','stock:1'],['sell','weapon'],['buy','stock:2'],['sell','ring'],['buy','stock:3'],['buy','stock:4'],['buy','stock:5']];
 times.actions=[];for(const action of actions)times.actions.push(await p.evaluate(([type,key])=>{const at=performance.now();if(type==='buy')tradeBuy(key);else tradeSell(key);return performance.now()-at;},action));
 times.confirm=await p.evaluate(()=>{const at=performance.now();if(!confirmTrade())throw new Error('commit failed');return performance.now()-at;});
 await p.waitForTimeout(60);const gap=await p.evaluate(()=>Math.max(...gaps));results.push({rate,count,times,maxHeartbeatGap:gap});await c.close();
}}finally{await b.close();}fs.writeFileSync(process.argv[2]||path.join(__dirname,'performance.json'),JSON.stringify({results,note:'Single sample per Chrome profile; 4x CPU/touch emulation is not physical mobile. 65,536 is the bounded save-format inventory limit; one purchase deliberately exceeds that limit and remains valid in the live run.'},null,2)+'\n');console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exitCode=1});
