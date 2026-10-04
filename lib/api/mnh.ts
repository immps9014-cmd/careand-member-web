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
  schedule: { date: string; seq: number; status: "planned" | "scheduled" | "in_progress" | "completed"; caregiver_name: string | null; actual_start: string | null; actual_end: string | null }[];
  postponed: string[];
  completed_days: number;
  delivery_date: string | null;
  events: { id: number; type: string; date: string | null; payload: { reason?: string; new_end?: string } | null; created_at: string }[];
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
