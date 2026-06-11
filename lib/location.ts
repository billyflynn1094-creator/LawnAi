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
}

/**
 * Fetch soil type from USDA Web Soil Survey (no API key required).
 * Uses the Soil Data Mart REST endpoint.
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
    `.replace(/\s+/g, " ").trim();

    const url = `https://SDMDataAccess.sc.egov.usda.gov/Tabular/SDMTabularService/post.rest`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) return "Unknown";
    const data = await res.json();
    return data?.Table?.[0]?.[0] ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Determine USDA Plant Hardiness Zone from coordinates.
 * Uses the USDA PHZM API (no key required).
 */
export async function getHardinessZone(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://phzmapi.org/${lat}/${lng}.json`
    );
    if (!res.ok) return "Unknown";
    const data = await res.json();
    return data?.zone ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Fetch current weather from OpenWeatherMap.
 */
export async function getWeather(
  lat: number,
  lng: number
): Promise<LocationData["weather"]> {
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
      condition: data.weather?.[0]?.description ?? "Unknown",
    };
  } catch {
    return undefined;
  }
}

/**
 * Reverse geocode to get city/state using the free Census Geocoder.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city?: string; state?: string }> {
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=10`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const place =
      data?.result?.geographies?.["Incorporated Places"]?.[0] ??
      data?.result?.geographies?.["Census Designated Places"]?.[0];
    const county =
      data?.result?.geographies?.Counties?.[0];

    return {
      city: place?.NAME ?? county?.NAME,
      state: county?.STATE ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Aggregate all location data in parallel.
 */
export async function getFullLocationData(
  lat: number,
  lng: number
): Promise<LocationData> {
  const [soilType, hardiness_zone, weather, geo] = await Promise.allSettled([
    getSoilType(lat, lng),
    getHardinessZone(lat, lng),
    getWeather(lat, lng),
    reverseGeocode(lat, lng),
  ]);

  return {
    lat,
    lng,
    soilType:
      soilType.status === "fulfilled" ? soilType.value : "Unknown",
    hardiness_zone:
      hardiness_zone.status === "fulfilled" ? hardiness_zone.value : "Unknown",
    weather:
      weather.status === "fulfilled" ? weather.value : undefined,
    city: geo.status === "fulfilled" ? geo.value.city : undefined,
    state: geo.status === "fulfilled" ? geo.value.state : undefined,
  };
}
