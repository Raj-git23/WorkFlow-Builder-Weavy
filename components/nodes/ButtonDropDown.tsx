import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Ellipsis, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNodeActions } from "@/types/nodetype";

export function ButtonDropDown({
  nodeId,
  isOpen,
  setIsOpen,
}: {
  nodeId: string | undefined;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [locked, setLocked] = useState(false);
  const { duplicateNode, deleteNode } = useNodeActions();

  return (
    <DropdownMenu open={isOpen} onOpenChange={() => setIsOpen((prev) => !prev)}>
      <DropdownMenuTrigger asChild>
        <Button className="nodrag bg-transparent hover:border border-textarea-background hover:bg-button-hover hover:cursor-pointer    text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors outline-none">
          <Ellipsis size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-60 font-inter absolute left-0 -top-4 border-sidebar-border text-xs bg-sidebar-background text-sidebar-foreground"
      >
        <DropdownMenuItem
          onClick={() => nodeId && duplicateNode(nodeId)}
          className="flex items-center justify-between cursor-pointer hover:bg-button-hover focus:text-white focus:bg-white/5"
        >
          <p>Duplicate</p>
          <span className="text-[10px] text-sidebar-foreground/40">
            ctrl+d
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLocked((l) => !l)}
          className="flex items-center gap-2 focus:text-white cursor-pointer hover:bg-white/5 focus:bg-white/5"
        >
          {locked ? "Unlock" : "Lock"}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-sidebar-border mx-1" />

        <DropdownMenuItem
          onClick={() => nodeId && deleteNode(nodeId)}
          className="flex items-center justify-between cursor-pointer text-red-400 hover:bg-white/5 focus:bg-white/5 hover:text-red-400 focus:text-red-400"
        >
          <div className="flex items-center gap-2">Delete</div>
          <span className="text-[11px] opacity-60">
            delete / backspace
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

