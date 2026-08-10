'use client';

import { useState, useTransition } from 'react';
import { blockCustomer, unblockCustomer } from './actions';
import { Card, SectionTitle, Button, Input } from '../../_components/ui';

export function BlockPanel({
  phone,
  blocked,
  blockedReason,
}: {
  phone: string;
  blocked: boolean;
  blockedReason: string | null;
}) {
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const block = () => {
    if (!confirm(`${phone} 손님을 차단할까요? 새 예약 차단은 FastAPI 쪽 반영이 필요합니다(아래 안내 참고).`)) return;
    startTransition(async () => {
      await blockCustomer(phone, reason);
      setReason('');
    });
  };

  const unblock = () => {
    if (!confirm(`${phone} 손님의 차단을 해제할까요?`)) return;
    startTransition(async () => {
      await unblockCustomer(phone);
    });
  };

  return (
    <Card>
      <SectionTitle>차단</SectionTitle>
      {blocked ? (
        <>
          <p className="mb-3 text-[14px] text-toss-red">차단됨{blockedReason ? ` — 사유: ${blockedReason}` : ''}</p>
          <Button onClick={unblock} disabled={pending}>{pending ? '처리 중…' : '차단 해제'}</Button>
        </>
      ) : (
        <>
          <div className="mb-2.5 flex gap-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="차단 사유 (선택)"
              className="w-64"
            />
            <Button variant="danger" onClick={block} disabled={pending}>
              {pending ? '처리 중…' : '차단'}
            </Button>
          </div>
          <p className="text-[12px] text-toss-faint">
            ⚠️ 이 목록은 관리자 패널에 기록만 됩니다. 실제로 새 예약 생성을 막으려면 예약을 처리하는
            FastAPI 백엔드가 이 차단 목록(blocked_customers)을 확인하도록 그쪽에도 반영해야 합니다.
          </p>
        </>
      )}
    </Card>
  );
}
