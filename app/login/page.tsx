"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { useAuth, setAuthCookie } from "@/lib/auth/store";
import { canUseMemberApp } from "@/lib/role";
import { getApiErrorMessage } from "@/lib/api/client";

/** 로그인 후 돌아갈 내부 경로. 외부/프로토콜 리다이렉트 차단(오픈 리다이렉트 방지). */
function safeRedirect(): string {
  if (typeof window === "undefined") return "/home";
  const r = new URLSearchParams(window.location.search).get("redirect");
  // 반드시 단일 슬래시로 시작하는 앱 내부 경로만 허용("//", "/\" 등은 차단)
  if (r && /^\/(?![/\\])/.test(r)) return r;
  return "/home";
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens, isAuthenticated, hasHydrated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 로그인→회원가입 이동 시에도 복귀 URL(redirect)을 이어받는다.
  const [signupHref, setSignupHref] = useState("/signup");
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    if (r && /^\/(?![/\\])/.test(r)) setSignupHref(`/signup?redirect=${encodeURIComponent(r)}`);
  }, []);

  // 기존 세션 자가복구: localStorage엔 로그인돼 있으나 게이트 쿠키가 없어
  // 미들웨어에 튕겨온 경우 — 쿠키를 심고 홈으로 복귀시킨다(강제 재로그인 방지).
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      setAuthCookie();
      router.replace(safeRedirect());
    }
  }, [hasHydrated, isAuthenticated, router]);

  const loginMutation = useMutation({
    mutationFn: async () => authApi.login(email, password),
    onSuccess: (data) => {
      if (data.user.role === "admin") {
        toast.error("관리자는 관리자 콘솔(/admin)로 접속하세요.");
        return;
      }
      if (!canUseMemberApp(data.user.role)) {
        toast.error("회원앱을 이용할 수 없는 계정입니다.");
        return;
      }
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      toast.success(`${data.user.name} 님 환영합니다`);
      router.push(safeRedirect());
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-brand-50 to-warm-100 flex items-center justify-center p-4">
      {/* 공개 웹(/www)으로 돌아가기 — basePath(/app) 바깥이라 일반 a 태그 */}
      <a
        href="/www"
        className="absolute top-4 left-4 inline-flex items-center gap-0.5 text-sm font-semibold text-warm-600 hover:text-brand-600"
        aria-label="Care& 홈으로 돌아가기"
      >
        ← 홈으로
      </a>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl flex items-center justify-center font-en font-extrabold text-white text-3xl shadow-lg">
              C
            </div>
            <div>
              <div className="font-en font-extrabold text-2xl text-warm-800 tracking-tight leading-none">
                Care&
              </div>
              <div className="text-xs text-warm-500 mt-1.5">생애 전주기 통합돌봄</div>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">회원 로그인</CardTitle>
            <CardDescription>보호자·돌봄전문가·기관 회원 계정으로 로그인하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-semibold text-warm-700 block mb-1.5">아이디</label>
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-warm-700 block mb-1.5">비밀번호</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 text-center">
          <span className="text-sm text-warm-500">아직 회원이 아니신가요? </span>
          <Link href={signupHref} className="text-sm font-bold text-brand-600 hover:text-brand-700">
            회원가입
          </Link>
        </div>

        <p className="text-center text-xs text-warm-500 mt-6">
          © 2026 Care&. 보호자·돌봄전문가·기관 회원 앱
        </p>
      </div>
    </div>
  );
}
