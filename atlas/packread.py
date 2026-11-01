"""Minimal reader for the binary packs, using only the standard library.

The page decodes packs in JavaScript; the build step only needs to peek at a few JSON entries
(for example the latest CO2 value) so it can write consistent text and tables.
"""
from __future__ import annotations

import gzip
import json
import struct
from pathlib import Path


def open_pack(path: Path) -> tuple[dict, bytes]:
    raw = gzip.decompress(Path(path).read_bytes())
    if raw[:4] != b"ATLP":
        raise ValueError(f"{path} is not an atlas pack")
    (header_length,) = struct.unpack("<I", raw[4:8])
    index = json.loads(raw[8:8 + header_length].decode("utf-8"))
    return index, raw[8 + header_length:]


def read_json(path: Path, name: str):
    index, payload = open_pack(path)
    entry = index[name]
    return json.loads(payload[entry["o"]:entry["o"] + entry["n"]].decode("utf-8"))
