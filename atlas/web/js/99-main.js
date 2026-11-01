/* ------------------------------------------------------------------ start-up */
A.loadPack = async function loadPack(name) {
  if (A.packs[name]) return A.packs[name];
  const node = document.getElementById('pack-' + name);
  if (!node) throw new Error('Missing data pack ' + name);
  A.packs[name] = await Pack.fromBase64(node.textContent);
  node.textContent = '';
  return A.packs[name];
};

function progress(frac, message) {
  const bar = document.getElementById('intro-bar');
  if (bar) bar.style.width = `${Math.round(frac * 100)}%`;
  if (message) { const m = document.getElementById('intro-msg'); if (m) m.textContent = message; }
}
const tick = () => new Promise(r => setTimeout(r, 0));

function indexContent() {
  const d = A.data;
  d.glossaryIndex = {};
  for (const g of d.glossary) {
    for (const key of [g.key, ...(g.aliases || [])]) d.glossaryIndex[key.toLowerCase()] = { key: g.key, def: g.def };
  }
  A.topicById = Object.fromEntries(d.topics.map(t => [t.id, t]));
  A.pressureCentres = d.pressureCentres;
}

function bindKeys() {
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const g = A.globe;
    const step = g.morphTarget < 0.5 ? Math.max(2, (g.view.dist - 1) * 5) : Math.max(2, g.view.mapDist * 3);
    switch (e.key) {
      case 'ArrowLeft': g.nudge(-step, 0); break;
      case 'ArrowRight': g.nudge(step, 0); break;
      case 'ArrowUp': g.nudge(0, step); break;
      case 'ArrowDown': g.nudge(0, -step); break;
      case '+': case '=': g.zoomBy(0.8); break;
      case '-': case '_': g.zoomBy(1.25); break;
      case 'm': case 'M': A.setMode(g.mode === 'globe' ? 'map' : 'globe'); break;
      case ' ': e.preventDefault(); A.togglePlay(); break;
      case 'f': case 'F': A.setClean(!A.state.clean); break;
      case '?': case 'h': case 'H': A.showHelp(); break;
      case 'Escape': $('#modal').classList.remove('open'); break;
      default: return;
    }
  });
}

async function boot() {
  try {
    progress(0.04, 'Reading the explanations…');
    A.data = JSON.parse(document.getElementById('atlas-data').textContent);
    indexContent();
    A.state.theme = A.store.get('theme', (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', A.state.theme);
    A.state.units = Object.assign(A.state.units, A.store.get('units', {}));
    A.state.level = A.store.get('level', 2);

    progress(0.1, 'Unpacking climate data…');
    await tick();
    const core = await A.loadPack('core');
    progress(0.35, 'Building the globe…');
    await tick();
    const globe = new Globe(document.getElementById('gl'));
    A.globe = globe;
    A.layers = new LayerManager(globe);
    A.defineLayers(A.layers);
    globe.setMask(core.u8('landmask'));
    progress(0.5, 'Decoding satellite imagery…');
    await tick();
    const imagery = await A.loadPack('imagery');
    await globe.setImagery(imagery);
    progress(0.75, 'Drawing coastlines and names…');
    await tick();
    A.layers.buildBaseLines();
    A.layers.buildNames();
    A.hud.build();
    A.panel.init();
    A.initSearch();
    bindKeys();
    if (A.registerWidgets) A.registerWidgets();
    A.bus.on('interact', () => { globe.autoRotate = 0; });
    A.bus.on('theme', () => A.panel.view === 'topic' && A.state.topic && A.panel.showTopic(A.topicById[A.state.topic], false));

    // start at the current date and time, with the world's winds flowing
    const now = new Date();
    A.setTime(Math.min(364.99, (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000));
    await A.applyScene({ flows: ['wind10'], view: { lon: -25, lat: 22, dist: 4.7 }, ice: true }, { quiet: true });
    globe.autoRotate = 3.5;
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) A.openPanel(false);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    progress(1, 'Ready');
    document.getElementById('intro').classList.add('done');
    setTimeout(() => { const el = document.getElementById('intro'); if (el) el.remove(); }, 1000);
    A.ready = true;
    if (hash.get('topic') && A.topicById[hash.get('topic')]) A.openTopic(hash.get('topic'));
    document.title = `${A.data.app.title}: ${A.data.app.subtitle}`;
  } catch (err) {
    console.error(err);
    const intro = document.getElementById('intro');
    if (intro) {
      const msg = document.getElementById('intro-msg');
      if (msg) { msg.className = 'err'; msg.textContent = `Something went wrong while starting: ${err && err.message ? err.message : err}. WebGL and a current browser are required.`; }
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
