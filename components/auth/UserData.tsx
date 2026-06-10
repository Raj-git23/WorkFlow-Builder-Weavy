"use client";

import { UserButton } from "@clerk/nextjs";
import { useAuthStore } from "@/store/useAuthStore";

export default function UserData() {
  const { status, isSignedIn, user } = useAuthStore((state) => ({
    status: state.status,
    isSignedIn: state.isSignedIn,
    user: state.user,
  }));

  if (status === "loading") return <div>Loading auth data...</div>;
  if (!isSignedIn) return <div>Please sign in.</div>;

  const displayName = user?.fullName || "Unknown";

  return (
    <div className="bg-transparent hover:bg-sidebar-background text-sm font-medium font-inter inline-flex items-center gap-2 rounded-xs hover:cursor-pointer p-2">
      <UserButton />
      <span>{displayName}</span>
    </div>
  );
}