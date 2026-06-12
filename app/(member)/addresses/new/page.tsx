"use client";

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

  const create = useMutation({
    mutationFn: (payload: CreateAddressPayload) => memberApi.createAddress(payload),
    onSuccess: () => {
      toast.success("주소를 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "addresses"] });
      router.push("/addresses");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">주소 등록</h1>
      <p className="text-sm text-warm-500 mb-5">가사 서비스를 받을 주소 정보를 입력하세요</p>

      <AddressForm submitLabel="주소 등록" pending={create.isPending} onSubmit={(p) => create.mutate(p)} />
    </div>
  );
}
