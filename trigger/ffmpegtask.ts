import { task } from "@trigger.dev/sdk";
import Ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import os from "os";
import path from "path";

// Tell fluent-ffmpeg where the FFmpeg binary is located
if (ffmpegPath) {
  Ffmpeg.setFfmpegPath(ffmpegPath);
}

// Streams or copies the media file directly to disk temp location
async function downloadToTmp(url: string, ext: string): Promise<string> {
  const dest = path.join(
    os.tmpdir(),
    `tl-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
  );

  // 1. Handle Base64 Data URLs
  if (url.startsWith("data:")) {
    const base64Data = url.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(dest, buffer);
    return dest;
  }

  // 2. Handle absolute local filesystem path (e.g. C:/... or /...)
  if (path.isAbsolute(url) || /^[a-zA-Z]:[\\/]/.test(url)) {
    try {
      await fs.copyFile(url, dest);
      return dest;
    } catch (e) {
      console.warn(`Direct copy failed for absolute path ${url}:`, e);
    }
  }

  // 3. Handle local relative /uploads/ path across potential base dirs
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    const candidates = [
      path.join(process.cwd(), "public", cleanPath),
      path.resolve(__dirname, "../../public", cleanPath),
      path.resolve(__dirname, "../public", cleanPath),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        await fs.copyFile(candidate, dest);
        return dest;
      } catch {
        // Continue to next candidate
      }
    }
  }

  // 4. Handle HTTP / HTTPS URL
  let targetUrl = url;
  if (url.startsWith("/")) {
    targetUrl = `http://localhost:3000${url}`;
  }

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
    },
    redirect: "follow",
  });

  if (!res.ok || !res.body) {
    if (res.status === 404 && targetUrl.includes("transloadit.com/scratch/")) {
      throw new Error(
        `Transloadit scratch file expired (404 Not Found). Please re-upload or select a fresh video.`
      );
    }
    throw new Error(
      `Failed to download file (${res.status} ${res.statusText}): ${targetUrl}`
    );
  }

  const writer = createWriteStream(dest);
  await pipeline(Readable.fromWeb(res.body as any), writer);
  return dest;
}

// Converts a local file into a Base64-encoded Data URL string
async function readAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

// Cleans up temporary files after execution
async function cleanup(...paths: string[]) {
  await Promise.all(paths.map((p) => fs.unlink(p).catch(() => {})));
}

// Wraps FFmpeg command execution into a Promise
function runFfmpeg(cmd: Ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd.on("end", () => resolve());
    (cmd as any).on("error", (err: Error, _stdout: string, stderr: string) =>
      reject(new Error(`${err.message}\n${stderr}`))
    );
    cmd.run();
  });
}

// Crop Image Task (FFmpeg filter evaluates input dimensions natively via iw & ih)
export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 120,
  run: async (payload: {
    imageUrl: string;
    x: number; // % 0–100
    y: number;
    width: number;
    height: number;
  }) => {
    const { imageUrl, x, y, width, height } = payload;
    const ext = imageUrl.toLowerCase().includes(".png") ? "png" : "jpg";
    const input = await downloadToTmp(imageUrl, ext);
    const output = path.join(os.tmpdir(), `tl-cropped-${Date.now()}.${ext}`);

    // FFmpeg crop filter natively computes input width (iw) and height (ih)
    const cropFilter = `crop=iw*${width}/100:ih*${height}/100:iw*${x}/100:ih*${y}/100`;

    await runFfmpeg(
      Ffmpeg(input)
        .videoFilters(cropFilter)
        .output(output)
    );

    const dataUrl = await readAsBase64(output);
    await cleanup(input, output);
    return { dataUrl };
  },
});

// Extract Frame Task
export const extractFrameTask = task({
  id: "extract-frame",
  maxDuration: 120,
  run: async (payload: {
    videoUrl: string;
    timestamp: number; // timestamp in seconds
    percentage?: number;
  }) => {
    const { videoUrl, timestamp, percentage } = payload;
    const input = await downloadToTmp(videoUrl, "mp4");
    const output = path.join(os.tmpdir(), `tl-frame-${Date.now()}.jpg`);

    const seekTime = timestamp || 0;

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
