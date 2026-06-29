import { useQuery } from "@tanstack/react-query";
import {
  HeartPulse,
  Stethoscope,
  Sparkles,
  Baby,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { api } from "./api/client";

/**
 * 서비스 도메인 레지스트리(SSOT) 소비 — 백엔드 GET /v1/matching/service-domains.
 * 도메인 카드/대상선택기/카테고리를 이 메타데이터로 렌더한다.
 * 도메인 추가 = 백엔드 config/service_domains.php 1항목 + 카테고리 시드 (FE 변경 불필요).
 * 설계서: /root/CAREAND-DOMAIN-INTEGRATION.md
 */

export type DomainPicker =
  | "senior"
  | "patient"
  | "address"
  | "postpartum"
  | "child"
  | "mental_client";

export interface ServiceDomainCategory {
  id: number;
  code?: string;
  name: string;
  base_rate?: number;
}

export interface ServiceDomainMeta {
  token: string;
  label: string;
  desc: string;
  icon: string;
  picker: DomainPicker | null;
  categories: ServiceDomainCategory[];
}

const ICONS: Record<string, LucideIcon> = {
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  baby: Baby,
  "heart-handshake": HeartHandshake,
};

export const domainIcon = (name: string): LucideIcon => ICONS[name] ?? HeartPulse;

/**
 * 정적 폴백 — API 로드 전 첫 페인트용. 백엔드 활성 도메인(Phase 0)과 동일.
 * 백엔드 응답이 도착하면 그 값으로 대체된다(서버측 역할 필터가 정답).
 */
export const FALLBACK_DOMAINS: ServiceDomainMeta[] = [
  { token: "senior", label: "요양보호", desc: "어르신 방문", icon: "heart-pulse", picker: "senior", categories: [] },
  { token: "nursing", label: "병원 간병", desc: "입원 환자", icon: "stethoscope", picker: "patient", categories: [] },
  { token: "living_support", label: "생활지원서비스", desc: "청소·정리·동행", icon: "sparkles", picker: "address", categories: [] },
];

export function useServiceDomains() {
  return useQuery({
    queryKey: ["member", "service-domains"],
    queryFn: async (): Promise<ServiceDomainMeta[]> => {
      const { data } = await api.get("/v1/matching/service-domains");
      return (data.data ?? []) as ServiceDomainMeta[];
    },
    staleTime: 5 * 60_000,
  });
}
