// ── Camel Global — City / Country search bias config ─────────────────────────
// Add one entry per city as you expand. lat/lng is the city centre used as
// Photon search bias — results are weighted here but not hard-blocked, so
// customers can still find addresses slightly outside the radius.
// radiusKm is cosmetic only (shown to user). Photon bias is always applied.

export type CityEntry = {
  country:  string;   // Display name for the country group
  city:     string;   // Display name shown in selector
  lat:      number;   // City centre latitude
  lng:      number;   // City centre longitude
  radiusKm: number;   // Approximate search radius shown to user
};

export const CITIES: CityEntry[] = [
  // ── Spain ─────────────────────────────────────────────────────────────────
  { country: "Spain",           city: "Valencia",            lat:   39.4699, lng:    -0.3763, radiusKm: 60 },
  { country: "Spain",           city: "Alicante",            lat:   38.3452, lng:    -0.4810, radiusKm: 60 },
  { country: "Spain",           city: "Benidorm",            lat:   38.5402, lng:    -0.1328, radiusKm: 40 },
  { country: "Spain",           city: "Málaga",              lat:   36.7213, lng:    -4.4213, radiusKm: 60 },
  { country: "Spain",           city: "Barcelona",           lat:   41.3851, lng:     2.1734, radiusKm: 60 },
  { country: "Spain",           city: "Madrid",              lat:   40.4168, lng:    -3.7038, radiusKm: 60 },
  { country: "Spain",           city: "Palma (Mallorca)",    lat:   39.5696, lng:     2.6502, radiusKm: 50 },
  { country: "Spain",           city: "Ibiza",               lat:   38.9067, lng:     1.4200, radiusKm: 30 },
  { country: "Spain",           city: "Tenerife",            lat:   28.2916, lng:   -16.6291, radiusKm: 50 },
  { country: "Spain",           city: "Lanzarote",           lat:   28.9630, lng:   -13.5500, radiusKm: 40 },
  { country: "Spain",           city: "Fuerteventura",       lat:   28.3338, lng:   -14.0030, radiusKm: 40 },
  { country: "Spain",           city: "Gran Canaria",        lat:   27.9202, lng:   -15.5472, radiusKm: 50 },
  { country: "Spain",           city: "Seville",             lat:   37.3891, lng:    -5.9845, radiusKm: 60 },
  { country: "Spain",           city: "Murcia",              lat:   37.9922, lng:    -1.1307, radiusKm: 50 },
  { country: "Spain",           city: "Bilbao",              lat:   43.2630, lng:    -2.9350, radiusKm: 40 },
  { country: "Spain",           city: "Girona",              lat:   41.9794, lng:     2.8214, radiusKm: 40 },

  // ── France ────────────────────────────────────────────────────────────────
  { country: "France",          city: "Paris",               lat:   48.8566, lng:     2.3522, radiusKm: 60 },
  { country: "France",          city: "Nice",                lat:   43.7102, lng:     7.2620, radiusKm: 50 },
  { country: "France",          city: "Lyon",                lat:   45.7640, lng:     4.8357, radiusKm: 50 },
  { country: "France",          city: "Marseille",           lat:   43.2965, lng:     5.3698, radiusKm: 50 },
  { country: "France",          city: "Bordeaux",            lat:   44.8378, lng:    -0.5792, radiusKm: 50 },
  { country: "France",          city: "Toulouse",            lat:   43.6047, lng:     1.4442, radiusKm: 40 },
  { country: "France",          city: "Nantes",              lat:   47.2184, lng:    -1.5536, radiusKm: 40 },
  { country: "France",          city: "Lille",               lat:   50.6292, lng:     3.0573, radiusKm: 40 },

  // ── Italy ─────────────────────────────────────────────────────────────────
  { country: "Italy",           city: "Rome",                lat:   41.9028, lng:    12.4964, radiusKm: 60 },
  { country: "Italy",           city: "Milan",               lat:   45.4642, lng:     9.1900, radiusKm: 60 },
  { country: "Italy",           city: "Naples",              lat:   40.8518, lng:    14.2681, radiusKm: 50 },
  { country: "Italy",           city: "Venice",              lat:   45.4408, lng:    12.3155, radiusKm: 40 },
  { country: "Italy",           city: "Florence",            lat:   43.7696, lng:    11.2558, radiusKm: 40 },
  { country: "Italy",           city: "Bologna",             lat:   44.4949, lng:    11.3426, radiusKm: 40 },
  { country: "Italy",           city: "Catania",             lat:   37.5079, lng:    15.0830, radiusKm: 50 },
  { country: "Italy",           city: "Pisa",                lat:   43.7228, lng:    10.4017, radiusKm: 40 },

  // ── Germany ───────────────────────────────────────────────────────────────
  { country: "Germany",         city: "Berlin",              lat:   52.5200, lng:    13.4050, radiusKm: 60 },
  { country: "Germany",         city: "Munich",              lat:   48.1351, lng:    11.5820, radiusKm: 50 },
  { country: "Germany",         city: "Frankfurt",           lat:   50.1109, lng:     8.6821, radiusKm: 50 },
  { country: "Germany",         city: "Hamburg",             lat:   53.5511, lng:     9.9937, radiusKm: 50 },
  { country: "Germany",         city: "Cologne",             lat:   50.9375, lng:     6.9603, radiusKm: 40 },
  { country: "Germany",         city: "Düsseldorf",          lat:   51.2277, lng:     6.7735, radiusKm: 40 },
  { country: "Germany",         city: "Stuttgart",           lat:   48.7758, lng:     9.1829, radiusKm: 40 },
  { country: "Germany",         city: "Berlin (BER Airport)", lat:   52.3667, lng:    13.5033, radiusKm: 40 },

  // ── Portugal ──────────────────────────────────────────────────────────────
  { country: "Portugal",        city: "Lisbon",              lat:   38.7223, lng:    -9.1393, radiusKm: 50 },
  { country: "Portugal",        city: "Porto",               lat:   41.1579, lng:    -8.6291, radiusKm: 40 },
  { country: "Portugal",        city: "Faro (Algarve)",      lat:   37.0194, lng:    -7.9322, radiusKm: 60 },
  { country: "Portugal",        city: "Funchal (Madeira)",   lat:   32.6669, lng:   -16.9241, radiusKm: 40 },

  // ── Netherlands ───────────────────────────────────────────────────────────
  { country: "Netherlands",     city: "Amsterdam",           lat:   52.3676, lng:     4.9041, radiusKm: 50 },
  { country: "Netherlands",     city: "Rotterdam",           lat:   51.9244, lng:     4.4777, radiusKm: 40 },
  { country: "Netherlands",     city: "The Hague",           lat:   52.0705, lng:     4.3007, radiusKm: 40 },
  { country: "Netherlands",     city: "Eindhoven",           lat:   51.4416, lng:     5.4697, radiusKm: 40 },
  { country: "Netherlands",     city: "Utrecht",             lat:   52.0907, lng:     5.1214, radiusKm: 40 },

  // ── United Kingdom ────────────────────────────────────────────────────────
  { country: "United Kingdom",  city: "London",              lat:   51.5074, lng:    -0.1278, radiusKm: 60 },
  { country: "United Kingdom",  city: "Manchester",          lat:   53.4808, lng:    -2.2426, radiusKm: 50 },
  { country: "United Kingdom",  city: "Birmingham",          lat:   52.4862, lng:    -1.8904, radiusKm: 50 },
  { country: "United Kingdom",  city: "Edinburgh",           lat:   55.9533, lng:    -3.1883, radiusKm: 40 },
  { country: "United Kingdom",  city: "Glasgow",             lat:   55.8642, lng:    -4.2518, radiusKm: 40 },
  { country: "United Kingdom",  city: "Liverpool",           lat:   53.4084, lng:    -2.9916, radiusKm: 40 },
  { country: "United Kingdom",  city: "Bristol",             lat:   51.4545, lng:    -2.5879, radiusKm: 40 },
  { country: "United Kingdom",  city: "Leeds",               lat:   53.8008, lng:    -1.5491, radiusKm: 40 },
  { country: "United Kingdom",  city: "Newcastle",           lat:   54.9783, lng:    -1.6178, radiusKm: 40 },

  // ── United States ─────────────────────────────────────────────────────────
  { country: "United States",   city: "New York",            lat:   40.7128, lng:   -74.0060, radiusKm: 60 },
  { country: "United States",   city: "Los Angeles",         lat:   34.0522, lng:  -118.2437, radiusKm: 80 },
  { country: "United States",   city: "Miami",               lat:   25.7617, lng:   -80.1918, radiusKm: 60 },
  { country: "United States",   city: "San Francisco",       lat:   37.7749, lng:  -122.4194, radiusKm: 60 },
  { country: "United States",   city: "Las Vegas",           lat:   36.1699, lng:  -115.1398, radiusKm: 60 },
  { country: "United States",   city: "Orlando",             lat:   28.5383, lng:   -81.3792, radiusKm: 60 },
  { country: "United States",   city: "Chicago",             lat:   41.8781, lng:   -87.6298, radiusKm: 60 },
  { country: "United States",   city: "Boston",              lat:   42.3601, lng:   -71.0589, radiusKm: 50 },
  { country: "United States",   city: "Washington DC",       lat:   38.9072, lng:   -77.0369, radiusKm: 50 },
  { country: "United States",   city: "Seattle",             lat:   47.6062, lng:  -122.3321, radiusKm: 50 },
  { country: "United States",   city: "Dallas",              lat:   32.7767, lng:   -96.7970, radiusKm: 60 },
  { country: "United States",   city: "Houston",             lat:   29.7604, lng:   -95.3698, radiusKm: 60 },
  { country: "United States",   city: "Atlanta",             lat:   33.7490, lng:   -84.3880, radiusKm: 60 },
  { country: "United States",   city: "Phoenix",             lat:   33.4484, lng:  -112.0740, radiusKm: 60 },
  { country: "United States",   city: "San Diego",           lat:   32.7157, lng:  -117.1611, radiusKm: 50 },
  { country: "United States",   city: "Denver",              lat:   39.7392, lng:  -104.9903, radiusKm: 60 },

  // ── Australia ─────────────────────────────────────────────────────────────
  { country: "Australia",       city: "Sydney",              lat:  -33.8688, lng:   151.2093, radiusKm: 60 },
  { country: "Australia",       city: "Melbourne",           lat:  -37.8136, lng:   144.9631, radiusKm: 60 },
  { country: "Australia",       city: "Brisbane",            lat:  -27.4698, lng:   153.0251, radiusKm: 50 },
  { country: "Australia",       city: "Perth",               lat:  -31.9505, lng:   115.8605, radiusKm: 50 },
  { country: "Australia",       city: "Adelaide",            lat:  -34.9285, lng:   138.6007, radiusKm: 50 },
  { country: "Australia",       city: "Gold Coast",          lat:  -28.0167, lng:   153.4000, radiusKm: 40 },
  { country: "Australia",       city: "Cairns",              lat:  -16.9186, lng:   145.7781, radiusKm: 40 },

  // ── Ireland ───────────────────────────────────────────────────────────────
  { country: "Ireland",         city: "Dublin",              lat:   53.3498, lng:    -6.2603, radiusKm: 50 },
  { country: "Ireland",         city: "Cork",                lat:   51.8985, lng:    -8.4756, radiusKm: 40 },
  { country: "Ireland",         city: "Galway",              lat:   53.2707, lng:    -9.0568, radiusKm: 40 },
  { country: "Ireland",         city: "Shannon",             lat:   52.7019, lng:    -8.8647, radiusKm: 40 },

  // ── Greece ────────────────────────────────────────────────────────────────
  { country: "Greece",          city: "Athens",              lat:   37.9838, lng:    23.7275, radiusKm: 50 },
  { country: "Greece",          city: "Crete (Heraklion)",   lat:   35.3387, lng:    25.1442, radiusKm: 60 },
  { country: "Greece",          city: "Thessaloniki",        lat:   40.6401, lng:    22.9444, radiusKm: 40 },
  { country: "Greece",          city: "Rhodes",              lat:   36.4341, lng:    28.2176, radiusKm: 40 },
];

// Default city shown on first load
export const DEFAULT_CITY: CityEntry = CITIES[0]; // Valencia

// Group cities by country for the selector UI
export function citiesByCountry(): Record<string, CityEntry[]> {
  const map: Record<string, CityEntry[]> = {};
  for (const c of CITIES) {
    if (!map[c.country]) map[c.country] = [];
    map[c.country].push(c);
  }
  return map;
}