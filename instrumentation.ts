/**
 * Next.js Instrumentation Hook
 * Runs once automatically on server startup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkDatabaseConnection } = await import("@/lib/prisma");
    await checkDatabaseConnection();
  }
}
