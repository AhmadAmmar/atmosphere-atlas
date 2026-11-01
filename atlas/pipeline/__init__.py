"""Data preparation: turns public datasets into the compact files stored in ``data/processed``.

Run it through ``python build_atlas.py --refresh-data``.  Requires numpy, netCDF4 and Pillow
(see ``requirements-data.txt``).  Raw downloads are cached, so a second run is fast.
"""
