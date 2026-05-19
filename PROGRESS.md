# recipe-app 진행 현황

## 앱 개요
- **앱명**: 오늘 뭐먹지 (PWA)
- **배포**: https://leex5818-sketch.github.io/Recipe
- **GitHub**: leex5818-sketch/Recipe (main 브랜치 push → 자동 배포)
- **Supabase**: edit_requests 테이블 (재료 수정 제안 저장)

## 데이터 구조 (recipes.json)
```
{ cats: [...], dishes: { "catId": [...] }, recipes: { "dishId": [...] } }
```
- 카테고리 7개: 한식·일식·중식·이유식·양식·분식·베트남
- 음식 130개, 레시피 130개 (음식당 1개)

## 완료된 작업

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
