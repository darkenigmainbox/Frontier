// ─── Lightweight triangle-soup mesh builder (DOM-free) ───────────────────────

export interface RGB { r: number; g: number; b: number }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}

export function rgbMix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

export interface V3 { x: number; y: number; z: number }

export interface MeshData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export class MeshBuilder {
  pos: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  get vertexCount(): number { return this.pos.length / 3; }

  private pushV(p: V3, c: RGB): number {
    const i = this.vertexCount;
    this.pos.push(p.x, p.y, p.z);
    this.col.push(c.r, c.g, c.b);
    return i;
  }

  /** Triangle with CCW winding when viewed from the normal side. */
  tri(a: V3, b: V3, c: V3, color: RGB | string, colorB?: RGB | string, colorC?: RGB | string): void {
    const ca = typeof color === 'string' ? hexToRgb(color) : color;
    const cb = colorB ? (typeof colorB === 'string' ? hexToRgb(colorB) : colorB) : ca;
    const cc = colorC ? (typeof colorC === 'string' ? hexToRgb(colorC) : colorC) : ca;
    const i = this.pushV(a, ca);
    this.pushV(b, cb);
    this.pushV(c, cc);
    this.idx.push(i, i + 1, i + 2);
  }

  /** Quad a→b→c→d (CCW). Optional per-vertex colors for gradients. */
  quad(a: V3, b: V3, c: V3, d: V3, color: RGB | string, cols?: [RGB | string, RGB | string, RGB | string, RGB | string]): void {
    const ca = typeof color === 'string' ? hexToRgb(color) : color;
    const cv = cols?.map((x) => (typeof x === 'string' ? hexToRgb(x) : x)) ?? [ca, ca, ca, ca];
    const i = this.pushV(a, cv[0]);
    this.pushV(b, cv[1]);
    this.pushV(c, cv[2]);
    this.pushV(d, cv[3]);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }

  /** Axis box with optional Y rotation, centered at (cx, cy, cz) where cy is the CENTER height. */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rotY: number, color: RGB | string): void {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const P = (x: number, y: number, z: number): V3 => ({
      x: cx + x * cos + z * sin,
      y: cy + y,
      z: cz - x * sin + z * cos,
    });
    const p000 = P(-hx, -hy, -hz), p100 = P(hx, -hy, -hz), p110 = P(hx, hy, -hz), p010 = P(-hx, hy, -hz);
    const p001 = P(-hx, -hy, hz), p101 = P(hx, -hy, hz), p111 = P(hx, hy, hz), p011 = P(-hx, hy, hz);
    // +x, -x, +y, -y, +z, -z
    this.quad(p100, p101, p111, p110, color);
    this.quad(p001, p000, p010, p011, color);
    this.quad(p010, p110, p111, p011, color);
    this.quad(p001, p101, p100, p000, color);
    this.quad(p101, p001, p011, p111, color);
    this.quad(p000, p100, p110, p010, color);
  }

  /** Box sitting on the ground: cy = ground height, extends up by sy. */
  boxOn(cx: number, groundY: number, cz: number, sx: number, sy: number, sz: number, rotY: number, color: RGB | string): void {
    this.box(cx, groundY + sy / 2, cz, sx, sy, sz, rotY, color);
  }

  /** Extrusion of a 2D cross-section (list of [lateral, height]) along a frame polyline. */
  // (kept simple — specific generators build their own strips)

  isEmpty(): boolean { return this.idx.length === 0; }

  build(): MeshData {
    return {
      positions: new Float32Array(this.pos),
      colors: new Float32Array(this.col),
      indices: new Uint32Array(this.idx),
    };
  }
}
