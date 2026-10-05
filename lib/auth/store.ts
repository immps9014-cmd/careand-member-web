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
  phone?: string;
  name: string;
  role: "guardian" | "caregiver" | "organization" | "admin";
  status: string;
  // 보호자 부가정보(로그인 응답 user.guardian). intent로 홈 서비스 허브 featured 개인화.
  guardian?: {
    id: number;
    intent?: "care" | "housekeeping" | "postpartum" | "childcare" | "mental_care";
    relation?: string | null;
    /** 가입 때 고른 주로 이용할 서비스(선택 순서) */
    preferences?: { services?: string[] } | null;
  } | null;
  admin?: {
    permission_level: "super" | "operator" | "cs" | "analyst";
    department: string | null;
  };
}

/**
 * 로그인 토큰은 브라우저 저장소에 두지 않는다(2026-10-05) — 백엔드가 httpOnly 쿠키(caren_at·caren_rt)로 주고받고,
 * 이 스토어는 사용자 정보와 로그인 여부만 기억한다(lib/api/client.ts 가 X-Auth-Mode: cookie 를 보낸다).
 * 예전 판(version 0)은 localStorage 에 토큰이 있었다 — 첫 로드 때 그 리프레시 토큰을 쿠키로 바꾸고 지운다(legacyRefreshToken).
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setUser: (user: User) => void;
  setHasHydrated: (v: boolean) => void;
  /** 로그인·가입 성공 표시(토큰은 쿠키로 이미 받음). 인자는 예전 호출부 호환용으로 무시한다 */
  setTokens: (_accessToken?: string, _refreshToken?: string) => void;
  logout: () => void;
}

let legacyRefresh: string | null = null;
/** 예전 판에서 옮겨 온 리프레시 토큰(한 번만 꺼낼 수 있다) */
export function takeLegacyRefreshToken(): string | null {
  const t = legacyRefresh;
  legacyRefresh = null;
  return t;
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setHasHydrated: (v) => set({ hasHydrated: v }),

      setTokens: () => {
        setAuthCookie();
        set({ isAuthenticated: true });
      },

      logout: () => {
        clearAuthCookie();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "careand-member-auth",
      version: 1,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // version 0(토큰 보관) → 1: 리프레시 토큰만 메모리로 빼 두고 저장소에서는 지운다
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as { user?: User | null; isAuthenticated?: boolean; refreshToken?: string | null };
        if (version < 1 && old.refreshToken) legacyRefresh = old.refreshToken;
        return { user: old.user ?? null, isAuthenticated: !!old.isAuthenticated } as unknown as AuthState;
      },
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
