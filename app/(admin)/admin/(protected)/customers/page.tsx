import { loadCustomerList } from './actions';
import { CustomerSearchForm } from './search-form';
import { PageHeader, Card, RowList, Row, EmptyState, Badge, LinkButton } from '../_components/ui';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await loadCustomerList();

  return (
    <div>
      <PageHeader
        title="손님 관리"
        description="손님 계정에 로그인하지 않습니다. 예약은 전화번호로 연결되어 있어 전화번호 기준으로 조회·관리합니다."
        action={<CustomerSearchForm />}
      />

      {customers.length === 0 ? (
        <EmptyState>예약 손님이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {customers.map((c) => (
              <Row key={c.user_phone}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-toss-text">{c.user_name ?? '-'}</div>
                  <div className="mt-0.5 text-[13px] text-toss-faint">{c.user_phone}</div>
                </div>
                <div className="w-24 text-[13px] text-toss-sub">예약 {c.reservation_count}건</div>
                <div className="w-32 text-[13px] text-toss-faint">
                  {new Date(c.last_reserved_at).toLocaleDateString('ko-KR')}
                </div>
                <Badge tone={c.blocked ? 'red' : 'green'}>{c.blocked ? '차단됨' : '정상'}</Badge>
                <LinkButton href={`/admin/customers/${encodeURIComponent(c.user_phone)}`} size="sm">상세 보기</LinkButton>
              </Row>
            ))}
          </RowList>
        </Card>
      )}
    </div>
  );
}
