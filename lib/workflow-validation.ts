// lib/workflow-validation.ts
import { type Node, type Edge, type Connection } from "@xyflow/react";
import { NodeType } from "@/types/nodetype";

export type DataType = "text" | "image" | "video" | "number";

/**
 * Handle data-type mapping for every node type in the system.
 */
export const NODE_HANDLE_SCHEMA: Record<
  NodeType,
  {
    outputs: (handleId?: string | null) => DataType | null;
    inputs: (handleId?: string | null) => DataType | null;
  }
> = {
  // 1. Text Node: Emits text
  textArea: {
    outputs: () => "text",
    inputs: () => null, // No inputs
  },

  // 2. Upload Image Node: Emits image URL
  uploadImage: {
    outputs: () => "image",
    inputs: () => null,
  },

  // 3. Upload Video Node: Emits video URL
  uploadVideo: {
    outputs: () => "video",
    inputs: () => null,
  },

  // 4. Crop Image Node: Accepts image, emits cropped image
  cropImage: {
    inputs: (handleId) => {
      const h = handleId?.toLowerCase() || "";
      if (h.includes("crop-") || h.includes("percent")) return "number";
      return "image"; // ${id}-file-in or default file input
    },
    outputs: () => "image", // ${id}-file-out
  },

  // 5. Extract Frame Node: Accepts video and timestamp, emits image frame
  extractFrame: {
    inputs: (handleId) => {
      const h = handleId?.toLowerCase() || "";
      if (h.endsWith("-timestamp-in") || h.includes("timestamp")) return "number";
      return "video"; // ${id}-video-in
    },
    outputs: () => "image", // ${id}-frame-out
  },

  // 6. Run LLM Node: Accepts prompts (text) and reference images (image), emits text
  llm: {
    inputs: (handleId) => {
      const h = handleId?.toLowerCase() || "";
      if (h.includes("image-") || h.includes("image")) return "image";
      return "text"; // system-prompt or user-message
    },
    outputs: () => "text", // ${id}-output
  },
};

/**
 * Type compatibility matrix defining what output data types can connect to what input data types.
 */
export const COMPATIBILITY_RULES: Record<DataType, DataType[]> = {
  // Text output can connect to text inputs and numeric inputs (e.g. timestamp numbers)
  text: ["text", "number"],

  // Numeric output can connect to numbers or text inputs
  number: ["number", "text"],

  // Image output can ONLY connect to image inputs (e.g. Crop Image or LLM Image Slots)
  image: ["image"],

  // Video output can ONLY connect to video inputs (e.g. Extract Frame)
  video: ["video"],
};

/**
 * Resolves the semantic data type for a node's output handle.
 */
export function getSourceDataType(
  nodeType: NodeType,
  handleId?: string | null
): DataType | null {
  const schema = NODE_HANDLE_SCHEMA[nodeType];
  return schema ? schema.outputs(handleId) : null;
}

/**
 * Resolves the semantic data type for a node's input handle.
 */
export function getTargetDataType(
  nodeType: NodeType,
  handleId?: string | null
): DataType | null {
  const schema = NODE_HANDLE_SCHEMA[nodeType];
  return schema ? schema.inputs(handleId) : null;
}

/**
 * Checks if a proposed connection would create a cycle (Directed Acyclic Graph validation).
 * Uses Depth-First Search (DFS) from the target to see if the source is reachable.
 */
export function detectCycle(
  nodes: Node[],
  edges: Edge[],
  connection: Connection
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return true; // Direct self-loop

  // Build adjacency list of current graph
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const list = adj.get(edge.source) || [];
    list.push(edge.target);
    adj.set(edge.source, list);
  }

  // Traverse downstream from target. If we can reach source, it's a cycle!
  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr === source) {
      return true; // Cycle detected
    }
    if (!visited.has(curr)) {
      visited.add(curr);
      const neighbors = adj.get(curr) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          stack.push(next);
        }
      }
    }
  }

  return false;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  sourceType?: DataType;
  targetType?: DataType;
}

/**
 * Comprehensive connection validator for React Flow canvas.
 * Checks self-loops, duplicate edges, DAG cycles, and data type compatibility.
 */
export function validateConnection(
  nodes: Node[],
  edges: Edge[],
  connection: Connection
): ValidationResult {
  const { source, target, sourceHandle, targetHandle } = connection;

  // 1. Basic existence
  if (!source || !target) {
    return { isValid: false, reason: "Invalid connection endpoints." };
  }

  // 2. Self connection check
  if (source === target) {
    return {
      isValid: false,
      reason: "Cannot connect a node to itself.",
    };
  }

  // 3. Find source and target node definitions
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return { isValid: false, reason: "Connected node does not exist." };
  }

  const sourceNodeType = sourceNode.type as NodeType;
  const targetNodeType = targetNode.type as NodeType;

  // 4. Duplicate edge check
  const isDuplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      (e.sourceHandle || null) === (sourceHandle || null) &&
      (e.targetHandle || null) === (targetHandle || null)
  );

  if (isDuplicate) {
    return {
      isValid: false,
      reason: "This connection already exists.",
    };
  }

  // 5. DAG Cycle Detection
  if (detectCycle(nodes, edges, connection)) {
    return {
      isValid: false,
      reason: "Circular connection blocked: Workflows must be a Directed Acyclic Graph (DAG).",
    };
  }

  // 6. Data Type Compatibility Check
  const sourceType = getSourceDataType(sourceNodeType, sourceHandle);
  const targetType = getTargetDataType(targetNodeType, targetHandle);

  if (!sourceType) {
    return {
      isValid: false,
      reason: `Node "${sourceNodeType}" has no valid output data.`,
    };
  }

  if (!targetType) {
    return {
      isValid: false,
      reason: `Node "${targetNodeType}" does not accept inputs on this handle.`,
    };
  }

  const isCompatible = COMPATIBILITY_RULES[sourceType]?.includes(targetType);

  if (!isCompatible) {
    return {
      isValid: false,
      sourceType,
      targetType,
      reason: `Type Mismatch: Cannot connect ${sourceType.toUpperCase()} output to ${targetType.toUpperCase()} input.`,
    };
  }

  return {
    isValid: true,
    sourceType,
    targetType,
  };
}
