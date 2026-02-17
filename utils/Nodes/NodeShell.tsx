import React, { useState } from "react"
import { Button } from "@/components/ui/button";
import { NodeShellProps } from "@/types/filetypes";
import { Ellipsis } from "lucide-react";
import { useNodeActions } from "@/types/nodetype";
import { ButtonDropDown } from "@/components/ButtonDropDown";


export function NodeShell({ title, icon, children, className = "", nodeId }: NodeShellProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className={`flex flex-col gap-2 rounded-md border border-sidebar-border bg-sidebar-background p-3 text-xs text-sidebar-foreground min-w-xs h-auto ${className}`}>
      {/* Title bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 font-medium text-sm">
          {icon && <span>{icon}</span>}
          {title}
        </div>

        <ButtonDropDown nodeId={nodeId} isOpen={isOpen} setIsOpen={setIsOpen} />

      </div>
      {children}
    </div>
  );
}