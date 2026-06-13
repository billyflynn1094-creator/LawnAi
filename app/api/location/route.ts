import { NextRequest, NextResponse } from "next/server";
import { getFullLocationData } from "@/lib/location";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  try {
    const data = await getFullLocationData(lat, lng);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[location]", err);
    return NextResponse.json({ error: "Location lookup failed" }, { status: 500 });
  }
}
