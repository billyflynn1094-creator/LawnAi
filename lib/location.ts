export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
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
 * Free, no API key required. Returns proper city/town names.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city?: string; state?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'LawnAI/1.0 (lawn-ai.vercel.app)' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data?.address ?? {};
    // Best available place name: city > town > village > municipality > hamlet > county
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
    return { city, state };
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
 * Compare last-30-day precipitation vs the same 30-day window one year ago.
 * Recent data: Open-Meteo forecast API (past_days=30).
 * Prior-year baseline: Open-Meteo archive API (same calendar window, -1 year).
 * Returns totals in inches and % of prior-year normal.
 */
export async function getRainfallData(
  lat: number,
  lng: number
): Promise<LocationData['rainfall']> {
  try {
    const today = new Date();
    const priorEnd = new Date(today);
    priorEnd.setFullYear(today.getFullYear() - 1);
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorEnd.getDate() - 30);

    const [recentRes, priorRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
          `&daily=precipitation_sum&past_days=30&forecast_days=0&precipitation_unit=inch`
      ),
      fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
          `&start_date=${toDateStr(priorStart)}&end_date=${toDateStr(priorEnd)}` +
          `&daily=precipitation_sum&precipitation_unit=inch`
      ),
    ]);

    if (!recentRes.ok || !priorRes.ok) return undefined;

    const [recentData, priorData] = await Promise.all([
      recentRes.json(),
      priorRes.json(),
    ]);

    const sum = (arr: (number | null)[]): number =>
      (arr ?? []).reduce((s, v) => s + (v ?? 0), 0);

    const recent_in =
      Math.round(sum(recentData?.daily?.precipitation_sum) * 10) / 10;
    const normal_in =
      Math.round(sum(priorData?.daily?.precipitation_sum) * 10) / 10;

    if (normal_in === 0) return { recent_in, normal_in, pct_of_normal: 100 };
    const pct_of_normal = Math.round((recent_in / normal_in) * 100);
    return { recent_in, normal_in, pct_of_normal };
  } catch {
    return undefined;
  }
}

/**
 * Aggregate all location enrichment in parallel (6 concurrent API calls).
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

  return {
    lat,
    lng,
    soilType: soilType.status === 'fulfilled' ? soilType.value : 'Unknown',
    hardiness_zone:
      hardiness_zone.status === 'fulfilled' ? hardiness_zone.value : 'Unknown',
    weather: weather.status === 'fulfilled' ? weather.value : undefined,
    city: geo.status === 'fulfilled' ? geo.value.city : undefined,
    state: geo.status === 'fulfilled' ? geo.value.state : undefined,
    soil_temp_surface_f: soilTempVal.surface_f,
    soil_temp_6cm_f: soilTempVal.depth_6cm_f,
    rainfall: rainfall.status === 'fulfilled' ? rainfall.value : undefined,
  };
}
