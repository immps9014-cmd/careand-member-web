/** 카카오·구글 첫 가입 시 복귀 페이지 → 가입 화면으로 넘기는 sessionStorage 키 (S4) */
export const SOCIAL_SIGNUP_KEY = "caren-social-signup";

export interface SocialSignup {
  social_token: string;
  profile: { provider: string; name: string | null; email: string | null };
}
