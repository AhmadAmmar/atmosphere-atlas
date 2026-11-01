def decode_pressure(code):
    """Sea-level pressure (hPa) from a three-digit station-model code."""
    return (1000.0 if code < 500 else 900.0) + code / 10.0
