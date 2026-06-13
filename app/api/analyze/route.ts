import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, imageToGeminiPart } from '@/lib/gemini';
import { buildAnalysisPrompt, buildSystemPrompt, LocationContext } from '@/lib/prompts';
import { findMatchingProducts } from '@/lib/catalog';
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

      // ── Post-process: enrich products with catalog SKUs ──────────────────
      if (analysis.treatment?.products?.length) {
        const keywords = [
          analysis.diagnosis?.issue_type ?? '',
          analysis.identified?.primary ?? '',
          ...analysis.treatment.products.map((p: { name: string }) => p.name),
        ].filter(Boolean);

        const catalogMatches = findMatchingProducts(keywords);

        analysis.treatment.products = analysis.treatment.products.map(
          (p: { name: string; sku?: string; type: string; application_rate: string; timing: string; notes: string }) => {
            // Only add catalog match if AI didn't already find one
            if (!p.sku) {
              const match = catalogMatches.find(c =>
                c.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]) ||
                p.name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]) ||
                c.useCase.some(uc => p.name.toLowerCase().includes(uc.toLowerCase()))
              );
              if (match) {
                return { ...p, sku: match.sku, catalog_name: match.name };
              }
            }
            return p;
          }
        );
      }

      // ── Attach soil profile for UI display ───────────────────────────────
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
