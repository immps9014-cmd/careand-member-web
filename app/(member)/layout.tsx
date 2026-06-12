"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Wallet, Bell, User, CalendarClock, HeartPulse, Stethoscope, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const GUARDIAN_NAV: NavItem[] = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/seniors", label: "어르신", icon: HeartPulse },
  { href: "/patients", label: "환자", icon: Stethoscope },
  { href: "/addresses", label: "주소", icon: MapPin },
  { href: "/logs", label: "케어일지", icon: FileText },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/mypage", label: "내정보", icon: User },
];

const CAREGIVER_NAV: NavItem[] = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/schedule", label: "일정", icon: CalendarClock },
  { href: "/settlements", label: "정산", icon: Wallet },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/mypage", label: "내정보", icon: User },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-warm-400">
        로딩 중…
      </div>
    );
  }

  const nav = user.role === "caregiver" ? CAREGIVER_NAV : GUARDIAN_NAV;

  return (
    <div className="min-h-screen bg-warm-100 flex justify-center">
      <div className="w-full max-w-md bg-warm-50 min-h-screen flex flex-col relative shadow-xl">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-white border-b border-warm-100 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center font-en font-extrabold text-white text-sm">
              C
            </div>
            <span className="font-en font-extrabold text-warm-800">Care&</span>
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
              {user.role === "caregiver" ? "인력" : "보호자"}
            </span>
          </div>
        </header>

        {/* 본문 */}
        <main className="flex-1 pb-20">{children}</main>

        {/* 하단 내비 */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-warm-100 flex">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-warm-400"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
