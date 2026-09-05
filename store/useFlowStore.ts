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
  setOutput: (nodeId: string, output: NodeOutput) => void;  
  setEdges: (edges: Edge[]) => void;
  getInput: (targetNodeId: string, handleId?: string) => NodeOutput | null;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  outputs: {},
  edges: [],

  setOutput: (nodeId, output) =>
    set((s) => ({
      outputs: {
        ...s.outputs,
        [nodeId]: { ...s.outputs[nodeId], ...output },
      },
    })),

  setEdges: (edges) => set({ edges }),

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