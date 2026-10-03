import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import './style.css';
import './designer.css';
import { createDesigner } from './designer.js';
import { escapeHTML, designSVG } from './design.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { PATTERNS, PATTERN_REVISION, RUGGED_FAMILY_COLORS, MUD_FAMILY_COLORS, patternSVG } from './patterns.js';
import { DEFAULTS, buildTreads, buildCasing } from './geometry.js';

import { restoreSettings } from './settings.js';

const $ = s => document.querySelector(s);
let settings = {...DEFAULTS};
try {
  const saved = JSON.parse(localStorage.getItem('frontier-tread-v1'));
  if (saved) settings = restoreSettings(saved);
} catch { /* Invalid or unavailable local storage: use defaults. */ }
let designer;
let wireframe = false, model, renderer, controls, camera, ground, scene, updateTimer;
let autoRotate = false, ready = false;
const number = n => Math.round(n).toLocaleString('en-US');

const libraryPatterns = [...PATTERNS.filter(p=>p.reference), ...PATTERNS.filter(p=>!p.reference)];
$('#pattern-filters').innerHTML = [['all','All',PATTERNS.length],['new','New',PATTERNS.filter(p=>p.reference).length],['original','Original',PATTERNS.filter(p=>!p.reference).length]].map(([id,label,count])=>`<button data-filter="${id}" aria-pressed="${id==='all'}">${label} <span>${count}</span></button>`).join('');
$('#pattern-filters').addEventListener('click',e=>{
  const button=e.target.closest('[data-filter]');if(!button)return;
  const filter=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b===button));
  document.querySelectorAll('[data-pattern]').forEach(b=>{
    const isNew=!!PATTERNS.find(p=>p.id===b.dataset.pattern).reference;
    b.hidden=filter==='new'&&!isNew || filter==='original'&&isNew;
  });
  $('#patterns').scrollLeft=0;
});
$('#patterns').innerHTML = libraryPatterns.map(p=>`<button class="pattern-card" data-pattern="${p.id}" aria-pressed="false"><span class="pattern-thumb">${patternSVG(p.id,8)}</span><span><span class="pattern-code">${p.code}${p.reference ? ' <em>REV 07</em>' : ''}</span><span class="pattern-name">${p.name}</span><span class="pattern-terrain">${p.terrain}</span></span><span class="selected-dot"></span></button>`).join('');

function syncUI() {
  const pattern = PATTERNS.find(p=>p.id===settings.pattern);
  document.querySelectorAll('[data-pattern]').forEach(b=>{const active=b.dataset.pattern===settings.pattern;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  $('#model-title').innerHTML = `${escapeHTML(settings.design?.name ?? pattern.name)}<span> / ${String(pattern.source).padStart(2,'0')}</span>`;
  $('#model-subtitle').textContent = `${settings.width} mm · ${settings.repeats} repeats · ${settings.depth} mm depth`;
  for (const key of ['width','radius','depth','repeats','gap']) {
    const input=$(`#${key}`);input.value=settings[key];
    input.style.setProperty('--progress',`${(settings[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
    $(`#${key}-value`).value=key==='gap'?`${settings[key].toFixed(2)}×`:settings[key];
  }
  designer?.refresh();
  $('#sipes').checked=settings.sipes;$('#casing').checked=settings.casing;
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===settings.view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
}

function disposeModel(group) {
  group?.traverse(o=>{ if(o.isMesh){o.geometry.dispose();o.material.dispose();} });
}

function rebuild(fit=false) {
  clearTimeout(updateTimer);
  if (!renderer) return;
  const started=performance.now();
  let next;
  try {
    const tread=buildTreads(settings);
    next=new THREE.Group(); next.name=`Frontier_${settings.pattern}_${settings.view}_mm`;
    const material=new THREE.MeshStandardMaterial({color:wireframe?'#829879':'#555b64',roughness:.86,metalness:0,wireframe});
    const mesh=new THREE.Mesh(tread.geometry,material);mesh.name='Extruded_tread_blocks_and_sipes';mesh.castShadow=true;mesh.receiveShadow=true;next.add(mesh);
    if(settings.casing) {
      const casing=new THREE.Mesh(buildCasing(settings),new THREE.MeshStandardMaterial({color:wireframe?'#728b65':'#24272c',roughness:.92,wireframe}));
      casing.name=settings.view==='tire'?'Carcass_with_inner_liner':'Flat_backing';casing.castShadow=true;casing.receiveShadow=true;next.add(casing);
      if(settings.view==='tire') for(const side of [-1,1]) {
        const ring=new THREE.Mesh(new THREE.TorusGeometry(settings.radius*.645,1.5,8,160),new THREE.MeshStandardMaterial({color:'#353b31',roughness:.8,wireframe}));
        ring.rotation.y=Math.PI/2;ring.position.x=side*settings.width*.405;ring.name=`Bead_detail_${side}`;next.add(ring);
      }
    }
    if(model){scene.remove(model);disposeModel(model);}
    model=next;scene.add(model);
    ground.position.y=settings.view==='tire'?-settings.radius-settings.depth-2:-14.5;
    let triangles=0; model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
    $('#block-count').textContent=number(tread.blocks);
    $('#block-count').title=tread.ejectors ? `Plus ${tread.ejectors} low stone-ejector bars, counted separately` : 'Full-height tread blocks and rib sections';
    $('#triangle-count').textContent=number(triangles);
    $('#status').textContent=`${settings.view==='flat'?'6-repeat sample':'Full circumference'} · ${number(performance.now()-started)} ms build`;
    if(fit||!ready) fitCamera();
    window.dispatchEvent(new Event('frontier-render'));
    ready=true;$('#error').hidden=true;$('#export').disabled=false;
    try{localStorage.setItem('frontier-tread-v1',JSON.stringify({...settings,patternRevision:PATTERN_REVISION}));}catch{}
    window.__treadLab={settings:{...settings},triangles,blocks:tread.blocks,ejectors:tread.ejectors,revision:PATTERN_REVISION,ready:true};
  } catch(error) {
    if(next&&next!==model)disposeModel(next);
    console.error(error);$('#error').textContent=`Preview paused${model?' — showing the last valid mesh':''}. ${error.message}`;$('#error').hidden=false;$('#export').disabled=true;
    $('#status').textContent='Preview paused — repair the outline or undo';
    window.__treadLab={...window.__treadLab,ready:false,error:error.message};
  } finally {$('#loading').hidden=true;}
}

function queueRebuild(fit=false) {
  syncUI();clearTimeout(updateTimer);$('#export').disabled=true;
  try{localStorage.setItem('frontier-tread-v1',JSON.stringify({...settings,patternRevision:PATTERN_REVISION}));}catch{}
  updateTimer=setTimeout(()=>rebuild(fit),100);
}

function fitCamera() {
  if(!model)return;
  const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  if(box.isEmpty())return;
  const aspect=camera.aspect;
  const maxSize=Math.max(size.y,size.z,size.x);
  const verticalFov=THREE.MathUtils.degToRad(camera.fov);
  const distance=maxSize/(2*Math.tan(verticalFov/2))*1.55/Math.min(1,aspect*.95);
  const direction=settings.view==='tire'?new THREE.Vector3(.82,.37,1):new THREE.Vector3(.18,1,.65);
  camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
  controls.target.copy(center);controls.minDistance=maxSize*.48;controls.maxDistance=maxSize*6;controls.update();
}

function initScene() {
  const viewport=$('#viewport');
  scene=new THREE.Scene();scene.background=new THREE.Color('#101215');scene.fog=new THREE.Fog('#101215',2400,5500);
  camera=new THREE.PerspectiveCamera(33,1,1,10000);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D polygonal tire mesh; drag to rotate and scroll to zoom');renderer.domElement.setAttribute('role','img');
  const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment(),environment=pmrem.fromScene(env,.025);
  scene.environment=environment.texture;scene.environmentIntensity=.35;env.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff','#a0a5a7',.95));
  const key=new THREE.DirectionalLight('#ffffff',2.5);key.position.set(-350,900,650);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-650;key.shadow.camera.right=650;key.shadow.camera.top=650;key.shadow.camera.bottom=-650;key.shadow.camera.near=1;key.shadow.camera.far=2400;key.shadow.normalBias=.8;key.shadow.bias=-.00015;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight('#e4ecff',1.2);fill.position.set(700,200,-400);scene.add(fill);
  const rim=new THREE.DirectionalLight('#ffffff',1.4);rim.position.set(-400,200,-650);scene.add(rim);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000),new THREE.MeshStandardMaterial({color:'#101215',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.autoRotateSpeed=.6;controls.maxPolarAngle=Math.PI*.89;
  const resize=new ResizeObserver(()=>{const {width,height}=viewport.getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);if(ready)fitCamera();window.dispatchEvent(new Event('frontier-render'));});resize.observe(viewport);
  const {width,height}=viewport.getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);
  let dirty = true;
  controls.addEventListener('change',()=>{dirty=true;});
  const invalidate=()=>{dirty=true;};
  document.addEventListener('input',invalidate);document.addEventListener('change',invalidate);document.addEventListener('click',invalidate);
  window.addEventListener('frontier-render',invalidate);
  renderer.setAnimationLoop(()=>{controls.autoRotate=autoRotate;controls.update();if(dirty){renderer.render(scene,camera);dirty=false;}});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').textContent='The 3D graphics context was lost. Reload the page to restore the viewer.';$('#error').hidden=false;$('#export').disabled=true;});
  rebuild(true);
}

let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}

$('#patterns').addEventListener('click',e=>{
  const button=e.target.closest('[data-pattern]');if(!button)return;
  const p=PATTERNS.find(p=>p.id===button.dataset.pattern);
  if(settings.design?.modified&&!confirm('Replace your edited tread with this preset? Save JSON first to keep a copy.'))return;
  loadPreset(p.id);
});
for(const key of ['width','radius','depth','repeats','gap']) $(`#${key}`).addEventListener('input',e=>{settings[key]=Number(e.target.value);queueRebuild();});
for(const key of ['sipes','casing']) $(`#${key}`).addEventListener('change',e=>{settings[key]=e.target.checked;queueRebuild();});
$('#view-control').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;settings.view=b.dataset.view;queueRebuild(true);});
$('#wireframe').addEventListener('click',()=>{wireframe=!wireframe;$('#wireframe').setAttribute('aria-pressed',wireframe);model?.traverse(o=>{if(o.isMesh){o.material.wireframe=wireframe;o.material.color.set(wireframe?'#718968':(o.name.includes('Carcass')?'#24272c':'#555b64'));}});});
$('#rotate').addEventListener('click',()=>{autoRotate=!autoRotate;$('#rotate').setAttribute('aria-pressed',autoRotate);});
$('#reset-camera').addEventListener('click',fitCamera);
$('#reset-settings').addEventListener('click',()=>{const p=PATTERNS.find(p=>p.id===settings.pattern);settings={...DEFAULTS,pattern:p.id,width:p.width,depth:p.depth,repeats:p.repeats,view:settings.view,design:settings.design};queueRebuild(true);toast('Mesh dimensions restored; your shapes are preserved');});
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#info-dialog').open)fitCamera();});

$('#export').addEventListener('click',async()=>{
  if(!model||!ready)return;
  const button=$('#export');button.disabled=true;$('#status').textContent='Preparing mesh export…';
  await new Promise(resolve=>setTimeout(resolve,30));
  try{
    model.updateMatrixWorld(true);
    const format=$('#export-format').value;
    const content=format==='obj'?new OBJExporter().parse(model):new STLExporter().parse(model,{binary:true});
    const blob=new Blob([content],{type:format==='obj'?'text/plain':'application/octet-stream'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`frontier-${settings.design?.modified?'custom-'+(settings.design.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'tread'):settings.pattern}-${settings.view}-${settings.width}mm.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    toast(`${format.toUpperCase()} exported · ${(blob.size/1024/1024).toFixed(1)} MB · millimeters`);
    $('#status').textContent='Mesh export complete';
  }catch(error){console.error(error);toast('Export failed. Try fewer circumference repeats.');$('#status').textContent='Export failed';}
  finally{button.disabled=false;}
});

function openDialog(html){$('#dialog-content').innerHTML=html;$('#info-dialog').showModal();}
$('#close-dialog').addEventListener('click',()=>$('#info-dialog').close());
$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#about').addEventListener('click',()=>openDialog(`<div class="section-eyebrow">FRONTIER / TREAD LAB</div><h2>Geometry you can get a grip on.</h2><p>${PATTERNS.length} procedural tread studies: four from your supplied photographs and four new web-reference off-road interpretations. Each pattern uses explicit polygon outlines, extruded blocks, beveled edges, and recessed geometric sipe cuts.</p><p>No textures, normal maps, bump maps, or displacement maps are used. Everything runs locally in your browser.</p><p><strong>Export notes</strong><br>OBJ preserves named components. STL is binary. Coordinates are in millimeters; STL itself is unitless, so choose mm when importing. The flat view exports a six-repeat sample; the wrapped view exports the full tire.</p><p class="dialog-fineprint">Revision 7 adds an editable polygon designer with linked mirrors, arbitrary shape types, two-pitch membership, JSON projects, SVG outlines and undo/redo. New off-road outlines have been revised; they remain unverified reference studies, not exact matches. Original source presets are retained. These are reference-based approximations, not exact scans or engineering-validated tires. Exports contain separate/intersecting closed solids, not a boolean-unioned, watertight manufacturing mesh. Union/remesh and validate before 3D printing.</p>`));
$('#blueprint').addEventListener('click',event=>{
  const p=PATTERNS.find(p=>p.id===settings.pattern);
  if(settings.design?.modified&&!event.detail?.presetOnly){openDialog(`<div class="section-eyebrow">CUSTOM CONSTRUCTION / TWO-PITCH CELL</div><h2>${escapeHTML(settings.design.name)}</h2><div class="custom-blueprint">${designSVG(settings.design,settings)}</div><p>Your current source polygons and mirrored copies, before groove spacing and bevels. Drag the handles in Designer to change these shapes. The actual mesh is arrayed around the tyre using the circumference repeat count.</p><p class="dialog-fineprint">Preset origin: ${p.name}. Edits are your own construction, not a validated match to the reference. Save JSON to preserve editable mirrors; SVG exports construction outlines only.</p>`);return;}
  const familyColors=p.id==='rugged' ? RUGGED_FAMILY_COLORS : p.id==='mud' ? MUD_FAMILY_COLORS : null;
  const familyNote=p.id==='mud' ? 'The center blocks have broad flat ends, not spear tips. Hooked shoulders overlap their stagger without closing the grooves; bars are only 24% of tread depth.' : 'Paired lugs mirror both width and travel direction, including their notches and sipes. The green center lug is self-mirrored.';
  const families=familyColors ? `<ul class="family-key">${Object.entries(familyColors).map(([name,color])=>`<li><i style="background:${color}"></i>${name.replaceAll('-', ' ')}</li>`).join('')}</ul><p>${familyNote}</p>` : '';
  openDialog(`<div class="section-eyebrow">PATTERN BLUEPRINT / ${p.code}</div><h2>${p.name}</h2><div class="blueprint-layout"><div class="blueprint-diagram">${patternSVG(p.id,6,{annotate:!!familyColors})}</div><div class="blueprint-details"><span class="small-tag">VECTOR CONSTRUCTION</span><h3>Study ${p.source} of ${PATTERNS.length}</h3><p>${p.description}</p>${families}<p>${p.id==='rugged' ? 'The colors mark matching lug families; they do not add textures to the mesh.' : p.id==='mud' ? 'The dark shapes become extruded lugs; pale bars are lower stone ejectors.' : 'The dark shapes become extruded lugs.'} The spaces between them are open grooves. Fine lines become shallow sipe cuts with mesh walls and floors.</p><p>This diagram shows the unmodified source outlines. Use the flat 3D view to inspect your current parameters.</p></div></div>${p.reference ? `<section class="web-reference"><div><span class="section-eyebrow">WEB REFERENCE / VISUAL INSPIRATION</span><h3><a href="${p.reference.url}" target="_blank" rel="noreferrer">${p.reference.title} ↗</a></h3><p>${p.reference.note}</p><a class="photo-credit" href="${p.reference.photoSource}" target="_blank" rel="noreferrer">${p.reference.photoCredit} ↗</a></div><img src="${p.reference.image}" alt="Reference photograph of ${p.reference.title}, not the generated mesh" loading="lazy"/></section>` : ''}<p class="dialog-fineprint">${p.reference ? 'Original reference-inspired study; not an exact replica or manufacturer-endorsed design. Preset dimensions are modeling defaults, not product specifications. Reference photographs are shown for comparison only and are never used as mesh textures.' : 'Hand-authored interpretation of the supplied photograph; not an exact trace.'}</p>`);
});
function loadPreset(id) {
  designer.loadPreset(id);
}
designer=createDesigner({
  getSettings:()=>settings,
  onChange:design=>{settings={...settings,pattern:design.preset,design};queueRebuild(true);},
  onPreset:loadPreset,
  onImport:values=>{settings={...values};},
  onMessage:toast,
});
settings.design=designer.getDesign();settings.pattern=settings.design.preset;
let mode='designer';try{mode=localStorage.getItem('frontier-ui-mode')||mode;}catch{}
function setMode(value){
  document.body.classList.toggle('designer-mode',value==='designer');
  document.querySelectorAll('[data-workspace]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.workspace===value));
  try{localStorage.setItem('frontier-ui-mode',value);}catch{}
  designer.refresh();
}
document.querySelectorAll('[data-workspace]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.workspace)));
setMode(mode);
syncUI();$('#export').disabled=true;
try{initScene();}catch(error){console.error(error);$('#error').textContent='The 3D viewer needs WebGL. Enable hardware acceleration in your browser, then reload. You can still explore the pattern blueprints.';$('#error').hidden=false;$('#status').textContent='WebGL unavailable';}
