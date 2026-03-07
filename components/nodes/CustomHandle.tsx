import { cn } from "@/lib/utils";
import { CustomHandleProps } from "@/types/filetypes";
import { Handle } from "@xyflow/react";
import React from "react";

const CustomHandle: React.FC<CustomHandleProps> = ({
  id,
  active,
  text,
  type,
  position,
  style,
}) => {
  return (
    <Handle
      type={type}
      position={position}
      id={`handle-${id}`}
      style={{ height: "12px", width: "12px", borderStyle: "none", ...style }}
    >
      <span
        className={cn(
          "absolute bottom-0 -translate-y-1/2",
          "whitespace-nowrap text-[10px] font-medium text-edge-circle",
          "transition-all duration-200 pointer-events-none font-dmmono",
          type === "source" ? "left-3 -top-2" : "right-2.5 -top-2",
          active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1",
        )}
      >
        {text}
      </span>
    </Handle>
  );
};

export default CustomHandle;

