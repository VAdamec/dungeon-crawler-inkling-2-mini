// Version-only checks, including v1 files saved by 2.0.0. No browser/UI bypass.
const F=require('node:fs'),P=require('node:path'),V=require('node:vm');
const root=P.resolve(__dirname,'../../..');
const prefix=F.readFileSync(P.join(root,'tests/game.test.cjs'),'utf8').split("\ntest('floors preserve layout",1)[0].replace('run: code => vm.runInContext(code, sandbox),','put: (key,value) => sandbox[key]=value, run: code => vm.runInContext(code, sandbox),');
const body=F.readFileSync(__filename,'utf8').split('// BEGIN CHECK\n')[1];
V.runInThisContext('(function(require,__dirname){'+prefix+'\n'+body+'\nrunVersionCheck();})',{filename:__filename})(require,P.join(root,'tests'));
// BEGIN CHECK
function runVersionCheck(){
 const g=game(210,true,'town',true);
 assert.equal(g.run('GAME_VERSION'),'2.1.0');assert.equal(g.elements.launchVersion.textContent,'v2.1.0');
 g.run('render=()=>{};draw=()=>{};playSound=()=>{}');
 const text=g.run("serializeSaveData(state,{createdAt:'2026-11-26T18:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false})");
 const dto=JSON.parse(text);assert.equal(dto.gameVersion,'2.1.0');assert.equal(dto.formatVersion,1);
 // Same v1 format from the pre-release 2.0.0-branded build remains loadable.
 dto.gameVersion='2.0.0';g.put('legacyText',JSON.stringify(dto));
 const exported=g.run("serializeSaveData(hydrateSaveData(parseSaveData(legacyText)),{createdAt:'2026-11-26T18:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false})");
 const after=JSON.parse(exported);assert.equal(after.gameVersion,'2.1.0');assert.equal(after.formatVersion,1);assert.deepEqual(after.run,dto.run);
 fs.writeFileSync(path.join(__dirname,'../docs/reviews/2026-11-26-release-2.1.0/version.json'),JSON.stringify({version:'2.1.0',launchVersion:'v2.1.0',saveFormatVersion:1,exportVersion:'2.1.0',previousBrandedV1FileAccepted:true,exactDurableRun:true,nativeGR09:'unverified',scope:'VM/DOM-stub version and save compatibility checks; no native/browser/manual acceptance claim'},null,2)+'\n');
 console.log('VERSION_210_OK');
}
