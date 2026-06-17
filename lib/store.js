// 저장소 — 💻 내 컴퓨터 모드(localStorage) / ☁️ 클라우드 모드(Supabase) 자동 전환
import { createClient } from "@supabase/supabase-js";

/* ---------- FastAPI 백엔드 (재고 검색 / 예약 Lock) ---------- */
const PHARMDLY_API = (process.env.NEXT_PUBLIC_PHARMDLY_API || "").trim();

/** 약 이름으로 전체 약국 재고 검색 */
export async function searchProducts(query) {
  if (!PHARMDLY_API) return [];
  const res = await fetch(`${PHARMDLY_API}/api/reservations/products/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json(); // [{ product_id, standard_name, pharmacies: [{pharmacy_id, ...}] }]
}

/** 특정 약국 재고 조회 (FastAPI) */
export async function getPharmacyInventory(pharmacyId) {
  if (!PHARMDLY_API) return [];
  const res = await fetch(`${PHARMDLY_API}/api/pharmacy/${pharmacyId}/inventory`);
  if (!res.ok) return [];
  return res.json();
}

/** 전체 약국 재고 요약 조회 (FastAPI) — 약국별 상품 수 표시용 */
export async function getInventoryAll() {
  if (!PHARMDLY_API) return [];
  try {
    const res = await fetch(`${PHARMDLY_API}/api/pharmacy/inventory/all`);
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

/** 예약 생성 → PENDING */
export async function createReservation(data) {
  if (!PHARMDLY_API) throw new Error("API 설정 없음");
  const res = await fetch(`${PHARMDLY_API}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "예약 실패");
  return json;
}

/** 예약금 결제 → LOCKED */
export async function payReservation(reservationId) {
  if (!PHARMDLY_API) throw new Error("API 설정 없음");
  const res = await fetch(`${PHARMDLY_API}/api/reservations/${reservationId}/pay`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "결제 실패");
  return json;
}

// URL 자동 교정: 공백 제거 + 뒤에 붙은 경로(/rest/v1 등)를 잘라 주소만 남김
let rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
try { if (rawUrl) rawUrl = new URL(rawUrl).origin; } catch { /* 형식이 아예 틀리면 그대로 두고 아래 진단에 걸림 */ }
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
export const supabase = rawUrl && key ? createClient(rawUrl, key) : null;
export const isCloud = !!supabase;
// URL 형식 진단: https://영문숫자.supabase.co 가 아니면 경고 표시용
export const cloudUrlLooksWrong = isCloud && !/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(rawUrl);

/* ---------- localStorage 도우미 ---------- */
const L = {
  get(k, f) {
    if (typeof window === "undefined") return f;
    try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; }
  },
  set(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
    window.dispatchEvent(new Event("pharmdly-changed"));
  },
};

export function getMyPharmId() { return L.get("pharmdly_my_pharm_id", null); }
export function getVerified() { return L.get("pharmdly_verified", false); }
export function setVerified(v) { L.set("pharmdly_verified", v); }

/* ---------- 회원 (데모 — 로컬 저장) ---------- */
export function getUser() { return L.get("pharmdly_user", null); }
export function setUser(u) { L.set("pharmdly_user", u); }
export function logout() { L.set("pharmdly_user", null); }

/* ---------- 약국 ---------- */
function rowToPharm(r) {
  return { id: r.id, name: r.name, pharmacist: r.pharmacist, license: r.license, address: r.address, addressDetail: r.address_detail, hours: r.hours, late: r.is_late_night };
}

export async function loadPharmacies() {
  if (supabase) {
    const { data } = await supabase.from("pharmacies").select("*").order("id");
    return (data || []).map(rowToPharm);
  }
  const p = L.get("pharmdly_my_pharmacy", null);
  return p ? [{ id: 1, ...p }] : [];
}

export async function registerPharmacy(info) {
  if (supabase) {
    const row = { name: info.name, pharmacist: info.pharmacist, license: info.license, address: info.address, address_detail: info.addressDetail, hours: info.hours, is_late_night: info.late };
    const myId = getMyPharmId();
    if (myId) {
      // 기존 등록 수정 시도 — 클라우드에 그 id가 실제로 있을 때만 성공
      const { data, error } = await supabase.from("pharmacies").update(row).eq("id", myId).select();
      if (!error && data && data.length) return myId;
      // (예전 내 컴퓨터 모드의 잔여 id 등) 없으면 아래에서 새로 등록
    }
    const { data, error } = await supabase.from("pharmacies").insert(row).select().single();
    if (error) throw error;
    L.set("pharmdly_my_pharm_id", data.id);
    return data.id;
  }
  L.set("pharmdly_my_pharmacy", info);
  L.set("pharmdly_my_pharm_id", 1);
  return 1;
}

/* ---------- 재고 ---------- */
export async function loadInventoryAll() {
  // pharmacy_inventory 테이블 직접 읽기
  if (supabase) {
    const { data, error } = await supabase
      .from("pharmacy_inventory")
      .select("id, pharmacy_id, local_name, price, stock_qty, locked_qty")
      .gt("stock_qty", 0);
    if (data && data.length) {
      return data.map((r) => ({
        id: r.id, pharmacyId: r.pharmacy_id, productId: r.product_id,
        name: r.local_name || "알 수 없음",
        cat: "기타", type: "일반의약품",
        price: r.price || 0, dealOff: 0,
        status: (r.stock_qty - (r.locked_qty || 0)) > 0 ? "normal" : "out",
        availableQty: Math.max(0, r.stock_qty - (r.locked_qty || 0)),
      }));
    }
  }
  // 폴백: 기존 Supabase inventory 테이블
  if (supabase) {
    const { data } = await supabase.from("inventory").select("*").order("id");
    return (data || []).map((r) => ({ id: r.id, pharmacyId: r.pharmacy_id, name: r.name, cat: r.cat, type: r.type, price: r.price, dealOff: r.deal_off, status: r.status }));
  }
  return L.get("pharmdly_inventory", []).map((i) => ({ ...i, pharmacyId: 1 }));
}

export async function addInventoryItem(pharmacyId, item) {
  if (supabase) {
    const { error } = await supabase.from("inventory").insert({ pharmacy_id: pharmacyId, name: item.name, cat: item.cat, type: item.type, price: item.price, deal_off: item.dealOff, status: item.status });
    if (error) throw error;
    return;
  }
  const inv = L.get("pharmdly_inventory", []);
  inv.push({ ...item, id: Date.now() });
  L.set("pharmdly_inventory", inv);
}

export async function updateInventoryItem(id, patch) {
  if (supabase) { await supabase.from("inventory").update({ status: patch.status }).eq("id", id); return; }
  L.set("pharmdly_inventory", L.get("pharmdly_inventory", []).map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export async function removeInventoryItem(id) {
  if (supabase) { await supabase.from("inventory").delete().eq("id", id); return; }
  L.set("pharmdly_inventory", L.get("pharmdly_inventory", []).filter((i) => i.id !== id));
}

/* ---------- 주문 ---------- */
export async function loadOrders() {
  if (supabase) {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    return (data || []).map((r) => ({ num: r.order_no, pharmId: r.pharmacy_id, pharmName: r.pharm_name, time: r.visit_time, eta: r.eta, status: r.status, items: r.items || [], total: r.total }));
  }
  return L.get("pharmdly_orders", []);
}

export async function addOrder(o) {
  if (supabase) {
    const { error } = await supabase.from("orders").insert({
      order_no: o.num, pharmacy_id: typeof o.pharmId === "number" ? o.pharmId : null,
      pharm_name: o.pharmName, visit_time: o.time, status: o.status, items: o.items, total: o.total,
    });
    if (error) throw error;
    return;
  }
  L.set("pharmdly_orders", [o, ...L.get("pharmdly_orders", [])]);
}

export async function updateOrder(num, patch) {
  if (supabase) {
    const row = {};
    if (patch.status) row.status = patch.status;
    if (patch.eta) row.eta = patch.eta;
    await supabase.from("orders").update(row).eq("order_no", num);
    return;
  }
  L.set("pharmdly_orders", L.get("pharmdly_orders", []).map((o) => (o.num === num ? { ...o, ...patch } : o)));
}

/* ---------- 상품 추가 요청 ---------- */
export async function loadRequests() {
  if (supabase) {
    const { data, error } = await supabase.from("product_requests").select("*").order("created_at", { ascending: false });
    if (error) return []; // 테이블이 아직 없으면(upgrade1.sql 미실행) 조용히 빈 목록
    return (data || []).map((r) => ({ id: r.id, pharmacyId: r.pharmacy_id, text: r.text, fulfilled: r.fulfilled }));
  }
  return L.get("pharmdly_requests", []);
}

export async function addRequest(pharmacyId, text) {
  if (supabase) {
    const { error } = await supabase.from("product_requests").insert({ pharmacy_id: typeof pharmacyId === "number" ? pharmacyId : null, text });
    if (error) throw error;
    return;
  }
  const rs = L.get("pharmdly_requests", []);
  rs.unshift({ id: Date.now(), pharmacyId: 1, text, fulfilled: false });
  L.set("pharmdly_requests", rs);
}

export async function fulfillRequest(id) {
  if (supabase) { await supabase.from("product_requests").update({ fulfilled: true }).eq("id", id); return; }
  L.set("pharmdly_requests", L.get("pharmdly_requests", []).map((r) => (r.id === id ? { ...r, fulfilled: true } : r)));
}

/* ---------- 실시간 변경 감지 ---------- */
export function onChange(cb) {
  if (supabase) {
    const ch = supabase.channel("pharmdly-rt").on("postgres_changes", { event: "*", schema: "public" }, () => cb()).subscribe();
    return () => supabase.removeChannel(ch);
  }
  const h = () => cb();
  window.addEventListener("pharmdly-changed", h);
  window.addEventListener("storage", h);
  return () => { window.removeEventListener("pharmdly-changed", h); window.removeEventListener("storage", h); };
}
