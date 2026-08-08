# Care& Member Web — 디자인 노트

`ui-ux-pro-max` 스킬 기준 감사·적용 기록 (2026-08-08). www 감사(hover-only 드롭다운, 저대비 텍스트) 이후
같은 기준을 member-web에 적용한 것. 팔레트는 admin/member/www 공유 SSOT(`brand` 코랄, `warm` 웜그레이)를
그대로 유지 — 바꾸지 않았다. 기존 시니어 모드 고대비 로직(`[data-tone="senior"]`, `app/globals.css`)도
그대로 두고, 오히려 그걸 핑계로 방치돼 있던 일반 모드 저대비 문제를 고쳤다.

## 방향성
- **밀도**: 표준(4/10) — 소비자 마켓플레이스/매칭 서비스 성격, 시니어 사용자 비중이 높은 화면이 많아
  터치 타겟과 대비를 특히 엄격히 봤다.
- **모션**: `prefers-reduced-motion` 킬스위치 추가 외 기존 애니메이션 타이밍은 유지.

## 이번에 고친 것 (37개 파일)
1. `text-warm-400`(2.5~2.9:1)이 라벨/메타텍스트로 173곳 이상 쓰이던 것을 → `text-warm-500`로 상향(전체
   페이지에 걸쳐 조직적으로 반복되던 패턴). `text-warm-300`(1.4~1.7:1)이 상태를 나타내는 아이콘(별점,
   단위 라벨 등)에 쓰이던 곳도 동일하게 조정.
2. 아이콘 전용 버튼(뒤로가기/닫기) 3곳에 `aria-label` 추가 — open-requests, caregivers/favorites.
3. `<div onClick>`으로만 구현돼 키보드 접근이 안 되던 클릭 요소 4곳(홈 화면 헤더의 검색/알림/프로필,
   돌봄전문가 카드 등 — 홈은 최다 방문 화면) → `role="button"`+`tabIndex`+`onKeyDown`.
4. 만족도 별점 버튼(32px) 등 44px 미만 터치 타겟 확대.
5. `Field` 헬퍼(회원가입 등 ~20곳 호출부)와 patient-form/address-form/seniors-new/request-new의 라벨이
   시각적으로만 인접하고 `htmlFor`/`id`로 연결 안 돼 있던 것 → `useId` 기반으로 프로그래밍적 연결.
6. `app/globals.css`에 `prefers-reduced-motion: reduce` 전역 규칙 추가.

## 의도적으로 손대지 않은 것 (후속 과제로 남김)
- **폼 에러가 토스트로만 뜨고 필드 옆 인라인 메시지가 없음**(회원가입, request/new) — 검증/제출 로직을
  건드려야 해서 감사 범위를 벗어난다고 판단, 고치지 않고 발견만 기록.
- `components/layout/topbar.tsx`/`sidebar.tsx`는 아무 데서도 import 안 되는 죽은 코드라 그대로 둠.
- 빈 상태(empty state)의 장식용 아이콘(Heart/Search, warm-300)은 옆에 이미 같은 내용의 텍스트가 있어
  대비 수정 대상에서 제외.
- 공용 `Button` 컴포넌트의 `h-10`/`h-8` 사이즈(AAA 44px 미달, AA 24px는 충족)는 수십 개 화면에 영향을 주는
  전역 변경이라 시각 검증 없이 바꾸는 건 위험하다고 판단해 보류.

## 검증
`npx tsc --noEmit` 통과(에러 0). `npm run build` 성공 — 약 30개 라우트 전부 컴파일/프리렌더 정상(호스트
부하로 시간은 오래 걸렸으나 변경사항으로 인한 실패 없음).
