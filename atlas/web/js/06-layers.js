/* ------------------------------------------------------------------ data layers on the globe */

/** One colour-mapped scalar field drawn by the Earth shader (two month textures are blended on the GPU). */
class ScalarSlot {
  constructor(globe, index) {
    this.globe = globe;
    this.k = 'F' + index;
    this.u = globe.uniforms;
    this.textures = [];
    this.def = null;
    this.grid = null;
    this.lutTexture = null;
  }

  get active() { return !!this.def; }

  set(def, grid, { mask = 0, opacity = 0.86 } = {}) {
    this.clear(false);
    const k = this.k; const u = this.u;
    this.def = def; this.grid = grid;
    this.textures = new Array(grid.nt).fill(null);
    this.lutTexture = new THREE.DataTexture(A.cmap.lut(def.cmap), 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.lutTexture.minFilter = THREE.LinearFilter; this.lutTexture.magFilter = THREE.LinearFilter;
    this.lutTexture.generateMipmaps = false; this.lutTexture.needsUpdate = true;
    u[`u${k}Lut`].value = this.lutTexture;
    u[`u${k}Grid`].value.set(grid.lon0 * DEG, 1 / (grid.nx * grid.dlon * DEG), grid.lat0 * DEG, 1 / (grid.ny * grid.dlat * DEG));
    u[`u${k}Half`].value.set(0.5 / grid.nx, 0.5 / grid.ny);
    const latSpan = grid.ny * grid.dlat;
    u[`u${k}Clip`].value = !grid.periodic ? 2 : (latSpan < 178 ? 1 : 0);
    u[`u${k}Mask`].value = def.mask === undefined ? mask : def.mask;
    u[`u${k}Gamma`].value = def.gamma || 1;
    u[`u${k}Invert`].value = def.invert ? 1 : 0;
    u[`u${k}Opacity`].value = def.opacity === undefined ? opacity : def.opacity;
    u[`u${k}On`].value = 1;
    this.globe.requestRender();
  }

  _texture(t) {
    if (this.textures[t]) return this.textures[t];
    const g = this.grid; const [lo, hi] = this.def.range;
    const src = g.slice(t);
    const bytes = new Uint8Array(g.size);
    const inv = 255 / (hi - lo);
    for (let i = 0; i < g.size; i++) {
      const v = src[i];
      bytes[i] = v !== v ? 0 : clamp(Math.round((v - lo) * inv), 0, 255);
    }
    const tex = new THREE.DataTexture(bytes, g.nx, g.ny, THREE.RedFormat, THREE.UnsignedByteType);
    tex.unpackAlignment = 1;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    tex.wrapS = g.periodic ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    this.textures[t] = tex;
    return tex;
  }

  /** mp = {i0, i1, t} month position, or for time-indexed data pass {i0: n, i1: n, t: 0}. */
  setTime(mp) {
    if (!this.def) return;
    const k = this.k; const u = this.u;
    const nt = this.grid.nt;
    const i0 = Math.min(mp.i0, nt - 1); const i1 = Math.min(mp.i1, nt - 1);
    u[`u${k}A`].value = this._texture(i0);
    u[`u${k}B`].value = this._texture(i1);
    u[`u${k}Mix`].value = nt === 1 ? 0 : mp.t;
    this.globe.requestRender();
  }

  setOpacity(v) { this.u[`u${this.k}Opacity`].value = v; this.globe.requestRender(); }

  clear(render = true) {
    const k = this.k; const u = this.u;
    u[`u${k}On`].value = 0;
    u[`u${k}A`].value = this.globe.blank; u[`u${k}B`].value = this.globe.blank;
    this.textures.forEach(t => t && t.dispose());
    if (this.lutTexture) this.lutTexture.dispose();
    this.textures = []; this.def = null; this.grid = null; this.lutTexture = null;
    if (render) this.globe.requestRender();
  }
}

/** Derived grid: wind or current speed from two component grids (same shape). */
A.speedGrid = function speedGrid(name, ug, vg) {
  const data = new Float32Array(ug.data.length);
  for (let i = 0; i < data.length; i++) data[i] = Math.hypot(ug.data[i], vg.data[i]);
  const shape = ug.nt > 1 ? [ug.nt, ug.ny, ug.nx] : [ug.ny, ug.nx];
  return new Grid(name, data, shape, { ...ug.meta, units: ug.units, title: name });
};

/* ------------------------------------------------------------------ particle flow (winds and currents)
   Thousands of particles are advected through the monthly velocity field on the CPU.  Their short
   line segments are drawn into an off-screen texture that fades by a fixed amount every frame, which
   leaves the familiar flowing trails; the texture is then draped over the globe at a chosen height. */
class FlowLayer {
  /** opts: {u, v: Grid, count, scale (degrees per frame per m/s), height, life: [min, max] frames, fade, maxSpeed, ramp, opacity, width, heightPx, strokes} */
  constructor(globe, opts) {
    this.globe = globe;
    this.o = Object.assign({ count: 7000, scale: 0.008, height: 0.004, life: [50, 130], fade: 2.2 / 255, maxSpeed: 25, ramp: 'speed',
      opacity: 0.95, width: 2048, heightPx: 1024, strokes: 2 }, opts);
    const W = this.o.width; const H = this.o.heightPx;
    this.rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType, depthBuffer: false, generateMipmaps: false });
    this.rt.texture.wrapS = THREE.RepeatWrapping;
    this.rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.trailScene = new THREE.Scene();
    this.trailCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fadeMat = new THREE.ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'precision highp float; uniform float uFade; void main() { gl_FragColor = vec4(vec3(uFade), uFade); }',
      uniforms: { uFade: { value: this.o.fade } }, depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.ReverseSubtractEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.ReverseSubtractEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    });
    this.fadeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMat);
    this.fadeQuad.frustumCulled = false; this.fadeQuad.renderOrder = 0;
    this.trailScene.add(this.fadeQuad);
    const n = this.o.count;
    const segMax = n * this.o.strokes;
    this.segPos = new Float32Array(segMax * 6);
    this.segCol = new Float32Array(segMax * 8);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.segPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aCol', new THREE.BufferAttribute(this.segCol, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const lineMat = new THREE.ShaderMaterial({
      vertexShader: 'attribute vec4 aCol; varying vec4 vCol; void main() { vCol = aCol; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'precision highp float; varying vec4 vCol; void main() { gl_FragColor = vCol; }',
      depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.lines = new THREE.LineSegments(geo, lineMat);
    this.lines.frustumCulled = false; this.lines.renderOrder = 1;
    this.trailScene.add(this.lines);
    this.geo = geo;
    this.shell = new FlowShell(globe, this.rt.texture, { height: this.o.height, opacity: this.o.opacity, order: 2 + this.o.height });
    this.lon = new Float32Array(n); this.lat = new Float32Array(n); this.age = new Float32Array(n); this.life = new Float32Array(n);
    this.px = new Float32Array(n); this.py = new Float32Array(n);
    this.U = new Float32Array(this.o.u.size); this.V = new Float32Array(this.o.u.size);
    this.mpKey = -1;
    this.lut = A.cmap.lut(this.o.ramp);
    this.running = false;
    for (let i = 0; i < n; i++) this._spawn(i, true);
    this.setTime(monthPos(A.state.day));
    this._clearTrails();
  }

  _clearTrails() {
    const r = this.globe.renderer;
    const prev = r.getRenderTarget(); const col = new THREE.Color(); r.getClearColor(col); const alpha = r.getClearAlpha();
    r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.clear(true, false, false);
    r.setRenderTarget(prev); r.setClearColor(col, alpha);
  }

  setTime(mp) {
    const key = mp.i0 * 1000 + Math.round(mp.t * 200);
    if (key === this.mpKey) return;
    this.mpKey = key;
    this.o.u.blend(mp, this.U);
    this.o.v.blend(mp, this.V);
  }

  _sample(lon, lat) {
    const g = this.o.u;
    const fy = (lat - g.lat0) / g.dlat;
    if (fy < 0 || fy > g.ny - 1) return null;
    const fx = mod((lon - g.lon0) / g.dlon, g.nx);
    const x0 = Math.floor(fx); const x1 = (x0 + 1) % g.nx; const tx = fx - x0;
    const y0 = Math.min(Math.floor(fy), g.ny - 2); const ty = fy - y0;
    const nx = g.nx;
    const a = y0 * nx + x0; const b = y0 * nx + x1; const c = (y0 + 1) * nx + x0; const d = (y0 + 1) * nx + x1;
    const U = this.U; const V = this.V;
    const ua = U[a]; const ub = U[b]; const uc = U[c]; const ud = U[d];
    if (ua !== ua || ub !== ub || uc !== uc || ud !== ud) return null;
    const w0 = (1 - tx) * (1 - ty); const w1 = tx * (1 - ty); const w2 = (1 - tx) * ty; const w3 = tx * ty;
    return [ua * w0 + ub * w1 + uc * w2 + ud * w3, V[a] * w0 + V[b] * w1 + V[c] * w2 + V[d] * w3];
  }

  _spawn(i, initial = false) {
    let lon; let lat; let tries = 0;
    do {
      lon = Math.random() * 360 - 180;
      lat = Math.asin(Math.random() * 2 - 1) * RAD;                 // uniform on the sphere
      if (Math.abs(lat) > 86) lat = Math.sign(lat) * 86;
      tries++;
    } while (tries < 8 && this._sample(lon, lat) === null);
    this.lon[i] = lon; this.lat[i] = lat;
    this.life[i] = lerp(this.o.life[0], this.o.life[1], Math.random());
    this.age[i] = initial ? Math.random() * this.life[i] : 0;
    this.px[i] = NaN;
  }

  start() { if (!this.running) { this.running = true; this.globe.needAnimation(1); } }
  stop() { if (this.running) { this.running = false; this.globe.needAnimation(-1); } }
  set visible(v) { this.shell.visible = v; if (v) this.start(); else this.stop(); }
  get visible() { return this.shell.visible; }

  step(dt) {
    if (!this.running) return;
    const n = this.o.count;
    const frames = Math.min(2.5, dt * 60);
    const k = this.o.scale * frames;
    const maxS = this.o.maxSpeed;
    const lut = this.lut;
    const pos = this.segPos; const col = this.segCol;
    const strokes = this.o.strokes;
    const dy = 1 / this.o.heightPx * 2;        // one texel in clip units
    let seg = 0;
    for (let i = 0; i < n; i++) {
      this.age[i] += frames;
      if (this.age[i] > this.life[i]) { this._spawn(i); continue; }
      const s = this._sample(this.lon[i], this.lat[i]);
      if (s === null) { this._spawn(i); continue; }
      const speed = Math.hypot(s[0], s[1]);
      const cl = Math.max(0.12, Math.cos(this.lat[i] * DEG));
      const nl = this.lon[i] + s[0] * k / cl;
      const nb = this.lat[i] + s[1] * k;
      if (Math.abs(nb) > 88) { this._spawn(i); continue; }
      const x0 = this.lon[i] / 180; const y0 = this.lat[i] / 90;
      const wl = wrap180(nl);
      const x1 = wl / 180; const y1 = nb / 90;
      this.lon[i] = wl; this.lat[i] = nb;
      if (Math.abs(x1 - x0) < 1 && this.px[i] === this.px[i]) {
        const li = Math.min(255, Math.floor(clamp(speed / maxS, 0, 0.999) * 256)) * 4;
        const a = 0.55 + 0.45 * clamp(speed / maxS, 0, 1);
        for (let st = 0; st < strokes; st++) {
          const o = seg * 6; const c = seg * 8; const off = st * dy * 0.5;
          pos[o] = x0; pos[o + 1] = y0 + off; pos[o + 2] = 0; pos[o + 3] = x1; pos[o + 4] = y1 + off; pos[o + 5] = 0;
          for (let v = 0; v < 2; v++) { col[c + v * 4] = lut[li] / 255; col[c + v * 4 + 1] = lut[li + 1] / 255; col[c + v * 4 + 2] = lut[li + 2] / 255; col[c + v * 4 + 3] = a; }
          seg++;
        }
      }
      this.px[i] = x1;
    }
    this.geo.setDrawRange(0, seg * 2);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aCol.needsUpdate = true;
    const r = this.globe.renderer;
    const prev = r.getRenderTarget(); const auto = r.autoClear;
    r.setRenderTarget(this.rt); r.autoClear = false;
    r.render(this.trailScene, this.trailCam);
    r.setRenderTarget(prev); r.autoClear = auto;
  }

  dispose() { this.stop(); this.shell.dispose(); this.rt.dispose(); this.geo.dispose(); }
}

/* ------------------------------------------------------------------ contour lines (isobars, heights) */
A.contour = {
  /** Marching squares over a (ny x nx) field; returns segments [[lon1, lat1, lon2, lat2], ...] for one level. */
  segments(field, nx, ny, lon0, dlon, lat0, dlat, level, periodic) {
    const out = [];
    const cols = periodic ? nx : nx - 1;
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < cols; i++) {
        const i2 = (i + 1) % nx;
        const a = field[j * nx + i]; const b = field[j * nx + i2];
        const c = field[(j + 1) * nx + i2]; const d = field[(j + 1) * nx + i];
        if (a !== a || b !== b || c !== c || d !== d) continue;
        let code = 0;
        if (a >= level) code |= 1;
        if (b >= level) code |= 2;
        if (c >= level) code |= 4;
        if (d >= level) code |= 8;
        if (code === 0 || code === 15) continue;
        const x = lon0 + i * dlon; const y = lat0 + j * dlat;
        const interp = (v0, v1) => (level - v0) / (v1 - v0);
        const pb = [x + interp(a, b) * dlon, y];                       // bottom edge
        const pr = [x + dlon, y + interp(b, c) * dlat];                // right edge
        const pt = [x + interp(d, c) * dlon, y + dlat];                // top edge
        const pl = [x, y + interp(a, d) * dlat];                       // left edge
        const add = (p, q) => out.push([p[0], p[1], q[0], q[1]]);
        switch (code) {
          case 1: case 14: add(pl, pb); break;
          case 2: case 13: add(pb, pr); break;
          case 3: case 12: add(pl, pr); break;
          case 4: case 11: add(pr, pt); break;
          case 6: case 9: add(pb, pt); break;
          case 7: case 8: add(pl, pt); break;
          case 5: add(pl, pt); add(pb, pr); break;
          case 10: add(pl, pb); add(pr, pt); break;
          default: break;
        }
      }
    }
    return out;
  },

  /** Bilinear up-sampling by an integer factor followed by one light smoothing pass. */
  refine(grid, data, factor) {
    const nx = grid.nx; const ny = grid.ny;
    const NX = grid.periodic ? nx * factor : (nx - 1) * factor + 1;
    const NY = (ny - 1) * factor + 1;
    const out = new Float32Array(NX * NY);
    for (let J = 0; J < NY; J++) {
      const fy = J / factor; const y0 = Math.min(Math.floor(fy), ny - 2); const ty = fy - y0;
      for (let I = 0; I < NX; I++) {
        const fx = I / factor; const x0 = Math.floor(fx) % nx; const x1 = (x0 + 1) % nx; const tx = fx - Math.floor(fx);
        const v00 = data[y0 * nx + x0]; const v10 = data[y0 * nx + x1]; const v01 = data[(y0 + 1) * nx + x0]; const v11 = data[(y0 + 1) * nx + x1];
        out[J * NX + I] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      }
    }
    // light box blur to round off the bilinear kinks
    const tmp = new Float32Array(out.length);
    for (let J = 0; J < NY; J++) {
      for (let I = 0; I < NX; I++) {
        let s = 0; let c = 0;
        for (let dj = -1; dj <= 1; dj++) {
          const jj = J + dj; if (jj < 0 || jj >= NY) continue;
          for (let di = -1; di <= 1; di++) {
            let ii = I + di;
            if (grid.periodic) ii = mod(ii, NX); else if (ii < 0 || ii >= NX) continue;
            s += out[jj * NX + ii]; c++;
          }
        }
        tmp[J * NX + I] = s / c;
      }
    }
    return { data: tmp, nx: NX, ny: NY, dlon: grid.dlon / factor, dlat: grid.dlat / factor };
  },
};

/* ------------------------------------------------------------------ the layer manager */
class LayerManager {
  constructor(globe) {
    this.globe = globe;
    this.slots = [new ScalarSlot(globe, 0), new ScalarSlot(globe, 1)];
    this.colorId = null;
    this.flows = new Map();          // id -> FlowLayer
    this.contours = new Map();       // id -> {lines, labels, ...}
    this.baseLines = {};
    this.catTexture = null;
    this.defs = {};
    this.derived = {};
    this.mp = monthPos(A.state.day);
    this.pressureCentres = null;
    this._contourKey = {};
    A.bus.on('frame', dt => { for (const f of this.flows.values()) f.step(dt); });
  }

  /* ------------------------------------------------------------ definitions */
  define(def) { this.defs[def.id] = def; }

  grid(name) {
    if (this.derived[name]) return this.derived[name];
    const core = A.packs.core;
    if (core && core.has(name)) return core.grid(name);
    for (const key of ['enso', 'storms']) if (A.packs[key] && A.packs[key].has(name)) return A.packs[key].grid(name);
    return null;
  }

  speedOf(name, uName, vName) {
    if (!this.derived[name]) this.derived[name] = A.speedGrid(name, this.grid(uName), this.grid(vName));
    return this.derived[name];
  }

  /* ------------------------------------------------------------ colour layer */
  async setColor(id, slot = 0, opts = {}) {
    const s = this.slots[slot];
    if (!id) { s.clear(); if (slot === 0) this.colorId = null; A.bus.emit('layers'); return; }
    const def = this.defs[id];
    if (!def) return;
    if (def.pack && !A.packs[def.pack]) await A.loadPack(def.pack);
    if (def.kind === 'category') { this.setCategory(def); if (slot === 0) this.colorId = id; A.bus.emit('layers'); return; }
    this.clearCategory();
    const grid = def.speedOf ? this.speedOf(id, def.speedOf[0], def.speedOf[1]) : this.grid(def.field);
    if (!grid) return;
    s.set(def, grid, opts);
    s.setTime(this.timeIndex(grid));
    if (slot === 0) this.colorId = id;
    A.bus.emit('layers');
  }

  timeIndex(grid) { return grid.nt === 12 ? this.mp : { i0: 0, i1: 0, t: 0 }; }

  setCategory(def) {
    this.slots[0].clear(false);
    const u = this.globe.uniforms;
    if (!this.catTexture) {
      const k = A.packs.core.u8('koppen');
      const classes = A.packs.core.json('koppen_classes');
      const rgba = new Uint8Array(k.data.length * 4);
      const colour = new Map(classes.map(c => [c.id, c.rgb]));
      for (let i = 0; i < k.data.length; i++) {
        const c = colour.get(k.data[i]);
        if (c) { rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255; }
      }
      const t = new THREE.DataTexture(rgba, 720, 360, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false;
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
      this.catTexture = t;
      this.catMeta = k.meta;
    }
    const m = this.catMeta;
    u.uCat.value = this.catTexture;
    u.uCatGrid.value.set(m.lon0 * DEG, 1 / (720 * 0.5 * DEG), m.lat0 * DEG, 1 / (360 * 0.5 * DEG));
    u.uCatHalf.value.set(0.5 / 720, 0.5 / 360);
    u.uCatOn.value = 1;
    u.uCatOpacity.value = 0.88;
    this.globe.requestRender();
  }

  clearCategory() { this.globe.uniforms.uCatOn.value = 0; this.globe.requestRender(); }

  /* ------------------------------------------------------------ sea ice in the base map */
  enableSeaIce(on = true) {
    const u = this.globe.uniforms;
    if (!on) { u.uIceOn.value = 0; this.globe.requestRender(); return; }
    const g = this.grid('ice');
    this.iceGrid = g;
    this.iceTextures = [];
    u.uIceGrid.value.set(g.lon0 * DEG, 1 / (g.nx * g.dlon * DEG), g.lat0 * DEG, 1 / (g.ny * g.dlat * DEG));
    u.uIceHalf.value.set(0.5 / g.nx, 0.5 / g.ny);
    u.uIceOn.value = 1;
    this._iceTime();
  }

  _iceTexture(t) {
    if (!this.iceTextures[t]) {
      const g = this.iceGrid; const src = g.slice(t);
      const bytes = new Uint8Array(g.size);
      for (let i = 0; i < g.size; i++) bytes[i] = clamp(Math.round(src[i] * 2.55), 0, 255);
      const tex = new THREE.DataTexture(bytes, g.nx, g.ny, THREE.RedFormat, THREE.UnsignedByteType);
      tex.unpackAlignment = 1; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
      this.iceTextures[t] = tex;
    }
    return this.iceTextures[t];
  }

  _iceTime() {
    if (!this.iceGrid) return;
    const u = this.globe.uniforms;
    u.uIceA.value = this._iceTexture(this.mp.i0);
    u.uIceB.value = this._iceTexture(this.mp.i1);
    u.uIceMix.value = this.mp.t;
  }

  /* ------------------------------------------------------------ flow layers */
  flowDef(id) {
    const g = n => this.grid(n);
    switch (id) {
      case 'wind10': return { u: g('u10'), v: g('v10'), count: 9000, scale: 0.0075, height: 0.004, maxSpeed: 16, life: [50, 120] };
      case 'wind850': return { u: g('u850'), v: g('v850'), count: 7000, scale: 0.0075, height: 0.014, maxSpeed: 22 };
      case 'wind500': return { u: g('u500'), v: g('v500'), count: 7000, scale: 0.0065, height: 0.03, maxSpeed: 40 };
      case 'wind250': return { u: g('u250'), v: g('v250'), count: 8000, scale: 0.0055, height: 0.055, maxSpeed: 70, lineWidth: 1.3 };
      case 'currents': return { u: g('cur_u'), v: g('cur_v'), count: 9000, scale: 0.05, height: 0.003, maxSpeed: 1.2, life: [60, 150], lineWidth: 1.2 };
      default: return null;
    }
  }

  setFlow(id, on) {
    if (on && !this.flows.has(id)) {
      const def = this.flowDef(id);
      if (!def) return;
      const f = new FlowLayer(this.globe, def);
      f.id = id;
      this.flows.set(id, f);
      f.start();
    } else if (!on && this.flows.has(id)) {
      this.flows.get(id).dispose();
      this.flows.delete(id);
    }
    this.globe.requestRender();
    A.bus.emit('layers');
  }

  hasFlow(id) { return this.flows.has(id); }

  /* ------------------------------------------------------------ contours */
  setContour(id, on) {
    if (!on) {
      const c = this.contours.get(id);
      if (c) { c.lines.dispose(); this.globe.labels.removeGroup('contour-' + id); this.contours.delete(id); }
      this.globe.requestRender(); A.bus.emit('layers');
      return;
    }
    if (this.contours.has(id)) return;
    const spec = id === 'isobars'
      ? { field: 'slp', interval: 4, base: 1012, color: '#ffffff', opacity: 0.55, major: 20 }
      : { field: 'z500', interval: 60, base: 5460, color: '#ffd9a0', opacity: 0.6, major: 300 };
    const lines = new GeoLines(this.globe, { color: spec.color, opacity: spec.opacity, height: 0.006, order: 2.5 });
    this.contours.set(id, { spec, lines });
    this._contourKey[id] = -1;
    this.updateContour(id);
    A.bus.emit('layers');
  }

  updateContour(id) {
    const c = this.contours.get(id);
    if (!c) return;
    const key = this.mp.i0 * 100 + Math.round(this.mp.t * 40);
    if (this._contourKey[id] === key) return;
    this._contourKey[id] = key;
    const g = this.grid(c.spec.field);
    const blended = g.blend(this.mp, new Float32Array(g.size));
    const fine = A.contour.refine(g, blended, 3);
    const { interval, base } = c.spec;
    let lo = Infinity; let hi = -Infinity;
    for (const v of fine.data) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const polylines = [];
    const first = Math.ceil((lo - base) / interval) * interval + base;
    for (let level = first; level <= hi; level += interval) {
      const segs = A.contour.segments(fine.data, fine.nx, fine.ny, g.lon0, fine.dlon, g.lat0, fine.dlat, level, g.periodic);
      for (const s of segs) polylines.push([[wrap180(s[0]), s[1]], [wrap180(s[2]), s[3]]]);
    }
    c.lines.set(polylines.filter(p => Math.abs(p[0][0] - p[1][0]) < 90));
  }

  /* ------------------------------------------------------------ pressure centres (H and L) */
  setPressureCentres(on) {
    this.globe.labels.removeGroup('centres');
    this.centresOn = on;
    if (on) this.updateCentres(true);
    this.globe.requestRender();
    A.bus.emit('layers');
  }

  updateCentres(force = false) {
    if (!this.centresOn) return;
    const key = this.mp.i0 * 100 + Math.round(this.mp.t * 20);
    if (!force && key === this._centreKey) return;
    this._centreKey = key;
    const g = this.grid('slp');
    const d = g.blend(this.mp, new Float32Array(g.size));
    const nx = g.nx; const ny = g.ny; const R = 4;
    const found = [];
    for (let j = 2; j < ny - 2; j++) {
      for (let i = 0; i < nx; i++) {
        const v = d[j * nx + i];
        let isMax = true; let isMin = true;
        for (let dj = -R; dj <= R && (isMax || isMin); dj++) {
          const jj = j + dj; if (jj < 0 || jj >= ny) continue;
          for (let di = -R; di <= R; di++) {
            if (!di && !dj) continue;
            const w = d[jj * nx + mod(i + di, nx)];
            if (w >= v) isMax = false;
            if (w <= v) isMin = false;
          }
        }
        const lat = g.lat0 + j * g.dlat; const lon = g.lon0 + i * g.dlon;
        if (Math.abs(lat) > 82) continue;
        if (isMax && v >= 1020) found.push({ lon, lat, v, high: true });
        if (isMin && v <= 1004 && Math.abs(lat) > 12) found.push({ lon, lat, v, high: false });
      }
    }
    this.globe.labels.removeGroup('centres');
    const named = (A.data && A.data.pressureCentres) || [];
    found.sort((a, b) => Math.abs(b.v - 1013) - Math.abs(a.v - 1013));
    found.slice(0, 26).forEach((c, idx) => {
      let name = '';
      let best = 1800;
      for (const n of named) {
        if (n.high !== c.high) continue;
        const dist = A.geo.distance(c.lon, c.lat, n.lon, n.lat);
        if (dist < best) { best = dist; name = n.name; }
      }
      const node = h('div', { class: `pcentre ${c.high ? 'high' : 'low'}` },
        h('span', { class: 'pc-letter' }, c.high ? 'H' : 'L'),
        h('span', { class: 'pc-val' }, A.fmt.pressure(c.v)),
        name ? h('span', { class: 'pc-name' }, name) : null);
      this.globe.labels.add({ id: `pc${idx}`, group: 'centres', node, lon: c.lon, lat: c.lat, priority: 90 - idx, cls: 'plain', title: name || (c.high ? 'High pressure' : 'Low pressure') });
    });
  }

  /* ------------------------------------------------------------ base vector layers */
  buildBaseLines() {
    const core = A.packs.core;
    const decode = name => {
      const xy = core.i16(name + '_xy').data; const off = core.json(name + '_off');
      const lines = [];
      for (let k = 0; k < off.length - 1; k++) {
        const a = off[k]; const b = off[k + 1];
        if (b - a < 2) continue;
        let x = 0; let y = 0; const pts = [];
        for (let p = a; p < b; p++) {
          if (p === a) { x = xy[p * 2]; y = xy[p * 2 + 1]; } else { x += xy[p * 2]; y += xy[p * 2 + 1]; }
          pts.push([x / 100, y / 100]);
        }
        lines.push(pts);
      }
      return lines;
    };
    this.vectors = { coast: decode('coast'), borders: decode('borders'), lakes: decode('lakes'), rivers: decode('rivers') };
    this.riverAttrs = core.json('rivers_attrs');
    const g = this.globe;
    this.baseLines.coast = new GeoLines(g, { color: '#e8f1ff', opacity: 0.55, height: 0.0012, order: 1 });
    this.baseLines.coast.set([...this.vectors.coast, ...this.vectors.lakes]);
    this.baseLines.borders = new GeoLines(g, { color: '#cfd8e6', opacity: 0.22, height: 0.001, order: 1 });
    this.baseLines.borders.set(this.vectors.borders);
    this.baseLines.rivers = new GeoLines(g, { color: '#6fb8ff', opacity: 0.55, height: 0.0014, order: 1 });
    this.baseLines.rivers.set(this.vectors.rivers);
    this.baseLines.rivers.visible = false;
    const grat = [];
    for (let lon = -180; lon < 180; lon += 30) { const l = []; for (let lat = -90; lat <= 90; lat += 3) l.push([lon, lat]); grat.push(l); }
    for (let lat = -60; lat <= 60; lat += 30) { const l = []; for (let lon = -180; lon <= 180; lon += 3) l.push([lon, lat]); grat.push(l); }
    this.baseLines.graticule = new GeoLines(g, { color: '#8fb0d8', opacity: 0.2, height: 0.0009, order: 1 });
    this.baseLines.graticule.set(grat);
    this.baseLines.graticule.visible = false;
    const key = [];
    for (const lat of [0, 23.44, -23.44, 66.56, -66.56]) { const l = []; for (let lon = -180; lon <= 180; lon += 3) l.push([lon, lat]); key.push(l); }
    this.baseLines.keylat = new GeoLines(g, { color: '#ffd37a', opacity: 0.6, height: 0.0016, order: 1 });
    this.baseLines.keylat.set(key);
    this.baseLines.keylat.visible = false;
  }

  setBase(name, on) {
    const l = this.baseLines[name];
    if (l) l.visible = on;
    if (name === 'keylat') {
      const labels = this.globe.labels;
      labels.removeGroup('keylat');
      if (on) {
        [['Equator 0°', 0], ['Tropic of Cancer 23.4°N', 23.44], ['Tropic of Capricorn 23.4°S', -23.44],
          ['Arctic Circle 66.6°N', 66.56], ['Antarctic Circle 66.6°S', -66.56]].forEach(([text, lat], i) => {
          [-150, -30, 90].forEach((lon, j) => labels.add({ id: `kl${i}-${j}`, group: 'keylat', text, lon, lat, cls: 'keylat', priority: 30 }));
        });
      }
    }
    this.globe.requestRender();
    A.bus.emit('layers');
  }

  isBaseOn(name) { return this.baseLines[name] ? this.baseLines[name].visible : false; }

  /* ------------------------------------------------------------ names on the map */
  buildNames() {
    const core = A.packs.core;
    A.places = core.json('places');
    const labels = this.globe.labels;
    A.places.slice(0, 140).forEach((p, i) => {
      labels.add({ id: `pl${i}`, group: 'places', text: p.n, lon: p.x, lat: p.y, cls: 'place', priority: 40 - i * 0.2, maxDist: i < 18 ? 9 : i < 50 ? 3.4 : 2.3, title: `${p.n}, ${p.c}` });
    });
    const seas = core.json('marine').filter(m => m.r <= 3 || m.a > 400);
    seas.forEach((m, i) => labels.add({ id: `sea${i}`, group: 'seas', text: m.n, lon: m.x, lat: m.y, cls: m.k === 'ocean' ? 'ocean' : 'sea', priority: 60 + (m.k === 'ocean' ? 10 : 0), maxDist: m.k === 'ocean' ? 14 : 4.2 }));
    labels.setGroupVisible('places', false);
    labels.setGroupVisible('seas', true);
  }

  /* ------------------------------------------------------------ time */
  setDay(day) {
    this.mp = monthPos(day);
    for (const s of this.slots) if (s.active) s.setTime(this.timeIndex(s.grid));
    for (const f of this.flows.values()) f.setTime(this.mp);
    for (const id of this.contours.keys()) this.updateContour(id);
    this.updateCentres();
    this._iceTime();
    this.globe.requestRender();
  }

  /* ------------------------------------------------------------ probing */
  /** Rows of {label, value, note} describing the climate at a point for the current time of year. */
  probe(lon, lat) {
    const rows = [];
    const mp = this.mp;
    const val = (name) => { const g = this.grid(name); return g ? g.atMonth(mp, lon, lat) : NaN; };
    const land = this.globe.isLand(lon, lat);
    const t2 = val('t2m');
    if (Number.isFinite(t2)) rows.push({ k: 'Air temperature', v: A.fmt.temp(t2) });
    if (!land) { const sst = val('sst'); if (Number.isFinite(sst)) rows.push({ k: 'Sea-surface temperature', v: A.fmt.temp(sst) }); }
    const slp = val('slp');
    if (Number.isFinite(slp)) rows.push({ k: 'Sea-level pressure', v: A.fmt.pressure(slp) });
    const u = val('u10'); const v = val('v10');
    if (Number.isFinite(u) && Number.isFinite(v)) {
      const sp = Math.hypot(u, v);
      const from = mod(Math.atan2(-u, -v) * RAD, 360);
      rows.push({ k: 'Surface wind', v: `${A.fmt.speed(sp)} from the ${A.fmt.compass(from)}` });
    }
    const pr = val('precip');
    if (Number.isFinite(pr)) rows.push({ k: 'Rainfall', v: A.fmt.precip(pr) });
    if (!land) {
      const cu = val('cur_u'); const cv = val('cur_v');
      if (Number.isFinite(cu) && Number.isFinite(cv) && Math.hypot(cu, cv) > 0.05) {
        rows.push({ k: 'Ocean current', v: `${A.fmt.speed(Math.hypot(cu, cv), 2)} towards ${A.fmt.compass(mod(Math.atan2(cu, cv) * RAD, 360))}` });
      }
    }
    return rows;
  }

  koppenAt(lon, lat) {
    const k = A.packs.core.u8('koppen');
    const m = k.meta;
    const i = Math.floor(mod(lon - m.lon0 + 0.25, 360) / 0.5) % 720;
    const j = clamp(Math.floor((lat - m.lat0 + 0.25) / 0.5), 0, 359);
    const id = k.data[j * 720 + i];
    if (!id) return null;
    return A.packs.core.json('koppen_classes').find(c => c.id === id) || null;
  }
}
