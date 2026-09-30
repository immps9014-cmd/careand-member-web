"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  UserPlus,
  Sparkle,
  Users,
  CreditCard,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: UserPlus,
    title: "1. 돌봄 대상 등록",
    desc: "어르신·환자·산모·아이 등 돌봄이 필요한 분을 먼저 등록해요. 건강 상태·주소를 입력하면 더 정확히 매칭돼요.",
  },
  {
    icon: Sparkle,
    title: "2. 매칭 요청",
    desc: "필요한 서비스·일정·세부 항목을 3단계로 입력해요. 적정 간병비(권장 시급)를 확인하고 희망 상한 금액도 정할 수 있어요.",
  },
  {
    icon: Users,
    title: "3. AI 추천 + 입찰 비교",
    desc: "AI가 잘 맞는 돌봄전문가 3~5명을 추천하고, 각자 제시한 입찰가·평점·경력을 비교해 직접 선택해요.",
  },
  {
    icon: CreditCard,
    title: "4. 매칭 확정 → 결제 → 케어",
    desc: "돌봄전문가가 수락하면 매칭이 확정돼요. 플랫폼에서 안전하게 결제하면 방문 일정이 시작되고, 케어일지로 진행 상황을 확인해요.",
  },
];

const FAQ = [
  {
    q: "적정 간병비는 어떻게 정해지나요?",
    a: "돌봄 대상의 상태·지역·시간대·서비스 종류를 반영해 AI가 권장 시급과 범위를 산출해요. 희망 상한 금액을 정하면 돌봄전문가가 이를 참고해 입찰합니다.",
  },
  {
    q: "돌봄전문가와 직접 거래해도 되나요?",
    a: "안전을 위해 돌봄전문가와의 직접(개인) 거래·외부 연락처 교환은 금지돼요. 결제·정산은 반드시 케어앤드 플랫폼을 통해 진행해야 보호받을 수 있어요.",
  },
  {
    q: "돌봄전문가 자격은 검증되나요?",
    a: "모든 돌봄전문가는 자격증 진위확인·신원 검수를 거쳐 등록돼요. 프로필에서 전문분야·완료 실적·평점을 확인할 수 있어요.",
  },
  {
    q: "결제 후 취소하면 어떻게 되나요?",
    a: "매칭 확정 후 무단 취소·노쇼 시 위약금이 발생할 수 있어요. 일정 변경이 필요하면 고객센터로 먼저 문의해 주세요.",
  },
];

export default function GuidePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-warm-50 pb-28">
      <div className="p-5">
        <button onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm text-warm-500">
          <ChevronLeft className="h-4 w-4" /> 뒤로
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-warm-800">케어앤드 이용 가이드</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
          돌봄 대상 등록부터 매칭·결제까지, 4단계면 충분해요.
        </p>

        {/* 4단계 플로우 */}
        <div className="mt-5 space-y-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="flex items-start gap-3.5 rounded-2xl p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-[22px] w-[22px]" />
                </span>
                <div>
                  <div className="text-[15px] font-extrabold text-warm-800">{s.title}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-warm-500">{s.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 안전 안내 */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <p className="text-[13.5px] leading-relaxed text-warm-600">
            케어앤드는 신원·자격이 검증된 돌봄전문가만 매칭하고, 결제·정산을 플랫폼이 안전하게 보호해요.
          </p>
        </div>

        {/* FAQ */}
        <h2 className="mb-2.5 mt-6 flex items-center gap-1.5 text-[16px] font-extrabold text-warm-800">
          <HelpCircle className="h-4 w-4 text-brand-500" /> 자주 묻는 질문
        </h2>
        <div className="space-y-2.5">
          {FAQ.map((f) => (
            <Card key={f.q} className="rounded-2xl p-4">
              <div className="text-[14px] font-bold text-warm-800">Q. {f.q}</div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-warm-500">{f.a}</p>
            </Card>
          ))}
        </div>

        <Link href="/request/new">
          <Button variant="brand" size="lg" className="mt-6 w-full rounded-2xl shadow-md">
            <Sparkle className="h-[18px] w-[18px]" /> 지금 매칭 요청하기
          </Button>
        </Link>
      </div>
    </div>
  );
}
