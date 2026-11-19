"""El Nino / La Nina in real data: composites, a monthly SST time machine and the Walker circulation.

An episode year is defined from the NOAA Oceanic Nino Index of the December-February season:
ONI >= +1.0 C is an El Nino winter and ONI <= -1.0 C a La Nina winter.  Composite maps average
the anomalies of those winters (anomaly = departure from the 1991-2020 monthly climatology).

Also produced here, because they need the same long ERSST record:

* ``enso_sst_anom``  monthly SST anomaly for the tropical Indo-Pacific, 1950 to the latest month;
* ``sst_trend``      linear SST trend 1901-present, which shows the cool "warming hole" in the
                     subpolar North Atlantic that scientists link to a slowing overturning;
* ``sst_anom_recent`` the SST anomaly of the latest three months.
"""
from __future__ import annotations

import datetime as dt
import warnings
from pathlib import Path

import numpy as np

from ..config import SOURCES
from ..net import fetch, log
from . import ncio
from .fields import psl_file
from .pack import PackWriter
from .series import SEASON_CENTRE, fetch_series_file, parse_oni

EPOCH = dt.datetime(1800, 1, 1)
OPENDAP = "https://psl.noaa.gov/thredds/dodsC/Datasets/ncep.reanalysis.derived/pressure"
REGION_LAT = (-24.0, 24.0)      # ERSST rows kept for the time machine
REGION_LON = (110.0, 290.0)     # degrees east, crossing the dateline


def months_of(path: Path, name: str = "time") -> list[tuple[int, int]]:
    """(year, month) of each time step of a netCDF file."""
    import netCDF4
    with netCDF4.Dataset(str(path)) as ds:
        var = ds.variables[name]
        units = var.units.lower()
        raw = np.asarray(var[:], dtype=float)
    scale = dt.timedelta(hours=1) if units.startswith("hours") else dt.timedelta(days=1)
    return [((EPOCH + scale * float(v) + dt.timedelta(days=3)).year, (EPOCH + scale * float(v) + dt.timedelta(days=3)).month)
            for v in raw]


def episode_years(cache: Path) -> tuple[list[int], list[int]]:
    """Years whose Dec-Feb ONI reaches +/-1.0 C (the year is that of the January)."""
    months, oni = parse_oni(fetch_series_file(cache, SOURCES["enso_indices"].urls["oni"], "oni.txt"))
    djf = {y: v for (y, m), v in zip(months, oni) if m == 1}
    nino = sorted(y for y, v in djf.items() if v >= 1.0)
    nina = sorted(y for y, v in djf.items() if v <= -1.0)
    return nino, nina


def climatology(field: np.ndarray, times: list[tuple[int, int]], y0: int = 1991, y1: int = 2020) -> np.ndarray:
    """Monthly climatology of a field over y0-y1 (1991-2020 by default)."""
    out = np.full((12,) + field.shape[1:], np.nan, dtype=np.float32)
    for m in range(1, 13):
        sel = [i for i, (y, mm) in enumerate(times) if mm == m and y0 <= y <= y1]
        out[m - 1] = np.nanmean(field[sel], axis=0)
    return out


def djf_composite(field: np.ndarray, times: list[tuple[int, int]], clim: np.ndarray, years: list[int]) -> tuple[np.ndarray, int]:
    """Mean December-February anomaly of a field over the given years (years missing a month skipped), and the count."""
    index = {t: i for i, t in enumerate(times)}
    stack = []
    for y in years:
        ids = [index.get((y - 1, 12)), index.get((y, 1)), index.get((y, 2))]
        if any(i is None for i in ids):
            continue
        anomalies = [field[i] - clim[m - 1] for i, m in zip(ids, (12, 1, 2))]
        stack.append(np.nanmean(anomalies, axis=0))
    if not stack:
        raise ValueError("no usable winters for the composite")
    return np.nanmean(stack, axis=0).astype(np.float32), len(stack)


def _grid_meta(grid: ncio.Grid, **extra) -> dict:
    """Grid metadata with extra fields."""
    return {**grid.meta(), **extra}


def build_enso(cache: Path, pack: PackWriter) -> dict:
    """El Nino and La Nina composites of temperature, rain and pressure for the atlas pack."""
    warnings.simplefilter("ignore", category=RuntimeWarning)       # all-NaN ocean/ice slices are expected
    log("ENSO composites (ERSST, GPCP, NCEP/NCAR)")
    nino_years, nina_years = episode_years(cache)
    log(f"  El Nino winters ({len(nino_years)}): {nino_years}")
    log(f"  La Nina winters ({len(nina_years)}): {nina_years}")
    info = {"nino": nino_years, "nina": nina_years}

    # ---------------------------------------------------------------- sea-surface temperature
    sst_path = fetch(SOURCES["ersst5"].urls["mean"], cache / "psl" / "ersst5_sst.mnmean.nc")
    times = months_of(sst_path)
    sst = ncio.read_var(sst_path, "sst")
    lat, lon = ncio.read_axis(sst_path, "lat"), ncio.read_axis(sst_path, "lon")
    sst[sst < -3] = np.nan
    grid = ncio.standardise(sst, lat, lon)
    clim = climatology(grid.data, times)
    c_nino, n1 = djf_composite(grid.data, times, clim, nino_years)
    c_nina, n2 = djf_composite(grid.data, times, clim, nina_years)
    for name, comp, title in (("enso_sst_nino", c_nino, "SST anomaly, El Nino winters"),
                              ("enso_sst_nina", c_nina, "SST anomaly, La Nina winters")):
        pack.add_float(name, ncio.fill_nan_nearest(comp), step=0.05,
                       meta=_grid_meta(grid, units="degC", title=title, nt=1))
    log(f"  SST composites from {n1} El Nino and {n2} La Nina winters; peak anomaly "
        f"{np.nanmax(c_nino):+.1f} / {np.nanmin(c_nina):+.1f} C")

    # equatorial SST profile (2 S - 2 N) for the Walker scene, in the climatology and each phase
    band = np.abs(grid.lats) <= 2.0
    walker_sst = np.stack([
        np.nanmean(clim[[11, 0, 1]][:, band], axis=(0, 1)),
        np.nanmean(clim[[11, 0, 1]][:, band], axis=(0, 1)) + np.nanmean(c_nino[band], axis=0),
        np.nanmean(clim[[11, 0, 1]][:, band], axis=(0, 1)) + np.nanmean(c_nina[band], axis=0),
    ])
    pack.add_float("walker_sst", walker_sst, step=0.05,
                   meta={"lon0": grid.lon0, "dlon": grid.dlon, "units": "degC",
                         "title": "Equatorial SST in December-February: climatology, El Nino, La Nina"})

    # ---------------------------------------------------------------- time machine
    first = times.index((1950, 1))
    anomalies = np.empty_like(grid.data[first:])
    for i, (y, m) in enumerate(times[first:]):
        anomalies[i] = grid.data[first + i] - clim[m - 1]
    lats, lons = grid.lats, grid.lons % 360.0
    rows = np.where((lats >= REGION_LAT[0]) & (lats <= REGION_LAT[1]))[0]
    cols = np.where((lons >= REGION_LON[0]) & (lons <= REGION_LON[1]))[0]
    cols = cols[np.argsort(lons[cols])]
    region = anomalies[:, rows][:, :, cols]
    region = np.stack([ncio.fill_nan_nearest(f) if np.isnan(f).any() else f for f in region])
    last_month = times[-1]
    pack.add_float("enso_sst_anom", region, step=0.1, vmin=-5, vmax=5,
                   meta={"lat0": float(lats[rows[0]]), "dlat": grid.dlat, "lon0": float(lons[cols[0]]), "dlon": grid.dlon,
                         "units": "degC", "start": [1950, 1], "end": list(last_month), "nt": int(region.shape[0]),
                         "title": "Monthly SST anomaly, tropical Indo-Pacific"})
    log(f"  time machine {region.shape} (1950-01 to {last_month[0]}-{last_month[1]:02d})")

    # ---------------------------------------------------------------- long-term trend and latest anomaly
    ann = {}
    last_year = last_month[0]
    for y in range(1901, last_year + 1):
        ids = [i for i, (yy, _) in enumerate(times) if yy == y]
        if len(ids) < 12 and (y != last_year or len(ids) < 9):
            continue
        sub = np.stack([grid.data[i] - clim[times[i][1] - 1] for i in ids])
        valid = np.isfinite(sub).sum(axis=0)
        ann[y] = np.where(valid >= max(1, int(0.75 * len(ids))), np.nanmean(sub, axis=0), np.nan)
    years = np.array(sorted(ann))
    cube = np.stack([ann[y] for y in years])
    trend = np.full(cube.shape[1:], np.nan, dtype=np.float32)
    for j in range(cube.shape[1]):
        for k in range(cube.shape[2]):
            col = cube[:, j, k]
            ok = np.isfinite(col)
            if ok.sum() >= 90:
                trend[j, k] = np.polyfit(years[ok], col[ok], 1)[0] * 100.0
    pack.add_float("sst_trend", ncio.fill_nan_nearest(trend), step=0.05,
                   meta=_grid_meta(grid, units="degC per century", title=f"SST trend {years[0]}-{years[-1]}", nt=1,
                                   span=[int(years[0]), int(years[-1])]))
    recent_ids = list(range(len(times) - 3, len(times)))
    recent = np.nanmean([grid.data[i] - clim[times[i][1] - 1] for i in recent_ids], axis=0)
    pack.add_float("sst_anom_recent", ncio.fill_nan_nearest(recent), step=0.05,
                   meta=_grid_meta(grid, units="degC", nt=1, months=[list(times[i]) for i in recent_ids],
                                   title="SST anomaly, latest three months"))
    info["recentMonths"] = [list(times[i]) for i in recent_ids]
    info["sstTrendSpan"] = [int(years[0]), int(years[-1])]
    log(f"  trend map {years[0]}-{years[-1]}; latest months {info['recentMonths']}")

    # ---------------------------------------------------------------- precipitation, pressure, temperature
    gp_path = psl_file(cache, "gpcp", "mean")
    gp_times = months_of(gp_path)
    gp = ncio.standardise(ncio.read_var(gp_path, "precip"), ncio.read_axis(gp_path, "lat"), ncio.read_axis(gp_path, "lon"))
    gp_clim = climatology(gp.data, gp_times)
    for name, years_ in (("nino", nino_years), ("nina", nina_years)):
        comp, n = djf_composite(gp.data, gp_times, gp_clim, [y for y in years_ if y >= 1980])
        pack.add_float(f"enso_precip_{name}", np.nan_to_num(comp), step=0.02,
                       meta=_grid_meta(gp, units="mm/day", nt=1, title=f"Precipitation anomaly, {name} winters", events=n))

    slp_path = fetch(SOURCES["ncep_r1"].urls["slp_mean"], cache / "psl" / "ncep_r1_slp.mon.mean.nc")
    slp_times = months_of(slp_path)
    slp = ncio.standardise(ncio.read_var(slp_path, "slp"), ncio.read_axis(slp_path, "lat"), ncio.read_axis(slp_path, "lon"))
    slp_clim = climatology(slp.data, slp_times)
    slp_comp = {}
    for name, years_ in (("nino", nino_years), ("nina", nina_years)):
        comp, n = djf_composite(slp.data, slp_times, slp_clim, years_)
        slp_comp[name] = comp
        log(f"  SLP composite {name}: {np.nanmin(comp):+.1f} to {np.nanmax(comp):+.1f} hPa")
        pack.add_float(f"enso_slp_{name}", comp, step=0.05,
                       meta=_grid_meta(slp, units="hPa", nt=1, title=f"Sea-level pressure anomaly, {name} winters", events=n))
    slp_full = np.stack([slp_clim[[11, 0, 1]].mean(axis=0), slp_clim[[11, 0, 1]].mean(axis=0) + slp_comp["nino"],
                         slp_clim[[11, 0, 1]].mean(axis=0) + slp_comp["nina"]])
    band = np.abs(slp.lats) <= 5.0
    pack.add_float("walker_slp", np.nanmean(slp_full[:, band], axis=1), step=0.05,
                   meta={"lon0": slp.lon0, "dlon": slp.dlon, "units": "hPa",
                         "title": "Equatorial sea-level pressure in December-February: climatology, El Nino, La Nina"})

    t2_path = fetch(SOURCES["ncep_r1"].urls["t2m_mean"], cache / "psl" / "ncep_r1_air.2m.mon.mean.nc")
    t2_times = months_of(t2_path)
    t2 = ncio.standardise(ncio.read_var(t2_path, "air"), ncio.read_axis(t2_path, "lat"), ncio.read_axis(t2_path, "lon"))
    t2_clim = climatology(t2.data, t2_times)
    for name, years_ in (("nino", nino_years), ("nina", nina_years)):
        comp, n = djf_composite(t2.data, t2_times, t2_clim, years_)
        comp = ncio.regrid(ncio.Grid(comp, t2.lat0, t2.dlat, t2.lon0, t2.dlon), 2.5, 2.5)
        pack.add_float(f"enso_t2m_{name}", comp.data, step=0.05,
                       meta=_grid_meta(comp, units="degC", nt=1, title=f"2 m temperature anomaly, {name} winters", events=n))

    # ---------------------------------------------------------------- Walker circulation (OPeNDAP)
    log("Walker circulation from equatorial reanalysis winds")
    walker_u, walker_w, w_levels_u, w_levels_w = equatorial_walker(nino_years, nina_years)
    pack.add_float("walker_u", walker_u, step=0.1,
                   meta={"plev": w_levels_u, "lon0": 0.0, "dlon": 2.5, "units": "m/s",
                         "title": "Equatorial zonal wind minus its zonal mean, Dec-Feb: climatology, El Nino, La Nina"})
    pack.add_float("walker_omega", walker_w, step=0.0005,
                   meta={"plev": w_levels_w, "lon0": 0.0, "dlon": 2.5, "units": "Pa/s",
                         "title": "Equatorial vertical motion, Dec-Feb: climatology, El Nino, La Nina (negative = rising)"})
    pack.add_json("enso_info", info)
    return info


def equatorial_walker(nino_years: list[int], nina_years: list[int]):
    """Equatorial vertical circulation (Walker cell) composites for El Nino and La Nina years."""
    import netCDF4
    out = {}
    for var in ("uwnd", "omega"):
        ds = netCDF4.Dataset(f"{OPENDAP}/{var}.mon.mean.nc")
        lat = np.asarray(ds.variables["lat"][:], dtype=float)
        sel = np.where(np.abs(lat) <= 5.0)[0]
        ntime = ds.variables[var].shape[0]
        chunks = []
        for t0 in range(0, ntime, 96):                    # one big request is silently returned as zeros by the server
            part = ds.variables[var][t0:min(ntime, t0 + 96), :, sel[0]:sel[-1] + 1, :]
            chunks.append(np.ma.filled(np.ma.asarray(part, dtype=np.float64), np.nan).mean(axis=2))
        data = np.concatenate(chunks, axis=0)                                                  # time, level, lon
        if not np.isfinite(data).any() or float(np.nanmax(np.abs(data))) == 0.0:
            raise RuntimeError(f"OPeNDAP returned no usable data for {var}")
        levels = [float(x) for x in ds.variables["level"][:]]
        units = ds.variables["time"].units.lower()
        raw_t = np.asarray(ds.variables["time"][:], dtype=float)
        ds.close()
        step = dt.timedelta(hours=1) if units.startswith("hours") else dt.timedelta(days=1)
        times = [((EPOCH + step * v + dt.timedelta(days=3)).year, (EPOCH + step * v + dt.timedelta(days=3)).month) for v in raw_t]
        index = {t: i for i, t in enumerate(times)}

        def djf_mean(years):
            sel_ids = []
            for y in years:
                ids = [index.get((y - 1, 12)), index.get((y, 1)), index.get((y, 2))]
                if all(i is not None for i in ids):
                    sel_ids.append(np.nanmean(data[ids], axis=0))
            return np.nanmean(sel_ids, axis=0)

        clim_years = list(range(1991, 2021))
        phases = np.stack([djf_mean(clim_years), djf_mean(nino_years), djf_mean(nina_years)])    # phase, level, lon
        if var == "uwnd":
            phases = phases - np.nanmean(phases, axis=-1, keepdims=True)
        out[var] = (phases.astype(np.float32), levels)
    return out["uwnd"][0], out["omega"][0], out["uwnd"][1], out["omega"][1]
