-- 업그레이드 5: 검색 키워드 통계용 search_logs 테이블
-- Supabase → SQL Editor → 붙여넣고 Run (여러 번 실행해도 안전합니다)
--
-- ⚠️ 아직 실행 전입니다. 이 테이블에 실제로 검색어를 쌓는 코드는 이 저장소에 없습니다 —
-- 손님이 검색할 때 호출하는 FastAPI 백엔드(PHARMDLY_API) 쪽에서 검색할 때마다 이 테이블에
-- INSERT하도록 반영해야 통계가 채워집니다. 이 저장소(관리자 패널)는 읽어서 집계·화면에
-- 보여주기만 합니다.
--
-- 개인정보를 저장하지 않습니다: 키워드와 시각만 남기고, 누가 검색했는지(사용자 id·전화번호·
-- IP 등)는 컬럼 자체가 없습니다.

create table if not exists search_logs (
  id bigint generated always as identity primary key,
  keyword text not null,
  searched_at timestamptz not null default now()
);

-- 기간 필터(오늘/이번주/이번달) 조회가 searched_at 범위 스캔이라 이 인덱스가 중요합니다.
create index if not exists idx_search_logs_searched_at on search_logs (searched_at desc);

alter table search_logs enable row level security;

-- ⚠️ 가정: FastAPI 백엔드가 search_logs에 쓸 때 service_role이 아니라 anon/authenticated
-- 키를 쓸 가능성이 있다고 보고(이 프로젝트의 다른 테이블들이 그런 식으로 구성돼 있어서),
-- 개인정보가 전혀 없는 테이블이니 누구나 "쓰기(추가)"는 허용하고, "읽기"는 관리자
-- 패널의 service_role만 가능하도록(정책 없음 = 차단) 열어뒀습니다.
-- FastAPI가 실제로 service_role을 쓴다면 이 정책은 없어도 되지만, 있어도 문제되지 않습니다.
create policy "search_logs_insert_open" on search_logs
  for insert
  to anon, authenticated
  with check (true);
