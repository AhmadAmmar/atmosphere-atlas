def saturation_vapour_pressure(t_c):
    """Saturation vapour pressure (hPa) over water at t_c (deg C)."""
    return 6.112 * math.exp(17.67 * t_c / (t_c + 243.5))
