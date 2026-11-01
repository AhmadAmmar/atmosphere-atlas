/* ------------------------------------------------------------------ chart catalogue
   Each entry builds one figure from the build-time tables (A.data.tables) or the data packs. */

A.cmap.defs.sun = [[0, '#26261f'], [0.25, '#6b4f1a'], [0.5, '#b9811c'], [0.75, '#f1b72e'], [1, '#fff1b0']];
A.cmap.defs.seq = [[0, '#10243f'], [0.25, '#1c5cab'], [0.5, '#3987e5'], [0.75, '#86b6ef'], [1, '#e6f1fc']];

A.chartLib = {};
A.buildChart = function buildChart(spec) {
  const make = A.chartLib[spec.id];
  if (!make) { console.warn('unknown chart', spec.id); return h('div'); }
  return make(spec);
};

const T = () => A.data.tables;
const SERIES = () => A.packs.core.json('series');
const monthX = (start, n) => Array.from({ length: n }, (_, i) => start[0] + (start[1] - 1 + i) / 12 + 1 / 24);
const yearFmt = v => String(Math.round(v));
const dayTicks = CUM_DAYS.slice(0, 12).map(d => d + 1);
const dayFmt = v => { const i = dayTicks.indexOf(Math.round(v)); return i >= 0 ? MONTHS3[i] : ''; };
const dayTip = v => dayLabel(v - 1);

function runningMean(values, win) {
  const out = new Array(values.length).fill(null);
  const half = Math.floor(win / 2);
  for (let i = 0; i < values.length; i++) {
    let s = 0; let c = 0;
    for (let j = i - half; j <= i + half; j++) { const v = values[j]; if (v !== undefined && v !== null && Number.isFinite(v)) { s += v; c++; } }
    out[i] = c >= win * 0.7 ? s / c : null;
  }
  return out;
}

function currentDayMarker() { return () => [{ x: mod(A.state.day, 365) + 1, label: dayLabel(A.state.day) }]; }

/* ------------------------------------------------------------------ sun, seasons, radiation */
A.chartLib.insolation = () => {
  const t = T().sun;
  const value = (day, lat) => {
    const fi = clamp((lat + 90) / 5, 0, 36); const fj = clamp((day - 1) / 4, 0, t.days.length - 1);
    const i0 = Math.min(35, Math.floor(fi)); const j0 = Math.min(t.days.length - 2, Math.floor(fj));
    const a = fi - i0; const b = fj - j0;
    const g = (i, j) => t.insolation[i][j];
    return (g(i0, j0) * (1 - b) + g(i0, j0 + 1) * b) * (1 - a) + (g(i0 + 1, j0) * (1 - b) + g(i0 + 1, j0 + 1) * b) * a;
  };
  return A.chart.heat({
    title: 'Sunlight at the top of the atmosphere', subtitle: 'Daily average, watts per square metre, for every latitude through the year. The white line is the latitude where the Sun is overhead at noon.',
    height: 250, cmap: 'sun', range: [0, 560], unit: 'W/m²', live: true,
    extent: { x0: 1, x1: 365, y0: -90, y1: 90 }, x: { ticks: dayTicks, format: dayFmt, tip: dayTip }, y: { ticks: [-90, -60, -30, 0, 30, 60, 90], label: 'Latitude', format: v => `${Math.abs(v)}°${v > 0 ? 'N' : v < 0 ? 'S' : ''}` },
    value: (d, lat) => value(d, lat), cbTicks: [0, 200, 400],
    lines: [{ pts: T().sun.declination.map((dv, i) => [i + 1, dv]), color: '#ffffff', width: 1.4, dash: '4 3' }],
    vlines: currentDayMarker(),
    table: () => ({ head: ['Latitude', 'Jan 1', 'Apr 1', 'Jul 1', 'Oct 1'], rows: [-90, -60, -30, 0, 30, 60, 90].map(l => [l + '°', ...[1, 91, 182, 274].map(d => Math.round(value(d, l)))]) }),
  });
};

A.chartLib.daylength = () => {
  const t = T().sun;
  const lats = [[0, 'Equator'], [30, '30° N'], [50, '50° N'], [65, '65° N'], [-50, '50° S']];
  return A.chart.line({
    title: 'Hours of daylight through the year', subtitle: 'The equator is steady; the higher the latitude, the bigger the swing.', height: 220, live: true,
    series: lats.map(([lat, name], i) => ({ name, x: t.days, y: t.dayLength[(lat + 90) / 5], color: i, marker: false })),
    x: { min: 1, max: 365, ticks: dayTicks, format: dayFmt }, y: { min: 0, max: 24, ticks: [0, 6, 12, 18, 24], label: 'Hours', noZero: true },
    tipX: dayTip, vlines: currentDayMarker(),
  });
};

A.chartLib.declination = () => A.chart.line({
  title: 'Latitude of the overhead Sun', subtitle: 'Declination swings between the two tropics; the equinoxes are where it crosses zero.', height: 190, live: true,
  series: [{ name: 'Declination', x: Array.from({ length: 365 }, (_, i) => i + 1), y: T().sun.declination, color: 3, marker: false }],
  x: { min: 1, max: 365, ticks: dayTicks, format: dayFmt }, y: { min: -25, max: 25, ticks: [-23.44, 0, 23.44], format: v => `${v > 0 ? '+' : ''}${A.chart.fmtNum(v)}°`, label: 'Degrees' },
  tipX: dayTip, unit: '°', vlines: currentDayMarker(),
});

A.chartLib.eot = () => A.chart.line({
  title: 'Equation of time', subtitle: 'How far a sundial runs ahead of (+) or behind (−) a perfect clock.', height: 190,
  series: [{ name: 'Minutes', x: Array.from({ length: 365 }, (_, i) => i + 1), y: T().sun.equationOfTime, color: 4, marker: false }],
  x: { min: 1, max: 365, ticks: dayTicks, format: dayFmt }, y: { min: -20, max: 20, label: 'Minutes' }, tipX: dayTip, unit: 'min',
});

A.chartLib.annualInsolation = () => A.chart.line({
  title: 'Average sunlight by latitude', subtitle: 'Yearly mean at the top of the atmosphere. The equator gets more than double the poles.', height: 200,
  series: [{ name: 'Sunlight', x: T().sun.lats, y: T().sun.annualMean, color: 3, area: true, marker: false }],
  x: { min: -90, max: 90, ticks: [-90, -60, -30, 0, 30, 60, 90], format: v => `${Math.abs(v)}°${v > 0 ? 'N' : v < 0 ? 'S' : ''}`, label: 'Latitude' }, y: { min: 0, label: 'W/m²' },
  tipX: v => A.fmt.lat(v), unit: 'W/m²',
});

A.chartLib.planck = () => {
  const r = T().radiation;
  return A.chart.line({
    title: 'Colours of heat: sunlight against Earth’s own glow', subtitle: 'Normalised black-body spectra. The Sun (5772 K) glows mostly in visible light; Earth (288 K) in the infrared. Shaded bands mark where gases absorb.', height: 240,
    series: [{ name: 'Sun, 5772 K', x: r.wavelengthUm, y: r.sun, color: 3, marker: false }, { name: 'Earth, 288 K', x: r.wavelengthUm, y: r.earth, color: 1, marker: false }],
    x: { log: true, min: 0.1, max: 20, ticks: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20], label: 'Wavelength (µm)' }, y: { min: 0, max: 1.08, ticks: [0, 0.5, 1], label: 'Relative intensity' },
    bands: [{ x0: 5.5, x1: 7.5, label: 'H₂O' }, { x0: 13.5, x1: 17, label: 'CO₂' }, { x0: 9.2, x1: 10, label: '' }], tipX: v => `${A.chart.fmtNum(v)} µm`,
  });
};

A.chartLib.rayleigh = () => {
  const r = T().radiation.rayleigh;
  return A.chart.line({
    title: 'Why the sky is blue', subtitle: 'Air scatters short wavelengths far more strongly (proportional to 1/λ⁴). Blue light at 450 nm scatters about 5 times more than red at 680 nm.', height: 200,
    series: [{ name: 'Relative scattering', x: r.nm, y: r.relative, color: 0, area: true, marker: false }], x: { min: 380, max: 750, ticks: [400, 450, 500, 550, 600, 650, 700, 750], label: 'Wavelength (nm)' }, y: { min: 0, label: 'Relative' }, tipX: v => `${Math.round(v)} nm`,
  });
};

A.chartLib.coriolisF = () => {
  const c = T().coriolis;
  return A.chart.line({
    title: 'The Coriolis parameter f = 2Ω sin φ', subtitle: 'Zero at the equator, largest at the poles, opposite in sign across the equator.', height: 210,
    series: [{ name: 'f (10⁻⁵ s⁻¹)', x: c.lats, y: c.f, color: 0, marker: false, area: true }], x: { min: -90, max: 90, ticks: [-90, -60, -30, 0, 30, 60, 90], format: v => `${Math.abs(v)}°${v > 0 ? 'N' : v < 0 ? 'S' : ''}`, label: 'Latitude' }, y: { min: -16, max: 16, label: '10⁻⁵ s⁻¹' },
    tipX: v => A.fmt.lat(v), unit: '×10⁻⁵ s⁻¹',
  });
};

A.chartLib.geostrophic = () => {
  const g = T().geostrophic;
  return A.chart.line({
    title: 'Geostrophic wind for 4 hPa isobar spacing', subtitle: 'Closer isobars mean stronger wind; at the same spacing the wind is weaker at higher latitude.', height: 220,
    series: Object.keys(g.windMs).map((lat, i) => ({ name: `${lat}° latitude`, x: g.separationKm, y: g.windMs[lat], color: i, marker: false })),
    x: { min: 100, max: 500, ticks: [100, 200, 300, 400, 500], label: 'Distance between isobars (km)' }, y: { min: 0, label: 'm/s' }, unit: 'm/s', tipX: v => `${Math.round(v)} km apart`,
  });
};

/** Zonal-mean fields stored as (month, level, latitude): bilinear in latitude and log-pressure, linear in month. */
A.xsection = function xsection(name) {
  if (!A._xs) A._xs = {};
  if (A._xs[name]) return A._xs[name];
  const f = A.packs.core.float(name);
  const m = f.meta;
  const xs = { data: f.data, nt: f.shape[0], nl: f.shape[1], nlat: f.shape[2], lat0: m.lat0, dlat: m.dlat, plev: m.plev, units: m.units, title: m.title };
  xs.ps = null;
  xs.at = (mp, lat, p) => {
    const fy = clamp((lat - xs.lat0) / xs.dlat, 0, xs.nlat - 1); const j0 = Math.min(Math.floor(fy), xs.nlat - 2); const ty = fy - j0;
    const L = xs.plev; let k = 0;
    if (p >= L[0]) k = 0; else if (p <= L[xs.nl - 1]) k = xs.nl - 2; else { while (k < xs.nl - 2 && L[k + 1] > p) k++; }
    const lp = Math.log(p); const l0 = Math.log(L[k]); const l1 = Math.log(L[k + 1]);
    const tk = clamp((lp - l0) / (l1 - l0), 0, 1);
    const val = t => {
      const b = t * xs.nl * xs.nlat;
      const g = (kk, jj) => xs.data[b + kk * xs.nlat + jj];
      const a = g(k, j0) * (1 - ty) + g(k, j0 + 1) * ty; const c = g(k + 1, j0) * (1 - ty) + g(k + 1, j0 + 1) * ty;
      return a * (1 - tk) + c * tk;
    };
    return val(mp.i0) * (1 - mp.t) + val(mp.i1) * mp.t;
  };
  A._xs[name] = xs;
  return xs;
};

A.xsSurfacePressure = (mp, lat) => {
  const ps = A.packs.core.float('zm_ps'); const m = ps.meta;
  const fy = clamp((lat - m.lat0) / m.dlat, 0, ps.shape[1] - 1); const j0 = Math.min(Math.floor(fy), ps.shape[1] - 2); const ty = fy - j0;
  const v = t => ps.data[t * ps.shape[1] + j0] * (1 - ty) + ps.data[t * ps.shape[1] + j0 + 1] * ty;
  return v(mp.i0) * (1 - mp.t) + v(mp.i1) * mp.t;
};

const LOGP_H = 7;                                           // scale height used for the log-pressure axis (km)
const zOfP = p => -LOGP_H * Math.log(p / 1000);
const pOfZ = z => 1000 * Math.exp(-z / LOGP_H);
const latFmt = v => `${Math.abs(v)}\u00b0${v > 0 ? 'N' : v < 0 ? 'S' : ''}`;

function sectionChart({ title, subtitle, name, cmap, range, unit, topP, cbTicks, texts, cbFormat, lines }) {
  const xs = A.xsection(name);
  const ztop = zOfP(topP);
  return A.chart.heat({
    title, subtitle, height: 270, cmap, range, unit, live: true, cbTicks, cbFormat,
    extent: { x0: -90, x1: 90, y0: 0, y1: ztop },
    x: { ticks: [-90, -60, -30, 0, 30, 60, 90], format: latFmt, label: 'Latitude', tip: latFmt },
    y: { ticks: [1000, 850, 700, 500, 300, 200, 100, 50].filter(p => p >= topP).map(zOfP), format: v => String(Math.round(pOfZ(v))), label: 'Pressure (hPa)', tip: v => `${Math.round(pOfZ(v))} hPa` },
    value: (lat, z) => {
      const mp = monthPos(A.state.day); const p = pOfZ(z);
      if (p > A.xsSurfacePressure(mp, lat)) return NaN;
      if (p > xs.plev[0]) return NaN;
      return xs.at(mp, lat, p);
    },
    texts: typeof texts === 'function' ? texts() : texts, lines,
    vlines: () => [],
    table: () => ({ head: ['Latitude', ...[850, 500, 250, 200].filter(p => p >= topP).map(p => `${p} hPa`)], rows: [-80, -60, -40, -20, 0, 20, 40, 60, 80].map(l => [latFmt(l), ...[850, 500, 250, 200].filter(p => p >= topP).map(p => A.chart.fmtNum(xs.at(monthPos(A.state.day), l, p)))]) }),
  });
}

A.chartLib.zonalWind = () => sectionChart({ title: 'Zonal-mean wind through the atmosphere', subtitle: 'Red: westerly (from the west). Blue: easterly. The two bright cores near 30\u00b0 and 50\u00b0 latitude are the jet streams. Move the date to follow the seasons.', name: 'zm_u', cmap: 'anomaly', range: [-45, 45], unit: 'm/s', topP: 50, cbTicks: [-40, -20, 0, 20, 40] });
A.chartLib.tempSection = () => sectionChart({ title: 'Zonal-mean air temperature', subtitle: 'Warm at the surface in the tropics, cold aloft and at the poles. The kink near 100 hPa in the tropics is the tropopause.', name: 'zm_t', cmap: 'thermal', range: [-90, 40], unit: '\u00b0C', topP: 50, cbTicks: [-80, -40, 0, 30], cbFormat: v => String(Math.round(A.units.convert(v, 'degC'))) });
A.chartLib.psiSection = () => sectionChart({
  title: 'The overturning cells in real data', subtitle: 'Mass streamfunction of the zonal-mean flow (10\u2079 kg/s). Red cells turn clockwise (air rising on the left, sinking on the right), blue anticlockwise. The big cell crossing the equator is the Hadley cell of the winter hemisphere.',
  name: 'zm_psi', cmap: 'anomaly', range: [-180, 180], unit: '\u00d710\u2079 kg/s', topP: 100, cbTicks: [-150, -75, 0, 75, 150],
  texts: [{ x: -62, y: zOfP(600), text: 'Polar' }, { x: -45, y: zOfP(500), text: 'Ferrel' }, { x: -10, y: zOfP(500), text: 'Hadley' }, { x: 45, y: zOfP(500), text: 'Ferrel' }],
});

A.chartLib.angMom = () => {
  const hd = T().hadley;
  const xs = A.xsection('zm_u');
  const lats = hd.lats;
  const obs = lats.map(l => { let s = 0; for (let m = 0; m < 12; m++) s += xs.at({ i0: m, i1: m, t: 0 }, l, 200); return s / 12; });
  return A.chart.line({
    title: 'Why the Hadley cell stops near 30\u00b0', subtitle: 'Air rising at the equator keeps its spin as it moves poleward and would reach 134 m/s at 30\u00b0. Real upper winds peak near 40 m/s, so the cell cannot go much further.', height: 230,
    series: [{ name: 'Spin conserved (theory)', x: lats, y: hd.uConserving.map(v => Math.min(v, 180)), color: 1, marker: false, dash: '5 4' }, { name: 'Observed wind at 200 hPa (annual mean)', x: lats, y: obs, color: 0, marker: false }],
    x: { min: 0, max: 60, ticks: [0, 10, 20, 30, 40, 50, 60], label: 'Latitude (\u00b0N)' }, y: { min: 0, max: 180, label: 'Westerly wind (m/s)' }, unit: 'm/s', tipX: v => `${v}\u00b0N`,
  });
};

/* ------------------------------------------------------------------ time series: climate modes, warming, ice */
function indexChart(key, { title, subtitle, unit = '', smooth = 0, diverge = true, y = {}, hlines = [], from = 1948, tail = null }) {
  const ser = SERIES().indices[key];
  const x = monthX(ser.start, ser.values.length);
  const keep = x.map(v => v >= from);
  const xs = x.filter((_, i) => keep[i]); const vs = ser.values.filter((_, i) => keep[i]);
  const series = [{ name: ser.name.split('(')[0].trim(), x: xs, y: vs, color: 0, diverge, marker: false, outline: false }];
  if (smooth) {
    series[0].diverge = false; series[0].width = 1; series[0].opacity = 0.55;
    series.push({ name: `${smooth}-month average`, x: xs, y: runningMean(vs, smooth), color: 1, marker: false, width: 2.5 });
  }
  return A.chart.line({ title, subtitle, height: 210, series, x: { ticks: A.chart.ticks(from, xs[xs.length - 1], 7), format: yearFmt }, y: { label: unit, ...y }, hlines, unit: '', tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}` });
}

A.chartLib.oni = () => {
  const o = SERIES().enso.oni;
  const x = monthX(o.start, o.values.length);
  return A.chart.line({
    title: 'Oceanic Niño Index since 1950', subtitle: 'Three-month average of Niño 3.4 sea-surface temperature anomaly. Red: El Niño. Blue: La Niña. Values beyond ±0.5 °C count as an event.', height: 220,
    series: [{ name: 'ONI', x, y: o.values, color: 0, diverge: true, marker: false }], x: { ticks: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020], format: yearFmt, min: 1950, max: x[x.length - 1] },
    y: { min: -2.5, max: 3, ticks: [-2, -1, 0, 1, 2, 3], label: '°C anomaly' }, hlines: [{ y: 0.5, label: '+0.5' }, { y: -0.5, label: '−0.5' }], unit: '°C',
    tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}`,
  });
};

A.chartLib.nino34 = () => indexChart('nino34', { title: 'Niño 3.4 sea-surface temperature anomaly', subtitle: 'Monthly departure of the central equatorial Pacific from normal.', unit: '°C', y: { min: -3, max: 3.5 }, from: 1950 });
A.chartLib.soi = () => indexChart('soi', { title: 'Southern Oscillation Index', subtitle: 'Pressure difference between Tahiti and Darwin, standardised. Negative values go with El Niño.', unit: 'standardised', smooth: 12, from: 1951 });
A.chartLib.nao = () => indexChart('nao', { title: 'North Atlantic Oscillation index', subtitle: 'Positive: strong Icelandic Low and Azores High, mild wet winters in northern Europe. Negative: the reverse.', unit: 'index', smooth: 12, diverge: false, from: 1950 });
A.chartLib.ao = () => indexChart('ao', { title: 'Arctic Oscillation index', subtitle: 'Positive: the polar vortex is strong and cold air stays north. Negative: cold air spills south.', unit: 'index', smooth: 12, diverge: false, from: 1950 });
A.chartLib.aao = () => indexChart('aao', { title: 'Southern Annular Mode (Antarctic Oscillation)', subtitle: 'Positive: westerlies contract towards Antarctica.', unit: 'index', smooth: 12, diverge: false, from: 1979 });
A.chartLib.pdo = () => indexChart('pdo', { title: 'Pacific Decadal Oscillation', subtitle: 'The long-lived pattern of North Pacific sea-surface temperature, with phases lasting 20–30 years.', unit: 'index', smooth: 60, diverge: false, from: 1950 });
A.chartLib.amo = () => indexChart('amo', { title: 'Atlantic Multidecadal Oscillation', subtitle: 'North Atlantic SST with the long-term trend removed.', unit: '°C', smooth: 60, diverge: false, from: 1950, tail: 2023 });
A.chartLib.pna = () => indexChart('pna', { title: 'Pacific–North American pattern', subtitle: 'A wave-train of high and low pressure from the Pacific across Canada, tied to ENSO.', unit: 'index', smooth: 12, diverge: false, from: 1950 });
A.chartLib.qbo = () => indexChart('qbo', { title: 'Quasi-Biennial Oscillation', subtitle: 'Zonal wind at 30 hPa over the equator: westerlies and easterlies alternate about every 14 months.', unit: 'm/s', diverge: true, from: 1950, y: { min: -35, max: 25 } });

A.chartLib.dmi = () => indexChart('dmi', { title: 'The Indian Ocean Dipole', subtitle: 'Sea-surface temperature of the western Indian Ocean minus the eastern one. Above +0.4 °C is a positive event (cool off Sumatra, warm off East Africa); below −0.4 °C a negative one.', unit: '°C', smooth: 0, diverge: true, from: 1950, hlines: [{ y: 0.4, label: '+0.4' }, { y: -0.4, label: '−0.4' }] });

A.chartLib.ensoEvents = () => {
  const ev = SERIES().enso.events.slice().sort((a, b) => Math.abs(b.peak) - Math.abs(a.peak)).slice(0, 10);
  const mon = m => MONTHS3[m - 1];
  return A.chart.bars({
    title: 'The ten strongest events since 1950', subtitle: 'Peak Oceanic Niño Index of each episode. Red bars are El Niño; blue bars are La Niña.', horizontal: true, height: 300,
    categories: ev.map(e => `${e.type === 'El Nino' ? 'El Niño' : 'La Niña'} ${e.start[0]}–${String(e.end[0]).slice(2)} (${mon(e.peakMonth[1])})`), min: -2.5, max: 3,
    series: [{ name: 'Peak ONI', y: ev.map(e => e.peak), color: 0, colors: ev.map(e => (e.peak > 0 ? 'var(--pos)' : 'var(--neg)')) }], unit: '°C', format: v => A.chart.fmtNum(v),
  });
};

A.chartLib.gistemp = () => {
  const g = SERIES().gistemp;
  const years = g.years.filter((y, i) => g.annual[i] !== null); const vals = g.annual.filter(v => v !== null);
  return A.chart.line({
    title: 'Global temperature since 1880', subtitle: `Annual average, difference from the ${g.baseline} average (NASA GISTEMP). Each dot is one year.`, height: 230,
    series: [{ name: 'Annual', x: years, y: vals, color: 2, width: 1.2, marker: false, opacity: 0.8 }, { name: '10-year average', x: years, y: runningMean(vals, 11), color: 1, width: 2.8, marker: true }],
    x: { ticks: [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020], format: yearFmt, min: 1880 }, y: { min: -0.6, max: 1.5, label: '°C', ticks: [-0.5, 0, 0.5, 1, 1.5] }, tipX: yearFmt, unit: '°C',
  });
};

A.chartLib.stripes = () => {
  const g = SERIES().gistemp;
  const years = g.years.filter((y, i) => g.annual[i] !== null); const vals = g.annual.filter(v => v !== null);
  return A.chart.heat({
    title: 'Warming stripes, 1880–' + years[years.length - 1], subtitle: 'One stripe per year: blue for cooler than the 1951–1980 average and red for warmer.', height: 120, colorbar: false,
    cmap: 'anomaly', range: [-1.4, 1.4], unit: '°C', extent: { x0: years[0], x1: years[years.length - 1] + 1, y0: 0, y1: 1 }, x: { ticks: [1900, 1950, 2000], format: yearFmt, tip: v => String(Math.floor(v)) }, y: { ticks: [], format: () => '' },
    value: x => { const i = Math.floor(x) - years[0]; return i >= 0 && i < vals.length ? vals[i] : NaN; },
    table: () => ({ head: ['Year', 'Anomaly (°C)'], rows: years.filter((_, i) => i % 5 === 0 || i === years.length - 1).map(y => [y, vals[years.indexOf(y)].toFixed(2)]) }),
  });
};

A.chartLib.co2 = () => {
  const c = SERIES().co2;
  const x = monthX(c.start, c.monthly.length);
  return A.chart.line({
    title: 'The Keeling curve: carbon dioxide at Mauna Loa', subtitle: 'Monthly average parts per million. The yearly sawtooth is northern plants breathing: they take up CO₂ in summer and release it in winter.', height: 230,
    series: [{ name: 'Monthly average', x, y: c.monthly, color: 0, width: 1.3, marker: false }, { name: 'Trend (seasonal cycle removed)', x, y: c.trend, color: 1, width: 2.2, marker: true }],
    x: { ticks: [1960, 1970, 1980, 1990, 2000, 2010, 2020], format: yearFmt, min: 1958 }, y: { min: 300, max: 440, label: 'ppm', ticks: [320, 360, 400, 440] }, unit: 'ppm', tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}`,
  });
};

/** 800,000 years of Antarctic temperature and carbon dioxide from the EPICA Dome C ice core, with today's carbon dioxide. */
A.chartLib.iceCores = () => {
  const ic = SERIES().iceCores;
  const n = ic.co2.length;
  const kyr = Array.from({ length: n }, (_, i) => -(i + 0.5));                 // thousand years before present, negative to the left
  const now = SERIES().co2.trend.filter(v => v !== null).slice(-1)[0];
  const ticks = [-800, -600, -400, -200, 0];
  const fmt = v => (v === 0 ? 'now' : `${-v}`);
  const box = h('div');
  box.append(A.chart.line({
    title: 'Ice ages: Antarctic temperature for 800,000 years', subtitle: 'Temperature at EPICA Dome C compared with the last thousand years, from the isotopes in the ice (Jouzel et al. 2007). The ice ages come every 100,000 years or so; the warm interglacials are short.',
    height: 190, series: [{ name: 'Antarctic temperature', x: kyr, y: ic.temp, color: 0, diverge: true, marker: false }],
    x: { min: -800, max: 0, ticks, format: fmt, label: 'Thousand years ago' }, y: { label: '°C', ticks: [-8, -4, 0, 4] }, unit: '°C', tipX: v => `${Math.round(-v)} thousand years ago`,
  }));
  box.append(A.chart.line({
    title: 'Carbon dioxide in the air for 800,000 years', subtitle: 'Bubbles of ancient air trapped in the Antarctic ice (Bereiter et al. 2015). Carbon dioxide moved up and down with the temperature between about 180 and 300 ppm. The line shows the level today.',
    height: 200, series: [{ name: 'Carbon dioxide', x: kyr, y: ic.co2, color: 1, marker: false, width: 2.2 }],
    x: { min: -800, max: 0, ticks, format: fmt, label: 'Thousand years ago' }, y: { min: 160, max: 450, label: 'ppm', ticks: [200, 300, 400] }, hlines: [{ y: now, label: `${Math.round(now)} ppm today` }], unit: 'ppm', tipX: v => `${Math.round(-v)} thousand years ago`,
  }));
  return box;
};

A.chartLib.seaIce = () => {
  const n = SERIES().seaIce.north;
  const pick = m => ({ x: n.years.filter((_, i) => n.monthly[i][m] !== null), y: n.monthly.map(r => r[m]).filter(v => v !== null) });
  const sept = pick(8); const march = pick(2);
  return A.chart.line({
    title: 'Arctic sea-ice extent, 1979 to now', subtitle: 'Million square kilometres at the yearly maximum (March) and minimum (September), from satellite microwave sensors.', height: 220,
    series: [{ name: 'March (maximum)', x: march.x, y: march.y, color: 0, marker: false }, { name: 'September (minimum)', x: sept.x, y: sept.y, color: 1, marker: true }],
    x: { ticks: [1980, 1990, 2000, 2010, 2020], format: yearFmt, min: 1979 }, y: { min: 0, max: 18, label: 'million km²', ticks: [0, 5, 10, 15] }, unit: 'million km²', tipX: yearFmt,
  });
};

A.chartLib.seaIceCycle = () => {
  const s = SERIES().seaIce;
  const clim = h2 => Array.from({ length: 12 }, (_, m) => { const v = s[h2].years.map((y, i) => (y >= 1991 && y <= 2020 && s[h2].monthly[i][m] !== null ? s[h2].monthly[i][m] : null)).filter(x => x !== null); return v.reduce((a, b) => a + b, 0) / v.length; });
  return A.chart.line({
    title: 'The seasonal breathing of polar sea ice', subtitle: 'Average extent in each month, 1991–2020. The two poles are six months out of step.', height: 210,
    series: [{ name: 'Arctic', x: Array.from({ length: 12 }, (_, i) => i + 1), y: clim('north'), color: 0, marker: false }, { name: 'Antarctic', x: Array.from({ length: 12 }, (_, i) => i + 1), y: clim('south'), color: 1, marker: false }],
    x: { min: 1, max: 12, ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], format: v => MONTHS3[v - 1][0] }, y: { min: 0, label: 'million km²' }, unit: 'million km²', tipX: v => MONTHS[Math.round(v) - 1],
  });
};

A.chartLib.seaLevel = () => {
  const s = SERIES().seaLevel;
  const x = monthX(s.start, s.monthly.length);
  return A.chart.line({
    title: 'Global mean sea level since 1993', subtitle: 'Satellite altimetry, millimetres relative to the first year of the record.', height: 210,
    series: [{ name: 'Sea level', x, y: s.monthly, color: 0, width: 1.4, marker: false, area: true }, { name: 'Smoothed', x, y: runningMean(s.monthly, 13), color: 1, width: 2.4, marker: true }],
    x: { ticks: [1995, 2000, 2005, 2010, 2015, 2020, 2025], format: yearFmt, min: 1993 }, y: { label: 'mm', min: -10 }, unit: 'mm', tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}`,
  });
};

A.chartLib.amoc = () => {
  const r = SERIES().rapid;
  const x = monthX(r.start, r.amoc.length);
  return A.chart.line({
    title: 'Atlantic overturning measured at 26.5°N (RAPID array)', subtitle: 'Northward upper-ocean flow in sverdrups (1 Sv = a million cubic metres per second). The average is ' + r.stats.mean + ' Sv.', height: 220,
    series: [{ name: 'Monthly', x, y: r.amoc, color: 0, width: 1.2, marker: false, opacity: 0.7 }, { name: '12-month average', x, y: runningMean(r.amoc, 13), color: 1, width: 2.6, marker: true }],
    x: { ticks: [2005, 2010, 2015, 2020], format: yearFmt, min: 2004.25 }, y: { min: 8, max: 26, label: 'Sv', ticks: [10, 15, 20, 25] }, hlines: [{ y: r.stats.mean, label: 'mean ' + r.stats.mean }], unit: 'Sv', tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}`,
  });
};

A.chartLib.amocParts = () => {
  const r = SERIES().rapid;
  const x = monthX(r.start, r.amoc.length);
  return A.chart.line({
    title: 'How the overturning adds up', subtitle: 'Stream of warm water through the Florida Straits and wind-driven Ekman flow go north; the return flow through the ocean interior goes south.', height: 230,
    series: [{ name: 'Florida Current', x, y: runningMean(r.floridaCurrent, 13), color: 1, marker: false }, { name: 'Ekman (wind)', x, y: runningMean(r.ekman, 13), color: 2, marker: false },
      { name: 'Ocean interior', x, y: runningMean(r.interior, 13), color: 4, marker: false }, { name: 'Net overturning', x, y: runningMean(r.amoc, 13), color: 0, width: 2.8, marker: false }],
    x: { ticks: [2005, 2010, 2015, 2020], format: yearFmt, min: 2004.25 }, y: { min: -25, max: 40, label: 'Sv' }, unit: 'Sv', tipX: v => `${MONTHS3[Math.floor(mod(v, 1) * 12)]} ${Math.floor(v)}`,
  });
};
