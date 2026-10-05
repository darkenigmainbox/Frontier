// CPU median-split BVH, flattened depth-first with escape indices for stackless
// GPU traversal. Build on scene changes; refit bounds for moving/deforming meshes.
export class TriangleBVH {
 build(triangles){
  const count=triangles.length/20,order=Array.from({length:count},(_,i)=>i);this.nodes=[];
  const centroid=(i,a)=>(triangles[i*20+a]+triangles[i*20+4+a]+triangles[i*20+8+a])/3;
  const build=(start,end)=>{
   const index=this.nodes.length,node={start,count:end-start,escape:0,left:-1,right:-1};this.nodes.push(node);
   if(end-start>4){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let j=start;j<end;j++)for(let a=0;a<3;a++){const c=centroid(order[j],a);lo[a]=Math.min(lo[a],c);hi[a]=Math.max(hi[a],c);}let axis=0;for(let a=1;a<3;a++)if(hi[a]-lo[a]>hi[axis]-lo[axis])axis=a;
    const sorted=order.slice(start,end).sort((a,b)=>centroid(a,axis)-centroid(b,axis));for(let j=0;j<sorted.length;j++)order[start+j]=sorted[j];
    const mid=(start+end)>>1;node.count=0;node.left=build(start,mid);node.right=build(mid,end);
   }node.escape=this.nodes.length;return index;
  };
  if(count)build(0,count);this.order=order;this.triangles=new Float32Array(triangles.length);this.data=new Float32Array(Math.max(1,this.nodes.length)*12);this.refit(triangles);return this;
 }
 refit(source){
  for(let i=0;i<this.order.length;i++)this.triangles.set(source.subarray(this.order[i]*20,this.order[i]*20+20),i*20);
  for(let i=this.nodes.length-1;i>=0;i--){const n=this.nodes[i],j=i*12,d=this.data;d[j]=d[j+1]=d[j+2]=Infinity;d[j+4]=d[j+5]=d[j+6]=-Infinity;
   if(n.count){for(let t=n.start;t<n.start+n.count;t++)for(let v=0;v<3;v++)for(let a=0;a<3;a++){const val=this.triangles[t*20+v*4+a];d[j+a]=Math.min(d[j+a],val-.0001);d[j+4+a]=Math.max(d[j+4+a],val+.0001);}}
   else for(const child of [n.left,n.right])for(let a=0;a<3;a++){d[j+a]=Math.min(d[j+a],d[child*12+a]);d[j+4+a]=Math.max(d[j+4+a],d[child*12+4+a]);}
   d[j+3]=n.escape;d[j+7]=n.start;d[j+8]=n.count;
  }
  return this;
 }
}
