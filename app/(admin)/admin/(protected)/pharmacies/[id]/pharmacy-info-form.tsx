'use client';

import { useState, useTransition } from 'react';
import { updatePharmacyInfo, setPharmacyStatus, type PharmacyDetail } from './actions';
import { Card, Button, Input } from '../../_components/ui';

export function PharmacyInfoForm({ pharmacy }: { pharmacy: PharmacyDetail }) {
  const [form, setForm] = useState({
    name: pharmacy.name,
    pharmacist: pharmacy.pharmacist ?? '',
    address: pharmacy.address ?? '',
    address_detail: pharmacy.address_detail ?? '',
    hours: pharmacy.hours ?? '',
    phone: pharmacy.phone ?? '',
    owner_email: pharmacy.owner_email ?? '',
  });
  const [pending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    startTransition(async () => {
      await updatePharmacyInfo(pharmacy.id, form);
    });

  const changeStatus = (status: 'active' | 'suspended' | 'deleted') => {
    const msg =
      status === 'deleted'
        ? '이 약국을 삭제(소프트 삭제) 처리할까요? 손님 포탈에서 더 이상 보이지 않습니다.'
        : status === 'suspended'
          ? '이 약국을 정지할까요? 손님 포탈에서 보이지 않게 됩니다.'
          : '이 약국을 다시 활성화할까요?';
    if (!confirm(msg)) return;
    startStatusTransition(async () => {
      await setPharmacyStatus(pharmacy.id, status);
    });
  };

  return (
    <Card>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="약국명" value={form.name} onChange={(v) => set('name', v)} />
        <Field label="약사" value={form.pharmacist} onChange={(v) => set('pharmacist', v)} />
        <Field label="주소" value={form.address} onChange={(v) => set('address', v)} />
        <Field label="상세주소" value={form.address_detail} onChange={(v) => set('address_detail', v)} />
        <Field label="영업시간" value={form.hours} onChange={(v) => set('hours', v)} />
        <Field label="연락처" value={form.phone} onChange={(v) => set('phone', v)} />
        <Field label="약국 이메일" value={form.owner_email} onChange={(v) => set('owner_email', v)} />
      </div>
      <Button variant="primary" onClick={save} disabled={pending}>
        {pending ? '저장 중…' : '정보 저장'}
      </Button>

      <div className="mt-5 flex gap-2 border-t border-toss-line pt-5">
        {pharmacy.status !== 'active' && (
          <Button variant="secondary" className="!bg-toss-greenBg !text-toss-green hover:!bg-[#dcf0e4]" onClick={() => changeStatus('active')} disabled={statusPending}>
            활성화
          </Button>
        )}
        {pharmacy.status !== 'suspended' && (
          <Button variant="secondary" className="!bg-toss-yellowBg !text-toss-yellow hover:!bg-[#fbe8c9]" onClick={() => changeStatus('suspended')} disabled={statusPending}>
            정지
          </Button>
        )}
        {pharmacy.status !== 'deleted' && (
          <Button variant="danger" onClick={() => changeStatus('deleted')} disabled={statusPending}>
            삭제(소프트)
          </Button>
        )}
      </div>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] text-toss-faint">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-full" />
    </label>
  );
}
