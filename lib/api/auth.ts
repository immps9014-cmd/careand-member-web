import { api } from "./client";
import { User } from "@/lib/auth/store";

interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface SignupPayload {
  email: string;
  phone: string;
  phone_verify_token: string;
  name: string;
  password: string;
  password_confirmation: string;
  role: "guardian" | "caregiver" | "organization";
  /** 보호자 가입 의도: care=보호자, housekeeping=가사요청자 (백엔드에서 guardian으로 가입) */
  intent?: "care" | "housekeeping";
  /** 보호자 전용: 어르신과의 관계 (백엔드 required_if: care 보호자) */
  relation?: string;
  agree_terms: boolean;
  agree_privacy: boolean;
}

export const authApi = {
  /**
   * 로그인
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/v1/auth/login", {
      email,
      password,
    });
    return data;
  },

  /**
   * 휴대폰 인증번호(OTP) 발송
   */
  async sendOtp(phone: string): Promise<{ success: boolean; expires_in_sec: number }> {
    const { data } = await api.post("/v1/auth/otp/send", { phone });
    return data;
  },

  /**
   * OTP 검증 → 회원가입용 임시 토큰 발급
   */
  async verifyOtp(phone: string, code: string): Promise<{ phone_verify_token: string }> {
    const { data } = await api.post("/v1/auth/otp/verify", { phone, code });
    return data;
  },

  /**
   * 회원가입 (보호자 / 돌봄전문가)
   * - 돌봄전문가(caregiver)은 가입 후 별도 자격정보 등록(caregiverApi.register)이 필요
   */
  async signup(payload: SignupPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/v1/auth/signup", payload);
    return data;
  },

  /**
   * 내 정보 조회
   */
  async me(): Promise<{ user: User }> {
    const { data } = await api.get<{ success: boolean; user: User }>(
      "/v1/auth/me"
    );
    return { user: data.user };
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    await api.post("/v1/auth/logout").catch(() => {
      // 서버 오류 시에도 클라이언트 토큰은 삭제
    });
  },
};
