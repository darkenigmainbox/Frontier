// Hard per-level probe budget. Overdue probes prevent starvation; changed-region
// probes receive the remaining slots before ordinary round-robin background work.
export class ProbeScheduler {
 configure(config){if(this.key===config.key)return;this.key=config.key;this.config=config;this.frame=0;this.cursor=[0,0,0];this.age=config.counts.map(n=>new Uint32Array(n));this.mark=config.counts.map(n=>new Uint8Array(n));this.ids=config.counts.map(n=>new Float32Array(Math.ceil(n/4)*4));}
 select(level,budget,reset,bounds){const config=this.config,n=config.counts[level],out=this.ids[level],age=this.age[level],mark=this.mark[level],dims=config.dims[level];mark.fill(0);const limit=reset?n:Math.ceil(n/budget);let count=0;
 const add=i=>{out[count++]=i;mark[i]=1;age[i]=this.frame;};
 for(let pass=0;pass<3&&count<limit;pass++)for(let j=0;j<n&&count<limit;j++){const i=(this.cursor[level]+j)%n;if(mark[i])continue;let eligible=reset||pass===2;if(pass===0)eligible=eligible||this.frame-age[i]>=budget*2;if(pass===1){const c=[i%dims[0],Math.floor(i/dims[0])%dims[1],Math.floor(i/(dims[0]*dims[1]))];eligible=c.every((v,a)=>{const spacing=config.size[a]/dims[a],p=config.min[a]+(v+.5)*spacing;return p>=bounds[a]-spacing&&p<=bounds[a+3]+spacing;});}if(eligible)add(i);}
 this.cursor[level]=(out[count-1]+1)%n;return count;
 }
}
