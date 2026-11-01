/* ------------------------------------------------------------------ interactive scenes: light in raindrops, and chaos */
A.widgetFactories.push(() => {
  /* ---------------------------------------------------------- the rainbow: light through one raindrop */
  const WATER = { red: 1.3311, green: 1.3345, blue: 1.3372, violet: 1.3440 };
  const COLOURS = { red: '#ff5a4d', green: '#5be07a', blue: '#5aa7ff', violet: '#b57cff' };
  /** Deviation (degrees) of a ray that hits a drop at impact parameter b (0 to 1) and is reflected k times inside. */
  const deviation = (b, n, k) => {
    const i = Math.asin(b); const r = Math.asin(b / n);
    return (2 * (i - r) + k * (Math.PI - 2 * r)) / DEG;
  };
  /** Impact parameter of the ray with the smallest deviation (Descartes' ray). */
  const minimumB = (n, k) => Math.sqrt(1 - (n * n - 1) / (k * (k + 2)));

  A.widgets.raindrop = {
    enter() {
      const st = { colour: 'red', k: 1, b: 0.86 };
      const W = 560; const Hh = 250;
      const box = A.canvasBox(W, Hh);
      const read = A.ui.readout();
      const draw = () => {
        const { ctx, w, h: hh } = box;
        ctx.clearRect(0, 0, w, hh); ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        const n = WATER[st.colour]; const k = st.k;
        // ---- left: the drop and the rays
        const cx = 150; const cy = 128; const R = 88;
        ctx.strokeStyle = 'rgba(170,205,255,0.9)'; ctx.fillStyle = 'rgba(120,170,255,0.12)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
        const trace = (b, color, wd, alpha) => {
          const i = Math.asin(b); const r = Math.asin(b / n);
          const pts = [];
          const point = a => [cx + R * Math.cos(a), cy - R * Math.sin(a)];
          let a = Math.PI - i;
          pts.push(point(a));
          for (let j = 0; j <= k; j++) { a -= Math.PI - 2 * r; pts.push(point(a)); }
          const D = deviation(b, n, k) * DEG;
          const last = pts[pts.length - 1];
          const out = [last[0] + 120 * Math.cos(D), last[1] + 120 * Math.sin(D)];
          ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = wd;
          ctx.beginPath(); ctx.moveTo(8, pts[0][1]); ctx.lineTo(pts[0][0], pts[0][1]); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(out[0], out[1]); ctx.stroke();
          ctx.globalAlpha = 1;
        };
        for (let b = 0.05; b < 0.99; b += 0.06) trace(b, '#ffe9a8', 1, 0.22);
        trace(st.b, COLOURS[st.colour], 2.6, 1);
        ctx.fillStyle = 'rgba(255,233,168,0.9)'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('sunlight', 10, 18);
        // ---- right: deviation against impact parameter
        const m = { l: 332, r: 14, t: 16, b: 34 };
        const X = bb => m.l + bb * (w - m.l - m.r); const lo = k === 1 ? 130 : 220; const hi = k === 1 ? 190 : 380;
        const Y = d => hh - m.b - (d - lo) / (hi - lo) * (hh - m.t - m.b);
        ctx.strokeStyle = 'rgba(180,200,235,0.18)'; ctx.fillStyle = 'rgba(200,215,240,0.75)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
        const step = k === 1 ? 10 : 40;
        for (let d = lo; d <= hi; d += step) { ctx.beginPath(); ctx.moveTo(m.l, Y(d)); ctx.lineTo(w - m.r, Y(d)); ctx.stroke(); ctx.fillText(`${d}°`, m.l - 4, Y(d) + 3); }
        ctx.textAlign = 'center'; for (const bb of [0, 0.5, 1]) ctx.fillText(bb.toFixed(1), X(bb), hh - 20);
        ctx.fillText('where the ray hits the drop (0 = centre, 1 = edge)', (m.l + w - m.r) / 2, hh - 6);
        for (const [name, col] of Object.entries(COLOURS)) {
          ctx.strokeStyle = col; ctx.globalAlpha = name === st.colour ? 1 : 0.35; ctx.lineWidth = name === st.colour ? 2.4 : 1.4; ctx.beginPath();
          for (let bb = 0; bb < 0.995; bb += 0.005) { const d = deviation(bb, WATER[name], k); if (bb === 0) ctx.moveTo(X(bb), Y(d)); else ctx.lineTo(X(bb), Y(d)); }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        const bm = minimumB(n, k); const dm = deviation(bm, n, k);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(bm), Y(dm), 3.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(X(st.b), Y(deviation(st.b, n, k)), 6, 0, TAU); ctx.stroke();
        ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.fillText('flattest part: the light piles up here', X(bm) - 135, Y(dm) + (k === 1 ? 20 : -10));
        const d = deviation(st.b, n, k);
        const fromAnti = k === 1 ? 180 - d : d - 180;
        clear(read);
        read.append(h('b', null, `This ray is turned through ${d.toFixed(1)}°`), `, so it comes back at ${fromAnti.toFixed(1)}° from the point opposite the Sun. `,
          h('br'), `Rays that hit near the flat part of the curve (${(bm).toFixed(2)}) all leave in nearly the same direction, ${(k === 1 ? 180 - dm : dm - 180).toFixed(1)}° for ${st.colour} light: that is the ${k === 1 ? 'primary' : 'secondary'} bow.`);
      };
      const bSlider = A.ui.slider('Where the ray hits the drop', { min: 0, max: 0.99, step: 0.01, value: st.b, format: v => v.toFixed(2), onInput: v => { st.b = v; draw(); }, ariaLabel: 'Impact parameter' });
      A.sceneCtl.show('A raindrop and the rainbow', c => {
        c.append(box.canvas, bSlider.row);
        c.append(A.ui.buttons('Colour', Object.keys(WATER).map(k => [k, k[0].toUpperCase() + k.slice(1)]), v => { st.colour = v; draw(); }, st.colour).row);
        c.append(A.ui.buttons('Bounces inside', [[1, 'One (primary bow)'], [2, 'Two (secondary bow)']], v => { st.k = +v; st.b = minimumB(WATER[st.colour], st.k); bSlider.set(st.b); draw(); }, 1).row);
        c.append(read);
        c.append(h('div', { class: 'readout' }, 'Sunlight enters a spherical drop, bends (refracts), reflects off the back and bends again on the way out. Red bends a little less than violet, so each colour piles up at a slightly different angle: red at 42° and violet at 40° from the point opposite the Sun for the primary bow, with red on the outside. With two bounces the colours are reversed and the bow is at 50° to 54°.'));
      });
      $('#scenectl').classList.add('wide');
      st.b = minimumB(WATER.red, 1); bSlider.set(st.b);
      draw();
    },
    exit() { $('#scenectl').classList.remove('wide'); },
  };

  /* ---------------------------------------------------------- chaos: two almost identical weather-like runs */
  A.widgets.chaos = {
    enter() {
      const st = { exp: 6 };
      const W = 560; const Hh = 220;
      const box = A.canvasBox(W, Hh);
      const read = A.ui.readout();
      const sup = n => `⁻${String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('')}`;
      const sigma = 10; const rho = 28; const beta = 8 / 3;
      const f = ([x, y, z]) => [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
      const rk4 = (s, dt) => {
        const add = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
        const k1 = f(s); const k2 = f(add(s, k1, dt / 2)); const k3 = f(add(s, k2, dt / 2)); const k4 = f(add(s, k3, dt));
        return [s[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), s[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), s[2] + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])];
      };
      const run = eps => {
        // a spin-up so that both runs start on the attractor
        let s = [1, 1, 1]; for (let i = 0; i < 2000; i++) s = rk4(s, 0.01);
        let a = s.slice(); let b = [s[0] + eps, s[1], s[2]];
        const ta = []; const tb = []; let diverge = null;
        const T = 40; const dt = 0.01; const every = 10;
        for (let i = 0; i <= T / dt; i++) {
          if (i % every === 0) { ta.push(a[0]); tb.push(b[0]); }
          if (diverge === null && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 2) diverge = i * dt;
          a = rk4(a, dt); b = rk4(b, dt);
        }
        return { ta, tb, diverge, dt: dt * every };
      };
      const draw = () => {
        const eps = Math.pow(10, -st.exp);
        const r = run(eps);
        const { ctx, w, h: hh } = box;
        const m = { l: 40, r: 10, t: 14, b: 34 };
        ctx.clearRect(0, 0, w, hh); ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        const X = t => m.l + t / 40 * (w - m.l - m.r); const Y = v => hh - m.b - (v + 25) / 50 * (hh - m.t - m.b);
        ctx.strokeStyle = 'rgba(180,200,235,0.18)'; ctx.fillStyle = 'rgba(200,215,240,0.75)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
        for (const v of [-20, 0, 20]) { ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(w - m.r, Y(v)); ctx.stroke(); ctx.fillText(String(v), m.l - 4, Y(v) + 3); }
        ctx.textAlign = 'center'; for (const t of [0, 10, 20, 30, 40]) ctx.fillText(String(t), X(t), hh - 20);
        ctx.fillText('model time', (m.l + w - m.r) / 2, hh - 6);
        const line = (arr, color, wd) => { ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.beginPath(); arr.forEach((v, i) => (i ? ctx.lineTo(X(i * r.dt), Y(v)) : ctx.moveTo(X(0), Y(v)))); ctx.stroke(); };
        line(r.ta, '#ffb35c', 2.2); line(r.tb, '#7fc4ff', 1.6);
        if (r.diverge !== null) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(r.diverge), m.t); ctx.lineTo(X(r.diverge), hh - m.b); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('they part', X(r.diverge) + 4, m.t + 10); }
        ctx.textAlign = 'left'; ctx.fillStyle = '#ffb35c'; ctx.fillText('run A', m.l + 6, m.t + 10); ctx.fillStyle = '#7fc4ff'; ctx.fillText('run B', m.l + 46, m.t + 10);
        clear(read);
        const lyap = 0.906;
        read.append(h('b', null, `The runs start 10${sup(st.exp)} apart`), r.diverge === null ? ' and still agree after 40 time units.' : ` and stay together until about time ${r.diverge.toFixed(1)}.`,
          h('br'), `Making the starting point ten times more precise buys only about ${(Math.log(10) / lyap).toFixed(1)} more time units, because small differences double about every ${(Math.LN2 / lyap).toFixed(2)} units.`);
      };
      A.sceneCtl.show('The butterfly effect', c => {
        c.append(box.canvas);
        c.append(A.ui.slider('How small is the difference?', { min: 1, max: 12, step: 1, value: st.exp, format: v => `10${sup(v)}`, onInput: v => { st.exp = v; draw(); }, ariaLabel: 'Starting difference' }).row);
        c.append(read);
        c.append(h('div', { class: 'readout' }, 'Two runs of Lorenz’s 1963 model of convection, which has the same kind of sensitivity as the weather. They start from almost the same state. Each is exact and has no randomness, yet they end up completely different. The same is true of the atmosphere: errors in the starting data grow, so a forecast loses its skill after about two weeks however good the computer.'));
      });
      $('#scenectl').classList.add('wide');
      draw();
    },
    exit() { $('#scenectl').classList.remove('wide'); },
  };
});
