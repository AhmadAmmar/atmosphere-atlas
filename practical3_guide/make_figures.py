"""Generates the TikZ pieces used by practical3_guide.tex (map, stations, isobars, fronts, streamlines, adjustment paths, extra models).

Run:  python make_figures.py        (writes generated/*.tex)

Everything is drawn in the pixel frame of the practical's printed Figure 10 (130 dpi page units); the LaTeX side uses x=s, y=-s so that
pixel coordinates can be used directly (y grows downwards, as on the page).
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
np.seterr(all='ignore')

def _wt(self, data, encoding=None, errors=None, newline=None):
    """write with plain line feeds (TeX is happier than with CRLF in tables)"""
    with open(self, "w", encoding=encoding or "utf-8", newline=chr(10)) as fh:
        fh.write(data)


Path.write_text = _wt
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from atlas.content.p3_data import P3_DATA  # noqa: E402

OUT = HERE / "generated"
OUT.mkdir(exist_ok=True)
DEG = math.pi / 180


def f2(v):
    """A number with one decimal, for TikZ coordinates."""
    return f"{v:.1f}"


# ---------------------------------------------------------------------------------------------------- station data
def code_to_hpa(c):
    """Pressure (hPa) from a station-plot code (three digits, 900 or 1000 added)."""
    return 900 + c / 10 if c >= 500 else 1000 + c / 10


STATIONS = []
for s in P3_DATA["stations"]:
    d = dict(s)
    d["hpa"] = code_to_hpa(d["p"])
    d["u"] = -d["kt"] * math.sin(d["dir"] * DEG)
    d["v"] = -d["kt"] * math.cos(d["dir"] * DEG)
    d["precip"] = any(k in d["wx"] for k in ("rain", "snow", "drizzle", "thunder"))
    STATIONS.append(d)
BYID = {s["id"]: s for s in STATIONS}
PTS = np.array([[s["x"], s["y"]] for s in STATIONS], float)


# ---------------------------------------------------------------------------------------------------- symbols as TikZ code
def barb_code(x, y, frm, kt, length, s, color="black", calm_r=None):
    """TikZ code of a wind barb (direction from, speed in knots); a circle when calm."""
    out = []
    lw = f"line width={0.55 * s:.2f}pt"
    if kt < 1:
        r = calm_r if calm_r else 12 * s
        return [f"\\draw[{color},{lw}] ({f2(x)},{f2(y)}) circle ({f2(r)});"]
    th = frm * DEG
    ux, uy = math.sin(th), -math.cos(th)
    nx, ny = math.cos(th), math.sin(th)              # clockwise-side normal
    ex, ey = x + ux * length, y + uy * length
    out.append(f"\\draw[{color},{lw}] ({f2(x)},{f2(y)}) -- ({f2(ex)},{f2(ey)});")
    k = 0 if kt < 3 else int(round(kt / 5.0)) * 5
    pos = length
    bl = length * 0.36
    first = True
    while k >= 50:
        px, py = x + ux * pos, y + uy * pos
        p2 = (px + nx * bl, py + ny * bl + 0)
        p3 = (px - ux * length * 0.2, py - uy * length * 0.2)
        out.append(f"\\fill[{color}] ({f2(px)},{f2(py)}) -- ({f2(px + nx * bl - ux * 3)},{f2(py + ny * bl - uy * 3)}) -- ({f2(p3[0])},{f2(p3[1])}) -- cycle;")
        pos -= length * 0.22
        k -= 50
        first = False
    while k >= 10:
        px, py = x + ux * pos, y + uy * pos
        out.append(f"\\draw[{color},{lw}] ({f2(px)},{f2(py)}) -- ({f2(px + nx * bl + ux * bl * 0.5)},{f2(py + ny * bl + uy * bl * 0.5)});")
        pos -= length * 0.15
        k -= 10
        first = False
    if k >= 5:
        if first:
            pos -= length * 0.15
        px, py = x + ux * pos, y + uy * pos
        out.append(f"\\draw[{color},{lw}] ({f2(px)},{f2(py)}) -- ({f2(px + nx * bl / 2 + ux * bl * 0.25)},{f2(py + ny * bl / 2 + uy * bl * 0.25)});")
    return out


def sky_code(x, y, r, pct, s=1.0, color="black"):
    """Filled sky-cover circle (WMO convention: fill grows clockwise from twelve o'clock)."""
    lw = f"line width={0.55 * s:.2f}pt"
    out = [f"\\draw[{color},{lw},fill=white] ({f2(x)},{f2(y)}) circle ({f2(r)});"]

    def wedge(frac):
        """TikZ code of the filled part of the sky-cover circle."""
        if frac >= 0.999:
            return f"\\fill[{color}] ({f2(x)},{f2(y)}) circle ({f2(r)});"
        n = max(2, int(48 * frac))
        pts = [(x, y)]
        for i in range(n + 1):
            a = frac * 2 * math.pi * i / n
            pts.append((x + r * math.sin(a), y - r * math.cos(a)))
        return f"\\fill[{color}] " + " -- ".join(f"({f2(a)},{f2(b)})" for a, b in pts) + " -- cycle;"

    def cross():
        """TikZ code of the cross for an obscured sky."""
        return [f"\\draw[{color},{lw}] ({f2(x - r)},{f2(y)}) -- ({f2(x + r)},{f2(y)});", f"\\draw[{color},{lw}] ({f2(x)},{f2(y - r)}) -- ({f2(x)},{f2(y + r)});"]

    if pct == "x":
        out += [f"\\draw[{color},{lw}] ({f2(x - r * .7)},{f2(y - r * .7)}) -- ({f2(x + r * .7)},{f2(y + r * .7)});",
                f"\\draw[{color},{lw}] ({f2(x + r * .7)},{f2(y - r * .7)}) -- ({f2(x - r * .7)},{f2(y + r * .7)});"]
    elif pct >= 100:
        out.append(wedge(1))
    elif pct >= 90:
        out.append(wedge(1))
        out.append(f"\\draw[white,{lw}] ({f2(x)},{f2(y - r)}) -- ({f2(x)},{f2(y + r)});")
    elif pct >= 75:
        out.append(wedge(0.75))
    elif pct >= 60:
        out.append(wedge(0.5)); out += cross()
    elif pct >= 50:
        out.append(wedge(0.5))
    elif pct >= 40:
        out.append(wedge(0.25)); out += cross()
    elif pct >= 25:
        out.append(wedge(0.25))
    elif pct >= 10:
        out.append(f"\\draw[{color},{lw}] ({f2(x)},{f2(y - r)}) -- ({f2(x)},{f2(y + r)});")
    return out


def wx_code(x, y, kind, s=1.0, color="black"):
    """TikZ code of a present-weather symbol."""
    out = []
    lw = f"line width={0.55 * s:.2f}pt"
    if kind == "rain-int":
        out.append(f"\\fill[{color}] ({f2(x)},{f2(y)}) circle ({f2(2.6 * s)});")
    elif kind == "rain-cont":
        for dx in (-4.2, 4.2):
            out.append(f"\\fill[{color}] ({f2(x + dx * s)},{f2(y)}) circle ({f2(2.6 * s)});")
    elif kind == "snow-cont":
        for cx in (-5, 5):
            c = x + cx * s
            out.append(f"\\draw[{color},{lw}] ({f2(c - 3.2 * s)},{f2(y)}) -- ({f2(c + 3.2 * s)},{f2(y)});")
            out.append(f"\\draw[{color},{lw}] ({f2(c - 1.6 * s)},{f2(y - 2.8 * s)}) -- ({f2(c + 1.6 * s)},{f2(y + 2.8 * s)});")
            out.append(f"\\draw[{color},{lw}] ({f2(c + 1.6 * s)},{f2(y - 2.8 * s)}) -- ({f2(c - 1.6 * s)},{f2(y + 2.8 * s)});")
    elif kind == "drizzle-cont":
        for cx in (-4, 4):
            c = x + cx * s
            out.append(f"\\fill[{color}] ({f2(c)},{f2(y - 1.5 * s)}) circle ({f2(1.9 * s)});")
            out.append(f"\\draw[{color},{lw}] ({f2(c + 1.5 * s)},{f2(y - 0.6 * s)}) .. controls ({f2(c + 1.5 * s)},{f2(y + 3 * s)}) .. ({f2(c - 1.8 * s)},{f2(y + 4.6 * s)});")
    elif kind == "fog":
        for dy in (-4.5, 0, 4.5):
            out.append(f"\\draw[{color},{lw}] ({f2(x - 7 * s)},{f2(y + dy * s)}) -- ({f2(x + 7 * s)},{f2(y + dy * s)});")
    elif kind in ("thunder", "thunder-rain"):
        pts = [(-4, -8), (-4, 8)]
        out.append(f"\\draw[{color},{lw}] ({f2(x - 4 * s)},{f2(y - 8 * s)}) -- ({f2(x - 4 * s)},{f2(y + 8 * s)});")
        out.append(f"\\draw[{color},{lw}] ({f2(x - 4 * s)},{f2(y - 8 * s)}) -- ({f2(x + 2 * s)},{f2(y - 8 * s)}) .. controls ({f2(x + 7.5 * s)},{f2(y - 8 * s)}) and ({f2(x + 7.5 * s)},{f2(y + 0.5 * s)}) .. ({f2(x + 2 * s)},{f2(y + 0.5 * s)}) -- ({f2(x - 4 * s)},{f2(y + 0.5 * s)});")
        out.append(f"\\draw[{color},{lw}] ({f2(x + 1 * s)},{f2(y + 0.5 * s)}) -- ({f2(x + 8 * s)},{f2(y + 8 * s)});")
        out.append(f"\\fill[{color}] ({f2(x + 9.5 * s)},{f2(y + 9.5 * s)}) -- ({f2(x + 4.6 * s)},{f2(y + 8.3 * s)}) -- ({f2(x + 7.8 * s)},{f2(y + 4.8 * s)}) -- cycle;")
        if kind == "thunder-rain":
            out.append(f"\\fill[{color}] ({f2(x - 1 * s)},{f2(y - 13 * s)}) circle ({f2(2.4 * s)});")
    return out


TENDENCY = [
    [(-7, 4), (-1, -5), (2, -2), (7, 3)],
    [(-7, 4), (-1, -4), (7, -4)],
    [(-7, 5), (7, -5)],
    [(-7, -1), (-2, 4), (7, -5)],
    [(-7, 0), (7, 0)],
    [(-7, -5), (2, 4), (7, 0)],
    [(-7, -5), (-1, 3), (7, 3)],
    [(-7, -5), (7, 5)],
    [(-7, 2), (-1, -4), (3, -1), (7, 5)],
]


def tend_code(x, y, code, s=1.0, color="black"):
    """TikZ code of a pressure-tendency symbol."""
    pts = " -- ".join(f"({f2(x + a * s)},{f2(y + b * s)})" for a, b in TENDENCY[code])
    return [f"\\draw[{color},line width={0.55 * s:.2f}pt] {pts};"]


def node(x, y, text, anchor, fs, color="black", fill=True, extra=""):
    """TikZ code of a text node."""
    fillopt = ",fill=white,fill opacity=0.0,text opacity=1" if not fill else ""
    return f"\\node[anchor={anchor},inner sep=0pt,font=\\fontsize{{{fs}}}{{{fs}}}\\selectfont,text={color}{extra}] at ({f2(x)},{f2(y)}) {{{text}}};"


def station_code(x, y, st, s=1.0, fs=5.6, barbs=True, text=True, color="black", sky_override=None, upt=0.556):
    """TikZ code of a full station plot: sky, barb, temperature, dew point, pressure, weather and tendency."""
    out = []
    if barbs and st.get("kt") is not None:
        out += barb_code(x, y, st.get("dir", 0), st["kt"], 40 * s, s, color, calm_r=12.5 * s)
    out += sky_code(x, y, 8.5 * s, st.get("sky", 0) if sky_override is None else sky_override, s, color)
    if text:
        if st.get("T") is not None:
            out.append(node(x - 11 * s, y - 11 * s, str(st["T"]), "east", fs, color))
        if st.get("Td") is not None:
            out.append(node(x - 11 * s, y + 20 * s, str(st["Td"]), "east", fs, color))
        if st.get("p") is not None:
            out.append(node(x + 11 * s, y - 11 * s, f"{int(st['p']):03d}", "west", fs, color))
        if st.get("wx"):
            out += wx_code(x - 19 * s, y + 5 * s, st["wx"], 0.85 * s, color)
        if st.get("tend") is not None:
            sign = "-" if st["dp"] < 0 else "+"
            out.append(node(x + 11 * s, y + 6 * s, f"{sign}{abs(st['dp']):02d}", "west", fs, color))
            out += tend_code(x + 11 * s + 1.8 * fs / upt + 9 * s, y + 3 * s, st["tend"], 0.75 * s, color)
    return out


# ---------------------------------------------------------------------------------------------------- the map outline
def write_states():
    """Write the state outlines for the maps."""
    lines = []
    for ring in P3_DATA["states"]:
        pts = " -- ".join(f"({a},{b})" for a, b in ring["pts"])
        lines.append(f"\\draw[mapstate] {pts} -- cycle;")
    (OUT / "map_states.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- numerical fields
def spline(pts, vals):
    """Thin-plate spline interpolator of values at points."""
    n = len(pts)
    sc = 0.01
    X = pts * sc

    def phi(r2):
        """Thin-plate radial basis 0.5 r2 log r2 (0 at r = 0)."""
        r2 = np.asarray(r2)
        out = np.zeros_like(r2)
        m = r2 > 1e-12
        out[m] = 0.5 * r2[m] * np.log(r2[m])
        return out

    d2 = ((X[:, None, :] - X[None, :, :]) ** 2).sum(-1)
    M = np.zeros((n + 3, n + 3))
    M[:n, :n] = phi(d2) + 1e-4 * np.eye(n)
    M[:n, n] = 1; M[:n, n + 1] = X[:, 0]; M[:n, n + 2] = X[:, 1]
    M[n, :n] = 1; M[n + 1, :n] = X[:, 0]; M[n + 2, :n] = X[:, 1]
    rhs = np.zeros(n + 3); rhs[:n] = vals
    w = np.linalg.solve(M, rhs)

    def f(x, y):
        """Interpolated value at (x, y)."""
        xx = np.asarray(x) * sc; yy = np.asarray(y) * sc
        v = w[n] + w[n + 1] * xx + w[n + 2] * yy
        for i in range(n):
            v = v + w[i] * phi((xx - X[i, 0]) ** 2 + (yy - X[i, 1]) ** 2)
        return v
    return f


def kernel(pts, vals, sigma):
    """Gaussian kernel smoother of values at points (width sigma)."""
    vals = np.asarray(vals, float)

    def f(x, y):
        """Smoothed value and weight sum at (x, y)."""
        d2 = (np.asarray(x)[..., None] - pts[:, 0]) ** 2 + (np.asarray(y)[..., None] - pts[:, 1]) ** 2
        w = np.exp(-d2 / (2 * sigma * sigma))
        s = w.sum(-1)
        return (w * vals).sum(-1) / np.maximum(s, 1e-12), s
    return f


GX0, GY0, GS = 175.0, 520.0, 6.0
GNX, GNY = int(round(820 / GS)) + 1, int(round(640 / GS)) + 1
GX = GX0 + np.arange(GNX) * GS
GY = GY0 + np.arange(GNY) * GS
XX, YY = np.meshgrid(GX, GY)
NEAR = np.min(np.hypot(XX[..., None] - PTS[:, 0], YY[..., None] - PTS[:, 1]), axis=-1)


def contour(grid, level):
    """Marching squares on `grid` (NaN = no data); returns chains of (x, y)."""
    segs = []
    ny, nx = grid.shape
    for j in range(ny - 1):
        for i in range(nx - 1):
            a, b, c, d = grid[j, i], grid[j, i + 1], grid[j + 1, i + 1], grid[j + 1, i]
            if np.isnan([a, b, c, d]).any():
                continue
            code = (8 if a > level else 0) | (4 if b > level else 0) | (2 if c > level else 0) | (1 if d > level else 0)
            if code in (0, 15):
                continue
            x, y = GX0 + i * GS, GY0 + j * GS
            tl, tr, br, bl = (x, y), (x + GS, y), (x + GS, y + GS), (x, y + GS)

            def L(p, q, vp, vq):
                t = (level - vp) / (vq - vp)
                return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
            top, right, bottom, left = L(tl, tr, a, b), L(tr, br, b, c), L(bl, br, d, c), L(tl, bl, a, d)
            centre = (a + b + c + d) / 4 > level
            if code in (1, 14): segs.append((left, bottom))
            elif code in (2, 13): segs.append((bottom, right))
            elif code in (3, 12): segs.append((left, right))
            elif code in (4, 11): segs.append((top, right))
            elif code in (6, 9): segs.append((top, bottom))
            elif code in (7, 8): segs.append((left, top))
            elif code == 5:
                segs += [(left, top), (bottom, right)] if centre else [(left, bottom), (top, right)]
            elif code == 10:
                segs += [(top, right), (left, bottom)] if centre else [(left, top), (bottom, right)]
    key = lambda p: (round(p[0], 1), round(p[1], 1))
    ends = {}
    for i, s in enumerate(segs):
        for p in s:
            ends.setdefault(key(p), []).append(i)
    used = [False] * len(segs)
    chains = []
    for i in range(len(segs)):
        if used[i]:
            continue
        used[i] = True
        chain = [segs[i][0], segs[i][1]]
        for direction in (1, 0):
            while True:
                tip = chain[-1] if direction else chain[0]
                nxt = None
                for j in ends.get(key(tip), []):
                    if not used[j]:
                        nxt = j
                        break
                if nxt is None:
                    break
                used[nxt] = True
                s = segs[nxt]
                other = s[1] if key(s[0]) == key(tip) else s[0]
                if direction:
                    chain.append(other)
                else:
                    chain.insert(0, other)
        chains.append(chain)
    return chains


def chaikin(pts, n=2, closed=False):
    """A line smoothed by n rounds of Chaikin corner cutting."""
    pts = list(pts)
    for _ in range(n):
        new = []
        m = len(pts)
        rng = range(m) if closed else range(m - 1)
        if not closed:
            new.append(pts[0])
        for i in rng:
            p, q = pts[i], pts[(i + 1) % m]
            new.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
            new.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
        if not closed:
            new.append(pts[-1])
        pts = new
    return pts


def path_str(chain, cycle=False):
    """TikZ path of a point chain."""
    return " -- ".join(f"({f2(a)},{f2(b)})" for a, b in chain) + (" -- cycle" if cycle else "")


# ---------------------------------------------------------------------------------------------------- analysis products
def write_analysis():
    """Write the isobar analysis of the station pressures."""
    hpa = np.array([s["hpa"] for s in STATIONS])
    pf = spline(PTS, hpa)
    P = pf(XX, YY)
    Pm = np.where(NEAR <= 112, P, np.nan)
    out = []
    labels = []
    for level in (1004, 1008, 1012, 1016, 1020):
        chains = [c for c in contour(Pm, level) if len(c) > 2]
        if not chains:
            continue
        for ch in chains:
            out.append(f"\\draw[isobar] {path_str(chaikin(ch, 1))};")
        best = max(chains, key=len)
        if len(best) > 10:
            k = len(best) // 2
            p0, p1 = best[max(0, k - 2)], best[min(len(best) - 1, k + 2)]
            ang = -math.degrees(math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
            if ang > 90: ang -= 180
            if ang < -90: ang += 180
            labels.append(f"\\node[isolabel,rotate={ang:.0f}] at ({f2(best[k][0])},{f2(best[k][1])}) {{{level}}};")
    (OUT / "map_isobars.tex").write_text("\n".join(out + labels) + "\n", encoding="utf-8")

    # the low
    Pl = np.where(NEAR <= 78, P, np.inf)
    j, i = np.unravel_index(np.argmin(Pl), Pl.shape)
    low = (float(GX[i]), float(GY[j]), float(Pl[j, i]))
    (OUT / "map_low.tex").write_text(f"\\node[lowmark] at ({f2(low[0])},{f2(low[1])}) {{L}};\n", encoding="utf-8")

    # cloud above 75 % (smooth weighted average of the cover; closed outlines because cells away from stations count as clear)
    sky = kernel(PTS, [s["sky"] for s in STATIONS], 60)
    v, wsum = sky(XX, YY)
    cg = np.where(NEAR <= 95, v, 0.0)
    cg[0, :] = cg[-1, :] = 0; cg[:, 0] = cg[:, -1] = 0
    loops = []
    for ch in contour(cg, 75):
        if len(ch) > 8:
            loops.append(chaikin(ch, 2, closed=False))
    cloud = [f"\\path[cloudfill,even odd rule] " + " ".join(path_str(c, cycle=True) + " " for c in loops) + ";"]
    cloud += [f"\\draw[cloudline] {path_str(c)};" for c in loops]
    (OUT / "map_cloud.tex").write_text("\n".join(cloud) + "\n", encoding="utf-8")

    pr = kernel(PTS, [1.0 if s["precip"] else 0.0 for s in STATIONS], 46)
    v, _ = pr(XX, YY)
    pg = np.where(NEAR <= 95, v, 0.0)
    pg[0, :] = pg[-1, :] = 0; pg[:, 0] = pg[:, -1] = 0
    loops = [chaikin(c, 2) for c in contour(pg, 0.3) if len(c) > 6]
    precip = [f"\\path[precipfill,even odd rule] " + " ".join(path_str(c, cycle=True) + " " for c in loops) + ";"]
    (OUT / "map_precip.tex").write_text("\n".join(precip) + "\n", encoding="utf-8")
    return low


COLD = [(655, 702), (620, 740), (600, 770), (572, 815), (553, 865), (550, 915), (540, 970), (535, 1020), (525, 1072)]
WARM = [(655, 702), (690, 704), (722, 710), (760, 735), (818, 768), (870, 772), (940, 768)]


def front_code(pts, kind, size=1.0):
    """TikZ code of a cold or warm front with its symbols."""
    col = "fblue" if kind == "cold" else "fred"
    out = [f"\\draw[{col},line width={1.1 * size:.2f}pt] {path_str(pts)};"]
    gap = 30 * size
    carry = gap / 2
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        nx, ny = uy, -ux
        t = carry
        while t < L:
            bx, by = x0 + ux * t, y0 + uy * t
            if kind == "cold":
                w, hgt = 10 * size, 13 * size
                out.append(f"\\fill[{col}] ({f2(bx - ux * w)},{f2(by - uy * w)}) -- ({f2(bx + nx * hgt)},{f2(by + ny * hgt)}) -- ({f2(bx + ux * w)},{f2(by + uy * w)}) -- cycle;")
            else:
                r = 8.5 * size
                n = 14
                pts_arc = []
                for k in range(n + 1):
                    a = math.pi * k / n
                    pts_arc.append((bx - ux * r * math.cos(a) + nx * r * math.sin(a), by - uy * r * math.cos(a) + ny * r * math.sin(a)))
                out.append(f"\\fill[{col}] " + " -- ".join(f"({f2(a)},{f2(b)})" for a, b in pts_arc) + " -- cycle;")
            t += gap
        carry = t - L
    return out


def write_fronts():
    """Write the fronts."""
    lines = front_code(COLD, "cold") + front_code(WARM, "warm")
    (OUT / "map_fronts.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")
    fig9 = P3_DATA["fig9"]
    lines = front_code([tuple(p) for p in fig9["warm"]], "warm", 1.05) + front_code([tuple(p) for p in fig9["cold"]], "cold", 1.05)
    (OUT / "fig9_fronts.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- station drawings
def write_stations():
    """Write the station plots."""
    full, barbs_only, pressure, tcol = [], [], [], []
    for s in STATIONS:
        st = dict(T=s["T"], Td=s["Td"], p=s["p"], sky=s["sky"], dir=s["dir"], kt=s["kt"], wx=s["wx"])
        full += station_code(s["x"], s["y"], st, s=0.92, fs=5.4)
        barbs_only += station_code(s["x"], s["y"], dict(sky=s["sky"], dir=s["dir"], kt=s["kt"]), s=1.0, text=False)
        barbs_only.append(node(s["x"] + 9, s["y"] - 10, str(s["id"]), "west", 5.0, "gray"))
        # pressures only: the three digits with the full pressure underneath
        pressure.append(f"\\fill[black] ({f2(s['x'])},{f2(s['y'])}) circle (2.6);")
        pressure.append(node(s["x"] + 5, s["y"] - 2, f"{s['hpa']:.1f}", "west", 6.0, "black"))
        pressure.append(node(s["x"] - 5, s["y"] - 6, str(s["id"]), "east", 4.8, "gray"))
        # air temperature as a coloured dot
        t = max(0.0, min(1.0, (s["T"] - 32) / 40))
        tcol.append(f"\\fill[tempcol!{int(100 * t)}!tempcold] ({f2(s['x'])},{f2(s['y'])}) circle (6.5);")
        tcol.append(node(s["x"] + 8, s["y"] - 1, str(s["T"]), "west", 6.0, "black"))
    (OUT / "map_stations_full.tex").write_text("\n".join(full) + "\n", encoding="utf-8")
    (OUT / "map_stations_barbs.tex").write_text("\n".join(barbs_only) + "\n", encoding="utf-8")
    (OUT / "map_stations_pressure.tex").write_text("\n".join(pressure) + "\n", encoding="utf-8")
    (OUT / "map_stations_temp.tex").write_text("\n".join(tcol) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- streamlines
def write_streams():
    """Write streamlines of the smoothed station winds."""
    uK = kernel(PTS, [s["u"] for s in STATIONS], 70)
    vK = kernel(PTS, [s["v"] for s in STATIONS], 70)

    def near(x, y):
        """Distance to the nearest station."""
        return float(np.min(np.hypot(PTS[:, 0] - x, PTS[:, 1] - y)))

    def wind_dir(x, y):
        """Smoothed wind direction at a point."""
        u, wu = uK(np.array(x), np.array(y))
        v, wv = vK(np.array(x), np.array(y))
        if wv < 0.12:
            return None
        m = math.hypot(u, v) or 1
        return (u / m, -v / m)

    def stream(sx, sy, ahead=60, behind=0):
        """Streamline from a start point, traced ahead and behind."""
        def trace(sign, mx):
            """Points traced one way along the wind."""
            out = []
            x, y = sx, sy
            for _ in range(mx):
                if near(x, y) > 120 or math.hypot(x - 655, y - 706) < 42:
                    break
                a = wind_dir(x, y)
                if not a:
                    break
                b = wind_dir(x + sign * a[0] * 4, y + sign * a[1] * 4) or a
                x += sign * b[0] * 8
                y += sign * b[1] * 8
                if len(out) > 12 and any(math.hypot(p[0] - x, p[1] - y) < 10 for p in out[: len(out) - 10]):
                    break
                out.append((x, y))
            return out
        return list(reversed(trace(-1, behind))) + [(sx, sy)] + trace(1, ahead)

    seeds = [(420, 566), (405, 800), (565, 1085), (700, 1040), (880, 806), (930, 650)]
    lines = []
    for sd in seeds:
        pl = stream(sd[0], sd[1], 62, 0)
        sm = chaikin(pl, 1)
        lines.append(f"\\draw[streamline,-{{Stealth[length=2.2mm,width=1.8mm]}}] {path_str(sm)};")
    (OUT / "map_streams.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")

    ex = [[(371, 752), (551, 903)], [(454, 1058), (510, 1036), (596, 995), (661, 919), (702, 826), (725, 738)]]

    def catmull(p):
        """A smooth Catmull-Rom curve through points."""
        if len(p) == 2:
            return p
        out = []
        for t in range(len(p) - 1):
            p0, p1, p2, p3 = p[max(0, t - 1)], p[t], p[t + 1], p[min(len(p) - 1, t + 2)]
            for q in range(8):
                k = q / 8
                out.append(tuple(0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * k + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * k * k + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * k ** 3) for i in range(2)))
        out.append(p[-1])
        return out
    lines = [f"\\draw[exampleline,-{{Stealth[length=2.4mm,width=2mm]}}] {path_str(catmull(e))};" for e in ex]
    (OUT / "map_examples.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- Figure 9 and the models
def write_fig9():
    """Write figure 9 of the practical."""
    fig9 = P3_DATA["fig9"]
    code = []
    for s in fig9["stations"]:
        st = dict(T=s["T"], Td=s["Td"], p=s["p"], sky=s["sky"], dir=s["dir"], kt=s["kt"], wx=s["wx"])
        code += station_code(s["x"], s["y"], st, s=1.15, fs=7.0, upt=0.669)
        code.append(node(s["x"] + (-26 if s["id"] == "D" else 16), s["y"] + 34, f"\\textbf{{{s['id']}}}", "center", 9.0, "fig9label"))
    (OUT / "fig9_stations.tex").write_text("\n".join(code) + "\n", encoding="utf-8")
    L = fig9["L"]
    (OUT / "fig9_low.tex").write_text(f"\\node[lowmark,scale=1.5] at ({L[0]},{L[1]}) {{L}};\n", encoding="utf-8")


SHEET_MODELS = [
    dict(T=37, Td=21, p=24, sky=0, kt=0, dir=0),
    dict(T=63, Td=60, p=998, sky=50, kt=0, dir=0, wx="thunder-rain"),
    dict(T=43, Td=20, p=117, sky=0, kt=25, dir=225, tend=2, dp=17),
    dict(T=27, Td=20, p=997, sky=100, kt=25, dir=315, wx="snow-cont", tend=7, dp=-11),
]
PRACTICE_MODELS = [
    dict(T=72, Td=65, p=150, sky=25, kt=15, dir=180, tend=1, dp=21),
    dict(T=48, Td=47, p=975, sky=100, kt=35, dir=45, wx="rain-cont", tend=7, dp=-32),
    dict(T=5, Td=3, p=84, sky=60, kt=10, dir=270, wx="drizzle-cont", tend=0, dp=-4),
]


def write_models():
    # each model in its own small picture-sized scope (pixel scale chosen by the LaTeX macro)
    """Write the wind model figures."""
    for name, models in (("sheet", SHEET_MODELS), ("practice", PRACTICE_MODELS)):
        for i, m in enumerate(models, 1):
            code = station_code(0, 0, m, s=1.0, fs=11.5, upt=1.48)
            (OUT / f"model_{name}{i}.tex").write_text("\n".join(code) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- geostrophic adjustment paths
def write_adjustment():
    """Write the geostrophic adjustment figure."""
    OM = 7.2921159e-5
    G = 9.80665
    lat, dn, dz = 45.0, 500e3, 60.0
    f0 = 2 * OM * math.sin(lat * DEG)
    P = G * dz / dn
    Vg = P / f0

    def run(hemi, gamma, tmax, dt=0.01):
        """Path of an air parcel starting at rest under a pressure gradient and Coriolis force (with friction
        gamma), by hemisphere.
        """
        f = f0 * (1 if hemi == "N" else -1)
        Py = P if hemi == "N" else -P
        af = abs(f)
        u = v = x = y = 0.0
        out = []
        for i in range(int(tmax / dt) + 1):
            out.append((i * dt, x, y, u, v))
            r = gamma * af
            ug = Py / f                                   # geostrophic wind: f u_g = P_y
            du = f * v - r * (u - ug)                      # the damping pulls the velocity towards the geostrophic wind
            dv = Py - f * u - r * v
            k = dt / af
            u += du * k; v += dv * k; x += u * k; y += v * k
        return out, f, Py
    lines = []
    for hemi in ("N", "S"):
        for tag, gamma, tmax in (("drag", 0.6, 8.0), ("free", 0.0, 6.4)):
            pth, f, Py = run(hemi, gamma, tmax)
            pts = " ".join(f"({x / 1e3:.2f},{y / 1e3:.2f})" for i, (t, x, y, u, v) in enumerate(pth) if i % 4 == 0)
            lines.append(rf"\newcommand{{\adjpath{hemi}{tag}}}{{{pts}}}")
            stages = [0, 1.0, 2.2, 7.4] if gamma else [0, 1.6, 3.14, 4.7]
            arrows = []
            for k, t in enumerate(stages, 1):
                j = min(len(pth) - 1, int(round(t / 0.01)))
                tt, x, y, u, v = pth[j]
                px, py = x / 1e3, y / 1e3
                scale = 120.0 / P                                   # km of arrow per (m/s^2): pressure force = 120 km
                pf = (0.0, Py * scale)
                co = (f * v * scale, -f * u * scale)
                vs = 105.0 / Vg
                vel = (u * vs, v * vs)
                lines.append(rf"\newcommand{{\adjst{hemi}{tag}{'abcd'[k - 1]}x}}{{{px:.2f}}}")
                lines.append(rf"\newcommand{{\adjst{hemi}{tag}{'abcd'[k - 1]}y}}{{{py:.2f}}}")
                arrows.append(rf"\draw[-{{Stealth[length=2mm]}},fred,line width=1.1pt] ({px:.1f},{py:.1f}) -- ({px + pf[0]:.1f},{py + pf[1]:.1f});")
                if math.hypot(*co) > 4:
                    arrows.append(rf"\draw[-{{Stealth[length=2mm]}},fblue,line width=1.1pt] ({px:.1f},{py:.1f}) -- ({px + co[0]:.1f},{py + co[1]:.1f});")
                if math.hypot(*vel) > 4:
                    arrows.append(rf"\draw[-{{Stealth[length=2mm]}},black,line width=1.3pt] ({px:.1f},{py:.1f}) -- ({px + vel[0]:.1f},{py + vel[1]:.1f});")
                one = arrows[-3:] if (math.hypot(*co) > 4 and math.hypot(*vel) > 4) else arrows[-(1 + (math.hypot(*co) > 4) + (math.hypot(*vel) > 4)):]
                lines.append(rf"\newcommand{{\adjarr{hemi}{tag}{'abcd'[k - 1]}}}{{" + "\n".join(one) + "}")
                part = " ".join(f"({xx / 1e3:.2f},{yy / 1e3:.2f})" for i2, (t2, xx, yy, u2, v2) in enumerate(pth[: j + 1]) if i2 % 4 == 0 or i2 == j)
                lines.append(rf"\newcommand{{\adjpart{hemi}{tag}{'abcd'[k - 1]}}}{{{part}}}")
            lines.append(rf"\newcommand{{\adjarrows{hemi}{tag}}}{{" + "\n".join(arrows) + "}")
            lines.append(rf"\newcommand{{\adjend{hemi}{tag}}}{{({pth[-1][1] / 1e3:.2f},{pth[-1][2] / 1e3:.2f})}}")
            # speed against time (hours) for the northern runs
            if hemi == "N":
                sp = " ".join(f"({t / abs(f) / 3600:.2f},{math.hypot(u, v):.2f})" for i, (t, x, y, u, v) in enumerate(pth) if i % 4 == 0)
                us = " ".join(f"({t / abs(f) / 3600:.2f},{u:.2f})" for i, (t, x, y, u, v) in enumerate(pth) if i % 4 == 0)
                vs_ = " ".join(f"({t / abs(f) / 3600:.2f},{v:.2f})" for i, (t, x, y, u, v) in enumerate(pth) if i % 4 == 0)
                lines.append(rf"\newcommand{{\adjspeed{tag}}}{{{sp}}}")
                lines.append(rf"\newcommand{{\adju{tag}}}{{{us}}}")
                lines.append(rf"\newcommand{{\adjv{tag}}}{{{vs_}}}")
    lines.append(rf"\newcommand{{\adjVg}}{{{Vg:.2f}}}")
    (OUT / "adjust.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- Figure 6: four systems
def steady(Px, Py, f, k):
    """Steady wind (u, v) with friction k under pressure gradient (Px, Py) and Coriolis f, and the Coriolis and
    friction forces.
    """
    d = k * k + f * f
    u = (k * Px + f * Py) / d
    v = (k * Py - f * Px) / d
    return u, v, (f * v, -f * u), (-k * u, -k * v)


def write_four():
    """Write the four cases: lows and highs in each hemisphere."""
    f_mag = 1.0
    out = []
    systems = [("NL", "N", "L"), ("NH", "N", "H"), ("SL", "S", "L"), ("SH", "S", "H")]
    for name, hemi, sysk in systems:
        f = f_mag if hemi == "N" else -f_mag
        k = 0.6
        code = []
        for r, val in zip((0.9, 1.7, 2.5), (996, 1000, 1004) if sysk == "L" else (1024, 1020, 1016)):
            code.append(f"\\draw[isobar,line width=0.5pt] (0,0) circle ({r});")
            code.append(f"\\node[font=\\tiny,fill=white,inner sep=0.5pt] at (0,{r}) {{{val}}};")
        code.append(f"\\node[font=\\Large\\bfseries,text={'red!70!black' if sysk == 'L' else 'blue!70!black'}] at (0,0) {{{sysk}}};")
        for r in (1.3, 2.1):
            for th in range(0, 360, 45):
                rx, ry = math.sin(th * DEG), math.cos(th * DEG)
                dirp = -1 if sysk == "L" else 1
                u, v, cor, fr = steady(dirp * rx, dirp * ry, f, k)
                m = math.hypot(u, v)
                px, py = r * rx, r * ry
                a = (px - u / m * 0.22, py - v / m * 0.22)
                b = (px + u / m * 0.22, py + v / m * 0.22)
                code.append(f"\\draw[-{{Stealth[length=1.6mm]}},gray!70!black,line width=0.5pt] ({a[0]:.2f},{a[1]:.2f}) -- ({b[0]:.2f},{b[1]:.2f});")
        # the chosen box at 135 degrees (south-east) on the middle ring
        th = 135
        rx, ry = math.sin(th * DEG), math.cos(th * DEG)
        dirp = -1 if sysk == "L" else 1
        u, v, cor, fr = steady(dirp * rx, dirp * ry, f, k)
        bx, by = 1.7 * rx, 1.7 * ry
        sc = 1.05
        Vg = 1.0 / abs(f)
        def arrow(vx, vy, col, w=1.3):
            return f"\\draw[-{{Stealth[length=2mm]}},{col},line width={w}pt] ({bx:.2f},{by:.2f}) -- ({bx + vx * sc:.2f},{by + vy * sc:.2f});"
        code.append(arrow(dirp * rx, dirp * ry, "fred"))
        code.append(arrow(cor[0], cor[1], "fblue"))
        code.append(arrow(fr[0], fr[1], "fgreen"))
        code.append(arrow(u / Vg * 0.95, v / Vg * 0.95, "black", 1.6))
        code.append(f"\\draw[fill=white] ({bx - 0.07:.2f},{by - 0.07:.2f}) rectangle ({bx + 0.07:.2f},{by + 0.07:.2f});")
        out.append(f"\\newcommand{{\\fourpanel{name}}}{{\n" + "\n".join(code) + "\n}")
    (OUT / "four_systems.tex").write_text("\n".join(out) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- the data table of the stations (appendix)
def write_station_table():
    """Write the station data table."""
    rows = []
    for s in STATIONS:
        td = "--" if s["Td"] is None else str(s["Td"])
        wx = {"": "", "rain-cont": "rain (continuous)", "rain-int": "rain (intermittent)", "thunder-rain": "thunder, rain"}[s["wx"]]
        names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        comp = names[int(round((s["dir"] % 360) / 22.5)) % 16]
        rows.append(f"{s['id']} & {s['lat']:.1f}\\textdegree{{}}N, {-s['lon']:.1f}\\textdegree{{}}W & {s['T']} & {td} & {s['p']:03d} & {s['hpa']:.1f} & {s['sky']} & {comp} {s['kt']} & {wx} \\\\")
    hdr = r"\textbf{\#} & \textbf{Position} & \textbf{Temp.} & \textbf{Dew} & \textbf{Code} & \textbf{hPa} & \textbf{Sky} & \textbf{Wind} & \textbf{Weather}\\"
    head = [r"\begin{longtable}{@{}rlrrrrrll@{}}", r"\toprule", hdr, r"\midrule", r"\endfirsthead", r"\toprule", hdr, r"\midrule", r"\endhead", r"\bottomrule", r"\endfoot"]
    (OUT / "station_table.tex").write_text("\n".join(head + rows + [r"\end{longtable}"]) + "\n", encoding="utf-8")


def write_front_evidence():
    """Write the table of station pairs either side of each front."""
    pairs = {"cold": [(16, 17), (22, 23), (25, 28), (31, 32)], "warm": [(8, 13), (14, 19), (10, 20)]}
    names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    comp = lambda d: names[int(round((d % 360) / 22.5)) % 16]
    rows = []
    for kind, lst in pairs.items():
        for a, b in lst:
            A, B = BYID[a], BYID[b]
            rows.append(f"{kind} & {a} $\\to$ {b} & {A['T']} $\\to$ {B['T']} & {A['Td']} $\\to$ {B['Td']} & {comp(A['dir'])} $\\to$ {comp(B['dir'])} \\\\")
    head = [r"\begin{tabular}{@{}llccc@{}}", r"\toprule",
            r"\textbf{Front} & \textbf{Stations} & \textbf{Temperature (\degF)} & \textbf{Dew point (\degF)} & \textbf{Wind from}\\", r"\midrule"]
    (OUT / "front_evidence.tex").write_text("\n".join(head + rows + [r"\bottomrule", r"\end{tabular}"]) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- symbol tables (Appendix of the source, redrawn)
def write_symbols():
    # sky cover
    """Write the symbol key."""
    items = [(0, "no cloud"), (10, r"$\le 1/10$"), (25, "2--3/10"), (40, "4/10"), (50, "5/10"), (60, "6/10"), (75, "7--8/10"), (90, "9/10"), (100, "10/10 overcast"), ("x", "obscured")]
    out = []
    for i, (pct, label) in enumerate(items):
        x = 24 + (i % 5) * 52
        y = 20 + (i // 5) * 62
        out += sky_code(x, y, 10, pct, 1.2)
        out.append(node(x, y + 24, label, "north", 7.5))
    (OUT / "sym_sky.tex").write_text("\n".join(out) + "\n", encoding="utf-8")
    # wind barbs: staff vertical, barbs to the right
    items = [(0, "calm"), (2, "1--2 kt"), (5, "5 kt"), (10, "10 kt"), (15, "15 kt"), (20, "20 kt"), (25, "25 kt"),
             (30, "30 kt"), (40, "40 kt"), (50, "50 kt"), (60, "60 kt"), (65, "65 kt"), (75, "75 kt"), (105, "105 kt")]
    out = []
    for i, (kt, label) in enumerate(items):
        x = 24 + (i % 7) * 34
        y = 52 + (i // 7) * 82
        out += barb_code(x, y, 0, kt, 38, 1.2, "black", calm_r=7)
        out.append(node(x, y + 8, label, "north", 7.5))
    (OUT / "sym_barbs.tex").write_text("\n".join(out) + "\n", encoding="utf-8")
    # weather symbols
    items = [("rain-int", "intermittent rain"), ("rain-cont", "continuous rain"), ("snow-cont", "continuous snow"), ("drizzle-cont", "continuous drizzle"),
             ("fog", "fog"), ("thunder", "thunder heard"), ("thunder-rain", "thunder with intermittent rain")]
    out = []
    for i, (k, label) in enumerate(items):
        x = 34 + (i % 4) * 66
        y = 26 + (i // 4) * 62
        out += wx_code(x, y, k, 1.8)
        out.append(node(x, y + 28, label, "north", 7.0, extra=",align=center,text width=58pt"))
    (OUT / "sym_wx.tex").write_text("\n".join(out) + "\n", encoding="utf-8")
    # barometric tendency
    names = ["rising, then falling", "rising, then steady", "rising steadily or unsteadily", "falling or steady, then rising", "steady",
             "falling, then rising", "falling, then steady", "falling steadily or unsteadily", "steady or rising, then falling"]
    out = []
    for i, nm in enumerate(names):
        x = 28 + (i % 5) * 62
        y = 24 + (i // 5) * 62
        out += tend_code(x, y, i, 2.2)
        out.append(node(x, y + 20, nm, "north", 7.0, extra=",align=center,text width=56pt"))
    (OUT / "sym_tend.tex").write_text("\n".join(out) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------------------------------- Table 1
TABLE1 = [(-40, 0.189, 0.118, None), (-35, 0.314, 0.195, None), (-30, 0.519, 0.318, None), (-25, 0.807, 0.51, None), (-20, 1.254, 0.784, None),
          (-18, 1.488, 0.931, None), (-16, 1.76, 1.102, None), (-14, 2.076, 1.3, None), (-12, 2.441, 1.529, None), (-10, 2.863, 1.794, None),
          (-8, 3.348, 2.009, 2.099), (-6, 3.906, 2.45, None), (-4, 4.545, 2.852, None), (-2, 5.275, 3.313, None), (0, 6.108, 3.189, 3.84),
          (2, 7.055, 4.439, None), (4, 8.129, 5.12, None), (6, 9.347, 5.894, None), (8, 10.722, 6.771, None), (10, 12.272, 7.762, None),
          (12, 14.017, 8.882, None), (14, 15.977, 10.14, None), (16, 18.173, 11.56, None), (18, 20.63, 13.162, None), (20, 23.373, 14.956, None),
          (22, 26.43, 16.963, None), (24, 29.831, 19.21, None), (26, 33.608, 21.734, None), (28, 37.796, 24.557, None), (30, 42.43, 27.694, None),
          (32, 47.551, 31.213, None), (34, 53.2, 35.134, None), (36, 59.422, 39.502, None), (38, 66.264, 44.381, None), (40, 73.777, 49.815, None)]


def write_table1():
    """Write the plot data of Table 1: saturation vapour pressure and mixing ratio by temperature, with
    the wrong table entries and their corrections marked."""
    es = " ".join(f"({t},{e})" for t, e, w, fix in TABLE1)
    w_ok = " ".join(f"({t},{w})" for t, e, w, fix in TABLE1 if fix is None)
    w_bad = " ".join(f"({t},{w})" for t, e, w, fix in TABLE1 if fix is not None)
    w_fix = " ".join(f"({t},{fix})" for t, e, w, fix in TABLE1 if fix is not None)
    w_all = " ".join(f"({t},{fix if fix else w})" for t, e, w, fix in TABLE1)
    lines = [rf"\newcommand{{\coordsEs}}{{{es}}}", rf"\newcommand{{\coordsW}}{{{w_ok}}}", rf"\newcommand{{\coordsWbad}}{{{w_bad}}}",
             rf"\newcommand{{\coordsWfix}}{{{w_fix}}}", rf"\newcommand{{\coordsWall}}{{{w_all}}}"]
    (OUT / "table1_coords.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")
    rows = []
    for t, e, w, fix in TABLE1:
        if fix is None:
            rows.append(rf"{t} & {e:.3f} & {w:.3f} & \\")
        else:
            rows.append(rf"\rowcolor{{lightred}}{t} & {e:.3f} & {w:.3f} & {fix:.3f} \\")
    hdr = r"\textbf{Temp.\ (\degC)} & $\boldsymbol{e_s}$ \textbf{(mb)} & $\boldsymbol{w_s}$ \textbf{printed (\gkg)} & \textbf{corrected (\gkg)}\\"
    head = [r"\begin{longtable}{@{}rrrr@{}}", r"\caption{Saturation vapour pressure $e_s$ and saturation mixing ratio $w_s$ against temperature.}\\",
            r"\toprule", hdr, r"\midrule", r"\endfirsthead", r"\toprule", hdr, r"\midrule", r"\endhead", r"\bottomrule", r"\endfoot"]
    (OUT / "table1_rows.tex").write_text("\n".join(head + rows + [r"\end{longtable}"]) + "\n", encoding="utf-8")


def write_anatomy_and_demo():
    """Write the station-plot anatomy and the demonstration figure."""
    st = dict(T=45, Td=38, p=147, sky=75, dir=315, kt=20, wx="rain-cont", tend=2, dp=28)
    (OUT / "model_anatomy.tex").write_text("\n".join(station_code(0, 0, st, s=1.0, fs=11.5, upt=1.48)) + "\n", encoding="utf-8")
    # a streamline demonstration: twelve stations (x right, y down), wind from the south-west turning to the west
    def phi(x, y):
        """Wind direction (from, degrees) across the demonstration field."""
        return 225 + 0.68 * x - 0.15 * y                    # direction the wind blows FROM (compass degrees)
    out = []
    for gx in (0, 22, 44, 66):
        for gy in (0, 22, 44):
            out += barb_code(gx, gy, phi(gx, gy), 15, 12, 0.8, "black", calm_r=8)
            out += sky_code(gx, gy, 2.4, 0, 0.8, "black")
    for sy in (0, 22, 44):
        x, y = 0.0, float(sy)
        pts = [(x, y)]
        for _ in range(60):
            f = phi(x, y) * DEG
            x += -math.sin(f) * 1.4
            y += math.cos(f) * 1.4
            pts.append((x, y))
            if x > 74:
                break
        out.append(rf"\draw[streamline,-{{Stealth[length=2.4mm]}}] {path_str(chaikin(pts[::3], 1))};")
    (OUT / "stream_demo.tex").write_text("\n".join(out) + "\n", encoding="utf-8")


if __name__ == "__main__":
    write_states()
    low = write_analysis()
    write_fronts()
    write_stations()
    write_streams()
    write_fig9()
    write_models()
    write_adjustment()
    write_four()
    write_station_table()
    write_front_evidence()
    write_symbols()
    write_table1()
    write_anatomy_and_demo()
    print("low", low)
    print("files:", sorted(p.name for p in OUT.iterdir()))
