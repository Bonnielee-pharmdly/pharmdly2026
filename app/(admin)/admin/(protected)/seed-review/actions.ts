'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

// seed_review_queue 뷰의 한 행. 뷰가 band(mid→low) 순으로 이미 정렬돼 있음.
export type SeedReviewRow = {
  id: number;
  raw_name: string | null;
  barcode: string | null;
  band: 'mid' | 'low';
  similarity: number | null;
  matched_item_seq: string | null;
  suggested_drug_name: string | null;
  decision: string;
};

// approve_seed_review 가 받는 액션 값.
export type SeedAction = 'link_drug' | 'new_drug' | 'new_supplement' | 'new_general' | 'new_animal' | 'reject';

// categories 테이블의 효능 분류. parent_id 로 2단 계층(NULL=대분류, 값 있으면 소분류).
export type Category = {
  category_id: number;
  category_name: string;
  icon: string | null;
  sort_order: number | null;
  parent_id: number | null;
};

// 효능 분류 전체를 sort_order 순으로 불러온다. 수동 등록 시 효능 선택 UI에서 사용.
export async function loadCategories(): Promise<Category[]> {
  await requireAdmin();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from('categories')
    .select('category_id, category_name, icon, sort_order, parent_id')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

// decision='pending' 인 검토 대기 항목을 뷰 정렬(mid 먼저, low 나중) 그대로 불러온다.
export async function loadSeedReviewQueue(): Promise<SeedReviewRow[]> {
  await requireAdmin();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from('seed_review_queue')
    .select('id, raw_name, barcode, band, similarity, matched_item_seq, suggested_drug_name, decision')
    .eq('decision', 'pending');

  if (error) throw new Error(error.message);
  return (data ?? []) as SeedReviewRow[];
}

// 한 검토 항목에 대해 approve_seed_review 함수를 호출한다.
// 액션별로 필요한 인자만 채우고 나머지는 null 로 넘긴다.
//  - link_drug       : ref = matched_item_seq (이 약이 맞다고 확정, 기존 의약품에 연결)
//  - new_drug        : name + entpName (목록에 없는 의약품 신규 등록)
//  - new_supplement  : name (건기식 신규 등록)
//  - new_general     : name (잡화/기타 신규 등록)
//  - new_animal      : name + entpName (동물의약품 신규 등록)
//  - reject          : 버림
// categoryIds 는 수동 등록(new_*)일 때 관리자가 고른 효능 분류 id(최대 3개).
// link_drug 는 함수가 drug_master 분류를 자동으로 넣으므로 넘기지 않는다.
export async function approveSeedReview(params: {
  reviewId: number;
  action: SeedAction;
  ref?: string | null;
  name?: string | null;
  entpName?: string | null;
  categoryIds?: number[] | null;
}) {
  const { admin } = await requireAdmin();
  const svc = createServiceClient();

  const categoryIds = params.categoryIds?.length ? params.categoryIds : null;

  const { error } = await svc.rpc('approve_seed_review', {
    p_review_id: params.reviewId,
    p_action: params.action,
    p_ref_code: params.ref ?? null,
    p_name: params.name ?? null,
    p_entp_name: params.entpName ?? null,
    p_category_ids: categoryIds,
    // requireAdmin() 이 돌려주는 admin.id (Supabase Auth 사용자 id).
    // clear_no_shows 등 다른 RPC 도 같은 값을 관리자 식별자로 넘긴다.
    p_reviewer: admin.id,
  });
  if (error) throw new Error(error.message);

  await logAdminAction(admin.id, 'seed_review', {
    type: 'seed_review',
    id: String(params.reviewId),
    detail: { action: params.action, ref: params.ref ?? null, name: params.name ?? null, categoryIds },
  });

  revalidatePath('/admin/seed-review');
  return { ok: true };
}
