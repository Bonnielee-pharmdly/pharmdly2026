import { loadKeywordStats, type Period } from './actions';
import { PageHeader, Card, RowList, Row, EmptyState, PillTabs } from '../_components/ui';

export const dynamic = 'force-dynamic';

const TABS: { key: Period; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번주' },
  { key: 'month', label: '이번달' },
];

export default async function SearchKeywordsPage({
  searchParams,
}: {
  searchParams: { period?: Period };
}) {
  const period: Period = ['today', 'week', 'month'].includes(searchParams.period ?? '')
    ? (searchParams.period as Period)
    : 'today';

  const { rows, totalSearches, tableMissing } = await loadKeywordStats(period);
  const tabHref = (p: Period) => `/admin/search-keywords?period=${p}`;

  return (
    <div>
      <PageHeader
        title="검색 키워드 통계"
        description="손님이 많이 검색한 키워드 순위입니다. 누가 검색했는지는 저장하지 않고 키워드·횟수만 집계합니다. 검색 로그 적재는 FastAPI 백엔드가 담당하며, 여기서는 조회만 합니다."
      />

      <div className="mb-4">
        <PillTabs options={TABS} value={period} hrefFor={tabHref} />
      </div>

      {tableMissing ? (
        <EmptyState>
          search_logs 테이블이 아직 없어요. supabase/upgrade5.sql을 먼저 실행해주세요.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>아직 검색 기록이 없어요.</EmptyState>
      ) : (
        <Card>
          <p className="mb-3 text-[13px] text-toss-faint">
            {TABS.find((t) => t.key === period)?.label} 기준 총 검색 {totalSearches.toLocaleString()}건
          </p>
          <RowList>
            {rows.map((r, i) => (
              <Row key={r.keyword}>
                <div className={`w-8 text-[14px] font-semibold ${i < 3 ? 'text-toss-blue' : 'text-toss-faint'}`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 text-[14px] text-toss-text">{r.keyword}</div>
                <div className="text-[14px] font-medium text-toss-text">{r.count.toLocaleString()}회</div>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
