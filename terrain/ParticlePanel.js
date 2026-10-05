import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Minerals,Mixtures,ParticleDefaults,ReadParticles} from './ParticleSimulation.js';
import './ParticlePanel.css';

export function CreateGrainPanel(Host,AcquireSource,AcquireStage){
 Host.innerHTML=`<aside class="Outliner"><div class="PanelHeader">Particle material <span>On rock</span></div><div class="ParticleIntro"><span class="Eyebrow">DISCRETE MINERALS</span><h2>Grain laboratory</h2><p>Millimetre grains. Real crystals.<br>Contact bonds, chemical attack<br>and loose particle motion.</p></div><div id="ParticlePresets"></div><div class="ScopeNote"><b>ATTACHED TO YOUR CLIFF</b><p>The patch is splatted onto an actual source triangle. Orbit to see its thickness, or zoom out to see the rock.</p><p>No stage 6 displacement.<br>No SDF. No noise texture.</p></div><div class="PanelHeader">Mineral palette</div><div id="ParticleLegend"></div><div class="OutlinerBottom ScopeNote"><b>INSPECT A GRAIN</b><p id="ParticleSelection">Click a particle to inspect its mineral, water, oxidation and bond strength.</p></div></aside>
 <section class="Viewport" id="ParticleViewport"><div class="ViewportToolbar"><select id="ParticleChannel" aria-label="Particle display"><option value="mineral">Minerals</option><option value="clay">Clay</option><option value="oxide">Oxidation</option><option value="water">Moisture</option><option value="bond">Cement bonds</option></select><span class="ToolbarSpace"></span><button id="ParticleBefore">Fresh ↔ current</button><button id="ParticleMacro">Macro</button><button id="ParticleContext">On rock</button></div><canvas id="ParticleCanvas"></canvas><div class="ViewCaption"><span class="Eyebrow">PARTICLE WEATHERING · SURFACE COATING</span><h1 id="ParticleTitle">Cemented sandstone</h1><p id="ParticleSource">Select a cliff surface, then splat grains.</p></div><div class="StudyBadge" id="ParticleBadge">Fresh aggregate</div><div class="GrainTransport"><button id="ParticlePlay" class="Primary">Run weathering</button><button id="ParticleStep">+25 cycles</button><button id="ParticleReset">Reset weathering</button><span id="ParticleClock">Cycle 0</span></div><div class="ViewportHint">Drag orbit · Scroll zoom · Click a grain · Chemical cycles are accelerated, not years</div><div class="Failure" id="ParticleError" hidden></div></section>
 <aside class="Inspector"><div class="PanelHeader">Material controls <span>Particle simulation</span></div><div class="InspectorScroll"><div class="ObjectHeader"><div><b>Mineral aggregate</b><small>Random 3D packing, not columns</small></div></div><div id="ParticleControls"></div><details open><summary>Live measurements</summary><div class="ControlGroup"><div class="Metrics" id="ParticleMetrics"></div></div></details><details><summary>What is simulated?</summary><div class="ControlGroup Small"><p>Quartz resists dissolution. Calcite dissolves more quickly in acidic water. Feldspar alters more slowly. Iron-bearing mica and pyrite oxidise; pyrite can acidify neighbouring wet contacts.</p><p>Cement contacts weaken. Unsupported grains detach, collide with sphere proxies and move under gravity/runoff. Clastic quartz grains, faceted crystals and thin mica flakes are instanced 3D particles, not a flat image.</p><p>Qualitative, accelerated rates—not a calibrated geochemical solver. The patch is a porous particle coating, not a watertight solid. Oxide colour and bond damage are modelled, not exact oxide stoichiometry, fluid flow or new crystal growth. Removing grains exposes the original rock; it does not excavate the underlying cliff.</p></div></details></div><div class="InspectorFooter"><button id="ParticleBuild" class="Primary">Splat fresh grains</button><div><button id="ParticleCapture">Sample cliff face</button><button id="GrainSave">Save study</button><button id="GrainLoad">Open</button></div><input id="ParticleFile" type="file" accept=".json" hidden></div></aside>`;
 const find=id=>Host.querySelector('#'+id);
 const Parameters={Specification:{...ParticleDefaults},Active:false,Busy:false,Playing:false,Result:null,Source:null,Error:null,Dirty:false,Replaying:false};
 let worker=null,revision=0,fresh=null,before=false,context=false,requested=true,resize=true,sourceStage=null,history=[];
 const Scene=new THREE.Scene();Scene.background=new THREE.Color('#191c21');
 const Camera=new THREE.PerspectiveCamera(38,1,.00001,200);
 const Renderer=new THREE.WebGLRenderer({canvas:find('ParticleCanvas'),antialias:true,preserveDrawingBuffer:true});Renderer.setPixelRatio(Math.min(devicePixelRatio,2));Renderer.toneMapping=THREE.ACESFilmicToneMapping;Renderer.toneMappingExposure=1;
 Renderer.shadowMap.enabled=true;Renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const Controls=new OrbitControls(Camera,Renderer.domElement);Controls.enableDamping=true;Controls.minDistance=.002;Controls.maxDistance=150;
 const sun=new THREE.DirectionalLight('#ffefd9',3.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00001;sun.shadow.normalBias=.000025;
 Scene.add(sun,sun.target,new THREE.HemisphereLight('#d5e3f5','#30261b',1.25));
 const root=new THREE.Group(),rock=new THREE.Group();Scene.add(root,rock);
 const locator=new THREE.Mesh(new THREE.RingGeometry(.15,.18,48),new THREE.MeshBasicMaterial({color:'#eacb82',side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.8}));locator.visible=false;locator.renderOrder=10;Scene.add(locator);
 const dummy=new THREE.Object3D(),colour=new THREE.Color(),rust=new THREE.Color('#8b3916');
 const rockMaterial=new THREE.MeshStandardMaterial({color:'#776655',roughness:1,flatShading:true});
 // Single capped hexagonal biprism, with triangular crystal terminations.
 const positions=[],indices=[];for(const y of [-.62,.62])for(let j=0;j<6;j++)positions.push(.56*Math.cos(j*Math.PI/3),y,.56*Math.sin(j*Math.PI/3));positions.push(0,-1,0,0,1,0);
 for(let j=0;j<6;j++){const k=(j+1)%6;indices.push(j,j+6,k,k,j+6,k+6,12,j,k,13,k+6,j+6);}
 const quartz=new THREE.BufferGeometry();quartz.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));quartz.setIndex(indices);quartz.computeVertexNormals();
 const shapes=[quartz,new THREE.IcosahedronGeometry(1,0),new THREE.OctahedronGeometry(1,0),new THREE.CylinderGeometry(1,1,.16,6),new THREE.BoxGeometry(1.12,1.12,1.12),new THREE.IcosahedronGeometry(1,1)];
 let batches=[],mapping=[];
 const fields=[['Particle packing',true,[['Seed','Packing seed',0,999999,1,''],['Size','Patch width',.015,.12,.005,'m'],['Radius','Nominal grain radius',.00015,.0015,.00005,'m'],['Thickness','Coating thickness',.0005,.006,.00025,'m'],['Crystals','Euhedral quartz fraction',0,1,.05,''],['Count','Particle ceiling',500,12000,500,''],['Cement','Initial cement bond',.1,1,.05,'']]],['Chemical weathering',true,[['Rain','Rain / water supply',0,1,.05,''],['Acidity','Acid attack',0,1,.05,''],['Oxygen','Oxygen availability',0,1,.05,''],['Drying','Drying rate',0,1,.05,''],['Erosion','Runoff / mechanical erosion',0,1,.05,'']]]];
 find('ParticleControls').innerHTML=fields.map(([title,open,list])=>`<details ${open?'open':''}><summary>${title}</summary><div class="ControlGroup">${list.map(([id,label,min,max,step])=>`<div class="Property"><label class="FieldLabel" for="P${id}">${label}<output id="P${id}Value"></output></label><input id="P${id}" type="${id==='Seed'?'number':'range'}" min="${min}" max="${max}" step="${step}"></div>`).join('')}</div></details>`).join('');
 function controls(){for(const [, ,list]of fields)for(const [id]of list){find('P'+id).value=Parameters.Specification[id];label(id);}}
 function label(id){const v=Parameters.Specification[id];find('P'+id+'Value').textContent=['Size','Radius','Thickness'].includes(id)?`${(v*1000).toFixed(2)} mm`:String(v);}
 for(const [, ,list]of fields)for(const [id]of list)find('P'+id).oninput=()=>{Parameters.Specification[id]=Number(find('P'+id).value);label(id);if(['Seed','Size','Radius','Thickness','Count','Cement','Crystals'].includes(id)){Parameters.Dirty=true;Parameters.Playing=false;}buttons();};
 find('ParticlePresets').innerHTML=Object.keys(Mixtures).map(p=>`<button class="PresetCard" data-rock="${p}"><span><strong>${p}</strong><small>${p==='Sandstone'?'Quartz · cement · iron traces':p==='Granite'?'Quartz crystals · feldspar · mica':'Calcite-rich · acid-sensitive'}</small></span></button>`).join('');
 find('ParticlePresets').querySelectorAll('button').forEach(b=>b.onclick=()=>{Parameters.Specification.Preset=b.dataset.rock;build();});
 find('ParticleLegend').innerHTML=Minerals.map(m=>`<div class="ParticleLegend"><i style="background:${m.colour}"></i>${m.name}<small>Mohs ${m.hardness}</small></div>`).join('');
 function fail(message){Parameters.Error=message;Parameters.Busy=false;Parameters.Playing=false;Parameters.Dirty=true;worker?.terminate();++revision;find('ParticleError').textContent=message;find('ParticleError').hidden=false;buttons();}
 function buttons(){for(const e of Host.querySelectorAll('#ParticleControls input,#ParticlePresets button,#ParticleBuild,#ParticleCapture,#ParticleReset'))e.disabled=Parameters.Replaying;find('GrainSave').disabled=Parameters.Busy||Parameters.Dirty||Parameters.Playing||Parameters.Replaying||!Parameters.Result;find('GrainLoad').disabled=Parameters.Busy||Parameters.Playing||Parameters.Replaying;find('ParticlePlay').textContent=Parameters.Playing?'Pause':'Run weathering';find('ParticlePlay').disabled=Parameters.Dirty||Parameters.Replaying||!Parameters.Result||Parameters.Result.metrics.cycle>=3000;find('ParticleStep').disabled=Parameters.Busy||Parameters.Dirty||Parameters.Replaying||!Parameters.Result||Parameters.Result.metrics.cycle>=3000;find('ParticleBuild').textContent=Parameters.Busy?'Rebuild / restart':'Splat fresh grains';find('ParticleBadge').textContent=Parameters.Dirty?'Packing changed · rebuild required':Parameters.Busy?'Simulating…':before?'Fresh reference':`Live · ${Parameters.Result?.metrics.bound??0} bound grains`;}
 function configureRock(){
  while(rock.children.length){const child=rock.children.pop();child.geometry.dispose();child.parent=null;}
  rockMaterial.color.set({Sandstone:'#776655',Granite:'#6c6d6a',Limestone:'#a39b84'}[Parameters.Specification.Preset]);
  const source=Parameters.Source;if(!source)throw Error('Select and build a cliff face first.');
  const o=new THREE.Vector3(...source.Origin),u=new THREE.Vector3(...source.U),v=new THREE.Vector3(...source.V),n=new THREE.Vector3(...source.Normal);
  for(const mesh of sourceStage.Meshes){const data=[];for(const t of mesh.Triangles)for(const i of t){const p=new THREE.Vector3(...mesh.Vertices[i]).sub(o);data.push(p.dot(u),p.dot(v),p.dot(n));}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));g.computeVertexNormals();const body=new THREE.Mesh(g,rockMaterial);body.receiveShadow=true;body.castShadow=true;rock.add(body);}
 }
 function build(capture=false){
  try{
   Parameters.Playing=false;Parameters.Error=null;find('ParticleError').hidden=true;before=false;history=[];
   if(!Parameters.Source||capture){Parameters.Source=AcquireSource();sourceStage=AcquireStage();}
   if(!sourceStage)throw Error('Build the cliff before splatting grains.');
   const s=ReadParticles(Parameters.Specification);if(Parameters.Source.MaximumSize<.015)throw Error('This face is too small. Select a larger cliff face.');
   s.Size=Math.min(s.Size,Parameters.Source.MaximumSize);Parameters.Specification=s;Parameters.Dirty=false;controls();configureRock();
   worker?.terminate();worker=new Worker(new URL('./ParticleWorker.js',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{if(data.revision!==revision)return;if(data.error){fail(data.error);return;}Parameters.Result=data.result;Parameters.Busy=false;if(data.result.metrics.cycle>=3000)Parameters.Playing=false;
    if(!fresh||data.result.metrics.cycle===0){fresh={...data.result,attributes:data.result.attributes.slice()};createBatches(data.result);frame(false);}
    update();buttons();};worker.onerror=e=>fail(e.message||'Particle worker failed');fresh=null;Parameters.Result=null;
   send('build');
  }catch(e){fail(e.message);}
 }
 function send(action,steps=1){if(Parameters.Busy&&action!=='build')return;if(action==='step'){steps=Math.min(steps,3000-Parameters.Result.metrics.cycle);if(steps<=0){Parameters.Playing=false;buttons();return;}}Parameters.Busy=true;buttons();const source=Parameters.Source;worker.postMessage({revision:++revision,action,steps,spec:Parameters.Specification,gravity:[source.U,source.V,source.Normal].map(axis=>-9.81*axis[1])});}
 function createBatches(result){
  for(const batch of batches){root.remove(batch);batch.dispose();batch.material.dispose();}batches=[];mapping=shapes.map(()=>[]);
  for(let i=0;i<result.attributes.length;i+=14)mapping[result.attributes[i+4]===0&&!result.attributes[i+13]?5:result.attributes[i+4]].push(i/14);
  shapes.forEach((shape,i)=>{const m=Minerals[i===5?0:i];const material=new THREE.MeshStandardMaterial({color:'white',roughness:m.roughness,metalness:i===4?.55:0,flatShading:true});const batch=new THREE.InstancedMesh(shapes[i],material,mapping[i].length);batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.castShadow=true;batch.receiveShadow=true;batch.userData.type=i;root.add(batch);batches.push(batch);});
 }
 function update(){
  const result=before?fresh:Parameters.Result;if(!result)return;const a=result.attributes,channel=find('ParticleChannel').value;
  batches.forEach((batch,type)=>{
   mapping[type].forEach((id,j)=>{const k=id*14,r=a[k+11]>1?0:a[k+3];dummy.position.set(a[k],a[k+1],a[k+2]);dummy.rotation.set(a[k+5],a[k+6],a[k+7]);dummy.scale.set(r*.9,r,r*.9);dummy.updateMatrix();batch.setMatrixAt(j,dummy.matrix);
    colour.set((type===0||type===5)&&Parameters.Specification.Preset==='Granite'?'#c7cbd0':Minerals[type===5?0:type].colour);const oxide=a[k+8],wet=a[k+9],bond=a[k+10];
    if(channel==='clay')colour.set('#b6aea1');else if(channel==='oxide')colour.set('#343940').lerp(rust,Math.min(1,oxide*3));else if(channel==='water')colour.set('#504536').lerp(new THREE.Color('#327fa8'),wet);else if(channel==='bond')colour.set('#982e20').lerp(new THREE.Color('#92bd8b'),bond);else colour.lerp(rust,Math.min(.9,oxide*2.6)).multiplyScalar(1-wet*.2);
    batch.setColorAt(j,colour);
   });batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;batch.computeBoundingSphere();
  });
  const m=Parameters.Result.metrics;find('ParticleMetrics').innerHTML=`<span>Packed / ceiling</span><b>${m.particles} / ${Parameters.Specification.Count}</b><span>Bound / loose</span><b>${m.bound} / ${m.loose}</b><span>Dissolved or escaped grains</span><b>${m.removed}</b><span>Dissolved mineral</span><b>${(m.dissolved*1e6).toFixed(2)} mg</b><span>Escaped debris</span><b>${(m.escaped*1e6).toFixed(2)} mg</b><span>Mineral mass residual</span><b>${(m.massResidual*1e6).toExponential(1)} mg</b><span>Mean oxidation / moisture</span><b>${(m.oxidation*100).toFixed(1)}% / ${(m.wetness*100).toFixed(0)}%</b>`;
  find('ParticleTitle').textContent=Parameters.Specification.Preset+' · mineral grains';find('ParticleSource').textContent=`${(Parameters.Specification.Size*1000).toFixed(0)} mm patch · ${(Parameters.Specification.Radius*2000).toFixed(2)} mm nominal diameter · source stage ${Parameters.Source.Stage}, ${Parameters.Source.BodyName}.`;
  find('ParticleClock').textContent=before?`Fresh reference · live cycle ${m.cycle}`:`Cycle ${m.cycle}${m.cycle>=3000?' · study limit':''}`;requested=true;
 }
 function frame(full=false){
  context=full;locator.visible=full;const size=Parameters.Specification.Size;
  if(full){const box=new THREE.Box3().setFromObject(rock),centre=box.getCenter(new THREE.Vector3()),length=box.getSize(new THREE.Vector3()).length();Controls.target.copy(centre);Camera.position.copy(centre).add(new THREE.Vector3(.2,.15,1).multiplyScalar(length*1.6));Camera.near=.01;}
  else{Controls.target.set(0,0,Parameters.Specification.Thickness*.3);Camera.position.set(size*.25,size*.18,size*1.8);Camera.near=.00001;}
  sun.position.set(-size*1.2,size*.9,size*1.5);sun.target.position.set(0,0,0);Object.assign(sun.shadow.camera,{left:-size,right:size,top:size,bottom:-size,near:.0001,far:Math.max(.2,size*8)});sun.shadow.camera.updateProjectionMatrix();
  find('ParticleBadge').textContent=full?`${(size*1000).toFixed(0)} mm patch · locator enlarged`:'Macro · actual particle dimensions';
  Camera.updateProjectionMatrix();Controls.update();requested=true;
 }
 find('ParticleMacro').onclick=()=>frame(false);find('ParticleContext').onclick=()=>frame(true);find('ParticleBuild').onclick=()=>build();find('ParticleCapture').onclick=()=>build(true);find('ParticleReset').onclick=()=>build();
 find('ParticleBefore').onclick=()=>{if(!fresh)return;before=!before;Parameters.Playing=false;update();buttons();};
 find('ParticlePlay').onclick=()=>{before=false;Parameters.Playing=!Parameters.Playing;update();buttons();};
 find('ParticleStep').onclick=()=>{before=false;Parameters.Playing=false;record();send('step',25);};
 find('ParticleChannel').onchange=()=>{update();};
 function record(){if(!Parameters.Result||Parameters.Result.metrics.cycle>=3000)return;const settings=ReadParticles(Parameters.Specification),cycle=Parameters.Result.metrics.cycle;const last=history.at(-1);if(last?.cycle===cycle)last.settings=settings;else if(!last||JSON.stringify(last.settings)!==JSON.stringify(settings))history.push({cycle,settings});}
 function download(object){const url=URL.createObjectURL(new Blob([JSON.stringify(object)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='particle-weathering.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 find('GrainSave').onclick=()=>{if(!Parameters.Result||Parameters.Dirty||Parameters.Busy){fail('Finish simulation or rebuild before saving.');return;}download({format:'Frontier.ParticleWeathering',version:1,spec:fresh.spec,source:Parameters.Source,cycles:Parameters.Result.metrics.cycle,events:history});};
 // Recipes deliberately require the current source cliff: no arbitrary imported geometry.
 find('GrainLoad').onclick=()=>find('ParticleFile').click();
 find('ParticleFile').onchange=async()=>{
  try{const file=find('ParticleFile').files[0];if(!file)return;if(file.size>1000000)throw Error('Study is too large');const r=JSON.parse(await file.text());
   if(r.format!=='Frontier.ParticleWeathering'||r.version!==1||!Number.isInteger(r.cycles)||r.cycles<0||r.cycles>3000||!Array.isArray(r.events)||r.events.length>3000)throw Error('Invalid particle study');
   if(JSON.stringify(r.source?.Triangle)!==JSON.stringify(AcquireSource().Triangle))throw Error('Select the original source face / cliff recipe before loading this study.');
   let previous=-1;for(const e of r.events){if(!Number.isInteger(e.cycle)||e.cycle<0||e.cycle>=r.cycles||e.cycle<=previous)throw Error('Invalid weathering event order');previous=e.cycle;ReadParticles(e.settings);}
   Parameters.Replaying=true;Parameters.Specification=ReadParticles(r.spec);build(true);await waitReady();const token=worker;
   for(let cycle=0;cycle<r.cycles;){if(worker!==token)throw Error('Replay interrupted');const event=r.events.find(e=>e.cycle===cycle);if(event)Parameters.Specification=ReadParticles(event.settings);const next=r.events.find(e=>e.cycle>cycle)?.cycle??r.cycles;const steps=Math.min(25,r.cycles-cycle,next-cycle);send('step',steps);await waitReady();cycle+=steps;}
   history=r.events;controls();
  }catch(e){fail(e.message);}finally{Parameters.Replaying=false;buttons();find('ParticleFile').value='';}
 };
 async function waitReady(){for(let i=0;Parameters.Busy;i++){if(i>3000)throw Error('Worker timed out');await new Promise(r=>setTimeout(r,20));}if(Parameters.Error)throw Error(Parameters.Error);}
 const ray=new THREE.Raycaster();let down=null;
 Renderer.domElement.onpointerdown=e=>{down=[e.clientX,e.clientY];};Renderer.domElement.onpointerup=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const rect=Renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),Camera);const hit=ray.intersectObjects(batches,false)[0];if(!hit)return;const id=mapping[hit.object.userData.type][hit.instanceId],a=(before?fresh:Parameters.Result).attributes,k=id*14;find('ParticleSelection').textContent=`#${id} · ${Minerals[a[k+4]].name} · diameter ${(a[k+3]*2000).toFixed(2)} mm · oxidation ${(a[k+8]*100).toFixed(1)}% · water ${(a[k+9]*100).toFixed(0)}% · bond ${(a[k+10]*100).toFixed(0)}% · ${a[k+11]===0?'bound':'loose'}`;};
 new ResizeObserver(()=>{resize=true;requested=true;}).observe(find('ParticleViewport'));
 let last=0;
 function animate(now){requestAnimationFrame(animate);if(!Parameters.Active)return;if(resize){const r=find('ParticleViewport').getBoundingClientRect();if(!r.width||!r.height)return;Renderer.setSize(r.width,r.height,false);Camera.aspect=r.width/r.height;Camera.updateProjectionMatrix();resize=false;requested=true;}
  if(Parameters.Playing&&!Parameters.Busy&&!Parameters.Dirty&&now-last>100){last=now;record();send('step',5);}
  if(Controls.update()||requested){Renderer.render(Scene,Camera);requested=false;}
 }
 controls();buttons();requestAnimationFrame(animate);
 return {Parameters,Scene,Renderer,Camera,Controls,Build:build,Frame:frame,Step:(steps=25)=>{record();send('step',steps);},SetActive(active){Parameters.Active=active;Host.hidden=!active;Controls.enabled=active;if(!active)Parameters.Playing=false;else if(!Parameters.Result&&!Parameters.Busy)build(true);resize=true;requested=true;buttons();}};
}
