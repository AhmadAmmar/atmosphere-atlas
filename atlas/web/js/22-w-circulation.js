/* ------------------------------------------------------------------ widgets: global circulation */
A.widgetFactories.push(() => {
  /* ---------------------------------------------------------- latitude-height section with flowing air
     The shading is real monthly data (streamfunction, zonal wind or temperature).  The particles follow
     the real zonal-mean circulation derived from that streamfunction: v = g/(2 pi a cos(lat)) d(psi)/dp and
     omega = -g/(2 pi a^2 cos(lat)) d(psi)/d(lat). */
  const G = GRAV; const AE = EARTH_R * 1000;
  const TOP_P = 100;
  const zTop = -7 * Math.log(TOP_P / 1000);
  const zOf = p => -7 * Math.log(p / 1000);
  const pOf = z => 1000 * Math.exp(-z / 7);

  function sectionWidget() {
    return {
      enter(topic, arg) {
        const st = this.st = { mode: arg || 'psi', particles: true, hover: null };
        const W = 560; const H = 268;
        const box = A.canvasBox(W, H);
        const m = { l: 40, r: 12, t: 12, b: 40 };
        const pw = W - m.l - m.r; const ph = H - m.t - m.b;
        const psi = A.xsection('zm_psi'); const uu = A.xsection('zm_u'); const tt = A.xsection('zm_t');
        const bg = document.createElement('canvas'); bg.width = 160; bg.height = 80;
        const bgx = bg.getContext('2d'); const img = bgx.createImageData(160, 80);
        const X = lat => m.l + (lat + 90) / 180 * pw;
        const Y = z => m.t + (1 - z / zTop) * ph;
        const N = 1500;
        const P = { lat: new Float32Array(N), p: new Float32Array(N), age: new Float32Array(N), life: new Float32Array(N), hist: new Float32Array(N * 12) };
        const spawn = (i, init) => {
          P.lat[i] = -80 + Math.random() * 160; P.p[i] = 120 + Math.random() * 860;
          P.life[i] = 160 + Math.random() * 320; P.age[i] = init ? Math.random() * P.life[i] : 0;
          for (let k = 0; k < 6; k++) { P.hist[i * 12 + k * 2] = P.lat[i]; P.hist[i * 12 + k * 2 + 1] = P.p[i]; }
        };
        for (let i = 0; i < N; i++) spawn(i, true);
        let key = ''; let labels = []; let itcz = null; let belts = [];
        const fieldFor = mode => (mode === 'psi' ? { xs: psi, cmap: 'divD', range: [-180, 180], unit: '×10⁹ kg/s' } : mode === 'u' ? { xs: uu, cmap: 'divD', range: [-45, 45], unit: 'm/s' } : { xs: tt, cmap: 'thermal', range: [-90, 40], unit: '°C' });
        const build = () => {
          const mp = monthPos(A.state.day);
          const f = fieldFor(st.mode); const lut = A.cmap.lut(f.cmap);
          for (let iy = 0; iy < 80; iy++) {
            const z = zTop * (1 - (iy + 0.5) / 80); const p = pOf(z);
            for (let ix = 0; ix < 160; ix++) {
              const lat = -90 + (ix + 0.5) / 160 * 180;
              const o = (iy * 160 + ix) * 4;
              if (p > A.xsSurfacePressure(mp, lat) || p > f.xs.plev[0]) { img.data[o] = 58; img.data[o + 1] = 52; img.data[o + 2] = 46; img.data[o + 3] = 255; continue; }
              const v = f.xs.at(mp, lat, p);
              const k = clamp(Math.round((v - f.range[0]) / (f.range[1] - f.range[0]) * 255), 0, 255) * 4;
              img.data[o] = lut[k]; img.data[o + 1] = lut[k + 1]; img.data[o + 2] = lut[k + 2]; img.data[o + 3] = 255;
            }
          }
          bgx.putImageData(img, 0, 0);
          // cell names sit at the strongest overturning of each belt (found in the data, so they move with the seasons)
          labels = [];
          const at = lat => psi.at(mp, lat, 500);
          const extreme = (lo, hi) => { let best = null; for (let l = lo; l <= hi; l += 1) { const v = Math.abs(at(l)); if (!best || v > best.v) best = { lat: l, v }; } return best; };
          for (const hemi of [1, -1]) {
            const band = (x, y) => (hemi > 0 ? [x, y] : [-y, -x]);
            const hb = extreme(...band(0, 33));
            labels.push({ text: 'Hadley', lat: hb.lat, p: 480 });
            const fb = extreme(...band(28, 68));
            if (fb && fb.v > 8 && Math.abs(fb.lat) > Math.abs(hb.lat) + 12) labels.push({ text: 'Ferrel', lat: fb.lat, p: 480 });
            labels.push({ text: 'Polar', lat: hemi * 78, p: 700 });
          }
          const pg = A.layers.grid('precip');
          let bestLat = 0; let bestV = -1;
          for (let l = -25; l <= 25; l += 1.25) { let s = 0; for (let lon = -180; lon < 180; lon += 5) s += pg.atMonth(mp, lon, l); if (s > bestV) { bestV = s; bestLat = l; } }
          itcz = bestLat;
          // surface wind belts from the zonal-mean zonal wind at 925 hPa
          belts = []; for (let l = -80; l <= 80; l += 4) belts.push({ lat: l, u: uu.at(mp, l, 925) });
        };
        const vel = (lat, p, mp) => {
          const cl = Math.max(0.17, Math.cos(lat * DEG));
          const dp = 25; const dl = 1.0;
          const dpsiDp = (psi.at(mp, lat, Math.min(1000, p + dp)) - psi.at(mp, lat, Math.max(TOP_P, p - dp))) / ((Math.min(1000, p + dp) - Math.max(TOP_P, p - dp)) * 100);
          const dpsiDlat = (psi.at(mp, clamp(lat + dl, -88, 88), p) - psi.at(mp, clamp(lat - dl, -88, 88), p)) / (2 * dl * DEG);
          const v = G / (TAU * AE * cl) * dpsiDp * 1e9;
          const om = -G / (TAU * AE * AE * cl) * dpsiDlat * 1e9;
          return [v, om];
        };
        const readout = A.ui.readout();
        this.dbg = { P, vel, st };
        const drawFrame = dt => {
          const { ctx } = box;
          const mp = monthPos(A.state.day);
          const k2 = `${st.mode}${mp.i0}:${Math.round(mp.t * 40)}`;
          if (k2 !== key) { key = k2; build(); }
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(8,14,26,0.9)'; ctx.fillRect(0, 0, W, H);
          ctx.imageSmoothingEnabled = true; ctx.drawImage(bg, m.l, m.t, pw, ph);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(210,222,240,0.85)'; ctx.font = '10.5px system-ui';
          ctx.textAlign = 'right';
          for (const p of [1000, 850, 700, 500, 300, 200, 100]) { const y = Y(zOf(p)); ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(W - m.r, y); ctx.stroke(); ctx.fillText(`${p}`, m.l - 4, y + 3); }
          ctx.save(); ctx.translate(11, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('Pressure (hPa)', 0, 0); ctx.restore();
          ctx.textAlign = 'center';
          for (const l of [-90, -60, -30, 0, 30, 60, 90]) { ctx.beginPath(); ctx.moveTo(X(l), m.t); ctx.lineTo(X(l), H - m.b); ctx.stroke(); ctx.fillText(`${Math.abs(l)}°${l > 0 ? 'N' : l < 0 ? 'S' : ''}`, X(l), H - m.b + 13); }
          // flowing air
          if (st.particles) {
            const frames = Math.min(2.5, (dt || 1 / 60) * 60);
            const TS = 4.5e5 * (dt ? Math.min(0.05, dt) : 1 / 60);
            ctx.lineCap = 'round';
            for (let i = 0; i < N; i++) {
              P.age[i] += frames;
              let lat = P.lat[i]; let p = P.p[i];
              const [v, om] = vel(lat, p, mp);
              lat += v / AE * RAD * TS; p += om * TS / 100;            // omega is in Pa/s, p is kept in hPa
              if (P.age[i] > P.life[i] || p < TOP_P || p > Math.min(1000, A.xsSurfacePressure(mp, clamp(lat, -89, 89))) || Math.abs(lat) > 86) { spawn(i, false); continue; }
              P.lat[i] = lat; P.p[i] = p;
              const base = i * 12;
              for (let k = 5; k > 0; k--) { P.hist[base + k * 2] = P.hist[base + (k - 1) * 2]; P.hist[base + k * 2 + 1] = P.hist[base + (k - 1) * 2 + 1]; }
              P.hist[base] = lat; P.hist[base + 1] = p;
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.3; ctx.beginPath();
            for (let i = 0; i < N; i++) {
              const base = i * 12;
              if (Math.abs(P.hist[base] - P.hist[base + 10]) > 40) continue;
              ctx.moveTo(X(P.hist[base]), Y(zOf(P.hist[base + 1])));
              for (let k = 1; k < 6; k++) ctx.lineTo(X(P.hist[base + k * 2]), Y(zOf(P.hist[base + k * 2 + 1])));
            }
            ctx.stroke();
          }
          // surface wind belts along the bottom
          ctx.font = '10px system-ui'; ctx.textAlign = 'center';
          for (const b of belts) {
            const x = X(b.lat); const y = H - 8; const sgn = Math.sign(b.u); const len = clamp(Math.abs(b.u) * 1.6, 3, 13);
            ctx.strokeStyle = b.u > 0 ? '#ffb35c' : '#8fc4ff'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(x - sgn * len / 2, y); ctx.lineTo(x + sgn * len / 2, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + sgn * len / 2, y); ctx.lineTo(x + sgn * (len / 2 - 4), y - 2.5); ctx.lineTo(x + sgn * (len / 2 - 4), y + 2.5); ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = 'rgba(210,222,240,0.85)'; ctx.textAlign = 'left'; ctx.font = '9.5px system-ui'; ctx.fillText('surface wind:', m.l, H - 17);
          ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
          const drawn = [];
          for (const l of labels) {
            if (drawn.some(d => d.text === l.text && Math.abs(d.lat - l.lat) < 14)) continue;
            drawn.push(l);
            ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
            ctx.strokeText(l.text, X(l.lat), Y(zOf(l.p))); ctx.fillText(l.text, X(l.lat), Y(zOf(l.p)));
          }
          if (itcz !== null) {
            const x = X(itcz); ctx.fillStyle = '#ffd37a'; ctx.beginPath(); ctx.moveTo(x, m.t + 14); ctx.lineTo(x - 6, m.t + 2); ctx.lineTo(x + 6, m.t + 2); ctx.closePath(); ctx.fill();
            ctx.font = '10px system-ui'; ctx.fillStyle = '#ffd37a'; ctx.textAlign = x > W - 80 ? 'right' : 'left'; ctx.fillText(`ITCZ rain peak ${A.fmt.lat(itcz)}`, x + (x > W - 80 ? -9 : 9), m.t + 11);
          }
          // hover value
          if (st.hover) {
            const { lat, z } = st.hover; const p = pOf(z); const f = fieldFor(st.mode);
            const ok = p <= Math.min(1000, A.xsSurfacePressure(mp, lat));
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(X(lat), Y(z), 5, 0, TAU); ctx.stroke();
            const txt = ok ? `${A.fmt.lat(lat)}, ${Math.round(p)} hPa: ${st.mode === 'psi' ? A.fmt.num(f.xs.at(mp, lat, p), 0) + ' ×10⁹ kg/s' : st.mode === 'u' ? A.fmt.speed(f.xs.at(mp, lat, p)) : A.fmt.temp(f.xs.at(mp, lat, p))}` : 'underground';
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(m.l + 6, m.t + 6, ctx.measureText(txt).width + 12, 18); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '11px system-ui'; ctx.fillText(txt, m.l + 12, m.t + 19);
          }
        };
        box.canvas.addEventListener('pointermove', e => {
          const r = box.canvas.getBoundingClientRect();
          const x = (e.clientX - r.left) * (W / r.width); const y = (e.clientY - r.top) * (H / r.height);
          if (x < m.l || x > W - m.r || y < m.t || y > H - m.b) { st.hover = null; return; }
          st.hover = { lat: (x - m.l) / pw * 180 - 90, z: (1 - (y - m.t) / ph) * zTop };
        });
        box.canvas.addEventListener('pointerleave', () => { st.hover = null; });
        this._loop = A.bus.on('frame', dt => drawFrame(dt));
        A.globe.needAnimation(1);
        const note = () => {
          clear(readout);
          const note = st.mode === 'psi' ? 'Shading: mass streamfunction. Red cells turn clockwise, blue anticlockwise; white lines show air actually flowing.' : st.mode === 'u' ? 'Shading: zonal-mean wind. Red is from the west, blue from the east. The two red cores are the jet streams.' : 'Shading: zonal-mean temperature. Notice how cold the air is just above the tropical tropopause.';
          readout.append(`${note} Arrows along the bottom show the prevailing surface wind: blue easterly, orange westerly. The date slider moves the whole pattern through the year.`);
        };
        const root = $('#scenectl');
        root.classList.add('wide');
        A.sceneCtl.show('Cross-section of the atmosphere, pole to pole (zonal average)', c => {
          c.append(box.canvas);
          c.append(A.ui.buttons('Show', [['psi', 'Overturning cells'], ['u', 'Wind (jets)'], ['t', 'Temperature']], v => { st.mode = v; key = ''; note(); }, st.mode).row);
          c.append(h('div', { class: 'row' }, h('label', null, 'Moving air'), h('input', { type: 'checkbox', checked: true, onchange: e => { st.particles = e.target.checked; }, 'aria-label': 'Show moving air' })));
          c.append(readout);
          note();
        });
      },
      exit() { A.bus.off('frame', this._loop); A.globe.needAnimation(-1); $('#scenectl').classList.remove('wide'); },
    };
  }
  A.widgets.cells = sectionWidget();

  /* ---------------------------------------------------------- Rossby waves on the westerly jet */
  A.widgets.rossby = {
    enter() {
      const g = A.globe;
      const st = this.st = { k: 5, amp: 12, lat: 50, phase: 0, U: 22 };
      const group = this.group = new SceneGroup();
      const rib = group.add(new GeoRibbon(g, { height: 0.05, order: 6, joints: true }));
      const pts = group.add(new GeoPoints(g, { height: 0.052, order: 7 }));
      const read = A.ui.readout();
      const cphase = () => {
        const phi = st.lat * DEG; const beta = 2 * OMEGA * Math.cos(phi) / (EARTH_R * 1000);
        const kk = st.k / (EARTH_R * 1000 * Math.cos(phi));
        return st.U - beta / (kk * kk);
      };
      const draw = () => {
        const items = [];
        const n = 180;
        for (let seg = 0; seg < n; seg++) {
          const l0 = seg / n * 360 - 180; const l1 = (seg + 1) / n * 360 - 180;
          const lat = (lon) => st.lat + st.amp * Math.sin(st.k * (lon * DEG) - st.phase);
          const a = lat((l0 + l1) / 2) - st.lat;
          const c = a > 0.5 ? [1, 0.55, 0.35, 1] : a < -0.5 ? [0.45, 0.7, 1, 1] : [1, 1, 1, 1];
          items.push({ pts: [[l0, lat(l0), 0], [l1, lat(l1), 0]], color: c, width: 5 });
        }
        rib.set(items);
        const dots = [];
        for (let i = 0; i < st.k; i++) {
          const lonC = ((i * TAU + Math.PI / 2 + st.phase) / st.k) * RAD;
          dots.push({ lon: wrap180(lonC), lat: st.lat + st.amp, color: [1, 0.55, 0.35, 1], size: 9 });
          dots.push({ lon: wrap180(lonC + 180 / st.k), lat: st.lat - st.amp, color: [0.45, 0.7, 1, 1], size: 9 });
        }
        pts.set(dots);
        const c = cphase();
        clear(read);
        read.append(`Red bulges (ridges) carry warm air poleward; blue dips (troughs) pull cold air towards the equator. With ${st.k} waves around the globe at ${st.lat}° latitude and a ${st.U} m/s jet, the pattern drifts ${Math.abs(c) < 0.5 ? 'hardly at all: it is nearly stationary, the setup for a persistent weather block' : c > 0 ? `eastward at about ${(c * 86.4).toFixed(0)} km/day` : `westward at about ${(-c * 86.4).toFixed(0)} km/day`}. Long waves (few of them) move west, short waves (many) get swept east.`);
      };
      const run = { on: true };
      group.onFrame(dt => { if (!run.on) return; st.phase += (cphase() / (EARTH_R * 1000 * Math.cos(st.lat * DEG))) * st.k * dt * 86400 * 0.12; draw(); });
      g.needAnimation(1);
      this._anim = true;
      A.sceneCtl.show('Rossby waves: the jet stream meanders', c => {
        const k = A.ui.slider('Number of waves', { min: 2, max: 9, step: 1, value: st.k, format: v => String(v), onInput: v => { st.k = v; draw(); } });
        const a = A.ui.slider('Wave amplitude', { min: 0, max: 25, step: 1, value: st.amp, format: v => `${v}° of latitude`, onInput: v => { st.amp = v; draw(); } });
        const u = A.ui.slider('Jet speed', { min: 5, max: 50, step: 1, value: st.U, format: v => `${v} m/s`, onInput: v => { st.U = v; draw(); } });
        const lt = A.ui.slider('Latitude', { min: 30, max: 70, step: 1, value: st.lat, format: v => `${v}° N`, onInput: v => { st.lat = v; draw(); } });
        c.append(k.row, a.row, u.row, lt.row, h('div', { class: 'row' }, A.ui.button('Pause / play', () => { run.on = !run.on; }, 'play')), read);
      });
      draw();
    },
    exit() { this.group.dispose(); A.globe.needAnimation(-1); },
  };

  /* ---------------------------------------------------------- monsoon: two seasons side by side */
  A.widgets.monsoon = {
    enter() {
      const read = A.ui.readout();
      const L = A.layers;
      const sample = (name, m, lon, lat) => L.grid(name).at(m, lon, lat);
      const compute = () => {
        const out = [];
        for (const [label, lon, lat] of [['Arabian Sea', 65, 14], ['Bay of Bengal', 88, 15], ['West Africa', -3, 11], ['Northern Australia', 133, -14]]) {
          const rows = [0, 6].map(m => {
            const u = sample('u850', m, lon, lat); const v = sample('v850', m, lon, lat);
            const from = mod(Math.atan2(-u, -v) * RAD, 360);
            return { wind: `${A.fmt.compass(from)} ${A.fmt.speed(Math.hypot(u, v), 0)}`, rain: sample('precip', m, lon, lat) };
          });
          out.push([label, rows]);
        }
        return out;
      };
      const data = compute();
      const tbl = h('table', { class: 'data', style: { fontSize: '11.5px', color: 'var(--hud-ink)' } }, h('thead', null, h('tr', null, h('th', null, 'Place'), h('th', null, 'January winds (1.5 km)'), h('th', null, 'January rain'), h('th', null, 'July winds'), h('th', null, 'July rain'))),
        h('tbody', null, data.map(([label, [jan, jul]]) => h('tr', null, h('td', null, label), h('td', null, jan.wind), h('td', { class: 'n' }, A.fmt.precip(jan.rain)), h('td', null, jul.wind), h('td', { class: 'n' }, A.fmt.precip(jul.rain))))));
      A.sceneCtl.show('Monsoon: the wind turns round with the seasons', c => {
        c.append(A.ui.buttons('Season', [['jan', 'January'], ['jul', 'July']], v => { A.setTime(dayFromMonth(v === 'jan' ? 0 : 6, 0.5) + 0.5); }, A.state.day < 181 ? 'jan' : 'jul').row, tbl);
        c.append(h('div', { class: 'readout' }, 'Winds are at about 1.5 km (850 hPa). Compare the Indian Ocean: in January the wind blows from the north-east, out of Asia; in July it blows from the south-west, laden with moisture off the ocean.'));
      });
      void read;
    },
    exit() {},
  };
});
