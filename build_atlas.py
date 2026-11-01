#!/usr/bin/env python3
"""Atmosphere Atlas: builds one standalone, offline HTML page that explains weather, oceans and climate.

    python build_atlas.py                    build atmosphere_atlas_v<version>.html from the bundled data
    python build_atlas.py --out my.html      choose the output file
    python build_atlas.py --refresh-data     download the public datasets again and rebuild the data packs
    python build_atlas.py --check page.html  scan an existing page for unfinished text and stray signatures

See README.md for the architecture, the list of data sources and how every part works.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Build the Atmosphere Atlas web page.")
    parser.add_argument("--out", type=Path, help="output HTML file (default: atmosphere_atlas_v<version>.html next to this script)")
    parser.add_argument("--refresh-data", action="store_true", help="download the source datasets again and rebuild data/processed")
    parser.add_argument("--steps", default="core,imagery,storms,enso", help="data packs to rebuild with --refresh-data (comma separated)")
    parser.add_argument("--cache-dir", type=Path, help="where raw downloads are kept (default: a per-user cache folder)")
    parser.add_argument("--check", type=Path, help="scan an existing HTML page for placeholders and signatures, then exit")
    parser.add_argument("--quiet", action="store_true", help="print less")
    args = parser.parse_args(argv)

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from atlas import assemble
    from atlas.config import DEFAULT_OUTPUT, default_cache_dir

    if args.check:
        problems = assemble.check_file(args.check)
        for p in problems:
            print("  " + p)
        print("clean" if not problems else f"{len(problems)} problem(s) found")
        return 1 if problems else 0

    if args.refresh_data:
        from atlas.pipeline import run
        cache = args.cache_dir or default_cache_dir()
        steps = tuple(s.strip() for s in args.steps.split(",") if s.strip())
        print(f"downloading into {cache}")
        run.refresh(cache, steps=steps)

    try:
        assemble.build(args.out or DEFAULT_OUTPUT, quiet=args.quiet)
    except assemble.BuildError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
