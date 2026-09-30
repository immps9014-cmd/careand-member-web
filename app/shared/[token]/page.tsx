"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { API_URL } from "@/lib/api/client";
import { categorizedItems } from "@/lib/logs";

/**
 * 가족 공유 케어일지 (기능 5, 2026-09-29) — 로그인 없이 토큰 링크로 보는 읽기 전용 화면.
 * 대상자 이름은 가림, 사진·의료진용 요약 없음. 7일 뒤 만료되거나 보호자가 끄면 볼 수 없다.
 */
type Shared = {
  recipient: string; service: string; date: string | null; duration_min: number | null;
  guardian_version: string; categorized: Record<string, unknown>; expires_at: string;
};

export default function SharedLogPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/api/v1/public/care-logs/${encodeURIComponent(params.token)}`, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.success) throw new Error(j?.message ?? "일지를 볼 수 없어요.");
        setData(j.data);
      })
      .catch((e) => setError(e.message));
  }, [params.token]);
  const cats = categorizedItems((data?.categorized as never) ?? null);

  return (
    <main className="min-h-screen bg-warm-50 px-4 py-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-500" />
          <h1 className="text-xl font-extrabold text-warm-800">케어앤 돌봄 일지</h1>
        </div>
        {!data && !error && <p className="py-10 text-center text-warm-500">불러오는 중…</p>}
        {error && <div className="rounded-2xl bg-white p-8 text-center text-sm text-warm-600">{error}</div>}
        {data && (
          <>
            <p className="mb-3 text-sm text-warm-600">
              {data.recipient}님 · {data.service}{data.date ? ` · ${data.date}` : ""}{data.duration_min ? ` · ${data.duration_min}분` : ""}
            </p>
            <section className="mb-4 rounded-2xl bg-white p-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-warm-700">{data.guardian_version}</p>
            </section>
            {cats.length > 0 && (
              <section className="mb-4 grid grid-cols-2 gap-3">
                {cats.map((c) => (
                  <div key={c.key} className="rounded-2xl bg-white p-4">
                    <div className="mb-1 text-xs font-bold text-warm-500">{c.label}</div>
                    <p className="text-sm font-bold text-warm-800">{c.text}</p>
                  </div>
                ))}
              </section>
            )}
            <p className="text-center text-[12px] text-warm-500">
              보호자가 공유한 읽기 전용 일지예요 · {data.expires_at.slice(0, 10)}까지 볼 수 있어요
            </p>
          </>
        )}
      </div>
    </main>
  );
}
