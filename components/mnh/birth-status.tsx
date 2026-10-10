"use client";

// 출산 전/후 고르기 — 출산 전이면 날짜가 「출산 예정일」이 되고, 출산 후 출산일을 등록하면 예비 계약이 확정된다(CAREN-REF-01 2단계).
import { cn } from "@/lib/utils";

export type BirthStatus = "expected" | "delivered";

export function BirthStatusChips({ value, onChange }: { value: BirthStatus; onChange: (v: BirthStatus) => void }) {
  const opts: [BirthStatus, string][] = [["expected", "출산 전이에요"], ["delivered", "출산했어요"]];
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="출산 여부">
      {opts.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "h-11 rounded-xl border text-[14px] font-bold transition-colors",
            value === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
