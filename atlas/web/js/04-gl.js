/* ------------------------------------------------------------------ WebGL building blocks
   Every drawable shares one vertex transform (geoToView) that can show the world as a sphere
   (rotated so the view centre faces the camera) or as a flat equirectangular map, and morph
   smoothly between the two.  Longitudes and latitudes are in radians inside the shaders. */

A.glsl = {};

A.glsl.geo = `
const float PI = 3.141592653589793;
uniform mat3 uRot;
uniform float uMorph;
uniform float uLon0;
uniform float uLat0;
uniform float uZScale;
float wrapPi(float a) { return a - 2.0 * PI * floor((a + PI) / (2.0 * PI)); }
vec3 sphereDir(float lon, float lat) { float cl = cos(lat); return vec3(cl * cos(lon), sin(lat), -cl * sin(lon)); }
vec3 geoToView(float lon, float lat, float h) {
  vec3 s = uRot * (sphereDir(lon, lat) * (1.0 + h));
  vec3 p = vec3(wrapPi(lon - uLon0), lat - uLat0, h * uZScale);
  return mix(s, p, uMorph);
}
`;

A.glsl.earthVert = `
${A.glsl.geo}
varying vec2 vGeo;
void main() {
  float lon = position.x + uLon0;
  float lat = position.y;
  vGeo = vec2(lon, lat);
  vec3 p = geoToView(lon, lat, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

A.glsl.earthFrag = `
precision highp float;
precision highp sampler2D;
const float PI = 3.141592653589793;
varying vec2 vGeo;
uniform mat3 uRot;
uniform float uMorph;
uniform sampler2D uDayA;
uniform sampler2D uDayB;
uniform float uDayMix;
uniform sampler2D uNight;
uniform sampler2D uMask;
uniform vec3 uSun;
uniform vec3 uSunView;
uniform float uShade;
uniform float uLit;

uniform sampler2D uF0A; uniform sampler2D uF0B; uniform sampler2D uF0Lut;
uniform float uF0On; uniform float uF0Mix; uniform float uF0Opacity; uniform float uF0Gamma;
uniform float uF0Invert; uniform float uF0Mask; uniform float uF0Clip; uniform vec4 uF0Grid; uniform vec2 uF0Half;

uniform sampler2D uF1A; uniform sampler2D uF1B; uniform sampler2D uF1Lut;
uniform float uF1On; uniform float uF1Mix; uniform float uF1Opacity; uniform float uF1Gamma;
uniform float uF1Invert; uniform float uF1Mask; uniform float uF1Clip; uniform vec4 uF1Grid; uniform vec2 uF1Half;

uniform sampler2D uCat; uniform float uCatOn; uniform float uCatOpacity; uniform float uCatMask;
uniform vec4 uCatGrid; uniform vec2 uCatHalf;

uniform sampler2D uIceA; uniform sampler2D uIceB; uniform float uIceOn; uniform float uIceMix;
uniform float uIceStrength; uniform vec4 uIceGrid; uniform vec2 uIceHalf;

vec2 gridUv(vec2 lonlat, vec4 g, vec2 htx) {
  float d = lonlat.x - g.x;
  d = d - 2.0 * PI * floor(d / (2.0 * PI));
  return vec2(d * g.y + htx.x, (lonlat.y - g.z) * g.w + htx.y);
}

float insideGrid(vec2 uv, float mode) {
  float latOk = step(0.0, uv.y) * step(uv.y, 1.0);
  float lonOk = step(0.0, uv.x) * step(uv.x, 1.0);
  return mode < 0.5 ? 1.0 : (mode < 1.5 ? latOk : latOk * lonOk);
}

float maskFactor(float mode, float land) {
  return mode < 0.5 ? 1.0 : (mode < 1.5 ? 1.0 - land : land);
}

vec4 scalarLayer(sampler2D a, sampler2D b, float mixT, sampler2D lut, vec2 uv, float gamma, float invert) {
  float v = mix(texture2D(a, uv).r, texture2D(b, uv).r, mixT);
  v = pow(clamp(v, 0.0, 1.0), gamma);
  v = mix(v, 1.0 - v, invert);
  return texture2D(lut, vec2(clamp(v, 0.004, 0.996), 0.5));
}

void main() {
  float lon = vGeo.x;
  float lat = vGeo.y;
  vec2 uv = vec2((lon + PI) / (2.0 * PI), (lat + 0.5 * PI) / PI);
  vec3 n = vec3(cos(lat) * cos(lon), sin(lat), -cos(lat) * sin(lon));
  vec3 nv = uRot * n;
  float land = smoothstep(0.30, 0.70, texture2D(uMask, uv).r);

  vec3 day = mix(texture2D(uDayA, uv).rgb, texture2D(uDayB, uv).rgb, uDayMix);
  float ndl = dot(n, uSun);
  float dayF = smoothstep(-0.12, 0.10, ndl);
  float night = (1.0 - dayF) * uShade;
  float lights = texture2D(uNight, uv).r;
  vec3 nightCol = day * vec3(0.13, 0.17, 0.27) + vec3(1.0, 0.78, 0.45) * pow(lights, 1.5) * 1.15;
  vec3 col = mix(day, nightCol, night);
  float dim = 1.0 - 0.38 * night;

  if (uIceOn > 0.5) {
    vec2 iuv = gridUv(vec2(lon, lat), uIceGrid, uIceHalf);
    float ic = mix(texture2D(uIceA, iuv).r, texture2D(uIceB, iuv).r, uIceMix);
    float a = smoothstep(0.10, 0.80, ic) * (1.0 - land) * uIceStrength;
    col = mix(col, vec3(0.90, 0.95, 1.0) * mix(0.35, 1.0, 1.0 - night), a * 0.92);
  }
  if (uCatOn > 0.5) {
    vec2 cuv = gridUv(vec2(lon, lat), uCatGrid, uCatHalf);
    vec4 c = texture2D(uCat, cuv);
    float a = c.a * uCatOpacity * maskFactor(uCatMask, land) * dim;
    col = mix(col, c.rgb, a);
  }
  if (uF0On > 0.5) {
    vec2 fuv = gridUv(vec2(lon, lat), uF0Grid, uF0Half);
    vec4 c = scalarLayer(uF0A, uF0B, uF0Mix, uF0Lut, fuv, uF0Gamma, uF0Invert);
    float a = c.a * uF0Opacity * maskFactor(uF0Mask, land) * insideGrid(fuv, uF0Clip) * dim;
    col = mix(col, c.rgb, a);
  }
  if (uF1On > 0.5) {
    vec2 fuv = gridUv(vec2(lon, lat), uF1Grid, uF1Half);
    vec4 c = scalarLayer(uF1A, uF1B, uF1Mix, uF1Lut, fuv, uF1Gamma, uF1Invert);
    float a = c.a * uF1Opacity * maskFactor(uF1Mask, land) * insideGrid(fuv, uF1Clip) * dim;
    col = mix(col, c.rgb, a);
  }

  // ocean glint and thin-atmosphere rim (sphere view only)
  float sphere = 1.0 - uMorph;
  vec3 r = reflect(-uSunView, nv);
  float glint = pow(max(r.z, 0.0), 70.0) * (1.0 - land) * dayF * sphere;
  col += vec3(0.75, 0.88, 1.0) * glint * 0.30 * uLit;
  float rim = pow(1.0 - clamp(nv.z, 0.0, 1.0), 2.6) * sphere;
  col += vec3(0.22, 0.48, 0.98) * rim * 0.50 * mix(0.22, 1.0, dayF);
  gl_FragColor = vec4(col, 1.0);
}
`;

A.glsl.lineVert = `
${A.glsl.geo}
attribute vec3 aGeo;
attribute vec3 aOther;
attribute vec3 aColor;
uniform float uHeight;
varying vec3 vColor;
void main() {
  vec3 pos = geoToView(aGeo.x, aGeo.y, aGeo.z + uHeight);
  if (uMorph > 0.001) {
    float xa = wrapPi(aGeo.x - uLon0);
    float xb = wrapPi(aOther.x - uLon0);
    if (abs(xa - xb) > PI) {
      vec2 first = aOther.z < 0.5 ? aGeo.xy : aOther.xy;
      pos = geoToView(first.x, first.y, aGeo.z + uHeight);
    }
  }
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

A.glsl.lineFrag = `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uUseVertexColor;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(mix(uColor, vColor, uUseVertexColor), uOpacity);
}
`;

A.glsl.ribbonVert = `
${A.glsl.geo}
attribute vec3 aA;
attribute vec3 aB;
attribute vec2 aSel;
attribute vec4 aCol;
attribute float aW;
uniform float uHeight;
uniform vec2 uRes;
varying vec4 vCol;
varying float vSide;
vec4 clipOf(vec3 g) { return projectionMatrix * modelViewMatrix * vec4(geoToView(g.x, g.y, g.z + uHeight), 1.0); }
void main() {
  vec4 ca = clipOf(aA);
  vec4 cb = clipOf(aB);
  if (uMorph > 0.001 && abs(wrapPi(aA.x - uLon0) - wrapPi(aB.x - uLon0)) > PI) cb = ca;
  vec2 sa = ca.xy / ca.w * uRes * 0.5;
  vec2 sb = cb.xy / cb.w * uRes * 0.5;
  vec2 d = sb - sa;
  float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 c = mix(ca, cb, aSel.x);
  float w = aW * (len > 1e-4 ? 1.0 : 0.0);
  c.xy += nrm * aSel.y * w * 0.5 / (uRes * 0.5) * c.w;
  vCol = aCol;
  vSide = aSel.y;
  gl_Position = c;
}
`;

A.glsl.ribbonFrag = `
precision highp float;
uniform float uOpacity;
varying vec4 vCol;
varying float vSide;
void main() {
  float edge = smoothstep(1.0, 0.55, abs(vSide));
  gl_FragColor = vec4(vCol.rgb, vCol.a * uOpacity * edge);
}
`;

A.glsl.pointVert = `
${A.glsl.geo}
attribute vec3 aGeo;
attribute vec4 aColor;
attribute float aSize;
uniform float uHeight;
uniform float uPx;
varying vec4 vColor;
void main() {
  vec3 pos = geoToView(aGeo.x, aGeo.y, aGeo.z + uHeight);
  vColor = aColor;
  gl_PointSize = aSize * uPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

A.glsl.pointFrag = `
precision highp float;
uniform float uRing;
varying vec4 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(1.0, 0.82, r);
  float hole = uRing > 0.5 ? smoothstep(0.52, 0.66, r) : 1.0;
  float a = disc * hole * vColor.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}
`;

A.glsl.shellVert = `
${A.glsl.geo}
uniform float uHeight;
varying vec2 vUv;
void main() {
  float lon = position.x + uLon0;
  float lat = position.y;
  vUv = vec2((lon + PI) / (2.0 * PI), (lat + 0.5 * PI) / PI);
  vec3 p = geoToView(lon, lat, uHeight);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

A.glsl.shellFrag = `
precision highp float;
uniform sampler2D uTex;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uTex, vUv);
  gl_FragColor = vec4(c.rgb, c.a * uOpacity);
}
`;

A.glsl.atmoVert = `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

A.glsl.atmoFrag = `
precision highp float;
uniform float uOpacity;
uniform vec3 uTint;
varying vec3 vN;
void main() {
  float intensity = pow(max(0.0, 0.68 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.2);
  gl_FragColor = vec4(uTint, 1.0) * intensity * uOpacity;
}
`;

/* ------------------------------------------------------------------ geometry helpers */

/** Split a polyline of [lon, lat] degree pairs wherever consecutive longitudes jump by more than 180 degrees. */
A.splitDateline = function splitDateline(points) {
  const parts = [];
  let cur = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]; const b = points[i];
    if (Math.abs(b[0] - a[0]) > 180) { parts.push(cur); cur = [b]; } else cur.push(b);
  }
  parts.push(cur);
  return parts.filter(p => p.length > 1);
};

/** Thin (1 px) geographic line segments. polylines: arrays of [lon, lat(, height)] in degrees. */
class GeoLines {
  constructor(globe, { color = '#ffffff', opacity = 0.5, height = 0.0015, order = 1 } = {}) {
    this.globe = globe;
    this.material = new THREE.ShaderMaterial({
      vertexShader: A.glsl.lineVert, fragmentShader: A.glsl.lineFrag, transparent: true, depthWrite: false,
      uniforms: {
        ...globe.shared,
        uColor: { value: new THREE.Vector3(...A.cmap.hex(color).map(v => v / 255)) },
        uOpacity: { value: opacity }, uHeight: { value: height }, uUseVertexColor: { value: 0 },
      },
    });
    this.mesh = new THREE.LineSegments(new THREE.BufferGeometry(), this.material);
    this.mesh.renderOrder = order;
    this.mesh.frustumCulled = false;
    globe.scene.add(this.mesh);
  }

  setColor(color) { this.material.uniforms.uColor.value.set(...A.cmap.hex(color).map(v => v / 255)); this.globe.requestRender(); }
  setOpacity(v) { this.material.uniforms.uOpacity.value = v; this.globe.requestRender(); }
  set visible(v) { this.mesh.visible = v; this.globe.requestRender(); }
  get visible() { return this.mesh.visible; }

  /** colors (optional): one [r,g,b] (0..1) per polyline. */
  set(polylines, colors = null) {
    let segs = 0;
    for (const p of polylines) segs += Math.max(0, p.length - 1);
    const geo = new Float32Array(segs * 6);
    const other = new Float32Array(segs * 6);
    const col = new Float32Array(segs * 6);
    let o = 0;
    polylines.forEach((p, pi) => {
      const c = colors ? colors[pi] : [1, 1, 1];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i]; const b = p[i + 1];
        const ha = a[2] || 0; const hb = b[2] || 0;
        geo[o] = a[0] * DEG; geo[o + 1] = a[1] * DEG; geo[o + 2] = ha;
        geo[o + 3] = b[0] * DEG; geo[o + 4] = b[1] * DEG; geo[o + 5] = hb;
        other[o] = b[0] * DEG; other[o + 1] = b[1] * DEG; other[o + 2] = 0;
        other[o + 3] = a[0] * DEG; other[o + 4] = a[1] * DEG; other[o + 5] = 1;
        col.set(c, o); col.set(c, o + 3);
        o += 6;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('aGeo', new THREE.BufferAttribute(geo, 3));
    g.setAttribute('aOther', new THREE.BufferAttribute(other, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 6), 3));
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    this.material.uniforms.uUseVertexColor.value = colors ? 1 : 0;
    this.count = segs;
    this.globe.requestRender();
  }

  /** data: Float32Array with 7 numbers per segment (lon0, lat0, lon1, lat1, r, g, b); degrees and 0..1 colours. */
  setSegments(data, count) {
    const geo = new Float32Array(count * 6); const other = new Float32Array(count * 6); const col = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const o = i * 7; const q = i * 6;
      const l0 = data[o] * DEG; const b0 = data[o + 1] * DEG; const l1 = data[o + 2] * DEG; const b1 = data[o + 3] * DEG;
      geo[q] = l0; geo[q + 1] = b0; geo[q + 3] = l1; geo[q + 4] = b1;
      other[q] = l1; other[q + 1] = b1; other[q + 2] = 0; other[q + 3] = l0; other[q + 4] = b0; other[q + 5] = 1;
      col[q] = data[o + 4]; col[q + 1] = data[o + 5]; col[q + 2] = data[o + 6]; col[q + 3] = data[o + 4]; col[q + 4] = data[o + 5]; col[q + 5] = data[o + 6];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('aGeo', new THREE.BufferAttribute(geo, 3));
    g.setAttribute('aOther', new THREE.BufferAttribute(other, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    this.material.uniforms.uUseVertexColor.value = 1;
    this.count = count;
    this.globe.requestRender();
  }

  dispose() { this.globe.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.material.dispose(); }
}

/** Constant-pixel-width ribbons (WebGL lines are always 1 px, so thicker lines are built from quads). */
class GeoRibbon {
  constructor(globe, { opacity = 1, height = 0.003, order = 3, joints = true } = {}) {
    this.globe = globe;
    this.material = new THREE.ShaderMaterial({
      vertexShader: A.glsl.ribbonVert, fragmentShader: A.glsl.ribbonFrag, transparent: true, depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { ...globe.shared, uOpacity: { value: opacity }, uHeight: { value: height } },
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.renderOrder = order;
    this.mesh.frustumCulled = false;
    globe.scene.add(this.mesh);
    this.joints = joints ? new GeoPoints(globe, { height, order: order + 0.1 }) : null;
  }

  set visible(v) { this.mesh.visible = v; if (this.joints) this.joints.visible = v; this.globe.requestRender(); }
  get visible() { return this.mesh.visible; }
  setOpacity(v) { this.material.uniforms.uOpacity.value = v; if (this.joints) this.joints.setOpacity(v); this.globe.requestRender(); }

  /** items: [{pts: [[lon, lat, h?], ...], color: [r, g, b, a], width: px}] */
  set(items) {
    let segs = 0;
    for (const it of items) segs += Math.max(0, it.pts.length - 1);
    const A_ = new Float32Array(segs * 4 * 3); const B_ = new Float32Array(segs * 4 * 3);
    const sel = new Float32Array(segs * 4 * 2); const col = new Float32Array(segs * 4 * 4); const wid = new Float32Array(segs * 4);
    const index = new Uint32Array(segs * 6);
    let s = 0;
    const jointItems = [];
    for (const it of items) {
      const c = it.color || [1, 1, 1, 1];
      for (let i = 0; i < it.pts.length - 1; i++) {
        const a = it.pts[i]; const b = it.pts[i + 1];
        for (let v = 0; v < 4; v++) {
          const k = s * 4 + v;
          A_.set([a[0] * DEG, a[1] * DEG, a[2] || 0], k * 3);
          B_.set([b[0] * DEG, b[1] * DEG, b[2] || 0], k * 3);
          sel[k * 2] = v >= 2 ? 1 : 0;
          sel[k * 2 + 1] = v % 2 === 0 ? -1 : 1;
          col.set(c, k * 4);
          wid[k] = it.width || 2;
        }
        const base = s * 4;
        index.set([base, base + 1, base + 2, base + 2, base + 1, base + 3], s * 6);
        s++;
      }
      if (this.joints && (it.width || 2) >= 3) {
        for (const p of it.pts) jointItems.push({ lon: p[0], lat: p[1], h: p[2] || 0, color: c, size: it.width || 2 });
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('aA', new THREE.BufferAttribute(A_, 3));
    g.setAttribute('aB', new THREE.BufferAttribute(B_, 3));
    g.setAttribute('aSel', new THREE.BufferAttribute(sel, 2));
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 4));
    g.setAttribute('aW', new THREE.BufferAttribute(wid, 1));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 4 * 3), 3));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    if (this.joints) this.joints.set(jointItems);
    this.globe.requestRender();
  }

  clear() { this.set([]); }

  dispose() {
    this.globe.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.material.dispose();
    if (this.joints) this.joints.dispose();
  }
}

/** Round point markers with per-point colour and pixel size. */
class GeoPoints {
  constructor(globe, { height = 0.004, order = 4, ring = false } = {}) {
    this.globe = globe;
    this.material = new THREE.ShaderMaterial({
      vertexShader: A.glsl.pointVert, fragmentShader: A.glsl.pointFrag, transparent: true, depthWrite: false,
      uniforms: { ...globe.shared, uHeight: { value: height }, uRing: { value: ring ? 1 : 0 } },
    });
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.material);
    this.points.renderOrder = order;
    this.points.frustumCulled = false;
    globe.scene.add(this.points);
    this.opacity = 1;
  }

  set visible(v) { this.points.visible = v; this.globe.requestRender(); }
  get visible() { return this.points.visible; }
  setOpacity(v) { this.opacity = v; this._apply(); }

  /** items: [{lon, lat, h?, color: [r,g,b,a], size}] (degrees; colour channels 0..1) */
  set(items) {
    this._items = items;
    const n = items.length;
    const geo = new Float32Array(n * 3); const col = new Float32Array(n * 4); const size = new Float32Array(n);
    items.forEach((it, i) => {
      geo.set([it.lon * DEG, it.lat * DEG, it.h || 0], i * 3);
      col.set(it.color || [1, 1, 1, 1], i * 4);
      size[i] = it.size || 6;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('aGeo', new THREE.BufferAttribute(geo, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.points.geometry.dispose();
    this.points.geometry = g;
    this._apply();
    this.globe.requestRender();
  }

  _apply() {
    const a = this.points.geometry.getAttribute('aColor');
    if (!a || !this._items) return;
    this._items.forEach((it, i) => { a.array[i * 4 + 3] = ((it.color && it.color[3] !== undefined) ? it.color[3] : 1) * this.opacity; });
    a.needsUpdate = true;
    this.globe.requestRender();
  }

  clear() { this.set([]); }

  dispose() { this.globe.scene.remove(this.points); this.points.geometry.dispose(); this.material.dispose(); }
}

/** A translucent shell textured with trail images (particle trails); several can be stacked at different heights. */
class FlowShell {
  constructor(globe, texture, { height = 0.004, opacity = 1, order = 2 } = {}) {
    this.globe = globe;
    this.texture = texture;
    this.material = new THREE.ShaderMaterial({
      vertexShader: A.glsl.shellVert, fragmentShader: A.glsl.shellFrag, transparent: true, depthWrite: false,
      uniforms: { ...globe.shared, uTex: { value: this.texture }, uOpacity: { value: opacity }, uHeight: { value: height } },
    });
    this.mesh = new THREE.Mesh(globe.earthGeometry, this.material);
    this.mesh.renderOrder = order;
    this.mesh.frustumCulled = false;
    globe.scene.add(this.mesh);
  }

  set visible(v) { this.mesh.visible = v; this.globe.requestRender(); }
  get visible() { return this.mesh.visible; }
  setOpacity(v) { this.material.uniforms.uOpacity.value = v; this.globe.requestRender(); }
  dispose() { this.globe.scene.remove(this.mesh); this.material.dispose(); }
}
