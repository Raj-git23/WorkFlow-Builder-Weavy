// lib/starter-template.ts
import { type Node, type Edge } from "@xyflow/react";
import { getEdgeStyle } from "./edge-style";

export interface StarterWorkflowTemplate {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Pre-built Starter Workflow: Product Marketing Kit Generator
 * Per specification:
 * - Branch A: Upload Image -> Crop Image -> Text (x2) -> LLM Node #1
 * - Branch B: Upload Video -> Extract Frame from Video
 * - Convergence Point: LLM Node #2 (receives LLM #1 text + Branch A cropped image + Branch B extracted frame)
 */
export const PRODUCT_MARKETING_KIT_TEMPLATE: StarterWorkflowTemplate = {
  name: "Product Marketing Kit Generator",
  description:
    "End-to-end multi-modal marketing workflow: Branch A processes product images & generates descriptions; Branch B extracts video frames; Convergence LLM #2 combines both into social copy.",
  nodes: [
    // --- Branch A: Image Processing & First LLM Run ---
    {
      id: "template-upload-image",
      type: "uploadImage",
      position: { x: 60, y: 60 },
      data: {
        label: "Upload Image",
        url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
      },
    },
    {
      id: "template-crop-image",
      type: "cropImage",
      position: { x: 480, y: 60 },
      data: {
        label: "Crop Image",
        aspectRatio: "Custom",
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      },
    },
    {
      id: "template-prompt-sys-1",
      type: "textArea",
      position: { x: 60, y: 460 },
      data: {
        label: "System Prompt #1",
        value:
          "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.",
      },
    },
    {
      id: "template-prompt-user-1",
      type: "textArea",
      position: { x: 60, y: 680 },
      data: {
        label: "Product Details #1",
        value:
          "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
      },
    },
    {
      id: "template-llm-1",
      type: "llm",
      position: { x: 480, y: 480 },
      data: {
        label: "LLM Node #1 (Description)",
        model: "gemini-2.5-flash",
        imageInputCount: 1,
      },
    },

    // --- Branch B: Video Frame Extraction ---
    {
      id: "template-upload-video",
      type: "uploadVideo",
      position: { x: 60, y: 920 },
      data: {
        label: "Upload Video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      },
    },
    {
      id: "template-extract-frame",
      type: "extractFrame",
      position: { x: 480, y: 920 },
      data: {
        label: "Extract Frame",
        frame: 150,
      },
    },

    // --- Convergence Point: Social Copy LLM ---
    {
      id: "template-prompt-sys-2",
      type: "textArea",
      position: { x: 920, y: 160 },
      data: {
        label: "System Prompt #2",
        value:
          "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.",
      },
    },
    {
      id: "template-llm-2",
      type: "llm",
      position: { x: 960, y: 420 },
      data: {
        label: "LLM Node #2 (Final Post)",
        model: "gemini-2.5-flash",
        imageInputCount: 2,
      },
    },
  ],
  edges: [
    // 1. Upload Image -> Crop Image
    {
      id: "edge-upload-to-crop",
      source: "template-upload-image",
      target: "template-crop-image",
      sourceHandle: "template-upload-image-file",
      targetHandle: "template-crop-image-file-in",
      ...getEdgeStyle("uploadImage", "cropImage"),
    },
    // 2. Text System Prompt #1 -> LLM #1
    {
      id: "edge-sys1-to-llm1",
      source: "template-prompt-sys-1",
      target: "template-llm-1",
      sourceHandle: "template-prompt-sys-1-prompt",
      targetHandle: "template-llm-1-system-prompt",
      ...getEdgeStyle("textArea", "llm"),
    },
    // 3. Text User Message #1 -> LLM #1
    {
      id: "edge-user1-to-llm1",
      source: "template-prompt-user-1",
      target: "template-llm-1",
      sourceHandle: "template-prompt-user-1-prompt",
      targetHandle: "template-llm-1-user-message",
      ...getEdgeStyle("textArea", "llm"),
    },
    // 4. Crop Image -> LLM #1 (Image Slot 0)
    {
      id: "edge-crop-to-llm1",
      source: "template-crop-image",
      target: "template-llm-1",
      sourceHandle: "template-crop-image-file-out",
      targetHandle: "template-llm-1-image-0",
      ...getEdgeStyle("cropImage", "llm"),
    },
    // 5. Upload Video -> Extract Frame
    {
      id: "edge-video-to-frame",
      source: "template-upload-video",
      target: "template-extract-frame",
      sourceHandle: "template-upload-video-file",
      targetHandle: "template-extract-frame-video-in",
      ...getEdgeStyle("uploadVideo", "extractFrame"),
    },
    // 6. Text System Prompt #2 -> LLM #2
    {
      id: "edge-sys2-to-llm2",
      source: "template-prompt-sys-2",
      target: "template-llm-2",
      sourceHandle: "template-prompt-sys-2-prompt",
      targetHandle: "template-llm-2-system-prompt",
      ...getEdgeStyle("textArea", "llm"),
    },
    // 7. LLM #1 Output -> LLM #2 User Message
    {
      id: "edge-llm1-to-llm2",
      source: "template-llm-1",
      target: "template-llm-2",
      sourceHandle: "template-llm-1-output",
      targetHandle: "template-llm-2-user-message",
      ...getEdgeStyle("llm", "llm"),
    },
    // 8. Crop Image -> LLM #2 (Image Slot 0)
    {
      id: "edge-crop-to-llm2",
      source: "template-crop-image",
      target: "template-llm-2",
      sourceHandle: "template-crop-image-file-out",
      targetHandle: "template-llm-2-image-0",
      ...getEdgeStyle("cropImage", "llm"),
    },
    // 9. Extract Frame -> LLM #2 (Image Slot 1)
    {
      id: "edge-frame-to-llm2",
      source: "template-extract-frame",
      target: "template-llm-2",
      sourceHandle: "template-extract-frame-frame-out",
      targetHandle: "template-llm-2-image-1",
      ...getEdgeStyle("extractFrame", "llm"),
    },
  ],
};
