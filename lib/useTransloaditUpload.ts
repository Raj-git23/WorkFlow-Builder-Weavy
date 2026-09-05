// lib/useTransloaditUpload.ts
import { UploadResult, UploadFileStatus } from "@/types/filetypes";
import { useState, useCallback } from "react";

// Handles uploading images and videos (from File or URL) on Transloadit
export function useTransloaditUpload(fileType: "image" | "video") {
  const [status, setStatus] = useState<UploadFileStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = useCallback(
    async (input: File | string): Promise<UploadResult | null> => {
      setStatus("uploading");
      setError(null);

      try {
        let res: Response;

        if (typeof input === "string") {
          // Send URL payload for server-side fetch & Transloadit processing
          res = await fetch("/api/transloadit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: input, fileType }),
          });
        } else {
          // Send FormData payload for file upload
          const body = new FormData();
          body.append("file", input);
          body.append("fileType", fileType);
          res = await fetch("/api/transloadit", { method: "POST", body });
        }

        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg ?? "Upload failed");
        }

        const data: UploadResult = await res.json();
        setResult(data);
        setStatus("done");
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [fileType]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { upload, status, result, error, reset };
}
