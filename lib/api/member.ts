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
  /** 도메인 무관 대상 표시명(산후·아이·마음돌봄 포함) — 백엔드 목록 API 가 채운다 */
  recipient_name?: string | null;
  senior?: { id: number; name: string; care_grade: string | null };
  nursing_patient?: { id: number; name: string; hospital_name: string | null };
  service_address?: { id: number; label: string; address: string };
  category?: { id: number; name: string; base_rate: number };
  /** 함께 필요한 세부 종류 이름(복수 선택, 산후 등) */
  extra_categories?: string[];
  // 확정 매칭 정보(status=matched일 때). 케어자 이름·케어 일정·결제 상태.
  match?: {
    id: number;
    status: string | null; // 케어 진행: confirmed|in_progress|completed|cancelled|no_show
    scheduled_start: string | null;
    scheduled_end: string | null;
    caregiver_name: string | null;
    payment_status: string | null;
  } | null;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: unknown;
  created_at: string;
}

/* ===== 보호자: 케어일지(AI) 수신·열람 — Phase 2 ===== */
export interface GuardianSession {
  id: number;
  status: string; // scheduled|in_progress|completed|cancelled
  review_status: string; // pending|approved|rejected (일지 검수 상태)
  has_summary: boolean;
  service_domain: string;
  recipient_name: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  duration_min: number;
}

// 보호자에겐 medical_version 미노출(INV-7) — 의도적으로 타입에서 제외.
export interface AiSummary {
  guardian_version: string | null;
  categorized: Record<string, unknown> | null; // meal/exercise/vital/mood ...
  confidence: number | null;
  generated_at: string;
  /** 일지와 함께 보는 돌봄 사진(기능 5) */
  photos?: { url: string; thumbnail: string; caption: string | null }[];
  /** 돌봄전문가에게만(기능 14) */
  medical_version?: string | null;
  review_status?: string;
  sent?: boolean;
  editable?: boolean;
  review_note?: string | null;
  edited_at?: string | null;
}

export interface PriceEstimate {
  floor: number;
  suggested: number;
  ceil: number;
  n_samples?: number;
  inputs?: { base_rate?: number; min_hourly?: number; is_night?: boolean; is_holiday?: boolean; is_emergency?: boolean };
}

export interface Candidate {
  id: number;
  rank: number;
  ai_score: number;
  ai_reasons: string[] | null;
  source?: string; // ai=시스템 추천, self=돌봄전문가 직접 지원
  response: string;
  // 역경매 입찰
  bid_hourly: number | null;
  bid_note: string | null;
  bid_status: "none" | "invited" | "bid" | "withdrawn";
  // 가성비 재랭킹(입찰 반영) — 미산정 시 null
  value_score: number | null;
  value_reason: string | null;
  caregiver?: {
    id: number;
    name: string | null;
    gender: string;
    age: number | null;
    specialties: string[] | null;
    rating_avg: number;
    rating_count?: number;   // 0 이면 「신규」(09-29)
    completed_sessions: number;
    /** 후보 카드에서 바로(2026-10-05) */
    license_verified?: boolean;
    careand_certified?: boolean;   // 케어앤에듀 인증 마크(2026-10-07)
    region?: string | null;
    photo_url?: string | null;
    verified_doc_count?: number;
  };
}

/** 돌봄전문가 후기(GET caregivers/{id}/reviews) */
export interface CaregiverReview {
  id: number;
  rating: number;
  comment: string | null;
  tags: string[];
  admin_reply: string | null;
  reviewer: string;
  service_label: string;
  created_at: string;
}
export interface CaregiverReviewPage {
  summary: { count: number; avg: number | null; distribution: Record<string, number> };
  reviews: CaregiverReview[];
  meta: { page: number; last_page: number; total: number };
}

/** 교체 요청·신고(2026-10-05) */
export type IssueKind = "replace" | "report";
export interface CareIssue {
  id: number;
  kind: IssueKind;
  kind_label: string;
  category: string;
  category_label: string;
  detail: string;
  status: "open" | "in_progress" | "resolved" | "rejected";
  status_label: string;
  admin_reply: string | null;
  handled_at: string | null;
  created_at: string;
}
export interface CareIssueOverview {
  issues: CareIssue[];
  kinds: Record<IssueKind, string>;
  categories: Record<string, string>;
  can_report: boolean;
}

/* ===== 보호자: 돌봄대상 ===== */
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

/* ===== 요청자: 산모(산모신생아 건강관리 대상) ===== */
export type DeliveryType = "natural" | "cesarean" | "vbac";

export interface PostpartumClient {
  id: number;
  name: string;
  delivery_date: string | null;
  delivery_type: DeliveryType | null;
  status: string;
  /** 산모 연락처 = 회원 본인 연락처(「본인이 산모」 레코드) */
  is_self?: boolean;
  /** 이 산모의 아기(신생아) */
  newborns?: Newborn[];
  /** 가정 정보·희망사항·희망 제공인력 (산모신생아 건강관리, 2026-10-05) */
  care_profile?: CareProfile | null;
  /** 산모 비상연락처(2026-10-05) — phone 은 숫자만 */
  emergency_contact?: EmergencyContact | null;
}

export interface EmergencyContact { name: string; relation: string; phone: string }

/** 산모 이용일지(2026-10-05) — 백엔드 App\Support\MnhClientJournal */
export type JournalKind = "feeding" | "diaper" | "sleep" | "temperature" | "mother" | "service" | "note";
export interface JournalValues {
  method?: "breast" | "bottle_breast" | "formula";
  ml?: number;
  minutes?: number;
  type?: "urine" | "stool" | "both";
  target?: "baby" | "mother";
  celsius?: number;
  condition?: "good" | "ok" | "bad";
}
export interface JournalEntry {
  id: number;
  kind: JournalKind;
  kind_label: string;
  newborn_id: number | null;
  newborn_name: string | null;
  logged_at: string;
  values: JournalValues | null;
  summary: string;
  note: string | null;
  flag: string | null;
  flag_label: string | null;
  checked_at: string | null;
  checked_by_name: string | null;
  check_note: string | null;
  created_at: string;
}
export interface JournalOverview {
  options: {
    kinds: Record<JournalKind, string>;
    feeding_methods: Record<string, string>;
    diaper_types: Record<string, string>;
    conditions: Record<string, string>;
    flags: Record<string, string>;
    thresholds: { baby_fever: number; baby_low: number; mother_fever: number };
  };
  newborns: { id: number; name: string }[];
  entries: JournalEntry[];
  days: number;
}
export interface CreateJournalPayload {
  kind: JournalKind;
  newborn_id?: number | null;
  logged_at?: string;
  values?: JournalValues;
  note?: string;
}

/** 산모 가정 정보 — 백엔드 App\Support\PostpartumCareProfile 과 같은 모양 */
export interface CareProfile {
  postnatal_center?: { used: boolean | null; days?: number | null };
  spouse?: { present: boolean | null; at_home?: boolean | null };
  older_children?: { age: number; school?: "preschool" | "school" }[];
  other_family?: string | null;
  pets?: { has: boolean | null; detail?: string | null };
  cctv?: { has: boolean | null; location?: string | null };
  wishes?: Partial<Record<CareWishKey, string>>;
  preferred_caregiver?: { region?: string; min_career_years?: number; age_range?: string; religion?: string; other?: string };
}
export type CareWishKey = "mother_care" | "newborn_care" | "family_care" | "housework" | "emotional_support" | "work_style" | "focus" | "special";

/** 에딘버러 산후우울 검사(EPDS) */
export interface EpdsQuestion { no: number; text: string; options: [string, number][] }
export interface EpdsReport {
  id: number;
  date: string;
  total: number;
  max: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_label: string;
  message: string;
  subscales: { key: string; label: string; score: number; max: number; flag?: boolean }[];
  self_harm: boolean;
  recommend_mental_care: boolean;
}
export interface EpdsOverview {
  period: string;
  questions: EpdsQuestion[];
  crisis_contacts: { label: string; number: string }[];
  can_take_today: boolean;
  history: EpdsReport[];
}

/** 아기(신생아) — 신청 폼 간이 등록. birth_date 는 Y-m-d(한국 날짜) */
export interface Newborn {
  id: number;
  name: string;
  gender: "M" | "F";
  birth_date: string;
  birth_weight_g: number;
}

export interface CreateNewbornPayload {
  name: string;
  gender: "M" | "F";
  birth_date: string;
  birth_weight_g: number;
}

export interface CreatePostpartumClientPayload {
  emergency_contact?: EmergencyContact;
  name: string;
  phone: string;
  birth_date: string;
  address: string;
  region_code: string;
  delivery_date: string;
  delivery_type: DeliveryType;
  is_first_baby?: boolean;
}

/* ===== 보호자: 아동(아이돌봄 대상) ===== */
export interface Child {
  id: number;
  name: string;
  birth_date: string | null;
  gender: "M" | "F";
}

export interface CreateChildPayload {
  name: string;
  birth_date: string;
  gender: "M" | "F";
  home_address: string;
  special_notes?: string;
}

/* ===== 보호자: 마음돌봄 대상 ===== */
export interface MentalCareClient {
  id: number;
  name: string;
  relation: string | null;
  gender: "M" | "F" | null;
  home_address?: string | null;
}

export interface CreateMentalCareClientPayload {
  name: string;
  relation?: string;
  birth_date?: string;
  gender?: "M" | "F";
  home_address: string;
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

/* ===== 돌봄전문가: 열린 요청 탐색(pull) / 기피 ===== */
export interface OpenRequest {
  request_id: number;
  service_domain: string;
  category: string | null;
  recipient_name: string; // 마스킹됨 (예: 오○○○○○)
  recipient_age: number | null;
  recipient_gender: string | null;
  care_grade: string | null;
  region: string | null;
  distance_km: number | null;
  scheduled_start: string | null;
  duration_min: number;
  mode: string;
  special_request: string | null;
  // 동행(LS_COMPANION) 동선 요약 — 아니면 null
  companion_route: {
    destination: string | null;
    return_to_origin: boolean;
    waypoint_count: number;
    transport: "taxi" | "transit" | null;
  } | null;
  /** 함께 필요한 세부 종류 이름 */
  extra_categories?: string[];
  /** 산후: 「아기 1명 · 생후 3일」 */
  newborn_summary?: string | null;
  household_summary?: string | null;
  created_at: string | null;
}

export interface MyBlock {
  id: number;
  target_type: string;
  target_id: number;
  target_name: string;
  reason: string | null;
  created_at: string | null;
}

/* ===== 돌봄전문가 ===== */
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
  match_status: string | null; // confirmed|in_progress|completed (본인 확정 시)
  payment_status: string | null; // 보호자 결제 상태
  /** 수락했지만 보호자가 다른 전문가와 확정 — 진행 목록에서 뺀다 */
  matched_other?: boolean;
  senior_name: string;
  category?: string | null;
  extra_categories?: string[];
  newborn_summary?: string | null;
  household_summary?: string | null;
  // 역경매 입찰
  bid_hourly: number | null;
  bid_note: string | null;
  bid_status: "none" | "invited" | "bid" | "withdrawn";
  price_guide: { floor: number | null; suggested: number | null; ceil: number | null } | null;
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
  /** 보호자 결제 완료 여부 — false 면 출근 불가(서버 PAYMENT_REQUIRED) */
  paid?: boolean;
  extra_categories?: string[];
  newborn_summary?: string | null;
  household_summary?: string | null;
  /** 방문 장소(길찾기, 기능 35) — 예정·진행 중 세션만 */
  place?: { name: string; lat: number; lng: number } | null;
}

/* ===== 돌봄전문가: 케어 활동 기록 입력 ===== */
export interface CareActivityItem {
  id: number;
  session_id: number;
  category: string;
  data: Record<string, unknown> | unknown[] | null;
  memo: string | null;
  performed_at: string | null;
}

export interface VoiceLogItem {
  id: number;
  status: string; // uploaded|transcribing|transcribed|summarized|failed
  duration_sec: number;
  stt_text: string | null;
  created_at: string;
}

export interface SessionDetail {
  id: number;
  status: string;
  duration_min: number;
  match?: {
    senior?: { id: number | null; name: string | null } | null;
    // 동행 전체 경로(정확 주소 포함) — 동행 확정 매칭에만 존재
    companion_route?: {
      meeting: string | null;
      destination: string | null;
      return_to_origin: boolean;
      return_address: string | null;
      waypoints: string[];
      transport: "taxi" | "transit" | null;
    } | null;
  } | null;
  activities?: CareActivityItem[];
  voice_logs?: VoiceLogItem[];
}

export interface CaregiverProfile {
  id: number;
  name: string | null;
  gender: "M" | "F" | null;
  age: number | null;
  license_no: string | null;        // 마스킹된 값
  license_verified: boolean;
  specialties: string[] | null;
  rating_avg: number;
  rating_count: number;
  completed_sessions: number;
  grade_level: number;
  status: "pending" | "active" | "rejected" | string;
  rejection_reason?: string | null;
  base_address: string | null;
  service_domains: string | null;  // 돌봄전문가 직군 (senior=요양보호/nursing=간병/housekeeping=가사)
  default_rate: number | null;     // 역경매 표준 희망 시급
  auto_bid: boolean;               // 초대 시 default_rate로 자동 입찰
  photo_url?: string | null;       // 프로필 사진 서명 링크(6시간)
  careand_certified?: boolean;
  careand_cert?: { name: string; issuer: string; number: string; issued_date: string } | null;
}

/** 인력 비상연락처·사진·희망사항(2026-10-05) — 비상연락처·희망사항은 본인과 운영팀만 본다 */
export interface EmergencyContact { name: string; relation: string; phone: string }
export interface WorkPreferences { days: number[]; times: string[]; regions: string | null; note: string | null }
export interface CaregiverExtras {
  emergency_contact: EmergencyContact | null;
  work_preferences: WorkPreferences | null;
  photo_url: string | null;
  missing: ("emergency_contact" | "photo")[];
  labels?: { times: Record<string, string>; relations: string[] };
}

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

// ── 결제 (P2-1) ──
export type PaymentMethod = "card" | "account" | "voucher_only";

/** POST /v1/payments/calculate 응답 — 결제 전 금액 산출 */
export interface PaymentCalc {
  match_id: number;
  total_amount: number;
  self_pay: number; // 본인부담
  ltc_pay: number; // 장기요양공단 부담
  copay_rate: number | null; // 본인부담률
  voucher_remaining: number | null;
  voucher_after_payment: number | null;
}

/** 결제 레코드 (GET /v1/payments, approve 응답) */
export interface Payment {
  id: number;
  total_amount: number;
  amount_self_pay: number;
  amount_ltc_pay: number;
  method: PaymentMethod;
  status: string; // pending|paid|cancelled ...
  pg_provider: string | null;
  pg_tid: string | null;
  paid_at: string | null;
  created_at: string | null;
  match?: { id: number; senior_name?: string | null };
}

/** 영수증(기능 8) — GET /v1/payments/{id}/receipt */
export interface PaymentReceipt {
  receipt_no: string;
  status: string;
  paid_at: string | null;
  method: string;
  pg_tid_tail: string | null;
  service: string;
  service_period: string | null;
  recipient: string;
  caregiver: string | null;
  buyer: string;
  total_amount: number;
  self_pay: number;
  ltc_pay: number;
  items: { description: string; amount: number }[];
  seller: { name: string; ceo: string; biz_no: string; address: string; tel: string };
}

export interface MyCertificate {
  certified: boolean;
  certificate: { name: string; issuer: string; number: string; issued_date: string; holder: string } | null;
  name: string;
  criteria: { min_sessions: number; min_rating: number; min_reviews: number };
  stats: { sessions: number; reviews: number; rating: number | null };
}

export interface RecommendedCaregiver {
  id: number;
  name: string;
  domains?: string[];
  gender?: string | null;
  age?: number | null;
  region?: string | null;
  rating: string;
  rating_count: number;
  completed_sessions: number;
  spec: string;
  base_rate: number | null;
  distance_km: number | null;
  tag: string | null;
  careand_certified?: boolean;   // 케어앤에듀 인증 마크(2026-10-07)
  is_favorited?: boolean;
}

/** 케어 만족도 평가 대상(완료 케어) + 내 기존 평가 */
export interface ReviewableCare {
  match_id: number;
  caregiver_id: number;
  caregiver_name: string;
  recipient_name: string;
  service_domain: string;
  scheduled_start: string | null;
  rating: number | null;
  comment: string | null;
  tags: string[];
  /** 도메인별 평가 항목 점수 {항목키: 1~5} */
  scores: Record<string, number>;
  /** 도메인별 평가 항목 — 백엔드 config/review_criteria.php */
  criteria: { key: string; label: string }[];
  reviewed: boolean;
}

/** 돌봄전문가 상세 프로필 — GET /v1/caregivers/{id} (CaregiverResource) */
export interface CaregiverDetail {
  /** 케어앤에듀 인증 돌봄전문가(2026-10-07) */
  careand_certified?: boolean;
  careand_cert?: { name: string; issuer: string; number: string; issued_date: string } | null;
  /** 이용자 공개 서류(확인 완료분, 2026-10-05) — 파일 없이 이름·유효기간만 */
  verified_documents?: { type: string; label: string; issued_at: string | null; expires_at: string | null }[];
  id: number;
  name: string | null;
  gender: string | null;
  age: number | null;
  license_no: string | null;
  license_verified: boolean;
  specialties: string | null;
  service_domains: string | null;
  rating_avg: number;
  rating_count: number;
  completed_sessions: number;
  grade_level: string | null;
  status: string;
  base_address: string | null;
  default_rate: number | null;
  organization: { id: number; name: string } | null;
  photo_url?: string | null;
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
  /** 명세서 확인·이의제기(기능 15) */
  caregiver_ack_at?: string | null;
  dispute_status?: "open" | "resolved" | null;
  dispute_reason?: string | null;
  dispute_reply?: string | null;
}

/** 받은 후기·월별 활동(기능 16) — GET /v1/caregivers/me/performance */
export interface CaregiverPerformance {
  rating_avg: number;
  rating_count: number;
  completed_sessions: number;
  career_track: string;
  status: string;
  rating_note: string;
  months: { month: string; sessions: number; hours: number; reviews: number; avg_rating: number | null }[];
  reviews: { rating: number; comment: string | null; tags: string[]; scores: { label: string; score: number }[]; service: string; reply: string | null; created_at: string }[];
}

/** 돌봄전문가 제출 서류(기능 9·20) — GET /v1/caregivers/me/documents */
export type DocStatus = "missing" | "submitted" | "verified" | "rejected" | "expired";
export interface CaregiverDocItem {
  type: string;
  label: string;
  required: boolean;
  hint: string | null;
  /** 확인되면 이용자에게 「확인됨·유효기간」이 보이는 서류(산모신생아 건강관리) */
  public?: boolean;
  /** 발급일 입력 필요(매년 갱신 서류) */
  needs_issued_at?: boolean;
  status: DocStatus;
  document: {
    id: number;
    original_name: string | null;
    issued_at: string | null;
    expires_at: string | null;
    reject_reason: string | null;
    created_at: string;
  } | null;
}
export interface CaregiverDocuments {
  checklist: CaregiverDocItem[];
  payout: { bank_name: string | null; bank_account_masked: string | null; bank_holder: string | null; updated_at: string | null };
  accept: { mimes: string[]; max_kb: number };
}

/** 칩 기반 케어일지(기능 40) — 원본은 온톨로지 care-journal 계층 */
export interface JournalChip {
  code: string;
  label: string;
  category: string;
  category_label: string;
  category_order: number;
  phrase: string;
  tone: "good" | "neutral" | "caution" | "alert";
  order: number;
  alert: { id: string; label: string; severity: string } | null;
}
export interface SessionChips {
  chips: string[];
  note: string | null;
  updated_at: string | null;
  locked: boolean;
}

export interface MemberNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_ago: string;
  created_at: string;
}

export const memberApi = {
  // 보호자 — 매칭
  /** 진행 중(open) 요청에 돌봄전문가를 「직접 지정」 후보로 추가 */
  inviteToRequest: (requestId: number, caregiverId: number) =>
    api.post(`/v1/matching/requests/${requestId}/invite`, { caregiver_id: caregiverId }),
  async guardianRequests(status?: string): Promise<GuardianRequest[]> {
    const { data } = await api.get("/v1/matching/requests", { params: status ? { status } : {} });
    return data.data ?? [];
  },
  async recommendedCaregivers(domain?: string): Promise<RecommendedCaregiver[]> {
    const { data } = await api.get("/v1/caregivers/recommended", { params: domain ? { domain } : {} });
    return data.data ?? [];
  },
  async caregiverDetail(id: number): Promise<CaregiverDetail> {
    const { data } = await api.get(`/v1/caregivers/${id}`);
    return data.data;
  },
  async caregiversByDomain(domain?: string): Promise<RecommendedCaregiver[]> {
    const { data } = await api.get("/v1/caregivers", { params: domain ? { domain } : {} });
    return data.data ?? [];
  },
  /** 케어 만족도 — 평가 가능한 완료 케어 + 내 기존 평가 */
  async reviewableCares(): Promise<ReviewableCare[]> {
    const { data } = await api.get("/v1/guardians/reviewable");
    return data.data ?? [];
  },
  /** 케어 만족도 등록/수정 */
  async submitReview(payload: { match_id: number; rating: number; comment?: string; tags?: string[]; scores?: Record<string, number> }): Promise<void> {
    await api.post("/v1/guardians/reviews", payload);
  },
  /** 찜 토글 → { favorited } */
  async toggleFavorite(id: number): Promise<boolean> {
    const { data } = await api.post(`/v1/caregivers/${id}/favorite`);
    return !!data.data?.favorited;
  },
  /** 찜한 돌봄전문가 목록 (추후 신청 반영용) */
  async favoriteCaregivers(): Promise<RecommendedCaregiver[]> {
    const { data } = await api.get("/v1/caregivers/favorites");
    return data.data ?? [];
  },
  // 보호자 — 케어일지(AI) [Phase 2, BE 2.2/2.7 의존]
  async guardianSessions(): Promise<GuardianSession[]> {
    const { data } = await api.get("/v1/guardians/me/sessions");
    return data.data ?? [];
  },
  async careSessionAiSummary(sessionId: number): Promise<AiSummary | null> {
    const { data } = await api.get(`/v1/care-sessions/${sessionId}/ai-summary`);
    return data.data ?? null;
  },
  async shareCareLog(sessionId: number): Promise<{ url: string; expires_at: string }> {
    const { data } = await api.post(`/v1/care-sessions/${sessionId}/share`);
    return data.data;
  },
  async careLogShares(sessionId: number): Promise<{ id: number; expires_at: string; view_count: number; created_at: string }[]> {
    const { data } = await api.get(`/v1/care-sessions/${sessionId}/shares`);
    return data.data ?? [];
  },
  revokeCareLogShare: (shareId: number) => api.delete(`/v1/care-log-shares/${shareId}`),
  updateSessionLog: (sessionId: number, guardianVersion: string, reason?: string) =>
    api.put(`/v1/care-sessions/${sessionId}/log`, { guardian_version: guardianVersion, reason }),
  async candidates(requestId: number): Promise<{ candidates: Candidate[]; request_status: string; message: string | null; price_estimate: PriceEstimate | null; match_id: number | null; match_status: string | null; payment_status: string | null; matched_caregiver_id: number | null }> {
    const { data } = await api.get(`/v1/matching/requests/${requestId}/candidates`);
    // match_id: 매칭 확정(인력 수락) 시 백엔드가 노출하면 결제 진입에 사용 (없으면 null → CTA 미노출)
    return { candidates: data.data ?? [], request_status: data.request_status, message: data.message, price_estimate: data.price_estimate ?? null, match_id: data.match_id ?? null, match_status: data.match_status ?? null, payment_status: data.payment_status ?? null, matched_caregiver_id: data.matched_caregiver_id ?? null };
  },
  selectCandidate: (requestId: number, candidateId: number) =>
    api.post(`/v1/matching/requests/${requestId}/select`, { candidate_id: candidateId }),
  /** 확정 전(open·matching) 요청 취소 */
  cancelRequest: (requestId: number, reason?: string) =>
    api.post(`/v1/matching/requests/${requestId}/cancel`, { reason }),
  // 챗봇(보호자) — 백엔드 /v1/chatbot
  async chatbotSessions(): Promise<{ id: number; started_at: string; ended_at: string | null }[]> {
    const { data } = await api.get("/v1/chatbot/sessions");
    return data.data ?? [];
  },
  async chatbotStart(): Promise<{ session_id: number; welcome: ChatMessage }> {
    const { data } = await api.post("/v1/chatbot/sessions", {});
    return { session_id: data.session_id, welcome: data.welcome_message };
  },
  async chatbotMessages(sessionId: number): Promise<ChatMessage[]> {
    const { data } = await api.get(`/v1/chatbot/sessions/${sessionId}/messages`);
    return data.data ?? [];
  },
  async chatbotAsk(sessionId: number, question: string): Promise<ChatMessage> {
    const { data } = await api.post(`/v1/chatbot/sessions/${sessionId}/ask`, { question }, { timeout: 60_000 });
    return data.data;
  },
  // 적정 간병비 미리보기 (요청 생성 전)
  async pricingEstimate(params: {
    service_domain?: string;
    category_id: number;
    mode?: string;
    scheduled_start?: string;
    duration_min?: number;
    senior_id?: number;
    nursing_patient_id?: number;
    service_address_id?: number;
    requirements?: { service_items?: string[] };
  }): Promise<PriceEstimate> {
    const { data } = await api.get("/v1/matching/pricing/estimate", { params });
    return data.data;
  },
  async categories(domain?: string): Promise<{ id: number; code?: string; name: string; base_rate?: number | string }[]> {
    const { data } = await api.get("/v1/matching/categories", { params: domain ? { domain } : {} });
    return data.data ?? [];
  },
  createRequest: (payload: {
    service_domain?: "nursing" | "living_support" | "postpartum" | "childcare" | "mental_care";
    senior_id?: number;
    nursing_patient_id?: number;
    service_address_id?: number;
    postpartum_client_id?: number;
    childcare_child_id?: number;
    mental_care_client_id?: number;
    category_id: number;
    mode: string;
    scheduled_start: string;
    duration_min: number;
    recurrence_rule?: { days?: number; weekdays?: number[]; weeks?: number };
    special_request?: string;
    requirements?: Record<string, unknown>;
    budget_hourly?: number;
  }) => api.post("/v1/matching/requests", payload),

  // 보호자 — 돌봄대상
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

  // 요청자 — 산모(산모신생아 건강관리 대상). 통합 요청 폼 선택기용 (본인 user_id 스코프)
  async postpartumClients(): Promise<PostpartumClient[]> {
    const { data } = await api.get("/v1/matching/postpartum-clients");
    return data.data ?? [];
  },
  createPostpartumClient: (payload: CreatePostpartumClientPayload) =>
    api.post("/v1/matching/postpartum-clients", payload),
  createNewborn: (postpartumClientId: number, payload: CreateNewbornPayload) =>
    api.post(`/v1/matching/postpartum-clients/${postpartumClientId}/newborns`, payload),

  // 산모 가정 정보 저장(통째로 덮어씀)
  updateCareProfile: (postpartumClientId: number, care_profile: CareProfile) =>
    api.put(`/v1/matching/postpartum-clients/${postpartumClientId}/care-profile`, { care_profile }),

  // 산모 비상연락처 저장
  async savePostpartumEmergency(postpartumClientId: number, v: EmergencyContact): Promise<EmergencyContact> {
    const { data } = await api.put(`/v1/matching/postpartum-clients/${postpartumClientId}/emergency-contact`, v);
    return data.data.emergency_contact;
  },

  // 산모 이용일지 — 최근 n일 / 기록 / 지우기(기관 확인 전만)
  async journal(postpartumClientId: number, days = 7): Promise<JournalOverview> {
    const { data } = await api.get(`/v1/matching/postpartum-clients/${postpartumClientId}/journal`, { params: { days } });
    return data.data;
  },
  async addJournal(postpartumClientId: number, payload: CreateJournalPayload): Promise<{ entry: JournalEntry; message: string }> {
    const { data } = await api.post(`/v1/matching/postpartum-clients/${postpartumClientId}/journal`, payload);
    return { entry: data.data, message: data.message };
  },
  deleteJournal: (postpartumClientId: number, entryId: number) =>
    api.delete(`/v1/matching/postpartum-clients/${postpartumClientId}/journal/${entryId}`),

  // 에딘버러 산후우울 검사 — 문항·이력 / 응시(10개 답, 각 0~3)
  async epds(postpartumClientId: number): Promise<EpdsOverview> {
    const { data } = await api.get(`/v1/matching/postpartum-clients/${postpartumClientId}/epds`);
    return data.data;
  },
  async submitEpds(postpartumClientId: number, answers: number[]): Promise<EpdsReport> {
    const { data } = await api.post(`/v1/matching/postpartum-clients/${postpartumClientId}/epds`, { answers });
    return data.data;
  },

  // 보호자 — 아동(아이돌봄 대상). 통합 요청 폼 선택기용
  async children(): Promise<Child[]> {
    const { data } = await api.get("/v1/matching/children");
    return data.data ?? [];
  },
  createChild: (payload: CreateChildPayload) => api.post("/v1/matching/children", payload),

  // 보호자 — 마음돌봄 대상. 통합 요청 폼 선택기용
  async mentalCareClients(): Promise<MentalCareClient[]> {
    const { data } = await api.get("/v1/matching/mental-care-clients");
    return data.data ?? [];
  },
  createMentalCareClient: (payload: CreateMentalCareClientPayload) =>
    api.post("/v1/matching/mental-care-clients", payload),
  async vitals(seniorId: number, period: "7d" | "30d" | "90d" = "30d"): Promise<{ summary: VitalSummary | null; data: VitalRecord[] }> {
    const { data } = await api.get(`/v1/seniors/${seniorId}/vitals`, { params: { period } });
    // 측정 이력이 없는(신규) 돌봄대상은 백엔드가 summary: null을 줄 수 있음 → 명시적 null 폴백
    return { summary: data.summary ?? null, data: data.data ?? [] };
  },
  async healthTimeseries(seniorId: number, metric: string, days = 14): Promise<TimeseriesPoint[]> {
    const { data } = await api.get(`/v1/seniors/${seniorId}/health-timeseries`, { params: { metric, days } });
    return data.data ?? [];
  },
  async seniorAlerts(seniorId: number): Promise<{ data: SeniorAnomalyAlert[]; unresolved: number }> {
    const { data } = await api.get(`/v1/seniors/${seniorId}/anomaly-alerts`);
    return { data: data.data ?? [], unresolved: data.meta?.unresolved_count ?? 0 };
  },

  // 돌봄전문가
  async myCaregiver(): Promise<CaregiverProfile> {
    const { data } = await api.get("/v1/caregivers/me");
    return data.data;
  },
  async myMatches(): Promise<MyMatch[]> {
    const { data } = await api.get("/v1/caregivers/me/matches");
    return data.data ?? [];
  },
  async mySessions(): Promise<MySession[]> {
    const { data } = await api.get("/v1/caregivers/me/sessions");
    return data.data ?? [];
  },
  async caregiverReviews(caregiverId: number, page = 1): Promise<CaregiverReviewPage> {
    const { data } = await api.get(`/v1/caregivers/${caregiverId}/reviews`, { params: { page } });
    return data.data;
  },
  async careIssues(requestId: number): Promise<CareIssueOverview> {
    const { data } = await api.get(`/v1/matching/requests/${requestId}/issues`);
    return data.data;
  },
  async reportCareIssue(requestId: number, body: { kind: IssueKind; category: string; detail: string }): Promise<string> {
    const { data } = await api.post(`/v1/matching/requests/${requestId}/issues`, body);
    return data.message;
  },
  acceptMatch: (candidateId: number) => api.post(`/v1/matching/candidates/${candidateId}/accept`),
  rejectMatch: (candidateId: number) => api.post(`/v1/matching/candidates/${candidateId}/reject`),
  // 역경매: 입찰가 제시/수정
  async submitBid(candidateId: number, bidHourly: number, bidNote?: string): Promise<{ warn_out_of_band: boolean }> {
    const { data } = await api.post(`/v1/matching/candidates/${candidateId}/bid`, { bid_hourly: bidHourly, bid_note: bidNote ?? null });
    return { warn_out_of_band: !!data.warn_out_of_band };
  },
  // 인력 프로필 수정: 가입정보(주소·가능서비스) + 역경매(표준 희망 시급/자동입찰)
  updateCaregiver: (payload: {
    base_address?: string;
    base_lat?: number;
    base_lng?: number;
    specialties?: string[];
    default_rate?: number | null;
    auto_bid?: boolean;
  }) => api.patch("/v1/caregivers/me/profile", payload),
  // 돌봄전문가 주도(pull): 열린 요청 탐색 / 직접 지원 / 기피(차단)
  async openRequests(): Promise<OpenRequest[]> {
    const { data } = await api.get("/v1/matching/open-requests");
    return data.data ?? [];
  },
  applyToRequest: (requestId: number) => api.post(`/v1/matching/requests/${requestId}/apply`),
  async myBlocks(): Promise<MyBlock[]> {
    const { data } = await api.get("/v1/matching/blocks");
    return data.data ?? [];
  },
  blockTarget: (requestId: number, reason?: string) =>
    api.post("/v1/matching/blocks", { request_id: requestId, reason }),
  unblock: (blockId: number) => api.delete(`/v1/matching/blocks/${blockId}`),
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
  async careSessionDetail(sessionId: number): Promise<SessionDetail> {
    const { data } = await api.get(`/v1/care-sessions/${sessionId}`);
    return data.data;
  },
  addSessionActivity: (
    sessionId: number,
    payload: { category: string; data: Record<string, unknown>; memo: string | null },
  ) => api.post(`/v1/care-sessions/${sessionId}/activities`, payload),
  uploadVoiceLog: (sessionId: number, blob: Blob, durationSec: number, filename = "voice.webm") => {
    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("duration_sec", String(durationSec));
    return api.post(`/v1/care-sessions/${sessionId}/voice-log`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  /** 케어앤에듀 인증 자격 — 보유 시 자격 정보, 없으면 기준 대비 진행(2026-10-07) */
  async myCertificate(): Promise<MyCertificate> {
    const { data } = await api.get("/v1/caregivers/me/certificate");
    return data.data;
  },

  async myDocuments(): Promise<CaregiverDocuments> {
    const { data } = await api.get("/v1/caregivers/me/documents");
    return data.data;
  },
  uploadDocument: (docType: string, file: File, issuedAt?: string) => {
    const fd = new FormData();
    fd.append("doc_type", docType);
    fd.append("file", file);
    if (issuedAt) fd.append("issued_at", issuedAt);
    return api.post("/v1/caregivers/me/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  updatePayout: (payload: { bank_name: string; bank_account: string; bank_holder: string }) =>
    api.put("/v1/caregivers/me/payout-account", payload),
  /* 비상연락처·사진·희망사항(2026-10-05) */
  async myExtras(): Promise<CaregiverExtras> {
    const { data } = await api.get("/v1/caregivers/me/extras");
    return data.data;
  },
  async saveEmergency(payload: EmergencyContact): Promise<CaregiverExtras> {
    const { data } = await api.put("/v1/caregivers/me/emergency-contact", payload);
    return data.data;
  },
  async savePreferences(payload: WorkPreferences): Promise<CaregiverExtras> {
    const { data } = await api.put("/v1/caregivers/me/work-preferences", payload);
    return data.data;
  },
  async uploadPhoto(file: File): Promise<CaregiverExtras> {
    const fd = new FormData();
    fd.append("photo", file);
    const { data } = await api.post("/v1/caregivers/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return data.data;
  },
  async deletePhoto(): Promise<CaregiverExtras> {
    const { data } = await api.delete("/v1/caregivers/me/photo");
    return data.data;
  },
  async journalChips(): Promise<JournalChip[]> {
    const { data } = await api.get("/v1/care-journal/chips");
    return data.data?.chips ?? [];
  },
  async sessionChips(sessionId: number): Promise<SessionChips> {
    const { data } = await api.get(`/v1/care-sessions/${sessionId}/chips`);
    return data.data;
  },
  saveSessionChips: (sessionId: number, chips: string[], note: string | null) =>
    api.put(`/v1/care-sessions/${sessionId}/chips`, { chips, note }),
  async myPerformance(): Promise<CaregiverPerformance> {
    const { data } = await api.get("/v1/caregivers/me/performance");
    return data.data;
  },
  requestLeave: () => api.post("/v1/caregivers/me/leave"),
  requestReturn: () => api.post("/v1/caregivers/me/return"),
  ackSettlement: (id: number) => api.post(`/v1/settlements/${id}/ack`),
  disputeSettlement: (id: number, reason: string) => api.post(`/v1/settlements/${id}/dispute`, { reason }),
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

  // ── 결제 (P2-1) ──
  /** 매칭 결제금액 산출(총액/본인부담/장기요양공단/바우처). POST /v1/payments/calculate */
  async paymentCalculate(matchId: number): Promise<PaymentCalc> {
    const { data } = await api.post("/v1/payments/calculate", { match_id: matchId });
    return data.data as PaymentCalc;
  },
  /** 결제 승인. method=card 는 card_token 필요(stub PG). POST /v1/payments/approve */
  async paymentApprove(payload: { match_id: number; method: PaymentMethod; card_token?: string }): Promise<Payment> {
    const { data } = await api.post("/v1/payments/approve", payload);
    return data.data as Payment;
  },
  /** 토스페이먼츠 결제 준비 — 서버가 금액 재계산·주문번호 발급 (S4). POST /v1/payments/toss/prepare */
  async tossPrepare(matchId: number, method: "card" | "account"): Promise<import("@/lib/toss").TossPrepared> {
    const { data } = await api.post("/v1/payments/toss/prepare", { match_id: matchId, method });
    return data.data;
  },
  /** 토스 결제창 성공 후 서버 승인. POST /v1/payments/toss/confirm */
  async tossConfirm(payload: { payment_key: string; order_id: string; amount: number }): Promise<Payment> {
    const { data } = await api.post("/v1/payments/toss/confirm", payload);
    return data.data as Payment;
  },
  /** 내 결제 내역. GET /v1/payments */
  async payments(status?: string, filter?: { month?: string; domain?: string }): Promise<Payment[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (filter?.month) params.month = filter.month;
    if (filter?.domain) params.domain = filter.domain;
    const { data } = await api.get("/v1/payments", { params });
    return data.data ?? [];
  },
  async receipt(paymentId: number): Promise<PaymentReceipt> {
    const { data } = await api.get(`/v1/payments/${paymentId}/receipt`);
    return data.data;
  },
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
