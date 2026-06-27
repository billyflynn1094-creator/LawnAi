import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, imageToGeminiPart } from '@/lib/gemini';
import { buildAnalysisPrompt, LocationContext } from '@/lib/prompts';
import { getSoilProfile } from '@/lib/soilRates';

export const runtime = 'nodejs';

// Gemini 2.5 Flash with a rich system prompt can take 15-30s on first call.
// GPT-4o vision also needs headroom. Raise to 90s to cover both.
export const maxDuration = 90;

// -- JSON helpers ------------------------------------------------------------------

/**
 * Strip HTML from a string so we can extract JSON even when the model wraps
 * its response in an HTML page (e.g. Gemini safety-block pages).
 */
function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Gemini occasionally emits literal (unescaped) newlines and tabs inside JSON
 * string values, which makes JSON.parse throw even though the content looks
 * correct to human eyes.  Walk the string character-by-character and escape
 * any bare control characters that appear inside a quoted string.
 */
function sanitizeJsonString(raw: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { out += ch; inString = !inString; continue; }
    if (inString) {
      if      (ch === '\n') { out += '\\n'; continue; }
      else if (ch === '\r') { out += '\\r'; continue; }
      else if (ch === '\t') { out += '\\t'; continue; }
      else if (ch.charCodeAt(0) < 0x20) { continue; } // strip other control chars
    }
    out += ch;
  }
  return out;
}

/**
 * Robustly extract a JSON object from a raw model response string.
 * Handles: markdown fences, HTML wrappers, bare JSON, unescaped newlines.
 */
function extractJson(raw: string): string {
  let s = raw.trim();

  // 1. Strip HTML ONLY when the response is clearly an HTML document.
  // Do NOT check for angle-bracket patterns inside the body — they appear in
  // JSON field values (e.g. latin species names, math expressions) and would
  // cause stripHtml() to corrupt valid JSON, making JSON.parse() fail.
  if (s.startsWith('<!') || s.startsWith('<html') || s.startsWith('<HTML')) {
    s = stripHtml(s);
  }

  // 2. Content inside the first ``` fence block
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  // 3. Outermost { } block (works for bare JSON and JSON-after-prose)
  const firstBrace = s.indexOf('{');
  const lastBrace  = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return s.slice(firstBrace, lastBrace + 1).trim();
  }

  return s;
}

/**
 * JSON.parse with an automatic fallback that sanitizes unescaped control
 * characters — the most common reason Gemini output fails to parse even though
 * it looks correct to human eyes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function robustParse(cleaned: string): Record<string, any> {
  try {
    return JSON.parse(cleaned);
  } catch {
    // Retry after escaping bare newlines / control chars inside strings
    return JSON.parse(sanitizeJsonString(cleaned));
  }
}

/**
 * Recursively strip HTML tags and common HTML entities from every string value
 * in the parsed analysis JSON.  Gemini (and GPT-4o) can embed HTML markup
 * (<b>, <br>, <ul>) inside JSON field values despite plain-text instructions;
 * this is the defensive server-side layer that guarantees clean text reaches
 * the client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeAnalysis(obj: unknown): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/&amp;/g, '&')         // decode entities FIRST
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, '')         // THEN strip HTML tags
      .replace(/\*\*(.+?)\*\*/g, '$1') // strip markdown bold
      .replace(/\*(.+?)\*/g, '$1')     // strip markdown italic
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(sanitizeAnalysis);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, sanitizeAnalysis(v)])
    );
  }
  return obj;
}



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      image,
      image2,
      location,
      isSecondOpinion,
      originalDiagnosis,
      originalAnalysis,
    } = body as {
      image: string;
      image2?: string;
      location: LocationContext;
      isSecondOpinion?: boolean;
      originalDiagnosis?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originalAnalysis?: Record<string, any>;
    };

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const hasSecondImage = Boolean(image2);

    // ------------------------------------------------------------------------
    // SECOND OPINION — routed to GPT-4o for genuine cross-model validation.
    // A different model family means truly independent visual reasoning,
    // not just a re-run of the same weights with a slightly different prompt.
    // ------------------------------------------------------------------------
    if (isSecondOpinion) {
      // Give Gemini the full first opinion so it can explicitly agree/disagree.
      // A different prompt temperature + explicit "form your own view first" instruction
      // creates genuine independence even within the same model family.
      const originalContext = originalAnalysis
        ? `FIRST OPINION (generated by an independent run of Gemini 2.5 Flash with different temperature):\n${JSON.stringify(originalAnalysis, null, 2)}`
        : `FIRST OPINION identified the primary issue as: "${originalDiagnosis ?? 'unknown'}"`;

      const userText = [
        'SECOND OPINION ANALYSIS',
        '',
        'You are providing an independent second opinion on a lawn/turf photo submitted by a professional turf applicator.',
        '',
        originalContext,
        '',
        '-- YOUR TASK --',
        '1. Examine the image(s) with completely fresh eyes — form your own diagnosis first, before reading the first opinion.',
        '2. Compare your independent findings with the first opinion above.',
        '3. Populate second_opinion_reasoning with: AGREE or DISAGREE, followed by the specific visual evidence from the image(s) that supports your conclusion.',
        '4. Return the SAME JSON schema as the original analysis — all fields must be fully populated.',
        '5. If you disagree, clearly explain which visual cues in the image support a different diagnosis than what the first analysis identified, and why.',
        '',
        buildAnalysisPrompt(location ?? { lat: 0, lng: 0 }, hasSecondImage, false),
        '',
        'CRITICAL OUTPUT REQUIREMENT: second_opinion_reasoning must start with AGREE or DISAGREE, then cite specific visual details from the image(s) as supporting evidence for your assessment.',
      ].join('\n');

      const soImagePart  = imageToGeminiPart(image);
      const soContentParts: Parameters<typeof geminiFlash.generateContent>[0] = [
        { text: userText },
        soImagePart,
      ];

      if (hasSecondImage && image2) {
        const soImage2Part = imageToGeminiPart(image2);
        soContentParts.push(soImage2Part);
        soContentParts.push({ text: 'The image above is the close-up detail photo. Use both images together for your assessment.' });
      }

      const soResult  = await geminiFlash.generateContent(soContentParts);
      const soRawText = soResult.response.text().trim();
      let soCleaned: string;
      try { JSON.parse(soRawText); soCleaned = soRawText; } catch { soCleaned = extractJson(soRawText); }

      try {
        const analysis = sanitizeAnalysis(robustParse(soCleaned));

        if (analysis.needs_more_photo !== true) {
          const soilProfile = getSoilProfile(location?.soilType);
          analysis._soil_profile = {
            label:         soilProfile.label,
            notes:         soilProfile.notes,
            fertFrequency: soilProfile.fertFrequency,
            drainageClass: soilProfile.drainageClass,
          };
          // Tag so the UI knows this is the second-opinion pass
          analysis._second_opinion_model = 'Gemini 2.5 Flash';
        }

        return NextResponse.json({ analysis });
      } catch (parseErr) {
        console.error('[analyze/second-opinion] JSON.parse failed:', parseErr, '\nCleaned:', soCleaned.slice(0, 500));
        return NextResponse.json({ analysis: { raw: soCleaned, parse_error: true } });
      }
    }
    // ------------------------------------------------------------------------
    // PRIMARY ANALYSIS — Gemini 2.5 Flash
    // ------------------------------------------------------------------------
    const imagePart    = imageToGeminiPart(image);
    const userPrompt   = buildAnalysisPrompt(location ?? { lat: 0, lng: 0 }, hasSecondImage, false);

    const contentParts: Parameters<typeof geminiFlash.generateContent>[0] = [
      { text: userPrompt },
      imagePart,
    ];

    if (hasSecondImage && image2) {
      const image2Part = imageToGeminiPart(image2);
      contentParts.push(image2Part);
      contentParts.push({ text: 'The image above is the close-up detail photo. Use both images together for a definitive diagnosis.' });
    }

    const result = await geminiFlash.generateContent(contentParts);
    const text    = result.response.text().trim();
    // With responseMimeType:"application/json" Gemini should return bare JSON.
    // Try a direct parse first; only fall back to the full extractJson pipeline
    // if the direct parse fails (e.g. markdown-fenced output, HTML wrapper).
    let cleaned: string;
    try { JSON.parse(text); cleaned = text; } catch { cleaned = extractJson(text); }

    try {
      const analysis = sanitizeAnalysis(robustParse(cleaned));

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
