# 보안 조치 가이드 (Stage 1)

> 코드로 끝낼 수 없고 **Supabase 대시보드 / Vercel 설정**이 필요한 항목입니다.
> 판매·정식 운영 전 **반드시** 1·2번을 끝내세요.

---

## 0. 현재 상태 (2026-06-06 실측 진단)

publishable(anon) 키로 직접 호출해 본 결과:

| 테이블 | anon SELECT | 판정 |
|--------|-------------|------|
| `users` | **가능** (현재 0건) | ⚠️ RLS 열림 — 로그인 사용자 생기면 닉네임·프로필 PII 전량 노출 |
| `edit_requests` | **가능** (현재 0건) | ⚠️ 누구나 제안 내역 덤프 가능 |

> anon 키는 배포된 `app.js` 안에 들어 있어 **공개 정보**입니다(원래 그렇게 설계됨).
> 따라서 **보안은 전적으로 RLS(Row Level Security)에 달려 있는데, 지금은 꺼져 있습니다.**
> 재진단: 아래 명령을 다시 돌려 `[]`(빈 배열)이 아니라 권한오류가 나오면 잠긴 것.

```bash
SB_URL="https://clidlcwqpddzgjgjznea.supabase.co"
SB_KEY="sb_publishable_4Fyvj0W8RGpzTHhwcgnzSA_9tAjFQ-0"
# 잠근 뒤엔 [] 대신 권한 오류(또는 빈 결과 + 정책에 의한 차단)가 떠야 정상
curl -s "$SB_URL/rest/v1/users?select=*&limit=5" -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY"
```

---

## 1. Supabase RLS 잠그기 ⭐ 최우선 (약 5분, SQL만)

Supabase 대시보드 → 좌측 **SQL Editor** → 새 쿼리에 붙여넣고 **Run**:

```sql
-- (1) RLS 활성화
alter table public.users         enable row level security;
alter table public.edit_requests enable row level security;

-- (2) 기존의 느슨한 정책 제거
--     대시보드 Authentication > Policies 에서 'Enable read access for all'
--     같은 anon SELECT 허용 정책이 있으면 먼저 삭제(또는 아래로 덮어쓰기).

-- (3) users: '로그인 시 기록(INSERT)'만 허용. 조회/수정/삭제 정책은 만들지 않음
--     → anon은 user 목록을 읽을 수 없음 (PII 덤프 차단)
drop policy if exists "anon insert users" on public.users;
create policy "anon insert users" on public.users
  for insert to anon with check (true);

-- (4) edit_requests: '제안 보내기(INSERT)'만 허용. 조회/수정은 차단
drop policy if exists "anon insert edit_requests" on public.edit_requests;
create policy "anon insert edit_requests" on public.edit_requests
  for insert to anon with check (true);
```

적용 후 영향:
- ✅ 카카오 **로그인 기록**·**재료 수정 제안 보내기** 는 그대로 작동(INSERT).
- ✅ 누구도 `users`/`edit_requests` 를 **읽거나 조작할 수 없음**.
- ⚠️ **단, 앱 안의 '관리자 패널'(제안 목록 조회/승인)도 anon이라 같이 막힙니다.**
  → 당분간 **제안 검토는 Supabase 대시보드 → Table Editor → `edit_requests`** 에서 직접 하세요(코드 0, 가장 안전).
  → 앱 내 관리자 기능을 되살리려면 아래 3번(Edge Function).
- 참고: 재로그인 시 `last_login_at` 갱신은 UPDATE 정책이 없어 조용히 생략됩니다(최초 로그인 INSERT는 정상). 갱신이 꼭 필요하면 3번으로 처리.

---

## 2. 관리자 비밀번호 — 빌드 env 로 주입 (소스/깃에서 제거 완료)

코드에서 `ADMIN_PW="sungwon2024"` 평문 하드코딩을 **제거**했습니다.
이제 빌드 시 환경변수로 주입됩니다(미설정 시 관리자 로그인 자체가 비활성 = 안전 기본값).

**Vercel** → 프로젝트 → Settings → **Environment Variables**:
| Name | Value | 환경 |
|------|-------|------|
| `ADMIN_PW` | (새 비밀번호 — `sungwon2024` 말고 새 값) | Production·Preview |

- 설정 후 재배포하면 그 비번으로 관리자 잠금 해제됩니다.
- 로컬 빌드 시: `ADMIN_PW='새비번' npm run build`
- ⚠️ 이 비번도 결국 배포된 `app.js`에서 보일 수 있는 **편의용 게이트**입니다.
  실제 데이터 보안은 **1번 RLS**가 담당합니다. (둘 다 해야 함)

---

## 3. (선택·권장) 관리자 기능을 Edge Function 으로 — 앱 내 패널 복원

1번을 적용하면 앱 내 관리자 패널이 막히므로, 되살리려면 **service_role 로 동작하는 Edge Function** 뒤에 둡니다.

`supabase/functions/admin/index.ts`:
```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { action, pw, id, status } = await req.json().catch(() => ({}));
  if (pw !== Deno.env.get("ADMIN_PW")) return new Response("forbidden", { status: 403 });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service_role: RLS 우회. 절대 클라이언트에 노출 금지
  );

  if (action === "list") {
    const { data } = await sb.from("edit_requests").select("*").order("created_at", { ascending: false });
    return Response.json(data ?? []);
  }
  if (action === "update") {
    await sb.from("edit_requests").update({ status }).eq("id", id);
    return Response.json({ ok: true });
  }
  return new Response("bad request", { status: 400 });
});
```

배포:
```bash
supabase functions deploy admin --no-verify-jwt
supabase secrets set ADMIN_PW='새비번'   # SUPABASE_URL/SERVICE_ROLE_KEY는 기본 주입됨
```

그 뒤 클라이언트의 `loadAdminRequests`/`updateRequest` 를
`fetch(`${SB_URL}/functions/v1/admin`, { method:'POST', body: JSON.stringify({action,pw,...}) })`
로 바꾸면 됩니다. (Stage 2에서 함께 작업 가능)

---

## 4. (추후) 카카오 토큰 교환 서버 이전 — 낮은 우선순위

현재 카카오 `code→token` 교환이 클라이언트에서 일어나 `access_token` 이 브라우저에 노출됩니다.
요청 scope가 `profile_nickname, profile_image` 로 최소라 **판매 차단 사유는 아니지만**,
정식 운영 시 3번과 같은 Edge Function 으로 토큰 교환을 옮기는 것을 권장합니다.

---

## 체크리스트

- [ ] 1. SQL 실행 → `curl` 재진단으로 `users` 조회 차단 확인
- [ ] 2. Vercel `ADMIN_PW` env 설정 + 재배포
- [ ] (선택) 3. Edge Function 으로 관리자 패널 복원
- [ ] (추후) 4. 카카오 토큰 교환 서버 이전
