"use client";

import { UserButton, SignInButton } from "@clerk/nextjs";
import { useAuthStore } from "@/store/useAuthStore";

export default function UserData() {
  const { status, isSignedIn, user } = useAuthStore((state) => ({
    status: state.status,
    isSignedIn: state.isSignedIn,
    user: state.user,
  }));

  if (status === "loading") {
    return <div className="text-[11px] text-[#80808e] px-1">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="text-xs font-medium text-[#f7ffa8] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer">
          Sign In
        </button>
      </SignInButton>
    );
  }

  const displayName = user?.fullName || "Unknown";

  return (
    <div className="bg-transparent hover:bg-sidebar-background text-xs font-medium font-inter inline-flex items-center gap-2 rounded-md hover:cursor-pointer p-1.5 transition-colors">
      <UserButton />
      <span className="text-[#f2f0f8] font-medium text-xs truncate max-w-[120px]">{displayName}</span>
    </div>
  );
}