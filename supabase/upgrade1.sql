-- 업그레이드 1: 상품 추가 요청 기능용 테이블
-- Supabase → SQL Editor → 붙여넣고 Run (한 번만)

create table product_requests (
  id bigint generated always as identity primary key,
  pharmacy_id bigint references pharmacies (id) on delete cascade,

  fulfilled boolean default false, -- 입고 처리 여부
  created_at timestamptz default now()
);

alter publication supabase_realtime add table product_requests;


