"use client";

import { useEffect, useState } from "react";

/**
 * 생년월일 입력 — 년/월/일 드롭다운. 네이티브 date 캘린더로 수십 년을 넘길 필요 없이
 * 연도부터 바로 고른다. 값은 "YYYY-MM-DD"(미완성이면 "")로 controlled.
 *
 * 앱 공통 컴포넌트: seniors/new, patients, children/new, postpartum-clients/new,
 * request/new(본인 산모)에서 사용.
 */
export interface BirthDateSelectProps {
  /** "YYYY-MM-DD" 또는 "" */
  value: string;
  /** 완성 시 "YYYY-MM-DD", 미완성이면 "" 로 호출 */
  onChange: (value: string) => void;
  /** 선택 가능한 최소 연도 (기본 1920) */
  minYear?: number;
  /** 선택 가능한 최대 연도 (기본 올해) */
  maxYear?: number;
  /** 연도 정렬. desc=올해가 위(기본), asc=오래된 해가 위 */
  order?: "asc" | "desc";
  /** 래퍼 className (기본 3열 그리드) */
  className?: string;
  /** 각 select className */
  selectClassName?: string;
}

const DEFAULT_SELECT_CLASS =
  "w-full h-12 rounded-xl border border-warm-200 bg-white px-3.5 text-[14.5px] text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

function parse(v: string): [number | "", number | "", number | ""] {
  const [y, m, d] = (v || "").split("-");
  return [y ? Number(y) : "", m ? Number(m) : "", d ? Number(d) : ""];
}

function compose(y: number | "", m: number | "", d: number | ""): string {
  return y !== "" && m !== "" && d !== ""
    ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    : "";
}

export function BirthDateSelect({
  value,
  onChange,
  minYear = 1920,
  maxYear,
  order = "desc",
  className = "grid grid-cols-3 gap-2",
  selectClassName = DEFAULT_SELECT_CLASS,
}: BirthDateSelectProps) {
  // y/m/d를 내부 상태로 보관 → 부분 선택(연도만 고른 상태)도 유지된다.
  const [[y, m, d], setYmd] = useState<[number | "", number | "", number | ""]>(() => parse(value));

  // 외부 value가 내부 조합값과 달라지면 재동기화(편집 초기화·리셋 대응).
  useEffect(() => {
    if (value !== compose(y, m, d)) setYmd(parse(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const top = maxYear ?? new Date().getFullYear();
  const asc = Array.from({ length: top - minYear + 1 }, (_, i) => minYear + i);
  const years = order === "asc" ? asc : [...asc].reverse();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = y !== "" && m !== "" ? new Date(y, m, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function emit(ny: number | "", nm: number | "", nd: number | "") {
    // 년/월 변경으로 선택한 일이 그 달 말일을 넘으면 초기화(예: 2/30 방지)
    if (ny !== "" && nm !== "" && nd !== "" && nd > new Date(ny, nm, 0).getDate()) nd = "";
    setYmd([ny, nm, nd]);
    onChange(compose(ny, nm, nd));
  }

  return (
    <div className={className}>
      <select value={y} onChange={(e) => emit(e.target.value ? Number(e.target.value) : "", m, d)} className={selectClassName} aria-label="출생 연도">
        <option value="">년도</option>
        {years.map((yy) => (
          <option key={yy} value={yy}>{yy}년</option>
        ))}
      </select>
      <select value={m} onChange={(e) => emit(y, e.target.value ? Number(e.target.value) : "", d)} className={selectClassName} aria-label="출생 월">
        <option value="">월</option>
        {months.map((mm) => (
          <option key={mm} value={mm}>{mm}월</option>
        ))}
      </select>
      <select value={d} onChange={(e) => emit(y, m, e.target.value ? Number(e.target.value) : "")} className={selectClassName} aria-label="출생 일">
        <option value="">일</option>
        {days.map((dd) => (
          <option key={dd} value={dd}>{dd}일</option>
        ))}
      </select>
    </div>
  );
}
