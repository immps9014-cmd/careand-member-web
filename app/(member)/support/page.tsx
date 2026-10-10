"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Phone, MessageCircle, BookOpen, Bell, ChevronRight, KeyRound, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/store";
import { usesCaregiverShell } from "@/lib/role";
import { SUPPORT } from "@/lib/support";
import { useQuery } from "@tanstack/react-query";
import { contentsApi, faqFrom } from "@/lib/api/contents";
import { ContentBlocks } from "@/components/content-blocks";

// 자주 묻는 질문 — 관리자 「안내 콘텐츠」(placement support) 우선, 아래는 못 받을 때 쓰는 기준 목록.
// 화면에서 바로 답할 수 있는 것만. 나머지는 AI 상담·전화로.
const FAQ: { q: string; a: string }[] = [
  { q: "신청한 돌봄을 취소하고 싶어요", a: "홈 「내 매칭 요청」에서 요청을 누르고 「요청 취소」를 누르세요. 돌봄전문가가 확정된 뒤에는 고객센터로 전화 주세요." },
  { q: "돌봄전문가를 바꾸고 싶어요", a: "고객센터로 전화 주시면 사정을 듣고 다른 분으로 연결해 드려요." },
  { q: "결제는 언제 하나요?", a: "돌봄전문가가 확정되면 홈 요청 카드에 「결제하기」 버튼이 생겨요. 결제를 마치면 일정이 시작돼요." },
  { q: "아이디나 비밀번호를 잊었어요", a: "로그인 화면의 「아이디 찾기」「비밀번호 재설정」에서 가입한 휴대폰으로 확인할 수 있어요." },
];

export default function SupportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isCaregiver = user ? usesCaregiverShell(user.role) : false;
  const faqQ = useQuery({
    queryKey: ["public", "contents", "support", isCaregiver ? "caregiver" : "guardian"],
    queryFn: () => contentsApi.list({ placement: "support", audience: isCaregiver ? "caregiver" : "guardian" }),
    staleTime: 10 * 60_000, retry: false,
  });
  const faq = faqFrom(faqQ.data, FAQ);

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="mb-3 flex h-10 items-center gap-1 text-sm text-warm-600">
        <ChevronLeft className="h-4 w-4" /> 뒤로
      </button>
      <h1 className="text-2xl font-extrabold text-warm-800">고객센터</h1>
      <p className="mt-1 text-sm text-warm-600">무엇이든 편하게 물어보세요.</p>

      <Card className="mt-5 p-5">
        <div className="text-sm font-semibold text-warm-600">전화 상담 · {SUPPORT.hours}</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight text-warm-800 tabular-nums">{SUPPORT.phone}</div>
        <a
          href={SUPPORT.tel}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-lg font-extrabold text-white"
        >
          <Phone className="h-5 w-5" /> 전화 걸기
        </a>
      </Card>

      <div className="mt-4 space-y-2">
        {!isCaregiver && <Row href="/chat" icon={<MessageCircle className="h-5 w-5" />} title="AI 상담" desc="24시간 바로 답해 드려요" />}
        <Row href="/install" icon={<Smartphone className="h-5 w-5" />} title="홈 화면에 설치하기" desc="앱처럼 열고 알림을 받아요" />
        <Row href="/guide" icon={<BookOpen className="h-5 w-5" />} title="이용 가이드" desc="신청부터 결제·일지까지 한눈에" />
        <Row href="/notifications" icon={<Bell className="h-5 w-5" />} title="알림" desc="매칭·결제·돌봄 소식" />
        <Row href="/mypage" icon={<KeyRound className="h-5 w-5" />} title="내 정보" desc="연락처·비밀번호·글자 크기" />
      </div>

      <h2 className="mt-7 mb-2 text-base font-extrabold text-warm-800">자주 묻는 질문</h2>
      <div className="space-y-2">
        {faq.map((f) => (
          <details key={f.key} className="group rounded-xl border border-warm-100 bg-white">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold text-warm-800">
              {f.q}
              <ChevronRight className="h-5 w-5 shrink-0 text-warm-400 transition-transform group-open:rotate-90" />
            </summary>
            <ContentBlocks blocks={f.blocks} className="px-4 pb-4 text-[15px] text-warm-600" />
          </details>
        ))}
      </div>
    </div>
  );
}

function Row({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-xl border border-warm-100 bg-white px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-warm-800">{title}</span>
        <span className="block text-sm text-warm-500">{desc}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-warm-400" />
    </Link>
  );
}
