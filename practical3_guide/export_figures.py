"""Exports every picture of practical3_guide.tex as a tightly cropped PNG (for the slide deck).

    python export_figures.py          writes slides_assets/figs/<chapter>_<n>.png and slides_assets/figs/manifest.json

The same TikZ code that makes the PDF makes these pictures: the `preview` package turns each picture into its own page. The pictures are
renamed `mypic` in a scratch copy of the sources so that the frames that tcolorbox draws are not exported as well.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "slides_assets" / "figs"
ASSETS.mkdir(parents=True, exist_ok=True)
PV = HERE / "_pv"
if PV.exists():
    shutil.rmtree(PV)
PV.mkdir()
shutil.copytree(HERE / "generated", PV / "generated")

BEGIN = "\\begin{tikzpicture}"
END = "\\end{tikzpicture}"
for f in HERE.glob("*.tex"):
    if f.name.startswith(("t_", "preview")) or f.name == "practical3_guide.tex":
        continue
    text = f.read_text(encoding="utf-8")
    text = text.replace(BEGIN, "\\begin{mypic}").replace(END, "\\end{mypic}")
    (PV / f.name).write_text(text, encoding="utf-8", newline="\n")

main = (HERE / "practical3_guide.tex").read_text(encoding="utf-8")
body = main.split("\\begin{document}", 1)[1]
header = (
    "\\documentclass[a4paper,11pt,twoside,openany]{book}\n"
    "\\input{preamble}\n"
    "\\usepackage[active,tightpage]{preview}\n"
    "\\newenvironment{mypic}[1][]{\\tikzpicture[#1]}{\\endtikzpicture}\n"
    "\\PreviewEnvironment{mypic}\n"
    "\\setlength\\PreviewBorder{4pt}\n"
    "\\renewcommand{\\caption}[2][]{}\n"
    "\\begin{document}\n")
(PV / "preview_figs.tex").write_text(header + body, encoding="utf-8", newline="\n")

# every picture, in document order: tikzpicture environments and the two macros that make one
names = []
order = ["titlepage"] + re.findall(r"\\input\{(ch\d+_\w+)\}", main) + re.findall(r"\\input\{(app_\w+)\}", main)
for chap in order:
    text = (HERE / f"{chap}.tex").read_text(encoding="utf-8")
    text = re.sub(r"\\newcommand\{\\modelpic\}\[2\]\{.*?\}\n", "", text)          # the macro definition is not a picture
    n = 0
    for m in re.finditer(r"\\begin\{tikzpicture\}|\\mapbase\{|\\modelpic\{", text):
        n += 1
        after = text[m.start(): m.start() + 6000]
        cap = re.search(r"\\caption\{(.*?)\}", after, re.S)
        end_fig = after.find("\\end{figure}")
        caption = ""
        if cap and (end_fig < 0 or cap.start() < end_fig):
            caption = re.sub(r"\s+", " ", cap.group(1))[:110]
        names.append({"chapter": chap, "n": n, "caption": caption})

r = subprocess.run(["pdflatex", "-interaction=nonstopmode", "preview_figs.tex"], cwd=PV, capture_output=True, text=True)
print(r.stdout[-300:])
pdf = PV / "preview_figs.pdf"
info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout
pages = int(re.search(r"Pages:\s+(\d+)", info).group(1))
print("pictures in the document:", len(names), "pages in preview:", pages)
assert len(names) == pages, "picture count differs from page count"
for old in ASSETS.glob("*.png"):
    old.unlink()
subprocess.run(["pdftoppm", "-r", "170", "-png", str(pdf), str(ASSETS / "p")], check=True)
files = sorted(ASSETS.glob("p-*.png"))
manifest = []
for f, meta in zip(files, names):
    new = ASSETS / f"{meta['chapter'].split('_')[0]}_{meta['n']:02d}.png"
    f.replace(new)
    manifest.append({**meta, "file": new.name})
json.dump(manifest, open(ASSETS / "manifest.json", "w", encoding="utf-8"), indent=1)
print("exported", len(manifest))
