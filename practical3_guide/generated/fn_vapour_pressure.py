def vapour_pressure(w, p_hpa=TABLE_PRESSURE_HPA):
    """Vapour pressure (hPa) from the mixing ratio (g/kg)."""
    return w * p_hpa / (622.0 + w)
