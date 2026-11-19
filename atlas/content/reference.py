"""Reference lists that the topics and the globe draw on (records, named winds, currents, rivers ...).

Only well-established, citable facts are listed.  Values that come from the downloaded datasets
(the latest CO2, global temperature, ENSO index ...) are filled in at build time through <<tokens>>.
"""
from __future__ import annotations

from .model import Topic

# ----------------------------------------------------------------------------- world records
RECORDS = [
    {"id": "hot", "title": "Highest air temperature", "value": "56.7 °C (134 °F)",
     "where": "Furnace Creek, Death Valley, California, USA", "when": "10 July 1913", "lon": -116.87, "lat": 36.46,
     "note": "The WMO-recognised world record. Dry desert air, a deep basin far below sea level and clear skies combine to trap heat."},
    {"id": "cold", "title": "Lowest air temperature", "value": "−89.2 °C (−128.6 °F)",
     "where": "Vostok Station, Antarctica", "when": "21 July 1983", "lon": 106.84, "lat": -78.46,
     "note": "At 3,488 m on the East Antarctic plateau, in polar night, with dry thin air and a snow surface that radiates heat to space."},
    {"id": "highp", "title": "Highest sea-level pressure", "value": "1085.7 hPa",
     "where": "Tosontsengel, Mongolia", "when": "19 December 2001", "lon": 98.27, "lat": 48.77,
     "note": "Deep, cold, dense air under the Siberian High. The value is reduced to sea level from a station at about 1,700 m."},
    {"id": "lowp", "title": "Lowest sea-level pressure", "value": "870 hPa",
     "where": "Eye of Typhoon Tip, western Pacific", "when": "12 October 1979", "storm": "Tip", "lon": 137.8, "lat": 16.7,
     "note": "Measured by a reconnaissance aircraft. It is about 14% below normal sea-level pressure."},
    {"id": "gust", "title": "Highest surface wind gust (not a tornado)", "value": "113.3 m/s (408 km/h)",
     "where": "Barrow Island, Western Australia", "when": "10 April 1996", "lon": 115.4, "lat": -20.8,
     "note": "Recorded in Tropical Cyclone Olivia, during the passage of the eyewall."},
    {"id": "tornado", "title": "Fastest wind measured in a tornado", "value": "about 484 km/h (301 mph)",
     "where": "Bridge Creek–Moore, Oklahoma, USA", "when": "3 May 1999", "lon": -97.65, "lat": 35.28,
     "note": "Measured with a mobile Doppler radar about 100 m above the ground (uncertainty about ±32 km/h)."},
    {"id": "rain24", "title": "Most rain in 24 hours", "value": "1,825 mm",
     "where": "Foc-Foc, La Réunion (Indian Ocean)", "when": "7–8 January 1966", "lon": 55.68, "lat": -21.2,
     "note": "Fell during Tropical Cyclone Denise, with mountain slopes forcing the moist air upward."},
    {"id": "rain1", "title": "Most rain in one minute", "value": "31.2 mm",
     "where": "Unionville, Maryland, USA", "when": "4 July 1956", "lon": -77.3, "lat": 39.3,
     "note": "A thunderstorm cloudburst: more than a standard rain gauge holds in a few seconds."},
    {"id": "wet", "title": "One of the wettest places on Earth", "value": "about 11,900 mm per year",
     "where": "Mawsynram, Meghalaya, India", "when": "annual average", "lon": 91.58, "lat": 25.3,
     "note": "Monsoon air from the Bay of Bengal is forced up the Khasi Hills."},
    {"id": "dry", "title": "One of the driest places on Earth", "value": "less than 1 mm per year",
     "where": "Arica, Atacama Desert, Chile", "when": "long-term average", "lon": -70.31, "lat": -18.48,
     "note": "Cold Humboldt Current water and the Andes rain shadow suppress almost all rain."},
    {"id": "hail", "title": "Heaviest hailstone (measured)", "value": "0.88 kg, 20.3 cm across",
     "where": "Vivian, South Dakota, USA", "when": "23 July 2010", "lon": -99.65, "lat": 43.77,
     "note": "Strong updrafts in a supercell kept the hailstone growing for many minutes."},
    {"id": "snow", "title": "Most snow in a season", "value": "28.96 m (1,140 in)",
     "where": "Mount Baker Ski Area, Washington, USA", "when": "winter 1998–99", "lon": -121.69, "lat": 48.86,
     "note": "Moist Pacific air rising over the Cascades turns to snow."},
    {"id": "fall", "title": "Greatest 24-hour temperature drop", "value": "55.5 °C",
     "where": "Browning, Montana, USA", "when": "23–24 January 1916", "lon": -113.02, "lat": 48.56,
     "note": "A warm chinook wind was replaced by Arctic air, and temperature fell from 6.7 °C to −48.8 °C."},
    {"id": "tcsize", "title": "Largest tropical cyclone", "value": "2,170 km across (gale-force winds)",
     "where": "Typhoon Tip, western Pacific", "when": "October 1979", "storm": "Tip", "lon": 137.8, "lat": 16.7,
     "note": "Roughly the distance from London to Athens."},
    {"id": "tclong", "title": "Longest-lived tropical cyclone", "value": "36 days",
     "where": "Cyclone Freddy, Indian Ocean to Mozambique and back", "when": "February–March 2023", "storm": "Freddy",
     "lon": 40.0, "lat": -17.5,
     "note": "Verified by the WMO. The previous record was 31 days for Hurricane/Typhoon John in 1994."},
]

# ----------------------------------------------------------------------------- semi-permanent pressure systems
PRESSURE_CENTRES = [
    {"name": "Azores High", "lon": -30, "lat": 33, "high": True},
    {"name": "North Pacific High", "lon": -140, "lat": 35, "high": True},
    {"name": "Siberian High", "lon": 95, "lat": 50, "high": True},
    {"name": "St Helena High", "lon": -8, "lat": -30, "high": True},
    {"name": "South Pacific High", "lon": -105, "lat": -32, "high": True},
    {"name": "Mascarene High", "lon": 70, "lat": -32, "high": True},
    {"name": "Arctic High", "lon": -150, "lat": 80, "high": True},
    {"name": "Antarctic High", "lon": 90, "lat": -80, "high": True},
    {"name": "Icelandic Low", "lon": -30, "lat": 62, "high": False},
    {"name": "Aleutian Low", "lon": -170, "lat": 52, "high": False},
    {"name": "Asian monsoon low", "lon": 70, "lat": 28, "high": False},
    {"name": "Sonoran heat low", "lon": -112, "lat": 33, "high": False},
    {"name": "Australian heat low", "lon": 135, "lat": -22, "high": False},
    {"name": "Saharan heat low", "lon": 5, "lat": 22, "high": False},
    {"name": "Amundsen Sea Low", "lon": -110, "lat": -68, "high": False},
    {"name": "Weddell Sea Low", "lon": -40, "lat": -66, "high": False},
]

# ----------------------------------------------------------------------------- named local winds
NAMED_WINDS = [
    {"name": "Mistral", "lon": 4.8, "lat": 43.7, "kind": "cold downslope", "text": "A cold, dry, northerly gale funnelled down the Rhône valley into the Mediterranean; it can exceed 100 km/h."},
    {"name": "Bora", "lon": 14.0, "lat": 45.6, "kind": "cold downslope", "text": "A gusty cold wind from the north-east spilling off the Dinaric Alps onto the Adriatic coast."},
    {"name": "Föhn", "lon": 11.4, "lat": 47.3, "kind": "warm downslope", "text": "Air that has dropped its moisture crossing the Alps and then warms as it descends the lee side, melting snow within hours."},
    {"name": "Chinook", "lon": -114.0, "lat": 50.5, "kind": "warm downslope", "text": "The 'snow eater' of the Rockies: a warm dry westerly that can lift temperatures by 20 °C or more in an hour."},
    {"name": "Santa Ana", "lon": -117.5, "lat": 34.0, "kind": "dry offshore", "text": "A hot dry offshore wind that blows from the Great Basin through southern California passes, driving wildfire spread in autumn."},
    {"name": "Sirocco", "lon": 13.0, "lat": 37.0, "kind": "hot southerly", "text": "A hot southerly wind that carries Saharan dust and heat across the Mediterranean ahead of low-pressure systems."},
    {"name": "Harmattan", "lon": -2.0, "lat": 11.0, "kind": "dry trade wind", "text": "A dry, dusty north-easterly from the Sahara over West Africa between November and March, reducing visibility and humidity."},
    {"name": "Shamal", "lon": 50.0, "lat": 28.0, "kind": "northwesterly", "text": "A strong north-westerly over Iraq and the Persian Gulf, often with dust storms, strongest in summer and winter."},
    {"name": "Loo", "lon": 77.0, "lat": 28.0, "kind": "hot dry", "text": "A scorching westerly over the plains of northern India and Pakistan in May and June."},
    {"name": "Zonda", "lon": -68.0, "lat": -33.0, "kind": "warm downslope", "text": "The Argentine föhn: hot dry air descending the eastern side of the Andes."},
    {"name": "Pampero", "lon": -60.0, "lat": -35.0, "kind": "cold southwesterly", "text": "A cold squally south-westerly sweeping across the pampas behind a cold front."},
    {"name": "Southerly Buster", "lon": 151.0, "lat": -34.0, "kind": "cold change", "text": "A sudden cold southerly that drops temperature in minutes along the south-eastern Australian coast."},
    {"name": "Fremantle Doctor", "lon": 115.8, "lat": -32.0, "kind": "sea breeze", "text": "The cooling afternoon sea breeze that rescues Perth from summer heat."},
    {"name": "Cape Doctor", "lon": 18.4, "lat": -34.0, "kind": "south-easterly", "text": "A strong south-easterly in Cape Town's summer that blows pollution away."},
    {"name": "Berg wind", "lon": 25.0, "lat": -33.0, "kind": "hot offshore", "text": "A hot dry wind that blows from the interior plateau of South Africa down to the coast."},
    {"name": "Meltemi", "lon": 25.0, "lat": 37.0, "kind": "summer northerly", "text": "A persistent dry northerly across the Aegean in summer, caused by the pressure gap between the Azores High and the Asian monsoon low."},
    {"name": "Khamsin", "lon": 31.0, "lat": 30.0, "kind": "hot dusty", "text": "A hot dry southerly in Egypt in spring that carries sand and dust ahead of depressions."},
    {"name": "Nor'wester", "lon": 172.0, "lat": -43.5, "kind": "warm downslope", "text": "New Zealand's föhn: warm dry air descending the Southern Alps onto Canterbury."},
    {"name": "Sundowner", "lon": -119.7, "lat": 34.5, "kind": "dry downslope", "text": "A hot dry evening wind descending the Santa Ynez Mountains toward Santa Barbara."},
    {"name": "Katabatic wind of Adélie Land", "lon": 142.7, "lat": -67.0, "kind": "katabatic", "text": "Cold dense air draining off the Antarctic ice sheet makes this coast among the windiest places at sea level."},
]

# ----------------------------------------------------------------------------- ocean currents
CURRENTS = [
    {"name": "Gulf Stream", "lon": -72, "lat": 36, "warm": True, "text": "Carries warm tropical water northward from the Gulf of Mexico; about 31 Sv pass through the Florida Straits and the flow grows several-fold downstream."},
    {"name": "North Atlantic Current", "lon": -35, "lat": 51, "warm": True, "text": "The Gulf Stream's northeastward continuation, bringing mild water towards Europe."},
    {"name": "Kuroshio", "lon": 142, "lat": 33, "warm": True, "text": "The Pacific's Gulf Stream, flowing northeastward past Japan."},
    {"name": "Agulhas Current", "lon": 32, "lat": -32, "warm": True, "text": "A fast, narrow warm current along South Africa's east coast."},
    {"name": "Brazil Current", "lon": -40, "lat": -25, "warm": True, "text": "The warm western boundary current of the South Atlantic gyre."},
    {"name": "East Australian Current", "lon": 153, "lat": -30, "warm": True, "text": "Warm water flowing south along Australia's east coast."},
    {"name": "Labrador Current", "lon": -55, "lat": 52, "warm": False, "text": "Cold water from the Arctic flowing south, carrying icebergs towards Newfoundland."},
    {"name": "Oyashio", "lon": 146, "lat": 44, "warm": False, "text": "Cold, nutrient-rich water flowing south past Kamchatka and the Kurils."},
    {"name": "California Current", "lon": -125, "lat": 35, "warm": False, "text": "Cold water flowing south along the US west coast with coastal upwelling."},
    {"name": "Canary Current", "lon": -20, "lat": 25, "warm": False, "text": "Cold water flowing south along north-west Africa."},
    {"name": "Humboldt (Peru) Current", "lon": -80, "lat": -15, "warm": False, "text": "Cold water flowing north along South America with some of the world's richest fisheries."},
    {"name": "Benguela Current", "lon": 10, "lat": -27, "warm": False, "text": "Cold water flowing north along south-west Africa."},
    {"name": "Antarctic Circumpolar Current", "lon": 0, "lat": -56, "warm": False, "text": "The largest current on Earth: it circles Antarctica, driven by the westerlies, carrying roughly 130 to 170 Sv."},
]

# ----------------------------------------------------------------------------- the global conveyor (schematic, after Broecker 1987 and Rahmstorf 2002)
CONVEYOR = [
    {"kind": "warm", "width": 5, "name": "Warm surface water to the North Atlantic", "pts": [
        [-150, 0], [-180, 0], [160, 0], [140, 3], [128, 2], [120, -8], [110, -12], [85, -20], [60, -30], [40, -35], [25, -37], [10, -33], [0, -20],
        [-15, -5], [-30, 5], [-50, 10], [-68, 14], [-80, 24], [-78, 29], [-70, 36], [-55, 42], [-40, 48], [-25, 55], [-15, 60], [0, 64], [8, 70], [10, 74]]},
    {"kind": "cold", "width": 5, "name": "Deep North Atlantic water flowing south", "pts": [
        [10, 74], [-10, 68], [-25, 63], [-35, 55], [-45, 45], [-55, 35], [-60, 25], [-58, 10], [-45, 5], [-32, -8], [-33, -25], [-30, -40], [-10, -55]]},
    {"kind": "cold", "width": 4, "name": "Antarctic Circumpolar Current", "pts": [
        [-10, -55], [20, -58], [60, -56], [100, -56], [140, -58], [175, -60], [-160, -62], [-130, -58], [-100, -58], [-70, -58], [-55, -55], [-30, -52], [-10, -55]]},
    {"kind": "cold", "width": 3, "name": "Deep water into the Indian Ocean", "pts": [[60, -56], [70, -42], [78, -20], [80, -4]]},
    {"kind": "cold", "width": 3, "name": "Deep water into the Pacific Ocean", "pts": [[175, -60], [-170, -45], [-160, -25], [-150, 0], [-150, 20], [-150, 40]]},
    {"kind": "cold", "width": 3, "name": "Antarctic Bottom Water from the Weddell Sea", "pts": [[-40, -72], [-38, -62], [-30, -52]]},
    {"kind": "cold", "width": 3, "name": "Antarctic Bottom Water from the Ross Sea", "pts": [[-175, -75], [-172, -66], [-165, -60]]},
]
CONVEYOR_SITES = [
    {"name": "Nordic Seas: water sinks", "lon": 5, "lat": 72, "type": "sink"},
    {"name": "Labrador Sea: water sinks", "lon": -52, "lat": 58, "type": "sink"},
    {"name": "Weddell Sea: bottom water forms", "lon": -40, "lat": -72, "type": "sink"},
    {"name": "Ross Sea: bottom water forms", "lon": -175, "lat": -75, "type": "sink"},
    {"name": "Deep water rises in the Indian Ocean", "lon": 80, "lat": -3, "type": "up"},
    {"name": "Deep water rises in the North Pacific", "lon": -150, "lat": 40, "type": "up"},
    {"name": "Deep water rises round Antarctica", "lon": -110, "lat": -60, "type": "up"},
]

# ----------------------------------------------------------------------------- big rivers (approximate long-term mean discharge)
RIVERS = [
    {"name": "Amazon", "m3s": 209000, "lon": -55.0, "lat": -2.0},
    {"name": "Congo", "m3s": 41000, "lon": 16.0, "lat": -4.5},
    {"name": "Ganges–Brahmaputra", "m3s": 38000, "lon": 90.0, "lat": 23.5},
    {"name": "Orinoco", "m3s": 33000, "lon": -64.0, "lat": 8.5},
    {"name": "Yangtze", "m3s": 30000, "lon": 121.0, "lat": 31.5},
    {"name": "Yenisei", "m3s": 19600, "lon": 86.0, "lat": 68.0},
    {"name": "Lena", "m3s": 17000, "lon": 126.0, "lat": 70.0},
    {"name": "Mississippi", "m3s": 16800, "lon": -91.0, "lat": 30.0},
    {"name": "Mekong", "m3s": 15000, "lon": 105.0, "lat": 12.0},
]

LIGHTNING_HOTSPOTS = [
    {"name": "Lake Maracaibo (Catatumbo)", "lon": -71.5, "lat": 9.6, "flashes": 232.5},
    {"name": "Kabare, eastern DR Congo", "lon": 28.7, "lat": -2.3, "flashes": 205.3},
]

BASINS = [
    {"code": "NA", "name": "North Atlantic", "term": "hurricane", "lon": -62, "lat": 22, "season": "June to November, peaking in September"},
    {"code": "EP", "name": "Eastern North Pacific", "term": "hurricane", "lon": -115, "lat": 15, "season": "May to November, peaking in August and September"},
    {"code": "WP", "name": "Western North Pacific", "term": "typhoon", "lon": 135, "lat": 17, "season": "all year, peaking from August to October"},
    {"code": "NI", "name": "North Indian Ocean", "term": "cyclone", "lon": 80, "lat": 14, "season": "two peaks: April to June and October to December"},
    {"code": "SI", "name": "South-West Indian Ocean", "term": "tropical cyclone", "lon": 65, "lat": -16, "season": "November to April, peaking in February"},
    {"code": "SP", "name": "Australian region and South Pacific", "term": "tropical cyclone", "lon": 165, "lat": -15, "season": "November to April, peaking in February and March"},
    {"code": "SA", "name": "South Atlantic", "term": "tropical cyclone", "lon": -35, "lat": -25, "season": "very rare"},
]


# ----------------------------------------------------------------------------- live numbers from the data
def _annual_means(series: dict):
    """Years and annual means of the GISTEMP global anomaly (complete years)."""
    g = series["gistemp"]
    years = g["years"]
    annual = g["annual"]
    return years, annual


def climate_stats(series: dict) -> dict:
    """Figures quoted in the text (warming, CO2, sea level and others) from the latest series."""
    years, annual = _annual_means(series)
    valid = [(y, a) for y, a in zip(years, annual) if a is not None]
    latest_year, latest = valid[-1]
    early = [a for y, a in valid if 1880 <= y <= 1899]
    base_early = sum(early) / len(early)
    ranked = sorted(valid, key=lambda r: -r[1])
    co2 = [v for v in series["co2"]["trend"] if v is not None]
    co2_start = series["co2"]["start"]
    first_co2 = series["co2"]["monthly"][0]
    sl = series["seaLevel"]
    ice = series["seaIce"]["north"]
    sept = [(y, row[8]) for y, row in zip(ice["years"], ice["monthly"]) if row[8] is not None]
    ice_min = min(sept, key=lambda r: r[1])
    sept_first = [v for y, v in sept if y <= 1989]
    sept_last = [v for y, v in sept if y >= max(yy for yy, _ in sept) - 9]
    rapid = series["rapid"]["stats"]
    return {
        "latestYear": latest_year, "latestAnomaly": latest, "sinceLate1800s": round(latest - base_early, 2),
        "rank": [r[0] for r in ranked[:10]], "baseline": series["gistemp"]["baseline"],
        "co2Now": round(co2[-1], 1), "co2First": first_co2, "co2FirstYear": co2_start[0],
        "seaLevelTrend": sl["trendMmPerYear"], "seaLevelAccel": sl["accelerationMmPerYear2"],
        "seaIceMinYear": ice_min[0], "seaIceMin": round(ice_min[1], 2),
        "seaIceSeptEarly": round(sum(sept_first) / len(sept_first), 2), "seaIceSeptLate": round(sum(sept_last) / len(sept_last), 2),
        "amoc": rapid,
    }


def fill(topic: Topic, *, series: dict, tables: dict, manifest: dict) -> None:
    """Replace <<tokens>> in a topic's text with numbers computed from the downloaded data."""
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    cs = climate_stats(series)
    oni = series["enso"]["oni"]["latest"]
    tc = manifest.get("tc") or {}
    events = series["enso"]["events"]
    el_starts = [e["start"][0] * 12 + e["start"][1] for e in events if e["type"] == "El Nino"]
    gaps = [(b - a) / 12 for a, b in zip(el_starts, el_starts[1:])]

    def latest(key: str):
        """Latest value and date of an index series."""
        ser = series["indices"][key]
        n = len(ser["values"]) - 1
        month0 = ser["start"][0] * 12 + ser["start"][1] - 1 + n
        return ser["values"][-1], f"{month_names[month0 % 12]} {month0 // 12}"
    sea_level = series["seaLevel"]
    values = {
        "co2_now": f"{cs['co2Now']:.0f}", "co2_first": f"{cs['co2First']:.0f}", "co2_first_year": str(cs["co2FirstYear"]),
        "temp_year": str(cs["latestYear"]), "temp_anomaly": f"{cs['latestAnomaly']:.2f}", "temp_since": f"{cs['sinceLate1800s']:.1f}",
        "oni_value": f"{oni['value']:+.1f}", "oni_month": f"{month_names[oni['month'][1] - 1]} {oni['month'][0]}",
        "amoc_mean": f"{cs['amoc']['mean']:.1f}", "amoc_early": f"{cs['amoc']['mean2004to2008']:.1f}",
        "amoc_late": f"{cs['amoc']['mean2008onward']:.1f}", "florida_mean": f"{cs['amoc']['floridaCurrentMean']:.1f}",
        "ekman_mean": f"{cs['amoc']['ekmanMean']:.1f}", "interior_mean": f"{abs(cs['amoc']['interiorMean']):.1f}",
        "amoc_end": f"{cs['amoc']['end'][0]}",
        "sealevel_trend": f"{sea_level['trendMmPerYear']:.1f}", "sealevel_accel": f"{sea_level['accelerationMmPerYear2']:.2f}", "sealevel_rise": f"{sea_level['riseMm'] / 10:.0f}",
        "ice_min_year": str(cs["seaIceMinYear"]), "ice_min": f"{cs['seaIceMin']:.1f}",
        "ice_early": f"{cs['seaIceSeptEarly']:.1f}", "ice_late": f"{cs['seaIceSeptLate']:.1f}",
        "hot10_since": str(min(cs["rank"][:10])),
        "hottest_years": ", ".join(str(y) for y in sorted(cs["rank"][:5])),
        "solar_mean": f"{tables['sun']['globalMean']:.0f}",
        "effective_temp": f"{tables['radiation']['effectiveTempC']:.0f}".replace("-", "−"),
        "insol_ratio": f"{tables['sun']['annualMean'][18] / tables['sun']['annualMean'][0]:.1f}",
        "greenhouse_warming": f"{tables['radiation']['greenhouseWarmingC']:.0f}", "cc_pct": f"{tables['moisture']['ccAt15']:.1f}",
        "wind30": f"{tables['hadley']['windAt30']:.0f}", "equator_kmh": f"{tables['coriolis']['equatorSpeedKmh']:.0f}",
    }

    kg = manifest.get("koppen") or []
    if kg:
        share = lambda letter: sum(c["share"] for c in kg if c["code"].startswith(letter))
        by_code = {c["code"]: c["share"] for c in kg}
        values.update({
            "kg_a": f"{share('A'):.0f}", "kg_b": f"{share('B'):.0f}", "kg_c": f"{share('C'):.0f}", "kg_d": f"{share('D'):.0f}", "kg_e": f"{share('E'):.0f}",
            "kg_bwh": f"{by_code.get('BWh', 0):.0f}", "kg_aw": f"{by_code.get('Aw', 0):.0f}", "kg_ef": f"{by_code.get('EF', 0):.0f}",
        })
    import math
    values.update({
        "co2_forcing": f"{5.35 * math.log(cs['co2Now'] / 278.0):.1f}", "co2_rise": f"{cs['co2Now'] - 280:.0f}",
        "co2_pct": f"{(cs['co2Now'] / 280 - 1) * 100:.0f}", "co2_rate": f"{(cs['co2Now'] - cs['co2First']) / ((len(series['co2']['trend']) - 1) / 12):.1f}",
    })
    nino_v, nino_m = latest("nino34")
    soi_v, soi_m = latest("soi")
    pdo_v, pdo_m = latest("pdo")
    values.update({
        "enso_n_el": str(sum(e["type"] == "El Nino" for e in events)), "enso_n_la": str(sum(e["type"] == "La Nina" for e in events)),
        "oni_state": ("El Niño conditions" if oni["value"] >= 0.5 else "La Niña conditions" if oni["value"] <= -0.5 else "neutral conditions"),
        "oni_class": ("very strong" if abs(oni["value"]) >= 2.0 else "strong" if abs(oni["value"]) >= 1.5 else "moderate" if abs(oni["value"]) >= 1.0 else "weak" if abs(oni["value"]) >= 0.5 else "no"),
        "enso_gap": f"{sum(gaps) / len(gaps):.1f}", "enso_year0": str(series["enso"]["oni"]["start"][0]),
        "nino_value": f"{nino_v:+.1f}", "nino_month": nino_m, "soi_value": f"{soi_v:+.1f}", "soi_month": soi_m,
        "pdo_value": f"{pdo_v:+.1f}", "pdo_month": pdo_m,
    })
    if tc:
        by = tc["stats"]["byBasin"]
        total = lambda key: sum(b["mean"][key] for b in by.values())
        values.update({
            "tc_per_year": f"{total('storms'):.0f}", "tc_hurricanes": f"{total('hurricanes'):.0f}", "tc_major": f"{total('major'):.0f}",
            "tc_na_storms": f"{by['NA']['mean']['storms']:.1f}", "tc_na_hurr": f"{by['NA']['mean']['hurricanes']:.1f}", "tc_na_major": f"{by['NA']['mean']['major']:.1f}",
            "tc_ep_storms": f"{by['EP']['mean']['storms']:.1f}", "tc_wp_storms": f"{by['WP']['mean']['storms']:.1f}",
            "tc_ni_storms": f"{by['NI']['mean']['storms']:.1f}", "tc_si_storms": f"{by['SI']['mean']['storms']:.1f}", "tc_sp_storms": f"{by['SP']['mean']['storms']:.1f}",
            "tc_wp_major": f"{by['WP']['mean']['major']:.1f}", "tc_na_ace": f"{by['NA']['mean']['ace']:.0f}", "tc_wp_ace": f"{by['WP']['mean']['ace']:.0f}",
            "tc_ri_na": f"{by['NA']['riShare']:.0f}", "tc_ri_wp": f"{by['WP']['riShare']:.0f}",
            "tc_n": f"{tc['n']:,}", "tc_season0": str(tc["stats"]["seasons"][0]), "tc_season1": str(tc["stats"]["seasons"][1]),
            "tc_cat5": str(tc["stats"]["categoryCounts"][5]), "tc_clim0": str(tc["stats"]["climPeriod"][0]), "tc_clim1": str(tc["stats"]["climPeriod"][1]),
        })

    def sub(text: str) -> str:
        """Text with each <<key>> placeholder replaced by its value."""
        for key, val in values.items():
            text = text.replace(f"<<{key}>>", val)
        return text

    topic.title = sub(topic.title)
    topic.kicker = sub(topic.kicker)
    topic.simple = [sub(p) for p in topic.simple]
    topic.detail = [(sub(a), sub(b)) for a, b in topic.detail]
    topic.expert = [(sub(a), sub(b)) for a, b in topic.expert]
    topic.facts = [(sub(a), sub(b)) for a, b in topic.facts]
    topic.myths = [(sub(a), sub(b)) for a, b in topic.myths]
    topic.try_it = [sub(t) for t in topic.try_it]
    for q in topic.quiz:
        q["q"] = sub(q["q"]); q["why"] = sub(q["why"]); q["options"] = [sub(o) for o in q["options"]]
    topic.sources = [sub(s) for s in topic.sources]
    left = [t for t in (topic.title, topic.kicker, *topic.simple, *[b for _, b in topic.detail], *[b for _, b in topic.expert],
                        *[b for _, b in topic.facts]) if "<<" in t]
    if left:
        raise ValueError(f"{topic.id}: unresolved token in: {left[0][:90]}")
