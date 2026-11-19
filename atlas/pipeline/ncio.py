"""NetCDF reading helpers and the regular-grid conventions used throughout the pipeline.

Every gridded product is converted to one convention before it is packed:

* latitude rows run **south to north** (so texture row 0 is the southernmost row),
* longitude columns run **west to east starting at -180** (so column 0 is the dateline),
* missing values are NaN while the data are processed.

:class:`Grid` bundles the array with the coordinates needed to turn a (lon, lat) pair back
into a fractional array index, which is the same arithmetic the browser performs.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

try:  # netCDF4 is only needed for data preparation, never to build the page.
    import netCDF4
except ImportError:  # pragma: no cover - reported with a clear message when first used
    netCDF4 = None


def _need_netcdf() -> None:
    """Error if netCDF4 is not installed."""
    if netCDF4 is None:
        raise SystemExit("Data preparation needs the 'netCDF4' package: pip install -r requirements-data.txt")


def open_nc(path: Path):
    """Open a netCDF file."""
    _need_netcdf()
    return netCDF4.Dataset(str(path))


def read_var(path: Path, name: str) -> np.ndarray:
    """Read a whole variable as float32, with NaN for masked values.

    scale_factor, add_offset and _FillValue are applied by netCDF4 automatically.
    """
    with open_nc(path) as ds:
        data = ds.variables[name][:]
        return np.ma.filled(np.ma.asarray(data, dtype=np.float64), np.nan).astype(np.float32)


def read_axis(path: Path, name: str) -> np.ndarray:
    """Values of a coordinate variable."""
    with open_nc(path) as ds:
        return np.asarray(ds.variables[name][:], dtype=np.float64)


def find_axis_name(ds, candidates: tuple[str, ...]) -> str:
    """First of the candidate names present in a dataset."""
    for c in candidates:
        if c in ds.variables:
            return c
    raise KeyError(f"none of {candidates} found; have {list(ds.variables)}")


@dataclass
class Grid:
    """Regular latitude/longitude grid following the pipeline convention."""

    data: np.ndarray            # shape (nt, ny, nx) or (ny, nx); float32 with NaN
    lat0: float                 # latitude of row 0 (south)
    dlat: float                 # positive step northwards
    lon0: float                 # longitude of column 0, in [-180, -180 + dlon)
    dlon: float                 # positive step eastwards

    @property
    def ny(self) -> int:
        """Number of rows."""
        return self.data.shape[-2]

    @property
    def nx(self) -> int:
        """Number of columns."""
        return self.data.shape[-1]

    @property
    def lats(self) -> np.ndarray:
        """Latitude of each row."""
        return self.lat0 + self.dlat * np.arange(self.ny)

    @property
    def lons(self) -> np.ndarray:
        """Longitude of each column."""
        return self.lon0 + self.dlon * np.arange(self.nx)

    def meta(self) -> dict:
        """Grid origin and spacing for the pack."""
        return {"lat0": round(float(self.lat0), 6), "dlat": round(float(self.dlat), 6),
                "lon0": round(float(self.lon0), 6), "dlon": round(float(self.dlon), 6)}


def wrap_lon(lon: np.ndarray) -> np.ndarray:
    """Map longitudes to [-180, 180)."""
    return ((np.asarray(lon, dtype=np.float64) + 180.0) % 360.0) - 180.0


def standardise(data: np.ndarray, lat: np.ndarray, lon: np.ndarray) -> Grid:
    """Reorder an array of shape (..., nlat, nlon) to the pipeline convention.

    Handles latitude stored north-to-south and longitude stored 0..360 (or already -180..180).
    Only valid for regularly spaced coordinates.
    """
    data = np.asarray(data, dtype=np.float32)
    lat = np.asarray(lat, dtype=np.float64)
    lon = np.asarray(lon, dtype=np.float64)
    if lat[0] > lat[-1]:
        lat = lat[::-1]
        data = data[..., ::-1, :]
    lon_w = wrap_lon(lon)
    # keep one column per distinct longitude (drops a duplicated 0/360 wrap-around column)
    _, first = np.unique(np.round(lon_w, 6), return_index=True)
    keep = np.sort(first)
    lon_w = lon_w[keep]
    data = data[..., keep]
    order = np.argsort(lon_w)
    lon_w = lon_w[order]
    data = data[..., order]
    dlat = float(np.median(np.diff(lat)))
    dlon = float(np.median(np.diff(lon_w)))
    return Grid(np.ascontiguousarray(data), float(lat[0]), dlat, float(lon_w[0]), dlon)


def sample_bilinear(grid: Grid, lons: np.ndarray, lats: np.ndarray) -> np.ndarray:
    """Bilinear interpolation of ``grid`` (last two axes) at arbitrary points.

    ``lons`` / ``lats`` are 1-D target axes; the result has shape (..., len(lats), len(lons)).
    Longitude wraps; latitude is clamped at the grid edges.  NaN neighbours propagate.
    """
    data = grid.data
    nx, ny = grid.nx, grid.ny
    fx = (wrap_lon(lons) - grid.lon0) / grid.dlon
    fx = np.mod(fx, nx)
    x0 = np.floor(fx).astype(int) % nx
    x1 = (x0 + 1) % nx
    tx = (fx - np.floor(fx)).astype(np.float32)
    fy = np.clip((np.asarray(lats, dtype=np.float64) - grid.lat0) / grid.dlat, 0, ny - 1)
    y0 = np.minimum(np.floor(fy).astype(int), ny - 2)
    y1 = y0 + 1
    ty = (fy - y0).astype(np.float32)
    a = data[..., y0[:, None], x0[None, :]]
    b = data[..., y0[:, None], x1[None, :]]
    c = data[..., y1[:, None], x0[None, :]]
    d = data[..., y1[:, None], x1[None, :]]
    tx = tx[None, :]
    ty = ty[:, None]
    top = a * (1 - tx) + b * tx
    bottom = c * (1 - tx) + d * tx
    return (top * (1 - ty) + bottom * ty).astype(np.float32)


def regrid(grid: Grid, dlon: float, dlat: float, *, pole_inclusive: bool = False) -> Grid:
    """Bilinear regrid onto a regular grid with the requested spacing."""
    nx = int(round(360.0 / dlon))
    lons = -180.0 + dlon * np.arange(nx)
    if pole_inclusive:
        ny = int(round(180.0 / dlat)) + 1
        lats = -90.0 + dlat * np.arange(ny)
    else:
        ny = int(round(180.0 / dlat))
        lats = -90.0 + dlat * (np.arange(ny) + 0.5)
    out = sample_bilinear(grid, lons, lats)
    return Grid(out, float(lats[0]), dlat, float(lons[0]), dlon)


def fill_nan_nearest(field: np.ndarray, iterations: int = 400) -> np.ndarray:
    """Fill NaN cells with the mean of valid neighbours, repeating until none remain.

    Used so that colour-mapped layers do not show dark rims at coastlines when the GPU
    interpolates between valid and missing cells; a separate high-resolution land mask
    decides what is actually visible.
    """
    f = field.copy()
    for _ in range(iterations):
        nan = np.isnan(f)
        if not nan.any():
            break
        padded = np.pad(f, ((1, 1), (0, 0)), mode="edge")
        padded = np.concatenate([padded[:, -1:], padded, padded[:, :1]], axis=1)  # wrap in longitude
        stack = np.stack([
            padded[:-2, 1:-1], padded[2:, 1:-1], padded[1:-1, :-2], padded[1:-1, 2:],
        ])
        valid = ~np.isnan(stack)
        total = np.where(valid, stack, 0.0).sum(axis=0)
        count = valid.sum(axis=0)
        fill = np.where(count > 0, total / np.maximum(count, 1), np.nan)
        f = np.where(nan & (count > 0), fill, f)
    return f
