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
