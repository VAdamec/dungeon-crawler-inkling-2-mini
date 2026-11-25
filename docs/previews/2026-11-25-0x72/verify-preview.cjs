// Preview-only regression checks. Run with Node; no packages or browser required.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test');
const dir=__dirname,sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'wall-topology.js'),'utf8'),sandbox);
const walls=sandbox.window.OX72_WALLS;
test('256 raw neighborhoods normalize to the 47 valid connected masks',()=>{
 const masks=new Set();for(let mask=0;mask<256;mask++){const n=walls.normalize(mask);masks.add(n);assert.equal(walls.normalize(n),n);assert.equal(n&15,mask&15);}assert.equal(masks.size,47);
});
test('diagonal floors create concave joints only when both adjoining walls connect',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(walls.plan(255).corners)),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(walls.plan(127).corners)),[[0,0]]);
 assert.equal(walls.plan(0).edges,15);assert.equal(walls.plan(255).edges,0);
 assert.equal(walls.normalize(128),0);
});
test('solid map borders and floor obstacles have explicit collision meaning',()=>{
 const map=['###','#~#','###'];assert.equal(walls.wallAt(map,1,1),false);assert.equal(walls.wallAt(map,-1,1),true);
 assert.equal(walls.maskAt(['###','###','###'],1,1),255);
 assert.equal(walls.maskAt(['.##','###','###'],1,1),127);
 assert.equal(walls.wallAt(['.#.'],1,0),true);
});
test('every wall plan draws inside its blocked tile, with balanced transforms',()=>{
 for(let mask=0;mask<256;mask++){
  let matrix=[1,0,0,1,0,0],stack=[],primitives=0;
  const bounds=(x,y,w,h)=>{for(const [px,py]of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){const xx=matrix[0]*px+matrix[2]*py+matrix[4],yy=matrix[1]*px+matrix[3]*py+matrix[5];assert.ok(xx>=-1e-8&&yy>=-1e-8&&xx<=16+1e-8&&yy<=16+1e-8,`mask ${mask} paints outside 16×16`);}primitives++;};
  const ctx={save(){stack.push(matrix.slice());},restore(){matrix=stack.pop();},beginPath(){},rect:bounds,clip(){},fillRect:bounds,
   translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
   rotate(t){const[a,b,c,d]=matrix,co=Math.cos(t),si=Math.sin(t);matrix[0]=a*co+c*si;matrix[1]=b*co+d*si;matrix[2]=c*co-a*si;matrix[3]=d*co-b*si;},
   drawImage(...args){bounds(...args.slice(-4));}};
  walls.paint(ctx,{}, {},[32,16,16,16],mask);assert.equal(stack.length,0);assert.ok(primitives>=4);
 }
});
test('manifest reports frame counts and density units for all runtime roles',()=>{
 const a=JSON.parse(fs.readFileSync(path.join(dir,'runtime-inventory.json'),'utf8'));
 assert.equal(a.assets.length,76);for(const role of a.assets){assert.ok(role.frames>=1);for(let i=0;i<2;i++){assert.equal(role.source[i],role.logical[i]*2);assert.equal(role.world[i],role.logical[i]*2);assert.equal(role.screen[i],role.world[i]*2);}for(const d of role.directions)assert.ok(role.frameCounts[d]>=1);}
 const hero=a.assets.find(a=>a.name==='knight');assert.deepEqual(hero.logical,[16,22]);assert.deepEqual(hero.screen,[64,88]);
 assert.ok(!fs.readFileSync(path.join(dir,'inventory.md'),'utf8').includes('undefined'));
});
test('preview frame bounds and original crops are in range; entry uses local scripts',()=>{
 const data={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'design-v2-data.js'),'utf8'),data);
 assert.equal(Object.keys(data.window.DESIGN_DATA.crops).length,370);
 for(const rect of Object.values(data.window.DESIGN_DATA.crops)){const[x,y,w,h]=rect;assert.ok([x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=512&&y+h<=512);}
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert.ok(html.includes('design-v3.html'));
 const source=fs.readFileSync(path.join(dir,'design-v3.js'),'utf8');assert.ok(!source.includes('BEFORE_PROPS'));assert.ok(!source.includes('BEFORE_WALL_PROPS'));assert.ok(!source.includes('fetch('));
});
