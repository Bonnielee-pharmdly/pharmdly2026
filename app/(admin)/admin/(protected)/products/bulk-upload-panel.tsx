'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewBulkUpload, applyBulkUpload } from './bulk-upload-actions';
import type { BulkUploadResult } from '@/lib/admin/products-excel';
import { Button, Card, Badge, RowList, Row } from '../_components/ui';

export function BulkUploadPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkUploadResult | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setOpen(false);
    setFileName(null);
    setPreview(null);
    setApplied(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickFile = () => {
    const file = fileRef.current?.files?.[0];
    setFileName(file?.name ?? null);
    setPreview(null);
    setApplied(null);
    setError(null);
  };

  const doPreview = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await previewBulkUpload(fd);
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : '미리보기 중 문제가 발생했습니다.');
      }
    });
  };

  const doApply = () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !preview) return;
    if (!confirm(`신규 ${preview.newCount}건, 수정 ${preview.updateCount}건을 반영할까요?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await applyBulkUpload(fd);
        setApplied(result.applied);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : '반영 중 문제가 발생했습니다.');
      }
    });
  };

  if (!open) {
    return (
      <div className="flex gap-2">
        <a href="/admin/products/template" className="inline-flex items-center justify-center rounded-control bg-toss-bg px-[18px] py-[11px] text-[14px] font-medium text-toss-sub transition-colors hover:bg-toss-line">
          템플릿 다운로드
        </a>
        <Button variant="secondary" onClick={() => setOpen(true)}>엑셀 업로드</Button>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[14px] font-medium text-toss-text">엑셀 일괄 업로드</span>
        <a href="/admin/products/template" className="text-[12px] text-toss-blue underline">템플릿 다운로드</a>
      </div>

      {applied === null ? (
        <>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onPickFile}
              className="text-[13px] text-toss-sub file:mr-3 file:rounded-control file:border-0 file:bg-toss-bg file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-toss-sub hover:file:bg-toss-line"
            />
            <Button variant="primary" size="sm" onClick={doPreview} disabled={!fileName || pending}>
              {pending && !preview ? '읽는 중…' : '미리보기'}
            </Button>
          </div>

          {error && <p className="mt-2 text-[13px] text-toss-red">{error}</p>}

          {preview && (
            <div className="mt-4">
              <div className="mb-3 flex gap-2">
                <Badge tone="green">신규 {preview.newCount}건</Badge>
                <Badge tone="blue">수정 {preview.updateCount}건</Badge>
                <Badge tone={preview.errorCount > 0 ? 'red' : 'gray'}>오류 {preview.errorCount}건</Badge>
              </div>

              {preview.errorCount > 0 && (
                <div className="mb-4 max-h-64 overflow-y-auto rounded-control bg-toss-bg p-3">
                  <RowList>
                    {preview.rows
                      .filter((r) => r.status === 'error')
                      .map((r) => (
                        <Row key={r.rowNum} className="!py-2.5">
                          <div className="w-14 text-[12px] text-toss-faint">{r.rowNum}행</div>
                          <div className="w-32 truncate text-[13px] text-toss-text">{r.barcode || '(바코드 없음)'}</div>
                          <div className="min-w-0 flex-1 text-[12px] text-toss-red">{r.reason}</div>
                        </Row>
                      ))}
                  </RowList>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="primary" onClick={doApply} disabled={pending || preview.newCount + preview.updateCount === 0}>
                  {pending ? '반영 중…' : `반영하기 (${preview.newCount + preview.updateCount}건)`}
                </Button>
                <Button variant="secondary" onClick={reset} disabled={pending}>취소</Button>
              </div>
            </div>
          )}

          {!preview && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={reset}>닫기</Button>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-[14px] font-medium text-toss-green">
            ✅ 반영 완료 — 신규 {preview?.newCount ?? 0}건, 수정 {preview?.updateCount ?? 0}건
            {preview && preview.errorCount > 0 && ` (오류 ${preview.errorCount}건은 반영되지 않음)`}
          </p>
          <Button variant="secondary" className="mt-3" onClick={reset}>닫기</Button>
        </div>
      )}
    </Card>
  );
}
