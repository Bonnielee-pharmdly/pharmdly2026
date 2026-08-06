// 데모용 데이터입니다. 나중에 Supabase(데이터베이스)에 연결하면 이 파일은 사라집니다.

export const PHARMACIES = [];

export const PRODUCTS = [];

// 약국별 재고: 약국id → { 상품id: "in"(있음) | "low"(소량) }
export const STOCK = {};

// 약국별 실제 판매가 (원)
export const PRICE = {};

// 픽업 할인 (원 단위 차감)
export const DEALS = {};

export const DEPOSIT = 1000; // 픽업 예약금

export function price(phId, pid) {
  return (PRICE[phId] && PRICE[phId][pid]) || 0;
}
export function dealOff(phId, pid) {
  return (DEALS[phId] && DEALS[phId][pid]) || 0;
}
export function effPrice(phId, pid) {
  return Math.max(0, price(phId, pid) - dealOff(phId, pid));
}
export const won = (n) => n.toLocaleString("ko-KR") + "원";
