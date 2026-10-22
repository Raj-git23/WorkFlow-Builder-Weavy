import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorHandler } from "@/lib/error-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json(
        { error: "Run ID is required" },
        { status: 400 }
      );
    }

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        nodeExecutions: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Workflow run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      run: {
        id: run.id,
        workflowId: run.workflowId,
        status: run.status,
        scope: run.scope,
        triggerRunId: run.triggerRunId,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.durationMs,
        error: run.error,
        nodeExecutions: run.nodeExecutions,
      },
    });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}
