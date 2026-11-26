const F=require('node:fs'),P=require('node:path'),V=require('node:vm');
const root=P.resolve(__dirname,'../../..');
const prefix=F.readFileSync(P.join(root,'tests/game.test.cjs'),'utf8').split("\ntest('floors preserve layout",1)[0];
const body=F.readFileSync(__filename,'utf8').split('// BEGIN CHECK\n')[1];
V.runInThisContext('(function(require,__dirname){'+prefix+'\n'+body+'\ncheckSeeded();})',{filename:__filename})(require,P.join(root,'tests'));
// BEGIN CHECK
function checkSeeded(){
 const root=path.resolve(__dirname,'..');
 const original=fs.readFileSync,rows=[];
 function instance(seed,before){fs.readFileSync=function(file,...args){return original.call(this,before&&typeof file==='string'&&file.endsWith('/js/game.js')?'/tmp/dungeon-m2-before/game.js':file,...args);};
  try{return game(seed,true,'town');}finally{fs.readFileSync=original;}}
 const scenarios={town:'',gear:`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;equipItem('weapon',{...ITEM_TABLE[1]});equipItem('ring',null)`,
  spells:`learnSpell('frostbolt');learnSpell('frostbolt');learnSpell('magicBarrier')`,
  travel:`enterFloor(2,false,true);state.inventory.push({name:'Potion',kind:'heal',heal:.499});state.townScrolls=3;useTownScroll();returnThroughTownPortal()`,
  retreat:`enterFloor(2,false,true);state.pause={kind:'retreat',previous:null};confirmRetreat();enterDungeonFromTown()`,
  god:`equipItem('ring',{...ITEM_TABLE[5]});state.player.hp=75;state.godMode=true;state.godModeStats=snapshotPlayerStats();equipItem('ring',null);equipItem('weapon',{...ITEM_TABLE[1]})`};
 for(const seed of [42,713,123456])for(const [name,script]of Object.entries(scenarios)){
  const states=[];for(const before of [true,false]){const g=instance(seed,before);g.run('render=()=>{};playSound=()=>{}');g.run(script);
   states.push(g.json(`({state:JSON.parse(JSON.stringify(state,(key,value)=>['art','audio','motion','lastTick','helpFocus'].includes(key)?undefined:value instanceof Set?[...value]:value)),
    stats:[effectiveStr(),effectiveDex(),effectiveAtk(),effectiveDef()],rng:Array.from({length:8},()=>Math.random())})`));}
  assert.deepEqual(states[1],states[0],name+' seed '+seed);rows.push({seed,name,equal:true});
 }
 fs.writeFileSync(path.join(root,'docs/reviews/2026-11-26-m2-market/seeded-state.json'),JSON.stringify({scenarios:rows,note:'Pre-M2 source backup vs current source; ordinary model semantics and next8 RNG samples. No staged cart is attached to live state.'},null,2)+'\n');console.log('SEEDED_OK '+rows.length);
}
