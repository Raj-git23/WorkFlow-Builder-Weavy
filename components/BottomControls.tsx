"use client";

import { MousePointer2, Hand, Undo2, Redo2, ChevronDown } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useViewport, useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { ZOOM_OPTIONS } from "@/lib/assets";
import { BottomControlsProps } from "@/types/filetypes";



export function BottomControls({
  toolMode,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: BottomControlsProps) {
  const { zoom } = useViewport();
  
  const { zoomTo, fitView } = useReactFlow();
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setZoomDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleZoomSelect = (value: number) => {
    zoomTo(value / 100, { duration: 200 });
    setZoomDropdownOpen(false);
  };

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 200 });
    setZoomDropdownOpen(false);
  };

  return (
    <div className="flex items-center gap-0 rounded-md border border-sidebar-border bg-sidebar-background px-2 py-1.5 shadow-lg">

      {/* selection tool */}
      <button
        type="button"
        onClick={() => onToolChange("selection")}
        className={cn(
          "rounded-sm p-2 mr-2 transition-colors",
          toolMode === "selection"
            ? "bg-yellow-bg text-[#1c1b1f]"
            : "text-sidebar-foreground hover:bg-button-hover"
        )}
        aria-label="Selection tool"
      >
        <MousePointer2 size={20} strokeWidth={1.3} />
      </button>

      {/* hand tool */}
      <button
        type="button"
        onClick={() => onToolChange("pan")}
        className={cn(
          "rounded-sm p-2 transition-colors",
          toolMode === "pan"
            ? "bg-yellow-bg text-[#1c1b1f]"
            : "text-sidebar-foreground hover:bg-button-hover"
        )}
        aria-label="Pan tool"
      >
        <Hand size={20} strokeWidth={1.3} />
      </button>

      <div className="mx-1 h-5 w-px bg-sidebar-border" />

      {/* Undo button*/}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          "rounded-lg p-2 transition-colors",
          canUndo
            ? "text-sidebar-foreground hover:bg-button-hover"
            : "cursor-not-allowed text-sidebar-foreground/40"
        )}
        aria-label="Undo"
      >
        <Undo2 size={18} strokeWidth={2} />
      </button>

      {/* Redo button */}
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          "rounded-lg p-2 transition-colors",
          canRedo
            ? "text-sidebar-foreground hover:bg-button-hover"
            : "cursor-not-allowed text-sidebar-foreground/40"
        )}
        aria-label="Redo"
      >
        <Redo2 size={18} strokeWidth={2} />
      </button>

      <div className="mx-1 h-5 w-px bg-sidebar-border" />

      {/* Zoom dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setZoomDropdownOpen((o) => !o)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:cursor-pointer w-full font-semibold text-sidebar-foreground transition-colors hover:bg-button-hover"
        >
          <span>{zoomPercent}%</span>
          <ChevronDown size={14} className={cn("transition-transform", zoomDropdownOpen && "rotate-180")} />
        </button>

        {zoomDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-1 min-w-[80px] rounded-sm border text-white border-sidebar-border bg-sidebar-background py-1 shadow-lg">
            {ZOOM_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleZoomSelect(opt)}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm",
                  zoomPercent === opt ? "bg-button-hover font-medium" : "hover:bg-button-hover hover:cursor-pointer"
                )}
              >
                {opt}%
              </button>
            ))}
            <div className="my-1 h-px bg-sidebar-border" />
            <button
              type="button"
              onClick={handleFitView}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-button-hover"
            >
              Fit view
            </button>
          </div>
        )}
      </div>
    </div>
  );
}