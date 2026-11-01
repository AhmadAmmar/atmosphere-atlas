def thickness(mean_t_k, p1_hpa, p2_hpa):
    """Hypsometric equation: thickness (m) of the layer between two pressures."""
    return R_D * mean_t_k / G * math.log(p1_hpa / p2_hpa)
