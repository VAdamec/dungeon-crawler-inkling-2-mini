// Development-only final DTO stress measurement using real generation, not a completed campaign.
const fsOuter=require('node:fs'),pathOuter=require('node:path'),vmOuter=require('node:vm');
const root=pathOuter.resolve(__dirname,'../../..');
const prefix=fsOuter.readFileSync(pathOuter.join(root,'tests/game.test.cjs'),'utf8').split("\ntest('floors preserve layout",1)[0];
const body=fsOuter.readFileSync(__filename,'utf8').split('// BEGIN S1 SIZE BODY\n')[1];
vmOuter.runInThisContext('(function(require,__dirname){\n'+prefix+'\n'+body+'\nrunS1Size();\n})',{filename:__filename})(require,pathOuter.join(root,'tests'));
// BEGIN S1 SIZE BODY
function runS1Size(){
const results=[];
for(const seed of [713,42]){
 const g=game(seed,true,'town');
 g.run(`render=()=>{};playSound=()=>{};tone=()=>{};
   state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveTown();`);
 const generatedAt=performance.now();
 for(let depth=1;depth<=100;depth++)g.run(`enterFloor(${depth},false);state.visited=new Set(Array.from({length:W*H},(_,i)=>(i%W)+','+Math.floor(i/W)));saveFloor();`);
 const context=JSON.stringify({createdAt:'2026-11-26T12:00:00.000Z',hidden:false,tradeOpen:false,companionOpen:false});
 const generationMs=performance.now()-generatedAt;
 const before=g.run('JSON.stringify({gold:state.gold,player:state.player,visited:[...state.visited],hazardTime:state.hazardTime,messages:state.messages})');
 g.run(`Math.random=()=>{throw new Error('snapshot RNG');};
   for(const name of ['saveFloor','saveTown','render','log','playSound','equipItem','revealAroundPlayer','newGame','genLevel','genTown','enterFloor','recreateMonsters'])globalThis[name]=()=>{throw new Error('snapshot called '+name);};`);
 const start=performance.now();g.run(`window.dto=captureSaveData(state,${context})`);const captureMs=performance.now()-start;
 let at=performance.now();g.run('window.text=JSON.stringify(window.dto)');const stringifyMs=performance.now()-at;
 const bytes=g.run('saveTextBudget(window.text)'),nodes=g.run('saveStructure(window.dto)');
 at=performance.now();g.run('window.parsed=parseSaveData(window.text)');const parseValidateMs=performance.now()-at;
 assert.equal(g.run('JSON.stringify(window.parsed)===window.text'),true);
 assert.equal(g.run('JSON.stringify({gold:state.gold,player:state.player,visited:[...state.visited],hazardTime:state.hazardTime,messages:state.messages})'),before);
 g.run("state.inventory=Array.from({length:10000},()=>({name:'Potion',kind:'heal',heal:0.5999999999999999}))");
 at=performance.now();g.run(`window.large=serializeSaveData(state,${context})`);const withInventoryMs=performance.now()-at;
 const with10000PotionsBytes=g.run('saveTextBudget(window.large)');
 g.run('window.largeParsed=parseSaveData(window.large)');
 assert.equal(g.run('window.largeParsed.run.inventory.length'),10000);
 assert.ok(bytes<32*2**20);assert.ok(with10000PotionsBytes<32*2**20);assert.ok(nodes<4000000);
 results.push({seed,floors:100,visitedPerMap:6144,bytes,nodes,with10000PotionsBytes,generationMs,captureMs,stringifyMs,parseValidateMs,withInventoryMs,
  roundTripEqual:true,noRngOrActions:true,sourceSemanticSnapshotEqual:true});
}
fs.writeFileSync(path.join(__dirname,'../docs/reviews/2026-11-26-s1-save-data/size.json'),JSON.stringify({results,note:'Real generation plus staged full exploration/content retention and 10,000 potions. Node-only measurements; not absolute maximum, completed campaign or browser/file-dialog acceptance.'},null,2)+'\n');
console.log(JSON.stringify(results));

}
