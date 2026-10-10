// MirrorRelief — a CPU mirror of the TerrainSequence GPU pipeline.
//
// There is no WebGPU device available in this workspace, so the only way to see whether the
// generators, the erosion solver and the texture rules actually produce terrain is to run the same
// arithmetic on the CPU and look at the result. Every function below is a line-by-line port of its
// WGSL counterpart in Experimental/TerrainSequence — the same hash, the same gradient noise, the
// same pipe model with the same Tick and Gravity, the same Sobel normals, the same horizon search,
// the same shading. If this renders convincing terrain, the shader arithmetic is sound; what is
// left to the browser is the plumbing, and CheckTerrain.mjs covers that.
//
//   node Exhibits/Workbench/Terrain/MirrorRelief.mjs [size] [iterations]

import { deflateSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const Here = dirname(fileURLToPath(import.meta.url));
const Out = join(Here, "../../Gallery/TerrainSequence");
mkdirSync(Out, { recursive: true });

const Size = Number(process.argv[2] || 320);
const Sweeps = Number(process.argv[3] || 240);
const Tau = Math.PI * 2;
const Probe = { Discharge: [], Change: [] };
const FlowGain = Number(process.env.FLOWGAIN || 7);
const WearGain = Number(process.env.WEARGAIN || 0.9);

// ── Hashing and gradient noise, ported from ReliefSolver.js ───────────────────────────────────────

function Churn(A) {
  let X = A >>> 0;
  X = (X ^ (X >>> 16)) >>> 0;
  X = Math.imul(X, 0x7feb352d) >>> 0;
  X = (X ^ (X >>> 15)) >>> 0;
  X = Math.imul(X, 0x846ca68b) >>> 0;
  X = (X ^ (X >>> 16)) >>> 0;
  return X >>> 0;
}
function Churn2(Px, Py, Seed) {
  const A = Math.imul(Px >>> 0, 73856093) >>> 0;
  const B = Math.imul(Py >>> 0, 19349663) >>> 0;
  const C = ((Math.imul(Seed >>> 0, 83492791) >>> 0) + 2654435761) >>> 0;
  return Churn(((A ^ B) ^ C) >>> 0);
}
function Unit(A) { return (A & 0x00ffffff) / 16777216; }
function Slope2(Px, Py, Seed) {
  const A = Unit(Churn2(Px, Py, Seed)) * Tau;
  return [Math.cos(A), Math.sin(A)];
}

// Value and analytic derivative.
function Grain(X, Y, Seed) {
  const Ix = Math.floor(X);
  const Iy = Math.floor(Y);
  const Fx = X - Ix;
  const Fy = Y - Iy;
  const Ux = Fx * Fx * Fx * (Fx * (Fx * 6 - 15) + 10);
  const Uy = Fy * Fy * Fy * (Fy * (Fy * 6 - 15) + 10);
  const Dx = 30 * Fx * Fx * (Fx * (Fx - 2) + 1);
  const Dy = 30 * Fy * Fy * (Fy * (Fy - 2) + 1);
  const Ga = Slope2(Ix, Iy, Seed);
  const Gb = Slope2(Ix + 1, Iy, Seed);
  const Gc = Slope2(Ix, Iy + 1, Seed);
  const Gd = Slope2(Ix + 1, Iy + 1, Seed);
  const Va = Ga[0] * Fx + Ga[1] * Fy;
  const Vb = Gb[0] * (Fx - 1) + Gb[1] * Fy;
  const Vc = Gc[0] * Fx + Gc[1] * (Fy - 1);
  const Vd = Gd[0] * (Fx - 1) + Gd[1] * (Fy - 1);
  const K1 = Vb - Va;
  const K2 = Vc - Va;
  const K3 = Va - Vb - Vc + Vd;
  const Value = Va + K1 * Ux + K2 * Uy + K3 * Ux * Uy;
  const Gx = Ga[0] + Ux * (Gb[0] - Ga[0]) + Uy * (Gc[0] - Ga[0])
    + Ux * Uy * (Ga[0] - Gb[0] - Gc[0] + Gd[0]) + Dx * (K1 + K3 * Uy);
  const Gy = Ga[1] + Ux * (Gb[1] - Ga[1]) + Uy * (Gc[1] - Ga[1])
    + Ux * Uy * (Ga[1] - Gb[1] - Gc[1] + Gd[1]) + Dy * (K2 + K3 * Ux);
  return [Value, Gx, Gy];
}

function Warped(X, Y, Amount, Seed) {
  if (Amount <= 0) return [X, Y];
  const A = Grain(X * 0.5 + 13.1, Y * 0.5 + 7.7, Seed + 991)[0];
  const B = Grain(X * 0.5 - 5.3, Y * 0.5 + 2.9, Seed + 4231)[0];
  return [X + A * Amount, Y + B * Amount];
}

// Ridged multifractal with weight feedback and derivative damping — FieldMountain.
function Mountain(Wx, Wy, P, Seed) {
  let [X, Y] = [(Wx + P.OffsetX) / P.Scale, (Wy + P.OffsetY) / P.Scale];
  [X, Y] = Warped(X, Y, P.Warp, Seed + 17);
  const C = Math.cos(0.517);
  const S = Math.sin(0.517);
  let Amplitude = 1;
  let Total = 0;
  let Scaling = 0;
  let Weight = 1;
  let Sx = 0;
  let Sy = 0;
  for (let O = 0; O < P.Peaks; O += 1) {
    const N = Grain(X, Y, Seed + O * 311);
    let R = 1 - Math.abs(N[0]);
    R = Math.pow(Math.max(0, Math.min(1, R)), Math.max(0.2, P.Sharpness)) * Weight;
    Weight = Math.max(0, Math.min(1, R * 2));
    Sx += N[1] * Amplitude;
    Sy += N[2] * Amplitude;
    const Settle = 1 / (1 + P.SlopeDamp * (Sx * Sx + Sy * Sy));
    Total += Amplitude * R * Settle;
    Scaling += Amplitude;
    Amplitude *= P.Roughness;
    const Nx = (C * X + -S * Y) * 2.07;
    const Ny = (S * X + C * Y) * 2.07;
    X = Nx; Y = Ny;
  }
  let H = Math.max(0, Math.min(1, Total / Math.max(Scaling, 1e-5)));
  if (P.Stratify > 0) {
    const Beds = 11;
    const Step = (H * Beds) % 1;
    H += (Step * Step * (3 - 2 * Step) - Step) * P.Stratify / Beds;
  }
  return Math.max(0, Math.min(1, H)) * P.Height;
}

// FieldNoise, hybrid profile.
function Fractal(Wx, Wy, P, Seed) {
  let X = (Wx + (P.OffsetX || 0)) / P.Scale;
  let Y = (Wy + (P.OffsetY || 0)) / P.Scale;
  const WS = P.WarpScale || 1;
  [X, Y] = Warped(X / WS, Y / WS, P.Warp, Seed);
  X *= WS; Y *= WS;
  const Spin = ((P.Rotation || 0) * Math.PI) / 180;
  const C = Math.cos(Spin);
  const S = Math.sin(Spin);
  let Amplitude = 1;
  let Total = 0;
  let Scale = 0;
  let Weight = 1;
  let Sx = 0;
  let Sy = 0;
  for (let O = 0; O < P.Octaves; O += 1) {
    const N = Grain(X, Y, Seed + O * 131);
    let V = N[0];
    if (P.Style === "Ridged") { V = 1 - Math.abs(V); V *= V; }
    else if (P.Style === "Billow") { V = Math.abs(V) * 2 - 1; }
    else if (P.Style === "Hybrid") {
      const R = 1 - Math.abs(V);
      V = R * R * Weight;
      Weight = Math.max(0, Math.min(1, R * R * 1.9));
    }
    Sx += N[1] * Amplitude;
    Sy += N[2] * Amplitude;
    const Settle = 1 / (1 + P.Erosive * (Sx * Sx + Sy * Sy));
    Total += Amplitude * V * Settle;
    Scale += Amplitude;
    Amplitude *= P.Gain;
    const Nx = (C * X + -S * Y) * P.Lacunarity;
    const Ny = (S * X + C * Y) * P.Lacunarity;
    X = Nx; Y = Ny;
  }
  let V = Total / Math.max(Scale, 1e-5);
  if (P.Style === "Smooth" || P.Style === "Billow") V = V * 0.5 + 0.5;
  return Math.max(0, Math.min(1, V)) * P.Height;
}

// ── The field ─────────────────────────────────────────────────────────────────────────────────────

const WorldSize = 14000;
const HeightScale = 2900;
const Seed = 20771;
const Cell = WorldSize / Size;
const Vert = HeightScale / Cell;          // normalised height -> cell units
const N = Size * Size;
const At = (X, Y) => Math.min(Size - 1, Math.max(0, Y)) * Size + Math.min(Size - 1, Math.max(0, X));

const Height = new Float32Array(N);
const Water = new Float32Array(N);
const Sediment = new Float32Array(N);
const Flux = new Float32Array(N * 4);
const Velocity = new Float32Array(N * 2);
const Flow = new Float32Array(N);
const Deposit = new Float32Array(N);
const Wear = new Float32Array(N);
const Relay = new Float32Array(N);

console.log(`field ${Size}² · ${Cell.toFixed(1)} m per cell · vertical ${Vert.toFixed(1)} cells`);

const Range = { Scale: 4200, Height: 0.95, Peaks: 11, Sharpness: 1.42, Roughness: 0.54,
  Warp: 0.62, Stratify: 0.16, SlopeDamp: 0.7, OffsetX: 0, OffsetY: 0 };
const Detail = { Scale: 1250, Height: 0.2, Octaves: 8, Style: "Hybrid", Erosive: 0.8, Warp: 0.2,
  Lacunarity: 2.04, Gain: 0.49, WarpScale: 1.1, Rotation: 27 };

// The solve is the slow part and does not change while the look is being tuned, so it is cached.
const Cached = join(Out, `Solve${Size}x${Sweeps}.bin`);
const Reuse = existsSync(Cached) && !process.env.RESOLVE;

let Clock = Date.now();
if (!Reuse) for (let Y = 0; Y < Size; Y += 1) {
  for (let X = 0; X < Size; X += 1) {
    const Wx = (X - Size * 0.5) * Cell;
    const Wy = (Y - Size * 0.5) * Cell;
    let H = Mountain(Wx, Wy, Range, Seed);
    // The second layer is masked to the lower ground, exactly as the preset declares.
    const Mask = Smooth(0 - 0.2, 0 + 0.2, H) * (1 - Smooth(0.6 - 0.2, 0.6 + 0.2, H));
    H += Fractal(Wx, Wy, Detail, Seed) * 0.42 * Mask;
    Height[At(X, Y)] = Math.max(0, Math.min(1, H));
  }
}
console.log(`generators ${Date.now() - Clock} ms`);

function Smooth(A, B, X) {
  const T = Math.max(0, Math.min(1, (X - A) / Math.max(1e-6, B - A)));
  return T * T * (3 - 2 * T);
}

// ── Thermal erosion ───────────────────────────────────────────────────────────────────────────────

const Around = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

function Thermal(Rounds, TalusDegrees, Rate, Scree) {
  const Limit = Math.tan((TalusDegrees * Math.PI) / 180) * (1 + 0.45 * Scree);
  const Give = new Float32Array(N);
  for (let Pass = 0; Pass < Rounds; Pass += 1) {
    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        const Centre = Height[At(X, Y)] * Vert;
        let Total = 0;
        let Deepest = 0;
        for (const [Ox, Oy] of Around) {
          const D = Centre - Height[At(X + Ox, Y + Oy)] * Vert;
          const Reach = Ox !== 0 && Oy !== 0 ? 1.4142136 : 1;
          const Over = D / Reach - Limit;
          if (Over > 0) { Total += Over; Deepest = Math.max(Deepest, Over); }
        }
        Give[At(X, Y)] = (Math.min(Deepest * 0.5, Total * 0.5) * Rate) / Vert;
      }
    }
    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        let Gained = 0;
        for (const [Ox, Oy] of Around) {
          const Nx = X + Ox;
          const Ny = Y + Oy;
          const Parcel = Give[At(Nx, Ny)];
          if (Parcel <= 0) continue;
          const Source = Height[At(Nx, Ny)] * Vert;
          let Mass = 0;
          let Mine = 0;
          for (const [Qx, Qy] of Around) {
            const D = Source - Height[At(Nx + Qx, Ny + Qy)] * Vert;
            const Reach = Qx !== 0 && Qy !== 0 ? 1.4142136 : 1;
            const Over = D / Reach - Limit;
            if (Over > 0) {
              Mass += Over;
              if (Nx + Qx === X && Ny + Qy === Y) Mine = Over;
            }
          }
          if (Mass > 0) Gained += (Parcel * Mine) / Mass;
        }
        const Delta = Gained - Give[At(X, Y)];
        Relay[At(X, Y)] = Math.max(0, Math.min(1, Height[At(X, Y)] + Delta));
        if (Delta > 0) Deposit[At(X, Y)] = Math.min(1, Deposit[At(X, Y)] + Delta * WearGain * 2);
        else Wear[At(X, Y)] = Math.min(1, Wear[At(X, Y)] - Delta * WearGain * 2);
      }
    }
    Height.set(Relay);
  }
}

Clock = Date.now();
if (!Reuse) Thermal(60, 37, 0.45, 0.45);

// ── Flow accumulation ─────────────────────────────────────────────────────────────────────────────
//
// The pipe model alone gives sheet flow: measured over 120 sweeps the contributing area of a cell
// never passed eight neighbours, so no channel ever formed. Real drainage comes from catchment
// area, so it is computed directly — multiple-flow-direction, slope weighted, gathered iteratively
// the way a compute shader must do it. The result feeds two things: the river mask, and the
// capacity term of the erosion, which turns it into the stream-power law that cuts actual valleys.

const Area = new Float32Array(N);

function Accumulate(Rounds) {
  const Next = new Float32Array(N);
  Area.fill(1);
  const Exponent = 1.1;
  for (let Pass = 0; Pass < Rounds; Pass += 1) {
    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        let Taken = 1;
        for (const [Ox, Oy] of Around) {
          const Nx = X + Ox;
          const Ny = Y + Oy;
          if (Nx < 0 || Ny < 0 || Nx >= Size || Ny >= Size) continue;
          const Source = Height[At(Nx, Ny)];
          const Reach = Ox !== 0 && Oy !== 0 ? 1.4142136 : 1;
          const Mine = Math.pow(Math.max(0, (Source - Height[At(X, Y)]) / Reach), Exponent);
          if (Mine <= 0) continue;
          let Total = 0;
          for (const [Qx, Qy] of Around) {
            const Tx = Nx + Qx;
            const Ty = Ny + Qy;
            if (Tx < 0 || Ty < 0 || Tx >= Size || Ty >= Size) continue;
            const Span = Qx !== 0 && Qy !== 0 ? 1.4142136 : 1;
            Total += Math.pow(Math.max(0, (Source - Height[At(Tx, Ty)]) / Span), Exponent);
          }
          if (Total > 0) Taken += Area[At(Nx, Ny)] * (Mine / Total);
        }
        Next[At(X, Y)] = Taken;
      }
    }
    Area.set(Next);
  }
  let Peak = 0;
  for (let I = 0; I < N; I += 1) Peak = Math.max(Peak, Area[I]);
  return Peak;
}

// ── Hydraulic erosion — the pipe model, same constants as the shader ──────────────────────────────

const Tick = 0.06;
const Gravity = 9.81;

function Softness(X, Y, Bedding) {
  if (Bedding <= 0) return 1;
  const H = Height[At(X, Y)];
  const Tilted = H * 26 + Grain(X / 160, Y / 160, Seed + 551)[0] * 2.2;
  const Band = 0.5 + 0.5 * Math.sin(Tilted * Tau);
  return 1 + (0.35 + (1.5 - 0.35) * Band - 1) * Bedding;
}

function Hydraulic(Rounds, P) {
  const Scratch = new Float32Array(N);
  for (let Pass = 0; Pass < Rounds; Pass += 1) {
    if (Pass % 24 === 0) Accumulate(Pass === 0 ? 140 : 36);
    for (let I = 0; I < N; I += 1) Water[I] += P.Rain * Tick;

    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        const I = At(X, Y);
        const Surface = (Height[I] + Water[I]) * Vert;
        const Sides = [At(X - 1, Y), At(X + 1, Y), At(X, Y - 1), At(X, Y + 1)];
        let Sum = 0;
        for (let K = 0; K < 4; K += 1) {
          const J = Sides[K];
          const Drop = Surface - (Height[J] + Water[J]) * Vert;
          const V = Math.max(0, Flux[I * 4 + K] * P.Inertia + Tick * Gravity * Drop);
          Flux[I * 4 + K] = V;
          Sum += V;
        }
        if (Sum > 1e-9) {
          const Held = Water[I] * Vert;
          const K = Math.min(1, Held / (Sum * Tick));
          for (let Q = 0; Q < 4; Q += 1) Flux[I * 4 + Q] *= K;
        }
        if (X === 0) Flux[I * 4] = 0;
        if (X === Size - 1) Flux[I * 4 + 1] = 0;
        if (Y === 0) Flux[I * 4 + 2] = 0;
        if (Y === Size - 1) Flux[I * 4 + 3] = 0;
      }
    }

    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        const I = At(X, Y);
        const FromLeft = Flux[At(X - 1, Y) * 4 + 1];
        const FromRight = Flux[At(X + 1, Y) * 4];
        const FromDown = Flux[At(X, Y - 1) * 4 + 3];
        const FromUp = Flux[At(X, Y + 1) * 4 + 2];
        const In = FromLeft + FromRight + FromDown + FromUp;
        const Outflow = Flux[I * 4] + Flux[I * 4 + 1] + Flux[I * 4 + 2] + Flux[I * 4 + 3];
        const Before = Water[I] * Vert;
        const After = Math.max(0, Before + Tick * (In - Outflow));
        Water[I] = After / Vert;
        const Mean = Math.max(1e-5, (Before + After) * 0.5);
        const U = ((FromLeft - Flux[I * 4]) + (Flux[I * 4 + 1] - FromRight)) * 0.5 / Mean;
        const W = ((FromDown - Flux[I * 4 + 2]) + (Flux[I * 4 + 3] - FromUp)) * 0.5 / Mean;
        Velocity[I * 2] = U;
        Velocity[I * 2 + 1] = W;
        Probe.Discharge.push(Area[I]);
        const Channel = Math.max(0, Math.min(1, (Math.log2(1 + Area[I]) - 2.2) / FlowGain));
        Flow[I] = Math.max(Flow[I] * 0.997, Channel);
      }
    }

    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        const I = At(X, Y);
        const Dx = (Height[At(X + 1, Y)] - Height[At(X - 1, Y)]) * Vert * 0.5;
        const Dy = (Height[At(X, Y + 1)] - Height[At(X, Y - 1)]) * Vert * 0.5;
        const Grade = Math.hypot(Dx, Dy);
        const Tilt = Math.max(P.MinSlope, Grade / Math.sqrt(1 + Grade * Grade));
        const Speed = Math.hypot(Velocity[I * 2], Velocity[I * 2 + 1]);
        const Depth = Water[I] * Vert;
        const Film = Math.max(0, Math.min(1, Depth / 0.012));
        const Discharge = Math.sqrt(Area[I]);
        const Able = P.Capacity * Tilt * (Speed * 0.5 + Discharge * 0.09) * Film * 0.5;
        const Held = Sediment[I];
        let Change;
        if (Able > Held) Change = -P.Dissolve * (Able - Held) * Softness(X, Y, P.Hardness);
        else Change = P.Deposition * (Held - Able);
        Relay[I] = Math.max(0, Math.min(1, Height[I] + Change / Vert));
        Sediment[I] = Math.max(0, Held - Change);
        Probe.Change.push(Math.abs(Change));
        if (Change > 0) Deposit[I] = Math.min(1, Deposit[I] * 0.9995 + Change * WearGain);
        else Wear[I] = Math.min(1, Wear[I] * 0.9995 - Change * WearGain);
      }
    }
    Height.set(Relay);

    for (let Y = 0; Y < Size; Y += 1) {
      for (let X = 0; X < Size; X += 1) {
        const I = At(X, Y);
        const Px = X - Velocity[I * 2] * Tick;
        const Py = Y - Velocity[I * 2 + 1] * Tick;
        const Bx = Math.floor(Px);
        const By = Math.floor(Py);
        const Fx = Px - Bx;
        const Fy = Py - By;
        const A0 = Sediment[At(Bx, By)] * (1 - Fx) + Sediment[At(Bx + 1, By)] * Fx;
        const A1 = Sediment[At(Bx, By + 1)] * (1 - Fx) + Sediment[At(Bx + 1, By + 1)] * Fx;
        Scratch[I] = A0 * (1 - Fy) + A1 * Fy;
      }
    }
    Sediment.set(Scratch);
    for (let I = 0; I < N; I += 1) Water[I] = Math.max(0, Water[I] * (1 - P.Evaporation * Tick * 16));

    if ((Pass & 3) === 3) Thermal(1, 58 + (26 - 58) * P.Talus, P.Talus * 0.55, 0.3);
  }
  for (let I = 0; I < N; I += 1) {
    Height[I] = Math.max(0, Math.min(1, Height[I] + Sediment[I] / Vert));
    Sediment[I] = 0;
    Water[I] = 0;
  }
}

Clock = Date.now();
const Fields = [Height, Flow, Deposit, Wear, Area];
if (Reuse) {
  const Blob = readFileSync(Cached);
  Fields.forEach((F, I) => F.set(new Float32Array(Blob.buffer, Blob.byteOffset + I * N * 4, N)));
  console.log("reused the cached solve — set RESOLVE=1 to run it again");
} else {
  Hydraulic(Sweeps, {
    Rain: 0.03, Evaporation: 0.022, Capacity: 1.3, Dissolve: 0.44, Deposition: 0.44,
    Talus: 0.4, MinSlope: 0.012, Inertia: 0.72, Hardness: 0.34,
  });
  console.log(`hydraulic ${Sweeps} sweeps ${Date.now() - Clock} ms · catchment peak `
    + `${Math.max(...Area).toFixed(0)} cells of ${N}`);
  let Low = Infinity;
  let High = -Infinity;
  for (let I = 0; I < N; I += 1) { Low = Math.min(Low, Height[I]); High = Math.max(High, Height[I]); }
  for (let I = 0; I < N; I += 1) Height[I] = (Height[I] - Low) / Math.max(1e-5, High - Low);
  console.log(`range ${Low.toFixed(4)} … ${High.toFixed(4)}`);
  const Blob = Buffer.alloc(Fields.length * N * 4);
  Fields.forEach((F, I) => Buffer.from(F.buffer, F.byteOffset, N * 4).copy(Blob, I * N * 4));
  writeFileSync(Cached, Blob);
}


// ── Resolve: normals, occlusion, shadow, coats ────────────────────────────────────────────────────

const Normal = new Float32Array(N * 3);
const Curve = new Float32Array(N);
const Tilted = new Float32Array(N);
for (let Y = 0; Y < Size; Y += 1) {
  for (let X = 0; X < Size; X += 1) {
    const I = At(X, Y);
    const Tl = Height[At(X - 1, Y - 1)]; const Tc = Height[At(X, Y - 1)]; const Tr = Height[At(X + 1, Y - 1)];
    const Ml = Height[At(X - 1, Y)]; const Mr = Height[At(X + 1, Y)];
    const Bl = Height[At(X - 1, Y + 1)]; const Bc = Height[At(X, Y + 1)]; const Br = Height[At(X + 1, Y + 1)];
    const Dx = ((Tr + 2 * Mr + Br) - (Tl + 2 * Ml + Bl)) * HeightScale / (8 * Cell);
    const Dy = ((Bl + 2 * Bc + Br) - (Tl + 2 * Tc + Tr)) * HeightScale / (8 * Cell);
    const L = Math.hypot(Dx, 1, Dy);
    Normal[I * 3] = -Dx / L;
    Normal[I * 3 + 1] = 1 / L;
    Normal[I * 3 + 2] = -Dy / L;
    Tilted[I] = Math.hypot(Dx, Dy);
    const Mean = (Ml + Mr + Tc + Bc) * 0.25;
    Curve[I] = Math.max(-1, Math.min(1, (Height[I] - Mean) * HeightScale / Cell * 9));
  }
}

function Sampled(Px, Py) {
  const Bx = Math.floor(Px);
  const By = Math.floor(Py);
  const Fx = Px - Bx;
  const Fy = Py - By;
  const A0 = Height[At(Bx, By)] * (1 - Fx) + Height[At(Bx + 1, By)] * Fx;
  const A1 = Height[At(Bx, By + 1)] * (1 - Fx) + Height[At(Bx + 1, By + 1)] * Fx;
  return A0 * (1 - Fy) + A1 * Fy;
}

const Occlusion = new Float32Array(N);
Clock = Date.now();
for (let Y = 0; Y < Size; Y += 1) {
  for (let X = 0; X < Size; X += 1) {
    const HereY = Height[At(X, Y)] * HeightScale;
    let Open = 0;
    for (let D = 0; D < 8; D += 1) {
      const A = ((D + 0.5) * Tau) / 8;
      const Sx = Math.cos(A);
      const Sy = Math.sin(A);
      let Reach = 1;
      let Highest = 0;
      for (let K = 0; K < 22; K += 1) {
        const Px = X + Sx * Reach;
        const Py = Y + Sy * Reach;
        if (Px < 0 || Py < 0 || Px > Size - 1 || Py > Size - 1) break;
        const Rise = Sampled(Px, Py) * HeightScale - HereY;
        Highest = Math.max(Highest, Rise / (Reach * Cell));
        Reach = Reach * 1.36 + 1;
      }
      Open += 1 - Highest / Math.sqrt(1 + Highest * Highest);
    }
    Occlusion[At(X, Y)] = Math.max(0, Math.min(1, Open / 8));
  }
}
console.log(`occlusion ${Date.now() - Clock} ms`);

const SunAzimuth = 128;
const SunElevation = 21;
const Ar = (SunAzimuth * Math.PI) / 180;
const Er = (SunElevation * Math.PI) / 180;
const Sun = [Math.sin(Ar) * Math.cos(Er), Math.sin(Er), -Math.cos(Ar) * Math.cos(Er)];

const Daylight = new Float32Array(N);
{
  const FlatLength = Math.hypot(Sun[0], Sun[2]);
  const Stepx = Sun[0] / FlatLength;
  const Stepy = Sun[2] / FlatLength;
  const Climb = (Sun[1] / FlatLength) * Cell;
  for (let Y = 0; Y < Size; Y += 1) {
    for (let X = 0; X < Size; X += 1) {
      let Here = Height[At(X, Y)] * HeightScale + Cell * 0.35;
      let Reach = 1;
      let Darkest = 1;
      for (let K = 0; K < 120; K += 1) {
        const Px = X + Stepx * Reach;
        const Py = Y + Stepy * Reach;
        if (Px < 0 || Py < 0 || Px > Size - 1 || Py > Size - 1) break;
        const Ray = Here + Climb * Reach;
        const Ground = Sampled(Px, Py) * HeightScale;
        const Clear = (Ray - Ground) / Math.max(Reach * Cell * 0.016, 1e-4);
        Darkest = Math.min(Darkest, Math.max(0, Math.min(1, Clear)));
        if (Darkest <= 0) break;
        Reach = Reach * 1.035 + 1;
      }
      Daylight[At(X, Y)] = Darkest;
    }
  }
}

function Linear(Hex) {
  const V = parseInt(Hex.slice(1), 16);
  return [(V >> 16) & 255, (V >> 8) & 255, V & 255]
    .map((C) => C / 255)
    .map((C) => (C <= 0.04045 ? C / 12.92 : Math.pow((C + 0.055) / 1.055, 2.4)));
}

function Flat(X, Y, Scale, Octaves, S) {
  let A = 1;
  let T = 0;
  let M = 0;
  let Px = X / Scale;
  let Py = Y / Scale;
  for (let O = 0; O < Octaves; O += 1) {
    T += A * Grain(Px, Py, S + O * 57)[0];
    M += A;
    A *= 0.5;
    Px = Px * 2.03 + 1.7;
    Py = Py * 2.03 - 3.1;
  }
  return (T / Math.max(M, 1e-5)) * 0.5 + 0.5;
}

// The Alpine preset's coats, in order.
const Coats = [
  { Kind: "Fill", Colour: "#6d6a66", Rough: 0.86, Opacity: 1, Mottle: 0.4, Grit: 900 },
  { Kind: "Altitude", Colour: "#4a5331", Rough: 0.92, Opacity: 1, Low: 0.02, High: 0.4, Fall: 0.13, Mottle: 0.45, Grit: 520 },
  { Kind: "Slope", Colour: "#5b554f", Rough: 0.8, Opacity: 1, Low: 38, High: 90, Fall: 10, Mottle: 0.3, Grit: 260 },
  { Kind: "Deposit", Colour: "#8c8070", Rough: 0.9, Opacity: 1, Low: 0.06, Fall: 0.28, Mottle: 0.4, Grit: 300 },
  { Kind: "Flow", Colour: "#4b5358", Rough: 0.28, Opacity: 1, Low: 0.1, Fall: 0.18, Wet: 0.85, Mottle: 0.2, Grit: 160 },
  { Kind: "Snow", Colour: "#e8eef5", Rough: 0.55, Opacity: 1, Low: 0.58, Fall: 0.09, SlopeMax: 44, Drift: 0.6, Mottle: 0.3, Grit: 700 },
];
for (const C of Coats) C.Tint = Linear(C.Colour);

function Band(V, LowEdge, HighEdge, Fall) {
  const F = Math.max(1e-4, Fall);
  return Math.max(0, Math.min(1, Smooth(LowEdge - F, LowEdge + F, V) * (1 - Smooth(HighEdge - F, HighEdge + F, V))));
}

const Albedo = new Float32Array(N * 3);
const Rough = new Float32Array(N);
const Wetness = new Float32Array(N);
const Snowed = new Float32Array(N);
for (let Y = 0; Y < Size; Y += 1) {
  for (let X = 0; X < Size; X += 1) {
    const I = At(X, Y);
    const Wx = (X - Size * 0.5) * Cell;
    const Wy = (Y - Size * 0.5) * Cell;
    const H = Height[I];
    let Tint = [0.42, 0.4, 0.38];
    let R = 0.85;
    let Wet = 0;
    let Snow = 0;
    for (const C of Coats) {
      let W = 1;
      if (C.Kind === "Altitude") W = Band(H, C.Low, C.High, C.Fall);
      else if (C.Kind === "Slope") W = Band((Math.atan(Tilted[I]) * 180) / Math.PI, C.Low, C.High, Math.max(0.25, C.Fall));
      else if (C.Kind === "Flow") W = Math.max(0, Math.min(1, Smooth(C.Low - C.Fall, C.Low + C.Fall, Flow[I])));
      else if (C.Kind === "Deposit") W = Math.max(0, Math.min(1, Smooth(C.Low - C.Fall, C.Low + C.Fall, Deposit[I])));
      else if (C.Kind === "Snow") {
        const Line = C.Low + (Flat(Wx, Wy, 2600, 3, Seed) - 0.5) * 0.09 * C.Drift;
        const Reach = Smooth(Line - C.Fall, Line + C.Fall, H);
        const Degrees = (Math.atan(Tilted[I]) * 180) / Math.PI;
        const Shed = 1 - Smooth(C.SlopeMax - 9, C.SlopeMax + 3, Degrees);
        const Bank = 1 + Math.max(0, Math.min(1, -Curve[I])) * 0.55 * C.Drift;
        W = Math.max(0, Math.min(1, Reach * Shed * Bank * (1 - Math.max(0, Math.min(1, Flow[I] * 2.2)))));
      }
      const Grit = Math.max(1, C.Grit || 0);
      const Mottle = C.Mottle || 0;
      if (Mottle > 0 && C.Kind !== "Fill") {
        const Noise = Flat(Wx, Wy, Grit, 4, Seed + 909);
        W = Math.max(0, Math.min(1, W * (1 + (Noise * 1.75 - 1) * Mottle)));
      }
      W *= C.Opacity;
      if (W <= 0.0005) continue;
      const Shift = (Flat(Wx, Wy, Grit * 2.7, 3, Seed + 17) - 0.5) * 0.14 * Mottle;
      for (let K = 0; K < 3; K += 1) Tint[K] += (C.Tint[K] * (1 + Shift) - Tint[K]) * W;
      R += (C.Rough - R) * W;
      if (C.Kind === "Flow") Wet = Math.max(Wet, W * C.Wet);
      if (C.Kind === "Snow") Snow = Math.max(Snow, W);
    }
    for (let K = 0; K < 3; K += 1) Albedo[I * 3 + K] = Tint[K] * (1 + (0.42 - 1) * Wet);
    Rough[I] = Math.max(0.03, Math.min(1, R + (0.12 - R) * Wet));
    Wetness[I] = Wet;
    Snowed[I] = Snow;
  }
}

// ── Shading, ported from GroundFragment ───────────────────────────────────────────────────────────

const SunTint = (() => {
  const Stops = [[-4, [1, 0.26, 0.09]], [0, [1, 0.4, 0.17]], [6, [1, 0.63, 0.36]], [14, [1, 0.8, 0.6]],
    [28, [1, 0.92, 0.82]], [60, [1, 0.98, 0.96]], [90, [1, 1, 1]]];
  let T = Stops[Stops.length - 1][1];
  for (let K = 0; K < Stops.length - 1; K += 1) {
    const [A, Ca] = Stops[K];
    const [B, Cb] = Stops[K + 1];
    if (SunElevation >= A && SunElevation <= B) {
      const F = (SunElevation - A) / (B - A);
      T = Ca.map((V, I) => V + (Cb[I] - V) * F);
      break;
    }
  }
  const Warmth = 0.46;
  const Mixed = T.map((V) => 1 + (V - 1) * Warmth);
  const Mass = 1 / Math.max(0.055, Math.sin((SunElevation * Math.PI) / 180) + 0.15);
  return Mixed.map((V) => V * Math.exp(-0.17 * (Mass - 1)));
})();
const SkyTint = [0.235, 0.34, 0.52].map((V, I) => {
  const Night = [0.03, 0.044, 0.078][I];
  const Day = Math.max(0, Math.min(1, (SunElevation + 5) / 26));
  return Night + (V - Night) * Day;
});
const Intensity = Number(process.env.SUN || 5.4);
const Ambient = Number(process.env.SKY || 1.6);
const Exposure = Number(process.env.EXPOSURE || 3.4);
const Wash = Number(process.env.WASH || 0.45);
const Return = Number(process.env.RETURN || 0.5);

function Aces(X) {
  return Math.max(0, Math.min(1, (X * (2.51 * X + 0.03)) / (X * (2.43 * X + 0.59) + 0.14)));
}
function Encode(C) {
  const V = Math.max(0, Math.min(1, C));
  return Math.round((V <= 0.0031308 ? V * 12.92 : 1.055 * Math.pow(V, 1 / 2.4) - 0.055) * 255);
}

function Shade(I, EyeDir) {
  const Nx = Normal[I * 3];
  const Ny = Normal[I * 3 + 1];
  const Nz = Normal[I * 3 + 2];
  const NdL = Math.max(0, Nx * Sun[0] + Ny * Sun[1] + Nz * Sun[2]);
  const Shadow = Daylight[I];
  const Sky = Occlusion[I];
  const Vx = -EyeDir[0]; const Vy = -EyeDir[1]; const Vz = -EyeDir[2];
  const Hx = Sun[0] + Vx; const Hy = Sun[1] + Vy; const Hz = Sun[2] + Vz;
  const Hl = Math.hypot(Hx, Hy, Hz) || 1;
  const NdH = Math.max(0, (Nx * Hx + Ny * Hy + Nz * Hz) / Hl);
  const NdV = Math.max(1e-4, Nx * Vx + Ny * Vy + Nz * Vz);
  const VdH = Math.max(0, (Vx * Hx + Vy * Hy + Vz * Hz) / Hl);
  const A = Rough[I] * Rough[I];
  const A2 = A * A;
  const Den = NdH * NdH * (A2 - 1) + 1;
  const D = A2 / Math.max(Math.PI * Den * Den, 1e-6);
  const K = A * 0.5;
  const Gv = NdV / (NdV * (1 - K) + K);
  const Gl = NdL / (NdL * (1 - K) + K);
  const Base = 0.035 + (0.072 - 0.035) * Wetness[I];
  const Fres = Base + (1 - Base) * Math.pow(1 - VdH, 5);
  const Spec = (D * Gv * Gl * Fres) / (4 * NdV * Math.max(NdL, 1e-4));
  const Wrap = Math.max(0, Math.min(1, (Nx * Sun[0] + Ny * Sun[1] + Nz * Sun[2] + 0.18) / 1.18));

  const Out = [0, 0, 0];
  for (let C = 0; C < 3; C += 1) {
    const Albedo_ = Albedo[I * 3 + C];
    const Direct = (Albedo_ * Wrap * Shadow * SunTint[C] * Intensity) / Math.PI;
    const Gloss = SunTint[C] * Intensity * Spec * NdL * Shadow;
    // Sky irradiance is the whole dome integrated, not the zenith: the bright horizon band and
    // the sun's aureole make it far paler than the blue straight overhead.
    const Grey = SkyTint[0] * 0.2126 + SkyTint[1] * 0.7152 + SkyTint[2] * 0.0722;
    const Pale = SkyTint[C] + (Grey - SkyTint[C]) * Wash;
    const Dome = Pale * Ambient * (0.55 + 0.45 * Ny);
    const Bounce = [0.30, 0.25, 0.19][C] * Ambient * Return * (0.6 - 0.6 * Ny + 0.4);
    Out[C] = Direct + Gloss + Albedo_ * Sky * (Dome + Bounce);
  }
  return Out;
}

// ── Output ────────────────────────────────────────────────────────────────────────────────────────

function Png(Width, HeightPx, Rgb) {
  const Rows = Buffer.alloc(HeightPx * (1 + Width * 3));
  let W = 0;
  for (let Y = 0; Y < HeightPx; Y += 1) {
    Rows[W] = 0;
    W += 1;
    for (let X = 0; X < Width * 3; X += 1) { Rows[W] = Rgb[(Y * Width * 3) + X]; W += 1; }
  }
  const Head = Buffer.alloc(13);
  Head.writeUInt32BE(Width, 0);
  Head.writeUInt32BE(HeightPx, 4);
  Head[8] = 8;
  Head[9] = 2;
  const Tag = (Name, Body) => {
    const Out_ = Buffer.alloc(12 + Body.length);
    Out_.writeUInt32BE(Body.length, 0);
    Out_.write(Name, 4, "ascii");
    Body.copy(Out_, 8);
    let C = 0xffffffff;
    const Scope = Out_.subarray(4, 8 + Body.length);
    for (const B of Scope) {
      C ^= B;
      for (let K = 0; K < 8; K += 1) C = C & 1 ? 0xedb88320 ^ (C >>> 1) : C >>> 1;
      C >>>= 0;
    }
    Out_.writeUInt32BE((C ^ 0xffffffff) >>> 0, 8 + Body.length);
    return Out_;
  };
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Tag("IHDR", Head),
    Tag("IDAT", deflateSync(Rows, { level: 9 })),
    Tag("IEND", Buffer.alloc(0)),
  ]);
}

// Top-down relit view: the shading model applied with a fixed oblique eye.
const Eye = [-0.42, -0.78, -0.46];
{
  const Span = (Name, Get) => {
    let Lo = Infinity; let Hi = -Infinity; let Bad = 0;
    for (let I = 0; I < N; I += 1) { const V = Get(I); if (!Number.isFinite(V)) { Bad += 1; continue; } Lo = Math.min(Lo, V); Hi = Math.max(Hi, V); }
    console.log(`${Name.padEnd(11)} ${Lo.toFixed(4)} … ${Hi.toFixed(4)}${Bad ? `  NOT FINITE x${Bad}` : ""}`);
  };
  Span("albedo r", (I) => Albedo[I * 3]);
  Span("roughness", (I) => Rough[I]);
  Span("wetness", (I) => Wetness[I]);
  Span("normal y", (I) => Normal[I * 3 + 1]);
  Span("daylight", (I) => Daylight[I]);
  Span("occlusion", (I) => Occlusion[I]);
  Span("shaded r", (I) => Shade(I, Eye)[0]);
  console.log(`sun ${Sun.map((V) => V.toFixed(3)).join(" ")} · tint ${SunTint.map((V) => V.toFixed(3)).join(" ")} · sky ${SkyTint.map((V) => V.toFixed(3)).join(" ")}`);
}
const Lit = Buffer.alloc(N * 3);
for (let I = 0; I < N; I += 1) {
  const C = Shade(I, Eye);
  for (let K = 0; K < 3; K += 1) Lit[I * 3 + K] = Encode(Aces(C[K] * Exposure));
}
writeFileSync(join(Out, "MirrorShaded.png"), Png(Size, Size, Lit));

const Panels = [
  ["MirrorHeight.png", (I) => { const V = Height[I]; return [V, V, V]; }],
  ["MirrorFlow.png", (I) => [0.04 + Flow[I] * 0.31, 0.05 + Flow[I] * 0.67, 0.06 + Flow[I] * 0.94]],
  ["MirrorDeposit.png", (I) => [0.05 + Deposit[I] * 0.9, 0.05 + Deposit[I] * 0.62, 0.05 + Deposit[I] * 0.3]],
  ["MirrorArea.png", (I) => { const V = Math.max(0, Math.min(1, (Math.log2(1 + Area[I]) - 2.2) / 7)); return [V * 0.35, V * 0.72, V]; }],
  ["MirrorLight.png", (I) => { const V = Daylight[I] * Occlusion[I]; return [V, V, V]; }],
  ["MirrorAlbedo.png", (I) => [Albedo[I * 3], Albedo[I * 3 + 1], Albedo[I * 3 + 2]]],
  ["MirrorNormal.png", (I) => [Normal[I * 3] * 0.5 + 0.5, Normal[I * 3 + 2] * 0.5 + 0.5, Normal[I * 3 + 1]]],
];
for (const [Name, Pick] of Panels) {
  const Bytes = Buffer.alloc(N * 3);
  for (let I = 0; I < N; I += 1) {
    const C = Pick(I);
    for (let K = 0; K < 3; K += 1) Bytes[I * 3 + K] = Encode(C[K]);
  }
  writeFileSync(join(Out, Name), Png(Size, Size, Bytes));
}

function Centile(List, P) {
  if (!List.length) return 0;
  const Sorted = Float64Array.from(List).sort();
  return Sorted[Math.min(Sorted.length - 1, Math.floor((P / 100) * Sorted.length))];
}
for (const [Name, List] of Object.entries(Probe)) {
  const Line = [50, 90, 99, 99.9].map((P) => `p${P} ${Centile(List, P).toExponential(2)}`).join("  ");
  console.log(`${Name.padEnd(10)} ${Line}`);
}
{
  const Line = [50, 90, 99].map((P) => `p${P} ${Centile(Array.from(Flow), P).toFixed(3)}`).join("  ");
  const D = [50, 90, 99].map((P) => `p${P} ${Centile(Array.from(Deposit), P).toFixed(3)}`).join("  ");
  console.log(`flow       ${Line}`);
  console.log(`deposit    ${D}`);
}
{
  const Luma = [];
  for (let I = 0; I < N; I += 1) {
    const C = Shade(I, Eye);
    Luma.push(Aces((C[0] * 0.2126 + C[1] * 0.7152 + C[2] * 0.0722) * Exposure));
  }
  const Pick = (P) => Centile(Luma, P).toFixed(3);
  console.log(`tone  p1 ${Pick(1)}  p10 ${Pick(10)}  p50 ${Pick(50)}  p90 ${Pick(90)}  p99 ${Pick(99)}`
    + `   (sun ${Intensity} sky ${Ambient} exposure ${Exposure})`);
  let Rs = 0; let Gs = 0; let Bs = 0; let Chroma = 0;
  for (let I = 0; I < N; I += 1) {
    const C = Shade(I, Eye).map((V) => Aces(V * Exposure));
    Rs += C[0]; Gs += C[1]; Bs += C[2];
    Chroma += (Math.max(...C) - Math.min(...C)) / Math.max(1e-4, Math.max(...C));
  }
  const Warmth = Rs / Math.max(1e-4, Bs);
  console.log(`cast  mean rgb ${(Rs / N).toFixed(3)} ${(Gs / N).toFixed(3)} ${(Bs / N).toFixed(3)}`
    + ` · red/blue ${Warmth.toFixed(2)} · chroma ${(Chroma / N).toFixed(3)}   (wash ${Wash} bounce ${Return})`);
  let Crushed = 0;
  let Blown = 0;
  let Washed = 0;
  for (const V of Luma) { if (V < 0.02) Crushed += 1; if (V > 0.98) Blown += 1; if (V > 0.85) Washed += 1; }
  console.log(`      ${((Crushed / N) * 100).toFixed(1)}% crushed · ${((Washed / N) * 100).toFixed(1)}% washed out above 0.85 · ${((Blown / N) * 100).toFixed(1)}% clipped`);
}

let Rivers = 0;
let Snowfall = 0;
let Shadowed = 0;
for (let I = 0; I < N; I += 1) {
  if (Flow[I] > 0.12) Rivers += 1;
  if (Snowed[I] > 0.5) Snowfall += 1;
  if (Daylight[I] < 0.5) Shadowed += 1;
}
console.log(`rivers cover ${((Rivers / N) * 100).toFixed(1)}% · snow ${((Snowfall / N) * 100).toFixed(1)}%`
  + ` · in shadow ${((Shadowed / N) * 100).toFixed(1)}%`);
console.log(`wrote ${Panels.length + 1} images to Exhibits/Gallery/TerrainSequence`);
