"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileCheck2, Upload, Landmark, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memberApi, type CaregiverDocItem, type DocStatus } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

/**
 * 돌봄전문가 서류 제출·정산 계좌 (기능 9·20, 2026-09-28 S5)
 * 올린 파일은 서버에서 암호화 보관되고 운영팀만 사유를 남기고 열람한다. 본인도 다시 내려받을 수 없다.
 */
const STATUS: Record<DocStatus, { label: string; cls: string }> = {
  missing: { label: "미제출", cls: "bg-warm-100 text-warm-600" },
  submitted: { label: "확인 중", cls: "bg-amber-50 text-amber-700" },
  verified: { label: "확인 완료", cls: "bg-brand-50 text-brand-700" },
  rejected: { label: "보완 필요", cls: "bg-red-50 text-red-700" },
  expired: { label: "기간 만료", cls: "bg-red-50 text-red-700" },
};

export default function DocumentsPage() {
  const router = useRouter();
  const role = useAuth((s) => s.user?.role);
  const hydrated = useAuth((s) => s.hasHydrated);
  const isCg = role === "caregiver";

  useEffect(() => {
    if (hydrated && role && !isCg) router.replace("/mypage");
  }, [hydrated, role, isCg, router]);

  const q = useQuery({ queryKey: ["member", "documents"], queryFn: memberApi.myDocuments, enabled: isCg, retry: false });

  if (!isCg) return null;
  const list = q.data?.checklist ?? [];
  const doneRequired = list.filter((d) => d.required && d.status === "verified").length;
  const totalRequired = list.filter((d) => d.required).length;

  return (
    <div className="px-4 pt-4 pb-8 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">서류 · 정산 계좌</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        활동을 시작하려면 필수 서류 확인이 필요해요.
        {q.data && ` 필수 ${totalRequired}건 중 ${doneRequired}건 확인 완료.`}
      </p>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-warm-50 px-3 py-2.5 text-xs leading-relaxed text-warm-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-600" />
        올린 파일은 암호화해 보관하고, 운영팀이 확인할 때만 열람 기록을 남기고 열어 봐요. 탈퇴하면 30일 뒤 삭제돼요.
      </div>

      {q.isLoading && <Card className="mt-5 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}
      {q.isError && (
        <Card className="mt-5 p-8 text-center">
          <p className="mb-4 text-sm text-warm-500">{getApiErrorMessage(q.error)}</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>다시 시도</Button>
        </Card>
      )}

      <div className="mt-5 space-y-3">
        {list.map((d) => (
          <DocCard key={d.type} item={d} accept={q.data?.accept.mimes ?? []} />
        ))}
      </div>

      {q.data && <PayoutCard payout={q.data.payout} />}
    </div>
  );
}

function DocCard({ item, accept }: { item: CaregiverDocItem; accept: string[] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [issuedAt, setIssuedAt] = useState("");
  const needsIssued = item.type === "criminal_record" || item.type === "health_cert";
  const st = STATUS[item.status];

  const upload = useMutation({
    mutationFn: (file: File) => memberApi.uploadDocument(item.type, file, issuedAt || undefined),
    onSuccess: () => {
      toast.success(`${item.label}를 제출했어요`);
      qc.invalidateQueries({ queryKey: ["member", "documents"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-warm-800">
            <FileCheck2 className="h-4 w-4 text-brand-600" />
            {item.label}
            {item.required && <span className="text-[11px] font-semibold text-red-600">필수</span>}
          </div>
          {item.hint && <p className="mt-0.5 text-xs text-warm-500">{item.hint}</p>}
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", st.cls)}>{st.label}</span>
      </div>

      {item.document && (
        <p className="mt-2 text-xs text-warm-500">
          제출 {item.document.created_at?.slice(0, 10)}
          {item.document.expires_at && ` · 유효기간 ${item.document.expires_at}까지`}
        </p>
      )}
      {item.status === "rejected" && item.document?.reject_reason && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">보완 사유: {item.document.reject_reason}</p>
      )}

      {item.status !== "verified" && (
        <div className="mt-3 space-y-2">
          {needsIssued && (
            <label className="block text-xs font-semibold text-warm-600">
              발급일
              <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className="mt-1" />
            </label>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={accept.map((m) => "." + m).join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = "";
            }}
          />
          <Button
            variant={item.status === "missing" ? "brand" : "outline"}
            className="w-full"
            disabled={upload.isPending || (needsIssued && !issuedAt)}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {upload.isPending ? "올리는 중…" : item.document ? "다시 올리기" : "파일 올리기"}
          </Button>
          {needsIssued && !issuedAt && <p className="text-[11px] text-warm-500">발급일을 먼저 입력해 주세요.</p>}
        </div>
      )}
    </Card>
  );
}

function PayoutCard({ payout }: { payout: { bank_name: string | null; bank_account_masked: string | null; bank_holder: string | null } }) {
  const qc = useQueryClient();
  const [bank, setBank] = useState(payout.bank_name ?? "");
  const [acct, setAcct] = useState("");
  const [holder, setHolder] = useState(payout.bank_holder ?? "");

  const save = useMutation({
    mutationFn: () => memberApi.updatePayout({ bank_name: bank.trim(), bank_account: acct.trim(), bank_holder: holder.trim() }),
    onSuccess: () => {
      toast.success("정산 계좌를 저장했어요");
      setAcct("");
      qc.invalidateQueries({ queryKey: ["member", "documents"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Card className="mt-5 p-4">
      <div className="flex items-center gap-1.5 font-bold text-warm-800">
        <Landmark className="h-4 w-4 text-brand-600" />
        정산 계좌
      </div>
      {payout.bank_account_masked ? (
        <p className="mt-1 text-xs text-warm-500">
          현재: {payout.bank_name} {payout.bank_account_masked} ({payout.bank_holder})
        </p>
      ) : (
        <p className="mt-1 text-xs text-warm-500">정산금을 받을 본인 명의 계좌를 등록해 주세요.</p>
      )}
      <div className="mt-3 grid gap-2">
        <Input placeholder="은행 (예: 국민)" value={bank} onChange={(e) => setBank(e.target.value)} maxLength={40} />
        <Input placeholder="계좌번호 (숫자와 - 만)" inputMode="numeric" value={acct} onChange={(e) => setAcct(e.target.value)} maxLength={30} />
        <Input placeholder="예금주" value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={40} />
      </div>
      <p className="mt-2 text-[11px] text-warm-500">계좌를 바꾸면 통장 사본을 다시 확인해요.</p>
      <Button
        variant="brand"
        className="mt-3 w-full"
        disabled={save.isPending || !bank.trim() || !acct.trim() || !holder.trim()}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "저장 중…" : "계좌 저장"}
      </Button>
    </Card>
  );
}
