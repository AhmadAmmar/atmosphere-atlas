/* ------------------------------------------------------------------ tropical cyclones from IBTrACS */
A.storms = {
  loaded: false,
  scene: null,

  async load() {
    if (this.loaded) return this;
    const pack = await A.loadPack('storms');
    const meta = pack.json('tc_meta');
    const off = pack.json('tc_off');
    const dlon = pack.i16('tc_lon').data; const dlat = pack.i16('tc_lat').data;
    const wind = pack.u8('tc_wind').data;
    const total = dlon.length;
    const lon = new Float32Array(total); const lat = new Float32Array(total);
    for (let s = 0; s < off.length - 1; s++) {
      let x = 0; let y = 0;
      for (let i = off[s]; i < off[s + 1]; i++) {
        if (i === off[s]) { x = dlon[i]; y = dlat[i]; } else { x += dlon[i]; y += dlat[i]; }
        lon[i] = x / 10; lat[i] = y / 10;
      }
    }
    this.pack = pack; this.off = off; this.lon = lon; this.lat = lat; this.wind = wind;
    this.basins = meta.basins;
    this.rows = meta.rows.map((r, i) => {
      const [name, season, basin, startStep, peak, minHpa, genesis] = r;
      const code = meta.basins[basin];
      const startDay = startStep / 4;
      const south = code === 'SI' || code === 'SP' || code === 'SA';
      const calYear = south ? (startDay < 182 ? season : season - 1) : season;
      return { i, name, season, basin: code, startDay, peak, minHpa, genesis, calYear, cat: A.stormCategory(peak) };
    });
    this.fame = pack.json('tc_fame');
    this.stats = pack.json('tc_stats');
    this.loaded = true;
    return this;
  },

  colorFor(w) {
    if (w < 34) return [0.42, 0.48, 0.6];
    const c = A.cmap.hex(A.catColors[A.stormCategory(w)]);
    return [c[0] / 255, c[1] / 255, c[2] / 255];
  },

  select({ basins = null, from = 1980, to = 2100, minPeak = 0, calYear = null } = {}) {
    return this.rows.filter(r => (!basins || basins.includes(r.basin)) && r.season >= from && r.season <= to && r.peak >= minPeak && (calYear === null || r.calYear === calYear));
  },

  /** Draw the selected storms as colour-coded lines (optionally only up to `day` for a replay). */
  draw(rows, { opacity = 0.6, replayDay = null } = {}) {
    if (!this.lines) this.lines = new GeoLines(A.globe, { color: '#ffffff', opacity, height: 0.007, order: 4 });
    this.lines.setOpacity(opacity);
    let count = 0;
    for (const r of rows) count += this.off[r.i + 1] - this.off[r.i] - 1;
    const data = new Float32Array(count * 7);
    let n = 0;
    for (const r of rows) {
      const a = this.off[r.i]; const b = this.off[r.i + 1];
      for (let k = a; k < b - 1; k++) {
        if (replayDay !== null && r.startDay + (k - a + 1) * 0.25 > replayDay) break;
        const c = this.colorFor(this.wind[k]);
        const o = n * 7;
        data[o] = this.lon[k]; data[o + 1] = this.lat[k]; data[o + 2] = this.lon[k + 1]; data[o + 3] = this.lat[k + 1];
        data[o + 4] = c[0]; data[o + 5] = c[1]; data[o + 6] = c[2];
        n++;
      }
    }
    this.lines.setSegments(data, n);
    this.lines.visible = true;
    return n;
  },

  /** Heads of storms that are active on a given day of a calendar year (replay markers). */
  heads(rows, day) {
    if (!this.points) this.points = new GeoPoints(A.globe, { height: 0.012, order: 6, ring: true });
    const items = [];
    for (const r of rows) {
      const a = this.off[r.i]; const b = this.off[r.i + 1];
      const idx = Math.floor((day - r.startDay) * 4);
      if (idx < 0 || idx >= b - a) continue;
      const w = this.wind[a + idx];
      if (w < 34) continue;
      const c = this.colorFor(w);
      items.push({ lon: this.lon[a + idx], lat: this.lat[a + idx], color: [c[0], c[1], c[2], 1], size: 8 + Math.min(16, w / 9), row: r, wind: w });
    }
    this.points.set(items);
    return items;
  },

  clearScene() {
    if (this.lines) this.lines.visible = false;
    if (this.points) this.points.clear();
    if (this.glyph) { this.glyph.dispose(); this.glyph = null; }
    if (this.hall) { this.hall.dispose(); this.hall = null; }
    A.globe.labels.removeGroup('storm');
    this.scene = null;
  },

  async apply(spec) {
    await this.load();
    this.scene = spec;
    const rows = this.select({ basins: spec.basins || null, from: spec.from || 1980, to: spec.to || 2100, minPeak: spec.minPeak || 0 });
    this.draw(rows, { opacity: spec.opacity || (rows.length > 600 ? 0.5 : 0.8) });
    if (spec.labelBasins) {
      for (const b of A.data.basins) A.globe.labels.add({ id: `basin-${b.code}`, group: 'storm', text: `${b.name}: ${b.term}s`, lon: b.lon, lat: b.lat, cls: 'note', priority: 80, nocollide: true });
    }
  },

  /** A rotating spiral-band glyph that shows the structure of a storm of given strength at a place. */
  makeGlyph(lon, lat, windKt) {
    const g = A.globe;
    const group = new SceneGroup();
    const rib = group.add(new GeoRibbon(g, { height: 0.016, order: 8, joints: true }));
    const ring = group.add(new GeoLines(g, { color: '#ffffff', opacity: 0.95, height: 0.018, order: 9 }));
    const north = lat >= 0;
    const state = { lon, lat, wind: windKt, rot: 0 };
    const draw = () => {
      const R = 220 + state.wind * 3.2;                       // km, size of the cloud shield
      const eye = clamp(46 - state.wind * 0.18, 12, 42);      // eye radius: smaller in the strongest storms
      const wall = eye * 1.7;
      const items = [];
      const arms = 3;
      for (let a = 0; a < arms; a++) {
        const pts = [];
        for (let k = 0; k <= 44; k++) {
          const r = wall + (R - wall) * (k / 44);
          const sgn = north ? 1 : -1;                                    // +1: the storm turns anticlockwise (Northern Hemisphere)
          const bearing = mod(a * 360 / arms - sgn * state.rot + sgn * (k / 44) * 2.1 * 180, 360);
          const d = A.geo.destination(state.lon, state.lat, bearing, r);
          pts.push([d.lon, d.lat, 0]);
        }
        items.push({ pts: A.unwrapLine(pts), color: [1, 1, 1, 0.85], width: 7 - a });
      }
      rib.set(items);
      const circle = rad => { const out = []; for (let b = 0; b <= 360; b += 12) { const d = A.geo.destination(state.lon, state.lat, b, rad); out.push([d.lon, d.lat, 0]); } return A.unwrapLine(out); };
      ring.set([circle(eye), circle(wall)]);
    };
    group.onFrame(dt => { state.rot += dt * 60; draw(); });
    A.globe.needAnimation(1);
    group.set = (lo, la, w) => { state.lon = lo; state.lat = la; state.wind = w; };
    const base = group.dispose.bind(group);
    group.dispose = () => { A.globe.needAnimation(-1); base(); };
    draw();
    return group;
  },
};

/** Make a polyline's longitudes continuous (no 360 degree jumps). */
A.unwrapLine = function unwrapLine(pts) {
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length; i++) {
    let l = pts[i][0];
    const prev = out[i - 1][0];
    while (l - prev > 180) l -= 360;
    while (l - prev < -180) l += 360;
    out.push([l, pts[i][1], pts[i][2]]);
  }
  return out;
};

A.widgetFactories.push(() => {
  /* ---------------------------------------------------------- storm-track explorer and season replay */
  A.widgets.tracks = {
    async enter(topic, arg) {
      await A.storms.load();
      const S = A.storms;
      const st = this.st = { basin: 'ALL', minPeak: 0, from: 1980, to: new Date().getUTCFullYear(), year: 2005, replay: arg === 'replay' };
      const lastSeason = S.stats.seasons[1];
      st.to = lastSeason;
      const read = A.ui.readout();
      const refresh = () => {
        const rows = S.select({ basins: st.basin === 'ALL' ? null : [st.basin], from: st.from, to: st.to, minPeak: st.minPeak });
        if (st.replay) {
          const yrRows = S.select({ basins: st.basin === 'ALL' ? null : [st.basin], calYear: st.year, minPeak: st.minPeak });
          const day = mod(A.state.day, 365);
          S.draw(yrRows, { opacity: 0.85, replayDay: day });
          const heads = S.heads(yrRows, day);
          const started = yrRows.filter(r => r.startDay <= day);
          const top = started.reduce((b, r) => (!b || r.peak > b.peak ? r : b), null);
          clear(read);
          read.append(`${st.year}: ${started.length} of ${yrRows.length} storms of tropical-storm strength have formed by ${dayLabel(day)}; ${heads.length} active right now.${top ? ` Strongest so far: ${top.name} (${top.peak} kt, ${A.catNames[top.cat].toLowerCase()}).` : ''} Press play on the time bar to run the year.`);
        } else {
          S.draw(rows, { opacity: rows.length > 900 ? 0.42 : rows.length > 250 ? 0.6 : 0.9 });
          S.points && S.points.clear();
          const maj = rows.filter(r => r.peak >= 96).length; const hur = rows.filter(r => r.peak >= 64).length;
          clear(read);
          read.append(`${rows.length.toLocaleString('en-GB')} storms between ${st.from} and ${st.to}${st.basin === 'ALL' ? ' worldwide' : ' in the ' + A.data.basins.find(b => b.code === st.basin).name}: ${hur.toLocaleString('en-GB')} reached hurricane strength and ${maj.toLocaleString('en-GB')} reached major (Category 3+) strength. Line colour shows intensity at each moment.`);
        }
      };
      this.refresh = refresh;
      this._time = A.bus.on('time', () => { if (st.replay) refresh(); });
      A.sceneCtl.show(st.replay ? 'One season of storms, replayed' : 'Every tropical storm since 1980', c => {
        const basins = [['ALL', 'World'], ...A.data.basins.filter(b => b.code !== 'SA').map(b => [b.code, b.code])];
        c.append(A.ui.buttons('Basin', basins, v => { st.basin = v; refresh(); const b = A.data.basins.find(x => x.code === v); if (b) A.globe.flyTo(b.lon, b.lat, 3.2, 1300); else A.globe.flyTo(-170, 15, 5.4, 1300); }, st.basin).row);
        c.append(A.ui.buttons('Show', [[0, 'All storms'], [64, 'Hurricane strength'], [96, 'Major (Cat 3+)'], [137, 'Cat 5']], v => { st.minPeak = +v; refresh(); }, st.minPeak).row);
        if (st.replay) {
          c.append(A.ui.slider('Year', { min: 1980, max: lastSeason, step: 1, value: st.year, format: v => String(v), onInput: v => { st.year = v; refresh(); } }).row);
        } else {
          c.append(A.ui.slider('From', { min: 1980, max: lastSeason, step: 1, value: st.from, format: v => String(v), onInput: v => { st.from = Math.min(v, st.to); refresh(); } }).row);
          c.append(A.ui.slider('To', { min: 1980, max: lastSeason, step: 1, value: st.to, format: v => String(v), onInput: v => { st.to = Math.max(v, st.from); refresh(); } }).row);
        }
        const leg = h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '4px 10px', fontSize: '11.5px' } }, ['Tropical storm', 'Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5'].map((t, i) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } }, h('i', { style: { width: '14px', height: '3px', background: A.catColors[i], display: 'inline-block', borderRadius: '2px' } }), t)));
        c.append(leg, read);
      });
      if (st.replay) { A.setTime(0.5); }
      refresh();
      A.globe.flyTo(-170, 15, 5.4, 1300);
    },
    exit() { A.bus.off('time', this._time); A.storms.clearScene(); },
  };

  /* ---------------------------------------------------------- hall of fame: follow one storm */
  A.widgets.fame = {
    async enter(topic, arg) {
      await A.storms.load();
      const S = A.storms; const g = A.globe;
      const st = this.st = { idx: 0, t: 0, playing: false };
      const fame = S.fame.slice().sort((a, b) => b.peakKt - a.peakKt);
      this.fame = fame;
      const read = A.ui.readout();
      const rib = new GeoRibbon(g, { height: 0.012, order: 6, joints: true });
      const headDot = new GeoPoints(g, { height: 0.02, order: 9, ring: true });
      let glyph = null;
      this.group = { dispose() { rib.set([]); g.scene.remove(rib.mesh); if (rib.joints) rib.joints.clear(); headDot.clear(); if (glyph) glyph.dispose(); } };
      const host = document.getElementById('storm-host');
      const track = () => fame[st.idx].track;
      const showStorm = idx => {
        st.idx = idx; st.t = 0; st.playing = true;
        const s = fame[idx];
        const pts = s.track.map(p => [p[0], p[1], 0]);
        const mid = s.track[Math.floor(s.track.length / 2)];
        g.flyTo(mid[0], mid[1], 3.1, 1500);
        if (glyph) glyph.dispose();
        glyph = S.makeGlyph(pts[0][0], pts[0][1], s.track[0][2]);
        buildCharts(s);
        update(0);
      };
      const buildCharts = s => {
        if (!host) return;
        clear(host);
        const x = s.track.map((_, i) => i * 6 / 24);
        host.append(A.chart.line({ title: `${s.name} (${s.season}): wind speed`, subtitle: `Sustained wind in knots every six hours, from the best-track record. Peak ${s.peakKt} kt.`, height: 170, series: [{ name: 'Wind', x, y: s.track.map(p => p[2]), color: 1, marker: true, area: true }], x: { min: 0, max: x[x.length - 1], label: 'Days since first record' }, y: { min: 0, label: 'knots' }, hlines: [{ y: 64, label: 'hurricane' }, { y: 96, label: 'major' }], unit: 'kt', tipX: v => `day ${v.toFixed(1)}` }));
        const pr = s.track.map(p => (p[3] > 0 ? p[3] : null));
        if (pr.some(v => v)) host.append(A.chart.line({ title: 'Central pressure', subtitle: `Lowest value ${s.minHpa} hPa. The deeper the low, the stronger the winds.`, height: 160, series: [{ name: 'Pressure', x, y: pr, color: 0, marker: true }], x: { min: 0, max: x[x.length - 1], label: 'Days since first record' }, y: { label: 'hPa' }, unit: 'hPa', tipX: v => `day ${v.toFixed(1)}` }));
      };
      const update = k => {
        const s = fame[st.idx];
        const n = s.track.length - 1;
        const pos = clamp(st.t, 0, 1) * n; const i = Math.min(n, Math.floor(pos));
        rib.set(fame[st.idx].track.slice(0, i + 2).reduce((acc, p, j, arr) => { if (j === 0) return acc; const a = arr[j - 1]; acc.push({ pts: A.unwrapLine([[a[0], a[1], 0], [p[0], p[1], 0]]), color: [...S.colorFor(a[2]), 1], width: 4 }); return acc; }, []));
        const a = s.track[i]; const b = s.track[Math.min(n, i + 1)]; const f = pos - i;
        const lon = lerp(a[0], b[0], f); const lat = lerp(a[1], b[1], f); const w = lerp(a[2], b[2], f);
        headDot.set([{ lon, lat, color: [1, 1, 1, 1], size: 6 }]);
        if (glyph) glyph.set(lon, lat, w);
        const start = new Date(s.start.replace(' ', 'T') + ':00Z');
        const when = new Date(start.getTime() + pos * 6 * 3600 * 1000);
        clear(read);
        read.append(h('div', null, h('b', null, `${s.name} ${s.season}`), ` · ${when.toISOString().slice(0, 10)} · ${A.fmt.lat(lat)}, ${A.fmt.lon(lon)}`), h('div', null, `Wind ${Math.round(w)} kt (${A.fmt.speed(w * 0.514444, 0)}) · ${A.catNames[A.stormCategory(w)]}${w < 34 ? ' (tropical depression stage)' : ''}${(lerp(a[3], b[3], f) > 0) ? ` · pressure ${Math.round(lerp(a[3], b[3], f))} hPa` : ''}`),
          h('div', { style: { opacity: 0.85 } }, `Peak ${s.peakKt} kt, lowest pressure ${s.minHpa} hPa, accumulated cyclone energy ${s.ace}.`),
          A.data.stormNotes[`${s.name} ${s.season}`] ? h('div', { style: { marginTop: '5px' } }, A.data.stormNotes[`${s.name} ${s.season}`]) : null);
        void k; void track;
      };
      const loop = A.bus.on('frame', dt => { if (st.playing) { st.t += dt / 22; if (st.t >= 1) { st.t = 1; st.playing = false; } update(); } });
      this._loop = loop;
      g.needAnimation(1);
      const select = h('select', { class: 'small-select', 'aria-label': 'Choose a storm', onchange: e => showStorm(+e.target.value) }, fame.map((s, i) => h('option', { value: i }, `${s.name} ${s.season} – ${s.peakKt} kt, ${s.minHpa || '?'} hPa`)));
      const start = Math.max(0, fame.findIndex(s => (arg ? s.name.toLowerCase() === arg.toLowerCase() : s.name === 'Haiyan')));
      select.value = start;
      A.sceneCtl.show('Storm hall of fame: follow a real storm', c => {
        c.append(h('div', { class: 'row' }, h('label', null, 'Storm'), select));
        c.append(h('div', { class: 'row' }, A.ui.button('Replay', () => { st.t = 0; st.playing = true; }, 'play'), A.ui.button('Pause', () => { st.playing = !st.playing; }, 'pause')));
        c.append(read);
      });
      showStorm(start);
    },
    exit() { A.bus.off('frame', this._loop); A.globe.needAnimation(-1); this.group.dispose(); },
  };

  /* ---------------------------------------------------------- anatomy: size the storm glyph by wind speed */
  A.widgets.tcanatomy = {
    async enter() {
      const S = A.storms; await S.load();
      const st = { wind: 110, lat: 20 };
      const lon = -75;
      const g = A.globe;
      let glyph = S.makeGlyph(lon, st.lat, st.wind);
      this.group = { dispose() { glyph.dispose(); } };
      const read = A.ui.readout();
      const update = () => {
        glyph.set(lon, st.lat, st.wind);
        const eye = clamp(46 - st.wind * 0.18, 12, 42);
        clear(read);
        read.append(`Winds of ${st.wind} kt (${A.fmt.speed(st.wind * 0.514444, 0)}) make a ${A.catNames[A.stormCategory(st.wind)].toLowerCase()}. In this sketch the eye is about ${Math.round(eye * 2)} km across; strong storms tend to have smaller, tighter eyes. The bands spiral inwards anticlockwise in the Northern Hemisphere and clockwise in the Southern.`);
      };
      A.sceneCtl.show('Anatomy of a tropical cyclone', c => {
        c.append(A.ui.slider('Wind speed', { min: 35, max: 160, step: 5, value: st.wind, format: v => `${v} kt`, onInput: v => { st.wind = v; update(); } }).row);
        c.append(A.ui.slider('Latitude', { min: -30, max: 30, step: 1, value: st.lat, format: v => A.fmt.lat(v), onInput: v => { st.lat = v; glyph.set(lon, v, st.wind); update(); } }).row);
        c.append(read);
      });
      g.flyTo(lon, st.lat, 2.0, 1500);
      update();
    },
    exit() { this.group.dispose(); },
  };
});
