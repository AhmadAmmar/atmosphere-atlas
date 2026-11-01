/* ------------------------------------------------------------------ Practical 3, part 2: pressure surfaces and geostrophic balance */
A.widgetFactories.push(() => {
  const P = A.p3; const C = P.C;
  const RD = 287.05; const G = GRAV;
  const f1 = (v, d = 1) => P.fmt(v, d);

  /* ---------------------------------------------------------- Figures 1 and 2: Saskatoon and Monterrey */
  const SK = { name: 'Saskatoon', lat: 52.13, lon: -106.67, L: [[850, 1360, -1], [500, 5400, -25], [300, 8700, -47]] };
  const MT = { name: 'Monterrey', lat: 25.67, lon: -100.31, L: [[850, 1500, 15], [500, 5700, -12], [300, 9500, -38]] };
  const DIST = P.km(SK, MT);                                                  // km between the two stations
  const FMEAN = 2 * OMEGA * Math.sin((SK.lat + MT.lat) / 2 * DEG);
  /** Pressure (hPa) at height z (m) in a column: 1013 hPa at the ground, log-linear between the reported levels, an isothermal layer above the top one. */
  const pAt = (col, z) => {
    const pts = [[1013, 0], ...col.L.map(([p, zz]) => [p, zz])];
    if (z >= pts[pts.length - 1][1]) { const [p, zz] = pts[pts.length - 1]; const T = col.L[col.L.length - 1][2] + 273.15; return p * Math.exp(-(z - zz) * G / (RD * T)); }
    for (let i = 0; i < pts.length - 1; i++) {
      const [pa, za] = pts[i]; const [pb, zb] = pts[i + 1];
      if (z >= za && z <= zb) return Math.exp(Math.log(pa) + (Math.log(pb) - Math.log(pa)) * (z - za) / (zb - za));
    }
    return 1013;
  };
  const vg = (dz, dn = DIST * 1000, f = FMEAN) => G * dz / (f * dn);

  A.widgets.p3slope = {
    enter() {
      const st = this.st = { tab: 'work', step: 0, TS: -25, TM: 0 };
      const host = h('div'); const read = h('div', { class: 'readout' }); const ctl = h('div');
      const W = 640; const Hh = 440; const yz = z => 392 - z / 10000 * 350; const xS = 240; const xM = 410;
      const COL = { 850: C.orange, 500: C.green, 300: C.purple };
      const STEPS = [
        'Figure 1 gives the height and the temperature of three pressure levels over two places. The 850 mb example is drawn for you: a line joining 1360 m over Saskatoon to 1500 m over Monterrey.',
        'Question 1, first part: plot the 500 mb heights, 5400 m and 5700 m, and join them. Label the line 500 mb. Over the colder place the pressure surface sits lower.',
        'Question 1, second part: plot 300 mb at 8700 m and 9500 m, and join them. The higher you go, the steeper the slope becomes.',
        'Questions 2 and 3: in the cold column pressure falls with height most quickly. Cold air is dense, so a column of it is thinner: it takes fewer metres to use up the same amount of pressure. Saskatoon is colder at every level.',
        'Question 4: at 9000 m point x (over Saskatoon) is above the 300 mb line, so its pressure is lower than 300 mb; point z (over Monterrey) is below it, so its pressure is higher. Mark L over Saskatoon and H over Monterrey. The pressure gradient force points from high to low pressure: towards Saskatoon.',
        'Question 5: compare the two heights. At 1500 m the pressure surfaces differ by about 140 m; at 9000 m by about 800 m. The pressure difference between the two places is bigger at 9000 m, so the pressure gradient is greater up high.',
        `Question 6: the geostrophic wind is proportional to the gradient, so the wind should be stronger at 9000 m. The estimates below use the slope of each pressure surface over the ${Math.round(DIST / 10) * 10} km between the two places.`,
      ];
      const draw = () => {
        clear(host); clear(read);
        const svg = P.svg(W, Hh, { label: 'Pressure surfaces over Saskatoon and Monterrey' });
        // axes
        const HALO = 'rgba(10,14,22,0.9)';
        for (let z = 0; z <= 10000; z += 1000) { P.line(svg, 56, yz(z), W - 56, yz(z), { color: z % 5000 ? C.faint : C.grid, width: 1 }); P.txt(svg, 50, yz(z) + 4, String(z), { size: 10.5, anchor: 'end', fill: C.ink3 }); P.txt(svg, W - 50, yz(z) + 4, String(z), { size: 10.5, fill: C.ink3 }); }
        P.txt(svg, 8, 20, 'Height (m)', { size: 11, fill: C.ink3 });
        for (const [x, nm] of [[xS, SK.name], [xM, MT.name]]) {
          P.line(svg, x, yz(0), x, yz(10000), { color: C.ink3, width: 1.3, dash: '2 5' });
          P.txt(svg, x, yz(0) + 18, '1013 mb', { size: 11.5, anchor: 'middle', fill: C.ink2 }); P.txt(svg, x, yz(0) + 34, nm, { size: 13, weight: 700, anchor: 'middle' });
        }
        const lines = [[850, 0], [500, 1], [300, 2]];
        for (const [lev, i] of lines) {
          if (lev === 500 && st.step < 1) continue; if (lev === 300 && st.step < 2) continue;
          const a = SK.L[i]; const b = MT.L[i];
          P.line(svg, xS, yz(a[1]), xM, yz(b[1]), { color: COL[lev], width: 3 });
          P.circle(svg, xS, yz(a[1]), 5, { fill: COL[lev] }); P.circle(svg, xM, yz(b[1]), 5, { fill: COL[lev] });
          P.txt(svg, xS - 12, yz(a[1]) + 4, `${a[1]} m  ${a[2] < 0 ? '−' : ''}${Math.abs(a[2])} °C`, { size: 11.5, weight: 600, anchor: 'end', fill: COL[lev], stroke: HALO });
          P.txt(svg, xM + 12, yz(b[1]) + 4, `${b[1]} m  ${b[2] < 0 ? '−' : ''}${Math.abs(b[2])} °C`, { size: 11.5, weight: 600, fill: COL[lev], stroke: HALO });
          P.txt(svg, (xS + xM) / 2, (yz(a[1]) + yz(b[1])) / 2 - 9, `${lev} mb`, { size: 12.5, weight: 700, anchor: 'middle', fill: COL[lev], stroke: HALO });
        }
        if (st.step >= 3) {
          // thickness of the whole layer, 850 to 300 mb
          const tS = SK.L[2][1] - SK.L[0][1]; const tM = MT.L[2][1] - MT.L[0][1];
          const br = (x, y0, y1, col, text, side) => {
            P.line(svg, x, y0, x, y1, { color: col, width: 2 }); P.line(svg, x - 5, y0, x + 5, y0, { color: col, width: 2 }); P.line(svg, x - 5, y1, x + 5, y1, { color: col, width: 2 });
            P.txt(svg, x + side * 11, (y0 + y1) / 2, text, { size: 11, anchor: 'middle', fill: col, rotate: side * -90, stroke: HALO });
          };
          br(96, yz(SK.L[0][1]), yz(SK.L[2][1]), C.blue, `850 to 300 mb: ${tS} m`, -1);
          br(W - 96, yz(MT.L[0][1]), yz(MT.L[2][1]), C.red, `850 to 300 mb: ${tM} m`, 1);
          P.txt(svg, xS, 24, 'colder: thinner column', { size: 12, weight: 700, anchor: 'middle', fill: C.blue }); P.txt(svg, xM, 24, 'warmer: thicker column', { size: 12, weight: 700, anchor: 'middle', fill: C.red });
        }
        if (st.step >= 4) {
          const zy = yz(9000); const pS = pAt(SK, 9000); const pM = pAt(MT, 9000);
          P.line(svg, 74, zy, W - 74, zy, { color: C.ink2, width: 1.2, dash: '6 4' });
          for (const [x, t] of [[xS, 'x'], [xM, 'z']]) { P.circle(svg, x, zy, 10, { fill: C.ink, stroke: '#101010', width: 1.5 }); P.txt(svg, x, zy + 5, t, { size: 14, weight: 800, anchor: 'middle', fill: '#101010' }); }
          P.txt(svg, 64, zy + 9, 'L', { size: 28, weight: 800, anchor: 'middle', fill: C.red, stroke: HALO }); P.txt(svg, W - 64, zy + 9, 'H', { size: 28, weight: 800, anchor: 'middle', fill: C.blue, stroke: HALO });
          P.txt(svg, xS, zy + 27, `≈ ${f1(pS, 0)} mb`, { size: 11.5, anchor: 'middle', fill: C.ink, stroke: HALO }); P.txt(svg, xM, zy + 27, `≈ ${f1(pM, 0)} mb`, { size: 11.5, anchor: 'middle', fill: C.ink, stroke: HALO });
          P.arrow(svg, xM - 14, zy + 44, xM - 14 - (pM - pS) * 4.4, zy + 44, { color: C.red, width: 3.2, head: 12 });
          P.txt(svg, (xS + xM) / 2 - 8, zy + 62, 'pressure gradient force', { size: 11.5, weight: 700, anchor: 'middle', fill: C.red, stroke: HALO });
          if (st.step >= 5) P.txt(svg, (xS + xM) / 2 - 8, zy + 77, `about ${f1(pM - pS, 0)} mb difference at 9000 m`, { size: 11, weight: 600, anchor: 'middle', fill: C.red, stroke: HALO });
        }
        if (st.step >= 5) {
          const zy = yz(1500); const pS = pAt(SK, 1500); const pM = pAt(MT, 1500);
          P.line(svg, xS, zy, xM, zy, { color: C.ink2, width: 1, dash: '6 4' });
          P.arrow(svg, xM - 14, zy + 24, xM - 14 - (pM - pS) * 4.4, zy + 24, { color: C.red, width: 3.2, head: 12 });
          P.txt(svg, (xS + xM) / 2 + 20, zy + 44, `about ${f1(pM - pS, 0)} mb difference at 1500 m`, { size: 11, weight: 600, anchor: 'middle', fill: C.red, stroke: HALO });
        }
        host.append(svg);
        read.append(P.lead(STEPS[st.step], st.step));
        if (st.step === 3) {
          const hyp = col => { const l = col.L; let z = 0; for (let i = 0; i < l.length - 1; i++) z += RD / G * ((l[i][2] + l[i + 1][2]) / 2 + 273.15) * Math.log(l[i][0] / l[i + 1][0]); return z; };
          read.append(h('div', { style: { marginTop: '6px' } }, `Check with the hypsometric equation (thickness = R·T̄/g · ln(p₁/p₂)): the mean temperatures of the three levels predict ${f1(hyp(SK), 0)} m for Saskatoon and ${f1(hyp(MT), 0)} m for Monterrey between 850 and 300 mb, against 7340 m and 8000 m on the figure. Close, because the figure’s numbers are rounded.`));
        }
        if (st.step === 6) {
          const rows = [[850, 0], [500, 1], [300, 2]].map(([lev, i]) => { const dz = MT.L[i][1] - SK.L[i][1]; return [lev, dz, vg(dz)]; });
          const tiles = h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' } }, rows.map(([lev, dz, v]) => h('div', { style: { flex: '1 1 150px', border: `1px solid ${COL[lev]}`, borderRadius: '8px', padding: '6px 9px' } },
            h('b', { style: { color: COL[lev] } }, `${lev} mb`), h('div', null, `slope ${dz} m over ${Math.round(DIST).toLocaleString('en-GB')} km`), h('div', null, h('b', null, `wind ≈ ${f1(v, 0)} m/s`), ` (${f1(v * 1.944, 0)} kt)`))));
          read.append(tiles, h('div', { style: { marginTop: '6px' } }, `Geostrophic wind = (g ÷ f) × (height difference ÷ distance), with f = ${(FMEAN * 1e5).toFixed(2)} × 10⁻⁵ s⁻¹ at the mid-latitude of the two places. The figure’s numbers are a teaching example, so real winds differ, but the lesson is exact: the wind speeds up with height.`));
        }
      };
      /* what-if: build two columns from their temperatures */
      const drawExp = () => {
        clear(host); clear(read);
        const levels = [850, 700, 500, 300, 200];
        const z = (T, p) => RD * (T + 273.15) / G * Math.log(1013 / p);
        const Wd = 640; const H2 = 380; const ys = zz => 340 - zz / 13000 * 310;
        const svg = P.svg(Wd, H2, { label: 'Pressure surfaces over a cold and a warm column' });
        for (let zz = 0; zz <= 12000; zz += 2000) { P.line(svg, 60, ys(zz), Wd - 60, ys(zz), { color: C.grid, width: 1 }); P.txt(svg, 52, ys(zz) + 4, String(zz), { size: 10.5, anchor: 'end', fill: C.ink3 }); }
        const xa = 220; const xb = 430;
        for (const x of [xa, xb]) P.line(svg, x, ys(0), x, ys(13000), { color: C.ink3, width: 1.2, dash: '2 5' });
        P.txt(svg, xa, ys(0) + 18, 'cold column', { size: 13, weight: 700, anchor: 'middle', fill: C.blue }); P.txt(svg, xa, ys(0) + 33, `mean ${st.TS} °C`, { size: 11.5, anchor: 'middle', fill: C.ink2 });
        P.txt(svg, xb, ys(0) + 18, 'warm column', { size: 13, weight: 700, anchor: 'middle', fill: C.red }); P.txt(svg, xb, ys(0) + 33, `mean ${st.TM} °C`, { size: 11.5, anchor: 'middle', fill: C.ink2 });
        const rows = [];
        for (const p of levels) {
          const a = z(st.TS, p); const b = z(st.TM, p);
          P.line(svg, xa, ys(a), xb, ys(b), { color: C.yellow, width: 2.4 });
          P.circle(svg, xa, ys(a), 3.8, { fill: C.yellow }); P.circle(svg, xb, ys(b), 3.8, { fill: C.yellow });
          P.txt(svg, xa - 10, ys(a) + 4, `${p} mb: ${Math.round(a)} m`, { size: 11, anchor: 'end', fill: C.ink2 }); P.txt(svg, xb + 10, ys(b) + 4, `${Math.round(b)} m`, { size: 11, fill: C.ink2 });
          rows.push([p, b - a, vg(b - a, 2000e3, 2 * OMEGA * Math.sin(45 * DEG))]);
        }
        host.append(svg);
        read.append(h('b', null, 'Both columns start at 1013 mb at the ground. '), 'Each pressure surface sits at a height set by the mean temperature of the air beneath it: the warm column is thicker. ',
          h('div', { style: { marginTop: '6px' } }, rows.map(([p, dz, v]) => h('div', null, `${p} mb: surface slope ${Math.round(dz)} m, wind ≈ ${f1(Math.abs(v), 0)} m/s`))),
          h('div', { style: { marginTop: '6px' } }, 'Winds are for two columns 2,000 km apart at 45° latitude. Set the two temperatures equal and every surface goes flat: no horizontal pressure gradient, no wind. The bigger the temperature contrast, the faster the winds, and they grow with height.'));
      };
      const rebuild = () => {
        clear(ctl);
        ctl.append(h('div', { class: 'row' }, P.seg([['work', 'The exercise, step by step'], ['exp', 'Experiment: change the temperatures']], st.tab, v => { st.tab = v; rebuild(); })));
        if (st.tab === 'work') {
          ctl.append(h('div', { class: 'row' }, A.ui.button('Back', () => { st.step = Math.max(0, st.step - 1); draw(); }), A.ui.button('Next step', () => { st.step = Math.min(6, st.step + 1); draw(); }, 'play'), A.ui.button('Reset', () => { st.step = 0; draw(); }, 'reset')));
          draw();
        } else {
          ctl.append(A.ui.slider('Cold column', { min: -50, max: 20, step: 1, value: st.TS, format: v => `${v} °C`, onInput: v => { st.TS = v; drawExp(); } }).row,
            A.ui.slider('Warm column', { min: -50, max: 20, step: 1, value: st.TM, format: v => `${v} °C`, onInput: v => { st.TM = v; drawExp(); } }).row);
          drawExp();
        }
      };
      P.open('Pressure surfaces: why the wind is stronger up high', c => { c.append(P.cols(host, h('div', null, ctl, read))); });
      rebuild();
      A.globe.labels.add({ id: 'p3s1', group: 'scene', text: 'Saskatoon', lon: SK.lon, lat: SK.lat, cls: 'note pin', priority: 100, nocollide: true });
      A.globe.labels.add({ id: 'p3s2', group: 'scene', text: 'Monterrey', lon: MT.lon, lat: MT.lat, cls: 'note pin', priority: 99, nocollide: true });
    },
    exit() { P.close(); },
  };

  /* ---------------------------------------------------------- Figures 3 and 4: how the geostrophic wind comes about */
  A.widgets.p3geo = {
    enter() {
      const st = this.st = { hemi: 'N', lat: 45, dn: 500, dz: 60, drag: 'some', tau: 0, playing: false };
      const host = h('div'); const read = h('div', { class: 'readout' });
      const W = 600; const Hh = 380; const yTop = 84; const yBot = 330; const TMAX = 8;
      const params = () => {
        const f = 2 * OMEGA * Math.sin(st.lat * DEG) * (st.hemi === 'N' ? 1 : -1);
        const Pg = G * st.dz / (st.dn * 1000);                              // size of the pressure gradient force, m/s^2
        const gamma = st.drag === 'some' ? 0.6 : 0;
        return { f, Pg, gamma, Vg: Pg / Math.abs(f) };
      };
      /** Integrate the motion of an air parcel released at rest (dimensionless time tau = |f| t). */
      const run = () => {
        const { f, Pg, gamma } = params();
        const Py = st.hemi === 'N' ? Pg : -Pg;                                // the low is at the top in the north, at the bottom in the south
        const af = Math.abs(f); const s = Math.sign(f);
        const dt = 0.02; const n = Math.round(TMAX / dt);
        const out = []; let u = 0; let v = 0; let x = 0; let y = 0;
        for (let i = 0; i <= n; i++) {
          out.push({ tau: i * dt, x, y, u, v });
          const r = gamma * af;
          const du = f * v - r * u; const dv = Py - f * u - r * v;
          const k = dt / af;
          u += du * k; v += dv * k; x += u * k; y += v * k;
        }
        return out;
      };
      let path = run();
      const draw = () => {
        clear(host); clear(read);
        const { f, Pg, Vg, gamma } = params();
        const N = st.hemi === 'N';
        const svg = P.svg(W, Hh, { label: 'A parcel of air released between two height lines of the 500 mb surface' });
        // the two height lines: the low-pressure side is the line with the lower height
        const hLow = N ? 5460 : 5580; const hHigh = N ? 5520 : 5640;
        const yLow = N ? yTop : yBot; const yHigh = N ? yBot : yTop;
        for (const [y, hh, lab, col] of [[yLow, hLow, 'L', C.red], [yHigh, hHigh, 'H', C.blue]]) {
          P.line(svg, 40, y, W - 90, y, { color: C.ink2, width: 1.8 });
          P.txt(svg, W - 84, y + 5, `${hh} m`, { size: 13, weight: 600 });
          P.rect(svg, W - 36, y - 14, 28, 28, { rx: 3, fill: 'rgba(255,255,255,0.05)', stroke: col, width: 1.8 }); P.txt(svg, W - 22, y + 7, lab, { size: 19, weight: 800, anchor: 'middle', fill: col });
        }
        P.txt(svg, 40, 24, `500 mb height lines, ${st.dz} m apart (${N ? 'Northern' : 'Southern'} Hemisphere)`, { size: 12.5, weight: 700, fill: C.ink2 });
        // map the path to pixels: start on the high-pressure side line
        const x0 = 90; const yStart = yHigh;                                  // the parcel starts on the high-pressure line
        const maxKm = Math.max(1, ...path.map(q => Math.abs(q.x) / 1000));
        const pxPerKm = Math.min((yBot - yTop) / st.dn, (W - 150 - x0) / maxKm);   // shrinks the picture a little when the wind is strong
        const idx = clamp(Math.round(st.tau / 0.02), 0, path.length - 1);
        const X = i => x0 + path[i].x / 1000 * pxPerKm; const Y = i => yStart - path[i].y / 1000 * pxPerKm;   // north is up the screen
        let d = ''; for (let i = 0; i <= idx; i += 2) d += `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(i).toFixed(1)}`;
        P.path(svg, d, { stroke: C.yellow, width: 2.6 });
        // the four numbered stages of the figure
        const stageTau = gamma > 0 ? [0, 1.0, 2.2, 7.4] : [0, 1.6, 3.14, 4.7];
        stageTau.forEach((t, k) => {
          const i = Math.min(path.length - 1, Math.round(t / 0.02));
          if (i > idx + 1) return;
          P.circle(svg, X(i), Y(i), 11, { fill: 'rgba(10,14,22,0.85)', stroke: C.yellow, width: 1.4 });
          P.txt(svg, X(i), Y(i) + 4.5, String(k + 1), { size: 12.5, weight: 800, anchor: 'middle', fill: C.yellow });
        });
        // the parcel, with its forces
        const cx = X(idx); const cy = Y(idx); const cur = path[idx];
        P.rect(svg, cx - 8, cy - 8, 16, 16, { fill: 'rgba(255,255,255,0.1)', stroke: C.ink, width: 1.8 });
        const Py = N ? Pg : -Pg;
        const kscale = 105 / Math.max(Pg, 1e-9);                              // pressure force = 105 px
        const pfx = 0; const pfy = -Py * kscale;                              // screen y is down
        const cxf = f * cur.v * kscale; const cyf = -(-f * cur.u) * kscale;   // Coriolis (f v, -f u)
        P.arrow(svg, cx, cy, cx + pfx, cy + pfy, { color: C.red, width: 3, head: 11 });
        if (Math.hypot(cxf, cyf) > 3) P.arrow(svg, cx, cy, cx + cxf, cy + cyf, { color: C.blue, width: 3, head: 11 });
        const vs = 90 / Math.max(Vg, 1e-9);
        if (Math.hypot(cur.u, cur.v) > 0.05 * Vg) P.arrow(svg, cx, cy, cx + cur.u * vs * 0.9, cy - cur.v * vs * 0.9, { color: C.ink, width: 3.4, head: 12 });
        P.txt(svg, cx + 10, cy + pfy / 2, 'pressure gradient force', { size: 11.5, weight: 700, fill: C.red, stroke: 'rgba(10,14,22,0.85)' });
        // key
        const ky = 52;
        P.line(svg, 40, ky, 66, ky, { color: C.red, width: 3 }); P.txt(svg, 72, ky + 4, 'pressure gradient force', { size: 11.5, fill: C.ink2 });
        P.line(svg, 220, ky, 246, ky, { color: C.blue, width: 3 }); P.txt(svg, 252, ky + 4, 'Coriolis force', { size: 11.5, fill: C.ink2 });
        P.line(svg, 350, ky, 376, ky, { color: C.ink, width: 3.4 }); P.txt(svg, 382, ky + 4, 'wind (velocity)', { size: 11.5, fill: C.ink2 });
        host.append(svg);
        const speed = Math.hypot(cur.u, cur.v);
        read.append(h('b', null, `${N ? 'Northern' : 'Southern'} Hemisphere, ${st.lat}° latitude. `),
          `f = ${(f * 1e5).toFixed(2)} × 10⁻⁵ s⁻¹; pressure gradient force = g × ${st.dz} m ÷ ${st.dn} km = ${(Pg * 1e3).toFixed(2)} × 10⁻³ m/s². `,
          h('div', { style: { marginTop: '6px' } }, `Now: ${f1(speed, 1)} m/s. The geostrophic wind, where the two forces balance, is Vg = g·Δz ÷ (f·Δn) = ${f1(Vg, 1)} m/s (${f1(Vg * 1.944, 0)} kt, ${f1(Vg * 3.6, 0)} km/h).`),
          h('div', { style: { marginTop: '6px' } }, N ? 'In the Northern Hemisphere the Coriolis force turns the moving air to the right, until it blows along the lines with low pressure on its left.' : 'In the Southern Hemisphere the Coriolis force turns the moving air to the left, until it blows along the lines with low pressure on its right.'));
      };
      let timer = null;
      const stop = () => { st.playing = false; if (timer) { cancelAnimationFrame(timer); timer = null; } };
      const play = () => {
        if (st.playing) { stop(); return; }
        st.playing = true; if (st.tau >= TMAX - 0.1) st.tau = 0;
        let last = performance.now();
        const tick = now => { if (!st.playing) return; st.tau = clamp(st.tau + Math.max(0, now - last) / 1000 * 0.9, 0, TMAX); last = now; slider.set(st.tau); draw(); if (st.tau >= TMAX) { st.playing = false; return; } timer = requestAnimationFrame(tick); };
        timer = requestAnimationFrame(tick);
      };
      const slider = A.ui.slider('Time since release', { min: 0, max: TMAX, step: 0.02, value: 0, format: v => `${(v / Math.abs(params().f) / 3600).toFixed(1)} h`, onInput: v => { st.tau = v; draw(); } });
      const controls = h('div');
      const rebuild = () => { path = run(); draw(); };
      const ctl = [
        h('div', { class: 'row' }, P.seg([['N', 'Northern Hemisphere (Figure 3)'], ['S', 'Southern Hemisphere (Figure 4)']], st.hemi, v => { st.hemi = v; st.tau = 0; slider.set(0); rebuild(); }),
          P.seg([['some', 'With some drag (settles)'], ['none', 'No friction at all']], st.drag, v => { st.drag = v; rebuild(); })),
        slider.row,
        h('div', { class: 'row' }, A.ui.button('Play the adjustment', play, 'play'), A.ui.button('Back to the start', () => { stop(); st.tau = 0; slider.set(0); draw(); }, 'reset')),
        A.ui.slider('Latitude', { min: 10, max: 80, step: 1, value: st.lat, format: v => `${v}°`, onInput: v => { st.lat = v; rebuild(); } }).row,
        A.ui.slider('Distance between the lines', { min: 200, max: 1500, step: 50, value: st.dn, format: v => `${v} km`, onInput: v => { st.dn = v; rebuild(); } }).row,
        A.ui.slider('Height difference', { min: 20, max: 200, step: 10, value: st.dz, format: v => `${v} m`, onInput: v => { st.dz = v; rebuild(); } }).row,
      ];
      controls.append(...ctl);
      P.open('Geostrophic balance: release the air and watch', c => { c.append(P.cols(host, h('div', null, controls, read))); });
      draw();
      this._stop = stop;
    },
    exit() { if (this._stop) this._stop(); P.close(); },
  };
});
