"""Tropical cyclones from the IBTrACS best-track archive.

Every storm that reached tropical-storm strength (34 kt) since 1980 is resampled to a regular
six-hour series and packed as compact arrays so the page can draw thousands of tracks, filter
them by season, basin or intensity, and replay a whole season.  A short list of historic
storms (the "hall of fame") is stored with its full intensity history.  Summary statistics
(counts, seasonality, accumulated cyclone energy, pressure-wind relation, rapid
intensification) are computed from the same data, so the charts in the page are real.

Wind speeds are 1-minute sustained winds in knots from the US agencies (NHC / JTWC) where
available, falling back to the reporting WMO centre otherwise.
"""
from __future__ import annotations

import csv
import datetime as dt
from collections import defaultdict
from pathlib import Path

import numpy as np

from ..config import SOURCES
from ..net import fetch, log
from .pack import PackWriter

BASINS = ["NA", "EP", "WP", "NI", "SI", "SP", "SA"]
FIRST_SEASON = 1980
CLIM_START, CLIM_END = 1991, 2020           # reference period for climatological statistics
KT = 0.514444                               # knots -> m/s

# Storms shown in the hall of fame: (name, IBTrACS season, basin code).  Southern Hemisphere
# seasons run July-June and are labelled by the year in which they end.
HALL_OF_FAME = [
    ("TIP", 1979, "WP"), ("NINA", 1975, "WP"), ("HAIYAN", 2013, "WP"), ("MANGKHUT", 2018, "WP"),
    ("HAGIBIS", 2019, "WP"), ("MAWAR", 2023, "WP"), ("YAGI", 2024, "WP"),
    ("CAMILLE", 1969, "NA"), ("GILBERT", 1988, "NA"), ("ANDREW", 1992, "NA"), ("MITCH", 1998, "NA"),
    ("KATRINA", 2005, "NA"), ("WILMA", 2005, "NA"), ("SANDY", 2012, "NA"), ("IRMA", 2017, "NA"),
    ("MARIA", 2017, "NA"), ("HARVEY", 2017, "NA"), ("DORIAN", 2019, "NA"), ("IAN", 2022, "NA"),
    ("BERYL", 2024, "NA"), ("HELENE", 2024, "NA"), ("MILTON", 2024, "NA"), ("MELISSA", 2025, "NA"),
    ("LINDA", 1997, "EP"), ("JOHN", 1994, "EP"), ("PATRICIA", 2015, "EP"), ("OTIS", 2023, "EP"),
    ("NARGIS", 2008, "NI"), ("AMPHAN", 2020, "NI"), ("MOCHA", 2023, "NI"),
    ("OLIVIA", 1996, "SI"), ("IDAI", 2019, "SI"), ("FREDDY", 2023, "SI"),
    ("TRACY", 1975, "SP"), ("YASI", 2011, "SP"), ("WINSTON", 2016, "SP"),
]


def category(wind_kt: float) -> int:
    """Saffir-Simpson category 0..5 (0 = below hurricane strength)."""
    if wind_kt >= 137:
        return 5
    if wind_kt >= 113:
        return 4
    if wind_kt >= 96:
        return 3
    if wind_kt >= 83:
        return 2
    if wind_kt >= 64:
        return 1
    return 0


def _num(text: str) -> float:
    """A number from text, NaN if blank or invalid."""
    try:
        v = float(text)
    except ValueError:
        return float("nan")
    return v if v > -900 else float("nan")


def _step(iso: str) -> int:
    """Six-hourly step counter since year 1 for 'YYYY-MM-DD HH:MM:SS'."""
    y, m, d, h = int(iso[0:4]), int(iso[5:7]), int(iso[8:10]), int(iso[11:13])
    return dt.date(y, m, d).toordinal() * 4 + h // 6


def read_tracks(path: Path) -> dict[str, dict]:
    """Parse the IBTrACS CSV into one record per storm (main-track synoptic points only)."""
    storms: dict[str, dict] = {}
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        next(reader)                                      # units row
        col = {name: i for i, name in enumerate(header)}
        need = ["SID", "SEASON", "BASIN", "NAME", "ISO_TIME", "NATURE", "LAT", "LON", "WMO_WIND", "WMO_PRES",
                "USA_WIND", "USA_PRES", "TRACK_TYPE"]
        idx = [col[c] for c in need]
        rows = 0
        for row in reader:
            rows += 1
            sid, season, basin, name, iso, nature, lat, lon, wwind, wpres, uwind, upres, ttype = (row[i] for i in idx)
            if ttype not in ("main", "PROVISIONAL", "PROVISIONAL_main"):
                continue
            if not iso or iso[14:16] != "00" or int(iso[11:13]) % 6:
                continue
            la, lo = _num(lat), _num(lon)
            if la != la or lo != lo:
                continue
            wind = _num(uwind)
            if wind != wind:
                wind = _num(wwind)
            pres = _num(upres)
            if pres != pres:
                pres = _num(wpres)
            s = storms.get(sid)
            if s is None:
                s = storms[sid] = {"season": int(season), "basin": basin, "name": name.strip(),
                                   "steps": [], "lat": [], "lon": [], "wind": [], "pres": [], "nature": []}
            s["steps"].append(_step(iso))
            s["lat"].append(la)
            s["lon"].append(lo)
            s["wind"].append(wind)
            s["pres"].append(pres)
            s["nature"].append(nature)
    log(f"  read {rows:,} observations for {len(storms):,} storms")
    return storms


def resample(s: dict) -> dict | None:
    """Regular six-hour series with unwrapped longitude; None for unusable tracks."""
    steps = np.asarray(s["steps"], dtype=np.int64)
    if steps.size < 2:
        return None
    order = np.argsort(steps, kind="stable")
    steps = steps[order]
    keep = np.concatenate([[True], np.diff(steps) > 0])
    steps = steps[keep]
    lat = np.asarray(s["lat"], dtype=np.float64)[order][keep]
    lon = np.asarray(s["lon"], dtype=np.float64)[order][keep]
    wind = np.asarray(s["wind"], dtype=np.float64)[order][keep]
    pres = np.asarray(s["pres"], dtype=np.float64)[order][keep]
    lon = np.rad2deg(np.unwrap(np.deg2rad(lon)))
    full = np.arange(steps[0], steps[-1] + 1)
    out = {"step0": int(steps[0]), "lat": np.interp(full, steps, lat), "lon": np.interp(full, steps, lon)}
    for key, arr in (("wind", wind), ("pres", pres)):
        ok = ~np.isnan(arr)
        out[key] = np.interp(full, steps[ok], arr[ok]) if ok.sum() >= 2 else np.full(full.shape, np.nan)
        if ok.sum() >= 2:        # do not invent values far outside the observed span
            out[key][full < steps[ok][0]] = np.nan
            out[key][full > steps[ok][-1]] = np.nan
    return out


def ace(wind: np.ndarray) -> float:
    """Accumulated cyclone energy: 1e-4 x sum of squared wind (kt) at fixes of 34 kt or more."""
    w = wind[np.isfinite(wind) & (wind >= 34)]
    return float((w ** 2).sum() * 1e-4)


def rapid_intensification(wind: np.ndarray) -> float:
    """Largest 24-hour wind gain (kt) in a six-hourly series."""
    if wind.size < 5:
        return 0.0
    w = np.where(np.isfinite(wind), wind, 0.0)
    return float(max(0.0, (w[4:] - w[:-4]).max()))


def build_storms(cache: Path, pack: PackWriter) -> dict:
    """IBTrACS tropical cyclone tracks packed for the atlas, with statistics."""
    log("IBTrACS tropical cyclone best tracks")
    path = fetch(SOURCES["ibtracs"].urls["all"], cache / "ibtracs" / "ibtracs.ALL.list.v04r01.csv")
    raw = read_tracks(path)

    recent = None
    try:
        recent_path = fetch(SOURCES["ibtracs"].urls["recent"], cache / "ibtracs" / "ibtracs.last3years.list.v04r01.csv",
                            force=True, quiet=True)
        recent = read_tracks(recent_path)
        for sid, s in recent.items():       # newer data supersede the archive for recent storms
            raw[sid] = s
        log(f"  merged the rolling three-year file ({len(recent)} storms)")
    except Exception as exc:                # offline or file moved: the archive alone is still valid
        log(f"  rolling three-year file skipped ({exc})")

    tracks = []                              # kept for the page: seasons >= FIRST_SEASON, ever >= 34 kt
    fame_pool: dict[tuple, tuple] = {}
    for sid, s in raw.items():
        r = resample(s)
        if r is None:
            continue
        peak = np.nanmax(r["wind"]) if np.isfinite(r["wind"]).any() else np.nan
        rec = {"sid": sid, "name": s["name"], "season": s["season"], "basin": s["basin"], **r, "peak": peak}
        key = (s["name"].upper(), s["season"])
        if key in {(n, y) for n, y, _ in HALL_OF_FAME} and np.isfinite(peak):
            old = fame_pool.get(key)
            if old is None or old[1]["peak"] < peak:
                fame_pool[key] = (sid, rec)
        if s["season"] >= FIRST_SEASON and np.isfinite(peak) and peak >= 34:
            tracks.append(rec)
    tracks.sort(key=lambda t: (t["season"], t["step0"]))
    last_season = max(t["season"] for t in tracks)
    log(f"  {len(tracks):,} storms of tropical-storm strength or more, seasons {FIRST_SEASON}-{last_season}")

    # ------------------------------------------------------------------ packed track arrays
    lon_all, lat_all, wnd_all = [], [], []
    offsets = [0]
    meta = []
    for t in tracks:
        n = len(t["lat"])
        lon_all.append(t["lon"])
        lat_all.append(t["lat"])
        wnd_all.append(np.nan_to_num(t["wind"], nan=0.0))
        offsets.append(offsets[-1] + n)
        year_start = dt.date(dt.date.fromordinal(t["step0"] // 4).year, 1, 1).toordinal() * 4
        genesis = np.argmax(np.nan_to_num(t["wind"], nan=0.0) >= 34)
        meta.append([t["name"] or "UNNAMED", t["season"], BASINS.index(t["basin"]) if t["basin"] in BASINS else 0,
                     int(t["step0"] - year_start), int(round(t["peak"])),
                     int(round(np.nanmin(t["pres"]))) if np.isfinite(t["pres"]).any() else 0, int(genesis)])
    lon = np.concatenate(lon_all)
    lat = np.concatenate(lat_all)
    wnd = np.concatenate(wnd_all)

    def quant_delta(values: np.ndarray, off: list[int]) -> np.ndarray:
        """Values in tenths, delta-coded within each track (offsets), as 16-bit integers."""
        q = np.rint(values * 10).astype(np.int32)
        d = q.copy()
        for a, b in zip(off[:-1], off[1:]):
            d[a + 1:b] = q[a + 1:b] - q[a:b - 1]
        return d.astype(np.int16)

    pack.add_i16("tc_lon", quant_delta(lon, offsets), meta={"scale": 0.1, "delta": True})
    pack.add_i16("tc_lat", quant_delta(lat, offsets), meta={"scale": 0.1, "delta": True})
    pack.add_u8("tc_wind", np.clip(np.rint(wnd), 0, 255), meta={"unit": "kt"})
    pack.add_json("tc_off", offsets)
    pack.add_json("tc_meta", {"fields": ["name", "season", "basin", "startStep", "peakKt", "minHpa", "genesisIdx"],
                              "basins": BASINS, "stepHours": 6, "rows": meta})
    log(f"  packed {len(tracks):,} tracks, {len(lon):,} six-hourly points")

    # ------------------------------------------------------------------ hall of fame
    fame = []
    for name, season, basin in HALL_OF_FAME:
        item = fame_pool.get((name, season))
        if item is None:
            log(f"  hall-of-fame storm {name} {season} not found")
            continue
        sid, rec = item
        step_hours = np.arange(len(rec["lat"])) * 6
        date0 = dt.datetime.combine(dt.date.fromordinal(rec["step0"] // 4), dt.time(0)) + dt.timedelta(hours=6 * (rec["step0"] % 4))
        pres = np.where(np.isfinite(rec["pres"]), rec["pres"], 0)
        fame.append({
            "sid": sid, "name": name.title(), "season": season, "basin": rec["basin"],
            "start": date0.strftime("%Y-%m-%d %H:%M"),
            "peakKt": int(round(np.nanmax(rec["wind"]))),
            "minHpa": int(round(pres[pres > 0].min())) if (pres > 0).any() else 0,
            "ace": round(ace(rec["wind"]), 1),
            "track": [[round(float(lo), 2), round(float(la), 2), int(round(w)) if w == w else 0, int(round(p))]
                      for lo, la, w, p in zip(rec["lon"], rec["lat"], rec["wind"], pres)],
            "hours": [int(h) for h in step_hours][:1] + [int(len(step_hours) * 6)],
        })
        log(f"  fame: {name.title():<9} {season} {rec['basin']}  peak {fame[-1]['peakKt']} kt, "
            f"min {fame[-1]['minHpa']} hPa, {len(rec['lat'])} points")
    pack.add_json("tc_fame", fame)

    # ------------------------------------------------------------------ statistics
    stats = storm_statistics(tracks, last_season)
    pack.add_json("tc_stats", stats)
    return stats


def storm_statistics(tracks: list[dict], last_season: int) -> dict:
    """Storm counts, hurricanes, major hurricanes and ACE by basin and season."""
    per_basin_year = defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0.0]))   # basin -> season -> counts
    month_counts = defaultdict(lambda: np.zeros(12))
    ri_count = defaultdict(lambda: [0, 0])
    pw_pairs = []
    cat_counts = np.zeros(6, dtype=int)
    for t in tracks:
        basin = t["basin"]
        peak = t["peak"]
        row = per_basin_year[basin][t["season"]]
        row[0] += 1
        row[1] += peak >= 64
        row[2] += peak >= 96
        row[3] += ace(t["wind"])
        if CLIM_START <= t["season"] <= CLIM_END:
            gen = int(np.argmax(np.nan_to_num(t["wind"], nan=0.0) >= 34))
            ordinal = (t["step0"] + gen) // 4
            month_counts[basin][dt.date.fromordinal(ordinal).month - 1] += 1
            cat_counts[category(peak)] += 1
        if peak >= 64:
            ri_count[basin][0] += 1
            ri_count[basin][1] += rapid_intensification(t["wind"]) >= 30
        ok = np.isfinite(t["wind"]) & np.isfinite(t["pres"]) & (t["wind"] >= 25)
        if ok.any() and t["season"] >= 1990:
            idx = np.where(ok)[0][::4]
            pw_pairs.extend((float(t["wind"][i]), float(t["pres"][i])) for i in idx)

    seasons = list(range(FIRST_SEASON, last_season + 1))
    by_basin = {}
    for basin in BASINS:
        years = per_basin_year[basin]
        arr = np.array([years[y] if y in years else [0, 0, 0, 0.0] for y in seasons], dtype=float)
        clim = np.array([years[y] if y in years else [0, 0, 0, 0.0] for y in range(CLIM_START, CLIM_END + 1)], dtype=float)
        by_basin[basin] = {
            "storms": [int(x) for x in arr[:, 0]], "hurricanes": [int(x) for x in arr[:, 1]],
            "major": [int(x) for x in arr[:, 2]], "ace": [round(float(x), 1) for x in arr[:, 3]],
            "mean": {"storms": round(float(clim[:, 0].mean()), 1), "hurricanes": round(float(clim[:, 1].mean()), 1),
                     "major": round(float(clim[:, 2].mean()), 1), "ace": round(float(clim[:, 3].mean()), 1)},
            "monthly": [round(float(x) / (CLIM_END - CLIM_START + 1), 2) for x in month_counts[basin]],
            "riShare": round(100.0 * ri_count[basin][1] / max(1, ri_count[basin][0]), 1),
        }
    pairs = np.array(pw_pairs)
    rng = np.random.default_rng(7)
    take = rng.choice(len(pairs), size=min(2500, len(pairs)), replace=False)
    sample = pairs[take]
    return {
        "seasons": [seasons[0], seasons[-1]], "climPeriod": [CLIM_START, CLIM_END], "basins": BASINS,
        "byBasin": by_basin, "categoryCounts": [int(x) for x in cat_counts],
        "pressureWind": {"wind": [int(round(w)) for w in sample[:, 0]], "pres": [int(round(p)) for p in sample[:, 1]]},
    }
