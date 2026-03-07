import { Canvas } from "@/components/editor/Canvas";
import { ReactFlowProvider } from "@xyflow/react";

export default function Home() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}