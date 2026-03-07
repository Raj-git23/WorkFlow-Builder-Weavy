import { type Edge, type Node } from "@xyflow/react";
import { createContext, useContext } from "react";

export type CropNodeData = {
  aspectRatio?: string;
  width?: number;
  height?: number;
};

export type CropRFNode = Node<CropNodeData, "cropImage">;

export type ExtractFrameNodeData = {
  frame?: number;
  timecode?: string;
};

export type ExtractFrameRFNode = Node<ExtractFrameNodeData, "extractFrame">;

export type LLMNodeData = {
  model?: string;
  systemPrompt?: string;
  userMessage?: string;
  imageInputCount?: number;
};

export type LLMRFNode = Node<LLMNodeData, "llm">;

export type UploadNodeData = {
  url?: string;
  fileType: "image" | "video";
};

export type UploadImageRFNode = Node<UploadNodeData, "uploadImage">;
export type UploadVideoRFNode = Node<UploadNodeData, "uploadVideo">;

export type ToolMode = "selection" | "pan";

export type NodeType = | "textArea" | "uploadImage" | "uploadVideo" | "llm" | "cropImage" | "extractFrame";

export type BaseNodeData = Record<string, unknown>;

export type BaseRFNode<T extends BaseNodeData = BaseNodeData> = Node<T, string>;

export type TextNodeData = {
  value?: string;
};

export type TextAreaRFNode = Node<TextNodeData, "textArea">;
export type Snapshot = { nodes: Node[]; edges: Edge[] };

interface NodeActionsCtx {
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
}

export const NodeActionsContext = createContext<NodeActionsCtx>({
  duplicateNode: () => {},
  deleteNode: () => {},
});

export function useNodeActions() {
  return useContext(NodeActionsContext);
}