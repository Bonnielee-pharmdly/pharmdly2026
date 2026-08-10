'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

export type ApprovalStatus = 'pending' | 'rejected';

export type ApprovalListRow = {
  id: number;
  name: string;
  pharmacist: string | null;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  license: string | null;
  created_at: string;
  rejection_reason: string | null;
};

export async function loadApprovalQueue(status: ApprovalStatus): Promise<ApprovalListRow[]> {
  await requireAdmin();
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('pharmacies')
    .select('id, name, pharmacist, address, phone, owner_email, license, created_at, rejection_reason')
    .eq('status', status)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApprovalListRow[];
}

// 사이드바에 대기 건수 뱃지를 보여주기 위한 용도.
export async function loadPendingCount(): Promise<number> {
  await requireAdmin();
  const svc = createServiceClient();
  const { count, error } = await svc
    .from('pharmacies')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return count ?? 0;
}
