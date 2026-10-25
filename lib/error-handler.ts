import { NextResponse } from "next/server";

/**
 * AppErrorHandler - Singleton Pattern
 * Centralizes error parsing, sanitization, and formatting across the entire application.
 * Prevents long raw stack traces, Turbopack internals, or SQL dumps from leaking to the UI.
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
   * Sanitizes and transforms any error into a short, user-friendly message.
   */
  public format(error: unknown): string {
    if (!error) return "An unexpected error occurred.";

    const raw = error instanceof Error ? error.message : String(error);

    // 1. Missing Database URL or env variable
    if (raw.includes("DATABASE_URL") || raw.includes("Environment variable not found")) {
      return "Database configuration error: DATABASE_URL is missing from environment variables.";
    }

    // 2. Database connection failure
    if (raw.includes("Can't reach database server") || raw.includes("P1001")) {
      return "Unable to connect to the database. Please verify your PostgreSQL connection.";
    }

    // 3. Prisma constraint / validation errors
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
      // Look for a clean embedded message like "error: <actual message>"
      const match = raw.match(/error:\s*([^\n\r]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      return "A server execution error occurred.";
    }

    // 7. General truncation: keep error messages crisp and concise
    if (raw.length > 120) {
      return raw.slice(0, 117).trim() + "...";
    }

    return raw;
  }

  /**
   * Formats error and returns a standard JSON response for API route handlers.
   */
  public response(error: unknown, status = 500): NextResponse {
    const message = this.format(error);
    // Still log the complete diagnostic error to server terminal for developer inspection
    console.error(`[AppError ${status}]`, error);
    return NextResponse.json({ error: message }, { status });
  }
}

// Export singleton instance
export const errorHandler = AppErrorHandler.getInstance();
