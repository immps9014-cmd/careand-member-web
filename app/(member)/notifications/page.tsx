"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memberApi } from "@/lib/api/member";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["member", "notifications"], queryFn: memberApi.notifications });

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

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.data.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">알림이 없습니다</Card>
      )}

      <div className="space-y-2">
        {query.data?.data.map((n) => (
          <Card
            key={n.id}
            className={cn("p-4 cursor-pointer transition-colors lg:hover:bg-warm-50/60", !n.is_read && "border-l-4 border-l-brand-500")}
            onClick={() => !n.is_read && read.mutate(n.id)}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                n.is_read ? "bg-warm-100 text-warm-400" : "bg-brand-50 text-brand-600"
              )}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-semibold truncate", n.is_read ? "text-warm-600" : "text-warm-800")}>
                    {n.title}
                  </span>
                  <span className="text-[11px] text-warm-400 flex-shrink-0">{n.created_ago}</span>
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
