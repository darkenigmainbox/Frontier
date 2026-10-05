import {BuildRayTree} from './SurfaceRayTree.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((v,x,k)=>v+x*b[k],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
export const SurfaceDefaults=Object.freeze({Rock:'Sandstone',Resolution:1024,AOSamples:16,AORadius:4,Cycles:80,Rain:.7,Drying:.4,Acidity:.45,Oxygen:.8,Erosion:.45,LayerThickness:2,LayerContrast:.35});
export const RockPalettes={
 Sandstone:{base:[.64,.48,.31],band:[.38,.25,.14],rust:[.53,.22,.075],deposit:[.72,.64,.47],iron:1,solubility:.45},
 Limestone:{base:[.72,.70,.60],band:[.51,.49,.42],rust:[.48,.30,.16],deposit:[.80,.77,.67],iron:.18,solubility:1},
 Basalt:{base:[.27,.29,.30],band:[.16,.18,.19],rust:[.48,.24,.12],deposit:[.48,.47,.41],iron:.7,solubility:.12}
};
export function ReadSurfaceSettings(input={}){
 const s={...SurfaceDefaults,...input};if(!Object.hasOwn(RockPalettes,s.Rock))throw Error('Unknown surface rock type.');
 if(![512,1024,2048].includes(s.Resolution))throw Error('Atlas resolution must be 512, 1024 or 2048.');
 if(![8,16,32].includes(s.AOSamples))throw Error('AO samples must be 8, 16 or 32.');
 for(const [key,min,max]of [['AORadius',.5,12],['Cycles',0,200],['Rain',0,1],['Drying',0,1],['Acidity',0,1],['Oxygen',0,1],['Erosion',0,1],['LayerThickness',.25,8],['LayerContrast',0,1]]){
  if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`${key} must be between ${min} and ${max}.`);
 }
 s.Cycles=Math.round(s.Cycles);return s;
}
export const SurfaceMapLabels={Albedo:'Weathered rock',Fresh:'Fresh rock',Height:'Height · normalized elevation',Slope:'Slope',Curvature:'Curvature · dark concave / light convex',Pointiness:'Pointiness',AO:'Ambient occlusion',Cracks:'Cracks / fractures',Runoff:'Runoff',Wetness:'Wetness',Weathering:'Weathering · R oxide / G loss / B deposits',Splat:'Splat · R rock / G oxide / B deposits / A wet',Roughness:'Roughness'};
export function AnalyseSurface(meshes,settings,progress=()=>{}){
 const s=ReadSurfaceSettings(settings),positions=[],triangles=[],tags=[],meshCounts=[],weld=new Map();
 for(const mesh of meshes){
  const remap=mesh.Vertices.map(p=>{const key=p.map(v=>Math.round(v*1e6)).join(',');if(!weld.has(key)){weld.set(key,positions.length);positions.push(p.slice());}return weld.get(key);});
  meshCounts.push(mesh.Triangles.length);
  mesh.Triangles.forEach((t,i)=>{triangles.push(t.map(v=>remap[v]));tags.push(mesh.Tags?.[i]||'Cliff');});
 }
 if(!triangles.length||triangles.length>150000)throw Error('Surface baking supports 1–150,000 triangles.');
 const count=positions.length,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of positions)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
 const height=Math.max(1e-5,hi[1]-lo[1]);
 const normals=Array.from({length:count},()=>[0,0,0]),areas=new Float64Array(count),ao=new Float64Array(count),sky=new Float64Array(count),point=new Float64Array(count),cavity=new Float64Array(count),crack=new Float64Array(count),neighbours=Array.from({length:count},()=>new Map()),edges=new Map(),faces=[];
 const pad=s.AORadius+1,base=positions.length;
 // Ground occlusion is also queried as triangles, never an analytic/SDF intersection.
 const ground=[[lo[0]-pad,lo[1],lo[2]-pad],[hi[0]+pad,lo[1],lo[2]-pad],[hi[0]+pad,lo[1],hi[2]+pad],[lo[0]-pad,lo[1],hi[2]+pad]];
 const ray=BuildRayTree(positions.concat(ground),triangles.concat([[base,base+2,base+1],[base,base+3,base+2]])),eps=Math.max(...hi.map((v,k)=>v-lo[k]))*1e-5;
 progress('Casting geometry AO and rain visibility');
 triangles.forEach((t,id)=>{
  const [a,b,c]=t.map(i=>positions[i]),raw=cross(sub(b,a),sub(c,a)),area=Math.hypot(...raw)*.5,n=unit(raw),centre=a.map((v,k)=>(v+b[k]+c[k])/3),origin=centre.map((v,k)=>v+n[k]*eps);
  const u=unit(cross(Math.abs(n[1])>.9?[1,0,0]:[0,1,0],n)),v=cross(n,u);let occlusion=0;
  for(let j=0;j<s.AOSamples;j++){
   const z=Math.sqrt(1-(j+.5)/s.AOSamples),radius=Math.sqrt(1-z*z),angle=j*Math.PI*(3-Math.sqrt(5));
   const direction=n.map((x,k)=>x*z+u[k]*radius*Math.cos(angle)+v[k]*radius*Math.sin(angle));
   const distance=ray(origin,direction,s.AORadius,id);
   occlusion+=1-distance/s.AORadius;
  }
  const visibility=1-clamp(occlusion/s.AOSamples),rain=ray(origin,[0,1,0],height*3,id)>=height*3?1:0;
  const fracture=tags[id]==='Crack'?1:['Fracture','Joint','Termination','Bedding'].includes(tags[id])?.65:tags[id]==='Spall'?.3:0;
  faces.push({n,ao:visibility,fracture});
  for(const i of t){areas[i]+=area;for(let k=0;k<3;k++)normals[i][k]+=n[k]*area;ao[i]+=visibility*area;sky[i]+=rain*Math.max(0,n[1])*area;crack[i]=Math.max(crack[i],fracture);}
  for(let j=0;j<3;j++){
   const a=t[j],b=t[(j+1)%3],length=Math.hypot(...sub(positions[a],positions[b]));neighbours[a].set(b,length);neighbours[b].set(a,length);
   const key=a<b?`${a}:${b}`:`${b}:${a}`;
   if(edges.has(key)){
    const e=edges.get(key),angle=Math.atan2(dot(cross(e.n,n),unit(sub(positions[e.b],positions[e.a]))),clamp(dot(e.n,n),-1,1))/Math.PI;
    for(const i of [a,b]){point[i]=Math.max(point[i],angle);cavity[i]=Math.max(cavity[i],-angle);}
   }else edges.set(key,{n,a,b});
  }
 });
 for(let i=0;i<count;i++){normals[i]=unit(normals[i]);ao[i]/=areas[i]||1;sky[i]/=areas[i]||1;}
 // Distance-decayed feature spread on the actual surface graph, not spatial noise.
 function spread(source){let values=source;for(let pass=0;pass<3;pass++){const next=values.slice();for(let i=0;i<count;i++)for(const [j,length]of neighbours[i])next[i]=Math.max(next[i],values[j]*Math.exp(-length/Math.max(.25,height*.04)));values=next;}return values;}
 return {positions,triangles,faces,meshCounts,normals,neighbours,ao,sky,point:spread(point),cavity:spread(cavity),crack:spread(crack),lo,hi,height};
}
export function WeatherSurface(surface,settings){
 const s=ReadSurfaceSettings(settings),{positions,neighbours,normals,sky,cavity,crack,ao}=surface,n=positions.length,rock=RockPalettes[s.Rock];
 const water=new Float64Array(n),oxide=new Float64Array(n),loss=new Float64Array(n),deposits=new Float64Array(n),runoff=new Float64Array(n),next=new Float64Array(n);
 const downstream=neighbours.map((list,i)=>{const out=[];let sum=0;for(const [j,d]of list){const drop=positions[i][1]-positions[j][1];if(drop>1e-6){const weight=drop/(d||1);out.push([j,weight]);sum+=weight;}}return out.map(([j,w])=>[j,w/sum]);});
 let supplied=0,evaporated=0,escaped=0;
 for(let cycle=0;cycle<s.Cycles;cycle++){
  for(let i=0;i<n;i++){
   const rain=s.Rain*.055*sky[i];water[i]+=rain;supplied+=rain;
   const evaporation=water[i]*(.015+s.Drying*.07*ao[i]);water[i]-=evaporation;evaporated+=evaporation;next[i]=water[i];
  }
  for(let i=0;i<n;i++){
   const flow=water[i]*(.22+s.Erosion*.3)*(1-clamp(cavity[i]+crack[i]*.3,0,.8));
   if(downstream[i].length){next[i]-=flow;runoff[i]+=flow;for(const [j,w]of downstream[i])next[j]+=flow*w;}
   // Conservative lateral film exchange lets rainfall on flat shelves reach an edge.
   for(const [j]of neighbours[i])if(j>i&&Math.abs(positions[i][1]-positions[j][1])<1e-6){const transfer=(water[i]-water[j])*.12/Math.max(neighbours[i].size,neighbours[j].size);next[i]-=transfer;next[j]+=transfer;}
  }
  for(let i=0;i<n;i++){
   if(next[i]>1){escaped+=next[i]-1;next[i]=1;}water[i]=Math.max(0,next[i]);
   const layer=1-s.LayerContrast*.35+s.LayerContrast*.35*Math.sin((positions[i][1]-surface.lo[1])*Math.PI*2/s.LayerThickness)**2;
   oxide[i]=clamp(oxide[i]+water[i]*s.Oxygen*rock.iron*.026*(1-oxide[i]));
   loss[i]=clamp(loss[i]+water[i]*s.Acidity*rock.solubility*.008*layer*(1-loss[i]));
   deposits[i]=clamp(deposits[i]+water[i]*s.Erosion*.012*(cavity[i]+crack[i]*.35+Math.max(0,normals[i][1])*.08)*(1-deposits[i]));
  }
 }
 const remaining=water.reduce((a,b)=>a+b,0),maxRunoff=runoff.reduce((a,b)=>Math.max(a,b),1e-8);
 return {water,oxide,loss,deposits,runoff:runoff.map(v=>v/maxRunoff),ledger:{supplied,evaporated,escaped,remaining,residual:supplied-evaporated-escaped-remaining}};
}
export function BakeSurface(meshes,settings,progress=()=>{}){
 const started=performance.now(),s=ReadSurfaceSettings(settings),surface=AnalyseSurface(meshes,s,progress);
 progress('Simulating water flow, oxidation and surface loss');const weather=WeatherSurface(surface,s),rock=RockPalettes[s.Rock];
 progress('Rasterising UV material and control maps');
 const size=s.Resolution,columns=Math.ceil(Math.sqrt(surface.triangles.length)),cell=Math.floor(size/columns);
 if(cell<4)throw Error('Too many triangles for this atlas. Increase atlas resolution.');
 const maps=Object.fromEntries(Object.keys(SurfaceMapLabels).map(k=>[k,new Uint8Array(size*size*4)])),uvs=surface.meshCounts.map(n=>new Float32Array(n*6));
 const sample=(array,t,w)=>array[t[0]]*w[0]+array[t[1]]*w[1]+array[t[2]]*w[2];
 function put(name,index,r,g=r,b=r,a=1){const data=maps[name];data[index]=Math.round(clamp(r)*255);data[index+1]=Math.round(clamp(g)*255);data[index+2]=Math.round(clamp(b)*255);data[index+3]=Math.round(clamp(a)*255);}
 let mi=0,local=0;
 surface.triangles.forEach((t,id)=>{
  while(local>=surface.meshCounts[mi]){local=0;mi++;}
  const x0=(id%columns)*cell,y0=Math.floor(id/columns)*cell,pad=1.5,span=cell-pad*2;
  uvs[mi].set([(x0+pad)/size,(y0+pad)/size,(x0+pad+span)/size,(y0+pad)/size,(x0+pad)/size,(y0+pad+span)/size],local++*6);
  for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
   let b=clamp((x+.5-pad)/span),c=clamp((y+.5-pad)/span);if(b+c>1){const sum=b+c;b/=sum;c/=sum;}const w=[1-b-c,b,c];
   const index=((y0+y)*size+x0+x)*4,height=surface.positions[t[0]][1]*w[0]+surface.positions[t[1]][1]*w[1]+surface.positions[t[2]][1]*w[2];
   const h=(height-surface.lo[1])/surface.height,slope=Math.acos(clamp(Math.abs(surface.faces[id].n[1])))/(Math.PI*.5);
   const point=clamp(sample(surface.point,t,w)*2),cavity=clamp(sample(surface.cavity,t,w)*2),ao=sample(surface.ao,t,w),fracture=Math.max(surface.faces[id].fracture,sample(surface.crack,t,w));
   const water=sample(weather.water,t,w),oxide=sample(weather.oxide,t,w),loss=sample(weather.loss,t,w),deposit=sample(weather.deposits,t,w);
   const band=(.5+.5*Math.cos((height-surface.lo[1])*Math.PI*2/s.LayerThickness))*s.LayerContrast;
   const fresh=rock.base.map((v,k)=>v*(1-band)+rock.band[k]*band);
   const edgeWear=point*clamp((oxide+loss)*2);
   const weights=[1,oxide*.85*(1-edgeWear*.65),deposit*.9*(.65+cavity*.35),water*.45],total=weights.reduce((a,b)=>a+b,0);for(let i=0;i<4;i++)weights[i]/=total;
   const exposed=fresh.map(v=>clamp(v+(1-v)*(loss*.3+edgeWear*.18)));
   const colour=exposed.map((v,k)=>v*weights[0]+rock.rust[k]*weights[1]+rock.deposit[k]*weights[2]+v*.42*weights[3]);
   put('Albedo',index,...colour);put('Fresh',index,...fresh);put('Roughness',index,clamp(.94-water*.25+deposit*.06,.55,1));
   put('Height',index,h);put('Slope',index,slope);put('Curvature',index,.5+(point-cavity)*.5);put('Pointiness',index,point);put('AO',index,ao);put('Cracks',index,fracture);put('Runoff',index,sample(weather.runoff,t,w));put('Wetness',index,water);put('Weathering',index,oxide,loss,deposit);put('Splat',index,...weights);
  }
 });
 return {size,maps,uvs,settings:s,stats:{triangles:surface.triangles.length,vertices:surface.positions.length,cycles:s.Cycles,milliseconds:performance.now()-started,mapBytes:Object.values(maps).reduce((n,a)=>n+a.byteLength,0),waterLedger:weather.ledger},legend:SurfaceMapLabels};
}
