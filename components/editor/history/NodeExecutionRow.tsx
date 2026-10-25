"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Film,
  Crop,
  Scissors,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { NodeExecutionItem } from "@/types/history";
import { MarkdownView } from "@/components/ui/markdown-view";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NodeExecutionRowProps {
  node: NodeExecutionItem;
  isLast: boolean;
}

// Maps nodeType to an icon and human-readable label
function getNodeMeta(nodeType: string) {
  switch (nodeType) {
    case "textArea":
      return { label: "Text Node", icon: FileText, color: "text-blue-400" };
    case "uploadImage":
      return { label: "Upload Image", icon: ImageIcon, color: "text-emerald-400" };
    case "uploadVideo":
      return { label: "Upload Video", icon: Film, color: "text-purple-400" };
    case "cropImage":
      return { label: "Crop Image", icon: Crop, color: "text-amber-400" };
    case "extractFrame":
      return { label: "Extract Frame", icon: Scissors, color: "text-pink-400" };
    case "llm":
      return { label: "Gemini LLM", icon: Sparkles, color: "text-[#f7ffa8]" };
    default:
      return { label: nodeType, icon: FileText, color: "text-zinc-400" };
  }
}

export function NodeExecutionRow({ node, isLast }: NodeExecutionRowProps) {
  const [copied, setCopied] = useState(false);
  const meta = getNodeMeta(node.nodeType);
  const IconComponent = meta.icon;

  const nodeDuration = node.durationMs
    ? `${(node.durationMs / 1000).toFixed(1)}s`
    : null;

  // Extract primary output string or media URL
  const outputValue =
    node.outputs?.text ||
    node.outputs?.imageUrl ||
    (typeof node.outputs === "string"
      ? node.outputs
      : node.outputs
      ? JSON.stringify(node.outputs, null, 2)
      : null);

  // Check if output is a direct image URL
  const isImageUrl =
    typeof outputValue === "string" &&
    (outputValue.startsWith("http://") || outputValue.startsWith("https://")) &&
    (outputValue.match(/\.(jpeg|jpg|gif|png|webp)/i) ||
      node.nodeType.includes("Image") ||
      node.nodeType.includes("Frame"));

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Output copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-xs">
      {/* Node Tree Line Header */}
      <div className="flex items-center justify-between py-1 group">
        <div className="flex items-center gap-1.5 min-w-0 font-mono text-[#a5a5b5]">
          <span className="text-[#555562]">{isLast ? "└──" : "├──"}</span>
          <IconComponent className={cn("w-3.5 h-3.5", meta.color)} />
          <span className="font-semibold text-[#f2f0f8] truncate">
            {meta.label}
          </span>
          <span className="text-[10px] text-[#707080]">({node.nodeId})</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {node.status === "COMPLETED" && (
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              {nodeDuration}
            </span>
          )}
          {node.status === "FAILED" && (
            <span className="text-rose-400 flex items-center gap-1 text-[11px]">
              <XCircle className="w-3 h-3" />
              Failed
            </span>
          )}
          {node.status === "RUNNING" && (
            <span className="text-amber-400 flex items-center gap-1 text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running
            </span>
          )}
        </div>
      </div>

      {/* Node Output / Error Drawer */}
      <div className="ml-5 pl-2 border-l border-[#2e2e34] my-1 space-y-1">
        {node.error && (
          <div className="p-1.5 rounded bg-rose-950/30 border border-rose-900/40 text-rose-300 text-[11px] font-mono">
            Error: {node.error}
          </div>
        )}

        {outputValue && (
          <div className="relative group/output rounded bg-[#131316] border border-[#27272e] p-2">
            {/* Copy button */}
            <button
              onClick={() => handleCopy(outputValue)}
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-[#2b2b32] text-[#80808e] hover:text-[#f2f0f8] opacity-0 group-hover/output:opacity-100 transition-opacity z-10 cursor-pointer"
              title="Copy output"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>

            {/* Media thumbnail preview or Markdown view */}
            {isImageUrl ? (
              <div className="space-y-1.5">
                <img
                  src={outputValue}
                  alt="Output Preview"
                  className="w-full max-h-36 object-contain rounded bg-black/40 border border-[#2a2a30]"
                />
                <a
                  href={outputValue}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{outputValue}</span>
                </a>
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto custom-scrollbar">
                <MarkdownView
                  content={outputValue}
                  className="text-[11px] text-[#d6d6e2]"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
