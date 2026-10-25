// lib/error-handler.ts
import { NextResponse } from "next/server";

/**
 * AppErrorHandler - Singleton Pattern
 * Centralizes error parsing, sanitization, and user-friendly formatting across the application.
 * Translates low-level provider errors (e.g. Gemini 503 high demand, Prisma DB codes)
 * into concise, actionable messages for toasts and UI alerts.
 */
class AppErrorHandler {
  private static instance: AppErrorHandler;

  private constructor() {}

  public static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler();
    }
    return AppErrorHandler.instance;
  }

  /**
   * Sanitizes and transforms any error into a clear, user-friendly message.
   */
  public format(error: unknown): string {
    if (!error) return "An unexpected error occurred.";

    const raw = error instanceof Error ? error.message : String(error);

    // 0. If it's already a clean formatted guidance message, keep it directly
    if (
      raw.includes("choose another model") ||
      raw.includes("select another model")
    ) {
      return raw;
    }

    // 1. Google Gemini API Error: Check for embedded JSON payload (e.g. ApiError: {"error":{...}})
    if (raw.includes('{"error"') || raw.includes('"message"')) {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const innerMsg: string = parsed?.error?.message || parsed?.message || "";
          const code = parsed?.error?.code || parsed?.code;

          if (
            code === 503 ||
            innerMsg.toLowerCase().includes("high demand") ||
            innerMsg.includes("UNAVAILABLE")
          ) {
            return "This model is currently experiencing high demand. Please try again later or choose another model from the dropdown.";
          }

          if (
            code === 429 ||
            innerMsg.toLowerCase().includes("quota") ||
            innerMsg.includes("RESOURCE_EXHAUSTED")
          ) {
            return "Rate limit or quota reached for this model. Please wait a moment or choose another model from the dropdown.";
          }

          if (code === 400 || innerMsg.includes("INVALID_ARGUMENT")) {
            return "Invalid request or prompt structure. Please check your prompt and reference inputs.";
          }

          if (innerMsg.trim().length > 0) {
            return innerMsg;
          }
        }
      } catch {
        // Fallback to text matching
      }
    }

    // 2. Google Gemini / LLM Specific Text Matching
    if (
      raw.includes("503") ||
      raw.includes("UNAVAILABLE") ||
      raw.toLowerCase().includes("high demand")
    ) {
      return "This model is currently experiencing high demand. Please try again later or choose another model from the dropdown.";
    }

    if (
      raw.includes("429") ||
      raw.includes("RESOURCE_EXHAUSTED") ||
      raw.toLowerCase().includes("quota exceeded")
    ) {
      return "Rate limit or quota reached for this model. Please wait a moment or choose another model from the dropdown.";
    }

    if (raw.includes("LLM Execution failed: FAILED") || raw.includes("LLM task execution failed")) {
      return "The AI model failed to execute. The model may be busy; please try again later or choose another model from the dropdown.";
    }

    if (raw.includes("Crop Image failed")) {
      return "Image cropping failed. Please check the source image and try again.";
    }

    if (raw.includes("Extract Frame failed")) {
      return "Video frame extraction failed. Please check the video source and timestamp.";
    }

    if (raw.includes("API key not valid") || raw.includes("API_KEY_INVALID")) {
      return "Invalid Google Gemini API key. Please check your GEMINI_API_KEY environment variable.";
    }

    if (
      (raw.includes("models/") || raw.toLowerCase().includes("model")) &&
      (raw.includes("404") || raw.includes("NOT_FOUND"))
    ) {
      return "The selected model is unavailable. Please choose another model from the dropdown.";
    }

    // 3. Database configuration & connection errors
    if (raw.includes("DATABASE_URL") || raw.includes("Environment variable not found")) {
      return "Database configuration error: DATABASE_URL is missing from environment variables.";
    }

    if (raw.includes("Can't reach database server") || raw.includes("P1001")) {
      return "Unable to connect to the database. Please verify your PostgreSQL connection.";
    }

    if (raw.includes("P2002") || raw.includes("Unique constraint")) {
      return "A record with this identifier already exists.";
    }

    if (raw.includes("P2025") || raw.includes("Record to update not found")) {
      return "The requested record could not be found.";
    }

    // 4. Authentication / Session errors
    if (raw.toLowerCase().includes("unauthor") || raw.includes("sign in")) {
      return "Authentication required. Please sign in to proceed.";
    }

    // 5. Trigger.dev task execution errors
    if (raw.includes("TRIGGER_SECRET_KEY")) {
      return "Trigger.dev secret key is missing. Please set TRIGGER_SECRET_KEY.";
    }

    // 6. Turbopack / Next.js internal wrapper stripping
    if (raw.includes("__TURBOPACK__") || raw.includes(".next/dev/server")) {
      const match = raw.match(/error:\s*([^\n\r]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      return "A server execution error occurred.";
    }

    // 7. General cleanup: keep message concise if very long
    if (raw.length > 180) {
      return raw.slice(0, 177).trim() + "...";
    }

    return raw;
  }

  /**
   * Formats error and returns a standard JSON response for API route handlers.
   */
  public response(error: unknown, status = 500): NextResponse {
    const message = this.format(error);
    console.error(`[AppError ${status}]`, error);
    return NextResponse.json({ error: message }, { status });
  }
}

// Export singleton instance
export const errorHandler = AppErrorHandler.getInstance();
