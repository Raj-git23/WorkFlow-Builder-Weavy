import { NodeType, Snapshot } from "@/types/nodetype";
import { type Edge, type Node } from "@xyflow/react";
import { createHmac } from "crypto";

/** Returns an ISO-8601 UTC timestamp 30 minutes from now */
export function expiresIn30Min(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

const AUTH_SECRET = process.env.TRANSLOADIT_AUTH_SECRET;
/** Signs the params string with HMAC-SHA1 using the auth secret */
export function sign(params: string): string {
  return createHmac("sha1", AUTH_SECRET!).update(params).digest("hex");
}


export function frameToTimecode(frame: number, fps = 30): string {
  const totalSeconds = Math.floor(frame / fps);
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

let nodeCounter = 0
export function genId(type: NodeType) {
  return `${type}-${++nodeCounter}`;
}

export function takeSnapshot(nodes: Node[], edges: Edge[]): Snapshot {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
  };
}

// Convert aspect ratio string to number (e.g., "16:9" → 16/9)
export function parseAspectRatio(ratio: string): number | undefined {
  if (ratio === "Custom") return undefined;
  const [w, h] = ratio.split(":").map(Number);
  return w && h ? w / h : undefined;
}

export const round = (val: number) => Math.round(val * 100) / 100;

// const handles = [
//   { text: "File*", id: `${props.id}-file-in`, position: Position.Left, type: "target" as const },
//   { text: "File", id: FILE_OUT_HANDLE(props.id), position: Position.Right, type: "source" as const },
// ];