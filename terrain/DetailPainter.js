import * as THREE from 'three';
import {DetailMask} from './DetailMask.js';
export function CreateDetailPainter({state,canvas,camera,scene,bodies,orbit,editor,view,dirty,render,status}){
 const el=id=>document.getElementById(id),history=[];
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide});
 const ring=new THREE.Mesh(new THREE.RingGeometry(.97,1,64),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.85}));
 ring.matrixAutoUpdate=false;ring.visible=false;ring.renderOrder=20;scene.add(ring);
 let drawing=false,last=null,stroke=0,changed=false,pointer=null;
 const number=id=>{const input=el(id),v=Number(input.value);return Math.max(Number(input.min),Math.min(Number(input.max),Number.isFinite(v)?v:Number(input.min)));};
 function save(){history.push({DetailMaskBase:state.Specification.DetailMaskBase,DetailPaint:structuredClone(state.Specification.DetailPaint)});if(history.length>20)history.shift();}
 function refresh(){
  const mode=state.Specification.DetailMaskMode,auto=mode==='Auto';
  el('DetailMaskMode').value=mode;
  el('AutoMaskControls').hidden=mode==='Paint';el('ManualPaintTools').hidden=auto;
  el('MaskModeHelp').textContent=auto?'Auto is active: seeded patches leave other areas protected. Adjust coverage, patch size and gradient falloff below. Blue is protected; orange allows the cut. Stored paint is ignored.':mode==='AutoPaint'?'Procedural patches plus painted additions/protection. Strokes are applied after the Auto mask.':'Manual painting only. Auto settings are ignored.';
  for(const id of ['PaintAction','PaintRadius','PaintStrength','PaintSoftness'])el(id).disabled=auto;
  for(const id of ['PaintProtectAll','PaintCutAll'])el(id).disabled=mode!=='Paint';
  for(const id of ['DetailAutoCoverage','DetailAutoSize','DetailAutoFalloff','DetailAutoSeed','NewDetailAutoSeed','DetailAutoHeightBias'])if(el(id))el(id).disabled=mode==='Paint';
  if(el('DetailCoverage'))el('DetailCoverage').disabled=auto;
  el('PaintPanel').hidden=state.Stage!==6;
  el('PaintToggle').textContent=state.Painting?'Return to rock':auto?'Preview Auto mask':'Paint influence in viewport';
  el('PaintToggle').disabled=state.Busy||!state.Result?.Stages[0]||(!state.Painting&&!state.DisplayStage);
  el('PaintUndo').disabled=!history.length;
  el('PaintCount').textContent=`${state.Specification.DetailPaint.length} / 3,000 stamps · blue = protected; orange = affected`;
  for(const id of ['ToolView','ToolSpline','ToolMove','ToolRotate','ToolScale','ToolReset']){if(state.Painting)el(id).disabled=true;else if(id!=='ToolSpline')el(id).disabled=false;}
  if(!state.Painting)return;
  for(const body of bodies.children){
   if(!body.isMesh)continue;
   body.material=material;body.castShadow=false;body.receiveShadow=false;
   const p=body.geometry.attributes.position,n=body.geometry.attributes.normal,c=body.geometry.attributes.color;
   for(let i=0;i<p.count;i++){
    const w=DetailMask([p.getX(i),p.getY(i),p.getZ(i)],[n.getX(i),n.getY(i),n.getZ(i)],state.Specification);
    const colour=new THREE.Color('#244b73').lerp(new THREE.Color('#ffb14e'),w);c.setXYZ(i,colour.r,colour.g,colour.b);
   }c.needsUpdate=true;
  }
  render();
 }
 function hit(e){
  bodies.updateWorldMatrix(true,true);const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
  const h=ray.intersectObjects(bodies.children.filter(b=>b.isMesh&&b.visible),false)[0];
  if(!h)return null;
  return {p:bodies.worldToLocal(h.point.clone()),n:h.face.normal.clone().normalize()};
 }
 function cursor(h){
  ring.visible=!!h&&state.Painting&&state.Specification.DetailMaskMode!=='Auto';
  if(h){const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),h.n),r=number('PaintRadius');ring.matrix.copy(bodies.matrixWorld).multiply(new THREE.Matrix4().compose(h.p.clone().addScaledVector(h.n,.015),q,new THREE.Vector3(r,r,r)));ring.matrixWorldNeedsUpdate=true;}
  render();
 }
 function dab(h){
  const s=state.Specification,radius=number('PaintRadius');
  if(last&&last.distanceTo(h.p)<radius*.15)return;
  if(s.DetailPaint.length>=3000){status('Paint limit reached. Undo or clear the mask before adding more strokes.',true);return;}
  s.DetailPaint.push({p:h.p.toArray(),n:h.n.toArray(),radius,strength:number('PaintStrength'),softness:number('PaintSoftness'),target:Number(el('PaintAction').value),stroke});
  last=h.p.clone();changed=true;state.Dirty=true;el('ExportObj').disabled=true;refresh();
 }
 function finish(){
  if(!drawing)return;drawing=false;orbit.enabled=true;
  if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
  pointer=null;last=null;if(changed)dirty();else history.pop();refresh();
 }
 canvas.addEventListener('pointerdown',e=>{
  if(!state.Painting||state.Specification.DetailMaskMode==='Auto'||state.Busy||e.button!==0)return;
  e.preventDefault();e.stopImmediatePropagation();const h=hit(e);if(!h)return;
  save();drawing=true;changed=false;last=null;pointer=e.pointerId;stroke=Math.max(0,...state.Specification.DetailPaint.map(s=>s.stroke))+1;
  orbit.enabled=false;canvas.setPointerCapture(e.pointerId);dab(h);cursor(h);
 },true);
 canvas.addEventListener('pointermove',e=>{
  for(const id of ['ToolView','ToolSpline','ToolMove','ToolRotate','ToolScale','ToolReset']){if(state.Painting)el(id).disabled=true;else if(id!=='ToolSpline')el(id).disabled=false;}
  if(!state.Painting||state.Specification.DetailMaskMode==='Auto')return;const h=hit(e);cursor(h);
  if(drawing){e.preventDefault();e.stopImmediatePropagation();if(h)dab(h);else last=null;}
 },true);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drawing){e.stopImmediatePropagation();finish();}},true);
 canvas.addEventListener('pointerleave',()=>{if(!drawing){ring.visible=false;render();}});
 window.addEventListener('keydown',e=>{if(state.Painting&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop();view(state.Stage);refresh();return;}if(state.Painting&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&['q','w','e','r','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);
 el('PaintToggle').onclick=()=>{
  finish();state.Painting=!state.Painting;ring.visible=false;
  if(state.Painting&&state.Specification.DetailMaskMode==='Paint'&&!state.Specification.DetailPaint.length)el('PaintAction').value=state.Specification.DetailMaskBase>=.5?'0':'1';
  editor().setMode('View');editor().sync();state.DetailView='Final';el('DetailView').value='Final';state.Isolated=false;
  view(6);refresh();
  if(state.Painting)status(state.Specification.DetailMaskMode==='Auto'?'Auto mask preview · orbit to inspect · rebuild after changing controls':'Painting ORIGINAL stage-1 surface · left drag to paint · rebuild to apply');
 };
 for(const [id,base]of [['PaintProtectAll',0],['PaintCutAll',1]])el(id).onclick=()=>{finish();save();state.Specification.DetailMaskBase=base;state.Specification.DetailPaint=[];el('PaintAction').value=base?'0':'1';dirty();refresh();};
 el('DetailMaskMode').onchange=()=>{stop();state.Specification.DetailMaskMode=el('DetailMaskMode').value;dirty();refresh();};
 el('PaintClearCorrections').onclick=()=>{finish();save();state.Specification.DetailPaint=[];dirty();refresh();};
 el('PaintUndo').onclick=()=>{finish();const previous=history.pop();if(previous){Object.assign(state.Specification,previous);dirty();refresh();}};
 function stop(){if(!state.Painting&&!drawing)return;finish();state.Painting=false;ring.visible=false;orbit.enabled=true;editor().sync();}
 return {refresh,stop,resetHistory(){history.length=0;},get material(){return material;}};
}
