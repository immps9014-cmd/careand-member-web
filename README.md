# Care& 회원 웹 (member-web)

> Next.js 14 (App Router) + TypeScript + Tailwind CSS + TanStack Query
> 보호자·요양보호사용 모바일 우선 웹. 케어앤 디자인 시스템 적용 (Sage Green × Warm Beige + Pretendard)

## 🏗️ 배포 구조

- 경로: `https://careand.aiclaude.kr/app` (Next.js `basePath: "/app"`)
- 포트: `:3106` (localhost) ← Apache 443 `/app` ProxyPass
- systemd 서비스: `careand-member-web`
- API: Laravel 백엔드 `/api/v1` (next.config rewrites 프록시, `NEXT_PUBLIC_API_URL`)

## 📡 페이지 일람

| 라우트 | 대상 | 기능 | API 연동 |
|---|---|---|---|
| `/login` | 공통 | 로그인 (JWT) | `POST /v1/auth/login` |
| `/home` | 보호자/인력 | 역할별 홈 — 매칭 현황·세션 체크인/아웃 | `GET /v1/matching/requests` · `GET /v1/caregivers/me/*` |
| `/seniors`, `/seniors/new`, `/seniors/[id]` | 보호자 | 어르신 등록·관리, 건강 시계열 | `GET·POST /v1/seniors` |
| `/request/new`, `/request/[id]` | 보호자 | 돌봄 요청 생성, 후보 선택 | `POST /v1/matching/requests` · `/v1/matching/candidates/*` |
| `/schedule` | 공통 | 돌봄 일정 | `GET /v1/caregivers/me/sessions` 등 |
| `/logs` | 공통 | 돌봄 일지 열람 | `GET /v1/care-sessions/*` |
| `/settlements` | 인력 | 정산 내역 | `GET /v1/settlements` |
| `/notifications` | 공통 | 알림 | `GET /v1/notifications` · `POST …/read` |
| `/mypage` | 공통 | 내 정보 | - |
| `/location-demo` | 공개(로그인 불필요) | 주소→좌표→지도→거리 매칭 데모 (카카오맵 Local API 심사용) | 다음 우편번호 + Nominatim(임시) |

## 🗺️ 지도/지오코딩 (카카오 승인 대기)

- `components/map-preview.tsx` — 현재 OSM iframe 임베드. **카카오 디벨로퍼스 승인 후 카카오맵 JS SDK로 교체 예정**
- `lib/geocode-client.ts` — 브라우저측 Nominatim(키 불필요, 데모용). 운영 좌표 저장은 서버 `GeocodingService`(Kakao→VWorld→Nominatim 폴백) 담당
- `lib/postcode.ts` — 다음(카카오) 우편번호 서비스 (키 불필요, 작동 중)
- 승인 후 할 일: 백엔드 `.env`에 `KAKAO_REST_API_KEY`, member-web에 JS 키 주입 → `map-preview.tsx` SDK 교체

## 🔐 인증 흐름

admin-web과 동일: JWT(Bearer) + Zustand store(localStorage 동기화), 401 시 리프레시 자동 갱신, 실패 시 `/login` 리다이렉트. guardian / caregiver 역할별 화면 분기.

## 🛠️ 빌드 및 배포

```bash
cd /root/careand-member-web
npm run build
systemctl restart careand-member-web
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=https://careand.aiclaude.kr
NEXT_PUBLIC_ENV=production
```

---

© 2026 Care& Inc. 회원 웹 v1.0
