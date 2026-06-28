import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 미들웨어(서버/엣지)는 localStorage를 못 읽으므로, /app 서버사이드 게이트용
 * "인증 존재 플래그" 쿠키를 별도로 둔다. 토큰 자체가 아니라 존재 여부만 담는다
 * (실제 보안 경계는 백엔드 API의 auth:api — 토큰 없이는 401).
 */
const AUTH_COOKIE = "careand_auth";

export function setAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE}=1; path=/app; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
  }
}

export function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE}=; path=/app; max-age=0; SameSite=Lax; Secure`;
  }
}

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

      setTokens: (accessToken, refreshToken) => {
        setAuthCookie();
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        clearAuthCookie();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
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
