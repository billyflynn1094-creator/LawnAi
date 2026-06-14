export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: 'cool' | 'warm' | 'transition';
  weather?: {
    temp_f: number;
    humidity: number;
    condition: string;
  };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  rainfall?: {
    recent_in: number;
    normal_in: number;
    pct_of_normal: number;
  };
}

/** US full state name → 2-letter abbreviation */
const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

/**
 * Derive cool / warm / transition grass class from USDA hardiness zone.
 * Zone ≤6 → cool-season, Zone ≥8 → warm-season, Zone 7 → transition.
 */
export function deriveGrassClass(zone: string): 'cool' | 'warm' | 'transition' {
  if (!zone || zone === 'Unknown') return 'cool';
  const num = parseInt(zone.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return 'cool';
  if (num <= 6) return 'cool';
  if (num >= 8) return 'warm';
  return 'transition';
}

/**
 * Regional soil profile description based on state and coordinates.
 * Returns a human-readable string (e.g. "Silt loam — Inceptisol (NJ Piedmont)")
 * that is informative for users AND compatible with getSoilProfile() fuzzy matching.
 * More reliable than USDA SDMDataAccess point lookup, which requires exact polygon
 * intersection and frequently returns null on Vercel's serverless IPs.
 */
export function getRegionalSoilProfile(lat: number, lng: number, state?: string): string {
  const s = (state ?? '').toUpperCase();
  if (!s) return 'Loam — recommend soil test for precision';

  if (['WA', 'OR'].includes(s)) {
    return lng < -121 ? 'Volcanic silt loam — Andisol (Pacific NW coast)' : 'Clay-loam — Inceptisol (Pacific NW inland)';
  }
  if (s === 'CA') {
    if (lat > 37 && lng > -122) return 'Clay loam to silt loam — Mollisol (Bay/Central Valley)';
    if (lat < 35) return 'Sandy loam — Aridisol (Southern CA)';
    return 'Loam to clay loam — Alfisol (Central CA)';
  }
  if (['AZ', 'NV', 'NM'].includes(s)) return 'Sandy loam to caliche — Aridisol (Desert SW)';
  if (['CO', 'UT', 'WY', 'MT', 'ID'].includes(s)) return 'Loam to clay loam — Mollisol/Inceptisol (Mountain West)';
  if (['ND', 'SD', 'KS', 'NE'].includes(s)) return 'Deep silt loam — Mollisol (Great Plains prairie)';
  if (s === 'OK') return 'Clay loam to silt loam — Mollisol/Vertisol (Southern Plains)';
  if (s === 'TX') {
    if (lng > -97 && lat > 30) return 'Black clay — Vertisol (East Texas Blackland Prairie)';
    if (lat < 29) return 'Sandy loam — Entisol (South Texas/Gulf Coast)';
    return 'Sandy to caliche — Aridisol (West Texas)';
  }
  if (s === 'FL') {
    return lat < 27
      ? 'Sandy coastal plain — Entisol/Spodosol (South Florida flatwoods)'
      : 'Sandy flatwoods — Spodosol (North/Central Florida)';
  }
  if (['GA', 'SC'].includes(s)) {
    return lng > -81 && lat < 34
      ? 'Sandy loam coastal plain — Ultisol (Atlantic Coastal Plain)'
      : 'Red clay to clay loam — Ultisol (Piedmont)';
  }
  if (s === 'NC') {
    return lng > -79
      ? 'Sandy loam coastal plain — Ultisol (NC Coastal Plain)'
      : 'Clay loam — Ultisol (NC Piedmont/Mountain)';
  }
  if (['AL', 'MS', 'LA'].includes(s)) return 'Silty clay loam — Ultisol/Alfisol (Deep South)';
  if (['TN', 'AR'].includes(s)) return 'Silt loam to clay loam — Ultisol/Alfisol (Mid-South)';
  if (['OH', 'IN', 'IL', 'IA', 'MN', 'WI', 'MI'].includes(s)) return 'Deep silt loam — Mollisol/Alfisol (Glaciated Midwest)';
  if (s === 'MO') return 'Silt loam — Alfisol (Missouri Valley)';
  if (['MD', 'DE'].includes(s)) return 'Silt loam to clay loam — Ultisol/Inceptisol (Mid-Atlantic)';
  if (['KY', 'WV'].includes(s)) return 'Silt loam to clay loam — Ultisol/Alfisol (Appalachian/Border South)';
  if (s === 'VA') {
    return lng < -80
      ? 'Sandy loam — Ultisol (Blue Ridge/Appalachian VA)'
      : 'Clay loam — Ultisol (VA Piedmont)';
  }
  if (s === 'PA') {
    return lat < 40.5
      ? 'Silt loam to clay — Ultisol (SE PA Piedmont)'
      : 'Loam to silt loam — Inceptisol (Central/North PA)';
  }
  if (s === 'NJ') {
    if (lng > -74.2) return 'Sandy loam — Entisol/Ultisol (NJ Pine Barrens/Shore)';
    if (lat > 41) return 'Glacial loam — Inceptisol (North NJ Highlands)';
    return 'Silt loam to sandy loam — Inceptisol (NJ Piedmont/Inner Coastal Plain)';
  }
  if (['CT', 'MA', 'RI', 'NH', 'VT', 'ME'].includes(s)) return 'Glacial till / sandy loam — Inceptisol (New England)';
  if (s === 'NY') {
    return lat < 41.5 && lng > -74
      ? 'Sandy loam — Inceptisol (Long Island/Lower Hudson)'
      : 'Glacial loam — Alfisol/Inceptisol (Upstate NY)';
  }
  return 'Loam — regional estimate (recommend soil test for precision)';
}

/**
 * Determine USDA Plant Hardiness Zone from coordinates.
 */
export async function getHardinessZone(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://phzmapi.org/${lat}/${lng}.json`);
    if (!res.ok) return 'Unknown';
    const data = await res.json();
    return data?.zone ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Fetch current weather from OpenWeatherMap (requires OPENWEATHER_API_KEY env var).
 */
export async function getWeather(
  lat: number,
  lng: number
): Promise<LocationData['weather']> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return undefined;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=imperial`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return {
      temp_f: Math.round(data.main.temp),
      humidity: data.main.humidity,
      condition: data.weather?.[0]?.description ?? 'Unknown',
    };
  } catch {
    return undefined;
  }
}

/**
 * Reverse geocode to city + 2-letter state using the NWS Points API.
 * Primary: api.weather.gov (US gov, free, no API key, works from Vercel servers).
 * Fallback: Nominatim OSM (may be rate-limited from cloud IPs).
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city?: string; state?: string }> {
  // ── Primary: NWS Points API ───────────────────────────────────────────────
  try {
    const nwsRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
      { headers: { 'User-Agent': 'LawnAI/1.0 (lawn-ai.vercel.app)' } }
    );
    if (nwsRes.ok) {
      const nwsData = await nwsRes.json();
      const props = nwsData?.properties?.relativeLocation?.properties;
      if (props?.city && props?.state) {
        return { city: props.city, state: props.state };
      }
    }
  } catch {
    // fall through to Nominatim
  }

  // ── Fallback: Nominatim OSM ───────────────────────────────────────────────
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'LawnAI/1.0 (lawn-ai.vercel.app)' } }
    );
    if (nomRes.ok) {
      const data = await nomRes.json();
      const addr = data?.address ?? {};
      const city =
        addr.city ?? addr.town ?? addr.village ??
        addr.municipality ?? addr.hamlet ?? addr.county;
      const stateRaw: string = addr.state ?? '';
      const state =
        STATE_ABBR[stateRaw] ?? (stateRaw.length <= 3 ? stateRaw : undefined);
      if (city) return { city, state };
    }
  } catch {
    // both geocoders failed
  }

  return {};
}

/**
 * Fetch real-time soil temperature from Open-Meteo (free, no API key).
 */
export async function getSoilTemperature(
  lat: number,
  lng: number
): Promise<{ surface_f?: number; depth_6cm_f?: number }> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=soil_temperature_0cm,soil_temperature_6cm&temperature_unit=fahrenheit`
    );
    if (!res.ok) return {};
    const data = await res.json();
    return {
      surface_f:
        data?.current?.soil_temperature_0cm != null
          ? Math.round(data.current.soil_temperature_0cm)
          : undefined,
      depth_6cm_f:
        data?.current?.soil_temperature_6cm != null
          ? Math.round(data.current.soil_temperature_6cm)
          : undefined,
    };
  } catch {
    return {};
  }
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * 30-day precipitation vs 3-year rolling average for the same calendar window.
 * 3 prior years fetched in parallel — far more robust than a single prior year.
 */
export async function getRainfallData(
  lat: number,
  lng: number
): Promise<LocationData['rainfall']> {
  try {
    const today = new Date();

    const recentFetch = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=precipitation_sum&past_days=30&forecast_days=0&precipitation_unit=inch`
    );

    const baselineFetches = [1, 2, 3].map(yearsBack => {
      const end = new Date(today);
      end.setFullYear(today.getFullYear() - yearsBack);
      const start = new Date(end);
      start.setDate(end.getDate() - 30);
      return fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
          `&start_date=${toDateStr(start)}&end_date=${toDateStr(end)}` +
          `&daily=precipitation_sum&precipitation_unit=inch`
      );
    });

    const [recentRes, ...baselineResponses] = await Promise.all([
      recentFetch,
      ...baselineFetches,
    ]);

    if (!recentRes.ok) return undefined;

    const sum = (arr: (number | null)[]): number =>
      (arr ?? []).reduce((s, v) => s + (v ?? 0), 0);

    const recentData = await recentRes.json();
    const recent_in = Math.round(sum(recentData?.daily?.precipitation_sum) * 10) / 10;

    const baselineTotals: number[] = [];
    for (const res of baselineResponses) {
      if (!res.ok) continue;
      try {
        const data = await res.json();
        baselineTotals.push(sum(data?.daily?.precipitation_sum));
      } catch { /* skip */ }
    }

    if (baselineTotals.length === 0) return { recent_in, normal_in: 0, pct_of_normal: 100 };
    const normal_raw = baselineTotals.reduce((s, v) => s + v, 0) / baselineTotals.length;
    const normal_in = Math.round(normal_raw * 10) / 10;
    if (normal_in === 0) return { recent_in, normal_in, pct_of_normal: 100 };
    return { recent_in, normal_in, pct_of_normal: Math.round((recent_in / normal_in) * 100) };
  } catch {
    return undefined;
  }
}

/**
 * Aggregate all location enrichment in parallel.
 * Uses NWS geocoder (primary) with Nominatim fallback for reliable town names.
 * Uses regional soil profile instead of USDA series point lookup.
 */
export async function getFullLocationData(
  lat: number,
  lng: number
): Promise<LocationData> {
  const [hardiness_zone, weather, geo, soilTemp, rainfall] =
    await Promise.allSettled([
      getHardinessZone(lat, lng),
      getWeather(lat, lng),
      reverseGeocode(lat, lng),
      getSoilTemperature(lat, lng),
      getRainfallData(lat, lng),
    ]);

  const soilTempVal = soilTemp.status === 'fulfilled' ? soilTemp.value : {};
  const zone = hardiness_zone.status === 'fulfilled' ? hardiness_zone.value : 'Unknown';
  const geoVal = geo.status === 'fulfilled' ? geo.value : {};

  const soilType = getRegionalSoilProfile(lat, lng, geoVal.state);

  return {
    lat,
    lng,
    soilType,
    hardiness_zone: zone,
    grassClass: deriveGrassClass(zone),
    weather: weather.status === 'fulfilled' ? weather.value : undefined,
    city: geoVal.city,
    state: geoVal.state,
    soil_temp_surface_f: soilTempVal.surface_f,
    soil_temp_6cm_f: soilTempVal.depth_6cm_f,
    rainfall: rainfall.status === 'fulfilled' ? rainfall.value : undefined,
  };
}
