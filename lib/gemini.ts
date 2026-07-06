import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt } from "@/lib/prompts";

// ── Lazy initialization ─────────────────────────────────────────────────────────────────────────────────
// Do NOT validate GEMINI_API_KEY at module level — a module-level throw causes
// Vercel to return a raw non-JSON "An error occurred..." response before our
// route handler's try/catch can intercept it.
// The key is validated when the first request arrives (inside the try/catch).

type Tier = "pro" | "consumer";

// Cache one model instance PER TIER — each tier has a different systemInstruction
// (approved manufacturer list differs), so they cannot share a single cached model.
// Default ("pro") preserves the exact pre-existing behavior for any caller that
// does not pass a tier (e.g. ProLawn, second-opinion pass).
const _models: Partial<Record<Tier, ReturnType<GoogleGenerativeAI["getGenerativeModel"]>>> = {};

function getModel(tier: Tier = "pro") {
  const cached = _models[tier];
  if (cached) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured in Vercel environment variables.");
  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: "gemini-2.5-flash",
    // Pass the system prompt via systemInstruction so Gemini treats it as a
    // true system-level directive, not user content — this enforces plain-text
    // output and JSON schema compliance far more reliably.
    systemInstruction: buildSystemPrompt(tier),
    generationConfig: {
      temperature: 0.65,
      topP: 0.9,
      maxOutputTokens: 8000,
      responseMimeType: "application/json",
    },
  });
  _models[tier] = model;
  return model;
}

// Proxy keeps the same external API — route.ts calls geminiFlash.generateContent(...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const geminiFlash = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateContent(request: any, tier: Tier = "pro") {
    return getModel(tier).generateContent(request);
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
