"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  Folder,
  Plus,
  Search,
  List,
  LayoutGrid,
  Users,
  Wrench,
  Trash2,
  Workflow as WorkflowIcon,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowRight,
  Clock,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PRODUCT_MARKETING_KIT_TEMPLATE } from "@/lib/starter-template";

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
}

// Format relative timestamp helper
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "just now";
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
    if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
    if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "recently";
  }
}

// Templates list for the Workflow library carousel
const WORKFLOW_TEMPLATES = [
  {
    id: "product-marketing-kit",
    title: "Product Marketing Kit",
    isFeatured: true,
    badge: "Starter DAG",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    templateData: PRODUCT_MARKETING_KIT_TEMPLATE,
  },
  {
    id: "figma-weave-welcome",
    title: "Figma Weave Welcome",
    badge: "Intro",
    imageUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
  },
  {
    id: "illustration-machine",
    title: "Illustration Machine",
    badge: "Creative",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&q=80",
  },
  {
    id: "branded-video-creator",
    title: "Branded Video Creator",
    badge: "Video",
    imageUrl:
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80",
  },
  {
    id: "storyboard-machine",
    title: "Storyboard Machine",
    badge: "Cinema",
    imageUrl:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80",
  },
  {
    id: "compositor-node",
    title: "Compositor Node",
    badge: "Nodes",
    imageUrl:
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80",
  },
  {
    id: "image-to-video-models",
    title: "Image to Video Models",
    badge: "AI Models",
    imageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  },
];

export function WorkspaceDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "tutorials">("library");
  const [activeNav, setActiveNav] = useState<"myFiles" | "shared" | "tools" | "trash">("myFiles");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");

  // Fetch user's workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(Array.isArray(data.workflows) ? data.workflows : []);
      }
    } catch (e) {
      console.warn("Could not load workflows:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Create new blank workflow
  const handleCreateNewWorkflow = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const toastId = toast.loading("Creating new workflow...");

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Workflow",
          nodes: [],
          edges: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create workflow");

      toast.success("Workflow created!", { id: toastId });
      router.push(`/workflow/${data.workflow.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workflow", { id: toastId });
      setIsCreating(false);
    }
  };

  // Launch a starter template
  const handleLaunchTemplate = async (template: (typeof WORKFLOW_TEMPLATES)[0]) => {
    if (isCreating) return;
    setIsCreating(true);
    const toastId = toast.loading(`Loading "${template.title}" template...`);

    try {
      const templateData = template.templateData || PRODUCT_MARKETING_KIT_TEMPLATE;
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.title,
          nodes: templateData.nodes,
          edges: templateData.edges,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load template");

      toast.success(`Loaded "${template.title}"!`, { id: toastId });
      router.push(`/workflow/${data.workflow.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load template", { id: toastId });
      setIsCreating(false);
    }
  };

  // Delete a workflow
  const handleDeleteWorkflow = async (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/workflows?id=${workflowId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workflow");

      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      toast.success("Workflow deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  // Filter workflows by search term
  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter((w) => (w.name || "").toLowerCase().includes(q));
  }, [workflows, search]);

  const displayName = isLoaded && user ? user.fullName || user.firstName || "Creator" : "Workspace";

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#121214] text-[#f2f0f8] font-inter">
      {/* ---------------- LEFT SIDEBAR ---------------- */}
      <aside className="w-64 border-r border-[#202024] bg-[#141416] flex flex-col justify-between shrink-0 p-3 select-none">
        <div className="space-y-4">
          {/* User Profile Badge */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#1c1c20] transition-colors">
            <div className="flex items-center gap-2.5 truncate">
              <UserButton />
              <span className="text-sm font-medium text-neutral-200 truncate">
                {displayName}
              </span>
            </div>
            <span className="text-neutral-500 text-xs">⌄</span>
          </div>

          {/* + Create New File Button */}
          <button
            onClick={handleCreateNewWorkflow}
            disabled={isCreating}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Plus className="w-4 h-4 text-black stroke-[2.5]" />
            )}
            <span>Create New File</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveNav("myFiles")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left",
                activeNav === "myFiles"
                  ? "bg-[#25252a] text-white"
                  : "text-neutral-400 hover:text-white hover:bg-[#1a1a1e]"
              )}
            >
              <Folder className="w-4 h-4" />
              <span>My Files</span>
            </button>

            <button
              onClick={() => setActiveNav("shared")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left",
                activeNav === "shared"
                  ? "bg-[#25252a] text-white"
                  : "text-neutral-400 hover:text-white hover:bg-[#1a1a1e]"
              )}
            >
              <Users className="w-4 h-4" />
              <span>Shared with me</span>
            </button>

            <button
              onClick={() => setActiveNav("tools")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left",
                activeNav === "tools"
                  ? "bg-[#25252a] text-white"
                  : "text-neutral-400 hover:text-white hover:bg-[#1a1a1e]"
              )}
            >
              <Wrench className="w-4 h-4" />
              <span>Tools</span>
            </button>

            <button
              onClick={() => setActiveNav("trash")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left",
                activeNav === "trash"
                  ? "bg-[#25252a] text-white"
                  : "text-neutral-400 hover:text-white hover:bg-[#1a1a1e]"
              )}
            >
              <Trash2 className="w-4 h-4" />
              <span>Trash</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="pt-3 border-t border-[#202024] px-2 flex items-center justify-between text-neutral-400 text-xs">
          <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Community</span>
          </div>
          <span className="text-[10px] text-neutral-600 font-mono">v1.0</span>
        </div>
      </aside>

      {/* ---------------- MAIN WORKSPACE ---------------- */}
      <section className="flex-1 h-full overflow-y-auto bg-[#17171a] p-8 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Bar: Title & Action */}
          <div className="flex items-center justify-between">
            <h1 className="text-sm md:text-base font-semibold text-neutral-200 tracking-wide">
              {displayName}&apos;s Workspace
            </h1>

            <button
              onClick={handleCreateNewWorkflow}
              disabled={isCreating}
              className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              <span>Create New File</span>
            </button>
          </div>

          {/* ---------------- WORKFLOW LIBRARY CAROUSEL ---------------- */}
          <div className="bg-[#1c1c20] border border-[#27272c] rounded-2xl p-5 shadow-lg space-y-4">
            {/* Carousel Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("library")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    activeTab === "library"
                      ? "bg-[#27272f] text-white"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  Workflow library
                </button>
                <button
                  onClick={() => setActiveTab("tutorials")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    activeTab === "tutorials"
                      ? "bg-[#27272f] text-white"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  Tutorials
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer font-medium">
                <span>Browse on Figma Community</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>

            {/* Horizontal Cards Scroll */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5 pt-1 overflow-x-auto pb-1">
              {WORKFLOW_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleLaunchTemplate(tmpl)}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-[#141417] border border-[#27272c] hover:border-[#42424c] transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5"
                >
                  {/* Card Thumbnail */}
                  <div className="h-28 w-full relative overflow-hidden bg-black/40">
                    <img
                      src={tmpl.imageUrl}
                      alt={tmpl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {tmpl.isFeatured && (
                      <span className="absolute top-2 left-2 bg-[#f7ffa8] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        STARTER
                      </span>
                    )}
                  </div>

                  {/* Card Title */}
                  <div className="p-2.5">
                    <p className="text-[11px] font-medium text-neutral-200 group-hover:text-white truncate">
                      {tmpl.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------------- MY FILES SECTION ---------------- */}
          <div className="space-y-4">
            {/* Header: Title + Search & View Modes */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-neutral-200">My files</h2>

              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="flex items-center bg-[#1c1c20] border border-[#27272c] rounded-lg px-3 py-1.5 w-60 focus-within:border-neutral-500 transition-colors">
                  <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="ml-2 bg-transparent text-xs text-neutral-200 outline-none w-full placeholder:text-neutral-500"
                  />
                </div>

                {/* View Mode Buttons */}
                <div className="flex items-center bg-[#1c1c20] border border-[#27272c] rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      viewMode === "table"
                        ? "bg-[#27272f] text-white"
                        : "text-neutral-500 hover:text-neutral-300"
                    )}
                    title="List view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      viewMode === "grid"
                        ? "bg-[#27272f] text-white"
                        : "text-neutral-500 hover:text-neutral-300"
                    )}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-neutral-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#f7ffa8]" />
                <span className="text-xs">Loading workflows...</span>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              /* Empty State */
              <div className="h-64 border border-dashed border-[#27272c] rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-[#202026] flex items-center justify-center text-neutral-400 mb-3">
                  <WorkflowIcon className="w-6 h-6 text-[#f7ffa8]" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-200">
                  {search ? "No matching workflows found" : "No workflows created yet"}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  {search
                    ? "Try adjusting your search query."
                    : "Create a blank workflow or start with one of the pre-built templates above."}
                </p>
                {!search && (
                  <button
                    onClick={handleCreateNewWorkflow}
                    className="mt-4 bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    <span>Create Workflow</span>
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* ---------------- GRID VIEW (Screenshot 2) ---------------- */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredWorkflows.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/workflow/${item.id}`)}
                    className="group flex flex-col rounded-xl overflow-hidden bg-[#1c1c20] border border-[#27272c] hover:border-[#3e3e4a] transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {/* Visual Canvas Thumbnail Preview */}
                    <div className="h-36 w-full bg-[#121215] flex items-center justify-center relative p-3 border-b border-[#242429] overflow-hidden">
                      {/* Stylized mini-nodes layout representing canvas */}
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-4 bg-[#2b2b34] rounded-xs border border-white/10" />
                          <div className="w-6 h-4 bg-[#45a08a]/40 rounded-xs border border-[#45a08a]/60" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-4 bg-[#f1a0fa]/30 rounded-xs border border-[#f1a0fa]/60" />
                          <div className="w-7 h-4 bg-[#f7ffa8]/30 rounded-xs border border-[#f7ffa8]/60" />
                        </div>
                      </div>

                      {/* Delete button on hover */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWorkflow(item.id, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded transition-all cursor-pointer"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Card Info */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                        {item.name || "Untitled"}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Last edited {formatRelativeTime(item.updatedAt || item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ---------------- LIST VIEW (Screenshot 1) ---------------- */
              <div className="rounded-xl border border-[#27272c] bg-[#1c1c20] overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[3fr_1fr_1.5fr_1.5fr_40px] px-4 py-3 text-[11px] font-medium text-neutral-400 border-b border-[#27272c] select-none">
                  <span>Name</span>
                  <span>Files</span>
                  <span>Last modified</span>
                  <span>Created at</span>
                  <span />
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-[#242429]">
                  {filteredWorkflows.map((item) => {
                    const nodeCount = Array.isArray(item.nodes) ? item.nodes.length : 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => router.push(`/workflow/${item.id}`)}
                        className="grid grid-cols-[3fr_1fr_1.5fr_1.5fr_40px] px-4 py-3.5 items-center hover:bg-[#232328] transition-colors cursor-pointer group"
                      >
                        {/* Name + Thumbnail */}
                        <div className="flex items-center gap-3.5 min-w-0 pr-4">
                          <div className="h-10 w-16 bg-[#141417] border border-[#27272c] rounded-md flex items-center justify-center shrink-0">
                            <WorkflowIcon className="w-4 h-4 text-neutral-500 group-hover:text-[#f7ffa8] transition-colors" />
                          </div>
                          <span className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                            {item.name || "Untitled"}
                          </span>
                        </div>

                        {/* Files / Nodes count */}
                        <span className="text-xs text-neutral-400 font-mono">
                          {nodeCount > 0 ? `${nodeCount} nodes` : "—"}
                        </span>

                        {/* Last modified */}
                        <span className="text-xs text-neutral-300">
                          {formatRelativeTime(item.updatedAt || item.createdAt)}
                        </span>

                        {/* Created at */}
                        <span className="text-xs text-neutral-400">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>

                        {/* Actions */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteWorkflow(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 rounded transition-all cursor-pointer"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Table Footer: Pagination summary */}
                <div className="flex items-center justify-end gap-3 px-4 py-3 text-xs text-neutral-500 border-t border-[#27272c]">
                  <span>
                    1–{filteredWorkflows.length} of {filteredWorkflows.length}
                  </span>
                  <div className="flex items-center gap-1 text-neutral-400">
                    <button className="px-1.5 py-0.5 rounded hover:bg-[#27272f] text-neutral-500 cursor-not-allowed">
                      ‹
                    </button>
                    <button className="px-1.5 py-0.5 rounded hover:bg-[#27272f] text-neutral-500 cursor-not-allowed">
                      ›
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
