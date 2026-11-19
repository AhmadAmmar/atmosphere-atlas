"""Physics calculators run at build time (standard library only).

Each function returns plain lists and dictionaries that the page draws as charts.  Nothing here
is typed in by hand: the numbers come from the governing formulas, so a reader can check them.
"""
from __future__ import annotations

import math

OMEGA = 7.2921159e-5          # Earth's rotation rate, rad/s
EARTH_RADIUS = 6.371e6        # m
G0 = 9.80665                  # m/s^2
R_DRY = 287.053               # J/(kg K), dry air
R_VAPOUR = 461.5              # J/(kg K), water vapour
SOLAR_CONSTANT = 1361.0       # W/m^2 (total solar irradiance, current best estimate)
STEFAN = 5.670374419e-8       # W/(m^2 K^4)
PLANCK = 6.62607015e-34
LIGHT = 2.99792458e8
BOLTZMANN = 1.380649e-23


# ------------------------------------------------------------------ the Sun and the seasons
def declination(day_of_year: float) -> float:
    """Solar declination in degrees (Spencer 1971 Fourier series)."""
    g = 2 * math.pi / 365 * (day_of_year - 1)
    d = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g)
         + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    return math.degrees(d)


def equation_of_time(day_of_year: float) -> float:
    """Equation of time in minutes (apparent minus mean solar time)."""
    g = 2 * math.pi / 365 * (day_of_year - 1)
    return 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                     - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))


def day_length(lat_deg: float, decl_deg: float) -> float:
    """Hours of daylight at a latitude for a solar declination (sunrise equation, polar day and night clipped)."""
    x = -math.tan(math.radians(lat_deg)) * math.tan(math.radians(decl_deg))
    if x >= 1:
        return 0.0
    if x <= -1:
        return 24.0
    return 2 / 15 * math.degrees(math.acos(x))


def daily_insolation(lat_deg: float, day_of_year: float) -> float:
    """Daily-mean top-of-atmosphere sunlight (W/m^2) including the Earth-Sun distance effect."""
    decl = math.radians(declination(day_of_year))
    phi = math.radians(lat_deg)
    dist = 1 + 0.033 * math.cos(2 * math.pi * (day_of_year - 3) / 365.2422)
    x = -math.tan(phi) * math.tan(decl)
    h0 = 0.0 if x >= 1 else math.pi if x <= -1 else math.acos(x)
    return SOLAR_CONSTANT / math.pi * dist * (h0 * math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.sin(h0))


def sun_tables() -> dict:
    """Day length by latitude (5 deg steps) and day of year."""
    lats = list(range(-90, 91, 5))
    days = list(range(1, 366, 4))
    insol = [[round(daily_insolation(lat, d), 1) for d in days] for lat in lats]
    length = [[round(day_length(lat, declination(d)), 2) for d in days] for lat in lats]
    annual = [round(sum(daily_insolation(lat, d) for d in range(1, 366)) / 365, 1) for lat in lats]
    return {
        "lats": lats, "days": days, "insolation": insol, "dayLength": length, "annualMean": annual,
        "declination": [round(declination(d), 3) for d in range(1, 366)],
        "equationOfTime": [round(equation_of_time(d), 2) for d in range(1, 366)],
        "solarConstant": SOLAR_CONSTANT,
        "globalMean": round(sum(
            daily_insolation(lat, d) * math.cos(math.radians(lat)) for lat in range(-89, 90) for d in range(1, 366))
            / (365 * sum(math.cos(math.radians(lat)) for lat in range(-89, 90))), 1),
    }


# ------------------------------------------------------------------ U.S. Standard Atmosphere 1976
_LAYERS = [  # base geopotential height (km), base temperature (K), lapse rate (K/km)
    (0.0, 288.15, -6.5), (11.0, 216.65, 0.0), (20.0, 216.65, 1.0), (32.0, 228.65, 2.8),
    (47.0, 270.65, 0.0), (51.0, 270.65, -2.8), (71.0, 214.65, -2.0),
]
_UPPER_T = [(86.0, 186.87), (91.0, 186.87), (100.0, 195.08), (110.0, 240.0), (120.0, 360.0)]   # geometric km, K


def standard_atmosphere() -> dict:
    """Temperature, pressure and density up to 120 km (pressure/density exact to 86 km)."""
    r0 = 6356.766
    P0 = 101325.0
    rows = []
    base_p = [P0]
    for i in range(1, len(_LAYERS)):
        h0, t0, lr = _LAYERS[i - 1]
        h1 = _LAYERS[i][0]
        p0 = base_p[-1]
        dh = (h1 - h0) * 1000
        t1 = t0 + lr * (h1 - h0)
        if lr == 0:
            p1 = p0 * math.exp(-G0 * dh / (R_DRY * t0))
        else:
            p1 = p0 * (t1 / t0) ** (-G0 / (R_DRY * lr / 1000))
        base_p.append(p1)
    for z in range(0, 121):
        if z <= 86:
            hg = r0 * z / (r0 + z)                       # geopotential km
            k = max(i for i, L in enumerate(_LAYERS) if L[0] <= hg + 1e-9)
            h0, t0, lr = _LAYERS[k]
            t = t0 + lr * (hg - h0)
            if lr == 0:
                p = base_p[k] * math.exp(-G0 * (hg - h0) * 1000 / (R_DRY * t0))
            else:
                p = base_p[k] * (t / t0) ** (-G0 / (R_DRY * lr / 1000))
            rho = p / (R_DRY * t)
            rows.append([z, round(t - 273.15, 2), p / 100.0, rho])
        else:
            for (za, ta), (zb, tb) in zip(_UPPER_T[:-1], _UPPER_T[1:]):
                if za <= z <= zb:
                    t = ta + (tb - ta) * (z - za) / (zb - za)
                    break
            rows.append([z, round(t - 273.15, 2), None, None])
    return {
        "altitudeKm": [r[0] for r in rows], "tempC": [r[1] for r in rows],
        "pressureHpa": [None if r[2] is None else float(f"{r[2]:.5g}") for r in rows],
        "densityKgM3": [None if r[3] is None else float(f"{r[3]:.4g}") for r in rows],
        "layers": [
            {"name": "Troposphere", "from": 0, "to": 11, "note": "weather happens here; temperature falls about 6.5 C per km"},
            {"name": "Stratosphere", "from": 11, "to": 50, "note": "contains the ozone layer; temperature rises with height"},
            {"name": "Mesosphere", "from": 50, "to": 85, "note": "meteors burn up; the coldest place in the atmosphere"},
            {"name": "Thermosphere", "from": 85, "to": 120, "note": "extremely thin; aurora; temperature climbs steeply"},
        ],
        "pauses": [{"name": "Tropopause", "km": 11}, {"name": "Stratopause", "km": 47}, {"name": "Mesopause", "km": 86}],
        "halfPressureKm": 5.5,
    }


# ------------------------------------------------------------------ moisture
def sat_vapour_pressure_water(t_c: float) -> float:
    """Magnus formula (Alduchov and Eskridge 1996), hPa."""
    return 6.1094 * math.exp(17.625 * t_c / (t_c + 243.04))


def sat_vapour_pressure_ice(t_c: float) -> float:
    """Saturation vapour pressure over ice (hPa) at t_c deg C (Magnus form, 22.587 and 273.86)."""
    return 6.1121 * math.exp(22.587 * t_c / (t_c + 273.86))


def dew_point(t_c: float, rh: float) -> float:
    """Dew point (deg C) from temperature and relative humidity (Magnus form, 17.625 and 243.04)."""
    a, b = 17.625, 243.04
    gamma = math.log(max(rh, 1e-3) / 100.0) + a * t_c / (b + t_c)
    return b * gamma / (a - gamma)


def wet_bulb_stull(t_c: float, rh: float) -> float:
    """Wet-bulb temperature (Stull 2011), valid for RH 5-99% and -20 to 50 C."""
    return (t_c * math.atan(0.151977 * math.sqrt(rh + 8.313659)) + math.atan(t_c + rh) - math.atan(rh - 1.676331)
            + 0.00391838 * rh ** 1.5 * math.atan(0.023101 * rh) - 4.686035)


def heat_index_f(t_f: float, rh: float) -> float:
    """NWS Rothfusz regression, degrees Fahrenheit."""
    if t_f < 80:
        return 0.5 * (t_f + 61.0 + (t_f - 68.0) * 1.2 + rh * 0.094)
    hi = (-42.379 + 2.04901523 * t_f + 10.14333127 * rh - 0.22475541 * t_f * rh - 6.83783e-3 * t_f ** 2
          - 5.481717e-2 * rh ** 2 + 1.22874e-3 * t_f ** 2 * rh + 8.5282e-4 * t_f * rh ** 2 - 1.99e-6 * t_f ** 2 * rh ** 2)
    if rh < 13 and 80 <= t_f <= 112:
        hi -= ((13 - rh) / 4) * math.sqrt((17 - abs(t_f - 95.0)) / 17)
    elif rh > 85 and 80 <= t_f <= 87:
        hi += ((rh - 85) / 10) * ((87 - t_f) / 5)
    return hi


def wind_chill_c(t_c: float, v_kmh: float) -> float:
    """North American wind-chill index (Environment Canada / NWS), degC."""
    if v_kmh < 4.8:
        return t_c
    v = v_kmh ** 0.16
    return 13.12 + 0.6215 * t_c - 11.37 * v + 0.3965 * t_c * v


def moisture_tables() -> dict:
    """Saturation vapour pressure and mixing ratio from -40 to 50 deg C."""
    temps = list(range(-40, 51, 2))
    es_w = [round(sat_vapour_pressure_water(t), 3) for t in temps]
    es_i = [round(sat_vapour_pressure_ice(t), 3) if t <= 0 else None for t in temps]
    capacity = [round(sat_vapour_pressure_water(t) * 100 / (R_VAPOUR * (t + 273.15)) * 1000, 3) for t in temps]
    rhs = [20, 40, 60, 80, 100]
    dews = {str(rh): [round(dew_point(t, rh), 2) if t > -40 else None for t in range(-10, 51, 2)] for rh in rhs}
    # Clausius-Clapeyron: fractional rise of saturation vapour pressure per degree
    cc = [round((sat_vapour_pressure_water(t + 0.5) / sat_vapour_pressure_water(t - 0.5) - 1) * 100, 3) for t in range(-20, 41, 5)]
    heat = {}
    for rh in (40, 60, 80):
        heat[str(rh)] = [round((heat_index_f(t * 9 / 5 + 32, rh) - 32) * 5 / 9, 1) for t in range(24, 47, 2)]
    wet = {}
    for rh in (30, 50, 70, 90):
        wet[str(rh)] = [round(wet_bulb_stull(t, rh), 2) for t in range(20, 51, 2)]
    chill = {}
    for t in (0, -10, -20, -30):
        chill[str(t)] = [round(wind_chill_c(t, v), 1) for v in range(5, 81, 5)]
    return {
        "temps": temps, "satWater": es_w, "satIce": es_i, "capacityGm3": capacity, "dewPoint": dews,
        "dewTemps": list(range(-10, 51, 2)), "clausiusClapeyronPct": cc,
        "ccTemps": list(range(-20, 41, 5)), "heatIndexTemps": list(range(24, 47, 2)), "heatIndex": heat,
        "wetBulbTemps": list(range(20, 51, 2)), "wetBulb": wet,
        "windChillSpeeds": list(range(5, 81, 5)), "windChill": chill,
        "ccAt15": round((sat_vapour_pressure_water(15.5) / sat_vapour_pressure_water(14.5) - 1) * 100, 2),
    }


# ------------------------------------------------------------------ rotation, Coriolis and the Hadley cell
def coriolis_tables() -> dict:
    """Coriolis parameter by latitude (5 deg steps)."""
    lats = list(range(-90, 91, 5))
    f = [2 * OMEGA * math.sin(math.radians(lat)) for lat in lats]
    period = [None if abs(x) < 1e-9 else round(2 * math.pi / abs(x) / 3600, 2) for x in f]
    # deflection of a moving object: radius of the inertial circle R = v / f
    radius100 = [None if abs(x) < 1e-9 else round(100 / abs(x) / 1000, 1) for x in f]
    radius10 = [None if abs(x) < 1e-9 else round(10 / abs(x) / 1000, 1) for x in f]
    eastward_speed = [round(OMEGA * EARTH_RADIUS * math.cos(math.radians(lat)), 1) for lat in lats]   # surface speed due to rotation
    return {
        "lats": lats, "f": [round(x * 1e5, 4) for x in f], "inertialPeriodH": period,
        "inertialRadius100ms": radius100, "inertialRadius10ms": radius10, "rotationSpeedMs": eastward_speed,
        "omega": OMEGA, "dayLengthStellarH": round(2 * math.pi / OMEGA / 3600, 4),
        "equatorSpeedKmh": round(OMEGA * EARTH_RADIUS * 3.6, 0),
    }


def hadley_theory() -> dict:
    """Angular-momentum-conserving wind and the Held-Hou width of the Hadley cell."""
    lats = list(range(0, 61, 2))
    u = []
    for lat in lats:
        p = math.radians(lat)
        u.append(round(OMEGA * EARTH_RADIUS * math.sin(p) ** 2 / math.cos(p), 1))
    H = 15000.0
    edge = {}
    for dtheta in (0.08, 0.12, 0.17, 0.25):
        val = 5.0 / 3.0 * dtheta * G0 * H / (OMEGA * EARTH_RADIUS) ** 2
        edge[str(dtheta)] = round(math.degrees(math.sqrt(val)), 1)
    return {"lats": lats, "uConserving": u, "heldHouEdgeDeg": edge, "tropopauseM": H,
            "windAt30": round(OMEGA * EARTH_RADIUS * math.sin(math.radians(30)) ** 2 / math.cos(math.radians(30)), 1)}


def geostrophic_demo() -> dict:
    """Geostrophic wind for a 4 hPa isobar spacing at different latitudes and separations."""
    out = {}
    rho = 1.2
    for lat in (15, 30, 45, 60, 75):
        f = 2 * OMEGA * math.sin(math.radians(lat))
        out[str(lat)] = [round(4 * 100 / (d * 1000) / (rho * f), 1) for d in (100, 200, 300, 400, 500)]
    return {"separationKm": [100, 200, 300, 400, 500], "windMs": out, "pressureStepHpa": 4}


# ------------------------------------------------------------------ radiation
def planck(wavelength_um: float, temp_k: float) -> float:
    """Planck spectral radiance (W m-2 sr-1 m-1) at a wavelength (um) and temperature (K)."""
    lam = wavelength_um * 1e-6
    return 2 * PLANCK * LIGHT ** 2 / lam ** 5 / (math.exp(PLANCK * LIGHT / (lam * BOLTZMANN * temp_k)) - 1)


def radiation_tables() -> dict:
    """Planck curves of the Sun and Earth, 0.1-20 um, log spaced."""
    wl = [round(10 ** (-1 + 2.3 * i / 120), 4) for i in range(121)]       # 0.1 to 20 um, log spaced
    sun = [planck(x, 5772) for x in wl]
    earth = [planck(x, 288) for x in wl]
    cold = [planck(x, 255) for x in wl]
    ns, ne = max(sun), max(earth)
    # equilibrium temperature without greenhouse gases
    albedo = 0.30
    t_eff = ((SOLAR_CONSTANT * (1 - albedo) / 4) / STEFAN) ** 0.25
    return {
        "wavelengthUm": wl, "sun": [round(v / ns, 5) for v in sun], "earth": [round(v / ne, 5) for v in earth],
        "earth255": [round(v / ne, 5) for v in cold],
        "peakSunUm": round(2897.77 / 5772, 3), "peakEarthUm": round(2897.77 / 288, 2),
        "effectiveTempK": round(t_eff, 1), "effectiveTempC": round(t_eff - 273.15, 1),
        "meanSurfaceC": 14.9, "greenhouseWarmingC": round(14.9 - (t_eff - 273.15), 1),
        "absorptionBands": [
            {"gas": "Water vapour", "um": [5.5, 7.5], "note": "strong absorption near 6.3 µm and beyond 15 µm"},
            {"gas": "Carbon dioxide", "um": [13.5, 17], "note": "the 15 µm band sits at the peak of Earth's emission"},
            {"gas": "Ozone", "um": [9.2, 10], "note": "a narrow band at 9.6 µm"},
        ],
        "window": [8, 13],
        "rayleigh": {"nm": list(range(380, 751, 10)),
                     "relative": [round((450.0 / n) ** 4, 4) for n in range(380, 751, 10)]},
        "rainbowAngles": {"primary": 42.0, "secondary": 51.0, "halo22": 22.0},
    }


# ------------------------------------------------------------------ storms
def hurricane_profiles() -> dict:
    """Wind speed against distance from the centre (Holland-type profile) for each Saffir-Simpson category."""
    rows = {}
    radii = list(range(0, 301, 5))
    for name, vmax_kt, rmax_km, b in (("Category 1", 74, 55, 1.3), ("Category 3", 105, 40, 1.5), ("Category 5", 150, 25, 1.9)):
        vmax = vmax_kt * 0.514444
        prof = []
        for r in radii:
            if r == 0:
                prof.append(0.0)
                continue
            x = (rmax_km / r) ** b
            prof.append(round(vmax * math.sqrt(x * math.exp(1 - x)) / 0.514444, 1))
        rows[name] = {"vmaxKt": vmax_kt, "rmaxKm": rmax_km, "profileKt": prof}
    return {"radiusKm": radii, "profiles": rows,
            "scale": [
                {"cat": "Tropical storm", "kt": [34, 63], "mph": [39, 73], "kmh": [63, 118]},
                {"cat": "Category 1", "kt": [64, 82], "mph": [74, 95], "kmh": [119, 153]},
                {"cat": "Category 2", "kt": [83, 95], "mph": [96, 110], "kmh": [154, 177]},
                {"cat": "Category 3", "kt": [96, 112], "mph": [111, 129], "kmh": [178, 208]},
                {"cat": "Category 4", "kt": [113, 136], "mph": [130, 156], "kmh": [209, 251]},
                {"cat": "Category 5", "kt": [137, None], "mph": [157, None], "kmh": [252, None]},
            ]}


def beaufort_scale() -> list:
    """The Beaufort wind scale with speeds and descriptions."""
    rows = [
        (0, "Calm", 0, 0.5, "Smoke rises vertically; the sea is like a mirror."),
        (1, "Light air", 0.5, 1.5, "Smoke drifts; ripples on the water."),
        (2, "Light breeze", 1.6, 3.3, "Leaves rustle; you can feel wind on your face."),
        (3, "Gentle breeze", 3.4, 5.4, "Leaves and small twigs move constantly; flags extend."),
        (4, "Moderate breeze", 5.5, 7.9, "Dust and loose paper lift; small branches move."),
        (5, "Fresh breeze", 8.0, 10.7, "Small trees sway; crested wavelets on lakes."),
        (6, "Strong breeze", 10.8, 13.8, "Large branches move; umbrellas are hard to use."),
        (7, "Near gale", 13.9, 17.1, "Whole trees sway; walking against the wind takes effort."),
        (8, "Gale", 17.2, 20.7, "Twigs break off trees; progress on foot is hampered."),
        (9, "Strong gale", 20.8, 24.4, "Slight structural damage: chimney pots and slates blown off."),
        (10, "Storm", 24.5, 28.4, "Trees uprooted; considerable structural damage."),
        (11, "Violent storm", 28.5, 32.6, "Widespread damage; very rarely experienced inland."),
        (12, "Hurricane force", 32.7, None, "Devastation. At sea the air is filled with foam and spray."),
    ]
    return [{"force": f, "name": n, "ms": [lo, hi], "kt": [round(lo * 1.94384), None if hi is None else round(hi * 1.94384)],
             "desc": d} for f, n, lo, hi, d in rows]


def enhanced_fujita() -> list:
    """The Enhanced Fujita tornado scale."""
    return [
        {"ef": "EF0", "mph": [65, 85], "kmh": [105, 137], "damage": "Light: branches broken, shallow-rooted trees pushed over, some roof shingles lost."},
        {"ef": "EF1", "mph": [86, 110], "kmh": [138, 177], "damage": "Moderate: roof surfaces peeled off, mobile homes overturned."},
        {"ef": "EF2", "mph": [111, 135], "kmh": [178, 217], "damage": "Considerable: roofs torn from well-built houses, large trees snapped."},
        {"ef": "EF3", "mph": [136, 165], "kmh": [218, 266], "damage": "Severe: entire storeys of well-built houses destroyed, trains overturned."},
        {"ef": "EF4", "mph": [166, 200], "kmh": [267, 322], "damage": "Devastating: well-built houses levelled, cars thrown."},
        {"ef": "EF5", "mph": [200, None], "kmh": [322, None], "damage": "Incredible: strong frame houses swept from their foundations."},
    ]


# ------------------------------------------------------------------ chaos
def lorenz_pair(steps: int = 4200, dt: float = 0.01, eps: float = 1e-4) -> dict:
    """Two Lorenz-63 trajectories whose starting points differ by 0.0001: the butterfly effect."""
    sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0

    def f(s):
        """Lorenz (1963) equations: rates of change of x, y and z."""
        x, y, z = s
        return (sigma * (y - x), x * (rho - z) - y, x * y - beta * z)

    def rk4(s):
        """One fourth-order Runge-Kutta step of the Lorenz equations."""
        k1 = f(s)
        k2 = f(tuple(s[i] + 0.5 * dt * k1[i] for i in range(3)))
        k3 = f(tuple(s[i] + 0.5 * dt * k2[i] for i in range(3)))
        k4 = f(tuple(s[i] + dt * k3[i] for i in range(3)))
        return tuple(s[i] + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) for i in range(3))

    a = (1.0, 1.0, 1.0)
    b = (1.0 + eps, 1.0, 1.0)
    pa, pb, sep = [], [], []
    for i in range(steps):
        a, b = rk4(a), rk4(b)
        if i % 3 == 0:
            pa.append([round(a[0], 3), round(a[2], 3)])
            pb.append([round(b[0], 3), round(b[2], 3)])
            sep.append(round(math.dist(a, b), 5))
    diverge = next((i * 3 * dt for i, s in enumerate(sep) if s > 1.0), None)
    return {"a": pa, "b": pb, "separation": sep, "dt": dt * 3, "eps": eps, "divergeTime": diverge}


# ------------------------------------------------------------------ clouds and water
def cloud_genera() -> list:
    """The ten cloud genera with heights and descriptions."""
    return [
        {"name": "Cirrus", "abbr": "Ci", "level": "high", "base": [6, 12], "look": "thin, wispy white filaments of ice crystals", "weather": "fair, but often the first sign of an approaching warm front"},
        {"name": "Cirrocumulus", "abbr": "Cc", "level": "high", "base": [6, 12], "look": "small white ripples or grains, a 'mackerel sky'", "weather": "fair and cold; short-lived"},
        {"name": "Cirrostratus", "abbr": "Cs", "level": "high", "base": [6, 12], "look": "a thin milky veil that makes a halo round the Sun or Moon", "weather": "rain or snow often follows within about a day"},
        {"name": "Altocumulus", "abbr": "Ac", "level": "middle", "base": [2, 7], "look": "white-grey patches or rolls in layers", "weather": "thunderstorms may follow on warm humid mornings"},
        {"name": "Altostratus", "abbr": "As", "level": "middle", "base": [2, 7], "look": "a grey-blue sheet through which the Sun shows dimly", "weather": "steady rain or snow is likely to develop"},
        {"name": "Nimbostratus", "abbr": "Ns", "level": "middle", "base": [0.5, 4], "look": "thick dark grey layer that hides the Sun", "weather": "continuous rain or snow"},
        {"name": "Stratocumulus", "abbr": "Sc", "level": "low", "base": [0.5, 2], "look": "low lumpy grey and white sheet", "weather": "dull; drizzle is possible"},
        {"name": "Stratus", "abbr": "St", "level": "low", "base": [0, 2], "look": "uniform grey blanket, like fog lifted off the ground", "weather": "overcast, drizzle or mist"},
        {"name": "Cumulus", "abbr": "Cu", "level": "low", "base": [0.5, 2], "look": "puffy cotton-wool heaps with flat bases", "weather": "fair weather when small; showers if they grow tall"},
        {"name": "Cumulonimbus", "abbr": "Cb", "level": "towering", "base": [0.5, 2], "top": [8, 18], "look": "giant towers with an anvil-shaped top", "weather": "heavy showers, hail, lightning, tornadoes"},
    ]


def water_cycle() -> dict:
    """Stores and fluxes of the global water cycle."""
    return {
        "unit": "thousand km³ per year",
        "oceanEvaporation": 436, "oceanPrecipitation": 391, "landEvaporation": 71, "landPrecipitation": 116, "runoff": 45,
        "vapourToLand": 45, "atmosphereStore": 12.7,
        "reservoirs": [
            {"name": "Oceans", "thousandKm3": 1338000, "pctOfAll": 96.5},
            {"name": "Ice caps and glaciers", "thousandKm3": 24064, "pctOfAll": 1.74},
            {"name": "Groundwater", "thousandKm3": 23400, "pctOfAll": 1.69},
            {"name": "Permafrost and ground ice", "thousandKm3": 300, "pctOfAll": 0.022},
            {"name": "Lakes", "thousandKm3": 176, "pctOfAll": 0.013},
            {"name": "Soil moisture", "thousandKm3": 16.5, "pctOfAll": 0.001},
            {"name": "Atmosphere", "thousandKm3": 12.9, "pctOfAll": 0.001},
            {"name": "Rivers", "thousandKm3": 2.1, "pctOfAll": 0.0002},
        ],
        "freshwaterShare": {"icePct": 68.7, "groundwaterPct": 30.1, "otherPct": 1.2},
        "vapourResidenceDays": 9,
    }


def energy_budget() -> dict:
    """Global annual-mean energy flows in W/m^2 (Trenberth, Fasullo and Kiehl 2009)."""
    return {
        "incomingSolar": 341.3, "reflectedByClouds": 79.0, "reflectedBySurface": 23.0, "absorbedAtmosphere": 78.0,
        "absorbedSurface": 161.0, "thermals": 17.0, "evapotranspiration": 80.0, "surfaceUp": 396.0, "backRadiation": 333.0,
        "atmosphericWindow": 40.0, "emittedByAtmosphere": 169.0, "emittedByClouds": 30.0, "outgoingLongwave": 238.5,
        "netAbsorbed": 0.9, "albedo": round((79.0 + 23.0) / 341.3, 3),
    }


def composition(co2_ppm: float) -> list:
    """Composition of dry air (ppm), with CO2 at the given value."""
    return [
        {"gas": "Nitrogen", "formula": "N2", "ppm": 780840}, {"gas": "Oxygen", "formula": "O2", "ppm": 209460},
        {"gas": "Argon", "formula": "Ar", "ppm": 9340}, {"gas": "Carbon dioxide", "formula": "CO2", "ppm": round(co2_ppm, 1)},
        {"gas": "Neon", "formula": "Ne", "ppm": 18.18}, {"gas": "Helium", "formula": "He", "ppm": 5.24},
        {"gas": "Methane", "formula": "CH4", "ppm": 1.9}, {"gas": "Krypton", "formula": "Kr", "ppm": 1.14},
        {"gas": "Hydrogen", "formula": "H2", "ppm": 0.55}, {"gas": "Nitrous oxide", "formula": "N2O", "ppm": 0.34},
    ]


def build_tables(co2_ppm: float) -> dict:
    """All physics tables of the atlas."""
    return {
        "sun": sun_tables(), "atmosphere": standard_atmosphere(), "moisture": moisture_tables(),
        "coriolis": coriolis_tables(), "hadley": hadley_theory(), "geostrophic": geostrophic_demo(),
        "radiation": radiation_tables(), "hurricane": hurricane_profiles(), "beaufort": beaufort_scale(),
        "fujita": enhanced_fujita(), "lorenz": lorenz_pair(), "clouds": cloud_genera(), "water": water_cycle(),
        "energy": energy_budget(), "composition": composition(co2_ppm),
    }
