// components/nodes/UploadNode.tsx
import { useCallback, useState, useRef, useEffect } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { Upload, Loader2, AlertCircle, X, RotateCcw, Image as ImageIcon, Film } from "lucide-react";
import { NodeShell } from "@/components/nodes/NodeShell";
import { PreviewArea } from "@/components/nodes/PreviewArea";
import { BaseNode } from "@/components/nodes/BaseNode";
import { UploadImageRFNode, UploadNodeData, UploadVideoRFNode } from "@/types/nodetype";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCEPT } from "@/lib/constant";
import { useFlowStore } from "@/store/useFlowStore";
import { useTransloaditUpload } from "@/lib/useTransloaditUpload";
import { validateFile, validateUrl, extractFileName } from "@/lib/fileValidation";

function UploadContent({
  nodeId,
  fileType,
  savedUrl,
}: {
  nodeId: string;
  fileType: "image" | "video";
  savedUrl?: string;
}) {
  const setOutput = useFlowStore((s) => s.setOutput);
  const { upload, status, error: uploadError, reset } = useTransloaditUpload(fileType);

  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(savedUrl);
  const [fileName, setFileName] = useState<string | undefined>(
    savedUrl ? extractFileName(savedUrl) : undefined
  );
  const [linkValue, setLinkValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // References for cleanup and retry handling
  const objectUrlRef = useRef<string | null>(null);
  const lastInputRef = useRef<File | string | null>(null);

  const isUploading = status === "uploading";

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Publish final URL to flow store
  const publishUrl = useCallback(
    (url: string, name?: string) => {
      setPreviewUrl(url);
      if (name) setFileName(name);
      setOutput(
        nodeId,
        fileType === "image" ? { imageUrl: url } : { videoUrl: url }
      );
    },
    [nodeId, fileType, setOutput]
  );

  const processFile = useCallback(
    async (file: File) => {
      if (isUploading) return;

      setValidationError(null);

      // 1. Validate file format and size
      const validation = validateFile(file, fileType);
      if (!validation.valid) {
        setValidationError(validation.error || "File validation failed");
        return;
      }

      lastInputRef.current = file;

      // 2. Create local object URL for instant preview
      revokeObjectUrl();
      const localUrl = URL.createObjectURL(file);
      objectUrlRef.current = localUrl;
      setPreviewUrl(localUrl);
      setFileName(file.name);

      // 3. Upload file via Transloadit
      const result = await upload(file);
      if (result) {
        revokeObjectUrl();
        publishUrl(result.url, result.name || file.name);
      }
    },
    [isUploading, fileType, revokeObjectUrl, upload, publishUrl]
  );

  const processUrl = useCallback(
    async (rawUrl: string) => {
      if (isUploading) return;

      setValidationError(null);

      // 1. Validate URL string
      const validation = validateUrl(rawUrl, fileType);
      if (!validation.valid) {
        setValidationError(validation.error || "Invalid URL");
        return;
      }

      lastInputRef.current = rawUrl;
      revokeObjectUrl();

      const initialName = extractFileName(rawUrl);
      setPreviewUrl(rawUrl);
      setFileName(initialName);

      // 2. Process URL through Transloadit server route
      const result = await upload(rawUrl);
      if (result) {
        publishUrl(result.url, result.name || initialName);
      }
    },
    [isUploading, fileType, revokeObjectUrl, upload, publishUrl]
  );

  const handleRetry = useCallback(() => {
    if (!lastInputRef.current || isUploading) return;
    if (typeof lastInputRef.current === "string") {
      processUrl(lastInputRef.current);
    } else {
      processFile(lastInputRef.current);
    }
  }, [isUploading, processUrl, processFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (isUploading) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [isUploading, processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isUploading) return;
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [isUploading, processFile]
  );

  const handleLinkSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const rawUrl = linkValue.trim();
      if (!rawUrl) return;

      processUrl(rawUrl);
      setLinkValue("");
    },
    [linkValue, processUrl]
  );

  const handleClear = useCallback(() => {
    revokeObjectUrl();
    lastInputRef.current = null;
    setPreviewUrl(undefined);
    setFileName(undefined);
    setValidationError(null);
    setLinkValue("");
    setOutput(nodeId, {});
    reset();
  }, [nodeId, revokeObjectUrl, setOutput, reset]);

  const currentError = validationError || uploadError;
  const IconComponent = fileType === "image" ? ImageIcon : Film;

  return (
    <>
      {previewUrl ? (
        <PreviewArea adaptive className="relative group overflow-hidden rounded-sm">
          {/* Top-right Clear (X) button */}
          {!isUploading && (
            <button
              type="button"
              onClick={handleClear}
              title="Remove file"
              className="nodrag absolute top-2 right-2 z-20 rounded-full bg-black/70 p-1 text-white/80 hover:text-white hover:bg-black transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}

          {/* Uploading progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[1px]">
              <Loader2 size={20} className="animate-spin text-white" />
              <span className="text-xs text-white font-medium">Uploading...</span>
            </div>
          )}

          {/* Media Preview (No letterboxing checkered bars on video) */}
          {fileType === "image" ? (
            <img
              src={previewUrl}
              alt={fileName || "Image preview"}
              className="block w-full h-auto max-h-[460px] object-contain rounded-xs"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              className="block w-full h-auto rounded-xs"
            />
          )}
        </PreviewArea>
      ) : (
        <PreviewArea>
          <label
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors nodrag",
              dragging ? "bg-white/10" : "bg-transparent",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="sr-only"
              accept={ACCEPT[fileType]}
              onChange={handleFileInput}
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 size={20} className="animate-spin text-sidebar-foreground/70" />
            ) : (
              <Upload size={20} className="text-sidebar-foreground/60" />
            )}
            <span className="text-sidebar-foreground/70 text-[11px]">
              {isUploading ? "Processing…" : "Drag & drop or click to upload"}
            </span>
          </label>
        </PreviewArea>
      )}

      {/* Error message and retry button */}
      {currentError && (
        <div className="flex items-center justify-between gap-1.5 text-[11px] text-red-400 mt-1 px-1">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{currentError}</span>
          </div>
          {status === "error" && lastInputRef.current && !isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="nodrag h-auto px-1.5 py-0.5 text-[10px] text-red-300 hover:text-red-100 hover:bg-red-950/50 shrink-0"
            >
              <RotateCcw size={10} className="mr-1" /> Retry
            </Button>
          )}
        </div>
      )}

      {/* Bottom Bar: Show file name when preview exists; otherwise show link input */}
      {previewUrl ? (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1c1b1f] border border-sidebar-border rounded-sm text-xs text-sidebar-foreground/90 mt-1 truncate">
          <IconComponent size={14} className="shrink-0 text-sidebar-foreground/60" />
          <span className="truncate flex-1 font-mono text-[11px]" title={fileName}>
            {fileName || "Uploaded file"}
          </span>
        </div>
      ) : (
        <Input
          type="url"
          placeholder="Paste a file link"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          onKeyDown={handleLinkSubmit}
          disabled={isUploading}
          className="nodrag w-full text-[11px] font-medium rounded-sm border border-sidebar-border mt-1"
        />
      )}
    </>
  );
}

// Upload Image Node
export function UploadImageNode(props: NodeProps<UploadImageRFNode>) {
  return (
    <BaseNode<UploadNodeData>
      {...props}
      handles={[
        {
          text: "File",
          position: Position.Right,
          style: { background: "#ea8362" },
        },
      ]}
    >
      {({ id, data, selected }) => (
        <NodeShell
          title="Upload Image"
          className="h-auto w-84"
          nodeId={props?.id}
          selected={selected ?? props.selected}
        >
          <UploadContent nodeId={id} fileType="image" savedUrl={data.url} />
        </NodeShell>
      )}
    </BaseNode>
  );
}

// Upload Video Node
export function UploadVideoNode(props: NodeProps<UploadVideoRFNode>) {
  return (
    <BaseNode<UploadNodeData>
      {...props}
      handles={[
        {
          text: "File",
          position: Position.Right,
          style: { background: "#ea8362" },
        },
      ]}
    >
      {({ id, data, selected }) => (
        <NodeShell
          title="Upload Video"
          className="h-auto w-84"
          nodeId={props?.id}
          selected={selected ?? props.selected}
        >
          <UploadContent nodeId={id} fileType="video" savedUrl={data.url} />
        </NodeShell>
      )}
    </BaseNode>
  );
}
