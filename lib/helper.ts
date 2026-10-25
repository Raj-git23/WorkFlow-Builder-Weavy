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

/** Formats total seconds into HH:MM:SS string format */
export function secondsToTimecode(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safeSec / 3600).toString().padStart(2, "0");
  const m = Math.floor((safeSec % 3600) / 60).toString().padStart(2, "0");
  const s = (safeSec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Converts HH:MM:SS or MM:SS timecode string back into total seconds */
export function timecodeToSeconds(timecodeStr: string): number {
  if (!timecodeStr) return 0;
  const parts = timecodeStr.trim().split(":").map((p) => parseInt(p, 10) || 0);

  let h = 0, m = 0, s = 0;

  if (parts.length === 3) {
    [h, m, s] = parts;
  } else if (parts.length === 2) {
    [m, s] = parts;
  } else if (parts.length === 1) {
    s = parts[0];
  }

  return Math.max(0, h * 3600 + m * 60 + s);
}

/** Converts frame number to HH:MM:SS timecode (at 30 fps) */
export function frameToTimecode(frame: number, fps = 30): string {
  const seconds = Math.floor((frame || 0) / fps);
  return secondsToTimecode(seconds);
}

/** Converts HH:MM:SS timecode string back into frame count (at 30 fps) */
export function timecodeToFrame(timecodeStr: string, fps = 30): number {
  const seconds = timecodeToSeconds(timecodeStr);
  return seconds * fps;
}

let nodeCounter = 0;
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