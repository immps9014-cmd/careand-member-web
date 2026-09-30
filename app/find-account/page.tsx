"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import { SeniorModeToggle } from "@/components/senior-mode-toggle";
import { SUPPORT } from "@/lib/support";

type Tab = "id" | "pw";

/**
 * 아이디 찾기 · 비밀번호 재설정 — 가입 때 인증한 휴대폰으로 본인 확인.
 * 한 번 인증하면 두 탭을 오가도 다시 인증하지 않는다(아이디 찾기는 토큰을 소모하지 않음).
 */
function FindAccount() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "pw" ? "pw" : "id");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [foundId, setFoundId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const phoneValid = /^01[0-9]\d{7,8}$/.test(phone);
  const pwValid = pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(phone),
    onSuccess: () => { setOtpSent(true); setOtp(""); toast.success("인증번호를 보냈어요. 문자를 확인해 주세요."); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const verifyOtp = useMutation({
    mutationFn: () => authApi.verifyOtp(phone, otp),
    onSuccess: (d) => setToken(d.phone_verify_token),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const findId = useMutation({
    mutationFn: () => authApi.findId(phone, token!),
    onSuccess: (d) => setFoundId(d.masked_email),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(phone, token!, pw, pw2),
    onSuccess: (d) => { setDone(d.masked_email); setToken(null); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // 인증이 끝나면 아이디 찾기 탭은 바로 결과를 보여준다
  useEffect(() => {
    if (token && tab === "id" && !foundId && !findId.isPending) findId.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-brand-50 to-warm-100 flex items-center justify-center px-4 pt-20 pb-10">
      <Link href="/login" className="absolute top-4 left-4 text-sm font-semibold text-warm-600 hover:text-brand-600">
        ← 로그인으로
      </Link>
      <SeniorModeToggle className="absolute top-3 right-4" />

      <div className="w-full max-w-sm">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">계정 찾기</CardTitle>
            <CardDescription>가입할 때 인증한 휴대폰 번호로 본인 확인을 해요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div role="tablist" className="grid grid-cols-2 rounded-lg bg-warm-100 p-1">
              {([["id", "아이디 찾기"], ["pw", "비밀번호 재설정"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={"h-10 rounded-md text-sm font-bold " + (tab === k ? "bg-white text-warm-800 shadow-sm" : "text-warm-500")}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* 1) 휴대폰 인증 */}
            <div className="space-y-3">
              <label htmlFor="fa-phone" className="text-sm font-semibold text-warm-700 block">휴대폰 번호</label>
              <div className="flex gap-2">
                <Input
                  id="fa-phone"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="01012345678"
                  disabled={!!token}
                  autoComplete="tel"
                />
                <Button type="button" className="shrink-0 h-12 px-4" disabled={!phoneValid || sendOtp.isPending || !!token} onClick={() => sendOtp.mutate()}>
                  {token ? "인증완료" : sendOtp.isPending ? "전송중" : otpSent ? "다시 받기" : "인증번호 받기"}
                </Button>
              </div>
              {otpSent && !token && (
                <div className="flex gap-2">
                  <Input
                    id="fa-otp"
                    aria-label="인증번호 6자리"
                    inputMode="numeric"
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="인증번호 6자리"
                    className="tracking-[0.2em]"
                  />
                  <Button type="button" className="shrink-0 h-12 px-5" disabled={otp.length !== 6 || verifyOtp.isPending} onClick={() => verifyOtp.mutate()}>
                    {verifyOtp.isPending ? "확인중" : "확인"}
                  </Button>
                </div>
              )}
              {token && (
                <p className="flex items-center gap-1 text-sm font-semibold text-brand-600">
                  <Check className="w-4 h-4" strokeWidth={3} /> 본인 확인이 끝났어요.
                </p>
              )}
            </div>

            {/* 2-a) 아이디 결과 */}
            {tab === "id" && token && (
              <div className="rounded-lg bg-warm-50 p-4 text-center">
                {findId.isPending && <p className="text-sm text-warm-500">찾는 중…</p>}
                {foundId && (
                  <>
                    <p className="text-sm text-warm-600">가입하신 아이디</p>
                    <p className="mt-1 text-lg font-extrabold text-warm-800 break-all">{foundId}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button asChild variant="outline"><Link href="/login">로그인하기</Link></Button>
                      <Button variant="secondary" onClick={() => setTab("pw")}>비밀번호 재설정</Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2-b) 새 비밀번호 */}
            {tab === "pw" && token && !done && (
              <form
                className="space-y-3"
                onSubmit={(e) => { e.preventDefault(); if (pwValid && pw === pw2) reset.mutate(); }}
              >
                <div>
                  <label htmlFor="fa-pw" className="text-sm font-semibold text-warm-700 block mb-1.5">새 비밀번호</label>
                  <Input id="fa-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
                  <p className={"mt-1 text-xs " + (pw && !pwValid ? "text-danger" : "text-warm-500")}>영문과 숫자를 섞어 8자 이상</p>
                </div>
                <div>
                  <label htmlFor="fa-pw2" className="text-sm font-semibold text-warm-700 block mb-1.5">새 비밀번호 확인</label>
                  <Input id="fa-pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
                  {pw2 && pw !== pw2 && <p className="mt-1 text-xs text-danger">비밀번호가 서로 달라요.</p>}
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={!pwValid || pw !== pw2 || reset.isPending}>
                  {reset.isPending ? "바꾸는 중…" : "비밀번호 바꾸기"}
                </Button>
              </form>
            )}
            {tab === "pw" && done && (
              <div className="rounded-lg bg-warm-50 p-4 text-center space-y-3">
                <p className="text-base font-bold text-warm-800">비밀번호를 바꿨어요.</p>
                <p className="text-sm text-warm-600">아이디 <b className="break-all">{done}</b> 로 로그인해 주세요.</p>
                <Button asChild className="w-full"><Link href="/login">로그인하기</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-warm-600">
          휴대폰 번호가 바뀌었다면 고객센터 <b className="whitespace-nowrap">{SUPPORT.phone}</b> ({SUPPORT.hours})로 연락해 주세요.
        </p>
      </div>
    </div>
  );
}

export default function FindAccountPage() {
  return (
    <Suspense fallback={null}>
      <FindAccount />
    </Suspense>
  );
}
