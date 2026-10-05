// Scene placement is separate from geological generation: it never invalidates mesh checkpoints.
export function ReadPlacement(spec={}){
 const result={};
 for(const [key,fallback,min,max] of [['Position',[0,0,0],-500,500],['Rotation',[0,0,0],-Math.PI*100,Math.PI*100],['Scale',[1,1,1],.05,10]]){
  const name='Transform'+key,value=spec[name]??fallback;
  if(!Array.isArray(value)||value.length!==3||!value.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max))throw Error(`${key} must contain three finite values between ${min} and ${max}.`);
  result[name]=value.slice();
 }
 return result;
}
