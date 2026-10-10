"use client";

// 관리자가 입력한 안내 블록 렌더러(CAREN-REF-01 3단계). 텍스트만 그린다 — HTML 을 해석하지 않는다.
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import type { ContentBlock, DomainContent } from "@/lib/api/contents";
import { cn } from "@/lib/utils";

export function ContentBlocks({ blocks, className }: { blocks: ContentBlock[]; className?: string }) {
  return (
    <div className={cn("space-y-2 text-[14px] leading-relaxed text-warm-700", className)}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i} className="whitespace-pre-line">{b.text}</p>;
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items.map((t, j) => <li key={j}>{t}</li>)}
              </ul>
            );
          case "note":
            return (
              <p key={i} className={cn("whitespace-pre-line rounded-xl px-3 py-2 text-[13.5px]", b.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800")}>
                {b.text}
              </p>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-warm-200">
                <table className="w-full text-[13px]">
                  <thead className="bg-warm-50 text-warm-600"><tr>{b.head.map((h, j) => <th key={j} className="p-2 text-left">{h}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j} className="border-t border-warm-100">{r.map((c, k) => <td key={k} className="p-2">{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case "link":
            return b.href.startsWith("/")
              ? <Link key={i} href={b.href} className="inline-block font-bold text-brand-600 underline">{b.label}</Link>
              : <a key={i} href={b.href} target="_blank" rel="noopener noreferrer" className="inline-block font-bold text-brand-600 underline">{b.label}</a>;
          default:
            return null;
        }
      })}
    </div>
  );
}

/** 공지 카드 — 지역 공지는 지역 이름을 붙이고, 이번 접속 동안 닫을 수 있다 */
export function NoticeCard({ n, dismissible = false }: { n: DomainContent; dismissible?: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const warn = n.tone === "warn";
  const Icon = warn ? AlertTriangle : Info;
  return (
    <div role="status" className={cn("rounded-2xl border p-3.5", warn ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50")}>
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", warn ? "text-amber-700" : "text-sky-700")} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[14px] font-extrabold", warn ? "text-amber-900" : "text-sky-900")}>
            {n.regions?.length ? <span className="mr-1.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[11.5px]">{n.regions.join("·")}</span> : null}
            {n.title}
          </p>
          <ContentBlocks blocks={n.blocks} className={cn("mt-1 text-[13px]", warn ? "text-amber-900" : "text-sky-900")} />
        </div>
        {dismissible && (
          <button type="button" aria-label="공지 닫기" onClick={() => {
            setHidden(true);
            try { sessionStorage.setItem(`notice-hidden-${n.id}-${n.updated_at}`, "1"); } catch { /* 저장 안 돼도 닫힘 */ }
          }} className="-m-2 grid h-11 w-11 shrink-0 place-items-center text-warm-500"><X className="h-4 w-4" /></button>
        )}
      </div>
    </div>
  );
}
