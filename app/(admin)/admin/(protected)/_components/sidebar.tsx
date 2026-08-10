'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAdmin } from './logout-action';

const MENU = [
  { href: '/admin/pharmacy-approvals', icon: '📋', label: '가입 승인', badgeKey: 'pending' as const },
  { href: '/admin/no-shows', icon: '🚫', label: '노쇼 관리' },
  { href: '/admin/products', icon: '📦', label: '마스터데이터' },
  { href: '/admin/seed-review', icon: '🌱', label: '씨앗 검토' },
  { href: '/admin/pharmacies', icon: '🏥', label: '약국 관리' },
  { href: '/admin/customers', icon: '👤', label: '손님 관리' },
  { href: '/admin/search-keywords', icon: '🔍', label: '검색 키워드 통계' },
];

export function Sidebar({ adminLabel, pendingCount = 0 }: { adminLabel: string; pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[232px] shrink-0 flex-col bg-toss-surface px-3 py-6">
      <div className="mb-6 px-3 text-[15px] font-semibold text-toss-text">팜들리 관리자</div>

      <nav className="flex flex-1 flex-col gap-1">
        {MENU.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          const badge = item.badgeKey === 'pending' ? pendingCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition-colors ' +
                (active
                  ? 'bg-toss-blueBg font-medium text-toss-blueDark'
                  : 'text-toss-faint hover:bg-toss-bg hover:text-toss-sub')
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="rounded-full bg-toss-red px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-toss-line pt-4 px-3">
        <div className="mb-2 truncate text-[13px] text-toss-faint">{adminLabel}</div>
        <form action={signOutAdmin}>
          <button
            type="submit"
            className="w-full rounded-lg bg-toss-bg px-3 py-2 text-left text-[13px] font-medium text-toss-sub hover:bg-toss-line"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
