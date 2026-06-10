"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const MODES = [
  { key: "normal", label: "일반" },
  { key: "emergency", label: "긴급" },
  { key: "recurring", label: "정기" },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [seniorId, setSeniorId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [mode, setMode] = useState("normal");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(120);
  const [memo, setMemo] = useState("");

  const seniors = useQuery({ queryKey: ["member", "seniors"], queryFn: memberApi.seniors });
  const categories = useQuery({ queryKey: ["member", "categories"], queryFn: memberApi.categories });

  const create = useMutation({
    mutationFn: () => {
      // datetime-local(2026-06-12T14:00) → Y-m-d\TH:i:sP (+09:00)
      const scheduled = `${start}:00+09:00`;
      return memberApi.createRequest({
        senior_id: Number(seniorId),
        category_id: Number(categoryId),
        mode,
        scheduled_start: scheduled,
        duration_min: Number(duration),
        special_request: memo || undefined,
      });
    },
    onSuccess: () => {
      toast.success("매칭을 요청했습니다. AI가 후보를 추천합니다.");
      router.push("/home");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const valid = seniorId && categoryId && start && duration >= 60;

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">새 매칭 요청</h1>
      <p className="text-sm text-warm-500 mb-5">돌봄 대상과 일정을 선택하면 AI가 인력을 추천합니다</p>

      <Card className="p-5 space-y-4">
        {/* 돌봄 대상 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">돌봄 대상</label>
          <select
            value={seniorId}
            onChange={(e) => setSeniorId(e.target.value ? Number(e.target.value) : "")}
            className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="">대상자를 선택하세요</option>
            {seniors.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.age ? `(${s.age}세)` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 서비스 종류 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">서비스 종류</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
            className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="">서비스를 선택하세요</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 모드 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">유형</label>
          <div className="flex gap-2">
            {MODES.map((m) => (
              <Button
                key={m.key}
                variant={mode === m.key ? "brand" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 일정 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">시작 일시</label>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>

        {/* 시간 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">
            소요 시간 (분, 60~720)
          </label>
          <Input
            type="number"
            min={60}
            max={720}
            step={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">요청사항 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="특이사항이나 요청사항을 입력하세요"
            className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-400 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        <Button
          variant="brand"
          size="lg"
          className="w-full"
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "요청 중…" : "AI 매칭 요청"}
        </Button>
      </Card>
    </div>
  );
}
