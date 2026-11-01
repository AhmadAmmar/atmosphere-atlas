/* ------------------------------------------------------------------ widgets: seasons, Coriolis, force balance, Ekman, rising air */
A.widgetFactories.push(() => {
  /* ---------------------------------------------------------- seasons: orbit, tilt and day length */
  A.widgets.season = {
    enter() {
      const g = A.globe;
      const state = { lat: 45 };
      const group = this.group = new SceneGroup();
      const ring = group.add(new GeoLines(g, { color: '#ffd37a', opacity: 0.95, height: 0.004, order: 5 }));
      const drawRing = () => { const pts = []; for (let lon = -180; lon <= 180; lon += 3) pts.push([lon, state.lat]); ring.set([pts]); };
      drawRing();
      const box = A.canvasBox(300, 150);
      const read = A.ui.readout();
      const draw = () => {
        const { ctx, w, h: hh } = box;
        ctx.clearRect(0, 0, w, hh);
        const cx = w / 2; const cy = hh / 2 + 4; const rx = 118; const ry = 40;
        ctx.strokeStyle = 'rgba(200,210,230,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
        const sg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16); sg.addColorStop(0, '#fff6c8'); sg.addColorStop(1, '#f2a516');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fill();
        const d = mod(A.state.day, 365);
        const gm = (357.5 + 0.9856 * d) * DEG;
        const lamSun = mod(279.9 + 0.9856 * d + 1.915 * Math.sin(gm), 360);
        const th = (270 - lamSun) * DEG;
        const labels = [['Mar', 0, 270], ['Jun', 90, 180], ['Sep', 180, 90], ['Dec', 270, 0]];
        ctx.font = '10px system-ui'; ctx.fillStyle = 'rgba(220,228,240,0.75)'; ctx.textAlign = 'center';
        for (const [name, lam, ang] of labels) { const a = ang * DEG; ctx.fillText(name, cx + (rx + 18) * Math.cos(a), cy + (ry + 14) * Math.sin(a) + 3); }
        const ex = cx + rx * Math.cos(th); const ey = cy + ry * Math.sin(th);
        const toSun = Math.atan2(cy - ey, cx - ex);
        const R = 15;
        ctx.save(); ctx.translate(ex, ey);
        ctx.fillStyle = '#0d2a52'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4c9cf0'; ctx.beginPath(); ctx.arc(0, 0, R, toSun - Math.PI / 2, toSun + Math.PI / 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
        const tilt = 23.44 * DEG;
        const ax = Math.sin(tilt) * (R + 9); const ay = Math.cos(tilt) * (R + 9);
        ctx.beginPath(); ctx.moveTo(-ax, ay); ctx.lineTo(ax, -ay); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '9px system-ui'; ctx.fillText('N', ax + 6, -ay - 2);
        ctx.restore();
      };
      const update = () => {
        draw();
        const s = A.geo.sun(A.state.day);
        const dl = A.geo.dayLength(state.lat, s.declDeg);
        const noon = 90 - Math.abs(state.lat - s.declDeg);
        const q = A.geo.insolation(state.lat, A.state.day);
        clear(read);
        read.append(`Sun overhead at ${A.fmt.lat(s.declDeg)}. At ${A.fmt.lat(state.lat)}: daylight ${dl >= 24 ? '24 h (midnight Sun)' : dl <= 0 ? '0 h (polar night)' : `${Math.floor(dl)} h ${Math.round((dl % 1) * 60)} min`}, noon Sun ${noon > 0 ? noon.toFixed(0) + '° above the horizon' : 'below the horizon'}, sunlight at the top of the atmosphere ${Math.round(q)} W/m².`);
      };
      A.sceneCtl.show('The tilt, the orbit and your latitude', c => {
        c.append(box.canvas);
        const lat = A.ui.slider('Latitude', { min: -90, max: 90, step: 1, value: state.lat, format: v => A.fmt.lat(v), onInput: v => { state.lat = v; drawRing(); update(); } });
        c.append(lat.row, read);
      });
      this._hook = A.bus.on('time', update);
      update();
    },
    exit() { A.bus.off('time', this._hook); this.group.dispose(); },
  };

  /* ---------------------------------------------------------- Coriolis laboratory */
  A.widgets.coriolis = {
    enter() {
      const g = A.globe;
      const st = this.st = { lon: -40, lat: 40, bearing: 0, speed: 800, dist: 3500, spin: 20, t: 0, firing: false };
      const group = this.group = new SceneGroup();
      const rib = group.add(new GeoRibbon(g, { height: 0.012, order: 6, joints: true }));
      const straight = group.add(new GeoLines(g, { color: '#ffffff', opacity: 0.9, height: 0.009, order: 5 }));
      const dots = group.add(new GeoPoints(g, { height: 0.016, order: 8, ring: false }));
      const read = A.ui.readout();
      const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];

      /** Earth-fixed path of a body launched with speed relative to the ground; omega scaled by `spin`. */
      const path = (spin, n = 60) => {
        const Om = OMEGA * spin; const R = EARTH_R * 1000;
        const r0 = A.geo.vec(st.lon, st.lat);
        const lon = st.lon * DEG; const la = st.lat * DEG;
        const east = [-Math.sin(lon), 0, -Math.cos(lon)];
        const north = [-Math.sin(la) * Math.cos(lon), Math.cos(la), Math.sin(la) * Math.sin(lon)];
        const b = st.bearing * DEG;
        const vrel = [0, 1, 2].map(i => north[i] * Math.cos(b) + east[i] * Math.sin(b));
        const vin = [0, 1, 2].map(i => st.speed * vrel[i]);
        vin[0] += Om * R * r0[2]; vin[2] += -Om * R * r0[0];
        const sp = Math.hypot(...vin); const vhat = vin.map(x => x / sp);
        const T = st.dist * 1000 / st.speed;
        const w = sp / R;
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const t = T * i / n;
          const pos = [0, 1, 2].map(k => Math.cos(w * t) * r0[k] + Math.sin(w * t) * vhat[k]);
          const fixed = rotY(pos, -Om * t);
          const ll = A.geo.lonLat(fixed);
          pts.push([ll.lon, ll.lat]);
        }
        return { pts, T };
      };

      const fix = pts => { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const prev = out[i - 1][0]; let l = pts[i][0]; while (l - prev > 180) l -= 360; while (l - prev < -180) l += 360; out.push([l, pts[i][1]]); } return out; };
      const draw = (progress = 1) => {
        const withSpin = path(st.spin); const noSpin = path(0);
        const k = Math.max(1, Math.round(progress * (withSpin.pts.length - 1)));
        rib.set([{ pts: fix(withSpin.pts.slice(0, k + 1)), color: [1, 0.45, 0.3, 1], width: 4 }]);
        straight.set([fix(noSpin.pts)]);
        const end = withSpin.pts[withSpin.pts.length - 1]; const endS = noSpin.pts[noSpin.pts.length - 1];
        const cur = withSpin.pts[k];
        dots.set([{ lon: st.lon, lat: st.lat, color: [1, 1, 1, 1], size: 11 }, { lon: endS[0], lat: endS[1], color: [1, 1, 1, 0.9], size: 9 }, { lon: cur[0], lat: cur[1], color: [1, 0.8, 0.3, 1], size: 12 }]);
        const miss = A.geo.distance(end[0], end[1], endS[0], endS[1]);
        const brgTravel = A.geo.bearing(withSpin.pts[0][0], withSpin.pts[0][1], endS[0], endS[1]);
        const brgMiss = A.geo.bearing(endS[0], endS[1], end[0], end[1]);
        const rel = mod(brgMiss - brgTravel + 180, 360) - 180;
        const side = Math.abs(miss) < 1 ? '' : rel > 0 ? 'to the right' : 'to the left';
        const real = path(1); const realMiss = A.geo.distance(real.pts[real.pts.length - 1][0], real.pts[real.pts.length - 1][1], endS[0], endS[1]);
        const f = A.geo.coriolis(st.lat);
        clear(read);
        read.append(h('div', null, `Without rotation (white): lands ${A.fmt.dist(st.dist)} away. With ${st.spin > 1 ? `the spin turned up ${st.spin}×` : 'real rotation'} (orange): lands ${A.fmt.dist(miss)} ${side} of the target.`),
          h('div', null, `At the real rotation rate the miss would be ${realMiss < 10 ? realMiss.toFixed(1) : A.fmt.dist(realMiss)}. Coriolis acceleration f·v = ${(Math.abs(f) * st.speed).toFixed(3)} m/s² (f = ${(f * 1e5).toFixed(2)}×10⁻⁵ s⁻¹). Flight time ${(withSpin.T / 60).toFixed(0)} min.`));
      };
      this.draw = draw;
      const fire = () => { st.t = 0; st.firing = true; };
      group.onFrame(dt => { if (!st.firing) return; st.t += dt / 4.5; if (st.t >= 1) { st.t = 1; st.firing = false; } draw(st.t); });
      A.pickHook = hit => { st.lon = hit.lon; st.lat = clamp(hit.lat, -80, 80); sLat.set(st.lat); draw(); return true; };
      let sLat;
      A.sceneCtl.show('Coriolis lab: launch something across a spinning Earth', c => {
        sLat = A.ui.slider('Latitude', { min: -80, max: 80, step: 1, value: st.lat, format: v => A.fmt.lat(v), onInput: v => { st.lat = v; draw(); } });
        const dir = A.ui.slider('Direction', { min: 0, max: 359, step: 1, value: st.bearing, format: v => `${v}° ${A.fmt.compass(v)}`, onInput: v => { st.bearing = v; draw(); } });
        const sp = A.ui.slider('Speed', { min: 100, max: 2500, step: 50, value: st.speed, format: v => `${v} m/s`, onInput: v => { st.speed = v; draw(); } });
        const di = A.ui.slider('Distance', { min: 500, max: 8000, step: 100, value: st.dist, format: v => `${v} km`, onInput: v => { st.dist = v; draw(); } });
        const spin = A.ui.buttons('Earth’s spin', [[0, 'Off'], [1, 'Real'], [20, '×20'], [100, '×100']], v => { st.spin = v; draw(); }, st.spin);
        const row = h('div', { class: 'row' }, A.ui.button('Fire', fire, 'play'), h('span', { style: { color: 'var(--hud-ink-2)', fontSize: '12px' } }, 'Click the globe to move the launch point.'));
        c.append(sLat.row, dir.row, sp.row, di.row, spin.row, row, read);
      });
      g.flyTo(st.lon, st.lat, 2.9, 1400);
      draw();
    },
    exit() { A.pickHook = null; this.group.dispose(); },
  };

  /* ---------------------------------------------------------- force balance: pressure gradient, Coriolis, friction */
  A.widgets.balance = {
    enter() {
      const st = { lat: 45, gradient: 4, friction: false, running: true };
      const box = A.canvasBox(330, 230);
      const read = A.ui.readout();
      const sim = { x: 0, y: 0, u: 0, v: 0, trail: [], t: 0 };
      const reset = () => { sim.x = 0; sim.y = 0; sim.u = 0; sim.v = 0; sim.trail = [[0, 0]]; sim.t = 0; };
      reset();
      const rho = 1.2;
      const params = () => {
        const f = A.geo.coriolis(st.lat);
        const grad = st.gradient * 100 / 1000e3;              // Pa/m directed from high to low (low to the north)
        return { f, a: grad / rho, r: st.friction ? 1.5e-5 * 6 : 0 };
      };
      const step = (dt) => {
        const { f, a, r } = params();
        // pressure force acts to the north (+y); Coriolis a = -f k x v; friction -r v
        const fx = f * sim.v - r * sim.u;
        const fy = a - f * sim.u - r * sim.v;
        sim.u += fx * dt; sim.v += fy * dt;
        sim.x += sim.u * dt; sim.y += sim.v * dt;
        sim.t += dt;
      };
      const draw = () => {
        const { ctx, w, h: hh } = box;
        ctx.clearRect(0, 0, w, hh);
        ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        // isobars: high pressure south (bottom), low pressure north (top)
        ctx.strokeStyle = 'rgba(180,200,235,0.45)'; ctx.fillStyle = 'rgba(200,215,240,0.8)'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
        const labels = ['1008', '1012', '1016', '1020'];
        for (let i = 0; i < 4; i++) { const y = 40 + i * 50; ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(w - 10, y); ctx.stroke(); ctx.fillText(`${labels[i]} hPa`, 14, y - 4); }
        ctx.fillStyle = '#ff9a8a'; ctx.font = 'bold 12px system-ui'; ctx.fillText('LOW', w - 46, 20); ctx.fillStyle = '#8fc4ff'; ctx.fillText('HIGH', w - 48, hh - 8);
        const cx = w * 0.38; const cy = hh * 0.62; const scale = 5;
        ctx.strokeStyle = '#ffd37a'; ctx.lineWidth = 2; ctx.beginPath();
        sim.trail.forEach((p, i) => { const px = cx + p[0] / 1000 * scale * 0.9; const py = cy - p[1] / 1000 * scale * 0.9; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.stroke();
        const px = cx + sim.x / 1000 * scale * 0.9; const py = cy - sim.y / 1000 * scale * 0.9;
        const arrow = (x0, y0, dx, dy, color, text) => {
          const len = Math.hypot(dx, dy); if (len < 1) return;
          ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx, y0 + dy); ctx.stroke();
          const a = Math.atan2(dy, dx); ctx.beginPath(); ctx.moveTo(x0 + dx, y0 + dy); ctx.lineTo(x0 + dx - 7 * Math.cos(a - 0.4), y0 + dy - 7 * Math.sin(a - 0.4)); ctx.lineTo(x0 + dx - 7 * Math.cos(a + 0.4), y0 + dy - 7 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
          ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(text, x0 + dx + 4, y0 + dy + 3);
        };
        const { f, a, r } = params();
        const sc = 1400;
        arrow(px, py, 0, -a * sc * 0.6, '#ff7d6e', 'pressure force');
        arrow(px, py, f * sim.v * sc * 0.6 * 1, -(-f * sim.u) * sc * 0.6, '#6fd0a0', 'Coriolis');
        if (r) arrow(px, py, -r * sim.u * sc * 0.6, r * sim.v * sc * 0.6, '#c9a0ff', 'friction');
        arrow(px + 0, py + 0, sim.u * 0.9, -sim.v * 0.9, '#ffffff', 'wind');
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill();
      };
      const loop = A.bus.on('frame', dt => {
        if (!st.running) return;
        const n = 8;
        for (let i = 0; i < n; i++) step(900 * Math.min(dt, 0.05) / n * 3);
        if (sim.trail.length < 1500 && Math.floor(sim.t / 600) > sim.trail.length - 1) sim.trail.push([sim.x, sim.y]);
        sim.trail.push([sim.x, sim.y]); if (sim.trail.length > 700) sim.trail.shift();
        const { f } = params();
        const geo = params().a / Math.max(1e-9, Math.abs(f));
        const sp = Math.hypot(sim.u, sim.v);
        clear(read);
        read.append(`Wind now ${sp.toFixed(1)} m/s towards ${A.fmt.compass(mod(Math.atan2(sim.u, sim.v) * RAD, 360))}. Balanced (geostrophic) wind would be ${Math.min(geo, 400).toFixed(1)} m/s, blowing along the isobars with low pressure on the ${st.lat >= 0 ? 'left' : 'right'}.${st.friction ? ' Friction slows the wind and turns it towards low pressure.' : ''}`);
        draw();
      });
      this._loop = loop; this.st = st;
      A.globe.needAnimation(1);
      A.sceneCtl.show('Wind: the balance of forces', c => {
        c.append(box.canvas);
        const lat = A.ui.slider('Latitude', { min: -80, max: 80, step: 1, value: st.lat, format: v => A.fmt.lat(v), onInput: v => { st.lat = v; reset(); } });
        const gr = A.ui.slider('Pressure difference', { min: 1, max: 12, step: 1, value: st.gradient, format: v => `${v} hPa / 100 km`, onInput: v => { st.gradient = v; reset(); } });
        const fr = A.ui.buttons('Surface friction', [[0, 'Off (upper air)'], [1, 'On (near ground)']], v => { st.friction = !!+v; reset(); }, 0);
        c.append(lat.row, gr.row, fr.row, h('div', { class: 'row' }, A.ui.button('Restart', reset, 'reset')), read);
      });
    },
    exit() { A.bus.off('frame', this._loop); A.globe.needAnimation(-1); },
  };

  /* ---------------------------------------------------------- Ekman spiral */
  A.widgets.ekman = {
    enter() {
      const st = { north: true, depth: 0 };
      const box = A.canvasBox(330, 220);
      const read = A.ui.readout();
      const draw = () => {
        const { ctx, w, h: hh } = box;
        ctx.clearRect(0, 0, w, hh); ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        const cx = 120; const cy = 118; const sgn = st.north ? 1 : -1;
        ctx.strokeStyle = 'rgba(180,200,235,0.3)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, 195); ctx.moveTo(40, cy); ctx.lineTo(205, cy); ctx.stroke(); ctx.setLineDash([]);
        const arrow = (x0, y0, x1, y1, col, wd = 2.5) => {
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          const a = Math.atan2(y1 - y0, x1 - x0);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4)); ctx.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
        };
        // the wind blows towards the top of the page
        arrow(cx + 85, 190, cx + 85, 55, '#ffffff', 4);
        ctx.fillStyle = '#fff'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('wind', cx + 93, 125);
        const n = 6;
        for (let i = 0; i <= n; i++) {
          const z = i / n;                                          // 0 at the surface, 1 at the Ekman depth
          const amp = 80 * Math.exp(-Math.PI * z);
          const theta = sgn * (45 + 180 * z) * DEG;                  // clockwise from the wind direction in the north
          const vx = amp * Math.sin(theta); const vy = -amp * Math.cos(theta);
          arrow(cx, cy, cx + vx, cy + vy, `rgba(${Math.round(150 + 90 * (1 - z))},${Math.round(190 - 30 * z)},255,${(1 - z * 0.55).toFixed(2)})`, 2);
          if (i === 0) { ctx.fillStyle = '#9fd0ff'; ctx.font = '11px system-ui'; ctx.fillText('surface current', cx + vx + 5, cy + vy - 2); }
          if (i === n) { ctx.fillStyle = 'rgba(159,208,255,0.7)'; ctx.fillText('deep', cx + vx + 5, cy + vy + 12); }
        }
        arrow(cx - 80, 207, cx - 80 + 100 * sgn, 207, '#ffd37a', 3);
        ctx.fillStyle = '#ffd37a'; ctx.fillText(st.north ? 'net water transport: to the right of the wind' : 'net water transport: to the left of the wind', 14, 220);
      };
      A.sceneCtl.show('Ekman spiral: how the wind moves the sea', c => {
        c.append(box.canvas);
        c.append(A.ui.buttons('Hemisphere', [['n', 'Northern'], ['s', 'Southern']], v => { st.north = v === 'n'; draw(); }, 'n').row);
        c.append(h('div', { class: 'readout' }, 'Seen from above. Each arrow is the current at a deeper layer: it weakens and turns further from the wind, so the water as a whole is pushed at 90° to the wind direction.'));
      });
      draw();
    },
    exit() {},
  };

  /* ---------------------------------------------------------- rising air: lapse rates and stability */
  A.widgets.parcel = {
    enter() {
      const st = { t: 28, td: 14, env: 6.5 };
      const box = A.canvasBox(330, 250);
      const read = A.ui.readout();
      const draw = () => {
        const { ctx, w, h: hh } = box;
        const m = { l: 36, r: 12, t: 12, b: 28 };
        ctx.clearRect(0, 0, w, hh); ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(0, 0, w, hh);
        const zmax = 12;
        const tMin = -70; const tMax = 40;
        const X = t => m.l + (t - tMin) / (tMax - tMin) * (w - m.l - m.r);
        const Y = z => hh - m.b - z / zmax * (hh - m.t - m.b);
        ctx.strokeStyle = 'rgba(180,200,235,0.18)'; ctx.fillStyle = 'rgba(200,215,240,0.75)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
        for (let z = 0; z <= zmax; z += 2) { ctx.beginPath(); ctx.moveTo(m.l, Y(z)); ctx.lineTo(w - m.r, Y(z)); ctx.stroke(); ctx.fillText(`${z} km`, m.l - 4, Y(z) + 3); }
        ctx.textAlign = 'center'; for (let t = -60; t <= 40; t += 20) ctx.fillText(`${A.fmt.num(A.units.convert(t, 'degC'))}`, X(t), hh - 12);
        ctx.fillText(A.units.label('degC'), w / 2, hh - 1);
        const lcl = Math.max(0, 0.125 * (st.t - st.td));
        const dry = 9.8; const moist = 5.5;
        const env = z => st.t - st.env * z;
        const parcel = z => (z <= lcl ? st.t - dry * z : st.t - dry * lcl - moist * (z - lcl));
        const line = (fn, color, wd, dash) => { ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.beginPath(); for (let z = 0; z <= zmax; z += 0.1) { const x = X(fn(z)); if (z === 0) ctx.moveTo(x, Y(z)); else ctx.lineTo(x, Y(z)); } ctx.stroke(); ctx.setLineDash([]); };
        line(env, '#8fc4ff', 2.4);
        line(parcel, '#ffb35c', 2.4);
        // where does the parcel stop being warmer than its surroundings?
        let top = 0; for (let z = 0; z <= zmax; z += 0.05) if (parcel(z) > env(z) + 0.01) top = z; else if (z > 0.2 && z > top + 0.3) break;
        ctx.fillStyle = 'rgba(200,215,240,0.9)';
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(m.l, Y(lcl)); ctx.lineTo(w - m.r, Y(lcl)); ctx.stroke(); ctx.setLineDash([]);
        ctx.textAlign = 'left'; ctx.fillText(`cloud base ${lcl.toFixed(1)} km`, m.l + 6, Y(lcl) - 4);
        if (top > lcl + 0.2) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(X(parcel(lcl)) - 24, Y(top), 48, Y(lcl) - Y(top)); ctx.fillStyle = '#111'; ctx.fillText('cloud', X(parcel(lcl)) - 14, Y((top + lcl) / 2)); }
        ctx.fillStyle = '#8fc4ff'; ctx.fillText('surrounding air', w - 100, 26); ctx.fillStyle = '#ffb35c'; ctx.fillText('rising bubble', w - 100, 40);
        clear(read);
        const unstable = st.env > dry; const cond = !unstable && st.env > moist && top > lcl + 0.3;
        read.append(`The bubble cools at 9.8 °C per km until it hits its dew point at ${lcl.toFixed(1)} km (cloud forms), then only about 5.5 °C per km. The air around it cools ${st.env.toFixed(1)} °C per km. ` +
          (unstable ? 'The surroundings cool faster than a dry bubble: the air is absolutely unstable and rises freely.' : top > lcl + 0.3 ? `The bubble stays warmer than its surroundings up to about ${top.toFixed(1)} km: ${top - lcl > 5 ? 'a tall thunderstorm cloud' : 'a shower cloud'} can grow.` : 'The bubble soon becomes colder than its surroundings and sinks back: the air is stable.') + (cond ? ' (conditionally unstable)' : ''));
      };
      A.sceneCtl.show('Rising air: will a bubble keep going up?', c => {
        c.append(box.canvas);
        const a = A.ui.slider('Ground temperature', { min: 0, max: 40, step: 1, value: st.t, format: v => A.fmt.temp(v, 0), onInput: v => { st.t = v; if (st.td > v) { st.td = v; b.set(v); } draw(); } });
        const b = A.ui.slider('Dew point', { min: -10, max: 30, step: 1, value: st.td, format: v => A.fmt.temp(v, 0), onInput: v => { st.td = Math.min(v, st.t); draw(); } });
        const e = A.ui.slider('Air cools with height', { min: 3, max: 11, step: 0.1, value: st.env, format: v => `${v.toFixed(1)} °C/km`, onInput: v => { st.env = v; draw(); } });
        c.append(a.row, b.row, e.row, read);
      });
      draw();
    },
    exit() {},
  };
});
