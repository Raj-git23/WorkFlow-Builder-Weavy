import { type Node, type Edge } from "@xyflow/react";

export interface WorkflowSelectionAnalysis {
  /** True if the selected nodes form a connected, self-contained pipeline */
  isWorkflow: boolean;
  /** True if all nodes in the connected component or canvas are covered */
  isFullWorkflow: boolean;
  /** True if there is at least one edge connecting selected nodes */
  hasInternalEdges: boolean;
  /** True if any selected node is missing an upstream dependency (unselected input) */
  hasMissingInputs: boolean;
  /** Number of distinct workflow pipelines selected */
  workflowCount: number;
  /** Execution scope to pass to the orchestrator */
  scope: "FULL" | "SELECTED";
  /** Human-readable button label ("Run Workflow", "Run Workflows (N)", or "Run Selected (N)") */
  buttonLabel: string;
}

/**
 * Analyzes the currently selected nodes on the canvas.
 * Determines whether the selection forms valid, self-contained "Workflows"
 * (connected components with input dependencies satisfied) or partial selected nodes.
 */
export function analyzeWorkflowSelection(
  nodes: Node[],
  edges: Edge[],
  selectedNodes: Node[]
): WorkflowSelectionAnalysis {
  const selectedCount = selectedNodes.length;

  if (selectedCount === 0) {
    return {
      isWorkflow: false,
      isFullWorkflow: false,
      hasInternalEdges: false,
      hasMissingInputs: false,
      workflowCount: 0,
      scope: "SELECTED",
      buttonLabel: "",
    };
  }

  const selectedIdSet = new Set(selectedNodes.map((n) => n.id));

  // 1. Check if there are wires connecting the selected nodes together
  const internalEdges = edges.filter(
    (e) => selectedIdSet.has(e.source) && selectedIdSet.has(e.target)
  );
  const hasInternalEdges = internalEdges.length > 0;

  // 2. Check if any selected node depends on an unselected upstream node
  const hasMissingInputs = edges.some(
    (e) => selectedIdSet.has(e.target) && !selectedIdSet.has(e.source)
  );

  // 3. Find connected components among selected nodes via internal edges
  const adj = new Map<string, string[]>();
  for (const n of selectedNodes) {
    adj.set(n.id, []);
  }
  for (const e of internalEdges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const n of selectedNodes) {
    if (!visited.has(n.id)) {
      const comp: string[] = [];
      const queue = [n.id];
      visited.add(n.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      components.push(comp);
    }
  }

  // Count components that have internal connections (pipelines)
  const connectedPipelines = components.filter((comp) => comp.length > 1);
  const workflowCount = connectedPipelines.length;

  // 4. A selection is considered a true "Workflow" if:
  //    - It has wires connecting the nodes into a pipeline, AND
  //    - It is self-contained (no required inputs hanging outside the selection)
  const isWorkflow = hasInternalEdges && !hasMissingInputs;

  // 5. Determine scope: FULL if all nodes on canvas are selected or if the workflow is self-contained
  const isFull = selectedCount === nodes.length;
  const scope: "FULL" | "SELECTED" = isFull ? "FULL" : "SELECTED";

  // 6. Button Label:
  //    - If multiple workflows/pipelines are selected -> "Run Workflows (N)"
  //    - If exactly 1 connected pipeline is selected -> "Run Workflow"
  //    - If loose nodes or partial pipeline with missing inputs -> "Run Selected (N)"
  let buttonLabel: string;
  if (workflowCount > 1) {
    buttonLabel = `Run Workflows (${workflowCount})`;
  } else if (isWorkflow) {
    buttonLabel = "Run Workflow";
  } else {
    buttonLabel = `Run Selected (${selectedCount})`;
  }

  return {
    isWorkflow,
    isFullWorkflow: isFull,
    hasInternalEdges,
    hasMissingInputs,
    workflowCount,
    scope,
    buttonLabel,
  };
}
