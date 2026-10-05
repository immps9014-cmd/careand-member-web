"use client";

// 바우처 전자서명 서류 보기·서명(CAREN-MNH-01 3단계). 본문은 서버가 이스케이프해 만든 HTML(우리 태그만)이다.
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignaturePad, type SignaturePadHandle } from "@/components/mnh/signature-pad";
import { mnhDocApi, type MnhDoc, type MnhDocField } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const DOC_CSS =
  "[&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-warm-800 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_b]:font-bold [&_b]:text-warm-900 text-[14.5px] leading-relaxed text-warm-700";
const TABLE_CSS = "[&_table]:w-full [&_th]:w-1/3 [&_th]:bg-warm-50 [&_th]:p-2 [&_th]:text-left [&_th]:align-top [&_th]:text-[13px] [&_td]:p-2 [&_td]:text-[13.5px] [&_tr]:border-b [&_tr]:border-warm-100";

function FieldInput({ f, value, onChange }: { f: MnhDocField; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const opts = f.options ? (Array.isArray(f.options) ? f.options.map((o) => [o, o] as const) : Object.entries(f.options)) : [];
  if (f.type === "checks") {
    const cur = Array.isArray(value) ? value : [];
    return (
      <fieldset>
        <legend className="mb-1.5 text-[14px] font-bold text-warm-700">{f.label}</legend>
        <div className="flex flex-wrap gap-2">
          {opts.map(([k, l]) => {
            const on = cur.includes(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => onChange(on ? cur.filter((x) => x !== k) : [...cur, k])}
                className={cn("min-h-11 rounded-xl border px-3 text-[14px] font-semibold", on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (f.type === "select") {
    return (
      <fieldset>
        <legend className="mb-1.5 text-[14px] font-bold text-warm-700">{f.label}</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={f.label}>
          {opts.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
              className={cn("min-h-11 rounded-xl border px-3 text-[14px] font-semibold", value === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-bold text-warm-700">{f.label}</span>
      {f.type === "textarea" ? (
        <textarea rows={3} maxLength={2000} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-warm-200 bg-white p-3 text-[15px]" />
      ) : (
        <input type={f.type === "date" ? "date" : "text"} maxLength={100} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[15px]" />
      )}
    </label>
  );
}

/**
 * @param fillAs 이 화면에서 채우는 칸의 작성자(client=산모, caregiver=관리사가 채우고 산모가 서명하는 제공기록지)
 * @param askSignerName 서명자 이름을 받는다(관리사 기기에서 산모가 서명할 때)
 */
export function DocSignView({ doc, fillAs, askSignerName, onSigned }: {
  doc: MnhDoc; fillAs: "client" | "caregiver"; askSignerName?: boolean; onSigned: (d: MnhDoc) => void;
}) {
  const pad = useRef<SignaturePadHandle>(null);
  const [padEmpty, setPadEmpty] = useState(true);
  const [form, setForm] = useState<Record<string, string | string[]>>({ ...(doc.form_data ?? {}) });
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState(doc.signer_name ?? "");
  const mine = doc.fields.filter((f) => f.filled_by === fillAs);
  const signed = doc.status === "signed";

  const sign = useMutation({
    mutationFn: () => {
      const signature = pad.current?.toDataURL();
      if (!signature) throw new Error("서명을 그려 주세요.");
      return mnhDocApi.sign(doc.id, {
        signature, agree: true,
        ...(mine.length ? { form_data: Object.fromEntries(mine.map((f) => [f.key, form[f.key]]).filter(([, v]) => v !== undefined)) } : {}),
        ...(askSignerName ? { signer_name: name.trim() } : {}),
      });
    },
    onSuccess: (r) => { toast.success(r.message); onSigned(r.data); window.scrollTo({ top: 0 }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const pdf = useMutation({ mutationFn: () => mnhDocApi.openPdf(doc.id), onError: (e) => toast.error(getApiErrorMessage(e)) });

  return (
    <div className="space-y-4">
      {signed && (
        <Card className="flex items-center gap-3 border-brand-200 bg-brand-50 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-brand-700">서명 완료</p>
            <p className="text-[13px] text-warm-600">{doc.signer_name} · {doc.signed_at?.slice(0, 16).replace("T", " ")}</p>
          </div>
          <Button variant="outline" size="sm" disabled={pdf.isPending} onClick={() => pdf.mutate()}><FileDown className="h-4 w-4" />PDF</Button>
        </Card>
      )}
      <Card className="p-4">
        <div className={DOC_CSS} dangerouslySetInnerHTML={{ __html: doc.content_html }} />
        {(signed || doc.fields.some((f) => f.filled_by !== fillAs)) && doc.fields_html && (
          <div className={cn("mt-3 overflow-hidden rounded-xl border border-warm-100", TABLE_CSS)} dangerouslySetInnerHTML={{ __html: doc.fields_html }} />
        )}
      </Card>

      {!signed && (
        <Card className="space-y-5 p-4">
          {mine.map((f) => (
            <FieldInput key={f.key} f={f} value={form[f.key]} onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
          ))}
          {askSignerName && (
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-bold text-warm-700">서명하는 분 이름</span>
              <input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} className="h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[15px]" />
            </label>
          )}
          <SignaturePad ref={pad} label={askSignerName ? "산모 서명" : "서명"} onChange={setPadEmpty} />
          <label className="flex items-start gap-2.5 text-[14px] text-warm-700">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>위 내용을 확인했고, 이 전자서명이 자필 서명과 같은 효력을 가진다는 데 동의합니다.</span>
          </label>
          <Button variant="brand" size="lg" className="w-full rounded-2xl"
            disabled={!agree || padEmpty || sign.isPending || (askSignerName && !name.trim())} onClick={() => sign.mutate()}>
            {sign.isPending ? "서명하는 중…" : "서명하고 제출"}
          </Button>
        </Card>
      )}
    </div>
  );
}
