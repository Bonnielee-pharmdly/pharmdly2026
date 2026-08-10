import { loadSeedReviewQueue, loadCategories } from './actions';
import { ReviewRow } from './review-row';
import { PageHeader, EmptyState } from '../_components/ui';

export const dynamic = 'force-dynamic';

const COLUMNS = ['원본 이름', '바코드', '구간', '유사도', '추천 약품명', '처리'];

export default async function SeedReviewPage() {
  // 효능 분류는 모든 행이 공유하므로 한 번만 불러와서 각 행에 넘긴다.
  const [rows, categories] = await Promise.all([loadSeedReviewQueue(), loadCategories()]);

  return (
    <div>
      <PageHeader
        title="씨앗 검토"
        description={`매칭 결과 중 수동 검토가 필요한 항목 ${rows.length.toLocaleString()}건. 유사도가 중간(mid)인 항목이 위, 낮은(low) 항목이 아래에 표시됩니다.`}
      />

      {rows.length === 0 ? (
        <EmptyState>검토할 항목이 없습니다.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card bg-toss-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-toss-line text-toss-faint">
                <th className="py-2.5 pl-4 pr-2 text-left font-medium">{COLUMNS[0]}</th>
                <th className="py-2.5 pr-2 text-left font-medium">{COLUMNS[1]}</th>
                <th className="py-2.5 pr-2 text-left font-medium">{COLUMNS[2]}</th>
                <th className="py-2.5 pr-2 text-left font-medium">{COLUMNS[3]}</th>
                <th className="py-2.5 pr-2 text-left font-medium">{COLUMNS[4]}</th>
                <th className="py-2.5 pr-4 text-right font-medium">{COLUMNS[5]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ReviewRow key={row.id} row={row} categories={categories} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
