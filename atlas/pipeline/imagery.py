"""NASA satellite imagery for the globe surface, fetched from the GIBS web map service.

* Blue Marble: Next Generation, one cloud-free mosaic for each month of 2004.  Seasonal snow
  and vegetation change from month to month, so the globe visibly breathes through the year.
* Black Marble: VIIRS night-time lights, shown on the dark side of the planet.

Images are re-encoded as progressive JPEG to keep the final HTML file small.
"""
from __future__ import annotations

import io
from pathlib import Path

from ..config import SOURCES
from ..net import fetch, log
from .pack import PackWriter

WIDTH, HEIGHT = 2048, 1024
WMS = SOURCES["bmng"].urls["wms"]


def _wms_url(layer: str, date: str) -> str:
    return (f"{WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={layer}&STYLES=&CRS=EPSG:4326"
            f"&BBOX=-90,-180,90,180&WIDTH={WIDTH}&HEIGHT={HEIGHT}&FORMAT=image/jpeg&TIME={date}")


def _recompress(path: Path, *, grayscale: bool, quality: int) -> bytes:
    from PIL import Image
    img = Image.open(path)
    img = img.convert("L" if grayscale else "RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def build_imagery(cache: Path, pack: PackWriter, quality: int = 80) -> None:
    log("Blue Marble monthly mosaics")
    total = 0
    for month in range(1, 13):
        path = fetch(_wms_url("BlueMarble_NextGeneration", f"2004-{month:02d}-01"),
                     cache / "gibs" / f"bmng_{month:02d}.jpg", quiet=True)
        data = _recompress(path, grayscale=False, quality=quality)
        pack.add_bytes(f"bmng_{month:02d}", data, mime="image/jpeg", meta={"month": month})
        total += len(data)
    log(f"  12 images, {total / 1e6:.2f} MB")
    log("Black Marble night lights")
    path = fetch(_wms_url("VIIRS_Black_Marble", "2016-01-01"), cache / "gibs" / "black_marble_2016.jpg", quiet=True)
    data = _recompress(path, grayscale=True, quality=84)
    pack.add_bytes("lights", data, mime="image/jpeg", meta={"grayscale": True})
    log(f"  lights {len(data) / 1e3:.0f} KB")
