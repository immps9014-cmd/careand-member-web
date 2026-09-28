"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";
import { canUseMemberApp } from "@/lib/role";
import { SOCIAL_SIGNUP_KEY } from "@/lib/auth/social";

/**
 * 카카오·구글 동의 후 복귀 (기능 33, 2026-09-28 S4).
 * 서버가 코드를 교환해 로그인 토큰을 주면 홈으로, 첫 가입이면 소셜 정보를 가입 화면으로 넘긴다
 * (sessionStorage — 30분짜리 가입 토큰이라 탭을 닫으면 사라져도 된다).
 */

function CallbackInner({ provider }: { provider: "kakao" | "google" }) {
  const q = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { setTokens, setUser } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const code = q.get("code"), state = q.get("state");
    if (q.get("error") || !code || !state) {
      setErr(q.get("error_description") || "로그인을 취소했거나 동의가 완료되지 않았어요.");
      return;
    }
    authApi
      .oauthCallback(provider, code, state)
      .then((r) => {
        if ("signup_required" in r && r.signup_required) {
          try { sessionStorage.setItem(SOCIAL_SIGNUP_KEY, JSON.stringify({ social_token: r.social_token, profile: r.profile })); } catch {}
          router.replace("/signup?social=1");
          return;
        }
        const d = r as Exclude<typeof r, { signup_required: true }>;
        if (!canUseMemberApp(d.user.role)) {
          setErr("회원앱을 이용할 수 없는 계정입니다.");
          return;
        }
        qc.clear();
        setTokens(d.access_token, d.refresh_token);
        setUser(d.user);
        router.replace("/home");
      })
      .catch((e) => setErr(getApiErrorMessage(e)));
  }, [q, provider, router, qc, setTokens, setUser]);

  return (
    <div className="min-h-screen bg-warm-50 p-5">
      <div className="mx-auto mt-24 max-w-sm text-center">
        {err ? (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-warm-400" />
            <h1 className="mt-4 text-lg font-bold text-warm-800">로그인하지 못했어요</h1>
            <p className="mt-1.5 text-sm text-warm-500">{err}</p>
            <Link href="/login"><Button variant="brand" size="lg" className="mt-6 w-full rounded-2xl">로그인 화면으로</Button></Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
            <h1 className="mt-4 text-lg font-bold text-warm-800">{provider === "kakao" ? "카카오" : "구글"} 계정을 확인하고 있어요</h1>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage({ params }: { params: { provider: string } }) {
  const p = params.provider === "google" ? "google" : "kakao";
  return (
    <Suspense fallback={null}>
      <CallbackInner provider={p} />
    </Suspense>
  );
}
