import React from "react";
import {
  Crop,
  Film,
  ImageUp,
  Sparkles,
  SquarePlay,
  TypeOutline,
} from "lucide-react";
import { NodeType } from "@/types/nodetype";


export const NODES: { icon: React.ReactNode; type: NodeType; name: string }[] = [
  { icon: <TypeOutline strokeWidth={0.8} height="20" width="20" />, type: "textArea", name: "Enter Text" },
  { icon: <ImageUp strokeWidth={0.8} height="20" width="20" />, type: "uploadImage", name: "Upload Image" },
  { icon: <SquarePlay strokeWidth={0.8} height="20" width="20" />, type: "uploadVideo", name: "Upload Video" },
  { icon: <Sparkles strokeWidth={0.8} height="20" width="20" />, type: "llm", name: "Run any model" },
  { icon: <Crop strokeWidth={0.8} height="20" width="20" />, type: "cropImage", name: "Crop Image" },
  { icon: <Film strokeWidth={0.8} height="20" width="20" />, type: "extractFrame", name: "Extract frame from video" },
];

export const DEFAULT_DATA: Record<NodeType, Record<string, unknown>> = {
  textArea: { value: "" },
  uploadImage: { fileType: "image" },
  uploadVideo: { fileType: "video" },
  llm: { model: "gpt-4o", imageInputCount: 1 },
  cropImage: { aspectRatio: "Custom", width: 100, height: 100 },
  extractFrame: { frame: 0 },
};
