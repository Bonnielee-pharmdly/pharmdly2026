import { notFound } from 'next/navigation';
import { loadApplication } from './actions';
import { ApproveRejectPanel } from './approve-reject-panel';
import { EntityHeader } from '../../_components/entity-header';
import { Card, SectionTitle } from '../../_components/ui';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '정상',
  suspended: '정지됨',
  rejected: '거절됨',
  deleted: '삭제됨',
};
const STATUS_TONE: Record<string, 'active' | 'warn' | 'danger'> = {
  pending: 'warn',
  active: 'active',
  suspended: 'warn',
  rejected: 'danger',
  deleted: 'danger',
};

export default async function ApprovalDetailPage({ params }: { params: { id: string } }) {
  const pharmacyId = Number(params.id);
  if (!Number.isFinite(pharmacyId)) notFound();

  const app = await loadApplication(pharmacyId);

  return (
    <div>
      <EntityHeader
        icon="📋"
        title={app.name}
        subtitle="가입 신청 상세"
        backHref="/admin/pharmacy-approvals"
        statusBadge={{ label: STATUS_LABEL[app.status] ?? app.status, tone: STATUS_TONE[app.status] ?? 'warn' }}
      />

      <div className="space-y-7">
        <ApproveRejectPanel pharmacyId={pharmacyId} status={app.status} />

        {app.status === 'rejected' && app.rejection_reason && (
          <Card className="!bg-toss-redBg">
            <div className="text-[13px] font-medium text-toss-red">거절 사유</div>
            <div className="mt-1 text-[14px] text-toss-red">{app.rejection_reason}</div>
          </Card>
        )}

        <div>
          <SectionTitle>신청 정보</SectionTitle>
          <Card>
            <dl className="grid grid-cols-2 gap-y-3 text-[14px]">
              <Info label="약국명" value={app.name} />
              <Info label="약사" value={app.pharmacist} />
              <Info label="면허번호" value={app.license} />
              <Info label="사업자등록번호" value={app.business_reg_no} />
              <Info label="연락처" value={app.phone} />
              <Info label="이메일" value={app.owner_email} />
              <Info label="주소" value={[app.address, app.address_detail].filter(Boolean).join(' ')} />
              <Info label="신청일" value={new Date(app.created_at).toLocaleString('ko-KR')} />
            </dl>
          </Card>
        </div>

        <div>
          <SectionTitle description="비공개 서류입니다. 이 화면을 열람한 기록은 감사 로그에 남습니다.">
            면허증 이미지
          </SectionTitle>
          <Card>
            {app.licenseImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.licenseImageUrl} alt="약국 면허증" className="max-h-[480px] rounded-control border border-toss-line" />
            ) : (
              <p className="text-[14px] text-toss-faint">등록된 면허증 이미지가 없습니다.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[12px] text-toss-faint">{label}</dt>
      <dd className="mt-0.5 text-toss-text">{value || '-'}</dd>
    </div>
  );
}
