export function buildDemoCity(network){
  network.clear();
  // Define water bodies before roads
  network.waterBodies = [
    {
      name:'River Frontier',
      level:1.2,
      polygon: genRiverPoly()
    },
    {
      name:'Lake Serene',
      level:1.0,
      polygon: genCirclePoly(280,-180,70,32)
    },
    {
      name:'Country Pond',
      level:18,
      polygon: genCirclePoly(-310,240,34,20)
    }
  ];

  const N=(x,y)=> network.addNode(x,y);
  // Create key nodes
  // Country North-West hills
  const cn1=N(-480,280), cn2=N(-380,360), cn3=N(-260,300), cn4=N(-320,180), cn5=N(-420,120);
  // Highway entering from north
  const hw1=N(-40,520), hw2=N(-20,380), hw3=N(-10,220), hw4=N(0,80), hw5=N(10,-60), hw6=N(30,-180), hw7=N(80,-360), hw8=N(120,-520);
  // City center grid (approx 400x400)
  const cityCols=[-180,-110,-50,0,60,130,200];
  const cityRows=[ -80, -10, 40, 100, 160];
  const gridNodes=[];
  for(let r=0;r<cityRows.length;r++){
    const row=[];
    for(let c=0;c<cityCols.length;c++){
      row.push(N(cityCols[c]+ (Math.random()*6-3), cityRows[r]+ (Math.random()*6-3)));
    }
    gridNodes.push(row);
  }
  // Suburbs east
  const subNodes=[ N(260,80), N(310,40), N(350,-10), N(280,10), N(300,90) ];
  // Industrial south
  const ind1=N(-120,-220), ind2=N(-20,-240), ind3=N(80,-220), ind4=N(140,-260), ind5=N(-80,-320), ind6=N(40,-360);
  // Offroad east / forest
  const off1=N(380,160), off2=N(420,80), off3=N(440,-40), off4=N(380,-100), off5=N(410,260), off6=N(480,200);

  // Helper to link
  const link=(a,b,type)=> network.addSegment(a.id,b.id,type);

  // Highway spine (6L)
  link(hw1,hw2,'highway'); link(hw2,hw3,'highway'); link(hw3,hw4,'highway'); link(hw4,hw5,'highway');
  link(hw5,hw6,'highway'); link(hw6,hw7,'highway'); link(hw7,hw8,'highway');
  // Ramps connecting highway to city
  link(hw4, gridNodes[2][2], 'ramp'); link(hw5, gridNodes[0][3], 'ramp');
  link(hw3, N(-90,200),'ramp'); link(N(-90,200), gridNodes[4][1],'avenue');

  // Countryside winding rural roads
  link(cn1,cn2,'rural'); link(cn2,cn3,'rural'); link(cn3,cn4,'rural'); link(cn4,cn5,'rural');
  link(cn5, N(-200,80),'rural'); link(cn4, N(-140,160),'rural');
  link(cn1, N(-520,180),'dirt'); // trail to hills
  // Rural to highway connection
  link(cn5, hw3,'rural');

  // City grid
  for(let r=0;r<gridNodes.length;r++){
    for(let c=0;c<gridNodes[r].length-1;c++) link(gridNodes[r][c], gridNodes[r][c+1], c===3?'boulevard':'avenue');
  }
  for(let c=0;c<cityCols.length;c++){
    for(let r=0;r<gridNodes.length-1;r++) link(gridNodes[r][c], gridNodes[r+1][c], r===1?'avenue':'street');
  }
  // Diagonal boulevard with tram (cutting through)
  link(gridNodes[4][0], gridNodes[2][2],'boulevard');
  link(gridNodes[2][2], gridNodes[0][6],'boulevard');

  // Old town cobble pocket (center)
  const oldA=N(-30,70), oldB=N(10,70), oldC=N(10,110), oldD=N(-30,110);
  link(oldA,oldB,'oldtown'); link(oldB,oldC,'oldtown'); link(oldC,oldD,'oldtown'); link(oldD,oldA,'oldtown');
  link(oldA, gridNodes[3][2],'oldtown'); link(oldC, gridNodes[4][3],'oldtown');

  // Suburbs
  link(gridNodes[1][6], subNodes[0],'street'); link(subNodes[0], subNodes[1],'street');
  link(subNodes[1], subNodes[2],'street'); link(subNodes[2], subNodes[3],'street');
  link(subNodes[3], gridNodes[0][5],'avenue');

  // Industrial
  link(ind1,ind2,'industrial'); link(ind2,ind3,'industrial'); link(ind3,ind4,'industrial');
  link(ind1,ind5,'industrial'); link(ind2,ind6,'industrial'); link(ind5,ind6,'industrial');
  link(gridNodes[0][2], ind1,'avenue'); link(gridNodes[0][5], ind3,'avenue');
  link(ind4, hw7,'rural');

  // Offroad / dirt trails
  link(off1,off2,'gravel'); link(off2,off3,'gravel'); link(off3,off4,'dirt'); link(off4, subNodes[2],'dirt');
  link(off1,off5,'dirt'); link(off5,off6,'dirt'); link(off6,off3,'dirt');
  // Forest trail linking countryside to offroad via north bridge over river
  const bridgeN1=N(-80,40), bridgeN2=N(40,20);
  link(N(-140,160), bridgeN1,'rural'); link(bridgeN1, bridgeN2,'rural'); link(bridgeN2, N(120,40),'rural');
  // Bridges: network will auto-detect
  link(N(-160,-40), N(120,-60),'avenue'); // river crossing downtown
  link(N(-40,-220), N(100,-210),'industrial'); // southern bridge
  link(N(260,-40), N(320,-50),'street'); // lake bridge

  // Monorail elevated through city (loop)
  const monoNodes=[ gridNodes[4][1], gridNodes[3][4], gridNodes[1][6], gridNodes[0][4], gridNodes[1][1], gridNodes[4][1] ];
  for(let i=0;i<monoNodes.length-1;i++) network.addRail(monoNodes[i].id, monoNodes[i+1].id, 'monorail');
  // Train cutting through (ground level, trench in city)
  const tr1=N(-520,-30), tr2=N(-300,-28), tr3=N(-140,-32), tr4=N(40,-28), tr5=N(200,-24), tr6=N(520,-20);
  network.addRail(tr1.id,tr2.id,'train'); network.addRail(tr2.id,tr3.id,'train'); network.addRail(tr3.id,tr4.id,'train');
  network.addRail(tr4.id,tr5.id,'train'); network.addRail(tr5.id,tr6.id,'train');

  network.updateDerivedFlags();
  // run a few auto-intersections to clean topology
  for(let i=0;i<6;i++) if(!network.autoIntersect()) break;

  return network;
}

function genCirclePoly(cx,cy,r,pts){
  return Array.from({length:pts},(_,i)=>{ const a=i/pts*Math.PI*2; return {x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r}; });
}
function genRiverPoly(){
  const left=[], right=[];
  for(let x=-600;x<=600;x+=10){
    const y = -35 + Math.sin(x*0.008)*24 + Math.sin(x*0.021)*8;
    const w = 28 + Math.sin(x*0.015)*8;
    left.push({x,y:y-w});
    right.unshift({x,y:y+w});
  }
  return [...left, ...right];
}
