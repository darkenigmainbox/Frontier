import {ParticleSimulation} from './ParticleSimulation.js';
let simulation;
self.onmessage=({data})=>{
 const {revision,action,spec,gravity,steps=1}=data;
 try{
  if(action==='build')simulation=new ParticleSimulation(spec,gravity);
  else if(action==='step'){
   if(!simulation)throw Error('Build particles first');
   for(let i=0;i<Math.max(1,Math.min(25,Math.round(steps)));i++)simulation.step(spec);
  }else throw Error('Unknown particle action');
  const result=simulation.snapshot();self.postMessage({revision,result},[result.attributes.buffer]);
 }catch(e){self.postMessage({revision,error:e.message});}
};
