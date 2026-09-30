"use client";

import { Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Star, ShieldCheck, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type RecommendedCaregiver } from "@/lib/api/member";
import { domainLabel } from "@/lib/caregiverType";
import { cn } from "@/lib/utils";

const stripTag = (s: string) => s.replace(/^\[.*?\]\s*/, "");
const genderLabel = (g?: string | null) => (g === "F" ? "여" : g === "M" ? "남" : "-");

// 그룹 표시 도메인 순서 (소비자 도메인 — 전문가가 없어도 헤더는 표시)
const GROUP_DOMAINS = ["senior", "living_support", "nursing", "postpartum", "childcare", "mental_care"];

const DOMAIN_TITLE: Record<string, string> = {
  senior: "검증된 요양보호사",
  nursing: "검증된 간병인",
  living_support: "검증된 생활지원 도우미",
};

function BrowseList() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const domain = sp.get("domain") ?? undefined;
  const title = (domain && DOMAIN_TITLE[domain]) || "검증된 돌봄전문가";
  const queryKey = ["member", "caregivers", "browse", domain ?? "all"];

  const q = useQuery({
    queryKey,
    queryFn: () => memberApi.caregiversByDomain(domain),
    retry: false,
    staleTime: 60_000,
  });
  const list = q.data ?? [];

  // 찜 토글 (낙관적 업데이트)
  const flip = (id: number) =>
    qc.setQueryData<RecommendedCaregiver[]>(queryKey, (old) =>
      old?.map((c) => (c.id === id ? { ...c, is_favorited: !c.is_favorited } : c))
    );
  const fav = useMutation({
    mutationFn: (id: number) => memberApi.toggleFavorite(id),
    onMutate: (id) => flip(id),
    onError: (_e, id) => flip(id),
  });
  const onFav = (id: number) => fav.mutate(id);
  const goDetail = (id: number) => router.push(`/caregivers/${id}`);

  // 도메인 필터 지정 시 그 도메인만, 아니면 전체 도메인 그룹
  const showDomains = domain ? [domain] : GROUP_DOMAINS;
  const inDomain = (c: RecommendedCaregiver, d: string) => (c.domains ?? []).includes(d);
  // 찜한 전문가 — 최상단 그룹 (찜 토글 시 실시간 반영)
  const favorites = list.filter((c) => c.is_favorited);

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-5xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-3">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-extrabold text-warm-800 tracking-tight">{title}</h1>
        {!q.isLoading && <span className="text-sm font-semibold text-warm-500">{list.length}명</span>}
      </div>

      {q.isLoading && <Card className="p-8 text-center text-warm-500 text-sm">불러오는 중…</Card>}

      {!q.isLoading && q.isError && (
        <Card className="p-8 text-center">
          <p className="text-sm text-warm-500 mb-4">목록을 불러오지 못했습니다.</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>다시 시도</Button>
        </Card>
      )}

      {!q.isLoading && !q.isError && (
        <div className="space-y-6">
          {/* 찜한 돌봄전문가 — 맨 위 그룹 */}
          {favorites.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="inline-flex items-center gap-1 text-[16px] font-extrabold text-brand-700">
                  <Star className="h-4 w-4 fill-current" /> 찜한 돌봄전문가
                </h2>
                <span className="text-xs font-semibold text-warm-500">{favorites.length}명</span>
              </div>
              <GroupBody list={favorites} onFav={onFav} onDetail={goDetail} />
            </section>
          )}

          {showDomains.map((d) => {
            const group = list.filter((c) => inDomain(c, d));
            return (
              <section key={d}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-[16px] font-extrabold text-warm-800">{domainLabel(d)}</h2>
                  <span className="text-xs font-semibold text-warm-500">{group.length}명</span>
                </div>
                {group.length === 0 ? (
                  <Card className="p-5 text-center text-warm-500 text-sm">등록된 전문가가 없습니다</Card>
                ) : (
                  <GroupBody list={group} onFav={onFav} onDetail={goDetail} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 한 그룹(도메인) — 데스크톱 표 / 모바일 리스트 */
function GroupBody({
  list,
  onFav,
  onDetail,
}: {
  list: RecommendedCaregiver[];
  onFav: (id: number) => void;
  onDetail: (id: number) => void;
}) {
  return (
    <>
      {/* 데스크톱: 표 */}
      <Card className="hidden overflow-hidden p-0 lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-100 bg-warm-50 text-xs font-bold text-warm-500">
              <th className="px-4 py-3 text-left">이름</th>
              <th className="px-3 py-3 text-center">성별</th>
              <th className="px-3 py-3 text-center">나이</th>
              <th className="px-4 py-3 text-left">전문분야</th>
              <th className="px-4 py-3 text-left">활동지역</th>
              <th className="px-3 py-3 text-center">별점</th>
              <th className="px-3 py-3 text-center">완료 실적</th>
              <th className="px-3 py-3 text-center">찜</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const name = stripTag(c.name) || "돌봄전문가";
              return (
                <tr
                  key={c.id}
                  className="border-b border-warm-50 last:border-0 cursor-pointer hover:bg-warm-50/60"
                  onClick={() => onDetail(c.id)}
                >
                  <td className="px-4 py-3 font-bold text-warm-800 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {name}
                      {c.tag && (
                        <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-brand-600">
                          {c.tag === "인증" && <ShieldCheck className="w-3 h-3" />}
                          {c.tag}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-warm-600">{genderLabel(c.gender)}</td>
                  <td className="px-3 py-3 text-center text-warm-600 tabular-nums">{c.age ?? "-"}</td>
                  <td className="px-4 py-3 text-warm-600">{c.spec || "-"}</td>
                  <td className="px-4 py-3 text-warm-500">{c.region || "-"}</td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {c.rating}
                    </span>
                    <span className="text-warm-500 text-xs"> ({c.rating_count})</span>
                  </td>
                  <td className="px-3 py-3 text-center text-warm-600 tabular-nums">{c.completed_sessions}회</td>
                  <td className="px-3 py-3 text-center">
                    <FavBox active={!!c.is_favorited} onToggle={() => onFav(c.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* 모바일: 리스트 */}
      <Card className="overflow-hidden p-0 lg:hidden">
        {list.map((c) => {
          const name = stripTag(c.name) || "돌봄전문가";
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 border-b border-warm-50 px-4 py-3 last:border-0 active:bg-warm-50"
              onClick={() => onDetail(c.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-warm-800 truncate">{name}</span>
                  {c.tag && (
                    <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-brand-600 shrink-0">
                      {c.tag === "인증" && <ShieldCheck className="w-3 h-3" />}
                      {c.tag}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-warm-500 truncate">
                  {genderLabel(c.gender)} · {c.age ?? "-"}세 · {c.spec || "-"}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-warm-500">
                  <span className="truncate">{c.region || "-"}</span>
                  <span className="inline-flex items-center gap-0.5 font-bold text-amber-500 shrink-0">
                    <Star className="w-3 h-3 fill-current" />
                    {c.rating}
                  </span>
                  <span className="shrink-0 text-warm-500">완료 {c.completed_sessions}회</span>
                </div>
              </div>
              <FavBox active={!!c.is_favorited} onToggle={() => onFav(c.id)} />
            </div>
          );
        })}
      </Card>
    </>
  );
}

/** 찜 체크박스 (행 클릭 전파 차단) */
function FavBox({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={active ? "찜 해제" : "찜하기"}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
        active ? "border-brand-500 bg-brand-500 text-white" : "border-warm-300 bg-white hover:border-brand-300"
      )}
    >
      {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}

export default function CaregiverBrowsePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-warm-500 text-sm">불러오는 중…</div>}>
      <BrowseList />
    </Suspense>
  );
}
