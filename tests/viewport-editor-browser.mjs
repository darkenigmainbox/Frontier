import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '@playwright/test';import {createServer} from 'vite';
const server=await createServer({configFile:false,root:'site',server:{host:'0.0.0.0',port:5196}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 page.setDefaultTimeout(90000);
 await page.goto('http://127.0.0.1:5196/terrain/index.html');
 const ready=()=>page.waitForFunction(()=>window.CliffApp?.State.Result&&!CliffApp.State.Busy&&!CliffApp.State.Dirty,null,{timeout:120000});await ready();
 assert.equal(await page.locator('#RouteCanvas').count(),0,'no inspector spline editor');
 assert(await page.locator('#ToolSpline').isDisabled());
 // Hit-test real gizmo geometry, then drag it with actual browser pointer events.
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 for(const [tool,axis,property]of [['Move','X','TransformPosition'],['Rotate','Y','TransformRotation'],['Scale','X','TransformScale']]){
  await page.click('#Frame');await page.click('#Tool'+tool);await frame();
  const start=await page.evaluate(({axis})=>{
   const a=CliffApp,g=a.ViewportEditor.gizmo,rect=a.Renderer.domElement.getBoundingClientRect();a.Scene.updateMatrixWorld(true);
   const origin=g.object.getWorldPosition(a.Camera.position.clone()).project(a.Camera);
   for(const mesh of g._gizmo.gizmo[g.mode].children){
    if(mesh.name!==axis||!mesh.visible||!mesh.geometry)continue;
    const positions=mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i+=Math.max(1,Math.floor(positions.count/80))){
     const p=a.Camera.position.clone().fromBufferAttribute(positions,i);mesh.localToWorld(p);p.project(a.Camera);
     g.pointerHover({x:p.x,y:p.y,button:-1});
     const x=rect.left+(p.x+1)*rect.width/2,y=rect.top+(1-p.y)*rect.height/2;
     if(g.axis===axis&&y>rect.top+145&&x>rect.left+20&&x<rect.right-20&&y<rect.bottom-120)return {x,y,ox:rect.left+(origin.x+1)*rect.width/2,oy:rect.top+(1-origin.y)*rect.height/2};
    }
   }
   return null;
  },{axis});assert(start,`${tool}: reachable visible axis handle`);
  const beforePose=await page.evaluate(property=>JSON.stringify(CliffApp.State.Specification[property]),property);
  const dx=start.x-start.ox,dy=start.y-start.oy,length=Math.hypot(dx,dy)||1;
  const delta=tool==='Rotate'?[-dy/length*30,dx/length*30]:[dx/length*30,dy/length*30];
  await page.mouse.move(start.x,start.y);await page.mouse.down();assert(await page.evaluate(()=>CliffApp.ViewportEditor.gizmo.dragging),tool+' begins drag');
  assert(!(await page.evaluate(()=>CliffApp.Controls.enabled)),'orbit disabled during gizmo drag');
  await page.mouse.move(start.x+delta[0],start.y+delta[1],{steps:6});await page.mouse.up();
  assert.notEqual(await page.evaluate(property=>JSON.stringify(CliffApp.State.Specification[property]),property),beforePose,tool+' changes placement');
  assert(await page.evaluate(()=>CliffApp.Controls.enabled));await page.click('#ToolReset');
 }
 await page.evaluate(()=>CliffApp.SetSpecification({Profile:'RouteCliff',Width:48,Height:18,Depth:24}));await ready();
 await page.click('#Top');await page.click('#ToolSpline');
 assert.equal(await page.evaluate(()=>CliffApp.ViewportEditor.mode),'Spline');
 assert(await page.locator('.SplineActions').isVisible());
 const project=async(index)=>page.evaluate(index=>{
  const a=CliffApp,e=a.ViewportEditor,r=a.Renderer.domElement.getBoundingClientRect();a.Scene.updateMatrixWorld(true);
  const p=e.handles.children[index].getWorldPosition(a.Camera.position.clone()).project(a.Camera);
  return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
 },index);
 const initial=await page.evaluate(()=>JSON.stringify(CliffApp.State.Specification.RoutePoints));
 const p=await project(1);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+25,p.y+15,{steps:4});await page.mouse.up();await ready();
 assert.notEqual(await page.evaluate(()=>JSON.stringify(CliffApp.State.Specification.RoutePoints)),initial,'actual viewport drag updates route');
 assert(await page.evaluate(()=>CliffApp.Controls.enabled));
 const before=await page.evaluate(()=>CliffApp.ObjText());await page.keyboard.press('ArrowRight');await ready();assert.notEqual(await page.evaluate(()=>CliffApp.ObjText()),before);
 await page.click('#SplineAdd');await ready();assert.equal(await page.evaluate(()=>CliffApp.State.Specification.RoutePoints.length),5);
 await page.click('#SplineRemove');await ready();assert.equal(await page.evaluate(()=>CliffApp.State.Specification.RoutePoints.length),4);
 // Exercise gizmo events with known transforms, then verify persisted placement and exported coordinates.
 await page.click('#ToolMove');assert.equal(await page.evaluate(()=>CliffApp.ViewportEditor.gizmo.mode),'translate');
 const vertex=await page.evaluate(()=>CliffApp.ObjText().split('\n').find(l=>l.startsWith('v ')).split(' ').slice(1).map(Number));
 await page.evaluate(()=>{const e=CliffApp.ViewportEditor;e.root.position.x+=7;e.gizmo.dispatchEvent({type:'objectChange'});});
 const moved=await page.evaluate(()=>CliffApp.ObjText().split('\n').find(l=>l.startsWith('v ')).split(' ').slice(1).map(Number));assert(Math.abs(moved[0]-vertex[0]-7)<1e-6);
 await page.click('#ToolRotate');await page.evaluate(()=>{const e=CliffApp.ViewportEditor;e.root.rotation.set(.2,.45,0);e.gizmo.dispatchEvent({type:'objectChange'});});
 await page.click('#ToolScale');await page.evaluate(()=>{const e=CliffApp.ViewportEditor;e.root.scale.set(1.3,.8,1.1);e.gizmo.dispatchEvent({type:'objectChange'});});
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Specification.TransformScale),[1.3,.8,1.1]);
 assert.equal(await page.evaluate(()=>CliffApp.State.Dirty),false,'placement does not rebuild geological meshes');
 const expected=await page.evaluate(()=>{
  const a=CliffApp,s=a.State.Specification,p=a.State.Result.Stages[0].Meshes[0].Vertices[0];
  const [sx,sy,sz]=s.TransformScale,[rx,ry]=s.TransformRotation,[tx,ty,tz]=s.TransformPosition;
  const x=p[0]*sx,y=p[1]*sy,z=(p[2]+s.Depth/2)*sz;
  const xx=Math.cos(ry)*x+Math.sin(ry)*z,zz=-Math.sin(ry)*x+Math.cos(ry)*z;
  return [xx+tx,Math.cos(rx)*y-Math.sin(rx)*zz+ty,Math.sin(rx)*y+Math.cos(rx)*zz+tz-s.Depth/2];
 });
 const exported=await page.evaluate(()=>CliffApp.ObjText().split('\n').find(l=>l.startsWith('v ')).split(' ').slice(1).map(Number));
 assert(expected.every((v,i)=>Math.abs(v-exported[i])<1e-6),'OBJ applies scale and rotation about the ground-centre pivot');

 // Drag a control point after the formation has moved, rotated and scaled.
 await page.click('#ToolSpline');const posed=await page.evaluate(()=>JSON.stringify(CliffApp.State.Specification.RoutePoints));
 const pp=await project(2);await page.mouse.move(pp.x,pp.y);await page.mouse.down();await page.mouse.move(pp.x+14,pp.y+8,{steps:4});await page.mouse.up();await ready();
 assert.notEqual(await page.evaluate(()=>JSON.stringify(CliffApp.State.Specification.RoutePoints)),posed);
 const saved=await page.evaluate(()=>structuredClone(CliffApp.State.Specification));
 const download=page.waitForEvent('download');await page.click('#ExportRecipe');const recipe=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));assert.equal(recipe.Version,12);
 await page.click('#ToolReset');assert.deepEqual(await page.evaluate(()=>CliffApp.State.Specification.TransformScale),[1,1,1]);
 const importRevision=await page.evaluate(()=>CliffApp.State.Revision);
 await page.setInputFiles('#RecipeFile',{name:'viewport.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recipe))});await page.waitForFunction(revision=>CliffApp.State.Revision>revision,importRevision);await ready();
 assert.deepEqual(await page.evaluate(()=>CliffApp.State.Specification),saved);
 assert.deepEqual(await page.evaluate(()=>CliffApp.ViewportEditor.root.scale.toArray()),[1.3,.8,1.1]);
 await page.click('#Frame');await page.click('#ToolMove');await frame();
 fs.mkdirSync('.arena',{recursive:true});fs.writeFileSync('.arena/viewport-move.png',Buffer.from((await page.evaluate(()=>CliffApp.Renderer.domElement.toDataURL())).split(',')[1],'base64'));
 await page.click('#Top');await page.click('#ToolSpline');await frame();fs.writeFileSync('.arena/viewport-spline.png',Buffer.from((await page.evaluate(()=>CliffApp.Renderer.domElement.toDataURL())).split(',')[1],'base64'));
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(JSON.stringify({passed:true,viewportDragging:true,realGizmoDrags:3,posedSplineDragging:true,pointEditing:true,placementExport:true,recipeVersion:12,errors,failedRequests:failed},null,2));
}finally{await browser.close();await server.close();}
