import type { NoShowRow } from './actions';
import { SectionTitle, Card, RowList, Row, EmptyState, Badge } from '../../_components/ui';

// 읽기 전용 — 노쇼 감지/집계 로직은 DB 함수 detect_no_shows()가 담당합니다 (/admin/no-shows 참고).
export function NoShowsPanel({ rows }: { rows: NoShowRow[] }) {
  const active = rows.filter((r) => !r.is_cleared);
  return (
    <div>
      <SectionTitle>노쇼 이력</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState>노쇼 이력이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((r) => (
              <Row key={r.id}>
                <div className="min-w-0 flex-1 text-[14px] text-toss-text">약국 #{r.pharmacy_id}</div>
                <div className="w-40 text-[13px] text-toss-faint">{new Date(r.occurred_at).toLocaleString('ko-KR')}</div>
                <Badge tone={r.is_cleared ? 'gray' : 'red'}>{r.is_cleared ? '초기화됨' : '활성'}</Badge>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
      {active.length > 0 && (
        <p className="mt-2 text-[12px] text-toss-faint">
          활성 노쇼 초기화는 <a href="/admin/no-shows" className="text-toss-blue underline">노쇼 관리</a> 화면에서 합니다.
        </p>
      )}
    </div>
  );
}
