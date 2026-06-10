"use client";

import React, { useMemo, useState } from "react";
import CreateFileButton from "./CreateFileButton";
import {
  GalleryVerticalEnd,
  LayoutGrid,
  List,
  Plus,
  Search,
  SquarePlay,
  UserRound,
  Workflow,
} from "lucide-react";
import UserData from "@/components/auth/UserData";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";

const workspaceFiles = [
  {
    id: "1",
    name: "My First Weavy",
    lastModified: "4 hours ago",
    createdAt: "2 months ago",
    files: "-",
  },
  {
    id: "2",
    name: "untitled",
    lastModified: "2 months ago",
    createdAt: "2 months ago",
    files: "-",
  },
];

const Page = () => {
  const { user } = useAuthStore((state) => ({ user: state.user }));
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspaceFiles;
    return workspaceFiles.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <main className="flex bg-black h-screen text-white">
      <div className="w-72 p-2 border-r border-sidebar-border h-full space-y-7">
        <UserData />
        <CreateFileButton />

        <div className="font-inter text-sm space-y-1">
          <div className="flex items-center hover:cursor-pointer gap-2 bg-sidebar-background rounded-sm p-2.5">
            <GalleryVerticalEnd size={18} />My Files <Plus size={14} className='ml-auto' />
          </div>

          <div className="flex items-center hover:cursor-pointer text-white/50 hover:bg-sidebar-background rounded-sm p-2.5 gap-2">
            <UserRound size={18} />Shared with me
          </div>

          <div className="flex items-center hover:cursor-pointer hover:bg-sidebar-background rounded-sm p-2.5 gap-2">
            <SquarePlay size={18} />Apps
          </div>
        </div>
      </div>

      <div className="w-full h-full px-16 py-8 overflow-auto font-medium">
        <div className="flex items-center justify-between text-sm ">
          {`${user?.fullName}'s Workspace`}
          <CreateFileButton />
        </div>

        <div className="my-8">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">My files</h2>

            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 min-w-56">
                <Search size={14} className="text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="ml-2 bg-transparent text-sm w-full outline-none placeholder:text-white/40"
                />
              </div>

              <Button
                className={`p-2 rounded-sm ${
                  viewMode === "table" ? "bg-sidebar-background" : "hover:bg-sidebar-background bg-transparent"
                }`}
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <List size={16} />
              </Button>
              <Button
                className={`p-2 rounded-sm ${
                  viewMode === "grid" ? "bg-sidebar-background" : "hover:bg-sidebar-background bg-transparent"
                }`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </Button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(100px,200px))] gap-6 max-w-3xl">
              {filteredFiles.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="h-60 rounded-sm bg-sidebar-background border border-sidebar-border flex items-center justify-center">
                    <Workflow className="text-white/60" />
                  </div>

                  <div className="mt-1.5 space-y-1">
                    <p className="text-sm px-2 font-medium">{file?.name}</p>
                    <p className="text-xs px-2 text-white/50">Last edited {file?.lastModified}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[3fr_1fr_1fr_1fr] py-3 text-sm font-dmmono text-white/60">
                <p>Name</p>
                <p>Files</p>
                <p>Last modified</p>
                <p>Created at</p>
              </div>
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-[3fr_1fr_1fr_1fr] px-2 py-4 items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-32 rounded-md bg-sidebar-background border border-white/5 flex items-center justify-center">
                      <Workflow size={14} className="text-white/70" />
                    </div>
                    <p className="font-medium text-sm">{file.name}</p>
                  </div>
                  <p className="text-white/60 text-xs pl-2">{file.files}</p>
                  <p className="text-white/80 text-xs pl-2">{file.lastModified}</p>
                  <p className="text-white/80 text-xs pl-2">{file.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Page;