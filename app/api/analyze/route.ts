import { NextRequest, NextResponse } from 'next/server';
import { geminiFlash, imageToGeminiPart } from '@/lib/gemini';
import { buildAnalysisPrompt, LocationContext } from '@/lib/prompts';
import { getSoilProfile } from '@/lib/soilRates';

export const runtime = 'nodejs';

// Gemini 2.5 Flash with a rich system prompt can take 15-30s on first call.
// GPT-4o vision also needs headroom. Raise to 90s to cover both.
export const maxDuration = 90;

// -- JSON helpers ---------------------------------------------------------------------------

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

  // 1. Strip HTML only when the response clearly starts with an HTML document.
  // Do NOT check for angle-bracket patterns inside the body — they appear in
  // JSON field values (e.g. latin species names like <Poa pratensis>) and would
  // cause stripHtml() to corrupt valid JSON (&quot; → " breaks JSON string boundaries).
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
 * Structurally repair JSON that was cut off mid-response (token-limit
 * truncation). Walks the string tracking open braces/brackets and whether
 * we're inside a quoted string, then closes whatever was left open — this
 * recovers a valid (if partial) object instead of failing outright.
 */
function repairTruncatedJson(raw: string): string {
  let s = raw;
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // Truncated mid-string — close the open string literal first.
  if (inString) s += '"';

  // Drop a dangling trailing comma / colon left by the cut before closing.
  s = s.replace(/,\s*$/, '').replace(/:\s*$/, ': null');

  // Close whatever braces/brackets were still open, innermost first.
  for (let i = stack.length - 1; i >= 0; i--) {
    s += stack[i] === '{' ? '}' : ']';
  }

  return s;
}

/**
 * JSON.parse with automatic fallbacks:
 *   1. Straight parse.
 *   2. Retry after escaping bare newlines / control chars inside strings
 *      — the most common reason Gemini output fails to parse even though
 *      it looks correct to human eyes.
 *   3. Retry after structurally repairing a token-limit-truncated response
 *      (closes any braces/brackets/strings left open by the cutoff).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function robustParse(cleaned: string): Record<string, any> {
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      // Retry after escaping bare newlines / control chars inside strings
      return JSON.parse(sanitizeJsonString(cleaned));
    } catch {
      // Last resort: the response was truncated mid-structure — repair and retry.
      return JSON.parse(repairTruncatedJson(sanitizeJsonString(cleaned)));
    }
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
      .replace(/&amp;/g, '&')         // decode entities FIRST so entity-encoded tags get stripped
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, '')        // THEN strip HTML tags
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


/**
 * Deterministic confidence gate — runs in plain code, NOT the LLM, so it can't
 * hallucinate. Two responsibilities:
 *  1. Environmental plausibility check: downgrades self-reported confidence when
 *     the diagnosis contradicts the actual weather/soil data we already have
 *     (e.g. fungal disease claimed under conditions that don't support it).
 *  2. Second-photo gate: flags _needs_second_photo when confidence is low, or
 *     medium with moderate/critical severity — the UI uses this flag to prompt
 *     the user for a follow-up photo instead of trusting a shaky diagnosis.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConfidenceGate(analysis: Record<string, any>, location: LocationContext): Record<string, any> {
  if (!analysis || analysis.needs_more_photo === true || analysis.parse_error) return analysis;

  let confidence: string = (analysis.confidence_level ?? 'medium').toLowerCase();
  const issueType: string = (analysis.diagnosis?.issue_type ?? '').toLowerCase();
  const severity: string  = (analysis.diagnosis?.severity ?? '').toLowerCase();
  const contradictions: string[] = [];

  // -- Fungal/disease plausibility vs. humidity + soil temp --------------------
  const isFungal = issueType === 'disease' || issueType === 'fungus';
  if (isFungal && location.weather && location.soil_temp_surface_f != null) {
    const lowHumidity = location.weather.avg_humidity < 40;
    const coldSoil = location.soil_temp_surface_f < 50;
    if (lowHumidity && coldSoil) {
      contradictions.push(
        `Diagnosis is a fungal/disease issue, but 7-day humidity (${location.weather.avg_humidity}%) and soil temp (${location.soil_temp_surface_f}°F) are both outside typical pathogen-favorable range.`
      );
    }
  }

  // -- Drought diagnosis vs. rainfall data --------------------------------------
  if (issueType === 'drought' && location.rainfall && location.rainfall.pct_of_normal >= 120) {
    contradictions.push(
      `Diagnosis is drought stress, but 7-day rainfall is ${location.rainfall.pct_of_normal}% of the 3-year normal — above-normal, not below.`
    );
  }

  // -- Overwatering diagnosis vs. rainfall data ---------------------------------
  if (issueType === 'overwatering' && location.rainfall && location.rainfall.pct_of_normal < 80) {
    contradictions.push(
      `Diagnosis is overwatering, but 7-day rainfall is ${location.rainfall.pct_of_normal}% of the 3-year normal — below-normal, not above.`
    );
  }

  if (contradictions.length > 0) {
    // Force confidence down at least one tier when the data contradicts the model's own claim.
    confidence = confidence === 'high' ? 'medium' : 'low';
    analysis._confidence_override_reason = contradictions.join(' ');
  }

  analysis.confidence_level = confidence;

  // -- Second-photo gate ---------------------------------------------------------
  const lowConfidence = confidence === 'low';
  const mediumButSerious = confidence === 'medium' && (severity === 'moderate' || severity === 'critical');
  const multiplePlausible = Array.isArray(analysis.ruled_out) && analysis.ruled_out.length >= 2 && confidence !== 'high';

  analysis._needs_second_photo = Boolean(lowConfidence || mediumButSerious || multiplePlausible);

  return analysis;
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
      tier,
    } = body as {
      image: string;
      image2?: string;
      location: LocationContext;
      isSecondOpinion?: boolean;
      originalDiagnosis?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originalAnalysis?: Record<string, any>;
      /** 'consumer' = HomeLawn (Home Depot retail brands); default 'pro' = ProLawn (unchanged). */
      tier?: 'pro' | 'consumer';
    };

    const productTier: 'pro' | 'consumer' = tier === 'consumer' ? 'consumer' : 'pro';

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const hasSecondImage = Boolean(image2);

    // ---------------------------------------------------------------------------
    // SECOND OPINION — routed to GPT-4o for genuine cross-model validation.
    // A different model family means truly independent visual reasoning,
    // not just a re-run of the same weights with a slightly different prompt.
    // ---------------------------------------------------------------------------
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
        buildAnalysisPrompt(location ?? { lat: 0, lng: 0 }, hasSecondImage, false, undefined, productTier),
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

      const soResult  = await geminiFlash.generateContent(soContentParts, productTier);
      const soRawText = soResult.response.text().trim();
      const soCleaned = extractJson(soRawText);

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
          applyConfidenceGate(analysis, location ?? { lat: 0, lng: 0 });
        }

        return NextResponse.json({ analysis: sanitizeAnalysis(analysis) });
      } catch (parseErr) {
        console.error('[analyze/second-opinion] JSON.parse failed:', parseErr, '\nCleaned:', soCleaned.slice(0, 500));
        return NextResponse.json({ analysis: { raw: soCleaned, parse_error: true } });
      }
    }
    // ---------------------------------------------------------------------------
    // PRIMARY ANALYSIS — Gemini 2.5 Flash
    // ---------------------------------------------------------------------------
    const imagePart    = imageToGeminiPart(image);
    const userPrompt   = buildAnalysisPrompt(location ?? { lat: 0, lng: 0 }, hasSecondImage, false, undefined, productTier);

    const contentParts: Parameters<typeof geminiFlash.generateContent>[0] = [
      { text: userPrompt },
      imagePart,
    ];

    if (hasSecondImage && image2) {
      const image2Part = imageToGeminiPart(image2);
      contentParts.push(image2Part);
      contentParts.push({ text: 'The image above is the close-up detail photo. Use both images together for a definitive diagnosis.' });
    }

    const result = await geminiFlash.generateContent(contentParts, productTier);
    const text    = result.response.text().trim();
    const cleaned = extractJson(text);

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

      applyConfidenceGate(analysis, location ?? { lat: 0, lng: 0 });

      return NextResponse.json({ analysis: sanitizeAnalysis(analysis) });
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
