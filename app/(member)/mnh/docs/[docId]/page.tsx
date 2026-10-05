"use client";

// 바우처 서류 한 건 보기·서명(CAREN-MNH-01 3단계)
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { DocSignView } from "@/components/mnh/doc-sign-view";
import { mnhDocApi } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";

export default function MnhDocPage() {
  const { docId } = useParams<{ docId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["member", "mnh", "doc", Number(docId)], queryFn: () => mnhDocApi.get(Number(docId)) });
  const d = q.data;

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-warm-500"><ArrowLeft className="h-4 w-4" />뒤로</button>
      {q.isError && <p className="mt-4 text-sm text-warm-600">{getApiErrorMessage(q.error)}</p>}
      {!d && !q.isError && <p className="mt-4 text-sm text-warm-500">불러오는 중…</p>}
      {d && (
        <>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-warm-800">{d.title}</h1>
          <p className="mb-4 mt-1 text-[13px] text-warm-500">
            {d.status === "signed" ? "서명한 서류예요. PDF로 받아 보관할 수 있어요." : "내용을 끝까지 읽고 아래에 서명해 주세요."}
          </p>
          <DocSignView doc={d} fillAs={d.signer_role === "caregiver" ? "caregiver" : "client"}
            onSigned={(nd) => { qc.setQueryData(["member", "mnh", "doc", nd.id], nd); qc.invalidateQueries({ queryKey: ["member", "mnh"] }); }} />
        </>
      )}
    </div>
  );
}
