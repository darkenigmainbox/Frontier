import {generateRock} from './geology.js';
self.onmessage=({data})=>{
  try{const start=performance.now();const mesh=generateRock(data.config);self.postMessage({id:data.id,mesh,ms:performance.now()-start},[mesh.positions.buffer,mesh.normals.buffer,mesh.colors.buffer,mesh.indices.buffer]);}
  catch(error){self.postMessage({id:data.id,error:error.message});}
};
