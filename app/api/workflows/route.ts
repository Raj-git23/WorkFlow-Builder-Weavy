import { requireAuth } from "@/lib/auth";
import { errorHandler } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/workflows
 * Fetches all workflows owned by the authenticated user.
 */
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ workflows: [] });
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ workflows: workflows ?? [] });
  } catch (err: any) {
    console.warn("[Workflows GET] Notice:", err?.message || err);
    return NextResponse.json({ workflows: [] });
  }
}

/**
 * POST /api/workflows
 * Creates or updates (upserts) a workflow with current canvas nodes and edges.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const {
      id,
      name = "Untitled Workflow",
      description,
      nodes = [],
      edges = [],
      viewport,
    } = body;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        workflow: { id: id || "local-workflow", name, nodes, edges, viewport },
      });
    }

    let workflow;

    if (id) {
      // Security check: verify ownership if record exists
      const existing = await prisma.workflow.findUnique({
        where: { id },
      });

      if (existing && existing.userId !== user.userId) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this workflow" },
          { status: 403 }
        );
      }

      workflow = await prisma.workflow.upsert({
        where: { id },
        update: {
          name,
          description,
          nodes,
          edges,
          viewport,
        },
        create: {
          id,
          userId: user.userId,
          name,
          description,
          nodes,
          edges,
          viewport,
        },
      });
    } else {
      // Create new workflow
      workflow = await prisma.workflow.create({
        data: {
          userId: user.userId,
          name,
          description,
          nodes,
          edges,
          viewport,
        },
      });
    }

    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}

/**
 * DELETE /api/workflows?id=...
 * Deletes a workflow owned by the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true });
    }

    await prisma.workflow.deleteMany({
      where: {
        id,
        userId: user.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}