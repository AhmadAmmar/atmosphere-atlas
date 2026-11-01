/* ------------------------------------------------------------------ chart catalogue, part 3: reading weather maps */

/** Draw a wind barb (Northern Hemisphere): the staff points to where the wind comes FROM, barbs lie on the clockwise side. */
function windBarb(svg, x, y, fromDeg, knots, color = 'var(--ink)', len = 44) {
  const g = h('g', { transform: `translate(${x} ${y}) rotate(${fromDeg})`, stroke: color, 'stroke-width': 1.8, fill: color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  if (knots < 3) { g.append(h('circle', { r: 7, fill: 'none' }), h('circle', { r: 11, fill: 'none' })); svg.append(g); return; }
  g.append(h('line', { x1: 0, y1: 0, x2: 0, y2: -len }));
  let k = Math.round(knots / 5) * 5; let pos = len;
  const barbLen = 13;
  while (k >= 50) { g.append(h('path', { d: `M0 ${-pos} L${barbLen} ${-pos + 3} L0 ${-pos + 8} Z` })); pos -= 9; k -= 50; }
  while (k >= 10) { g.append(h('line', { x1: 0, y1: -pos, x2: barbLen, y2: -pos - 6 })); pos -= 6; k -= 10; }
  if (k >= 5) { if (pos === len) pos -= 6; g.append(h('line', { x1: 0, y1: -pos, x2: barbLen / 2, y2: -pos - 3 })); }
  svg.append(g);
}

A.chartLib.stationModel = () => {
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, 'How a weather station is drawn on a map'),
    h('div', { class: 'cs' }, 'Every observing station is shown as a small cluster of numbers and symbols around a circle. The example station reports 14 °C, a dew point of 9 °C, a pressure of 1013.2 hPa that has risen by 1.2 hPa in the last three hours, half the sky covered by cloud and a wind of 15 knots from the north-west.'));
  const W = 560; const H = 330;
  const svg = h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Weather station model with wind barbs' });
  const cx = 190; const cy = 120;
  const text = (x, y, t, o = {}) => { const e = h('text', { x, y, 'font-size': o.size || 15, 'font-weight': o.weight || 700, 'text-anchor': o.anchor || 'middle' }, t); e.style.fill = o.fill || 'var(--ink)'; svg.append(e); return e; };
  const note = (x, y, lines, anchor = 'start') => lines.forEach((t, i) => text(x, y + i * 14, t, { size: 11.5, weight: 500, anchor, fill: 'var(--ink-2)' }));
  const lead = (x0, y0, x1, y1) => svg.append(h('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
  // the station circle: half filled for four oktas of cloud
  svg.append(h('circle', { cx, cy, r: 17, fill: 'var(--surface)', stroke: 'var(--ink)', 'stroke-width': 1.8 }));
  svg.append(h('path', { d: `M${cx} ${cy - 17} A17 17 0 0 1 ${cx} ${cy + 17} Z`, fill: 'var(--ink)' }));
  windBarb(svg, cx, cy, 315, 15, 'var(--ink)', 56);
  text(cx - 36, cy - 14, '14', { anchor: 'end' });
  text(cx - 36, cy + 26, '9', { anchor: 'end', fill: 'var(--s1)' });
  text(cx + 36, cy - 14, '132', { anchor: 'start' });
  text(cx + 36, cy + 26, '+12', { anchor: 'start' });
  text(cx - 36, cy + 5, '●', { anchor: 'end', size: 17, fill: 'var(--s1)' });
  // leaders and notes
  lead(cx - 62, cy - 18, 70, 40); note(66, 34, ['Air temperature', '14 °C'], 'end');
  lead(cx - 62, cy + 22, 70, 208); note(66, 202, ['Dew point', '9 °C'], 'end');
  lead(cx - 56, cy + 3, 70, 120); note(66, 114, ['Weather now', 'a dot is rain'], 'end');
  lead(cx + 70, cy - 20, 330, 40); note(336, 34, ['Pressure', '132 means 1013.2 hPa', '(drop the 10 or 9, keep the tenths)']);
  lead(cx + 70, cy + 22, 330, 110); note(336, 104, ['Pressure change in 3 hours', '+12 means up 1.2 hPa']);
  lead(cx + 20, cy + 6, 330, 170); note(336, 164, ['Cloud cover', 'the circle shows how much sky is covered:', 'empty = clear, half = four eighths, full = overcast']);
  lead(cx - 40, cy - 40, 120, 20); note(126, 14, ['Wind: the staff points', 'towards where the wind blows from']);
  // key of barbs
  const keyY = 262;
  text(20, keyY - 28, 'Wind speed key (knots; 1 knot is about 1.85 km/h)', { size: 11.5, weight: 700, anchor: 'start', fill: 'var(--ink-2)' });
  [[2, 'calm'], [5, '5'], [10, '10'], [15, '15'], [25, '25'], [50, '50'], [65, '65']].forEach(([kt, label], i) => {
    const x = 50 + i * 76;
    windBarb(svg, x, keyY + 22, 0, kt, 'var(--ink)', 34);
    text(x, keyY + 40, label, { size: 11, weight: 500, fill: 'var(--ink-2)' });
  });
  fig.append(svg);
  return fig;
};

/** The cycle that produces a weather forecast, from observations to products and back round every few hours. */
A.chartLib.forecastCycle = () => {
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, 'How a forecast is made'),
    h('div', { class: 'cs' }, 'The loop is repeated every six or twelve hours at the big forecasting centres. The short forecast from the last run is the first guess for the next one, which is corrected with the latest observations.'));
  const W = 560; const H = 250;
  const svg = h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Forecast cycle' });
  svg.append(h('defs', null, h('marker', { id: 'fa', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 10 5 0 10z', fill: 'context-stroke' }))));
  const boxes = [
    [10, 20, 'Observations', 'satellites, balloons, aircraft, ships, buoys, radar, stations', 1],
    [200, 20, 'Data assimilation', 'blend the observations with the last forecast to get the best picture of the air now', 2],
    [390, 20, 'Computer model', 'equations of motion, heat and water solved on millions of grid points', 3],
    [390, 150, 'Ensemble', 'many runs from slightly different starts show how sure the forecast is', 4],
    [200, 150, 'Forecast products', 'maps, warnings, rain and temperature for each place and hour', 5],
    [10, 150, 'People and decisions', 'farmers, pilots, ships, emergency services, you', 0],
  ];
  const bw = 160; const bh = 80;
  boxes.forEach(([x, y, title, sub, k]) => {
    svg.append(h('rect', { x, y, width: bw, height: bh, rx: 10, fill: 'var(--surface-2, var(--surface))', stroke: `var(--s${k || 6})`, 'stroke-width': 2 }));
    const t = h('text', { x: x + 10, y: y + 22, 'font-size': 13.5, 'font-weight': 700 }, title); t.style.fill = 'var(--ink)'; svg.append(t);
    const words = sub.split(' '); let line = ''; let row = 0;
    words.forEach(wd => { if ((line + wd).length > 28) { const e = h('text', { x: x + 10, y: y + 40 + row * 14, 'font-size': 11 }, line.trim()); e.style.fill = 'var(--ink-2)'; svg.append(e); line = ''; row++; } line += `${wd} `; });
    const e = h('text', { x: x + 10, y: y + 40 + row * 14, 'font-size': 11 }, line.trim()); e.style.fill = 'var(--ink-2)'; svg.append(e);
  });
  const arrow = (x0, y0, x1, y1) => svg.append(h('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'var(--ink-3)', 'stroke-width': 2.2, 'marker-end': 'url(#fa)' }));
  arrow(170, 60, 198, 60); arrow(360, 60, 388, 60); arrow(470, 102, 470, 148); arrow(388, 190, 362, 190); arrow(198, 190, 172, 190);
  arrow(280, 148, 280, 102); // the forecast is the first guess for the next cycle
  const note = h('text', { x: 288, y: 128, 'font-size': 10.5 }, 'first guess for the next run'); note.style.fill = 'var(--ink-3)'; svg.append(note);
  fig.append(svg);
  return fig;
};
