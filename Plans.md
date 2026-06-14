# Care& member-web Plans.md

작성일: 2026-06-14

> 태스크 정본(task ledger). 정답 조건은 `spec.md`(SSOT). 마커: `cc:TODO`→`cc:WIP`→`cc:완료`→`pm:확인済` / `blocked`.
> ※라이브 서비스. 구현 산출물은 `harness-review` 통과 + 사용자 확인 후 `careand-deploy member`(root)로만 배포.

---

## Phase 0: Harness 도입 (완료)

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 0.1 | harness.toml + .claude-plugin 생성, 안전규칙(sudo/careand-deploy deny) | `harness doctor` 전체 OK | - | cc:완료 |
| 0.2 | jq·rg 유저공간 설치, harness-mem 로컬 백엔드 기동 | `harness mem status` 동작(파일 메모리 훅 OK) | 0.1 | cc:완료 |
| 0.3 | spec.md(product SSOT) baseline 역설계 | spec.md에 정체성/계약/불변식/범위 기재 | 0.1 | cc:완료 |

## Phase 1: 품질 베이스라인 (실행 전 게이트) [tdd:skip:setup-task]

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | ESLint 베이스라인 설정(`next lint` 정상화, config 파일 커밋) | `npm run lint` 가 비대화형으로 exit 0/명확한 룰셋 | - | cc:완료 |
| 1.2 | 타입체크 게이트 확인 | `npm run type-check`(tsc --noEmit) 에러 0 | - | cc:완료 |
| 1.3 | 빌드 스모크 게이트 | `npm run build` 성공 + BUILD_ID 생성 | 1.1, 1.2 | cc:완료 |
| 1.4 | API base 잔재 점검 | 빌드 산출물에 `localhost:8000` 미참조(INV-3) | 1.3 | cc:완료 |

> 2026-06-14 결과: 1.2 통과(에러0) · 1.1 통과(eslint v9↔Next14 비호환 발견 → **eslint를 ^8.57.1로 핀**, `.eslintrc.json` 추가, lint 스크립트 `next lint` 유지) · 1.3 격리빌드 19라우트 컴파일 성공(라이브 .next 무영향) · 1.4 localhost:8000 0건.
> ⚠️ 변경분(package.json/package-lock/.eslintrc.json)은 **review 후 `careand-deploy member`(root)로 반영** 필요.

## Phase 2: 기능 계획 (placeholder)

> 구체 기능은 `/harness-plan create` 로 정의. product-impacting 추가 시 spec.md delta 동반.
> 후보(미확정): 역할별 라우트 표시항목 정합성 점검, 알림/일정 UX, 정산 화면 등 — 사용자 우선순위 입력 대기.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 2.x | (사용자 정의 대기) | - | Phase 1 | cc:TODO |
