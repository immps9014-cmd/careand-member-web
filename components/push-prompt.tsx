"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, X } from "lucide-react";
import { enablePush } from "@/lib/push";
import { getApiErrorMessage } from "@/lib/api/client";
import { usePushState, PUSH_HELP } from "@/components/push-settings";

const KEY = "careand-push-prompt-dismissed";
const AGAIN_AFTER_MS = 7 * 24 * 3600 * 1000;   // 닫으면 일주일 뒤 다시

/** 홈 상단 「알림 켜기」 안내 — 아직 안 켠 사람에게만, 닫으면 일주일 동안 숨김 */
export function PushPrompt() {
  const [state, setState] = usePushState();
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(KEY) || 0);
      setHidden(Date.now() - at < AGAIN_AFTER_MS);
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || !(state === "off" || state === "ios-install")) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* 저장 못 해도 이번엔 숨김 */ }
  };

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-warm-800">돌봄 소식을 알림으로 받아 보세요</p>
        {state === "off" ? (
          <>
            <p className="mt-0.5 text-sm text-warm-600">매칭 확정·돌봄 시작·안전 알림을 바로 알려 드려요.</p>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const s = await enablePush();
                  setState(s);
                  if (s === "on") toast.success("알림을 켰어요.");
                  else if (s === "denied") toast.error(PUSH_HELP.denied);
                } catch (e) {
                  toast.error(getApiErrorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-2 h-11 rounded-lg bg-brand-500 px-4 text-[15px] font-bold text-white"
            >
              {busy ? "켜는 중…" : "알림 켜기"}
            </button>
          </>
        ) : (
          <p className="mt-0.5 text-sm leading-relaxed text-warm-600">{PUSH_HELP["ios-install"]}</p>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="닫기" className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-warm-500">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
