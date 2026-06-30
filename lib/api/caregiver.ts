import { api } from "./client";

/**
 * 돌봄전문가(요양보호사·간병인·가사도우미) 자격정보 등록
 * - 회원가입(role=caregiver) 후 인증된 상태에서 호출
 * - 백엔드: POST /v1/caregivers/register (RegisterCaregiverRequest)
 *   · 만 18세 이상(birth_date before -18 years)
 *   · license_no 보건복지부 진위확인 → status=pending(검수대기)/rejected
 */
export interface CaregiverRegisterPayload {
  birth_date: string;        // YYYY-MM-DD
  gender: "M" | "F";
  service_domains?: string[]; // 활동 도메인(공급자 직군) — 미전송 시 백엔드 senior 기본
  license_no?: string;        // 무자격 도메인(생활지원)은 생략 가능
  license_type?: string;      // 자격증 종류(상담 등 다종 자격 식별)
  license_issued_at?: string; // YYYY-MM-DD
  specialties?: string[];
  base_address: string;
}

export interface CaregiverRegisterResult {
  success: boolean;
  message: string;
  data?: {
    id: number;
    status: "pending" | "active" | "rejected";
    [key: string]: unknown;
  };
}

export const caregiverApi = {
  async register(payload: CaregiverRegisterPayload): Promise<CaregiverRegisterResult> {
    const { data } = await api.post<CaregiverRegisterResult>(
      "/v1/caregivers/register",
      payload
    );
    return data;
  },
};
