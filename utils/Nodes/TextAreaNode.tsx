// utils/Nodes/TextAreaNode.tsx
import { useCallback } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/utils/BaseNode";
import { NodeShell } from "@/utils/Nodes/NodeShell";
import { Textarea } from "@/components/ui/textarea";
import { TextAreaRFNode, TextNodeData } from "@/types/nodetype";
import { useFlowStore } from "@/store/useflowstore";

export function TextAreaNode(props: NodeProps<TextAreaRFNode>) {
  const setOutput = useFlowStore((s) => s.setOutput);

  
  const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {   // Publish text to store so LLM node can read it via the connected edge
    setOutput(props.id, { text: evt.target.value });
  }, [props.id, setOutput]);

  return (
    <BaseNode<TextNodeData> {...props} handles={[{ text: "Prompt", position: Position.Right, style: { background: '#f1a0fa' }}]}>
      {({ id, data }) => (
        <NodeShell title="Prompt" nodeId={props?.id}>
          <Textarea
            id={`textarea-${id}`}
            name="text"
            defaultValue={data.value}
            onChange={onChange}
            placeholder="Your prompt goes here..."
            className="nodrag rounded border-none bg-textarea-background p-4 w-full text-sidebar-foreground h-36"
          />
        </NodeShell>
      )}
    </BaseNode>
  );
}