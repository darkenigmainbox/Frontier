import * as THREE from 'three';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {ReadRoute,SampleRoute,RoutePresets,RouteProfiles} from './FormationRoute.js';
import {ReadPlacement} from './FormationPlacement.js';
import './ViewportEditor.css';

export function CreateViewportEditor({scene,camera,renderer,orbit,bodies,getSpec,onRouteChange,onRender,onStatus}){
 const canvas=renderer.domElement,viewport=canvas.parentElement;
 const root=new THREE.Group();root.name='Formation placement';scene.add(root);root.add(bodies);
 const guide=new THREE.Group();root.add(guide);
 const handles=new THREE.Group();guide.add(handles);
 const material=new THREE.LineBasicMaterial({color:'#c3f5d8',depthTest:false,transparent:true,opacity:.95});
 const line=new THREE.Line(new THREE.BufferGeometry(),material);line.renderOrder=1000;guide.add(line);
 const pointGeometry=new THREE.SphereGeometry(1,14,10);
 const pointMaterial=new THREE.MeshBasicMaterial({color:'#b9efd1',depthTest:false});
 const selectedMaterial=new THREE.MeshBasicMaterial({color:'#ffc078',depthTest:false});
 const proxy=new THREE.Object3D();scene.add(proxy);
 const gizmo=new TransformControls(camera,canvas);gizmo.setSize(.85);scene.add(gizmo.getHelper());
 const tools=document.createElement('div');tools.className='ViewportTools';tools.setAttribute('aria-label','Viewport editing tools');
 tools.innerHTML=`<span class="ToolLabel">EDIT</span><button id="ToolView" title="Inspect / orbit · Q">View</button><button id="ToolSpline" title="Edit route directly in the viewport">Spline</button><button id="ToolMove" title="Move formation · W">Move</button><button id="ToolRotate" title="Rotate formation · E">Rotate</button><button id="ToolScale" title="Scale formation · R">Scale</button><button id="ToolReset" title="Reset formation placement">Reset pose</button>`;
 viewport.append(tools);
 const actions=document.createElement('div');actions.className='SplineActions';actions.hidden=true;
 actions.innerHTML=`<div><strong id="SplineSelection"></strong><button id="SplineAdd">Add point</button><button id="SplineRemove">Delete point</button><select id="SplinePattern" aria-label="Starting route"><option value="">Starting curve…</option>${Object.keys(RoutePresets).map(k=>`<option>${k}</option>`).join('')}</select></div><p id="SplineHelp">Drag dots on the formation's ground plane. Shift-click to insert. Arrow keys nudge the selected dot. Green guide shows through rock. Release to rebuild.</p>`;
 viewport.append(actions);
 const el=id=>document.getElementById(id);
 let mode='View',selected=0,draft=null,drag=null,syncing=false,lastKey='';
 const spec=()=>getSpec(),isRoute=()=>spec().ShapeMode==='Solid'&&RouteProfiles.includes(spec().Profile);
 const points=()=>draft||spec().RoutePoints;
 const pivot=()=>new THREE.Vector3(0,0,-spec().Depth*.5);
 const localPoint=p=>new THREE.Vector3(p[0]*spec().Width*.5,0,p[1]*spec().Depth*.5); // root-relative, pivot at ground centre
 function applyPose(){
  const s=spec(),p=ReadPlacement(s);Object.assign(s,p);
  root.position.fromArray(p.TransformPosition).add(pivot());root.rotation.fromArray([...p.TransformRotation,'XYZ']);root.scale.fromArray(p.TransformScale);
  bodies.position.copy(pivot()).negate();root.updateMatrixWorld(true);
 }
 function placeProxy(){
  root.updateMatrixWorld(true);proxy.position.copy(root.localToWorld(localPoint(points()[selected])));proxy.quaternion.copy(root.quaternion);proxy.updateMatrixWorld(true);
 }
 function draw(){
  if(!isRoute())return;
  selected=Math.min(selected,points().length-1);
  const curve=SampleRoute(points(),100,spec().Width,spec().Depth,spec().RouteSmooth).map(p=>new THREE.Vector3(p[0],0,p[1]));
  line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(curve);
  handles.clear();points().forEach((p,i)=>{const mesh=new THREE.Mesh(pointGeometry,i===selected?selectedMaterial:pointMaterial);mesh.position.copy(localPoint(p));mesh.scale.setScalar(Math.max(spec().Width,spec().Depth)*.014);mesh.userData.point=i;mesh.renderOrder=1001;handles.add(mesh);});
  el('SplineSelection').textContent=`Point ${selected+1} / ${points().length}`;
  el('SplineAdd').disabled=points().length>=8;el('SplineRemove').disabled=points().length<=2;
  if(!gizmo.dragging)placeProxy();onRender();
 }
 function attach(){
  gizmo.detach();guide.visible=mode==='Spline';actions.hidden=mode!=='Spline';viewport.classList.toggle('SplineEditing',mode==='Spline');
  for(const name of ['View','Spline','Move','Rotate','Scale']){el('Tool'+name).classList.toggle('Active',name===mode);el('Tool'+name).setAttribute('aria-pressed',String(name===mode));}
  gizmo.showX=gizmo.showY=gizmo.showZ=true;gizmo.setSpace('local');
  if(mode==='Spline'){draw();gizmo.setMode('translate');gizmo.showY=false;gizmo.attach(proxy);}
  else if(mode!=='View'){gizmo.setMode({Move:'translate',Rotate:'rotate',Scale:'scale'}[mode]);gizmo.attach(root);}
  onRender();
 }
 function setMode(next){if(next==='Spline'&&!isRoute())return;mode=next;draft=null;attach();}
 function sync(){
  if(drag||gizmo.dragging)return;
  syncing=true;applyPose();el('ToolSpline').disabled=!isRoute();el('ToolSpline').title=isRoute()?'Edit route in viewport':'Choose Route-following cliff, Winding canyon or Rock arch to edit a spline';
  const key=JSON.stringify([spec().Profile,spec().RoutePoints,spec().Width,spec().Depth,spec().RouteSmooth]);
  if(key!==lastKey){draft=null;lastKey=key;draw();}
  if(mode==='Spline'&&!isRoute())mode='View';attach();syncing=false;
 }
 function commit(){
  try{spec().RoutePoints=ReadRoute(points());draft=null;draw();onRouteChange();}
  catch(e){draft=null;draw();onStatus('Route not applied: '+e.message,true);}
 }
 function savePose(){
  root.rotation.set(...[root.rotation.x,root.rotation.y,root.rotation.z].map(v=>THREE.MathUtils.euclideanModulo(v+Math.PI,Math.PI*2)-Math.PI));
  root.scale.clampScalar(.05,10);root.position.sub(pivot()).clampScalar(-500,500).add(pivot());
  Object.assign(spec(),{TransformPosition:root.position.clone().sub(pivot()).toArray(),TransformRotation:[root.rotation.x,root.rotation.y,root.rotation.z],TransformScale:root.scale.toArray()});
 }
 gizmo.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;});
 gizmo.addEventListener('mouseDown',()=>{if(mode==='Spline')draft=structuredClone(spec().RoutePoints);});
 gizmo.addEventListener('objectChange',()=>{
  if(syncing)return;
  if(mode==='Spline'){
   const p=root.worldToLocal(proxy.position.clone());draft??=structuredClone(spec().RoutePoints);
   draft[selected]=[THREE.MathUtils.clamp(p.x/(spec().Width*.5),-1,1),THREE.MathUtils.clamp(p.z/(spec().Depth*.5),-1,1)];
   placeProxy();draw();
  }else savePose();onRender();
 });
 gizmo.addEventListener('mouseUp',()=>{if(mode==='Spline')commit();else savePose();onRender();});
 gizmo.addEventListener('change',onRender);
 function ray(e){const rect=canvas.getBoundingClientRect(),r=new THREE.Raycaster();r.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);return r;}
 function planePoint(e){
  root.updateMatrixWorld(true);const normal=new THREE.Vector3(0,1,0).applyQuaternion(root.quaternion);
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,root.position),hit=ray(e).ray.intersectPlane(plane,new THREE.Vector3());
  if(!hit)return null;root.worldToLocal(hit);return [THREE.MathUtils.clamp(hit.x/(spec().Width*.5),-1,1),THREE.MathUtils.clamp(hit.z/(spec().Depth*.5),-1,1)];
 }
 function insert(p){
  if(points().length>=8){onStatus('A route supports up to 8 control points.',true);return;}
  draft=structuredClone(points());let index=1,best=Infinity;
  for(let i=1;i<draft.length;i++){
   const a=localPoint(draft[i-1]),b=localPoint(draft[i]),q=localPoint(p),v=b.clone().sub(a),t=THREE.MathUtils.clamp(q.clone().sub(a).dot(v)/v.lengthSq(),0,1),distance=q.distanceTo(a.addScaledVector(v,t));
   if(distance<best){best=distance;index=i;}
  }
  draft.splice(index,0,p);selected=index;commit();
 }
 canvas.addEventListener('pointerdown',e=>{
  if(mode!=='Spline'||e.button!==0)return;
  root.updateMatrixWorld(true);const hit=ray(e).intersectObjects(handles.children,false)[0];
  if(!hit&&!e.shiftKey)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(hit){selected=hit.object.userData.point;draft=structuredClone(spec().RoutePoints);drag={id:e.pointerId};orbit.enabled=false;gizmo.enabled=false;canvas.setPointerCapture(e.pointerId);draw();}
  else{const p=planePoint(e);if(p)insert(p);}
 },true);
 canvas.addEventListener('pointermove',e=>{if(!drag)return;e.stopImmediatePropagation();const p=planePoint(e);if(p){draft[selected]=p;draw();}},true);
 const finish=e=>{if(!drag)return;e.stopImmediatePropagation();drag=null;orbit.enabled=true;gizmo.enabled=true;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);commit();};
 canvas.addEventListener('pointerup',finish,true);
 canvas.addEventListener('pointercancel',e=>{if(drag){draft=null;drag=null;orbit.enabled=true;gizmo.enabled=true;draw();}},true);
 function remove(){if(points().length>2){draft=structuredClone(points());draft.splice(selected,1);selected=Math.min(selected,draft.length-1);commit();}}
 el('SplineAdd').onclick=()=>{const i=Math.min(selected,points().length-2);insert(points()[i].map((v,k)=>(v+points()[i+1][k])*.5));};
 el('SplineRemove').onclick=remove;
 el('SplinePattern').onchange=e=>{if(RoutePresets[e.target.value]){draft=structuredClone(RoutePresets[e.target.value]);selected=0;commit();e.target.value='';}};
 for(const name of ['View','Spline','Move','Rotate','Scale'])el('Tool'+name).onclick=()=>setMode(name);
 el('ToolReset').onclick=()=>{Object.assign(spec(),ReadPlacement());sync();onRender();};
 window.addEventListener('keydown',e=>{
  if(!viewport.offsetParent||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Escape'&&!gizmo.dragging){if(drag){drag=null;draft=null;orbit.enabled=true;gizmo.enabled=true;}setMode('View');return;}
  const modes={q:'View',w:'Move',e:'Rotate',r:'Scale'};
  if(modes[e.key.toLowerCase()]&&!gizmo.dragging&&!drag){setMode(modes[e.key.toLowerCase()]);return;}
  if(mode!=='Spline'||drag||gizmo.dragging)return;
  if(e.key==='Delete'){e.preventDefault();remove();}
  const delta={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];
  if(delta){e.preventDefault();draft=structuredClone(points());draft[selected]=draft[selected].map((v,k)=>THREE.MathUtils.clamp(v+delta[k],-1,1));commit();}
 });
 sync();
 return {sync,setMode,get mode(){return mode;},get dragging(){return !!drag||gizmo.dragging;},root,guide,handles,gizmo,proxy};
}
