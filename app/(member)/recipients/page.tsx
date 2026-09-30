"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memberApi } from "@/lib/api/member";

/**
 * 돌봄 받는 분 — 도메인별로 흩어진 대상(어르신·산모·아이·마음돌봄)을 한 화면에 모은다.
 * 새 대상은 신청서 안에서 바로 등록되므로 여기서는 보기와 「이 분으로 신청」만 둔다.
 * 어르신은 기존 상세 화면(/seniors/[id], 건강기록 포함)으로 이어진다.
 */
type Row = { key: string; name: string; sub?: string | null; href: string; requestHref: string };

export default function RecipientsPage() {
  const router = useRouter();
  const opt = { retry: false, staleTime: 60_000 } as const;
  const seniors = useQuery({ queryKey: ["member", "seniors"], queryFn: memberApi.seniors, ...opt });
  const pp = useQuery({ queryKey: ["member", "pp-clients"], queryFn: memberApi.postpartumClients, ...opt });
  const kids = useQuery({ queryKey: ["member", "children"], queryFn: memberApi.children, ...opt });
  const mc = useQuery({ queryKey: ["member", "mc-clients"], queryFn: memberApi.mentalCareClients, ...opt });

  const groups: { title: string; domain: string; rows: Row[]; loading: boolean }[] = [
    {
      title: "어르신", domain: "senior", loading: seniors.isLoading,
      rows: (seniors.data ?? []).map((x) => ({
        key: "s" + x.id, name: x.name, sub: x.care_grade ? `장기요양 ${x.care_grade}등급` : null,
        href: `/seniors/${x.id}`, requestHref: `/request/new?domain=senior&senior_id=${x.id}`,
      })),
    },
    {
      title: "산모", domain: "postpartum", loading: pp.isLoading,
      rows: (pp.data ?? []).map((x) => ({
        key: "p" + x.id, name: x.name, href: `/request/new?domain=postpartum&postpartum_client_id=${x.id}`,
        requestHref: `/request/new?domain=postpartum&postpartum_client_id=${x.id}`,
      })),
    },
    {
      title: "아이", domain: "childcare", loading: kids.isLoading,
      rows: (kids.data ?? []).map((x) => ({
        key: "c" + x.id, name: x.name, href: `/request/new?domain=childcare&childcare_child_id=${x.id}`,
        requestHref: `/request/new?domain=childcare&childcare_child_id=${x.id}`,
      })),
    },
    {
      title: "마음돌봄", domain: "mental_care", loading: mc.isLoading,
      rows: (mc.data ?? []).map((x) => ({
        key: "m" + x.id, name: x.name, href: `/request/new?domain=mental_care&mental_care_client_id=${x.id}`,
        requestHref: `/request/new?domain=mental_care&mental_care_client_id=${x.id}`,
      })),
    },
  ];
  const loading = groups.some((g) => g.loading);
  const empty = !loading && groups.every((g) => g.rows.length === 0);

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="mb-2 flex h-10 items-center gap-1 text-sm text-warm-600">
        <ChevronLeft className="h-4 w-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800">돌봄 받는 분</h1>
      <p className="mt-1 mb-5 text-sm text-warm-600">신청할 때 등록한 분들이에요. 누르면 바로 다시 신청할 수 있어요.</p>

      {loading && <p className="py-10 text-center text-warm-500">불러오는 중…</p>}
      {empty && (
        <Card className="p-8 text-center text-sm text-warm-600">
          아직 등록한 분이 없어요. 돌봄을 신청하면서 함께 등록돼요.
        </Card>
      )}

      <div className="space-y-6">
        {groups.filter((g) => g.rows.length > 0).map((g) => (
          <section key={g.domain}>
            <h2 className="mb-2 text-base font-extrabold text-warm-800">{g.title}</h2>
            <div className="space-y-2">
              {g.rows.map((r) => (
                <Card key={r.key} className="flex items-center gap-3 p-4">
                  <Link href={r.href} className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-warm-800">{r.name}</span>
                    {r.sub && <span className="block text-sm text-warm-500">{r.sub}</span>}
                  </Link>
                  <Link
                    href={r.requestHref}
                    className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-brand-50 px-3 text-sm font-bold text-brand-700"
                  >
                    <Plus className="h-4 w-4" /> 이 분으로 신청
                  </Link>
                  {g.domain === "senior" && <ChevronRight className="h-5 w-5 text-warm-400" aria-hidden />}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
