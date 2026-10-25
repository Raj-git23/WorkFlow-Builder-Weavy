import { create } from "zustand";
import { type Edge } from "@xyflow/react";

interface NodeOutput {
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
}

interface FlowStore {
  outputs: Record<string, NodeOutput>;
  edges: Edge[];
  runningNodeIds: string[];
  activeRuns: Record<string, string[]>;
  currentRunId: string | null;
  workflowStatus: "idle" | "running" | "completed" | "failed";
  setOutput: (nodeId: string, output: NodeOutput) => void;
  setOutputs: (outputs: Record<string, NodeOutput>) => void;
  setEdges: (edges: Edge[]) => void;
  setRunningNodes: (nodeIds: string[]) => void;
  startRun: (runId: string, nodeIds: string[]) => void;
  finishRun: (runId: string) => void;
  setWorkflowStatus: (status: "idle" | "running" | "completed" | "failed", runId?: string | null) => void;
  getInput: (targetNodeId: string, handleId?: string) => NodeOutput | null;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  outputs: {},
  edges: [],
  runningNodeIds: [],
  activeRuns: {},
  currentRunId: null,
  workflowStatus: "idle",

  setOutput: (nodeId, output) =>
    set((s) => ({
      outputs: {
        ...s.outputs,
        [nodeId]: { ...s.outputs[nodeId], ...output },
      },
    })),

  setOutputs: (newOutputs) =>
    set((s) => ({
      outputs: {
        ...s.outputs,
        ...newOutputs,
      },
    })),

  setEdges: (edges) => set({ edges }),

  setRunningNodes: (runningNodeIds) => set({ runningNodeIds }),

  startRun: (runId: string, nodeIds: string[]) =>
    set((s) => {
      const updatedRuns = { ...s.activeRuns, [runId]: nodeIds };
      const allRunning = Array.from(new Set([...s.runningNodeIds, ...nodeIds]));
      return {
        activeRuns: updatedRuns,
        runningNodeIds: allRunning,
        workflowStatus: "running",
        currentRunId: runId,
      };
    }),

  finishRun: (runId: string) =>
    set((s) => {
      const updatedRuns = { ...s.activeRuns };
      delete updatedRuns[runId];

      const remainingNodeIds = Array.from(
        new Set(Object.values(updatedRuns).flat())
      );
      const hasActive = remainingNodeIds.length > 0;
      return {
        activeRuns: updatedRuns,
        runningNodeIds: remainingNodeIds,
        workflowStatus: hasActive ? "running" : "idle",
        currentRunId: hasActive ? Object.keys(updatedRuns)[0] : null,
      };
    }),

  setWorkflowStatus: (workflowStatus, currentRunId = null) =>
    set((s) => ({
      workflowStatus,
      currentRunId: currentRunId !== undefined ? currentRunId : s.currentRunId,
      runningNodeIds: workflowStatus === "running" ? s.runningNodeIds : [],
    })),

  getInput: (targetNodeId, handleId) => {
    const { edges, outputs } = get();
    const edge = edges.find((e) => {
      if (e.target !== targetNodeId) return false;
      if (!handleId) return true;
      const targetH = e.targetHandle || "";
      return (
        targetH === handleId ||
        targetH === `handle-${handleId}` ||
        `handle-${targetH}` === handleId ||
        targetH.endsWith(handleId) ||
        handleId.endsWith(targetH)
      );
    });

    if (!edge) return null;
    return outputs[edge.source] ?? null;
  },
}));

/**
 * Targeted selector hook for subscribing to upstream node outputs based on target node ID and handle ID.
 */
export function useNodeInput(targetNodeId: string, handleId?: string) {
  return useFlowStore((s) => {
    const edge = s.edges.find((e) => {
      if (e.target !== targetNodeId) return false;
      if (!handleId) return true;
      const targetH = e.targetHandle || "";
      return (
        targetH === handleId ||
        targetH === `handle-${handleId}` ||
        `handle-${targetH}` === handleId ||
        targetH.endsWith(handleId) ||
        handleId.endsWith(targetH)
      );
    });

    if (!edge) return null;
    return s.outputs[edge.source] ?? null;
  });
}

/**
 * Returns whether a specific node is actively executing in a workflow run.
 */
export function useIsNodeRunning(nodeId: string) {
  return useFlowStore((s) => s.runningNodeIds.includes(nodeId));
}