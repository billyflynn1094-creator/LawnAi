import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt } from "@/lib/prompts";

// ── Lazy initialization ────────────────────────────────────────────────────
// Do NOT validate GEMINI_API_KEY at module level — a module-level throw causes
// Vercel to return a raw non-JSON "An error occurred..." response before our
// route handler's try/catch can intercept it.
// The key is validated when the first request arrives (inside the try/catch).

let _model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel() {
  if (_model) return _model;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured in Vercel environment variables.");
  _model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: "gemini-2.5-flash",
    // Pass the system prompt via systemInstruction so Gemini treats it as a
    // true system-level directive, not user content — this enforces plain-text
    // output and JSON schema compliance far more reliably.
    systemInstruction: buildSystemPrompt(),
    generationConfig: {
      temperature: 0.65,
      topP: 0.9,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  return _model;
}

// Proxy keeps the same external API — route.ts calls geminiFlash.generateContent(...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const geminiFlash = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateContent(request: any) {
    return getModel().generateContent(request);
  },
};

/**
 * Convert a base64 image string to the inline data format Gemini expects.
 */
export function imageToGeminiPart(base64: string, mimeType = "image/jpeg") {
  return {
    inlineData: {
      data: base64.replace(/^data:image\/\w+;base64,/, ""),
      mimeType,
    },
  };
}
