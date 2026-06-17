-- 팜들리 데이터베이스 설계도 v2
-- 사용법: Supabase 홈페이지 → 내 프로젝트 → 왼쪽 메뉴 "SQL Editor" → 이 내용 전체 붙여넣기 → Run

-- 1) 약국 명단 (약사가 앱에서 직접 등록)
create table pharmacies (
  id bigint generated always as identity primary key,
  name text not null,              -- 약국 이름
  pharmacist text,                 -- 약사 이름
  license text,                    -- 약사 면허번호 (입점 심사용, 비공개)
  address text,                    -- 도로명 주소
  address_detail text,             -- 상세 주소
  hours text,                      -- 영업시간 (예: ~22:00)
  is_late_night boolean default false,
  created_at timestamptz default now()
);

-- 2) 약국별 재고 (약사가 직접 등록한 상품)
create table inventory (
  id bigint generated always as identity primary key,
  pharmacy_id bigint references pharmacies (id) on delete cascade,
  name text not null,              -- 제품명
  cat text,                        -- 분류 (해열진통제 등)
  type text,                       -- 일반의약품 / 의약외품 / 건강기능식품
  price integer,                   -- 실제 판매가 (원)
  deal_off integer default 0,      -- 픽업 할인액 (원)
  status text default 'in',        -- in 보유 / low 소량 / out 품절
  created_at timestamptz default now()
);

-- 3) 주문서 (품목은 items 칸에 통째로 저장 — 초기 버전 단순화)
create table orders (
  id bigint generated always as identity primary key,
  order_no text unique not null,   -- 주문번호 (P-123456)
  pharmacy_id bigint,              -- 어느 약국 주문인지 (예시 약국 주문은 비어있음)
  pharm_name text,                 -- 약국 이름 (표시용)
  visit_time text,                 -- 방문 예정 시간
  eta text,                        -- 약사가 안내한 예상 픽업 시간
  status text default 'requested', -- requested / confirmed / ready / done / rejected
  items jsonb,                     -- 주문 품목 목록
  total integer,                   -- 합계 금액
  created_at timestamptz default now()
);

-- 실시간 연결 켜기 (환자가 주문하면 약국 화면에 바로 뜨게)
alter publication supabase_realtime add table pharmacies, inventory, orders;

-- ⚠️ 참고: 지금은 로그인 기능이 없어서 보안 잠금(RLS)을 걸지 않았습니다.
-- 지인 대상 파일럿까지는 괜찮지만, 일반 공개 전에는 반드시
-- 로그인(Supabase Auth)과 RLS 정책을 추가해야 합니다.
