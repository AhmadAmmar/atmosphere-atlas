/* ------------------------------------------------------------------ Practical 3, part 3: reading a station model (question 12) */
A.widgetFactories.push(() => {
  const P = A.p3; const C = P.C;
  const f1 = (v, d = 1) => P.fmt(v, d);

  /** The four station models of question 12. */
  const MODELS = [
    { id: 1, st: { T: 37, Td: 21, p: 24, sky: 0, kt: 0, dir: 0 },
      rows: [['pressure', 'Barometric pressure', '1002.4 hPa', 'The three digits at the top right are tenths of a hectopascal with the leading 9 or 10 left out. 024 means 02.4. A figure that starts below 5 gets a 10 in front (1002.4); one that starts with 5 or more gets a 9 (see model 2).'],
        ['temp', 'Temperature', '37 °F', 'Top left, in degrees Fahrenheit. 37 °F is 2.8 °C.'],
        ['dew', 'Dew-point temperature', '21 °F', 'Bottom left. The figure printed here is 21 °F (−6 °C).'],
        ['sky', 'Sky coverage', '0 % (clear)', 'An empty circle means no cloud at all. There is no wind staff, so the air is calm.']],
      extra: 'Temperature minus dew point is 16 °F, a big gap: dry air and a clear sky go together.' },
    { id: 2, st: { T: 63, Td: 60, p: 998, sky: 50, kt: 0, dir: 0, wx: 'thunder-rain' },
      rows: [['pressure', 'Barometric pressure', '999.8 hPa', '998 starts with 9 (5 or more), so a 9 goes in front: 99.8 becomes 999.8.'],
        ['temp', 'Temperature', '63 °F', 'Top left: 63 °F, which is 17.2 °C.'],
        ['dew', 'Dew-point temperature', '60 °F', 'Bottom left: 60 °F. Only 3 °F below the temperature: the air is nearly saturated.'],
        ['weather', 'Current weather', 'Thunder with intermittent rain', 'The symbol left of the circle is a thunderstorm “R” with a dot above it: thunder, with intermittent rain. Not asked, but the circle is half filled: five-tenths cloud.']],
      extra: 'Warm, humid air (the dew point is 60 °F) with thunder: exactly the conditions for a thunderstorm.' },
    { id: 3, st: { T: 43, Td: 20, p: 117, sky: 0, kt: 25, dir: 225, tend: 2, dp: 17 },
      rows: [['pressure', 'Barometric pressure', '1011.7 hPa', '117 starts with a figure below 5, so a 10 goes in front: 11.7 becomes 1011.7.'],
        ['temp', 'Temperature', '43 °F', 'Top left.'],
        ['dew', 'Dew-point temperature', '20 °F', 'Bottom left.'],
        ['sky', 'Sky coverage', '0 % (clear)', 'The circle is empty.'],
        ['wind', 'Wind speed and direction', '25 knots from the southwest', 'The staff points to where the wind comes from: down and to the left, so from the southwest. Two full barbs (10 knots each) and one half barb (5 knots) make 25 knots.'],
        ['tendency', 'Pressure change in the last 3 hours', '+1.7 mb, rising', 'The +17 to the right of the circle is the change in tenths of a hectopascal: up 1.7 hPa. The symbol next to it, a line rising to the right, says the pressure has been rising steadily.']],
      extra: 'Clear sky, strong wind and rising pressure: the air is moving away from a low towards a high.' },
    { id: 4, st: { T: 27, Td: 20, p: 997, sky: 100, kt: 25, dir: 315, wx: 'snow-cont', tend: 7, dp: -11 },
      rows: [['pressure', 'Barometric pressure', '999.7 hPa', '997 starts with 9, so 99.7 becomes 999.7.'],
        ['temp', 'Temperature', '27 °F', 'Top left: 27 °F is −2.8 °C, below freezing.'],
        ['dew', 'Dew-point temperature', '20 °F', 'Bottom left.'],
        ['sky', 'Sky coverage', '100 % (overcast)', 'A completely filled circle.'],
        ['weather', 'Current weather', 'Continuous snow', 'The two asterisks left of the circle: continuous snow.'],
        ['wind', 'Wind speed and direction', '25 knots from the northwest', 'The staff points up and to the left: wind from the northwest, with two full barbs and a half barb: 25 knots.'],
        ['tendency', 'Pressure change in the last 3 hours', '−1.1 mb, falling', 'The −11 means down 1.1 hPa, and the symbol, a line falling to the right, says it has been falling steadily.']],
      extra: 'Overcast, snowing, cold and falling pressure: a depression is approaching, or is overhead.' },
  ];
  const WX = [['', 'None'], ...Object.entries(P.WEATHER)];

  A.widgets.p3station = {
    enter(topic, arg) {
      const st = this.st = { tab: 'm1', step: 0,
        mine: { T: 55, Td: 45, hpa: 1008, sky: 50, dir: 270, kt: 15, wx: '', tend: 2, dp: 12 } };
      const host = h('div'); const read = h('div', { class: 'readout' }); const ctl = h('div'); const tableHost = h('div');
      const W = 600; const Hh = 330; const cx = 300; const cy = 168; const S = 3.4;

      const stationDraw = (model, highlightPart) => {
        const svg = P.svg(W, Hh, { label: 'A station model' });
        P.rect(svg, 4, 4, W - 8, Hh - 8, { rx: 12, fill: 'rgba(255,255,255,0.035)', stroke: C.grid, width: 1 });
        P.model(svg, model, cx, cy, { s: S, fontSize: 12.5 });
        host.append(svg);
        if (highlightPart) {
          const el = svg.querySelector(`[data-part="${highlightPart}"]`);
          if (el) {
            const b = el.getBBox();
            P.rect(svg, b.x - 7, b.y - 6, b.width + 14, b.height + 12, { rx: 8, stroke: C.yellow, width: 2.6, fill: 'rgba(255,211,122,0.12)' });
          }
        }
        return svg;
      };

      const drawSheet = idx => {
        const m = MODELS[idx]; const total = m.rows.length;
        const s = Math.min(st.step, total);
        const part = s >= 1 ? m.rows[s - 1][0] : null;
        clear(host); clear(read); clear(tableHost);
        const model = { ...m.st };
        // before the pressure step is shown, a wind staff and the rest are all visible; the table fills in as the steps go
        stationDraw(model, part);
        P.txt(host.firstChild, 20, 30, `Station model ${m.id}`, { size: 14, weight: 700, fill: C.ink2 });
        const rows = m.rows.map(([key, label, value, why], i) => h('tr', { class: i === s - 1 ? 'sel' : '', onclick: () => { st.step = i + 1; drawSheet(idx); } },
          h('td', { style: { color: 'var(--hud-ink-2)' } }, label), h('td', { style: { fontWeight: 700 } }, i < s ? value : '')));
        tableHost.append(h('table', { class: 'p3tab' }, h('tbody', null, rows)));
        if (s === 0) read.append(h('b', null, 'Step 0. '), 'One station, drawn the way every weather map draws it. The circle sits on the station; numbers and symbols are placed round it at fixed positions, so each position has one meaning. Press “Next step” and each field is lit up in turn.');
        else {
          const [key, label, value, why] = m.rows[s - 1];
          read.append(h('b', null, `Step ${s}: ${label}. `), why);
          read.append(h('div', { style: { marginTop: '6px' } }, h('b', null, `Answer: ${value}`)));
        }
        if (s >= total) {
          const Tc = P.f2c(m.st.T); const Tdc = P.f2c(m.st.Td);
          read.append(h('div', { style: { marginTop: '6px' } }, `In degrees Celsius: ${f1(Tc, 1)} °C, dew point ${f1(Tdc, 1)} °C, relative humidity ${f1(P.rhFromTd(Tc, Tdc), 0)} % (from the two temperatures, the link back to the moisture questions). ${m.extra}`));
        }
        st.total = total;
      };

      const mineModel = () => {
        const q = st.mine; const hpa = q.hpa; const code = Math.round((hpa >= 1000 ? hpa - 1000 : hpa - 900) * 10);
        return { T: q.T, Td: Math.min(q.Td, q.T), p: code, sky: q.sky, kt: q.kt, dir: q.dir, wx: q.wx, tend: q.tend, dp: q.dp, _hpa: hpa };
      };
      const drawMine = () => {
        clear(host); clear(read); clear(tableHost);
        const m = mineModel();
        stationDraw(m, null);
        P.txt(host.firstChild, 20, 30, 'Build a station model', { size: 14, weight: 700, fill: C.ink2 });
        read.append(h('b', null, 'Code on the map: '), `temperature ${m.T}, dew point ${m.Td}, pressure ${String(m.p).padStart(3, '0')} (${f1(m._hpa, 1)} hPa), change ${m.dp >= 0 ? '+' : '−'}${Math.abs(m.dp)} (${f1(Math.abs(m.dp) / 10, 1)} hPa ${m.dp >= 0 ? 'higher' : 'lower'} than three hours ago), `,
          `sky ${P.skyWords(m.sky)}, wind ${m.kt < 1 ? 'calm' : `${m.kt} knots (${f1(P.kt2ms(m.kt), 1)} m/s) from ${A.fmt.compass(m.dir)}`}${m.wx ? `, ${P.WEATHER[m.wx].toLowerCase()}` : ''}. `,
          `Relative humidity from the two temperatures: ${f1(P.rhFromTd(P.f2c(m.T), P.f2c(m.Td)), 0)} %.`);
      };

      const rebuild = () => {
        clear(ctl);
        const tabs = [['m1', 'Model 1'], ['m2', 'Model 2'], ['m3', 'Model 3'], ['m4', 'Model 4'], ['mine', 'Build your own']];
        ctl.append(h('div', { class: 'row' }, P.seg(tabs, st.tab, v => { st.tab = v; st.step = 0; rebuild(); })));
        if (st.tab === 'mine') {
          const q = st.mine;
          ctl.append(A.ui.slider('Temperature', { min: -20, max: 105, step: 1, value: q.T, format: v => `${v} °F`, onInput: v => { q.T = v; drawMine(); } }).row,
            A.ui.slider('Dew point', { min: -30, max: 100, step: 1, value: q.Td, format: v => `${v} °F`, onInput: v => { q.Td = v; drawMine(); } }).row,
            A.ui.slider('Pressure', { min: 960, max: 1040, step: 0.1, value: q.hpa, format: v => `${v.toFixed(1)} hPa`, onInput: v => { q.hpa = v; drawMine(); } }).row,
            h('div', { class: 'row' }, h('label', null, 'Cloud'), P.seg([[0, '0'], [10, '1/10'], [25, '2–3'], [50, '5'], [75, '7–8'], [100, '10']].map(([a, b]) => [a, b]), q.sky, v => { q.sky = +v; drawMine(); })),
            A.ui.slider('Wind from', { min: 0, max: 355, step: 5, value: q.dir, format: v => `${v}° ${A.fmt.compass(v)}`, onInput: v => { q.dir = v; drawMine(); } }).row,
            A.ui.slider('Wind speed', { min: 0, max: 60, step: 5, value: q.kt, format: v => `${v} kt`, onInput: v => { q.kt = v; drawMine(); } }).row,
            A.ui.slider('Pressure change', { min: -30, max: 30, step: 1, value: q.dp, format: v => `${v >= 0 ? '+' : '−'}${(Math.abs(v) / 10).toFixed(1)} hPa`, onInput: v => { q.dp = v; q.tend = v > 1 ? 2 : v < -1 ? 7 : 4; drawMine(); } }).row);
          const sel = h('select', { class: 'small-select', 'aria-label': 'Current weather', onchange: e => { q.wx = e.target.value; drawMine(); } }, WX.map(([k, t]) => h('option', { value: k, selected: q.wx === k ? true : null }, t)));
          ctl.append(h('div', { class: 'row' }, h('label', null, 'Weather'), sel));
          drawMine();
        } else {
          const idx = +st.tab.slice(1) - 1;
          ctl.append(h('div', { class: 'row' }, A.ui.button('Back', () => { st.step = Math.max(0, st.step - 1); drawSheet(idx); }), A.ui.button('Next step', () => { st.step = Math.min(MODELS[idx].rows.length, st.step + 1); drawSheet(idx); }, 'play'),
            A.ui.button('Show every answer', () => { st.step = MODELS[idx].rows.length; drawSheet(idx); }), A.ui.button('Reset', () => { st.step = 0; drawSheet(idx); }, 'reset')));
          drawSheet(idx);
        }
      };
      P.open('Station model decoder', c => { c.append(P.cols(host, h('div', null, ctl, tableHost, read))); });
      rebuild();
    },
    exit() { P.close(); },
  };
});
