/* ------------------------------------------------------------------ mid-latitude cyclone and its fronts
   A kinematic model: a vortex that strengthens, peaks and decays carries a temperature field that starts as a
   simple north-south gradient (cold air to the pole side).  The air is advected with a semi-Lagrangian scheme.
   Fronts are not drawn by hand; they are found where the temperature gradient is sharpest, and each front
   is classified by whether cold air or warm air is advancing across it. */
class CycloneModel {
  constructor(south = false) {
    this.south = south;
    this.nx = 96; this.ny = 50; this.dx = 37.5;                 // km
    this.hours = 96; this.dtH = 0.5; this.frameEvery = 3;       // simulate 96 h, keep every 3 h
    this.frames = [];
    this.run();
  }

  /** Tangential wind (m/s) at distance r (km) for life-cycle fraction s. */
  vtheta(r, s) {
    const grow = Math.sin(Math.PI * clamp(s * 1.12, 0, 1)) ** 0.9;
    const Vmax = 3 + 24 * grow;
    const Rm = 330 + 330 * clamp(s * 1.2, 0, 1);
    const x = r / Rm;
    return Vmax * x * Math.exp(0.5 * (1 - x * x));
  }

  /** Surface pressure deficit (hPa) from gradient-wind balance, integrated inwards from the far field. */
  pressureProfile(s, f) {
    const n = 140; const dr = 25; const out = new Float32Array(n);
    let p = 0;
    for (let i = n - 1; i >= 0; i--) {
      const r = (i + 0.5) * dr * 1000;
      const v = this.vtheta((i + 0.5) * dr, s);
      p -= 1.2 * (v * v / r + Math.abs(f) * v) * dr * 1000 / 100;
      out[i] = p;
    }
    return out;
  }

  run() {
    const { nx, ny, dx } = this;
    const sgn = this.south ? -1 : 1;                              // the Southern Hemisphere is the mirror image
    let theta = new Float32Array(nx * ny);
    const cx = (nx - 1) / 2; const cy = (ny - 1) / 2;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const y = (j - cy) * dx; const x = (i - cx) * dx;
      theta[j * nx + i] = -sgn * Math.tanh((y + 90 * Math.sin(x / 700)) / 380);       // cold air on the pole side, with a small ripple to start the wave
    }
    this.frames = [theta.slice()];
    const steps = Math.round(this.hours / this.dtH);
    const dt = this.dtH * 3600;
    const next = new Float32Array(nx * ny);
    for (let n = 1; n <= steps; n++) {
      const s = (n * this.dtH) / this.hours;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = (i - cx) * dx; const y = (j - cy) * dx;
        const r = Math.hypot(x, y) || 1;
        const vt = this.vtheta(r, s);
        const u = sgn * (-y / r) * vt + 0.3 * (-x / r) * vt;
        const v = sgn * (x / r) * vt + 0.3 * (-y / r) * vt;
        let xs = i - u * dt / 1000 / dx; let ys = j - v * dt / 1000 / dx;
        xs = clamp(xs, 0, nx - 1.001); ys = clamp(ys, 0, ny - 1.001);
        const i0 = Math.floor(xs); const j0 = Math.floor(ys); const tx = xs - i0; const ty = ys - j0;
        const a = theta[j0 * nx + i0]; const b = theta[j0 * nx + i0 + 1]; const c = theta[(j0 + 1) * nx + i0]; const d = theta[(j0 + 1) * nx + i0 + 1];
        next[j * nx + i] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
      }
      // a touch of diffusion keeps the grid-scale noise down
      for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        theta[k] = next[k] * 0.94 + 0.015 * (next[k - 1] + next[k + 1] + next[k - nx] + next[k + nx]);
      }
      for (let i = 0; i < nx; i++) { theta[i] = next[i]; theta[(ny - 1) * nx + i] = next[(ny - 1) * nx + i]; }
      if (n % (this.frameEvery / this.dtH) === 0) this.frames.push(theta.slice());
    }
  }

  frame(s) {
    const f = clamp(s, 0, 1) * (this.frames.length - 1);
    const i0 = Math.floor(f); const i1 = Math.min(this.frames.length - 1, i0 + 1); const t = f - i0;
    const out = new Float32Array(this.nx * this.ny);
    const a = this.frames[i0]; const b = this.frames[i1];
    for (let k = 0; k < out.length; k++) out[k] = a[k] * (1 - t) + b[k] * t;
    return out;
  }

  windAt(x, y, s) {
    const sgn = this.south ? -1 : 1;
    const r = Math.hypot(x, y) || 1; const vt = this.vtheta(r, s);
    return [sgn * (-y / r) * vt + 0.3 * (-x / r) * vt, sgn * (x / r) * vt + 0.3 * (-y / r) * vt];
  }

  /** Front cells: strong temperature gradient, local maximum across the front.  Returns [{x, y, tx, ty, type}] (km). */
  fronts(theta, s) {
    const { nx, ny, dx } = this;
    const cx = (nx - 1) / 2; const cy = (ny - 1) / 2;
    const gx = new Float32Array(nx * ny); const gy = new Float32Array(nx * ny); const gm = new Float32Array(nx * ny);
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i;
      gx[k] = (theta[k + 1] - theta[k - 1]) / (2 * dx); gy[k] = (theta[k + nx] - theta[k - nx]) / (2 * dx);
      gm[k] = Math.hypot(gx[k], gy[k]);
    }
    const samp = (arr, x, y) => { const i0 = Math.floor(x); const j0 = Math.floor(y); const tx = x - i0; const ty = y - j0; return (arr[j0 * nx + i0] * (1 - tx) + arr[j0 * nx + i0 + 1] * tx) * (1 - ty) + (arr[(j0 + 1) * nx + i0] * (1 - tx) + arr[(j0 + 1) * nx + i0 + 1] * tx) * ty; };
    const out = [];
    const thr = 0.0016;
    for (let j = 3; j < ny - 3; j++) for (let i = 3; i < nx - 3; i++) {
      const k = j * nx + i; const g = gm[k];
      if (g < thr) continue;
      const nxu = gx[k] / g; const nyu = gy[k] / g;
      if (g < samp(gm, i + nxu, j + nyu) || g < samp(gm, i - nxu, j - nyu)) continue;
      const x = (i - cx) * dx; const y = (j - cy) * dx;
      if (Math.hypot(x, y) < 40 && s < 0.2) continue;
      const w = this.windAt(x, y, s);
      const adv = w[0] * nxu + w[1] * nyu;                      // wind blowing towards warmer air means cold air is advancing
      const r = Math.hypot(x, y);
      let type = adv > 0 ? 'cold' : 'warm';
      if (s > 0.5 && r < 520 - 160 * Math.max(0, s - 0.6)) type = 'occluded';
      out.push({ x, y, tx: -nyu, ty: nxu, nx: nxu, ny: nyu, type, g });
    }
    return out;
  }
}

A.widgetFactories.push(() => {
  A.widgets.cyclone = {
    enter(topic, arg) {
      const g = A.globe;
      const st = this.st = { s: arg === 'cold' ? 0.45 : arg === 'warm' ? 0.3 : arg === 'occluded' ? 0.8 : 0.55, playing: false, south: false, wind: true, cloud: true, iso: true, lon: -28, lat: 52 };
      const W = 560; const H = 300;
      const box = A.canvasBox(W, H);
      let model = new CycloneModel(false);
      const group = this.group = new SceneGroup();
      const rib = group.add(new GeoRibbon(g, { height: 0.01, order: 6, joints: false }));
      const iso = group.add(new GeoLines(g, { color: '#ffffff', opacity: 0.7, height: 0.009, order: 5 }));
      const labels = { text: A.ui.readout() };
      const img = document.createElement('canvas'); img.width = model.nx; img.height = model.ny;
      const ictx = img.getContext('2d'); const idata = ictx.createImageData(model.nx, model.ny);
      const lut = A.cmap.lut('thermal');
      const sx = W / (model.nx * model.dx); const cxp = W / 2; const cyp = H / 2;
      const toLL = (x, y) => { const d = Math.hypot(x, y); const b = mod(Math.atan2(x, y) * RAD, 360); const r = A.geo.destination(st.lon, st.lat, b, d); return [r.lon, r.lat, 0]; };
      const stageName = s => (s < 0.12 ? 'A ripple forms on the front' : s < 0.3 ? 'The wave grows: a low-pressure centre appears' : s < 0.5 ? 'Open wave: warm sector between a warm and a cold front' : s < 0.68 ? 'Mature depression: deepest low, strongest winds' : s < 0.88 ? 'Occlusion: the cold front catches the warm front' : 'The storm fills and dies away');
      const draw = () => {
        const { ctx } = box;
        const theta = model.frame(st.s);
        ctx.clearRect(0, 0, W, H);
        for (let k = 0; k < theta.length; k++) {
          const warmness = clamp((theta[k] + 1) / 2, 0, 1);                       // 0 = cold air, 1 = warm air (in both hemispheres)
          const idx = Math.round(clamp(0.2 + warmness * 0.6, 0, 1) * 255) * 4;
          idata.data[k * 4] = lut[idx]; idata.data[k * 4 + 1] = lut[idx + 1]; idata.data[k * 4 + 2] = lut[idx + 2]; idata.data[k * 4 + 3] = 255;
        }
        ictx.putImageData(idata, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0, W, H);
        const fronts = model.fronts(theta, st.s);
        // cloud and rain: bright where the temperature gradient is sharp
        if (st.cloud) {
          const cl = document.createElement('canvas'); cl.width = model.nx; cl.height = model.ny;
          const cx2 = cl.getContext('2d'); const cd = cx2.createImageData(model.nx, model.ny);
          for (let j = 1; j < model.ny - 1; j++) for (let i = 1; i < model.nx - 1; i++) {
            const k = j * model.nx + i;
            const gx = (theta[k + 1] - theta[k - 1]); const gy = (theta[k + model.nx] - theta[k - model.nx]);
            let c = Math.tanh(Math.hypot(gx, gy) * 1.3);
            const r = Math.hypot((i - (model.nx - 1) / 2) * model.dx, (j - (model.ny - 1) / 2) * model.dx);
            c = Math.min(1, c + 0.65 * Math.exp(-(r * r) / (2 * 380 * 380)) * Math.sin(Math.PI * clamp(st.s * 1.2, 0, 1)));
            cd.data[k * 4] = 255; cd.data[k * 4 + 1] = 255; cd.data[k * 4 + 2] = 255; cd.data[k * 4 + 3] = Math.round(c * 200);
          }
          cx2.putImageData(cd, 0, 0); ctx.drawImage(cl, 0, 0, W, H);
        }
        // isobars: circles of equal pressure around the low (pressure profile from gradient-wind balance)
        const f = Math.abs(A.geo.coriolis(st.lat));
        const prof = model.pressureProfile(st.s, f);
        if (st.iso) {
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.font = '10px system-ui'; ctx.fillStyle = '#fff';
          for (let lev = 4; lev <= 60; lev += 4) {
            const dp = -lev; let r = -1;
            for (let i = 0; i < prof.length; i++) if (prof[i] >= dp) { r = (i + 0.5) * 25; break; }
            if (r < 0 || r > 1700) continue;
            ctx.beginPath(); ctx.arc(cxp, cyp, r * sx, 0, TAU); ctx.stroke();
          }
        }
        // wind arrows
        if (st.wind) {
          ctx.strokeStyle = 'rgba(20,24,34,0.85)'; ctx.fillStyle = 'rgba(20,24,34,0.85)'; ctx.lineWidth = 1.6;
          for (let yy = -800; yy <= 800; yy += 200) for (let xx = -1600; xx <= 1600; xx += 200) {
            const w = model.windAt(xx, yy, st.s); const sp = Math.hypot(w[0], w[1]); if (sp < 3) continue;
            const x0 = cxp + xx * sx; const y0 = cyp - yy * sx; const L = clamp(sp * 0.9, 4, 26);
            const ux = w[0] / sp; const uy = -w[1] / sp;
            ctx.beginPath(); ctx.moveTo(x0 - ux * L / 2, y0 - uy * L / 2); ctx.lineTo(x0 + ux * L / 2, y0 + uy * L / 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x0 + ux * L / 2, y0 + uy * L / 2); ctx.lineTo(x0 + ux * L / 2 - ux * 5 + uy * 3, y0 + uy * L / 2 - uy * 5 - ux * 3); ctx.lineTo(x0 + ux * L / 2 - ux * 5 - uy * 3, y0 + uy * L / 2 - uy * 5 + ux * 3); ctx.closePath(); ctx.fill();
          }
        }
        // fronts: coloured segments plus the classic symbols
        const col = { cold: '#1d57d6', warm: '#d6352a', occluded: '#8a3fc6' };
        ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        for (const fr of fronts) {
          const x0 = cxp + fr.x * sx; const y0 = cyp - fr.y * sx; const l = 30 * sx;
          ctx.strokeStyle = col[fr.type];
          ctx.beginPath(); ctx.moveTo(x0 - fr.tx * l, y0 + fr.ty * l); ctx.lineTo(x0 + fr.tx * l, y0 - fr.ty * l); ctx.stroke();
        }
        let n = 0;
        for (const fr of fronts) {
          if ((n++) % 4) continue;
          const x0 = cxp + fr.x * sx; const y0 = cyp - fr.y * sx;
          const dirx = fr.type === 'cold' ? -fr.nx : fr.nx; const diry = fr.type === 'cold' ? fr.ny : -fr.ny;       // symbols point the way the front moves
          ctx.fillStyle = col[fr.type];
          if (fr.type === 'cold') { ctx.beginPath(); ctx.moveTo(x0 - fr.tx * 5, y0 + fr.ty * 5); ctx.lineTo(x0 + fr.tx * 5, y0 - fr.ty * 5); ctx.lineTo(x0 + dirx * 9, y0 + diry * 9); ctx.closePath(); ctx.fill(); }
          else if (fr.type === 'warm') { ctx.beginPath(); ctx.arc(x0 + dirx * 3, y0 + diry * 3, 5, Math.atan2(diry, dirx) - Math.PI / 2, Math.atan2(diry, dirx) + Math.PI / 2); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(x0 - fr.tx * 5, y0 + fr.ty * 5); ctx.lineTo(x0 + fr.tx * 5, y0 - fr.ty * 5); ctx.lineTo(x0 + dirx * 9, y0 + diry * 9); ctx.closePath(); ctx.fill(); }
        }
        // the low
        ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
        ctx.strokeText('L', cxp, cyp + 7); ctx.fillText('L', cxp, cyp + 7);
        const deficit = -prof[0];
        // globe overlay
        const items = [];
        let k2 = 0;
        for (const fr of fronts) { if ((k2++) % 2) continue; items.push({ pts: [toLL(fr.x - fr.tx * 45, fr.y - fr.ty * 45), toLL(fr.x + fr.tx * 45, fr.y + fr.ty * 45)], color: A.cmap.hex(col[fr.type]).map(v => v / 255).concat([1]), width: 5 }); }
        rib.set(items.map(it => ({ ...it, pts: A.unwrapLine(it.pts) })));
        const rings = [];
        for (let lev = 8; lev <= 60; lev += 8) {
          let r = -1; for (let i = 0; i < prof.length; i++) if (prof[i] >= -lev) { r = (i + 0.5) * 25; break; }
          if (r < 0 || r > 1500) continue;
          const pts = []; for (let b = 0; b <= 360; b += 10) { const d = A.geo.destination(st.lon, st.lat, b, r); pts.push([d.lon, d.lat, 0]); }
          rings.push(A.unwrapLine(pts));
        }
        iso.set(rings);
        const Rm = 330 + 330 * clamp(st.s * 1.2, 0, 1); const peak = model.vtheta(Rm, st.s);
        clear(labels.text);
        labels.text.append(h('div', null, h('b', null, stageName(st.s)), ` · about ${Math.round(st.s * model.hours)} hours into the life cycle`),
          h('div', null, `Central pressure about ${Math.round(1012 - deficit)} hPa; peak winds roughly ${A.fmt.speed(peak, 0)}. `, h('span', { style: { color: '#6f9bff' } }, 'Blue: cold front'), ' · ', h('span', { style: { color: '#ff7468' } }, 'red: warm front'), ' · ', h('span', { style: { color: '#c08cf0' } }, 'purple: occluded front'), '. Colours show air temperature; white haze is cloud.'));
      };
      this.draw = draw;
      group.onFrame(dt => { if (st.playing) { st.s += dt / 14; if (st.s >= 1) { st.s = 1; st.playing = false; } slider.set(st.s * 100); } draw(); });
      g.needAnimation(1);
      let slider;
      A.sceneCtl.show('Life of a depression', c => {
        c.append(box.canvas);
        slider = A.ui.slider('Time', { min: 0, max: 100, step: 1, value: st.s * 100, format: v => `${Math.round(v / 100 * model.hours)} h`, onInput: v => { st.s = v / 100; st.playing = false; } });
        c.append(slider.row);
        c.append(h('div', { class: 'row' }, A.ui.button('Play', () => { if (st.s >= 1) st.s = 0; st.playing = true; }, 'play'), A.ui.button('Pause', () => { st.playing = false; }, 'pause')));
        c.append(A.ui.buttons('Hemisphere', [['n', 'Northern'], ['s', 'Southern']], v => { st.south = v === 's'; model = new CycloneModel(st.south); st.lat = st.south ? -52 : 52; g.flyTo(st.lon, st.lat, 3.3, 1200); }, 'n').row);
        c.append(h('div', { class: 'row' }, ...[['wind', 'Wind arrows'], ['cloud', 'Cloud'], ['iso', 'Isobars']].map(([k, label]) => h('label', { style: { display: 'inline-flex', gap: '5px', alignItems: 'center', minWidth: 0 } }, h('input', { type: 'checkbox', checked: st[k], onchange: e => { st[k] = e.target.checked; } }), label))));
        c.append(labels.text);
      });
      $('#scenectl').classList.add('wide');
      g.flyTo(st.lon, st.lat, 3.3, 1500);
    },
    exit() { this.group.dispose(); A.globe.needAnimation(-1); $('#scenectl').classList.remove('wide'); },
  };
});
