import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { errorHandler } from "@/lib/error-handler";
import type { orchestrateWorkflowTask } from "@/trigger/orchestratortask";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    const body = await req.json();

    const {
      workflowId: providedWorkflowId,
      name = "Untitled Workflow",
      scope = "FULL",
      selectedNodeIds = [],
      nodes = [],
      edges = [],
      initialOutputs = {},
    } = body;

    const userId = clerkUserId || body.userId || "dev_user";

    // 1. Ensure Workflow record exists in DB to satisfy foreign key relation
    let workflowId = providedWorkflowId;
    if (workflowId) {
      const existing = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });
      if (!existing) {
        workflowId = null;
      }
    }

    if (!workflowId) {
      const newWorkflow = await prisma.workflow.create({
        data: {
          userId,
          name,
          nodes: nodes as any,
          edges: edges as any,
        },
      });
      workflowId = newWorkflow.id;
    } else {
      // Update canvas graph state on run
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          nodes: nodes as any,
          edges: edges as any,
        },
      });
    }

    // 2. Create WorkflowRun in PostgreSQL
    const workflowRun = await prisma.workflowRun.create({
      data: {
        workflowId,
        userId,
        scope: scope as any,
        status: "PENDING",
      },
    });

    // 3. Dispatch Trigger.dev Master Orchestrator task
    const triggerHandle = await tasks.trigger<typeof orchestrateWorkflowTask>(
      "orchestrate-workflow",
      {
        workflowRunId: workflowRun.id,
        workflowId,
        userId,
        scope,
        nodes,
        edges,
        selectedNodeIds,
        initialOutputs,
      }
    );

    // Save trigger run ID handle for tracking
    if (triggerHandle?.id) {
      await prisma.workflowRun.update({
        where: { id: workflowRun.id },
        data: { triggerRunId: triggerHandle.id },
      });
    }

    return NextResponse.json({
      success: true,
      workflowId,
      runId: workflowRun.id,
      triggerRunId: triggerHandle?.id,
    });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}
