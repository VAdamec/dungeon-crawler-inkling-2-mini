// Pure Node/VM checks only; no browser/OS chooser/audio or responsiveness claim.
const F=require('node:fs'),P=require('node:path'),V=require('node:vm');
const root=P.resolve(__dirname,'../../..');
const prefix=F.readFileSync(P.join(root,'tests/game.test.cjs'),'utf8').split("\ntest('floors preserve layout",1)[0].replace('run: code => vm.runInContext(code, sandbox),','put: (key,value) => sandbox[key]=value, run: code => vm.runInContext(code, sandbox),');
const body=F.readFileSync(__filename,'utf8').split('// BEGIN MODEL\n')[1];
V.runInThisContext('(function(require,__dirname){'+prefix+'\n'+body+'\nrunModel();})',{filename:__filename})(require,P.join(root,'tests'));
// BEGIN MODEL
function runModel(){
 const g=game(20261126,true,'town');g.run('render=()=>{};draw=()=>{};playSound=()=>{};tone=()=>{}');
 const rows=[];
 for(const name of ['large','max-bytes']){
  const text=fs.readFileSync('/tmp/dungeon-s4-'+name+'.json','utf8');g.put('auditText',text);
  let at=performance.now();g.run('window.auditDto=parseSaveData(auditText)');const parseAndValidateMs=performance.now()-at;
  at=performance.now();g.run('window.auditCandidate=hydrateSaveData(window.auditDto)');const hydrateMs=performance.now()-at;
  at=performance.now();const exported=g.run("serializeSaveData(window.auditCandidate,{createdAt:window.auditDto.createdAt,hidden:false,tradeOpen:false,companionOpen:false})");const serializeAndValidateMs=performance.now()-at;
  assert.deepEqual(JSON.parse(exported).run,JSON.parse(text).run);
  rows.push({name,bytes:Buffer.byteLength(text),parseAndValidateMs,hydrateMs,serializeAndValidateMs,exact:true});
 }
 // Rejections leave the existing live game untouched; no parse/hydrate result is committed.
 const before=g.run("serializeSaveData(state,{createdAt:'2026-11-26T18:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false})");
 const bad=['{','{"format":"unsupported","version":999}',fs.readFileSync('/tmp/dungeon-s4-town.json','utf8').replace('"formatVersion":1','"formatVersion":999')];
 const rejection=[];
 for(const [i,text] of bad.entries()){
  g.put('auditText',text);assert.throws(()=>g.run('parseSaveData(auditText)'));rejection.push({case:i,rejected:true});
 }
 g.put('auditText',' '.repeat(32*2**20+1));assert.throws(()=>g.run('parseSaveData(auditText)'));rejection.push({case:'32MiB+1',rejected:true});
 const after=g.run("serializeSaveData(state,{createdAt:'2026-11-26T18:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false})");assert.equal(after,before);
 fs.writeFileSync(path.join(__dirname,'../docs/reviews/2026-11-26-acceptance-run/save-model.json'),JSON.stringify({rows,rejection,liveStateUnchanged:true,scope:'One synchronous Node/VM sample each. These times exclude browser cooperative scheduling, file-picker/download/paint, audio and native visibility. Not browser/physical-mobile performance or FPS.'},null,2)+'\n');
 console.log('SAVE_MODEL_OK');
}
