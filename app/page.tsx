"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/store";

// 메인 — 로그인 전 첫 화면(doc/design/통합돌봄메인이미지.jfif). 앱(/mapp·/mapp-partner) 첫 화면과 같은 이미지·색.
// 원본 아래의 그려진 「시작하기」 버튼은 눌리지 않아 잘라 내고(public/main_hero.jpg) 진짜 버튼을 붙인다.
// 버튼색은 이미지 버튼(#9A765C)을 흰 글자 대비 4.5:1 이 되게 한 단계 어둡게.
export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const hasHydrated = useAuth((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) router.replace("/home");
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-warm-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col bg-[#FDD8C8]">
      <div className="relative flex-1 flex items-end justify-center overflow-hidden bg-[#FBEBD4]">
        {/* PC 폭 — 양옆 빈칸에 같은 이미지를 흐리게 깔아 이음매를 없앤다(폰 폭은 폭을 다 채워 필요 없음) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app/main_hero.jpg" alt="" aria-hidden className="hidden md:block absolute inset-0 h-full w-full object-cover object-bottom scale-110 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/app/main_hero.jpg"
          width={572}
          height={905}
          alt="Care& AI 통합돌봄 플랫폼 — Care&이 제안하는 모두를 위한 통합돌봄. 함께하는 삶, 든든한 일상"
          className="relative block w-full max-w-[480px] h-auto max-h-[calc(100dvh-136px)] object-contain object-bottom"
        />
      </div>
      <div className="mx-auto w-full max-w-[480px] px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-stretch">
        <Link
          href="/login"
          className="flex h-14 items-center justify-center rounded-[14px] bg-[#8A664E] text-[17px] font-bold text-white hover:bg-[#7A5944] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A664E]"
        >
          시작하기
        </Link>
        <Link href="/signup" className="mt-1 py-3 text-center text-sm font-semibold text-[#8A664E] hover:underline">
          처음이신가요? 회원가입
        </Link>
      </div>
    </main>
  );
}
