'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProductStatus } from './actions';

export function SearchBar({
  defaultValue,
  status,
}: {
  defaultValue: string;
  status: ProductStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const submit = () => {
    const params = new URLSearchParams({ q: value, page: '1', status });
    router.push(`/admin/products?${params}`);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-toss-placeholder">🔍</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="제품명 또는 바코드 검색"
        className="w-72 rounded-control bg-toss-bg py-3 pl-10 pr-4 text-[14px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
      />
    </div>
  );
}
