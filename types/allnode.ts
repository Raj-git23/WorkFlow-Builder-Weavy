import { TextAreaNode } from "@/utils/Nodes/TextAreaNode";
import { ExtractFrameNode } from "@/utils/Nodes/ExtractFrameNode";
import { CropImageNode } from "@/utils/Nodes/CropImgNode";
import { LLMNode } from "@/utils/Nodes/LlmNode";
import { UploadImageNode, UploadVideoNode } from "@/utils/Nodes/UploadNode";

const nodeTypes = {
  textArea: TextAreaNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

export { nodeTypes };