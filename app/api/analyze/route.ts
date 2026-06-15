import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, imageToGeminiPart } from '@/lib/gemini';
import { buildAnalysisPrompt, buildSystemPrompt, LocationContext } from '@/lib/prompts';
import { getSoilProfile } from '@/lib/soilRates';

export const runtime = 'nodejs';

// Gemini 2.5 Flash with a rich system prompt can take 15-30s on first call.
// Vercel's default limit is 10s — raise to 60s to prevent timeout crashes.
export const maxDuration = 60;

/**
 * Robustly extract the JSON object from a Gemini response string.
 * Handles:
 *  - Plain JSON (no fences)
 *  - ```json ... ``` fences (with or without preamble text before the fence)
 *  - Preamble / postamble text without fences — falls back to first { ... last }
 */
function extractJson(raw: string): string {
  // Strategy 1: content inside the first ``` fence block
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Strategy 2: outermost { } block (handles preamble/postamble text without fences)
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }

  // Strategy 3: return as-is and let JSON.parse throw its own error
  return raw.trim();
}

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
    const cleaned = extractJson(text);

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
    } catch (parseErr) {
      console.error('[analyze] JSON.parse failed:', parseErr, '\nCleaned text:', cleaned.slice(0, 500));
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
