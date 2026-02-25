// utils/Nodes/UploadNode.tsx
import { useCallback, useState } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { Upload, Loader2, AlertCircle, X } from "lucide-react";
import { NodeShell } from "./NodeShell";
import { PreviewArea } from "@/components/PreviewArea";
import { BaseNode } from "../BaseNode";
import { UploadImageRFNode, UploadNodeData, UploadVideoRFNode } from "@/types/nodetype";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTransloaditUpload } from "@/lib/Usetransloaditupload";
import { ACCEPT } from "@/lib/assets";
import { useFlowStore } from "@/store/useflowstore";


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
  const { upload, status, error, reset } = useTransloaditUpload(fileType);

  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(savedUrl);
  const [linkValue, setLinkValue] = useState("");

  const isUploading = status === "uploading";

  // After a successful upload, publishing the URL to the store so downstream nodes (crop, extractFrame, llm) can read it via edges.
  const publishUrl = useCallback((url: string) => {
    setPreviewUrl(url);
    setOutput(nodeId, fileType === "image" ? { imageUrl: url } : { videoUrl: url });
  }, [nodeId, fileType, setOutput]);

  const processFile = useCallback(async (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));     // instant local preview
    const result = await upload(file);
    if (result) publishUrl(result.url);
  }, [upload, publishUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleLinkSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !linkValue.trim()) return;
    publishUrl(linkValue.trim());
    setLinkValue("");
  }, [linkValue, publishUrl]);

  const handleClear = useCallback(() => {
    setPreviewUrl(undefined);
    setOutput(nodeId, {});
    reset();
  }, [nodeId, setOutput, reset]);

  return (
    <>
      {previewUrl ? (
        <div
          className="relative max-w-sm h-full rounded-md overflow-hidden"
          style={{
            backgroundImage: "repeating-conic-gradient(#2a2a2f 0% 25%, #1e1e1e 0% 50%)",
            backgroundSize: "20px 20px",
          }}
        >

          {/* Re-upload overlay */}
          <label className={cn(
            "absolute inset-0 cursor-pointer z-10 nodrag transition-opacity",
            isUploading ? "opacity-100" : "opacity-0 hover:opacity-100"
          )}>
            <input type="file" className="sr-only" accept={ACCEPT[fileType]} onChange={handleFileInput} disabled={isUploading} />
            
            <div className="absolute inset-0 h-full flex flex-col items-center justify-center gap-1 bg-black/50">
              {isUploading
                ? <Loader2 size={16} className="animate-spin text-white" />
                : <Upload  size={16} className="text-white" />}
              <span className="text-[10px] text-white">{isUploading ? "Uploading…" : "Replace"}</span>
            </div>
          
          </label>

          {/* Clear */}
          {!isUploading && (
            <button type="button" onClick={handleClear}
              className="nodrag absolute top-1.5 right-1.5 z-20 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors">
              <X size={11} />
            </button>
          )}

          {status === "done" && (
            <span className="absolute bottom-1.5 left-1.5 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-green-400">
              Uploaded
            </span>
          )}

          {fileType === "image"
            ? <img src={previewUrl} alt="preview" className="block w-full h-fit rounded-xs" />
            : <video src={previewUrl} controls className="block w-full h-1/2 rounded-xs" />}
        </div>
      ) : (

        <PreviewArea>
          <label
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors nodrag",
              dragging ? "bg-white/5" : "bg-transparent"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" className="sr-only" accept={ACCEPT[fileType]} onChange={handleFileInput} disabled={isUploading} />
            {isUploading
              ? <Loader2 size={18} className="animate-spin text-sidebar-foreground/60" />
              : <Upload  size={18} className="text-sidebar-foreground/60" />}
            <span className="text-sidebar-foreground/60 text-[11px]">
              {isUploading ? "Uploading…" : "Drag & drop or click to upload"}
            </span>
          </label>
        </PreviewArea>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      <Input
        type="url"
        placeholder="Paste a file link"
        value={linkValue}
        onChange={(e) => setLinkValue(e.target.value)}
        onKeyDown={handleLinkSubmit}
        className="nodrag w-full !text-[10px] font-semibold rounded-sm border border-sidebar-border mt-1"
      />
    </>
  );
}



//  Upload Image Node 

export function UploadImageNode(props: NodeProps<UploadImageRFNode>) {
  return (
    <BaseNode<UploadNodeData> {...props} handles={[{ text: "File", position: Position.Right, style: {background: '#ea8362'}}]}>
      {({ id, data }) => (
        <NodeShell title="Upload Image" className={data?.url ? "max-h-full" : "h-96 max-h-full"} nodeId={props?.id}>
          <UploadContent nodeId={id} fileType="image" savedUrl={data.url} />
        </NodeShell>
      )}
    </BaseNode>
  );
}

//  Upload Video Node 

export function UploadVideoNode(props: NodeProps<UploadVideoRFNode>) {
  return (
    <BaseNode<UploadNodeData> {...props} handles={[{ text: "File", position: Position.Right, style: {background: '#ea8362'} }]}>
      {({ id, data }) => (
        <NodeShell title="Upload Video" className={data.url ? "max-h-fit" : "h-96 max-h-full"} nodeId={props?.id}>
          <UploadContent nodeId={id} fileType="video" savedUrl={data.url} />
        </NodeShell>
      )}
    </BaseNode>
  );
}