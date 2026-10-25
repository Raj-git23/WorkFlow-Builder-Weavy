// lib/fileValidation.ts

export const ALLOWED_FORMATS = {
  image: {
    extensions: ["jpg", "jpeg", "png", "webp", "gif"],
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeMB: 20,
    maxSizeBytes: 20 * 1024 * 1024,
  },
  video: {
    extensions: ["mp4", "mov", "webm", "m4v"],
    mimes: ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"],
    maxSizeMB: 100,
    maxSizeBytes: 100 * 1024 * 1024,
  },
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates file format, MIME type, and file size before upload.
 */
export function validateFile(
  file: File,
  fileType: "image" | "video"
): ValidationResult {
  const config = ALLOWED_FORMATS[fileType];
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // 1. Extension check
  if (!config.extensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file format '.${extension}'. Allowed: ${config.extensions.join(
        ", "
      )}`,
    };
  }

  // 2. MIME type check (if present)
  if (file.type && !config.mimes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type}). Allowed: ${config.extensions.join(
        ", "
      )}`,
    };
  }

  // 3. File size check
  if (file.size > config.maxSizeBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${config.maxSizeMB} MB`,
    };
  }

  return { valid: true };
}

/**
 * Validates a web URL string for correct protocol and compatible file extension/type.
 */
export function validateUrl(
  urlStr: string,
  fileType: "image" | "video"
): ValidationResult {
  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { valid: false, error: "URL cannot be empty" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "URL must start with http:// or https://" };
  }

  // Optional: check pathname extension if present
  const pathname = parsed.pathname.toLowerCase();
  const extMatch = pathname.match(/\.([a-z0-9]+)$/i);
  
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    const config = ALLOWED_FORMATS[fileType];
    if (!config.extensions.includes(ext)) {
      return {
        valid: false,
        error: `URL points to an unsupported '.${ext}' file. Allowed: ${config.extensions.join(
          ", "
        )}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Extracts a clean filename from a URL or fallback string.
 */
export function extractFileName(urlOrName: string): string {
  try {
    const parsed = new URL(urlOrName);
    const pathname = parsed.pathname;
    const name = pathname.split("/").pop();
    if (name && name.length > 0) {
      return decodeURIComponent(name);
    }
  } catch {
    // Not a URL, return clean string
  }
  
  const clean = urlOrName.split("/").pop() || urlOrName;
  return clean.length > 40 ? clean.substring(0, 37) + "..." : clean;
}
