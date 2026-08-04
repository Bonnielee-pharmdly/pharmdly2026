'use client';

import { useTransition } from 'react';
import { clearNoShows } from './actions';
import { Button } from '../_components/ui';

export function ClearButton({ phone }: { phone: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`${phone} 님의 노쇼 기록을 초기화할까요?`)) return;
        startTransition(async () => {
          await clearNoShows(phone);
        });
      }}
    >
      {pending ? '처리 중…' : '초기화'}
    </Button>
  );
}
