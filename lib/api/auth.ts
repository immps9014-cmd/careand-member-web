import { api } from "./client";
import { detachPushFromServer } from "../push";
import { User } from "@/lib/auth/store";

interface LoginResponse {
  user: User;
  /** 쿠키 모드(X-Auth-Mode: cookie)에선 본문에 없다 — httpOnly 쿠키로 받는다 */
  access_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface SignupPayload {
  email: string;
  phone: string;
  phone_verify_token: string;
  name: string;
  /** 소셜 가입(social_token)이면 생략 */
  password?: string;
  password_confirmation?: string;
  /** 카카오·구글 첫 가입 토큰(30분) — 비밀번호 없이 가입하고 소셜 계정 연결 (S4) */
  social_token?: string;
  role: "guardian" | "caregiver" | "organization";
  /** 보호자 가입 의도: care=보호자, housekeeping=가사, postpartum=산모, childcare=아이돌봄, mental_care=마음돌봄 (백엔드에서 guardian으로 가입) */
  intent?: "care" | "housekeeping" | "postpartum" | "childcare" | "mental_care";
  /** 보호자 전용: 돌봄대상과의 관계 (백엔드 required_if: care 보호자) */
  relation?: string;
  /** 요청자 전용: 주로 이용할 서비스(복수, 선택 순서) — senior|living_support|postpartum|childcare|mental_care */
  services?: string[];
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

  /** 아이디 찾기 — 휴대폰 인증 토큰으로 가려진 아이디(이메일)를 받는다. 토큰은 소모되지 않는다. */
  async findId(phone: string, phoneVerifyToken: string): Promise<{ masked_email: string; has_password: boolean; created_at: string | null }> {
    const { data } = await api.post("/v1/auth/find-id", { phone, phone_verify_token: phoneVerifyToken });
    return data;
  },

  /** 비밀번호 재설정 — 휴대폰 인증 토큰(1회용) + 새 비밀번호 */
  async resetPassword(phone: string, phoneVerifyToken: string, password: string, passwordConfirmation: string): Promise<{ message: string; masked_email: string }> {
    const { data } = await api.post("/v1/auth/reset-password", {
      phone, phone_verify_token: phoneVerifyToken, password, password_confirmation: passwordConfirmation,
    });
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

  /** 쓸 수 있는 소셜 로그인(앱 키가 등록된 것만 true) — S4 */
  async oauthProviders(): Promise<Record<"kakao" | "google", boolean>> {
    const { data } = await api.get("/v1/auth/oauth/providers");
    return data.data;
  },
  /** 카카오·구글 동의 화면 주소(일회용 state 포함) */
  async oauthUrl(provider: "kakao" | "google"): Promise<string> {
    const { data } = await api.get(`/v1/auth/oauth/${provider}/url`);
    return data.data.url;
  },
  /** 동의 후 복귀 — 로그인 토큰 또는 첫 가입(signup_required + social_token) */
  async oauthCallback(provider: "kakao" | "google", code: string, state: string): Promise<
    | (LoginResponse & { signup_required?: false })
    | { signup_required: true; social_token: string; profile: { provider: string; name: string | null; email: string | null } }
  > {
    const { data } = await api.post(`/v1/auth/oauth/${provider}/callback`, { code, state });
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
   * 계정 정보 수정 (이름·연락처·이메일·비밀번호)
   * - 비밀번호 변경 시 current_password 필수, password_confirmation 동봉
   */
  async updateMe(payload: {
    name?: string;
    phone?: string;
    email?: string;
    current_password?: string;
    password?: string;
    password_confirmation?: string;
  }): Promise<{ user: User }> {
    const { data } = await api.patch<{ success: boolean; user: User }>("/v1/auth/me", payload);
    return { user: data.user };
  },

  /**
   * 회원 탈퇴 — 현재 비밀번호 확인 필수. 성공 시 서버에서 계정 소프트삭제·토큰 무효화.
   */
  async withdraw(payload: { current_password: string; reason?: string }): Promise<void> {
    await api.delete("/v1/auth/me", { data: payload });
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    await detachPushFromServer();   // 토큰이 살아 있을 때 이 기기 푸시 등록부터 푼다
    await api.post("/v1/auth/logout").catch(() => {
      // 서버 오류 시에도 클라이언트 토큰은 삭제
    });
  },
};
