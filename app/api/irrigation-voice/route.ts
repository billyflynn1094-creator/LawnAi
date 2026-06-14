import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { buildHomeownerPrompt } from "@/lib/irrigation/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, systemContext } = body;

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const prompt = buildHomeownerPrompt(
      question,
      systemContext || "Residential irrigation system, tech is on-site with homeowner"
    );

    const result = await geminiFlash.generateContent([{ text: prompt }]);
    const text = result.response.text();

    let analysis;
    try { analysis = JSON.parse(text); }
    catch { const m = text.match(/\{[\s\S]*\}/); analysis = m ? JSON.parse(m[0]) : { technician_response: text, key_points: [] }; }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[irrigation-voice]", err);
    return NextResponse.json({ error: "Voice query failed. Please try again." }, { status: 500 });
  }
}
