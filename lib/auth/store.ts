import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "guardian" | "caregiver" | "organization" | "admin";
  status: string;
  admin?: {
    permission_level: "super" | "operator" | "cs" | "analyst";
    department: string | null;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setUser: (user: User) => void;
  setHasHydrated: (v: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setHasHydrated: (v) => set({ hasHydrated: v }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "careand-member-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // persist 복원 완료 후에만 인증 판정을 하도록 플래그 세팅
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * React 훅 (컴포넌트 내부 사용)
 */
export const useAuth = authStore;
