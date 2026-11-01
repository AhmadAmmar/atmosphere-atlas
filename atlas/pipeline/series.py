"""Observed time series: climate indices, global temperature, CO2, sea ice, sea level and the AMOC.

Everything is converted to plain monthly (or annual) arrays with ``null`` for gaps, plus a few
derived statistics (ENSO events, trends, regime changes) that the explanations quote.  The
numbers in the page are therefore whatever the source agencies published at download time.
"""
from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path

import numpy as np

from ..config import SOURCES
from ..net import fetch, log
from . import ncio


def _clean(values, ndigits: int = 2) -> list:
    out = []
    for v in values:
        out.append(None if v is None or not np.isfinite(v) else round(float(v), ndigits))
    return out


def fetch_series_file(cache: Path, url: str, name: str) -> Path:
    return fetch(url, cache / "series" / name, quiet=True)


# ------------------------------------------------------------------------------ PSL .data files
def parse_psl_data(path: Path) -> tuple[int, np.ndarray]:
    """Read a NOAA PSL ``.data`` index file: returns (first_year, array[years, 12])."""
    lines = [ln.rstrip("\n") for ln in path.read_text(encoding="utf-8", errors="replace").splitlines()]
    first = lines[0].split()
    y0, y1 = int(first[0]), int(first[1])
    rows, flag = [], None
    for ln in lines[1:]:
        parts = ln.split()
        if len(rows) < (y1 - y0 + 1) and len(parts) == 13:
            rows.append([float(x) for x in parts[1:]])
        elif len(parts) == 1 and flag is None and len(rows) == (y1 - y0 + 1):
            try:
                flag = float(parts[0])
            except ValueError:
                pass
    arr = np.asarray(rows, dtype=float)
    if flag is not None:
        arr[np.isclose(arr, flag)] = np.nan
    arr[arr <= -99] = np.nan
    return y0, arr


def monthly_index(cache: Path, key: str, name: str) -> dict:
    y0, arr = parse_psl_data(fetch_series_file(cache, SOURCES["enso_indices"].urls[key], f"{key}.data"))
    flat = arr.reshape(-1)
    last = np.where(np.isfinite(flat))[0]
    flat = flat[:last[-1] + 1]
    first = int(np.where(np.isfinite(flat))[0][0])
    return {"name": name, "start": [y0 + first // 12, first % 12 + 1], "values": _clean(flat[first:], 3)}


# ------------------------------------------------------------------------------ ENSO
SEASON_CENTRE = {"DJF": 1, "JFM": 2, "FMA": 3, "MAM": 4, "AMJ": 5, "MJJ": 6, "JJA": 7, "JAS": 8, "ASO": 9, "SON": 10,
                 "OND": 11, "NDJ": 12}


def parse_oni(path: Path) -> tuple[list[tuple[int, int]], np.ndarray]:
    months, vals = [], []
    for ln in path.read_text(encoding="utf-8").splitlines()[1:]:
        parts = ln.split()
        if len(parts) < 4 or parts[0] not in SEASON_CENTRE:
            continue
        year = int(parts[1])
        month = SEASON_CENTRE[parts[0]]
        if parts[0] == "NDJ":          # centred on December of the printed year
            pass
        months.append((year, month))
        vals.append(float(parts[3]))
    return months, np.asarray(vals)


def enso_events(months: list[tuple[int, int]], oni: np.ndarray) -> list[dict]:
    """El Nino / La Nina episodes: five or more consecutive overlapping seasons at or beyond +/-0.5 C."""
    events = []
    n = len(oni)
    for sign, label in ((1, "El Nino"), (-1, "La Nina")):
        i = 0
        while i < n:
            if sign * oni[i] >= 0.5:
                j = i
                while j + 1 < n and sign * oni[j + 1] >= 0.5:
                    j += 1
                if j - i + 1 >= 5:
                    k = i + int(np.argmax(sign * oni[i:j + 1]))
                    peak = float(oni[k])
                    strength = ("very strong" if abs(peak) >= 2.0 else "strong" if abs(peak) >= 1.5
                                else "moderate" if abs(peak) >= 1.0 else "weak")
                    events.append({"type": label, "start": list(months[i]), "end": list(months[j]),
                                   "peak": round(peak, 2), "peakMonth": list(months[k]), "strength": strength,
                                   "ongoing": bool(j == n - 1)})
                i = j + 1
            else:
                i += 1
    events.sort(key=lambda e: tuple(e["start"]))
    return events


def build_enso(cache: Path) -> dict:
    months, oni = parse_oni(fetch_series_file(cache, SOURCES["enso_indices"].urls["oni"], "oni.txt"))
    events = enso_events(months, oni)
    return {"oni": {"name": "Oceanic Nino Index", "start": list(months[0]), "values": _clean(oni, 2),
                    "latest": {"month": list(months[-1]), "value": round(float(oni[-1]), 2)}},
            "events": events}


# ------------------------------------------------------------------------------ climate change series
def build_gistemp(cache: Path) -> dict:
    path = fetch_series_file(cache, SOURCES["gistemp"].urls["global"], "gistemp.csv")
    rows = list(csv.reader(path.read_text(encoding="utf-8").splitlines()))
    header = rows[1]
    years, annual, monthly = [], [], []
    for r in rows[2:]:
        if not r or not r[0].isdigit():
            continue
        years.append(int(r[0]))
        vals = [float(x) if x not in ("***", "") else np.nan for x in r[1:13]]
        monthly.extend(vals)
        annual.append(float(r[header.index("J-D")]) if r[header.index("J-D")] not in ("***", "") else np.nan)
    monthly = np.asarray(monthly)
    last = np.where(np.isfinite(monthly))[0][-1]
    return {"baseline": "1951-1980", "years": years, "annual": _clean(annual, 2),
            "monthlyStart": years[0], "monthly": _clean(monthly[:last + 1], 2)}


def build_co2(cache: Path) -> dict:
    path = fetch_series_file(cache, SOURCES["mauna_loa"].urls["monthly"], "co2.csv")
    start, avg, trend = None, [], []
    for ln in path.read_text(encoding="utf-8").splitlines():
        if ln.startswith("#") or not ln.strip() or ln.lower().startswith("year"):
            continue
        p = ln.split(",")
        y, m = int(p[0]), int(p[1])
        if start is None:
            start = [y, m]
        avg.append(float(p[3]) if float(p[3]) > 0 else np.nan)
        trend.append(float(p[4]) if float(p[4]) > 0 else np.nan)
    return {"start": start, "monthly": _clean(avg, 2), "trend": _clean(trend, 2)}


def build_ice_cores(cache: Path) -> dict:
    """800,000 years of Antarctic temperature (EPICA Dome C) and carbon dioxide, averaged into 1,000-year bins."""
    co2_age, co2_val = [], []
    for ln in fetch_series_file(cache, SOURCES["icecores"].urls["co2"], "icecore_co2.txt").read_text(encoding="utf-8-sig").splitlines():
        if ln.startswith("#") or not ln.strip() or ln.startswith("age"):
            continue
        p = ln.split()
        co2_age.append(float(p[0]))
        co2_val.append(float(p[1]))
    t_age, t_val = [], []
    started = False
    for ln in fetch_series_file(cache, SOURCES["icecores"].urls["temp"], "icecore_temp.txt").read_text(encoding="utf-8", errors="replace").splitlines():
        p = ln.split()
        if not started:
            started = len(p) == 5 and p[0] == "Bag"
            continue
        if len(p) == 5:
            try:
                t_age.append(float(p[2]))
                t_val.append(float(p[4]))
            except ValueError:
                continue

    def binned(age: list[float], val: list[float], n: int = 800) -> list:
        sums, counts = np.zeros(n), np.zeros(n)
        for a, v in zip(age, val):
            k = int(a // 1000)
            if 0 <= k < n:
                sums[k] += v
                counts[k] += 1
        out = np.where(counts > 0, sums / np.maximum(counts, 1), np.nan)
        have = np.where(np.isfinite(out))[0]
        if have.size > 1:                                  # bins with no sample: join the neighbouring ones with a straight line
            gap = np.arange(have[0], have[-1] + 1)
            out[gap] = np.interp(gap, have, out[have])
        return _clean(out, 2)

    return {"binYears": 1000, "co2": binned(co2_age, co2_val), "temp": binned(t_age, t_val),
            "title": "Antarctic ice cores: EPICA Dome C temperature (difference from the last 1,000 years) and Antarctic CO2 composite"}


def build_sea_ice(cache: Path) -> dict:
    out = {}
    for hemi, key in (("north", "north"), ("south", "south")):
        path = fetch_series_file(cache, SOURCES["nsidc"].urls[key], f"{hemi}_ice.csv")
        sums: dict[tuple[int, int], list[float]] = {}
        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.reader(fh)
            next(reader)
            next(reader)
            for r in reader:
                try:
                    y, m, d, ext = int(r[0]), int(r[1]), int(r[2]), float(r[3])
                except ValueError:
                    continue
                sums.setdefault((y, m), []).append(ext)
        years = sorted({y for y, _ in sums})
        years = [y for y in years if y >= 1979]
        table = []
        for y in years:
            row = []
            for m in range(1, 13):
                vals = sums.get((y, m), [])
                row.append(round(float(np.mean(vals)), 3) if len(vals) >= 10 else None)
            table.append(row)
        out[hemi] = {"years": years, "monthly": table}
    return out


def build_sea_level(cache: Path) -> dict:
    path = fetch_series_file(cache, SOURCES["sea_level"].urls["gmsl"], "sea_level.csv")
    t, v = [], []
    for ln in path.read_text(encoding="utf-8").splitlines():
        if ln.startswith("#") or ln.startswith("year") or not ln.strip():
            continue
        p = ln.split(",")
        vals = [x for x in p[1:] if x.strip()]
        if not vals:
            continue
        t.append(float(p[0]))
        v.append(float(vals[0]))
    t, v = np.asarray(t), np.asarray(v)
    base = v[t < t[0] + 1.0].mean()
    v = v - base
    bins: dict[tuple[int, int], list[float]] = {}
    for ti, vi in zip(t, v):
        y = int(ti)
        m = min(11, int((ti - y) * 12))
        bins.setdefault((y, m + 1), []).append(vi)
    keys = sorted(bins)
    first = keys[0]
    n = (keys[-1][0] - first[0]) * 12 + keys[-1][1] - first[1] + 1
    monthly = np.full(n, np.nan)
    for (y, m), vals in bins.items():
        monthly[(y - first[0]) * 12 + m - first[1]] = np.mean(vals)
    ok = np.isfinite(monthly)
    x = np.arange(n) / 12.0
    coef1 = np.polyfit(x[ok], monthly[ok], 1)
    coef2 = np.polyfit(x[ok], monthly[ok], 2)
    return {"start": list(first), "monthly": _clean(monthly, 1), "trendMmPerYear": round(float(coef1[0]), 2),
            "accelerationMmPerYear2": round(float(2 * coef2[0]), 3), "riseMm": round(float(monthly[ok][-12:].mean()), 1),
            "baseline": "first year of the record (1993)"}


# ------------------------------------------------------------------------------ AMOC
def build_rapid(cache: Path) -> dict:
    path = fetch_series_file(cache, SOURCES["rapid"].urls["transports"], "rapid_moc_transports.nc")
    days = ncio.read_axis(path, "time")
    fields = {"amoc": "moc_mar_hc10", "floridaCurrent": "t_gs10", "ekman": "t_ek10", "interior": "t_umo10",
              "thermocline": "t_therm10", "upperNADW": "t_ud10", "lowerNADW": "t_ld10"}
    origin = dt.datetime(2004, 4, 1)
    dates = [origin + dt.timedelta(days=float(d) - 1.0) for d in days]
    ym = np.array([d.year * 12 + d.month - 1 for d in dates])
    first, last = ym[0], ym[-1]
    out = {"start": [first // 12, first % 12 + 1]}
    for key, var in fields.items():
        v = ncio.read_var(path, var).astype(float)
        monthly = np.array([np.nanmean(v[ym == m]) if (ym == m).any() else np.nan for m in range(first, last + 1)])
        out[key] = _clean(monthly, 2)
    amoc = ncio.read_var(path, "moc_mar_hc10").astype(float)
    year_frac = np.array([d.year + (d.timetuple().tm_yday - 1) / 365.25 for d in dates])
    early = amoc[(year_frac >= 2004.25) & (year_frac < 2008.25)]
    late = amoc[(year_frac >= 2008.25)]
    first_half = amoc[year_frac < 2014.25]
    second_half = amoc[year_frac >= 2014.25]
    out["stats"] = {
        "mean": round(float(np.nanmean(amoc)), 2),
        "mean2004to2008": round(float(np.nanmean(early)), 2),
        "mean2008onward": round(float(np.nanmean(late)), 2),
        "meanFirstDecade": round(float(np.nanmean(first_half)), 2),
        "meanSecondDecade": round(float(np.nanmean(second_half)), 2),
        "floridaCurrentMean": round(float(np.nanmean(ncio.read_var(path, "t_gs10"))), 2),
        "ekmanMean": round(float(np.nanmean(ncio.read_var(path, "t_ek10"))), 2),
        "interiorMean": round(float(np.nanmean(ncio.read_var(path, "t_umo10"))), 2),
        "min": round(float(np.nanmin(amoc)), 1), "max": round(float(np.nanmax(amoc)), 1),
        "end": [dates[-1].year, dates[-1].month],
    }
    return out


# ------------------------------------------------------------------------------ main entry
def build_series(cache: Path) -> dict:
    log("time series")
    indices = {
        "nino34": monthly_index(cache, "nino34", "Nino 3.4 sea-surface temperature anomaly (degC)"),
        "soi": monthly_index(cache, "soi", "Southern Oscillation Index (standardised)"),
        "nao": monthly_index(cache, "nao", "North Atlantic Oscillation index"),
        "ao": monthly_index(cache, "ao", "Arctic Oscillation index"),
        "aao": monthly_index(cache, "aao", "Antarctic Oscillation (Southern Annular Mode) index"),
        "pdo": monthly_index(cache, "pdo", "Pacific Decadal Oscillation index"),
        "amo": monthly_index(cache, "amo", "Atlantic Multidecadal Oscillation index (detrended)"),
        "pna": monthly_index(cache, "pna", "Pacific-North American pattern index"),
        "qbo": monthly_index(cache, "qbo", "Quasi-Biennial Oscillation: 30 hPa equatorial zonal wind (m/s)"),
        "dmi": monthly_index(cache, "dmi", "Indian Ocean Dipole: Dipole Mode Index from HadISST (degC)"),
    }
    enso = build_enso(cache)
    result = {
        "indices": indices, "enso": enso,
        "gistemp": build_gistemp(cache), "co2": build_co2(cache), "seaIce": build_sea_ice(cache),
        "seaLevel": build_sea_level(cache), "rapid": build_rapid(cache), "iceCores": build_ice_cores(cache),
    }
    ev = enso["events"]
    log(f"  {len(ev)} ENSO episodes since 1950; latest ONI {enso['oni']['latest']['value']:+.2f} "
        f"({enso['oni']['latest']['month'][0]}-{enso['oni']['latest']['month'][1]:02d})")
    log(f"  AMOC mean {result['rapid']['stats']['mean']} Sv; sea-level trend {result['seaLevel']['trendMmPerYear']} mm/yr")
    return result
