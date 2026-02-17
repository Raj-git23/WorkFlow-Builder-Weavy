"use client";

import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  Crop,
  Film,
  ImageUp,
  Sparkles,
  SquarePlay,
  TypeOutline,
} from "lucide-react";
import React, { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { NodeType } from "@/types/nodetype";
import { LeftSidebarProps } from "@/types/filetypes";
import { NODES } from "@/lib/assets";




const LeftSidebar: React.FC<LeftSidebarProps> = ({ onAddNode, onDragStart }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`${isOpen ? "w-14" : "w-auto"} flex flex-col items-center h-full`}>
      {isOpen && (
        <main className="bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border py-4 flex flex-col items-center z-20 h-full w-full">
          <Cloud height="32px" width="32px" className="mb-8" />

          <TooltipProvider>
            <div className="flex flex-col gap-3">
              {NODES.map((item) => (
                <Tooltip key={item.type}>
                  <TooltipTrigger asChild>
                    <button
                      className="mb-1 rounded-sm p-2 cursor-grab hover:bg-button-hover active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      onClick={() => onAddNode(item.type)}
                    >
                      {item.icon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-sidebar-border">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </main>
      )}

      <button
        className={`${
          isOpen ? "border-0" : "border border-sidebar-border left-2"
        } rounded-md p-1 mt-auto absolute bottom-4 z-50 bg-sidebar-background text-sidebar-foreground cursor-pointer hover:bg-button-hover`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? <ChevronLeft strokeWidth={1} /> : <ChevronRight strokeWidth={1} />}
      </button>
    </div>
  );
};

export default LeftSidebar;