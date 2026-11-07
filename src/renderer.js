// WebGPU renderer: shadow map -> HDR scene (sky, opaque, snow) -> bloom -> tonemap.
import { lookAt, ortho, mul, invert, m4, normalize3 } from './math.js';

const HDR_FORMAT = 'rgba16float';
const DEPTH_FORMAT = 'depth24plus';
const SHADOW_SIZE = 2048;
const OBJ_STRIDE = 256; // uniform buffer offset alignment
const SNOW_COUNT = 7000;

export async function createRenderer({ canvas, world, onError = console.error }) {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not available in this browser.');
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU adapter request failed.');
  const device = await adapter.requestDevice();

  device.addEventListener('uncapturederror', (e) => onError(e.error.message));

  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  // ---------------------------------------------------------------- shaders
  const fetchText = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
    return res.text();
  };
  const [sceneSrc, postSrc] = await Promise.all([
    fetchText('./src/scene.wgsl'),
    fetchText('./src/post.wgsl'),
  ]);

  const checkModule = async (module, label) => {
    if (module.getCompilationInfo) {
      const info = await module.getCompilationInfo();
      const errors = info.messages.filter((m) => m.type === 'error');
      for (const m of info.messages) {
        const line = `${label}:${m.lineNum}:${m.linePos} ${m.type}: ${m.message}`;
        if (m.type === 'error') onError(line);
        else console.warn(line);
      }
      if (errors.length) throw new Error(`${label} failed to compile (${errors.length} error(s))`);
    }
    return module;
  };

  const sceneModule = await checkModule(device.createShaderModule({ code: sceneSrc, label: 'scene' }), 'scene.wgsl');
  const postModule = await checkModule(device.createShaderModule({ code: postSrc, label: 'post' }), 'post.wgsl');

  // ----------------------------------------------------------------- buffers
  const mkBuffer = (data, usage, label) => {
    const buf = device.createBuffer({
      label,
      size: Math.max(4, Math.ceil(data.byteLength / 4) * 4),
      usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buf, 0, data);
    return buf;
  };
  const VB = GPUBufferUsage.VERTEX;

  const posBuf = mkBuffer(world.positions, VB, 'positions');
  const nrmBuf = mkBuffer(world.normals, VB, 'normals');
  const uvBuf = mkBuffer(world.uvs, VB, 'uvs');
  const extBuf = mkBuffer(world.extras, VB, 'extras');
  const idxBuf = mkBuffer(world.indices, GPUBufferUsage.INDEX, 'indices');
  const instBuf = mkBuffer(world.instances, GPUBufferUsage.STORAGE, 'instances');

  // Global uniforms -----------------------------------------------------------
  const globalsData = new Float32Array(88); // 352 bytes, matches Globals in WGSL
  const globalsBuf = device.createBuffer({
    size: globalsData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Per-object uniforms -------------------------------------------------------
  const draws = world.draws;
  const objData = new Float32Array((OBJ_STRIDE / 4) * draws.length);
  for (let i = 0; i < draws.length; i++) {
    const d = draws[i];
    const o = i * (OBJ_STRIDE / 4);
    // identity model matrix
    objData[o + 0] = 1; objData[o + 5] = 1; objData[o + 10] = 1; objData[o + 15] = 1;
    objData[o + 16] = d.matId;
    objData[o + 17] = d.rough ?? 0.5;
    objData[o + 18] = d.emissive ?? 0;
    objData[o + 19] = d.useInstance ? 1 : 0;
    objData[o + 20] = d.color1[0]; objData[o + 21] = d.color1[1]; objData[o + 22] = d.color1[2]; objData[o + 23] = 1;
    objData[o + 24] = d.color2[0]; objData[o + 25] = d.color2[1]; objData[o + 26] = d.color2[2]; objData[o + 27] = 1;
    objData[o + 28] = d.p?.[0] ?? 1; objData[o + 29] = d.p?.[1] ?? 0;
    objData[o + 30] = d.instanceOffset ?? 0; objData[o + 31] = d.instanceCount ?? 1;
  }
  const objBuf = device.createBuffer({
    size: objData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(objBuf, 0, objData);

  // ------------------------------------------------------------------ shadow
  const shadowTex = device.createTexture({
    size: [SHADOW_SIZE, SHADOW_SIZE],
    format: 'depth32float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const shadowView = shadowTex.createView();
  const shadowSampler = device.createSampler({
    compare: 'less',
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });

  // -------------------------------------------------------------- bind groups
  const bgl0 = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'comparison' } },
      { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });
  const bgl1 = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 128 } },
    ],
  });

  const bg0 = device.createBindGroup({
    layout: bgl0,
    entries: [
      { binding: 0, resource: { buffer: globalsBuf } },
      { binding: 1, resource: shadowView },
      { binding: 2, resource: shadowSampler },
      { binding: 3, resource: { buffer: instBuf } },
    ],
  });
  const bg1 = device.createBindGroup({
    layout: bgl1,
    entries: [{ binding: 0, resource: { buffer: objBuf, size: 128 } }],
  });

  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bgl0, bgl1] });

  // ---------------------------------------------------------------- pipelines
  const vertexBuffers = [
    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
    { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }] },
    { arrayStride: 8, attributes: [{ shaderLocation: 3, offset: 0, format: 'float32x2' }] },
  ];

  const mainPipeline = device.createRenderPipeline({
    label: 'main',
    layout: pipelineLayout,
    vertex: { module: sceneModule, entryPoint: 'vsMain', buffers: vertexBuffers },
    fragment: { module: sceneModule, entryPoint: 'fsMain', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list', cullMode: 'back', frontFace: 'ccw' },
    depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: 'less' },
  });

  const shadowPipeline = device.createRenderPipeline({
    label: 'shadow',
    layout: pipelineLayout,
    vertex: { module: sceneModule, entryPoint: 'vsShadow', buffers: vertexBuffers },
    primitive: { topology: 'triangle-list', cullMode: 'none', frontFace: 'ccw' },
    depthStencil: {
      format: 'depth32float',
      depthWriteEnabled: true,
      depthCompare: 'less',
      depthBias: 2,
      depthBiasSlopeScale: 3.0,
    },
  });

  const skyPipeline = device.createRenderPipeline({
    label: 'sky',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
    vertex: { module: sceneModule, entryPoint: 'vsSky' },
    fragment: { module: sceneModule, entryPoint: 'fsSky', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: 'always' },
  });

  const snowPipeline = device.createRenderPipeline({
    label: 'snow',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
    vertex: { module: sceneModule, entryPoint: 'vsSnow' },
    fragment: {
      module: sceneModule,
      entryPoint: 'fsSnow',
      targets: [{
        format: HDR_FORMAT,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: 'less' },
  });

  // ------------------------------------------------------------------- post
  const postBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });
  const postLayout = device.createPipelineLayout({ bindGroupLayouts: [postBGL] });
  const brightPipeline = device.createRenderPipeline({
    layout: postLayout,
    vertex: { module: postModule, entryPoint: 'vsQuad' },
    fragment: { module: postModule, entryPoint: 'fsBright', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list' },
  });
  const blurPipeline = device.createRenderPipeline({
    layout: postLayout,
    vertex: { module: postModule, entryPoint: 'vsQuad' },
    fragment: { module: postModule, entryPoint: 'fsBlur', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list' },
  });
  const compositePipeline = device.createRenderPipeline({
    layout: postLayout,
    vertex: { module: postModule, entryPoint: 'vsQuad' },
    fragment: { module: postModule, entryPoint: 'fsComposite', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  // Per-pass uniform slots.
  const postUniforms = [];
  for (let i = 0; i < 6; i++) {
    postUniforms.push(
      device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }),
    );
  }

  // --------------------------------------------------------------- render targets
  let size = { w: 1, h: 1 };
  let targets = null;

  const makeTargets = (w, h) => {
    const tex = (width, height, label) =>
      device.createTexture({
        label,
        size: [Math.max(1, width), Math.max(1, height)],
        format: HDR_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
    const bw = Math.max(1, Math.floor(w / 2));
    const bh = Math.max(1, Math.floor(h / 2));
    const hdr = tex(w, h, 'hdr');
    const depth = device.createTexture({
      size: [Math.max(1, w), Math.max(1, h)],
      format: DEPTH_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const bright = tex(bw, bh, 'bright');
    const blurA = tex(bw, bh, 'blurA');
    const blurB = tex(bw, bh, 'blurB');
    const dummy = tex(1, 1, 'dummy');

    const t = {
      hdr, depth, bright, blurA, blurB, dummy,
      hdrView: hdr.createView(),
      depthView: depth.createView(),
      brightView: bright.createView(),
      blurAView: blurA.createView(),
      blurBView: blurB.createView(),
      dummyView: dummy.createView(),
      bw, bh,
    };
    t.bgBright = device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: t.hdrView },
        { binding: 1, resource: t.dummyView },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: postUniforms[0] } },
      ],
    });
    t.bgBlurH1 = device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: t.brightView },
        { binding: 1, resource: t.dummyView },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: postUniforms[1] } },
      ],
    });
    t.bgBlurV1 = device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: t.blurAView },
        { binding: 1, resource: t.dummyView },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: postUniforms[2] } },
      ],
    });
    t.bgBlurH2 = device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: t.blurBView },
        { binding: 1, resource: t.dummyView },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: postUniforms[3] } },
      ],
    });
    t.bgBlurV2 = device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: t.blurAView },
        { binding: 1, resource: t.dummyView },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: postUniforms[4] } },
      ],
    });
    return t;
  };

  const resize = (w, h) => {
    const W = Math.max(1, Math.floor(w));
    const H = Math.max(1, Math.floor(h));
    if (W === size.w && H === size.h && targets) return;
    size = { w: W, h: H };
    if (targets) {
      for (const t of [targets.hdr, targets.depth, targets.bright, targets.blurA, targets.blurB, targets.dummy]) {
        t.destroy();
      }
    }
    targets = makeTargets(W, H);
  };

  // ------------------------------------------------------------------ render
  const g = globalsData;
  const lightView = m4();
  const lightProj = m4();

  const writeGlobals = (s) => {
    g.set(s.viewProj, 0);
    g.set(s.lightVP, 16);
    g.set(s.invViewProj, 32);
    g[48] = s.eye[0]; g[49] = s.eye[1]; g[50] = s.eye[2]; g[51] = 1;
    g[52] = s.right[0]; g[53] = s.right[1]; g[54] = s.right[2]; g[55] = 0;
    g[56] = s.up[0]; g[57] = s.up[1]; g[58] = s.up[2]; g[59] = 0;
    g[60] = s.sunDir[0]; g[61] = s.sunDir[1]; g[62] = s.sunDir[2]; g[63] = s.sunIntensity;
    g[64] = s.sunColor[0]; g[65] = s.sunColor[1]; g[66] = s.sunColor[2]; g[67] = 1;
    g[68] = s.skyTop[0]; g[69] = s.skyTop[1]; g[70] = s.skyTop[2]; g[71] = 1;
    g[72] = s.skyHorizon[0]; g[73] = s.skyHorizon[1]; g[74] = s.skyHorizon[2]; g[75] = 1;
    g[76] = s.skyGround[0]; g[77] = s.skyGround[1]; g[78] = s.skyGround[2]; g[79] = 1;
    g[80] = s.time; g[81] = s.night; g[82] = s.fog; g[83] = s.snow;
    g[84] = s.exposure; g[85] = 1 / SHADOW_SIZE; g[86] = 0; g[87] = 0;
    device.queue.writeBuffer(globalsBuf, 0, g);
  };

  const writePost = (s) => {
    const u = new Float32Array(12);
    const write = (i, p0, p1, p2) => {
      u.set(p0, 0); u.set(p1, 4); u.set(p2, 8);
      device.queue.writeBuffer(postUniforms[i], 0, u);
    };
    const tx = 1 / targets.bw;
    const ty = 1 / targets.bh;
    write(0, [s.bloomThreshold, 0.55, 0, 0], [s.exposure, s.bloomStrength, s.vignette, s.grain], [tx, ty, s.time, 0]);
    write(1, [s.bloomThreshold, 0.55, 1, 0], [s.exposure, s.bloomStrength, s.vignette, s.grain], [tx, ty, s.time, 0]);
    write(2, [s.bloomThreshold, 0.55, 0, 1], [s.exposure, s.bloomStrength, s.vignette, s.grain], [tx, ty, s.time, 0]);
    write(3, [s.bloomThreshold, 0.55, 2.2, 0], [s.exposure, s.bloomStrength, s.vignette, s.grain], [tx, ty, s.time, 0]);
    write(4, [s.bloomThreshold, 0.55, 0, 2.2], [s.exposure, s.bloomStrength, s.vignette, s.grain], [tx, ty, s.time, 0]);
    write(5, [s.bloomThreshold, 0.55, 0, 0], [s.exposure, s.bloomStrength, s.vignette, s.grain], [tx, ty, s.time, 0]);
  };

  const drawScene = (pass) => {
    for (let i = 0; i < draws.length; i++) {
      const d = draws[i];
      pass.setBindGroup(1, bg1, [i * OBJ_STRIDE]);
      if (d.useInstance) {
        pass.drawIndexed(d.indexCount, d.instanceCount, d.firstIndex, 0, d.instanceOffset);
      } else {
        pass.drawIndexed(d.indexCount, 1, d.firstIndex, 0, 0);
      }
    }
  };

  const render = (s) => {
    const w = Math.max(1, Math.floor(canvas.width));
    const h = Math.max(1, Math.floor(canvas.height));
    resize(w, h);

    // Directional light matrices (fitted to the village).
    const center = [0, 3, 2];
    const R = 78;
    const eye = [
      center[0] + s.sunDir[0] * R * 1.6,
      center[1] + s.sunDir[1] * R * 1.6,
      center[2] + s.sunDir[2] * R * 1.6,
    ];
    const up = Math.abs(s.sunDir[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0];
    lookAt(eye, center, up, lightView);
    ortho(-R, R, -R, R, 1, R * 3.4, lightProj);
    mul(lightProj, lightView, s.lightVP);

    writeGlobals(s);
    writePost(s);

    const encoder = device.createCommandEncoder();

    // 1) Shadow map
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: {
          view: shadowView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });
      pass.setPipeline(shadowPipeline);
      pass.setBindGroup(0, bg0);
      pass.setVertexBuffer(0, posBuf);
      pass.setVertexBuffer(1, nrmBuf);
      pass.setVertexBuffer(2, uvBuf);
      pass.setVertexBuffer(3, extBuf);
      pass.setIndexBuffer(idxBuf, 'uint32');
      for (let i = 0; i < draws.length; i++) {
        const d = draws[i];
        if (d.castShadow === false) continue;
        pass.setBindGroup(1, bg1, [i * OBJ_STRIDE]);
        pass.drawIndexed(d.indexCount, d.instanceCount, d.firstIndex, 0, d.useInstance ? d.instanceOffset : 0);
      }
      pass.end();
    }

    // 2) Scene (sky + opaque)
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: targets.hdrView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: targets.depthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });
      pass.setPipeline(skyPipeline);
      pass.setBindGroup(0, bg0);
      pass.draw(3);

      pass.setPipeline(mainPipeline);
      pass.setBindGroup(0, bg0);
      pass.setVertexBuffer(0, posBuf);
      pass.setVertexBuffer(1, nrmBuf);
      pass.setVertexBuffer(2, uvBuf);
      pass.setVertexBuffer(3, extBuf);
      pass.setIndexBuffer(idxBuf, 'uint32');
      drawScene(pass);

      if (s.snow > 0.001) {
        pass.setPipeline(snowPipeline);
        pass.setBindGroup(0, bg0);
        pass.draw(6, SNOW_COUNT);
      }
      pass.end();
    }

    // 3) Bloom chain
    const postPass = (pipeline, bg, view) => {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bg);
      pass.draw(3);
      pass.end();
    };
    postPass(brightPipeline, targets.bgBright, targets.brightView);
    postPass(blurPipeline, targets.bgBlurH1, targets.blurAView);
    postPass(blurPipeline, targets.bgBlurV1, targets.blurBView);
    postPass(blurPipeline, targets.bgBlurH2, targets.blurAView);
    postPass(blurPipeline, targets.bgBlurV2, targets.blurBView);

    // 4) Composite to the canvas
    const canvasView = context.getCurrentTexture().createView();
    const compositeBG = device.createBindGroup({
      layout: postBGL,
      entries: [
        { binding: 0, resource: targets.hdrView },
        { binding: 1, resource: targets.blurBView },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: postUniforms[5] } },
      ],
    });
    postPass(compositePipeline, compositeBG, canvasView);

    device.queue.submit([encoder.finish()]);
  };

  return {
    device,
    adapter,
    render,
    resize,
    stats: {
      draws: draws.length,
      shadowDraws: draws.filter((d) => d.castShadow !== false).length,
      instances: world.instanceCount,
      vertices: world.stats.vertices,
      triangles: world.stats.triangles,
      snow: SNOW_COUNT,
      format,
    },
  };
}
