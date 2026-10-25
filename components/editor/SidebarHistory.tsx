"use client";

import React, { useState, useEffect, useCallback } from "react";
import { History, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkflowRunItem, SidebarHistoryProps } from "@/types/history";
import { errorHandler } from "@/lib/error-handler";
import { RunCard } from "./history/RunCard";

export default function SidebarHistory({
  isOpen,
  onClose,
  workflowId,
  currentRunId,
}: SidebarHistoryProps) {
  const [runs, setRuns] = useState<WorkflowRunItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(new Set());

  // Fetch runs from /api/workflows/runs endpoint
  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const url = workflowId
        ? `/api/workflows/runs?workflowId=${workflowId}`
        : "/api/workflows/runs";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch runs");

      const fetchedRuns: WorkflowRunItem[] = data.runs || [];
      setRuns(fetchedRuns);

      // Automatically expand newest run if none is expanded
      if (fetchedRuns.length > 0 && expandedRunIds.size === 0) {
        setExpandedRunIds(new Set([fetchedRuns[0].id]));
      }
    } catch (err: any) {
      console.error("Failed to load history:", err);
      toast.error(errorHandler.format(err));
    } finally {
      setLoading(false);
    }
  }, [workflowId, expandedRunIds.size]);

  // Load history on open
  useEffect(() => {
    if (isOpen) {
      fetchRuns();
    }
  }, [isOpen, fetchRuns]);

  // Auto-refresh when a run starts/completes
  useEffect(() => {
    if (isOpen && currentRunId) {
      fetchRuns();
    }
  }, [currentRunId, isOpen, fetchRuns]);

  // Toggle accordion expand/collapse for a run card
  const toggleRunExpand = (runId: string) => {
    setExpandedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent backdrop for dismiss */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Right Sidebar Panel */}
      <aside className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-[#1a1a1e] border-l border-[#2e2e34] shadow-2xl z-50 flex flex-col font-inter">
        {/* Header */}
        <div className="h-14 px-4 border-b border-[#2e2e34] flex items-center justify-between bg-[#151518]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#f7ffa8]" />
            <h2 className="text-sm font-semibold text-[#f2f0f8]">
              Workflow History
            </h2>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#27272e] text-[#9b9ba7] font-mono">
              {runs.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchRuns}
              disabled={loading}
              className="h-8 w-8 text-[#9b9ba7] hover:text-[#f2f0f8] hover:bg-[#27272e] cursor-pointer"
              title="Refresh runs"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", loading && "animate-spin")}
              />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-[#9b9ba7] hover:text-[#f2f0f8] hover:bg-[#27272e] cursor-pointer"
              title="Close history"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Runs List Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {loading && runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-[#9b9ba7]">
              <Loader2 className="w-5 h-5 animate-spin text-[#f7ffa8]" />
              <p className="text-xs">Loading execution history...</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4 gap-2 text-[#9b9ba7]">
              <History className="w-8 h-8 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-medium text-[#d1d1dc]">
                No workflow runs yet
              </p>
              <p className="text-xs text-[#80808e] max-w-[240px]">
                Click &quot;Run Workflow&quot; (⌘↵) on the canvas to execute your graph and inspect results here.
              </p>
            </div>
          ) : (
            runs.map((run, index) => (
              <RunCard
                key={run.id}
                run={run}
                runIndex={index}
                totalRuns={runs.length}
                isExpanded={expandedRunIds.has(run.id)}
                onToggle={() => toggleRunExpand(run.id)}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}