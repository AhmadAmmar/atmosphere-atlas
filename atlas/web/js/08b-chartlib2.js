/* ------------------------------------------------------------------ chart catalogue, part 2 */
const tempFmt = v => A.chart.fmtNum(A.units.convert(v, 'degC'));
const tempUnit = () => A.units.label('degC');

A.tableFig = function tableFig(title, head, rows, subtitle) {
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, title));
  if (subtitle) fig.append(h('div', { class: 'cs' }, A.rich(subtitle)));
  fig.append(h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'data' }, h('thead', null, h('tr', null, head.map(c => h('th', null, c)))),
    h('tbody', null, rows.map(r => h('tr', null, r.map((c, i) => h('td', { class: i > 0 && /^[\d.−\-+]/.test(String(c)) ? 'n' : '' }, A.rich(String(c))))))))));
  return fig;
};

/* ------------------------------------------------------------------ the air around us */
A.chartLib.stdAtmosphere = () => {
  const s = T().atmosphere;
  return A.chart.profile({
    title: 'Temperature up through the atmosphere', subtitle: 'U.S. Standard Atmosphere. Temperature falls through the troposphere, rises through the stratosphere (ozone), falls again in the mesosphere and soars in the thermosphere.', height: 330, rightLabels: true,
    series: [{ name: 'Temperature', x: s.tempC, y: s.altitudeKm, color: 1 }], yRange: [0, 120], yTicks: [0, 20, 40, 60, 80, 100, 120], xRange: [-100, 380], xTicks: [-100, 0, 100, 200, 300], xFormat: tempFmt, xLabel: () => `Temperature (${tempUnit()})`, yLabel: 'Altitude (km)', yUnit: 'km', unit: '',
    layers: [{ from: 0, to: 11, label: 'Troposphere', fill: 'var(--s1)', opacity: 0.12 }, { from: 11, to: 50, label: 'Stratosphere', fill: 'var(--s3)', opacity: 0.1 }, { from: 50, to: 85, label: 'Mesosphere', fill: 'var(--s7)', opacity: 0.1 }, { from: 85, to: 120, label: 'Thermosphere', fill: 'var(--s5)', opacity: 0.1 }],
    table: () => ({ head: ['Altitude (km)', `Temperature (${tempUnit()})`, 'Pressure (hPa)'], rows: [0, 5, 11, 20, 30, 47, 60, 80, 86].map(z => [z, tempFmt(s.tempC[z]), s.pressureHpa[z] === null ? '–' : s.pressureHpa[z]]) }),
  });
};

A.chartLib.pressureAltitude = () => {
  const s = T().atmosphere;
  const zs = s.altitudeKm.filter((z, i) => s.pressureHpa[i] !== null);
  const ps = s.pressureHpa.filter(v => v !== null);
  return A.chart.profile({
    title: 'Air pressure thins out with height', subtitle: 'Pressure falls by about 10% for every kilometre near the ground. Half of all the air is below 5.5 km, and 99% is below 32 km.', height: 300,
    series: [{ name: 'Pressure', x: ps, y: zs, color: 0 }], yRange: [0, 86], yTicks: [0, 10, 20, 30, 50, 70, 86], xLog: true, xRange: [0.003, 1100], xTicks: [0.01, 0.1, 1, 10, 100, 1000],
    xLabel: 'Pressure (hPa, logarithmic scale)', yLabel: 'Altitude (km)', yUnit: 'km', unit: 'hPa', xFormat: v => A.chart.fmtNum(v),
    layers: [{ from: 0, to: 11, label: 'Troposphere', opacity: 0.09 }, { from: 11, to: 50, label: 'Stratosphere', opacity: 0.06 }, { from: 50, to: 86, label: 'Mesosphere', opacity: 0.09 }], rightLabels: true,
  });
};

A.chartLib.composition = () => {
  const comp = T().composition;
  const main = comp.slice(0, 3); const rest = comp.slice(3);
  const pct = ppm => ppm / 10000;
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, 'What dry air is made of'), h('div', { class: 'cs' }, 'By volume. Almost all of it is nitrogen and oxygen; the gases that matter most for climate are traces.'));
  const bar = h('div', { style: { display: 'flex', height: '26px', borderRadius: '6px', overflow: 'hidden', gap: '2px', margin: '6px 0 10px' } },
    main.map((g, i) => h('div', { style: { flex: `${pct(g.ppm)} 0 0`, background: `var(--s${[1, 2, 3][i]})`, minWidth: i === 2 ? '10px' : '0' }, title: `${g.gas}: ${pct(g.ppm).toFixed(2)}%` })));
  fig.append(bar);
  fig.append(h('div', { class: 'legend' }, main.map((g, i) => h('span', null, h('i', { class: 'box', style: { background: `var(--s${[1, 2, 3][i]})` } }), `${g.gas} ${pct(g.ppm).toFixed(2)}%`))));
  fig.append(h('table', { class: 'data' }, h('thead', null, h('tr', null, h('th', null, 'Trace gas'), h('th', null, 'Formula'), h('th', { style: { textAlign: 'right' } }, 'Parts per million'))),
    h('tbody', null, rest.map(g => h('tr', null, h('td', null, g.gas), h('td', null, g.formula.replace('CO2', 'CO₂').replace('CH4', 'CH₄').replace('N2O', 'N₂O').replace('H2', 'H₂')), h('td', { class: 'n' }, g.ppm >= 100 ? g.ppm.toLocaleString('en-GB') : String(g.ppm)))))));
  fig.append(h('div', { class: 'cs' }, 'Water vapour (0 to 4%) is the most variable gas and is not included. The carbon dioxide value is the latest Mauna Loa trend value in the data.'));
  return fig;
};

A.chartLib.satVapour = () => {
  const m = T().moisture;
  return A.chart.line({
    title: 'How much water vapour can air hold?', subtitle: 'Saturation vapour pressure rises about 7% for every degree: warm air holds far more water than cold air.', height: 220,
    series: [{ name: 'Over liquid water', x: m.temps, y: m.satWater, color: 0, marker: false }, { name: 'Over ice', x: m.temps, y: m.satIce, color: 1, marker: false }],
    x: { min: -40, max: 50, ticks: [-40, -20, 0, 20, 40], format: tempFmt, label: () => tempUnit() }, y: { min: 0, label: 'hPa' }, unit: 'hPa', tipX: v => A.fmt.temp(v, 0),
  });
};

A.chartLib.capacity = () => {
  const m = T().moisture;
  return A.chart.line({
    title: 'Grams of water vapour per cubic metre of saturated air', subtitle: 'The reason a hot, humid day feels so heavy and why cooling air makes cloud.', height: 210,
    series: [{ name: 'Maximum water vapour', x: m.temps, y: m.capacityGm3, color: 2, area: true, marker: false }], x: { min: -40, max: 50, ticks: [-40, -20, 0, 20, 40], format: tempFmt }, y: { min: 0, label: 'g/m³' }, unit: 'g/m³', tipX: v => A.fmt.temp(v, 0),
  });
};

A.chartLib.energyDiagram = () => {
  const e = T().energy;
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, 'Where the sunlight goes (global yearly average, W/m²)'),
    h('div', { class: 'cs' }, 'Trenberth, Fasullo and Kiehl (2009). Hover an arrow for its meaning. The numbers on the left add up to the numbers on the right, give or take 1 W/m², which is the imbalance that drives global warming.'));
  const W = 560; const H = 340;
  const svg = h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Energy budget diagram' });
  const defs = h('defs', null, h('marker', { id: 'ar', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M0 0 10 5 0 10z', fill: 'context-stroke' })));
  svg.append(defs);
  svg.append(h('rect', { x: 0, y: 232, width: W, height: 108, rx: 8, fill: 'var(--s1)', opacity: 0.18 }), h('rect', { x: 0, y: 70, width: W, height: 150, rx: 8, fill: 'var(--ink-3)', opacity: 0.09 }));
  svg.append(h('text', { x: 10, y: 244, fill: 'var(--ink-2)', 'font-size': 11 }, 'Surface (land and ocean)'), h('text', { x: 10, y: 84, fill: 'var(--ink-2)', 'font-size': 11 }, 'Atmosphere and clouds'));
  const arrow = (x0, y0, x1, y1, color, label, tip, w = 3, dash) => {
    const g = h('g', { style: { cursor: 'help' } }, h('title', null, tip), h('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: color, 'stroke-width': w, 'marker-end': 'url(#ar)', 'stroke-dasharray': dash || null }));
    const tx = (x0 + x1) / 2; const ty = (y0 + y1) / 2;
    const t = h('text', { x: tx + (x1 === x0 ? 8 : 0), y: ty + (x1 === x0 ? 4 : -6), 'text-anchor': x1 === x0 ? 'start' : 'middle', 'font-size': 12.5, 'font-weight': 700 }, label);
    t.style.fill = 'var(--ink)';
    g.append(t); svg.append(g);
  };
  const sun = 'var(--s4)'; const ir = 'var(--s2)'; const heat = 'var(--s5)';
  arrow(60, 6, 60, 62, sun, `${e.incomingSolar} in`, 'Sunlight arriving at the top of the atmosphere, averaged over the whole globe, day and night.', 5);
  arrow(112, 62, 112, 8, sun, `${e.reflectedByClouds}`, 'Reflected to space by clouds, air molecules and tiny particles.', 3.5, '5 3');
  arrow(160, 232, 160, 8, sun, `${e.reflectedBySurface}`, 'Reflected by bright surfaces: ice, snow, sand, ocean glint.', 2.5, '5 3');
  arrow(60, 82, 60, 136, sun, `${e.absorbedAtmosphere}`, 'Sunlight absorbed in the air itself (ozone, water vapour, clouds).', 3);
  arrow(20, 140, 20, 270, sun, `${e.absorbedSurface}`, 'Sunlight absorbed by land and ocean: the energy source for almost everything.', 4.5);
  arrow(240, 270, 240, 20, ir, `${e.surfaceUp}`, 'Infrared heat radiated upward by the warm surface.', 4.5);
  arrow(300, 100, 300, 262, ir, `${e.backRadiation}`, 'Infrared heat sent back down by greenhouse gases and clouds: the greenhouse effect.', 4);
  arrow(360, 262, 360, 100, heat, `${e.evapotranspiration} evaporation`, 'Heat carried upward as water vapour, released when the vapour condenses into cloud (latent heat).', 3.5);
  arrow(420, 262, 420, 120, heat, `${e.thermals}`, 'Heat carried upward by rising warm air (sensible heat, or thermals).', 2.5);
  arrow(480, 80, 480, 8, ir, `${e.outgoingLongwave} out`, `Heat radiated to space: ${e.atmosphericWindow} straight through the atmospheric window, ${e.emittedByAtmosphere} from the air and ${e.emittedByClouds} from clouds.`, 5);
  svg.append(h('text', { x: 360, y: 318, fill: 'var(--ink-2)', 'font-size': 11.5, 'text-anchor': 'middle' }, `Net: ${e.netAbsorbed} W/m² absorbed. Albedo ${e.albedo.toFixed(2)}.`));
  fig.append(svg);
  fig.append(h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'var(--s4)' } }), 'sunlight'), h('span', null, h('i', { style: { background: 'var(--s2)' } }), 'infrared heat'), h('span', null, h('i', { style: { background: 'var(--s5)' } }), 'heat carried by water vapour and air')));
  return fig;
};

/* ------------------------------------------------------------------ zonal means from the real fields */
function zonalMean(grid, mp, lat) {
  let s = 0; let n = 0;
  for (let i = 0; i < grid.nx; i++) { const v = grid.atMonth(mp, grid.lon0 + i * grid.dlon, lat); if (Number.isFinite(v)) { s += v; n++; } }
  return n ? s / n : null;
}
function zonalChart({ field, title, subtitle, unit, months = [0, 6], yLabel, convert, yMin, yMax, hlines }) {
  const grid = A.layers.grid(field);
  const lats = []; for (let l = -88; l <= 88; l += 2) lats.push(l);
  const series = months.map((m, i) => ({ name: MONTHS[m], x: lats, y: lats.map(l => { const v = zonalMean(grid, { i0: m, i1: m, t: 0 }, l); return v === null ? null : (convert ? convert(v) : v); }), color: i, marker: false }));
  return A.chart.line({ title, subtitle, height: 220, series, x: { min: -90, max: 90, ticks: [-90, -60, -30, 0, 30, 60, 90], format: latFmt, label: 'Latitude' }, y: { label: yLabel || unit, min: yMin, max: yMax }, unit: unit || '', tipX: v => A.fmt.lat(v), hlines });
}
A.chartLib.zonalSLP = () => zonalChart({ field: 'slp', title: 'Average sea-level pressure by latitude', subtitle: 'Highs near 30° (subtropical highs), a trough at the equator and lows near 60°. Compare January and July.', unit: 'hPa', yMin: 995, yMax: 1025, hlines: [{ y: 1013, label: '1013 hPa' }] });
A.chartLib.zonalPrecip = () => zonalChart({ field: 'precip', title: 'Average rainfall by latitude', subtitle: 'Rain peaks at the equatorial ITCZ and in the mid-latitude storm tracks. Deserts sit under the subtropical highs. Note the seasonal shift.', unit: 'mm/day', yMin: 0 });
A.chartLib.zonalTemp = () => zonalChart({ field: 't2m', title: 'Average air temperature by latitude', subtitle: 'From the equator to the poles, mean temperature falls by about 50 °C in winter.', unit: '°C', convert: v => A.units.convert(v, 'degC'), yLabel: tempUnit() });
A.chartLib.zonalSST = () => zonalChart({ field: 'sst', title: 'Average sea-surface temperature by latitude', subtitle: 'The ocean is warmest just north of the equator and never colder than about −1.8 °C, the freezing point of sea water.', unit: '°C', convert: v => A.units.convert(v, 'degC'), yLabel: tempUnit() });

A.chartLib.itczLat = () => {
  const pg = A.layers.grid('precip');
  const sectors = [['Atlantic (50°W–10°W)', -50, -10], ['Africa (10°E–40°E)', 10, 40], ['Indian Ocean (60°E–100°E)', 60, 100], ['Pacific (180–120°W)', -180, -120]];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const centroid = (m, a, b) => { let sw = 0; let sl = 0; for (let lat = -25; lat <= 25; lat += 1) for (let lon = a; lon <= b; lon += 2.5) { const v = pg.at(m, lon, lat); if (v > 0) { sw += v; sl += v * lat; } } return sl / sw; };
  return A.chart.line({
    title: 'The rain belt migrates with the Sun', subtitle: 'Average latitude of tropical rainfall (centre of gravity between 25°N and 25°S). The ITCZ sits north of the equator most of the year, and follows the overhead Sun over land.', height: 230,
    series: sectors.map(([name, a, b], i) => ({ name, x: months, y: months.map((_, m) => centroid(m, a, b)), color: i, marker: false })),
    x: { min: 1, max: 12, ticks: months, format: v => MONTHS3[v - 1][0] }, y: { label: 'Latitude (°N)', min: -15, max: 20, ticks: [-10, 0, 10, 20], format: v => `${v}°` }, hlines: [{ y: 0, label: 'Equator' }], unit: '°N', tipX: v => MONTHS[Math.round(v) - 1],
  });
};

/* ------------------------------------------------------------------ tropical cyclone statistics */
async function stormStats() { await A.loadPack('storms'); return A.packs.storms.json('tc_stats'); }
const asyncChart = (promiseFn, height = 220) => {
  const host = h('div', { style: { minHeight: `${height}px` } });
  promiseFn().then(fig => host.replaceWith(fig)).catch(e => console.error(e));
  return host;
};
A.chartLib.tcCounts = () => asyncChart(async () => {
  const st = await stormStats();
  const years = []; for (let y = st.seasons[0]; y <= st.seasons[1]; y++) years.push(y);
  const names = { NA: 'North Atlantic', EP: 'E. Pacific', WP: 'W. Pacific', NI: 'N. Indian', SI: 'SW Indian', SP: 'Australia/S. Pacific' };
  const codes = ['WP', 'EP', 'NA', 'NI', 'SI', 'SP'];
  return A.chart.bars({
    title: 'Tropical storms per season, 1980 onward', subtitle: 'Storms that reached at least 34 knots (tropical-storm strength), stacked by basin. The latest season is incomplete.', height: 240, stacked: true, categories: years.map(String),
    series: codes.map((c, i) => ({ name: names[c], y: st.byBasin[c].storms, color: i })), unit: 'storms', valueLabels: false,
  });
});
A.chartLib.tcMonthly = () => asyncChart(async () => {
  const st = await stormStats();
  const names = { NA: 'North Atlantic', EP: 'E. Pacific', WP: 'W. Pacific', NI: 'N. Indian', SI: 'SW Indian', SP: 'Australia/S. Pacific' };
  const codes = ['WP', 'EP', 'NA', 'NI', 'SI', 'SP'];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return A.chart.line({
    title: 'When each basin’s storms form', subtitle: 'Average number of storms forming in each month, 1991–2020. Hemispheres swap seasons; the north Indian Ocean has two peaks.', height: 230,
    series: codes.map((c, i) => ({ name: names[c], x: months, y: st.byBasin[c].monthly, color: i, marker: false })), x: { min: 1, max: 12, ticks: months, format: v => MONTHS3[v - 1][0] }, y: { min: 0, label: 'storms per month' }, unit: 'storms', tipX: v => MONTHS[Math.round(v) - 1],
  });
});
A.chartLib.tcCat = () => asyncChart(async () => {
  const st = await stormStats();
  const labels = ['Tropical storm', 'Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'];
  return A.chart.bars({
    title: 'How strong do they get?', subtitle: 'Number of storms (1991–2020) by the greatest intensity each reached, from the best-track record.', height: 210, categories: labels,
    series: [{ name: 'Storms', y: st.categoryCounts.slice(0, 6), color: 0, colors: A.catColors }], unit: 'storms', format: v => A.chart.fmtNum(v),
  });
});
A.chartLib.tcPW = () => asyncChart(async () => {
  const st = await stormStats();
  const pts = st.pressureWind.wind.map((w, i) => [w, st.pressureWind.pres[i], 0]);
  return A.chart.scatter({
    title: 'Deeper low, stronger wind', subtitle: 'Every dot is one six-hourly observation of a storm (about 2,500 of them). Wind speed in knots against the lowest central pressure.', height: 250, points: pts, xRange: [20, 180], yRange: [860, 1020], yInvert: true,
    x: { label: 'Maximum sustained wind (knots)', short: 'Wind (kt)' }, y: { label: 'Central pressure (hPa)', short: 'Pressure (hPa)' },
  });
});
A.chartLib.tcProfile = () => {
  const hp = T().hurricane;
  return A.chart.line({
    title: 'Wind from the centre outward', subtitle: 'Idealised wind speed against distance from the eye. The strongest winds sit in the eyewall; weaker storms are broader.', height: 230,
    series: Object.entries(hp.profiles).map(([name, p], i) => ({ name: `${name} (${p.vmaxKt} kt)`, x: hp.radiusKm, y: p.profileKt, color: i, marker: false })), x: { min: 0, max: 300, label: 'Distance from centre (km)' }, y: { min: 0, label: 'knots' }, unit: 'kt', tipX: v => `${Math.round(v)} km`,
  });
};
A.chartLib.tcAce = () => asyncChart(async () => {
  const st = await stormStats();
  const years = []; for (let y = st.seasons[0]; y <= st.seasons[1]; y++) years.push(y);
  const total = years.map((_, i) => Object.values(st.byBasin).reduce((a, b) => a + b.ace[i], 0));
  const cut = total.length - 1;
  return A.chart.line({
    title: 'Accumulated cyclone energy, worldwide', subtitle: 'ACE adds up the squared wind speed of every storm every six hours, a measure of the total work done by a season. Year-to-year variation is large; ENSO is one cause.', height: 220,
    series: [{ name: 'Each season', x: years.slice(0, cut), y: total.slice(0, cut), color: 0, width: 1.5, marker: false }, { name: '5-year average', x: years.slice(0, cut), y: runningMean(total.slice(0, cut), 5), color: 1, width: 2.8, marker: true }],
    x: { min: st.seasons[0], max: years[cut - 1], ticks: [1985, 1995, 2005, 2015], format: yearFmt }, y: { min: 0, label: '10⁴ kt²' }, unit: '×10⁴ kt²', tipX: yearFmt,
  });
});
A.chartLib.stormHost = () => h('div', { id: 'storm-host', style: { minHeight: '40px' } });

/** Greatest rise in sustained wind over any 24 hours (four six-hour steps) for each storm in the hall of fame. */
const fameIntensification = fame => fame.map(s => {
  let best = 0;
  for (let i = 0; i + 4 < s.track.length; i++) best = Math.max(best, s.track[i + 4][2] - s.track[i][2]);
  return { name: s.name, season: s.season, rise: best, peak: s.peakKt };
}).sort((a, b) => b.rise - a.rise);
A.chartLib.tcRI = () => asyncChart(async () => {
  await A.storms.load();
  const rows = fameIntensification(A.storms.fame).slice(0, 14);
  return A.chart.bars({
    title: 'How fast can a storm strengthen?', subtitle: 'Greatest increase in sustained wind (knots) over any 24 hours, for the strongest storms in the hall of fame, from the six-hourly best-track record. Anything above 30 knots in a day counts as rapid intensification.',
    horizontal: true, height: 330, categories: rows.map(r => `${r.name} ${r.season}`), series: [{ name: 'Wind increase in 24 h', y: rows.map(r => r.rise), color: 2 }], unit: 'kt', format: v => `${A.chart.fmtNum(v)} kt`,
  });
}, 330);
A.chartLib.tcHall = () => asyncChart(async () => {
  await A.storms.load();
  const rows = A.storms.fame.slice().sort((a, b) => b.peakKt - a.peakKt);
  return A.tableFig('Storm hall of fame, ranked by peak wind', ['Storm', 'Season', 'Basin', 'Peak wind (kt)', 'Peak wind (km/h)', 'Lowest pressure (hPa)', 'Energy (ACE)'],
    rows.map(s => [s.name, s.season, s.basin, s.peakKt, Math.round(s.peakKt * 1.852), s.minHpa || 'n/a', s.ace]),
    'Maximum sustained winds and central pressures are from the IBTrACS best-track record (one-minute winds from the US agencies, so values differ slightly from other forecast centres).');
}, 400);


/* ------------------------------------------------------------------ chaos and comfort */
A.chartLib.lorenz = () => {
  const l = T().lorenz;
  const x = l.a.map((_, i) => i * l.dt);
  return A.chart.line({
    title: 'The butterfly effect', subtitle: `Two runs of a simple weather-like model, started a hair apart (${l.eps} in one variable). They track each other for a while and then diverge completely.`, height: 220,
    series: [{ name: 'Run A', x, y: l.a.map(p => p[0]), color: 0, width: 2, marker: false }, { name: 'Run B (tiny difference)', x, y: l.b.map(p => p[0]), color: 1, width: 2, marker: false }],
    x: { min: 0, max: x[x.length - 1], label: 'Model time' }, y: { label: 'State of the system' }, vlines: l.divergeTime ? [{ x: l.divergeTime, label: 'they part' }] : [], tipX: v => `t = ${v.toFixed(1)}`,
  });
};
A.chartLib.windChill = () => {
  const m = T().moisture;
  return A.chart.line({
    title: 'Wind chill: how cold it feels', subtitle: 'Feels-like temperature for four air temperatures at different wind speeds (NWS / Environment Canada formula).', height: 220,
    series: Object.keys(m.windChill).map((t, i) => ({ name: `${t} °C air`, x: m.windChillSpeeds, y: m.windChill[t].map(v => A.units.convert(v, 'degC')), color: i, marker: false })),
    x: { min: 5, max: 80, label: 'Wind speed (km/h)' }, y: { label: () => tempUnit() }, unit: tempUnit(), tipX: v => `${v} km/h`,
  });
};
A.chartLib.heatIndex = () => {
  const m = T().moisture;
  return A.chart.line({
    title: 'Heat index: how hot it feels', subtitle: 'Feels-like temperature for three humidity levels (NWS regression).', height: 220,
    series: Object.keys(m.heatIndex).map((rh, i) => ({ name: `${rh}% humidity`, x: m.heatIndexTemps, y: m.heatIndex[rh].map(v => A.units.convert(v, 'degC')), color: i, marker: false })),
    x: { min: 24, max: 46, label: 'Air temperature (°C)' }, y: { label: () => tempUnit() }, unit: tempUnit(), tipX: v => `${v} °C air`,
  });
};
A.chartLib.wetBulb = () => {
  const m = T().moisture;
  return A.chart.line({
    title: 'Wet-bulb temperature: the limit of human survival', subtitle: 'Sweating cannot cool the body once the wet-bulb temperature approaches about 35 °C. High humidity makes a given air temperature far more dangerous.', height: 230,
    series: Object.keys(m.wetBulb).map((rh, i) => ({ name: `${rh}% humidity`, x: m.wetBulbTemps, y: m.wetBulb[rh], color: i, marker: false })), hlines: [{ y: 35, label: '35 °C limit' }],
    x: { min: 20, max: 50, label: 'Air temperature (°C)' }, y: { min: 10, max: 40, label: 'Wet-bulb (°C)' }, unit: '°C', tipX: v => `${v} °C air`,
  });
};

/* ------------------------------------------------------------------ water, clouds, rivers, climate zones */
A.chartLib.waterFresh = () => {
  const w = T().water.freshwaterShare;
  return A.chart.bars({ title: 'Where the world’s fresh water is stored', subtitle: 'Only 2.5% of Earth’s water is fresh, and most of that is frozen or underground.', horizontal: true, height: 140,
    categories: ['Ice caps and glaciers', 'Groundwater', 'Lakes, soil, rivers, air'], series: [{ name: '%', y: [w.icePct, w.groundwaterPct, w.otherPct], color: 0 }], unit: '% of fresh water', format: v => `${A.chart.fmtNum(v)}%`, max: 100 });
};

A.chartLib.waterCycle = () => {
  const w = T().water;
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, 'The global water cycle'), h('div', { class: 'cs' }, `Yearly flows in thousand cubic kilometres (Trenberth et al. 2007). The atmosphere holds only about ${w.atmosphereStore} thousand km³ at any time, so each molecule stays aloft about ${w.vapourResidenceDays} days.`));
  const W = 560; const H = 270;
  const svg = h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Water cycle diagram' });
  svg.append(h('defs', null, h('marker', { id: 'wa', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 10 5 0 10z', fill: 'context-stroke' }))));
  svg.append(h('rect', { x: 0, y: 200, width: 330, height: 70, rx: 8, fill: 'var(--s1)', opacity: 0.35 }), h('path', { d: 'M330 200h230v70H330z', fill: 'var(--s3)', opacity: 0.3 }));
  const t = (x, y, text, anchor = 'middle', size = 12, weight = 600) => { const e = h('text', { x, y, 'text-anchor': anchor, 'font-size': size, 'font-weight': weight }, text); e.style.fill = 'var(--ink)'; svg.append(e); };
  const ar = (x0, y0, x1, y1, color, tip, wd = 3) => svg.append(h('g', { style: { cursor: 'help' } }, h('title', null, tip), h('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: color, 'stroke-width': wd, 'marker-end': 'url(#wa)' })));
  ar(80, 198, 80, 70, 'var(--s2)', 'Evaporation from the oceans', 4); t(80, 60, `${w.oceanEvaporation} evaporates`);
  ar(230, 70, 230, 196, 'var(--s1)', 'Rain and snow falling on the oceans', 4); t(230, 60, `${w.oceanPrecipitation} falls`);
  ar(150, 40, 380, 40, 'var(--s4)', 'Water vapour carried by winds from ocean to land', 3); t(265, 30, `${w.vapourToLand} carried to land`);
  ar(470, 70, 470, 196, 'var(--s1)', 'Rain and snow falling on land', 4); t(470, 60, `${w.landPrecipitation} falls`);
  ar(400, 198, 400, 80, 'var(--s2)', 'Evaporation from soil and lakes plus transpiration from plants', 3); t(380, 112, `${w.landEvaporation}`, 'end');
  ar(520, 262, 340, 262, 'var(--s3)', 'River runoff and groundwater flow back to the sea', 3); t(430, 255, `${w.runoff} runoff`);
  t(165, 235, 'Ocean', 'middle', 13, 700); t(445, 232, 'Land', 'middle', 13, 700);
  fig.append(svg);
  return fig;
};

A.chartLib.cloudHeights = () => {
  const clouds = T().clouds;
  const fig = h('figure', { class: 'chart' }, h('figcaption', { class: 'ct' }, 'The ten cloud types and the heights they occupy'), h('div', { class: 'cs' }, 'Typical cloud-base heights in temperate regions (the tropics are higher). Hover a bar for what the cloud looks like and what it means for the weather.'));
  const W = 560; const H = 300; const m = { l: 40, r: 10, t: 8, b: 24 };
  const svg = h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Cloud heights' });
  const Y = km => m.t + (1 - km / 18) * (H - m.t - m.b);
  for (const km of [0, 2, 6, 12, 18]) { svg.append(h('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: Y(km), y2: Y(km), style: { stroke: 'var(--grid)' } })); const t = h('text', { x: m.l - 5, y: Y(km) + 4, 'text-anchor': 'end', 'font-size': 11 }, `${km} km`); t.style.fill = 'var(--ink-3)'; svg.append(t); }
  const groupColor = { high: 1, middle: 2, low: 0, towering: 3 };
  const bw = (W - m.l - m.r) / clouds.length;
  clouds.forEach((c, i) => {
    const top = c.top ? c.top[1] : c.base[1] + (c.level === 'high' ? 1.5 : c.level === 'middle' ? 3 : 1);
    const x = m.l + i * bw + bw * 0.15;
    const bar = h('rect', { x, y: Y(Math.max(top, c.base[0] + 0.3)), width: bw * 0.7, height: Math.max(3, Y(c.base[0]) - Y(Math.max(top, c.base[0] + 0.3))), rx: 4, fill: `var(--s${groupColor[c.level] + 1})`, opacity: 0.9 }, h('title', null, `${c.name}: ${c.look}. ${c.weather}.`));
    svg.append(bar);
    const t = h('text', { x: x + bw * 0.35, y: H - 8, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600 }, c.abbr); t.style.fill = 'var(--ink-2)'; svg.append(t);
  });
  fig.append(svg, h('div', { class: 'legend' }, [['High', 1], ['Middle', 2], ['Low', 0], ['Towering', 3]].map(([n, k]) => h('span', null, h('i', { class: 'box', style: { background: `var(--s${k + 1})` } }), n))));
  fig.append(h('div', { class: 'ctable', style: { display: 'block', maxHeight: 'none' } }, h('table', null, h('thead', null, h('tr', null, ['Cloud', 'Looks like', 'Usually means'].map(c => h('th', null, c)))),
    h('tbody', null, clouds.map(c => h('tr', null, h('td', { style: { textAlign: 'left' } }, `${c.name} (${c.abbr})`), h('td', { style: { textAlign: 'left' } }, c.look), h('td', { style: { textAlign: 'left' } }, c.weather)))))));
  return fig;
};

A.chartLib.rivers = () => A.chart.bars({
  title: 'The biggest rivers by water carried', subtitle: 'Approximate long-term mean discharge in thousands of cubic metres per second. The Amazon alone carries about a fifth of all river water entering the oceans.', horizontal: true, height: 270,
  categories: A.data.rivers.map(r => r.name), series: [{ name: 'Discharge', y: A.data.rivers.map(r => r.m3s / 1000), color: 0 }], unit: 'thousand m³/s', format: v => A.chart.fmtNum(v),
});

A.chartLib.koppenShare = () => {
  const classes = A.packs.core.json('koppen_classes').slice().sort((a, b) => b.share - a.share).slice(0, 14);
  return A.chart.bars({
    title: 'The most widespread climates on land', subtitle: 'Share of the world’s land area (including Antarctica and Greenland) for the 14 most common Köppen–Geiger classes, computed from station-based climate data.', horizontal: true, height: 400,
    categories: classes.map(c => `${c.code} ${c.name.length > 24 ? c.name.slice(0, 23) + '…' : c.name}`), series: [{ name: 'Share', y: classes.map(c => c.share), color: 0, colors: classes.map(c => `rgb(${c.rgb.join(',')})`) }], unit: '% of land', format: v => `${A.chart.fmtNum(v)}%`,
  });
};

A.chartLib.beaufort = () => A.tableFig('The Beaufort wind scale', ['Force', 'Name', 'm/s', 'knots', 'What you notice'], T().beaufort.map(b => [b.force, b.name, b.ms[1] === null ? `${b.ms[0]}+` : `${b.ms[0]}–${b.ms[1]}`, b.kt[1] === null ? `${b.kt[0]}+` : `${b.kt[0]}–${b.kt[1]}`, b.desc]));
A.chartLib.fujita = () => A.tableFig('The Enhanced Fujita scale for tornadoes', ['Rating', 'Wind (mph)', 'Wind (km/h)', 'Typical damage'], T().fujita.map(f => [f.ef, f.mph[1] === null ? `${f.mph[0]}+` : `${f.mph[0]}–${f.mph[1]}`, f.kmh[1] === null ? `${f.kmh[0]}+` : `${f.kmh[0]}–${f.kmh[1]}`, f.damage]), 'Ratings are given afterwards from the damage, not measured in the storm.');
A.chartLib.saffir = () => A.tableFig('The Saffir–Simpson hurricane wind scale', ['Category', 'Sustained wind (knots)', 'mph', 'km/h'], T().hurricane.scale.map(s => [s.cat, s.kt[1] === null ? `${s.kt[0]}+` : `${s.kt[0]}–${s.kt[1]}`, s.mph[1] === null ? `${s.mph[0]}+` : `${s.mph[0]}–${s.mph[1]}`, s.kmh[1] === null ? `${s.kmh[0]}+` : `${s.kmh[0]}–${s.kmh[1]}`]), 'One-minute average wind at 10 m. Categories rate wind only; they do not measure the danger of surge or rain.');
A.chartLib.recordsTable = () => A.tableFig('Verified world weather extremes', ['Record', 'Value', 'Where and when'], A.data.records.map(r => [r.title, r.value, `${r.where}, ${r.when}`]));
