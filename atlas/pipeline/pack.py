"""Compact binary container for the arrays the web page needs.

Layout of an uncompressed container (the file on disk is this, gzip-compressed)::

    "ATLP"            4 bytes   magic
    index_length      uint32    little endian
    index             UTF-8 JSON, padded with spaces to a multiple of 4 bytes
    payload           the arrays, each starting on a 4-byte boundary

``index`` maps an array name to ``{"t", "o", "n", "shape", ...}`` where ``t`` is the type,
``o`` the byte offset inside the payload and ``n`` the byte length.  Floating-point fields are
stored as 16-bit integers (``scale`` / ``offset`` recover the physical value), optionally
*delta coded* along the longitude axis and *byte shuffled*; both transforms make smooth
geophysical fields compress several times better under gzip, and both are undone by
``js/pack.js`` in the browser.
"""
from __future__ import annotations

import gzip
import json
import struct
from pathlib import Path

import numpy as np

MAGIC = b"ATLP"
NAN_I16 = -32768


def _numpy_json(obj):
    """json.dumps fallback for numpy scalars and arrays."""
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return None if not np.isfinite(obj) else float(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    raise TypeError(f"{type(obj).__name__} is not JSON serializable")


class PackWriter:
    def __init__(self) -> None:
        self._parts: list[bytes] = []
        self._offset = 0
        self.index: dict[str, dict] = {}

    # ------------------------------------------------------------------ internals
    def _append(self, name: str, raw: bytes, entry: dict) -> None:
        if name in self.index:
            raise ValueError(f"duplicate pack entry {name!r}")
        pad = (-self._offset) % 4
        if pad:
            self._parts.append(b"\0" * pad)
            self._offset += pad
        entry["o"] = self._offset
        entry["n"] = len(raw)
        self._parts.append(raw)
        self._offset += len(raw)
        self.index[name] = entry

    @staticmethod
    def _shuffle(raw: bytes, width: int) -> bytes:
        arr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, width)
        return b"".join(arr[:, k].tobytes() for k in range(width))

    # ------------------------------------------------------------------ public API
    def add_float(self, name: str, array, *, vmin: float | None = None, vmax: float | None = None,
                  step: float | None = None, delta: bool = True, shuffle: bool = True,
                  meta: dict | None = None) -> dict:
        """Store a float array as quantised int16.  NaN becomes -32768.  Returns the entry.

        ``step`` is the physical resolution to keep (for example 0.05 m/s for a wind component).
        Rounding to a meaningful step removes noise-level bits, which is what lets gzip shrink
        the field; without it the full 16-bit range of the data is used.
        """
        a = np.asarray(array, dtype=np.float64)
        finite = np.isfinite(a)
        if not finite.any():
            raise ValueError(f"{name}: no finite values")
        lo = float(a[finite].min()) if vmin is None else float(vmin)
        hi = float(a[finite].max()) if vmax is None else float(vmax)
        if hi <= lo:
            hi = lo + 1.0
        scale = (hi - lo) / 65534.0
        offset = (hi + lo) / 2.0
        if step is not None:
            if (hi - lo) / step > 65000:
                raise ValueError(f"{name}: step {step} is too fine for the range {lo}..{hi}")
            scale = float(step)
            offset = float(np.round(offset / scale) * scale)
        q = np.rint((np.clip(np.where(finite, a, lo), lo, hi) - offset) / scale).astype(np.int32)
        q = np.where(finite, q, NAN_I16)
        if delta and q.ndim >= 1:
            d = q.copy()
            d[..., 1:] = q[..., 1:] - q[..., :-1]
            q = d
        raw = q.astype("<i2").tobytes()      # int32 -> int16 wraps; the reader wraps identically
        if shuffle:
            raw = self._shuffle(raw, 2)
        entry = {"t": "i16", "shape": list(a.shape), "scale": scale, "offset": offset,
                 "delta": bool(delta), "shuffle": bool(shuffle), "meta": meta or {}}
        self._append(name, raw, entry)
        return entry

    def add_u8(self, name: str, array, *, meta: dict | None = None) -> dict:
        a = np.asarray(array)
        if a.size and (a.min() < 0 or a.max() > 255):
            raise ValueError(f"{name}: values outside uint8 range")
        entry = {"t": "u8", "shape": list(a.shape), "meta": meta or {}}
        self._append(name, a.astype(np.uint8).tobytes(), entry)
        return entry

    def add_i16(self, name: str, array, *, meta: dict | None = None) -> dict:
        a = np.asarray(array)
        entry = {"t": "i16raw", "shape": list(a.shape), "meta": meta or {}}
        self._append(name, a.astype("<i2").tobytes(), entry)
        return entry

    def add_u16(self, name: str, array, *, meta: dict | None = None) -> dict:
        a = np.asarray(array)
        entry = {"t": "u16", "shape": list(a.shape), "meta": meta or {}}
        self._append(name, a.astype("<u2").tobytes(), entry)
        return entry

    def add_f32(self, name: str, array, *, meta: dict | None = None) -> dict:
        a = np.asarray(array, dtype="<f4")
        entry = {"t": "f32", "shape": list(a.shape), "meta": meta or {}}
        self._append(name, a.tobytes(), entry)
        return entry

    def add_json(self, name: str, obj) -> dict:
        raw = json.dumps(obj, separators=(",", ":"), ensure_ascii=False, default=_numpy_json).encode("utf-8")
        entry = {"t": "json", "meta": {}}
        self._append(name, raw, entry)
        return entry

    def add_bytes(self, name: str, raw: bytes, *, mime: str, meta: dict | None = None) -> dict:
        entry = {"t": "bytes", "mime": mime, "meta": meta or {}}
        self._append(name, raw, entry)
        return entry

    # ------------------------------------------------------------------ output
    def to_bytes(self) -> bytes:
        payload = b"".join(self._parts)
        header = json.dumps(self.index, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        header += b" " * ((-len(header)) % 4)
        return MAGIC + struct.pack("<I", len(header)) + header + payload

    def write(self, path: Path, level: int = 9) -> int:
        """Write the gzip-compressed container; returns the file size in bytes."""
        blob = gzip.compress(self.to_bytes(), compresslevel=level, mtime=0)
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(blob)
        return len(blob)


def read_pack(path: Path) -> tuple[dict, bytes]:
    """Inverse of :meth:`PackWriter.write` (used by tests): returns (index, payload)."""
    raw = gzip.decompress(Path(path).read_bytes())
    if raw[:4] != MAGIC:
        raise ValueError("not an atlas pack")
    (hlen,) = struct.unpack("<I", raw[4:8])
    index = json.loads(raw[8:8 + hlen].decode("utf-8"))
    return index, raw[8 + hlen:]


def decode_float(index: dict, payload: bytes, name: str) -> np.ndarray:
    """Python reference decoder for :meth:`PackWriter.add_float` (mirrors js/pack.js)."""
    e = index[name]
    raw = payload[e["o"]:e["o"] + e["n"]]
    count = int(np.prod(e["shape"]))
    if e.get("shuffle"):
        lo = np.frombuffer(raw[:count], dtype=np.uint8)
        hi = np.frombuffer(raw[count:2 * count], dtype=np.uint8)
        q = (lo.astype(np.uint16) | (hi.astype(np.uint16) << 8)).view(np.int16)
    else:
        q = np.frombuffer(raw, dtype="<i2")
    q = q.reshape(e["shape"]).astype(np.int32)
    if e.get("delta"):
        q = np.cumsum(q, axis=-1, dtype=np.int64)
        q = ((q + 32768) % 65536 - 32768).astype(np.int32)
    out = q * e["scale"] + e["offset"]
    out = np.where(q == NAN_I16, np.nan, out)
    return out.astype(np.float32)
