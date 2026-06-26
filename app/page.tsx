"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/store";

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const hasHydrated = useAuth((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-warm-500">로딩 중...</div>
    </div>
  );
}
