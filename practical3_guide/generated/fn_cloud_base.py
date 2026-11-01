def cloud_base(t_c, t_d):
    """Approximate height of the cloud base (m)."""
    return 125.0 * (t_c - t_d)
