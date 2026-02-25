import { MarkerType } from "@xyflow/react";
import type { NodeType } from "@/types/nodetype";


// Maps node types to their edge colors. Add an entry for each NodeType.
const NODE_COLORS: Partial<Record<NodeType, string>> = {
  textArea: "#f1a0fa", // purple
  uploadImage: "#ea8362", // green
  uploadVideo: "#ea8362", // light-orange
//   llm: "#45a08a",
//   cropImage: "#45a08a",
//   extractFrame: "#45a08a",
};

export function getEdgeStyle(sourceType: NodeType, targetType: NodeType) {
  // Use source node color by default — change to targetType if you prefer
  const color = NODE_COLORS[sourceType] ?? "#45a08a";

  return {
    style: {
      stroke: color,
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: color,
      width: 16,
      height: 16,
    },
  };
}
