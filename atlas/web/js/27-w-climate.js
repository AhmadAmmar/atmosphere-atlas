/* ------------------------------------------------------------------ interactive scenes: energy balance and climate */
A.widgetFactories.push(() => {
  const SIGMA = 5.670374419e-8;
  const S0 = 1361;

  /** One-layer atmosphere in radiative balance: the surface temperature that makes outgoing heat equal absorbed sunlight. */
  const surfaceTemp = (sun, albedo, eps) => Math.pow(S0 * sun * (1 - albedo) / (4 * SIGMA * (1 - eps / 2)), 0.25);
  /** Bare-planet albedo goes up as ice spreads: 0.30 when warm, 0.62 when frozen, linear between 255 K and 275 K. */
  const iceAlbedo = (T, warm) => {
    const f = Math.min(1, Math.max(0, (T - 255) / 20));
    return 0.62 + (warm - 0.62) * f;
  };
  const solve = (sun, warm, eps, feedback, start) => {
    if (!feedback) return { T: surfaceTemp(sun, warm, eps), albedo: warm };
    let T = start;
    for (let i = 0; i < 400; i++) T = 0.5 * T + 0.5 * surfaceTemp(sun, iceAlbedo(T, warm), eps);
    return { T, albedo: iceAlbedo(T, warm) };
  };

  A.widgets.budget = {
    enter() {
      const st = { sun: 1, albedo: 0.30, eps: 0.78, feedback: false, start: 'warm' };
      const box = A.canvasBox(330, 230);
      const read = A.ui.readout();
      const K = 273.15;
      const draw = () => {
        const { ctx, w, h: hh } = box;
        const m = { l: 40, r: 12, t: 14, b: 32 };
        ctx.clearRect(0, 0, w, hh); ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        const xMin = 0.6; const xMax = 1.4; const yMin = -70; const yMax = 60;
        const X = f => m.l + (f - xMin) / (xMax - xMin) * (w - m.l - m.r);
        const Y = c => hh - m.b - (c - yMin) / (yMax - yMin) * (hh - m.t - m.b);
        ctx.strokeStyle = 'rgba(180,200,235,0.18)'; ctx.fillStyle = 'rgba(200,215,240,0.75)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
        for (let c = -60; c <= 60; c += 20) { ctx.beginPath(); ctx.moveTo(m.l, Y(c)); ctx.lineTo(w - m.r, Y(c)); ctx.stroke(); ctx.fillText(A.fmt.num(A.units.convert(c, 'degC')), m.l - 4, Y(c) + 3); }
        ctx.textAlign = 'center';
        for (let f = 0.6; f <= 1.401; f += 0.2) ctx.fillText(`${Math.round(f * 100)}%`, X(f), hh - 18);
        ctx.fillText('Sun’s brightness (today = 100%)', (m.l + w - m.r) / 2, hh - 5);
        ctx.save(); ctx.translate(10, (m.t + hh - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(A.units.label('degC'), 0, 0); ctx.restore();
        // freezing line
        ctx.strokeStyle = 'rgba(159,208,255,0.55)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(w - m.r, Y(0)); ctx.stroke(); ctx.setLineDash([]);
        const curve = (start, color) => {
          ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
          let pen = false;
          for (let f = xMin; f <= xMax + 1e-9; f += 0.005) {
            const T = solve(f, st.albedo, st.eps, st.feedback, start).T - K;
            const y = Math.min(yMax, Math.max(yMin, T));
            if (!pen) { ctx.moveTo(X(f), Y(y)); pen = true; } else ctx.lineTo(X(f), Y(y));
          }
          ctx.stroke();
        };
        if (st.feedback) { curve(220, '#8fc4ff'); curve(300, '#ffb35c'); } else curve(288, '#ffb35c');
        // today's Earth, as measured
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(1), Y(14.9), 3, 0, 2 * Math.PI); ctx.fill();
        ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Earth today', X(1) + 6, Y(14.9) - 6);
        // the current setting
        const now = solve(st.sun, st.albedo, st.eps, st.feedback, st.start === 'warm' ? 300 : 220);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X(st.sun), Y(Math.min(yMax, Math.max(yMin, now.T - K))), 6, 0, 2 * Math.PI); ctx.stroke();
        if (st.feedback) {
          ctx.fillStyle = '#ffb35c'; ctx.fillText('warm world', w - 98, 26);
          ctx.fillStyle = '#8fc4ff'; ctx.fillText('frozen world', w - 98, 40);
        }
        // numbers
        const bare = surfaceTemp(st.sun, now.albedo, 0) - K;
        const absorbed = S0 * st.sun * (1 - now.albedo) / 4;
        clear(read);
        read.append(h('b', null, `Surface temperature: ${A.fmt.temp(now.T - K)}`), h('br'),
          `Absorbed sunlight ${absorbed.toFixed(0)} W/m² (albedo ${now.albedo.toFixed(2)}). With no greenhouse gases at all, this planet would settle at ${A.fmt.temp(bare)}.`);
        if (st.feedback && Math.abs(now.albedo - 0.62) < 0.01) read.append(h('br'), 'The ice has taken over: the planet reflects most sunlight and stays frozen.');
        if (now.T - K > 100) read.append(h('br'), 'Oceans would boil away on a planet this hot.');
      };
      A.sceneCtl.show('Planet lab: what sets a world’s temperature?', c => {
        c.append(box.canvas);
        const sun = A.ui.slider('Sun’s brightness', { min: 60, max: 140, step: 1, value: 100, format: v => `${v}%`, onInput: v => { st.sun = v / 100; draw(); } });
        const alb = A.ui.slider('Surface and cloud brightness', { min: 5, max: 85, step: 1, value: 30, format: v => `${(v / 100).toFixed(2)}`, onInput: v => { st.albedo = v / 100; draw(); }, ariaLabel: 'Albedo' });
        const gh = A.ui.slider('Greenhouse strength', { min: 0, max: 95, step: 1, value: 78, format: v => `${v}%`, onInput: v => { st.eps = v / 100; draw(); } });
        const fb = h('label', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center', minWidth: 0 } }, h('input', { type: 'checkbox', onchange: e => { st.feedback = e.target.checked; startRow.style.display = st.feedback ? '' : 'none'; draw(); } }), 'Let ice and snow spread when it gets cold');
        const startRow = A.ui.buttons('Starting from', [['warm', 'Warm world'], ['cold', 'Frozen world']], v => { st.start = v; draw(); }, 'warm').row;
        startRow.style.display = 'none';
        c.append(sun.row, alb.row, gh.row, h('div', { class: 'row' }, fb), startRow);
        c.append(A.ui.button('Back to today', () => { st.sun = 1; st.albedo = 0.30; st.eps = 0.78; sun.set(100); alb.set(30); gh.set(78); draw(); }, 'reset'));
        c.append(read);
        c.append(h('div', { class: 'readout' }, 'A planet with a single layer of air in balance: the heat it radiates equals the sunlight it absorbs. The curve shows the temperature for every brightness of the Sun. Switch on the ice option, set the Sun to about 85%, and compare the two starting points: the same Sun can give a warm planet or a frozen one. Real ice ages and the “snowball Earth” episodes of 700 million years ago work this way, though a real frozen Earth was much colder than this simple model shows.'));
      });
      draw();
    },
    exit() {},
  };

  /* ---------------------------------------------------------- orbit laboratory: the Milankovitch cycles */
  const ORBIT = { eps: 23.44, e: 0.0167, varpi: 282.94 };                 // today: tilt, eccentricity, longitude of perihelion from the March equinox
  /** Time (days after the March equinox) at which the Sun reaches true longitude lam (degrees), by Kepler's equation. */
  const orbitDay = (lam, e, varpi) => {
    const M = nu => { const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2)); return E - e * Math.sin(E); };
    const nu0 = (0 - varpi) * DEG; const nu = (lam - varpi) * DEG;
    let dM = M(nu) - M(nu0);
    dM = mod(dM, TAU);
    return dM / TAU * 365.2422;
  };
  /** Daily-mean sunlight at the top of the atmosphere (W/m2) at latitude lat for solar longitude lam (degrees). */
  const orbitInsolation = (lat, lam, eps, e, varpi) => {
    const dec = Math.asin(Math.sin(eps * DEG) * Math.sin(lam * DEG));
    const phi = lat * DEG;
    const x = -Math.tan(phi) * Math.tan(dec);
    const h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
    const rho = Math.pow((1 + e * Math.cos((lam - varpi) * DEG)) / (1 - e * e), 2);
    return 1361 / Math.PI * rho * (h0 * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(h0));
  };
  const orbitCurve = (lat, eps, e, varpi) => {
    const pts = [];
    for (let lam = 0; lam < 360; lam += 1) pts.push([79 + orbitDay(lam, e, varpi), orbitInsolation(lat, lam + 0.5, eps, e, varpi)]);
    return pts.map(([d, q]) => [mod(d, 365.2422), q]).sort((a, b) => a[0] - b[0]);
  };
  A.orbit = { today: ORBIT, day: orbitDay, insolation: orbitInsolation };
  const dayName = d => { const i = Math.floor(mod(d, 365)); let m = 0; while (m < 11 && CUM_DAYS[m + 1] <= i) m++; return `${i - CUM_DAYS[m] + 1} ${MONTHS3[m]}`; };

  A.widgets.orbit = {
    enter() {
      const st = { lat: 65, eps: ORBIT.eps, e: ORBIT.e, varpi: ORBIT.varpi };
      const box = A.canvasBox(330, 210);
      const read = A.ui.readout();
      const draw = () => {
        const { ctx, w, h: hh } = box;
        const m = { l: 42, r: 10, t: 12, b: 28 };
        ctx.clearRect(0, 0, w, hh); ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        const now = orbitCurve(st.lat, ORBIT.eps, ORBIT.e, ORBIT.varpi);
        const cur = orbitCurve(st.lat, st.eps, st.e, st.varpi);
        const all = now.concat(cur).map(p => p[1]);
        const hi = Math.max(100, Math.ceil(Math.max(...all) / 50) * 50); const lo = 0;
        const X = d => m.l + d / 365 * (w - m.l - m.r);
        const Y = q => hh - m.b - (q - lo) / (hi - lo) * (hh - m.t - m.b);
        ctx.strokeStyle = 'rgba(180,200,235,0.18)'; ctx.fillStyle = 'rgba(200,215,240,0.75)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
        for (let q = 0; q <= hi; q += 100) { ctx.beginPath(); ctx.moveTo(m.l, Y(q)); ctx.lineTo(w - m.r, Y(q)); ctx.stroke(); ctx.fillText(String(q), m.l - 4, Y(q) + 3); }
        ctx.textAlign = 'center';
        for (let i = 0; i < 12; i += 1) ctx.fillText(MONTHS3[i][0], X(CUM_DAYS[i] + 15), hh - 14);
        ctx.fillText('W/m\u00b2 of sunlight at the top of the atmosphere', (m.l + w - m.r) / 2, hh - 2);
        const line = (pts, color, wd, dash) => { ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach(([d, q], i) => (i ? ctx.lineTo(X(d), Y(q)) : ctx.moveTo(X(d), Y(q)))); ctx.stroke(); ctx.setLineDash([]); };
        line(now, 'rgba(200,215,240,0.8)', 1.6, [4, 3]);
        line(cur, '#ffb35c', 2.4);
        ctx.textAlign = 'left'; ctx.fillStyle = '#ffb35c'; ctx.fillText('this orbit', m.l + 8, m.t + 10); ctx.fillStyle = 'rgba(200,215,240,0.9)'; ctx.fillText('today (dashed)', m.l + 8, m.t + 23);
        const jun = orbitInsolation(st.lat, 90, st.eps, st.e, st.varpi); const junNow = orbitInsolation(st.lat, 90, ORBIT.eps, ORBIT.e, ORBIT.varpi);
        // annual mean over the year (time-weighted)
        const mean = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; let dd = b[0] - a[0]; if (dd < 0) dd += 365.2422; s += 0.5 * (a[1] + b[1]) * dd; } return s / 365.2422; };
        const peri = 79 + orbitDay(st.varpi, st.e, st.varpi);
        clear(read);
        read.append(h('b', null, `Sunlight at ${A.fmt.lat(st.lat)} on the June solstice: ${Math.round(jun)} W/m\u00b2`), ` (${jun - junNow >= 0 ? '+' : '\u2212'}${Math.abs(jun - junNow).toFixed(0)} compared with today, ${(100 * (jun - junNow) / junNow).toFixed(1).replace('-', '−')}%).`,
          h('br'), `Over the whole year the average is ${Math.round(mean(cur))} W/m\u00b2 (today ${Math.round(mean(now))}). Closest to the Sun (perihelion): about ${dayName(peri)}.`);
      };
      const eps = A.ui.slider('Tilt of the axis', { min: 22.1, max: 24.5, step: 0.05, value: st.eps, format: v => `${v.toFixed(2)}\u00b0`, onInput: v => { st.eps = v; draw(); } });
      const ecc = A.ui.slider('Orbit shape (eccentricity)', { min: 0, max: 0.06, step: 0.001, value: st.e, format: v => v.toFixed(3), onInput: v => { st.e = v; draw(); }, ariaLabel: 'Eccentricity' });
      const prec = A.ui.slider('Precession (longitude of perihelion)', { min: 0, max: 360, step: 1, value: st.varpi, format: v => `${v}\u00b0`, onInput: v => { st.varpi = v; draw(); } });
      const lat = A.ui.slider('Latitude', { min: -90, max: 90, step: 1, value: st.lat, format: v => A.fmt.lat(v), onInput: v => { st.lat = v; draw(); } });
      const set = (e1, e2, e3) => { st.eps = e1; st.e = e2; st.varpi = e3; eps.set(e1); ecc.set(e2); prec.set(e3); draw(); };
      A.sceneCtl.show('Orbit laboratory: what drives the ice ages', c => {
        c.append(box.canvas, eps.row, ecc.row, prec.row, lat.row);
        c.append(h('div', { class: 'row' },
          A.ui.button('Today', () => set(ORBIT.eps, ORBIT.e, ORBIT.varpi), 'reset'),
          A.ui.button('Warm northern summers', () => set(24.2, 0.05, 90), 'sun'),
          A.ui.button('Cool northern summers', () => set(22.3, 0.05, 270), 'moon')));
        c.append(read);
        c.append(h('div', { class: 'readout' }, 'The three slow wobbles of the Earth\u2019s orbit change how sunlight is spread over the seasons and latitudes, even though the total over the whole planet hardly changes. Tilt (22.1\u00b0 to 24.5\u00b0, a cycle of 41,000 years) controls how different the seasons are. Orbit shape (eccentricity, cycles of about 100,000 and 400,000 years) controls how far the Earth swings from the Sun. Precession (cycles of about 19,000 to 23,000 years) decides in which season the Earth is nearest the Sun: 90\u00b0 is a perihelion in northern summer, 270\u00b0 in northern winter. Cool summers at high northern latitudes let winter snow survive, and the ice sheets grow.'));
      });
      draw();
    },
    exit() {},
  };
});
