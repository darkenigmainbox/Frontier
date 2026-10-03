import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { DEFAULTS, buildTreads, buildCasing } from '../src/geometry.js';
import { PATTERNS, PATTERN_REVISION } from '../src/patterns.js';

const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const selection=option('--pattern','all');
const selectedPatterns=selection==='all'?PATTERNS:PATTERNS.filter(p=>selection==='new'?!!p.reference:p.id===selection);
if(!selectedPatterns.length)throw new Error(`--pattern must be all, new, or one of: ${PATTERNS.map(p=>p.id).join(', ')}`);
const format=option('--format','stl'),view=option('--view','both'),out=path.resolve(option('--out','exports'));
if(!['stl','obj'].includes(format))throw new Error('--format must be stl or obj');
if(!['both','tire','flat'].includes(view))throw new Error('--view must be both, tire or flat');
await fs.mkdir(out,{recursive:true});
const manifest={revision:PATTERN_REVISION,selection,units:'millimeters',originalReferences:'https://gist.github.com/SultanAladin/b9585bb30c92c916fbab8c740f85de37',notes:'Reference-based approximations. Polygonal mesh assemblies, not boolean-unioned print-ready solids. No texture, normal, bump, or displacement maps.',models:[]};
for(const p of selectedPatterns)for(const v of view==='both'?['tire','flat']:[view]){
  const settings={...DEFAULTS,pattern:p.id,width:p.width,depth:p.depth,repeats:p.repeats,view:v,casing:!args.includes('--tread-only')};
  const {geometry,blocks,ejectors}=buildTreads(settings);
  const model=new THREE.Group();model.name=`Frontier_${p.id}_${v}_mm`;
  const material=new THREE.MeshStandardMaterial({color:'#26292b'});
  const treads=new THREE.Mesh(geometry,material);treads.name='Extruded_tread_blocks_and_sipes';model.add(treads);
  if(settings.casing){
    const casing=new THREE.Mesh(buildCasing(settings),material);casing.name=v==='tire'?'Carcass_with_inner_liner':'Flat_backing';model.add(casing);
    if(v==='tire')for(const side of [-1,1]){
      const bead=new THREE.Mesh(new THREE.TorusGeometry(settings.radius*.645,1.5,8,160),material);
      bead.rotation.y=Math.PI/2;bead.position.x=side*settings.width*.405;bead.name=`Bead_detail_${side}`;model.add(bead);
    }
  }
  model.updateMatrixWorld(true);
  const filename=`frontier-${p.id}-${v}.${format}`;
  const content=format==='stl'?new STLExporter().parse(model,{binary:true}):new OBJExporter().parse(model);
  await fs.writeFile(path.join(out,filename),typeof content==='string'?content:Buffer.from(content.buffer,content.byteOffset,content.byteLength));
  let triangles=0;model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  manifest.models.push({filename,reference:p.source,provenance:p.reference ?? {title:'User-supplied reference photograph',url:manifest.originalReferences},settings,blocks,ejectors,triangles});
  console.log(`${filename}: ${triangles.toLocaleString()} triangles, ${blocks} blocks, ${ejectors} low ejector bars`);
  model.traverse(o=>{if(o.isMesh)o.geometry.dispose();});material.dispose();
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(out,'README.txt'),`FRONTIER — TREAD MESHES / REVISION ${PATTERN_REVISION}\n\nSelection: ${selection}. Hand-authored reference-inspired studies.\nRevision 7 revises the four off-road drafts and adds the browser polygon designer. All four original source patterns are unchanged.\nNot exact replicas or manufacturer-endorsed designs. Dimensions are modeling defaults.\n\nSelected studies:\n${selectedPatterns.map(p=>`${p.source}. ${p.name}: ${p.description}\n   Reference: ${p.reference?.title ?? 'User-supplied photograph'}\n   ${p.reference?.url ?? manifest.originalReferences}`).join('\n')}\n\nEach pattern includes a wrapped tire and/or a six-repeat flat sample.\nAll dimensions are in MILLIMETERS. STL files are unitless, so select mm\nwhen importing into Blender, CAD, or a slicer. In Blender, scale by 0.001\nif your scene treats 1 unit as 1 meter.\n\nThese are actual polygon meshes. Grooves are spaces between extruded\nblocks. Sipes have recessed floors and side walls. No textures or\nheight/displacement maps are needed.\n\nIMPORTANT: Geometry is a mesh assembly of separate, touching or\nintersecting solids, not a boolean-unioned, watertight manufacturing\nsolid. Union/remesh and validate before 3D printing. These are\nreference-based approximations, not exact scans or engineered tires.\n\nSee manifest.json for all dimensions and topology counts.\nRegenerate with: npm run export:meshes -- --pattern ${selection} --format ${format} --view ${view}\n`);
console.log(`Saved to ${out}`);
