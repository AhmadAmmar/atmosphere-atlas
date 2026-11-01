"""Download helper with an on-disk cache.  Uses only the standard library."""
from __future__ import annotations

import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

USER_AGENT = "atmosphere-atlas/1.0 (educational data pipeline)"


class DownloadError(RuntimeError):
    """Raised when a file could not be fetched after all retries."""


def log(message: str) -> None:
    print(message, flush=True)


def _human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:,.0f} {unit}" if unit == "B" else f"{n:,.1f} {unit}"
        n /= 1024
    return f"{n:,.1f} GB"


def fetch(url: str, dest: Path, *, retries: int = 4, timeout: int = 180, force: bool = False,
          quiet: bool = False) -> Path:
    """Download ``url`` to ``dest`` unless a non-empty copy is already cached.

    The file is written to ``<dest>.part`` first and renamed only when complete, so an
    interrupted run never leaves a truncated file behind.
    """
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    partial = dest.with_name(dest.name + ".part")
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            started = time.time()
            with urllib.request.urlopen(request, timeout=timeout) as response, open(partial, "wb") as out:
                total = int(response.headers.get("Content-Length") or 0)
                done = 0
                shown = 0.0
                while True:
                    block = response.read(1 << 20)
                    if not block:
                        break
                    out.write(block)
                    done += len(block)
                    now = time.time()
                    if not quiet and total and now - shown > 2.0 and total > 8 << 20:
                        shown = now
                        sys.stdout.write(f"\r      {dest.name}: {_human(done)} / {_human(total)}   ")
                        sys.stdout.flush()
            if total and done != total:
                raise DownloadError(f"incomplete download ({done} of {total} bytes)")
            partial.replace(dest)
            if not quiet:
                if total > 8 << 20:
                    sys.stdout.write("\r" + " " * 70 + "\r")
                log(f"  fetched {dest.name} ({_human(dest.stat().st_size)}, {time.time() - started:.1f}s)")
            return dest
        except (urllib.error.URLError, TimeoutError, ConnectionError, DownloadError, OSError) as exc:
            last_error = exc
            if not quiet:
                log(f"  attempt {attempt}/{retries} for {dest.name} failed: {exc}")
            time.sleep(min(10, 2 * attempt))
    raise DownloadError(f"could not download {url}: {last_error}")
