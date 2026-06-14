# Care& member-web — Product Spec (SSOT)

> Product contract. 우선순위: **spec.md > sub-spec > Plans.md**. 구현이 흔들릴 때 Plans.md 작성 전 이 문서를 먼저 갱신한다.
> 작성: 2026-06-14 (현 라이브 상태에서 역설계한 baseline)

## 1. 정체성
- **무엇**: Care& 돌봄 플랫폼의 회원용(보호자·요양보호사) 모바일 우선 웹.
- **누구**: `guardian`(보호자/가족), `caregiver`(요양보호사). 역할로 화면·데이터가 분기.
- **배포면**: `https://careand.aiclaude.kr/app` (Next.js `basePath:"/app"`). ※라이브 서비스.

## 2. 기술 계약
- Next.js 14 App Router + TypeScript(`strict:true`) + Tailwind + TanStack Query.
- 디자인 시스템: Sage Green × Warm Beige + Pretendard, 모바일 우선.
- 백엔드 API: `NEXT_PUBLIC_API_URL`(=`https://careand.aiclaude.kr`) 기준 `/api/v1/*`. backend 레포는 별도(careand-backend, root 소유 읽기전용).
- 인증: JWT `access_token`+`refresh_token`. `/api/v1/auth/{login,refresh,me,logout}`. client.ts가 401 시 refresh 자동 시도.

## 3. 라우트(현 baseline)
- `app/login` — 이메일+비밀번호 로그인.
- `app/(member)/*` — 인증 필요 영역: `home`(역할분기), `request`, `settlements`, `schedule`, `logs`, `notifications`, `mypage`, `seniors`, `patients`, `addresses`.
- `app/location-demo` — 위치 데모.

## 4. 불변식(Invariants) — 깨면 안 되는 것
- INV-1 미인증 사용자는 `(member)/*` 접근 불가(로그인으로 유도).
- INV-2 `caregiver`/`guardian`은 자기 역할·소유 리소스만 본다(타 역할/타인 데이터 노출 금지). 백엔드 권한경계가 1차, 프런트는 그에 정합.
- INV-3 모든 API 호출은 `/api/v1` 프록시 경유. `localhost:8000` 하드코딩 잔재가 빌드에 들어가면 안 된다.
- INV-4 디자인 토큰(색/폰트)·모바일 우선 레이아웃 유지.
- INV-5 배포는 `careand-deploy member`(root)로만. 빌드 실패 시 `.next.prev` 롤백.

## 5. 범위 밖(Non-goals)
- admin 기능(별도 admin-web), 백엔드 비즈니스 로직(careand-backend), AI 추론(careand-ai-service).

## 6. 미해결/확인 필요 (not_observed != absent)
- 각 라우트의 역할별 정확한 표시 항목은 코드 추가 확인 필요(본 baseline은 라우트 존재까지만 고정).
- E2E/스모크 테스트 프레임워크 미도입 — Plans Phase 1에서 결정.

## 7. Spec delta — 보호자 AI 케어일지 수신·열람 (Phase 2, 2026-06-14)

> 횡단 신규 기능. member(이 문서) + admin(완료) + backend(외부 의존). precedence: 본 delta는 member 표면의 product contract.

**제품 의도**: 보호자가 매칭된 돌봄의 AI 생성 케어일지를 앱에서 직접 받아보고 열람한다. 현재 백엔드/admin은 일지 생성·저장·검수까지 구현됐으나, **(a) 승인 시 보호자 알림 미발송 (b) 보호자가 세션을 열거할 API 부재 (c) member 일지 목록/상세 UI 부재**로 보호자가 결과를 볼 수 없다.

**확정된 계약(기존 구현 재사용)**:
- 일지 본문 조회: `GET /v1/care-sessions/{id}/ai-summary` (구현됨, `CareSessionPolicy::view`로 본인 매칭만). 반환: `guardian_version`, `medical_version`(보호자에겐 미노출), `categorized`(meal/exercise/vital/mood), `confidence`, `generated_at`.
- 검수 상태: `care_sessions.review_status`(pending|approved|rejected). **보호자에겐 `approved`만 노출**.
- 알림 템플릿: `NotificationService::TYPE_CARE_SUMMARY_READY` (정의됨, 호출부 없음).

**불변식 추가**:
- INV-6 보호자는 `review_status=approved` 일지만 열람한다(검수 전/반려 일지 비노출).
- INV-7 `medical_version`(의료용 상세)은 보호자 표면에 노출하지 않는다(보호자=guardian_version만).
- INV-8 일지 열람은 기존 `CareSessionPolicy::view` 권한 스코프를 그대로 따른다(타인 일지 차단). 새 목록 API도 동일 스코프.

**외부(backend) 의존 — 본 레포 밖, 사용자 구현**:
- 보호자 세션 목록 API 신설(`GET /v1/guardians/me/sessions`, 인력 `caregivers/me/sessions` 미러) 또는 `matching/requests` 응답에 세션·일지상태 포함.
- 승인 시 `CARE_SUMMARY_READY` 알림 발송 연결.
