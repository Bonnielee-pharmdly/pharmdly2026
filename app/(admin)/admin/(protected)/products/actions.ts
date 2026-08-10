'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';
import { PRODUCT_TYPES, SORT_KEYS, type SortKey, type SortDir } from '@/lib/admin/product-types';
export type { SortKey, SortDir };

export type Product = {
  product_id: number;
  barcode: string | null;
  standard_name: string | null;
  base_name: string | null;
  manufacturer: string | null;
  package_unit: string | null;
  unit_label: string | null;
  reference_price: number | null;
  product_type: string | null;
  image_url: string | null;
  is_active: boolean;
};

export type ProductStatus = 'active' | 'inactive' | 'all';

// 이 UI 에서 수정 가능한 컬럼만 화이트리스트로 제한.
const EDITABLE = [
  'barcode',
  'standard_name',
  'unit_label',
  'manufacturer',
  'reference_price',
  'product_type',
] as const;

type EditableFields = Partial<Pick<Product, (typeof EDITABLE)[number]>>;

function sanitizeSearch(s: string) {
  return s.replace(/[,()]/g, '').trim();
}

function pickEditable(fields: EditableFields) {
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in fields) patch[k] = (fields as Record<string, unknown>)[k];
  }
  if ('product_type' in patch) {
    const v = patch.product_type;
    if (v !== null && v !== '' && !PRODUCT_TYPES.includes(v as never)) {
      throw new Error('허용되지 않은 분류 값입니다.');
    }
    if (v === '') patch.product_type = null;
  }
  if ('reference_price' in patch) {
    const v = patch.reference_price;
    patch.reference_price = v === '' || v === null ? null : Number(v);
  }
  return patch;
}

export async function loadProducts(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: ProductStatus;
  sort?: SortKey;
  dir?: SortDir;
}) {
  await requireAdmin();
  const svc = createServiceClient();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 50;
  const status = params.status ?? 'active';
  const sort: SortKey = SORT_KEYS.includes(params.sort as SortKey) ? (params.sort as SortKey) : 'created_at';
  const dir: SortDir = params.dir === 'desc' ? 'desc' : 'asc';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 5,292건 전체를 대상으로 DB에서 정렬 후 range()로 페이지를 자른다 — 페이지 안에서만
  // 정렬하면 안 된다는 요구사항 그대로. product_id를 항상 2차 정렬로 붙여서(동률이 많은
  // 컬럼 — 예: 참고가/분류 비어있는 행들) 페이지를 넘겨도 순서가 흔들리지 않게 한다.
  let q = svc
    .from('products')
    .select(
      'product_id, barcode, standard_name, base_name, manufacturer, package_unit, unit_label, reference_price, product_type, image_url, is_active',
      { count: 'exact' },
    )
    .order(sort, { ascending: dir === 'asc', nullsFirst: false })
    .order('product_id', { ascending: true })
    .range(from, to);

  if (status === 'active') q = q.eq('is_active', true);
  else if (status === 'inactive') q = q.eq('is_active', false);

  const search = params.search ? sanitizeSearch(params.search) : '';
  if (search) {
    q = q.or(`standard_name.ilike.%${search}%,barcode.ilike.%${search}%`);
  }

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  return { rows: (data ?? []) as Product[], total: count ?? 0, page, pageSize, sort, dir };
}

export async function updateProduct(productId: number, fields: EditableFields) {
  const { admin } = await requireAdmin();
  const patch = pickEditable(fields);
  if (Object.keys(patch).length === 0) return { ok: true };

  const svc = createServiceClient();
  const { error } = await svc.from('products').update(patch).eq('product_id', productId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'edit_product', {
    type: 'product',
    id: String(productId),
    detail: patch,
  });
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function createProduct(fields: EditableFields) {
  const { admin } = await requireAdmin();
  const patch = pickEditable(fields);
  if (!patch.standard_name) throw new Error('제품명은 필수입니다.');

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('products')
    .insert(patch)
    .select('product_id')
    .single();
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'create_product', {
    type: 'product',
    id: String(data.product_id),
    detail: patch,
  });
  revalidatePath('/admin/products');
  return { product_id: data.product_id as number };
}

// 소프트 삭제(숨김) / 복원. 실제 행은 지우지 않고 is_active 만 토글.
// 약국·손님 포탈의 제품 조회 쿼리에는 반드시 is_active = true 조건을 추가해야
// 숨김 처리가 실제로 반영됩니다. (이 저장소 안에는 products 를 직접 조회하는
// 코드가 없고, 검색은 외부 FastAPI 백엔드(PHARMDLY_API)가 담당합니다 — 그 서비스
// 쪽 쿼리에도 이 조건이 있는지 별도로 확인이 필요합니다.)
export async function setProductActive(productId: number, active: boolean) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const { error } = await svc
    .from('products')
    .update({ is_active: active })
    .eq('product_id', productId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, active ? 'restore_product' : 'hide_product', {
    type: 'product',
    id: String(productId),
  });
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function uploadProductImage(productId: number, formData: FormData) {
  const { admin } = await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('파일이 없습니다.');

  const svc = createServiceClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `products/${productId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await svc.storage
    .from('product-images')
    .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = svc.storage.from('product-images').getPublicUrl(path);
  const { error } = await svc
    .from('products')
    .update({ image_url: pub.publicUrl })
    .eq('product_id', productId);
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'edit_product_image', {
    type: 'product',
    id: String(productId),
  });
  revalidatePath('/admin/products');
  return { url: pub.publicUrl };
}
