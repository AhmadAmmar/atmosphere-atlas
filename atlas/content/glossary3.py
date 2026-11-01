"""Glossary entries for the ocean, storm, climate and sky chapters."""
from .model import Term

_T = Term

TERMS = [
    # ---- storms, oceans and modes of variability
    _T("Accumulated cyclone energy", "A measure of the total work done by a storm or a whole season: the squares of the maximum wind speeds in knots, added up over every six-hour report while the storm is at tropical-storm strength or more, divided by 10,000.", ["ACE"]),
    _T("Argo", "A fleet of about 4,000 robotic floats that drift in the ocean, dive to 2,000 m every ten days and report temperature and salinity by satellite."),
    _T("Atlantic Multidecadal Oscillation", "A slow swing in the temperature of the North Atlantic, with a rhythm of about 60 to 80 years, that influences hurricanes, Sahel rainfall and European summers.", ["AMO"]),
    _T("Dipole Mode Index", "A measure of the Indian Ocean Dipole: the sea-surface temperature of the western Indian Ocean minus that of the eastern one.", ["DMI"]),
    _T("Easterly wave", "A ripple in the trade winds that moves westward, bringing a band of showers and thunderstorms. Many Atlantic hurricanes begin as one that leaves Africa.", ["African easterly wave", "tropical wave"]),
    _T("Eyewall replacement cycle", "A process in intense tropical cyclones in which a new, larger ring of storms forms outside the old eyewall, which then dies. The storm weakens for a time and then re-intensifies."),
    _T("Indian Ocean Dipole", "A see-saw of sea-surface temperature in the Indian Ocean, discovered in 1999, in which the west is warm and the east cool (positive phase) or the reverse. It changes the rain in East Africa, Indonesia and Australia.", ["IOD"]),
    _T("Kelvin wave", "A wave in the ocean or the atmosphere trapped along the equator that travels eastward. Oceanic Kelvin waves carry warm water across the Pacific during El Niño."),
    _T("Marine heatwave", "A period of at least five days when the sea-surface temperature at a place is unusually high for the season (in the top 10% of the record). Heatwaves in the sea kill corals, kelp and fish.", ["marine heatwaves"]),
    _T("Oceanic Niño Index", "The three-month running mean of the sea-surface temperature anomaly in the central Pacific (the Niño 3.4 region). A value of +0.5 °C or more for five months marks an El Niño; −0.5 °C or less, a La Niña.", ["ONI", "Niño 3.4"]),
    _T("Pacific Decadal Oscillation", "A pattern of North Pacific sea-surface temperature that tends to stay in one phase for 15 to 30 years.", ["PDO"]),
    _T("Overturning circulation", "The part of the ocean's circulation in which water sinks in one place and rises in another, taking heat with it. In the Atlantic it is called the AMOC.", ["AMOC", "Atlantic Meridional Overturning Circulation", "meridional overturning"]),
    _T("Sea ice", "Ice that forms from freezing sea water and floats on the surface. It is a few metres thick at most, and it grows and melts with the seasons."),
    _T("Tropical cyclone", "A large rotating storm that forms over warm tropical oceans: the general name for hurricanes, typhoons and cyclones.", ["tropical cyclones"]),
    _T("Tropical storm", "A tropical cyclone with maximum sustained winds of 34 to 63 knots (63 to 118 km/h). It is given a name."),
    _T("Tropical depression", "The weakest stage of a tropical cyclone, with a closed circulation and winds of less than 34 knots (63 km/h)."),
    # ---- climate, ice and the planet
    _T("Attribution", "The scientific method that estimates how much human-caused climate change altered the chance or the strength of a particular event, by comparing the real world with a world without it.", ["event attribution"]),
    _T("Carbon budget", "The total amount of carbon dioxide that can still be emitted before the global warming reaches a chosen level, such as 1.5 °C."),
    _T("Climate sensitivity", "The long-term global warming that follows a doubling of carbon dioxide in the air. The best estimate is about 3 °C, probably between 2.5 and 4 °C.", ["equilibrium climate sensitivity"]),
    _T("Cryosphere", "The frozen parts of the Earth: snow, glaciers, ice sheets, sea ice, lake ice and permafrost."),
    _T("Feedback", "A process in which a change causes further change that either amplifies it (positive feedback) or reduces it (negative feedback).", ["feedbacks"]),
    _T("Glacier", "A large, long-lasting mass of ice that moves slowly downhill under its own weight.", ["glaciers"]),
    _T("Heat index", "How hot it feels when humidity is taken into account, because humid air stops sweat from evaporating."),
    _T("Hysteresis", "When the state of a system depends on its history: to flip it back after a change it has to be taken well beyond the point where it flipped."),
    _T("Ice core", "A cylinder of ice drilled from an ice sheet. Its layers, isotopes and trapped air bubbles record the temperature and the air of the past 800,000 years.", ["ice cores"]),
    _T("Ice sheet", "A continent-sized mass of glacial ice. Only two exist today: Greenland and Antarctica.", ["ice sheets"]),
    _T("Permafrost", "Ground that stays frozen for at least two years in a row. It underlies about a quarter of the land in the Northern Hemisphere."),
    _T("Radiative forcing", "A change in the balance between incoming sunlight and outgoing heat at the top of the atmosphere, in watts per square metre, caused by a factor such as greenhouse gases or aerosols.", ["forcing", "effective radiative forcing"]),
    _T("Tipping point", "A threshold in the climate system beyond which a small further change causes a large, self-reinforcing and often irreversible change.", ["tipping points", "tipping element"]),
    _T("Urban heat island", "The extra warmth of a city compared with its countryside, caused by dark surfaces, stored heat, few plants and the heat released by people.", ["heat island"]),
    # ---- the sky and how it is observed
    _T("Chaos", "Behaviour in which tiny differences in the starting state grow exponentially, so that long-term prediction is impossible even though the rules are exact.", ["butterfly effect", "chaotic"]),
    _T("Data assimilation", "The mathematical blending of the latest observations with a short model forecast to make the best possible picture of the atmosphere to start a new forecast.", ["assimilation"]),
    _T("Ensemble forecast", "A set of forecasts started from slightly different conditions, which shows how uncertain the prediction is.", ["ensemble", "ensembles"]),
    _T("Halo", "A ring of light round the Sun or Moon made by ice crystals in high, thin cloud. The commonest has a radius of 22°.", ["halos"]),
    _T("Mie scattering", "Scattering of light by particles about as big as its wavelength or bigger, such as cloud droplets. It scatters all colours alike, so clouds are white."),
    _T("Rayleigh scattering", "Scattering of light by particles much smaller than its wavelength, such as air molecules. It is far stronger for blue light than for red, and makes the sky blue."),
    _T("Reanalysis", "A consistent record of the atmosphere over many decades, made by running one fixed forecast model and assimilation system over all the past observations."),
    _T("Refraction", "The bending of light or other waves when they pass from one medium to another or through a medium of changing density."),
    _T("Solar wind", "The stream of charged particles that flows out from the Sun at 300 to 800 km/s."),
    _T("Sun dog", "A bright spot on either side of the Sun at about 22°, made by flat ice crystals in high cloud.", ["parhelion", "sun dogs"]),
    _T("Wind barb", "The symbol on a weather map for the wind: a staff pointing to where the wind comes from, with barbs for 10 knots, half barbs for 5 knots and triangles for 50 knots.", ["wind barbs"]),
]
