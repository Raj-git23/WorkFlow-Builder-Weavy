import { runs, tasks } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { cropImageTask } from "@/trigger/ffmpegtask";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, x, y, width, height } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 },
      );
    }

    // Step 1: trigger the task, get back a run handle
    const handle = await tasks.trigger<typeof cropImageTask>("crop-image", {
      imageUrl,
      x: x ?? 0,
      y: y ?? 0,
      width: width ?? 100,
      height: height ?? 100,
    });

    // Step 2: poll until the run finishes
    const result = await runs.poll(handle, { pollIntervalMs: 1000 });

    if (result.status !== "COMPLETED" || !result.output) {
      return NextResponse.json(
        { error: "Task failed", status: result.status },
        { status: 500 },
      );
    }

    return NextResponse.json({ dataUrl: result.output.dataUrl });
  } catch (err) {
    console.error("Crop route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
