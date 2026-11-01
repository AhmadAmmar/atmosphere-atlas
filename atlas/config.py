"""Paths, version and the catalogue of upstream data sources.

Every dataset the atlas touches is declared once in :data:`SOURCES`.  The same table drives
the downloader, the credits dialog shown inside the generated page, and the README.
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from . import __version__

PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = PACKAGE_DIR.parent
WEB_DIR = PACKAGE_DIR / "web"
DATA_DIR = PROJECT_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"
DEFAULT_OUTPUT = PROJECT_DIR / f"atmosphere_atlas_v{__version__}.html"      # each version has its own file, so earlier builds are never overwritten

VERSION = __version__
APP_TITLE = "Atmosphere Atlas"
APP_SUBTITLE = "An interactive 4D guide to weather, oceans and climate"


def default_cache_dir() -> Path:
    """Where raw downloads are kept (outside the project so cloud-synced folders stay small)."""
    override = os.environ.get("ATLAS_CACHE")
    if override:
        return Path(override).expanduser()
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / "atmosphere_atlas" / "cache"
    base = os.environ.get("XDG_CACHE_HOME") or str(Path.home() / ".cache")
    return Path(base) / "atmosphere_atlas"


@dataclass(frozen=True)
class Source:
    """One upstream dataset or published reference."""

    key: str
    title: str
    provider: str
    url: str
    credit: str
    used_for: str
    licence: str = "Open data"
    urls: dict = field(default_factory=dict)


PSL = "https://downloads.psl.noaa.gov/Datasets"
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"

SOURCES: dict[str, Source] = {s.key: s for s in [
    Source(
        "ncep_r1", "NCEP/NCAR Reanalysis 1, long-term monthly means 1991-2020",
        "NOAA Physical Sciences Laboratory", "https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.derived.html",
        "Kalnay, E. et al. (1996) The NCEP/NCAR 40-year reanalysis project. Bull. Amer. Meteor. Soc. 77, 437-471.",
        "Sea-level pressure, winds at 10 m and on pressure levels, 2 m temperature, cloud cover, "
        "precipitable water, geopotential height, zonal-mean circulation and mass streamfunction.",
        "Public domain (US Government)",
        {
            "slp": f"{PSL}/ncep.reanalysis.derived/surface/slp.mon.ltm.1991-2020.nc",
            "pr_wtr": f"{PSL}/ncep.reanalysis.derived/surface/pr_wtr.eatm.mon.ltm.1991-2020.nc",
            "pres_sfc": f"{PSL}/ncep.reanalysis.derived/surface_gauss/pres.sfc.mon.ltm.1991-2020.nc",
            "u10": f"{PSL}/ncep.reanalysis.derived/surface_gauss/uwnd.10m.mon.ltm.1991-2020.nc",
            "v10": f"{PSL}/ncep.reanalysis.derived/surface_gauss/vwnd.10m.mon.ltm.1991-2020.nc",
            "t2m": f"{PSL}/ncep.reanalysis.derived/surface_gauss/air.2m.mon.ltm.1991-2020.nc",
            "tcdc": f"{PSL}/ncep.reanalysis.derived/other_gauss/tcdc.eatm.mon.ltm.1991-2020.nc",
            "uwnd": f"{PSL}/ncep.reanalysis.derived/pressure/uwnd.mon.ltm.1991-2020.nc",
            "vwnd": f"{PSL}/ncep.reanalysis.derived/pressure/vwnd.mon.ltm.1991-2020.nc",
            "air": f"{PSL}/ncep.reanalysis.derived/pressure/air.mon.ltm.1991-2020.nc",
            "hgt": f"{PSL}/ncep.reanalysis.derived/pressure/hgt.mon.ltm.1991-2020.nc",
            "omega": f"{PSL}/ncep.reanalysis.derived/pressure/omega.mon.ltm.1991-2020.nc",
            "shum": f"{PSL}/ncep.reanalysis.derived/pressure/shum.mon.ltm.1991-2020.nc",
            "slp_mean": f"{PSL}/ncep.reanalysis.derived/surface/slp.mon.mean.nc",
            "t2m_mean": f"{PSL}/ncep.reanalysis.derived/surface_gauss/air.2m.mon.mean.nc",
        }),
    Source(
        "ncep_r1_pl", "NCEP/NCAR Reanalysis 1, monthly means on pressure levels (OPeNDAP subset)",
        "NOAA Physical Sciences Laboratory", "https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.derived.html",
        "Kalnay, E. et al. (1996) Bull. Amer. Meteor. Soc. 77, 437-471.",
        "Equatorial zonal wind and vertical motion by ENSO phase (Walker circulation).",
        "Public domain (US Government)",
        {
            "uwnd": f"{PSL}/ncep.reanalysis.derived/pressure/uwnd.mon.mean.nc",
            "omega": f"{PSL}/ncep.reanalysis.derived/pressure/omega.mon.mean.nc",
        }),
    Source(
        "gpcp", "GPCP Version 2.3 monthly precipitation (satellite-gauge), 1991-2020 climatology",
        "NOAA Physical Sciences Laboratory / NASA GSFC", "https://psl.noaa.gov/data/gridded/data.gpcp.html",
        "Adler, R.F. et al. (2018) The Global Precipitation Climatology Project (GPCP) Monthly Analysis (New Version 2.3). Atmosphere 9(4), 138.",
        "Rainfall climatology and El Nino / La Nina rainfall anomalies.",
        "Open data (NASA / NOAA)",
        {
            "ltm": f"{PSL}/gpcp/precip.mon.ltm.1991-2020.nc",
            "mean": f"{PSL}/gpcp/precip.mon.mean.nc",
        }),
    Source(
        "olr", "NOAA Interpolated Outgoing Longwave Radiation, 1991-2020 climatology",
        "NOAA Physical Sciences Laboratory", "https://psl.noaa.gov/data/gridded/data.interp_OLR.html",
        "Liebmann, B. and Smith, C.A. (1996) Description of a complete (interpolated) outgoing longwave radiation dataset. Bull. Amer. Meteor. Soc. 77, 1275-1277.",
        "Deep-convection index: low OLR marks towering tropical cloud.",
        "Public domain (US Government)",
        {"ltm": f"{PSL}/interp_OLR/olr.mon.ltm.1991-2020.nc"}),
    Source(
        "oisst", "NOAA Optimum Interpolation SST v2 (1 degree), 1991-2020 climatology",
        "NOAA Physical Sciences Laboratory", "https://psl.noaa.gov/data/gridded/data.noaa.oisst.v2.html",
        "Reynolds, R.W. et al. (2002) An improved in situ and satellite SST analysis for climate. J. Climate 15, 1609-1625.",
        "Sea-surface temperature and sea-ice concentration.",
        "Public domain (US Government)",
        {
            "sst": f"{PSL}/noaa.oisst.v2/sst.ltm.1991-2020.nc",
            "icec": f"{PSL}/noaa.oisst.v2/icec.ltm.1991-2020.nc",
            "lsmask": f"{PSL}/noaa.oisst.v2/lsmask.nc",
        }),
    Source(
        "ersst5", "NOAA Extended Reconstructed SST v5 (2 degree), 1854-present",
        "NOAA NCEI via NOAA PSL", "https://www.ncei.noaa.gov/products/extended-reconstructed-sst",
        "Huang, B. et al. (2017) Extended Reconstructed Sea Surface Temperature, Version 5 (ERSSTv5). J. Climate 30, 8179-8205.",
        "El Nino / La Nina composites, the monthly tropical-Pacific time machine, and the long-term SST trend map.",
        "Public domain (US Government)",
        {"mean": f"{PSL}/noaa.ersst.v5/sst.mnmean.nc"}),
    Source(
        "oscar", "OSCAR near-surface ocean currents (1/3 degree, 5-day), 2012-2013",
        "Earth & Space Research via NOAA CoastWatch ERDDAP", "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplOscar.html",
        "Bonjean, F. and Lagerloef, G.S.E. (2002) Diagnostic model and analysis of the surface currents in the tropical Pacific Ocean. J. Phys. Oceanogr. 32, 2938-2954.",
        "Gulf Stream, Kuroshio, Antarctic Circumpolar Current and every other surface current.",
        "Free to use and redistribute",
        {"erddap": "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplOscar.nc"}),
    Source(
        "udel", "University of Delaware Air Temperature & Precipitation v5.01, 1981-2010 climatology (0.5 degree)",
        "NOAA Physical Sciences Laboratory", "https://psl.noaa.gov/data/gridded/data.UDel_AirT_Precip.html",
        "Willmott, C.J. and Matsuura, K. (2001) Terrestrial air temperature and precipitation: monthly and annual time series (1950-1999).",
        "Station-based land climate used to compute the Koppen-Geiger climate zones.",
        "Public domain (US Government)",
        {
            "air": f"{PSL}/udel.airt.precip/air.mon.v501.ltm.1981-2010.nc",
            "precip": f"{PSL}/udel.airt.precip/precip.mon.v501.ltm.1981-2010.nc",
        }),
    Source(
        "ibtracs", "IBTrACS v04r01 tropical-cyclone best tracks",
        "NOAA National Centers for Environmental Information", "https://www.ncei.noaa.gov/products/international-best-track-archive",
        "Knapp, K.R. et al. (2010) The International Best Track Archive for Climate Stewardship (IBTrACS). Bull. Amer. Meteor. Soc. 91, 363-376.",
        "Every tropical cyclone track, intensity statistics and the storm hall of fame.",
        "Public domain (US Government)",
        {
            "all": "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.ALL.list.v04r01.csv",
            "recent": "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.last3years.list.v04r01.csv",
        }),
    Source(
        "enso_indices", "ENSO and teleconnection indices (ONI, Nino 3.4, SOI, NAO, AO, AAO, PDO, AMO, PNA, QBO, DMI)",
        "NOAA Climate Prediction Center and NOAA PSL", "https://psl.noaa.gov/data/climateindices/list/",
        "Rayner, N.A. et al. (2003) Global analyses of SST, sea ice and night marine air temperature since the late nineteenth century. J. Geophys. Res. 108, 4407 (Nino 3.4 from HadISST).",
        "Climate-mode time series and event classification.",
        "Public domain (US Government)",
        {
            "oni": "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
            "nino34": "https://psl.noaa.gov/data/correlation/nina34.anom.data",
            "soi": "https://psl.noaa.gov/data/correlation/soi.data",
            "nao": "https://psl.noaa.gov/data/correlation/nao.data",
            "ao": "https://psl.noaa.gov/data/correlation/ao.data",
            "aao": "https://psl.noaa.gov/data/correlation/aao.data",
            "pdo": "https://psl.noaa.gov/data/correlation/pdo.data",
            "amo": "https://psl.noaa.gov/data/correlation/amon.us.data",
            "pna": "https://psl.noaa.gov/data/correlation/pna.data",
            "qbo": "https://psl.noaa.gov/data/correlation/qbo.data",
            "dmi": "https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data",
        }),
    Source(
        "gistemp", "GISS Surface Temperature Analysis (GISTEMP v4)",
        "NASA Goddard Institute for Space Studies", "https://data.giss.nasa.gov/gistemp/",
        "GISTEMP Team; Lenssen, N. et al. (2019) Improvements in the GISTEMP uncertainty model. J. Geophys. Res. Atmos. 124, 6307-6326.",
        "Global mean temperature anomaly since 1880.",
        "Open data (NASA)",
        {"global": "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"}),
    Source(
        "mauna_loa", "Mauna Loa monthly mean atmospheric CO2",
        "NOAA Global Monitoring Laboratory", "https://gml.noaa.gov/ccgg/trends/",
        "Keeling, C.D. et al.; Lan, X. et al., NOAA Global Monitoring Laboratory.",
        "The Keeling curve.",
        "Public domain (US Government)",
        {"monthly": "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv"}),
    Source(
        "icecores", "Antarctic ice-core temperature and carbon dioxide, last 800,000 years",
        "NOAA National Centers for Environmental Information, World Data Service for Paleoclimatology", "https://www.ncei.noaa.gov/products/paleoclimatology",
        "Jouzel, J. et al. (2007) Orbital and millennial Antarctic climate variability over the past 800,000 years. Science 317, 793-796; Bereiter, B. et al. (2015) Revision of the EPICA Dome C CO2 record from 800 to 600 kyr before present. Geophys. Res. Lett. 42, 542-549.",
        "The ice ages and the carbon dioxide record that goes with them.",
        "Public domain (US Government)",
        {
            "co2": "https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite.txt",
            "temp": "https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007.txt",
        }),
    Source(
        "nsidc", "Sea Ice Index v4 daily extent",
        "National Snow and Ice Data Center", "https://nsidc.org/data/g02135",
        "Fetterer, F. et al. (2017, updated daily) Sea Ice Index, Version 4. NSIDC.",
        "Arctic and Antarctic sea-ice extent.",
        "Open data (NSIDC)",
        {
            "north": "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv",
            "south": "https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v4.0.csv",
        }),
    Source(
        "sea_level", "Global mean sea level from satellite altimetry",
        "NOAA / NESDIS STAR Laboratory for Satellite Altimetry", "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/",
        "NOAA Laboratory for Satellite Altimetry.",
        "Global mean sea-level rise since 1993.",
        "Public domain (US Government)",
        {"gmsl": "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_all_66.csv"}),
    Source(
        "rapid", "RAPID-MOCHA array: Atlantic Meridional Overturning Circulation at 26.5 N",
        "National Oceanography Centre (UK), University of Miami and NOAA AOML", "https://rapid.ac.uk/data/data-download",
        "Moat, B.I. et al. RAPID-MOCHA-WBTS array data; Smeed, D.A. et al. (2018) The North Atlantic Ocean is in a state of reduced overturning. Geophys. Res. Lett. 45, 1527-1533.",
        "Direct measurement of the Atlantic overturning circulation since 2004.",
        "Open data (UK NERC / US NSF-NOAA)",
        {"transports": "https://rapid.ac.uk/sites/default/files/rapid_data/moc_transports.nc"}),
    Source(
        "bmng", "Blue Marble: Next Generation (monthly, 2004)",
        "NASA Earth Observatory / NASA GIBS", "https://visibleearth.nasa.gov/collection/1484/blue-marble",
        "Stockli, R. et al. (2005) The Blue Marble Next Generation: a true colour Earth dataset including seasonal dynamics from MODIS. NASA Earth Observatory.",
        "Day-side imagery, including seasonal snow and vegetation.",
        "Public domain (NASA)",
        {"wms": "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"}),
    Source(
        "black_marble", "Black Marble night-time lights (VIIRS)",
        "NASA Earth Observatory / NASA GIBS", "https://earthobservatory.nasa.gov/features/NightLights",
        "Roman, M.O. et al. (2018) NASA's Black Marble nighttime lights product suite. Remote Sens. Environ. 210, 113-143.",
        "Night-side city lights.",
        "Public domain (NASA)",
        {"wms": "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"}),
    Source(
        "natural_earth", "Natural Earth vector map data",
        "Natural Earth", "https://www.naturalearthdata.com/",
        "Made with Natural Earth. Free vector and raster map data.",
        "Coastlines, borders, lakes, rivers, ocean names and cities.",
        "Public domain",
        {
            "land": f"{NE}/ne_50m_land.geojson",
            "coast": f"{NE}/ne_50m_coastline.geojson",
            "borders": f"{NE}/ne_50m_admin_0_boundary_lines_land.geojson",
            "lakes": f"{NE}/ne_50m_lakes.geojson",
            "rivers": f"{NE}/ne_50m_rivers_lake_centerlines.geojson",
            "marine": f"{NE}/ne_110m_geography_marine_polys.geojson",
            "places": f"{NE}/ne_50m_populated_places_simple.geojson",
            "regions": f"{NE}/ne_50m_geography_regions_points.geojson",
        }),
    Source(
        "three", "three.js r159 (WebGL library)",
        "three.js authors", "https://threejs.org/",
        "Copyright 2010-2023 three.js authors. MIT licence.",
        "3D rendering of the globe.",
        "MIT",
        {"js": "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js"}),
    Source(
        "trenberth", "Earth's global energy budget",
        "Published figures", "https://doi.org/10.1175/2008BAMS2634.1",
        "Trenberth, K.E., Fasullo, J.T. and Kiehl, J. (2009) Earth's global energy budget. Bull. Amer. Meteor. Soc. 90, 311-323.",
        "Energy-budget diagram values.",
        "Published numbers, cited",
        {}),
    Source(
        "wmo_records", "WMO Archive of Weather and Climate Extremes",
        "World Meteorological Organization", "https://wmo.int/weather-and-climate-extremes-archive",
        "WMO Archive of Weather and Climate Extremes (verified records).",
        "World weather records.",
        "Published records, cited",
        {}),
    Source(
        "us_standard_atmosphere", "U.S. Standard Atmosphere, 1976",
        "NOAA / NASA / USAF", "https://ntrs.nasa.gov/citations/19770009539",
        "NOAA, NASA and USAF (1976) U.S. Standard Atmosphere, 1976. NOAA-S/T 76-1562.",
        "Temperature, pressure and density against height (computed in the build step).",
        "Public domain (US Government)",
        {}),
]}


def source_credits() -> list[dict]:
    """Serialisable credit rows for the in-page 'Data and credits' dialog."""
    rows = []
    for s in SOURCES.values():
        rows.append({
            "key": s.key, "title": s.title, "provider": s.provider, "url": s.url,
            "credit": s.credit, "usedFor": s.used_for, "licence": s.licence,
        })
    return rows
