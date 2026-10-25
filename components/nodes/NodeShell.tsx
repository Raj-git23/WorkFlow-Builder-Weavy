import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { NodeShellProps } from "@/types/filetypes";
import { Ellipsis } from "lucide-react";
import { useNodeActions } from "@/types/nodetype";
import { ButtonDropDown } from "@/components/nodes/ButtonDropDown";

export function NodeShell({
  title,
  icon,
  children,
  className = "",
  nodeId,
  selected,
}: NodeShellProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div
      data-selected={selected}
      className={`node-shell flex flex-col gap-2 rounded-md border transition-all duration-150 ${
        selected
          ? "border-yellow-bg bg-[#2c2b33] ring-1 ring-yellow-bg/40 shadow-[0_0_15px_rgba(247,255,168,0.1)]"
          : "border-sidebar-border bg-sidebar-background"
      } p-3 text-xs text-sidebar-foreground min-w-xs h-auto ${className}`}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex font-dmsans items-center gap-1.5 font-medium text-sm">
          {icon && <span>{icon}</span>}
          {title}
        </div>

        <ButtonDropDown
          nodeId={nodeId}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      </div>
      {children}
    </div>
  );
}

