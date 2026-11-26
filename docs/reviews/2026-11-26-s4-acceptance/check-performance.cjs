const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {chromium}=require('/opt/homebrew/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const rate of [1,4]){
 const ctx=await b.newContext({viewport:rate===1?{width:1440,height:1000}:{width:390,height:844},isMobile:rate!==1,hasTouch:rate!==1,acceptDownloads:true});
 const p=await ctx.newPage();await p.addInitScript(()=>{const original=setInterval;window._intervals=[];window.setInterval=(...a)=>{const id=original(...a);_intervals.push(id);return id;};});
 await p.goto(pathToFileURL(path.resolve(__dirname,'../../../index.html')).href);await p.evaluate(()=>_intervals.forEach(clearInterval));
 if(rate!==1){const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate});}
 await p.evaluate(()=>{window.lags=[];window.longTasks=[];let last=performance.now();window.beat=setInterval(()=>{const n=performance.now();lags.push(n-last);last=n;},20);
  window.obs=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));obs.observe({type:'longtask',buffered:false});});
 await p.locator('#launchLoadGame').click();const start=Date.now();await p.locator('#saveLoadFile').setInputFiles(process.argv[3]||'/tmp/dungeon-s4-large.json');
 await p.waitForFunction(()=>state.loadSession&&state.loadSession.ui.phase==='ready',null,{timeout:120000});const previewMs=Date.now()-start;
 await p.waitForTimeout(80);const preview=await p.evaluate(()=>({maxHeartbeatGap:Math.max(...lags),longTasks:[...longTasks]}));
 await p.evaluate(()=>{lags.length=0;longTasks.length=0;});const at=Date.now();await p.locator('#confirmSaveLoad').click();
 await p.waitForFunction(()=>!state.loadSession&&state.started,null,{timeout:120000});const commitMs=Date.now()-at;await p.waitForTimeout(80);
 const commit=await p.evaluate(()=>({maxHeartbeatGap:Math.max(...lags),longTasks:[...longTasks]}));
 await p.keyboard.press('?');await p.evaluate(()=>{lags.length=0;longTasks.length=0;});const exportAt=Date.now();const event=p.waitForEvent('download');await p.locator('#saveGameButton').click();const download=await event;
 const out='/tmp/dungeon-s4-perf-'+rate+'.json';await download.saveAs(out);const exportMs=Date.now()-exportAt;await p.waitForTimeout(80);
 const exporting=await p.evaluate(()=>({maxHeartbeatGap:Math.max(...lags),longTasks:[...longTasks]}));
 const dto=JSON.parse(fs.readFileSync(out));assert.equal(Object.keys(dto.run.floors).length,100);assert.equal(dto.run.inventory.length,10000);
 results.push({rate,previewMs,preview,commitMs,commit,exportMs,exporting,bytes:fs.statSync(out).size});await ctx.close();
}}finally{await b.close();}fs.writeFileSync(process.argv[2]||path.join(__dirname,'performance.json'),JSON.stringify({results,note:'20ms heartbeat; 4x CDP CPU slowdown and touch viewport simulate a constrained device, not physical mobile.'},null,2)+'\n');console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exitCode=1});
