import { notFound } from 'next/navigation';
import { EntityHeader } from '../../_components/entity-header';
import { loadPharmacyDetail } from './actions';
import { PharmacyInfoForm } from './pharmacy-info-form';
import { InventoryView } from './inventory-view';
import { OrdersView } from './orders-view';
import { ReservationsView } from './reservations-view';

export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  pending: 'warn',
  active: 'active',
  suspended: 'warn',
  rejected: 'danger',
  deleted: 'danger',
} as const;
const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '정상',
  suspended: '정지됨',
  rejected: '거절됨',
  deleted: '삭제됨',
};

export default async function PharmacyDetailPage({ params }: { params: { id: string } }) {
  const pharmacyId = Number(params.id);
  if (!Number.isFinite(pharmacyId)) notFound();

  const { pharmacy, inventory, orders, reservations } = await loadPharmacyDetail(pharmacyId);
  if (!pharmacy) notFound();

  return (
    <div>
      <EntityHeader
        icon="🏥"
        title={`#${pharmacy.id} ${pharmacy.name}`}
        subtitle="약국 상세 · 정보 수정과 정지/삭제만 가능합니다"
        backHref="/admin/pharmacies"
        statusBadge={{ label: STATUS_LABEL[pharmacy.status], tone: STATUS_TONE[pharmacy.status] }}
      />
      <div className="space-y-7">
        <PharmacyInfoForm pharmacy={pharmacy} />
        <InventoryView rows={inventory} />
        <OrdersView rows={orders} />
        <ReservationsView rows={reservations} />
      </div>
    </div>
  );
}
