// Web-reference studies revised in revision 7 after visual rejection. These are original, simplified
// polygonal interpretations, not licensed CAD, exact replicas or performance
// models. Dimensions are adjustable modeling defaults, not manufacturer specs.
const b = (points, sipes = [], options = {}) => ({ points, sipes, role: 'lug', heightRatio: 1, ...options });
const map = (part, fn) => ({...part,points:part.points.map(fn),sipes:part.sipes.map(line=>line.map(fn))});
const opposed = (part, sum = 1) => map(part,([x,y])=>[-x,sum-y]);
const shifted = (part, offset) => map(part,([x,y])=>[x,y+offset]);
const reflected = part => {const p=map(part,([x,y])=>[-x,y]);p.points.reverse();return p;};
const lowBar = (points) => b(points,[],{role:'ejector',family:'ejector',heightRatio:.20});

export const OFFROAD_PATTERNS = [
  {
    id:'trail-hybrid',name:'Trail hybrid',code:'RT / 05',terrain:'RUGGED HYBRID',source:5,
    description:'Alternating S-notched and diagonal center pairs, scalloped shoulders and low shoulder-groove bars.',
    repeats:36,depth:15,width:285,sipeWidth:.95,fitBacking:true,
    reference:{title:'Toyo Open Country R/T Trail',url:'https://www.toyotires.com/product/open-country-rt-trail/',
      image:'/references/trail-hybrid.jpg',photoSource:'https://www.mavis.com/tire-brands/toyo/opencountryrttrail/',photoCredit:'Mavis / Toyo product photograph',
      note:'Study of the interlocking center blocks and scalloped shoulders. Two repeat variants approximate the layout; the manufacturer’s variable-pitch construction is not reproduced.'},
  },
  {
    id:'canyon-rt',name:'Canyon R/T',code:'RT / 06',terrain:'RUGGED HYBRID',source:6,
    description:'Broader staggered center blocks in winding channels, stepped shoulders and clipped medial notches.',
    repeats:36,depth:15,width:285,sipeWidth:.95,fitBacking:true,
    reference:{title:'Falken Wildpeak R/T',url:'https://www.falkentire.com/wildpeak/rt',
      image:'/references/canyon-rt.jpg',photoSource:'https://www.wranglerforum.com/threads/new-falken-wildpeak-r-t.2453363/',photoCredit:'Wildpeak R/T owner photo / Wrangler Forum',
      note:'A simplified study of the dense center layout and open, offset shoulders. Internal support construction and sidewall branding are not modeled.'},
  },
  {
    id:'baja-interlock',name:'Baja interlock',code:'AT / 07',terrain:'DENSE ALL-TERRAIN',source:7,
    description:'Angled interlocking center blocks, winding channels, serrated shoulders and zigzag sipes.',
    repeats:44,depth:11,width:275,sipeWidth:.75,fitBacking:true,
    reference:{title:'BFGoodrich All-Terrain T/A KO3',url:'https://www.bfgoodrichtires.com/auto/tire-highlights/all-terrain-t-a-ko3',
      image:'/references/baja-interlock.jpg',photoSource:'https://www.ovrmag.com/vehicle-gear/bfgoodrich-all-terrain-ko3-review-evolution-of-an-icon/965.article',photoCredit:'KO3 photograph / OVR Magazine',
      note:'An interpretation of the compact interlocking footprint. These are shallow polygon-cut sipes, not a reproduction of the manufacturer’s full-depth locking 3D sipe technology.'},
  },
  {
    id:'rock-cleat',name:'Rock cleat M/T',code:'MT / 08',terrain:'OPEN MUD-TERRAIN',source:8,
    description:'Slanted shoulder bars and wider paired center cleats with elbow sipes, open channels and low ejectors.',
    repeats:30,depth:18,width:305,sipeWidth:1.1,fitBacking:true,
    reference:{title:'Maxxis RAZR MT',url:'https://www.maxxis.com/us/tire/razr-mt/',
      image:'/references/rock-cleat.webp',photoSource:'https://www.motortrend.com/reviews/1712-looks-are-deceiving-when-it-comes-to-the-maxxis-razr-mt',photoCredit:'RAZR MT tread photograph / MotorTrend',
      note:'Study of the large sculpted cleats and open shoulder channels. The mesh is a visual approximation and does not reproduce the casing, compound or sidewall construction.'},
  },
];

function trailHybrid(parity) {
  const shoulder = b([
    [-.5,.055],[-.356,.035],[-.299,.115],[-.282,.30],[-.300,.48],[-.282,.57],
    [-.303,.84],[-.367,.90],[-.5,.82],[-.5,.62],[-.480,.60],[-.480,.29],[-.5,.26],
  ],[
    [[-.477,.31],[-.411,.32],[-.359,.36],[-.310,.35]],
    [[-.478,.61],[-.408,.62],[-.344,.69],[-.307,.68]],
  ],{role:'shoulder',family:'shoulder'});
  // Broader offset Z outlines replace the isolated diamond / arrow motifs.
  const center = parity % 2 ? b([
    [-.299,.09],[-.223,.015],[-.105,.16],[-.014,.36],[-.014,.53],[-.082,.58],
    [-.161,.89],[-.243,.76],[-.215,.60],[-.291,.43],
  ],[
    [[-.270,.19],[-.207,.14],[-.135,.26],[-.072,.39]],
    [[-.251,.45],[-.176,.52],[-.179,.67],[-.151,.72]],
  ],{family:'diagonal'}) : b([
    [-.298,.20],[-.127,.025],[.019,.21],[.019,.36],[-.061,.42],[-.043,.56],
    [-.183,.925],[-.288,.73],[-.199,.51],[-.133,.45],[-.174,.31],[-.275,.39],
  ],[
    [[-.258,.21],[-.141,.10],[-.043,.25]],
    [[-.262,.71],[-.197,.78],[-.109,.57]],
  ],{family:'notched-center'});
  const ejector=lowBar([[-.454,.949],[-.351,.971],[-.353,1.014],[-.456,.992]]);
  const narrowShoulder=map(shoulder,([x,y])=>[-.5+(x+.5)*.77,y]);
  return [narrowShoulder,opposed(narrowShoulder,1.27),center,opposed(center),ejector,opposed(ejector,1.27)];
}

function canyonRT(parity) {
  const shoulder=b([
    [-.5,.06],[-.348,.04],[-.300,.14],[-.307,.34],[-.338,.37],[-.337,.45],
    [-.300,.47],[-.305,.82],[-.367,.91],[-.5,.86],[-.5,.67],[-.48,.62],[-.48,.28],[-.5,.24],
  ],[
    [[-.478,.30],[-.420,.29],[-.402,.33],[-.373,.30],[-.336,.33]],
    [[-.477,.61],[-.410,.61],[-.385,.67],[-.328,.66]],
  ],{role:'shoulder',family:'shoulder'});
  const intermediate=b([
    [-.273,.08],[-.128,.12],[-.128,.27],[-.107,.32],[-.120,.67],[-.158,.85],
    [-.267,.68],[-.239,.44],[-.273,.38],
  ],[
    [[-.249,.28],[-.196,.31],[-.180,.28],[-.137,.36]],
    [[-.249,.56],[-.202,.60],[-.173,.56],[-.141,.62]],
  ],{family:'intermediate'});
  let center=b([
    [-.067,.06],[.036,-.025],[.088,.14],[.073,.44],[.049,.49],[.071,.55],
    [.041,.92],[-.062,.91],[-.092,.62],[-.072,.42],[-.095,.30],
  ],[
    [[-.029,.20],[.011,.28],[.025,.25],[.064,.32]],
    [[-.065,.48],[-.012,.58],[.007,.55],[.054,.68]],
  ],{family:'center'});
  if(parity%2)center=reflected(center);
  return [shoulder,opposed(shoulder,1.30),...
    [intermediate,shifted(reflected(intermediate),.46),center].map(b=>windingChannel(b,.025))];
}

function bajaInterlock(parity) {
  const shoulder=b([
    [-.5,.035],[-.377,.035],[-.329,.14],[-.335,.32],[-.354,.34],[-.354,.43],[-.327,.46],
    [-.335,.77],[-.372,.90],[-.5,.84],[-.5,.64],[-.482,.61],[-.482,.29],[-.5,.25],
  ],[
    [[-.484,.27],[-.442,.28],[-.430,.23],[-.414,.29],[-.357,.31]],
    [[-.484,.50],[-.438,.51],[-.427,.46],[-.409,.53],[-.353,.55]],
    [[-.480,.73],[-.440,.73],[-.427,.69],[-.399,.76],[-.367,.77]],
  ],{role:'shoulder',family:'shoulder'});
  const left=b([
    [-.302,.035],[-.194,-.02],[-.111,.13],[-.098,.33],[-.145,.41],[-.130,.53],
    [-.102,.60],[-.111,.77],[-.230,.93],[-.302,.76],[-.263,.53],[-.302,.37],
  ],[
    [[-.284,.23],[-.239,.26],[-.221,.20],[-.185,.27],[-.125,.28]],
    [[-.280,.64],[-.239,.67],[-.220,.62],[-.183,.70],[-.128,.69]],
  ],{family:'interlock'});
  let center=b([
    [-.030,.025],[.072,.18],[.070,.40],[.041,.44],[.044,.54],[.074,.58],
    [.043,.91],[-.065,.80],[-.076,.56],[-.043,.52],[-.049,.41],[-.080,.36],
  ],[
    [[-.045,.23],[-.004,.29],[.013,.25],[.058,.32]],
    [[-.058,.61],[-.013,.67],[.005,.62],[.050,.73]],
  ],{family:'center'});
  if(parity%2)center=reflected(center);
  return [shoulder,opposed(shoulder,1.25),...
    [left,shifted(reflected(left),.39),shifted(center,.18)].map(b=>windingChannel(b,.009))];
}

// Shared periodic warp keeps channel boundaries aligned through pitch seams.
function windingChannel(block, amplitude) {
  const warp=([x,y])=>[x+amplitude*Math.sin(2*Math.PI*y),y];
  const points=[];
  block.points.forEach((a,i)=>{const b=block.points[(i+1)%block.points.length],n=Math.max(1,Math.ceil(Math.abs(b[1]-a[1])/.07));
    for(let j=0;j<n;j++)points.push(warp([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]));});
  return {...block,points,sipes:block.sipes.map(line=>line.map(warp))};
}
function rockCleat() {
  // The photograph has sloping shoulder bars, not hexagonal paddles; center
  // cleats occupy more of the footprint and are only slightly staggered.
  const shoulder=b([
    [-.5,-.10],[-.335,.04],[-.267,.23],[-.267,.51],[-.295,.91],[-.360,.86],
    [-.5,.64],[-.5,.47],[-.483,.45],[-.483,.10],[-.5,.08],
  ],[
    [[-.476,.235],[-.364,.44],[-.317,.50],[-.291,.34]],
  ],{role:'shoulder',family:'shoulder'});
  const center=b([
    [-.234,.225],[-.087,.025],[-.018,.125],[-.018,.55],[-.089,.87],[-.217,.72],[-.239,.47],
  ],[
    [[-.190,.52],[-.137,.30],[-.050,.43]],
  ],{family:'cleat'});
  const outer=lowBar([[-.465,.805],[-.385,.948],[-.389,.983],[-.469,.840]]);
  const inner=lowBar([[-.362,.975],[-.294,1.065],[-.298,1.105],[-.366,1.015]]);
  return [shoulder,opposed(shoulder,1.12),center,opposed(center,1.07),outer,opposed(outer,1.12),shifted(inner,-.045),opposed(shifted(inner,-.045),1.12)];
}

export function offroadBlocks(id, parity=0) {
  if(id==='trail-hybrid')return trailHybrid(parity);
  if(id==='canyon-rt')return canyonRT(parity);
  if(id==='baja-interlock')return bajaInterlock(parity);
  if(id==='rock-cleat')return rockCleat();
  throw new Error(`Unknown pattern: ${id}`);
}
