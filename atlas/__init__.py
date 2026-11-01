"""Atmosphere Atlas: builds a self-contained, interactive 4D guide to weather, oceans and climate.

The package is split into three layers:

``atlas.pipeline``
    Optional, heavy data preparation.  Downloads public datasets (NOAA, NASA, Natural Earth)
    and condenses them into the compact files stored in ``data/processed``.  Needs numpy,
    netCDF4 and Pillow.

``atlas.content``
    The educational material itself: chapters, topics, glossary, records and guided tours.

``atlas.assemble``
    Standard-library-only HTML generator.  Reads the processed data, runs the physics
    calculators, merges everything with the web front end (``atlas/web``) and writes one
    standalone ``.html`` file.
"""

__version__ = "1.5.0"
