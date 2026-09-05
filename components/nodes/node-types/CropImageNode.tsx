// components/nodes/CropImgNode.tsx
import { type NodeProps, Position } from "@xyflow/react";
import { useState, useCallback, useRef } from "react";
import { ChevronsUpDown as ChevronsUpDownIcon, Check as CheckIcon, Play, Loader2, Link2, Link2Off } from "lucide-react";
import { NodeShell } from "@/components/nodes/NodeShell";
import { BaseNode } from "@/components/nodes/BaseNode";
import { PreviewArea } from "@/components/nodes/PreviewArea";
import { CropNodeData, CropRFNode } from "@/types/nodetype";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ASPECT_MAP, ASPECT_RATIOS } from "@/lib/constant";
import { round } from "@/lib/helper";
import { useFlowStore, useNodeInput } from "@/store/useFlowStore";
import ReactCrop, { type Crop as ReactCropType } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export function CropImageNode(props: NodeProps<CropRFNode>) {
  // Retrieve upstream node output connected to input handle
  const input = useNodeInput(props.id, "file-in");
  const imageUrl = input?.imageUrl;

  const setOutput = useFlowStore((s) => s.setOutput);

  const [aspectRatio, setAspectRatio] = useState(
    props.data.aspectRatio ?? "Custom"
  );

  const [linked, setLinked] = useState<boolean>(true);
  const [comboOpen, setComboOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Percentage crop state (0 to 100)
  const [crop, setCrop] = useState<ReactCropType>({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });

  const [naturalDimensions, setNaturalDimensions] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  const aspectNum = ASPECT_MAP[aspectRatio];
  const activeImage = resultUrl ?? imageUrl;

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalDimensions({ w: naturalWidth, h: naturalHeight });
  };

  // Handle aspect ratio dropdown selection
  const handleAspectSelect = (val: string) => {
    setAspectRatio(val);
    setComboOpen(false);
    const newAspect = ASPECT_MAP[val];
    if (newAspect) {
      // Calculate a centered initial crop for the selected aspect ratio
      const width = 80;
      const height = Math.min(100, 80 / newAspect);
      const x = (100 - width) / 2;
      const y = (100 - height) / 2;
      setCrop({ unit: "%", x, y, width, height });
    } else {
      // Custom mode: full image freeform selection
      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
    }
  };

  const handleCropChange = (c: ReactCropType, percentCrop: ReactCropType) => {
    setCrop(percentCrop);
  };

  const handleXChange = (val: number) => {
    const safeX = Math.max(0, Math.min(100 - (crop.width || 0), val));
    setCrop((prev) => ({ ...prev, unit: "%", x: safeX }));
  };

  const handleYChange = (val: number) => {
    const safeY = Math.max(0, Math.min(100 - (crop.height || 0), val));
    setCrop((prev) => ({ ...prev, unit: "%", y: safeY }));
  };

  const handleWidthChange = (val: number) => {
    const safeW = Math.max(1, Math.min(100, val));
    const safeH = linked && aspectNum ? Math.min(100, safeW / aspectNum) : (crop.height || 100);
    setCrop((prev) => ({ ...prev, unit: "%", width: safeW, height: safeH }));
  };

  const handleHeightChange = (val: number) => {
    const safeH = Math.max(1, Math.min(100, val));
    const safeW = linked && aspectNum ? Math.min(100, safeH * aspectNum) : (crop.width || 100);
    setCrop((prev) => ({ ...prev, unit: "%", height: safeH, width: safeW }));
  };

  const handleReset = () => {
    setAspectRatio("Custom");
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
  };

  const runCrop = useCallback(async () => {
    if (!activeImage) return;
    setStatus("running");
    setError(null);

    try {
      const res = await fetch("/api/crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: activeImage,
          x: round(crop.x || 0),
          y: round(crop.y || 0),
          width: round(crop.width || 100),
          height: round(crop.height || 100),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Crop failed");

      setResultUrl(data.dataUrl);
      setStatus("done");

      setOutput(props.id, { imageUrl: data.dataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [activeImage, crop, props.id, setOutput]);

  const handles = [
    {
      text: "File*",
      id: `${props.id}-file-in`,
      position: Position.Left,
      type: "target" as const,
      style: { background: "#45a08a" },
    },
    {
      text: "File",
      id: `${props.id}-file-out`,
      position: Position.Right,
      type: "source" as const,
      style: { background: "#45a08a" },
    },
  ];

  return (
    <BaseNode<CropNodeData> {...props} handles={handles}>
      {({ selected }) => (
        <NodeShell
          title="Crop"
          className="h-auto w-84"
          nodeId={props?.id}
          selected={selected ?? props.selected}
        >
          {/* Preview Area */}
          <PreviewArea
            adaptive={Boolean(activeImage)}
            className="relative overflow-hidden rounded-none w-full"
          >
            {activeImage ? (
              <div className="nodrag w-full h-auto overflow-hidden rounded-none">
                <ReactCrop
                  crop={crop}
                  onChange={handleCropChange}
                  aspect={aspectNum}
                  className="w-full"
                >
                  <img
                    src={activeImage}
                    alt="crop input"
                    onLoad={onImageLoad}
                    className="w-full h-auto block rounded-none max-h-[460px] object-contain"
                  />
                </ReactCrop>
              </div>
            ) : (
              <div className="flex h-48 w-full items-center justify-center text-xs text-sidebar-foreground/50 p-4 text-center">
                Connect an image node to preview
              </div>
            )}

            {status === "running" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}
          </PreviewArea>

          {/* Aspect ratio selector */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sidebar-foreground/80 text-xs w-20 shrink-0">
              Aspect ratio
            </span>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="nodrag flex-1 justify-between border-sidebar-border bg-[#1c1b1f] p-2 h-auto text-xs text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-foreground"
                >
                  {aspectRatio}
                  <ChevronsUpDownIcon
                    size={11}
                    className="ml-auto opacity-50 shrink-0"
                  />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-40 p-0 border-sidebar-border bg-sidebar-background">
                <Command className="bg-transparent">
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-[11px] text-sidebar-foreground/50">
                      No ratio found.
                    </CommandEmpty>
                    <CommandGroup>
                      {ASPECT_RATIOS?.map((ratio) => (
                        <CommandItem
                          key={ratio}
                          value={ratio}
                          onSelect={handleAspectSelect}
                          className="text-[11px] text-sidebar-foreground hover:bg-white/5 cursor-pointer"
                        >
                          {ratio}
                          <CheckIcon
                            size={11}
                            className={cn(
                              "ml-auto",
                              aspectRatio === ratio
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="nodrag h-auto px-2 py-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-transparent shrink-0"
            >
              Reset
            </Button>
          </div>

          {/* Crop params: X, Y, W, H */}
          <div className="flex flex-col items-center gap-2 w-full border-b border-button-hover pb-2 mt-2">
            <div className="flex gap-2 w-full">
              <span className="text-sidebar-foreground/80 text-xs mt-1.5 shrink-0">
                Crop %
              </span>

              {[
                { label: "X", value: crop.x || 0, set: handleXChange },
                { label: "Y", value: crop.y || 0, set: handleYChange },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-sidebar-foreground/40 text-[10px]">
                    {label}
                  </span>
                  <Input
                    id={label}
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(value)}
                    onChange={(e) => set(Number(e.target.value))}
                    className="nodrag px-2.5 py-1 text-xs border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-start gap-2 w-full">
              <span className="text-sidebar-foreground/80 text-xs mt-1.5 shrink-0">
                Dimension %
              </span>
              {[
                { label: "W", value: crop.width || 100, set: handleWidthChange },
                { label: "H", value: crop.height || 100, set: handleHeightChange },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-2 w-full">
                  <span className="text-sidebar-foreground/40 text-[10px]">
                    {label}
                  </span>
                  <Input
                    id={label}
                    type="number"
                    min={1}
                    max={100}
                    value={Math.round(value)}
                    onChange={(e) => set(Number(e.target.value))}
                    className="nodrag h-auto px-1.5 py-1 border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              ))}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLinked((link) => !link)}
                title="Lock W/H ratio"
                className={cn(
                  "nodrag h-auto w-auto p-2 hover:bg-button-hover hover:cursor-pointer hover:text-sidebar-foreground ml-auto",
                  linked
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/30"
                )}
              >
                {linked ? <Link2 size={12} /> : <Link2Off size={12} />}
              </Button>
            </div>

            {/* Error message */}
            {error && <p className="text-[11px] text-red-400">{error}</p>}
          </div>

          {/* Run button */}
          <Button
            variant="outline"
            size="sm"
            onClick={runCrop}
            disabled={!activeImage || status === "running"}
            className="nodrag w-full rounded-sm gap-1.5 text-sm border-sidebar-border bg-yellow-bg py-5 text-black hover:bg-yellow-bg/80 hover:text-black disabled:opacity-40 mt-2"
          >
            {status === "running" ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Cropping…
              </>
            ) : (
              <>
                <Play size={12} /> Crop Image
              </>
            )}
          </Button>
        </NodeShell>
      )}
    </BaseNode>
  );
}
