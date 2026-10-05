import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { authStore, takeLegacyRefreshToken } from "@/lib/auth/store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Axios 인스턴스 — 로그인 토큰은 httpOnly 쿠키(백엔드 AuthCookieBridge, 2026-10-05).
 * - X-Auth-Mode: cookie → 로그인·갱신 응답의 토큰이 쿠키로 오고 본문에서 빠진다(JS 로 읽을 수 없음 = XSS 로 못 훔침)
 * - X-Requested-With → 쿠키로 인증하는 쓰기 요청의 CSRF 표시(없으면 419)
 * - 401 이면 리프레시 쿠키로 한 번 갱신 후 재시도
 */
const AUTH_HEADERS = { "X-Auth-Mode": "cookie", "X-Requested-With": "XMLHttpRequest" };

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...AUTH_HEADERS,
  },
});

// === 예전 판(localStorage 토큰) 사용자 — 첫 요청 전에 리프레시 토큰을 쿠키로 바꾼다 ===
let legacyExchange: Promise<void> | null = null;
function exchangeLegacy(): Promise<void> {
  if (legacyExchange) return legacyExchange;
  const rt = takeLegacyRefreshToken();
  legacyExchange = rt
    ? axios
        .post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true, headers: { ...AUTH_HEADERS, Authorization: `Bearer ${rt}` } })
        .then(() => undefined)
        .catch(() => undefined)   // 실패하면 다음 요청이 401 → 로그인 화면
    : Promise.resolve();
  return legacyExchange;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await exchangeLegacy();
  return config;
});

// === Response: 401 자동 갱신(리프레시 쿠키) ===
let refreshing: Promise<void> | null = null;

function refreshOnce(): Promise<void> {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true, headers: AUTH_HEADERS })
      .then(() => undefined)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== "/v1/auth/refresh" &&
      originalRequest.url !== "/v1/auth/login"
    ) {
      originalRequest._retry = true;
      try {
        await refreshOnce();
        return api(originalRequest);
      } catch (refreshError) {
        // 갱신 실패 → 로그아웃(로그인 상태였을 때만 로그인 화면으로)
        const wasIn = authStore.getState().isAuthenticated;
        authStore.getState().logout();
        if (wasIn && typeof window !== "undefined" && !window.location.pathname.endsWith("/login")) {
          window.location.href = "/app/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Care& API 표준 응답 형식
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error_code?: string;
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
    per_page?: number;
    [key: string]: unknown;
  };
}

/**
 * API 에러 추출
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse | undefined;
    return data?.message || error.message || "알 수 없는 오류가 발생했습니다.";
  }
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

/**
 * 에러의 HTTP 상태코드 추출(없으면 undefined — 네트워크 오류 등).
 * 404(자원 없음)와 일시 오류(5xx·네트워크)를 구분할 때 사용.
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
