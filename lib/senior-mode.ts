import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 시니어 모드 — 큰 글씨·고대비 접근성 토글. localStorage에 지속.
 * 적용은 components/senior-mode-effect.tsx 가 <html>에 zoom + data-tone 으로 반영.
 */
interface SeniorModeState {
  on: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

export const useSeniorMode = create<SeniorModeState>()(
  persist(
    (set) => ({
      on: false,
      toggle: () => set((s) => ({ on: !s.on })),
      set: (v) => set({ on: v }),
    }),
    { name: "careand-senior-mode" },
  ),
);
