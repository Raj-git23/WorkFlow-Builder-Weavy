import { requireAuth } from "@/lib/auth";
import { errorHandler } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workflows/[id]
 * Fetches a single workflow by ID for the authenticated user.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        workflow: {
          id,
          name: "Local Workflow",
          nodes: [],
          edges: [],
        },
      });
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}

/**
 * PATCH /api/workflows/[id]
 * Updates an existing workflow by ID.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, nodes, edges, viewport } = body;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        workflow: { id, name, description, nodes, edges, viewport },
      });
    }

    // Verify ownership
    const existing = await prisma.workflow.findFirst({
      where: { id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found or access denied" },
        { status: 404 }
      );
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(nodes !== undefined ? { nodes } : {}),
        ...(edges !== undefined ? { edges } : {}),
        ...(viewport !== undefined ? { viewport } : {}),
      },
    });

    return NextResponse.json({ success: true, workflow: updated });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deletes a workflow by ID.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
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
      where: { id, userId: user.userId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return errorHandler.response(err, 500);
  }
}
