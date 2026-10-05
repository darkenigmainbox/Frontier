import{B as Ee,F as ze,P as Le,a as ce,S as ye,C as Te,M as xe,E as Be,V as C,Q as Ue,W as Re,b as ke,A as Ie,c as Ge,d as q,e as $e,H as Ne,G as Oe,I as De,f as Fe,g as Ve,D as fe,h as je,i as He,j as qe}from"./three-c2IhKzwF.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function a(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=a(s);fetch(s.href,n)}})();/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const we=(e,t,a=[])=>{const i=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(t).forEach(s=>{i.setAttribute(s,String(t[s]))}),a.length&&a.forEach(s=>{const n=we(...s);i.appendChild(n)}),i};var We=([e,t,a])=>we(e,t,a);/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=e=>Array.from(e.attributes).reduce((t,a)=>(t[a.name]=a.value,t),{}),_e=e=>typeof e=="string"?e:!e||!e.class?"":e.class&&typeof e.class=="string"?e.class.split(" "):e.class&&Array.isArray(e.class)?e.class:"",Xe=e=>e.flatMap(_e).map(a=>a.trim()).filter(Boolean).filter((a,i,s)=>s.indexOf(a)===i).join(" "),Qe=e=>e.replace(/(\w)(\w*)(_|-|\s*)/g,(t,a,i)=>a.toUpperCase()+i.toLowerCase()),ve=(e,{nameAttr:t,icons:a,attrs:i})=>{var w;const s=e.getAttribute(t);if(s==null)return;const n=Qe(s),l=a[n];if(!l)return console.warn(`${e.outerHTML} icon name was not found in the provided icons object.`);const c=Ye(e),[f,g,h]=l,d={...g,"data-lucide":s,...i,...c},u=Xe(["lucide",`lucide-${s}`,c,i]);u&&Object.assign(d,{class:u});const x=We([f,d,h]);return(w=e.parentNode)==null?void 0:w.replaceChild(x,e)};/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=["svg",p,[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ke=["svg",p,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m14.31 8 5.74 9.94"}],["path",{d:"M9.69 8h11.48"}],["path",{d:"m7.38 12 5.74-9.94"}],["path",{d:"M9.69 16 3.95 6.06"}],["path",{d:"M14.31 16H2.83"}],["path",{d:"m16.62 12-5.74 9.94"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Je=["svg",p,[["path",{d:"M7 7h10v10"}],["path",{d:"M7 17 17 7"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const et=["svg",p,[["path",{d:"M12 7v14"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tt=["svg",p,[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"}],["path",{d:"m3.3 7 8.7 5 8.7-5"}],["path",{d:"M12 22V12"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const at=["svg",p,[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"}],["circle",{cx:"12",cy:"13",r:"3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const it=["svg",p,[["path",{d:"M20 6 9 17l-5-5"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const st=["svg",p,[["path",{d:"m6 9 6 6 6-6"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rt=["svg",p,[["path",{d:"m9 18 6-6-6-6"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nt=["svg",p,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ot=["svg",p,[["path",{d:"m18 16 4-4-4-4"}],["path",{d:"m6 8-4 4 4 4"}],["path",{d:"m14.5 4-5 16"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lt=["svg",p,[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ct=["svg",p,[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dt=["svg",p,[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["polyline",{points:"7 10 12 15 17 10"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ut=["svg",p,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pt=["svg",p,[["path",{d:"m21 21-6-6m6 6v-4.8m0 4.8h-4.8"}],["path",{d:"M3 16.2V21m0 0h4.8M3 21l6-6"}],["path",{d:"M21 7.8V3m0 0h-4.8M21 3l-6 6"}],["path",{d:"M3 7.8V3m0 0h4.8M3 3l6 6"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ht=["svg",p,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ft=["svg",p,[["path",{d:"M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"}],["path",{d:"M9 18c-4.51 2-5-2-7-2"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vt=["svg",p,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M3 15h18"}],["path",{d:"M9 3v18"}],["path",{d:"M15 3v18"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mt=["svg",p,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 16v-4"}],["path",{d:"M12 8h.01"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=["svg",p,[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bt=["svg",p,[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"}],["path",{d:"M9 18h6"}],["path",{d:"M10 22h4"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yt=["svg",p,[["polyline",{points:"15 3 21 3 21 9"}],["polyline",{points:"9 21 3 21 3 15"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xt=["svg",p,[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wt=["svg",p,[["path",{d:"M5 3v16h16"}],["path",{d:"m5 19 6-6"}],["path",{d:"m2 6 3-3 3 3"}],["path",{d:"m18 16 3 3-3 3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mt=["svg",p,[["circle",{cx:"12",cy:"12",r:"3"}],["circle",{cx:"19",cy:"5",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M10.4 21.9a10 10 0 0 0 9.941-15.416"}],["path",{d:"M13.5 2.1a10 10 0 0 0-9.841 15.416"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=["svg",p,[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=["svg",p,[["polygon",{points:"6 3 20 12 6 21 6 3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=["svg",p,[["path",{d:"M5 12h14"}],["path",{d:"M12 5v14"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=["svg",p,[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Et=["svg",p,[["path",{d:"M20 7h-9"}],["path",{d:"M14 17H5"}],["circle",{cx:"17",cy:"17",r:"3"}],["circle",{cx:"7",cy:"7",r:"3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=["svg",p,[["line",{x1:"21",x2:"14",y1:"4",y2:"4"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lt=["svg",p,[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}],["path",{d:"M20 3v4"}],["path",{d:"M22 5h-4"}],["path",{d:"M4 17v2"}],["path",{d:"M5 18H3"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=["svg",p,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 2v2"}],["path",{d:"M12 20v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"m17.66 17.66 1.41 1.41"}],["path",{d:"M2 12h2"}],["path",{d:"M20 12h2"}],["path",{d:"m6.34 17.66-1.41 1.41"}],["path",{d:"m19.07 4.93-1.41 1.41"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=["svg",p,[["path",{d:"M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=["svg",p,[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=["svg",p,[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"}]]];/**
 * @license lucide v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kt=({icons:e={},nameAttr:t="data-lucide",attrs:a={}}={})=>{if(!Object.values(e).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof document>"u")throw new Error("`createIcons()` only works in a browser environment.");const i=document.querySelectorAll(`[${t}]`);if(Array.from(i).forEach(s=>ve(s,{nameAttr:t,icons:e,attrs:a})),t==="data-lucide"){const s=document.querySelectorAll("[icon-name]");s.length>0&&(console.warn("[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"),Array.from(s).forEach(n=>ve(n,{nameAttr:"icon-name",icons:e,attrs:a})))}},r={running:!0,gi:!0,emission:2.8,bounce:1,speed:1,resolution:.75,view:0,probes:!0,probeLevel:1,probeMode:0,wireframe:!1,scene:"chamber",time:0,cameraYaw:0,cameraPitch:0,distance:14.8,stressCount:256,shadowSamples:4,emitterSize:1,bvh:!0,reflections:!0},A=[],O=[];let H=0;const U={chamber:["The light chamber","Warm and cool panels, a moving emissive orb, and deforming triangles."],windows:["Window / penumbra lab","Real window openings and mullions. An exterior area emitter casts soft shadows through the room."],primitives:["Analytic playground","Exact sphere, axis-aligned box, and capsule intersections. No triangle tessellation on WebGPU."],stress:["Geometry stress test","A seeded field of animated triangle meshes. Change object count and compare BVH vs brute force."],swarm:["Triangle swarm","64 orbiting, deforming triangles around an emissive orb."],cornell:["Stack study","Tall blocks, reflective surfaces, and contrasting emissive materials."]},b=(e,t=0,a=0)=>({color:e,emission:t,metal:a}),re=b([.46,.48,.46]),T=b([.16,.19,.19],0,.1),E=new C,me=new Ue,I=new C;function R(e,t,a,i,s=[1,1,1],n=null,l=null){const c={kind:e,geometry:t,mat:a,pos:i,scale:s,motion:n,analytic:l,matrix:new xe,rotation:new Be};return A.push(c),c}function M(e,t,a,i=re,s=null){return R(e,new ce(...t),i,a,[1,1,1],s)}function B(e,t,a,i,s=0){const n=R(e,new Le(...t),i,a);return n.rotation.y=s,n}function V(e,t,a,i,s){return R(e,new ye(t,24,16),i,a,[1,1,1],s,{type:0,size:[t,t,t]})}function te(e,t,a){return R("analytic-box",new ce(...e),a,t,[1,1,1],null,{type:1,size:e.map(i=>i/2)})}function W(e,t,a,i){return R("capsule",new Te(e,t*2,6,16),i,a,[1,1,1],null,{type:2,size:[e,t,0]})}function ae(e,t,a,i,s,n,l=0){const c=B(e,[t,a],i,b(s,n),l);return c.areaEmitter=!0,O.push({object:c,u:[Math.cos(l)*t/2,0,-Math.sin(l)*t/2],v:[0,a/2,0],radius:0}),c}function de(){const e=new Set;for(const i of A)e.has(i.geometry)||(e.add(i.geometry),i.geometry.dispose());A.length=0,O.length=0,H++;const t=B("floor",[12,11],[0,0,0],b([.32,.34,.32]));if(t.rotation.x=-Math.PI/2,B("left",[11,7],[-6,3.5,0],b([.27,.28,.26]),Math.PI/2),B("right",[11,7],[6,3.5,0],b([.24,.29,.29]),-Math.PI/2),r.scene==="windows"){M("sill",[12,1.8,.25],[0,.9,-5.5]),M("lintel",[12,1.8,.25],[0,6.1,-5.5]),M("jamb",[1.5,3.4,.25],[-5.25,3.5,-5.5]),M("jamb",[1.5,3.4,.25],[5.25,3.5,-5.5]);for(const s of[-1.5,1.5])M("mullion",[.16,3.4,.4],[s,3.5,-5.4],T);M("crossbar",[9,.13,.4],[0,3.55,-5.4],T);const i=B("ceiling",[12,11],[0,7,0],re);i.rotation.x=Math.PI/2,ae("daylight",7,4,[-2,7,-10],[1,.82,.53],9),B("sky-backdrop",[25,16],[0,5,-12],b([.24,.45,.72],.65)),M("occluder",[.7,2.1,.7],[-2.3,1.05,-1.8],b([.72,.65,.48])),M("occluder",[1.1,1.1,1.1],[.2,.55,-.2],b([.45,.56,.55])),V("sphere",.85,[2,1,-1.7],b([.65,.71,.72],0,.8),"sphere"),W(.32,.7,[-.3,1.02,-3.3],b([.68,.4,.23],0,.1))}else B("back",[12,7],[0,3.5,-5.5],re),M("warm-frame",[.14,3.9,2.4],[-5.88,2.7,-1.2],T),ae("warm-light",1.9,3.4,[-5.79,2.7,-1.2],[1,.29,.045],4,Math.PI/2),M("cool-frame",[2.5,3.7,.15],[3.1,2.7,-5.39],T),ae("cool-light",2.1,3.3,[3.1,2.7,-5.29],[.06,.68,.78],3);if(r.scene==="stress"){const i=new ce(1,1,1);let s=237;const n=()=>(s=Math.imul(s,1664525)+1013904223>>>0,s/4294967296);for(let l=0;l<r.stressCount;l++){const c=.18+n()*.38;R("stress-cube",i,b([.25+n()*.55,.3+n()*.45,.25+n()*.55],0,l%7===0?.6:0),[-5+n()*10,.4+n()*5.4,-4.5+n()*8.5],[c,c,c],`stress${l}`)}}else if(r.scene==="primitives")V("sphere",.85,[-2.4,.9,.2],b([.7,.74,.72],0,.95),"sphere"),V("matte-sphere",.7,[0,.7,-2.2],b([.68,.28,.12])),W(.45,.95,[2.6,1.4,-1.4],b([.22,.58,.51],0,.65)),W(.28,.55,[-3.7,.83,-3.2],b([.45,.24,.7])),te([1.3,1.8,1.3],[.1,.9,.5],b([.65,.68,.54],0,.3)),te([.8,.8,.8],[2.7,.4,1.6],b([.38,.55,.74]));else if(r.scene!=="windows"){M("platform",[4.8,.28,3.5],[0,.14,-.4],T),M("plinth",[2,1.25,2],[-1.15,.9,-.8],b([.55,.56,.5])),M("cube",[1.35,1.35,1.35],[-1.15,2.32,-.8],b([.61,.64,.56],0,.22),"cube"),V("sphere",.91,[1.5,1.23,.25],b([.63,.71,.68],0,.82),"sphere"),W(.3,.6,[3.8,.9,-3.8],T),te([.6,1.8,.6],[-4.4,.9,-3.6],T);for(let i=0;i<(r.scene==="swarm"?64:5);i++){const s=new Ee;s.setAttribute("position",new ze([-.55,-.35,0,.6,-.25,.08,0,.72,0],3)),s.computeVertexNormals(),R("shard",s,b(i%2?[.63,.79,.73]:[.8,.51,.25],0,.45),[.3,3.2+i*.25,-1],[1,1,1],`shard${i}`)}}const a=V("emissive-orb",.38,[0,1.2,1],b([1,.15,.035],12),"orb");return O.push({object:a,u:[.38,0,0],v:[0,.38,0],radius:.38}),Me(r.time),A}function Me(e){var t,a;for(const i of A){if(E.fromArray(i.pos),I.fromArray(i.scale),i.motion==="cube"&&(i.rotation.set(.13+Math.sin(e*.55)*.12,e*.27,.08),E.y+=Math.sin(e*.8)*.15),i.motion==="sphere"&&(E.x+=Math.sin(e*.6)*.5,E.z+=Math.cos(e*.6)*.35),i.motion==="orb"&&E.set(Math.sin(e*.65)*2.8,1.15+Math.sin(e*.9)*.35,1.6+Math.cos(e*.65)*.8),(t=i.motion)!=null&&t.startsWith("stress")){const s=Number(i.motion.slice(6));i.rotation.set(e*.16+s,e*.21+s*.17,0),E.y+=Math.sin(e*.6+s)*.1}if((a=i.motion)!=null&&a.startsWith("shard")){const s=Number(i.motion.slice(5)),n=e*.35+s*1.256,l=r.scene==="swarm"?1.3+s%5*.6:1.9;E.set(Math.cos(n)*l,3.5+Math.sin(e*.8+s)*.5,Math.sin(n)*l*.65-1),i.rotation.set(e*.2+s,n,-.3+s*.5);const c=i.geometry.attributes.position;c.setZ(1,.08+Math.sin(e+s)*.18),c.setY(2,.72+Math.cos(e*.9+s)*.14),c.needsUpdate=!0,i.geometry.computeVertexNormals(),r.scene==="swarm"&&I.setScalar(.55)}r.scene==="cornell"&&i.kind==="cube"&&(I.set(1,1.7,1),E.y+=.6),i.areaEmitter&&(I.x*=r.emitterSize,I.y*=r.emitterSize),me.setFromEuler(i.rotation),i.matrix.compose(E,me,I)}}const Y=new C,_=new C,X=new C;function It(){const e=[];for(const t of A){if(t.analytic)continue;const a=t.geometry.attributes.position,i=t.geometry.index,s=i?i.count:a.count;for(let n=0;n<s;n+=3)Y.fromBufferAttribute(a,i?i.getX(n):n).applyMatrix4(t.matrix),_.fromBufferAttribute(a,i?i.getX(n+1):n+1).applyMatrix4(t.matrix),X.fromBufferAttribute(a,i?i.getX(n+2):n+2).applyMatrix4(t.matrix),e.push(Y.x,Y.y,Y.z,0,_.x,_.y,_.z,0,X.x,X.y,X.z,0,...t.mat.color,t.mat.emission,t.mat.metal,t.kind==="floor"?1:0,0,0)}return new Float32Array(e)}function Gt(){const e=[];for(const t of A){if(!t.analytic)continue;const a=t.matrix.elements;e.push(a[12],a[13],a[14],t.analytic.type,...t.analytic.size,0,...t.mat.color,t.mat.emission,t.mat.metal,0,0,0)}return new Float32Array(e)}function $t(){const e=[];for(const t of O){const a=t.object,i=a.matrix.elements,s=t.radius?1:r.emitterSize;e.push(i[12],i[13],i[14],t.radius,...t.u.map(n=>n*s),0,...t.v.map(n=>n*s),0,...a.mat.color,a.mat.emission)}return new Float32Array(e)}function Pe(e){const t=new C(0,1.65,-.8),a=r.cameraYaw,i=.27+r.cameraPitch,s=new C(Math.sin(a)*Math.cos(i),Math.sin(i),Math.cos(a)*Math.cos(i)).multiplyScalar(r.distance).add(t),n=t.clone().sub(s).normalize(),l=n.clone().cross(new C(0,1,0)).normalize(),c=l.clone().cross(n).normalize();return{eye:s,forward:n,right:l,up:c,target:t,aspect:e}}de();const ue=`
struct Params {
 eye:vec4f, forward:vec4f, right:vec4f, up:vec4f,
 screen:vec4f, light:vec4f, flags:vec4f, counts:vec4f, debug:vec4f,
};
struct Triangle {a:vec4f,b:vec4f,c:vec4f,color:vec4f,info:vec4f};
struct Hit {t:f32, normal:vec3f, color:vec3f, emission:f32, metal:f32, floor:f32};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read> tris:array<Triangle>;
@group(0) @binding(2) var<storage,read_write> nearField:array<vec4f>;
@group(0) @binding(3) var<storage,read_write> midField:array<vec4f>;
@group(0) @binding(4) var<storage,read_write> farField:array<vec4f>;
@group(0) @binding(5) var<storage,read_write> irradiance:array<vec4f>;
struct BVHNode { lo:vec4f, hi:vec4f, leafInfo:vec4f };
struct Shape { center:vec4f, size:vec4f, color:vec4f, info:vec4f };
struct Emitter { center:vec4f, axisU:vec4f, axisV:vec4f, color:vec4f };
@group(0) @binding(7) var<storage,read> nodes:array<BVHNode>;
@group(0) @binding(8) var<storage,read> shapes:array<Shape>;
@group(0) @binding(9) var<storage,read> emitters:array<Emitter>;
fn invDir(rd:vec3f)->vec3f {return select(vec3f(-1),vec3f(1),rd>=vec3f(0))/max(abs(rd),vec3f(.00000001));}
fn slab(ro:vec3f,inv:vec3f,lo:vec3f,hi:vec3f)->vec2f {
 let a=(lo-ro)*inv;let b=(hi-ro)*inv;let mn=min(a,b);let mx=max(a,b);
 return vec2f(max(mn.x,max(mn.y,mn.z)),min(mx.x,min(mx.y,mx.z)));
}
fn triangleHit(index:u32,ro:vec3f,rd:vec3f,tmin:f32,previous:Hit)->Hit {
 let t=tris[index];let e1=t.b.xyz-t.a.xyz;let e2=t.c.xyz-t.a.xyz;let h=cross(rd,e2);let det=dot(e1,h);
 if(abs(det)<.000001){return previous;}
 let inv=1./det;let offset=ro-t.a.xyz;let v=dot(offset,h)*inv;if(v<0. || v>1.){return previous;}
 let q=cross(offset,e1);let w=dot(rd,q)*inv;if(w<0. || v+w>1.){return previous;}
 let dist=dot(e2,q)*inv;if(dist<=tmin || dist>=previous.t){return previous;}
 var n=normalize(cross(e1,e2));if(dot(n,rd)>0.){n=-n;}
 return Hit(dist,n,t.color.xyz,t.color.w,t.info.x,t.info.y);
}
fn sphereRoots(oc:vec3f,rd:vec3f,r:f32)->vec2f {
 let b=dot(oc,rd);let disc=b*b-dot(oc,oc)+r*r;if(disc<0.){return vec2f(-1);}
 let root=sqrt(disc);return vec2f(-b-root,-b+root);
}
fn trace(ro:vec3f,rd:vec3f,tmin:f32,tmax:f32)->Hit {
 var hit=Hit(tmax,vec3f(0),vec3f(0),0.,0.,0.);let inv=invDir(rd);
 if(u.light.w>.5){
  var index=0u;
  loop {
   if(index>=u32(u.counts.y)){break;}let node=nodes[index];let range=slab(ro,inv,node.lo.xyz,node.hi.xyz);
   if(range.y<max(tmin,range.x)||range.x>hit.t){index=u32(node.lo.w);continue;}
   let first=u32(node.hi.w);for(var j=0u;j<u32(node.leafInfo.x);j++){hit=triangleHit(first+j,ro,rd,tmin,hit);}index++;
  }
 }else{for(var i=0u;i<u32(u.screen.z);i++){hit=triangleHit(i,ro,rd,tmin,hit);}}
 for(var i=0u;i<u32(u.counts.x);i++){
  let shape=shapes[i];let local=ro-shape.center.xyz;var distance=hit.t;var normal=vec3f(0);
  if(shape.center.w<.5){
   let roots=sphereRoots(local,rd,shape.size.x);for(var j=0u;j<2u;j++){let t=roots[j];if(t>tmin&&t<distance){distance=t;normal=normalize(local+rd*t);}}
  }else if(shape.center.w<1.5){
   let roots=slab(local,inv,-shape.size.xyz,shape.size.xyz);
   if(roots.x<=roots.y){for(var j=0u;j<2u;j++){let t=roots[j];if(t>tmin&&t<distance){distance=t;let pos=local+rd*t;let ratio=abs(pos/shape.size.xyz);normal=vec3f(0);if(ratio.x>=ratio.y&&ratio.x>=ratio.z){normal.x=sign(pos.x);}else if(ratio.y>=ratio.z){normal.y=sign(pos.y);}else{normal.z=sign(pos.z);}}}}
  }else{
   // Vertical capsule: finite cylinder plus two hemispherical caps, exact intersections.
   let radius=shape.size.x;let halfLength=shape.size.y;let aa=dot(rd.xz,rd.xz);let bb=dot(local.xz,rd.xz);let cc=dot(local.xz,local.xz)-radius*radius;let disc=bb*bb-aa*cc;
   if(aa>.000001&&disc>=0.){let roots=vec2f(-bb-sqrt(disc),-bb+sqrt(disc))/aa;
    for(var j=0u;j<2u;j++){let t=roots[j];let pos=local+rd*t;if(t>tmin&&t<distance&&abs(pos.y)<=halfLength){distance=t;normal=normalize(vec3f(pos.x,0,pos.z));}}
   }
   for(var cap=0u;cap<2u;cap++){let signY=select(-1.,1.,cap==1u);let center=vec3f(0,signY*halfLength,0);let roots=sphereRoots(local-center,rd,radius);
    for(var j=0u;j<2u;j++){let t=roots[j];let pos=local+rd*t;if(t>tmin&&t<distance&&pos.y*signY>=halfLength){distance=t;normal=normalize(pos-center);}}
   }
  }
  if(distance<hit.t){if(dot(normal,rd)>0.){normal=-normal;}hit=Hit(distance,normal,shape.color.xyz,shape.color.w,shape.info.x,0.);}
 }
 return hit;
}
fn direction(uv:vec2f)->vec3f {
 // Equal-area spherical parameterization. Uniform samples carry equal solid angle.
 let y=1.-2.*uv.y;let r=sqrt(max(0.,1.-y*y));let phi=uv.x*6.2831853;
 return vec3f(cos(phi)*r,y,sin(phi)*r);
}
fn dims(level:u32)->vec3u {if(level==0u){return vec3u(12,6,12);}if(level==1u){return vec3u(6,3,6);}return vec3u(3,2,3);}
fn probePos(idx:u32,d:vec3u)->vec3f {let c=vec3u(idx%d.x,(idx/d.x)%d.y,idx/(d.x*d.y));return vec3f(-6,0,-5.5)+(vec3f(c)+.5)/vec3f(d)*vec3f(12,6,11);}
fn loadRadiance(level:u32,index:u32)->vec4f {if(level==0u){return nearField[index];}if(level==1u){return midField[index];}return farField[index];}
fn coarseRadiance(level:u32,pos:vec3f,uv:vec2f)->vec3f {
 let d=dims(level);let n=select(8u,16u,level==2u);let r=vec2u(clamp(uv* f32(n),vec2f(0),vec2f(f32(n)-1.)));
 let coord=(pos-vec3f(-6,0,-5.5))/vec3f(12,6,11)*vec3f(d)-.5;let base=vec3i(floor(coord));let f=fract(coord);var result=vec3f(0);
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let c=vec3u(clamp(base+vec3i(x,y,z),vec3i(0),vec3i(d)-1));let w=mix(1.-f,f,vec3f(f32(x),f32(y),f32(z)));let index=(c.x+c.y*d.x+c.z*d.x*d.y)*n*n+r.x+r.y*n;
 result+=loadRadiance(level,index).xyz*w.x*w.y*w.z;
 }}}
 return result;
}
fn lightAt(p:vec3f,n:vec3f,samples:u32)->vec3f {
 var sum=vec3f(0);let side=u32(sqrt(f32(samples)));
 for(var i=0u;i<u32(u.light.z);i++){
  let light=emitters[i];let toSurface=normalize(p-light.center.xyz);var axisU=light.axisU.xyz;var axisV=light.axisV.xyz;let radius=light.center.w;
  var area=4.*length(axisU)*length(axisV);var sourceNormal=normalize(cross(axisU,axisV));
  if(radius>0.){axisU=normalize(cross(toSurface,select(vec3f(0,1,0),vec3f(1,0,0),abs(toSurface.y)>.95)))*radius;axisV=normalize(cross(toSurface,axisU))*radius;area=3.14159265*radius*radius;sourceNormal=toSurface;}
  for(var j=0u;j<samples;j++){
   let uv=(vec2f(f32(j%side),f32(j/side))+.5)/f32(side);var sampleXY=uv*2.-1.;
   if(radius>0.){sampleXY=sqrt(uv.x)*vec2f(cos(uv.y*6.2831853),sin(uv.y*6.2831853));}
   let lp=light.center.xyz+axisU*sampleXY.x+axisV*sampleXY.y;let delta=lp-p;let dist=length(delta);let dir=delta/max(dist,.0001);let nd=max(dot(n,dir),0.);let sourceCos=abs(dot(sourceNormal,-dir));
   if(nd>0. && dist>radius+.05){let end=dist-radius-.045;let shadow=trace(p+n*.02,dir,.015,end);
    if(shadow.t>=end){sum+=light.color.xyz*light.color.w*u.light.x*nd*sourceCos*area/(3.14159265*(.05+dist*dist)*f32(samples));}
   }
  }
 }
 // Small, explicit non-GI fill; not a baked lightmap or volumetric scattering.
 return sum+vec3f(.025,.032,.04)*max(n.y*.5+.5,0.);
}
fn sampleIrradiance(p:vec3f,n:vec3f)->vec3f{
 let d=vec3u(12,6,12);let coord=(p-vec3f(-6,0,-5.5))/vec3f(12,6,11)*vec3f(d)-.5;let base=vec3i(floor(coord));let f=fract(coord);var result=vec3f(0);
 for(var z=0;z<2;z++){for(var y=0;y<2;y++){for(var x=0;x<2;x++){
 let c=vec3u(clamp(base+vec3i(x,y,z),vec3i(0),vec3i(d)-1));let w=mix(1.-f,f,vec3f(f32(x),f32(y),f32(z)));let idx=(c.x+c.y*d.x+c.z*d.x*d.y)*6u;
 let value=irradiance[idx+select(1u,0u,n.x>=0.)].xyz*n.x*n.x+irradiance[idx+select(3u,2u,n.y>=0.)].xyz*n.y*n.y+irradiance[idx+select(5u,4u,n.z>=0.)].xyz*n.z*n.z;
 result+=value*w.x*w.y*w.z;
 }}}
 return result;
}
`,Nt=ue+`
struct Level {index:u32,pad0:u32,pad1:u32,pad2:u32};
@group(0) @binding(6) var<uniform> level:Level;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id:vec3u){
 let l=level.index;let d=dims(l);let n=4u<<l;let rays=n*n;let count=d.x*d.y*d.z*rays;if(id.x>=count){return;}
 let pi=id.x/rays;let ri=id.x%rays;let uv=(vec2f(f32(ri%n),f32(ri/n))+.5)/f32(n);let dir=direction(uv);let pos=probePos(pi,d);
 var start=0.02;var end=.9;if(l==1u){start=.9;end=3.;}if(l==2u){start=3.;end=24.;}
 let hit=trace(pos,dir,start,end);var rad=vec3f(0);var visibility=1.;
 if(hit.t<end){visibility=0.;let p=pos+dir*hit.t;rad=hit.color*hit.emission*u.light.x;if(hit.emission==0.){rad=hit.color*lightAt(p,hit.normal,1u)*.32;}}
 else if(l<2u){rad=coarseRadiance(l+1u,pos,uv);}else{rad=vec3f(.018,.023,.03);}
 let value=vec4f(min(rad,vec3f(12)),visibility);
 if(l==0u){nearField[id.x]=value;}else if(l==1u){midField[id.x]=value;}else{farField[id.x]=value;}
}
`,Ot=ue+`
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=864u*6u){return;}let probe=id.x/6u;let axis=id.x%6u;
 var normal=vec3f(0);normal[axis/2u]=select(-1.,1.,axis%2u==0u);var sum=vec3f(0);var weight=0.;
 for(var i=0u;i<16u;i++){let uv=(vec2f(f32(i%4u),f32(i/4u))+.5)/4.;let w=max(dot(normal,direction(uv)),0.);sum+=nearField[probe*16u+i].xyz*w;weight+=w;}
 irradiance[id.x]=vec4f(sum/max(weight,.001),1);
}
`,Dt=ue+`
@group(0) @binding(6) var outputTex:texture_storage_2d<rgba8unorm,write>;
fn shade(ro:vec3f,rd:vec3f)->vec3f{
 let hit=trace(ro,rd,.03,60.);
 if(hit.t>=60.){return vec3f(.033,.042,.047);}
 let p=ro+rd*hit.t;var color=hit.color;
 if(hit.floor>0.){
  let grid=abs(fract(p.xz*.5+.5)-.5);let seam=1.-smoothstep(.008,.023,min(grid.x,grid.y));color*=1.-seam*.5;
 }
 let direct=lightAt(p,hit.normal,u32(u.counts.z));let indirect=sampleIrradiance(p+hit.normal*.16,hit.normal)*u.light.y;
 var lit=color*(direct+indirect*u.flags.x)*.65+color*hit.emission*u.light.x;
 if(hit.metal>.1 && u.flags.y==0. && u.debug.z>.5){
  let reflectedDir=reflect(rd,hit.normal);let rh=trace(p+hit.normal*.035,reflectedDir,.02,35.);var reflection=vec3f(.04,.055,.065);
  if(rh.t<35.){let rp=p+reflectedDir*rh.t;reflection=rh.color*(rh.emission*u.light.x+lightAt(rp,rh.normal,u32(u.counts.z))*.5+sampleIrradiance(rp+rh.normal*.16,rh.normal)*u.flags.x*.4);}
  let fresnel=.12+.88*pow(1.-max(dot(-rd,hit.normal),0.),5.);lit=mix(lit,reflection,hit.metal*(.45+fresnel*.55));
 }
 if(u.flags.y==1.){lit=color*direct*.65+color*hit.emission*u.light.x;}
 if(u.flags.y==2.){lit=indirect;}
 if(u.flags.y==3.){lit=hit.normal*.5+.5;}
 if(u.flags.w>0.){let edge=abs(fract(p*1.5)-.5);if(min(edge.x,min(edge.y,edge.z))<.016){lit=mix(lit,vec3f(.5,.85,.5),.45);}}
 return lit;
}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=u32(u.screen.x)||id.y>=u32(u.screen.y)){return;}
 let uv=(vec2f(id.xy)+.5)/u.screen.xy;
 if(u.flags.y==4.){
  let level=u32(u.debug.x);let columns=select(select(36u,12u,level==1u),6u,level==2u);let d=dims(level);let rows=d.x*d.y*d.z/columns;
  let cell=vec2u(uv*vec2f(f32(columns),f32(rows)));let local=fract(uv*vec2f(f32(columns),f32(rows)));let side=4u<<level;let bin=min(vec2u(local*f32(side)),vec2u(side-1u));
  let value=loadRadiance(level,(cell.x+cell.y*columns)*side*side+bin.x+bin.y*side);var color=pow(value.xyz/(1.+value.xyz),vec3f(1./2.2));
  if(u.debug.y==2.){color=vec3f(value.w);}if(min(local.x,local.y)<.045){color=vec3f(.035,.045,.04);}
  textureStore(outputTex,vec2i(id.xy),vec4f(color,1));return;
 }
 let xy=uv*2.-1.;let rd=normalize(u.forward.xyz+u.right.xyz*xy.x*u.screen.x/u.screen.y*.38-u.up.xyz*xy.y*.38);
 var col=shade(u.eye.xyz,rd);col=col/(col+vec3f(1.));col=pow(col,vec3f(1./2.2));
 let vignette=1.-.19*dot(xy*.65,xy*.65);col*=vignette;
 textureStore(outputTex,vec2i(id.xy),vec4f(col,1));
}
`,Ft=`
@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var samp:sampler;
struct VOut{@builtin(position) position:vec4f,@location(0) uv:vec2f};
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(p[i],0,1);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
@fragment fn fs(i:VOut)->@location(0) vec4f{return textureSample(image,samp,i.uv);}
`,Vt=`
struct Params {eye:vec4f,forward:vec4f,right:vec4f,up:vec4f,screen:vec4f,light:vec4f,flags:vec4f,counts:vec4f,debug:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read> nearField:array<vec4f>;
@group(0) @binding(2) var<storage,read> midField:array<vec4f>;
@group(0) @binding(3) var<storage,read> farField:array<vec4f>;
struct Out {@builtin(position) pos:vec4f,@location(0) local:vec2f,@location(1) color:vec3f};
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) pi:u32)->Out{
 let level=u32(u.debug.x);var d=vec3u(12,6,12);if(level==1u){d=vec3u(6,3,6);}if(level==2u){d=vec3u(3,2,3);}
 let c=vec3u(pi%d.x,(pi/d.x)%d.y,pi/(d.x*d.y));let world=vec3f(-6,0,-5.5)+(vec3f(c)+.5)/vec3f(d)*vec3f(12,6,11);
 let rel=world-u.eye.xyz;let depth=dot(rel,u.forward.xyz);
 var corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let clip=vec2f(dot(rel,u.right.xyz)/(u.screen.x/u.screen.y*.38),dot(rel,u.up.xyz)/.38);
 var out:Out;out.pos=vec4f(clip+corners[vi]*vec2f(6.+f32(level)*3.)/u.screen.xy*depth,depth*.5,depth);out.local=corners[vi];
 let count=16u<<(level*2u);var radiance=vec3f(0);var visibility=0.;
 for(var i=0u;i<count;i++){var value=vec4f(0);if(level==0u){value=nearField[pi*count+i];}else if(level==1u){value=midField[pi*count+i];}else{value=farField[pi*count+i];}radiance+=value.xyz;visibility+=value.w;}
 radiance/=f32(count);out.color=pow(radiance/(1.+radiance),vec3f(1./2.2));
 if(u.debug.y==1.){out.color=select(select(vec3f(.74,.92,.46),vec3f(.25,.85,.88),level==1u),vec3f(.9,.48,.95),level==2u);}
 if(u.debug.y==2.){out.color=vec3f(visibility/f32(count));}
 return out;
}
@fragment fn fs(v:Out)->@location(0) vec4f {let radius=length(v.local);if(radius>1.){discard;}let edge=smoothstep(.7,1.,radius);return vec4f(mix(v.color,vec3f(.8,.88,.76),edge*.55),.88);}
`;class jt{build(t){const a=t.length/20,i=Array.from({length:a},(l,c)=>c);this.nodes=[];const s=(l,c)=>(t[l*20+c]+t[l*20+4+c]+t[l*20+8+c])/3,n=(l,c)=>{const f=this.nodes.length,g={start:l,count:c-l,escape:0,left:-1,right:-1};if(this.nodes.push(g),c-l>4){const h=[1/0,1/0,1/0],d=[-1/0,-1/0,-1/0];for(let v=l;v<c;v++)for(let P=0;P<3;P++){const he=s(i[v],P);h[P]=Math.min(h[P],he),d[P]=Math.max(d[P],he)}let u=0;for(let v=1;v<3;v++)d[v]-h[v]>d[u]-h[u]&&(u=v);const x=i.slice(l,c).sort((v,P)=>s(v,u)-s(P,u));for(let v=0;v<x.length;v++)i[l+v]=x[v];const w=l+c>>1;g.count=0,g.left=n(l,w),g.right=n(w,c)}return g.escape=this.nodes.length,f};return a&&n(0,a),this.order=i,this.triangles=new Float32Array(t.length),this.data=new Float32Array(Math.max(1,this.nodes.length)*12),this.refit(t),this}refit(t){for(let a=0;a<this.order.length;a++)this.triangles.set(t.subarray(this.order[a]*20,this.order[a]*20+20),a*20);for(let a=this.nodes.length-1;a>=0;a--){const i=this.nodes[a],s=a*12,n=this.data;if(n[s]=n[s+1]=n[s+2]=1/0,n[s+4]=n[s+5]=n[s+6]=-1/0,i.count)for(let l=i.start;l<i.start+i.count;l++)for(let c=0;c<3;c++)for(let f=0;f<3;f++){const g=this.triangles[l*20+c*4+f];n[s+f]=Math.min(n[s+f],g-1e-4),n[s+4+f]=Math.max(n[s+4+f],g+1e-4)}else for(const l of[i.left,i.right])for(let c=0;c<3;c++)n[s+c]=Math.min(n[s+c],n[l*12+c]),n[s+4+c]=Math.max(n[s+4+c],n[l*12+4+c]);n[s+3]=i.escape,n[s+7]=i.start,n[s+8]=i.count}return this}}class Ht{async init(t){var f,g;if(!navigator.gpu)throw new Error("WebGPU is not available in this browser.");const a=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!a)throw new Error("No WebGPU adapter found.");this.timestamp=a.features.has("timestamp-query"),this.device=await a.requestDevice({requiredFeatures:this.timestamp?["timestamp-query"]:[]});const i=this.device;this.canvas=t,this.context=t.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.context.configure({device:i,format:this.format,alphaMode:"opaque"}),this.name=((f=a.info)==null?void 0:f.description)||((g=a.info)==null?void 0:g.device)||"WebGPU device",this.allocations=[];const s=(h,d)=>{const u=i.createBuffer({size:h,usage:d});return this.allocations.push(u),u};this.buffer=s,this.bvh=new jt,this.uniform=s(144,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST),this.sceneBuffers={},this.ensureSceneBuffer("triangles",80),this.ensureSceneBuffer("nodes",48),this.ensureSceneBuffer("shapes",64),this.ensureSceneBuffer("emitters",64),this.fields=[13824,6912,4608,5184].map(h=>s(h*16,GPUBufferUsage.STORAGE)),this.levels=[0,1,2].map(h=>{const d=s(16,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);return i.queue.writeBuffer(d,0,new Uint32Array([h,0,0,0])),d});const n=async(h,d)=>{const u=i.createShaderModule({code:h,label:d}),w=(await u.getCompilationInfo()).messages.filter(v=>v.type==="error");if(w.length)throw new Error(w.map(v=>`${d}:${v.lineNum}: ${v.message}`).join(`
`));return i.createComputePipelineAsync({label:d,layout:"auto",compute:{module:u,entryPoint:"main"}})};this.cp=await n(Nt,"Radiance cascade"),this.gp=await n(Ot,"Irradiance gather"),this.rp=await n(Dt,"Scene shading"),this.gbg=i.createBindGroup({layout:this.gp.getBindGroupLayout(0),entries:[{binding:2,resource:{buffer:this.fields[0]}},{binding:5,resource:{buffer:this.fields[3]}}]});const l=i.createShaderModule({code:Ft});this.bp=i.createRenderPipeline({layout:"auto",vertex:{module:l,entryPoint:"vs"},fragment:{module:l,entryPoint:"fs",targets:[{format:this.format}]},primitive:{topology:"triangle-list"}});const c=i.createShaderModule({code:Vt,label:"Probe overlay"});return this.pp=i.createRenderPipeline({layout:"auto",vertex:{module:c,entryPoint:"vs"},fragment:{module:c,entryPoint:"fs",targets:[{format:this.format,blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}}}]},primitive:{topology:"triangle-list"}}),this.pbg=i.createBindGroup({layout:this.pp.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},...this.fields.slice(0,3).map((h,d)=>({binding:d+1,resource:{buffer:h}}))]}),this.sampler=i.createSampler({magFilter:"linear",minFilter:"linear"}),this.timestamp&&(this.queries=i.createQuerySet({type:"timestamp",count:2}),this.queryBuffer=s(16,GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC),this.readBuffer=s(16,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ)),this.gpuMs=null,this.pending=!1,i.lost.then(h=>{var d;return(d=this.onError)==null?void 0:d.call(this,new Error(`GPU device lost: ${h.message}`))}),i.addEventListener("uncapturederror",h=>{var d;console.error(h.error),(d=this.onError)==null||d.call(this,h.error)}),this.rebindScene(),this.resize(),this}ensureSceneBuffer(t,a){const i=this.sceneBuffers[t];if(i&&i.size>=a)return!1;const s=Math.max(256,2**Math.ceil(Math.log2(Math.max(a,1))));return i&&(i.destroy(),this.allocations.splice(this.allocations.indexOf(i),1)),this.sceneBuffers[t]=this.buffer(s,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),!0}sceneEntries(){return[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:{buffer:this.sceneBuffers.triangles}},...this.fields.map((t,a)=>({binding:a+2,resource:{buffer:t}})),...["nodes","shapes","emitters"].map((t,a)=>({binding:a+7,resource:{buffer:this.sceneBuffers[t]}}))]}rebindScene(){const t=this.sceneEntries();this.cbg=this.levels.map(a=>this.device.createBindGroup({layout:this.cp.getBindGroupLayout(0),entries:[...t.filter(i=>i.binding!==5),{binding:6,resource:{buffer:a}}]})),this.texture&&this.bindOutput()}bindOutput(){this.rbg=this.device.createBindGroup({layout:this.rp.getBindGroupLayout(0),entries:[...this.sceneEntries(),{binding:6,resource:this.texture.createView()}]})}get memory(){const t=this.allocations.reduce((i,s)=>i+s.size,0),a=this.canvas.width*this.canvas.height*4;return{buffers:t,textures:a,total:t+a+(this.captureBytes||0)}}resize(){var i;const t=Math.max(1,Math.floor(this.canvas.clientWidth*Math.min(devicePixelRatio,1.5)*r.resolution)),a=Math.max(1,Math.floor(this.canvas.clientHeight*Math.min(devicePixelRatio,1.5)*r.resolution));t===this.canvas.width&&a===this.canvas.height&&this.texture||(this.canvas.width=t,this.canvas.height=a,(i=this.texture)==null||i.destroy(),this.texture=this.device.createTexture({size:[t,a],format:"rgba8unorm",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.bindOutput(),this.bbg=this.device.createBindGroup({layout:this.bp.getBindGroupLayout(0),entries:[{binding:0,resource:this.texture.createView()},{binding:1,resource:this.sampler}]}))}render(){const t=performance.now();this.resize();const a=this.device,i=Pe(this.canvas.width/this.canvas.height),s=It();this.sceneVersion!==H?(this.bvh.build(s),this.sceneVersion=H):this.bvh.refit(s);const n=this.bvh.triangles,l=Gt(),c=$t();this.triangleCount=n.length/20,this.analyticCount=l.length/16,this.nodeCount=this.bvh.nodes.length;const f={triangles:n,nodes:this.bvh.data,shapes:l,emitters:c};let g=!1;for(const[v,P]of Object.entries(f))g=this.ensureSceneBuffer(v,P.byteLength)||g,a.queue.writeBuffer(this.sceneBuffers[v],0,P);g&&this.rebindScene();const h=new Float32Array([...i.eye,0,...i.forward,0,...i.right,0,...i.up,0,this.canvas.width,this.canvas.height,this.triangleCount,r.time,r.emission,r.bounce,c.length/16,r.bvh?1:0,r.gi?1:0,r.view,r.probes?1:0,r.wireframe?1:0,this.analyticCount,this.nodeCount,r.shadowSamples,0,r.probeLevel,r.probeMode,r.reflections?1:0,r.emitterSize]);a.queue.writeBuffer(this.uniform,0,h),this.cpuMs=performance.now()-t;const d=a.createCommandEncoder(),u=this.timestamp&&!this.pending,x=d.beginComputePass(u?{timestampWrites:{querySet:this.queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{});if(x.setPipeline(this.cp),r.gi||r.view===2||r.view===4||r.probes){for(const v of[2,1,0])x.setBindGroup(0,this.cbg[v]),x.dispatchWorkgroups(Math.ceil([13824,6912,4608][v]/64));x.setPipeline(this.gp),x.setBindGroup(0,this.gbg),x.dispatchWorkgroups(81)}x.setPipeline(this.rp),x.setBindGroup(0,this.rbg),x.dispatchWorkgroups(Math.ceil(this.canvas.width/8),Math.ceil(this.canvas.height/8)),x.end();const w=d.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:1}}]});return w.setPipeline(this.bp),w.setBindGroup(0,this.bbg),w.draw(3),r.probes&&r.view!==4&&(w.setPipeline(this.pp),w.setBindGroup(0,this.pbg),w.draw(6,[864,108,18][r.probeLevel])),w.end(),u&&(d.resolveQuerySet(this.queries,0,2,this.queryBuffer,0),d.copyBufferToBuffer(this.queryBuffer,0,this.readBuffer,0,16)),a.queue.submit([d.finish()]),u&&(this.pending=!0,this.readBuffer.mapAsync(GPUMapMode.READ).then(()=>{const v=new BigUint64Array(this.readBuffer.getMappedRange());this.gpuMs=Number(v[1]-v[0])/1e6,this.readBuffer.unmap(),this.pending=!1}).catch(()=>{this.pending=!1})),a.queue.onSubmittedWorkDone()}async capture(){const t=this.device,a=this.canvas.width,i=this.canvas.height,s=Math.ceil(a*4/256)*256,n=t.createBuffer({size:s*i,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),l=t.createTexture({size:[a,i],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});this.captureBytes=s*i+a*i*4;const c=t.createCommandEncoder(),f=c.beginRenderPass({colorAttachments:[{view:l.createView(),loadOp:"clear",storeOp:"store"}]});f.setPipeline(this.bp),f.setBindGroup(0,this.bbg),f.draw(3),r.probes&&r.view!==4&&(f.setPipeline(this.pp),f.setBindGroup(0,this.pbg),f.draw(6,[864,108,18][r.probeLevel])),f.end(),c.copyTextureToBuffer({texture:l},{buffer:n,bytesPerRow:s},[a,i]),t.queue.submit([c.finish()]),await n.mapAsync(GPUMapMode.READ);const g=new Uint8Array(n.getMappedRange()),h=new Uint8ClampedArray(a*i*4);for(let u=0;u<i;u++)h.set(g.subarray(u*s,u*s+a*4),u*a*4);if(this.format.startsWith("bgra"))for(let u=0;u<h.length;u+=4){const x=h[u];h[u]=h[u+2],h[u+2]=x}n.unmap(),n.destroy(),l.destroy(),this.captureBytes=0;const d=document.createElement("canvas");return d.width=a,d.height=i,d.getContext("2d").putImageData(new ImageData(h,a,i),0,0),new Promise(u=>d.toBlob(u,"image/png"))}destroy(){var t;this.onError=null,(t=this.device)==null||t.destroy()}}class qt{async init(t){this.canvas=t,this.renderer=new Re({canvas:t,antialias:!0,preserveDrawingBuffer:!0}),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=ke,this.renderer.toneMapping=Ie,this.renderer.toneMappingExposure=1.05,this.scene=new Ge,this.scene.background=new q("#161e21"),this.camera=new $e(41.6,1,.1,100),this.fill=new Ne("#c9e2e1","#29271d",.4),this.scene.add(this.fill);const a=new Oe(12,12,"#242a28","#252c2c");a.position.y=.008,this.scene.add(a),this.grid=a;const i=new ye(.045,6,4);return this.probes=[[12,6,12],[6,3,6],[3,2,3]].map((s,n)=>{const[l,c,f]=s,g=new De(i,new Fe({color:["#c6f578","#50dbe0","#e28ff2"][n],transparent:!0,opacity:.8,depthTest:!1}),l*c*f);let h=0;const d=new xe;for(let u=0;u<f;u++)for(let x=0;x<c;x++)for(let w=0;w<l;w++)d.makeTranslation(-6+(w+.5)*12/l,(x+.5)*6/c,-5.5+(u+.5)*11/f),g.setMatrixAt(h++,d);return this.scene.add(g),g}),this.name="WebGL2 preview",this.gpuMs=null,this.syncScene(),this}syncScene(){for(const t of this.meshes||[])this.scene.remove(t),t.material.dispose();for(const t of this.sceneLights||[])this.scene.remove(t),t.dispose();this.meshes=A.map(t=>{const a=new Ve({color:new q(...t.mat.color),emissive:new q(...t.mat.color),emissiveIntensity:t.mat.emission,metalness:t.mat.metal,roughness:t.mat.metal>.7?.2:.47,side:fe}),i=new je(t.geometry,a);return i.matrixAutoUpdate=!1,i.castShadow=!t.mat.emission,i.receiveShadow=!0,this.scene.add(i),i}),this.sceneLights=O.map(t=>{const a=new He(new q(...t.object.mat.color),10,40,2);return a.castShadow=!0,a.shadow.mapSize.set(512,512),a.shadow.camera.near=.1,a.shadow.camera.far=40,a.shadow.normalBias=.035,a.shadow.bias=-3e-4,a.shadow.radius=3,this.scene.add(a),a}),this.sceneVersion=H,this.triangleCount=A.reduce((t,a)=>{var i;return t+(((i=a.geometry.index)==null?void 0:i.count)??a.geometry.attributes.position.count)/3},0),this.analyticCount=0}render(){this.sceneVersion!==H&&this.syncScene();const t=this.canvas.clientWidth,a=this.canvas.clientHeight;(this.width!==t||this.height!==a||this.scale!==r.resolution)&&(this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*r.resolution),this.renderer.setSize(t,a,!1),this.width=t,this.height=a,this.scale=r.resolution);const i=Pe(t/a);this.camera.aspect=t/a,this.camera.position.copy(i.eye),this.camera.lookAt(i.target),this.camera.updateProjectionMatrix(),this.meshes.forEach((s,n)=>{s.matrix.copy(A[n].matrix),s.material.wireframe=r.wireframe,s.material.emissiveIntensity=A[n].mat.emission*r.emission*.65,s.material.metalness=r.reflections?A[n].mat.metal:0}),this.sceneLights.forEach((s,n)=>{const l=O[n],c=l.object.matrix.elements;s.position.set(c[12],c[13],c[14]);const f=l.radius?Math.PI*l.radius*l.radius:4*new C(...l.u).length()*new C(...l.v).length()*r.emitterSize**2;s.intensity=r.view===2?0:r.emission*l.object.mat.emission*f*.8}),this.fill.intensity=r.gi?.18+r.bounce*.18:.05,r.view===1&&(this.fill.intensity=.05),r.view===2&&(this.fill.intensity=.7*r.bounce),this.probes.forEach((s,n)=>{s.visible=r.probes&&r.probeLevel===n}),this.scene.overrideMaterial=r.view===3?this.normalMat??(this.normalMat=new qe({side:fe})):null,this.renderer.render(this.scene,this.camera)}async capture(){return this.render(),new Promise(t=>this.canvas.toBlob(t,"image/png"))}destroy(){var t;for(const a of this.meshes||[])a.material.dispose();for(const a of this.sceneLights||[])a.dispose();for(const a of this.probes||[])a.geometry.dispose(),a.material.dispose(),a.dispose();this.grid.geometry.dispose(),this.grid.material.dispose(),(t=this.normalMat)==null||t.dispose(),this.renderer.dispose()}}const m=(e,t="")=>`<i data-lucide="${e}" class="${t}"></i>`,G=(e,t=!0)=>`<button class="switch ${t?"on":""}" id="${e}" role="switch" aria-checked="${t}" aria-label="${e.replaceAll("-"," ")}"><span></span></button>`;document.querySelector("#app").innerHTML=`
<header class="topbar"><a class="brand" href="./index.html" aria-label="Cascade lab home"><span class="brand-icon">${m("layers-3")}</span>cascade<span class="brand-suffix">/ lab</span><span class="version">v0.2</span></a><nav aria-label="Main navigation"><button class="nav active" data-nav="playground">Playground</button><button class="nav" data-nav="technique">The technique ${m("arrow-up-right")}</button><button class="nav" data-nav="integration">Integration ${m("arrow-up-right")}</button></nav><button class="source-button" id="source">${m("code-2")} Renderer notes ${m("arrow-up-right")}</button></header>
<main>
<section class="page-heading"><div><div class="eyebrow"><span class="tiny-dot"></span> REAL-TIME GLOBAL ILLUMINATION</div><h1>Light, without the wait<span>.</span></h1><p>Explore 3D radiance cascades. Dynamic geometry. Every frame.</p></div><div class="heading-right"><div class="engine-pill"><span class="status-dot"></span><span id="engine-status">Initializing WebGPU</span></div><span class="experimental">EXPERIMENTAL RENDERER</span></div></section>
<div class="workspace">
<aside class="controls"><div class="panel-heading">${m("sliders-horizontal")} <h2>Scene controls</h2><button class="icon-button" id="reset" aria-label="Reset all settings" title="Reset all settings">${m("rotate-ccw")}</button></div>
<div class="control-section"><label class="section-label" for="scene-select">SCENE</label><div class="select-wrap">${m("box")}<select id="scene-select">${Object.entries(U).map(([e,t])=>`<option value="${e}">${t[0]}</option>`).join("")}</select>${m("chevron-down")}</div><div class="scene-description">${U.chamber[1]}</div><div class="scene-tags"><span>3D WORLD</span><span>DYNAMIC</span></div><div id="stress-controls" hidden><div class="resolution-control"><label for="stress-count">Mesh instances</label><select id="stress-count"><option value="64">64</option><option value="256" selected>256</option><option value="768">768</option><option value="1536">1,536</option></select></div><p class="control-help">12 triangles per cube. A CPU-refitted BVH handles the moving triangle field.</p></div></div>
<div class="control-section"><div class="section-title"><span class="section-label">RADIANCE CASCADES</span><span class="tiny-badge">GI</span></div><div class="control-row"><label for="enable-gi">Global illumination</label>${G("enable-gi")}</div><div class="range-label"><label for="bounce">Indirect intensity</label><output id="bounce-value">1.00<span>×</span></output></div><input id="bounce" type="range" min="0" max="2" step=".05" value="1"><div class="range-ends"><span>Subtle</span><span>Amplified</span></div><div class="static-control"><span>Cascade levels</span><span class="step-count">3 <span>levels</span> ${m("layers-3")}</span></div><div class="cascade-scale"><span>C0</span><span>C1</span><span>C2</span></div><div class="cascade-hint">Near-field detail → far-field coverage</div></div>
<div class="control-section"><span class="section-label">LIGHT & MOTION</span><div class="range-label"><label for="emission">Emission strength</label><output id="emission-value">2.8<span>×</span></output></div><input id="emission" type="range" min=".2" max="6" step=".1" value="2.8"><div class="range-label"><label for="emitter-size">Area emitter size</label><output id="emitter-size-value">1.0<span>×</span></output></div><input id="emitter-size" type="range" min=".15" max="2" step=".05" value="1"><div class="resolution-control"><label for="shadow-samples">Shadow samples</label><select id="shadow-samples"><option value="1">1 · hard</option><option value="4" selected>4 · fast</option><option value="16">16 · soft</option><option value="64">64 · smooth</option></select></div><div class="light-swatches"><span><b class="warm-dot"></b>Warm emitter</span><span><b class="cool-dot"></b>Cool emitter</span></div><div class="control-row motion-row"><label for="animate">Animate geometry</label>${G("animate")}</div><div class="range-label"><label for="speed">Animation speed</label><output id="speed-value">1.0<span>×</span></output></div><input id="speed" type="range" min=".1" max="2" step=".1" value="1"></div>
<div class="control-section debug-section"><span class="section-label">VISUALIZATION</span><div class="control-row"><label for="show-probes">Probe overlay</label>${G("show-probes",!0)}</div><div class="resolution-control"><label for="probe-level">Probe level</label><select id="probe-level"><option value="0">C0 · 864</option><option value="1" selected>C1 · 108</option><option value="2">C2 · 18</option></select></div><div class="resolution-control"><label for="probe-mode">Probe colors</label><select id="probe-mode"><option value="0">Radiance</option><option value="1">Cascade ID</option><option value="2">Visibility</option></select></div><p class="control-help">X-ray probe markers. Radiance = average merged light; visibility = interval miss fraction.</p><div class="control-row"><label for="wireframe">Surface grid / wireframe</label>${G("wireframe",!1)}</div><div class="resolution-control"><label for="resolution">Render scale</label><select id="resolution"><option value=".5">50%</option><option value=".75" selected>75%</option><option value="1">100%</option></select></div></div>
<div class="control-section acceleration-section"><span class="section-label">RAY TRACING</span><div class="control-row"><label for="bvh">Triangle BVH</label>${G("bvh")}</div><div class="control-row"><label for="reflections">Traced reflections</label>${G("reflections")}</div><p class="control-help">One reflected ray per reflective hit. Exact sphere, box & capsule tests; no SSR.</p></div><div class="controls-footer">${m("info")}<span>All geometry and lighting update live.</span></div></aside>
<section class="renderer-panel" aria-label="Interactive 3D renderer"><div class="viewport-toolbar"><div class="view-tabs" role="tablist" aria-label="Render view"><button class="view-tab active" data-view="0" role="tab" aria-selected="true">${m("box")} Lit</button><button class="view-tab" data-view="1" role="tab" aria-selected="false">Direct only</button><button class="view-tab" data-view="2" role="tab" aria-selected="false">Indirect</button><button class="view-tab" data-view="3" role="tab" aria-selected="false">Normals</button><button class="view-tab" data-view="4" role="tab" aria-selected="false">Probe atlas</button></div><div class="viewport-actions"><button class="icon-button" id="snapshot" aria-label="Download viewport image" title="Save image">${m("camera")}</button><span></span><button class="icon-button" id="fullscreen" aria-label="Expand viewport" title="Fullscreen">${m("maximize-2")}</button></div></div>
<div class="viewport" id="viewport"><canvas id="scene-canvas" aria-label="3D light chamber with animated geometry"></canvas><div class="viewport-title"><span class="live-tag"><b></b> LIVE</span><span id="scene-title">THE LIGHT CHAMBER</span></div><div class="viewport-top-right"><span id="render-api">WEBGPU</span><span class="quality-label">REAL-TIME</span></div><div class="loading" id="loading"><div class="loader-orbit"></div><span>Building the light field</span><small>Initializing renderer & shaders</small></div><div class="probe-legend" id="probe-legend"></div><div class="viewport-bottom-left"><div class="axis-widget"><span class="axis-y">Y</span><span class="axis-z">Z</span><span class="axis-x">X</span><i></i></div><span class="perspective-label">PERSPECTIVE</span></div><div class="viewport-hint">${m("orbit")} Drag to orbit <span>·</span> Scroll to zoom</div><button class="reset-camera" id="reset-camera" aria-label="Reset camera" title="Reset camera">${m("focus")}</button><div class="fallback-notice" id="fallback-notice" hidden>WebGL preview <span>·</span> WebGPU needed for cascades ${m("circle-help")}</div></div>
<div class="playback-bar"><button class="play-button" id="play" aria-label="Pause animation">${m("pause")}</button><div class="playback-state"><span id="playback-state">Simulation running</span><span><b class="small-dot"></b> Dynamic triangles</span></div><div class="waveform" aria-hidden="true">${Array.from({length:42},(e,t)=>`<i style="--h:${6+Math.sin(t*.7)**2*14}px;--d:${t*.035}s"></i>`).join("")}</div><span class="timecode" id="timecode">00:00.00</span><button class="icon-button" id="restart" aria-label="Restart simulation" title="Restart simulation">${m("rotate-ccw")}</button><div class="playback-divider"></div><span class="frame-tag">FRAME <span id="frame-count">0000</span></span></div>
<div class="metrics"><div class="metric"><div class="metric-label">${m("activity")} FRAME RATE</div><div class="metric-value"><span id="fps">—</span><small>fps</small><span class="metric-sparkline"></span></div></div><div class="metric"><div class="metric-label">${m("zap")} GPU TIME</div><div class="metric-value"><span id="gpu-time">—</span><small>ms</small><span class="metric-detail" id="timing-label">compute</span></div></div><div class="metric"><div class="metric-label">${m("grid-3x3")} RADIANCE PROBES</div><div class="metric-value"><span id="probe-count">990</span><span class="metric-detail" id="probe-detail">across 3 cascades</span></div></div><div class="metric"><div class="metric-label">${m("triangle")} SCENE GEOMETRY</div><div class="metric-value"><span id="triangle-count">—</span><small>tris</small><span class="dynamic-tag">DYNAMIC</span></div></div></div>
<div class="telemetry"><button class="telemetry-item" id="memory-info" title="What this memory estimate includes"><span>VRAM ALLOCATION · EST.</span><strong><b id="vram">—</b> <small>MiB</small> ${m("circle-help")}</strong></button><div class="telemetry-item"><span>ACCELERATION</span><strong id="bvh-status">BVH · refit</strong></div><div class="telemetry-item"><span>ANALYTIC SHAPES</span><strong id="shape-count">—</strong></div><div class="telemetry-item"><span>CPU PACK + BVH</span><strong><b id="cpu-time">—</b> <small>ms</small></strong></div></div>
</section></div>
<section class="scene-library"><div class="library-title"><span class="section-label">EXPLORE THE TEST SCENES</span><span>Same renderer. Different challenges.</span></div><div class="scene-buttons">${Object.entries(U).map(([e,t],a)=>`<button data-scene="${e}" class="scene-card ${e==="chamber"?"selected":""}"><span class="scene-number">0${a+1}</span>${m(["box","sun","orbit","grid-3x3","triangle","layers-3"][a])}<strong>${t[0]}</strong><span>${["Color bleed & motion","Area light & penumbra","Exact ray intersections","Up to 18,432 cube tris","64 deforming triangles","Occlusion & reflections"][a]}</span></button>`).join("")}</div></section>
<section class="bottom-strip"><div class="experiment-note"><span class="note-icon">${m("sparkles")}</span><div><h3>A small scene. A bigger possibility.</h3><p>No lightmaps. No baking. Just light that keeps up with your world.</p></div></div><button id="how-it-works">How radiance cascades work ${m("arrow-up-right")}</button></section>
<footer><span><b class="footer-dot"></b> Built for the next frame.</span><div>3D radiance cascades <span>/</span> WebGPU <span>/</span> Open experiment</div><button id="shortcuts">${m("command")} Keyboard shortcuts</button></footer>
</main><dialog id="info-dialog"><button class="dialog-close icon-button" aria-label="Close dialog">${m("x")}</button><div id="dialog-content"></div></dialog><div id="toast" role="status"></div>`;const Wt={Aperture:Ke,ArrowUpRight:Je,Box:tt,ChevronDown:st,ChevronRight:rt,CircleHelp:nt,Code2:ot,Copy:ct,Download:dt,Expand:pt,Focus:ht,Github:ft,Layers3:gt,Lightbulb:bt,Maximize2:yt,MoreHorizontal:ut,Move3d:wt,Orbit:Mt,Pause:Pt,Play:At,Plus:St,RotateCcw:Ct,Settings2:Et,SlidersHorizontal:zt,Sparkles:Lt,Triangle:Bt,X:Ut,Zap:Rt,Check:it,Monitor:xt,Activity:Ze,Sun:Tt,Grid3x3:vt,BookOpen:et,Camera:at,Info:mt,Command:lt},Ae=()=>kt({icons:Wt});Ae();const o=e=>document.querySelector(e),N=o("#info-dialog"),Se='<div class="eyebrow">THE TECHNIQUE</div><h2>More reach.<br>Less redundant work.</h2><p>Radiance cascades trade spatial detail for angular detail. Nearby light is sampled on a dense probe grid; distant light uses fewer probes with more ray directions.</p><div class="level-cards"><div><b>C0</b><strong>864 probes</strong><span>16 directions · 0–0.9 m</span></div><div><b>C1</b><strong>108 probes</strong><span>64 directions · 0.9–3 m</span></div><div><b>C2</b><strong>18 probes</strong><span>256 directions · 3–24 m</span></div></div><h3>What actually runs here</h3><p>Every frame, the CPU transforms moving triangles and uploads them to a WebGPU storage buffer. Compute shaders trace 25,344 interval rays from far to near, merging unoccluded radiance from the next cascade. Six directional irradiance lobes are gathered per near-field probe and trilinearly sampled for shading.</p><h3>An experiment, not a solved renderer</h3><p>This prototype uses a CPU-built, per-frame refitted triangle BVH; exact spheres, axis-aligned boxes and capsules; approximate spatial merging; and direct lighting at ray hits. It has no temporal accumulation, visibility-aware interpolation, or full multi-bounce transport. Expect light leaks, probe bias, and device-dependent frame rates. “Indirect” shows the gathered radiance term, which also contains visible emitter energy.</p>',Yt='<div class="eyebrow">ENGINE INTEGRATION</div><h2>From the lab<br>to your game.</h2><p>This is a working WebGPU research prototype, not a drop-in production GI solution. The rendering stages are separated so you can experiment with your own engine.</p><ol class="integration-list"><li><b>Upload the world</b><span><code>src/scene.js</code> transforms triangle vertices every frame. The CPU median-split BVH in <code>src/bvh.js</code> is flattened with escape indices and refitted each frame. For larger games, use a higher-quality build and GPU refitting.</span></li><li><b>Trace & merge</b><span><code>src/shaders.js</code> traces three distance intervals, merges far-to-near, and gathers directional irradiance.</span></li><li><b>Light the frame</b><span><code>src/gpu.js</code> schedules compute dispatches, updates storage buffers, and presents the final image.</span></li></ol><h3>Before shipping</h3><p>Improve BVH build quality, add GPU refitting, visibility-aware probe interpolation, temporal filtering, adaptive budgets, and engine-specific material evaluation. Measure on your target GPU. The FPS counter measures the browser frame loop; GPU time uses hardware timestamp queries when available.</p><div class="dialog-callout">Requires WebGPU over HTTPS or localhost. The WebGL fallback is only a raster preview and does not execute radiance cascades.</div>',_t=`<div class="eyebrow">RENDERER v0.2</div><h2>What's tracing your light?</h2><h3>Triangle acceleration</h3><p>A median-split BVH is built on scene changes, refitted on the CPU every frame, and traversed stacklessly in WGSL. The same BVH serves primary, shadow, reflection and cascade rays. The toggle permits a brute-force comparison at smaller stress counts.</p><h3>Reflections and analytic geometry</h3><p>One perfect reflected ray is traced at reflective surfaces, blended with a Fresnel-like weight. This is neither screen-space reflection nor recursive path tracing. Spheres, axis-aligned boxes and vertical capsules use exact intersections in a separate small list (not the triangle BVH).</p><h3>Penumbra, not fog</h3><p>The window room has actual openings and occluding mullions. Direct light samples the exterior rectangle. Increase shadow samples to 16 or 64 and change emitter size to see the penumbra change. There is no volumetric fog: you see light on surfaces, not visible shafts in empty air. The moving ball is emissive in the cascade and a disk approximation is sampled for its direct light.</p><h3>Probe visualization</h3><p>The overlay draws the selected level through walls. Radiance colors come from the actual merged GPU buffer; visibility shows the fraction of rays with no hit in that interval. Probe atlas tiles show individual directional bins. Selecting Cascade ID only changes marker colors, not the atlas.</p><div class="dialog-callout">“WebGPU active” means the actual compute path. “WebGL preview” is a separate, conventional raster fallback with no cascade solve.</div>`;function k(e){o("#dialog-content").innerHTML=e,N.showModal()}o('[data-nav="technique"]').onclick=()=>k(Se);o('[data-nav="integration"]').onclick=()=>k(Yt);o("#source").onclick=()=>k(_t);o("#how-it-works").onclick=()=>k(Se);o(".dialog-close").onclick=()=>N.close();N.onclick=e=>{e.target===N&&N.close()};o("#shortcuts").onclick=()=>k('<div class="eyebrow">TAKE CONTROL</div><h2>Stay in the flow.</h2><div class="shortcut"><span>Play / pause simulation</span><kbd>Space</kbd></div><div class="shortcut"><span>Reset camera</span><kbd>R</kbd></div><div class="shortcut"><span>Toggle global illumination</span><kbd>G</kbd></div><div class="shortcut"><span>Toggle probe overlay</span><kbd>P</kbd></div><div class="shortcut"><span>Expand viewport</span><kbd>F</kbd></div><div class="shortcut"><span>Orbit / zoom</span><kbd>Drag / Scroll</kbd></div>');function S(e){o("#toast").textContent=e,o("#toast").classList.add("visible"),clearTimeout(window.toastTimer),window.toastTimer=setTimeout(()=>o("#toast").classList.remove("visible"),3200)}function D(e,t){o(e).classList.toggle("on",t),o(e).setAttribute("aria-checked",String(t))}function J(e){r.running=e,D("#animate",e),o("#play").innerHTML=m(e?"pause":"play"),o("#play").setAttribute("aria-label",e?"Pause animation":"Play animation"),o("#playback-state").textContent=e?"Simulation running":"Simulation paused",o(".waveform").classList.toggle("paused",!e),Ae()}o("#animate").onclick=()=>J(!r.running);o("#play").onclick=()=>J(!r.running);for(const[e,t]of[["enable-gi","gi"],["show-probes","probes"],["wireframe","wireframe"],["bvh","bvh"],["reflections","reflections"]])o(`#${e}`).onclick=()=>{if(t==="bvh"&&r.scene==="stress"&&r.stressCount>256){S("Use 64 or 256 cubes for a safe brute-force comparison.");return}r[t]=!r[t],D(`#${e}`,r[t]),F()};function ge(e){e.style.setProperty("--progress",`${(e.value-e.min)/(e.max-e.min)*100}%`)}for(const[e,t,a]of[["bounce","bounce",2],["emission","emission",1],["speed","speed",1],["emitter-size","emitterSize",2]]){const i=o(`#${e}`);i.oninput=()=>{r[t]=Number(i.value),o(`#${e}-value`).innerHTML=`${r[t].toFixed(a)}<span>×</span>`,ge(i)},ge(i)}o("#resolution").onchange=e=>{r.resolution=Number(e.target.value)};function F(){const e=o("#probe-legend");e.hidden=!r.probes&&r.view!==4,e.textContent=z?"Illustrative probe layout · no cascade data":r.view===4?`C${r.probeLevel} DIRECTION ATLAS · ${r.probeMode===2?"INTERVAL VISIBILITY":"MERGED RADIANCE"}`:`C${r.probeLevel} · ${[864,108,18][r.probeLevel]} PROBES · ${["RADIANCE","CASCADE ID","VISIBILITY"][r.probeMode]} · X-RAY`}function ee(e){r.scene=e,r.time=0,K=0,pe(),o("#scene-select").value=e,o("#scene-title").textContent=U[e][0].toUpperCase(),o(".scene-description").textContent=U[e][1],o("#stress-controls").hidden=e!=="stress",document.querySelectorAll("[data-scene]").forEach(t=>t.classList.toggle("selected",t.dataset.scene===e)),e==="windows"&&(r.shadowSamples=16,o("#shadow-samples").value="16",r.probes=!1,D("#show-probes",!1)),e==="stress"&&(r.bvh=!0,D("#bvh",!0),r.shadowSamples=1,o("#shadow-samples").value="1"),de(),F(),S(`${U[e][0]} loaded`)}o("#scene-select").onchange=e=>ee(e.target.value);for(const e of document.querySelectorAll("[data-scene]"))e.onclick=()=>ee(e.dataset.scene);o("#stress-count").onchange=e=>{r.stressCount=Number(e.target.value),r.stressCount>256&&(r.bvh=!0,D("#bvh",!0)),de(),S(`${r.stressCount.toLocaleString()} dynamic cubes`)};for(const[e,t]of[["shadow-samples","shadowSamples"],["probe-level","probeLevel"],["probe-mode","probeMode"]])o(`#${e}`).onchange=a=>{r[t]=Number(a.target.value),F()};o("#memory-info").onclick=()=>{const e=y==null?void 0:y.memory,t=a=>(a/1048576).toFixed(3);k(`<div class="eyebrow">GPU MEMORY ACCOUNTING</div><h2>Allocated, not total VRAM.</h2><p>WebGPU does not expose total device VRAM, driver memory, or other applications' GPU use. This estimate sums the renderer-owned buffer capacities and output texture, plus temporary capture resources while active.</p><div class="shortcut"><span>Allocated buffers</span><kbd>${e?t(e.buffers)+" MiB":"Unavailable"}</kbd></div><div class="shortcut"><span>RGBA8 output texture</span><kbd>${e?t(e.textures)+" MiB":"Unavailable"}</kbd></div><div class="shortcut"><span>Owned allocations</span><kbd>${e?t(e.total)+" MiB":"Unavailable"}</kbd></div><p>Includes padded triangle/BVH capacities, analytic shapes, emitters, cascade fields, irradiance, uniforms, and timing readback buffers. Capacities are retained after reducing scene load. Excludes browser presentation buffers, pipeline/driver overhead, query-set implementation memory, and delayed destruction. WebGL fallback is not estimated.</p>`)};for(const e of document.querySelectorAll("[data-view]"))e.onclick=()=>{if(z&&Number(e.dataset.view)===4){S("Probe atlas requires the WebGPU compute path.");return}r.view=Number(e.dataset.view),document.querySelectorAll("[data-view]").forEach(t=>{t.classList.toggle("active",t===e),t.setAttribute("aria-selected",String(t===e))}),F(),z&&r.view===2&&S("Preview only: WebGL does not calculate cascade irradiance.")};function pe(){r.cameraYaw=0,r.cameraPitch=0,r.distance=14.8}o("#reset-camera").onclick=pe;o("#restart").onclick=()=>{r.time=0,K=0};o("#reset").onclick=()=>{ee("chamber");for(const[e,t]of[["bounce",1],["emission",2.8],["speed",1],["emitter-size",1]])o(`#${e}`).value=t,o(`#${e}`).oninput();for(const[e,t,a]of[["enable-gi","gi",!0],["show-probes","probes",!0],["wireframe","wireframe",!1],["bvh","bvh",!0],["reflections","reflections",!0]])r[t]=a,D(`#${e}`,a);r.resolution=.75,o("#resolution").value=".75";for(const[e,t,a]of[["shadow-samples","shadowSamples",4],["probe-level","probeLevel",1],["probe-mode","probeMode",0],["stress-count","stressCount",256]])r[t]=a,o(`#${e}`).value=String(a);o('[data-view="0"]').click(),J(!0),S("Scene settings restored")};o("#fullscreen").onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await o(".renderer-panel").requestFullscreen()}catch{S("Fullscreen is unavailable in this browser.")}};o("#snapshot").onclick=async()=>{if(y)try{const e=await y.capture();if(!e){S("Unable to capture this frame.");return}const t=document.createElement("a");t.download="cascade-lab.png",t.href=URL.createObjectURL(e),t.click(),setTimeout(()=>URL.revokeObjectURL(t.href),2e3),S("Frame saved")}catch{S("Unable to capture this frame. Please try again.")}};let j=o("#scene-canvas"),$=null;const L=o("#viewport");L.addEventListener("pointerdown",e=>{e.target.tagName==="CANVAS"&&($={x:e.clientX,y:e.clientY},L.setPointerCapture(e.pointerId),L.classList.add("dragging"))});L.addEventListener("pointermove",e=>{$&&(r.cameraYaw=Math.max(-.85,Math.min(.85,r.cameraYaw-(e.clientX-$.x)*.004)),r.cameraPitch=Math.max(-.15,Math.min(.55,r.cameraPitch+(e.clientY-$.y)*.003)),$={x:e.clientX,y:e.clientY})});function Ce(){$=null,L.classList.remove("dragging")}L.addEventListener("pointerup",Ce);L.addEventListener("pointercancel",Ce);L.addEventListener("wheel",e=>{e.preventDefault(),r.distance=Math.max(8,Math.min(22,r.distance+e.deltaY*.008))},{passive:!1});window.addEventListener("keydown",e=>{N.open||["INPUT","SELECT","BUTTON","TEXTAREA"].includes(document.activeElement.tagName)||(e.code==="Space"&&(e.preventDefault(),J(!r.running)),e.key.toLowerCase()==="r"&&pe(),e.key.toLowerCase()==="g"&&o("#enable-gi").click(),e.key.toLowerCase()==="p"&&o("#show-probes").click(),e.key.toLowerCase()==="f"&&o("#fullscreen").click())});let y,Z=null,z=!1,Q=[],K=0,ne=performance.now(),ie=ne,se=0;async function oe(e){console.warn("WebGPU unavailable:",e),z=!0,y==null||y.destroy();const t=j.cloneNode();j.replaceWith(t),j=t,y=await new qt().init(j),o("#engine-status").textContent="WebGL preview",o("#render-api").textContent="WEBGL 2",o("#fallback-notice").hidden=!1,o("#fallback-notice").onclick=()=>k('<div class="eyebrow">COMPATIBILITY MODE</div><h2>A preview, not a substitute.</h2><p>This browser or GPU could not initialize WebGPU. You are seeing a rasterized WebGL preview with animated geometry and conventional lights. Radiance cascade compute shaders are not running.</p><p>Try a current Chrome or Edge browser with hardware acceleration enabled, on a WebGPU-capable device.</p><div class="dialog-callout" id="error-details"></div>'),o("#fallback-notice").addEventListener("click",()=>{o("#error-details").textContent=e.message||String(e)}),o("#probe-count").textContent="—",o("#probe-detail").textContent="WebGPU required",o("#timing-label").textContent="unavailable",r.view===4&&o('[data-view="0"]').click(),F()}async function Xt(){try{y=new Ht,await y.init(j),o("#engine-status").textContent="WebGPU active",y.onError=e=>{Z=e,console.error(e)}}catch(e){try{await oe(e)}catch(t){o("#loading").innerHTML="<span>3D rendering is unavailable</span><small>Enable hardware acceleration and reload.</small>",console.error(t);return}}o("#loading").classList.add("loaded"),requestAnimationFrame(le)}async function le(e){if(Z&&!z){const a=Z;Z=null,await oe(a)}const t=Math.min((e-ne)/1e3,.05);ne=e,r.running&&(r.time+=t*r.speed,K++),Me(r.time);try{await y.render()}catch(a){console.error(a),z?S("Renderer interrupted. Reload to try again."):(await oe(a),requestAnimationFrame(le));return}if(se++,e-ie>650){const a=Math.round(se*1e3/(e-ie));o("#fps").textContent=a,Q.push(a),Q.length>16&&Q.shift(),o(".metric-sparkline").innerHTML=Q.map(s=>`<i style="height:${Math.max(2,Math.min(20,s/60*20))}px"></i>`).join(""),o("#gpu-time").textContent=y.gpuMs!=null?y.gpuMs.toFixed(1):"—",!z&&!y.timestamp&&(o("#timing-label").textContent="not supported"),o("#triangle-count").textContent=y.triangleCount.toLocaleString(),o("#vram").textContent=y.memory?(y.memory.total/1048576).toFixed(2):"—",o("#shape-count").textContent=z?"meshes":String(y.analyticCount),o("#cpu-time").textContent=y.cpuMs!=null?y.cpuMs.toFixed(1):"—",o("#bvh-status").textContent=z?"Raster preview":r.bvh?`${y.nodeCount.toLocaleString()} nodes`:"Brute force",o("#frame-count").textContent=String(K).padStart(4,"0");const i=r.time;o("#timecode").textContent=`${String(Math.floor(i/60)).padStart(2,"0")}:${String(Math.floor(i%60)).padStart(2,"0")}.${String(Math.floor(i%1*100)).padStart(2,"0")}`,se=0,ie=e}requestAnimationFrame(le)}const be=new URLSearchParams(location.search).get("scene");U[be]&&ee(be);F();Xt();
