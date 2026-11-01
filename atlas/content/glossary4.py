"""Glossary entries for the moisture and motion chapter (moisture, pressure surfaces, friction and station models)."""
from .model import Term

_T = Term

TERMS = [
    _T("Mixing ratio", "The mass of water vapour in a parcel of air divided by the mass of the dry air with it, usually written in grams of vapour per kilogram of dry air (g/kg)."),
    _T("Saturation mixing ratio", "The most water vapour, in grams per kilogram of dry air, that air of a given temperature and pressure can hold. Above it the vapour condenses. It rises steeply with temperature.", ["saturation point"]),
    _T("Layer thickness", "The distance in height between two pressure surfaces, for example 1000 and 500 hPa. Warm air gives a larger thickness than cold air, which is why pressure surfaces slope towards the cold.", ["hypsometric equation", "thickness of the layer"]),
    _T("Station model", "The standard way of drawing one weather observation on a map: a circle for the sky cover with the temperature, dew point, pressure, weather symbol and a wind barb in fixed positions around it."),
    _T("Streamline", "A line drawn on a map that is everywhere parallel to the wind at one moment. Streamlines show the pattern of the flow, such as the anticlockwise swirl round a low."),
    _T("Knot", "A speed of one nautical mile per hour: 0.514 m/s, or about 1.85 km/h. Wind barbs and ship speeds are given in knots.", ["knots", "kt"]),
    _T("Pressure gradient force", "The push on air from higher towards lower pressure. It is bigger where the isobars are closer together."),
    _T("Friction", "The drag of the ground, trees and buildings on the wind. It acts against the wind, slows it down in the lowest kilometre or so and turns it across the isobars towards low pressure.", ["frictional force"]),
]
