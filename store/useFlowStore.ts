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
  getInput: (targetNodeId: string, handleId: string) => NodeOutput | null;     // Returns the source node's output for a specific target handle.
}


export const useFlowStore = create<FlowStore>((set, get) => ({
  outputs: {},
  edges: [],

  setOutput: (nodeId, output) =>
    set((s) => ({ outputs: { ...s.outputs, [nodeId]: { ...s.outputs[nodeId], ...output } } })),   // setting acc to nodes

  
  setEdges: (edges) => set({ edges }),    // Replacing edges triggers re-renders only in nodes whose handle is affected

  getInput: (targetNodeId, handleId) => {
    const { edges, outputs } = get();
    const edge = edges.find(
      (e) => e.target === targetNodeId && e.targetHandle === handleId
    );

    if (!edge) return null;

    return outputs[edge?.source] ?? null;
  },
}));


// Targeted selector hooks
// Each node uses one of these instead of calling getInput() inside render.
// Zustand only re-renders the subscriber when the specific slice changes.

export function useNodeInput(targetNodeId: string, handleId: string) {
  return useFlowStore((s) => {
    const edge = s.edges.find(
      (e) => e.target === targetNodeId && e.targetHandle === handleId
    );
    if (!edge) return null;
    return s.outputs[edge.source] ?? null;
  });
}