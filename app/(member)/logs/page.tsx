"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { formatDateTime } from "@/lib/utils";

/**
 * 보호자 케어일지 (#5)
 * 매칭 완료된 돌봄 건을 표시. AI 일지는 케어 세션 종료 후 제공됩니다.
 */
export default function LogsPage() {
  const query = useQuery({
    queryKey: ["member", "guardian", "requests", "matched"],
    queryFn: () => memberApi.guardianRequests("matched"),
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">케어 일지</h1>
      <p className="text-sm text-warm-500 mb-5">진행 중인 돌봄의 AI 케어 일지를 확인하세요</p>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">
          매칭 완료된 돌봄이 없습니다.
          <br />매칭이 확정되면 케어 일지가 여기에 표시됩니다.
        </Card>
      )}

      <div className="space-y-3">
        {query.data?.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-500" />
                <span className="font-bold text-warm-800">
                  {r.senior?.name ?? r.nursing_patient?.name ?? "대상자"}
                </span>
                {r.service_domain === "nursing" && <Badge variant="info">간병</Badge>}
              </div>
              <Badge variant="success">매칭완료</Badge>
            </div>
            <div className="text-xs text-warm-500">
              {r.category?.name ?? "돌봄"} ·{" "}
              {r.matched_at ? formatDateTime(r.matched_at) : "-"}
            </div>
            <p className="text-xs text-warm-400 mt-2">
              케어 세션이 진행되면 AI가 생성한 케어 일지가 이곳에 표시됩니다.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
