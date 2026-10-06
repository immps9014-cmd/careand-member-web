"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 모바일 앱 구글(카카오) 로그인 복귀 대체 화면 (2026-10-07).
 * 앱은 구글 동의를 외부 브라우저로 열고, 서버는 복귀 주소를 /app/auth/app/{guardian|caregiver}/{provider} 로 준다.
 * 보통은 Android 앱 링크가 이 주소를 앱으로 바로 넘겨 이 화면은 뜨지 않는다. 앱 링크 확인 전(서명 지문 미등록)이거나
 * 브라우저가 넘기지 않으면 여기서 같은 주소를 intent:// 로 앱에 넘긴다 — 코드는 여기서 쓰지 않는다(앱이 서버에 교환).
 */
const PACKAGES: Record<string, { pkg: string; name: string }> = {
  guardian: { pkg: "kr.co.careand.app", name: "케어앤" },
  caregiver: { pkg: "kr.co.careand.partner", name: "케어앤 파트너" },
};

function AppReturnInner({ app, provider }: { app: string; provider: string }) {
  const q = useSearchParams();
  const [android, setAndroid] = useState<boolean | null>(null);
  const target = PACKAGES[app];

  // 주소는 브라우저에서만 만든다(서버 렌더 값과 달라도 하이드레이션은 href 를 고치지 않으므로 state 로)
  const [intentUrl, setIntentUrl] = useState("");

  useEffect(() => {
    if (!target) return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    setAndroid(isAndroid);
    const url = `intent://${window.location.host}/app/auth/app/${app}/${provider}?${q.toString()}#Intent;scheme=https;package=${target.pkg};end`;
    setIntentUrl(url);
    if (isAndroid) window.location.href = url; // 막히면 아래 버튼으로
  }, [app, provider, q, target]);

  return (
    <div className="min-h-screen bg-warm-50 p-5">
      <div className="mx-auto mt-24 max-w-sm text-center">
        {!target ? (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-warm-400" />
            <h1 className="mt-4 text-lg font-bold text-warm-800">잘못된 주소예요</h1>
          </>
        ) : (
          <>
            <Smartphone className="mx-auto h-12 w-12 text-brand-500" />
            <h1 className="mt-4 text-lg font-bold text-warm-800">{target.name} 앱으로 돌아가 로그인을 마쳐 주세요</h1>
            {android === false ? (
              <p className="mt-1.5 text-sm text-warm-500">이 화면은 {target.name} 앱에서 로그인할 때만 쓰여요. 앱을 열어 다시 시도해 주세요.</p>
            ) : (
              <>
                <p className="mt-1.5 text-sm text-warm-500">앱이 자동으로 열리지 않으면 아래 버튼을 눌러 주세요.</p>
                <a href={intentUrl || undefined}>
                  <Button variant="brand" size="lg" className="mt-6 w-full rounded-2xl">{target.name} 앱 열기</Button>
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AppOAuthReturnPage({ params }: { params: { app: string; provider: string } }) {
  return (
    <Suspense fallback={null}>
      <AppReturnInner app={params.app} provider={params.provider === "kakao" ? "kakao" : "google"} />
    </Suspense>
  );
}
