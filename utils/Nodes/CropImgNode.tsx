// utils/Nodes/CropImgNode.tsx
import { type NodeProps, Position } from "@xyflow/react";
import { useState, useCallback } from "react";
import { ChevronsUpDown as ChevronsUpDownIcon, Check as CheckIcon, Link, Play, Loader2 } from "lucide-react";
import { NodeShell } from "./NodeShell";
import { BaseNode } from "../BaseNode";
import { PreviewArea } from "@/components/PreviewArea";
import { CropNodeData, CropRFNode } from "@/types/nodetype";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS } from "@/lib/assets";
import { useNodeInput, useFlowStore } from "@/store/useflowstore";


const FILE_IN_HANDLE = (id: string) => `handle-${id}-file-in`;
const FILE_OUT_HANDLE = (id: string) => `${id}-file-out`;

export function CropImageNode(props: NodeProps<CropRFNode>) {
  const input = useNodeInput(props.id, FILE_IN_HANDLE(props.id));
  const imageUrl = input?.imageUrl;

  const setOutput = useFlowStore((s) => s.setOutput);

  const [aspectRatio, setAspectRatio] = useState(props.data.aspectRatio ?? "Custom");
  const [width, setWidth] = useState(props.data.width ?? 100);   // % values
  const [height, setHeight] = useState(props.data.height ?? 100);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [linked, setLinked] = useState(true);
  const [comboOpen, setComboOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWidthChange = (val: number) => { setWidth(val); if (linked) setHeight(val); };
  const handleHeightChange = (val: number) => { setHeight(val); if (linked) setWidth(val); };
  const handleReset = () => { setAspectRatio("Custom"); setWidth(100); setHeight(100); setX(0); setY(0); };

  const runCrop = useCallback(async () => {
    if (!imageUrl) return;
    setStatus("running");
    setError(null);

    try {
      const res = await fetch("/api/crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, x, y, width, height }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Crop failed");

      setResultUrl(data.dataUrl);
      setStatus("done");
      // Publish result so downstream nodes can use it
      setOutput(props.id, { imageUrl: data.dataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [imageUrl, x, y, width, height, props.id, setOutput]);

  const handles = [
    { text: "File*", id: `${props.id}-file-in`, position: Position.Left, type: "target" as const },
    { text: "File", id: FILE_OUT_HANDLE(props.id), position: Position.Right, type: "source" as const },
  ];

  return (
    <BaseNode<CropNodeData> {...props} handles={handles}>
      {() => (
        <NodeShell title="Crop" className="h-full" nodeId={props?.id}>

          {/* Preview: shows result if cropped, else shows input */}
          <PreviewArea>
            {(resultUrl || imageUrl) && (
              <img
                src={resultUrl ?? imageUrl!}
                alt="preview"
                className="relative inset-0 w-full h-full object-contain"
              />
            )}
            {status === "running" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}
          </PreviewArea>

          {/* Aspect ratio */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sidebar-foreground/80 text-xs w-20 shrink-0">Aspect ratio</span>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={comboOpen}
                  className="nodrag flex-1 justify-between border-sidebar-border bg-[#1c1b1f] px-2 py-1 h-auto text-[11px] text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-foreground">
                  {aspectRatio}
                  <ChevronsUpDownIcon size={11} className="ml-auto opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-0 border-sidebar-border bg-sidebar-background">
                <Command className="bg-transparent">
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-[11px] text-sidebar-foreground/50">No ratio found.</CommandEmpty>
                    <CommandGroup>
                      {ASPECT_RATIOS.map((ratio) => (
                        <CommandItem key={ratio} value={ratio}
                          onSelect={(val) => { setAspectRatio(val); setComboOpen(false); }}
                          className="text-[11px] text-sidebar-foreground hover:bg-white/5 cursor-pointer">
                          {ratio}
                          <CheckIcon size={11} className={cn("ml-auto", aspectRatio === ratio ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={handleReset}
              className="nodrag h-auto px-2 py-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-transparent shrink-0">
              Reset
            </Button>
          </div>

          {/* Crop params: x, y, w, h all in % */}
          <div className="flex items-center gap-2 border-b border-button-hover pb-2">
            {/* <span className="text-sidebar-foreground/60 text-[11px] w-20 shrink-0">Crop %</span> */}
            
            <div className="flex flex-col items-center gap-1.5 flex-1 flex-wrap w-full">
              
              <span className="text-sidebar-foreground/80 text-xs mt-1.5 w-full shrink-0">Crop %</span>

              <div className="flex justify-center gap-3 w-full">

                {[
                  { label: "X", value: x, set: setX },
                  { label: "Y", value: y, set: setY },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center w-full gap-2">
                    <span className="text-sidebar-foreground/40 text-[10px]">{label}</span>
                    <Input type="number" min={0} max={100} value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="nodrag w-full px-3 !py-2 text-xs border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                ))}
              </div>


              <span className="text-sidebar-foreground/80 text-xs w-full mt-1.5 shrink-0">Dimension %</span>

              <div className="flex justify-center w-full gap-2">
                {[
                  { label: "W", value: width, set: handleWidthChange },
                  { label: "H", value: height, set: handleHeightChange },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center gap-2 w-full">
                    <span className="text-sidebar-foreground/40 text-[10px]">{label}</span>
                    <Input type="number" min={0} max={100} value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="nodrag w-full h-auto px-1.5 py-1 border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                ))}

                <Button variant="ghost" size="icon" onClick={() => setLinked((l) => !l)} title="Lock W/H ratio"
                  className={cn("nodrag h-auto w-auto p-2 hover:bg-button-hover hover:text-sidebar-foreground",
                    linked ? "text-sidebar-foreground" : "text-sidebar-foreground/30")}>
                  <Link size={12} />
                </Button>
              </div>
            </div>
            
            {/* Error */}
            {error && <p className="text-[11px] text-red-400">{error}</p>}

          </div>


          {/* Run button */}
          <Button variant="outline" size="sm" onClick={runCrop}
            disabled={!imageUrl || status === "running"}
            className="nodrag w-full rounded-sm gap-1.5 text-sm border-sidebar-border bg-yellow-bg py-5 text-black hover:bg-yellow-bg/80 hover:text-black disabled:opacity-40">
            {status === "running"
              ? <><Loader2 size={11} className="animate-spin" /> Cropping…</>
              : <><Play size={12} /> Crop Image</>}
          </Button>
        </NodeShell>
      )}
    </BaseNode>
  );
}