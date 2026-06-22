"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/store";
import { getApiErrorMessage } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => authApi.login(email, password),
    onSuccess: (data) => {
      if (data.user.role === "admin") {
        toast.error("관리자는 관리자 콘솔(/admin)로 접속하세요.");
        return;
      }
      if (!["guardian", "caregiver"].includes(data.user.role)) {
        toast.error("보호자·인력 회원만 이용할 수 있습니다.");
        return;
      }
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      toast.success(`${data.user.name} 님 환영합니다`);
      router.push("/home");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-brand-50 to-warm-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl flex items-center justify-center font-en font-extrabold text-white text-3xl shadow-lg">
              C
            </div>
            <div>
              <div className="font-en font-extrabold text-2xl text-warm-800 tracking-tight leading-none">
                Care&
              </div>
              <div className="text-xs text-warm-500 mt-1.5">생애 전주기 통합돌봄</div>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">회원 로그인</CardTitle>
            <CardDescription>보호자·인력 회원 계정으로 로그인하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-semibold text-warm-700 block mb-1.5">이메일</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@careand.kr"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-warm-700 block mb-1.5">비밀번호</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-warm-500 mt-6">
          © 2026 Care&. 보호자·인력 회원 앱
        </p>
      </div>
    </div>
  );
}
