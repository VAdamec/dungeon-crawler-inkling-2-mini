// Optional preview-only browser check; Playwright is a development tool, not a game dependency.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const{chromium}=require(process.env.OX72_PLAYWRIGHT||'playwright');
if(!process.argv[2])throw Error('Usage: node check-knight-browser.cjs <output-directory>');const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1450,height:1100}}),errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 await p.goto(pathToFileURL(path.join(__dirname,'design-v3.html')).href);await p.waitForFunction(()=>document.querySelector('#checks')?.innerText.includes('Preparation assertions'));
 assert.deepEqual(await p.evaluate(()=>OX72_PREVIEW.knightState()),{direction:'front',frame:1,playing:false});
 for(const direction of ['front','back','left','right']){await p.selectOption('#knightDirection',direction);for(let frame=0;frame<4;frame++){await p.locator('#knightFrame').focus();await p.keyboard.press('Home');for(let i=0;i<frame;i++)await p.keyboard.press('ArrowRight');assert.deepEqual(await p.evaluate(()=>OX72_PREVIEW.knightState()),{direction,frame,playing:false});}}
 await p.selectOption('#knightDirection','front');await p.locator('#knightFrame').focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowRight');
 await p.locator('#knight').screenshot({path:path.join(out,'direction-review.png')});await p.locator('#heroCanvas').screenshot({path:path.join(out,'hero-reference.png')});await p.locator('#beforeCanvas').screenshot({path:path.join(out,'hero-before.png')});
 await p.locator('#knightPlay').click();await p.waitForFunction(()=>OX72_PREVIEW.knightState().playing&&OX72_PREVIEW.knightState().frame!==1);
 await p.locator('#knightPlay').click();const frozen=await p.evaluate(()=>OX72_PREVIEW.knightState());await p.waitForTimeout(350);assert.deepEqual(await p.evaluate(()=>OX72_PREVIEW.knightState()),frozen);
 await p.locator('#knightPlay').click();await p.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));const hidden=await p.evaluate(()=>OX72_PREVIEW.knightState());await p.waitForTimeout(350);assert.deepEqual(await p.evaluate(()=>OX72_PREVIEW.knightState()),hidden);await p.evaluate(()=>delete document.hidden);await p.locator('#knightPlay').click();
 const result={directions:4,framesPerDirection:4,all16PosesSelectable:true,playAdvances:true,pauseFreezes:true,hiddenGuardFreezes:true,defaultIsPaused:true,standardFileProtocol:true,canvasCount:await p.locator('canvas').count(),errors,remote};
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
