"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ChevronLeft, MapPin, AlertTriangle, Activity, Heart, Droplet, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { careGradeLabel, HEALTH_METRICS, severityVariant } from "@/lib/care";

export default function SeniorDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const seniorId = Number(id);
  const router = useRouter();
  const [metricKey, setMetricKey] = useState("bp_sys");
  const metric = HEALTH_METRICS.find((m) => m.key === metricKey)!;

  const senior = useQuery({ queryKey: ["member", "senior", seniorId], queryFn: () => memberApi.seniorDetail(seniorId) });
  const vitals = useQuery({ queryKey: ["member", "senior", seniorId, "vitals"], queryFn: () => memberApi.vitals(seniorId, "30d") });
  const alerts = useQuery({ queryKey: ["member", "senior", seniorId, "alerts"], queryFn: () => memberApi.seniorAlerts(seniorId) });
  const series = useQuery({
    queryKey: ["member", "senior", seniorId, "ts", metricKey],
    queryFn: () => memberApi.healthTimeseries(seniorId, metricKey, 14),
  });

  const s = senior.data;
  const chartData = (series.data ?? []).map((p) => ({
    t: new Date(p.recorded_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
    value: p.value,
  }));

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      {senior.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}

      {s && (
        <>
          {/* 프로필 */}
          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-extrabold text-warm-800">{s.name}</h1>
              <Badge variant="success">{careGradeLabel(s.care_grade)}</Badge>
            </div>
            <div className="text-sm text-warm-600 mb-2">
              {s.age ? `${s.age}세` : "나이 미상"} · {s.gender === "F" ? "여성" : "남성"}
              {s.care_grade_no && <span className="text-warm-500"> · {s.care_grade_no}</span>}
            </div>
            {s.home_address && (
              <div className="flex items-start gap-2 text-xs text-warm-500 mb-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{s.home_address}</span>
              </div>
            )}
            {s.diseases && s.diseases.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {s.diseases.map((d) => (
                  <Badge key={d} variant="outline">{d}</Badge>
                ))}
              </div>
            )}
            {s.special_notes && (
              <p className="text-xs text-warm-500 mt-3 bg-warm-50 rounded-md p-2.5 leading-relaxed">{s.special_notes}</p>
            )}
            {s.current_voucher?.remaining_amount !== undefined && (
              <div className="mt-3 pt-3 border-t border-warm-100 flex items-center justify-between text-sm">
                <span className="text-warm-500">이번 달 바우처 잔액</span>
                <span className="font-bold text-brand-600 font-en">
                  {new Intl.NumberFormat("ko-KR").format(s.current_voucher.remaining_amount)}원
                </span>
              </div>
            )}
          </Card>

          {/* 이상징후 알림 */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-warm-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-danger" /> 이상징후
            </h2>
            {(alerts.data?.unresolved ?? 0) > 0 && (
              <Badge variant="danger">미해결 {alerts.data?.unresolved}건</Badge>
            )}
          </div>
          {alerts.data && alerts.data.data.length === 0 && (
            <Card className="p-5 text-center text-warm-500 text-sm mb-5">감지된 이상징후가 없습니다</Card>
          )}
          <div className="space-y-2 mb-5">
            {alerts.data?.data.slice(0, 5).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-warm-800">{a.risk_type_ko}</span>
                    <Badge variant={severityVariant(a.severity)}>{a.severity_ko}</Badge>
                  </div>
                  <span className="text-[11px] text-warm-500">{a.detected_ago}</span>
                </div>
                {a.recommendation && <p className="text-xs text-warm-500 leading-relaxed">{a.recommendation}</p>}
                <div className="mt-1.5 text-[11px] text-warm-500">
                  위험도 {(a.risk_score * 100).toFixed(0)}% · {a.status_ko}
                </div>
              </Card>
            ))}
          </div>

          {/* 바이탈 요약 */}
          <h2 className="font-bold text-warm-700 mb-2">최근 30일 바이탈</h2>
          {vitals.data && (
            <div className="grid grid-cols-3 gap-2 mb-5">
              <VitalStat icon={<Activity className="w-4 h-4" />} label="평균 혈압"
                value={vitals.data.summary?.avg_bp_sys ? `${Math.round(vitals.data.summary.avg_bp_sys)}/${Math.round(vitals.data.summary.avg_bp_dia)}` : "-"} unit="mmHg" />
              <VitalStat icon={<Droplet className="w-4 h-4" />} label="평균 혈당"
                value={vitals.data.summary?.avg_blood_sugar ? Math.round(vitals.data.summary.avg_blood_sugar).toString() : "-"} unit="mg/dL" />
              <VitalStat icon={<Heart className="w-4 h-4" />} label="평균 심박"
                value={vitals.data.summary?.avg_heart_rate ? Math.round(vitals.data.summary.avg_heart_rate).toString() : "-"} unit="bpm" />
            </div>
          )}

          {/* 시계열 차트 */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
              {HEALTH_METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetricKey(m.key)}
                  className={
                    "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors " +
                    (m.key === metricKey ? "bg-brand-500 text-white" : "bg-warm-100 text-warm-500")
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-bold text-warm-700">{metric.label}</span>
              <span className="text-[11px] text-warm-500">최근 14일 · {metric.unit}</span>
            </div>
            {series.isLoading ? (
              <p className="text-center text-warm-500 py-12 text-sm">불러오는 중…</p>
            ) : chartData.length === 0 ? (
              <p className="text-center text-warm-500 py-12 text-sm">측정 데이터가 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4EFE6" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9A917F" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9A917F" }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E0D2" }}
                    labelStyle={{ color: "#6E6757" }}
                    formatter={(v: number) => [`${v} ${metric.unit}`, metric.label]}
                  />
                  <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2}
                    dot={{ r: 2.5, fill: metric.color }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* 최근 측정 기록 */}
          {vitals.data && vitals.data.data.length > 0 && (
            <>
              <h2 className="font-bold text-warm-700 mb-2">측정 기록</h2>
              <div className="space-y-2">
                {vitals.data.data.slice(0, 8).map((v) => (
                  <Card key={v.id} className="p-3 flex items-center justify-between text-sm">
                    <span className="text-warm-500 text-xs">
                      {v.measured_at ? new Date(v.measured_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </span>
                    <div className="flex items-center gap-3 text-warm-700">
                      {v.blood_pressure && <span className="font-en">{v.blood_pressure}</span>}
                      {v.blood_sugar && <span className="font-en text-warn">{v.blood_sugar}</span>}
                      {v.heart_rate && <span className="font-en text-info">{v.heart_rate}♥</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* 매칭 요청 진입 — basePath(/app) 자동 적용 위해 next/link 사용, 이 돌봄대상 자동 선택 */}
          <Link href={`/request/new?domain=senior&senior_id=${id}`} className="block mt-5">
            <Card className="p-4 flex items-center justify-between active:bg-warm-50 transition-colors">
              <span className="font-semibold text-warm-700 text-sm">이 돌봄대상 매칭 요청</span>
              <ChevronRight className="w-5 h-5 text-warm-500" />
            </Card>
          </Link>
        </>
      )}
    </div>
  );
}

function VitalStat({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <Card className="p-3 text-center">
      <div className="flex justify-center text-brand-400 mb-1">{icon}</div>
      <div className="text-base font-extrabold text-warm-800 font-en leading-none">{value}</div>
      <div className="text-[10px] text-warm-500 mt-1">{label}</div>
      <div className="text-[9px] text-warm-500">{unit}</div>
    </Card>
  );
}
