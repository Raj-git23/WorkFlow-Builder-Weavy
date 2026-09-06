import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const activeCandidates = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
  ];

  for (const model of activeCandidates) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: "Hello! Reply with 'OK from ' + model name.",
      });
      console.log(`[PASS] ${model}:`, res.text?.trim());
    } catch (err) {
      console.log(`[FAIL] ${model}:`, err?.message?.slice(0, 150));
    }
  }
}

main();
