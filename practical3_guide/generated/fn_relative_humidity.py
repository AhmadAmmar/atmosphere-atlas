def relative_humidity(w, w_s):
    """Relative humidity (%) from the mixing ratio and the saturation mixing ratio."""
    return 100.0 * w / w_s
