export function PreviewArea({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="relative w-full rounded-sm overflow-hidden h-64 shrink-0"
      style={{
        backgroundImage:
          "repeating-conic-gradient(#2a2a2f 0% 25%, #1e1e1e 0% 50%)",
        backgroundSize: "20px 20px",
      }}
    >
      {children}
    </div>
  );
}

