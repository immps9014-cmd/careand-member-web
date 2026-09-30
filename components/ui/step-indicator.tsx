"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  /** 각 스텝 라벨 (1-based 순서) */
  steps: string[];
  /** 현재 스텝 (1-based) */
  current: number;
  className?: string;
  /** 완료된(이전) 스텝 클릭 시 이동 — 지정하면 current 이전 스텝만 클릭 가능 */
  onStepClick?: (step: number) => void;
}

/**
 * 다단계 위저드용 스텝 인디케이터 (①②③).
 * 시니어 친화: 큰 원형 번호 + 라벨, 완료 스텝은 체크·brand 색.
 */
export function StepIndicator({ steps, current, className, onStepClick }: StepIndicatorProps) {
  return (
    <ol className={cn("flex items-start", className)}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const clickable = !!onStepClick && done;
        return (
          <li key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* 좌측 연결선 */}
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i === 0 ? "opacity-0" : done || active ? "bg-brand-400" : "bg-warm-200",
                )}
              />
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStepClick!(n) : undefined}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold transition-colors",
                  done
                    ? "bg-brand-500 text-white"
                    : active
                      ? "bg-brand-500 text-white ring-4 ring-brand-500/20"
                      : "bg-warm-100 text-warm-500",
                  clickable && "cursor-pointer active:scale-95",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3.5} /> : n}
              </button>
              {/* 우측 연결선 */}
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i === steps.length - 1 ? "opacity-0" : done ? "bg-brand-400" : "bg-warm-200",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-center text-[12.5px] font-bold leading-tight",
                active ? "text-brand-700" : done ? "text-warm-600" : "text-warm-500",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
