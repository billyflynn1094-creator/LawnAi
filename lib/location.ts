export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: 'cool' | 'warm' | 'transition';
  /** 7-day rolling averages — replaces single-snapshot weather */
  weather?: {
    avg_high_f: number;
    avg_low_f: number;
    avg_humidity: number;
  };
  /** 7-day hourly average soil temperatures */
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  /** 7-day rainfall vs same 7-day window 3-year average */
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
 * Returns a human-readable string informative for users AND compatible with
 * getSoilProfile() fuzzy matching. More reliable than USDA SDMDataAccess
 * point lookup, which frequently returns null on Vercel's serverless IPs.
 */
export function getRegionalSoilProfile(lat: number, lng: number, state?: string): string {
  const s = (state ?? '').toUpperCase();
  if (!s) return 'Loam — recommend soil test for precision';

  if (['WA', 'OR'].includes(s)) {
    return lng < -121
      ? 'Volcanic silt loam — Andisol (Pacific NW coast)'
      : 'Clay-loam — Inceptisol (Pacific NW inland)';
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
    // Central NJ Piedmont (Somerset, Hunterdon, Morris counties)
    // Penn silty clay loam series dominates — weathered Triassic Brunswick red shale
    // Significant clay structure, moderate drainage, pH typically 6.0-6.8
    return 'Silt loam to clay loam — Inceptisol/Ultisol (NJ Piedmont — Penn silty clay loam)';
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

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Utility: sum an array of nullable numbers */
function sumArr(arr: (number | null | undefined)[]): number {
  return (arr ?? []).reduce<number>((s, v) => s + (v ?? 0), 0);
}

/** Utility: average an array of nullable numbers, returning undefined if empty */
function avgArr(arr: (number | null | undefined)[]): number | undefined {
  const valid = (arr ?? []).filter((v): v is number => v != null);
  if (valid.length === 0) return undefined;
  return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 10) / 10;
}

/**
 * Fetch 7-day rolling averages from Open-Meteo (free, no API key required).
 * Single request covers: air temp high/low, humidity, soil temps, and 7-day precip.
 * Replaces the old getWeather() (OpenWeatherMap) and getSoilTemperature() calls.
 */
async function get7DayWeatherAndSoil(
  lat: number,
  lng: number
): Promise<{
  avg_high_f?: number;
  avg_low_f?: number;
  avg_humidity?: number;
  soil_surface_f?: number;
  soil_6cm_f?: number;
  rainfall_7day_in: number;
}> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&past_days=7&forecast_days=0` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&hourly=relative_humidity_2m,soil_temperature_0cm,soil_temperature_6cm` +
      `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return { rainfall_7day_in: 0 };
    const d = await res.json();

    return {
      avg_high_f: avgArr(d?.daily?.temperature_2m_max),
      avg_low_f: avgArr(d?.daily?.temperature_2m_min),
      avg_humidity: avgArr(d?.hourly?.relative_humidity_2m),
      soil_surface_f: avgArr(d?.hourly?.soil_temperature_0cm),
      soil_6cm_f: avgArr(d?.hourly?.soil_temperature_6cm),
      rainfall_7day_in: Math.round(sumArr(d?.daily?.precipitation_sum) * 10) / 10,
    };
  } catch {
    return { rainfall_7day_in: 0 };
  }
}

/**
 * Fetch the 3-year same-window baseline precipitation totals.
 * Each year fetches the equivalent 7-day calendar window for comparison.
 */
async function get7DayRainfallBaselines(
  lat: number,
  lng: number
): Promise<number[]> {
  const today = new Date();
  const fetches = [1, 2, 3].map(yearsBack => {
    const end = new Date(today);
    end.setFullYear(today.getFullYear() - yearsBack);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
        `&start_date=${toDateStr(start)}&end_date=${toDateStr(end)}` +
        `&daily=precipitation_sum&precipitation_unit=inch`
    );
  });

  const responses = await Promise.all(fetches);
  const totals: number[] = [];
  for (const res of responses) {
    if (!res.ok) continue;
    try {
      const data = await res.json();
      totals.push(sumArr(data?.daily?.precipitation_sum));
    } catch { /* skip year */ }
  }
  return totals;
}

/**
 * Aggregate all location enrichment in parallel.
 * Uses NWS geocoder (primary) with Nominatim fallback for reliable town names.
 * Uses regional soil profile instead of USDA series point lookup.
 * Weather and soil temps are 7-day rolling averages (not single snapshots).
 * Rainfall is 7-day total vs 3-year same-calendar-window baseline.
 */
export async function getFullLocationData(
  lat: number,
  lng: number
): Promise<LocationData> {
  // Run all independent fetches in parallel
  const [hardinessResult, geoResult, wxResult, baselineResult] =
    await Promise.allSettled([
      getHardinessZone(lat, lng),
      reverseGeocode(lat, lng),
      get7DayWeatherAndSoil(lat, lng),
      get7DayRainfallBaselines(lat, lng),
    ]);

  const zone = hardinessResult.status === 'fulfilled' ? hardinessResult.value : 'Unknown';
  const geoVal = geoResult.status === 'fulfilled' ? geoResult.value : {};
  const wx = wxResult.status === 'fulfilled' ? wxResult.value : null;
  const baselineTotals = baselineResult.status === 'fulfilled' ? baselineResult.value : [];

  const soilType = getRegionalSoilProfile(lat, lng, geoVal.state);

  // Build rainfall object
  let rainfall: LocationData['rainfall'] = undefined;
  if (wx != null) {
    const recent_in = wx.rainfall_7day_in;
    if (baselineTotals.length > 0) {
      const normal_raw = baselineTotals.reduce((s, v) => s + v, 0) / baselineTotals.length;
      const normal_in = Math.round(normal_raw * 10) / 10;
      rainfall = {
        recent_in,
        normal_in,
        pct_of_normal: normal_in > 0 ? Math.round((recent_in / normal_in) * 100) : 100,
      };
    } else {
      // No baseline available — still surface the 7-day total
      rainfall = { recent_in: wx.rainfall_7day_in, normal_in: 0, pct_of_normal: 100 };
    }
  }

  return {
    lat,
    lng,
    soilType,
    hardiness_zone: zone,
    grassClass: deriveGrassClass(zone),
    weather:
      wx?.avg_high_f != null && wx?.avg_low_f != null
        ? {
            avg_high_f: wx.avg_high_f,
            avg_low_f: wx.avg_low_f,
            avg_humidity: wx.avg_humidity ?? 50,
          }
        : undefined,
    city: geoVal.city,
    state: geoVal.state,
    soil_temp_surface_f: wx?.soil_surface_f,
    soil_temp_6cm_f: wx?.soil_6cm_f,
    rainfall,
  };
}
