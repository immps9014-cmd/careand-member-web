import { api } from "./client";

/* 영역별 안내 콘텐츠·FAQ·지역 공지(CAREN-REF-01 3단계, 2026-10-10) — 관리자가 고치고 웹·앱이 같은 API 로 읽는다. */

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[]; role?: string }
  | { type: "note"; text: string; tone?: "info" | "warn" }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "link"; label: string; href: string };

export interface DomainContent {
  id: number;
  kind: "guide" | "faq" | "notice";
  placement: string;
  domain: string | null;
  audience: string;
  platform: string;
  /** null = 전국 */
  regions: string[] | null;
  title: string;
  blocks: ContentBlock[];
  tone: "info" | "warn";
  sort: number;
  starts_on: string | null;
  ends_on: string | null;
  reviewed: boolean;
  updated_at: string | null;
}

export interface ContentQuery {
  placement?: string;
  kind?: string;
  domain?: string;
  audience?: "guardian" | "caregiver";
  region?: string;
}

export const contentsApi = {
  /** 게시 중인 것만(공개) — 웹 화면은 platform=web 으로 */
  async list(q: ContentQuery): Promise<DomainContent[]> {
    const { data } = await api.get("/v1/public/contents", { params: { ...q, platform: "web" } });
    return data.data ?? [];
  },
  /** 내 지역(산모 지역·돌봄 주소 시·도) 공지 + 전국 공지 */
  async myNotices(): Promise<DomainContent[]> {
    const { data } = await api.get("/v1/contents/my-notices", { params: { platform: "web" } });
    return data.data ?? [];
  },
};

/** service_scope 블록 → 제공/미제공/이용 불가 목록 */
export function scopeFrom(c: DomainContent | undefined): { provided: string[]; notProvided: string[]; ineligible: string[] } | null {
  if (!c) return null;
  const pick = (role: string) => c.blocks.flatMap((b) => (b.type === "list" && b.role === role ? b.items : []));
  const s = { provided: pick("provided"), notProvided: pick("not_provided"), ineligible: pick("ineligible") };
  return s.provided.length || s.notProvided.length || s.ineligible.length ? s : null;
}

/** FAQ — 관리자 게시본이 있으면 그것, 없거나 못 받으면 코드에 둔 기준 목록(fallback) */
export type FaqItem = { key: string; q: string; blocks: ContentBlock[] };
export function faqFrom(rows: DomainContent[] | undefined, fallback: { q: string; a: string }[]): FaqItem[] {
  const live = (rows ?? []).filter((c) => c.kind === "faq");
  return live.length
    ? live.map((c) => ({ key: String(c.id), q: c.title, blocks: c.blocks }))
    : fallback.map((f) => ({ key: f.q, q: f.q, blocks: [{ type: "p", text: f.a }] }));
}
