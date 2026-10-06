import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 케어앤에듀 인증 돌봄전문가 마크(2026-10-07).
 * 완료 돌봄·보호자 평점 기준을 넘어 케어앤에듀가 자격을 준 사람에게만 붙는다(서버 careand_certified).
 * 「자격 확인」(국가자격 진위확인, 초록)과 헷갈리지 않게 금색 계열로 구분한다.
 */
export function CareandCertMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-50 font-bold text-amber-800 ring-1 ring-inset ring-amber-300",
        compact ? "px-1 py-px text-[11px]" : "px-1.5 py-0.5 text-[12px]",
        className,
      )}
      title="케어앤에듀 인증 돌봄전문가 — 활동 기록과 보호자 평점을 인정받았어요"
    >
      <BadgeCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      케어앤에듀 인증
    </span>
  );
}
