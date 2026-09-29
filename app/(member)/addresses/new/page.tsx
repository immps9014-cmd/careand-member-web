"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { memberApi, type CreateAddressPayload } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { AddressForm } from "../address-form";

export default function NewAddressPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // 매칭요청(/request/new)에서 진입한 경우: 등록 후 방금 등록한 주소를 붙여 그 화면으로 복귀(seniors/new 와 같은 규약).
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    const rt = new URLSearchParams(window.location.search).get("returnTo");
    if (rt && /^\/(?![/\\])/.test(rt)) setReturnTo(rt);
  }, []);

  const create = useMutation({
    mutationFn: (payload: CreateAddressPayload) => memberApi.createAddress(payload),
    onSuccess: (res: any) => {
      toast.success("주소를 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "addresses"] });
      if (returnTo) {
        const newId = res?.data?.data?.id ?? res?.data?.id;
        const sep = returnTo.includes("?") ? "&" : "?";
        router.push(newId ? `${returnTo}${sep}service_address_id=${newId}` : returnTo);
        return;
      }
      router.push("/addresses");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">주소 등록</h1>
      <p className="text-sm text-warm-500 mb-5">생활지원서비스를 받을 주소 정보를 입력하세요</p>

      <AddressForm submitLabel="주소 등록" pending={create.isPending} onSubmit={(p) => create.mutate(p)} />
    </div>
  );
}
