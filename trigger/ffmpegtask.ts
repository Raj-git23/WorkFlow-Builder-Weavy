import { task } from "@trigger.dev/sdk";
import Ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";     // ffmpeg-static is a library that provides the path to the ffmpeg binary, it prevents from downloading ffmpeg on the server and runs on cloud without the need of ffmpeg installed.
import fs from "fs/promises";
import { createWriteStream } from "fs";     
import { pipeline } from "stream/promises";   // pipeline is a function that pipes the data from the source to the destination.
import { Readable } from "stream";             // Readable is a stream that can be read from.
import os from "os";
import path from "path";

Ffmpeg.setFfmpegPath(ffmpegPath!);    // Tells fluent-ffmpeg where the actual FFmpeg binary is, without this it'll try to find globally installed ffmpeg and gives error if not found.


// Streams the download directly to disk — avoids loading large files into memory and prevents corrupt temp files from partial reads.
async function downloadToTmp(url: string, ext: string): Promise<string> {
  const res = await fetch(url);
  
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  const dest = path.join(os.tmpdir(), `tl-${Date.now()}.${ext}`);   // Creates a temporary file in the OS's temporary directory, regardless of any OS.
  const writer = createWriteStream(dest);      
  
  // It takes the res.body as a stream, converts the web stream to node.js stream (using Readable.fromWeb) and then pipes the data at the destination path, which help if we get interruption by any reason (network or memory issue).
  await pipeline(Readable.fromWeb(res.body as any), writer);        
  return dest;
}


// Converts a local image into a Base64-encoded Data URL string for web use.
async function readAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}


// Cleans up the temporary generated files after the task is complete.
async function cleanup(...paths: string[]) {
  await Promise.all(paths.map((p) => fs.unlink(p).catch(() => {})));
}


// Wraps FFmpeg's event listeners into a Promise so we can use 'await' to wait for completion.
function runFfmpeg(cmd: Ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    // Register "end" via the typed overload to resolve the promise when the command is complete. It prevent code from continuing further before running ffmpeg or takes on-existing output file 
    cmd.on("end", (_out: string | null, _err: string | null) => resolve());

    // If there is an error, reject the promise with the error message and the stderr output.
    (cmd as any).on("error", (err: Error, _stdout: string, stderr: string) =>
      reject(new Error(`${err.message}\n${stderr}`)),
    );

    // Runs the ffmpeg command.
    cmd.run();
  });
}


// Gets image width/height via ffprobe — needed for integer pixel crop values
function getImageDimensions(filePath: string, ): Promise<{ w: number; h: number }> {
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


// Crop Image Task
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

    // Get actual pixel dimensions first — Windows FFmpeg builds don't reliably
    const { w, h } = await getImageDimensions(input);

    const cropW = Math.floor((width / 100) * w);
    const cropH = Math.floor((height / 100) * h);
    const cropX = Math.floor((x / 100) * w);
    const cropY = Math.floor((y / 100) * h);

    // crop area doesn't exceed image bounds
    const safeW = Math.min(cropW, w - cropX);
    const safeH = Math.min(cropH, h - cropY);

    await runFfmpeg(
      Ffmpeg(input)
        .videoFilters(`crop=${safeW}:${safeH}:${cropX}:${cropY}`)
        .output(output),
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
    timestamp: number;
    percentage?: number;
  }) => {
    const { videoUrl, timestamp, percentage } = payload;
    const input = await downloadToTmp(videoUrl, "mp4");
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
        .outputOptions(["-q:v 2"]),
    );

    const dataUrl = await readAsBase64(output);
    await cleanup(input, output);
    return { dataUrl };
  },
});
