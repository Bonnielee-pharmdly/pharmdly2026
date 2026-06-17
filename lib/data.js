// 데모용 데이터입니다. 나중에 Supabase(데이터베이스)에 연결하면 이 파일은 사라집니다.

export const PHARMACIES = [
  { id: 1, name: "행복온누리약국", dist: "도보 3분 · 240m", hours: "~22:00", late: true },
  { id: 2, name: "우리동네약국", dist: "도보 7분 · 520m", hours: "~20:00", late: false },
  { id: 3, name: "미소약국", dist: "도보 12분 · 900m", hours: "~19:30", late: false },
];

export const PRODUCTS = [
  { id: 1, name: "타이레놀정 500mg (10정)", cat: "해열진통제", type: "일반의약품" },
  { id: 2, name: "케어리브 밴드 M (10매)", cat: "상처케어", type: "의약외품" },
  { id: 3, name: "락토핏 골드 (50포)", cat: "유산균", type: "건강기능식품" },
  { id: 4, name: "마데카솔케어연고 10g", cat: "상처치료", type: "일반의약품" },
  { id: 5, name: "판콜에스내복액 (3병)", cat: "감기약", type: "일반의약품" },
  { id: 7, name: "임팩타민 프리미엄 (120정)", cat: "고함량 비타민B", type: "일반의약품" },
];

// 약국별 재고: 약국id → { 상품id: "in"(있음) | "low"(소량) }
export const STOCK = {
  1: { 1: "in", 2: "in", 3: "low", 4: "in", 5: "in", 7: "in" },
  2: { 1: "in", 4: "in", 5: "in" },
  3: { 1: "low", 3: "in", 7: "in" },
};

// 약국별 실제 판매가 (원)
export const PRICE = {
  1: { 1: 3400, 2: 3800, 3: 15500, 4: 6900, 5: 2700, 7: 46000 },
  2: { 1: 3600, 4: 7500, 5: 2900 },
  3: { 1: 3300, 3: 16500, 7: 49000 },
};

// 픽업 할인 (원 단위 차감)
export const DEALS = {
  1: { 7: 4000, 3: 1000 },
  3: { 7: 3000 },
};

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
