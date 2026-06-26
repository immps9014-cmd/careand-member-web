// SSOT: Care& 디자인 색 팔레트 (단일 출처)
// Tailwind(className 토큰)와 인라인 스타일(보호자/기관 셸)이 모두 이 파일을 참조한다.
// 색을 바꾸려면 여기 한 곳만 고치면 className·인라인 양쪽에 동시 반영된다.
//
// 배경: 이전에는 tailwind.config 의 hex 와 home/layout 의 인라인 hex(CORAL 등)가
// 따로 복제돼 있어, 06-24 퍼플→emerald 교체 때 두 곳을 각각 수정해야 했다(drift).
// 이제 tailwind.config 는 tailwindColors 를, 인라인은 UI 를 import 하여 출처가 하나다.
//
// ⚠️ 이 파일은 tailwind.config.ts 가 import 하므로 React/클라이언트 코드를 넣지 말 것
//    (순수 데이터만 — 빌드 시 Tailwind 로더가 평가한다).

export const brand = {
  50: "#ECFDF5",
  100: "#D1FAE5",
  200: "#A7F3D0",
  300: "#6EE7B7",
  400: "#34D399",
  500: "#10B981", // Primary
  600: "#059669",
  700: "#047857",
  800: "#065F46",
  900: "#064E3B",
  DEFAULT: "#10B981",
} as const;

export const warm = {
  50: "#F6F7F9",
  100: "#EFF1F4",
  200: "#E3E6EB",
  300: "#CBD0D8",
  400: "#9AA0AD",
  500: "#5B6172",
  600: "#434A5A",
  700: "#2E3342",
  800: "#1C2030",
  900: "#0E111A",
} as const;

/** Tailwind theme.extend.colors 에 그대로 주입 (className 토큰의 출처) */
export const tailwindColors = {
  brand,
  warm,
  danger: { DEFAULT: "#EF4444", bg: "#FEF2F2" },
  warn: { DEFAULT: "#F59E0B", bg: "#FFFBEB" },
  info: { DEFAULT: "#3B82F6", bg: "#EFF6FF" },
  // shadcn/ui 호환 (값은 위 스케일 재사용)
  background: warm[50],
  foreground: warm[800],
  primary: { DEFAULT: brand.DEFAULT, foreground: "#FFFFFF" },
  secondary: { DEFAULT: warm[100], foreground: warm[800] },
  muted: { DEFAULT: warm[100], foreground: warm[500] },
  accent: { DEFAULT: brand[100], foreground: brand[700] },
  destructive: { DEFAULT: "#EF4444", foreground: "#FFFFFF" },
  border: warm[200],
  input: warm[200],
  ring: brand.DEFAULT,
  card: { DEFAULT: "#FFFFFF", foreground: warm[800] },
  popover: { DEFAULT: "#FFFFFF", foreground: warm[800] },
};

/**
 * 보호자/기관 셸 인라인 스타일용 시맨틱 별칭.
 * className 을 못 쓰는 인라인 style={{}} 전용. 값은 위 토큰과 동일.
 * (구 상수명 매핑: accent=CORAL, accentSoft=CORAL2, ink=INK, ink2=INK2, ink3=INK3, line=LINE, bg=BG)
 */
export const UI = {
  accent: brand[500],
  accentSoft: brand[400],
  ink: warm[800],
  ink2: warm[500],
  ink3: warm[400],
  line: warm[100],
  bg: warm[50],
} as const;
