import { Check } from "lucide-react";
import { MATCH_STAGES, matchStageIndex, terminatedLabel, type MatchStageInput } from "@/lib/matchStage";

const GREEN = "#1F9D63";
const GREEN_SOFT = "#E7F7EF";
const LINE = "#E7E1D8";
const INK3 = "#9A9186";
const INK = "#2B2620";

/**
 * 매칭요청 진행 파이프라인(가로 스텝퍼).
 * 매칭요청 → 매칭완료 → 결제완료 → 케어시작 → 케어완료
 *
 * - size="sm": 카드 내 임베드용(홈 요청/제안 카드)
 * - size="md": 상세 화면 상단용
 */
export function ProgressPipeline({
  requestStatus,
  paymentStatus,
  matchStatus,
  size = "sm",
}: MatchStageInput & { size?: "sm" | "md" }) {
  const ended = terminatedLabel(requestStatus, matchStatus);
  if (ended) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: size === "md" ? "10px 0" : "2px 0" }}>
        <span style={{ fontSize: size === "md" ? 13 : 12, fontWeight: 800, color: INK3, background: LINE, borderRadius: 6, padding: "3px 9px" }}>
          {ended}
        </span>
      </div>
    );
  }

  const current = matchStageIndex({ requestStatus, paymentStatus, matchStatus });
  const dot = size === "md" ? 22 : 16;
  const labelSize = size === "md" ? 13 : 12;   // 고령 사용자 최소 12px(09-30)
  const connectTop = dot / 2 - 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {MATCH_STAGES.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const reached = i <= current;
        return (
          <div key={label} style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
            {/* 좌측 연결선 (첫 노드 제외) */}
            {i > 0 && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: connectTop,
                  right: "50%",
                  width: "100%",
                  height: 2,
                  background: reached ? GREEN : LINE,
                }}
              />
            )}
            {/* 노드 */}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                width: dot,
                height: dot,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: done ? GREEN : active ? "#fff" : "#fff",
                border: `2px solid ${reached ? GREEN : LINE}`,
                boxShadow: active ? `0 0 0 3px ${GREEN_SOFT}` : "none",
              }}
            >
              {done ? (
                <Check size={dot * 0.6} color="#fff" strokeWidth={3} />
              ) : (
                <span style={{ width: dot * 0.34, height: dot * 0.34, borderRadius: "50%", background: active ? GREEN : LINE }} />
              )}
            </span>
            {/* 라벨 */}
            <span
              style={{
                marginTop: 5,
                fontSize: labelSize,
                fontWeight: reached ? 800 : 600,
                color: active ? GREEN : reached ? INK : INK3,
                textAlign: "center",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
