/* ============================================================
 * Frontier · SDF terrain — dependency-free PNG writer
 *
 * Works identically in the browser and in Node: no zlib, no canvas.
 * The IDAT stream uses DEFLATE *stored* blocks (BTYPE = 00), which is
 * legal PNG and keeps the writer synchronous and ~30 lines long. A
 * 112² 16-bit heightmap is ~25 KB; a 512² splatmap ~800 KB. If a file
 * needs to be small, run it through any PNG optimiser afterwards.
 * ============================================================ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** zlib stream with stored deflate blocks. */
function zlibStored(data) {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(data.length / MAX));
  const size = data.length + blocks * 5 + 6;
  const buf = new Uint8Array(size);
  buf[0] = 0x78; buf[1] = 0x01;              // zlib header, no compression
  let o = 2;
  for (let i = 0; i < blocks; i++) {
    const start = i * MAX;
    const len = Math.min(MAX, data.length - start);
    const last = i === blocks - 1 ? 1 : 0;
    buf[o++] = last;                          // BFINAL + BTYPE=00
    buf[o++] = len & 0xff;
    buf[o++] = (len >> 8) & 0xff;
    buf[o++] = (~len) & 0xff;
    buf[o++] = ((~len) >> 8) & 0xff;
    buf.set(data.subarray(start, start + len), o);
    o += len;
  }
  const ad = adler32(data);
  buf[o++] = (ad >>> 24) & 0xff;
  buf[o++] = (ad >>> 16) & 0xff;
  buf[o++] = (ad >>> 8) & 0xff;
  buf[o++] = ad & 0xff;
  return buf.subarray(0, o);
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(ascii(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const ascii = (s) => {
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
};

/**
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} data   samples, row-major, `channels` per pixel
 * @param {number} [channels=3]
 * @param {{bitDepth?: 8|16}} [opt]
 * @returns {Uint8Array} PNG bytes
 */
export function encodePNG(width, height, data, channels = 3, { bitDepth = 8 } = {}) {
  const colorType = channels === 4 ? 6 : channels === 1 ? 0 : channels === 2 ? 4 : 2;
  const bytesPerSample = bitDepth === 16 ? 2 : 1;
  const stride = width * channels * bytesPerSample;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, width);
  hv.setUint32(4, height);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Grayscale helper: normalise a float field into an 8-bit image. */
export function grayToPNG(width, height, field, { min = null, max = null, invert = false } = {}) {
  let mn = min, mx = max;
  if (mn === null || mx === null) {
    mn = Infinity; mx = -Infinity;
    for (let i = 0; i < width * height; i++) {
      const v = field[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  }
  const span = Math.max(mx - mn, 1e-9);
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    let v = (field[i] - mn) / span;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    out[i] = Math.round((invert ? 1 - v : v) * 255);
  }
  return encodePNG(width, height, out, 1);
}

/** Convert bytes to a Blob for browser downloads. */
export function toBlob(bytes, type = 'application/octet-stream') {
  return new Blob([bytes], { type });
}
