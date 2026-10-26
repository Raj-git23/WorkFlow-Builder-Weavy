import { useState, useCallback, useRef, useEffect } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { Play, Loader2 } from "lucide-react";
import { NodeShell } from "@/components/nodes/NodeShell";
import { BaseNode } from "@/components/nodes/BaseNode";
import { PreviewArea } from "@/components/nodes/PreviewArea";
import { ExtractFrameNodeData, ExtractFrameRFNode } from "@/types/nodetype";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { secondsToTimecode, timecodeToSeconds, frameToTimecode } from "@/lib/helper";
import { useFlowStore, useNodeInput, useIsNodeRunning } from "@/store/useFlowStore";

const VIDEO_IN_HANDLE = (id: string) => `${id}-video-in`;
const TIMESTAMP_IN_HANDLE = (id: string) => `${id}-timestamp-in`;
const FRAME_OUT_HANDLE = (id: string) => `${id}-frame-out`;

export function ExtractFrameNode(props: NodeProps<ExtractFrameRFNode>) {
  const input = useNodeInput(props.id, VIDEO_IN_HANDLE(props.id));
  const videoUrl = input?.videoUrl;

  const timestampInput = useNodeInput(props.id, TIMESTAMP_IN_HANDLE(props.id));
  const connectedTimestamp = timestampInput?.text;

  const setOutput = useFlowStore((s) => s.setOutput);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const durationRef = useRef<number>(0);

  const initialFrame = props.data.frame ?? 0;
  const [frame, setFrame] = useState<number>(initialFrame);
  const [timecode, setTimecode] = useState<string>(frameToTimecode(initialFrame));

  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seek video element to target seconds safely
  const seekVideoPlayer = useCallback((seconds: number) => {
    if (videoRef.current && Number.isFinite(seconds)) {
      try {
        videoRef.current.currentTime = seconds;
      } catch {
        // Handle unseekable media gracefully
      }
    }
  }, []);

  // When video metadata is loaded, record duration
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = e.currentTarget.duration;
    if (Number.isFinite(dur) && dur > 0) {
      durationRef.current = dur;
    }
  };

  // When user seeks or plays the video directly on the preview player
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const currentTime = e.currentTarget.currentTime;
    if (!Number.isFinite(currentTime)) return;

    const currentFrame = Math.floor(currentTime * 30);
    setFrame(currentFrame);
    setTimecode(secondsToTimecode(currentTime));
  };

  // Handle editing Frame input with duration clamping
  const handleFrameChange = (val: number) => {
    const rawFrame = Math.max(0, val || 0);
    let targetSec = rawFrame / 30;

    // Clamp to video duration if duration is available
    if (durationRef.current > 0 && targetSec > durationRef.current) {
      targetSec = durationRef.current;
      const maxFrame = Math.floor(durationRef.current * 30);
      setFrame(maxFrame);
      setTimecode(secondsToTimecode(targetSec));
      seekVideoPlayer(targetSec);
      return;
    }

    setFrame(rawFrame);
    setTimecode(secondsToTimecode(targetSec));
    seekVideoPlayer(targetSec);
  };

  // Handle editing Timecode input (HH:MM:SS format) with duration clamping
  const handleTimecodeChange = (val: string) => {
    setTimecode(val);
    let targetSec = timecodeToSeconds(val);

    // Clamp to video duration if duration is available
    if (durationRef.current > 0 && targetSec > durationRef.current) {
      targetSec = durationRef.current;
      const clampedTc = secondsToTimecode(targetSec);
      setTimecode(clampedTc);
      const maxFrame = Math.floor(targetSec * 30);
      setFrame(maxFrame);
      seekVideoPlayer(targetSec);
      return;
    }

    const calculatedFrame = Math.floor(targetSec * 30);
    setFrame(calculatedFrame);
    seekVideoPlayer(targetSec);
  };

  const runExtract = useCallback(async () => {
    if (!videoUrl) return;
    setStatus("running");
    setError(null);

    try {
      let timestampInSeconds = (frame || 0) / 30;

      // If connected to an upstream timestamp node (e.g. Text node with "50%" or seconds)
      if (connectedTimestamp) {
        const trimmed = connectedTimestamp.trim();
        if (trimmed.endsWith("%")) {
          const pct = parseFloat(trimmed) / 100;
          if (durationRef.current > 0) {
            timestampInSeconds = durationRef.current * pct;
          }
        } else {
          const val = parseFloat(trimmed);
          if (!isNaN(val)) timestampInSeconds = val;
        }
      } else if (durationRef.current > 0 && timestampInSeconds > durationRef.current) {
        // Clamp timestamp to video duration if known
        timestampInSeconds = durationRef.current;
      }

      const res = await fetch("/api/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          timestamp: timestampInSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extract failed");

      const finalUrl = data.url || data.dataUrl;
      setFrameUrl(data.dataUrl || finalUrl);
      setStatus("done");
      setOutput(props.id, { imageUrl: finalUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [videoUrl, frame, connectedTimestamp, props.id, setOutput]);

  const handles = [
    {
      text: "Video*",
      id: VIDEO_IN_HANDLE(props.id),
      position: Position.Left,
      type: "target" as const,
      style: { background: "#ea8362" },
    },
    {
      text: "Timestamp",
      id: TIMESTAMP_IN_HANDLE(props.id),
      position: Position.Left,
      type: "target" as const,
      style: { top: "82%", background: "#f1a0fa" },
    },
    {
      text: "Frame",
      id: FRAME_OUT_HANDLE(props.id),
      position: Position.Right,
      type: "source" as const,
      style: { background: "#45a08a" },
    },
  ];

  const isGloballyRunning = useIsNodeRunning(props.id);
  const isRunning = status === "running" || isGloballyRunning;

  const nodeOutput = useFlowStore((s) => s.outputs[props.id]);
  useEffect(() => {
    if (nodeOutput?.imageUrl && nodeOutput.imageUrl !== frameUrl) {
      setFrameUrl(nodeOutput.imageUrl);
      setStatus("done");
    }
  }, [nodeOutput?.imageUrl, frameUrl]);

  return (
    <BaseNode<ExtractFrameNodeData> {...props} handles={handles}>
      {({ selected }) => (
        <NodeShell
          title="Extract Video Frame"
          className={cn(
            "h-auto w-84 transition-all duration-300",
            isRunning &&
              "animate-pulse ring-2 ring-yellow-bg shadow-[0_0_30px_rgba(247,255,168,0.4)] border-yellow-bg"
          )}
          nodeId={props?.id}
          selected={selected ?? props.selected}
        >
          {/* Preview: video input OR extracted frame (Full width without letterboxing side bars) */}
          <PreviewArea adaptive={Boolean(frameUrl || videoUrl)} className="relative overflow-hidden rounded-sm w-full">
            {frameUrl ? (
              <img
                src={frameUrl}
                alt="extracted frame"
                className="block w-full h-auto rounded-xs"
              />
            ) : videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleVideoTimeUpdate}
                onSeeked={handleVideoTimeUpdate}
                className="block w-full h-auto rounded-xs"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center text-xs text-sidebar-foreground/40 p-4 text-center">
                Connect a video node to preview
              </div>
            )}
            {isRunning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}
          </PreviewArea>

          {/* Bidirectional Frame & Timecode Controls (HH:MM:SS format) */}
          {connectedTimestamp ? (
            <div className="flex w-full items-center justify-between gap-2 mt-2 border-b border-button-hover pb-2 px-1">
              <span className="text-[#f1a0fa] font-medium text-[11px]">Timestamp (Connected):</span>
              <span className="font-mono text-sidebar-foreground bg-[#1c1b1f] px-2.5 py-1 rounded-sm border border-sidebar-border text-xs">
                {connectedTimestamp}
              </span>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2 mt-2 border-b border-button-hover pb-2">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-sidebar-foreground font-medium text-xs shrink-0">
                  Frame
                </span>
                <Input
                  type="number"
                  min={0}
                  value={frame}
                  onChange={(e) => handleFrameChange(Number(e.target.value))}
                  disabled={isRunning}
                  className="nodrag w-full rounded-sm text-xs px-2 py-1 h-auto border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-sidebar-foreground/90 font-medium text-xs shrink-0">
                  Timecode
                </span>
                <Input
                  type="text"
                  placeholder="00:00:00"
                  value={timecode}
                  onChange={(e) => handleTimecodeChange(e.target.value)}
                  disabled={isRunning}
                  className="nodrag w-full rounded-sm text-xs px-2 py-1 h-auto font-mono border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}

          {/* Run Extract Button */}
          <Button
            variant="yellowButton"
            size="sm"
            onClick={runExtract}
            disabled={!videoUrl || isRunning}
            className="nodrag w-full gap-1.5 text-sm py-5 font-semibold mt-2 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Extracting…
              </>
            ) : (
              <>
                <Play size={12} /> Extract Frame
              </>
            )}
          </Button>
        </NodeShell>
      )}
    </BaseNode>
  );
}
