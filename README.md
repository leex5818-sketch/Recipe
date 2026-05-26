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

- 프론트엔드: Vanilla JS + HTML/CSS (단일 `index.html`)
- 데이터: `recipes.json` (`{ cats, dishes, recipes }` 구조)
- 백엔드: Supabase (수정 제안 수집용)
- 호스팅: Vercel (`main` 브랜치 push → 자동 배포, [vercel.json](./vercel.json) 으로 PWA용 헤더 설정)

## 파일 구조

```
index.html       # 앱 전체 (UI + 로직)
recipes.json     # 레시피 데이터
manifest.json    # PWA 매니페스트
sw.js            # 서비스 워커 (오프라인 캐시)
icon-192.svg     # PWA 아이콘
icon-512.svg
vercel.json      # Vercel 배포 설정 (PWA 헤더, cleanUrls)
PROGRESS.md      # 세션 간 진행 상황 추적
```

## 진행 상황

상세 진행 내역은 [PROGRESS.md](./PROGRESS.md) 참고.
