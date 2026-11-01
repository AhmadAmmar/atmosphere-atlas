def dew_point(w, p_hpa=TABLE_PRESSURE_HPA):
    """Dew point (deg C) from the mixing ratio (g/kg)."""
    x = math.log(vapour_pressure(w, p_hpa) / 6.112)
    return 243.5 * x / (17.67 - x)
