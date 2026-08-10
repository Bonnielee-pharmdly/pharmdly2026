// 마스터데이터 분류 (products.product_type 체크 제약과 반드시 일치해야 함)
export const PRODUCT_TYPES = ['일반의약품', '의약외품', '의료기기', '건강기능식품', '동물의약품', '기타'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

// 표가 좁으니 뱃지에는 짧은 이름만. 저장되는 값(위 PRODUCT_TYPES)은 그대로.
export const PRODUCT_TYPE_SHORT_LABEL: Record<ProductType, string> = {
  일반의약품: '일반',
  의약외품: '외품',
  의료기기: '기기',
  건강기능식품: '건기식',
  동물의약품: '동물',
  기타: '기타',
};

export const PRODUCT_TYPE_TONE: Record<ProductType, 'blue' | 'green' | 'yellow' | 'gray'> = {
  일반의약품: 'blue',
  의약외품: 'green',
  의료기기: 'yellow',
  건강기능식품: 'green',
  동물의약품: 'blue',
  기타: 'gray',
};

// 마스터데이터 표의 서버 정렬 기준. 'use server' 파일(actions.ts)은 함수만 export할 수
// 있어서 이 상수/타입은 여기 둔다.
export const SORT_KEYS = ['created_at', 'standard_name', 'barcode', 'manufacturer', 'reference_price', 'product_type'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';
