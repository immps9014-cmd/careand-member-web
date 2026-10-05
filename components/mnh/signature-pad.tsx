"use client";

// 손글씨 서명 패드 — 포인터 이벤트(손가락·펜·마우스), 고해상도 화면 대응, 투명 배경 PNG(data URL)로 내보낸다.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string | null;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, { label?: string; onChange?: (empty: boolean) => void }>(
  function SignaturePad({ label = "서명", onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const strokes = useRef(0);
    const [empty, setEmpty] = useState(true);

    const setup = useCallback(() => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1c1b19";
      strokes.current = 0;
      setEmpty(true);
      onChange?.(true);
    }, [onChange]);

    useEffect(() => {
      setup();
      // 화면 회전 등으로 크기가 바뀌면 다시 그려야 한다(내용은 지워짐)
      const onResize = () => setup();
      window.addEventListener("orientationchange", onResize);
      return () => window.removeEventListener("orientationchange", onResize);
    }, [setup]);

    const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    useImperativeHandle(ref, () => ({
      isEmpty: () => strokes.current < 1,
      clear: setup,
      toDataURL: () => (strokes.current < 1 || !canvasRef.current ? null : canvasRef.current.toDataURL("image/png")),
    }));

    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[14px] font-bold text-warm-700">{label}</span>
          <button type="button" onClick={setup} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-warm-500">
            <Eraser className="h-4 w-4" />지우기
          </button>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            aria-label={`${label} 입력 칸 — 손가락이나 펜으로 서명하세요`}
            role="img"
            className="block h-44 w-full touch-none rounded-xl border-2 border-dashed border-warm-300 bg-white"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              last.current = pos(e);
              const ctx = e.currentTarget.getContext("2d")!;
              ctx.beginPath();
              ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
              ctx.fillStyle = "#1c1b19";
              ctx.fill();
            }}
            onPointerMove={(e) => {
              if (!drawing.current || !last.current) return;
              const p = pos(e);
              const ctx = e.currentTarget.getContext("2d")!;
              ctx.beginPath();
              ctx.moveTo(last.current.x, last.current.y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
              last.current = p;
            }}
            onPointerUp={() => {
              if (!drawing.current) return;
              drawing.current = false;
              strokes.current += 1;
              if (empty) { setEmpty(false); onChange?.(false); }
            }}
            onPointerCancel={() => { drawing.current = false; }}
          />
          {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[14px] text-warm-400">여기에 서명해 주세요</span>}
        </div>
      </div>
    );
  },
);
