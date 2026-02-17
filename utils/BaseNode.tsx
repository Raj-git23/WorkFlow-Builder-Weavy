import { useState } from "react";
import { Position } from "@xyflow/react";
import CustomHandle from "@/utils/CustomHandle";
import { BaseNodeProps } from "@/types/filetypes";
import { BaseNodeData } from "@/types/nodetype";

export function BaseNode<T extends BaseNodeData>({
  id,
  data,
  handles = [{ text: "Output", position: Position.Right, type: "source" }],
  children,
}: BaseNodeProps<T>) {
  const [active, setActive] = useState(false);

  return (
    <div
      className="relative min-h-12 w-auto"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      {handles.map((handle) => (
        <CustomHandle
          key={handle.id ?? handle.text}
          id={handle.id ?? `${id}-${handle.text.toLowerCase()}`}
          text={handle.text}
          active={active}
          position={handle.position ?? Position.Right}
          type={handle.type ?? "source"}
          style={handle.style}
        />
      ))}

      {children({ id, data: data as T, active })}
    </div>
  );
}
