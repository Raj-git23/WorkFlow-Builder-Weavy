import { runs, tasks } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { geminiTask } from "@/trigger/geminitask";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { model, systemPrompt, userMessage, images } = await req.json();

    if (!userMessage || !userMessage.trim()) {
      return NextResponse.json(
        { error: "user_message (prompt) is required" },
        { status: 400 }
      );
    }

    // Resolve local upload image paths to absolute paths for reliable disk access
    const resolvedImages: string[] = [];
    if (Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === "string" && (img.startsWith("/uploads/") || img.startsWith("uploads/"))) {
          const cleanPath = img.startsWith("/") ? img.slice(1) : img;
          const absPath = path.join(process.cwd(), "public", cleanPath);
          if (fs.existsSync(absPath)) {
            resolvedImages.push(absPath);
            continue;
          }
        }
        if (img) resolvedImages.push(img);
      }
    }

    // Trigger Trigger.dev task
    const handle = await tasks.trigger<typeof geminiTask>("run-gemini", {
      model: model || "gemini-2.5-flash",
      systemPrompt: systemPrompt || undefined,
      userMessage: userMessage.trim(),
      images: resolvedImages,
    });

    // Poll until run completes
    const result = await runs.poll(handle, { pollIntervalMs: 1000 });

    if (result.status !== "COMPLETED" || !result.output) {
      return NextResponse.json(
        { error: "LLM task execution failed", status: result.status },
        { status: 500 }
      );
    }

    return NextResponse.json({ text: result.output.text });
  } catch (err) {
    console.error("Run LLM route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
