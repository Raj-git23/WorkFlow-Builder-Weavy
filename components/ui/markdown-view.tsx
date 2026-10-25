"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-2 rounded border border-sidebar-border bg-[#0e0e11] overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#18171b] border-b border-sidebar-border text-[10px] text-sidebar-foreground/50 font-mono">
        <span>{className?.replace("language-", "") || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="nodrag flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={10} className="text-green-400" /> Copied
            </>
          ) : (
            <>
              <Copy size={10} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="nodrag nowheel custom-scrollbar p-2.5 overflow-x-auto text-[11px] font-mono text-[#e5e3ed] leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "nodrag nowheel custom-scrollbar overscroll-contain select-text overflow-y-auto text-xs text-sidebar-foreground/90 leading-relaxed font-sans pr-1.5",
        className
      )}
      onWheel={(e) => e.stopPropagation()}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-yellow-bg mt-3 mb-1 border-b border-sidebar-border/60 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-[#f2f0f8] mt-2.5 mb-1 flex items-center gap-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[11px] font-semibold text-yellow-bg/90 mt-2 mb-0.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1 text-xs text-sidebar-foreground/85 leading-relaxed">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-sidebar-foreground/80">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 my-1.5 space-y-0.5 text-xs text-sidebar-foreground/85">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 my-1.5 space-y-0.5 text-xs text-sidebar-foreground/85">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-xs leading-relaxed">{children}</li>
          ),
          hr: () => <hr className="border-sidebar-border/70 my-2.5" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-yellow-bg/60 pl-2.5 italic text-sidebar-foreground/75 my-2">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-[#2a2930] text-yellow-bg font-mono px-1 py-0.5 rounded text-[10.5px] border border-sidebar-border/50"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded border border-sidebar-border">
              <table className="min-w-full divide-y divide-sidebar-border text-[11px]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 bg-[#19181c] text-left font-semibold text-sidebar-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 border-t border-sidebar-border/50 text-sidebar-foreground/80">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
