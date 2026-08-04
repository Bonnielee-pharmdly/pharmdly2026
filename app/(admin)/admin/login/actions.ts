'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/admin/service-client';

export type LoginState = { error: string } | null;

export async function signInAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };

  // 로그인은 됐지만 admins 에 등록된 관리자여야만 통과.
  const svc = createServiceClient();
  const { data: admin } = await svc
    .from('admins')
    .select('id, is_active')
    .eq('id', data.user.id)
    .single();

  if (!admin || !admin.is_active) {
    await supabase.auth.signOut();
    return { error: '관리자 권한이 없는 계정입니다.' };
  }

  redirect('/admin/no-shows');
}
