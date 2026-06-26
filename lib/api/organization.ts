import { api } from "./client";

/**
 * 기관(에이전시) 회원 정보 등록
 * - 회원가입(role=organization) 후 인증된 상태에서 호출
 * - 백엔드: POST /v1/organizations/register (RegisterOrganizationRequest)
 *   · organizations row(사업자 정보, status=pending) + guardian(요청자) 프로필 동시 생성
 *   · 기관은 보호자와 동일한 매칭 흐름으로 "간병인을 구하는 요청"을 발주한다
 */
export interface OrganizationRegisterPayload {
  biz_no: string;          // 사업자등록번호
  name: string;            // 기관명
  representative: string;  // 대표자
  contact_phone: string;   // 기관 연락처
  address?: string;
  biz_type?: string;       // 업종 (예: 방문요양)
  certifications?: string[];
}

export interface OrganizationRegisterResult {
  success: boolean;
  message: string;
  data?: {
    id: number;
    status: "pending" | "active" | "rejected";
  };
}

export interface OrganizationProfile {
  id: number;
  name: string;
  biz_no: string;
  representative: string | null;
  contact_phone: string | null;
  biz_type: string | null;
  address: string | null;
  status: "pending" | "active" | "rejected";
}

export const organizationApi = {
  async register(payload: OrganizationRegisterPayload): Promise<OrganizationRegisterResult> {
    const { data } = await api.post<OrganizationRegisterResult>(
      "/v1/organizations/register",
      payload
    );
    return data;
  },

  /** 내 기관 정보 + 승인 상태 (GET /v1/organizations/me) */
  async me(): Promise<OrganizationProfile | null> {
    const { data } = await api.get<{ success: boolean; data: OrganizationProfile }>(
      "/v1/organizations/me"
    );
    return data.data ?? null;
  },

  /** 소속 간병인 명단 + 대기 초대 (GET /v1/organizations/me/caregivers) */
  async roster(): Promise<{ members: OrgCaregiver[]; pending_invites: OrgInvite[] }> {
    const { data } = await api.get<{ success: boolean; data: { members: OrgCaregiver[]; pending_invites: OrgInvite[] } }>(
      "/v1/organizations/me/caregivers"
    );
    return data.data ?? { members: [], pending_invites: [] };
  },

  /** 전화번호로 간병인 초대/연결 (POST .../caregivers/invite) */
  async inviteCaregiver(phone: string): Promise<{ success: boolean; message: string; data?: { linked: boolean; invited?: boolean; invite_link?: string } }> {
    const { data } = await api.post("/v1/organizations/me/caregivers/invite", { phone });
    return data;
  },

  /** 소속 해제 (DELETE .../caregivers/{id}) */
  removeCaregiver: (caregiverId: number) => api.delete(`/v1/organizations/me/caregivers/${caregiverId}`),

  /** 대기 초대 취소 (DELETE .../invites/{id}) */
  cancelInvite: (inviteId: number) => api.delete(`/v1/organizations/me/invites/${inviteId}`),
};

export interface OrgCaregiver {
  caregiver_id: number;
  name: string | null;
  phone: string | null;
  service_domains: string | null;
  status: string;
}

export interface OrgInvite {
  invite_id: number;
  phone: string;
  invited_at: string;
}
