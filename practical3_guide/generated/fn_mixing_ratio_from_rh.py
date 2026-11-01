def mixing_ratio_from_rh(w_s, rh):
    """Mixing ratio (g/kg) from the saturation mixing ratio and the relative humidity (%)."""
    return w_s * rh / 100.0
