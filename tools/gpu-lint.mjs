// =============================================================================
//  tools/gpu-lint.mjs — offline WebGPU validation harness.
//
//  There is no GPU in CI (and none in the sandbox this was written in), so this
//  file implements enough of the WebGPU object model *and its validation rules*
//  to run the real renderer headlessly and catch the class of mistakes that
//  otherwise only show up as "[Invalid CommandBuffer] ... due to a previous
//  error" in a browser:
//
//    * bind group layout / bind group mismatches (type, size, sample type)
//    * pipeline layouts whose visibility or binding types don't match the WGSL
//    * vertex attribute coverage for the vertex entry point
//    * render pass attachment formats vs the pipeline
//    * missing bind groups / vertex buffers / index buffer at draw time
//    * draw ranges that run off the end of the index or vertex buffers
//    * buffer/texture usage and size rules
//
//  Run:  node tools/gpu-lint.mjs
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ----------------------------------------------------------------- WGSL model
// Static analysis of a WGSL module: per entry point, which bindings and vertex
// inputs it (transitively) uses. naga validates the language, not the layouts.
export function analyseWGSL(src) {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  // global declarations: @group(g) @binding(b) var<...> name : type
  const globals = {};
  for (const m of clean.matchAll(
    /@group\((\d+)\)\s*@binding\((\d+)\)\s*var(?:<([^>]*)>)?\s+(\w+)\s*:\s*([^;]+);/g,
  )) {
    globals[m[4]] = { group: +m[1], binding: +m[2], access: (m[3] || '').trim(), type: m[5].trim() };
  }

  // function bodies
  const fns = {};
  const starts = [];
  for (const m of clean.matchAll(/fn\s+(\w+)\s*\(/g)) starts.push({ name: m[1], i: m.index });
  for (let k = 0; k < starts.length; k++) {
    const end = k + 1 < starts.length ? starts[k + 1].i : clean.length;
    fns[starts[k].name] = clean.slice(starts[k].i, end);
  }

  const params = (name) => {
    const body = fns[name] || '';
    const open = body.indexOf('(');
    const close = body.indexOf(')', open);
    return body.slice(open + 1, close);
  };

  const calledBy = (name, seen = new Set()) => {
    if (seen.has(name) || !fns[name]) return new Set();
    seen.add(name);
    const body = (fns[name] || '').slice((fns[name] || '').indexOf('{'));
    const out = new Set();
    for (const g of Object.keys(globals)) {
      if (new RegExp(`\\b${g}\\b`).test(body)) out.add(g);
    }
    for (const f of Object.keys(fns)) {
      if (f === name) continue;
      if (new RegExp(`\\b${f}\\s*\\(`).test(body)) for (const u of calledBy(f, seen)) out.add(u);
    }
    return out;
  };

  const entryPoints = {};
  for (const m of clean.matchAll(/@(vertex|fragment)\s+fn\s+(\w+)/g)) {
    const stage = m[1];
    const name = m[2];
    const inputs = [];
    if (stage === 'vertex') {
      for (const p of params(name).matchAll(/@location\((\d+)\)\s*\w+\s*:\s*([^,\n]+)/g)) {
        inputs.push({ location: +p[1], type: p[2].trim() });
      }
    }
    const bindings = [...calledBy(name)].map((g) => ({ name: g, ...globals[g] }));
    entryPoints[name] = { stage, inputs, bindings };
  }
  return { globals, entryPoints };
}

// ------------------------------------------------------------------- harness
const issues = [];
const fail = (msg) => issues.push(msg);

const fmtBytes = (n) => `${n} B`;

class MockBuffer {
  constructor(desc) {
    this.label = desc.label || 'buffer';
    this.size = desc.size;
    this.usage = desc.usage;
    this.data = null;
    if (!(this.size > 0)) fail(`${this.label}: buffer size must be > 0 (got ${desc.size})`);
    if (this.size % 4) fail(`${this.label}: buffer size ${this.size} is not a multiple of 4`);
    if (!this.usage) fail(`${this.label}: buffer needs a usage flag`);
    if (this.usage & 0x40 && this.usage & 0x20) fail(`${this.label}: MAP_READ + MAP_WRITE together`);
  }
}

class MockTexture {
  constructor(desc) {
    this.label = desc.label || 'texture';
    const [w, h] = desc.size;
    this.width = w;
    this.height = h;
    this.format = desc.format;
    this.usage = desc.usage;
    this.destroyed = false;
    if (!(w > 0 && h > 0)) fail(`${this.label}: texture size ${w}x${h} is invalid`);
    if (w > 8192 || h > 8192) fail(`${this.label}: texture ${w}x${h} exceeds maxTextureDimension2D (8192)`);
    if (!this.usage) fail(`${this.label}: texture needs a usage flag`);
    if (this.usage & 0x1) /* COPY_SRC */
      if (!this.format.startsWith('depth')) { /* fine */ }
  }
  createView() {
    if (this.destroyed) fail(`${this.label}: createView() on a destroyed texture`);
    return { texture: this, label: `${this.label}.view` };
  }
  destroy() {
    this.destroyed = true;
  }
}

class MockDevice {
  constructor() {
    this.limits = {
      maxStorageBuffersPerShaderStage: 8,
      maxStorageBuffersInVertexStage: 8,
      maxStorageTexturesPerShaderStage: 4,
      maxSampledTexturesPerShaderStage: 16,
      maxSamplersPerShaderStage: 16,
      maxUniformBuffersPerShaderStage: 12,
      maxBindingsPerBindGroup: 640,
      maxBindGroups: 4,
      maxDynamicUniformBuffersPerPipelineLayout: 8,
      minUniformBufferOffsetAlignment: 256,
      minStorageBufferOffsetAlignment: 256,
      maxVertexBuffers: 8,
      maxVertexAttributes: 16,
      maxInterStageShaderVariables: 16,
      maxBufferSize: 268435456,
      maxStorageBufferBindingSize: 134217728,
      maxUniformBufferBindingSize: 65536,
      maxTextureDimension2D: 8192,
    };
    this.features = new Set();
    this.queue = {
      writeBuffer: (buf, offset, data, dataOffset = 0, size) => {
        const bytes = (data.byteLength ?? data.length * 4) - dataOffset * 4;
        const n = size ?? bytes;
        if (offset % 4) fail(`writeBuffer(${buf.label}): offset ${offset} not 4-aligned`);
        if (n % 4) fail(`writeBuffer(${buf.label}): size ${n} not a multiple of 4`);
        if (!(buf.usage & 0x8)) fail(`writeBuffer(${buf.label}): buffer lacks COPY_DST usage`);
        if (offset + n > buf.size) fail(`writeBuffer(${buf.label}): ${offset}+${n} exceeds buffer size ${buf.size}`);
        if (!buf.data) buf.data = new Uint8Array(buf.size);
        const view = data instanceof Uint8Array ? data : new Uint8Array(data.buffer ?? data, data.byteOffset ?? 0, bytes);
        buf.data.set(view.subarray(dataOffset * 4, dataOffset * 4 + n), offset);
      },
      submit: (cmds) => {
        for (const c of cmds) {
          if (c.invalid) fail(`submit: command buffer is invalid (${c.reason})`);
          else for (const msg of c.issues) fail(msg);
        }
      },
    };
    this._lost = new Promise(() => {});
  }
  get lost() { return this._lost; }
  addEventListener() {}
  pushErrorScope() {}
  popErrorScope() { return Promise.resolve(null); }

  createBuffer(desc) { return new MockBuffer(desc); }
  createTexture(desc) { return new MockTexture(desc); }

  createSampler(desc) {
    const cmp = desc.compare;
    const filtering = (desc.magFilter || 'nearest') !== 'nearest' || (desc.minFilter || 'nearest') !== 'nearest';
    return { type: cmp ? 'comparison' : filtering ? 'filtering' : 'non-filtering', label: 'sampler' };
  }

  createShaderModule(desc) {
    const mod = { code: desc.code, label: desc.label, getCompilationInfo: async () => ({ messages: [] }) };
    mod.analysis = analyseWGSL(desc.code);
    return mod;
  }

  createBindGroupLayout(desc) {
    const seen = new Set();
    const counts = { vertex: { sb: 0, st: 0, smp: 0, tex: 0, uni: 0 }, fragment: { sb: 0, st: 0, smp: 0, tex: 0, uni: 0 } };
    for (const e of desc.entries) {
      if (seen.has(e.binding)) fail(`bind group layout: duplicate binding ${e.binding}`);
      seen.add(e.binding);
      const stages = [0x1 /* VERTEX */, 0x2 /* FRAGMENT */].filter((s) => e.visibility & s);
      for (const s of stages) {
        const c = counts[s === 0x1 ? 'vertex' : 'fragment'];
        if (e.buffer) {
          if (e.buffer.type === 'uniform') c.uni++;
          else { c.sb++; }
        } else if (e.texture) c.tex++;
        else if (e.sampler) c.smp++;
        else if (e.storageTexture) c.st++;
        else fail(`bind group layout: binding ${e.binding} has no resource`);
      }
      if (!stages.length) fail(`bind group layout: binding ${e.binding} has empty visibility`);
      if (e.buffer && e.buffer.type === 'uniform' && e.buffer.hasDynamicOffset && e.buffer.minBindingSize) {
        if (e.buffer.minBindingSize % 16) fail(`bind group layout: uniform minBindingSize ${e.buffer.minBindingSize} not 16-aligned`);
      }
    }
    for (const [stage, c] of Object.entries(counts)) {
      if (c.uni > this.limits.maxUniformBuffersPerShaderStage) fail(`bind group layout: ${c.uni} uniform buffers in ${stage}`);
      if (c.tex > this.limits.maxSampledTexturesPerShaderStage) fail(`bind group layout: ${c.tex} textures in ${stage}`);
      if (c.smp > this.limits.maxSamplersPerShaderStage) fail(`bind group layout: ${c.smp} samplers in ${stage}`);
      if (c.sb > this.limits.maxStorageBuffersPerShaderStage) fail(`bind group layout: ${c.sb} storage buffers in ${stage}`);
      if (c.st > this.limits.maxStorageTexturesPerShaderStage) fail(`bind group layout: ${c.st} storage textures in ${stage}`);
      // the compatibility-mode limit that bites storage-in-vertex implementations
      if (c.sb > this.limits.maxStorageBuffersInVertexStage) fail(`bind group layout: ${c.sb} storage buffers in ${stage} exceeds maxStorageBuffersInVertexStage (${this.limits.maxStorageBuffersInVertexStage})`);
    }
    if (desc.entries.length > this.limits.maxBindingsPerBindGroup) fail('bind group layout: too many bindings');
    return { entries: desc.entries, label: desc.label || 'bgl', id: Math.random() };
  }

  createPipelineLayout(desc) {
    if (desc.bindGroupLayouts.length > this.limits.maxBindGroups) fail(`pipeline layout: ${desc.bindGroupLayouts.length} bind groups exceeds maxBindGroups (${this.limits.maxBindGroups})`);
    let dynamic = 0;
    for (const b of desc.bindGroupLayouts) for (const e of b.entries) if (e.buffer && e.buffer.hasDynamicOffset) dynamic++;
    if (dynamic > this.limits.maxDynamicUniformBuffersPerPipelineLayout) fail(`pipeline layout: ${dynamic} dynamic buffers exceeds limit`);
    return { bindGroupLayouts: desc.bindGroupLayouts, label: desc.label || 'pipeline-layout', dynamic };
  }

  createBindGroup(desc) {
    const layout = desc.layout;
    const byBinding = new Map(layout.entries.map((e) => [e.binding, e]));
    const given = new Map();
    for (const e of desc.entries) {
      if (given.has(e.binding)) fail(`bind group: duplicate entry ${e.binding}`);
      given.set(e.binding, e);
      const le = byBinding.get(e.binding);
      if (!le) { fail(`bind group ${desc.label || ''}: entry ${e.binding} is not in the layout`); continue; }
      const r = e.resource;
      if (!r) { fail(`bind group: entry ${e.binding} has no resource`); continue; }
      if (le.buffer) {
        const buf = r.buffer;
        if (!buf) { fail(`bind group ${le.binding}: expected a buffer resource`); continue; }
        const size = r.size ?? buf.size;
        const offset = r.offset ?? 0;
        if (offset % 4) fail(`bind group ${le.binding}: buffer offset ${offset} not 4-aligned`);
        if (offset + size > buf.size) fail(`bind group ${le.binding}: offset ${offset} + size ${size} exceeds buffer ${buf.size}`);
        const wantUsage = le.buffer.type === 'uniform' ? 0x40 : 0x80;
        if (!(buf.usage & wantUsage)) fail(`bind group ${le.binding}: buffer lacks ${le.buffer.type} usage`);
        if (le.buffer.type === 'uniform') {
          if (size > this.limits.maxUniformBufferBindingSize) fail(`bind group ${le.binding}: uniform binding ${size} exceeds max`);
          if (le.buffer.minBindingSize && size < le.buffer.minBindingSize) fail(`bind group ${le.binding}: binding size ${size} < minBindingSize ${le.buffer.minBindingSize}`);
        } else {
          if (size > this.limits.maxStorageBufferBindingSize) fail(`bind group ${le.binding}: storage binding ${size} exceeds max`);
          // runtime sized arrays of vec4f need 16-byte multiple sizes
          if (le.buffer.minBindingSize && size < le.buffer.minBindingSize) fail(`bind group ${le.binding}: storage size ${size} < minBindingSize`);
        }
      } else if (le.texture) {
        const view = r.texture !== undefined ? r.texture : r;
        const tex = view.texture || view;
        if (!tex || !tex.format) { fail(`bind group ${le.binding}: expected a texture view`); continue; }
        if (tex.destroyed) fail(`bind group ${le.binding}: texture ${tex.label} is destroyed`);
        if (!(tex.usage & 0x4)) fail(`bind group ${le.binding}: texture ${tex.label} lacks TEXTURE_BINDING usage`);
        const isDepth = tex.format.startsWith('depth');
        if (le.texture.sampleType === 'depth' && !isDepth) fail(`bind group ${le.binding}: sampleType depth but texture is ${tex.format}`);
        if (le.texture.sampleType === 'float' && isDepth) fail(`bind group ${le.binding}: sampleType float but texture is depth (${tex.format})`);
        if (le.texture.sampleType === 'unfilterable-float' && tex.format === 'rgba16float') { /* rgba16float is filterable */ }
        if (!le.texture.multisampled && r.aspect) { /* n/a */ }
      } else if (le.sampler) {
        const s = r;
        if (!s || !s.type) { fail(`bind group ${le.binding}: expected a sampler`); continue; }
        if (le.sampler.type !== s.type) fail(`bind group ${le.binding}: layout wants ${le.sampler.type} sampler, got ${s.type}`);
      }
    }
    for (const le of layout.entries) {
      // optional-by-spec only for externally-owned; all entries here are required
      if (!given.has(le.binding)) fail(`bind group ${desc.label || ''}: missing entry ${le.binding}`);
    }
    return { layout, label: desc.label || 'bg', entries: desc.entries, id: Math.random() };
  }

  createRenderPipeline(desc) {
    const label = desc.label || 'pipeline';
    const layout = desc.layout;
    const targetOk = (targets) => targets.every((t) => t && t.format);
    if (desc.fragment && !targetOk(desc.fragment.targets)) fail(`${label}: fragment target missing format`);

    // check the shader's statically used bindings against the pipeline layout
    const checkStage = (module, entryPoint, stage, visibilityBit) => {
      const ep = module.analysis?.entryPoints?.[entryPoint];
      if (!ep) { fail(`${label}: entry point '${entryPoint}' not found in ${module.label}`); return; }
      if (ep.stage !== stage) fail(`${label}: '${entryPoint}' is declared @${ep.stage} but used as ${stage}`);
      for (const b of ep.bindings) {
        const bgl = layout.bindGroupLayouts[b.group];
        if (!bgl) { fail(`${label}: ${entryPoint} uses @group(${b.group}) but the pipeline layout has ${layout.bindGroupLayouts.length} group(s)`); continue; }
        const le = bgl.entries.find((e) => e.binding === b.binding);
        if (!le) { fail(`${label}: ${entryPoint} uses @group(${b.group}) @binding(${b.binding}) (${b.name}) which is not in the layout`); continue; }
        if (!(le.visibility & visibilityBit)) fail(`${label}: ${entryPoint} (${stage}) uses ${b.name} but layout visibility excludes ${stage}`);
        const isVar = b.type.startsWith('texture_') || b.type.startsWith('sampler');
        if (le.buffer) {
          const wantUniform = b.access === 'uniform' || b.access === '' || b.access === undefined && false;
          const uniformish = b.access === 'uniform';
          if (uniformish && le.buffer.type !== 'uniform') fail(`${label}: ${b.name} is a uniform in WGSL but layout says ${le.buffer.type}`);
          if (!uniformish && le.buffer.type !== 'read-only-storage' && le.buffer.type !== 'storage') fail(`${label}: ${b.name} is storage in WGSL but layout says ${le.buffer.type}`);
        } else if (le.texture && !isVar) fail(`${label}: ${b.name} is a ${b.type} but layout says texture`);
        else if (le.texture && b.type.startsWith('texture_depth_2d') && le.texture.sampleType !== 'depth') fail(`${label}: ${b.name} is depth texture but layout sampleType is ${le.texture.sampleType}`);
        else if (le.texture && b.type.startsWith('texture_2d<') && le.texture.sampleType === 'depth') fail(`${label}: ${b.name} is f32 texture but layout sampleType is depth`);
        else if (le.sampler && b.type === 'sampler_comparison' && le.sampler.type !== 'comparison') fail(`${label}: ${b.name} is sampler_comparison but layout type is ${le.sampler.type}`);
        else if (le.sampler && b.type === 'sampler' && le.sampler.type === 'comparison') fail(`${label}: ${b.name} is a filtering sampler but layout type is comparison`);
      }
      return ep;
    };

    const vEP = desc.vertex ? checkStage(desc.vertex.module, desc.vertex.entryPoint, 'vertex', 0x1) : null;
    if (desc.fragment) checkStage(desc.fragment.module, desc.fragment.entryPoint, 'fragment', 0x2);

    // vertex attribute coverage
    if (desc.vertex) {
      const buffers = desc.vertex.buffers || [];
      if (buffers.length > this.limits.maxVertexBuffers) fail(`${label}: ${buffers.length} vertex buffers exceeds limit`);
      const attrByLocation = new Map();
      let strideSum = 0;
      for (const b of buffers) {
        if (!b.arrayStride) fail(`${label}: vertex buffer needs an arrayStride`);
        if (b.arrayStride > 2048) fail(`${label}: arrayStride ${b.arrayStride} too large`);
        for (const a of b.attributes) {
          if (attrByLocation.has(a.shaderLocation)) fail(`${label}: duplicate vertex attribute location ${a.shaderLocation}`);
          attrByLocation.set(a.shaderLocation, { ...a, stride: b.arrayStride, stepMode: b.stepMode || 'vertex' });
          if (a.offset % 4) fail(`${label}: attribute ${a.shaderLocation} offset not 4-aligned`);
        }
        strideSum += b.arrayStride;
      }
      if (attrByLocation.size > this.limits.maxVertexAttributes) fail(`${label}: too many vertex attributes`);
      if (vEP) {
        for (const i of vEP.inputs) {
          if (!attrByLocation.has(i.location)) fail(`${label}: vertex input @location(${i.location}) has no attribute in the pipeline`);
        }
      }
      // size of one vertex / instance stamp
      desc._vertexSize = 0;
      desc._instanceSize = 0;
      for (const a of attrByLocation.values()) {
        const sizeOf = { float32: 4, float32x2: 8, float32x3: 12, float32x4: 16, uint32: 4, sint32: 4 }[a.format] ?? 0;
        if (!sizeOf) fail(`${label}: unsupported vertex format ${a.format}`);
        if (a.offset + sizeOf > a.stride) fail(`${label}: attribute ${a.shaderLocation} overflows its arrayStride`);
        if (a.stepMode === 'instance') desc._instanceSize = Math.max(desc._instanceSize, a.stride);
        else desc._vertexSize = Math.max(desc._vertexSize, a.stride);
      }
    }

    return {
      label,
      layout,
      desc,
      colorFormats: desc.fragment ? desc.fragment.targets.map((t) => t.format) : [],
      depthFormat: desc.depthStencil ? desc.depthStencil.format : null,
      vertexSize: desc._vertexSize || 0,
      instanceSize: desc._instanceSize || 0,
      hasFragment: !!desc.fragment,
    };
  }

  createCommandEncoder() {
    const device = this;
    const encoder = { passes: [] };
    encoder.beginRenderPass = (desc) => {
      const colors = (desc.colorAttachments || []).map((c) => {
        if (!c.view) fail('render pass: color attachment without a view');
        return { view: c.view, format: c.view?.texture?.format, texture: c.view?.texture };
      });
      const depth = desc.depthStencilAttachment
        ? { view: desc.depthStencilAttachment.view, format: desc.depthStencilAttachment.view?.texture?.format, texture: desc.depthStencilAttachment.view?.texture }
        : null;
      for (const c of colors) {
        if (c.texture && c.texture.destroyed) fail('render pass: color attachment texture is destroyed');
        if (c.texture && !(c.texture.usage & 0x10)) fail(`render pass: color texture ${c.texture.label} lacks RENDER_ATTACHMENT usage`);
      }
      if (depth) {
        if (depth.texture && depth.texture.destroyed) fail('render pass: depth attachment texture is destroyed');
        if (depth.texture && !(depth.texture.usage & 0x10)) fail(`render pass: depth texture ${depth.texture.label} lacks RENDER_ATTACHMENT usage`);
        if (depth.format && !depth.format.startsWith('depth')) fail(`render pass: depth attachment format ${depth.format} is not a depth format`);
      }
      const pass = {
        desc,
        colors,
        depth,
        pipeline: null,
        bindGroups: new Map(),
        vertexBuffers: new Map(),
        indexBuffer: null,
        issues: [],
        ended: false,
      };
      encoder.passes.push(pass);
      const localFail = (m) => pass.issues.push(`[${pass.desc.label || 'pass'}] ${m}`);

      pass.setPipeline = (pl) => {
        if (!pl || !pl.colorFormats) { localFail('setPipeline: invalid pipeline'); pass.pipeline = null; return; }
        pass.pipeline = pl;
        if (pl.colorFormats.length !== colors.length) localFail(`pipeline '${pl.label}' has ${pl.colorFormats.length} color target(s) but the pass has ${colors.length}`);
        for (let i = 0; i < Math.min(pl.colorFormats.length, colors.length); i++) {
          if (pl.colorFormats[i] !== colors[i].format) localFail(`pipeline '${pl.label}' target ${i} is ${pl.colorFormats[i]} but attachment is ${colors[i].format}`);
        }
        if (pl.depthFormat && !depth) localFail(`pipeline '${pl.label}' needs a depth attachment but the pass has none`);
        if (!pl.depthFormat && depth) localFail(`pipeline '${pl.label}' has no depth state but the pass has a depth attachment`);
        if (pl.depthFormat && depth && pl.depthFormat !== depth.format) localFail(`pipeline '${pl.label}' depth format ${pl.depthFormat} != attachment ${depth.format}`);
      };
      pass.setBindGroup = (index, bg, offsets = []) => {
        if (!pass.pipeline) { localFail('setBindGroup before setPipeline'); }
        if (index >= this.limits.maxBindGroups) localFail(`setBindGroup index ${index} exceeds maxBindGroups`);
        if (!bg) { localFail(`setBindGroup(${index}) with no bind group`); return; }
        pass.bindGroups.set(index, { bg, offsets });
        const wantDynamic = bg.layout.entries.filter((e) => e.buffer && e.buffer.hasDynamicOffset).length;
        if (offsets.length !== wantDynamic) localFail(`setBindGroup(${index}): ${offsets.length} dynamic offsets for a layout with ${wantDynamic}`);
        for (let i = 0; i < offsets.length; i++) {
          if (offsets[i] % this.limits.minUniformBufferOffsetAlignment) localFail(`setBindGroup(${index}): offset ${offsets[i]} not aligned to 256`);
          const entry = bg.entries.find((e) => e.binding === (bg.layout.entries.filter((x) => x.buffer && x.buffer.hasDynamicOffset)[i] || {}).binding);
          if (entry && entry.resource.buffer) {
            const size = entry.resource.size ?? entry.resource.buffer.size;
            if (offsets[i] + size > entry.resource.buffer.size) localFail(`setBindGroup(${index}): dynamic offset ${offsets[i]} + ${size} exceeds buffer ${entry.resource.buffer.size}`);
          }
        }
      };
      pass.setVertexBuffer = (slot, buf, offset = 0, size) => {
        if (slot >= this.limits.maxVertexBuffers) localFail(`setVertexBuffer slot ${slot} exceeds maxVertexBuffers`);
        if (buf && !(buf.usage & 0x20)) localFail(`setVertexBuffer(${slot}): ${buf.label} lacks VERTEX usage`);
        if (buf && offset + (size ?? buf.size - offset) > buf.size) localFail(`setVertexBuffer(${slot}): range beyond ${buf.label}`);
        pass.vertexBuffers.set(slot, { buf, offset, size: size ?? (buf ? buf.size - offset : 0) });
      };
      pass.setIndexBuffer = (buf, format, offset = 0, size) => {
        if (buf && !(buf.usage & 0x10)) localFail(`setIndexBuffer: ${buf.label} lacks INDEX usage`);
        if (format !== 'uint16' && format !== 'uint32') localFail(`setIndexBuffer: bad format ${format}`);
        pass.indexBuffer = { buf, format, offset, size: size ?? (buf ? buf.size - offset : 0) };
      };
      const requireState = () => {
        if (!pass.pipeline) { localFail('draw without a pipeline'); return false; }
        const groups = pass.pipeline.layout.bindGroupLayouts.length;
        for (let i = 0; i < groups; i++) {
          if (!pass.bindGroups.has(i)) { localFail(`draw: bind group ${i} is not set (pipeline '${pass.pipeline.label}')`); return false; }
          const set = pass.bindGroups.get(i);
          if (set.bg.layout !== pass.pipeline.layout.bindGroupLayouts[i]) {
            localFail(`draw: bind group ${i} layout is not the one the pipeline expects`);
            return false;
          }
        }
        return true;
      };
      pass.draw = (vertexCount, instanceCount = 1, firstVertex = 0, firstInstance = 0) => {
        if (!requireState()) return;
        if (!(vertexCount > 0)) localFail('draw: vertexCount must be > 0');
        const pl = pass.pipeline;
        if (pl.vertexSize) {
          for (let slot = 0; slot < (pl.desc.vertex.buffers || []).length; slot++) {
            if (!pass.vertexBuffers.has(slot)) { localFail(`draw: vertex buffer ${slot} not set`); return; }
            const vb = pass.vertexBuffers.get(slot);
            const needed = (firstVertex + vertexCount) * (pl.desc.vertex.buffers[slot].arrayStride);
            if (vb.size < needed) localFail(`draw: vertex buffer ${slot} (${fmtBytes(vb.size)}) too small for ${needed} B`);
          }
        }
        if (instanceCount > 1 && pl.instanceSize) {
          for (let slot = 0; slot < (pl.desc.vertex.buffers || []).length; slot++) {
            const bd = pl.desc.vertex.buffers[slot];
            if ((bd.stepMode || 'vertex') !== 'instance') continue;
            const vb = pass.vertexBuffers.get(slot);
            if (!vb) { localFail(`draw: instance buffer ${slot} not set`); return; }
            const needed = (firstInstance + instanceCount) * bd.arrayStride;
            if (vb.size < needed) localFail(`draw: instance buffer ${slot} (${fmtBytes(vb.size)}) too small for ${needed} B`);
          }
        }
      };
      pass.drawIndexed = (indexCount, instanceCount = 1, firstIndex = 0, baseVertex = 0, firstInstance = 0) => {
        if (!requireState()) return;
        if (!pass.indexBuffer) { localFail('drawIndexed without an index buffer'); return; }
        if (!(indexCount > 0)) localFail('drawIndexed: indexCount must be > 0');
        const ib = pass.indexBuffer;
        const el = ib.format === 'uint16' ? 2 : 4;
        const needed = (firstIndex + indexCount) * el;
        if (ib.size < needed) { localFail(`drawIndexed: index range ${needed} B exceeds index buffer ${fmtBytes(ib.size)}`); return; }
        // instanced attributes must be bound and large enough
        if (instanceCount > 1) {
          const pld = pass.pipeline;
          for (let slot = 0; slot < (pld.desc.vertex.buffers || []).length; slot++) {
            const bd = pld.desc.vertex.buffers[slot];
            if ((bd.stepMode || 'vertex') !== 'instance') continue;
            const vb = pass.vertexBuffers.get(slot);
            if (!vb) { localFail(`drawIndexed: instance buffer ${slot} not set`); continue; }
            const need = (firstInstance + instanceCount) * bd.arrayStride;
            if (vb.size < need) localFail(`drawIndexed: instances [${firstInstance}, ${firstInstance + instanceCount}) need ${need} B of instance buffer ${slot}, only ${fmtBytes(vb.size)} bound`);
          }
        }
        // check the vertices actually referenced
        if (ib.buf.data) {
          const arr = new (ib.format === 'uint16' ? Uint16Array : Uint32Array)(ib.buf.data.buffer, ib.offset, ib.size / el);
          let maxIdx = 0;
          for (let i = firstIndex; i < firstIndex + indexCount && i < arr.length; i++) if (arr[i] > maxIdx) maxIdx = arr[i];
          const pl = pass.pipeline;
          for (let slot = 0; slot < (pl.desc.vertex.buffers || []).length; slot++) {
            const bd = pl.desc.vertex.buffers[slot];
            if ((bd.stepMode || 'vertex') !== 'vertex') continue;
            const vb = pass.vertexBuffers.get(slot);
            if (!vb) { localFail(`drawIndexed: vertex buffer ${slot} not set`); continue; }
            const need = (baseVertex + maxIdx + 1) * bd.arrayStride;
            if (vb.size < need) localFail(`drawIndexed: index ${maxIdx} needs ${need} B of vertex buffer ${slot}, only ${fmtBytes(vb.size)} bound`);
          }
        }
      };
      pass.end = () => {
        if (pass.ended) localFail('pass.end() twice');
        pass.ended = true;
      };
      pass.setViewport = pass.setScissorRect = pass.setBlendConstant = pass.setStencilReference = () => {};
      return pass;
    };
    encoder.finish = () => {
      const cmd = { invalid: false, reason: '', issues: [] };
      for (const p of encoder.passes) {
        if (!p.ended) { cmd.issues.push(`[${p.desc.label || 'pass'}] render pass was never ended`); }
        cmd.issues.push(...p.issues);
      }
      return cmd;
    };
    return encoder;
  }
}

// ------------------------------------------------------------------- run it
async function main() {
  const world = (await import(path.join(ROOT, 'src/world.js'))).buildWorld();

  const wgsl = {
    './src/scene.wgsl': fs.readFileSync(path.join(ROOT, 'src/scene.wgsl'), 'utf8'),
    './src/post.wgsl': fs.readFileSync(path.join(ROOT, 'src/post.wgsl'), 'utf8'),
  };

  const device = new MockDevice();
  let currentView = null;

  const canvas = {
    width: 1280,
    height: 720,
    getContext: () => ({
      configure: () => {},
      getCurrentTexture: () => new MockTexture({ size: [1280, 720], format: 'bgra8unorm', usage: 0x10, label: 'swapchain' }),
    }),
  };

  // globals the renderer expects
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
    gpu: {
      getPreferredCanvasFormat: () => 'bgra8unorm',
      requestAdapter: async () => ({ requestDevice: async () => device, limits: device.limits, features: new Set() }),
    },
    },
  });
  globalThis.GPUBufferUsage = { MAP_READ: 0x1, MAP_WRITE: 0x2, COPY_SRC: 0x4, COPY_DST: 0x8, INDEX: 0x10, VERTEX: 0x20, UNIFORM: 0x40, STORAGE: 0x80, INDIRECT: 0x100, QUERY_RESOLVE: 0x200 };
  globalThis.GPUTextureUsage = { COPY_SRC: 0x1, COPY_DST: 0x2, TEXTURE_BINDING: 0x4, STORAGE_BINDING: 0x8, RENDER_ATTACHMENT: 0x10 };
  globalThis.GPUShaderStage = { VERTEX: 0x1, FRAGMENT: 0x2, COMPUTE: 0x4 };
  globalThis.fetch = async (url) => ({ ok: !!wgsl[url], status: wgsl[url] ? 200 : 404, text: async () => wgsl[url] });

  const { createRenderer } = await import(path.join(ROOT, 'src/renderer.js'));
  const errors = [];
  const renderer = await createRenderer({ canvas, world, onError: (m) => errors.push(m) });

  const state = {
    viewProj: new Float32Array(16).map((_, i) => (i % 5 === 0 ? 1 : 0)),
    invViewProj: new Float32Array(16).map((_, i) => (i % 5 === 0 ? 1 : 0)),
    lightVP: new Float32Array(16),
    eye: [0, 20, 40], right: [1, 0, 0], up: [0, 1, 0],
    sunDir: [0.5, 0.6, 0.4], sunColor: [1, 0.9, 0.8], sunIntensity: 2,
    skyTop: [0.2, 0.4, 0.8], skyHorizon: [0.9, 0.6, 0.5], skyGround: [0.5, 0.4, 0.4],
    night: 0, time: 1, fog: 0.003, snow: 0.5, exposure: 1.1,
    bloomThreshold: 1, bloomStrength: 0.6, vignette: 0.3, grain: 0.01,
  };

  renderer.render(state);
  renderer.render(state);

  for (const e of errors) fail(`device error: ${e}`);

  const uniq = [...new Set(issues)];
  if (!uniq.length) {
    console.log(`✓ gpu-lint: no validation problems found across ${renderer.stats.draws} draws, ${renderer.stats.instances} instances`);
    console.log(`  buffers, bind groups, pipelines and 2 submitted frames all consistent.`);
  } else {
    console.log(`✗ gpu-lint found ${uniq.length} problem(s):\n`);
    for (const i of uniq) console.log('  • ' + i);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('gpu-lint crashed:', e);
  process.exitCode = 1;
});
