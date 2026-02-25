// utils/Nodes/ExtractFrameNode.tsx
import { useState, useCallback } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { Play, Loader2 } from "lucide-react";
import { NodeShell } from "./NodeShell";
import { BaseNode } from "../BaseNode";
import { PreviewArea } from "@/components/PreviewArea";
import { ExtractFrameNodeData, ExtractFrameRFNode } from "@/types/nodetype";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { frameToTimecode } from "@/lib/helper";
import { useNodeInput, useFlowStore } from "@/store/useflowstore";

const VIDEO_IN_HANDLE = (id: string) => `handle-${id}-video-in`;
const FRAME_OUT_HANDLE = (id: string) => `${id}-frame-out`;

export function ExtractFrameNode(props: NodeProps<ExtractFrameRFNode>) {
  const input = useNodeInput(props.id, VIDEO_IN_HANDLE(props.id));
  const videoUrl = input?.videoUrl;

  const setOutput = useFlowStore((s) => s.setOutput);

  const [frame, setFrame] = useState(props.data.frame ?? 0);
  const [usePercent, setUsePercent] = useState(false);   // toggle: seconds vs %
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExtract = useCallback(async () => {
    if (!videoUrl) return;
    setStatus("running");
    setError(null);

    try {
      const res = await fetch("/api/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          timestamp: usePercent ? 0 : frame,
          percentage: usePercent ? percent : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extract failed");

      setFrameUrl(data.dataUrl);
      setStatus("done");
      // Publish the extracted frame as an image for downstream nodes (e.g. LLM)
      setOutput(props.id, { imageUrl: data.dataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [videoUrl, frame, percent, usePercent, props.id, setOutput]);

  const handles = [
    { text: "Video", id: `${props.id}-video-in`, position: Position.Left, type: "target" as const, style: {background: '#45a08a'} },
    { text: "Frame", id: FRAME_OUT_HANDLE(props.id), position: Position.Right, type: "source" as const, style: {background: '#45a08a'} },
  ];

  return (
    <BaseNode<ExtractFrameNodeData> {...props} handles={handles}>
      {() => (
        <NodeShell title="Extract Video Frame" className="h-auto" nodeId={props?.id}>

          {/* Preview: video input OR extracted frame */}
          <PreviewArea>
            {frameUrl ? (
              <img src={frameUrl} alt="extracted frame" className="absolute inset-0 w-full h-full object-cover" />
            ) : videoUrl ? (
              <video src={videoUrl} controls className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
            {status === "running" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}
          </PreviewArea>

          {/* Controls */}
          <div className="flex w-full items-center gap-3 mt-1 border-b border-button-hover pb-1">

            {/* Toggle: frame / percent */}
            {/* <Button variant="ghost" size="sm" onClick={() => setUsePercent((p) => !p)}
              className="nodrag h-auto px-2 py-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-transparent shrink-0">
              {usePercent ? "%" : "frame"}
            </Button> */}

            {/* {usePercent ? (
              <div className="flex items-center gap-2">
                <span className="text-sidebar-foreground font-medium text-xs shrink-0">% of duration</span>
                <Input type="number" min={0} max={100} value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="nodrag w-16 rounded-sm !text-xs !px-2 !h-auto border-sidebar-border text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
              </div>
            ) : (
              <> */}
                <div className="flex w-full items-center gap-2">
                  <span className="text-sidebar-foreground font-medium text-xs shrink-0">Frame</span>
                  <Input type="number" min={0} value={frame}
                    onChange={(e) => setFrame(Number(e.target.value))}
                    className="nodrag w-10/12 rounded-sm !text-xs !px-2 !h-auto border-sidebar-border text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                </div>
                <div className="flex w-full items-center gap-2">
                  <span className="text-sidebar-foreground font-medium text-xs shrink-0">Timecode</span>
                  <span className="text-xs text-sidebar-foreground/60 font-mono tabular-nums">
                    {frameToTimecode(frame)}
                  </span>
                </div>
              {/* </>
            )} */}
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          
          </div>


          {/* Run */}
          <Button variant="outline" size="sm" onClick={runExtract}
            disabled={!videoUrl || status === "running"}
            className="nodrag w-full gap-1.5 text-sm border-sidebar-border py-5 bg-yellow-bg text-black hover:bg-yellow-bg/80 hover:text-black disabled:opacity-40">
            {status === "running"
              ? <><Loader2 size={11} className="animate-spin" /> Extracting…</>
              : <><Play size={12} /> Extract Frame</>}
          </Button>
        </NodeShell>
      )}
    </BaseNode>
  );
}