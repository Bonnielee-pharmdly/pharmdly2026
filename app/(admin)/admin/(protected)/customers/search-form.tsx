'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../_components/ui';

export function CustomerSearchForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  const submit = () => {
    const p = phone.trim();
    if (!p) return;
    router.push(`/admin/customers/${encodeURIComponent(p)}`);
  };

  return (
    <div className="flex gap-2">
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="전화번호로 조회 (예: 010-1234-5678)"
        className="w-64 rounded-control bg-toss-bg px-4 py-3 text-[14px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
      />
      <Button variant="primary" onClick={submit}>조회</Button>
    </div>
  );
}
