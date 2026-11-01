"""Monthly climatology fields for the globe and the zonal-mean circulation.

Everything here is a *long-term mean for each calendar month* (1991-2020 for the atmosphere,
2012-2013 for the ocean currents), so the 12 time slices describe a typical year.  The page
interpolates between them to give a smooth 4D (space + season) model.

Derived quantity: the **mass streamfunction** of the zonal-mean meridional circulation.  It is
what makes the Hadley, Ferrel and Polar cells visible in real data::

    psi(lat, p) = (2 pi a cos(lat) / g) * integral from the top of the atmosphere down to p of [v] dp

where [v] is the zonal mean of the northward wind and a the Earth's radius.  Positive psi
means clockwise flow when the cross-section is viewed with north to the right.  A barotropic
correction removes the small net mass flux so that psi vanishes at the ground.
"""
from __future__ import annotations

import calendar
import warnings
from pathlib import Path

import numpy as np

from ..config import SOURCES
from ..net import fetch, log
from . import ncio
from .ncio import Grid
from .pack import PackWriter

EARTH_RADIUS = 6.371e6
GRAVITY = 9.80665
MONTHS = 12


def psl_file(cache: Path, key: str, sub: str) -> Path:
    url = SOURCES[key].urls[sub]
    return fetch(url, cache / "psl" / f"{key}_{Path(url).name}")


# Quantisation step kept for each stored field (physical units).  Rounding to a meaningful
# step discards noise-level bits, so the gzip stage can compress the smooth fields well.
STEPS = {
    "slp": 0.1, "u10": 0.05, "v10": 0.05, "t2m": 0.05, "cloud": 0.5, "pwat": 0.1, "precip": 0.02,
    "olr": 0.25, "sst": 0.02, "ice": 1.0, "z500": 1.0, "t850": 0.1, "omega500": 0.002,
    "cur_u": 0.005, "cur_v": 0.005,
}


def add_grid(pack: PackWriter, name: str, grid: Grid, *, units: str, title: str,
             vmin: float | None = None, vmax: float | None = None, step: float | None = None,
             **extra) -> None:
    meta = {**grid.meta(), "units": units, "title": title,
            "nt": int(grid.data.shape[0]) if grid.data.ndim == 3 else 1}
    meta.update(extra)
    if step is None:
        step = STEPS.get(name, 0.1 if name[0] in "uv" else None)
    pack.add_float(name, grid.data, vmin=vmin, vmax=vmax, step=step, meta=meta)
    log(f"  packed {name:<12} {tuple(grid.data.shape)}  {units}")


def monthly_surface(cache: Path, key: str, sub: str, var: str) -> Grid:
    path = psl_file(cache, key, sub)
    data = ncio.read_var(path, var)
    lat = ncio.read_axis(path, "lat")
    lon = ncio.read_axis(path, "lon")
    return ncio.standardise(data, lat, lon)


def pressure_level(cache: Path, key: str, sub: str, var: str) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return (data[t, level, lat, lon], levels, lat, lon) exactly as stored (north first)."""
    path = psl_file(cache, key, sub)
    data = ncio.read_var(path, var)
    return (data, ncio.read_axis(path, "level"), ncio.read_axis(path, "lat"), ncio.read_axis(path, "lon"))


def level_grid(data: np.ndarray, levels: np.ndarray, lat: np.ndarray, lon: np.ndarray, hpa: float) -> Grid:
    k = int(np.argmin(np.abs(levels - hpa)))
    if abs(levels[k] - hpa) > 0.5:
        raise ValueError(f"level {hpa} hPa not present in {levels}")
    return ncio.standardise(data[:, k], lat, lon)


# --------------------------------------------------------------------------------------
# zonal-mean circulation
# --------------------------------------------------------------------------------------
def mass_streamfunction(v: np.ndarray, levels_hpa: np.ndarray, lat: np.ndarray, surface_hpa: np.ndarray,
                        top_hpa: float = 100.0) -> tuple[np.ndarray, np.ndarray]:
    """Tropospheric mass streamfunction in 10^9 kg/s from monthly v(t, level, lat, lon).

    The integral runs from ``top_hpa`` down to the ground because the reanalysis winds in the
    stratosphere are too noisy to anchor the calculation.  ``surface_hpa`` is the zonal-mean
    surface pressure by (t, lat), ordered like ``lat``.  Cells below the ground (NaN) carry no
    mass and count as zero.  Returns (psi, kept_levels_hpa) with levels ordered 1000 -> top.
    """
    keep = np.where(levels_hpa >= top_hpa - 1e-6)[0]
    lv = levels_hpa[keep]
    order = np.argsort(lv)                               # top first
    p = lv[order] * 100.0                                # Pa
    vv = np.nan_to_num(v[:, keep][:, order], nan=0.0)    # t, k, lat, lon
    zonal = vv.mean(axis=-1)                             # zonal mean including zeros below ground
    cosphi = np.cos(np.deg2rad(lat))[None, None, :]
    flux = zonal * 2 * np.pi * EARTH_RADIUS * cosphi / GRAVITY       # integrates over dp to kg/s
    nt, nk, nlat = flux.shape
    psi = np.zeros_like(flux)
    for k in range(1, nk):
        psi[:, k] = psi[:, k - 1] + 0.5 * (flux[:, k] + flux[:, k - 1]) * (p[k] - p[k - 1])
    # barotropic correction: remove the residual mass flux, linearly in pressure
    ps = np.clip(surface_hpa * 100.0, p[0] + 1.0, p[-1])
    for t in range(nt):
        for j in range(nlat):
            total = np.interp(ps[t, j], p, psi[t, :, j])
            span = ps[t, j] - p[0]
            psi[t, :, j] -= total * np.clip((p - p[0]) / span, 0.0, 1.0)
            psi[t, p > ps[t, j], j] = 0.0
    inverse = np.argsort(order)                          # back to 1000 -> top
    return (psi[:, inverse] / 1e9).astype(np.float32), lv


def zonal_mean_products(cache: Path, pack: PackWriter) -> dict:
    """Zonal-mean wind, temperature and mass streamfunction as (month, level, latitude)."""
    u, levels, lat, lon = pressure_level(cache, "ncep_r1", "uwnd", "uwnd")
    v, _, _, _ = pressure_level(cache, "ncep_r1", "vwnd", "vwnd")
    t_air, _, _, _ = pressure_level(cache, "ncep_r1", "air", "air")
    ps_grid = monthly_surface(cache, "ncep_r1", "pres_sfc", "pres")
    ps_zonal = np.nanmean(ncio.sample_bilinear(ps_grid, np.arange(-180, 180, 2.5), lat[::-1]), axis=-1)  # t, lat(S->N)
    ps_zonal = (ps_zonal / 100.0)[:, ::-1]                # hPa, matching the north-first order of v

    psi, psi_levels = mass_streamfunction(v, levels, lat, ps_zonal)
    u_zm = np.nanmean(u, axis=-1)
    t_zm = np.nanmean(t_air, axis=-1)

    # present latitude south -> north
    flip = slice(None, None, -1)
    psi, u_zm, t_zm = psi[..., flip], u_zm[..., flip], t_zm[..., flip]
    lat_s = lat[flip]
    meta = {"plev": [float(x) for x in levels], "lat0": float(lat_s[0]), "dlat": float(lat_s[1] - lat_s[0]),
            "nt": MONTHS, "axes": "month,level,lat"}
    pack.add_float("zm_psi", psi, step=0.5,
                   meta={**meta, "plev": [float(x) for x in psi_levels], "units": "10^9 kg/s",
                         "title": "Mass streamfunction of the zonal-mean circulation"})
    pack.add_float("zm_u", u_zm, step=0.1, meta={**meta, "units": "m/s", "title": "Zonal-mean zonal wind"})
    pack.add_float("zm_t", t_zm, step=0.1, meta={**meta, "units": "degC", "title": "Zonal-mean air temperature"})
    log(f"  zonal means packed; |psi| max = {np.nanmax(np.abs(psi)):.0f} x10^9 kg/s")

    # surface pressure by latitude (used to mask the underground part of the cross-section)
    pack.add_float("zm_ps", ps_zonal[:, flip], step=0.1,
                   meta={"units": "hPa", "lat0": float(lat_s[0]), "dlat": float(lat_s[1] - lat_s[0]),
                         "nt": MONTHS, "title": "Zonal-mean surface pressure"})
    return {"psi": psi, "u": u_zm, "t": t_zm, "lat": lat_s, "levels": levels}


# --------------------------------------------------------------------------------------
# ocean currents (OSCAR via ERDDAP)
# --------------------------------------------------------------------------------------
ERDDAP_URL = SOURCES["oscar"].urls["erddap"]


def _oscar_window(cache: Path, year: int, month: int) -> Path:
    last = calendar.monthrange(year, month)[1]
    t0 = f"{year}-{month:02d}-01T00:00:00Z"
    t1 = f"{year}-{month:02d}-{last:02d}T00:00:00Z"
    sel = f"%5B({t0}):1:({t1})%5D%5B(15.0)%5D%5B(-80.0):3:(80.0)%5D%5B(20.0):3:(380.0)%5D"
    url = f"{ERDDAP_URL}?u{sel},v{sel}"
    return fetch(url, cache / "oscar" / f"oscar_{year}_{month:02d}.nc", quiet=True)


def ocean_currents(cache: Path, years: tuple[int, ...] = (2012, 2013)) -> tuple[Grid, Grid]:
    """Calendar-month mean surface currents (m/s), 1 degree, NaN over land."""
    u_months, v_months = [], []
    for month in range(1, 13):
        us, vs = [], []
        for year in years:
            path = _oscar_window(cache, year, month)
            u = ncio.read_var(path, "u")[:, 0]
            v = ncio.read_var(path, "v")[:, 0]
            us.append(u)
            vs.append(v)
            lat = ncio.read_axis(path, "latitude")
            lon = ncio.read_axis(path, "longitude")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)     # land cells are all-NaN
            u_months.append(np.nanmean(np.concatenate(us), axis=0))
            v_months.append(np.nanmean(np.concatenate(vs), axis=0))
        log(f"  currents: month {month:02d} done")
    u_grid = ncio.standardise(np.stack(u_months), lat, lon)
    v_grid = ncio.standardise(np.stack(v_months), lat, lon)
    return u_grid, v_grid


# --------------------------------------------------------------------------------------
# main entry
# --------------------------------------------------------------------------------------
def build_fields(cache: Path, pack: PackWriter) -> dict[str, Grid]:
    """Add every monthly lon-lat field to ``pack``; returns the grids for quick-look plots."""
    out: dict[str, Grid] = {}

    log("sea-level pressure")
    g = monthly_surface(cache, "ncep_r1", "slp", "slp")
    out["slp"] = g
    add_grid(pack, "slp", g, units="hPa", title="Sea-level pressure")

    log("10 m wind, 2 m temperature, cloud cover (T62 Gaussian grid -> 1.5 degrees)")
    for name, sub, var, units, title, conv in [
        ("u10", "u10", "uwnd", "m/s", "Zonal wind at 10 m", None),
        ("v10", "v10", "vwnd", "m/s", "Meridional wind at 10 m", None),
        ("t2m", "t2m", "air", "degC", "Air temperature at 2 m", lambda a: a - 273.15),
        ("cloud", "tcdc", "tcdc", "%", "Total cloud cover", None),
    ]:
        raw = monthly_surface(cache, "ncep_r1", sub, var)
        if conv:
            raw = Grid(conv(raw.data), raw.lat0, raw.dlat, raw.lon0, raw.dlon)
        g = ncio.regrid(raw, 1.5, 1.5)
        if name == "cloud":
            g.data = np.clip(g.data, 0, 100)
        out[name] = g
        add_grid(pack, name, g, units=units, title=title)

    log("precipitable water")
    g = monthly_surface(cache, "ncep_r1", "pr_wtr", "pr_wtr")
    out["pwat"] = g
    add_grid(pack, "pwat", g, units="kg/m2", title="Precipitable water (column water vapour)")

    log("GPCP precipitation")
    g = monthly_surface(cache, "gpcp", "ltm", "precip")
    g.data = np.clip(g.data, 0, None)
    out["precip"] = g
    add_grid(pack, "precip", g, units="mm/day", title="Precipitation")

    log("outgoing longwave radiation")
    g = monthly_surface(cache, "olr", "ltm", "olr")
    out["olr"] = g
    add_grid(pack, "olr", g, units="W/m2", title="Outgoing longwave radiation")

    log("sea-surface temperature and sea ice")
    g = monthly_surface(cache, "oisst", "sst", "sst")
    g.data = np.stack([ncio.fill_nan_nearest(m) for m in g.data])
    out["sst"] = g
    add_grid(pack, "sst", g, units="degC", title="Sea-surface temperature")
    g = monthly_surface(cache, "oisst", "icec", "icec")
    g.data = np.nan_to_num(np.clip(g.data, 0, 100), nan=0.0)
    out["ice"] = g
    add_grid(pack, "ice", g, units="%", title="Sea-ice concentration", vmin=0, vmax=100)

    log("winds, heights, temperature and vertical motion on pressure levels")
    u, levels, lat, lon = pressure_level(cache, "ncep_r1", "uwnd", "uwnd")
    v, _, _, _ = pressure_level(cache, "ncep_r1", "vwnd", "vwnd")
    for hpa in (850, 500, 250):
        gu = level_grid(u, levels, lat, lon, hpa)
        gv = level_grid(v, levels, lat, lon, hpa)
        below_ground = np.isnan(gu.data).any(axis=0) | np.isnan(gv.data).any(axis=0)
        gu.data = np.nan_to_num(gu.data, nan=0.0)
        gv.data = np.nan_to_num(gv.data, nan=0.0)
        out[f"u{hpa}"], out[f"v{hpa}"] = gu, gv
        add_grid(pack, f"u{hpa}", gu, units="m/s", title=f"Zonal wind at {hpa} hPa")
        add_grid(pack, f"v{hpa}", gv, units="m/s", title=f"Meridional wind at {hpa} hPa")
        if hpa == 850:
            pack.add_u8("ground850", below_ground.astype(np.uint8),
                        meta={**gu.meta(), "title": "Land that rises above the 850 hPa level"})
    h, levels, lat, lon = pressure_level(cache, "ncep_r1", "hgt", "hgt")
    g = level_grid(h, levels, lat, lon, 500)
    out["z500"] = g
    add_grid(pack, "z500", g, units="m", title="Geopotential height of the 500 hPa surface")
    t, levels, lat, lon = pressure_level(cache, "ncep_r1", "air", "air")
    g = level_grid(t, levels, lat, lon, 850)
    g.data = np.stack([ncio.fill_nan_nearest(m) for m in g.data])
    out["t850"] = g
    add_grid(pack, "t850", g, units="degC", title="Air temperature at 850 hPa")
    om, levels, lat, lon = pressure_level(cache, "ncep_r1", "omega", "omega")
    g = level_grid(om, levels, lat, lon, 500)
    out["omega500"] = g
    add_grid(pack, "omega500", g, units="Pa/s", title="Vertical motion at 500 hPa (negative = rising)")

    log("zonal-mean circulation")
    zonal_mean_products(cache, pack)

    log("ocean currents (OSCAR)")
    gu, gv = ocean_currents(cache)
    out["cur_u"], out["cur_v"] = gu, gv
    add_grid(pack, "cur_u", gu, units="m/s", title="Surface current, eastward")
    add_grid(pack, "cur_v", gv, units="m/s", title="Surface current, northward")
    return out
