import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  hasLoggedDbStatus: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? {
          db: {
            url: process.env.DATABASE_URL,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Checks and logs database connection status on server startup
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  // Prevent duplicate log outputs during dev hot-reloads
  if (globalForPrisma.hasLoggedDbStatus) return true;
  globalForPrisma.hasLoggedDbStatus = true;

  if (!process.env.DATABASE_URL) {
    console.warn("⚠️  [Database] Warning: DATABASE_URL is not set in environment.");
    return false;
  }

  try {
    // Lightweight ping query to test actual PostgreSQL credentials & connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ [Database] PostgreSQL connected successfully via Prisma.");
    return true;
  } catch (error: any) {
    const errorMsg =
      error?.message?.split("\n").filter(Boolean)[0] || String(error);
    console.error("❌ [Database] Connection failed:", errorMsg);
    return false;
  }
}

// Automatically verify connection on first server module evaluation
if (typeof window === "undefined") {
  checkDatabaseConnection().catch(() => {});
}
