import type { CSSProperties, ReactNode } from "react";

export function PreviewArea({
  children,
  adaptive = false,
  className = "",
  style,
}: {
  children?: ReactNode;
  adaptive?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative w-full rounded-sm overflow-hidden shrink-0 ${
        adaptive ? "h-auto" : "h-64"
      } ${className}`}
      style={{
        backgroundImage:
          "repeating-conic-gradient(#2a2a2f 0% 25%, #1e1e1e 0% 50%)",
        backgroundSize: "20px 20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

