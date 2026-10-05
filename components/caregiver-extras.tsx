"use client";

// 돌봄전문가 프로필 사진·비상연락처·희망사항(2026-10-05, 요구사항분석 PDF 「인력 회원가입」).
// 사진은 보호자에게 보이고, 비상연락처·희망사항은 본인과 운영팀만 본다.
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, HeartHandshake, Phone, Trash2, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memberApi, type CaregiverExtras } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const RELATIONS = ["배우자", "자녀", "부모", "형제자매", "친척", "지인", "기타"];
const TIMES: Record<string, string> = { day: "주간(09~18시)", evening: "저녁", night: "야간", live_in: "입주·숙식" };

export function CaregiverExtrasCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["mypage", "cg-extras"], queryFn: () => memberApi.myExtras() });
  const set = (d: CaregiverExtras) => {
    qc.setQueryData(["mypage", "cg-extras"], (old: CaregiverExtras | undefined) => ({ ...old, ...d }));
    qc.invalidateQueries({ queryKey: ["mypage", "caregiver"] });
  };
  const d = q.data;
  if (!d) return null;
  const missing = d.missing ?? [];

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <UserRound className="w-4 h-4 text-brand-600" />
        <h2 className="font-bold text-warm-800">프로필·비상연락처</h2>
      </div>
      {missing.length > 0 ? (
        <p className="text-[13px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-4">
          {missing.map((m) => (m === "photo" ? "프로필 사진" : "비상연락처")).join("·")}을 넣어 주세요. 운영팀 승인 때 확인해요.
        </p>
      ) : (
        <p className="text-[13px] text-warm-500 mb-4">사진은 보호자에게 보이고, 비상연락처와 희망사항은 운영팀만 봐요.</p>
      )}
      <PhotoBlock url={d.photo_url} onDone={set} />
      <EmergencyBlock value={d.emergency_contact} onDone={set} />
      <PreferenceBlock value={d.work_preferences} onDone={set} />
    </Card>
  );
}

function PhotoBlock({ url, onDone }: { url: string | null; onDone: (d: CaregiverExtras) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const up = useMutation({
    mutationFn: (f: File) => memberApi.uploadPhoto(f),
    onSuccess: (d) => { toast.success("사진을 바꿨어요."); onDone(d); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => memberApi.deletePhoto(),
    onSuccess: (d) => { toast.success("사진을 지웠어요."); onDone(d); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <section className="flex items-center gap-4 pb-4 border-b border-warm-100" aria-label="프로필 사진">
      <div className="w-20 h-20 shrink-0 rounded-full bg-warm-100 overflow-hidden grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="내 프로필 사진" className="w-full h-full object-cover" /> : <UserRound className="w-9 h-9 text-warm-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-warm-700">프로필 사진</p>
        <p className="text-[12px] text-warm-500 mb-2">얼굴이 잘 보이는 정면 사진. 보호자가 매칭 때 봐요.</p>
        <input ref={input} id="cg-photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) up.mutate(f); e.target.value = ""; }} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={up.isPending} onClick={() => input.current?.click()}>
            <Camera className="w-4 h-4" />{up.isPending ? "올리는 중…" : url ? "사진 바꾸기" : "사진 올리기"}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" aria-label="사진 지우기" disabled={del.isPending}
              onClick={() => { if (window.confirm("프로필 사진을 지울까요?")) del.mutate(); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function EmergencyBlock({ value, onDone }: { value: CaregiverExtras["emergency_contact"]; onDone: (d: CaregiverExtras) => void }) {
  const [name, setName] = useState(value?.name ?? "");
  const [relation, setRelation] = useState(value?.relation ?? "배우자");
  const [phone, setPhone] = useState(value?.phone ?? "");
  useEffect(() => { setName(value?.name ?? ""); setRelation(value?.relation ?? "배우자"); setPhone(value?.phone ?? ""); }, [value]);
  const save = useMutation({
    mutationFn: () => memberApi.saveEmergency({ name: name.trim(), relation, phone: phone.trim() }),
    onSuccess: (d) => { toast.success("비상연락처를 저장했어요."); onDone(d); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const dirty = name !== (value?.name ?? "") || relation !== (value?.relation ?? "배우자") || phone.replace(/\D/g, "") !== (value?.phone ?? "");
  return (
    <form className="py-4 border-b border-warm-100 grid gap-2" aria-label="비상연락처"
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <p className="text-[13.5px] font-bold text-warm-700 flex items-center gap-1.5"><Phone className="w-4 h-4 text-warm-500" />비상연락처</p>
      <p className="text-[12px] text-warm-500 -mt-1">근무 중 사고가 났을 때 운영팀이 연락할 가족·지인이에요.</p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input id="ec-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="이름" aria-label="비상연락처 이름" required />
        <select id="ec-relation" aria-label="관계" value={relation} onChange={(e) => setRelation(e.target.value)}
          className="h-12 rounded-xl border border-warm-200 bg-white px-3 text-[16px]">
          {RELATIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <Input id="ec-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" aria-label="비상연락처 전화번호" required />
      <Button type="submit" variant="brand" disabled={save.isPending || !dirty || !name.trim() || !phone.trim()}>
        {save.isPending ? "저장 중…" : value ? "비상연락처 고치기" : "비상연락처 저장"}
      </Button>
    </form>
  );
}

function PreferenceBlock({ value, onDone }: { value: CaregiverExtras["work_preferences"]; onDone: (d: CaregiverExtras) => void }) {
  const [days, setDays] = useState<number[]>(value?.days ?? []);
  const [times, setTimes] = useState<string[]>(value?.times ?? []);
  const [regions, setRegions] = useState(value?.regions ?? "");
  const [note, setNote] = useState(value?.note ?? "");
  useEffect(() => { setDays(value?.days ?? []); setTimes(value?.times ?? []); setRegions(value?.regions ?? ""); setNote(value?.note ?? ""); }, [value]);
  const save = useMutation({
    mutationFn: () => memberApi.savePreferences({ days, times, regions: regions.trim() || null, note: note.trim() || null }),
    onSuccess: (d) => { toast.success("희망사항을 저장했어요."); onDone(d); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <form className="pt-4 grid gap-3" aria-label="희망사항" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <p className="text-[13.5px] font-bold text-warm-700 flex items-center gap-1.5"><HeartHandshake className="w-4 h-4 text-warm-500" />희망사항·특이사항</p>
      <div>
        <p className="text-[12.5px] font-semibold text-warm-600 mb-1.5">일하고 싶은 요일</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="요일">
          {DAYS.map((label, i) => (
            <button key={label} type="button" aria-pressed={days.includes(i + 1)} onClick={() => setDays(toggle(days, i + 1))}
              className={cn("w-10 h-10 rounded-full border text-[14px] font-semibold",
                days.includes(i + 1) ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-warm-200 text-warm-700")}>{label}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12.5px] font-semibold text-warm-600 mb-1.5">시간대</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="시간대">
          {Object.entries(TIMES).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={times.includes(k)} onClick={() => setTimes(toggle(times, k))}
              className={cn("px-3 h-10 rounded-full border text-[14px] font-semibold",
                times.includes(k) ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-warm-200 text-warm-700")}>{label}</button>
          ))}
        </div>
      </div>
      <label className="grid gap-1.5">
        <span className="text-[12.5px] font-semibold text-warm-600">희망 지역</span>
        <Input id="pref-regions" value={regions} maxLength={200} onChange={(e) => setRegions(e.target.value)} placeholder="예) 대전 동구·중구, 집에서 30분 이내" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[12.5px] font-semibold text-warm-600">특이사항(건강·알레르기·가능하지 않은 일 등)</span>
        <textarea id="pref-note" value={note} maxLength={1000} rows={3} onChange={(e) => setNote(e.target.value)}
          placeholder="예) 반려동물 털 알레르기가 있어요" className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-[16px]" />
      </label>
      <Button type="submit" variant="brand" disabled={save.isPending}>{save.isPending ? "저장 중…" : "희망사항 저장"}</Button>
    </form>
  );
}
