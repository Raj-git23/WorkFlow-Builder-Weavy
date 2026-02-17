// app/api/upload/route.ts
import { Transloadit } from "transloadit";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const TEMPLATES = {
  image: "8f13d0d783bd4a07a321ab42ce804b0a",
  video: "9b519e0bf3764fe4989aca5985da7b14",
};

export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File;
    const fileType = (formData.get("fileType") as string) ?? "image";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Write to a temp file — SDK expects a file path string, not a Buffer
    const buffer  = Buffer.from(await file.arrayBuffer());
    tmpPath       = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
    await writeFile(tmpPath, buffer);

    const transloadit = new Transloadit({
      authKey:    process.env.TRANSLOADIT_AUTH_KEY!,
      authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
    });


    const result = await transloadit.createAssembly({
      files: {
        file: tmpPath,          // plain string path
      },
      params: {
        template_id: TEMPLATES[fileType as keyof typeof TEMPLATES] ?? TEMPLATES.image,
      },
      waitForCompletion: true,
    });

    const uploads     = result.uploads ?? [];
    const steps       = result.results  ?? {};
    const firstResult = Object.values(steps).flat()[0] ?? uploads[0];

    if (!firstResult?.ssl_url) {
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    return NextResponse.json({
      url:      firstResult.ssl_url,
      mimeType: firstResult.mime,
      name:     firstResult.name,
    });
  } catch (err) {
    console.error("Transloadit error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  } finally {

    // clean up the temp file
    if (tmpPath) await unlink(tmpPath).catch(() => {});
  }
}