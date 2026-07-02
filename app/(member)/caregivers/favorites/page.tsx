"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Star, Heart, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type RecommendedCaregiver } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const FAV_KEY = ["member", "caregivers", "favorites"];
const stripTag = (s: string | null | undefined) => (s ?? "").replace(/^\[.*?\]\s*/, "");

export default function FavoriteCaregiversPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const q = useQuery({ queryKey: FAV_KEY, queryFn: () => memberApi.favoriteCaregivers(), retry: false });
  const list = q.data ?? [];

  // 찜 해제 — 낙관적 제거
  const unfav = useMutation({
    mutationFn: (id: number) => memberApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: FAV_KEY });
      const prev = qc.getQueryData<RecommendedCaregiver[]>(FAV_KEY);
      qc.setQueryData<RecommendedCaregiver[]>(FAV_KEY, (old) => (old ?? []).filter((c) => c.id !== id));
      return { prev };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(FAV_KEY, ctx.prev);
      toast.error(getApiErrorMessage(e));
    },
    onSuccess: () => toast.success("찜을 해제했어요."),
    onSettled: () => qc.invalidateQueries({ queryKey: FAV_KEY }),
  });

  return (
    <div className="min-h-screen bg-warm-50 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-warm-200 px-4 py-3 flex items-center gap-2">
        <button onClick={() => router.push("/home")} className="p-1 -ml-1 text-warm-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-extrabold text-warm-800">관심 돌봄전문가</h1>
        {list.length > 0 && <span className="ml-auto text-xs font-semibold text-warm-400">{list.length}명</span>}
      </div>

      <div className="p-4 space-y-3 lg:mx-auto lg:max-w-3xl">
        {q.isLoading && <div className="py-12 text-center text-warm-400 text-sm">불러오는 중…</div>}

        {q.isError && (
          <Card className="p-6 text-center text-warm-500 text-sm">{getApiErrorMessage(q.error)}</Card>
        )}

        {!q.isLoading && !q.isError && list.length === 0 && (
          <Card className="p-10 text-center">
            <Heart className="w-8 h-8 text-warm-300 mx-auto mb-3" />
            <div className="text-sm text-warm-600 font-semibold">아직 찜한 돌봄전문가가 없어요.</div>
            <div className="text-xs text-warm-400 mt-1">추천·전체 목록에서 하트를 눌러 담아보세요.</div>
            <Button variant="brand" size="lg" className="mt-5" onClick={() => router.push("/caregivers/browse")}>
              돌봄전문가 둘러보기
            </Button>
          </Card>
        )}

        {list.map((c) => (
          <FavCard
            key={c.id}
            c={c}
            removing={unfav.isPending}
            onDetail={() => router.push(`/caregivers/${c.id}`)}
            onRequest={() => router.push(`/request/new?preferred=${c.id}`)}
            onRemove={() => unfav.mutate(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FavCard({
  c, onDetail, onRequest, onRemove, removing,
}: {
  c: RecommendedCaregiver;
  onDetail: () => void;
  onRequest: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const name = stripTag(c.name) || "돌봄전문가";
  const meta = [c.spec, c.region, c.distance_km != null ? `${c.distance_km}km` : null].filter(Boolean).join(" · ");
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onDetail}>
        <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-lg font-extrabold text-brand-600 shrink-0">
          {name.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold text-warm-800 truncate">{name}</span>
            <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-bold shrink-0">
              <Star className="w-3 h-3 fill-current" />{c.rating}
            </span>
          </div>
          {meta && <div className="text-xs text-warm-500 mt-0.5 truncate">{meta}</div>}
          {c.base_rate != null && (
            <div className="text-xs text-warm-600 mt-1">
              시간당 <span className="font-extrabold text-brand-600">{c.base_rate.toLocaleString()}</span>원~
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-warm-300 shrink-0" />
      </div>

      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="lg" className="flex-1 border-danger/40 text-danger" disabled={removing} onClick={onRemove}>
          <Heart className="w-4 h-4 fill-current" /> 찜 해제
        </Button>
        <Button variant="brand" size="lg" className="flex-[2]" onClick={onRequest}>
          이 전문가에게 매칭 요청
        </Button>
      </div>
    </Card>
  );
}
