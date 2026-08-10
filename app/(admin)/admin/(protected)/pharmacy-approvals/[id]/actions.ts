'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

export type Application = {
  id: number;
  name: string;
  pharmacist: string | null;
  license: string | null;
  business_reg_no: string | null;
  address: string | null;
  address_detail: string | null;
  phone: string | null;
  owner_email: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  licenseImageUrl: string | null; // 비공개 버킷이라 매 조회마다 새로 서명한 임시 URL
};

// 면허증 등 민감 서류를 열람하는 것 자체를 감사 로그에 남깁니다.
export async function loadApplication(pharmacyId: number): Promise<Application> {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from('pharmacies')
    .select('id, name, pharmacist, license, business_reg_no, address, address_detail, phone, owner_email, status, rejection_reason, created_at, license_image_path')
    .eq('id', pharmacyId)
    .single();
  if (error || !data) throw new Error(error?.message ?? '약국을 찾을 수 없습니다.');

  let licenseImageUrl: string | null = null;
  if (data.license_image_path) {
    const { data: signed } = await svc.storage
      .from('pharmacy-docs')
      .createSignedUrl(data.license_image_path, 300); // 5분짜리 임시 URL
    licenseImageUrl = signed?.signedUrl ?? null;
    await logAdminAction(admin.id, 'view_pharmacy_license', {
      type: 'pharmacy',
      id: String(pharmacyId),
    });
  }

  const { license_image_path, ...rest } = data;
  return { ...rest, licenseImageUrl } as Application;
}

export async function approvePharmacy(pharmacyId: number) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { error } = await svc
    .from('pharmacies')
    .update({ status: 'active', rejection_reason: null })
    .eq('id', pharmacyId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'approve_pharmacy', { type: 'pharmacy', id: String(pharmacyId) });
  revalidatePath(`/admin/pharmacy-approvals/${pharmacyId}`);
  revalidatePath('/admin/pharmacy-approvals');
  revalidatePath('/admin/pharmacies');
  return { ok: true };
}

export async function rejectPharmacy(pharmacyId: number, reason: string) {
  const { admin } = await requireAdmin();
  if (!reason.trim()) throw new Error('거절 사유를 입력해주세요.');
  const svc = createServiceClient();

  const { error } = await svc
    .from('pharmacies')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', pharmacyId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'reject_pharmacy', {
    type: 'pharmacy',
    id: String(pharmacyId),
    detail: { reason: reason.trim() },
  });
  revalidatePath(`/admin/pharmacy-approvals/${pharmacyId}`);
  revalidatePath('/admin/pharmacy-approvals');
  revalidatePath('/admin/pharmacies');
  return { ok: true };
}
