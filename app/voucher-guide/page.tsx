"use client";

// 산모신생아 바우처 안내·본인부담 계산기 — 공개 경로(/app/voucher-guide), 로그인 불필요(CAREN-REF-01 1단계).
// 신청 버튼은 /mnh 로 — 로그인 전이면 미들웨어가 로그인 화면을 거쳐 돌려보낸다.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VoucherGuide } from "@/components/mnh/voucher-guide";

export default function VoucherGuidePage() {
  return (
    <div className="min-h-dvh bg-warm-50">
      <div className="px-4 pt-4 pb-10 lg:mx-auto lg:max-w-3xl">
        <Link href="/mnh" className="inline-flex min-h-11 items-center gap-1 text-sm text-warm-500"><ArrowLeft className="h-4 w-4" />케어앤</Link>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-warm-800">산모신생아 바우처 안내</h1>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed text-warm-500">
          산모·신생아 건강관리사가 집으로 방문하는 정부 바우처예요. 유형과 소득 구간을 고르면 본인부담금을 바로 볼 수 있어요.
        </p>
        <VoucherGuide applyHref="/mnh" />
      </div>
    </div>
  );
}
