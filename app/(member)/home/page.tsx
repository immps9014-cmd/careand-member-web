"use client";
import { DOMAIN_LABEL as DOMAIN, caregiverUi, caregiverPrimaryDomain } from "@/lib/caregiverType";
import { roleLabel } from "@/lib/role";
import { UI } from "@/lib/theme";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, LogIn, LogOut, Clock, MapPin, Wallet, Sparkles, Camera, ChevronDown, ShieldCheck, XCircle, Phone, ClipboardList, Users, Search, ChevronRight, HeartPulse, Stethoscope, HelpCircle, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { useServiceDomains, domainIcon, FALLBACK_DOMAINS } from "@/lib/serviceDomains";
import { memberApi, getCurrentCoords, type RecommendedCaregiver, type CaregiverProfile, type MyMatch } from "@/lib/api/member";
import { organizationApi } from "@/lib/api/organization";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api/client";
import { formatDateTime, formatKRW } from "@/lib/utils";
import { ProgressPipeline } from "@/components/ProgressPipeline";

export default function HomePage() {
  const user = useAuth((s) => s.user);
  if (user?.role === "caregiver") return <CaregiverHome />;
  if (user?.role === "organization") return <OrgHome />;
  return <GuardianHome />;
}

/* ============ 보호자 홈 ============ */
// 디자인 토큰 SSOT 참조 (값은 lib/theme.ts). ACCENT=brand-500, ACCENT_SOFT=brand-400, INK/INK2/INK3=warm, LINE/BG=warm.
const ACCENT = UI.accent, ACCENT_SOFT = UI.accentSoft, INK = UI.ink, INK2 = UI.ink2, INK3 = UI.ink3, LINE = UI.line, BG = UI.bg;
type GNav = (path: string | null) => void;

function GTopBar({ go, unread, searchTo = "/request/new", searchPlaceholder = "어떤 돌봄이 필요하세요?" }: { go: GNav; unread: number; searchTo?: string; searchPlaceholder?: string }) {
  const user = useAuth((s) => s.user);
  return (
    <div style={{ background: "#fff", padding: "calc(12px + var(--safe-top,0px)) 16px 12px", position: "sticky", top: 0, zIndex: 10, borderBottom: `1px solid ${LINE}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-.03em", color: ACCENT, fontStyle: "italic" }}>Care&amp;</div>
        <div
          onClick={() => go(searchTo)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(searchTo); } }}
          style={{ flex: 1, height: 42, background: "#fff", border: `2px solid ${ACCENT}`, borderRadius: 21, display: "flex", alignItems: "center", gap: 8, padding: "0 15px", cursor: "pointer" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.6"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span style={{ fontSize: 13, color: INK2, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{searchPlaceholder}</span>
        </div>
        <div
          onClick={() => go("/notifications")}
          role="button"
          tabIndex={0}
          aria-label={unread > 0 ? `알림, 읽지 않은 알림 ${unread}건` : "알림"}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go("/notifications"); } }}
          style={{ position: "relative", cursor: "pointer" }}
        >
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.9"><path d="M5 7h14l-1.2 10.5a2 2 0 01-2 1.8H8.2a2 2 0 01-2-1.8z" /><path d="M9 7a3 3 0 016 0" /></svg>
          {unread > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: ACCENT, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>
          )}
        </div>
        <div
          onClick={() => go("/mypage")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go("/mypage"); } }}
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.15, cursor: "pointer" }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: INK3 }}>{roleLabel(user?.role)}</span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: INK, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? ""}</span>
        </div>
      </div>
    </div>
  );
}

function GQuickIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <div style={{ width: 50, height: 50, borderRadius: 16, background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(28,32,48,.07)" }}>{children}</div>;
}

/* 자주 쓰는 핵심 메뉴(6) + 보조 메뉴 */
function GQuick({ go }: { go: GNav }) {
  const items: { l: string; bg: string; to: string; ic: React.ReactNode }[] = [
    { l: "방문일정", bg: "#F2ECFF", to: "/schedule", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A5CE0" strokeWidth="2"><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg> },
    { l: "케어일지", bg: "#E7F7EF", to: "/logs", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F9D63" strokeWidth="2"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h4" /></svg> },
    { l: "결제내역", bg: "#E7F4F2", to: "/payments", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E9C8A" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 14h4" /></svg> },
    { l: "긴급요청", bg: "#FFE9EC", to: "/request/new", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E0484E" strokeWidth="2"><path d="M12 3l9 16H3z" /><path d="M12 9v4M12 16h.01" /></svg> },
  ];
  const sub: { l: string; to: string }[] = [
    { l: "이용가이드", to: "/guide" },
    { l: "공지사항", to: "/notifications" },
    { l: "고객센터", to: "/mypage" },
  ];
  return (
    <div style={{ padding: "18px 12px 16px", background: "#fff", margin: "14px 0 0" }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: INK, padding: "0 4px 14px", letterSpacing: "-.01em" }}>자주 쓰는 메뉴</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px 4px" }}>
        {items.map((it) => (
          <div key={it.l} onClick={() => go(it.to)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <GQuickIcon bg={it.bg}>{it.ic}</GQuickIcon>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: INK, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>{it.l}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 18, paddingTop: 15, borderTop: `1px solid ${LINE}`, justifyContent: "center" }}>
        {sub.map((it) => (
          <button key={it.l} onClick={() => go(it.to)} style={{ background: "none", border: 0, padding: 0, fontSize: 12.5, fontWeight: 600, color: INK2, cursor: "pointer" }}>{it.l}</button>
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

/** 돌봄전문가 리스트 행 — AI 추천/전체 리스트 공용(가로형 1행). */
function GCgRow({ c, pal, go }: { c: RecommendedCaregiver; pal: { fg: string; bg: string }; go: GNav }) {
  const display = c.name.replace(/^\[.*?\]\s*/, "");
  const av = display.charAt(0) || "?";
  const meta = [c.spec, c.region, c.distance_km != null ? `${c.distance_km}km` : null].filter(Boolean).join(" · ");
  return (
    <div
      onClick={() => go(`/caregivers/${c.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(`/caregivers/${c.id}`); } }}
      style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer" }}
    >
      <div style={{ width: 46, height: 46, borderRadius: "50%", background: pal.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: pal.fg, flexShrink: 0 }}>{av}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
          <GStars n={c.rating} />
          {c.tag && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: ACCENT, borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>{c.tag}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: INK2, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta || "돌봄전문가"}</div>
      </div>
      {c.base_rate != null && (
        <div style={{ textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: ACCENT }}>{c.base_rate.toLocaleString()}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>원~</span>
        </div>
      )}
      <ChevronRight size={16} color={INK3} style={{ flexShrink: 0 }} />
    </div>
  );
}

/**
 * 보호자 개인화 도메인 신호 — 홈 featured(매칭 시작하기) 카드와 AI 추천 목록이 공유하는 SSOT.
 * 우선순위: 최근 매칭요청 도메인 → 가입 intent(생활지원/산모/아이돌봄/마음돌봄)
 *          → 대상 정보 보유 폴백(intent=care 자동인식) → null(기본, 전체 추천).
 * 두 곳이 같은 도메인을 쓰도록 하나의 훅으로 묶어, 상단 카드와 아래 추천이 어긋나지 않게 한다.
 */
function useGuardianPreferredDomain(): string | null {
  const user = useAuth((s) => s.user);
  const role = user?.role;
  const domainsQuery = useServiceDomains();
  const reqQ = useQuery({
    queryKey: ["member", "guardian", "requests"],
    queryFn: () => memberApi.guardianRequests(),
    retry: false,
    staleTime: 30_000,
    enabled: role === "guardian",
  });
  const needsFallback = role === "guardian" && (user?.guardian?.intent ?? "care") === "care";
  const ppOwnQ = useQuery({ queryKey: ["member", "postpartum-clients"], queryFn: () => memberApi.postpartumClients(), retry: false, staleTime: 60_000, enabled: needsFallback });
  const addrOwnQ = useQuery({ queryKey: ["member", "addresses"], queryFn: () => memberApi.addresses(), retry: false, staleTime: 60_000, enabled: needsFallback });
  const childOwnQ = useQuery({ queryKey: ["member", "children"], queryFn: () => memberApi.children(), retry: false, staleTime: 60_000, enabled: needsFallback });
  const mentalOwnQ = useQuery({ queryKey: ["member", "mental-care-clients"], queryFn: () => memberApi.mentalCareClients(), retry: false, staleTime: 60_000, enabled: needsFallback });

  if (role !== "guardian") return null;

  // 유효 도메인 토큰 집합 — guardian 은 병원간병(nursing)도 안내용으로 유지되므로 포함.
  const tokens = new Set<string>((domainsQuery.data ?? FALLBACK_DOMAINS).map((d) => d.token));
  tokens.add("nursing");
  const inDomains = (token?: string): token is string => !!token && tokens.has(token);

  const recentToken = [...(reqQ.data ?? [])]
    .sort((a, b) => (b.scheduled_start ?? "").localeCompare(a.scheduled_start ?? ""))
    .map((r) => r.service_domain)
    .find(inDomains);
  const intentToken =
    user?.guardian?.intent === "housekeeping"
      ? "living_support"
      : (["postpartum", "childcare", "mental_care"] as const).includes(
            user?.guardian?.intent as "postpartum" | "childcare" | "mental_care",
          )
        ? (user?.guardian?.intent as string)
        : null;
  const ownsFallbackToken =
    (ppOwnQ.data?.length ?? 0) > 0 && inDomains("postpartum")
      ? "postpartum"
      : (addrOwnQ.data?.length ?? 0) > 0 && inDomains("living_support")
        ? "living_support"
        : (childOwnQ.data?.length ?? 0) > 0 && inDomains("childcare")
          ? "childcare"
          : (mentalOwnQ.data?.length ?? 0) > 0 && inDomains("mental_care")
            ? "mental_care"
            : null;
  return recentToken ?? (inDomains(intentToken ?? undefined) ? intentToken : ownsFallbackToken);
}

function GFeed({ go }: { go: GNav }) {
  // featured 카드와 동일한 도메인으로 추천 — 도메인 불일치 카드 노출 방지.
  const preferredDomain = useGuardianPreferredDomain();
  const q = useQuery({
    queryKey: ["member", "guardian", "recommended", preferredDomain ?? "all"],
    queryFn: () => memberApi.recommendedCaregivers(preferredDomain ?? undefined),
    retry: false,
    staleTime: 60_000,
  });
  const list = q.data ?? [];
  // AI 추천 카드 목록 — 접이식, 기본 펼침.
  const [open, setOpen] = useState(true);
  // 도메인 전체 목록 — 접이식, 기본 접음.
  const [allOpen, setAllOpen] = useState(false);
  // 도메인 결정 — 개인화 도메인이 있으면 그 도메인, 없으면 추천 전문가의 최다 도메인.
  const domCount: Record<string, number> = {};
  list.forEach((c) => {
    const d = c.domains?.[0];
    if (d) domCount[d] = (domCount[d] ?? 0) + 1;
  });
  const topDomain = preferredDomain ?? Object.entries(domCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  // 전체 리스트 — 해당 도메인의 전문가만(도메인 미확정 시 전체 폴백). 추천 로딩 완료 후 조회.
  const allQ = useQuery({
    queryKey: ["member", "caregivers", "byDomain", topDomain ?? "all"],
    queryFn: () => memberApi.caregiversByDomain(topDomain),
    retry: false,
    staleTime: 60_000,
    enabled: !q.isLoading,
  });
  // 위 'AI 추천'에 이미 노출된 전문가는 전체 리스트에서 제외 — 같은 화면에서 카드가 중복 노출되지 않도록.
  const recIds = new Set(list.map((c) => c.id));
  // 해당 도메인 전문가를 최대 10명만. 정렬은 백엔드가 보호자 지역(시·군·구) 우선 → 거리 순으로 처리.
  const allList = (topDomain ? (allQ.data ?? []).filter((c) => (c.domains ?? []).includes(topDomain)) : (allQ.data ?? []))
    .filter((c) => !recIds.has(c.id))
    .slice(0, 10);
  const allTitle = topDomain ? `${DOMAIN[topDomain] ?? "돌봄"} 돌봄전문가 전체` : "전체 돌봄전문가";

  return (
    <div style={{ padding: "18px 16px 0", background: BG }}>
      {/* ① AI 추천 — 접이식(기본 접음), 리스트형 */}
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>가까운 AI추천 돌봄전문가</div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: INK3 }}>{list.length}명</span>
        <ChevronDown size={18} color={INK3} style={{ marginLeft: 8, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div style={{ marginTop: 13 }}>
          {q.isLoading && <div style={{ textAlign: "center", color: INK3, fontSize: 13, padding: "18px 0" }}>불러오는 중…</div>}
          {!q.isLoading && list.length === 0 && (
            <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "26px 0", textAlign: "center", color: INK3, fontSize: 13 }}>추천할 돌봄전문가가 아직 없습니다</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((c, i) => <GCgRow key={c.id} c={c} pal={FEED_PALETTE[i % FEED_PALETTE.length]} go={go} />)}
          </div>
        </div>
      )}

      {/* ② 전체 리스트 — 해당 도메인 전문가 전체(접이식, 기본 접음) */}
      <div style={{ marginTop: 22 }}>
        <button onClick={() => setAllOpen((v) => !v)} aria-expanded={allOpen} style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>{allTitle}</div>
          {!allQ.isLoading && <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: INK3 }}>{allList.length}명</span>}
          <ChevronDown size={18} color={INK3} style={{ marginLeft: 8, transition: "transform .2s", transform: allOpen ? "rotate(180deg)" : "none" }} />
        </button>
        {allOpen && (
          <div style={{ marginTop: 13 }}>
            {allQ.isLoading && <div style={{ textAlign: "center", color: INK3, fontSize: 13, padding: "18px 0" }}>불러오는 중…</div>}
            {!allQ.isLoading && allList.length === 0 && (
              <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "26px 0", textAlign: "center", color: INK3, fontSize: 13 }}>등록된 돌봄전문가가 없습니다</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allList.map((c, i) => <GCgRow key={c.id} c={c} pal={FEED_PALETTE[i % FEED_PALETTE.length]} go={go} />)}
            </div>
          </div>
        )}
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
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: "22px 16px 0", background: BG }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: 13, background: "none", border: 0, padding: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>내 매칭 요청</div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: INK3 }}>{list.length}건</span>
        <ChevronDown size={18} color={INK3} style={{ marginLeft: 8, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <>
      {q.isLoading && <div style={{ textAlign: "center", color: INK3, fontSize: 13, padding: "18px 0" }}>불러오는 중…</div>}
      {!q.isLoading && list.length === 0 && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "26px 0", textAlign: "center", color: INK3, fontSize: 13 }}>진행 중인 매칭 요청이 없습니다</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((r) => {
          const st = REQ_ST[r.status];
          const name = r.senior?.name ?? r.nursing_patient?.name ?? r.service_address?.label ?? "대상자";
          const dom = r.service_domain === "nursing" ? "간병" : r.service_domain === "living_support" ? "생활지원" : null;
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
                {/* 진행 단계 파이프라인 */}
                <div style={{ marginTop: 10 }}>
                  <ProgressPipeline
                    requestStatus={r.status}
                    matchStatus={r.match?.status}
                    paymentStatus={r.match?.payment_status}
                  />
                </div>
                {/* 매칭완료: 케어자 이름·케어 일정 노출 */}
                {r.status === "matched" && r.match && (
                  <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                      <span style={{ color: INK3, fontWeight: 700, minWidth: 44 }}>케어자</span>
                      <span style={{ color: INK, fontWeight: 800 }}>{r.match.caregiver_name ?? "배정 중"}</span>
                      {r.match.payment_status === "paid" && (
                        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#1F9D63", background: "#E7F7EF", borderRadius: 6, padding: "2px 7px" }}>결제완료</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                      <span style={{ color: INK3, fontWeight: 700, minWidth: 44 }}>케어 일정</span>
                      <span style={{ color: INK2, fontWeight: 600 }}>{r.match.scheduled_start ? formatDateTime(r.match.scheduled_start) : (r.scheduled_start ? formatDateTime(r.scheduled_start) : "일정 협의 중")}</span>
                    </div>
                  </div>
                )}
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}

/* 6개 돌봄 도메인 서비스 허브 — 이미지 대신 도메인별 그라디언트 타일(추후 실사진 교체 가능).
   각 타일 탭 → 해당 서비스 신청 플로우(request/new?domain=). 케어네이션 메인 벤토 그리드 참고. */
// 케어네이션풍 저채도 팔레트 — 붕 뜨지 않는 차분한 세이지/틸 계열. 배경은 미세 그라디언트,
// ink는 그라디언트 동계열 딥톤(제목/설명/CTA). 도메인 순서가 바뀌어도 대비 유지.
type Tone = { grad: string; ink: { title: string; sub: string; cta: string }; badge?: { label: string; variant: "new" | "hot" | "beta" | "info" } };
const DOMAIN_TONE: Record<string, Tone> = {
  senior: { grad: "linear-gradient(135deg,#FDF1EC,#F8DDD0)", ink: { title: "#7A3A28", sub: "#A56A57", cta: "#B94C2E" } },
  nursing: { grad: "linear-gradient(135deg,#F1EEEA,#E4DDD3)", ink: { title: "#4A4238", sub: "#7A7060", cta: "#6B5F4E" }, badge: { label: "기관", variant: "info" } },
  living_support: { grad: "linear-gradient(135deg,#F6F0EA,#EBDFD2)", ink: { title: "#6B4A32", sub: "#927056", cta: "#8A6238" } },
  postpartum: { grad: "linear-gradient(135deg,#FBEDEF,#F3D9DE)", ink: { title: "#7A3E48", sub: "#A5707A", cta: "#A65A66" }, badge: { label: "NEW", variant: "new" } },
  childcare: { grad: "linear-gradient(135deg,#FBF2E6,#F2E2C6)", ink: { title: "#6E5228", sub: "#977442", cta: "#8F6E30" }, badge: { label: "NEW", variant: "new" } },
  mental_care: { grad: "linear-gradient(135deg,#F7EEEC,#EFDCD6)", ink: { title: "#6E453C", sub: "#9A6D62", cta: "#8A574C" } },
};
const DEFAULT_TONE: Tone = { grad: "linear-gradient(135deg,#F7F4F1,#EAE4DD)", ink: { title: "#3A342E", sub: "#6B655C", cta: "#8A6238" } };

function GServices({ go }: { go: GNav }) {
  const user = useAuth((s) => s.user);
  const role = user?.role;
  const domainsQuery = useServiceDomains();
  // 개인화 도메인 신호 — AI 추천 목록(GFeed)과 동일한 훅을 공유해 상단 featured 카드와 어긋나지 않게 한다.
  const preferredToken = useGuardianPreferredDomain();
  // 레지스트리(SSOT). 보호자 신청 위저드는 병원간병을 숨기지만, 홈 허브에는 6번째 타일로
  // '기관 전용' 안내용 노출(탭 시 신청 대신 안내). 기관은 정상 신청 가능.
  const base = (domainsQuery.data ?? FALLBACK_DOMAINS).filter(
    (d) => !(d.token === "nursing" && role === "guardian"),
  );
  const nursingMeta = FALLBACK_DOMAINS.find((d) => d.token === "nursing");
  const domains =
    role === "guardian" && nursingMeta && !base.some((d) => d.token === "nursing")
      ? [...base, nursingMeta]
      : base;
  if (domains.length === 0) return null;

  // featured(맨 위 큰 카드) 개인화 — preferredToken(useGuardianPreferredDomain)에 맞는 서비스를 최상단으로.
  let ordered = domains;
  if (preferredToken) {
    const idx = domains.findIndex((d) => d.token === preferredToken);
    if (idx > 0) ordered = [domains[idx], ...domains.slice(0, idx), ...domains.slice(idx + 1)];
  }
  const [featured, ...rest] = ordered;
  const CornerBadge = ({ b }: { b?: { label: string; variant: "new" | "hot" | "beta" | "info" } }) =>
    b ? (
      <Badge variant={b.variant} style={{ position: "absolute", top: 10, right: 10 }}>
        {b.label}
      </Badge>
    ) : null;

  return (
    <div style={{ padding: "18px 16px 6px", background: "#fff", marginTop: 14 }}>
      <div style={{ padding: "0 2px 12px" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>돌봄 서비스</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: INK2, marginTop: 4 }}>나에게 꼭 맞는 돌봄으로, 필요한 돌봄을 지금 바로 요청하세요</div>
      </div>

      {/* Featured 타일 */}
      {(() => {
        const tone = DOMAIN_TONE[featured.token] ?? DEFAULT_TONE;
        const Icon = domainIcon(featured.icon);
        return (
          <button
            onClick={() => go(`/request/new?domain=${featured.token}`)}
            style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", background: tone.grad, padding: "22px 20px", minHeight: 132, textAlign: "left", cursor: "pointer", border: "none", display: "block" }}
          >
            <CornerBadge b={tone.badge} />
            <div style={{ fontSize: 19, fontWeight: 900, color: tone.ink.title, letterSpacing: "-.02em", lineHeight: 1.3 }}>{featured.label}</div>
            <div style={{ fontSize: 12.5, color: tone.ink.sub, marginTop: 5 }}>{featured.desc}</div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, height: 38, padding: "0 16px", borderRadius: 19, background: tone.ink.cta, color: "#fff", fontSize: 13, fontWeight: 800 }}>
              매칭 시작하기 <ChevronRight size={15} />
            </span>
            <Icon size={72} color={tone.ink.cta} strokeWidth={1.4} style={{ position: "absolute", right: 14, bottom: 10, opacity: 0.16 }} />
          </button>
        );
      })()}

      {/* 나머지 도메인 타일 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginTop: 10 }}>
        {rest.map((d) => {
          const tone = DOMAIN_TONE[d.token] ?? DEFAULT_TONE;
          const Icon = domainIcon(d.icon);
          // 보호자에게 병원간병은 기관 전용 — 탭 시 신청 대신 안내
          const orgOnly = d.token === "nursing" && role === "guardian";
          return (
            <button
              key={d.token}
              onClick={() =>
                orgOnly
                  ? toast("병원 간병은 기관 회원 전용 서비스예요.")
                  : go(`/request/new?domain=${d.token}`)
              }
              style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: tone.grad, minHeight: 104, padding: "13px 14px", display: "flex", flexDirection: "column", justifyContent: "flex-end", textAlign: "left", cursor: "pointer", border: "none", opacity: orgOnly ? 0.72 : 1 }}
            >
              <CornerBadge b={tone.badge} />
              <Icon size={46} color={tone.ink.title} strokeWidth={1.4} style={{ position: "absolute", right: 10, top: 10, opacity: 0.16 }} />
              <div style={{ fontSize: 14.5, fontWeight: 800, color: tone.ink.title, letterSpacing: "-.01em" }}>{d.label}</div>
              <div style={{ fontSize: 11, color: tone.ink.sub, marginTop: 2 }}>{orgOnly ? "기관 회원 전용" : d.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 온보딩 — 어르신돌봄 보호자가 돌봄대상(부모님) 미등록 시 홈 최상단에서 먼저 등록을 유도.
   등록 입구를 요청폼(request/new) 안이 아니라 홈에 두고 returnTo=/home 로 복귀시켜,
   "가입→부모 등록→다시 매칭요청폼" 루프에 갇히지 않게 한다. 등록되면 CTA는 사라진다. */
function GOnboardSenior({ go }: { go: GNav }) {
  const user = useAuth((s) => s.user);
  const isCareGuardian = (user?.guardian?.intent ?? "care") === "care";
  const seniors = useQuery({
    queryKey: ["member", "seniors"],
    queryFn: () => memberApi.seniors(),
    retry: false,
    staleTime: 60_000,
    enabled: isCareGuardian,
  });
  if (!isCareGuardian || !seniors.isSuccess || seniors.data.length > 0) return null;
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "linear-gradient(120deg,#FFE9E1,#FFD9CE 60%,#FFC9BB)", padding: "22px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#C2410C" }}>돌봄 시작 준비</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: INK, letterSpacing: "-.02em", lineHeight: 1.35, marginTop: 6 }}>먼저 부모님(돌봄대상)을<br />등록해 주세요</div>
        <div style={{ fontSize: 12.5, color: INK2, marginTop: 7, lineHeight: 1.5 }}>어르신 정보를 등록하면 맞춤 돌봄전문가를 추천받고 필요할 때 바로 매칭을 요청할 수 있어요.</div>
        <button
          onClick={() => go(`/seniors/new?returnTo=${encodeURIComponent("/home")}`)}
          style={{ marginTop: 15, height: 44, padding: "0 22px", borderRadius: 22, border: "none", background: ACCENT, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 6px 16px rgba(224,72,78,.24)" }}
        >
          부모님 등록하기 <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

/* 홈 최상단 마스트헤드 배너 — careand 실제 차별점(AI 산출 적정 간병비)을 노출하는 홍보 슬롯.
   케어네이션 홈 최상단 프로모 배너 구조 참고, 광고 대신 자사 기능 홍보로 채움. */
function GHeroBanner({ go }: { go: GNav }) {
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <button
        onClick={() => go("/request/new")}
        style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", background: `linear-gradient(120deg,${ACCENT_SOFT},${ACCENT})`, padding: "22px 20px", textAlign: "left", cursor: "pointer", border: "none", display: "block" }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "rgba(255,255,255,.85)", letterSpacing: ".01em" }}>AI 매칭 · 적정 간병비</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", letterSpacing: "-.02em", lineHeight: 1.35, marginTop: 6 }}>AI가 산출한 적정 간병비로<br />투명하게 매칭받으세요</div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, height: 38, padding: "0 16px", borderRadius: 19, background: "#fff", color: ACCENT, fontSize: 13, fontWeight: 800 }}>
          지금 시작하기 <ChevronRight size={15} />
        </span>
        <Sparkles size={72} color="#fff" strokeWidth={1.4} style={{ position: "absolute", right: 14, bottom: 10, opacity: 0.22 }} />
      </button>
    </div>
  );
}

/* 상시 AI 상담 진입점(FAB) — 케어네이션 홈 우하단 AI챗봇 버튼 참고.
   실제 챗봇 백엔드는 아직 없어 준비중 안내로 처리(기관전용 도메인 게이팅과 동일한 toast 패턴). */
function GAiFab() {
  return (
    <button
      onClick={() => toast("AI 챗봇 상담은 준비 중이에요. 빠른 시일 내 만나요.")}
      className="lg:hidden"
      style={{ position: "fixed", right: 16, bottom: "calc(90px + var(--safe-bot,0px))", zIndex: 15, display: "flex", alignItems: "center", gap: 7, height: 44, padding: "0 16px 0 14px", borderRadius: 22, background: INK, color: "#fff", border: "none", boxShadow: "0 8px 20px rgba(28,32,48,.28)", cursor: "pointer" }}
    >
      <MessageCircle size={19} />
      <span style={{ fontSize: 12.5, fontWeight: 800 }}>AI 챗봇</span>
    </button>
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
      <GHeroBanner go={go} />
      <GOnboardSenior go={go} />
      <GServices go={go} />
      <GQuick go={go} />
      <GMyRequests go={go} />
      <GFeed go={go} />
      <div style={{ height: 26 }} />
      <GAiFab />
    </div>
  );
}

/* ============ 기관(에이전시) 홈 ============ */
const ORG_STATUS: Record<string, { l: string; c: string; bg: string; desc: string }> = {
  pending: { l: "승인 대기", c: "#B8860B", bg: "#FFF6DD", desc: "사업자 정보 검수가 완료되면 간병인 매칭을 요청하실 수 있어요." },
  active: { l: "승인 완료", c: "#1F9D63", bg: "#E7F7EF", desc: "간병인이 필요할 때 언제든 매칭을 요청하세요." },
  rejected: { l: "승인 반려", c: "#E0484E", bg: "#FFECEC", desc: "사업자 정보 확인이 필요합니다. 고객센터로 문의해주세요." },
};

function OrgStatusBanner({ status, name }: { status?: string; name?: string }) {
  const st = ORG_STATUS[status ?? "pending"] ?? ORG_STATUS.pending;
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ background: st.bg, borderRadius: 16, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 900, color: INK }}>{name || "기관"}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: st.c, background: "#fff", borderRadius: 7, padding: "3px 8px" }}>{st.l}</span>
        </div>
        <div style={{ fontSize: 12.5, color: INK2, marginTop: 7, lineHeight: 1.5 }}>{st.desc}</div>
      </div>
    </div>
  );
}

/* 발주 CTA — 간병인 매칭 요청. 승인 전에는 비활성. */
function OrgCta({ go, enabled }: { go: GNav; enabled: boolean }) {
  return (
    <div style={{ padding: "16px 16px 4px" }}>
      <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "linear-gradient(120deg,#DDF3E0,#C7EBD6 60%,#BEE7DF)", padding: "24px 20px", minHeight: 150 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#2E8A5E" }}>기관 매칭 서비스</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#15402C", letterSpacing: "-.02em", lineHeight: 1.3, marginTop: 7 }}>필요한 간병인을<br />지금 바로 요청하세요</div>
        <button
          onClick={() => enabled ? go("/request/new") : toast("기관 승인 후 매칭 요청이 가능합니다.")}
          style={{ marginTop: 16, height: 44, padding: "0 22px", borderRadius: 22, border: "none", background: enabled ? "#0E6B43" : "#9FBBAB", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: enabled ? "0 6px 16px rgba(14,107,67,.28)" : "none" }}
        >
          간병인 매칭 요청하기
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <div style={{ position: "absolute", right: 16, top: 22, width: 92, height: 92, borderRadius: "50%", background: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#0E6B43" strokeWidth="1.7"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /><path d="M4 21c.7-3.8 3.6-6 8-6s7.3 2.2 8 6" /></svg>
        </div>
      </div>
    </div>
  );
}

function OrgHome() {
  const router = useRouter();
  const go: GNav = (path) => { if (path) router.push(path); };
  const notif = useQuery({ queryKey: ["member", "org", "notif"], queryFn: memberApi.notifications, retry: false, staleTime: 30_000 });
  const org = useQuery({ queryKey: ["member", "org", "me"], queryFn: organizationApi.me, retry: false, staleTime: 30_000 });
  const unread = notif.data?.unread ?? 0;
  const status = org.data?.status;

  return (
    <div style={{ background: BG }}>
      <GTopBar go={go} unread={unread} />
      <OrgStatusBanner status={status} name={org.data?.name} />
      <div style={{ background: "#fff", marginTop: 14, paddingBottom: 2 }}><OrgCta go={go} enabled={status === "active"} /></div>
      <OrgRecipientsCard go={go} />
      <OrgManageCard go={go} enabled={status === "active"} />
      <OrgQuick go={go} />
      <GMyRequests go={go} />
      <div style={{ height: 26 }} />
    </div>
  );
}

/* 기관 — 돌봄대상(어르신/환자) 등록·관리 진입. 발주 전에 미리 준비 가능하므로 승인 전에도 활성. */
function OrgRecipientsCard({ go }: { go: GNav }) {
  const rows = [
    { label: "어르신 등록·관리", desc: "요양보호 대상 어르신", to: "/seniors", bg: "#E7F7EF", ic: <HeartPulse size={22} color="#1F9D63" /> },
    { label: "환자 등록·관리", desc: "병원 간병 대상 환자", to: "/patients", bg: "#FFF1E8", ic: <Stethoscope size={22} color="#E07A3E" /> },
  ];
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: INK2, margin: "2px 2px 8px" }}>돌봄대상 관리</div>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div
            key={r.to}
            onClick={() => go(r.to)}
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 13, cursor: "pointer", borderTop: i > 0 ? `1px solid ${LINE}` : "none" }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 14, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {r.ic}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: INK }}>{r.label}</div>
              <div style={{ fontSize: 11.5, color: INK2, marginTop: 2 }}>{r.desc}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 기관 콘솔 — 소속 간병인 관리 진입 */
function OrgManageCard({ go, enabled }: { go: GNav; enabled: boolean }) {
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <div
        onClick={() => enabled ? go("/caregivers") : toast("기관 승인 후 이용할 수 있습니다.")}
        style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13, cursor: "pointer", opacity: enabled ? 1 : 0.6 }}
      >
        <div style={{ width: 46, height: 46, borderRadius: 14, background: "#EAF1FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={22} color="#3E72D6" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: INK }}>소속 간병인 관리</div>
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 2 }}>소속 간병인 추가·초대·해제</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
      </div>
    </div>
  );
}

/* 기관 — 자주 쓰는 메뉴(하단 탭바와 중복 최소화한 바로가기). 보호자 GQuick과 동형. */
function OrgQuick({ go }: { go: GNav }) {
  const items: { l: string; bg: string; to: string; ic: React.ReactNode }[] = [
    { l: "간병인 요청", bg: "#EAF1FF", to: "/request/new", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3E72D6" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" /></svg> },
    { l: "케어일지", bg: "#E7F7EF", to: "/logs", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F9D63" strokeWidth="2"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h4" /></svg> },
    { l: "정산내역", bg: "#E7F4F2", to: "/settlements", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E9C8A" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 14h4" /></svg> },
    { l: "이용가이드", bg: "#F2ECFF", to: "/guide", ic: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A5CE0" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.4 2.4 0 014.7.7c0 1.6-2.3 2-2.3 3.4M12 17h.01" /></svg> },
  ];
  return (
    <div style={{ padding: "18px 12px 16px", background: "#fff", margin: "14px 0 0" }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: INK, padding: "0 4px 14px", letterSpacing: "-.01em" }}>자주 쓰는 메뉴</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px 4px" }}>
        {items.map((it) => (
          <div key={it.l} onClick={() => go(it.to)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <GQuickIcon bg={it.bg}>{it.ic}</GQuickIcon>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: INK, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>{it.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 돌봄전문가 홈 ============ */
const SESSION_STATUS: Record<string, { variant: "success" | "outline" | "warn"; label: string }> = {
  in_progress: { variant: "success", label: "진행중" },
  completed: { variant: "outline", label: "완료" },
  scheduled: { variant: "warn", label: "예정" },
};

function CaregiverHome() {
  const qc = useQueryClient();
  const router = useRouter();
  const go: GNav = (path) => { if (path) router.push(path); };
  const user = useAuth((s) => s.user);
  const profile = useQuery({ queryKey: ["member", "cg", "me"], queryFn: memberApi.myCaregiver, retry: false });
  const isActive = profile.data?.status === "active";
  const matches = useQuery({ queryKey: ["member", "cg", "matches"], queryFn: memberApi.myMatches, enabled: isActive });
  const sessions = useQuery({ queryKey: ["member", "cg", "sessions"], queryFn: memberApi.mySessions, enabled: isActive });
  const settlements = useQuery({ queryKey: ["member", "cg", "settlements"], queryFn: memberApi.settlements, enabled: isActive });
  const notif = useQuery({ queryKey: ["member", "cg", "notif"], queryFn: memberApi.notifications, retry: false, staleTime: 30_000 });
  const unread = notif.data?.unread ?? 0;

  // 세션별 이번 진행 중 업로드한 완료 사진 수(클라이언트 측 추적)
  const [photoCount, setPhotoCount] = useState<Record<number, number>>({});

  // 역경매: 후보별 입찰가 입력값
  const [bidInputs, setBidInputs] = useState<Record<number, string>>({});

  const submitBid = useMutation({
    mutationFn: ({ cid, amount, note }: { cid: number; amount: number; note?: string }) =>
      memberApi.submitBid(cid, amount, note),
    onSuccess: (res) => {
      toast.success(res.warn_out_of_band ? "입찰 등록 — 권장 범위를 벗어났습니다." : "입찰을 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "cg"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

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
    onSuccess: (res) => {
      // 반경 밖이지만 허용 한도 안이면 출근은 되고 운영팀 확인 요청(기능 12)
      if (res?.data?.out_of_range) toast.warning(res.data.message ?? "출근 완료 — 서비스 장소 밖이라 운영팀이 확인해요.");
      else toast.success("출근 체크 완료");
      qc.invalidateQueries({ queryKey: ["member", "cg", "sessions"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const checkout = useMutation({
    mutationFn: async (sid: number) => {
      const coords = await getCurrentCoords();
      return memberApi.checkout(sid, coords);
    },
    onSuccess: (res) => {
      if (res?.data?.out_of_range) toast.warning(res.data.message ?? "퇴근 완료 — 서비스 장소 밖이라 운영팀이 확인해요.");
      else toast.success("퇴근 체크 완료");
      qc.invalidateQueries({ queryKey: ["member", "cg", "sessions"] });
    },
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

  // 매칭이 안 된 채 지나간 제안은 숨긴다.
  // - 예정 시각(scheduled_start)이 이미 지난 제안: 매칭되지 못하고 지나간 실적
  // - 요청이 더 이상 매칭 대기 상태가 아닌 경우(이미 성사/취소/만료)
  const isStaleProposal = (m: MyMatch) => {
    if (m.request_status && !["open", "matching", "pending"].includes(m.request_status)) return true;
    if (m.scheduled_start && new Date(m.scheduled_start).getTime() < Date.now()) return true;
    return false;
  };
  const pending = matches.data?.filter((m) => m.response === "pending" && !isStaleProposal(m)) ?? [];
  // 내가 수락해 확정된 매칭(진행 파이프라인 표시). 케어완료/취소는 제외.
  const acceptedMatches = matches.data?.filter(
    (m) => m.response === "accepted" && m.match_status !== "cancelled" && m.match_status !== "no_show",
  ) ?? [];

  // 가입 직후: 자격 검수(pending)·반려(rejected)·등록 미완료(404) → 온보딩 화면
  if (profile.isLoading && !profile.data) {
    return <div className="p-8 text-center text-warm-500 text-sm">불러오는 중…</div>;
  }
  const profileErrStatus = getApiErrorStatus(profile.error);
  // 미등록(404)·검수중·반려만 온보딩으로. 일시 오류(네트워크·5xx)는 온보딩이 아니라 재시도 안내.
  if (profile.data?.status === "pending" || profile.data?.status === "rejected" || (profile.isError && profileErrStatus === 404)) {
    return <CaregiverOnboarding profile={profile.data ?? null} name={user?.name ?? null} />;
  }
  if (profile.isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-warm-500 text-sm mb-3">프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        <Button variant="outline" size="sm" onClick={() => profile.refetch()}>다시 시도</Button>
      </div>
    );
  }

  // 이번 달 요약(수입·완료 케어) — 기존 정산/세션 데이터로 클라이언트 집계
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthCareCount = (sessions.data ?? []).filter(
    (s) => s.status === "completed" && (s.actual_end ?? s.scheduled_start ?? "").slice(0, 7) === ym
  ).length;
  const monthIncome = (settlements.data ?? [])
    .filter((st) => (st.period_start ?? "").slice(0, 7) === ym)
    .reduce((sum, st) => sum + Number(st.net_amount ?? 0), 0);

  // 가사 직군은 "가사" 어휘로, 요양보호·간병은 공통 "케어"
  const ui = caregiverUi(profile.data?.service_domains);

  return (
    <div style={{ background: BG }}>
      <GTopBar go={go} unread={unread} searchTo="/open-requests" searchPlaceholder={ui.searchPlaceholder} />
      <div className="p-5">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">{ui.homeTitle}</h1>
        <p className="text-sm text-warm-500 mt-1 mb-5">수락 대기 {pending.length}건 · {ui.actionNoun} 플로우</p>

      {/* 이번 달 요약 */}
      <Card className="p-5 mb-6 border-brand-200" style={{ background: "#FBF7EC" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase">이번 달 요약</h2>
          <span className="text-[11px] font-semibold text-warm-500">{now.getMonth() + 1}월</span>
        </div>
        <div className="flex divide-x divide-warm-200">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 text-xs text-warm-500 mb-1"><Wallet className="w-3.5 h-3.5" /> 수입</div>
            <div className="text-xl font-extrabold text-warm-800 tabular-nums">{formatKRW(monthIncome)}</div>
          </div>
          <div className="flex-1 pl-4">
            <div className="flex items-center gap-1.5 text-xs text-warm-500 mb-1"><Sparkles className="w-3.5 h-3.5" /> 완료 {ui.actionNoun}</div>
            <div className="text-xl font-extrabold text-warm-800 tabular-nums">{monthCareCount}건</div>
          </div>
        </div>
        {(profile.data?.completed_sessions ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t border-warm-200/70 flex items-center justify-between text-[11px] text-warm-500">
            <span>누적 {profile.data?.completed_sessions}건 완료</span>
            {(profile.data?.rating_count ?? 0) > 0 && (
              <span>⭐ {profile.data?.rating_avg?.toFixed(1)} ({profile.data?.rating_count})</span>
            )}
          </div>
        )}
      </Card>

      {/* 케어 요청 둘러보기 (돌봄전문가 주도 pull) */}
      <Card
        className="p-4 mb-6 border-brand-200 flex items-center gap-3 cursor-pointer active:scale-[.99] transition"
        onClick={() => router.push("/open-requests")}
      >
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <Search className="w-5 h-5 text-brand-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-extrabold text-warm-800">{ui.actionNoun} 요청 둘러보기</div>
          <div className="text-xs text-warm-500 mt-0.5">내 직군의 열린 요청에 직접 지원해보세요</div>
        </div>
        <ChevronRight className="w-5 h-5 text-warm-500" />
      </Card>

      {/* 자주 쓰는 메뉴 (하단 탭바와 중복 최소화한 바로가기) */}
      <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase mb-3">자주 쓰는 메뉴</h2>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { l: "일감찾기", to: "/open-requests", bg: "#EAF1FF", fg: "#3E72D6", Ic: Search },
          { l: `${ui.actionNoun}일지`, to: "/logs", bg: "#E7F7EF", fg: "#1F9D63", Ic: ClipboardList },
          { l: "정산내역", to: "/settlements", bg: "#E7F4F2", fg: "#0E9C8A", Ic: Wallet },
          { l: "이용가이드", to: "/guide", bg: "#F2ECFF", fg: "#7A5CE0", Ic: HelpCircle },
        ].map(({ l, to, bg, fg, Ic }) => (
          <button key={l} onClick={() => router.push(to)} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: bg }}>
              <Ic className="w-5 h-5" style={{ color: fg }} />
            </div>
            <span className="text-xs font-semibold text-warm-700 whitespace-nowrap">{l}</span>
          </button>
        ))}
      </div>

      {/* 매칭 알림 (수락 대기) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase">새 매칭 제안</h2>
        <span className="text-xs text-warm-500">{pending.length}건</span>
      </div>
      {pending.length === 0 && (
        <Card className="p-6 text-center text-warm-500 text-sm mb-6">대기 중인 매칭 제안이 없습니다</Card>
      )}
      <div className="space-y-4 mb-7">
        {pending.map((m) => (
          <Card key={m.candidate_id} className="p-4 border-brand-300 shadow-md">
            {/* 새 요청 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="brand">새 요청</Badge>
              <span className="text-xs font-semibold text-warm-500 font-en">AI {(m.ai_score * 100).toFixed(0)}점 추천</span>
              {m.rank === 1 && <Badge variant="success" className="ml-auto">1순위</Badge>}
            </div>

            {/* 대상자 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-extrabold text-warm-800">{m.senior_name}</span>
              <Badge variant="outline">{DOMAIN[m.service_domain] ?? m.service_domain}</Badge>
            </div>

            {/* 진행 단계 파이프라인 */}
            <div className="rounded-lg bg-warm-50 px-3 py-3 mb-3">
              <ProgressPipeline
                requestStatus={m.request_status}
                matchStatus={m.match_status}
                paymentStatus={m.payment_status}
              />
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
                <span className="text-sm font-medium text-warm-500">위치 확인 필요</span>
              </div>
              {m.price_guide?.suggested != null && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-warm-500"><Wallet className="w-3.5 h-3.5" /> 권장 시급</span>
                  <span className="text-sm font-semibold text-warm-700 tabular-nums">
                    {formatKRW(m.price_guide.suggested)}
                    {m.price_guide.floor != null && m.price_guide.ceil != null && (
                      <span className="text-[11px] font-medium text-warm-500"> ({formatKRW(m.price_guide.floor)}~{formatKRW(m.price_guide.ceil)})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* 역경매 입찰 */}
            <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-3.5 py-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-warm-600">희망 수당(시급) 입찰</span>
                {m.bid_status === "bid" && m.bid_hourly != null && (
                  <Badge variant="success">입찰 {formatKRW(m.bid_hourly)}</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  step={500}
                  className="flex-1 rounded-lg border border-warm-200 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brand-400"
                  placeholder={m.price_guide?.suggested != null ? String(m.price_guide.suggested) : "시급(원)"}
                  value={bidInputs[m.candidate_id] ?? (m.bid_hourly != null ? String(m.bid_hourly) : "")}
                  onChange={(e) => setBidInputs((p) => ({ ...p, [m.candidate_id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submitBid.isPending}
                  onClick={() => {
                    const raw = bidInputs[m.candidate_id] ?? (m.bid_hourly != null ? String(m.bid_hourly) : "");
                    const amount = Number(raw);
                    if (!amount || amount <= 0) { toast.error("입찰 시급을 입력하세요."); return; }
                    submitBid.mutate({ cid: m.candidate_id, amount });
                  }}
                >
                  {m.bid_status === "bid" ? "수정" : "입찰"}
                </Button>
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

      {/* 진행 중인 매칭 (수락·확정) */}
      {acceptedMatches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase">진행 중인 매칭</h2>
            <span className="text-xs text-warm-500">{acceptedMatches.length}건</span>
          </div>
          <div className="space-y-4 mb-7">
            {acceptedMatches.map((m) => (
              <Card key={`acc-${m.candidate_id}`} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-warm-800">{m.senior_name}</span>
                    <Badge variant="outline">{DOMAIN[m.service_domain] ?? m.service_domain}</Badge>
                  </div>
                  <span className="text-xs text-warm-500">
                    {m.scheduled_start ? formatDateTime(m.scheduled_start) : "일정 협의 중"}
                  </span>
                </div>
                <div className="rounded-lg bg-warm-50 px-3 py-3">
                  <ProgressPipeline
                    requestStatus={m.request_status}
                    matchStatus={m.match_status}
                    paymentStatus={m.payment_status}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 오늘 일정 */}
      <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase mb-3">내 {ui.actionNoun} 일정</h2>
      {sessions.data?.length === 0 && (
        <Card className="p-6 text-center text-warm-500 text-sm">예정된 일정이 없습니다</Card>
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
                  <Sparkles className="w-3.5 h-3.5" /> {ui.actionNoun} 진행 중입니다
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
                        <p className="text-[11px] text-warm-500 text-center">
                          완료 사진을 1장 이상 등록해야 퇴근 체크가 완료됩니다
                        </p>
                      )}
                    </>
                  )}
                  <Button size="lg" variant="outline" className="w-full"
                    onClick={() => router.push(`/session/${s.id}`)}>
                    <ClipboardList className="w-4 h-4" /> 활동 기록
                  </Button>
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
    </div>
  );
}


/* ============ 돌봄전문가 가입 후 온보딩(검수 대기 / 반려) ============ */
function CaregiverOnboarding({ profile, name }: { profile: CaregiverProfile | null; name: string | null }) {
  const router = useRouter();
  // 가사(housekeeping)는 국가자격증이 없으므로 라이선스 중심 문구를 등록/신원 기반으로 분기
  const isHk = caregiverPrimaryDomain(profile?.service_domains) === "living_support";
  const c = isHk
    ? {
        reviewWord: "등록 검수",
        rejectFallback: "제출하신 등록 정보를 확인할 수 없었어요. 정보를 다시 확인해 주세요.",
        reRegister: "등록 정보 다시 등록",
        welcomeSub: "가입이 접수되었어요. 등록 검수가 끝나면 가사 요청을 받을 수 있어요.",
        reviewingDesc: "제출하신 등록 정보를 확인하고 있어요.",
        verifyLabel: "신원 확인",
        verifyDesc: "본인·연락처 확인",
        showLicenseRow: false,
      }
    : {
        reviewWord: "자격 검수",
        rejectFallback: "제출하신 자격 정보를 확인할 수 없었어요. 자격증 정보를 다시 확인해 주세요.",
        reRegister: "자격 정보 다시 등록",
        welcomeSub: "가입이 접수되었어요. 자격 검수가 끝나면 매칭 제안을 받을 수 있어요.",
        reviewingDesc: "제출하신 자격 정보를 확인하고 있어요.",
        verifyLabel: "자격증 진위확인",
        verifyDesc: "보건복지부 자격 확인",
        showLicenseRow: true,
      };

  if (profile?.status === "rejected") {
    return (
      <div className="p-5">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">{c.reviewWord} 결과</h1>
        <p className="text-sm text-warm-500 mt-1 mb-5">{name ? `${name} 님, ` : ""}아쉽지만 이번 신청은 반려되었어요.</p>
        <Card className="p-6 text-center" style={{ background: "#FBEEED", borderColor: "rgba(194,84,80,.3)" }}>
          <div className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <div className="mt-4 text-lg font-extrabold text-warm-800">{c.reviewWord} 반려</div>
          <p className="text-sm text-warm-600 mt-2 leading-relaxed">
            {profile?.rejection_reason || c.rejectFallback}
          </p>
        </Card>
        <div className="mt-6 space-y-2">
          <Button variant="brand" size="lg" className="w-full" onClick={() => router.push("/signup")}>{c.reRegister}</Button>
          <a href="tel:16000000" className="flex items-center justify-center gap-2 w-full h-11 rounded-md border border-warm-200 text-sm font-semibold text-warm-600">
            <Phone className="w-4 h-4" /> 고객센터 문의
          </a>
        </div>
      </div>
    );
  }

  const specialties = profile?.specialties?.length ? profile.specialties.join(" · ") : "미입력";
  return (
    <div className="p-5">
      <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">{name ? `${name} 님,` : ""} 환영합니다 👋</h1>
      <p className="text-sm text-warm-500 mt-1 mb-5">{c.welcomeSub}</p>

      <Card className="p-6 text-center border-brand-200" style={{ background: "rgba(63,125,82,.06)" }}>
        <div className="w-16 h-16 mx-auto rounded-full bg-brand-100 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-brand-600" />
        </div>
        <div className="mt-4 text-lg font-extrabold text-warm-800">{c.reviewWord} 중</div>
        <p className="text-sm text-warm-600 mt-2 leading-relaxed">
          {c.reviewingDesc}<br />보통 1~2 영업일 이내 완료되며, 결과는 알림으로 알려드려요.
        </p>
      </Card>

      <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase mt-7 mb-3">진행 상황</h2>
      <Card className="p-5">
        <OnbStep state="done" label="가입 완료" desc="계정이 생성되었어요" />
        <OnbStep state={!isHk && profile?.license_verified ? "done" : "active"} label={c.verifyLabel} desc={c.verifyDesc} />
        <OnbStep state="active" label="관리자 검수" desc="신원·자격 최종 확인" />
        <OnbStep state="todo" label="활동 시작" desc={isHk ? "가사 요청을 받을 수 있어요" : "매칭 제안을 받을 수 있어요"} last />
      </Card>

      <h2 className="text-xs font-extrabold tracking-wider text-warm-500 uppercase mt-7 mb-3">제출한 정보</h2>
      <Card className="px-5 divide-y divide-warm-100">
        <OnbRow label="이름" value={profile?.name ?? name ?? "-"} />
        {c.showLicenseRow && <OnbRow label="자격번호" value={profile?.license_no ?? "-"} />}
        <OnbRow label="가능 서비스" value={specialties} />
        <OnbRow label="활동 지역" value={profile?.base_address ?? "-"} />
      </Card>

      <Button variant="outline" size="lg" className="w-full mt-5" onClick={() => router.push("/mypage")}>내 정보 보기</Button>
      <p className="text-xs text-warm-500 text-center mt-4">검수 관련 문의: 고객센터 1600-0000</p>
    </div>
  );
}

function OnbStep({ state, label, desc, last }: { state: "done" | "active" | "todo"; label: string; desc: string; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          state === "done" ? "bg-brand-500 text-white" : state === "active" ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400" : "bg-warm-100 text-warm-500"
        }`}>
          {state === "done" ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        </div>
        {!last && <div className={`w-0.5 flex-1 my-1 ${state === "done" ? "bg-brand-300" : "bg-warm-200"}`} style={{ minHeight: 20 }} />}
      </div>
      <div className={last ? "" : "pb-4"}>
        <div className={`text-sm font-bold ${state === "todo" ? "text-warm-500" : "text-warm-800"}`}>
          {label}
          {state === "active" && <span className="ml-2 text-[11px] font-bold text-brand-600">진행중</span>}
        </div>
        <div className="text-xs text-warm-500 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function OnbRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-warm-500">{label}</span>
      <span className="text-sm font-semibold text-warm-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
