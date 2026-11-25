/* Development-only read-only extraction. Never loaded by browser or game. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const project=path.resolve(__dirname,'../../..'),testDir=path.join(project,'tests');
const harness=fs.readFileSync(path.join(testDir,'game.test.cjs'),'utf8').split('\ntest(')[0];
const moduleStub={exports:{}};vm.runInNewContext(harness+'\nmodule.exports={game};',{require,module:moduleStub,__dirname:testDir,console});
const {game}=moduleStub.exports,g=game(20261125,true,'town');
const town=g.json(`({map:state.map,props:state.props.map(p=>({...p,bounds:['inn','store','hut'].includes(p.sprite)?townBuildingBounds(p):null})),npcs:state.town.npcs,animals:state.town.animals,landmarks:state.town.landmarks,spawn:state.town.spawn})`);
const scenes=[];
for(const [id,depth,biome,boss]of [['crypt',1,'crypt',null],['cavern',2,'cavern',null],['kitchen',3,'kitchen','cook'],['tavern',7,'tavern','bartender'],['throne',50,'throne','skeletonKing'],['dragon',100,'throne','dragonBoss']]){
 g.run(`enterFloor(${depth},false,true)`);
 const data=g.json(`({map:state.map,rooms:state.rooms,props:state.props,obstacles:state.obstacles,stairs:state.stairs,upstairs:state.upstairs,hazards:state.hazards,biome:state.biome})`);
 const room=boss?data.rooms.find(r=>r.isArena):[...data.rooms].sort((a,b)=>(b.w*b.h)-(a.w*a.h))[0];
 // Room schema is captured unchanged; compute visible composition from actual walkability.
 const center={x:room.cx,y:room.cy};
 const camera={x:Math.max(0,Math.min(96-18,center.x-9)),y:Math.max(0,Math.min(64-12,(boss?room.y-1:center.y-6)))};
 const available=[];for(let y=camera.y+2;y<camera.y+11;y++)for(let x=camera.x+2;x<camera.x+16;x++)if(data.map[y][x]===0)available.push({x,y});
 const taken=[];function place(tx,ty,spacing=2){const sorted=[...available].sort((a,b)=>(Math.abs(a.x-tx)+Math.abs(a.y-ty))-(Math.abs(b.x-tx)+Math.abs(b.y-ty)));const t=sorted.find(p=>taken.every(q=>Math.max(Math.abs(p.x-q.x),Math.abs(p.y-q.y))>=spacing));if(!t)throw Error('Cannot place review actor '+id);taken.push(t);return t;}
 const hero=place(camera.x+4,camera.y+9),companion=place(hero.x+1,hero.y,1);
 const ids={crypt:['skeleton','mage','slime'],cavern:['orc','bat','slime'],kitchen:['cook','orc','wasp'],tavern:['bartender','goblin','healer'],throne:['skeletonKing','skeleton','mage'],dragon:['dragonBoss','healer','skeleton']}[id];
 const actors=ids.map((sprite,i)=>({sprite,...place(camera.x+(i===0?11:i===1?8:14),camera.y+(i===0?6:i===1?4:9)),direction:i===1?'right':'left',boss:i===0&&!!boss}));
 scenes.push({id,depth,biome,sourceBiome:data.biome,camera,room,hero,companion,actors,...data,biome});
}
const data={version:1,seed:20261125,source:'read-only VM of current 1.0.1 generation',note:'Map, room, building, bridge and interaction coordinates are unchanged. Hero/enemy positions on dungeon scenes are explicitly staged for artwork review, not spawn/balance previews.',town,scenes};
const out=path.join(__dirname,'environment-v1');fs.writeFileSync(path.join(out,'fixtures.json'),JSON.stringify(data,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'final-fixtures.js'),'// Read-only generated layout snapshots for standalone art review.\nwindow.FINAL_FIXTURES = '+JSON.stringify(data)+';\n');console.log('Captured town and '+scenes.length+' real layouts');
