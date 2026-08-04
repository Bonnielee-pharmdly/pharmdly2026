'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct } from './actions';
import { PRODUCT_TYPES, PRODUCT_TYPE_SHORT_LABEL } from '@/lib/admin/product-types';
import { Button, Card, Input, Select } from '../_components/ui';

const EMPTY = {
  standard_name: '',
  barcode: '',
  manufacturer: '',
  unit_label: '',
  reference_price: '',
  product_type: '',
};

export function NewProduct() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pending, startTransition] = useTransition();

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    startTransition(async () => {
      await createProduct({
        standard_name: form.standard_name,
        barcode: form.barcode || null,
        manufacturer: form.manufacturer || null,
        unit_label: form.unit_label || null,
        reference_price: form.reference_price === '' ? null : Number(form.reference_price),
        product_type: form.product_type === '' ? null : (form.product_type as never),
      });
      setForm(EMPTY);
      setOpen(false);
      router.refresh();
    });

  if (!open) {
    return <Button variant="primary" onClick={() => setOpen(true)}>+ 새 제품</Button>;
  }

  return (
    <Card className="mb-4 flex flex-wrap items-end gap-2.5">
      <Input placeholder="제품명*" value={form.standard_name}
        onChange={(e) => set('standard_name', e.target.value)} className="w-40" />
      <Input placeholder="바코드" value={form.barcode}
        onChange={(e) => set('barcode', e.target.value)} className="w-32" />
      <Input placeholder="제조사" value={form.manufacturer}
        onChange={(e) => set('manufacturer', e.target.value)} className="w-28" />
      <Input placeholder="단위" value={form.unit_label}
        onChange={(e) => set('unit_label', e.target.value)} className="w-20" />
      <Input placeholder="참고가" type="number" value={form.reference_price}
        onChange={(e) => set('reference_price', e.target.value)} className="w-24" />
      <Select value={form.product_type} onChange={(e) => set('product_type', e.target.value)}>
        <option value="">미분류</option>
        {PRODUCT_TYPES.map((t) => (
          <option key={t} value={t}>{PRODUCT_TYPE_SHORT_LABEL[t]}</option>
        ))}
      </Select>
      <Button variant="primary" onClick={submit} disabled={pending}>
        {pending ? '저장 중…' : '저장'}
      </Button>
      <Button variant="secondary" onClick={() => { setOpen(false); setForm(EMPTY); }}>취소</Button>
      <span className="w-full text-[12px] text-toss-faint">사진은 저장 후 목록에서 추가하세요 (선택).</span>
    </Card>
  );
}
