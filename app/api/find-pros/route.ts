import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// -- Types -------------------------------------------------------------------

interface NewPlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { openNow?: boolean };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
}

interface NewPlacesResponse {
  places?: NewPlaceResult[];
}

// -- Constants ---------------------------------------------------------------

const MILES_10 = 16_093;  // metres
const MILES_20 = 32_187;  // metres
const MAX_PROS = 7;

// Keyword clusters — run in parallel to cast the widest relevant net
const KEYWORD_CLUSTERS = [
  'lawn care fertilization turf',
  'weed control lawn treatment',
];

// Fields to return from Places API (New)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours',
  'places.regularOpeningHours',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.businessStatus',
].join(',');

// -- Helpers -----------------------------------------------------------------

/**
 * Composite score: rewards both high rating AND high review volume.
 * Prevents a brand-new 5-star from outranking an established 4.7-star
 * with hundreds of reviews.
 *   score = rating × log(1 + reviewCount)
 */
function compositeScore(rating = 0, count = 0): number {
  return rating * Math.log(1 + count);
}

/** One Text Search call to Places API (New) with a hard radius boundary */
async function searchKeyword(
  lat: string,
  lng: string,
  radiusMetres: number,
  keyword: string,
  key: string,
): Promise<NewPlaceResult[]> {
  try {
    const body = {
      textQuery: keyword,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: radiusMetres,
        },
      },
    };

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
        'Referer': 'https://lawn-ai.vercel.app/',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[find-pros] Places API HTTP ${res.status} for keyword "${keyword}"`);
      return [];
    }

    const data: NewPlacesResponse = await res.json();
    return data.places ?? [];
  } catch (e) {
    console.error(`[find-pros] Fetch error for keyword "${keyword}":`, e);
    return [];
  }
}

/**
 * Run all keyword clusters in parallel, merge results, deduplicate by place id.
 */
async function runSearches(
  lat: string,
  lng: string,
  radiusMetres: number,
  key: string,
): Promise<NewPlaceResult[]> {
  const batches = await Promise.all(
    KEYWORD_CLUSTERS.map((kw) => searchKeyword(lat, lng, radiusMetres, kw, key)),
  );

  const seen = new Set<string>();
  const merged: NewPlaceResult[] = [];
  for (const batch of batches) {
    for (const place of batch) {
      if (place.id && !seen.has(place.id)) {
        seen.add(place.id);
        merged.push(place);
      }
    }
  }
  return merged;
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

  // Step 1: Try 10-mile hard radius
  let candidates = await runSearches(lat, lng, MILES_10, key);

  // Step 2: Silent fallback to 20 miles if under threshold
  if (candidates.length < MAX_PROS) {
    const wider = await runSearches(lat, lng, MILES_20, key);
    const seen = new Set(candidates.map((c) => c.id));
    for (const place of wider) {
      if (place.id && !seen.has(place.id)) {
        seen.add(place.id);
        candidates.push(place);
      }
    }
  }

  // Step 3: Filter permanently closed businesses
  const active = candidates.filter(
    (p) => p.businessStatus !== 'CLOSED_PERMANENTLY',
  );

  // Step 4: Rank by composite score (rating × log(1 + reviewCount))
  const ranked = active
    .map((p) => ({
      ...p,
      _score: compositeScore(p.rating, p.userRatingCount),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_PROS);

  // Step 5: Shape response — same structure as before, no UI changes needed
  const pros = ranked.map((p) => ({
    name:          p.displayName?.text ?? 'Unknown',
    address:       p.formattedAddress ?? '',
    rating:        p.rating,
    ratings_count: p.userRatingCount,
    open_now:      p.currentOpeningHours?.openNow ?? p.regularOpeningHours?.openNow,
    place_id:      p.id,
    maps_url:      `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    website:       p.websiteUri,
    phone:         p.nationalPhoneNumber,
  }));

  return NextResponse.json({ pros });
}
