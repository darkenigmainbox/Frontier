(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=e(r);fetch(r.href,s)}})();const Ze=(i,t=[],e={})=>({points:i,sipes:t,role:"lug",heightRatio:1,...e}),Ls=(i,t)=>({...i,points:i.points.map(t),sipes:i.sipes.map(e=>e.map(t))}),Tn=(i,t=1)=>Ls(i,([e,n])=>[-e,t-n]),gr=(i,t)=>Ls(i,([e,n])=>[e,n+t]),xs=i=>{const t=Ls(i,([e,n])=>[-e,n]);return t.points.reverse(),t},wo=i=>Ze(i,[],{role:"ejector",family:"ejector",heightRatio:.2}),$h=[{id:"trail-hybrid",name:"Trail hybrid",code:"RT / 05",terrain:"RUGGED HYBRID",source:5,description:"Alternating S-notched and diagonal center pairs, scalloped shoulders and low shoulder-groove bars.",repeats:36,depth:15,width:285,sipeWidth:.95,fitBacking:!0,reference:{title:"Toyo Open Country R/T Trail",url:"https://www.toyotires.com/product/open-country-rt-trail/",image:"/references/trail-hybrid.jpg",photoSource:"https://www.mavis.com/tire-brands/toyo/opencountryrttrail/",photoCredit:"Mavis / Toyo product photograph",note:"Study of the interlocking center blocks and scalloped shoulders. Two repeat variants approximate the layout; the manufacturer’s variable-pitch construction is not reproduced."}},{id:"canyon-rt",name:"Canyon R/T",code:"RT / 06",terrain:"RUGGED HYBRID",source:6,description:"Broader staggered center blocks in winding channels, stepped shoulders and clipped medial notches.",repeats:36,depth:15,width:285,sipeWidth:.95,fitBacking:!0,reference:{title:"Falken Wildpeak R/T",url:"https://www.falkentire.com/wildpeak/rt",image:"/references/canyon-rt.jpg",photoSource:"https://www.wranglerforum.com/threads/new-falken-wildpeak-r-t.2453363/",photoCredit:"Wildpeak R/T owner photo / Wrangler Forum",note:"A simplified study of the dense center layout and open, offset shoulders. Internal support construction and sidewall branding are not modeled."}},{id:"baja-interlock",name:"Baja interlock",code:"AT / 07",terrain:"DENSE ALL-TERRAIN",source:7,description:"Angled interlocking center blocks, winding channels, serrated shoulders and zigzag sipes.",repeats:44,depth:11,width:275,sipeWidth:.75,fitBacking:!0,reference:{title:"BFGoodrich All-Terrain T/A KO3",url:"https://www.bfgoodrichtires.com/auto/tire-highlights/all-terrain-t-a-ko3",image:"/references/baja-interlock.jpg",photoSource:"https://www.ovrmag.com/vehicle-gear/bfgoodrich-all-terrain-ko3-review-evolution-of-an-icon/965.article",photoCredit:"KO3 photograph / OVR Magazine",note:"An interpretation of the compact interlocking footprint. These are shallow polygon-cut sipes, not a reproduction of the manufacturer’s full-depth locking 3D sipe technology."}},{id:"rock-cleat",name:"Rock cleat M/T",code:"MT / 08",terrain:"OPEN MUD-TERRAIN",source:8,description:"Slanted shoulder bars and wider paired center cleats with elbow sipes, open channels and low ejectors.",repeats:30,depth:18,width:305,sipeWidth:1.1,fitBacking:!0,reference:{title:"Maxxis RAZR MT",url:"https://www.maxxis.com/us/tire/razr-mt/",image:"/references/rock-cleat.webp",photoSource:"https://www.motortrend.com/reviews/1712-looks-are-deceiving-when-it-comes-to-the-maxxis-razr-mt",photoCredit:"RAZR MT tread photograph / MotorTrend",note:"Study of the large sculpted cleats and open shoulder channels. The mesh is a visual approximation and does not reproduce the casing, compound or sidewall construction."}}];function Yh(i){const t=Ze([[-.5,.055],[-.356,.035],[-.299,.115],[-.282,.3],[-.3,.48],[-.282,.57],[-.303,.84],[-.367,.9],[-.5,.82],[-.5,.62],[-.48,.6],[-.48,.29],[-.5,.26]],[[[-.477,.31],[-.411,.32],[-.359,.36],[-.31,.35]],[[-.478,.61],[-.408,.62],[-.344,.69],[-.307,.68]]],{role:"shoulder",family:"shoulder"}),e=i%2?Ze([[-.299,.09],[-.223,.015],[-.105,.16],[-.014,.36],[-.014,.53],[-.082,.58],[-.161,.89],[-.243,.76],[-.215,.6],[-.291,.43]],[[[-.27,.19],[-.207,.14],[-.135,.26],[-.072,.39]],[[-.251,.45],[-.176,.52],[-.179,.67],[-.151,.72]]],{family:"diagonal"}):Ze([[-.298,.2],[-.127,.025],[.019,.21],[.019,.36],[-.061,.42],[-.043,.56],[-.183,.925],[-.288,.73],[-.199,.51],[-.133,.45],[-.174,.31],[-.275,.39]],[[[-.258,.21],[-.141,.1],[-.043,.25]],[[-.262,.71],[-.197,.78],[-.109,.57]]],{family:"notched-center"}),n=wo([[-.454,.949],[-.351,.971],[-.353,1.014],[-.456,.992]]),r=Ls(t,([s,o])=>[-.5+(s+.5)*.77,o]);return[r,Tn(r,1.27),e,Tn(e),n,Tn(n,1.27)]}function qh(i){const t=Ze([[-.5,.06],[-.348,.04],[-.3,.14],[-.307,.34],[-.338,.37],[-.337,.45],[-.3,.47],[-.305,.82],[-.367,.91],[-.5,.86],[-.5,.67],[-.48,.62],[-.48,.28],[-.5,.24]],[[[-.478,.3],[-.42,.29],[-.402,.33],[-.373,.3],[-.336,.33]],[[-.477,.61],[-.41,.61],[-.385,.67],[-.328,.66]]],{role:"shoulder",family:"shoulder"}),e=Ze([[-.273,.08],[-.128,.12],[-.128,.27],[-.107,.32],[-.12,.67],[-.158,.85],[-.267,.68],[-.239,.44],[-.273,.38]],[[[-.249,.28],[-.196,.31],[-.18,.28],[-.137,.36]],[[-.249,.56],[-.202,.6],[-.173,.56],[-.141,.62]]],{family:"intermediate"});let n=Ze([[-.067,.06],[.036,-.025],[.088,.14],[.073,.44],[.049,.49],[.071,.55],[.041,.92],[-.062,.91],[-.092,.62],[-.072,.42],[-.095,.3]],[[[-.029,.2],[.011,.28],[.025,.25],[.064,.32]],[[-.065,.48],[-.012,.58],[.007,.55],[.054,.68]]],{family:"center"});return i%2&&(n=xs(n)),[t,Tn(t,1.3),...[e,gr(xs(e),.46),n].map(r=>Fc(r,.025))]}function jh(i){const t=Ze([[-.5,.035],[-.377,.035],[-.329,.14],[-.335,.32],[-.354,.34],[-.354,.43],[-.327,.46],[-.335,.77],[-.372,.9],[-.5,.84],[-.5,.64],[-.482,.61],[-.482,.29],[-.5,.25]],[[[-.484,.27],[-.442,.28],[-.43,.23],[-.414,.29],[-.357,.31]],[[-.484,.5],[-.438,.51],[-.427,.46],[-.409,.53],[-.353,.55]],[[-.48,.73],[-.44,.73],[-.427,.69],[-.399,.76],[-.367,.77]]],{role:"shoulder",family:"shoulder"}),e=Ze([[-.302,.035],[-.194,-.02],[-.111,.13],[-.098,.33],[-.145,.41],[-.13,.53],[-.102,.6],[-.111,.77],[-.23,.93],[-.302,.76],[-.263,.53],[-.302,.37]],[[[-.284,.23],[-.239,.26],[-.221,.2],[-.185,.27],[-.125,.28]],[[-.28,.64],[-.239,.67],[-.22,.62],[-.183,.7],[-.128,.69]]],{family:"interlock"});let n=Ze([[-.03,.025],[.072,.18],[.07,.4],[.041,.44],[.044,.54],[.074,.58],[.043,.91],[-.065,.8],[-.076,.56],[-.043,.52],[-.049,.41],[-.08,.36]],[[[-.045,.23],[-.004,.29],[.013,.25],[.058,.32]],[[-.058,.61],[-.013,.67],[.005,.62],[.05,.73]]],{family:"center"});return i%2&&(n=xs(n)),[t,Tn(t,1.25),...[e,gr(xs(e),.39),gr(n,.18)].map(r=>Fc(r,.009))]}function Fc(i,t){const e=([r,s])=>[r+t*Math.sin(2*Math.PI*s),s],n=[];return i.points.forEach((r,s)=>{const o=i.points[(s+1)%i.points.length],a=Math.max(1,Math.ceil(Math.abs(o[1]-r[1])/.07));for(let l=0;l<a;l++)n.push(e([r[0]+(o[0]-r[0])*l/a,r[1]+(o[1]-r[1])*l/a]))}),{...i,points:n,sipes:i.sipes.map(r=>r.map(e))}}function Zh(){const i=Ze([[-.5,-.1],[-.335,.04],[-.267,.23],[-.267,.51],[-.295,.91],[-.36,.86],[-.5,.64],[-.5,.47],[-.483,.45],[-.483,.1],[-.5,.08]],[[[-.476,.235],[-.364,.44],[-.317,.5],[-.291,.34]]],{role:"shoulder",family:"shoulder"}),t=Ze([[-.234,.225],[-.087,.025],[-.018,.125],[-.018,.55],[-.089,.87],[-.217,.72],[-.239,.47]],[[[-.19,.52],[-.137,.3],[-.05,.43]]],{family:"cleat"}),e=wo([[-.465,.805],[-.385,.948],[-.389,.983],[-.469,.84]]),n=wo([[-.362,.975],[-.294,1.065],[-.298,1.105],[-.366,1.015]]);return[i,Tn(i,1.12),t,Tn(t,1.07),e,Tn(e,1.12),gr(n,-.045),Tn(gr(n,-.045),1.12)]}function Kh(i,t=0){if(i==="trail-hybrid")return Yh(t);if(i==="canyon-rt")return qh(t);if(i==="baja-interlock")return jh(t);if(i==="rock-cleat")return Zh();throw new Error(`Unknown pattern: ${i}`)}const nn=(i,t=[],e={})=>({points:i,sipes:t,role:"lug",heightRatio:1,...e}),_r=(i,t)=>({...i,points:i.points.map(t),sipes:i.sipes.map(e=>e.map(t))}),Jh=(i,t=0)=>{const e=_r(i,([n,r])=>[-n,r+t]);return e.points.reverse(),e},Oc=(i,t)=>_r(i,([e,n])=>[e,n+t]);function hn(i,t,e,n=5){return Array.from({length:n+1},(r,s)=>{const o=s/n,a=1-o;return[a*a*i[0]+2*a*o*t[0]+o*o*e[0],a*a*i[1]+2*a*o*t[1]+o*o*e[1]]})}function Or(i,t,e,n){return nn([...i,...i.map(([r,s])=>[r,s+t]).reverse()],e,n)}const vr=7,pe=[{id:"highway",name:"Highway",code:"HT / 01",terrain:"ROAD",description:"Asymmetric five-rib road pattern, four straight channels, fine diagonal cuts and swept shoulders.",repeats:56,depth:8,width:235,source:1,sipeWidth:.75},{id:"all-terrain",name:"All-terrain",code:"AT / 02",terrain:"MIXED",description:"Dense stepped shoulder blocks and broad, interlocking diagonal center lugs.",repeats:40,depth:12,width:265,source:2,sipeWidth:.9},{id:"rugged",name:"Rugged terrain",code:"RT / 03",terrain:"OFF-ROAD",description:"Mirrored shoulder, diagonal and upright lug pairs around a symmetric double-notched center block.",repeats:32,depth:16,width:285,source:3,sipeWidth:1},{id:"mud",name:"Mud terrain",code:"MT / 04",terrain:"DEEP MUD",description:"Hooked shoulder paddles, broad flat-ended center blocks and open staggered channels with low ejector bars.",repeats:32,depth:20,width:305,source:4,sipeWidth:1.1},...$h];function Qh(){const i=[...hn([-.5,.56],[-.435,.58],[-.37,.46]),...hn([-.37,.46],[-.31,.24],[-.253,.035]).slice(1)],t=[...hn([.263,.17],[.33,.11],[.39,.25]),...hn([.39,.25],[.46,.49],[.5,.48]).slice(1)];return[Or(i,.86,[[...hn([-.501,1.06],[-.43,1.06],[-.369,.87]),[-.304,.64]],[[-.473,.71],[-.42,.67],[-.378,.55]]],{role:"shoulder"}),nn([[-.219,0],[-.107,0],[-.107,.2],[-.137,.38],[-.107,.28],[-.107,.75],[-.134,.88],[-.107,.81],[-.107,1],[-.219,1],[-.219,.67],[-.185,.46],[-.219,.59]],[[[-.22,.27],[-.19,.13]],[[-.109,.57],[-.149,.77]]],{role:"rib",continuous:!0}),Or([[-.074,.45],[.01,.17],[.07,-.07]],.95,[[[-.075,.89],[-.019,.66],[.071,.4]]],{role:"rib"}),Or([[.105,.16],[.158,.02],[.225,-.26]],.9,[[[.104,.6],[.162,.43],[.224,.24]]],{role:"rib"}),Or(t,.85,[[[.262,.64],[.323,.61],[.365,.44],[.4,.27],[.448,.23]],[[.4,1.01],[.443,.86],[.501,.86]]],{role:"shoulder"})]}function tu(){const i=nn([[-.5,.04],[-.352,.04],[-.3,.13],[-.284,.29],[-.3,.51],[-.285,.7],[-.319,.92],[-.472,.88],[-.5,.79],[-.5,.65],[-.481,.62],[-.481,.28],[-.5,.25]],[[[-.5,.3],[-.401,.3],[-.347,.34],[-.304,.39]],[[-.5,.65],[-.403,.65],[-.351,.69],[-.292,.75]]],{role:"shoulder"}),t=nn([[-.27,.03],[-.166,.26],[-.142,.36],[-.118,.31],[-.028,.61],[-.005,.74],[-.005,1.42],[-.069,1.29],[-.071,1.1],[-.112,1.05],[-.111,1.17],[-.178,.99],[-.27,.84]],[[[-.25,.29],[-.199,.42],[-.179,.39],[-.087,.68],[-.028,.79]],[[-.252,.64],[-.192,.75],[-.174,.71],[-.103,.93],[-.035,1.07]]]),e=nn([[.025,.08],[.101,.2],[.151,.34],[.168,.3],[.271,.54],[.271,1.31],[.19,1.17],[.16,1.23],[.1,1.02],[.12,.96],[.063,.8],[.025,.81]],[[[.033,.36],[.099,.44],[.125,.41],[.232,.69]],[[.06,.64],[.124,.79],[.15,.75],[.249,1.03]]]),n=r=>{const s=([a,l])=>[a+.021*(1-Math.abs(a)/.28)*Math.sin(2*Math.PI*l),l],o=[];return r.points.forEach((a,l)=>{const c=r.points[(l+1)%r.points.length],u=Math.max(1,Math.ceil(Math.abs(c[1]-a[1])/.1));for(let h=0;h<u;h++)o.push(s([a[0]+(c[0]-a[0])*h/u,a[1]+(c[1]-a[1])*h/u]))}),{...r,points:o,sipes:r.sipes.map(a=>a.map(s))}};return[i,Jh(i,.32),n(t),n(e)]}const si=(i,t=.5)=>({..._r(i,([e,n])=>[-e,2*t-n]),instance:"opposed"});function eu(i){const t=(c,u,h,d,f={})=>_r(nn(c,u,{family:d,instance:"source",...f}),([g,_])=>[(g-188)/316,(_-h)/80]),e=t([[30,205],[73,204],[93,210],[97,224],[95,241],[89,242],[87,263],[65,261],[32,259],[30,245]],[[[41,218],[54,218],[64,222],[69,220],[83,224]],[[40,237],[51,238],[62,242],[67,240],[80,244]]],195,"shoulder",{role:"shoulder"}),n=t([[113,241],[144,234],[150,261],[136,271],[142,274],[158,265],[173,282],[184,301],[157,310],[137,288],[111,274]],[[[116,252],[132,252],[136,258],[144,256]],[[137,281],[152,292],[158,288],[173,297]]],243,"diagonal"),r=[e,si(e)];if(!(i%2))return[...r,n,si(n)];const s=t([[110,288],[132,302],[151,324],[148,344],[138,377],[120,386],[117,359],[102,352],[101,333],[124,342],[126,333],[108,321],[104,309]],[[[113,302],[126,312],[128,317],[140,327]],[[109,346],[129,355],[132,365]]],320,"upright"),o=[[-14,-39],[20,-50],[34,-16],[25,13],[16,-10],[8,-8]],a=[[23,-34],[8,-23],[1,-26],[-8,-18]],l=_r(nn([...o,...o.map(([c,u])=>[-c,-u])],[a,a.map(([c,u])=>[-c,-u])],{family:"center",instance:"self-mirrored"}),([c,u])=>[c/316,.5+u/80]);return[...r,s,l,si(s)]}const Br=.825;function nu(){const i=nn([...hn([-.5,.79],[-.455,.85],[-.35,.535]),...hn([-.35,.535],[-.278,.245],[-.207,.06]).slice(1),[-.17,.115],[-.14,.3],[-.16,.51],[-.21,.64],...hn([-.21,.64],[-.285,.88],[-.39,1.3]).slice(1),...hn([-.39,1.3],[-.47,1.51],[-.5,1.36]).slice(1)],[[...hn([-.48,1.055],[-.431,1.166],[-.35,.88]),[-.261,.532],[-.213,.435],[-.178,.506]]],{role:"shoulder",family:"shoulder",instance:"source"}),t=Oc(nn([[-.2,.015],[-.083,.17],[.031,.96],[-.094,.85],[-.16,.41]],[[[-.172,.18],[-.12,.32],[-.063,.61],[-.088,.663]]],{family:"center",instance:"source"}),.65),e=nn([[-.476,1.515],[-.385,1.345],[-.381,1.395],[-.472,1.565]],[],{role:"ejector",family:"outer-ejector",instance:"source",heightRatio:.24}),n=nn([[-.365,1.24],[-.285,.94],[-.28,.99],[-.36,1.29]],[],{role:"ejector",family:"inner-ejector",instance:"source",heightRatio:.24});return[i,si(i,Br),t,si(t,Br),e,si(e,Br),n,si(n,Br)]}function Pa(i,t=0){return i==="highway"?Qh():i==="all-terrain"?tu():i==="rugged"?eu(t):i==="mud"?nu():Kh(i,t)}const Bc={shoulder:"#e64943",upright:"#fff2c1",center:"#58b94a",diagonal:"#e69a36"},zc={shoulder:"#e69a36",center:"#58b94a","outer-ejector":"#fff2c1","inner-ejector":"#92cdd8"};function kc(i,t=4,{annotate:e=!1}={}){const n=pe.find(l=>l.id===i);if(!n)throw new Error(`Unknown pattern: ${i}`);const r=160*(2*Math.PI*340/n.repeats)/n.width,s=i==="rugged"?Bc:i==="mud"?zc:null;let o="";const a=l=>l.map(([c,u],h)=>`${h?"L":"M"}${(c+.5)*160},${u*r}`).join(" ");for(let l=-2;l<t+2;l++)for(const c of Pa(i,(l%2+2)%2)){const u=Oc(c,l);o+=`<path d="${a(u.points)}Z" data-family="${u.family??u.role}" fill="currentColor" opacity="${u.role==="ejector"?.4:1}"/>`;for(const h of u.sipes)o+=`<path d="${a(h)}" fill="none" stroke="var(--diagram-bg, #eceeea)" stroke-width="${160*n.sipeWidth/n.width}" stroke-linejoin="round"/>`;e&&s&&(o+=`<path d="${a(u.points)}Z" fill="none" stroke="${s[u.family]}" stroke-width=".7" stroke-linejoin="round"/>`)}return`<svg viewBox="0 0 160 ${t*r}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${o}</svg>`}const iu=["none","width","travel","point","both"],ze=i=>structuredClone(i),Ao=()=>`shape-${crypto.randomUUID()}`,Fn=i=>String(i).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),cl=i=>i.map(t=>t.map(e=>e.toFixed(7)).join(",")).sort().join(";"),sr=i=>JSON.stringify([cl(i.points),i.sipes.map(cl).sort(),i.role,i.heightRatio,!!i.continuous]),gi=(i,t)=>i.reduce((e,n)=>e+n[t],0)/i.length,ys=()=>({mode:"none",axisX:0,axisY:.5,stagger:0});function ur(i,t){return{...i,points:i.points.map(t),sipes:i.sipes.map(e=>e.map(t))}}function La(i){const{mode:t,axisX:e,axisY:n,stagger:r}=i.mirror,s=[["source",([a,l])=>[a,l]]];(t==="width"||t==="both")&&s.push(["width",([a,l])=>[2*e-a,l+r]]),(t==="travel"||t==="both")&&s.push(["travel",([a,l])=>[a,2*n-l+r]]),(t==="point"||t==="both")&&s.push(["point",([a,l])=>[2*e-a,2*n-l+r]]);const o=new Set;return s.map(([a,l])=>({...ur(i,l),instance:a,sourceId:i.id})).filter(a=>{const l=sr(a);return o.has(l)?!1:(o.add(l),!0)})}function Ms(i,t=0){return i.shapes.filter(e=>e.enabled&&(e.phase==="both"||Number(e.phase)===t%2)).flatMap(La)}function Os(i){const t=pe.find(n=>n.id===i);if(!t)throw new Error("Unknown preset");const e=[];for(const n of[0,1])for(const r of Pa(i,n)){const s=e.find(o=>o.phase==="0"&&n===1&&sr(o)===sr(r));if(s){s.phase="both";continue}e.push({...ze(r),id:`shape-${e.length+1}`,name:`${r.family||r.role} ${e.length+1}`,phase:String(n),enabled:!0,mirror:ys()})}for(let n=0;n<e.length;n++){const r=e[n];for(let s=n+1;s<e.length;s++){const o=e[s];if(r.phase!==o.phase||r.points.length!==o.points.length)continue;const a=(gi(r.points,0)+gi(o.points,0))/2;if(Math.abs(a)>1e-6)continue;const c=[{mode:"point",axisX:0,axisY:(gi(r.points,1)+gi(o.points,1))/2,stagger:0},{mode:"width",axisX:0,axisY:.5,stagger:gi(o.points,1)-gi(r.points,1)}].find(u=>La({...r,mirror:u}).some(h=>h.instance!=="source"&&sr(h)===sr(o)));if(c){r.mirror=c,e.splice(s,1);break}}}return{version:1,presetRevision:vr,name:t.name,preset:i,modified:!1,shapes:e}}function hl(i="block"){const t=i==="chevron"?[[-.22,.15],[-.07,.05],[.08,.35],[-.07,.65],[-.22,.55],[-.07,.35]]:i==="triangle"?[[-.22,.1],[-.03,.35],[-.22,.65]]:[[-.24,.1],[-.07,.1],[-.07,.7],[-.24,.7]];return{id:Ao(),name:i==="ejector"?"Ejector":"New "+i,points:t,sipes:[],role:i==="ejector"?"ejector":"lug",heightRatio:i==="ejector"?.24:1,enabled:!0,phase:"both",mirror:ys()}}const or=(i,t,e)=>(t[0]-i[0])*(e[1]-i[1])-(t[1]-i[1])*(e[0]-i[0]),zr=(i,t,e)=>Math.abs(or(i,t,e))<1e-10&&e[0]>=Math.min(i[0],t[0])-1e-10&&e[0]<=Math.max(i[0],t[0])+1e-10&&e[1]>=Math.min(i[1],t[1])-1e-10&&e[1]<=Math.max(i[1],t[1])+1e-10;function Ro(i){const t=i.reduce((e,n,r)=>{const s=i[(r+1)%i.length];return e+n[0]*s[1]-n[1]*s[0]},0);if(Math.abs(t)<1e-9)return!1;for(let e=0;e<i.length;e++){const n=i[e],r=i[(e+1)%i.length];if(Math.hypot(n[0]-r[0],n[1]-r[1])<1e-8)return!1;for(let s=e+2;s<i.length;s++){if(e===0&&s===i.length-1)continue;const o=i[s],a=i[(s+1)%i.length];if(or(n,r,o)*or(n,r,a)<0&&or(o,a,n)*or(o,a,r)<0||zr(n,r,o)||zr(n,r,a)||zr(o,a,n)||zr(o,a,r))return!1}}return!0}function Ss(i,{geometry:t=!1}={}){if(!i||i.version!==1||typeof i.name!="string"||i.name.length>100||!Array.isArray(i.shapes)||!pe.some(r=>r.id===i.preset))throw new Error("Invalid version-1 tread project");const e=new Set,n=r=>Array.isArray(r)&&r.length===2&&r.every(s=>Number.isFinite(s)&&Math.abs(s)<=100);for(const r of i.shapes){if(typeof r.id!="string"||!/^[-\w]{1,80}$/.test(r.id)||e.has(r.id)||typeof r.name!="string"||r.name.length>100)throw new Error("Invalid or duplicate shape ID / name");if(e.add(r.id),!Array.isArray(r.points)||r.points.length<3||!r.points.every(n)||!Array.isArray(r.sipes)||!r.sipes.every(s=>Array.isArray(s)&&s.length>=2&&s.every(n)))throw new Error(`Invalid points in ${r.name}`);if(!["both","0","1"].includes(r.phase)||typeof r.enabled!="boolean"||!["lug","shoulder","rib","ejector"].includes(r.role)||!Number.isFinite(r.heightRatio)||r.heightRatio<.05||r.heightRatio>1)throw new Error(`Invalid shape settings: ${r.name}`);if(!r.mirror||!iu.includes(r.mirror.mode)||!["axisX","axisY","stagger"].every(s=>Number.isFinite(r.mirror[s])&&Math.abs(r.mirror[s])<=100))throw new Error("Invalid mirror settings");if(t&&r.enabled&&!Ro(r.points))throw new Error(`${r.name}: outline crosses itself or has duplicate/collinear vertices. Edit or undo to repair.`)}return i}function Hc(i,t,{repeats:e=2}={}){const n=t.width,r=2*Math.PI*t.radius/t.repeats,s=pe.find(c=>c.id===i.preset),o=s.sipeWidth*n/s.width,a=c=>c.map(([u,h],d)=>`${d?"L":"M"}${u*n+n/2},${h*r}`).join(" ");let l="";for(let c=-2;c<e+2;c++)for(const u of Ms(i,(c%2+2)%2)){const h=ur(u,([d,f])=>[d,f+c]);l+=`<path d="${a(h.points)}Z" fill="${u.role==="ejector"?"#586574":"#c3ccd4"}"/>`;for(const d of h.sipes)l+=`<path d="${a(d)}" fill="none" stroke="#11151a" stroke-width="${o}"/>`}return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${e*r}"><title>${Fn(i.name)} — construction outlines, millimeters</title>${l}</svg>`}const Da="180",Bi={ROTATE:0,DOLLY:1,PAN:2},Ni={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},ru=0,ul=1,su=2,Vc=1,Gc=2,En=3,Gn=0,Le=1,bn=2,kn=0,zi=1,dl=2,fl=3,pl=4,ou=5,ii=100,au=101,lu=102,cu=103,hu=104,uu=200,du=201,fu=202,pu=203,Co=204,Po=205,mu=206,gu=207,_u=208,vu=209,xu=210,yu=211,Mu=212,Su=213,Eu=214,Lo=0,Do=1,Io=2,Vi=3,Uo=4,No=5,Fo=6,Oo=7,Ia=0,bu=1,Tu=2,Hn=0,wu=1,Au=2,Ru=3,Wc=4,Cu=5,Pu=6,Lu=7,Xc=300,Gi=301,Wi=302,Bo=303,zo=304,Ds=306,ko=1e3,oi=1001,Ho=1002,Ge=1003,Du=1004,kr=1005,dn=1006,Bs=1007,ai=1008,mn=1009,$c=1010,Yc=1011,xr=1012,Ua=1013,li=1014,fn=1015,Cr=1016,Na=1017,Fa=1018,yr=1020,qc=35902,jc=35899,Zc=1021,Kc=1022,rn=1023,Mr=1026,Sr=1027,Oa=1028,Ba=1029,Jc=1030,za=1031,ka=1033,ds=33776,fs=33777,ps=33778,ms=33779,Vo=35840,Go=35841,Wo=35842,Xo=35843,$o=36196,Yo=37492,qo=37496,jo=37808,Zo=37809,Ko=37810,Jo=37811,Qo=37812,ta=37813,ea=37814,na=37815,ia=37816,ra=37817,sa=37818,oa=37819,aa=37820,la=37821,ca=36492,ha=36494,ua=36495,da=36283,fa=36284,pa=36285,ma=36286,Iu=3200,Uu=3201,Ha=0,Nu=1,On="",He="srgb",Xi="srgb-linear",Es="linear",ne="srgb",_i=7680,ml=519,Fu=512,Ou=513,Bu=514,Qc=515,zu=516,ku=517,Hu=518,Vu=519,gl=35044,_l="300 es",pn=2e3,bs=2001;class di{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){const n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){const n=this._listeners;if(n===void 0)return;const r=n[t];if(r!==void 0){const s=r.indexOf(e);s!==-1&&r.splice(s,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const n=e[t.type];if(n!==void 0){t.target=this;const r=n.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,t);t.target=null}}}const Ee=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let vl=1234567;const dr=Math.PI/180,Er=180/Math.PI;function fi(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ee[i&255]+Ee[i>>8&255]+Ee[i>>16&255]+Ee[i>>24&255]+"-"+Ee[t&255]+Ee[t>>8&255]+"-"+Ee[t>>16&15|64]+Ee[t>>24&255]+"-"+Ee[e&63|128]+Ee[e>>8&255]+"-"+Ee[e>>16&255]+Ee[e>>24&255]+Ee[n&255]+Ee[n>>8&255]+Ee[n>>16&255]+Ee[n>>24&255]).toLowerCase()}function jt(i,t,e){return Math.max(t,Math.min(e,i))}function Va(i,t){return(i%t+t)%t}function Gu(i,t,e,n,r){return n+(i-t)*(r-n)/(e-t)}function Wu(i,t,e){return i!==t?(e-i)/(t-i):0}function fr(i,t,e){return(1-e)*i+e*t}function Xu(i,t,e,n){return fr(i,t,1-Math.exp(-e*n))}function $u(i,t=1){return t-Math.abs(Va(i,t*2)-t)}function Yu(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function qu(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function ju(i,t){return i+Math.floor(Math.random()*(t-i+1))}function Zu(i,t){return i+Math.random()*(t-i)}function Ku(i){return i*(.5-Math.random())}function Ju(i){i!==void 0&&(vl=i);let t=vl+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Qu(i){return i*dr}function td(i){return i*Er}function ed(i){return(i&i-1)===0&&i!==0}function nd(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function id(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function rd(i,t,e,n,r){const s=Math.cos,o=Math.sin,a=s(e/2),l=o(e/2),c=s((t+n)/2),u=o((t+n)/2),h=s((t-n)/2),d=o((t-n)/2),f=s((n-t)/2),g=o((n-t)/2);switch(r){case"XYX":i.set(a*u,l*h,l*d,a*c);break;case"YZY":i.set(l*d,a*u,l*h,a*c);break;case"ZXZ":i.set(l*h,l*d,a*u,a*c);break;case"XZX":i.set(a*u,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*u,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*u,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Ui(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Re(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const th={DEG2RAD:dr,RAD2DEG:Er,generateUUID:fi,clamp:jt,euclideanModulo:Va,mapLinear:Gu,inverseLerp:Wu,lerp:fr,damp:Xu,pingpong:$u,smoothstep:Yu,smootherstep:qu,randInt:ju,randFloat:Zu,randFloatSpread:Ku,seededRandom:Ju,degToRad:Qu,radToDeg:td,isPowerOfTwo:ed,ceilPowerOfTwo:nd,floorPowerOfTwo:id,setQuaternionFromProperEuler:rd,normalize:Re,denormalize:Ui};class ct{constructor(t=0,e=0){ct.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6],this.y=r[1]*e+r[4]*n+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),r=Math.sin(e),s=this.x-t.x,o=this.y-t.y;return this.x=s*n-o*r+t.x,this.y=s*r+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ci{constructor(t=0,e=0,n=0,r=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=r}static slerpFlat(t,e,n,r,s,o,a){let l=n[r+0],c=n[r+1],u=n[r+2],h=n[r+3];const d=s[o+0],f=s[o+1],g=s[o+2],_=s[o+3];if(a===0){t[e+0]=l,t[e+1]=c,t[e+2]=u,t[e+3]=h;return}if(a===1){t[e+0]=d,t[e+1]=f,t[e+2]=g,t[e+3]=_;return}if(h!==_||l!==d||c!==f||u!==g){let m=1-a;const p=l*d+c*f+u*g+h*_,T=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){const A=Math.sqrt(y),P=Math.atan2(A,p*T);m=Math.sin(m*P)/A,a=Math.sin(a*P)/A}const v=a*T;if(l=l*m+d*v,c=c*m+f*v,u=u*m+g*v,h=h*m+_*v,m===1-a){const A=1/Math.sqrt(l*l+c*c+u*u+h*h);l*=A,c*=A,u*=A,h*=A}}t[e]=l,t[e+1]=c,t[e+2]=u,t[e+3]=h}static multiplyQuaternionsFlat(t,e,n,r,s,o){const a=n[r],l=n[r+1],c=n[r+2],u=n[r+3],h=s[o],d=s[o+1],f=s[o+2],g=s[o+3];return t[e]=a*g+u*h+l*f-c*d,t[e+1]=l*g+u*d+c*h-a*f,t[e+2]=c*g+u*f+a*d-l*h,t[e+3]=u*g-a*h-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,r){return this._x=t,this._y=e,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,r=t._y,s=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(r/2),h=a(s/2),d=l(n/2),f=l(r/2),g=l(s/2);switch(o){case"XYZ":this._x=d*u*h+c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h-d*f*g;break;case"YXZ":this._x=d*u*h+c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h+d*f*g;break;case"ZXY":this._x=d*u*h-c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h-d*f*g;break;case"ZYX":this._x=d*u*h-c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h+d*f*g;break;case"YZX":this._x=d*u*h+c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h-d*f*g;break;case"XZY":this._x=d*u*h-c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,r=Math.sin(n);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],r=e[4],s=e[8],o=e[1],a=e[5],l=e[9],c=e[2],u=e[6],h=e[10],d=n+a+h;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(o-r)*f}else if(n>a&&n>h){const f=2*Math.sqrt(1+n-a-h);this._w=(u-l)/f,this._x=.25*f,this._y=(r+o)/f,this._z=(s+c)/f}else if(a>h){const f=2*Math.sqrt(1+a-n-h);this._w=(s-c)/f,this._x=(r+o)/f,this._y=.25*f,this._z=(l+u)/f}else{const f=2*Math.sqrt(1+h-n-a);this._w=(o-r)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(jt(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const r=Math.min(1,e/n);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,r=t._y,s=t._z,o=t._w,a=e._x,l=e._y,c=e._z,u=e._w;return this._x=n*u+o*a+r*c-s*l,this._y=r*u+o*l+s*a-n*c,this._z=s*u+o*c+n*l-r*a,this._w=o*u-n*a-r*l-s*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,r=this._y,s=this._z,o=this._w;let a=o*t._w+n*t._x+r*t._y+s*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=n,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const f=1-e;return this._w=f*o+e*this._w,this._x=f*n+e*this._x,this._y=f*r+e*this._y,this._z=f*s+e*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,a),h=Math.sin((1-e)*u)/c,d=Math.sin(e*u)/c;return this._w=o*h+this._w*d,this._x=n*h+this._x*d,this._y=r*h+this._y*d,this._z=s*h+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(e),s*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class I{constructor(t=0,e=0,n=0){I.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(xl.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(xl.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6]*r,this.y=s[1]*e+s[4]*n+s[7]*r,this.z=s[2]*e+s[5]*n+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,r=this.z,s=t.elements,o=1/(s[3]*e+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*e+s[4]*n+s[8]*r+s[12])*o,this.y=(s[1]*e+s[5]*n+s[9]*r+s[13])*o,this.z=(s[2]*e+s[6]*n+s[10]*r+s[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,r=this.z,s=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*r-a*n),u=2*(a*e-s*r),h=2*(s*n-o*e);return this.x=e+l*c+o*h-a*u,this.y=n+l*u+a*c-s*h,this.z=r+l*h+s*u-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[4]*n+s[8]*r,this.y=s[1]*e+s[5]*n+s[9]*r,this.z=s[2]*e+s[6]*n+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,r=t.y,s=t.z,o=e.x,a=e.y,l=e.z;return this.x=r*l-s*a,this.y=s*o-n*l,this.z=n*a-r*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return zs.copy(this).projectOnVector(t),this.sub(zs)}reflect(t){return this.sub(zs.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,r=this.z-t.z;return e*e+n*n+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const r=Math.sin(e)*t;return this.x=r*Math.sin(n),this.y=Math.cos(e)*t,this.z=r*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=r,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const zs=new I,xl=new ci;class Xt{constructor(t,e,n,r,s,o,a,l,c){Xt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,r,s,o,a,l,c)}set(t,e,n,r,s,o,a,l,c){const u=this.elements;return u[0]=t,u[1]=r,u[2]=a,u[3]=e,u[4]=s,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,r=e.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],h=n[7],d=n[2],f=n[5],g=n[8],_=r[0],m=r[3],p=r[6],T=r[1],y=r[4],v=r[7],A=r[2],P=r[5],L=r[8];return s[0]=o*_+a*T+l*A,s[3]=o*m+a*y+l*P,s[6]=o*p+a*v+l*L,s[1]=c*_+u*T+h*A,s[4]=c*m+u*y+h*P,s[7]=c*p+u*v+h*L,s[2]=d*_+f*T+g*A,s[5]=d*m+f*y+g*P,s[8]=d*p+f*v+g*L,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],u=t[8];return e*o*u-e*a*c-n*s*u+n*a*l+r*s*c-r*o*l}invert(){const t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],u=t[8],h=u*o-a*c,d=a*l-u*s,f=c*s-o*l,g=e*h+n*d+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=h*_,t[1]=(r*c-u*n)*_,t[2]=(a*n-r*o)*_,t[3]=d*_,t[4]=(u*e-r*l)*_,t[5]=(r*s-a*e)*_,t[6]=f*_,t[7]=(n*l-c*e)*_,t[8]=(o*e-n*s)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-r*c,r*l,-r*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(ks.makeScale(t,e)),this}rotate(t){return this.premultiply(ks.makeRotation(-t)),this}translate(t,e){return this.premultiply(ks.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let r=0;r<9;r++)if(e[r]!==n[r])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const ks=new Xt;function eh(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Ts(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function sd(){const i=Ts("canvas");return i.style.display="block",i}const yl={};function br(i){i in yl||(yl[i]=!0,console.warn(i))}function od(i,t,e){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,e);break;default:n()}}setTimeout(s,e)})}const Ml=new Xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Sl=new Xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function ad(){const i={enabled:!0,workingColorSpace:Xi,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===ne&&(r.r=wn(r.r),r.g=wn(r.g),r.b=wn(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ne&&(r.r=ki(r.r),r.g=ki(r.g),r.b=ki(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===On?Es:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return br("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return br("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,s)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Xi]:{primaries:t,whitePoint:n,transfer:Es,toXYZ:Ml,fromXYZ:Sl,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:He},outputColorSpaceConfig:{drawingBufferColorSpace:He}},[He]:{primaries:t,whitePoint:n,transfer:ne,toXYZ:Ml,fromXYZ:Sl,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:He}}}),i}const Jt=ad();function wn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ki(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let vi;class ld{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{vi===void 0&&(vi=Ts("canvas")),vi.width=t.width,vi.height=t.height;const r=vi.getContext("2d");t instanceof ImageData?r.putImageData(t,0,0):r.drawImage(t,0,0,t.width,t.height),n=vi}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Ts("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const r=n.getImageData(0,0,t.width,t.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=wn(s[o]/255)*255;return n.putImageData(r,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(wn(e[n]/255)*255):e[n]=wn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let cd=0;class Ga{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:cd++}),this.uuid=fi(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):e instanceof VideoFrame?t.set(e.displayHeight,e.displayWidth,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(Hs(r[o].image)):s.push(Hs(r[o]))}else s=Hs(r);n.url=s}return e||(t.images[this.uuid]=n),n}}function Hs(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?ld.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let hd=0;const Vs=new I;class De extends di{constructor(t=De.DEFAULT_IMAGE,e=De.DEFAULT_MAPPING,n=oi,r=oi,s=dn,o=ai,a=rn,l=mn,c=De.DEFAULT_ANISOTROPY,u=On){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:hd++}),this.uuid=fi(),this.name="",this.source=new Ga(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ct(0,0),this.repeat=new ct(1,1),this.center=new ct(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Vs).x}get height(){return this.source.getSize(Vs).y}get depth(){return this.source.getSize(Vs).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const r=this[e];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${e}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Xc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case ko:t.x=t.x-Math.floor(t.x);break;case oi:t.x=t.x<0?0:1;break;case Ho:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case ko:t.y=t.y-Math.floor(t.y);break;case oi:t.y=t.y<0?0:1;break;case Ho:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}De.DEFAULT_IMAGE=null;De.DEFAULT_MAPPING=Xc;De.DEFAULT_ANISOTROPY=1;class re{constructor(t=0,e=0,n=0,r=1){re.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,r){return this.x=t,this.y=e,this.z=n,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,r=this.z,s=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*r+o[12]*s,this.y=o[1]*e+o[5]*n+o[9]*r+o[13]*s,this.z=o[2]*e+o[6]*n+o[10]*r+o[14]*s,this.w=o[3]*e+o[7]*n+o[11]*r+o[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,r,s;const l=t.elements,c=l[0],u=l[4],h=l[8],d=l[1],f=l[5],g=l[9],_=l[2],m=l[6],p=l[10];if(Math.abs(u-d)<.01&&Math.abs(h-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(c+1)/2,v=(f+1)/2,A=(p+1)/2,P=(u+d)/4,L=(h+_)/4,D=(g+m)/4;return y>v&&y>A?y<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(y),r=P/n,s=L/n):v>A?v<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),n=P/r,s=D/r):A<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(A),n=L/s,r=D/s),this.set(n,r,s,e),this}let T=Math.sqrt((m-g)*(m-g)+(h-_)*(h-_)+(d-u)*(d-u));return Math.abs(T)<.001&&(T=1),this.x=(m-g)/T,this.y=(h-_)/T,this.z=(d-u)/T,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this.w=jt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this.w=jt(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class ud extends di{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:dn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new re(0,0,t,e),this.scissorTest=!1,this.viewport=new re(0,0,t,e);const r={width:t,height:e,depth:n.depth},s=new De(r);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(t={}){const e={minFilter:dn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=e,this.textures[r].image.depth=n,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const r=Object.assign({},t.textures[e].image);this.textures[e].source=new Ga(r)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class hi extends ud{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class nh extends De{constructor(t=null,e=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:r},this.magFilter=Ge,this.minFilter=Ge,this.wrapR=oi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class dd extends De{constructor(t=null,e=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:r},this.magFilter=Ge,this.minFilter=Ge,this.wrapR=oi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class $n{constructor(t=new I(1/0,1/0,1/0),e=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Je.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Je.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=Je.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const s=n.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Je):Je.fromBufferAttribute(s,o),Je.applyMatrix4(t.matrixWorld),this.expandByPoint(Je);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Hr.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Hr.copy(n.boundingBox)),Hr.applyMatrix4(t.matrixWorld),this.union(Hr)}const r=t.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Je),Je.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Ki),Vr.subVectors(this.max,Ki),xi.subVectors(t.a,Ki),yi.subVectors(t.b,Ki),Mi.subVectors(t.c,Ki),Rn.subVectors(yi,xi),Cn.subVectors(Mi,yi),jn.subVectors(xi,Mi);let e=[0,-Rn.z,Rn.y,0,-Cn.z,Cn.y,0,-jn.z,jn.y,Rn.z,0,-Rn.x,Cn.z,0,-Cn.x,jn.z,0,-jn.x,-Rn.y,Rn.x,0,-Cn.y,Cn.x,0,-jn.y,jn.x,0];return!Gs(e,xi,yi,Mi,Vr)||(e=[1,0,0,0,1,0,0,0,1],!Gs(e,xi,yi,Mi,Vr))?!1:(Gr.crossVectors(Rn,Cn),e=[Gr.x,Gr.y,Gr.z],Gs(e,xi,yi,Mi,Vr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Je).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Je).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(vn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),vn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),vn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),vn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),vn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),vn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),vn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),vn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(vn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const vn=[new I,new I,new I,new I,new I,new I,new I,new I],Je=new I,Hr=new $n,xi=new I,yi=new I,Mi=new I,Rn=new I,Cn=new I,jn=new I,Ki=new I,Vr=new I,Gr=new I,Zn=new I;function Gs(i,t,e,n,r){for(let s=0,o=i.length-3;s<=o;s+=3){Zn.fromArray(i,s);const a=r.x*Math.abs(Zn.x)+r.y*Math.abs(Zn.y)+r.z*Math.abs(Zn.z),l=t.dot(Zn),c=e.dot(Zn),u=n.dot(Zn);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const fd=new $n,Ji=new I,Ws=new I;class Pr{constructor(t=new I,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):fd.setFromPoints(t).getCenter(n);let r=0;for(let s=0,o=t.length;s<o;s++)r=Math.max(r,n.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Ji.subVectors(t,this.center);const e=Ji.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),r=(n-this.radius)*.5;this.center.addScaledVector(Ji,r/n),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Ws.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Ji.copy(t.center).add(Ws)),this.expandByPoint(Ji.copy(t.center).sub(Ws))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}const xn=new I,Xs=new I,Wr=new I,Pn=new I,$s=new I,Xr=new I,Ys=new I;class ih{constructor(t=new I,e=new I(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,xn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=xn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(xn.copy(this.origin).addScaledVector(this.direction,e),xn.distanceToSquared(t))}distanceSqToSegment(t,e,n,r){Xs.copy(t).add(e).multiplyScalar(.5),Wr.copy(e).sub(t).normalize(),Pn.copy(this.origin).sub(Xs);const s=t.distanceTo(e)*.5,o=-this.direction.dot(Wr),a=Pn.dot(this.direction),l=-Pn.dot(Wr),c=Pn.lengthSq(),u=Math.abs(1-o*o);let h,d,f,g;if(u>0)if(h=o*l-a,d=o*a-l,g=s*u,h>=0)if(d>=-g)if(d<=g){const _=1/u;h*=_,d*=_,f=h*(h+o*d+2*a)+d*(o*h+d+2*l)+c}else d=s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d=-s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d<=-g?(h=Math.max(0,-(-o*s+a)),d=h>0?-s:Math.min(Math.max(-s,-l),s),f=-h*h+d*(d+2*l)+c):d<=g?(h=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(h=Math.max(0,-(o*s+a)),d=h>0?s:Math.min(Math.max(-s,-l),s),f=-h*h+d*(d+2*l)+c);else d=o>0?-s:s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Xs).addScaledVector(Wr,d),f}intersectSphere(t,e){xn.subVectors(t.center,this.origin);const n=xn.dot(this.direction),r=xn.dot(xn)-n*n,s=t.radius*t.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,r,s,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,r=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,r=(t.min.x-d.x)*c),u>=0?(s=(t.min.y-d.y)*u,o=(t.max.y-d.y)*u):(s=(t.max.y-d.y)*u,o=(t.min.y-d.y)*u),n>o||s>r||((s>n||isNaN(n))&&(n=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(t.min.z-d.z)*h,l=(t.max.z-d.z)*h):(a=(t.max.z-d.z)*h,l=(t.min.z-d.z)*h),n>l||a>r)||((a>n||n!==n)&&(n=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(n>=0?n:r,e)}intersectsBox(t){return this.intersectBox(t,xn)!==null}intersectTriangle(t,e,n,r,s){$s.subVectors(e,t),Xr.subVectors(n,t),Ys.crossVectors($s,Xr);let o=this.direction.dot(Ys),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Pn.subVectors(this.origin,t);const l=a*this.direction.dot(Xr.crossVectors(Pn,Xr));if(l<0)return null;const c=a*this.direction.dot($s.cross(Pn));if(c<0||l+c>o)return null;const u=-a*Pn.dot(Ys);return u<0?null:this.at(u/o,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ae{constructor(t,e,n,r,s,o,a,l,c,u,h,d,f,g,_,m){ae.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,r,s,o,a,l,c,u,h,d,f,g,_,m)}set(t,e,n,r,s,o,a,l,c,u,h,d,f,g,_,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=u,p[10]=h,p[14]=d,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ae().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,r=1/Si.setFromMatrixColumn(t,0).length(),s=1/Si.setFromMatrixColumn(t,1).length(),o=1/Si.setFromMatrixColumn(t,2).length();return e[0]=n[0]*r,e[1]=n[1]*r,e[2]=n[2]*r,e[3]=0,e[4]=n[4]*s,e[5]=n[5]*s,e[6]=n[6]*s,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,r=t.y,s=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(t.order==="XYZ"){const d=o*u,f=o*h,g=a*u,_=a*h;e[0]=l*u,e[4]=-l*h,e[8]=c,e[1]=f+g*c,e[5]=d-_*c,e[9]=-a*l,e[2]=_-d*c,e[6]=g+f*c,e[10]=o*l}else if(t.order==="YXZ"){const d=l*u,f=l*h,g=c*u,_=c*h;e[0]=d+_*a,e[4]=g*a-f,e[8]=o*c,e[1]=o*h,e[5]=o*u,e[9]=-a,e[2]=f*a-g,e[6]=_+d*a,e[10]=o*l}else if(t.order==="ZXY"){const d=l*u,f=l*h,g=c*u,_=c*h;e[0]=d-_*a,e[4]=-o*h,e[8]=g+f*a,e[1]=f+g*a,e[5]=o*u,e[9]=_-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const d=o*u,f=o*h,g=a*u,_=a*h;e[0]=l*u,e[4]=g*c-f,e[8]=d*c+_,e[1]=l*h,e[5]=_*c+d,e[9]=f*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const d=o*l,f=o*c,g=a*l,_=a*c;e[0]=l*u,e[4]=_-d*h,e[8]=g*h+f,e[1]=h,e[5]=o*u,e[9]=-a*u,e[2]=-c*u,e[6]=f*h+g,e[10]=d-_*h}else if(t.order==="XZY"){const d=o*l,f=o*c,g=a*l,_=a*c;e[0]=l*u,e[4]=-h,e[8]=c*u,e[1]=d*h+_,e[5]=o*u,e[9]=f*h-g,e[2]=g*h-f,e[6]=a*u,e[10]=_*h+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(pd,t,md)}lookAt(t,e,n){const r=this.elements;return Oe.subVectors(t,e),Oe.lengthSq()===0&&(Oe.z=1),Oe.normalize(),Ln.crossVectors(n,Oe),Ln.lengthSq()===0&&(Math.abs(n.z)===1?Oe.x+=1e-4:Oe.z+=1e-4,Oe.normalize(),Ln.crossVectors(n,Oe)),Ln.normalize(),$r.crossVectors(Oe,Ln),r[0]=Ln.x,r[4]=$r.x,r[8]=Oe.x,r[1]=Ln.y,r[5]=$r.y,r[9]=Oe.y,r[2]=Ln.z,r[6]=$r.z,r[10]=Oe.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,r=e.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],h=n[5],d=n[9],f=n[13],g=n[2],_=n[6],m=n[10],p=n[14],T=n[3],y=n[7],v=n[11],A=n[15],P=r[0],L=r[4],D=r[8],b=r[12],M=r[1],C=r[5],H=r[9],X=r[13],et=r[2],$=r[6],Z=r[10],it=r[14],G=r[3],dt=r[7],gt=r[11],yt=r[15];return s[0]=o*P+a*M+l*et+c*G,s[4]=o*L+a*C+l*$+c*dt,s[8]=o*D+a*H+l*Z+c*gt,s[12]=o*b+a*X+l*it+c*yt,s[1]=u*P+h*M+d*et+f*G,s[5]=u*L+h*C+d*$+f*dt,s[9]=u*D+h*H+d*Z+f*gt,s[13]=u*b+h*X+d*it+f*yt,s[2]=g*P+_*M+m*et+p*G,s[6]=g*L+_*C+m*$+p*dt,s[10]=g*D+_*H+m*Z+p*gt,s[14]=g*b+_*X+m*it+p*yt,s[3]=T*P+y*M+v*et+A*G,s[7]=T*L+y*C+v*$+A*dt,s[11]=T*D+y*H+v*Z+A*gt,s[15]=T*b+y*X+v*it+A*yt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],r=t[8],s=t[12],o=t[1],a=t[5],l=t[9],c=t[13],u=t[2],h=t[6],d=t[10],f=t[14],g=t[3],_=t[7],m=t[11],p=t[15];return g*(+s*l*h-r*c*h-s*a*d+n*c*d+r*a*f-n*l*f)+_*(+e*l*f-e*c*d+s*o*d-r*o*f+r*c*u-s*l*u)+m*(+e*c*h-e*a*f-s*o*h+n*o*f+s*a*u-n*c*u)+p*(-r*a*u-e*l*h+e*a*d+r*o*h-n*o*d+n*l*u)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=e,r[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],u=t[8],h=t[9],d=t[10],f=t[11],g=t[12],_=t[13],m=t[14],p=t[15],T=h*m*c-_*d*c+_*l*f-a*m*f-h*l*p+a*d*p,y=g*d*c-u*m*c-g*l*f+o*m*f+u*l*p-o*d*p,v=u*_*c-g*h*c+g*a*f-o*_*f-u*a*p+o*h*p,A=g*h*l-u*_*l-g*a*d+o*_*d+u*a*m-o*h*m,P=e*T+n*y+r*v+s*A;if(P===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const L=1/P;return t[0]=T*L,t[1]=(_*d*s-h*m*s-_*r*f+n*m*f+h*r*p-n*d*p)*L,t[2]=(a*m*s-_*l*s+_*r*c-n*m*c-a*r*p+n*l*p)*L,t[3]=(h*l*s-a*d*s-h*r*c+n*d*c+a*r*f-n*l*f)*L,t[4]=y*L,t[5]=(u*m*s-g*d*s+g*r*f-e*m*f-u*r*p+e*d*p)*L,t[6]=(g*l*s-o*m*s-g*r*c+e*m*c+o*r*p-e*l*p)*L,t[7]=(o*d*s-u*l*s+u*r*c-e*d*c-o*r*f+e*l*f)*L,t[8]=v*L,t[9]=(g*h*s-u*_*s-g*n*f+e*_*f+u*n*p-e*h*p)*L,t[10]=(o*_*s-g*a*s+g*n*c-e*_*c-o*n*p+e*a*p)*L,t[11]=(u*a*s-o*h*s-u*n*c+e*h*c+o*n*f-e*a*f)*L,t[12]=A*L,t[13]=(u*_*r-g*h*r+g*n*d-e*_*d-u*n*m+e*h*m)*L,t[14]=(g*a*r-o*_*r-g*n*l+e*_*l+o*n*m-e*a*m)*L,t[15]=(o*h*r-u*a*r+u*n*l-e*h*l-o*n*d+e*a*d)*L,this}scale(t){const e=this.elements,n=t.x,r=t.y,s=t.z;return e[0]*=n,e[4]*=r,e[8]*=s,e[1]*=n,e[5]*=r,e[9]*=s,e[2]*=n,e[6]*=r,e[10]*=s,e[3]*=n,e[7]*=r,e[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,r))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),r=Math.sin(e),s=1-n,o=t.x,a=t.y,l=t.z,c=s*o,u=s*a;return this.set(c*o+n,c*a-r*l,c*l+r*a,0,c*a+r*l,u*a+n,u*l-r*o,0,c*l-r*a,u*l+r*o,s*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,r,s,o){return this.set(1,n,s,0,t,1,o,0,e,r,1,0,0,0,0,1),this}compose(t,e,n){const r=this.elements,s=e._x,o=e._y,a=e._z,l=e._w,c=s+s,u=o+o,h=a+a,d=s*c,f=s*u,g=s*h,_=o*u,m=o*h,p=a*h,T=l*c,y=l*u,v=l*h,A=n.x,P=n.y,L=n.z;return r[0]=(1-(_+p))*A,r[1]=(f+v)*A,r[2]=(g-y)*A,r[3]=0,r[4]=(f-v)*P,r[5]=(1-(d+p))*P,r[6]=(m+T)*P,r[7]=0,r[8]=(g+y)*L,r[9]=(m-T)*L,r[10]=(1-(d+_))*L,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,e,n){const r=this.elements;let s=Si.set(r[0],r[1],r[2]).length();const o=Si.set(r[4],r[5],r[6]).length(),a=Si.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),t.x=r[12],t.y=r[13],t.z=r[14],Qe.copy(this);const c=1/s,u=1/o,h=1/a;return Qe.elements[0]*=c,Qe.elements[1]*=c,Qe.elements[2]*=c,Qe.elements[4]*=u,Qe.elements[5]*=u,Qe.elements[6]*=u,Qe.elements[8]*=h,Qe.elements[9]*=h,Qe.elements[10]*=h,e.setFromRotationMatrix(Qe),n.x=s,n.y=o,n.z=a,this}makePerspective(t,e,n,r,s,o,a=pn,l=!1){const c=this.elements,u=2*s/(e-t),h=2*s/(n-r),d=(e+t)/(e-t),f=(n+r)/(n-r);let g,_;if(l)g=s/(o-s),_=o*s/(o-s);else if(a===pn)g=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===bs)g=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,r,s,o,a=pn,l=!1){const c=this.elements,u=2/(e-t),h=2/(n-r),d=-(e+t)/(e-t),f=-(n+r)/(n-r);let g,_;if(l)g=1/(o-s),_=o/(o-s);else if(a===pn)g=-2/(o-s),_=-(o+s)/(o-s);else if(a===bs)g=-1/(o-s),_=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=h,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let r=0;r<16;r++)if(e[r]!==n[r])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Si=new I,Qe=new ae,pd=new I(0,0,0),md=new I(1,1,1),Ln=new I,$r=new I,Oe=new I,El=new ae,bl=new ci;class on{constructor(t=0,e=0,n=0,r=on.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,r=this._order){return this._x=t,this._y=e,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const r=t.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],u=r[9],h=r[2],d=r[6],f=r[10];switch(e){case"XYZ":this._y=Math.asin(jt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-jt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(jt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-jt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(jt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-jt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return El.makeRotationFromQuaternion(t),this.setFromRotationMatrix(El,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return bl.setFromEuler(this),this.setFromQuaternion(bl,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}on.DEFAULT_ORDER="XYZ";class rh{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let gd=0;const Tl=new I,Ei=new ci,yn=new ae,Yr=new I,Qi=new I,_d=new I,vd=new ci,wl=new I(1,0,0),Al=new I(0,1,0),Rl=new I(0,0,1),Cl={type:"added"},xd={type:"removed"},bi={type:"childadded",child:null},qs={type:"childremoved",child:null};class Me extends di{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gd++}),this.uuid=fi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Me.DEFAULT_UP.clone();const t=new I,e=new on,n=new ci,r=new I(1,1,1);function s(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ae},normalMatrix:{value:new Xt}}),this.matrix=new ae,this.matrixWorld=new ae,this.matrixAutoUpdate=Me.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Me.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new rh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Ei.setFromAxisAngle(t,e),this.quaternion.multiply(Ei),this}rotateOnWorldAxis(t,e){return Ei.setFromAxisAngle(t,e),this.quaternion.premultiply(Ei),this}rotateX(t){return this.rotateOnAxis(wl,t)}rotateY(t){return this.rotateOnAxis(Al,t)}rotateZ(t){return this.rotateOnAxis(Rl,t)}translateOnAxis(t,e){return Tl.copy(t).applyQuaternion(this.quaternion),this.position.add(Tl.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(wl,t)}translateY(t){return this.translateOnAxis(Al,t)}translateZ(t){return this.translateOnAxis(Rl,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(yn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Yr.copy(t):Yr.set(t,e,n);const r=this.parent;this.updateWorldMatrix(!0,!1),Qi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?yn.lookAt(Qi,Yr,this.up):yn.lookAt(Yr,Qi,this.up),this.quaternion.setFromRotationMatrix(yn),r&&(yn.extractRotation(r.matrixWorld),Ei.setFromRotationMatrix(yn),this.quaternion.premultiply(Ei.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Cl),bi.child=t,this.dispatchEvent(bi),bi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(xd),qs.child=t,this.dispatchEvent(qs),qs.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),yn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),yn.multiply(t.parent.matrixWorld)),t.applyMatrix4(yn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Cl),bi.child=t,this.dispatchEvent(bi),bi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,r=this.children.length;n<r;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qi,t,_d),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qi,vd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>({...a})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(t),r.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const h=l[c];s(t.shapes,h)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(t.materials,this.material[l]));r.material=a}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),u=o(t.images),h=o(t.shapes),d=o(t.skeletons),f=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=r,n;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const r=t.children[n];this.add(r.clone())}return this}}Me.DEFAULT_UP=new I(0,1,0);Me.DEFAULT_MATRIX_AUTO_UPDATE=!0;Me.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const tn=new I,Mn=new I,js=new I,Sn=new I,Ti=new I,wi=new I,Pl=new I,Zs=new I,Ks=new I,Js=new I,Qs=new re,to=new re,eo=new re;class en{constructor(t=new I,e=new I,n=new I){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,r){r.subVectors(n,e),tn.subVectors(t,e),r.cross(tn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,e,n,r,s){tn.subVectors(r,e),Mn.subVectors(n,e),js.subVectors(t,e);const o=tn.dot(tn),a=tn.dot(Mn),l=tn.dot(js),c=Mn.dot(Mn),u=Mn.dot(js),h=o*c-a*a;if(h===0)return s.set(0,0,0),null;const d=1/h,f=(c*l-a*u)*d,g=(o*u-a*l)*d;return s.set(1-f-g,g,f)}static containsPoint(t,e,n,r){return this.getBarycoord(t,e,n,r,Sn)===null?!1:Sn.x>=0&&Sn.y>=0&&Sn.x+Sn.y<=1}static getInterpolation(t,e,n,r,s,o,a,l){return this.getBarycoord(t,e,n,r,Sn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Sn.x),l.addScaledVector(o,Sn.y),l.addScaledVector(a,Sn.z),l)}static getInterpolatedAttribute(t,e,n,r,s,o){return Qs.setScalar(0),to.setScalar(0),eo.setScalar(0),Qs.fromBufferAttribute(t,e),to.fromBufferAttribute(t,n),eo.fromBufferAttribute(t,r),o.setScalar(0),o.addScaledVector(Qs,s.x),o.addScaledVector(to,s.y),o.addScaledVector(eo,s.z),o}static isFrontFacing(t,e,n,r){return tn.subVectors(n,e),Mn.subVectors(t,e),tn.cross(Mn).dot(r)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,r){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,e,n,r){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return tn.subVectors(this.c,this.b),Mn.subVectors(this.a,this.b),tn.cross(Mn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return en.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return en.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,r,s){return en.getInterpolation(t,this.a,this.b,this.c,e,n,r,s)}containsPoint(t){return en.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return en.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,r=this.b,s=this.c;let o,a;Ti.subVectors(r,n),wi.subVectors(s,n),Zs.subVectors(t,n);const l=Ti.dot(Zs),c=wi.dot(Zs);if(l<=0&&c<=0)return e.copy(n);Ks.subVectors(t,r);const u=Ti.dot(Ks),h=wi.dot(Ks);if(u>=0&&h<=u)return e.copy(r);const d=l*h-u*c;if(d<=0&&l>=0&&u<=0)return o=l/(l-u),e.copy(n).addScaledVector(Ti,o);Js.subVectors(t,s);const f=Ti.dot(Js),g=wi.dot(Js);if(g>=0&&f<=g)return e.copy(s);const _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(wi,a);const m=u*g-f*h;if(m<=0&&h-u>=0&&f-g>=0)return Pl.subVectors(s,r),a=(h-u)/(h-u+(f-g)),e.copy(r).addScaledVector(Pl,a);const p=1/(m+_+d);return o=_*p,a=d*p,e.copy(n).addScaledVector(Ti,o).addScaledVector(wi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const sh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Dn={h:0,s:0,l:0},qr={h:0,s:0,l:0};function no(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class Yt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=He){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Jt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,r=Jt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Jt.colorSpaceToWorking(this,r),this}setHSL(t,e,n,r=Jt.workingColorSpace){if(t=Va(t,1),e=jt(e,0,1),n=jt(n,0,1),e===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+e):n+e-n*e,o=2*n-s;this.r=no(o,s,t+1/3),this.g=no(o,s,t),this.b=no(o,s,t-1/3)}return Jt.colorSpaceToWorking(this,r),this}setStyle(t,e=He){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(s,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=He){const n=sh[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=wn(t.r),this.g=wn(t.g),this.b=wn(t.b),this}copyLinearToSRGB(t){return this.r=ki(t.r),this.g=ki(t.g),this.b=ki(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=He){return Jt.workingToColorSpace(be.copy(this),t),Math.round(jt(be.r*255,0,255))*65536+Math.round(jt(be.g*255,0,255))*256+Math.round(jt(be.b*255,0,255))}getHexString(t=He){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Jt.workingColorSpace){Jt.workingToColorSpace(be.copy(this),e);const n=be.r,r=be.g,s=be.b,o=Math.max(n,r,s),a=Math.min(n,r,s);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const h=o-a;switch(c=u<=.5?h/(o+a):h/(2-o-a),o){case n:l=(r-s)/h+(r<s?6:0);break;case r:l=(s-n)/h+2;break;case s:l=(n-r)/h+4;break}l/=6}return t.h=l,t.s=c,t.l=u,t}getRGB(t,e=Jt.workingColorSpace){return Jt.workingToColorSpace(be.copy(this),e),t.r=be.r,t.g=be.g,t.b=be.b,t}getStyle(t=He){Jt.workingToColorSpace(be.copy(this),t);const e=be.r,n=be.g,r=be.b;return t!==He?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(t,e,n){return this.getHSL(Dn),this.setHSL(Dn.h+t,Dn.s+e,Dn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Dn),t.getHSL(qr);const n=fr(Dn.h,qr.h,e),r=fr(Dn.s,qr.s,e),s=fr(Dn.l,qr.l,e);return this.setHSL(n,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,r=this.b,s=t.elements;return this.r=s[0]*e+s[3]*n+s[6]*r,this.g=s[1]*e+s[4]*n+s[7]*r,this.b=s[2]*e+s[5]*n+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const be=new Yt;Yt.NAMES=sh;let yd=0;class qi extends di{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:yd++}),this.uuid=fi(),this.name="",this.type="Material",this.blending=zi,this.side=Gn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Co,this.blendDst=Po,this.blendEquation=ii,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Yt(0,0,0),this.blendAlpha=0,this.depthFunc=Vi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ml,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=_i,this.stencilZFail=_i,this.stencilZPass=_i,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const r=this[e];if(r===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==zi&&(n.blending=this.blending),this.side!==Gn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Co&&(n.blendSrc=this.blendSrc),this.blendDst!==Po&&(n.blendDst=this.blendDst),this.blendEquation!==ii&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Vi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ml&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==_i&&(n.stencilFail=this.stencilFail),this.stencilZFail!==_i&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==_i&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(e){const s=r(t.textures),o=r(t.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const r=e.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=e[s].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class oh extends qi{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Yt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new on,this.combine=Ia,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const me=new I,jr=new ct;let Md=0;class Ke{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Md++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=gl,this.updateRanges=[],this.gpuType=fn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=e.array[n+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)jr.fromBufferAttribute(this,e),jr.applyMatrix3(t),this.setXY(e,jr.x,jr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)me.fromBufferAttribute(this,e),me.applyMatrix3(t),this.setXYZ(e,me.x,me.y,me.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)me.fromBufferAttribute(this,e),me.applyMatrix4(t),this.setXYZ(e,me.x,me.y,me.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)me.fromBufferAttribute(this,e),me.applyNormalMatrix(t),this.setXYZ(e,me.x,me.y,me.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)me.fromBufferAttribute(this,e),me.transformDirection(t),this.setXYZ(e,me.x,me.y,me.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ui(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Re(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ui(e,this.array)),e}setX(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ui(e,this.array)),e}setY(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ui(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ui(e,this.array)),e}setW(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),n=Re(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,r){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),n=Re(n,this.array),r=Re(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=r,this}setXYZW(t,e,n,r,s){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),n=Re(n,this.array),r=Re(r,this.array),s=Re(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==gl&&(t.usage=this.usage),t}}class ah extends Ke{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class lh extends Ke{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class ge extends Ke{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Sd=0;const Ye=new ae,io=new Me,Ai=new I,Be=new $n,tr=new $n,ye=new I;class We extends di{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Sd++}),this.uuid=fi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(eh(t)?lh:ah)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Xt().getNormalMatrix(t);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Ye.makeRotationFromQuaternion(t),this.applyMatrix4(Ye),this}rotateX(t){return Ye.makeRotationX(t),this.applyMatrix4(Ye),this}rotateY(t){return Ye.makeRotationY(t),this.applyMatrix4(Ye),this}rotateZ(t){return Ye.makeRotationZ(t),this.applyMatrix4(Ye),this}translate(t,e,n){return Ye.makeTranslation(t,e,n),this.applyMatrix4(Ye),this}scale(t,e,n){return Ye.makeScale(t,e,n),this.applyMatrix4(Ye),this}lookAt(t){return io.lookAt(t),io.updateMatrix(),this.applyMatrix4(io.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ai).negate(),this.translate(Ai.x,Ai.y,Ai.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let r=0,s=t.length;r<s;r++){const o=t[r];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ge(n,3))}else{const n=Math.min(t.length,e.count);for(let r=0;r<n;r++){const s=t[r];e.setXYZ(r,s.x,s.y,s.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new $n);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,r=e.length;n<r;n++){const s=e[n];Be.setFromBufferAttribute(s),this.morphTargetsRelative?(ye.addVectors(this.boundingBox.min,Be.min),this.boundingBox.expandByPoint(ye),ye.addVectors(this.boundingBox.max,Be.max),this.boundingBox.expandByPoint(ye)):(this.boundingBox.expandByPoint(Be.min),this.boundingBox.expandByPoint(Be.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Pr);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new I,1/0);return}if(t){const n=this.boundingSphere.center;if(Be.setFromBufferAttribute(t),e)for(let s=0,o=e.length;s<o;s++){const a=e[s];tr.setFromBufferAttribute(a),this.morphTargetsRelative?(ye.addVectors(Be.min,tr.min),Be.expandByPoint(ye),ye.addVectors(Be.max,tr.max),Be.expandByPoint(ye)):(Be.expandByPoint(tr.min),Be.expandByPoint(tr.max))}Be.getCenter(n);let r=0;for(let s=0,o=t.count;s<o;s++)ye.fromBufferAttribute(t,s),r=Math.max(r,n.distanceToSquared(ye));if(e)for(let s=0,o=e.length;s<o;s++){const a=e[s],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)ye.fromBufferAttribute(a,c),l&&(Ai.fromBufferAttribute(t,c),ye.add(Ai)),r=Math.max(r,n.distanceToSquared(ye))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,r=e.normal,s=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ke(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let D=0;D<n.count;D++)a[D]=new I,l[D]=new I;const c=new I,u=new I,h=new I,d=new ct,f=new ct,g=new ct,_=new I,m=new I;function p(D,b,M){c.fromBufferAttribute(n,D),u.fromBufferAttribute(n,b),h.fromBufferAttribute(n,M),d.fromBufferAttribute(s,D),f.fromBufferAttribute(s,b),g.fromBufferAttribute(s,M),u.sub(c),h.sub(c),f.sub(d),g.sub(d);const C=1/(f.x*g.y-g.x*f.y);isFinite(C)&&(_.copy(u).multiplyScalar(g.y).addScaledVector(h,-f.y).multiplyScalar(C),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(C),a[D].add(_),a[b].add(_),a[M].add(_),l[D].add(m),l[b].add(m),l[M].add(m))}let T=this.groups;T.length===0&&(T=[{start:0,count:t.count}]);for(let D=0,b=T.length;D<b;++D){const M=T[D],C=M.start,H=M.count;for(let X=C,et=C+H;X<et;X+=3)p(t.getX(X+0),t.getX(X+1),t.getX(X+2))}const y=new I,v=new I,A=new I,P=new I;function L(D){A.fromBufferAttribute(r,D),P.copy(A);const b=a[D];y.copy(b),y.sub(A.multiplyScalar(A.dot(b))).normalize(),v.crossVectors(P,b);const C=v.dot(l[D])<0?-1:1;o.setXYZW(D,y.x,y.y,y.z,C)}for(let D=0,b=T.length;D<b;++D){const M=T[D],C=M.start,H=M.count;for(let X=C,et=C+H;X<et;X+=3)L(t.getX(X+0)),L(t.getX(X+1)),L(t.getX(X+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ke(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const r=new I,s=new I,o=new I,a=new I,l=new I,c=new I,u=new I,h=new I;if(t)for(let d=0,f=t.count;d<f;d+=3){const g=t.getX(d+0),_=t.getX(d+1),m=t.getX(d+2);r.fromBufferAttribute(e,g),s.fromBufferAttribute(e,_),o.fromBufferAttribute(e,m),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),a.add(u),l.add(u),c.add(u),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)r.fromBufferAttribute(e,d+0),s.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)ye.fromBufferAttribute(t,e),ye.normalize(),t.setXYZ(e,ye.x,ye.y,ye.z)}toNonIndexed(){function t(a,l){const c=a.array,u=a.itemSize,h=a.normalized,d=new c.constructor(l.length*u);let f=0,g=0;for(let _=0,m=l.length;_<m;_++){a.isInterleavedBufferAttribute?f=l[_]*a.data.stride+a.offset:f=l[_]*u;for(let p=0;p<u;p++)d[g++]=c[f++]}return new Ke(d,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new We,n=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=t(l,n);e.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let u=0,h=c.length;u<h;u++){const d=c[u],f=t(d,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let h=0,d=c.length;h<d;h++){const f=c[h];u.push(f.toJSON(t.data))}u.length>0&&(r[l]=u,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone());const r=t.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(e))}const s=t.morphAttributes;for(const c in s){const u=[],h=s[c];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(e));this.morphAttributes[c]=u}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,u=o.length;c<u;c++){const h=o[c];this.addGroup(h.start,h.count,h.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ll=new ae,Kn=new ih,Zr=new Pr,Dl=new I,Kr=new I,Jr=new I,Qr=new I,ro=new I,ts=new I,Il=new I,es=new I;class fe extends Me{constructor(t=new We,e=new oh){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const r=e[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(t,e){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(r,t);const a=this.morphTargetInfluences;if(s&&a){ts.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=a[l],h=s[l];u!==0&&(ro.fromBufferAttribute(h,t),o?ts.addScaledVector(ro,u):ts.addScaledVector(ro.sub(e),u))}e.add(ts)}return e}raycast(t,e){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Zr.copy(n.boundingSphere),Zr.applyMatrix4(s),Kn.copy(t.ray).recast(t.near),!(Zr.containsPoint(Kn.origin)===!1&&(Kn.intersectSphere(Zr,Dl)===null||Kn.origin.distanceToSquared(Dl)>(t.far-t.near)**2))&&(Ll.copy(s).invert(),Kn.copy(t.ray).applyMatrix4(Ll),!(n.boundingBox!==null&&Kn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Kn)))}_computeIntersections(t,e,n){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=o[m.materialIndex],T=Math.max(m.start,f.start),y=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let v=T,A=y;v<A;v+=3){const P=a.getX(v),L=a.getX(v+1),D=a.getX(v+2);r=ns(this,p,t,n,c,u,h,P,L,D),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{const g=Math.max(0,f.start),_=Math.min(a.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const T=a.getX(m),y=a.getX(m+1),v=a.getX(m+2);r=ns(this,o,t,n,c,u,h,T,y,v),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=o[m.materialIndex],T=Math.max(m.start,f.start),y=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let v=T,A=y;v<A;v+=3){const P=v,L=v+1,D=v+2;r=ns(this,p,t,n,c,u,h,P,L,D),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{const g=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const T=m,y=m+1,v=m+2;r=ns(this,o,t,n,c,u,h,T,y,v),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}}}function Ed(i,t,e,n,r,s,o,a){let l;if(t.side===Le?l=n.intersectTriangle(o,s,r,!0,a):l=n.intersectTriangle(r,s,o,t.side===Gn,a),l===null)return null;es.copy(a),es.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(es);return c<e.near||c>e.far?null:{distance:c,point:es.clone(),object:i}}function ns(i,t,e,n,r,s,o,a,l,c){i.getVertexPosition(a,Kr),i.getVertexPosition(l,Jr),i.getVertexPosition(c,Qr);const u=Ed(i,t,e,n,Kr,Jr,Qr,Il);if(u){const h=new I;en.getBarycoord(Il,Kr,Jr,Qr,h),r&&(u.uv=en.getInterpolatedAttribute(r,a,l,c,h,new ct)),s&&(u.uv1=en.getInterpolatedAttribute(s,a,l,c,h,new ct)),o&&(u.normal=en.getInterpolatedAttribute(o,a,l,c,h,new I),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new I,materialIndex:0};en.getNormal(Kr,Jr,Qr,d.normal),u.face=d,u.barycoord=h}return u}class pi extends We{constructor(t=1,e=1,n=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],u=[],h=[];let d=0,f=0;g("z","y","x",-1,-1,n,e,t,o,s,0),g("z","y","x",1,-1,n,e,-t,o,s,1),g("x","z","y",1,1,t,n,e,r,o,2),g("x","z","y",1,-1,t,n,-e,r,o,3),g("x","y","z",1,-1,t,e,n,r,s,4),g("x","y","z",-1,-1,t,e,-n,r,s,5),this.setIndex(l),this.setAttribute("position",new ge(c,3)),this.setAttribute("normal",new ge(u,3)),this.setAttribute("uv",new ge(h,2));function g(_,m,p,T,y,v,A,P,L,D,b){const M=v/L,C=A/D,H=v/2,X=A/2,et=P/2,$=L+1,Z=D+1;let it=0,G=0;const dt=new I;for(let gt=0;gt<Z;gt++){const yt=gt*C-X;for(let Nt=0;Nt<$;Nt++){const Vt=Nt*M-H;dt[_]=Vt*T,dt[m]=yt*y,dt[p]=et,c.push(dt.x,dt.y,dt.z),dt[_]=0,dt[m]=0,dt[p]=P>0?1:-1,u.push(dt.x,dt.y,dt.z),h.push(Nt/L),h.push(1-gt/D),it+=1}}for(let gt=0;gt<D;gt++)for(let yt=0;yt<L;yt++){const Nt=d+yt+$*gt,Vt=d+yt+$*(gt+1),Zt=d+(yt+1)+$*(gt+1),Gt=d+(yt+1)+$*gt;l.push(Nt,Vt,Gt),l.push(Vt,Zt,Gt),G+=6}a.addGroup(f,G,b),f+=G,d+=it}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new pi(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function $i(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const r=i[e][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=r.clone():Array.isArray(r)?t[e][n]=r.slice():t[e][n]=r}}return t}function Ce(i){const t={};for(let e=0;e<i.length;e++){const n=$i(i[e]);for(const r in n)t[r]=n[r]}return t}function bd(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function ch(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Jt.workingColorSpace}const Td={clone:$i,merge:Ce};var wd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ad=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Wn extends qi{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=wd,this.fragmentShader=Ad,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=$i(t.uniforms),this.uniformsGroups=bd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?e.uniforms[r]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[r]={type:"m4",value:o.toArray()}:e.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class hh extends Me{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ae,this.projectionMatrix=new ae,this.projectionMatrixInverse=new ae,this.coordinateSystem=pn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const In=new I,Ul=new ct,Nl=new ct;class Ve extends hh{constructor(t=50,e=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Er*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(dr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Er*2*Math.atan(Math.tan(dr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){In.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(In.x,In.y).multiplyScalar(-t/In.z),In.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(In.x,In.y).multiplyScalar(-t/In.z)}getViewSize(t,e){return this.getViewBounds(t,Ul,Nl),e.subVectors(Nl,Ul)}setViewOffset(t,e,n,r,s,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(dr*.5*this.fov)/this.zoom,n=2*e,r=this.aspect*n,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,e-=o.offsetY*n/c,r*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Ri=-90,Ci=1;class Rd extends Me{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Ve(Ri,Ci,t,e);r.layers=this.layers,this.add(r);const s=new Ve(Ri,Ci,t,e);s.layers=this.layers,this.add(s);const o=new Ve(Ri,Ci,t,e);o.layers=this.layers,this.add(o);const a=new Ve(Ri,Ci,t,e);a.layers=this.layers,this.add(a);const l=new Ve(Ri,Ci,t,e);l.layers=this.layers,this.add(l);const c=new Ve(Ri,Ci,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,r,s,o,a,l]=e;for(const c of e)this.remove(c);if(t===pn)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===bs)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,u]=this.children,h=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,r),t.render(e,s),t.setRenderTarget(n,1,r),t.render(e,o),t.setRenderTarget(n,2,r),t.render(e,a),t.setRenderTarget(n,3,r),t.render(e,l),t.setRenderTarget(n,4,r),t.render(e,c),n.texture.generateMipmaps=_,t.setRenderTarget(n,5,r),t.render(e,u),t.setRenderTarget(h,d,f),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class uh extends De{constructor(t=[],e=Gi,n,r,s,o,a,l,c,u){super(t,e,n,r,s,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Cd extends hi{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},r=[n,n,n,n,n,n];this.texture=new uh(r),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new pi(5,5,5),s=new Wn({name:"CubemapFromEquirect",uniforms:$i(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Le,blending:kn});s.uniforms.tEquirect.value=e;const o=new fe(r,s),a=e.minFilter;return e.minFilter===ai&&(e.minFilter=dn),new Rd(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,r=!0){const s=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,r);t.setRenderTarget(s)}}class ar extends Me{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Pd={type:"move"};class so{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ar,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ar,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ar,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const _ of t.hand.values()){const m=e.getJointPose(_,n),p=this._getHandJoint(c,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const u=c.joints["index-finger-tip"],h=c.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=e.getPose(t.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Pd)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new ar;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}class Wa{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new Yt(t),this.near=e,this.far=n}clone(){return new Wa(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class dh extends Me{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new on,this.environmentIntensity=1,this.environmentRotation=new on,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Ld extends De{constructor(t=null,e=1,n=1,r,s,o,a,l,c=Ge,u=Ge,h,d){super(null,o,a,l,c,u,r,s,h,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Fl extends Ke{constructor(t,e,n,r=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Pi=new ae,Ol=new ae,is=[],Bl=new $n,Dd=new ae,er=new fe,nr=new Pr;class Id extends fe{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Fl(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,Dd)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new $n),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Pi),Bl.copy(t.boundingBox).applyMatrix4(Pi),this.boundingBox.union(Bl)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Pr),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Pi),nr.copy(t.boundingSphere).applyMatrix4(Pi),this.boundingSphere.union(nr)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,r=this.morphTexture.source.data.data,s=n.length+1,o=t*s+1;for(let a=0;a<n.length;a++)n[a]=r[o+a]}raycast(t,e){const n=this.matrixWorld,r=this.count;if(er.geometry=this.geometry,er.material=this.material,er.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),nr.copy(this.boundingSphere),nr.applyMatrix4(n),t.ray.intersectsSphere(nr)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,Pi),Ol.multiplyMatrices(n,Pi),er.matrixWorld=Ol,er.raycast(t,is);for(let o=0,a=is.length;o<a;o++){const l=is[o];l.instanceId=s,l.object=this,e.push(l)}is.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new Fl(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Ld(new Float32Array(r*this.count),r,this.count,Oa,fn));const s=this.morphTexture.source.data.data;let o=0;for(let c=0;c<n.length;c++)o+=n[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=r*t;s[l]=a,s.set(n,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const oo=new I,Ud=new I,Nd=new Xt;class Nn{constructor(t=new I(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,r){return this.normal.set(t,e,n),this.constant=r,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const r=oo.subVectors(n,e).cross(Ud.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(oo),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const s=-(t.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:e.copy(t.start).addScaledVector(n,s)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Nd.getNormalMatrix(t),r=this.coplanarPoint(oo).applyMatrix4(t),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Jn=new Pr,Fd=new ct(.5,.5),rs=new I;class Xa{constructor(t=new Nn,e=new Nn,n=new Nn,r=new Nn,s=new Nn,o=new Nn){this.planes=[t,e,n,r,s,o]}set(t,e,n,r,s,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=pn,n=!1){const r=this.planes,s=t.elements,o=s[0],a=s[1],l=s[2],c=s[3],u=s[4],h=s[5],d=s[6],f=s[7],g=s[8],_=s[9],m=s[10],p=s[11],T=s[12],y=s[13],v=s[14],A=s[15];if(r[0].setComponents(c-o,f-u,p-g,A-T).normalize(),r[1].setComponents(c+o,f+u,p+g,A+T).normalize(),r[2].setComponents(c+a,f+h,p+_,A+y).normalize(),r[3].setComponents(c-a,f-h,p-_,A-y).normalize(),n)r[4].setComponents(l,d,m,v).normalize(),r[5].setComponents(c-l,f-d,p-m,A-v).normalize();else if(r[4].setComponents(c-l,f-d,p-m,A-v).normalize(),e===pn)r[5].setComponents(c+l,f+d,p+m,A+v).normalize();else if(e===bs)r[5].setComponents(l,d,m,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Jn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Jn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Jn)}intersectsSprite(t){Jn.center.set(0,0,0);const e=Fd.distanceTo(t.center);return Jn.radius=.7071067811865476+e,Jn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Jn)}intersectsSphere(t){const e=this.planes,n=t.center,r=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const r=e[n];if(rs.x=r.normal.x>0?t.max.x:t.min.x,rs.y=r.normal.y>0?t.max.y:t.min.y,rs.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(rs)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class fh extends De{constructor(t,e,n=li,r,s,o,a=Ge,l=Ge,c,u=Mr,h=1){if(u!==Mr&&u!==Sr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:t,height:e,depth:h};super(d,r,s,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ga(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class ph extends De{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class gn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,r=this.getPoint(0),s=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),s+=n.distanceTo(r),e.push(s),r=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){const n=this.getLengths();let r=0;const s=n.length;let o;e?o=e:o=t*n[s-1];let a=0,l=s-1,c;for(;a<=l;)if(r=Math.floor(a+(l-a)/2),c=n[r]-o,c<0)a=r+1;else if(c>0)l=r-1;else{l=r;break}if(r=l,n[r]===o)return r/(s-1);const u=n[r],d=n[r+1]-u,f=(o-u)/d;return(r+f)/(s-1)}getTangent(t,e){let r=t-1e-4,s=t+1e-4;r<0&&(r=0),s>1&&(s=1);const o=this.getPoint(r),a=this.getPoint(s),l=e||(o.isVector2?new ct:new I);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){const n=new I,r=[],s=[],o=[],a=new I,l=new ae;for(let f=0;f<=t;f++){const g=f/t;r[f]=this.getTangentAt(g,new I)}s[0]=new I,o[0]=new I;let c=Number.MAX_VALUE;const u=Math.abs(r[0].x),h=Math.abs(r[0].y),d=Math.abs(r[0].z);u<=c&&(c=u,n.set(1,0,0)),h<=c&&(c=h,n.set(0,1,0)),d<=c&&n.set(0,0,1),a.crossVectors(r[0],n).normalize(),s[0].crossVectors(r[0],a),o[0].crossVectors(r[0],s[0]);for(let f=1;f<=t;f++){if(s[f]=s[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(r[f-1],r[f]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(jt(r[f-1].dot(r[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(a,g))}o[f].crossVectors(r[f],s[f])}if(e===!0){let f=Math.acos(jt(s[0].dot(s[t]),-1,1));f/=t,r[0].dot(a.crossVectors(s[0],s[t]))>0&&(f=-f);for(let g=1;g<=t;g++)s[g].applyMatrix4(l.makeRotationAxis(r[g],f*g)),o[g].crossVectors(r[g],s[g])}return{tangents:r,normals:s,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class $a extends gn{constructor(t=0,e=0,n=1,r=1,s=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new ct){const n=e,r=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const o=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(o?s=0:s=r),this.aClockwise===!0&&!o&&(s===r?s=-r:s=s-r);const a=this.aStartAngle+t*s;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*u-f*h+this.aX,c=d*h+f*u+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Od extends $a{constructor(t,e,n,r,s,o){super(t,e,n,n,r,s,o),this.isArcCurve=!0,this.type="ArcCurve"}}function Ya(){let i=0,t=0,e=0,n=0;function r(s,o,a,l){i=s,t=a,e=-3*s+3*o-2*a-l,n=2*s-2*o+a+l}return{initCatmullRom:function(s,o,a,l,c){r(o,a,c*(a-s),c*(l-o))},initNonuniformCatmullRom:function(s,o,a,l,c,u,h){let d=(o-s)/c-(a-s)/(c+u)+(a-o)/u,f=(a-o)/u-(l-o)/(u+h)+(l-a)/h;d*=u,f*=u,r(o,a,d,f)},calc:function(s){const o=s*s,a=o*s;return i+t*s+e*o+n*a}}}const ss=new I,ao=new Ya,lo=new Ya,co=new Ya;class mh extends gn{constructor(t=[],e=!1,n="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=r}getPoint(t,e=new I){const n=e,r=this.points,s=r.length,o=(s-(this.closed?0:1))*t;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s:l===0&&a===s-1&&(a=s-2,l=1);let c,u;this.closed||a>0?c=r[(a-1)%s]:(ss.subVectors(r[0],r[1]).add(r[0]),c=ss);const h=r[a%s],d=r[(a+1)%s];if(this.closed||a+2<s?u=r[(a+2)%s]:(ss.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=ss),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(h),f),_=Math.pow(h.distanceToSquared(d),f),m=Math.pow(d.distanceToSquared(u),f);_<1e-4&&(_=1),g<1e-4&&(g=_),m<1e-4&&(m=_),ao.initNonuniformCatmullRom(c.x,h.x,d.x,u.x,g,_,m),lo.initNonuniformCatmullRom(c.y,h.y,d.y,u.y,g,_,m),co.initNonuniformCatmullRom(c.z,h.z,d.z,u.z,g,_,m)}else this.curveType==="catmullrom"&&(ao.initCatmullRom(c.x,h.x,d.x,u.x,this.tension),lo.initCatmullRom(c.y,h.y,d.y,u.y,this.tension),co.initCatmullRom(c.z,h.z,d.z,u.z,this.tension));return n.set(ao.calc(l),lo.calc(l),co.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(r.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const r=this.points[e];t.points.push(r.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(new I().fromArray(r))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function zl(i,t,e,n,r){const s=(n-t)*.5,o=(r-e)*.5,a=i*i,l=i*a;return(2*e-2*n+s+o)*l+(-3*e+3*n-2*s-o)*a+s*i+e}function Bd(i,t){const e=1-i;return e*e*t}function zd(i,t){return 2*(1-i)*i*t}function kd(i,t){return i*i*t}function pr(i,t,e,n){return Bd(i,t)+zd(i,e)+kd(i,n)}function Hd(i,t){const e=1-i;return e*e*e*t}function Vd(i,t){const e=1-i;return 3*e*e*i*t}function Gd(i,t){return 3*(1-i)*i*i*t}function Wd(i,t){return i*i*i*t}function mr(i,t,e,n,r){return Hd(i,t)+Vd(i,e)+Gd(i,n)+Wd(i,r)}class gh extends gn{constructor(t=new ct,e=new ct,n=new ct,r=new ct){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=r}getPoint(t,e=new ct){const n=e,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return n.set(mr(t,r.x,s.x,o.x,a.x),mr(t,r.y,s.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Xd extends gn{constructor(t=new I,e=new I,n=new I,r=new I){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=r}getPoint(t,e=new I){const n=e,r=this.v0,s=this.v1,o=this.v2,a=this.v3;return n.set(mr(t,r.x,s.x,o.x,a.x),mr(t,r.y,s.y,o.y,a.y),mr(t,r.z,s.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class _h extends gn{constructor(t=new ct,e=new ct){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ct){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ct){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class $d extends gn{constructor(t=new I,e=new I){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new I){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new I){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class vh extends gn{constructor(t=new ct,e=new ct,n=new ct){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ct){const n=e,r=this.v0,s=this.v1,o=this.v2;return n.set(pr(t,r.x,s.x,o.x),pr(t,r.y,s.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Yd extends gn{constructor(t=new I,e=new I,n=new I){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new I){const n=e,r=this.v0,s=this.v1,o=this.v2;return n.set(pr(t,r.x,s.x,o.x),pr(t,r.y,s.y,o.y),pr(t,r.z,s.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class xh extends gn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ct){const n=e,r=this.points,s=(r.length-1)*t,o=Math.floor(s),a=s-o,l=r[o===0?o:o-1],c=r[o],u=r[o>r.length-2?r.length-1:o+1],h=r[o>r.length-3?r.length-1:o+2];return n.set(zl(a,l.x,c.x,u.x,h.x),zl(a,l.y,c.y,u.y,h.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(r.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const r=this.points[e];t.points.push(r.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(new ct().fromArray(r))}return this}}var ga=Object.freeze({__proto__:null,ArcCurve:Od,CatmullRomCurve3:mh,CubicBezierCurve:gh,CubicBezierCurve3:Xd,EllipseCurve:$a,LineCurve:_h,LineCurve3:$d,QuadraticBezierCurve:vh,QuadraticBezierCurve3:Yd,SplineCurve:xh});class qd extends gn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new ga[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),r=this.getCurveLengths();let s=0;for(;s<r.length;){if(r[s]>=n){const o=r[s]-n,a=this.curves[s],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}s++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,r=this.curves.length;n<r;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let r=0,s=this.curves;r<s.length;r++){const o=s[r],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){const u=l[c];n&&n.equals(u)||(e.push(u),n=u)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const r=t.curves[e];this.curves.push(r.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const r=this.curves[e];t.curves.push(r.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const r=t.curves[e];this.curves.push(new ga[r.type]().fromJSON(r))}return this}}class _a extends qd{constructor(t){super(),this.type="Path",this.currentPoint=new ct,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new _h(this.currentPoint.clone(),new ct(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,r){const s=new vh(this.currentPoint.clone(),new ct(t,e),new ct(n,r));return this.curves.push(s),this.currentPoint.set(n,r),this}bezierCurveTo(t,e,n,r,s,o){const a=new gh(this.currentPoint.clone(),new ct(t,e),new ct(n,r),new ct(s,o));return this.curves.push(a),this.currentPoint.set(s,o),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new xh(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,r,s,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,r,s,o),this}absarc(t,e,n,r,s,o){return this.absellipse(t,e,n,n,r,s,o),this}ellipse(t,e,n,r,s,o,a,l){const c=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(t+c,e+u,n,r,s,o,a,l),this}absellipse(t,e,n,r,s,o,a,l){const c=new $a(t,e,n,r,s,o,a,l);if(this.curves.length>0){const h=c.getPoint(0);h.equals(this.currentPoint)||this.lineTo(h.x,h.y)}this.curves.push(c);const u=c.getPoint(1);return this.currentPoint.copy(u),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class yh extends _a{constructor(t){super(t),this.uuid=fi(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,r=this.holes.length;n<r;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const r=t.holes[e];this.holes.push(r.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const r=this.holes[e];t.holes.push(r.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const r=t.holes[e];this.holes.push(new _a().fromJSON(r))}return this}}function jd(i,t,e=2){const n=t&&t.length,r=n?t[0]*e:i.length;let s=Mh(i,0,r,e,!0);const o=[];if(!s||s.next===s.prev)return o;let a,l,c;if(n&&(s=tf(i,t,s,e)),i.length>80*e){a=1/0,l=1/0;let u=-1/0,h=-1/0;for(let d=e;d<r;d+=e){const f=i[d],g=i[d+1];f<a&&(a=f),g<l&&(l=g),f>u&&(u=f),g>h&&(h=g)}c=Math.max(u-a,h-l),c=c!==0?32767/c:0}return Tr(s,o,e,a,l,c,0),o}function Mh(i,t,e,n,r){let s;if(r===df(i,t,e,n)>0)for(let o=t;o<e;o+=n)s=kl(o/n|0,i[o],i[o+1],s);else for(let o=e-n;o>=t;o-=n)s=kl(o/n|0,i[o],i[o+1],s);return s&&Yi(s,s.next)&&(Ar(s),s=s.next),s}function ui(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(Yi(e,e.next)||ue(e.prev,e,e.next)===0)){if(Ar(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Tr(i,t,e,n,r,s,o){if(!i)return;!o&&s&&of(i,n,r,s);let a=i;for(;i.prev!==i.next;){const l=i.prev,c=i.next;if(s?Kd(i,n,r,s):Zd(i)){t.push(l.i,i.i,c.i),Ar(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=Jd(ui(i),t),Tr(i,t,e,n,r,s,2)):o===2&&Qd(i,t,e,n,r,s):Tr(ui(i),t,e,n,r,s,1);break}}}function Zd(i){const t=i.prev,e=i,n=i.next;if(ue(t,e,n)>=0)return!1;const r=t.x,s=e.x,o=n.x,a=t.y,l=e.y,c=n.y,u=Math.min(r,s,o),h=Math.min(a,l,c),d=Math.max(r,s,o),f=Math.max(a,l,c);let g=n.next;for(;g!==t;){if(g.x>=u&&g.x<=d&&g.y>=h&&g.y<=f&&lr(r,a,s,l,o,c,g.x,g.y)&&ue(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Kd(i,t,e,n){const r=i.prev,s=i,o=i.next;if(ue(r,s,o)>=0)return!1;const a=r.x,l=s.x,c=o.x,u=r.y,h=s.y,d=o.y,f=Math.min(a,l,c),g=Math.min(u,h,d),_=Math.max(a,l,c),m=Math.max(u,h,d),p=va(f,g,t,e,n),T=va(_,m,t,e,n);let y=i.prevZ,v=i.nextZ;for(;y&&y.z>=p&&v&&v.z<=T;){if(y.x>=f&&y.x<=_&&y.y>=g&&y.y<=m&&y!==r&&y!==o&&lr(a,u,l,h,c,d,y.x,y.y)&&ue(y.prev,y,y.next)>=0||(y=y.prevZ,v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==r&&v!==o&&lr(a,u,l,h,c,d,v.x,v.y)&&ue(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;y&&y.z>=p;){if(y.x>=f&&y.x<=_&&y.y>=g&&y.y<=m&&y!==r&&y!==o&&lr(a,u,l,h,c,d,y.x,y.y)&&ue(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;v&&v.z<=T;){if(v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==r&&v!==o&&lr(a,u,l,h,c,d,v.x,v.y)&&ue(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function Jd(i,t){let e=i;do{const n=e.prev,r=e.next.next;!Yi(n,r)&&Eh(n,e,e.next,r)&&wr(n,r)&&wr(r,n)&&(t.push(n.i,e.i,r.i),Ar(e),Ar(e.next),e=i=r),e=e.next}while(e!==i);return ui(e)}function Qd(i,t,e,n,r,s){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&cf(o,a)){let l=bh(o,a);o=ui(o,o.next),l=ui(l,l.next),Tr(o,t,e,n,r,s,0),Tr(l,t,e,n,r,s,0);return}a=a.next}o=o.next}while(o!==i)}function tf(i,t,e,n){const r=[];for(let s=0,o=t.length;s<o;s++){const a=t[s]*n,l=s<o-1?t[s+1]*n:i.length,c=Mh(i,a,l,n,!1);c===c.next&&(c.steiner=!0),r.push(lf(c))}r.sort(ef);for(let s=0;s<r.length;s++)e=nf(r[s],e);return e}function ef(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),r=(t.next.y-t.y)/(t.next.x-t.x);e=n-r}return e}function nf(i,t){const e=rf(i,t);if(!e)return t;const n=bh(e,i);return ui(n,n.next),ui(e,e.next)}function rf(i,t){let e=t;const n=i.x,r=i.y;let s=-1/0,o;if(Yi(i,e))return e;do{if(Yi(i,e.next))return e.next;if(r<=e.y&&r>=e.next.y&&e.next.y!==e.y){const h=e.x+(r-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(h<=n&&h>s&&(s=h,o=e.x<e.next.x?e:e.next,h===n))return o}e=e.next}while(e!==t);if(!o)return null;const a=o,l=o.x,c=o.y;let u=1/0;e=o;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Sh(r<c?n:s,r,l,c,r<c?s:n,r,e.x,e.y)){const h=Math.abs(r-e.y)/(n-e.x);wr(e,i)&&(h<u||h===u&&(e.x>o.x||e.x===o.x&&sf(o,e)))&&(o=e,u=h)}e=e.next}while(e!==a);return o}function sf(i,t){return ue(i.prev,i,t.prev)<0&&ue(t.next,i,i.next)<0}function of(i,t,e,n){let r=i;do r.z===0&&(r.z=va(r.x,r.y,t,e,n)),r.prevZ=r.prev,r.nextZ=r.next,r=r.next;while(r!==i);r.prevZ.nextZ=null,r.prevZ=null,af(r)}function af(i){let t,e=1;do{let n=i,r;i=null;let s=null;for(t=0;n;){t++;let o=n,a=0;for(let c=0;c<e&&(a++,o=o.nextZ,!!o);c++);let l=e;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(r=n,n=n.nextZ,a--):(r=o,o=o.nextZ,l--),s?s.nextZ=r:i=r,r.prevZ=s,s=r;n=o}s.nextZ=null,e*=2}while(t>1);return i}function va(i,t,e,n,r){return i=(i-e)*r|0,t=(t-n)*r|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function lf(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Sh(i,t,e,n,r,s,o,a){return(r-o)*(t-a)>=(i-o)*(s-a)&&(i-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(s-a)>=(r-o)*(n-a)}function lr(i,t,e,n,r,s,o,a){return!(i===o&&t===a)&&Sh(i,t,e,n,r,s,o,a)}function cf(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!hf(i,t)&&(wr(i,t)&&wr(t,i)&&uf(i,t)&&(ue(i.prev,i,t.prev)||ue(i,t.prev,t))||Yi(i,t)&&ue(i.prev,i,i.next)>0&&ue(t.prev,t,t.next)>0)}function ue(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function Yi(i,t){return i.x===t.x&&i.y===t.y}function Eh(i,t,e,n){const r=as(ue(i,t,e)),s=as(ue(i,t,n)),o=as(ue(e,n,i)),a=as(ue(e,n,t));return!!(r!==s&&o!==a||r===0&&os(i,e,t)||s===0&&os(i,n,t)||o===0&&os(e,i,n)||a===0&&os(e,t,n))}function os(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function as(i){return i>0?1:i<0?-1:0}function hf(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Eh(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function wr(i,t){return ue(i.prev,i,i.next)<0?ue(i,t,i.next)>=0&&ue(i,i.prev,t)>=0:ue(i,t,i.prev)<0||ue(i,i.next,t)<0}function uf(i,t){let e=i,n=!1;const r=(i.x+t.x)/2,s=(i.y+t.y)/2;do e.y>s!=e.next.y>s&&e.next.y!==e.y&&r<(e.next.x-e.x)*(s-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function bh(i,t){const e=xa(i.i,i.x,i.y),n=xa(t.i,t.x,t.y),r=i.next,s=t.prev;return i.next=t,t.prev=i,e.next=r,r.prev=e,n.next=e,e.prev=n,s.next=n,n.prev=s,n}function kl(i,t,e,n){const r=xa(i,t,e);return n?(r.next=n.next,r.prev=n,n.next.prev=r,n.next=r):(r.prev=r,r.next=r),r}function Ar(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function xa(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function df(i,t,e,n){let r=0;for(let s=t,o=e-n;s<e;s+=n)r+=(i[o]-i[s])*(i[s+1]+i[o+1]),o=s;return r}class ff{static triangulate(t,e,n=2){return jd(t,e,n)}}class Fi{static area(t){const e=t.length;let n=0;for(let r=e-1,s=0;s<e;r=s++)n+=t[r].x*t[s].y-t[s].x*t[r].y;return n*.5}static isClockWise(t){return Fi.area(t)<0}static triangulateShape(t,e){const n=[],r=[],s=[];Hl(t),Vl(n,t);let o=t.length;e.forEach(Hl);for(let l=0;l<e.length;l++)r.push(o),o+=e[l].length,Vl(n,e[l]);const a=ff.triangulate(n,r);for(let l=0;l<a.length;l+=3)s.push(a.slice(l,l+3));return s}}function Hl(i){const t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function Vl(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}class qa extends We{constructor(t=new yh([new ct(.5,.5),new ct(-.5,.5),new ct(-.5,-.5),new ct(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];const n=this,r=[],s=[];for(let a=0,l=t.length;a<l;a++){const c=t[a];o(c)}this.setAttribute("position",new ge(r,3)),this.setAttribute("uv",new ge(s,2)),this.computeVertexNormals();function o(a){const l=[],c=e.curveSegments!==void 0?e.curveSegments:12,u=e.steps!==void 0?e.steps:1,h=e.depth!==void 0?e.depth:1;let d=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,g=e.bevelSize!==void 0?e.bevelSize:f-.1,_=e.bevelOffset!==void 0?e.bevelOffset:0,m=e.bevelSegments!==void 0?e.bevelSegments:3;const p=e.extrudePath,T=e.UVGenerator!==void 0?e.UVGenerator:pf;let y,v=!1,A,P,L,D;p&&(y=p.getSpacedPoints(u),v=!0,d=!1,A=p.computeFrenetFrames(u,!1),P=new I,L=new I,D=new I),d||(m=0,f=0,g=0,_=0);const b=a.extractPoints(c);let M=b.shape;const C=b.holes;if(!Fi.isClockWise(M)){M=M.reverse();for(let O=0,B=C.length;O<B;O++){const W=C[O];Fi.isClockWise(W)&&(C[O]=W.reverse())}}function X(O){const W=10000000000000001e-36;let V=O[0];for(let Q=1;Q<=O.length;Q++){const J=Q%O.length,at=O[J],Ht=at.x-V.x,Bt=at.y-V.y,w=Ht*Ht+Bt*Bt,x=Math.max(Math.abs(at.x),Math.abs(at.y),Math.abs(V.x),Math.abs(V.y)),k=W*x*x;if(w<=k){O.splice(J,1),Q--;continue}V=at}}X(M),C.forEach(X);const et=C.length,$=M;for(let O=0;O<et;O++){const B=C[O];M=M.concat(B)}function Z(O,B,W){return B||console.error("THREE.ExtrudeGeometry: vec does not exist"),O.clone().addScaledVector(B,W)}const it=M.length;function G(O,B,W){let V,Q,J;const at=O.x-B.x,Ht=O.y-B.y,Bt=W.x-O.x,w=W.y-O.y,x=at*at+Ht*Ht,k=at*w-Ht*Bt;if(Math.abs(k)>Number.EPSILON){const K=Math.sqrt(x),lt=Math.sqrt(Bt*Bt+w*w),tt=B.x-Ht/K,Pt=B.y+at/K,mt=W.x-w/lt,At=W.y+Bt/lt,Rt=((mt-tt)*w-(At-Pt)*Bt)/(at*w-Ht*Bt);V=tt+at*Rt-O.x,Q=Pt+Ht*Rt-O.y;const ht=V*V+Q*Q;if(ht<=2)return new ct(V,Q);J=Math.sqrt(ht/2)}else{let K=!1;at>Number.EPSILON?Bt>Number.EPSILON&&(K=!0):at<-Number.EPSILON?Bt<-Number.EPSILON&&(K=!0):Math.sign(Ht)===Math.sign(w)&&(K=!0),K?(V=-Ht,Q=at,J=Math.sqrt(x)):(V=at,Q=Ht,J=Math.sqrt(x/2))}return new ct(V/J,Q/J)}const dt=[];for(let O=0,B=$.length,W=B-1,V=O+1;O<B;O++,W++,V++)W===B&&(W=0),V===B&&(V=0),dt[O]=G($[O],$[W],$[V]);const gt=[];let yt,Nt=dt.concat();for(let O=0,B=et;O<B;O++){const W=C[O];yt=[];for(let V=0,Q=W.length,J=Q-1,at=V+1;V<Q;V++,J++,at++)J===Q&&(J=0),at===Q&&(at=0),yt[V]=G(W[V],W[J],W[at]);gt.push(yt),Nt=Nt.concat(yt)}let Vt;if(m===0)Vt=Fi.triangulateShape($,C);else{const O=[],B=[];for(let W=0;W<m;W++){const V=W/m,Q=f*Math.cos(V*Math.PI/2),J=g*Math.sin(V*Math.PI/2)+_;for(let at=0,Ht=$.length;at<Ht;at++){const Bt=Z($[at],dt[at],J);R(Bt.x,Bt.y,-Q),V===0&&O.push(Bt)}for(let at=0,Ht=et;at<Ht;at++){const Bt=C[at];yt=gt[at];const w=[];for(let x=0,k=Bt.length;x<k;x++){const K=Z(Bt[x],yt[x],J);R(K.x,K.y,-Q),V===0&&w.push(K)}V===0&&B.push(w)}}Vt=Fi.triangulateShape(O,B)}const Zt=Vt.length,Gt=g+_;for(let O=0;O<it;O++){const B=d?Z(M[O],Nt[O],Gt):M[O];v?(L.copy(A.normals[0]).multiplyScalar(B.x),P.copy(A.binormals[0]).multiplyScalar(B.y),D.copy(y[0]).add(L).add(P),R(D.x,D.y,D.z)):R(B.x,B.y,0)}for(let O=1;O<=u;O++)for(let B=0;B<it;B++){const W=d?Z(M[B],Nt[B],Gt):M[B];v?(L.copy(A.normals[O]).multiplyScalar(W.x),P.copy(A.binormals[O]).multiplyScalar(W.y),D.copy(y[O]).add(L).add(P),R(D.x,D.y,D.z)):R(W.x,W.y,h/u*O)}for(let O=m-1;O>=0;O--){const B=O/m,W=f*Math.cos(B*Math.PI/2),V=g*Math.sin(B*Math.PI/2)+_;for(let Q=0,J=$.length;Q<J;Q++){const at=Z($[Q],dt[Q],V);R(at.x,at.y,h+W)}for(let Q=0,J=C.length;Q<J;Q++){const at=C[Q];yt=gt[Q];for(let Ht=0,Bt=at.length;Ht<Bt;Ht++){const w=Z(at[Ht],yt[Ht],V);v?R(w.x,w.y+y[u-1].y,y[u-1].x+W):R(w.x,w.y,h+W)}}}nt(),rt();function nt(){const O=r.length/3;if(d){let B=0,W=it*B;for(let V=0;V<Zt;V++){const Q=Vt[V];U(Q[2]+W,Q[1]+W,Q[0]+W)}B=u+m*2,W=it*B;for(let V=0;V<Zt;V++){const Q=Vt[V];U(Q[0]+W,Q[1]+W,Q[2]+W)}}else{for(let B=0;B<Zt;B++){const W=Vt[B];U(W[2],W[1],W[0])}for(let B=0;B<Zt;B++){const W=Vt[B];U(W[0]+it*u,W[1]+it*u,W[2]+it*u)}}n.addGroup(O,r.length/3-O,0)}function rt(){const O=r.length/3;let B=0;Et($,B),B+=$.length;for(let W=0,V=C.length;W<V;W++){const Q=C[W];Et(Q,B),B+=Q.length}n.addGroup(O,r.length/3-O,1)}function Et(O,B){let W=O.length;for(;--W>=0;){const V=W;let Q=W-1;Q<0&&(Q=O.length-1);for(let J=0,at=u+m*2;J<at;J++){const Ht=it*J,Bt=it*(J+1),w=B+V+Ht,x=B+Q+Ht,k=B+Q+Bt,K=B+V+Bt;Y(w,x,k,K)}}}function R(O,B,W){l.push(O),l.push(B),l.push(W)}function U(O,B,W){ot(O),ot(B),ot(W);const V=r.length/3,Q=T.generateTopUV(n,r,V-3,V-2,V-1);S(Q[0]),S(Q[1]),S(Q[2])}function Y(O,B,W,V){ot(O),ot(B),ot(V),ot(B),ot(W),ot(V);const Q=r.length/3,J=T.generateSideWallUV(n,r,Q-6,Q-3,Q-2,Q-1);S(J[0]),S(J[1]),S(J[3]),S(J[1]),S(J[2]),S(J[3])}function ot(O){r.push(l[O*3+0]),r.push(l[O*3+1]),r.push(l[O*3+2])}function S(O){s.push(O.x),s.push(O.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return mf(e,n,t)}static fromJSON(t,e){const n=[];for(let s=0,o=t.shapes.length;s<o;s++){const a=e[t.shapes[s]];n.push(a)}const r=t.options.extrudePath;return r!==void 0&&(t.options.extrudePath=new ga[r.type]().fromJSON(r)),new qa(n,t.options)}}const pf={generateTopUV:function(i,t,e,n,r){const s=t[e*3],o=t[e*3+1],a=t[n*3],l=t[n*3+1],c=t[r*3],u=t[r*3+1];return[new ct(s,o),new ct(a,l),new ct(c,u)]},generateSideWallUV:function(i,t,e,n,r,s){const o=t[e*3],a=t[e*3+1],l=t[e*3+2],c=t[n*3],u=t[n*3+1],h=t[n*3+2],d=t[r*3],f=t[r*3+1],g=t[r*3+2],_=t[s*3],m=t[s*3+1],p=t[s*3+2];return Math.abs(a-u)<Math.abs(o-c)?[new ct(o,1-l),new ct(c,1-h),new ct(d,1-g),new ct(_,1-p)]:[new ct(a,1-l),new ct(u,1-h),new ct(f,1-g),new ct(m,1-p)]}};function mf(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,r=i.length;n<r;n++){const s=i[n];e.shapes.push(s.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}class Lr extends We{constructor(t=1,e=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:r};const s=t/2,o=e/2,a=Math.floor(n),l=Math.floor(r),c=a+1,u=l+1,h=t/a,d=e/l,f=[],g=[],_=[],m=[];for(let p=0;p<u;p++){const T=p*d-o;for(let y=0;y<c;y++){const v=y*h-s;g.push(v,-T,0),_.push(0,0,1),m.push(y/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let T=0;T<a;T++){const y=T+c*p,v=T+c*(p+1),A=T+1+c*(p+1),P=T+1+c*p;f.push(y,v,P),f.push(v,A,P)}this.setIndex(f),this.setAttribute("position",new ge(g,3)),this.setAttribute("normal",new ge(_,3)),this.setAttribute("uv",new ge(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Lr(t.width,t.height,t.widthSegments,t.heightSegments)}}class ja extends We{constructor(t=1,e=.4,n=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:r,arc:s},n=Math.floor(n),r=Math.floor(r);const o=[],a=[],l=[],c=[],u=new I,h=new I,d=new I;for(let f=0;f<=n;f++)for(let g=0;g<=r;g++){const _=g/r*s,m=f/n*Math.PI*2;h.x=(t+e*Math.cos(m))*Math.cos(_),h.y=(t+e*Math.cos(m))*Math.sin(_),h.z=e*Math.sin(m),a.push(h.x,h.y,h.z),u.x=t*Math.cos(_),u.y=t*Math.sin(_),d.subVectors(h,u).normalize(),l.push(d.x,d.y,d.z),c.push(g/r),c.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=r;g++){const _=(r+1)*f+g-1,m=(r+1)*(f-1)+g-1,p=(r+1)*(f-1)+g,T=(r+1)*f+g;o.push(_,m,T),o.push(m,p,T)}this.setIndex(o),this.setAttribute("position",new ge(a,3)),this.setAttribute("normal",new ge(l,3)),this.setAttribute("uv",new ge(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ja(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class Hi extends qi{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Yt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Yt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ha,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new on,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class gf extends qi{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Yt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Yt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ha,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new on,this.combine=Ia,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class _f extends qi{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Iu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class vf extends qi{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Za extends Me{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Yt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class xf extends Za{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Me.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Yt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const ho=new ae,Gl=new I,Wl=new I;class Th{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ct(512,512),this.mapType=mn,this.map=null,this.mapPass=null,this.matrix=new ae,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Xa,this._frameExtents=new ct(1,1),this._viewportCount=1,this._viewports=[new re(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Gl.setFromMatrixPosition(t.matrixWorld),e.position.copy(Gl),Wl.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Wl),e.updateMatrixWorld(),ho.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ho,e.coordinateSystem,e.reversedDepth),e.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(ho)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const Xl=new ae,ir=new I,uo=new I;class yf extends Th{constructor(){super(new Ve(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ct(4,2),this._viewportCount=6,this._viewports=[new re(2,1,1,1),new re(0,1,1,1),new re(3,1,1,1),new re(1,1,1,1),new re(3,0,1,1),new re(1,0,1,1)],this._cubeDirections=[new I(1,0,0),new I(-1,0,0),new I(0,0,1),new I(0,0,-1),new I(0,1,0),new I(0,-1,0)],this._cubeUps=[new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,0,1),new I(0,0,-1)]}updateMatrices(t,e=0){const n=this.camera,r=this.matrix,s=t.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),ir.setFromMatrixPosition(t.matrixWorld),n.position.copy(ir),uo.copy(n.position),uo.add(this._cubeDirections[e]),n.up.copy(this._cubeUps[e]),n.lookAt(uo),n.updateMatrixWorld(),r.makeTranslation(-ir.x,-ir.y,-ir.z),Xl.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Xl,n.coordinateSystem,n.reversedDepth)}}class Mf extends Za{constructor(t,e,n=0,r=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=r,this.shadow=new yf}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}}class wh extends hh{constructor(t=-1,e=1,n=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-t,o=n+t,a=r+e,l=r-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class Sf extends Th{constructor(){super(new wh(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class fo extends Za{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Me.DEFAULT_UP),this.updateMatrix(),this.target=new Me,this.shadow=new Sf}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class Ef extends Ve{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class $l{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=jt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(jt(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class bf extends di{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function Yl(i,t,e,n){const r=Tf(n);switch(e){case Zc:return i*t;case Oa:return i*t/r.components*r.byteLength;case Ba:return i*t/r.components*r.byteLength;case Jc:return i*t*2/r.components*r.byteLength;case za:return i*t*2/r.components*r.byteLength;case Kc:return i*t*3/r.components*r.byteLength;case rn:return i*t*4/r.components*r.byteLength;case ka:return i*t*4/r.components*r.byteLength;case ds:case fs:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ps:case ms:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Go:case Xo:return Math.max(i,16)*Math.max(t,8)/4;case Vo:case Wo:return Math.max(i,8)*Math.max(t,8)/2;case $o:case Yo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case qo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case jo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Zo:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Ko:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Jo:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Qo:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case ta:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case ea:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case na:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case ia:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case ra:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case sa:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case oa:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case aa:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case la:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case ca:case ha:case ua:return Math.ceil(i/4)*Math.ceil(t/4)*16;case da:case fa:return Math.ceil(i/4)*Math.ceil(t/4)*8;case pa:case ma:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Tf(i){switch(i){case mn:case $c:return{byteLength:1,components:1};case xr:case Yc:case Cr:return{byteLength:2,components:1};case Na:case Fa:return{byteLength:2,components:4};case li:case Ua:case fn:return{byteLength:4,components:1};case qc:case jc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Da}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Da);function Ah(){let i=null,t=!1,e=null,n=null;function r(s,o){e(s,o),n=i.requestAnimationFrame(r)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(r),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){i=s}}}function wf(i){const t=new WeakMap;function e(a,l){const c=a.array,u=a.usage,h=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,u),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:h}}function n(a,l,c){const u=l.array,h=l.updateRanges;if(i.bindBuffer(c,a),h.length===0)i.bufferSubData(c,0,u);else{h.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<h.length;f++){const g=h[d],_=h[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,h[d]=_)}h.length=d+1;for(let f=0,g=h.length;f<g;f++){const _=h[f];i.bufferSubData(c,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=t.get(a);(!u||u.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}var Af=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Rf=`#ifdef USE_ALPHAHASH
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
#endif`,Cf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Pf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Lf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Df=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,If=`#ifdef USE_AOMAP
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
#endif`,Uf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Nf=`#ifdef USE_BATCHING
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
#endif`,Ff=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Of=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Bf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,zf=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,kf=`#ifdef USE_IRIDESCENCE
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
#endif`,Hf=`#ifdef USE_BUMPMAP
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
#endif`,Vf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Gf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Wf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Xf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,$f=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Yf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,qf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,jf=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Zf=`#define PI 3.141592653589793
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
} // validated`,Kf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Jf=`vec3 transformedNormal = objectNormal;
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
#endif`,Qf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,tp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,ep=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,np=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ip="gl_FragColor = linearToOutputTexel( gl_FragColor );",rp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,sp=`#ifdef USE_ENVMAP
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
#endif`,op=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,ap=`#ifdef USE_ENVMAP
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
#endif`,lp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,cp=`#ifdef USE_ENVMAP
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
#endif`,hp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,up=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,dp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,pp=`#ifdef USE_GRADIENTMAP
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
}`,mp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,gp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,_p=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,vp=`uniform bool receiveShadow;
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
#endif`,xp=`#ifdef USE_ENVMAP
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
#endif`,yp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Mp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Sp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ep=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,bp=`PhysicalMaterial material;
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
#endif`,Tp=`struct PhysicalMaterial {
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
}`,wp=`
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
#endif`,Ap=`#if defined( RE_IndirectDiffuse )
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
#endif`,Rp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Cp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Pp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Lp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Dp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ip=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Up=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Np=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Fp=`#if defined( USE_POINTS_UV )
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
#endif`,Op=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Bp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,zp=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,kp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Hp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vp=`#ifdef USE_MORPHTARGETS
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
#endif`,Gp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Wp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Xp=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,$p=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,jp=`#ifdef USE_NORMALMAP
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
#endif`,Zp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Kp=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Jp=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Qp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,tm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,em=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,nm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,im=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,rm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,sm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,om=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,am=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,lm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
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
#endif`,cm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,hm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,um=`float getShadowMask() {
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
}`,dm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,fm=`#ifdef USE_SKINNING
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
#endif`,pm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,mm=`#ifdef USE_SKINNING
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
#endif`,gm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,_m=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,vm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,xm=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,ym=`#ifdef USE_TRANSMISSION
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
#endif`,Mm=`#ifdef USE_TRANSMISSION
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
#endif`,Sm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Em=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,bm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Tm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const wm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Am=`uniform sampler2D t2D;
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
}`,Rm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Cm=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Pm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Lm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dm=`#include <common>
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
}`,Im=`#if DEPTH_PACKING == 3200
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
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Um=`#define DISTANCE
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
}`,Nm=`#define DISTANCE
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
}`,Fm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Om=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Bm=`uniform float scale;
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
}`,zm=`uniform vec3 diffuse;
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
}`,km=`#include <common>
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
}`,Hm=`uniform vec3 diffuse;
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
}`,Vm=`#define LAMBERT
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
}`,Gm=`#define LAMBERT
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
}`,Wm=`#define MATCAP
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
}`,Xm=`#define MATCAP
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
}`,$m=`#define NORMAL
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
}`,Ym=`#define NORMAL
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
}`,qm=`#define PHONG
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
}`,jm=`#define PHONG
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
}`,Zm=`#define STANDARD
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
}`,Km=`#define STANDARD
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
}`,Jm=`#define TOON
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
}`,Qm=`#define TOON
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
}`,tg=`uniform float size;
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
}`,eg=`uniform vec3 diffuse;
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
}`,ng=`#include <common>
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
}`,ig=`uniform vec3 color;
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
}`,rg=`uniform float rotation;
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
}`,sg=`uniform vec3 diffuse;
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
}`,qt={alphahash_fragment:Af,alphahash_pars_fragment:Rf,alphamap_fragment:Cf,alphamap_pars_fragment:Pf,alphatest_fragment:Lf,alphatest_pars_fragment:Df,aomap_fragment:If,aomap_pars_fragment:Uf,batching_pars_vertex:Nf,batching_vertex:Ff,begin_vertex:Of,beginnormal_vertex:Bf,bsdfs:zf,iridescence_fragment:kf,bumpmap_pars_fragment:Hf,clipping_planes_fragment:Vf,clipping_planes_pars_fragment:Gf,clipping_planes_pars_vertex:Wf,clipping_planes_vertex:Xf,color_fragment:$f,color_pars_fragment:Yf,color_pars_vertex:qf,color_vertex:jf,common:Zf,cube_uv_reflection_fragment:Kf,defaultnormal_vertex:Jf,displacementmap_pars_vertex:Qf,displacementmap_vertex:tp,emissivemap_fragment:ep,emissivemap_pars_fragment:np,colorspace_fragment:ip,colorspace_pars_fragment:rp,envmap_fragment:sp,envmap_common_pars_fragment:op,envmap_pars_fragment:ap,envmap_pars_vertex:lp,envmap_physical_pars_fragment:xp,envmap_vertex:cp,fog_vertex:hp,fog_pars_vertex:up,fog_fragment:dp,fog_pars_fragment:fp,gradientmap_pars_fragment:pp,lightmap_pars_fragment:mp,lights_lambert_fragment:gp,lights_lambert_pars_fragment:_p,lights_pars_begin:vp,lights_toon_fragment:yp,lights_toon_pars_fragment:Mp,lights_phong_fragment:Sp,lights_phong_pars_fragment:Ep,lights_physical_fragment:bp,lights_physical_pars_fragment:Tp,lights_fragment_begin:wp,lights_fragment_maps:Ap,lights_fragment_end:Rp,logdepthbuf_fragment:Cp,logdepthbuf_pars_fragment:Pp,logdepthbuf_pars_vertex:Lp,logdepthbuf_vertex:Dp,map_fragment:Ip,map_pars_fragment:Up,map_particle_fragment:Np,map_particle_pars_fragment:Fp,metalnessmap_fragment:Op,metalnessmap_pars_fragment:Bp,morphinstance_vertex:zp,morphcolor_vertex:kp,morphnormal_vertex:Hp,morphtarget_pars_vertex:Vp,morphtarget_vertex:Gp,normal_fragment_begin:Wp,normal_fragment_maps:Xp,normal_pars_fragment:$p,normal_pars_vertex:Yp,normal_vertex:qp,normalmap_pars_fragment:jp,clearcoat_normal_fragment_begin:Zp,clearcoat_normal_fragment_maps:Kp,clearcoat_pars_fragment:Jp,iridescence_pars_fragment:Qp,opaque_fragment:tm,packing:em,premultiplied_alpha_fragment:nm,project_vertex:im,dithering_fragment:rm,dithering_pars_fragment:sm,roughnessmap_fragment:om,roughnessmap_pars_fragment:am,shadowmap_pars_fragment:lm,shadowmap_pars_vertex:cm,shadowmap_vertex:hm,shadowmask_pars_fragment:um,skinbase_vertex:dm,skinning_pars_vertex:fm,skinning_vertex:pm,skinnormal_vertex:mm,specularmap_fragment:gm,specularmap_pars_fragment:_m,tonemapping_fragment:vm,tonemapping_pars_fragment:xm,transmission_fragment:ym,transmission_pars_fragment:Mm,uv_pars_fragment:Sm,uv_pars_vertex:Em,uv_vertex:bm,worldpos_vertex:Tm,background_vert:wm,background_frag:Am,backgroundCube_vert:Rm,backgroundCube_frag:Cm,cube_vert:Pm,cube_frag:Lm,depth_vert:Dm,depth_frag:Im,distanceRGBA_vert:Um,distanceRGBA_frag:Nm,equirect_vert:Fm,equirect_frag:Om,linedashed_vert:Bm,linedashed_frag:zm,meshbasic_vert:km,meshbasic_frag:Hm,meshlambert_vert:Vm,meshlambert_frag:Gm,meshmatcap_vert:Wm,meshmatcap_frag:Xm,meshnormal_vert:$m,meshnormal_frag:Ym,meshphong_vert:qm,meshphong_frag:jm,meshphysical_vert:Zm,meshphysical_frag:Km,meshtoon_vert:Jm,meshtoon_frag:Qm,points_vert:tg,points_frag:eg,shadow_vert:ng,shadow_frag:ig,sprite_vert:rg,sprite_frag:sg},vt={common:{diffuse:{value:new Yt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new ct(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Yt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Yt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new Yt(16777215)},opacity:{value:1},center:{value:new ct(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},cn={basic:{uniforms:Ce([vt.common,vt.specularmap,vt.envmap,vt.aomap,vt.lightmap,vt.fog]),vertexShader:qt.meshbasic_vert,fragmentShader:qt.meshbasic_frag},lambert:{uniforms:Ce([vt.common,vt.specularmap,vt.envmap,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.fog,vt.lights,{emissive:{value:new Yt(0)}}]),vertexShader:qt.meshlambert_vert,fragmentShader:qt.meshlambert_frag},phong:{uniforms:Ce([vt.common,vt.specularmap,vt.envmap,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.fog,vt.lights,{emissive:{value:new Yt(0)},specular:{value:new Yt(1118481)},shininess:{value:30}}]),vertexShader:qt.meshphong_vert,fragmentShader:qt.meshphong_frag},standard:{uniforms:Ce([vt.common,vt.envmap,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.roughnessmap,vt.metalnessmap,vt.fog,vt.lights,{emissive:{value:new Yt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:qt.meshphysical_vert,fragmentShader:qt.meshphysical_frag},toon:{uniforms:Ce([vt.common,vt.aomap,vt.lightmap,vt.emissivemap,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.gradientmap,vt.fog,vt.lights,{emissive:{value:new Yt(0)}}]),vertexShader:qt.meshtoon_vert,fragmentShader:qt.meshtoon_frag},matcap:{uniforms:Ce([vt.common,vt.bumpmap,vt.normalmap,vt.displacementmap,vt.fog,{matcap:{value:null}}]),vertexShader:qt.meshmatcap_vert,fragmentShader:qt.meshmatcap_frag},points:{uniforms:Ce([vt.points,vt.fog]),vertexShader:qt.points_vert,fragmentShader:qt.points_frag},dashed:{uniforms:Ce([vt.common,vt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:qt.linedashed_vert,fragmentShader:qt.linedashed_frag},depth:{uniforms:Ce([vt.common,vt.displacementmap]),vertexShader:qt.depth_vert,fragmentShader:qt.depth_frag},normal:{uniforms:Ce([vt.common,vt.bumpmap,vt.normalmap,vt.displacementmap,{opacity:{value:1}}]),vertexShader:qt.meshnormal_vert,fragmentShader:qt.meshnormal_frag},sprite:{uniforms:Ce([vt.sprite,vt.fog]),vertexShader:qt.sprite_vert,fragmentShader:qt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:qt.background_vert,fragmentShader:qt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:qt.backgroundCube_vert,fragmentShader:qt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:qt.cube_vert,fragmentShader:qt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:qt.equirect_vert,fragmentShader:qt.equirect_frag},distanceRGBA:{uniforms:Ce([vt.common,vt.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:qt.distanceRGBA_vert,fragmentShader:qt.distanceRGBA_frag},shadow:{uniforms:Ce([vt.lights,vt.fog,{color:{value:new Yt(0)},opacity:{value:1}}]),vertexShader:qt.shadow_vert,fragmentShader:qt.shadow_frag}};cn.physical={uniforms:Ce([cn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new ct(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new Yt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new ct},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new Yt(0)},specularColor:{value:new Yt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new ct},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:qt.meshphysical_vert,fragmentShader:qt.meshphysical_frag};const ls={r:0,b:0,g:0},Qn=new on,og=new ae;function ag(i,t,e,n,r,s,o){const a=new Yt(0);let l=s===!0?0:1,c,u,h=null,d=0,f=null;function g(y){let v=y.isScene===!0?y.background:null;return v&&v.isTexture&&(v=(y.backgroundBlurriness>0?e:t).get(v)),v}function _(y){let v=!1;const A=g(y);A===null?p(a,l):A&&A.isColor&&(p(A,1),v=!0);const P=i.xr.getEnvironmentBlendMode();P==="additive"?n.buffers.color.setClear(0,0,0,1,o):P==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||v)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(y,v){const A=g(v);A&&(A.isCubeTexture||A.mapping===Ds)?(u===void 0&&(u=new fe(new pi(1,1,1),new Wn({name:"BackgroundCubeMaterial",uniforms:$i(cn.backgroundCube.uniforms),vertexShader:cn.backgroundCube.vertexShader,fragmentShader:cn.backgroundCube.fragmentShader,side:Le,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(P,L,D){this.matrixWorld.copyPosition(D.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Qn.copy(v.backgroundRotation),Qn.x*=-1,Qn.y*=-1,Qn.z*=-1,A.isCubeTexture&&A.isRenderTargetTexture===!1&&(Qn.y*=-1,Qn.z*=-1),u.material.uniforms.envMap.value=A,u.material.uniforms.flipEnvMap.value=A.isCubeTexture&&A.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(og.makeRotationFromEuler(Qn)),u.material.toneMapped=Jt.getTransfer(A.colorSpace)!==ne,(h!==A||d!==A.version||f!==i.toneMapping)&&(u.material.needsUpdate=!0,h=A,d=A.version,f=i.toneMapping),u.layers.enableAll(),y.unshift(u,u.geometry,u.material,0,0,null)):A&&A.isTexture&&(c===void 0&&(c=new fe(new Lr(2,2),new Wn({name:"BackgroundMaterial",uniforms:$i(cn.background.uniforms),vertexShader:cn.background.vertexShader,fragmentShader:cn.background.fragmentShader,side:Gn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=A,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=Jt.getTransfer(A.colorSpace)!==ne,A.matrixAutoUpdate===!0&&A.updateMatrix(),c.material.uniforms.uvTransform.value.copy(A.matrix),(h!==A||d!==A.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,h=A,d=A.version,f=i.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null))}function p(y,v){y.getRGB(ls,ch(i)),n.buffers.color.setClear(ls.r,ls.g,ls.b,v,o)}function T(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,v=1){a.set(y),l=v,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(y){l=y,p(a,l)},render:_,addToRenderList:m,dispose:T}}function lg(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=d(null);let s=r,o=!1;function a(M,C,H,X,et){let $=!1;const Z=h(X,H,C);s!==Z&&(s=Z,c(s.object)),$=f(M,X,H,et),$&&g(M,X,H,et),et!==null&&t.update(et,i.ELEMENT_ARRAY_BUFFER),($||o)&&(o=!1,v(M,C,H,X),et!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(et).buffer))}function l(){return i.createVertexArray()}function c(M){return i.bindVertexArray(M)}function u(M){return i.deleteVertexArray(M)}function h(M,C,H){const X=H.wireframe===!0;let et=n[M.id];et===void 0&&(et={},n[M.id]=et);let $=et[C.id];$===void 0&&($={},et[C.id]=$);let Z=$[X];return Z===void 0&&(Z=d(l()),$[X]=Z),Z}function d(M){const C=[],H=[],X=[];for(let et=0;et<e;et++)C[et]=0,H[et]=0,X[et]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:H,attributeDivisors:X,object:M,attributes:{},index:null}}function f(M,C,H,X){const et=s.attributes,$=C.attributes;let Z=0;const it=H.getAttributes();for(const G in it)if(it[G].location>=0){const gt=et[G];let yt=$[G];if(yt===void 0&&(G==="instanceMatrix"&&M.instanceMatrix&&(yt=M.instanceMatrix),G==="instanceColor"&&M.instanceColor&&(yt=M.instanceColor)),gt===void 0||gt.attribute!==yt||yt&&gt.data!==yt.data)return!0;Z++}return s.attributesNum!==Z||s.index!==X}function g(M,C,H,X){const et={},$=C.attributes;let Z=0;const it=H.getAttributes();for(const G in it)if(it[G].location>=0){let gt=$[G];gt===void 0&&(G==="instanceMatrix"&&M.instanceMatrix&&(gt=M.instanceMatrix),G==="instanceColor"&&M.instanceColor&&(gt=M.instanceColor));const yt={};yt.attribute=gt,gt&&gt.data&&(yt.data=gt.data),et[G]=yt,Z++}s.attributes=et,s.attributesNum=Z,s.index=X}function _(){const M=s.newAttributes;for(let C=0,H=M.length;C<H;C++)M[C]=0}function m(M){p(M,0)}function p(M,C){const H=s.newAttributes,X=s.enabledAttributes,et=s.attributeDivisors;H[M]=1,X[M]===0&&(i.enableVertexAttribArray(M),X[M]=1),et[M]!==C&&(i.vertexAttribDivisor(M,C),et[M]=C)}function T(){const M=s.newAttributes,C=s.enabledAttributes;for(let H=0,X=C.length;H<X;H++)C[H]!==M[H]&&(i.disableVertexAttribArray(H),C[H]=0)}function y(M,C,H,X,et,$,Z){Z===!0?i.vertexAttribIPointer(M,C,H,et,$):i.vertexAttribPointer(M,C,H,X,et,$)}function v(M,C,H,X){_();const et=X.attributes,$=H.getAttributes(),Z=C.defaultAttributeValues;for(const it in $){const G=$[it];if(G.location>=0){let dt=et[it];if(dt===void 0&&(it==="instanceMatrix"&&M.instanceMatrix&&(dt=M.instanceMatrix),it==="instanceColor"&&M.instanceColor&&(dt=M.instanceColor)),dt!==void 0){const gt=dt.normalized,yt=dt.itemSize,Nt=t.get(dt);if(Nt===void 0)continue;const Vt=Nt.buffer,Zt=Nt.type,Gt=Nt.bytesPerElement,nt=Zt===i.INT||Zt===i.UNSIGNED_INT||dt.gpuType===Ua;if(dt.isInterleavedBufferAttribute){const rt=dt.data,Et=rt.stride,R=dt.offset;if(rt.isInstancedInterleavedBuffer){for(let U=0;U<G.locationSize;U++)p(G.location+U,rt.meshPerAttribute);M.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=rt.meshPerAttribute*rt.count)}else for(let U=0;U<G.locationSize;U++)m(G.location+U);i.bindBuffer(i.ARRAY_BUFFER,Vt);for(let U=0;U<G.locationSize;U++)y(G.location+U,yt/G.locationSize,Zt,gt,Et*Gt,(R+yt/G.locationSize*U)*Gt,nt)}else{if(dt.isInstancedBufferAttribute){for(let rt=0;rt<G.locationSize;rt++)p(G.location+rt,dt.meshPerAttribute);M.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=dt.meshPerAttribute*dt.count)}else for(let rt=0;rt<G.locationSize;rt++)m(G.location+rt);i.bindBuffer(i.ARRAY_BUFFER,Vt);for(let rt=0;rt<G.locationSize;rt++)y(G.location+rt,yt/G.locationSize,Zt,gt,yt*Gt,yt/G.locationSize*rt*Gt,nt)}}else if(Z!==void 0){const gt=Z[it];if(gt!==void 0)switch(gt.length){case 2:i.vertexAttrib2fv(G.location,gt);break;case 3:i.vertexAttrib3fv(G.location,gt);break;case 4:i.vertexAttrib4fv(G.location,gt);break;default:i.vertexAttrib1fv(G.location,gt)}}}}T()}function A(){D();for(const M in n){const C=n[M];for(const H in C){const X=C[H];for(const et in X)u(X[et].object),delete X[et];delete C[H]}delete n[M]}}function P(M){if(n[M.id]===void 0)return;const C=n[M.id];for(const H in C){const X=C[H];for(const et in X)u(X[et].object),delete X[et];delete C[H]}delete n[M.id]}function L(M){for(const C in n){const H=n[C];if(H[M.id]===void 0)continue;const X=H[M.id];for(const et in X)u(X[et].object),delete X[et];delete H[M.id]}}function D(){b(),o=!0,s!==r&&(s=r,c(s.object))}function b(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:D,resetDefaultState:b,dispose:A,releaseStatesOfGeometry:P,releaseStatesOfProgram:L,initAttributes:_,enableAttribute:m,disableUnusedAttributes:T}}function cg(i,t,e){let n;function r(c){n=c}function s(c,u){i.drawArrays(n,c,u),e.update(u,n,1)}function o(c,u,h){h!==0&&(i.drawArraysInstanced(n,c,u,h),e.update(u,n,h))}function a(c,u,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,u,0,h);let f=0;for(let g=0;g<h;g++)f+=u[g];e.update(f,n,1)}function l(c,u,h,d){if(h===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)o(c[g],u[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,u,0,d,0,h);let g=0;for(let _=0;_<h;_++)g+=u[_]*d[_];e.update(g,n,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function hg(i,t,e,n){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){const L=t.get("EXT_texture_filter_anisotropic");r=i.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(L){return!(L!==rn&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(L){const D=L===Cr&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(L!==mn&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&L!==fn&&!D)}function l(L){if(L==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";L="mediump"}return L==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const h=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),T=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=g>0,P=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:h,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:T,maxVaryings:y,maxFragmentUniforms:v,vertexTextures:A,maxSamples:P}}function ug(i){const t=this;let e=null,n=0,r=!1,s=!1;const o=new Nn,a=new Xt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){const f=h.length!==0||d||n!==0||r;return r=d,n=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,d){e=u(h,d,0)},this.setState=function(h,d,f){const g=h.clippingPlanes,_=h.clipIntersection,m=h.clipShadows,p=i.get(h);if(!r||g===null||g.length===0||s&&!m)s?u(null):c();else{const T=s?0:n,y=T*4;let v=p.clippingState||null;l.value=v,v=u(g,d,y,f);for(let A=0;A!==y;++A)v[A]=e[A];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=T}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function u(h,d,f,g){const _=h!==null?h.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const p=f+_*4,T=d.matrixWorldInverse;a.getNormalMatrix(T),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,v=f;y!==_;++y,v+=4)o.copy(h[y]).applyMatrix4(T,a),o.normal.toArray(m,v),m[v+3]=o.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,m}}function dg(i){let t=new WeakMap;function e(o,a){return a===Bo?o.mapping=Gi:a===zo&&(o.mapping=Wi),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Bo||a===zo)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Cd(l.height);return c.fromEquirectangularTexture(i,o),t.set(o,c),o.addEventListener("dispose",r),e(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function s(){t=new WeakMap}return{get:n,dispose:s}}const Oi=4,ql=[.125,.215,.35,.446,.526,.582],ri=20,po=new wh,jl=new Yt;let mo=null,go=0,_o=0,vo=!1;const ni=(1+Math.sqrt(5))/2,Li=1/ni,Zl=[new I(-ni,Li,0),new I(ni,Li,0),new I(-Li,0,ni),new I(Li,0,ni),new I(0,ni,-Li),new I(0,ni,Li),new I(-1,1,-1),new I(1,1,-1),new I(-1,1,1),new I(1,1,1)],fg=new I;class ya{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,r=100,s={}){const{size:o=256,position:a=fg}=s;mo=this._renderer.getRenderTarget(),go=this._renderer.getActiveCubeFace(),_o=this._renderer.getActiveMipmapLevel(),vo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,r,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ql(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Jl(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(mo,go,_o),this._renderer.xr.enabled=vo,t.scissorTest=!1,cs(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Gi||t.mapping===Wi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),mo=this._renderer.getRenderTarget(),go=this._renderer.getActiveCubeFace(),_o=this._renderer.getActiveMipmapLevel(),vo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:dn,minFilter:dn,generateMipmaps:!1,type:Cr,format:rn,colorSpace:Xi,depthBuffer:!1},r=Kl(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Kl(t,e,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=pg(s)),this._blurMaterial=mg(s,t,e)}return r}_compileMaterial(t){const e=new fe(this._lodPlanes[0],t);this._renderer.compile(e,po)}_sceneToCubeUV(t,e,n,r,s){const l=new Ve(90,1,e,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,f=h.toneMapping;h.getClearColor(jl),h.toneMapping=Hn,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(r),h.clearDepth(),h.setRenderTarget(null));const _=new oh({name:"PMREM.Background",side:Le,depthWrite:!1,depthTest:!1}),m=new fe(new pi,_);let p=!1;const T=t.background;T?T.isColor&&(_.color.copy(T),t.background=null,p=!0):(_.color.copy(jl),p=!0);for(let y=0;y<6;y++){const v=y%3;v===0?(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[y],s.y,s.z)):v===1?(l.up.set(0,0,c[y]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[y],s.z)):(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[y]));const A=this._cubeSize;cs(r,v*A,y>2?A:0,A,A),h.setRenderTarget(r),p&&h.render(m,l),h.render(t,l)}m.geometry.dispose(),m.material.dispose(),h.toneMapping=f,h.autoClear=d,t.background=T}_textureToCubeUV(t,e){const n=this._renderer,r=t.mapping===Gi||t.mapping===Wi;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ql()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Jl());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new fe(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=t;const l=this._cubeSize;cs(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,po)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=Zl[(r-s-1)%Zl.length];this._blur(t,s-1,s,o,a)}e.autoClear=n}_blur(t,e,n,r,s){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,r,"latitudinal",s),this._halfBlur(o,t,n,n,r,"longitudinal",s)}_halfBlur(t,e,n,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new fe(this._lodPlanes[r],c),d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ri-1),_=s/g,m=isFinite(s)?1+Math.floor(u*_):ri;m>ri&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${ri}`);const p=[];let T=0;for(let L=0;L<ri;++L){const D=L/_,b=Math.exp(-D*D/2);p.push(b),L===0?T+=b:L<m&&(T+=2*b)}for(let L=0;L<p.length;L++)p[L]=p[L]/T;d.envMap.value=t.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:y}=this;d.dTheta.value=g,d.mipInt.value=y-n;const v=this._sizeLods[r],A=3*v*(r>y-Oi?r-y+Oi:0),P=4*(this._cubeSize-v);cs(e,A,P,3*v,2*v),l.setRenderTarget(e),l.render(h,po)}}function pg(i){const t=[],e=[],n=[];let r=i;const s=i-Oi+1+ql.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);e.push(a);let l=1/a;o>i-Oi?l=ql[o-i+Oi-1]:o===0&&(l=0),n.push(l);const c=1/(a-2),u=-c,h=1+c,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,g=6,_=3,m=2,p=1,T=new Float32Array(_*g*f),y=new Float32Array(m*g*f),v=new Float32Array(p*g*f);for(let P=0;P<f;P++){const L=P%3*2/3-1,D=P>2?0:-1,b=[L,D,0,L+2/3,D,0,L+2/3,D+1,0,L,D,0,L+2/3,D+1,0,L,D+1,0];T.set(b,_*g*P),y.set(d,m*g*P);const M=[P,P,P,P,P,P];v.set(M,p*g*P)}const A=new We;A.setAttribute("position",new Ke(T,_)),A.setAttribute("uv",new Ke(y,m)),A.setAttribute("faceIndex",new Ke(v,p)),t.push(A),r>Oi&&r--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function Kl(i,t,e){const n=new hi(i,t,e);return n.texture.mapping=Ds,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function cs(i,t,e,n,r){i.viewport.set(t,e,n,r),i.scissor.set(t,e,n,r)}function mg(i,t,e){const n=new Float32Array(ri),r=new I(0,1,0);return new Wn({name:"SphericalGaussianBlur",defines:{n:ri,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Ka(),fragmentShader:`

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
		`,blending:kn,depthTest:!1,depthWrite:!1})}function Jl(){return new Wn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ka(),fragmentShader:`

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
		`,blending:kn,depthTest:!1,depthWrite:!1})}function Ql(){return new Wn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ka(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:kn,depthTest:!1,depthWrite:!1})}function Ka(){return`

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
	`}function gg(i){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Bo||l===zo,u=l===Gi||l===Wi;if(c||u){let h=t.get(a);const d=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return e===null&&(e=new ya(i)),h=c?e.fromEquirectangular(a,h):e.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,t.set(a,h),h.texture;if(h!==void 0)return h.texture;{const f=a.image;return c&&f&&f.height>0||u&&f&&r(f)?(e===null&&(e=new ya(i)),h=c?e.fromEquirectangular(a):e.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,t.set(a,h),a.addEventListener("dispose",s),h.texture):null}}}return a}function r(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function _g(i){const t={};function e(n){if(t[n]!==void 0)return t[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return t[n]=r,r}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const r=e(n);return r===null&&br("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function vg(i,t,e,n){const r={},s=new WeakMap;function o(h){const d=h.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete r[d.id];const f=s.get(d);f&&(t.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(h,d){return r[d.id]===!0||(d.addEventListener("dispose",o),r[d.id]=!0,e.memory.geometries++),d}function l(h){const d=h.attributes;for(const f in d)t.update(d[f],i.ARRAY_BUFFER)}function c(h){const d=[],f=h.index,g=h.attributes.position;let _=0;if(f!==null){const T=f.array;_=f.version;for(let y=0,v=T.length;y<v;y+=3){const A=T[y+0],P=T[y+1],L=T[y+2];d.push(A,P,P,L,L,A)}}else if(g!==void 0){const T=g.array;_=g.version;for(let y=0,v=T.length/3-1;y<v;y+=3){const A=y+0,P=y+1,L=y+2;d.push(A,P,P,L,L,A)}}else return;const m=new(eh(d)?lh:ah)(d,1);m.version=_;const p=s.get(h);p&&t.remove(p),s.set(h,m)}function u(h){const d=s.get(h);if(d){const f=h.index;f!==null&&d.version<f.version&&c(h)}else c(h);return s.get(h)}return{get:a,update:l,getWireframeAttribute:u}}function xg(i,t,e){let n;function r(d){n=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function l(d,f){i.drawElements(n,f,s,d*o),e.update(f,n,1)}function c(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,s,d*o,g),e.update(f,n,g))}function u(d,f,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];e.update(m,n,1)}function h(d,f,g,_){if(g===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/o,f[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,s,d,0,_,0,g);let p=0;for(let T=0;T<g;T++)p+=f[T]*_[T];e.update(p,n,1)}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function yg(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(s/3);break;case i.LINES:e.lines+=a*(s/2);break;case i.LINE_STRIP:e.lines+=a*(s-1);break;case i.LINE_LOOP:e.lines+=a*s;break;case i.POINTS:e.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:r,update:n}}function Mg(i,t,e){const n=new WeakMap,r=new re;function s(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0;let d=n.get(a);if(d===void 0||d.count!==h){let M=function(){D.dispose(),n.delete(a),a.removeEventListener("dispose",M)};var f=M;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],T=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let v=0;g===!0&&(v=1),_===!0&&(v=2),m===!0&&(v=3);let A=a.attributes.position.count*v,P=1;A>t.maxTextureSize&&(P=Math.ceil(A/t.maxTextureSize),A=t.maxTextureSize);const L=new Float32Array(A*P*4*h),D=new nh(L,A,P,h);D.type=fn,D.needsUpdate=!0;const b=v*4;for(let C=0;C<h;C++){const H=p[C],X=T[C],et=y[C],$=A*P*4*C;for(let Z=0;Z<H.count;Z++){const it=Z*b;g===!0&&(r.fromBufferAttribute(H,Z),L[$+it+0]=r.x,L[$+it+1]=r.y,L[$+it+2]=r.z,L[$+it+3]=0),_===!0&&(r.fromBufferAttribute(X,Z),L[$+it+4]=r.x,L[$+it+5]=r.y,L[$+it+6]=r.z,L[$+it+7]=0),m===!0&&(r.fromBufferAttribute(et,Z),L[$+it+8]=r.x,L[$+it+9]=r.y,L[$+it+10]=r.z,L[$+it+11]=et.itemSize===4?r.w:1)}}d={count:h,texture:D,size:new ct(A,P)},n.set(a,d),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const _=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",_),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:s}}function Sg(i,t,e,n){let r=new WeakMap;function s(l){const c=n.render.frame,u=l.geometry,h=t.get(l,u);if(r.get(h)!==c&&(t.update(h),r.set(h,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;r.get(d)!==c&&(d.update(),r.set(d,c))}return h}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:s,dispose:o}}const Rh=new De,tc=new fh(1,1),Ch=new nh,Ph=new dd,Lh=new uh,ec=[],nc=[],ic=new Float32Array(16),rc=new Float32Array(9),sc=new Float32Array(4);function ji(i,t,e){const n=i[0];if(n<=0||n>0)return i;const r=t*e;let s=ec[r];if(s===void 0&&(s=new Float32Array(r),ec[r]=s),t!==0){n.toArray(s,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(s,a)}return s}function ve(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function xe(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Is(i,t){let e=nc[t];e===void 0&&(e=new Int32Array(t),nc[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Eg(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function bg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ve(e,t))return;i.uniform2fv(this.addr,t),xe(e,t)}}function Tg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(ve(e,t))return;i.uniform3fv(this.addr,t),xe(e,t)}}function wg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ve(e,t))return;i.uniform4fv(this.addr,t),xe(e,t)}}function Ag(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(ve(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),xe(e,t)}else{if(ve(e,n))return;sc.set(n),i.uniformMatrix2fv(this.addr,!1,sc),xe(e,n)}}function Rg(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(ve(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),xe(e,t)}else{if(ve(e,n))return;rc.set(n),i.uniformMatrix3fv(this.addr,!1,rc),xe(e,n)}}function Cg(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(ve(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),xe(e,t)}else{if(ve(e,n))return;ic.set(n),i.uniformMatrix4fv(this.addr,!1,ic),xe(e,n)}}function Pg(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function Lg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ve(e,t))return;i.uniform2iv(this.addr,t),xe(e,t)}}function Dg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(ve(e,t))return;i.uniform3iv(this.addr,t),xe(e,t)}}function Ig(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ve(e,t))return;i.uniform4iv(this.addr,t),xe(e,t)}}function Ug(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function Ng(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ve(e,t))return;i.uniform2uiv(this.addr,t),xe(e,t)}}function Fg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(ve(e,t))return;i.uniform3uiv(this.addr,t),xe(e,t)}}function Og(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ve(e,t))return;i.uniform4uiv(this.addr,t),xe(e,t)}}function Bg(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(tc.compareFunction=Qc,s=tc):s=Rh,e.setTexture2D(t||s,r)}function zg(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTexture3D(t||Ph,r)}function kg(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTextureCube(t||Lh,r)}function Hg(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTexture2DArray(t||Ch,r)}function Vg(i){switch(i){case 5126:return Eg;case 35664:return bg;case 35665:return Tg;case 35666:return wg;case 35674:return Ag;case 35675:return Rg;case 35676:return Cg;case 5124:case 35670:return Pg;case 35667:case 35671:return Lg;case 35668:case 35672:return Dg;case 35669:case 35673:return Ig;case 5125:return Ug;case 36294:return Ng;case 36295:return Fg;case 36296:return Og;case 35678:case 36198:case 36298:case 36306:case 35682:return Bg;case 35679:case 36299:case 36307:return zg;case 35680:case 36300:case 36308:case 36293:return kg;case 36289:case 36303:case 36311:case 36292:return Hg}}function Gg(i,t){i.uniform1fv(this.addr,t)}function Wg(i,t){const e=ji(t,this.size,2);i.uniform2fv(this.addr,e)}function Xg(i,t){const e=ji(t,this.size,3);i.uniform3fv(this.addr,e)}function $g(i,t){const e=ji(t,this.size,4);i.uniform4fv(this.addr,e)}function Yg(i,t){const e=ji(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function qg(i,t){const e=ji(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function jg(i,t){const e=ji(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function Zg(i,t){i.uniform1iv(this.addr,t)}function Kg(i,t){i.uniform2iv(this.addr,t)}function Jg(i,t){i.uniform3iv(this.addr,t)}function Qg(i,t){i.uniform4iv(this.addr,t)}function t_(i,t){i.uniform1uiv(this.addr,t)}function e_(i,t){i.uniform2uiv(this.addr,t)}function n_(i,t){i.uniform3uiv(this.addr,t)}function i_(i,t){i.uniform4uiv(this.addr,t)}function r_(i,t,e){const n=this.cache,r=t.length,s=Is(e,r);ve(n,s)||(i.uniform1iv(this.addr,s),xe(n,s));for(let o=0;o!==r;++o)e.setTexture2D(t[o]||Rh,s[o])}function s_(i,t,e){const n=this.cache,r=t.length,s=Is(e,r);ve(n,s)||(i.uniform1iv(this.addr,s),xe(n,s));for(let o=0;o!==r;++o)e.setTexture3D(t[o]||Ph,s[o])}function o_(i,t,e){const n=this.cache,r=t.length,s=Is(e,r);ve(n,s)||(i.uniform1iv(this.addr,s),xe(n,s));for(let o=0;o!==r;++o)e.setTextureCube(t[o]||Lh,s[o])}function a_(i,t,e){const n=this.cache,r=t.length,s=Is(e,r);ve(n,s)||(i.uniform1iv(this.addr,s),xe(n,s));for(let o=0;o!==r;++o)e.setTexture2DArray(t[o]||Ch,s[o])}function l_(i){switch(i){case 5126:return Gg;case 35664:return Wg;case 35665:return Xg;case 35666:return $g;case 35674:return Yg;case 35675:return qg;case 35676:return jg;case 5124:case 35670:return Zg;case 35667:case 35671:return Kg;case 35668:case 35672:return Jg;case 35669:case 35673:return Qg;case 5125:return t_;case 36294:return e_;case 36295:return n_;case 36296:return i_;case 35678:case 36198:case 36298:case 36306:case 35682:return r_;case 35679:case 36299:case 36307:return s_;case 35680:case 36300:case 36308:case 36293:return o_;case 36289:case 36303:case 36311:case 36292:return a_}}class c_{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Vg(e.type)}}class h_{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=l_(e.type)}}class u_{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(t,e[a.id],n)}}}const xo=/(\w+)(\])?(\[|\.)?/g;function oc(i,t){i.seq.push(t),i.map[t.id]=t}function d_(i,t,e){const n=i.name,r=n.length;for(xo.lastIndex=0;;){const s=xo.exec(n),o=xo.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){oc(e,c===void 0?new c_(a,i,t):new h_(a,i,t));break}else{let h=e.map[a];h===void 0&&(h=new u_(a),oc(e,h)),e=h}}}class gs{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=t.getActiveUniform(e,r),o=t.getUniformLocation(e,s.name);d_(s,o,this)}}setValue(t,e,n,r){const s=this.map[e];s!==void 0&&s.setValue(t,n,r)}setOptional(t,e,n){const r=e[n];r!==void 0&&this.setValue(t,n,r)}static upload(t,e,n,r){for(let s=0,o=e.length;s!==o;++s){const a=e[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,r)}}static seqWithValue(t,e){const n=[];for(let r=0,s=t.length;r!==s;++r){const o=t[r];o.id in e&&n.push(o)}return n}}function ac(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const f_=37297;let p_=0;function m_(i,t){const e=i.split(`
`),n=[],r=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let o=r;o<s;o++){const a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}const lc=new Xt;function g_(i){Jt._getMatrix(lc,Jt.workingColorSpace,i);const t=`mat3( ${lc.elements.map(e=>e.toFixed(4))} )`;switch(Jt.getTransfer(i)){case Es:return[t,"LinearTransferOETF"];case ne:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function cc(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),s=(i.getShaderInfoLog(t)||"").trim();if(n&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return e.toUpperCase()+`

`+s+`

`+m_(i.getShaderSource(t),a)}else return s}function __(i,t){const e=g_(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function v_(i,t){let e;switch(t){case wu:e="Linear";break;case Au:e="Reinhard";break;case Ru:e="Cineon";break;case Wc:e="ACESFilmic";break;case Pu:e="AgX";break;case Lu:e="Neutral";break;case Cu:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const hs=new I;function x_(){Jt.getLuminanceCoefficients(hs);const i=hs.x.toFixed(4),t=hs.y.toFixed(4),e=hs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function y_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(cr).join(`
`)}function M_(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function S_(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(t,r),o=s.name;let a=1;s.type===i.FLOAT_MAT2&&(a=2),s.type===i.FLOAT_MAT3&&(a=3),s.type===i.FLOAT_MAT4&&(a=4),e[o]={type:s.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function cr(i){return i!==""}function hc(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function uc(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const E_=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ma(i){return i.replace(E_,T_)}const b_=new Map;function T_(i,t){let e=qt[t];if(e===void 0){const n=b_.get(t);if(n!==void 0)e=qt[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return Ma(e)}const w_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function dc(i){return i.replace(w_,A_)}function A_(i,t,e,n){let r="";for(let s=parseInt(t);s<parseInt(e);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function fc(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}function R_(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Vc?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===Gc?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===En&&(t="SHADOWMAP_TYPE_VSM"),t}function C_(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Gi:case Wi:t="ENVMAP_TYPE_CUBE";break;case Ds:t="ENVMAP_TYPE_CUBE_UV";break}return t}function P_(i){let t="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===Wi&&(t="ENVMAP_MODE_REFRACTION"),t}function L_(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Ia:t="ENVMAP_BLENDING_MULTIPLY";break;case bu:t="ENVMAP_BLENDING_MIX";break;case Tu:t="ENVMAP_BLENDING_ADD";break}return t}function D_(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function I_(i,t,e,n){const r=i.getContext(),s=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=R_(e),c=C_(e),u=P_(e),h=L_(e),d=D_(e),f=y_(e),g=M_(s),_=r.createProgram();let m,p,T=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(cr).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(cr).join(`
`),p.length>0&&(p+=`
`)):(m=[fc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+u:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(cr).join(`
`),p=[fc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+u:"",e.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Hn?"#define TONE_MAPPING":"",e.toneMapping!==Hn?qt.tonemapping_pars_fragment:"",e.toneMapping!==Hn?v_("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",qt.colorspace_pars_fragment,__("linearToOutputTexel",e.outputColorSpace),x_(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(cr).join(`
`)),o=Ma(o),o=hc(o,e),o=uc(o,e),a=Ma(a),a=hc(a,e),a=uc(a,e),o=dc(o),a=dc(a),e.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===_l?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===_l?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=T+m+o,v=T+p+a,A=ac(r,r.VERTEX_SHADER,y),P=ac(r,r.FRAGMENT_SHADER,v);r.attachShader(_,A),r.attachShader(_,P),e.index0AttributeName!==void 0?r.bindAttribLocation(_,0,e.index0AttributeName):e.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function L(C){if(i.debug.checkShaderErrors){const H=r.getProgramInfoLog(_)||"",X=r.getShaderInfoLog(A)||"",et=r.getShaderInfoLog(P)||"",$=H.trim(),Z=X.trim(),it=et.trim();let G=!0,dt=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(G=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,_,A,P);else{const gt=cc(r,A,"vertex"),yt=cc(r,P,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+$+`
`+gt+`
`+yt)}else $!==""?console.warn("THREE.WebGLProgram: Program Info Log:",$):(Z===""||it==="")&&(dt=!1);dt&&(C.diagnostics={runnable:G,programLog:$,vertexShader:{log:Z,prefix:m},fragmentShader:{log:it,prefix:p}})}r.deleteShader(A),r.deleteShader(P),D=new gs(r,_),b=S_(r,_)}let D;this.getUniforms=function(){return D===void 0&&L(this),D};let b;this.getAttributes=function(){return b===void 0&&L(this),b};let M=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return M===!1&&(M=r.getProgramParameter(_,f_)),M},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=p_++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=A,this.fragmentShader=P,this}let U_=0;class N_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,r=this._getShaderStage(e),s=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new F_(t),e.set(t,n)),n}}class F_{constructor(t){this.id=U_++,this.code=t,this.usedTimes=0}}function O_(i,t,e,n,r,s,o){const a=new rh,l=new N_,c=new Set,u=[],h=r.logarithmicDepthBuffer,d=r.vertexTextures;let f=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(b){return c.add(b),b===0?"uv":`uv${b}`}function m(b,M,C,H,X){const et=H.fog,$=X.geometry,Z=b.isMeshStandardMaterial?H.environment:null,it=(b.isMeshStandardMaterial?e:t).get(b.envMap||Z),G=it&&it.mapping===Ds?it.image.height:null,dt=g[b.type];b.precision!==null&&(f=r.getMaxPrecision(b.precision),f!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",f,"instead."));const gt=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,yt=gt!==void 0?gt.length:0;let Nt=0;$.morphAttributes.position!==void 0&&(Nt=1),$.morphAttributes.normal!==void 0&&(Nt=2),$.morphAttributes.color!==void 0&&(Nt=3);let Vt,Zt,Gt,nt;if(dt){const te=cn[dt];Vt=te.vertexShader,Zt=te.fragmentShader}else Vt=b.vertexShader,Zt=b.fragmentShader,l.update(b),Gt=l.getVertexShaderID(b),nt=l.getFragmentShaderID(b);const rt=i.getRenderTarget(),Et=i.state.buffers.depth.getReversed(),R=X.isInstancedMesh===!0,U=X.isBatchedMesh===!0,Y=!!b.map,ot=!!b.matcap,S=!!it,O=!!b.aoMap,B=!!b.lightMap,W=!!b.bumpMap,V=!!b.normalMap,Q=!!b.displacementMap,J=!!b.emissiveMap,at=!!b.metalnessMap,Ht=!!b.roughnessMap,Bt=b.anisotropy>0,w=b.clearcoat>0,x=b.dispersion>0,k=b.iridescence>0,K=b.sheen>0,lt=b.transmission>0,tt=Bt&&!!b.anisotropyMap,Pt=w&&!!b.clearcoatMap,mt=w&&!!b.clearcoatNormalMap,At=w&&!!b.clearcoatRoughnessMap,Rt=k&&!!b.iridescenceMap,ht=k&&!!b.iridescenceThicknessMap,St=K&&!!b.sheenColorMap,zt=K&&!!b.sheenRoughnessMap,Dt=!!b.specularMap,xt=!!b.specularColorMap,$t=!!b.specularIntensityMap,N=lt&&!!b.transmissionMap,pt=lt&&!!b.thicknessMap,_t=!!b.gradientMap,Tt=!!b.alphaMap,ut=b.alphaTest>0,st=!!b.alphaHash,Ct=!!b.extensions;let Wt=Hn;b.toneMapped&&(rt===null||rt.isXRRenderTarget===!0)&&(Wt=i.toneMapping);const oe={shaderID:dt,shaderType:b.type,shaderName:b.name,vertexShader:Vt,fragmentShader:Zt,defines:b.defines,customVertexShaderID:Gt,customFragmentShaderID:nt,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:f,batching:U,batchingColor:U&&X._colorsTexture!==null,instancing:R,instancingColor:R&&X.instanceColor!==null,instancingMorph:R&&X.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:rt===null?i.outputColorSpace:rt.isXRRenderTarget===!0?rt.texture.colorSpace:Xi,alphaToCoverage:!!b.alphaToCoverage,map:Y,matcap:ot,envMap:S,envMapMode:S&&it.mapping,envMapCubeUVHeight:G,aoMap:O,lightMap:B,bumpMap:W,normalMap:V,displacementMap:d&&Q,emissiveMap:J,normalMapObjectSpace:V&&b.normalMapType===Nu,normalMapTangentSpace:V&&b.normalMapType===Ha,metalnessMap:at,roughnessMap:Ht,anisotropy:Bt,anisotropyMap:tt,clearcoat:w,clearcoatMap:Pt,clearcoatNormalMap:mt,clearcoatRoughnessMap:At,dispersion:x,iridescence:k,iridescenceMap:Rt,iridescenceThicknessMap:ht,sheen:K,sheenColorMap:St,sheenRoughnessMap:zt,specularMap:Dt,specularColorMap:xt,specularIntensityMap:$t,transmission:lt,transmissionMap:N,thicknessMap:pt,gradientMap:_t,opaque:b.transparent===!1&&b.blending===zi&&b.alphaToCoverage===!1,alphaMap:Tt,alphaTest:ut,alphaHash:st,combine:b.combine,mapUv:Y&&_(b.map.channel),aoMapUv:O&&_(b.aoMap.channel),lightMapUv:B&&_(b.lightMap.channel),bumpMapUv:W&&_(b.bumpMap.channel),normalMapUv:V&&_(b.normalMap.channel),displacementMapUv:Q&&_(b.displacementMap.channel),emissiveMapUv:J&&_(b.emissiveMap.channel),metalnessMapUv:at&&_(b.metalnessMap.channel),roughnessMapUv:Ht&&_(b.roughnessMap.channel),anisotropyMapUv:tt&&_(b.anisotropyMap.channel),clearcoatMapUv:Pt&&_(b.clearcoatMap.channel),clearcoatNormalMapUv:mt&&_(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:At&&_(b.clearcoatRoughnessMap.channel),iridescenceMapUv:Rt&&_(b.iridescenceMap.channel),iridescenceThicknessMapUv:ht&&_(b.iridescenceThicknessMap.channel),sheenColorMapUv:St&&_(b.sheenColorMap.channel),sheenRoughnessMapUv:zt&&_(b.sheenRoughnessMap.channel),specularMapUv:Dt&&_(b.specularMap.channel),specularColorMapUv:xt&&_(b.specularColorMap.channel),specularIntensityMapUv:$t&&_(b.specularIntensityMap.channel),transmissionMapUv:N&&_(b.transmissionMap.channel),thicknessMapUv:pt&&_(b.thicknessMap.channel),alphaMapUv:Tt&&_(b.alphaMap.channel),vertexTangents:!!$.attributes.tangent&&(V||Bt),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,pointsUvs:X.isPoints===!0&&!!$.attributes.uv&&(Y||Tt),fog:!!et,useFog:b.fog===!0,fogExp2:!!et&&et.isFogExp2,flatShading:b.flatShading===!0&&b.wireframe===!1,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:Et,skinning:X.isSkinnedMesh===!0,morphTargets:$.morphAttributes.position!==void 0,morphNormals:$.morphAttributes.normal!==void 0,morphColors:$.morphAttributes.color!==void 0,morphTargetsCount:yt,morphTextureStride:Nt,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:Wt,decodeVideoTexture:Y&&b.map.isVideoTexture===!0&&Jt.getTransfer(b.map.colorSpace)===ne,decodeVideoTextureEmissive:J&&b.emissiveMap.isVideoTexture===!0&&Jt.getTransfer(b.emissiveMap.colorSpace)===ne,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===bn,flipSided:b.side===Le,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Ct&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ct&&b.extensions.multiDraw===!0||U)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return oe.vertexUv1s=c.has(1),oe.vertexUv2s=c.has(2),oe.vertexUv3s=c.has(3),c.clear(),oe}function p(b){const M=[];if(b.shaderID?M.push(b.shaderID):(M.push(b.customVertexShaderID),M.push(b.customFragmentShaderID)),b.defines!==void 0)for(const C in b.defines)M.push(C),M.push(b.defines[C]);return b.isRawShaderMaterial===!1&&(T(M,b),y(M,b),M.push(i.outputColorSpace)),M.push(b.customProgramCacheKey),M.join()}function T(b,M){b.push(M.precision),b.push(M.outputColorSpace),b.push(M.envMapMode),b.push(M.envMapCubeUVHeight),b.push(M.mapUv),b.push(M.alphaMapUv),b.push(M.lightMapUv),b.push(M.aoMapUv),b.push(M.bumpMapUv),b.push(M.normalMapUv),b.push(M.displacementMapUv),b.push(M.emissiveMapUv),b.push(M.metalnessMapUv),b.push(M.roughnessMapUv),b.push(M.anisotropyMapUv),b.push(M.clearcoatMapUv),b.push(M.clearcoatNormalMapUv),b.push(M.clearcoatRoughnessMapUv),b.push(M.iridescenceMapUv),b.push(M.iridescenceThicknessMapUv),b.push(M.sheenColorMapUv),b.push(M.sheenRoughnessMapUv),b.push(M.specularMapUv),b.push(M.specularColorMapUv),b.push(M.specularIntensityMapUv),b.push(M.transmissionMapUv),b.push(M.thicknessMapUv),b.push(M.combine),b.push(M.fogExp2),b.push(M.sizeAttenuation),b.push(M.morphTargetsCount),b.push(M.morphAttributeCount),b.push(M.numDirLights),b.push(M.numPointLights),b.push(M.numSpotLights),b.push(M.numSpotLightMaps),b.push(M.numHemiLights),b.push(M.numRectAreaLights),b.push(M.numDirLightShadows),b.push(M.numPointLightShadows),b.push(M.numSpotLightShadows),b.push(M.numSpotLightShadowsWithMaps),b.push(M.numLightProbes),b.push(M.shadowMapType),b.push(M.toneMapping),b.push(M.numClippingPlanes),b.push(M.numClipIntersection),b.push(M.depthPacking)}function y(b,M){a.disableAll(),M.supportsVertexTextures&&a.enable(0),M.instancing&&a.enable(1),M.instancingColor&&a.enable(2),M.instancingMorph&&a.enable(3),M.matcap&&a.enable(4),M.envMap&&a.enable(5),M.normalMapObjectSpace&&a.enable(6),M.normalMapTangentSpace&&a.enable(7),M.clearcoat&&a.enable(8),M.iridescence&&a.enable(9),M.alphaTest&&a.enable(10),M.vertexColors&&a.enable(11),M.vertexAlphas&&a.enable(12),M.vertexUv1s&&a.enable(13),M.vertexUv2s&&a.enable(14),M.vertexUv3s&&a.enable(15),M.vertexTangents&&a.enable(16),M.anisotropy&&a.enable(17),M.alphaHash&&a.enable(18),M.batching&&a.enable(19),M.dispersion&&a.enable(20),M.batchingColor&&a.enable(21),M.gradientMap&&a.enable(22),b.push(a.mask),a.disableAll(),M.fog&&a.enable(0),M.useFog&&a.enable(1),M.flatShading&&a.enable(2),M.logarithmicDepthBuffer&&a.enable(3),M.reversedDepthBuffer&&a.enable(4),M.skinning&&a.enable(5),M.morphTargets&&a.enable(6),M.morphNormals&&a.enable(7),M.morphColors&&a.enable(8),M.premultipliedAlpha&&a.enable(9),M.shadowMapEnabled&&a.enable(10),M.doubleSided&&a.enable(11),M.flipSided&&a.enable(12),M.useDepthPacking&&a.enable(13),M.dithering&&a.enable(14),M.transmission&&a.enable(15),M.sheen&&a.enable(16),M.opaque&&a.enable(17),M.pointsUvs&&a.enable(18),M.decodeVideoTexture&&a.enable(19),M.decodeVideoTextureEmissive&&a.enable(20),M.alphaToCoverage&&a.enable(21),b.push(a.mask)}function v(b){const M=g[b.type];let C;if(M){const H=cn[M];C=Td.clone(H.uniforms)}else C=b.uniforms;return C}function A(b,M){let C;for(let H=0,X=u.length;H<X;H++){const et=u[H];if(et.cacheKey===M){C=et,++C.usedTimes;break}}return C===void 0&&(C=new I_(i,M,b,s),u.push(C)),C}function P(b){if(--b.usedTimes===0){const M=u.indexOf(b);u[M]=u[u.length-1],u.pop(),b.destroy()}}function L(b){l.remove(b)}function D(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:v,acquireProgram:A,releaseProgram:P,releaseShaderCache:L,programs:u,dispose:D}}function B_(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function r(o,a,l){i.get(o)[a]=l}function s(){i=new WeakMap}return{has:t,get:e,remove:n,update:r,dispose:s}}function z_(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function pc(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function mc(){const i=[];let t=0;const e=[],n=[],r=[];function s(){t=0,e.length=0,n.length=0,r.length=0}function o(h,d,f,g,_,m){let p=i[t];return p===void 0?(p={id:h.id,object:h,geometry:d,material:f,groupOrder:g,renderOrder:h.renderOrder,z:_,group:m},i[t]=p):(p.id=h.id,p.object=h,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=h.renderOrder,p.z=_,p.group=m),t++,p}function a(h,d,f,g,_,m){const p=o(h,d,f,g,_,m);f.transmission>0?n.push(p):f.transparent===!0?r.push(p):e.push(p)}function l(h,d,f,g,_,m){const p=o(h,d,f,g,_,m);f.transmission>0?n.unshift(p):f.transparent===!0?r.unshift(p):e.unshift(p)}function c(h,d){e.length>1&&e.sort(h||z_),n.length>1&&n.sort(d||pc),r.length>1&&r.sort(d||pc)}function u(){for(let h=t,d=i.length;h<d;h++){const f=i[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:r,init:s,push:a,unshift:l,finish:u,sort:c}}function k_(){let i=new WeakMap;function t(n,r){const s=i.get(n);let o;return s===void 0?(o=new mc,i.set(n,[o])):r>=s.length?(o=new mc,s.push(o)):o=s[r],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function H_(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new I,color:new Yt};break;case"SpotLight":e={position:new I,direction:new I,color:new Yt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new I,color:new Yt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new I,skyColor:new Yt,groundColor:new Yt};break;case"RectAreaLight":e={color:new Yt,position:new I,halfWidth:new I,halfHeight:new I};break}return i[t.id]=e,e}}}function V_(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let G_=0;function W_(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function X_(i){const t=new H_,e=V_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new I);const r=new I,s=new ae,o=new ae;function a(c){let u=0,h=0,d=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let f=0,g=0,_=0,m=0,p=0,T=0,y=0,v=0,A=0,P=0,L=0;c.sort(W_);for(let b=0,M=c.length;b<M;b++){const C=c[b],H=C.color,X=C.intensity,et=C.distance,$=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)u+=H.r*X,h+=H.g*X,d+=H.b*X;else if(C.isLightProbe){for(let Z=0;Z<9;Z++)n.probe[Z].addScaledVector(C.sh.coefficients[Z],X);L++}else if(C.isDirectionalLight){const Z=t.get(C);if(Z.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const it=C.shadow,G=e.get(C);G.shadowIntensity=it.intensity,G.shadowBias=it.bias,G.shadowNormalBias=it.normalBias,G.shadowRadius=it.radius,G.shadowMapSize=it.mapSize,n.directionalShadow[f]=G,n.directionalShadowMap[f]=$,n.directionalShadowMatrix[f]=C.shadow.matrix,T++}n.directional[f]=Z,f++}else if(C.isSpotLight){const Z=t.get(C);Z.position.setFromMatrixPosition(C.matrixWorld),Z.color.copy(H).multiplyScalar(X),Z.distance=et,Z.coneCos=Math.cos(C.angle),Z.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),Z.decay=C.decay,n.spot[_]=Z;const it=C.shadow;if(C.map&&(n.spotLightMap[A]=C.map,A++,it.updateMatrices(C),C.castShadow&&P++),n.spotLightMatrix[_]=it.matrix,C.castShadow){const G=e.get(C);G.shadowIntensity=it.intensity,G.shadowBias=it.bias,G.shadowNormalBias=it.normalBias,G.shadowRadius=it.radius,G.shadowMapSize=it.mapSize,n.spotShadow[_]=G,n.spotShadowMap[_]=$,v++}_++}else if(C.isRectAreaLight){const Z=t.get(C);Z.color.copy(H).multiplyScalar(X),Z.halfWidth.set(C.width*.5,0,0),Z.halfHeight.set(0,C.height*.5,0),n.rectArea[m]=Z,m++}else if(C.isPointLight){const Z=t.get(C);if(Z.color.copy(C.color).multiplyScalar(C.intensity),Z.distance=C.distance,Z.decay=C.decay,C.castShadow){const it=C.shadow,G=e.get(C);G.shadowIntensity=it.intensity,G.shadowBias=it.bias,G.shadowNormalBias=it.normalBias,G.shadowRadius=it.radius,G.shadowMapSize=it.mapSize,G.shadowCameraNear=it.camera.near,G.shadowCameraFar=it.camera.far,n.pointShadow[g]=G,n.pointShadowMap[g]=$,n.pointShadowMatrix[g]=C.shadow.matrix,y++}n.point[g]=Z,g++}else if(C.isHemisphereLight){const Z=t.get(C);Z.skyColor.copy(C.color).multiplyScalar(X),Z.groundColor.copy(C.groundColor).multiplyScalar(X),n.hemi[p]=Z,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=vt.LTC_FLOAT_1,n.rectAreaLTC2=vt.LTC_FLOAT_2):(n.rectAreaLTC1=vt.LTC_HALF_1,n.rectAreaLTC2=vt.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=d;const D=n.hash;(D.directionalLength!==f||D.pointLength!==g||D.spotLength!==_||D.rectAreaLength!==m||D.hemiLength!==p||D.numDirectionalShadows!==T||D.numPointShadows!==y||D.numSpotShadows!==v||D.numSpotMaps!==A||D.numLightProbes!==L)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=T,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=v+A-P,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=P,n.numLightProbes=L,D.directionalLength=f,D.pointLength=g,D.spotLength=_,D.rectAreaLength=m,D.hemiLength=p,D.numDirectionalShadows=T,D.numPointShadows=y,D.numSpotShadows=v,D.numSpotMaps=A,D.numLightProbes=L,n.version=G_++)}function l(c,u){let h=0,d=0,f=0,g=0,_=0;const m=u.matrixWorldInverse;for(let p=0,T=c.length;p<T;p++){const y=c[p];if(y.isDirectionalLight){const v=n.directional[h];v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(m),h++}else if(y.isSpotLight){const v=n.spot[f];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(m),f++}else if(y.isRectAreaLight){const v=n.rectArea[g];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),o.identity(),s.copy(y.matrixWorld),s.premultiply(m),o.extractRotation(s),v.halfWidth.set(y.width*.5,0,0),v.halfHeight.set(0,y.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),g++}else if(y.isPointLight){const v=n.point[d];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),d++}else if(y.isHemisphereLight){const v=n.hemi[_];v.direction.setFromMatrixPosition(y.matrixWorld),v.direction.transformDirection(m),_++}}}return{setup:a,setupView:l,state:n}}function gc(i){const t=new X_(i),e=[],n=[];function r(u){c.camera=u,e.length=0,n.length=0}function s(u){e.push(u)}function o(u){n.push(u)}function a(){t.setup(e)}function l(u){t.setupView(e,u)}const c={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function $_(i){let t=new WeakMap;function e(r,s=0){const o=t.get(r);let a;return o===void 0?(a=new gc(i),t.set(r,[a])):s>=o.length?(a=new gc(i),o.push(a)):a=o[s],a}function n(){t=new WeakMap}return{get:e,dispose:n}}const Y_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,q_=`uniform sampler2D shadow_pass;
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
}`;function j_(i,t,e){let n=new Xa;const r=new ct,s=new ct,o=new re,a=new _f({depthPacking:Uu}),l=new vf,c={},u=e.maxTextureSize,h={[Gn]:Le,[Le]:Gn,[bn]:bn},d=new Wn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ct},radius:{value:4}},vertexShader:Y_,fragmentShader:q_}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new We;g.setAttribute("position",new Ke(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new fe(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Vc;let p=this.type;this.render=function(P,L,D){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||P.length===0)return;const b=i.getRenderTarget(),M=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),H=i.state;H.setBlending(kn),H.buffers.depth.getReversed()===!0?H.buffers.color.setClear(0,0,0,0):H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const X=p!==En&&this.type===En,et=p===En&&this.type!==En;for(let $=0,Z=P.length;$<Z;$++){const it=P[$],G=it.shadow;if(G===void 0){console.warn("THREE.WebGLShadowMap:",it,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;r.copy(G.mapSize);const dt=G.getFrameExtents();if(r.multiply(dt),s.copy(G.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/dt.x),r.x=s.x*dt.x,G.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/dt.y),r.y=s.y*dt.y,G.mapSize.y=s.y)),G.map===null||X===!0||et===!0){const yt=this.type!==En?{minFilter:Ge,magFilter:Ge}:{};G.map!==null&&G.map.dispose(),G.map=new hi(r.x,r.y,yt),G.map.texture.name=it.name+".shadowMap",G.camera.updateProjectionMatrix()}i.setRenderTarget(G.map),i.clear();const gt=G.getViewportCount();for(let yt=0;yt<gt;yt++){const Nt=G.getViewport(yt);o.set(s.x*Nt.x,s.y*Nt.y,s.x*Nt.z,s.y*Nt.w),H.viewport(o),G.updateMatrices(it,yt),n=G.getFrustum(),v(L,D,G.camera,it,this.type)}G.isPointLightShadow!==!0&&this.type===En&&T(G,D),G.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(b,M,C)};function T(P,L){const D=t.update(_);d.defines.VSM_SAMPLES!==P.blurSamples&&(d.defines.VSM_SAMPLES=P.blurSamples,f.defines.VSM_SAMPLES=P.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),P.mapPass===null&&(P.mapPass=new hi(r.x,r.y)),d.uniforms.shadow_pass.value=P.map.texture,d.uniforms.resolution.value=P.mapSize,d.uniforms.radius.value=P.radius,i.setRenderTarget(P.mapPass),i.clear(),i.renderBufferDirect(L,null,D,d,_,null),f.uniforms.shadow_pass.value=P.mapPass.texture,f.uniforms.resolution.value=P.mapSize,f.uniforms.radius.value=P.radius,i.setRenderTarget(P.map),i.clear(),i.renderBufferDirect(L,null,D,f,_,null)}function y(P,L,D,b){let M=null;const C=D.isPointLight===!0?P.customDistanceMaterial:P.customDepthMaterial;if(C!==void 0)M=C;else if(M=D.isPointLight===!0?l:a,i.localClippingEnabled&&L.clipShadows===!0&&Array.isArray(L.clippingPlanes)&&L.clippingPlanes.length!==0||L.displacementMap&&L.displacementScale!==0||L.alphaMap&&L.alphaTest>0||L.map&&L.alphaTest>0||L.alphaToCoverage===!0){const H=M.uuid,X=L.uuid;let et=c[H];et===void 0&&(et={},c[H]=et);let $=et[X];$===void 0&&($=M.clone(),et[X]=$,L.addEventListener("dispose",A)),M=$}if(M.visible=L.visible,M.wireframe=L.wireframe,b===En?M.side=L.shadowSide!==null?L.shadowSide:L.side:M.side=L.shadowSide!==null?L.shadowSide:h[L.side],M.alphaMap=L.alphaMap,M.alphaTest=L.alphaToCoverage===!0?.5:L.alphaTest,M.map=L.map,M.clipShadows=L.clipShadows,M.clippingPlanes=L.clippingPlanes,M.clipIntersection=L.clipIntersection,M.displacementMap=L.displacementMap,M.displacementScale=L.displacementScale,M.displacementBias=L.displacementBias,M.wireframeLinewidth=L.wireframeLinewidth,M.linewidth=L.linewidth,D.isPointLight===!0&&M.isMeshDistanceMaterial===!0){const H=i.properties.get(M);H.light=D}return M}function v(P,L,D,b,M){if(P.visible===!1)return;if(P.layers.test(L.layers)&&(P.isMesh||P.isLine||P.isPoints)&&(P.castShadow||P.receiveShadow&&M===En)&&(!P.frustumCulled||n.intersectsObject(P))){P.modelViewMatrix.multiplyMatrices(D.matrixWorldInverse,P.matrixWorld);const X=t.update(P),et=P.material;if(Array.isArray(et)){const $=X.groups;for(let Z=0,it=$.length;Z<it;Z++){const G=$[Z],dt=et[G.materialIndex];if(dt&&dt.visible){const gt=y(P,dt,b,M);P.onBeforeShadow(i,P,L,D,X,gt,G),i.renderBufferDirect(D,null,X,gt,P,G),P.onAfterShadow(i,P,L,D,X,gt,G)}}}else if(et.visible){const $=y(P,et,b,M);P.onBeforeShadow(i,P,L,D,X,$,null),i.renderBufferDirect(D,null,X,$,P,null),P.onAfterShadow(i,P,L,D,X,$,null)}}const H=P.children;for(let X=0,et=H.length;X<et;X++)v(H[X],L,D,b,M)}function A(P){P.target.removeEventListener("dispose",A);for(const D in c){const b=c[D],M=P.target.uuid;M in b&&(b[M].dispose(),delete b[M])}}}const Z_={[Lo]:Do,[Io]:Fo,[Uo]:Oo,[Vi]:No,[Do]:Lo,[Fo]:Io,[Oo]:Uo,[No]:Vi};function K_(i,t){function e(){let N=!1;const pt=new re;let _t=null;const Tt=new re(0,0,0,0);return{setMask:function(ut){_t!==ut&&!N&&(i.colorMask(ut,ut,ut,ut),_t=ut)},setLocked:function(ut){N=ut},setClear:function(ut,st,Ct,Wt,oe){oe===!0&&(ut*=Wt,st*=Wt,Ct*=Wt),pt.set(ut,st,Ct,Wt),Tt.equals(pt)===!1&&(i.clearColor(ut,st,Ct,Wt),Tt.copy(pt))},reset:function(){N=!1,_t=null,Tt.set(-1,0,0,0)}}}function n(){let N=!1,pt=!1,_t=null,Tt=null,ut=null;return{setReversed:function(st){if(pt!==st){const Ct=t.get("EXT_clip_control");st?Ct.clipControlEXT(Ct.LOWER_LEFT_EXT,Ct.ZERO_TO_ONE_EXT):Ct.clipControlEXT(Ct.LOWER_LEFT_EXT,Ct.NEGATIVE_ONE_TO_ONE_EXT),pt=st;const Wt=ut;ut=null,this.setClear(Wt)}},getReversed:function(){return pt},setTest:function(st){st?rt(i.DEPTH_TEST):Et(i.DEPTH_TEST)},setMask:function(st){_t!==st&&!N&&(i.depthMask(st),_t=st)},setFunc:function(st){if(pt&&(st=Z_[st]),Tt!==st){switch(st){case Lo:i.depthFunc(i.NEVER);break;case Do:i.depthFunc(i.ALWAYS);break;case Io:i.depthFunc(i.LESS);break;case Vi:i.depthFunc(i.LEQUAL);break;case Uo:i.depthFunc(i.EQUAL);break;case No:i.depthFunc(i.GEQUAL);break;case Fo:i.depthFunc(i.GREATER);break;case Oo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Tt=st}},setLocked:function(st){N=st},setClear:function(st){ut!==st&&(pt&&(st=1-st),i.clearDepth(st),ut=st)},reset:function(){N=!1,_t=null,Tt=null,ut=null,pt=!1}}}function r(){let N=!1,pt=null,_t=null,Tt=null,ut=null,st=null,Ct=null,Wt=null,oe=null;return{setTest:function(te){N||(te?rt(i.STENCIL_TEST):Et(i.STENCIL_TEST))},setMask:function(te){pt!==te&&!N&&(i.stencilMask(te),pt=te)},setFunc:function(te,_n,an){(_t!==te||Tt!==_n||ut!==an)&&(i.stencilFunc(te,_n,an),_t=te,Tt=_n,ut=an)},setOp:function(te,_n,an){(st!==te||Ct!==_n||Wt!==an)&&(i.stencilOp(te,_n,an),st=te,Ct=_n,Wt=an)},setLocked:function(te){N=te},setClear:function(te){oe!==te&&(i.clearStencil(te),oe=te)},reset:function(){N=!1,pt=null,_t=null,Tt=null,ut=null,st=null,Ct=null,Wt=null,oe=null}}}const s=new e,o=new n,a=new r,l=new WeakMap,c=new WeakMap;let u={},h={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,T=null,y=null,v=null,A=null,P=null,L=new Yt(0,0,0),D=0,b=!1,M=null,C=null,H=null,X=null,et=null;const $=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let Z=!1,it=0;const G=i.getParameter(i.VERSION);G.indexOf("WebGL")!==-1?(it=parseFloat(/^WebGL (\d)/.exec(G)[1]),Z=it>=1):G.indexOf("OpenGL ES")!==-1&&(it=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),Z=it>=2);let dt=null,gt={};const yt=i.getParameter(i.SCISSOR_BOX),Nt=i.getParameter(i.VIEWPORT),Vt=new re().fromArray(yt),Zt=new re().fromArray(Nt);function Gt(N,pt,_t,Tt){const ut=new Uint8Array(4),st=i.createTexture();i.bindTexture(N,st),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ct=0;Ct<_t;Ct++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(pt,0,i.RGBA,1,1,Tt,0,i.RGBA,i.UNSIGNED_BYTE,ut):i.texImage2D(pt+Ct,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ut);return st}const nt={};nt[i.TEXTURE_2D]=Gt(i.TEXTURE_2D,i.TEXTURE_2D,1),nt[i.TEXTURE_CUBE_MAP]=Gt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),nt[i.TEXTURE_2D_ARRAY]=Gt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),nt[i.TEXTURE_3D]=Gt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),rt(i.DEPTH_TEST),o.setFunc(Vi),W(!1),V(ul),rt(i.CULL_FACE),O(kn);function rt(N){u[N]!==!0&&(i.enable(N),u[N]=!0)}function Et(N){u[N]!==!1&&(i.disable(N),u[N]=!1)}function R(N,pt){return h[N]!==pt?(i.bindFramebuffer(N,pt),h[N]=pt,N===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=pt),N===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=pt),!0):!1}function U(N,pt){let _t=f,Tt=!1;if(N){_t=d.get(pt),_t===void 0&&(_t=[],d.set(pt,_t));const ut=N.textures;if(_t.length!==ut.length||_t[0]!==i.COLOR_ATTACHMENT0){for(let st=0,Ct=ut.length;st<Ct;st++)_t[st]=i.COLOR_ATTACHMENT0+st;_t.length=ut.length,Tt=!0}}else _t[0]!==i.BACK&&(_t[0]=i.BACK,Tt=!0);Tt&&i.drawBuffers(_t)}function Y(N){return g!==N?(i.useProgram(N),g=N,!0):!1}const ot={[ii]:i.FUNC_ADD,[au]:i.FUNC_SUBTRACT,[lu]:i.FUNC_REVERSE_SUBTRACT};ot[cu]=i.MIN,ot[hu]=i.MAX;const S={[uu]:i.ZERO,[du]:i.ONE,[fu]:i.SRC_COLOR,[Co]:i.SRC_ALPHA,[xu]:i.SRC_ALPHA_SATURATE,[_u]:i.DST_COLOR,[mu]:i.DST_ALPHA,[pu]:i.ONE_MINUS_SRC_COLOR,[Po]:i.ONE_MINUS_SRC_ALPHA,[vu]:i.ONE_MINUS_DST_COLOR,[gu]:i.ONE_MINUS_DST_ALPHA,[yu]:i.CONSTANT_COLOR,[Mu]:i.ONE_MINUS_CONSTANT_COLOR,[Su]:i.CONSTANT_ALPHA,[Eu]:i.ONE_MINUS_CONSTANT_ALPHA};function O(N,pt,_t,Tt,ut,st,Ct,Wt,oe,te){if(N===kn){_===!0&&(Et(i.BLEND),_=!1);return}if(_===!1&&(rt(i.BLEND),_=!0),N!==ou){if(N!==m||te!==b){if((p!==ii||v!==ii)&&(i.blendEquation(i.FUNC_ADD),p=ii,v=ii),te)switch(N){case zi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case dl:i.blendFunc(i.ONE,i.ONE);break;case fl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case pl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case zi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case dl:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case fl:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case pl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}T=null,y=null,A=null,P=null,L.set(0,0,0),D=0,m=N,b=te}return}ut=ut||pt,st=st||_t,Ct=Ct||Tt,(pt!==p||ut!==v)&&(i.blendEquationSeparate(ot[pt],ot[ut]),p=pt,v=ut),(_t!==T||Tt!==y||st!==A||Ct!==P)&&(i.blendFuncSeparate(S[_t],S[Tt],S[st],S[Ct]),T=_t,y=Tt,A=st,P=Ct),(Wt.equals(L)===!1||oe!==D)&&(i.blendColor(Wt.r,Wt.g,Wt.b,oe),L.copy(Wt),D=oe),m=N,b=!1}function B(N,pt){N.side===bn?Et(i.CULL_FACE):rt(i.CULL_FACE);let _t=N.side===Le;pt&&(_t=!_t),W(_t),N.blending===zi&&N.transparent===!1?O(kn):O(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),s.setMask(N.colorWrite);const Tt=N.stencilWrite;a.setTest(Tt),Tt&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),J(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?rt(i.SAMPLE_ALPHA_TO_COVERAGE):Et(i.SAMPLE_ALPHA_TO_COVERAGE)}function W(N){M!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),M=N)}function V(N){N!==ru?(rt(i.CULL_FACE),N!==C&&(N===ul?i.cullFace(i.BACK):N===su?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Et(i.CULL_FACE),C=N}function Q(N){N!==H&&(Z&&i.lineWidth(N),H=N)}function J(N,pt,_t){N?(rt(i.POLYGON_OFFSET_FILL),(X!==pt||et!==_t)&&(i.polygonOffset(pt,_t),X=pt,et=_t)):Et(i.POLYGON_OFFSET_FILL)}function at(N){N?rt(i.SCISSOR_TEST):Et(i.SCISSOR_TEST)}function Ht(N){N===void 0&&(N=i.TEXTURE0+$-1),dt!==N&&(i.activeTexture(N),dt=N)}function Bt(N,pt,_t){_t===void 0&&(dt===null?_t=i.TEXTURE0+$-1:_t=dt);let Tt=gt[_t];Tt===void 0&&(Tt={type:void 0,texture:void 0},gt[_t]=Tt),(Tt.type!==N||Tt.texture!==pt)&&(dt!==_t&&(i.activeTexture(_t),dt=_t),i.bindTexture(N,pt||nt[N]),Tt.type=N,Tt.texture=pt)}function w(){const N=gt[dt];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function x(){try{i.compressedTexImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function k(){try{i.compressedTexImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function K(){try{i.texSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function lt(){try{i.texSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function tt(){try{i.compressedTexSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Pt(){try{i.compressedTexSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function mt(){try{i.texStorage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function At(){try{i.texStorage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Rt(){try{i.texImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ht(){try{i.texImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function St(N){Vt.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),Vt.copy(N))}function zt(N){Zt.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),Zt.copy(N))}function Dt(N,pt){let _t=c.get(pt);_t===void 0&&(_t=new WeakMap,c.set(pt,_t));let Tt=_t.get(N);Tt===void 0&&(Tt=i.getUniformBlockIndex(pt,N.name),_t.set(N,Tt))}function xt(N,pt){const Tt=c.get(pt).get(N);l.get(pt)!==Tt&&(i.uniformBlockBinding(pt,Tt,N.__bindingPointIndex),l.set(pt,Tt))}function $t(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},dt=null,gt={},h={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,T=null,y=null,v=null,A=null,P=null,L=new Yt(0,0,0),D=0,b=!1,M=null,C=null,H=null,X=null,et=null,Vt.set(0,0,i.canvas.width,i.canvas.height),Zt.set(0,0,i.canvas.width,i.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:rt,disable:Et,bindFramebuffer:R,drawBuffers:U,useProgram:Y,setBlending:O,setMaterial:B,setFlipSided:W,setCullFace:V,setLineWidth:Q,setPolygonOffset:J,setScissorTest:at,activeTexture:Ht,bindTexture:Bt,unbindTexture:w,compressedTexImage2D:x,compressedTexImage3D:k,texImage2D:Rt,texImage3D:ht,updateUBOMapping:Dt,uniformBlockBinding:xt,texStorage2D:mt,texStorage3D:At,texSubImage2D:K,texSubImage3D:lt,compressedTexSubImage2D:tt,compressedTexSubImage3D:Pt,scissor:St,viewport:zt,reset:$t}}function J_(i,t,e,n,r,s,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ct,u=new WeakMap;let h;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(w,x){return f?new OffscreenCanvas(w,x):Ts("canvas")}function _(w,x,k){let K=1;const lt=Bt(w);if((lt.width>k||lt.height>k)&&(K=k/Math.max(lt.width,lt.height)),K<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){const tt=Math.floor(K*lt.width),Pt=Math.floor(K*lt.height);h===void 0&&(h=g(tt,Pt));const mt=x?g(tt,Pt):h;return mt.width=tt,mt.height=Pt,mt.getContext("2d").drawImage(w,0,0,tt,Pt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+lt.width+"x"+lt.height+") to ("+tt+"x"+Pt+")."),mt}else return"data"in w&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+lt.width+"x"+lt.height+")."),w;return w}function m(w){return w.generateMipmaps}function p(w){i.generateMipmap(w)}function T(w){return w.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?i.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function y(w,x,k,K,lt=!1){if(w!==null){if(i[w]!==void 0)return i[w];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let tt=x;if(x===i.RED&&(k===i.FLOAT&&(tt=i.R32F),k===i.HALF_FLOAT&&(tt=i.R16F),k===i.UNSIGNED_BYTE&&(tt=i.R8)),x===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&(tt=i.R8UI),k===i.UNSIGNED_SHORT&&(tt=i.R16UI),k===i.UNSIGNED_INT&&(tt=i.R32UI),k===i.BYTE&&(tt=i.R8I),k===i.SHORT&&(tt=i.R16I),k===i.INT&&(tt=i.R32I)),x===i.RG&&(k===i.FLOAT&&(tt=i.RG32F),k===i.HALF_FLOAT&&(tt=i.RG16F),k===i.UNSIGNED_BYTE&&(tt=i.RG8)),x===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&(tt=i.RG8UI),k===i.UNSIGNED_SHORT&&(tt=i.RG16UI),k===i.UNSIGNED_INT&&(tt=i.RG32UI),k===i.BYTE&&(tt=i.RG8I),k===i.SHORT&&(tt=i.RG16I),k===i.INT&&(tt=i.RG32I)),x===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&(tt=i.RGB8UI),k===i.UNSIGNED_SHORT&&(tt=i.RGB16UI),k===i.UNSIGNED_INT&&(tt=i.RGB32UI),k===i.BYTE&&(tt=i.RGB8I),k===i.SHORT&&(tt=i.RGB16I),k===i.INT&&(tt=i.RGB32I)),x===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&(tt=i.RGBA8UI),k===i.UNSIGNED_SHORT&&(tt=i.RGBA16UI),k===i.UNSIGNED_INT&&(tt=i.RGBA32UI),k===i.BYTE&&(tt=i.RGBA8I),k===i.SHORT&&(tt=i.RGBA16I),k===i.INT&&(tt=i.RGBA32I)),x===i.RGB&&(k===i.UNSIGNED_INT_5_9_9_9_REV&&(tt=i.RGB9_E5),k===i.UNSIGNED_INT_10F_11F_11F_REV&&(tt=i.R11F_G11F_B10F)),x===i.RGBA){const Pt=lt?Es:Jt.getTransfer(K);k===i.FLOAT&&(tt=i.RGBA32F),k===i.HALF_FLOAT&&(tt=i.RGBA16F),k===i.UNSIGNED_BYTE&&(tt=Pt===ne?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT_4_4_4_4&&(tt=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&(tt=i.RGB5_A1)}return(tt===i.R16F||tt===i.R32F||tt===i.RG16F||tt===i.RG32F||tt===i.RGBA16F||tt===i.RGBA32F)&&t.get("EXT_color_buffer_float"),tt}function v(w,x){let k;return w?x===null||x===li||x===yr?k=i.DEPTH24_STENCIL8:x===fn?k=i.DEPTH32F_STENCIL8:x===xr&&(k=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===li||x===yr?k=i.DEPTH_COMPONENT24:x===fn?k=i.DEPTH_COMPONENT32F:x===xr&&(k=i.DEPTH_COMPONENT16),k}function A(w,x){return m(w)===!0||w.isFramebufferTexture&&w.minFilter!==Ge&&w.minFilter!==dn?Math.log2(Math.max(x.width,x.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?x.mipmaps.length:1}function P(w){const x=w.target;x.removeEventListener("dispose",P),D(x),x.isVideoTexture&&u.delete(x)}function L(w){const x=w.target;x.removeEventListener("dispose",L),M(x)}function D(w){const x=n.get(w);if(x.__webglInit===void 0)return;const k=w.source,K=d.get(k);if(K){const lt=K[x.__cacheKey];lt.usedTimes--,lt.usedTimes===0&&b(w),Object.keys(K).length===0&&d.delete(k)}n.remove(w)}function b(w){const x=n.get(w);i.deleteTexture(x.__webglTexture);const k=w.source,K=d.get(k);delete K[x.__cacheKey],o.memory.textures--}function M(w){const x=n.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),n.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(x.__webglFramebuffer[K]))for(let lt=0;lt<x.__webglFramebuffer[K].length;lt++)i.deleteFramebuffer(x.__webglFramebuffer[K][lt]);else i.deleteFramebuffer(x.__webglFramebuffer[K]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[K])}else{if(Array.isArray(x.__webglFramebuffer))for(let K=0;K<x.__webglFramebuffer.length;K++)i.deleteFramebuffer(x.__webglFramebuffer[K]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let K=0;K<x.__webglColorRenderbuffer.length;K++)x.__webglColorRenderbuffer[K]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[K]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const k=w.textures;for(let K=0,lt=k.length;K<lt;K++){const tt=n.get(k[K]);tt.__webglTexture&&(i.deleteTexture(tt.__webglTexture),o.memory.textures--),n.remove(k[K])}n.remove(w)}let C=0;function H(){C=0}function X(){const w=C;return w>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+r.maxTextures),C+=1,w}function et(w){const x=[];return x.push(w.wrapS),x.push(w.wrapT),x.push(w.wrapR||0),x.push(w.magFilter),x.push(w.minFilter),x.push(w.anisotropy),x.push(w.internalFormat),x.push(w.format),x.push(w.type),x.push(w.generateMipmaps),x.push(w.premultiplyAlpha),x.push(w.flipY),x.push(w.unpackAlignment),x.push(w.colorSpace),x.join()}function $(w,x){const k=n.get(w);if(w.isVideoTexture&&at(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&k.__version!==w.version){const K=w.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{nt(k,w,x);return}}else w.isExternalTexture&&(k.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+x)}function Z(w,x){const k=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&k.__version!==w.version){nt(k,w,x);return}e.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+x)}function it(w,x){const k=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&k.__version!==w.version){nt(k,w,x);return}e.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+x)}function G(w,x){const k=n.get(w);if(w.version>0&&k.__version!==w.version){rt(k,w,x);return}e.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+x)}const dt={[ko]:i.REPEAT,[oi]:i.CLAMP_TO_EDGE,[Ho]:i.MIRRORED_REPEAT},gt={[Ge]:i.NEAREST,[Du]:i.NEAREST_MIPMAP_NEAREST,[kr]:i.NEAREST_MIPMAP_LINEAR,[dn]:i.LINEAR,[Bs]:i.LINEAR_MIPMAP_NEAREST,[ai]:i.LINEAR_MIPMAP_LINEAR},yt={[Fu]:i.NEVER,[Vu]:i.ALWAYS,[Ou]:i.LESS,[Qc]:i.LEQUAL,[Bu]:i.EQUAL,[Hu]:i.GEQUAL,[zu]:i.GREATER,[ku]:i.NOTEQUAL};function Nt(w,x){if(x.type===fn&&t.has("OES_texture_float_linear")===!1&&(x.magFilter===dn||x.magFilter===Bs||x.magFilter===kr||x.magFilter===ai||x.minFilter===dn||x.minFilter===Bs||x.minFilter===kr||x.minFilter===ai)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(w,i.TEXTURE_WRAP_S,dt[x.wrapS]),i.texParameteri(w,i.TEXTURE_WRAP_T,dt[x.wrapT]),(w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY)&&i.texParameteri(w,i.TEXTURE_WRAP_R,dt[x.wrapR]),i.texParameteri(w,i.TEXTURE_MAG_FILTER,gt[x.magFilter]),i.texParameteri(w,i.TEXTURE_MIN_FILTER,gt[x.minFilter]),x.compareFunction&&(i.texParameteri(w,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(w,i.TEXTURE_COMPARE_FUNC,yt[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===Ge||x.minFilter!==kr&&x.minFilter!==ai||x.type===fn&&t.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){const k=t.get("EXT_texture_filter_anisotropic");i.texParameterf(w,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,r.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function Vt(w,x){let k=!1;w.__webglInit===void 0&&(w.__webglInit=!0,x.addEventListener("dispose",P));const K=x.source;let lt=d.get(K);lt===void 0&&(lt={},d.set(K,lt));const tt=et(x);if(tt!==w.__cacheKey){lt[tt]===void 0&&(lt[tt]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,k=!0),lt[tt].usedTimes++;const Pt=lt[w.__cacheKey];Pt!==void 0&&(lt[w.__cacheKey].usedTimes--,Pt.usedTimes===0&&b(x)),w.__cacheKey=tt,w.__webglTexture=lt[tt].texture}return k}function Zt(w,x,k){return Math.floor(Math.floor(w/k)/x)}function Gt(w,x,k,K){const tt=w.updateRanges;if(tt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,k,K,x.data);else{tt.sort((ht,St)=>ht.start-St.start);let Pt=0;for(let ht=1;ht<tt.length;ht++){const St=tt[Pt],zt=tt[ht],Dt=St.start+St.count,xt=Zt(zt.start,x.width,4),$t=Zt(St.start,x.width,4);zt.start<=Dt+1&&xt===$t&&Zt(zt.start+zt.count-1,x.width,4)===xt?St.count=Math.max(St.count,zt.start+zt.count-St.start):(++Pt,tt[Pt]=zt)}tt.length=Pt+1;const mt=i.getParameter(i.UNPACK_ROW_LENGTH),At=i.getParameter(i.UNPACK_SKIP_PIXELS),Rt=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let ht=0,St=tt.length;ht<St;ht++){const zt=tt[ht],Dt=Math.floor(zt.start/4),xt=Math.ceil(zt.count/4),$t=Dt%x.width,N=Math.floor(Dt/x.width),pt=xt,_t=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,$t),i.pixelStorei(i.UNPACK_SKIP_ROWS,N),e.texSubImage2D(i.TEXTURE_2D,0,$t,N,pt,_t,k,K,x.data)}w.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,mt),i.pixelStorei(i.UNPACK_SKIP_PIXELS,At),i.pixelStorei(i.UNPACK_SKIP_ROWS,Rt)}}function nt(w,x,k){let K=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(K=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(K=i.TEXTURE_3D);const lt=Vt(w,x),tt=x.source;e.bindTexture(K,w.__webglTexture,i.TEXTURE0+k);const Pt=n.get(tt);if(tt.version!==Pt.__version||lt===!0){e.activeTexture(i.TEXTURE0+k);const mt=Jt.getPrimaries(Jt.workingColorSpace),At=x.colorSpace===On?null:Jt.getPrimaries(x.colorSpace),Rt=x.colorSpace===On||mt===At?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Rt);let ht=_(x.image,!1,r.maxTextureSize);ht=Ht(x,ht);const St=s.convert(x.format,x.colorSpace),zt=s.convert(x.type);let Dt=y(x.internalFormat,St,zt,x.colorSpace,x.isVideoTexture);Nt(K,x);let xt;const $t=x.mipmaps,N=x.isVideoTexture!==!0,pt=Pt.__version===void 0||lt===!0,_t=tt.dataReady,Tt=A(x,ht);if(x.isDepthTexture)Dt=v(x.format===Sr,x.type),pt&&(N?e.texStorage2D(i.TEXTURE_2D,1,Dt,ht.width,ht.height):e.texImage2D(i.TEXTURE_2D,0,Dt,ht.width,ht.height,0,St,zt,null));else if(x.isDataTexture)if($t.length>0){N&&pt&&e.texStorage2D(i.TEXTURE_2D,Tt,Dt,$t[0].width,$t[0].height);for(let ut=0,st=$t.length;ut<st;ut++)xt=$t[ut],N?_t&&e.texSubImage2D(i.TEXTURE_2D,ut,0,0,xt.width,xt.height,St,zt,xt.data):e.texImage2D(i.TEXTURE_2D,ut,Dt,xt.width,xt.height,0,St,zt,xt.data);x.generateMipmaps=!1}else N?(pt&&e.texStorage2D(i.TEXTURE_2D,Tt,Dt,ht.width,ht.height),_t&&Gt(x,ht,St,zt)):e.texImage2D(i.TEXTURE_2D,0,Dt,ht.width,ht.height,0,St,zt,ht.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){N&&pt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Tt,Dt,$t[0].width,$t[0].height,ht.depth);for(let ut=0,st=$t.length;ut<st;ut++)if(xt=$t[ut],x.format!==rn)if(St!==null)if(N){if(_t)if(x.layerUpdates.size>0){const Ct=Yl(xt.width,xt.height,x.format,x.type);for(const Wt of x.layerUpdates){const oe=xt.data.subarray(Wt*Ct/xt.data.BYTES_PER_ELEMENT,(Wt+1)*Ct/xt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ut,0,0,Wt,xt.width,xt.height,1,St,oe)}x.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ut,0,0,0,xt.width,xt.height,ht.depth,St,xt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ut,Dt,xt.width,xt.height,ht.depth,0,xt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else N?_t&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,ut,0,0,0,xt.width,xt.height,ht.depth,St,zt,xt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,ut,Dt,xt.width,xt.height,ht.depth,0,St,zt,xt.data)}else{N&&pt&&e.texStorage2D(i.TEXTURE_2D,Tt,Dt,$t[0].width,$t[0].height);for(let ut=0,st=$t.length;ut<st;ut++)xt=$t[ut],x.format!==rn?St!==null?N?_t&&e.compressedTexSubImage2D(i.TEXTURE_2D,ut,0,0,xt.width,xt.height,St,xt.data):e.compressedTexImage2D(i.TEXTURE_2D,ut,Dt,xt.width,xt.height,0,xt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):N?_t&&e.texSubImage2D(i.TEXTURE_2D,ut,0,0,xt.width,xt.height,St,zt,xt.data):e.texImage2D(i.TEXTURE_2D,ut,Dt,xt.width,xt.height,0,St,zt,xt.data)}else if(x.isDataArrayTexture)if(N){if(pt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Tt,Dt,ht.width,ht.height,ht.depth),_t)if(x.layerUpdates.size>0){const ut=Yl(ht.width,ht.height,x.format,x.type);for(const st of x.layerUpdates){const Ct=ht.data.subarray(st*ut/ht.data.BYTES_PER_ELEMENT,(st+1)*ut/ht.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,st,ht.width,ht.height,1,St,zt,Ct)}x.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ht.width,ht.height,ht.depth,St,zt,ht.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Dt,ht.width,ht.height,ht.depth,0,St,zt,ht.data);else if(x.isData3DTexture)N?(pt&&e.texStorage3D(i.TEXTURE_3D,Tt,Dt,ht.width,ht.height,ht.depth),_t&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ht.width,ht.height,ht.depth,St,zt,ht.data)):e.texImage3D(i.TEXTURE_3D,0,Dt,ht.width,ht.height,ht.depth,0,St,zt,ht.data);else if(x.isFramebufferTexture){if(pt)if(N)e.texStorage2D(i.TEXTURE_2D,Tt,Dt,ht.width,ht.height);else{let ut=ht.width,st=ht.height;for(let Ct=0;Ct<Tt;Ct++)e.texImage2D(i.TEXTURE_2D,Ct,Dt,ut,st,0,St,zt,null),ut>>=1,st>>=1}}else if($t.length>0){if(N&&pt){const ut=Bt($t[0]);e.texStorage2D(i.TEXTURE_2D,Tt,Dt,ut.width,ut.height)}for(let ut=0,st=$t.length;ut<st;ut++)xt=$t[ut],N?_t&&e.texSubImage2D(i.TEXTURE_2D,ut,0,0,St,zt,xt):e.texImage2D(i.TEXTURE_2D,ut,Dt,St,zt,xt);x.generateMipmaps=!1}else if(N){if(pt){const ut=Bt(ht);e.texStorage2D(i.TEXTURE_2D,Tt,Dt,ut.width,ut.height)}_t&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,St,zt,ht)}else e.texImage2D(i.TEXTURE_2D,0,Dt,St,zt,ht);m(x)&&p(K),Pt.__version=tt.version,x.onUpdate&&x.onUpdate(x)}w.__version=x.version}function rt(w,x,k){if(x.image.length!==6)return;const K=Vt(w,x),lt=x.source;e.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+k);const tt=n.get(lt);if(lt.version!==tt.__version||K===!0){e.activeTexture(i.TEXTURE0+k);const Pt=Jt.getPrimaries(Jt.workingColorSpace),mt=x.colorSpace===On?null:Jt.getPrimaries(x.colorSpace),At=x.colorSpace===On||Pt===mt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,At);const Rt=x.isCompressedTexture||x.image[0].isCompressedTexture,ht=x.image[0]&&x.image[0].isDataTexture,St=[];for(let st=0;st<6;st++)!Rt&&!ht?St[st]=_(x.image[st],!0,r.maxCubemapSize):St[st]=ht?x.image[st].image:x.image[st],St[st]=Ht(x,St[st]);const zt=St[0],Dt=s.convert(x.format,x.colorSpace),xt=s.convert(x.type),$t=y(x.internalFormat,Dt,xt,x.colorSpace),N=x.isVideoTexture!==!0,pt=tt.__version===void 0||K===!0,_t=lt.dataReady;let Tt=A(x,zt);Nt(i.TEXTURE_CUBE_MAP,x);let ut;if(Rt){N&&pt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Tt,$t,zt.width,zt.height);for(let st=0;st<6;st++){ut=St[st].mipmaps;for(let Ct=0;Ct<ut.length;Ct++){const Wt=ut[Ct];x.format!==rn?Dt!==null?N?_t&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct,0,0,Wt.width,Wt.height,Dt,Wt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct,$t,Wt.width,Wt.height,0,Wt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?_t&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct,0,0,Wt.width,Wt.height,Dt,xt,Wt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct,$t,Wt.width,Wt.height,0,Dt,xt,Wt.data)}}}else{if(ut=x.mipmaps,N&&pt){ut.length>0&&Tt++;const st=Bt(St[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Tt,$t,st.width,st.height)}for(let st=0;st<6;st++)if(ht){N?_t&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,0,0,St[st].width,St[st].height,Dt,xt,St[st].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,$t,St[st].width,St[st].height,0,Dt,xt,St[st].data);for(let Ct=0;Ct<ut.length;Ct++){const oe=ut[Ct].image[st].image;N?_t&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct+1,0,0,oe.width,oe.height,Dt,xt,oe.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct+1,$t,oe.width,oe.height,0,Dt,xt,oe.data)}}else{N?_t&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,0,0,Dt,xt,St[st]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,$t,Dt,xt,St[st]);for(let Ct=0;Ct<ut.length;Ct++){const Wt=ut[Ct];N?_t&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct+1,0,0,Dt,xt,Wt.image[st]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Ct+1,$t,Dt,xt,Wt.image[st])}}}m(x)&&p(i.TEXTURE_CUBE_MAP),tt.__version=lt.version,x.onUpdate&&x.onUpdate(x)}w.__version=x.version}function Et(w,x,k,K,lt,tt){const Pt=s.convert(k.format,k.colorSpace),mt=s.convert(k.type),At=y(k.internalFormat,Pt,mt,k.colorSpace),Rt=n.get(x),ht=n.get(k);if(ht.__renderTarget=x,!Rt.__hasExternalTextures){const St=Math.max(1,x.width>>tt),zt=Math.max(1,x.height>>tt);lt===i.TEXTURE_3D||lt===i.TEXTURE_2D_ARRAY?e.texImage3D(lt,tt,At,St,zt,x.depth,0,Pt,mt,null):e.texImage2D(lt,tt,At,St,zt,0,Pt,mt,null)}e.bindFramebuffer(i.FRAMEBUFFER,w),J(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,lt,ht.__webglTexture,0,Q(x)):(lt===i.TEXTURE_2D||lt>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&lt<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,K,lt,ht.__webglTexture,tt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function R(w,x,k){if(i.bindRenderbuffer(i.RENDERBUFFER,w),x.depthBuffer){const K=x.depthTexture,lt=K&&K.isDepthTexture?K.type:null,tt=v(x.stencilBuffer,lt),Pt=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,mt=Q(x);J(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt,tt,x.width,x.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt,tt,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,tt,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Pt,i.RENDERBUFFER,w)}else{const K=x.textures;for(let lt=0;lt<K.length;lt++){const tt=K[lt],Pt=s.convert(tt.format,tt.colorSpace),mt=s.convert(tt.type),At=y(tt.internalFormat,Pt,mt,tt.colorSpace),Rt=Q(x);k&&J(x)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Rt,At,x.width,x.height):J(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Rt,At,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,At,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function U(w,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(i.FRAMEBUFFER,w),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const K=n.get(x.depthTexture);K.__renderTarget=x,(!K.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),$(x.depthTexture,0);const lt=K.__webglTexture,tt=Q(x);if(x.depthTexture.format===Mr)J(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,lt,0,tt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,lt,0);else if(x.depthTexture.format===Sr)J(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,lt,0,tt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,lt,0);else throw new Error("Unknown depthTexture format")}function Y(w){const x=n.get(w),k=w.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==w.depthTexture){const K=w.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),K){const lt=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,K.removeEventListener("dispose",lt)};K.addEventListener("dispose",lt),x.__depthDisposeCallback=lt}x.__boundDepthTexture=K}if(w.depthTexture&&!x.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");const K=w.texture.mipmaps;K&&K.length>0?U(x.__webglFramebuffer[0],w):U(x.__webglFramebuffer,w)}else if(k){x.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[K]),x.__webglDepthbuffer[K]===void 0)x.__webglDepthbuffer[K]=i.createRenderbuffer(),R(x.__webglDepthbuffer[K],w,!1);else{const lt=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,tt=x.__webglDepthbuffer[K];i.bindRenderbuffer(i.RENDERBUFFER,tt),i.framebufferRenderbuffer(i.FRAMEBUFFER,lt,i.RENDERBUFFER,tt)}}else{const K=w.texture.mipmaps;if(K&&K.length>0?e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),R(x.__webglDepthbuffer,w,!1);else{const lt=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,tt=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,tt),i.framebufferRenderbuffer(i.FRAMEBUFFER,lt,i.RENDERBUFFER,tt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function ot(w,x,k){const K=n.get(w);x!==void 0&&Et(K.__webglFramebuffer,w,w.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&Y(w)}function S(w){const x=w.texture,k=n.get(w),K=n.get(x);w.addEventListener("dispose",L);const lt=w.textures,tt=w.isWebGLCubeRenderTarget===!0,Pt=lt.length>1;if(Pt||(K.__webglTexture===void 0&&(K.__webglTexture=i.createTexture()),K.__version=x.version,o.memory.textures++),tt){k.__webglFramebuffer=[];for(let mt=0;mt<6;mt++)if(x.mipmaps&&x.mipmaps.length>0){k.__webglFramebuffer[mt]=[];for(let At=0;At<x.mipmaps.length;At++)k.__webglFramebuffer[mt][At]=i.createFramebuffer()}else k.__webglFramebuffer[mt]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){k.__webglFramebuffer=[];for(let mt=0;mt<x.mipmaps.length;mt++)k.__webglFramebuffer[mt]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(Pt)for(let mt=0,At=lt.length;mt<At;mt++){const Rt=n.get(lt[mt]);Rt.__webglTexture===void 0&&(Rt.__webglTexture=i.createTexture(),o.memory.textures++)}if(w.samples>0&&J(w)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let mt=0;mt<lt.length;mt++){const At=lt[mt];k.__webglColorRenderbuffer[mt]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[mt]);const Rt=s.convert(At.format,At.colorSpace),ht=s.convert(At.type),St=y(At.internalFormat,Rt,ht,At.colorSpace,w.isXRRenderTarget===!0),zt=Q(w);i.renderbufferStorageMultisample(i.RENDERBUFFER,zt,St,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+mt,i.RENDERBUFFER,k.__webglColorRenderbuffer[mt])}i.bindRenderbuffer(i.RENDERBUFFER,null),w.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),R(k.__webglDepthRenderbuffer,w,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(tt){e.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),Nt(i.TEXTURE_CUBE_MAP,x);for(let mt=0;mt<6;mt++)if(x.mipmaps&&x.mipmaps.length>0)for(let At=0;At<x.mipmaps.length;At++)Et(k.__webglFramebuffer[mt][At],w,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+mt,At);else Et(k.__webglFramebuffer[mt],w,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+mt,0);m(x)&&p(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Pt){for(let mt=0,At=lt.length;mt<At;mt++){const Rt=lt[mt],ht=n.get(Rt);let St=i.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(St=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(St,ht.__webglTexture),Nt(St,Rt),Et(k.__webglFramebuffer,w,Rt,i.COLOR_ATTACHMENT0+mt,St,0),m(Rt)&&p(St)}e.unbindTexture()}else{let mt=i.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(mt=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(mt,K.__webglTexture),Nt(mt,x),x.mipmaps&&x.mipmaps.length>0)for(let At=0;At<x.mipmaps.length;At++)Et(k.__webglFramebuffer[At],w,x,i.COLOR_ATTACHMENT0,mt,At);else Et(k.__webglFramebuffer,w,x,i.COLOR_ATTACHMENT0,mt,0);m(x)&&p(mt),e.unbindTexture()}w.depthBuffer&&Y(w)}function O(w){const x=w.textures;for(let k=0,K=x.length;k<K;k++){const lt=x[k];if(m(lt)){const tt=T(w),Pt=n.get(lt).__webglTexture;e.bindTexture(tt,Pt),p(tt),e.unbindTexture()}}}const B=[],W=[];function V(w){if(w.samples>0){if(J(w)===!1){const x=w.textures,k=w.width,K=w.height;let lt=i.COLOR_BUFFER_BIT;const tt=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Pt=n.get(w),mt=x.length>1;if(mt)for(let Rt=0;Rt<x.length;Rt++)e.bindFramebuffer(i.FRAMEBUFFER,Pt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,Pt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,Pt.__webglMultisampledFramebuffer);const At=w.texture.mipmaps;At&&At.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Pt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Pt.__webglFramebuffer);for(let Rt=0;Rt<x.length;Rt++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(lt|=i.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(lt|=i.STENCIL_BUFFER_BIT)),mt){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Pt.__webglColorRenderbuffer[Rt]);const ht=n.get(x[Rt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ht,0)}i.blitFramebuffer(0,0,k,K,0,0,k,K,lt,i.NEAREST),l===!0&&(B.length=0,W.length=0,B.push(i.COLOR_ATTACHMENT0+Rt),w.depthBuffer&&w.resolveDepthBuffer===!1&&(B.push(tt),W.push(tt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,W)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,B))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),mt)for(let Rt=0;Rt<x.length;Rt++){e.bindFramebuffer(i.FRAMEBUFFER,Pt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.RENDERBUFFER,Pt.__webglColorRenderbuffer[Rt]);const ht=n.get(x[Rt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,Pt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Rt,i.TEXTURE_2D,ht,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Pt.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&l){const x=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function Q(w){return Math.min(r.maxSamples,w.samples)}function J(w){const x=n.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function at(w){const x=o.render.frame;u.get(w)!==x&&(u.set(w,x),w.update())}function Ht(w,x){const k=w.colorSpace,K=w.format,lt=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||k!==Xi&&k!==On&&(Jt.getTransfer(k)===ne?(K!==rn||lt!==mn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),x}function Bt(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=X,this.resetTextureUnits=H,this.setTexture2D=$,this.setTexture2DArray=Z,this.setTexture3D=it,this.setTextureCube=G,this.rebindTextures=ot,this.setupRenderTarget=S,this.updateRenderTargetMipmap=O,this.updateMultisampleRenderTarget=V,this.setupDepthRenderbuffer=Y,this.setupFrameBufferTexture=Et,this.useMultisampledRTT=J}function Q_(i,t){function e(n,r=On){let s;const o=Jt.getTransfer(r);if(n===mn)return i.UNSIGNED_BYTE;if(n===Na)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Fa)return i.UNSIGNED_SHORT_5_5_5_1;if(n===qc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===jc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===$c)return i.BYTE;if(n===Yc)return i.SHORT;if(n===xr)return i.UNSIGNED_SHORT;if(n===Ua)return i.INT;if(n===li)return i.UNSIGNED_INT;if(n===fn)return i.FLOAT;if(n===Cr)return i.HALF_FLOAT;if(n===Zc)return i.ALPHA;if(n===Kc)return i.RGB;if(n===rn)return i.RGBA;if(n===Mr)return i.DEPTH_COMPONENT;if(n===Sr)return i.DEPTH_STENCIL;if(n===Oa)return i.RED;if(n===Ba)return i.RED_INTEGER;if(n===Jc)return i.RG;if(n===za)return i.RG_INTEGER;if(n===ka)return i.RGBA_INTEGER;if(n===ds||n===fs||n===ps||n===ms)if(o===ne)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===ds)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===fs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ps)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ms)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===ds)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===fs)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ps)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ms)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Vo||n===Go||n===Wo||n===Xo)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===Vo)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Go)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Wo)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Xo)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===$o||n===Yo||n===qo)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(n===$o||n===Yo)return o===ne?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===qo)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===jo||n===Zo||n===Ko||n===Jo||n===Qo||n===ta||n===ea||n===na||n===ia||n===ra||n===sa||n===oa||n===aa||n===la)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(n===jo)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Zo)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ko)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Jo)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Qo)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ta)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===ea)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===na)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ia)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===ra)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===sa)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===oa)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===aa)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===la)return o===ne?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ca||n===ha||n===ua)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(n===ca)return o===ne?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ha)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ua)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===da||n===fa||n===pa||n===ma)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(n===da)return s.COMPRESSED_RED_RGTC1_EXT;if(n===fa)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===pa)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ma)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===yr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}const t0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,e0=`
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

}`;class n0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const n=new ph(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Wn({vertexShader:t0,fragmentShader:e0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new fe(new Lr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class i0 extends di{constructor(t,e){super();const n=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,u=null,h=null,d=null,f=null,g=null;const _=typeof XRWebGLBinding<"u",m=new n0,p={},T=e.getContextAttributes();let y=null,v=null;const A=[],P=[],L=new ct;let D=null;const b=new Ve;b.viewport=new re;const M=new Ve;M.viewport=new re;const C=[b,M],H=new Ef;let X=null,et=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(nt){let rt=A[nt];return rt===void 0&&(rt=new so,A[nt]=rt),rt.getTargetRaySpace()},this.getControllerGrip=function(nt){let rt=A[nt];return rt===void 0&&(rt=new so,A[nt]=rt),rt.getGripSpace()},this.getHand=function(nt){let rt=A[nt];return rt===void 0&&(rt=new so,A[nt]=rt),rt.getHandSpace()};function $(nt){const rt=P.indexOf(nt.inputSource);if(rt===-1)return;const Et=A[rt];Et!==void 0&&(Et.update(nt.inputSource,nt.frame,c||o),Et.dispatchEvent({type:nt.type,data:nt.inputSource}))}function Z(){r.removeEventListener("select",$),r.removeEventListener("selectstart",$),r.removeEventListener("selectend",$),r.removeEventListener("squeeze",$),r.removeEventListener("squeezestart",$),r.removeEventListener("squeezeend",$),r.removeEventListener("end",Z),r.removeEventListener("inputsourceschange",it);for(let nt=0;nt<A.length;nt++){const rt=P[nt];rt!==null&&(P[nt]=null,A[nt].disconnect(rt))}X=null,et=null,m.reset();for(const nt in p)delete p[nt];t.setRenderTarget(y),f=null,d=null,h=null,r=null,v=null,Gt.stop(),n.isPresenting=!1,t.setPixelRatio(D),t.setSize(L.width,L.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(nt){s=nt,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(nt){a=nt,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(nt){c=nt},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h===null&&_&&(h=new XRWebGLBinding(r,e)),h},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(nt){if(r=nt,r!==null){if(y=t.getRenderTarget(),r.addEventListener("select",$),r.addEventListener("selectstart",$),r.addEventListener("selectend",$),r.addEventListener("squeeze",$),r.addEventListener("squeezestart",$),r.addEventListener("squeezeend",$),r.addEventListener("end",Z),r.addEventListener("inputsourceschange",it),T.xrCompatible!==!0&&await e.makeXRCompatible(),D=t.getPixelRatio(),t.getSize(L),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let Et=null,R=null,U=null;T.depth&&(U=T.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,Et=T.stencil?Sr:Mr,R=T.stencil?yr:li);const Y={colorFormat:e.RGBA8,depthFormat:U,scaleFactor:s};h=this.getBinding(),d=h.createProjectionLayer(Y),r.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),v=new hi(d.textureWidth,d.textureHeight,{format:rn,type:mn,depthTexture:new fh(d.textureWidth,d.textureHeight,R,void 0,void 0,void 0,void 0,void 0,void 0,Et),stencilBuffer:T.stencil,colorSpace:t.outputColorSpace,samples:T.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const Et={antialias:T.antialias,alpha:!0,depth:T.depth,stencil:T.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,e,Et),r.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new hi(f.framebufferWidth,f.framebufferHeight,{format:rn,type:mn,colorSpace:t.outputColorSpace,stencilBuffer:T.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),Gt.setContext(r),Gt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function it(nt){for(let rt=0;rt<nt.removed.length;rt++){const Et=nt.removed[rt],R=P.indexOf(Et);R>=0&&(P[R]=null,A[R].disconnect(Et))}for(let rt=0;rt<nt.added.length;rt++){const Et=nt.added[rt];let R=P.indexOf(Et);if(R===-1){for(let Y=0;Y<A.length;Y++)if(Y>=P.length){P.push(Et),R=Y;break}else if(P[Y]===null){P[Y]=Et,R=Y;break}if(R===-1)break}const U=A[R];U&&U.connect(Et)}}const G=new I,dt=new I;function gt(nt,rt,Et){G.setFromMatrixPosition(rt.matrixWorld),dt.setFromMatrixPosition(Et.matrixWorld);const R=G.distanceTo(dt),U=rt.projectionMatrix.elements,Y=Et.projectionMatrix.elements,ot=U[14]/(U[10]-1),S=U[14]/(U[10]+1),O=(U[9]+1)/U[5],B=(U[9]-1)/U[5],W=(U[8]-1)/U[0],V=(Y[8]+1)/Y[0],Q=ot*W,J=ot*V,at=R/(-W+V),Ht=at*-W;if(rt.matrixWorld.decompose(nt.position,nt.quaternion,nt.scale),nt.translateX(Ht),nt.translateZ(at),nt.matrixWorld.compose(nt.position,nt.quaternion,nt.scale),nt.matrixWorldInverse.copy(nt.matrixWorld).invert(),U[10]===-1)nt.projectionMatrix.copy(rt.projectionMatrix),nt.projectionMatrixInverse.copy(rt.projectionMatrixInverse);else{const Bt=ot+at,w=S+at,x=Q-Ht,k=J+(R-Ht),K=O*S/w*Bt,lt=B*S/w*Bt;nt.projectionMatrix.makePerspective(x,k,K,lt,Bt,w),nt.projectionMatrixInverse.copy(nt.projectionMatrix).invert()}}function yt(nt,rt){rt===null?nt.matrixWorld.copy(nt.matrix):nt.matrixWorld.multiplyMatrices(rt.matrixWorld,nt.matrix),nt.matrixWorldInverse.copy(nt.matrixWorld).invert()}this.updateCamera=function(nt){if(r===null)return;let rt=nt.near,Et=nt.far;m.texture!==null&&(m.depthNear>0&&(rt=m.depthNear),m.depthFar>0&&(Et=m.depthFar)),H.near=M.near=b.near=rt,H.far=M.far=b.far=Et,(X!==H.near||et!==H.far)&&(r.updateRenderState({depthNear:H.near,depthFar:H.far}),X=H.near,et=H.far),H.layers.mask=nt.layers.mask|6,b.layers.mask=H.layers.mask&3,M.layers.mask=H.layers.mask&5;const R=nt.parent,U=H.cameras;yt(H,R);for(let Y=0;Y<U.length;Y++)yt(U[Y],R);U.length===2?gt(H,b,M):H.projectionMatrix.copy(b.projectionMatrix),Nt(nt,H,R)};function Nt(nt,rt,Et){Et===null?nt.matrix.copy(rt.matrixWorld):(nt.matrix.copy(Et.matrixWorld),nt.matrix.invert(),nt.matrix.multiply(rt.matrixWorld)),nt.matrix.decompose(nt.position,nt.quaternion,nt.scale),nt.updateMatrixWorld(!0),nt.projectionMatrix.copy(rt.projectionMatrix),nt.projectionMatrixInverse.copy(rt.projectionMatrixInverse),nt.isPerspectiveCamera&&(nt.fov=Er*2*Math.atan(1/nt.projectionMatrix.elements[5]),nt.zoom=1)}this.getCamera=function(){return H},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(nt){l=nt,d!==null&&(d.fixedFoveation=nt),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=nt)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(H)},this.getCameraTexture=function(nt){return p[nt]};let Vt=null;function Zt(nt,rt){if(u=rt.getViewerPose(c||o),g=rt,u!==null){const Et=u.views;f!==null&&(t.setRenderTargetFramebuffer(v,f.framebuffer),t.setRenderTarget(v));let R=!1;Et.length!==H.cameras.length&&(H.cameras.length=0,R=!0);for(let S=0;S<Et.length;S++){const O=Et[S];let B=null;if(f!==null)B=f.getViewport(O);else{const V=h.getViewSubImage(d,O);B=V.viewport,S===0&&(t.setRenderTargetTextures(v,V.colorTexture,V.depthStencilTexture),t.setRenderTarget(v))}let W=C[S];W===void 0&&(W=new Ve,W.layers.enable(S),W.viewport=new re,C[S]=W),W.matrix.fromArray(O.transform.matrix),W.matrix.decompose(W.position,W.quaternion,W.scale),W.projectionMatrix.fromArray(O.projectionMatrix),W.projectionMatrixInverse.copy(W.projectionMatrix).invert(),W.viewport.set(B.x,B.y,B.width,B.height),S===0&&(H.matrix.copy(W.matrix),H.matrix.decompose(H.position,H.quaternion,H.scale)),R===!0&&H.cameras.push(W)}const U=r.enabledFeatures;if(U&&U.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&_){h=n.getBinding();const S=h.getDepthInformation(Et[0]);S&&S.isValid&&S.texture&&m.init(S,r.renderState)}if(U&&U.includes("camera-access")&&_){t.state.unbindTexture(),h=n.getBinding();for(let S=0;S<Et.length;S++){const O=Et[S].camera;if(O){let B=p[O];B||(B=new ph,p[O]=B);const W=h.getCameraImage(O);B.sourceTexture=W}}}}for(let Et=0;Et<A.length;Et++){const R=P[Et],U=A[Et];R!==null&&U!==void 0&&U.update(R,rt,c||o)}Vt&&Vt(nt,rt),rt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:rt}),g=null}const Gt=new Ah;Gt.setAnimationLoop(Zt),this.setAnimationLoop=function(nt){Vt=nt},this.dispose=function(){}}}const ti=new on,r0=new ae;function s0(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,ch(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,T,y,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),h(m,p)):p.isMeshPhongMaterial?(s(m,p),u(m,p)):p.isMeshStandardMaterial?(s(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,v)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),_(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,T,y):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Le&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Le&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const T=t.get(p),y=T.envMap,v=T.envMapRotation;y&&(m.envMap.value=y,ti.copy(v),ti.x*=-1,ti.y*=-1,ti.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(ti.y*=-1,ti.z*=-1),m.envMapRotation.value.setFromMatrix4(r0.makeRotationFromEuler(ti)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,T,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*T,m.scale.value=y*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,T){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Le&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=T.texture,m.transmissionSamplerSize.value.set(T.width,T.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const T=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(T.matrixWorld),m.nearDistance.value=T.shadow.camera.near,m.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function o0(i,t,e,n){let r={},s={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(T,y){const v=y.program;n.uniformBlockBinding(T,v)}function c(T,y){let v=r[T.id];v===void 0&&(g(T),v=u(T),r[T.id]=v,T.addEventListener("dispose",m));const A=y.program;n.updateUBOMapping(T,A);const P=t.render.frame;s[T.id]!==P&&(d(T),s[T.id]=P)}function u(T){const y=h();T.__bindingPointIndex=y;const v=i.createBuffer(),A=T.__size,P=T.usage;return i.bindBuffer(i.UNIFORM_BUFFER,v),i.bufferData(i.UNIFORM_BUFFER,A,P),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,y,v),v}function h(){for(let T=0;T<a;T++)if(o.indexOf(T)===-1)return o.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(T){const y=r[T.id],v=T.uniforms,A=T.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let P=0,L=v.length;P<L;P++){const D=Array.isArray(v[P])?v[P]:[v[P]];for(let b=0,M=D.length;b<M;b++){const C=D[b];if(f(C,P,b,A)===!0){const H=C.__offset,X=Array.isArray(C.value)?C.value:[C.value];let et=0;for(let $=0;$<X.length;$++){const Z=X[$],it=_(Z);typeof Z=="number"||typeof Z=="boolean"?(C.__data[0]=Z,i.bufferSubData(i.UNIFORM_BUFFER,H+et,C.__data)):Z.isMatrix3?(C.__data[0]=Z.elements[0],C.__data[1]=Z.elements[1],C.__data[2]=Z.elements[2],C.__data[3]=0,C.__data[4]=Z.elements[3],C.__data[5]=Z.elements[4],C.__data[6]=Z.elements[5],C.__data[7]=0,C.__data[8]=Z.elements[6],C.__data[9]=Z.elements[7],C.__data[10]=Z.elements[8],C.__data[11]=0):(Z.toArray(C.__data,et),et+=it.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,H,C.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(T,y,v,A){const P=T.value,L=y+"_"+v;if(A[L]===void 0)return typeof P=="number"||typeof P=="boolean"?A[L]=P:A[L]=P.clone(),!0;{const D=A[L];if(typeof P=="number"||typeof P=="boolean"){if(D!==P)return A[L]=P,!0}else if(D.equals(P)===!1)return D.copy(P),!0}return!1}function g(T){const y=T.uniforms;let v=0;const A=16;for(let L=0,D=y.length;L<D;L++){const b=Array.isArray(y[L])?y[L]:[y[L]];for(let M=0,C=b.length;M<C;M++){const H=b[M],X=Array.isArray(H.value)?H.value:[H.value];for(let et=0,$=X.length;et<$;et++){const Z=X[et],it=_(Z),G=v%A,dt=G%it.boundary,gt=G+dt;v+=dt,gt!==0&&A-gt<it.storage&&(v+=A-gt),H.__data=new Float32Array(it.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=v,v+=it.storage}}}const P=v%A;return P>0&&(v+=A-P),T.__size=v,T.__cache={},this}function _(T){const y={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(y.boundary=4,y.storage=4):T.isVector2?(y.boundary=8,y.storage=8):T.isVector3||T.isColor?(y.boundary=16,y.storage=12):T.isVector4?(y.boundary=16,y.storage=16):T.isMatrix3?(y.boundary=48,y.storage=48):T.isMatrix4?(y.boundary=64,y.storage=64):T.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T),y}function m(T){const y=T.target;y.removeEventListener("dispose",m);const v=o.indexOf(y.__bindingPointIndex);o.splice(v,1),i.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function p(){for(const T in r)i.deleteBuffer(r[T]);o=[],r={},s={}}return{bind:l,update:c,dispose:p}}class a0{constructor(t={}){const{canvas:e=sd(),context:n=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1}=t;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const g=new Uint32Array(4),_=new Int32Array(4);let m=null,p=null;const T=[],y=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Hn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const v=this;let A=!1;this._outputColorSpace=He;let P=0,L=0,D=null,b=-1,M=null;const C=new re,H=new re;let X=null;const et=new Yt(0);let $=0,Z=e.width,it=e.height,G=1,dt=null,gt=null;const yt=new re(0,0,Z,it),Nt=new re(0,0,Z,it);let Vt=!1;const Zt=new Xa;let Gt=!1,nt=!1;const rt=new ae,Et=new I,R=new re,U={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Y=!1;function ot(){return D===null?G:1}let S=n;function O(E,F){return e.getContext(E,F)}try{const E={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Da}`),e.addEventListener("webglcontextlost",_t,!1),e.addEventListener("webglcontextrestored",Tt,!1),e.addEventListener("webglcontextcreationerror",ut,!1),S===null){const F="webgl2";if(S=O(F,E),S===null)throw O(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let B,W,V,Q,J,at,Ht,Bt,w,x,k,K,lt,tt,Pt,mt,At,Rt,ht,St,zt,Dt,xt,$t;function N(){B=new _g(S),B.init(),Dt=new Q_(S,B),W=new hg(S,B,t,Dt),V=new K_(S,B),W.reversedDepthBuffer&&d&&V.buffers.depth.setReversed(!0),Q=new yg(S),J=new B_,at=new J_(S,B,V,J,W,Dt,Q),Ht=new dg(v),Bt=new gg(v),w=new wf(S),xt=new lg(S,w),x=new vg(S,w,Q,xt),k=new Sg(S,x,w,Q),ht=new Mg(S,W,at),mt=new ug(J),K=new O_(v,Ht,Bt,B,W,xt,mt),lt=new s0(v,J),tt=new k_,Pt=new $_(B),Rt=new ag(v,Ht,Bt,V,k,f,l),At=new j_(v,k,W),$t=new o0(S,Q,W,V),St=new cg(S,B,Q),zt=new xg(S,B,Q),Q.programs=K.programs,v.capabilities=W,v.extensions=B,v.properties=J,v.renderLists=tt,v.shadowMap=At,v.state=V,v.info=Q}N();const pt=new i0(v,S);this.xr=pt,this.getContext=function(){return S},this.getContextAttributes=function(){return S.getContextAttributes()},this.forceContextLoss=function(){const E=B.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=B.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return G},this.setPixelRatio=function(E){E!==void 0&&(G=E,this.setSize(Z,it,!1))},this.getSize=function(E){return E.set(Z,it)},this.setSize=function(E,F,q=!0){if(pt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}Z=E,it=F,e.width=Math.floor(E*G),e.height=Math.floor(F*G),q===!0&&(e.style.width=E+"px",e.style.height=F+"px"),this.setViewport(0,0,E,F)},this.getDrawingBufferSize=function(E){return E.set(Z*G,it*G).floor()},this.setDrawingBufferSize=function(E,F,q){Z=E,it=F,G=q,e.width=Math.floor(E*q),e.height=Math.floor(F*q),this.setViewport(0,0,E,F)},this.getCurrentViewport=function(E){return E.copy(C)},this.getViewport=function(E){return E.copy(yt)},this.setViewport=function(E,F,q,j){E.isVector4?yt.set(E.x,E.y,E.z,E.w):yt.set(E,F,q,j),V.viewport(C.copy(yt).multiplyScalar(G).round())},this.getScissor=function(E){return E.copy(Nt)},this.setScissor=function(E,F,q,j){E.isVector4?Nt.set(E.x,E.y,E.z,E.w):Nt.set(E,F,q,j),V.scissor(H.copy(Nt).multiplyScalar(G).round())},this.getScissorTest=function(){return Vt},this.setScissorTest=function(E){V.setScissorTest(Vt=E)},this.setOpaqueSort=function(E){dt=E},this.setTransparentSort=function(E){gt=E},this.getClearColor=function(E){return E.copy(Rt.getClearColor())},this.setClearColor=function(){Rt.setClearColor(...arguments)},this.getClearAlpha=function(){return Rt.getClearAlpha()},this.setClearAlpha=function(){Rt.setClearAlpha(...arguments)},this.clear=function(E=!0,F=!0,q=!0){let j=0;if(E){let z=!1;if(D!==null){const ft=D.texture.format;z=ft===ka||ft===za||ft===Ba}if(z){const ft=D.texture.type,Mt=ft===mn||ft===li||ft===xr||ft===yr||ft===Na||ft===Fa,wt=Rt.getClearColor(),bt=Rt.getClearAlpha(),Ot=wt.r,kt=wt.g,Ut=wt.b;Mt?(g[0]=Ot,g[1]=kt,g[2]=Ut,g[3]=bt,S.clearBufferuiv(S.COLOR,0,g)):(_[0]=Ot,_[1]=kt,_[2]=Ut,_[3]=bt,S.clearBufferiv(S.COLOR,0,_))}else j|=S.COLOR_BUFFER_BIT}F&&(j|=S.DEPTH_BUFFER_BIT),q&&(j|=S.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),S.clear(j)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",_t,!1),e.removeEventListener("webglcontextrestored",Tt,!1),e.removeEventListener("webglcontextcreationerror",ut,!1),Rt.dispose(),tt.dispose(),Pt.dispose(),J.dispose(),Ht.dispose(),Bt.dispose(),k.dispose(),xt.dispose(),$t.dispose(),K.dispose(),pt.dispose(),pt.removeEventListener("sessionstart",an),pt.removeEventListener("sessionend",il),Yn.stop()};function _t(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),A=!0}function Tt(){console.log("THREE.WebGLRenderer: Context Restored."),A=!1;const E=Q.autoReset,F=At.enabled,q=At.autoUpdate,j=At.needsUpdate,z=At.type;N(),Q.autoReset=E,At.enabled=F,At.autoUpdate=q,At.needsUpdate=j,At.type=z}function ut(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function st(E){const F=E.target;F.removeEventListener("dispose",st),Ct(F)}function Ct(E){Wt(E),J.remove(E)}function Wt(E){const F=J.get(E).programs;F!==void 0&&(F.forEach(function(q){K.releaseProgram(q)}),E.isShaderMaterial&&K.releaseShaderCache(E))}this.renderBufferDirect=function(E,F,q,j,z,ft){F===null&&(F=U);const Mt=z.isMesh&&z.matrixWorld.determinant()<0,wt=kh(E,F,q,j,z);V.setMaterial(j,Mt);let bt=q.index,Ot=1;if(j.wireframe===!0){if(bt=x.getWireframeAttribute(q),bt===void 0)return;Ot=2}const kt=q.drawRange,Ut=q.attributes.position;let Kt=kt.start*Ot,ee=(kt.start+kt.count)*Ot;ft!==null&&(Kt=Math.max(Kt,ft.start*Ot),ee=Math.min(ee,(ft.start+ft.count)*Ot)),bt!==null?(Kt=Math.max(Kt,0),ee=Math.min(ee,bt.count)):Ut!=null&&(Kt=Math.max(Kt,0),ee=Math.min(ee,Ut.count));const de=ee-Kt;if(de<0||de===1/0)return;xt.setup(z,j,wt,q,bt);let le,se=St;if(bt!==null&&(le=w.get(bt),se=zt,se.setIndex(le)),z.isMesh)j.wireframe===!0?(V.setLineWidth(j.wireframeLinewidth*ot()),se.setMode(S.LINES)):se.setMode(S.TRIANGLES);else if(z.isLine){let Ft=j.linewidth;Ft===void 0&&(Ft=1),V.setLineWidth(Ft*ot()),z.isLineSegments?se.setMode(S.LINES):z.isLineLoop?se.setMode(S.LINE_LOOP):se.setMode(S.LINE_STRIP)}else z.isPoints?se.setMode(S.POINTS):z.isSprite&&se.setMode(S.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)br("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),se.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(B.get("WEBGL_multi_draw"))se.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const Ft=z._multiDrawStarts,ce=z._multiDrawCounts,Qt=z._multiDrawCount,Ne=bt?w.get(bt).bytesPerElement:1,mi=J.get(j).currentProgram.getUniforms();for(let Fe=0;Fe<Qt;Fe++)mi.setValue(S,"_gl_DrawID",Fe),se.render(Ft[Fe]/Ne,ce[Fe])}else if(z.isInstancedMesh)se.renderInstances(Kt,de,z.count);else if(q.isInstancedBufferGeometry){const Ft=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,ce=Math.min(q.instanceCount,Ft);se.renderInstances(Kt,de,ce)}else se.render(Kt,de)};function oe(E,F,q){E.transparent===!0&&E.side===bn&&E.forceSinglePass===!1?(E.side=Le,E.needsUpdate=!0,Fr(E,F,q),E.side=Gn,E.needsUpdate=!0,Fr(E,F,q),E.side=bn):Fr(E,F,q)}this.compile=function(E,F,q=null){q===null&&(q=E),p=Pt.get(q),p.init(F),y.push(p),q.traverseVisible(function(z){z.isLight&&z.layers.test(F.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),E!==q&&E.traverseVisible(function(z){z.isLight&&z.layers.test(F.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),p.setupLights();const j=new Set;return E.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const ft=z.material;if(ft)if(Array.isArray(ft))for(let Mt=0;Mt<ft.length;Mt++){const wt=ft[Mt];oe(wt,q,z),j.add(wt)}else oe(ft,q,z),j.add(ft)}),p=y.pop(),j},this.compileAsync=function(E,F,q=null){const j=this.compile(E,F,q);return new Promise(z=>{function ft(){if(j.forEach(function(Mt){J.get(Mt).currentProgram.isReady()&&j.delete(Mt)}),j.size===0){z(E);return}setTimeout(ft,10)}B.get("KHR_parallel_shader_compile")!==null?ft():setTimeout(ft,10)})};let te=null;function _n(E){te&&te(E)}function an(){Yn.stop()}function il(){Yn.start()}const Yn=new Ah;Yn.setAnimationLoop(_n),typeof self<"u"&&Yn.setContext(self),this.setAnimationLoop=function(E){te=E,pt.setAnimationLoop(E),E===null?Yn.stop():Yn.start()},pt.addEventListener("sessionstart",an),pt.addEventListener("sessionend",il),this.render=function(E,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),pt.enabled===!0&&pt.isPresenting===!0&&(pt.cameraAutoUpdate===!0&&pt.updateCamera(F),F=pt.getCamera()),E.isScene===!0&&E.onBeforeRender(v,E,F,D),p=Pt.get(E,y.length),p.init(F),y.push(p),rt.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),Zt.setFromProjectionMatrix(rt,pn,F.reversedDepth),nt=this.localClippingEnabled,Gt=mt.init(this.clippingPlanes,nt),m=tt.get(E,T.length),m.init(),T.push(m),pt.enabled===!0&&pt.isPresenting===!0){const ft=v.xr.getDepthSensingMesh();ft!==null&&Ns(ft,F,-1/0,v.sortObjects)}Ns(E,F,0,v.sortObjects),m.finish(),v.sortObjects===!0&&m.sort(dt,gt),Y=pt.enabled===!1||pt.isPresenting===!1||pt.hasDepthSensing()===!1,Y&&Rt.addToRenderList(m,E),this.info.render.frame++,Gt===!0&&mt.beginShadows();const q=p.state.shadowsArray;At.render(q,E,F),Gt===!0&&mt.endShadows(),this.info.autoReset===!0&&this.info.reset();const j=m.opaque,z=m.transmissive;if(p.setupLights(),F.isArrayCamera){const ft=F.cameras;if(z.length>0)for(let Mt=0,wt=ft.length;Mt<wt;Mt++){const bt=ft[Mt];sl(j,z,E,bt)}Y&&Rt.render(E);for(let Mt=0,wt=ft.length;Mt<wt;Mt++){const bt=ft[Mt];rl(m,E,bt,bt.viewport)}}else z.length>0&&sl(j,z,E,F),Y&&Rt.render(E),rl(m,E,F);D!==null&&L===0&&(at.updateMultisampleRenderTarget(D),at.updateRenderTargetMipmap(D)),E.isScene===!0&&E.onAfterRender(v,E,F),xt.resetDefaultState(),b=-1,M=null,y.pop(),y.length>0?(p=y[y.length-1],Gt===!0&&mt.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,T.pop(),T.length>0?m=T[T.length-1]:m=null};function Ns(E,F,q,j){if(E.visible===!1)return;if(E.layers.test(F.layers)){if(E.isGroup)q=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(F);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||Zt.intersectsSprite(E)){j&&R.setFromMatrixPosition(E.matrixWorld).applyMatrix4(rt);const Mt=k.update(E),wt=E.material;wt.visible&&m.push(E,Mt,wt,q,R.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||Zt.intersectsObject(E))){const Mt=k.update(E),wt=E.material;if(j&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),R.copy(E.boundingSphere.center)):(Mt.boundingSphere===null&&Mt.computeBoundingSphere(),R.copy(Mt.boundingSphere.center)),R.applyMatrix4(E.matrixWorld).applyMatrix4(rt)),Array.isArray(wt)){const bt=Mt.groups;for(let Ot=0,kt=bt.length;Ot<kt;Ot++){const Ut=bt[Ot],Kt=wt[Ut.materialIndex];Kt&&Kt.visible&&m.push(E,Mt,Kt,q,R.z,Ut)}}else wt.visible&&m.push(E,Mt,wt,q,R.z,null)}}const ft=E.children;for(let Mt=0,wt=ft.length;Mt<wt;Mt++)Ns(ft[Mt],F,q,j)}function rl(E,F,q,j){const z=E.opaque,ft=E.transmissive,Mt=E.transparent;p.setupLightsView(q),Gt===!0&&mt.setGlobalState(v.clippingPlanes,q),j&&V.viewport(C.copy(j)),z.length>0&&Nr(z,F,q),ft.length>0&&Nr(ft,F,q),Mt.length>0&&Nr(Mt,F,q),V.buffers.depth.setTest(!0),V.buffers.depth.setMask(!0),V.buffers.color.setMask(!0),V.setPolygonOffset(!1)}function sl(E,F,q,j){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[j.id]===void 0&&(p.state.transmissionRenderTarget[j.id]=new hi(1,1,{generateMipmaps:!0,type:B.has("EXT_color_buffer_half_float")||B.has("EXT_color_buffer_float")?Cr:mn,minFilter:ai,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Jt.workingColorSpace}));const ft=p.state.transmissionRenderTarget[j.id],Mt=j.viewport||C;ft.setSize(Mt.z*v.transmissionResolutionScale,Mt.w*v.transmissionResolutionScale);const wt=v.getRenderTarget(),bt=v.getActiveCubeFace(),Ot=v.getActiveMipmapLevel();v.setRenderTarget(ft),v.getClearColor(et),$=v.getClearAlpha(),$<1&&v.setClearColor(16777215,.5),v.clear(),Y&&Rt.render(q);const kt=v.toneMapping;v.toneMapping=Hn;const Ut=j.viewport;if(j.viewport!==void 0&&(j.viewport=void 0),p.setupLightsView(j),Gt===!0&&mt.setGlobalState(v.clippingPlanes,j),Nr(E,q,j),at.updateMultisampleRenderTarget(ft),at.updateRenderTargetMipmap(ft),B.has("WEBGL_multisampled_render_to_texture")===!1){let Kt=!1;for(let ee=0,de=F.length;ee<de;ee++){const le=F[ee],se=le.object,Ft=le.geometry,ce=le.material,Qt=le.group;if(ce.side===bn&&se.layers.test(j.layers)){const Ne=ce.side;ce.side=Le,ce.needsUpdate=!0,ol(se,q,j,Ft,ce,Qt),ce.side=Ne,ce.needsUpdate=!0,Kt=!0}}Kt===!0&&(at.updateMultisampleRenderTarget(ft),at.updateRenderTargetMipmap(ft))}v.setRenderTarget(wt,bt,Ot),v.setClearColor(et,$),Ut!==void 0&&(j.viewport=Ut),v.toneMapping=kt}function Nr(E,F,q){const j=F.isScene===!0?F.overrideMaterial:null;for(let z=0,ft=E.length;z<ft;z++){const Mt=E[z],wt=Mt.object,bt=Mt.geometry,Ot=Mt.group;let kt=Mt.material;kt.allowOverride===!0&&j!==null&&(kt=j),wt.layers.test(q.layers)&&ol(wt,F,q,bt,kt,Ot)}}function ol(E,F,q,j,z,ft){E.onBeforeRender(v,F,q,j,z,ft),E.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),z.onBeforeRender(v,F,q,j,E,ft),z.transparent===!0&&z.side===bn&&z.forceSinglePass===!1?(z.side=Le,z.needsUpdate=!0,v.renderBufferDirect(q,F,j,z,E,ft),z.side=Gn,z.needsUpdate=!0,v.renderBufferDirect(q,F,j,z,E,ft),z.side=bn):v.renderBufferDirect(q,F,j,z,E,ft),E.onAfterRender(v,F,q,j,z,ft)}function Fr(E,F,q){F.isScene!==!0&&(F=U);const j=J.get(E),z=p.state.lights,ft=p.state.shadowsArray,Mt=z.state.version,wt=K.getParameters(E,z.state,ft,F,q),bt=K.getProgramCacheKey(wt);let Ot=j.programs;j.environment=E.isMeshStandardMaterial?F.environment:null,j.fog=F.fog,j.envMap=(E.isMeshStandardMaterial?Bt:Ht).get(E.envMap||j.environment),j.envMapRotation=j.environment!==null&&E.envMap===null?F.environmentRotation:E.envMapRotation,Ot===void 0&&(E.addEventListener("dispose",st),Ot=new Map,j.programs=Ot);let kt=Ot.get(bt);if(kt!==void 0){if(j.currentProgram===kt&&j.lightsStateVersion===Mt)return ll(E,wt),kt}else wt.uniforms=K.getUniforms(E),E.onBeforeCompile(wt,v),kt=K.acquireProgram(wt,bt),Ot.set(bt,kt),j.uniforms=wt.uniforms;const Ut=j.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Ut.clippingPlanes=mt.uniform),ll(E,wt),j.needsLights=Vh(E),j.lightsStateVersion=Mt,j.needsLights&&(Ut.ambientLightColor.value=z.state.ambient,Ut.lightProbe.value=z.state.probe,Ut.directionalLights.value=z.state.directional,Ut.directionalLightShadows.value=z.state.directionalShadow,Ut.spotLights.value=z.state.spot,Ut.spotLightShadows.value=z.state.spotShadow,Ut.rectAreaLights.value=z.state.rectArea,Ut.ltc_1.value=z.state.rectAreaLTC1,Ut.ltc_2.value=z.state.rectAreaLTC2,Ut.pointLights.value=z.state.point,Ut.pointLightShadows.value=z.state.pointShadow,Ut.hemisphereLights.value=z.state.hemi,Ut.directionalShadowMap.value=z.state.directionalShadowMap,Ut.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Ut.spotShadowMap.value=z.state.spotShadowMap,Ut.spotLightMatrix.value=z.state.spotLightMatrix,Ut.spotLightMap.value=z.state.spotLightMap,Ut.pointShadowMap.value=z.state.pointShadowMap,Ut.pointShadowMatrix.value=z.state.pointShadowMatrix),j.currentProgram=kt,j.uniformsList=null,kt}function al(E){if(E.uniformsList===null){const F=E.currentProgram.getUniforms();E.uniformsList=gs.seqWithValue(F.seq,E.uniforms)}return E.uniformsList}function ll(E,F){const q=J.get(E);q.outputColorSpace=F.outputColorSpace,q.batching=F.batching,q.batchingColor=F.batchingColor,q.instancing=F.instancing,q.instancingColor=F.instancingColor,q.instancingMorph=F.instancingMorph,q.skinning=F.skinning,q.morphTargets=F.morphTargets,q.morphNormals=F.morphNormals,q.morphColors=F.morphColors,q.morphTargetsCount=F.morphTargetsCount,q.numClippingPlanes=F.numClippingPlanes,q.numIntersection=F.numClipIntersection,q.vertexAlphas=F.vertexAlphas,q.vertexTangents=F.vertexTangents,q.toneMapping=F.toneMapping}function kh(E,F,q,j,z){F.isScene!==!0&&(F=U),at.resetTextureUnits();const ft=F.fog,Mt=j.isMeshStandardMaterial?F.environment:null,wt=D===null?v.outputColorSpace:D.isXRRenderTarget===!0?D.texture.colorSpace:Xi,bt=(j.isMeshStandardMaterial?Bt:Ht).get(j.envMap||Mt),Ot=j.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,kt=!!q.attributes.tangent&&(!!j.normalMap||j.anisotropy>0),Ut=!!q.morphAttributes.position,Kt=!!q.morphAttributes.normal,ee=!!q.morphAttributes.color;let de=Hn;j.toneMapped&&(D===null||D.isXRRenderTarget===!0)&&(de=v.toneMapping);const le=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,se=le!==void 0?le.length:0,Ft=J.get(j),ce=p.state.lights;if(Gt===!0&&(nt===!0||E!==M)){const we=E===M&&j.id===b;mt.setState(j,E,we)}let Qt=!1;j.version===Ft.__version?(Ft.needsLights&&Ft.lightsStateVersion!==ce.state.version||Ft.outputColorSpace!==wt||z.isBatchedMesh&&Ft.batching===!1||!z.isBatchedMesh&&Ft.batching===!0||z.isBatchedMesh&&Ft.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&Ft.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&Ft.instancing===!1||!z.isInstancedMesh&&Ft.instancing===!0||z.isSkinnedMesh&&Ft.skinning===!1||!z.isSkinnedMesh&&Ft.skinning===!0||z.isInstancedMesh&&Ft.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Ft.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&Ft.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&Ft.instancingMorph===!1&&z.morphTexture!==null||Ft.envMap!==bt||j.fog===!0&&Ft.fog!==ft||Ft.numClippingPlanes!==void 0&&(Ft.numClippingPlanes!==mt.numPlanes||Ft.numIntersection!==mt.numIntersection)||Ft.vertexAlphas!==Ot||Ft.vertexTangents!==kt||Ft.morphTargets!==Ut||Ft.morphNormals!==Kt||Ft.morphColors!==ee||Ft.toneMapping!==de||Ft.morphTargetsCount!==se)&&(Qt=!0):(Qt=!0,Ft.__version=j.version);let Ne=Ft.currentProgram;Qt===!0&&(Ne=Fr(j,F,z));let mi=!1,Fe=!1,Zi=!1;const he=Ne.getUniforms(),Xe=Ft.uniforms;if(V.useProgram(Ne.program)&&(mi=!0,Fe=!0,Zi=!0),j.id!==b&&(b=j.id,Fe=!0),mi||M!==E){V.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),he.setValue(S,"projectionMatrix",E.projectionMatrix),he.setValue(S,"viewMatrix",E.matrixWorldInverse);const Ie=he.map.cameraPosition;Ie!==void 0&&Ie.setValue(S,Et.setFromMatrixPosition(E.matrixWorld)),W.logarithmicDepthBuffer&&he.setValue(S,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(j.isMeshPhongMaterial||j.isMeshToonMaterial||j.isMeshLambertMaterial||j.isMeshBasicMaterial||j.isMeshStandardMaterial||j.isShaderMaterial)&&he.setValue(S,"isOrthographic",E.isOrthographicCamera===!0),M!==E&&(M=E,Fe=!0,Zi=!0)}if(z.isSkinnedMesh){he.setOptional(S,z,"bindMatrix"),he.setOptional(S,z,"bindMatrixInverse");const we=z.skeleton;we&&(we.boneTexture===null&&we.computeBoneTexture(),he.setValue(S,"boneTexture",we.boneTexture,at))}z.isBatchedMesh&&(he.setOptional(S,z,"batchingTexture"),he.setValue(S,"batchingTexture",z._matricesTexture,at),he.setOptional(S,z,"batchingIdTexture"),he.setValue(S,"batchingIdTexture",z._indirectTexture,at),he.setOptional(S,z,"batchingColorTexture"),z._colorsTexture!==null&&he.setValue(S,"batchingColorTexture",z._colorsTexture,at));const $e=q.morphAttributes;if(($e.position!==void 0||$e.normal!==void 0||$e.color!==void 0)&&ht.update(z,q,Ne),(Fe||Ft.receiveShadow!==z.receiveShadow)&&(Ft.receiveShadow=z.receiveShadow,he.setValue(S,"receiveShadow",z.receiveShadow)),j.isMeshGouraudMaterial&&j.envMap!==null&&(Xe.envMap.value=bt,Xe.flipEnvMap.value=bt.isCubeTexture&&bt.isRenderTargetTexture===!1?-1:1),j.isMeshStandardMaterial&&j.envMap===null&&F.environment!==null&&(Xe.envMapIntensity.value=F.environmentIntensity),Fe&&(he.setValue(S,"toneMappingExposure",v.toneMappingExposure),Ft.needsLights&&Hh(Xe,Zi),ft&&j.fog===!0&&lt.refreshFogUniforms(Xe,ft),lt.refreshMaterialUniforms(Xe,j,G,it,p.state.transmissionRenderTarget[E.id]),gs.upload(S,al(Ft),Xe,at)),j.isShaderMaterial&&j.uniformsNeedUpdate===!0&&(gs.upload(S,al(Ft),Xe,at),j.uniformsNeedUpdate=!1),j.isSpriteMaterial&&he.setValue(S,"center",z.center),he.setValue(S,"modelViewMatrix",z.modelViewMatrix),he.setValue(S,"normalMatrix",z.normalMatrix),he.setValue(S,"modelMatrix",z.matrixWorld),j.isShaderMaterial||j.isRawShaderMaterial){const we=j.uniformsGroups;for(let Ie=0,Fs=we.length;Ie<Fs;Ie++){const qn=we[Ie];$t.update(qn,Ne),$t.bind(qn,Ne)}}return Ne}function Hh(E,F){E.ambientLightColor.needsUpdate=F,E.lightProbe.needsUpdate=F,E.directionalLights.needsUpdate=F,E.directionalLightShadows.needsUpdate=F,E.pointLights.needsUpdate=F,E.pointLightShadows.needsUpdate=F,E.spotLights.needsUpdate=F,E.spotLightShadows.needsUpdate=F,E.rectAreaLights.needsUpdate=F,E.hemisphereLights.needsUpdate=F}function Vh(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return P},this.getActiveMipmapLevel=function(){return L},this.getRenderTarget=function(){return D},this.setRenderTargetTextures=function(E,F,q){const j=J.get(E);j.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,j.__autoAllocateDepthBuffer===!1&&(j.__useRenderToTexture=!1),J.get(E.texture).__webglTexture=F,J.get(E.depthTexture).__webglTexture=j.__autoAllocateDepthBuffer?void 0:q,j.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,F){const q=J.get(E);q.__webglFramebuffer=F,q.__useDefaultFramebuffer=F===void 0};const Gh=S.createFramebuffer();this.setRenderTarget=function(E,F=0,q=0){D=E,P=F,L=q;let j=!0,z=null,ft=!1,Mt=!1;if(E){const bt=J.get(E);if(bt.__useDefaultFramebuffer!==void 0)V.bindFramebuffer(S.FRAMEBUFFER,null),j=!1;else if(bt.__webglFramebuffer===void 0)at.setupRenderTarget(E);else if(bt.__hasExternalTextures)at.rebindTextures(E,J.get(E.texture).__webglTexture,J.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Ut=E.depthTexture;if(bt.__boundDepthTexture!==Ut){if(Ut!==null&&J.has(Ut)&&(E.width!==Ut.image.width||E.height!==Ut.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");at.setupDepthRenderbuffer(E)}}const Ot=E.texture;(Ot.isData3DTexture||Ot.isDataArrayTexture||Ot.isCompressedArrayTexture)&&(Mt=!0);const kt=J.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(kt[F])?z=kt[F][q]:z=kt[F],ft=!0):E.samples>0&&at.useMultisampledRTT(E)===!1?z=J.get(E).__webglMultisampledFramebuffer:Array.isArray(kt)?z=kt[q]:z=kt,C.copy(E.viewport),H.copy(E.scissor),X=E.scissorTest}else C.copy(yt).multiplyScalar(G).floor(),H.copy(Nt).multiplyScalar(G).floor(),X=Vt;if(q!==0&&(z=Gh),V.bindFramebuffer(S.FRAMEBUFFER,z)&&j&&V.drawBuffers(E,z),V.viewport(C),V.scissor(H),V.setScissorTest(X),ft){const bt=J.get(E.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_CUBE_MAP_POSITIVE_X+F,bt.__webglTexture,q)}else if(Mt){const bt=F;for(let Ot=0;Ot<E.textures.length;Ot++){const kt=J.get(E.textures[Ot]);S.framebufferTextureLayer(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0+Ot,kt.__webglTexture,q,bt)}}else if(E!==null&&q!==0){const bt=J.get(E.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,bt.__webglTexture,q)}b=-1},this.readRenderTargetPixels=function(E,F,q,j,z,ft,Mt,wt=0){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let bt=J.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&Mt!==void 0&&(bt=bt[Mt]),bt){V.bindFramebuffer(S.FRAMEBUFFER,bt);try{const Ot=E.textures[wt],kt=Ot.format,Ut=Ot.type;if(!W.textureFormatReadable(kt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!W.textureTypeReadable(Ut)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=E.width-j&&q>=0&&q<=E.height-z&&(E.textures.length>1&&S.readBuffer(S.COLOR_ATTACHMENT0+wt),S.readPixels(F,q,j,z,Dt.convert(kt),Dt.convert(Ut),ft))}finally{const Ot=D!==null?J.get(D).__webglFramebuffer:null;V.bindFramebuffer(S.FRAMEBUFFER,Ot)}}},this.readRenderTargetPixelsAsync=async function(E,F,q,j,z,ft,Mt,wt=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let bt=J.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&Mt!==void 0&&(bt=bt[Mt]),bt)if(F>=0&&F<=E.width-j&&q>=0&&q<=E.height-z){V.bindFramebuffer(S.FRAMEBUFFER,bt);const Ot=E.textures[wt],kt=Ot.format,Ut=Ot.type;if(!W.textureFormatReadable(kt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!W.textureTypeReadable(Ut))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Kt=S.createBuffer();S.bindBuffer(S.PIXEL_PACK_BUFFER,Kt),S.bufferData(S.PIXEL_PACK_BUFFER,ft.byteLength,S.STREAM_READ),E.textures.length>1&&S.readBuffer(S.COLOR_ATTACHMENT0+wt),S.readPixels(F,q,j,z,Dt.convert(kt),Dt.convert(Ut),0);const ee=D!==null?J.get(D).__webglFramebuffer:null;V.bindFramebuffer(S.FRAMEBUFFER,ee);const de=S.fenceSync(S.SYNC_GPU_COMMANDS_COMPLETE,0);return S.flush(),await od(S,de,4),S.bindBuffer(S.PIXEL_PACK_BUFFER,Kt),S.getBufferSubData(S.PIXEL_PACK_BUFFER,0,ft),S.deleteBuffer(Kt),S.deleteSync(de),ft}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,F=null,q=0){const j=Math.pow(2,-q),z=Math.floor(E.image.width*j),ft=Math.floor(E.image.height*j),Mt=F!==null?F.x:0,wt=F!==null?F.y:0;at.setTexture2D(E,0),S.copyTexSubImage2D(S.TEXTURE_2D,q,0,0,Mt,wt,z,ft),V.unbindTexture()};const Wh=S.createFramebuffer(),Xh=S.createFramebuffer();this.copyTextureToTexture=function(E,F,q=null,j=null,z=0,ft=null){ft===null&&(z!==0?(br("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ft=z,z=0):ft=0);let Mt,wt,bt,Ot,kt,Ut,Kt,ee,de;const le=E.isCompressedTexture?E.mipmaps[ft]:E.image;if(q!==null)Mt=q.max.x-q.min.x,wt=q.max.y-q.min.y,bt=q.isBox3?q.max.z-q.min.z:1,Ot=q.min.x,kt=q.min.y,Ut=q.isBox3?q.min.z:0;else{const $e=Math.pow(2,-z);Mt=Math.floor(le.width*$e),wt=Math.floor(le.height*$e),E.isDataArrayTexture?bt=le.depth:E.isData3DTexture?bt=Math.floor(le.depth*$e):bt=1,Ot=0,kt=0,Ut=0}j!==null?(Kt=j.x,ee=j.y,de=j.z):(Kt=0,ee=0,de=0);const se=Dt.convert(F.format),Ft=Dt.convert(F.type);let ce;F.isData3DTexture?(at.setTexture3D(F,0),ce=S.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(at.setTexture2DArray(F,0),ce=S.TEXTURE_2D_ARRAY):(at.setTexture2D(F,0),ce=S.TEXTURE_2D),S.pixelStorei(S.UNPACK_FLIP_Y_WEBGL,F.flipY),S.pixelStorei(S.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),S.pixelStorei(S.UNPACK_ALIGNMENT,F.unpackAlignment);const Qt=S.getParameter(S.UNPACK_ROW_LENGTH),Ne=S.getParameter(S.UNPACK_IMAGE_HEIGHT),mi=S.getParameter(S.UNPACK_SKIP_PIXELS),Fe=S.getParameter(S.UNPACK_SKIP_ROWS),Zi=S.getParameter(S.UNPACK_SKIP_IMAGES);S.pixelStorei(S.UNPACK_ROW_LENGTH,le.width),S.pixelStorei(S.UNPACK_IMAGE_HEIGHT,le.height),S.pixelStorei(S.UNPACK_SKIP_PIXELS,Ot),S.pixelStorei(S.UNPACK_SKIP_ROWS,kt),S.pixelStorei(S.UNPACK_SKIP_IMAGES,Ut);const he=E.isDataArrayTexture||E.isData3DTexture,Xe=F.isDataArrayTexture||F.isData3DTexture;if(E.isDepthTexture){const $e=J.get(E),we=J.get(F),Ie=J.get($e.__renderTarget),Fs=J.get(we.__renderTarget);V.bindFramebuffer(S.READ_FRAMEBUFFER,Ie.__webglFramebuffer),V.bindFramebuffer(S.DRAW_FRAMEBUFFER,Fs.__webglFramebuffer);for(let qn=0;qn<bt;qn++)he&&(S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,J.get(E).__webglTexture,z,Ut+qn),S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,J.get(F).__webglTexture,ft,de+qn)),S.blitFramebuffer(Ot,kt,Mt,wt,Kt,ee,Mt,wt,S.DEPTH_BUFFER_BIT,S.NEAREST);V.bindFramebuffer(S.READ_FRAMEBUFFER,null),V.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(z!==0||E.isRenderTargetTexture||J.has(E)){const $e=J.get(E),we=J.get(F);V.bindFramebuffer(S.READ_FRAMEBUFFER,Wh),V.bindFramebuffer(S.DRAW_FRAMEBUFFER,Xh);for(let Ie=0;Ie<bt;Ie++)he?S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,$e.__webglTexture,z,Ut+Ie):S.framebufferTexture2D(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,$e.__webglTexture,z),Xe?S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,we.__webglTexture,ft,de+Ie):S.framebufferTexture2D(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,we.__webglTexture,ft),z!==0?S.blitFramebuffer(Ot,kt,Mt,wt,Kt,ee,Mt,wt,S.COLOR_BUFFER_BIT,S.NEAREST):Xe?S.copyTexSubImage3D(ce,ft,Kt,ee,de+Ie,Ot,kt,Mt,wt):S.copyTexSubImage2D(ce,ft,Kt,ee,Ot,kt,Mt,wt);V.bindFramebuffer(S.READ_FRAMEBUFFER,null),V.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else Xe?E.isDataTexture||E.isData3DTexture?S.texSubImage3D(ce,ft,Kt,ee,de,Mt,wt,bt,se,Ft,le.data):F.isCompressedArrayTexture?S.compressedTexSubImage3D(ce,ft,Kt,ee,de,Mt,wt,bt,se,le.data):S.texSubImage3D(ce,ft,Kt,ee,de,Mt,wt,bt,se,Ft,le):E.isDataTexture?S.texSubImage2D(S.TEXTURE_2D,ft,Kt,ee,Mt,wt,se,Ft,le.data):E.isCompressedTexture?S.compressedTexSubImage2D(S.TEXTURE_2D,ft,Kt,ee,le.width,le.height,se,le.data):S.texSubImage2D(S.TEXTURE_2D,ft,Kt,ee,Mt,wt,se,Ft,le);S.pixelStorei(S.UNPACK_ROW_LENGTH,Qt),S.pixelStorei(S.UNPACK_IMAGE_HEIGHT,Ne),S.pixelStorei(S.UNPACK_SKIP_PIXELS,mi),S.pixelStorei(S.UNPACK_SKIP_ROWS,Fe),S.pixelStorei(S.UNPACK_SKIP_IMAGES,Zi),ft===0&&F.generateMipmaps&&S.generateMipmap(ce),V.unbindTexture()},this.initRenderTarget=function(E){J.get(E).__webglFramebuffer===void 0&&at.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?at.setTextureCube(E,0):E.isData3DTexture?at.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?at.setTexture2DArray(E,0):at.setTexture2D(E,0),V.unbindTexture()},this.resetState=function(){P=0,L=0,D=null,V.reset(),xt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=Jt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Jt._getUnpackColorSpace()}}class Xn{constructor(t,e){this.next=null,this.key=t,this.data=e,this.left=null,this.right=null}}function l0(i,t){return i>t?1:i<t?-1:0}function Bn(i,t,e){const n=new Xn(null,null);let r=n,s=n;for(;;){const o=e(i,t.key);if(o<0){if(t.left===null)break;if(e(i,t.left.key)<0){const a=t.left;if(t.left=a.right,a.right=t,t=a,t.left===null)break}s.left=t,s=t,t=t.left}else if(o>0){if(t.right===null)break;if(e(i,t.right.key)>0){const a=t.right;if(t.right=a.left,a.left=t,t=a,t.right===null)break}r.right=t,r=t,t=t.right}else break}return r.right=t.left,s.left=t.right,t.left=n.right,t.right=n.left,t}function yo(i,t,e,n){const r=new Xn(i,t);if(e===null)return r.left=r.right=null,r;e=Bn(i,e,n);const s=n(i,e.key);return s<0?(r.left=e.left,r.right=e,e.left=null):s>=0&&(r.right=e.right,r.left=e,e.right=null),r}function _c(i,t,e){let n=null,r=null;if(t){t=Bn(i,t,e);const s=e(t.key,i);s===0?(n=t.left,r=t.right):s<0?(r=t.right,t.right=null,n=t):(n=t.left,t.left=null,r=t)}return{left:n,right:r}}function c0(i,t,e){return t===null?i:(i===null||(t=Bn(i.key,t,e),t.left=i),t)}function Sa(i,t,e,n,r){if(i){n(`${t}${e?"└── ":"├── "}${r(i)}
`);const s=t+(e?"    ":"│   ");i.left&&Sa(i.left,s,!1,n,r),i.right&&Sa(i.right,s,!0,n,r)}}class Ja{constructor(t=l0){this._root=null,this._size=0,this._comparator=t}insert(t,e){return this._size++,this._root=yo(t,e,this._root,this._comparator)}add(t,e){const n=new Xn(t,e);this._root===null&&(n.left=n.right=null,this._size++,this._root=n);const r=this._comparator,s=Bn(t,this._root,r),o=r(t,s.key);return o===0?this._root=s:(o<0?(n.left=s.left,n.right=s,s.left=null):o>0&&(n.right=s.right,n.left=s,s.right=null),this._size++,this._root=n),this._root}remove(t){this._root=this._remove(t,this._root,this._comparator)}_remove(t,e,n){let r;return e===null?null:(e=Bn(t,e,n),n(t,e.key)===0?(e.left===null?r=e.right:(r=Bn(t,e.left,n),r.right=e.right),this._size--,r):e)}pop(){let t=this._root;if(t){for(;t.left;)t=t.left;return this._root=Bn(t.key,this._root,this._comparator),this._root=this._remove(t.key,this._root,this._comparator),{key:t.key,data:t.data}}return null}findStatic(t){let e=this._root;const n=this._comparator;for(;e;){const r=n(t,e.key);if(r===0)return e;r<0?e=e.left:e=e.right}return null}find(t){return this._root&&(this._root=Bn(t,this._root,this._comparator),this._comparator(t,this._root.key)!==0)?null:this._root}contains(t){let e=this._root;const n=this._comparator;for(;e;){const r=n(t,e.key);if(r===0)return!0;r<0?e=e.left:e=e.right}return!1}forEach(t,e){let n=this._root;const r=[];let s=!1;for(;!s;)n!==null?(r.push(n),n=n.left):r.length!==0?(n=r.pop(),t.call(e,n),n=n.right):s=!0;return this}range(t,e,n,r){const s=[],o=this._comparator;let a=this._root,l;for(;s.length!==0||a;)if(a)s.push(a),a=a.left;else{if(a=s.pop(),l=o(a.key,e),l>0)break;if(o(a.key,t)>=0&&n.call(r,a))return this;a=a.right}return this}keys(){const t=[];return this.forEach(({key:e})=>{t.push(e)}),t}values(){const t=[];return this.forEach(({data:e})=>{t.push(e)}),t}min(){return this._root?this.minNode(this._root).key:null}max(){return this._root?this.maxNode(this._root).key:null}minNode(t=this._root){if(t)for(;t.left;)t=t.left;return t}maxNode(t=this._root){if(t)for(;t.right;)t=t.right;return t}at(t){let e=this._root,n=!1,r=0;const s=[];for(;!n;)if(e)s.push(e),e=e.left;else if(s.length>0){if(e=s.pop(),r===t)return e;r++,e=e.right}else n=!0;return null}next(t){let e=this._root,n=null;if(t.right){for(n=t.right;n.left;)n=n.left;return n}const r=this._comparator;for(;e;){const s=r(t.key,e.key);if(s===0)break;s<0?(n=e,e=e.left):e=e.right}return n}prev(t){let e=this._root,n=null;if(t.left!==null){for(n=t.left;n.right;)n=n.right;return n}const r=this._comparator;for(;e;){const s=r(t.key,e.key);if(s===0)break;s<0?e=e.left:(n=e,e=e.right)}return n}clear(){return this._root=null,this._size=0,this}toList(){return u0(this._root)}load(t,e=[],n=!1){let r=t.length;const s=this._comparator;if(n&&Ta(t,e,0,r-1,s),this._root===null)this._root=Ea(t,e,0,r),this._size=r;else{const o=d0(this.toList(),h0(t,e),s);r=this._size+r,this._root=ba({head:o},0,r)}return this}isEmpty(){return this._root===null}get size(){return this._size}get root(){return this._root}toString(t=e=>String(e.key)){const e=[];return Sa(this._root,"",!0,n=>e.push(n),t),e.join("")}update(t,e,n){const r=this._comparator;let{left:s,right:o}=_c(t,this._root,r);r(t,e)<0?o=yo(e,n,o,r):s=yo(e,n,s,r),this._root=c0(s,o,r)}split(t){return _c(t,this._root,this._comparator)}*[Symbol.iterator](){let t=this._root;const e=[];let n=!1;for(;!n;)t!==null?(e.push(t),t=t.left):e.length!==0?(t=e.pop(),yield t,t=t.right):n=!0}}function Ea(i,t,e,n){const r=n-e;if(r>0){const s=e+Math.floor(r/2),o=i[s],a=t[s],l=new Xn(o,a);return l.left=Ea(i,t,e,s),l.right=Ea(i,t,s+1,n),l}return null}function h0(i,t){const e=new Xn(null,null);let n=e;for(let r=0;r<i.length;r++)n=n.next=new Xn(i[r],t[r]);return n.next=null,e.next}function u0(i){let t=i;const e=[];let n=!1;const r=new Xn(null,null);let s=r;for(;!n;)t?(e.push(t),t=t.left):e.length>0?(t=s=s.next=e.pop(),t=t.right):n=!0;return s.next=null,r.next}function ba(i,t,e){const n=e-t;if(n>0){const r=t+Math.floor(n/2),s=ba(i,t,r),o=i.head;return o.left=s,i.head=i.head.next,o.right=ba(i,r+1,e),o}return null}function d0(i,t,e){const n=new Xn(null,null);let r=n,s=i,o=t;for(;s!==null&&o!==null;)e(s.key,o.key)<0?(r.next=s,s=s.next):(r.next=o,o=o.next),r=r.next;return s!==null?r.next=s:o!==null&&(r.next=o),n.next}function Ta(i,t,e,n,r){if(e>=n)return;const s=i[e+n>>1];let o=e-1,a=n+1;for(;;){do o++;while(r(i[o],s)<0);do a--;while(r(i[a],s)>0);if(o>=a)break;let l=i[o];i[o]=i[a],i[a]=l,l=t[o],t[o]=t[a],t[a]=l}Ta(i,t,e,a,r),Ta(i,t,a+1,n,r)}const An=11102230246251565e-32,Te=134217729,f0=(3+8*An)*An;function Mo(i,t,e,n,r){let s,o,a,l,c=t[0],u=n[0],h=0,d=0;u>c==u>-c?(s=c,c=t[++h]):(s=u,u=n[++d]);let f=0;if(h<i&&d<e)for(u>c==u>-c?(o=c+s,a=s-(o-c),c=t[++h]):(o=u+s,a=s-(o-u),u=n[++d]),s=o,a!==0&&(r[f++]=a);h<i&&d<e;)u>c==u>-c?(o=s+c,l=o-s,a=s-(o-l)+(c-l),c=t[++h]):(o=s+u,l=o-s,a=s-(o-l)+(u-l),u=n[++d]),s=o,a!==0&&(r[f++]=a);for(;h<i;)o=s+c,l=o-s,a=s-(o-l)+(c-l),c=t[++h],s=o,a!==0&&(r[f++]=a);for(;d<e;)o=s+u,l=o-s,a=s-(o-l)+(u-l),u=n[++d],s=o,a!==0&&(r[f++]=a);return(s!==0||f===0)&&(r[f++]=s),f}function p0(i,t){let e=t[0];for(let n=1;n<i;n++)e+=t[n];return e}function Dr(i){return new Float64Array(i)}const m0=(3+16*An)*An,g0=(2+12*An)*An,_0=(9+64*An)*An*An,Di=Dr(4),vc=Dr(8),xc=Dr(12),yc=Dr(16),Ae=Dr(4);function v0(i,t,e,n,r,s,o){let a,l,c,u,h,d,f,g,_,m,p,T,y,v,A,P,L,D;const b=i-r,M=e-r,C=t-s,H=n-s;v=b*H,d=Te*b,f=d-(d-b),g=b-f,d=Te*H,_=d-(d-H),m=H-_,A=g*m-(v-f*_-g*_-f*m),P=C*M,d=Te*C,f=d-(d-C),g=C-f,d=Te*M,_=d-(d-M),m=M-_,L=g*m-(P-f*_-g*_-f*m),p=A-L,h=A-p,Di[0]=A-(p+h)+(h-L),T=v+p,h=T-v,y=v-(T-h)+(p-h),p=y-P,h=y-p,Di[1]=y-(p+h)+(h-P),D=T+p,h=D-T,Di[2]=T-(D-h)+(p-h),Di[3]=D;let X=p0(4,Di),et=g0*o;if(X>=et||-X>=et||(h=i-b,a=i-(b+h)+(h-r),h=e-M,c=e-(M+h)+(h-r),h=t-C,l=t-(C+h)+(h-s),h=n-H,u=n-(H+h)+(h-s),a===0&&l===0&&c===0&&u===0)||(et=_0*o+f0*Math.abs(X),X+=b*u+H*a-(C*c+M*l),X>=et||-X>=et))return X;v=a*H,d=Te*a,f=d-(d-a),g=a-f,d=Te*H,_=d-(d-H),m=H-_,A=g*m-(v-f*_-g*_-f*m),P=l*M,d=Te*l,f=d-(d-l),g=l-f,d=Te*M,_=d-(d-M),m=M-_,L=g*m-(P-f*_-g*_-f*m),p=A-L,h=A-p,Ae[0]=A-(p+h)+(h-L),T=v+p,h=T-v,y=v-(T-h)+(p-h),p=y-P,h=y-p,Ae[1]=y-(p+h)+(h-P),D=T+p,h=D-T,Ae[2]=T-(D-h)+(p-h),Ae[3]=D;const $=Mo(4,Di,4,Ae,vc);v=b*u,d=Te*b,f=d-(d-b),g=b-f,d=Te*u,_=d-(d-u),m=u-_,A=g*m-(v-f*_-g*_-f*m),P=C*c,d=Te*C,f=d-(d-C),g=C-f,d=Te*c,_=d-(d-c),m=c-_,L=g*m-(P-f*_-g*_-f*m),p=A-L,h=A-p,Ae[0]=A-(p+h)+(h-L),T=v+p,h=T-v,y=v-(T-h)+(p-h),p=y-P,h=y-p,Ae[1]=y-(p+h)+(h-P),D=T+p,h=D-T,Ae[2]=T-(D-h)+(p-h),Ae[3]=D;const Z=Mo($,vc,4,Ae,xc);v=a*u,d=Te*a,f=d-(d-a),g=a-f,d=Te*u,_=d-(d-u),m=u-_,A=g*m-(v-f*_-g*_-f*m),P=l*c,d=Te*l,f=d-(d-l),g=l-f,d=Te*c,_=d-(d-c),m=c-_,L=g*m-(P-f*_-g*_-f*m),p=A-L,h=A-p,Ae[0]=A-(p+h)+(h-L),T=v+p,h=T-v,y=v-(T-h)+(p-h),p=y-P,h=y-p,Ae[1]=y-(p+h)+(h-P),D=T+p,h=D-T,Ae[2]=T-(D-h)+(p-h),Ae[3]=D;const it=Mo(Z,xc,4,Ae,yc);return yc[it-1]}function x0(i,t,e,n,r,s){const o=(t-s)*(e-r),a=(i-r)*(n-s),l=o-a,c=Math.abs(o+a);return Math.abs(l)>=m0*c?l:-v0(i,t,e,n,r,s,c)}var Dh={};const rr=(i,t)=>i.ll.x<=t.x&&t.x<=i.ur.x&&i.ll.y<=t.y&&t.y<=i.ur.y,wa=(i,t)=>{if(t.ur.x<i.ll.x||i.ur.x<t.ll.x||t.ur.y<i.ll.y||i.ur.y<t.ll.y)return null;const e=i.ll.x<t.ll.x?t.ll.x:i.ll.x,n=i.ur.x<t.ur.x?i.ur.x:t.ur.x,r=i.ll.y<t.ll.y?t.ll.y:i.ll.y,s=i.ur.y<t.ur.y?i.ur.y:t.ur.y;return{ll:{x:e,y:r},ur:{x:n,y:s}}};let zn=Number.EPSILON;zn===void 0&&(zn=Math.pow(2,-52));const y0=zn*zn,Mc=(i,t)=>{if(-zn<i&&i<zn&&-zn<t&&t<zn)return 0;const e=i-t;return e*e<y0*i*t?0:i<t?-1:1};class M0{constructor(){this.reset()}reset(){this.xRounder=new Sc,this.yRounder=new Sc}round(t,e){return{x:this.xRounder.round(t),y:this.yRounder.round(e)}}}class Sc{constructor(){this.tree=new Ja,this.round(0)}round(t){const e=this.tree.add(t),n=this.tree.prev(e);if(n!==null&&Mc(e.key,n.key)===0)return this.tree.remove(t),n.key;const r=this.tree.next(e);return r!==null&&Mc(e.key,r.key)===0?(this.tree.remove(t),r.key):t}}const Rr=new M0,_s=(i,t)=>i.x*t.y-i.y*t.x,Ih=(i,t)=>i.x*t.x+i.y*t.y,Ec=(i,t,e)=>{const n=x0(i.x,i.y,t.x,t.y,e.x,e.y);return n>0?-1:n<0?1:0},ws=i=>Math.sqrt(Ih(i,i)),S0=(i,t,e)=>{const n={x:t.x-i.x,y:t.y-i.y},r={x:e.x-i.x,y:e.y-i.y};return _s(r,n)/ws(r)/ws(n)},E0=(i,t,e)=>{const n={x:t.x-i.x,y:t.y-i.y},r={x:e.x-i.x,y:e.y-i.y};return Ih(r,n)/ws(r)/ws(n)},bc=(i,t,e)=>t.y===0?null:{x:i.x+t.x/t.y*(e-i.y),y:e},Tc=(i,t,e)=>t.x===0?null:{x:e,y:i.y+t.y/t.x*(e-i.x)},b0=(i,t,e,n)=>{if(t.x===0)return Tc(e,n,i.x);if(n.x===0)return Tc(i,t,e.x);if(t.y===0)return bc(e,n,i.y);if(n.y===0)return bc(i,t,e.y);const r=_s(t,n);if(r==0)return null;const s={x:e.x-i.x,y:e.y-i.y},o=_s(s,t)/r,a=_s(s,n)/r,l=i.x+a*t.x,c=e.x+o*n.x,u=i.y+a*t.y,h=e.y+o*n.y,d=(l+c)/2,f=(u+h)/2;return{x:d,y:f}};class je{static compare(t,e){const n=je.comparePoints(t.point,e.point);return n!==0?n:(t.point!==e.point&&t.link(e),t.isLeft!==e.isLeft?t.isLeft?1:-1:Vn.compare(t.segment,e.segment))}static comparePoints(t,e){return t.x<e.x?-1:t.x>e.x?1:t.y<e.y?-1:t.y>e.y?1:0}constructor(t,e){t.events===void 0?t.events=[this]:t.events.push(this),this.point=t,this.isLeft=e}link(t){if(t.point===this.point)throw new Error("Tried to link already linked events");const e=t.point.events;for(let n=0,r=e.length;n<r;n++){const s=e[n];this.point.events.push(s),s.point=this.point}this.checkForConsuming()}checkForConsuming(){const t=this.point.events.length;for(let e=0;e<t;e++){const n=this.point.events[e];if(n.segment.consumedBy===void 0)for(let r=e+1;r<t;r++){const s=this.point.events[r];s.consumedBy===void 0&&n.otherSE.point.events===s.otherSE.point.events&&n.segment.consume(s.segment)}}}getAvailableLinkedEvents(){const t=[];for(let e=0,n=this.point.events.length;e<n;e++){const r=this.point.events[e];r!==this&&!r.segment.ringOut&&r.segment.isInResult()&&t.push(r)}return t}getLeftmostComparator(t){const e=new Map,n=r=>{const s=r.otherSE;e.set(r,{sine:S0(this.point,t.point,s.point),cosine:E0(this.point,t.point,s.point)})};return(r,s)=>{e.has(r)||n(r),e.has(s)||n(s);const{sine:o,cosine:a}=e.get(r),{sine:l,cosine:c}=e.get(s);return o>=0&&l>=0?a<c?1:a>c?-1:0:o<0&&l<0?a<c?-1:a>c?1:0:l<o?-1:l>o?1:0}}}let T0=0;class Vn{static compare(t,e){const n=t.leftSE.point.x,r=e.leftSE.point.x,s=t.rightSE.point.x,o=e.rightSE.point.x;if(o<n)return 1;if(s<r)return-1;const a=t.leftSE.point.y,l=e.leftSE.point.y,c=t.rightSE.point.y,u=e.rightSE.point.y;if(n<r){if(l<a&&l<c)return 1;if(l>a&&l>c)return-1;const h=t.comparePoint(e.leftSE.point);if(h<0)return 1;if(h>0)return-1;const d=e.comparePoint(t.rightSE.point);return d!==0?d:-1}if(n>r){if(a<l&&a<u)return-1;if(a>l&&a>u)return 1;const h=e.comparePoint(t.leftSE.point);if(h!==0)return h;const d=t.comparePoint(e.rightSE.point);return d<0?1:d>0?-1:1}if(a<l)return-1;if(a>l)return 1;if(s<o){const h=e.comparePoint(t.rightSE.point);if(h!==0)return h}if(s>o){const h=t.comparePoint(e.rightSE.point);if(h<0)return 1;if(h>0)return-1}if(s!==o){const h=c-a,d=s-n,f=u-l,g=o-r;if(h>d&&f<g)return 1;if(h<d&&f>g)return-1}return s>o?1:s<o||c<u?-1:c>u?1:t.id<e.id?-1:t.id>e.id?1:0}constructor(t,e,n,r){this.id=++T0,this.leftSE=t,t.segment=this,t.otherSE=e,this.rightSE=e,e.segment=this,e.otherSE=t,this.rings=n,this.windings=r}static fromRing(t,e,n){let r,s,o;const a=je.comparePoints(t,e);if(a<0)r=t,s=e,o=1;else if(a>0)r=e,s=t,o=-1;else throw new Error(`Tried to create degenerate segment at [${t.x}, ${t.y}]`);const l=new je(r,!0),c=new je(s,!1);return new Vn(l,c,[n],[o])}replaceRightSE(t){this.rightSE=t,this.rightSE.segment=this,this.rightSE.otherSE=this.leftSE,this.leftSE.otherSE=this.rightSE}bbox(){const t=this.leftSE.point.y,e=this.rightSE.point.y;return{ll:{x:this.leftSE.point.x,y:t<e?t:e},ur:{x:this.rightSE.point.x,y:t>e?t:e}}}vector(){return{x:this.rightSE.point.x-this.leftSE.point.x,y:this.rightSE.point.y-this.leftSE.point.y}}isAnEndpoint(t){return t.x===this.leftSE.point.x&&t.y===this.leftSE.point.y||t.x===this.rightSE.point.x&&t.y===this.rightSE.point.y}comparePoint(t){if(this.isAnEndpoint(t))return 0;const e=this.leftSE.point,n=this.rightSE.point,r=this.vector();if(e.x===n.x)return t.x===e.x?0:t.x<e.x?1:-1;const s=(t.y-e.y)/r.y,o=e.x+s*r.x;if(t.x===o)return 0;const a=(t.x-e.x)/r.x,l=e.y+a*r.y;return t.y===l?0:t.y<l?-1:1}getIntersection(t){const e=this.bbox(),n=t.bbox(),r=wa(e,n);if(r===null)return null;const s=this.leftSE.point,o=this.rightSE.point,a=t.leftSE.point,l=t.rightSE.point,c=rr(e,a)&&this.comparePoint(a)===0,u=rr(n,s)&&t.comparePoint(s)===0,h=rr(e,l)&&this.comparePoint(l)===0,d=rr(n,o)&&t.comparePoint(o)===0;if(u&&c)return d&&!h?o:!d&&h?l:null;if(u)return h&&s.x===l.x&&s.y===l.y?null:s;if(c)return d&&o.x===a.x&&o.y===a.y?null:a;if(d&&h)return null;if(d)return o;if(h)return l;const f=b0(s,this.vector(),a,t.vector());return f===null||!rr(r,f)?null:Rr.round(f.x,f.y)}split(t){const e=[],n=t.events!==void 0,r=new je(t,!0),s=new je(t,!1),o=this.rightSE;this.replaceRightSE(s),e.push(s),e.push(r);const a=new Vn(r,o,this.rings.slice(),this.windings.slice());return je.comparePoints(a.leftSE.point,a.rightSE.point)>0&&a.swapEvents(),je.comparePoints(this.leftSE.point,this.rightSE.point)>0&&this.swapEvents(),n&&(r.checkForConsuming(),s.checkForConsuming()),e}swapEvents(){const t=this.rightSE;this.rightSE=this.leftSE,this.leftSE=t,this.leftSE.isLeft=!0,this.rightSE.isLeft=!1;for(let e=0,n=this.windings.length;e<n;e++)this.windings[e]*=-1}consume(t){let e=this,n=t;for(;e.consumedBy;)e=e.consumedBy;for(;n.consumedBy;)n=n.consumedBy;const r=Vn.compare(e,n);if(r!==0){if(r>0){const s=e;e=n,n=s}if(e.prev===n){const s=e;e=n,n=s}for(let s=0,o=n.rings.length;s<o;s++){const a=n.rings[s],l=n.windings[s],c=e.rings.indexOf(a);c===-1?(e.rings.push(a),e.windings.push(l)):e.windings[c]+=l}n.rings=null,n.windings=null,n.consumedBy=e,n.leftSE.consumedBy=e.leftSE,n.rightSE.consumedBy=e.rightSE}}prevInResult(){return this._prevInResult!==void 0?this._prevInResult:(this.prev?this.prev.isInResult()?this._prevInResult=this.prev:this._prevInResult=this.prev.prevInResult():this._prevInResult=null,this._prevInResult)}beforeState(){if(this._beforeState!==void 0)return this._beforeState;if(!this.prev)this._beforeState={rings:[],windings:[],multiPolys:[]};else{const t=this.prev.consumedBy||this.prev;this._beforeState=t.afterState()}return this._beforeState}afterState(){if(this._afterState!==void 0)return this._afterState;const t=this.beforeState();this._afterState={rings:t.rings.slice(0),windings:t.windings.slice(0),multiPolys:[]};const e=this._afterState.rings,n=this._afterState.windings,r=this._afterState.multiPolys;for(let a=0,l=this.rings.length;a<l;a++){const c=this.rings[a],u=this.windings[a],h=e.indexOf(c);h===-1?(e.push(c),n.push(u)):n[h]+=u}const s=[],o=[];for(let a=0,l=e.length;a<l;a++){if(n[a]===0)continue;const c=e[a],u=c.poly;if(o.indexOf(u)===-1)if(c.isExterior)s.push(u);else{o.indexOf(u)===-1&&o.push(u);const h=s.indexOf(c.poly);h!==-1&&s.splice(h,1)}}for(let a=0,l=s.length;a<l;a++){const c=s[a].multiPoly;r.indexOf(c)===-1&&r.push(c)}return this._afterState}isInResult(){if(this.consumedBy)return!1;if(this._isInResult!==void 0)return this._isInResult;const t=this.beforeState().multiPolys,e=this.afterState().multiPolys;switch(sn.type){case"union":{const n=t.length===0,r=e.length===0;this._isInResult=n!==r;break}case"intersection":{let n,r;t.length<e.length?(n=t.length,r=e.length):(n=e.length,r=t.length),this._isInResult=r===sn.numMultiPolys&&n<r;break}case"xor":{const n=Math.abs(t.length-e.length);this._isInResult=n%2===1;break}case"difference":{const n=r=>r.length===1&&r[0].isSubject;this._isInResult=n(t)!==n(e);break}default:throw new Error(`Unrecognized operation type found ${sn.type}`)}return this._isInResult}}class wc{constructor(t,e,n){if(!Array.isArray(t)||t.length===0)throw new Error("Input geometry is not a valid Polygon or MultiPolygon");if(this.poly=e,this.isExterior=n,this.segments=[],typeof t[0][0]!="number"||typeof t[0][1]!="number")throw new Error("Input geometry is not a valid Polygon or MultiPolygon");const r=Rr.round(t[0][0],t[0][1]);this.bbox={ll:{x:r.x,y:r.y},ur:{x:r.x,y:r.y}};let s=r;for(let o=1,a=t.length;o<a;o++){if(typeof t[o][0]!="number"||typeof t[o][1]!="number")throw new Error("Input geometry is not a valid Polygon or MultiPolygon");let l=Rr.round(t[o][0],t[o][1]);l.x===s.x&&l.y===s.y||(this.segments.push(Vn.fromRing(s,l,this)),l.x<this.bbox.ll.x&&(this.bbox.ll.x=l.x),l.y<this.bbox.ll.y&&(this.bbox.ll.y=l.y),l.x>this.bbox.ur.x&&(this.bbox.ur.x=l.x),l.y>this.bbox.ur.y&&(this.bbox.ur.y=l.y),s=l)}(r.x!==s.x||r.y!==s.y)&&this.segments.push(Vn.fromRing(s,r,this))}getSweepEvents(){const t=[];for(let e=0,n=this.segments.length;e<n;e++){const r=this.segments[e];t.push(r.leftSE),t.push(r.rightSE)}return t}}class w0{constructor(t,e){if(!Array.isArray(t))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");this.exteriorRing=new wc(t[0],this,!0),this.bbox={ll:{x:this.exteriorRing.bbox.ll.x,y:this.exteriorRing.bbox.ll.y},ur:{x:this.exteriorRing.bbox.ur.x,y:this.exteriorRing.bbox.ur.y}},this.interiorRings=[];for(let n=1,r=t.length;n<r;n++){const s=new wc(t[n],this,!1);s.bbox.ll.x<this.bbox.ll.x&&(this.bbox.ll.x=s.bbox.ll.x),s.bbox.ll.y<this.bbox.ll.y&&(this.bbox.ll.y=s.bbox.ll.y),s.bbox.ur.x>this.bbox.ur.x&&(this.bbox.ur.x=s.bbox.ur.x),s.bbox.ur.y>this.bbox.ur.y&&(this.bbox.ur.y=s.bbox.ur.y),this.interiorRings.push(s)}this.multiPoly=e}getSweepEvents(){const t=this.exteriorRing.getSweepEvents();for(let e=0,n=this.interiorRings.length;e<n;e++){const r=this.interiorRings[e].getSweepEvents();for(let s=0,o=r.length;s<o;s++)t.push(r[s])}return t}}class Ac{constructor(t,e){if(!Array.isArray(t))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");try{typeof t[0][0][0]=="number"&&(t=[t])}catch{}this.polys=[],this.bbox={ll:{x:Number.POSITIVE_INFINITY,y:Number.POSITIVE_INFINITY},ur:{x:Number.NEGATIVE_INFINITY,y:Number.NEGATIVE_INFINITY}};for(let n=0,r=t.length;n<r;n++){const s=new w0(t[n],this);s.bbox.ll.x<this.bbox.ll.x&&(this.bbox.ll.x=s.bbox.ll.x),s.bbox.ll.y<this.bbox.ll.y&&(this.bbox.ll.y=s.bbox.ll.y),s.bbox.ur.x>this.bbox.ur.x&&(this.bbox.ur.x=s.bbox.ur.x),s.bbox.ur.y>this.bbox.ur.y&&(this.bbox.ur.y=s.bbox.ur.y),this.polys.push(s)}this.isSubject=e}getSweepEvents(){const t=[];for(let e=0,n=this.polys.length;e<n;e++){const r=this.polys[e].getSweepEvents();for(let s=0,o=r.length;s<o;s++)t.push(r[s])}return t}}class As{static factory(t){const e=[];for(let n=0,r=t.length;n<r;n++){const s=t[n];if(!s.isInResult()||s.ringOut)continue;let o=null,a=s.leftSE,l=s.rightSE;const c=[a],u=a.point,h=[];for(;o=a,a=l,c.push(a),a.point!==u;)for(;;){const d=a.getAvailableLinkedEvents();if(d.length===0){const _=c[0].point,m=c[c.length-1].point;throw new Error(`Unable to complete output ring starting at [${_.x}, ${_.y}]. Last matching segment found ends at [${m.x}, ${m.y}].`)}if(d.length===1){l=d[0].otherSE;break}let f=null;for(let _=0,m=h.length;_<m;_++)if(h[_].point===a.point){f=_;break}if(f!==null){const _=h.splice(f)[0],m=c.splice(_.index);m.unshift(m[0].otherSE),e.push(new As(m.reverse()));continue}h.push({index:c.length,point:a.point});const g=a.getLeftmostComparator(o);l=d.sort(g)[0].otherSE;break}e.push(new As(c))}return e}constructor(t){this.events=t;for(let e=0,n=t.length;e<n;e++)t[e].segment.ringOut=this;this.poly=null}getGeom(){let t=this.events[0].point;const e=[t];for(let c=1,u=this.events.length-1;c<u;c++){const h=this.events[c].point,d=this.events[c+1].point;Ec(h,t,d)!==0&&(e.push(h),t=h)}if(e.length===1)return null;const n=e[0],r=e[1];Ec(n,t,r)===0&&e.shift(),e.push(e[0]);const s=this.isExteriorRing()?1:-1,o=this.isExteriorRing()?0:e.length-1,a=this.isExteriorRing()?e.length:-1,l=[];for(let c=o;c!=a;c+=s)l.push([e[c].x,e[c].y]);return l}isExteriorRing(){if(this._isExteriorRing===void 0){const t=this.enclosingRing();this._isExteriorRing=t?!t.isExteriorRing():!0}return this._isExteriorRing}enclosingRing(){return this._enclosingRing===void 0&&(this._enclosingRing=this._calcEnclosingRing()),this._enclosingRing}_calcEnclosingRing(){let t=this.events[0];for(let r=1,s=this.events.length;r<s;r++){const o=this.events[r];je.compare(t,o)>0&&(t=o)}let e=t.segment.prevInResult(),n=e?e.prevInResult():null;for(;;){if(!e)return null;if(!n)return e.ringOut;if(n.ringOut!==e.ringOut)return n.ringOut.enclosingRing()!==e.ringOut?e.ringOut:e.ringOut.enclosingRing();e=n.prevInResult(),n=e?e.prevInResult():null}}}class Rc{constructor(t){this.exteriorRing=t,t.poly=this,this.interiorRings=[]}addInterior(t){this.interiorRings.push(t),t.poly=this}getGeom(){const t=[this.exteriorRing.getGeom()];if(t[0]===null)return null;for(let e=0,n=this.interiorRings.length;e<n;e++){const r=this.interiorRings[e].getGeom();r!==null&&t.push(r)}return t}}class A0{constructor(t){this.rings=t,this.polys=this._composePolys(t)}getGeom(){const t=[];for(let e=0,n=this.polys.length;e<n;e++){const r=this.polys[e].getGeom();r!==null&&t.push(r)}return t}_composePolys(t){const e=[];for(let n=0,r=t.length;n<r;n++){const s=t[n];if(!s.poly)if(s.isExteriorRing())e.push(new Rc(s));else{const o=s.enclosingRing();o.poly||e.push(new Rc(o)),o.poly.addInterior(s)}}return e}}class R0{constructor(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Vn.compare;this.queue=t,this.tree=new Ja(e),this.segments=[]}process(t){const e=t.segment,n=[];if(t.consumedBy)return t.isLeft?this.queue.remove(t.otherSE):this.tree.remove(e),n;const r=t.isLeft?this.tree.add(e):this.tree.find(e);if(!r)throw new Error(`Unable to find segment #${e.id} [${e.leftSE.point.x}, ${e.leftSE.point.y}] -> [${e.rightSE.point.x}, ${e.rightSE.point.y}] in SweepLine tree.`);let s=r,o=r,a,l;for(;a===void 0;)s=this.tree.prev(s),s===null?a=null:s.key.consumedBy===void 0&&(a=s.key);for(;l===void 0;)o=this.tree.next(o),o===null?l=null:o.key.consumedBy===void 0&&(l=o.key);if(t.isLeft){let c=null;if(a){const h=a.getIntersection(e);if(h!==null&&(e.isAnEndpoint(h)||(c=h),!a.isAnEndpoint(h))){const d=this._splitSafely(a,h);for(let f=0,g=d.length;f<g;f++)n.push(d[f])}}let u=null;if(l){const h=l.getIntersection(e);if(h!==null&&(e.isAnEndpoint(h)||(u=h),!l.isAnEndpoint(h))){const d=this._splitSafely(l,h);for(let f=0,g=d.length;f<g;f++)n.push(d[f])}}if(c!==null||u!==null){let h=null;c===null?h=u:u===null?h=c:h=je.comparePoints(c,u)<=0?c:u,this.queue.remove(e.rightSE),n.push(e.rightSE);const d=e.split(h);for(let f=0,g=d.length;f<g;f++)n.push(d[f])}n.length>0?(this.tree.remove(e),n.push(t)):(this.segments.push(e),e.prev=a)}else{if(a&&l){const c=a.getIntersection(l);if(c!==null){if(!a.isAnEndpoint(c)){const u=this._splitSafely(a,c);for(let h=0,d=u.length;h<d;h++)n.push(u[h])}if(!l.isAnEndpoint(c)){const u=this._splitSafely(l,c);for(let h=0,d=u.length;h<d;h++)n.push(u[h])}}}this.tree.remove(e)}return n}_splitSafely(t,e){this.tree.remove(t);const n=t.rightSE;this.queue.remove(n);const r=t.split(e);return r.push(n),t.consumedBy===void 0&&this.tree.add(t),r}}const Cc=typeof process<"u"&&Dh.POLYGON_CLIPPING_MAX_QUEUE_SIZE||1e6,C0=typeof process<"u"&&Dh.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS||1e6;class P0{run(t,e,n){sn.type=t,Rr.reset();const r=[new Ac(e,!0)];for(let h=0,d=n.length;h<d;h++)r.push(new Ac(n[h],!1));if(sn.numMultiPolys=r.length,sn.type==="difference"){const h=r[0];let d=1;for(;d<r.length;)wa(r[d].bbox,h.bbox)!==null?d++:r.splice(d,1)}if(sn.type==="intersection")for(let h=0,d=r.length;h<d;h++){const f=r[h];for(let g=h+1,_=r.length;g<_;g++)if(wa(f.bbox,r[g].bbox)===null)return[]}const s=new Ja(je.compare);for(let h=0,d=r.length;h<d;h++){const f=r[h].getSweepEvents();for(let g=0,_=f.length;g<_;g++)if(s.insert(f[g]),s.size>Cc)throw new Error("Infinite loop when putting segment endpoints in a priority queue (queue size too big).")}const o=new R0(s);let a=s.size,l=s.pop();for(;l;){const h=l.key;if(s.size===a){const f=h.segment;throw new Error(`Unable to pop() ${h.isLeft?"left":"right"} SweepEvent [${h.point.x}, ${h.point.y}] from segment #${f.id} [${f.leftSE.point.x}, ${f.leftSE.point.y}] -> [${f.rightSE.point.x}, ${f.rightSE.point.y}] from queue.`)}if(s.size>Cc)throw new Error("Infinite loop when passing sweep line over endpoints (queue size too big).");if(o.segments.length>C0)throw new Error("Infinite loop when passing sweep line over endpoints (too many sweep line segments).");const d=o.process(h);for(let f=0,g=d.length;f<g;f++){const _=d[f];_.consumedBy===void 0&&s.insert(_)}a=s.size,l=s.pop()}Rr.reset();const c=As.factory(o.segments);return new A0(c).getGeom()}}const sn=new P0,L0=function(i){for(var t=arguments.length,e=new Array(t>1?t-1:0),n=1;n<t;n++)e[n-1]=arguments[n];return sn.run("union",i,e)},D0=function(i){for(var t=arguments.length,e=new Array(t>1?t-1:0),n=1;n<t;n++)e[n-1]=arguments[n];return sn.run("intersection",i,e)},I0=function(i){for(var t=arguments.length,e=new Array(t>1?t-1:0),n=1;n<t;n++)e[n-1]=arguments[n];return sn.run("xor",i,e)},U0=function(i){for(var t=arguments.length,e=new Array(t>1?t-1:0),n=1;n<t;n++)e[n-1]=arguments[n];return sn.run("difference",i,e)};var Qa={union:L0,intersection:D0,xor:I0,difference:U0};function Uh(i,t=!1){const e=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),r=new Set(Object.keys(i[0].morphAttributes)),s={},o={},a=i[0].morphTargetsRelative,l=new We;let c=0;for(let u=0;u<i.length;++u){const h=i[u];let d=0;if(e!==(h.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in h.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;s[f]===void 0&&(s[f]=[]),s[f].push(h.attributes[f]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". Make sure all geometries have the same number of attributes."),null;if(a!==h.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in h.morphAttributes){if(!r.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(h.morphAttributes[f])}if(t){let f;if(e)f=h.index.count;else if(h.attributes.position!==void 0)f=h.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,u),c+=f}}if(e){let u=0;const h=[];for(let d=0;d<i.length;++d){const f=i[d].index;for(let g=0;g<f.count;++g)h.push(f.getX(g)+u);u+=i[d].attributes.position.count}l.setIndex(h)}for(const u in s){const h=Pc(s[u]);if(!h)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" attribute."),null;l.setAttribute(u,h)}for(const u in o){const h=o[u][0].length;if(h===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[u]=[];for(let d=0;d<h;++d){const f=[];for(let _=0;_<o[u].length;++_)f.push(o[u][_][d]);const g=Pc(f);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" morphAttribute."),null;l.morphAttributes[u].push(g)}}return l}function Pc(i){let t,e,n,r=-1,s=0;for(let c=0;c<i.length;++c){const u=i[c];if(t===void 0&&(t=u.array.constructor),t!==u.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=u.itemSize),e!==u.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=u.normalized),n!==u.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(r===-1&&(r=u.gpuType),r!==u.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;s+=u.count*e}const o=new t(s),a=new Ke(o,e,n);let l=0;for(let c=0;c<i.length;++c){const u=i[c];if(u.isInterleavedBufferAttribute){const h=l/e;for(let d=0,f=u.count;d<f;d++)for(let g=0;g<e;g++){const _=u.getComponent(d,g);a.setComponent(d+h,g,_)}}else o.set(u.array,l);l+=u.count*e}return r!==void 0&&(a.gpuType=r),a}class N0{constructor(t=.1,e=6){this.maxEdgeLength=t,this.maxIterations=e}modify(t){t.index!==null&&(t=t.toNonIndexed());const e=this.maxIterations,n=this.maxEdgeLength*this.maxEdgeLength,r=new I,s=new I,o=new I,a=new I,l=[r,s,o,a],c=new I,u=new I,h=new I,d=new I,f=[c,u,h,d],g=new Yt,_=new Yt,m=new Yt,p=new Yt,T=[g,_,m,p],y=new ct,v=new ct,A=new ct,P=new ct,L=[y,v,A,P],D=new ct,b=new ct,M=new ct,C=new ct,H=[D,b,M,C],X=t.attributes,et=X.normal!==void 0,$=X.color!==void 0,Z=X.uv!==void 0,it=X.uv1!==void 0;let G=X.position.array,dt=et?X.normal.array:null,gt=$?X.color.array:null,yt=Z?X.uv.array:null,Nt=it?X.uv1.array:null,Vt=G,Zt=dt,Gt=gt,nt=yt,rt=Nt,Et=0,R=!0;function U(ot,S,O){const B=l[ot],W=l[S],V=l[O];if(Vt.push(B.x,B.y,B.z),Vt.push(W.x,W.y,W.z),Vt.push(V.x,V.y,V.z),et){const Q=f[ot],J=f[S],at=f[O];Zt.push(Q.x,Q.y,Q.z),Zt.push(J.x,J.y,J.z),Zt.push(at.x,at.y,at.z)}if($){const Q=T[ot],J=T[S],at=T[O];Gt.push(Q.r,Q.g,Q.b),Gt.push(J.r,J.g,J.b),Gt.push(at.r,at.g,at.b)}if(Z){const Q=L[ot],J=L[S],at=L[O];nt.push(Q.x,Q.y),nt.push(J.x,J.y),nt.push(at.x,at.y)}if(it){const Q=H[ot],J=H[S],at=H[O];rt.push(Q.x,Q.y),rt.push(J.x,J.y),rt.push(at.x,at.y)}}for(;R&&Et<e;){Et++,R=!1,G=Vt,Vt=[],et&&(dt=Zt,Zt=[]),$&&(gt=Gt,Gt=[]),Z&&(yt=nt,nt=[]),it&&(Nt=rt,rt=[]);for(let ot=0,S=0,O=G.length;ot<O;ot+=9,S+=6){r.fromArray(G,ot+0),s.fromArray(G,ot+3),o.fromArray(G,ot+6),et&&(c.fromArray(dt,ot+0),u.fromArray(dt,ot+3),h.fromArray(dt,ot+6)),$&&(g.fromArray(gt,ot+0),_.fromArray(gt,ot+3),m.fromArray(gt,ot+6)),Z&&(y.fromArray(yt,S+0),v.fromArray(yt,S+2),A.fromArray(yt,S+4)),it&&(D.fromArray(Nt,S+0),b.fromArray(Nt,S+2),M.fromArray(Nt,S+4));const B=r.distanceToSquared(s),W=s.distanceToSquared(o),V=r.distanceToSquared(o);B>n||W>n||V>n?(R=!0,B>=W&&B>=V?(a.lerpVectors(r,s,.5),et&&d.lerpVectors(c,u,.5),$&&p.lerpColors(g,_,.5),Z&&P.lerpVectors(y,v,.5),it&&C.lerpVectors(D,b,.5),U(0,3,2),U(3,1,2)):W>=B&&W>=V?(a.lerpVectors(s,o,.5),et&&d.lerpVectors(u,h,.5),$&&p.lerpColors(_,m,.5),Z&&P.lerpVectors(v,A,.5),it&&C.lerpVectors(b,M,.5),U(0,1,3),U(3,2,0)):(a.lerpVectors(r,o,.5),et&&d.lerpVectors(c,h,.5),$&&p.lerpColors(g,m,.5),Z&&P.lerpVectors(y,A,.5),it&&C.lerpVectors(D,M,.5),U(0,1,3),U(3,1,2))):U(0,1,2)}}const Y=new We;return Y.setAttribute("position",new ge(Vt,3)),et&&Y.setAttribute("normal",new ge(Zt,3)),$&&Y.setAttribute("color",new ge(Gt,3)),Z&&Y.setAttribute("uv",new ge(nt,2)),it&&Y.setAttribute("uv1",new ge(rt,2)),Y}}const tl=(i,t)=>i.design?Ms(i.design,t):Pa(i.pattern,t),F0=()=>new We().setAttribute("position",new ge([],3)).setAttribute("normal",new ge([],3)),Rs={pattern:"rugged",radius:340,width:285,depth:16,repeats:32,gap:1,sipes:!0,view:"tire",casing:!0};function el(i){for(const t of["radius","width","depth","repeats","gap"])if(!Number.isFinite(i[t]))throw new Error(`${t} must be finite`);if(i.radius<250||i.radius>500||i.width<180||i.width>360||i.depth<4||i.depth>26||i.repeats<20||i.repeats>72||i.repeats%2||i.gap<.65||i.gap>1.6)throw new Error("Settings outside supported limits");if(!["tire","flat"].includes(i.view))throw new Error("Unknown view")}function O0(i,t){const e=[];for(let n=1;n<i.length;n++){const[r,s]=[i[n-1],i[n]],o=Math.hypot(s[0]-r[0],s[1]-r[1]);if(o<1e-6)continue;const a=-(s[1]-r[1])/o*t/2,l=(s[0]-r[0])/o*t/2;e.push([[[r[0]+a,r[1]+l],[s[0]+a,s[1]+l],[s[0]-a,s[1]-l],[r[0]-a,r[1]-l],[r[0]+a,r[1]+l]]]);const c=t/2;e.push([Array.from({length:9},(u,h)=>[s[0]+c*Math.cos(h*Math.PI/4),s[1]+c*Math.sin(h*Math.PI/4)])])}return e.length?Qa.union(...e):[]}function So(i,t,e,n=0){const r=i.map(o=>{const a=new yh(o[0].map(l=>new ct(...l)));for(const l of o.slice(1))a.holes.push(new _a(l.map(c=>new ct(...c))));return a});if(!r.length)return null;const s=new qa(r,{depth:e,bevelEnabled:n>0,bevelThickness:n,bevelSize:n,bevelSegments:2,steps:1,curveSegments:1});return s.translate(0,0,t),s.deleteAttribute("uv"),s}function Lc(i,t){const{pattern:e,width:n,radius:r,repeats:s,depth:o,sipes:a,gap:l}=i,c=2*Math.PI*r/s,u=[],h=pe.find(g=>g.id===e);for(const g of tl(i,t)){const _=g.points.reduce((C,H)=>C+H[0],0)/g.points.length,m=g.points.reduce((C,H)=>C+H[1],0)/g.points.length,p=1-(l-1)*.14,T=([C,H])=>[(_+(C-_)*p)*n,(g.continuous?H:m+(H-m)*p)*c],y=o*(g.heightRatio??1),v=h.sipeWidth*n/h.width,A=Math.min(.2,v*.18),P=g.points.map(T);P.push([...P[0]]);const L=[[P]],D=a?g.sipes.map(C=>O0(C.map(T),v)):[],b=D.length?Qa.difference(L,...D):L,M=y*.7;D.length?(u.push(So(L,-2,M+2)),u.push(So(b,M,y-M-A,A))):u.push(So(L,-2,y+1.65,.35))}if(!u.length)return F0();const d=Uh(u.filter(Boolean),!1);u.filter(Boolean).forEach(g=>g.dispose());const f=new N0(22,3).modify(d);return d.dispose(),f}const B0=(i,t)=>17*Math.pow(i/(t*.5),2);function z0(i){el(i),i.design&&Ss(i.design,{geometry:!0});const{radius:t,width:e,repeats:n,view:r}=i,s=[Lc(i,0),Lc(i,1)],o=r==="flat"?6:n,a=2*Math.PI*t/n,l=[];for(let h=0;h<o;h++){const d=s[h%2].clone(),f=d.getAttribute("position");for(let g=0;g<f.count;g++){const _=f.getX(g),m=f.getY(g)+h*a,p=f.getZ(g);if(r==="tire"){const T=m/t,y=t-B0(_,e)+p;f.setXYZ(g,_,y*Math.sin(T),y*Math.cos(T))}else f.setXYZ(g,_,p,-(m-o*a/2))}d.computeVertexNormals(),l.push(d)}const c=Uh(l,!1);[...l,...s].forEach(h=>h.dispose()),c.computeBoundingBox(),c.computeBoundingSphere();const u=Array.from({length:o},(h,d)=>tl(i,d%2)).flat();return{geometry:c,blocks:u.filter(h=>h.role!=="ejector").length,ejectors:u.filter(h=>h.role==="ejector").length,count:o}}function k0(i){const{radius:t,width:e,view:n,repeats:r}=i;if(n==="flat"){let g=0,_=6;const m=!!i.design||i.pattern==="mud"||pe.find(v=>v.id===i.pattern)?.fitBacking;if(m){g=1/0,_=-1/0;const v=1-(i.gap-1)*.14;for(let A=0;A<6;A++)for(const P of tl(i,A%2)){const L=P.points.reduce((D,b)=>D+b[1],0)/P.points.length;for(const[,D]of P.points){const b=A+L+(D-L)*v;g=Math.min(g,b),_=Math.max(_,b)}}}(!Number.isFinite(g)||!Number.isFinite(_))&&(g=0,_=6);const p=2*Math.PI*t/r,T=m?2:0,y=new pi(e,14,(_-g)*p+T);return y.translate(0,-7,-((g+_)/2-3)*p),y}const s=e/2,o=[[0,t-1.1],[s*.65,t-8.3],[s*.94,t-16.1],[s*1.015,t-20.2],[s*1.035,t-60],[s*.98,t-96],[s*.84,t*.635],[s*.78,t*.622],[s*.73,t*.635],[s*.86,t-100],[s*.91,t-65],[s*.85,t-35],[s*.6,t-23],[0,t-20],[-s*.6,t-23],[-s*.85,t-35],[-s*.91,t-65],[-s*.86,t-100],[-s*.73,t*.635],[-s*.78,t*.622],[-s*.84,t*.635],[-s*.98,t-96],[-s*1.035,t-60],[-s*1.015,t-20.2],[-s*.94,t-16.1],[-s*.65,t-8.3]],l=new mh(o.map(([g,_])=>new I(g,_,0)),!0,"centripetal").getPoints(104).slice(0,-1),c=[],u=[],h=l.length,d=192;for(let g=0;g<d;g++){const _=g/d*2*Math.PI;for(const m of l)c.push(m.x,m.y*Math.sin(_),m.y*Math.cos(_))}for(let g=0;g<d;g++)for(let _=0;_<h;_++){const m=g*h+_,p=(g+1)%d*h+_,T=(g+1)%d*h+(_+1)%h,y=g*h+(_+1)%h;u.push(m,y,p,p,y,T)}const f=new We;return f.setAttribute("position",new ge(c,3)),f.setIndex(u),f.computeVertexNormals(),f}function H0(i,t,{w:e,p:n},r=1/0){let s=null;const o=(a,l)=>{const c=l===null?a.length:a.length-1;for(let u=0;u<c;u++){const h=a[u],d=a[(u+1)%a.length],f=(d[0]-h[0])*e,g=(d[1]-h[1])*n,_=f*f+g*g;if(_<1e-12)continue;const m=Math.max(0,Math.min(1,((t[0]-h[0])*e*f+(t[1]-h[1])*n*g)/_));if(m*Math.sqrt(_)<.001||(1-m)*Math.sqrt(_)<.001)continue;const p=[h[0]+(d[0]-h[0])*m,h[1]+(d[1]-h[1])*m],T=Math.hypot((p[0]-t[0])*e,(p[1]-t[1])*n);T<=r&&(!s||T<s.distance)&&(s={sipe:l,index:u+1,point:p,distance:T})}};return o(i.points,null),i.sipes.forEach(o),s}function Eo(i,t,{w:e,p:n}){return Math.abs((i[0]-t[0])*e)>=Math.abs((i[1]-t[1])*n)?[i[0],t[1]]:[t[0],i[1]]}function V0(i,t,e){const n=e?t:Math.min(t,i.length-2),r=i[n],s=i[(n+1)%i.length];return{index:n+1,point:[(r[0]+s[0])/2,(r[1]+s[1])/2]}}const Un=["#f39862","#83b9cf","#b4c987","#c0a2de","#dab773","#75b9a6"],ei=i=>Number(i.toFixed(4));function G0({getSettings:i,onChange:t,onPreset:e,onImport:n,onMessage:r}){const s=R=>document.querySelector(R);let o=i().design?ze(i().design):Os(i().pattern);try{const R=JSON.parse(localStorage.getItem("frontier-draft-v1"));R&&(o=Ss(R))}catch{}!o.modified&&o.presetRevision!==vr&&(o=Os(o.preset));let a=o.shapes[0]?.id,l=null,c=null,u="select",h=[],d=null,f=null,g=!1;const _=[],m=[],p=document.createElement("div");p.className="designer-sidebar",s(".library").prepend(p),p.innerHTML=`<div class="section-eyebrow">01 / BASE SHAPES</div><h1>Your tread. Your rules.</h1>
    <label class="designer-label" for="design-name">Project name</label><input id="design-name" maxlength="100"/>
    <label class="designer-label" for="design-preset">Start from a preset</label><div class="editor-row"><select id="design-preset">${pe.map(R=>`<option value="${R.id}">${Fn(R.name)}${R.reference?" · revised draft":""}</option>`).join("")}</select><button id="load-preset">Load</button></div>
    <div class="editor-row project-actions"><button id="save-design">Save JSON ↓</button><button id="load-design">Open JSON ↑</button><button id="blank-design">Blank</button></div><input id="design-file" type="file" accept=".json,application/json" hidden/>
    <div class="shape-heading"><span class="section-eyebrow">SHAPE TYPES <b id="shape-total"></b></span><span id="draft-status">Autosaved locally</span></div>
    <div class="editor-row"><select id="new-kind" aria-label="New shape type"><option value="block">Rectangle</option><option value="chevron">Chevron</option><option value="triangle">Triangle</option><option value="ejector">Low ejector</option></select><button id="add-shape">＋ Add</button></div>
    <div id="shape-list" aria-label="Shape types"></div><div class="editor-row"><button id="duplicate-shape">Duplicate</button><button id="delete-shape">Delete shape</button></div>
    <div id="shape-properties"></div>
    <button id="designer-reference" class="editor-reference">Preset blueprint & reference ↗</button>
    <p class="editor-help">Solid = editable source. Dashed = linked mirror. Drag a shape to move it, or a handle to edit a vertex. Orange handles shape blocks; blue handles shape cut lines. No limit on the number of shape types.</p>`;const T=document.createElement("section");T.className="editor-pane",T.setAttribute("aria-label","2D tread polygon designer"),s(".stage").before(T),T.innerHTML=`<div class="editor-heading"><div><div class="section-eyebrow">02 / POLYGON DESIGNER</div><h2>Shape the contact patch.</h2></div><span class="small-tag">SVG → MESH</span></div>
    <div class="editor-toolbar"><button data-tool="select" aria-pressed="true">↖ Select</button><button data-tool="polygon">＋ Polygon</button><button data-tool="sipe">＋ Cut line</button><button id="undo-design" title="Undo (Ctrl/Cmd Z)">↶ Undo</button><button id="redo-design" title="Redo (Ctrl/Cmd Shift Z)">↷</button></div>
    <div class="editor-context"><span id="editor-instruction">Ctrl/Cmd + click: add · Alt + point: remove · Shift + drag: straight</span><button id="finish-draw" hidden>Finish ↵</button><button id="cancel-draw" hidden>Cancel</button></div>
    <svg id="design-canvas" tabindex="0" role="img" aria-label="Editable tread polygons. Use the vertex fields for precise coordinates." xmlns="http://www.w3.org/2000/svg"></svg>
    <div class="editor-bottom"><label><input id="editor-snap" type="checkbox"/> Snap 0.025</label><span>Wheel: zoom · middle/right drag: pan</span><button id="fit-editor">Fit 2D</button><button id="export-svg">SVG ↓</button></div>
    <div id="design-warnings" role="status"></div>
    <details class="editor-guide"><summary>Point & cut-line shortcuts</summary><p><strong>Ctrl/Cmd + click</strong> near a solid outline or cut-line segment inserts a point. <strong>Alt + click</strong> a handle removes it. Polygons keep at least 3 points; removing a point from a 2-point cut deletes that cut. Drag blue handles to reshape cut lines; drag a line to move it independently. <strong>Shift + drag</strong> locks horizontal/vertical movement. <strong>Ctrl/Cmd + Shift + click</strong> extends the selected cut-line endpoint (select the first endpoint to prepend; otherwise extends the end). Double-click inserts too. Middle/right drag pans. Undo/redo covers all these edits.</p></details>
    <details class="editor-guide"><summary>How mirroring & repeats work</summary><p>X runs across the tyre width; Y runs along travel in pitch units. Width mirroring reflects X; travel mirroring reflects Y; point mirroring reverses both; four-way makes all combinations. The copy stagger shifts mirrored copies along travel. Axes are local to each pitch. Edit A, B or every pitch; the two-pitch cell repeats around an even circumference. Sipes mirror with their block. The SVG shows source outlines; groove spacing and bevels are applied in 3D. Overlapping blocks remain separate solids, not a union.</p></details>`;const y=s("#design-canvas"),v=()=>o.shapes.find(R=>R.id===a),A=()=>{const R=i();return{w:R.width,p:2*Math.PI*R.radius/R.repeats}},P=R=>R.phase==="1"?1:0;function L(){try{localStorage.setItem("frontier-draft-v1",JSON.stringify(o)),s("#draft-status").textContent="Autosaved locally"}catch{s("#draft-status").textContent="Save JSON to keep edits"}}function D(){const{design:R,...U}=i();return{design:ze(o),settings:ze(U)}}function b(){_.push(D()),_.length>80&&_.shift(),m.length=0,s("#undo-design").disabled=!1,s("#redo-design").disabled=!0}function M(){o.modified=!0,L(),t(ze(o)),et()}function C(R,U=null){b(),R(),l=U,c=U?.sipe??null,$(),M()}function H(){const{w:R,p:U}=A();f=[-.64*R,-.5*U,1.28*R,3*U],G()}function X(R,U,Y){const ot=document.createElement("a"),S=URL.createObjectURL(new Blob([R],{type:Y}));ot.href=S,ot.download=U,ot.click(),setTimeout(()=>URL.revokeObjectURL(S),1e4)}function et(){const R=o.shapes.filter(S=>S.enabled&&!Ro(S.points));if(R.length){s("#design-warnings").textContent=`Repair outline: ${R.map(S=>S.name).join(", ")}. Self-intersections / duplicate vertices cannot be extruded; last valid mesh remains visible.`;return}const U=[];for(const S of[0,1])for(const O of Ms(o,S)){const B=O.points.reduce((V,Q)=>V+Q[1],0)/O.points.length+S,W=S-2*Math.floor(B/2);for(const V of[-1,0,1])U.push(O.points.map(([Q,J])=>[Q,J+W+V*2]))}let Y=0;t:for(let S=0;S<U.length;S++)for(let O=S+1;O<U.length;O++){const B=U[S],W=U[O];if(!(Math.max(...B.map(V=>V[0]))<Math.min(...W.map(V=>V[0]))||Math.min(...B.map(V=>V[0]))>Math.max(...W.map(V=>V[0]))||Math.max(...B.map(V=>V[1]))<Math.min(...W.map(V=>V[1]))||Math.min(...B.map(V=>V[1]))>Math.max(...W.map(V=>V[1]))))try{if(Qa.intersection([B],[W]).some(Q=>Math.abs(Q[0].reduce((J,at,Ht)=>{const Bt=Q[0][(Ht+1)%Q[0].length];return J+at[0]*Bt[1]-at[1]*Bt[0]},0))>1e-7)){Y++;break t}}catch{}}const ot=U.some(S=>S.some(([O])=>Math.abs(O)>.501));s("#design-warnings").textContent=Y?"Overlapping shapes across the repeat. Adjust vertices, mirror axes or stagger to open the grooves.":ot?"Some shapes extend beyond the tread width. Check the casing support in 3D.":o.shapes.some(S=>S.enabled)?"Two-pitch cell → full circumference. Source grooves are open.":"Empty design. Add a polygon or load a preset to begin.",s("#design-warnings").classList.toggle("warning",!!Y||ot)}function $(){s("#design-name").value=o.name,s("#design-preset").value=o.preset,s("#shape-total").textContent=o.shapes.length,s("#shape-list").innerHTML=o.shapes.map((R,U)=>`<div class="shape-item ${R.id===a?"selected":""}"><button data-select-shape="${R.id}" aria-pressed="${R.id===a}"><i style="background:${Un[U%Un.length]}"></i><span>${Fn(R.name)}<small>${R.points.length} vertices · ${R.phase==="both"?"A + B":R.phase==="0"?"A only":"B only"} · ${R.mirror.mode}</small></span></button><input type="checkbox" data-enable-shape="${R.id}" aria-label="Show ${Fn(R.name)}" ${R.enabled?"checked":""}/></div>`).join(""),s("#undo-design").disabled=!_.length,s("#redo-design").disabled=!m.length,s("#duplicate-shape").disabled=s("#delete-shape").disabled=!v(),Z(),G()}function Z(){const R=v();if(!R){s("#shape-properties").innerHTML='<p class="editor-help">Select or add a shape to edit its mirrors.</p>';return}const{w:U}=A();s("#shape-properties").innerHTML=`<div class="section-eyebrow">SELECTED SHAPE</div><label class="designer-label" for="shape-name">Name</label><input id="shape-name" maxlength="100" value="${Fn(R.name)}"/>
      <div class="field-pair"><label>Pitch membership<select id="shape-phase"><option value="both">Every pitch (A + B)</option><option value="0">A only</option><option value="1">B only</option></select></label><label>Height / depth %<input id="shape-height" type="number" min="5" max="100" value="${ei(R.heightRatio*100)}"/></label></div>
      <label class="designer-label" for="mirror-mode">Linked mirrors</label><select id="mirror-mode"><option value="none">None — source only</option><option value="width">Across tyre width (X)</option><option value="travel">Along tread / travel (Y)</option><option value="point">Point mirror (X + Y)</option><option value="both">Four-way (both axes)</option></select>
      <div class="field-pair"><label>X axis / mm<input id="mirror-x" type="number" step="1" value="${ei(R.mirror.axisX*U)}"/></label><label>Y axis / pitch<input id="mirror-y" type="number" step=".05" value="${ei(R.mirror.axisY)}"/></label></div>
      <label class="designer-label" for="mirror-stagger">Copy stagger / pitch</label><input id="mirror-stagger" type="number" step=".05" value="${ei(R.mirror.stagger)}"/>
      <button id="bake-mirrors" ${R.mirror.mode==="none"?"disabled":""}>Make mirror copies independent</button>
      <div class="editor-row"><input id="shape-angle" type="number" value="15" step="15" aria-label="Rotation angle in degrees"/><button id="rotate-shape">Rotate °</button></div>
      <div id="vertex-fields"></div><div class="editor-row"><button id="add-vertex">＋ Point</button><button id="delete-vertex" ${l?"":"disabled"}>− Point</button></div><button id="delete-sipes" ${R.sipes.length?"":"disabled"}>Clear sipes (${R.sipes.length})</button>`,s("#shape-phase").value=R.phase,s("#mirror-mode").value=R.mirror.mode,c!==null&&!R.sipes[c]&&(c=null),s("#shape-properties").insertAdjacentHTML("beforeend",`<div class="sipe-list"><div class="section-eyebrow">CUT LINES / SIPES</div>${R.sipes.map((Y,ot)=>`<button data-select-sipe="${ot}" aria-pressed="${c===ot}">Cut ${ot+1} · ${Y.length} points</button>`).join("")}<button id="delete-cut" ${c===null?"disabled":""}>Delete selected cut</button></div>`),it()}function it(){const R=v();if(!R||!s("#vertex-fields"))return;const U=l&&(l.sipe===null?R.points:R.sipes[l.sipe])?.[l.index];s("#vertex-fields").innerHTML=U?`<div class="section-eyebrow">${l.sipe===null?"OUTLINE":"SIPE"} VERTEX ${l.index+1}</div><div class="field-pair"><label>X / mm<input id="vertex-x" type="number" step=".5" value="${ei(U[0]*A().w)}"/></label><label>Y / pitch (local)<input id="vertex-y" type="number" step=".025" value="${ei(U[1])}"/></label></div>`:'<p class="editor-help">Select a circular handle for precise vertex coordinates.</p>',s("#delete-vertex")&&(s("#delete-vertex").disabled=!U)}function G(){if(!f)return;y.setAttribute("viewBox",f.join(" "));const{w:R,p:U}=A(),Y=v(),ot=(O,B=0)=>O.map(([W,V],Q)=>`${Q?"L":"M"}${W*R},${(V+B)*U}`).join(" ");let S=`<defs><pattern id="editor-grid" width="${R*.05}" height="${U*.25}" patternUnits="userSpaceOnUse"><path d="M ${R*.05} 0 L 0 0 0 ${U*.25}" fill="none" stroke="#272b30" stroke-width=".35"/></pattern></defs><rect x="-100000" y="-100000" width="200000" height="200000" fill="#101215"/><rect x="${-.5*R}" y="0" width="${R}" height="${2*U}" fill="url(#editor-grid)" stroke="#727b84" stroke-width=".6"/><path d="M ${-.5*R} ${U} H ${.5*R}" stroke="#606870" stroke-dasharray="2 2" stroke-width=".5"/><text x="${-.5*R}" y="${-U*.1}" fill="#929ca6" font-size="${R*.022}">← TYRE WIDTH / ${R} mm →</text><text x="${.52*R}" y="${U*.5}" fill="#65717e" font-size="${R*.025}">A</text><text x="${.52*R}" y="${U*1.5}" fill="#65717e" font-size="${R*.025}">B</text>`;for(let O=-2;O<4;O++)for(const B of Ms(o,(O%2+2)%2)){const W=o.shapes.findIndex(at=>at.id===B.sourceId),V=o.shapes[W],Q=O<0||O>1,J=B.instance==="source"&&O===P(V);S+=`<g opacity="${Q?.12:J?1:.55}"><path d="${ot(B.points,O)}Z" fill="${Un[W%Un.length]}" fill-opacity="${B.sourceId===a?.28:.12}" stroke="${Un[W%Un.length]}" stroke-width="${B.sourceId===a?1.1:.55}" ${J?"":'stroke-dasharray="2 1.3"'} ${Q?"":`data-shape="${B.sourceId}" data-source="${J}"`}><title>${Fn(B.name)} / ${B.instance}${J?" — drag to move":" — linked copy"}</title></path>`;for(const at of B.sipes)S+=`<path d="${ot(at,O)}" fill="none" stroke="${Un[W%Un.length]}" stroke-width=".75" pointer-events="none"/>`;S+="</g>"}if(Y&&Y.enabled){const O=P(Y),B=Y.mirror;["width","point","both"].includes(B.mode)&&(S+=`<path d="M ${B.axisX*R} ${-U*.4} V ${2.4*U}" stroke="#e79761" stroke-width=".7" stroke-dasharray="4 2" pointer-events="none"/>`),["travel","point","both"].includes(B.mode)&&(S+=`<path d="M ${-.6*R} ${(B.axisY+O)*U} H ${.6*R}" stroke="#91b6d7" stroke-width=".7" stroke-dasharray="4 2" pointer-events="none"/>`),Y.sipes.forEach((V,Q)=>{S+=`<path d="${ot(V,O)}" fill="none" stroke="${c===Q?"#d7f2ff":"#91c5dd"}" stroke-width="${c===Q?1.3:.75}" pointer-events="none"/><path d="${ot(V,O)}" fill="none" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke" data-line="${Q}"><title>Cut ${Q+1}: drag line or blue points; Ctrl/Cmd-click to add a point</title></path>`});const W=(V,Q,J)=>`<circle cx="${V[0]*R}" cy="${(V[1]+O)*U}" r="${f[2]*.006}" fill="${l?.index===Q&&l?.sipe===J?"#fff":"#101215"}" stroke="${J===null?"#f4b284":"#91c5dd"}" stroke-width=".8" data-vertex="${Q}" data-sipe="${J===null?"":J}"/>`;S+=Y.points.map((V,Q)=>W(V,Q,null)).join(""),Y.sipes.forEach((V,Q)=>{S+=V.map((J,at)=>W(J,at,Q)).join("")})}h.length&&(S+=`<path d="${ot(h)}" fill="none" stroke="#fff" stroke-width="1"/>${h.map(([O,B])=>`<circle cx="${O*R}" cy="${B*U}" r="${f[2]*.005}" fill="#fff"/>`).join("")}`),y.innerHTML=S,s("#finish-draw").hidden=s("#cancel-draw").hidden=u==="select",s("#finish-draw").disabled=h.length<(u==="sipe"?2:3),s("#editor-instruction").textContent=u==="select"?"Ctrl/Cmd + click: add · Alt + point: remove · Shift + drag: straight":`${u==="sipe"?"Sipe":"Polygon"}: click points, then Finish or Enter · Escape cancels`,document.querySelectorAll("[data-tool]").forEach(O=>O.setAttribute("aria-pressed",O.dataset.tool===u))}const dt=R=>{const U=new DOMPoint(R.clientX,R.clientY).matrixTransform(y.getScreenCTM().inverse());return[U.x,U.y]},gt=R=>{const[U,Y]=dt(R),{w:ot,p:S}=A();return[U/ot,Y/S].map(O=>ei(g?Math.round(O/.025)*.025:O))};function yt(){if(!(h.length<(u==="sipe"?2:3))){if(u==="polygon"&&!Ro(h)){r("Outline crosses itself. Cancel and draw a simple polygon.");return}C(()=>{if(u==="sipe"){const R=v();R.sipes.push(h.map(([U,Y])=>[U,Y-P(R)]))}else{const R=hl();R.name="Drawn polygon",R.points=ze(h),R.phase="0",o.shapes.push(R),a=R.id}u="select",h=[]})}}T.addEventListener("click",R=>{const U=R.target.closest("[data-tool]");if(U){if(U.dataset.tool==="sipe"&&!v()){r("Select a shape before drawing a sipe.");return}u=U.dataset.tool,h=[],l=null,c=null,$()}}),y.addEventListener("contextmenu",R=>R.preventDefault());function Nt(R=l){const U=v();if(!U||!R)return;if(R.sipe===null&&U.points.length<=3){r("A polygon needs at least three vertices.");return}const Y=R.sipe!==null&&U.sipes[R.sipe].length<=2;C(()=>{Y?U.sipes.splice(R.sipe,1):(R.sipe===null?U.points:U.sipes[R.sipe]).splice(R.index,1)}),Y&&r("Cut line removed — a line needs at least two points. Undo restores it.")}function Vt(R){const U=R.target.closest("[data-shape]");if(U?.dataset.source==="false"){r("That is a linked copy. Insert points on the solid source outline.");return}if(U?.dataset.source==="true"&&U.dataset.shape!==a&&(a=U.dataset.shape,l=null,c=null),!v()||!v().enabled||R.target.closest("[data-vertex]"))return;const Y=gt(R);Y[1]-=P(v());const ot=Math.hypot(y.getScreenCTM().a,y.getScreenCTM().b),S=H0(v(),Y,A(),10/ot);if(!S){r("Click closer to a solid outline or cut-line segment to insert a point."),$();return}const O=v();C(()=>{(S.sipe===null?O.points:O.sipes[S.sipe]).splice(S.index,0,S.point)},{index:S.index,sipe:S.sipe})}function Zt(R){const U=v(),Y=l?.sipe??c;if(Y===null||!U?.sipes[Y]){r("Select a cut line or its endpoint before Ctrl/Cmd + Shift + click.");return}const ot=U.sipes[Y],S=gt(R);S[1]-=P(U);const O=l?.sipe===Y&&l.index===0,B=O?0:ot.length,W=ot[O?0:ot.length-1];Math.hypot((S[0]-W[0])*A().w,(S[1]-W[1])*A().p)<.001||C(()=>ot.splice(B,0,S),{sipe:Y,index:B})}y.addEventListener("pointerdown",R=>{if(R.button===1||R.button===2){R.preventDefault(),d={type:"pan",start:dt(R)},y.setPointerCapture(R.pointerId);return}if(R.button!==0)return;if(y.focus(),u!=="select"){if(R.altKey)return;let B=gt(R);R.shiftKey&&h.length&&(B=Eo(B,h.at(-1),A())),(!h.length||Math.hypot(B[0]-h.at(-1)[0],B[1]-h.at(-1)[1])>1e-7)&&h.push(B),G();return}const U=R.target.closest("[data-vertex]"),Y=U?{index:Number(U.dataset.vertex),sipe:U.dataset.sipe===""?null:Number(U.dataset.sipe)}:null;if(R.altKey){R.preventDefault(),Y&&Nt(Y);return}if(R.ctrlKey||R.metaKey){R.preventDefault(),R.shiftKey?Zt(R):Vt(R);return}const ot=[R.clientX,R.clientY];if(Y&&v()){l=Y,c=l.sipe,d={type:"vertex",start:[...(l.sipe===null?v().points:v().sipes[l.sipe])[l.index]],startClient:ot,changed:!1},Z(),y.setPointerCapture(R.pointerId),G();return}const S=R.target.closest("[data-line]");if(S&&v()){c=Number(S.dataset.line),l=null,d={type:"sipe",sipe:c,start:gt(R),original:ze(v().sipes[c]),startClient:ot,changed:!1},Z(),G(),y.setPointerCapture(R.pointerId);return}const O=R.target.closest("[data-shape]");O?(a=O.dataset.shape,l=null,c=null,$(),O.dataset.source==="true"&&(d={type:"shape",start:gt(R),original:ze(v()),startClient:ot,changed:!1},y.setPointerCapture(R.pointerId))):(l=null,c=null,Z(),G())}),y.addEventListener("pointermove",R=>{if(!d)return;if(d.type==="pan"){const ot=dt(R);f[0]+=d.start[0]-ot[0],f[1]+=d.start[1]-ot[1],G();return}if(!d.changed){if(Math.hypot(R.clientX-d.startClient[0],R.clientY-d.startClient[1])<2)return;b(),d.changed=!0}const U=v();let Y=gt(R);if(d.type==="vertex"){Y[1]-=P(U),R.shiftKey&&(Y=Eo(Y,d.start,A()));const ot=l.sipe===null?U.points:U.sipes[l.sipe];ot[l.index]=Y,it()}else{R.shiftKey&&(Y=Eo(Y,d.start,A()));const ot=Y[0]-d.start[0],S=Y[1]-d.start[1];d.type==="sipe"?U.sipes[d.sipe]=d.original.map(([O,B])=>[O+ot,B+S]):Object.assign(U,ur(d.original,([O,B])=>[O+ot,B+S]))}G(),s("#editor-instruction").textContent=R.shiftKey?"Axis locked · release to rebuild the mesh":"Release to rebuild the 3D mesh"});function Gt(){if(!d)return;const R=d.changed;d=null,R&&($(),M())}y.addEventListener("pointerup",Gt),y.addEventListener("pointercancel",Gt),y.addEventListener("wheel",R=>{R.preventDefault();const U=dt(R),Y=R.deltaY>0?1.12:1/1.12,ot=f[2]*Y;ot<A().w*.12||ot>A().w*6||(f=[U[0]+(f[0]-U[0])*Y,U[1]+(f[1]-U[1])*Y,ot,f[3]*Y],G())},{passive:!1}),y.addEventListener("dblclick",R=>{u!=="select"||R.altKey||R.ctrlKey||R.metaKey||(R.preventDefault(),Vt(R))}),p.addEventListener("click",R=>{const U=R.target.closest("[data-select-shape]");U&&(a=U.dataset.selectShape,l=null,c=null,u="select",h=[],$())}),p.addEventListener("change",R=>{const U=R.target,Y=v();if(U.dataset.enableShape){C(()=>o.shapes.find(ot=>ot.id===U.dataset.enableShape).enabled=U.checked);return}if(U.id==="design-name"){C(()=>o.name=U.value.trim()||"Untitled tread");return}if(Y){if(U.id==="shape-name")C(()=>Y.name=U.value.trim()||"Shape");else if(U.id==="shape-phase")C(()=>Y.phase=U.value);else if(U.id==="mirror-mode")C(()=>Y.mirror.mode=U.value);else if(["shape-height","mirror-x","mirror-y","mirror-stagger","vertex-x","vertex-y"].includes(U.id)){const ot=Number(U.value);if(!Number.isFinite(ot)||U.value===""){Z();return}if(U.id==="shape-height")C(()=>Y.heightRatio=Math.max(.05,Math.min(1,ot/100)));else if(U.id.startsWith("mirror-"))C(()=>Y.mirror[{"mirror-x":"axisX","mirror-y":"axisY","mirror-stagger":"stagger"}[U.id]]=Math.max(-50,Math.min(50,U.id==="mirror-x"?ot/A().w:ot)));else if(l){const S={...l};b();const O=S.sipe===null?Y.points:Y.sipes[S.sipe];O[S.index][U.id==="vertex-x"?0:1]=Math.max(-50,Math.min(50,U.id==="vertex-x"?ot/A().w:ot)),G(),M()}}}}),p.addEventListener("click",R=>{const U=R.target.closest("button")?.id,Y=v(),ot=R.target.closest("[data-select-sipe]");if(ot&&Y&&(c=Number(ot.dataset.selectSipe),l=null,Z(),G()),U==="delete-cut"&&Y&&c!==null){const S=c;C(()=>Y.sipes.splice(S,1))}if(U==="add-shape"&&C(()=>{const S=hl(s("#new-kind").value);S.name+=` ${o.shapes.length+1}`,o.shapes.push(S),a=S.id}),U==="duplicate-shape"&&Y&&C(()=>{const S=ur(ze(Y),([O,B])=>[O+.025,B+.1]);S.id=Ao(),S.name=Y.name.slice(0,90)+" copy",o.shapes.push(S),a=S.id}),U==="delete-shape"&&Y&&C(()=>{o.shapes=o.shapes.filter(S=>S.id!==Y.id),a=o.shapes[0]?.id}),U==="delete-sipes"&&Y&&C(()=>Y.sipes=[]),U==="bake-mirrors"&&Y&&C(()=>{const S=La(Y);Y.mirror=ys();for(const O of S.filter(B=>B.instance!=="source"))o.shapes.push({...O,id:Ao(),name:(Y.name+" "+O.instance).slice(0,100),mirror:ys()})}),U==="rotate-shape"&&Y){const S=Number(s("#shape-angle").value)*Math.PI/180;if(!Number.isFinite(S))return;C(()=>{const{w:O,p:B}=A(),W=Y.points.reduce((Q,J)=>Q+J[0],0)/Y.points.length,V=Y.points.reduce((Q,J)=>Q+J[1],0)/Y.points.length;Object.assign(Y,ur(Y,([Q,J])=>[W+((Q-W)*O*Math.cos(S)-(J-V)*B*Math.sin(S))/O,V+((Q-W)*O*Math.sin(S)+(J-V)*B*Math.cos(S))/B]))})}if(U==="add-vertex"&&Y){const S=l?.sipe??c,O=S!==null?Y.sipes[S]:Y.points,B=V0(O,l?.index??0,S===null);C(()=>O.splice(B.index,0,B.point),{sipe:S,index:B.index})}U==="delete-vertex"&&Y&&l&&Nt()}),s("#finish-draw").onclick=yt,s("#cancel-draw").onclick=()=>{u="select",h=[],G()},s("#editor-snap").onchange=R=>g=R.target.checked,s("#fit-editor").onclick=H;function nt(R,U){if(!R.length)return;U.push(D());const Y=R.pop();o=Y.design,n(Y.settings),a=o.shapes.some(ot=>ot.id===a)?a:o.shapes[0]?.id,l=null,c=null,u="select",h=[],$(),L(),t(ze(o)),et()}s("#undo-design").onclick=()=>nt(_,m),s("#redo-design").onclick=()=>nt(m,_),document.addEventListener("keydown",R=>{!document.body.classList.contains("designer-mode")||s("#info-dialog").open||["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)||((R.ctrlKey||R.metaKey)&&R.key.toLowerCase()==="z"&&(R.preventDefault(),nt(R.shiftKey?m:_,R.shiftKey?_:m)),R.key==="Escape"&&s("#cancel-draw").click(),R.key==="Enter"&&u!=="select"&&(R.preventDefault(),yt()),(R.key==="Delete"||R.key==="Backspace")&&document.activeElement===y&&(R.preventDefault(),s(l?"#delete-vertex":c!==null?"#delete-cut":"#delete-shape").click()))});function rt(R,U=!0){U&&b(),o=ze(R),a=o.shapes[0]?.id,l=null,c=null,u="select",h=[],$(),H(),L(),t(ze(o)),et()}s("#load-preset").onclick=()=>{o.modified&&!confirm("Replace the current design with this preset? You can undo, or save JSON first.")||e(s("#design-preset").value)},s("#blank-design").onclick=()=>{o.shapes.length&&!confirm("Start a blank tread? You can undo this.")||rt({...o,name:"Untitled tread",modified:!0,shapes:[]})},s("#save-design").onclick=()=>{const{design:R,...U}=i();X(JSON.stringify({format:"frontier-tread",version:1,design:o,settings:U},null,2),"frontier-tread-project.json","application/json")},s("#load-design").onclick=()=>s("#design-file").click(),s("#design-file").onchange=async R=>{const U=R.target.files[0];if(U)try{if(U.size>5*1024*1024)throw new Error("Project exceeds 5 MB");const Y=JSON.parse(await U.text());if(Y.format!=="frontier-tread"||Y.version!==1)throw new Error("Choose a Frontier version-1 JSON project");Ss(Y.design);const ot={...i(),...Y.settings,pattern:Y.design.preset};if(delete ot.design,el(ot),o.modified&&!confirm("Replace the current design with this project?"))return;b(),n(ot),rt(Y.design,!1),r("Project loaded — mirrors and dimensions restored")}catch(Y){r(`Cannot open project: ${Y.message}`)}finally{R.target.value=""}},s("#export-svg").onclick=()=>X(Hc(o,i()),"frontier-tread-outlines.svg","image/svg+xml"),s("#designer-reference").onclick=()=>s("#blueprint").dispatchEvent(new CustomEvent("click",{detail:{presetOnly:!0}})),$(),H(),et();let Et=JSON.stringify(A());return{getDesign:()=>ze(o),loadPreset:R=>{const U=pe.find(Y=>Y.id===R);b(),n({...i(),pattern:R,width:U.width,depth:U.depth,repeats:U.repeats}),rt(Os(R),!1)},refresh:()=>{const R=JSON.stringify(A());Et!==R?(Et=R,H(),Z()):G()}}}const Dc={type:"change"},nl={type:"start"},Nh={type:"end"},us=new ih,Ic=new Nn,W0=Math.cos(70*th.DEG2RAD),_e=new I,Ue=2*Math.PI,ie={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},bo=1e-6;class X0 extends bf{constructor(t,e=null){super(t,e),this.state=ie.NONE,this.target=new I,this.cursor=new I,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Bi.ROTATE,MIDDLE:Bi.DOLLY,RIGHT:Bi.PAN},this.touches={ONE:Ni.ROTATE,TWO:Ni.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new I,this._lastQuaternion=new ci,this._lastTargetPosition=new I,this._quat=new ci().setFromUnitVectors(t.up,new I(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new $l,this._sphericalDelta=new $l,this._scale=1,this._panOffset=new I,this._rotateStart=new ct,this._rotateEnd=new ct,this._rotateDelta=new ct,this._panStart=new ct,this._panEnd=new ct,this._panDelta=new ct,this._dollyStart=new ct,this._dollyEnd=new ct,this._dollyDelta=new ct,this._dollyDirection=new I,this._mouse=new ct,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Y0.bind(this),this._onPointerDown=$0.bind(this),this._onPointerUp=q0.bind(this),this._onContextMenu=ev.bind(this),this._onMouseWheel=K0.bind(this),this._onKeyDown=J0.bind(this),this._onTouchStart=Q0.bind(this),this._onTouchMove=tv.bind(this),this._onMouseDown=j0.bind(this),this._onMouseMove=Z0.bind(this),this._interceptControlDown=nv.bind(this),this._interceptControlUp=iv.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Dc),this.update(),this.state=ie.NONE}update(t=null){const e=this.object.position;_e.copy(e).sub(this.target),_e.applyQuaternion(this._quat),this._spherical.setFromVector3(_e),this.autoRotate&&this.state===ie.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(n)&&isFinite(r)&&(n<-Math.PI?n+=Ue:n>Math.PI&&(n-=Ue),r<-Math.PI?r+=Ue:r>Math.PI&&(r-=Ue),n<=r?this._spherical.theta=Math.max(n,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+r)/2?Math.max(n,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=o!=this._spherical.radius}if(_e.setFromSpherical(this._spherical),_e.applyQuaternion(this._quatInverse),e.copy(this.target).add(_e),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=_e.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),s=!!l}else if(this.object.isOrthographicCamera){const a=new I(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=l!==this.object.zoom;const c=new I(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=_e.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(us.origin.copy(this.object.position),us.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(us.direction))<W0?this.object.lookAt(this.target):(Ic.setFromNormalAndCoplanarPoint(this.object.up,this.target),us.intersectPlane(Ic,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>bo||8*(1-this._lastQuaternion.dot(this.object.quaternion))>bo||this._lastTargetPosition.distanceToSquared(this.target)>bo?(this.dispatchEvent(Dc),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Ue/60*this.autoRotateSpeed*t:Ue/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){_e.setFromMatrixColumn(e,0),_e.multiplyScalar(-t),this._panOffset.add(_e)}_panUp(t,e){this.screenSpacePanning===!0?_e.setFromMatrixColumn(e,1):(_e.setFromMatrixColumn(e,0),_e.crossVectors(this.object.up,_e)),_e.multiplyScalar(t),this._panOffset.add(_e)}_pan(t,e){const n=this.domElement;if(this.object.isPerspectiveCamera){const r=this.object.position;_e.copy(r).sub(this.target);let s=_e.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*s/n.clientHeight,this.object.matrix),this._panUp(2*e*s/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),r=t-n.left,s=e-n.top,o=n.width,a=n.height;this._mouse.x=r/o*2-1,this._mouse.y=-(s/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ue*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ue*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Ue*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Ue*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Ue*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Ue*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),r=.5*(t.pageY+e.y);this._rotateStart.set(n,r)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),r=.5*(t.pageY+e.y);this._panStart.set(n,r)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,r=t.pageY-e.y,s=Math.sqrt(n*n+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),r=.5*(t.pageX+n.x),s=.5*(t.pageY+n.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ue*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ue*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),r=.5*(t.pageY+e.y);this._panEnd.set(n,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,r=t.pageY-e.y,s=Math.sqrt(n*n+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new ct,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function $0(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function Y0(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function q0(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Nh),this.state=ie.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function j0(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Bi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=ie.DOLLY;break;case Bi.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ie.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ie.ROTATE}break;case Bi.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ie.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ie.PAN}break;default:this.state=ie.NONE}this.state!==ie.NONE&&this.dispatchEvent(nl)}function Z0(i){switch(this.state){case ie.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case ie.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case ie.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function K0(i){this.enabled===!1||this.enableZoom===!1||this.state!==ie.NONE||(i.preventDefault(),this.dispatchEvent(nl),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Nh))}function J0(i){this.enabled!==!1&&this._handleKeyDown(i)}function Q0(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Ni.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=ie.TOUCH_ROTATE;break;case Ni.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=ie.TOUCH_PAN;break;default:this.state=ie.NONE}break;case 2:switch(this.touches.TWO){case Ni.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=ie.TOUCH_DOLLY_PAN;break;case Ni.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=ie.TOUCH_DOLLY_ROTATE;break;default:this.state=ie.NONE}break;default:this.state=ie.NONE}this.state!==ie.NONE&&this.dispatchEvent(nl)}function tv(i){switch(this._trackPointer(i),this.state){case ie.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case ie.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case ie.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case ie.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=ie.NONE}}function ev(i){this.enabled!==!1&&i.preventDefault()}function nv(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function iv(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}class rv extends dh{constructor(){super();const t=new pi;t.deleteAttribute("uv");const e=new Hi({side:Le}),n=new Hi,r=new Mf(16777215,900,28,2);r.position.set(.418,16.199,.3),this.add(r);const s=new fe(t,e);s.position.set(-.757,13.219,.717),s.scale.set(31.713,28.305,28.591),this.add(s);const o=new Id(t,n,6),a=new Me;a.position.set(-10.906,2.009,1.846),a.rotation.set(0,-.195,0),a.scale.set(2.328,7.905,4.651),a.updateMatrix(),o.setMatrixAt(0,a.matrix),a.position.set(-5.607,-.754,-.758),a.rotation.set(0,.994,0),a.scale.set(1.97,1.534,3.955),a.updateMatrix(),o.setMatrixAt(1,a.matrix),a.position.set(6.167,.857,7.803),a.rotation.set(0,.561,0),a.scale.set(3.927,6.285,3.687),a.updateMatrix(),o.setMatrixAt(2,a.matrix),a.position.set(-2.017,.018,6.124),a.rotation.set(0,.333,0),a.scale.set(2.002,4.566,2.064),a.updateMatrix(),o.setMatrixAt(3,a.matrix),a.position.set(2.291,-.756,-2.621),a.rotation.set(0,-.286,0),a.scale.set(1.546,1.552,1.496),a.updateMatrix(),o.setMatrixAt(4,a.matrix),a.position.set(-2.193,-.369,-5.547),a.rotation.set(0,.516,0),a.scale.set(3.875,3.487,2.986),a.updateMatrix(),o.setMatrixAt(5,a.matrix),this.add(o);const l=new fe(t,Ii(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);const c=new fe(t,Ii(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);const u=new fe(t,Ii(17));u.position.set(14.904,12.198,-1.832),u.scale.set(.15,4.265,6.331),this.add(u);const h=new fe(t,Ii(43));h.position.set(-.462,8.89,14.52),h.scale.set(4.38,5.441,.088),this.add(h);const d=new fe(t,Ii(20));d.position.set(3.235,11.486,-12.541),d.scale.set(2.5,2,.1),this.add(d);const f=new fe(t,Ii(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){const t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(const e of t)e.dispose()}}function Ii(i){return new gf({color:0,emissive:16777215,emissiveIntensity:i})}class sv{parse(t){let e="",n=0,r=0,s=0;const o=new I,a=new Yt,l=new I,c=new ct,u=[];function h(g){let _=0,m=0,p=0;const T=g.geometry,y=new Xt,v=T.getAttribute("position"),A=T.getAttribute("normal"),P=T.getAttribute("uv"),L=T.getIndex();if(e+="o "+g.name+`
`,g.material&&g.material.name&&(e+="usemtl "+g.material.name+`
`),v!==void 0)for(let D=0,b=v.count;D<b;D++,_++)o.fromBufferAttribute(v,D),o.applyMatrix4(g.matrixWorld),e+="v "+o.x+" "+o.y+" "+o.z+`
`;if(P!==void 0)for(let D=0,b=P.count;D<b;D++,p++)c.fromBufferAttribute(P,D),e+="vt "+c.x+" "+c.y+`
`;if(A!==void 0){y.getNormalMatrix(g.matrixWorld);for(let D=0,b=A.count;D<b;D++,m++)l.fromBufferAttribute(A,D),l.applyMatrix3(y).normalize(),e+="vn "+l.x+" "+l.y+" "+l.z+`
`}if(L!==null)for(let D=0,b=L.count;D<b;D+=3){for(let M=0;M<3;M++){const C=L.getX(D+M)+1;u[M]=n+C+(A||P?"/"+(P?r+C:"")+(A?"/"+(s+C):""):"")}e+="f "+u.join(" ")+`
`}else for(let D=0,b=v.count;D<b;D+=3){for(let M=0;M<3;M++){const C=D+M+1;u[M]=n+C+(A||P?"/"+(P?r+C:"")+(A?"/"+(s+C):""):"")}e+="f "+u.join(" ")+`
`}n+=_,r+=p,s+=m}function d(g){let _=0;const m=g.geometry,p=g.type,T=m.getAttribute("position");if(e+="o "+g.name+`
`,T!==void 0)for(let y=0,v=T.count;y<v;y++,_++)o.fromBufferAttribute(T,y),o.applyMatrix4(g.matrixWorld),e+="v "+o.x+" "+o.y+" "+o.z+`
`;if(p==="Line"){e+="l ";for(let y=1,v=T.count;y<=v;y++)e+=n+y+" ";e+=`
`}if(p==="LineSegments")for(let y=1,v=y+1,A=T.count;y<A;y+=2,v=y+1)e+="l "+(n+y)+" "+(n+v)+`
`;n+=_}function f(g){let _=0;const m=g.geometry,p=m.getAttribute("position"),T=m.getAttribute("color");if(e+="o "+g.name+`
`,p!==void 0){for(let y=0,v=p.count;y<v;y++,_++)o.fromBufferAttribute(p,y),o.applyMatrix4(g.matrixWorld),e+="v "+o.x+" "+o.y+" "+o.z,T!==void 0&&(a.fromBufferAttribute(T,y),Jt.workingToColorSpace(a,He),e+=" "+a.r+" "+a.g+" "+a.b),e+=`
`;e+="p ";for(let y=1,v=p.count;y<=v;y++)e+=n+y+" ";e+=`
`}n+=_}return t.traverse(function(g){g.isMesh===!0&&h(g),g.isLine===!0&&d(g),g.isPoints===!0&&f(g)}),e}}class ov{parse(t,e={}){e=Object.assign({binary:!1},e);const n=e.binary,r=[];let s=0;t.traverse(function(p){if(p.isMesh){const T=p.geometry,y=T.index,v=T.getAttribute("position");s+=y!==null?y.count/3:v.count/3,r.push({object3d:p,geometry:T})}});let o,a=80;if(n===!0){const p=s*2+s*3*4*4+80+4,T=new ArrayBuffer(p);o=new DataView(T),o.setUint32(a,s,!0),a+=4}else o="",o+=`solid exported
`;const l=new I,c=new I,u=new I,h=new I,d=new I,f=new I;for(let p=0,T=r.length;p<T;p++){const y=r[p].object3d,v=r[p].geometry,A=v.index,P=v.getAttribute("position");if(A!==null)for(let L=0;L<A.count;L+=3){const D=A.getX(L+0),b=A.getX(L+1),M=A.getX(L+2);g(D,b,M,P,y)}else for(let L=0;L<P.count;L+=3){const D=L+0,b=L+1,M=L+2;g(D,b,M,P,y)}}return n===!1&&(o+=`endsolid exported
`),o;function g(p,T,y,v,A){l.fromBufferAttribute(v,p),c.fromBufferAttribute(v,T),u.fromBufferAttribute(v,y),A.isSkinnedMesh===!0&&(A.applyBoneTransform(p,l),A.applyBoneTransform(T,c),A.applyBoneTransform(y,u)),l.applyMatrix4(A.matrixWorld),c.applyMatrix4(A.matrixWorld),u.applyMatrix4(A.matrixWorld),_(l,c,u),m(l),m(c),m(u),n===!0?(o.setUint16(a,0,!0),a+=2):(o+=`		endloop
`,o+=`	endfacet
`)}function _(p,T,y){h.subVectors(y,T),d.subVectors(p,T),h.cross(d).normalize(),f.copy(h).normalize(),n===!0?(o.setFloat32(a,f.x,!0),a+=4,o.setFloat32(a,f.y,!0),a+=4,o.setFloat32(a,f.z,!0),a+=4):(o+="	facet normal "+f.x+" "+f.y+" "+f.z+`
`,o+=`		outer loop
`)}function m(p){n===!0?(o.setFloat32(a,p.x,!0),a+=4,o.setFloat32(a,p.y,!0),a+=4,o.setFloat32(a,p.z,!0),a+=4):o+="			vertex "+p.x+" "+p.y+" "+p.z+`
`}}}function av(i){if(!i||typeof i!="object"||Array.isArray(i))return{...Rs};const{patternRevision:t=0,...e}=i,n={...Rs,...e};if(el(n),n.design&&Ss(n.design),!pe.some(s=>s.id===n.pattern))throw new Error("Unknown saved pattern");const r={radius:340,width:305,depth:20,repeats:28,gap:1};return t<5&&n.pattern==="mud"&&Object.entries(r).every(([s,o])=>n[s]===o)&&(n.repeats=pe.find(s=>s.id==="mud").repeats),n}const Lt=i=>document.querySelector(i);let It={...Rs};try{const i=JSON.parse(localStorage.getItem("frontier-tread-v1"));i&&(It=av(i))}catch{}let Ir,un=!1,Pe,Se,qe,ln,hr,ke,Aa,vs=!1,Cs=!1;const To=i=>Math.round(i).toLocaleString("en-US"),lv=[...pe.filter(i=>i.reference),...pe.filter(i=>!i.reference)];Lt("#pattern-filters").innerHTML=[["all","All",pe.length],["new","New",pe.filter(i=>i.reference).length],["original","Original",pe.filter(i=>!i.reference).length]].map(([i,t,e])=>`<button data-filter="${i}" aria-pressed="${i==="all"}">${t} <span>${e}</span></button>`).join("");Lt("#pattern-filters").addEventListener("click",i=>{const t=i.target.closest("[data-filter]");if(!t)return;const e=t.dataset.filter;document.querySelectorAll("[data-filter]").forEach(n=>n.setAttribute("aria-pressed",n===t)),document.querySelectorAll("[data-pattern]").forEach(n=>{const r=!!pe.find(s=>s.id===n.dataset.pattern).reference;n.hidden=e==="new"&&!r||e==="original"&&r}),Lt("#patterns").scrollLeft=0});Lt("#patterns").innerHTML=lv.map(i=>`<button class="pattern-card" data-pattern="${i.id}" aria-pressed="false"><span class="pattern-thumb">${kc(i.id,8)}</span><span><span class="pattern-code">${i.code}${i.reference?" <em>REV 07</em>":""}</span><span class="pattern-name">${i.name}</span><span class="pattern-terrain">${i.terrain}</span></span><span class="selected-dot"></span></button>`).join("");function Fh(){const i=pe.find(t=>t.id===It.pattern);document.querySelectorAll("[data-pattern]").forEach(t=>{const e=t.dataset.pattern===It.pattern;t.classList.toggle("active",e),t.setAttribute("aria-pressed",e)}),Lt("#model-title").innerHTML=`${Fn(It.design?.name??i.name)}<span> / ${String(i.source).padStart(2,"0")}</span>`,Lt("#model-subtitle").textContent=`${It.width} mm · ${It.repeats} repeats · ${It.depth} mm depth`;for(const t of["width","radius","depth","repeats","gap"]){const e=Lt(`#${t}`);e.value=It[t],e.style.setProperty("--progress",`${(It[t]-Number(e.min))/(Number(e.max)-Number(e.min))*100}%`),Lt(`#${t}-value`).value=t==="gap"?`${It[t].toFixed(2)}×`:It[t]}Ir?.refresh(),Lt("#sipes").checked=It.sipes,Lt("#casing").checked=It.casing,document.querySelectorAll("[data-view]").forEach(t=>{const e=t.dataset.view===It.view;t.classList.toggle("active",e),t.setAttribute("aria-pressed",e)})}function Uc(i){i?.traverse(t=>{t.isMesh&&(t.geometry.dispose(),t.material.dispose())})}function Oh(i=!1){if(clearTimeout(Aa),!Se)return;const t=performance.now();let e;try{const n=z0(It);e=new ar,e.name=`Frontier_${It.pattern}_${It.view}_mm`;const r=new Hi({color:un?"#829879":"#555b64",roughness:.86,metalness:0,wireframe:un}),s=new fe(n.geometry,r);if(s.name="Extruded_tread_blocks_and_sipes",s.castShadow=!0,s.receiveShadow=!0,e.add(s),It.casing){const a=new fe(k0(It),new Hi({color:un?"#728b65":"#24272c",roughness:.92,wireframe:un}));if(a.name=It.view==="tire"?"Carcass_with_inner_liner":"Flat_backing",a.castShadow=!0,a.receiveShadow=!0,e.add(a),It.view==="tire")for(const l of[-1,1]){const c=new fe(new ja(It.radius*.645,1.5,8,160),new Hi({color:"#353b31",roughness:.8,wireframe:un}));c.rotation.y=Math.PI/2,c.position.x=l*It.width*.405,c.name=`Bead_detail_${l}`,e.add(c)}}Pe&&(ke.remove(Pe),Uc(Pe)),Pe=e,ke.add(Pe),hr.position.y=It.view==="tire"?-It.radius-It.depth-2:-14.5;let o=0;Pe.traverse(a=>{a.isMesh&&(o+=(a.geometry.index?.count??a.geometry.attributes.position.count)/3)}),Lt("#block-count").textContent=To(n.blocks),Lt("#block-count").title=n.ejectors?`Plus ${n.ejectors} low stone-ejector bars, counted separately`:"Full-height tread blocks and rib sections",Lt("#triangle-count").textContent=To(o),Lt("#status").textContent=`${It.view==="flat"?"6-repeat sample":"Full circumference"} · ${To(performance.now()-t)} ms build`,(i||!Cs)&&Us(),window.dispatchEvent(new Event("frontier-render")),Cs=!0,Lt("#error").hidden=!0,Lt("#export").disabled=!1;try{localStorage.setItem("frontier-tread-v1",JSON.stringify({...It,patternRevision:vr}))}catch{}window.__treadLab={settings:{...It},triangles:o,blocks:n.blocks,ejectors:n.ejectors,revision:vr,ready:!0}}catch(n){e&&e!==Pe&&Uc(e),console.error(n),Lt("#error").textContent=`Preview paused${Pe?" — showing the last valid mesh":""}. ${n.message}`,Lt("#error").hidden=!1,Lt("#export").disabled=!0,Lt("#status").textContent="Preview paused — repair the outline or undo",window.__treadLab={...window.__treadLab,ready:!1,error:n.message}}finally{Lt("#loading").hidden=!0}}function Ur(i=!1){Fh(),clearTimeout(Aa),Lt("#export").disabled=!0;try{localStorage.setItem("frontier-tread-v1",JSON.stringify({...It,patternRevision:vr}))}catch{}Aa=setTimeout(()=>Oh(i),100)}function Us(){if(!Pe)return;const i=new $n().setFromObject(Pe),t=i.getCenter(new I),e=i.getSize(new I);if(i.isEmpty())return;const n=ln.aspect,r=Math.max(e.y,e.z,e.x),s=th.degToRad(ln.fov),o=r/(2*Math.tan(s/2))*1.55/Math.min(1,n*.95),a=It.view==="tire"?new I(.82,.37,1):new I(.18,1,.65);ln.position.copy(t).add(a.normalize().multiplyScalar(o)),qe.target.copy(t),qe.minDistance=r*.48,qe.maxDistance=r*6,qe.update()}function cv(){const i=Lt("#viewport");ke=new dh,ke.background=new Yt("#101215"),ke.fog=new Wa("#101215",2400,5500),ln=new Ve(33,1,1,1e4),Se=new a0({antialias:!0,alpha:!1}),Se.setPixelRatio(Math.min(window.devicePixelRatio,2)),Se.shadowMap.enabled=!0,Se.shadowMap.type=Gc,Se.toneMapping=Wc,Se.toneMappingExposure=1.05,i.append(Se.domElement),Se.domElement.setAttribute("aria-label","3D polygonal tire mesh; drag to rotate and scroll to zoom"),Se.domElement.setAttribute("role","img");const t=new ya(Se),e=new rv,n=t.fromScene(e,.025);ke.environment=n.texture,ke.environmentIntensity=.35,e.dispose(),t.dispose(),ke.add(new xf("#ffffff","#a0a5a7",.95));const r=new fo("#ffffff",2.5);r.position.set(-350,900,650),r.castShadow=!0,r.shadow.mapSize.set(2048,2048),r.shadow.camera.left=-650,r.shadow.camera.right=650,r.shadow.camera.top=650,r.shadow.camera.bottom=-650,r.shadow.camera.near=1,r.shadow.camera.far=2400,r.shadow.normalBias=.8,r.shadow.bias=-15e-5,r.shadow.radius=3,ke.add(r);const s=new fo("#e4ecff",1.2);s.position.set(700,200,-400),ke.add(s);const o=new fo("#ffffff",1.4);o.position.set(-400,200,-650),ke.add(o),hr=new fe(new Lr(2e4,2e4),new Hi({color:"#101215",roughness:1})),hr.rotation.x=-Math.PI/2,hr.receiveShadow=!0,ke.add(hr),qe=new X0(ln,Se.domElement),qe.enableDamping=!0,qe.dampingFactor=.08,qe.autoRotateSpeed=.6,qe.maxPolarAngle=Math.PI*.89,new ResizeObserver(()=>{const{width:d,height:f}=i.getBoundingClientRect();ln.aspect=d/f,ln.updateProjectionMatrix(),Se.setSize(d,f),Cs&&Us(),window.dispatchEvent(new Event("frontier-render"))}).observe(i);const{width:l,height:c}=i.getBoundingClientRect();ln.aspect=l/c,ln.updateProjectionMatrix(),Se.setSize(l,c);let u=!0;qe.addEventListener("change",()=>{u=!0});const h=()=>{u=!0};document.addEventListener("input",h),document.addEventListener("change",h),document.addEventListener("click",h),window.addEventListener("frontier-render",h),Se.setAnimationLoop(()=>{qe.autoRotate=vs,qe.update(),u&&(Se.render(ke,ln),u=!1)}),Se.domElement.addEventListener("webglcontextlost",d=>{d.preventDefault(),Lt("#error").textContent="The 3D graphics context was lost. Reload the page to restore the viewer.",Lt("#error").hidden=!1,Lt("#export").disabled=!0}),Oh(!0)}let Nc;function Ps(i){Lt("#toast").textContent=i,Lt("#toast").classList.add("visible"),clearTimeout(Nc),Nc=setTimeout(()=>Lt("#toast").classList.remove("visible"),3500)}Lt("#patterns").addEventListener("click",i=>{const t=i.target.closest("[data-pattern]");if(!t)return;const e=pe.find(n=>n.id===t.dataset.pattern);It.design?.modified&&!confirm("Replace your edited tread with this preset? Save JSON first to keep a copy.")||Bh(e.id)});for(const i of["width","radius","depth","repeats","gap"])Lt(`#${i}`).addEventListener("input",t=>{It[i]=Number(t.target.value),Ur()});for(const i of["sipes","casing"])Lt(`#${i}`).addEventListener("change",t=>{It[i]=t.target.checked,Ur()});Lt("#view-control").addEventListener("click",i=>{const t=i.target.closest("[data-view]");t&&(It.view=t.dataset.view,Ur(!0))});Lt("#wireframe").addEventListener("click",()=>{un=!un,Lt("#wireframe").setAttribute("aria-pressed",un),Pe?.traverse(i=>{i.isMesh&&(i.material.wireframe=un,i.material.color.set(un?"#718968":i.name.includes("Carcass")?"#24272c":"#555b64"))})});Lt("#rotate").addEventListener("click",()=>{vs=!vs,Lt("#rotate").setAttribute("aria-pressed",vs)});Lt("#reset-camera").addEventListener("click",Us);Lt("#reset-settings").addEventListener("click",()=>{const i=pe.find(t=>t.id===It.pattern);It={...Rs,pattern:i.id,width:i.width,depth:i.depth,repeats:i.repeats,view:It.view,design:It.design},Ur(!0),Ps("Mesh dimensions restored; your shapes are preserved")});document.addEventListener("keydown",i=>{i.key.toLowerCase()==="f"&&!["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)&&!Lt("#info-dialog").open&&Us()});Lt("#export").addEventListener("click",async()=>{if(!Pe||!Cs)return;const i=Lt("#export");i.disabled=!0,Lt("#status").textContent="Preparing mesh export…",await new Promise(t=>setTimeout(t,30));try{Pe.updateMatrixWorld(!0);const t=Lt("#export-format").value,e=t==="obj"?new sv().parse(Pe):new ov().parse(Pe,{binary:!0}),n=new Blob([e],{type:t==="obj"?"text/plain":"application/octet-stream"}),r=URL.createObjectURL(n),s=document.createElement("a");s.href=r,s.download=`frontier-${It.design?.modified?"custom-"+(It.design.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,45)||"tread"):It.pattern}-${It.view}-${It.width}mm.${t}`,s.click(),setTimeout(()=>URL.revokeObjectURL(r),3e4),Ps(`${t.toUpperCase()} exported · ${(n.size/1024/1024).toFixed(1)} MB · millimeters`),Lt("#status").textContent="Mesh export complete"}catch(t){console.error(t),Ps("Export failed. Try fewer circumference repeats."),Lt("#status").textContent="Export failed"}finally{i.disabled=!1}});function Ra(i){Lt("#dialog-content").innerHTML=i,Lt("#info-dialog").showModal()}Lt("#close-dialog").addEventListener("click",()=>Lt("#info-dialog").close());Lt("#info-dialog").addEventListener("click",i=>{if(i.target===Lt("#info-dialog")){const t=i.target.getBoundingClientRect();(i.clientX<t.left||i.clientX>t.right||i.clientY<t.top||i.clientY>t.bottom)&&i.target.close()}});Lt("#about").addEventListener("click",()=>Ra(`<div class="section-eyebrow">FRONTIER / TREAD LAB</div><h2>Geometry you can get a grip on.</h2><p>${pe.length} procedural tread studies: four from your supplied photographs and four new web-reference off-road interpretations. Each pattern uses explicit polygon outlines, extruded blocks, beveled edges, and recessed geometric sipe cuts.</p><p>No textures, normal maps, bump maps, or displacement maps are used. Everything runs locally in your browser.</p><p><strong>Export notes</strong><br>OBJ preserves named components. STL is binary. Coordinates are in millimeters; STL itself is unitless, so choose mm when importing. The flat view exports a six-repeat sample; the wrapped view exports the full tire.</p><p class="dialog-fineprint">Revision 7 adds an editable polygon designer with linked mirrors, arbitrary shape types, two-pitch membership, JSON projects, SVG outlines and undo/redo. New off-road outlines have been revised; they remain unverified reference studies, not exact matches. Original source presets are retained. These are reference-based approximations, not exact scans or engineering-validated tires. Exports contain separate/intersecting closed solids, not a boolean-unioned, watertight manufacturing mesh. Union/remesh and validate before 3D printing.</p>`));Lt("#blueprint").addEventListener("click",i=>{const t=pe.find(s=>s.id===It.pattern);if(It.design?.modified&&!i.detail?.presetOnly){Ra(`<div class="section-eyebrow">CUSTOM CONSTRUCTION / TWO-PITCH CELL</div><h2>${Fn(It.design.name)}</h2><div class="custom-blueprint">${Hc(It.design,It)}</div><p>Your current source polygons and mirrored copies, before groove spacing and bevels. Drag the handles in Designer to change these shapes. The actual mesh is arrayed around the tyre using the circumference repeat count.</p><p class="dialog-fineprint">Preset origin: ${t.name}. Edits are your own construction, not a validated match to the reference. Save JSON to preserve editable mirrors; SVG exports construction outlines only.</p>`);return}const e=t.id==="rugged"?Bc:t.id==="mud"?zc:null,n=t.id==="mud"?"The center blocks have broad flat ends, not spear tips. Hooked shoulders overlap their stagger without closing the grooves; bars are only 24% of tread depth.":"Paired lugs mirror both width and travel direction, including their notches and sipes. The green center lug is self-mirrored.",r=e?`<ul class="family-key">${Object.entries(e).map(([s,o])=>`<li><i style="background:${o}"></i>${s.replaceAll("-"," ")}</li>`).join("")}</ul><p>${n}</p>`:"";Ra(`<div class="section-eyebrow">PATTERN BLUEPRINT / ${t.code}</div><h2>${t.name}</h2><div class="blueprint-layout"><div class="blueprint-diagram">${kc(t.id,6,{annotate:!!e})}</div><div class="blueprint-details"><span class="small-tag">VECTOR CONSTRUCTION</span><h3>Study ${t.source} of ${pe.length}</h3><p>${t.description}</p>${r}<p>${t.id==="rugged"?"The colors mark matching lug families; they do not add textures to the mesh.":t.id==="mud"?"The dark shapes become extruded lugs; pale bars are lower stone ejectors.":"The dark shapes become extruded lugs."} The spaces between them are open grooves. Fine lines become shallow sipe cuts with mesh walls and floors.</p><p>This diagram shows the unmodified source outlines. Use the flat 3D view to inspect your current parameters.</p></div></div>${t.reference?`<section class="web-reference"><div><span class="section-eyebrow">WEB REFERENCE / VISUAL INSPIRATION</span><h3><a href="${t.reference.url}" target="_blank" rel="noreferrer">${t.reference.title} ↗</a></h3><p>${t.reference.note}</p><a class="photo-credit" href="${t.reference.photoSource}" target="_blank" rel="noreferrer">${t.reference.photoCredit} ↗</a></div><img src="./${t.reference.image.replace(/^\//,"")}" alt="Reference photograph of ${t.reference.title}, not the generated mesh" loading="lazy"/></section>`:""}<p class="dialog-fineprint">${t.reference?"Original reference-inspired study; not an exact replica or manufacturer-endorsed design. Preset dimensions are modeling defaults, not product specifications. Reference photographs are shown for comparison only and are never used as mesh textures.":"Hand-authored interpretation of the supplied photograph; not an exact trace."}</p>`)});function Bh(i){Ir.loadPreset(i)}Ir=G0({getSettings:()=>It,onChange:i=>{It={...It,pattern:i.preset,design:i},Ur(!0)},onPreset:Bh,onImport:i=>{It={...i}},onMessage:Ps});It.design=Ir.getDesign();It.pattern=It.design.preset;let Ca="designer";try{Ca=localStorage.getItem("frontier-ui-mode")||Ca}catch{}function zh(i){document.body.classList.toggle("designer-mode",i==="designer"),document.querySelectorAll("[data-workspace]").forEach(t=>t.setAttribute("aria-pressed",t.dataset.workspace===i));try{localStorage.setItem("frontier-ui-mode",i)}catch{}Ir.refresh()}document.querySelectorAll("[data-workspace]").forEach(i=>i.addEventListener("click",()=>zh(i.dataset.workspace)));zh(Ca);Fh();Lt("#export").disabled=!0;try{cv()}catch(i){console.error(i),Lt("#error").textContent="The 3D viewer needs WebGL. Enable hardware acceleration in your browser, then reload. You can still explore the pattern blueprints.",Lt("#error").hidden=!1,Lt("#status").textContent="WebGL unavailable"}
