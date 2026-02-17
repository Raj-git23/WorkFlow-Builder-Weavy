// trigger/ffmpeg-tasks.ts
import { task } from "@trigger.dev/sdk";
import Ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import os from "os";
import path from "path";

Ffmpeg.setFfmpegPath(ffmpegPath!);

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Streams the download directly to disk — avoids loading large files into memory
// and prevents corrupt temp files from partial reads.
async function downloadToTmp(url: string, ext: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }
  const dest = path.join(os.tmpdir(), `tl-${Date.now()}.${ext}`);
  const writer = createWriteStream(dest);
  await pipeline(Readable.fromWeb(res.body as any), writer);
  return dest;
}

async function readAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext    = path.extname(filePath).slice(1);
  const mime   = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function cleanup(...paths: string[]) {
  await Promise.all(paths.map((p) => fs.unlink(p).catch(() => {})));
}

function runFfmpeg(cmd: Ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    // Register "end" via the typed overload
    cmd.on("end", (_out: string | null, _err: string | null) => resolve());
    // Register "error" separately — chaining breaks fluent-ffmpeg's type overloads
    // because the "end" overload doesn't know about "error" in its return type
    (cmd as any).on("error", (err: Error, _stdout: string, stderr: string) =>
      reject(new Error(`${err.message}\n${stderr}`))
    );
    cmd.run();
  });
}

// Gets image width/height via ffprobe — needed for integer pixel crop values
function getImageDimensions(filePath: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      const stream = meta.streams.find((s) => s.codec_type === "video");
      if (!stream?.width || !stream?.height) {
        return reject(new Error("Could not read image dimensions"));
      }
      resolve({ w: stream.width, h: stream.height });
    });
  });
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta.format.duration ?? 0);
    });
  });
}

// ─── Crop Image Task ──────────────────────────────────────────────────────────

export const cropImageTask = task({
  id:          "crop-image",
  maxDuration: 120,
  run: async (payload: {
    imageUrl: string;
    x:        number;  // % 0–100
    y:        number;
    width:    number;
    height:   number;
  }) => {
    const { imageUrl, x, y, width, height } = payload;
    const ext    = imageUrl.toLowerCase().includes(".png") ? "png" : "jpg";
    const input  = await downloadToTmp(imageUrl, ext);
    const output = path.join(os.tmpdir(), `tl-cropped-${Date.now()}.${ext}`);

    // Get actual pixel dimensions first — Windows FFmpeg builds don't reliably
    // evaluate float expressions like `0.5*iw` in the crop filter.
    const { w, h } = await getImageDimensions(input);

    const cropW = Math.floor((width  / 100) * w);
    const cropH = Math.floor((height / 100) * h);
    const cropX = Math.floor((x      / 100) * w);
    const cropY = Math.floor((y      / 100) * h);

    // Ensure crop area doesn't exceed image bounds
    const safeW = Math.min(cropW, w - cropX);
    const safeH = Math.min(cropH, h - cropY);

    await runFfmpeg(
      Ffmpeg(input)
        .videoFilters(`crop=${safeW}:${safeH}:${cropX}:${cropY}`)
        .output(output)
    );

    const dataUrl = await readAsBase64(output);
    await cleanup(input, output);
    return { dataUrl };
  },
});

// ─── Extract Frame Task ───────────────────────────────────────────────────────

export const extractFrameTask = task({
  id:          "extract-frame",
  maxDuration: 120,
  run: async (payload: {
    videoUrl:    string;
    timestamp:   number;
    percentage?: number;
  }) => {
    const { videoUrl, timestamp, percentage } = payload;
    const input  = await downloadToTmp(videoUrl, "mp4");
    const output = path.join(os.tmpdir(), `tl-frame-${Date.now()}.jpg`);

    let seekTime = timestamp;
    if (percentage !== undefined) {
      const duration = await getVideoDuration(input);
      seekTime = (percentage / 100) * duration;
    }

    await runFfmpeg(
      Ffmpeg(input)
        .seekInput(seekTime)
        .frames(1)
        .output(output)
        .outputOptions(["-q:v 2"])
    );

    const dataUrl = await readAsBase64(output);
    await cleanup(input, output);
    return { dataUrl };
  },
});