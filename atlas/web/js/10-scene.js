/* ------------------------------------------------------------------ scenes: how a topic configures the globe */
A.widgets = {};            // interactive controllers registered by id
A.activeWidget = null;

/** Set layers, time and camera from a topic's `scene` description.  Missing keys reset to the default look. */
A.applyScene = async function applyScene(scene = {}, { quiet = false } = {}) {
  const g = A.globe; const L = A.layers;
  if (A.activeWidget) { try { A.activeWidget.exit(); } catch (e) { console.error(e); } A.activeWidget = null; }
  A.sceneCtl.hide();
  g.labels.removeGroup('scene');
  if (A.sceneRings) { A.sceneRings.dispose(); A.sceneRings = null; }
  if (A.storms) A.storms.clearScene();
  // time
  if (scene.month !== undefined) A.setTime(Math.floor(dayFromMonth(scene.month - 1, 0.5)) + (scene.hour !== undefined ? scene.hour / 24 : mod(A.state.day, 1)));
  else if (scene.day !== undefined) A.setTime(scene.day + (scene.hour !== undefined ? scene.hour / 24 : mod(A.state.day, 1)));
  else if (scene.hour !== undefined) A.setTime(Math.floor(A.state.day) + scene.hour / 24);
  if (scene.play) { A.state.playMode = scene.play; if (!A.state.playing) A.togglePlay(true); } else if (A.state.playing) A.togglePlay(false);
  // layers
  A.state.shade = scene.shade !== false;
  L.enableSeaIce(scene.ice !== false);
  for (const id of ['wind10', 'wind850', 'wind500', 'wind250', 'currents']) L.setFlow(id, (scene.flows || []).includes(id));
  for (const id of ['isobars', 'z500']) L.setContour(id, (scene.contours || []).includes(id));
  L.setPressureCentres(!!scene.centres);
  for (const id of ['borders', 'rivers', 'graticule', 'keylat']) L.setBase(id, (scene.base || []).includes(id));
  A.setNames('places', (scene.names || []).includes('places'));
  A.setNames('seas', scene.seaNames !== false);
  await L.setColor(scene.color || null);
  if (scene.opacity !== undefined && L.slots[0].active) L.slots[0].setOpacity(scene.opacity);
  // camera
  if (scene.map || A.state.mode === 'map') {            // a reader who chose the flat map keeps it while browsing topics
    A.setMode('map');
    const v = scene.view || {};
    const lat = v.lat !== undefined ? (scene.map ? v.lat : clamp(v.lat, -40, 40)) : 0;
    g.flyTo(v.lon !== undefined ? v.lon : g.view.lon, lat, null, quiet ? 1 : 1100, v.mapDist || 6.4);
  } else {
    A.setMode('globe');
    if (scene.view) g.flyTo(scene.view.lon, scene.view.lat, scene.view.dist || 4.6, quiet ? 1 : 1500);
  }
  // annotations
  if (scene.circles && scene.circles.length) {         // small circles drawn on the globe: {lon, lat, radius (degrees of arc), label}
    A.sceneRings = new GeoLines(g, { color: '#9dffb0', opacity: 0.95, height: 0.007, order: 6 });
    A.sceneRings.set(scene.circles.map(c => {
      const out = [];
      for (let b = 0; b <= 360; b += 4) { const d = A.geo.destination(c.lon, c.lat, b, c.radius * 111.195); out.push([d.lon, d.lat]); }
      return out;
    }));
    scene.circles.forEach((c, i) => { if (c.label) { const d = A.geo.destination(c.lon, c.lat, c.labelBearing === undefined ? 0 : c.labelBearing, c.radius * 111.195); g.labels.add({ id: `ring${i}`, group: 'scene', text: c.label, lon: d.lon, lat: d.lat, cls: 'note', priority: 90, nocollide: true }); } });
  }
  (scene.pins || []).forEach((p, i) => g.labels.add({ id: `pin${i}`, group: 'scene', text: p.text, lon: p.lon, lat: p.lat, cls: 'note pin', priority: 100 - i, nocollide: true }));
  if (scene.storms && A.storms) A.storms.apply(scene.storms);
  A.hud.syncDock();
  g.requestRender();
};

/** Open a topic in the panel, apply its globe scene and start its interactive controller. */
A.openTopic = async function openTopic(id, { scrollTop = true } = {}) {
  const topic = A.topicById[id];
  if (!topic) return;
  A.state.topic = id;
  if (A.state.clean) A.setClean(false);
  A.panel.showTopic(topic, scrollTop);
  A.openPanel(true);
  history.replaceState(null, '', `#topic=${id}`);
  await A.applyScene(topic.scene || {});
  if (topic.widget) {
    const [wid, arg] = topic.widget.split(':');
    if (A.widgets[wid]) {
      A.activeWidget = A.widgets[wid];
      try { await A.activeWidget.enter(topic, arg); } catch (e) { console.error('widget failed', e); }
    }
  }
};

A.bus.on('open-topic', id => A.openTopic(id));

A.openPanel = function openPanel(open) {
  const p = $('#panel');
  const want = open === undefined ? p.classList.contains('closed') : open;
  p.classList.toggle('closed', !want);
  setTimeout(() => A.updateInset(), 320);
  A.updateInset();
};

A.updateInset = function updateInset() {
  const p = $('#panel');
  if (!A.globe) return;
  A.globe.resize();
  void p;
};
