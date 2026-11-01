/* ------------------------------------------------------------------ the explanation panel */
A.panel = {
  view: 'home',

  init() {
    const nav = $('#panelnav');
    const tabs = [['home', 'Start', 'home'], ['library', 'Topics', 'list'], ['glossary', 'Glossary', 'book']];
    for (const [id, label] of tabs) {
      nav.append(h('button', { role: 'tab', id: `tab-${id}`, 'aria-selected': id === 'home' ? 'true' : 'false', onclick: () => this.show(id) }, label));
    }
    nav.append(h('span', { class: 'grow' }));
    $('#panelhandle').addEventListener('click', () => A.openPanel());
    this.body = $('#panelbody');
    document.addEventListener('pointerover', e => this.glossaryHover(e));
    document.addEventListener('focusin', e => this.glossaryHover(e));
    document.addEventListener('pointerout', e => { if (e.target.closest && e.target.closest('.gl')) $('#gltip').style.display = 'none'; });
    document.addEventListener('focusout', () => { $('#gltip').style.display = 'none'; });
    document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.gl'); if (g) this.glossaryHover({ target: g }); });
    this.show('home');
  },

  setTab(id) { $$('#panelnav [role=tab]').forEach(b => b.setAttribute('aria-selected', b.id === `tab-${id}` ? 'true' : 'false')); },

  show(view, arg) {
    this.view = view;
    this.setTab(view);
    clear(this.body);
    if (view === 'home') this.renderHome();
    else if (view === 'library') this.renderLibrary(arg);
    else if (view === 'glossary') this.renderGlossary();
    this.body.scrollTop = 0;
  },

  glossaryHover(e) {
    const el = e.target.closest ? e.target.closest('.gl') : null;
    const tip = $('#gltip');
    if (!el) return;
    const entry = A.data.glossaryIndex[(el.dataset.term || '').toLowerCase()];
    if (!entry) return;
    clear(tip);
    tip.append(h('b', null, entry.key), entry.def);
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth; const hh = tip.offsetHeight;
    tip.style.left = `${clamp(r.left, 8, window.innerWidth - w - 8)}px`;
    tip.style.top = `${r.top - hh - 8 > 8 ? r.top - hh - 8 : r.bottom + 8}px`;
  },

  /* ---------------------------------------------------------- home */
  renderHome() {
    const b = this.body;
    const end = A.data.manifest.seriesEnd.oni;
    const oniNote = end ? this.oniSentence(end) : '';
    b.append(h('div', { class: 'hero' },
      h('h1', null, 'How the weather, the oceans and the climate work'),
      h('p', { class: 'lead' }, 'An interactive model of the Earth, built from real satellite and weather data, that explains the winds, storms, ocean currents and climate rhythms of our planet, one idea at a time.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => this.startTour(A.data.tours[0]) }, A.icon('route'), 'Start the guided tour'),
        h('button', { class: 'btn ghost', onclick: () => this.show('library') }, A.icon('list'), 'Browse all topics'))));
    if (A.topicById['p3-overview']) b.append(h('div', { class: 'callout p3key' }, h('b', { class: 't' }, 'Working through these questions?'),
      'Every question of the atmospheric moisture, atmospheric motion and weather map practical is worked through step by step, with interactive diagrams. ',
      h('a', { href: '#topic=p3-overview', onclick: e => { e.preventDefault(); A.openTopic('p3-overview'); } }, 'Start with the overview.')));
    b.append(h('h2', null, 'Try something'));
    const quick = [
      ['Watch a year pass', 'The Sun’s overhead point swings between the tropics.', 'seasons'],
      ['Follow the global winds', 'Trade winds, westerlies and the jet stream, animated.', 'three-cells'],
      ['See where hurricanes go', 'More than 4,000 real tropical storm tracks.', 'tc-basins'],
      ['Watch El Niño rewrite the map', 'Real sea-surface temperature, month by month since 1950.', 'enso'],
    ];
    b.append(h('div', { class: 'tlist' }, quick.map(([t, s, id]) => h('button', { onclick: () => A.openTopic(id) }, h('span', null, h('b', null, t), h('br'), h('small', { style: { marginLeft: 0, textAlign: 'left' } }, s))))));
    const nCh = A.data.chapters.length;
    b.append(h('h2', null, `${{ 12: 'Twelve', 13: 'Thirteen' }[nCh] || nCh} chapters`));
    b.append(h('div', { class: 'chgrid' }, A.data.chapters.map(c => h('button', { class: 'chcard', onclick: () => this.show('library', c.id) },
      h('div', { class: 'ico' }, A.icon(A.chapterIcon[c.icon] || 'layers')), h('b', null, c.title), h('span', null, c.blurb)))));
    b.append(h('h2', null, 'Guided tours'));
    b.append(h('div', { class: 'tlist' }, A.data.tours.map(t => h('button', { onclick: () => this.startTour(t) }, h('span', null, h('b', null, t.title), h('br'), h('small', { style: { marginLeft: 0, textAlign: 'left' } }, t.blurb)), h('small', null, `${t.steps.length} stops`)))));
    b.append(h('h2', null, 'How to use the globe'));
    b.append(h('ul', { class: 'tryit' },
      h('li', null, h('b', null, 'Drag'), ' to turn the Earth, ', h('b', null, 'scroll or pinch'), ' to zoom, ', h('b', null, 'double-click'), ' to fly to a spot.'),
      h('li', null, 'Hover over any place to see its typical weather for the date shown; ', h('b', null, 'click'), ' for a full climate report.'),
      h('li', null, 'Use the ', h('b', null, 'Layers'), ' panel to colour the planet by temperature, rain, pressure and more, and to switch on moving winds and ocean currents.'),
      h('li', null, 'Slide the ', h('b', null, 'date'), ' to travel through the year. All maps are typical conditions for each month, averaged over 1991–2020.'),
      h('li', null, 'Change the reading level of any topic between ', h('b', null, 'Simple'), ', ', h('b', null, 'In depth'), ' and ', h('b', null, 'Expert'), '.')));
    if (oniNote) b.append(h('div', { class: 'callout' }, h('b', { class: 't' }, 'Latest data in this page'), oniNote));
  },

  oniSentence(e) {
    const v = e.value; const month = `${MONTHS[e.month[1] - 1]} ${e.month[0]}`;
    const cls = v >= 2 ? 'a very strong El Niño' : v >= 1.5 ? 'a strong El Niño' : v >= 1 ? 'a moderate El Niño' : v >= 0.5 ? 'a weak El Niño' : v <= -2 ? 'a very strong La Niña' : v <= -1.5 ? 'a strong La Niña' : v <= -1 ? 'a moderate La Niña' : v <= -0.5 ? 'a weak La Niña' : 'neutral ENSO conditions';
    return `The Oceanic Niño Index in the data bundled with this page is ${A.fmt.signed(v, 2)} °C for the season centred on ${month}, which means ${cls}. The El Niño topics explain what that does to weather worldwide.`;
  },

  startTour(tour) {
    this.tour = { ...tour, i: 0 };
    A.openTopic(tour.steps[0]);
  },

  /* ---------------------------------------------------------- library */
  renderLibrary(chapterId) {
    const b = this.body;
    const input = h('input', { id: 'libsearch', type: 'search', placeholder: 'Filter topics…', 'aria-label': 'Filter topics', oninput: e => draw(e.target.value) });
    const holder = h('div');
    b.append(h('h1', null, 'All topics'), input, holder);
    const draw = q => {
      clear(holder);
      const hits = q ? A.search(q) : null;
      let n = 0;
      for (const ch of A.data.chapters) {
        if (chapterId && !q && ch.id !== chapterId) continue;
        const list = A.data.topics.filter(t => t.chapter === ch.id && (!hits || hits.includes(t)));
        if (!list.length) continue;
        holder.append(h('h2', null, ch.title), h('div', { class: 'tlist' }, list.map(t => h('button', { onclick: () => A.openTopic(t.id) }, h('span', { class: 'num' }, String(++n).padStart(2, '0')), h('span', null, A.plain(t.title)), h('small', null, A.plain(t.kicker).slice(0, 70))))));
      }
      if (!holder.firstChild) holder.append(h('p', null, 'No topics match. Try a simpler word such as “wind”, “rain” or “ocean”.'));
      if (chapterId && !q) holder.append(h('button', { class: 'btn ghost', onclick: () => this.show('library') }, 'Show every chapter'));
    };
    draw('');
  },

  /* ---------------------------------------------------------- glossary */
  renderGlossary() {
    const b = this.body;
    b.append(h('h1', null, 'Glossary'), h('p', null, 'Plain-language definitions. Dotted words in the explanations also show their meaning when you hover over them or tap them.'));
    const dl = h('dl', { class: 'gloss' });
    for (const g of A.data.glossary) dl.append(h('dt', null, g.key), h('dd', null, g.def));
    b.append(dl);
  },

  /* ---------------------------------------------------------- one topic */
  showTopic(topic, scrollTop = true) {
    this.view = 'topic';
    this.setTab('none');
    const b = this.body;
    clear(b);
    const chapter = A.data.chapters.find(c => c.id === topic.chapter);
    const level = A.state.level;
    const idx = A.data.topics.indexOf(topic);
    b.append(h('div', { class: 'crumb' }, h('a', { href: '#', onclick: e => { e.preventDefault(); this.show('library', chapter.id); } }, chapter.title)));
    b.append(h('h1', null, A.rich(topic.title)), h('p', { class: 'kicker' }, A.rich(topic.kicker)));
    // reading level
    const seg = h('div', { class: 'seg' }, [['1', 'Simple'], ['2', 'In depth'], ['3', 'Expert']].map(([v, t]) => h('button', {
      class: String(level) === v ? 'on' : '', 'aria-pressed': String(level) === v ? 'true' : 'false',
      onclick: () => { A.state.level = +v; A.store.set('level', +v); this.showTopic(topic, false); },
    }, t)));
    b.append(h('div', { class: 'levels' }, h('span', null, 'Reading level'), seg));
    b.append(h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => A.openTopic(topic.id, { scrollTop: false }) }, A.icon('globe'), 'Show on the globe'),
      h('button', { class: 'btn ghost', onclick: () => { A.globe.flyTo(-25, 22, 4.6, 1200); } }, A.icon('reset'), 'Reset view')));
    // plain-language core
    topic.simple.forEach((p, i) => b.append(h('p', { class: i === 0 ? 'lead' : '' }, A.rich(p))));
    if (topic.facts.length) b.append(h('div', { class: 'facts' }, topic.facts.map(([v, l]) => h('div', { class: 'fact' }, h('b', null, A.rich(v)), h('span', null, A.rich(l))))));
    // charts
    const charts = topic.charts || [];
    const visibleCharts = level >= 2 ? charts : charts.slice(0, 1);
    for (const spec of visibleCharts) b.append(A.buildChart(spec));
    if (level < 2 && charts.length > 1) b.append(h('p', { class: 'srcs' }, 'Switch to “In depth” to see all the charts for this topic.'));
    if (level >= 2) {
      for (const [head, text] of topic.detail) b.append(h('h2', null, A.rich(head)), ...this.paragraphs(text));
      if (topic.myths.length) topic.myths.forEach(([m, r]) => b.append(h('div', { class: 'callout myth' }, h('b', { class: 't' }, 'Common misconception'), h('b', null, A.rich(m)), ' ', A.rich(r))));
    }
    if (level >= 3 && topic.expert.length) {
      const box = h('div', { class: 'expert' }, h('div', { class: 'crumb', style: { marginTop: '10px' } }, 'Expert detail'));
      for (const [head, text] of topic.expert) box.append(h('h3', null, A.rich(head)), ...this.paragraphs(text));
      b.append(box);
    }
    if (topic.try_it.length) { b.append(h('h2', null, 'Try it on the globe'), h('ul', { class: 'tryit' }, topic.try_it.map(t => h('li', null, A.rich(t))))); }
    if (topic.quiz && topic.quiz.length) b.append(...topic.quiz.map(q => this.quiz(q)));
    if (topic.see.length) b.append(h('h2', null, 'Related topics'), h('div', { class: 'seealso' }, topic.see.map(id => A.topicById[id] ? h('a', { class: 'chip', href: `#topic=${id}`, onclick: e => { e.preventDefault(); A.openTopic(id); } }, A.plain(A.topicById[id].title)) : null)));
    if (topic.sources.length) b.append(h('h3', null, 'Sources'), h('ul', { class: 'srcs' }, topic.sources.map(s => h('li', null, s))));
    // pager: tour order if touring, otherwise the chapter order
    const order = this.tour ? this.tour.steps.map(id => A.topicById[id]) : A.data.topics;
    const pos = order.indexOf(topic);
    const prev = pos > 0 ? order[pos - 1] : null; const next = pos >= 0 && pos < order.length - 1 ? order[pos + 1] : null;
    if (this.tour && pos < 0) this.tour = null;
    const pager = h('div', { class: 'pager' },
      prev ? h('button', { onclick: () => A.openTopic(prev.id) }, h('small', null, this.tour ? `Tour · stop ${pos}` : 'Previous'), A.plain(prev.title)) : h('span'),
      next ? h('button', { class: 'next', onclick: () => A.openTopic(next.id) }, h('small', null, this.tour ? `Tour · stop ${pos + 2} of ${order.length}` : 'Next'), A.plain(next.title)) : h('span'));
    b.append(pager);
    if (scrollTop) b.scrollTop = 0;
    void idx;
  },

  paragraphs(text) {
    return String(text).split('\n').map(line => {
      if (line.startsWith('EQ:')) return h('code', { class: 'eq' }, A.rich(line.slice(3).trim()));
      return h('p', null, A.rich(line));
    });
  },

  quiz(q) {
    const box = h('div', { class: 'quiz' }, h('b', null, 'Check your understanding'), h('p', null, A.rich(q.q)));
    const why = h('div', { class: 'why' });
    q.options.forEach((o, i) => {
      const btn = h('button', { class: 'opt', onclick: () => {
        $$('.opt', box).forEach((x, k) => { x.disabled = true; if (k === q.answer) x.classList.add('right'); });
        if (i !== q.answer) btn.classList.add('wrong');
        clear(why); why.append((i === q.answer ? 'Correct. ' : 'Not quite. '), A.rich(q.why));
      } }, A.rich(o));
      box.append(btn);
    });
    box.append(why);
    return box;
  },
};

A.chapterIcon = { sun: 'sun', layers: 'layers', wind: 'wind', cells: 'cells', waves: 'waves', front: 'front', cyclone: 'cyclone', pulse: 'pulse', drop: 'drop', thermo: 'thermo', rainbow: 'rainbow', satellite: 'satellite', book: 'book' };

/** Rank topics for a text query (title, tags, one-liner, then body text). */
A.search = function search(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = [];
  for (const t of A.data.topics) {
    const title = A.plain(t.title).toLowerCase(); const kicker = A.plain(t.kicker).toLowerCase();
    const tags = (t.tags || []).join(' ').toLowerCase();
    const body = (t.simple.join(' ') + ' ' + t.detail.map(d => d.join(' ')).join(' ')).toLowerCase();
    let s = 0; let ok = true;
    for (const w of terms) {
      let m = 0;
      if (title.includes(w)) m += 10; if (tags.includes(w)) m += 6; if (kicker.includes(w)) m += 4; if (body.includes(w)) m += 1;
      if (!m) { ok = false; break; }
      s += m;
    }
    if (ok) scored.push([s, t]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(x => x[1]);
};

A.initSearch = function initSearch() {
  const box = A.hud.search;
  const input = $('input', box); const results = $('#searchresults');
  const close = () => results.classList.remove('open');
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clear(results);
    if (q.length < 2) { close(); return; }
    const hits = A.search(q).slice(0, 8);
    const gl = A.data.glossary.filter(g => g.key.toLowerCase().includes(q.toLowerCase())).slice(0, 3);
    for (const t of hits) results.append(h('button', { onclick: () => { close(); input.value = ''; A.openTopic(t.id); } }, A.plain(t.title), h('small', null, A.plain(t.kicker).slice(0, 80))));
    for (const g of gl) results.append(h('button', { onclick: () => { close(); input.value = ''; A.panel.show('glossary'); A.openPanel(true); } }, `Glossary: ${g.key}`, h('small', null, g.def.slice(0, 80))));
    if (!results.firstChild) results.append(h('button', { disabled: true }, 'No matching topics'));
    results.classList.add('open');
  });
  input.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); input.blur(); } if (e.key === 'Enter') { const b = $('button', results); if (b) b.click(); } });
  document.addEventListener('click', e => { if (!box.contains(e.target)) close(); });
};

/* ------------------------------------------------------------------ dialogs */
A.modal = function modal(build) {
  const m = $('#modal'); const card = $('.card', m);
  clear(card);
  card.append(h('button', { class: 'close', 'aria-label': 'Close', onclick: () => m.classList.remove('open') }, '×'));
  build(card);
  m.classList.add('open');
  m.onclick = e => { if (e.target === m) m.classList.remove('open'); };
};

/** A plain account of what the date, the clock and each layer mean, with the data period of every layer. */
A.showTimeInfo = function showTimeInfo() {
  const L = A.layers;
  const on = {
    colour: id => L.colorId === id, flow: id => L.hasFlow(id), contour: id => L.contours.has(id), centres: () => !!L.centresOn, shade: () => A.state.shade,
  };
  const b = k => { const x = A.dataBasis[k]; return `${x.years} · ${x.name}`; };
  const rows = [
    ['Colours', 'Air temperature near the ground', b('ncep'), on.colour('t2m')], ['Colours', 'Temperature at 1.5 km', b('ncep'), on.colour('t850')],
    ['Colours', 'Sea-level pressure', b('ncep'), on.colour('slp')], ['Colours', 'Height of the 500 hPa surface', b('ncep'), on.colour('z500')],
    ['Colours', 'Rising and sinking air', b('ncep'), on.colour('omega500')], ['Colours', 'Jet-stream speed', b('ncep'), on.colour('jetspeed')],
    ['Colours', 'Surface wind speed', b('ncep'), on.colour('windspeed')], ['Colours', 'Rainfall and snowfall', b('gpcp'), on.colour('precip')],
    ['Colours', 'Water vapour in the air', b('ncep'), on.colour('pwat')], ['Colours', 'Cloud cover (model)', b('ncep'), on.colour('cloud')],
    ['Colours', 'Towering tropical cloud', b('olr'), on.colour('olr')], ['Colours', 'Sea-surface temperature', b('oisst'), on.colour('sst')],
    ['Colours', 'Ocean current speed', b('oscar'), on.colour('curspeed')], ['Colours', 'Sea warming since 1901 (fixed)', b('ersst'), on.colour('sst_trend')],
    ['Colours', 'Climate zones (fixed)', b('udel'), on.colour('koppen')],
    ['Moving lines', 'Winds at four heights', b('ncep'), ['wind10', 'wind850', 'wind500', 'wind250'].some(on.flow)], ['Moving lines', 'Ocean currents', b('oscar'), on.flow('currents')],
    ['Lines and markers', 'Isobars and 500 hPa height contours', b('ncep'), on.contour('isobars') || on.contour('z500')],
    ['Lines and markers', 'Highs and lows (H / L)', 'Average positions of the long-lasting systems', on.centres()],
    ['Appearance', 'Seasonal sea ice', b('oisst'), A.globe.uniforms.uIceOn.value > 0.5],
    ['Appearance', 'Day and night shading', 'Exact astronomy for the date and UTC time on the clock', on.shade()],
    ['Pictures', 'Satellite picture of the surface', 'NASA Blue Marble, one picture for each month of 2004', true],
    ['Pictures', 'City lights on the night side', 'NASA Black Marble, 2016', on.shade()],
  ];
  A.modal(c => {
    c.append(h('h2', null, 'What the date, the clock and the colours mean'),
      h('p', null, h('b', null, 'This atlas shows a typical year, not a real one. '), 'There is no live weather, no forecast and no single day in it. Every colour, wind line, current, pressure line and ice edge is the average of many past years for each calendar month (the table says which years), blended smoothly from one month to the next as the date moves. So the map for 30 May, for example, shows what late May is usually like.'),
      h('h3', null, 'What the controls change'),
      h('ul', { class: 'tryit' },
        h('li', null, h('b', null, 'The date and the time of day'), ' move the Sun: where it is overhead and which places are in daylight and darkness. This is exact astronomy for that date and UTC time; the year makes no difference.'),
        h('li', null, h('b', null, 'The date'), ' also moves the colour layers and wind and current lines from one monthly average to the next, and the seasonal picture of snow and vegetation.'),
        h('li', null, h('b', null, 'The time of day'), ' does not change any colour layer. Daily swings of temperature and wind are not in this data.'),
        h('li', null, h('b', null, 'The moving streaks'), ' are a way of drawing the direction and speed of the average wind or current at each place. They keep flowing at all times, but they are not a recording of real air.'),
        h('li', null, h('b', null, 'The Now button'), ' sets the Sun to your current date and time. The colours become the typical conditions for today’s date, not today’s weather.')),
      h('h3', null, 'Where real, dated data are used'),
      h('p', null, 'The El Niño time machine shows an actual month (its key names it, for example “November 1997”) with its own slider. The storm tracks and hall of fame are real storms on their real dates. Charts with years on their axes (global temperature, carbon dioxide, sea ice, sea level and the climate indices) are measured records. The El Niño and La Niña maps are averages of the 10 El Niño or 11 La Niña winters since 1950 (those with a December–February index of 1 °C or more), not of every year.'));
    const t = h('table', { class: 'data' }, h('thead', null, h('tr', null, h('th', null, 'Kind'), h('th', null, 'What it is'), h('th', null, 'Period and source'), h('th', null, 'On now'))));
    const body = h('tbody');
    for (const [kind, what, basis, active] of rows) body.append(h('tr', null, h('td', null, kind), h('td', null, what), h('td', null, basis), h('td', null, active ? '●' : '')));
    t.append(body);
    c.append(h('h3', null, 'The data behind each layer'), h('div', { style: { overflowX: 'auto' } }, t),
      h('p', { class: 'srcs' }, 'Averages for the atmosphere are for 1991–2020, the current standard period of the World Meteorological Organization. Ocean currents come from only two years, 2012–2013, so they show a typical pattern but not a long-term average.'));
  });
};

A.showHelp = function showHelp() {
  A.modal(c => {
    c.append(h('h2', null, 'How to use this atlas'),
      h('p', null, 'The globe on the left is a model of the real Earth. Everything you see is either a NASA satellite picture or a map made from decades of observations by weather agencies. The panel on the right explains what you are looking at.'),
      h('h3', null, 'Moving around'),
      h('ul', { class: 'tryit' }, h('li', null, h('b', null, 'Drag'), ' to rotate; scroll or pinch to zoom; double-click to fly to a place.'), h('li', null, 'Press ', h('span', { class: 'kbd' }, 'M'), ' to flip between globe and flat map, ', h('span', { class: 'kbd' }, 'Space'), ' to play the seasons, arrow keys to turn the globe, ', h('span', { class: 'kbd' }, '+'), ' ', h('span', { class: 'kbd' }, '−'), ' to zoom.'),
        h('li', null, 'Hover for typical weather at any point; click for a climate report with charts.')),
      h('h3', null, 'Clearing the view'),
      h('p', null, 'Every window can be folded away so that nothing hides the globe: use the small arrow on the layer list, the colour key, the time bar and the laboratory windows (a closed laboratory leaves a tab at the bottom to bring it back). The side panel has its own tab on its edge. The ', h('b', null, 'Globe only'), ' button at the top, or the ', h('span', { class: 'kbd' }, 'F'), ' key, hides everything at once and shows it again with the next press. All of them are open again whenever the page is reloaded.'),
      h('h3', null, 'Time: the fourth dimension'),
      h('p', null, h('b', null, 'Typical conditions, not live weather. '), 'The bottom bar moves through a typical year and through the day. The “What do the date and colours mean?” link under it explains each layer and its data period.'),
      h('p', null, 'The bottom bar moves through the year and through the day. Maps of temperature, wind, rain and ocean currents are long-term averages for each month, blended smoothly from one month to the next. Day and night follow the exact position of the Sun for the date and time shown, and the satellite image changes with the seasons.'),
      h('h3', null, 'Reading levels'),
      h('p', null, 'Every topic has a plain-language version, an in-depth version with the mechanism and extra charts, and an expert version with equations and figures. Switch at the top of any topic.'),
      h('h3', null, 'Good to know'),
      h('p', null, 'Colour maps show typical conditions, not today’s forecast. Single storms, such as the hurricane hall of fame, show real historical tracks. Everything works offline once this page is open.'));
  });
};

A.showCredits = function showCredits() {
  A.modal(c => {
    c.append(h('h2', null, 'Data sources and credits'),
      h('p', null, 'All maps and charts are made from open scientific data. The page was built from these sources' + (A.data.manifest.refreshed ? ` (data prepared ${A.data.manifest.refreshed})` : '') + '.'));
    const t = h('table', { class: 'data' }, h('thead', null, h('tr', null, h('th', null, 'Dataset'), h('th', null, 'Provider'), h('th', null, 'Used for'))));
    const body = h('tbody');
    for (const s of A.data.credits) body.append(h('tr', null, h('td', null, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title), h('br'), h('small', { style: { color: 'var(--ink-3)' } }, s.credit)), h('td', null, s.provider), h('td', null, s.usedFor)));
    t.append(body);
    c.append(t, h('p', { class: 'srcs' }, 'Natural Earth map data is in the public domain. three.js is used under the MIT licence. Sea-surface temperature, rainfall and pressure fields are 1991–2020 monthly climatologies; ocean currents are a 2012–2013 monthly average.'));
  });
};
