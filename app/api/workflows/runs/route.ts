import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorHandler } from "@/lib/error-handler";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {

    try {
        const { user, error } = await requireAuth();

        if (error) return error;

        // Gracefully handle unconfigured or empty database
        if (!process.env.DATABASE_URL) {
            return NextResponse.json({ runs: [] });
        }

        // Fetching single workflow run
        const { searchParams } = new URL(req.url);
        const workflowId = searchParams.get("workflowId");

        const userId = user?.userId;

        const runs = await prisma.workflowRun.findMany({
            where: {
                userId: userId,
                ...(workflowId ? { workflowId } : {}),      // if workflowId is present then fetch based on that, otherwise just on userId
            },
            orderBy: { startedAt: "desc" },
            include: {
                nodeExecutions: {
                    orderBy: { startedAt: "asc" },
                }
            },
            take: 50    // Most 50 recent runs
        });

        return NextResponse.json({ runs: runs ?? [] });

    } catch (err: any) {
        // Return empty runs list if database tables are uninitialized or empty
        console.warn("[WorkflowRuns] Notice:", err?.message || err);
        return NextResponse.json({ runs: [] });
    }
}