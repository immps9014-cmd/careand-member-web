"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * 카카오·구글 로그인 버튼 (기능 33, 2026-09-28 S4). 서버에 앱 키가 등록된 제공자만 보인다 —
 * 키가 없으면 아무것도 그리지 않아 로그인 화면이 지금과 같다.
 */
export function SocialLoginButtons() {
  const q = useQuery({ queryKey: ["auth", "oauth-providers"], queryFn: authApi.oauthProviders, staleTime: 300_000, retry: false });
  const [busy, setBusy] = useState<string | null>(null);
  const on = q.data ? (Object.entries(q.data).filter(([, v]) => v).map(([k]) => k) as ("kakao" | "google")[]) : [];
  if (on.length === 0) return null;

  const go = async (p: "kakao" | "google") => {
    setBusy(p);
    try {
      window.location.href = await authApi.oauthUrl(p);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      setBusy(null);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs text-warm-400">
        <span className="h-px flex-1 bg-warm-200" />간편 로그인<span className="h-px flex-1 bg-warm-200" />
      </div>
      <div className="mt-3 grid gap-2">
        {on.includes("kakao") && (
          <button type="button" onClick={() => go("kakao")} disabled={busy !== null}
            className="h-11 w-full rounded-lg bg-[#FEE500] text-[16px] font-semibold text-[#191919] disabled:opacity-60">
            {busy === "kakao" ? "카카오로 이동 중…" : "카카오로 로그인"}
          </button>
        )}
        {on.includes("google") && (
          <button type="button" onClick={() => go("google")} disabled={busy !== null}
            className="h-11 w-full rounded-lg border border-warm-300 bg-white text-[16px] font-semibold text-warm-800 disabled:opacity-60">
            {busy === "google" ? "구글로 이동 중…" : "구글로 로그인"}
          </button>
        )}
      </div>
    </div>
  );
}
