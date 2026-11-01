def geostrophic_wind(dz_m, dn_m, lat_deg):
    """Geostrophic wind (m/s) from the height change of a pressure surface over a distance."""
    return G / coriolis_parameter(lat_deg) * dz_m / dn_m
