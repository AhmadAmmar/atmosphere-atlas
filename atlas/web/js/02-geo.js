/* ------------------------------------------------------------------ geography and astronomy */
A.geo = {
  /** Unit vector in the Earth frame (x towards 0E/0N, y north, z towards 90W). */
  vec(lonDeg, latDeg, r = 1) {
    const lon = lonDeg * DEG; const lat = latDeg * DEG; const cl = Math.cos(lat);
    return [r * cl * Math.cos(lon), r * Math.sin(lat), -r * cl * Math.sin(lon)];
  },

  /** lon/lat (degrees) of a vector in the Earth frame. */
  lonLat(v) {
    const r = Math.hypot(v[0], v[1], v[2]) || 1;
    return { lon: Math.atan2(-v[2], v[0]) * RAD, lat: Math.asin(clamp(v[1] / r, -1, 1)) * RAD };
  },

  /** Rows of the rotation that brings the view centre to +z with north up: [east, north, centre]. */
  basis(lonDeg, latDeg) {
    const lon = lonDeg * DEG; const lat = latDeg * DEG;
    const east = [-Math.sin(lon), 0, -Math.cos(lon)];
    const north = [-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)];
    const centre = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
    return [east, north, centre];
  },

  /** Great-circle distance in km. */
  distance(lon1, lat1, lon2, lat2) {
    const p1 = lat1 * DEG; const p2 = lat2 * DEG;
    const dp = p2 - p1; const dl = (lon2 - lon1) * DEG;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
  },

  /** Initial bearing in degrees clockwise from north. */
  bearing(lon1, lat1, lon2, lat2) {
    const p1 = lat1 * DEG; const p2 = lat2 * DEG; const dl = (lon2 - lon1) * DEG;
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return mod(Math.atan2(y, x) * RAD, 360);
  },

  /** Point reached from (lon, lat) travelling `km` along `bearing` (degrees). */
  destination(lon, lat, bearing, km) {
    const d = km / EARTH_R; const b = bearing * DEG; const p1 = lat * DEG; const l1 = lon * DEG;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lon: wrap180(l2 * RAD), lat: p2 * RAD };
  },

  /** Points along the great circle between two places (inclusive), for drawing arcs. */
  arc(lon1, lat1, lon2, lat2, n = 32) {
    const a = A.geo.vec(lon1, lat1); const b = A.geo.vec(lon2, lat2);
    const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
    const omega = Math.acos(dot);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let v;
      if (omega < 1e-6) v = a;
      else {
        const s = Math.sin(omega);
        const k1 = Math.sin((1 - t) * omega) / s; const k2 = Math.sin(t * omega) / s;
        v = [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
      }
      out.push(A.geo.lonLat(v));
    }
    return out;
  },

  /** Solar position: declination, equation of time and sub-solar point (NOAA series). */
  sun(day) {
    const dayOfYear = Math.floor(mod(day, 365)) + 1;
    const hour = mod(day, 1) * 24;
    const g = (TAU / 365) * (dayOfYear - 1 + (hour - 12) / 24);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
      + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const lon = wrap180(-15 * (hour - 12 + eot / 60));
    return { declDeg: decl * RAD, lon, lat: decl * RAD, eotMin: eot, hour };
  },

  /** Hours of daylight at a latitude for a solar declination (degrees). */
  dayLength(latDeg, declDeg) {
    const x = -Math.tan(latDeg * DEG) * Math.tan(declDeg * DEG);
    if (x >= 1) return 0;
    if (x <= -1) return 24;
    return (2 / 15) * Math.acos(x) * RAD;
  },

  /** Solar elevation in degrees at a place and instant. */
  sunElevation(lon, lat, day) {
    const s = A.geo.sun(day);
    const v = A.geo.vec(lon, lat); const sv = A.geo.vec(s.lon, s.lat);
    return Math.asin(clamp(v[0] * sv[0] + v[1] * sv[1] + v[2] * sv[2], -1, 1)) * RAD;
  },

  /** Daily-mean top-of-atmosphere insolation (W/m2) for a latitude and day of year. */
  insolation(latDeg, day) {
    const S0 = 1361;
    const dayOfYear = mod(day, 365) + 1;
    const g = (TAU / 365.2422) * (dayOfYear - 3);
    const dist = 1 + 0.033 * Math.cos(TAU * (dayOfYear - 3) / 365.2422);      // (1 AU / r)^2 correction
    const decl = A.geo.sun(Math.floor(day) + 0.5).declDeg * DEG;
    const phi = latDeg * DEG;
    const x = -Math.tan(phi) * Math.tan(decl);
    const h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
    return (S0 / Math.PI) * dist * (h0 * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(h0));
  },

  coriolis(latDeg) { return 2 * OMEGA * Math.sin(latDeg * DEG); },

  /** A short place description such as "near Paris, France (84 km)". */
  nearest(lon, lat, maxKm = 400) {
    const places = A.places || [];
    let best = null; let bestD = maxKm;
    for (const p of places) {
      if (Math.abs(p.y - lat) > 8) continue;
      const d = A.geo.distance(lon, lat, p.x, p.y);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best ? { place: best, km: bestD } : null;
  },
};
