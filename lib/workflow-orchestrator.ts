// lib/workflow-orchestrator.ts
import { type Node, type Edge } from "@xyflow/react";
import { NodeType } from "@/types/nodetype";

export type ExecutionScope = "FULL" | "SELECTED" | "SINGLE";

export interface NodeOutputs {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  dataUrl?: string;
  [key: string]: unknown;
}

/**
 * Calculates topological execution tiers for a workflow DAG.
 * Nodes in the same tier have all dependencies satisfied and can run concurrently in parallel.
 */
export function calculateExecutionTiers(
  nodes: Node[],
  edges: Edge[],
  scope: ExecutionScope = "FULL",
  selectedNodeIds: string[] = []
): { tiers: Node[][]; targetNodes: Node[] } {
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  // 1. Filter target nodes based on scope
  let activeIds = new Set<string>();

  if (scope === "SINGLE" && selectedNodeIds.length > 0) {
    const singleId = selectedNodeIds[0];
    if (nodeMap.has(singleId)) {
      activeIds = getUpstreamDependencyIds(singleId, edges);
      activeIds.add(singleId);
    }
  } else if (scope === "SELECTED" && selectedNodeIds.length > 0) {
    for (const id of selectedNodeIds) {
      if (nodeMap.has(id)) {
        const upstreams = getUpstreamDependencyIds(id, edges);
        upstreams.forEach((u) => activeIds.add(u));
        activeIds.add(id);
      }
    }
  } else {
    // FULL scope
    activeIds = new Set(nodes.map((n) => n.id));
  }

  const targetNodes = Array.from(activeIds)
    .map((id) => nodeMap.get(id))
    .filter((n): n is Node => Boolean(n));

  // 2. Build In-Degree map of dependencies within active nodes
  const inDegree = new Map<string, number>();
  const outgoingAdj = new Map<string, string[]>();

  for (const node of targetNodes) {
    inDegree.set(node.id, 0);
    outgoingAdj.set(node.id, []);
  }

  for (const edge of edges) {
    if (activeIds.has(edge.source) && activeIds.has(edge.target)) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      const list = outgoingAdj.get(edge.source) || [];
      list.push(edge.target);
      outgoingAdj.set(edge.source, list);
    }
  }

  // 3. Collect Tier 0 (nodes with 0 incoming dependencies)
  let currentTier: Node[] = [];
  for (const node of targetNodes) {
    if ((inDegree.get(node.id) || 0) === 0) {
      currentTier.push(node);
    }
  }

  const tiers: Node[][] = [];
  const processed = new Set<string>();

  while (currentTier.length > 0) {
    tiers.push(currentTier);
    const nextTier: Node[] = [];

    for (const node of currentTier) {
      processed.add(node.id);
      const targets = outgoingAdj.get(node.id) || [];
      for (const targetId of targets) {
        const remaining = (inDegree.get(targetId) || 1) - 1;
        inDegree.set(targetId, remaining);
        if (remaining === 0) {
          const targetNode = nodeMap.get(targetId);
          if (targetNode && !processed.has(targetId)) {
            nextTier.push(targetNode);
          }
        }
      }
    }

    currentTier = nextTier;
  }

  // Safety fallback: if any active node was not processed, push as final tier
  const unprocessed = targetNodes.filter((n) => !processed.has(n.id));
  if (unprocessed.length > 0) {
    tiers.push(unprocessed);
  }

  return { tiers, targetNodes };
}

/**
 * Traverses backwards via DFS to find all ancestor node IDs that feed into this node.
 */
function getUpstreamDependencyIds(targetId: string, edges: Edge[]): Set<string> {
  const ancestors = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    for (const edge of edges) {
      if (edge.target === curr && !ancestors.has(edge.source)) {
        ancestors.add(edge.source);
        stack.push(edge.source);
      }
    }
  }

  return ancestors;
}

/**
 * Resolves inputs for a node before execution by combining upstream outputs and local settings.
 */
export function resolveNodeExecutionInput(
  node: Node,
  edges: Edge[],
  outputsSoFar: Record<string, NodeOutputs>
): {
  taskPayload: Record<string, unknown>;
  capturedInputs: Record<string, unknown>;
} {
  const nodeType = node.type as NodeType;
  const nodeData = (node.data || {}) as Record<string, unknown>;
  const incoming = edges.filter((e) => e.target === node.id);

  const capturedInputs: Record<string, unknown> = {};

  switch (nodeType) {
    case "textArea": {
      const text = String(nodeData.value ?? nodeData.text ?? "");
      capturedInputs.text = text;
      return {
        taskPayload: { text },
        capturedInputs,
      };
    }

    case "uploadImage": {
      const imageUrl = String(nodeData.url ?? nodeData.imageUrl ?? "");
      capturedInputs.imageUrl = imageUrl;
      return {
        taskPayload: { imageUrl },
        capturedInputs,
      };
    }

    case "uploadVideo": {
      const videoUrl = String(nodeData.url ?? nodeData.videoUrl ?? "");
      capturedInputs.videoUrl = videoUrl;
      return {
        taskPayload: { videoUrl },
        capturedInputs,
      };
    }

    case "cropImage": {
      // Find image from incoming connection
      const imageEdge = incoming.find(
        (e) => !e.targetHandle || e.targetHandle.includes("file-in")
      );
      const upstreamImage = imageEdge ? outputsSoFar[imageEdge.source]?.imageUrl : null;
      const imageUrl = upstreamImage || String(nodeData.imageUrl || "");

      // Check crop percentages (from node data or inputs)
      const x = typeof nodeData.x === "number" ? nodeData.x : 0;
      const y = typeof nodeData.y === "number" ? nodeData.y : 0;
      const width = typeof nodeData.width === "number" ? nodeData.width : 100;
      const height = typeof nodeData.height === "number" ? nodeData.height : 100;

      capturedInputs.imageUrl = imageUrl;
      capturedInputs.crop = { x, y, width, height };

      return {
        taskPayload: { imageUrl, x, y, width, height },
        capturedInputs,
      };
    }

    case "extractFrame": {
      // Find video from incoming connection
      const videoEdge = incoming.find(
        (e) => !e.targetHandle || e.targetHandle.includes("video-in")
      );
      const upstreamVideo = videoEdge ? outputsSoFar[videoEdge.source]?.videoUrl : null;
      const videoUrl = upstreamVideo || String(nodeData.videoUrl || "");

      // Check timestamp connection (could be "50%" or seconds from a Text Node)
      const timestampEdge = incoming.find((e) =>
        e.targetHandle?.includes("timestamp")
      );
      const connectedTimestamp = timestampEdge
        ? outputsSoFar[timestampEdge.source]?.text
        : null;

      let timestampInSeconds = 0;
      if (connectedTimestamp) {
        const trimmed = String(connectedTimestamp).trim();
        if (trimmed.endsWith("%")) {
          // If percentage, task handles it via percentage or approximate
          const pct = parseFloat(trimmed) / 100;
          timestampInSeconds = Math.max(0, pct * 10); // default 10s window or handled by FFmpeg
        } else {
          const val = parseFloat(trimmed);
          if (!isNaN(val)) timestampInSeconds = val;
        }
      } else {
        const frame = typeof nodeData.frame === "number" ? nodeData.frame : 0;
        timestampInSeconds = frame / 30;
      }

      capturedInputs.videoUrl = videoUrl;
      capturedInputs.timestamp = connectedTimestamp || timestampInSeconds;

      return {
        taskPayload: { videoUrl, timestamp: timestampInSeconds },
        capturedInputs,
      };
    }

    case "llm": {
      const model = String(nodeData.model || "gemini-3.7-flash");

      // Resolve system prompt
      const sysEdge = incoming.find((e) =>
        e.targetHandle?.includes("system-prompt")
      );
      const systemPrompt = sysEdge
        ? outputsSoFar[sysEdge.source]?.text
        : String(nodeData.systemPrompt || "");

      // Resolve user message
      const userEdge = incoming.find((e) =>
        e.targetHandle?.includes("user-message")
      );
      const userMessage = userEdge
        ? outputsSoFar[userEdge.source]?.text
        : String(nodeData.userMessage || nodeData.prompt || "");

      // Resolve images (can have multiple image inputs connected)
      const imageEdges = incoming.filter((e) =>
        e.targetHandle?.includes("image")
      );
      const images: string[] = [];
      for (const e of imageEdges) {
        const url = outputsSoFar[e.source]?.imageUrl;
        if (url) images.push(url);
      }

      capturedInputs.model = model;
      capturedInputs.systemPrompt = systemPrompt;
      capturedInputs.userMessage = userMessage;
      capturedInputs.images = images;

      return {
        taskPayload: { model, systemPrompt, userMessage, images },
        capturedInputs,
      };
    }

    default:
      return { taskPayload: {}, capturedInputs: {} };
  }
}
