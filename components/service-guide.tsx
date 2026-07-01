"use client";

import { Check, X, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { serviceGuide } from "@/lib/serviceGuides";

interface ServiceGuideProps {
  /** 서비스 도메인 토큰 (senior, nursing, living_support, ...) */
  domain: string;
  /** 스크리닝(이용 불가 대상 아님) 확인 여부 */
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
  className?: string;
}

/**
 * 신청 전 서비스 안내 + 이용 불가 대상 스크리닝 게이트.
 * - 제공 / 제공하지 않는 서비스 범위 고지(기대치 관리)
 * - 이용 불가 대상 안내 + 필수 확인 체크(부적격 스크리닝)
 * 케어네이션 "신청 전 안내" 패턴(sample_app/BENCHMARK-CARENATION.md).
 */
export function ServiceGuide({ domain, confirmed, onConfirm, className }: ServiceGuideProps) {
  const g = serviceGuide(domain);
  return (
    <Card className={"rounded-2xl p-4 " + (className ?? "")}>
      {/* 제공 서비스 */}
      <div>
        <div className="text-[12.5px] font-bold text-warm-700">이런 도움을 드려요</div>
        <ul className="mt-2 space-y-1.5">
          {g.provided.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-warm-600">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={3} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 제공하지 않는 서비스 */}
      <div className="mt-3.5 border-t border-warm-100 pt-3.5">
        <div className="text-[12.5px] font-bold text-warm-500">제공하지 않는 서비스</div>
        <ul className="mt-2 space-y-1.5">
          {g.notProvided.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-warm-400">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-300" strokeWidth={3} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 이용 불가 대상 스크리닝 */}
      <div className="mt-3.5 rounded-xl border border-warn/30 bg-warn/5 p-3.5">
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-warm-700">
          <AlertTriangle className="h-4 w-4 text-warn" /> 이용이 어려운 대상이에요
        </div>
        <ul className="mt-2 space-y-1.5">
          {g.ineligible.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-warm-500">
              <span className="mt-0.5 text-warn">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-warm-400">
          위 상태에 해당하면 안전을 위해 매칭이 제한될 수 있어요. 정확한 이용 여부는 고객센터로 문의해 주세요.
        </p>
      </div>

      {/* 필수 확인 체크 (스크리닝 게이트) */}
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-warm-200 bg-white p-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirm(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-500"
        />
        <span className="text-[12.5px] leading-relaxed text-warm-700">
          <b className="text-warm-800">(필수)</b> 돌봄대상이 위 이용 불가 대상에 해당하지 않음을 확인했어요.
        </span>
      </label>
    </Card>
  );
}
