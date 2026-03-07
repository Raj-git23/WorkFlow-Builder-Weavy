import { TextAreaNode } from "@/components/nodes/node-types/TextAreaNode";
import { ExtractFrameNode } from "@/components/nodes/node-types/ExtractFrameNode";
import { CropImageNode } from "@/components/nodes/node-types/CropImageNode";
import { LLMNode } from "@/components/nodes/node-types/LlmNode";
import { UploadImageNode, UploadVideoNode } from "@/components/nodes/node-types/UploadNode";

const nodeTypes = {
  textArea: TextAreaNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

export { nodeTypes };