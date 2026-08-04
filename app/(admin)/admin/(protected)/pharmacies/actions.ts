'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

export type PharmacyStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'deleted';

export type PharmacyListRow = {
  id: number;
  name: string;
  pharmacist: string | null;
  address: string | null;
  address_detail: string | null;
  phone: string | null;
  owner_email: string | null;
  status: PharmacyStatus;
};

export async function loadPharmacyList(): Promise<PharmacyListRow[]> {
  await requireAdmin();
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('pharmacies')
    .select('id, name, pharmacist, address, address_detail, phone, owner_email, status')
    .order('id');
  if (error) throw new Error(error.message);
  return (data ?? []) as PharmacyListRow[];
}
