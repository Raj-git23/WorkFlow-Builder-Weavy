// types/history.ts

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type RunScope = "FULL" | "SELECTED" | "SINGLE";

export interface NodeExecutionItem {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeName: string | null;
  status: ExecutionStatus;
  inputs?: any;
  outputs?: any;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface WorkflowRunItem {
  id: string;
  workflowId: string;
  scope: RunScope;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  error?: string | null;
  nodeExecutions: NodeExecutionItem[];
}

export interface SidebarHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId?: string;
  currentRunId?: string | null;
}
