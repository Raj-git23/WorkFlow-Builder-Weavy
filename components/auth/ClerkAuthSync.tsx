"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useAuthStore } from "@/store/useAuthStore";

export default function ClerkAuthSync() {
  const { isLoaded, isSignedIn, userId, sessionId, orgId, orgRole } = useAuth();
  const { user } = useUser();

  const setAuthFromClerk = useAuthStore((state) => state.setAuthFromClerk);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (!isLoaded) {
      setAuthFromClerk({
        isLoaded: false,
        isSignedIn,
        userId: null,
        sessionId: null,
        orgId: null,
        orgRole: null,
        user: null,
      });
      return;
    }

    if (!isSignedIn) {
      clearAuth();
      return;
    }

    setAuthFromClerk({
      isLoaded: true,
      isSignedIn: true,
      userId,
      sessionId,
      orgId: orgId ?? null,
      orgRole: orgRole ?? null,
      user: user
        ? {
            id: user.id ?? null,
            email: user.primaryEmailAddress?.emailAddress ?? null,
            fullName: user.fullName ?? null,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            imageUrl: user.imageUrl ?? null,
            username: user.username ?? null,
            createdAt: user.createdAt ?? null,
            updatedAt: user.updatedAt ?? null,
            lastSignInAt: user.lastSignInAt ?? null,
          }
        : null,
    });
  }, [
    clearAuth,
    isLoaded,
    isSignedIn,
    orgId,
    orgRole,
    sessionId,
    setAuthFromClerk,
    user,
    userId,
  ]);

  return null;
}
