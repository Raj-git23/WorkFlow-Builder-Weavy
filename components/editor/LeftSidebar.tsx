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
import { NODES } from "@/lib/nodesConfig";

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onAddNode,
  onDragStart,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={`${
        isOpen
          ? "w-14 bg-sidebar-background border-r border-sidebar-border"
          : "w-0 border-r-0 bg-transparent overflow-visible"
      } flex flex-col items-center h-full relative shrink-0 z-20 transition-all duration-200 select-none`}
    >
      {isOpen && (
        <aside className="bg-sidebar-background text-sidebar-foreground py-4 flex flex-col items-center h-full w-full">
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
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="bg-[#212126] text-[#f2f0f8] border border-[#302e33] font-medium text-xs px-2.5 py-1.5 shadow-2xl rounded-md"
                  >
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </aside>
      )}

      <button
        className={`${
          isOpen
            ? "left-2 border-0 bg-sidebar-background"
            : "left-3 border border-sidebar-border bg-[#1c1b1f] shadow-xl"
        } rounded-md p-1.5 absolute bottom-4 z-50 text-sidebar-foreground cursor-pointer hover:bg-button-hover transition-colors`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? (
          <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
        ) : (
          <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default LeftSidebar;

