import { NextRequest, NextResponse } from "next/server";
import { geminiFlash, imageToGeminiPart } from "@/lib/gemini";
import {
  IRRIGATION_SYSTEM_PROMPT,
  buildDesignAssessmentPrompt,
  CONTROLLER_ID_PROMPT,
  VALVE_ID_PROMPT,
  RAIN_SENSOR_PROMPT,
  buildElectricalPrompt,
  buildHydraulicPrompt,
} from "@/lib/irrigation/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, image, symptom, ohmReading, brand, hydraulicSymptom, locationContext } = body;

    if (!mode) {
      return NextResponse.json({ error: "mode is required" }, { status: 400 });
    }

    if (mode === "electrical_diagnosis") {
      const prompt = buildElectricalPrompt(symptom, ohmReading, brand);
      const result = await geminiFlash.generateContent([
        { text: IRRIGATION_SYSTEM_PROMPT },
        { text: prompt },
      ]);
      const text = result.response.text();
      let analysis;
      try { analysis = JSON.parse(text); }
      catch { const m = text.match(/\{[\s\S]*\}/); analysis = m ? JSON.parse(m[0]) : { raw: text }; }
      return NextResponse.json({ analysis });
    }

    if (mode === "hydraulic_diagnosis") {
      const prompt = buildHydraulicPrompt(hydraulicSymptom || symptom || "unknown hydraulic issue");
      const result = await geminiFlash.generateContent([
        { text: IRRIGATION_SYSTEM_PROMPT },
        { text: prompt },
      ]);
      const text = result.response.text();
      let analysis;
      try { analysis = JSON.parse(text); }
      catch { const m = text.match(/\{[\s\S]*\}/); analysis = m ? JSON.parse(m[0]) : { raw: text }; }
      return NextResponse.json({ analysis });
    }

    if (!image) {
      return NextResponse.json({ error: "image is required for this mode" }, { status: 400 });
    }

    const base64 = image.includes(",") ? image.split(",")[1] : image;
    const imagePart = imageToGeminiPart(base64);

    let userPrompt: string;
    switch (mode) {
      case "design_assessment":
      case "full_inspection":
        userPrompt = buildDesignAssessmentPrompt(locationContext || "No location context provided");
        break;
      case "controller_id":
        userPrompt = CONTROLLER_ID_PROMPT;
        break;
      case "valve_id":
        userPrompt = VALVE_ID_PROMPT;
        break;
      case "rain_sensor":
        userPrompt = RAIN_SENSOR_PROMPT;
        break;
      default:
        userPrompt = buildDesignAssessmentPrompt("General irrigation assessment requested");
    }

    const result = await geminiFlash.generateContent([
      { text: IRRIGATION_SYSTEM_PROMPT },
      imagePart,
      { text: userPrompt },
    ]);

    const text = result.response.text();
    let analysis;
    try { analysis = JSON.parse(text); }
    catch { const m = text.match(/\{[\s\S]*\}/); analysis = m ? JSON.parse(m[0]) : { raw: text }; }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[irrigation-analyze]", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
