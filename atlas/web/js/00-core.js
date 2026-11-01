'use strict';
/* Atmosphere Atlas: application code.
   The files in atlas/web/js are concatenated in numeric order by atlas/assemble.py. */

const A = {};
A.data = null;       // content, tables and credits injected by the build step
A.packs = {};        // decoded binary packs (core, imagery, storms, enso)
A.scenes = {};       // registered interactive 3D scenes
A.ready = false;

/* ------------------------------------------------------------------ DOM helpers */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/** Build an element: h('div', {class: 'x', onclick: fn, dataset: {a: 1}}, 'text', childElement). */
function h(tag, attrs, ...children) {
  const svgTags = new Set(['svg', 'g', 'path', 'line', 'circle', 'rect', 'text', 'polyline', 'polygon', 'defs',
    'linearGradient', 'stop', 'clipPath', 'ellipse', 'tspan', 'marker', 'use', 'title', 'desc', 'pattern']);
  const el = svgTags.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.setAttribute('class', value);
      else if (key === 'text') el.textContent = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/* ------------------------------------------------------------------ maths */
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap180 = lon => ((((lon + 180) % 360) + 360) % 360) - 180;
const mod = (a, n) => ((a % n) + n) % n;
const sign = x => (x > 0 ? 1 : x < 0 ? -1 : 0);

const EARTH_R = 6371.0;            // km
const OMEGA = 7.2921159e-5;        // rad/s, Earth's rotation rate
const GRAV = 9.80665;

/* ------------------------------------------------------------------ calendar */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS3 = MONTHS.map(m => m.slice(0, 3));
const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const MID_DAY = CUM_DAYS.slice(0, 12).map((c, i) => (c + CUM_DAYS[i + 1]) / 2);

/** Position of a day (0..365, days since 1 Jan 00:00) between the 12 monthly climatology slices. */
function monthPos(day) {
  const d = mod(day, 365);
  let i = -1;
  for (let k = 0; k < 12; k++) if (MID_DAY[k] <= d) i = k;
  let start;
  let end;
  if (i === -1) {                       // early January: between December and January
    i = 11;
    start = MID_DAY[11] - 365;
    end = MID_DAY[0];
  } else if (i === 11) {                // late December
    start = MID_DAY[11];
    end = MID_DAY[0] + 365;
  } else {
    start = MID_DAY[i];
    end = MID_DAY[i + 1];
  }
  return { i0: i, i1: (i + 1) % 12, t: clamp((d - start) / (end - start), 0, 1) };
}

function monthOfDay(day) {
  const d = mod(Math.floor(day), 365);
  for (let k = 0; k < 12; k++) if (d < CUM_DAYS[k + 1]) return k;
  return 11;
}

function dayLabel(day) {
  const d = mod(Math.floor(day), 365);
  const m = monthOfDay(d);
  return `${d - CUM_DAYS[m] + 1} ${MONTHS3[m]}`;
}

function dayFromMonth(m, fraction = 0.5) { return CUM_DAYS[m] + (CUM_DAYS[m + 1] - CUM_DAYS[m]) * fraction; }

function hourLabel(hour) {
  const total = Math.round(mod(hour, 24) * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} UTC`;
}

/* ------------------------------------------------------------------ global state and events */
A.bus = {
  _h: {},
  on(evt, fn) { (this._h[evt] = this._h[evt] || []).push(fn); return fn; },
  off(evt, fn) { this._h[evt] = (this._h[evt] || []).filter(f => f !== fn); },
  emit(evt, ...args) { for (const fn of (this._h[evt] || []).slice()) { try { fn(...args); } catch (e) { console.error(`handler for "${evt}" failed`, e); } } },
};

A.state = {
  day: 79.5,                 // days since 1 Jan 00:00 UTC (the fraction is the time of day)
  playing: false,
  playMode: 'season',        // 'season' | 'day'
  playSpeed: 1,
  units: { temp: 'C', speed: 'ms', pressure: 'hPa', precip: 'mm', dist: 'km' },
  level: 2,                  // reading level: 1 simple, 2 in depth, 3 expert
  theme: 'dark',
  shade: true,               // day/night shading
  topic: null,
  mode: 'globe',
};

/** Persist small preferences without ever failing when storage is blocked. */
A.store = {
  get(key, fallback) { try { const v = window.localStorage.getItem('atlas.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(key, value) { try { window.localStorage.setItem('atlas.' + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } },
};

/* ------------------------------------------------------------------ units and number formatting */
A.fmt = {
  num(v, digits = 0) {
    if (v === null || v === undefined || !Number.isFinite(v)) return '–';
    const s = Math.abs(v) < 0.5 * Math.pow(10, -digits) ? (0).toFixed(digits) : v.toFixed(digits);
    return s.replace('-', '−');
  },
  signed(v, digits = 1) {
    if (!Number.isFinite(v)) return '–';
    const s = v.toFixed(digits).replace('-', '−');
    return (v > 0 ? '+' : '') + s;
  },
  big(v) {
    if (!Number.isFinite(v)) return '–';
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1) + ' billion';
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + ' million';
    if (a >= 1e4) return Math.round(v).toLocaleString('en-GB');
    return String(Math.round(v * 100) / 100);
  },
  lat(lat) { return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`; },
  lon(lon) { const l = wrap180(lon); return `${Math.abs(l).toFixed(1)}°${l >= 0 ? 'E' : 'W'}`; },
  temp(c, digits = 1) {
    const u = A.state.units.temp;
    if (!Number.isFinite(c)) return '–';
    if (u === 'F') return `${A.fmt.num(c * 9 / 5 + 32, digits)}°F`;
    if (u === 'K') return `${A.fmt.num(c + 273.15, digits)} K`;
    return `${A.fmt.num(c, digits)}°C`;
  },
  tempDelta(c, digits = 1) {            // differences scale but do not shift
    const u = A.state.units.temp;
    if (!Number.isFinite(c)) return '–';
    if (u === 'F') return `${A.fmt.signed(c * 9 / 5, digits)}°F`;
    if (u === 'K') return `${A.fmt.signed(c, digits)} K`;
    return `${A.fmt.signed(c, digits)}°C`;
  },
  speed(ms, digits = 1) {
    const u = A.state.units.speed;
    if (!Number.isFinite(ms)) return '–';
    if (u === 'kmh') return `${A.fmt.num(ms * 3.6, digits)} km/h`;
    if (u === 'mph') return `${A.fmt.num(ms * 2.23694, digits)} mph`;
    if (u === 'kt') return `${A.fmt.num(ms * 1.94384, digits)} kt`;
    return `${A.fmt.num(ms, digits)} m/s`;
  },
  pressure(hpa, digits = 0) {
    const u = A.state.units.pressure;
    if (!Number.isFinite(hpa)) return '–';
    if (u === 'inHg') return `${(hpa * 0.02953).toFixed(2)} inHg`;
    if (u === 'mmHg') return `${A.fmt.num(hpa * 0.750062, 0)} mmHg`;
    return `${A.fmt.num(hpa, digits)} hPa`;
  },
  precip(mmDay, digits = 1) {
    if (!Number.isFinite(mmDay)) return '–';
    if (A.state.units.precip === 'in') return `${A.fmt.num(mmDay / 25.4, 2)} in/day`;
    return `${A.fmt.num(mmDay, digits)} mm/day`;
  },
  dist(km, digits = 0) {
    if (!Number.isFinite(km)) return '–';
    if (A.state.units.dist === 'mi') return `${Math.round(km * 0.621371).toLocaleString('en-GB')} mi`;
    return `${Math.round(km).toLocaleString('en-GB')} km`;
  },
  compass(deg) {
    const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return names[Math.round(mod(deg, 360) / 22.5) % 16];
  },
};

/** Convert a value of a data unit to the user's chosen unit for axis ticks and legends. */
A.units = {
  convert(value, unit) {
    const u = A.state.units;
    if (unit === 'degC') return u.temp === 'F' ? value * 9 / 5 + 32 : u.temp === 'K' ? value + 273.15 : value;
    if (unit === 'm/s') return u.speed === 'kmh' ? value * 3.6 : u.speed === 'mph' ? value * 2.23694 : u.speed === 'kt' ? value * 1.94384 : value;
    if (unit === 'hPa') return u.pressure === 'inHg' ? value * 0.02953 : u.pressure === 'mmHg' ? value * 0.750062 : value;
    if (unit === 'mm/day') return u.precip === 'in' ? value / 25.4 : value;
    return value;
  },
  label(unit) {
    const u = A.state.units;
    if (unit === 'degC') return u.temp === 'F' ? '°F' : u.temp === 'K' ? 'K' : '°C';
    if (unit === 'm/s') return u.speed === 'kmh' ? 'km/h' : u.speed === 'mph' ? 'mph' : u.speed === 'kt' ? 'kt' : 'm/s';
    if (unit === 'hPa') return u.pressure === 'inHg' ? 'inHg' : u.pressure === 'mmHg' ? 'mmHg' : 'hPa';
    if (unit === 'mm/day') return u.precip === 'in' ? 'in/day' : 'mm/day';
    if (unit === 'W/m2') return 'W/m²';
    if (unit === 'kg/m2') return 'kg/m²';
    if (unit === 'Pa/s') return 'Pa/s';
    return unit || '';
  },
  digits(unit) {
    const u = A.state.units;
    if (unit === 'hPa' && u.pressure === 'inHg') return 2;
    return unit === 'mm/day' ? (u.precip === 'in' ? 2 : 1) : 0;
  },
};

/* ------------------------------------------------------------------ rich text (a tiny, safe mark-up)
   **bold**   *italic*   ^{superscript}   _{subscript}   [[glossary term]] or [[term|shown text]]
   {{topic-id|link text}} opens a topic.  Everything else is plain text; nothing is parsed as HTML. */
A.rich = function rich(text) {
  const frag = document.createDocumentFragment();
  if (text === undefined || text === null) return frag;
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\^\{(.+?)\}|_\{(.+?)\}|\[\[(.+?)\]\]|\{\{(.+?)\}\}/g;
  let last = 0;
  let m;
  const str = String(text);
  while ((m = pattern.exec(str)) !== null) {
    if (m.index > last) frag.append(str.slice(last, m.index));
    if (m[1] !== undefined) frag.append(h('strong', null, A.rich(m[1])));
    else if (m[2] !== undefined) frag.append(h('em', null, A.rich(m[2])));
    else if (m[3] !== undefined) frag.append(h('sup', null, m[3]));
    else if (m[4] !== undefined) frag.append(h('sub', null, m[4]));
    else if (m[5] !== undefined) {
      const [term, shown] = m[5].split('|');
      frag.append(A.glossarySpan(term.trim(), (shown || term).trim()));
    } else if (m[6] !== undefined) {
      const [id, label] = m[6].split('|');
      frag.append(h('a', { class: 'xref', href: `#topic=${id.trim()}`, dataset: { topic: id.trim() },
        onclick: e => { e.preventDefault(); A.bus.emit('open-topic', id.trim()); } }, (label || id).trim()));
    }
    last = pattern.lastIndex;
  }
  if (last < str.length) frag.append(str.slice(last));
  return frag;
};

A.glossarySpan = function glossarySpan(term, shown) {
  const entry = A.glossaryLookup(term);
  if (!entry) return document.createTextNode(shown);
  return h('span', { class: 'gl', tabindex: '0', dataset: { term: entry.key },
    'aria-label': `${shown}: ${entry.def}` }, shown);
};

A.glossaryLookup = function glossaryLookup(term) {
  if (!A.data || !A.data.glossaryIndex) return null;
  return A.data.glossaryIndex[term.toLowerCase()] || null;
};

/** Plain-text version of the mark-up (for search and aria labels). */
A.plain = function plain(text) {
  return String(text || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    .replace(/\^\{(.+?)\}/g, '$1').replace(/_\{(.+?)\}/g, '$1')
    .replace(/\[\[(.+?)\|(.+?)\]\]/g, '$2').replace(/\[\[(.+?)\]\]/g, '$1')
    .replace(/\{\{(.+?)\|(.+?)\}\}/g, '$2').replace(/\{\{(.+?)\}\}/g, '$1');
};

/* ------------------------------------------------------------------ misc */
function debounce(fn, ms) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function throttle(fn, ms) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = performance.now();
    if (now - last >= ms) { last = now; fn(...args); }
    else { clearTimeout(timer); timer = setTimeout(() => { last = performance.now(); fn(...args); }, ms - (now - last)); }
  };
}

function toast(message, ms = 3200) {
  const box = $('#toast');
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => box.classList.remove('show'), ms);
}
