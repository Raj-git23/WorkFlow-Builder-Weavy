// lib/useTransloaditUpload.ts
import { UploadResult, UploadFileStatus } from "@/types/filetypes";
import { useState, useCallback } from "react";

// Handles uploading images and videos (from File or URL) on Transloadit.
// For files, direct client-to-Transloadit uploading is used to bypass Vercel's 4.5MB Serverless Function payload limit.
export function useTransloaditUpload(fileType: "image" | "video") {
  const [status, setStatus] = useState<UploadFileStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = useCallback(
    async (input: File | string): Promise<UploadResult | null> => {
      setStatus("uploading");
      setError(null);

      try {
        if (typeof input === "string") {
          // Send URL payload for server-side fetch & Transloadit processing
          const res = await fetch("/api/transloadit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: input, fileType }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error ?? "Failed to process media URL");
          }

          const data: UploadResult = await res.json();
          setResult(data);
          setStatus("done");
          return data;
        }

        // Direct Client-to-Transloadit Upload for File objects
        // 1. Fetch signed parameters from our server route
        let signedParamsData: { signature?: string; params?: string } | null = null;
        try {
          const sigRes = await fetch(`/api/transloadit?fileType=${fileType}`);
          if (sigRes.ok) {
            signedParamsData = await sigRes.json();
          }
        } catch (e) {
          console.warn("Could not retrieve signed Transloadit params:", e);
        }

        if (signedParamsData?.params && signedParamsData?.signature) {
          // Upload directly to Transloadit's assembly API
          const tlForm = new FormData();
          tlForm.append("params", signedParamsData.params);
          tlForm.append("signature", signedParamsData.signature);
          tlForm.append("file", input);

          const tlRes = await fetch("https://api2.transloadit.com/assemblies", {
            method: "POST",
            body: tlForm,
          });

          if (!tlRes.ok) {
            const errJson = await tlRes.json().catch(() => ({}));
            throw new Error(errJson.message || `Transloadit assembly request failed (${tlRes.status})`);
          }

          let assembly = await tlRes.json();

          if (assembly.error) {
            throw new Error(assembly.message || "File rejected by Transloadit security/validation scan");
          }

          // If assembly is still processing/uploading, poll until complete
          const pollUrl = assembly.assembly_ssl_url || assembly.assembly_url;
          const startTime = Date.now();
          const timeoutMs = 120000; // 2 minutes timeout

          while (
            assembly &&
            pollUrl &&
            (assembly.ok === "ASSEMBLY_UPLOADING" ||
              assembly.ok === "ASSEMBLY_EXECUTING" ||
              assembly.ok === "ASSEMBLY_REPLAYING") &&
            Date.now() - startTime < timeoutMs
          ) {
            await new Promise((r) => setTimeout(r, 1000));
            const pollRes = await fetch(pollUrl);
            if (pollRes.ok) {
              assembly = await pollRes.json();
            }
          }

          if (assembly?.error) {
            throw new Error(assembly.message || "Assembly execution encountered an error");
          }

          const uploads = assembly?.uploads ?? [];
          const steps = assembly?.results ?? {};
          const allStepResults = Object.values(steps).flat();
          const validStep = allStepResults.find(
            (r: any) => r?.ssl_url && !r.ssl_url.includes("/scratch/")
          );

          const finalUrl =
            (validStep as any)?.ssl_url ||
            (allStepResults[0] as any)?.ssl_url ||
            uploads[0]?.ssl_url;

          const mimeType =
            (validStep as any)?.mime ||
            (allStepResults[0] as any)?.mime ||
            uploads[0]?.mime ||
            (fileType === "image" ? "image/jpeg" : "video/mp4");

          if (finalUrl) {
            const data: UploadResult = {
              url: finalUrl,
              mimeType,
              name: input.name,
            };
            setResult(data);
            setStatus("done");
            return data;
          }
        }

        // Fallback: If direct Transloadit signing wasn't configured, proxy via /api/transloadit
        // (will work for smaller files under Vercel's limit or in local development)
        const body = new FormData();
        body.append("file", input);
        body.append("fileType", fileType);
        const res = await fetch("/api/transloadit", { method: "POST", body });

        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({}));
          throw new Error(msg ?? (res.status === 413 ? "File too large for server proxy" : "Upload failed"));
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
