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
 * Derive cool-season / warm-season / transition classification from USDA hardiness zone.
 * Zone ≤6 → cool, Zone ≥8 → warm, Zone 7 → transition.
 * Exported so prompts and the UI badge can both use it.
 */
export function deriveGrassClass(zone: string): 'cool' | 'warm' | 'transition' {
  if (!zone || zone === 'Unknown') return 'cool';
  const num = parseInt(zone.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return 'cool';
  if (num <= 6) return 'cool';
  if (num >= 8) return 'warm';
  return 'transition'; // zone 7
}

// ── sessionStorage geocode cache (client-side only; no-op on SSR) ─────────────
function cacheGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function cacheSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(key, value); } catch {}
}

/**
 * Fetch geologic/pedological soil type from USDA Web Soil Survey (no API key).
 * Returns the USDA soil series name e.g. "Sassafras sandy loam".
 */
export async function getSoilType(lat: number, lng: number): Promise<string> {
  try {
    const query = `
      SELECT mapunit.muname
      FROM mapunit
      INNER JOIN component ON mapunit.mukey = component.mukey
      INNER JOIN mupolygon ON mapunit.mukey = mupolygon.mukey
      WHERE ST_Intersects(
        mupolygon.Shape,
        geometry::STGeomFromText('POINT(${lng} ${lat})', 4326)
      )
      AND component.majcompflag = 'Yes'
      ORDER BY component.comppct_r DESC
    `.replace(/\s+/g, ' ').trim();

    const res = await fetch(
      'https://SDMDataAccess.sc.egov.usda.gov/Tabular/SDMTabularService/post.rest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }
    );
    if (!res.ok) return 'Unknown';
    const data = await res.json();
    return data?.Table?.[0]?.[0] ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
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
 * Reverse geocode to town name + state abbreviation using Nominatim OSM.
 * Results are cached in sessionStorage (keyed by rounded lat/lng) to avoid
 * re-hitting Nominatim's 1 req/sec rate limit on repeat uploads.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city?: string; state?: string }> {
  // Round to 3 decimal places (~100m grid) for cache key
  const key = `gc:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = cacheGet(key);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'LawnAI/1.0 (lawn-ai.vercel.app)' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data?.address ?? {};
    const city =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.municipality ??
      addr.hamlet ??
      addr.county;
    const stateRaw: string = addr.state ?? '';
    const state =
      STATE_ABBR[stateRaw] ?? (stateRaw.length <= 3 ? stateRaw : undefined);
    const result = { city, state };
    cacheSet(key, JSON.stringify(result));
    return result;
  } catch {
    return {};
  }
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
 * Compare last-30-day precipitation vs a 3-year rolling average for the same
 * calendar window (years -1, -2, -3 fetched in parallel via Open-Meteo archive).
 * A 3-year average is far more statistically robust than a single prior year,
 * which can itself be an anomalous drought or flood year.
 * Returns totals in inches and % of 3-year normal.
 */
export async function getRainfallData(
  lat: number,
  lng: number
): Promise<LocationData['rainfall']> {
  try {
    const today = new Date();

    // Recent 30 days via forecast API (no archive lag)
    const recentFetch = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=precipitation_sum&past_days=30&forecast_days=0&precipitation_unit=inch`
    );

    // Same 30-day window for 3 prior years via archive API
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
    const recent_in =
      Math.round(sum(recentData?.daily?.precipitation_sum) * 10) / 10;

    // Parse all baseline years that responded successfully
    const baselineTotals: number[] = [];
    for (const res of baselineResponses) {
      if (!res.ok) continue;
      try {
        const data = await res.json();
        baselineTotals.push(sum(data?.daily?.precipitation_sum));
      } catch {
        // skip failed years
      }
    }

    if (baselineTotals.length === 0) return { recent_in, normal_in: 0, pct_of_normal: 100 };

    const normal_raw = baselineTotals.reduce((s, v) => s + v, 0) / baselineTotals.length;
    const normal_in = Math.round(normal_raw * 10) / 10;

    if (normal_in === 0) return { recent_in, normal_in, pct_of_normal: 100 };
    const pct_of_normal = Math.round((recent_in / normal_in) * 100);
    return { recent_in, normal_in, pct_of_normal };
  } catch {
    return undefined;
  }
}

/**
 * Aggregate all location enrichment in parallel (7 concurrent API calls).
 * Includes grass class derivation from hardiness zone for national routing.
 */
export async function getFullLocationData(
  lat: number,
  lng: number
): Promise<LocationData> {
  const [soilType, hardiness_zone, weather, geo, soilTemp, rainfall] =
    await Promise.allSettled([
      getSoilType(lat, lng),
      getHardinessZone(lat, lng),
      getWeather(lat, lng),
      reverseGeocode(lat, lng),
      getSoilTemperature(lat, lng),
      getRainfallData(lat, lng),
    ]);

  const soilTempVal = soilTemp.status === 'fulfilled' ? soilTemp.value : {};
  const zone = hardiness_zone.status === 'fulfilled' ? hardiness_zone.value : 'Unknown';

  return {
    lat,
    lng,
    soilType: soilType.status === 'fulfilled' ? soilType.value : 'Unknown',
    hardiness_zone: zone,
    grassClass: deriveGrassClass(zone),
    weather: weather.status === 'fulfilled' ? weather.value : undefined,
    city: geo.status === 'fulfilled' ? geo.value.city : undefined,
    state: geo.status === 'fulfilled' ? geo.value.state : undefined,
    soil_temp_surface_f: soilTempVal.surface_f,
    soil_temp_6cm_f: soilTempVal.depth_6cm_f,
    rainfall: rainfall.status === 'fulfilled' ? rainfall.value : undefined,
  };
}
