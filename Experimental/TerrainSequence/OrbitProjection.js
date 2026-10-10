// OrbitProjection — the viewport camera and the small amount of matrix algebra the renderer needs.
// Column-major throughout, and a projection that maps depth into 0..1 because that is the clip
// volume WebGPU uses.

export function Perspective(FovY, Aspect, Near, Far) {
  const F = 1 / Math.tan(FovY * 0.5);
  const M = new Float32Array(16);
  M[0] = F / Aspect;
  M[5] = F;
  M[10] = Far / (Near - Far);
  M[11] = -1;
  M[14] = (Near * Far) / (Near - Far);
  return M;
}

export function LookAt(Eye, Target, Up) {
  const Z = Normalise([Eye[0] - Target[0], Eye[1] - Target[1], Eye[2] - Target[2]]);
  const X = Normalise(Cross(Up, Z));
  const Y = Cross(Z, X);
  return new Float32Array([
    X[0], Y[0], Z[0], 0,
    X[1], Y[1], Z[1], 0,
    X[2], Y[2], Z[2], 0,
    -Dot(X, Eye), -Dot(Y, Eye), -Dot(Z, Eye), 1,
  ]);
}

export function Multiply(A, B) {
  const M = new Float32Array(16);
  for (let C = 0; C < 4; C += 1) {
    for (let R = 0; R < 4; R += 1) {
      let S = 0;
      for (let K = 0; K < 4; K += 1) S += A[K * 4 + R] * B[C * 4 + K];
      M[C * 4 + R] = S;
    }
  }
  return M;
}

export function Invert(A) {
  const M = new Float32Array(16);
  const B = A;
  const S0 = B[0] * B[5] - B[1] * B[4];
  const S1 = B[0] * B[6] - B[2] * B[4];
  const S2 = B[0] * B[7] - B[3] * B[4];
  const S3 = B[1] * B[6] - B[2] * B[5];
  const S4 = B[1] * B[7] - B[3] * B[5];
  const S5 = B[2] * B[7] - B[3] * B[6];
  const C5 = B[10] * B[15] - B[11] * B[14];
  const C4 = B[9] * B[15] - B[11] * B[13];
  const C3 = B[9] * B[14] - B[10] * B[13];
  const C2 = B[8] * B[15] - B[11] * B[12];
  const C1 = B[8] * B[14] - B[10] * B[12];
  const C0 = B[8] * B[13] - B[9] * B[12];
  const Det = S0 * C5 - S1 * C4 + S2 * C3 + S3 * C2 - S4 * C1 + S5 * C0;
  if (Math.abs(Det) < 1e-20) return M;
  const D = 1 / Det;
  M[0] = (B[5] * C5 - B[6] * C4 + B[7] * C3) * D;
  M[1] = (-B[1] * C5 + B[2] * C4 - B[3] * C3) * D;
  M[2] = (B[13] * S5 - B[14] * S4 + B[15] * S3) * D;
  M[3] = (-B[9] * S5 + B[10] * S4 - B[11] * S3) * D;
  M[4] = (-B[4] * C5 + B[6] * C2 - B[7] * C1) * D;
  M[5] = (B[0] * C5 - B[2] * C2 + B[3] * C1) * D;
  M[6] = (-B[12] * S5 + B[14] * S2 - B[15] * S1) * D;
  M[7] = (B[8] * S5 - B[10] * S2 + B[11] * S1) * D;
  M[8] = (B[4] * C4 - B[5] * C2 + B[7] * C0) * D;
  M[9] = (-B[0] * C4 + B[1] * C2 - B[3] * C0) * D;
  M[10] = (B[12] * S4 - B[13] * S2 + B[15] * S0) * D;
  M[11] = (-B[8] * S4 + B[9] * S2 - B[11] * S0) * D;
  M[12] = (-B[4] * C3 + B[5] * C1 - B[6] * C0) * D;
  M[13] = (B[0] * C3 - B[1] * C1 + B[2] * C0) * D;
  M[14] = (-B[12] * S3 + B[13] * S1 - B[14] * S0) * D;
  M[15] = (B[8] * S3 - B[9] * S1 + B[10] * S0) * D;
  return M;
}

export function Normalise(V) {
  const L = Math.hypot(V[0], V[1], V[2]) || 1;
  return [V[0] / L, V[1] / L, V[2] / L];
}
export function Cross(A, B) {
  return [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
}
export function Dot(A, B) { return A[0] * B[0] + A[1] * B[1] + A[2] * B[2]; }

// Bearing measured clockwise from north, elevation above the horizon — the way a sun position is
// actually quoted, rather than as a raw vector.
export function SunVector(AzimuthDegrees, ElevationDegrees) {
  const A = (AzimuthDegrees * Math.PI) / 180;
  const E = (ElevationDegrees * Math.PI) / 180;
  const C = Math.cos(E);
  return Normalise([Math.sin(A) * C, Math.sin(E), -Math.cos(A) * C]);
}

export class OrbitProjection {
  constructor(Extent) {
    this.Target = [0, 0, 0];
    this.Yaw = 0.72;
    this.Pitch = 0.42;
    this.Distance = Extent * 1.15;
    this.Extent = Extent;
    this.Fov = (42 * Math.PI) / 180;
    this.Dirty = true;
  }

  Frame(Extent, Lift) {
    this.Extent = Extent;
    this.Distance = Extent * 1.15;
    this.Target = [0, Lift * 0.3, 0];
    this.Dirty = true;
  }

  Turn(Dx, Dy) {
    this.Yaw -= Dx * 0.0052;
    this.Pitch = Math.min(1.53, Math.max(-0.22, this.Pitch - Dy * 0.0047));
    this.Dirty = true;
  }

  Pan(Dx, Dy) {
    const Scale = this.Distance * 0.0013;
    const Right = [Math.cos(this.Yaw), 0, -Math.sin(this.Yaw)];
    const Ahead = [Math.sin(this.Yaw), 0, Math.cos(this.Yaw)];
    for (let K = 0; K < 3; K += 1) {
      this.Target[K] -= Right[K] * Dx * Scale;
      this.Target[K] += Ahead[K] * Dy * Scale;
    }
    const Reach = this.Extent * 0.75;
    this.Target[0] = Math.min(Reach, Math.max(-Reach, this.Target[0]));
    this.Target[2] = Math.min(Reach, Math.max(-Reach, this.Target[2]));
    this.Dirty = true;
  }

  Dolly(Amount) {
    this.Distance = Math.min(this.Extent * 4.5, Math.max(this.Extent * 0.02, this.Distance * Math.exp(Amount * 0.0014)));
    this.Dirty = true;
  }

  get Eye() {
    const C = Math.cos(this.Pitch);
    return [
      this.Target[0] + Math.sin(this.Yaw) * C * this.Distance,
      this.Target[1] + Math.sin(this.Pitch) * this.Distance,
      this.Target[2] + Math.cos(this.Yaw) * C * this.Distance,
    ];
  }

  Matrices(Aspect) {
    const Eye = this.Eye;
    const Near = Math.max(1.5, this.Distance * 0.004);
    const Far = Math.max(this.Extent * 9, this.Distance * 7);
    const View = LookAt(Eye, this.Target, [0, 1, 0]);
    const Clip = Perspective(this.Fov, Aspect, Near, Far);
    return { Eye, View, Clip, ViewClip: Multiply(Clip, View), Near, Far };
  }
}
