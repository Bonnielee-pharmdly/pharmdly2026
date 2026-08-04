import { requireAdmin } from '@/lib/admin/auth';
import { Sidebar } from './_components/sidebar';
import { loadPendingCount } from './pharmacy-approvals/actions';

// /admin/* 중 로그인이 필요한 페이지를 전부 감싸는 레이아웃.
// (protected) 세그먼트 덕분에 /admin/login 은 이 가드를 타지 않습니다.
//
// ⚠️ 이 레이아웃의 requireAdmin() 은 "방어 심층화"용입니다.
// 진짜 관문은 각 서버 액션(actions.ts) 맨 첫 줄의 requireAdmin() 호출입니다.
// 서버 액션은 페이지를 거치지 않고 직접 호출될 수 있기 때문입니다.
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin } = await requireAdmin();
  const pendingCount = await loadPendingCount();

  return (
    <div className="flex min-h-screen bg-toss-bg text-toss-text">
      <Sidebar adminLabel={admin.name ?? admin.email ?? ''} pendingCount={pendingCount} />
      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mx-auto max-w-[1300px]">{children}</div>
      </main>
    </div>
  );
}
