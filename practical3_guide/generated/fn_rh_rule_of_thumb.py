def rh_rule_of_thumb(t_c, t_d):
    """Approximate relative humidity (%) from the temperature and the dew point."""
    return 100.0 - 5.0 * (t_c - t_d)
