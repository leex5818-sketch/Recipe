# recipe-app 진행 현황

## 앱 개요
- **앱명**: 오늘 뭐먹지 (PWA)
- **배포**: https://recipe-lac-ten.vercel.app (Vercel)
- **GitHub**: leex5818-sketch/Recipe (main 브랜치 push → Vercel 자동 배포)
- **Supabase**: edit_requests 테이블 (재료 수정 제안 저장)

## 데이터 구조 (recipes.json)
```
{ cats: [...], dishes: { "catId": [...] }, recipes: { "dishId": [...] } }
```
- 카테고리 7개: 한식·일식·중식·이유식·양식·분식·베트남
- 음식 130개, 레시피 130개 (음식당 1개)

## 완료된 작업

### 2026-06-06 — B(사진)·A(수익화)·C(디테일)
- [B] **사진 파이프라인**: `scripts/gen_photo_prompts.py`→`docs/photo-prompts.md`(129개 ChatGPT 프롬프트, **recipe id** 기준) + `scripts/place_photos.py`(photos_src/→`assets/{id}.jpg` 리사이즈·리네임, sips/PIL). 앱은 사진 있으면 자동 표시·없으면 이모지 폴백
- [A] **수익화**: `docs/MONETIZATION.md`(쿠팡 파트너스 가입·**AF_ID 본인확인 경고**·딥링크·현실수익·프리미엄 ₩9,900 설계+토스페이먼츠 Edge Function 개요) + `scripts/top_ingredients.py`(대파53·소금51… 상위 딥링크 우선순위) + `coupang_links.template.json`
- [C] **디테일**: 복붙 dish 2개 제거(3018 누룽지탕·5004 크림파스타 → 128개) + badge 재산정(블랭킷 '인기' 124 → 간단17/고급9/의미부여) + '130가지' → **동적 카운트(127)** + **재료로 검색**("두부"→된장찌개) + 깨진 추천칩(뱅쇼→갈비찜)
- 검증: 빌드·헤드리스 부팅·동적카운트·스크린샷·콘솔에러0
- [ ] 후속(사용자): 사진 생성·쿠팡 가입/AF_ID 교체·프리미엄 결제 구현

### 2026-06-06 — Stage 2 UX/UI 폴리시 (라이브 배포 완료)
- [x] **반응형 PC**: @media(768/1100) — .app 680~760px, cat-grid 3~4열, navbar 폭 매칭. "440px 한 줄" 해소
- [x] **모션**: 카드/칩 누름 스케일 피드백, 스켈레톤 shimmer 유틸
- [x] **토스트**: alert() 6곳 → 비차단 토스트(showToast). 즐겨찾기·후기 저장 성공 피드백
- [x] **이미지 인프라**: 카드 썸네일 + 상세 배너 — `assets/{id}.jpg` 있으면 자동 표시, 없으면 이모지/숨김 폴백(zero 회귀)
- [x] **접근성**: 아이콘 버튼 aria-label, 터치타깃 ≥44px
- [x] 로컬 빌드·헤드리스 부팅·모바일/데스크톱 스크린샷 검증 → 배포 → 라이브 byte-identical 확인
- [ ] **후속(사용자)**: 음식 사진 130장 생성(ChatGPT 무과금) → `assets/{id}.jpg`로 넣으면 자동 표시 / framer-motion은 React 번들 전환 필요해 보류(CSS로 폴리시 달성)

### 2026-06-06 — 판매가능화 Stage 1 핫픽스 (교차검증 38건 기반)
교차검증: 53개 에이전트 다관점 검증 → 확정 38건(high 9). 진단 ★2.0 → 목표 ★4.0. 로드맵: `docs/roadmap.html`.
- [x] **빌드스텝 도입(A안)**: 브라우저 Babel-standalone 제거 → esbuild 사전컴파일(`src/app.jsx`→`app.js` 33.7KB). `build.mjs`/`package.json`/vercel `buildCommand`. 단일 HTML 유지(Next.js 마이그레이션 X)
- [x] **B1 번역 버그**: 단계/하트 누르면 번역이 한글로 되돌아가던 버그 — `trLang/trData/trLoading`+`handleTr`를 App 레벨로 승격(remount에도 유지) + recipe 변경 시 리셋. IME는 미변경(경고 준수)
- [x] **D1 time 허위표기**: 79%가 5/30분 플레이스홀더 → 103건 `0`으로(UI가 `-` 폴백). 실제값 27건만 노출
- [x] **D2 카드명≠레시피 8건**: 카드명을 실제 레시피 제목에 맞춤(5053 세비체→광어마요덮밥, 5065 명란무침→치즈돈까스, 이유식 4012/4021 포함). 날조 없이 정정
- [x] **빈 음식 필터**: `3017 마라전골`(준비중·빈 레시피) 목록/검색/카운트에서 제외(`dishReady`)
- [x] **U1 후기박스 CSS**: `.review-card/.review-row/.review-note-text` 미정의로 무스타일 렌더되던 것 정의 추가
- [x] **U4 접근성**: 전역 `outline:none` → `:focus-visible` 키보드 포커스 복원(WCAG 2.4.7)
- [x] **SW 정직화**: 순수 패스스루 → network-first+캐시 폴백(실제 오프라인 작동). 카카오/번역/쿠팡/Supabase는 캐시 제외
- [x] **아이콘 브랜딩**: PWA 아이콘 🍶'성원포차' → 🍲'오늘 뭐먹지'. manifest theme_color 불일치(#C0392B→#F2F4F6)·start_url·purpose 정정
- [x] **관리자 비번 평문 제거**: `ADMIN_PW="sungwon2024"` 소스 제거 → 빌드 env 주입(`__ADMIN_PW__`), 미설정 시 관리자 비활성(안전 기본값)
- [x] **스키마 가드**: 손상 JSON에도 흰 화면 크래시 안 나게 `loadDb`에 검증 추가
- [x] **보안 진단/가이드**: anon 키로 `users`/`edit_requests` RLS 열림 실측 확인 → `docs/SECURITY.md`에 RLS SQL·Edge Function·env 절차

#### ⚠️ 사용자 액션 필요 (계정/대시보드)
- [ ] **Supabase SQL Editor에서 RLS 잠그기** (docs/SECURITY.md 1번) — 판매 전 필수
- [ ] **Vercel `ADMIN_PW` 환경변수 설정** + 재배포 (docs/SECURITY.md 2번)
- [ ] **첫 배포 시 Vercel 빌드 로그 확인** — buildCommand가 새로 적용됨(정적→빌드 전환)

### 2026-05-19
- [x] 재료 `약간` → 구체적 계량 변환 (103개)
  - 소금·후추·후춧가루 → `1/4 작은술`
  - 통깨·참깨·파슬리·김가루 등 → `1 작은술`
  - 와사비 → `1/2 작은술`
- [x] recipes_backup*.json 11개 삭제 (git으로 버전 관리)
- [x] recipe-app 파일 Recipe 레포에 연결 및 배포

### 이전 세션들
- [x] 포차 카테고리 제거 → 양식으로 통합
- [x] 카테고리별 대표 음식 사진 설정 (Unsplash CDN)
- [x] PWA 이름 → 오늘 뭐먹지
- [x] 재료별 쿠팡 파트너스 딥링크 (coupang_deeplink.py, 폴백: 검색 URL)
- [x] 다국어 번역 버튼 (EN·JA·ZH)
- [x] 즐겨찾기·별점·후기 (localStorage)
- [x] 수정 제안 모달 (Supabase 저장)
- [x] 관리자 모드 (수정 요청 승인/반려)

## 다음 할 일 / 검토 필요
- [ ] 음식당 레시피 1개 → 여러 개 변형 추가 검토
- [ ] 베트남 카테고리 레시피 3개 → 추가 필요
- [ ] coupang_links.json 생성 (쿠팡 파트너스 승인 후)
- [ ] recipes_new.json 활용 여부 확인

## 주요 파일
| 파일 | 설명 |
|------|------|
| `index.html` | React SPA 전체 (단일 파일) |
| `recipes.json` | 전체 데이터 |
| `coupang_deeplink.py` | 쿠팡 딥링크 생성 스크립트 |
| `enricher.py` | 재료 추출·어투 통일 |
| `clean_ingredients.py` | 재료 정제 |
| `sw.js` | 서비스워커 (캐시 비활성화) |
| `manifest.json` | PWA 설정 |
