"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Home, Wallet, Bell, User, CalendarClock } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { usesCaregiverShell } from "@/lib/role";
import { UI } from "@/lib/theme";

/* ===== 보호자 하단 탭 (코랄 · 5탭 + 중앙 매칭요청 FAB) ===== */
// 디자인 토큰 SSOT 참조 (값은 lib/theme.ts). ACCENT=brand-500, ACCENT_SOFT=brand-400.
const ACCENT = UI.accent, ACCENT_SOFT = UI.accentSoft, INK3 = UI.ink3, LINE = UI.line;

function GuardianTab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? ACCENT : INK3, textDecoration: "none" }}>
      <div style={{ width: 24, height: 24 }}>{icon}</div>
      <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{label}</span>
    </Link>
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
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(140deg,${ACCENT_SOFT},${ACCENT})`, boxShadow: "0 8px 20px rgba(16,185,129,.42)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: ACCENT }}>매칭요청</span>
          </Link>
        </div>
        <button onClick={() => toast("관심 돌봄전문가 기능은 준비 중입니다.")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: INK3, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ width: 24, height: 24 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" /></svg></div>
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>관심 돌봄전문가</span>
        </button>
        <GuardianTab href="/mypage" label="내 정보" active={is("/mypage")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.7-3.6 3.4-5.6 7-5.6s6.3 2 7 5.6" /></svg>} />
      </div>
    </nav>
  );
}

/* ===== 돌봄전문가 하단 탭 (보호자/기관과 동일 디자인 · 5탭, FAB 없음) ===== */
function CaregiverTabBar({ pathname }: { pathname: string }) {
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const tabs: { href: string; label: string; Icon: typeof Home }[] = [
    { href: "/home", label: "홈", Icon: Home },
    { href: "/schedule", label: "일정", Icon: CalendarClock },
    { href: "/settlements", label: "정산", Icon: Wallet },
    { href: "/notifications", label: "알림", Icon: Bell },
    { href: "/mypage", label: "내 정보", Icon: User },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: 480, background: "rgba(255,255,255,.96)", backdropFilter: "blur(10px)", borderTop: `1px solid ${LINE}`, paddingBottom: "calc(8px + var(--safe-bot,0px))", zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", padding: "9px 8px 4px" }}>
        {tabs.map(({ href, label, Icon }) => (
          <GuardianTab key={href} href={href} label={label} active={is(href)} icon={<Icon style={{ width: 24, height: 24 }} strokeWidth={2} />} />
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
      <div className="flex items-center justify-center min-h-screen text-warm-400">
        로딩 중…
      </div>
    );
  }

  /* ===== 세 역할 공통 디자인 셸 (상단바는 각 페이지가 보유, 하단 탭바만 역할별) ===== */
  const isCaregiver = usesCaregiverShell(user.role);
  return (
    <div className="min-h-screen flex justify-center" style={{ background: UI.bg }}>
      <div className="w-full flex flex-col relative" style={{ maxWidth: 480, minHeight: "100vh", background: UI.bg, boxShadow: "0 0 60px rgba(28,32,48,.08)" }}>
        <main className="flex-1" style={{ paddingBottom: "calc(78px + var(--safe-bot,0px))" }}>{children}</main>
        {isCaregiver ? <CaregiverTabBar pathname={pathname} /> : <GuardianTabBar pathname={pathname} />}
      </div>
    </div>
  );
}
