/* ------------------------------------------------------------------ chart engine
   Hand-written SVG charts that follow a few fixed rules: 2 px lines, hairline recessive grids,
   one axis per chart, a legend whenever there are two or more series, a crosshair tooltip that
   lists every series, and a table view that gives the same numbers without hovering. */

A.chart = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  function niceStep(range, count) {
    const raw = range / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const f = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return f * mag;
  }

  function ticks(lo, hi, count = 5) {
    if (!(hi > lo)) return [lo];
    const step = niceStep(hi - lo, count);
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  }

  const fmtNum = v => {
    if (!Number.isFinite(v)) return '–';
    const a = Math.abs(v);
    const s = a >= 1000 ? Math.round(v).toLocaleString('en-GB') : a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1).replace(/\.0$/, '') : a >= 1 ? v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('-', '−');
  };

  const colorOf = c => (typeof c === 'number' ? `var(--s${(c % 8) + 1})` : c);

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /** Common frame: figure, caption, legend, tools and the render-on-resize machinery. */
  function frame(spec, draw) {
    const fig = h('figure', { class: 'chart' });
    fig.append(h('figcaption', { class: 'ct' }, spec.title || ''));
    if (spec.subtitle) fig.append(h('div', { class: 'cs' }, A.rich(spec.subtitle)));
    const host = h('div', { class: 'chost' });
    const legend = h('div', { class: 'legend' });
    const tip = h('div', { class: 'ctip' });
    const table = h('div', { class: 'ctable' });
    const tools = h('div', { class: 'ctools' }, h('button', {
      type: 'button',
      onclick: () => { fig.classList.toggle('tableview'); btn.textContent = fig.classList.contains('tableview') ? 'Show chart' : 'Show as table'; },
    }, 'Show as table'));
    const btn = tools.firstChild;
    fig.append(host, legend, tools, table, tip);
    fig._tip = tip;
    fig._render = () => {
      const w = Math.max(240, host.clientWidth || fig.clientWidth - 24 || 380);
      clear(host);
      draw(host, w, fig);
    };
    const legendItems = spec.legend || (spec.series && spec.series.length > 1 ? spec.series.map(s => ({ name: s.name, color: s.color, box: !!s.area || spec.type === 'bars' })) : []);
    for (const it of legendItems) legend.append(h('span', null, h('i', { class: it.box ? 'box' : '', style: { background: colorOf(it.color) } }), it.name));
    if (!legendItems.length) legend.style.display = 'none';
    if (!spec.table && !spec.categories && spec.series && spec.series.length && spec.series[0].x) {
      spec.table = () => {
        const first = spec.series[0];
        const step = Math.max(1, Math.ceil(first.x.length / 240));
        const xf = (spec.x && spec.x.format) || (v => fmtNum(v));
        const rows = [];
        for (let i = 0; i < first.x.length; i += step) {
          const row = [(spec.tipX || xf)(first.x[i])];
          for (const s of spec.series) { const v = s.y[i]; row.push(v === null || v === undefined || !Number.isFinite(v) ? '\u2013' : fmtNum(v)); }
          rows.push(row);
        }
        return { head: [(spec.x && spec.x.label) || 'x', ...spec.series.map(s => s.name)], rows };
      };
    }
    if (!spec.table && spec.categories) {
      spec.table = () => ({ head: ['', ...spec.series.map(s => s.name || 'value')], rows: spec.categories.map((c, i) => [String(c), ...spec.series.map(s => fmtNum(s.y[i] || 0))]) });
    }
    fig.updateTable = () => {
      clear(table);
      const t = spec.table ? spec.table() : null;
      if (t) {
        table.append(h('table', null, h('thead', null, h('tr', null, t.head.map(c => h('th', null, c)))),
          h('tbody', null, t.rows.map(r => h('tr', null, r.map(c => h('td', null, c)))))));
      }
    };
    fig.updateTable();
    let pending = false;
    const schedule = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; if (fig.isConnected) fig._render(); }); };
    fig.redraw = schedule;
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      new ResizeObserver(() => { const w = host.clientWidth; if (w && Math.abs(w - lastW) > 2) { lastW = w; schedule(); } }).observe(host);
    }
    requestAnimationFrame(() => fig.isConnected && fig._render());
    if (spec.live) {
      const hook = () => { if (!fig.isConnected) { A.bus.off('time', hook); return; } schedule(); };
      A.bus.on('time', hook);
    }
    const unitHook = () => { if (!fig.isConnected) { A.bus.off('units', unitHook); return; } fig.updateTable(); schedule(); };
    A.bus.on('units', unitHook);
    return fig;
  }

  function showTip(fig, x, y, header, rows) {
    const tip = fig._tip;
    clear(tip);
    if (header) tip.append(h('div', { class: 'h' }, header));
    for (const r of rows) tip.append(h('div', { class: 'r' }, r.color ? h('i', { style: { background: colorOf(r.color) } }) : null, h('span', null, r.name ? r.name + ' ' : ''), h('b', null, r.value)));
    tip.style.display = 'block';
    const fw = fig.clientWidth; const tw = tip.offsetWidth;
    tip.style.left = Math.max(4, Math.min(fw - tw - 4, x + 12)) + 'px';
    tip.style.top = Math.max(4, y - 10 - tip.offsetHeight) + 'px';
  }
  const hideTip = fig => { fig._tip.style.display = 'none'; };

  /** Line / area chart.  series: [{name, x[], y[], color, width, dash, area, diverge}] */
  function line(spec) {
    const fig = frame(spec, (host, W, figure) => {
      const H = spec.height || 220;
      const m = { l: spec.y && spec.y.label ? 52 : 44, r: 14, t: 10, b: spec.x && spec.x.label ? 38 : 26, ...(spec.margin || {}) };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': spec.title }, host);
      const tx = spec.x && spec.x.log ? Math.log10 : (v => v);
      let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
      for (const s of spec.series) {
        for (let i = 0; i < s.x.length; i++) {
          const yv = s.y[i];
          if (yv === null || yv === undefined || !Number.isFinite(yv)) continue;
          const xv = tx(s.x[i]);
          if (xv < x0) x0 = xv;
          if (xv > x1) x1 = xv;
          if (yv < y0) y0 = yv;
          if (yv > y1) y1 = yv;
        }
      }
      if (spec.x && spec.x.min !== undefined) x0 = tx(spec.x.min);
      if (spec.x && spec.x.max !== undefined) x1 = tx(spec.x.max);
      if (spec.y && spec.y.min !== undefined) y0 = spec.y.min; if (spec.y && spec.y.max !== undefined) y1 = spec.y.max;
      if (spec.y && spec.y.zero && y0 > 0) y0 = 0;
      if (!(y1 > y0)) { y1 = y0 + 1; }
      const padY = spec.y && (spec.y.min !== undefined && spec.y.max !== undefined) ? 0 : (y1 - y0) * 0.06;
      if (!(spec.y && spec.y.min !== undefined)) y0 -= padY;
      if (!(spec.y && spec.y.max !== undefined)) y1 += padY;
      const pw = W - m.l - m.r; const ph = H - m.t - m.b;
      const sx = v => m.l + (tx(v) - x0) / (x1 - x0) * pw;
      const sy = v => (spec.y && spec.y.invert) ? m.t + (v - y0) / (y1 - y0) * ph : m.t + (1 - (v - y0) / (y1 - y0)) * ph;
      const yt = (spec.y && spec.y.ticks) || ticks(y0, y1, Math.max(3, Math.round(ph / 42)));
      const xt = (spec.x && spec.x.ticks) || ticks(x0, x1, Math.max(3, Math.round(pw / 70)));
      const xInside = v => tx(v) >= x0 - 1e-9 && tx(v) <= x1 + 1e-9;
      const yf = (spec.y && spec.y.format) || fmtNum; const xf = (spec.x && spec.x.format) || fmtNum;
      for (const t of yt) { if (t < y0 || t > y1) continue; el('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }, svg); el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, svg).textContent = yf(t); }
      el('line', { class: 'axis', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
      for (const t of xt) { if (!xInside(t)) continue; el('line', { class: 'axis', x1: sx(t), x2: sx(t), y1: H - m.b, y2: H - m.b + 4 }, svg); el('text', { x: sx(t), y: H - m.b + 16, 'text-anchor': 'middle' }, svg).textContent = xf(t); }
      if (spec.x && spec.x.label) el('text', { class: 'axis-title', x: m.l + pw / 2, y: H - 4, 'text-anchor': 'middle' }, svg).textContent = spec.x.label;
      if (spec.y && spec.y.label) { const t = el('text', { class: 'axis-title', x: 12, y: m.t + ph / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${m.t + ph / 2})` }, svg); t.textContent = spec.y.label; }
      if (y0 < 0 && y1 > 0 && !(spec.y && spec.y.noZero)) el('line', { class: 'zero', x1: m.l, x2: W - m.r, y1: sy(0), y2: sy(0) }, svg);
      for (const b of spec.bands || []) {
        const a = clamp(sx(b.x0), m.l, W - m.r); const c = clamp(sx(b.x1), m.l, W - m.r);
        el('rect', { x: a, y: m.t, width: Math.max(0, c - a), height: ph, fill: 'var(--ink-3)', opacity: 0.1 }, svg);
        if (b.label) { const t = el('text', { x: (a + c) / 2, y: m.t + 11, 'text-anchor': 'middle' }, svg); t.textContent = b.label; }
      }
      const clip = `clip${Math.random().toString(36).slice(2, 8)}`;
      const cp = el('clipPath', { id: clip }, el('defs', null, svg)); el('rect', { x: m.l, y: m.t - 2, width: pw, height: ph + 4 }, cp);
      const g = el('g', { 'clip-path': `url(#${clip})` }, svg);
      for (const s of spec.series) {
        let d = ''; let started = false; let first = null; let last = null;
        for (let i = 0; i < s.x.length; i++) {
          const yv = s.y[i];
          if (yv === null || yv === undefined || !Number.isFinite(yv)) { started = false; continue; }
          const px = sx(s.x[i]); const py = sy(yv);
          d += `${started ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
          started = true; if (!first) first = [px, py, s.x[i]]; last = [px, py, s.x[i]];
        }
        if (s.diverge) {
          const base = sy(0);
          for (const sgn of [1, -1]) {
            let path = ''; let open = false; let lastX = 0;
            for (let i = 0; i < s.x.length; i++) {
              const v = s.y[i]; if (v === null || v === undefined || !Number.isFinite(v)) continue;
              const vv = sgn > 0 ? Math.max(0, v) : Math.min(0, v);
              const px = sx(s.x[i]); const py = sy(vv);
              if (!open) { path += `M${px.toFixed(1)},${base.toFixed(1)}`; open = true; }
              path += `L${px.toFixed(1)},${py.toFixed(1)}`; lastX = px;
            }
            if (open) path += `L${lastX.toFixed(1)},${base.toFixed(1)}Z`;
            el('path', { d: path, fill: sgn > 0 ? 'var(--pos)' : 'var(--neg)', opacity: 0.55 }, g);
          }
        } else if (s.area && first) {
          el('path', { d: `${d}L${last[0]},${sy(Math.max(y0, 0))}L${first[0]},${sy(Math.max(y0, 0))}Z`, fill: colorOf(s.color), opacity: 0.12 }, g);
        }
        if (!s.diverge || s.outline) el('path', { d, fill: 'none', stroke: s.diverge ? 'var(--ink-2)' : colorOf(s.color), 'stroke-width': s.width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash || null, opacity: s.opacity || 1 }, g);
        if (s.marker !== false && last && !s.diverge && s.x.length < 200) { el('circle', { cx: last[0], cy: last[1], r: 4, fill: colorOf(s.color), stroke: 'var(--surface-2)', 'stroke-width': 2 }, svg); }
      }
      for (const v of (typeof spec.vlines === 'function' ? spec.vlines() : spec.vlines) || []) {
        if (!xInside(v.x)) continue;
        el('line', { x1: sx(v.x), x2: sx(v.x), y1: m.t, y2: H - m.b, stroke: 'var(--accent)', 'stroke-width': 1.5, opacity: 0.85 }, svg);
        if (v.label) { const t = el('text', { x: Math.min(W - m.r - 4, sx(v.x) + 4), y: m.t + 10, fill: 'var(--accent)' }, svg); t.textContent = v.label; t.style.fill = 'var(--accent)'; }
      }
      for (const a of spec.hlines || []) {
        if (a.y < y0 || a.y > y1) continue;
        el('line', { x1: m.l, x2: W - m.r, y1: sy(a.y), y2: sy(a.y), stroke: 'var(--ink-3)', 'stroke-width': 1, opacity: 0.6 }, svg);
        if (a.label) el('text', { x: W - m.r - 3, y: sy(a.y) - 4, 'text-anchor': 'end' }, svg).textContent = a.label;
      }
      for (const a of spec.annotations || []) {
        const px = sx(a.x); const py = sy(a.y);
        el('circle', { cx: px, cy: py, r: 4, fill: 'var(--ink)', stroke: 'var(--surface-2)', 'stroke-width': 2 }, svg);
        const t = el('text', { x: clamp(px, m.l + 30, W - m.r - 30), y: py - 9, 'text-anchor': 'middle' }, svg); t.textContent = a.text; t.style.fill = 'var(--ink-2)';
      }
      // hover layer
      const cross = el('line', { y1: m.t, y2: H - m.b, stroke: 'var(--ink-3)', 'stroke-width': 1, opacity: 0, 'pointer-events': 'none' }, svg);
      const dots = spec.series.map(s => el('circle', { r: 4.5, fill: colorOf(s.color), stroke: 'var(--surface-2)', 'stroke-width': 2, opacity: 0, 'pointer-events': 'none' }, svg));
      const hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0 }, svg);
      const move = e => {
        const r = svg.getBoundingClientRect();
        const px = (e.clientX - r.left) * (W / r.width);
        let xv = x0 + (clamp(px, m.l, W - m.r) - m.l) / pw * (x1 - x0);
        if (spec.x && spec.x.log) xv = Math.pow(10, xv);
        const rows = []; let header = '';
        let best = null;
        spec.series.forEach((s, k) => {
          let lo = 0; let hi = s.x.length - 1;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s.x[mid] < xv) lo = mid; else hi = mid; }
          let i = Math.abs(s.x[lo] - xv) <= Math.abs(s.x[hi] - xv) ? lo : hi;
          const yv = s.y[i];
          if (yv === null || yv === undefined || !Number.isFinite(yv)) { dots[k].setAttribute('opacity', 0); return; }
          dots[k].setAttribute('cx', sx(s.x[i])); dots[k].setAttribute('cy', sy(yv)); dots[k].setAttribute('opacity', 1);
          rows.push({ name: spec.series.length > 1 ? s.name : '', color: s.color, value: (s.format || yf)(yv) + (spec.unit ? ' ' + spec.unit : '') });
          if (!best) { best = s.x[i]; header = (spec.tipX || xf)(s.x[i]); }
        });
        if (best !== null) { cross.setAttribute('x1', sx(best)); cross.setAttribute('x2', sx(best)); cross.setAttribute('opacity', 0.7); showTip(figure, sx(best) * (r.width / W), m.t + ph * 0.3, header, rows); }
      };
      const leave = () => { cross.setAttribute('opacity', 0); dots.forEach(d => d.setAttribute('opacity', 0)); hideTip(figure); };
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerleave', leave);
      hit.addEventListener('focus', () => { const r = svg.getBoundingClientRect(); move({ clientX: r.left + r.width * 0.5 }); }); hit.addEventListener('blur', leave);
    });
    return fig;
  }

  /** Vertical or horizontal bars.  spec: {categories[], series:[{name,y[],color}], horizontal, stacked} */
  function bars(spec) {
    const fig = frame(spec, (host, W, figure) => {
      const horizontal = !!spec.horizontal;
      const n = spec.categories.length;
      const H = spec.height || (horizontal ? Math.max(120, 30 + n * 26) : 220);
      const labelW = horizontal ? Math.min(150, Math.max(...spec.categories.map(c => String(c).length)) * 6.2 + 12) : 0;
      const m = { l: horizontal ? labelW : 46, r: horizontal ? 54 : 12, t: 10, b: horizontal ? 24 : 40, ...(spec.margin || {}) };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': spec.title }, host);
      const pw = W - m.l - m.r; const ph = H - m.t - m.b;
      const groups = spec.series.length;
      let vmax = 0; let vmin = 0;
      for (let i = 0; i < n; i++) {
        if (spec.stacked) { let pos = 0; let neg = 0; for (const s of spec.series) { const v = s.y[i] || 0; if (v >= 0) pos += v; else neg += v; } vmax = Math.max(vmax, pos); vmin = Math.min(vmin, neg); }
        else for (const s of spec.series) { vmax = Math.max(vmax, s.y[i] || 0); vmin = Math.min(vmin, s.y[i] || 0); }
      }
      if (spec.max !== undefined) vmax = spec.max; if (spec.min !== undefined) vmin = spec.min;
      const tk = ticks(vmin, vmax, horizontal ? 4 : 4); const top = Math.max(vmax, tk[tk.length - 1]);
      const vs = v => horizontal ? m.l + (v - vmin) / (top - vmin) * pw : m.t + (1 - (v - vmin) / (top - vmin)) * ph;
      const yf = spec.format || fmtNum;
      for (const t of tk) {
        if (horizontal) { el('line', { class: 'grid', x1: vs(t), x2: vs(t), y1: m.t, y2: H - m.b }, svg); el('text', { x: vs(t), y: H - m.b + 15, 'text-anchor': 'middle' }, svg).textContent = yf(t); }
        else { el('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: vs(t), y2: vs(t) }, svg); el('text', { x: m.l - 6, y: vs(t) + 4, 'text-anchor': 'end' }, svg).textContent = yf(t); }
      }
      const slot = (horizontal ? ph : pw) / n;
      const thick = Math.min(24, slot * 0.7 / (spec.stacked ? 1 : groups));
      const base = vs(Math.max(0, vmin));
      const rects = [];
      spec.categories.forEach((cat, i) => {
        const c0 = (horizontal ? m.t : m.l) + slot * i + slot / 2;
        let acc = 0;
        spec.series.forEach((s, k) => {
          const v = s.y[i] || 0;
          const off = spec.stacked ? 0 : (k - (groups - 1) / 2) * (thick + 2);
          const a = spec.stacked ? vs(acc) : base; const bpos = spec.stacked ? vs(acc + v) : vs(v);
          if (spec.stacked) acc += v;
          const color = s.colors ? s.colors[i] : s.color;
          let r;
          if (horizontal) r = el('rect', { x: Math.min(a, bpos), y: c0 + off - thick / 2, width: Math.max(0.5, Math.abs(bpos - a) - (spec.stacked ? 2 : 0)), height: thick, rx: 3, fill: colorOf(color) }, svg);
          else r = el('rect', { x: c0 + off - thick / 2, y: Math.min(a, bpos), width: thick, height: Math.max(0.5, Math.abs(bpos - a) - (spec.stacked ? 2 : 0)), rx: 3, fill: colorOf(color) }, svg);
          r.dataset.i = i; r.dataset.k = k;
          rects.push(r);
          r.addEventListener('pointermove', e => {
            const rr = figure.getBoundingClientRect();
            showTip(figure, e.clientX - rr.left, e.clientY - rr.top, String(cat), [{ name: groups > 1 ? s.name : '', color, value: (s.format || yf)(v) + (spec.unit ? ' ' + spec.unit : '') }]);
            r.style.filter = 'brightness(1.2)';
          });
          r.addEventListener('pointerleave', () => { hideTip(figure); r.style.filter = ''; });
          if (!horizontal || !spec.stacked) {
            if (spec.valueLabels !== false && !spec.stacked && groups === 1 && n <= 14) {
              const t = horizontal ? el('text', { x: bpos + 5, y: c0 + off + 4 }, svg) : el('text', { x: c0, y: bpos - 5, 'text-anchor': 'middle' }, svg);
              t.textContent = yf(v); t.style.fill = 'var(--ink-2)';
            }
          }
        });
        if (horizontal) el('text', { x: m.l - 6, y: c0 + 4, 'text-anchor': 'end' }, svg).textContent = String(cat);
        else if (n <= 16 || i % Math.ceil(n / 12) === 0) { const t = el('text', { x: c0, y: H - m.b + 15, 'text-anchor': 'middle' }, svg); t.textContent = String(cat); }
      });
      el('line', { class: 'axis', x1: horizontal ? vs(Math.max(0, vmin)) : m.l, x2: horizontal ? vs(Math.max(0, vmin)) : W - m.r, y1: horizontal ? m.t : base, y2: horizontal ? H - m.b : base }, svg);
      if (spec.y && spec.y.label) { const t = el('text', { class: 'axis-title', x: 12, y: m.t + ph / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${m.t + ph / 2})` }, svg); t.textContent = spec.y.label; }
      if (spec.x && spec.x.label) el('text', { class: 'axis-title', x: m.l + pw / 2, y: H - 3, 'text-anchor': 'middle' }, svg).textContent = spec.x.label;
    });
    return fig;
  }

  /** Heat map from a function value(i, j) on an (nx x ny) grid rasterised to a canvas. */
  function heat(spec) {
    const fig = frame(spec, (host, W, figure) => {
      const H = spec.height || 230;
      const m = { l: 46, r: spec.colorbar === false ? 12 : 48, t: 8, b: 34, ...(spec.margin || {}) };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': spec.title }, host);
      const pw = W - m.l - m.r; const ph = H - m.t - m.b;
      const cw = Math.max(40, Math.round(pw)); const ch = Math.max(40, Math.round(ph));
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const ctx = cv.getContext('2d'); const img = ctx.createImageData(cw, ch);
      const [lo, hi] = spec.range;
      const rampName = spec.cmap === 'anomaly' ? (A.state.theme === 'light' ? 'divL' : 'divD') : spec.cmap;
      const lut = A.cmap.lut(rampName);
      const { x0, x1, y0, y1 } = spec.extent;
      for (let j = 0; j < ch; j++) {
        const yv = spec.yFlip ? y0 + (j + 0.5) / ch * (y1 - y0) : y1 - (j + 0.5) / ch * (y1 - y0);
        const yy = spec.yMap ? spec.yMap(yv, j / ch) : yv;
        for (let i = 0; i < cw; i++) {
          const xv = x0 + (i + 0.5) / cw * (x1 - x0);
          const v = spec.value(xv, yy);
          const o = (j * cw + i) * 4;
          if (!Number.isFinite(v)) { img.data[o + 3] = 0; continue; }
          const k = clamp(Math.round((v - lo) / (hi - lo) * 255), 0, 255) * 4;
          img.data[o] = lut[k]; img.data[o + 1] = lut[k + 1]; img.data[o + 2] = lut[k + 2]; img.data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const im = el('image', { x: m.l, y: m.t, width: pw, height: ph, preserveAspectRatio: 'none' }, svg);
      im.setAttribute('href', cv.toDataURL());
      const xt = spec.x.ticks || ticks(x0, x1, Math.max(3, Math.round(pw / 70)));
      const yt = spec.y.ticks || ticks(Math.min(y0, y1), Math.max(y0, y1), 5);
      const sxv = v => m.l + (v - x0) / (x1 - x0) * pw;
      const syv = v => spec.yScale ? m.t + spec.yScale(v) * ph : (spec.yFlip ? m.t + (v - y0) / (y1 - y0) * ph : m.t + (1 - (v - y0) / (y1 - y0)) * ph);
      for (const t of xt) { el('line', { class: 'axis', x1: sxv(t), x2: sxv(t), y1: H - m.b, y2: H - m.b + 4 }, svg); el('text', { x: sxv(t), y: H - m.b + 16, 'text-anchor': 'middle' }, svg).textContent = (spec.x.format || fmtNum)(t); }
      for (const t of yt) { el('line', { class: 'axis', x1: m.l - 4, x2: m.l, y1: syv(t), y2: syv(t) }, svg); el('text', { x: m.l - 7, y: syv(t) + 4, 'text-anchor': 'end' }, svg).textContent = (spec.y.format || fmtNum)(t); }
      el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'none', stroke: 'var(--axis)' }, svg);
      if (spec.x.label) el('text', { class: 'axis-title', x: m.l + pw / 2, y: H - 3, 'text-anchor': 'middle' }, svg).textContent = spec.x.label;
      if (spec.y.label) { const t = el('text', { class: 'axis-title', x: 11, y: m.t + ph / 2, 'text-anchor': 'middle', transform: `rotate(-90 11 ${m.t + ph / 2})` }, svg); t.textContent = spec.y.label; }
      for (const l of spec.lines || []) {                     // optional overlay polylines [{pts:[[x,y]...], dash}]
        const d = l.pts.map((p, i) => `${i ? 'L' : 'M'}${sxv(p[0]).toFixed(1)},${syv(p[1]).toFixed(1)}`).join('');
        el('path', { d, fill: 'none', stroke: l.color || 'var(--ink)', 'stroke-width': l.width || 1.5, 'stroke-dasharray': l.dash || null, opacity: 0.9 }, svg);
      }
      for (const tx of spec.texts || []) {
        const t = el('text', { x: sxv(tx.x), y: syv(tx.y), 'text-anchor': 'middle', 'paint-order': 'stroke', stroke: 'rgba(0,0,0,0.55)', 'stroke-width': 3 }, svg);
        t.textContent = tx.text; t.style.fill = '#fff'; t.style.fontSize = '11.5px'; t.style.fontWeight = '600';
      }
      for (const v of (typeof spec.vlines === 'function' ? spec.vlines() : spec.vlines) || []) { if (v.x >= x0 && v.x <= x1) el('line', { x1: sxv(v.x), x2: sxv(v.x), y1: m.t, y2: H - m.b, stroke: 'var(--accent)', 'stroke-width': 1.5 }, svg); }
      if (spec.colorbar !== false) {
        const bx = W - m.r + 12; const g = el('defs', null, svg); const id = 'cb' + Math.random().toString(36).slice(2, 7);
        const lg = el('linearGradient', { id, x1: 0, y1: 1, x2: 0, y2: 0 }, g);
        const stops = A.cmap.defs[rampName]; for (const s of stops) el('stop', { offset: s[0], 'stop-color': s[1] }, lg);
        el('rect', { x: bx, y: m.t, width: 9, height: ph, rx: 4, fill: `url(#${id})` }, svg);
        const ct = spec.cbTicks || ticks(lo, hi, 4);
        for (const t of ct) el('text', { x: bx + 13, y: m.t + (1 - (t - lo) / (hi - lo)) * ph + 4 }, svg).textContent = (spec.cbFormat || fmtNum)(t);
      }
      const hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', e => {
        const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); const py = (e.clientY - r.top) * (H / r.height);
        const xv = x0 + (px - m.l) / pw * (x1 - x0);
        const fy = clamp((py - m.t) / ph, 0, 1);
        const yv = spec.yMap ? spec.yMap(spec.yFlip ? y0 + fy * (y1 - y0) : y1 - fy * (y1 - y0), fy) : (spec.yFlip ? y0 + fy * (y1 - y0) : y1 - fy * (y1 - y0));
        const v = spec.value(xv, yv);
        showTip(figure, px * (r.width / W), py * (r.height / H), `${(spec.x.tip || spec.x.format || fmtNum)(xv)}  ·  ${(spec.y.tip || spec.y.format || fmtNum)(yv)}`, [{ value: Number.isFinite(v) ? (spec.cbFormat || fmtNum)(v) + (spec.unit ? ' ' + spec.unit : '') : 'no data' }]);
      });
      hit.addEventListener('pointerleave', () => hideTip(figure));
    });
    return fig;
  }

  /** Scatter plot with nearest-point hover.  points: [[x, y, colorIndexOrCss?]] */
  function scatter(spec) {
    const fig = frame(spec, (host, W, figure) => {
      const H = spec.height || 240;
      const m = { l: 52, r: 14, t: 10, b: 40 };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': spec.title }, host);
      const pw = W - m.l - m.r; const ph = H - m.t - m.b;
      const [x0, x1] = spec.xRange; const [y0, y1] = spec.yRange;
      const sx = v => m.l + (v - x0) / (x1 - x0) * pw;
      const sy = v => (spec.yInvert ? m.t + (v - y0) / (y1 - y0) * ph : m.t + (1 - (v - y0) / (y1 - y0)) * ph);
      for (const t of ticks(y0, y1, 5)) { el('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }, svg); el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, svg).textContent = fmtNum(t); }
      for (const t of ticks(x0, x1, 6)) { el('line', { class: 'axis', x1: sx(t), x2: sx(t), y1: H - m.b, y2: H - m.b + 4 }, svg); el('text', { x: sx(t), y: H - m.b + 16, 'text-anchor': 'middle' }, svg).textContent = fmtNum(t); }
      el('line', { class: 'axis', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
      el('text', { class: 'axis-title', x: m.l + pw / 2, y: H - 4, 'text-anchor': 'middle' }, svg).textContent = spec.x.label;
      const t = el('text', { class: 'axis-title', x: 12, y: m.t + ph / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${m.t + ph / 2})` }, svg); t.textContent = spec.y.label;
      const g = el('g', null, svg);
      for (const p of spec.points) el('circle', { cx: sx(p[0]), cy: sy(p[1]), r: spec.r || 2.6, fill: colorOf(p[2] !== undefined ? p[2] : 0), opacity: 0.5 }, g);
      if (spec.curve) el('path', { d: spec.curve.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(''), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
      const ring = el('circle', { r: 6, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, opacity: 0, 'pointer-events': 'none' }, svg);
      const hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', e => {
        const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); const py = (e.clientY - r.top) * (H / r.height);
        let best = null; let bd = 24 * 24;
        for (const p of spec.points) { const d = (sx(p[0]) - px) ** 2 + (sy(p[1]) - py) ** 2; if (d < bd) { bd = d; best = p; } }
        if (best) { ring.setAttribute('cx', sx(best[0])); ring.setAttribute('cy', sy(best[1])); ring.setAttribute('opacity', 1); showTip(figure, sx(best[0]) * (r.width / W), sy(best[1]) * (r.height / H), '', [{ name: spec.x.short || spec.x.label, value: fmtNum(best[0]) }, { name: spec.y.short || spec.y.label, value: fmtNum(best[1]) }]); }
        else { ring.setAttribute('opacity', 0); hideTip(figure); }
      });
      hit.addEventListener('pointerleave', () => { ring.setAttribute('opacity', 0); hideTip(figure); });
    });
    return fig;
  }

  /** Vertical profile: horizontal axis is the quantity, vertical axis is height (or pressure). */
  function profile(spec) {
    const fig = frame(spec, (host, W, figure) => {
      const H = spec.height || 300;
      const m = { l: 50, r: spec.rightLabels ? 96 : 14, t: 10, b: 36 };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': spec.title }, host);
      const pw = W - m.l - m.r; const ph = H - m.t - m.b;
      const [y0, y1] = spec.yRange;
      let xmin = Infinity; let xmax = -Infinity;
      for (const s of spec.series) for (const v of s.x) if (v !== null && Number.isFinite(v)) { xmin = Math.min(xmin, v); xmax = Math.max(xmax, v); }
      if (spec.xRange) { xmin = spec.xRange[0]; xmax = spec.xRange[1]; } else { const pad = (xmax - xmin) * 0.05; xmin -= pad; xmax += pad; }
      const lx = spec.xLog ? Math.log10 : (v => v);
      const sx = v => m.l + (lx(v) - lx(xmin)) / (lx(xmax) - lx(xmin)) * pw;
      const sy = v => m.t + (1 - (v - y0) / (y1 - y0)) * ph;
      const xt = spec.xTicks || ticks(xmin, xmax, 5);
      const yt = spec.yTicks || ticks(y0, y1, 6);
      for (const t of yt) { el('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }, svg); el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, svg).textContent = (spec.yFormat || fmtNum)(t); }
      for (const t of xt) { el('line', { class: 'axis', x1: sx(t), x2: sx(t), y1: H - m.b, y2: H - m.b + 4 }, svg); el('text', { x: sx(t), y: H - m.b + 16, 'text-anchor': 'middle' }, svg).textContent = (spec.xFormat || fmtNum)(t); }
      el('line', { class: 'axis', x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }, svg);
      el('line', { class: 'axis', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
      const xl = typeof spec.xLabel === 'function' ? spec.xLabel() : spec.xLabel;
      const yl = typeof spec.yLabel === 'function' ? spec.yLabel() : spec.yLabel;
      if (xl) el('text', { class: 'axis-title', x: m.l + pw / 2, y: H - 4, 'text-anchor': 'middle' }, svg).textContent = xl;
      if (yl) { const t = el('text', { class: 'axis-title', x: 12, y: m.t + ph / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${m.t + ph / 2})` }, svg); t.textContent = yl; }
      for (const b of spec.layers || []) {
        const ya = sy(b.from); const yb = sy(b.to);
        el('rect', { x: m.l, y: yb, width: pw, height: ya - yb, fill: b.fill || 'var(--ink-3)', opacity: b.opacity || 0.07 }, svg);
        if (b.label) { const t = el('text', { x: W - m.r + 6, y: (ya + yb) / 2 + 4 }, svg); t.textContent = b.label; t.style.fill = 'var(--ink-2)'; }
        el('line', { x1: m.l, x2: W - m.r, y1: yb, y2: yb, stroke: 'var(--ink-3)', 'stroke-dasharray': '2 3', opacity: 0.5 }, svg);
      }
      for (const s of spec.series) {
        const d = s.x.map((v, i) => (v === null || !Number.isFinite(v) ? null : `${sx(v).toFixed(1)},${sy(s.y[i]).toFixed(1)}`)).filter(Boolean);
        el('path', { d: 'M' + d.join('L'), fill: 'none', stroke: colorOf(s.color), 'stroke-width': s.width || 2, 'stroke-linejoin': 'round', 'stroke-dasharray': s.dash || null }, svg);
      }
      const cross = el('line', { x1: m.l, x2: W - m.r, stroke: 'var(--ink-3)', opacity: 0, 'pointer-events': 'none' }, svg);
      const hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', e => {
        const r = svg.getBoundingClientRect(); const py = (e.clientY - r.top) * (H / r.height);
        const yv = y0 + (1 - (clamp(py, m.t, H - m.b) - m.t) / ph) * (y1 - y0);
        const rows = [];
        for (const s of spec.series) {
          let best = 0;
          for (let i = 1; i < s.y.length; i++) if (Math.abs(s.y[i] - yv) < Math.abs(s.y[best] - yv)) best = i;
          if (s.x[best] !== null && Number.isFinite(s.x[best])) rows.push({ name: spec.series.length > 1 ? s.name : '', color: s.color, value: (s.format || spec.xFormat || fmtNum)(s.x[best]) + (spec.unit ? ' ' + spec.unit : '') });
        }
        cross.setAttribute('y1', sy(yv)); cross.setAttribute('y2', sy(yv)); cross.setAttribute('opacity', 0.6);
        showTip(figure, (m.l + pw * 0.5) * (r.width / W), sy(yv) * (r.height / H), `${(spec.yFormat || fmtNum)(yv)} ${spec.yUnit || ''}`, rows);
      });
      hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); hideTip(figure); });
    });
    return fig;
  }

  return { line, bars, heat, scatter, profile, ticks, fmtNum, colorOf };
})();
