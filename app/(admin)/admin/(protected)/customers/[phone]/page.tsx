import { EntityHeader } from '../../_components/entity-header';
import { logCustomerView, loadCustomerDetail } from './actions';
import { ReservationsPanel } from './reservations-panel';
import { NoShowsPanel } from './no-shows-panel';
import { BlockPanel } from './block-panel';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { phone: string } }) {
  const phone = decodeURIComponent(params.phone);

  await logCustomerView(phone);
  const detail = await loadCustomerDetail(phone);

  return (
    <div>
      <EntityHeader
        icon="👤"
        title={detail.userName ? `${detail.userName} (${phone})` : phone}
        subtitle="손님 상세 · 열람과 부적절한 예약 취소/삭제, 차단만 가능합니다"
        backHref="/admin/customers"
        statusBadge={detail.blocked ? { label: '차단됨', tone: 'danger' } : { label: '정상', tone: 'active' }}
      />
      <div className="space-y-7">
        <BlockPanel phone={phone} blocked={detail.blocked} blockedReason={detail.blockedReason} />
        <ReservationsPanel phone={phone} rows={detail.reservations} />
        <NoShowsPanel rows={detail.noShows} />
      </div>
    </div>
  );
}
