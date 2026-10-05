"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAppBadge } from "@/lib/platform";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memberApi, type MemberNotification } from "@/lib/api/member";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/store";

/** 알림 종류 → 눌렀을 때 갈 화면. 없으면 읽음 처리만 */
function linkFor(n: MemberNotification, role?: string): string | null {
  const d = n.data ?? {};
  switch (n.type) {
    case "CARE_SUMMARY_READY":
    case "SAFETY_ALERT":
      return d.session_id ? `/logs/${d.session_id}` : "/logs";
    case "MATCH_CONFIRMED":
    case "PAYMENT_DUE":
      return d.match_id ? `/payments/${d.match_id}` : "/home";
    case "MATCH_REQUEST_EXPIRED":
      return "/request/new";
    case "PAYMENT_PAID":
    case "PAYMENT_FAILED":
      return "/payments";
    case "SETTLEMENT_CONFIRMED":
    case "SETTLEMENT_PAID":
      return "/settlements";
    case "REVIEW_REQUEST":
      return "/satisfaction";
    case "CAREGIVER_DOC_REJECTED":
      return "/documents";
    case "MATCH_OFFER_TIMEOUT":
    case "CARE_NOSHOW":
    case "CARE_ISSUE_UPDATED":
      return d.request_id ? `/request/${d.request_id}` : "/home";
    case "CARE_LATE":
      return role === "caregiver" ? (d.session_id ? `/session/${d.session_id}` : "/schedule") : d.request_id ? `/request/${d.request_id}` : "/home";
    case "CARE_REMINDER":
      return role === "caregiver" ? "/schedule" : "/home";
    case "MATCH_REQUEST_ASSIGNED":
    case "CARE_STARTED":
    case "CAREGIVER_APPROVED":
      return "/home";
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["member", "notifications"], queryFn: memberApi.notifications });
  // 읽음 처리 후 홈 화면 아이콘 배지도 같이 줄인다
  const unreadNow = query.data?.unread;
  useEffect(() => { if (unreadNow != null) setAppBadge(unreadNow); }, [unreadNow]);

  const read = useMutation({
    mutationFn: (id: number) => memberApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member", "notifications"] }),
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-warm-800 mb-1">알림</h1>
          <p className="text-sm text-warm-500">
            읽지 않은 알림 {query.data?.unread ?? 0}건
          </p>
        </div>
      </div>

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}
      {query.data?.data.length === 0 && (
        <Card className="p-8 text-center text-warm-500 text-sm">알림이 없습니다</Card>
      )}

      <div className="space-y-2">
        {query.data?.data.map((n) => (
          <Card
            key={n.id}
            className={cn("p-4 cursor-pointer transition-colors lg:hover:bg-warm-50/60", !n.is_read && "border-l-4 border-l-brand-500")}
            onClick={() => {
              if (!n.is_read) read.mutate(n.id);
              const href = linkFor(n, role);
              if (href) router.push(href);
            }}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                n.is_read ? "bg-warm-100 text-warm-500" : "bg-brand-50 text-brand-600"
              )}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-semibold truncate", n.is_read ? "text-warm-600" : "text-warm-800")}>
                    {n.title}
                  </span>
                  <span className="text-[12px] text-warm-500 flex-shrink-0">{n.created_ago}</span>
                </div>
                <p className="text-xs text-warm-500 mt-0.5 line-clamp-2">{n.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
