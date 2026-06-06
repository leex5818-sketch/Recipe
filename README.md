# 오늘 뭐먹지

오늘의 한 끼를 빠르게 정해주는 레시피 PWA.

**🔗 라이브**: https://recipe-lac-ten.vercel.app

## 기능

- **레시피 130개** · 카테고리 7개 (한식·일식·중식·이유식·양식·분식·베트남)
- **카테고리별 대표 사진** (Unsplash CDN)
- **재료별 쿠팡 파트너스 딥링크** — 재료 클릭 시 쿠팡 검색/상품 페이지로 이동 (검색 URL 폴백)
- **다국어 번역** (EN / JA / ZH)
- **즐겨찾기 · 별점 · 후기** (localStorage)
- **재료 수정 제안 모달** — 사용자가 보낸 제안은 Supabase `edit_requests` 테이블에 저장
- **관리자 모드** — 수정 요청 승인/반려
- **PWA 지원** — 모바일에서 홈 화면 추가, 오프라인 캐시

## 기술 스택

- 프론트엔드: React 18 (CDN UMD 전역) + JSX, 단일 페이지
- **빌드: esbuild** — `src/app.jsx` → `app.js` 사전 컴파일 (브라우저 Babel 런타임 제거)
- 데이터: `recipes.json` (`{ cats, dishes, recipes }` 구조)
- 백엔드: Supabase (수정 제안 수집용) — **RLS 필수, [docs/SECURITY.md](./docs/SECURITY.md) 참고**
- 호스팅: Vercel (`main` push → `npm run build` 자동 실행 → 배포)

## 빌드 / 로컬 실행

```bash
npm install
ADMIN_PW='관리자비번' npm run build   # → app.js 생성 (env 없으면 관리자 비활성)
npm run dev                           # 빌드 + http://localhost:4567
```
> `app.js`는 빌드 산출물이라 git에서 제외(.gitignore). 소스는 `src/app.jsx`.
> Vercel은 `vercel.json`의 `buildCommand`로 배포 시 자동 빌드하며, `ADMIN_PW`는 Vercel 환경변수로 설정.

## 파일 구조

```
index.html       # HTML 셸 + CSS (<style>) + CDN 로드, app.js 참조
src/app.jsx      # 앱 로직 전체 (React, JSX) — 편집은 여기서
app.js           # esbuild 산출물 (gitignore, 직접 편집 금지)
build.mjs        # esbuild 빌드 스크립트 (ADMIN_PW env 주입)
recipes.json     # 레시피 데이터
manifest.json    # PWA 매니페스트
sw.js            # 서비스 워커 (network-first + 캐시 폴백 = 실제 오프라인)
icon-192.svg     # PWA 아이콘 (192/512)
icon-512.svg
vercel.json      # Vercel 배포 설정 (buildCommand, PWA 헤더, cleanUrls)
docs/SECURITY.md # 보안 조치 가이드 (RLS·ADMIN_PW)
docs/roadmap.html# 판매가능화 로드맵 다이어그램
PROGRESS.md      # 세션 간 진행 상황 추적
```

## 진행 상황

상세 진행 내역은 [PROGRESS.md](./PROGRESS.md) 참고.
