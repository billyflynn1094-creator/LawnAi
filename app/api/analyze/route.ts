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
 */
function extractJson(raw: string): string {
  // Strategy 1: content inside the first ``` fence block
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  // Strategy 2: outermost { } block
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }
  return raw.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, image2, location, isSecondOpinion, originalDiagnosis } = body as {
      image: string;
      image2?: string;
      location: LocationContext;
      isSecondOpinion?: boolean;
      originalDiagnosis?: string;
    };

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const hasSecondImage = Boolean(image2);
    const imagePart  = imageToGeminiPart(image);
    const systemPrompt = buildSystemPrompt();
    const userPrompt   = buildAnalysisPrompt(location ?? { lat: 0, lng: 0 }, hasSecondImage, isSecondOpinion, originalDiagnosis);

    // Build content parts — include second image when provided
    const contentParts: Parameters<typeof geminiFlash.generateContent>[0] = [
      { text: systemPrompt },
      { text: userPrompt },
      imagePart,
    ];

    if (hasSecondImage && image2) {
      const image2Part = imageToGeminiPart(image2);
      contentParts.push(image2Part);
      contentParts.push({ text: 'The image above is the close-up detail photo. Use both images together for a definitive diagnosis.' });
    }

    if (isSecondOpinion) {
      contentParts.push({ text: 'IMPORTANT: This is a SECOND OPINION request. Re-examine the image(s) completely independently with deeper scrutiny. If your diagnosis differs from the prior analysis, populate second_opinion_reasoning explaining the visual evidence that supports your diagnosis.' });
    }

    const result = await geminiFlash.generateContent(contentParts);
    const text    = result.response.text().trim();
    const cleaned = extractJson(text);

    try {
      const analysis = JSON.parse(cleaned);

      // If Gemini requests more detail, pass the request straight through to the UI
      if (analysis.needs_more_photo === true) {
        return NextResponse.json({ analysis });
      }

      // Attach regional soil profile for UI display
      const soilProfile = getSoilProfile(location?.soilType);
      analysis._soil_profile = {
        label:         soilProfile.label,
        notes:         soilProfile.notes,
        fertFrequency: soilProfile.fertFrequency,
        drainageClass: soilProfile.drainageClass,
      };

      return NextResponse.json({ analysis });
    } catch (parseErr) {
      console.error('[analyze] JSON.parse failed:', parseErr, '\nCleaned text:', cleaned.slice(0, 500));
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
