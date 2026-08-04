// 마스터데이터 분류 (products.product_type 체크 제약과 반드시 일치해야 함)
export const PRODUCT_TYPES = ['일반의약품', '의약외품', '의료기기', '기타'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
