"""Builds the standalone HTML page.  Standard library only.

Inputs
    data/processed/*.pack.gz   binary packs made by ``--refresh-data`` (embedded as base64)
    atlas/web/                 template, stylesheet, application scripts, vendored three.js
    atlas/content/             chapters, topics, glossary, tours and records
    atlas/physics.py           calculators that supply chart data

Output: one self-contained ``.html`` file that works offline.
"""
from __future__ import annotations

import base64
import json
import re
import sys
import time
from pathlib import Path

from . import physics
from .config import APP_SUBTITLE, APP_TITLE, DEFAULT_OUTPUT, PROCESSED_DIR, VERSION, WEB_DIR, source_credits
from .content import build_content
from .lint import scan
from .packread import read_json

PACK_NAMES = ("core", "imagery", "storms", "enso")


class BuildError(RuntimeError):
    pass


def _json_for_html(obj) -> str:
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _application_script() -> str:
    files = sorted((WEB_DIR / "js").glob("*.js"))
    if not files:
        raise BuildError(f"no scripts found in {WEB_DIR / 'js'}")
    parts = []
    for f in files:
        parts.append(f"/* ---- {f.name} ---- */\n{_read(f)}")
    return "\n".join(parts)


def _three_script() -> str:
    src = _read(WEB_DIR / "vendor" / "three.min.js")
    # The UMD build announces its own deprecation on load; the notice is irrelevant for an embedded copy.
    if src.startswith("console.warn("):
        end = src.index("),\n", 0)
        src = "void " + src[end + 3:].lstrip()
        src = src.rstrip().rstrip(";") + ";"
    return src


def _check_processed() -> dict:
    missing = [n for n in PACK_NAMES if not (PROCESSED_DIR / f"{n}.pack.gz").exists()]
    if missing:
        raise BuildError(
            "Processed data are missing (" + ", ".join(missing) + ").\n"
            "Run:  python build_atlas.py --refresh-data   (needs numpy, netCDF4 and Pillow; see requirements-data.txt)")
    manifest_path = PROCESSED_DIR / "manifest.json"
    return json.loads(_read(manifest_path)) if manifest_path.exists() else {}


_FLOWS = {"wind10", "wind850", "wind500", "wind250", "currents"}
_CONTOURS = {"isobars", "z500"}
_BASE = {"borders", "rivers", "graticule", "keylat"}


def _crosscheck(content: dict, app_js: str) -> None:
    """Make sure every chart, widget and layer a topic asks for exists in the application scripts."""
    charts = set(re.findall(r"A\.chartLib\.(\w+)\s*=", app_js))
    widgets = set(re.findall(r"A\.widgets\.(\w+)\s*=", app_js))
    layers = set(re.findall(r"(?<!\w)d\(\{\s*id:\s*'(\w+)'", app_js))
    problems = []
    for t in content["topics"]:
        for spec in t.get("charts", []):
            if spec.get("id") not in charts:
                problems.append(f"{t['id']}: unknown chart '{spec.get('id')}'")
        if t.get("widget") and t["widget"].split(":")[0] not in widgets:
            problems.append(f"{t['id']}: unknown widget '{t['widget']}'")
        sc = t.get("scene") or {}
        if sc.get("color") and sc["color"] not in layers:
            problems.append(f"{t['id']}: unknown colour layer '{sc['color']}'")
        for key, allowed in (("flows", _FLOWS), ("contours", _CONTOURS), ("base", _BASE)):
            for v in sc.get(key, []):
                if v not in allowed:
                    problems.append(f"{t['id']}: unknown {key} entry '{v}'")
    if problems:
        raise BuildError("content refers to things the page does not have:\n  " + "\n  ".join(problems))


def build(output: Path, *, quiet: bool = False) -> Path:
    started = time.time()
    log = (lambda m: None) if quiet else (lambda m: print(m, flush=True))
    manifest = _check_processed()

    series = read_json(PROCESSED_DIR / "core.pack.gz", "series")
    co2_trend = [v for v in series["co2"]["trend"] if v is not None]
    tables = physics.build_tables(co2_trend[-1])
    log(f"physics tables computed (CO2 {co2_trend[-1]:.1f} ppm)")

    storms_pack = PROCESSED_DIR / "storms.pack.gz"
    manifest = {**manifest, "tc": {"stats": read_json(storms_pack, "tc_stats"), "n": len(read_json(storms_pack, "tc_meta")["rows"])},
                "koppen": read_json(PROCESSED_DIR / "core.pack.gz", "koppen_classes")}
    content = build_content(series=series, tables=tables, manifest=manifest)
    log(f"content: {len(content['chapters'])} chapters, {len(content['topics'])} topics, {len(content['glossary'])} glossary terms")

    data = {
        "app": {"title": APP_TITLE, "subtitle": APP_SUBTITLE, "version": VERSION},
        **content,
        "tables": tables,
        "credits": source_credits(),
        "manifest": {"refreshed": manifest.get("refreshed", ""), "seriesEnd": manifest.get("seriesEnd", {}),
                     "ensoRecentMonths": manifest.get("ensoRecentMonths", [])},
    }
    data_json = _json_for_html(data)

    packs_html = []
    pack_bytes = 0
    for name in PACK_NAMES:
        raw = (PROCESSED_DIR / f"{name}.pack.gz").read_bytes()
        pack_bytes += len(raw)
        packs_html.append(f'<script id="pack-{name}" type="application/octet-stream">{base64.b64encode(raw).decode("ascii")}</script>')

    app_js = _application_script()
    _crosscheck(content, app_js)
    css = _read(WEB_DIR / "css" / "atlas.css")

    # quality gate on everything a reader can see (the packs and the vendored library are binary / third party)
    problems = scan(data_json, "content") + scan(css, "css") + scan(app_js, "script") + scan(_read(WEB_DIR / "template.html"), "template")
    if problems:
        raise BuildError("quality gate failed:\n  " + "\n  ".join(problems))

    html = _read(WEB_DIR / "template.html")
    # str.replace inserts the text verbatim (unlike re.sub), so backslashes in scripts survive intact
    for token, value in (
        ("@@TITLE@@", f"{APP_TITLE}: {APP_SUBTITLE}"),
        ("@@DESCRIPTION@@", "Explore how weather, ocean currents and climate work on an interactive 3D Earth built from real NOAA and NASA data."),
        ("@@APPNAME@@", APP_TITLE), ("@@CSS@@", css), ("@@DATA@@", data_json),
        ("@@PACKS@@", "\n".join(packs_html)), ("@@THREE@@", _three_script()), ("@@APP@@", app_js),
    ):
        if token not in html:
            raise BuildError(f"template token {token} not found")
        html = html.replace(token, value)

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    size = output.stat().st_size
    log(f"wrote {output}  ({size / 1e6:.1f} MB; data packs {pack_bytes / 1e6:.1f} MB gz) in {time.time() - started:.1f}s")
    return output


def check_file(path: Path) -> list[str]:
    """Run the quality gate on an existing page (data packs and the vendored library are skipped)."""
    text = Path(path).read_text(encoding="utf-8")
    text = re.sub(r'<script id="pack-[a-z]+" type="application/octet-stream">[^<]*</script>', "", text)
    text = re.sub(r"<script>((?:(?!</script>).)*?REVISION(?:(?!</script>).)*)</script>", "", text, flags=re.S)
    return scan(text, str(path))


def main(argv: list[str] | None = None) -> int:
    try:
        build(Path(argv[0]) if argv else DEFAULT_OUTPUT)
    except BuildError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0
