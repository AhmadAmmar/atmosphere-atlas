/* ------------------------------------------------------------------ Moisture and motion: shared physics and drawing helpers
   Humidity, geostrophic balance, friction and the station model, as used by the worked-solution laboratories. */
A.p3 = (() => {
  const P = {};

  /* ---------------------------------------------------------- colours used inside the floating windows */
  P.C = { ink: '#f3f3f1', ink2: '#c3c2b7', ink3: '#8f8d86', grid: 'rgba(255,255,255,0.13)', faint: 'rgba(255,255,255,0.06)',
    blue: '#5aa7ff', orange: '#ffb35c', red: '#ff6b5e', green: '#4fd18b', purple: '#b49bff', yellow: '#ffd37a', pink: '#ff8fc1', teal: '#4fd1c5' };

  /* ---------------------------------------------------------- humidity physics (the numbers of Table 1) */
  /** Table 1 was computed for a station pressure of about 995.5 hPa; the same is used here so every answer matches it. */
  P.PRESSURE = 995.5;
  P.es = T => 6.112 * Math.exp(17.67 * T / (T + 243.5));                    // saturation vapour pressure over water, hPa
  P.wsat = T => 622 * P.es(T) / (P.PRESSURE - P.es(T));                    // saturation mixing ratio, g/kg
  /** Saturation mixing ratio as in Table 1 where the temperature is in the table, from the formula elsewhere. */
  P.smr = T => { const row = P.TABLE1 && P.TABLE1.find(r => r[0] === T); return row ? (row[3] || row[2]) : P.wsat(T); };
  P.dewFromW = w => { const e = w * P.PRESSURE / (622 + w); const l = Math.log(e / 6.112); return 243.5 * l / (17.67 - l); };
  P.rhFromTd = (T, Td) => 100 * P.es(Td) / P.es(T);                         // temperatures in degC
  P.f2c = F => (F - 32) * 5 / 9;
  P.c2f = C => C * 9 / 5 + 32;
  P.codeToHpa = c => (c >= 500 ? 900 + c / 10 : 1000 + c / 10);             // station-model pressure code: leading 9 or 10 omitted
  P.kt2ms = kt => kt * 0.514444;

  /** Table 1 : [temperature degC, saturation vapour pressure mb, saturation mixing ratio g/kg].
      All mixing ratios follow the formula (0 degC and -8 degC); `fix` holds the value that does. */
  P.TABLE1 = [[-40, 0.189, 0.118], [-35, 0.314, 0.195], [-30, 0.519, 0.318], [-25, 0.807, 0.51], [-20, 1.254, 0.784], [-18, 1.488, 0.931],
    [-16, 1.76, 1.102], [-14, 2.076, 1.3], [-12, 2.441, 1.529], [-10, 2.863, 1.794], [-8, 3.348, 2.099, 2.099], [-6, 3.906, 2.45], [-4, 4.545, 2.852],
    [-2, 5.275, 3.313], [0, 6.108, 3.840, 3.84], [2, 7.055, 4.439], [4, 8.129, 5.12], [6, 9.347, 5.894], [8, 10.722, 6.771], [10, 12.272, 7.762],
    [12, 14.017, 8.882], [14, 15.977, 10.14], [16, 18.173, 11.56], [18, 20.63, 13.162], [20, 23.373, 14.956], [22, 26.43, 16.963], [24, 29.831, 19.21],
    [26, 33.608, 21.734], [28, 37.796, 24.557], [30, 42.43, 27.694], [32, 47.551, 31.213], [34, 53.2, 35.134], [36, 59.422, 39.502], [38, 66.264, 44.381],
    [40, 73.777, 49.815]];

  /* ---------------------------------------------------------- tiny SVG toolkit */
  P.svg = (w, hgt, extra = {}) => h('svg', { viewBox: `0 0 ${w} ${hgt}`, width: '100%', style: { display: 'block', maxWidth: `${w}px`, height: 'auto', ...(extra.style || {}) }, role: 'img', 'aria-label': extra.label || '', ...(extra.attrs || {}) });
  P.txt = (parent, x, y, str, o = {}) => {
    const e = h('text', { x, y, 'font-size': o.size || 12, 'font-weight': o.weight || 500, 'text-anchor': o.anchor || 'start', 'dominant-baseline': o.base || 'auto', 'font-style': o.italic ? 'italic' : null, 'pointer-events': 'none', transform: o.rotate ? `rotate(${o.rotate} ${x} ${y})` : null }, str);
    e.style.fill = o.fill || P.C.ink; e.style.fontFamily = 'inherit';
    if (o.stroke) { e.style.stroke = o.stroke; e.style.strokeWidth = o.strokeWidth || 3; e.style.paintOrder = 'stroke'; e.style.strokeLinejoin = 'round'; }
    parent.append(e); return e;
  };
  P.line = (parent, x1, y1, x2, y2, o = {}) => { const e = h('line', { x1, y1, x2, y2, stroke: o.color || P.C.ink, 'stroke-width': o.width || 1.5, 'stroke-dasharray': o.dash || null, 'stroke-linecap': o.cap || 'round', opacity: o.opacity }); parent.append(e); return e; };
  P.path = (parent, d, o = {}) => { const e = h('path', { d, fill: o.fill || 'none', stroke: o.stroke === undefined ? P.C.ink : o.stroke, 'stroke-width': o.width || 1.5, 'stroke-dasharray': o.dash || null, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: o.opacity }); parent.append(e); return e; };
  P.rect = (parent, x, y, w, hgt, o = {}) => { const e = h('rect', { x, y, width: w, height: hgt, rx: o.rx || 0, fill: o.fill || 'none', stroke: o.stroke || 'none', 'stroke-width': o.width || 1, opacity: o.opacity }); parent.append(e); return e; };
  P.circle = (parent, cx, cy, r, o = {}) => { const e = h('circle', { cx, cy, r, fill: o.fill || 'none', stroke: o.stroke || 'none', 'stroke-width': o.width || 1.5, opacity: o.opacity }); parent.append(e); return e; };
  /** An arrow from (x1, y1) to (x2, y2) with a filled head. */
  P.arrow = (parent, x1, y1, x2, y2, o = {}) => {
    const col = o.color || P.C.ink; const w = o.width || 2.4; const head = o.head || 9;
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return null;
    const ux = (x2 - x1) / L; const uy = (y2 - y1) / L;
    const g = h('g', { opacity: o.opacity });
    const bx = x2 - ux * head * 0.85; const by = y2 - uy * head * 0.85;
    g.append(h('line', { x1, y1, x2: bx, y2: by, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-dasharray': o.dash || null }));
    g.append(h('polygon', { points: `${x2},${y2} ${x2 - ux * head - uy * head * 0.42},${y2 - uy * head + ux * head * 0.42} ${x2 - ux * head + uy * head * 0.42},${y2 - uy * head - ux * head * 0.42}`, fill: col }));
    parent.append(g); return g;
  };
  /** A button row used by the laboratories (a segmented control that keeps its own state). */
  P.seg = (items, current, onPick) => {
    const seg = h('div', { class: 'seg', style: { flexWrap: 'wrap' } }, items.map(([id, text]) => h('button', { class: id === current ? 'on' : '', onclick: e => { $$('button', seg).forEach(b => b.classList.toggle('on', b === e.currentTarget)); onPick(id); } }, text)));
    return seg;
  };
  P.fmt = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d).replace('-', '−') : '–');

  /* ---------------------------------------------------------- wind barbs, in the standard convention */
  /** Staff pointing to where the wind comes FROM. Calm is a double circle, 1-2 kt a bare staff, 5 kt a half barb, 10 kt a full barb, 50 kt a pennant. */
  P.barb = (parent, x, y, fromDeg, kt, color, len = 34, hand = 1, calmR = 12) => {
    color = color || P.C.ink;
    const g = h('g', { transform: `translate(${x} ${y}) rotate(${fromDeg})`, stroke: color, 'stroke-width': 1.6, fill: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    if (kt < 1) { g.append(h('circle', { r: calmR, fill: 'none' })); parent.append(g); return g; }
    g.append(h('line', { x1: 0, y1: 0, x2: 0, y2: -len }));
    let k = kt < 3 ? 0 : Math.round(kt / 5) * 5; let pos = len; const bl = len * 0.36;
    while (k >= 50) { g.append(h('path', { d: `M0 ${-pos} L${hand * bl} ${-pos + 3} L0 ${-pos + len * 0.2} Z` })); pos -= len * 0.22; k -= 50; }
    while (k >= 10) { g.append(h('line', { x1: 0, y1: -pos, x2: hand * bl, y2: -pos - bl * 0.5 })); pos -= len * 0.15; k -= 10; }
    if (k >= 5) { if (pos === len) pos -= len * 0.15; g.append(h('line', { x1: 0, y1: -pos, x2: hand * bl / 2, y2: -pos - bl * 0.25 })); }
    parent.append(g); return g;
  };

  /* ---------------------------------------------------------- sky cover (the filled circle of the station model) */
  /** pct: 0, 10, 25, 40, 50, 60, 75, 90, 100 or 'x' for an obscured sky. The fill grows clockwise from twelve o'clock, as in the Appendix. */
  P.sky = (parent, cx, cy, r, pct, color) => {
    color = color || P.C.ink;
    const g = h('g');
    g.append(h('circle', { cx, cy, r, fill: 'rgba(10,14,22,0.9)', stroke: color, 'stroke-width': 1.7 }));
    const wedge = frac => {
      if (frac >= 0.999) return h('circle', { cx, cy, r, fill: color });
      const a = frac * TAU; const x = cx + r * Math.sin(a); const y = cy - r * Math.cos(a);
      return h('path', { d: `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x} ${y} Z`, fill: color });
    };
    const cross = (col = color) => { g.append(h('line', { x1: cx - r, y1: cy, x2: cx + r, y2: cy, stroke: col, 'stroke-width': 1.3 }), h('line', { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: col, 'stroke-width': 1.3 })); };
    if (pct === 'x') { g.append(h('line', { x1: cx - r * 0.7, y1: cy - r * 0.7, x2: cx + r * 0.7, y2: cy + r * 0.7, stroke: color, 'stroke-width': 1.5 }), h('line', { x1: cx + r * 0.7, y1: cy - r * 0.7, x2: cx - r * 0.7, y2: cy + r * 0.7, stroke: color, 'stroke-width': 1.5 })); }
    else if (pct >= 100) g.append(wedge(1));
    else if (pct >= 90) { g.append(wedge(1), h('line', { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: 'rgba(10,14,22,0.95)', 'stroke-width': 1.6 })); }
    else if (pct >= 75) g.append(wedge(0.75));
    else if (pct >= 60) { g.append(wedge(0.5)); cross(); }
    else if (pct >= 50) g.append(wedge(0.5));
    else if (pct >= 40) { g.append(wedge(0.25)); cross(); }
    else if (pct >= 25) g.append(wedge(0.25));
    else if (pct >= 10) g.append(h('line', { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: color, 'stroke-width': 1.5 }));
    parent.append(g); return g;
  };
  /** The words for a cover figure, as in the Appendix. */
  P.skyWords = pct => ({ 0: 'no clouds', 10: 'one-tenth or less', 25: 'two to three tenths', 40: 'four-tenths', 50: 'five-tenths', 60: 'six-tenths', 75: 'seven to eight tenths', 90: 'nine-tenths (overcast with openings)', 100: 'completely overcast', x: 'sky obscured' }[pct]);

  /* ---------------------------------------------------------- present weather symbols (the ones used in the practical) */
  P.WEATHER = { 'rain-int': 'Intermittent rain', 'rain-cont': 'Continuous rain', 'snow-cont': 'Continuous snow', 'drizzle-cont': 'Continuous drizzle', fog: 'Fog', thunder: 'Thunder heard', 'thunder-rain': 'Thunder with intermittent rain' };
  P.wx = (parent, x, y, kind, s = 1, color) => {
    color = color || P.C.ink;
    const g = h('g', { transform: `translate(${x} ${y}) scale(${s})`, fill: color, stroke: color, 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const dot = (cx, cy, r = 2.6) => g.append(h('circle', { cx, cy, r, stroke: 'none' }));
    if (kind === 'rain-int') dot(0, 0);
    else if (kind === 'rain-cont') { dot(-4.2, 0); dot(4.2, 0); }
    else if (kind === 'snow-cont') {
      for (const cx of [-5, 5]) g.append(h('path', { d: `M${cx - 3.2} 0 H${cx + 3.2} M${cx - 1.6} -2.8 L${cx + 1.6} 2.8 M${cx + 1.6} -2.8 L${cx - 1.6} 2.8`, fill: 'none' }));
    } else if (kind === 'drizzle-cont') {
      for (const cx of [-4, 4]) { g.append(h('circle', { cx, cy: -1.5, r: 1.9, stroke: 'none' }), h('path', { d: `M${cx + 1.5} -0.6 Q${cx + 1.5} 3.2 ${cx - 1.8} 4.6`, fill: 'none' })); }
    } else if (kind === 'fog') g.append(h('path', { d: 'M-7 -4.5 H7 M-7 0 H7 M-7 4.5 H7', fill: 'none' }));
    else if (kind === 'thunder' || kind === 'thunder-rain') {
      g.append(h('path', { d: 'M-4 -8 V8 M-4 -8 H2 Q7 -8 7 -3.6 Q7 0.5 2 0.5 H-4 M1 0.5 L8 8', fill: 'none' }), h('polygon', { points: '9,9.5 4.6,8.3 7.8,4.8', stroke: 'none' }));
      if (kind === 'thunder-rain') dot(-1, -13, 2.4);
    }
    parent.append(g); return g;
  };

  /* ---------------------------------------------------------- pressure tendency glyphs (Appendix: Barometric Tendency) */
  P.TENDENCY = [
    ['Rising, then falling', [[-7, 4], [-1, -5], [2, -2], [7, 3]]],
    ['Rising, then steady', [[-7, 4], [-1, -4], [7, -4]]],
    ['Rising steadily, or unsteadily', [[-7, 5], [7, -5]]],
    ['Falling or steady, then rising', [[-7, -1], [-2, 4], [7, -5]]],
    ['Steady', [[-7, 0], [7, 0]]],
    ['Falling, then rising', [[-7, -5], [2, 4], [7, 0]]],
    ['Falling, then steady', [[-7, -5], [-1, 3], [7, 3]]],
    ['Falling steadily, or unsteadily', [[-7, -5], [7, 5]]],
    ['Steady or rising, then falling', [[-7, 2], [-1, -4], [3, -1], [7, 5]]],
  ];
  P.tend = (parent, x, y, code, s = 1, color) => {
    const pts = P.TENDENCY[code][1].map(([a, b]) => `${a * s + x},${b * s + y}`).join(' ');
    const e = h('polyline', { points: pts, fill: 'none', stroke: color || P.C.ink, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    parent.append(e); return e;
  };

  /* ---------------------------------------------------------- a whole station model */
  /** Draws a WMO station model at (x, y). st: {T, Td, p (code), sky, dir, kt, wx, tend (index), dp (3-hour change, tenths of hPa, signed), skipText}.
      Returns the group; the parts are tagged with data-part so a lesson can light them up. */
  P.model = (parent, st, x, y, o = {}) => {
    const s = o.s || 1; const col = o.color || P.C.ink; const fs = (o.fontSize || 12.5) * s;
    const g = h('g', { class: 'p3-model' });
    const part = (name, el) => { el.setAttribute('data-part', name); g.append(el); return el; };
    if (o.barbs !== false && st.kt !== undefined) { const bg = h('g'); P.barb(bg, x, y, st.dir || 0, st.kt, col, 40 * s, 1, 12.5 * s); part('wind', bg); }
    const sg = h('g'); P.sky(sg, x, y, 8.5 * s, st.sky === undefined ? 0 : st.sky, col); part('sky', sg);
    if (!o.noText) {
      const T = (px, py, str, anchor, name, fill) => { const e = h('text', { x: px, y: py, 'font-size': fs, 'font-weight': 600, 'text-anchor': anchor }, str); e.style.fill = fill || col; e.style.fontFamily = 'inherit'; e.style.stroke = 'rgba(10,14,22,0.85)'; e.style.strokeWidth = 3; e.style.paintOrder = 'stroke'; part(name, e); return e; };
      if (st.T !== undefined && st.T !== null) T(x - 13 * s, y - 11 * s, String(st.T), 'end', 'temp');
      if (st.Td !== undefined && st.Td !== null) T(x - 13 * s, y + 21 * s, String(st.Td), 'end', 'dew');
      if (st.p !== undefined && st.p !== null) T(x + 13 * s, y - 11 * s, String(st.p).padStart(3, '0'), 'start', 'pressure');
      if (st.wx) { const wg = h('g'); P.wx(wg, x - 20 * s, y + 5 * s, st.wx, 0.9 * s, col); part('weather', wg); }
      if (st.tend !== undefined && st.tend !== null) {
        const tg = h('g');
        const sign = st.dp < 0 ? '-' : '+';
        const txt = h('text', { x: x + 13 * s, y: y + 6 * s, 'font-size': fs, 'font-weight': 600 }, `${sign}${String(Math.abs(st.dp)).padStart(2, '0')}`); txt.style.fill = col; txt.style.fontFamily = 'inherit'; txt.style.stroke = 'rgba(10,14,22,0.85)'; txt.style.strokeWidth = 3; txt.style.paintOrder = 'stroke';
        tg.append(txt); P.tend(tg, x + 13 * s + fs * 2.2, y + 2 * s, st.tend, 0.75 * s, col);
        part('tendency', tg);
      }
    }
    parent.append(g); return g;
  };

  /* ---------------------------------------------------------- state outlines of the map (data from the build) */
  P.statesPath = () => {
    const d = A.data.p3;
    if (!P._states) P._states = d.states.map(s => 'M' + s.pts.map(p => `${p[0]} ${p[1]}`).join('L') + 'Z').join('');
    return P._states;
  };

  /** Great-circle distance between two stations, km. */
  P.km = (a, b) => {
    const r = 6371; const p1 = a.lat * DEG; const p2 = b.lat * DEG; const dl = (b.lon - a.lon) * DEG; const dp = p2 - p1;
    const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(x));
  };


  /* ---------------------------------------------------------- the window shared by the laboratories */
  /** Opens a wide window; the layer list and the time bar are folded away while a practical topic is open (and put back afterwards). */
  P.open = (title, build) => {
    if (P._restore) { clearTimeout(P._restore); P._restore = null; }
    else {
      P._folded = { dock: !$('#stage').classList.contains('dock-min'), bar: !$('#timebar').classList.contains('min') };
      if (P._folded.dock) A.hud.setDockMin(true);
      if (P._folded.bar) { const b = $('#timebar .hud-min'); if (b) b.click(); }
    }
    A.sceneCtl.show(title, build);
    $('#scenectl').classList.add('xl');
  };
  P.close = () => {
    $('#scenectl').classList.remove('xl');
    if (P._restore) clearTimeout(P._restore);
    P._restore = setTimeout(() => {
      P._restore = null; const f = P._folded; P._folded = null; if (!f) return;
      if (f.dock) A.hud.setDockMin(false);
      if (f.bar && $('#timebar').classList.contains('min')) { const b = $('#timebar .hud-min'); if (b) b.click(); }
    }, 500);
  };
  /** Picture on the left, controls and words on the right (they stack on a narrow screen). */
  P.cols = (left, right, basis) => h('div', { class: 'p3main' }, h('div', { class: 'p3left', style: basis ? { flexBasis: `${basis}px` } : null }, left), h('div', { class: 'p3right' }, right));

  /** Adds the explanatory caption block used under each laboratory. */
  /** Words for a step: a bold lead-in ("Step 2:" or "Step 2.") followed by the explanation; step 0 has no number. */
  P.lead = (text, step) => {
    const m = /^((?:Step|Questions?) \d[^:.]*[:.])\s*(.*)$/s.exec(text);
    if (m) return h('div', null, h('b', null, m[1]), ' ', m[2]);
    return h('div', null, h('b', null, step ? `Step ${step}. ` : ''), text);
  };
  P.note = text => h('div', { class: 'readout' }, A.rich(text));
  return P;
})();
