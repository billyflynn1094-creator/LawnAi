import { NextRequest, NextResponse } from "next/server";
import { geminiFlash, imageToGeminiPart } from "@/lib/gemini";
import {
  IRRIGATION_SYSTEM_PROMPT,
  buildDesignAssessmentPrompt,
  CONTROLLER_ID_PROMPT,
  VALVE_ID_PROMPT,
  buildRainSensorPrompt,
  buildElectricalPrompt,
  buildHydraulicPrompt,
  buildZoneAssessmentPrompt,
  buildHomeownerPrompt,
  buildInspectionSummaryPrompt,
} from "@/lib/irrigation/prompts";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    mode,
    image,
    symptom,
    ohmReading,
    brand,
    preset,
    zones,
    question,
    systemContext,
    findings,
  } = body as {
    mode: string;
    image?: string;
    symptom?: string;
    ohmReading?: number;
    brand?: string;
    preset?: string;
    zones?: { type: string; count: number }[];
    question?: string;
    systemContext?: string;
    findings?: string;
  };

  try {
    let userPrompt = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let imagePart: any = null;

    if (image) {
      imagePart = imageToGeminiPart(image);
    }

    switch (mode) {
      case "design_assessment":
      case "full_inspection":
        userPrompt = buildDesignAssessmentPrompt();
        break;
      case "controller_id":
        userPrompt = CONTROLLER_ID_PROMPT;
        break;
      case "valve_id":
        userPrompt = VALVE_ID_PROMPT;
        break;
      case "rain_sensor":
        userPrompt = buildRainSensorPrompt();
        break;
      case "electrical_diagnosis":
        userPrompt = buildElectricalPrompt(symptom ?? preset ?? "general", ohmReading, brand);
        break;
      case "hydraulic_diagnosis":
        userPrompt = buildHydraulicPrompt(symptom ?? preset ?? "general");
        break;
      case "zone_assessment":
        userPrompt = buildZoneAssessmentPrompt(zones ?? []);
        break;
      case "homeowner":
        userPrompt = buildHomeownerPrompt(question ?? "", systemContext ?? "");
        break;
      case "inspection_summary":
        userPrompt = buildInspectionSummaryPrompt(findings ?? "");
        break;
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }

    const parts = imagePart
      ? [IRRIGATION_SYSTEM_PROMPT, imagePart, userPrompt]
      : [IRRIGATION_SYSTEM_PROMPT, userPrompt];

    const result = await geminiFlash.generateContent(parts);
    const text = result.response.text();

    let analysis: unknown;
    try {
      analysis = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          analysis = JSON.parse(match[0]);
        } catch {
          analysis = { error: "Parse error", raw: text.slice(0, 500) };
        }
      } else {
        analysis = { error: "No JSON found", raw: text.slice(0, 500) };
      }
    }

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[irrigation-analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
