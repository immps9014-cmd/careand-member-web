"use client";

// 산모 가정 정보·희망사항·희망 제공인력 입력 (산모신생아 건강관리, 2026-10-05)
// 요구사항분석 PDF 「이용자 회원가입」 6~10번. 값 모양은 백엔드 App\Support\PostpartumCareProfile 과 같다.
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CareProfile, CareWishKey } from "@/lib/api/member";

const LABEL = "block text-[13.5px] font-bold text-warm-600 mb-2";
const FIELD = "h-11 rounded-xl text-[15px]";

export const CARE_WISHES: [CareWishKey, string, string][] = [
  ["mother_care", "산모 케어", "예) 좌욕·부종 관리, 회복식 위주로"],
  ["newborn_care", "신생아 케어", "예) 밤 수유 도움, 목욕은 저녁에"],
  ["family_care", "가족 케어", "예) 큰아이 등원 준비를 도와주시면 좋겠어요"],
  ["housework", "가사 케어", "예) 산모 빨래·주방 정리 정도"],
  ["emotional_support", "정서적 지지", "예) 이야기 상대가 되어 주시면 좋겠어요"],
  ["work_style", "성향·업무 스타일", "예) 차분하고 조용한 분"],
  ["focus", "서비스 중점 고려사항", "예) 모유수유 성공이 가장 중요해요"],
  ["special", "특이사항", "예) 제왕절개 후 회복 중, 알레르기 등"],
];

function YesNo({ value, onChange, yes = "예", no = "아니요" }: { value: boolean | null | undefined; onChange: (v: boolean) => void; yes?: string; no?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {([[true, yes], [false, no]] as const).map(([v, l]) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(v)}
          className={
            "h-11 rounded-xl border text-[14px] font-bold transition-colors " +
            (value === v ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** 산모 가정 정보 입력 — 값 전체를 받고 바뀐 전체를 돌려준다 */
export function CareProfileForm({ value, onChange }: { value: CareProfile; onChange: (v: CareProfile) => void }) {
  const set = (patch: Partial<CareProfile>) => onChange({ ...value, ...patch });
  const kids = value.older_children ?? [];
  const pref = value.preferred_caregiver ?? {};

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h4 className="text-[14.5px] font-bold text-warm-800">가정 환경</h4>
        <div>
          <label className={LABEL}>산후조리원 이용</label>
          <YesNo value={value.postnatal_center?.used} onChange={(used) => set({ postnatal_center: { used, days: used ? value.postnatal_center?.days ?? null : null } })} yes="이용해요" no="이용 안 해요" />
          {value.postnatal_center?.used && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                inputMode="numeric"
                value={value.postnatal_center?.days ?? ""}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, "").slice(0, 2);
                  set({ postnatal_center: { used: true, days: n ? Math.min(60, Number(n)) : null } });
                }}
                placeholder="14"
                className={FIELD + " w-24"}
                aria-label="조리원 이용 기간(일)"
              />
              <span className="text-[14px] text-warm-600">일 이용 후 집으로 와요</span>
            </div>
          )}
        </div>

        <div>
          <label className={LABEL}>배우자</label>
          <YesNo value={value.spouse?.present} onChange={(present) => set({ spouse: { present, at_home: present ? value.spouse?.at_home ?? null : null } })} yes="함께 살아요" no="없음·따로 살아요" />
          {value.spouse?.present && (
            <div className="mt-2">
              <p className="mb-1.5 text-[12.5px] text-warm-500">낮 시간에 집에 계신가요? (재택근무·육아휴직 등)</p>
              <YesNo value={value.spouse?.at_home} onChange={(at_home) => set({ spouse: { present: true, at_home } })} yes="집에 있어요" no="출근해요" />
            </div>
          )}
        </div>

        <div>
          <label className={LABEL}>큰아이</label>
          {kids.length > 0 && (
            <ul className="mb-2 space-y-2">
              {kids.map((k, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Input
                    inputMode="numeric"
                    value={k.age}
                    onChange={(e) => {
                      const age = Math.min(19, Number(e.target.value.replace(/\D/g, "").slice(0, 2) || 0));
                      set({ older_children: kids.map((x, j) => (j === i ? { age, school: age >= 7 ? "school" : "preschool" } : x)) });
                    }}
                    className={FIELD + " w-20"}
                    aria-label={`큰아이 ${i + 1} 나이`}
                  />
                  <span className="text-[14px] text-warm-600">살 · {k.age >= 7 ? "취학" : "미취학"}</span>
                  <button
                    type="button"
                    onClick={() => set({ older_children: kids.filter((_, j) => j !== i) })}
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100"
                    aria-label={`큰아이 ${i + 1} 빼기`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {kids.length < 6 && (
            <button
              type="button"
              onClick={() => set({ older_children: [...kids, { age: 3, school: "preschool" }] })}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-dashed border-warm-300 bg-white px-3.5 text-[14px] font-bold text-warm-600"
            >
              <Plus className="h-4 w-4" /> 큰아이 넣기
            </button>
          )}
        </div>

        <div>
          <label className={LABEL} htmlFor="cp-other-family">그 밖의 가족 <span className="font-medium text-warm-500">(선택)</span></label>
          <Input id="cp-other-family" value={value.other_family ?? ""} onChange={(e) => set({ other_family: e.target.value })} placeholder="예) 친정어머니가 낮에 함께 계세요" maxLength={100} className={FIELD} />
        </div>

        <div>
          <label className={LABEL}>반려동물</label>
          <YesNo value={value.pets?.has} onChange={(has) => set({ pets: { has, detail: has ? value.pets?.detail ?? "" : null } })} yes="있어요" no="없어요" />
          {value.pets?.has && (
            <Input value={value.pets?.detail ?? ""} onChange={(e) => set({ pets: { has: true, detail: e.target.value } })} placeholder="예) 소형견 1마리, 방에 분리해 둘 수 있어요" maxLength={100} className={FIELD + " mt-2"} aria-label="반려동물 설명" />
          )}
        </div>

        <div>
          <label className={LABEL}>CCTV(홈캠)</label>
          <YesNo value={value.cctv?.has} onChange={(has) => set({ cctv: { has, location: has ? value.cctv?.location ?? "" : null } })} yes="설치돼 있어요" no="없어요" />
          {value.cctv?.has && (
            <Input value={value.cctv?.location ?? ""} onChange={(e) => set({ cctv: { has: true, location: e.target.value } })} placeholder="예) 거실, 아기방" maxLength={100} className={FIELD + " mt-2"} aria-label="CCTV 위치" />
          )}
          <p className="mt-1.5 text-[12px] leading-relaxed text-warm-500">관리사님께 미리 알려 드려요. 설치 위치는 매칭된 분만 볼 수 있어요.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[14.5px] font-bold text-warm-800">희망사항 <span className="text-[12.5px] font-medium text-warm-500">(적고 싶은 것만)</span></h4>
        {CARE_WISHES.map(([k, label, ph]) => (
          <div key={k}>
            <label className={LABEL} htmlFor={`cp-wish-${k}`}>{label}</label>
            <Input
              id={`cp-wish-${k}`}
              value={value.wishes?.[k] ?? ""}
              onChange={(e) => set({ wishes: { ...value.wishes, [k]: e.target.value } })}
              placeholder={ph}
              maxLength={300}
              className={FIELD}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h4 className="text-[14.5px] font-bold text-warm-800">이런 관리사님이면 좋겠어요 <span className="text-[12.5px] font-medium text-warm-500">(선택)</span></h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <label className={LABEL} htmlFor="cp-pref-region">지역</label>
            <Input id="cp-pref-region" value={pref.region ?? ""} onChange={(e) => set({ preferred_caregiver: { ...pref, region: e.target.value } })} placeholder="예) 서구" maxLength={50} className={FIELD} />
          </div>
          <div className="min-w-0">
            <label className={LABEL} htmlFor="cp-pref-career">경력(년 이상)</label>
            <Input
              id="cp-pref-career"
              inputMode="numeric"
              value={pref.min_career_years ?? ""}
              onChange={(e) => {
                const n = e.target.value.replace(/\D/g, "").slice(0, 2);
                set({ preferred_caregiver: { ...pref, min_career_years: n ? Number(n) : undefined } });
              }}
              placeholder="예) 3"
              className={FIELD}
            />
          </div>
          <div className="min-w-0">
            <label className={LABEL} htmlFor="cp-pref-age">나이</label>
            <Input id="cp-pref-age" value={pref.age_range ?? ""} onChange={(e) => set({ preferred_caregiver: { ...pref, age_range: e.target.value } })} placeholder="예) 40~50대" maxLength={30} className={FIELD} />
          </div>
          <div className="min-w-0">
            <label className={LABEL} htmlFor="cp-pref-religion">종교</label>
            <Input id="cp-pref-religion" value={pref.religion ?? ""} onChange={(e) => set({ preferred_caregiver: { ...pref, religion: e.target.value } })} placeholder="예) 무관" maxLength={30} className={FIELD} />
          </div>
        </div>
        <div>
          <label className={LABEL} htmlFor="cp-pref-other">그 밖에</label>
          <Input id="cp-pref-other" value={pref.other ?? ""} onChange={(e) => set({ preferred_caregiver: { ...pref, other: e.target.value } })} placeholder="예) 비흡연자, 요리를 잘하시는 분" maxLength={200} className={FIELD} />
        </div>
      </section>
    </div>
  );
}

/** 적은 내용이 하나라도 있는가 — 비어 있으면 저장하지 않는다 */
export function careProfileFilled(p: CareProfile | null | undefined): boolean {
  if (!p) return false;
  const pref = p.preferred_caregiver ?? {};
  return (
    p.postnatal_center?.used != null ||
    p.spouse?.present != null ||
    (p.older_children?.length ?? 0) > 0 ||
    !!p.other_family?.trim() ||
    p.pets?.has != null ||
    p.cctv?.has != null ||
    Object.values(p.wishes ?? {}).some((v) => !!v?.trim()) ||
    Object.values(pref).some((v) => v !== undefined && v !== null && String(v).trim() !== "")
  );
}

/** 한 줄 요약 — 백엔드 PostpartumCareProfile::summary 와 같은 규칙(신청 화면 미리보기용) */
export function careProfileSummary(p: CareProfile | null | undefined): string | null {
  if (!p) return null;
  const parts: string[] = [];
  if (p.postnatal_center?.used) parts.push(`조리원${p.postnatal_center.days ? ` ${p.postnatal_center.days}일` : ""} 후`);
  if (p.spouse?.present) parts.push(p.spouse.at_home ? "배우자 재택" : "배우자 있음");
  const kids = p.older_children ?? [];
  if (kids.length) {
    const pre = kids.filter((k) => (k.school ?? (k.age >= 7 ? "school" : "preschool")) === "preschool").length;
    parts.push(`큰아이 ${kids.length}명${pre ? `(미취학 ${pre})` : ""}`);
  }
  if (p.other_family?.trim()) parts.push("기타 가족 있음");
  if (p.pets?.has) parts.push(`반려동물${p.pets.detail ? `: ${p.pets.detail}` : ""}`);
  if (p.cctv?.has) parts.push(`CCTV${p.cctv.location ? `: ${p.cctv.location}` : " 있음"}`);
  const wishes = Object.values(p.wishes ?? {}).filter((v) => !!v?.trim()).length;
  if (wishes) parts.push(`희망사항 ${wishes}개`);
  return parts.length ? parts.join(" · ") : null;
}
