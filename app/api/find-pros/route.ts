import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

interface PlaceResult {
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  place_id: string;
  business_status?: string;
}

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
      { status: 500 }
    );
  }

  // 15-mile radius (~24 km) — wide enough for suburban / rural areas
  const radius = 24140;
  const query  = encodeURIComponent('lawn care fertilization service');
  const url    = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${lat},${lng}&radius=${radius}&key=${key}`;

  const res  = await fetch(url, { next: { revalidate: 0 } });
  const data = await res.json() as { status: string; results?: PlaceResult[]; error_message?: string };

  if (data.status === 'ZERO_RESULTS') {
    return NextResponse.json({ pros: [] });
  }

  if (data.status !== 'OK') {
    console.error('[find-pros] Maps API status:', data.status, data.error_message);
    return NextResponse.json(
      { error: `Maps API error: ${data.status}` },
      { status: 502 }
    );
  }

  // Return up to 8 results — filter out permanently closed
  const pros = (data.results ?? [])
    .filter((p) => p.business_status !== 'PERMANENTLY_CLOSED')
    .slice(0, 8)
    .map((p) => ({
      name:          p.name,
      address:       p.formatted_address ?? '',
      rating:        p.rating,
      ratings_count: p.user_ratings_total,
      open_now:      p.opening_hours?.open_now,
      place_id:      p.place_id,
      maps_url:      `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    }));

  return NextResponse.json({ pros });
}
