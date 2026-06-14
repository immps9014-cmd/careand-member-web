"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, LogIn, LogOut, Clock, MapPin, Wallet, Sparkles, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { memberApi, getCurrentCoords, type RecommendedCaregiver } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const DOMAIN: Record<string, string> = {
  senior: "시니어", postpartum: "산후", nursing: "간병", care: "간병", companion: "동행", housekeeping: "가사",
};

export default function HomePage() {
  const user = useAuth((s) => s.user);
  if (user?.role === "caregiver") return <CaregiverHome />;
  return <GuardianHome />;
}

/* ============ 보호자 홈 (코랄 디자인) ============ */
const CORAL = "#FF5A4D", CORAL2 = "#FF8A3D", INK = "#1C2030", INK2 = "#5B6172", INK3 = "#9AA0AD", LINE = "#EFF1F4", BG = "#F6F7F9";
type GNav = (path: string | null) => void;

function GTopBar({ go, unread }: { go: GNav; unread: number }) {
  return (
    <div style={{ background: "#fff", padding: "calc(10px + var(--safe-top,0px)) 16px 10px", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-.03em", color: CORAL, fontStyle: "italic" }}>Care&amp;</div>
        <div onClick={() => go("/request/new")} style={{ flex: 1, height: 42, background: "#fff", border: `2px solid ${CORAL}`, borderRadius: 21, display: "flex", alignItems: "center", gap: 8, padding: "0 15px", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="2.6"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span style={{ fontSize: 13, color: INK2, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>어떤 돌봄이 필요하세요?</span>
        </div>
        <div onClick={() => go("/notifications")} style={{ position: "relative", cursor: "pointer" }}>
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.9"><path d="M5 7h14l-1.2 10.5a2 2 0 01-2 1.8H8.2a2 2 0 01-2-1.8z" /><path d="M9 7a3 3 0 016 0" /></svg>
          {unread > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: CORAL, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        {([["홈", true], ["실시간 케어", false], ["건강관리", false], ["생활돌봄", false]] as [string, boolean][]).map(([t, on]) => (
          <div key={t} style={{ position: "relative", paddingBottom: 8, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 15, fontWeight: on ? 800 : 600, color: on ? INK : INK3 }}>{t}</span>
            {on && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, borderRadius: 3, background: CORAL }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function GHero({ go }: { go: GNav }) {
  return (
    <div style={{ padding: "14px 16px 0" }}>
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "linear-gradient(120deg,#DDF3E0,#C7EBD6 60%,#BEE7DF)", padding: "22px 20px", minHeight: 158 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#2E8A5E" }}>우리 어르신께 꼭 맞는 돌봄</div>
        <div style={{ fontSize: 23, fontWeight: 900, color: "#15402C", letterSpacing: "-.02em", lineHeight: 1.28, marginTop: 7 }}>안심부터 정성까지,<br /><span style={{ color: "#0E6B43" }}>첫 방문 케어 특가</span></div>
        <button onClick={() => go("/request/new")} style={{ marginTop: 14, height: 34, padding: "0 16px", borderRadius: 18, border: "none", background: "#0E6B43", color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>지금 매칭받기 →</button>
        <div style={{ position: "absolute", right: 14, top: 24, width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#0E6B43" strokeWidth="1.7"><path d="M12 21s-7-4.3-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 3.5C19 16.7 12 21 12 21z" /><path d="M12 8.5v3.5M10.2 10.2h3.6" strokeWidth="2" /></svg>
        </div>
        <div style={{ position: "absolute", right: 16, bottom: 14, background: "rgba(20,40,30,.5)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 14, padding: "3px 10px" }}>2 / 8</div>
      </div>
    </div>
  );
}

function GPromo() {
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 15, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 2px rgba(28,32,48,.04)" }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: CORAL }}>Care&amp;</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>는 첫 상담이 </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: INK, background: "linear-gradient(transparent 60%,#FFE1B0 60%)" }}>무료 상담</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>입니다</span>
        </div>
        <div style={{ width: 54, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${CORAL2},${CORAL})`, color: "#fff", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-4deg)", boxShadow: "0 6px 14px rgba(255,90,77,.3)" }}>FREE</div>
      </div>
    </div>
  );
}

function GQuickIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <div style={{ width: 50, height: 50, borderRadius: 16, background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(28,32,48,.07)" }}>{children}</div>;
}

function GQuick({ go }: { go: GNav }) {
  const items: { l: string; badge?: boolean; bg: string; to: string | null; ic: React.ReactNode }[] = [
    { l: "새 매칭", badge: true, bg: "#FFEAE5", to: "/request/new", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5A4D" strokeWidth="2"><path d="M4 8h12l-3-3M20 16H8l3 3" /></svg> },
    { l: "우리 어르신", bg: "#EAF1FF", to: "/seniors", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3E72D6" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" /></svg> },
    { l: "케어일지", bg: "#E7F7EF", to: "/logs", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F9D63" strokeWidth="2"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h4" /></svg> },
    { l: "방문일정", bg: "#F2ECFF", to: "/schedule", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A5CE0" strokeWidth="2"><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg> },
    { l: "건강체크", bg: "#FFF0E1", to: "/seniors", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E07712" strokeWidth="2"><path d="M3 13h4l2 5 4-12 2 7h6" /></svg> },
    { l: "올케어팜", badge: true, bg: "#EAF7E2", to: null, ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5AA82E" strokeWidth="2"><path d="M12 22V12M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5z" /></svg> },
    { l: "긴급요청", bg: "#FFE9EC", to: "/request/new", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E0484E" strokeWidth="2"><path d="M12 3l9 16H3z" /><path d="M12 9v4M12 16h.01" /></svg> },
    { l: "정산내역", bg: "#E7F4F2", to: "/settlements", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E9C8A" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 14h4" /></svg> },
    { l: "돌봄콘텐츠", bg: "#FDEBF3", to: null, ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D14A8E" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M11 9l4 3-4 3z" /></svg> },
    { l: "후기·리뷰", bg: "#FFF6DD", to: null, ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="#E8A800" stroke="#E8A800" strokeWidth="1.5"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" /></svg> },
    { l: "공지사항", bg: "#EAF1FF", to: "/notifications", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3E72D6" strokeWidth="2"><path d="M4 9v6h3l8 4V5L7 9z" /><path d="M18 9a4 4 0 010 6" /></svg> },
    { l: "고객센터", bg: "#EEEEF3", to: "/mypage", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B6172" strokeWidth="2"><path d="M5 12a7 7 0 0114 0v5a2 2 0 01-2 2h-2v-6h4M5 12v5a2 2 0 002 2h0" /></svg> },
  ];
  return (
    <div style={{ padding: "18px 10px 4px", background: "#fff", margin: "14px 0 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px 4px" }}>
        {items.map((it) => (
          <div key={it.l} onClick={() => go(it.to)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <div style={{ position: "relative" }}>
              <GQuickIcon bg={it.bg}>{it.ic}</GQuickIcon>
              {it.badge && <span style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", background: CORAL, border: "2px solid #fff" }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>{it.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GStars({ n }: { n: string }) {
  return <span style={{ color: "#F2A900", fontSize: 11, fontWeight: 800 }}>★ {n}</span>;
}

const FEED_PALETTE: { fg: string; bg: string }[] = [
  { fg: "#1F9D63", bg: "#E7F7EF" },
  { fg: "#7A5CE0", bg: "#F2ECFF" },
  { fg: "#3E72D6", bg: "#EAF1FF" },
  { fg: "#E07712", bg: "#FFF0E1" },
  { fg: "#0E9C8A", bg: "#E7F4F2" },
  { fg: "#D14A8E", bg: "#FDEBF3" },
];

function GCgCard({ c, pal, go }: { c: RecommendedCaregiver; pal: { fg: string; bg: string }; go: GNav }) {
  const display = c.name.replace(/^\[.*?\]\s*/, "");
  const av = display.charAt(0) || "?";
  const meta = [c.spec, c.distance_km != null ? `${c.distance_km}km` : null].filter(Boolean).join(" · ");
  return (
    <div onClick={() => go("/request/new")} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden", cursor: "pointer" }}>
      <div style={{ height: 108, background: pal.bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: pal.fg, boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>{av}</div>
        {c.tag && <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 800, color: "#fff", background: CORAL, borderRadius: 7, padding: "3px 8px" }}>{c.tag}</span>}
        <span style={{ position: "absolute", bottom: 9, right: 9, width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="2"><path d="M12 21s-7-4.3-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 3.5C19 16.7 12 21 12 21z" /></svg></span>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 800, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span><GStars n={c.rating} /></div>
        <div style={{ fontSize: 11.5, color: INK2, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</div>
        {c.base_rate != null && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 11, color: INK3, fontWeight: 600 }}>시간당</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: CORAL }}>{c.base_rate.toLocaleString()}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>원~</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GFeed({ go }: { go: GNav }) {
  const q = useQuery({
    queryKey: ["member", "guardian", "recommended"],
    queryFn: memberApi.recommendedCaregivers,
    retry: false,
    staleTime: 60_000,
  });
  const list = q.data ?? [];
  return (
    <div style={{ padding: "18px 16px 0", background: BG }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 13 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>가까운 추천 인력</div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: INK3 }}>{list.length}명</span>
      </div>
      {q.isLoading && <div style={{ textAlign: "center", color: INK3, fontSize: 13, padding: "18px 0" }}>불러오는 중…</div>}
      {!q.isLoading && list.length === 0 && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "26px 0", textAlign: "center", color: INK3, fontSize: 13 }}>추천할 인력이 아직 없습니다</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {list.map((c, i) => <GCgCard key={c.id} c={c} pal={FEED_PALETTE[i % FEED_PALETTE.length]} go={go} />)}
      </div>
    </div>
  );
}

const REQ_ST: Record<string, { c: string; bg: string; l: string }> = {
  open: { c: "#B8860B", bg: "#FFF6DD", l: "매칭중" },
  matching: { c: "#B8860B", bg: "#FFF6DD", l: "매칭중" },
  matched: { c: "#1F9D63", bg: "#E7F7EF", l: "매칭완료" },
  cancelled: { c: INK3, bg: LINE, l: "취소" },
  expired: { c: INK3, bg: LINE, l: "만료" },
};

function GMyRequests({ go }: { go: GNav }) {
  const q = useQuery({
    queryKey: ["member", "guardian", "requests"],
    queryFn: () => memberApi.guardianRequests(),
    retry: false,
    staleTime: 30_000,
  });
  const list = q.data ?? [];
  return (
    <div style={{ padding: "22px 16px 0", background: BG }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 13 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>내 매칭 요청</div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: INK3 }}>{list.length}건</span>
      </div>
      {q.isLoading && <div style={{ textAlign: "center", color: INK3, fontSize: 13, padding: "18px 0" }}>불러오는 중…</div>}
      {!q.isLoading && list.length === 0 && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "26px 0", textAlign: "center", color: INK3, fontSize: 13 }}>진행 중인 매칭 요청이 없습니다</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((r) => {
          const st = REQ_ST[r.status];
          const name = r.senior?.name ?? r.nursing_patient?.name ?? r.service_address?.label ?? "대상자";
          const dom = r.service_domain === "nursing" ? "간병" : r.service_domain === "housekeeping" ? "가사" : null;
          return (
            <div key={r.id} onClick={() => go(`/request/${r.id}`)} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: INK }}>{name}</span>
                  {dom && <span style={{ fontSize: 10, fontWeight: 700, color: "#3E72D6", background: "#EAF1FF", borderRadius: 6, padding: "2px 6px" }}>{dom}</span>}
                  {st && <span style={{ fontSize: 10, fontWeight: 800, color: st.c, background: st.bg, borderRadius: 6, padding: "2px 7px" }}>{st.l}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: INK2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(r.category?.name ?? "돌봄")} · {r.scheduled_start ? formatDateTime(r.scheduled_start) : "일정 미정"}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuardianHome() {
  const router = useRouter();
  const go: GNav = (path) => { if (path) router.push(path); };
  const notif = useQuery({
    queryKey: ["member", "guardian", "notif"],
    queryFn: memberApi.notifications,
    retry: false,
    staleTime: 30_000,
  });
  const unread = notif.data?.unread ?? 0;

  return (
    <div style={{ background: BG }}>
      <GTopBar go={go} unread={unread} />
      <div style={{ background: "#fff", paddingBottom: 2 }}><GHero go={go} /><GPromo /></div>
      <GQuick go={go} />
      <GFeed go={go} />
      <GMyRequests go={go} />
      <div style={{ height: 26 }} />
    </div>
  );
}

/* ============ 인력 홈 ============ */
const SESSION_STATUS: Record<string, { variant: "success" | "outline" | "warn"; label: string }> = {
  in_progress: { variant: "success", label: "진행중" },
  completed: { variant: "outline", label: "완료" },
  scheduled: { variant: "warn", label: "예정" },
};

function CaregiverHome() {
  const qc = useQueryClient();
  const matches = useQuery({ queryKey: ["member", "cg", "matches"], queryFn: memberApi.myMatches });
  const sessions = useQuery({ queryKey: ["member", "cg", "sessions"], queryFn: memberApi.mySessions });

  // 세션별 이번 진행 중 업로드한 완료 사진 수(클라이언트 측 추적)
  const [photoCount, setPhotoCount] = useState<Record<number, number>>({});

  const accept = useMutation({
    mutationFn: (cid: number) => memberApi.acceptMatch(cid),
    onSuccess: () => { toast.success("수락했습니다."); qc.invalidateQueries({ queryKey: ["member", "cg"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const reject = useMutation({
    mutationFn: (cid: number) => memberApi.rejectMatch(cid),
    onSuccess: () => { toast.success("거절했습니다."); qc.invalidateQueries({ queryKey: ["member", "cg"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const checkin = useMutation({
    mutationFn: async (sid: number) => {
      const coords = await getCurrentCoords();
      return memberApi.checkin(sid, coords);
    },
    onSuccess: () => { toast.success("출근 체크 완료"); qc.invalidateQueries({ queryKey: ["member", "cg", "sessions"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const checkout = useMutation({
    mutationFn: async (sid: number) => {
      const coords = await getCurrentCoords();
      return memberApi.checkout(sid, coords);
    },
    onSuccess: () => { toast.success("퇴근 체크 완료"); qc.invalidateQueries({ queryKey: ["member", "cg", "sessions"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const uploadPhoto = useMutation({
    mutationFn: ({ sid, file }: { sid: number; file: File }) => memberApi.uploadSessionPhoto(sid, file),
    onSuccess: (_d, v) => {
      toast.success("완료 사진이 등록되었습니다.");
      setPhotoCount((p) => ({ ...p, [v.sid]: (p[v.sid] ?? 0) + 1 }));
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const pending = matches.data?.filter((m) => m.response === "pending") ?? [];

  return (
    <div className="p-5">
      <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">오늘의 케어</h1>
      <p className="text-sm text-warm-500 mt-1 mb-5">수락 대기 {pending.length}건 · 케어 플로우</p>

      {/* 매칭 알림 (수락 대기) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-extrabold tracking-wider text-warm-400 uppercase">새 매칭 제안</h2>
        <span className="text-xs text-warm-400">{pending.length}건</span>
      </div>
      {pending.length === 0 && (
        <Card className="p-6 text-center text-warm-400 text-sm mb-6">대기 중인 매칭 제안이 없습니다</Card>
      )}
      <div className="space-y-4 mb-7">
        {pending.map((m) => (
          <Card key={m.candidate_id} className="p-4 border-brand-300 shadow-md">
            {/* 새 요청 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="brand">새 요청</Badge>
              <span className="text-xs font-semibold text-warm-400 font-en">AI {(m.ai_score * 100).toFixed(0)}점 추천</span>
              {m.rank === 1 && <Badge variant="success" className="ml-auto">1순위</Badge>}
            </div>

            {/* 대상자 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-extrabold text-warm-800">{m.senior_name}</span>
              <Badge variant="outline">{DOMAIN[m.service_domain] ?? m.service_domain}</Badge>
            </div>

            {/* 수당·거리·시간 한눈에 */}
            <div className="rounded-lg bg-warm-50 divide-y divide-warm-200/70 px-3.5 mb-4">
              <div className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-warm-500"><Clock className="w-3.5 h-3.5" /> 일시</span>
                <span className="text-sm font-semibold text-warm-700">
                  {m.scheduled_start ? formatDateTime(m.scheduled_start) : "일정 미정"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-warm-500"><Clock className="w-3.5 h-3.5" /> 소요 시간</span>
                <span className="text-sm font-semibold text-warm-700">{m.duration_min}분</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-warm-500"><MapPin className="w-3.5 h-3.5" /> 이동 거리</span>
                <span className="text-sm font-medium text-warm-400">위치 확인 필요</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-warm-500"><Wallet className="w-3.5 h-3.5" /> 예상 수당</span>
                <span className="text-sm font-medium text-warm-400">수락 후 정산</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="lg" variant="outline" className="flex-1" disabled={reject.isPending}
                onClick={() => reject.mutate(m.candidate_id)}>
                <X className="w-4 h-4" /> 거절
              </Button>
              <Button size="lg" variant="brand" className="flex-[2] shadow-md" disabled={accept.isPending}
                onClick={() => accept.mutate(m.candidate_id)}>
                <Check className="w-4 h-4" /> 수락하기
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 오늘 일정 */}
      <h2 className="text-xs font-extrabold tracking-wider text-warm-400 uppercase mb-3">내 케어 일정</h2>
      {sessions.data?.length === 0 && (
        <Card className="p-6 text-center text-warm-400 text-sm">예정된 일정이 없습니다</Card>
      )}
      <div className="space-y-3">
        {sessions.data?.map((s) => {
          const st = SESSION_STATUS[s.status];
          const active = s.status === "in_progress";
          return (
            <Card key={s.id} className={active ? "p-4 border-brand-300 shadow-md" : "p-4"}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-warm-800">{s.senior_name}</span>
                  <Badge variant="outline">{DOMAIN[s.service_domain] ?? s.service_domain}</Badge>
                </div>
                <Badge variant={st?.variant ?? "warn"}>{st?.label ?? s.status}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-warm-500 mb-3">
                <Clock className="w-3.5 h-3.5" />
                {s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"} · {s.duration_min}분
              </div>
              {active && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> 케어 진행 중입니다
                </div>
              )}
              {s.status === "scheduled" && (
                <Button size="lg" variant="brand" className="w-full shadow-md" disabled={checkin.isPending}
                  onClick={() => checkin.mutate(s.id)}>
                  <LogIn className="w-4 h-4" /> 출근 체크
                </Button>
              )}
              {s.status === "in_progress" && (
                <div className="space-y-2">
                  {s.photo_required && (
                    <>
                      <label className={`flex items-center justify-center gap-2 w-full h-11 rounded-md border text-sm font-semibold cursor-pointer transition-colors ${
                        (photoCount[s.id] ?? 0) > 0
                          ? "border-warm-200 text-warm-600 active:bg-warm-50"
                          : "border-brand-300 text-brand-700 bg-brand-50 active:bg-brand-100"
                      } ${uploadPhoto.isPending ? "opacity-60 pointer-events-none" : ""}`}>
                        <Camera className="w-4 h-4" />
                        {(photoCount[s.id] ?? 0) > 0
                          ? `완료 사진 ${photoCount[s.id]}장 등록됨 · 추가 촬영`
                          : "완료 사진 촬영 (필수)"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={uploadPhoto.isPending}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPhoto.mutate({ sid: s.id, file: f });
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {(photoCount[s.id] ?? 0) === 0 && (
                        <p className="text-[11px] text-warm-400 text-center">
                          완료 사진을 1장 이상 등록해야 퇴근 체크가 완료됩니다
                        </p>
                      )}
                    </>
                  )}
                  <Button size="lg" variant="danger" className="w-full" disabled={checkout.isPending}
                    onClick={() => checkout.mutate(s.id)}>
                    <LogOut className="w-4 h-4" /> 퇴근 체크
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
