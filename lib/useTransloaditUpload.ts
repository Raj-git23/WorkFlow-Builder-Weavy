import { UploadResult, UploadFileStatus } from "@/types/filetypes";
import { useState, useCallback } from "react";


// To handle uploading img and vid on Transloadit

export function useTransloaditUpload(fileType: "image" | "video") {
  const [status, setStatus] = useState<UploadFileStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setStatus("uploading");
      setError(null);

      try {
        const body = new FormData();
        body.append("file", file);
        body.append("fileType", fileType); // for template selection

        const res = await fetch("/api/transloadit", { method: "POST", body });  // api calling

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
    [fileType],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { upload, status, result, error, reset };
}
