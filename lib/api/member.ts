import { api } from "./client";

/* ===== 보호자: 매칭 요청 ===== */
export interface GuardianRequest {
  id: number;
  mode: string;
  status: string;
  scheduled_start: string | null;
  duration_min: number;
  special_request: string | null;
  matched_at: string | null;
  created_at: string;
  service_domain?: string;
  senior?: { id: number; name: string; care_grade: string | null };
  nursing_patient?: { id: number; name: string; hospital_name: string | null };
  service_address?: { id: number; label: string; address: string };
  category?: { id: number; name: string; base_rate: number };
}

export interface Candidate {
  id: number;
  rank: number;
  ai_score: number;
  ai_reasons: string[] | null;
  response: string;
  caregiver?: {
    id: number;
    name: string | null;
    gender: string;
    age: number | null;
    specialties: string[] | null;
    rating_avg: number;
    completed_sessions: number;
  };
}

/* ===== 보호자: 어르신(돌봄 대상) ===== */
export interface Senior {
  id: number;
  name: string;
  age: number | null;
  birth_date: string | null;
  gender: string;
  care_grade: number | null;
  care_grade_no: string | null;
  diseases: string[] | null;
  special_notes: string | null;
  home_address: string | null;
  created_at: string | null;
  current_voucher?: {
    total_amount?: number;
    used_amount?: number;
    remaining_amount?: number;
  } | null;
}

export interface VitalSummary {
  count: number;
  avg_bp_sys: number;
  avg_bp_dia: number;
  avg_blood_sugar: number;
  avg_heart_rate: number;
  last_measured_at: string | null;
}

export interface VitalRecord {
  id: number;
  blood_pressure: string | null;
  blood_pressure_sys: number | null;
  blood_pressure_dia: number | null;
  blood_sugar: number | null;
  body_temperature: number | null;
  heart_rate: number | null;
  weight: number | null;
  measured_at: string | null;
}

export interface SeniorAnomalyAlert {
  id: number;
  risk_type: string;
  risk_type_ko: string;
  risk_score: number;
  severity: string;
  severity_ko: string;
  trigger_pattern: string | null;
  recommendation: string | null;
  status: string;
  status_ko: string;
  detected_at: string | null;
  detected_ago: string | null;
}

export interface TimeseriesPoint {
  recorded_at: string;
  value: number;
}

export interface CreateSeniorPayload {
  name: string;
  birth_date: string;
  gender: "M" | "F";
  care_grade: number;
  care_grade_no?: string;
  diseases?: string[];
  special_notes?: string;
  home_address: string;
}

/* ===== 보호자: 환자(간병 대상) ===== */
export type PatientMobility = "independent" | "assisted" | "bedridden";

export interface NursingPatient {
  id: number;
  name: string;
  birth_date: string | null;
  gender: string;
  hospital_name: string | null;
  hospital_address: string | null;
  hospital_lat: number | null;
  hospital_lng: number | null;
  ward_room: string | null;
  mobility: PatientMobility | null;
  diseases: string[] | null;
  care_requirements: string[] | null;
  special_notes: string | null;
  created_at: string | null;
}

export interface CreatePatientPayload {
  name: string;
  birth_date: string;
  gender: "M" | "F";
  hospital_name: string;
  hospital_address: string;
  hospital_lat?: number;
  hospital_lng?: number;
  ward_room?: string;
  mobility?: PatientMobility;
  diseases?: string[];
  care_requirements?: string[];
  special_notes?: string;
}

/* ===== 보호자: 서비스 주소(가사 대상) ===== */
export type DwellingType = "apartment" | "villa" | "house" | "officetel" | "other";

export interface ServiceAddress {
  id: number;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  dwelling_type: DwellingType | null;
  size_m2: number | null;
  has_pets: boolean;
  entry_note: string | null;
  created_at: string | null;
}

export interface CreateAddressPayload {
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  dwelling_type?: DwellingType;
  size_m2?: number;
  has_pets?: boolean;
  entry_note?: string;
}

/* ===== 인력 ===== */
export interface MyMatch {
  candidate_id: number;
  rank: number;
  ai_score: number;
  ai_reasons: string[];
  response: string;
  request_id: number;
  service_domain: string;
  mode: string;
  scheduled_start: string | null;
  duration_min: number;
  request_status: string;
  senior_name: string;
}

export interface MySession {
  id: number;
  status: string;
  service_domain: string;
  senior_name: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  duration_min: number;
  photo_required: boolean;
}

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface RecommendedCaregiver {
  id: number;
  name: string;
  rating: string;
  rating_count: number;
  completed_sessions: number;
  spec: string;
  base_rate: number | null;
  distance_km: number | null;
  tag: string | null;
}

export interface MemberSettlement {
  id: number;
  period_start: string;
  period_end: string;
  gross_amount: number;
  withholding_tax: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
}

export interface MemberNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_ago: string;
  created_at: string;
}

export const memberApi = {
  // 보호자 — 매칭
  async guardianRequests(status?: string): Promise<GuardianRequest[]> {
    const { data } = await api.get("/v1/matching/requests", { params: status ? { status } : {} });
    return data.data ?? [];
  },
  async recommendedCaregivers(): Promise<RecommendedCaregiver[]> {
    const { data } = await api.get("/v1/caregivers/recommended");
    return data.data ?? [];
  },
  async candidates(requestId: number): Promise<{ candidates: Candidate[]; request_status: string; message: string | null }> {
    const { data } = await api.get(`/v1/matching/requests/${requestId}/candidates`);
    return { candidates: data.data ?? [], request_status: data.request_status, message: data.message };
  },
  selectCandidate: (requestId: number, candidateId: number) =>
    api.post(`/v1/matching/requests/${requestId}/select`, { candidate_id: candidateId }),
  async categories(domain?: "senior" | "nursing" | "housekeeping"): Promise<{ id: number; name: string }[]> {
    const { data } = await api.get("/v1/matching/categories", { params: domain ? { domain } : {} });
    return data.data ?? [];
  },
  createRequest: (payload: {
    service_domain?: "nursing" | "housekeeping";
    senior_id?: number;
    nursing_patient_id?: number;
    service_address_id?: number;
    category_id: number;
    mode: string;
    scheduled_start: string;
    duration_min: number;
    recurrence_rule?: { days: number };
    special_request?: string;
    requirements?: Record<string, unknown>;
  }) => api.post("/v1/matching/requests", payload),

  // 보호자 — 어르신(돌봄 대상)
  async seniors(): Promise<Senior[]> {
    const { data } = await api.get("/v1/seniors");
    return data.data ?? [];
  },
  async seniorDetail(id: number): Promise<Senior> {
    const { data } = await api.get(`/v1/seniors/${id}`);
    return data.data;
  },
  createSenior: (payload: CreateSeniorPayload) => api.post("/v1/seniors", payload),

  // 보호자 — 환자(간병 대상)
  async patients(): Promise<NursingPatient[]> {
    const { data } = await api.get("/v1/nursing/patients");
    return data.data ?? [];
  },
  createPatient: (payload: CreatePatientPayload) => api.post("/v1/nursing/patients", payload),
  updatePatient: (id: number, payload: Partial<CreatePatientPayload>) =>
    api.patch(`/v1/nursing/patients/${id}`, payload),
  deletePatient: (id: number) => api.delete(`/v1/nursing/patients/${id}`),

  // 보호자 — 서비스 주소(가사 대상)
  async addresses(): Promise<ServiceAddress[]> {
    const { data } = await api.get("/v1/housekeeping/addresses");
    return data.data ?? [];
  },
  createAddress: (payload: CreateAddressPayload) => api.post("/v1/housekeeping/addresses", payload),
  updateAddress: (id: number, payload: Partial<CreateAddressPayload>) =>
    api.patch(`/v1/housekeeping/addresses/${id}`, payload),
  deleteAddress: (id: number) => api.delete(`/v1/housekeeping/addresses/${id}`),
  async vitals(seniorId: number, period: "7d" | "30d" | "90d" = "30d"): Promise<{ summary: VitalSummary; data: VitalRecord[] }> {
    const { data } = await api.get(`/v1/seniors/${seniorId}/vitals`, { params: { period } });
    return { summary: data.summary, data: data.data ?? [] };
  },
  async healthTimeseries(seniorId: number, metric: string, days = 14): Promise<TimeseriesPoint[]> {
    const { data } = await api.get(`/v1/seniors/${seniorId}/health-timeseries`, { params: { metric, days } });
    return data.data ?? [];
  },
  async seniorAlerts(seniorId: number): Promise<{ data: SeniorAnomalyAlert[]; unresolved: number }> {
    const { data } = await api.get(`/v1/seniors/${seniorId}/anomaly-alerts`);
    return { data: data.data ?? [], unresolved: data.meta?.unresolved_count ?? 0 };
  },

  // 인력
  async myMatches(): Promise<MyMatch[]> {
    const { data } = await api.get("/v1/caregivers/me/matches");
    return data.data ?? [];
  },
  async mySessions(): Promise<MySession[]> {
    const { data } = await api.get("/v1/caregivers/me/sessions");
    return data.data ?? [];
  },
  acceptMatch: (candidateId: number) => api.post(`/v1/matching/candidates/${candidateId}/accept`),
  rejectMatch: (candidateId: number) => api.post(`/v1/matching/candidates/${candidateId}/reject`),
  checkin: (sessionId: number, coords: Coords) =>
    api.post(`/v1/care-sessions/${sessionId}/checkin`, coords),
  checkout: (sessionId: number, coords: Coords) =>
    api.post(`/v1/care-sessions/${sessionId}/checkout`, coords),
  uploadSessionPhoto: (sessionId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/v1/care-sessions/${sessionId}/photos`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  async settlements(): Promise<MemberSettlement[]> {
    const { data } = await api.get("/v1/settlements");
    return data.data ?? [];
  },

  // 공통
  async notifications(): Promise<{ data: MemberNotification[]; unread: number }> {
    const { data } = await api.get("/v1/notifications");
    return { data: data.data ?? [], unread: data.meta?.unread_count ?? 0 };
  },
  markRead: (id: number) => api.post(`/v1/notifications/${id}/read`),
};

/**
 * 디바이스 GPS 좌표를 받아온다(출/퇴근 체크용). HTTPS + 위치 권한 필요.
 * 권한 거부/미지원/타임아웃 시 사용자용 한국어 메시지로 reject.
 */
export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("이 기기에서는 위치 확인을 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요."
            : err.code === err.TIMEOUT
              ? "현재 위치 확인이 지연되고 있습니다. GPS 신호가 좋은 곳에서 다시 시도해주세요."
              : "현재 위치를 확인할 수 없습니다. GPS를 켜고 다시 시도해주세요.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
