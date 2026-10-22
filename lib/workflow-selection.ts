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
  /** Execution scope to pass to the orchestrator */
  scope: "FULL" | "SELECTED";
  /** Human-readable button label ("Run Workflow" or "Run Selected (N)") */
  buttonLabel: string;
}

/**
 * Analyzes the currently selected nodes on the canvas.
 * Determines whether the selection forms a valid, self-contained "Workflow"
 * (a connected component with all input dependencies satisfied) or is just
 * a collection of standalone/partial selected nodes.
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
      scope: "SELECTED",
      buttonLabel: "",
    };
  }

  const selectedIdSet = new Set(selectedNodes.map((n) => n.id));

  // 1. Check if there are wires connecting the selected nodes together
  const hasInternalEdges = edges.some(
    (e) => selectedIdSet.has(e.source) && selectedIdSet.has(e.target)
  );

  // 2. Check if any selected node depends on an unselected upstream node
  const hasMissingInputs = edges.some(
    (e) => selectedIdSet.has(e.target) && !selectedIdSet.has(e.source)
  );

  // 3. A selection is considered a true "Workflow" if:
  //    - It has wires connecting the nodes into a pipeline, AND
  //    - It is self-contained (no required inputs hanging outside the selection)
  const isWorkflow = hasInternalEdges && !hasMissingInputs;

  // 4. Determine scope: FULL if all nodes on canvas are selected or if the workflow is self-contained
  const isFull = selectedCount === nodes.length;
  const scope: "FULL" | "SELECTED" = isFull ? "FULL" : "SELECTED";

  // 5. Button Label:
  //    - If it's a connected, self-contained pipeline -> "Run Workflow"
  //    - If it's loose standalone nodes or missing inputs -> "Run Selected (N)"
  const buttonLabel = isWorkflow
    ? "Run Workflow"
    : `Run Selected (${selectedCount})`;

  return {
    isWorkflow,
    isFullWorkflow: isFull,
    hasInternalEdges,
    hasMissingInputs,
    scope,
    buttonLabel,
  };
}
