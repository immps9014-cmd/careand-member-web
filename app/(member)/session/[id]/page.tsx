"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Utensils, Pill, Activity, Bath, Smile, Brain,
  MoreHorizontal, HeartPulse, RefreshCw, Package, Wrench, Sparkles, Plus,
  Mic, Square, Loader2, CheckCircle2, AlertCircle, Navigation, MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type CareActivityItem, type VoiceLogItem } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { ChipJournalCard } from "@/components/care/chip-journal-card";
import { ProvisionRecordCard } from "@/components/mnh/provision-record-card";
import { CareLogReviewCard } from "@/components/care/care-log-review-card";

/**
 * 돌봄전문가 케어 활동 입력 화면 (진행 중 세션)
 * - 활동 기록: POST /v1/care-sessions/{id}/activities (category + memo)
 * - 음성 기록: POST /v1/care-sessions/{id}/voice-log (브라우저 녹음 파일 업로드)
 * 기록은 퇴근(checkout) 시/업로드 직후 AI 서비스가 STT + 보호자/의료용 케어일지로 정리한다.
 */

// 백엔드 StoreActivityRequest 의 category enum 과 1:1
const CATEGORIES: { key: string; label: string; icon: typeof Utensils }[] = [
  { key: "meal", label: "식사", icon: Utensils },
  { key: "medication", label: "복약", icon: Pill },
  { key: "exercise", label: "활동/운동", icon: Activity },
  { key: "bath", label: "목욕/위생", icon: Bath },
  { key: "mood", label: "정서", icon: Smile },
  { key: "cognition", label: "인지", icon: Brain },
  { key: "nursing_care", label: "간병", icon: HeartPulse },
  { key: "position_change", label: "체위변경", icon: RefreshCw },
  { key: "cleaning", label: "청소", icon: Sparkles },
  { key: "organizing", label: "정리정돈", icon: Package },
  { key: "repair", label: "수리", icon: Wrench },
  { key: "other", label: "기타", icon: MoreHorizontal },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const VOICE_STATUS: Record<string, { label: string; cls: string }> = {
  uploaded: { label: "업로드됨", cls: "text-warm-500" },
  transcribing: { label: "전사 중", cls: "text-brand-600" },
  transcribed: { label: "전사 완료", cls: "text-brand-600" },
  summarized: { label: "일지 반영 완료", cls: "text-emerald-600" },
  failed: { label: "처리 실패", cls: "text-danger" },
};

function activityText(a: CareActivityItem): string {
  if (a.memo) return a.memo;
  if (a.data && typeof a.data === "object" && !Array.isArray(a.data)) {
    const m = (a.data as Record<string, unknown>).memo;
    if (typeof m === "string" && m) return m;
  }
  return "—";
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 브라우저별 지원 포맷 선택 (Chrome/Android=webm/opus, iOS Safari=mp4)
function pickAudioMime(): { mime: string; ext: string } {
  const MR = typeof window !== "undefined" ? window.MediaRecorder : undefined;
  if (MR?.isTypeSupported?.("audio/webm;codecs=opus")) return { mime: "audio/webm;codecs=opus", ext: "webm" };
  if (MR?.isTypeSupported?.("audio/webm")) return { mime: "audio/webm", ext: "webm" };
  if (MR?.isTypeSupported?.("audio/mp4")) return { mime: "audio/mp4", ext: "m4a" };
  return { mime: "", ext: "webm" }; // 빈 mime = 브라우저 기본값
}

export default function SessionActivityPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const sessionId = Number(id);
  const validId = Number.isInteger(sessionId) && sessionId > 0;
  const router = useRouter();
  const qc = useQueryClient();

  const [category, setCategory] = useState<string>("meal");
  const [memo, setMemo] = useState("");

  const detail = useQuery({
    queryKey: ["member", "session-detail", sessionId],
    enabled: validId,
    queryFn: () => memberApi.careSessionDetail(sessionId),
    // STT 진행 중인 음성이 있으면 자동 갱신
    refetchInterval: (q) => {
      const vls = (q.state.data as { voice_logs?: VoiceLogItem[] } | undefined)?.voice_logs ?? [];
      const pending = vls.some((v) => ["uploaded", "transcribing", "transcribed"].includes(v.status));
      return pending ? 4000 : false;
    },
  });

  const session = detail.data;
  const activities: CareActivityItem[] = session?.activities ?? [];
  const voiceLogs: VoiceLogItem[] = session?.voice_logs ?? [];
  const inProgress = session?.status === "in_progress";

  const addActivity = useMutation({
    mutationFn: () =>
      memberApi.addSessionActivity(sessionId, {
        category,
        data: { memo: memo.trim(), label: CAT_LABEL[category] ?? category },
        memo: memo.trim() || null,
      }),
    onSuccess: () => {
      toast.success("활동이 기록되었습니다");
      setMemo("");
      qc.invalidateQueries({ queryKey: ["member", "session-detail", sessionId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // ───────── 음성 녹음 ─────────
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const extRef = useRef<string>("webm");
  const elapsedRef = useRef(0);

  const cleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => cleanup, []);

  const uploadVoice = useMutation({
    mutationFn: (p: { blob: Blob; sec: number }) =>
      memberApi.uploadVoiceLog(sessionId, p.blob, p.sec, `voice.${extRef.current}`),
    onSuccess: () => {
      toast.success("음성이 업로드되었습니다. AI가 분석 중입니다.");
      qc.invalidateQueries({ queryKey: ["member", "session-detail", sessionId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const startRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("이 기기에서는 녹음을 지원하지 않습니다.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime, ext } = pickAudioMime();
      extRef.current = ext;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const sec = Math.max(1, elapsedRef.current);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        cleanup();
        setRecording(false);
        setElapsed(0);
        if (blob.size > 0) uploadVoice.mutate({ blob, sec });
        else toast.error("녹음된 내용이 없습니다.");
      };
      rec.start();
      recorderRef.current = rec;
      setElapsed(0);
      elapsedRef.current = 0;
      setRecording(true);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed((v) => v + 1);
        if (elapsedRef.current >= 1800) stopRecording(); // 30분 상한
      }, 1000);
    } catch {
      toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.");
      cleanup();
    }
  };

  const stopRecording = () => {
    try { recorderRef.current?.stop(); } catch { /* noop */ }
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-md mx-auto lg:max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-3">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-extrabold text-warm-800">케어 활동 기록</h1>
        {session && (
          <Badge variant={inProgress ? "success" : "outline"}>{inProgress ? "진행중" : session.status}</Badge>
        )}
      </div>
      <p className="text-sm text-warm-500 mb-5">
        {session?.match?.senior?.name ? `${session.match.senior.name} 님 · ` : ""}
        기록한 활동·음성은 AI 케어일지로 정리됩니다
      </p>

      {/* ───────── 동행 전체 경로(정확 주소) ───────── */}
      {session?.match?.companion_route && (
        <Card className="p-4 mb-4 border-brand-200">
          <div className="flex items-center gap-1.5 mb-3">
            <Navigation className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-bold text-warm-800">동행 경로</span>
            <Badge variant="outline" className="ml-auto">
              {session.match.companion_route.transport === "taxi" ? "택시" : session.match.companion_route.transport === "transit" ? "대중교통" : "이동수단 협의"}
            </Badge>
          </div>
          <ol className="relative space-y-3">
            {[
              { tag: "만남", addr: session.match.companion_route.meeting },
              ...session.match.companion_route.waypoints.map((w, i) => ({ tag: `경유 ${i + 1}`, addr: w })),
              { tag: "방문", addr: session.match.companion_route.destination },
              {
                tag: "복귀",
                addr: session.match.companion_route.return_to_origin
                  ? `${session.match.companion_route.meeting ?? "만남 장소"} (만남 장소)`
                  : session.match.companion_route.return_address,
              },
            ].map((stop, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-brand-600">{stop.tag}</div>
                  <div className="text-[14.5px] font-semibold text-warm-800 break-keep">{stop.addr ?? "-"}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12px] text-warm-500">자가용 이용은 불가하며, 교통비 등 실비는 보호자가 부담해요.</p>
        </Card>
      )}

      {!detail.isLoading && session && !inProgress && (
        <Card className="p-3 mb-4 bg-warm-50 text-warm-500 text-xs text-center">
          진행 중인 케어에서만 기록할 수 있습니다
        </Card>
      )}

      {/* ───────── 바우처 방문: 서비스 제공기록지 + 산모 서명(CAREN-MNH-01 3단계) ───────── */}
      {validId && session && <ProvisionRecordCard sessionId={sessionId} status={session.status} />}

      {/* ───────── 퇴근 후 일지 확인·수정(기능 14) ───────── */}
      {validId && session?.status === "completed" && <CareLogReviewCard sessionId={sessionId} />}

      {/* ───────── 칩 기록(기능 40) ───────── */}
      {validId && session && <ChipJournalCard sessionId={sessionId} status={session.status} />}

      {/* ───────── 음성 기록 ───────── */}
      <Card className="p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-bold text-warm-800">음성으로 기록</span>
          <span className="text-[12px] text-warm-500">말로 남기면 AI가 일지로 정리해요</span>
        </div>

        {!recording && (
          <Button
            size="lg"
            variant="brand"
            className="w-full"
            disabled={!inProgress || uploadVoice.isPending}
            onClick={startRecording}
          >
            {uploadVoice.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 업로드 중...</>
            ) : (
              <><Mic className="w-4 h-4" /> 녹음 시작</>
            )}
          </Button>
        )}

        {recording && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-danger font-bold text-lg">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
              {mmss(elapsed)}
            </div>
            <Button size="lg" variant="danger" className="w-full" onClick={stopRecording}>
              <Square className="w-4 h-4" /> 녹음 종료 및 업로드
            </Button>
          </div>
        )}

        {voiceLogs.length > 0 && (
          <div className="mt-4 space-y-2">
            {[...voiceLogs].reverse().map((v) => {
              const st = VOICE_STATUS[v.status] ?? { label: v.status, cls: "text-warm-500" };
              return (
                <div key={v.id} className="rounded-lg border border-warm-200 p-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 font-semibold">
                      {v.status === "summarized" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {v.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-danger" />}
                      {["uploaded", "transcribing", "transcribed"].includes(v.status) && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                      )}
                      <span className={st.cls}>{st.label}</span>
                    </span>
                    <span className="text-warm-500">{mmss(v.duration_sec)} · {formatDateTime(v.created_at)}</span>
                  </div>
                  {v.stt_text && <p className="text-xs text-warm-600 whitespace-pre-wrap mt-1">{v.stt_text}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ───────── 활동 기록(카테고리 + 메모) ───────── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const on = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors ${
                on ? "border-brand-400 bg-brand-50 text-brand-700" : "border-warm-200 text-warm-500 active:bg-warm-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[12px] font-semibold">{c.label}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={500}
        rows={3}
        disabled={!inProgress}
        placeholder={`${CAT_LABEL[category]} 관련 메모 (예: 점심 죽 한 그릇 모두 드심)`}
        className="w-full rounded-lg border border-warm-200 p-3 text-sm resize-none focus:outline-none focus:border-brand-400 disabled:bg-warm-50 disabled:text-warm-500"
      />
      <div className="text-right text-[12px] text-warm-500 mb-3">{memo.length}/500</div>

      <Button
        size="lg"
        variant="brand"
        className="w-full"
        disabled={!inProgress || addActivity.isPending}
        onClick={() => addActivity.mutate()}
      >
        <Plus className="w-4 h-4" /> {addActivity.isPending ? "기록 중..." : "활동 기록 추가"}
      </Button>

      {/* 기록된 활동 목록 */}
      <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase mt-7 mb-3">
        기록된 활동 {activities.length > 0 && `(${activities.length})`}
      </h2>
      {detail.isLoading && <Card className="p-4 text-center text-warm-500 text-sm">불러오는 중...</Card>}
      {!detail.isLoading && activities.length === 0 && (
        <Card className="p-6 text-center text-warm-500 text-sm">아직 기록된 활동이 없습니다</Card>
      )}
      <div className="space-y-2">
        {[...activities].reverse().map((a) => (
          <Card key={a.id} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline">{CAT_LABEL[a.category] ?? a.category}</Badge>
              <span className="text-[12px] text-warm-500">{a.performed_at ? formatDateTime(a.performed_at) : ""}</span>
            </div>
            <p className="text-sm text-warm-700 whitespace-pre-wrap">{activityText(a)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
