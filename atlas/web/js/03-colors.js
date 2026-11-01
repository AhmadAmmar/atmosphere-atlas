/* ------------------------------------------------------------------ colour ramps
   Sequential ramps use one hue; diverging ramps run between two opposite hues through a
   neutral midpoint; "thermal" is the conventional semantic-heat ramp for temperature.
   Stops are [position 0..1, '#rrggbb', alpha 0..1]. */
A.cmap = {
  defs: {
    thermal: [[0, '#2a2a7f'], [0.12, '#2f55c1'], [0.25, '#4f95e0'], [0.37, '#8fcdea'], [0.46, '#dcefef'], [0.5, '#f2f0e6'],
      [0.56, '#f6e3a1'], [0.66, '#f4bb58'], [0.78, '#ee8a3a'], [0.9, '#d14a2a'], [1, '#8c1d2c']],
    pressure: [[0, '#9c1c2c'], [0.2, '#d4502e'], [0.4, '#f1b078'], [0.5, '#f1ede4'], [0.6, '#a9cdea'], [0.8, '#4a89d6'], [1, '#1f3f99']],
    precip: [[0, '#1e4a8c', 0], [0.06, '#2c6fb7', 0.3], [0.22, '#3fa1d8', 0.62], [0.5, '#7fd3e0', 0.82], [0.78, '#c5f0ec', 0.92], [1, '#ffffff', 0.97]],
    water: [[0, '#14594e', 0], [0.12, '#1d7f6e', 0.4], [0.4, '#3fbf9f', 0.7], [0.75, '#a8ecd5', 0.88], [1, '#f2fff9', 0.95]],
    cloud: [[0, '#ffffff', 0], [0.25, '#e8eef5', 0.18], [0.6, '#f4f7fb', 0.6], [1, '#ffffff', 0.95]],
    ice: [[0, '#dbe8f5', 0], [0.15, '#dbe8f5', 0.55], [1, '#ffffff', 0.97]],
    speed: [[0, '#2a5fa8', 0.0], [0.12, '#2f78c8', 0.45], [0.4, '#6fb0f0', 0.75], [0.7, '#c3e0fb', 0.9], [1, '#ffffff', 0.97]],
    vertical: [[0, '#1c64c8', 0.9], [0.22, '#4d98e4', 0.7], [0.4, '#a9ccee', 0.25], [0.5, '#e9e6dc', 0], [0.6, '#f0c9a1', 0.25],
      [0.78, '#e48b4b', 0.7], [1, '#c4531f', 0.9]],
    anomaly: [[0, '#1b4fb5', 0.95], [0.18, '#3c7fda', 0.85], [0.36, '#9cc3ee', 0.55], [0.46, '#dce8f4', 0.12], [0.5, '#f4f2ea', 0],
      [0.54, '#f6e0d2', 0.12], [0.64, '#f1a58a', 0.55], [0.82, '#dc5a47', 0.85], [1, '#a8231f', 0.95]],
    wetdry: [[0, '#b4531f', 0.95], [0.2, '#dd8a45', 0.8], [0.4, '#f0cfa4', 0.4], [0.5, '#f1efe8', 0], [0.6, '#b4dcee', 0.4],
      [0.8, '#4b97dc', 0.8], [1, '#1b4fb5', 0.95]],
    trend: [[0, '#1b4fb5', 0.95], [0.25, '#6aa5e4', 0.75], [0.42, '#c6dcf0', 0.3], [0.5, '#f4f2ea', 0], [0.58, '#f6dccb', 0.3],
      [0.75, '#ee9a7e', 0.75], [1, '#a8231f', 0.95]],
    ozone: [[0, '#4a2a8c', 0.9], [0.5, '#7aa3e8', 0.6], [1, '#e8f4ff', 0.2]],
    divL: [[0, '#1f5bb5'], [0.25, '#7fb0ea'], [0.5, '#f0efec'], [0.75, '#f0a090'], [1, '#b8302a']],
    divD: [[0, '#3987e5'], [0.25, '#2c5a96'], [0.5, '#383835'], [0.75, '#a8503a'], [1, '#e66767']],
  },
  _lutCache: {},

  hex(hexColor) {
    const n = parseInt(hexColor.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },

  /** 256-entry RGBA lookup table (Uint8Array, 1024 bytes). */
  lut(name, n = 256) {
    const key = name + ':' + n;
    if (this._lutCache[key]) return this._lutCache[key];
    const stops = this.defs[name];
    if (!stops) throw new Error('unknown colour ramp ' + name);
    const out = new Uint8Array(n * 4);
    const parsed = stops.map(s => ({ t: s[0], rgb: this.hex(s[1]), a: s[2] === undefined ? 1 : s[2] }));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let k = 0;
      while (k < parsed.length - 2 && t > parsed[k + 1].t) k++;
      const a = parsed[k]; const b = parsed[k + 1];
      const f = clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(lerp(a.rgb[c], b.rgb[c], f));
      out[i * 4 + 3] = Math.round(255 * lerp(a.a, b.a, f));
    }
    this._lutCache[key] = out;
    return out;
  },

  /** [r, g, b, a] (0..255) for t in 0..1. */
  color(name, t) {
    const lut = this.lut(name);
    const i = clamp(Math.round(t * 255), 0, 255) * 4;
    return [lut[i], lut[i + 1], lut[i + 2], lut[i + 3] / 255];
  },

  /** CSS gradient for a legend bar (opaque, so the colour progression is always readable). */
  css(name, reverse = false) {
    const stops = (this.defs[name] || []).map(s => [s[0], s[1]]);
    if (reverse) stops.reverse().forEach(s => { s[0] = 1 - s[0]; });
    return 'linear-gradient(to right,' + stops.map(s => `${s[1]} ${(s[0] * 100).toFixed(1)}%`).join(',') + ')';
  },
};

/* Categorical series colours (validated reference palette, light and dark steps). */
A.series = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  get(i) { return (A.state.theme === 'light' ? this.light : this.dark)[i % 8]; },
};

/* Saffir-Simpson scale colours: index 0 is a tropical storm (below hurricane strength), 1-5 the categories. */
A.catColors = ['#00faf4', '#ffffcc', '#ffe775', '#ffc140', '#ff8f20', '#ff6060'];
A.catNames = ['Tropical storm', 'Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'];

A.stormCategory = function stormCategory(windKt) {
  if (windKt >= 137) return 5;
  if (windKt >= 113) return 4;
  if (windKt >= 96) return 3;
  if (windKt >= 83) return 2;
  if (windKt >= 64) return 1;
  return 0;
};
