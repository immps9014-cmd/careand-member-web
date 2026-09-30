"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Send, Phone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memberApi, type ChatMessage } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { SUPPORT } from "@/lib/support";

// 처음 쓰는 분이 무엇을 물어볼지 고민하지 않게 — 누르면 바로 질문이 된다
const STARTERS = [
  "돌봄 신청은 어떻게 하나요?",
  "장기요양 등급이 없어도 이용할 수 있나요?",
  "요금은 어떻게 정해지나요?",
  "돌봄전문가를 바꾸고 싶어요",
];

/** 보호자 AI 상담 — 가장 최근의 끝나지 않은 대화를 이어가고, 없으면 새로 시작한다. */
export default function ChatPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const boot = useMutation({
    mutationFn: async (fresh: boolean) => {
      if (!fresh) {
        const list = await memberApi.chatbotSessions();
        const open = list.find((s) => !s.ended_at);
        if (open) return open.id;
      }
      return (await memberApi.chatbotStart()).session_id;
    },
    onSuccess: (id) => setSessionId(id),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  useEffect(() => { boot.mutate(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const msgs = useQuery({
    queryKey: ["member", "chat", sessionId],
    queryFn: () => memberApi.chatbotMessages(sessionId!),
    enabled: sessionId != null,
  });

  const ask = useMutation({
    mutationFn: (q: string) => memberApi.chatbotAsk(sessionId!, q),
    onMutate: (q) => { setPending(q); setText(""); },
    onSettled: () => { setPending(null); qc.invalidateQueries({ queryKey: ["member", "chat", sessionId] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const list: ChatMessage[] = msgs.data ?? [];
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [list.length, pending]);

  const send = (q: string) => {
    const v = q.trim();
    if (!v || !sessionId || ask.isPending) return;
    ask.mutate(v);
  };
  const onlyWelcome = list.length <= 1 && !pending;

  return (
    <div className="flex min-h-[calc(100vh-78px)] flex-col lg:min-h-screen">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-warm-100 bg-white px-3 py-2">
        <button onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center rounded-full text-warm-600" aria-label="뒤로">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-warm-800">AI 상담</h1>
          <p className="text-xs text-warm-500">이용 방법·요금·돌봄 궁금한 점을 물어보세요</p>
        </div>
        <button
          onClick={() => boot.mutate(true)}
          className="flex h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-warm-600"
          disabled={boot.isPending}
        >
          <RotateCcw className="h-4 w-4" /> 새 대화
        </button>
      </header>

      <div className="flex-1 space-y-3 px-4 py-4" aria-live="polite">
        {(boot.isPending || msgs.isLoading) && <p className="py-10 text-center text-warm-500">대화를 여는 중…</p>}
        {list.map((m) => (
          <Bubble key={m.id} mine={m.role === "user"} text={m.content} />
        ))}
        {pending && <Bubble mine text={pending} />}
        {pending && <Bubble mine={false} text="답변을 쓰고 있어요…" muted />}

        {onlyWelcome && sessionId && (
          <div className="flex flex-wrap gap-2 pt-1">
            {STARTERS.map((q) => (
              <button key={q} onClick={() => send(q)} className="min-h-11 rounded-full border border-brand-200 bg-white px-4 py-2 text-left text-[15px] font-semibold text-brand-700">
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-2 text-center text-sm text-warm-600">
        사람과 상담하고 싶으면{" "}
        <a href={SUPPORT.tel} className="inline-flex items-center gap-1 font-bold text-brand-700 underline">
          <Phone className="h-3.5 w-3.5" /> 고객센터 {SUPPORT.phone}
        </a>
        <span className="text-warm-500"> ({SUPPORT.hours})</span>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(text); }}
        className="sticky bottom-[78px] flex gap-2 border-t border-warm-100 bg-white px-3 py-3 lg:bottom-0"
      >
        <label htmlFor="chat-input" className="sr-only">질문 입력</label>
        <textarea
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(text); } }}
          rows={1}
          maxLength={1000}
          placeholder="궁금한 점을 적어 주세요"
          className="min-h-12 flex-1 resize-none rounded-lg border border-warm-200 px-3.5 py-3 text-base text-warm-800 placeholder:text-warm-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
        />
        <Button type="submit" className="h-12 shrink-0 px-4" disabled={!text.trim() || !sessionId || ask.isPending} aria-label="보내기">
          <Send className="h-5 w-5" /> 보내기
        </Button>
      </form>
      <p className="sr-only"><Link href="/support">고객센터 안내</Link></p>
    </div>
  );
}

function Bubble({ mine, text, muted }: { mine: boolean; text: string; muted?: boolean }) {
  return (
    <div className={"flex " + (mine ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-base leading-relaxed " +
          (mine ? "rounded-br-md bg-brand-500 text-white" : "rounded-bl-md border border-warm-100 bg-white text-warm-800") +
          (muted ? " text-warm-500" : "")
        }
      >
        {text}
      </div>
    </div>
  );
}
