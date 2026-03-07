import { NodeType } from "@/types/nodetype";

export const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 200];

export const MAX_HISTORY = 20;



export const ASPECT_RATIOS = ["Custom", "1:1", "4:3", "16:9", "3:2", "9:16", "2:3"];

export const MODELS = [
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-4o Mini", value: "gpt-4o-mini" },
  { label: "Claude Sonnet 4", value: "claude-sonnet-4-5" },
  { label: "Claude Haiku 4", value: "claude-haiku-4-5" },
  { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
  { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
];

export const ACCEPT = {
  image: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  video: "video/mp4,video/quicktime,video/webm,video/x-m4v",
};

// Map aspect ratio string to numeric value
export const ASPECT_MAP: Record<string, number | undefined> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "3:2": 3 / 2,
  "9:16": 9 / 16,
  "2:3": 2 / 3,
  Custom: undefined,
};