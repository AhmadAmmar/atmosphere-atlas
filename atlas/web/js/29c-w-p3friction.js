/* ------------------------------------------------------------------ Practical 3, part 2 (continued): wind near the ground, with friction */
A.widgetFactories.push(() => {
  const P = A.p3; const C = P.C;
  const f1 = (v, d = 1) => P.fmt(v, d);

  /** Steady wind for a pressure gradient force (Px, Py), Coriolis parameter f and a drag coefficient k: the three forces add up to zero.
      u = (k Px + f Py) / (k² + f²),  v = (k Py - f Px) / (k² + f²).  Coriolis = (f v, -f u); friction = (-k u, -k v). */
  const steady = (Px, Py, f, k) => {
    const d = k * k + f * f;
    const u = (k * Px + f * Py) / d; const v = (k * Py - f * Px) / d;
    return { u, v, cor: [f * v, -f * u], fric: [-k * u, -k * v] };
  };

  A.widgets.p3fric = {
    enter(topic, arg) {
      const st = this.st = { tab: arg === 'four' ? 'four' : 'one', hemi: 'N', lat: 45, dn: 200, kr: 1.0, preset: 'forest', pos: 135, quiz: false, order: [0, 1, 2, 3], answers: {}, checked: false };
      const host = h('div'); const read = h('div', { class: 'readout' }); const ctl = h('div');
      const PRESETS = [['none', 'No friction (high up)', 0], ['sea', 'Open sea', 0.3], ['grass', 'Flat grassland', 0.6], ['forest', 'Forest or suburb', 1.0], ['city', 'Tall city', 1.5]];

      /* ------------------------------------------------ Figure 5: one box */
      const drawOne = () => {
        clear(host); clear(read);
        const f = 2 * OMEGA * Math.sin(st.lat * DEG) * (st.hemi === 'N' ? 1 : -1);
        const af = Math.abs(f); const k = st.kr * af;
        const Pm = 400 / (1.2 * st.dn * 1000);                                // 4 hPa across dn km, air density 1.2
        const s = steady(0, Pm, f, k);
        const speed = Math.hypot(s.u, s.v); const Vg = Pm / af;
        const ang = Math.atan2(s.v, Math.abs(s.u)) * RAD;                     // angle across the isobars towards low pressure
        const W = 600; const Hh = 400; const cx = 215; const cy = 215;
        const svg = P.svg(W, Hh, { label: 'Forces on a box of air near the ground' });
        P.line(svg, 30, 95, 400, 95, { color: C.ink2, width: 1.8 }); P.txt(svg, 404, 100, '1012 mb', { size: 13, weight: 600 });
        P.line(svg, 30, 335, 400, 335, { color: C.ink2, width: 1.8 }); P.txt(svg, 404, 340, '1016 mb', { size: 13, weight: 600 });
        P.txt(svg, 30, 82, 'lower pressure', { size: 11.5, fill: C.red }); P.txt(svg, 30, 354, 'higher pressure', { size: 11.5, fill: C.blue });
        P.txt(svg, 30, 24, `${st.hemi === 'N' ? 'Northern' : 'Southern'} Hemisphere, ${st.lat}° latitude`, { size: 12.5, weight: 700, fill: C.ink2 });
        const ps = 100 / Pm;                                                  // pixels per m/s^2 for every force
        const arrow = (vx, vy, col, w = 3.2) => P.arrow(svg, cx, cy, cx + vx * ps, cy - vy * ps, { color: col, width: w, head: 12 });
        // the geostrophic reference, along the isobars
        P.arrow(svg, cx, cy, cx + Math.sign(f) * 100, cy, { color: C.ink3, width: 2, head: 10, dash: '5 4' });
        arrow(0, Pm, C.red);
        if (k > 0) arrow(s.fric[0], s.fric[1], C.green);
        arrow(s.cor[0], s.cor[1], C.blue);
        const vs = 100 / Vg;
        P.arrow(svg, cx, cy, cx + s.u * vs, cy - s.v * vs, { color: C.ink, width: 4, head: 13 });
        P.rect(svg, cx - 9, cy - 9, 18, 18, { fill: 'rgba(10,14,22,0.9)', stroke: C.ink, width: 1.8 });
        // angle label
        P.txt(svg, cx + 118 * (st.hemi === 'N' ? 1 : -1), cy - 8, `${f1(ang, 0)}° across the isobars`, { size: 12, weight: 700, anchor: st.hemi === 'N' ? 'start' : 'end', fill: C.yellow, stroke: 'rgba(10,14,22,0.85)' });
        // the force polygon
        const ox = 455; const oy = 300; const sc2 = 0.9;
        P.txt(svg, ox - 40, 190, 'The three forces cancel', { size: 11.5, weight: 700, fill: C.ink2 });
        let x = ox; let y = oy;
        const chain = [[0, Pm, C.red], [s.cor[0], s.cor[1], C.blue], [s.fric[0], s.fric[1], C.green]];
        for (const [vx, vy, col] of chain) { if (Math.hypot(vx, vy) * ps < 3) continue; P.arrow(svg, x, y, x + vx * ps * sc2, y - vy * ps * sc2, { color: col, width: 2.6, head: 9 }); x += vx * ps * sc2; y -= vy * ps * sc2; }
        P.circle(svg, ox, oy, 3, { fill: C.ink });
        // key
        const ky = 378;
        [[C.red, 'pressure gradient force', 30], [C.blue, 'Coriolis force', 215], [C.green, 'friction', 345], [C.ink, 'wind (the black arrow)', 430]].forEach(([col, t, x2]) => { P.line(svg, x2, ky, x2 + 22, ky, { color: col, width: 3.4 }); P.txt(svg, x2 + 28, ky + 4, t, { size: 11, fill: C.ink2 }); });
        host.append(svg);
        read.append(h('b', null, 'The black arrow is the wind. '), 'The three forces cancel, so it neither speeds up nor slows down. ',
          h('div', { style: { marginTop: '6px' } }, `Wind ${f1(speed, 1)} m/s (${f1(speed * 1.944, 0)} kt), crossing the isobars towards low pressure at ${f1(ang, 0)}°. Without friction it would be ${f1(Vg, 1)} m/s along the isobars. Friction cuts the speed to ${f1(speed / Vg * 100, 0)} % of that, so the Coriolis force, which is f × speed, falls to the same ${f1(speed / Vg * 100, 0)} % (question 8).`),
          h('div', { style: { marginTop: '6px' } }, `Pressure gradient ${f1(Pm * 1e3, 2)} × 10⁻³ m/s², Coriolis ${f1(Math.hypot(...s.cor) * 1e3, 2)} × 10⁻³, friction ${f1(Math.hypot(...s.fric) * 1e3, 2)} × 10⁻³ (all m/s²). The angle is the arctangent of the friction ÷ Coriolis ratio: ${f1(st.kr, 2)} gives ${f1(Math.atan(st.kr) * RAD, 0)}°.`));
      };

      /* ------------------------------------------------ Figure 6: four systems */
      const SYS = [{ sys: 'L', hemi: 'N' }, { sys: 'H', hemi: 'N' }, { sys: 'L', hemi: 'S' }, { sys: 'H', hemi: 'S' }];
      const NAME = p => `${p.hemi === 'N' ? 'Northern' : 'Southern'} Hemisphere ${p.sys === 'L' ? 'low' : 'high'}`;
      const panelSvg = p => {
        const W = 290; const Hh = 262; const ox = 145; const oy = 130;
        const svg = P.svg(W, Hh, { label: NAME(p) });
        const f = (p.hemi === 'N' ? 1 : -1) * 1e-4; const k = st.kr * 1e-4;
        const rings = [34, 66, 98];
        const vals = p.sys === 'L' ? [996, 1000, 1004] : [1024, 1020, 1016];
        rings.forEach((r, i) => { P.circle(svg, ox, oy, r, { stroke: i === 1 ? C.ink2 : C.ink3, width: i === 1 ? 1.6 : 1.1, opacity: 0.9 }); P.txt(svg, ox + 3, oy - r - 3, String(vals[i]), { size: 9.5, fill: C.ink3 }); });
        if (!st.quiz || st.checked) P.txt(svg, ox, oy + 9, p.sys, { size: 28, weight: 800, anchor: 'middle', fill: p.sys === 'L' ? C.red : C.blue });
        // wind arrows round the rings, from the same balance
        const at = (r, th) => {
          const rx = Math.sin(th * DEG); const ry = Math.cos(th * DEG);       // unit vector away from the centre, world coordinates (x east, y north)
          const dirP = p.sys === 'L' ? -1 : 1;
          return { rx, ry, s: steady(dirP * rx, dirP * ry, f, k) };
        };
        for (const r of [50, 82]) for (let th = 0; th < 360; th += 45) {
          const { rx, ry, s } = at(r, th); const sp = Math.hypot(s.u, s.v) || 1;
          const px = ox + r * rx; const py = oy - r * ry;
          P.arrow(svg, px - s.u / sp * 9, py + s.v / sp * 9, px + s.u / sp * 9, py - s.v / sp * 9, { color: C.ink2, width: 1.8, head: 6.5, opacity: 0.85 });
        }
        // the chosen box and its forces
        const r = 66; const { rx, ry, s } = at(r, st.pos); const bx = ox + r * rx; const by = oy - r * ry;
        const Pm = 1; const Vg = Pm / Math.abs(f); const ps = 64;
        const dirP = p.sys === 'L' ? -1 : 1;
        P.arrow(svg, bx, by, bx + dirP * rx * ps, by - dirP * ry * ps, { color: C.red, width: 3, head: 10 });
        P.arrow(svg, bx, by, bx + s.cor[0] * ps / Pm * 1, by - s.cor[1] * ps / Pm * 1, { color: C.blue, width: 3, head: 10 });
        P.arrow(svg, bx, by, bx + s.fric[0] * ps / Pm * 1, by - s.fric[1] * ps / Pm * 1, { color: C.green, width: 3, head: 10 });
        P.arrow(svg, bx, by, bx + s.u / Vg * ps * 0.95, by - s.v / Vg * ps * 0.95, { color: C.ink, width: 3.4, head: 11 });
        P.rect(svg, bx - 5.5, by - 5.5, 11, 11, { fill: 'rgba(10,14,22,0.9)', stroke: C.ink, width: 1.5 });
        return svg;
      };
      const drawFour = () => {
        clear(host); clear(read);
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' } });
        st.order.forEach((idx, slot) => {
          const p = SYS[idx]; const cell = h('div', { style: { border: '1px solid var(--hud-border)', borderRadius: '10px', padding: '4px 6px' } });
          cell.append(panelSvg(p));
          if (st.quiz && !st.checked) {
            const sel = h('select', { class: 'small-select', style: { width: '100%' }, 'aria-label': `Name system ${slot + 1}`, onchange: e => { st.answers[idx] = e.target.value; } },
              h('option', { value: '' }, 'Which is it?'), ...SYS.map((q, i) => h('option', { value: i, selected: String(st.answers[idx]) === String(i) ? true : null }, NAME(q))));
            cell.append(sel);
          } else if (st.quiz && st.checked) {
            const ok = String(st.answers[idx]) === String(idx);
            cell.append(h('div', { style: { fontSize: '12.5px', fontWeight: 700, color: ok ? C.green : C.red, padding: '4px 2px' } }, `${ok ? '✓' : '✗'} ${NAME(p)}`));
          } else cell.append(h('div', { style: { fontSize: '12.5px', fontWeight: 700, padding: '4px 2px' } }, NAME(p)));
          grid.append(cell);
        });
        host.append(grid);
        if (st.quiz && !st.checked) read.append(h('b', null, 'Quiz: '), 'name each system from the way the wind turns and whether it spirals in or out. Hint: a low pulls the air in, a high pushes it out. In the Northern Hemisphere the air turns right of the pressure gradient, in the Southern Hemisphere left of it.');
        else if (st.quiz) { const n = st.order.filter(i => String(st.answers[i]) === String(i)).length; read.append(h('b', null, `${n} of 4 correct. `), 'Compare the wind with the red arrow (the pressure gradient force): in the north the wind is turned to its right, in the south to its left, and friction turns it a little further towards low pressure.'); }
        else read.append(h('b', null, 'Question 10 and 11. '), 'On every one of the four systems the red arrow points from high to low pressure, the blue arrow is at right angles to the wind (to its right in the north, to its left in the south), the green arrow points back against the wind, and the black wind arrow is the result. Drag the position slider to move the box round the system: the picture is the same all the way round.');
      };

      const rebuild = () => {
        clear(ctl);
        ctl.append(h('div', { class: 'row' }, P.seg([['one', 'Figure 5: one box of air'], ['four', 'Figure 6: four systems']], st.tab, v => { st.tab = v; rebuild(); })));
        if (st.tab === 'one') {
          ctl.append(h('div', { class: 'row' }, P.seg([['N', 'Northern Hemisphere'], ['S', 'Southern Hemisphere']], st.hemi, v => { st.hemi = v; drawOne(); })));
          ctl.append(h('div', { class: 'row' }, h('label', null, 'Surface'), P.seg(PRESETS.map(([id, t]) => [id, t]), st.preset, id => { st.preset = id; st.kr = PRESETS.find(x => x[0] === id)[2]; kSlider.set(st.kr); drawOne(); })));
          const kSlider = A.ui.slider('Friction ÷ Coriolis', { min: 0, max: 2, step: 0.05, value: st.kr, format: v => v.toFixed(2), onInput: v => { st.kr = v; st.preset = ''; drawOne(); } });
          ctl.append(kSlider.row,
            A.ui.slider('Latitude', { min: 10, max: 80, step: 1, value: st.lat, format: v => `${v}°`, onInput: v => { st.lat = v; drawOne(); } }).row,
            A.ui.slider('Isobars 4 mb apart by', { min: 100, max: 600, step: 25, value: st.dn, format: v => `${v} km`, onInput: v => { st.dn = v; drawOne(); } }).row);
          drawOne();
        } else {
          ctl.append(A.ui.slider('Place the box', { min: 0, max: 359, step: 5, value: st.pos, format: v => `${v}° (${A.fmt.compass(v)})`, onInput: v => { st.pos = v; drawFour(); } }).row,
            A.ui.slider('Friction ÷ Coriolis', { min: 0, max: 2, step: 0.05, value: st.kr, format: v => v.toFixed(2), onInput: v => { st.kr = v; drawFour(); } }).row,
            h('div', { class: 'row' }, P.seg([['look', 'Labelled'], ['quiz', 'Quiz me']], st.quiz ? 'quiz' : 'look', v => {
              st.quiz = v === 'quiz'; st.checked = false; st.answers = {};
              if (st.quiz) st.order = [0, 1, 2, 3].map(i => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map(o => o[1]);
              else st.order = [0, 1, 2, 3];
              rebuild();
            }), st.quiz ? A.ui.button(st.checked ? 'New quiz' : 'Check my answers', () => { if (st.checked) { st.answers = {}; st.checked = false; st.order = [0, 1, 2, 3].map(i => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map(o => o[1]); } else st.checked = true; drawFour(); }) : null));
          drawFour();
        }
      };
      P.open('Wind and friction near the ground', c => { c.append(P.cols(host, h('div', null, ctl, read))); });
      rebuild();
    },
    exit() { P.close(); },
  };
});
