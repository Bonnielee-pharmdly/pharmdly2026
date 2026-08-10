import 'server-only';
import * as XLSX from 'xlsx';
import { PRODUCT_TYPES, type ProductType } from './product-types';

// 엑셀 양식 컬럼 — 다운로드 템플릿과 업로드 파싱이 이 순서/이름을 그대로 공유한다.
export const TEMPLATE_HEADERS = ['바코드', '제품명', '제조사', '단위', '참고가', '분류'] as const;
const EXAMPLE_ROW = ['8801234567890', '타이레놀정 500mg', '한국얀센', '10정', '3000', '일반의약품'];

const MAX_ROWS = 3000; // 지나치게 큰 파일(악의적이든 실수든) 파싱을 막기 위한 상한

export function buildTemplateWorkbook(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS as unknown as string[], EXAMPLE_ROW]);
  ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '제품목록');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

type RawRow = Record<(typeof TEMPLATE_HEADERS)[number], unknown>;

export type ValidatedRow = {
  rowNum: number; // 엑셀 상 실제 행 번호(헤더=1행 기준, 사람이 읽는 용도)
  barcode: string | null;
  standard_name: string | null;
  manufacturer: string | null;
  unit_label: string | null;
  reference_price: number | null;
  product_type: ProductType | null;
  status: 'new' | 'update' | 'error';
  matchedProductId?: number;
  reason?: string;
};

export type BulkUploadResult = {
  rows: ValidatedRow[];
  newCount: number;
  updateCount: number;
  errorCount: number;
};

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export function parseWorkbook(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('시트를 찾을 수 없습니다.');

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
  if (rows.length > MAX_ROWS) {
    throw new Error(`한 번에 ${MAX_ROWS}행까지만 업로드할 수 있습니다. (현재 ${rows.length}행)`);
  }
  return rows;
}

// barcode → 기존 product_id 목록(중복 대비, 정상이면 항상 0개 또는 1개)
export function classifyRows(rawRows: RawRow[], existingByBarcode: Map<string, number[]>): BulkUploadResult {
  const seenInFile = new Set<string>();
  const rows: ValidatedRow[] = rawRows.map((raw, i) => {
    const rowNum = i + 2; // 1행은 헤더
    const barcode = cellToString(raw['바코드']) || null;
    const standard_name = cellToString(raw['제품명']) || null;
    const manufacturer = cellToString(raw['제조사']) || null;
    const unit_label = cellToString(raw['단위']) || null;
    const priceRaw = cellToString(raw['참고가']);
    const typeRaw = cellToString(raw['분류']);

    const errors: string[] = [];

    if (!barcode) errors.push('바코드 없음');
    if (!standard_name) errors.push('제품명 없음');

    let reference_price: number | null = null;
    if (priceRaw) {
      const n = Number(priceRaw.replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0) errors.push('참고가 형식 오류');
      else reference_price = n;
    }

    let product_type: ProductType | null = null;
    if (typeRaw) {
      if ((PRODUCT_TYPES as readonly string[]).includes(typeRaw)) {
        product_type = typeRaw as ProductType;
      } else {
        errors.push(`허용되지 않은 분류: "${typeRaw}" (${PRODUCT_TYPES.join('/')} 중 하나여야 함)`);
      }
    }

    if (barcode) {
      if (seenInFile.has(barcode)) errors.push('파일 안에 같은 바코드가 중복됨');
      seenInFile.add(barcode);
    }

    let status: ValidatedRow['status'] = 'new';
    let matchedProductId: number | undefined;
    if (barcode && errors.length === 0) {
      const matches = existingByBarcode.get(barcode) ?? [];
      if (matches.length === 1) {
        status = 'update';
        matchedProductId = matches[0];
      } else if (matches.length > 1) {
        errors.push('기존 상품 중 이 바코드가 두 곳 이상에 있어 자동 반영할 수 없음 (직접 확인 필요)');
      }
    }

    if (errors.length > 0) status = 'error';

    return {
      rowNum,
      barcode,
      standard_name,
      manufacturer,
      unit_label,
      reference_price,
      product_type,
      status,
      matchedProductId,
      reason: errors.length ? errors.join(', ') : undefined,
    };
  });

  return {
    rows,
    newCount: rows.filter((r) => r.status === 'new').length,
    updateCount: rows.filter((r) => r.status === 'update').length,
    errorCount: rows.filter((r) => r.status === 'error').length,
  };
}
