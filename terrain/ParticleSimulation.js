// Discrete 3D mineral particles. Accelerated, qualitative chemistry; not geological time.
export const Minerals=[
 {name:'Quartz',colour:'#d8ccad',hardness:7,solubility:.001,iron:0,density:2650,roughness:.28},
 {name:'Feldspar',colour:'#c9a595',hardness:6,solubility:.022,iron:0,density:2560,roughness:.52},
 {name:'Calcite',colour:'#e2d9bb',hardness:3,solubility:.18,iron:0,density:2710,roughness:.48},
 {name:'Biotite mica',colour:'#514d43',hardness:2.5,solubility:.012,iron:.18,density:3000,roughness:.24},
 {name:'Pyrite',colour:'#a99b60',hardness:6,solubility:.006,iron:.46,density:5000,roughness:.22}
];
export const Mixtures={Sandstone:[.68,.16,.1,.035,.025],Granite:[.30,.51,0,.17,.02],Limestone:[.06,.025,.89,.015,.01]};
export const ParticleDefaults={Preset:'Sandstone',Seed:42,Size:.04,Radius:.00045,Thickness:.002,Crystals:.25,Count:5000,Rain:.65,Acidity:.35,Oxygen:.8,Drying:.22,Erosion:.5,Cement:.75};
const limits={Seed:[0,999999],Size:[.015,.12],Radius:[.00015,.0015],Thickness:[.0005,.006],Crystals:[0,1],Count:[500,12000],Rain:[0,1],Acidity:[0,1],Oxygen:[0,1],Drying:[0,1],Erosion:[0,1],Cement:[.1,1]};
export function ReadParticles(input={}){
 const s={...ParticleDefaults};for(const k in s)if(Object.hasOwn(input,k))s[k]=input[k];
 if(!Object.hasOwn(Mixtures,s.Preset))throw Error('Unknown rock mixture');
 for(const [k,[a,b]]of Object.entries(limits)){if(!Number.isFinite(Number(s[k])))throw Error(`${k} must be finite`);s[k]=Math.max(a,Math.min(b,Number(s[k])));}
 s.Seed=Math.round(s.Seed);s.Count=Math.round(s.Count);return s;
}
const clamp=x=>Math.max(0,Math.min(1,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export class ParticleSimulation{
 constructor(input={},gravity=[0,-9.81,0]){
  this.spec=ReadParticles(input);this.gravity=gravity.slice();this.cycle=0;this.dissolved=0;this.escaped=0;this.particles=[];this.events=[];
  let seed=this.spec.Seed>>>0;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const s=this.spec;this.cell=s.Radius*4.8;const bins=new Map();
  const address=p=>[p.x,p.y,p.z].map(v=>Math.floor(v/this.cell));
  const neighbours=p=>{const [x,y,z]=address(p),out=[];for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)out.push(...(bins.get(`${x+a}/${y+b}/${z+c}`)||[]));return out;};
  // Random sequential packing throughout a shallow volume, NOT height-map columns.
  for(let attempt=0;attempt<s.Count*80&&this.particles.length<s.Count;attempt++){
   const radius=s.Radius*(.5+1.1*Math.pow(rnd(),1.8));
   const p={id:this.particles.length,x:(rnd()-.5)*(s.Size-2*radius),y:(rnd()-.5)*(s.Size-2*radius),z:-radius*.25+rnd()*s.Thickness,r:radius,initialR:radius};
   const nearby=neighbours(p);if(nearby.some(i=>dist(p,this.particles[i])<radius+this.particles[i].r))continue;
   let choice=rnd(),type=0;for(;type<4&&choice>Mixtures[s.Preset][type];type++)choice-=Mixtures[s.Preset][type];
   Object.assign(p,{type,crystal:rnd()<s.Crystals,ax:rnd()*Math.PI,ay:rnd()*Math.PI,az:rnd()*Math.PI,vx:0,vy:0,vz:0,water:0,oxide:0,acid:0,bond:s.Cement,mode:0,anchor:p.z-radius<=.00005,contacts:[]});
   p.mass=4/3*Math.PI*radius**3*Minerals[type].density;p.initialMass=p.mass;
   this.particles.push(p);const k=address(p).join('/');if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p.id);
  }
  // Local cement contacts form an irregular 3D support graph, including buried grains.
  for(const p of this.particles)for(const id of neighbours(p))if(id>p.id){const q=this.particles[id];if(dist(p,q)<(p.r+q.r)*1.42){p.contacts.push(id);q.contacts.push(p.id);}}
  this.initialMass=this.particles.reduce((a,p)=>a+p.mass,0);
  this.initialCount=this.particles.length;
  // Unconnected grains settle mechanically; they are not silently glued to the surface.
  this.releaseUnsupported();
 }
 releaseUnsupported(){
  const supported=new Uint8Array(this.particles.length),queue=[];
  for(const p of this.particles)if(p.mode===0&&p.anchor&&p.z-p.r<=.00005&&p.bond>.06){supported[p.id]=1;queue.push(p.id);}
  for(let at=0;at<queue.length;at++){const p=this.particles[queue[at]];for(const id of p.contacts){const q=this.particles[id];if(!supported[id]&&q.mode===0&&Math.min(p.bond,q.bond)>.06&&dist(p,q)<(p.r+q.r)*1.5){supported[id]=1;queue.push(id);}}}
  for(const p of this.particles)if(p.mode===0&&!supported[p.id]){p.mode=1;p.vz=.0003;}
 }
 step(changes={}){
  const s=ReadParticles({...this.spec,...changes});
  for(const k of ['Preset','Seed','Size','Radius','Thickness','Count','Cement','Crystals'])if(s[k]!==this.spec[k])throw Error('Packing changes require a rebuild');
  if(JSON.stringify(s)!==JSON.stringify(this.spec))this.events.push({cycle:this.cycle,settings:s});this.spec=s;
  const dt=.02,water=new Float64Array(this.particles.length),acid=new Float64Array(this.particles.length);
  for(const p of this.particles){
   if(p.mode>1)continue;
   let cover=0,exchange=0,acidExchange=0;
   for(const i of p.contacts){const q=this.particles[i];if(q.mode>1||dist(p,q)>(p.r+q.r)*1.5)continue;exchange+=q.water-p.water;acidExchange+=q.acid-p.acid;if(q.mode===0&&q.z>p.z&&Math.hypot(q.x-p.x,q.y-p.y)<q.r+p.r*.3)cover++;}
   p.exposure=1/(1+cover*2);
   water[p.id]=clamp(p.water+s.Rain*p.exposure*.075-s.Drying*.035+.018*exchange/Math.max(1,p.contacts.length));
   acid[p.id]=clamp(p.acid*.985+.02*acidExchange/Math.max(1,p.contacts.length));
  }
  for(const p of this.particles){
   if(p.mode>1)continue;
   const m=Minerals[p.type];p.water=water[p.id];p.acid=acid[p.id];
   const oxidation=(1-p.oxide)*m.iron*p.water*s.Oxygen*p.exposure*.035;
   p.oxide=clamp(p.oxide+oxidation);
   // Pyrite oxidation can acidify the local film; not all minerals "rust".
   if(p.type===4)p.acid=clamp(p.acid+oxidation*3);
   const activity=p.water*(.15+.85*p.exposure),chemicalAcid=clamp(s.Acidity+p.acid);
   const loss=Math.min(p.mass,p.initialMass*m.solubility*activity*(.08+chemicalAcid*2)*.014);
   p.mass-=loss;this.dissolved+=loss;p.r=p.initialR*Math.cbrt(Math.max(0,p.mass/p.initialMass));
   const old=p.bond;
   p.bond=clamp(p.bond-activity*(.0015+chemicalAcid*.006)-oxidation*.8-s.Erosion*p.water*p.exposure*.001/m.hardness);
   if(p.mode===0&&old>.06&&p.bond<=.06)p.mode=1;
   if(p.mass<p.initialMass*.025){this.dissolved+=p.mass;p.mass=0;p.mode=2;continue;}
  }
  this.releaseUnsupported();
  // Released particles move under projected gravity and runoff. Contacts use sphere proxies.
  const bins=new Map(),key=p=>[p.x,p.y,p.z].map(v=>Math.floor(v/this.cell)).join('/');
  for(const p of this.particles)if(p.mode<2){const k=key(p);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p);}
  for(const p of this.particles){
   if(p.mode!==1)continue;
   // Mechanical time is slowed 100x to make millimetre debris inspectable.
   const h=dt*.01;
   p.vx+=this.gravity[0]*h;p.vy+=(this.gravity[1]-s.Rain*s.Erosion*2)*h;p.vz+=this.gravity[2]*h;
   p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;p.ax+=p.vy*h/Math.max(p.r,1e-6);
   if(p.z<p.r){p.z=p.r;p.vz=Math.abs(p.vz)*.12;p.vx*=.94;p.vy*=.94;}
   const [x,y,z]=[p.x,p.y,p.z].map(v=>Math.floor(v/this.cell));
   for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)for(const q of bins.get(`${x+a}/${y+b}/${z+c}`)||[]){
    if(q.id===p.id||q.mode>1)continue;const d=dist(p,q),r=p.r+q.r;
    if(d>1e-10&&d<r){const push=(r-d)/d;p.x+=(p.x-q.x)*push;p.y+=(p.y-q.y)*push;p.z+=(p.z-q.z)*push;p.vx*=.6;p.vy*=.6;p.vz*=.6;}
   }
   p.z=Math.max(p.r,p.z);
   if(Math.abs(p.x)>s.Size*.6||Math.abs(p.y)>s.Size*.6||p.z>s.Size*.5){this.escaped+=p.mass;p.mass=0;p.mode=3;}
  }
  this.cycle++;return this.metrics();
 }
 metrics(){
  let bound=0,loose=0,mass=0,oxide=0,wet=0;
  for(const p of this.particles){if(p.mode===0)bound++;if(p.mode===1)loose++;mass+=p.mass;oxide+=p.oxide;wet+=p.water;}
  return {cycle:this.cycle,particles:this.particles.length,bound,loose,removed:this.particles.length-bound-loose,solidMass:mass,dissolved:this.dissolved,escaped:this.escaped,initialMass:this.initialMass,massResidual:this.initialMass-mass-this.dissolved-this.escaped,oxidation:oxide/Math.max(1,this.particles.length),wetness:wet/Math.max(1,this.particles.length)};
 }
 snapshot(){const attributes=new Float32Array(this.particles.length*14);for(const p of this.particles)attributes.set([p.x,p.y,p.z,p.r,p.type,p.ax,p.ay,p.az,p.oxide,p.water,p.bond,p.mode,p.initialR,p.crystal?1:0],p.id*14);return {attributes,metrics:this.metrics(),spec:this.spec};}
}
