'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approvePharmacy, rejectPharmacy } from './actions';
import { Card, Button, Input } from '../../_components/ui';

export function ApproveRejectPanel({ pharmacyId, status }: { pharmacyId: number; status: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [pending, startTransition] = useTransition();

  if (status !== 'pending') {
    return null;
  }

  const approve = () => {
    if (!confirm('이 약국을 승인할까요? 즉시 포털을 이용할 수 있게 됩니다.')) return;
    startTransition(async () => {
      await approvePharmacy(pharmacyId);
      router.refresh();
    });
  };

  const reject = () => {
    if (!reason.trim()) return;
    if (!confirm('이 약국의 가입을 거절할까요?')) return;
    startTransition(async () => {
      await rejectPharmacy(pharmacyId, reason);
      router.refresh();
    });
  };

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <Button variant="primary" onClick={approve} disabled={pending}>
          {pending ? '처리 중…' : '승인'}
        </Button>
        {!showReject ? (
          <Button variant="danger" onClick={() => setShowReject(true)} disabled={pending}>거절</Button>
        ) : null}
      </div>

      {showReject && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="거절 사유를 입력하세요"
            className="w-80"
          />
          <Button variant="danger" onClick={reject} disabled={pending || !reason.trim()}>
            {pending ? '처리 중…' : '거절 확정'}
          </Button>
          <Button variant="secondary" onClick={() => { setShowReject(false); setReason(''); }} disabled={pending}>
            취소
          </Button>
        </div>
      )}
    </Card>
  );
}
