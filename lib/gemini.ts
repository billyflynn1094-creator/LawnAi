import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.4,
    topP: 0.9,
    maxOutputTokens: 2048,
  },
});

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
