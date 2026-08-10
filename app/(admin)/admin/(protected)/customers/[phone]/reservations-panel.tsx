'use client';

import { useTransition } from 'react';
import { cancelReservationAsAdmin, deleteReservationAsAdmin, type ReservationRow } from './actions';
import { FastApiOwnedTag, SectionTitle, Card, RowList, Row, EmptyState, Badge, Button } from '../../_components/ui';

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

export function ReservationsPanel({ phone, rows }: { phone: string; rows: ReservationRow[] }) {
  return (
    <div>
      <SectionTitle description="상태 전이·재고 계산은 FastAPI 예약 서비스가 담당합니다. 여기서는 부적절한 예약을 취소하거나 완전히 삭제할 수만 있습니다.">
        예약 내역 <FastApiOwnedTag />
      </SectionTitle>
      {rows.length === 0 ? (
        <EmptyState>예약 내역이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((r) => (
              <ReservationRowItem key={r.id} phone={phone} row={r} />
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}

function ReservationRowItem({ phone, row }: { phone: string; row: ReservationRow }) {
  const [pending, startTransition] = useTransition();
  const cancellable = row.status === 'PENDING' || row.status === 'LOCKED';

  const cancel = () => {
    if (!confirm(`예약 #${row.id}을(를) 취소할까요?`)) return;
    startTransition(async () => {
      await cancelReservationAsAdmin(phone, row.id);
    });
  };

  const remove = () => {
    if (!confirm(`예약 #${row.id} 기록을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      await deleteReservationAsAdmin(phone, row.id);
    });
  };

  return (
    <Row>
      <div className="w-14 text-[13px] text-toss-faint">#{row.id}</div>
      <div className="w-20 text-[13px] text-toss-faint">약국 #{row.pharmacy_id}</div>
      <div className="min-w-0 flex-1 text-[14px] text-toss-text">제품 #{row.product_id} · {row.qty}개</div>
      <Badge tone={STATUS_TONE[row.status] ?? 'gray'}>{STATUS_LABEL[row.status] ?? row.status}</Badge>
      <div className="w-40 text-[13px] text-toss-faint">{new Date(row.reserved_at).toLocaleString('ko-KR')}</div>
      <div className="flex shrink-0 gap-1.5">
        {cancellable && <Button size="sm" onClick={cancel} disabled={pending}>취소</Button>}
        <Button variant="danger" size="sm" onClick={remove} disabled={pending}>삭제</Button>
      </div>
    </Row>
  );
}
