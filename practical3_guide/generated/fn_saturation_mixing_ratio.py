def saturation_mixing_ratio(t_c, p_hpa=TABLE_PRESSURE_HPA):
    """Saturation mixing ratio (g/kg) at t_c and p_hpa."""
    e_s = saturation_vapour_pressure(t_c)
    return 622.0 * e_s / (p_hpa - e_s)
