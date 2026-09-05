// app/api/transloadit/route.ts
import { Transloadit } from "transloadit";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TEMPLATES = {
  image: "8f13d0d783bd4a07a321ab42ce804b0a",
  video: "9b519e0bf3764fe4989aca5985da7b14",
};

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileType = "image";
    let fileBuffer: Buffer | null = null;
    let fileName = "file";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      fileType = (formData.get("fileType") as string) ?? "image";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      fileType = body.fileType ?? "image";
      const targetUrl = body.url as string;

      if (!targetUrl) {
        return NextResponse.json({ error: "No URL provided" }, { status: 400 });
      }

      // Fetch URL server-side (bypassing CORS)
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL (${res.status} ${res.statusText})` },
          { status: 400 }
        );
      }

      fileBuffer = Buffer.from(await res.arrayBuffer());
      const urlFileName = targetUrl.split("/").pop()?.split("?")[0];
      fileName = urlFileName && urlFileName.length > 0 ? urlFileName : `url-${Date.now()}`;
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Empty file or URL content" }, { status: 400 });
    }

    // 1. Save locally in public/uploads so the media is permanently accessible to Next.js & Trigger.dev
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const safeBaseName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const localFileName = `upload-${Date.now()}-${safeBaseName}`;
    const localFilePath = join(uploadsDir, localFileName);
    await writeFile(localFilePath, fileBuffer);

    const localUrl = `/uploads/${localFileName}`;

    // 2. Write to temp file for Transloadit SDK processing
    tmpPath = join(tmpdir(), `tl-src-${Date.now()}-${safeBaseName}`);
    await writeFile(tmpPath, fileBuffer);

    let transloaditUrl: string | null = null;
    let mimeType: string = fileType === "image" ? "image/jpeg" : "video/mp4";

    try {
      const transloadit = new Transloadit({
        authKey: process.env.TRANSLOADIT_AUTH_KEY!,
        authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
      });

      const result = await transloadit.createAssembly({
        files: {
          file: tmpPath,
        },
        params: {
          template_id: TEMPLATES[fileType as keyof typeof TEMPLATES] ?? TEMPLATES.image,
        },
        waitForCompletion: true,
      });

      // Check if assembly had an error or decline
      if (result.error) {
        await unlink(localFilePath).catch(() => {});
        return NextResponse.json(
          { error: result.message || "File rejected by Transloadit security/validation scan" },
          { status: 400 }
        );
      }

      const uploads = result.uploads ?? [];
      const steps = result.results ?? {};

      // If permanent export step exists (e.g. S3), use that; otherwise use reliable localUrl
      const allStepResults = Object.values(steps).flat();
      const validStep = allStepResults.find(
        (r: any) => r?.ssl_url && !r.ssl_url.includes("/scratch/")
      );

      if (validStep?.ssl_url) {
        transloaditUrl = validStep.ssl_url;
        mimeType = validStep.mime || mimeType;
      } else {
        const anyResult = allStepResults[0] || uploads[0];
        if (anyResult?.mime) mimeType = anyResult.mime;
      }
    } catch (tlErr: any) {
      console.warn("Transloadit assembly notice:", tlErr);
      if (tlErr?.message?.includes("ASSEMBLY_EXECUTION_ERROR") || tlErr?.message?.includes("FILTER_DECLINE")) {
        await unlink(localFilePath).catch(() => {});
        return NextResponse.json(
          { error: "Invalid video format or file failed security verification" },
          { status: 400 }
        );
      }
    }

    // Return the reliable permanent URL
    return NextResponse.json({
      url: transloaditUrl || localUrl,
      mimeType,
      name: fileName,
    });
  } catch (err) {
    console.error("Transloadit upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  } finally {
    if (tmpPath) await unlink(tmpPath).catch(() => {});
  }
}