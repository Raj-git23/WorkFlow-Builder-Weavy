import { task } from "@trigger.dev/sdk";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";

// Converts data URL, local path, or remote URL into a Gemini Part object
async function prepareImagePart(
  urlOrPath: string
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    // 1. Base64 Data URL
    if (urlOrPath.startsWith("data:")) {
      const match = urlOrPath.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1] || "image/jpeg",
            data: match[2],
          },
        };
      }
    }

    // 2. Absolute filesystem path
    if (path.isAbsolute(urlOrPath) || /^[a-zA-Z]:[\\/]/.test(urlOrPath)) {
      const buffer = await fs.readFile(urlOrPath);
      const ext = path.extname(urlOrPath).toLowerCase().slice(1);
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
      return {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      };
    }

    // 3. Local relative /uploads/ path
    if (urlOrPath.startsWith("/uploads/") || urlOrPath.startsWith("uploads/")) {
      const cleanPath = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
      const candidates = [
        path.join(process.cwd(), "public", cleanPath),
        path.resolve(__dirname, "../../public", cleanPath),
        path.resolve(__dirname, "../public", cleanPath),
      ];

      for (const candidate of candidates) {
        try {
          const buffer = await fs.readFile(candidate);
          const ext = path.extname(candidate).toLowerCase().slice(1);
          const mimeType =
            ext === "png"
              ? "image/png"
              : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
          return {
            inlineData: {
              mimeType,
              data: buffer.toString("base64"),
            },
          };
        } catch {
          // Continue to next candidate
        }
      }
    }

    // 4. Remote HTTP/HTTPS URL
    let targetUrl = urlOrPath;
    if (urlOrPath.startsWith("/")) {
      targetUrl = `http://localhost:3000${urlOrPath}`;
    }

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*",
      },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch image for Gemini (${res.status}): ${targetUrl}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    const data = Buffer.from(arrayBuf).toString("base64");

    return {
      inlineData: {
        mimeType: mimeType.split(";")[0],
        data,
      },
    };
  } catch (err) {
    console.warn("Failed to prepare image part for Gemini:", err);
    return null;
  }
}

// Google Gemini Multimodal LLM Trigger.dev Task
export const geminiTask = task({
  id: "run-gemini",
  maxDuration: 120,
  run: async (payload: {
    model?: string;
    systemPrompt?: string;
    userMessage: string;
    images?: string[];
  }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured in environment variables."
      );
    }

    const { model = "gemini-2.5-flash", systemPrompt, userMessage, images } = payload;

    if (!userMessage || !userMessage.trim()) {
      throw new Error("user_message (prompt) is required for LLM execution.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build multimodal parts array
    const parts: any[] = [];

    // Aggregate reference images
    if (images && images.length > 0) {
      for (const imgUrl of images) {
        if (!imgUrl) continue;
        const part = await prepareImagePart(imgUrl);
        if (part) {
          parts.push(part);
        }
      }
    }

    // Append prompt text
    parts.push({ text: userMessage.trim() });

    // Build request config
    const config: any = {};
    if (systemPrompt && systemPrompt.trim().length > 0) {
      config.systemInstruction = systemPrompt.trim();
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: parts,
        config,
      });

      const text = response.text || "";
      return { text };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("Quota exceeded")
      ) {
        throw new Error(
          `Quota/Rate limit reached for model '${model}'. Please select 'Gemini 2.0 Flash' or 'Gemini 1.5 Flash' (free tier) and try again in a few seconds.`
        );
      }
      throw err;
    }
  },
});
