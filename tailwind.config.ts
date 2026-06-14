import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== Care& Brand · Coral =====
        brand: {
          50: "#FFF1EF",
          100: "#FFE3DE",
          200: "#FFC8C0",
          300: "#FFA89D",
          400: "#FF8175",
          500: "#FF5A4D", // Primary
          600: "#ED4133",
          700: "#C72E22",
          800: "#9E251B",
          900: "#6E1812",
          DEFAULT: "#FF5A4D",
        },
        // ===== Care& Neutral (Ink / cool gray) =====
        warm: {
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
        },
        // ===== Semantic =====
        danger: {
          DEFAULT: "#EF4444",
          bg: "#FEF2F2",
        },
        warn: {
          DEFAULT: "#F59E0B",
          bg: "#FFFBEB",
        },
        info: {
          DEFAULT: "#3B82F6",
          bg: "#EFF6FF",
        },
        // ===== shadcn/ui 호환 =====
        background: "#F6F7F9",
        foreground: "#1C2030",
        primary: {
          DEFAULT: "#FF5A4D",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#EFF1F4",
          foreground: "#1C2030",
        },
        muted: {
          DEFAULT: "#EFF1F4",
          foreground: "#5B6172",
        },
        accent: {
          DEFAULT: "#FFE3DE",
          foreground: "#C72E22",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#E3E6EB",
        input: "#E3E6EB",
        ring: "#FF5A4D",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C2030",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C2030",
        },
      },
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
      fontSize: {
        xs: ["11px", "16px"],
        sm: ["13px", "20px"],
        base: ["15px", "24px"],
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
        md: "0 4px 16px rgba(255,90,77,0.10)",
        lg: "0 12px 40px rgba(255,90,77,0.15)",
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
