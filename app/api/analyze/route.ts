import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, imageToGeminiPart } from '@/lib/gemini';
import { buildAnalysisPrompt, buildSystemPrompt, LocationContext } from '@/lib/prompts';
import { getSoilProfile } from '@/lib/soilRates';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, location } = body as { image: string; location: LocationContext };

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const imagePart = imageToGeminiPart(image);
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildAnalysisPrompt(location ?? { lat: 0, lng: 0 });

    const result = await geminiFlash.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
      imagePart,
    ]);

    const text = result.response.text().trim();

    // Strip any accidental markdown fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      const analysis = JSON.parse(cleaned);

      // Attach regional soil profile for UI display
      const soilProfile = getSoilProfile(location?.soilType);
      analysis._soil_profile = {
        label: soilProfile.label,
        notes: soilProfile.notes,
        fertFrequency: soilProfile.fertFrequency,
        drainageClass: soilProfile.drainageClass,
      };

      return NextResponse.json({ analysis });
    } catch {
      // Return raw text with parse_error flag so UI can still display it
      return NextResponse.json({
        analysis: { raw: cleaned, parse_error: true },
      });
    }
  } catch (err) {
    console.error('[analyze]', err);
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
