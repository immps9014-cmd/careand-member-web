import { api } from "./client";

/* 산모신생아 바우처 기간형 계약 — 회원(이용자) 쪽(CAREN-MNH-01 2단계, 2026-10-05). 제공기관 = 케어앤. */

export interface MnhSupportType {
  id: number;
  fetus_type: string;
  birth_order: string;
  income_tier: string;
  period: string;
  days: number;
  total_price: number;
  gov_support: number;
  self_pay: number;
  note: string | null;
}

export interface MnhOptions {
  year: number;
  rates_ready: boolean;
  support_types: MnhSupportType[];
  income_tiers: string[];
  fetus_types: Record<string, string>;
  birth_orders: Record<string, string>;
  periods: Record<string, string>;
  payment_methods: Record<string, string>;
  min_days: number;
  max_days: number;
  weekdays: number[];
  daily_start: string;
  daily_minutes: number;
}

export type MnhStatus = "applied" | "confirmed" | "active" | "completed" | "cancelled";

export interface MnhContract {
  id: number;
  contract_no: string;
  status: MnhStatus;
  status_label: string;
  postpartum_client_id: number;
  client_name: string | null;
  support_label: string | null;
  days: number;
  total_price: number | null;
  gov_support: number | null;
  self_pay: number | null;
  rates_set: boolean;
  start_date: string;
  end_date: string | null;
  daily_start: string;
  daily_minutes: number;
  payment_method_label: string;
  prepaid: boolean;
  prepaid_amount: number | null;
  prepaid_at: string | null;
  caregiver_name: string | null;
  member_note: string | null;
  cancel_reason: string | null;
}

export interface MnhContractDetail extends MnhContract {
  schedule: { date: string; seq: number; status: "planned" | "scheduled" | "in_progress" | "completed"; caregiver_name: string | null; actual_start: string | null; actual_end: string | null; holiday?: string | null }[];
  postponed: string[];
  /** 공휴일이라 빠진 날(끝에 보충) */
  holidays?: { date: string; name: string }[];
  completed_days: number;
  delivery_date: string | null;
  events: { id: number; type: string; date: string | null; payload: { reason?: string; new_end?: string; name?: string } | null; created_at: string }[];
  caregiver_documents: { type: string; label: string; issued_at: string | null; expires_at: string | null }[];
}

export interface MnhCreatePayload {
  postpartum_client_id: number;
  start_date: string;
  fetus_type: string;
  birth_order: string;
  income_tier?: string;
  period?: string;
  days?: number;
  payment_method: string;
  member_note?: string;
}

export const mnhApi = {
  async options(year?: number): Promise<MnhOptions> {
    const { data } = await api.get("/v1/mnh/options", { params: year ? { year } : {} });
    return data.data;
  },
  async contracts(): Promise<MnhContract[]> {
    const { data } = await api.get("/v1/mnh/contracts");
    return data.data ?? [];
  },
  async contract(id: number): Promise<MnhContractDetail> {
    const { data } = await api.get(`/v1/mnh/contracts/${id}`);
    return data.data;
  },
  async create(payload: MnhCreatePayload): Promise<{ message: string; data: MnhContractDetail }> {
    const { data } = await api.post("/v1/mnh/contracts", payload);
    return data;
  },
  cancel: (id: number) => api.post(`/v1/mnh/contracts/${id}/cancel`, {}),
};

export const MNH_STATUS_CLS: Record<MnhStatus, string> = {
  applied: "bg-amber-50 text-amber-700",
  confirmed: "bg-sky-50 text-sky-700",
  active: "bg-brand-500 text-white",
  completed: "bg-brand-50 text-brand-700",
  cancelled: "bg-warm-100 text-warm-500",
};

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
/** "2026-10-06" → "10월 6일(화)" */
export function mnhDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일(${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

export function won(n: number | null | undefined): string {
  return n == null ? "-" : `${n.toLocaleString("ko-KR")}원`;
}

/** 오늘(한국 날짜) "YYYY-MM-DD" */
export function todayKst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

/* ───── 전자서명 서류(3단계) ───── */

export interface MnhDocField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "checks" | "select";
  filled_by: "client" | "caregiver" | "admin";
  options: string[] | Record<string, string> | null;
}

export interface MnhDocBrief {
  id: number;
  doc_type: string;
  label: string;
  title: string;
  status: "issued" | "signed" | "void";
  signer_role: "client" | "caregiver";
  signer_name: string | null;
  before_start: boolean;
  contract_id: number | null;
  care_session_id: number | null;
  signed_at: string | null;
  pdf_ready: boolean;
  issued_at: string;
  session_date?: string | null;
}

export interface MnhDoc extends MnhDocBrief {
  content_html: string;
  fields: MnhDocField[];
  form_data: Record<string, string | string[]>;
  fields_html: string;
}

export const mnhDocApi = {
  async forContract(contractId: number): Promise<{ documents: MnhDocBrief[]; missing_before_start: string[] }> {
    const { data } = await api.get(`/v1/mnh/contracts/${contractId}/documents`);
    return data.data;
  },
  async mine(): Promise<MnhDocBrief[]> {
    const { data } = await api.get("/v1/mnh/my-documents");
    return data.data ?? [];
  },
  async get(id: number): Promise<MnhDoc> {
    const { data } = await api.get(`/v1/mnh/documents/${id}`);
    return data.data;
  },
  async sign(id: number, body: { signature: string; agree: boolean; form_data?: Record<string, unknown>; signer_name?: string }): Promise<{ message: string; data: MnhDoc }> {
    const { data } = await api.post(`/v1/mnh/documents/${id}/sign`, body);
    return data;
  },
  async provisionRecord(sessionId: number): Promise<{ voucher: boolean; document?: MnhDoc | null; message?: string }> {
    const { data } = await api.get(`/v1/mnh/sessions/${sessionId}/provision-record`);
    return data.data;
  },
  /** PDF 를 새 탭으로 연다(인증 헤더가 필요해 blob 으로 받는다) */
  async openPdf(id: number): Promise<void> {
    const win = window.open("", "_blank");
    try {
      const res = await api.get(`/v1/mnh/documents/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      if (win) win.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      // blob 응답의 오류 문구(예: PDF 만드는 중)를 꺼내 보여 준다
      const blob = (e as { response?: { data?: Blob } }).response?.data;
      if (blob instanceof Blob) {
        const msg = await blob.text().then((t) => JSON.parse(t).message as string).catch(() => null);
        if (msg) throw new Error(msg);
      }
      throw e;
    }
  },
};

/* ───── 양방향 평가·내 종합평가(4단계, 돌봄전문가) ───── */

export interface MyHexAxis { key: string; label: string; score: number | null; n: number; enough: boolean }
export interface ClientEvalItem { key: string; label: string; score?: number | null }
export interface ClientEval { id: number; timing: "interim" | "final"; timing_label: string; items: ClientEvalItem[]; average: number | null; comment: string | null; updated_at: string }

export const mnhEvalApi = {
  async contracts(): Promise<{ contract_id: number; contract_no: string; status: string; client_name: string | null; start_date: string; end_date: string | null; interim_count: number; final_done: boolean }[]> {
    const { data } = await api.get("/v1/mnh/client-evaluations");
    return data.data ?? [];
  },
  async form(contractId: number): Promise<{ contract_id: number; contract_no: string; status: string; client_name: string | null; items: ClientEvalItem[]; can_final: boolean; mine: ClientEval[] }> {
    const { data } = await api.get(`/v1/mnh/contracts/${contractId}/client-evaluation`);
    return data.data;
  },
  async submit(contractId: number, body: { scores: Record<string, number>; comment?: string; timing: "interim" | "final" }): Promise<{ message: string }> {
    const { data } = await api.post(`/v1/mnh/contracts/${contractId}/client-evaluations`, body);
    return data;
  },
  async myHexagon(): Promise<{ axes: MyHexAxis[]; overall: number | null; counts: { reviews: number; org_evaluations: number; completed_visits: number }; team_average: { key: string; label: string; score: number | null }[]; min_samples: number }> {
    const { data } = await api.get("/v1/mnh/my-hexagon");
    return data.data;
  },
};
