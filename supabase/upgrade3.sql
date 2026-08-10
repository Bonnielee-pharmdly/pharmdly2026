-- 업그레이드 3: 관리자 관제 대시보드 보조 설정
-- Supabase → SQL Editor → 붙여넣고 Run (여러 번 실행해도 안전합니다)
--
-- 참고: admins / admin_action_log / no_shows / reservations / products 테이블과
-- detect_no_shows() / clear_no_shows() 함수는 이미 이 프로젝트의 DB에 존재합니다.
-- 이 파일은 그 위에 빠진 조각만 더합니다.

-- 1) "약국 #12에 무슨 일이 있었나"를 빠르게 조회하기 위한 인덱스
create index if not exists idx_admin_log_target
  on admin_action_log (target_type, target_id, created_at desc);

-- 2) 관리자 전용 테이블은 RLS를 켜고 별도 허용 정책은 두지 않습니다.
--    → anon/authenticated 키로는 접근 불가, 관리자 패널의 service_role 키만 우회해서 읽고 씁니다.
alter table admins enable row level security;
alter table admin_action_log enable row level security;
alter table no_shows enable row level security;

-- 3) 마스터데이터(제품) 사진을 저장할 공개 버킷.
--    (업로드는 관리자 패널의 service_role 로만 하므로 별도 쓰기 정책은 필요 없습니다.
--     공개 버킷이라 다운로드는 정책 없이도 누구나 가능합니다 — 손님/약국 포탈에서 사진을 보여줄 때 필요합니다.)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 4) 약국 정지/활성화/소프트 삭제용 상태 컬럼.
--    lib/store.js의 loadPharmacies()가 이 값을 읽어 'active'가 아닌 약국을 손님 포탈에서 숨깁니다.
--    ⚠️ 검색을 담당하는 외부 FastAPI 백엔드가 있다면, 그쪽 약국 목록/검색 쿼리에도
--    이 조건을 반영해야 완전히 숨겨집니다 — 이 저장소에서는 그 코드를 고칠 수 없습니다.
alter table pharmacies
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended', 'deleted'));

-- 5) 문제 손님 차단 목록. 손님 계정 자체가 없고 전화번호로만 예약이 연결되므로 전화번호 기준입니다.
--    ⚠️ 이 목록은 관리자 패널이 "차단했다"는 사실만 기록합니다. 실제로 새 예약 생성을 막으려면
--    예약 생성 로직을 가진 FastAPI 백엔드가 이 테이블을 확인하도록 그쪽에도 반영해야 합니다.
create table if not exists blocked_customers (
  user_phone text primary key,
  reason text,
  blocked_by uuid references admins (id),
  blocked_at timestamptz not null default now()
);
alter table blocked_customers enable row level security;
