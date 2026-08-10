import Link from 'next/link';
import { loadProducts, type ProductStatus, type SortKey, type SortDir } from './actions';
import { ProductRow } from './product-row';
import { SearchBar } from './search-bar';
import { NewProduct } from './new-product';
import { BulkUploadPanel } from './bulk-upload-panel';
import { SortDropdown } from './sort-dropdown';
import { PageHeader, EmptyState, PillTabs, LinkButton } from '../_components/ui';

export const dynamic = 'force-dynamic';

const TABS: { key: ProductStatus; label: string }[] = [
  { key: 'active', label: '활성' },
  { key: 'inactive', label: '숨김' },
  { key: 'all', label: '전체' },
];

// 열 순서 그대로: 사진 · 제품명 · 바코드 · 제조사 · 단위 · 참고가 · 분류 · 관리
// 단위는 정렬 대상이 아니라서 null로 표시.
const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: 'standard_name', label: '제품명' },
  { key: 'barcode', label: '바코드' },
  { key: 'manufacturer', label: '제조사' },
  { key: null, label: '단위' },
  { key: 'reference_price', label: '참고가' },
  { key: 'product_type', label: '분류' },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; status?: ProductStatus; sort?: SortKey; dir?: SortDir };
}) {
  const search = searchParams.q ?? '';
  const page = Number(searchParams.page ?? '1') || 1;
  const status: ProductStatus = searchParams.status ?? 'active';
  const pageSize = 50;

  const { rows, total, sort, dir } = await loadProducts({
    search,
    page,
    pageSize,
    status,
    sort: searchParams.sort,
    dir: searchParams.dir,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const mkHref = (p: number) =>
    `/admin/products?${new URLSearchParams({ q: search, page: String(p), status, sort, dir })}`;
  const tabHref = (s: ProductStatus) =>
    `/admin/products?${new URLSearchParams({ q: search, page: '1', status: s, sort, dir })}`;
  const sortHref = (key: SortKey) => {
    const nextDir: SortDir = sort === key && dir === 'asc' ? 'desc' : 'asc';
    return `/admin/products?${new URLSearchParams({ q: search, page: '1', status, sort: key, dir: nextDir })}`;
  };

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
        <div className="flex items-center gap-2">
          <SortDropdown sort={sort} dir={dir} />
          <SearchBar defaultValue={search} status={status} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState>제품이 없습니다.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card bg-toss-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-toss-line text-toss-faint">
                <th className="w-9 py-2.5 pl-4 pr-2 text-left font-medium">사진</th>
                {COLUMNS.map((col) => {
                  if (!col.key) {
                    return <th key={col.label} className="w-16 py-2.5 pr-2 text-left font-medium">{col.label}</th>;
                  }
                  const active = sort === col.key;
                  return (
                    <th key={col.key} className="py-2.5 pr-2 text-left font-medium">
                      <Link
                        href={sortHref(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-toss-sub ${active ? 'text-toss-blueDark' : ''}`}
                      >
                        {col.label}
                        {active && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
                      </Link>
                    </th>
                  );
                })}
                <th className="w-[104px] py-2.5 pr-4 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <ProductRow key={p.product_id} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2">
        {page > 1 && <LinkButton href={mkHref(page - 1)} size="sm">이전</LinkButton>}
        <span className="text-[13px] text-toss-faint">{page} / {totalPages}</span>
        {page < totalPages && <LinkButton href={mkHref(page + 1)} size="sm">다음</LinkButton>}
      </div>
    </div>
  );
}
