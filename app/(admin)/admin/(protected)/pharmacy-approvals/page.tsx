import { loadApprovalQueue, type ApprovalStatus } from './actions';
import { PageHeader, Card, RowList, Row, EmptyState, PillTabs, LinkButton, Badge } from '../_components/ui';

export const dynamic = 'force-dynamic';

const TABS: { key: ApprovalStatus; label: string }[] = [
  { key: 'pending', label: '승인 대기' },
  { key: 'rejected', label: '거절됨' },
];

export default async function PharmacyApprovalsPage({
  searchParams,
}: {
  searchParams: { status?: ApprovalStatus };
}) {
  const status: ApprovalStatus = searchParams.status === 'rejected' ? 'rejected' : 'pending';
  const rows = await loadApprovalQueue(status);
  const tabHref = (s: ApprovalStatus) => `/admin/pharmacy-approvals?status=${s}`;

  return (
    <div>
      <PageHeader
        title="가입 승인"
        description="새로 가입 신청한 약국을 확인하고 승인하거나 거절합니다. 승인 전까지는 포털 로그인·이용이 안 됩니다."
      />

      <div className="mb-4">
        <PillTabs options={TABS} value={status} hrefFor={tabHref} />
      </div>

      {rows.length === 0 ? (
        <EmptyState>{status === 'pending' ? '승인 대기 중인 약국이 없습니다.' : '거절된 약국이 없습니다.'}</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((p) => (
              <Row key={p.id}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-toss-text">{p.name}</div>
                  <div className="mt-0.5 text-[13px] text-toss-faint">
                    {p.pharmacist ?? '-'} · {p.address ?? '-'}
                  </div>
                  {status === 'rejected' && p.rejection_reason && (
                    <div className="mt-1 text-[12px] text-toss-red">사유: {p.rejection_reason}</div>
                  )}
                </div>
                <div className="w-36 text-[13px] text-toss-faint">{p.phone ?? p.owner_email ?? '-'}</div>
                <Badge tone={status === 'pending' ? 'yellow' : 'red'}>
                  {status === 'pending' ? '대기중' : '거절됨'}
                </Badge>
                <div className="w-28 text-[12px] text-toss-faint">
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </div>
                <LinkButton href={`/admin/pharmacy-approvals/${p.id}`} size="sm">상세 보기</LinkButton>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
