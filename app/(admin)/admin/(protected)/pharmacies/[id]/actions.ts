'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';
import type { PharmacyStatus } from '../actions';

// 재고 수량(stock_qty/locked_qty)은 FastAPI 예약 서비스가 실시간으로 계산·갱신합니다.
// 이 화면은 조회만 하고, 절대 이 값을 직접 고치지 않습니다.
export type InventoryRow = {
  id: number;
  product_id: number | null;
  local_name: string;
  price: number | null;
  stock_qty: number;
  locked_qty: number;
};

export type OrderRow = {
  order_no: string;
  visit_time: string | null;
  eta: string | null;
  status: string;
  total: number | null;
  created_at: string;
};

// FastAPI 예약 서비스 소유 테이블. 상태 전이(PENDING→LOCKED→COMPLETED/CANCELLED)와
// 재고 잠금(locked_qty) 로직은 그쪽에 있으므로 여기서는 열람만 합니다.
export type ReservationRow = {
  id: number;
  user_name: string | null;
  user_phone: string;
  product_id: number;
  qty: number;
  status: string;
  reserved_at: string;
};

export type PharmacyDetail = {
  id: number;
  name: string;
  pharmacist: string | null;
  license: string | null;
  address: string | null;
  address_detail: string | null;
  hours: string | null;
  is_late_night: boolean;
  phone: string | null;
  owner_email: string | null;
  status: PharmacyStatus;
};

export type PharmacyWorkspace = {
  pharmacy: PharmacyDetail | null;
  inventory: InventoryRow[];
  orders: OrderRow[];
  reservations: ReservationRow[];
};

export async function loadPharmacyDetail(pharmacyId: number): Promise<PharmacyWorkspace> {
  await requireAdmin();
  const svc = createServiceClient();

  const [{ data: pharmacy }, { data: inventory, error: invErr }, { data: orders, error: ordErr }, { data: reservations, error: resErr }] =
    await Promise.all([
      svc
        .from('pharmacies')
        .select('id, name, pharmacist, license, address, address_detail, hours, is_late_night, phone, owner_email, status')
        .eq('id', pharmacyId)
        .single(),
      svc
        .from('pharmacy_inventory')
        .select('id, product_id, local_name, price, stock_qty, locked_qty')
        .eq('pharmacy_id', pharmacyId)
        .order('id'),
      svc
        .from('orders')
        .select('order_no, visit_time, eta, status, total, created_at')
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false })
        .limit(50),
      svc
        .from('reservations')
        .select('id, user_name, user_phone, product_id, qty, status, reserved_at')
        .eq('pharmacy_id', pharmacyId)
        .order('reserved_at', { ascending: false })
        .limit(50),
    ]);

  if (invErr) throw new Error(invErr.message);
  if (ordErr) throw new Error(ordErr.message);
  if (resErr) throw new Error(resErr.message);

  return {
    pharmacy: (pharmacy as PharmacyDetail) ?? null,
    inventory: (inventory ?? []) as InventoryRow[],
    orders: (orders ?? []) as OrderRow[],
    reservations: (reservations ?? []) as ReservationRow[],
  };
}

const EDITABLE_INFO = ['name', 'pharmacist', 'address', 'address_detail', 'hours', 'phone', 'owner_email'] as const;
type EditableInfo = Partial<Pick<PharmacyDetail, (typeof EDITABLE_INFO)[number]>>;

export async function updatePharmacyInfo(pharmacyId: number, fields: EditableInfo) {
  const { admin } = await requireAdmin();
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE_INFO) {
    if (k in fields) patch[k] = fields[k];
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const svc = createServiceClient();
  const { error } = await svc.from('pharmacies').update(patch).eq('id', pharmacyId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'edit_pharmacy_info', {
    type: 'pharmacy',
    id: String(pharmacyId),
    detail: patch,
  });
  revalidatePath(`/admin/pharmacies/${pharmacyId}`);
  return { ok: true };
}

// 정지/활성화/소프트 삭제. 실제 행은 지우지 않고 status만 바꿉니다.
// status='active'가 아니면 손님 포탈 목록(lib/store.js loadPharmacies)에서 자동으로 숨겨집니다.
// (단, 검색을 담당하는 외부 FastAPI 백엔드 쪽 쿼리도 같은 조건을 확인해야 완전히 반영됩니다 —
//  이 저장소에서는 그 코드를 직접 볼 수 없습니다.)
export async function setPharmacyStatus(pharmacyId: number, status: PharmacyStatus) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { error } = await svc.from('pharmacies').update({ status }).eq('id', pharmacyId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, `pharmacy_set_status_${status}`, {
    type: 'pharmacy',
    id: String(pharmacyId),
  });
  revalidatePath(`/admin/pharmacies/${pharmacyId}`);
  revalidatePath('/admin/pharmacies');
  return { ok: true };
}
