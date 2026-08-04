import { loadProducts, type ProductStatus } from './actions';
import { ProductRow } from './product-row';
import { SearchBar } from './search-bar';
import { NewProduct } from './new-product';
import { BulkUploadPanel } from './bulk-upload-panel';
import { PageHeader, Card, RowList, EmptyState, PillTabs, LinkButton } from '../_components/ui';

export const dynamic = 'force-dynamic';

const TABS: { key: ProductStatus; label: string }[] = [
  { key: 'active', label: '활성' },
  { key: 'inactive', label: '숨김' },
  { key: 'all', label: '전체' },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; status?: ProductStatus };
}) {
  const search = searchParams.q ?? '';
  const page = Number(searchParams.page ?? '1') || 1;
  const status: ProductStatus = searchParams.status ?? 'active';
  const pageSize = 25;

  const { rows, total } = await loadProducts({ search, page, pageSize, status });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const mkHref = (p: number) =>
    `/admin/products?${new URLSearchParams({ q: search, page: String(p), status })}`;
  const tabHref = (s: ProductStatus) =>
    `/admin/products?${new URLSearchParams({ q: search, page: '1', status: s })}`;

  return (
    <div>
      <PageHeader
        title="마스터데이터"
        description={`총 ${total.toLocaleString()}건. 약국별 가격은 각 약국이 관리하며, 여기서는 참고가를 설정합니다.`}
        action={<NewProduct />}
      />

      <div className="mb-4">
        <BulkUploadPanel />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <PillTabs options={TABS} value={status} hrefFor={tabHref} />
        <SearchBar defaultValue={search} status={status} />
      </div>

      {rows.length === 0 ? (
        <EmptyState>제품이 없습니다.</EmptyState>
      ) : (
        <Card>
          <RowList>
            {rows.map((p) => (
              <ProductRow key={p.product_id} product={p} />
            ))}
          </RowList>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-center gap-2">
        {page > 1 && <LinkButton href={mkHref(page - 1)} size="sm">이전</LinkButton>}
        <span className="text-[13px] text-toss-faint">{page} / {totalPages}</span>
        {page < totalPages && <LinkButton href={mkHref(page + 1)} size="sm">다음</LinkButton>}
      </div>
    </div>
  );
}
