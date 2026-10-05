import * as THREE from 'three';
import {ReadSurfaceSettings,SurfaceDefaults,SurfaceMapLabels,RockPalettes} from './SurfaceBake.js';
import {EncodePNG,ZipFiles,SurfaceOBJ} from './SurfaceExport.js';
import './SurfacePanel.css';
export function CreateSurfacePanel({host,bodies,getState,setMode,render,worldPoint,recipe}){
 host.innerHTML=`<details id="SurfacePanel" open><summary>Surface maps · no noise</summary><p class="SurfaceNote">Mesh-derived material, not a photo overlay. Curvature, real cuts and ray-traced AO guide surface weathering.</p>
 <div class="SurfaceRow"><label>Rock<select id="SurfaceRock">${Object.keys(RockPalettes).map(k=>`<option>${k}</option>`).join('')}</select></label><label>Atlas<select id="SurfaceResolution">${[512,1024,2048].map(v=>`<option value="${v}">${v}²</option>`).join('')}</select></label></div>
 <label class="FieldLabel" for="SurfaceView">Material / control map</label><select id="SurfaceView">${Object.entries(SurfaceMapLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}<option value="AlbedoRaw">Albedo · unlit</option></select>
 <div class="SurfaceActions"><button id="SurfaceBake">Bake surface</button><button id="SurfaceBefore">Fresh ↔ aged</button><button id="SurfaceExport">Export pack</button></div>
 <progress id="SurfaceProgress" hidden></progress><p id="SurfaceStatus" class="SurfaceState" aria-live="polite">Waiting for geometry…</p>
 <details><summary>Weathering and bake settings</summary><div id="SurfaceControls"></div><label class="FieldLabel" for="SurfaceSamples">AO visibility rays</label><select id="SurfaceSamples"><option>8</option><option>16</option><option>32</option></select></details>
 <p class="SurfaceNote">Cycles advance a surface-water model: downhill runoff, drying, oxide staining, dissolution and trapping. Colour/roughness only—no mesh erosion or grain changes. Baked in formation-local coordinates. Stages 2–5 add actual fracture/fissure masks.</p></details>`;
 const el=id=>host.querySelector('#'+id),state={Settings:{...SurfaceDefaults},Result:null,Busy:false,Error:null,View:'Albedo',Source:null,Revision:0,ReadyRevision:0,Pending:false};
 let worker=null,timer=null,stage=null,valid=false,exporting=false;const textures=new Map();
 const material=new THREE.MeshStandardMaterial({roughness:1,metalness:0,flatShading:true,aoMapIntensity:.8,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 const debug=new THREE.MeshBasicMaterial({toneMapped:false});
 const fields=[['Cycles','Weathering cycles',0,200,10],['Rain','Rain supply',0,1,.05],['Drying','Drying',0,1,.05],['Acidity','Acid attack',0,1,.05],['Oxygen','Oxygen',0,1,.05],['Erosion','Runoff / trapping',0,1,.05],['LayerThickness','Ordered layer thickness (m)',.25,8,.25],['LayerContrast','Layer contrast · not noise',0,1,.05],['AORadius','AO reach (m)',.5,12,.5]];
 el('SurfaceControls').innerHTML=fields.map(([k,label,min,max,step])=>`<div class="Property"><label class="FieldLabel" for="Surface${k}">${label}<output id="Surface${k}Value"></output></label><input id="Surface${k}" type="range" min="${min}" max="${max}" step="${step}"></div>`).join('');
 function settingsUI(){for(const [k,,min,max]of fields){el('Surface'+k).value=state.Settings[k];el('Surface'+k).style.setProperty('--Fill',`${(state.Settings[k]-min)/(max-min)*100}%`);el('Surface'+k+'Value').textContent=state.Settings[k];}el('SurfaceRock').value=state.Settings.Rock;el('SurfaceResolution').value=state.Settings.Resolution;el('SurfaceSamples').value=state.Settings.AOSamples;}
 function status(message){el('SurfaceStatus').textContent=message;}
 function buttons(){el('SurfaceBake').disabled=!valid;el('SurfaceBake').textContent=state.Busy?'Restart bake':'Bake surface';el('SurfaceProgress').hidden=!state.Busy;el('SurfaceExport').disabled=!valid||state.Busy||state.Pending||!state.Result||exporting;el('SurfaceBefore').disabled=!state.Result;}
 function dispose(){for(const t of textures.values())t.dispose();textures.clear();material.map=material.aoMap=material.roughnessMap=null;debug.map=null;state.Result=null;state.Source=null;}
 function stop(){clearTimeout(timer);worker?.terminate();worker=null;state.Busy=false;state.Revision++;}
 function texture(name,raw=false){
  const key=name+(raw?':raw':'');if(textures.has(key))return textures.get(key);
  const t=new THREE.DataTexture(state.Result.maps[name],state.Result.size,state.Result.size,THREE.RGBAFormat);t.colorSpace=raw||['Albedo','Fresh'].includes(name)?THREE.SRGBColorSpace:THREE.NoColorSpace;t.flipY=false;t.generateMipmaps=false;t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;textures.set(key,t);return t;
 }
 function apply(){
  if(!state.Result||state.Source!==stage||!valid||getState().Mode!=='Surface')return;
  const colour=['Albedo','Fresh'].includes(state.View);
  if(colour){material.map=texture(state.View);material.aoMap=texture('AO');material.roughnessMap=state.View==='Fresh'?null:texture('Roughness');material.roughness=state.View==='Fresh'?.94:1;material.needsUpdate=true;}
  else{debug.map=texture(state.View==='AlbedoRaw'?'Albedo':state.View,true);debug.needsUpdate=true;}
  bodies.children.forEach((body,i)=>{
   if(body.userData.SurfaceBake!==state.Result){const old=body.geometry.getAttribute('uv');if(old){old.array.set(state.Result.uvs[i]);old.needsUpdate=true;}else body.geometry.setAttribute('uv',new THREE.BufferAttribute(state.Result.uvs[i].slice(),2));body.userData.SurfaceBake=state.Result;}
   body.material=colour?material:debug;
  });
  el('SurfaceView').value=state.View;render();
  status(`${state.Result.size}² · ${state.Result.stats.triangles.toLocaleString()} triangles · ${state.Settings.Cycles} cycles · ${(state.Result.stats.milliseconds/1000).toFixed(2)} s bake. Maps: ${(state.Result.stats.mapBytes/1048576).toFixed(0)} MiB CPU; ≤${(textures.size*state.Result.size**2*4/1048576).toFixed(0)} MiB GPU map-cache estimate (excludes scene).`);
 }
 function activate(){setMode('Surface');if(state.Result&&!state.Pending)apply();else if(valid&&!state.Busy)bake();}
 function bake(){
  if(!valid||!stage)return;stop();state.Error=null;state.Busy=true;state.Pending=true;const revision=state.Revision,source=stage;buttons();status('Analysing the actual triangle mesh…');
  worker=new Worker(new URL('./SurfaceWorker.js',import.meta.url),{type:'module'});
  const fail=message=>{state.Error=message;state.Busy=false;worker?.terminate();worker=null;status('Surface bake failed: '+message);buttons();};
  worker.onmessage=({data})=>{
   if(data.revision!==state.Revision||source!==stage)return;
   if(data.progress){status(data.progress+'…');return;}if(data.error){fail(data.error);return;}
   dispose();state.Result=data.result;state.Source=source;state.Busy=false;state.Pending=false;state.ReadyRevision=revision;worker.terminate();worker=null;apply();if(getState().Mode!=='Surface')status('Surface ready · click Surface to view the baked maps.');buttons();
  };
  worker.onerror=e=>fail(e.message||'Surface worker failed');worker.postMessage({revision,meshes:stage.Meshes,settings:state.Settings});
 }
 function changed(){state.Settings=ReadSurfaceSettings(state.Settings);state.Pending=true;settingsUI();stop();status('Settings changed · rebaking surface…');buttons();if(valid)timer=setTimeout(bake,500);}
 for(const [key]of fields)el('Surface'+key).oninput=e=>{state.Settings[key]=Number(e.target.value);changed();};
 for(const [id,key]of [['SurfaceRock','Rock'],['SurfaceResolution','Resolution'],['SurfaceSamples','AOSamples']])el(id).onchange=e=>{state.Settings[key]=key==='Rock'?e.target.value:Number(e.target.value);changed();};
 el('SurfaceView').onchange=e=>{state.View=e.target.value;activate();};el('SurfaceBake').onclick=()=>{setMode('Surface');bake();};
 el('SurfaceBefore').onclick=()=>{state.View=state.View==='Fresh'?'Albedo':'Fresh';activate();};
 function onStage(next,dirty){
  valid=!!next&&!dirty;const same=next===stage;stage=next;
  if(!same){stop();dispose();state.Pending=true;}
  if(!valid){stop();status('Build the selected geometry stage before baking or exporting maps.');buttons();return;}
  if(same&&state.Result&&!state.Pending){apply();buttons();return;}
  if(getState().Mode==='Surface'){stop();timer=setTimeout(bake,150);}else status('Mesh ready · select Surface or Bake surface to generate maps.');buttons();
 }
 el('SurfaceExport').onclick=async()=>{
  const result=state.Result,source=state.Source;if(!result||state.Pending||!valid)return;
  exporting=true;buttons();status('Encoding PNGs and UV mesh…');
  // Capture recipe and placed geometry atomically before asynchronous image encoding.
  const recipeText=JSON.stringify(recipe(),null,2),obj=SurfaceOBJ(source.Meshes,result.uvs,worldPoint);
  try{
   const files=[{name:'rock.obj',data:obj},{name:'rock.mtl',data:'newmtl rock\nKa 1 1 1\nKd 1 1 1\nKs 0.04 0.04 0.04\nNs 12\nPr 0.94\nmap_Kd Albedo.png\nmap_Pr Roughness.png\n'},{name:'recipe.json',data:recipeText},{name:'maps.json',data:JSON.stringify({format:'Frontier.SurfaceMaps',version:1,size:result.size,settings:result.settings,stats:result.stats,maps:SurfaceMapLabels,splat:{R:'fresh rock',G:'oxide',B:'deposits',A:'wet rock'},weathering:{R:'oxide',G:'surface loss',B:'deposits'},notes:'Triangle chart atlas; UVs in rock.obj. Albedo/Fresh are sRGB; all masks linear. No noise. No geometry displacement. PBR map_Pr support varies by importer. AO is not baked into albedo. Weathering is qualitative, in formation-local coordinates.'},null,2)}];
   for(const [name,data]of Object.entries(result.maps))files.push({name:name+'.png',data:await EncodePNG(result.size,result.size,data)});
   const url=URL.createObjectURL(ZipFiles(files)),link=document.createElement('a');link.href=url;link.download='Frontier-surface-maps.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('Exported UV mesh + 13 PNG maps + material + recipe.');
  }catch(e){status('Export failed: '+e.message);}finally{exporting=false;buttons();}
 };
 settingsUI();buttons();
 return {State:state,onStage,apply,activate,bake,setSettings(input){stop();state.Settings=ReadSurfaceSettings(input);state.Pending=true;settingsUI();buttons();},dispose};
}
