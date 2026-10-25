import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "@/components/editor/Canvas";

interface WorkflowPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params;

  return (
    <ReactFlowProvider>
      <Canvas initialWorkflowId={id} />
    </ReactFlowProvider>
  );
}
