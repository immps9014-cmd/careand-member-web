# Care& 회원앱 UI (careand-member-web)

Care& 통합돌봄 플랫폼 회원앱의 UI 프리미티브 — shadcn/ui 스타일 + Tailwind. 모든 컴포넌트는 `window.CareandUI.*`로 제공됩니다.

## 래핑 / 셋업
별도 Provider 불필요 — 이 프리미티브들은 React 컨텍스트(테마/라우터/i18n)를 읽지 않습니다. import 후 바로 사용합니다. 스타일은 Tailwind 유틸리티 클래스로, 번들 `styles.css`(→ `_ds_bundle.css`)에 컴파일 동봉됩니다.

## 스타일 idiom — Tailwind 유틸리티 + Care& 토큰 스케일
CSS 클래스맵이 아니라 **Tailwind 유틸리티 + 브랜드 토큰 스케일**로 스타일합니다. 레이아웃 글루는 표준 Tailwind를 쓰되, 색은 아래 패밀리를 사용하세요.

| 토큰 패밀리 | 값(스케일 50–900) | 대표 사용 |
|---|---|---|
| `brand-*` | 녹색 브랜드 | `bg-brand-500`(주 버튼), `text-brand-700`, `bg-brand-50`(연한 강조 배경) |
| `warm-*` | 중성 그레이 | `text-warm-800`(본문), `text-warm-500`(보조), `border-warm-200`, `bg-warm-50` |
| 시맨틱(단일 토큰) | `text-warn`+`bg-warn-bg`, `text-danger`+`bg-danger-bg`, `text-info`+`bg-info-bg` | 경고 / 위험 / 정보 |

레이아웃 유틸(동봉): `flex` `inline-flex` `grid` `items-center` `justify-between` `gap-{1..4}` `p-{2..4}` `px-3/4` `py-2/3` `rounded-{md,lg,xl,full}` `font-semibold` `font-bold` `text-{xs,sm,base}` `shadow-sm` `border` `w-full`. 본문 한글 폰트는 Pretendard(호스트 런타임 제공, 번들 미동봉 — 미제공 환경은 시스템 폰트 폴백).

## 컴포넌트 API (핵심)
- **Button** — `variant`: `brand`(주)·`primary`·`secondary`·`outline`·`danger`·`ghost`·`link`, `size`: `sm`·`md`·`lg`·`icon`, `disabled`, `asChild`(Slot).
- **Badge** — `variant`: `brand`·`success`·`warn`·`danger`·`info`·`solid`·`outline`·`ai`(그라데이션).
- **Card** — 컴파운드: `Card` > `CardHeader` > (`CardTitle`, `CardDescription`), `CardContent`, `CardFooter`.
- **Input** — 표준 `<input>` 속성(`type`, `placeholder`, `disabled`, `value`/`defaultValue`).
- **Table** — 컴파운드: `Table` > `TableHeader` > `TableRow` > `TableHead`; `TableBody` > `TableRow` > `TableCell`.

진실의 출처: 컴포넌트별 `<Name>.d.ts`(props 계약)·`<Name>.prompt.md`(사용 예), 색/토큰은 `styles.css`와 그 `@import` 클로저.

## 빌드 예시 (idiom)
```jsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>홍어머님</CardTitle>
      <Badge variant="success">매칭완료</Badge>
    </div>
    <CardDescription>방문요양 · 4시간</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex justify-between text-sm">
      <span className="text-warm-500">합의 시급</span>
      <strong className="text-brand-700">21,900원</strong>
    </div>
  </CardContent>
  <CardFooter><Button variant="brand" size="sm">상세 보기</Button></CardFooter>
</Card>
```
