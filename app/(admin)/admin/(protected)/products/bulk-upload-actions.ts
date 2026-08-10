'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';
import { parseWorkbook, classifyRows, type BulkUploadResult } from '@/lib/admin/products-excel';

async function classifyFromFile(formData: FormData): Promise<BulkUploadResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('파일이 없습니다.');
  if (!file.name.match(/\.xlsx?$/i)) throw new Error('.xlsx 또는 .xls 파일만 업로드할 수 있습니다.');

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawRows = parseWorkbook(buffer);

  const svc = createServiceClient();
  const barcodes = [...new Set(rawRows.map((r) => String(r['바코드'] ?? '').trim()).filter(Boolean))];
  const existingByBarcode = new Map<string, number[]>();
  if (barcodes.length > 0) {
    const { data, error } = await svc.from('products').select('product_id, barcode').in('barcode', barcodes);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const list = existingByBarcode.get(row.barcode as string) ?? [];
      list.push(row.product_id as number);
      existingByBarcode.set(row.barcode as string, list);
    }
  }

  return classifyRows(rawRows, existingByBarcode);
}

// 미리보기 전용 — DB에 아무것도 쓰지 않는다.
export async function previewBulkUpload(formData: FormData): Promise<BulkUploadResult> {
  await requireAdmin();
  return classifyFromFile(formData);
}

// 확인 버튼을 눌렀을 때만 호출. 파일을 다시 파싱·검증해서(클라이언트가 보낸 값을 그대로
// 믿지 않고) 신규는 insert, 수정은 product_id 기준 update.
export async function applyBulkUpload(formData: FormData): Promise<BulkUploadResult & { applied: number }> {
  const { admin } = await requireAdmin();
  const result = await classifyFromFile(formData);

  const newRows = result.rows.filter((r) => r.status === 'new');
  const updateRows = result.rows.filter((r) => r.status === 'update');

  const svc = createServiceClient();

  if (newRows.length > 0) {
    const { error } = await svc.from('products').insert(
      newRows.map((r) => ({
        barcode: r.barcode,
        standard_name: r.standard_name,
        manufacturer: r.manufacturer,
        unit_label: r.unit_label,
        reference_price: r.reference_price,
        product_type: r.product_type,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (updateRows.length > 0) {
    const results = await Promise.all(
      updateRows.map((r) =>
        svc
          .from('products')
          .update({
            standard_name: r.standard_name,
            manufacturer: r.manufacturer,
            unit_label: r.unit_label,
            reference_price: r.reference_price,
            product_type: r.product_type,
          })
          .eq('product_id', r.matchedProductId!),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }

  const applied = newRows.length + updateRows.length;
  await logAdminAction(admin.id, 'bulk_upload_products', {
    type: 'product',
    detail: {
      applied,
      new: result.newCount,
      updated: result.updateCount,
      errors: result.errorCount,
      barcodes: [...newRows, ...updateRows].map((r) => r.barcode),
    },
  });

  revalidatePath('/admin/products');
  return { ...result, applied };
}
