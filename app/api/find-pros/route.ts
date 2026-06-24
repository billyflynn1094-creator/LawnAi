import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// -- Types -------------------------------------------------------------------

interface PlaceResult {
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  place_id: string;
  business_status?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

interface PlaceDetails {
  website?: string;
  formatted_phone_number?: string;
}

// -- Constants ---------------------------------------------------------------

const MILES_10_M = 16_093;  // 10 miles in metres
const MILES_20_M = 32_187;  // 20 miles in metres
const MAX_PROS   = 7;

// Three keyword clusters — parallel searches cast a wider net.
// Cluster 3 catches full-service landscapers offering turf/aeration/seeding
// that may not use 'lawn care' or 'fertilization' in their primary listing.
const KEYWORD_CLUSTERS = [
  'lawn care fertilization',
  'weed control turf treatment',
  'turf management lawn maintenance',
];

const MAPS_HEADERS = {
  'Referer': 'https://lawn-ai.vercel.app/',
  'X-Goog-Maps-Api-Key-Referer': 'https://lawn-ai.vercel.app/',
};

// -- Helpers -----------------------------------------------------------------

/** Haversine distance in miles between two lat/lng points */
function distanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Composite score: rewards both high rating AND high review volume.
 *  score = rating x log(1 + reviewCount)
 *  A 4.8* / 109 reviews scores much higher than a 5.0* / 2 reviews. */
function compositeScore(rating = 0, count = 0): number {
  return rating * Math.log(1 + count);
}

/** One Text Search call via Places API */
async function searchKeyword(
  lat: string,
  lng: string,
  radiusMetres: number,
  keyword: string,
  key: string,
): Promise<PlaceResult[]> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(keyword)}` +
      `&location=${lat},${lng}` +
      `&radius=${radiusMetres}` +
      `&key=${key}`;

    const res = await fetch(url, { headers: MAPS_HEADERS, cache: 'no-store' });

    if (!res.ok) {
      console.error(`[find-pros] HTTP ${res.status} for keyword "${keyword}"`);
      return [];
    }

    const data = await res.json();

    if (data.status === 'OK') return data.results ?? [];
    if (data.status === 'ZERO_RESULTS') return [];

    console.error(
      `[find-pros] Maps API status "${data.status}" for "${keyword}":`,
      data.error_message,
    );
    return [];
  } catch (e) {
    console.error(`[find-pros] Fetch error for "${keyword}":`, e);
    return [];
  }
}

/** Run all keyword clusters in parallel, merge, deduplicate by place_id */
async function runSearches(
  lat: string,
  lng: string,
  radiusMetres: number,
  key: string,
): Promise<PlaceResult[]> {
  const batches = await Promise.all(
    KEYWORD_CLUSTERS.map((kw) => searchKeyword(lat, lng, radiusMetres, kw, key)),
  );

  const seen   = new Set<string>();
  const merged: PlaceResult[] = [];

  for (const batch of batches) {
    for (const place of batch) {
      if (place.place_id && !seen.has(place.place_id)) {
        seen.add(place.place_id);
        merged.push(place);
      }
    }
  }
  return merged;
}

async function fetchPlaceDetails(
  placeId: string,
  key: string,
): Promise<PlaceDetails> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}` +
      `&fields=website,formatted_phone_number` +
      `&key=${key}`;
    const res = await fetch(url, { headers: MAPS_HEADERS, cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    return data.result ?? {};
  } catch {
    return {};
  }
}

// -- Route -------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Location required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Maps API not configured — add GOOGLE_MAPS_API_KEY to Vercel env vars' },
      { status: 500 },
    );
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  // Step 1: 3 parallel searches at 10-mile radius bias
  // Then apply Haversine hard filter to enforce true 10-mile boundary
  // (Text Search uses radius as bias only; Haversine enforces the hard cut)
  let raw = await runSearches(lat, lng, MILES_10_M, key);

  let inRadius = raw.filter((p) => {
    const loc = p.geometry?.location;
    if (!loc) return true; // keep if no coords returned
    return distanceMiles(userLat, userLng, loc.lat, loc.lng) <= 10;
  });

  // Step 2: Silent fallback to 20 miles if still under 7
  if (inRadius.length < MAX_PROS) {
    const wider = await runSearches(lat, lng, MILES_20_M, key);

    const seen = new Set(raw.map((c) => c.place_id));
    for (const place of wider) {
      if (place.place_id && !seen.has(place.place_id)) {
        seen.add(place.place_id);
        raw.push(place);
      }
    }

    inRadius = raw.filter((p) => {
      const loc = p.geometry?.location;
      if (!loc) return true;
      return distanceMiles(userLat, userLng, loc.lat, loc.lng) <= 20;
    });
  }

  // Step 3: Remove permanently closed businesses
  const active = inRadius.filter(
    (p) => p.business_status !== 'PERMANENTLY_CLOSED',
  );

  // Step 4: Composite ranking — rating x log(1 + reviewCount)
  const ranked = active
    .map((p) => ({
      ...p,
      _score: compositeScore(p.rating, p.user_ratings_total),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_PROS);

  // Step 5: Enrich top 7 with website + phone in parallel
  const details = await Promise.all(
    ranked.map((p) => fetchPlaceDetails(p.place_id, key)),
  );

  const pros = ranked.map((p, i) => ({
    name:          p.name,
    address:       p.formatted_address ?? '',
    rating:        p.rating,
    ratings_count: p.user_ratings_total,
    open_now:      p.opening_hours?.open_now,
    place_id:      p.place_id,
    maps_url:      `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    website:       details[i].website,
    phone:         details[i].formatted_phone_number,
  }));

  return NextResponse.json({ pros });
}
