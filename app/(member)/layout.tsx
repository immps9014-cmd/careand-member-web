"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Wallet, Bell, User, CalendarClock, FileText, Plus, Star, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { usesCaregiverShell } from "@/lib/role";
import { UI, brand } from "@/lib/theme";

/* ===== 데스크톱(웹) 사이드바 네비게이션 ===== */
// external=true: 회원앱(/app) 밖 웹 홈(/www)으로 전체 이동 (Link 대신 plain <a>)
type NavItem = { href: string; label: string; Icon: LucideIcon; external?: boolean };
const WEB_HOME = "/www"; // 공개 웹 홈 (모바일 앱 홈 /home 과 구분)
const GUARDIAN_NAV: NavItem[] = [
  { href: "/home", label: "홈", Icon: Home },
  { href: "/logs", label: "케어일지", Icon: FileText },
  { href: "/satisfaction", label: "케어 만족도", Icon: Star },
  { href: "/mypage", label: "내 정보", Icon: User },
];
const CAREGIVER_NAV: NavItem[] = [
  { href: "/home", label: "홈", Icon: Home },
  { href: "/schedule", label: "일정", Icon: CalendarClock },
  { href: "/settlements", label: "정산", Icon: Wallet },
  { href: "/notifications", label: "알림", Icon: Bell },
  { href: "/mypage", label: "내 정보", Icon: User },
];

function DesktopSidebar({ items, pathname, isGuardian, userName }: { items: NavItem[]; pathname: string; isGuardian: boolean; userName: string }) {
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-white px-4 py-6 lg:flex"
      style={{ borderRight: `1px solid ${UI.line}` }}
    >
      {/* Care& 로고 → 웹 홈(/www) 전체 이동 */}
      <a href={WEB_HOME} className="flex items-center gap-2 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg text-[16px] font-extrabold italic text-white" style={{ background: UI.accent }}>
          C&amp;
        </span>
        <span className="text-lg font-extrabold" style={{ color: UI.ink }}>Care&amp;</span>
      </a>

      {isGuardian && (
        <Link
          href="/request/new"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white shadow-sm"
          style={{ background: `linear-gradient(140deg,${UI.accentSoft},${UI.accent})` }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} /> 매칭 요청하기
        </Link>
      )}

      <nav className="mt-4 flex flex-col gap-1">
        {items.map(({ href, label, Icon, external }) => {
          const active = !external && is(href);
          const cls = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors";
          const st = { color: active ? UI.accent : UI.ink2, background: active ? brand[50] : "transparent" };
          const inner = (
            <>
              <Icon className="h-5 w-5" strokeWidth={2} /> {label}
            </>
          );
          return external ? (
            <a key={href} href={href} className={cls} style={st}>
              {inner}
            </a>
          ) : (
            <Link key={href} href={href} className={cls} style={st}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto truncate px-3 text-xs font-semibold" style={{ color: UI.ink3 }}>
        {userName} 님
      </div>
    </aside>
  );
}

/* ===== 보호자 하단 탭 (코랄 · 5탭 + 중앙 매칭요청 FAB) ===== */
// 디자인 토큰 SSOT 참조 (값은 lib/theme.ts). ACCENT=brand-500, ACCENT_SOFT=brand-400.
const ACCENT = UI.accent, ACCENT_SOFT = UI.accentSoft, INK3 = UI.ink3, LINE = UI.line;

function GuardianTab({ href, label, icon, active, external }: { href: string; label: string; icon: React.ReactNode; active: boolean; external?: boolean }) {
  const style = { flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: 3, color: active ? ACCENT : INK3, textDecoration: "none" };
  const inner = (
    <>
      <div style={{ width: 24, height: 24 }}>{icon}</div>
      <span style={{ fontSize: 12, fontWeight: active ? 800 : 600 }}>{label}</span>
    </>
  );
  // external=true: 회원앱(/app) 밖 웹 홈(/www)으로 전체 이동
  return external ? (
    <a href={href} style={style}>{inner}</a>
  ) : (
    <Link href={href} style={style}>{inner}</Link>
  );
}

function GuardianTabBar({ pathname }: { pathname: string }) {
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");
  return (
    <nav style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: 480, background: "rgba(255,255,255,.96)", backdropFilter: "blur(10px)", borderTop: `1px solid ${LINE}`, paddingBottom: "calc(8px + var(--safe-bot,0px))", zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", padding: "9px 8px 4px" }}>
        <GuardianTab href="/home" label="홈" active={is("/home")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11l8-7 8 7M6 10v10h12V10" /></svg>} />
        <GuardianTab href="/logs" label="케어일지" active={is("/logs")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h6M9 16h4" /></svg>} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Link href="/request/new" style={{ transform: "translateY(-16px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textDecoration: "none" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(140deg,${ACCENT_SOFT},${ACCENT})`, boxShadow: "0 8px 20px rgba(213,96,62,.42)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT }}>매칭요청</span>
          </Link>
        </div>
        <GuardianTab href="/caregivers/favorites" label="관심 전문가" active={is("/caregivers/favorites")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" /></svg>} />
        <GuardianTab href="/mypage" label="내 정보" active={is("/mypage")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.7-3.6 3.4-5.6 7-5.6s6.3 2 7 5.6" /></svg>} />
      </div>
    </nav>
  );
}

/* ===== 돌봄전문가 하단 탭 (보호자/기관과 동일 디자인 · 5탭, FAB 없음) ===== */
function CaregiverTabBar({ pathname }: { pathname: string }) {
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const tabs: { href: string; label: string; Icon: typeof Home; external?: boolean }[] = [
    { href: "/home", label: "홈", Icon: Home },
    { href: "/schedule", label: "일정", Icon: CalendarClock },
    { href: "/settlements", label: "정산", Icon: Wallet },
    { href: "/notifications", label: "알림", Icon: Bell },
    { href: "/mypage", label: "내 정보", Icon: User },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: 480, background: "rgba(255,255,255,.96)", backdropFilter: "blur(10px)", borderTop: `1px solid ${LINE}`, paddingBottom: "calc(8px + var(--safe-bot,0px))", zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", padding: "9px 8px 4px" }}>
        {tabs.map(({ href, label, Icon, external }) => (
          <GuardianTab key={href} href={href} external={external} label={label} active={!external && is(href)} icon={<Icon style={{ width: 24, height: 24 }} strokeWidth={2} />} />
        ))}
      </div>
    </nav>
  );
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, hasHydrated } = useAuth();

  useEffect(() => {
    // 하이드레이션 완료 전 판정 금지 (쿨드로드 /login 튕김 방지)
    if (hasHydrated && !isAuthenticated) {
      // 신청하다 튕긴 경우 등 — 현재 경로(+쿼리)를 복귀 URL로 보존해 로그인 후 되돌린다.
      const back = pathname + (typeof window !== "undefined" ? window.location.search : "");
      router.replace(`/login?redirect=${encodeURIComponent(back)}`);
    }
  }, [hasHydrated, isAuthenticated, router, pathname]);

  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-warm-500">
        로딩 중…
      </div>
    );
  }

  /* ===== 반응형 셸 =====
     - 모바일(<lg): 480px 앱 프레임 + 하단 탭바 (앱 화면)
     - 데스크톱(lg+): 좌측 사이드바 네비 + 넓은 본문 (웹 화면)
     상단바는 각 페이지가 보유. */
  const isCaregiver = usesCaregiverShell(user.role);
  return (
    <div className="min-h-screen" style={{ background: UI.bg }}>
      {/* 데스크톱: 사이드바 */}
      <DesktopSidebar
        items={isCaregiver ? CAREGIVER_NAV : GUARDIAN_NAV}
        pathname={pathname}
        isGuardian={!isCaregiver}
        userName={user.name}
      />

      {/* 본문 (데스크톱은 사이드바만큼 좌측 여백) */}
      <div className="lg:pl-60">
        <div
          className="mx-auto flex w-full max-w-[480px] flex-col shadow-[0_0_60px_rgba(28,32,48,.08)] lg:max-w-5xl lg:shadow-none"
          style={{ minHeight: "100vh", background: UI.bg }}
        >
          <main className="flex-1 pb-[78px] lg:pb-12">{children}</main>
        </div>
      </div>

      {/* 모바일: 하단 탭바 */}
      <div className="lg:hidden">
        {isCaregiver ? <CaregiverTabBar pathname={pathname} /> : <GuardianTabBar pathname={pathname} />}
      </div>
    </div>
  );
}
