/* ------------------------------------------------------------------ icons */
A.icons = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5" opacity=".5"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/>',
  cells: '<path d="M4 18c0-6 4-10 8-10s8 4 8 10"/><path d="m16 5 3 3-3 3"/><path d="M8 19l-3-3 3-3"/><path d="M12 8V4"/>',
  waves: '<path d="M2 8c3-3 5 3 8 0s5 3 8 0 4 2 4 2"/><path d="M2 14c3-3 5 3 8 0s5 3 8 0 4 2 4 2"/><path d="M2 20c3-3 5 3 8 0s5 3 8 0 4 2 4 2"/>',
  front: '<path d="M3 17c4 0 4-8 9-8s5 8 9 8"/><path d="m6 17-1.5-2.5M12 9l-1.5-2M18 17l-1.5-2.5"/>',
  cyclone: '<circle cx="12" cy="12" r="2"/><path d="M12 10C12 5 16 3 20 4M14 12c5 0 7 4 6 8M12 14c0 5-4 7-8 6M10 12C5 12 3 8 4 4"/>',
  pulse: '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>',
  drop: '<path d="M12 3C8 9 6 12 6 15a6 6 0 0 0 12 0c0-3-2-6-6-12Z"/>',
  thermo: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0V4Z"/><path d="M12 9v6"/>',
  rainbow: '<path d="M3 18a9 9 0 0 1 18 0"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/><path d="M10 18a2 2 0 0 1 4 0"/>',
  satellite: '<rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><path d="m4 4 3 3M17 17l3 3M3 9l4 4M11 17l4 4"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  reset: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
A.icon = function icon(name, cls) {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${A.icons[name] || ''}</svg>`;
  const svg = wrap.firstChild;
  if (cls) svg.setAttribute('class', cls);
  svg.style.width = '1.15em'; svg.style.height = '1.15em';
  return svg;
};

/* ------------------------------------------------------------------ layer definitions */
A.defineLayers = function defineLayers(L) {
  const d = x => L.define(x);
  d({ id: 't2m', group: 'air', title: 'Air temperature', field: 't2m', cmap: 'thermal', range: [-45, 45], unit: 'degC', mask: 0, ticks: [-40, -20, 0, 20, 40] });
  d({ id: 't850', group: 'air', title: 'Temperature at 1.5 km (850 hPa)', field: 't850', cmap: 'thermal', range: [-45, 35], unit: 'degC', mask: 0, ticks: [-40, -20, 0, 20] });
  d({ id: 'slp', group: 'air', title: 'Sea-level pressure', field: 'slp', cmap: 'pressure', range: [984, 1044], unit: 'hPa', mask: 0, ticks: [990, 1000, 1013, 1025, 1040], opacity: 0.8 });
  d({ id: 'z500', group: 'air', title: 'Height of the 500 hPa surface', field: 'z500', cmap: 'thermal', range: [4800, 5900], unit: 'm', mask: 0, ticks: [4900, 5200, 5500, 5800] });
  d({ id: 'omega500', group: 'air', title: 'Rising and sinking air (500 hPa)', field: 'omega500', cmap: 'vertical', range: [-0.08, 0.08], unit: 'Pa/s', mask: 0, ticks: [-0.08, 0, 0.08], tickLabels: ['rising', '', 'sinking'] });
  d({ id: 'jetspeed', group: 'air', title: 'Jet-stream speed (250 hPa)', speedOf: ['u250', 'v250'], cmap: 'speed', range: [0, 70], unit: 'm/s', mask: 0, ticks: [0, 20, 40, 60], opacity: 0.9 });
  d({ id: 'windspeed', group: 'air', title: 'Surface wind speed', speedOf: ['u10', 'v10'], cmap: 'speed', range: [0, 14], unit: 'm/s', mask: 0, ticks: [0, 4, 8, 12], opacity: 0.9 });
  d({ id: 'precip', group: 'water', title: 'Rainfall and snowfall', field: 'precip', cmap: 'precip', range: [0, 14], gamma: 0.55, unit: 'mm/day', mask: 0, ticks: [0, 2, 5, 10], opacity: 0.95 });
  d({ id: 'pwat', group: 'water', title: 'Water vapour in the air', field: 'pwat', cmap: 'water', range: [0, 60], unit: 'kg/m2', mask: 0, ticks: [0, 20, 40, 60] });
  d({ id: 'cloud', group: 'water', title: 'Cloud cover (model)', field: 'cloud', cmap: 'cloud', range: [10, 95], unit: '%', mask: 0, ticks: [20, 50, 80], opacity: 0.9 });
  d({ id: 'olr', group: 'water', title: 'Towering tropical cloud (low heat loss)', field: 'olr', cmap: 'cloud', range: [150, 300], invert: true, unit: 'W/m2', mask: 0, ticks: [160, 200, 240, 280], opacity: 0.92 });
  d({ id: 'sst', group: 'ocean', title: 'Sea-surface temperature', field: 'sst', cmap: 'thermal', range: [-2, 32], unit: 'degC', mask: 1, ticks: [0, 10, 20, 30] });
  d({ id: 'curspeed', group: 'ocean', title: 'Ocean current speed', speedOf: ['cur_u', 'cur_v'], cmap: 'speed', range: [0, 1], gamma: 0.7, unit: 'm/s', mask: 1, ticks: [0, 0.25, 0.5, 1], opacity: 0.9 });
  d({ id: 'sst_trend', group: 'ocean', title: 'Sea warming since 1901', field: 'sst_trend', pack: 'enso', cmap: 'trend', range: [-2, 2], unit: '°C per century', mask: 1, ticks: [-2, -1, 0, 1, 2], static: true, clockNote: 'This long-term trend map is fixed: it does not change with the date or time.' });
  d({ id: 'koppen', group: 'climate', title: 'Climate zones (Köppen–Geiger)', kind: 'category', clockNote: 'Climate zones are fixed: they do not change with the date or time.' });
};

/* ------------------------------------------------------------------ what the date and clock really mean for each layer */
A.dataBasis = {
  ncep: { years: '1991–2020', name: 'NCEP/NCAR Reanalysis', what: 'monthly averages' },
  gpcp: { years: '1991–2020', name: 'GPCP satellite and rain-gauge rainfall', what: 'monthly averages' },
  olr: { years: '1991–2020', name: 'NOAA interpolated outgoing longwave radiation', what: 'monthly averages' },
  oisst: { years: '1991–2020', name: 'NOAA OISST sea-surface temperature and sea ice', what: 'monthly averages' },
  oscar: { years: '2012–2013', name: 'OSCAR satellite-derived ocean currents', what: 'monthly averages of two years' },
  ersst: { years: '1901 to the present', name: 'NOAA ERSST v5', what: 'a fixed long-term trend' },
  udel: { years: '1981–2010', name: 'University of Delaware station climate', what: 'fixed climate zones' },
};
A.layerBasis = { t2m: 'ncep', t850: 'ncep', slp: 'ncep', z500: 'ncep', omega500: 'ncep', jetspeed: 'ncep', windspeed: 'ncep', pwat: 'ncep', cloud: 'ncep',
  precip: 'gpcp', olr: 'olr', sst: 'oisst', curspeed: 'oscar', sst_trend: 'ersst', koppen: 'udel',
  wind10: 'ncep', wind850: 'ncep', wind500: 'ncep', wind250: 'ncep', currents: 'oscar' };
/** One sentence saying what the colours mean at the moment shown on the clock. */
A.whenText = function whenText(def) {
  if (!def) return '';
  if (def.clockNote) return typeof def.clockNote === 'function' ? def.clockNote() : def.clockNote;
  const b = A.dataBasis[A.layerBasis[def.id]];
  return b ? `Typical for ${dayLabel(A.state.day)}: the ${b.years} average, not one real day or year.` : '';
};
/** The short line under the time bar: what the clock changes and what it does not. */
A.timeScope = function timeScope() {
  const L = A.layers;
  const def = L && L.colorId ? L.defs[L.colorId] : null;
  if (def && def.clockNote) return typeof def.clockNote === 'function' ? def.clockNote() : def.clockNote;
  const flows = L ? [...L.flows.keys()] : [];
  const lines = L && (L.contours.size || L.centresOn);
  if (def || flows.length || lines) {
    return `The date and clock move the Sun and the night shadow. The colours and moving lines are typical conditions for this time of year (averages of many past years, not one real day or year), blended between months.`;
  }
  return 'The date and clock move the Sun, the night shadow and the seasonal satellite picture. Colour layers, when you switch them on, show typical conditions (averages of past years), never one real day.';
};

A.layerGroups = [
  { id: 'air', title: 'Air and pressure', colour: true }, { id: 'water', title: 'Water in the air', colour: true },
  { id: 'ocean', title: 'Ocean', colour: true }, { id: 'climate', title: 'Climate', colour: true },
];

/* ------------------------------------------------------------------ time handling */
A.setTime = function setTime(day, { silent = false } = {}) {
  A.state.day = mod(day, 365);
  if (A.globe) { A.globe.setSun(A.state.day); A.globe.setSeasonImagery(A.state.day); }
  if (A.layers) A.layers.setDay(A.state.day);
  if (!silent) A.bus.emit('time', A.state.day);
};

/* ------------------------------------------------------------------ HUD */
A.hud = {
  build() {
    const stage = $('#stage');
    // ---------- top bar
    const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'View' },
      h('button', { class: 'on', dataset: { mode: 'globe' }, onclick: () => A.setMode('globe') }, 'Globe'),
      h('button', { dataset: { mode: 'map' }, onclick: () => A.setMode('map') }, 'Flat map'));
    this.modeSeg = modeSeg;
    const search = h('div', { id: 'searchbox' }, A.icon('search'),
      h('input', { type: 'search', placeholder: 'Search topics, e.g. jet stream', 'aria-label': 'Search topics', autocomplete: 'off' }),
      h('div', { id: 'searchresults', role: 'listbox' }));
    this.search = search;
    const units = h('button', { class: 'hbtn', title: 'Units', onclick: () => this.toggleUnits() }, A.icon('settings'), h('span', null, 'Units'));
    this.cleanButton = h('button', { class: 'hbtn', id: 'cleanbtn', 'aria-pressed': 'false', title: 'Hide every panel and bar to see only the globe (press F)', onclick: () => A.setClean(!A.state.clean) }, A.icon('eye'), h('span', null, 'Globe only'));
    const theme = h('button', { class: 'hbtn', title: 'Switch light and dark theme', 'aria-label': 'Switch theme', onclick: () => A.setTheme(A.state.theme === 'dark' ? 'light' : 'dark') }, A.icon('moon'));
    const help = h('button', { class: 'hbtn', title: 'How to use this atlas', onclick: () => A.showHelp() }, A.icon('help'), h('span', null, 'Help'));
    const credits = h('button', { class: 'hbtn', title: 'Data sources and credits', onclick: () => A.showCredits() }, A.icon('info'), h('span', null, 'Data'));
    const topbar = h('div', { id: 'topbar', class: 'hud' },
      h('div', { id: 'brand' }, h('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true' }, h('circle', { cx: 32, cy: 32, r: 28, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4 }), h('path', { d: 'M4 32h56M10 18h44M10 46h44', stroke: 'var(--accent)', 'stroke-width': 3, fill: 'none' }), h('ellipse', { cx: 32, cy: 32, rx: 12, ry: 28, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3 })),
        h('div', null, A.data.app.title, h('small', null, 'Interactive 4D weather and climate'))),
      modeSeg, search, h('span', { class: 'spacer' }), this.cleanButton, units, theme, help, credits);
    stage.append(topbar);
    this.units = null;

    // ---------- layer dock
    this.dockSummary = h('small', { class: 'sum' });
    this.dockButton = h('button', { class: 'hud-min', 'aria-label': 'Hide or show the list of layers', 'aria-expanded': 'true', title: 'Hide the list of layers', onclick: e => { e.stopPropagation(); this.setDockMin(!this.dock.classList.contains('collapsed')); } }, A.icon('chevron'));
    const dock = h('div', { id: 'layerdock', class: 'hud' },
      h('header', { onclick: () => this.setDockMin(!this.dock.classList.contains('collapsed')) }, h('span', { class: 'hd-title' }, A.icon('layers'), 'Layers', this.dockSummary), this.dockButton),
      h('div', { class: 'body' }));
    stage.append(dock);
    this.dock = dock;
    this.buildDock();

    // ---------- legend, time bar, probe, scene panel
    stage.append(h('div', { id: 'legend', class: 'hud' }));
    stage.append(h('div', { id: 'scenectl', class: 'hud' }));
    stage.append(h('div', { id: 'probe', class: 'hud' }));
    this.buildTimebar(stage);
    A.bus.on('layers', () => { this.syncDock(); this.updateLegend(); });
    A.bus.on('units', () => this.updateLegend());
    A.bus.on('hover', e => this.hover(e));
    A.bus.on('interact', () => this.hideProbe());
    A.bus.on('click', e => A.onGlobeClick && A.onGlobeClick(e));
    this.updateLegend();
  },

  /* ---------------------------------------------------------- layer dock */
  buildDock() {
    const body = $('.body', this.dock);
    clear(body);
    this.rows = {};
    const L = A.layers;
    const basisTip = key => { const b = A.dataBasis[key]; return b ? `${b.what[0].toUpperCase()}${b.what.slice(1)}, ${b.years}. Source: ${b.name}.` : ''; };
    const addRadio = (parent, def) => {
      const id = `lay-${def.id}`;
      const input = h('input', { type: 'radio', name: 'colorlayer', id, onchange: () => L.setColor(def.id) });
      parent.append(h('div', { class: 'lrow', title: basisTip(A.layerBasis[def.id]) }, input, h('label', { for: id }, def.title)));
      this.rows['c:' + def.id] = input;
    };
    const addCheck = (parent, key, label, get, set, dot, tip) => {
      const id = `chk-${key}`;
      const input = h('input', { type: 'checkbox', id, onchange: e => set(e.target.checked) });
      parent.append(h('div', { class: 'lrow', title: tip || '' }, input, dot ? h('span', { class: 'dot', style: { background: dot } }) : null, h('label', { for: id }, label)));
      this.rows[key] = { input, get };
    };
    body.append(h('p', { class: 'dock-note' }, 'These are typical conditions, not live weather: each layer is an average of many past years for the time of year on the clock. Hover a layer to see its data period.'));
    const none = h('div', { class: 'lgroup' }, h('h4', null, 'Colour map'));
    const noneId = 'lay-none';
    const noneInput = h('input', { type: 'radio', name: 'colorlayer', id: noneId, checked: true, onchange: () => L.setColor(null) });
    none.append(h('div', { class: 'lrow' }, noneInput, h('label', { for: noneId }, 'None (satellite view)')));
    this.rows['c:none'] = noneInput;
    body.append(none);
    for (const g of A.layerGroups) {
      const sec = h('div', { class: 'lgroup' }, h('h4', null, g.title));
      for (const def of Object.values(L.defs).filter(x => x.group === g.id)) addRadio(sec, def);
      body.append(sec);
    }
    const opac = h('div', { class: 'lslider' }, h('input', { type: 'range', min: 0.15, max: 1, step: 0.05, value: 0.85, 'aria-label': 'Colour layer opacity', oninput: e => L.slots[0].setOpacity(+e.target.value) }));
    body.append(opac);

    const motion = h('div', { class: 'lgroup' }, h('h4', null, 'Moving air and water'));
    const flows = [['wind10', 'Surface winds'], ['wind850', 'Winds at 1.5 km'], ['wind500', 'Winds at 5.5 km'], ['wind250', 'Jet-stream winds (10 km)'], ['currents', 'Ocean currents']];
    for (const [id, label] of flows) addCheck(motion, 'f:' + id, label, () => L.hasFlow(id), on => L.setFlow(id, on), null, `Average ${id === 'currents' ? 'current' : 'wind'} for this time of year (${A.dataBasis[A.layerBasis[id]].years}), drawn as drifting streaks. Not live.`);
    body.append(motion);

    const lines = h('div', { class: 'lgroup' }, h('h4', null, 'Lines and markers'));
    addCheck(lines, 'k:isobars', 'Isobars (pressure lines)', () => L.contours.has('isobars'), on => L.setContour('isobars', on), null, 'Lines of equal pressure drawn from the 1991–2020 average sea-level pressure for this time of year.');
    addCheck(lines, 'k:z500', 'Height contours (500 hPa)', () => L.contours.has('z500'), on => L.setContour('z500', on), null, 'Height of the 500 hPa surface, 1991–2020 average for this time of year.');
    addCheck(lines, 'k:centres', 'Highs and lows (H / L)', () => !!L.centresOn, on => L.setPressureCentres(on), null, 'The long-lasting highs and lows of the average pressure map, not today’s weather systems.');
    addCheck(lines, 'b:borders', 'Country borders', () => L.isBaseOn('borders'), on => L.setBase('borders', on));
    addCheck(lines, 'b:rivers', 'Major rivers', () => L.isBaseOn('rivers'), on => L.setBase('rivers', on));
    addCheck(lines, 'b:graticule', 'Latitude and longitude grid', () => L.isBaseOn('graticule'), on => L.setBase('graticule', on));
    addCheck(lines, 'b:keylat', 'Equator, tropics, polar circles', () => L.isBaseOn('keylat'), on => L.setBase('keylat', on));
    addCheck(lines, 'n:places', 'Cities', () => A.namesOn.places, on => A.setNames('places', on));
    addCheck(lines, 'n:seas', 'Ocean and sea names', () => A.namesOn.seas, on => A.setNames('seas', on));
    body.append(lines);

    const scene = h('div', { class: 'lgroup' }, h('h4', null, 'Appearance'));
    addCheck(scene, 's:shade', 'Day and night shading', () => A.state.shade, on => { A.state.shade = on; A.globe.requestRender(); }, null, 'Exact astronomy for the date and time on the clock (UTC). The year does not matter.');
    addCheck(scene, 's:ice', 'Seasonal sea ice', () => !!A.layers.iceGrid && A.globe.uniforms.uIceOn.value > 0.5, on => A.layers.enableSeaIce(on), null, 'Typical sea-ice cover for this time of year, 1991–2020 average (NOAA OISST).');
    addCheck(scene, 's:spin', 'Slow rotation', () => A.globe.autoRotate > 0, on => { A.globe.autoRotate = on ? 4 : 0; A.globe.requestRender(); });
    body.append(scene);
    this.syncDock();
  },

  syncDock() {
    if (!this.rows) return;
    for (const [key, row] of Object.entries(this.rows)) {
      if (key.startsWith('c:')) continue;
      row.input.checked = !!row.get();
    }
    const cid = A.layers.colorId;
    for (const [key, input] of Object.entries(this.rows)) if (key.startsWith('c:')) input.checked = key === 'c:' + (cid || 'none');
    if (this.dockSummary) this.dockSummary.textContent = cid && A.layers.defs[cid] ? A.layers.defs[cid].title : 'satellite view';
  },

  /** Fold the layer list away (to a one-line tab) or open it again. */
  setDockMin(min) {
    this.dock.classList.toggle('collapsed', min);
    $('#stage').classList.toggle('dock-min', min);
    this.dockButton.setAttribute('aria-expanded', String(!min));
    this.dockButton.title = min ? 'Show the list of layers' : 'Hide the list of layers';
  },

  /* ---------------------------------------------------------- legend */
  /** Under the time bar: what the clock changes and what it does not. */
  updateClockNote() {
    const text = $('#tb-scope-text');
    if (text) text.textContent = A.timeScope();
  },

  /** The line in the colour key that says which time the colours stand for. */
  whenLine(def) {
    this.whenDef = def;
    this.whenEl = h('div', { class: 'sub when' }, A.whenText(def));
    return this.whenEl;
  },

  updateLegend() {
    this.updateClockNote();
    this.whenEl = null;
    const box = $('#legend');
    if (!box) return;
    clear(box);
    const L = A.layers;
    const def = L.colorId ? L.defs[L.colorId] : null;
    const flows = [...L.flows.keys()];
    if (!def && !flows.length) { box.classList.remove('show'); return; }
    box.classList.add('show');
    box.classList.toggle('min', !!this.legendMin);
    box.append(h('button', { class: 'hud-min', 'aria-label': 'Hide or show the colour key', 'aria-expanded': String(!this.legendMin), title: this.legendMin ? 'Show the colour key' : 'Hide the colour key',
      onclick: () => { this.legendMin = !this.legendMin; this.updateLegend(); } }, A.icon('chevron')));
    if (!def) box.append(h('div', { class: 'ttl' }, 'Moving air and water'));
    if (def && def.kind === 'category') {
      const classes = A.packs.core.json('koppen_classes');
      box.append(h('div', { class: 'ttl' }, def.title), h('div', { class: 'sub' }, 'Colours show the climate class'), this.whenLine(def));
      const list = h('div', { class: 'klist' });
      for (const c of classes) list.append(h('span', { title: `${c.name}: ${c.share}% of land` }, h('i', { style: { background: `rgb(${c.rgb.join(',')})` } }), `${c.code} ${c.name.length > 22 ? c.name.slice(0, 21) + '…' : c.name}`));
      box.append(list);
    } else if (def) {
      box.append(h('div', { class: 'ttl' }, def.title), h('div', { class: 'sub' }, def.unit ? A.units.label(def.unit) : ''), this.whenLine(def));
      box.append(h('div', { class: 'bar', style: { background: A.cmap.css(def.cmap, !!def.invert) } }));
      const ticks = h('div', { class: 'ticks' });
      const [lo, hi] = def.range;
      if (def.tickLabels) def.tickLabels.forEach(t => ticks.append(h('span', null, t || '')));
      else {
        const vals = def.ticks || A.chart.ticks(lo, hi, 4);
        const dgt = A.units.digits(def.unit);
        for (const v of vals) ticks.append(h('span', null, A.fmt.num(A.units.convert(v, def.unit), dgt)));
      }
      box.append(ticks);
      if (L.colorId === 'olr') box.append(h('div', { class: 'sub' }, 'Brighter = taller, colder cloud tops'));
    }
    if (flows.length) {
      const names = { wind10: 'surface wind', wind850: 'wind at 1.5 km', wind500: 'wind at 5.5 km', wind250: 'jet-stream wind', currents: 'ocean current' };
      box.append(h('div', { class: 'sub', style: { marginTop: '6px' } }, `Moving lines: ${flows.map(f => names[f]).join(', ')}, the average for this time of year (${[...new Set(flows.map(f => A.dataBasis[A.layerBasis[f]].years))].join(' and ')}). They drift to show direction and speed (brighter means faster); they are not a recording of real weather.`));
    }
  },

  /* ---------------------------------------------------------- time bar */
  buildTimebar(stage) {
    const bar = h('div', { id: 'timebar', class: 'hud' });
    const play = h('button', { class: 'pbtn', 'aria-label': 'Play or pause', onclick: () => A.togglePlay() }, A.icon('play'));
    this.playBtn = play;
    const read = h('div', { class: 'tb-read' }, h('strong', { id: 'tb-date' }), h('span', { id: 'tb-sub' }));
    const dayInput = h('input', { type: 'range', id: 'tb-day', min: 0, max: 364, step: 1, 'aria-label': 'Day of the year', oninput: e => A.setTime(+e.target.value + mod(A.state.day, 1)) });
    const hourInput = h('input', { type: 'range', id: 'tb-hour', min: 0, max: 23.75, step: 0.25, 'aria-label': 'Time of day (UTC)', oninput: e => A.setTime(Math.floor(A.state.day) + (+e.target.value) / 24) });
    const rail = h('div', { class: 'monthrail' }, MONTHS3.map((m, i) => h('span', { onclick: () => A.setTime(dayFromMonth(i, 0.5) + mod(A.state.day, 1)) }, m)));
    const sliders = h('div', { class: 'tb-sliders' }, dayInput, rail, h('div', { class: 'tb-hour', title: 'The time of day moves the Sun and the night shadow. The colour layers do not change with it.' }, h('span', null, 'Time of day (Sun only)'), hourInput));
    const mode = h('select', { class: 'small-select', 'aria-label': 'What the play button animates', onchange: e => { A.state.playMode = e.target.value; } },
      h('option', { value: 'season' }, 'Animate the year'), h('option', { value: 'day' }, 'Animate the day'));
    const speed = h('select', { class: 'small-select', 'aria-label': 'Playback speed', onchange: e => { A.state.playSpeed = +e.target.value; } },
      [[0.02, '0.02×'], [0.05, '0.05×'], [0.1, '0.1×'], [0.25, '0.25×'], [0.5, '0.5×'], [1, '1×'], [2, '2×'], [5, '5×']].map(([v, label]) => h('option', { value: v, selected: v === 1 }, label)));
    const picks = h('select', { class: 'small-select', 'aria-label': 'Jump to a date', onchange: e => { if (e.target.value !== '') A.setTime(+e.target.value + mod(A.state.day, 1)); e.target.value = ''; } },
      h('option', { value: '' }, 'Jump to…'), h('option', { value: 79 }, 'March equinox'), h('option', { value: 171 }, 'June solstice'), h('option', { value: 265 }, 'September equinox'), h('option', { value: 354 }, 'December solstice'));
    const now = h('button', { class: 'hbtn', onclick: () => A.setNow(), title: 'Set the Sun to the current date and time (UTC). The colours stay typical conditions for today’s date; this atlas has no live weather.' }, A.icon('clock'), 'Now');
    const tbMin = h('button', { class: 'hud-min', 'aria-label': 'Hide or show the time controls', 'aria-expanded': 'true', title: 'Hide the time controls', onclick: () => { const min = !bar.classList.contains('min'); bar.classList.toggle('min', min); tbMin.setAttribute('aria-expanded', String(!min)); tbMin.title = min ? 'Show the time controls' : 'Hide the time controls'; } }, A.icon('chevron'));
    const scope = h('div', { class: 'tb-scope' }, A.icon('info'), h('span', { id: 'tb-scope-text' }), h('button', { class: 'linkbtn', onclick: () => A.showTimeInfo() }, 'What do the date and colours mean?'));
    bar.append(play, read, sliders, h('div', { class: 'tb-ctl', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, mode, speed, picks, now), tbMin, scope);
    stage.append(bar);
    // other floating windows sit just above the time bar, however tall it is
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => stage.style.setProperty('--tb-top', `${bar.offsetHeight + 22}px`)).observe(bar);
    A.bus.on('time', () => this.syncTime());
    this.syncTime();
  },

  syncTime() {
    const d = A.state.day;
    $('#tb-day').value = Math.floor(d);
    $('#tb-hour').value = Math.floor(mod(d, 1) * 96) / 4;
    $('#tb-date').textContent = `${dayLabel(d)} · ${hourLabel(mod(d, 1) * 24)}`;
    const s = A.globe && A.globe.sunState ? A.globe.sunState : A.geo.sun(d);
    $('#tb-sub').textContent = `Sun overhead at ${A.fmt.lat(s.lat)}, ${A.fmt.lon(s.lon)}`;
    if (this.whenEl && this.whenEl.isConnected) this.whenEl.textContent = A.whenText(this.whenDef);
    if (this._probeShown) this.refreshProbeHint();
  },

  /* ---------------------------------------------------------- units menu */
  toggleUnits() {
    if (this.units) { this.units.remove(); this.units = null; return; }
    const mk = (key, label, opts) => h('div', { class: 'row' }, h('label', null, label), h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', {
      class: A.state.units[key] === v ? 'on' : '', onclick: e => {
        A.state.units[key] = v; A.store.set('units', A.state.units);
        $$('button', e.target.parentNode).forEach(b => b.classList.toggle('on', b === e.target));
        A.bus.emit('units');
      },
    }, t))));
    this.units = h('div', { class: 'hud', id: 'unitsmenu', style: { top: '64px', right: '12px', padding: '10px 14px', width: '330px', fontSize: '13px' } },
      mk('temp', 'Temperature', [['C', '°C'], ['F', '°F'], ['K', 'K']]), mk('speed', 'Wind speed', [['ms', 'm/s'], ['kmh', 'km/h'], ['mph', 'mph'], ['kt', 'kt']]),
      mk('pressure', 'Pressure', [['hPa', 'hPa'], ['inHg', 'inHg'], ['mmHg', 'mmHg']]), mk('precip', 'Rainfall', [['mm', 'mm'], ['in', 'in']]), mk('dist', 'Distance', [['km', 'km'], ['mi', 'mi']]));
    $$('.row', this.units).forEach(r => { r.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:5px 0'; });
    $('#stage').append(this.units);
  },

  /* ---------------------------------------------------------- probe */
  hideProbe() { $('#probe').classList.remove('show'); this._probeShown = false; },

  refreshProbeHint() {
    if (this.probeHint) this.probeHint.textContent = `Typical values for ${dayLabel(A.state.day)}: averages of many past years (not a real day or year). Click for a climate report.`;
  },

  hover(e) {
    const box = $('#probe');
    if (!e.hit || A.globe.pointers.size > 0) { box.classList.remove('show'); return; }
    const { lon, lat } = e.hit;
    clear(box);
    const near = A.geo.nearest(lon, lat, 300);
    const title = `${A.fmt.lat(lat)}, ${A.fmt.lon(lon)}`;
    box.append(h('div', { class: 'pl' }, title));
    if (near) box.append(h('div', { class: 'hint' }, `near ${near.place.n}, ${near.place.c} (${A.fmt.dist(near.km)})`));
    const tbl = h('table');
    for (const r of A.layers.probe(lon, lat)) tbl.append(h('tr', null, h('td', null, r.k), h('td', null, r.v)));
    const k = A.globe.isLand(lon, lat) ? A.layers.koppenAt(lon, lat) : null;
    if (k) tbl.append(h('tr', null, h('td', null, 'Climate zone'), h('td', null, `${k.code} · ${k.name}`)));
    this.probeHint = h('div', { class: 'hint' });
    box.append(tbl, this.probeHint);
    this.refreshProbeHint();
    box.classList.add('show');
    this._probeShown = true;
    const rect = $('#stage').getBoundingClientRect();
    let x = e.clientX - rect.left + 16; let y = e.clientY - rect.top + 16;
    const bw = box.offsetWidth; const bh = box.offsetHeight;
    if (x + bw > rect.width - 8) x = e.clientX - rect.left - bw - 16;
    if (y + bh > rect.height - 8) y = e.clientY - rect.top - bh - 16;
    box.style.left = `${Math.max(8, x)}px`; box.style.top = `${Math.max(8, y)}px`;
  },
};

A.sceneCtl = {
  title: '',
  show(title, build) {
    const box = $('#scenectl');
    this.title = title;
    clear(box);
    box.classList.remove('min', 'closed');
    const fold = h('button', { class: 'hud-min', 'aria-label': 'Fold or unfold this window', 'aria-expanded': 'true', title: 'Fold this window away (keeps the title bar)', onclick: () => this.fold(!box.classList.contains('min')) }, A.icon('chevron'));
    const shut = h('button', { class: 'hud-close', 'aria-label': 'Close this window', title: 'Close this window (a tab brings it back)', onclick: () => this.close() }, A.icon('close'));
    box.append(h('div', { class: 'sc-head' }, h('h5', null, title), fold, shut));
    const body = h('div', { class: 'sc-body' });
    box.append(body);
    build(body);
    box.classList.add('show');
    this.fold = on => { box.classList.toggle('min', on); fold.setAttribute('aria-expanded', String(!on)); fold.title = on ? 'Unfold this window' : 'Fold this window away (keeps the title bar)'; };
    this.refreshTab();
  },
  hide() { const box = $('#scenectl'); box.classList.remove('show', 'min', 'closed'); clear(box); this.title = ''; this.refreshTab(); },
  close() { $('#scenectl').classList.add('closed'); this.refreshTab(); },
  reopen() { $('#scenectl').classList.remove('closed'); this.fold(false); this.refreshTab(); },
  /** The small tab that appears while the window is closed. */
  refreshTab() {
    let tab = $('#sctab');
    if (!tab) {
      tab = h('button', { id: 'sctab', class: 'hud', 'aria-label': 'Show the window that was closed', onclick: () => this.reopen() });
      $('#stage').append(tab);
    }
    const closed = $('#scenectl').classList.contains('closed') && $('#scenectl').classList.contains('show');
    clear(tab);
    if (closed) tab.append(A.icon('chevron'), h('span', null, `Show: ${this.title}`));
    tab.classList.toggle('open', closed);
  },
  fold() {},
};

/* ------------------------------------------------------------------ globe-only view: hide every bar and panel */
A.setClean = function setClean(on) {
  A.state.clean = !!on;
  const stage = $('#stage');
  stage.classList.toggle('clean', A.state.clean);
  const btn = $('#cleanbtn');
  if (btn) { btn.classList.toggle('on', A.state.clean); btn.setAttribute('aria-pressed', String(A.state.clean)); $('span', btn).textContent = A.state.clean ? 'Show panels' : 'Globe only'; }
  const panel = $('#panel');
  if (A.state.clean) { A._panelWasOpen = !panel.classList.contains('closed'); A.openPanel(false); }
  else if (A._panelWasOpen) { A.openPanel(true); A._panelWasOpen = false; }
};

/* ------------------------------------------------------------------ playback, "now", theme, mode */
A.togglePlay = function togglePlay(force) {
  A.state.playing = force === undefined ? !A.state.playing : force;
  clear(A.hud.playBtn);
  A.hud.playBtn.append(A.icon(A.state.playing ? 'pause' : 'play'));
  A.globe.needAnimation(A.state.playing ? 1 : -1);
};

A.bus.on('frame', dt => {
  if (!A.state.playing) return;
  const speed = A.state.playSpeed;
  if (A.state.playMode === 'season') A.setTime(A.state.day + dt * 26 * speed);
  else {
    const day = Math.floor(A.state.day);
    A.setTime(day + mod(A.state.day - day + dt * speed / 12, 1));
  }
});

A.setNow = function setNow() {
  const n = new Date();
  const start = Date.UTC(n.getUTCFullYear(), 0, 1);
  const day = (n.getTime() - start) / 86400000;
  A.setTime(Math.min(364.99, day));
  toast('The Sun now shows your current date and time (UTC). The colours remain typical conditions for this date, not today’s weather.');
};

A.setTheme = function setTheme(theme) {
  A.state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  A.store.set('theme', theme);
  A.bus.emit('theme', theme);
};

A.setMode = function setMode(mode) {
  A.globe.setMode(mode);
  $$('button', A.hud.modeSeg).forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
};

A.namesOn = { places: false, seas: true };
A.setNames = function setNames(group, on) {
  A.namesOn[group] = on;
  A.globe.labels.setGroupVisible(group, on);
};
