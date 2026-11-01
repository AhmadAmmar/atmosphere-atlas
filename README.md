# Atmosphere Atlas

An interactive 3D globe, which flattens to a map, that explains weather, oceans and climate to anyone, from a curious child to a graduate student. It has 13 chapters and 125 topics, with labs you can change and a guided tour.

**[Open the atlas](https://ahmadammar.github.io/atlas/)**. It runs in any modern browser with WebGL and needs no installation.

A Python program builds everything into one self-contained web page of about 11 MB, because the data travel inside it. It stands alone and can be used in any course. The same physics also appears in [The Atmosphere](https://ahmadammar.github.io/teaching/atmosphere/), a book worked step by step.

## Build

```
pip install -r requirements-data.txt
python build_atlas.py --refresh-data
python build_atlas.py --out atlas.html
```

The data packs are not stored here. `--refresh-data` downloads them again from the public sources credited inside the atlas. `python build_atlas.py --check atlas.html` scans a page for unfinished text.

## Licence

Code: MIT, see `LICENSE`. Data stay under their providers' licences, as credited on each topic. `atlas/web/vendor` holds third-party libraries under their own licences.
