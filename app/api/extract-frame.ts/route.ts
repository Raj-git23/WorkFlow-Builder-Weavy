import { runs, tasks } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { extractFrameTask } from "@/trigger/ffmpegtask";

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, timestamp, percentage } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    const handle = await tasks.trigger<typeof extractFrameTask>("extract-frame", {
      videoUrl,
      timestamp:  timestamp  ?? 0,
      percentage: percentage ?? undefined,
    });

    const result = await runs.poll(handle, { pollIntervalMs: 1000 });

    if (result.status !== "COMPLETED" || !result.output) {
      return NextResponse.json({ error: "Task failed", status: result.status }, { status: 500 });
    }

    return NextResponse.json({ dataUrl: result.output.dataUrl });
  } catch (err) {
    console.error("Extract frame route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}