# design-sync NOTES — careand-member-web

## 리포 형태
- 이 리포는 **Next.js 앱**이지 배포용 패키지가 아님 → 변환기는 **synth-entry 모드**(빌드된 `dist/` 없음, `[NO_DIST]` 정상).
- 변환기가 `node_modules/careand-member-web`(자기 패키지 디렉터리)를 찾으므로 **자기참조 심링크 필수**:
  `ln -sfn /root/careand-member-web node_modules/careand-member-web` (gitignore, 클론마다 재생성).
- 컴포넌트 소스: `components/ui/{badge,button,card,input,table}.tsx`. `cfg.srcDir=components/ui`, `cfg.componentSrcMap`로 5개 핀.
- `@/*` → `./*` alias는 `cfg.tsconfig=tsconfig.json`으로 esbuild가 해석.

## 스타일(Tailwind) — cssEntry 생성 절차 (매 빌드 전)
이 DS는 토큰 스택이 아니라 **Tailwind 유틸리티**. `cfg.cssEntry`는 **컴파일된 정적 스타일시트**여야 함:
```
node -e '<safelist 생성: brand/warm 50-900 × bg/text/border + 시맨틱 + 레이아웃 유틸 → .design-sync/_safelist.txt>'
npx tailwindcss -i app/globals.css -o .design-sync/ds-tailwind.css \
  --content "./components/ui/**/*.tsx,./.design-sync/previews/**/*.tsx,./.design-sync/_safelist.txt"
sed -i '/@import url("https:\/\//d' .design-sync/ds-tailwind.css   # ★ 원격 폰트 @import 제거
```
- **★ 원격 폰트 @import 제거 필수**: `app/globals.css` 상단의 Pretendard(jsdelivr)·Plus Jakarta Sans(Google Fonts) `@import url(https://...)`를 **반드시 sed로 제거**. 안 하면 헤드리스 render check가 `page.goto 15s timeout`(egress가 폰트 호스트 차단)으로 전부 실패하고, 디자인 환경에서도 load를 막음.
- **safelist** 없이 content만 쓰면 컴포넌트가 실제 쓴 음영만 컴파일됨 → 디자인 에이전트가 새 레이아웃에 `bg-brand-300` 등 쓰면 미해결. safelist로 brand/warm 전 스케일을 강제 동봉.

## 폰트 — 동봉 완료(시스템 폴백 아님)
- **Pretendard + Plus Jakarta Sans 동봉됨** → `[FONT_MISSING]` 해소(validate 경고 0). variable woff2를 `.design-sync/fonts/`에 두고 `cfg.extraFonts`로 `@font-face` 연결:
  - `.design-sync/fonts/PretendardVariable.woff2`(2MB, 전 weight) + `pretendard.css`(@font-face, family "Pretendard", weight 45 920).
  - `.design-sync/fonts/PlusJakartaSans-latin.woff2`(28K, `.font-en` 영문/숫자 강조) + `plus-jakarta.css`(weight 200 800).
  - woff2 출처: `npm i pretendard` / `npm i @fontsource-variable/plus-jakarta-sans`(미러), `dist`의 variable woff2 복사. 둘 다 리포에 커밋(durable).
- `[NO_DIST]` — 정상(synth-entry).

## ★ npm install 후 자기참조 심링크 재생성 필수
`npm i <any>`는 `node_modules/careand-member-web` 자기참조 심링크를 **extraneous로 prune**함("removed N packages") → 직후 빌드가 `ENOENT .../careand-member-web/package.json`로 실패. **모든 npm install 직후** `ln -sfn /root/careand-member-web node_modules/careand-member-web` 재실행.

## 박스 환경 (lt-server 103.55.191.157, egress 화이트리스트)
- npm: registry.npmjs.org는 Cloudflare 차단 → **`--registry https://registry.npmmirror.com/`**(Alibaba 미러)로 설치. (참고: /root/npm-tunnel-on.sh 역터널은 fallback)
- playwright: 캐시된 chromium 빌드 **1223 = playwright 1.60.0**. `npm i playwright@1.60.0 --registry <미러>`로 다운로드 없이 캐시 재사용.
- claude.ai: 403 응답(=네트워크 도달 가능). 업로드 가능성 있음.

## Re-sync risks (다음 실행이 주시할 것)
- `ds-tailwind.css`는 **매 빌드 재생성 + 원격 @import 재제거** 필요(소스 변경 시 클래스 누락 방지). `_safelist.txt`는 durable(커밋됨).
  - **★ 2026-06-30 변경**: `app/globals.css`가 06-29 커밋(1256cff)에서 원격 `@import url(https://…)` → **로컬 `@font-face`(`url("/app/fonts/…woff2")`)**로 교체됨. 따라서 (a) 더 이상 sed로 제거할 원격 @import는 없고, (b) globals.css에서 ds-tailwind.css를 **재생성하면 `/app/fonts/*` @font-face가 주입되어 디자인 환경에서 dangling**. 폰트는 `cfg.extraFonts`로 동봉하므로, 재생성 시 그 `@font-face` 2줄도 제거해야 함. **컴포넌트(components/ui/*.tsx)·safelist 미변경이면 커밋된 clean ds-tailwind.css가 정답 → 재생성 불필요**(이번 re-sync에서 styleSha 동일 확인).
- 자기참조 심링크는 클론마다 수동 재생성.
- 폰트는 **Pretendard + Plus Jakarta Sans 동봉 완료**(시스템 폴백 아님 — `cfg.extraFonts`).
- previews는 인라인 style + 컴포넌트 className 혼용. 컴포넌트 cva variant가 바뀌면 preview의 variant 이름도 갱신.
- **★ careand-www에 이 config의 stale 사본이 커밋되어 있음**(같은 projectId 4ff6f2d2 "Care& 회원앱 UI"를 가리킴, pkg=careand-member-web). careand-www의 `card.tsx`는 member-web과 **다름** → **design-sync는 반드시 이 리포(careand-member-web)에서만 실행**. www에서 돌리면 www의 Card를 회원앱 프로젝트에 덮어씀.
