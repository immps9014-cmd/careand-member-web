"use client";

// 서비스 제공기록지(바우처 방문만) — 관리사가 제공한 서비스를 표시하고, 그 기기에서 산모가 서명한다(CAREN-MNH-01 3단계).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardSignature } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocSignView } from "@/components/mnh/doc-sign-view";
import { mnhDocApi } from "@/lib/api/mnh";

export function ProvisionRecordCard({ sessionId, status }: { sessionId: number; status?: string }) {
  const qc = useQueryClient();
  const key = ["member", "mnh", "provision", sessionId, status];
  const q = useQuery({ queryKey: key, queryFn: () => mnhDocApi.provisionRecord(sessionId), retry: false });
  const [open, setOpen] = useState(false);
  const r = q.data;
  if (!r?.voucher) return null;
  const doc = r.document;

  return (
    <Card className="mb-4 p-4">
      <div className="flex items-center gap-2">
        <ClipboardSignature className="h-5 w-5 text-brand-600" />
        <h2 className="text-[15px] font-bold text-warm-800">서비스 제공기록지</h2>
        {doc && (
          <span className={"ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold " + (doc.status === "signed" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-800")}>
            {doc.status === "signed" ? "산모 서명 완료" : "서명 전"}
          </span>
        )}
      </div>
      {!doc && <p className="mt-2 text-[13.5px] text-warm-500">{r.message ?? "출근한 뒤에 쓸 수 있어요."}</p>}
      {doc && !open && (
        <>
          <p className="mt-2 text-[13.5px] text-warm-600">
            {doc.status === "signed" ? "오늘 제공 내용에 산모 서명을 받았어요." : "오늘 제공한 서비스를 표시하고, 퇴근 전에 산모님께 이 화면에서 서명을 받아 주세요."}
          </p>
          <Button variant={doc.status === "signed" ? "outline" : "brand"} className="mt-3 w-full" onClick={() => setOpen(true)}>
            {doc.status === "signed" ? "기록지 보기" : "기록지 작성 · 산모 서명 받기"}
          </Button>
        </>
      )}
      {doc && !open && doc.contract_id && (
        <Link href={`/mnh/evaluations/${doc.contract_id}`} className="mt-2 block text-center text-[13.5px] font-semibold text-brand-600 underline">이 가정 평가하기(운영팀만 봐요)</Link>
      )}
      {doc && open && (
        <div className="mt-3">
          <DocSignView doc={doc} fillAs="caregiver" askSignerName
            onSigned={(nd) => { qc.setQueryData(key, { voucher: true, document: nd }); }} />
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>접기</Button>
        </div>
      )}
    </Card>
  );
}
