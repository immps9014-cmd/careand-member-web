"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Clock, MapPin, User, Ban, Check, Search, RotateCcw, X, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type OpenRequest, type MyBlock } from "@/lib/api/member";
import { DOMAIN_LABEL, caregiverUi } from "@/lib/caregiverType";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

type Tab = "open" | "blocked";

const BLOCK_REASONS = ["거리가 멀어요", "조건이 맞지 않아요", "이전에 어려움이 있었어요", "기타"];

export default function OpenRequestsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("open");
  const [blockTarget, setBlockTarget] = useState<OpenRequest | null>(null);

  const profile = useQuery({ queryKey: ["cg", "me"], queryFn: memberApi.myCaregiver, retry: false, staleTime: 60_000 });
  const ui = caregiverUi(profile.data?.service_domains);
  const open = useQuery({ queryKey: ["cg", "open-requests"], queryFn: memberApi.openRequests, retry: false });
  const blocks = useQuery({ queryKey: ["cg", "blocks"], queryFn: memberApi.myBlocks, retry: false, enabled: tab === "blocked" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["cg", "open-requests"] });
    qc.invalidateQueries({ queryKey: ["cg", "blocks"] });
  };

  const apply = useMutation({
    mutationFn: (id: number) => memberApi.applyToRequest(id),
    onSuccess: (res) => { toast.success(res.data?.message ?? "지원이 접수되었습니다."); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const block = useMutation({
    mutationFn: (v: { id: number; reason?: string }) => memberApi.blockTarget(v.id, v.reason),
    onSuccess: (res) => { toast.success(res.data?.message ?? "기피 대상으로 설정했어요."); setBlockTarget(null); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const unblock = useMutation({
    mutationFn: (id: number) => memberApi.unblock(id),
    onSuccess: () => { toast.success("기피를 해제했어요."); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="min-h-screen bg-warm-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-warm-200 px-4 py-3 flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2.5 -ml-2.5 text-warm-500" aria-label="뒤로">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-extrabold text-warm-800">{ui.actionNoun} 요청 둘러보기</h1>
      </div>

      {/* 탭 */}
      <div className="px-4 pt-3 flex gap-2">
        <TabBtn active={tab === "open"} onClick={() => setTab("open")}>열린 요청</TabBtn>
        <TabBtn active={tab === "blocked"} onClick={() => setTab("blocked")}>기피한 대상</TabBtn>
      </div>

      <div className="p-4 space-y-3 lg:mx-auto lg:max-w-4xl">
        {tab === "open" ? (
          <>
            {open.isLoading && <div className="py-12 text-center text-warm-500 text-sm">불러오는 중…</div>}
            {open.isError && (
              <Card className="p-6 text-center text-warm-500 text-sm">
                {getApiErrorMessage(open.error)}
              </Card>
            )}
            {open.data?.length === 0 && (
              <Card className="p-10 text-center">
                <Search className="w-8 h-8 text-warm-300 mx-auto mb-3" />
                <div className="text-sm text-warm-500">지금은 지원 가능한 {ui.actionNoun} 요청이 없어요.</div>
                <div className="text-xs text-warm-500 mt-1">새 요청이 올라오면 여기에 표시됩니다.</div>
              </Card>
            )}
            {open.data?.map((r) => (
              <OpenCard
                key={r.request_id}
                r={r}
                applying={apply.isPending}
                blocking={block.isPending}
                onApply={() => apply.mutate(r.request_id)}
                onBlock={() => setBlockTarget(r)}
              />
            ))}
          </>
        ) : (
          <>
            {blocks.isLoading && <div className="py-12 text-center text-warm-500 text-sm">불러오는 중…</div>}
            {blocks.data?.length === 0 && (
              <Card className="p-10 text-center text-sm text-warm-500">기피한 대상이 없어요.</Card>
            )}
            {blocks.data?.map((b) => (
              <BlockCard key={b.id} b={b} removing={unblock.isPending} onRemove={() => unblock.mutate(b.id)} />
            ))}
          </>
        )}
      </div>

      {blockTarget && (
        <BlockReasonSheet
          target={blockTarget}
          submitting={block.isPending}
          onClose={() => setBlockTarget(null)}
          onConfirm={(reason) => block.mutate({ id: blockTarget.request_id, reason })}
        />
      )}
    </div>
  );
}

function BlockReasonSheet({
  target, onClose, onConfirm, submitting,
}: {
  target: OpenRequest;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  submitting: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [etc, setEtc] = useState("");
  const reason = picked === "기타" ? etc.trim() : picked ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-2xl p-5 pb-7 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-extrabold text-warm-800">‘{target.recipient_name}’ 기피하기</h2>
          <button onClick={onClose} className="p-3 -mr-3 text-warm-500" aria-label="닫기"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-warm-500 mb-4">기피하면 이후 검색·자동 매칭에서 제외돼요. (사유는 선택)</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {BLOCK_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setPicked(r)}
              className={
                "px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors " +
                (picked === r ? "bg-brand-500 text-white border-brand-500" : "bg-white text-warm-600 border-warm-200")
              }
            >
              {r}
            </button>
          ))}
        </div>

        {picked === "기타" && (
          <textarea
            value={etc}
            onChange={(e) => setEtc(e.target.value)}
            maxLength={255}
            rows={2}
            placeholder="사유를 입력해주세요 (선택)"
            className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-warm-800 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        )}

        <div className="flex gap-2 mt-1">
          <Button size="lg" variant="outline" className="flex-1" disabled={submitting} onClick={onClose}>취소</Button>
          <Button
            size="lg"
            variant="brand"
            className="flex-[2]"
            disabled={submitting}
            onClick={() => onConfirm(reason || undefined)}
          >
            <Ban className="w-4 h-4" /> 기피하기
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-2 rounded-full text-sm font-bold transition-colors " +
        (active ? "bg-brand-500 text-white" : "bg-white text-warm-500 border border-warm-200")
      }
    >
      {children}
    </button>
  );
}

function OpenCard({
  r, onApply, onBlock, applying, blocking,
}: {
  r: OpenRequest;
  onApply: () => void;
  onBlock: () => void;
  applying: boolean;
  blocking: boolean;
}) {
  const meta = [
    r.recipient_age != null ? `${r.recipient_age}세` : null,
    r.recipient_gender === "male" ? "남" : r.recipient_gender === "female" ? "여" : null,
    r.care_grade ? `장기요양 ${r.care_grade}등급` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-warm-500" />
          <span className="text-base font-extrabold text-warm-800">{r.recipient_name}</span>
        </div>
        <Badge variant="outline">{DOMAIN_LABEL[r.service_domain] ?? r.service_domain}</Badge>
      </div>

      {meta && <div className="text-xs text-warm-500 mb-3">{meta}</div>}

      <div className="rounded-lg bg-warm-50 divide-y divide-warm-200/70 px-3.5 mb-3">
        {r.category && (
          <Row label="유형" value={r.category} />
        )}
        <div className="flex items-center justify-between py-2.5">
          <span className="flex items-center gap-1.5 text-xs text-warm-500"><Clock className="w-3.5 h-3.5" /> 일시</span>
          <span className="text-sm font-semibold text-warm-700">
            {r.scheduled_start ? formatDateTime(r.scheduled_start) : "일정 협의"} · {r.duration_min}분
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="flex items-center gap-1.5 text-xs text-warm-500"><MapPin className="w-3.5 h-3.5" /> 지역</span>
          <span className="text-sm font-medium text-warm-700 text-right">
            {r.region ?? "지역 미정"}
            {r.distance_km != null && <span className="text-brand-600 font-semibold"> · {r.distance_km}km</span>}
          </span>
        </div>
      </div>

      {r.companion_route && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-3.5 py-2.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 mb-1.5">
            <Navigation className="w-3.5 h-3.5" /> 동행 동선
          </div>
          <div className="space-y-1 text-xs text-warm-600">
            {r.companion_route.destination && (
              <div className="flex gap-1.5"><span className="text-warm-500 shrink-0">방문</span><span className="font-semibold">{r.companion_route.destination}</span></div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-warm-500">
              <span>이동 {r.companion_route.transport === "taxi" ? "택시" : r.companion_route.transport === "transit" ? "대중교통" : "협의"}</span>
              <span>복귀 {r.companion_route.return_to_origin ? "만남 장소" : "별도 장소"}</span>
              {r.companion_route.waypoint_count > 0 && <span>경유 {r.companion_route.waypoint_count}곳</span>}
            </div>
            <div className="text-[12px] text-warm-500">정확한 장소는 매칭 확정 후 안내돼요.</div>
          </div>
        </div>
      )}

      {r.special_request && (
        <div className="text-xs text-warm-500 bg-warm-50 rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">
          “{r.special_request}”
        </div>
      )}

      <div className="flex gap-2">
        <Button size="lg" variant="outline" className="flex-1" disabled={blocking} onClick={onBlock}>
          <Ban className="w-4 h-4" /> 기피
        </Button>
        <Button size="lg" variant="brand" className="flex-[2] shadow-sm" disabled={applying} onClick={onApply}>
          <Check className="w-4 h-4" /> 지원하기
        </Button>
      </div>
    </Card>
  );
}

function BlockCard({ b, onRemove, removing }: { b: MyBlock; onRemove: () => void; removing: boolean }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center shrink-0">
        <Ban className="w-4 h-4 text-warm-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-warm-800">{b.target_name}</div>
        <div className="text-xs text-warm-500 truncate">
          {DOMAIN_LABEL[b.target_type] ?? b.target_type}
          {b.reason ? ` · ${b.reason}` : ""}
        </div>
      </div>
      <Button size="sm" variant="outline" disabled={removing} onClick={onRemove}>
        <RotateCcw className="w-3.5 h-3.5" /> 해제
      </Button>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-warm-500">{label}</span>
      <span className="text-sm font-semibold text-warm-700">{value}</span>
    </div>
  );
}
