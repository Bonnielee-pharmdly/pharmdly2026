'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/admin/service-client';

export type Period = 'today' | 'week' | 'month';

export type KeywordStat = {
  keyword: string;
  count: number;
};

export type KeywordStatsResult = {
  rows: KeywordStat[];
  totalSearches: number;
  tableMissing: boolean; // search_logs 마이그레이션이 아직 실행 안 됐으면 true
};

const FETCH_LIMIT = 10000; // 한 번에 집계할 최대 로그 행 수 (검색량이 아주 커지면 RPC 집계로 바꾸는 게 좋음)
const TOP_N = 50;

// KST(UTC+9, 고정 오프셋)에서의 기간 시작 시각을 UTC ISO 문자열로 계산.
function periodStartUtcIso(period: Period): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000); // 이 Date의 UTC 필드 = KST 벽시계 값
  let y = kst.getUTCFullYear();
  let m = kst.getUTCMonth();
  let d = kst.getUTCDate();

  if (period === 'week') {
    const day = kst.getUTCDay(); // 0=일 ~ 6=토
    const diffToMonday = (day + 6) % 7;
    d -= diffToMonday;
  } else if (period === 'month') {
    d = 1;
  }

  const asIfUtc = Date.UTC(y, m, d, 0, 0, 0);
  const realUtcMs = asIfUtc - 9 * 60 * 60 * 1000; // KST 자정을 실제 UTC 시각으로 되돌림
  return new Date(realUtcMs).toISOString();
}

export async function loadKeywordStats(period: Period): Promise<KeywordStatsResult> {
  await requireAdmin();
  const svc = createServiceClient();

  const since = periodStartUtcIso(period);
  const { data, error } = await svc
    .from('search_logs')
    .select('keyword')
    .gte('searched_at', since)
    .order('searched_at', { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) {
    if (error.code === 'PGRST205') {
      // supabase/upgrade5.sql 이 아직 실행 안 됨
      return { rows: [], totalSearches: 0, tableMissing: true };
    }
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const kw = (row.keyword ?? '').trim();
    if (!kw) continue;
    counts.set(kw, (counts.get(kw) ?? 0) + 1);
  }

  const rows = [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);

  return { rows, totalSearches: data?.length ?? 0, tableMissing: false };
}
