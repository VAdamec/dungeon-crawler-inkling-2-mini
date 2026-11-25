/* Preview only. Pack-derived low walls; cardinal bits N/E/S/W, then NE/SE/SW/NW.
   The entire tile is solid; never place a floor beneath a blocked cell. */
(function () {
  'use strict';
  const offsets = [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8],[1,-1,16],[1,1,32],[-1,1,64],[-1,-1,128]];
  function wallAt(map,x,y) {
    return y<0 || y>=map.length || x<0 || x>=map[0].length || map[y][x]==='#';
  }
  function normalize(mask) {
    for (const [bit,a,b] of [[16,1,2],[32,2,4],[64,4,8],[128,8,1]])
      if (!(mask&a) || !(mask&b)) mask &= ~bit;
    return mask;
  }
  function maskAt(map,x,y) {
    let mask=0;
    for(const [dx,dy,bit] of offsets)if(wallAt(map,x+dx,y+dy))mask|=bit;
    return normalize(mask);
  }
  function plan(raw) {
    const mask=normalize(raw), edges=(~mask)&15;
    const corners=[];
    for(const [bit,a,b,x,y] of [[128,1,8,0,0],[16,1,2,14,0],[32,2,4,14,14],[64,4,8,0,14]])
      if((mask&a)&&(mask&b)&&!(mask&bit))corners.push([x,y]);
    return {mask,edges,corners};
  }
  function paint(c,low,atlas,faceRect,raw) {
    const {edges,corners}=plan(raw);
    c.save();c.beginPath();c.rect(0,0,16,16);c.clip();
    // Opaque backing is sampled from the pack's dark top-plane palette.
    c.fillStyle='#24222b';c.fillRect(0,0,16,16);
    // Actual authored stone top: low-wall atlas cell 9,0, lower half.
    for(let y=0;y<16;y+=8)c.drawImage(low,144,8,16,8,0,y,16,8);
    const coping=(x,y,w,h)=>c.drawImage(low,32,1,w,h,x,y,w,h);
    if(edges&1)coping(0,0,16,2);
    if(edges&8){c.save();c.translate(0,16);c.rotate(-Math.PI/2);coping(0,0,16,2);c.restore();}
    if(edges&2){c.save();c.translate(16,0);c.rotate(Math.PI/2);coping(0,0,16,2);c.restore();}
    if(edges&4){
      // Preserve native pixel aspect: crop eight face rows, never squash a full tile.
      c.drawImage(atlas,faceRect[0],faceRect[1]+8,16,8,0,8,16,8);
      coping(0,6,16,2);
    }
    // Concave joints visibly differ when a diagonal floor meets two wall neighbors.
    for(const [x,y] of corners)coping(x,y,2,2);
    c.restore();
  }
  window.OX72_WALLS={wallAt,normalize,maskAt,plan,paint};
})();
