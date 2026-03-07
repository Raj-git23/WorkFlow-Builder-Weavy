// components/nodes/CropImgNode.tsx
import { type NodeProps, Position } from "@xyflow/react";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronsUpDown as ChevronsUpDownIcon,
  Check as CheckIcon,
  Link,
  Play,
  Loader2,
  Link2,
  Unlink2,
  Link2Off,
} from "lucide-react";
import { NodeShell } from "@/components/nodes/NodeShell";
import { BaseNode } from "@/components/nodes/BaseNode";
import { PreviewArea } from "@/components/nodes/PreviewArea";
import { CropNodeData, CropRFNode } from "@/types/nodetype";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ASPECT_MAP, ASPECT_RATIOS } from "@/lib/constant";
import { useNodeInput, useFlowStore } from "@/store/useFlowStore";
import Cropper, {
  MediaSize,
  getInitialCropFromCroppedAreaPercentages,
} from "react-easy-crop";
import { Point, Area } from "react-easy-crop";
import { parseAspectRatio, round } from "@/lib/helper";

const FILE_IN_HANDLE = (id: string) => `handle-${id}-file-in`;
const FILE_OUT_HANDLE = (id: string) => `${id}-file-out`;

export function CropImageNode(props: NodeProps<CropRFNode>) {
  const input = useNodeInput(props.id, FILE_IN_HANDLE(props.id));
  const imageUrl = input?.imageUrl;

  const setOutput = useFlowStore((s) => s.setOutput);

  const [aspectRatio, setAspectRatio] = useState(
    props.data.aspectRatio ?? "Custom",
  );

  const [linked, setLinked] = useState<boolean>(true);
  const [comboOpen, setComboOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // react-easy-crop state
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });

  // Track sizes for getInitialCropFromCroppedAreaPercentages
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });
  const [mediaSize, setMediaSize] = useState<MediaSize>({
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });

  // Measure crop container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCropSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Overlay → Inputs: user drags/zooms the crop area
  const onCropComplete = useCallback((areaPercent: Area) => {
    setCroppedArea((prev) => {
      if (
        prev.x === areaPercent.x &&
        prev.y === areaPercent.y &&
        prev.width === areaPercent.width &&
        prev.height === areaPercent.height
      ) {
        return prev; // prevent useless update
      }
      return areaPercent;
    });
  }, []);

  const onMediaLoaded = useCallback((size: MediaSize) => {
    setMediaSize(size);
  }, []);

  // Inputs → Overlay: user types in X/Y/W/H fields
  const updateCropperFromInputs = useCallback(
    (newArea: Area) => {
      if (!mediaSize.width || !cropSize.width) return;

      const { crop: newCrop, zoom: newZoom } =
        getInitialCropFromCroppedAreaPercentages(
          newArea,
          mediaSize,
          0, // rotation
          cropSize,
          1, // minZoom
          3, // maxZoom
        );

      setCrop(newCrop);
      setZoom(newZoom);
      setCroppedArea(newArea);
    },
    [mediaSize, cropSize],
  );

  const handleXChange = (val: number) => {
    const newX = Math.max(0, Math.min(100 - croppedArea.width, val));
    updateCropperFromInputs({ ...croppedArea, x: newX });
  };

  const handleYChange = (val: number) => {
    const newY = Math.max(0, Math.min(100 - croppedArea.height, val));
    updateCropperFromInputs({ ...croppedArea, y: newY });
  };

  const handleWidthChange = (val: number) => {
    const newWidth = Math.max(1, Math.min(100, val));
    const newHeight = linked ? newWidth : croppedArea.height;
    updateCropperFromInputs({ ...croppedArea, width: newWidth, height: newHeight });
  };

  const handleHeightChange = (val: number) => {
    const newHeight = Math.max(1, Math.min(100, val));
    const newWidth = linked ? newHeight : croppedArea.width;
    updateCropperFromInputs({ ...croppedArea, width: newWidth, height: newHeight });
  };

  const handleReset = () => {
    setAspectRatio("Custom");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea({ x: 0, y: 0, width: 100, height: 100 });
  };

  const runCrop = useCallback(async () => {
    if (!imageUrl) return;
    setStatus("running");
    setError(null);

    try {
      const res = await fetch("/api/crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          x: round(croppedArea.x),
          y: round(croppedArea.y),
          width: round(croppedArea.width),
          height: round(croppedArea.height),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Crop failed");

      setResultUrl(data.dataUrl);
      setStatus("done");

      setOutput(props.id, { imageUrl: data.dataUrl }); // Publish result so downstream nodes can use it
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [imageUrl, croppedArea, props.id, setOutput]);

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
      id: FILE_OUT_HANDLE(props.id),
      position: Position.Right,
      type: "source" as const,
      style: { background: "#45a08a" },
    },
  ];

  return (
    <BaseNode<CropNodeData> {...props} handles={handles}>
      {() => (
        <NodeShell title="Crop" className="h-full" nodeId={props?.id}>
          {/* Preview: shows result if cropped, else shows input */}
          <PreviewArea>
            {(resultUrl || imageUrl) && (
              // <img
              //   src={resultUrl ?? imageUrl!}
              //   alt="preview"
              //   className="relative inset-0 w-full h-full object-contain"
              // />
              <div
                ref={containerRef}
                className="nodrag absolute inset-0 top-0 left-0 right-0"
              >
                <Cropper
                  image={resultUrl ?? imageUrl!}
                  crop={crop}
                  zoom={zoom}
                  aspect={ASPECT_MAP[aspectRatio] ?? undefined}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onMediaLoaded={onMediaLoaded}
                  style={{
                    containerStyle: { backgroundColor: "transparent" },
                    cropAreaStyle: { border: "2px dashed #f7ffa8" },
                  }}
                  onZoomChange={setZoom}
                />
              </div>
            )}

            {status === "running" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}
          </PreviewArea>

          {/* Aspect ratio */}
          <div className="flex items-center gap-2 mt-1">
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
                          onSelect={(val) => {
                            setAspectRatio(val);
                            setComboOpen(false);
                          }}
                          className="text-[11px] text-sidebar-foreground hover:bg-white/5 cursor-pointer"
                        >
                          {ratio}
                          <CheckIcon
                            size={11}
                            className={cn(
                              "ml-auto",
                              aspectRatio === ratio
                                ? "opacity-100"
                                : "opacity-0",
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

          {/* Crop params: x, y, w, h all in % */}
          <div className="flex flex-col items-center gap-2 w-full border-b border-button-hover pb-2">
            <div className="flex gap-2 w-full">
              <span className="text-sidebar-foreground/80 text-xs mt-1.5 shrink-0">
                Crop %
              </span>

              {[
                { label: "X", value: croppedArea.x, set: handleXChange },
                { label: "Y", value: croppedArea.y, set: handleYChange },
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
                    value={value.toFixed(0)}
                    onChange={(e) => set(Number(e.target.value))}
                    className="nodrag px-3 py-2! text-xs border-sidebar-border bg-[#1c1b1f] text-sidebar-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-start gap-2 w-full">
              <span className="text-sidebar-foreground/80 text-xs mt-1.5 shrink-0">
                Dimension %
              </span>
              {[
                { label: "W", value: croppedArea.width, set: handleWidthChange },
                {
                  label: "H",
                  value: croppedArea.height,
                  set: handleHeightChange,
                },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-2 w-full">
                  <span className="text-sidebar-foreground/40 text-[10px]">
                    {label}
                  </span>
                  <Input
                    id={label}
                    type="number"
                    min={0}
                    max={100}
                    value={value.toFixed(0)}
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
                    : "text-sidebar-foreground/30",
                )}
              >
                {linked ? <Link2 size={12} /> : <Link2Off size={12} />}
              </Button>
            </div>

            {/* Error */}
            {error && <p className="text-[11px] text-red-400">{error}</p>}
          </div>

          {/* Run button */}
          <Button
            variant="outline"
            size="sm"
            onClick={runCrop}
            disabled={!imageUrl || status === "running"}
            className="nodrag w-full rounded-sm gap-1.5 text-sm border-sidebar-border bg-yellow-bg py-5 text-black hover:bg-yellow-bg/80 hover:text-black disabled:opacity-40"
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

