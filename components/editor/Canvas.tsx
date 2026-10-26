"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  Panel,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  reconnectEdge,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "@/types/allnode";
import {
  NodeActionsContext,
  NodeType,
  Snapshot,
  ToolMode,
} from "@/types/nodetype";
import LeftSidebar from "@/components/editor/LeftSidebar";
import { BottomControls } from "@/components/editor/BottomControls";
import { genId, takeSnapshot } from "@/lib/helper";
import { MAX_HISTORY } from "@/lib/constant";
import { getEdgeStyle } from "@/lib/edge-style";
import { DEFAULT_DATA } from "@/lib/nodesConfig";
import { useFlowStore } from "@/store/useFlowStore";
import { validateConnection } from "@/lib/workflow-validation";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "@/components/ui/button";
import {
  Play,
  Loader2,
  Layers,
  Clock,
  Download,
  Upload,
  Check,
  Cloud,
  FolderOpen,
  ChevronDown,
  ChevronLeft,
  Folder,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PRODUCT_MARKETING_KIT_TEMPLATE } from "@/lib/starter-template";
import Link from "next/link";
import UserData from "@/components/auth/UserData";
import { cn } from "@/lib/utils";
import { errorHandler } from "@/lib/error-handler";
import { analyzeWorkflowSelection } from "@/lib/workflow-selection";
import SidebarHistory from "./SidebarHistory";

// Deduplicates loaded nodes and remaps edge endpoints to guarantee unique React keys
function deduplicateNodesAndEdges(
  inputNodes: Node[],
  inputEdges: Edge[] = []
): { nodes: Node[]; edges: Edge[] } {
  const seenIds = new Set<string>();
  const idRemap = new Map<string, string>();
  const uniqueNodes: Node[] = [];

  for (const node of inputNodes) {
    if (!node || !node.id) continue;
    if (seenIds.has(node.id)) {
      const newId = genId((node.type as NodeType) || "textArea");
      idRemap.set(node.id, newId);
      uniqueNodes.push({ ...node, id: newId });
      seenIds.add(newId);
    } else {
      seenIds.add(node.id);
      uniqueNodes.push(node);
    }
  }

  const uniqueEdges = inputEdges.map((edge) => {
    let source = edge.source;
    let target = edge.target;
    if (idRemap.has(source)) source = idRemap.get(source)!;
    if (idRemap.has(target)) target = idRemap.get(target)!;
    return { ...edge, source, target };
  });

  return { nodes: uniqueNodes, edges: uniqueEdges };
}

//  Canvas

export interface CanvasProps {
  initialWorkflowId?: string;
}

export function Canvas({ initialWorkflowId }: CanvasProps = {}) {
  const [toolMode, setToolMode] = useState<ToolMode>("selection");
  const { screenToFlowPosition, getNode, fitView } = useReactFlow();

  const [titleName, setTitleName] = useState<string>("My First Workflow");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const isRestoringRef = useRef(false);

  // Since functions are memomized, might capture stale state so to get latest data, we use useRef
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<Snapshot | null>(null);
  const dragTypeRef = useRef<NodeType | null>(null);
  const edgeReconnectSuccessful = useRef(true);

  const syncEdges = useFlowStore((s) => s.setEdges);
  const workflowStatus = useFlowStore((s) => s.workflowStatus);
  const currentRunId = useFlowStore((s) => s.currentRunId);
  const setWorkflowStatus = useFlowStore((s) => s.setWorkflowStatus);
  const runningNodeIds = useFlowStore((s) => s.runningNodeIds);
  const workflowNodeIds = useFlowStore((s) => s.workflowNodeIds);
  const activeRuns = useFlowStore((s) => s.activeRuns);
  const startRun = useFlowStore((s) => s.startRun);
  const finishRun = useFlowStore((s) => s.finishRun);
  const setRunningNodes = useFlowStore((s) => s.setRunningNodes);
  const setOutputs = useFlowStore((s) => s.setOutputs);

  // Active polling intervals tracker ref to prevent interval leakage or duplicate toasts
  const activePollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup polling intervals on unmount
  useEffect(() => {
    const intervals = activePollIntervalsRef.current;
    return () => {
      intervals.forEach((intervalId) => clearInterval(intervalId));
      intervals.clear();
    };
  }, []);

  // Controls visibility of the Right History Drawer
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Workflow Persistence (Step 4)
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [savedWorkflows, setSavedWorkflows] = useState<
    Array<{ id: string; name: string; updatedAt: string; nodes: any; edges: any }>
  >([]);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState<boolean>(true);
  const [isStartingRun, setIsStartingRun] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedInitialWorkflow = useRef(false);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectionAnalysis = analyzeWorkflowSelection(nodes, edges, selectedNodes);
  const isSelectionRunning =
    isStartingRun ||
    (selectedNodes.length > 0 &&
      selectedNodes.some(
        (n) => workflowNodeIds.includes(n.id) || runningNodeIds.includes(n.id)
      ));

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
    syncEdges(edges);
  }, [edges, syncEdges]);

  const handleRunWorkflow = useCallback(
    async (scope: "FULL" | "SELECTED" = "FULL") => {
      if (isStartingRun) return;

      if (nodesRef.current.length === 0) {
        toast.warning("Add at least one node to run the workflow.");
        return;
      }

      const targetSelectedIds =
        scope === "SELECTED"
          ? selectedNodes.map((n) => n.id)
          : nodesRef.current.map((n) => n.id);

      if (targetSelectedIds.length === 0) {
        toast.warning("Please select at least one node to run.");
        return;
      }

      // Check if any targeted nodes are already running in an active background run
      const alreadyRunning = targetSelectedIds.some(
        (id) => workflowNodeIds.includes(id) || runningNodeIds.includes(id)
      );
      if (alreadyRunning) {
        toast.warning("This workflow is already running in the background.");
        return;
      }

      setIsStartingRun(true);

      // 1. Immediately register workflow run (highlights workflow nodes without pulsating glow)
      const tempRunId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      startRun(tempRunId, targetSelectedIds);

      // 2. Clear, non-blocking toast indicating workflow started
      toast.success(
        scope === "SELECTED"
          ? `Workflow started (${targetSelectedIds.length} nodes)!`
          : "Full workflow started!",
        {
          id: `workflow_run_${tempRunId}`,
          description:
            "Running in the background. You can continue editing or run other workflows.",
          duration: 4000,
        }
      );

      try {
        const currentOutputs = useFlowStore.getState().outputs;
        const res = await fetch("/api/workflows/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: workflowId || undefined,
            name: titleName,
            scope,
            selectedNodeIds: targetSelectedIds,
            nodes: nodesRef.current,
            edges: edgesRef.current,
            initialOutputs: currentOutputs,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to trigger run");

        const { runId } = data;

        // Transition temporary run ID to real server runId
        finishRun(tempRunId);
        startRun(runId, targetSelectedIds);

        // 3. Poll execution status independently for this specific workflow run
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          // Abort runaway polling after 10 minutes (600 polls)
          if (pollCount > 600) {
            clearInterval(pollInterval);
            activePollIntervalsRef.current.delete(runId);
            finishRun(runId);
            setRunningNodes([]);
            toast.error("Workflow run timed out.", {
              id: `workflow_run_${runId}`,
              duration: 6000,
            });
            return;
          }

          try {
            const statusRes = await fetch(`/api/workflows/runs/${runId}`);
            if (!statusRes.ok) return;

            const { run } = await statusRes.json();
            if (!run) return;

            // Update currently active running nodes so ONLY executing node pulses
            const nodeExecs = run.nodeExecutions || [];
            const activeRunningIds = nodeExecs
              .filter((ne: any) => ne.status === "RUNNING")
              .map((ne: any) => ne.nodeId);
            setRunningNodes(activeRunningIds);

            // Live populate completed node outputs
            const completedOutputs: Record<string, any> = {};
            for (const ne of nodeExecs) {
              if (ne.status === "COMPLETED" && ne.outputs) {
                completedOutputs[ne.nodeId] = ne.outputs;
              }
            }
            if (Object.keys(completedOutputs).length > 0) {
              setOutputs(completedOutputs);
            }

            // Check failure state (either run.status is FAILED or any node execution is FAILED)
            const failedExec = nodeExecs.find((ne: any) => ne.status === "FAILED");
            const isFailed = run.status === "FAILED" || Boolean(failedExec);

            if (isFailed) {
              clearInterval(pollInterval);
              activePollIntervalsRef.current.delete(runId);
              finishRun(runId);
              setRunningNodes([]);
              const err =
                failedExec?.error ||
                run.error ||
                "Workflow execution failed.";
              toast.error(errorHandler.format(err), {
                id: `workflow_run_${runId}`,
                duration: 6000,
              });
              return;
            }

            // Check completion state
            if (run.status === "COMPLETED") {
              clearInterval(pollInterval);
              activePollIntervalsRef.current.delete(runId);
              finishRun(runId);
              setRunningNodes([]);
              const durationSec = (
                run.durationMs ? run.durationMs / 1000 : 0
              ).toFixed(1);
              toast.success(
                `Workflow completed successfully in ${durationSec}s!`,
                {
                  id: `workflow_run_${runId}`,
                  duration: 5000,
                }
              );
              return;
            }
          } catch (pollErr) {
            console.warn("Run polling notice:", pollErr);
          }
        }, 1000);

        activePollIntervalsRef.current.set(runId, pollInterval);
      } catch (err: any) {
        finishRun(tempRunId);
        setRunningNodes([]);
        toast.error(errorHandler.format(err), {
          id: `workflow_run_err_${Date.now()}`,
          duration: 6000,
        });
      } finally {
        setIsStartingRun(false);
      }
    },
    [
      isStartingRun,
      selectedNodes,
      workflowNodeIds,
      runningNodeIds,
      titleName,
      workflowId,
      startRun,
      finishRun,
      setRunningNodes,
      setOutputs,
    ]
  );

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (selectedNodes.length > 0) {
          handleRunWorkflow(selectionAnalysis.scope);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunWorkflow, selectedNodes.length, selectionAnalysis.scope]);

  // Save current workflow graph to PostgreSQL
  const saveWorkflow = useCallback(
    async (overrideName?: string) => {
      if (nodesRef.current.length === 0 && !overrideName) return;

      setSaveStatus("saving");
      try {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: workflowId || undefined,
            name: overrideName || titleName,
            nodes: nodesRef.current,
            edges: edgesRef.current,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save workflow");

        if (data.workflow?.id) {
          setWorkflowId(data.workflow.id);
        }
        setSaveStatus("saved");
      } catch (err: any) {
        setSaveStatus("unsaved");
        console.warn("Auto-save notice:", err?.message || err);
      }
    },
    [workflowId, titleName]
  );

  // Load saved workflow on initial mount
  useEffect(() => {
    async function loadWorkflow() {
      try {
        let targetWorkflow: any = null;

        if (initialWorkflowId) {
          const res = await fetch(`/api/workflows/${initialWorkflowId}`);
          if (res.ok) {
            const data = await res.json();
            targetWorkflow = data.workflow;
          }
        }

        if (!targetWorkflow) {
          const res = await fetch("/api/workflows");
          if (res.ok) {
            const data = await res.json();
            targetWorkflow = data.workflows?.[0];
          }
        }

        if (targetWorkflow) {
          setWorkflowId(targetWorkflow.id);
          if (targetWorkflow.name) setTitleName(targetWorkflow.name);

          const rawNodes = Array.isArray(targetWorkflow.nodes)
            ? (targetWorkflow.nodes as Node[])
            : [];
          const rawEdges = Array.isArray(targetWorkflow.edges)
            ? (targetWorkflow.edges as Edge[])
            : [];

          const { nodes: loadedNodes, edges: loadedEdges } = deduplicateNodesAndEdges(
            rawNodes,
            rawEdges
          );

          if (loadedNodes.length > 0) {
            setNodes(loadedNodes);
            nodesRef.current = loadedNodes;

            const initialOutputs: Record<string, any> = {};
            for (const n of loadedNodes) {
              const d = n.data as any;
              if (!d) continue;
              if (n.type === "textArea" && d.value) {
                initialOutputs[n.id] = { text: d.value };
              } else if (n.type === "uploadImage" && d.url) {
                initialOutputs[n.id] = { imageUrl: d.url };
              } else if (n.type === "uploadVideo" && d.url) {
                initialOutputs[n.id] = { videoUrl: d.url };
              } else if (n.type === "cropImage" && (d.imageUrl || d.url)) {
                initialOutputs[n.id] = { imageUrl: d.imageUrl || d.url };
              } else if (n.type === "extractFrame" && (d.frameUrl || d.imageUrl)) {
                initialOutputs[n.id] = { imageUrl: d.frameUrl || d.imageUrl };
              } else if (n.type === "llm" && (d.response || d.text)) {
                initialOutputs[n.id] = { text: d.response || d.text };
              }
            }
            if (Object.keys(initialOutputs).length > 0) {
              setOutputs(initialOutputs);
            }

            setTimeout(() => {
              fitView({ padding: 0.2, duration: 400, maxZoom: 1 });
            }, 150);
          }
          if (loadedEdges.length > 0) {
            setEdges(loadedEdges);
            edgesRef.current = loadedEdges;
            syncEdges(loadedEdges);
          }
        }
      } catch (err) {
        console.warn("Notice loading initial workflow:", err);
      } finally {
        hasLoadedInitialWorkflow.current = true;
        // Allow canvas nodes to render and fitView to settle before fading out loader
        setTimeout(() => {
          setIsLoadingWorkflow(false);
        }, 400);
      }
    }

    loadWorkflow();
  }, [initialWorkflowId, setNodes, setEdges, syncEdges, setOutputs, fitView]);

  // Debounced auto-save on graph / title changes (1.5s after user stops editing)
  useEffect(() => {
    if (isRestoringRef.current || !hasLoadedInitialWorkflow.current) return;

    setSaveStatus("unsaved");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveWorkflow();
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, titleName, saveWorkflow]);

  // We're saving history using debounce of 300 ms
  const scheduleHistoryPush = useCallback(() => {
    if (isRestoringRef.current) return;

    if (!pendingSnapshotRef.current) {
      pendingSnapshotRef.current = takeSnapshot(
        nodesRef.current,
        edgesRef.current,
      );
    }

    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const snap = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;
      historyTimerRef.current = null;

      if (snap) {
        setPast((p) => [...p, snap].slice(-MAX_HISTORY));
        setFuture([]);
      }
    }, 300);
  }, []);

  const pushNow = useCallback(() => {
    if (isRestoringRef.current) return;

    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      pendingSnapshotRef.current = null;
    }

    setPast((p) =>
      [...p, takeSnapshot(nodesRef.current, edgesRef.current)].slice(
        -MAX_HISTORY,
      ),
    );

    setFuture([]);
  }, []);

  // Export canvas to downloadable JSON file
  const handleExportJSON = useCallback(() => {
    if (nodesRef.current.length === 0) {
      toast.warning("Canvas is empty. Add nodes before exporting.");
      return;
    }

    const exportData = {
      name: titleName,
      exportedAt: new Date().toISOString(),
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName =
      titleName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "workflow";
    link.href = url;
    link.download = `${safeName}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Workflow exported as JSON");
  }, [titleName]);

  // Import canvas from user-selected JSON file
  const handleImportJSON = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            throw new Error(
              "Invalid workflow file: 'nodes' and 'edges' arrays are required."
            );
          }

          const existingNodes = nodesRef.current || [];
          const existingEdges = edgesRef.current || [];
          const isCanvasEmpty = existingNodes.length === 0;

          pushNow(); // Save current state to undo history before importing

          if (isCanvasEmpty) {
            // Case 1: Empty canvas -> replace with imported nodes directly
            if (parsed.name) setTitleName(parsed.name);

            // Mark all imported nodes as selected
            const selectedImportedNodes = parsed.nodes.map((n: any) => ({
              ...n,
              selected: true,
            }));

            setNodes(selectedImportedNodes);
            setEdges(parsed.edges);
            nodesRef.current = selectedImportedNodes;
            edgesRef.current = parsed.edges;
            syncEdges(parsed.edges);

            // Restore initial node outputs into flow store
            const initialOutputs: Record<string, any> = {};
            for (const n of selectedImportedNodes) {
              const d = n.data as any;
              if (!d) continue;
              if (n.type === "textArea" && d.value) {
                initialOutputs[n.id] = { text: d.value };
              } else if (n.type === "uploadImage" && d.url) {
                initialOutputs[n.id] = { imageUrl: d.url };
              } else if (n.type === "uploadVideo" && d.url) {
                initialOutputs[n.id] = { videoUrl: d.url };
              } else if (n.type === "cropImage" && (d.imageUrl || d.url)) {
                initialOutputs[n.id] = { imageUrl: d.imageUrl || d.url };
              } else if (n.type === "extractFrame" && (d.frameUrl || d.imageUrl)) {
                initialOutputs[n.id] = { imageUrl: d.frameUrl || d.imageUrl };
              } else if (n.type === "llm" && (d.response || d.text)) {
                initialOutputs[n.id] = { text: d.response || d.text };
              }
            }
            if (Object.keys(initialOutputs).length > 0) {
              setOutputs(initialOutputs);
            }

            setTimeout(() => {
              fitView({ padding: 0.15, duration: 500, maxZoom: 1 });
              saveWorkflow(parsed.name);
            }, 150);

            toast.success(
              `Imported "${parsed.name || "Workflow"}" (${parsed.nodes.length} nodes)`
            );
          } else {
            // Case 2: Non-empty canvas -> merge into existing nodes without removing them
            const existingNodeIds = new Set(existingNodes.map((n) => n.id));
            const idMap = new Map<string, string>();

            // Generate clean unique IDs for any imported nodes that collide with existing canvas nodes
            for (const node of parsed.nodes) {
              if (existingNodeIds.has(node.id)) {
                const uniqueSuffix = Math.random().toString(36).slice(2, 6);
                const newId = `${node.type || "node"}-${Date.now().toString(36)}-${uniqueSuffix}`;
                idMap.set(node.id, newId);
              } else {
                idMap.set(node.id, node.id);
              }
            }

            // Calculate bounding box of existing nodes
            let maxExistingX = -Infinity;
            let minExistingY = Infinity;
            for (const n of existingNodes) {
              const x = n.position?.x ?? 0;
              const y = n.position?.y ?? 0;
              const w = (n.measured?.width ?? (n as any).width ?? 320);
              if (x + w > maxExistingX) maxExistingX = x + w;
              if (y < minExistingY) minExistingY = y;
            }
            if (!isFinite(maxExistingX)) maxExistingX = 0;
            if (!isFinite(minExistingY)) minExistingY = 0;

            // Calculate bounding box of imported nodes
            let minImportedX = Infinity;
            let minImportedY = Infinity;
            for (const n of parsed.nodes) {
              const x = n.position?.x ?? 0;
              const y = n.position?.y ?? 0;
              if (x < minImportedX) minImportedX = x;
              if (y < minImportedY) minImportedY = y;
            }
            if (!isFinite(minImportedX)) minImportedX = 0;
            if (!isFinite(minImportedY)) minImportedY = 0;

            // Offset imported nodes to the right of existing nodes with a 120px gap
            const offsetX = maxExistingX + 120 - minImportedX;
            const offsetY = minExistingY - minImportedY;

            // Deselect all existing nodes
            const updatedExistingNodes = existingNodes.map((n) => ({
              ...n,
              selected: false,
            }));

            // Prepare imported nodes with new positions, mapped IDs, and marked as selected
            const preparedImportedNodes = parsed.nodes.map((n: any) => {
              const finalId = idMap.get(n.id) || n.id;
              return {
                ...n,
                id: finalId,
                selected: true,
                position: {
                  x: Math.round((n.position?.x ?? 0) + offsetX),
                  y: Math.round((n.position?.y ?? 0) + offsetY),
                },
              };
            });

            // Prepare imported edges with remapped node IDs & handles, and marked as selected
            const existingEdgeIds = new Set(existingEdges.map((e) => e.id));
            const preparedImportedEdges = parsed.edges.map((e: any) => {
              const newSource = idMap.get(e.source) || e.source;
              const newTarget = idMap.get(e.target) || e.target;
              const sourceHandle = e.sourceHandle
                ? e.sourceHandle.replace(e.source, newSource)
                : e.sourceHandle;
              const targetHandle = e.targetHandle
                ? e.targetHandle.replace(e.target, newTarget)
                : e.targetHandle;
              const edgeId = existingEdgeIds.has(e.id)
                ? `edge-${newSource}-${newTarget}-${Math.random().toString(36).slice(2, 6)}`
                : e.id;

              return {
                ...e,
                id: edgeId,
                source: newSource,
                target: newTarget,
                sourceHandle,
                targetHandle,
                selected: true,
              };
            });

            const mergedNodes = [...updatedExistingNodes, ...preparedImportedNodes];
            const mergedEdges = [...existingEdges, ...preparedImportedEdges];

            setNodes(mergedNodes);
            setEdges(mergedEdges);
            nodesRef.current = mergedNodes;
            edgesRef.current = mergedEdges;
            syncEdges(mergedEdges);

            // Register initial outputs of newly imported nodes into flow store
            const importedOutputs: Record<string, any> = {};
            for (const n of preparedImportedNodes) {
              const d = n.data as any;
              if (!d) continue;
              if (n.type === "textArea" && d.value) {
                importedOutputs[n.id] = { text: d.value };
              } else if (n.type === "uploadImage" && d.url) {
                importedOutputs[n.id] = { imageUrl: d.url };
              } else if (n.type === "uploadVideo" && d.url) {
                importedOutputs[n.id] = { videoUrl: d.url };
              } else if (n.type === "cropImage" && (d.imageUrl || d.url)) {
                importedOutputs[n.id] = { imageUrl: d.imageUrl || d.url };
              } else if (n.type === "extractFrame" && (d.frameUrl || d.imageUrl)) {
                importedOutputs[n.id] = { imageUrl: d.frameUrl || d.imageUrl };
              } else if (n.type === "llm" && (d.response || d.text)) {
                importedOutputs[n.id] = { text: d.response || d.text };
              }
            }
            if (Object.keys(importedOutputs).length > 0) {
              setOutputs(importedOutputs);
            }

            setTimeout(() => {
              fitView({ padding: 0.15, duration: 500, maxZoom: 1 });
              saveWorkflow(titleName);
            }, 150);

            toast.success(
              `Imported and merged ${parsed.nodes.length} nodes into canvas (selected)`
            );
          }
        } catch (err: any) {
          toast.error(
            err instanceof Error ? err.message : "Failed to import workflow JSON"
          );
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      reader.readAsText(file);
    },
    [pushNow, titleName, setNodes, setEdges, syncEdges, setOutputs, fitView, saveWorkflow]
  );

  // Fetch user's saved workflows from API
  const refreshSavedWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.workflows)) {
        setSavedWorkflows(data.workflows);
      }
    } catch (err) {
      console.warn("Could not refresh workflows:", err);
    }
  }, []);

  // Load the pre-built Product Marketing Kit Generator starter template
  const handleLoadTemplate = useCallback(() => {
    pushNow();
    setIsLoadingWorkflow(true);
    setTitleName(PRODUCT_MARKETING_KIT_TEMPLATE.name);
    setNodes(PRODUCT_MARKETING_KIT_TEMPLATE.nodes);
    setEdges(PRODUCT_MARKETING_KIT_TEMPLATE.edges);
    nodesRef.current = PRODUCT_MARKETING_KIT_TEMPLATE.nodes;
    edgesRef.current = PRODUCT_MARKETING_KIT_TEMPLATE.edges;
    syncEdges(PRODUCT_MARKETING_KIT_TEMPLATE.edges);
    setWorkflowId(null); // Fresh copy will auto-save under user's account

    setTimeout(() => {
      fitView({ padding: 0.15, duration: 600, maxZoom: 1 });
      saveWorkflow(PRODUCT_MARKETING_KIT_TEMPLATE.name);
      setTimeout(() => {
        setIsLoadingWorkflow(false);
      }, 350);
    }, 150);

    toast.success("Loaded 'Product Marketing Kit Generator' template!");
  }, [pushNow, setNodes, setEdges, syncEdges, fitView, saveWorkflow]);

  // Create a new blank workflow canvas
  const handleNewWorkflow = useCallback(() => {
    pushNow();
    const newTitle = "Untitled Workflow";
    setTitleName(newTitle);
    setNodes([]);
    setEdges([]);
    nodesRef.current = [];
    edgesRef.current = [];
    syncEdges([]);
    setWorkflowId(null);
    setSaveStatus("saved");
    toast.info("Created new empty canvas");
  }, [pushNow, setNodes, setEdges, syncEdges]);

  // Load an existing workflow from saved list
  const handleSelectWorkflow = useCallback(
    (wf: { id: string; name: string; nodes: any; edges: any }) => {
      pushNow();
      setIsLoadingWorkflow(true);
      setWorkflowId(wf.id);
      setTitleName(wf.name || "Untitled Workflow");
      const rawNodes = Array.isArray(wf.nodes) ? wf.nodes : [];
      const rawEdges = Array.isArray(wf.edges) ? wf.edges : [];
      const { nodes: loadedNodes, edges: loadedEdges } = deduplicateNodesAndEdges(
        rawNodes,
        rawEdges
      );
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      nodesRef.current = loadedNodes;
      edgesRef.current = loadedEdges;
      syncEdges(loadedEdges);
      setSaveStatus("saved");

      const initialOutputs: Record<string, any> = {};
      for (const n of loadedNodes) {
        const d = n.data as any;
        if (!d) continue;
        if (n.type === "textArea" && d.value) {
          initialOutputs[n.id] = { text: d.value };
        } else if (n.type === "uploadImage" && d.url) {
          initialOutputs[n.id] = { imageUrl: d.url };
        } else if (n.type === "uploadVideo" && d.url) {
          initialOutputs[n.id] = { videoUrl: d.url };
        } else if (n.type === "cropImage" && (d.imageUrl || d.url)) {
          initialOutputs[n.id] = { imageUrl: d.imageUrl || d.url };
        } else if (n.type === "extractFrame" && (d.frameUrl || d.imageUrl)) {
          initialOutputs[n.id] = { imageUrl: d.frameUrl || d.imageUrl };
        } else if (n.type === "llm" && (d.response || d.text)) {
          initialOutputs[n.id] = { text: d.response || d.text };
        }
      }
      if (Object.keys(initialOutputs).length > 0) {
        setOutputs(initialOutputs);
      }

      if (loadedNodes.length > 0) {
        setTimeout(() => {
          fitView({ padding: 0.15, duration: 500, maxZoom: 1 });
        }, 100);
      }

      setTimeout(() => {
        setIsLoadingWorkflow(false);
      }, 350);

      toast.success(`Loaded "${wf.name || "Workflow"}"`);
    },
    [pushNow, setNodes, setEdges, syncEdges, setOutputs, fitView]
  );

  // Delete a saved workflow
  const handleDeleteWorkflow = useCallback(
    async (idToDelete: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const res = await fetch(`/api/workflows?id=${idToDelete}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete workflow");

        setSavedWorkflows((prev) => prev.filter((w) => w.id !== idToDelete));
        if (workflowId === idToDelete) {
          handleNewWorkflow();
        }
        toast.success("Workflow deleted");
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete");
      }
    },
    [workflowId, handleNewWorkflow]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      scheduleHistoryPush();
      onNodesChange(changes);
    },
    [onNodesChange, scheduleHistoryPush],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      scheduleHistoryPush();
      onEdgesChange(changes);
    },
    [onEdgesChange, scheduleHistoryPush],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const result = validateConnection(
        nodesRef.current,
        edgesRef.current,
        connection as Connection
      );
      return result.isValid;
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const validation = validateConnection(
        nodesRef.current,
        edgesRef.current,
        connection
      );

      if (!validation.isValid) {
        toast.error(validation.reason ?? "Invalid connection", {
          duration: 3500,
        });
        return;
      }

      pushNow();
      setEdges((eds) => {
        const sourceNode = nodesRef.current.find(
          (n) => n.id === connection.source,
        );
        const targetNode = nodesRef.current.find(
          (n) => n.id === connection.target,
        );

        if (!sourceNode || !targetNode) return addEdge(connection, eds);

        const edgeStyle = getEdgeStyle(
          sourceNode.type as NodeType,
          targetNode.type as NodeType,
        );

        return addEdge({ ...connection, ...edgeStyle }, eds);
      });
    },
    [setEdges, pushNow],
  );

  // When a node is deleted, reconnect its incomers to its outgoers
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setEdges((eds) =>
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodesRef.current, acc);
          const outgoers = getOutgoers(node, nodesRef.current, acc);
          const connectedEdges = getConnectedEdges([node], acc);
          const remaining = acc.filter((e) => !connectedEdges.includes(e));
          const bridged = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            })),
          );
          return [...remaining, ...bridged];
        }, eds),
      );
    },
    [setEdges],
  );

  const handleUndo = useCallback(() => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    isRestoringRef.current = true;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [
      ...f,
      takeSnapshot(nodesRef.current, edgesRef.current),
    ]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [past, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (!future.length) return;
    const next = future[future.length - 1];
    isRestoringRef.current = true;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [
      ...p,
      takeSnapshot(nodesRef.current, edgesRef.current),
    ]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [future, setNodes, setEdges]);

  // Main function which creates a new node
  const spawnNode = useCallback(
    (type: NodeType, position: { x: number; y: number }, data?: Record<string, unknown>) => {
      pushNow();
      const existingIds = new Set(nodesRef.current.map((n) => n.id));
      let safeId = genId(type);
      while (existingIds.has(safeId)) {
        safeId = genId(type);
      }
      const newNode: Node = {
        id: safeId,
        type,
        position,
        data: { ...(data ?? DEFAULT_DATA[type]) }, // Initialise a node with some values
      };
      setNodes((nds) => {
        const currentSeen = new Set<string>();
        const clean = nds.filter((n) => {
          if (currentSeen.has(n.id)) return false;
          currentSeen.add(n.id);
          return true;
        });
        return [...clean, newNode];
      });
      return newNode;
    },
    [setNodes, pushNow],
  );

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 + Math.random() * 80 - 40,
        y: window.innerHeight / 2 + Math.random() * 80 - 40,
      });
      spawnNode(type, position);
    },
    [screenToFlowPosition, spawnNode],
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = getNode(id);
      if (!node) return;
      spawnNode(
        node.type as NodeType,
        { x: node.position.x + 30, y: node.position.y + 30 },
        node.data as Record<string, unknown>,
      );
    },
    [getNode, spawnNode],
  );

  const deleteNode = useCallback(
    (id: string) => {
      pushNow();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges, pushNow],
  );

  const handleDragStart = useCallback((e: React.DragEvent, type: NodeType) => {
    dragTypeRef.current = type;
    e.dataTransfer.setData("application/reactflow-nodetype", type);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = (e.dataTransfer.getData(
        "application/reactflow-nodetype",
      ) as NodeType) || dragTypeRef.current;

      if (!type) return;
      dragTypeRef.current = null;
      spawnNode(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [screenToFlowPosition, spawnNode],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const edgesWithoutOld = edgesRef.current.filter((e) => e.id !== oldEdge.id);
      const validation = validateConnection(
        nodesRef.current,
        edgesWithoutOld,
        newConnection
      );

      if (!validation.isValid) {
        edgeReconnectSuccessful.current = false;
        toast.error(validation.reason ?? "Invalid reconnection", {
          duration: 3500,
        });
        return;
      }

      edgeReconnectSuccessful.current = true;
      pushNow();
      setEdges((els) => {
        const sourceNode = nodesRef.current.find(
          (n) => n.id === newConnection.source,
        );
        const targetNode = nodesRef.current.find(
          (n) => n.id === newConnection.target,
        );

        if (!sourceNode || !targetNode)
          return reconnectEdge(oldEdge, newConnection, els);

        const edgeStyle = getEdgeStyle(
          sourceNode.type as NodeType,
          targetNode.type as NodeType,
        );

        return reconnectEdge(oldEdge, { ...newConnection, ...edgeStyle }, els);
      });
    },
    [setEdges, pushNow],
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }

      edgeReconnectSuccessful.current = true;
    },
    [setEdges],
  );

  return (
    <NodeActionsContext.Provider value={{ duplicateNode, deleteNode }}>
      <main className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]">
        <LeftSidebar
          onAddNode={handleAddNode}
          onDragStart={handleDragStart}
        />

        <div className="flex-1 h-full w-full relative">
          {/* Smooth loading overlay when loading or switching workflows */}
          <div
            className={cn(
              "absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#121215]/85 backdrop-blur-md transition-opacity duration-300 select-none",
              isLoadingWorkflow
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
          >
            <div className="flex flex-col items-center gap-3.5 p-6 rounded-2xl bg-[#1c1c22]/95 border border-[#2b2b35] shadow-2xl">
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#f7ffa8]/20 border-t-[#f7ffa8] animate-spin" />
                <Sparkles className="w-4 h-4 text-[#f7ffa8] absolute animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-semibold text-neutral-200 tracking-wide">
                  Loading workflow...
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Restoring canvas nodes & state
                </span>
              </div>
            </div>
          </div>

          <ReactFlow
            minZoom={0.1}
            maxZoom={4}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
            zoomOnDoubleClick={false}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onNodesDelete={onNodesDelete}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            selectionMode={SelectionMode.Partial}
            panOnDrag={toolMode === "pan" ? true : [1, 2]}
            panOnScroll={toolMode === "selection"}
            selectionOnDrag={toolMode === "selection"}
            nodesDraggable
            nodesConnectable
            elementsSelectable
          >
            <Panel position="bottom-center" className="mb-4">
              <BottomControls
                toolMode={toolMode}
                onToolChange={setToolMode}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={past.length > 0}
                canRedo={future.length > 0}
              />
            </Panel>

            <Panel position="top-left" className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-sidebar-border px-3 bg-sidebar-background shadow-lg h-9">
                <Input
                  type="text"
                  value={titleName}
                  onChange={(e) => setTitleName(e.target.value)}
                  className="text-sidebar-foreground bg-transparent border-none! text-[13px]! font-medium font-inter! focus-visible:ring-0! h-7 px-0 w-44"
                />

                {/* Save status indicator */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#80808e] font-mono border-l border-[#2e2e34] pl-2.5 shrink-0 select-none">
                  {saveStatus === "saving" && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-[#f7ffa8]" />
                      <span className="text-[10px]">Saving...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <Cloud className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400/90">Saved</span>
                    </>
                  )}
                  {saveStatus === "unsaved" && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[10px]">Unsaved</span>
                    </>
                  )}
                </div>
              </div>

              {/* Workflow Manager Dropdown */}
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) refreshSavedWorkflows();
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9 px-2.5 bg-sidebar-background hover:bg-[#2b2b32] text-[#f2f0f8] border border-sidebar-border shadow-lg text-xs gap-1.5 cursor-pointer font-medium"
                    title="Manage workflows"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-[#f7ffa8]" />
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 bg-[#1c1b1f] border-sidebar-border text-[#f2f0f8] shadow-2xl p-1.5"
                  align="start"
                >
                  <DropdownMenuItem
                    onClick={handleNewWorkflow}
                    className="flex items-center gap-2 text-xs py-2 px-2.5 hover:bg-[#2e2e36] hover:text-[#f7ffa8] cursor-pointer rounded-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>New Empty Workflow</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleLoadTemplate}
                    className="flex items-center gap-2 text-xs py-2 px-2.5 hover:bg-[#2e2e36] hover:text-[#f7ffa8] cursor-pointer rounded-sm font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#f7ffa8]" />
                    <span>Load Starter Template</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-[#2e2e34] my-1" />

                  <DropdownMenuLabel className="text-[10px] font-mono text-[#80808e] px-2 py-1">
                    SAVED WORKFLOWS ({savedWorkflows.length})
                  </DropdownMenuLabel>

                  {savedWorkflows.length === 0 ? (
                    <div className="text-[11px] text-[#636370] px-2 py-2 text-center">
                      No saved workflows yet
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {savedWorkflows.map((wf) => (
                        <div
                          key={wf.id}
                          onClick={() => handleSelectWorkflow(wf)}
                          className={cn(
                            "flex items-center justify-between px-2 py-1.5 rounded-sm text-xs cursor-pointer hover:bg-[#2b2b32] group transition-colors",
                            wf.id === workflowId && "bg-[#272730] text-[#f7ffa8]"
                          )}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="truncate font-medium text-[12px]">
                              {wf.name || "Untitled"}
                            </span>
                            <span className="text-[10px] text-[#70707c]">
                              {Array.isArray(wf.nodes) ? wf.nodes.length : 0} nodes
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteWorkflow(wf.id, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-[#70707c] p-1 transition-opacity cursor-pointer"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Back to Files Link */}
              <Link href="/">
                <Button
                  size="sm"
                  className="h-9 px-3 bg-[#212126] hover:bg-[#2e2e36] text-[#f2f0f8] hover:text-white border border-[#33333a] shadow-lg text-xs gap-1.5 font-medium cursor-pointer transition-colors"
                  title="Back to Workspace & Files"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#f7ffa8]" />
                  <span>My Files</span>
                </Button>
              </Link>

              {/* Import & Export JSON buttons */}
              <div className="flex items-center gap-1 rounded-md border border-sidebar-border bg-sidebar-background px-1.5 shadow-lg h-9">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={handleExportJSON}
                  className="h-7 w-7 text-[#9b9ba7] hover:text-[#f2f0f8] hover:bg-[#2b2b32] cursor-pointer"
                  title="Export workflow as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 w-7 text-[#9b9ba7] hover:text-[#f2f0f8] hover:bg-[#2b2b32] cursor-pointer"
                  title="Import workflow from JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
              </div>
            </Panel>

            <Panel position="top-right" className="mr-4 mt-4 flex items-center gap-2">
              {/* Run button only appears when workflow nodes are selected */}
              {selectedNodes.length > 0 && (
                <Button
                  size="sm"
                  disabled={isSelectionRunning}
                  onClick={() => handleRunWorkflow(selectionAnalysis.scope)}
                  className={cn(
                    "bg-[#f7ffa8] hover:bg-[#ebf495] text-black font-semibold text-xs h-9 px-3.5 gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer",
                    isSelectionRunning && "opacity-75 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {isSelectionRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>{selectionAnalysis.buttonLabel}</span>
                      <span className="text-[10px] opacity-60 ml-0.5 font-mono">⌘↵</span>
                    </>
                  )}
                </Button>
              )}

              {/* History Drawer Toggle Button - fixed hover state so it doesn't turn black */}
              <Button
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="bg-[#212126] hover:bg-[#2e2e36] text-[#f2f0f8] hover:text-white border border-[#33333a] active:bg-[#1f1f23] text-xs h-9 px-3 gap-1.5 shadow-md font-medium cursor-pointer transition-colors"
                title="View execution history"
              >
                <Clock className="w-3.5 h-3.5 text-[#f7ffa8]" />
                <span className="text-[#f2f0f8]">History</span>
              </Button>

              <div className="flex items-center rounded-md border border-sidebar-border bg-sidebar-background px-2 shadow-lg h-9">
                <UserData />
              </div>
            </Panel>

            <Background color="#253042" bgColor="#0a0a0a" gap={13} />
            <MiniMap
              maskStrokeWidth={2}
              offsetScale={10}
              nodeStrokeWidth={3}
              bgColor="#212126"
              nodeStrokeColor="#f2f0f8"
              nodeColor="#1c1b1f"
              maskColor="#353539"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {/* Right Slide-over Workflow History Drawer */}
        <SidebarHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          currentRunId={currentRunId}
          workflowId={workflowId || undefined}
        />
      </main>
    </NodeActionsContext.Provider>
  );
}

