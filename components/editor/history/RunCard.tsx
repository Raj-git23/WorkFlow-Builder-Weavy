"use client";

import React from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { WorkflowRunItem } from "@/types/history";
import { NodeExecutionRow } from "./NodeExecutionRow";
import { cn } from "@/lib/utils";

interface RunCardProps {
  run: WorkflowRunItem;
  runIndex: number;
  totalRuns: number;
  isExpanded: boolean;
  onToggle: () => void;
}

// Formats date into readable relative time (e.g. "2m ago")
function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RunCard({
  run,
  runIndex,
  totalRuns,
  isExpanded,
  onToggle,
}: RunCardProps) {
  const durationSec = run.durationMs
    ? (run.durationMs / 1000).toFixed(1)
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-[#212126] transition-all overflow-hidden",
        run.status === "RUNNING"
          ? "border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          : "border-[#2e2e34] hover:border-[#3e3e46]"
      )}
    >
      {/* Run Card Header Accordion */}
      <div
        onClick={onToggle}
        className="p-3 cursor-pointer select-none flex items-center justify-between gap-2 hover:bg-[#26262c] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[#9b9ba7] shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#9b9ba7] shrink-0" />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#f2f0f8]">
                Run #{totalRuns - runIndex}
              </span>
              <span className="text-[11px] text-[#80808e]">
                {formatTimeAgo(run.startedAt)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              {/* Scope Badge */}
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2b2b32] text-[#9b9ba7]">
                {run.scope}
              </span>

              {/* Total Duration */}
              {durationSec && (
                <span className="text-[11px] text-[#9b9ba7] flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-60" />
                  {durationSec}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {run.status === "COMPLETED" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          )}
          {run.status === "FAILED" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-400 border border-rose-800/60">
              <XCircle className="w-3 h-3" />
              Failed
            </span>
          )}
          {(run.status === "RUNNING" || run.status === "PENDING") && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-400 border border-amber-800/60 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running
            </span>
          )}
        </div>
      </div>

      {/* Expanded Node-Level Tree */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#2a2a30] bg-[#1a1a1f] space-y-2">
          {run.error && (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-mono">
              Error: {run.error}
            </div>
          )}

          {run.nodeExecutions.length === 0 ? (
            <p className="text-xs text-[#80808e] italic py-1">
              No node execution details captured.
            </p>
          ) : (
            run.nodeExecutions.map((node, nodeIdx) => (
              <NodeExecutionRow
                key={node.id}
                node={node}
                isLast={nodeIdx === run.nodeExecutions.length - 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
