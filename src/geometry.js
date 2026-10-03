import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { PATTERNS, patternBlocks } from './patterns.js';
import { designBlocks, validateDesign } from './design.js';

const featuresFor = (settings, parity) => settings.design ? designBlocks(settings.design, parity) : patternBlocks(settings.pattern, parity);
const emptyGeometry = () => new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3)).setAttribute('normal',new THREE.Float32BufferAttribute([],3));

export const DEFAULTS = { pattern: 'rugged', radius: 340, width: 285, depth: 16, repeats: 32, gap: 1, sipes: true, view: 'tire', casing: true };

export function validateSettings(s) {
  for (const key of ['radius','width','depth','repeats','gap']) if (!Number.isFinite(s[key])) throw new Error(`${key} must be finite`);
  if (s.radius < 250 || s.radius > 500 || s.width < 180 || s.width > 360 || s.depth < 4 || s.depth > 26 || s.repeats < 20 || s.repeats > 72 || s.repeats % 2 || s.gap < .65 || s.gap > 1.6) throw new Error('Settings outside supported limits');
  if (!['tire','flat'].includes(s.view)) throw new Error('Unknown view');
}

// Buffer a polyline with explicit polygons. These are subtracted from the
// upper lug footprint, so every sipe has actual walls and a recessed floor.
function sipePolygon(points, width) {
  const parts = [];
  for (let i=1;i<points.length;i++) {
    const [a,b] = [points[i-1],points[i]];
    const len = Math.hypot(b[0]-a[0],b[1]-a[1]);
    if (len < 1e-6) continue;
    const nx = -(b[1]-a[1])/len*width/2, ny = (b[0]-a[0])/len*width/2;
    parts.push([[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny],[a[0]+nx,a[1]+ny]]]);
    const r = width/2;
    parts.push([Array.from({length:9},(_,j)=>[b[0]+r*Math.cos(j*Math.PI/4), b[1]+r*Math.sin(j*Math.PI/4)])]);
  }
  return parts.length ? polygonClipping.union(...parts) : [];
}

function extrude(polygons, bottom, height, bevel = 0) {
  const shapes = polygons.map(poly => {
    const shape = new THREE.Shape(poly[0].map(p=>new THREE.Vector2(...p)));
    for (const hole of poly.slice(1)) shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(...p))));
    return shape;
  });
  if (!shapes.length) return null;
  const geo = new THREE.ExtrudeGeometry(shapes, {depth: height, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 1});
  geo.translate(0,0,bottom);
  geo.deleteAttribute('uv');
  return geo;
}

function unitGeometry(settings, parity) {
  const { pattern, width, radius, repeats, depth, sipes, gap } = settings;
  const pitch = 2*Math.PI*radius/repeats;
  const parts = [];
  const profile = PATTERNS.find(p => p.id === pattern);
  for (const b of featuresFor(settings,parity)) {
    const cx = b.points.reduce((sum,p)=>sum+p[0],0)/b.points.length;
    const cy = b.points.reduce((sum,p)=>sum+p[1],0)/b.points.length;
    const scale = 1 - (gap-1)*.14;
    const transform = ([x,y]) => [(cx+(x-cx)*scale)*width,(b.continuous ? y : cy+(y-cy)*scale)*pitch];
    const height = depth * (b.heightRatio ?? 1);
    const sipeWidth = profile.sipeWidth * width/profile.width;
    const bevel = Math.min(.2, sipeWidth*.18);
    const outline = b.points.map(transform);
    outline.push([...outline[0]]);
    const footprint = [[outline]];
    const cutters = sipes ? b.sipes.map(p=>sipePolygon(p.map(transform), sipeWidth)) : [];
    const top = cutters.length ? polygonClipping.difference(footprint, ...cutters) : footprint;
    const split = height*.70;
    // Lower and upper closed solids meet at the sipe floor. They are an
    // assembly, deliberately not a boolean-unioned manufacturing solid.
    if (cutters.length) {
      parts.push(extrude(footprint, -2, split+2));
      parts.push(extrude(top, split, height-split-bevel, bevel));
    } else parts.push(extrude(footprint, -2, height+1.65, .35));
  }
  if(!parts.length)return emptyGeometry();
  const merged = mergeGeometries(parts.filter(Boolean), false);
  parts.filter(Boolean).forEach(g=>g.dispose());
  // Subdivide before bending: the tread is real polygon extrusion, not a
  // displacement/height-field. This only follows the cylindrical carcass.
  const tessellated = new TessellateModifier(22, 3).modify(merged);
  merged.dispose();
  return tessellated;
}

export const crown = (x,width) => 17*Math.pow(x/(width*.5), 2);

export function buildTreads(settings) {
  validateSettings(settings);
  if(settings.design)validateDesign(settings.design,{geometry:true});
  const {radius,width,repeats,view} = settings;
  const units = [unitGeometry(settings,0),unitGeometry(settings,1)];
  const count = view === 'flat' ? 6 : repeats;
  const pitch = 2*Math.PI*radius/repeats;
  const geometries = [];
  for (let i=0;i<count;i++) {
    const geo = units[i%2].clone();
    const pos = geo.getAttribute('position');
    for (let j=0;j<pos.count;j++) {
      const x = pos.getX(j), along = pos.getY(j)+i*pitch, h = pos.getZ(j);
      if (view === 'tire') {
        const a = along/radius;
        const r = radius-crown(x,width)+h;
        pos.setXYZ(j,x,r*Math.sin(a),r*Math.cos(a));
      } else pos.setXYZ(j,x,h,-(along-count*pitch/2));
    }
    geo.computeVertexNormals();
    geometries.push(geo);
  }
  const result = mergeGeometries(geometries, false);
  [...geometries,...units].forEach(g=>g.dispose());
  result.computeBoundingBox(); result.computeBoundingSphere();
  const features = Array.from({length: count},(_,i)=>featuresFor(settings,i%2)).flat();
  return { geometry: result, blocks: features.filter(b=>b.role!=='ejector').length, ejectors: features.filter(b=>b.role==='ejector').length, count };
}

export function buildCasing(settings) {
  const {radius:r,width:w,view,repeats} = settings;
  if (view === 'flat') {
    let min=0,max=6;
    // Staggered off-road blocks cross the repeat boundaries. Support the entire
    // six-repeat assembly instead of leaving its last lugs floating beyond
    // the rectangular backing. Keep the other three backing meshes unchanged.
    const fitBacking = !!settings.design || settings.pattern === 'mud' || PATTERNS.find(p=>p.id===settings.pattern)?.fitBacking;
    if (fitBacking) {
      min=Infinity;max=-Infinity;
      const scale=1-(settings.gap-1)*.14;
      for(let i=0;i<6;i++) for(const b of featuresFor(settings,i%2)) {
        const cy=b.points.reduce((sum,p)=>sum+p[1],0)/b.points.length;
        for(const [,y] of b.points){const along=i+cy+(y-cy)*scale;min=Math.min(min,along);max=Math.max(max,along);}
      }
    }
    if(!Number.isFinite(min)||!Number.isFinite(max)){min=0;max=6;}
    const pitch=2*Math.PI*r/repeats;
    const margin=fitBacking?2:0;
    const g = new THREE.BoxGeometry(w,14,(max-min)*pitch+margin);
    g.translate(0,-7,-((min+max)/2-3)*pitch);
    return g;
  }
  const half = w/2;
  // Closed radial cross-section, including the inner liner and bead seats.
  const profile = [
    [0,r-1.1],[half*.65,r-8.3],[half*.94,r-16.1],
    [half*1.015,r-20.2],[half*1.035,r-60],[half*.98,r-96],
    [half*.84,r*.635],[half*.78,r*.622],[half*.73,r*.635],
    [half*.86,r-100],[half*.91,r-65],[half*.85,r-35],
    [half*.60,r-23],[0,r-20],
    [-half*.60,r-23],[-half*.85,r-35],[-half*.91,r-65],
    [-half*.86,r-100],[-half*.73,r*.635],[-half*.78,r*.622],
    [-half*.84,r*.635],[-half*.98,r-96],[-half*1.035,r-60],
    [-half*1.015,r-20.2],[-half*.94,r-16.1],[-half*.65,r-8.3],
  ];
  const curve = new THREE.CatmullRomCurve3(profile.map(([x,y])=>new THREE.Vector3(x,y,0)),true,'centripetal');
  const points = curve.getPoints(104).slice(0,-1);
  const positions=[], indices=[];
  const n=points.length, segments=192;
  for (let i=0;i<segments;i++) {
    const a=i/segments*2*Math.PI;
    for(const p of points) positions.push(p.x,p.y*Math.sin(a),p.y*Math.cos(a));
  }
  for(let i=0;i<segments;i++) for(let j=0;j<n;j++) {
    const a=i*n+j,b=((i+1)%segments)*n+j,c=((i+1)%segments)*n+(j+1)%n,d=i*n+(j+1)%n;
    indices.push(a,d,b,b,d,c);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}
