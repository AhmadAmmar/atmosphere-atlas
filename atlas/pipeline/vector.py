"""Natural Earth vector data: coastlines, borders, rivers, cities, ocean names and the land mask.

Lines are simplified with the Douglas-Peucker algorithm, rounded to 0.01 degree (about 1 km)
and stored as int16 *deltas* so that gzip can squeeze them.  The land/sea mask is rasterised
from the 1:50 million land polygons and is what lets colour-mapped data layers show crisp,
accurate coastlines even though the underlying model grids are coarse.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from ..config import SOURCES
from ..net import fetch, log
from .pack import PackWriter

MASK_W, MASK_H = 2048, 1024


def load_geojson(cache: Path, name: str) -> dict:
    """A Natural Earth layer as GeoJSON, downloaded if missing."""
    url = SOURCES["natural_earth"].urls[name]
    path = fetch(url, cache / "natural_earth" / Path(url).name, quiet=True)
    return json.loads(path.read_text(encoding="utf-8"))


# ------------------------------------------------------------------------------ geometry
def _perp_distance(p, a, b) -> float:
    """Distance of point p from the line through a and b."""
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))


def simplify(points: list, tolerance: float) -> list:
    """Douglas-Peucker line simplification (iterative, tolerance in degrees)."""
    n = len(points)
    if n < 3 or tolerance <= 0:
        return points
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        i, j = stack.pop()
        far, far_d = -1, 0.0
        a, b = points[i], points[j]
        for k in range(i + 1, j):
            d = _perp_distance(points[k], a, b)
            if d > far_d:
                far, far_d = k, d
        if far_d > tolerance and far != -1:
            keep[far] = True
            stack.append((i, far))
            stack.append((far, j))
    return [p for p, k in zip(points, keep) if k]


def lines_of(geometry: dict) -> list[list]:
    """The coordinate lines of a geometry."""
    t = geometry["type"]
    if t == "LineString":
        return [geometry["coordinates"]]
    if t == "MultiLineString":
        return list(geometry["coordinates"])
    if t == "Polygon":
        return list(geometry["coordinates"])
    if t == "MultiPolygon":
        return [ring for poly in geometry["coordinates"] for ring in poly]
    return []


def polygons_of(geometry: dict) -> list[list[list]]:
    """Return a list of polygons, each a list of rings (exterior first)."""
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return list(geometry["coordinates"])
    return []


def add_lines(pack: PackWriter, name: str, polylines: list[list], *, tolerance: float,
              attrs: list[dict] | None = None) -> None:
    """Store polylines as ``<name>_xy`` (int16 deltas, x100 degrees) and ``<name>_off`` (offsets)."""
    xy: list[int] = []
    offsets = [0]
    for line in polylines:
        pts = simplify([(float(p[0]), float(p[1])) for p in line], tolerance)
        if len(pts) < 2:
            offsets.append(offsets[-1])
            continue
        px = py = 0
        for k, (lon, lat) in enumerate(pts):
            qx, qy = int(round(lon * 100)), int(round(lat * 100))
            if k == 0:
                xy.extend((qx, qy))
            else:
                xy.extend((qx - px, qy - py))
            px, py = qx, qy
        offsets.append(offsets[-1] + len(pts))
    pack.add_i16(f"{name}_xy", np.asarray(xy, dtype=np.int16).reshape(-1, 2), meta={"scale": 0.01, "delta": True})
    pack.add_json(f"{name}_off", offsets)
    if attrs is not None:
        pack.add_json(f"{name}_attrs", attrs)
    log(f"  {name}: {len(polylines)} lines, {len(xy) // 2} vertices after simplification")


# ------------------------------------------------------------------------------ land mask
def rasterise_land(land: dict) -> np.ndarray:
    """Return a (MASK_H, MASK_W) uint8 array, south row first: 255 = land, 0 = ocean."""
    from PIL import Image, ImageDraw
    img = Image.new("L", (MASK_W, MASK_H), 0)
    draw = ImageDraw.Draw(img)

    def px(ring):
        """A ring in mask pixel coordinates."""
        return [((lon + 180.0) / 360.0 * MASK_W, (90.0 - lat) / 180.0 * MASK_H) for lon, lat in ring]

    for feature in land["features"]:
        for poly in polygons_of(feature["geometry"]):
            draw.polygon(px(poly[0]), fill=255)
            for hole in poly[1:]:
                draw.polygon(px(hole), fill=0)
    return np.ascontiguousarray(np.asarray(img)[::-1])


def carve_lakes(mask: np.ndarray, lakes: dict, min_scalerank: int = 1) -> np.ndarray:
    """Great Lakes, Victoria, Baikal and other large lakes become water in the mask."""
    from PIL import Image, ImageDraw
    img = Image.fromarray(mask[::-1].copy())
    draw = ImageDraw.Draw(img)

    def px(ring):
        """A ring in mask pixel coordinates."""
        return [((lon + 180.0) / 360.0 * MASK_W, (90.0 - lat) / 180.0 * MASK_H) for lon, lat in ring]

    for feature in lakes["features"]:
        if feature["properties"].get("scalerank", 9) > min_scalerank:
            continue
        for poly in polygons_of(feature["geometry"]):
            draw.polygon(px(poly[0]), fill=0)
    return np.ascontiguousarray(np.asarray(img)[::-1])


# ------------------------------------------------------------------------------ labels
def _ring_centroid(ring: list) -> tuple[float, float, float]:
    """Signed area and centroid of a ring (shoelace formula)."""
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring[:-1], ring[1:]):
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(a) < 1e-9:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys), 0.0
    return cx / (3 * a), cy / (3 * a), abs(a) / 2


def marine_labels(marine: dict) -> list[dict]:
    """One label point (largest polygon centroid) for each named ocean, sea or gulf."""
    out = []
    for f in marine["features"]:
        props = f["properties"]
        name = props.get("name")
        if not name:
            continue
        best = None
        for poly in polygons_of(f["geometry"]):
            cx, cy, area = _ring_centroid(poly[0])
            if best is None or area > best[2]:
                best = (cx, cy, area)
        if best is None:
            continue
        out.append({"n": name, "x": round(best[0], 2), "y": round(best[1], 2),
                    "k": props.get("featurecla", "").lower(), "r": int(props.get("scalerank", 5)),
                    "a": round(best[2], 1)})
    return out


def pick_places(places: dict) -> list[dict]:
    """Large cities and national capitals, with the fields the page needs."""
    out = []
    for f in places["features"]:
        p = f["properties"]
        pop = int(p.get("pop_max") or 0)
        capital = bool(p.get("adm0cap"))
        if pop < 1_500_000 and not (capital and pop >= 400_000):
            continue
        lon, lat = f["geometry"]["coordinates"][:2]
        out.append({"n": p["name"], "c": p.get("adm0name", ""), "x": round(lon, 3), "y": round(lat, 3),
                    "p": int(round(pop / 1000)), "k": 1 if capital else 0})
    out.sort(key=lambda r: -r["p"])
    return out


# ------------------------------------------------------------------------------ main entry
def build_vectors(cache: Path, pack: PackWriter) -> np.ndarray:
    """Coastlines, borders, lakes and rivers for the pack, and the land mask."""
    log("coastlines, borders, lakes and rivers")
    coast = load_geojson(cache, "coast")
    add_lines(pack, "coast", [ln for f in coast["features"] for ln in lines_of(f["geometry"])], tolerance=0.03)

    borders = load_geojson(cache, "borders")
    add_lines(pack, "borders", [ln for f in borders["features"] for ln in lines_of(f["geometry"])], tolerance=0.05)

    lakes = load_geojson(cache, "lakes")
    big = [f for f in lakes["features"] if f["properties"].get("scalerank", 9) <= 2]
    add_lines(pack, "lakes", [ln for f in big for ln in lines_of(f["geometry"])], tolerance=0.04)

    rivers = load_geojson(cache, "rivers")
    chosen, attrs = [], []
    for f in rivers["features"]:
        props = f["properties"]
        if props.get("scalerank", 9) > 6 or "Lake" in (props.get("featurecla") or ""):
            continue
        for ln in lines_of(f["geometry"]):
            chosen.append(ln)
            attrs.append({"n": props.get("name") or "", "r": int(props.get("scalerank", 6))})
    add_lines(pack, "rivers", chosen, tolerance=0.05, attrs=attrs)

    log("land / sea mask")
    land = load_geojson(cache, "land")
    mask = rasterise_land(land)
    mask = carve_lakes(mask, lakes)
    pack.add_u8("landmask", mask, meta={"w": MASK_W, "h": MASK_H, "title": "Land (255) and ocean (0), south row first"})
    weights = np.cos(np.deg2rad(-90.0 + (np.arange(MASK_H) + 0.5) * 180.0 / MASK_H))[:, None]
    land_share = float((weights * (mask > 0)).sum() / (weights * np.ones_like(mask)).sum())
    log(f"  land covers {land_share * 100:.1f}% of the globe by area (the Earth: about 29%)")

    log("place and ocean names")
    pack.add_json("places", pick_places(load_geojson(cache, "places")))
    pack.add_json("marine", marine_labels(load_geojson(cache, "marine")))
    return mask
