import { FastApiOwnedTag, SectionTitle, Card, RowList, Row, EmptyState } from '../../_components/ui';
import type { InventoryRow } from './actions';

// 읽기 전용 — 재고 수량은 FastAPI 예약 서비스가 계산·갱신하므로 여기서 고치지 않습니다.
export function InventoryView({ rows }: { rows: InventoryRow[] }) {
  return (
    <div>
      <SectionTitle description="재고 등록/수정은 약국 자체 포탈에서 합니다.">
        재고 (열람 전용) <FastApiOwnedTag />
      </SectionTitle>
      {rows.length === 0 ? (
        <EmptyState>등록된 재고가 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((r) => (
              <Row key={r.id}>
                <div className="min-w-0 flex-1 text-[14px] text-toss-text">{r.local_name}</div>
                <div className="w-24 text-[14px] font-medium text-toss-text">
                  {r.price != null ? `${r.price.toLocaleString('ko-KR')}원` : '-'}
                </div>
                <div className="w-20 text-[13px] text-toss-sub">재고 {r.stock_qty}</div>
                <div className="w-24 text-[13px] text-toss-faint">잠김 {r.locked_qty}</div>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
