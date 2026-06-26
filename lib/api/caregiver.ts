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
  license_no: string;
  license_issued_at: string; // YYYY-MM-DD
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
