/* ------------------------------------------------------------------ the globe
   One WebGL scene shows the Earth either as a sphere or as a flat map.  The camera never moves
   sideways: instead the world is rotated so the view centre faces the viewer (sphere) or the
   map is shifted (flat map), which keeps picking, labels and shaders consistent. */

class Globe {
  constructor(canvas) {
    THREE.ColorManagement.enabled = false;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x04060b, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
    this.camera.position.set(0, 0, 4.6);
    this.fovHalfTan = Math.tan(15 * DEG);

    this.shared = {
      uRot: { value: new THREE.Matrix3() }, uMorph: { value: 0 }, uLon0: { value: 0 }, uLat0: { value: 0 },
      uZScale: { value: 4 }, uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 },
    };
    this.view = { lon: -25, lat: 22, dist: 4.6, mapDist: 6.4 };
    this.inset = { right: 0 };
    this.morph = 0;
    this.morphTarget = 0;
    this.mode = 'globe';
    this.flight = null;
    this.velocity = { lon: 0, lat: 0 };
    this.autoRotate = 0;               // degrees of longitude per second
    this.dirty = true;
    this.animating = 0;
    this.viewVersion = 0;
    this.hoverEnabled = true;
    this.last = performance.now();
    this.size = { w: 1, h: 1 };
    this.pointers = new Map();
    this.shiftX = 0;
    this._m = 0;
    this._rows = A.geo.basis(this.view.lon, this.view.lat);

    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    this.blank.needsUpdate = true;
    this.blankLut = this.blank;

    this.earthGeometry = new THREE.PlaneGeometry(TAU, Math.PI, 360, 180);
    this.world = new THREE.Group();            // custom 3D scenes live here (rotated with the Earth)
    this.world.matrixAutoUpdate = false;
    this.scene.add(this.world);

    this._buildEarth();
    this._buildAtmosphere();
    this._buildStars();
    this._bindEvents();
    this.labels = new LabelLayer(this, $('#labels'));
    this.resize();
    requestAnimationFrame(t => this._frame(t));
  }

  /* ------------------------------------------------------------ construction */
  _buildEarth() {
    const u = {
      ...this.shared,
      uDayA: { value: this.blank }, uDayB: { value: this.blank }, uDayMix: { value: 0 },
      uNight: { value: this.blank }, uMask: { value: this.blank },
      uSun: { value: new THREE.Vector3(1, 0, 0) }, uSunView: { value: new THREE.Vector3(0, 0, 1) },
      uShade: { value: 1 }, uLit: { value: 1 },
      uCat: { value: this.blank }, uCatOn: { value: 0 }, uCatOpacity: { value: 0.85 }, uCatMask: { value: 2 },
      uCatGrid: { value: new THREE.Vector4(0, 1, 0, 1) }, uCatHalf: { value: new THREE.Vector2(0, 0) },
      uIceA: { value: this.blank }, uIceB: { value: this.blank }, uIceOn: { value: 0 }, uIceMix: { value: 0 },
      uIceStrength: { value: 1 }, uIceGrid: { value: new THREE.Vector4(0, 1, 0, 1) }, uIceHalf: { value: new THREE.Vector2(0, 0) },
    };
    for (const k of ['F0', 'F1']) {
      u[`u${k}A`] = { value: this.blank }; u[`u${k}B`] = { value: this.blank }; u[`u${k}Lut`] = { value: this.blank };
      u[`u${k}On`] = { value: 0 }; u[`u${k}Mix`] = { value: 0 }; u[`u${k}Opacity`] = { value: 0.85 }; u[`u${k}Gamma`] = { value: 1 };
      u[`u${k}Invert`] = { value: 0 }; u[`u${k}Mask`] = { value: 0 }; u[`u${k}Clip`] = { value: 0 };
      u[`u${k}Grid`] = { value: new THREE.Vector4(0, 1, 0, 1) }; u[`u${k}Half`] = { value: new THREE.Vector2(0, 0) };
    }
    this.earthMaterial = new THREE.ShaderMaterial({ vertexShader: A.glsl.earthVert, fragmentShader: A.glsl.earthFrag, uniforms: u });
    this.earth = new THREE.Mesh(this.earthGeometry, this.earthMaterial);
    this.earth.frustumCulled = false;
    this.earth.renderOrder = 0;
    this.scene.add(this.earth);
    this.uniforms = u;
  }

  _buildAtmosphere() {
    this.atmoMaterial = new THREE.ShaderMaterial({
      vertexShader: A.glsl.atmoVert, fragmentShader: A.glsl.atmoFrag, side: THREE.BackSide,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 1 }, uTint: { value: new THREE.Vector3(0.28, 0.55, 1.0) } },
    });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.09, 96, 64), this.atmoMaterial);
    this.atmosphere.renderOrder = -1;
    this.scene.add(this.atmosphere);
  }

  _buildStars() {
    const n = 1800;
    const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3);
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let i = 0; i < n; i++) {
      const z = rnd() * 2 - 1; const a = rnd() * TAU; const r = Math.sqrt(1 - z * z);
      pos.set([r * Math.cos(a) * 60, z * 60, r * Math.sin(a) * 60], i * 3);
      const b = 0.35 + rnd() * rnd() * 0.65;
      col.set([b * (0.85 + rnd() * 0.15), b * (0.88 + rnd() * 0.12), b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starMaterial = new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMaterial);
    this.stars.renderOrder = -2;
    this.scene.add(this.stars);
  }

  /* ------------------------------------------------------------ textures */
  async setImagery(pack) {
    const decode = async name => createImageBitmap(pack.blob(name), { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const make = bitmap => {
      const t = new THREE.Texture(bitmap);
      t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = aniso; t.needsUpdate = true;
      return t;
    };
    this._makeTexture = make;
    this.dayBitmaps = new Array(12).fill(null);
    this.dayTextures = new Array(12).fill(null);
    this._decodeDay = async m => { if (!this.dayBitmaps[m]) this.dayBitmaps[m] = await decode(`bmng_${String(m + 1).padStart(2, '0')}`); return this.dayBitmaps[m]; };
    const first = await this._decodeDay(5);
    this.dayTextures[5] = make(first);
    this.uniforms.uDayA.value = this.dayTextures[5];
    this.uniforms.uDayB.value = this.dayTextures[5];
    this.uniforms.uNight.value = make(await decode('lights'));
    this.requestRender();
    // decode the remaining months in the background
    for (let m = 0; m < 12; m++) { if (m !== 5) { await this._decodeDay(m); await new Promise(r => setTimeout(r, 0)); } }
    this.setSeasonImagery(A.state.day);
  }

  setMask(mask) {
    const t = new THREE.DataTexture(mask.data, mask.meta.w, mask.meta.h, THREE.RedFormat, THREE.UnsignedByteType);
    t.unpackAlignment = 1; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    this.uniforms.uMask.value = t;
    this.maskData = mask;
    this.requestRender();
  }

  /** Is the point on land?  Uses the 2048 x 1024 raster mask. */
  isLand(lon, lat) {
    if (!this.maskData) return false;
    const w = this.maskData.meta.w; const hgt = this.maskData.meta.h;
    const x = Math.floor(mod((lon + 180) / 360, 1) * w);
    const y = clamp(Math.floor((lat + 90) / 180 * hgt), 0, hgt - 1);
    return this.maskData.data[y * w + x] > 127;
  }

  _dayTexture(m) {
    if (!this.dayTextures[m] && this.dayBitmaps && this.dayBitmaps[m]) this.dayTextures[m] = this._makeTexture(this.dayBitmaps[m]);
    return this.dayTextures[m];
  }

  /** Blend the two Blue Marble months around the given day. */
  setSeasonImagery(day) {
    if (!this.dayBitmaps) return;
    const mp = monthPos(day);
    const a = this._dayTexture(mp.i0) || this._dayTexture(5);
    const b = this._dayTexture(mp.i1) || a;
    this.uniforms.uDayA.value = a;
    this.uniforms.uDayB.value = b;
    this.uniforms.uDayMix.value = mp.t;
    // keep GPU memory bounded: release months that are not in use
    const keep = new Set([mp.i0, mp.i1, 5]);
    this.dayTextures.forEach((t, i) => { if (t && !keep.has(i) && this.dayTextures.filter(Boolean).length > 5) { t.dispose(); this.dayTextures[i] = null; } });
    this.requestRender();
  }

  setSun(day) {
    const s = A.geo.sun(day);
    const v = A.geo.vec(s.lon, s.lat);
    this.uniforms.uSun.value.set(v[0], v[1], v[2]);
    this.sunState = s;
    this.requestRender();
  }

  /* ------------------------------------------------------------ view control */
  requestRender() { this.dirty = true; }
  needAnimation(delta) { this.animating = Math.max(0, this.animating + delta); }

  setInset(rightPx) { this.inset.right = rightPx; this.resize(); }

  resize() {
    const stage = this.canvas.parentElement;
    const w = Math.max(2, stage.clientWidth); const hgt = Math.max(2, stage.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, hgt, false);
    this.size = { w, h: hgt };
    this.camera.aspect = w / hgt;
    this.shared.uRes.value.set(w * pr, hgt * pr);
    this.shared.uPx.value = pr;
    this._applyInset();
    this.requestRender();
  }

  _applyInset() {
    const { w, h: hgt } = this.size;
    const shift = Math.round(this.inset.right / 2);
    this.shiftX = shift;
    this.camera.setViewOffset(w, hgt, shift, 0, w, hgt);
    this.camera.updateProjectionMatrix();
  }

  clampView() {
    const v = this.view;
    v.lon = wrap180(v.lon);
    if (this.morphTarget < 0.5) v.lat = clamp(v.lat, -85, 85);
    else {
      const half = Math.min(90, v.mapDist * this.fovHalfTan * RAD);
      const maxLat = Math.max(0, 90 - half);
      v.lat = clamp(v.lat, -maxLat, maxLat);
    }
    v.dist = clamp(v.dist, 1.16, 14);
    v.mapDist = clamp(v.mapDist, 0.9, 7.5);
  }

  flyTo(lon, lat, dist, ms = 1400, mapDist = null) {
    const from = { lon: this.view.lon, lat: this.view.lat, dist: this.view.dist, mapDist: this.view.mapDist };
    let dl = wrap180(lon - from.lon);
    this.flight = { t: 0, ms, from, to: { lon: from.lon + dl, lat, dist: dist === null || dist === undefined ? from.dist : dist, mapDist: mapDist === null ? from.mapDist : mapDist } };
    this.velocity.lon = 0; this.velocity.lat = 0;
    this.requestRender();
  }

  setMode(mode, animate = true) {
    if (mode === this.mode && this.morphTarget === (mode === 'map' ? 1 : 0)) return;
    this.mode = mode;
    this.morphTarget = mode === 'map' ? 1 : 0;
    if (!animate) this.morph = this.morphTarget;
    if (mode === 'map') this.view.mapDist = Math.max(this.view.mapDist, 5.6);
    this.clampView();
    A.state.mode = mode;
    A.bus.emit('mode', mode);
    this.requestRender();
  }

  nudge(dLon, dLat) {
    this.flight = null;
    this.view.lon += dLon; this.view.lat += dLat;
    this.clampView(); this.viewVersion++; this.requestRender();
  }

  zoomBy(factor) {
    if (this.morphTarget < 0.5) this.view.dist *= factor; else this.view.mapDist *= factor;
    this.clampView(); this.viewVersion++; this.requestRender();
  }

  /* ------------------------------------------------------------ projection and picking */
  rotationRows() { return A.geo.basis(this.view.lon, this.view.lat); }

  _viewPosition(lon, lat, h = 0) {
    const m = this._m;
    const rows = this._rows;
    const v = A.geo.vec(lon, lat, 1 + h);
    const s = [rows[0][0] * v[0] + rows[0][1] * v[1] + rows[0][2] * v[2],
      rows[1][0] * v[0] + rows[1][1] * v[1] + rows[1][2] * v[2],
      rows[2][0] * v[0] + rows[2][1] * v[1] + rows[2][2] * v[2]];
    if (m <= 0.0001) return s;
    const x = wrap180(lon - this.view.lon) * DEG;
    const p = [x, (lat - this.view.lat) * DEG, h * this.shared.uZScale.value];
    return [lerp(s[0], p[0], m), lerp(s[1], p[1], m), lerp(s[2], p[2], m)];
  }

  /** Screen position (CSS px within the canvas) of a point, plus whether it faces the viewer. */
  project(lon, lat, h = 0) {
    const p = this._viewPosition(lon, lat, h);
    const vec = new THREE.Vector3(p[0], p[1], p[2]).project(this.camera);
    const x = (vec.x * 0.5 + 0.5) * this.size.w;
    const y = (-vec.y * 0.5 + 0.5) * this.size.h;
    let visible = vec.z < 1 && vec.z > -1;
    if (this._m < 0.98) {
      const nz = this._viewPosition(lon, lat, 0)[2];
      const sphereOk = nz > 1 / this.camera.position.z + 0.01;
      visible = visible && (this._m > 0.5 ? true : sphereOk);
    }
    if (this._m > 0.5 && (x < -50 || x > this.size.w + 50 || y < -50 || y > this.size.h + 50)) visible = false;
    return { x, y, visible, depth: p[2] };
  }

  /** Longitude/latitude under a client-space pixel, or null when the pointer is in space. */
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left; const py = clientY - rect.top;
    const ndcX = ((px + this.shiftX) / this.size.w) * 2 - 1;
    const ndcY = 1 - (py / this.size.h) * 2;
    const tan = this.fovHalfTan;
    const dir = [ndcX * tan * this.camera.aspect, ndcY * tan, -1];
    const len = Math.hypot(...dir);
    dir[0] /= len; dir[1] /= len; dir[2] /= len;
    const d = this.camera.position.z;
    if (this._m < 0.5) {
      const b = d * dir[2];                                 // o = (0, 0, d); |o + t r|^2 = 1
      const disc = b * b - (d * d - 1);
      if (disc < 0) return null;
      const t = -b - Math.sqrt(disc);
      const hit = [dir[0] * t, dir[1] * t, d + dir[2] * t];
      const rows = this._rows;
      // the rotation is orthonormal, so its inverse is its transpose: Earth = R^T * view
      const earth = [rows[0][0] * hit[0] + rows[1][0] * hit[1] + rows[2][0] * hit[2],
        rows[0][1] * hit[0] + rows[1][1] * hit[1] + rows[2][1] * hit[2],
        rows[0][2] * hit[0] + rows[1][2] * hit[1] + rows[2][2] * hit[2]];
      return A.geo.lonLat(earth);
    }
    const t = d / -dir[2];
    const x = dir[0] * t; const y = dir[1] * t;
    const lat = y * RAD + this.view.lat;
    if (Math.abs(lat) > 90) return null;
    return { lon: wrap180(x * RAD + this.view.lon), lat };
  }

  /** Metres-per-pixel style helper: how many degrees of longitude one screen pixel spans at the view centre. */
  degPerPixel() {
    const visibleHeight = 2 * this.camera.position.z * this.fovHalfTan;
    const radPerPx = visibleHeight / this.size.h;
    return this._m > 0.5 ? radPerPx * RAD : (radPerPx * RAD) * (this.camera.position.z - 1) / this.camera.position.z * 1.0;
  }

  /* ------------------------------------------------------------ events */
  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.drag = { moved: 0, startX: e.clientX, startY: e.clientY, t: performance.now() };
      this.flight = null;
      this.velocity.lon = 0; this.velocity.lat = 0;
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      c.classList.add('grabbing');
      A.bus.emit('interact');
    });
    c.addEventListener('pointermove', e => {
      const p = this.pointers.get(e.pointerId);
      if (p) {
        const dx = e.clientX - p.x; const dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        if (this.pointers.size === 2) {
          const [a, b] = [...this.pointers.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (this.pinch) this.zoomBy(this.pinch / dist);
          this.pinch = dist;
        } else {
          this.drag.moved += Math.abs(dx) + Math.abs(dy);
          this._dragBy(dx, dy);
        }
      } else if (this.hoverEnabled && e.pointerType === 'mouse') {
        A.bus.emit('hover', { clientX: e.clientX, clientY: e.clientY, hit: this.pick(e.clientX, e.clientY) });
      }
    });
    const end = e => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = 0;
      if (this.pointers.size === 0) {
        c.classList.remove('grabbing');
        if (this.drag && this.drag.moved < 5 && performance.now() - this.drag.t < 600) {
          A.bus.emit('click', { clientX: e.clientX, clientY: e.clientY, hit: this.pick(e.clientX, e.clientY) });
        }
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => A.bus.emit('hover', { hit: null }));
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.flight = null;
      this.zoomBy(Math.exp(clamp(e.deltaY, -240, 240) * 0.0014));
      A.bus.emit('interact');
    }, { passive: false });
    c.addEventListener('dblclick', e => {
      const hit = this.pick(e.clientX, e.clientY);
      if (!hit) return;
      const zoomIn = this.morphTarget < 0.5 ? this.view.dist > 2.0 : this.view.mapDist > 2.5;
      if (this.morphTarget < 0.5) this.flyTo(hit.lon, hit.lat, zoomIn ? Math.max(1.5, this.view.dist * 0.5) : 4.6, 900);
      else this.flyTo(hit.lon, hit.lat, null, 900, zoomIn ? this.view.mapDist * 0.55 : 6.2);
    });
    window.addEventListener('resize', debounce(() => this.resize(), 80));
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(debounce(() => this.resize(), 30)).observe(this.canvas.parentElement);
  }

  _dragBy(dx, dy) {
    const v = this.view;
    let k;
    if (this.morphTarget < 0.5) k = (v.dist - 1) * 0.0026 * RAD * (this.size.h / 800 < 1 ? 1 : 800 / this.size.h);
    else k = (2 * v.mapDist * this.fovHalfTan / this.size.h) * RAD;
    v.lon -= dx * k; v.lat += dy * k;
    this.velocity.lon = -dx * k * 60 * 0.5 + this.velocity.lon * 0.5;
    this.velocity.lat = dy * k * 60 * 0.5 + this.velocity.lat * 0.5;
    this.clampView();
    this.viewVersion++;
    this.requestRender();
  }

  /* ------------------------------------------------------------ frame loop */
  _frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    let changed = false;

    if (this.flight) {
      const f = this.flight;
      f.t += dt * 1000;
      const k = easeInOut(clamp(f.t / f.ms, 0, 1));
      this.view.lon = lerp(f.from.lon, f.to.lon, k);
      this.view.lat = lerp(f.from.lat, f.to.lat, k);
      this.view.dist = lerp(f.from.dist, f.to.dist, k);
      this.view.mapDist = lerp(f.from.mapDist, f.to.mapDist, k);
      if (f.t >= f.ms) this.flight = null;
      this.clampView(); changed = true;
    } else if (this.pointers.size === 0 && (Math.abs(this.velocity.lon) > 0.02 || Math.abs(this.velocity.lat) > 0.02)) {
      this.view.lon += this.velocity.lon * dt; this.view.lat += this.velocity.lat * dt;
      const decay = Math.exp(-dt * 3.2);
      this.velocity.lon *= decay; this.velocity.lat *= decay;
      this.clampView(); changed = true;
    } else if (this.autoRotate && this.pointers.size === 0 && this.morphTarget < 0.5) {
      this.view.lon += this.autoRotate * dt; this.clampView(); changed = true;
    }

    if (this.morph !== this.morphTarget) {
      const step = dt / 1.25;
      this.morph = this.morphTarget > this.morph ? Math.min(this.morphTarget, this.morph + step) : Math.max(this.morphTarget, this.morph - step);
      if (this.morph === this.morphTarget) A.bus.emit('morph-done', this.mode);
      changed = true;
    }
    if (changed) this.viewVersion++;

    A.bus.emit('frame', dt, now);
    if (changed || this.dirty || this.animating > 0) {
      this._render();
      this.dirty = false;
    }
    requestAnimationFrame(t => this._frame(t));
  }

  _render() {
    const v = this.view;
    const m = easeInOut(this.morph);
    this._m = m;
    const rows = A.geo.basis(v.lon, v.lat);
    this._rows = rows;
    this.shared.uRot.value.set(rows[0][0], rows[0][1], rows[0][2], rows[1][0], rows[1][1], rows[1][2], rows[2][0], rows[2][1], rows[2][2]);
    this.shared.uMorph.value = m;
    this.shared.uLon0.value = v.lon * DEG;
    this.shared.uLat0.value = v.lat * DEG;
    this.camera.position.z = lerp(v.dist, v.mapDist, m);
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    // sun in view space
    const sun = this.uniforms.uSun.value;
    this.uniforms.uSunView.value.set(
      rows[0][0] * sun.x + rows[0][1] * sun.y + rows[0][2] * sun.z,
      rows[1][0] * sun.x + rows[1][1] * sun.y + rows[1][2] * sun.z,
      rows[2][0] * sun.x + rows[2][1] * sun.y + rows[2][2] * sun.z);
    this.uniforms.uShade.value = A.state.shade ? 1 : 0;
    this.atmoMaterial.uniforms.uOpacity.value = 1 - m;
    this.atmosphere.visible = m < 0.98;
    this.world.matrix.set(rows[0][0], rows[0][1], rows[0][2], 0, rows[1][0], rows[1][1], rows[1][2], 0, rows[2][0], rows[2][1], rows[2][2], 0, 0, 0, 0, 1);
    this.world.matrixWorldNeedsUpdate = true;
    this.world.visible = m < 0.02;
    this.world.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
    this.labels.update();
    A.bus.emit('rendered');
  }
}

/* ------------------------------------------------------------------ HTML labels over the globe */
class LabelLayer {
  constructor(globe, container) {
    this.globe = globe;
    this.container = container;
    this.items = new Map();
    this.lastVersion = -1;
    this.dirty = true;
  }

  /** add({id, text, lon, lat, h, cls, priority, minDist, maxDist, html}) */
  add(item) {
    this.remove(item.id);
    const el = h('div', { class: `label ${item.cls || ''}` }, item.node || item.text);
    if (item.title) el.title = item.title;
    this.container.append(el);
    this.items.set(item.id, { ...item, el, w: 0, hgt: 0, shown: false });
    this.dirty = true;
    this.globe.requestRender();
    return item.id;
  }

  remove(id) {
    const it = this.items.get(id);
    if (it) { it.el.remove(); this.items.delete(id); this.dirty = true; }
  }

  removeGroup(group) {
    for (const [id, it] of [...this.items]) if (it.group === group) { it.el.remove(); this.items.delete(id); }
    this.dirty = true;
  }

  setGroupVisible(group, visible) {
    for (const it of this.items.values()) if (it.group === group) it.hidden = !visible;
    this.dirty = true; this.globe.requestRender();
  }

  update() {
    if (!this.dirty && this.lastVersion === this.globe.viewVersion && !this.globe.animating) return;
    this.dirty = false;
    this.lastVersion = this.globe.viewVersion;
    const g = this.globe;
    const dist = g._m > 0.5 ? g.view.mapDist : g.view.dist;
    const taken = [];
    const list = [...this.items.values()].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    let shown = 0;
    for (const it of list) {
      let ok = !it.hidden;
      if (ok && it.minDist !== undefined && dist < it.minDist) ok = false;
      if (ok && it.maxDist !== undefined && dist > it.maxDist) ok = false;
      let pos = null;
      if (ok) {
        pos = g.project(it.lon, it.lat, it.h || 0);
        ok = pos.visible && pos.x > -40 && pos.x < g.size.w + 40 && pos.y > -20 && pos.y < g.size.h + 20;
      }
      if (ok && !it.nocollide) {
        if (!it.w) { it.w = it.el.offsetWidth || 60; it.hgt = it.el.offsetHeight || 16; }
        const r = { x0: pos.x - it.w / 2 - 3, x1: pos.x + it.w / 2 + 3, y0: pos.y - it.hgt / 2 - 2, y1: pos.y + it.hgt / 2 + 2 };
        for (const t of taken) if (r.x0 < t.x1 && r.x1 > t.x0 && r.y0 < t.y1 && r.y1 > t.y0) { ok = false; break; }
        if (ok) taken.push(r);
      }
      if (ok && shown++ > 260) ok = false;
      if (ok) {
        it.el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) translate(-50%, -50%)`;
        if (it.on !== true) { it.el.style.display = 'block'; it.on = true; }
      } else if (it.on !== false) {
        it.el.style.display = 'none';
        it.on = false;
      }
    }
  }
}
