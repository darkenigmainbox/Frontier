(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();const se=(i,t,e)=>Math.max(t,Math.min(e,i)),Ee=(i,t,e)=>i+(t-i)*e;function _n(i,t,e,n){return Math.hypot(e-i,n-t)}function Xi(i,t,e,n,s,r){const a=s-e,o=r-n,l=a*a+o*o;let d=0;l>1e-9&&(d=((i-e)*a+(t-n)*o)/l),d=se(d,0,1);const u=e+a*d,h=n+o*d;return{d:Math.hypot(i-u,t-h),t:d,x:u,z:h}}function Ho(i,t,e,n,s,r,a,o){const l=e-i,d=n-t,u=a-s,h=o-r,c=l*h-d*u;if(Math.abs(c)<1e-9)return null;const p=((s-i)*h-(r-t)*u)/c,_=((s-i)*d-(r-t)*l)/c;return p>=-1e-6&&p<=1+1e-6&&_>=-1e-6&&_<=1+1e-6?{x:i+l*p,z:t+d*p,t:se(p,0,1),u:se(_,0,1)}:null}function Nl(i,t,e,n,s){const r=s*s,a=r*s;return{x:.5*(2*t.x+(-i.x+e.x)*s+(2*i.x-5*t.x+4*e.x-n.x)*r+(-i.x+3*t.x-3*e.x+n.x)*a),z:.5*(2*t.z+(-i.z+e.z)*s+(2*i.z-5*t.z+4*e.z-n.z)*r+(-i.z+3*t.z-3*e.z+n.z)*a)}}function qi(i,{closed:t=!1,smooth:e=!0,step:n=2}={}){if(!i||i.length<2)return[];const s=i.map(l=>({x:l.x,z:l.z}));t&&s.length>2;let r=[];if(e&&s.length>2){const l=s.length,d=t?l:l-1;for(let u=0;u<d;u++){const h=s[t?(u-1+l)%l:Math.max(0,u-1)],c=s[t?u%l:u],p=s[t?(u+1)%l:u+1],_=s[t?(u+2)%l:Math.min(l-1,u+2)],g=_n(c.x,c.z,p.x,p.z),f=Math.max(2,Math.ceil(g/n));for(let m=0;m<f;m++){const v=m/f,M=Nl(h,c,p,_,v);r.push({x:M.x,z:M.z,seg:u})}}r.push({...s[t?0:l-1],seg:d-1})}else{for(let l=0;l<s.length-(t?0:1);l++){const d=s[l],u=s[(l+1)%s.length],h=_n(d.x,d.z,u.x,u.z),c=Math.max(1,Math.ceil(h/n));for(let p=0;p<c;p++){const _=p/c;r.push({x:Ee(d.x,u.x,_),z:Ee(d.z,u.z,_),seg:l})}}r.push({...s[t?0:s.length-1],seg:s.length-1})}let o=0;for(let l=0;l<r.length;l++)l>0&&(o+=_n(r[l-1].x,r[l-1].z,r[l].x,r[l].z)),r[l].dist=o;for(let l=0;l<r.length;l++){const d=r[Math.max(0,l-1)],u=r[Math.min(r.length-1,l+1)],h=u.x-d.x,c=u.z-d.z,p=Math.hypot(h,c)||1;r[l].dirx=h/p,r[l].dirz=c/p}return r}function Hi(i,t){return Math.atan2(t,i)}function jn(i,t){const e=Math.sin(i*127.1+t*311.7)*43758.5453;return e-Math.floor(e)}function Fl(i,t){const e=Math.floor(i),n=Math.floor(t),s=i-e,r=t-n,a=s*s*(3-2*s),o=r*r*(3-2*r),l=jn(e,n),d=jn(e+1,n),u=jn(e,n+1),h=jn(e+1,n+1);return Ee(Ee(l,d,a),Ee(u,h,a),o)}function qn(i,t,e=4){let n=0,s=.5,r=1;for(let a=0;a<e;a++)n+=s*Fl(i*r,t*r),s*=.5,r*=2.03;return n}let zl=1;function Pe(i="id"){return`${i}_${Date.now().toString(36)}${(zl++).toString(36)}${Math.floor(Math.random()*1e4).toString(36)}`}function Hs(i){return JSON.parse(JSON.stringify(i))}const ze=1200,Vo=1.25,Ol=[{x:285,z:430,r:105,depth:4.5},{x:-470,z:-420,r:55,depth:3.2}];function kl(i,t){let e=4.2+(qn(i*.004+7.3,t*.004+2.1,4)-.5)*7;e+=(qn(i*.016,t*.016,3)-.5)*1.6;const n=se((i-380)/220,0,1);e+=n*n*26*(.65+.7*qn(i*.006,t*.006,3));const s=se((-t-380)/220,0,1);e+=s*s*12;const r=se((-i-250)/350,0,1);e=Ee(e,3.6+(qn(i*.01,t*.01,2)-.5)*1.2,r*.85);const a=Math.max(Math.abs(i),Math.abs(t));if(a<300){const o=1-se((a-180)/120,0,1),l=3.4+(qn(i*.02,t*.02,2)-.5)*.5;e=Ee(e,l,o*o*.96)}return t>240&&t<560&&Math.abs(i)<320&&(e=Ee(e,3.8,.7)),e}function Bl(i,t){let e=0;for(const n of Ol){const s=Math.hypot(i-n.x,t-n.z);if(s<n.r*1.25){const r=se(1-s/(n.r*1.25),0,1),a=r*r*(3-2*r);e=Math.max(e,a*(n.depth+4))}}return e}function Hl(i,t,e){let n=0,s=1e9;const r=(i==null?void 0:i.rivers)||[];for(const a of r){const o=a.points||[];for(let l=0;l<o.length-1;l++){const d=Xi(t,e,o[l].x,o[l].z,o[l+1].x,o[l+1].z);s=Math.min(s,d.d);const u=(a.width||16)/2;if(d.d<u*2.2){const h=se(1-d.d/(u*2.2),0,1),c=h*h*(3-2*h);n=Math.max(n,c*((a.depth||3.2)+3.4))}}}return{cut:n,dist:s}}function Vl(i,t,e){let n=0;const s=(i==null?void 0:i.terrainEdits)||[];for(const r of s){const a=Math.hypot(t-r.x,e-r.z);if(a<r.radius){const o=1-a/r.radius,l=o*o*(3-2*o);r.type==="water"?n+=-l*(r.strength||6):n+=l*(r.delta||0)}}return n}function zt(i,t,e){let n=kl(t,e);return n-=Bl(t,e),n-=Hl(i,t,e).cut,n+=Vl(i,t,e),n}function ni(i){var t;return((t=i==null?void 0:i.settings)==null?void 0:t.waterLevel)??Vo}function Gl(i,t,e,n){const s=ze,r=s/2,a=s/(e-1);for(const o of n){if(o.bridge)continue;const l=(o.x+r)/a,d=(o.z+r)/a,u=(o.hw||6)+3.5,h=u/a,c=Math.ceil(h),p=Math.round(l),_=Math.round(d);for(let g=_-c;g<=_+c;g++)if(!(g<0||g>=e))for(let f=p-c;f<=p+c;f++){if(f<0||f>=e)continue;const m=-r+f*a,v=-r+g*a,M=Math.hypot(m-o.x,v-o.z);if(M>u)continue;const x=g*e+f,y=(o.hw||6)+.6;let S,A;if(M<=y)S=o.y-.12,A=1;else{const C=1-(M-y)/Math.max(.001,u-y),b=C*C*(3-2*C);S=Ee(t[x],o.y-.12,b*.9),A=b}A>=.999?t[x]=S:t[x]=Ee(t[x],S,A)}}}function Go(i,t,e=[]){var r;const n=ze,s=new Float32Array(t*t);for(let a=0;a<t;a++){const o=-600+a/(t-1)*n;for(let l=0;l<t;l++){const d=-600+l/(t-1)*n;s[a*t+l]=zt(i,d,o)}}return e.length&&((r=i==null?void 0:i.settings)==null?void 0:r.followTerrain)!==!1&&Gl(i,s,t,e),s}function Vi(i,t,e=0,n=0,s=0){if(i<t-.9)return[.16,.32,.42];if(i<t+.25)return[.76,.72,.55];if(Math.max(Math.abs(n),Math.abs(s))<265&&i>t){const l=.52+(qn(n*.05,s*.05,2)-.5)*.06;return[l,l*.99,l*.94]}if(e>.55)return[.45,.42,.38];if(i>16){const l=se((i-16)/14,0,1);return[Ee(.36,.55,l),Ee(.5,.53,l),Ee(.3,.5,l)]}const a=qn(n*.02+3,s*.02,3),o=.42+a*.22;return n<-300&&Math.abs(s)<520?Math.floor((s+600)/46)%2===0?[.5,.55,.3]:[.42,.5,.28]:[.3+a*.12,o,.26+a*.08]}function da(i="Untitled network"){return{version:1,name:i,settings:{worldSize:ze,waterLevel:Vo,followTerrain:!0,autoMerge:!0},nodes:{},roads:[],rails:[],roundabouts:[],rivers:[],terrainEdits:[],buildingsManual:[]}}function Wl(){return{project:da("Frontier demo"),tool:"select",activePresetId:"street2",selection:null,layers:{terrain:!0,water:!0,roads:!0,markings:!0,sidewalks:!0,rails:!0,junctions:!0,buildings:!0,trees:!0,grid:!0},cam2d:{cx:0,cz:60,scale:1.1},snap:!0,brush:{size:46,strength:4},undoStack:[],redoStack:[],listeners:new Set,_terrainDirty:!0,_roadsDirty:!0,subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)},emit(t="all"){(t==="all"||t==="terrain")&&(this._terrainDirty=!0),(t==="all"||t==="roads")&&(this._roadsDirty=!0);for(const e of this.listeners)try{e(t,this)}catch(n){console.error(n)}},pushUndo(t="edit"){this.undoStack.push({label:t,snapshot:Hs(this.project)}),this.undoStack.length>80&&this.undoStack.shift(),this.redoStack.length=0},undo(){return this.undoStack.length?(this.redoStack.push(Hs(this.project)),this.project=this.undoStack.pop().snapshot,this.selection=null,this.emit("all"),!0):!1},redo(){return this.redoStack.length?(this.undoStack.push({label:"redo",snapshot:Hs(this.project)}),this.project=this.redoStack.pop(),this.selection=null,this.emit("all"),!0):!1},setTool(t){this.tool=t,this.emit("tool")},setPreset(t){this.activePresetId=t,this.emit("preset")},addNode(t,e){const n=Pe("n");return this.project.nodes[n]={id:n,x:t,z:e},n},moveNode(t,e,n){const s=this.project.nodes[t];s&&(s.x=e,s.z=n)},deleteNode(t){const e=this.project;delete e.nodes[t];for(const n of[...e.roads])n.nodeIds=n.nodeIds.filter(s=>s!==t),n.nodeIds.length<2&&!n.closed&&this.deleteRoad(n.id,!0);for(const n of[...e.rails])n.nodeIds=n.nodeIds.filter(s=>s!==t),n.nodeIds.length<2&&(e.rails=e.rails.filter(s=>s.id!==n.id))},addRoad(t,e,n={}){const s=Pe("rd"),r={id:s,name:n.name||`Road ${this.project.roads.length+1}`,presetId:e,nodeIds:[...t],closed:!!n.closed,bridge:n.bridge||{enabled:!1,height:6,type:"beam"},smooth:n.smooth??!0,oneWayOverride:n.oneWayOverride??null};return this.project.roads.push(r),s},updateRoad(t,e){const n=this.project.roads.find(s=>s.id===t);n&&Object.assign(n,e)},deleteRoad(t,e=!1){var r;const n=this.project,s=n.roads.find(a=>a.id===t);if(n.roads=n.roads.filter(a=>a.id!==t),!e){const a=new Set;for(const o of n.roads)o.nodeIds.forEach(l=>a.add(l));for(const o of n.rails)o.nodeIds.forEach(l=>a.add(l));for(const o of n.roundabouts)(o.nodeIds||[]).forEach(l=>a.add(l));for(const o of Object.keys(n.nodes))a.has(o)||delete n.nodes[o]}return((r=this.selection)==null?void 0:r.id)===t&&(this.selection=null),s},addRail(t,e,n,s={}){const r=Pe("rl");return this.project.rails.push({id:r,kind:e,presetId:n,nodeIds:[...t],closed:!!s.closed,name:s.name||(e==="monorail"?`Monorail ${this.project.rails.length+1}`:`Rail ${this.project.rails.length+1}`)}),r},deleteRail(t){var e;this.project.rails=this.project.rails.filter(n=>n.id!==t),((e=this.selection)==null?void 0:e.id)===t&&(this.selection=null)}}}const Mr={freeway6:{id:"freeway6",kind:"road",cat:"highway",name:"Freeway 2×3",desc:"6-lane divided freeway · barrier median",lanesFwd:3,lanesBwd:3,laneWidth:3.6,medianWidth:4,medianType:"barrier",shoulder:3,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"barrier",laneMark:"dashedWhite",edgeMark:!0,crosswalk:!1,asphalt:"#33373d",designSpeed:120,oneWay:!1},highway4:{id:"highway4",kind:"road",cat:"highway",name:"Highway 2×2",desc:"4-lane divided highway · grass median",lanesFwd:2,lanesBwd:2,laneWidth:3.5,medianWidth:5,medianType:"grass",shoulder:2.5,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"none",laneMark:"dashedWhite",edgeMark:!0,crosswalk:!1,asphalt:"#36393f",designSpeed:100,oneWay:!1},arterial4:{id:"arterial4",kind:"road",cat:"urban",name:"Arterial 2×2",desc:"City arterial · double-yellow · sidewalks",lanesFwd:2,lanesBwd:2,laneWidth:3.3,medianWidth:0,medianType:"none",shoulder:.5,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:2.6,parking:!1,center:"doubleYellow",laneMark:"dashedWhite",edgeMark:!0,crosswalk:!0,asphalt:"#3a3d43",designSpeed:60,oneWay:!1},arterialTurn:{id:"arterialTurn",kind:"road",cat:"urban",name:"Arterial + turn lane",desc:"2 lanes + center turn lane · sidewalks",lanesFwd:1,lanesBwd:1,laneWidth:3.3,medianWidth:3,medianType:"paint",shoulder:.5,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:2.4,parking:!1,center:"turnLane",laneMark:"dashedWhite",edgeMark:!0,crosswalk:!0,asphalt:"#3a3d43",designSpeed:50,oneWay:!1},street2:{id:"street2",kind:"road",cat:"urban",name:"Urban street",desc:"1×1 + parking both sides · sidewalks",lanesFwd:1,lanesBwd:1,laneWidth:3.1,medianWidth:0,medianType:"none",shoulder:2.2,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:2.2,parking:!0,center:"dashedYellow",laneMark:"none",edgeMark:!1,crosswalk:!0,asphalt:"#3c4046",designSpeed:40,oneWay:!1},oneway2:{id:"oneway2",kind:"road",cat:"urban",name:"One-way 2-lane",desc:"One-way pair · parking · wide sidewalks",lanesFwd:2,lanesBwd:0,laneWidth:3.1,medianWidth:0,medianType:"none",shoulder:2,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:3,parking:!0,center:"none",laneMark:"dashedWhite",edgeMark:!1,crosswalk:!0,asphalt:"#3c4046",designSpeed:40,oneWay:!0},alley:{id:"alley",kind:"road",cat:"urban",name:"Alley",desc:"Narrow service lane · no markings",lanesFwd:1,lanesBwd:0,laneWidth:3.4,medianWidth:0,medianType:"none",shoulder:.3,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"none",laneMark:"none",edgeMark:!1,crosswalk:!1,asphalt:"#43464c",designSpeed:15,oneWay:!0},residential:{id:"residential",kind:"road",cat:"urban",name:"Residential lane",desc:"Quiet street · driveways + ramps",lanesFwd:1,lanesBwd:1,laneWidth:2.9,medianWidth:0,medianType:"none",shoulder:1.2,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:1.8,parking:!1,center:"none",laneMark:"none",edgeMark:!1,crosswalk:!0,driveways:!0,asphalt:"#3e4247",designSpeed:30,oneWay:!1},rural2:{id:"rural2",kind:"road",cat:"rural",name:"Rural two-lane",desc:"Country road · gravel shoulders",lanesFwd:1,lanesBwd:1,laneWidth:3.4,medianWidth:0,medianType:"none",shoulder:1.5,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"dashedWhite",laneMark:"none",edgeMark:!0,crosswalk:!1,asphalt:"#3f434a",designSpeed:80,oneWay:!1},scenic:{id:"scenic",kind:"road",cat:"rural",name:"Scenic lane",desc:"Narrow countryside lane · grass verge",lanesFwd:1,lanesBwd:1,laneWidth:2.7,medianWidth:0,medianType:"none",shoulder:.8,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"none",laneMark:"none",edgeMark:!1,crosswalk:!1,asphalt:"#4a4c4b",designSpeed:50,oneWay:!1},dirt:{id:"dirt",kind:"road",cat:"rural",name:"Dirt / gravel",desc:"Unpaved · dusty twin-track",lanesFwd:1,lanesBwd:1,laneWidth:2.6,medianWidth:0,medianType:"none",shoulder:.6,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"none",laneMark:"none",edgeMark:!1,crosswalk:!1,asphalt:"#7a6748",unpaved:!0,designSpeed:40,oneWay:!1},trail:{id:"trail",kind:"road",cat:"rural",name:"Offroad trail",desc:"Single-track · 4×4 / hiking",lanesFwd:1,lanesBwd:0,laneWidth:2.4,medianWidth:0,medianType:"none",shoulder:.4,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"none",laneMark:"none",edgeMark:!1,crosswalk:!1,asphalt:"#6e5f45",unpaved:!0,designSpeed:20,oneWay:!1,narrow:!0},promenade:{id:"promenade",kind:"road",cat:"urban",name:"Promenade",desc:"Pedestrian + bike · pavers",lanesFwd:0,lanesBwd:0,laneWidth:0,medianWidth:8,medianType:"paver",shoulder:0,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:3,parking:!1,center:"none",laneMark:"none",edgeMark:!1,crosswalk:!1,asphalt:"#8f8a7c",designSpeed:5,oneWay:!1,pedestrian:!0},viaduct4:{id:"viaduct4",kind:"road",cat:"bridge",name:"Viaduct 2×2",desc:"Elevated bridge · railings + piers",lanesFwd:2,lanesBwd:2,laneWidth:3.4,medianWidth:2,medianType:"barrier",shoulder:1.5,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:1.6,parking:!1,center:"barrier",laneMark:"dashedWhite",edgeMark:!0,crosswalk:!1,asphalt:"#383b41",designSpeed:80,oneWay:!1,defaultBridge:!0,bridgeHeight:7},bridge2:{id:"bridge2",kind:"road",cat:"bridge",name:"Bridge 1×1",desc:"Two-lane beam bridge · walkways",lanesFwd:1,lanesBwd:1,laneWidth:3.4,medianWidth:0,medianType:"none",shoulder:1,sidewalkL:!0,sidewalkR:!0,sidewalkWidth:1.6,parking:!1,center:"doubleYellow",laneMark:"none",edgeMark:!0,crosswalk:!1,asphalt:"#383b41",designSpeed:60,oneWay:!1,defaultBridge:!0,bridgeHeight:6},causeway:{id:"causeway",kind:"road",cat:"bridge",name:"Causeway",desc:"Low lake crossing · guardrails",lanesFwd:1,lanesBwd:1,laneWidth:3.2,medianWidth:0,medianType:"none",shoulder:1.2,sidewalkL:!1,sidewalkR:!1,sidewalkWidth:0,parking:!1,center:"dashedWhite",laneMark:"none",edgeMark:!0,crosswalk:!1,asphalt:"#3a3d43",designSpeed:60,oneWay:!1,defaultBridge:!0,bridgeHeight:3},railDouble:{id:"railDouble",kind:"rail",cat:"rail",name:"Heavy rail ×2",desc:"Double-track main line · ballast",tracks:2,trackGauge:1.435,trackSpacing:4.2,ballastWidth:10.5,asphalt:"#4a4038",designSpeed:120},railSingle:{id:"railSingle",kind:"rail",cat:"rail",name:"Branch line ×1",desc:"Single-track branch · level crossings",tracks:1,trackGauge:1.435,trackSpacing:0,ballastWidth:5.5,asphalt:"#4a4038",designSpeed:80},monorail:{id:"monorail",kind:"monorail",cat:"rail",name:"Monorail beam",desc:"Elevated straddle beam · pillars",beamWidth:.9,beamHeight:1.4,elevation:6.8,pillarEvery:20,asphalt:"#9aa3ad",designSpeed:90}};function Vs(){return Object.values(Mr)}function ie(i){return Mr[i]||Mr.street2}function Oe(i){if(i.kind==="rail")return(i.ballastWidth||8)/2;if(i.kind==="monorail")return 2.2;const t=(i.lanesFwd||0)+(i.lanesBwd||0);if(i.pedestrian)return(i.medianWidth||8)/2;const e=t*(i.laneWidth||3.2),n=i.medianWidth||0,s=(i.shoulder||0)*2;return(e+n+s)/2}function Wo(i){const t=[];if(i.kind!=="road"||i.pedestrian)return t;const e=i.lanesFwd||0,n=i.lanesBwd||0,s=i.laneWidth||3.2,r=i.medianWidth||0;for(let a=1;a<e;a++)t.push(r/2+a*s);for(let a=1;a<n;a++)t.push(-(r/2+a*s));return t}function Xl(i,t){const e=i.getContext("2d"),n=i.width=152,s=i.height=68;e.fillStyle="#0b0e13",e.fillRect(0,0,n,s),e.fillStyle="#2f6b3c",e.fillRect(0,s-14,n,14);const r=n/2,a=s-14,o=3.4;if(t.kind==="monorail"){e.fillStyle="#7c8592",e.fillRect(r-3,a-44,6,44),e.fillStyle="#c7ced6",e.fillRect(r-26,a-52,52,8),e.fillStyle="#5aa9ff",e.fillRect(r-30,a-70,60,18),e.fillStyle="#dfe9f5";for(let f=0;f<4;f++)e.fillRect(r-25+f*14,a-66,10,8);return}if(t.kind==="rail"){const f=(t.ballastWidth||8)*o;e.fillStyle="#5a4f44",e.fillRect(r-f/2,a-8,f,8);const m=t.tracks||1;for(let v=0;v<m;v++){const M=m===1?0:(v===0?-1:1)*(t.trackSpacing||4.2)*o/2;e.fillStyle="#6e5b45";for(let x=0;x<9;x++)e.fillRect(r+M-12+x*3,a-11,2,3);e.fillStyle="#c9cfd8",e.fillRect(r+M-5,a-14,2,4),e.fillRect(r+M+3,a-14,2,4)}return}const l=Oe(t),d=t.sidewalkWidth||0,u=l+(t.sidewalkL||t.sidewalkR?d*o*.28:0),h=Math.min(1,66/(u*2+8)),c=r-l*o*h,p=r+l*o*h;t.sidewalkL&&(e.fillStyle="#9aa0a8",e.fillRect(c-d*4*h,a-10,d*4*h,10)),t.sidewalkR&&(e.fillStyle="#9aa0a8",e.fillRect(p,a-10,d*4*h,10)),e.fillStyle=t.unpaved?"#7a6748":t.pedestrian?"#8f8a7c":"#41454c",e.fillRect(c,a-7,p-c,7);const _=(t.medianWidth||0)*o*h;if(_>1&&(e.fillStyle=t.medianType==="grass"?"#3f7a44":t.medianType==="barrier"?"#c9cfd8":"#d8b13c",e.fillRect(r-_/2,a-9,_,2.5)),t.center==="doubleYellow")e.fillStyle="#e8b93c",e.fillRect(r-2,a-7,1.6,7),e.fillRect(r+.6,a-7,1.6,7);else if(t.center==="dashedYellow"||t.center==="dashedWhite"){e.fillStyle=t.center==="dashedYellow"?"#e8b93c":"#e8ecf2";for(let f=0;f<3;f++)e.fillRect(r-1,a-7+f*2.6,2,1.4)}e.fillStyle="#dfe4ec";const g=Wo(t);for(const f of g){const m=r+f*o*h;for(let v=0;v<3;v++)e.fillRect(m-.8,a-7+v*2.6,1.6,1.4)}}function Te(i,t){return t.nodeIds.map(e=>i.nodes[e]).filter(Boolean)}function ql(i){const t=new Map,e=(n,s)=>{t.has(n)||t.set(n,[]),t.get(n).push(s)};for(const n of i.roads){if(Te(i,n).length<2)continue;const r=n.nodeIds.length,a=n.closed?r:r-1;for(let o=0;o<a;o++){const l=n.nodeIds[o%r],d=n.nodeIds[(o+1)%r],u=i.nodes[l],h=i.nodes[d];if(!u||!h)continue;const c=h.x-u.x,p=h.z-u.z,_=Math.hypot(c,p)||1;e(l,{roadId:n.id,road:n,otherId:d,dirx:c/_,dirz:p/_}),e(d,{roadId:n.id,road:n,otherId:l,dirx:-c/_,dirz:-p/_})}}return t}function ha(i){const t=ql(i),e=[];for(const[n,s]of t){const r=i.nodes[n];if(!r)continue;const a=new Set(s.map(h=>h.roadId));if(!(s.length>=3||a.size>=2))continue;if(s.length===2){const h=Hi(s[0].dirx,s[0].dirz),c=Hi(s[1].dirx,s[1].dirz);let p=Math.abs(h-c);if(p>Math.PI&&(p=Math.PI*2-p),p>2.75)continue}let l=4;for(const h of s){const c=ie(h.road.presetId);l=Math.max(l,Oe(c))}const d=se(l+2.6,4.5,22),u=[...s].sort((h,c)=>Hi(h.dirx,h.dirz)-Hi(c.dirx,c.dirz));e.push({nodeId:n,x:r.x,z:r.z,stubs:u,radius:d,roadCount:a.size})}return e}function Yl(i,t,e,n){var m;const s=Te(i,t);if(s.length<2)return 0;let r=null,a=1e18,o=0;const l=[0],d=t.closed?s.length:s.length-1;for(let v=0;v<d;v++){const M=s[v%s.length],x=s[(v+1)%s.length];o+=_n(M.x,M.z,x.x,x.z),l.push(o)}for(let v=0;v<d;v++){const M=s[v%s.length],x=s[(v+1)%s.length],y=x.x-M.x,S=x.z-M.z,A=Math.hypot(y,S)||1,C=se(((e-M.x)*y+(n-M.z)*S)/(A*A),0,1),b=M.x+y*C,E=M.z+S*C,P=Math.hypot(e-b,n-E);if(P<a){a=P;const H=l[v]+A*C,F=s[v%s.length].h||0,L=s[(v+1)%s.length].h||0;r={dist:H,lift:F+(L-F)*C,seg:v}}}const u=o>0?r.dist/o:0,h=r.lift,c=zt(i,e,n)+.22+h;if(!((m=t.bridge)!=null&&m.enabled))return c;if(t.closed)return c+(t.bridge.height||0);const p=zt(i,s[0].x,s[0].z)+.22,_=zt(i,s[s.length-1].x,s[s.length-1].z)+.22,g=(t.bridge.height||0)*Math.pow(Math.sin(Math.PI*se(u,0,1)),.75),f=t.bridge.type==="arch"?1.8*Math.sin(Math.PI*se(u,0,1)):0;return Math.max(c,p+(_-p)*u+g+f+h)}function Ts(i,t={}){const e=i.roads.filter(s=>Te(i,s).length>=2),n=[];for(let s=0;s<e.length;s++){const r=e[s],a=Te(i,r),o=r.closed?a.length:a.length-1;for(let l=s+1;l<e.length;l++){const d=e[l],u=Te(i,d),h=d.closed?u.length:u.length-1;for(let c=0;c<o;c++){const p=a[c%a.length],_=a[(c+1)%a.length];for(let g=0;g<h;g++){const f=u[g%u.length],m=u[(g+1)%u.length],v=[r.nodeIds[c%a.length],r.nodeIds[(c+1)%a.length]],M=[d.nodeIds[g%u.length],d.nodeIds[(g+1)%u.length]];if(v.some(y=>M.includes(y)))continue;const x=Ho(p.x,p.z,_.x,_.z,f.x,f.z,m.x,m.z);if(x){const S=(A,C,b)=>_n(A.x,A.z,C.x,C.z)<1.2||_n(A.x,A.z,b.x,b.z)<1.2;if(S(x,p,_)||S(x,f,m))continue;n.push({roadA:r,segA:c,roadB:d,segB:g,x:x.x,z:x.z})}}}}}return n}function Pn(i){Ts(i);let t=0;for(let e=0;e<40;e++){const n=Ts(i);if(!n.length)break;const s=n[0],r=Pe("n");i.nodes[r]={id:r,x:s.x,z:s.z},Is(i,s.roadA,s.segA,r),Is(i,s.roadB,s.segB,r),t++}return{merged:t,remaining:Ts(i).length}}function Is(i,t,e,n){const s=t.nodeIds.length;if(t.closed){const r=(e+1)%(s+1);t.nodeIds.splice(r===0?s:r,0,n)}else t.nodeIds.splice(e+1,0,n)}function $l(i,t,e){const n=i.roads.findIndex(l=>l.id===t);if(n<0)return null;const s=i.roads[n];if(s.closed||e<=0||e>=s.nodeIds.length-1)return null;const r=s.nodeIds.slice(0,e+1),a=s.nodeIds.slice(e);s.nodeIds=r;const o=Pe("rd");return i.roads.splice(n+1,0,{...JSON.parse(JSON.stringify(s)),id:o,name:s.name+" B",nodeIds:a}),o}function Xo(i){const t=[],e=(i.rails||[]).filter(n=>n.kind==="rail");for(const n of e){const s=n.nodeIds.map(a=>i.nodes[a]).filter(Boolean);if(s.length<2)continue;const r=n.closed?s.length:s.length-1;for(const a of i.roads){const o=Te(i,a);if(o.length<2)continue;const l=a.closed?o.length:o.length-1;for(let d=0;d<r;d++){const u=s[d%s.length],h=s[(d+1)%s.length];for(let c=0;c<l;c++){const p=o[c%o.length],_=o[(c+1)%o.length],g=Ho(u.x,u.z,h.x,h.z,p.x,p.z,_.x,_.z);if(!g)continue;const f=jl(i,n,g.x,g.z),m=Yl(i,a,g.x,g.z);if(Math.abs(f-m)>2.2)continue;const v=h.x-u.x,M=h.z-u.z,x=Math.hypot(v,M)||1,y=_.x-p.x,S=_.z-p.z,A=Math.hypot(y,S)||1;t.push({x:g.x,z:g.z,y:Math.max(f,m),railDir:[v/x,M/x],roadDir:[y/A,S/A],road:a,rail:n})}}}}return t}function jl(i,t,e,n){var d;if(t.kind==="monorail")return zt(i,e,n)+8;const s=t.nodeIds.map(u=>i.nodes[u]).filter(Boolean);if(s.length<2)return 0;({...t,bridge:t.bridge});let r=1e18,a=0;for(let u=0;u<s.length-1;u++){const h=s[u],c=s[u+1],p=c.x-h.x,_=c.z-h.z,g=p*p+_*_||1,f=se(((e-h.x)*p+(n-h.z)*_)/g,0,1),m=Math.hypot(e-(h.x+p*f),n-(h.z+_*f));m<r&&(r=m,a=(h.h||0)+((c.h||0)-(h.h||0))*f)}const o=zt(i,e,n)+.42+a;if(!((d=t.bridge)!=null&&d.enabled))return o;const l=(t.bridge.height||0)*.9;return o+l}function Zl(i){var s;const t=[],e=ha(i),n=Ts(i);for(const r of n.slice(0,12))t.push({level:"warn",msg:`Unmerged crossing: ${r.roadA.name} × ${r.roadB.name}`,x:r.x,z:r.z});for(const r of i.roads){const a=Te(i,r);if(a.length<2){t.push({level:"err",msg:`${r.name}: fewer than 2 nodes`,roadId:r.id});continue}for(let o=0;o<a.length-1;o++){const l=_n(a[o].x,a[o].z,a[o+1].x,a[o+1].z);if(l<.5?t.push({level:"err",msg:`${r.name}: zero-length segment ${o}`,roadId:r.id,x:a[o].x,z:a[o].z}):l<2.5&&t.push({level:"warn",msg:`${r.name}: very short segment (${l.toFixed(1)}m)`,roadId:r.id,x:a[o].x,z:a[o].z}),o>0){const d=a[o].x-a[o-1].x,u=a[o].z-a[o-1].z,h=a[o+1].x-a[o].x,c=a[o+1].z-a[o].z,p=Math.hypot(d,u)||1,_=Math.hypot(h,c)||1;(d*h+u*c)/(p*_)<-.2&&t.push({level:"warn",msg:`${r.name}: sharp kink at node ${o}`,roadId:r.id,x:a[o].x,z:a[o].z})}}if(!((s=r.bridge)!=null&&s.enabled)){const o=qi(a,{closed:r.closed,smooth:!1,step:6}),l=ni(i);let d=0;for(const u of o)zt(i,u.x,u.z)<l-.15&&d++;d>2&&t.push({level:"warn",msg:`${r.name}: crosses water without bridge (${d*6}m) — enable Bridge`,roadId:r.id})}}for(let r=0;r<e.length;r++){for(let a=r+1;a<e.length;a++){const o=_n(e[r].x,e[r].z,e[a].x,e[a].z),l=e[r].radius+e[a].radius-2;o<l&&t.push({level:"warn",msg:`Junctions too close (${o.toFixed(0)}m) — overlap`,x:(e[r].x+e[a].x)/2,z:(e[r].z+e[a].z)/2})}e[r].stubs.length>8&&t.push({level:"warn",msg:`Complex junction (${e[r].stubs.length} legs)`,x:e[r].x,z:e[r].z})}return t.length||t.push({level:"ok",msg:`Topology clean · ${e.length} junctions · ${i.roads.length} roads · ${i.rails.length} rails`}),{issues:t,junctions:e,crossings:n.length}}function Kl(i){const t=[];for(const e of i.roads){const n=ie(e.presetId),s=Oe(n)+3,r=Te(i,e);for(let a=0;a<r.length-1;a++)t.push({a:r[a],b:r[a+1],hw:s})}for(const e of i.rails){const n=e.nodeIds.map(r=>i.nodes[r]).filter(Boolean),s=e.kind==="monorail"?4:7;for(let r=0;r<n.length-1;r++)t.push({a:n[r],b:n[r+1],hw:s})}for(const e of i.roundabouts||[])t.push({circle:e,hw:e.radius+3});return t}function On(i,t,e,n=2){for(const s of i)if(s.circle){if(Math.hypot(t-s.circle.x,e-s.circle.z)<s.hw+n)return!1}else if(Xi(t,e,s.a.x,s.a.z,s.b.x,s.b.z).d<s.hw+n)return!1;return!0}const ts={downtown:["#8b93a1","#a8b0bd","#7d8ca3","#b9c2cf","#93a3b8","#6f7d95"],residential:["#c9b18a","#b7c0c9","#d0c7b4","#b98d6e","#a8b5a0","#c4a49a"],farm:["#a8442f","#c9c2b4","#8a6b45","#7a7f85"],lake:["#9fb6c4","#c2b49a","#8fa39b"]};function es(i,t){return i[Math.floor(t*i.length)%i.length]}function qo(i,t={}){const e=t.seed??7,n=ni(i),s=Kl(i),r=[],a=[],o=(c,p=0)=>jn(c*12.9898+e*78.233+p*37.7,p*11.3+e*3.1);let l=0;const d=70;for(let c=-2;c<=2;c++)for(let p=-2;p<=2;p++){if(c===0&&p===0)continue;const _=c*d,g=p*d,f=1+Math.floor(o(l,1)*3);for(let m=0;m<f;m++){const v=(o(l,10+m)-.5)*34,M=(o(l,20+m)-.5)*34,x=_+v,y=g+M;if(!On(s,x,y,4)||zt(i,x,y)<n+.4)continue;const C=Math.hypot(c,p)<1.6,b=C?14+o(l,30)*10:9+o(l,31)*8,E=C?14+o(l,32)*10:9+o(l,33)*8,P=C?30+o(l,34)*55:8+o(l,35)*14;r.push({x,z:y,w:b,d:E,h:P,rot:(o(l,36)>.7?Math.PI/4:0)+(Math.abs(v)>2,0),color:es(ts.downtown,o(l,37)),type:C?"tower":"block",windows:!0}),l++}}for(let c=0;c<220;c++){const p=-300+o(c,101)*520,_=265+o(c,102)*260;!On(s,p,_,5)||zt(i,p,_)<n+.4||r.push({x:p,z:_,w:7+o(c,103)*5,d:6+o(c,104)*5,h:3.5+o(c,105)*3.5,rot:Math.floor(o(c,106)*4)*Math.PI/2+(o(c,107)-.5)*.2,color:es(ts.residential,o(c,108)),type:"house",windows:!0})}const u=[[-460,-180],[-520,60],[-420,260],[-500,-380],[-360,-320],[-380,120]];for(let c=0;c<u.length;c++){const[p,_]=u[c];for(let g=0;g<4;g++){const f=p+(o(c*10+g,120)-.5)*60,m=_+(o(c*10+g,121)-.5)*60;!On(s,f,m,6)||zt(i,f,m)<n+.4||r.push({x:f,z:m,w:10+o(g,122+c)*10,d:8+o(g,123+c)*8,h:5+o(g,124)*4,rot:o(g,125)*Math.PI,color:es(ts.farm,o(g,126+c)),type:"barn",windows:!1})}}for(let c=0;c<26;c++){const p=o(c,140)*Math.PI*2,_=125+o(c,141)*55,g=285+Math.cos(p)*_,f=430+Math.sin(p)*_*.9;if(!On(s,g,f,4))continue;const m=zt(i,g,f);m<n+.5||m>n+9||r.push({x:g,z:f,w:6+o(c,142)*4,d:5+o(c,143)*4,h:3.2+o(c,144)*2.4,rot:o(c,145)*Math.PI,color:es(ts.lake,o(c,146)),type:"cabin",windows:!0})}for(const c of i.buildingsManual||[])r.push(c);for(let c=0;c<90;c++){const p=(o(c,200)-.5)*56,_=(o(c,201)-.5)*56;On(s,p,_,2)&&a.push({x:p,z:_,s:.8+o(c,202)*.7,park:!0})}let h=1e3;for(const c of i.roads){const p=ie(c.presetId);if(!(p.sidewalkL||p.cat==="urban"))continue;const _=Te(i,c);for(let g=0;g<_.length-1;g++){const f=_[g],m=_[g+1],v=Math.hypot(m.x-f.x,m.z-f.z),M=Math.floor(v/14);for(let x=1;x<M;x++){const y=x/M,S=f.x+(m.x-f.x)*y,A=f.z+(m.z-f.z)*y,C=m.x-f.x,b=m.z-f.z,E=Math.hypot(C,b)||1;for(const P of[1,-1]){if(o(h,1)<.35){h++;continue}const H=Oe(p)+4.5+o(h,2)*2,F=S+-b/E*P*H,L=A+C/E*P*H;if(zt(i,F,L)<n+.4){h++;continue}if(!On(s,F,L,.5)){h++;continue}a.push({x:F,z:L,s:.75+o(h,3)*.5}),h++}}}}for(let c=0;c<2600;c++){const p=o(c,300);let _,g;if(p<.4?(_=-600+o(c,301)*260,g=-560+o(c,302)*1120):p<.75?(_=400+o(c,303)*200,g=-560+o(c,304)*1120):(_=-300+o(c,305)*700,g=-600+o(c,306)*180),!(zt(i,_,g)<n+.5)&&On(s,_,g,1.5)&&!(jn(_*.02,g*.02+e)<.35)&&(a.push({x:_,z:g,s:.9+o(c,307)*1.1}),a.length>3200))break}return{buildings:r,trees:a}}function Jl(i){const t=i.replace("#",""),e=parseInt(t,16);return[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]}class Ql{constructor(t,e,n={}){this.canvas=t,this.store=e,this.ctx=t.getContext("2d"),this.onHint=n.onHint||(()=>{}),this.onSelect=n.onSelect||(()=>{}),this.cache={roads:[],rails:[],junctions:[],crossings:[],dressing:{buildings:[],trees:[]},terrain:null},this.draft=null,this.hover=null,this.snapMark=null,this.drag=null,this.stroke=null,this.dirty=!0,this._cacheTimer=null,this._emitTimer=null,this._bind(),this.scheduleCache();const s=()=>{this.resize(),this.dirty&&(this.render(),this.dirty=!1),requestAnimationFrame(s)};requestAnimationFrame(s),e.subscribe(r=>{(r==="all"||r==="roads"||r==="terrain")&&this.scheduleCache(),(r==="tool"||r==="preset")&&this.cancelDraft(),this.dirty=!0})}scheduleCache(){clearTimeout(this._cacheTimer),this._cacheTimer=setTimeout(()=>this.rebuildCache(),160)}rebuildCache(){const t=this.store.project,e=[];for(const o of t.roads){const l=Te(project,o);if(l.length<2)continue;const d=ie(o.presetId),u=qi(l,{closed:!!o.closed,smooth:o.smooth!==!1,step:3});e.push({road:o,preset:d,samples:u,hw:Oe(d)})}const n=[];for(const o of t.rails||[]){const l=o.nodeIds.map(u=>t.nodes[u]).filter(Boolean);if(l.length<2)continue;const d=qi(l,{closed:!!o.closed,smooth:!0,step:3});n.push({rail:o,samples:d,preset:ie(o.presetId)})}let s=[],r=[];try{s=ha(t)}catch{}try{r=Xo(t)}catch{}let a={buildings:[],trees:[]};try{a=qo(t)}catch{}this.cache.roads=e,this.cache.rails=n,this.cache.junctions=s,this.cache.crossings=r,this.cache.dressing=a,this.rebuildTerrainImage(),this.dirty=!0}rebuildTerrainImage(){const t=this.store.project,e=120,n=ze,s=Go(t,e,[]),r=ni(t),a=document.createElement("canvas");a.width=e,a.height=e;const o=a.getContext("2d"),l=o.createImageData(e,e);for(let d=0;d<e;d++)for(let u=0;u<e;u++){const h=s[d*e+u],c=s[d*e+Math.min(e-1,u+1)]-s[d*e+Math.max(0,u-1)],p=s[Math.min(e-1,d+1)*e+u]-s[Math.max(0,d-1)*e+u],_=Math.hypot(c,p)/(2*(n/e)),g=Math.max(.72,Math.min(1.1,1-(c*.9+p*.6)*.35)),f=-600+u/(e-1)*n,m=-600+d/(e-1)*n;let[v,M,x]=Vi(h,r,_,f,m);if(h<r){const S=Math.min(1,(r-h)/3);v=v*(1-S)+.13*S,M=M*(1-S)+.35*S,x=x*(1-S)+.55*S}const y=(d*e+u)*4;l.data[y]=Math.min(255,v*255*g),l.data[y+1]=Math.min(255,M*255*g),l.data[y+2]=Math.min(255,x*255*g),l.data[y+3]=255}o.putImageData(l,0,0),this.cache.terrain=a}get cam(){return this.store.cam2d}w2s(t,e){const{cx:n,cz:s,scale:r}=this.cam,a=this.canvas.getBoundingClientRect();return[(t-n)*r+a.width/2,(e-s)*r+a.height/2]}s2w(t,e){const{cx:n,cz:s,scale:r}=this.cam,a=this.canvas.getBoundingClientRect();return{x:(t-a.width/2)/r+n,z:(e-a.height/2)/r+s}}resize(){const t=this.canvas.getBoundingClientRect(),e=Math.min(2,window.devicePixelRatio||1),n=Math.max(1,Math.round(t.width*e)),s=Math.max(1,Math.round(t.height*e));(this.canvas.width!==n||this.canvas.height!==s)&&(this.canvas.width=n,this.canvas.height=s,this.dirty=!0)}render(){const t=this.ctx,e=this.store,n=Math.min(2,window.devicePixelRatio||1),s=this.canvas.width,r=this.canvas.height,{cx:a,cz:o,scale:l}=this.cam;t.setTransform(n,0,0,n,0,0);const d=s/n,u=r/n,h=_=>(_-a)*l+d/2,c=_=>(_-o)*l+u/2;t.fillStyle="#0a0e14",t.fillRect(0,0,d,u);const p=e.layers;if(p.terrain&&this.cache.terrain&&(t.imageSmoothingEnabled=!0,t.drawImage(this.cache.terrain,h(-ze/2),c(-ze/2),ze*l,ze*l)),t.strokeStyle="#3a4658",t.lineWidth=1.5,t.strokeRect(h(-ze/2),c(-ze/2),ze*l,ze*l),p.grid){const _=l>.5?10:50;t.lineWidth=1;for(let g=-600;g<=600;g+=_){const f=g%50===0;t.strokeStyle=f?"rgba(140,170,210,0.16)":"rgba(140,170,210,0.05)",t.beginPath(),t.moveTo(h(g),c(-600)),t.lineTo(h(g),c(600)),t.stroke()}for(let g=-600;g<=600;g+=_){const f=g%50===0;t.strokeStyle=f?"rgba(140,170,210,0.16)":"rgba(140,170,210,0.05)",t.beginPath(),t.moveTo(h(-600),c(g)),t.lineTo(h(g),c(g)),t.stroke()}}if(p.buildings)for(const _ of this.cache.dressing.buildings){const[g,f]=[h(_.x),c(_.z)];g<-40||f<-40||g>d+40||f>u+40||(t.save(),t.translate(g,f),t.rotate(-(_.rot||0)),t.fillStyle=(_.color||"#8b93a1")+"cc",t.fillRect(-_.w*l/2,-_.d*l/2,Math.max(2,_.w*l),Math.max(2,_.d*l)),t.restore())}if(p.trees&&l>.55){t.fillStyle="rgba(74,140,80,0.85)";for(const _ of this.cache.dressing.trees){const[g,f]=[h(_.x),c(_.z)];g<-4||f<-4||g>d+4||f>u+4||(t.beginPath(),t.arc(g,f,Math.max(1,1.6*(_.s||1)*Math.min(2,l)),0,7),t.fill())}}if(p.roads){const _=[...this.cache.roads].sort((g,f)=>{var m,v;return((m=g.road.bridge)!=null&&m.enabled?1:0)-((v=f.road.bridge)!=null&&v.enabled?1:0)});for(const g of _)this.drawRoad(t,h,c,l,g)}if(p.rails)for(const _ of this.cache.rails)this.drawRail(t,h,c,l,_);if(p.rails)for(const _ of this.cache.crossings){const[g,f]=[h(_.x),c(_.z)];t.strokeStyle="#ffd75e",t.lineWidth=2,t.beginPath(),t.arc(g,f,7,0,7),t.stroke(),t.beginPath(),t.moveTo(g-4,f-4),t.lineTo(g+4,f+4),t.moveTo(g+4,f-4),t.lineTo(g-4,f+4),t.stroke()}if(p.roads)for(const _ of e.project.roundabouts||[])this.drawRoundabout(t,h,c,l,_);if(p.junctions)for(const _ of this.cache.junctions){const[g,f]=[h(_.x),c(_.z)];t.strokeStyle="rgba(255,180,84,0.8)",t.setLineDash([5,4]),t.lineWidth=1.5,t.beginPath(),t.arc(g,f,Math.max(3,_.radius*l),0,7),t.stroke(),t.setLineDash([])}if(this.drawNodes(t,h,c,l,d,u),this.draft&&this.drawDraft(t,h,c,l),this.snapMark){const[_,g]=[h(this.snapMark.x),c(this.snapMark.z)];t.strokeStyle="#4cc38a",t.lineWidth=2,t.beginPath(),t.arc(_,g,9,0,7),t.stroke()}if(this.hover&&e.tool==="select"){const _=this.cache.roads.find(g=>g.road.id===this.hover.id);_&&(t.strokeStyle="rgba(90,169,255,0.55)",t.lineWidth=(_.hw*2+3)*l,t.lineCap="round",t.lineJoin="round",t.beginPath(),_.samples.forEach((g,f)=>f?t.lineTo(h(g.x),c(g.z)):t.moveTo(h(g.x),c(g.z))),t.stroke())}}pathOf(t,e,n,s,r){t.beginPath(),s.forEach((a,o)=>o?t.lineTo(e(a.x),n(a.z)):t.moveTo(e(a.x),n(a.z))),r&&t.closePath()}drawRoad(t,e,n,s,{road:r,preset:a,samples:o,hw:l}){var p,_;const d=((p=this.store.selection)==null?void 0:p.id)===r.id,u=Math.max(1.5,l*2*s),h=(_=r.bridge)==null?void 0:_.enabled;if(h&&(t.save(),t.translate(5,6),t.strokeStyle="rgba(0,0,0,0.45)",t.lineWidth=u,t.lineCap="round",t.lineJoin="round",this.pathOf(t,e,n,o,r.closed),t.stroke(),t.restore()),t.strokeStyle=d?"#4cc38a":"#101216",t.lineWidth=u+(d?5:2.5),t.lineCap="round",t.lineJoin="round",this.pathOf(t,e,n,o,r.closed),t.stroke(),t.strokeStyle=a.asphalt||"#3a3d43",t.lineWidth=u,this.pathOf(t,e,n,o,r.closed),t.stroke(),!this.store.layers.markings)return;const c=a.center;if(c==="doubleYellow"||c==="dashedYellow"?t.strokeStyle="#d8a83c":c==="dashedWhite"||c==="solidWhite"?t.strokeStyle="rgba(230,235,242,0.85)":c==="barrier"?t.strokeStyle="#c9cfd8":c==="turnLane"?t.strokeStyle="#d8a83c":t.strokeStyle="transparent",c&&c!=="none"&&(t.lineWidth=Math.max(1,.28*s),c.startsWith("dashed")&&t.setLineDash([Math.max(2,3*s),Math.max(2,4.5*s)]),this.pathOf(t,e,n,o,r.closed),t.stroke(),t.setLineDash([])),this.store.layers.sidewalks&&(a.sidewalkL||a.sidewalkR)&&s>1.6){t.strokeStyle="rgba(160,166,175,0.7)",t.lineWidth=Math.max(1,(a.sidewalkWidth||2)*s*.5);for(const g of[1,-1])g>0&&!a.sidewalkL||g<0&&!a.sidewalkR||(t.beginPath(),o.forEach((f,m)=>{const v=g*(l+.12+(a.sidewalkWidth||2)/2),M=f.x+-f.dirz*v,x=f.z+f.dirx*v;m?t.lineTo(e(M),n(x)):t.moveTo(e(M),n(x))}),t.stroke())}if((a.oneWay||r.oneWayOverride)&&s>1.8){t.fillStyle="rgba(255,255,255,0.75)";for(let g=10;g<o.length-10;g+=Math.max(8,Math.floor(24/Math.max(.5,s*.4)))){const f=o[g],[m,v]=[e(f.x),n(f.z)],M=Math.atan2(f.dirz,f.dirx);t.save(),t.translate(m,v),t.rotate(M),t.beginPath(),t.moveTo(6,0),t.lineTo(-3,-4),t.lineTo(-3,4),t.closePath(),t.fill(),t.restore()}}if(h){t.strokeStyle="rgba(200,210,220,0.6)",t.lineWidth=1;for(let g=0;g<o.length;g+=4){const f=o[g],[m,v]=[e(f.x),n(f.z)];t.beginPath(),t.arc(m,v,1.4,0,7),t.stroke()}}}drawRail(t,e,n,s,{rail:r,samples:a,preset:o}){var c;const l=((c=this.store.selection)==null?void 0:c.id)===r.id;if(r.kind==="monorail"){t.strokeStyle=l?"#4cc38a":"#20262e",t.lineWidth=Math.max(3,2.4*s)+2,this.pathOf(t,e,n,a,r.closed),t.stroke(),t.strokeStyle="#b9c4d0",t.lineWidth=Math.max(2,1.1*s),this.pathOf(t,e,n,a,r.closed),t.stroke(),t.fillStyle="rgba(150,160,172,0.9)";for(let p=0;p<a.length;p+=8){const[_,g]=[e(a[p].x),n(a[p].z)];t.fillRect(_-1.5,g-1.5,3,3)}return}const d=Math.max(2,(o.ballastWidth||8)*s);t.strokeStyle=l?"#4cc38a":"#2b2119",t.lineWidth=d+(l?4:2),this.pathOf(t,e,n,a,r.closed),t.stroke(),t.strokeStyle="#5a4f44",t.lineWidth=d,this.pathOf(t,e,n,a,r.closed),t.stroke();const u=o.tracks||1,h=o.trackSpacing||0;t.strokeStyle="#c9cfd8",t.lineWidth=Math.max(1,.14*s);for(let p=0;p<u;p++){const _=u===1?0:(p-(u-1)/2)*h;for(const g of[-.72,.72])t.beginPath(),a.forEach((f,m)=>{const v=_+g,M=f.x+-f.dirz*v,x=f.z+f.dirx*v;m?t.lineTo(e(M),n(x)):t.moveTo(e(M),n(x))}),t.stroke()}}drawRoundabout(t,e,n,s,r){var d;const[a,o]=[e(r.x),n(r.z)],l=((d=this.store.selection)==null?void 0:d.id)===r.id;t.fillStyle="#33363c",t.beginPath(),t.arc(a,o,r.radius*s,0,7),t.fill(),t.strokeStyle=l?"#4cc38a":"#101216",t.lineWidth=l?4:2,t.beginPath(),t.arc(a,o,r.radius*s,0,7),t.stroke(),t.fillStyle="#3f7a44",t.beginPath(),t.arc(a,o,(r.radius-7.5)*s,0,7),t.fill(),t.strokeStyle="rgba(230,235,242,0.7)",t.setLineDash([4,4]),t.lineWidth=1,t.beginPath(),t.arc(a,o,(r.radius-3.7)*s,0,7),t.stroke(),t.setLineDash([])}drawNodes(t,e,n,s,r,a){const o=this.store.project,l=new Set(this.cache.junctions.map(u=>u.nodeId)),d=this.store.selection;for(const u of Object.keys(o.nodes)){const h=o.nodes[u],[c,p]=[e(h.x),n(h.z)];if(c<-20||p<-20||c>r+20||p>a+20)continue;const _=l.has(u),g=(d==null?void 0:d.type)==="node"&&d.nodeId===u,f=_?7:5;t.fillStyle=g?"#4cc38a":_?"#ff9a3c":"rgba(240,244,250,0.92)",t.strokeStyle="#101216",t.lineWidth=1.2,t.beginPath(),t.rect(c-f/2,p-f/2,f,f),t.fill(),t.stroke(),(h.h||0)>.4&&s>2&&(t.fillStyle="#5aa9ff",t.font="10px sans-serif",t.fillText(`+${Number(h.h).toFixed(1)}`,c+6,p-6))}}drawDraft(t,e,n,s){const r=this.draft;if(!(!r||!r.points.length)){t.strokeStyle="#4cc38a",t.lineWidth=2.5,t.setLineDash([7,5]),t.beginPath(),r.points.forEach((a,o)=>o?t.lineTo(e(a.x),n(a.z)):t.moveTo(e(a.x),n(a.z))),r.cursor&&t.lineTo(e(r.cursor.x),n(r.cursor.z)),t.stroke(),t.setLineDash([]),t.fillStyle="#4cc38a";for(const a of r.points){const[o,l]=[e(a.x),n(a.z)];t.beginPath(),t.arc(o,l,4,0,7),t.fill()}}}pickNode(t,e,n=12){const s=this.canvas.getBoundingClientRect();let r=null,a=n;for(const o of Object.keys(this.store.project.nodes)){const l=this.store.project.nodes[o],[d,u]=this.w2s(l.x,l.z),h=Math.hypot(d-(t-s.left),u-(e-s.top));h<a&&(a=h,r=l)}return r}pickRoad(t,e){let n=null,s=1e9;for(const a of this.cache.roads)for(const o of a.samples){const l=Math.hypot(o.x-t,o.z-e)-a.hw;l<s&&(s=l,n={type:"road",id:a.road.id,road:a.road})}const r=4/this.cam.scale;return s<r?n:null}pickRail(t,e){let n=null,s=1e9;for(const r of this.cache.rails){const a=r.rail.kind==="monorail"?2.5:5;for(const o of r.samples){const l=Math.hypot(o.x-t,o.z-e)-a;l<s&&(s=l,n={type:"rail",id:r.rail.id,rail:r.rail})}}return s<5/this.cam.scale?n:null}pickRoundabout(t,e){for(const n of this.store.project.roundabouts||[])if(Math.hypot(t-n.x,e-n.z)<n.radius+2)return{type:"roundabout",id:n.id,rb:n};return null}snapPoint(t,e){if(!this.store.snap)return{x:t,z:e,node:null};let n=null,s=14/this.cam.scale;for(const o of Object.keys(this.store.project.nodes)){const l=this.store.project.nodes[o],d=Math.hypot(l.x-t,l.z-e);d<s&&(s=d,n=l)}if(n)return{x:n.x,z:n.z,node:n};let r=null,a=9/this.cam.scale;for(const o of this.cache.roads)for(let l=0;l<o.samples.length-1;l++){const d=o.samples[l],u=o.samples[l+1],h=Xi(t,e,d.x,d.z,u.x,u.z);h.d<a&&(a=h.d,r={x:h.x,z:h.z,road:o.road})}return r?{...r,node:null}:{x:t,z:e,node:null}}_bind(){const t=this.canvas;t.addEventListener("pointerdown",e=>this.onDown(e)),t.addEventListener("pointermove",e=>this.onMove(e)),t.addEventListener("pointerup",e=>this.onUp(e)),t.addEventListener("pointerleave",()=>{this.snapMark=null,this.dirty=!0}),t.addEventListener("dblclick",e=>this.onDbl(e)),t.addEventListener("wheel",e=>{e.preventDefault();const{scale:n}=this.cam,s=Math.max(.12,Math.min(60,n*Math.exp(-e.deltaY*.0012))),r=this.s2w(e.clientX,e.clientY);this.cam.scale=s;const a=this.s2w(e.clientX,e.clientY);this.cam.cx+=r.x-a.x,this.cam.cz+=r.z-a.z,this.dirty=!0},{passive:!1}),t.addEventListener("contextmenu",e=>e.preventDefault())}onDown(t){var a,o,l;(o=(a=this.canvas).setPointerCapture)==null||o.call(a,t.pointerId),this.canvas.getBoundingClientRect();const{x:e,z:n}=this.s2w(t.clientX,t.clientY),s=this.store.tool;if(t.button===1||s==="select"&&t.button===0&&!this.pickNode(t.clientX,t.clientY)&&!this.pickRoad(e,n)&&!this.pickRail(e,n)&&!this.pickRoundabout(e,n)){this.drag={mode:"pan",sx:t.clientX,sy:t.clientY,cx:this.cam.cx,cz:this.cam.cz,moved:!1};return}if(s==="select"){if(t.button!==0)return;const d=this.pickNode(t.clientX,t.clientY);if(d){this.store.pushUndo("move node"),this.drag={mode:"node",id:d.id,moved:!1},this.store.selection={type:"node",id:d.id,nodeId:d.id},this.onSelect();return}const u=this.pickRoundabout(e,n)||this.pickRail(e,n)||this.pickRoad(e,n);u?(this.store.selection=u,this.onSelect()):(this.store.selection=null,this.onSelect()),this.dirty=!0;return}if(s==="erase"){if(t.button!==0)return;this.eraseAt(t.clientX,t.clientY,e,n);return}if(s==="roundabout"){if(t.button!==0)return;this.store.pushUndo("add roundabout");const d=Pe("rb"),u=13,h=(p,_)=>{const g=Pe("n");return this.store.project.nodes[g]={id:g,x:p,z:_,h:0},g},c=[h(e,n-u),h(e+u,n),h(e,n+u),h(e-u,n)];this.store.project.roundabouts.push({id:d,x:e,z:n,radius:u,nodeIds:c}),this.store.selection={type:"roundabout",id:d},this.store.emit("roads"),this.onSelect();return}if(s==="terrainUp"||s==="terrainDown"||s==="water"){if(t.button!==0)return;this.store.pushUndo("sculpt terrain"),this.stroke={tool:s,last:0},this.applyBrush(e,n);return}if(t.button!==0)return;if(!this.draft){const d=this.store.activePresetId,u=ie(d);let h="road",c=d;s==="rail"&&(h="rail",c=u.kind==="rail"?d:"railDouble"),s==="monorail"&&(h="monorail",c="monorail"),s==="bridge"&&(h="road",c=u.cat==="bridge"?d:"bridge2"),s==="road"&&u.kind!=="road"&&(c="street2"),this.draft={tool:s,kind:h,presetId:c,points:[]},this.onHint(`${s==="road"?"Road":s} · click to place points · double-click / Enter to finish · Esc to cancel`)}const r=this.snapPoint(e,n);this.draft.points.push({x:r.x,z:r.z,nodeId:((l=r.node)==null?void 0:l.id)||null,roadSnap:r.road||null}),this.dirty=!0}onMove(t){var s,r;this.canvas.getBoundingClientRect();const{x:e,z:n}=this.s2w(t.clientX,t.clientY);if(((s=this.drag)==null?void 0:s.mode)==="pan"){const a=(t.clientX-this.drag.sx)/this.cam.scale,o=(t.clientY-this.drag.sy)/this.cam.scale;Math.abs(t.clientX-this.drag.sx)+Math.abs(t.clientY-this.drag.sy)>3&&(this.drag.moved=!0),this.cam.cx=this.drag.cx-a,this.cam.cz=this.drag.cz-o,this.dirty=!0;return}if(((r=this.drag)==null?void 0:r.mode)==="node"){const a=this.snapPoint(e,n),o=this.store.project.nodes[this.drag.id];o&&(a.node&&a.node.id!==this.drag.id?(o.x=a.node.x,o.z=a.node.z):(o.x=e,o.z=n),this.drag.moved=!0,this.dirty=!0,clearTimeout(this._emitTimer),this._emitTimer=setTimeout(()=>{this.store.emit("roads"),this.scheduleCache()},90));return}if(this.stroke){this.applyBrush(e,n);return}if(this.draft){const a=this.snapPoint(e,n);this.draft.cursor={x:a.x,z:a.z},this.snapMark=a.node?{x:a.x,z:a.z}:null,this.dirty=!0;return}if(this.store.tool==="select")this.hover=this.pickRoad(e,n),this.dirty=!0;else if(["road","rail","monorail","bridge"].includes(this.store.tool)){const a=this.snapPoint(e,n);this.snapMark=a.node?{x:a.x,z:a.z}:null,this.dirty=!0}}onUp(t){var e,n,s;if(((e=this.drag)==null?void 0:e.mode)==="pan"&&!this.drag.moved&&this.store.tool==="select"&&t.button===0&&(this.store.selection=null,this.onSelect()),((n=this.drag)==null?void 0:n.mode)==="node"&&this.drag.moved){if(this.store.project.settings.autoMerge)try{Pn(this.store.project)}catch{}this.store.emit("roads")}((s=this.drag)==null?void 0:s.mode)==="node"&&!this.drag.moved&&this.store.undoStack.pop(),this.drag=null,this.stroke&&(this.stroke=null,this.store.emit("terrain")),this.dirty=!0}onDbl(t){this.canvas.getBoundingClientRect();const{x:e,z:n}=this.s2w(t.clientX,t.clientY);if(this.draft){this.finishDraft();return}if(this.store.tool==="select"){const s=this.pickRoad(e,n);if(s!=null&&s.road){this.store.pushUndo("insert node");const r=Te(this.store.project,s.road);let a=0,o=1e18,l=e,d=n;const u=s.road.closed?r.length:r.length-1;for(let c=0;c<u;c++){const p=r[c%r.length],_=r[(c+1)%r.length],g=Xi(e,n,p.x,p.z,_.x,_.z);g.d<o&&(o=g.d,a=c,l=g.x,d=g.z)}const h=Pe("n");this.store.project.nodes[h]={id:h,x:l,z:d,h:0},Is(this.store.project,s.road,a,h),this.store.selection={type:"node",id:h,nodeId:h},this.store.emit("roads"),this.onSelect()}}}eraseAt(t,e,n,s){const r=this.store,a=this.pickNode(t,e);if(r.pushUndo("erase"),a)r.deleteNode(a.id);else{const o=this.pickRoundabout(n,s)||this.pickRail(n,s)||this.pickRoad(n,s);if(!o){r.undoStack.pop();return}o.type==="road"?r.deleteRoad(o.id):o.type==="rail"?r.deleteRail(o.id):o.type==="roundabout"&&(r.project.roundabouts=r.project.roundabouts.filter(l=>l.id!==o.id))}r.selection=null,r.emit("roads"),this.onSelect()}finishDraft(){const t=this.draft;if(!t)return;const e=[];for(const a of t.points){const o=e[e.length-1];(!o||Math.hypot(a.x-o.x,a.z-o.z)>.6)&&e.push(a)}if(t.points=e,t.points.length<2){this.draft=null,this.onHint(""),this.dirty=!0;return}const n=this.store;n.pushUndo(`add ${t.kind}`);const s=n.project,r=[];for(const a of t.points){if(a.nodeId&&s.nodes[a.nodeId]){r.push(a.nodeId);continue}const o=Pe("n");if(s.nodes[o]={id:o,x:a.x,z:a.z,h:0},r.push(o),a.roadSnap&&s.settings.autoMerge!==!1&&t.kind==="road"){const l=s.roads.find(d=>d.id===a.roadSnap.id);if(l){const d=Te(s,l);let u=0,h=1e18;const c=l.closed?d.length:d.length-1;for(let p=0;p<c;p++){const _=d[p%d.length],g=d[(p+1)%d.length],f=Xi(a.x,a.z,_.x,_.z,g.x,g.z);f.d<h&&(h=f.d,u=p)}h<6&&Is(s,l,u,o)}}}if(t.kind==="road"){const a=ie(t.presetId),o=t.tool==="bridge"?{enabled:!0,height:a.bridgeHeight||5.5,type:"beam"}:a.defaultBridge?{enabled:!0,height:a.bridgeHeight||6,type:"beam"}:{enabled:!1,height:6,type:"beam"},l=n.addRoad(r,t.presetId,{bridge:o});n.selection={type:"road",id:l}}else{const a=n.addRail(r,t.kind,t.presetId);n.selection={type:"rail",id:a}}if(s.settings.autoMerge!==!1&&t.kind==="road")try{Pn(s)}catch{}this.draft=null,this.onHint(""),n.emit("roads"),this.onSelect()}cancelDraft(){this.draft&&(this.draft=null,this.onHint(""),this.dirty=!0)}applyBrush(t,e){var o;const n=performance.now();if(n-(((o=this.stroke)==null?void 0:o.last)||0)<28)return;this.stroke&&(this.stroke.last=n);const{size:s,strength:r}=this.store.brush,a=this.stroke.tool;this.store.project.terrainEdits.push({x:t,z:e,radius:s,delta:a==="terrainUp"?r*.32:a==="terrainDown"?-r*.32:0,type:a==="water"?"water":a==="terrainUp"?"raise":"lower",strength:a==="water"?7:r*.32}),this.store.project.terrainEdits.length>600&&this.store.project.terrainEdits.splice(0,this.store.project.terrainEdits.length-600),this.dirty=!0,this.scheduleCache(),clearTimeout(this._emitTimer),this._emitTimer=setTimeout(()=>this.store.emit("terrain"),220)}focus(t,e,n){this.cam.cx=t,this.cam.cz=e,n&&(this.cam.scale=n),this.dirty=!0}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ua="170",yi={ROTATE:0,DOLLY:1,PAN:2},Mi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},tc=0,Ua=1,ec=2,Yo=1,$o=2,un=3,Un=0,De=1,fn=2,Ln=0,bi=1,Na=2,Fa=3,za=4,nc=5,Yn=100,ic=101,sc=102,rc=103,ac=104,oc=200,lc=201,cc=202,dc=203,Sr=204,yr=205,hc=206,uc=207,fc=208,pc=209,mc=210,gc=211,_c=212,xc=213,vc=214,br=0,Er=1,Tr=2,wi=3,wr=4,Ar=5,Rr=6,Cr=7,jo=0,Mc=1,Sc=2,Dn=0,yc=1,bc=2,Ec=3,Tc=4,wc=5,Ac=6,Rc=7,Zo=300,Ai=301,Ri=302,Pr=303,Lr=304,Fs=306,Dr=1e3,Zn=1001,Ir=1002,Ke=1003,Cc=1004,ns=1005,tn=1006,Gs=1007,Kn=1008,vn=1009,Ko=1010,Jo=1011,Yi=1012,fa=1013,Qn=1014,pn=1015,$i=1016,pa=1017,ma=1018,Ci=1020,Qo=35902,tl=1021,el=1022,Ze=1023,nl=1024,il=1025,Ei=1026,Pi=1027,sl=1028,ga=1029,rl=1030,_a=1031,xa=1033,ws=33776,As=33777,Rs=33778,Cs=33779,Ur=35840,Nr=35841,Fr=35842,zr=35843,Or=36196,kr=37492,Br=37496,Hr=37808,Vr=37809,Gr=37810,Wr=37811,Xr=37812,qr=37813,Yr=37814,$r=37815,jr=37816,Zr=37817,Kr=37818,Jr=37819,Qr=37820,ta=37821,Ps=36492,ea=36494,na=36495,al=36283,ia=36284,sa=36285,ra=36286,Pc=3200,Lc=3201,ol=0,Dc=1,Cn="",He="srgb",Di="srgb-linear",zs="linear",$t="srgb",ri=7680,Oa=519,Ic=512,Uc=513,Nc=514,ll=515,Fc=516,zc=517,Oc=518,kc=519,ka=35044,Ba="300 es",mn=2e3,Us=2001;class ii{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}}const Me=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Ls=Math.PI/180,aa=180/Math.PI;function ji(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Me[i&255]+Me[i>>8&255]+Me[i>>16&255]+Me[i>>24&255]+"-"+Me[t&255]+Me[t>>8&255]+"-"+Me[t>>16&15|64]+Me[t>>24&255]+"-"+Me[e&63|128]+Me[e>>8&255]+"-"+Me[e>>16&255]+Me[e>>24&255]+Me[n&255]+Me[n>>8&255]+Me[n>>16&255]+Me[n>>24&255]).toLowerCase()}function be(i,t,e){return Math.max(t,Math.min(e,i))}function Bc(i,t){return(i%t+t)%t}function Ws(i,t,e){return(1-e)*i+e*t}function Fi(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Re(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Hc={DEG2RAD:Ls};class Lt{constructor(t=0,e=0){Lt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(be(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Pt{constructor(t,e,n,s,r,a,o,l,d){Pt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,d)}set(t,e,n,s,r,a,o,l,d){const u=this.elements;return u[0]=t,u[1]=s,u[2]=o,u[3]=e,u[4]=r,u[5]=l,u[6]=n,u[7]=a,u[8]=d,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],d=n[1],u=n[4],h=n[7],c=n[2],p=n[5],_=n[8],g=s[0],f=s[3],m=s[6],v=s[1],M=s[4],x=s[7],y=s[2],S=s[5],A=s[8];return r[0]=a*g+o*v+l*y,r[3]=a*f+o*M+l*S,r[6]=a*m+o*x+l*A,r[1]=d*g+u*v+h*y,r[4]=d*f+u*M+h*S,r[7]=d*m+u*x+h*A,r[2]=c*g+p*v+_*y,r[5]=c*f+p*M+_*S,r[8]=c*m+p*x+_*A,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],d=t[7],u=t[8];return e*a*u-e*o*d-n*r*u+n*o*l+s*r*d-s*a*l}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],d=t[7],u=t[8],h=u*a-o*d,c=o*l-u*r,p=d*r-a*l,_=e*h+n*c+s*p;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/_;return t[0]=h*g,t[1]=(s*d-u*n)*g,t[2]=(o*n-s*a)*g,t[3]=c*g,t[4]=(u*e-s*l)*g,t[5]=(s*r-o*e)*g,t[6]=p*g,t[7]=(n*l-d*e)*g,t[8]=(a*e-n*r)*g,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){const l=Math.cos(r),d=Math.sin(r);return this.set(n*l,n*d,-n*(l*a+d*o)+a+t,-s*d,s*l,-s*(-d*a+l*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(Xs.makeScale(t,e)),this}rotate(t){return this.premultiply(Xs.makeRotation(-t)),this}translate(t,e){return this.premultiply(Xs.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const Xs=new Pt;function cl(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Ns(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Vc(){const i=Ns("canvas");return i.style.display="block",i}const Ha={};function Gi(i){i in Ha||(Ha[i]=!0,console.warn(i))}function Gc(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}function Wc(i){const t=i.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Xc(i){const t=i.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const Vt={enabled:!0,workingColorSpace:Di,spaces:{},convert:function(i,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===$t&&(i.r=xn(i.r),i.g=xn(i.g),i.b=xn(i.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(i.applyMatrix3(this.spaces[t].toXYZ),i.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===$t&&(i.r=Ti(i.r),i.g=Ti(i.g),i.b=Ti(i.b))),i},fromWorkingColorSpace:function(i,t){return this.convert(i,this.workingColorSpace,t)},toWorkingColorSpace:function(i,t){return this.convert(i,t,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Cn?zs:this.spaces[i].transfer},getLuminanceCoefficients:function(i,t=this.workingColorSpace){return i.fromArray(this.spaces[t].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,t,e){return i.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}};function xn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ti(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}const Va=[.64,.33,.3,.6,.15,.06],Ga=[.2126,.7152,.0722],Wa=[.3127,.329],Xa=new Pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),qa=new Pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);Vt.define({[Di]:{primaries:Va,whitePoint:Wa,transfer:zs,toXYZ:Xa,fromXYZ:qa,luminanceCoefficients:Ga,workingColorSpaceConfig:{unpackColorSpace:He},outputColorSpaceConfig:{drawingBufferColorSpace:He}},[He]:{primaries:Va,whitePoint:Wa,transfer:$t,toXYZ:Xa,fromXYZ:qa,luminanceCoefficients:Ga,outputColorSpaceConfig:{drawingBufferColorSpace:He}}});let ai;class qc{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{ai===void 0&&(ai=Ns("canvas")),ai.width=t.width,ai.height=t.height;const n=ai.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=ai}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Ns("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=xn(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(xn(e[n]/255)*255):e[n]=xn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Yc=0;class dl{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Yc++}),this.uuid=ji(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(qs(s[a].image)):r.push(qs(s[a]))}else r=qs(s);n.url=r}return e||(t.images[this.uuid]=n),n}}function qs(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?qc.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let $c=0;class Ie extends ii{constructor(t=Ie.DEFAULT_IMAGE,e=Ie.DEFAULT_MAPPING,n=Zn,s=Zn,r=tn,a=Kn,o=Ze,l=vn,d=Ie.DEFAULT_ANISOTROPY,u=Cn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:$c++}),this.uuid=ji(),this.name="",this.source=new dl(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=d,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Lt(0,0),this.repeat=new Lt(1,1),this.center=new Lt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Zo)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Dr:t.x=t.x-Math.floor(t.x);break;case Zn:t.x=t.x<0?0:1;break;case Ir:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Dr:t.y=t.y-Math.floor(t.y);break;case Zn:t.y=t.y<0?0:1;break;case Ir:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Ie.DEFAULT_IMAGE=null;Ie.DEFAULT_MAPPING=Zo;Ie.DEFAULT_ANISOTROPY=1;class oe{constructor(t=0,e=0,n=0,s=1){oe.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r;const l=t.elements,d=l[0],u=l[4],h=l[8],c=l[1],p=l[5],_=l[9],g=l[2],f=l[6],m=l[10];if(Math.abs(u-c)<.01&&Math.abs(h-g)<.01&&Math.abs(_-f)<.01){if(Math.abs(u+c)<.1&&Math.abs(h+g)<.1&&Math.abs(_+f)<.1&&Math.abs(d+p+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const M=(d+1)/2,x=(p+1)/2,y=(m+1)/2,S=(u+c)/4,A=(h+g)/4,C=(_+f)/4;return M>x&&M>y?M<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(M),s=S/n,r=A/n):x>y?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=S/s,r=C/s):y<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(y),n=A/r,s=C/r),this.set(n,s,r,e),this}let v=Math.sqrt((f-_)*(f-_)+(h-g)*(h-g)+(c-u)*(c-u));return Math.abs(v)<.001&&(v=1),this.x=(f-_)/v,this.y=(h-g)/v,this.z=(c-u)/v,this.w=Math.acos((d+p+m-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class jc extends ii{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new oe(0,0,t,e),this.scissorTest=!1,this.viewport=new oe(0,0,t,e);const s={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:tn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const r=new Ie(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);r.flipY=!1,r.generateMipmaps=n.generateMipmaps,r.internalFormat=n.internalFormat,this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,s=t.textures.length;n<s;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new dl(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ti extends jc{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class hl extends Ie{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ke,this.minFilter=Ke,this.wrapR=Zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Zc extends Ie{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ke,this.minFilter=Ke,this.wrapR=Zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ei{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],d=n[s+1],u=n[s+2],h=n[s+3];const c=r[a+0],p=r[a+1],_=r[a+2],g=r[a+3];if(o===0){t[e+0]=l,t[e+1]=d,t[e+2]=u,t[e+3]=h;return}if(o===1){t[e+0]=c,t[e+1]=p,t[e+2]=_,t[e+3]=g;return}if(h!==g||l!==c||d!==p||u!==_){let f=1-o;const m=l*c+d*p+u*_+h*g,v=m>=0?1:-1,M=1-m*m;if(M>Number.EPSILON){const y=Math.sqrt(M),S=Math.atan2(y,m*v);f=Math.sin(f*S)/y,o=Math.sin(o*S)/y}const x=o*v;if(l=l*f+c*x,d=d*f+p*x,u=u*f+_*x,h=h*f+g*x,f===1-o){const y=1/Math.sqrt(l*l+d*d+u*u+h*h);l*=y,d*=y,u*=y,h*=y}}t[e]=l,t[e+1]=d,t[e+2]=u,t[e+3]=h}static multiplyQuaternionsFlat(t,e,n,s,r,a){const o=n[s],l=n[s+1],d=n[s+2],u=n[s+3],h=r[a],c=r[a+1],p=r[a+2],_=r[a+3];return t[e]=o*_+u*h+l*p-d*c,t[e+1]=l*_+u*c+d*h-o*p,t[e+2]=d*_+u*p+o*c-l*h,t[e+3]=u*_-o*h-l*c-d*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,d=o(n/2),u=o(s/2),h=o(r/2),c=l(n/2),p=l(s/2),_=l(r/2);switch(a){case"XYZ":this._x=c*u*h+d*p*_,this._y=d*p*h-c*u*_,this._z=d*u*_+c*p*h,this._w=d*u*h-c*p*_;break;case"YXZ":this._x=c*u*h+d*p*_,this._y=d*p*h-c*u*_,this._z=d*u*_-c*p*h,this._w=d*u*h+c*p*_;break;case"ZXY":this._x=c*u*h-d*p*_,this._y=d*p*h+c*u*_,this._z=d*u*_+c*p*h,this._w=d*u*h-c*p*_;break;case"ZYX":this._x=c*u*h-d*p*_,this._y=d*p*h+c*u*_,this._z=d*u*_-c*p*h,this._w=d*u*h+c*p*_;break;case"YZX":this._x=c*u*h+d*p*_,this._y=d*p*h+c*u*_,this._z=d*u*_-c*p*h,this._w=d*u*h-c*p*_;break;case"XZY":this._x=c*u*h-d*p*_,this._y=d*p*h-c*u*_,this._z=d*u*_+c*p*h,this._w=d*u*h+c*p*_;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],d=e[2],u=e[6],h=e[10],c=n+o+h;if(c>0){const p=.5/Math.sqrt(c+1);this._w=.25/p,this._x=(u-l)*p,this._y=(r-d)*p,this._z=(a-s)*p}else if(n>o&&n>h){const p=2*Math.sqrt(1+n-o-h);this._w=(u-l)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+d)/p}else if(o>h){const p=2*Math.sqrt(1+o-n-h);this._w=(r-d)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(l+u)/p}else{const p=2*Math.sqrt(1+h-n-o);this._w=(a-s)/p,this._x=(r+d)/p,this._y=(l+u)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(be(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,d=e._z,u=e._w;return this._x=n*u+a*o+s*d-r*l,this._y=s*u+a*l+r*o-n*d,this._z=r*u+a*d+n*l-s*o,this._w=a*u-n*o-s*l-r*d,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,s=this._y,r=this._z,a=this._w;let o=a*t._w+n*t._x+s*t._y+r*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;const l=1-o*o;if(l<=Number.EPSILON){const p=1-e;return this._w=p*a+e*this._w,this._x=p*n+e*this._x,this._y=p*s+e*this._y,this._z=p*r+e*this._z,this.normalize(),this}const d=Math.sqrt(l),u=Math.atan2(d,o),h=Math.sin((1-e)*u)/d,c=Math.sin(e*u)/d;return this._w=a*h+this._w*c,this._x=n*h+this._x*c,this._y=s*h+this._y*c,this._z=r*h+this._z*c,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class B{constructor(t=0,e=0,n=0){B.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Ya.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Ya.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,d=2*(a*s-o*n),u=2*(o*e-r*s),h=2*(r*n-a*e);return this.x=e+l*d+a*h-o*u,this.y=n+l*u+o*d-r*h,this.z=s+l*h+r*u-a*d,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Ys.copy(this).projectOnVector(t),this.sub(Ys)}reflect(t){return this.sub(Ys.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(be(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Ys=new B,Ya=new ei;class Zi{constructor(t=new B(1/0,1/0,1/0),e=new B(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Xe.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Xe.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=Xe.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,Xe):Xe.fromBufferAttribute(r,a),Xe.applyMatrix4(t.matrixWorld),this.expandByPoint(Xe);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),is.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),is.copy(n.boundingBox)),is.applyMatrix4(t.matrixWorld),this.union(is)}const s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Xe),Xe.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(zi),ss.subVectors(this.max,zi),oi.subVectors(t.a,zi),li.subVectors(t.b,zi),ci.subVectors(t.c,zi),yn.subVectors(li,oi),bn.subVectors(ci,li),kn.subVectors(oi,ci);let e=[0,-yn.z,yn.y,0,-bn.z,bn.y,0,-kn.z,kn.y,yn.z,0,-yn.x,bn.z,0,-bn.x,kn.z,0,-kn.x,-yn.y,yn.x,0,-bn.y,bn.x,0,-kn.y,kn.x,0];return!$s(e,oi,li,ci,ss)||(e=[1,0,0,0,1,0,0,0,1],!$s(e,oi,li,ci,ss))?!1:(rs.crossVectors(yn,bn),e=[rs.x,rs.y,rs.z],$s(e,oi,li,ci,ss))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Xe).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Xe).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(on[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),on[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),on[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),on[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),on[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),on[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),on[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),on[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(on),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const on=[new B,new B,new B,new B,new B,new B,new B,new B],Xe=new B,is=new Zi,oi=new B,li=new B,ci=new B,yn=new B,bn=new B,kn=new B,zi=new B,ss=new B,rs=new B,Bn=new B;function $s(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Bn.fromArray(i,r);const o=s.x*Math.abs(Bn.x)+s.y*Math.abs(Bn.y)+s.z*Math.abs(Bn.z),l=t.dot(Bn),d=e.dot(Bn),u=n.dot(Bn);if(Math.max(-Math.max(l,d,u),Math.min(l,d,u))>o)return!1}return!0}const Kc=new Zi,Oi=new B,js=new B;class va{constructor(t=new B,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Kc.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Oi.subVectors(t,this.center);const e=Oi.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Oi,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(js.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Oi.copy(t.center).add(js)),this.expandByPoint(Oi.copy(t.center).sub(js))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const ln=new B,Zs=new B,as=new B,En=new B,Ks=new B,os=new B,Js=new B;class ul{constructor(t=new B,e=new B(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,ln)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=ln.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(ln.copy(this.origin).addScaledVector(this.direction,e),ln.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Zs.copy(t).add(e).multiplyScalar(.5),as.copy(e).sub(t).normalize(),En.copy(this.origin).sub(Zs);const r=t.distanceTo(e)*.5,a=-this.direction.dot(as),o=En.dot(this.direction),l=-En.dot(as),d=En.lengthSq(),u=Math.abs(1-a*a);let h,c,p,_;if(u>0)if(h=a*l-o,c=a*o-l,_=r*u,h>=0)if(c>=-_)if(c<=_){const g=1/u;h*=g,c*=g,p=h*(h+a*c+2*o)+c*(a*h+c+2*l)+d}else c=r,h=Math.max(0,-(a*c+o)),p=-h*h+c*(c+2*l)+d;else c=-r,h=Math.max(0,-(a*c+o)),p=-h*h+c*(c+2*l)+d;else c<=-_?(h=Math.max(0,-(-a*r+o)),c=h>0?-r:Math.min(Math.max(-r,-l),r),p=-h*h+c*(c+2*l)+d):c<=_?(h=0,c=Math.min(Math.max(-r,-l),r),p=c*(c+2*l)+d):(h=Math.max(0,-(a*r+o)),c=h>0?r:Math.min(Math.max(-r,-l),r),p=-h*h+c*(c+2*l)+d);else c=a>0?-r:r,h=Math.max(0,-(a*c+o)),p=-h*h+c*(c+2*l)+d;return n&&n.copy(this.origin).addScaledVector(this.direction,h),s&&s.copy(Zs).addScaledVector(as,c),p}intersectSphere(t,e){ln.subVectors(t.center,this.origin);const n=ln.dot(this.direction),s=ln.dot(ln)-n*n,r=t.radius*t.radius;if(s>r)return null;const a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l;const d=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,c=this.origin;return d>=0?(n=(t.min.x-c.x)*d,s=(t.max.x-c.x)*d):(n=(t.max.x-c.x)*d,s=(t.min.x-c.x)*d),u>=0?(r=(t.min.y-c.y)*u,a=(t.max.y-c.y)*u):(r=(t.max.y-c.y)*u,a=(t.min.y-c.y)*u),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),h>=0?(o=(t.min.z-c.z)*h,l=(t.max.z-c.z)*h):(o=(t.max.z-c.z)*h,l=(t.min.z-c.z)*h),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,ln)!==null}intersectTriangle(t,e,n,s,r){Ks.subVectors(e,t),os.subVectors(n,t),Js.crossVectors(Ks,os);let a=this.direction.dot(Js),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;En.subVectors(this.origin,t);const l=o*this.direction.dot(os.crossVectors(En,os));if(l<0)return null;const d=o*this.direction.dot(Ks.cross(En));if(d<0||l+d>a)return null;const u=-o*En.dot(Js);return u<0?null:this.at(u/a,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class le{constructor(t,e,n,s,r,a,o,l,d,u,h,c,p,_,g,f){le.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,d,u,h,c,p,_,g,f)}set(t,e,n,s,r,a,o,l,d,u,h,c,p,_,g,f){const m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=a,m[9]=o,m[13]=l,m[2]=d,m[6]=u,m[10]=h,m[14]=c,m[3]=p,m[7]=_,m[11]=g,m[15]=f,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new le().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,s=1/di.setFromMatrixColumn(t,0).length(),r=1/di.setFromMatrixColumn(t,1).length(),a=1/di.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),d=Math.sin(s),u=Math.cos(r),h=Math.sin(r);if(t.order==="XYZ"){const c=a*u,p=a*h,_=o*u,g=o*h;e[0]=l*u,e[4]=-l*h,e[8]=d,e[1]=p+_*d,e[5]=c-g*d,e[9]=-o*l,e[2]=g-c*d,e[6]=_+p*d,e[10]=a*l}else if(t.order==="YXZ"){const c=l*u,p=l*h,_=d*u,g=d*h;e[0]=c+g*o,e[4]=_*o-p,e[8]=a*d,e[1]=a*h,e[5]=a*u,e[9]=-o,e[2]=p*o-_,e[6]=g+c*o,e[10]=a*l}else if(t.order==="ZXY"){const c=l*u,p=l*h,_=d*u,g=d*h;e[0]=c-g*o,e[4]=-a*h,e[8]=_+p*o,e[1]=p+_*o,e[5]=a*u,e[9]=g-c*o,e[2]=-a*d,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){const c=a*u,p=a*h,_=o*u,g=o*h;e[0]=l*u,e[4]=_*d-p,e[8]=c*d+g,e[1]=l*h,e[5]=g*d+c,e[9]=p*d-_,e[2]=-d,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){const c=a*l,p=a*d,_=o*l,g=o*d;e[0]=l*u,e[4]=g-c*h,e[8]=_*h+p,e[1]=h,e[5]=a*u,e[9]=-o*u,e[2]=-d*u,e[6]=p*h+_,e[10]=c-g*h}else if(t.order==="XZY"){const c=a*l,p=a*d,_=o*l,g=o*d;e[0]=l*u,e[4]=-h,e[8]=d*u,e[1]=c*h+g,e[5]=a*u,e[9]=p*h-_,e[2]=_*h-p,e[6]=o*u,e[10]=g*h+c}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Jc,t,Qc)}lookAt(t,e,n){const s=this.elements;return Ne.subVectors(t,e),Ne.lengthSq()===0&&(Ne.z=1),Ne.normalize(),Tn.crossVectors(n,Ne),Tn.lengthSq()===0&&(Math.abs(n.z)===1?Ne.x+=1e-4:Ne.z+=1e-4,Ne.normalize(),Tn.crossVectors(n,Ne)),Tn.normalize(),ls.crossVectors(Ne,Tn),s[0]=Tn.x,s[4]=ls.x,s[8]=Ne.x,s[1]=Tn.y,s[5]=ls.y,s[9]=Ne.y,s[2]=Tn.z,s[6]=ls.z,s[10]=Ne.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],d=n[12],u=n[1],h=n[5],c=n[9],p=n[13],_=n[2],g=n[6],f=n[10],m=n[14],v=n[3],M=n[7],x=n[11],y=n[15],S=s[0],A=s[4],C=s[8],b=s[12],E=s[1],P=s[5],H=s[9],F=s[13],L=s[2],W=s[6],z=s[10],q=s[14],O=s[3],J=s[7],nt=s[11],Mt=s[15];return r[0]=a*S+o*E+l*L+d*O,r[4]=a*A+o*P+l*W+d*J,r[8]=a*C+o*H+l*z+d*nt,r[12]=a*b+o*F+l*q+d*Mt,r[1]=u*S+h*E+c*L+p*O,r[5]=u*A+h*P+c*W+p*J,r[9]=u*C+h*H+c*z+p*nt,r[13]=u*b+h*F+c*q+p*Mt,r[2]=_*S+g*E+f*L+m*O,r[6]=_*A+g*P+f*W+m*J,r[10]=_*C+g*H+f*z+m*nt,r[14]=_*b+g*F+f*q+m*Mt,r[3]=v*S+M*E+x*L+y*O,r[7]=v*A+M*P+x*W+y*J,r[11]=v*C+M*H+x*z+y*nt,r[15]=v*b+M*F+x*q+y*Mt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],d=t[13],u=t[2],h=t[6],c=t[10],p=t[14],_=t[3],g=t[7],f=t[11],m=t[15];return _*(+r*l*h-s*d*h-r*o*c+n*d*c+s*o*p-n*l*p)+g*(+e*l*p-e*d*c+r*a*c-s*a*p+s*d*u-r*l*u)+f*(+e*d*h-e*o*p-r*a*h+n*a*p+r*o*u-n*d*u)+m*(-s*o*u-e*l*h+e*o*c+s*a*h-n*a*c+n*l*u)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],d=t[7],u=t[8],h=t[9],c=t[10],p=t[11],_=t[12],g=t[13],f=t[14],m=t[15],v=h*f*d-g*c*d+g*l*p-o*f*p-h*l*m+o*c*m,M=_*c*d-u*f*d-_*l*p+a*f*p+u*l*m-a*c*m,x=u*g*d-_*h*d+_*o*p-a*g*p-u*o*m+a*h*m,y=_*h*l-u*g*l-_*o*c+a*g*c+u*o*f-a*h*f,S=e*v+n*M+s*x+r*y;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/S;return t[0]=v*A,t[1]=(g*c*r-h*f*r-g*s*p+n*f*p+h*s*m-n*c*m)*A,t[2]=(o*f*r-g*l*r+g*s*d-n*f*d-o*s*m+n*l*m)*A,t[3]=(h*l*r-o*c*r-h*s*d+n*c*d+o*s*p-n*l*p)*A,t[4]=M*A,t[5]=(u*f*r-_*c*r+_*s*p-e*f*p-u*s*m+e*c*m)*A,t[6]=(_*l*r-a*f*r-_*s*d+e*f*d+a*s*m-e*l*m)*A,t[7]=(a*c*r-u*l*r+u*s*d-e*c*d-a*s*p+e*l*p)*A,t[8]=x*A,t[9]=(_*h*r-u*g*r-_*n*p+e*g*p+u*n*m-e*h*m)*A,t[10]=(a*g*r-_*o*r+_*n*d-e*g*d-a*n*m+e*o*m)*A,t[11]=(u*o*r-a*h*r-u*n*d+e*h*d+a*n*p-e*o*p)*A,t[12]=y*A,t[13]=(u*g*s-_*h*s+_*n*c-e*g*c-u*n*f+e*h*f)*A,t[14]=(_*o*s-a*g*s-_*n*l+e*g*l+a*n*f-e*o*f)*A,t[15]=(a*h*s-u*o*s+u*n*l-e*h*l-a*n*c+e*o*c)*A,this}scale(t){const e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,d=r*a,u=r*o;return this.set(d*a+n,d*o-s*l,d*l+s*o,0,d*o+s*l,u*o+n,u*l-s*a,0,d*l-s*o,u*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,d=r+r,u=a+a,h=o+o,c=r*d,p=r*u,_=r*h,g=a*u,f=a*h,m=o*h,v=l*d,M=l*u,x=l*h,y=n.x,S=n.y,A=n.z;return s[0]=(1-(g+m))*y,s[1]=(p+x)*y,s[2]=(_-M)*y,s[3]=0,s[4]=(p-x)*S,s[5]=(1-(c+m))*S,s[6]=(f+v)*S,s[7]=0,s[8]=(_+M)*A,s[9]=(f-v)*A,s[10]=(1-(c+g))*A,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;let r=di.set(s[0],s[1],s[2]).length();const a=di.set(s[4],s[5],s[6]).length(),o=di.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),t.x=s[12],t.y=s[13],t.z=s[14],qe.copy(this);const d=1/r,u=1/a,h=1/o;return qe.elements[0]*=d,qe.elements[1]*=d,qe.elements[2]*=d,qe.elements[4]*=u,qe.elements[5]*=u,qe.elements[6]*=u,qe.elements[8]*=h,qe.elements[9]*=h,qe.elements[10]*=h,e.setFromRotationMatrix(qe),n.x=r,n.y=a,n.z=o,this}makePerspective(t,e,n,s,r,a,o=mn){const l=this.elements,d=2*r/(e-t),u=2*r/(n-s),h=(e+t)/(e-t),c=(n+s)/(n-s);let p,_;if(o===mn)p=-(a+r)/(a-r),_=-2*a*r/(a-r);else if(o===Us)p=-a/(a-r),_=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=d,l[4]=0,l[8]=h,l[12]=0,l[1]=0,l[5]=u,l[9]=c,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=mn){const l=this.elements,d=1/(e-t),u=1/(n-s),h=1/(a-r),c=(e+t)*d,p=(n+s)*u;let _,g;if(o===mn)_=(a+r)*h,g=-2*h;else if(o===Us)_=r*h,g=-1*h;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*d,l[4]=0,l[8]=0,l[12]=-c,l[1]=0,l[5]=2*u,l[9]=0,l[13]=-p,l[2]=0,l[6]=0,l[10]=g,l[14]=-_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const di=new B,qe=new le,Jc=new B(0,0,0),Qc=new B(1,1,1),Tn=new B,ls=new B,Ne=new B,$a=new le,ja=new ei;class sn{constructor(t=0,e=0,n=0,s=sn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],d=s[5],u=s[9],h=s[2],c=s[6],p=s[10];switch(e){case"XYZ":this._y=Math.asin(be(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(c,d),this._z=0);break;case"YXZ":this._x=Math.asin(-be(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,d)):(this._y=Math.atan2(-h,r),this._z=0);break;case"ZXY":this._x=Math.asin(be(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(-h,p),this._z=Math.atan2(-a,d)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-be(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(c,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,d));break;case"YZX":this._z=Math.asin(be(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,d),this._y=Math.atan2(-h,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-be(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(c,d),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-u,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return $a.makeRotationFromQuaternion(t),this.setFromRotationMatrix($a,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return ja.setFromEuler(this),this.setFromQuaternion(ja,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}sn.DEFAULT_ORDER="XYZ";class fl{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let td=0;const Za=new B,hi=new ei,cn=new le,cs=new B,ki=new B,ed=new B,nd=new ei,Ka=new B(1,0,0),Ja=new B(0,1,0),Qa=new B(0,0,1),to={type:"added"},id={type:"removed"},ui={type:"childadded",child:null},Qs={type:"childremoved",child:null};class xe extends ii{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:td++}),this.uuid=ji(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=xe.DEFAULT_UP.clone();const t=new B,e=new sn,n=new ei,s=new B(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new le},normalMatrix:{value:new Pt}}),this.matrix=new le,this.matrixWorld=new le,this.matrixAutoUpdate=xe.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=xe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new fl,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return hi.setFromAxisAngle(t,e),this.quaternion.multiply(hi),this}rotateOnWorldAxis(t,e){return hi.setFromAxisAngle(t,e),this.quaternion.premultiply(hi),this}rotateX(t){return this.rotateOnAxis(Ka,t)}rotateY(t){return this.rotateOnAxis(Ja,t)}rotateZ(t){return this.rotateOnAxis(Qa,t)}translateOnAxis(t,e){return Za.copy(t).applyQuaternion(this.quaternion),this.position.add(Za.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Ka,t)}translateY(t){return this.translateOnAxis(Ja,t)}translateZ(t){return this.translateOnAxis(Qa,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(cn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?cs.copy(t):cs.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),ki.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?cn.lookAt(ki,cs,this.up):cn.lookAt(cs,ki,this.up),this.quaternion.setFromRotationMatrix(cn),s&&(cn.extractRotation(s.matrixWorld),hi.setFromRotationMatrix(cn),this.quaternion.premultiply(hi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(to),ui.child=t,this.dispatchEvent(ui),ui.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(id),Qs.child=t,this.dispatchEvent(Qs),Qs.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),cn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),cn.multiply(t.parent.matrixWorld)),t.applyMatrix4(cn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(to),ui.child=t,this.dispatchEvent(ui),ui.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ki,t,ed),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ki,nd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let d=0,u=l.length;d<u;d++){const h=l[d];r(t.shapes,h)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,d=this.material.length;l<d;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){const o=a(t.geometries),l=a(t.materials),d=a(t.textures),u=a(t.images),h=a(t.shapes),c=a(t.skeletons),p=a(t.animations),_=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),d.length>0&&(n.textures=d),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),c.length>0&&(n.skeletons=c),p.length>0&&(n.animations=p),_.length>0&&(n.nodes=_)}return n.object=s,n;function a(o){const l=[];for(const d in o){const u=o[d];delete u.metadata,l.push(u)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}}xe.DEFAULT_UP=new B(0,1,0);xe.DEFAULT_MATRIX_AUTO_UPDATE=!0;xe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Ye=new B,dn=new B,tr=new B,hn=new B,fi=new B,pi=new B,eo=new B,er=new B,nr=new B,ir=new B,sr=new oe,rr=new oe,ar=new oe;class je{constructor(t=new B,e=new B,n=new B){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Ye.subVectors(t,e),s.cross(Ye);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Ye.subVectors(s,e),dn.subVectors(n,e),tr.subVectors(t,e);const a=Ye.dot(Ye),o=Ye.dot(dn),l=Ye.dot(tr),d=dn.dot(dn),u=dn.dot(tr),h=a*d-o*o;if(h===0)return r.set(0,0,0),null;const c=1/h,p=(d*l-o*u)*c,_=(a*u-o*l)*c;return r.set(1-p-_,_,p)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,hn)===null?!1:hn.x>=0&&hn.y>=0&&hn.x+hn.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,hn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,hn.x),l.addScaledVector(a,hn.y),l.addScaledVector(o,hn.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return sr.setScalar(0),rr.setScalar(0),ar.setScalar(0),sr.fromBufferAttribute(t,e),rr.fromBufferAttribute(t,n),ar.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(sr,r.x),a.addScaledVector(rr,r.y),a.addScaledVector(ar,r.z),a}static isFrontFacing(t,e,n,s){return Ye.subVectors(n,e),dn.subVectors(t,e),Ye.cross(dn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ye.subVectors(this.c,this.b),dn.subVectors(this.a,this.b),Ye.cross(dn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return je.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return je.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return je.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return je.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return je.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,r=this.c;let a,o;fi.subVectors(s,n),pi.subVectors(r,n),er.subVectors(t,n);const l=fi.dot(er),d=pi.dot(er);if(l<=0&&d<=0)return e.copy(n);nr.subVectors(t,s);const u=fi.dot(nr),h=pi.dot(nr);if(u>=0&&h<=u)return e.copy(s);const c=l*h-u*d;if(c<=0&&l>=0&&u<=0)return a=l/(l-u),e.copy(n).addScaledVector(fi,a);ir.subVectors(t,r);const p=fi.dot(ir),_=pi.dot(ir);if(_>=0&&p<=_)return e.copy(r);const g=p*d-l*_;if(g<=0&&d>=0&&_<=0)return o=d/(d-_),e.copy(n).addScaledVector(pi,o);const f=u*_-p*h;if(f<=0&&h-u>=0&&p-_>=0)return eo.subVectors(r,s),o=(h-u)/(h-u+(p-_)),e.copy(s).addScaledVector(eo,o);const m=1/(f+g+c);return a=g*m,o=c*m,e.copy(n).addScaledVector(fi,a).addScaledVector(pi,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const pl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},wn={h:0,s:0,l:0},ds={h:0,s:0,l:0};function or(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class Bt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=He){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Vt.toWorkingColorSpace(this,e),this}setRGB(t,e,n,s=Vt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Vt.toWorkingColorSpace(this,s),this}setHSL(t,e,n,s=Vt.workingColorSpace){if(t=Bc(t,1),e=be(e,0,1),n=be(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=or(a,r,t+1/3),this.g=or(a,r,t),this.b=or(a,r,t-1/3)}return Vt.toWorkingColorSpace(this,s),this}setStyle(t,e=He){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=He){const n=pl[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=xn(t.r),this.g=xn(t.g),this.b=xn(t.b),this}copyLinearToSRGB(t){return this.r=Ti(t.r),this.g=Ti(t.g),this.b=Ti(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=He){return Vt.fromWorkingColorSpace(Se.copy(this),t),Math.round(be(Se.r*255,0,255))*65536+Math.round(be(Se.g*255,0,255))*256+Math.round(be(Se.b*255,0,255))}getHexString(t=He){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Vt.workingColorSpace){Vt.fromWorkingColorSpace(Se.copy(this),e);const n=Se.r,s=Se.g,r=Se.b,a=Math.max(n,s,r),o=Math.min(n,s,r);let l,d;const u=(o+a)/2;if(o===a)l=0,d=0;else{const h=a-o;switch(d=u<=.5?h/(a+o):h/(2-a-o),a){case n:l=(s-r)/h+(s<r?6:0);break;case s:l=(r-n)/h+2;break;case r:l=(n-s)/h+4;break}l/=6}return t.h=l,t.s=d,t.l=u,t}getRGB(t,e=Vt.workingColorSpace){return Vt.fromWorkingColorSpace(Se.copy(this),e),t.r=Se.r,t.g=Se.g,t.b=Se.b,t}getStyle(t=He){Vt.fromWorkingColorSpace(Se.copy(this),t);const e=Se.r,n=Se.g,s=Se.b;return t!==He?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(wn),this.setHSL(wn.h+t,wn.s+e,wn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(wn),t.getHSL(ds);const n=Ws(wn.h,ds.h,e),s=Ws(wn.s,ds.s,e),r=Ws(wn.l,ds.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Se=new Bt;Bt.NAMES=pl;let sd=0;class Ki extends ii{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:sd++}),this.uuid=ji(),this.name="",this.blending=bi,this.side=Un,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Sr,this.blendDst=yr,this.blendEquation=Yn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Bt(0,0,0),this.blendAlpha=0,this.depthFunc=wi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Oa,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ri,this.stencilZFail=ri,this.stencilZPass=ri,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==bi&&(n.blending=this.blending),this.side!==Un&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Sr&&(n.blendSrc=this.blendSrc),this.blendDst!==yr&&(n.blendDst=this.blendDst),this.blendEquation!==Yn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==wi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Oa&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ri&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ri&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ri&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(e){const r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class ml extends Ki{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Bt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new sn,this.combine=jo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const de=new B,hs=new Lt;class en{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=ka,this.updateRanges=[],this.gpuType=pn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)hs.fromBufferAttribute(this,e),hs.applyMatrix3(t),this.setXY(e,hs.x,hs.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.applyMatrix3(t),this.setXYZ(e,de.x,de.y,de.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.applyMatrix4(t),this.setXYZ(e,de.x,de.y,de.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.applyNormalMatrix(t),this.setXYZ(e,de.x,de.y,de.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)de.fromBufferAttribute(this,e),de.transformDirection(t),this.setXYZ(e,de.x,de.y,de.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Fi(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Re(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Fi(e,this.array)),e}setX(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Fi(e,this.array)),e}setY(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Fi(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Fi(e,this.array)),e}setW(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),n=Re(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),n=Re(n,this.array),s=Re(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),n=Re(n,this.array),s=Re(s,this.array),r=Re(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==ka&&(t.usage=this.usage),t}}class gl extends en{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class _l extends en{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class nn extends en{constructor(t,e,n){super(new Float32Array(t),e,n)}}let rd=0;const Be=new le,lr=new xe,mi=new B,Fe=new Zi,Bi=new Zi,me=new B;class Fn extends ii{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:rd++}),this.uuid=ji(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(cl(t)?_l:gl)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Pt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Be.makeRotationFromQuaternion(t),this.applyMatrix4(Be),this}rotateX(t){return Be.makeRotationX(t),this.applyMatrix4(Be),this}rotateY(t){return Be.makeRotationY(t),this.applyMatrix4(Be),this}rotateZ(t){return Be.makeRotationZ(t),this.applyMatrix4(Be),this}translate(t,e,n){return Be.makeTranslation(t,e,n),this.applyMatrix4(Be),this}scale(t,e,n){return Be.makeScale(t,e,n),this.applyMatrix4(Be),this}lookAt(t){return lr.lookAt(t),lr.updateMatrix(),this.applyMatrix4(lr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(mi).negate(),this.translate(mi.x,mi.y,mi.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,r=t.length;s<r;s++){const a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new nn(n,3))}else{for(let n=0,s=e.count;n<s;n++){const r=t[n];e.setXYZ(n,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Zi);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new B(-1/0,-1/0,-1/0),new B(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const r=e[n];Fe.setFromBufferAttribute(r),this.morphTargetsRelative?(me.addVectors(this.boundingBox.min,Fe.min),this.boundingBox.expandByPoint(me),me.addVectors(this.boundingBox.max,Fe.max),this.boundingBox.expandByPoint(me)):(this.boundingBox.expandByPoint(Fe.min),this.boundingBox.expandByPoint(Fe.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new va);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new B,1/0);return}if(t){const n=this.boundingSphere.center;if(Fe.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){const o=e[r];Bi.setFromBufferAttribute(o),this.morphTargetsRelative?(me.addVectors(Fe.min,Bi.min),Fe.expandByPoint(me),me.addVectors(Fe.max,Bi.max),Fe.expandByPoint(me)):(Fe.expandByPoint(Bi.min),Fe.expandByPoint(Bi.max))}Fe.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)me.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(me));if(e)for(let r=0,a=e.length;r<a;r++){const o=e[r],l=this.morphTargetsRelative;for(let d=0,u=o.count;d<u;d++)me.fromBufferAttribute(o,d),l&&(mi.fromBufferAttribute(t,d),me.add(mi)),s=Math.max(s,n.distanceToSquared(me))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new en(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let C=0;C<n.count;C++)o[C]=new B,l[C]=new B;const d=new B,u=new B,h=new B,c=new Lt,p=new Lt,_=new Lt,g=new B,f=new B;function m(C,b,E){d.fromBufferAttribute(n,C),u.fromBufferAttribute(n,b),h.fromBufferAttribute(n,E),c.fromBufferAttribute(r,C),p.fromBufferAttribute(r,b),_.fromBufferAttribute(r,E),u.sub(d),h.sub(d),p.sub(c),_.sub(c);const P=1/(p.x*_.y-_.x*p.y);isFinite(P)&&(g.copy(u).multiplyScalar(_.y).addScaledVector(h,-p.y).multiplyScalar(P),f.copy(h).multiplyScalar(p.x).addScaledVector(u,-_.x).multiplyScalar(P),o[C].add(g),o[b].add(g),o[E].add(g),l[C].add(f),l[b].add(f),l[E].add(f))}let v=this.groups;v.length===0&&(v=[{start:0,count:t.count}]);for(let C=0,b=v.length;C<b;++C){const E=v[C],P=E.start,H=E.count;for(let F=P,L=P+H;F<L;F+=3)m(t.getX(F+0),t.getX(F+1),t.getX(F+2))}const M=new B,x=new B,y=new B,S=new B;function A(C){y.fromBufferAttribute(s,C),S.copy(y);const b=o[C];M.copy(b),M.sub(y.multiplyScalar(y.dot(b))).normalize(),x.crossVectors(S,b);const P=x.dot(l[C])<0?-1:1;a.setXYZW(C,M.x,M.y,M.z,P)}for(let C=0,b=v.length;C<b;++C){const E=v[C],P=E.start,H=E.count;for(let F=P,L=P+H;F<L;F+=3)A(t.getX(F+0)),A(t.getX(F+1)),A(t.getX(F+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new en(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let c=0,p=n.count;c<p;c++)n.setXYZ(c,0,0,0);const s=new B,r=new B,a=new B,o=new B,l=new B,d=new B,u=new B,h=new B;if(t)for(let c=0,p=t.count;c<p;c+=3){const _=t.getX(c+0),g=t.getX(c+1),f=t.getX(c+2);s.fromBufferAttribute(e,_),r.fromBufferAttribute(e,g),a.fromBufferAttribute(e,f),u.subVectors(a,r),h.subVectors(s,r),u.cross(h),o.fromBufferAttribute(n,_),l.fromBufferAttribute(n,g),d.fromBufferAttribute(n,f),o.add(u),l.add(u),d.add(u),n.setXYZ(_,o.x,o.y,o.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(f,d.x,d.y,d.z)}else for(let c=0,p=e.count;c<p;c+=3)s.fromBufferAttribute(e,c+0),r.fromBufferAttribute(e,c+1),a.fromBufferAttribute(e,c+2),u.subVectors(a,r),h.subVectors(s,r),u.cross(h),n.setXYZ(c+0,u.x,u.y,u.z),n.setXYZ(c+1,u.x,u.y,u.z),n.setXYZ(c+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)me.fromBufferAttribute(t,e),me.normalize(),t.setXYZ(e,me.x,me.y,me.z)}toNonIndexed(){function t(o,l){const d=o.array,u=o.itemSize,h=o.normalized,c=new d.constructor(l.length*u);let p=0,_=0;for(let g=0,f=l.length;g<f;g++){o.isInterleavedBufferAttribute?p=l[g]*o.data.stride+o.offset:p=l[g]*u;for(let m=0;m<u;m++)c[_++]=d[p++]}return new en(c,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Fn,n=this.index.array,s=this.attributes;for(const o in s){const l=s[o],d=t(l,n);e.setAttribute(o,d)}const r=this.morphAttributes;for(const o in r){const l=[],d=r[o];for(let u=0,h=d.length;u<h;u++){const c=d[u],p=t(c,n);l.push(p)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const d=a[o];e.addGroup(d.start,d.count,d.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const d in l)l[d]!==void 0&&(t[d]=l[d]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const d=n[l];t.data.attributes[l]=d.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const d=this.morphAttributes[l],u=[];for(let h=0,c=d.length;h<c;h++){const p=d[h];u.push(p.toJSON(t.data))}u.length>0&&(s[l]=u,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const s=t.attributes;for(const d in s){const u=s[d];this.setAttribute(d,u.clone(e))}const r=t.morphAttributes;for(const d in r){const u=[],h=r[d];for(let c=0,p=h.length;c<p;c++)u.push(h[c].clone(e));this.morphAttributes[d]=u}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let d=0,u=a.length;d<u;d++){const h=a[d];this.addGroup(h.start,h.count,h.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const no=new le,Hn=new ul,us=new va,io=new B,fs=new B,ps=new B,ms=new B,cr=new B,gs=new B,so=new B,_s=new B;class Le extends xe{constructor(t=new Fn,e=new ml){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const o=this.morphTargetInfluences;if(r&&o){gs.set(0,0,0);for(let l=0,d=r.length;l<d;l++){const u=o[l],h=r[l];u!==0&&(cr.fromBufferAttribute(h,t),a?gs.addScaledVector(cr,u):gs.addScaledVector(cr.sub(e),u))}e.add(gs)}return e}raycast(t,e){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),us.copy(n.boundingSphere),us.applyMatrix4(r),Hn.copy(t.ray).recast(t.near),!(us.containsPoint(Hn.origin)===!1&&(Hn.intersectSphere(us,io)===null||Hn.origin.distanceToSquared(io)>(t.far-t.near)**2))&&(no.copy(r).invert(),Hn.copy(t.ray).applyMatrix4(no),!(n.boundingBox!==null&&Hn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Hn)))}_computeIntersections(t,e,n){let s;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,d=r.attributes.uv,u=r.attributes.uv1,h=r.attributes.normal,c=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let _=0,g=c.length;_<g;_++){const f=c[_],m=a[f.materialIndex],v=Math.max(f.start,p.start),M=Math.min(o.count,Math.min(f.start+f.count,p.start+p.count));for(let x=v,y=M;x<y;x+=3){const S=o.getX(x),A=o.getX(x+1),C=o.getX(x+2);s=xs(this,m,t,n,d,u,h,S,A,C),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=f.materialIndex,e.push(s))}}else{const _=Math.max(0,p.start),g=Math.min(o.count,p.start+p.count);for(let f=_,m=g;f<m;f+=3){const v=o.getX(f),M=o.getX(f+1),x=o.getX(f+2);s=xs(this,a,t,n,d,u,h,v,M,x),s&&(s.faceIndex=Math.floor(f/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let _=0,g=c.length;_<g;_++){const f=c[_],m=a[f.materialIndex],v=Math.max(f.start,p.start),M=Math.min(l.count,Math.min(f.start+f.count,p.start+p.count));for(let x=v,y=M;x<y;x+=3){const S=x,A=x+1,C=x+2;s=xs(this,m,t,n,d,u,h,S,A,C),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=f.materialIndex,e.push(s))}}else{const _=Math.max(0,p.start),g=Math.min(l.count,p.start+p.count);for(let f=_,m=g;f<m;f+=3){const v=f,M=f+1,x=f+2;s=xs(this,a,t,n,d,u,h,v,M,x),s&&(s.faceIndex=Math.floor(f/3),e.push(s))}}}}function ad(i,t,e,n,s,r,a,o){let l;if(t.side===De?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===Un,o),l===null)return null;_s.copy(o),_s.applyMatrix4(i.matrixWorld);const d=e.ray.origin.distanceTo(_s);return d<e.near||d>e.far?null:{distance:d,point:_s.clone(),object:i}}function xs(i,t,e,n,s,r,a,o,l,d){i.getVertexPosition(o,fs),i.getVertexPosition(l,ps),i.getVertexPosition(d,ms);const u=ad(i,t,e,n,fs,ps,ms,so);if(u){const h=new B;je.getBarycoord(so,fs,ps,ms,h),s&&(u.uv=je.getInterpolatedAttribute(s,o,l,d,h,new Lt)),r&&(u.uv1=je.getInterpolatedAttribute(r,o,l,d,h,new Lt)),a&&(u.normal=je.getInterpolatedAttribute(a,o,l,d,h,new B),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const c={a:o,b:l,c:d,normal:new B,materialIndex:0};je.getNormal(fs,ps,ms,c.normal),u.face=c,u.barycoord=h}return u}class gn extends Fn{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};const o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);const l=[],d=[],u=[],h=[];let c=0,p=0;_("z","y","x",-1,-1,n,e,t,a,r,0),_("z","y","x",1,-1,n,e,-t,a,r,1),_("x","z","y",1,1,t,n,e,s,a,2),_("x","z","y",1,-1,t,n,-e,s,a,3),_("x","y","z",1,-1,t,e,n,s,r,4),_("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new nn(d,3)),this.setAttribute("normal",new nn(u,3)),this.setAttribute("uv",new nn(h,2));function _(g,f,m,v,M,x,y,S,A,C,b){const E=x/A,P=y/C,H=x/2,F=y/2,L=S/2,W=A+1,z=C+1;let q=0,O=0;const J=new B;for(let nt=0;nt<z;nt++){const Mt=nt*P-F;for(let At=0;At<W;At++){const Gt=At*E-H;J[g]=Gt*v,J[f]=Mt*M,J[m]=L,d.push(J.x,J.y,J.z),J[g]=0,J[f]=0,J[m]=S>0?1:-1,u.push(J.x,J.y,J.z),h.push(At/A),h.push(1-nt/C),q+=1}}for(let nt=0;nt<C;nt++)for(let Mt=0;Mt<A;Mt++){const At=c+Mt+W*nt,Gt=c+Mt+W*(nt+1),Y=c+(Mt+1)+W*(nt+1),Q=c+(Mt+1)+W*nt;l.push(At,Gt,Q),l.push(Gt,Y,Q),O+=6}o.addGroup(p,O,b),p+=O,c+=q}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new gn(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Li(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone():Array.isArray(s)?t[e][n]=s.slice():t[e][n]=s}}return t}function ye(i){const t={};for(let e=0;e<i.length;e++){const n=Li(i[e]);for(const s in n)t[s]=n[s]}return t}function od(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function xl(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Vt.workingColorSpace}const ld={clone:Li,merge:ye};var cd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,dd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Nn extends Ki{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=cd,this.fragmentShader=dd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Li(t.uniforms),this.uniformsGroups=od(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class vl extends xe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new le,this.projectionMatrix=new le,this.projectionMatrixInverse=new le,this.coordinateSystem=mn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const An=new B,ro=new Lt,ao=new Lt;class Ve extends vl{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=aa*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Ls*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return aa*2*Math.atan(Math.tan(Ls*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){An.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(An.x,An.y).multiplyScalar(-t/An.z),An.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(An.x,An.y).multiplyScalar(-t/An.z)}getViewSize(t,e){return this.getViewBounds(t,ro,ao),e.subVectors(ao,ro)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Ls*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,d=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/d,s*=a.width/l,n*=a.height/d}const o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const gi=-90,_i=1;class hd extends xe{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Ve(gi,_i,t,e);s.layers=this.layers,this.add(s);const r=new Ve(gi,_i,t,e);r.layers=this.layers,this.add(r);const a=new Ve(gi,_i,t,e);a.layers=this.layers,this.add(a);const o=new Ve(gi,_i,t,e);o.layers=this.layers,this.add(o);const l=new Ve(gi,_i,t,e);l.layers=this.layers,this.add(l);const d=new Ve(gi,_i,t,e);d.layers=this.layers,this.add(d)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(const d of e)this.remove(d);if(t===mn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Us)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const d of e)this.add(d),d.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,d,u]=this.children,h=t.getRenderTarget(),c=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),_=t.xr.enabled;t.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,s),t.render(e,r),t.setRenderTarget(n,1,s),t.render(e,a),t.setRenderTarget(n,2,s),t.render(e,o),t.setRenderTarget(n,3,s),t.render(e,l),t.setRenderTarget(n,4,s),t.render(e,d),n.texture.generateMipmaps=g,t.setRenderTarget(n,5,s),t.render(e,u),t.setRenderTarget(h,c,p),t.xr.enabled=_,n.texture.needsPMREMUpdate=!0}}class Ml extends Ie{constructor(t,e,n,s,r,a,o,l,d,u){t=t!==void 0?t:[],e=e!==void 0?e:Ai,super(t,e,n,s,r,a,o,l,d,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class ud extends ti{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Ml(s,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:tn}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new gn(5,5,5),r=new Nn({name:"CubemapFromEquirect",uniforms:Li(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:De,blending:Ln});r.uniforms.tEquirect.value=e;const a=new Le(s,r),o=e.minFilter;return e.minFilter===Kn&&(e.minFilter=tn),new hd(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e,n,s){const r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}}const dr=new B,fd=new B,pd=new Pt;class Rn{constructor(t=new B(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=dr.subVectors(n,e).cross(fd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(dr),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||pd.getNormalMatrix(t),s=this.coplanarPoint(dr).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Vn=new va,vs=new B;class Ma{constructor(t=new Rn,e=new Rn,n=new Rn,s=new Rn,r=new Rn,a=new Rn){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=mn){const n=this.planes,s=t.elements,r=s[0],a=s[1],o=s[2],l=s[3],d=s[4],u=s[5],h=s[6],c=s[7],p=s[8],_=s[9],g=s[10],f=s[11],m=s[12],v=s[13],M=s[14],x=s[15];if(n[0].setComponents(l-r,c-d,f-p,x-m).normalize(),n[1].setComponents(l+r,c+d,f+p,x+m).normalize(),n[2].setComponents(l+a,c+u,f+_,x+v).normalize(),n[3].setComponents(l-a,c-u,f-_,x-v).normalize(),n[4].setComponents(l-o,c-h,f-g,x-M).normalize(),e===mn)n[5].setComponents(l+o,c+h,f+g,x+M).normalize();else if(e===Us)n[5].setComponents(o,h,g,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Vn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Vn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Vn)}intersectsSprite(t){return Vn.center.set(0,0,0),Vn.radius=.7071067811865476,Vn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Vn)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(vs.x=s.normal.x>0?t.max.x:t.min.x,vs.y=s.normal.y>0?t.max.y:t.min.y,vs.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(vs)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Sl(){let i=null,t=!1,e=null,n=null;function s(r,a){e(r,a),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function md(i){const t=new WeakMap;function e(o,l){const d=o.array,u=o.usage,h=d.byteLength,c=i.createBuffer();i.bindBuffer(l,c),i.bufferData(l,d,u),o.onUploadCallback();let p;if(d instanceof Float32Array)p=i.FLOAT;else if(d instanceof Uint16Array)o.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(d instanceof Int16Array)p=i.SHORT;else if(d instanceof Uint32Array)p=i.UNSIGNED_INT;else if(d instanceof Int32Array)p=i.INT;else if(d instanceof Int8Array)p=i.BYTE;else if(d instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:c,type:p,bytesPerElement:d.BYTES_PER_ELEMENT,version:o.version,size:h}}function n(o,l,d){const u=l.array,h=l.updateRanges;if(i.bindBuffer(d,o),h.length===0)i.bufferSubData(d,0,u);else{h.sort((p,_)=>p.start-_.start);let c=0;for(let p=1;p<h.length;p++){const _=h[c],g=h[p];g.start<=_.start+_.count+1?_.count=Math.max(_.count,g.start+g.count-_.start):(++c,h[c]=g)}h.length=c+1;for(let p=0,_=h.length;p<_;p++){const g=h[p];i.bufferSubData(d,g.start*u.BYTES_PER_ELEMENT,u,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=t.get(o);(!u||u.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const d=t.get(o);if(d===void 0)t.set(o,e(o,l));else if(d.version<o.version){if(d.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(d.buffer,o,l),d.version=o.version}}return{get:s,remove:r,update:a}}class Os extends Fn{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),d=o+1,u=l+1,h=t/o,c=e/l,p=[],_=[],g=[],f=[];for(let m=0;m<u;m++){const v=m*c-a;for(let M=0;M<d;M++){const x=M*h-r;_.push(x,-v,0),g.push(0,0,1),f.push(M/o),f.push(1-m/l)}}for(let m=0;m<l;m++)for(let v=0;v<o;v++){const M=v+d*m,x=v+d*(m+1),y=v+1+d*(m+1),S=v+1+d*m;p.push(M,x,S),p.push(x,y,S)}this.setIndex(p),this.setAttribute("position",new nn(_,3)),this.setAttribute("normal",new nn(g,3)),this.setAttribute("uv",new nn(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Os(t.width,t.height,t.widthSegments,t.heightSegments)}}var gd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,_d=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,xd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,vd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Md=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Sd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,yd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,bd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Ed=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Td=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,wd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ad=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Rd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Cd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Pd=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ld=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Dd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Id=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ud=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Nd=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Fd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,zd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Od=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,kd=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Bd=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Hd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Vd=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Gd=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Wd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Xd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,qd="gl_FragColor = linearToOutputTexel( gl_FragColor );",Yd=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,$d=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,jd=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Zd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Kd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Jd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Qd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,th=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,eh=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,nh=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ih=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,sh=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,rh=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,ah=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,oh=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,lh=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,ch=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,dh=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,hh=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,uh=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,fh=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ph=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,mh=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,gh=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,_h=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,xh=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,vh=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Mh=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Sh=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,yh=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,bh=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Eh=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Th=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,wh=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Ah=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Rh=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ch=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ph=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Lh=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Dh=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ih=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Uh=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Nh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Fh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,zh=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Oh=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,kh=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Bh=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Hh=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Vh=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Gh=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Wh=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Xh=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,qh=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Yh=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,$h=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,jh=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Zh=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Kh=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Jh=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Qh=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,tu=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,eu=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,nu=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,iu=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,su=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ru=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,au=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,ou=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,lu=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,cu=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,du=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,hu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,fu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,pu=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const mu=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,gu=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_u=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,xu=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,vu=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Mu=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Su=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,yu=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,bu=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Eu=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Tu=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,wu=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Au=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ru=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Cu=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Pu=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lu=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Du=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Iu=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Uu=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Nu=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Fu=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,zu=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ou=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ku=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Bu=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Hu=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vu=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gu=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Wu=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Xu=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,qu=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Yu=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,$u=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,It={alphahash_fragment:gd,alphahash_pars_fragment:_d,alphamap_fragment:xd,alphamap_pars_fragment:vd,alphatest_fragment:Md,alphatest_pars_fragment:Sd,aomap_fragment:yd,aomap_pars_fragment:bd,batching_pars_vertex:Ed,batching_vertex:Td,begin_vertex:wd,beginnormal_vertex:Ad,bsdfs:Rd,iridescence_fragment:Cd,bumpmap_pars_fragment:Pd,clipping_planes_fragment:Ld,clipping_planes_pars_fragment:Dd,clipping_planes_pars_vertex:Id,clipping_planes_vertex:Ud,color_fragment:Nd,color_pars_fragment:Fd,color_pars_vertex:zd,color_vertex:Od,common:kd,cube_uv_reflection_fragment:Bd,defaultnormal_vertex:Hd,displacementmap_pars_vertex:Vd,displacementmap_vertex:Gd,emissivemap_fragment:Wd,emissivemap_pars_fragment:Xd,colorspace_fragment:qd,colorspace_pars_fragment:Yd,envmap_fragment:$d,envmap_common_pars_fragment:jd,envmap_pars_fragment:Zd,envmap_pars_vertex:Kd,envmap_physical_pars_fragment:lh,envmap_vertex:Jd,fog_vertex:Qd,fog_pars_vertex:th,fog_fragment:eh,fog_pars_fragment:nh,gradientmap_pars_fragment:ih,lightmap_pars_fragment:sh,lights_lambert_fragment:rh,lights_lambert_pars_fragment:ah,lights_pars_begin:oh,lights_toon_fragment:ch,lights_toon_pars_fragment:dh,lights_phong_fragment:hh,lights_phong_pars_fragment:uh,lights_physical_fragment:fh,lights_physical_pars_fragment:ph,lights_fragment_begin:mh,lights_fragment_maps:gh,lights_fragment_end:_h,logdepthbuf_fragment:xh,logdepthbuf_pars_fragment:vh,logdepthbuf_pars_vertex:Mh,logdepthbuf_vertex:Sh,map_fragment:yh,map_pars_fragment:bh,map_particle_fragment:Eh,map_particle_pars_fragment:Th,metalnessmap_fragment:wh,metalnessmap_pars_fragment:Ah,morphinstance_vertex:Rh,morphcolor_vertex:Ch,morphnormal_vertex:Ph,morphtarget_pars_vertex:Lh,morphtarget_vertex:Dh,normal_fragment_begin:Ih,normal_fragment_maps:Uh,normal_pars_fragment:Nh,normal_pars_vertex:Fh,normal_vertex:zh,normalmap_pars_fragment:Oh,clearcoat_normal_fragment_begin:kh,clearcoat_normal_fragment_maps:Bh,clearcoat_pars_fragment:Hh,iridescence_pars_fragment:Vh,opaque_fragment:Gh,packing:Wh,premultiplied_alpha_fragment:Xh,project_vertex:qh,dithering_fragment:Yh,dithering_pars_fragment:$h,roughnessmap_fragment:jh,roughnessmap_pars_fragment:Zh,shadowmap_pars_fragment:Kh,shadowmap_pars_vertex:Jh,shadowmap_vertex:Qh,shadowmask_pars_fragment:tu,skinbase_vertex:eu,skinning_pars_vertex:nu,skinning_vertex:iu,skinnormal_vertex:su,specularmap_fragment:ru,specularmap_pars_fragment:au,tonemapping_fragment:ou,tonemapping_pars_fragment:lu,transmission_fragment:cu,transmission_pars_fragment:du,uv_pars_fragment:hu,uv_pars_vertex:uu,uv_vertex:fu,worldpos_vertex:pu,background_vert:mu,background_frag:gu,backgroundCube_vert:_u,backgroundCube_frag:xu,cube_vert:vu,cube_frag:Mu,depth_vert:Su,depth_frag:yu,distanceRGBA_vert:bu,distanceRGBA_frag:Eu,equirect_vert:Tu,equirect_frag:wu,linedashed_vert:Au,linedashed_frag:Ru,meshbasic_vert:Cu,meshbasic_frag:Pu,meshlambert_vert:Lu,meshlambert_frag:Du,meshmatcap_vert:Iu,meshmatcap_frag:Uu,meshnormal_vert:Nu,meshnormal_frag:Fu,meshphong_vert:zu,meshphong_frag:Ou,meshphysical_vert:ku,meshphysical_frag:Bu,meshtoon_vert:Hu,meshtoon_frag:Vu,points_vert:Gu,points_frag:Wu,shadow_vert:Xu,shadow_frag:qu,sprite_vert:Yu,sprite_frag:$u},it={common:{diffuse:{value:new Bt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Pt},alphaMap:{value:null},alphaMapTransform:{value:new Pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Pt}},envmap:{envMap:{value:null},envMapRotation:{value:new Pt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Pt},normalScale:{value:new Lt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Bt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Bt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Pt},alphaTest:{value:0},uvTransform:{value:new Pt}},sprite:{diffuse:{value:new Bt(16777215)},opacity:{value:1},center:{value:new Lt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Pt},alphaMap:{value:null},alphaMapTransform:{value:new Pt},alphaTest:{value:0}}},Qe={basic:{uniforms:ye([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.fog]),vertexShader:It.meshbasic_vert,fragmentShader:It.meshbasic_frag},lambert:{uniforms:ye([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.fog,it.lights,{emissive:{value:new Bt(0)}}]),vertexShader:It.meshlambert_vert,fragmentShader:It.meshlambert_frag},phong:{uniforms:ye([it.common,it.specularmap,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.fog,it.lights,{emissive:{value:new Bt(0)},specular:{value:new Bt(1118481)},shininess:{value:30}}]),vertexShader:It.meshphong_vert,fragmentShader:It.meshphong_frag},standard:{uniforms:ye([it.common,it.envmap,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.roughnessmap,it.metalnessmap,it.fog,it.lights,{emissive:{value:new Bt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:It.meshphysical_vert,fragmentShader:It.meshphysical_frag},toon:{uniforms:ye([it.common,it.aomap,it.lightmap,it.emissivemap,it.bumpmap,it.normalmap,it.displacementmap,it.gradientmap,it.fog,it.lights,{emissive:{value:new Bt(0)}}]),vertexShader:It.meshtoon_vert,fragmentShader:It.meshtoon_frag},matcap:{uniforms:ye([it.common,it.bumpmap,it.normalmap,it.displacementmap,it.fog,{matcap:{value:null}}]),vertexShader:It.meshmatcap_vert,fragmentShader:It.meshmatcap_frag},points:{uniforms:ye([it.points,it.fog]),vertexShader:It.points_vert,fragmentShader:It.points_frag},dashed:{uniforms:ye([it.common,it.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:It.linedashed_vert,fragmentShader:It.linedashed_frag},depth:{uniforms:ye([it.common,it.displacementmap]),vertexShader:It.depth_vert,fragmentShader:It.depth_frag},normal:{uniforms:ye([it.common,it.bumpmap,it.normalmap,it.displacementmap,{opacity:{value:1}}]),vertexShader:It.meshnormal_vert,fragmentShader:It.meshnormal_frag},sprite:{uniforms:ye([it.sprite,it.fog]),vertexShader:It.sprite_vert,fragmentShader:It.sprite_frag},background:{uniforms:{uvTransform:{value:new Pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:It.background_vert,fragmentShader:It.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Pt}},vertexShader:It.backgroundCube_vert,fragmentShader:It.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:It.cube_vert,fragmentShader:It.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:It.equirect_vert,fragmentShader:It.equirect_frag},distanceRGBA:{uniforms:ye([it.common,it.displacementmap,{referencePosition:{value:new B},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:It.distanceRGBA_vert,fragmentShader:It.distanceRGBA_frag},shadow:{uniforms:ye([it.lights,it.fog,{color:{value:new Bt(0)},opacity:{value:1}}]),vertexShader:It.shadow_vert,fragmentShader:It.shadow_frag}};Qe.physical={uniforms:ye([Qe.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Pt},clearcoatNormalScale:{value:new Lt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Pt},sheen:{value:0},sheenColor:{value:new Bt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Pt},transmissionSamplerSize:{value:new Lt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Pt},attenuationDistance:{value:0},attenuationColor:{value:new Bt(0)},specularColor:{value:new Bt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Pt},anisotropyVector:{value:new Lt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Pt}}]),vertexShader:It.meshphysical_vert,fragmentShader:It.meshphysical_frag};const Ms={r:0,b:0,g:0},Gn=new sn,ju=new le;function Zu(i,t,e,n,s,r,a){const o=new Bt(0);let l=r===!0?0:1,d,u,h=null,c=0,p=null;function _(v){let M=v.isScene===!0?v.background:null;return M&&M.isTexture&&(M=(v.backgroundBlurriness>0?e:t).get(M)),M}function g(v){let M=!1;const x=_(v);x===null?m(o,l):x&&x.isColor&&(m(x,1),M=!0);const y=i.xr.getEnvironmentBlendMode();y==="additive"?n.buffers.color.setClear(0,0,0,1,a):y==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||M)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function f(v,M){const x=_(M);x&&(x.isCubeTexture||x.mapping===Fs)?(u===void 0&&(u=new Le(new gn(1,1,1),new Nn({name:"BackgroundCubeMaterial",uniforms:Li(Qe.backgroundCube.uniforms),vertexShader:Qe.backgroundCube.vertexShader,fragmentShader:Qe.backgroundCube.fragmentShader,side:De,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(y,S,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(u)),Gn.copy(M.backgroundRotation),Gn.x*=-1,Gn.y*=-1,Gn.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Gn.y*=-1,Gn.z*=-1),u.material.uniforms.envMap.value=x,u.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(ju.makeRotationFromEuler(Gn)),u.material.toneMapped=Vt.getTransfer(x.colorSpace)!==$t,(h!==x||c!==x.version||p!==i.toneMapping)&&(u.material.needsUpdate=!0,h=x,c=x.version,p=i.toneMapping),u.layers.enableAll(),v.unshift(u,u.geometry,u.material,0,0,null)):x&&x.isTexture&&(d===void 0&&(d=new Le(new Os(2,2),new Nn({name:"BackgroundMaterial",uniforms:Li(Qe.background.uniforms),vertexShader:Qe.background.vertexShader,fragmentShader:Qe.background.fragmentShader,side:Un,depthTest:!1,depthWrite:!1,fog:!1})),d.geometry.deleteAttribute("normal"),Object.defineProperty(d.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(d)),d.material.uniforms.t2D.value=x,d.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,d.material.toneMapped=Vt.getTransfer(x.colorSpace)!==$t,x.matrixAutoUpdate===!0&&x.updateMatrix(),d.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||c!==x.version||p!==i.toneMapping)&&(d.material.needsUpdate=!0,h=x,c=x.version,p=i.toneMapping),d.layers.enableAll(),v.unshift(d,d.geometry,d.material,0,0,null))}function m(v,M){v.getRGB(Ms,xl(i)),n.buffers.color.setClear(Ms.r,Ms.g,Ms.b,M,a)}return{getClearColor:function(){return o},setClearColor:function(v,M=1){o.set(v),l=M,m(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(v){l=v,m(o,l)},render:g,addToRenderList:f}}function Ku(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=c(null);let r=s,a=!1;function o(E,P,H,F,L){let W=!1;const z=h(F,H,P);r!==z&&(r=z,d(r.object)),W=p(E,F,H,L),W&&_(E,F,H,L),L!==null&&t.update(L,i.ELEMENT_ARRAY_BUFFER),(W||a)&&(a=!1,x(E,P,H,F),L!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(L).buffer))}function l(){return i.createVertexArray()}function d(E){return i.bindVertexArray(E)}function u(E){return i.deleteVertexArray(E)}function h(E,P,H){const F=H.wireframe===!0;let L=n[E.id];L===void 0&&(L={},n[E.id]=L);let W=L[P.id];W===void 0&&(W={},L[P.id]=W);let z=W[F];return z===void 0&&(z=c(l()),W[F]=z),z}function c(E){const P=[],H=[],F=[];for(let L=0;L<e;L++)P[L]=0,H[L]=0,F[L]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:H,attributeDivisors:F,object:E,attributes:{},index:null}}function p(E,P,H,F){const L=r.attributes,W=P.attributes;let z=0;const q=H.getAttributes();for(const O in q)if(q[O].location>=0){const nt=L[O];let Mt=W[O];if(Mt===void 0&&(O==="instanceMatrix"&&E.instanceMatrix&&(Mt=E.instanceMatrix),O==="instanceColor"&&E.instanceColor&&(Mt=E.instanceColor)),nt===void 0||nt.attribute!==Mt||Mt&&nt.data!==Mt.data)return!0;z++}return r.attributesNum!==z||r.index!==F}function _(E,P,H,F){const L={},W=P.attributes;let z=0;const q=H.getAttributes();for(const O in q)if(q[O].location>=0){let nt=W[O];nt===void 0&&(O==="instanceMatrix"&&E.instanceMatrix&&(nt=E.instanceMatrix),O==="instanceColor"&&E.instanceColor&&(nt=E.instanceColor));const Mt={};Mt.attribute=nt,nt&&nt.data&&(Mt.data=nt.data),L[O]=Mt,z++}r.attributes=L,r.attributesNum=z,r.index=F}function g(){const E=r.newAttributes;for(let P=0,H=E.length;P<H;P++)E[P]=0}function f(E){m(E,0)}function m(E,P){const H=r.newAttributes,F=r.enabledAttributes,L=r.attributeDivisors;H[E]=1,F[E]===0&&(i.enableVertexAttribArray(E),F[E]=1),L[E]!==P&&(i.vertexAttribDivisor(E,P),L[E]=P)}function v(){const E=r.newAttributes,P=r.enabledAttributes;for(let H=0,F=P.length;H<F;H++)P[H]!==E[H]&&(i.disableVertexAttribArray(H),P[H]=0)}function M(E,P,H,F,L,W,z){z===!0?i.vertexAttribIPointer(E,P,H,L,W):i.vertexAttribPointer(E,P,H,F,L,W)}function x(E,P,H,F){g();const L=F.attributes,W=H.getAttributes(),z=P.defaultAttributeValues;for(const q in W){const O=W[q];if(O.location>=0){let J=L[q];if(J===void 0&&(q==="instanceMatrix"&&E.instanceMatrix&&(J=E.instanceMatrix),q==="instanceColor"&&E.instanceColor&&(J=E.instanceColor)),J!==void 0){const nt=J.normalized,Mt=J.itemSize,At=t.get(J);if(At===void 0)continue;const Gt=At.buffer,Y=At.type,Q=At.bytesPerElement,ft=Y===i.INT||Y===i.UNSIGNED_INT||J.gpuType===fa;if(J.isInterleavedBufferAttribute){const st=J.data,_t=st.stride,Tt=J.offset;if(st.isInstancedInterleavedBuffer){for(let Ut=0;Ut<O.locationSize;Ut++)m(O.location+Ut,st.meshPerAttribute);E.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=st.meshPerAttribute*st.count)}else for(let Ut=0;Ut<O.locationSize;Ut++)f(O.location+Ut);i.bindBuffer(i.ARRAY_BUFFER,Gt);for(let Ut=0;Ut<O.locationSize;Ut++)M(O.location+Ut,Mt/O.locationSize,Y,nt,_t*Q,(Tt+Mt/O.locationSize*Ut)*Q,ft)}else{if(J.isInstancedBufferAttribute){for(let st=0;st<O.locationSize;st++)m(O.location+st,J.meshPerAttribute);E.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let st=0;st<O.locationSize;st++)f(O.location+st);i.bindBuffer(i.ARRAY_BUFFER,Gt);for(let st=0;st<O.locationSize;st++)M(O.location+st,Mt/O.locationSize,Y,nt,Mt*Q,Mt/O.locationSize*st*Q,ft)}}else if(z!==void 0){const nt=z[q];if(nt!==void 0)switch(nt.length){case 2:i.vertexAttrib2fv(O.location,nt);break;case 3:i.vertexAttrib3fv(O.location,nt);break;case 4:i.vertexAttrib4fv(O.location,nt);break;default:i.vertexAttrib1fv(O.location,nt)}}}}v()}function y(){C();for(const E in n){const P=n[E];for(const H in P){const F=P[H];for(const L in F)u(F[L].object),delete F[L];delete P[H]}delete n[E]}}function S(E){if(n[E.id]===void 0)return;const P=n[E.id];for(const H in P){const F=P[H];for(const L in F)u(F[L].object),delete F[L];delete P[H]}delete n[E.id]}function A(E){for(const P in n){const H=n[P];if(H[E.id]===void 0)continue;const F=H[E.id];for(const L in F)u(F[L].object),delete F[L];delete H[E.id]}}function C(){b(),a=!0,r!==s&&(r=s,d(r.object))}function b(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:C,resetDefaultState:b,dispose:y,releaseStatesOfGeometry:S,releaseStatesOfProgram:A,initAttributes:g,enableAttribute:f,disableUnusedAttributes:v}}function Ju(i,t,e){let n;function s(d){n=d}function r(d,u){i.drawArrays(n,d,u),e.update(u,n,1)}function a(d,u,h){h!==0&&(i.drawArraysInstanced(n,d,u,h),e.update(u,n,h))}function o(d,u,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,d,0,u,0,h);let p=0;for(let _=0;_<h;_++)p+=u[_];e.update(p,n,1)}function l(d,u,h,c){if(h===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let _=0;_<d.length;_++)a(d[_],u[_],c[_]);else{p.multiDrawArraysInstancedWEBGL(n,d,0,u,0,c,0,h);let _=0;for(let g=0;g<h;g++)_+=u[g]*c[g];e.update(_,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function Qu(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const A=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(A){return!(A!==Ze&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){const C=A===$i&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(A!==vn&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==pn&&!C)}function l(A){if(A==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let d=e.precision!==void 0?e.precision:"highp";const u=l(d);u!==d&&(console.warn("THREE.WebGLRenderer:",d,"not supported, using",u,"instead."),d=u);const h=e.logarithmicDepthBuffer===!0,c=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_TEXTURE_SIZE),f=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),v=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),M=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),y=_>0,S=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:d,logarithmicDepthBuffer:h,reverseDepthBuffer:c,maxTextures:p,maxVertexTextures:_,maxTextureSize:g,maxCubemapSize:f,maxAttributes:m,maxVertexUniforms:v,maxVaryings:M,maxFragmentUniforms:x,vertexTextures:y,maxSamples:S}}function tf(i){const t=this;let e=null,n=0,s=!1,r=!1;const a=new Rn,o=new Pt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,c){const p=h.length!==0||c||n!==0||s;return s=c,n=h.length,p},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(h,c){e=u(h,c,0)},this.setState=function(h,c,p){const _=h.clippingPlanes,g=h.clipIntersection,f=h.clipShadows,m=i.get(h);if(!s||_===null||_.length===0||r&&!f)r?u(null):d();else{const v=r?0:n,M=v*4;let x=m.clippingState||null;l.value=x,x=u(_,c,M,p);for(let y=0;y!==M;++y)x[y]=e[y];m.clippingState=x,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=v}};function d(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function u(h,c,p,_){const g=h!==null?h.length:0;let f=null;if(g!==0){if(f=l.value,_!==!0||f===null){const m=p+g*4,v=c.matrixWorldInverse;o.getNormalMatrix(v),(f===null||f.length<m)&&(f=new Float32Array(m));for(let M=0,x=p;M!==g;++M,x+=4)a.copy(h[M]).applyMatrix4(v,o),a.normal.toArray(f,x),f[x+3]=a.constant}l.value=f,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,f}}function ef(i){let t=new WeakMap;function e(a,o){return o===Pr?a.mapping=Ai:o===Lr&&(a.mapping=Ri),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===Pr||o===Lr)if(t.has(a)){const l=t.get(a).texture;return e(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const d=new ud(l.height);return d.fromEquirectangularTexture(i,a),t.set(a,d),a.addEventListener("dispose",s),e(d.texture,a.mapping)}else return null}}return a}function s(a){const o=a.target;o.removeEventListener("dispose",s);const l=t.get(o);l!==void 0&&(t.delete(o),l.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}class yl extends vl{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const d=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=d*this.view.offsetX,a=r+d*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const Si=4,oo=[.125,.215,.35,.446,.526,.582],$n=20,hr=new yl,lo=new Bt;let ur=null,fr=0,pr=0,mr=!1;const Xn=(1+Math.sqrt(5))/2,xi=1/Xn,co=[new B(-Xn,xi,0),new B(Xn,xi,0),new B(-xi,0,Xn),new B(xi,0,Xn),new B(0,Xn,-xi),new B(0,Xn,xi),new B(-1,1,-1),new B(1,1,-1),new B(-1,1,1),new B(1,1,1)];class ho{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,s=100){ur=this._renderer.getRenderTarget(),fr=this._renderer.getActiveCubeFace(),pr=this._renderer.getActiveMipmapLevel(),mr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,n,s,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=po(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=fo(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(ur,fr,pr),this._renderer.xr.enabled=mr,t.scissorTest=!1,Ss(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Ai||t.mapping===Ri?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),ur=this._renderer.getRenderTarget(),fr=this._renderer.getActiveCubeFace(),pr=this._renderer.getActiveMipmapLevel(),mr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:tn,minFilter:tn,generateMipmaps:!1,type:$i,format:Ze,colorSpace:Di,depthBuffer:!1},s=uo(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=uo(t,e,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=nf(r)),this._blurMaterial=sf(r,t,e)}return s}_compileMaterial(t){const e=new Le(this._lodPlanes[0],t);this._renderer.compile(e,hr)}_sceneToCubeUV(t,e,n,s){const o=new Ve(90,1,e,n),l=[1,-1,1,1,1,1],d=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,c=u.toneMapping;u.getClearColor(lo),u.toneMapping=Dn,u.autoClear=!1;const p=new ml({name:"PMREM.Background",side:De,depthWrite:!1,depthTest:!1}),_=new Le(new gn,p);let g=!1;const f=t.background;f?f.isColor&&(p.color.copy(f),t.background=null,g=!0):(p.color.copy(lo),g=!0);for(let m=0;m<6;m++){const v=m%3;v===0?(o.up.set(0,l[m],0),o.lookAt(d[m],0,0)):v===1?(o.up.set(0,0,l[m]),o.lookAt(0,d[m],0)):(o.up.set(0,l[m],0),o.lookAt(0,0,d[m]));const M=this._cubeSize;Ss(s,v*M,m>2?M:0,M,M),u.setRenderTarget(s),g&&u.render(_,o),u.render(t,o)}_.geometry.dispose(),_.material.dispose(),u.toneMapping=c,u.autoClear=h,t.background=f}_textureToCubeUV(t,e){const n=this._renderer,s=t.mapping===Ai||t.mapping===Ri;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=po()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=fo());const r=s?this._cubemapMaterial:this._equirectMaterial,a=new Le(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=t;const l=this._cubeSize;Ss(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,hr)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=co[(s-r-1)%co.length];this._blur(t,r-1,r,a,o)}e.autoClear=n}_blur(t,e,n,s,r){const a=this._pingPongRenderTarget;this._halfBlur(t,a,e,n,s,"latitudinal",r),this._halfBlur(a,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,a,o){const l=this._renderer,d=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new Le(this._lodPlanes[s],d),c=d.uniforms,p=this._sizeLods[n]-1,_=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*$n-1),g=r/_,f=isFinite(r)?1+Math.floor(u*g):$n;f>$n&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${f} samples when the maximum is set to ${$n}`);const m=[];let v=0;for(let A=0;A<$n;++A){const C=A/g,b=Math.exp(-C*C/2);m.push(b),A===0?v+=b:A<f&&(v+=2*b)}for(let A=0;A<m.length;A++)m[A]=m[A]/v;c.envMap.value=t.texture,c.samples.value=f,c.weights.value=m,c.latitudinal.value=a==="latitudinal",o&&(c.poleAxis.value=o);const{_lodMax:M}=this;c.dTheta.value=_,c.mipInt.value=M-n;const x=this._sizeLods[s],y=3*x*(s>M-Si?s-M+Si:0),S=4*(this._cubeSize-x);Ss(e,y,S,3*x,2*x),l.setRenderTarget(e),l.render(h,hr)}}function nf(i){const t=[],e=[],n=[];let s=i;const r=i-Si+1+oo.length;for(let a=0;a<r;a++){const o=Math.pow(2,s);e.push(o);let l=1/o;a>i-Si?l=oo[a-i+Si-1]:a===0&&(l=0),n.push(l);const d=1/(o-2),u=-d,h=1+d,c=[u,u,h,u,h,h,u,u,h,h,u,h],p=6,_=6,g=3,f=2,m=1,v=new Float32Array(g*_*p),M=new Float32Array(f*_*p),x=new Float32Array(m*_*p);for(let S=0;S<p;S++){const A=S%3*2/3-1,C=S>2?0:-1,b=[A,C,0,A+2/3,C,0,A+2/3,C+1,0,A,C,0,A+2/3,C+1,0,A,C+1,0];v.set(b,g*_*S),M.set(c,f*_*S);const E=[S,S,S,S,S,S];x.set(E,m*_*S)}const y=new Fn;y.setAttribute("position",new en(v,g)),y.setAttribute("uv",new en(M,f)),y.setAttribute("faceIndex",new en(x,m)),t.push(y),s>Si&&s--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function uo(i,t,e){const n=new ti(i,t,e);return n.texture.mapping=Fs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ss(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function sf(i,t,e){const n=new Float32Array($n),s=new B(0,1,0);return new Nn({name:"SphericalGaussianBlur",defines:{n:$n,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Sa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Ln,depthTest:!1,depthWrite:!1})}function fo(){return new Nn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Sa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Ln,depthTest:!1,depthWrite:!1})}function po(){return new Nn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Sa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ln,depthTest:!1,depthWrite:!1})}function Sa(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function rf(i){let t=new WeakMap,e=null;function n(o){if(o&&o.isTexture){const l=o.mapping,d=l===Pr||l===Lr,u=l===Ai||l===Ri;if(d||u){let h=t.get(o);const c=h!==void 0?h.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==c)return e===null&&(e=new ho(i)),h=d?e.fromEquirectangular(o,h):e.fromCubemap(o,h),h.texture.pmremVersion=o.pmremVersion,t.set(o,h),h.texture;if(h!==void 0)return h.texture;{const p=o.image;return d&&p&&p.height>0||u&&p&&s(p)?(e===null&&(e=new ho(i)),h=d?e.fromEquirectangular(o):e.fromCubemap(o),h.texture.pmremVersion=o.pmremVersion,t.set(o,h),o.addEventListener("dispose",r),h.texture):null}}}return o}function s(o){let l=0;const d=6;for(let u=0;u<d;u++)o[u]!==void 0&&l++;return l===d}function r(o){const l=o.target;l.removeEventListener("dispose",r);const d=t.get(l);d!==void 0&&(t.delete(l),d.dispose())}function a(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:a}}function af(i){const t={};function e(n){if(t[n]!==void 0)return t[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&Gi("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function of(i,t,e,n){const s={},r=new WeakMap;function a(h){const c=h.target;c.index!==null&&t.remove(c.index);for(const _ in c.attributes)t.remove(c.attributes[_]);for(const _ in c.morphAttributes){const g=c.morphAttributes[_];for(let f=0,m=g.length;f<m;f++)t.remove(g[f])}c.removeEventListener("dispose",a),delete s[c.id];const p=r.get(c);p&&(t.remove(p),r.delete(c)),n.releaseStatesOfGeometry(c),c.isInstancedBufferGeometry===!0&&delete c._maxInstanceCount,e.memory.geometries--}function o(h,c){return s[c.id]===!0||(c.addEventListener("dispose",a),s[c.id]=!0,e.memory.geometries++),c}function l(h){const c=h.attributes;for(const _ in c)t.update(c[_],i.ARRAY_BUFFER);const p=h.morphAttributes;for(const _ in p){const g=p[_];for(let f=0,m=g.length;f<m;f++)t.update(g[f],i.ARRAY_BUFFER)}}function d(h){const c=[],p=h.index,_=h.attributes.position;let g=0;if(p!==null){const v=p.array;g=p.version;for(let M=0,x=v.length;M<x;M+=3){const y=v[M+0],S=v[M+1],A=v[M+2];c.push(y,S,S,A,A,y)}}else if(_!==void 0){const v=_.array;g=_.version;for(let M=0,x=v.length/3-1;M<x;M+=3){const y=M+0,S=M+1,A=M+2;c.push(y,S,S,A,A,y)}}else return;const f=new(cl(c)?_l:gl)(c,1);f.version=g;const m=r.get(h);m&&t.remove(m),r.set(h,f)}function u(h){const c=r.get(h);if(c){const p=h.index;p!==null&&c.version<p.version&&d(h)}else d(h);return r.get(h)}return{get:o,update:l,getWireframeAttribute:u}}function lf(i,t,e){let n;function s(c){n=c}let r,a;function o(c){r=c.type,a=c.bytesPerElement}function l(c,p){i.drawElements(n,p,r,c*a),e.update(p,n,1)}function d(c,p,_){_!==0&&(i.drawElementsInstanced(n,p,r,c*a,_),e.update(p,n,_))}function u(c,p,_){if(_===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,r,c,0,_);let f=0;for(let m=0;m<_;m++)f+=p[m];e.update(f,n,1)}function h(c,p,_,g){if(_===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let m=0;m<c.length;m++)d(c[m]/a,p[m],g[m]);else{f.multiDrawElementsInstancedWEBGL(n,p,0,r,c,0,g,0,_);let m=0;for(let v=0;v<_;v++)m+=p[v]*g[v];e.update(m,n,1)}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=d,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function cf(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function df(i,t,e){const n=new WeakMap,s=new oe;function r(a,o,l){const d=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,h=u!==void 0?u.length:0;let c=n.get(o);if(c===void 0||c.count!==h){let E=function(){C.dispose(),n.delete(o),o.removeEventListener("dispose",E)};var p=E;c!==void 0&&c.texture.dispose();const _=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,f=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],v=o.morphAttributes.normal||[],M=o.morphAttributes.color||[];let x=0;_===!0&&(x=1),g===!0&&(x=2),f===!0&&(x=3);let y=o.attributes.position.count*x,S=1;y>t.maxTextureSize&&(S=Math.ceil(y/t.maxTextureSize),y=t.maxTextureSize);const A=new Float32Array(y*S*4*h),C=new hl(A,y,S,h);C.type=pn,C.needsUpdate=!0;const b=x*4;for(let P=0;P<h;P++){const H=m[P],F=v[P],L=M[P],W=y*S*4*P;for(let z=0;z<H.count;z++){const q=z*b;_===!0&&(s.fromBufferAttribute(H,z),A[W+q+0]=s.x,A[W+q+1]=s.y,A[W+q+2]=s.z,A[W+q+3]=0),g===!0&&(s.fromBufferAttribute(F,z),A[W+q+4]=s.x,A[W+q+5]=s.y,A[W+q+6]=s.z,A[W+q+7]=0),f===!0&&(s.fromBufferAttribute(L,z),A[W+q+8]=s.x,A[W+q+9]=s.y,A[W+q+10]=s.z,A[W+q+11]=L.itemSize===4?s.w:1)}}c={count:h,texture:C,size:new Lt(y,S)},n.set(o,c),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let _=0;for(let f=0;f<d.length;f++)_+=d[f];const g=o.morphTargetsRelative?1:1-_;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",d)}l.getUniforms().setValue(i,"morphTargetsTexture",c.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",c.size)}return{update:r}}function hf(i,t,e,n){let s=new WeakMap;function r(l){const d=n.render.frame,u=l.geometry,h=t.get(l,u);if(s.get(h)!==d&&(t.update(h),s.set(h,d)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),s.get(l)!==d&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,d))),l.isSkinnedMesh){const c=l.skeleton;s.get(c)!==d&&(c.update(),s.set(c,d))}return h}function a(){s=new WeakMap}function o(l){const d=l.target;d.removeEventListener("dispose",o),e.remove(d.instanceMatrix),d.instanceColor!==null&&e.remove(d.instanceColor)}return{update:r,dispose:a}}class bl extends Ie{constructor(t,e,n,s,r,a,o,l,d,u=Ei){if(u!==Ei&&u!==Pi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&u===Ei&&(n=Qn),n===void 0&&u===Pi&&(n=Ci),super(null,s,r,a,o,l,u,n,d),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=o!==void 0?o:Ke,this.minFilter=l!==void 0?l:Ke,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const El=new Ie,mo=new bl(1,1),Tl=new hl,wl=new Zc,Al=new Ml,go=[],_o=[],xo=new Float32Array(16),vo=new Float32Array(9),Mo=new Float32Array(4);function Ii(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let r=go[s];if(r===void 0&&(r=new Float32Array(s),go[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function fe(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function pe(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function ks(i,t){let e=_o[t];e===void 0&&(e=new Int32Array(t),_o[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function uf(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function ff(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fe(e,t))return;i.uniform2fv(this.addr,t),pe(e,t)}}function pf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(fe(e,t))return;i.uniform3fv(this.addr,t),pe(e,t)}}function mf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fe(e,t))return;i.uniform4fv(this.addr,t),pe(e,t)}}function gf(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(fe(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),pe(e,t)}else{if(fe(e,n))return;Mo.set(n),i.uniformMatrix2fv(this.addr,!1,Mo),pe(e,n)}}function _f(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(fe(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),pe(e,t)}else{if(fe(e,n))return;vo.set(n),i.uniformMatrix3fv(this.addr,!1,vo),pe(e,n)}}function xf(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(fe(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),pe(e,t)}else{if(fe(e,n))return;xo.set(n),i.uniformMatrix4fv(this.addr,!1,xo),pe(e,n)}}function vf(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function Mf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fe(e,t))return;i.uniform2iv(this.addr,t),pe(e,t)}}function Sf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(fe(e,t))return;i.uniform3iv(this.addr,t),pe(e,t)}}function yf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fe(e,t))return;i.uniform4iv(this.addr,t),pe(e,t)}}function bf(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function Ef(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fe(e,t))return;i.uniform2uiv(this.addr,t),pe(e,t)}}function Tf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(fe(e,t))return;i.uniform3uiv(this.addr,t),pe(e,t)}}function wf(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fe(e,t))return;i.uniform4uiv(this.addr,t),pe(e,t)}}function Af(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(mo.compareFunction=ll,r=mo):r=El,e.setTexture2D(t||r,s)}function Rf(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||wl,s)}function Cf(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Al,s)}function Pf(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Tl,s)}function Lf(i){switch(i){case 5126:return uf;case 35664:return ff;case 35665:return pf;case 35666:return mf;case 35674:return gf;case 35675:return _f;case 35676:return xf;case 5124:case 35670:return vf;case 35667:case 35671:return Mf;case 35668:case 35672:return Sf;case 35669:case 35673:return yf;case 5125:return bf;case 36294:return Ef;case 36295:return Tf;case 36296:return wf;case 35678:case 36198:case 36298:case 36306:case 35682:return Af;case 35679:case 36299:case 36307:return Rf;case 35680:case 36300:case 36308:case 36293:return Cf;case 36289:case 36303:case 36311:case 36292:return Pf}}function Df(i,t){i.uniform1fv(this.addr,t)}function If(i,t){const e=Ii(t,this.size,2);i.uniform2fv(this.addr,e)}function Uf(i,t){const e=Ii(t,this.size,3);i.uniform3fv(this.addr,e)}function Nf(i,t){const e=Ii(t,this.size,4);i.uniform4fv(this.addr,e)}function Ff(i,t){const e=Ii(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function zf(i,t){const e=Ii(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function Of(i,t){const e=Ii(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function kf(i,t){i.uniform1iv(this.addr,t)}function Bf(i,t){i.uniform2iv(this.addr,t)}function Hf(i,t){i.uniform3iv(this.addr,t)}function Vf(i,t){i.uniform4iv(this.addr,t)}function Gf(i,t){i.uniform1uiv(this.addr,t)}function Wf(i,t){i.uniform2uiv(this.addr,t)}function Xf(i,t){i.uniform3uiv(this.addr,t)}function qf(i,t){i.uniform4uiv(this.addr,t)}function Yf(i,t,e){const n=this.cache,s=t.length,r=ks(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTexture2D(t[a]||El,r[a])}function $f(i,t,e){const n=this.cache,s=t.length,r=ks(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||wl,r[a])}function jf(i,t,e){const n=this.cache,s=t.length,r=ks(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||Al,r[a])}function Zf(i,t,e){const n=this.cache,s=t.length,r=ks(e,s);fe(n,r)||(i.uniform1iv(this.addr,r),pe(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||Tl,r[a])}function Kf(i){switch(i){case 5126:return Df;case 35664:return If;case 35665:return Uf;case 35666:return Nf;case 35674:return Ff;case 35675:return zf;case 35676:return Of;case 5124:case 35670:return kf;case 35667:case 35671:return Bf;case 35668:case 35672:return Hf;case 35669:case 35673:return Vf;case 5125:return Gf;case 36294:return Wf;case 36295:return Xf;case 36296:return qf;case 35678:case 36198:case 36298:case 36306:case 35682:return Yf;case 35679:case 36299:case 36307:return $f;case 35680:case 36300:case 36308:case 36293:return jf;case 36289:case 36303:case 36311:case 36292:return Zf}}class Jf{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Lf(e.type)}}class Qf{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Kf(e.type)}}class tp{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let r=0,a=s.length;r!==a;++r){const o=s[r];o.setValue(t,e[o.id],n)}}}const gr=/(\w+)(\])?(\[|\.)?/g;function So(i,t){i.seq.push(t),i.map[t.id]=t}function ep(i,t,e){const n=i.name,s=n.length;for(gr.lastIndex=0;;){const r=gr.exec(n),a=gr.lastIndex;let o=r[1];const l=r[2]==="]",d=r[3];if(l&&(o=o|0),d===void 0||d==="["&&a+2===s){So(e,d===void 0?new Jf(o,i,t):new Qf(o,i,t));break}else{let h=e.map[o];h===void 0&&(h=new tp(o),So(e,h)),e=h}}}class Ds{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const r=t.getActiveUniform(e,s),a=t.getUniformLocation(e,r.name);ep(r,a,this)}}setValue(t,e,n,s){const r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){const o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,r=t.length;s!==r;++s){const a=t[s];a.id in e&&n.push(a)}return n}}function yo(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const np=37297;let ip=0;function sp(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){const o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}const bo=new Pt;function rp(i){Vt._getMatrix(bo,Vt.workingColorSpace,i);const t=`mat3( ${bo.elements.map(e=>e.toFixed(4))} )`;switch(Vt.getTransfer(i)){case zs:return[t,"LinearTransferOETF"];case $t:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Eo(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),s=i.getShaderInfoLog(t).trim();if(n&&s==="")return"";const r=/ERROR: 0:(\d+)/.exec(s);if(r){const a=parseInt(r[1]);return e.toUpperCase()+`

`+s+`

`+sp(i.getShaderSource(t),a)}else return s}function ap(i,t){const e=rp(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function op(i,t){let e;switch(t){case yc:e="Linear";break;case bc:e="Reinhard";break;case Ec:e="Cineon";break;case Tc:e="ACESFilmic";break;case Ac:e="AgX";break;case Rc:e="Neutral";break;case wc:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const ys=new B;function lp(){Vt.getLuminanceCoefficients(ys);const i=ys.x.toFixed(4),t=ys.y.toFixed(4),e=ys.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function cp(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Wi).join(`
`)}function dp(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function hp(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(t,s),a=r.name;let o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function Wi(i){return i!==""}function To(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function wo(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const up=/^[ \t]*#include +<([\w\d./]+)>/gm;function oa(i){return i.replace(up,pp)}const fp=new Map;function pp(i,t){let e=It[t];if(e===void 0){const n=fp.get(t);if(n!==void 0)e=It[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return oa(e)}const mp=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ao(i){return i.replace(mp,gp)}function gp(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Ro(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function _p(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Yo?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===$o?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===un&&(t="SHADOWMAP_TYPE_VSM"),t}function xp(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Ai:case Ri:t="ENVMAP_TYPE_CUBE";break;case Fs:t="ENVMAP_TYPE_CUBE_UV";break}return t}function vp(i){let t="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case Ri:t="ENVMAP_MODE_REFRACTION";break}return t}function Mp(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case jo:t="ENVMAP_BLENDING_MULTIPLY";break;case Mc:t="ENVMAP_BLENDING_MIX";break;case Sc:t="ENVMAP_BLENDING_ADD";break}return t}function Sp(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function yp(i,t,e,n){const s=i.getContext(),r=e.defines;let a=e.vertexShader,o=e.fragmentShader;const l=_p(e),d=xp(e),u=vp(e),h=Mp(e),c=Sp(e),p=cp(e),_=dp(r),g=s.createProgram();let f,m,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Wi).join(`
`),f.length>0&&(f+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Wi).join(`
`),m.length>0&&(m+=`
`)):(f=[Ro(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+u:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Wi).join(`
`),m=[Ro(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+d:"",e.envMap?"#define "+u:"",e.envMap?"#define "+h:"",c?"#define CUBEUV_TEXEL_WIDTH "+c.texelWidth:"",c?"#define CUBEUV_TEXEL_HEIGHT "+c.texelHeight:"",c?"#define CUBEUV_MAX_MIP "+c.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Dn?"#define TONE_MAPPING":"",e.toneMapping!==Dn?It.tonemapping_pars_fragment:"",e.toneMapping!==Dn?op("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",It.colorspace_pars_fragment,ap("linearToOutputTexel",e.outputColorSpace),lp(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Wi).join(`
`)),a=oa(a),a=To(a,e),a=wo(a,e),o=oa(o),o=To(o,e),o=wo(o,e),a=Ao(a),o=Ao(o),e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,f=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+f,m=["#define varying in",e.glslVersion===Ba?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Ba?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const M=v+f+a,x=v+m+o,y=yo(s,s.VERTEX_SHADER,M),S=yo(s,s.FRAGMENT_SHADER,x);s.attachShader(g,y),s.attachShader(g,S),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function A(P){if(i.debug.checkShaderErrors){const H=s.getProgramInfoLog(g).trim(),F=s.getShaderInfoLog(y).trim(),L=s.getShaderInfoLog(S).trim();let W=!0,z=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(W=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,g,y,S);else{const q=Eo(s,y,"vertex"),O=Eo(s,S,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+H+`
`+q+`
`+O)}else H!==""?console.warn("THREE.WebGLProgram: Program Info Log:",H):(F===""||L==="")&&(z=!1);z&&(P.diagnostics={runnable:W,programLog:H,vertexShader:{log:F,prefix:f},fragmentShader:{log:L,prefix:m}})}s.deleteShader(y),s.deleteShader(S),C=new Ds(s,g),b=hp(s,g)}let C;this.getUniforms=function(){return C===void 0&&A(this),C};let b;this.getAttributes=function(){return b===void 0&&A(this),b};let E=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=s.getProgramParameter(g,np)),E},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=ip++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=y,this.fragmentShader=S,this}let bp=0;class Ep{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(t);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new Tp(t),e.set(t,n)),n}}class Tp{constructor(t){this.id=bp++,this.code=t,this.usedTimes=0}}function wp(i,t,e,n,s,r,a){const o=new fl,l=new Ep,d=new Set,u=[],h=s.logarithmicDepthBuffer,c=s.vertexTextures;let p=s.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(b){return d.add(b),b===0?"uv":`uv${b}`}function f(b,E,P,H,F){const L=H.fog,W=F.geometry,z=b.isMeshStandardMaterial?H.environment:null,q=(b.isMeshStandardMaterial?e:t).get(b.envMap||z),O=q&&q.mapping===Fs?q.image.height:null,J=_[b.type];b.precision!==null&&(p=s.getMaxPrecision(b.precision),p!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",p,"instead."));const nt=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,Mt=nt!==void 0?nt.length:0;let At=0;W.morphAttributes.position!==void 0&&(At=1),W.morphAttributes.normal!==void 0&&(At=2),W.morphAttributes.color!==void 0&&(At=3);let Gt,Y,Q,ft;if(J){const Yt=Qe[J];Gt=Yt.vertexShader,Y=Yt.fragmentShader}else Gt=b.vertexShader,Y=b.fragmentShader,l.update(b),Q=l.getVertexShaderID(b),ft=l.getFragmentShaderID(b);const st=i.getRenderTarget(),_t=i.state.buffers.depth.getReversed(),Tt=F.isInstancedMesh===!0,Ut=F.isBatchedMesh===!0,Jt=!!b.map,Ft=!!b.matcap,ne=!!q,N=!!b.aoMap,we=!!b.lightMap,Nt=!!b.bumpMap,Ot=!!b.normalMap,yt=!!b.displacementMap,Qt=!!b.emissiveMap,St=!!b.metalnessMap,R=!!b.roughnessMap,T=b.anisotropy>0,k=b.clearcoat>0,j=b.dispersion>0,K=b.iridescence>0,$=b.sheen>0,xt=b.transmission>0,at=T&&!!b.anisotropyMap,dt=k&&!!b.clearcoatMap,Ht=k&&!!b.clearcoatNormalMap,tt=k&&!!b.clearcoatRoughnessMap,ht=K&&!!b.iridescenceMap,bt=K&&!!b.iridescenceThicknessMap,Et=$&&!!b.sheenColorMap,ut=$&&!!b.sheenRoughnessMap,kt=!!b.specularMap,Dt=!!b.specularColorMap,Zt=!!b.specularIntensityMap,D=xt&&!!b.transmissionMap,rt=xt&&!!b.thicknessMap,X=!!b.gradientMap,Z=!!b.alphaMap,ct=b.alphaTest>0,ot=!!b.alphaHash,Rt=!!b.extensions;let re=Dn;b.toneMapped&&(st===null||st.isXRRenderTarget===!0)&&(re=i.toneMapping);const ve={shaderID:J,shaderType:b.type,shaderName:b.name,vertexShader:Gt,fragmentShader:Y,defines:b.defines,customVertexShaderID:Q,customFragmentShaderID:ft,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:p,batching:Ut,batchingColor:Ut&&F._colorsTexture!==null,instancing:Tt,instancingColor:Tt&&F.instanceColor!==null,instancingMorph:Tt&&F.morphTexture!==null,supportsVertexTextures:c,outputColorSpace:st===null?i.outputColorSpace:st.isXRRenderTarget===!0?st.texture.colorSpace:Di,alphaToCoverage:!!b.alphaToCoverage,map:Jt,matcap:Ft,envMap:ne,envMapMode:ne&&q.mapping,envMapCubeUVHeight:O,aoMap:N,lightMap:we,bumpMap:Nt,normalMap:Ot,displacementMap:c&&yt,emissiveMap:Qt,normalMapObjectSpace:Ot&&b.normalMapType===Dc,normalMapTangentSpace:Ot&&b.normalMapType===ol,metalnessMap:St,roughnessMap:R,anisotropy:T,anisotropyMap:at,clearcoat:k,clearcoatMap:dt,clearcoatNormalMap:Ht,clearcoatRoughnessMap:tt,dispersion:j,iridescence:K,iridescenceMap:ht,iridescenceThicknessMap:bt,sheen:$,sheenColorMap:Et,sheenRoughnessMap:ut,specularMap:kt,specularColorMap:Dt,specularIntensityMap:Zt,transmission:xt,transmissionMap:D,thicknessMap:rt,gradientMap:X,opaque:b.transparent===!1&&b.blending===bi&&b.alphaToCoverage===!1,alphaMap:Z,alphaTest:ct,alphaHash:ot,combine:b.combine,mapUv:Jt&&g(b.map.channel),aoMapUv:N&&g(b.aoMap.channel),lightMapUv:we&&g(b.lightMap.channel),bumpMapUv:Nt&&g(b.bumpMap.channel),normalMapUv:Ot&&g(b.normalMap.channel),displacementMapUv:yt&&g(b.displacementMap.channel),emissiveMapUv:Qt&&g(b.emissiveMap.channel),metalnessMapUv:St&&g(b.metalnessMap.channel),roughnessMapUv:R&&g(b.roughnessMap.channel),anisotropyMapUv:at&&g(b.anisotropyMap.channel),clearcoatMapUv:dt&&g(b.clearcoatMap.channel),clearcoatNormalMapUv:Ht&&g(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:tt&&g(b.clearcoatRoughnessMap.channel),iridescenceMapUv:ht&&g(b.iridescenceMap.channel),iridescenceThicknessMapUv:bt&&g(b.iridescenceThicknessMap.channel),sheenColorMapUv:Et&&g(b.sheenColorMap.channel),sheenRoughnessMapUv:ut&&g(b.sheenRoughnessMap.channel),specularMapUv:kt&&g(b.specularMap.channel),specularColorMapUv:Dt&&g(b.specularColorMap.channel),specularIntensityMapUv:Zt&&g(b.specularIntensityMap.channel),transmissionMapUv:D&&g(b.transmissionMap.channel),thicknessMapUv:rt&&g(b.thicknessMap.channel),alphaMapUv:Z&&g(b.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(Ot||T),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!W.attributes.uv&&(Jt||Z),fog:!!L,useFog:b.fog===!0,fogExp2:!!L&&L.isFogExp2,flatShading:b.flatShading===!0,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:h,reverseDepthBuffer:_t,skinning:F.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:Mt,morphTextureStride:At,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:re,decodeVideoTexture:Jt&&b.map.isVideoTexture===!0&&Vt.getTransfer(b.map.colorSpace)===$t,decodeVideoTextureEmissive:Qt&&b.emissiveMap.isVideoTexture===!0&&Vt.getTransfer(b.emissiveMap.colorSpace)===$t,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===fn,flipSided:b.side===De,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Rt&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Rt&&b.extensions.multiDraw===!0||Ut)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return ve.vertexUv1s=d.has(1),ve.vertexUv2s=d.has(2),ve.vertexUv3s=d.has(3),d.clear(),ve}function m(b){const E=[];if(b.shaderID?E.push(b.shaderID):(E.push(b.customVertexShaderID),E.push(b.customFragmentShaderID)),b.defines!==void 0)for(const P in b.defines)E.push(P),E.push(b.defines[P]);return b.isRawShaderMaterial===!1&&(v(E,b),M(E,b),E.push(i.outputColorSpace)),E.push(b.customProgramCacheKey),E.join()}function v(b,E){b.push(E.precision),b.push(E.outputColorSpace),b.push(E.envMapMode),b.push(E.envMapCubeUVHeight),b.push(E.mapUv),b.push(E.alphaMapUv),b.push(E.lightMapUv),b.push(E.aoMapUv),b.push(E.bumpMapUv),b.push(E.normalMapUv),b.push(E.displacementMapUv),b.push(E.emissiveMapUv),b.push(E.metalnessMapUv),b.push(E.roughnessMapUv),b.push(E.anisotropyMapUv),b.push(E.clearcoatMapUv),b.push(E.clearcoatNormalMapUv),b.push(E.clearcoatRoughnessMapUv),b.push(E.iridescenceMapUv),b.push(E.iridescenceThicknessMapUv),b.push(E.sheenColorMapUv),b.push(E.sheenRoughnessMapUv),b.push(E.specularMapUv),b.push(E.specularColorMapUv),b.push(E.specularIntensityMapUv),b.push(E.transmissionMapUv),b.push(E.thicknessMapUv),b.push(E.combine),b.push(E.fogExp2),b.push(E.sizeAttenuation),b.push(E.morphTargetsCount),b.push(E.morphAttributeCount),b.push(E.numDirLights),b.push(E.numPointLights),b.push(E.numSpotLights),b.push(E.numSpotLightMaps),b.push(E.numHemiLights),b.push(E.numRectAreaLights),b.push(E.numDirLightShadows),b.push(E.numPointLightShadows),b.push(E.numSpotLightShadows),b.push(E.numSpotLightShadowsWithMaps),b.push(E.numLightProbes),b.push(E.shadowMapType),b.push(E.toneMapping),b.push(E.numClippingPlanes),b.push(E.numClipIntersection),b.push(E.depthPacking)}function M(b,E){o.disableAll(),E.supportsVertexTextures&&o.enable(0),E.instancing&&o.enable(1),E.instancingColor&&o.enable(2),E.instancingMorph&&o.enable(3),E.matcap&&o.enable(4),E.envMap&&o.enable(5),E.normalMapObjectSpace&&o.enable(6),E.normalMapTangentSpace&&o.enable(7),E.clearcoat&&o.enable(8),E.iridescence&&o.enable(9),E.alphaTest&&o.enable(10),E.vertexColors&&o.enable(11),E.vertexAlphas&&o.enable(12),E.vertexUv1s&&o.enable(13),E.vertexUv2s&&o.enable(14),E.vertexUv3s&&o.enable(15),E.vertexTangents&&o.enable(16),E.anisotropy&&o.enable(17),E.alphaHash&&o.enable(18),E.batching&&o.enable(19),E.dispersion&&o.enable(20),E.batchingColor&&o.enable(21),b.push(o.mask),o.disableAll(),E.fog&&o.enable(0),E.useFog&&o.enable(1),E.flatShading&&o.enable(2),E.logarithmicDepthBuffer&&o.enable(3),E.reverseDepthBuffer&&o.enable(4),E.skinning&&o.enable(5),E.morphTargets&&o.enable(6),E.morphNormals&&o.enable(7),E.morphColors&&o.enable(8),E.premultipliedAlpha&&o.enable(9),E.shadowMapEnabled&&o.enable(10),E.doubleSided&&o.enable(11),E.flipSided&&o.enable(12),E.useDepthPacking&&o.enable(13),E.dithering&&o.enable(14),E.transmission&&o.enable(15),E.sheen&&o.enable(16),E.opaque&&o.enable(17),E.pointsUvs&&o.enable(18),E.decodeVideoTexture&&o.enable(19),E.decodeVideoTextureEmissive&&o.enable(20),E.alphaToCoverage&&o.enable(21),b.push(o.mask)}function x(b){const E=_[b.type];let P;if(E){const H=Qe[E];P=ld.clone(H.uniforms)}else P=b.uniforms;return P}function y(b,E){let P;for(let H=0,F=u.length;H<F;H++){const L=u[H];if(L.cacheKey===E){P=L,++P.usedTimes;break}}return P===void 0&&(P=new yp(i,E,b,r),u.push(P)),P}function S(b){if(--b.usedTimes===0){const E=u.indexOf(b);u[E]=u[u.length-1],u.pop(),b.destroy()}}function A(b){l.remove(b)}function C(){l.dispose()}return{getParameters:f,getProgramCacheKey:m,getUniforms:x,acquireProgram:y,releaseProgram:S,releaseShaderCache:A,programs:u,dispose:C}}function Ap(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Rp(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function Co(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function Po(){const i=[];let t=0;const e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(h,c,p,_,g,f){let m=i[t];return m===void 0?(m={id:h.id,object:h,geometry:c,material:p,groupOrder:_,renderOrder:h.renderOrder,z:g,group:f},i[t]=m):(m.id=h.id,m.object=h,m.geometry=c,m.material=p,m.groupOrder=_,m.renderOrder=h.renderOrder,m.z=g,m.group=f),t++,m}function o(h,c,p,_,g,f){const m=a(h,c,p,_,g,f);p.transmission>0?n.push(m):p.transparent===!0?s.push(m):e.push(m)}function l(h,c,p,_,g,f){const m=a(h,c,p,_,g,f);p.transmission>0?n.unshift(m):p.transparent===!0?s.unshift(m):e.unshift(m)}function d(h,c){e.length>1&&e.sort(h||Rp),n.length>1&&n.sort(c||Co),s.length>1&&s.sort(c||Co)}function u(){for(let h=t,c=i.length;h<c;h++){const p=i[h];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:o,unshift:l,finish:u,sort:d}}function Cp(){let i=new WeakMap;function t(n,s){const r=i.get(n);let a;return r===void 0?(a=new Po,i.set(n,[a])):s>=r.length?(a=new Po,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function Pp(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new B,color:new Bt};break;case"SpotLight":e={position:new B,direction:new B,color:new Bt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new B,color:new Bt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new B,skyColor:new Bt,groundColor:new Bt};break;case"RectAreaLight":e={color:new Bt,position:new B,halfWidth:new B,halfHeight:new B};break}return i[t.id]=e,e}}}function Lp(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Lt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Lt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Lt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let Dp=0;function Ip(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Up(i){const t=new Pp,e=Lp(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let d=0;d<9;d++)n.probe.push(new B);const s=new B,r=new le,a=new le;function o(d){let u=0,h=0,c=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let p=0,_=0,g=0,f=0,m=0,v=0,M=0,x=0,y=0,S=0,A=0;d.sort(Ip);for(let b=0,E=d.length;b<E;b++){const P=d[b],H=P.color,F=P.intensity,L=P.distance,W=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)u+=H.r*F,h+=H.g*F,c+=H.b*F;else if(P.isLightProbe){for(let z=0;z<9;z++)n.probe[z].addScaledVector(P.sh.coefficients[z],F);A++}else if(P.isDirectionalLight){const z=t.get(P);if(z.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){const q=P.shadow,O=e.get(P);O.shadowIntensity=q.intensity,O.shadowBias=q.bias,O.shadowNormalBias=q.normalBias,O.shadowRadius=q.radius,O.shadowMapSize=q.mapSize,n.directionalShadow[p]=O,n.directionalShadowMap[p]=W,n.directionalShadowMatrix[p]=P.shadow.matrix,v++}n.directional[p]=z,p++}else if(P.isSpotLight){const z=t.get(P);z.position.setFromMatrixPosition(P.matrixWorld),z.color.copy(H).multiplyScalar(F),z.distance=L,z.coneCos=Math.cos(P.angle),z.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),z.decay=P.decay,n.spot[g]=z;const q=P.shadow;if(P.map&&(n.spotLightMap[y]=P.map,y++,q.updateMatrices(P),P.castShadow&&S++),n.spotLightMatrix[g]=q.matrix,P.castShadow){const O=e.get(P);O.shadowIntensity=q.intensity,O.shadowBias=q.bias,O.shadowNormalBias=q.normalBias,O.shadowRadius=q.radius,O.shadowMapSize=q.mapSize,n.spotShadow[g]=O,n.spotShadowMap[g]=W,x++}g++}else if(P.isRectAreaLight){const z=t.get(P);z.color.copy(H).multiplyScalar(F),z.halfWidth.set(P.width*.5,0,0),z.halfHeight.set(0,P.height*.5,0),n.rectArea[f]=z,f++}else if(P.isPointLight){const z=t.get(P);if(z.color.copy(P.color).multiplyScalar(P.intensity),z.distance=P.distance,z.decay=P.decay,P.castShadow){const q=P.shadow,O=e.get(P);O.shadowIntensity=q.intensity,O.shadowBias=q.bias,O.shadowNormalBias=q.normalBias,O.shadowRadius=q.radius,O.shadowMapSize=q.mapSize,O.shadowCameraNear=q.camera.near,O.shadowCameraFar=q.camera.far,n.pointShadow[_]=O,n.pointShadowMap[_]=W,n.pointShadowMatrix[_]=P.shadow.matrix,M++}n.point[_]=z,_++}else if(P.isHemisphereLight){const z=t.get(P);z.skyColor.copy(P.color).multiplyScalar(F),z.groundColor.copy(P.groundColor).multiplyScalar(F),n.hemi[m]=z,m++}}f>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=it.LTC_FLOAT_1,n.rectAreaLTC2=it.LTC_FLOAT_2):(n.rectAreaLTC1=it.LTC_HALF_1,n.rectAreaLTC2=it.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=c;const C=n.hash;(C.directionalLength!==p||C.pointLength!==_||C.spotLength!==g||C.rectAreaLength!==f||C.hemiLength!==m||C.numDirectionalShadows!==v||C.numPointShadows!==M||C.numSpotShadows!==x||C.numSpotMaps!==y||C.numLightProbes!==A)&&(n.directional.length=p,n.spot.length=g,n.rectArea.length=f,n.point.length=_,n.hemi.length=m,n.directionalShadow.length=v,n.directionalShadowMap.length=v,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=v,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=x+y-S,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=A,C.directionalLength=p,C.pointLength=_,C.spotLength=g,C.rectAreaLength=f,C.hemiLength=m,C.numDirectionalShadows=v,C.numPointShadows=M,C.numSpotShadows=x,C.numSpotMaps=y,C.numLightProbes=A,n.version=Dp++)}function l(d,u){let h=0,c=0,p=0,_=0,g=0;const f=u.matrixWorldInverse;for(let m=0,v=d.length;m<v;m++){const M=d[m];if(M.isDirectionalLight){const x=n.directional[h];x.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(f),h++}else if(M.isSpotLight){const x=n.spot[p];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(f),x.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(f),p++}else if(M.isRectAreaLight){const x=n.rectArea[_];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(f),a.identity(),r.copy(M.matrixWorld),r.premultiply(f),a.extractRotation(r),x.halfWidth.set(M.width*.5,0,0),x.halfHeight.set(0,M.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),_++}else if(M.isPointLight){const x=n.point[c];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(f),c++}else if(M.isHemisphereLight){const x=n.hemi[g];x.direction.setFromMatrixPosition(M.matrixWorld),x.direction.transformDirection(f),g++}}}return{setup:o,setupView:l,state:n}}function Lo(i){const t=new Up(i),e=[],n=[];function s(u){d.camera=u,e.length=0,n.length=0}function r(u){e.push(u)}function a(u){n.push(u)}function o(){t.setup(e)}function l(u){t.setupView(e,u)}const d={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:d,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function Np(i){let t=new WeakMap;function e(s,r=0){const a=t.get(s);let o;return a===void 0?(o=new Lo(i),t.set(s,[o])):r>=a.length?(o=new Lo(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}class Fp extends Ki{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Pc,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class zp extends Ki{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const Op=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,kp=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Bp(i,t,e){let n=new Ma;const s=new Lt,r=new Lt,a=new oe,o=new Fp({depthPacking:Lc}),l=new zp,d={},u=e.maxTextureSize,h={[Un]:De,[De]:Un,[fn]:fn},c=new Nn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Lt},radius:{value:4}},vertexShader:Op,fragmentShader:kp}),p=c.clone();p.defines.HORIZONTAL_PASS=1;const _=new Fn;_.setAttribute("position",new en(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new Le(_,c),f=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Yo;let m=this.type;this.render=function(S,A,C){if(f.enabled===!1||f.autoUpdate===!1&&f.needsUpdate===!1||S.length===0)return;const b=i.getRenderTarget(),E=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),H=i.state;H.setBlending(Ln),H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const F=m!==un&&this.type===un,L=m===un&&this.type!==un;for(let W=0,z=S.length;W<z;W++){const q=S[W],O=q.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;s.copy(O.mapSize);const J=O.getFrameExtents();if(s.multiply(J),r.copy(O.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/J.x),s.x=r.x*J.x,O.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/J.y),s.y=r.y*J.y,O.mapSize.y=r.y)),O.map===null||F===!0||L===!0){const Mt=this.type!==un?{minFilter:Ke,magFilter:Ke}:{};O.map!==null&&O.map.dispose(),O.map=new ti(s.x,s.y,Mt),O.map.texture.name=q.name+".shadowMap",O.camera.updateProjectionMatrix()}i.setRenderTarget(O.map),i.clear();const nt=O.getViewportCount();for(let Mt=0;Mt<nt;Mt++){const At=O.getViewport(Mt);a.set(r.x*At.x,r.y*At.y,r.x*At.z,r.y*At.w),H.viewport(a),O.updateMatrices(q,Mt),n=O.getFrustum(),x(A,C,O.camera,q,this.type)}O.isPointLightShadow!==!0&&this.type===un&&v(O,C),O.needsUpdate=!1}m=this.type,f.needsUpdate=!1,i.setRenderTarget(b,E,P)};function v(S,A){const C=t.update(g);c.defines.VSM_SAMPLES!==S.blurSamples&&(c.defines.VSM_SAMPLES=S.blurSamples,p.defines.VSM_SAMPLES=S.blurSamples,c.needsUpdate=!0,p.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new ti(s.x,s.y)),c.uniforms.shadow_pass.value=S.map.texture,c.uniforms.resolution.value=S.mapSize,c.uniforms.radius.value=S.radius,i.setRenderTarget(S.mapPass),i.clear(),i.renderBufferDirect(A,null,C,c,g,null),p.uniforms.shadow_pass.value=S.mapPass.texture,p.uniforms.resolution.value=S.mapSize,p.uniforms.radius.value=S.radius,i.setRenderTarget(S.map),i.clear(),i.renderBufferDirect(A,null,C,p,g,null)}function M(S,A,C,b){let E=null;const P=C.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(P!==void 0)E=P;else if(E=C.isPointLight===!0?l:o,i.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){const H=E.uuid,F=A.uuid;let L=d[H];L===void 0&&(L={},d[H]=L);let W=L[F];W===void 0&&(W=E.clone(),L[F]=W,A.addEventListener("dispose",y)),E=W}if(E.visible=A.visible,E.wireframe=A.wireframe,b===un?E.side=A.shadowSide!==null?A.shadowSide:A.side:E.side=A.shadowSide!==null?A.shadowSide:h[A.side],E.alphaMap=A.alphaMap,E.alphaTest=A.alphaTest,E.map=A.map,E.clipShadows=A.clipShadows,E.clippingPlanes=A.clippingPlanes,E.clipIntersection=A.clipIntersection,E.displacementMap=A.displacementMap,E.displacementScale=A.displacementScale,E.displacementBias=A.displacementBias,E.wireframeLinewidth=A.wireframeLinewidth,E.linewidth=A.linewidth,C.isPointLight===!0&&E.isMeshDistanceMaterial===!0){const H=i.properties.get(E);H.light=C}return E}function x(S,A,C,b,E){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&E===un)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,S.matrixWorld);const F=t.update(S),L=S.material;if(Array.isArray(L)){const W=F.groups;for(let z=0,q=W.length;z<q;z++){const O=W[z],J=L[O.materialIndex];if(J&&J.visible){const nt=M(S,J,b,E);S.onBeforeShadow(i,S,A,C,F,nt,O),i.renderBufferDirect(C,null,F,nt,S,O),S.onAfterShadow(i,S,A,C,F,nt,O)}}}else if(L.visible){const W=M(S,L,b,E);S.onBeforeShadow(i,S,A,C,F,W,null),i.renderBufferDirect(C,null,F,W,S,null),S.onAfterShadow(i,S,A,C,F,W,null)}}const H=S.children;for(let F=0,L=H.length;F<L;F++)x(H[F],A,C,b,E)}function y(S){S.target.removeEventListener("dispose",y);for(const C in d){const b=d[C],E=S.target.uuid;E in b&&(b[E].dispose(),delete b[E])}}}const Hp={[br]:Er,[Tr]:Rr,[wr]:Cr,[wi]:Ar,[Er]:br,[Rr]:Tr,[Cr]:wr,[Ar]:wi};function Vp(i,t){function e(){let D=!1;const rt=new oe;let X=null;const Z=new oe(0,0,0,0);return{setMask:function(ct){X!==ct&&!D&&(i.colorMask(ct,ct,ct,ct),X=ct)},setLocked:function(ct){D=ct},setClear:function(ct,ot,Rt,re,ve){ve===!0&&(ct*=re,ot*=re,Rt*=re),rt.set(ct,ot,Rt,re),Z.equals(rt)===!1&&(i.clearColor(ct,ot,Rt,re),Z.copy(rt))},reset:function(){D=!1,X=null,Z.set(-1,0,0,0)}}}function n(){let D=!1,rt=!1,X=null,Z=null,ct=null;return{setReversed:function(ot){if(rt!==ot){const Rt=t.get("EXT_clip_control");rt?Rt.clipControlEXT(Rt.LOWER_LEFT_EXT,Rt.ZERO_TO_ONE_EXT):Rt.clipControlEXT(Rt.LOWER_LEFT_EXT,Rt.NEGATIVE_ONE_TO_ONE_EXT);const re=ct;ct=null,this.setClear(re)}rt=ot},getReversed:function(){return rt},setTest:function(ot){ot?st(i.DEPTH_TEST):_t(i.DEPTH_TEST)},setMask:function(ot){X!==ot&&!D&&(i.depthMask(ot),X=ot)},setFunc:function(ot){if(rt&&(ot=Hp[ot]),Z!==ot){switch(ot){case br:i.depthFunc(i.NEVER);break;case Er:i.depthFunc(i.ALWAYS);break;case Tr:i.depthFunc(i.LESS);break;case wi:i.depthFunc(i.LEQUAL);break;case wr:i.depthFunc(i.EQUAL);break;case Ar:i.depthFunc(i.GEQUAL);break;case Rr:i.depthFunc(i.GREATER);break;case Cr:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Z=ot}},setLocked:function(ot){D=ot},setClear:function(ot){ct!==ot&&(rt&&(ot=1-ot),i.clearDepth(ot),ct=ot)},reset:function(){D=!1,X=null,Z=null,ct=null,rt=!1}}}function s(){let D=!1,rt=null,X=null,Z=null,ct=null,ot=null,Rt=null,re=null,ve=null;return{setTest:function(Yt){D||(Yt?st(i.STENCIL_TEST):_t(i.STENCIL_TEST))},setMask:function(Yt){rt!==Yt&&!D&&(i.stencilMask(Yt),rt=Yt)},setFunc:function(Yt,Ge,rn){(X!==Yt||Z!==Ge||ct!==rn)&&(i.stencilFunc(Yt,Ge,rn),X=Yt,Z=Ge,ct=rn)},setOp:function(Yt,Ge,rn){(ot!==Yt||Rt!==Ge||re!==rn)&&(i.stencilOp(Yt,Ge,rn),ot=Yt,Rt=Ge,re=rn)},setLocked:function(Yt){D=Yt},setClear:function(Yt){ve!==Yt&&(i.clearStencil(Yt),ve=Yt)},reset:function(){D=!1,rt=null,X=null,Z=null,ct=null,ot=null,Rt=null,re=null,ve=null}}}const r=new e,a=new n,o=new s,l=new WeakMap,d=new WeakMap;let u={},h={},c=new WeakMap,p=[],_=null,g=!1,f=null,m=null,v=null,M=null,x=null,y=null,S=null,A=new Bt(0,0,0),C=0,b=!1,E=null,P=null,H=null,F=null,L=null;const W=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let z=!1,q=0;const O=i.getParameter(i.VERSION);O.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(O)[1]),z=q>=1):O.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),z=q>=2);let J=null,nt={};const Mt=i.getParameter(i.SCISSOR_BOX),At=i.getParameter(i.VIEWPORT),Gt=new oe().fromArray(Mt),Y=new oe().fromArray(At);function Q(D,rt,X,Z){const ct=new Uint8Array(4),ot=i.createTexture();i.bindTexture(D,ot),i.texParameteri(D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(D,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Rt=0;Rt<X;Rt++)D===i.TEXTURE_3D||D===i.TEXTURE_2D_ARRAY?i.texImage3D(rt,0,i.RGBA,1,1,Z,0,i.RGBA,i.UNSIGNED_BYTE,ct):i.texImage2D(rt+Rt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ct);return ot}const ft={};ft[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),ft[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ft[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ft[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),st(i.DEPTH_TEST),a.setFunc(wi),Nt(!1),Ot(Ua),st(i.CULL_FACE),N(Ln);function st(D){u[D]!==!0&&(i.enable(D),u[D]=!0)}function _t(D){u[D]!==!1&&(i.disable(D),u[D]=!1)}function Tt(D,rt){return h[D]!==rt?(i.bindFramebuffer(D,rt),h[D]=rt,D===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=rt),D===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=rt),!0):!1}function Ut(D,rt){let X=p,Z=!1;if(D){X=c.get(rt),X===void 0&&(X=[],c.set(rt,X));const ct=D.textures;if(X.length!==ct.length||X[0]!==i.COLOR_ATTACHMENT0){for(let ot=0,Rt=ct.length;ot<Rt;ot++)X[ot]=i.COLOR_ATTACHMENT0+ot;X.length=ct.length,Z=!0}}else X[0]!==i.BACK&&(X[0]=i.BACK,Z=!0);Z&&i.drawBuffers(X)}function Jt(D){return _!==D?(i.useProgram(D),_=D,!0):!1}const Ft={[Yn]:i.FUNC_ADD,[ic]:i.FUNC_SUBTRACT,[sc]:i.FUNC_REVERSE_SUBTRACT};Ft[rc]=i.MIN,Ft[ac]=i.MAX;const ne={[oc]:i.ZERO,[lc]:i.ONE,[cc]:i.SRC_COLOR,[Sr]:i.SRC_ALPHA,[mc]:i.SRC_ALPHA_SATURATE,[fc]:i.DST_COLOR,[hc]:i.DST_ALPHA,[dc]:i.ONE_MINUS_SRC_COLOR,[yr]:i.ONE_MINUS_SRC_ALPHA,[pc]:i.ONE_MINUS_DST_COLOR,[uc]:i.ONE_MINUS_DST_ALPHA,[gc]:i.CONSTANT_COLOR,[_c]:i.ONE_MINUS_CONSTANT_COLOR,[xc]:i.CONSTANT_ALPHA,[vc]:i.ONE_MINUS_CONSTANT_ALPHA};function N(D,rt,X,Z,ct,ot,Rt,re,ve,Yt){if(D===Ln){g===!0&&(_t(i.BLEND),g=!1);return}if(g===!1&&(st(i.BLEND),g=!0),D!==nc){if(D!==f||Yt!==b){if((m!==Yn||x!==Yn)&&(i.blendEquation(i.FUNC_ADD),m=Yn,x=Yn),Yt)switch(D){case bi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Na:i.blendFunc(i.ONE,i.ONE);break;case Fa:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case za:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",D);break}else switch(D){case bi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Na:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case Fa:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case za:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",D);break}v=null,M=null,y=null,S=null,A.set(0,0,0),C=0,f=D,b=Yt}return}ct=ct||rt,ot=ot||X,Rt=Rt||Z,(rt!==m||ct!==x)&&(i.blendEquationSeparate(Ft[rt],Ft[ct]),m=rt,x=ct),(X!==v||Z!==M||ot!==y||Rt!==S)&&(i.blendFuncSeparate(ne[X],ne[Z],ne[ot],ne[Rt]),v=X,M=Z,y=ot,S=Rt),(re.equals(A)===!1||ve!==C)&&(i.blendColor(re.r,re.g,re.b,ve),A.copy(re),C=ve),f=D,b=!1}function we(D,rt){D.side===fn?_t(i.CULL_FACE):st(i.CULL_FACE);let X=D.side===De;rt&&(X=!X),Nt(X),D.blending===bi&&D.transparent===!1?N(Ln):N(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),a.setFunc(D.depthFunc),a.setTest(D.depthTest),a.setMask(D.depthWrite),r.setMask(D.colorWrite);const Z=D.stencilWrite;o.setTest(Z),Z&&(o.setMask(D.stencilWriteMask),o.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),o.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),Qt(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?st(i.SAMPLE_ALPHA_TO_COVERAGE):_t(i.SAMPLE_ALPHA_TO_COVERAGE)}function Nt(D){E!==D&&(D?i.frontFace(i.CW):i.frontFace(i.CCW),E=D)}function Ot(D){D!==tc?(st(i.CULL_FACE),D!==P&&(D===Ua?i.cullFace(i.BACK):D===ec?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):_t(i.CULL_FACE),P=D}function yt(D){D!==H&&(z&&i.lineWidth(D),H=D)}function Qt(D,rt,X){D?(st(i.POLYGON_OFFSET_FILL),(F!==rt||L!==X)&&(i.polygonOffset(rt,X),F=rt,L=X)):_t(i.POLYGON_OFFSET_FILL)}function St(D){D?st(i.SCISSOR_TEST):_t(i.SCISSOR_TEST)}function R(D){D===void 0&&(D=i.TEXTURE0+W-1),J!==D&&(i.activeTexture(D),J=D)}function T(D,rt,X){X===void 0&&(J===null?X=i.TEXTURE0+W-1:X=J);let Z=nt[X];Z===void 0&&(Z={type:void 0,texture:void 0},nt[X]=Z),(Z.type!==D||Z.texture!==rt)&&(J!==X&&(i.activeTexture(X),J=X),i.bindTexture(D,rt||ft[D]),Z.type=D,Z.texture=rt)}function k(){const D=nt[J];D!==void 0&&D.type!==void 0&&(i.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function j(){try{i.compressedTexImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function K(){try{i.compressedTexImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function $(){try{i.texSubImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function xt(){try{i.texSubImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function at(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function dt(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Ht(){try{i.texStorage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function tt(){try{i.texStorage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function ht(){try{i.texImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function bt(){try{i.texImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Et(D){Gt.equals(D)===!1&&(i.scissor(D.x,D.y,D.z,D.w),Gt.copy(D))}function ut(D){Y.equals(D)===!1&&(i.viewport(D.x,D.y,D.z,D.w),Y.copy(D))}function kt(D,rt){let X=d.get(rt);X===void 0&&(X=new WeakMap,d.set(rt,X));let Z=X.get(D);Z===void 0&&(Z=i.getUniformBlockIndex(rt,D.name),X.set(D,Z))}function Dt(D,rt){const Z=d.get(rt).get(D);l.get(rt)!==Z&&(i.uniformBlockBinding(rt,Z,D.__bindingPointIndex),l.set(rt,Z))}function Zt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},J=null,nt={},h={},c=new WeakMap,p=[],_=null,g=!1,f=null,m=null,v=null,M=null,x=null,y=null,S=null,A=new Bt(0,0,0),C=0,b=!1,E=null,P=null,H=null,F=null,L=null,Gt.set(0,0,i.canvas.width,i.canvas.height),Y.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:st,disable:_t,bindFramebuffer:Tt,drawBuffers:Ut,useProgram:Jt,setBlending:N,setMaterial:we,setFlipSided:Nt,setCullFace:Ot,setLineWidth:yt,setPolygonOffset:Qt,setScissorTest:St,activeTexture:R,bindTexture:T,unbindTexture:k,compressedTexImage2D:j,compressedTexImage3D:K,texImage2D:ht,texImage3D:bt,updateUBOMapping:kt,uniformBlockBinding:Dt,texStorage2D:Ht,texStorage3D:tt,texSubImage2D:$,texSubImage3D:xt,compressedTexSubImage2D:at,compressedTexSubImage3D:dt,scissor:Et,viewport:ut,reset:Zt}}function Do(i,t,e,n){const s=Gp(n);switch(e){case tl:return i*t;case nl:return i*t;case il:return i*t*2;case sl:return i*t/s.components*s.byteLength;case ga:return i*t/s.components*s.byteLength;case rl:return i*t*2/s.components*s.byteLength;case _a:return i*t*2/s.components*s.byteLength;case el:return i*t*3/s.components*s.byteLength;case Ze:return i*t*4/s.components*s.byteLength;case xa:return i*t*4/s.components*s.byteLength;case ws:case As:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Rs:case Cs:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Nr:case zr:return Math.max(i,16)*Math.max(t,8)/4;case Ur:case Fr:return Math.max(i,8)*Math.max(t,8)/2;case Or:case kr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Br:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Hr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Vr:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Gr:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Wr:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Xr:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case qr:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Yr:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case $r:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case jr:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Zr:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Kr:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Jr:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Qr:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case ta:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Ps:case ea:case na:return Math.ceil(i/4)*Math.ceil(t/4)*16;case al:case ia:return Math.ceil(i/4)*Math.ceil(t/4)*8;case sa:case ra:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Gp(i){switch(i){case vn:case Ko:return{byteLength:1,components:1};case Yi:case Jo:case $i:return{byteLength:2,components:1};case pa:case ma:return{byteLength:2,components:4};case Qn:case fa:case pn:return{byteLength:4,components:1};case Qo:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function Wp(i,t,e,n,s,r,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),d=new Lt,u=new WeakMap;let h;const c=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(R,T){return p?new OffscreenCanvas(R,T):Ns("canvas")}function g(R,T,k){let j=1;const K=St(R);if((K.width>k||K.height>k)&&(j=k/Math.max(K.width,K.height)),j<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){const $=Math.floor(j*K.width),xt=Math.floor(j*K.height);h===void 0&&(h=_($,xt));const at=T?_($,xt):h;return at.width=$,at.height=xt,at.getContext("2d").drawImage(R,0,0,$,xt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+$+"x"+xt+")."),at}else return"data"in R&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),R;return R}function f(R){return R.generateMipmaps}function m(R){i.generateMipmap(R)}function v(R){return R.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?i.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function M(R,T,k,j,K=!1){if(R!==null){if(i[R]!==void 0)return i[R];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let $=T;if(T===i.RED&&(k===i.FLOAT&&($=i.R32F),k===i.HALF_FLOAT&&($=i.R16F),k===i.UNSIGNED_BYTE&&($=i.R8)),T===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.R8UI),k===i.UNSIGNED_SHORT&&($=i.R16UI),k===i.UNSIGNED_INT&&($=i.R32UI),k===i.BYTE&&($=i.R8I),k===i.SHORT&&($=i.R16I),k===i.INT&&($=i.R32I)),T===i.RG&&(k===i.FLOAT&&($=i.RG32F),k===i.HALF_FLOAT&&($=i.RG16F),k===i.UNSIGNED_BYTE&&($=i.RG8)),T===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RG8UI),k===i.UNSIGNED_SHORT&&($=i.RG16UI),k===i.UNSIGNED_INT&&($=i.RG32UI),k===i.BYTE&&($=i.RG8I),k===i.SHORT&&($=i.RG16I),k===i.INT&&($=i.RG32I)),T===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RGB8UI),k===i.UNSIGNED_SHORT&&($=i.RGB16UI),k===i.UNSIGNED_INT&&($=i.RGB32UI),k===i.BYTE&&($=i.RGB8I),k===i.SHORT&&($=i.RGB16I),k===i.INT&&($=i.RGB32I)),T===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RGBA8UI),k===i.UNSIGNED_SHORT&&($=i.RGBA16UI),k===i.UNSIGNED_INT&&($=i.RGBA32UI),k===i.BYTE&&($=i.RGBA8I),k===i.SHORT&&($=i.RGBA16I),k===i.INT&&($=i.RGBA32I)),T===i.RGB&&k===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),T===i.RGBA){const xt=K?zs:Vt.getTransfer(j);k===i.FLOAT&&($=i.RGBA32F),k===i.HALF_FLOAT&&($=i.RGBA16F),k===i.UNSIGNED_BYTE&&($=xt===$t?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&t.get("EXT_color_buffer_float"),$}function x(R,T){let k;return R?T===null||T===Qn||T===Ci?k=i.DEPTH24_STENCIL8:T===pn?k=i.DEPTH32F_STENCIL8:T===Yi&&(k=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===Qn||T===Ci?k=i.DEPTH_COMPONENT24:T===pn?k=i.DEPTH_COMPONENT32F:T===Yi&&(k=i.DEPTH_COMPONENT16),k}function y(R,T){return f(R)===!0||R.isFramebufferTexture&&R.minFilter!==Ke&&R.minFilter!==tn?Math.log2(Math.max(T.width,T.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?T.mipmaps.length:1}function S(R){const T=R.target;T.removeEventListener("dispose",S),C(T),T.isVideoTexture&&u.delete(T)}function A(R){const T=R.target;T.removeEventListener("dispose",A),E(T)}function C(R){const T=n.get(R);if(T.__webglInit===void 0)return;const k=R.source,j=c.get(k);if(j){const K=j[T.__cacheKey];K.usedTimes--,K.usedTimes===0&&b(R),Object.keys(j).length===0&&c.delete(k)}n.remove(R)}function b(R){const T=n.get(R);i.deleteTexture(T.__webglTexture);const k=R.source,j=c.get(k);delete j[T.__cacheKey],a.memory.textures--}function E(R){const T=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(T.__webglFramebuffer[j]))for(let K=0;K<T.__webglFramebuffer[j].length;K++)i.deleteFramebuffer(T.__webglFramebuffer[j][K]);else i.deleteFramebuffer(T.__webglFramebuffer[j]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[j])}else{if(Array.isArray(T.__webglFramebuffer))for(let j=0;j<T.__webglFramebuffer.length;j++)i.deleteFramebuffer(T.__webglFramebuffer[j]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let j=0;j<T.__webglColorRenderbuffer.length;j++)T.__webglColorRenderbuffer[j]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[j]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const k=R.textures;for(let j=0,K=k.length;j<K;j++){const $=n.get(k[j]);$.__webglTexture&&(i.deleteTexture($.__webglTexture),a.memory.textures--),n.remove(k[j])}n.remove(R)}let P=0;function H(){P=0}function F(){const R=P;return R>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+s.maxTextures),P+=1,R}function L(R){const T=[];return T.push(R.wrapS),T.push(R.wrapT),T.push(R.wrapR||0),T.push(R.magFilter),T.push(R.minFilter),T.push(R.anisotropy),T.push(R.internalFormat),T.push(R.format),T.push(R.type),T.push(R.generateMipmaps),T.push(R.premultiplyAlpha),T.push(R.flipY),T.push(R.unpackAlignment),T.push(R.colorSpace),T.join()}function W(R,T){const k=n.get(R);if(R.isVideoTexture&&yt(R),R.isRenderTargetTexture===!1&&R.version>0&&k.__version!==R.version){const j=R.image;if(j===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(j.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Y(k,R,T);return}}e.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+T)}function z(R,T){const k=n.get(R);if(R.version>0&&k.__version!==R.version){Y(k,R,T);return}e.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+T)}function q(R,T){const k=n.get(R);if(R.version>0&&k.__version!==R.version){Y(k,R,T);return}e.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+T)}function O(R,T){const k=n.get(R);if(R.version>0&&k.__version!==R.version){Q(k,R,T);return}e.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+T)}const J={[Dr]:i.REPEAT,[Zn]:i.CLAMP_TO_EDGE,[Ir]:i.MIRRORED_REPEAT},nt={[Ke]:i.NEAREST,[Cc]:i.NEAREST_MIPMAP_NEAREST,[ns]:i.NEAREST_MIPMAP_LINEAR,[tn]:i.LINEAR,[Gs]:i.LINEAR_MIPMAP_NEAREST,[Kn]:i.LINEAR_MIPMAP_LINEAR},Mt={[Ic]:i.NEVER,[kc]:i.ALWAYS,[Uc]:i.LESS,[ll]:i.LEQUAL,[Nc]:i.EQUAL,[Oc]:i.GEQUAL,[Fc]:i.GREATER,[zc]:i.NOTEQUAL};function At(R,T){if(T.type===pn&&t.has("OES_texture_float_linear")===!1&&(T.magFilter===tn||T.magFilter===Gs||T.magFilter===ns||T.magFilter===Kn||T.minFilter===tn||T.minFilter===Gs||T.minFilter===ns||T.minFilter===Kn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(R,i.TEXTURE_WRAP_S,J[T.wrapS]),i.texParameteri(R,i.TEXTURE_WRAP_T,J[T.wrapT]),(R===i.TEXTURE_3D||R===i.TEXTURE_2D_ARRAY)&&i.texParameteri(R,i.TEXTURE_WRAP_R,J[T.wrapR]),i.texParameteri(R,i.TEXTURE_MAG_FILTER,nt[T.magFilter]),i.texParameteri(R,i.TEXTURE_MIN_FILTER,nt[T.minFilter]),T.compareFunction&&(i.texParameteri(R,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(R,i.TEXTURE_COMPARE_FUNC,Mt[T.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Ke||T.minFilter!==ns&&T.minFilter!==Kn||T.type===pn&&t.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||n.get(T).__currentAnisotropy){const k=t.get("EXT_texture_filter_anisotropic");i.texParameterf(R,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,s.getMaxAnisotropy())),n.get(T).__currentAnisotropy=T.anisotropy}}}function Gt(R,T){let k=!1;R.__webglInit===void 0&&(R.__webglInit=!0,T.addEventListener("dispose",S));const j=T.source;let K=c.get(j);K===void 0&&(K={},c.set(j,K));const $=L(T);if($!==R.__cacheKey){K[$]===void 0&&(K[$]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,k=!0),K[$].usedTimes++;const xt=K[R.__cacheKey];xt!==void 0&&(K[R.__cacheKey].usedTimes--,xt.usedTimes===0&&b(T)),R.__cacheKey=$,R.__webglTexture=K[$].texture}return k}function Y(R,T,k){let j=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(j=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(j=i.TEXTURE_3D);const K=Gt(R,T),$=T.source;e.bindTexture(j,R.__webglTexture,i.TEXTURE0+k);const xt=n.get($);if($.version!==xt.__version||K===!0){e.activeTexture(i.TEXTURE0+k);const at=Vt.getPrimaries(Vt.workingColorSpace),dt=T.colorSpace===Cn?null:Vt.getPrimaries(T.colorSpace),Ht=T.colorSpace===Cn||at===dt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ht);let tt=g(T.image,!1,s.maxTextureSize);tt=Qt(T,tt);const ht=r.convert(T.format,T.colorSpace),bt=r.convert(T.type);let Et=M(T.internalFormat,ht,bt,T.colorSpace,T.isVideoTexture);At(j,T);let ut;const kt=T.mipmaps,Dt=T.isVideoTexture!==!0,Zt=xt.__version===void 0||K===!0,D=$.dataReady,rt=y(T,tt);if(T.isDepthTexture)Et=x(T.format===Pi,T.type),Zt&&(Dt?e.texStorage2D(i.TEXTURE_2D,1,Et,tt.width,tt.height):e.texImage2D(i.TEXTURE_2D,0,Et,tt.width,tt.height,0,ht,bt,null));else if(T.isDataTexture)if(kt.length>0){Dt&&Zt&&e.texStorage2D(i.TEXTURE_2D,rt,Et,kt[0].width,kt[0].height);for(let X=0,Z=kt.length;X<Z;X++)ut=kt[X],Dt?D&&e.texSubImage2D(i.TEXTURE_2D,X,0,0,ut.width,ut.height,ht,bt,ut.data):e.texImage2D(i.TEXTURE_2D,X,Et,ut.width,ut.height,0,ht,bt,ut.data);T.generateMipmaps=!1}else Dt?(Zt&&e.texStorage2D(i.TEXTURE_2D,rt,Et,tt.width,tt.height),D&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,tt.width,tt.height,ht,bt,tt.data)):e.texImage2D(i.TEXTURE_2D,0,Et,tt.width,tt.height,0,ht,bt,tt.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){Dt&&Zt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,rt,Et,kt[0].width,kt[0].height,tt.depth);for(let X=0,Z=kt.length;X<Z;X++)if(ut=kt[X],T.format!==Ze)if(ht!==null)if(Dt){if(D)if(T.layerUpdates.size>0){const ct=Do(ut.width,ut.height,T.format,T.type);for(const ot of T.layerUpdates){const Rt=ut.data.subarray(ot*ct/ut.data.BYTES_PER_ELEMENT,(ot+1)*ct/ut.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,X,0,0,ot,ut.width,ut.height,1,ht,Rt)}T.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,X,0,0,0,ut.width,ut.height,tt.depth,ht,ut.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,X,Et,ut.width,ut.height,tt.depth,0,ut.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Dt?D&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,X,0,0,0,ut.width,ut.height,tt.depth,ht,bt,ut.data):e.texImage3D(i.TEXTURE_2D_ARRAY,X,Et,ut.width,ut.height,tt.depth,0,ht,bt,ut.data)}else{Dt&&Zt&&e.texStorage2D(i.TEXTURE_2D,rt,Et,kt[0].width,kt[0].height);for(let X=0,Z=kt.length;X<Z;X++)ut=kt[X],T.format!==Ze?ht!==null?Dt?D&&e.compressedTexSubImage2D(i.TEXTURE_2D,X,0,0,ut.width,ut.height,ht,ut.data):e.compressedTexImage2D(i.TEXTURE_2D,X,Et,ut.width,ut.height,0,ut.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Dt?D&&e.texSubImage2D(i.TEXTURE_2D,X,0,0,ut.width,ut.height,ht,bt,ut.data):e.texImage2D(i.TEXTURE_2D,X,Et,ut.width,ut.height,0,ht,bt,ut.data)}else if(T.isDataArrayTexture)if(Dt){if(Zt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,rt,Et,tt.width,tt.height,tt.depth),D)if(T.layerUpdates.size>0){const X=Do(tt.width,tt.height,T.format,T.type);for(const Z of T.layerUpdates){const ct=tt.data.subarray(Z*X/tt.data.BYTES_PER_ELEMENT,(Z+1)*X/tt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Z,tt.width,tt.height,1,ht,bt,ct)}T.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,tt.width,tt.height,tt.depth,ht,bt,tt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Et,tt.width,tt.height,tt.depth,0,ht,bt,tt.data);else if(T.isData3DTexture)Dt?(Zt&&e.texStorage3D(i.TEXTURE_3D,rt,Et,tt.width,tt.height,tt.depth),D&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,tt.width,tt.height,tt.depth,ht,bt,tt.data)):e.texImage3D(i.TEXTURE_3D,0,Et,tt.width,tt.height,tt.depth,0,ht,bt,tt.data);else if(T.isFramebufferTexture){if(Zt)if(Dt)e.texStorage2D(i.TEXTURE_2D,rt,Et,tt.width,tt.height);else{let X=tt.width,Z=tt.height;for(let ct=0;ct<rt;ct++)e.texImage2D(i.TEXTURE_2D,ct,Et,X,Z,0,ht,bt,null),X>>=1,Z>>=1}}else if(kt.length>0){if(Dt&&Zt){const X=St(kt[0]);e.texStorage2D(i.TEXTURE_2D,rt,Et,X.width,X.height)}for(let X=0,Z=kt.length;X<Z;X++)ut=kt[X],Dt?D&&e.texSubImage2D(i.TEXTURE_2D,X,0,0,ht,bt,ut):e.texImage2D(i.TEXTURE_2D,X,Et,ht,bt,ut);T.generateMipmaps=!1}else if(Dt){if(Zt){const X=St(tt);e.texStorage2D(i.TEXTURE_2D,rt,Et,X.width,X.height)}D&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ht,bt,tt)}else e.texImage2D(i.TEXTURE_2D,0,Et,ht,bt,tt);f(T)&&m(j),xt.__version=$.version,T.onUpdate&&T.onUpdate(T)}R.__version=T.version}function Q(R,T,k){if(T.image.length!==6)return;const j=Gt(R,T),K=T.source;e.bindTexture(i.TEXTURE_CUBE_MAP,R.__webglTexture,i.TEXTURE0+k);const $=n.get(K);if(K.version!==$.__version||j===!0){e.activeTexture(i.TEXTURE0+k);const xt=Vt.getPrimaries(Vt.workingColorSpace),at=T.colorSpace===Cn?null:Vt.getPrimaries(T.colorSpace),dt=T.colorSpace===Cn||xt===at?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,dt);const Ht=T.isCompressedTexture||T.image[0].isCompressedTexture,tt=T.image[0]&&T.image[0].isDataTexture,ht=[];for(let Z=0;Z<6;Z++)!Ht&&!tt?ht[Z]=g(T.image[Z],!0,s.maxCubemapSize):ht[Z]=tt?T.image[Z].image:T.image[Z],ht[Z]=Qt(T,ht[Z]);const bt=ht[0],Et=r.convert(T.format,T.colorSpace),ut=r.convert(T.type),kt=M(T.internalFormat,Et,ut,T.colorSpace),Dt=T.isVideoTexture!==!0,Zt=$.__version===void 0||j===!0,D=K.dataReady;let rt=y(T,bt);At(i.TEXTURE_CUBE_MAP,T);let X;if(Ht){Dt&&Zt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,rt,kt,bt.width,bt.height);for(let Z=0;Z<6;Z++){X=ht[Z].mipmaps;for(let ct=0;ct<X.length;ct++){const ot=X[ct];T.format!==Ze?Et!==null?Dt?D&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct,0,0,ot.width,ot.height,Et,ot.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct,kt,ot.width,ot.height,0,ot.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Dt?D&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct,0,0,ot.width,ot.height,Et,ut,ot.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct,kt,ot.width,ot.height,0,Et,ut,ot.data)}}}else{if(X=T.mipmaps,Dt&&Zt){X.length>0&&rt++;const Z=St(ht[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,rt,kt,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(tt){Dt?D&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,ht[Z].width,ht[Z].height,Et,ut,ht[Z].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,kt,ht[Z].width,ht[Z].height,0,Et,ut,ht[Z].data);for(let ct=0;ct<X.length;ct++){const Rt=X[ct].image[Z].image;Dt?D&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct+1,0,0,Rt.width,Rt.height,Et,ut,Rt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct+1,kt,Rt.width,Rt.height,0,Et,ut,Rt.data)}}else{Dt?D&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,Et,ut,ht[Z]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,kt,Et,ut,ht[Z]);for(let ct=0;ct<X.length;ct++){const ot=X[ct];Dt?D&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct+1,0,0,Et,ut,ot.image[Z]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ct+1,kt,Et,ut,ot.image[Z])}}}f(T)&&m(i.TEXTURE_CUBE_MAP),$.__version=K.version,T.onUpdate&&T.onUpdate(T)}R.__version=T.version}function ft(R,T,k,j,K,$){const xt=r.convert(k.format,k.colorSpace),at=r.convert(k.type),dt=M(k.internalFormat,xt,at,k.colorSpace),Ht=n.get(T),tt=n.get(k);if(tt.__renderTarget=T,!Ht.__hasExternalTextures){const ht=Math.max(1,T.width>>$),bt=Math.max(1,T.height>>$);K===i.TEXTURE_3D||K===i.TEXTURE_2D_ARRAY?e.texImage3D(K,$,dt,ht,bt,T.depth,0,xt,at,null):e.texImage2D(K,$,dt,ht,bt,0,xt,at,null)}e.bindFramebuffer(i.FRAMEBUFFER,R),Ot(T)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,j,K,tt.__webglTexture,0,Nt(T)):(K===i.TEXTURE_2D||K>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,j,K,tt.__webglTexture,$),e.bindFramebuffer(i.FRAMEBUFFER,null)}function st(R,T,k){if(i.bindRenderbuffer(i.RENDERBUFFER,R),T.depthBuffer){const j=T.depthTexture,K=j&&j.isDepthTexture?j.type:null,$=x(T.stencilBuffer,K),xt=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,at=Nt(T);Ot(T)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,at,$,T.width,T.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,at,$,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,$,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,xt,i.RENDERBUFFER,R)}else{const j=T.textures;for(let K=0;K<j.length;K++){const $=j[K],xt=r.convert($.format,$.colorSpace),at=r.convert($.type),dt=M($.internalFormat,xt,at,$.colorSpace),Ht=Nt(T);k&&Ot(T)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ht,dt,T.width,T.height):Ot(T)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ht,dt,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,dt,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function _t(R,T){if(T&&T.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(i.FRAMEBUFFER,R),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const j=n.get(T.depthTexture);j.__renderTarget=T,(!j.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),W(T.depthTexture,0);const K=j.__webglTexture,$=Nt(T);if(T.depthTexture.format===Ei)Ot(T)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,K,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,K,0);else if(T.depthTexture.format===Pi)Ot(T)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,K,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,K,0);else throw new Error("Unknown depthTexture format")}function Tt(R){const T=n.get(R),k=R.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==R.depthTexture){const j=R.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),j){const K=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,j.removeEventListener("dispose",K)};j.addEventListener("dispose",K),T.__depthDisposeCallback=K}T.__boundDepthTexture=j}if(R.depthTexture&&!T.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");_t(T.__webglFramebuffer,R)}else if(k){T.__webglDepthbuffer=[];for(let j=0;j<6;j++)if(e.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[j]),T.__webglDepthbuffer[j]===void 0)T.__webglDepthbuffer[j]=i.createRenderbuffer(),st(T.__webglDepthbuffer[j],R,!1);else{const K=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=T.__webglDepthbuffer[j];i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,K,i.RENDERBUFFER,$)}}else if(e.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),st(T.__webglDepthbuffer,R,!1);else{const j=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,K=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,K),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,K)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Ut(R,T,k){const j=n.get(R);T!==void 0&&ft(j.__webglFramebuffer,R,R.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&Tt(R)}function Jt(R){const T=R.texture,k=n.get(R),j=n.get(T);R.addEventListener("dispose",A);const K=R.textures,$=R.isWebGLCubeRenderTarget===!0,xt=K.length>1;if(xt||(j.__webglTexture===void 0&&(j.__webglTexture=i.createTexture()),j.__version=T.version,a.memory.textures++),$){k.__webglFramebuffer=[];for(let at=0;at<6;at++)if(T.mipmaps&&T.mipmaps.length>0){k.__webglFramebuffer[at]=[];for(let dt=0;dt<T.mipmaps.length;dt++)k.__webglFramebuffer[at][dt]=i.createFramebuffer()}else k.__webglFramebuffer[at]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){k.__webglFramebuffer=[];for(let at=0;at<T.mipmaps.length;at++)k.__webglFramebuffer[at]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(xt)for(let at=0,dt=K.length;at<dt;at++){const Ht=n.get(K[at]);Ht.__webglTexture===void 0&&(Ht.__webglTexture=i.createTexture(),a.memory.textures++)}if(R.samples>0&&Ot(R)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let at=0;at<K.length;at++){const dt=K[at];k.__webglColorRenderbuffer[at]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[at]);const Ht=r.convert(dt.format,dt.colorSpace),tt=r.convert(dt.type),ht=M(dt.internalFormat,Ht,tt,dt.colorSpace,R.isXRRenderTarget===!0),bt=Nt(R);i.renderbufferStorageMultisample(i.RENDERBUFFER,bt,ht,R.width,R.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.RENDERBUFFER,k.__webglColorRenderbuffer[at])}i.bindRenderbuffer(i.RENDERBUFFER,null),R.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),st(k.__webglDepthRenderbuffer,R,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if($){e.bindTexture(i.TEXTURE_CUBE_MAP,j.__webglTexture),At(i.TEXTURE_CUBE_MAP,T);for(let at=0;at<6;at++)if(T.mipmaps&&T.mipmaps.length>0)for(let dt=0;dt<T.mipmaps.length;dt++)ft(k.__webglFramebuffer[at][dt],R,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+at,dt);else ft(k.__webglFramebuffer[at],R,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+at,0);f(T)&&m(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(xt){for(let at=0,dt=K.length;at<dt;at++){const Ht=K[at],tt=n.get(Ht);e.bindTexture(i.TEXTURE_2D,tt.__webglTexture),At(i.TEXTURE_2D,Ht),ft(k.__webglFramebuffer,R,Ht,i.COLOR_ATTACHMENT0+at,i.TEXTURE_2D,0),f(Ht)&&m(i.TEXTURE_2D)}e.unbindTexture()}else{let at=i.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(at=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(at,j.__webglTexture),At(at,T),T.mipmaps&&T.mipmaps.length>0)for(let dt=0;dt<T.mipmaps.length;dt++)ft(k.__webglFramebuffer[dt],R,T,i.COLOR_ATTACHMENT0,at,dt);else ft(k.__webglFramebuffer,R,T,i.COLOR_ATTACHMENT0,at,0);f(T)&&m(at),e.unbindTexture()}R.depthBuffer&&Tt(R)}function Ft(R){const T=R.textures;for(let k=0,j=T.length;k<j;k++){const K=T[k];if(f(K)){const $=v(R),xt=n.get(K).__webglTexture;e.bindTexture($,xt),m($),e.unbindTexture()}}}const ne=[],N=[];function we(R){if(R.samples>0){if(Ot(R)===!1){const T=R.textures,k=R.width,j=R.height;let K=i.COLOR_BUFFER_BIT;const $=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,xt=n.get(R),at=T.length>1;if(at)for(let dt=0;dt<T.length;dt++)e.bindFramebuffer(i.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,xt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,xt.__webglMultisampledFramebuffer),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,xt.__webglFramebuffer);for(let dt=0;dt<T.length;dt++){if(R.resolveDepthBuffer&&(R.depthBuffer&&(K|=i.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&(K|=i.STENCIL_BUFFER_BIT)),at){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,xt.__webglColorRenderbuffer[dt]);const Ht=n.get(T[dt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ht,0)}i.blitFramebuffer(0,0,k,j,0,0,k,j,K,i.NEAREST),l===!0&&(ne.length=0,N.length=0,ne.push(i.COLOR_ATTACHMENT0+dt),R.depthBuffer&&R.resolveDepthBuffer===!1&&(ne.push($),N.push($),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,N)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ne))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),at)for(let dt=0;dt<T.length;dt++){e.bindFramebuffer(i.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.RENDERBUFFER,xt.__webglColorRenderbuffer[dt]);const Ht=n.get(T[dt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,xt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.TEXTURE_2D,Ht,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,xt.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&l){const T=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function Nt(R){return Math.min(s.maxSamples,R.samples)}function Ot(R){const T=n.get(R);return R.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function yt(R){const T=a.render.frame;u.get(R)!==T&&(u.set(R,T),R.update())}function Qt(R,T){const k=R.colorSpace,j=R.format,K=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||k!==Di&&k!==Cn&&(Vt.getTransfer(k)===$t?(j!==Ze||K!==vn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),T}function St(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(d.width=R.naturalWidth||R.width,d.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(d.width=R.displayWidth,d.height=R.displayHeight):(d.width=R.width,d.height=R.height),d}this.allocateTextureUnit=F,this.resetTextureUnits=H,this.setTexture2D=W,this.setTexture2DArray=z,this.setTexture3D=q,this.setTextureCube=O,this.rebindTextures=Ut,this.setupRenderTarget=Jt,this.updateRenderTargetMipmap=Ft,this.updateMultisampleRenderTarget=we,this.setupDepthRenderbuffer=Tt,this.setupFrameBufferTexture=ft,this.useMultisampledRTT=Ot}function Xp(i,t){function e(n,s=Cn){let r;const a=Vt.getTransfer(s);if(n===vn)return i.UNSIGNED_BYTE;if(n===pa)return i.UNSIGNED_SHORT_4_4_4_4;if(n===ma)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Qo)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Ko)return i.BYTE;if(n===Jo)return i.SHORT;if(n===Yi)return i.UNSIGNED_SHORT;if(n===fa)return i.INT;if(n===Qn)return i.UNSIGNED_INT;if(n===pn)return i.FLOAT;if(n===$i)return i.HALF_FLOAT;if(n===tl)return i.ALPHA;if(n===el)return i.RGB;if(n===Ze)return i.RGBA;if(n===nl)return i.LUMINANCE;if(n===il)return i.LUMINANCE_ALPHA;if(n===Ei)return i.DEPTH_COMPONENT;if(n===Pi)return i.DEPTH_STENCIL;if(n===sl)return i.RED;if(n===ga)return i.RED_INTEGER;if(n===rl)return i.RG;if(n===_a)return i.RG_INTEGER;if(n===xa)return i.RGBA_INTEGER;if(n===ws||n===As||n===Rs||n===Cs)if(a===$t)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ws)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===As)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Rs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Cs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ws)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===As)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Rs)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Cs)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ur||n===Nr||n===Fr||n===zr)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ur)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Nr)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Fr)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===zr)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Or||n===kr||n===Br)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Or||n===kr)return a===$t?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Br)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Hr||n===Vr||n===Gr||n===Wr||n===Xr||n===qr||n===Yr||n===$r||n===jr||n===Zr||n===Kr||n===Jr||n===Qr||n===ta)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Hr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Vr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Gr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Wr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Xr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===qr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Yr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===$r)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===jr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Zr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Kr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Jr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Qr)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ta)return a===$t?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ps||n===ea||n===na)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Ps)return a===$t?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ea)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===na)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===al||n===ia||n===sa||n===ra)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Ps)return r.COMPRESSED_RED_RGTC1_EXT;if(n===ia)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===sa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ra)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ci?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}class qp extends Ve{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Jn extends xe{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Yp={type:"move"};class _r{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Jn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Jn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new B,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new B),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Jn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new B,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new B),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null;const o=this._targetRay,l=this._grip,d=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(d&&t.hand){a=!0;for(const g of t.hand.values()){const f=e.getJointPose(g,n),m=this._getHandJoint(d,g);f!==null&&(m.matrix.fromArray(f.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=f.radius),m.visible=f!==null}const u=d.joints["index-finger-tip"],h=d.joints["thumb-tip"],c=u.position.distanceTo(h.position),p=.02,_=.005;d.inputState.pinching&&c>p+_?(d.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!d.inputState.pinching&&c<=p-_&&(d.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Yp)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),d!==null&&(d.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Jn;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const $p=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,jp=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Zp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const s=new Ie,r=t.properties.get(s);r.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Nn({vertexShader:$p,fragmentShader:jp,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Le(new Os(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Kp extends ii{constructor(t,e){super();const n=this;let s=null,r=1,a=null,o="local-floor",l=1,d=null,u=null,h=null,c=null,p=null,_=null;const g=new Zp,f=e.getContextAttributes();let m=null,v=null;const M=[],x=[],y=new Lt;let S=null;const A=new Ve;A.viewport=new oe;const C=new Ve;C.viewport=new oe;const b=[A,C],E=new qp;let P=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let Q=M[Y];return Q===void 0&&(Q=new _r,M[Y]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(Y){let Q=M[Y];return Q===void 0&&(Q=new _r,M[Y]=Q),Q.getGripSpace()},this.getHand=function(Y){let Q=M[Y];return Q===void 0&&(Q=new _r,M[Y]=Q),Q.getHandSpace()};function F(Y){const Q=x.indexOf(Y.inputSource);if(Q===-1)return;const ft=M[Q];ft!==void 0&&(ft.update(Y.inputSource,Y.frame,d||a),ft.dispatchEvent({type:Y.type,data:Y.inputSource}))}function L(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",L),s.removeEventListener("inputsourceschange",W);for(let Y=0;Y<M.length;Y++){const Q=x[Y];Q!==null&&(x[Y]=null,M[Y].disconnect(Q))}P=null,H=null,g.reset(),t.setRenderTarget(m),p=null,c=null,h=null,s=null,v=null,Gt.stop(),n.isPresenting=!1,t.setPixelRatio(S),t.setSize(y.width,y.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return d||a},this.setReferenceSpace=function(Y){d=Y},this.getBaseLayer=function(){return c!==null?c:p},this.getBinding=function(){return h},this.getFrame=function(){return _},this.getSession=function(){return s},this.setSession=async function(Y){if(s=Y,s!==null){if(m=t.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",L),s.addEventListener("inputsourceschange",W),f.xrCompatible!==!0&&await e.makeXRCompatible(),S=t.getPixelRatio(),t.getSize(y),s.renderState.layers===void 0){const Q={antialias:f.antialias,alpha:!0,depth:f.depth,stencil:f.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,e,Q),s.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),v=new ti(p.framebufferWidth,p.framebufferHeight,{format:Ze,type:vn,colorSpace:t.outputColorSpace,stencilBuffer:f.stencil})}else{let Q=null,ft=null,st=null;f.depth&&(st=f.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,Q=f.stencil?Pi:Ei,ft=f.stencil?Ci:Qn);const _t={colorFormat:e.RGBA8,depthFormat:st,scaleFactor:r};h=new XRWebGLBinding(s,e),c=h.createProjectionLayer(_t),s.updateRenderState({layers:[c]}),t.setPixelRatio(1),t.setSize(c.textureWidth,c.textureHeight,!1),v=new ti(c.textureWidth,c.textureHeight,{format:Ze,type:vn,depthTexture:new bl(c.textureWidth,c.textureHeight,ft,void 0,void 0,void 0,void 0,void 0,void 0,Q),stencilBuffer:f.stencil,colorSpace:t.outputColorSpace,samples:f.antialias?4:0,resolveDepthBuffer:c.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),d=null,a=await s.requestReferenceSpace(o),Gt.setContext(s),Gt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function W(Y){for(let Q=0;Q<Y.removed.length;Q++){const ft=Y.removed[Q],st=x.indexOf(ft);st>=0&&(x[st]=null,M[st].disconnect(ft))}for(let Q=0;Q<Y.added.length;Q++){const ft=Y.added[Q];let st=x.indexOf(ft);if(st===-1){for(let Tt=0;Tt<M.length;Tt++)if(Tt>=x.length){x.push(ft),st=Tt;break}else if(x[Tt]===null){x[Tt]=ft,st=Tt;break}if(st===-1)break}const _t=M[st];_t&&_t.connect(ft)}}const z=new B,q=new B;function O(Y,Q,ft){z.setFromMatrixPosition(Q.matrixWorld),q.setFromMatrixPosition(ft.matrixWorld);const st=z.distanceTo(q),_t=Q.projectionMatrix.elements,Tt=ft.projectionMatrix.elements,Ut=_t[14]/(_t[10]-1),Jt=_t[14]/(_t[10]+1),Ft=(_t[9]+1)/_t[5],ne=(_t[9]-1)/_t[5],N=(_t[8]-1)/_t[0],we=(Tt[8]+1)/Tt[0],Nt=Ut*N,Ot=Ut*we,yt=st/(-N+we),Qt=yt*-N;if(Q.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Qt),Y.translateZ(yt),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),_t[10]===-1)Y.projectionMatrix.copy(Q.projectionMatrix),Y.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{const St=Ut+yt,R=Jt+yt,T=Nt-Qt,k=Ot+(st-Qt),j=Ft*Jt/R*St,K=ne*Jt/R*St;Y.projectionMatrix.makePerspective(T,k,j,K,St,R),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function J(Y,Q){Q===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(Q.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(s===null)return;let Q=Y.near,ft=Y.far;g.texture!==null&&(g.depthNear>0&&(Q=g.depthNear),g.depthFar>0&&(ft=g.depthFar)),E.near=C.near=A.near=Q,E.far=C.far=A.far=ft,(P!==E.near||H!==E.far)&&(s.updateRenderState({depthNear:E.near,depthFar:E.far}),P=E.near,H=E.far),A.layers.mask=Y.layers.mask|2,C.layers.mask=Y.layers.mask|4,E.layers.mask=A.layers.mask|C.layers.mask;const st=Y.parent,_t=E.cameras;J(E,st);for(let Tt=0;Tt<_t.length;Tt++)J(_t[Tt],st);_t.length===2?O(E,A,C):E.projectionMatrix.copy(A.projectionMatrix),nt(Y,E,st)};function nt(Y,Q,ft){ft===null?Y.matrix.copy(Q.matrixWorld):(Y.matrix.copy(ft.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(Q.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(Q.projectionMatrix),Y.projectionMatrixInverse.copy(Q.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=aa*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return E},this.getFoveation=function(){if(!(c===null&&p===null))return l},this.setFoveation=function(Y){l=Y,c!==null&&(c.fixedFoveation=Y),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=Y)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(E)};let Mt=null;function At(Y,Q){if(u=Q.getViewerPose(d||a),_=Q,u!==null){const ft=u.views;p!==null&&(t.setRenderTargetFramebuffer(v,p.framebuffer),t.setRenderTarget(v));let st=!1;ft.length!==E.cameras.length&&(E.cameras.length=0,st=!0);for(let Tt=0;Tt<ft.length;Tt++){const Ut=ft[Tt];let Jt=null;if(p!==null)Jt=p.getViewport(Ut);else{const ne=h.getViewSubImage(c,Ut);Jt=ne.viewport,Tt===0&&(t.setRenderTargetTextures(v,ne.colorTexture,c.ignoreDepthValues?void 0:ne.depthStencilTexture),t.setRenderTarget(v))}let Ft=b[Tt];Ft===void 0&&(Ft=new Ve,Ft.layers.enable(Tt),Ft.viewport=new oe,b[Tt]=Ft),Ft.matrix.fromArray(Ut.transform.matrix),Ft.matrix.decompose(Ft.position,Ft.quaternion,Ft.scale),Ft.projectionMatrix.fromArray(Ut.projectionMatrix),Ft.projectionMatrixInverse.copy(Ft.projectionMatrix).invert(),Ft.viewport.set(Jt.x,Jt.y,Jt.width,Jt.height),Tt===0&&(E.matrix.copy(Ft.matrix),E.matrix.decompose(E.position,E.quaternion,E.scale)),st===!0&&E.cameras.push(Ft)}const _t=s.enabledFeatures;if(_t&&_t.includes("depth-sensing")){const Tt=h.getDepthInformation(ft[0]);Tt&&Tt.isValid&&Tt.texture&&g.init(t,Tt,s.renderState)}}for(let ft=0;ft<M.length;ft++){const st=x[ft],_t=M[ft];st!==null&&_t!==void 0&&_t.update(st,Q,d||a)}Mt&&Mt(Y,Q),Q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Q}),_=null}const Gt=new Sl;Gt.setAnimationLoop(At),this.setAnimationLoop=function(Y){Mt=Y},this.dispose=function(){}}}const Wn=new sn,Jp=new le;function Qp(i,t){function e(f,m){f.matrixAutoUpdate===!0&&f.updateMatrix(),m.value.copy(f.matrix)}function n(f,m){m.color.getRGB(f.fogColor.value,xl(i)),m.isFog?(f.fogNear.value=m.near,f.fogFar.value=m.far):m.isFogExp2&&(f.fogDensity.value=m.density)}function s(f,m,v,M,x){m.isMeshBasicMaterial||m.isMeshLambertMaterial?r(f,m):m.isMeshToonMaterial?(r(f,m),h(f,m)):m.isMeshPhongMaterial?(r(f,m),u(f,m)):m.isMeshStandardMaterial?(r(f,m),c(f,m),m.isMeshPhysicalMaterial&&p(f,m,x)):m.isMeshMatcapMaterial?(r(f,m),_(f,m)):m.isMeshDepthMaterial?r(f,m):m.isMeshDistanceMaterial?(r(f,m),g(f,m)):m.isMeshNormalMaterial?r(f,m):m.isLineBasicMaterial?(a(f,m),m.isLineDashedMaterial&&o(f,m)):m.isPointsMaterial?l(f,m,v,M):m.isSpriteMaterial?d(f,m):m.isShadowMaterial?(f.color.value.copy(m.color),f.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(f,m){f.opacity.value=m.opacity,m.color&&f.diffuse.value.copy(m.color),m.emissive&&f.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(f.map.value=m.map,e(m.map,f.mapTransform)),m.alphaMap&&(f.alphaMap.value=m.alphaMap,e(m.alphaMap,f.alphaMapTransform)),m.bumpMap&&(f.bumpMap.value=m.bumpMap,e(m.bumpMap,f.bumpMapTransform),f.bumpScale.value=m.bumpScale,m.side===De&&(f.bumpScale.value*=-1)),m.normalMap&&(f.normalMap.value=m.normalMap,e(m.normalMap,f.normalMapTransform),f.normalScale.value.copy(m.normalScale),m.side===De&&f.normalScale.value.negate()),m.displacementMap&&(f.displacementMap.value=m.displacementMap,e(m.displacementMap,f.displacementMapTransform),f.displacementScale.value=m.displacementScale,f.displacementBias.value=m.displacementBias),m.emissiveMap&&(f.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,f.emissiveMapTransform)),m.specularMap&&(f.specularMap.value=m.specularMap,e(m.specularMap,f.specularMapTransform)),m.alphaTest>0&&(f.alphaTest.value=m.alphaTest);const v=t.get(m),M=v.envMap,x=v.envMapRotation;M&&(f.envMap.value=M,Wn.copy(x),Wn.x*=-1,Wn.y*=-1,Wn.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Wn.y*=-1,Wn.z*=-1),f.envMapRotation.value.setFromMatrix4(Jp.makeRotationFromEuler(Wn)),f.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,f.reflectivity.value=m.reflectivity,f.ior.value=m.ior,f.refractionRatio.value=m.refractionRatio),m.lightMap&&(f.lightMap.value=m.lightMap,f.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,f.lightMapTransform)),m.aoMap&&(f.aoMap.value=m.aoMap,f.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,f.aoMapTransform))}function a(f,m){f.diffuse.value.copy(m.color),f.opacity.value=m.opacity,m.map&&(f.map.value=m.map,e(m.map,f.mapTransform))}function o(f,m){f.dashSize.value=m.dashSize,f.totalSize.value=m.dashSize+m.gapSize,f.scale.value=m.scale}function l(f,m,v,M){f.diffuse.value.copy(m.color),f.opacity.value=m.opacity,f.size.value=m.size*v,f.scale.value=M*.5,m.map&&(f.map.value=m.map,e(m.map,f.uvTransform)),m.alphaMap&&(f.alphaMap.value=m.alphaMap,e(m.alphaMap,f.alphaMapTransform)),m.alphaTest>0&&(f.alphaTest.value=m.alphaTest)}function d(f,m){f.diffuse.value.copy(m.color),f.opacity.value=m.opacity,f.rotation.value=m.rotation,m.map&&(f.map.value=m.map,e(m.map,f.mapTransform)),m.alphaMap&&(f.alphaMap.value=m.alphaMap,e(m.alphaMap,f.alphaMapTransform)),m.alphaTest>0&&(f.alphaTest.value=m.alphaTest)}function u(f,m){f.specular.value.copy(m.specular),f.shininess.value=Math.max(m.shininess,1e-4)}function h(f,m){m.gradientMap&&(f.gradientMap.value=m.gradientMap)}function c(f,m){f.metalness.value=m.metalness,m.metalnessMap&&(f.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,f.metalnessMapTransform)),f.roughness.value=m.roughness,m.roughnessMap&&(f.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,f.roughnessMapTransform)),m.envMap&&(f.envMapIntensity.value=m.envMapIntensity)}function p(f,m,v){f.ior.value=m.ior,m.sheen>0&&(f.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),f.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(f.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,f.sheenColorMapTransform)),m.sheenRoughnessMap&&(f.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,f.sheenRoughnessMapTransform))),m.clearcoat>0&&(f.clearcoat.value=m.clearcoat,f.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(f.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,f.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(f.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,f.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(f.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,f.clearcoatNormalMapTransform),f.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===De&&f.clearcoatNormalScale.value.negate())),m.dispersion>0&&(f.dispersion.value=m.dispersion),m.iridescence>0&&(f.iridescence.value=m.iridescence,f.iridescenceIOR.value=m.iridescenceIOR,f.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],f.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(f.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,f.iridescenceMapTransform)),m.iridescenceThicknessMap&&(f.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,f.iridescenceThicknessMapTransform))),m.transmission>0&&(f.transmission.value=m.transmission,f.transmissionSamplerMap.value=v.texture,f.transmissionSamplerSize.value.set(v.width,v.height),m.transmissionMap&&(f.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,f.transmissionMapTransform)),f.thickness.value=m.thickness,m.thicknessMap&&(f.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,f.thicknessMapTransform)),f.attenuationDistance.value=m.attenuationDistance,f.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(f.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(f.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,f.anisotropyMapTransform))),f.specularIntensity.value=m.specularIntensity,f.specularColor.value.copy(m.specularColor),m.specularColorMap&&(f.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,f.specularColorMapTransform)),m.specularIntensityMap&&(f.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,f.specularIntensityMapTransform))}function _(f,m){m.matcap&&(f.matcap.value=m.matcap)}function g(f,m){const v=t.get(m).light;f.referencePosition.value.setFromMatrixPosition(v.matrixWorld),f.nearDistance.value=v.shadow.camera.near,f.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function tm(i,t,e,n){let s={},r={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,M){const x=M.program;n.uniformBlockBinding(v,x)}function d(v,M){let x=s[v.id];x===void 0&&(_(v),x=u(v),s[v.id]=x,v.addEventListener("dispose",f));const y=M.program;n.updateUBOMapping(v,y);const S=t.render.frame;r[v.id]!==S&&(c(v),r[v.id]=S)}function u(v){const M=h();v.__bindingPointIndex=M;const x=i.createBuffer(),y=v.__size,S=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,x),i.bufferData(i.UNIFORM_BUFFER,y,S),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,M,x),x}function h(){for(let v=0;v<o;v++)if(a.indexOf(v)===-1)return a.push(v),v;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function c(v){const M=s[v.id],x=v.uniforms,y=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,M);for(let S=0,A=x.length;S<A;S++){const C=Array.isArray(x[S])?x[S]:[x[S]];for(let b=0,E=C.length;b<E;b++){const P=C[b];if(p(P,S,b,y)===!0){const H=P.__offset,F=Array.isArray(P.value)?P.value:[P.value];let L=0;for(let W=0;W<F.length;W++){const z=F[W],q=g(z);typeof z=="number"||typeof z=="boolean"?(P.__data[0]=z,i.bufferSubData(i.UNIFORM_BUFFER,H+L,P.__data)):z.isMatrix3?(P.__data[0]=z.elements[0],P.__data[1]=z.elements[1],P.__data[2]=z.elements[2],P.__data[3]=0,P.__data[4]=z.elements[3],P.__data[5]=z.elements[4],P.__data[6]=z.elements[5],P.__data[7]=0,P.__data[8]=z.elements[6],P.__data[9]=z.elements[7],P.__data[10]=z.elements[8],P.__data[11]=0):(z.toArray(P.__data,L),L+=q.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,H,P.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(v,M,x,y){const S=v.value,A=M+"_"+x;if(y[A]===void 0)return typeof S=="number"||typeof S=="boolean"?y[A]=S:y[A]=S.clone(),!0;{const C=y[A];if(typeof S=="number"||typeof S=="boolean"){if(C!==S)return y[A]=S,!0}else if(C.equals(S)===!1)return C.copy(S),!0}return!1}function _(v){const M=v.uniforms;let x=0;const y=16;for(let A=0,C=M.length;A<C;A++){const b=Array.isArray(M[A])?M[A]:[M[A]];for(let E=0,P=b.length;E<P;E++){const H=b[E],F=Array.isArray(H.value)?H.value:[H.value];for(let L=0,W=F.length;L<W;L++){const z=F[L],q=g(z),O=x%y,J=O%q.boundary,nt=O+J;x+=J,nt!==0&&y-nt<q.storage&&(x+=y-nt),H.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=x,x+=q.storage}}}const S=x%y;return S>0&&(x+=y-S),v.__size=x,v.__cache={},this}function g(v){const M={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(M.boundary=4,M.storage=4):v.isVector2?(M.boundary=8,M.storage=8):v.isVector3||v.isColor?(M.boundary=16,M.storage=12):v.isVector4?(M.boundary=16,M.storage=16):v.isMatrix3?(M.boundary=48,M.storage=48):v.isMatrix4?(M.boundary=64,M.storage=64):v.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",v),M}function f(v){const M=v.target;M.removeEventListener("dispose",f);const x=a.indexOf(M.__bindingPointIndex);a.splice(x,1),i.deleteBuffer(s[M.id]),delete s[M.id],delete r[M.id]}function m(){for(const v in s)i.deleteBuffer(s[v]);a=[],s={},r={}}return{bind:l,update:d,dispose:m}}class em{constructor(t={}){const{canvas:e=Vc(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:d=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reverseDepthBuffer:c=!1}=t;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=a;const _=new Uint32Array(4),g=new Int32Array(4);let f=null,m=null;const v=[],M=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=He,this.toneMapping=Dn,this.toneMappingExposure=1;const x=this;let y=!1,S=0,A=0,C=null,b=-1,E=null;const P=new oe,H=new oe;let F=null;const L=new Bt(0);let W=0,z=e.width,q=e.height,O=1,J=null,nt=null;const Mt=new oe(0,0,z,q),At=new oe(0,0,z,q);let Gt=!1;const Y=new Ma;let Q=!1,ft=!1;const st=new le,_t=new le,Tt=new B,Ut=new oe,Jt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ft=!1;function ne(){return C===null?O:1}let N=n;function we(w,I){return e.getContext(w,I)}try{const w={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:d,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${ua}`),e.addEventListener("webglcontextlost",Z,!1),e.addEventListener("webglcontextrestored",ct,!1),e.addEventListener("webglcontextcreationerror",ot,!1),N===null){const I="webgl2";if(N=we(I,w),N===null)throw we(I)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(w){throw console.error("THREE.WebGLRenderer: "+w.message),w}let Nt,Ot,yt,Qt,St,R,T,k,j,K,$,xt,at,dt,Ht,tt,ht,bt,Et,ut,kt,Dt,Zt,D;function rt(){Nt=new af(N),Nt.init(),Dt=new Xp(N,Nt),Ot=new Qu(N,Nt,t,Dt),yt=new Vp(N,Nt),Ot.reverseDepthBuffer&&c&&yt.buffers.depth.setReversed(!0),Qt=new cf(N),St=new Ap,R=new Wp(N,Nt,yt,St,Ot,Dt,Qt),T=new ef(x),k=new rf(x),j=new md(N),Zt=new Ku(N,j),K=new of(N,j,Qt,Zt),$=new hf(N,K,j,Qt),Et=new df(N,Ot,R),tt=new tf(St),xt=new wp(x,T,k,Nt,Ot,Zt,tt),at=new Qp(x,St),dt=new Cp,Ht=new Np(Nt),bt=new Zu(x,T,k,yt,$,p,l),ht=new Bp(x,$,Ot),D=new tm(N,Qt,Ot,yt),ut=new Ju(N,Nt,Qt),kt=new lf(N,Nt,Qt),Qt.programs=xt.programs,x.capabilities=Ot,x.extensions=Nt,x.properties=St,x.renderLists=dt,x.shadowMap=ht,x.state=yt,x.info=Qt}rt();const X=new Kp(x,N);this.xr=X,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){const w=Nt.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){const w=Nt.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return O},this.setPixelRatio=function(w){w!==void 0&&(O=w,this.setSize(z,q,!1))},this.getSize=function(w){return w.set(z,q)},this.setSize=function(w,I,V=!0){if(X.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}z=w,q=I,e.width=Math.floor(w*O),e.height=Math.floor(I*O),V===!0&&(e.style.width=w+"px",e.style.height=I+"px"),this.setViewport(0,0,w,I)},this.getDrawingBufferSize=function(w){return w.set(z*O,q*O).floor()},this.setDrawingBufferSize=function(w,I,V){z=w,q=I,O=V,e.width=Math.floor(w*V),e.height=Math.floor(I*V),this.setViewport(0,0,w,I)},this.getCurrentViewport=function(w){return w.copy(P)},this.getViewport=function(w){return w.copy(Mt)},this.setViewport=function(w,I,V,G){w.isVector4?Mt.set(w.x,w.y,w.z,w.w):Mt.set(w,I,V,G),yt.viewport(P.copy(Mt).multiplyScalar(O).round())},this.getScissor=function(w){return w.copy(At)},this.setScissor=function(w,I,V,G){w.isVector4?At.set(w.x,w.y,w.z,w.w):At.set(w,I,V,G),yt.scissor(H.copy(At).multiplyScalar(O).round())},this.getScissorTest=function(){return Gt},this.setScissorTest=function(w){yt.setScissorTest(Gt=w)},this.setOpaqueSort=function(w){J=w},this.setTransparentSort=function(w){nt=w},this.getClearColor=function(w){return w.copy(bt.getClearColor())},this.setClearColor=function(){bt.setClearColor.apply(bt,arguments)},this.getClearAlpha=function(){return bt.getClearAlpha()},this.setClearAlpha=function(){bt.setClearAlpha.apply(bt,arguments)},this.clear=function(w=!0,I=!0,V=!0){let G=0;if(w){let U=!1;if(C!==null){const et=C.texture.format;U=et===xa||et===_a||et===ga}if(U){const et=C.texture.type,lt=et===vn||et===Qn||et===Yi||et===Ci||et===pa||et===ma,pt=bt.getClearColor(),mt=bt.getClearAlpha(),wt=pt.r,Ct=pt.g,gt=pt.b;lt?(_[0]=wt,_[1]=Ct,_[2]=gt,_[3]=mt,N.clearBufferuiv(N.COLOR,0,_)):(g[0]=wt,g[1]=Ct,g[2]=gt,g[3]=mt,N.clearBufferiv(N.COLOR,0,g))}else G|=N.COLOR_BUFFER_BIT}I&&(G|=N.DEPTH_BUFFER_BIT),V&&(G|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),N.clear(G)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",Z,!1),e.removeEventListener("webglcontextrestored",ct,!1),e.removeEventListener("webglcontextcreationerror",ot,!1),dt.dispose(),Ht.dispose(),St.dispose(),T.dispose(),k.dispose(),$.dispose(),Zt.dispose(),D.dispose(),xt.dispose(),X.dispose(),X.removeEventListener("sessionstart",wa),X.removeEventListener("sessionend",Aa),zn.stop()};function Z(w){w.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),y=!0}function ct(){console.log("THREE.WebGLRenderer: Context Restored."),y=!1;const w=Qt.autoReset,I=ht.enabled,V=ht.autoUpdate,G=ht.needsUpdate,U=ht.type;rt(),Qt.autoReset=w,ht.enabled=I,ht.autoUpdate=V,ht.needsUpdate=G,ht.type=U}function ot(w){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function Rt(w){const I=w.target;I.removeEventListener("dispose",Rt),re(I)}function re(w){ve(w),St.remove(w)}function ve(w){const I=St.get(w).programs;I!==void 0&&(I.forEach(function(V){xt.releaseProgram(V)}),w.isShaderMaterial&&xt.releaseShaderCache(w))}this.renderBufferDirect=function(w,I,V,G,U,et){I===null&&(I=Jt);const lt=U.isMesh&&U.matrixWorld.determinant()<0,pt=Dl(w,I,V,G,U);yt.setMaterial(G,lt);let mt=V.index,wt=1;if(G.wireframe===!0){if(mt=K.getWireframeAttribute(V),mt===void 0)return;wt=2}const Ct=V.drawRange,gt=V.attributes.position;let Wt=Ct.start*wt,Kt=(Ct.start+Ct.count)*wt;et!==null&&(Wt=Math.max(Wt,et.start*wt),Kt=Math.min(Kt,(et.start+et.count)*wt)),mt!==null?(Wt=Math.max(Wt,0),Kt=Math.min(Kt,mt.count)):gt!=null&&(Wt=Math.max(Wt,0),Kt=Math.min(Kt,gt.count));const te=Kt-Wt;if(te<0||te===1/0)return;Zt.setup(U,G,pt,V,mt);let Ae,Xt=ut;if(mt!==null&&(Ae=j.get(mt),Xt=kt,Xt.setIndex(Ae)),U.isMesh)G.wireframe===!0?(yt.setLineWidth(G.wireframeLinewidth*ne()),Xt.setMode(N.LINES)):Xt.setMode(N.TRIANGLES);else if(U.isLine){let vt=G.linewidth;vt===void 0&&(vt=1),yt.setLineWidth(vt*ne()),U.isLineSegments?Xt.setMode(N.LINES):U.isLineLoop?Xt.setMode(N.LINE_LOOP):Xt.setMode(N.LINE_STRIP)}else U.isPoints?Xt.setMode(N.POINTS):U.isSprite&&Xt.setMode(N.TRIANGLES);if(U.isBatchedMesh)if(U._multiDrawInstances!==null)Xt.renderMultiDrawInstances(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount,U._multiDrawInstances);else if(Nt.get("WEBGL_multi_draw"))Xt.renderMultiDraw(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount);else{const vt=U._multiDrawStarts,an=U._multiDrawCounts,qt=U._multiDrawCount,We=mt?j.get(mt).bytesPerElement:1,si=St.get(G).currentProgram.getUniforms();for(let Ue=0;Ue<qt;Ue++)si.setValue(N,"_gl_DrawID",Ue),Xt.render(vt[Ue]/We,an[Ue])}else if(U.isInstancedMesh)Xt.renderInstances(Wt,te,U.count);else if(V.isInstancedBufferGeometry){const vt=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,an=Math.min(V.instanceCount,vt);Xt.renderInstances(Wt,te,an)}else Xt.render(Wt,te)};function Yt(w,I,V){w.transparent===!0&&w.side===fn&&w.forceSinglePass===!1?(w.side=De,w.needsUpdate=!0,Qi(w,I,V),w.side=Un,w.needsUpdate=!0,Qi(w,I,V),w.side=fn):Qi(w,I,V)}this.compile=function(w,I,V=null){V===null&&(V=w),m=Ht.get(V),m.init(I),M.push(m),V.traverseVisible(function(U){U.isLight&&U.layers.test(I.layers)&&(m.pushLight(U),U.castShadow&&m.pushShadow(U))}),w!==V&&w.traverseVisible(function(U){U.isLight&&U.layers.test(I.layers)&&(m.pushLight(U),U.castShadow&&m.pushShadow(U))}),m.setupLights();const G=new Set;return w.traverse(function(U){if(!(U.isMesh||U.isPoints||U.isLine||U.isSprite))return;const et=U.material;if(et)if(Array.isArray(et))for(let lt=0;lt<et.length;lt++){const pt=et[lt];Yt(pt,V,U),G.add(pt)}else Yt(et,V,U),G.add(et)}),M.pop(),m=null,G},this.compileAsync=function(w,I,V=null){const G=this.compile(w,I,V);return new Promise(U=>{function et(){if(G.forEach(function(lt){St.get(lt).currentProgram.isReady()&&G.delete(lt)}),G.size===0){U(w);return}setTimeout(et,10)}Nt.get("KHR_parallel_shader_compile")!==null?et():setTimeout(et,10)})};let Ge=null;function rn(w){Ge&&Ge(w)}function wa(){zn.stop()}function Aa(){zn.start()}const zn=new Sl;zn.setAnimationLoop(rn),typeof self<"u"&&zn.setContext(self),this.setAnimationLoop=function(w){Ge=w,X.setAnimationLoop(w),w===null?zn.stop():zn.start()},X.addEventListener("sessionstart",wa),X.addEventListener("sessionend",Aa),this.render=function(w,I){if(I!==void 0&&I.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(y===!0)return;if(w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),I.parent===null&&I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),X.enabled===!0&&X.isPresenting===!0&&(X.cameraAutoUpdate===!0&&X.updateCamera(I),I=X.getCamera()),w.isScene===!0&&w.onBeforeRender(x,w,I,C),m=Ht.get(w,M.length),m.init(I),M.push(m),_t.multiplyMatrices(I.projectionMatrix,I.matrixWorldInverse),Y.setFromProjectionMatrix(_t),ft=this.localClippingEnabled,Q=tt.init(this.clippingPlanes,ft),f=dt.get(w,v.length),f.init(),v.push(f),X.enabled===!0&&X.isPresenting===!0){const et=x.xr.getDepthSensingMesh();et!==null&&Bs(et,I,-1/0,x.sortObjects)}Bs(w,I,0,x.sortObjects),f.finish(),x.sortObjects===!0&&f.sort(J,nt),Ft=X.enabled===!1||X.isPresenting===!1||X.hasDepthSensing()===!1,Ft&&bt.addToRenderList(f,w),this.info.render.frame++,Q===!0&&tt.beginShadows();const V=m.state.shadowsArray;ht.render(V,w,I),Q===!0&&tt.endShadows(),this.info.autoReset===!0&&this.info.reset();const G=f.opaque,U=f.transmissive;if(m.setupLights(),I.isArrayCamera){const et=I.cameras;if(U.length>0)for(let lt=0,pt=et.length;lt<pt;lt++){const mt=et[lt];Ca(G,U,w,mt)}Ft&&bt.render(w);for(let lt=0,pt=et.length;lt<pt;lt++){const mt=et[lt];Ra(f,w,mt,mt.viewport)}}else U.length>0&&Ca(G,U,w,I),Ft&&bt.render(w),Ra(f,w,I);C!==null&&(R.updateMultisampleRenderTarget(C),R.updateRenderTargetMipmap(C)),w.isScene===!0&&w.onAfterRender(x,w,I),Zt.resetDefaultState(),b=-1,E=null,M.pop(),M.length>0?(m=M[M.length-1],Q===!0&&tt.setGlobalState(x.clippingPlanes,m.state.camera)):m=null,v.pop(),v.length>0?f=v[v.length-1]:f=null};function Bs(w,I,V,G){if(w.visible===!1)return;if(w.layers.test(I.layers)){if(w.isGroup)V=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(I);else if(w.isLight)m.pushLight(w),w.castShadow&&m.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||Y.intersectsSprite(w)){G&&Ut.setFromMatrixPosition(w.matrixWorld).applyMatrix4(_t);const lt=$.update(w),pt=w.material;pt.visible&&f.push(w,lt,pt,V,Ut.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||Y.intersectsObject(w))){const lt=$.update(w),pt=w.material;if(G&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),Ut.copy(w.boundingSphere.center)):(lt.boundingSphere===null&&lt.computeBoundingSphere(),Ut.copy(lt.boundingSphere.center)),Ut.applyMatrix4(w.matrixWorld).applyMatrix4(_t)),Array.isArray(pt)){const mt=lt.groups;for(let wt=0,Ct=mt.length;wt<Ct;wt++){const gt=mt[wt],Wt=pt[gt.materialIndex];Wt&&Wt.visible&&f.push(w,lt,Wt,V,Ut.z,gt)}}else pt.visible&&f.push(w,lt,pt,V,Ut.z,null)}}const et=w.children;for(let lt=0,pt=et.length;lt<pt;lt++)Bs(et[lt],I,V,G)}function Ra(w,I,V,G){const U=w.opaque,et=w.transmissive,lt=w.transparent;m.setupLightsView(V),Q===!0&&tt.setGlobalState(x.clippingPlanes,V),G&&yt.viewport(P.copy(G)),U.length>0&&Ji(U,I,V),et.length>0&&Ji(et,I,V),lt.length>0&&Ji(lt,I,V),yt.buffers.depth.setTest(!0),yt.buffers.depth.setMask(!0),yt.buffers.color.setMask(!0),yt.setPolygonOffset(!1)}function Ca(w,I,V,G){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[G.id]===void 0&&(m.state.transmissionRenderTarget[G.id]=new ti(1,1,{generateMipmaps:!0,type:Nt.has("EXT_color_buffer_half_float")||Nt.has("EXT_color_buffer_float")?$i:vn,minFilter:Kn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Vt.workingColorSpace}));const et=m.state.transmissionRenderTarget[G.id],lt=G.viewport||P;et.setSize(lt.z,lt.w);const pt=x.getRenderTarget();x.setRenderTarget(et),x.getClearColor(L),W=x.getClearAlpha(),W<1&&x.setClearColor(16777215,.5),x.clear(),Ft&&bt.render(V);const mt=x.toneMapping;x.toneMapping=Dn;const wt=G.viewport;if(G.viewport!==void 0&&(G.viewport=void 0),m.setupLightsView(G),Q===!0&&tt.setGlobalState(x.clippingPlanes,G),Ji(w,V,G),R.updateMultisampleRenderTarget(et),R.updateRenderTargetMipmap(et),Nt.has("WEBGL_multisampled_render_to_texture")===!1){let Ct=!1;for(let gt=0,Wt=I.length;gt<Wt;gt++){const Kt=I[gt],te=Kt.object,Ae=Kt.geometry,Xt=Kt.material,vt=Kt.group;if(Xt.side===fn&&te.layers.test(G.layers)){const an=Xt.side;Xt.side=De,Xt.needsUpdate=!0,Pa(te,V,G,Ae,Xt,vt),Xt.side=an,Xt.needsUpdate=!0,Ct=!0}}Ct===!0&&(R.updateMultisampleRenderTarget(et),R.updateRenderTargetMipmap(et))}x.setRenderTarget(pt),x.setClearColor(L,W),wt!==void 0&&(G.viewport=wt),x.toneMapping=mt}function Ji(w,I,V){const G=I.isScene===!0?I.overrideMaterial:null;for(let U=0,et=w.length;U<et;U++){const lt=w[U],pt=lt.object,mt=lt.geometry,wt=G===null?lt.material:G,Ct=lt.group;pt.layers.test(V.layers)&&Pa(pt,I,V,mt,wt,Ct)}}function Pa(w,I,V,G,U,et){w.onBeforeRender(x,I,V,G,U,et),w.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),U.onBeforeRender(x,I,V,G,w,et),U.transparent===!0&&U.side===fn&&U.forceSinglePass===!1?(U.side=De,U.needsUpdate=!0,x.renderBufferDirect(V,I,G,U,w,et),U.side=Un,U.needsUpdate=!0,x.renderBufferDirect(V,I,G,U,w,et),U.side=fn):x.renderBufferDirect(V,I,G,U,w,et),w.onAfterRender(x,I,V,G,U,et)}function Qi(w,I,V){I.isScene!==!0&&(I=Jt);const G=St.get(w),U=m.state.lights,et=m.state.shadowsArray,lt=U.state.version,pt=xt.getParameters(w,U.state,et,I,V),mt=xt.getProgramCacheKey(pt);let wt=G.programs;G.environment=w.isMeshStandardMaterial?I.environment:null,G.fog=I.fog,G.envMap=(w.isMeshStandardMaterial?k:T).get(w.envMap||G.environment),G.envMapRotation=G.environment!==null&&w.envMap===null?I.environmentRotation:w.envMapRotation,wt===void 0&&(w.addEventListener("dispose",Rt),wt=new Map,G.programs=wt);let Ct=wt.get(mt);if(Ct!==void 0){if(G.currentProgram===Ct&&G.lightsStateVersion===lt)return Da(w,pt),Ct}else pt.uniforms=xt.getUniforms(w),w.onBeforeCompile(pt,x),Ct=xt.acquireProgram(pt,mt),wt.set(mt,Ct),G.uniforms=pt.uniforms;const gt=G.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(gt.clippingPlanes=tt.uniform),Da(w,pt),G.needsLights=Ul(w),G.lightsStateVersion=lt,G.needsLights&&(gt.ambientLightColor.value=U.state.ambient,gt.lightProbe.value=U.state.probe,gt.directionalLights.value=U.state.directional,gt.directionalLightShadows.value=U.state.directionalShadow,gt.spotLights.value=U.state.spot,gt.spotLightShadows.value=U.state.spotShadow,gt.rectAreaLights.value=U.state.rectArea,gt.ltc_1.value=U.state.rectAreaLTC1,gt.ltc_2.value=U.state.rectAreaLTC2,gt.pointLights.value=U.state.point,gt.pointLightShadows.value=U.state.pointShadow,gt.hemisphereLights.value=U.state.hemi,gt.directionalShadowMap.value=U.state.directionalShadowMap,gt.directionalShadowMatrix.value=U.state.directionalShadowMatrix,gt.spotShadowMap.value=U.state.spotShadowMap,gt.spotLightMatrix.value=U.state.spotLightMatrix,gt.spotLightMap.value=U.state.spotLightMap,gt.pointShadowMap.value=U.state.pointShadowMap,gt.pointShadowMatrix.value=U.state.pointShadowMatrix),G.currentProgram=Ct,G.uniformsList=null,Ct}function La(w){if(w.uniformsList===null){const I=w.currentProgram.getUniforms();w.uniformsList=Ds.seqWithValue(I.seq,w.uniforms)}return w.uniformsList}function Da(w,I){const V=St.get(w);V.outputColorSpace=I.outputColorSpace,V.batching=I.batching,V.batchingColor=I.batchingColor,V.instancing=I.instancing,V.instancingColor=I.instancingColor,V.instancingMorph=I.instancingMorph,V.skinning=I.skinning,V.morphTargets=I.morphTargets,V.morphNormals=I.morphNormals,V.morphColors=I.morphColors,V.morphTargetsCount=I.morphTargetsCount,V.numClippingPlanes=I.numClippingPlanes,V.numIntersection=I.numClipIntersection,V.vertexAlphas=I.vertexAlphas,V.vertexTangents=I.vertexTangents,V.toneMapping=I.toneMapping}function Dl(w,I,V,G,U){I.isScene!==!0&&(I=Jt),R.resetTextureUnits();const et=I.fog,lt=G.isMeshStandardMaterial?I.environment:null,pt=C===null?x.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:Di,mt=(G.isMeshStandardMaterial?k:T).get(G.envMap||lt),wt=G.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,Ct=!!V.attributes.tangent&&(!!G.normalMap||G.anisotropy>0),gt=!!V.morphAttributes.position,Wt=!!V.morphAttributes.normal,Kt=!!V.morphAttributes.color;let te=Dn;G.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(te=x.toneMapping);const Ae=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,Xt=Ae!==void 0?Ae.length:0,vt=St.get(G),an=m.state.lights;if(Q===!0&&(ft===!0||w!==E)){const ke=w===E&&G.id===b;tt.setState(G,w,ke)}let qt=!1;G.version===vt.__version?(vt.needsLights&&vt.lightsStateVersion!==an.state.version||vt.outputColorSpace!==pt||U.isBatchedMesh&&vt.batching===!1||!U.isBatchedMesh&&vt.batching===!0||U.isBatchedMesh&&vt.batchingColor===!0&&U.colorTexture===null||U.isBatchedMesh&&vt.batchingColor===!1&&U.colorTexture!==null||U.isInstancedMesh&&vt.instancing===!1||!U.isInstancedMesh&&vt.instancing===!0||U.isSkinnedMesh&&vt.skinning===!1||!U.isSkinnedMesh&&vt.skinning===!0||U.isInstancedMesh&&vt.instancingColor===!0&&U.instanceColor===null||U.isInstancedMesh&&vt.instancingColor===!1&&U.instanceColor!==null||U.isInstancedMesh&&vt.instancingMorph===!0&&U.morphTexture===null||U.isInstancedMesh&&vt.instancingMorph===!1&&U.morphTexture!==null||vt.envMap!==mt||G.fog===!0&&vt.fog!==et||vt.numClippingPlanes!==void 0&&(vt.numClippingPlanes!==tt.numPlanes||vt.numIntersection!==tt.numIntersection)||vt.vertexAlphas!==wt||vt.vertexTangents!==Ct||vt.morphTargets!==gt||vt.morphNormals!==Wt||vt.morphColors!==Kt||vt.toneMapping!==te||vt.morphTargetsCount!==Xt)&&(qt=!0):(qt=!0,vt.__version=G.version);let We=vt.currentProgram;qt===!0&&(We=Qi(G,I,U));let si=!1,Ue=!1,Ui=!1;const ee=We.getUniforms(),Je=vt.uniforms;if(yt.useProgram(We.program)&&(si=!0,Ue=!0,Ui=!0),G.id!==b&&(b=G.id,Ue=!0),si||E!==w){yt.buffers.depth.getReversed()?(st.copy(w.projectionMatrix),Wc(st),Xc(st),ee.setValue(N,"projectionMatrix",st)):ee.setValue(N,"projectionMatrix",w.projectionMatrix),ee.setValue(N,"viewMatrix",w.matrixWorldInverse);const Mn=ee.map.cameraPosition;Mn!==void 0&&Mn.setValue(N,Tt.setFromMatrixPosition(w.matrixWorld)),Ot.logarithmicDepthBuffer&&ee.setValue(N,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),(G.isMeshPhongMaterial||G.isMeshToonMaterial||G.isMeshLambertMaterial||G.isMeshBasicMaterial||G.isMeshStandardMaterial||G.isShaderMaterial)&&ee.setValue(N,"isOrthographic",w.isOrthographicCamera===!0),E!==w&&(E=w,Ue=!0,Ui=!0)}if(U.isSkinnedMesh){ee.setOptional(N,U,"bindMatrix"),ee.setOptional(N,U,"bindMatrixInverse");const ke=U.skeleton;ke&&(ke.boneTexture===null&&ke.computeBoneTexture(),ee.setValue(N,"boneTexture",ke.boneTexture,R))}U.isBatchedMesh&&(ee.setOptional(N,U,"batchingTexture"),ee.setValue(N,"batchingTexture",U._matricesTexture,R),ee.setOptional(N,U,"batchingIdTexture"),ee.setValue(N,"batchingIdTexture",U._indirectTexture,R),ee.setOptional(N,U,"batchingColorTexture"),U._colorsTexture!==null&&ee.setValue(N,"batchingColorTexture",U._colorsTexture,R));const Ni=V.morphAttributes;if((Ni.position!==void 0||Ni.normal!==void 0||Ni.color!==void 0)&&Et.update(U,V,We),(Ue||vt.receiveShadow!==U.receiveShadow)&&(vt.receiveShadow=U.receiveShadow,ee.setValue(N,"receiveShadow",U.receiveShadow)),G.isMeshGouraudMaterial&&G.envMap!==null&&(Je.envMap.value=mt,Je.flipEnvMap.value=mt.isCubeTexture&&mt.isRenderTargetTexture===!1?-1:1),G.isMeshStandardMaterial&&G.envMap===null&&I.environment!==null&&(Je.envMapIntensity.value=I.environmentIntensity),Ue&&(ee.setValue(N,"toneMappingExposure",x.toneMappingExposure),vt.needsLights&&Il(Je,Ui),et&&G.fog===!0&&at.refreshFogUniforms(Je,et),at.refreshMaterialUniforms(Je,G,O,q,m.state.transmissionRenderTarget[w.id]),Ds.upload(N,La(vt),Je,R)),G.isShaderMaterial&&G.uniformsNeedUpdate===!0&&(Ds.upload(N,La(vt),Je,R),G.uniformsNeedUpdate=!1),G.isSpriteMaterial&&ee.setValue(N,"center",U.center),ee.setValue(N,"modelViewMatrix",U.modelViewMatrix),ee.setValue(N,"normalMatrix",U.normalMatrix),ee.setValue(N,"modelMatrix",U.matrixWorld),G.isShaderMaterial||G.isRawShaderMaterial){const ke=G.uniformsGroups;for(let Mn=0,Sn=ke.length;Mn<Sn;Mn++){const Ia=ke[Mn];D.update(Ia,We),D.bind(Ia,We)}}return We}function Il(w,I){w.ambientLightColor.needsUpdate=I,w.lightProbe.needsUpdate=I,w.directionalLights.needsUpdate=I,w.directionalLightShadows.needsUpdate=I,w.pointLights.needsUpdate=I,w.pointLightShadows.needsUpdate=I,w.spotLights.needsUpdate=I,w.spotLightShadows.needsUpdate=I,w.rectAreaLights.needsUpdate=I,w.hemisphereLights.needsUpdate=I}function Ul(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(w,I,V){St.get(w.texture).__webglTexture=I,St.get(w.depthTexture).__webglTexture=V;const G=St.get(w);G.__hasExternalTextures=!0,G.__autoAllocateDepthBuffer=V===void 0,G.__autoAllocateDepthBuffer||Nt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),G.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(w,I){const V=St.get(w);V.__webglFramebuffer=I,V.__useDefaultFramebuffer=I===void 0},this.setRenderTarget=function(w,I=0,V=0){C=w,S=I,A=V;let G=!0,U=null,et=!1,lt=!1;if(w){const mt=St.get(w);if(mt.__useDefaultFramebuffer!==void 0)yt.bindFramebuffer(N.FRAMEBUFFER,null),G=!1;else if(mt.__webglFramebuffer===void 0)R.setupRenderTarget(w);else if(mt.__hasExternalTextures)R.rebindTextures(w,St.get(w.texture).__webglTexture,St.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){const gt=w.depthTexture;if(mt.__boundDepthTexture!==gt){if(gt!==null&&St.has(gt)&&(w.width!==gt.image.width||w.height!==gt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");R.setupDepthRenderbuffer(w)}}const wt=w.texture;(wt.isData3DTexture||wt.isDataArrayTexture||wt.isCompressedArrayTexture)&&(lt=!0);const Ct=St.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray(Ct[I])?U=Ct[I][V]:U=Ct[I],et=!0):w.samples>0&&R.useMultisampledRTT(w)===!1?U=St.get(w).__webglMultisampledFramebuffer:Array.isArray(Ct)?U=Ct[V]:U=Ct,P.copy(w.viewport),H.copy(w.scissor),F=w.scissorTest}else P.copy(Mt).multiplyScalar(O).floor(),H.copy(At).multiplyScalar(O).floor(),F=Gt;if(yt.bindFramebuffer(N.FRAMEBUFFER,U)&&G&&yt.drawBuffers(w,U),yt.viewport(P),yt.scissor(H),yt.setScissorTest(F),et){const mt=St.get(w.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+I,mt.__webglTexture,V)}else if(lt){const mt=St.get(w.texture),wt=I||0;N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,mt.__webglTexture,V||0,wt)}b=-1},this.readRenderTargetPixels=function(w,I,V,G,U,et,lt){if(!(w&&w.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let pt=St.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&lt!==void 0&&(pt=pt[lt]),pt){yt.bindFramebuffer(N.FRAMEBUFFER,pt);try{const mt=w.texture,wt=mt.format,Ct=mt.type;if(!Ot.textureFormatReadable(wt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ot.textureTypeReadable(Ct)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}I>=0&&I<=w.width-G&&V>=0&&V<=w.height-U&&N.readPixels(I,V,G,U,Dt.convert(wt),Dt.convert(Ct),et)}finally{const mt=C!==null?St.get(C).__webglFramebuffer:null;yt.bindFramebuffer(N.FRAMEBUFFER,mt)}}},this.readRenderTargetPixelsAsync=async function(w,I,V,G,U,et,lt){if(!(w&&w.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let pt=St.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&lt!==void 0&&(pt=pt[lt]),pt){const mt=w.texture,wt=mt.format,Ct=mt.type;if(!Ot.textureFormatReadable(wt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ot.textureTypeReadable(Ct))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(I>=0&&I<=w.width-G&&V>=0&&V<=w.height-U){yt.bindFramebuffer(N.FRAMEBUFFER,pt);const gt=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,gt),N.bufferData(N.PIXEL_PACK_BUFFER,et.byteLength,N.STREAM_READ),N.readPixels(I,V,G,U,Dt.convert(wt),Dt.convert(Ct),0);const Wt=C!==null?St.get(C).__webglFramebuffer:null;yt.bindFramebuffer(N.FRAMEBUFFER,Wt);const Kt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await Gc(N,Kt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,gt),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,et),N.deleteBuffer(gt),N.deleteSync(Kt),et}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(w,I=null,V=0){w.isTexture!==!0&&(Gi("WebGLRenderer: copyFramebufferToTexture function signature has changed."),I=arguments[0]||null,w=arguments[1]);const G=Math.pow(2,-V),U=Math.floor(w.image.width*G),et=Math.floor(w.image.height*G),lt=I!==null?I.x:0,pt=I!==null?I.y:0;R.setTexture2D(w,0),N.copyTexSubImage2D(N.TEXTURE_2D,V,0,0,lt,pt,U,et),yt.unbindTexture()},this.copyTextureToTexture=function(w,I,V=null,G=null,U=0){w.isTexture!==!0&&(Gi("WebGLRenderer: copyTextureToTexture function signature has changed."),G=arguments[0]||null,w=arguments[1],I=arguments[2],U=arguments[3]||0,V=null);let et,lt,pt,mt,wt,Ct,gt,Wt,Kt;const te=w.isCompressedTexture?w.mipmaps[U]:w.image;V!==null?(et=V.max.x-V.min.x,lt=V.max.y-V.min.y,pt=V.isBox3?V.max.z-V.min.z:1,mt=V.min.x,wt=V.min.y,Ct=V.isBox3?V.min.z:0):(et=te.width,lt=te.height,pt=te.depth||1,mt=0,wt=0,Ct=0),G!==null?(gt=G.x,Wt=G.y,Kt=G.z):(gt=0,Wt=0,Kt=0);const Ae=Dt.convert(I.format),Xt=Dt.convert(I.type);let vt;I.isData3DTexture?(R.setTexture3D(I,0),vt=N.TEXTURE_3D):I.isDataArrayTexture||I.isCompressedArrayTexture?(R.setTexture2DArray(I,0),vt=N.TEXTURE_2D_ARRAY):(R.setTexture2D(I,0),vt=N.TEXTURE_2D),N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,I.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,I.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,I.unpackAlignment);const an=N.getParameter(N.UNPACK_ROW_LENGTH),qt=N.getParameter(N.UNPACK_IMAGE_HEIGHT),We=N.getParameter(N.UNPACK_SKIP_PIXELS),si=N.getParameter(N.UNPACK_SKIP_ROWS),Ue=N.getParameter(N.UNPACK_SKIP_IMAGES);N.pixelStorei(N.UNPACK_ROW_LENGTH,te.width),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,te.height),N.pixelStorei(N.UNPACK_SKIP_PIXELS,mt),N.pixelStorei(N.UNPACK_SKIP_ROWS,wt),N.pixelStorei(N.UNPACK_SKIP_IMAGES,Ct);const Ui=w.isDataArrayTexture||w.isData3DTexture,ee=I.isDataArrayTexture||I.isData3DTexture;if(w.isRenderTargetTexture||w.isDepthTexture){const Je=St.get(w),Ni=St.get(I),ke=St.get(Je.__renderTarget),Mn=St.get(Ni.__renderTarget);yt.bindFramebuffer(N.READ_FRAMEBUFFER,ke.__webglFramebuffer),yt.bindFramebuffer(N.DRAW_FRAMEBUFFER,Mn.__webglFramebuffer);for(let Sn=0;Sn<pt;Sn++)Ui&&N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,St.get(w).__webglTexture,U,Ct+Sn),w.isDepthTexture?(ee&&N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,St.get(I).__webglTexture,U,Kt+Sn),N.blitFramebuffer(mt,wt,et,lt,gt,Wt,et,lt,N.DEPTH_BUFFER_BIT,N.NEAREST)):ee?N.copyTexSubImage3D(vt,U,gt,Wt,Kt+Sn,mt,wt,et,lt):N.copyTexSubImage2D(vt,U,gt,Wt,Kt+Sn,mt,wt,et,lt);yt.bindFramebuffer(N.READ_FRAMEBUFFER,null),yt.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else ee?w.isDataTexture||w.isData3DTexture?N.texSubImage3D(vt,U,gt,Wt,Kt,et,lt,pt,Ae,Xt,te.data):I.isCompressedArrayTexture?N.compressedTexSubImage3D(vt,U,gt,Wt,Kt,et,lt,pt,Ae,te.data):N.texSubImage3D(vt,U,gt,Wt,Kt,et,lt,pt,Ae,Xt,te):w.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,U,gt,Wt,et,lt,Ae,Xt,te.data):w.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,U,gt,Wt,te.width,te.height,Ae,te.data):N.texSubImage2D(N.TEXTURE_2D,U,gt,Wt,et,lt,Ae,Xt,te);N.pixelStorei(N.UNPACK_ROW_LENGTH,an),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,qt),N.pixelStorei(N.UNPACK_SKIP_PIXELS,We),N.pixelStorei(N.UNPACK_SKIP_ROWS,si),N.pixelStorei(N.UNPACK_SKIP_IMAGES,Ue),U===0&&I.generateMipmaps&&N.generateMipmap(vt),yt.unbindTexture()},this.copyTextureToTexture3D=function(w,I,V=null,G=null,U=0){return w.isTexture!==!0&&(Gi("WebGLRenderer: copyTextureToTexture3D function signature has changed."),V=arguments[0]||null,G=arguments[1]||null,w=arguments[2],I=arguments[3],U=arguments[4]||0),Gi('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(w,I,V,G,U)},this.initRenderTarget=function(w){St.get(w).__webglFramebuffer===void 0&&R.setupRenderTarget(w)},this.initTexture=function(w){w.isCubeTexture?R.setTextureCube(w,0):w.isData3DTexture?R.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?R.setTexture2DArray(w,0):R.setTexture2D(w,0),yt.unbindTexture()},this.resetState=function(){S=0,A=0,C=null,yt.reset(),Zt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=Vt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Vt._getUnpackColorSpace()}}class ya{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new Bt(t),this.near=e,this.far=n}clone(){return new ya(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class nm extends xe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new sn,this.environmentIntensity=1,this.environmentRotation=new sn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class ae extends Ki{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Bt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Bt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ol,this.normalScale=new Lt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new sn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class ba extends xe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Bt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class im extends ba{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(xe.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Bt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const xr=new le,Io=new B,Uo=new B;class sm{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Lt(512,512),this.map=null,this.mapPass=null,this.matrix=new le,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ma,this._frameExtents=new Lt(1,1),this._viewportCount=1,this._viewports=[new oe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Io.setFromMatrixPosition(t.matrixWorld),e.position.copy(Io),Uo.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Uo),e.updateMatrixWorld(),xr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(xr),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(xr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class rm extends sm{constructor(){super(new yl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class am extends ba{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(xe.DEFAULT_UP),this.updateMatrix(),this.target=new xe,this.shadow=new rm}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class om extends ba{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class No{constructor(t=1,e=0,n=0){return this.radius=t,this.phi=e,this.theta=n,this}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(be(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class lm extends ii{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ua}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ua);const Fo={type:"change"},Ea={type:"start"},Rl={type:"end"},bs=new ul,zo=new Rn,cm=Math.cos(70*Hc.DEG2RAD),he=new B,Ce=2*Math.PI,jt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},vr=1e-6;class dm extends lm{constructor(t,e=null){super(t,e),this.state=jt.NONE,this.enabled=!0,this.target=new B,this.cursor=new B,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:yi.ROTATE,MIDDLE:yi.DOLLY,RIGHT:yi.PAN},this.touches={ONE:Mi.ROTATE,TWO:Mi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new B,this._lastQuaternion=new ei,this._lastTargetPosition=new B,this._quat=new ei().setFromUnitVectors(t.up,new B(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new No,this._sphericalDelta=new No,this._scale=1,this._panOffset=new B,this._rotateStart=new Lt,this._rotateEnd=new Lt,this._rotateDelta=new Lt,this._panStart=new Lt,this._panEnd=new Lt,this._panDelta=new Lt,this._dollyStart=new Lt,this._dollyEnd=new Lt,this._dollyDelta=new Lt,this._dollyDirection=new B,this._mouse=new Lt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=um.bind(this),this._onPointerDown=hm.bind(this),this._onPointerUp=fm.bind(this),this._onContextMenu=Mm.bind(this),this._onMouseWheel=gm.bind(this),this._onKeyDown=_m.bind(this),this._onTouchStart=xm.bind(this),this._onTouchMove=vm.bind(this),this._onMouseDown=pm.bind(this),this._onMouseMove=mm.bind(this),this._interceptControlDown=Sm.bind(this),this._interceptControlUp=ym.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Fo),this.update(),this.state=jt.NONE}update(t=null){const e=this.object.position;he.copy(e).sub(this.target),he.applyQuaternion(this._quat),this._spherical.setFromVector3(he),this.autoRotate&&this.state===jt.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Ce:n>Math.PI&&(n-=Ce),s<-Math.PI?s+=Ce:s>Math.PI&&(s-=Ce),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(he.setFromSpherical(this._spherical),he.applyQuaternion(this._quatInverse),e.copy(this.target).add(he),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){const o=he.length();a=this._clampDistance(o*this._scale);const l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const o=new B(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const d=new B(this._mouse.x,this._mouse.y,0);d.unproject(this.object),this.object.position.sub(d).add(o),this.object.updateMatrixWorld(),a=he.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(bs.origin.copy(this.object.position),bs.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(bs.direction))<cm?this.object.lookAt(this.target):(zo.setFromNormalAndCoplanarPoint(this.object.up,this.target),bs.intersectPlane(zo,this.target))))}else if(this.object.isOrthographicCamera){const a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>vr||8*(1-this._lastQuaternion.dot(this.object.quaternion))>vr||this._lastTargetPosition.distanceToSquared(this.target)>vr?(this.dispatchEvent(Fo),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Ce/60*this.autoRotateSpeed*t:Ce/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){he.setFromMatrixColumn(e,0),he.multiplyScalar(-t),this._panOffset.add(he)}_panUp(t,e){this.screenSpacePanning===!0?he.setFromMatrixColumn(e,1):(he.setFromMatrixColumn(e,0),he.crossVectors(this.object.up,he)),he.multiplyScalar(t),this._panOffset.add(he)}_pan(t,e){const n=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;he.copy(s).sub(this.target);let r=he.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ce*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ce*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateUp(Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateUp(-Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateLeft(Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateLeft(-Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ce*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ce*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new Lt,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function hm(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function um(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function fm(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Rl),this.state=jt.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function pm(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case yi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=jt.DOLLY;break;case yi.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=jt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=jt.ROTATE}break;case yi.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=jt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=jt.PAN}break;default:this.state=jt.NONE}this.state!==jt.NONE&&this.dispatchEvent(Ea)}function mm(i){switch(this.state){case jt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case jt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case jt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function gm(i){this.enabled===!1||this.enableZoom===!1||this.state!==jt.NONE||(i.preventDefault(),this.dispatchEvent(Ea),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Rl))}function _m(i){this.enabled===!1||this.enablePan===!1||this._handleKeyDown(i)}function xm(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Mi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=jt.TOUCH_ROTATE;break;case Mi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=jt.TOUCH_PAN;break;default:this.state=jt.NONE}break;case 2:switch(this.touches.TWO){case Mi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=jt.TOUCH_DOLLY_PAN;break;case Mi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=jt.TOUCH_DOLLY_ROTATE;break;default:this.state=jt.NONE}break;default:this.state=jt.NONE}this.state!==jt.NONE&&this.dispatchEvent(Ea)}function vm(i){switch(this._trackPointer(i),this.state){case jt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case jt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case jt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case jt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=jt.NONE}}function Mm(i){this.enabled!==!1&&i.preventDefault()}function Sm(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function ym(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Cl(i){const t=i.replace("#",""),e=parseInt(t.length===3?t.split("").map(n=>n+n).join(""):t,16);return[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]}class ge{constructor(){this.pos=[],this.col=[],this.uv=[],this.quad=[],this.tri=[],this.n=0}vert(t,e,n=0,s=0){return this.pos.push(t[0],t[1],t[2]),this.col.push(e[0],e[1],e[2]),this.uv.push(n,s),this.n++}addQuad(t,e,n,s,r,a=null){const o=a||[[0,0],[0,1],[1,1],[1,0]],l=this.vert(t,r,o[0][0],o[0][1]),d=this.vert(e,r,o[1][0],o[1][1]),u=this.vert(n,r,o[2][0],o[2][1]),h=this.vert(s,r,o[3][0],o[3][1]);this.quad.push(l,d,u,h)}addTri(t,e,n,s){const r=this.vert(t,s),a=this.vert(e,s),o=this.vert(n,s);this.tri.push(r,a,o)}addBox(t,e,n,s,r,a,o,l=0){const d=s/2,u=a/2,h=e+r,c=Math.cos(l),p=Math.sin(l),_=(A,C,b)=>[t+A*d*c-C*u*p,b,n+A*d*p+C*u*c],g=_(-1,-1,h),f=_(1,-1,h),m=_(1,1,h),v=_(-1,1,h),M=_(-1,-1,e),x=_(1,-1,e),y=_(1,1,e),S=_(-1,-1,e);this.addQuad(g,v,m,f,o),this.addQuad(M,x,y,S,o),this.addQuad(g,f,x,M,ce(o,.86)),this.addQuad(f,m,y,x,ce(o,.78)),this.addQuad(m,v,S,y,ce(o,.86)),this.addQuad(v,g,M,S,ce(o,.78))}quadCount(){return this.quad.length/4}triCount(){return this.tri.length/3+this.quadCount()*2}vertCount(){return this.n}}function ce(i,t){return[i[0]*t,i[1]*t,i[2]*t]}function bm(){return{asphalt:new ge,junction:new ge,marking:new ge,sidewalk:new ge,curb:new ge,grassMed:new ge,bridge:new ge,ballast:new ge,sleeper:new ge,steel:new ge,beam:new ge,pillar:new ge,terrain:new ge,water:new ge,building:new ge,trunk:new ge,leaf:new ge,wood:new ge}}function Em(i,t,e=2){var g,f,m;const n=Te(i,t);if(n.length<2)return[];const s=qi(n,{closed:!!t.closed,smooth:t.smooth!==!1,step:e}),r=[0],a=t.closed?n.length:n.length-1;for(let v=0;v<a;v++){const M=n[v%n.length],x=n[(v+1)%n.length];r.push(r[v]+Math.hypot(x.x-M.x,x.z-M.z))}const o=r[r.length-1]||1,l=v=>{const M=se(v,0,o);let x=0;for(;x<r.length-2&&r[x+1]<M;)x++;const y=Math.max(1e-6,r[x+1]-r[x]),S=se((M-r[x])/y,0,1),A=n[x%n.length].h||0,C=n[(x+1)%n.length].h||0;return A+(C-A)*S},d=!!((g=t.bridge)!=null&&g.enabled),u=((f=t.bridge)==null?void 0:f.height)??6,h=zt(i,s[0].x,s[0].z)+.22,c=zt(i,s[s.length-1].x,s[s.length-1].z)+.22,p=s[s.length-1].dist||1,_=((m=t.bridge)==null?void 0:m.type)==="arch"?1.8:0;for(const v of s){const M=l(v.dist),x=zt(i,v.x,v.z)+.22+M;if(!d){v.y=x,v.bridge=!1;continue}const y=se(v.dist/p,0,1);let S;if(t.closed)S=x+u;else{const A=u*Math.pow(Math.sin(Math.PI*y),.75)+_*Math.sin(Math.PI*y);S=h+(c-h)*y+A+M}v.y=Math.max(x,S),v.bridge=S>x+.35}return s}function la(i,t,e){let n=null,s=1e9;for(const r of i){const a=Math.hypot(t-r.x,e-r.z);a<s&&(s=a,n=r)}return{j:n,d:s}}function Tm(i,t,e){if(!i.length)return[];const n=i.map(a=>{for(const o of t)if(o.stubs.some(d=>d.roadId===e)&&Math.hypot(a.x-o.x,a.z-o.z)<o.radius-.4)return o;return null}),s=[];let r=[];for(let a=0;a<i.length;a++)n[a]?(r.length>=2&&s.push(r),r=[]):r.push(i[a]);r.length>=2&&s.push(r);for(const a of s){const o=a[0],l=a[a.length-1],d=la(t,o.x-o.dirx*3,o.z-o.dirz*3);if(d.j&&d.d<d.j.radius+6){const h=d.j,c=o.x-h.x,p=o.z-h.z,_=Math.hypot(c,p)||1,g=h.x+c/_*(h.radius-.15),f=h.z+p/_*(h.radius-.15);a.unshift({x:g,z:f,dirx:o.dirx,dirz:o.dirz,dist:o.dist-2,y:o.y,bridge:o.bridge})}const u=la(t,l.x+l.dirx*3,l.z+l.dirz*3);if(u.j&&u.d<u.j.radius+6){const h=u.j,c=l.x-h.x,p=l.z-h.z,_=Math.hypot(c,p)||1,g=h.x+c/_*(h.radius-.15),f=h.z+p/_*(h.radius-.15);a.push({x:g,z:f,dirx:l.dirx,dirz:l.dirz,dist:l.dist+2,y:l.y,bridge:l.bridge})}}return s}function _e(i){return[-i.dirz,i.dirx]}function Oo(i,t,e,n,s){let r=.15;const{j:a,d:o}=la(s,e.x,e.z);if(a){const l=se(1-(o-a.radius)/4.5,0,1);l>0&&(r=Ee(r,.03,l*l*(3-2*l)))}if(t.driveways){const l=(n%30+30)%30;if(l<5.5){const d=Math.sin(l/5.5*Math.PI);r=Ee(r,.03,d*.95)}}return r}const $e=[.92,.93,.94],vi=[.95,.72,.2];function Es(i,t=3,e=4.5){return i%(t+e)<t}function ue(i,t,e,n,s,r,a,o){const[l,d]=_e(t),[u,h]=_e(e),c=Math.max(n,s),p=Math.min(n,s),_=[t.x+l*c,r,t.z+d*c],g=[e.x+u*c,a,e.z+h*c],f=[e.x+u*p,a,e.z+h*p],m=[t.x+l*p,r,t.z+d*p];i.addQuad(_,g,f,m,o)}function wm(i,t,e,n,s,r){var p;const a=Oe(n),o=!!((p=e.bridge)!=null&&p.enabled),l=Cl(n.asphalt||"#3a3d43"),d=n.sidewalkWidth||0,u=n.sidewalkL&&d>0,h=n.sidewalkR&&d>0,c=n.kind==="rail"||n.kind==="monorail";for(let _=0;_<s.length-1;_++){const g=s[_],f=s[_+1],m=g.y,v=f.y;if(ue(i.asphalt,g,f,-a,a,m,v,l),c)continue;const M=n.medianWidth||0;if(M>.2)if(n.medianType==="grass")ue(i.grassMed,g,f,-M/2,M/2,m+.09,v+.09,[.3,.52,.28]);else if(n.medianType==="barrier"){const b=Math.min(.5,M/3);ue(i.bridge,g,f,-b,b,m+.55,v+.55,[.75,.76,.78]),Am(i.bridge,g,f,0,m,v,[.7,.71,.73])}else(n.medianType==="paint"||n.medianType==="paver")&&ue(i.marking,g,f,-M/2,M/2,m+.02,v+.02,n.medianType==="paver"?[.62,.6,.52]:vi.map(b=>b*.55));const x=m+.028,y=v+.028,S=n.center;if(S==="doubleYellow"?(ue(i.marking,g,f,.08,.22,x,y,vi),ue(i.marking,g,f,-.22,-.08,x,y,vi)):S==="dashedYellow"||S==="dashedWhite"?Es(g.dist)&&Es(f.dist-.01)&&ue(i.marking,g,f,-.09,.09,x,y,S==="dashedYellow"?vi:$e):S==="solidWhite"?ue(i.marking,g,f,-.09,.09,x,y,$e):S==="turnLane"&&(ue(i.marking,g,f,M/2-.15,M/2+0,x,y,vi),ue(i.marking,g,f,-M/2,-M/2+.15,x,y,vi)),n.laneMark==="dashedWhite")for(const b of Wo(n))Es(g.dist)&&Es(f.dist-.01)&&ue(i.marking,g,f,b-.08,b+.08,x,y,$e);if(n.edgeMark&&(ue(i.marking,g,f,a-.42,a-.26,x,y,$e),ue(i.marking,g,f,-(a-.26),-(a-.42),x,y,$e)),n.parking&&Math.floor(g.dist/6)!==Math.floor(f.dist/6)){const b=a-(n.shoulder||2);ue(i.marking,g,f,b-.08,b+.08,x,y,$e.map(E=>E*.8)),ue(i.marking,g,f,-b-.08,-b+.08,x,y,$e.map(E=>E*.8))}const A=Oo(t,n,g,g.dist,r),C=Oo(t,n,f,f.dist,r);u&&ko(i,g,f,a,d,m,v,A,C,1,o,t),h&&ko(i,g,f,a,d,m,v,A,C,-1,o,t)}o&&Rm(i,t,e,n,s,a)}function ko(i,t,e,n,s,r,a,o,l,d,u,h){const c=d*(n+.12),p=d*(n+.12+s),_=r+o,g=a+l,f=[.62,.63,.65];ue(i.sidewalk,t,e,c,p,_,g,f);const[m,v]=_e(t),[M,x]=_e(e),y=Math.sign(d),S=[t.x+m*c,r,t.z+v*c],A=[t.x+m*c,_,t.z+v*c],C=[e.x+M*c,a,e.z+x*c],b=[e.x+M*c,g,e.z+x*c];if(y>0?i.curb.addQuad(S,C,b,A,ce(f,.8)):i.curb.addQuad(A,b,C,S,ce(f,.8)),!u){const E=zt(h,t.x+m*p,t.z+v*p)-.15,P=zt(h,e.x+M*p,e.z+x*p)-.15,H=[t.x+m*p,_,t.z+v*p],F=[e.x+M*p,g,e.z+x*p],L=[t.x+m*p,Math.min(E,_-.02),t.z+v*p],W=[e.x+M*p,Math.min(P,g-.02),e.z+x*p];y>0?i.curb.addQuad(H,F,W,L,ce(f,.7)):i.curb.addQuad(L,W,F,H,ce(f,.7))}}function Am(i,t,e,n,s,r,a){const[o,l]=_e(t),[d,u]=_e(e),h=.28,c=.55,p=[t.x+o*(n-h),s,t.z+l*(n-h)],_=[t.x+o*(n+h),s,t.z+l*(n+h)],g=[e.x+d*(n-h),r,e.z+u*(n-h)],f=[e.x+d*(n+h),r,e.z+u*(n+h)],m=[p[0],s+c,p[2]],v=[_[0],s+c,_[2]],M=[g[0],r+c,g[2]],x=[f[0],r+c,f[2]];i.addQuad(p,g,M,m,ce(a,.85)),i.addQuad(v,x,f,_,ce(a,.85))}function Rm(i,t,e,n,s,r){const a=[.55,.58,.62];s[s.length-1].dist-s[0].dist;for(let u=0;u<s.length-1;u++){const h=s[u],c=s[u+1];for(const p of[1,-1]){const _=p*(r+.35),[g,f]=_e(h),[m,v]=_e(c),M=[h.x+g*_,h.y+1.05,h.z+f*_],x=[c.x+m*_,c.y+1.05,c.z+v*_],y=[h.x+g*(_+p*.18),h.y+1.05,h.z+f*(_+p*.18)],S=[c.x+m*(_+p*.18),c.y+1.05,c.z+v*(_+p*.18)];i.bridge.addQuad(M,x,S,y,a);const A=[M[0],M[1]-.55,M[2]],C=[x[0],x[1]-.55,x[2]],b=[y[0],y[1]-.55,y[2]],E=[S[0],S[1]-.55,S[2]];i.bridge.addQuad(A,C,E,b,ce(a,.85))}}const o=s.length;for(let u=0;u<o;u+=2){const h=s[u];for(const c of[1,-1]){const p=c*(r+.4),[_,g]=_e(h);i.bridge.addBox(h.x+_*p,h.y,h.z+g*p,.16,1.05,.16,ce(a,.9))}}for(let u=0;u<s.length-1;u++){const h=s[u],c=s[u+1];for(const p of[1,-1]){const _=p*(r+.12),[g,f]=_e(h),[m,v]=_e(c),M=[h.x+g*_,h.y-.02,h.z+f*_],x=[c.x+m*_,c.y-.02,c.z+v*_],y=[M[0],M[1]-.9,M[2]],S=[x[0],x[1]-.9,x[2]];p>0?i.bridge.addQuad(M,x,S,y,[.5,.52,.55]):i.bridge.addQuad(y,S,x,M,[.5,.52,.55])}}const l=ni(t);let d=0;for(let u=1;u<s.length-1;u++){if(d+=s[u].dist-s[u-1].dist,d<14)continue;d=0;const h=s[u],c=Math.min(zt(t,h.x,h.z),l-.4)-.6,p=h.y-.9;if(p-c<1.2)continue;const[_,g]=_e(h),f=Math.atan2(h.dirx,h.dirz);for(const m of[1,-1]){const v=m*Math.min(r*.55,5);i.bridge.addBox(h.x+_*v,c,h.z+g*v,1.3,p-c,1.3,[.6,.6,.61],f)}i.bridge.addBox(h.x,p-.7,h.z,Math.min(r*1.3,12),.7,1.8,[.62,.62,.63],f)}for(const u of[s[0],s[s.length-1]]){const h=zt(t,u.x,u.z)-.4;if(u.y-h>1.5){const c=Math.atan2(u.dirx,u.dirz);i.bridge.addBox(u.x,h,u.z,r*2+1.6,Math.min(u.y-h,8),2.2,[.58,.58,.59],c)}}}function Cm(i,t,e,n=null){const{x:s,z:r,stubs:a,radius:o}=e,l=(v,M,x)=>{const y=n==null?void 0:n.get(v.id);if(y!=null&&y.length){let S=y[0],A=1e18;for(let C=0;C<y.length;C+=2){const b=y[C],E=(b.x-M)*(b.x-M)+(b.z-x)*(b.z-x);E<A&&(A=E,S=b)}return S.y}return zt(t,M,x)+.22},d=[];for(const v of a){const M=ie(v.road.presetId),x=Oe(M),y=s+v.dirx*o,S=r+v.dirz*o,A=-v.dirz,C=v.dirx,b=l(v.road,y,S),E={x:y+A*x,z:S+C*x,y:b,stub:v,hw:x,side:1},P={x:y-A*x,z:S-C*x,y:b,stub:v,hw:x,side:-1};d.push(E,P)}d.sort((v,M)=>Math.atan2(v.z-r,v.x-s)-Math.atan2(M.z-r,M.x-s));const u=d.reduce((v,M)=>v+M.y,0)/Math.max(1,d.length),h={x:s,z:r,y:u+.005};let c=ie(a[0].road.presetId),p=-1;for(const v of a){const M=ie(v.road.presetId),x=Oe(M);x>p&&(p=x,c=M)}const _=Cl(c.asphalt||"#3a3d43").map(v=>v*.62),g=d.length,f=(v,M)=>({x:(v.x+M.x)/2,z:(v.z+M.z)/2,y:(v.y+M.y)/2});for(let v=0;v<g;v++){const M=d[v],x=d[(v+1)%g],y={x:(h.x+M.x+x.x)/3,z:(h.z+M.z+x.z)/3,y:(h.y+M.y+x.y)/3},S=f(h,M),A=f(M,x),C=f(x,h),b=[h.x,h.y,h.z],E=[M.x,M.y,M.z],P=[x.x,x.y,x.z],H=[y.x,y.y,y.z],F=[S.x,S.y,S.z],L=[A.x,A.y,A.z],W=[C.x,C.y,C.z];i.junction.addQuad(b,F,H,W,_),i.junction.addQuad(E,L,H,F,_),i.junction.addQuad(P,W,H,L,_)}const m=new Set;for(const v of a){const M=ie(v.road.presetId),x=Oe(M),y=v.roadId+":"+Math.round(Hi(v.dirx,v.dirz)*10);if(m.has(y))continue;m.add(y);const S=-v.dirz,A=v.dirx,C=l(v.road,s+v.dirx*(o+2),r+v.dirz*(o+2));if(M.crosswalk&&!M.pedestrian){const b=o+1.4,E=2.8,P=x*2-1.2,H=Math.max(2,Math.floor(P/1.15));for(let At=0;At<H;At++){const Gt=-P/2+(At+.5)*(P/H),Y=s+v.dirx*b+S*Gt,Q=r+v.dirz*b+A*Gt,ft=s+v.dirx*(b+E)+S*Gt,st=r+v.dirz*(b+E)+A*Gt,_t=P/H*.55;Math.atan2(v.dirx,v.dirz);const Tt=Y+S*_t/2,Ut=Q+A*_t/2,Jt=Y-S*_t/2,Ft=Q-A*_t/2,ne=ft-S*_t/2,N=st-A*_t/2,we=ft+S*_t/2,Nt=st+A*_t/2;i.marking.addQuad([Tt,C+.028,Ut],[we,C+.028,Nt],[ne,C+.028,N],[Jt,C+.028,Ft],$e)}const F=o+5.2,L=s+v.dirx*F+S*x*.95,W=r+v.dirz*F+A*x*.95,z=s+v.dirx*F-S*x*.95,q=r+v.dirz*F-A*x*.95,O=s+v.dirx*(F+.45)+S*x*.95,J=r+v.dirz*(F+.45)+A*x*.95,nt=s+v.dirx*(F+.45)-S*x*.95,Mt=r+v.dirz*(F+.45)-A*x*.95;i.marking.addQuad([L,C+.028,W],[O,C+.028,J],[nt,C+.028,Mt],[z,C+.028,q],$e)}}for(let v=0;v<g;v++){const M=d[v],x=d[(v+1)%g];if(M.stub===x.stub)continue;const y=(M.x+x.x)/2,S=(M.z+x.z)/2,A=y-s,C=S-r,b=Math.hypot(A,C)||1,E=3.2,P={x:M.x+A/b*E,z:M.z+C/b*E},H={x:x.x+A/b*E,z:x.z+C/b*E},F=(M.y+x.y)/2+.03,L=(M.y+x.y)/2+.15,W=[.6,.61,.63];i.sidewalk.addQuad([M.x,F,M.z],[x.x,F,x.z],[H.x,L,H.z],[P.x,L,P.z],W)}}function Pm(i,t,e=2.5){var r,a;const n=t.nodeIds.map(o=>i.nodes[o]).filter(Boolean);if(n.length<2)return[];const s=qi(n,{closed:!!t.closed,smooth:!0,step:e});if(t.kind==="monorail"){const o=s.map(h=>zt(i,h.x,h.z)),l=o.map((h,c)=>{let p=0,_=0;for(let g=-6;g<=6;g++){const f=se(c+g,0,o.length-1);p+=o[f],_++}return p/_}),u=ie(t.presetId).elevation??6.8;s.forEach((h,c)=>{h.y=l[c]+u,h.bridge=!0})}else{const o=[0],l=t.closed?n.length:n.length-1;for(let f=0;f<l;f++){const m=n[f%n.length],v=n[(f+1)%n.length];o.push(o[f]+Math.hypot(v.x-m.x,v.z-m.z))}const d=o[o.length-1]||1,u=f=>{const m=se(f,0,d);let v=0;for(;v<o.length-2&&o[v+1]<m;)v++;const M=Math.max(1e-6,o[v+1]-o[v]),x=se((m-o[v])/M,0,1),y=n[v%n.length].h||0,S=n[(v+1)%n.length].h||0;return y+(S-y)*x},h=!!((r=t.bridge)!=null&&r.enabled),c=((a=t.bridge)==null?void 0:a.height)??4,p=zt(i,s[0].x,s[0].z)+.42,_=zt(i,s[s.length-1].x,s[s.length-1].z)+.42,g=s[s.length-1].dist||1;for(const f of s){const m=u(f.dist),v=zt(i,f.x,f.z)+.42+m;if(!h){f.y=v,f.bridge=!1;continue}const M=se(f.dist/g,0,1),x=p+(_-p)*M+c*Math.pow(Math.sin(Math.PI*M),.75)+m;f.y=Math.max(v,x),f.bridge=x>v+.35}}return s}function Lm(i,t,e,n){const s=ie(e.presetId),r=s.tracks||1,a=s.trackSpacing||0,o=(s.ballastWidth||8)/2,l=[.32,.28,.25];for(let h=0;h<n.length-1;h++){const c=n[h],p=n[h+1];ue(i.ballast,c,p,-o,o,c.y,p.y,l);for(const _ of[1,-1]){const[g,f]=_e(c),[m,v]=_e(p),M=[c.x+g*_*o,c.y,c.z+f*_*o],x=[p.x+m*_*o,p.y,p.z+v*_*o],y=[M[0]+g*_*1.1,c.y-.55,M[2]+f*_*1.1],S=[x[0]+m*_*1.1,p.y-.55,x[2]+v*_*1.1];_>0?i.ballast.addQuad(M,x,S,y,ce(l,.85)):i.ballast.addQuad(y,S,x,M,ce(l,.85))}}for(let h=0;h<r;h++){const c=r===1?0:(h-(r-1)/2)*a;let p=0;for(let _=0;_<n.length;_++){if(_>0&&(p+=n[_].dist-n[_-1].dist),p<.95&&_!==0)continue;p=0;const g=n[_],[f,m]=_e(g),v=Math.atan2(g.dirx,g.dirz);i.sleeper.addBox(g.x+f*c,g.y+.02,g.z+m*c,2.5,.13,.26,[.36,.28,.19],v)}for(let _=0;_<n.length-1;_++){const g=n[_],f=n[_+1];for(const m of[-.72,.72]){const v=c+m;ue(i.steel,g,f,v-.05,v+.05,g.y+.22,f.y+.22,[.78,.8,.83])}}}const d=ni(t);let u=0;for(let h=1;h<n.length-1;h++){if(u+=n[h].dist-n[h-1].dist,u<12)continue;u=0;const c=n[h],p=Math.min(zt(t,c.x,c.z),d-.4)-.6;if(c.y-.5-p<1.6)continue;const _=Math.atan2(c.dirx,c.dirz);i.bridge.addBox(c.x,p,c.z,o*1.1,c.y-.5-p,1.6,[.55,.53,.5],_)}}function Dm(i,t,e){for(const n of e){const s=ie(n.road.presetId),r=Oe(s),[a,o]=n.railDir,l=Math.atan2(a,o),d=(ie(n.rail.presetId).ballastWidth||8)+1.5,u=r*2+1.2;i.wood.addBox(n.x,n.y+.02,n.z,u,.09,d,[.42,.33,.22],Math.atan2(n.roadDir[0],n.roadDir[1]));const h=-o,c=a,p=d/2-.4,_=u/2-.4,g=n.y+.12,f=[[n.x-a*p+h*_,n.z-o*p+c*_],[n.x+a*p+h*_,n.z+o*p+c*_],[n.x+a*p-h*_,n.z+o*p-c*_],[n.x-a*p-h*_,n.z-o*p-c*_]];i.marking.addQuad([f[0][0],g,f[0][1]],[f[1][0],g,f[1][1]],[f[1][0]-h*.5,g,f[1][1]-c*.5],[f[0][0]-h*.5,g,f[0][1]-c*.5],$e);for(const m of[1,-1]){const v=n.x+h*m*(_+1.2),M=n.z+c*m*(_+1.2),x=zt(t,v,M);i.steel.addBox(v,x,M,.18,3.4,.18,[.7,.7,.72]),i.steel.addBox(v,x+3,M,1.1,.28,.12,[.85,.85,.86],l)}}}function Im(i,t,e,n){const s=ie(e.presetId),r=(s.beamWidth||.9)/2,a=s.beamHeight||1.4,o=[.66,.69,.72];for(let h=0;h<n.length-1;h++){const c=n[h],p=n[h+1];ue(i.beam,c,p,-r,r,c.y,p.y,o);for(const _ of[1,-1]){const[g,f]=_e(c),[m,v]=_e(p),M=[c.x+g*_*r,c.y,c.z+f*_*r],x=[p.x+m*_*r,p.y,p.z+v*_*r],y=[M[0],c.y-a,M[2]],S=[x[0],p.y-a,x[2]];_>0?i.beam.addQuad(M,x,S,y,ce(o,.88)):i.beam.addQuad(y,S,x,M,ce(o,.88))}}const l=s.pillarEvery||20;let d=l;for(let h=0;h<n.length;h++){if(h>0&&(d+=n[h].dist-n[h-1].dist),d<l&&h!==0)continue;d=0;const c=n[h],p=zt(t,c.x,c.z)-.3,_=c.y-a;if(_-p<1)continue;const g=Math.atan2(c.dirx,c.dirz);i.pillar.addBox(c.x,p,c.z,1.5,_-p,1.5,[.58,.59,.6],g),i.pillar.addBox(c.x,_-.5,c.z,2.6,.5,2,[.62,.63,.64],g)}const u=[n[0],n[n.length-1]];n[n.length-1].dist>400&&u.push(n[Math.floor(n.length/2)]);for(const h of u){const c=Math.atan2(h.dirx,h.dirz),[p,_]=_e(h),g=h.x,f=h.z,m=h.y;for(const v of[1,-1]){i.pillar.addBox(g+p*v*2.4,m-.4,f+_*v*2.4,2.6,.5,16,[.55,.56,.58],c),i.pillar.addBox(g+p*v*2.4,m+2.6,f+_*v*2.4,3.4,.18,14,[.3,.5,.62],c);for(const M of[-6,6])i.pillar.addBox(g+p*v*3.4+h.dirx*M,m+.1,f+_*v*3.4+h.dirz*M,.18,2.5,.18,[.4,.42,.44],c)}}}function Um(i,t,e){const n=e.radius||15,s=7.5,r=n,a=n-s,o=56,l=zt(t,e.x,e.z)+.22,d=[.23,.24,.26];let u=null;for(let _=0;_<=o;_++){const g=_/o*Math.PI*2,f=Math.cos(g),m=Math.sin(g),v=e.x+f*r,M=e.z+m*r,x=e.x+f*a,y=e.z+m*a,S=zt(t,v,M)+.22,A=zt(t,x,y)+.22,C={ox:v,oz:M,ix:x,iz:y,yo:S,yi:A};if(u&&(i.asphalt.addQuad([u.ix,u.yi,u.iz],[C.ix,C.yi,C.iz],[C.ox,C.yo,C.oz],[u.ox,u.yo,u.oz],d),_%2===0)){const b=(r+a)/2,E=e.x+Math.cos((_-1)/o*Math.PI*2)*b,P=e.z+Math.sin((_-1)/o*Math.PI*2)*b,H=e.x+Math.cos(_/o*Math.PI*2)*b,F=e.z+Math.sin(_/o*Math.PI*2)*b,L=zt(t,E,P)+.25,W=zt(t,H,F)+.25,z=-(F-P),q=H-E,O=Math.hypot(z,q)||1,J=.09;i.marking.addQuad([E+z/O*J,L,P+q/O*J],[H+z/O*J,W,F+q/O*J],[H-z/O*J,W,F-q/O*J],[E-z/O*J,L,P-q/O*J],$e)}u=C}const h=[.32,.52,.3],c=a-.4,p=[e.x,l+.16,e.z];for(let _=0;_<o;_+=2){const g=_/o*Math.PI*2,f=(_+2)/o*Math.PI*2,m=(_+1)/o*Math.PI*2,v=[e.x+Math.cos(g)*c,l+.16,e.z+Math.sin(g)*c],M=[e.x+Math.cos(f)*c,l+.16,e.z+Math.sin(f)*c],x=[e.x+Math.cos(m)*c*.55,l+.16,e.z+Math.sin(m)*c*.55];i.grassMed.addQuad(p,v,x,M,h)}u=null;for(let _=0;_<=o;_++){const g=_/o*Math.PI*2,f=Math.cos(g),m=Math.sin(g),v=e.x+f*c,M=e.z+m*c,x={x:v,z:M};u&&i.curb.addQuad([u.x,l-.02,u.z],[x.x,l-.02,x.z],[x.x,l+.16,x.z],[u.x,l+.16,u.z],[.6,.6,.62]),u=x}}function Nm(i,t,e,n){const s=ze,r=ni(t),a=s/(n-1);for(let d=0;d<n-1;d++)for(let u=0;u<n-1;u++){const h=-600+u*a,c=h+a,p=-600+d*a,_=p+a,g=e[d*n+u],f=e[d*n+u+1],m=e[(d+1)*n+u],v=e[(d+1)*n+u+1],M=(Math.abs(f-g)+Math.abs(m-g))/Math.max(.001,a),x=Vi(g,r,M,h,p),y=Vi(f,r,M,c,p),S=Vi(m,r,M,h,_),A=Vi(v,r,M,c,_),C=i.terrain.vert([h,g,p],x,u/n*60,d/n*60),b=i.terrain.vert([h,m,_],S,u/n*60,(d+1)/n*60),E=i.terrain.vert([c,v,_],A,(u+1)/n*60,(d+1)/n*60),P=i.terrain.vert([c,f,p],y,(u+1)/n*60,d/n*60);i.terrain.quad.push(C,b,E,P)}const o=8,l=[.2,.45,.62];for(let d=0;d<o;d++)for(let u=0;u<o;u++){const h=-600+u/o*s,c=-600+(u+1)/o*s,p=-600+d/o*s,_=-600+(d+1)/o*s;i.water.addQuad([h,r,p],[h,r,_],[c,r,_],[c,r,p],l)}}function Fm(i){const t={};let e=0,n=0,s=0;for(const[r,a]of Object.entries(i)){const o=a.quadCount(),l=a.triCount(),d=a.vertCount();t[r]={quads:o,tris:l,verts:d},e+=o,n+=l,s+=d}return t._total={quads:e,tris:n,verts:s},t}function Pl(i,t={}){const e=bm(),n=ha(i),s=[];for(const p of i.roads){const _=ie(p.presetId),g=Em(i,p,t.roadStep??2.2);if(g.length<2)continue;const f=Tm(g,n,p.id);for(const m of f)wm(e,i,p,_,m,n);s.push({road:p,preset:_,samples:g,spans:f})}const r=new Map;for(const p of s)r.set(p.road.id,p.samples);for(const p of n)Cm(e,i,p,r);for(const p of i.roundabouts||[])Um(e,i,p);const a=[];for(const p of i.rails||[]){const _=Pm(i,p,2.5);_.length<2||(p.kind==="monorail"?Im(e,i,p,_):Lm(e,i,p,_),a.push({rail:p,samples:_}))}const o=Xo(i);Dm(e,i,o);const l=t.terrainN??140,d=[];for(const{preset:p,samples:_}of s){const g=Oe(p);for(let f=0;f<_.length;f+=2){const m=_[f];d.push({x:m.x,z:m.z,y:m.y,hw:g,bridge:m.bridge})}}for(const{rail:p,samples:_}of a){if(p.kind!=="rail")continue;const g=(ie(p.presetId).ballastWidth||8)/2;for(let f=0;f<_.length;f+=3){const m=_[f];d.push({x:m.x,z:m.z,y:m.y-.3,hw:g,bridge:m.bridge})}}const u=Go(i,l,d);Nm(e,i,u,l);const h=qo(i);zm(e,i,h);const c=Fm(e);return{buckets:e,roadData:s,railData:a,junctions:n,crossings:o,grid:u,terrainN:l,dressing:h,stats:c}}function zm(i,t,e){const n=ni(t);let s=0;for(const a of e.buildings){const o=zt(t,a.x,a.z);if(o<n+.2)continue;const l=Math.min(o,o)-.4,d=Jl(a.color||"#9aa0a8"),u=a.rot||0;if(i.building.addBox(a.x,l,a.z,a.w,a.h,a.d,d,u),a.type==="house"||a.type==="cabin"||a.type==="barn"?(i.building.addBox(a.x,l+a.h,a.z,a.w*.72,a.h*.32,a.d*.72,ce(d,.55),u),i.building.addBox(a.x,l+a.h+a.h*.32,a.z,a.w*.4,a.h*.2,a.d*.4,ce(d,.45),u),a.type==="barn"&&i.building.addBox(a.x+a.w*.2,l+a.h*.4,a.z,.3,a.h*.6,2.2,[.9,.9,.9],u)):(i.building.addBox(a.x,l+a.h,a.z,a.w*1.02,.5,a.d*1.02,ce(d,.5),u),a.h>18&&i.building.addBox(a.x,l+a.h+.5,a.z,a.w*.3,2.6,a.d*.3,ce(d,.65),u)),a.windows&&a.h>6){const h=Math.floor((a.h-2)/3.2),c=[.75,.85,.92];for(let p=0;p<h;p++){const _=l+2.2+p*3.2;i.building.addBox(a.x,_,a.z,a.w+.12,.95,a.d+.12,c,u)}}else a.windows&&i.building.addBox(a.x,l+1.6,a.z,a.w+.1,.8,a.d+.1,[.78,.86,.9],u);if(s++,s>900)break}let r=0;for(const a of e.trees){const o=zt(t,a.x,a.z);if(o<n+.25)continue;const l=a.s||1,d=jn(a.x*.5,a.z*.5),u=[.22+d*.12,.42+d*.14,.2+d*.08];if(i.trunk.addBox(a.x,o-.2,a.z,.4*l,1.7*l,.4*l,[.4,.3,.2]),i.leaf.addBox(a.x,o+1.1*l,a.z,2.1*l,1.5*l,2.1*l,u,d*.6),i.leaf.addBox(a.x,o+2.2*l,a.z,1.3*l,1*l,1.3*l,ce(u,1.08),d),r++,r>2600)break}}class Om{constructor(t,e,n={}){this.container=t,this.store=e,this.onStats=n.onStats||(()=>{}),this.showCars=!0,this.showTrains=!0,this.flyover=!1,this._flyT=0,this.world=null,this.cars=[],this.trains=[],this.clouds=[],this._rebuildTimer=null,this.renderer=new em({antialias:!0}),this.renderer.setPixelRatio(Math.min(1.75,window.devicePixelRatio||1)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=$o,t.appendChild(this.renderer.domElement),this.scene=new nm,this.scene.background=new Bt("#a9c8e2"),this.scene.fog=new ya("#a9c8e2",700,2400),this.camera=new Ve(55,1,.5,5e3),this.camera.position.set(330,260,470),this.controls=new dm(this.camera,this.renderer.domElement),this.controls.target.set(0,0,60),this.controls.enableDamping=!0,this.controls.dampingFactor=.08,this.controls.maxPolarAngle=Math.PI*.495,this.controls.minDistance=8,this.controls.maxDistance=1600;const s=new im("#cfe5ff","#5a6b52",.95);this.scene.add(s),this.sun=new am("#fff2dd",2.1),this.sun.position.set(420,520,260),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(2048,2048);const r=this.sun.shadow.camera;r.left=-650,r.right=650,r.top=650,r.bottom=-650,r.far=1800,this.sun.shadow.bias=-4e-4,this.scene.add(this.sun),this.scene.add(new om("#ffffff",.15)),this.group=new Jn,this.scene.add(this.group),this.trafficGroup=new Jn,this.scene.add(this.trafficGroup),this.makeClouds(),this.materials={asphalt:new ae({vertexColors:!0,roughness:.96,metalness:0}),junction:new ae({vertexColors:!0,roughness:.96,metalness:0}),marking:new ae({vertexColors:!0,roughness:.55,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2}),sidewalk:new ae({vertexColors:!0,roughness:.9}),curb:new ae({vertexColors:!0,roughness:.9}),grassMed:new ae({vertexColors:!0,roughness:1}),bridge:new ae({vertexColors:!0,roughness:.8}),ballast:new ae({vertexColors:!0,roughness:1}),sleeper:new ae({vertexColors:!0,roughness:1}),steel:new ae({vertexColors:!0,roughness:.35,metalness:.7}),beam:new ae({vertexColors:!0,roughness:.6}),pillar:new ae({vertexColors:!0,roughness:.8}),terrain:new ae({vertexColors:!0,roughness:1,metalness:0}),water:new ae({vertexColors:!0,roughness:.25,metalness:.1,transparent:!0,opacity:.82}),building:new ae({vertexColors:!0,roughness:.85}),trunk:new ae({vertexColors:!0,roughness:1}),leaf:new ae({vertexColors:!0,roughness:1}),wood:new ae({vertexColors:!0,roughness:.9})},new ResizeObserver(()=>this.resize()).observe(t),this.resize(),e.subscribe(o=>{(o==="all"||o==="roads"||o==="terrain")&&this.rebuildSoon()}),this.rebuildSoon(60),this._last=performance.now();const a=()=>{this.tick(),requestAnimationFrame(a)};requestAnimationFrame(a)}resize(){const t=this.container.getBoundingClientRect();t.width<2||t.height<2||(this.renderer.setSize(t.width,t.height),this.camera.aspect=t.width/t.height,this.camera.updateProjectionMatrix())}rebuildSoon(t=350){clearTimeout(this._rebuildTimer),this._rebuildTimer=setTimeout(()=>this.rebuild(),t)}bucketMesh(t,e,{cast:n=!1,receive:s=!0}={}){if(!t.vertCount())return null;const r=new Fn;r.setAttribute("position",new nn(t.pos,3)),r.setAttribute("color",new nn(t.col,3)),r.setAttribute("uv",new nn(t.uv,2));const a=[];for(let l=0;l<t.quad.length;l+=4){const d=t.quad[l],u=t.quad[l+1],h=t.quad[l+2],c=t.quad[l+3];a.push(d,u,h,d,h,c)}for(const l of t.tri)a.push(l);r.setIndex(a),r.computeVertexNormals();const o=new Le(r,e);return o.castShadow=n,o.receiveShadow=s,o}rebuild(){const t=performance.now(),e=Pl(this.store.project,{terrainN:140,roadStep:2.2});this.world=e,this.group.traverse(a=>{a.geometry&&a.geometry.dispose()}),this.group.clear();const n=this.materials,s=new Set(["building","trunk","leaf","pillar","bridge","beam"]);for(const[a,o]of Object.entries(e.buckets)){const l=this.bucketMesh(o,n[a]||n.asphalt,{cast:s.has(a)});l&&(l.name=a,this.group.add(l))}this.setupTraffic(e);const r=Math.round(performance.now()-t);this.onStats(e.stats,{ms:r,roads:this.store.project.roads.length,rails:(this.store.project.rails||[]).length,junctions:e.junctions.length,crossings:e.crossings.length,buildings:e.dressing.buildings.length,trees:e.dressing.trees.length})}setupTraffic(t){this.trafficGroup.traverse(l=>{l.geometry&&l.geometry.dispose()}),this.trafficGroup.clear(),this.cars=[],this.trains=[];const e=new gn(1.9,1.35,4.2);e.translate(0,.9,0);const n=["#d94f4f","#4f7fd9","#e8e8e8","#2b2f36","#e8b93c","#4cc38a","#9a6ee8","#e8762b"],s=t.roadData.filter(({road:l,preset:d,samples:u})=>d.kind==="road"&&!d.pedestrian&&!d.narrow&&(d.lanesFwd||0)+(d.lanesBwd||0)>0&&u.length>12),r=Math.min(30,s.length*2);for(let l=0;l<r;l++){const d=s[l%s.length],u=d.samples[d.samples.length-1].dist,h=new ae({color:n[l%n.length],roughness:.5,metalness:.25}),c=new Le(e,h);c.castShadow=!0,this.trafficGroup.add(c),this.cars.push({samples:d.samples,total:u,dist:u/r*l+Math.random()*20,speed:9+Math.random()*9,lane:(l%2===0?1:-1)*1.8,mesh:c})}const a=t.railData.filter(l=>l.rail.kind==="rail").sort((l,d)=>d.samples.length-l.samples.length)[0];if(a){const l=a.samples[a.samples.length-1].dist,d=new gn(2.9,3.1,11);d.translate(0,2.1,0);for(let u=0;u<5;u++){const h=new ae({color:u===0?"#27435e":"#7a2020",roughness:.55,metalness:.3}),c=new Le(d,h);c.castShadow=!0,this.trafficGroup.add(c),this.trains.push({samples:a.samples,total:l,dist:l*.15-u*12.5,speed:16,mesh:c,dy:.4})}}const o=t.railData.filter(l=>l.rail.kind==="monorail").sort((l,d)=>d.samples.length-l.samples.length)[0];if(o){const l=o.samples[o.samples.length-1].dist,d=new gn(2.3,2.2,9);d.translate(0,1.9,0);for(const u of[.1,.55])for(let h=0;h<3;h++){const c=new ae({color:"#e8eef4",roughness:.4,metalness:.2}),p=new Le(d,c);p.castShadow=!0,this.trafficGroup.add(p),this.trains.push({samples:o.samples,total:l,dist:l*u-h*10,speed:13,mesh:p,dy:.75,mono:!0})}}}sampleAt(t,e){const n=t[t.length-1].dist;let s=(e%n+n)%n,r=0,a=t.length-1;for(;r<a-1;){const u=r+a>>1;t[u].dist<=s?r=u:a=u}const o=t[r],l=t[a],d=(s-o.dist)/Math.max(1e-6,l.dist-o.dist);return{x:o.x+(l.x-o.x)*d,z:o.z+(l.z-o.z)*d,y:o.y+(l.y-o.y)*d,dx:o.dirx+(l.dirx-o.dirx)*d,dz:o.dirz+(l.dirz-o.dirz)*d}}makeClouds(){const t=new ae({color:"#ffffff",roughness:1,transparent:!0,opacity:.85});for(let e=0;e<9;e++){const n=new Jn,s=3+e%3;for(let r=0;r<s;r++){const a=new Le(new gn(40+(e*7+r*13)%40,10,26+(e*5+r*11)%24),t);a.position.set(r*30-s*15,r%2*6,r%3*12),n.add(a)}n.position.set(-600+e*173%1200,190+e%4*22,-600+e*271%1200),this.scene.add(n),this.clouds.push({g:n,v:1.2+e%3*.7})}}tick(){const t=performance.now(),e=Math.min(.05,(t-this._last)/1e3);this._last=t;const n=this.showCars,s=this.showTrains;for(const r of this.cars){if(r.mesh.visible=n,!n)continue;r.dist+=r.speed*e;const a=this.sampleAt(r.samples,r.dist),o=-a.dz,l=a.dx;r.mesh.position.set(a.x+o*r.lane,a.y+.08,a.z+l*r.lane),r.mesh.rotation.y=Math.atan2(a.dx,a.dz)}for(const r of this.trains){if(r.mesh.visible=s,!s)continue;r.dist+=r.speed*e;const a=this.sampleAt(r.samples,r.dist);r.mesh.position.set(a.x,a.y+(r.dy||0),a.z),r.mesh.rotation.y=Math.atan2(a.dx,a.dz)}for(const r of this.clouds)r.g.position.x+=r.v*e,r.g.position.x>700&&(r.g.position.x=-700);if(this.materials.water&&(this.materials.water.opacity=.8+Math.sin(t*9e-4)*.04),this.flyover){this._flyT+=e*.045;const r=this._flyT;this.camera.position.set(Math.cos(r)*520,200+Math.sin(r*2.3)*60,Math.sin(r)*520+60),this.camera.lookAt(0,0,60)}else this.controls.update();this.renderer.render(this.scene,this.camera)}setWireframe(t){for(const e of Object.values(this.materials))e.wireframe=!!t}}function ca(i,t){const e=new Blob([t],{type:"text/plain"}),n=document.createElement("a");n.href=URL.createObjectURL(e),n.download=i,n.click(),setTimeout(()=>URL.revokeObjectURL(n.href),4e3)}function km(i){ca(`${(i.name||"frontier").replace(/[^\w\-]+/g,"_")}.json`,JSON.stringify(i,null,1))}function Bm(i){return new Promise((t,e)=>{const n=new FileReader;n.onload=()=>{try{const s=JSON.parse(n.result);if(!s.nodes||!s.roads)throw new Error("Not a Frontier project (missing nodes/roads)");s.rails=s.rails||[],s.roundabouts=s.roundabouts||[],s.rivers=s.rivers||[],s.terrainEdits=s.terrainEdits||[],s.buildingsManual=s.buildingsManual||[],s.settings={waterLevel:1.25,followTerrain:!0,autoMerge:!0,...s.settings||{}},t(s)}catch(s){e(s)}},n.onerror=e,n.readAsText(i)})}const Hm={asphalt:[.23,.24,.26],junction:[.23,.24,.26],marking:[.9,.9,.9],sidewalk:[.62,.63,.65],curb:[.5,.5,.52],grassMed:[.32,.52,.3],bridge:[.6,.6,.62],ballast:[.32,.28,.25],sleeper:[.36,.28,.19],steel:[.78,.8,.83],beam:[.66,.69,.72],pillar:[.58,.59,.6],terrain:[.4,.5,.32],water:[.2,.45,.62],building:[.6,.62,.66],trunk:[.4,.3,.2],leaf:[.28,.48,.24],wood:[.42,.33,.22]};function Vm(i,t){t==null||t("Building meshes…"),setTimeout(()=>{const n=Pl(i,{terrainN:130,roadStep:2.2}).buckets;let s=0,r=0;const a=[];a.push("# Frontier road network — game-ready, quad-flow topology"),a.push(`# exported ${new Date().toISOString()} · project: ${i.name}`),a.push("mtllib frontier.mtl");let o=1;for(const[d,u]of Object.entries(n))if(u.vertCount()){a.push(`
g ${d}`),a.push(`usemtl ${d}`);for(let h=0;h<u.n;h++)a.push(`v ${u.pos[h*3].toFixed(3)} ${u.pos[h*3+1].toFixed(3)} ${u.pos[h*3+2].toFixed(3)} ${u.col[h*3].toFixed(3)} ${u.col[h*3+1].toFixed(3)} ${u.col[h*3+2].toFixed(3)}`);for(let h=0;h<u.quad.length;h+=4)a.push(`f ${u.quad[h]+o} ${u.quad[h+1]+o} ${u.quad[h+2]+o} ${u.quad[h+3]+o}`),s++;for(let h=0;h<u.tri.length;h+=3)a.push(`f ${u.tri[h]+o} ${u.tri[h+1]+o} ${u.tri[h+2]+o}`),r++;o+=u.n}a.unshift(`# quads: ${s} · tris(extra): ${r} · verts: ${o-1}`),ca("frontier_network.obj",a.join(`
`));const l=["# Frontier materials"];for(const[d,u]of Object.entries(Hm))l.push(`
newmtl ${d}`,`Kd ${u[0]} ${u[1]} ${u[2]}`,"Ka 0.2 0.2 0.2","Ks 0.05 0.05 0.05","Ns 10","d 1.0","illum 2");ca("frontier.mtl",l.join(`
`)),t==null||t(`Exported OBJ · ${s.toLocaleString()} quads · ${(s*2+r).toLocaleString()} tris`)},30)}function Ll(){const i=da("Frontier — Countryside · City · Offroad");i.settings.waterLevel=1.25,i.settings.followTerrain=!0,i.settings.autoMerge=!0,i.rivers.push({id:Pe("rv"),width:18,depth:3.4,points:[{x:260,z:-600},{x:275,z:-420},{x:295,z:-250},{x:308,z:-80},{x:312,z:80},{x:302,z:220},{x:292,z:320},{x:285,z:395}]});const t=new Map,e=(g,f)=>`${Math.round(g*10)},${Math.round(f*10)}`;function n(g,f,m=0){const v=e(g,f);if(t.has(v)){const x=t.get(v);return m!==0&&(i.nodes[x].h=m),x}const M=Pe("n");return i.nodes[M]={id:M,x:g,z:f,h:m},t.set(v,M),M}function s(g,f,m,v={}){const M=m.map(y=>n(y[0],y[1],y[2]||0)),x=Pe("rd");return i.roads.push({id:x,name:g,presetId:f,nodeIds:M,closed:!!v.closed,bridge:v.bridge||{enabled:!1,height:6,type:"beam"},smooth:v.smooth??!0,oneWayOverride:null}),x}function r(g,f,m,v,M={}){const x=v.map(S=>n(S[0],S[1],S[2]||0)),y=Pe("rl");return i.rails.push({id:y,name:g,kind:f,presetId:m,nodeIds:x,closed:!!M.closed,bridge:M.bridge||null}),y}function a(g,f,m=12){const v=Pe("rb"),M=n(g,f-m),x=n(g+m,f),y=n(g,f+m),S=n(g-m,f);return i.roundabouts.push({id:v,x:g,z:f,radius:m,nodeIds:[M,x,y,S]}),{id:v,N:M,E:x,S:y,W:S}}const o=g=>{const f=i.nodes[g];return[f.x,f.z,f.h||0]},l=[-140,-70,0,70,140],d=[-245,...l,245],u=g=>g===0?"arterial4":Math.abs(g)===70?"oneway2":"street2",h=g=>g===0?"arterial4":Math.abs(g)===70?"street2":"oneway2";for(const g of l)s(g===0?"Central Ave N":`Downtown St W${g}`,u(g),d.map(f=>[g,f]));for(const g of l)s(g===0?"Central Ave E":`Downtown St S${g}`,h(g),d.map(f=>[f,g]));s("Ring N","arterial4",d.map(g=>[g,-245])),s("Ring S","arterial4",d.map(g=>[g,245])),s("Ring W","arterial4",d.map(g=>[-245,g])),s("Ring E","arterial4",d.map(g=>[245,g]));for(const g of[-70,0,70])s(`River Rd approach W z${g}`,"bridge2",[[245,g],[265,g],[285,g]]),s(`River Bridge z${g}`,"bridge2",[[285,g],[315,g],[345,g]],{bridge:{enabled:!0,height:4.6,type:"beam"}}),s(`River Rd approach E z${g}`,"bridge2",[[345,g],[365,g],[385,g]]);s("Frontage Ave","arterialTurn",[-320,-240,-150,-70,0,70,150,240,320].map(g=>[385,g])),s("Frontier Freeway","freeway6",[[430,-600,0],[430,-520,0],[430,-440,0],[430,-360,0],[430,-280,0],[430,-230,0],[430,-195,2.5],[430,-168,5.5],[430,-150,6.5],[430,-132,5.5],[430,-105,2.5],[430,-70,0],[430,0,0],[430,70,0],[430,105,2.5],[430,132,5.5],[430,150,6.5],[430,168,5.5],[430,195,2.5],[430,230,0],[430,280,0],[430,360,0],[430,440,0],[430,520,0],[430,600,0]],{bridge:{enabled:!0,height:0,type:"beam"}});for(const g of[-150,150]){const f=Math.sign(g),m=a(412,g,12),v=a(468,g,12),M=o(m.W),x=o(m.E),y=o(v.W),S=o(v.E);s(`Xchange W z${g}`,"arterialTurn",[[385,g],M]),s(`Xchange underpass z${g}`,"arterialTurn",[x,y]),s(`Xchange E z${g}`,"arterialTurn",[S,[510,g],[545,g]]);const A=[430,g-f*45,2.5],C=[430,g+f*45,2.5];[[o(m.N),[421,g-f*26,1.2],A],[o(m.S),[421,g+f*26,1.2],C],[o(v.N),[449,g-f*26,1.2],A],[o(v.S),[449,g+f*26,1.2],C]].forEach((E,P)=>s(`Ramp ${g}·${P+1}`,"alley",E,g>0&&P%2===1?{bridge:{enabled:!0,height:3.2,type:"beam"}}:{}))}for(const g of[300,365,430]){const f=[],m=g===430?120:180;for(let v=-280;v<=m;v+=46)f.push([v,g+Math.sin(v*.02+g)*10]);s(`Suburb Ln z${g}`,"residential",f)}for(const g of[-220,-120,-20]){const f=[];for(let m=245;m<=500;m+=44)f.push([g+Math.cos(m*.025+g)*9,m]);s(`Suburb Ave x${g}`,"residential",f)}for(const g of[-320,-400,-540])s(`Farm Rd x${g}`,"rural2",[[g,-520],[g+8,-320],[g-6,-120],[g+6,120],[g-4,320],[g,520]]);for(const g of[-260,-60,160,360])s(`Country Ln z${g}`,"rural2",[[-580,g],[-460,g+6],[-340,g-6],[-245,g]]);const _=[];for(let g=0;g<8;g++){const f=g/8*Math.PI*2;_.push([-470+Math.cos(f)*82,-420+Math.sin(f)*82])}return s("Tarn Loop","dirt",_,{closed:!0}),s("Tarn connector","dirt",[[-540,-420],[-552,-420]]),s("Farm track N","dirt",[[-400,-520],[-430,-560],[-480,-585]]),s("Farm track S","dirt",[[-320,520],[-300,565],[-260,590]]),s("Ridge dirt","dirt",[[545,150],[560,120],[575,90]]),s("Ridgeline Trail","trail",[[560,120],[585,40],[575,-80],[540,-180],[495,-140],[490,-20],[505,90]],{closed:!0}),s("Summit spur","trail",[[540,-180],[560,-230],[575,-290]]),s("Lakeshore trail","trail",[[505,90],[470,160],[430,230],[400,290]]),r("Valley Line W","rail","railDouble",[[-600,175],[-400,175],[-200,175],[0,175],[250,175]]),r("Valley Viaduct","rail","railDouble",[[250,175],[305,175],[360,175]],{bridge:{enabled:!0,height:4.2,type:"beam"}}),r("Valley Line E","rail","railDouble",[[360,175],[430,175],[520,175],[600,175]]),r("Skyloop","monorail","monorail",[[150,-150],[0,-150],[-150,-150],[-150,0],[-150,150],[0,150],[150,150],[150,0]],{closed:!0}),r("Lakeshore Shuttle","monorail","monorail",[[150,0],[240,60],[300,180],[285,250],[272,305]]),i.buildingsManual.push({x:28,z:208,w:34,d:15,h:9,rot:0,color:"#7d8ca3",type:"station",windows:!0}),i.buildingsManual.push({x:-28,z:208,w:20,d:12,h:6,rot:0,color:"#a8b0bd",type:"block",windows:!0}),i}function Gm(i,t,e){const n=y=>document.getElementById(y),s=(y,S="",A="")=>{y!==void 0&&(n("statusLeft").textContent=y),S!==void 0&&(n("statusMid").textContent=S),A!==void 0&&(n("statusRight").textContent=A)};let r="all";document.querySelectorAll(".preset-filter button").forEach(y=>{y.onclick=()=>{document.querySelectorAll(".preset-filter button").forEach(S=>S.classList.remove("active")),y.classList.add("active"),r=y.dataset.cat,a()}});function a(){const y=n("presetList");y.innerHTML="";for(const S of Vs()){if(r!=="all"&&S.cat!==r)continue;const A=document.createElement("div");A.className="preset-card"+(i.activePresetId===S.id?" active":"");const C=document.createElement("canvas");Xl(C,S);const b=document.createElement("div");b.className="pinfo",b.innerHTML=`<strong>${S.name}</strong><span>${S.desc}</span>`,A.appendChild(C),A.appendChild(b),A.onclick=E=>{if(E.shiftKey&&i.selection){i.pushUndo("apply preset");const P=i.selection;if(P.type==="road"){const H=i.project.roads.find(F=>F.id===P.id);H&&S.kind==="road"&&(H.presetId=S.id,S.defaultBridge&&(H.bridge={enabled:!0,height:S.bridgeHeight||6,type:"beam"}))}else if(P.type==="rail"){const H=i.project.rails.find(F=>F.id===P.id);H&&(S.kind==="rail"||S.kind==="monorail")&&(H.presetId=S.id,H.kind=S.kind)}i.emit("roads"),c(),a();return}i.setPreset(S.id),S.kind==="rail"?i.setTool("rail"):S.kind==="monorail"?i.setTool("monorail"):S.cat==="bridge"?i.setTool("bridge"):i.setTool("road"),x(),a(),o()},y.appendChild(A)}o()}function o(){const y=ie(i.activePresetId),S=y.kind==="road"?`${y.lanesFwd||0}↑ ${y.lanesBwd||0}↓ · ${(y.laneWidth||0).toFixed(1)}m`:y.kind==="rail"?`${y.tracks} track${y.tracks>1?"s":""}`:`+${y.elevation}m beam`;n("activePreset").innerHTML=`<div class="ap">
      <div class="ap-row"><span>Preset</span><b>${y.name}</b></div>
      <div class="ap-row"><span>Layout</span><b>${S}</b></div>
      <div class="ap-row"><span>Half-width</span><b>${Oe(y).toFixed(1)} m</b></div>
      <div class="ap-row"><span>Design speed</span><b>${y.designSpeed} km/h</b></div>
    </div>`}const l=[["terrain","Terrain"],["water","Water"],["roads","Roads"],["markings","Markings"],["sidewalks","Pavements"],["rails","Rails"],["junctions","Junctions"],["buildings","Buildings"],["trees","Trees"],["grid","Grid"]];function d(){const y=n("layerList");y.innerHTML="";for(const[S,A]of l){const C=document.createElement("label"),b=document.createElement("input");b.type="checkbox",b.checked=!!i.layers[S],b.onchange=()=>{i.layers[S]=b.checked,t.dirty=!0},C.appendChild(b),C.appendChild(document.createTextNode(A)),y.appendChild(C)}}function u(y){const S=Te(i.project,y);let A=0;const C=y.closed?S.length:S.length-1;for(let b=0;b<C;b++)A+=_n(S[b%S.length].x,S[b%S.length].z,S[(b+1)%S.length].x,S[(b+1)%S.length].z);return A}function h(y){const S=Te(i.project,y);if(!S.length)return;const A=S.reduce((b,E)=>b+E.x,0)/S.length,C=S.reduce((b,E)=>b+E.z,0)/S.length;t.focus(A,C,Math.max(t.cam.scale,1.6))}function c(){var C,b,E,P,H,F;const y=n("propsPanel"),S=i.selection;y.innerHTML="";const A=(L,W)=>{const z=document.createElement("button");return z.className="mini",z.textContent=L,z.onclick=W,z};if(!S){const L=i.project;y.innerHTML=`<div class="prop"><label>Project name</label><input id="projName" value="${(L.name||"").replace(/"/g,"&quot;")}" /></div>
        <div class="stat-row"><span>Roads</span><b>${L.roads.length}</b></div>
        <div class="stat-row"><span>Rails / monorails</span><b>${(L.rails||[]).length}</b></div>
        <div class="stat-row"><span>Nodes</span><b>${Object.keys(L.nodes).length}</b></div>
        <div class="stat-row"><span>Roundabouts</span><b>${(L.roundabouts||[]).length}</b></div>`,y.querySelector("#projName").onchange=z=>{L.name=z.target.value};const W=document.createElement("div");W.className="prop-row",W.appendChild(A("🔗 Merge now",()=>{i.pushUndo("auto-merge");const z=Pn(L);i.emit("roads"),_(),s(`Merged ${z.merged} crossings`,"","")})),W.appendChild(A("⌖ Fit city",()=>t.focus(0,60,.85))),y.appendChild(W);return}if(S.type==="road"){const L=i.project.roads.find(O=>O.id===S.id);if(!L){i.selection=null,c();return}const W=ie(L.presetId);y.innerHTML=`
        <div class="prop"><label>Name</label><input id="pName" value="${L.name.replace(/"/g,"&quot;")}" /></div>
        <div class="prop"><label>Preset</label><select id="pPreset">${Vs().filter(O=>O.kind==="road").map(O=>`<option value="${O.id}" ${O.id===L.presetId?"selected":""}>${O.name}</option>`).join("")}</select></div>
        <div class="stat-row"><span>Length</span><b>${u(L).toFixed(0)} m</b></div>
        <div class="stat-row"><span>Width</span><b>${(Oe(W)*2).toFixed(1)} m</b></div>
        <div class="prop-grid">
          <div class="prop"><label>Bridge?</label><input id="pBridge" type="checkbox" ${(C=L.bridge)!=null&&C.enabled?"checked":""} /></div>
          <div class="prop"><label>Clearance (m)</label><input id="pBH" type="number" step="0.5" min="0" max="30" value="${((b=L.bridge)==null?void 0:b.height)??6}" /></div>
          <div class="prop"><label>Bridge type</label><select id="pBT"><option value="beam" ${((E=L.bridge)==null?void 0:E.type)==="beam"?"selected":""}>beam</option><option value="arch" ${((P=L.bridge)==null?void 0:P.type)==="arch"?"selected":""}>arch</option></select></div>
          <div class="prop"><label>Smooth curve</label><input id="pSmooth" type="checkbox" ${L.smooth!==!1?"checked":""} /></div>
        </div>`;const z=()=>{i.pushUndo("edit road")};y.querySelector("#pName").onchange=O=>{z(),L.name=O.target.value,i.emit("roads")},y.querySelector("#pPreset").onchange=O=>{z(),L.presetId=O.target.value;const J=ie(L.presetId);J.defaultBridge&&(L.bridge={enabled:!0,height:J.bridgeHeight||6,type:"beam"}),i.emit("roads"),c()},y.querySelector("#pBridge").onchange=O=>{var J,nt;z(),L.bridge={...L.bridge||{},enabled:O.target.checked,height:((J=L.bridge)==null?void 0:J.height)??6,type:((nt=L.bridge)==null?void 0:nt.type)||"beam"},i.emit("roads"),_()},y.querySelector("#pBH").onchange=O=>{z(),L.bridge={...L.bridge||{},height:Number(O.target.value)},i.emit("roads")},y.querySelector("#pBT").onchange=O=>{z(),L.bridge={...L.bridge||{},type:O.target.value},i.emit("roads")},y.querySelector("#pSmooth").onchange=O=>{z(),L.smooth=O.target.checked,i.emit("roads")};const q=document.createElement("div");q.className="prop-row",q.appendChild(A("✂ Split mid",()=>{L.nodeIds.length<3||L.closed||(i.pushUndo("split road"),$l(i.project,L.id,Math.floor(L.nodeIds.length/2)),i.emit("roads"),c())})),q.appendChild(A("⌖ Zoom",()=>h(L))),q.appendChild(A("🗑 Delete",()=>{i.pushUndo("delete road"),i.deleteRoad(L.id),i.emit("roads"),c()})),y.appendChild(q);return}if(S.type==="rail"){const L=i.project.rails.find(z=>z.id===S.id);if(!L){i.selection=null,c();return}y.innerHTML=`
        <div class="prop"><label>Name</label><input id="pName" value="${L.name.replace(/"/g,"&quot;")}" /></div>
        <div class="prop"><label>Preset</label><select id="pPreset">${Vs().filter(z=>z.kind!=="road").map(z=>`<option value="${z.id}" ${z.id===L.presetId?"selected":""}>${z.name}</option>`).join("")}</select></div>
        <div class="stat-row"><span>Type</span><b>${L.kind}</b></div>
        <div class="prop-grid">
          <div class="prop"><label>Viaduct?</label><input id="pBridge" type="checkbox" ${(H=L.bridge)!=null&&H.enabled?"checked":""} /></div>
          <div class="prop"><label>Clearance</label><input id="pBH" type="number" step="0.5" min="0" max="20" value="${((F=L.bridge)==null?void 0:F.height)??4}" /></div>
        </div>`,y.querySelector("#pName").onchange=z=>{i.pushUndo("edit rail"),L.name=z.target.value,i.emit("roads")},y.querySelector("#pPreset").onchange=z=>{i.pushUndo("edit rail"),L.presetId=z.target.value,L.kind=ie(L.presetId).kind,i.emit("roads"),c()},y.querySelector("#pBridge").onchange=z=>{var q;i.pushUndo("edit rail"),L.bridge={enabled:z.target.checked,height:((q=L.bridge)==null?void 0:q.height)??4,type:"beam"},i.emit("roads")},y.querySelector("#pBH").onchange=z=>{i.pushUndo("edit rail"),L.bridge={...L.bridge||{},height:Number(z.target.value)},i.emit("roads")};const W=document.createElement("div");W.className="prop-row",W.appendChild(A("⌖ Zoom",()=>{const z=L.nodeIds.map(q=>i.project.nodes[q]).filter(Boolean);z.length&&t.focus(z[0].x,z[0].z,1.4)})),W.appendChild(A("🗑 Delete",()=>{i.pushUndo("delete rail"),i.deleteRail(L.id),i.emit("roads"),c()})),y.appendChild(W);return}if(S.type==="node"){const L=i.project.nodes[S.nodeId];if(!L){i.selection=null,c();return}const W=i.project.roads.filter(O=>O.nodeIds.includes(L.id)).map(O=>O.name);y.innerHTML=`
        <div class="prop-grid">
          <div class="prop"><label>X</label><input id="pX" type="number" step="1" value="${L.x.toFixed(1)}" /></div>
          <div class="prop"><label>Z</label><input id="pZ" type="number" step="1" value="${L.z.toFixed(1)}" /></div>
          <div class="prop"><label>Lift h (m)</label><input id="pH" type="number" step="0.5" value="${(L.h||0).toFixed(1)}" /></div>
        </div>
        <div class="stat-row"><span>On roads</span><b>${W.length}</b></div>
        <p class="muted" style="font-size:11px;margin:4px 0">Lift raises the road here — use for overpasses, ramps & interchanges.</p>`;const z=()=>{i.pushUndo("edit node"),L.x=Number(y.querySelector("#pX").value),L.z=Number(y.querySelector("#pZ").value),L.h=Number(y.querySelector("#pH").value),i.emit("roads")};y.querySelector("#pX").onchange=z,y.querySelector("#pZ").onchange=z,y.querySelector("#pH").onchange=z;const q=document.createElement("div");q.className="prop-row",q.appendChild(A("⌖ Zoom",()=>t.focus(L.x,L.z,3))),q.appendChild(A("🗑 Delete",()=>{i.pushUndo("delete node"),i.deleteNode(L.id),i.selection=null,i.emit("roads"),c()})),y.appendChild(q);return}if(S.type==="roundabout"){const L=i.project.roundabouts.find(z=>z.id===S.id);if(!L){i.selection=null,c();return}y.innerHTML=`
        <div class="stat-row"><span>Position</span><b>${L.x.toFixed(0)}, ${L.z.toFixed(0)}</b></div>
        <div class="prop"><label>Radius (m)</label><input id="pR" type="number" step="1" min="9" max="30" value="${L.radius}" /></div>
        <p class="muted" style="font-size:11px">Draw roads snapping to the 4 edge nodes to connect streets.</p>`,y.querySelector("#pR").onchange=z=>{i.pushUndo("edit roundabout");const q=Number(z.target.value),O=q/L.radius;L.radius=q;for(const J of L.nodeIds||[]){const nt=i.project.nodes[J];nt&&(nt.x=L.x+(nt.x-L.x)*O,nt.z=L.z+(nt.z-L.z)*O)}i.emit("roads")};const W=document.createElement("div");W.className="prop-row",W.appendChild(A("⌖ Zoom",()=>t.focus(L.x,L.z,3))),W.appendChild(A("🗑 Delete",()=>{i.pushUndo("delete roundabout"),i.project.roundabouts=i.project.roundabouts.filter(z=>z.id!==L.id),i.selection=null,i.emit("roads"),c()})),y.appendChild(W);return}}let p=null;function _(){const y=n("validationList");let S;try{S=Zl(i.project)}catch{y.innerHTML='<p class="muted">—</p>';return}y.innerHTML="";for(const A of S.issues.slice(0,30)){const C=document.createElement("div");C.className="issue "+(A.level==="err"?"err":A.level==="warn"?"warn":"ok"),C.textContent=A.msg,A.x!==void 0?C.onclick=()=>t.focus(A.x,A.z,2.2):A.roadId&&(C.onclick=()=>{i.selection={type:"road",id:A.roadId},c()}),y.appendChild(C)}s(void 0,`${S.junctions.length} junctions · ${S.crossings} open crossings`,`${i.project.roads.length} roads · ${(i.project.rails||[]).length} rails`)}function g(){clearTimeout(p),p=setTimeout(_,400)}function f(){const y=n("terrainPanel"),S=i.project.settings;y.innerHTML=`
      <div class="prop"><label>Water level: <b id="wlVal">${(S.waterLevel??1.25).toFixed(2)} m</b></label>
      <input id="wl" type="range" min="-1" max="5" step="0.05" value="${S.waterLevel??1.25}" /></div>
      <div class="prop"><label>Brush size: <b id="bsVal">${i.brush.size} m</b></label>
      <input id="bs" type="range" min="10" max="130" step="2" value="${i.brush.size}" /></div>
      <div class="prop"><label>Brush strength: <b id="btVal">${i.brush.strength}</b></label>
      <input id="bt" type="range" min="1" max="10" step="1" value="${i.brush.strength}" /></div>
      <div class="prop-row"><button class="mini" id="btnClearEdits">Clear sculpting (${(i.project.terrainEdits||[]).length})</button></div>`,y.querySelector("#wl").oninput=A=>{S.waterLevel=Number(A.target.value),y.querySelector("#wlVal").textContent=S.waterLevel.toFixed(2)+" m",v()},y.querySelector("#bs").oninput=A=>{i.brush.size=Number(A.target.value),y.querySelector("#bsVal").textContent=i.brush.size+" m"},y.querySelector("#bt").oninput=A=>{i.brush.strength=Number(A.target.value),y.querySelector("#btVal").textContent=i.brush.strength},y.querySelector("#btnClearEdits").onclick=()=>{i.pushUndo("clear sculpting"),i.project.terrainEdits=[],i.emit("terrain"),f()}}let m=null;function v(){clearTimeout(m),m=setTimeout(()=>i.emit("terrain"),200)}function M(y,S){const A=y._total;n("meshStats").innerHTML=`
      <div class="stat-row"><span>Quads</span><b>${A.quads.toLocaleString()}</b></div>
      <div class="stat-row"><span>Tris</span><b>${A.tris.toLocaleString()}</b></div>
      <div class="stat-row"><span>Verts</span><b>${A.verts.toLocaleString()}</b></div>
      <div class="stat-row"><span>Road / junction quads</span><b>${(y.asphalt.quads+y.junction.quads).toLocaleString()}</b></div>
      <div class="stat-row"><span>Marking quads</span><b>${y.marking.quads.toLocaleString()}</b></div>
      <div class="stat-row"><span>Buildings / trees</span><b>${S.buildings} / ${S.trees}</b></div>
      <div class="stat-row"><span>Build time</span><b>${S.ms} ms</b></div>`;const C=document.getElementById("stats3d");C.textContent=`${A.quads.toLocaleString()} quads · ${S.junctions} junctions · ${S.crossings} level crossings · drag = orbit`,C.classList.add("show"),clearTimeout(C._t),C._t=setTimeout(()=>C.classList.remove("show"),5e3)}function x(){document.querySelectorAll("#toolGroup .tool-btn").forEach(S=>{S.classList.toggle("active",S.dataset.tool===i.tool)});const y={select:"Select — click road/node · drag = pan · dbl-click road = insert node",road:"Road — click points · snap to green rings · dbl-click/Enter = done",rail:"Rail — click points · dbl-click/Enter = done",monorail:"Monorail — click points · dbl-click/Enter = done",bridge:"Bridge — draws elevated road with piers",roundabout:"Roundabout — click to place",terrainUp:"Raise — drag to sculpt hills",terrainDown:"Lower — drag to dig",water:"Water — drag to carve lakes",erase:"Erase — click road / node / rail"};n("toolStatus").textContent=y[i.tool]||i.tool,s(`${i.tool} · ${ie(i.activePresetId).name}`)}return document.querySelectorAll("#toolGroup .tool-btn").forEach(y=>{y.onclick=()=>{i.setTool(y.dataset.tool),x()}}),n("btnUndo").onclick=()=>{i.undo(),c(),_(),f()},n("btnRedo").onclick=()=>{i.redo(),c(),_(),f()},n("btnSnap").onclick=y=>{i.snap=!i.snap,y.target.classList.toggle("active",i.snap)},n("btnAutoMerge").onclick=y=>{i.project.settings.autoMerge=i.project.settings.autoMerge===!1,y.target.classList.toggle("active",i.project.settings.autoMerge!==!1),i.project.settings.autoMerge&&(i.pushUndo("auto-merge"),Pn(i.project),i.emit("roads"))},n("btnFollowTerrain").onclick=y=>{i.project.settings.followTerrain=i.project.settings.followTerrain===!1,y.target.classList.toggle("active",i.project.settings.followTerrain!==!1),i.emit("terrain")},n("btnDemo").onclick=()=>{if(confirm("Load the demo city? Current work will be replaced.")){i.pushUndo("load demo"),i.project=Ll();try{Pn(i.project),Pn(i.project)}catch{}i.selection=null,t.focus(0,60,.85),i.emit("all"),c(),_(),f()}},n("btnClear").onclick=()=>{confirm("Start a new empty project?")&&(i.pushUndo("new project"),i.project=da("Untitled network"),i.selection=null,i.emit("all"),c(),_(),f())},n("btnSave").onclick=()=>km(i.project),n("btnLoad").onclick=()=>n("fileInput").click(),n("fileInput").onchange=async y=>{const S=y.target.files[0];if(S){try{const A=await Bm(S);i.pushUndo("load project"),i.project=A,i.selection=null,i.emit("all"),c(),_(),f(),s(`Loaded ${S.name}`)}catch(A){alert("Could not load project: "+A.message)}y.target.value=""}},n("btnOBJ").onclick=()=>Vm(i.project,y=>s(y)),n("btnValidate").onclick=_,n("tglCars").onchange=y=>{e.showCars=y.target.checked},n("tglTrains").onchange=y=>{e.showTrains=y.target.checked},n("tglWire").onchange=y=>{e.setWireframe(y.target.checked)},n("btnFlyover").onclick=y=>{e.flyover=!e.flyover,e.controls.enabled=!e.flyover,y.target.textContent=e.flyover?"⏹ Stop":"✈ Flyover"},window.addEventListener("keydown",y=>{if(y.target.tagName==="INPUT"||y.target.tagName==="SELECT")return;const S=y.key.toLowerCase();if((y.ctrlKey||y.metaKey)&&S==="z"&&!y.shiftKey){y.preventDefault(),i.undo(),c(),_();return}if((y.ctrlKey||y.metaKey)&&(S==="y"||S==="z"&&y.shiftKey)){y.preventDefault(),i.redo(),c(),_();return}const A={v:"select",r:"road",t:"rail",m:"monorail",b:"bridge",o:"roundabout",u:"terrainUp",j:"terrainDown",w:"water"};if(A[S])i.setTool(A[S]),x();else if(S==="enter")t.finishDraft();else if(S==="escape")t.cancelDraft();else if((S==="delete"||S==="backspace")&&i.selection){const C=i.selection;i.pushUndo("delete"),C.type==="road"?i.deleteRoad(C.id):C.type==="rail"?i.deleteRail(C.id):C.type==="node"?i.deleteNode(C.nodeId):C.type==="roundabout"&&(i.project.roundabouts=i.project.roundabouts.filter(b=>b.id!==C.id)),i.selection=null,i.emit("roads"),c()}}),i.subscribe(y=>{(y==="all"||y==="roads")&&(c(),g()),(y==="tool"||y==="preset")&&x(),y==="all"&&f()}),a(),d(),c(),_(),f(),x(),{renderProps:c,renderValidation:_,renderTerrainPanel:f,updateMeshStats:M,status:s}}const In=Wl();try{In.project=Ll(),Pn(In.project),Pn(In.project)}catch(i){console.error("Demo build failed",i)}In.cam2d={cx:0,cz:60,scale:.85};const Bo=document.getElementById("hint2d"),Wm=new Ql(document.getElementById("canvas2d"),In,{onHint:i=>{Bo.textContent=i,Bo.classList.toggle("show",!!i)},onSelect:()=>Ta.renderProps()}),Xm=new Om(document.getElementById("viewport3d"),In,{onStats:(i,t)=>Ta.updateMeshStats(i,t)}),Ta=Gm(In,Wm,Xm);{const i=document.getElementById("splitter"),t=document.getElementById("pane2d");let e=null;i.addEventListener("pointerdown",n=>{e={x:n.clientX,w:t.getBoundingClientRect().width},i.setPointerCapture(n.pointerId)}),i.addEventListener("pointermove",n=>{if(!e)return;const s=document.getElementById("viewports").getBoundingClientRect().width,r=Math.max(280,Math.min(s-280,e.w+n.clientX-e.x));t.style.width=`${r/s*100}%`}),i.addEventListener("pointerup",()=>{e=null})}In.emit("all");Ta.status("Ready — 2D left · 3D right · pick a preset and draw","Demo city loaded: countryside → city → offroad","");
