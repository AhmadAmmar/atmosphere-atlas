/* ------------------------------------------------------------------ chart catalogue, part 4: moisture, motion and weather maps */

/** Table 1 around freezing: the values against the physics, with the two rows that do not fit. */
A.chartLib.p3Table1 = () => {
  const rows = A.p3.TABLE1.filter(r => r[0] >= -20 && r[0] <= 10);
  const xs = rows.map(r => r[0]);
  return A.chart.line({
    title: 'Table 1 near freezing',
    subtitle: 'The solid line is the saturation mixing ratio from physics at the pressure the table was made for (995.5 hPa). The dashed line is Table 1. They agree throughout.',
    height: 250,
    series: [
      { name: 'From physics', x: xs, y: xs.map(T => A.p3.wsat(T)), color: 0, marker: false, width: 2.4 },
      { name: 'Table 1', x: xs, y: rows.map(r => r[2]), color: 1, dash: '5 4', marker: false, width: 2 },
    ],
    x: { min: -20, max: 10, ticks: [-20, -15, -10, -5, 0, 5, 10], label: 'Temperature (°C)', format: v => `${v}` },
    y: { min: 0, max: 8, label: 'Saturation mixing ratio (g/kg)' },
    tipX: v => `${v} °C`, unit: 'g/kg',
    annotations: [],
  });
};

/** Question 3: who really holds the most water vapour. */
A.chartLib.p3Rank = () => {
  const set = [[14, 90], [20, 60], [24, 40], [30, 40], [34, 30]];
  const smr = { 14: 10.14, 20: 14.956, 24: 19.21, 30: 27.694, 34: 35.134 };
  const rows = set.map(([T, rh]) => ({ label: `${T} °C, ${rh} %`, w: smr[T] * rh / 100 })).sort((a, b) => b.w - a.w);
  return A.chart.bars({
    title: 'Question 3: ranked by the vapour the air really holds',
    subtitle: 'Mixing ratio = saturation mixing ratio × relative humidity. The 30 °C sample with only 40 % humidity holds the most; the 14 °C sample at 90 % is only third.',
    categories: rows.map((r, i) => `${i + 1}.  ${r.label}`), series: [{ name: 'Mixing ratio', y: rows.map(r => +r.w.toFixed(3)), color: 2 }],
    horizontal: true, height: 190, unit: 'g/kg', format: v => v.toFixed(2),
  });
};

/** Question 2: what heating cold air does to its relative humidity. */
A.chartLib.p3Winter = () => {
  const xs = Array.from({ length: 36 }, (_, i) => -20 + i);
  const inside = (Tout, RH) => Math.min(100, A.p3.wsat(Tout) * RH / 100 / A.p3.wsat(21) * 100);
  return A.chart.line({
    title: 'Question 2: cold air brought indoors and heated to 21 °C',
    subtitle: 'Relative humidity of outdoor air after heating to 21 °C with no water added. The colder it is outside, the drier the house feels. The comfortable range is about 40 to 60 %.',
    height: 240,
    series: [
      { name: 'Outside air saturated (100 %)', x: xs, y: xs.map(T => inside(T, 100)), color: 0, marker: false },
      { name: 'Outside air at 70 %', x: xs, y: xs.map(T => inside(T, 70)), color: 3, marker: false },
    ],
    x: { min: -20, max: 15, ticks: [-20, -10, 0, 10], label: 'Outdoor temperature (°C)' }, y: { min: 0, max: 100, label: 'Indoor relative humidity (%)' },
    hlines: [{ y: 40, label: '40 %' }, { y: 60, label: '60 %' }], tipX: v => `${v} °C outside`, unit: '%',
  });
};

/** Every answer of the practical at a glance. */
A.chartLib.p3Answers = () => A.tableFig('Practical 3: every answer at a glance',
  ['Question', 'Answer', 'Worked in'],
  [
    ['Moisture 1', 'RH = 49.3 %, 88.8 %, 26.0 %, 10.4 % and 19.9 % (the five samples in order)', 'Humidity buckets'],
    ['Moisture 2', 'Humidity drops sharply: cold air holds little vapour, and heating it without adding water leaves the vapour the same but raises the capacity', 'Humidity buckets'],
    ['Moisture 3', 'Mixing ratios 9.126, 8.974, 7.684, 11.078 and 10.54 g/kg; ranks 3, 4, 5, 1, 2', 'Humidity buckets'],
    ['Moisture 4', 'Relative humidity does not say how much water vapour is in the air', 'Humidity buckets'],
    ['Moisture 5', 'Dew point ≈ 14 °C (13.8 °C)', 'Dew point'],
    ['Moisture 6', '35.134 g/kg; 21.78 g/kg; dew point ≈ 26 °C', 'Dew point'],
    ['Motion 1', 'Lines joining 5400 m to 5700 m (500 mb) and 8700 m to 9500 m (300 mb), sloping up towards Monterrey', 'Pressure surfaces'],
    ['Motion 2', 'Saskatoon', 'Pressure surfaces'],
    ['Motion 3', 'Saskatoon is colder at every level; cold air is denser, so the column is thinner and pressure falls faster', 'Pressure surfaces'],
    ['Motion 4', 'z (over Monterrey) has the higher pressure: H over Monterrey, L over Saskatoon; the force arrow points towards Saskatoon', 'Pressure surfaces'],
    ['Motion 5', 'At 9000 m (800 m against 140 m of slope)', 'Pressure surfaces'],
    ['Motion 6', 'Wind speeds are greater at 9000 m', 'Pressure surfaces'],
    ['Motion 7', 'North: H at 5520 m, L at 5460 m; south: H at 5640 m, L at 5580 m; the force arrow points to L, the Coriolis arrow to H, and the wind runs between them', 'Geostrophic balance'],
    ['Motion 8', 'The Coriolis force gets weaker, because it is proportional to the wind speed', 'Friction'],
    ['Motion 9', 'Red towards low pressure, blue to the right of the wind, green against the wind, black wind across the isobars towards low pressure', 'Friction'],
    ['Motion 10', 'Northern low, northern high, southern low and southern high, in the order of the figure', 'Friction'],
    ['Motion 11', 'The same three forces on each box, with the directions that follow from the hemisphere and from low or high', 'Friction'],
    ['Map 12', 'Model 1: 1002.4 mb, 37 °F, dew point 21 °F, sky 0 %. Model 2: 999.8 mb, 63 °F, 60 °F, thunder with intermittent rain. Model 3: 1011.7 mb, 43 °F, 20 °F, 0 %, 25 kt from the southwest, +1.7 mb, rising. Model 4: 999.7 mb, 27 °F, 20 °F, 100 %, continuous snow, 25 kt from the northwest, −1.1 mb, falling', 'Station models'],
    ['Map 13', 'Five or six streamlines, turning anticlockwise round a low in Iowa and Illinois', 'Streamlines'],
    ['Map 14', 'Isobars at 4 mb, an L near 1002 mb in Iowa and northern Illinois, a cold front to the southwest and a warm front to the east, cloud above 75 % wrapped round the low and rain north and east of it and along the cold front', 'Weather map'],
  ], 'The questions are numbered 1 to 6 (moisture), 1 to 11 (motion) and 12 to 14 (maps); the first column says which.');
