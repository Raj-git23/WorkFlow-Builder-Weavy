import { MarkerType } from "@xyflow/react";
import type { NodeType } from "@/types/nodetype";


// Maps node types to their edge colors based on their emitted data type.
const NODE_COLORS: Record<NodeType, string> = {
  textArea: "#f1a0fa", // purple (text)
  uploadImage: "#45a08a", // teal/green (image)
  uploadVideo: "#ea8362", // warm orange (video)
  llm: "#f1a0fa", // purple (text output)
  cropImage: "#45a08a", // teal/green (image output)
  extractFrame: "#45a08a", // teal/green (extracted frame image)
};

export function getEdgeStyle(sourceType: NodeType, targetType?: NodeType) {
  const color = NODE_COLORS[sourceType] ?? "#f1a0fa";

  return {
    animated: true,
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
