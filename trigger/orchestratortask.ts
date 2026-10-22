// trigger/orchestratortask.ts
import { task, tasks, runs } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { type Node, type Edge } from "@xyflow/react";
import {
  calculateExecutionTiers,
  resolveNodeExecutionInput,
  ExecutionScope,
  NodeOutputs,
} from "@/lib/workflow-orchestrator";
import type { cropImageTask, extractFrameTask } from "./ffmpegtask";
import type { geminiTask } from "./geminitask";

export interface OrchestratePayload {
  workflowRunId: string;
  workflowId?: string;
  userId: string;
  scope?: ExecutionScope;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
}

export const orchestrateWorkflowTask = task({
  id: "orchestrate-workflow",
  maxDuration: 600, // 10 minutes maximum total workflow duration
  run: async (payload: OrchestratePayload) => {
    const {
      workflowRunId,
      workflowId,
      userId,
      scope = "FULL",
      nodes,
      edges,
      selectedNodeIds = [],
    } = payload;

    const startTime = Date.now();

    // 1. Mark WorkflowRun as RUNNING in DB
    try {
      await prisma.workflowRun.update({
        where: { id: workflowRunId },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      });
    } catch (e) {
      console.warn("Could not mark WorkflowRun as RUNNING:", e);
    }

    // 2. Compute topological execution tiers
    const { tiers, targetNodes } = calculateExecutionTiers(
      nodes,
      edges,
      scope,
      selectedNodeIds
    );

    // 3. Initialize NodeExecution rows for all target nodes
    for (const node of targetNodes) {
      try {
        const existing = await prisma.nodeExecution.findFirst({
          where: { runId: workflowRunId, nodeId: node.id },
        });

        if (!existing) {
          await prisma.nodeExecution.create({
            data: {
              runId: workflowRunId,
              nodeId: node.id,
              nodeType: String(node.type || "unknown"),
              nodeName: String((node.data as any)?.label || node.type || "Node"),
              status: "PENDING",
            },
          });
        }
      } catch (e) {
        console.warn(`Could not create NodeExecution for ${node.id}:`, e);
      }
    }

    // Runtime outputs dictionary across tiers
    const completedOutputs: Record<string, NodeOutputs> = {};

    let hasFailure = false;
    let failureError: string | null = null;

    try {
      // 4. Execute tiers sequentially; nodes within the SAME tier run concurrently (parallel)
      for (const tier of tiers) {
        if (hasFailure) break;

        await Promise.all(
          tier.map(async (node) => {
            const nodeStart = Date.now();
            const nodeType = String(node.type);

            // Mark node execution as RUNNING in DB
            try {
              await prisma.nodeExecution.updateMany({
                where: { runId: workflowRunId, nodeId: node.id },
                data: {
                  status: "RUNNING",
                  startedAt: new Date(),
                },
              });
            } catch (e) {
              console.warn(`Failed to set RUNNING on ${node.id}:`, e);
            }

            try {
              // Resolve input values from upstream nodes
              const { taskPayload, capturedInputs } = resolveNodeExecutionInput(
                node,
                edges,
                completedOutputs
              );

              // Update captured inputs in DB
              try {
                await prisma.nodeExecution.updateMany({
                  where: { runId: workflowRunId, nodeId: node.id },
                  data: { inputs: capturedInputs as any },
                });
              } catch (e) {
                console.warn(`Failed to save inputs for ${node.id}:`, e);
              }

              let nodeResult: NodeOutputs = {};

              // Delegate to worker task based on node type
              if (nodeType === "textArea") {
                nodeResult = { text: String(taskPayload.text || "") };
              } else if (nodeType === "uploadImage") {
                nodeResult = { imageUrl: String(taskPayload.imageUrl || "") };
              } else if (nodeType === "uploadVideo") {
                nodeResult = { videoUrl: String(taskPayload.videoUrl || "") };
              } else if (nodeType === "cropImage") {
                const handle = await tasks.trigger<typeof cropImageTask>(
                  "crop-image",
                  taskPayload as any
                );
                const res = await runs.poll(handle, { pollIntervalMs: 1000 });
                if (res.status !== "COMPLETED" || !res.output) {
                  throw new Error(`Crop Image failed: ${res.status}`);
                }
                nodeResult = {
                  imageUrl: res.output.url,
                  dataUrl: res.output.dataUrl,
                };
              } else if (nodeType === "extractFrame") {
                const handle = await tasks.trigger<typeof extractFrameTask>(
                  "extract-frame",
                  taskPayload as any
                );
                const res = await runs.poll(handle, { pollIntervalMs: 1000 });
                if (res.status !== "COMPLETED" || !res.output) {
                  throw new Error(`Extract Frame failed: ${res.status}`);
                }
                nodeResult = {
                  imageUrl: res.output.url,
                  dataUrl: res.output.dataUrl,
                };
              } else if (nodeType === "llm") {
                const handle = await tasks.trigger<typeof geminiTask>(
                  "run-gemini",
                  taskPayload as any
                );
                const res = await runs.poll(handle, { pollIntervalMs: 1000 });
                if (res.status !== "COMPLETED" || !res.output) {
                  throw new Error(`LLM Execution failed: ${res.status}`);
                }
                nodeResult = { text: res.output.text };
              }

              // Store output in memory for downstream nodes
              completedOutputs[node.id] = nodeResult;

              // Mark node execution as COMPLETED in DB
              const durationMs = Date.now() - nodeStart;
              try {
                await prisma.nodeExecution.updateMany({
                  where: { runId: workflowRunId, nodeId: node.id },
                  data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    durationMs,
                    outputs: nodeResult as any,
                  },
                });
              } catch (e) {
                console.warn(`Failed to update COMPLETED for ${node.id}:`, e);
              }
            } catch (nodeErr: any) {
              const durationMs = Date.now() - nodeStart;
              const errorMsg = nodeErr instanceof Error ? nodeErr.message : String(nodeErr);
              hasFailure = true;
              failureError = errorMsg;

              // Mark node execution as FAILED in DB
              try {
                await prisma.nodeExecution.updateMany({
                  where: { runId: workflowRunId, nodeId: node.id },
                  data: {
                    status: "FAILED",
                    completedAt: new Date(),
                    durationMs,
                    error: errorMsg,
                  },
                });
              } catch (e) {
                console.warn(`Failed to update FAILED for ${node.id}:`, e);
              }

              throw nodeErr;
            }
          })
        );
      }

      // 5. Finalize WorkflowRun status
      const totalDuration = Date.now() - startTime;
      const finalStatus = hasFailure ? "FAILED" : "COMPLETED";

      try {
        await prisma.workflowRun.update({
          where: { id: workflowRunId },
          data: {
            status: finalStatus,
            completedAt: new Date(),
            durationMs: totalDuration,
            error: failureError,
          },
        });
      } catch (e) {
        console.warn("Could not finalize WorkflowRun:", e);
      }

      return {
        success: !hasFailure,
        outputs: completedOutputs,
        durationMs: totalDuration,
      };
    } catch (workflowErr: any) {
      const totalDuration = Date.now() - startTime;
      const errorMsg =
        workflowErr instanceof Error ? workflowErr.message : String(workflowErr);

      try {
        await prisma.workflowRun.update({
          where: { id: workflowRunId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            durationMs: totalDuration,
            error: errorMsg,
          },
        });
      } catch (e) {
        console.warn("Could not save WorkflowRun failure:", e);
      }

      throw workflowErr;
    }
  },
});
