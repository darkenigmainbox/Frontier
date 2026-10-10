// WebGPU Compute Engine for Real-Time Geological Simulation (WGSL)
// Provides hardware-accelerated terrain synthesis, hydraulic erosion, and derivative compute.

export class WebGPUCompute {
  constructor() {
    this.device = null;
    this.adapter = null;
    this.isSupported = false;
    this.statusText = 'Checking WebGPU...';
  }

  async init() {
    if (!navigator.gpu) {
      this.isSupported = false;
      this.statusText = 'WebGPU unsupported (WebGL2 active)';
      return false;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      if (!this.adapter) {
        this.isSupported = false;
        this.statusText = 'No GPU adapter found (WebGL2 fallback)';
        return false;
      }

      this.device = await this.adapter.requestDevice();
      this.isSupported = true;
      this.statusText = 'WebGPU Hardware Accelerated';
      console.log('Frontier: WebGPU Compute Pipeline initialized successfully');
      return true;
    } catch (err) {
      console.warn('WebGPU init failed, falling back:', err);
      this.isSupported = false;
      this.statusText = 'WebGPU Error (WebGL2 fallback)';
      return false;
    }
  }

  // WGSL Compute Shader for Parallel Multi-Fractal Ridge Generation
  getRidgeComputeShader() {
    return `
      struct TerrainParams {
        resolution: u32,
        seed: u32,
        elevation: f32,
        scale: f32,
        octaves: u32,
        sharpness: f32,
        warp: f32,
      };

      @group(0) @binding(0) var<uniform> params: TerrainParams;
      @group(0) @binding(1) var<storage, read_write> heightfield: array<f32>;

      // Hash-based pseudo random
      fn hash(p: vec2<f32>) -> f32 {
        var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      fn noise(p: vec2<f32>) -> f32 {
        let i = floor(p);
        let f = fract(p);
        let u = f * f * (3.0 - 2.0 * f);

        let a = hash(i + vec2<f32>(0.0, 0.0));
        let b = hash(i + vec2<f32>(1.0, 0.0));
        let c = hash(i + vec2<f32>(0.0, 1.0));
        let d = hash(i + vec2<f32>(1.0, 1.0));

        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
      }

      fn ridgedMF(p: vec2<f32>, octaves: u32, sharpness: f32) -> f32 {
        var pos = p;
        var sum = 0.0;
        var freq = 1.0;
        var amp = 1.0;
        var weight = 1.0;
        var maxAmp = 0.0;

        for (var i = 0u; i < octaves; i = i + 1u) {
          var n = abs(noise(pos * freq));
          n = 1.0 - n;
          n = pow(max(0.0, n), sharpness);
          n = n * weight;
          weight = clamp(n * 2.0, 0.0, 1.0);

          sum += n * amp;
          maxAmp += amp;
          freq *= 2.08;
          amp *= 0.5;
        }
        return sum / (maxAmp * 0.75);
      }

      @compute @workgroup_size(16, 16)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        if (id.x >= params.resolution || id.y >= params.resolution) {
          return;
        }

        let idx = id.y * params.resolution + id.x;
        let uv = vec2<f32>(f32(id.x), f32(id.y)) * (params.scale * 1.8 / f32(params.resolution));

        // Domain warping
        var warped = uv;
        if (params.warp > 0.0) {
          let q = vec2<f32>(noise(uv), noise(uv + vec2<f32>(5.2, 1.3)));
          warped += params.warp * q;
        }

        let val = max(0.0, ridgedMF(warped, params.octaves, params.sharpness)) * params.elevation;
        heightfield[idx] = val;
      }
    `;
  }
}
