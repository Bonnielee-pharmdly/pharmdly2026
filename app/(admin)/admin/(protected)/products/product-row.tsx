'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import {
  updateProduct,
  uploadProductImage,
  setProductActive,
  type Product,
} from './actions';
import { PRODUCT_TYPES, PRODUCT_TYPE_SHORT_LABEL, PRODUCT_TYPE_TONE, type ProductType } from '@/lib/admin/product-types';
import { Button } from '../_components/ui';

const CELL_INPUT = 'w-full rounded-lg bg-toss-bg px-2 py-1.5 text-[13px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30';

const TYPE_PILL_TONE: Record<string, string> = {
  blue: 'bg-toss-blueBg text-toss-blueDark',
  green: 'bg-toss-greenBg text-toss-green',
  yellow: 'bg-toss-yellowBg text-toss-yellow',
  gray: 'bg-toss-bg text-toss-faint',
};

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

  const tone = form.product_type ? PRODUCT_TYPE_TONE[form.product_type as ProductType] : 'gray';

  return (
    <tr className={`border-b border-toss-line align-middle ${active ? '' : 'opacity-50'}`}>
      <td className="py-1.5 pr-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-toss-bg text-[9px] text-toss-placeholder"
        >
          {imageUrl ? (
            <Image src={imageUrl} alt="" width={36} height={36} className="object-cover" />
          ) : (
            '사진'
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      </td>
      <td className="py-1.5 pr-2">
        <input value={form.standard_name} onChange={(e) => set('standard_name', e.target.value)} className={`${CELL_INPUT} min-w-[160px] font-medium`} />
      </td>
      <td className="py-1.5 pr-2">
        <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className={`${CELL_INPUT} w-32`} />
      </td>
      <td className="py-1.5 pr-2">
        <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} className={`${CELL_INPUT} w-28`} />
      </td>
      <td className="py-1.5 pr-2">
        <input value={form.unit_label} onChange={(e) => set('unit_label', e.target.value)} className={`${CELL_INPUT} w-16`} />
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" value={form.reference_price} onChange={(e) => set('reference_price', e.target.value)} className={`${CELL_INPUT} w-24`} />
      </td>
      <td className="py-1.5 pr-2">
        <select
          value={form.product_type}
          onChange={(e) => set('product_type', e.target.value)}
          className={`rounded-full px-2.5 py-1 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-toss-blue/30 ${TYPE_PILL_TONE[tone]}`}
        >
          <option value="">미분류</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>{PRODUCT_TYPE_SHORT_LABEL[t]}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-4">
        <div className="flex justify-end gap-1 whitespace-nowrap">
          <Button size="xs" onClick={save} disabled={pending}>{pending ? '…' : '저장'}</Button>
          <Button size="xs" onClick={toggleActive} disabled={pending}>{active ? '숨김' : '복원'}</Button>
        </div>
      </td>
    </tr>
  );
}
