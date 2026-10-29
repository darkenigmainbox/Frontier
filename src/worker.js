import { meshFormation } from './geology.js';
self.onmessage = ({data}) => {
  try {
    let last=0;
    const result=meshFormation(data.options, p=>{ const now=Date.now(); if(now-last>120){self.postMessage({id:data.id,progress:p});last=now;} });
    self.postMessage({id:data.id,result},[result.positions.buffer,result.indices.buffer]);
  } catch(error) { self.postMessage({id:data.id,error:error.message}); }
};
