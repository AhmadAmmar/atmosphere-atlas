def coriolis_parameter(lat_deg):
    """Coriolis parameter (per second) at a latitude."""
    return 2.0 * OMEGA * math.sin(math.radians(lat_deg))
