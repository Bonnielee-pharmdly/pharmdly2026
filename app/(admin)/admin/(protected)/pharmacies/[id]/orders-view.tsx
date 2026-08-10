import { SectionTitle, Card, RowList, Row, EmptyState, Badge } from '../../_components/ui';
import type { OrderRow } from './actions';

const STATUS_LABEL: Record<string, string> = {
  requested: '승인 대기',
  confirmed: '주문 승인',
  ready: '픽업 준비 완료',
  done: '픽업 완료',
  rejected: '주문 불가(거절)',
  cancelled: '자동 취소',
};
const STATUS_TONE: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  requested: 'yellow',
  confirmed: 'blue',
  ready: 'blue',
  done: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

// 읽기 전용 — 이 저장소(app/page.js, lib/store.js)가 직접 다루는 데모/구주문 테이블입니다.
export function OrdersView({ rows }: { rows: OrderRow[] }) {
  return (
    <div>
      <SectionTitle>주문 (열람 전용, 최근 50건)</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState>주문 내역이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((o) => (
              <Row key={o.order_no}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-toss-text">{o.order_no}</div>
                  <div className="mt-0.5 text-[13px] text-toss-faint">{o.visit_time ?? '-'}</div>
                </div>
                <Badge tone={STATUS_TONE[o.status] ?? 'gray'}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                <div className="w-24 text-[13px] text-toss-faint">{o.eta ?? '-'}</div>
                <div className="w-24 text-right text-[14px] font-medium text-toss-text">
                  {(o.total ?? 0).toLocaleString('ko-KR')}원
                </div>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
