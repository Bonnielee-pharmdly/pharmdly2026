'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { SortDir, SortKey } from './actions';

const PRESETS: { value: string; label: string; sort: SortKey; dir: SortDir }[] = [
  { value: 'created_at-asc', label: '업로드순', sort: 'created_at', dir: 'asc' },
  { value: 'reference_price-desc', label: '가격 높은순', sort: 'reference_price', dir: 'desc' },
  { value: 'reference_price-asc', label: '가격 낮은순', sort: 'reference_price', dir: 'asc' },
  { value: 'standard_name-asc', label: '이름순', sort: 'standard_name', dir: 'asc' },
];

export function SortDropdown({ sort, dir }: { sort: SortKey; dir: SortDir }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = `${sort}-${dir}`;

  const onChange = (value: string) => {
    const preset = PRESETS.find((p) => p.value === value);
    if (!preset) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', preset.sort);
    params.set('dir', preset.dir);
    params.set('page', '1');
    router.push(`/admin/products?${params}`);
  };

  return (
    <select
      value={PRESETS.some((p) => p.value === current) ? current : ''}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-control bg-toss-bg px-3 py-2 text-[13px] text-toss-sub focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
    >
      {!PRESETS.some((p) => p.value === current) && <option value="">직접 지정한 정렬</option>}
      {PRESETS.map((p) => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
    </select>
  );
}
