# 팜들리 (Pharmdly) 앱

동네 약국 재고 확인 → 픽업 예약 서비스의 웹앱입니다.

## 처음 실행하는 법 (3줄)

```bash
npm install   # 부품 내려받기 (처음 한 번만, 5분쯤 걸려요)
npm run dev   # 앱 켜기
```

켜진 뒤 브라우저에서 http://localhost:3000 을 열면 환자용 화면,
http://localhost:3000/pharmacy 를 열면 약국용 화면이 나옵니다.

## 폴더 안내

- `app/page.js` — 환자용 화면
- `app/pharmacy/page.js` — 약국용 화면(외부 약국 포탈로 이동)
- `app/(admin)/admin/**` — 관리자 패널 (아래 참고)
- `app/globals.css` — 디자인(색상·모양)
- `lib/data.js` — 데모용 약국·상품 데이터 (나중에 DB로 교체)
- `lib/store.js` — 주문 저장소 (지금은 브라우저에 저장, 나중에 Supabase로 교체)
- `lib/admin/` — 관리자 패널 전용 서버 코드 (service_role, 인증 게이트)
- `supabase/schema.sql`, `upgrade1.sql`, `upgrade2.sql`, `upgrade3.sql` — 데이터베이스 설계도(순서대로 SQL Editor에서 실행)
- `docs/prototype.html` — 원본 프로토타입 (전체 기능 참고용)

자세한 진행 방법은 폴더 안의 **팜들리_셀프개발_가이드.md** 를 보세요.

## 관리자 패널 (`/admin`)

약국·손님을 **관제(모니터링)**하는 화면입니다. 약국이나 손님으로 로그인해서 대신 조작하지 않고,
열람과 정지·삭제·차단 같은 제한된 관리만 합니다. 재고 계산이나 예약 잠금처럼 외부 FastAPI
백엔드가 소유한 로직은 건드리지 않고 화면에 표시만 합니다(🔒 FastAPI 관리 태그). 설계 원칙은
`docs/admin-security-design.md` 참고(단, 그 문서의 "대행" 절은 예전 방향이고 실제 구현은 아래 메뉴
기준입니다). 로컬에서 켜려면:

1. `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`를 추가하세요 (Supabase → Settings → API → service_role).
   `env.local.example.txt`에 형식이 있습니다. **이 키는 절대 `NEXT_PUBLIC_` 접두어를 붙이지 마세요.**
2. Supabase SQL Editor에서 `supabase/upgrade3.sql`을 한 번 실행하세요.
3. 관리자 계정 만들기: Supabase 대시보드 → Authentication → Add user 로 이메일/비밀번호 계정을 만든 뒤,
   그 사용자의 UID를 복사해 SQL Editor에서 실행:
   ```sql
   insert into admins (id, name, email, is_active)
   values ('여기에_방금_만든_사용자_UID', '이름', '이메일', true);
   ```
4. `npm run dev` 후 `http://localhost:3000/admin/login` 접속.

메뉴:
- 노쇼 관리(`/admin/no-shows`) — 활성 노쇼 열람·초기화
- 마스터데이터(`/admin/products`) — 제품 정보 편집, 노출/숨김
- 약국 관리(`/admin/pharmacies`) — 약국 목록·재고/주문/예약 열람, 정보 수정, 정지/활성화/소프트 삭제
- 손님 관리(`/admin/customers`) — 예약 손님 목록·예약/노쇼 이력 열람, 부적절한 예약 취소/삭제, 손님 차단

정지·삭제된 약국은 `lib/store.js`의 손님 포탈 약국 목록에서 자동으로 빠집니다. 손님 차단은 관리자
패널에 기록만 되고, 실제로 새 예약을 막으려면 예약을 만드는 FastAPI 백엔드 쪽에서
`blocked_customers` 테이블을 확인하도록 반영해야 합니다(이 저장소만으로는 안 됨).
