/* ------------------------------------------------------------------ ENSO, ocean conveyor, records, atmosphere shells */
A.widgetFactories.push(() => {
  const nino34Box = [[-170, -5], [-170, 5], [-120, 5], [-120, -5], [-170, -5]];

  /* ---------------------------------------------------------- the El Nino time machine */
  A.widgets.enso = {
    async enter(topic, arg) {
      const pack = await A.loadPack('enso');
      const g = A.globe; const L = A.layers;
      const f = pack.float('enso_sst_anom');
      const grid = new Grid('enso_sst_anom', f.data, f.shape, f.meta);
      const series = A.packs.core.json('series');
      const oni = series.enso.oni; const events = series.enso.events;
      const nino = series.indices.nino34;
      const def = { id: 'enso_time', title: 'Sea-surface temperature anomaly', cmap: 'anomaly', range: [-3.5, 3.5], unit: '°C', mask: 1, static: true, clockNote: 'Real data for the month named in the title, chosen with the lab’s own slider. The clock below does not change it.' };
      L.defs.enso_time = def;
      const st = this.st = { i: Math.max(0, (arg ? +arg : 0) || (1997 - 1950) * 12 + 10), playing: false, acc: 0 };
      const total = grid.nt;
      const group = this.group = new SceneGroup();
      const box = group.add(new GeoLines(g, { color: '#ffffff', opacity: 0.95, height: 0.006, order: 6 }));
      box.set([nino34Box]);
      g.labels.add({ id: 'nino-label', group: 'scene', text: 'Niño 3.4 region', lon: -145, lat: 8, cls: 'note', nocollide: true, priority: 100 });
      L.slots[0].set(def, grid);
      L.colorId = 'enso_time';
      A.bus.emit('layers');
      const read = A.ui.readout();
      const monthOf = i => [1950 + Math.floor(i / 12), (i % 12) + 1];
      const xNow = () => { const [y, m] = monthOf(st.i); return y + (m - 0.5) / 12; };
      const oniX = Array.from({ length: oni.values.length }, (_, k) => oni.start[0] + (oni.start[1] - 1 + k) / 12 + 1 / 24);
      const chart = A.chart.line({
        title: 'Oceanic Niño Index', height: 150, series: [{ name: 'ONI', x: oniX, y: oni.values, color: 0, diverge: true, marker: false }],
        x: { min: 1950, max: oniX[oniX.length - 1], ticks: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020], format: v => String(Math.round(v)) }, y: { min: -2.5, max: 3, ticks: [-2, 0, 2] }, unit: '°C',
        hlines: [{ y: 0.5, label: '+0.5' }, { y: -0.5, label: '−0.5' }], vlines: () => [{ x: xNow() }], tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}`, margin: { r: 10 },
      });
      const show = () => {
        L.slots[0].setTime({ i0: st.i, i1: st.i, t: 0 });
        const [y, m] = monthOf(st.i);
        const label = `Sea-surface temperature anomaly, ${MONTHS[m - 1]} ${y}`;
        if (def.title !== label) { def.title = label; A.hud.updateLegend(); }
        const ni = (y - 1948) * 12 + m - 1;
        const nv = ni >= 0 && ni < nino.values.length ? nino.values[ni] : null;
        const ev = events.find(e => (y * 12 + m) >= (e.start[0] * 12 + e.start[1]) && (y * 12 + m) <= (e.end[0] * 12 + e.end[1]));
        clear(read);
        read.append(h('div', null, h('b', null, `${MONTHS[m - 1]} ${y}`), nv === null ? '' : ` · Niño 3.4 anomaly ${A.fmt.tempDelta(nv, 1)}`),
          h('div', null, ev ? `Part of ${ev.type === 'El Nino' ? 'an El Niño' : 'a La Niña'} episode (${ev.strength}, peak ${A.fmt.tempDelta(ev.peak, 1)} in ${MONTHS3[ev.peakMonth[1] - 1]} ${ev.peakMonth[0]}).` : 'No El Niño or La Niña episode: neutral conditions.'));
        chart.redraw();
        slider.set(st.i);
      };
      const loop = A.bus.on('frame', dt => { if (!st.playing) return; st.acc += dt * 7; while (st.acc >= 1) { st.acc -= 1; st.i = (st.i + 1) % total; } show(); });
      this._loop = loop; g.needAnimation(1);
      let slider;
      A.sceneCtl.show('Niño time machine: real ocean temperature anomalies, month by month', c => {
        slider = A.ui.slider('Month', { min: 0, max: total - 1, step: 1, value: st.i, format: v => { const [y, m] = monthOf(v); return `${MONTHS3[m - 1]} ${y}`; }, onInput: v => { st.i = v; st.playing = false; show(); } });
        c.append(slider.row);
        const jumps = h('div', { class: 'row' }, A.ui.button('Play / pause', () => { st.playing = !st.playing; }, 'play'),
          ...[['1982', (1982 - 1950) * 12 + 11], ['1997', (1997 - 1950) * 12 + 11], ['2010', (2010 - 1950) * 12 + 1], ['2015', (2015 - 1950) * 12 + 11], ['2022', (2022 - 1950) * 12 + 10]].map(([label, idx]) => A.ui.button(label, () => { st.i = Math.min(total - 1, idx); st.playing = false; show(); })));
        c.append(jumps, chart, read);
      });
      $('#scenectl').classList.add('wide');
      g.flyTo(-150, 0, 5.2, 1400);
      show();
    },
    exit() {
      A.bus.off('frame', this._loop); A.globe.needAnimation(-1); this.group.dispose(); A.layers.setColor(null);
      A.globe.labels.removeGroup('scene'); $('#scenectl').classList.remove('wide');
    },
  };

  /* ---------------------------------------------------------- composite impact maps for El Nino and La Nina */
  A.widgets.ensoimpact = {
    async enter() {
      const pack = await A.loadPack('enso');
      const L = A.layers; const g = A.globe;
      const st = { phase: 'nino', field: 'precip' };
      const specs = {
        precip: { name: 'enso_precip', title: 'Rainfall anomaly', cmap: 'wetdry', range: [-2.5, 2.5], unit: 'mm/day', mask: 0, note: 'Blue is wetter than normal and brown drier, in December–February.' },
        t2m: { name: 'enso_t2m', title: 'Air temperature anomaly', cmap: 'anomaly', range: [-3, 3], unit: 'degC', mask: 0, note: 'Red is warmer than normal and blue colder, in December–February.' },
        slp: { name: 'enso_slp', title: 'Pressure anomaly', cmap: 'anomaly', range: [-4, 4], unit: 'hPa', mask: 0, note: 'Red is higher than normal pressure and blue lower. The see-saw between the western and eastern Pacific is the Southern Oscillation.' },
        sst: { name: 'enso_sst', title: 'Sea-surface temperature anomaly', cmap: 'anomaly', range: [-2.5, 2.5], unit: 'degC', mask: 1, note: 'The warm tongue of El Niño or cool tongue of La Niña along the equator is the cause of everything else.' },
      };
      const info = pack.json('enso_info');
      const read = A.ui.readout();
      const apply = async () => {
        const sp = specs[st.field];
        const grid = pack.grid(`${sp.name}_${st.phase}`);
        const def = { id: 'enso_impact', title: `${sp.title}, ${st.phase === 'nino' ? 'El Niño' : 'La Niña'} winters`, cmap: sp.cmap, range: sp.range, unit: sp.unit, mask: sp.mask, clockNote: 'An average of many winters (December to February), not one date. The clock below does not change it.' };
        L.defs.enso_impact = def;
        L.slots[0].set(def, grid);
        L.slots[0].setTime({ i0: 0, i1: 0, t: 0 });
        L.colorId = 'enso_impact';
        A.bus.emit('layers');
        const yrs = st.phase === 'nino' ? info.nino : info.nina;
        clear(read);
        read.append(`${sp.note} Average of ${yrs.length} winters: ${yrs.map(y => `${y - 1}/${String(y).slice(2)}`).join(', ')}. Anomaly means the difference from the 1991–2020 normal.`);
      };
      A.sceneCtl.show('What El Niño and La Niña do to the world', c => {
        c.append(A.ui.buttons('Phase', [['nino', 'El Niño'], ['nina', 'La Niña']], v => { st.phase = v; apply(); }, st.phase).row);
        c.append(A.ui.buttons('Map', [['precip', 'Rain'], ['t2m', 'Temperature'], ['slp', 'Pressure'], ['sst', 'Ocean']], v => { st.field = v; apply(); }, st.field).row);
        c.append(read);
      });
      apply();
    },
    exit() { A.layers.setColor(null); },
  };

  /* ---------------------------------------------------------- Walker circulation (equatorial cross-section) */
  A.widgets.walker = {
    async enter() {
      const pack = await A.loadPack('enso');
      const uF = pack.float('walker_u'); const wF = pack.float('walker_omega');
      const sstF = pack.float('walker_sst'); const slpF = pack.float('walker_slp');
      const nlon = 144; const nu = uF.shape[1]; const nw = wF.shape[1];
      const levels = wF.meta.plev;                      // 1000 ... 100 hPa (12 levels)
      const st = this.st = { phase: 0, particles: true };
      const W = 560; const H = 300;
      const box = A.canvasBox(W, H);
      const m = { l: 40, r: 12, t: 12, b: 96 };
      const pw = W - m.l - m.r; const ph = H - m.t - m.b;
      const lon0 = 60; const lon1 = 300;                       // 60E ... 60W
      const X = lon => m.l + (lon - lon0) / (lon1 - lon0) * pw;
      const Y = p => m.t + (Math.log(1000 / p) / Math.log(10)) * ph;
      const uAt = (ph_, k, i) => uF.data[ph_ * nu * nlon + k * nlon + i];
      const wAt = (ph_, k, i) => wF.data[ph_ * nw * nlon + k * nlon + i];
      const interp = (fn, lon, p) => {
        const fi = mod(lon / 2.5, nlon); const i0 = Math.floor(fi); const i1 = (i0 + 1) % nlon; const t = fi - i0;
        let k = 0; while (k < nw - 2 && levels[k + 1] > p) k++;
        const tk = clamp((Math.log(levels[k]) - Math.log(p)) / (Math.log(levels[k]) - Math.log(levels[k + 1])), 0, 1);
        const v = (kk) => fn(st.phase, kk, i0) * (1 - t) + fn(st.phase, kk, i1) * t;
        const a = v(k); const b = v(k + 1);
        return (Number.isFinite(a) ? a : 0) * (1 - tk) + (Number.isFinite(b) ? b : 0) * tk;
      };
      const N = 900;
      const P = { lon: new Float32Array(N), p: new Float32Array(N), age: new Float32Array(N), life: new Float32Array(N), hist: new Float32Array(N * 10) };
      const spawn = (i, init) => { P.lon[i] = lon0 + Math.random() * (lon1 - lon0); P.p[i] = 140 + Math.random() * 840; P.life[i] = 120 + Math.random() * 260; P.age[i] = init ? Math.random() * P.life[i] : 0; for (let k = 0; k < 5; k++) { P.hist[i * 10 + k * 2] = P.lon[i]; P.hist[i * 10 + k * 2 + 1] = P.p[i]; } };
      for (let i = 0; i < N; i++) spawn(i, true);
      const bg = document.createElement('canvas'); bg.width = 120; bg.height = 60; const bgx = bg.getContext('2d'); const img = bgx.createImageData(120, 60);
      const lut = A.cmap.lut('divD');
      let built = -1;
      const build = () => {
        for (let iy = 0; iy < 60; iy++) for (let ix = 0; ix < 120; ix++) {
          const lon = lon0 + (ix + 0.5) / 120 * (lon1 - lon0); const p = 1000 / Math.pow(10, (iy + 0.5) / 60);
          const om = p >= 100 ? interp(wAt, lon, p) : 0;
          const k = clamp(Math.round((om / 0.08 * 0.5 + 0.5) * 255), 0, 255) * 4;
          const o = (iy * 120 + ix) * 4; img.data[o] = lut[k]; img.data[o + 1] = lut[k + 1]; img.data[o + 2] = lut[k + 2]; img.data[o + 3] = 255;
        }
        bgx.putImageData(img, 0, 0); built = st.phase;
      };
      const phases = ['Normal December–February', 'El Niño winter', 'La Niña winter'];
      const read = A.ui.readout();
      const sstAt = (ph_, lon) => {
        const lw = lon > 180 ? lon - 360 : lon; const nx = sstF.shape[1];
        return sstF.data[ph_ * nx + (Math.round((lw + 180) / 2) % nx)];
      };
      const draw = dt => {
        if (built !== st.phase) build();
        const { ctx } = box;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(8,14,26,0.9)'; ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(bg, m.l, m.t, pw, ph);
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.fillStyle = 'rgba(210,222,240,0.85)'; ctx.font = '10.5px system-ui'; ctx.textAlign = 'right';
        for (const p of [1000, 700, 500, 300, 200, 100]) { ctx.beginPath(); ctx.moveTo(m.l, Y(p)); ctx.lineTo(W - m.r, Y(p)); ctx.stroke(); ctx.fillText(`${p}`, m.l - 4, Y(p) + 3); }
        ctx.textAlign = 'center';
        for (const l of [60, 90, 120, 150, 180, 210, 240, 270, 300]) { ctx.beginPath(); ctx.moveTo(X(l), m.t); ctx.lineTo(X(l), m.t + ph); ctx.stroke(); ctx.fillText(l <= 180 ? `${l}°E` : `${360 - l}°W`, X(l), m.t + ph + 13); }
        if (st.particles) {
          const frames = Math.min(2.5, (dt || 1 / 60) * 60); const TS = 4e5 * Math.min(0.05, dt || 1 / 60);
          ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath();
          for (let i = 0; i < N; i++) {
            P.age[i] += frames;
            const u = interp(uAt, P.lon[i], clamp(P.p[i], 100, 1000)); const om = interp(wAt, P.lon[i], clamp(P.p[i], 100, 1000));
            P.lon[i] += u * TS / (EARTH_R * 1000) * RAD; P.p[i] += om * TS / 100;
            if (P.age[i] > P.life[i] || P.p[i] < 110 || P.p[i] > 1000 || P.lon[i] < lon0 || P.lon[i] > lon1) { spawn(i, false); continue; }
            const b = i * 10;
            for (let k = 4; k > 0; k--) { P.hist[b + k * 2] = P.hist[b + (k - 1) * 2]; P.hist[b + k * 2 + 1] = P.hist[b + (k - 1) * 2 + 1]; }
            P.hist[b] = P.lon[i]; P.hist[b + 1] = P.p[i];
            ctx.moveTo(X(P.hist[b]), Y(P.hist[b + 1]));
            for (let k = 1; k < 5; k++) ctx.lineTo(X(P.hist[b + k * 2]), Y(P.hist[b + k * 2 + 1]));
          }
          ctx.stroke();
        }
        // sea temperature and pressure along the equator
        const y0 = m.t + ph + 24; const hh = 54;
        ctx.fillStyle = 'rgba(210,222,240,0.85)'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
        ctx.fillText('Equatorial sea-surface temperature (°C):', m.l, y0 + 8);
        const tmin = 22; const tmax = 31;
        ctx.strokeStyle = '#ff9a5a'; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let lon = lon0; lon <= lon1; lon += 2) { const t = sstAt(st.phase, lon); const x = X(lon); const y = y0 + 12 + (1 - (t - tmin) / (tmax - tmin)) * (hh - 14); if (lon === lon0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(210,222,240,0.6)'; ctx.fillText(`${tmax}`, m.l - 20, y0 + 22); ctx.fillText(`${tmin}`, m.l - 20, y0 + hh);
        ctx.font = '10.5px system-ui'; ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(phases[st.phase], W - m.r, y0 + 8);
      };
      this._loop = A.bus.on('frame', draw);
      A.globe.needAnimation(1);
      const note = () => { clear(read); read.append(['In a normal winter, surface winds blow westward along the equator (blue arrows at the surface drive the warm water west), air rises over the warm western Pacific and sinks over the cool east. Shading: blue is rising air, brown is sinking air.', 'During El Niño the warm water slides east, the surface winds weaken, and the rising branch moves into the central Pacific: the whole circulation is weakened and shifted.', 'During La Niña the cool tongue strengthens, the winds speed up and the rising air is concentrated over the far western Pacific.'][st.phase]); };
      $('#scenectl').classList.add('wide');
      A.sceneCtl.show('Walker circulation along the equator (5°S–5°N average)', c => {
        c.append(box.canvas);
        c.append(A.ui.buttons('Winter', [[0, 'Normal'], [1, 'El Niño'], [2, 'La Niña']], v => { st.phase = +v; note(); }, 0).row, read);
        note();
      });
      A.globe.flyTo(-170, 0, 4.2, 1400);
    },
    exit() { A.bus.off('frame', this._loop); A.globe.needAnimation(-1); $('#scenectl').classList.remove('wide'); },
  };

  /* ---------------------------------------------------------- the global conveyor belt */
  A.widgets.conveyor = {
    enter(topic, arg) {
      const g = A.globe;
      const group = this.group = new SceneGroup();
      const paths = A.data.conveyor;
      const rib = group.add(new GeoRibbon(g, { height: 0.01, order: 6, joints: true }));
      const dots = group.add(new GeoPoints(g, { height: 0.016, order: 8 }));
      const st = { warm: true, cold: true, t: 0 };
      const warmCol = [1, 0.45, 0.25, 1]; const coldCol = [0.35, 0.6, 1, 1]; const upCol = [0.95, 0.8, 0.35, 1];
      const lines = paths.map(p => ({ ...p, pts: A.unwrapLine(p.pts.map(q => [q[0], q[1], 0])) }));
      const lens = lines.map(l => { let d = 0; const cum = [0]; for (let i = 1; i < l.pts.length; i++) { d += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]); cum.push(d); } return { total: d, cum }; });
      const redraw = () => {
        rib.set(lines.filter(l => (l.kind === 'warm' ? st.warm : st.cold)).map(l => ({ pts: l.pts, color: l.kind === 'warm' ? warmCol : coldCol, width: l.width || 4 })));
      };
      group.onFrame(dt => {
        st.t += dt * 0.03;
        const items = [];
        lines.forEach((l, k) => {
          if (l.kind === 'warm' ? !st.warm : !st.cold) return;
          const n = Math.max(3, Math.round(lens[k].total / 12));
          for (let j = 0; j < n; j++) {
            const f = mod(st.t * (l.kind === 'warm' ? 1.4 : 0.9) + j / n, 1) * lens[k].total;
            let idx = 1; while (idx < lens[k].cum.length - 1 && lens[k].cum[idx] < f) idx++;
            const a = l.pts[idx - 1]; const b = l.pts[idx]; const t = (f - lens[k].cum[idx - 1]) / Math.max(1e-6, lens[k].cum[idx] - lens[k].cum[idx - 1]);
            items.push({ lon: lerp(a[0], b[0], t), lat: lerp(a[1], b[1], t), color: l.kind === 'warm' ? [1, 0.85, 0.7, 1] : [0.8, 0.9, 1, 1], size: 5 });
          }
        });
        for (const s of A.data.conveyorSites) items.push({ lon: s.lon, lat: s.lat, color: s.type === 'sink' ? [1, 1, 1, 1] : upCol, size: 11 });
        dots.set(items);
      });
      g.needAnimation(1);
      A.data.conveyorSites.forEach((s, i) => g.labels.add({ id: `site${i}`, group: 'scene', text: s.name, lon: s.lon, lat: s.lat, cls: 'note', nocollide: true, priority: 90 }));
      A.sceneCtl.show('The global conveyor belt (schematic)', c => {
        c.append(h('div', { class: 'row' }, ...[['warm', 'Warm surface water'], ['cold', 'Cold deep water']].map(([k, label]) => h('label', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center', minWidth: 0 } }, h('input', { type: 'checkbox', checked: true, onchange: e => { st[k] = e.target.checked; redraw(); } }), h('i', { style: { width: '14px', height: '4px', background: k === 'warm' ? '#ff7340' : '#5a99ff', display: 'inline-block', borderRadius: '2px' } }), label))));
        c.append(h('div', { class: 'readout' }, 'Paths are a simplified sketch after Broecker (1987) and Rahmstorf (2002). White dots mark where surface water cools, becomes dense and sinks; yellow dots mark the broad regions where deep water slowly rises again. One full loop takes about a thousand years.'));
      });
      g.flyTo(-20, 15, 5.8, 1600);
      redraw();
    },
    exit() { A.globe.needAnimation(-1); this.group.dispose(); A.globe.labels.removeGroup('scene'); },
  };

  /* ---------------------------------------------------------- world records */
  A.widgets.records = {
    async enter(topic, arg) {
      const g = A.globe;
      const recs = A.data.records;
      const read = A.ui.readout();
      const pins = new GeoPoints(g, { height: 0.012, order: 8, ring: true });
      this.pins = pins;
      const items = recs.map(r => ({ lon: r.lon, lat: r.lat, color: [1, 0.8, 0.3, 1], size: 11, rec: r }));
      pins.set(items);
      if (A.storms) await A.storms.load().catch(() => null);
      const show = r => {
        let lon = r.lon; let lat = r.lat;
        if (r.storm && A.storms.loaded) { const f = A.storms.fame.find(s => s.name === r.storm); if (f) { const best = f.track.reduce((b, p) => (p[3] > 0 && (!b || p[3] < b[3]) ? p : b), null); if (best) { lon = best[0]; lat = best[1]; } } }
        g.flyTo(lon, lat, 2.2, 1400);
        g.labels.removeGroup('scene');
        g.labels.add({ id: 'rec', group: 'scene', text: `${r.title}: ${r.value}`, lon, lat, cls: 'note pin', nocollide: true, priority: 100 });
        clear(read);
        read.append(h('div', null, h('b', null, r.title), `: ${r.value}`), h('div', null, `${r.where} · ${r.when}`), h('div', { style: { opacity: 0.85 } }, r.note));
      };
      const select = h('select', { class: 'small-select', 'aria-label': 'Choose a record', onchange: e => show(recs[+e.target.value]) }, recs.map((r, i) => h('option', { value: i }, r.title)));
      A.sceneCtl.show('World weather records', c => { c.append(h('div', { class: 'row' }, select), read); });
      const first = Math.max(0, recs.findIndex(r => r.id === arg));
      select.value = String(first);
      show(recs[first]);
    },
    exit() { this.pins.clear(); A.globe.labels.removeGroup('scene'); },
  };

  /* ---------------------------------------------------------- how thin the atmosphere really is */
  A.widgets.layers3d = {
    enter() {
      const g = A.globe;
      const st = { exag: 20 };
      const group = this.group = new SceneGroup();
      const layers = [['Troposphere', 11, 0x4aa8ff], ['Stratosphere', 50, 0x6b7cff], ['Mesosphere', 85, 0xb06bff], ['Thermosphere (to 120 km)', 120, 0xff6bd6]];
      const meshes = layers.map(([name, km, color]) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.FrontSide }));
        mesh.renderOrder = 3;
        g.world.add(mesh);
        group.add({ dispose() { g.world.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); } });
        return mesh;
      });
      const place = () => {
        layers.forEach(([name, km], i) => meshes[i].scale.setScalar(1 + km / EARTH_R * st.exag));
        g.labels.removeGroup('scene');
        layers.forEach(([name, km], i) => g.labels.add({ id: `lay${i}`, group: 'scene', text: `${name} top: ${km} km`, lon: -62 + i * 0, lat: 60 - i * 8, h: km / EARTH_R * st.exag, cls: 'note', nocollide: true, priority: 90 - i }));
        g.requestRender();
        $('#l3d-read').textContent = st.exag === 1 ? 'True scale: the entire weather layer is thinner than the skin of an apple compared with the Earth’s size. Satellites in low orbit fly only a few hundred kilometres up.' : `Heights exaggerated ${st.exag}× so that the layers can be seen. At true scale the troposphere (where all weather happens) is only 11 km thick, about 0.17% of the Earth’s radius.`;
      };
      A.sceneCtl.show('The atmosphere is a thin skin', c => {
        c.append(A.ui.slider('Exaggeration', { min: 1, max: 80, step: 1, value: st.exag, format: v => `×${v}`, onInput: v => { st.exag = v; place(); } }).row);
        c.append(h('div', { class: 'readout', id: 'l3d-read' }));
      });
      g.flyTo(-40, 15, 2.6, 1400);
      place();
    },
    exit() { this.group.dispose(); A.globe.labels.removeGroup('scene'); },
  };
});
