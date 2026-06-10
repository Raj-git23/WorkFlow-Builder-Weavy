import { create } from "zustand";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthUser {
  id: string | null;
  email: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  username: string | null;
  createdAt: Date | number |null;
  updatedAt: Date | number |null;
  lastSignInAt: Date | number | null;
}

interface ClerkSnapshot {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
  orgRole: string | null;
  user: AuthUser | null;
}

interface AuthStore extends ClerkSnapshot {
  status: AuthStatus;
  setAuthFromClerk: (snapshot: ClerkSnapshot) => void;
  clearAuth: () => void;
}

const defaultState: ClerkSnapshot = {
  isLoaded: false,
  isSignedIn: undefined,
  userId: null,
  sessionId: null,
  orgId: null,
  orgRole: null,
  user: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...defaultState,
  status: "loading",
  setAuthFromClerk: (snapshot) =>
    set({
      ...snapshot,
      status: !snapshot.isLoaded
        ? "loading"
        : snapshot.isSignedIn
        ? "authenticated"
        : "unauthenticated",
    }),
  clearAuth: () =>
    set({
      ...defaultState,
      isLoaded: true,
      status: "unauthenticated",
    }),
}));
