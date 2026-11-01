/* ------------------------------------------------------------------ helpers for interactive scenes */
A.ui = {
  slider(label, { min, max, step = 1, value, format = v => String(v), onInput, ariaLabel }) {
    const val = h('span', { class: 'val' }, format(value));
    const input = h('input', { type: 'range', min, max, step, value, 'aria-label': ariaLabel || label, oninput: e => { const v = +e.target.value; val.textContent = format(v); onInput(v); } });
    const row = h('div', { class: 'row' }, h('label', null, label), input, val);
    return { row, input, set(v) { input.value = v; val.textContent = format(+v); } };
  },
  buttons(label, items, onPick, current) {
    const seg = h('div', { class: 'seg' }, items.map(([id, text]) => h('button', {
      class: id === current ? 'on' : '', onclick: e => { $$('button', seg).forEach(b => b.classList.toggle('on', b === e.currentTarget)); onPick(id); },
    }, text)));
    return { row: h('div', { class: 'row' }, label ? h('label', null, label) : null, seg), seg };
  },
  readout() { return h('div', { class: 'readout' }); },
  button(text, onClick, icon) { return h('button', { class: 'hbtn', onclick: onClick }, icon ? A.icon(icon) : null, text); },
};

/** A group of 3D objects kept in the rotating world, removed together when a scene ends. */
class SceneGroup {
  constructor() { this.items = []; this.timers = []; this.frameHooks = []; }
  add(obj) { this.items.push(obj); return obj; }
  onFrame(fn) { const hook = A.bus.on('frame', fn); this.frameHooks.push(hook); return hook; }
  dispose() {
    for (const o of this.items) { if (o.dispose) o.dispose(); else if (o.parent) o.parent.remove(o); }
    for (const f of this.frameHooks) A.bus.off('frame', f);
    this.items = []; this.frameHooks = [];
  }
}

/** Canvas helper for the floating 2D viewers shown in the scene panel. */
A.canvasBox = function canvasBox(width, height) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = h('canvas', { width: Math.round(width * dpr), height: Math.round(height * dpr), style: { width: `${width}px`, height: `${height}px`, display: 'block', borderRadius: '8px', maxWidth: '100%' } });
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas, ctx, w: width, h: height };
};

A.registerWidgets = function registerWidgets() {
  for (const fn of A.widgetFactories || []) fn();
};
A.widgetFactories = [];
A.pickHook = null;
A.onGlobeClick = function onGlobeClick(e) {
  if (!e.hit) return;
  if (A.pickHook && A.pickHook(e.hit)) return;
  A.showPlace(e.hit.lon, e.hit.lat);
};
