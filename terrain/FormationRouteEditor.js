import {ReadRoute,SampleRoute,RoutePresets} from './FormationRoute.js';
import './FormationRouteEditor.css';

export function MountRouteEditor(host,spec,onChange){
 let points=structuredClone(spec.RoutePoints),selected=0,dragging=false;
 host.innerHTML=`<div class="RouteEditor"><div class="FieldLabel">Route designer <span class="Subtle">top view</span></div>
 <p>Drag the dots to guide the rock. Click an empty area to insert a point. The arch rises above this route; the canyon leaves it open.</p>
 <svg id="RouteCanvas" viewBox="0 0 240 180" role="group" aria-label="Editable rock route, top view" tabindex="0"></svg>
 <div class="RouteActions"><button type="button" id="RouteAdd">Add point</button><button type="button" id="RouteRemove">Remove point</button></div>
 <label class="FieldLabel" for="RoutePattern">Starting curve</label><select id="RoutePattern"><option value="">Custom route</option>${Object.keys(RoutePresets).map(k=>`<option>${k}</option>`).join('')}</select>
 <div class="RouteCoordinates"><label>X % <input id="RouteX" type="number" min="-100" max="100" step="1"></label><label>Z % <input id="RouteZ" type="number" min="-100" max="100" step="1"></label></div>
 <p id="RouteNote" aria-live="polite"></p></div>`;
 const get=id=>host.querySelector('#'+id),svg=get('RouteCanvas');
 const xy=p=>[120+p[0]*106,90+p[1]*76];
 const draw=()=>{
  const curve=SampleRoute(points,100,2,2,spec.RouteSmooth).map(xy);
  svg.innerHTML=`<path class="RouteGrid" d="M14 90H226 M120 14V166"/><text x="216" y="84">X</text><text x="125" y="164">Z</text><polyline class="RouteHandles" points="${points.map(xy).map(p=>p.join(',')).join(' ')}"/><polyline class="RouteLine" points="${curve.map(p=>p.join(',')).join(' ')}"/>`+points.map((p,i)=>{const [x,y]=xy(p);return `<circle data-point="${i}" class="${i===selected?'selected':''}" cx="${x}" cy="${y}" r="7"/><text x="${x+9}" y="${y-8}">${i+1}</text>`;}).join('');
  get('RouteX').value=Math.round(points[selected][0]*100);get('RouteZ').value=Math.round(points[selected][1]*100);
  get('RouteRemove').disabled=points.length<=2;get('RouteAdd').disabled=points.length>=8;
  get('RouteNote').textContent=`Point ${selected+1} of ${points.length} · arrows move selected dot; Delete removes it. Width/depth scale the route; thickness is separate.`;
 };
 const commit=()=>{
  try{const valid=ReadRoute(points);points=valid;spec.RoutePoints=valid;get('RoutePattern').value='';draw();onChange();}
  catch(e){get('RouteNote').textContent='Route not applied: '+e.message;}
 };
 const position=e=>{const rect=svg.getBoundingClientRect();return [Math.max(-1,Math.min(1,((e.clientX-rect.left)/rect.width*240-120)/106)),Math.max(-1,Math.min(1,((e.clientY-rect.top)/rect.height*180-90)/76))];};
 const insert=p=>{
  if(points.length>=8)return;
  let index=1,best=Infinity;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
   const distance=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);if(distance<best){best=distance;index=i;}
  }
  points.splice(index,0,p);selected=index;commit();
 };
 svg.onpointerdown=e=>{
  if(e.button!==0)return;e.preventDefault();svg.focus();
  const index=e.target.dataset.point;
  if(index===undefined){insert(position(e));return;}
  selected=Number(index);dragging=true;svg.setPointerCapture(e.pointerId);draw();
 };
 svg.onpointermove=e=>{if(dragging){points[selected]=position(e);draw();}};
 svg.onpointerup=()=>{if(dragging){dragging=false;commit();}};
 svg.onpointercancel=()=>{dragging=false;points=structuredClone(spec.RoutePoints);selected=Math.min(selected,points.length-1);draw();};
 const remove=()=>{if(points.length>2){points.splice(selected,1);selected=Math.min(selected,points.length-1);commit();}};
 svg.onkeydown=e=>{
  const movement={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];
  if(e.key==='Delete'){e.preventDefault();remove();}
  if(movement){e.preventDefault();points[selected]=points[selected].map((v,k)=>Math.max(-1,Math.min(1,v+movement[k])));commit();}
 };
 get('RouteAdd').onclick=()=>{const i=Math.min(selected,points.length-2);insert(points[i].map((v,k)=>(v+points[i+1][k])*.5));};
 get('RouteRemove').onclick=remove;
 get('RoutePattern').onchange=e=>{if(RoutePresets[e.target.value]){points=structuredClone(RoutePresets[e.target.value]);selected=0;commit();}};
 for(const [id,k]of [['RouteX',0],['RouteZ',1]])get(id).onchange=e=>{points[selected][k]=Math.max(-1,Math.min(1,Number(e.target.value)/100));commit();};
 draw();
 return draw;
}
