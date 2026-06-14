"use client";

/**
 * 보호자용앱 디자인 미리보기 (/app/app-preview)
 * 원본: /root/careand보호자용앱.zip (React 프로토타입)을 TSX로 포팅.
 * - 디자인 시스템(코랄/잉크 팔레트 + Pretendard + 480px 앱셸) 그대로 적용
 * - 내비게이션은 실제 라우트로 연결, 알림 배지는 실데이터(notifications)로 연동
 * - 라이브 보호자 홈(/home)은 미변경. 승인 시 본 화면으로 교체 예정.
 */

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { memberApi } from "@/lib/api/member";

const CORAL = "#FF5A4D",
  CORAL2 = "#FF8A3D",
  INK = "#1C2030",
  INK2 = "#5B6172",
  INK3 = "#9AA0AD",
  LINE = "#EFF1F4",
  BG = "#F6F7F9";

type Nav = (path: string | null) => void;

function TopBar({ go, unread }: { go: Nav; unread: number }) {
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

function Hero({ go }: { go: Nav }) {
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

function Promo() {
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

function QuickIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <div style={{ width: 50, height: 50, borderRadius: 16, background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(28,32,48,.07)" }}>{children}</div>;
}

function Quick({ go }: { go: Nav }) {
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
              <QuickIcon bg={it.bg}>{it.ic}</QuickIcon>
              {it.badge && <span style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", background: CORAL, border: "2px solid #fff" }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>{it.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stars({ n }: { n: string }) {
  return <span style={{ color: "#F2A900", fontSize: 11, fontWeight: 800 }}>★ {n}</span>;
}

interface CgData { nm: string; av: string; fg: string; bg: string; rate: string; spec: string; dist: string; price: number; tag?: string }

function CgCard({ c }: { c: CgData }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden", cursor: "pointer" }}>
      <div style={{ height: 108, background: c.bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: c.fg, boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>{c.av}</div>
        {c.tag && <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 800, color: "#fff", background: CORAL, borderRadius: 7, padding: "3px 8px" }}>{c.tag}</span>}
        <span style={{ position: "absolute", bottom: 9, right: 9, width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="2"><path d="M12 21s-7-4.3-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 3.5C19 16.7 12 21 12 21z" /></svg></span>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{c.nm}</span><Stars n={c.rate} /></div>
        <div style={{ fontSize: 11.5, color: INK2, marginTop: 4 }}>{c.spec} · {c.dist}</div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 3 }}>
          <span style={{ fontSize: 11, color: INK3, fontWeight: 600 }}>시간당</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: CORAL }}>{c.price.toLocaleString()}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>원~</span>
        </div>
      </div>
    </div>
  );
}

function Feed() {
  // ※ 추천 인력 목록 API 미구현 → 디자인 확인용 샘플 데이터. 교체 시 실제 추천 인력 엔드포인트 연동 예정.
  const list: CgData[] = [
    { nm: "곽지은", av: "곽", fg: "#1F9D63", bg: "#E7F7EF", rate: "4.9", spec: "시니어 돌봄 5년", dist: "2.1km", price: 15000, tag: "BEST" },
    { nm: "한지숙", av: "한", fg: "#7A5CE0", bg: "#F2ECFF", rate: "4.8", spec: "요양보호사 1급", dist: "3.2km", price: 16000, tag: "인증" },
    { nm: "인나영", av: "인", fg: "#3E72D6", bg: "#EAF1FF", rate: "5.0", spec: "간병 전문", dist: "1.4km", price: 18000 },
    { nm: "서민정", av: "서", fg: "#E07712", bg: "#FFF0E1", rate: "4.7", spec: "가사·돌봄", dist: "2.8km", price: 14000 },
  ];
  return (
    <div style={{ padding: "18px 16px 0", background: BG }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 13 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: "-.02em" }}>가까운 추천 인력</div>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: INK3 }}>전체 →</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {list.map((c) => <CgCard key={c.nm} c={c} />)}
      </div>
    </div>
  );
}

function Tab({ icon, label, on, onClick }: { icon: React.ReactNode; label: string; on?: boolean; onClick?: () => void }) {
  return <div onClick={onClick} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? CORAL : INK3, cursor: "pointer" }}><div style={{ width: 24, height: 24 }}>{icon}</div><span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600 }}>{label}</span></div>;
}

function TabBar({ go }: { go: Nav }) {
  return (
    <div style={{ position: "sticky", bottom: 0, background: "rgba(255,255,255,.96)", backdropFilter: "blur(10px)", borderTop: `1px solid ${LINE}`, paddingBottom: "calc(8px + var(--safe-bot,0px))" }}>
      <div style={{ display: "flex", alignItems: "flex-end", padding: "9px 8px 4px" }}>
        <Tab on label="홈" onClick={() => go("/app-preview")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11l8-7 8 7M6 10v10h12V10" /></svg>} />
        <Tab label="케어일지" onClick={() => go("/logs")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h6M9 16h4" /></svg>} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div onClick={() => go("/request/new")} style={{ transform: "translateY(-16px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(140deg,${CORAL2},${CORAL})`, boxShadow: "0 8px 20px rgba(255,90,77,.42)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: CORAL }}>매칭요청</span>
          </div>
        </div>
        <Tab label="관심 인력" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" /></svg>} />
        <Tab label="내 정보" onClick={() => go("/mypage")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.7-3.6 3.4-5.6 7-5.6s6.3 2 7 5.6" /></svg>} />
      </div>
    </div>
  );
}

export default function AppPreviewPage() {
  const router = useRouter();
  const go: Nav = (path) => { if (path) router.push(path); };

  // 알림 배지: 실데이터(미인증 시 401 → 0으로 graceful)
  const notif = useQuery({
    queryKey: ["member", "notifications", "preview"],
    queryFn: memberApi.notifications,
    retry: false,
    staleTime: 30_000,
  });
  const unread = notif.data?.unread ?? 0;

  return (
    <div style={{ background: "#F6F7F9", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Pretendard,-apple-system,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", width: "100%", background: "#F6F7F9", display: "flex", flexDirection: "column", position: "relative", boxShadow: "0 0 60px rgba(28,32,48,.08)" }}>
        <TopBar go={go} unread={unread} />
        <div style={{ flex: 1 }}>
          <div style={{ background: "#fff", paddingBottom: 2 }}><Hero go={go} /><Promo /></div>
          <Quick go={go} />
          <Feed />
          <div style={{ height: 26 }} />
        </div>
        <TabBar go={go} />
      </div>
    </div>
  );
}
