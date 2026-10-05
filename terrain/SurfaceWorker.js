import {BakeSurface} from './SurfaceBake.js';
self.onmessage=({data})=>{
 const {revision,meshes,settings}=data;
 try{
  const result=BakeSurface(meshes,settings,message=>self.postMessage({revision,progress:message}));
  self.postMessage({revision,result},[...Object.values(result.maps).map(v=>v.buffer),...result.uvs.map(v=>v.buffer)]);
 }catch(e){self.postMessage({revision,error:e.message});}
};
