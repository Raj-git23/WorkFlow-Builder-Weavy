// components/nodes/LlmNode.tsx
import { useCallback, useState, useEffect } from "react";
import { type NodeProps, Position, useUpdateNodeInternals } from "@xyflow/react";
import { Plus, Play, ChevronsUpDown, Check, Loader2, Copy, CheckCheck, Sparkles, MessageSquare } from "lucide-react";
import { NodeShell } from "@/components/nodes/NodeShell";
import { BaseNode } from "@/components/nodes/BaseNode";
import { PreviewArea } from "@/components/nodes/PreviewArea";
import { LLMNodeData, LLMRFNode } from "@/types/nodetype";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MODELS } from "@/lib/constant";
import { useFlowStore, useNodeInput } from "@/store/useFlowStore";
import { MarkdownView } from "@/components/ui/markdown-view";

const HANDLE_SPACING = 28;
const HANDLE_START_Y = 56;

const SYSTEM_PROMPT_HANDLE = (id: string) => `${id}-system-prompt`;
const USER_MESSAGE_HANDLE = (id: string) => `${id}-user-message`;
const IMAGE_HANDLE = (id: string, i: number) => `${id}-image-${i}`;
const OUTPUT_HANDLE = (id: string) => `${id}-output`;

// Separate component per image slot for targeted flow store subscription
function ImageSlot({ nodeId, index }: { nodeId: string; index: number }) {
  const input = useNodeInput(nodeId, IMAGE_HANDLE(nodeId, index));
  const url = input?.imageUrl;

  return url ? (
    <div className="relative group/slot h-16 w-16 rounded-sm overflow-hidden border border-sidebar-border bg-black/40">
      <img
        src={url}
        alt={`ref ${index + 1}`}
        className="h-full w-full object-cover rounded-sm"
      />
      <span className="absolute bottom-0.5 right-1 text-[9px] bg-black/70 px-1 rounded text-white/80 font-mono">
        #{index + 1}
      </span>
    </div>
  ) : (
    <div className="h-16 w-16 rounded-sm border border-dashed border-sidebar-border/60 bg-black/20 flex flex-col items-center justify-center p-1 text-center">
      <span className="text-[9px] text-sidebar-foreground/40 font-mono">
        Img #{index + 1}
      </span>
      <span className="text-[8px] text-sidebar-foreground/30">Connect</span>
    </div>
  );
}

export function LLMNode(props: NodeProps<LLMRFNode>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const setOutput = useFlowStore((s) => s.setOutput);
  const flowOutputs = useFlowStore((s) => s.outputs);
  const flowEdges = useFlowStore((s) => s.edges);

  // Subscribed upstream inputs
  const systemInput = useNodeInput(props.id, SYSTEM_PROMPT_HANDLE(props.id));
  const connectedSystemPrompt = systemInput?.text ?? "";

  const userInput = useNodeInput(props.id, USER_MESSAGE_HANDLE(props.id));
  const connectedUserMessage = userInput?.text ?? "";

  // Local state - default to empty string so 'Select model...' placeholder is shown
  const [modelList, setModelList] = useState(MODELS);
  const [model, setModel] = useState<string>(props.data.model || "");
  const [imageInputCount, setImageInputCount] = useState(
    props.data.imageInputCount ?? 1
  );
  const [localPrompt, setLocalPrompt] = useState<string>("");

  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch available Gemini models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            setModelList(data.models);
          }
        }
      } catch (e) {
        console.warn("Could not fetch models, using default list:", e);
      }
    }
    loadModels();
  }, []);

  const addImageInput = useCallback(() => {
    setImageInputCount((c) => {
      updateNodeInternals(props.id);
      return c + 1;
    });
  }, [props.id, updateNodeInternals]);

  // Aggregate all connected image URLs
  const getConnectedImages = useCallback(() => {
    const images: string[] = [];
    for (let i = 0; i < imageInputCount; i++) {
      const handleId = IMAGE_HANDLE(props.id, i);
      const edge = flowEdges.find((e) => {
        if (e.target !== props.id) return false;
        const tH = e.targetHandle || "";
        return (
          tH === handleId ||
          tH === `handle-${handleId}` ||
          tH.endsWith(handleId) ||
          handleId.endsWith(tH)
        );
      });
      if (edge && flowOutputs[edge.source]?.imageUrl) {
        images.push(flowOutputs[edge.source].imageUrl!);
      }
    }
    return images;
  }, [flowEdges, flowOutputs, imageInputCount, props.id]);

  // Execute LLM call via Trigger.dev
  const runModel = useCallback(async () => {
    if (!model) {
      setError("Please select a model from the dropdown.");
      return;
    }

    const activePrompt = (connectedUserMessage || localPrompt).trim();
    if (!activePrompt) {
      setError("Please connect a Text Node to User Message or type a prompt.");
      return;
    }

    setStatus("running");
    setError(null);

    try {
      const connectedImages = getConnectedImages();

      const res = await fetch("/api/run-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          systemPrompt: connectedSystemPrompt || undefined,
          userMessage: activePrompt,
          images: connectedImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "LLM execution failed");

      setResultText(data.text);
      setStatus("done");
      setOutput(props.id, { text: data.text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [
    model,
    connectedUserMessage,
    localPrompt,
    connectedSystemPrompt,
    getConnectedImages,
    props.id,
    setOutput,
  ]);

  const handleCopy = useCallback(() => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [resultText]);

  const handles = [
    {
      text: "System Prompt",
      id: SYSTEM_PROMPT_HANDLE(props.id),
      position: Position.Left,
      type: "target" as const,
      style: { top: HANDLE_START_Y, background: "#f1a0fa" },
    },
    {
      text: "User Message*",
      id: USER_MESSAGE_HANDLE(props.id),
      position: Position.Left,
      type: "target" as const,
      style: { top: HANDLE_START_Y + HANDLE_SPACING, background: "#f1a0fa" },
    },
    ...Array.from({ length: imageInputCount }, (_, i) => ({
      text: `Image ${i + 1}`,
      id: IMAGE_HANDLE(props.id, i),
      position: Position.Left,
      type: "target" as const,
      style: {
        top: HANDLE_START_Y + HANDLE_SPACING * (2 + i),
        background: "#45a08a",
      },
    })),
    {
      text: "Output",
      id: OUTPUT_HANDLE(props.id),
      position: Position.Right,
      type: "source" as const,
      style: { top: "50%", background: "#45a08a" },
    },
  ];

  const isRunning = status === "running";

  return (
    <BaseNode<LLMNodeData> {...props} handles={handles}>
      {({ selected }) => (
        <NodeShell
          title="Google Gemini LLM"
          icon={<Sparkles size={14} className="text-yellow-bg" />}
          className={cn(
            "w-[400px] h-auto transition-all duration-300",
            isRunning &&
              "animate-pulse ring-2 ring-yellow-bg shadow-[0_0_30px_rgba(247,255,168,0.4)] border-yellow-bg"
          )}
          nodeId={props?.id}
          selected={selected ?? props.selected}
        >
          {/* Shadcn Select model dropdown */}
          <Select
            value={model}
            onValueChange={(val) => {
              setModel(val);
              setError(null);
            }}
            disabled={isRunning}
          >
            <SelectTrigger className="nodrag w-full border-sidebar-border bg-[#1c1b1f] text-xs h-auto py-2">
              <SelectValue placeholder="Select model…" />
            </SelectTrigger>
            <SelectContent className="w-84 border-sidebar-border bg-sidebar-background shadow-2xl">
              <SelectGroup>
                <SelectLabel>Google AI Studio Free Tier</SelectLabel>
                {modelList.map((m) => (
                  <SelectItem
                    key={m.value}
                    value={m.value}
                    className="flex flex-col items-start gap-0.5 text-xs py-2 px-2.5 hover:bg-yellow-bg hover:text-black focus:bg-yellow-bg focus:text-black data-[state=checked]:text-yellow-bg data-[state=checked]:hover:text-black data-[state=checked]:focus:text-black group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-xs text-sidebar-foreground group-hover:text-black group-focus:text-black group-data-[state=checked]:text-yellow-bg group-data-[state=checked]:group-hover:text-black group-data-[state=checked]:group-focus:text-black transition-colors">
                        {m.label}
                      </span>
                    </div>
                    {m.desc && (
                      <span className="text-[10px] text-sidebar-foreground/60 group-hover:text-black/80 group-focus:text-black/80 group-data-[state=checked]:text-yellow-bg/80 group-data-[state=checked]:group-hover:text-black/80 group-data-[state=checked]:group-focus:text-black/80 transition-colors">
                        {m.desc}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Reference Images Preview Row */}
          {imageInputCount > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between text-[11px] text-sidebar-foreground/60 px-0.5">
                <span>Reference Images ({imageInputCount})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addImageInput}
                  disabled={isRunning}
                  className="nodrag h-auto px-1 py-0.5 text-[10px] text-yellow-bg/90 hover:text-yellow-bg hover:bg-transparent cursor-pointer"
                >
                  <Plus size={10} className="mr-0.5" /> Add Image Slot
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#17161a] border border-sidebar-border rounded-sm overflow-x-auto max-h-24 nodrag nowheel custom-scrollbar">
                {Array.from({ length: imageInputCount }, (_, i) => (
                  <ImageSlot key={i} nodeId={props.id} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* System Prompt indicator (if connected) */}
          {connectedSystemPrompt && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#17161a] border border-sidebar-border/80 rounded-sm text-[10px] text-sidebar-foreground/70 truncate">
              <MessageSquare size={11} className="text-[#f1a0fa] shrink-0" />
              <span className="font-medium text-[#f1a0fa] shrink-0">System:</span>
              <span className="truncate">{connectedSystemPrompt}</span>
            </div>
          )}

          {/* Prompt Area or Inline Result Area */}
          {resultText ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-[11px] text-sidebar-foreground/70 px-0.5">
                <span className="font-medium text-yellow-bg flex items-center gap-1">
                  <Sparkles size={11} /> Gemini Response
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="nodrag flex items-center gap-1 text-[10px] text-sidebar-foreground/60 hover:text-yellow-bg cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCheck size={11} className="text-green-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy Markdown
                    </>
                  )}
                </button>
              </div>

              <MarkdownView
                content={resultText}
                className="max-h-80 min-h-28 p-3 bg-[#121115] border border-sidebar-border rounded-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1 mt-1">
              {connectedUserMessage ? (
                <div
                  className="nodrag nowheel custom-scrollbar overscroll-contain p-2.5 bg-[#17161a] border border-sidebar-border rounded-sm max-h-32 overflow-y-auto select-text"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-medium text-sidebar-foreground/50 block mb-1">
                    Connected Prompt
                  </span>
                  <p className="text-[11px] text-sidebar-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {connectedUserMessage}
                  </p>
                </div>
              ) : (
                <Textarea
                  placeholder="Type your prompt here or connect a Text Node to User Message…"
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  disabled={isRunning}
                  className="nodrag nowheel rounded-sm border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground text-xs p-2.5 h-28 focus-visible:ring-0 resize-y"
                />
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-2 bg-red-950/40 border border-red-800/60 rounded text-[11px] text-red-300">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2 mt-1">
            {resultText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResultText(null)}
                disabled={isRunning}
                className="nodrag text-[11px] text-sidebar-foreground/50 hover:text-sidebar-foreground h-auto px-1 py-1"
              >
                Clear Output
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={runModel}
              disabled={isRunning || (!connectedUserMessage && !localPrompt.trim())}
              className={cn(
                "nodrag cursor-pointer h-auto gap-1.5 px-4 py-2.5 text-xs font-medium border-sidebar-border bg-yellow-bg text-black hover:bg-yellow-bg/80 disabled:opacity-40 ml-auto",
                !resultText && "w-full"
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Running Gemini…
                </>
              ) : (
                <>
                  <Play size={11} /> {resultText ? "Re-run" : "Run Model"}
                </>
              )}
            </Button>
          </div>
        </NodeShell>
      )}
    </BaseNode>
  );
}

