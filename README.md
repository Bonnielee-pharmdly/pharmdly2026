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
- `app/pharmacy/page.js` — 약국용 화면
- `app/globals.css` — 디자인(색상·모양)
- `lib/data.js` — 데모용 약국·상품 데이터 (나중에 DB로 교체)
- `lib/store.js` — 주문 저장소 (지금은 브라우저에 저장, 나중에 Supabase로 교체)
- `supabase/schema.sql` — 데이터베이스 설계도
- `docs/prototype.html` — 원본 프로토타입 (전체 기능 참고용)

자세한 진행 방법은 폴더 안의 **팜들리_셀프개발_가이드.md** 를 보세요.
