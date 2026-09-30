"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inAppBrowser, isIos, isAndroid, isStandalone, iosSupportsPush, iosVersion, kakaoOpenExternalUrl, type InAppBrowser } from "@/lib/platform";
import { hasInstallPrompt, takeInstallPrompt } from "@/components/pwa-register";

type Mode = "installed" | "inapp" | "ios-old" | "ios" | "android" | "desktop";

const APP_URL = "https://caren.aiclaude.kr/app/home";

function detect(): { mode: Mode; inapp: InAppBrowser } {
  const inapp = inAppBrowser();
  if (isStandalone()) return { mode: "installed", inapp };
  if (inapp) return { mode: "inapp", inapp };
  if (isIos()) return { mode: iosSupportsPush() ? "ios" : "ios-old", inapp };
  if (isAndroid()) return { mode: "android", inapp };
  return { mode: "desktop", inapp };
}

/**
 * 홈 화면에 케어앤 설치하기 — 아이폰은 설치한 앱에서만 알림이 오므로 단계별 그림으로 안내한다.
 * iOS 26 사파리는 공유 버튼이 「⋯」 안으로 들어가 두 경우를 함께 보여준다.
 */
export function InstallGuide() {
  const [d, setD] = useState<{ mode: Mode; inapp: InAppBrowser } | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  useEffect(() => {
    setD(detect());
    setCanPrompt(hasInstallPrompt());
    const on = () => setCanPrompt(true);
    window.addEventListener("careand:installable", on);
    return () => window.removeEventListener("careand:installable", on);
  }, []);
  if (!d) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      toast.success("주소를 복사했어요. 사파리 주소창에 붙여넣어 주세요.");
    } catch {
      toast(APP_URL);
    }
  };

  if (d.mode === "installed") {
    return (
      <Box>
        <p className="text-lg font-extrabold text-warm-800">이미 홈 화면 앱으로 쓰고 계세요 👍</p>
        <p className="mt-1 text-[15px] text-warm-600">내 정보 › 「알림 받기」에서 알림을 켜 두세요.</p>
      </Box>
    );
  }

  if (d.mode === "inapp") {
    const kakao = d.inapp === "kakaotalk";
    return (
      <Box>
        <p className="text-lg font-extrabold text-warm-800">먼저 {isIos() ? "사파리" : "크롬"}로 열어 주세요</p>
        <p className="mt-1 text-[15px] leading-relaxed text-warm-600">
          {kakao ? "카카오톡" : "지금 앱"} 안에서 연 화면은 홈 화면에 추가할 수 없어요.
        </p>
        {kakao ? (
          <Button asChild size="lg" className="mt-4 w-full">
            <a href={kakaoOpenExternalUrl(APP_URL)}><ExternalLink className="h-5 w-5" /> {isIos() ? "사파리" : "기본 브라우저"}로 열기</a>
          </Button>
        ) : (
          <ol className="mt-3 space-y-2 text-[15px] text-warm-700">
            <li>1. 화면 오른쪽 위나 아래의 <b>⋯</b> 또는 <b>공유</b> 버튼을 누르세요.</li>
            <li>2. <b>「{isIos() ? "Safari로 열기" : "다른 브라우저로 열기"}」</b>를 고르세요.</li>
          </ol>
        )}
        <Button variant="outline" className="mt-2 w-full" onClick={copyLink}><Copy className="h-4 w-4" /> 주소 복사하기</Button>
      </Box>
    );
  }

  if (d.mode === "ios-old") {
    const v = iosVersion();
    return (
      <Box>
        <p className="text-lg font-extrabold text-warm-800">아이폰 업데이트가 필요해요</p>
        <p className="mt-1 text-[15px] leading-relaxed text-warm-600">
          알림은 iOS 16.4 이상에서 받을 수 있어요{v ? ` (지금 ${v[0]}.${v[1]})` : ""}.
          설정 › 일반 › 소프트웨어 업데이트에서 업데이트한 뒤 다시 열어 주세요. 앱은 지금도 사파리에서 쓸 수 있어요.
        </p>
      </Box>
    );
  }

  if (d.mode === "android" || d.mode === "desktop") {
    return (
      <Box>
        <p className="text-lg font-extrabold text-warm-800">케어앤을 앱처럼 설치하세요</p>
        {canPrompt ? (
          <Button
            size="lg"
            className="mt-4 w-full"
            onClick={async () => {
              const e = takeInstallPrompt();
              setCanPrompt(false);
              if (!e) return;
              await e.prompt();
              const c = await e.userChoice;
              if (c.outcome === "accepted") toast.success("설치했어요. 홈 화면의 케어앤 아이콘으로 여세요.");
            }}
          >
            홈 화면에 설치하기
          </Button>
        ) : (
          <ol className="mt-3 space-y-2 text-[15px] leading-relaxed text-warm-700">
            <li>1. 브라우저 오른쪽 위 <b>⋮</b> 메뉴를 누르세요.</li>
            <li>2. <b>「앱 설치」</b> 또는 <b>「홈 화면에 추가」</b>를 누르세요.</li>
            <li>3. 홈 화면에 생긴 <b>케어앤</b> 아이콘으로 여세요.</li>
          </ol>
        )}
      </Box>
    );
  }

  // 아이폰 사파리(크롬 등 포함) — 그림 단계
  return (
    <div className="space-y-3">
      <Step n={1} title="공유 버튼을 누르세요" desc="사파리 아래쪽의 공유 버튼이에요. 안 보이면 오른쪽 아래 ⋯ 를 누른 뒤 「공유」를 누르세요.">
        <div className="flex items-center justify-center gap-6">
          <ShareIcon />
          <span className="text-sm text-warm-500">또는</span>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warm-100 text-2xl font-black text-warm-700">⋯</span>
        </div>
      </Step>
      <Step n={2} title="「홈 화면에 추가」를 누르세요" desc="목록을 위로 올리면 보여요.">
        <div className="mx-auto flex max-w-[260px] items-center justify-between rounded-xl border border-warm-200 bg-white px-4 py-3 text-[15px] font-semibold text-warm-800">
          홈 화면에 추가 <AddIcon />
        </div>
      </Step>
      <Step n={3} title="오른쪽 위 「추가」를 누르세요" desc="「웹 앱으로 열기」가 보이면 켜 둔 채로 두세요.">
        <div className="mx-auto flex max-w-[260px] items-center justify-between rounded-xl bg-warm-100 px-4 py-3 text-[15px]">
          <span className="text-warm-500">취소</span>
          <span className="font-bold text-warm-800">홈 화면에 추가</span>
          <span className="font-bold text-[#007AFF]">추가</span>
        </div>
      </Step>
      <Step n={4} title="홈 화면의 케어앤 아이콘으로 여세요" desc="처음 한 번은 다시 로그인해야 해요. 그다음 「알림 켜기」를 누르면 끝이에요.">
        <div className="flex flex-col items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/app/apple-touch-icon.png" alt="" width={60} height={60} className="rounded-[14px] shadow" />
          <span className="text-sm font-semibold text-warm-700">케어앤</span>
        </div>
      </Step>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-warm-100 bg-white p-5">{children}</div>;
}

function Step({ n, title, desc, children }: { n: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-warm-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-extrabold text-white">{n}</span>
        <div className="min-w-0">
          <p className="text-[17px] font-extrabold text-warm-800">{title}</p>
          <p className="mt-0.5 text-[15px] leading-relaxed text-warm-600">{desc}</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-warm-50 py-4">{children}</div>
    </div>
  );
}

/** iOS 공유 아이콘(□↑) */
function ShareIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-label="공유 버튼" role="img">
      <circle cx="28" cy="28" r="28" fill="#fff" />
      <g fill="none" stroke="#007AFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 12v20M21 18l7-7 7 7" />
        <path d="M20 25h-3v19h22V25h-3" />
      </g>
    </svg>
  );
}

/** 「홈 화면에 추가」 옆 아이콘(⊞) */
function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="#1C2030" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke="#1C2030" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
