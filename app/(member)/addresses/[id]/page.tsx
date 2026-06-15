"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type CreateAddressPayload } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { AddressForm } from "../address-form";

export default function AddressEditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const addressId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["member", "addresses"],
    queryFn: () => memberApi.addresses(),
  });
  const address = query.data?.find((a) => a.id === addressId);

  const update = useMutation({
    mutationFn: (payload: CreateAddressPayload) => memberApi.updateAddress(addressId, payload),
    onSuccess: () => {
      toast.success("주소를 수정했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "addresses"] });
      router.push("/addresses");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => memberApi.deleteAddress(addressId),
    onSuccess: () => {
      toast.success("주소를 삭제했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "addresses"] });
      router.push("/addresses");
    },
    // 진행 중 매칭이 있으면 422 HAS_ACTIVE_REQUEST
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">주소 수정</h1>
      <p className="text-sm text-warm-500 mb-5">주소 정보를 수정하거나 삭제할 수 있습니다</p>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}

      {!query.isLoading && !address && (
        <Card className="p-8 text-center text-warm-400 text-sm">주소 정보를 찾을 수 없습니다.</Card>
      )}

      {address && (
        <>
          <AddressForm
            key={address.id}
            initial={address}
            submitLabel="수정 저장"
            pending={update.isPending}
            onSubmit={(p) => update.mutate(p)}
          />

          <Button
            variant="outline"
            size="lg"
            className="w-full mt-4 text-danger border-danger/40 hover:bg-danger-bg"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`'${address.label}' 주소를 삭제할까요? 진행 중인 매칭이 있으면 삭제할 수 없습니다.`)) {
                remove.mutate();
              }
            }}
          >
            <Trash2 className="w-4 h-4" /> {remove.isPending ? "삭제 중…" : "주소 삭제"}
          </Button>
        </>
      )}
    </div>
  );
}
