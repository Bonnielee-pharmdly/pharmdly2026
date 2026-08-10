'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

// 예약 상태값 (실제 DB의 reservationstatus enum에서 확인된 값).
// 상태 전이 자체는 FastAPI 예약 서비스가 관리합니다 — 여기서는 취소/삭제만 합니다.
export type ReservationStatus = 'PENDING' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';

export type ReservationRow = {
  id: number;
  pharmacy_id: number;
  product_id: number;
  qty: number;
  status: ReservationStatus;
  reserved_at: string;
  expires_at: string | null;
};

export type NoShowRow = {
  id: number;
  pharmacy_id: number;
  occurred_at: string;
  is_cleared: boolean;
};

export type CustomerDetail = {
  phone: string;
  userName: string | null;
  blocked: boolean;
  blockedReason: string | null;
  reservations: ReservationRow[];
  noShows: NoShowRow[];
};

// 손님 정보(전화번호·예약 이력)는 PII입니다. 열람만 해도 감사 로그에 남깁니다. (설계 문서 6·7절)
export async function logCustomerView(phone: string) {
  const { admin } = await requireAdmin();
  await logAdminAction(admin.id, 'view_customer', { type: 'customer', id: phone });
}

export async function loadCustomerDetail(phone: string): Promise<CustomerDetail> {
  await requireAdmin();
  const svc = createServiceClient();

  const [{ data: reservations, error: resErr }, { data: noShows, error: nsErr }, { data: block, error: blockErr }] =
    await Promise.all([
      svc
        .from('reservations')
        .select('id, pharmacy_id, product_id, qty, status, reserved_at, expires_at, user_name')
        .eq('user_phone', phone)
        .order('reserved_at', { ascending: false }),
      svc
        .from('no_shows')
        .select('id, pharmacy_id, occurred_at, is_cleared')
        .eq('user_phone', phone)
        .order('occurred_at', { ascending: false }),
      svc.from('blocked_customers').select('reason').eq('user_phone', phone).maybeSingle(),
    ]);
  if (resErr) throw new Error(resErr.message);
  if (nsErr) throw new Error(nsErr.message);
  if (blockErr) throw new Error(blockErr.message);

  return {
    phone,
    userName: reservations?.[0]?.user_name ?? null,
    blocked: !!block,
    blockedReason: block?.reason ?? null,
    reservations: (reservations ?? []) as ReservationRow[],
    noShows: (noShows ?? []) as NoShowRow[],
  };
}

// 예약 취소. 상태만 CANCELLED로 바꿉니다.
// ⚠️ 재고 잠금(pharmacy_inventory.locked_qty) 해제는 FastAPI 예약 서비스의 몫이라
// 여기서는 건드리지 않습니다 — 이 취소가 재고 수치에 곧바로 반영되지 않을 수 있습니다.
// (그쪽 서비스가 만료·취소 상태를 주기적으로 정리하는 방식일 가능성이 높습니다.)
export async function cancelReservationAsAdmin(phone: string, reservationId: number) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { data: reservation, error: findErr } = await svc
    .from('reservations')
    .select('id, user_phone, status')
    .eq('id', reservationId)
    .eq('user_phone', phone) // 다른 손님 예약을 잘못 건드리지 않도록 소유자 확인
    .single();
  if (findErr || !reservation) throw new Error('예약을 찾을 수 없습니다.');
  if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
    throw new Error('이미 종료된 예약입니다.');
  }

  const { error } = await svc.from('reservations').update({ status: 'CANCELLED' }).eq('id', reservationId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'admin_cancel_reservation', {
    type: 'customer',
    id: phone,
    detail: { reservation_id: reservationId, previous_status: reservation.status },
  });
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  return { ok: true };
}

// 부적절한 예약 행 자체를 삭제(하드 삭제)합니다. 스팸/오입력 등 완전히 지워야 할 때만 사용하세요.
export async function deleteReservationAsAdmin(phone: string, reservationId: number) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { error } = await svc.from('reservations').delete().eq('id', reservationId).eq('user_phone', phone);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'admin_delete_reservation', {
    type: 'customer',
    id: phone,
    detail: { reservation_id: reservationId },
  });
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  return { ok: true };
}

// 문제 손님 차단. 이 목록은 관리자 패널이 "차단했다"는 사실만 남깁니다.
// ⚠️ 실제로 새 예약을 막으려면 예약 생성 로직을 가진 FastAPI 백엔드가 이 테이블을
// 확인하도록 그쪽에서도 반영해야 합니다 — 이 저장소만으로는 예약 자체를 막지 못합니다.
export async function blockCustomer(phone: string, reason: string) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { error } = await svc
    .from('blocked_customers')
    .upsert({ user_phone: phone, reason: reason || null, blocked_by: admin.id, blocked_at: new Date().toISOString() });
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'block_customer', { type: 'customer', id: phone, detail: { reason } });
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  revalidatePath('/admin/customers');
  return { ok: true };
}

export async function unblockCustomer(phone: string) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { error } = await svc.from('blocked_customers').delete().eq('user_phone', phone);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'unblock_customer', { type: 'customer', id: phone });
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`);
  revalidatePath('/admin/customers');
  return { ok: true };
}
