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

## Phase 2: 보호자 AI 케어일지 수신·열람 (횡단 신규)

> Spec: spec.md §7 (Spec delta, INV-6~8). `team_validation_mode: subagent`(Explore 2회로 contract 확정 + 아래 다관점 manual-pass).
> **소유권**: `[BE]`=careand-backend(claude2 읽기전용 → claude2가 patch 작성+review, **사용자가 careand-deploy backend로 반영**). `[FE]`=member-web(claude2 구현). admin-web은 기구현(작업 없음).
> 기능 대부분 기구현(일지 생성·저장·`GET ai-summary`·admin 검수). **실제 공백은 알림 발송 + 보호자 세션 열거 + member UI** 3가지.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 2.1 | **[BE]** 승인 시 보호자 알림 발송: `OperationsController::approveCareLog`에서 `NotificationService::notify(TYPE_CARE_SUMMARY_READY)` 호출(세션→match→request→guardian_id) | 승인 시 보호자 notification row + FCM 1건, 재승인 시 중복발송 없음 | - | cc:완료 |
| 2.2 | **[BE]** 보호자 세션목록 API `GET /v1/guardians/me/sessions`(인력 `caregivers/me/sessions` 미러). 항목: session_id, domain, status, review_status, has_summary, recipient_name, scheduled_at | 본인 매칭 세션만(권한 스코프), 페이징, 타역할 403 | - | cc:완료 |
| 2.3 | **[FE]** logs 목록 UI: 2.2 소비 → 세션별 일지 카드(상태: 작성중/검수중/도착), 도메인 배지, 빈상태 | matched 세션 렌더·`approved`만 "도착" 표기, 빈상태 정상, lint/type/build 통과 | 2.2 | cc:완료 |
| 2.4 | **[FE]** 일지 상세 UI: `GET /v1/care-sessions/{id}/ai-summary` → guardian_version + categorized(meal/exercise/vital/mood) 카드. medical_version 미노출(INV-7), 미생성/미승인 안내 | 승인 일지 본문 표시, 권한외 404 처리, INV-6/7 준수 | 2.2, 2.3 | cc:완료 |
| 2.5 | **[BE,opt]** `ProcessVoiceLogJob` 음성요약 완료 시 보호자 FCM(line84 TODO 구현) | 음성일지 처리완료 시 알림 1건 | - | cc:TODO |
| 2.6 | **[QA]** E2E 스모크: 인력 checkout→일지생성→admin 승인→보호자 알림→보호자 열람(데모계정, mutating 최소) | 풀루프 1회 PASS 기록, 권한경계(타보호자 404) 확인 | 2.1, 2.3, 2.4 | cc:완료 |
| 2.7 | **[BE]** 보안 게이트(패치중 발견): `getAiSummary`가 보호자에게 미검수 일지+`medical_version` 노출 → INV-6(approved만)·INV-7(medical 미노출) 백엔드 강제 | 보호자가 미승인 세션 ai-summary 호출 시 404, 응답에 medical_version 없음 | - | cc:완료 |

> **2026-06-15 Phase 2 end-to-end 라이브 완성**: BE(2.1/2.2/2.7) + FE(2.3/2.4 `careand-deploy member`, BUILD_ID GczOk…, 실데이터 모드) 전부 배포. 보호자 앱 `/app/logs` 200, smoke C1~C5 PASS. (잔여 minor: mock dead-code가 번들에 남음=무해, 추후 정리 가능. 2.5 음성FCM=opt 미구현.)
> **2026-06-15 배포·검증 완료(BE)**: 2.1·2.2·2.7 라이브 반영. 적용 중 **2.1/2.7이 한 번 되돌려진 사고**(`git checkout`로 미커밋 변경 유실 추정) → `carelog-2.1-2.7-redo.patch`로 재적용. E2E 스모크 **C1~C5 전부 PASS**(읽기+RUN_MUTATING 2런 합산): C1 세션목록 / C2 INV-7 medical 미노출(세션26) / C3 INV-6 미승인 404(세션25) / C4 INV-8 타보호자 403 / C5 승인→알림 0→1·재승인 무중복. **남은 것: FE(2.3/2.4) `careand-deploy member` 배포뿐.**

> **BE 패치 초안 작성 완료(2026-06-14, `/home/claude2/careand-backend-patches/`)**: 2.1(승인→알림)·2.2(GuardianController `guardians/me/sessions` 신규)·2.7(getAiSummary 보호자 게이트). `APPLY.md`에 exact old→new 블록+적용/검증/롤백. GuardianController.php `php -l` 통과. careand-backend 읽기전용이라 **사용자가 적용 후 `careand-deploy backend`**.
> **FE 2.3/2.4 구현 완료(2026-06-14, mock 선행)**: `lib/api/member.ts`(GuardianSession/AiSummary 타입 + guardianSessions/careSessionAiSummary), `lib/logs.ts`(상태배지/도메인/categorized 헬퍼 + mock), `app/(member)/logs/page.tsx`(목록 재작성), `app/(member)/logs/[id]/page.tsx`(상세 신규). lint/type-check/격리빌드 통과(`/logs`·`/logs/[id]` 컴파일). medical_version 미요청/미표시(INV-7), 미승인=백엔드 404 안내(INV-6). mock 미리보기=`NEXT_PUBLIC_ENABLE_LOG_MOCK=1`(라이브 기본 off).
> **리뷰 완료(reviewer 에이전트, 2026-06-14)**: INV-7 clean(medical_version 흔적 0). 반영한 수정 3건 — ① 상세 `Number(id)` 유효성 가드(`Number.isInteger && >0`, invalid 시 query disabled+안내) ② `careSessionAiSummary` 반환 `AiSummary|null`(null/204 안전) ③ "1시간 0분" 표기. 재검증 lint/type/build 통과.
> **⚠️ 배포 순서 제약(리뷰 최우선)**: `getAiSummary`가 아직 미게이트(2.7 TODO)라, **BE(2.2+2.7)를 FE보다 먼저 `careand-deploy backend` 한 뒤** FE를 `careand-deploy member`. FE를 먼저 올려도 목록은 비지만(2.2 404→안내), 상세 직접 URL 접근 시 게이트 전이라 미승인/medical 노출 가능 → 반드시 BE 선행.
> **실데이터 검증은 BE 배포 후** → 2.6 E2E(타보호자 404 포함).
> **2.6 E2E 스모크 스크립트 작성·검증 완료(`/home/claude2/careand-e2e/carelog-smoke.sh`)**: C1 세션목록·C2 INV-7(medical 미노출)·C3 INV-6(미승인 404)·C4 INV-8(타보호자 403/404)·C5 알림(RUN_MUTATING=1). 읽기위주, 데이터없으면 SKIP, 하어핀 `--resolve`. 드라이런 검증: 로그인 PASS, **C1이 현재 "BE 2.2 미배포 404" 정확 감지** → 배포 후 PASS 전환. `bash carelog-smoke.sh`(읽기) / `RUN_MUTATING=1 bash ...`(알림까지). 상태 cc:WIP(BE 배포 후 풀런 PASS 기록하면 완료).

> **다관점 검증(manual-pass) 요약**:
> - Product: 일지 생성~검수는 됐는데 보호자가 못 본다 = 가치 누수 메우는 기능. 우선순위 타당.
> - Architecture: 신규 표면 최소. 기존 `ai-summary` 엔드포인트·정책 재사용. 유일한 신규 BE 계약=세션목록 API(기존 caregiver 미러라 위험 낮음).
> - Security: INV-6(approved만)·INV-7(medical 미노출)·INV-8(기존 정책 스코프) 명시. 새 목록 API도 guardian 스코프 강제 → 타인 일지 누수 차단이 DoD.
> - QA: test 프레임워크 미도입 → 2.6 E2E 스모크를 수용 게이트로. FE는 Phase1 lint/type/build 게이트 통과 필수.
> - Skeptic: **최대 리스크=BE/FE 소유권 분리**. 2.3/2.4(FE)는 2.2(BE, 사용자 배포)에 막힘 → 2.2 없이는 FE가 mock로만 진행. 라이브 backend라 2.1/2.2는 review 필수.
