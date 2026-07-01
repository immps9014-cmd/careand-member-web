## 개요

케어네이션(CareNation) 벤치마크 기반, 회원 신청(매칭 요청) 플로우 UX·컴플라이언스 개선 (P0 전체 + P1 일부).

## 변경 내용

### P0 — 신청 위저드 · 컴플라이언스 · 스크리닝 (`6fac6d0`)
- **3스텝 위저드화**: `request/new` 단일 스크롤 폼 → (1) 대상·서비스 (2) 일정·상세 (3) 확인·동의. 재사용 `StepIndicator`(①②③), 완료 스텝 클릭 복귀.
- **컴플라이언스 고지 + 필수 동의**: 직거래 금지·노쇼 위약금·상태 고지 의무·플랫폼 결제. 미동의 시 제출 차단.
- **서비스 안내(제공/미제공 범위)** + **이용 불가 대상 스크리닝 게이트**: 필수 확인 전 STEP1 진행 차단, 도메인 변경 시 재확인. (`ServiceGuide` + `serviceGuides` 데이터)
- 부가: STEP2 종료시각 실시간 안내.

### 벤치마크 문서 (`19fba9d`)
- `sample_app/BENCHMARK-CARENATION.md`, `sample_app/GAP-ANALYSIS-ROADMAP.md` (원본 스크린샷 `.jpg`는 gitignore 제외).

### P1 — 세부 항목 멀티셀렉트 · 주소검색 (`b4d8896`)
- **세부 서비스 항목 멀티셀렉트**(도메인별 칩) → `requirements.service_items` 전달, STEP3 요약 반영. senior 페이로드도 통일(`preferred_caregiver_id`/`service_items` 누락 수정).
- **Daum 우편번호 검색** 연동: postpartum/children/mental 등록 폼 (재사용 `AddressSearch`).

## 검증
- `tsc --noEmit` 0 · `next lint` clean · `next build` 성공
- 헤드리스 E2E **21/21 PASS** (실백엔드 + 데모 guardian 계정, 위저드 전 구간·게이트·요약 반영)

## 후속(백엔드 선행 필요)
- **P1-1 견적 가중**: `service_items`는 현재 저장·전달만 — PricingService 가중 반영 필요.
- **P1-2 반복요일**: 백엔드 recurrence가 연속일 카운트(`recurrence_rule.days`)만 지원 → 요일 기반 세션 생성 추가 필요.

## 주의
- `lib/serviceGuides.ts`의 제공/미제공/이용불가 카피는 **기준안** — 배포 전 운영·법무 검수 필요.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
