"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { memberApi, type CreatePatientPayload } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { PatientForm } from "../patient-form";

export default function NewPatientPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: CreatePatientPayload) => memberApi.createPatient(payload),
    onSuccess: () => {
      toast.success("환자를 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "patients"] });
      router.push("/patients");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">환자 등록</h1>
      <p className="text-sm text-warm-500 mb-5">간병이 필요한 환자의 정보를 입력하세요</p>

      <PatientForm submitLabel="환자 등록" pending={create.isPending} onSubmit={(p) => create.mutate(p)} />
    </div>
  );
}
