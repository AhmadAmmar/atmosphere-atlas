"""Further glossary entries, grouped by the chapters that introduce them."""
from .model import Term

_T = Term

TERMS = [
    # ---- weather systems
    _T("Advection fog", "Fog that forms when warm, moist air blows over a colder surface and is chilled below its dew point. San Francisco's summer fog is a famous example.", ["sea fog"]),
    _T("Anvil", "The flat, spreading top of a thunderstorm cloud, formed where rising air meets the stable stratosphere and spreads sideways."),
    _T("Blizzard", "A snowstorm with strong winds (at least 56 km/h, 35 mph, in the United States definition) and very poor visibility for several hours. Falling or blowing snow can both qualify."),
    _T("Bombogenesis", "Explosive deepening of a low-pressure system. It is usually defined as a fall in central pressure of at least 24 hPa in 24 hours at 60° latitude (scaled for other latitudes). The result is called a bomb cyclone.", ["bomb cyclone", "explosive cyclogenesis"]),
    _T("CAPE", "Convective available potential energy, in joules per kilogram: the energy a rising parcel of air could gain from its buoyancy. Values above about 1,000 J/kg support strong thunderstorms; above 3,000 J/kg, violent ones.", ["convective available potential energy"]),
    _T("Cold pool", "A pool of cold air spreading out along the ground under a thunderstorm, made by rain-cooled air that sinks and fans outward."),
    _T("Derecho", "A long-lived line of damaging thunderstorm winds that travels hundreds of kilometres, with gusts of at least 93 km/h (58 mph) along a path at least 650 km (400 miles) long."),
    _T("Gust front", "The boundary of cool air that rushes out ahead of a thunderstorm, marked by a sudden wind shift, gusts and a temperature drop."),
    _T("Graupel", "Soft pellets of snow coated with frozen cloud droplets, 2–5 mm across. Graupel falling through a thundercloud helps to build up the electrical charge that causes lightning."),
    _T("Jet streak", "A zone of especially fast wind within a jet stream. Air speeds up as it enters it and slows down as it leaves it, which makes air rise and fall below the entrance and exit regions and helps to deepen surface lows."),
    _T("Lake-effect snow", "Snow that forms when cold air blows across a large, warm lake. The air picks up heat and moisture and dumps it as heavy bands of snow on the downwind shore."),
    _T("Mesocyclone", "A rotating column of air, typically 2–10 km across, inside a supercell thunderstorm. Many strong tornadoes grow from one."),
    _T("Multicell storm", "A thunderstorm made of several cells at different stages of life, with new ones forming on one flank as old ones decay."),
    _T("Polar low", "A small, intense, short-lived storm (200–1,000 km across) that forms over cold northern seas during outbreaks of Arctic air. It brings gales and heavy snow.", ["polar lows"]),
    _T("Radiation fog", "Fog that forms on clear, calm nights when the ground loses heat to space and chills the air next to it below its dew point. It is typical of valleys in autumn and winter.", ["ground fog"]),
    _T("Sleet", "In the United Kingdom, a mixture of rain and melting snow. In the United States, small pellets of ice made by raindrops that freeze as they fall through a layer of cold air."),
    _T("Squall", "A sudden, short burst of strong wind, often with rain, snow or hail."),
    _T("Triple point", "The place where the cold, warm and occluded fronts of a depression meet. It is often where the low pressure is deepest in the mature stage of the storm."),
    _T("Waterspout", "A spinning column of air over water, usually weaker than a tornado and often made in fair weather. Strong ones can come from storms."),
]
