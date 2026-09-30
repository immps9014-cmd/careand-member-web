import type { Config } from "tailwindcss";
import { tailwindColors } from "./lib/theme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // 색 토큰 출처 = lib/theme.ts (인라인 스타일과 단일 SSOT 공유)
      colors: tailwindColors,
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
        mono: ["Plus Jakarta Sans", "ui-monospace", "monospace"],
      },
      // 고령 사용자 기준 최소 12px · 본문 16px (2026-09-30 재검증 CAREN-AUD-01)
      fontSize: {
        xs: ["12px", "17px"],
        sm: ["14px", "21px"],
        base: ["16px", "25px"],
        lg: ["17px", "26px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "36px"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(28,32,48,0.04), 0 1px 2px rgba(28,32,48,0.04)",
        card: "0 1px 3px rgba(28,32,48,0.04), 0 4px 16px rgba(28,32,48,0.06)",
        md: "0 4px 16px rgba(213,96,62,0.10)",
        lg: "0 12px 40px rgba(213,96,62,0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
