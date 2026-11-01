"""Koeppen-Geiger climate classification computed from real monthly climatologies.

Inputs are the University of Delaware station-based air temperature and precipitation
climatology (1981-2010, 0.5 degree, land only).  Land cells that the Delaware product leaves
empty (mainly Antarctica and the Greenland ice sheet) fall back to the NCEP/NCAR 2 m
temperature and GPCP precipitation climatologies.

The decision rules follow Peel, Finlayson and McMahon (2007), Hydrol. Earth Syst. Sci. 11,
1633-1644, with the polar test applied first as in Kottek et al. (2006)::

    E   warmest month < 10 C            ET (tundra, warmest month > 0 C) / EF (ice cap)
    B   P_ann < 10 * P_threshold         BW desert (P_ann <= 5 P_th) / BS steppe; h = hot (T_ann >= 18 C), k = cold
    A   coldest month >= 18 C            Af rainforest / Am monsoon / Aw savanna
    C   0 C < coldest month < 18 C       temperate;  D  coldest month <= 0 C   continental
        second letter  s dry summer, w dry winter, f no dry season
        third letter   a hot summer, b warm summer, c cool summer, d extremely cold winter

The dryness threshold P_th (mm) is 2*T_ann for winter-dominated rain, 2*T_ann + 28 for
summer-dominated rain and 2*T_ann + 14 otherwise (T_ann in degrees C).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..net import log
from . import ncio
from .fields import psl_file
from .pack import PackWriter

# id, code, name, RGB colour (the widely used Koeppen-Geiger map palette)
CLASSES = [
    (1, "Af", "Tropical rainforest", (0, 0, 255)),
    (2, "Am", "Tropical monsoon", (0, 120, 255)),
    (3, "Aw", "Tropical savanna", (70, 170, 250)),
    (4, "BWh", "Hot desert", (255, 0, 0)),
    (5, "BWk", "Cold desert", (255, 150, 150)),
    (6, "BSh", "Hot semi-arid steppe", (245, 165, 0)),
    (7, "BSk", "Cold semi-arid steppe", (255, 220, 100)),
    (8, "Csa", "Mediterranean, hot summer", (255, 255, 0)),
    (9, "Csb", "Mediterranean, warm summer", (200, 200, 0)),
    (10, "Csc", "Mediterranean, cool summer", (150, 150, 0)),
    (11, "Cwa", "Humid subtropical, dry winter", (150, 255, 150)),
    (12, "Cwb", "Subtropical highland, dry winter", (100, 200, 100)),
    (13, "Cwc", "Cold subtropical highland", (50, 150, 50)),
    (14, "Cfa", "Humid subtropical", (200, 255, 80)),
    (15, "Cfb", "Oceanic", (100, 255, 80)),
    (16, "Cfc", "Subpolar oceanic", (50, 200, 0)),
    (17, "Dsa", "Continental, dry hot summer", (255, 0, 255)),
    (18, "Dsb", "Continental, dry warm summer", (200, 0, 200)),
    (19, "Dsc", "Subarctic, dry summer", (150, 50, 150)),
    (20, "Dsd", "Extremely cold subarctic, dry summer", (150, 100, 150)),
    (21, "Dwa", "Continental, dry winter, hot summer", (170, 175, 255)),
    (22, "Dwb", "Continental, dry winter, warm summer", (90, 120, 220)),
    (23, "Dwc", "Subarctic, dry winter", (75, 80, 180)),
    (24, "Dwd", "Extremely cold subarctic, dry winter", (50, 0, 135)),
    (25, "Dfa", "Hot-summer humid continental", (0, 255, 255)),
    (26, "Dfb", "Warm-summer humid continental", (55, 200, 255)),
    (27, "Dfc", "Subarctic", (0, 125, 125)),
    (28, "Dfd", "Extremely cold subarctic", (0, 70, 95)),
    (29, "ET", "Tundra", (178, 178, 178)),
    (30, "EF", "Ice cap", (102, 102, 102)),
]
ID = {code: i for i, code, _, _ in CLASSES}
DAYS = np.array([31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], dtype=np.float32)


def classify(t: np.ndarray, p: np.ndarray, lat: np.ndarray) -> np.ndarray:
    """Vectorised Koeppen-Geiger classification.

    ``t`` is monthly temperature in degC and ``p`` monthly precipitation in mm, both shaped
    (12, ny, nx); ``lat`` is the latitude of each row.  Returns uint8 class ids (0 = no data).
    """
    valid = ~(np.isnan(t).any(axis=0) | np.isnan(p).any(axis=0))
    t = np.nan_to_num(t, nan=0.0)
    p = np.nan_to_num(p, nan=0.0)
    north = (lat > 0)[:, None] * np.ones(t.shape[1:], dtype=bool)

    t_ann = t.mean(axis=0)
    t_hot, t_cold = t.max(axis=0), t.min(axis=0)
    mon10 = (t >= 10).sum(axis=0)
    p_ann = p.sum(axis=0)
    p_dry = p.min(axis=0)

    summer_idx = np.array([3, 4, 5, 6, 7, 8])            # April-September
    winter_idx = np.array([9, 10, 11, 0, 1, 2])          # October-March
    p_n_summer, p_n_winter = p[summer_idx], p[winter_idx]
    p_summer = np.where(north, p_n_summer.sum(axis=0), p_n_winter.sum(axis=0))
    p_winter = np.where(north, p_n_winter.sum(axis=0), p_n_summer.sum(axis=0))
    sum_months = np.where(north[None], p_n_summer, p_n_winter)      # six summer months
    win_months = np.where(north[None], p_n_winter, p_n_summer)
    p_sdry, p_swet = sum_months.min(axis=0), sum_months.max(axis=0)
    p_wdry, p_wwet = win_months.min(axis=0), win_months.max(axis=0)

    with np.errstate(divide="ignore", invalid="ignore"):
        share_winter = np.where(p_ann > 0, p_winter / p_ann, 0.5)
        share_summer = np.where(p_ann > 0, p_summer / p_ann, 0.5)
    p_th = np.where(share_winter >= 0.7, 2 * t_ann,
                    np.where(share_summer >= 0.7, 2 * t_ann + 28, 2 * t_ann + 14))

    out = np.zeros(t_ann.shape, dtype=np.uint8)

    # --- E: polar
    polar = t_hot < 10
    out[polar & (t_hot > 0)] = ID["ET"]
    out[polar & (t_hot <= 0)] = ID["EF"]

    # --- B: dry
    dry = ~polar & (p_ann < 10 * p_th)
    desert = dry & (p_ann <= 5 * p_th)
    hot = t_ann >= 18
    out[desert & hot] = ID["BWh"]
    out[desert & ~hot] = ID["BWk"]
    out[dry & ~desert & hot] = ID["BSh"]
    out[dry & ~desert & ~hot] = ID["BSk"]
    rest = ~polar & ~dry

    # --- A: tropical
    trop = rest & (t_cold >= 18)
    out[trop & (p_dry >= 60)] = ID["Af"]
    out[trop & (p_dry < 60) & (p_ann >= 25 * (100 - p_dry))] = ID["Am"]
    out[trop & (p_dry < 60) & (p_ann < 25 * (100 - p_dry))] = ID["Aw"]

    # --- C and D: temperate and continental
    cd = rest & ~trop
    temperate = cd & (t_cold > 0)
    cont = cd & (t_cold <= 0)
    dry_summer = (p_sdry < 40) & (p_sdry < p_wwet / 3)
    dry_winter = (p_wdry < p_swet / 10) & ~dry_summer
    second = np.where(dry_summer, "s", np.where(dry_winter, "w", "f"))
    hot_summer = t_hot >= 22
    warm_summer = ~hot_summer & (mon10 >= 4)
    very_cold = (t_cold <= -38) & ~hot_summer & ~warm_summer
    third = np.where(hot_summer, "a", np.where(warm_summer, "b", np.where(very_cold, "d", "c")))
    for group, letter in ((temperate, "C"), (cont, "D")):
        for s in "swf":
            for th in "abcd":
                code = f"{letter}{s}{th}"
                if code in ID:
                    out[group & (second == s) & (third == th)] = ID[code]
    out[~valid] = 0
    return out


def build_koppen(cache: Path, pack: PackWriter, landmask: np.ndarray) -> np.ndarray:
    log("Koeppen-Geiger climate classification")
    air_p = psl_file(cache, "udel", "air")
    pre_p = psl_file(cache, "udel", "precip")
    t = ncio.standardise(ncio.read_var(air_p, "air"), ncio.read_axis(air_p, "lat"), ncio.read_axis(air_p, "lon"))
    p = ncio.standardise(ncio.read_var(pre_p, "precip") * 10.0, ncio.read_axis(pre_p, "lat"), ncio.read_axis(pre_p, "lon"))
    lats, lons = t.lats, t.lons

    # land cells at 0.5 degree from the 2048 x 1024 mask
    mh, mw = landmask.shape
    yy = np.clip(((lats + 90.0) / 180.0 * mh).astype(int), 0, mh - 1)
    xx = np.clip(((lons + 180.0) / 360.0 * mw).astype(int), 0, mw - 1)
    land = landmask[yy][:, xx] > 0

    # fallback for land cells the Delaware analysis does not cover
    missing = land & (np.isnan(t.data).any(axis=0) | np.isnan(p.data).any(axis=0))
    if missing.any():
        t2_path = psl_file(cache, "ncep_r1", "t2m")
        t2 = ncio.standardise(ncio.read_var(t2_path, "air") - 273.15, ncio.read_axis(t2_path, "lat"), ncio.read_axis(t2_path, "lon"))
        pr_path = psl_file(cache, "gpcp", "ltm")
        pr = ncio.standardise(ncio.read_var(pr_path, "precip"), ncio.read_axis(pr_path, "lat"), ncio.read_axis(pr_path, "lon"))
        t_fb = ncio.sample_bilinear(t2, lons, lats)
        p_fb = ncio.sample_bilinear(pr, lons, lats) * DAYS[:, None, None]
        t.data = np.where(missing[None], t_fb, t.data)
        p.data = np.where(missing[None], p_fb, p.data)
        log(f"  {int(missing.sum())} land cells filled from NCEP / GPCP (ice sheets and gaps)")

    t.data = np.where(land[None], t.data, np.nan)
    p.data = np.where(land[None], p.data, np.nan)
    classes = classify(t.data, np.clip(p.data, 0, None), lats)

    weights = np.cos(np.deg2rad(lats))[:, None] * np.ones_like(classes, dtype=np.float64)
    land_area = weights[classes > 0].sum()
    table = []
    for cid, code, name, rgb in CLASSES:
        share = float(weights[classes == cid].sum() / land_area * 100.0)
        table.append({"id": cid, "code": code, "name": name, "rgb": list(rgb), "share": round(share, 2)})
    # Grow the classes outwards by up to three cells.  The 0.5 degree analysis and the 1:50
    # million coastline do not agree exactly, so without this a thin gap would show along coasts;
    # the page clips the colours with the accurate land mask instead.
    padded = classes.copy()
    for _ in range(3):
        gaps = padded == 0
        if not gaps.any():
            break
        up = np.roll(padded, 1, axis=0)
        down = np.roll(padded, -1, axis=0)
        left = np.roll(padded, 1, axis=1)
        right = np.roll(padded, -1, axis=1)
        neighbour = np.where(up > 0, up, np.where(down > 0, down, np.where(left > 0, left, right)))
        padded = np.where(gaps, neighbour, padded)
    pack.add_u8("koppen", padded, meta={"lat0": float(lats[0]), "dlat": 0.5, "lon0": float(lons[0]), "dlon": 0.5,
                                         "title": "Koeppen-Geiger climate class (0 = ocean)"})
    pack.add_json("koppen_classes", table)
    top = sorted(table, key=lambda r: -r["share"])[:6]
    log("  largest classes by land area: " + ", ".join(f"{r['code']} {r['share']:.1f}%" for r in top))
    return classes
