-- 업그레이드 4: 약국 가입 승인 기능
-- Supabase → SQL Editor → 붙여넣고 Run (여러 번 실행해도 안전합니다)
--
-- ⚠️ 아직 실행 전입니다. 실행하기 전에 아래를 먼저 확인하세요:
--   1) 이 저장소에는 약국 가입/로그인/서류 업로드 코드가 없습니다(외부 Railway/FastAPI 약국
--      포털에 있습니다). status 기본값을 'pending'으로 바꾸면 "이 저장소를 거치지 않고" 그
--      외부 포털이 pharmacies에 직접 INSERT하는 경우에도 자동으로 대기 상태로 시작하지만,
--      그 외부 코드가 INSERT 시 status를 명시적으로 'active' 등으로 지정한다면 이 기본값은
--      무시됩니다 — 그 코드를 여기서 볼 수 없어 확인이 불가능합니다.
--   2) "포털 로그인·이용 불가" 자체(로그인 시 status 검사)를 실제로 막는 코드도 외부
--      포털에 있어야 합니다. 이 마이그레이션과 관리자 화면은 status 값을 정확히 관리하고
--      보여줄 뿐, 로그인 자체를 막지는 못합니다 — 외부 포털에 별도 반영이 필요합니다.

-- 1) status에 pending(승인 대기)/rejected(거절) 추가, 신규 가입은 pending으로 시작.
--    (기존 약국 2곳은 이미 'active'라 영향 없음 — 이 default는 "새로 INSERT되는" 행에만 적용)
alter table pharmacies drop constraint if exists pharmacies_status_check;
alter table pharmacies
  add constraint pharmacies_status_check
  check (status in ('pending', 'active', 'suspended', 'rejected', 'deleted'));
alter table pharmacies alter column status set default 'pending';

-- 2) 거절 사유. 승인 목록 화면과 (필요하다면) 외부 포털이 신청자에게 보여줄 때 씁니다.
alter table pharmacies add column if not exists rejection_reason text;

-- 3) 사업자등록번호. "사업자정보"를 텍스트 한 줄로 받는다고 가정했습니다 — 사업자등록증
--    "이미지"까지 별도로 받아야 한다면 알려주세요, business_doc_path 컬럼과 업로드를 추가하겠습니다.
alter table pharmacies add column if not exists business_reg_no text;

-- 4) 면허증 이미지 파일 경로 (pharmacy-docs 버킷 안의 경로만 저장, URL 아님 — 비공개 버킷이라
--    매번 서명된(signed) URL을 새로 발급해서 봅니다).
alter table pharmacies add column if not exists license_image_path text;

-- 5) 면허증 등 서류 저장용 비공개 버킷. public=false — 목록에 뜨지 않고, anon/authenticated
--    누구도 직접 URL로 못 봅니다. 관리자 패널의 service_role만 signed URL을 발급해 열람합니다.
insert into storage.buckets (id, name, public)
values ('pharmacy-docs', 'pharmacy-docs', false)
on conflict (id) do update set public = false;
