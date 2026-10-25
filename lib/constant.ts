import { NodeType } from "@/types/nodetype";

export const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 200];

export const MAX_HISTORY = 20;



export const ASPECT_RATIOS = ["Custom", "1:1", "4:3", "16:9", "3:2", "9:16", "2:3"];

export const MODELS = [
  { label: "Gemini 3.7 Flash", value: "gemini-3.7-flash", desc: "Flagship: Fast & powerful multimodal (Free tier)" },
  { label: "Gemini 3.6 Flash", value: "gemini-3.6-flash", desc: "High-speed multimodal reasoning (Free tier)" },
  { label: "Gemini 3.5 Flash", value: "gemini-3.5-flash", desc: "Balanced performance & vision (Free tier)" },
  { label: "Gemini 3.5 Flash-Lite", value: "gemini-3.5-flash-lite", desc: "High throughput & lightweight (Free tier)" },
  { label: "Gemini Flash Latest", value: "gemini-flash-latest", desc: "Always points to newest Flash model (Free tier)" },
  { label: "Gemini Flash-Lite Latest", value: "gemini-flash-lite-latest", desc: "Always points to newest Lite model (Free tier)" },
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