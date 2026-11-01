/* ------------------------------------------------------------------ Practical 3, part 3: the weather map (questions 13 and 14) and the fronts of Figure 9 */
A.widgetFactories.push(() => {
  const P = A.p3; const C = P.C;
  const f1 = (v, d = 1) => P.fmt(v, d);

  /* ---------------------------------------------------------- numerical helpers (all in the pixel frame of the map) */
  /** Thin-plate spline through scattered values; reproduces every station exactly and is smooth in between. */
  function spline(pts, vals) {
    const n = pts.length; const N = n + 3; const sc = 0.01;
    const X = pts.map(p => [p[0] * sc, p[1] * sc]);
    const phi = r2 => (r2 < 1e-12 ? 0 : 0.5 * r2 * Math.log(r2));
    const M = Array.from({ length: N }, () => new Float64Array(N + 1));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) M[i][j] = phi((X[i][0] - X[j][0]) ** 2 + (X[i][1] - X[j][1]) ** 2) + (i === j ? 1e-4 : 0);
      M[i][n] = 1; M[i][n + 1] = X[i][0]; M[i][n + 2] = X[i][1];
      M[n][i] = 1; M[n + 1][i] = X[i][0]; M[n + 2][i] = X[i][1];
      M[i][N] = vals[i];
    }
    for (let c = 0; c < N; c++) {                                              // Gauss elimination with partial pivoting
      let piv = c; for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-12;
      for (let r = c + 1; r < N; r++) { const k = M[r][c] / d; if (k) for (let q = c; q <= N; q++) M[r][q] -= k * M[c][q]; }
    }
    const w = new Float64Array(N);
    for (let r = N - 1; r >= 0; r--) { let s = M[r][N]; for (let q = r + 1; q < N; q++) s -= M[r][q] * w[q]; w[r] = s / (M[r][r] || 1e-12); }
    return (x, y) => {
      const xx = x * sc; const yy = y * sc; let v = w[n] + w[n + 1] * xx + w[n + 2] * yy;
      for (let i = 0; i < n; i++) v += w[i] * phi((xx - X[i][0]) ** 2 + (yy - X[i][1]) ** 2);
      return v;
    };
  }
  /** Gaussian-weighted average of station values (a smooth field that never overshoots) and the total weight, a measure of how near the data are. */
  const kernel = (pts, vals, sigma) => (x, y) => {
    let s = 0; let wsum = 0;
    for (let i = 0; i < pts.length; i++) { const d2 = (x - pts[i][0]) ** 2 + (y - pts[i][1]) ** 2; const w = Math.exp(-d2 / (2 * sigma * sigma)); s += w * vals[i]; wsum += w; }
    return [wsum > 1e-9 ? s / wsum : NaN, wsum];
  };
  /** Marching squares: chains of points where the sampled grid crosses `level`. NaN cells are skipped. */
  function contour(grid, nx, ny, x0, y0, step, level) {
    const segs = []; const v = (i, j) => grid[j * nx + i];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = v(i, j); const b = v(i + 1, j); const c = v(i + 1, j + 1); const d = v(i, j + 1);
      if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) continue;
      const code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const x = x0 + i * step; const y = y0 + j * step;
      const L = (p, q, vp, vq) => { const t = (level - vp) / (vq - vp); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
      const tl = [x, y]; const tr = [x + step, y]; const br = [x + step, y + step]; const bl = [x, y + step];
      const top = () => L(tl, tr, a, b); const right = () => L(tr, br, b, c); const bottom = () => L(bl, br, d, c); const left = () => L(tl, bl, a, d);
      const centre = (a + b + c + d) / 4 > level;
      switch (code) {
        case 1: case 14: segs.push([left(), bottom()]); break;
        case 2: case 13: segs.push([bottom(), right()]); break;
        case 3: case 12: segs.push([left(), right()]); break;
        case 4: case 11: segs.push([top(), right()]); break;
        case 6: case 9: segs.push([top(), bottom()]); break;
        case 7: case 8: segs.push([left(), top()]); break;
        case 5: if (centre) { segs.push([left(), top()], [bottom(), right()]); } else { segs.push([left(), bottom()], [top(), right()]); } break;
        case 10: if (centre) { segs.push([top(), right()], [left(), bottom()]); } else { segs.push([left(), top()], [bottom(), right()]); } break;
        default: break;
      }
    }
    // join the pieces into chains
    const key = p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const ends = new Map(); segs.forEach((s, i) => { for (const p of s) { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
    const used = new Array(segs.length).fill(false); const chains = [];
    const next = (p, from) => { const list = ends.get(key(p)) || []; for (const i of list) if (!used[i] && i !== from) return i; return -1; };
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = true;
      let chain = [segs[i][0], segs[i][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? chain[chain.length - 1] : chain[0];
          const j = next(tip, -1); if (j < 0) break; used[j] = true;
          const s = segs[j]; const other = key(s[0]) === key(tip) ? s[1] : s[0];
          if (dir) chain.push(other); else chain.unshift(other);
        }
      }
      chains.push(chain);
    }
    return chains;
  }
  /** Fill a grid where `test` holds; returns one path string of squares (cheap to draw, easy to clip). */
  const cellsPath = (grid, nx, ny, x0, y0, step, test) => {
    let d = '';
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = grid[j * nx + i]; if (!Number.isNaN(v) && test(v)) d += `M${x0 + i * step - step / 2} ${y0 + j * step - step / 2}h${step}v${step}h${-step}z`; }
    return d;
  };

  /* ---------------------------------------------------------- station data, with the derived numbers */
  const prep = () => {
    const D = A.data.p3;
    const stations = D.stations.map(s => ({ ...s, hpa: P.codeToHpa(s.p), Tc: P.f2c(s.T), Tdc: s.Td === null ? null : P.f2c(s.Td),
      u: -s.kt * Math.sin(s.dir * DEG), v: -s.kt * Math.cos(s.dir * DEG), precip: /rain|snow|drizzle|thunder/.test(s.wx) }));
    return stations;
  };
  const FRONTS = {
    cold: [[655, 702], [620, 740], [600, 770], [572, 815], [553, 865], [550, 915], [540, 970], [535, 1020], [525, 1072]],
    warm: [[655, 702], [690, 704], [722, 710], [760, 735], [818, 768], [870, 772], [940, 768]],
  };
  /** Station pairs straddling each front: [cold-side station, warm-side station]. */
  const PAIRS = { cold: [[16, 17], [22, 23], [25, 28], [31, 32]], warm: [[8, 13], [14, 19], [10, 20]] };

  /* draws a front line with its symbols; `side` is the side of travel (left of the direction of drawing) the front is moving towards */
  const frontLine = (parent, pts, kind, size = 1) => {
    const col = kind === 'cold' ? '#4da3ff' : '#ff6a5a';
    P.path(parent, 'M' + pts.map(p => p.join(' ')).join('L'), { stroke: col, width: 2.6 * size });
    const gap = 30 * size; let carry = gap / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1]; const L = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / L; const uy = (y1 - y0) / L;
      const nx = uy; const ny = -ux;                                           // left of the direction of travel (screen coordinates)
      let t = carry;
      while (t < L) {
        const bx = x0 + ux * t; const by = y0 + uy * t;
        if (kind === 'cold') { const w = 10 * size; const hgt = 13 * size; P.path(parent, `M${bx - ux * w} ${by - uy * w}L${bx + nx * hgt} ${by + ny * hgt}L${bx + ux * w} ${by + uy * w}Z`, { fill: col, stroke: col, width: 1 }); }
        else { const r = 8.5 * size; P.path(parent, `M${bx - ux * r} ${by - uy * r}A${r} ${r} 0 0 1 ${bx + ux * r} ${by + uy * r}Z`, { fill: col, stroke: col, width: 1 }); }
        t += gap;
      }
      carry = t - L;
    }
  };

  /* ---------------------------------------------------------- the big map: question 13 (streamlines) and question 14 (analysis) */
  A.widgets.p3map = {
    enter(topic, arg) {
      const mode = arg === 'wind' ? 'wind' : 'analysis';
      const stations = prep();
      const byId = Object.fromEntries(stations.map(s => [s.id, s]));
      const pts = stations.map(s => [s.x, s.y]);
      const VIEW = { all: [170, 520, 820, 620], storm: [350, 540, 640, 560] };
      const st = this.st = { view: 'all', layers: { iso: false, low: false, fronts: false, cloud: false, precip: false }, air: 'none', sel: null, interp: false, pick: [], lines: [], examples: false, key: false };

      /* fields */
      const pField = spline(pts, stations.map(s => s.hpa));
      const skyK = kernel(pts, stations.map(s => s.sky), 60);
      const prK = kernel(pts, stations.map(s => (s.precip ? 1 : 0)), 46);
      const TK = kernel(pts, stations.map(s => s.T), 70);
      const TdPts = stations.filter(s => s.Td !== null);
      const TdK = kernel(TdPts.map(s => [s.x, s.y]), TdPts.map(s => s.Td), 70);
      const uK = kernel(pts, stations.map(s => s.u), 70); const vK = kernel(pts, stations.map(s => s.v), 70);
      const near = (x, y) => Math.min(...stations.map(s => Math.hypot(s.x - x, s.y - y)));

      // a grid over the whole map
      const gx0 = 175; const gy0 = 520; const gs = 8; const gnx = Math.round(820 / gs) + 1; const gny = Math.round(600 / gs) + 1;
      const grid = (fn, maskDist) => { const out = new Float64Array(gnx * gny); for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) { const x = gx0 + i * gs; const y = gy0 + j * gs; out[j * gnx + i] = near(x, y) <= maskDist ? fn(x, y) : NaN; } return out; };
      const analysis = (() => {
        const pg = grid((x, y) => pField(x, y), 78);
        const isoLevels = [1004, 1008, 1012, 1016, 1020];
        const iso = isoLevels.map(l => ({ l, chains: contour(pg, gnx, gny, gx0, gy0, gs, l) })).filter(o => o.chains.length);
        // the low: the lowest value of the smooth surface among cells that have stations close by
        let best = Infinity; let L = [655, 702];
        for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) { const v = pg[j * gnx + i]; if (!Number.isNaN(v) && v < best) { best = v; L = [gx0 + i * gs, gy0 + j * gs]; } }
        const cg = grid((x, y) => skyK(x, y)[0], 95); const pr = grid((x, y) => prK(x, y)[0], 95);
        return { pg, iso, L, Lp: best, cloud: { d: cellsPath(cg, gnx, gny, gx0, gy0, gs, v => v > 75), chains: contour(cg, gnx, gny, gx0, gy0, gs, 75) }, precip: cellsPath(pr, gnx, gny, gx0, gy0, gs, v => v > 0.3) };
      })();
      const airColor = (v, lo, hi) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return `hsl(${Math.round(225 - 225 * t)} 78% ${Math.round(48 + 4 * t)}%)`; };
      const airPath = kind => {
        const out = []; const step = 10;
        for (let y = gy0; y <= gy0 + 600; y += step) for (let x = gx0; x <= gx0 + 820; x += step) {
          if (near(x, y) > 95) continue;
          const val = kind === 'T' ? TK(x, y)[0] : TdK(x, y)[0]; if (Number.isNaN(val)) continue;
          out.push([x, y, airColor(val, kind === 'T' ? 32 : 18, kind === 'T' ? 72 : 66)]);
        }
        return out;
      };

      /* streamlines through the interpolated wind */
      const windDir = (x, y) => { const [u] = uK(x, y); const [v, w] = vK(x, y); if (Number.isNaN(u) || w < 0.12) return null; const m = Math.hypot(u, v) || 1; return [u / m, -v / m]; };
      const stream = (sx, sy, ahead = 55, behind = 40) => {
        const trace = (sign, max) => {
          const out = []; let x = sx; let y = sy;
          for (let k = 0; k < max; k++) {
            if (near(x, y) > 120) break;
            const a = windDir(x, y); if (!a) break;
            const mx = x + sign * a[0] * 4; const my = y + sign * a[1] * 4; const b = windDir(mx, my) || a;
            x += sign * b[0] * 8; y += sign * b[1] * 8;
            if (out.length > 12 && out.slice(0, out.length - 10).some(p => Math.hypot(p[0] - x, p[1] - y) < 10)) break;   // it has started to coil: stop
            out.push([x, y]);
          }
          return out;
        };
        return [...trace(-1, behind).reverse(), [sx, sy], ...trace(1, ahead)];
      };
      const smooth = ex => {
        if (ex.length === 2) { const [p, q] = ex; return Array.from({ length: 21 }, (_, i) => [p[0] + (q[0] - p[0]) * i / 20, p[1] + (q[1] - p[1]) * i / 20]); }
        const out = [];
        for (let t = 0; t < ex.length - 1; t++) for (let q = 0; q < 8; q++) {
          const k = q / 8; const p0 = ex[Math.max(0, t - 1)]; const p1 = ex[t]; const p2 = ex[t + 1]; const p3 = ex[Math.min(ex.length - 1, t + 2)];
          const cr = i => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * k + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * k * k + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * k * k * k);
          out.push([cr(0), cr(1)]);
        }
        out.push(ex[ex.length - 1]);
        return out;
      };
      const EXAMPLES = [[[371, 752], [551, 903]], [[454, 1058], [510, 1036], [596, 995], [661, 919], [702, 826], [725, 738]]];   // the two arrows used as examples
      const SEEDS = [[420, 566], [405, 800], [565, 1085], [700, 1040], [880, 806], [930, 650]];

      const host = h('div'); const read = h('div', { class: 'readout' }); const ctl = h('div');
      const drawMap = () => {
        const [vx, vy, vw, vh] = VIEW[st.view];
        const svg = h('svg', { viewBox: `${vx} ${vy} ${vw} ${vh}`, width: '100%', style: { display: 'block', maxWidth: '880px', height: 'auto', background: 'rgba(8,12,20,0.55)', borderRadius: '10px', cursor: mode === 'wind' ? 'crosshair' : 'default' }, role: 'img', 'aria-label': 'Weather map of the central United States with station models' });
        P.path(svg, P.statesPath(), { stroke: 'rgba(200,205,215,0.55)', width: 1.1, fill: 'rgba(255,255,255,0.035)' });
        // air mass colour
        if (st.air !== 'none') { const cells = airPath(st.air === 'T' ? 'T' : 'Td'); const g = h('g', { opacity: 0.5, 'shape-rendering': 'crispEdges' }); for (const [x, y, c] of cells) g.append(h('rect', { x: x - 5.4, y: y - 5.4, width: 10.8, height: 10.8, fill: c })); svg.append(g); }
        if (st.layers.precip) P.path(svg, analysis.precip, { fill: 'rgba(80,160,255,0.40)', stroke: null });
        if (st.layers.cloud) { P.path(svg, analysis.cloud.d, { fill: 'rgba(210,215,225,0.22)', stroke: null }); for (const ch of analysis.cloud.chains) P.path(svg, 'M' + ch.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'), { stroke: '#e9edf5', width: 2.2, dash: '7 5' }); }
        if (st.layers.iso) for (const o of analysis.iso) {
          for (const ch of o.chains) if (ch.length > 2) P.path(svg, 'M' + ch.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'), { stroke: C.yellow, width: 2 });
          const best = o.chains.slice().sort((a, b) => b.length - a.length)[0];
          if (best && best.length > 8) { const k = Math.floor(best.length * 0.5); const p0 = best[k - 2]; const p1 = best[k + 2]; let ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * RAD; if (ang > 90) ang -= 180; if (ang < -90) ang += 180; P.txt(svg, best[k][0], best[k][1] + 4, String(o.l), { size: 13, weight: 800, anchor: 'middle', fill: C.yellow, stroke: 'rgba(8,12,20,0.95)', strokeWidth: 4, rotate: ang }); }
        }
        if (st.layers.fronts) { frontLine(svg, FRONTS.cold, 'cold', 1); frontLine(svg, FRONTS.warm, 'warm', 1); }
        if (st.layers.low) { const [lx, ly] = analysis.L; P.txt(svg, lx, ly + 14, 'L', { size: 44, weight: 900, anchor: 'middle', fill: '#ff6a5a', stroke: 'rgba(8,12,20,0.95)', strokeWidth: 5 }); P.txt(svg, lx + 30, ly + 30, `${f1(analysis.Lp, 0)} hPa`, { size: 12, weight: 700, fill: '#ffb3aa', stroke: 'rgba(8,12,20,0.9)' }); }
        // streamlines
        const sl = h('g'); svg.append(sl);
        const drawStream = (pl, col, w = 3.2) => { if (pl.length < 3) return; P.path(sl, 'M' + pl.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'), { stroke: col, width: w, opacity: 0.95 }); const n = pl.length; const a = pl[Math.max(0, n - 4)]; const b = pl[n - 1]; P.arrow(sl, a[0], a[1], b[0], b[1], { color: col, width: w, head: 14 }); };
        if (st.examples) for (const ex of EXAMPLES) drawStream(smooth(ex), '#9aa3b2', 3.6);
        if (st.key) for (const sd of SEEDS) drawStream(stream(sd[0], sd[1], 62, 0), C.green);
        for (const pl of st.lines) drawStream(pl, C.orange);
        // stations
        const sg = h('g'); svg.append(sg);
        for (const s of stations) {
          const sel = st.sel === s.id; const picked = st.pick.includes(s.id);
          if (sel || picked) P.circle(sg, s.x, s.y, 20, { fill: 'rgba(255,211,122,0.16)', stroke: picked ? C.green : C.yellow, width: 2 });
          if (mode === 'wind') P.model(sg, { sky: s.sky, dir: s.dir, kt: s.kt }, s.x, s.y, { s: 1.0, noText: true });
          else P.model(sg, { T: s.T, Td: s.Td, p: s.p, sky: s.sky, dir: s.dir, kt: s.kt, wx: s.wx }, s.x, s.y, { s: 0.92, fontSize: 12.5 });
          const hit = h('circle', { cx: s.x, cy: s.y, r: 16, fill: 'transparent', style: { cursor: 'pointer' }, onclick: e => { e.stopPropagation(); clickStation(s.id); } }); sg.append(hit);
          if (mode === 'wind' || st.sel === s.id) P.txt(sg, s.x + 10, s.y - 12, String(s.id), { size: 10, weight: 700, fill: C.ink3 });
        }
        if (st.interp && st.pick.length === 2) {
          const [a, b] = st.pick.map(i => byId[i]); P.line(svg, a.x, a.y, b.x, b.y, { color: C.green, width: 2, dash: '6 4' });
          const lev = Math.ceil(Math.min(a.hpa, b.hpa) / 4) * 4;
          if (lev <= Math.max(a.hpa, b.hpa)) { const t = (lev - a.hpa) / (b.hpa - a.hpa); const px = a.x + (b.x - a.x) * t; const py = a.y + (b.y - a.y) * t; P.circle(svg, px, py, 5.5, { fill: C.green, stroke: '#101010', width: 1.4 }); P.txt(svg, px + 8, py - 8, `${lev}`, { size: 13, weight: 800, fill: C.green, stroke: 'rgba(8,12,20,0.95)' }); }
        }
        if (st.air !== 'none') P.txt(svg, vx + 12, vy + 20, st.air === 'T' ? 'Air temperature: blue is cold, red is warm' : 'Dew point: blue is dry, red is humid', { size: 13, weight: 700, fill: C.ink, stroke: 'rgba(8,12,20,0.9)' });
        svg.addEventListener('click', e => { if (mode !== 'wind') return; const r = svg.getBoundingClientRect(); const x = vx + (e.clientX - r.left) / r.width * vw; const y = vy + (e.clientY - r.top) / r.height * vh; const pl = stream(x, y); if (pl.length > 4) { st.lines.push(pl); draw(); } });
        return svg;
      };

      const decode = s => {
        const rh = s.Td === null ? null : P.rhFromTd(s.Tc, s.Tdc);
        const box = h('div');
        box.append(h('b', null, `Station ${s.id}`), ` (about ${f1(s.lat, 1)}° N, ${f1(-s.lon, 1)}° W). `,
          `Temperature ${s.T} °F (${f1(s.Tc, 1)} °C), dew point ${s.Td === null ? 'not printed' : `${s.Td} °F (${f1(s.Tdc, 1)} °C)`}${rh === null ? '' : `, relative humidity ${f1(rh, 0)} %`}. `,
          `Pressure code ${String(s.p).padStart(3, '0')} = ${f1(s.hpa, 1)} hPa. Sky: ${P.skyWords(s.sky)}. Wind ${s.kt < 3 ? 'light' : `${s.kt} knots (${f1(P.kt2ms(s.kt), 1)} m/s)`} from ${A.fmt.compass(s.dir)} (${s.dir}°)${s.wx ? `. Weather: ${P.WEATHER[s.wx].toLowerCase()}` : ''}.`);
        return box;
      };
      const clickStation = id => {
        if (st.interp) { st.pick = st.pick.length >= 2 ? [id] : [...st.pick, id]; }
        st.sel = id; draw();
      };

      const NOTES = {
        iso: 'Isobars. Pick two neighbouring stations whose pressures lie either side of a 4 hPa value and find where that value falls on the straight line between them (use “Find a point on an isobar” and click two stations). Join the points that have the same value with a smooth line, never crossing another isobar. Here the smooth surface through all 34 pressures is contoured for you.',
        low: 'The low is where the isobars close round the lowest pressure: here about 1002 hPa over Iowa and northern Illinois (stations 8 and 9 read 1002.4 and 1002.6).',
        fronts: 'Fronts are found where the air changes quickly: temperature, dew point and wind direction. Behind the cold front the wind is from the northwest and the temperature is lower; ahead of it the wind is from the south-southwest. The warm front is the edge of the warmer air to the south and east, where the wind turns from the east to the south.',
        cloud: 'Cloud above 75 %: outline the stations drawn with a three-quarter, nine-tenths or completely filled circle. It is a wide, comma-shaped area wrapped round the low.',
        precip: 'Precipitation: shade round every station that shows a rain symbol, or thunder with rain (stations 2, 5, 6, 8, 9, 10, 11, 17, 18 and 23). The rain falls in a band north and east of the low, along the warm front, and in a narrow band along the cold front.',
      };
      const draw = () => {
        clear(host); clear(read);
        host.append(drawMap());
        if (mode === 'wind') {
          read.append(h('b', null, 'Streamlines. '), 'A streamline is a line that is everywhere parallel to the wind. Start at an upwind station, follow the staff of each barb in the direction the wind blows (away from the end with the barbs) and curve smoothly from one station to the next. Draw an arrow where the flow changes direction. Click anywhere on the map to start a streamline there (orange). The green ones are the six that the button below draws, and the grey ones are the two examples given here.');
          read.append(h('div', { style: { marginTop: '6px' } }, 'What do they show? The air is turning anticlockwise round a centre in Iowa: northwesterly in the west, southerly in the south, easterly in the north. That is the circulation of a low-pressure system in the Northern Hemisphere.'));
        } else {
          const active = Object.keys(st.layers).filter(k => st.layers[k]);
          if (!active.length) read.append(h('b', null, 'Question 14. '), 'Five jobs on one map: isobars every 4 mb, the L, the fronts, the cloud above 75 % and the precipitation. Switch them on one at a time with the buttons, and read what each one is looking for. Click a station to read all its numbers.');
          else read.append(h('b', null, `${active.length} of 5 layers on. `), NOTES[active[active.length - 1]]);
          if (st.layers.fronts) {
            const tab = h('table', { class: 'p3tab' }, h('thead', null, h('tr', null, ['Across the…', 'Stations', 'Temperature', 'Dew point', 'Wind'].map(t => h('th', null, t)))));
            const body = h('tbody');
            for (const kind of ['cold', 'warm']) for (const [a, b] of PAIRS[kind]) {
              const A1 = byId[a]; const B1 = byId[b];
              body.append(h('tr', null, h('td', null, `${kind} front`), h('td', null, `${a} → ${b}`), h('td', null, `${A1.T} → ${B1.T} °F`), h('td', null, `${A1.Td} → ${B1.Td} °F`), h('td', null, `${A.fmt.compass(A1.dir)} → ${A.fmt.compass(B1.dir)}`)));
            }
            tab.append(body); read.append(tab);
          }
        }
        if (st.sel !== null) read.append(h('div', { style: { marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--hud-border)' } }, decode(byId[st.sel])));
        if (st.interp && st.pick.length === 2) {
          const [a, b] = st.pick.map(i => byId[i]); const lev = Math.ceil(Math.min(a.hpa, b.hpa) / 4) * 4;
          if (lev <= Math.max(a.hpa, b.hpa)) { const t = (lev - a.hpa) / (b.hpa - a.hpa); read.append(h('div', { style: { marginTop: '6px' } }, h('b', null, `${lev} hPa lies ${f1(t * 100, 0)} % of the way from station ${a.id} (${f1(a.hpa, 1)}) to station ${b.id} (${f1(b.hpa, 1)}): `), `(${lev} − ${f1(a.hpa, 1)}) ÷ (${f1(b.hpa, 1)} − ${f1(a.hpa, 1)}) = ${f1(t, 2)}. Mark that point on the line, then do the same for the other neighbouring pairs.`)); }
          else read.append(h('div', { style: { marginTop: '6px' } }, `The pressures ${f1(a.hpa, 1)} and ${f1(b.hpa, 1)} hPa do not straddle a multiple of 4: no isobar passes between these two.`));
        }
      };

      const toggle = (key, label) => h('button', { class: `hbtn${st.layers[key] ? ' on' : ''}`, 'aria-pressed': String(!!st.layers[key]), onclick: () => { st.layers[key] = !st.layers[key]; buildCtl(); draw(); } }, label);
      const buildCtl = () => {
        clear(ctl);
        if (mode === 'wind') {
          ctl.append(h('div', { class: 'row' }, h('button', { class: `hbtn${st.examples ? ' on' : ''}`, onclick: () => { st.examples = !st.examples; buildCtl(); draw(); } }, 'The two examples'),
            h('button', { class: `hbtn${st.key ? ' on' : ''}`, onclick: () => { st.key = !st.key; buildCtl(); draw(); } }, 'Six streamlines drawn for you'),
            A.ui.button('Clear mine', () => { st.lines = []; draw(); }, 'reset')));
        } else {
          ctl.append(h('div', { class: 'row' }, toggle('iso', '1  Isobars every 4 mb'), toggle('low', '2  The L'), toggle('fronts', '3  Warm and cold fronts'), toggle('cloud', '4  Cloud above 75 %'), toggle('precip', '5  Precipitation')));
          ctl.append(h('div', { class: 'row' }, h('label', null, 'Help me see'), P.seg([['none', 'Nothing'], ['T', 'Air temperature'], ['Td', 'Dew point']], st.air, v => { st.air = v; draw(); }),
            h('button', { class: `hbtn${st.interp ? ' on' : ''}`, onclick: () => { st.interp = !st.interp; st.pick = []; buildCtl(); draw(); } }, 'Find a point on an isobar')));
        }
        ctl.append(h('div', { class: 'row' }, h('label', null, 'View'), P.seg([['all', 'Whole map'], ['storm', 'Zoom to the storm']], st.view, v => { st.view = v; draw(); })));
      };
      P.open(mode === 'wind' ? 'Streamlines from the wind barbs (question 13)' : 'Weather map analysis (question 14)', c => { c.append(P.cols(host, h('div', null, ctl, read), 700)); });
      buildCtl(); draw();
    },
    exit() { P.close(); },
  };

  /* ---------------------------------------------------------- Figure 9: a low with a warm and a cold front */
  A.widgets.p3front = {
    enter() {
      const D = A.data.p3.fig9;
      const S = D.stations.map(s => ({ ...s, hpa: P.codeToHpa(s.p), Tc: P.f2c(s.T), Tdc: P.f2c(s.Td) }));
      const by = Object.fromEntries(S.map(s => [s.id, s]));
      const st = this.st = { step: 0 };
      const host = h('div'); const read = h('div', { class: 'readout' }); const ctl = h('div');
      const STEPS = [
        'Figure 9: a low-pressure centre (L) with a warm front curving east and south from it, and a cold front trailing to the southwest. Four stations sample the air. A lies north of the warm front, B and C in the warm sector between the two fronts, D behind the cold front.',
        'The warm sector, stations B and C, is warm and humid: 68 and 70 °F with dew points of 63 and 64 °F, and the wind blows from the south. Relative humidity is above 80 %.',
        'Behind the cold front, station D, the air is cooler and much drier: 50 °F with a dew point of 38 °F. The sky is clear and the wind has turned to the west-northwest.',
        'Crossing the cold front, from C to D: the temperature falls 20 °F, the dew point falls 26 °F, the wind turns from south-southwest to west-northwest (clockwise by about 100°), the pressure rises and the cloud clears. A sharp change in all of them marks the front.',
        'Crossing the warm front, from A (north of it) to B (south of it): the temperature rises 12 °F, the dew point 10 °F, and the wind turns from east-southeast to south (clockwise by about 64°). The cool side is overcast and raining; the warm side is almost clear.',
        'Both fronts turn the wind clockwise as they pass. That shift, together with the temperature and moisture contrasts, is how you find a front on a map when no line is drawn.',
      ];
      const draw = () => {
        clear(host); clear(read);
        const vb = [360, 950, 440, 390];
        const svg = h('svg', { viewBox: vb.join(' '), width: '100%', style: { display: 'block', maxWidth: '640px', height: 'auto', background: 'rgba(8,12,20,0.55)', borderRadius: '10px' }, role: 'img', 'aria-label': 'Figure 9: a low with a warm front and a cold front and four stations' });
        P.txt(svg, D.L[0], D.L[1] + 20, 'L', { size: 54, weight: 900, anchor: 'middle', fill: '#ff6a5a' });
        frontLine(svg, D.warm, 'warm', 1.1); frontLine(svg, D.cold, 'cold', 1.1);
        const hl = id => (st.step === 1 && (id === 'B' || id === 'C')) || (st.step === 2 && id === 'D') || (st.step === 3 && (id === 'C' || id === 'D')) || (st.step === 4 && (id === 'A' || id === 'B')) || st.step === 0;
        for (const s of S) {
          if (hl(s.id)) P.circle(svg, s.x, s.y, 24, { fill: 'rgba(255,211,122,0.12)', stroke: C.yellow, width: 1.8 });
          P.model(svg, { T: s.T, Td: s.Td, p: s.p, sky: s.sky, dir: s.dir, kt: s.kt, wx: s.wx }, s.x, s.y, { s: 1.0, fontSize: 12.5 });
          P.txt(svg, s.x + (s.id === 'D' ? -34 : 14), s.y + 40, s.id, { size: 16, weight: 800, fill: C.yellow, stroke: 'rgba(8,12,20,0.9)' });
        }
        const link = (a, b, label) => { const p = by[a]; const q = by[b]; P.line(svg, p.x, p.y, q.x, q.y, { color: C.green, width: 2.4, dash: '7 5' }); P.txt(svg, (p.x + q.x) / 2, Math.min(p.y, q.y) - 34, label, { size: 12.5, weight: 700, anchor: 'middle', fill: C.green, stroke: 'rgba(8,12,20,0.95)', strokeWidth: 5 }); };
        if (st.step === 3) link('C', 'D', `T ${by.C.T}→${by.D.T}, Td ${by.C.Td}→${by.D.Td}`);
        if (st.step === 4) link('A', 'B', `T ${by.A.T}→${by.B.T}, Td ${by.A.Td}→${by.B.Td}`);
        host.append(svg);
        read.append(h('b', null, `Step ${st.step}. `), STEPS[st.step]);
        const tab = h('table', { class: 'p3tab' }, h('thead', null, h('tr', null, ['Station', 'Temperature', 'Dew point', 'RH', 'Pressure', 'Wind from', 'Sky'].map(t => h('th', null, t)))),
          h('tbody', null, S.map(s => h('tr', null, h('td', null, s.id), h('td', null, `${s.T} °F`), h('td', null, `${s.Td} °F`), h('td', null, `${f1(P.rhFromTd(s.Tc, s.Tdc), 0)} %`), h('td', null, `${f1(s.hpa, 1)} hPa`), h('td', null, `${A.fmt.compass(s.dir)} (${s.dir}°), ${s.kt} kt`), h('td', null, `${s.sky} %`)))));
        read.append(tab);
      };
      ctl.append(h('div', { class: 'row' }, A.ui.button('Back', () => { st.step = Math.max(0, st.step - 1); draw(); }), A.ui.button('Next step', () => { st.step = Math.min(STEPS.length - 1, st.step + 1); draw(); }, 'play'), A.ui.button('Reset', () => { st.step = 0; draw(); }, 'reset')));
      P.open('Fronts: what changes as one passes', c => { c.append(P.cols(host, h('div', null, ctl, read), 600)); });
      draw();
    },
    exit() { P.close(); },
  };
});
