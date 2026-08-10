'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

export type NoShowRow = {
  user_phone: string;
  user_name: string | null;
  no_show_count: number;
  last_no_show_at: string;
  pharmacies: { pharmacy_id: number; count: number }[];
};

// 만료·미완료 예약을 노쇼로 감지(적재)한 뒤, 활성 노쇼 목록을 전화번호 기준으로 집계.
export async function loadNoShows(): Promise<NoShowRow[]> {
  await requireAdmin();
  const svc = createServiceClient();

  // 1) 최신 노쇼 감지 (DB의 detect_no_shows 함수 호출)
  await svc.rpc('detect_no_shows');

  // 2) 활성 노쇼 원본을 읽어 전화번호별로 집계
  const { data, error } = await svc
    .from('no_shows')
    .select('user_phone, user_name, pharmacy_id, occurred_at')
    .eq('is_cleared', false)
    .order('occurred_at', { ascending: false });

  if (error) throw new Error(error.message);

  const byPhone = new Map<string, NoShowRow>();
  for (const r of data ?? []) {
    const key = r.user_phone ?? '(번호없음)';
    if (!byPhone.has(key)) {
      byPhone.set(key, {
        user_phone: key,
        user_name: r.user_name,
        no_show_count: 0,
        last_no_show_at: r.occurred_at,
        pharmacies: [],
      });
    }
    const row = byPhone.get(key)!;
    row.no_show_count += 1;
    const ph = row.pharmacies.find((p) => p.pharmacy_id === r.pharmacy_id);
    if (ph) ph.count += 1;
    else row.pharmacies.push({ pharmacy_id: r.pharmacy_id, count: 1 });
  }

  return [...byPhone.values()].sort((a, b) => b.no_show_count - a.no_show_count);
}

// 특정 전화번호의 노쇼 초기화 (DB의 clear_no_shows 함수 호출 + 감사 로그).
export async function clearNoShows(phone: string) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { data, error } = await svc.rpc('clear_no_shows', {
    p_phone: phone,
    p_admin_id: admin.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/admin/no-shows');
  return { cleared: data as number };
}
