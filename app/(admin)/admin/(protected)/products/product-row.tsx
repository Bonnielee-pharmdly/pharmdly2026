'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import {
  updateProduct,
  uploadProductImage,
  setProductActive,
  type Product,
} from './actions';
import { PRODUCT_TYPES } from '@/lib/admin/product-types';
import { Row, Button, Input, Select } from '../_components/ui';

export function ProductRow({ product }: { product: Product }) {
  const [form, setForm] = useState({
    standard_name: product.standard_name ?? '',
    barcode: product.barcode ?? '',
    manufacturer: product.manufacturer ?? '',
    unit_label: product.unit_label ?? '',
    reference_price: product.reference_price?.toString() ?? '',
    product_type: product.product_type ?? '',
  });
  const [imageUrl, setImageUrl] = useState(product.image_url);
  const [active, setActive] = useState(product.is_active);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    startTransition(async () => {
      await updateProduct(product.product_id, {
        standard_name: form.standard_name,
        barcode: form.barcode,
        manufacturer: form.manufacturer,
        unit_label: form.unit_label,
        reference_price: form.reference_price === '' ? null : Number(form.reference_price),
        product_type: form.product_type === '' ? null : (form.product_type as never),
      });
    });

  const toggleActive = () => {
    const next = !active;
    const msg = next ? '이 제품을 다시 노출할까요?' : '이 제품을 숨길까요? (포탈에서 안 보이게 됩니다)';
    if (!confirm(msg)) return;
    startTransition(async () => {
      await setProductActive(product.product_id, next);
      setActive(next);
    });
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const { url } = await uploadProductImage(product.product_id, fd);
      setImageUrl(url);
    });
  };

  return (
    <Row faded={!active} className="items-start">
      <button
        onClick={() => fileRef.current?.click()}
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-toss-bg text-[10px] text-toss-placeholder"
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" width={48} height={48} className="object-cover" />
        ) : (
          '사진'
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />

      <div className="min-w-0 flex-1">
        <Input value={form.standard_name} onChange={(e) => set('standard_name', e.target.value)}
          className="mb-2 w-full max-w-xs font-medium" />
        <div className="flex flex-wrap gap-2">
          <Input placeholder="바코드" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className="w-32 py-1.5 text-[13px]" />
          <Input placeholder="제조사" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} className="w-28 py-1.5 text-[13px]" />
          <Input placeholder="단위" value={form.unit_label} onChange={(e) => set('unit_label', e.target.value)} className="w-20 py-1.5 text-[13px]" />
          <Input placeholder="참고가" type="number" value={form.reference_price} onChange={(e) => set('reference_price', e.target.value)} className="w-24 py-1.5 text-[13px]" />
          <Select value={form.product_type} onChange={(e) => set('product_type', e.target.value)} className="py-1.5 text-[13px]">
            <option value="">미분류</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" onClick={save} disabled={pending}>{pending ? '…' : '저장'}</Button>
        <Button size="sm" onClick={toggleActive} disabled={pending}>{active ? '숨김' : '복원'}</Button>
      </div>
    </Row>
  );
}
