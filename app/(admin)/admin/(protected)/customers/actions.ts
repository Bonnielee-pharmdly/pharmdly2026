'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

export type CustomerListRow = {
  user_phone: string;
  user_name: string | null;
  reservation_count: number;
  last_reserved_at: string;
  blocked: boolean;
};

// 예약 테이블을 전화번호 기준으로 모아 손님 목록을 만듭니다.
// (손님 계정 테이블이 따로 없고, 예약이 전화번호로만 연결되어 있습니다 — reservations.user_phone)
// 최근 500건 기준 집계입니다. 서비스가 커지면 DB 뷰/RPC로 옮기는 게 좋습니다.
export async function loadCustomerList(): Promise<CustomerListRow[]> {
  await requireAdmin();
  const svc = createServiceClient();

  const [{ data: reservations, error: resErr }, { data: blocked, error: blockErr }] = await Promise.all([
    svc
      .from('reservations')
      .select('user_phone, user_name, reserved_at')
      .order('reserved_at', { ascending: false })
      .limit(500),
    svc.from('blocked_customers').select('user_phone'),
  ]);
  if (resErr) throw new Error(resErr.message);
  if (blockErr) throw new Error(blockErr.message);

  const blockedSet = new Set((blocked ?? []).map((b) => b.user_phone));
  const byPhone = new Map<string, CustomerListRow>();
  for (const r of reservations ?? []) {
    const key = r.user_phone;
    if (!key) continue;
    if (!byPhone.has(key)) {
      byPhone.set(key, {
        user_phone: key,
        user_name: r.user_name,
        reservation_count: 0,
        last_reserved_at: r.reserved_at,
        blocked: blockedSet.has(key),
      });
    }
    byPhone.get(key)!.reservation_count += 1;
  }

  return [...byPhone.values()].sort(
    (a, b) => +new Date(b.last_reserved_at) - +new Date(a.last_reserved_at),
  );
}
