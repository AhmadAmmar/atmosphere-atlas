/* ------------------------------------------------------------------ binary packs
   Counterpart of atlas/pipeline/pack.py: gzip -> "ATLP" container -> typed arrays. */

async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot unpack the embedded data (DecompressionStream is missing). Please use a current version of Chrome, Edge, Firefox or Safari.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function base64ToBytes(text) {
  const clean = text.replace(/\s+/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

class Pack {
  constructor(index, payload) {
    this.index = index;
    this.payload = payload;
    this._cache = new Map();
  }

  static async fromBase64(text) {
    const raw = await gunzip(base64ToBytes(text));
    if (raw[0] !== 0x41 || raw[1] !== 0x54 || raw[2] !== 0x4c || raw[3] !== 0x50) throw new Error('Corrupt data pack');
    const headerLength = new DataView(raw.buffer, raw.byteOffset + 4, 4).getUint32(0, true);
    const header = new TextDecoder().decode(raw.subarray(8, 8 + headerLength));
    return new Pack(JSON.parse(header), raw.subarray(8 + headerLength));
  }

  has(name) { return Object.prototype.hasOwnProperty.call(this.index, name); }

  names() { return Object.keys(this.index); }

  _bytes(name) {
    const e = this.index[name];
    if (!e) throw new Error(`Missing data array "${name}"`);
    return this.payload.subarray(e.o, e.o + e.n);
  }

  /** Quantised float array -> {data: Float32Array (NaN = missing), shape, meta}. */
  float(name) {
    if (this._cache.has(name)) return this._cache.get(name);
    const e = this.index[name];
    if (!e || e.t !== 'i16') throw new Error(`"${name}" is not a float array`);
    const count = e.shape.reduce((a, b) => a * b, 1);
    const raw = this._bytes(name);
    const q = new Int16Array(count);
    if (e.shuffle) {
      const hi = raw.subarray(count, 2 * count);
      for (let i = 0; i < count; i++) q[i] = raw[i] | (hi[i] << 8);
    } else {
      const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
      for (let i = 0; i < count; i++) q[i] = view.getInt16(i * 2, true);
    }
    if (e.delta) {
      const nx = e.shape[e.shape.length - 1];
      for (let base = 0; base < count; base += nx) {
        for (let i = 1; i < nx; i++) q[base + i] = q[base + i] + q[base + i - 1];     // Int16Array wraps like the encoder
      }
    }
    const out = new Float32Array(count);
    const scale = e.scale;
    const offset = e.offset;
    for (let i = 0; i < count; i++) out[i] = q[i] === -32768 ? NaN : q[i] * scale + offset;
    const result = { data: out, shape: e.shape, meta: e.meta || {} };
    this._cache.set(name, result);
    return result;
  }

  u8(name) {
    const e = this.index[name];
    const raw = this._bytes(name);
    return { data: new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)), shape: e.shape, meta: e.meta || {} };
  }

  i16(name) {
    const e = this.index[name];
    const raw = this._bytes(name);
    return { data: new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)), shape: e.shape, meta: e.meta || {} };
  }

  json(name) {
    if (this._cache.has(name)) return this._cache.get(name);
    const value = JSON.parse(new TextDecoder().decode(this._bytes(name)));
    this._cache.set(name, value);
    return value;
  }

  blob(name) {
    const e = this.index[name];
    const raw = this._bytes(name);
    return new Blob([raw.slice()], { type: e.mime || 'application/octet-stream' });
  }

  grid(name) {
    if (!this._cache.has('grid:' + name)) {
      const f = this.float(name);
      this._cache.set('grid:' + name, new Grid(name, f.data, f.shape, f.meta));
    }
    return this._cache.get('grid:' + name);
  }
}

/* ------------------------------------------------------------------ regular lon/lat grids */
class Grid {
  /** data: Float32Array shaped (nt, ny, nx) or (ny, nx); latitude rows run south to north. */
  constructor(name, data, shape, meta) {
    this.name = name;
    this.data = data;
    this.ny = shape[shape.length - 2];
    this.nx = shape[shape.length - 1];
    this.nt = shape.length === 3 ? shape[0] : 1;
    this.lat0 = meta.lat0;
    this.dlat = meta.dlat;
    this.lon0 = meta.lon0 === undefined ? -180 : meta.lon0;
    this.dlon = meta.dlon;
    this.units = meta.units || '';
    this.title = meta.title || name;
    this.meta = meta;
    this.periodic = Math.abs(this.nx * this.dlon - 360) < 1e-3;
    this.size = this.nx * this.ny;
    this._range = null;
  }

  range() {
    if (!this._range) {
      let lo = Infinity; let hi = -Infinity;
      for (const v of this.data) { if (v < lo) lo = v; if (v > hi) hi = v; }
      this._range = [lo, hi];
    }
    return this._range;
  }

  slice(t) { return this.data.subarray(t * this.size, (t + 1) * this.size); }

  /** Bilinear value in time slice t (integer) at (lon, lat) in degrees; NaN outside the grid. */
  at(t, lon, lat) {
    const fy = (lat - this.lat0) / this.dlat;
    if (fy < -0.5 || fy > this.ny - 0.5) return NaN;
    const y = clamp(fy, 0, this.ny - 1);
    let fx = (lon - this.lon0) / this.dlon;
    const nx = this.nx;
    let x0; let x1; let tx;
    if (this.periodic) {
      fx = mod(fx, nx);
      x0 = Math.floor(fx);
      tx = fx - x0;
      x1 = (x0 + 1) % nx;
    } else {
      fx = (mod(lon - this.lon0 + this.dlon / 2, 360) - this.dlon / 2) / this.dlon;     // regional grid: wrap once, then bound
      if (fx < -0.5 || fx > nx - 0.5) return NaN;
      fx = clamp(fx, 0, nx - 1);
      x0 = Math.min(Math.floor(fx), nx - 2);
      tx = fx - x0;
      x1 = x0 + 1;
    }
    const y0 = Math.min(Math.floor(y), this.ny - 2 < 0 ? 0 : this.ny - 2);
    const y1 = Math.min(y0 + 1, this.ny - 1);
    const ty = y - y0;
    const base = t * this.size;
    const d = this.data;
    const a = d[base + y0 * nx + x0]; const b = d[base + y0 * nx + x1];
    const c = d[base + y1 * nx + x0]; const e = d[base + y1 * nx + x1];
    // weights skip missing corners so coastlines do not leave holes
    let w = 0; let s = 0;
    const wa = (1 - tx) * (1 - ty); const wb = tx * (1 - ty); const wc = (1 - tx) * ty; const we = tx * ty;
    if (a === a) { s += a * wa; w += wa; }
    if (b === b) { s += b * wb; w += wb; }
    if (c === c) { s += c * wc; w += wc; }
    if (e === e) { s += e * we; w += we; }
    return w > 0.25 ? s / w : NaN;
  }

  /** Value at a fractional position in the 12-month cycle: {i0, i1, t} from monthPos(). */
  atMonth(mp, lon, lat) {
    if (this.nt === 1) return this.at(0, lon, lat);
    const a = this.at(mp.i0, lon, lat);
    const b = this.at(mp.i1, lon, lat);
    if (a !== a) return b;
    if (b !== b) return a;
    return a + (b - a) * mp.t;
  }

  /** Whole-field blend of two months into `out` (a Float32Array of nx*ny). */
  blend(mp, out) {
    const n = this.size;
    const a = this.data.subarray(mp.i0 * n, (mp.i0 + 1) * n);
    const b = this.data.subarray(mp.i1 * n, (mp.i1 + 1) * n);
    const t = mp.t;
    for (let i = 0; i < n; i++) {
      const x = a[i]; const y = b[i];
      out[i] = x !== x ? y : y !== y ? x : x + (y - x) * t;
    }
    return out;
  }
}
