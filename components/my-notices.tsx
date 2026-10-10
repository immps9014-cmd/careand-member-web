"use client";

// 홈 상단 — 내 지역·전국 공지(관리자 「안내 콘텐츠」에서 게시, CAREN-REF-01 3단계)
import { useQuery } from "@tanstack/react-query";
import { contentsApi } from "@/lib/api/contents";
import { NoticeCard } from "@/components/content-blocks";

export function MyNotices() {
  const q = useQuery({ queryKey: ["member", "my-notices"], queryFn: contentsApi.myNotices, staleTime: 5 * 60_000, retry: false });
  const rows = (q.data ?? []).filter((n) => {
    try { return !sessionStorage.getItem(`notice-hidden-${n.id}-${n.updated_at}`); } catch { return true; }
  });
  if (!rows.length) return null;
  return (
    <div className="space-y-2 px-4 pt-3 lg:mx-auto lg:max-w-3xl">
      {rows.map((n) => <NoticeCard key={n.id} n={n} dismissible />)}
    </div>
  );
}
