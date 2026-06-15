"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Star, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const requestId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["member", "candidates", requestId],
    queryFn: () => memberApi.candidates(requestId),
  });

  const select = useMutation({
    mutationFn: (candidateId: number) => memberApi.selectCandidate(requestId, candidateId),
    onSuccess: () => {
      toast.success("선택한 인력에게 수락 요청을 보냈습니다.");
      qc.invalidateQueries({ queryKey: ["member"] });
      router.push("/home");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const data = query.data;

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      <h1 className="text-xl font-extrabold text-warm-800 mb-1">AI 추천 인력</h1>
      <p className="text-sm text-warm-500 mb-5">
        AI가 추천한 인력 중 1순위를 선택하거나 다른 후보를 선택하세요
      </p>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}

      {data && data.candidates.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">
          {data.message ?? "추천 후보가 없습니다."}
        </Card>
      )}

      <div className="space-y-3">
        {data?.candidates.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-warm-800">{c.caregiver?.name ?? "인력"}</span>
                {c.rank === 1 && <Badge variant="success">AI 1순위</Badge>}
                {c.response === "accepted" && <Badge variant="success">수락됨</Badge>}
                {c.response === "rejected" && <Badge variant="danger">거절</Badge>}
              </div>
              <span className="text-xs text-warm-400 font-en">AI {(c.ai_score * 100).toFixed(0)}점</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-warm-500 mb-2">
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 fill-warn text-warn" />
                {c.caregiver?.rating_avg?.toFixed(1) ?? "-"}
              </span>
              <span>경력 {c.caregiver?.completed_sessions ?? 0}회</span>
              {c.caregiver?.age && <span>{c.caregiver.age}세</span>}
              {c.caregiver?.gender && <span>{c.caregiver.gender === "F" ? "여" : "남"}</span>}
            </div>

            {c.ai_reasons && c.ai_reasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {c.ai_reasons.map((r) => (
                  <Badge key={r} variant="outline">{r}</Badge>
                ))}
              </div>
            )}

            <Button
              size="sm"
              variant="brand"
              className="w-full"
              disabled={select.isPending || data?.request_status === "matched"}
              onClick={() => select.mutate(c.id)}
            >
              <Check className="w-4 h-4" />
              {data?.request_status === "matched" ? "매칭 완료됨" : "이 인력 선택"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
