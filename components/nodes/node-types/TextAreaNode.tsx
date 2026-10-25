// components/nodes/TextAreaNode.tsx
import { useCallback, useState, useEffect } from "react";
import { Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { BaseNode } from "@/components/nodes/BaseNode";
import { NodeShell } from "@/components/nodes/NodeShell";
import { Textarea } from "@/components/ui/textarea";
import { TextAreaRFNode, TextNodeData } from "@/types/nodetype";
import { useFlowStore, useIsNodeRunning } from "@/store/useFlowStore";
import { cn } from "@/lib/utils";

export function TextAreaNode(props: NodeProps<TextAreaRFNode>) {
  const setOutput = useFlowStore((s) => s.setOutput);
  const isRunning = useIsNodeRunning(props.id);
  const { updateNodeData } = useReactFlow();
  const [val, setVal] = useState<string>(props.data.value ?? "");

  // Publish to runtime flow store on initial mount or when saved value changes
  useEffect(() => {
    if (props.data.value !== undefined) {
      setVal(props.data.value);
      setOutput(props.id, { text: props.data.value });
    }
  }, [props.id, props.data.value, setOutput]);

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextVal = evt.target.value;
      setVal(nextVal);
      // 1. Publish to in-memory store for connected nodes
      setOutput(props.id, { text: nextVal });
      // 2. Persist to React Flow node state so auto-save preserves it
      updateNodeData(props.id, { value: nextVal });
    },
    [props.id, setOutput, updateNodeData],
  );

  return (
    <BaseNode<TextNodeData>
      {...props}
      handles={[
        {
          text: "Prompt",
          position: Position.Right,
          style: { background: "#f1a0fa" },
        },
      ]}
    >
      {({ id, selected }) => (
        <NodeShell
          title="Prompt"
          className={cn(
            "transition-all duration-300",
            isRunning &&
              "animate-pulse ring-2 ring-yellow-bg shadow-[0_0_30px_rgba(247,255,168,0.4)] border-yellow-bg"
          )}
          nodeId={props?.id}
          selected={selected ?? props.selected}
        >
          <Textarea
            id={`textarea-${id}`}
            name="text"
            value={val}
            onChange={onChange}
            placeholder="Your prompt goes here..."
            className="nodrag rounded border-none bg-textarea-background p-4 w-full text-sidebar-foreground h-36"
          />
        </NodeShell>
      )}
    </BaseNode>
  );
}

