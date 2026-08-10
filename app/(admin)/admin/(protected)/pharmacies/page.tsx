import { loadPharmacyList, type PharmacyStatus } from './actions';
import { PageHeader, Card, RowList, Row, EmptyState, Badge, LinkButton } from '../_components/ui';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<PharmacyStatus, string> = {
  pending: '승인 대기',
  active: '정상',
  suspended: '정지됨',
  rejected: '거절됨',
  deleted: '삭제됨',
};
const STATUS_TONE: Record<PharmacyStatus, 'green' | 'yellow' | 'red'> = {
  pending: 'yellow',
  active: 'green',
  suspended: 'yellow',
  rejected: 'red',
  deleted: 'red',
};

export default async function PharmaciesPage() {
  const pharmacies = await loadPharmacyList();

  return (
    <div>
      <PageHeader
        title="약국 관리"
        description="전체 약국을 조회하고, 문제가 있는 약국을 정지하거나 삭제할 수 있습니다. 재고·주문은 약국 자체 포탈과 FastAPI 예약 서비스가 관리하며, 여기서는 열람만 합니다."
      />

      {pharmacies.length === 0 ? (
        <EmptyState>등록된 약국이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {pharmacies.map((p) => (
              <Row key={p.id}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-toss-text">#{p.id} {p.name}</div>
                  <div className="mt-0.5 text-[13px] text-toss-faint">
                    {p.pharmacist ?? '-'} · {p.address ?? '-'} {p.address_detail ?? ''}
                  </div>
                </div>
                <div className="w-36 text-[13px] text-toss-faint">{p.phone ?? p.owner_email ?? '-'}</div>
                <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                <LinkButton href={`/admin/pharmacies/${p.id}`} size="sm">상세 보기</LinkButton>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
