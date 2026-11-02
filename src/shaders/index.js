import { rippleShaders } from './ripple.js';
import { particleSimShaders } from './particles.js';
import { particleRenderShaders } from './particleRender.js';
import { waterShaders } from './water.js';
import { postShaders } from './post.js';

// Registry of every custom shader: [name, vertex, fragment, defines]
export function allShaders() {
  const out = [];
  const add = (group) => { for (const [name, v] of Object.entries(group)) out.push([name, v[0], v[1], v[2] || {}]); };
  add(rippleShaders);
  add(particleSimShaders);
  add(particleRenderShaders);
  add(waterShaders);
  add(postShaders);
  return out;
}
