import './admin-tailwind.css';

// /admin/* 전체(로그인 페이지 포함)에 Tailwind + 토스 스타일 토큰만 적용하는 얕은 레이아웃.
// 인증 가드는 여기 두지 않습니다 — admin/login 이 이 레이아웃 아래에 있으므로
// 여기서 requireAdmin() 을 호출하면 로그인 페이지 자체가 막혀버립니다.
// 실제 가드는 app/(admin)/admin/(protected)/layout.tsx 에 있습니다.
//
// id="admin-root": 손님 앱의 body 폭 제한(max-width:430px)을 admin-tailwind.css의
// body:has(#admin-root) 규칙이 이 id의 존재 여부로 감지해 풀어줍니다.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="admin-root" className="font-sans">
      {children}
    </div>
  );
}
