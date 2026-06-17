-- 업그레이드 2: 보안 잠금(RLS) 해제 — "new row violates row-level security policy" 에러 해결
-- Supabase → SQL Editor → 붙여넣고 Run

alter table pharmacies disable row level security;
alter table inventory disable row level security;
alter table orders disable row level security;
alter table product_requests disable row level security;

-- ⚠️ 지인 대상 파일럿용 설정입니다.
-- 일반 공개 전에는 로그인(Supabase Auth)을 붙이고
-- 테이블별 RLS 정책을 다시 켜야 합니다.
