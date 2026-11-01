/* ------------------------------------------------------------------ smaller interactive scenes and front diagrams */
A.widgetFactories.push(() => {
  /* ---------------------------------------------------------- sea and land breezes through the day */
  A.widgets.breeze = {
    enter() {
      const st = { hour: 14 };
      const W = 560; const H = 250;
      const box = A.canvasBox(W, H);
      const read = A.ui.readout();
      const land = h24 => 18 + 9 * Math.sin(TAU * (h24 - 9) / 24);          // land surface temperature through the day
      const sea = 18.5;
      const draw = () => {
        const { ctx } = box;
        const tl = land(st.hour); const dT = tl - sea;
        ctx.clearRect(0, 0, W, H);
        const sky = ctx.createLinearGradient(0, 0, 0, H); const night = Math.max(0, Math.min(1, 0.5 - Math.sin(TAU * (st.hour - 6) / 24) * 0.7));
        sky.addColorStop(0, `rgb(${20 + 90 * (1 - night)},${30 + 120 * (1 - night)},${60 + 150 * (1 - night)})`); sky.addColorStop(1, `rgb(${40 + 150 * (1 - night)},${60 + 140 * (1 - night)},${90 + 120 * (1 - night)})`);
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1d5d9b'; ctx.fillRect(0, 170, 270, 80);
        ctx.fillStyle = '#5a6b3a'; ctx.beginPath(); ctx.moveTo(270, 170); ctx.lineTo(W, 170); ctx.lineTo(W, H); ctx.lineTo(270, H); ctx.closePath(); ctx.fill();
        // sun or moon
        const sx = 60 + (st.hour / 24) * (W - 120); const sy = 120 - 90 * Math.sin(Math.PI * clamp((st.hour - 6) / 12, 0, 1));
        ctx.fillStyle = st.hour > 6 && st.hour < 18 ? '#ffd34d' : '#dfe6f2'; ctx.beginPath(); ctx.arc(sx, st.hour > 6 && st.hour < 18 ? sy : 40, 13, 0, TAU); ctx.fill();
        const arrow = (x0, y0, x1, y1, col, wd) => {
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          const a = Math.atan2(y1 - y0, x1 - x0);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - 0.45), y1 - 9 * Math.sin(a - 0.45)); ctx.lineTo(x1 - 9 * Math.cos(a + 0.45), y1 - 9 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
        };
        const k = clamp(Math.abs(dT) / 8, 0, 1);
        if (k > 0.05) {
          const dir = dT > 0 ? 1 : -1;                       // +1: low-level flow towards the land (sea breeze)
          const len = 40 + 90 * k;
          for (let i = 0; i < 3; i++) {
            const x = 150 + i * 130;
            arrow(x - dir * len / 2, 156, x + dir * len / 2, 156, '#9fd0ff', 3.2);
            arrow(x + dir * len / 2, 56, x - dir * len / 2, 56, '#ffb35c', 2.2);
          }
          const cx = dT > 0 ? 400 : 140;
          arrow(cx, 150, cx, 70, dT > 0 ? '#ffb35c' : '#9fd0ff', 2.2);
          ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(dT > 0 ? 'warm air rises over the land' : 'air rises over the warmer sea', cx, 40);
        }
        if (dT > 5) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(380 + i * 38, 70 - i * 3, 13 + i, 0, TAU); ctx.arc(396 + i * 38, 62 - i * 3, 11, 0, TAU); ctx.fill(); } }
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(`Sea ${A.fmt.temp(sea, 0)}`, 12, 238); ctx.textAlign = 'right'; ctx.fillText(`Land ${A.fmt.temp(tl, 0)}`, W - 12, 238);
        ctx.textAlign = 'center'; ctx.fillText(`${String(Math.floor(st.hour)).padStart(2, '0')}:${String(Math.round((st.hour % 1) * 60)).padStart(2, '0')} local time`, W / 2, 238);
        clear(read);
        read.append(Math.abs(dT) < 1 ? 'Land and sea are about equally warm: little or no breeze.' : dT > 0 ? `The land is ${dT.toFixed(0)} °C warmer than the sea: a sea breeze blows onshore at the surface (blue), with a return flow aloft (orange)${dT > 5 ? '. Cumulus clouds grow over the land' : ''}.` : `The land is ${(-dT).toFixed(0)} °C cooler than the sea: a land breeze blows offshore at the surface, much gentler than the daytime sea breeze.`);
      };
      A.sceneCtl.show('A coast through one day', c => {
        c.append(box.canvas);
        c.append(A.ui.slider('Hour of the day', { min: 0, max: 23.5, step: 0.5, value: st.hour, format: v => `${String(Math.floor(v)).padStart(2, '0')}:${v % 1 ? '30' : '00'}`, onInput: v => { st.hour = v; draw(); } }).row, read);
      });
      draw();
    },
    exit() {},
  };

  /* ---------------------------------------------------------- named winds around the world */
  A.widgets.namedwinds = {
    enter() {
      const g = A.globe; const winds = A.data.namedWinds;
      const pts = new GeoPoints(g, { height: 0.01, order: 8, ring: true });
      this.pts = pts;
      const col = { 'cold downslope': [0.5, 0.75, 1, 1], 'warm downslope': [1, 0.7, 0.4, 1] };
      pts.set(winds.map(w => ({ lon: w.lon, lat: w.lat, color: col[w.kind] || [1, 0.82, 0.45, 1], size: 11 })));
      const read = A.ui.readout();
      const show = w => {
        g.flyTo(w.lon, w.lat, 2.0, 1300);
        g.labels.removeGroup('scene');
        g.labels.add({ id: 'nw', group: 'scene', text: w.name, lon: w.lon, lat: w.lat, cls: 'note pin', nocollide: true, priority: 100 });
        clear(read);
        read.append(h('div', null, h('b', null, w.name), ` · ${w.kind}`), h('div', null, w.text));
      };
      const select = h('select', { class: 'small-select', 'aria-label': 'Choose a wind', onchange: e => show(winds[+e.target.value]) }, winds.map((w, i) => h('option', { value: i }, `${w.name} (${w.kind})`)));
      A.sceneCtl.show('Local winds of the world', c => { c.append(h('div', { class: 'row' }, select), read); });
      show(winds[0]);
    },
    exit() { this.pts.clear(); A.globe.labels.removeGroup('scene'); },
  };
});

A.chartLib.namedWindsTable = () => A.tableFig('Named winds and what makes them', ['Wind', 'Kind', 'Description'], A.data.namedWinds.map(w => [w.name, w.kind, w.text]));

/* ------------------------------------------------------------------ fronts in cross-section */
function frontDiagram(kind) {
  const W = 560; const H = 250;
  const titles = {
    cold: ['Cold front: a steep wedge of cold air', 'Cold, dense air undercuts the warm air ahead of it. The slope is steep (about 1 in 50) so the warm air is forced up quickly: tall storm clouds and a narrow band of heavy, short-lived rain. After it passes the air is colder, the pressure rises and the sky clears.'],
    warm: ['Warm front: a gentle ramp', 'Warm air glides up over a retreating wedge of cold air on a shallow slope (about 1 in 150). Cloud thickens gradually over a wide area, from high cirrus a day ahead to thick rain cloud at the front. After it passes the air is warmer and often drizzly and murky.'],
    occluded: ['Occluded front: the cold front catches the warm front', 'The faster cold front overtakes the warm front and lifts the whole warm sector off the ground. At the surface only cooler air remains, with a band of cloud and rain from both former fronts. This is the stage when a depression is at its deepest, and it soon starts to fill.'],
  };
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, titles[kind][0]), h('div', { class: 'cs' }, titles[kind][1]));
  const svg = h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': titles[kind][0] });
  const ground = 205; const top = 28;
  const poly = (pts, fill, opacity, stroke) => svg.append(h('polygon', { points: pts.map(p => p.join(',')).join(' '), fill, opacity, stroke: stroke || 'none', 'stroke-width': 1.5 }));
  svg.append(h('rect', { x: 0, y: top, width: W, height: ground - top, fill: 'var(--s2)', opacity: 0.09 }));
  const cloud = (x, y, s, tall) => {
    const g = h('g', { opacity: 0.95 });
    const c = (cx, cy, r) => g.append(h('circle', { cx, cy, r, fill: 'var(--surface)', stroke: 'var(--ink-3)', 'stroke-width': 1.2 }));
    c(x, y, 14 * s); c(x + 16 * s, y - 6 * s, 16 * s); c(x + 34 * s, y, 13 * s); c(x + 16 * s, y + 6 * s, 14 * s);
    if (tall) { c(x + 12 * s, y - 24 * s, 14 * s); c(x + 24 * s, y - 40 * s, 15 * s); c(x + 10 * s, y - 54 * s, 13 * s); }
    svg.append(g);
  };
  const rain = (x0, x1, y0) => { for (let x = x0; x < x1; x += 11) svg.append(h('line', { x1: x, y1: y0, x2: x - 4, y2: ground - 2, stroke: 'var(--s1)', 'stroke-width': 1.6, opacity: 0.8 })); };
  const label = (x, y, text, anchor = 'middle', size = 12, weight = 600) => { const t = h('text', { x, y, 'text-anchor': anchor, 'font-size': size, 'font-weight': weight }, text); t.style.fill = 'var(--ink)'; svg.append(t); };
  const arrow = (x0, y0, x1, y1, col) => svg.append(h('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: col, 'stroke-width': 3, 'marker-end': 'url(#fa)' }));
  svg.append(h('defs', null, h('marker', { id: 'fa', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 10 5 0 10z', fill: 'context-stroke' }))));
  if (kind === 'warm') {
    poly([[20, ground], [520, ground], [330, ground], [30, top + 10]].slice(0, 0), 'none', 0);
    poly([[40, ground], [500, ground], [500, ground - 6], [330, ground - 6]], 'var(--s1)', 0);
    poly([[500, ground], [330, ground], [60, top + 18], [60, ground], [500, ground]].slice(0, 5), 'var(--s1)', 0.35);
    poly([[330, ground], [60, top + 18], [60, ground]], 'var(--s1)', 0.4);
    poly([[330, ground], [500, ground], [500, ground - 2]], 'var(--s1)', 0);
    svg.append(h('line', { x1: 330, y1: ground, x2: 60, y2: top + 18, stroke: 'var(--s2)', 'stroke-width': 3 }));
    cloud(80, 50, 0.7); cloud(140, 70, 0.8); cloud(200, 96, 0.9); cloud(260, 125, 1.0); cloud(300, 158, 1.0);
    rain(250, 345, 150);
    label(100, 30, 'cirrus'); label(160, 52, 'cirrostratus'); label(236, 82, 'altostratus'); label(325, 120, 'nimbostratus');
    label(470, 125, 'warm air', 'middle', 13, 700); label(130, 188, 'cold air', 'middle', 13, 700);
    arrow(430, 100, 500, 100, 'var(--s2)'); label(465, 90, 'front moves', 'middle', 11, 500);
    label(330, 224, 'surface front', 'middle', 11, 500);
  } else if (kind === 'cold') {
    poly([[200, ground], [20, ground], [20, ground - 6], [196, ground - 6]], 'var(--s1)', 0);
    poly([[200, ground], [545, ground], [545, 95], [500, 70], [380, 130], [260, 168], [200, ground]], 'var(--s1)', 0.4);
    svg.append(h('path', { d: `M200 ${ground} C 205 ${ground - 20} 250 ${ground - 45} 380 130 S 500 70 545 70`, stroke: 'var(--s2)', 'stroke-width': 3, fill: 'none' }));
    cloud(200, 128, 1.3, true); cloud(255, 120, 0.9); cloud(160, 70, 0.7);
    rain(205, 290, 160);
    label(80, 100, 'warm air', 'middle', 13, 700); label(440, 160, 'cold air', 'middle', 13, 700);
    label(235, 38, 'cumulonimbus', 'middle', 12);
    arrow(480, 190, 400, 190, 'var(--s1)'); label(440, 180, 'front moves', 'middle', 11, 500);
    label(200, 224, 'surface front', 'middle', 11, 500);
  } else {
    poly([[20, ground], [545, ground], [545, 115], [420, 140], [340, 165], [300, 195], [250, ground]], 'var(--s1)', 0.4);
    svg.append(h('path', { d: `M250 ${ground} C 255 ${ground - 25} 300 180 340 165 S 480 120 545 112`, stroke: 'var(--s2)', 'stroke-width': 3, fill: 'none' }));
    poly([[250, ground], [300, 195], [340, 165], [380, 135], [330, 80], [250, 100], [150, 140], [40, ground - 10], [60, ground]], 'var(--s2)', 0.18);
    cloud(260, 150, 1.1, true); cloud(130, 120, 0.9); cloud(70, 90, 0.7);
    rain(230, 300, 180); rain(100, 160, 160);
    label(80, 60, 'warm air lifted aloft', 'start', 12, 700); label(430, 190, 'cooler air', 'middle', 13, 700); label(110, 205, 'cold air', 'middle', 13, 700);
    label(255, 224, 'surface occlusion', 'middle', 11, 500);
  }
  fig.append(svg);
  return fig;
}
A.chartLib.frontCold = () => frontDiagram('cold');
A.chartLib.frontWarm = () => frontDiagram('warm');
A.chartLib.frontOccluded = () => frontDiagram('occluded');
