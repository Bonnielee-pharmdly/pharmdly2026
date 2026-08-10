import { loadNoShows } from './actions';
import { ClearButton } from './clear-button';
import { PageHeader, Card, RowList, Row, EmptyState } from '../_components/ui';

export const dynamic = 'force-dynamic';

export default async function NoShowsPage() {
  const rows = await loadNoShows();

  return (
    <div>
      <PageHeader title="노쇼 관리" description="만료됐지만 완료되지 않은 예약을 노쇼로 집계합니다. 전화번호 기준." />

      {rows.length === 0 ? (
        <EmptyState>활성 노쇼가 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((r) => (
              <Row key={r.user_phone}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-toss-text">{r.user_name ?? '-'}</div>
                  <div className="mt-0.5 text-[13px] text-toss-faint">{r.user_phone}</div>
                </div>
                <div className="w-24 text-[14px] font-medium text-toss-text">{r.no_show_count}회</div>
                <div className="w-40 truncate text-[13px] text-toss-faint">
                  {r.pharmacies.map((p) => `#${p.pharmacy_id}(${p.count})`).join(', ')}
                </div>
                <div className="w-40 text-[13px] text-toss-faint">
                  {new Date(r.last_no_show_at).toLocaleString('ko-KR')}
                </div>
                <ClearButton phone={r.user_phone} />
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
