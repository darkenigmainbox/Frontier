import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {OBJExporter} from 'three/addons/exporters/OBJExporter.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createIcons, Mountain, Download, SlidersHorizontal, ChevronDown, ChevronsUpDown, Shuffle, Layers3, Sparkles, ArrowUpRight, Box, Circle, Network, Grid2x2, Scan, Maximize, Sun, Mouse, Move, ZoomIn, ArrowDownRight} from 'lucide';
import {rng} from './geology.js';
createIcons({icons:{Mountain,Download,SlidersHorizontal,ChevronDown,ChevronsUpDown,Shuffle,Layers3,Sparkles,ArrowUpRight,Box,Circle,Network,Grid2x2,Scan,Maximize,Sun,Mouse,Move,ZoomIn,ArrowDownRight}});
const $=id=>document.getElementById(id), viewport=$('viewport');
let needsRender=true;
const scene=new THREE.Scene();scene.background=new THREE.Color('#30332f');scene.fog=new THREE.FogExp2('#30332f',.012);
const camera=new THREE.PerspectiveCamera(36,1,.1,250);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;viewport.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=7;controls.maxDistance=90;controls.maxPolarAngle=Math.PI*.495;controls.target.set(0,4,0);
const ambient=new THREE.HemisphereLight('#e5e7e3','#615e55',2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff1df',3.7);sun.position.set(-13,22,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:24,bottom:-18,near:.5,far:80});sun.shadow.bias=-.0003;sun.shadow.normalBias=.045;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight('#c5d0d8',.65);fill.position.set(14,7,-14);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:'#42453e',roughness:1,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.18;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(140,70,'#6a745c','#626e54');grid.position.y=-.16;grid.material.transparent=true;grid.material.opacity=.13;scene.add(grid);
const rockGroup=new THREE.Group();scene.add(rockGroup);
const material=new THREE.MeshStandardMaterial({color:'#a99d83',roughness:.95,metalness:0,vertexColors:true});
let viewMode='shaded',tone='#a99d83',generatedConfig=null,busy=false,requestId=0,currentMesh=null;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const ssao=new SSAOPass(scene,camera,1,1);ssao.kernelRadius=1.7;ssao.minDistance=.001;ssao.maxDistance=.09;composer.addPass(ssao);composer.addPass(new OutputPass());
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();composer.setSize(w,h);needsRender=true;}
new ResizeObserver(resize).observe(viewport);
function frame(){const scale=(generatedConfig?.mass??Number($('mass').value))/24;const fit=Math.max(1,.95/camera.aspect);camera.position.set(23*scale*fit,17*scale*fit,36*scale*fit);controls.target.set(0,3.4*scale,0);controls.update();}
renderer.setAnimationLoop(()=>{const changed=controls.update();if(changed||needsRender){composer.render();const width=5*viewport.clientHeight/(2*camera.position.distanceTo(controls.target)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));document.querySelector('.scale-marker span').style.width=`${width}px`;needsRender=false;}});
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function setBusyControls(value){for(const id of ['generate','formation','seed','random','mass','height','fracture','erosion','debris','quality'])$(id).disabled=value;document.querySelectorAll('.preset').forEach(b=>b.disabled=value);}
function getConfig(){return{formation:$('formation').value,seed:Math.trunc(Math.max(0,Math.min(999999,Number($('seed').value)||0))),mass:Number($('mass').value),height:Number($('height').value),fracture:Number($('fracture').value),erosion:Number($('erosion').value),debris:$('debris').checked,quality:$('quality').checked};}
function geometry(data){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));geo.setAttribute('color',new THREE.BufferAttribute(data.colors,3));geo.setIndex(new THREE.BufferAttribute(data.indices,1));geo.computeBoundingSphere();return geo;}
function clearGroup(group){while(group.children.length){const child=group.children[0];group.remove(child);child.geometry?.dispose();}}
function addDebris(group,config,mat){
  if(!config.debris)return;
  const random=rng(config.seed+983),range=(a,b)=>a+random()*(b-a);
  const count=config.preview?35:115;
  for(let i=0;i<count;i++){
    const a=range(0,Math.PI*2),r=range(3,12),x=config.formation==='outcrop'?Math.cos(a)*r:range(-11.8,11.8),z=config.formation==='outcrop'?Math.sin(a)*r:range(2.4,7.2);
    const size=range(.11,.66)*(random()>.86?1.7:1),points=[];
    for(let j=0;j<12;j++){const az=range(0,Math.PI*2),v=range(-1,1),rad=Math.sqrt(1-v*v);points.push(new THREE.Vector3(Math.cos(az)*rad*range(.6,1)*size,v*size*range(.5,1),Math.sin(az)*rad*size));}
    const g=new ConvexGeometry(points);const colors=[];for(let v=0;v<g.attributes.position.count;v++){const c=range(.66,.9);colors.push(c,c,c);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const m=new THREE.Mesh(g,mat);m.position.set(x,size*.25-.08,z);m.rotation.set(range(-.4,.4),range(0,6.28),range(-.3,.3));m.castShadow=true;m.receiveShadow=true;m.name=`talus_${i}`;group.add(m);
  }
}
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const pending=new Map();
worker.onmessage=({data})=>{const handler=pending.get(data.id);if(handler){pending.delete(data.id);data.error?handler.reject(new Error(data.error)):handler.resolve(data);}};
worker.onerror=e=>{pending.forEach(p=>p.reject(new Error(e.message||'Geometry worker failed')));pending.clear();busy=false;$('loading').classList.add('hidden');toast('Could not build geometry. Please reload and try again.');};
function request(config){const id=++requestId;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({id,config});});}
function applyView(){material.wireframe=viewMode==='wire';material.color.set(viewMode==='clay'?'#b8b5a8':tone);material.vertexColors=viewMode!=='clay';material.needsUpdate=true;needsRender=true;}
async function generate({reframe=false}={}){
  if(busy)return;busy=true;const config=getConfig();$('seed').value=config.seed;
  $('loading').classList.remove('hidden');setBusyControls(true);$('export').disabled=true;$('state-text').textContent='Generating';
  try{
    const {mesh,ms}=await request(config);clearGroup(rockGroup);const main=new THREE.Mesh(geometry(mesh),material);main.castShadow=true;main.receiveShadow=true;main.name=`frontier_${config.formation}_seed_${config.seed}`;rockGroup.add(main);addDebris(rockGroup,config,material);rockGroup.scale.setScalar(config.mass/24);currentMesh=main;generatedConfig={...config,tone};applyView();
    let triangles=0,vertices=0;rockGroup.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;vertices+=o.geometry.attributes.position.count;}});
    $('mesh-stats').textContent=`${(triangles/1000).toFixed(1)}k triangles · ${(vertices/1000).toFixed(1)}k vertices`;
    $('generation-time').textContent=`${(ms/1000).toFixed(2)}s GENERATION`;
    $('formation-title').textContent=$('formation').selectedOptions[0].textContent;$('seed-display').textContent=`SEED ${config.seed}`;
    document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('selected',b.dataset.preset===config.formation));
    $('state-text').textContent='Ready';if(reframe)frame();
  }catch(e){console.error(e);toast(`Generation failed: ${e.message}`);$('state-text').textContent='Generation failed';}
  finally{busy=false;setBusyControls(false);$('export').disabled=false;$('loading').classList.add('hidden');}
}
$('generate').onclick=()=>generate();
for(const id of ['debris','quality'])$(id).onchange=()=>{$('state-text').textContent='Parameters changed';};
$('random').onclick=()=>{if(busy)return;$('seed').value=Math.floor(Math.random()*999999);generate();};
$('formation').onchange=()=>{applyPreset($('formation').value);};
const presets={cliff:{height:65,fracture:58,erosion:36},outcrop:{height:50,fracture:48,erosion:45},spire:{height:88,fracture:68,erosion:48},arch:{height:70,fracture:43,erosion:30}};
function updateRange(id){const el=$(id),pct=(el.value-el.min)/(el.max-el.min)*100;el.style.background=`linear-gradient(to right,#aabb8c ${pct}%,#3c4437 ${pct}%)`;$(`${id}-value`).textContent=el.value+(id==='mass'?' m':'%');}
for(const id of ['mass','height','fracture','erosion']){updateRange(id);$(id).addEventListener('input',()=>{updateRange(id);if(!busy)$('state-text').textContent='Parameters changed';});}
function applyPreset(type){if(busy)return;$('formation').value=type;for(const[id,v]of Object.entries(presets[type])){$(id).value=v;updateRange(id);}generate({reframe:true});}
document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{tone=b.dataset.color;document.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('selected',s===b));$('tone-name').textContent=b.dataset.name;$('material-display').textContent=b.dataset.name.toUpperCase();if(generatedConfig)generatedConfig.tone=tone;applyView();});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{viewMode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(s=>s.classList.toggle('active',s===b));applyView();});
$('grid').onclick=()=>{needsRender=true;grid.visible=!grid.visible;$('grid').style.color=grid.visible?'#c3d3a4':'';};
$('reset').onclick=()=>{frame();toast('View reset to formation');};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else viewport.requestFullscreen().catch(()=>toast('Fullscreen is not available in this browser'));};
$('lighting').onchange=()=>{
  needsRender=true;
  const type=$('lighting').value;
  if(type==='overcast'){sun.position.set(-6,25,10);sun.intensity=1.8;sun.color.set('#e0e7ed');ambient.intensity=2.8;fill.intensity=.5;}
  else if(type==='rim'){sun.position.set(-15,10,-8);sun.intensity=5;sun.color.set('#ffdfb1');ambient.intensity=1.3;fill.intensity=1.1;}
  else{sun.position.set(-13,22,15);sun.intensity=3.7;sun.color.set('#fff1df');ambient.intensity=2.1;fill.intensity=.65;}
};
$('export').onclick=()=>{
  if(!currentMesh||busy){toast('Generate a formation first');return;}
  // Export remains a shaded, colored mesh even when inspecting wireframe/clay.
  const exportedMaterial=material.clone();exportedMaterial.color.set(tone);exportedMaterial.wireframe=false;exportedMaterial.vertexColors=true;
  const clone=rockGroup.clone();clone.traverse(o=>{if(o.isMesh)o.material=exportedMaterial;});clone.updateMatrixWorld(true);
  const obj=new OBJExporter().parse(clone);const meta=`# Frontier Formation Lab\n# Seed: ${generatedConfig.seed}\n# Parameters: ${JSON.stringify(generatedConfig)}\n# Units: meters | Y up | vertex colors included\n# Geological study mesh: validate topology and create LODs before production use.\n`;
  const blob=new Blob([meta,obj],{type:'text/plain'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`frontier_${generatedConfig.formation}_${generatedConfig.seed}.obj`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);exportedMaterial.dispose();toast('OBJ exported · meters · Y up');
};
// Render actual generated geometry for the study cards — not decorative photos.
async function thumbnails(){
  const tr=new THREE.WebGLRenderer({antialias:true,alpha:false});tr.setSize(480,190);tr.setPixelRatio(1);tr.toneMapping=THREE.ACESFilmicToneMapping;tr.toneMappingExposure=1.3;
  const ts=new THREE.Scene();ts.background=new THREE.Color('#343e2e');ts.add(new THREE.HemisphereLight('#e1e8d2','#484536',2.5));const light=new THREE.DirectionalLight('#fff1d5',4);light.position.set(-10,15,12);ts.add(light);
  const tc=new THREE.PerspectiveCamera(35,480/190,.1,100);tc.position.set(18,13,32);tc.lookAt(0,4,0);
  const tm=new THREE.MeshStandardMaterial({color:'#b4aa8c',roughness:1,vertexColors:true});
  for(const type of ['cliff','outcrop','spire']){
    try{const {mesh}=await request({...getConfig(),...presets[type],seed:28471,formation:type,preview:true,quality:false});const m=new THREE.Mesh(geometry(mesh),tm);ts.add(m);tr.render(ts,tc);const image=new Image();image.alt=`Procedurally generated ${type} preview`;image.src=tr.domElement.toDataURL('image/webp');$(`art-${type}`).appendChild(image);ts.remove(m);m.geometry.dispose();}catch(e){console.warn('Preview unavailable',e);}
  }
  tm.dispose();tr.dispose();
}
resize();generate({reframe:true}).then(()=>thumbnails());
