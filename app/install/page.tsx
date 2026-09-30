"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InstallGuide } from "@/components/install-guide";
import { SeniorModeToggle } from "@/components/senior-mode-toggle";

/** 홈 화면에 설치하기 — 로그인 없이도 열 수 있다(가입 전 안내·QR 링크용) */
export default function InstallPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-warm-50 px-4 pt-3 pb-10">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <button onClick={() => (history.length > 1 ? router.back() : router.push("/home"))} className="flex h-11 items-center gap-1 text-sm font-semibold text-warm-600">
            <ChevronLeft className="h-5 w-5" /> 뒤로
          </button>
          <SeniorModeToggle />
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-warm-800">홈 화면에 케어앤 설치하기</h1>
        <p className="mt-1 mb-5 text-[15px] leading-relaxed text-warm-600">
          설치하면 앱처럼 한 번에 열리고, 매칭·돌봄·안전 알림을 휴대폰으로 받을 수 있어요.
        </p>
        <InstallGuide />
      </div>
    </div>
  );
}
