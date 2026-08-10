import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from './service-client';

// 현재 로그인한 Supabase Auth 사용자를 읽는 SSR 클라이언트.
function createAuthClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 에서 호출된 경우 무시 (middleware 에서 갱신)
          }
        },
      },
    },
  );
}

// 관리자 인증 게이트. 모든 대행 서버 액션의 첫 줄에서 호출해야 합니다.
//  - 로그인 안 됨          => /admin/login 으로 리다이렉트
//  - 로그인했으나 admins 에 없거나 비활성 => /admin/login 으로 리다이렉트
//  - 통과하면 { user, admin } 반환
export async function requireAdmin() {
  const supabase = createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  // admins 조회는 service_role 로 (admins 테이블은 RLS 잠금 상태)
  const svc = createServiceClient();
  const { data: admin } = await svc
    .from('admins')
    .select('id, name, email, is_active')
    .eq('id', user.id)
    .single();

  if (!admin || !admin.is_active) redirect('/admin/login');

  return { user, admin };
}

// 감사 로그 헬퍼: 대행/변경 등 민감 작업 시 호출.
export async function logAdminAction(
  adminId: string,
  actionType: string,
  target?: { type?: string; id?: string; detail?: unknown },
) {
  const svc = createServiceClient();
  await svc.from('admin_action_log').insert({
    admin_id: adminId,
    action_type: actionType,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    detail: target?.detail ?? null,
  });
}
