"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CareandCertMark } from "@/components/care/careand-cert-mark";
import { memberApi } from "@/lib/api/member";
import { useAuth } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

/**
 * 케어앤에듀 인증 자격(2026-10-07) — 돌봄전문가 본인.
 * 받았으면 자격증(인쇄 가능), 아직이면 기준 대비 진행 상황. CERT_GRANTED 알림이 여기로 온다.
 */
export default function CertificatePage() {
  const router = useRouter();
  const role = useAuth((s) => s.user?.role);
  const hydrated = useAuth((s) => s.hasHydrated);
  const isCg = role === "caregiver";

  useEffect(() => {
    if (hydrated && role && !isCg) router.replace("/mypage");
  }, [hydrated, role, isCg, router]);

  const q = useQuery({ queryKey: ["member", "certificate"], queryFn: memberApi.myCertificate, enabled: isCg, retry: false });

  if (!isCg) return null;
  const d = q.data;

  return (
    <div className="px-4 pt-4 pb-8 lg:mx-auto lg:max-w-2xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800 print:hidden">케어앤에듀 인증</h1>
      {q.isLoading && <p className="mt-4 text-sm text-warm-500">불러오는 중…</p>}
      {q.isError && <p className="mt-4 text-sm text-red-600">정보를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>}

      {d?.certificate && (
        <>
          <Card className="mt-4 border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white px-6 py-8 text-center print:border-amber-400 print:shadow-none">
            <BadgeCheck className="mx-auto h-12 w-12 text-amber-600" aria-hidden />
            <div className="mt-3 text-[13px] font-semibold tracking-widest text-amber-800">CERTIFICATE</div>
            <h2 className="mt-1 text-2xl font-extrabold text-warm-800">{d.certificate.name}</h2>
            <div className="mt-5 text-lg font-bold text-warm-800">{d.certificate.holder}</div>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-warm-600">
              위 사람은 케어앤 플랫폼에서 성실히 돌봄 활동을 하고 보호자에게 높은 평가를 받아
              {" "}{d.certificate.issuer}가 인정하는 돌봄전문가임을 증명합니다.
            </p>
            <dl className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-y-1.5 text-left text-[13px] tabular-nums">
              <dt className="text-warm-500">자격 번호</dt>
              <dd className="font-semibold text-warm-800">{d.certificate.number}</dd>
              <dt className="text-warm-500">발급일</dt>
              <dd className="font-semibold text-warm-800">{d.certificate.issued_date}</dd>
              <dt className="text-warm-500">발급</dt>
              <dd className="font-semibold text-warm-800">{d.certificate.issuer}</dd>
            </dl>
          </Card>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-warm-600 print:hidden">
            보호자에게 보이는 프로필·후보 카드에 <CareandCertMark compact /> 마크가 붙어 있어요.
          </p>
          <Button variant="outline" className="mt-3 w-full print:hidden" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> 인쇄 · PDF 저장
          </Button>
        </>
      )}

      {d && !d.certificate && (
        <>
          <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
            케어앤에서 꾸준히 돌봄을 하고 보호자에게 좋은 평가를 받으면 {d.name} 자격을 드려요. 기준을 넘으면 자동으로 발급되고 알림으로 알려 드려요.
          </p>
          <Card className="mt-4 space-y-4 p-5">
            <Progress label="완료한 돌봄" value={d.stats.sessions} goal={d.criteria.min_sessions} unit="회" />
            <Progress label="보호자 후기" value={d.stats.reviews} goal={d.criteria.min_reviews} unit="건" />
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-warm-700">보호자 평점</span>
                <span className="tabular-nums text-warm-600">
                  {d.stats.rating != null ? d.stats.rating.toFixed(1) : "아직 없음"} / 기준 {d.criteria.min_rating.toFixed(1)} 이상
                </span>
              </div>
              <div className={cn("mt-1 text-xs", d.stats.rating != null && d.stats.rating >= d.criteria.min_rating ? "text-brand-700" : "text-warm-500")}>
                {d.stats.rating == null ? "후기가 쌓이면 평균을 보여 드려요." : d.stats.rating >= d.criteria.min_rating ? "기준을 넘었어요." : "후기가 더 쌓이면 달라질 수 있어요."}
              </div>
            </div>
          </Card>
          <p className="mt-3 px-1 text-xs leading-relaxed text-warm-500">
            활동은 케어앤에서 완료된 돌봄만, 평점은 보호자 후기 평균으로 셉니다. 매일 아침 한 번, 그리고 새 후기가 올라올 때 확인해요.
          </p>
        </>
      )}
    </div>
  );
}

function Progress({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(goal, 1)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-warm-700">{label}</span>
        <span className="tabular-nums text-warm-600">{value}{unit} / {goal}{unit}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-warm-100" role="progressbar" aria-valuenow={value} aria-valuemax={goal} aria-label={label}>
        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-brand-500" : "bg-amber-400")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
