"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, BellOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { enablePush, disablePush, getPushState, sendTestPush, type PushState } from "@/lib/push";
import { getApiErrorMessage } from "@/lib/api/client";

/** 상태별 안내 — 고령 사용자가 다음에 무엇을 하면 되는지 한 문장으로 */
export const PUSH_HELP: Record<Exclude<PushState, "on" | "off">, string> = {
  "ios-install": "아이폰은 Safari 아래쪽 공유 버튼(□↑) → 「홈 화면에 추가」 후, 홈 화면의 케어앤 아이콘으로 열면 알림을 받을 수 있어요.",
  denied: "이 브라우저에서 알림이 막혀 있어요. 주소창 왼쪽 자물쇠(또는 설정 › 사이트 설정 › 알림)에서 케어앤 알림을 「허용」으로 바꿔 주세요.",
  unsupported: "이 브라우저는 알림을 지원하지 않아요. 크롬이나 삼성 인터넷으로 열어 주세요.",
};

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => { getPushState().then(setState).catch(() => setState("unsupported")); }, []);
  return [state, setState] as const;
}

/** 내 정보 — 「알림 받기」 카드 */
export function PushSettingsCard() {
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<PushState>, ok?: string) => {
    setBusy(true);
    try {
      const s = await fn();
      setState(s);
      if (s === "on" && ok) toast.success(ok);
      if (s === "denied") toast.error("알림이 허용되지 않았어요.");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-2 mb-2">
        {state === "on" ? <BellRing className="w-4 h-4 text-brand-600" /> : <BellOff className="w-4 h-4 text-warm-500" />}
        <h2 className="font-bold text-warm-800">알림 받기</h2>
      </div>
      <p className="text-sm text-warm-600">
        매칭 확정, 돌봄 시작·종료, 케어일지, 안전 알림을 앱을 열지 않아도 휴대폰으로 알려 드려요.
      </p>

      {state === null && <p className="mt-3 text-sm text-warm-500">확인 중…</p>}
      {state === "on" && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-brand-700">이 기기에서 알림을 받고 있어요.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={busy}
              onClick={async () => { setBusy(true); try { await sendTestPush(); toast.success("시험 알림을 보냈어요. 잠시 뒤 도착해요."); } catch (e) { toast.error(getApiErrorMessage(e)); } finally { setBusy(false); } }}>
              시험 알림 보내기
            </Button>
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => run(disablePush)}>알림 끄기</Button>
          </div>
        </div>
      )}
      {state === "off" && (
        <Button className="mt-3 w-full" size="lg" disabled={busy} onClick={() => run(enablePush, "알림을 켰어요.")}>
          {busy ? "켜는 중…" : "이 기기에서 알림 켜기"}
        </Button>
      )}
      {state && state !== "on" && state !== "off" && (
        <p className="mt-3 rounded-lg bg-warm-50 p-3 text-sm leading-relaxed text-warm-700">{PUSH_HELP[state]}</p>
      )}
    </Card>
  );
}
