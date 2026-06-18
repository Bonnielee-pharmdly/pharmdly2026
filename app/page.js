"use client";
// 환자용 화면 — 프로토타입 전체 기능: 약국선택, 검색·분류, 트렌드·전국순위,
// 장바구니(수량조절), 동네인증 가격공개, 알림, 상품 추가 요청
import { useEffect, useState } from "react";
import Link from "next/link";
import { PHARMACIES, PRODUCTS, STOCK, price, dealOff, effPrice, won, DEPOSIT } from "../lib/data";
import {
  loadOrders, addOrder, updateOrder, onChange, loadPharmacies, loadInventoryAll,
  loadRequests, addRequest, isCloud, cloudUrlLooksWrong, getVerified, setVerified,
  getUser, setUser, logout, searchProducts, getInventoryAll,
} from "../lib/store";

const STATUS = {
  requested: { label: "승인 대기", cls: "requested", msg: "약사님의 승인을 기다리고 있어요. (5분 내 미승인 시 자동 취소)" },
  confirmed: { label: "주문 승인 ✅", cls: "confirmed", msg: "약국이 주문을 승인했어요! 방문 시 아래 QR을 보여주세요." },
  ready: { label: "픽업 준비 완료 📦", cls: "ready", msg: "약이 준비됐어요! 방문 시 QR을 보여주세요." },
  done: { label: "픽업 완료", cls: "done", msg: "이용해주셔서 감사합니다 :)" },
  rejected: { label: "주문 불가", cls: "rejected", msg: "재고 소진으로 취소되었습니다. 예약금은 자동 환불됩니다." },
  cancelled: { label: "자동 취소", cls: "rejected", msg: "5분 내 약사 미승인으로 자동 취소되었습니다. 예약금은 자동 환불됩니다." },
};
const TREND = [
  { name: "임팩타민 프리미엄", type: "일반의약품", desc: '"피로회복 비타민 끝판왕" 영상 320만 회', comment: "고함량 비타민B 복합제로 만성피로에 도움이 될 수 있으나, 위장장애가 있다면 식후 복용을 권합니다." },
  { name: "락토핏 골드", type: "건강기능식품", desc: '"국민 유산균" 숏폼 다수', comment: "균주와 보장균수를 확인하세요. 항생제 복용 중이라면 2시간 간격을 두세요." },
];
const RANKING = [
  { name: "임팩타민 프리미엄", cnt: 1842, chg: 2 }, { name: "센텔리안24 마데카크림", cnt: 1517, chg: 1 },
  { name: "닥터마밍 연고", cnt: 1203, chg: -1 }, { name: "락토핏 골드", cnt: 986, chg: 0 },
];
const CAT_GROUPS = [
  { key: "진통·해열", icon: "💊", cats: ["해열진통제"] },
  { key: "감기약", icon: "🤧", cats: ["감기약"] },
  { key: "소화제", icon: "🧪", cats: ["소화제"] },
  { key: "비타민", icon: "⚡", cats: ["고함량 비타민B", "비타민"] },
  { key: "상처케어", icon: "🩹", cats: ["상처케어", "상처치료"] },
  { key: "유산균", icon: "🦠", cats: ["유산균"] },
  { key: "더마·크림", icon: "🧴", cats: ["더마·크림", "더마"] },
  { key: "전체", icon: "🏷️", cats: null },
];

export default function PatientApp() {
  const [tab, setTab] = useState(0); // 0약국 1검색 2트렌드 3장바구니 4주문
  const [selPharm, setSelPharm] = useState(null);
  const [cart, setCart] = useState([]); // {key,name,qty,price}
  const [asap, setAsap] = useState(true);   // 바로 수령 여부
  const [when, setWhen] = useState("");     // 직접 선택한 방문 일시
  const [orders, setOrders] = useState([]);
  const [regPharms, setRegPharms] = useState([]);
  const [invAll, setInvAll] = useState([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("전체");
  const [verified, setVerifiedState] = useState(false);
  const [browseAll, setBrowseAll] = useState(false); // 전체 약국에서 검색 모드
  const [toast, setToast] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [reqText, setReqText] = useState("");
  const [favorites, setFavorites] = useState([]); // 단골 약국 id 목록
  const [myTab, setMyTab] = useState("orders"); // 마이페이지 서브탭
  const [catGroup, setCatGroup] = useState(null); // 분류로 보기 선택
  const [apiResults, setApiResults] = useState(null); // FastAPI 검색 결과 (null = 아직 검색 안 함)
  const [apiLoading, setApiLoading] = useState(false);
  const [apiInvAll, setApiInvAll] = useState([]); // FastAPI 전체 재고 (약국별 상품 수 계산용)

  // 앱 진입 흐름: splash(시작화면) → auth(회원가입/로그인) → gate(동네인증) → home(홈) → main(본 화면)
  const [stage, setStage] = useState("splash");
  const [user, setUserState] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPw, setAuthPw] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2300); }

  // FastAPI 검색 (debounce 300ms)
  const searchTimer = typeof window !== "undefined" ? window.__pharmdly_timer : null;
  async function handleSearch(val) {
    setQuery(val);
    setCatGroup(null);
    clearTimeout(window.__pharmdly_timer);
    if (!val.trim()) { setApiResults(null); return; }
    window.__pharmdly_timer = setTimeout(async () => {
      setApiLoading(true);
      try {
        const data = await searchProducts(val.trim());
        setApiResults(Array.isArray(data) ? data : null);
      } catch { setApiResults(null); }
      finally { setApiLoading(false); }
    }, 300);
  }

  async function refresh() {
    setOrders(await loadOrders());
    setRegPharms(await loadPharmacies());
    setInvAll(await loadInventoryAll());
    getInventoryAll().then((d) => setApiInvAll(Array.isArray(d) ? d : []));
  }
  useEffect(() => {
    const v = getVerified();
    setVerifiedState(v);
    const u = getUser();
    setUserState(u);
    refresh();
    const timer = setTimeout(() => {
      if (!u) setStage("auth");
      else if (!v) setStage("gate");
      else setStage("home");
    }, 1400);
    const off = onChange(refresh);
    return () => { clearTimeout(timer); off(); };
  }, []);

  function verifyArea() {
    setVerified(true);
    setVerifiedState(true);
    showToast("📍 동네 인증 완료! 실제 판매가가 공개됩니다");
  }

  function submitAuth() {
    if (!authEmail.trim() || !authPw.trim() || (authMode === "signup" && !authName.trim())) {
      showToast("필수 정보를 입력해주세요"); return;
    }
    const u = { name: authMode === "signup" ? authName.trim() : (authName.trim() || "팜들리 회원"), email: authEmail.trim() };
    setUser(u);
    setUserState(u);
    setStage(getVerified() ? "home" : "gate");
  }

  function doLogout() {
    logout();
    setUserState(null);
    setAuthMode("login");
    setAuthEmail("");
    setAuthPw("");
    setAuthName("");
    setStage("auth");
    showToast("로그아웃 되었습니다");
  }

  function goHomeFromGate() {
    verifyArea();
    setStage("home");
  }

  function enterProductSearch() {
    setSelPharm(null);
    setBrowseAll(false);
    setQuery("");
    setCat("전체");
    setTab(1);
    setStage("main");
  }
  function enterPharmacySearch() {
    setTab(0);
    setStage("main");
  }

  /* 약국 목록 (등록 약국 + 예시) */
  const pharmList = [
    ...regPharms.map((p) => ({
      id: p.id, name: p.name,
      dist: (p.address || "직접 등록한 약국") + (p.addressDetail ? " " + p.addressDetail : ""),
      hours: p.hours, late: p.late, demo: false,
      // invAll(Supabase) 우선, 없으면 apiInvAll(FastAPI) 사용
      count: invAll.filter((i) => i.pharmacyId === p.id && i.status !== "out").length ||
             apiInvAll.filter((i) => i.pharmacy_id === p.id && (i.stock_qty - (i.locked_qty || 0)) > 0).length,
      deals: invAll.filter((i) => i.pharmacyId === p.id && i.status !== "out" && i.dealOff > 0).length,
    })),
    ...PHARMACIES.filter((p) => p.id !== 1).map((p) => ({
      ...p, id: "demo-" + p.id, demo: true,
      count: Object.keys(STOCK[p.id]).length,
      deals: Object.keys(STOCK[p.id]).filter((pid) => dealOff(p.id, +pid) > 0).length,
    })),
  ];
  const pharm = pharmList.find((p) => p.id === selPharm);

  /* 선택 약국의 상품 목록 */
  const demoId = typeof selPharm === "string" ? +selPharm.replace("demo-", "") : null;
  const allProducts = !pharm ? [] : !pharm.demo
    ? invAll.filter((i) => i.pharmacyId === selPharm && i.status !== "out").map((i) => ({
        key: "inv-" + i.id, name: i.name, cat: i.cat || "기타", type: i.type, low: i.status === "low",
        orig: i.price, eff: Math.max(0, i.price - (i.dealOff || 0)), off: i.dealOff || 0,
        availableQty: i.availableQty || 9,
      }))
    : PRODUCTS.filter((p) => STOCK[demoId][p.id]).map((p) => ({
        key: "demo-" + p.id, name: p.name, cat: p.cat, type: p.type, low: STOCK[demoId][p.id] === "low",
        orig: price(demoId, p.id), eff: effPrice(demoId, p.id), off: dealOff(demoId, p.id),
      }));

  const cats = ["전체", ...Array.from(new Set(allProducts.map((p) => p.cat)))];
  const productList = allProducts.filter((p) =>
    (cat === "전체" || p.cat === cat) &&
    (!query || p.name.includes(query) || p.cat.includes(query))
  );

  /* 약국별 보유 상품 목록 (전체 약국 검색용) */
  function productsOf(ph) {
    const dId = typeof ph.id === "string" ? +ph.id.replace("demo-", "") : null;
    return !ph.demo
      ? invAll.filter((i) => i.pharmacyId === ph.id && i.status !== "out").map((i) => ({
          key: "inv-" + i.id, name: i.name, cat: i.cat || "기타", type: i.type, low: i.status === "low",
          orig: i.price, eff: Math.max(0, i.price - (i.dealOff || 0)), off: i.dealOff || 0,
        }))
      : PRODUCTS.filter((p) => STOCK[dId][p.id]).map((p) => ({
          key: "demo-" + p.id, name: p.name, cat: p.cat, type: p.type, low: STOCK[dId][p.id] === "low",
          orig: price(dId, p.id), eff: effPrice(dId, p.id), off: dealOff(dId, p.id),
        }));
  }

  const showGlobal = !pharm || browseAll;

  /* 전체 약국 보유 상품 (약국 미선택 또는 "전체 약국에서 검색" 모드) */
  const globalProducts = pharmList.flatMap((ph) =>
    productsOf(ph).map((p) => ({ ...p, pharmId: ph.id, pharmName: ph.name, pharmDemo: ph.demo, pharmDist: ph.dist }))
  );
  const globalCats = ["전체", ...Array.from(new Set(globalProducts.map((p) => p.cat)))];
  const catGroupCounts = CAT_GROUPS.map((g) => ({
    ...g,
    count: new Set(globalProducts.filter((p) => g.cats === null || g.cats.includes(p.cat)).map((p) => p.name)).size,
  }));
  const globalGroups = (!query && !catGroup) ? [] : Object.values(
    globalProducts
      .filter((p) => (cat === "전체" || p.cat === cat)
        && (!query || p.name.includes(query) || p.cat.includes(query))
        && (!catGroup || catGroup.cats === null || catGroup.cats.includes(p.cat)))
      .reduce((acc, p) => {
        if (!acc[p.name]) acc[p.name] = { name: p.name, cat: p.cat, type: p.type, offers: [] };
        acc[p.name].offers.push(p);
        return acc;
      }, {})
  );
  // 가까운 순(데모): 내가 인증한 동네의 등록 약국을 먼저, 예시 약국은 뒤로 정렬
  globalGroups.forEach((g) => g.offers.sort((a, b) => (a.pharmDemo ? 1 : 0) - (b.pharmDemo ? 1 : 0)));

  function toggleFavorite(id) {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  function selectPharm(id) {
    if (cart.length && id !== selPharm && !confirm("약국을 바꾸면 장바구니가 비워집니다. 바꿀까요?")) return;
    if (id !== selPharm) { setCart([]); setQuery(""); setCat("전체"); }
    setSelPharm(id);
    setBrowseAll(false);
    setTab(1);
    showToast(pharmList.find((p) => p.id === id)?.name + " 선택!");
  }

  /* 전체 검색 결과에서 특정 약국의 상품을 바로 장바구니에 담기 */
  function pickAndAdd(offer) {
    if (!verified) { showToast("📍 동네 인증 후 담을 수 있어요"); return; }
    if (cart.length && offer.pharmId !== selPharm) {
      if (!confirm(`${offer.pharmName}으로 약국을 바꾸면 장바구니가 비워집니다. 바꿀까요?`)) return;
      setCart([]);
    }
    if (offer.pharmId !== selPharm) { setSelPharm(offer.pharmId); }
    setBrowseAll(false); setQuery(""); setCat("전체");
    setCart((c) => {
      const it = c.find((i) => i.key === offer.key);
      if (it) return c.map((i) => (i.key === offer.key ? { ...i, qty: Math.min(9, i.qty + 1) } : i));
      return [...c, { key: offer.key, name: offer.name, qty: 1, price: offer.eff }];
    });
    showToast(`🛒 ${offer.pharmName}에서 담았습니다`);
  }

  /* 전체 검색 결과에서 약국만 선택해 둘러보기 */
  function viewPharmFromSearch(offer) {
    if (cart.length && offer.pharmId !== selPharm && !confirm(`${offer.pharmName}으로 약국을 바꾸면 장바구니가 비워집니다. 바꿀까요?`)) return;
    if (offer.pharmId !== selPharm) { setCart([]); }
    setSelPharm(offer.pharmId);
    setBrowseAll(false); setQuery(""); setCat("전체");
    showToast(offer.pharmName + " 선택!");
  }

  function addCart(p) {
    if (!verified) { showToast("📍 동네 인증 후 담을 수 있어요"); return; }
    const maxQty = p.availableQty || 9;
    setCart((c) => {
      const it = c.find((i) => i.key === p.key);
      if (it) {
        if (it.qty >= maxQty) { showToast(`재고가 ${maxQty}개까지만 담을 수 있어요`); return c; }
        return c.map((i) => (i.key === p.key ? { ...i, qty: Math.min(maxQty, i.qty + 1) } : i));
      }
      return [...c, { key: p.key, name: p.name, qty: 1, price: p.eff, maxQty }];
    });
    showToast("🛒 장바구니에 담았습니다");
  }
  function changeQty(key, d) {
    setCart((c) => c.map((i) => {
      if (i.key !== key) return i;
      const newQty = i.qty + d;
      if (newQty <= 0) return { ...i, qty: 0 };
      return { ...i, qty: Math.min(i.maxQty || 9, newQty) };
    }).filter((i) => i.qty > 0));
  }

  function timeLabel() {
    if (asap) return "⚡ 바로 수령 (가능한 빨리)";
    const d = new Date(when);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} 방문`;
  }

  async function sendOrder() {
    if (!asap && !when) { showToast("방문 날짜와 시간을 선택해주세요"); return; }
    if (!asap && new Date(when) < new Date()) { showToast("지난 시간은 선택할 수 없어요"); return; }
    try {
      await addOrder({
        num: "P-" + String(Math.floor(1000 + Math.random() * 9000)),
        pharmId: selPharm, pharmName: pharm?.name || "약국", time: timeLabel(), status: "requested", eta: null,
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, product_id: i.productId || null })),
        total: cart.reduce((s, i) => s + i.price * i.qty, 0),
      });
      setCart([]); setTab(4); refresh();
      showToast("📨 주문 전송! 약사님 승인을 기다려주세요");
    } catch (e) { alert("주문 중 문제: " + (e.message || e)); }
  }

  async function sendRequest() {
    if (!pharm) { showToast("먼저 약국을 선택해주세요"); return; }
    if (!reqText.trim()) { showToast("제품명을 입력해주세요"); return; }
    if (pharm.demo) { showToast("예시 약국에는 요청할 수 없어요"); return; }
    try {
      await addRequest(selPharm, reqText.trim());
      setReqText(""); refresh();
      showToast("🙋 추가 요청 전송! 입고되면 약국이 처리해드려요");
    } catch (e) { alert("요청 중 문제: " + (e.message || e) + "\n(Supabase에서 upgrade1.sql을 실행했는지 확인하세요)"); }
  }

  /* 알림: 진행 중 주문 상태 */
  const activeOrders = orders.filter((o) => ["confirmed", "ready", "rejected"].includes(o.status));
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (stage === "splash") {
    return (
      <div className="splash-screen">
        <div className="mascot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot-walk.svg" alt="캡슐 프렌드" className="mascot-body" />
        </div>
        <div className="brand-big">팜들리</div>
        <div className="tagline">캡슐 프렌드가 인사를 건네요 — 잠시만 기다려주세요!</div>
      </div>
    );
  }

  if (stage === "auth") {
    return (
      <div className="auth-screen">
        <div className="mascot-sm">💊</div>
        <h1>팜들리에 오신 걸 환영해요</h1>
        <p>회원가입 또는 로그인 후 동네 인증을 하면<br />주변 약국의 실제 판매가를 확인할 수 있어요.</p>
        <div className="auth-tabs">
          <span className={"chip" + (authMode === "login" ? " on" : "")} onClick={() => setAuthMode("login")}>로그인</span>
          <span className={"chip" + (authMode === "signup" ? " on" : "")} onClick={() => setAuthMode("signup")}>회원가입</span>
        </div>
        <div className="card">
          {authMode === "signup" && (
            <input placeholder="이름" value={authName} onChange={(e) => setAuthName(e.target.value)} style={{ marginTop: 0 }} />
          )}
          <input placeholder="이메일" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={authMode === "signup" ? {} : { marginTop: 0 }} />
          <input placeholder="비밀번호" type="password" value={authPw} onChange={(e) => setAuthPw(e.target.value)} />
          <button className="btn" onClick={submitAuth}>{authMode === "signup" ? "회원가입하고 시작하기" : "로그인"}</button>
          <div className="notice" style={{ marginTop: 10 }}>데모 화면입니다. 실제 인증(이메일 확인 등)은 Supabase Auth 연동 시 추가됩니다.</div>
        </div>
      </div>
    );
  }

  if (stage === "gate") {
    return (
      <div className="gate-screen">
        <div className="mascot-sm">📍</div>
        <h1>우리 동네를 인증해주세요</h1>
        <p>GPS 기반 동네 인증을 마치면<br />주변 약국의 실제 판매가와 재고를 볼 수 있어요.</p>
        <div className="card">
          <button className="btn amber" onClick={goHomeFromGate}>📍 내 위치로 동네 인증하기 (GPS · 데모)</button>
          <div className="notice" style={{ marginTop: 10 }}>실제 서비스에서는 GPS로 동(읍·면) 단위까지만 인증해 위치 정보를 최소한으로 사용합니다.</div>
        </div>
      </div>
    );
  }

  if (stage === "home") {
    return (
      <div className="home-screen">
        <div className="mascot-sm">💊</div>
        <h1>{user?.name ? `${user.name}님, 안녕하세요!` : "안녕하세요!"}</h1>
        <p>무엇을 도와드릴까요?</p>
        <div className="home-icon-grid">
          <div className="home-icon-card" onClick={enterProductSearch}>
            <span className="hi-emoji">🔍</span>
            <div className="hi-label">제품 검색</div>
            <div className="hi-sub">찾는 약을 검색하고<br />보유 약국을 가까운 순으로</div>
          </div>
          <div className="home-icon-card" onClick={enterPharmacySearch}>
            <span className="hi-emoji">🏥</span>
            <div className="hi-label">우리동네 약국 검색</div>
            <div className="hi-sub">약국을 먼저 선택하고<br />보유 재고·가격 확인</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="brand">팜들리 <span style={{ fontSize: 11, fontWeight: 400 }}>{isCloud ? "☁️" : "💻"}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="bell" onClick={() => { setTab(3); setBellOpen(false); }}>
              🛒{cartCount > 0 && <span className="cnt">{cartCount}</span>}
            </div>
            <div className="bell" onClick={() => setBellOpen(!bellOpen)}>
              🔔{activeOrders.length > 0 && <span className="cnt">{activeOrders.length}</span>}
            </div>
          </div>
        </div>
        <small>
          {verified ? "📍 동네 인증됨 · " : ""}{pharm ? pharm.name : "약 이름으로 검색해 약국을 찾아보세요"}
        </small>
      </div>

      {bellOpen && (
        <div className="notif-panel">
          <div className="section-title" style={{ margin: "6px 0" }}>🔔 알림</div>
          {!activeOrders.length && <div className="notif-item" style={{ color: "var(--gray)" }}>새 알림이 없습니다.</div>}
          {activeOrders.map((o) => (
            <div key={o.num} className="notif-item">
              {o.status === "confirmed" && <>✅ <b>{o.pharmName}</b> 주문 승인 — 예상 픽업 {o.eta}</>}
              {o.status === "ready" && <>📦 <b>{o.pharmName}</b> 픽업 준비 완료! 지금 방문하세요</>}
              {o.status === "rejected" && <>❌ <b>{o.pharmName}</b> 주문 불가 — 예약금 자동 환불</>}
              <div style={{ fontSize: 10.5, color: "var(--gray)" }}>주문 {o.num}</div>
            </div>
          ))}
        </div>
      )}

      <div className="content" onClick={() => bellOpen && setBellOpen(false)}>
        {cloudUrlLooksWrong && (
          <div className="banner rejected">⚠️ Supabase 주소 형식이 이상해요. .env.local의 URL이 https://xxxx.supabase.co 모양인지 확인하세요.</div>
        )}

        {!verified && (
          <div className="banner verify">
            🔒 동네 인증하면 약국별 <b>실제 판매가</b>가 공개되고 주문할 수 있어요.
            <button className="btn amber" style={{ marginTop: 8 }} onClick={verifyArea}>📍 동네 인증하기 (GPS · 데모)</button>
          </div>
        )}

        {tab === 0 && (
          <>
            <div className="section-title">🏥 내 주변 약국</div>
            {!regPharms.length && (
              <div className="notice" style={{ marginBottom: 10 }}>
                💡 <Link href="/pharmacy">약국용 화면</Link>에서 약국·상품을 등록하면 여기 맨 위에 나타나요. 아래는 연습용 예시입니다.
              </div>
            )}
            {pharmList.map((ph) => (
              <div key={ph.id} className={"card" + (selPharm === ph.id ? " sel" : "")}>
                <div className="row">
                  <div>
                    <div className="name">
                      {ph.name} {ph.late && <span className="tag deal">심야</span>}
                      {ph.demo && <span className="tag otc">예시</span>}
                    </div>
                    <div className="meta">
                      {ph.dist} · 영업 {ph.hours}<br />
                      등록 상품 {ph.count}종{ph.deals > 0 && <b style={{ color: "var(--red)" }}> · 🎁 픽업 할인 {ph.deals}종</b>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ cursor: "pointer", fontSize: 18 }} onClick={() => toggleFavorite(ph.id)}>
                      {favorites.includes(ph.id) ? "⭐" : "☆"}
                    </span>
                    <button className={"add-btn" + (selPharm === ph.id ? " added" : "")} onClick={() => selectPharm(ph.id)}>
                      {selPharm === ph.id ? "✓ 내 약국" : "선택"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 1 && (
          <>
            <input placeholder="증상 혹은 제품명을 입력하세요" value={query} onChange={(e) => handleSearch(e.target.value)} style={{ marginTop: 0 }} />
            <div className="chips">
              {(showGlobal ? globalCats : cats).map((c) => (
                <span key={c} className={"chip" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c}</span>
              ))}
            </div>

            {pharm && (
              <div className="chips" style={{ marginTop: 6 }}>
                {showGlobal ? (
                  <span className="chip" onClick={() => setBrowseAll(false)}>📍 {pharm.name} 보기</span>
                ) : (
                  <span className="chip" onClick={() => setBrowseAll(true)}>🔍 전체 약국에서 찾기</span>
                )}
              </div>
            )}

            {showGlobal && (
              <>
                {!query && !catGroup && (
                  <>
                    <div className="section-title">📦 분류로 보기</div>
                    <div className="cat-grid">
                      {catGroupCounts.map((g) => (
                        <div key={g.key} className="cat-btn" onClick={() => { setCatGroup(g); setBrowseAll(true); }}>
                          <div className="ce">{g.icon}</div>
                          <div className="cn">{g.key}<br />{g.count}종</div>
                        </div>
                      ))}
                    </div>
                    <div className="empty">
                      또는 찾는 약 이름을 검색해보세요.<br />보유 중인 약국을 가까운 순으로 보여드려요! 🔍
                    </div>
                  </>
                )}
                {catGroup && !query && (
                  <div className="chips" style={{ marginTop: -2 }}>
                    <span className="chip" onClick={() => setCatGroup(null)}>← 분류 다시 보기</span>
                  </div>
                )}
                {(query || catGroup) && (
                  <div className="section-title">
                    {query
                      ? apiResults !== null
                        ? `"${query}" 검색 결과 ${apiResults.length}종`
                        : `"${query}" 검색 결과 ${globalGroups.length}종`
                      : `${catGroup.key} 분류`}
                    {apiLoading && <span style={{ color: "var(--gray)", fontWeight: 400 }}> 검색 중…</span>}
                  </div>
                )}

                {/* FastAPI 검색 결과 */}
                {query && apiResults !== null && (
                  <>
                    {apiResults.length === 0 && !apiLoading && (
                      <div className="empty">"{query}" 관련 재고를 보유한 약국이 없어요.</div>
                    )}
                    {apiResults.map((p) => (
                      <div key={p.product_id} className="card">
                        <div className="name" style={{ marginTop: 2 }}>{p.standard_name}</div>
                        {p.manufacturer && <div className="meta">{p.manufacturer}</div>}
                        {(p.pharmacies || []).map((ph) => (
                          <div className="row" key={ph.pharmacy_id} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
                            <div>
                              <div className="meta" style={{ fontWeight: 600 }}>🏥 {ph.pharmacy_name}</div>
                              {ph.pharmacy_address && <div className="meta" style={{ fontSize: 11 }}>{ph.pharmacy_address}</div>}
                              <span className="tag otc">재고 {ph.available_qty}개</span>
                              {verified ? (
                                ph.price ? <div className="price">{won(ph.price)}</div> : null
                              ) : (
                                <div className="price-lock" onClick={verifyArea}>🔒 동네 인증 시 판매가 공개</div>
                              )}
                            </div>
                            <button className="add-btn" onClick={() => {
                              if (!verified) { showToast("📍 동네 인증 후 담을 수 있어요"); return; }
                              const pharmObj = regPharms.find((r) => r.id === ph.pharmacy_id);
                              if (cart.length && ph.pharmacy_id !== selPharm) {
                                if (!confirm(`${ph.pharmacy_name}으로 약국을 바꾸면 장바구니가 비워집니다. 바꿀까요?`)) return;
                                setCart([]);
                              }
                              setSelPharm(ph.pharmacy_id);
                              const key = `api-${p.product_id}`;
                              const mq = ph.available_qty || 9;
                              setCart((c) => {
                                const it = c.find((i) => i.key === key);
                                if (it) {
                                  if (it.qty >= mq) { showToast(`재고가 ${mq}개까지만 담을 수 있어요`); return c; }
                                  return c.map((i) => i.key === key ? { ...i, qty: Math.min(mq, i.qty + 1) } : i);
                                }
                                return [...c, { key, name: p.standard_name, qty: 1, price: ph.price || 0, maxQty: mq, productId: p.product_id }];
                              });
                              showToast(`🛒 ${ph.pharmacy_name}에서 담았습니다`);
                            }}>🛒 담기</button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {/* 기존 재고(invAll) 기반 결과 — FastAPI 미연동 시 폴백 */}
                {(!query || apiResults === null) && !catGroup && null}
                {(!query || apiResults === null) && catGroup && (
                  <>
                    {!globalGroups.length && (
                      <div className="empty">{catGroup.key} 분류의 상품을 보유한 약국이 없어요.</div>
                    )}
                    {globalGroups.map((g) => (
                      <div key={g.name} className="card">
                        <span className="tag otc">{g.type}</span>
                        <div className="name" style={{ marginTop: 6 }}>{g.name}</div>
                        <div className="meta">{g.cat}</div>
                        {g.offers.map((o) => (
                          <div className="row" key={o.pharmId + "-" + o.key} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
                            <div>
                              <div className="meta" style={{ fontWeight: 600 }}>🏥 {o.pharmName}</div>
                              {o.low && <span className="tag deal">소량 남음</span>}
                              {verified ? (
                                <div className="price">
                                  {o.off > 0 && <s>{won(o.orig)}</s>}
                                  {won(o.eff)}
                                  {o.off > 0 && <span className="tag deal" style={{ marginLeft: 4 }}>🎁 −{won(o.off)}</span>}
                                </div>
                              ) : (
                                <div className="price-lock" onClick={verifyArea}>🔒 동네 인증 시 판매가 공개</div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn small" onClick={() => viewPharmFromSearch(o)}>약국 보기</button>
                              <button className="add-btn" onClick={() => pickAndAdd(o)}>🛒 담기</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {!showGlobal && pharm && (
              <>
                {/* query 있고 FastAPI 결과 있으면 → FastAPI 결과를 현재 약국으로 필터 */}
                {query && apiResults !== null ? (() => {
                  const pharmProds = (apiResults || [])
                    .map((p) => ({ p, ph: (p.pharmacies || []).find((ph) => ph.pharmacy_id === selPharm) }))
                    .filter(({ ph }) => !!ph);
                  return (
                    <>
                      <div className="section-title">
                        📍 {pharm.name} &ldquo;{query}&rdquo; 검색 결과 {pharmProds.length}종
                        {apiLoading && <span style={{ color: "var(--gray)", fontWeight: 400 }}> 검색 중…</span>}
                      </div>
                      {pharmProds.length === 0 && !apiLoading && (
                        <div className="empty">
                          &ldquo;{query}&rdquo; 재고가 없어요.<br />
                          <span style={{ color: "var(--teal)", cursor: "pointer" }} onClick={() => setBrowseAll(true)}>전체 약국에서 찾기 →</span>
                        </div>
                      )}
                      {pharmProds.map(({ p, ph }) => {
                        const key = `api-${p.product_id}`;
                        const inCartItem = cart.find((i) => i.key === key);
                        return (
                          <div key={p.product_id} className="card">
                            <div className="row">
                              <div>
                                <span className="tag otc">일반의약품</span>
                                <div className="name" style={{ marginTop: 6 }}>{p.standard_name}</div>
                                {p.manufacturer && <div className="meta">{p.manufacturer}</div>}
                                <span className="tag otc">재고 {ph.available_qty}개</span>
                                {verified ? (
                                  ph.price ? <div className="price">{won(ph.price)}</div> : null
                                ) : (
                                  <div className="price-lock" onClick={verifyArea}>🔒 동네 인증 시 판매가 공개</div>
                                )}
                              </div>
                              {inCartItem ? (
                                <div className="qty-mini">
                                  <button onClick={() => changeQty(key, -1)}>−</button>
                                  <span>{inCartItem.qty}</span>
                                  <button onClick={() => changeQty(key, 1)}>＋</button>
                                </div>
                              ) : (
                                <button className="add-btn" onClick={() => {
                                  if (!verified) { showToast("📍 동네 인증 후 담을 수 있어요"); return; }
                                  setCart((c) => {
                                    const mq = ph.available_qty || 9;
                                    const it = c.find((i) => i.key === key);
                                    if (it) {
                                      if (it.qty >= mq) { showToast(`재고가 ${mq}개까지만 담을 수 있어요`); return c; }
                                      return c.map((i) => i.key === key ? { ...i, qty: Math.min(mq, i.qty + 1) } : i);
                                    }
                                    return [...c, { key, name: p.standard_name, qty: 1, price: ph.price || 0, maxQty: mq, productId: p.product_id }];
                                  });
                                  showToast(`🛒 담았습니다`);
                                }}>🛒 담기</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })() : (
                  /* query 없음 or FastAPI 결과 없음 → invAll 기반 */
                  <>
                    <div className="section-title">📍 {pharm.name} {query ? `"${query}" 검색 결과` : "보유 상품"} {productList.length}종</div>
                    {!productList.length && (
                      <div className="empty">
                        {query ? `"${query}" 관련 상품이 없어요.` : "등록된 상품이 없어요."}<br />아래에서 상품 추가를 요청해보세요!
                      </div>
                    )}
                    {productList.map((p) => {
                      const inCartItem = cart.find((i) => i.key === p.key);
                      return (
                        <div key={p.key} className="card">
                          <div className="row">
                            <div>
                              <span className="tag otc">{p.type}</span>
                              {p.low && <span className="tag deal">소량 남음</span>}
                              <div className="name" style={{ marginTop: 6 }}>{p.name}</div>
                              <div className="meta">{p.cat}</div>
                              <span className="tag otc" style={{ marginTop: 4 }}>재고 {p.availableQty}개</span>
                              {verified ? (
                                <div className="price">
                                  {p.off > 0 && <s>{won(p.orig)}</s>}
                                  {won(p.eff)}
                                  {p.off > 0 && <span className="tag deal" style={{ marginLeft: 4 }}>🎁 −{won(p.off)}</span>}
                                </div>
                              ) : (
                                <div className="price-lock" onClick={verifyArea}>🔒 동네 인증 시 판매가 공개</div>
                              )}
                            </div>
                            {inCartItem ? (
                              <div className="qty-mini">
                                <button onClick={() => changeQty(p.key, -1)}>−</button>
                                <span>{inCartItem.qty}</span>
                                <button onClick={() => changeQty(p.key, 1)}>＋</button>
                              </div>
                            ) : (
                              <button className="add-btn" onClick={() => addCart(p)}>🛒 담기</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {!pharm.demo && (
                  <div className="card" style={{ borderColor: "var(--teal)" }}>
                    <div className="section-title" style={{ margin: "0 0 6px" }}>➕ 상품 추가 요청</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input placeholder="요청할 제품명" value={reqText} onChange={(e) => setReqText(e.target.value)} style={{ marginTop: 0, flex: 1 }} />
                      <button className="btn small" onClick={sendRequest}>요청</button>
                    </div>
                    <div className="meta" style={{ marginTop: 6 }}>요청은 약사님께 전달되고, 입고 시 처리됩니다.</div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 2 && (
          <>
            <div className="section-title">🔥 쇼츠에서 화제! 약사 팩트체크</div>
            {TREND.map((t) => {
              const match = allProducts.find((p) => p.name.includes(t.name.slice(0, 4)));
              return (
                <div key={t.name} className="card">
                  <div className="row">
                    <div>
                      <span className="tag deal">SHORTS 인기</span><span className="tag otc">{t.type}</span>
                      <div className="name" style={{ marginTop: 6 }}>{t.name}</div>
                      <div className="meta" style={{ lineHeight: 1.6 }}>{t.desc}<br /><b style={{ color: "var(--teal)" }}>👩‍⚕️ 약사 코멘트:</b> {t.comment}</div>
                    </div>
                    {match
                      ? <button className="add-btn" onClick={() => addCart(match)}>🛒 담기</button>
                      : <button className="add-btn" style={{ borderColor: "#ccc", color: "#aaa" }} onClick={() => { setTab(1); setReqText(t.name); }}>➕ 요청</button>}
                  </div>
                </div>
              );
            })}
            <div className="section-title">🏆 실시간 요청 제품 전국 순위 (데모)</div>
            <div className="card">
              {RANKING.map((r, i) => (
                <div key={r.name} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="meta"><b style={{ color: i < 3 ? "var(--teal)" : "var(--gray)", marginRight: 8 }}>{i + 1}</b>{r.name}</div>
                  <div className="meta">요청 {r.cnt.toLocaleString()}건 {r.chg > 0 ? "▲" + r.chg : r.chg < 0 ? "▼" + -r.chg : "—"}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 3 && (!cart.length ? <div className="empty">장바구니가 비어 있어요 🛒<br />검색 탭에서 상품을 담아보세요!</div> : (
          <>
            <div className="section-title">🛒 장바구니 — {pharm?.name || "선택한 약국"}</div>
            <div className="card">
              {cart.map((i) => (
                <div key={i.key} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
                  <div className="meta" style={{ flex: 1 }}>{i.name}<br />{won(i.price)}</div>
                  <div className="qty-mini">
                    <button onClick={() => changeQty(i.key, -1)}>−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => changeQty(i.key, 1)}>＋</button>
                  </div>
                </div>
              ))}
              <div className="total"><span>합계 (실판매가)</span><span>{won(cartTotal)}</span></div>
              <div className="subline"><span>픽업 예약금 (지금 결제 · 데모)</span><span>{won(DEPOSIT)}</span></div>
              <div className="subline"><span>약국 방문 시 결제</span><span>{won(Math.max(0, cartTotal - DEPOSIT))}</span></div>
            </div>
            <div className="card">
              <div className="section-title" style={{ margin: "0 0 8px" }}>방문 예정 시간</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={asap ? "btn small" : "btn small outline"} style={{ flex: 1 }} onClick={() => setAsap(true)}>⚡ 바로 수령</button>
                <button className={!asap ? "btn small" : "btn small outline"} style={{ flex: 1 }} onClick={() => setAsap(false)}>📅 날짜·시간 선택</button>
              </div>
              {!asap && (
                <input
                  type="datetime-local"
                  value={when}
                  min={new Date(Date.now() + 10 * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setWhen(e.target.value)}
                />
              )}
              {!asap && when && <div className="meta" style={{ marginTop: 6 }}>선택: <b>{timeLabel()}</b></div>}
              <button className="btn amber" onClick={sendOrder}>📨 주문서 보내기 + 예약금 결제 (데모)</button>
            </div>
            <div className="notice">주문은 약사님이 승인해야 확정됩니다. 의약품 잔액은 약국에서 복약지도와 함께 대면 결제해요.</div>
          </>
        ))}

        {tab === 4 && (
          <>
            <div className="section-title">👤 마이페이지</div>
            <div className="chips">
              {[
                ["profile", "👤 개인정보"],
                ["payment", "💳 결제 정보"],
                ["orders", "📋 주문내역"],
                ["favorites", "⭐ 단골 약국"],
                ["location", "📍 위치 인증"],
              ].map(([key, label]) => (
                <span key={key} className={"chip" + (myTab === key ? " on" : "")} onClick={() => setMyTab(key)}>{label}</span>
              ))}
            </div>

            {myTab === "profile" && (
              <div className="card">
                <div className="section-title" style={{ margin: "0 0 8px" }}>👤 개인정보</div>
                <div className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="meta">이름</div><div className="meta">{user?.name || "데모 사용자"}</div>
                </div>
                <div className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="meta">이메일</div><div className="meta">{user?.email || "demo@pharmdly.app"}</div>
                </div>
                <div className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="meta">휴대폰 번호</div><div className="meta">010-0000-0000</div>
                </div>
                <button className="btn outline" style={{ marginTop: 10 }}>회원정보 수정 (준비중)</button>
                <button className="btn red" style={{ marginTop: 10 }} onClick={doLogout}>🚪 로그아웃</button>
                <div className="notice" style={{ marginTop: 10 }}>로그인·회원가입 기능 연동 시 실제 정보로 표시됩니다.</div>
              </div>
            )}

            {myTab === "payment" && (
              <div className="card">
                <div className="section-title" style={{ margin: "0 0 8px" }}>💳 결제 정보</div>
                <div className="notice">현재 앱에서는 약 가격을 직접 결제하지 않으며, 픽업 예약 시 <b>{won(DEPOSIT)}</b>의 예약보증금만 결제됩니다. 의약품 잔액은 약국 방문 시 대면으로 결제해요.</div>
                <div className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="meta">등록된 결제수단</div><div className="meta">없음</div>
                </div>
                <button className="btn outline" style={{ marginTop: 10 }}>결제수단 등록 (준비중)</button>
                <div className="section-title" style={{ margin: "14px 0 8px" }}>예약보증금 내역</div>
                {!orders.length && <div className="empty">예약보증금 결제 내역이 없어요.</div>}
                {orders.map((o) => (
                  <div key={o.num} className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <div className="meta">주문 {o.num} · {o.pharmName}</div>
                    <div className="meta">{won(DEPOSIT)} {o.status === "rejected" ? "(환불됨)" : ""}</div>
                  </div>
                ))}
              </div>
            )}

            {myTab === "orders" && (!orders.length ? <div className="empty">아직 주문이 없어요</div> : orders.map((o) => {
              const st = STATUS[o.status] || STATUS.requested;
              const showQR = o.status === "confirmed" || o.status === "ready";
              return (
                <div key={o.num} className="card">
                  <div className={"banner " + st.cls}>{st.label} · {st.msg}</div>
                  <div className="meta">주문번호 {o.num} · {o.pharmName} · {o.time}</div>
                  {(o.items || []).map((it, idx) => (
                    <div key={idx} className="row" style={{ padding: "6px 0" }}>
                      <div className="meta">{it.name} × {it.qty}</div>
                      <div className="meta">{won(it.price * it.qty)}</div>
                    </div>
                  ))}
                  <div className="total"><span>합계</span><span>{won(o.total)}</span></div>
                  {o.eta && <div className="banner confirmed" style={{ marginTop: 8 }}>🕒 예상 픽업 시간: <b>{o.eta}</b></div>}
                  {showQR && (
                    <div style={{ textAlign: "center", margin: "14px 0 4px", padding: "18px 14px", background: "#f8fff8", borderRadius: 10, border: "1px solid #c8e6c9" }}>
                      <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600, marginBottom: 12 }}>💊 약국 카운터에 이 번호를 알려주세요</div>
                      <div style={{ fontSize: 56, fontWeight: 800, color: "#1b5e20", letterSpacing: 6, lineHeight: 1 }}>
                        {o.num.replace("P-", "")}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 10 }}>픽업번호 (주문번호: {o.num})</div>
                    </div>
                  )}
                  {o.status === "ready" && (
                    <button className="btn outline" onClick={async () => { await updateOrder(o.num, { status: "done" }); refresh(); }}>픽업 완료 처리 (데모)</button>
                  )}
                </div>
              );
            }))}

            {myTab === "favorites" && (!favorites.length ? (
              <div className="empty">아직 단골 약국이 없어요 ⭐<br />약국 탭에서 ☆ 아이콘을 눌러 등록해보세요!</div>
            ) : (
              pharmList.filter((ph) => favorites.includes(ph.id)).map((ph) => (
                <div key={ph.id} className={"card" + (selPharm === ph.id ? " sel" : "")}>
                  <div className="row">
                    <div>
                      <div className="name">
                        {ph.name} {ph.late && <span className="tag deal">심야</span>}
                        {ph.demo && <span className="tag otc">예시</span>}
                      </div>
                      <div className="meta">{ph.dist} · 영업 {ph.hours}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ cursor: "pointer", fontSize: 18 }} onClick={() => toggleFavorite(ph.id)}>⭐</span>
                      <button className={"add-btn" + (selPharm === ph.id ? " added" : "")} onClick={() => selectPharm(ph.id)}>
                        {selPharm === ph.id ? "✓ 내 약국" : "선택"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ))}

            {myTab === "location" && (
              <div className="card">
                <div className="section-title" style={{ margin: "0 0 8px" }}>📍 위치 인증 정보</div>
                {verified ? (
                  <>
                    <div className="banner confirmed">✅ 동네 인증 완료 — 인증된 위치 기준으로 주변 약국의 실제 판매가가 공개됩니다.</div>
                    <button className="btn outline" style={{ marginTop: 10 }} onClick={() => { setVerified(false); setVerifiedState(false); showToast("📍 동네 인증이 해제되었습니다"); }}>
                      위치 인증 해제 (데모)
                    </button>
                  </>
                ) : (
                  <>
                    <div className="banner verify">🔒 동네 인증이 되어있지 않아요. 인증하면 약국별 실제 판매가가 공개되고 주문할 수 있어요.</div>
                    <button className="btn amber" style={{ marginTop: 10 }} onClick={verifyArea}>📍 동네 인증하기 (GPS · 데모)</button>
                  </>
                )}
                <div className="notice" style={{ marginTop: 10 }}>실제 서비스에서는 GPS 기반 동(읍·면) 단위 인증 결과가 여기에 표시되고, 인증된 위치를 기준으로 "가까운 약국" 정렬이 이뤄집니다.</div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="tabbar">
        {[["🏥", "약국", 0], ["🔍", "검색", 1], ["🔥", "트렌드", 2], ["👤", "마이페이지", 4]].map(([ic, label, i]) => (
          <button key={i} className={tab === i ? "on" : ""} onClick={() => { setTab(i); setBellOpen(false); }}>
            <span className="ic">{ic}</span>{label}
          </button>
        ))}
      </div>
    </>
  );
}
