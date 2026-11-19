"""Orchestrates the data preparation and writes the packs in ``data/processed``.

Four packs are produced so the page can decode only what it needs:

``core``     climatology fields, vector map layers, land mask, climate zones, time series
``imagery``  twelve Blue Marble mosaics and the night-lights image
``storms``   tropical-cyclone tracks, hall of fame and statistics
``enso``     El Nino / La Nina composites, the SST time machine and Walker-circulation slices
"""
from __future__ import annotations

import datetime as dt
import json
import time
from pathlib import Path

from .. import __version__
from ..config import PROCESSED_DIR
from ..net import log
from .pack import PackWriter

ALL_STEPS = ("core", "imagery", "storms", "enso")


def refresh(cache: Path, out_dir: Path = PROCESSED_DIR, steps: tuple[str, ...] = ALL_STEPS) -> dict:
    """Rebuild every data pack step from the cache and write the manifest."""
    from . import enso, fields, imagery, koppen, series, storms, vector

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"packs": {}}
    started = time.time()

    def save(name: str, pack: PackWriter) -> None:
        """Write a pack and record its size."""
        size = pack.write(out_dir / f"{name}.pack.gz")
        manifest["packs"][name] = {"bytes": size, "arrays": len(pack.index)}
        log(f"=> {name}.pack.gz  {size / 1e6:.2f} MB  ({len(pack.index)} arrays)\n")

    if "core" in steps:
        pack = PackWriter()
        fields.build_fields(cache, pack)
        mask = vector.build_vectors(cache, pack)
        koppen.build_koppen(cache, pack, mask)
        data = series.build_series(cache)
        pack.add_json("series", data)
        manifest["seriesEnd"] = {
            "oni": data["enso"]["oni"]["latest"],
            "co2": {"start": data["co2"]["start"], "months": len(data["co2"]["monthly"])},
            "amoc": data["rapid"]["stats"]["end"],
        }
        save("core", pack)
    if "imagery" in steps:
        pack = PackWriter()
        imagery.build_imagery(cache, pack)
        save("imagery", pack)
    if "storms" in steps:
        pack = PackWriter()
        storms.build_storms(cache, pack)
        save("storms", pack)
    if "enso" in steps:
        pack = PackWriter()
        info = enso.build_enso(cache, pack)
        manifest["ensoRecentMonths"] = info["recentMonths"]
        save("enso", pack)

    manifest["pipelineVersion"] = __version__
    manifest["refreshed"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    log(f"data preparation finished in {time.time() - started:.0f} s")
    return manifest
