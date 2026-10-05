const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export const CRC32=data=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const concat=arrays=>{const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){out.set(a,offset);offset+=a.length;}return out;};
// Write raw RGBA, including RGB behind zero alpha. Canvas PNG encoding would lose splat RGB there.
export async function EncodePNG(width,height,rgba){
 if(typeof CompressionStream==='undefined')throw Error('PNG export needs a current browser with CompressionStream support.');
 const scanlines=new Uint8Array(height*(width*4+1));for(let y=0;y<height;y++)scanlines.set(rgba.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
 const compressed=new Uint8Array(await new Response(new Blob([scanlines]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
 const chunk=(type,bytes)=>{const name=encoder.encode(type),out=new Uint8Array(bytes.length+12),view=new DataView(out.buffer);view.setUint32(0,bytes.length);out.set(name,4);out.set(bytes,8);view.setUint32(bytes.length+8,CRC32(out.subarray(4,bytes.length+8)));return out;};
 const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=6;
 return concat([new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())]);
}
export function ZipFiles(files){
 const parts=[],directory=[];let offset=0;
 for(const {name,data}of files){
  const filename=encoder.encode(name),bytes=typeof data==='string'?encoder.encode(data):data,crc=CRC32(bytes),header=new Uint8Array(30+filename.length),v=new DataView(header.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,filename.length,true);header.set(filename,30);
  parts.push(header,bytes);
  const central=new Uint8Array(46+filename.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);central.set(filename,46);directory.push(central);offset+=header.length+bytes.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,directory.reduce((n,a)=>n+a.length,0),true);v.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/zip'});
}
export function SurfaceOBJ(meshes,uvs,transform=p=>p){
 const lines=['# Frontier geometry-derived surface atlas. Placement applied; no displacement.','mtllib rock.mtl','usemtl rock','s off'];let vertexOffset=1,uvOffset=1;
 meshes.forEach((mesh,m)=>{
  lines.push(`o ${mesh.Name.replace(/[^a-zA-Z0-9]+/g,'_')}`);
  for(const p of mesh.Vertices)lines.push('v '+transform(p).map(v=>v.toFixed(8)).join(' '));
  for(let i=0;i<uvs[m].length;i+=2)lines.push(`vt ${uvs[m][i].toFixed(8)} ${(1-uvs[m][i+1]).toFixed(8)}`);
  mesh.Triangles.forEach((t,i)=>lines.push('f '+t.map((v,k)=>`${v+vertexOffset}/${uvOffset+i*3+k}`).join(' ')));
  vertexOffset+=mesh.Vertices.length;uvOffset+=uvs[m].length/2;
 });return lines.join('\n')+'\n';
}
