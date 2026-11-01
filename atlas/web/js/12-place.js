/* ------------------------------------------------------------------ climate report for any clicked point */
A.showPlace = function showPlace(lon, lat) {
  const g = A.globe; const L = A.layers;
  const panel = A.panel;
  panel.view = 'place';
  panel.setTab('none');
  A.openPanel(true);
  const b = panel.body;
  clear(b);
  g.labels.removeGroup('place');
  g.labels.add({ id: 'place-pin', group: 'place', text: `${A.fmt.lat(lat)}, ${A.fmt.lon(lon)}`, lon, lat, cls: 'note pin', nocollide: true, priority: 200 });
  const land = g.isLand(lon, lat);
  const near = A.geo.nearest(lon, lat, 600);
  const k = land ? L.koppenAt(lon, lat) : null;
  b.append(h('div', { class: 'crumb' }, 'Climate report'));
  b.append(h('h1', null, near && near.km < 120 ? `${near.place.n}, ${near.place.c}` : `${A.fmt.lat(lat)}, ${A.fmt.lon(lon)}`));
  b.append(h('p', { class: 'kicker' }, `${A.fmt.lat(lat)}, ${A.fmt.lon(lon)}` + (near && near.km >= 120 ? ` · about ${A.fmt.dist(near.km)} from ${near.place.n}` : '') + ` · ${land ? 'land' : 'open ocean'}`));
  b.append(h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => g.flyTo(lon, lat, 2.4, 1200) }, A.icon('pin'), 'Fly here'), h('button', { class: 'btn ghost', onclick: () => { g.labels.removeGroup('place'); panel.show('home'); } }, 'Close report')));
  b.append(h('p', { class: 'hint-line' }, 'Typical climate, not a forecast: monthly averages of 1991–2020 (climate zones: 1981–2010).'));
  if (k) b.append(h('div', { class: 'callout' }, h('b', { class: 't' }, 'Köppen–Geiger climate zone'), h('b', null, `${k.code}: ${k.name}`), `. About ${k.share}% of the world's land has this climate.`));

  const tGrid = L.grid('t2m'); const pGrid = L.grid('precip'); const sstGrid = L.grid('sst');
  const temp = Array.from({ length: 12 }, (_, m) => tGrid.at(m, lon, lat));
  const sst = land ? null : Array.from({ length: 12 }, (_, m) => sstGrid.at(m, lon, lat));
  const rain = Array.from({ length: 12 }, (_, m) => pGrid.at(m, lon, lat) * (CUM_DAYS[m + 1] - CUM_DAYS[m]));
  const annualRain = rain.reduce((a, c) => a + (Number.isFinite(c) ? c : 0), 0);
  const mean = temp.reduce((a, c) => a + c, 0) / 12;
  const hot = temp.indexOf(Math.max(...temp)); const cold = temp.indexOf(Math.min(...temp));
  b.append(h('div', { class: 'facts' },
    h('div', { class: 'fact' }, h('b', null, A.fmt.temp(mean, 1)), h('span', null, 'yearly average temperature')),
    h('div', { class: 'fact' }, h('b', null, `${MONTHS3[hot]} ${A.fmt.temp(temp[hot], 0)}`), h('span', null, 'warmest month')),
    h('div', { class: 'fact' }, h('b', null, `${MONTHS3[cold]} ${A.fmt.temp(temp[cold], 0)}`), h('span', null, 'coldest month')),
    h('div', { class: 'fact' }, h('b', null, A.state.units.precip === 'in' ? `${(annualRain / 25.4).toFixed(0)} in` : `${Math.round(annualRain).toLocaleString('en-GB')} mm`), h('span', null, 'rain and snow in a year'))));
  b.append(h('p', { class: 'srcs' }, 'Values come from the model grids (1–2.5 degrees), so they describe the surrounding region and can differ from a single weather station, especially in mountains and on coasts.'));

  const mx = Array.from({ length: 12 }, (_, i) => i + 1);
  const series = [{ name: 'Air temperature', x: mx, y: temp, color: 1, marker: true }];
  if (sst) series.push({ name: 'Sea surface', x: mx, y: sst, color: 0, marker: false });
  b.append(A.chart.line({ title: 'Temperature through the year', subtitle: 'Typical monthly average.', height: 190, series, x: { min: 1, max: 12, ticks: mx, format: v => MONTHS3[v - 1][0] }, y: { label: A.units.label('degC'), format: v => A.chart.fmtNum(A.units.convert(v, 'degC')) }, tipX: v => MONTHS[Math.round(v) - 1], unit: '', live: false }));
  b.append(A.chart.bars({ title: 'Rain and snow through the year', subtitle: 'Typical monthly total, in millimetres of water.', height: 180, categories: MONTHS3.map(m => m[0]), series: [{ name: 'Precipitation', y: rain.map(v => Math.round(v)), color: 0 }], unit: 'mm', valueLabels: false }));
  // wind
  const u = L.grid('u10'); const v = L.grid('v10');
  const speeds = []; const dirs = [];
  for (let m = 0; m < 12; m++) { const uu = u.at(m, lon, lat); const vv = v.at(m, lon, lat); speeds.push(Math.hypot(uu, vv)); dirs.push(mod(Math.atan2(-uu, -vv) * RAD, 360)); }
  b.append(A.chart.line({ title: 'Surface wind through the year', subtitle: `Typical wind speed. Prevailing direction: from the ${A.fmt.compass(dirs[monthOfDay(A.state.day)])} now; ${A.fmt.compass(dirs[0])} in January and ${A.fmt.compass(dirs[6])} in July.`, height: 170, series: [{ name: 'Wind speed', x: mx, y: speeds.map(s => A.units.convert(s, 'm/s')), color: 2, marker: false, area: true }], x: { min: 1, max: 12, ticks: mx, format: v2 => MONTHS3[v2 - 1][0] }, y: { min: 0, label: A.units.label('m/s') }, tipX: v2 => MONTHS[Math.round(v2) - 1] }));
  // daylight
  const days = Array.from({ length: 73 }, (_, i) => i * 5 + 1);
  b.append(A.chart.line({ title: 'Daylight through the year', subtitle: `Hours between sunrise and sunset at ${A.fmt.lat(lat)}.`, height: 170, live: true, series: [{ name: 'Daylight', x: days, y: days.map(d => A.geo.dayLength(lat, T().sun.declination[d - 1])), color: 3, marker: false, area: true }], x: { min: 1, max: 365, ticks: dayTicks, format: dayFmt }, y: { min: 0, max: 24, ticks: [0, 6, 12, 18, 24], label: 'Hours' }, tipX: dayTip, vlines: currentDayMarker() }));
  const f = A.geo.coriolis(lat);
  b.append(h('div', { class: 'callout' }, h('b', { class: 't' }, 'Spin of the Earth here'), `The Coriolis parameter is ${(f * 1e5).toFixed(2)} × 10`, h('sup', null, '−5'), ' s', h('sup', null, '−1'), Math.abs(lat) < 5 ? '. Close to the equator the Coriolis effect almost vanishes, which is why tropical cyclones never form there.' : `, so moving air is turned to the ${lat > 0 ? 'right' : 'left'} in this hemisphere.`));
};
