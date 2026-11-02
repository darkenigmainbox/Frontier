import * as THREE from 'three';

// Small helper layer for GPGPU passes on top of three.js WebGL2.
export class GPU {
  constructor(renderer) {
    this.renderer = renderer;
    const gl = renderer.getContext();
    this.gl = gl;
    // Additive blending into RGBA32F targets needs EXT_float_blend; otherwise fall back to half floats.
    this.floatBlend = !!gl.getExtension('EXT_float_blend');
    this.floatLinear = renderer.extensions.has('OES_texture_float_linear');
    this.colorBufferFloat = renderer.extensions.has('EXT_color_buffer_float');

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(geo);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  target(w, h, opts = {}) {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: opts.type ?? THREE.FloatType,
      format: opts.format ?? THREE.RGBAFormat,
      minFilter: opts.filter ?? THREE.NearestFilter,
      magFilter: opts.filter ?? THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: opts.depth ?? false,
      stencilBuffer: false,
      generateMipmaps: false,
      count: opts.count ?? 1,
      samples: 0,
    });
    if (opts.depthTexture) {
      rt.depthTexture = new THREE.DepthTexture(w, h);
      rt.depthTexture.type = THREE.FloatType;
      rt.depthBuffer = true;
    }
    return rt;
  }

  // Run a fullscreen pass into `target` (null = canvas).
  run(material, target, clear = false) {
    const r = this.renderer;
    this.quad.material = material;
    r.setRenderTarget(target);
    if (clear) r.clear(true, false, false);
    r.render(this.scene, this.camera);
  }

  clear(target, color = 0x000000, alpha = 0) {
    const r = this.renderer;
    const prevC = r.getClearColor(new THREE.Color());
    const prevA = r.getClearAlpha();
    r.setRenderTarget(target);
    r.setClearColor(color, alpha);
    r.clear(true, !!target?.depthBuffer, false);
    r.setClearColor(prevC, prevA);
  }
}

export function rawMaterial([vertexShader, fragmentShader], uniforms, opts = {}) {
  return new THREE.RawShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
    ...opts,
  });
}

export const additive = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
  transparent: true,
};

// A geometry whose only purpose is to make three.js issue N vertices (shader uses gl_VertexID).
export function vertexCountGeometry(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Uint8Array(n), 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return g;
}

// Instanced quad (4 verts, 2 tris) drawn `n` times (shader uses gl_InstanceID).
export function instancedQuadGeometry(n) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.instanceCount = n;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return g;
}
