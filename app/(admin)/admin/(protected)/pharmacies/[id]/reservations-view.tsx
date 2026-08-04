import { FastApiOwnedTag, SectionTitle, Card, RowList, Row, EmptyState, Badge } from '../../_components/ui';
import type { ReservationRow } from './actions';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인/결제 대기',
  LOCKED: '예약금 결제 완료',
  COMPLETED: '픽업 완료',
  CANCELLED: '취소됨',
};
const STATUS_TONE: Record<string, 'blue' | 'green' | 'yellow' | 'red'> = {
  PENDING: 'yellow',
  LOCKED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

// 읽기 전용 — FastAPI 예약 서비스가 상태 전이와 재고 잠금을 관리합니다.
// 예약을 취소/삭제하려면 손님 관리(/admin/customers) 쪽에서 손님 기준으로 처리하세요.
export function ReservationsView({ rows }: { rows: ReservationRow[] }) {
  return (
    <div>
      <SectionTitle>예약 (열람 전용, 최근 50건) <FastApiOwnedTag /></SectionTitle>
      {rows.length === 0 ? (
        <EmptyState>예약 내역이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((r) => (
              <Row key={r.id}>
                <div className="w-14 text-[13px] text-toss-faint">#{r.id}</div>
                <div className="min-w-0 flex-1 text-[14px] text-toss-text">
                  {r.user_name ?? '-'} <span className="text-toss-faint">({r.user_phone})</span>
                </div>
                <div className="w-20 text-[13px] text-toss-faint">제품 #{r.product_id}</div>
                <div className="w-14 text-[13px] text-toss-sub">{r.qty}개</div>
                <Badge tone={STATUS_TONE[r.status] ?? 'gray'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                <div className="w-40 text-right text-[13px] text-toss-faint">
                  {new Date(r.reserved_at).toLocaleString('ko-KR')}
                </div>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
