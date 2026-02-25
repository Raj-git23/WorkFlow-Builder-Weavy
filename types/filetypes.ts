import { Node, NodeProps, Position } from "@xyflow/react";
import { BaseNodeData, NodeType, ToolMode } from "./nodetype";

export type BottomControlsProps = {
  toolMode: ToolMode;
  onToolChange: (mode: ToolMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export type FileType = "image" | "video";

export type UploadStatus =
  | "idle"
  | "signing"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export type LeftSidebarProps = {
  onAddNode: (type: NodeType) => void;
  onDragStart: (e: React.DragEvent, type: NodeType) => void;
};

export type UploadFileStatus = "idle" | "uploading" | "done" | "error";

export interface UploadResult {
  url: string;
  mimeType: string;
  name: string;
}

export interface HandleDescriptor {
  text: string;
  id?: string;
  position?: Position;
  color?: string;
  type?: "source" | "target";
  style?: React.CSSProperties;
}

export interface BaseNodeProps<T extends BaseNodeData> extends NodeProps<
  Node<T, string>
> {
  handles?: HandleDescriptor[];
  children: (ctx: { id: string; data: T; active: boolean }) => React.ReactNode;
}

export interface CustomHandleProps {
  id: string;
  active?: boolean;
  text: string;
  color?: string;
  type: "source" | "target";
  position: Position;
  style?: React.CSSProperties;
}

export interface NodeShellProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  nodeId?: string;
}
