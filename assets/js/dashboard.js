/* =========================
   PAY54 Dashboard — v8.1 STABLE (v8101)
   File: assets/js/dashboard.js

   Fixes:
   ✅ Light mode default
   ✅ Correct click wiring for .tile-btn/.shortcut-btn/.utility-btn
   ✅ No dead buttons (attribute routing)
   ✅ Scan & Pay tile works
   ✅ Services restored + routed
   ✅ Recent Transactions always renders
   ✅ Seeds demo balance ONCE if ledger empty (prevents ₦0.00 regression)
========================= */

(() => {
  "use strict";
/* =========================
   🚨 GLOBAL ERROR GUARD (PRODUCTION SAFETY)
========================= */

window.addEventListener("error", function (e) {
  console.error("🚨 GLOBAL ERROR:", e.message);

  document.body.innerHTML = `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      height:100vh;
      font-family:sans-serif;
      text-align:center;
      padding:20px;
    ">
      <div>
        <h2>⚠️ PAY54 Temporary Issue</h2>
        <p>Something went wrong. Please refresh the app.</p>
        <button onclick="location.reload()" style="
          margin-top:10px;
          padding:10px 20px;
          border:none;
          border-radius:8px;
          background:#2563eb;
          color:white;
          font-weight:bold;
          cursor:pointer;
        ">
          Refresh
        </button>
      </div>
    </div>
  `;
});
 /* =========================
   PAY54 Viewport Fix Engine (FINAL)
========================= */

function setRealViewportHeight() {
  const height = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;

  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

/* Run immediately */
setRealViewportHeight();

/* Listen to ALL changes */
window.addEventListener('resize', setRealViewportHeight);
window.addEventListener('orientationchange', setRealViewportHeight);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setRealViewportHeight);
  window.visualViewport.addEventListener('scroll', setRealViewportHeight);
}

 let LEDGER;

function safeLedger(){

  if (LEDGER && typeof LEDGER.getBalances === "function") {
    return LEDGER;
  }

  if (window.PAY54_LEDGER && typeof window.PAY54_LEDGER.getBalances === "function") {
    LEDGER = window.PAY54_LEDGER;
    return LEDGER;
  }

  console.warn("⚠️ Ledger not ready — retrying...");

  return null;
}
function waitForLedgerReady(callback){

  let attempts = 0;

  function check(){

    const ledger = safeLedger();

    if(ledger){
      callback(ledger);
      return;
    }

    attempts++;

    if(attempts > 20){
      console.error("🚨 Ledger failed to load after retries");
      return;
    }

    setTimeout(check, 200);
  }

  check();
}
let RECIP;
let RCPT;

function waitForModules(callback){

  const check = () => {

    if (
      window.PAY54_LEDGER &&
      typeof window.PAY54_LEDGER.getBalances === "function" &&
      typeof window.PAY54_LEDGER.applyEntry === "function"
    ) {

      LEDGER = window.PAY54_LEDGER;
      RECIP  = window.PAY54_RECIPIENT || null;
      RCPT   = window.PAY54_RECEIPTS || null;

      console.log("✅ PAY54 modules FULLY ready");

      callback();
      return;
    }

    console.log("⏳ Waiting for PAY54 modules...");
    setTimeout(check, 150);
  };

  check();
}
const LS = {
  THEME: "pay54_theme",
  CURRENCY: "pay54_currency",
  NAME: "pay54_name",
  EMAIL: "pay54_email",
  ALERTS: "pay54_alerts",
  SEED: "pay54_seed_v81",
  PIN: "pay54_pin",

  GOALS: "pay54_goals"
};

  const $ = (sel, root = document) => root.querySelector(sel);

  function safeJSONParse(v, fallback) {
    if (v === null || v === "" || v === "null" || v === "undefined") return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function getAlerts() {
    const v = safeJSONParse(localStorage.getItem(LS.ALERTS), []);
    return Array.isArray(v) ? v : [];
  }
  function setAlerts(list) {
    localStorage.setItem(LS.ALERTS, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function nowLabel() {
    return new Date().toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  /* ---------------------------
     DOM hooks
  --------------------------- */

  const balanceEl = $("#balanceAmount");
  const pillBtns = document.querySelectorAll(".currency");
  const currencySelect = $("#currencySelect");
  const themeToggle = $("#themeToggle");

  const profileNameEl = $("#profileName");
  const profileEmailEl = $("#profileEmail");
  const profileBtn = $("#profileBtn");
  const profileMenu = $("#profileMenu");
  const logoutBtn = $("#logoutBtn");

  const addMoneyBtn = $("#addMoneyBtn");
  const withdrawBtn = $("#withdrawBtn");

  const clearAlertsBtn = $("#clearAlerts");
  const alertsContainer = $("#alerts");

  const viewAllTxBtn = $("#viewAllTx");
  const viewAllTxMobileBtn = $("#viewAllTxMobile");

  const newsFeedEl = $("#newsFeed");

  /* ---------------------------
     Modal system (injected)
  --------------------------- */

  function ensureModalStyles() {
    if ($("#pay54-modal-style")) return;
    const style = document.createElement("style");
    style.id = "pay54-modal-style";
    style.textContent = `
      .p54-modal-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:9999; padding:18px; }
      body.light .p54-modal-backdrop{ background:rgba(0,0,0,.35); }
      .p54-modal{ width:min(720px,100%); border-radius:18px; border:1px solid rgba(255,255,255,.14); background:rgba(10,14,24,.96); color:rgba(255,255,255,.92); box-shadow:0 18px 50px rgba(0,0,0,.45); overflow:hidden; }
      body.light .p54-modal{ background:rgba(255,255,255,.95); color:rgba(10,20,40,.92); border:1px solid rgba(10,20,40,.12); box-shadow:0 18px 50px rgba(20,40,80,.18); }
      .p54-modal-head{ display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.10); }
      body.light .p54-modal-head{ border-bottom:1px solid rgba(10,20,40,.10); }
      .p54-modal-title{ font-weight:900; font-size:15px; letter-spacing:.2px; }
      .p54-x{ border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.04); color:inherit; width:36px; height:36px; border-radius:999px; cursor:pointer; }
      body.light .p54-x{ border-color:rgba(10,20,40,.14); background:rgba(10,20,40,.04); }
      .p54-modal-body{ padding:16px; }
      .p54-form{ display:flex; flex-direction:column; gap:10px; }
      .p54-row{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      @media (max-width:520px){ .p54-row{ grid-template-columns:1fr; } }
      .p54-label{ font-size:12px; font-weight:800; opacity:.85; }
   .p54-input,.p54-select{
  height:44px;
  font-size:16px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.04);
  color:inherit;
  padding:0 12px;
  padding-right:40px;
  outline:none;

  -webkit-appearance:none;
  appearance:none;

  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23666' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat:no-repeat;
  background-position:right 12px center;
  background-size:12px;
}
      body.light .p54-input, body.light .p54-select{ border-color:rgba(10,20,40,.14); background:rgba(10,20,40,.04); }
      .p54-select option{ color:#0a1428; background:#ffffff; }
      .p54-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:10px; flex-wrap:wrap; }
      .p54-btn{
        height:40px; border-radius:999px; border:1px solid rgba(255,255,255,.16);
        background:rgba(255,255,255,.05); color:inherit; padding:0 14px; font-weight:900; cursor:pointer;
      }
      body.light .p54-btn{ border-color:rgba(10,20,40,.14); background:rgba(10,20,40,.04); color:#0a1428; }
      .p54-btn.primary{ border-color:rgba(59,130,246,.65); background:rgba(59,130,246,.92); color:#fff; }
      .p54-note{ font-size:12px; opacity:.82; line-height:1.35; }
      .p54-divider{ height:1px; background:rgba(255,255,255,.10); margin:12px 0; }
      body.light .p54-divider{ background:rgba(10,20,40,.10); }
      .p54-ledger{ display:flex; flex-direction:column; gap:10px; }
      .p54-ledger-item{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.03); border-radius:14px; padding:12px; }
      body.light .p54-ledger-item{ border-color:rgba(10,20,40,.12); background:rgba(10,20,40,.03); }
      .p54-ledger-left{ min-width:0; }
      .p54-ledger-title{ font-weight:900; }
      .p54-ledger-sub{ opacity:.75; font-size:12px; margin-top:3px; }
      .p54-ledger-amt{ font-weight:900; white-space:nowrap; }
      .p54-pos{ color:#22c55e; }
      .p54-neg{ color:#ef4444; }
      .p54-filters{ display:grid; grid-template-columns: 1.4fr 0.8fr 0.8fr; gap:10px; margin:10px 0 12px; }
      @media (max-width:720px){ .p54-filters{ grid-template-columns: 1fr; } }
      .p54-small{ font-size:12px; opacity:.75; }
      /* =========================
   QR CENTER (DESKTOP ONLY)
========================= */

.qr-center-wrap{
  display:flex;
  justify-content:center;
  align-items:center;
  margin:24px 0;
}

.qr-center-wrap #qrBox{
  display:flex;
  justify-content:center;
  align-items:center;

  padding:12px;
  border-radius:16px;

  background:#fff;
}

/* Desktop enhancement */
@media (min-width:768px){
  .qr-center-wrap{
    justify-content:center;
    align-items:center;
  }
}
    `;
    document.head.appendChild(style);
  }

  function openModal({ title, bodyHTML, onMount }) {
    ensureModalStyles();
    const backdrop = document.createElement("div");
    backdrop.className = "p54-modal-backdrop";
    backdrop.innerHTML = `
      <div class="p54-modal" role="dialog" aria-modal="true">
        <div class="p54-modal-head">
          <div class="p54-modal-title">${title || "PAY54"}</div>
          <button class="p54-x" type="button" aria-label="Close">✕</button>
        </div>
        <div class="p54-modal-body">${bodyHTML || ""}</div>
      </div>
    `;

function close() {
  backdrop.remove();

  // 🔥 FORCE SCROLL RESTORE (BULLETPROOF)
  document.body.style.overflow = "";
  document.body.style.overflowY = "auto";
  document.documentElement.style.overflow = "";
  document.documentElement.style.overflowY = "auto";

  document.removeEventListener("keydown", escClose);
}
    function escClose(e) { if (e.key === "Escape") close(); }

    backdrop.querySelector(".p54-x").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", escClose);

document.body.classList.add("modal-open");
   document.body.appendChild(backdrop);
    if (typeof onMount === "function") onMount({ modal: backdrop.querySelector(".p54-modal"), close });
    return { close };
  }

  /* ---------------------------
     Theme (light default)
  --------------------------- */

  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem(LS.THEME, theme);
    if (themeToggle) {
      const icon = themeToggle.querySelector(".icon");
      if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
    }
  }

  const storedTheme = localStorage.getItem(LS.THEME);
  applyTheme(storedTheme || "light");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.body.classList.contains("light");
      applyTheme(isLight ? "dark" : "light");
    });
  }

  /* ---------------------------
     Currency + converted total
  --------------------------- */
/* ---------------------------
   Currency + converted total
--------------------------- */
function getSelectedCurrency() {
  return localStorage.getItem(LS.CURRENCY) || "NGN";
}

function getConvertedTotal(targetCur){

  const ledger = safeLedger();
  if(!ledger) return 0;

  const balances = ledger.getBalances() || {};

  let total = 0;

  Object.keys(balances).forEach((c)=>{

    const amt = Number(balances[c] ?? 0);

    if(!amt) return;

    if(c === targetCur){
      total += amt;
    }else{
      total += Number(ledger.convert(c,targetCur,amt) || 0);
    }

  });

  return total;
}
/* Currency selectors */
pillBtns.forEach(btn =>
  btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur))
);

if (currencySelect) {
  currencySelect.addEventListener("change", (e) =>
    setActiveCurrency(e.target.value)
  );
}

/* Activate currency + render balance */
/* =========================
   PREMIUM BALANCE ANIMATION
========================= */

function animateBalance(targetValue, currency){

  if(!balanceEl){
    return;
  }

  const duration = 700;
  const start = 0;
  const startTime = performance.now();

  function frame(now){

    const progress = Math.min((now - startTime) / duration, 1);

    const value = start + (targetValue - start) * progress;

   const ledger = safeLedger();
if(!ledger) return;

balanceEl.textContent = ledger.moneyFmt(currency, value);

    if(progress < 1){
      requestAnimationFrame(frame);
    }

  }

  requestAnimationFrame(frame);

}
function setActiveCurrency(cur){

  localStorage.setItem(LS.CURRENCY, cur);

  pillBtns.forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.cur === cur);
  });

  if(currencySelect){
    currencySelect.value = cur;
  }

let total = 0;

const ledger = safeLedger();
if(!ledger){
  console.warn("Ledger not ready yet");
  return;
}

try{
  total = getConvertedTotal(cur);
}catch(e){
  console.warn("Conversion failed", e);
}

// 🔥 SMART AVAILABLE BALANCE
const balances = ledger.getBalances() || {};
const available = balances[cur] || 0;

const availableEl = document.getElementById("availableBalance");

if(availableEl){
  availableEl.innerHTML = `
    <span class="avail-label">Available in ${cur}:</span>
    <span class="avail-value">${ledger.moneyFmt(cur, available)}</span>
  `;
}
  if(balanceEl){

    balanceEl.textContent = "Converting...";

    setTimeout(()=>{
      animateBalance(total,cur);
    },180);

  }

} // ✅ CLOSE FUNCTION

  /* ---------------------------
     Profile / logout
  --------------------------- */

  const storedName = localStorage.getItem(LS.NAME) || "Pese";
  const storedEmail = localStorage.getItem(LS.EMAIL) || "";

  if (profileNameEl) profileNameEl.textContent = storedName;
  if (profileEmailEl) profileEmailEl.textContent = storedEmail;

  const avatarEl = document.querySelector(".avatar-btn .avatar");
  if (avatarEl) avatarEl.textContent = (storedName.trim().charAt(0) || "P").toUpperCase();

  function closeProfileMenu() {
    if (!profileMenu) return;
    profileMenu.classList.remove("open");
    profileMenu.setAttribute("aria-hidden", "true");
  }
  function openProfileMenu() {
    if (!profileMenu) return;
    profileMenu.classList.add("open");
    profileMenu.setAttribute("aria-hidden", "false");
  }

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = profileMenu.classList.contains("open");
      isOpen ? closeProfileMenu() : openProfileMenu();
    });
    profileMenu.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", closeProfileMenu);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(LS.CURRENCY);
      localStorage.removeItem(LS.THEME);
      window.location.href = "login.html";
    });
  }

  /* ---------------------------
     Demo seed ONCE (prevents ₦0.00)
  --------------------------- */

 function seedDemoIfEmpty(){

  const ledger = safeLedger();

  if(!ledger){
    console.error("🚨 Cannot seed — ledger not ready");
    return;
  }

  const balances = ledger.getBalances() || {};

  const total = Object.values(balances)
    .reduce((a,b)=>a + Number(b || 0), 0);

  if(total > 0){
    console.log("✅ Wallet already funded");
    return;
  }

  console.warn("🔥 FORCING INITIAL FUNDING");

  try{

    const entry = ledger.createEntry({
      type: "seed",
      title: "Initial wallet funding",
      currency: "NGN",
      amount: 70284035,
      icon: "💰"
    });

    ledger.applyEntry(entry);

    console.log("✅ SEED APPLIED SUCCESSFULLY");

  }catch(err){
    console.error("🚨 SEED FAILED:", err);
  }
}
  /* ---------------------------
     Alerts + News
  --------------------------- */

  function seedDemoAlertsIfEmpty() {
    const a = getAlerts();
    if (a.length) return;
    setAlerts([
      { id: "a1", icon: "🔔", title: "KYC check completed", sub: "Level 2 active", body: "Your account is verified for daily limits and FX wallets." },
      { id: "a2", icon: "🧾", title: "Statement ready", sub: "Download monthly report", body: "Your statement for this month is ready in Transaction History." },
      { id: "a3", icon: "🛡️", title: "Security tip", sub: "Keep your PIN private", body: "Never share your PAY54 PIN with anyone." },
      { id: "a4", icon: "💱", title: "FX wallets enabled", sub: "Multi-currency is on", body: "You can hold, convert and spend across currencies." },
      { id: "a5", icon: "🎁", title: "Refer & Earn", sub: "Invite friends for rewards", body: "Share your referral link to earn bonuses." }
    ]);
  }

  function renderAlerts() {
    if (!alertsContainer) return;

    const alerts = getAlerts();
    if (!alerts.length) {
      alertsContainer.innerHTML = `
        <div class="feed-item">
          <div class="feed-icon">✅</div>
          <div class="feed-main">
            <div class="feed-title">All clear</div>
            <div class="feed-sub">No requests or alerts</div>
          </div>
        </div>
      `;
      return;
    }

    alertsContainer.innerHTML = alerts.slice(0, 5).map(a => `
      <div class="feed-item">
        <div class="feed-icon">${a.icon || "🔔"}</div>
        <div class="feed-main">
          <div class="feed-title">${a.title}</div>
          <div class="feed-sub">${a.sub || ""}</div>
        </div>
        <button class="btn ghost sm" type="button" data-alert-open="${a.id}">Open</button>
      </div>
    `).join("");

    alertsContainer.querySelectorAll("[data-alert-open]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-alert-open");
        const item = getAlerts().find(x => x.id === id);
        if (!item) return;

        openModal({
          title: item.title,
          bodyHTML: `
            <div class="p54-note"><b>${item.title}</b></div>
            <div class="p54-small">${item.sub || ""}</div>
            <div class="p54-divider"></div>
            <div>${item.body || "Details will be expanded in Layer 3."}</div>
            <div class="p54-actions">
              <button class="p54-btn primary" type="button" id="closeA">Close</button>
            </div>
          `,
          onMount: ({ modal, close }) => modal.querySelector("#closeA").addEventListener("click", close)
        });
      });
    });
  }

  function renderNews() {
    if (!newsFeedEl) return;
    const lines = [
      { icon: "📰", title: "PAY54 launches FX wallets", sub: "Hold and convert across key currencies." },
      { icon: "📈", title: "Markets: USD strengthens", sub: "FX spreads may tighten this week." },
      { icon: "🛡️", title: "Fraud alert", sub: "Avoid sharing OTPs and PINs." },
      { icon: "💳", title: "Virtual card controls", sub: "Freeze, limits and merchant locks coming." },
      { icon: "🎁", title: "Refer & Earn rewards", sub: "Invite friends to unlock bonuses." }
    ];
    newsFeedEl.innerHTML = lines.map(n => `
      <div class="feed-item">
        <div class="feed-icon">${n.icon}</div>
        <div class="feed-main">
          <div class="feed-title">${n.title}</div>
          <div class="feed-sub">${n.sub}</div>
        </div>
      </div>
    `).join("");
  }

  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      setAlerts([]);
      renderAlerts();
    });
  }

  /* ---------------------------
     Recent transactions
  --------------------------- */

  function recentTxFeedEl() {
    const feeds = Array.from(document.querySelectorAll('[data-role="recentTxFeed"]'));
    const visible = feeds.find(el => el && el.offsetParent !== null);
    return visible || feeds[0] || null;
  }

function renderRecentTransactions() {

  const txFeed = recentTxFeedEl();
  if (!txFeed) return;

  const ledger = safeLedger();
  if (!ledger) return;

  const txs = (ledger.getTx() || [])
    .slice()
    .reverse()
    .slice(0, 5);

  if (!txs.length) {
    txFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-icon">📭</div>
        <div class="feed-main">
          <div class="feed-title">No transactions yet</div>
          <div class="feed-sub">Your activity will appear here</div>
        </div>
      </div>
    `;
    return;
  }

  txFeed.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "p54-small";
  summary.innerHTML = `Total Contributions: ${txs.length}`;
  txFeed.appendChild(summary);

  txs.forEach(tx => prependTxToDOM(tx));

} // ✅ THIS LINE IS CRITICAL
 

   /* =========================
   FX MARKET TICKER
========================= */

/* =========================
   TRANSACTION RENDER
========================= */
function prependTxToDOM(tx) {

  const ledger = safeLedger();
  if(!ledger) return;

  const txFeed = recentTxFeedEl();
  if (!txFeed) return;

  const amtClass = tx.amount >= 0 ? "pos" : "neg";
  const sign = tx.amount >= 0 ? "+" : "−";

  const base = tx.base_currency || getSelectedCurrency();

  const equivLine = (tx.currency !== base && tx.base_equiv != null)
    ? `<div class="feed-sub">≈ ${ledger.moneyFmt(base, tx.base_equiv)} • rate ${(tx.fx_rate_used || 0).toFixed(4)}</div>`
    : `<div class="feed-sub">${nowLabel()}</div>`;

  const item = document.createElement("div");
  item.className = "feed-item";

  item.innerHTML = `
    <div class="feed-icon">${tx.icon || "💳"}</div>
    <div class="feed-main">
      <div class="feed-title">${tx.title}</div>
      ${equivLine}
    </div>
    <div class="feed-amt ${amtClass}">
      ${sign} ${ledger.moneyFmt(tx.currency, Math.abs(tx.amount))}
    </div>
  `;

  txFeed.prepend(item);
}

/* =========================
   FX MARKET TICKER
========================= */
function renderFxTicker(){

  const el = document.getElementById("fxTicker");

  if(!el || !LEDGER){
    return;
  }

  const pairs = [
    ["USD","NGN"],
    ["GBP","NGN"],
    ["EUR","NGN"]
  ];

  el.innerHTML = pairs.map(p=>{

    const rate = LEDGER.getRate ? LEDGER.getRate(p[0],p[1]) : null;

    if(!rate) return "";

    const arrow = Math.random() > 0.5 ? "↑" : "↓";

    return `
      <span class="fx-item">
        ${p[0]}/${p[1]} 
        <b>${rate.toFixed(2)}</b>
        <span class="fx-dir">${arrow}</span>
      </span>
    `;

  }).join("");
}
   /* =========================
   v8.3 TRANSACTION PIPELINE
========================= */

function processTransaction(entry, meta = {}){

  const ledger = safeLedger();

  if(!ledger){
    alert("System unavailable. Please refresh.");
    return null;
  }

  // 🔒 BONUS PROTECTION (ADD THIS HERE)
  if(Math.abs(entry.amount) > 100000000){
    alert("Amount exceeds limit");
    return null;
  }

  try{

   // 🔥 ENHANCED TRANSACTION TAGGING
entry.meta = {
  ...(entry.meta || {}),
  source: meta.source || "wallet",
  route: "smart_engine",
  fx_used: meta.fx || false,
  fees: meta.fees || 0
};

const tx = ledger.applyEntry(entry);

    prependTxToDOM(tx);
    refreshUI();

    // 🔥 Always show receipt if needed
    if(meta.showReceipt){
      showPaymentReceipt(
        tx,
        meta.title || "Transaction",
        Math.abs(entry.amount),
        entry.currency
      );
    }

    return tx;

  }catch(err){
    console.error("🚨 TRANSACTION FAILED:", err);
    alert("Transaction failed. Try again.");
    return null;
  }
}
  /* ---------------------------
     Core Modals (minimal stable)
  --------------------------- */
function showToast(message){

  const container = document.getElementById("toastContainer");

  if(!container) return;

  const toast = document.createElement("div");

  toast.className = "p54-toast";

  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(()=>{
    toast.remove();
  },3000);

}
 function requestPinVerification(callback){

  const savedPin = localStorage.getItem(LS.PIN);

  /* 🔐 FORCE PIN SETUP FIRST */
if(!savedPin){
  openCreatePinModal(callback);
  return;
}

  openModal({
    title: "Enter PIN",

    bodyHTML: `
      <div class="p54-note">Confirm your PIN to proceed</div>

      <input 
        class="p54-input" 
        id="userPin" 
        type="password" 
        placeholder="••••"
        maxlength="6"
        style="margin-top:12px"
      >

      <div class="p54-actions">
        <button class="p54-btn" id="cancelPin">Cancel</button>
        <button class="p54-btn primary" id="confirmPin">Confirm</button>
      </div>
    `,

    onMount: ({ modal, close }) => {

      const input = modal.querySelector("#userPin");

      modal.querySelector("#cancelPin").addEventListener("click", close);

      modal.querySelector("#confirmPin").addEventListener("click", () => {

        const entered = input.value.trim();

        if(entered === savedPin){
          close();
          callback(); // ✅ proceed
        } else {
          alert("Incorrect PIN");
        }

      });

    }
  });

}
   function openCreatePinModal(callback){

  openModal({
    title: "Create Transaction PIN",

    bodyHTML: `
      <div class="p54-note">Set a 4-digit PIN for secure transactions</div>

      <input 
        class="p54-input" 
        id="newPin" 
        type="password" 
        placeholder="Enter PIN"
        maxlength="6"
        style="margin-top:12px"
      >

      <input 
        class="p54-input" 
        id="confirmPin" 
        type="password" 
        placeholder="Confirm PIN"
        maxlength="6"
        style="margin-top:10px"
      >

      <div class="p54-actions">
        <button class="p54-btn" id="cancelCreatePin">Cancel</button>
        <button class="p54-btn primary" id="savePin">Save PIN</button>
      </div>
    `,

    onMount: ({ modal, close }) => {

      const pin1 = modal.querySelector("#newPin");
      const pin2 = modal.querySelector("#confirmPin");

      modal.querySelector("#cancelCreatePin").addEventListener("click", close);

      modal.querySelector("#savePin").addEventListener("click", () => {

        const p1 = pin1.value.trim();
        const p2 = pin2.value.trim();

        if(p1.length < 4){
          alert("PIN must be at least 4 digits");
          return;
        }

        if(p1 !== p2){
          alert("PINs do not match");
          return;
        }

        localStorage.setItem(LS.PIN, p1);

        alert("PIN set successfully ✅");

        close();

        if(callback){
          callback(); // 🔥 continue original action
        }

      });

    }
  });

}
   /* =========================
   BALANCE GLOW EFFECT
========================= */

function triggerBalanceGlow(){

  const card = document.getElementById("balanceCard");

  if(!card) return;

  card.classList.add("balance-glow");

  setTimeout(()=>{
    card.classList.remove("balance-glow");
  },800);

}
function refreshUI() {

  requestAnimationFrame(() => {

    try {

      const ledger = safeLedger();
if(ledger){
  setActiveCurrency(getSelectedCurrency());
}

      renderRecentTransactions();
      triggerBalanceGlow();

    } catch (err) {
      console.error("UI refresh failed:", err);
    }

  });

}

function addEntryAndRefresh(entry) {

  return processTransaction(entry, {
    showReceipt: true,
    title: "Wallet Funding"
  });

}

  function comingSoon(title) {
    openModal({
      title,
      bodyHTML: `
        <div class="p54-note"><b>${title}</b> is coming in the next layer.</div>
        <div class="p54-actions"><button class="p54-btn primary" id="ok">OK</button></div>
      `,
      onMount: ({ modal, close }) => modal.querySelector("#ok").addEventListener("click", close)
    });
  }

function openScanAndPay() {

  openModal({
    title: "Scan & Pay",

    bodyHTML: `
      <div id="qr-reader" style="width:100%; margin-bottom:15px;"></div>

      <form class="p54-form" id="scanPayForm">

        <div>
          <div class="p54-label">Merchant</div>
          <input class="p54-input" id="spMerchant" placeholder="Scan QR to autofill" required />
        </div>

        <div>
          <div class="p54-label">Amount</div>
          <input class="p54-input" id="spAmount" type="number" step="0.01" min="0" placeholder="0.00" required />
        </div>

        <div>
          <div class="p54-label">Reference (optional)</div>
          <input class="p54-input" id="spRef" placeholder="Optional note" />
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelSP">Cancel</button>
          <button class="p54-btn primary" type="submit">Pay</button>
        </div>

      </form>
    `,

    onMount: ({ modal, close }) => {

      const merchantEl = modal.querySelector("#spMerchant");
      const amountEl = modal.querySelector("#spAmount");
      const form = modal.querySelector("#scanPayForm");
      const cancelBtn = modal.querySelector("#cancelSP");

      let html5QrCode;

      function stopCamera(){
        if(html5QrCode){
          html5QrCode.stop().catch(()=>{});
        }
      }

      /* QR Scan */

      function onScanSuccess(decodedText){

        try {

          const parts = decodedText.split("|");

          if(parts[0] === "PAY54"){
            merchantEl.value = parts[1] || "";
            if(parts[2]) amountEl.value = parts[2];
          }
          else{
            merchantEl.value = decodedText;
          }

        } catch {
          merchantEl.value = decodedText;
        }

        stopCamera();

      }

      if(window.Html5Qrcode){

        html5QrCode = new Html5Qrcode("qr-reader");

        Html5Qrcode.getCameras()
        .then(devices=>{

          if(!devices || !devices.length){
            console.warn("No camera detected");
            return;
          }

          html5QrCode.start(
            { facingMode:"environment" },
            { fps:10, qrbox:{ width:250,height:250 } },
            onScanSuccess
          );

        })
        .catch(err=>console.warn("Camera error:",err));

      }

      cancelBtn.addEventListener("click", ()=>{
        stopCamera();
        close();
      });

      /* PAYMENT SUBMIT */

      form.addEventListener("submit",(e)=>{

        e.preventDefault();

        const merchant = merchantEl.value.trim();
        const amount = Number(parseFloat(amountEl.value).toFixed(2));

        if(amount > 100000000){
          alert("Amount too large");
          return;
        }

        const currency = getSelectedCurrency();

        try{

          const ledger = safeLedger();
if(!ledger) return;

const balances = ledger.getBalances() || {};
          const currentBalance = balances[currency] || 0;

          if(!merchant || !amount || amount <= 0){
            alert("Enter valid merchant and amount");
            return;
          }

         const funding = resolveSmartPayment(amount, currency);

if(!funding){
  alert("Insufficient funds across wallet and cards");
  return;
}

          /* Create ledger entry */
          const entry = LEDGER.createEntry({
            type:"scan_pay",
            title:`Payment to ${merchant}`,
            currency,
            amount:-amount,
            icon:"📲",
            meta:{ merchant, channel:"QR" }
          });

          /* 🔐 PIN PROTECTION (FINAL FIX) */
          requestPinVerification(() => {

           const ledger = safeLedger();

if(!ledger){
  alert("System error. Please refresh.");
  return;
}

if(funding.source === "wallet"){

  processTransaction(entry, {
    showReceipt: true,
    title: "Scan Payment"
  });

}

else if(funding.source === "wallet_fx"){

  LEDGER.applyEntry(
    LEDGER.createEntry({
      type:"fx_debit",
      currency: funding.from,
      amount:-funding.amount,
      icon:"💱"
    })
  );

  LEDGER.applyEntry(
    LEDGER.createEntry({
      type:"fx_credit",
      currency: funding.to,
      amount: funding.amount,
      icon:"💱"
    })
  );

  processTransaction(entry, {
    showReceipt: true,
    title: "Scan Payment (FX)"
  });

}

else if(funding.source === "card"){

  funding.card.balance -= amount;

  const entry = LEDGER.createEntry({
    type:"card_payment",
    title:`Paid ${merchant} (Card)`,
    currency,
    amount:-amount,
    icon:"💳"
  });

  processTransaction(entry, {
    showReceipt: true,
    title: "Card Payment"
  });

}

            /* Stop camera AFTER success */
            stopCamera();
            close();

          });

        } catch(err){
          console.warn("ScanPay error:", err);
        }

          }); // CLOSE form submit

    } // CLOSE onMount

  }); // CLOSE openModal

} // CLOSE openScanAndPay
   /* =========================
   Add Money
========================= */
function openAddMoney() {

  openModal({
    title: "Add Money",

    bodyHTML: `
      <form class="p54-form" id="addMoneyForm">

        <div>
          <div class="p54-label">Amount</div>
          <input class="p54-input" id="amAmount" type="number" step="0.01" placeholder="0.00" required>
        </div>

        <div>
          <div class="p54-label">Funding Source</div>
          <select class="p54-select" id="amSource">
            <option value="card">Card</option>
            <option value="bank">Bank</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <div id="dynamicFields"></div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelAM">Cancel</button>
          <button class="p54-btn primary" type="submit">Add Money</button>
        </div>

      </form>
    `,

    onMount: ({ modal, close }) => {

      const sourceEl = modal.querySelector("#amSource");
      const dynamic = modal.querySelector("#dynamicFields");
      const form = modal.querySelector("#addMoneyForm");

      function renderFields(type){

        if(type === "card"){
          dynamic.innerHTML = `
            <div class="p54-label">Select Card</div>
            <select class="p54-select" id="amCard">
              <option>PAY54 Virtual Card</option>
              <option>Visa •••• 1234</option>
              <option>Mastercard •••• 5678</option>
            </select>
          `;
        }

        if(type === "bank"){
          dynamic.innerHTML = `
            <div class="p54-label">Select Bank</div>
            <select class="p54-select" id="amBank">
              <option>GTBank</option>
              <option>Access Bank</option>
              <option>Zenith Bank</option>
              <option>UBA</option>
              <option>First Bank</option>
              <option>Moniepoint</option>
            </select>
          `;
        }

        if(type === "agent"){
          dynamic.innerHTML = `
            <div class="p54-label">Is PAY54 Agent?</div>
            <select class="p54-select" id="amAgentType">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            <div id="agentFields"></div>
          `;

          const agentType = dynamic.querySelector("#amAgentType");
          const agentFields = dynamic.querySelector("#agentFields");

          function renderAgentFields(val){
            if(val === "yes"){
  agentFields.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
      <input class="p54-input small" placeholder="Agent Tag / Account" required>
    </div>
  `;
} else {
  agentFields.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
     <input class="p54-input small" placeholder="Agent Name" required>
<input class="p54-input small" placeholder="Account Number" required>
    </div>
  `;
}
          }

          renderAgentFields("yes");

          agentType.addEventListener("change", e => {
            renderAgentFields(e.target.value);
          });
        }

      }

      renderFields("card");

      sourceEl.addEventListener("change", e => {
        renderFields(e.target.value);
      });

      modal.querySelector("#cancelAM").addEventListener("click", close);

      form.addEventListener("submit", (e) => {

        e.preventDefault();

        const amount = Number(parseFloat(modal.querySelector("#amAmount").value).toFixed(2));
         if(amount > 100000000){
  alert("Amount too large");
  return;
}
        const currency = getSelectedCurrency();

        if(!amount || amount <= 0){
          alert("Enter valid amount");
          return;
        }

        const entry = LEDGER.createEntry({
          type:"add_money",
          title:"Wallet Top-up",
          currency,
          amount: amount,
          icon:"➕"
        });

      const ledger = safeLedger();

if(!ledger){
  alert("System error. Please refresh.");
  return;
}

processTransaction(entry, {
  showReceipt: true,
  title: "Wallet Funding"
});
close();

      });

    }

  });

}

/* =========================
   Withdraw
========================= */
function openWithdraw(){

  openModal({
    title:"Withdraw",

    bodyHTML: `
      <form class="p54-form" id="withdrawForm">

        <div>
          <div class="p54-label">Amount</div>
          <input class="p54-input" id="wdAmount" type="number" step="0.01" placeholder="0.00" required>
        </div>

        <div>
          <div class="p54-label">Withdraw To</div>
          <select class="p54-select" id="wdMethod">
            <option value="bank">Bank Account</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <div id="wdDynamic"></div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelWD">Cancel</button>
          <button class="p54-btn primary" type="submit">Withdraw</button>
        </div>

      </form>
    `,

    onMount: ({modal, close}) => {

      const methodEl = modal.querySelector("#wdMethod");
      const dynamic = modal.querySelector("#wdDynamic");

      function render(type){
        if(type === "bank"){
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Account Name" required>
            <input class="p54-input" placeholder="Account Number" required>
            <input class="p54-input" placeholder="Bank Name" required>
          `;
        } else {
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Agent Name" required>
            <input class="p54-input" placeholder="Agent ID" required>
          `;
        }
      }

      render("bank");
      methodEl.addEventListener("change", e => render(e.target.value));

      modal.querySelector("#cancelWD").addEventListener("click", close);

      modal.querySelector("#withdrawForm").addEventListener("submit",(e)=>{

        e.preventDefault();

        const amount = Number(parseFloat(modal.querySelector("#wdAmount").value).toFixed(2));
        const currency = getSelectedCurrency();

        requestPinVerification(() => {

          const entry = LEDGER.createEntry({
            type:"withdraw",
            title:"Withdrawal",
            currency,
            amount:-amount,
            icon:"💵"
          });

          processTransaction(entry,{
            showReceipt:true,
            title:"Withdrawal"
          });

          close();

        });

      });

    }

  });

}
   function resolveFundingCurrency(targetCurrency, amount){

  const ledger = safeLedger();
if(!ledger) return;

const balances = ledger.getBalances() || {};

  // 1. Direct balance check
  if((balances[targetCurrency] || 0) >= amount){
    return {
      type: "direct",
      currency: targetCurrency,
      amount: amount
    };
  }

  // 2. Try other currencies
  for(const cur in balances){

    const bal = balances[cur] || 0;

    if(!bal || cur === targetCurrency) continue;

    const converted = ledger.convert(cur, targetCurrency, bal);

    if(converted >= amount){
      return {
        type: "fx",
        from: cur,
        to: targetCurrency,
        amount: amount
      };
    }
  }

  return null; // insufficient funds
}
  /* =========================
   SMART PAYMENT ROUTER (CORE ENGINE)
========================= */

function resolveSmartPayment(amount, currency){

  const ledger = safeLedger();
  if(!ledger) return null;

  const balances = ledger.getBalances() || {};
  const cards = JSON.parse(localStorage.getItem("pay54_cards") || "{}");

  /* ---------------------------
     1. WALLET DIRECT
  --------------------------- */
  if((balances[currency] || 0) >= amount){
    return {
      source: "wallet",
      currency,
      amount
    };
  }

  /* ---------------------------
     2. WALLET FX FALLBACK
  --------------------------- */
  for(const cur in balances){

    const bal = balances[cur] || 0;
    if(!bal || cur === currency) continue;

    const converted = ledger.convert(cur, currency, bal);

    if(converted >= amount){
      return {
        source: "wallet_fx",
        from: cur,
        to: currency,
        amount
      };
    }
  }

  /* ---------------------------
     3. CARD FALLBACK
  --------------------------- */
  if(cards?.list){

    const defaultCard = cards.list.find(c => c.isDefault && c.status === "active");

    if(defaultCard && (defaultCard.balance || 0) >= amount){
      return {
        source: "card",
        card: defaultCard,
        amount
      };
    }
  }

  return null; // ❌ insufficient
} 
 function openSendUnified(){

  openModal({

    title:"Send Money",

    bodyHTML:`

      <form class="p54-form" id="sendForm">

        <div>
          <div class="p54-label">Recipient (PAY54 Tag)</div>
          <input class="p54-input" id="sendUser" placeholder="@username" required>
        </div>

        <div>
          <div class="p54-label">Amount</div>
          <input class="p54-input" id="sendAmount" type="number" step="0.01" placeholder="0.00" required>
        </div>

        <div>
          <div class="p54-label">Reference (optional)</div>
          <input class="p54-input" id="sendNote" placeholder="Optional note">
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelSend">Cancel</button>
          <button class="p54-btn primary" type="submit">Send</button>
        </div>

      </form>

    `,

    onMount: ({modal, close}) => {

      const form = modal.querySelector("#sendForm");

      modal.querySelector("#cancelSend").addEventListener("click", close);

      form.addEventListener("submit",(e)=>{

        e.preventDefault();

        const user = modal.querySelector("#sendUser").value.trim();
        const amount = Number(parseFloat(modal.querySelector("#sendAmount").value).toFixed(2));
        const note = modal.querySelector("#sendNote").value.trim();

        const currency = getSelectedCurrency();

        if(!user || user.length < 2){
          alert("Enter valid recipient");
          return;
        }

        if(!amount || amount <= 0){
          alert("Enter valid amount");
          return;
        }

        if(amount > 100000000){
          alert("Amount too large");
          return;
        }

        const funding = resolveFundingCurrency(currency, amount);

        if(!funding){
          alert(`Insufficient funds across all wallets`);
          return;
        }

        requestPinVerification(() => {

          let tx;

          if(funding.type === "direct"){

            const entry = LEDGER.createEntry({
              type:"send",
              title:`Sent to ${user}`,
              currency,
              amount:-amount,
              icon:"📤",
              meta:{ recipient:user, note }
            });

            tx = LEDGER.applyEntry(entry);

          } else {

            const rate = LEDGER.getRate(funding.from, funding.to);

            const converted = LEDGER.convert(funding.from, funding.to, amount);

            LEDGER.applyEntry(
              LEDGER.createEntry({
                type:"fx_debit",
                title:`FX Conversion (${funding.from} → ${funding.to})`,
                currency: funding.from,
                amount:-converted,
                icon:"💱"
              })
            );

            LEDGER.applyEntry(
              LEDGER.createEntry({
                type:"fx_credit",
                title:`FX Conversion`,
                currency: funding.to,
                amount: amount,
                icon:"💱"
              })
            );

            const entry = LEDGER.createEntry({
              type:"send",
              title:`Sent to ${user}`,
              currency,
              amount:-amount,
              icon:"📤",
              meta:{ recipient:user, note, fx_used:true, rate }
            });

            tx = LEDGER.applyEntry(entry);
          }

          prependTxToDOM(tx);
          refreshUI();
          showPaymentReceipt(tx, user, amount, currency);

          close();

        });

      });

    }

  });

}
 function openReceive(){

  const userTag = localStorage.getItem("pay54_name") || "pay54-user";
  const accountNo = "3001234567";

  openModal({
    title:"Receive Money",

    bodyHTML:`

      <div style="text-align:center">

        <div class="p54-note"><b>Your PAY54 Tag</b></div>
        <div style="font-size:18px;font-weight:900;margin-bottom:10px">
          @${userTag}
        </div>

        <div class="p54-note"><b>Account Number</b></div>
        <div style="font-size:18px;font-weight:900;margin-bottom:16px">
          ${accountNo}
        </div>

        <div class="qr-center-wrap">
  <div id="qrBox"></div>
</div>

        <div class="p54-actions" style="justify-content:center;margin-top:16px">
          <button class="p54-btn" id="copyTag">Copy Tag</button>
          <button class="p54-btn" id="shareLink">Share</button>
          <button class="p54-btn primary" id="closeReceive">Done</button>
        </div>

      </div>

    `,

    onMount: ({modal, close}) => {

      const qrBox = modal.querySelector("#qrBox");

      /* 🔥 QR PAYLOAD */
      const payload = `PAY54|${userTag}|`;

      new QRCode(qrBox,{
        text:payload,
        width:200,
        height:200
      });

      /* COPY TAG */
      modal.querySelector("#copyTag").addEventListener("click", ()=>{
        navigator.clipboard.writeText(`@${userTag}`);
        alert("Tag copied");
      });

      /* SHARE LINK */
      modal.querySelector("#shareLink").addEventListener("click", ()=>{
        const link = `${window.location.origin}/?pay=${encodeURIComponent(userTag)}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(link)}`);
      });

      modal.querySelector("#closeReceive").addEventListener("click", close);

    }

  });

}
  function openRequestMoney(){

openModal({

title:"Request Money",

bodyHTML:`

<form class="p54-form" id="reqForm">

<div>
<div class="p54-label">Request From</div>
<input class="p54-input" id="reqUser" placeholder="@username" required>
</div>

<div>
<div class="p54-label">Amount</div>
<input class="p54-input" id="reqAmount" type="number" placeholder="0.00" required>
</div>

<div>
<div class="p54-label">Note</div>
<input class="p54-input" id="reqNote" placeholder="Optional note">
</div>

<div class="p54-actions">
<button class="p54-btn" type="button" id="cancelReq">Cancel</button>
<button class="p54-btn primary" type="submit">Send Request</button>
</div>

</form>

`,

onMount:({modal,close})=>{

modal.querySelector("#cancelReq").addEventListener("click",close);

modal.querySelector("#reqForm").addEventListener("submit",(e)=>{

e.preventDefault();

const user = modal.querySelector("#reqUser").value;
const amount = modal.querySelector("#reqAmount").value;

alert(`Payment request sent to ${user}`);

close();

});

}

});

}
   function openMerchantQR(){

openModal({

title:"Merchant QR Generator",

bodyHTML:`

<form class="p54-form" id="qrForm">

<div>
<div class="p54-label">Merchant Name</div>
<input class="p54-input" id="qrMerchant" required>
</div>

<div>
<div class="p54-label">Amount (optional)</div>
<input class="p54-input" id="qrAmount" type="number" placeholder="0.00">
</div>

<div id="qrOutput" style="text-align:center;margin-top:16px"></div>

<div class="p54-actions">
<button class="p54-btn" type="button" id="cancelQR">Close</button>
<button class="p54-btn primary" type="submit">Generate QR</button>
</div>

</form>

`,

onMount:({modal,close})=>{

const form = modal.querySelector("#qrForm");
const output = modal.querySelector("#qrOutput");

form.addEventListener("submit",(e)=>{

e.preventDefault();

const merchant = modal.querySelector("#qrMerchant").value;
const amount = modal.querySelector("#qrAmount").value;

const payload = `PAY54|${merchant}|${amount}`;

output.innerHTML="";

new QRCode(output,{
text:payload,
width:220,
height:220
});

});

modal.querySelector("#cancelQR").addEventListener("click",close);

}

});

}
   /* =========================
   GLOBAL TRANSFER (FX ENGINE)
========================= */

function openGlobalTransfer(){

  openModal({

    title:"PAY54 Global Transfer",

    bodyHTML:`

      <form class="p54-form" id="gtForm">

        <div class="p54-row">

          <div>
            <div class="p54-label">From</div>
            <select class="p54-select" id="gtFrom">
              <option>NGN</option>
              <option>GBP</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GHS</option>
              <option>KES</option>
            </select>
            <input class="p54-input" id="gtFromAmt" placeholder="0.00">
          </div>

          <div>
            <div class="p54-label">To</div>
            <select class="p54-select" id="gtTo">
              <option>GBP</option>
              <option>USD</option>
              <option>EUR</option>
              <option>NGN</option>
              <option>GHS</option>
              <option>KES</option>
            </select>
            <input class="p54-input" id="gtToAmt" placeholder="0.00">
          </div>

        </div>

        <div>
          <div class="p54-label">Recipient Type</div>
          <select class="p54-select" id="gtType">
            <option value="pay54">PAY54 User</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>

        <div id="gtRecipient"></div>

        <div>
          <div class="p54-label">Reference (optional)</div>
          <input class="p54-input" id="gtRef" placeholder="e.g. Rent, Gift">
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelGT">Cancel</button>
          <button class="p54-btn primary" type="submit">Send</button>
        </div>

      </form>

    `,

    onMount:({modal,close})=>{

      const fromCur = modal.querySelector("#gtFrom");
      const toCur   = modal.querySelector("#gtTo");
      const fromAmt = modal.querySelector("#gtFromAmt");
      const toAmt   = modal.querySelector("#gtToAmt");

      const type = modal.querySelector("#gtType");
      const recBox = modal.querySelector("#gtRecipient");

      function renderRecipient(val){
        if(val === "pay54"){
          recBox.innerHTML = `<input class="p54-input" placeholder="@PAY54 Tag" required>`;
        }
        if(val === "bank"){
  recBox.innerHTML = `
    <input class="p54-input" placeholder="Account Name" required>
    <input class="p54-input" id="gtAcc" placeholder="Account Number" required>
    <input class="p54-input" placeholder="Bank Name" required>
  `;
}
      }

      renderRecipient("pay54");

      type.addEventListener("change",(e)=>{
        renderRecipient(e.target.value);
      });
       /* 🔥 FORCE ACCOUNT NUMBER = NUMBERS ONLY */
recBox.addEventListener("input", (e)=>{
  if(e.target.id === "gtAcc"){
    e.target.value = e.target.value.replace(/\D/g,"");
  }
});

      function convertForward(){
        if(!LEDGER) return;
        const amount = parseFloat(fromAmt.value);
        if(!amount) return;
        toAmt.value = LEDGER.convert(fromCur.value,toCur.value,amount).toFixed(2);
      }

      function convertReverse(){
        if(!LEDGER) return;
        const amount = parseFloat(toAmt.value);
        if(!amount) return;
        fromAmt.value = LEDGER.convert(toCur.value,fromCur.value,amount).toFixed(2);
      }

      fromAmt.addEventListener("input", convertForward);
      toAmt.addEventListener("input", convertReverse);

      fromCur.addEventListener("change", convertForward);
      toCur.addEventListener("change", convertForward);

      modal.querySelector("#cancelGT").addEventListener("click", close);

      modal.querySelector("#gtForm").addEventListener("submit",(e)=>{

        e.preventDefault();

        const amount = Number(parseFloat(fromAmt.value).toFixed(2));
        const fromCurrency = fromCur.value;
        const toCurrency = toCur.value;

        if(!amount || amount <= 0){
          alert("Enter valid amount");
          return;
        }

        requestPinVerification(()=>{

          const converted = LEDGER.convert(fromCurrency,toCurrency,amount);

          LEDGER.applyEntry(LEDGER.createEntry({
            type:"fx_debit",
            title:`FX ${fromCurrency} → ${toCurrency}`,
            currency:fromCurrency,
            amount:-amount,
            icon:"💱"
          }));

          LEDGER.applyEntry(LEDGER.createEntry({
            type:"fx_credit",
            title:"FX Credit",
            currency:toCurrency,
            amount:converted,
            icon:"💱"
          }));

          const tx = LEDGER.applyEntry(LEDGER.createEntry({
            type:"global_transfer",
            title:"Global Transfer",
            currency:toCurrency,
            amount:-converted,
            icon:"🌍"
          }));

          prependTxToDOM(tx);
          refreshUI();

          showPaymentReceipt(tx,"Global Transfer",amount,fromCurrency);

          close();

        });

      });

    }

  });

}
function openBankTransfer(){

  openModal({
    title:"Bank Transfer",

    bodyHTML:`

      <form class="p54-form" id="btForm">

        <div>
          <div class="p54-label">Select Bank</div>
          <select class="p54-select" id="btBank">
            <option>GTBank</option>
            <option>Access Bank</option>
            <option>Zenith Bank</option>
            <option>UBA</option>
            <option>First Bank</option>
          </select>
        </div>

        <div>
          <div class="p54-label">Account Number</div>
          <input class="p54-input" id="btAcc" placeholder="10-digit account" required>
        </div>

        <div>
          <div class="p54-label">Account Name</div>
          <input class="p54-input" id="btName" placeholder="Auto-resolve" readonly>
        </div>

        <div>
          <div class="p54-label">Amount</div>
          <input class="p54-input" id="btAmount" type="number" placeholder="0.00" required>
        </div>

        <div>
          <div class="p54-label">Reference</div>
          <input class="p54-input" id="btRef" placeholder="Optional note">
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelBT">Cancel</button>
          <button class="p54-btn primary" type="submit">Send</button>
        </div>

      </form>
    `,

    onMount: ({modal, close}) => {

      const accInput = modal.querySelector("#btAcc");
      const nameInput = modal.querySelector("#btName");

      /* MOCK NAME RESOLVE */
      accInput.addEventListener("input", () => {

  const val = accInput.value.replace(/\D/g, ""); // numbers only
  accInput.value = val;

  if(val.length === 10){

    nameInput.value = "Resolving...";

    setTimeout(() => {
      nameInput.value = "John Doe"; // 🔁 replace with API later
    }, 600);

  } else {
    nameInput.value = "";
  }

});

      modal.querySelector("#cancelBT").addEventListener("click", close);

      modal.querySelector("#btForm").addEventListener("submit", (e)=>{

        e.preventDefault();

        const amount = Number(modal.querySelector("#btAmount").value);
        const currency = getSelectedCurrency();

        if(!amount || amount <= 0){
          alert("Enter valid amount");
          return;
        }

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"bank_transfer",
            title:"Bank Transfer",
            currency,
            amount:-amount,
            icon:"🏦",
            meta:{
              bank: modal.querySelector("#btBank").value,
              account: modal.querySelector("#btAcc").value,
              name: modal.querySelector("#btName").value
            }
          });

          processTransaction(entry,{
            showReceipt:true,
            title:"Bank Transfer"
          });

          close();

        });

      });

    }
  });
}

function openCrossBorderFXUnified() { 
  openGlobalTransfer(); 
}  
  /* ---------------------------
     Ledger modal (View All)
  --------------------------- */

  function openLedger() {

  const ledgerSafe = safeLedger();
  if(!ledgerSafe) return;

  const all = ledgerSafe.getTx() || [];

  openModal({
    title: "Transaction History",
    bodyHTML: `
      <div class="p54-note">Your latest activity.</div>
      <div class="p54-divider"></div>
     <input class="p54-input" id="txSearch" placeholder="Search transactions">
<div class="p54-ledger" id="ledgerList"></div>
      <div class="p54-actions">
        <button class="p54-btn primary" type="button" id="closeLedger">Close</button>
      </div>
    `,
    onMount: ({ modal, close }) => {

      const ledgerEl = modal.querySelector("#ledgerList");

function renderList(list){
  ledgerEl.innerHTML = list.map(tx => {
    const cls = tx.amount >= 0 ? "p54-pos" : "p54-neg";
    const sign = tx.amount >= 0 ? "+" : "−";

    return `
      <div class="p54-ledger-item">
        <div class="p54-ledger-left">
          <div class="p54-ledger-title">${tx.title}</div>
        </div>
        <div class="p54-ledger-amt ${cls}">
          ${sign} ${ledgerSafe.moneyFmt(tx.currency, Math.abs(tx.amount))}
        </div>
      </div>
    `;
  }).join("");
}

renderList(all);

const search = modal.querySelector("#txSearch");

search.addEventListener("input", ()=>{
  const term = search.value.toLowerCase();

  const filtered = all.filter(tx =>
    tx.title.toLowerCase().includes(term)
  );

  renderList(filtered);
});
       modal.querySelector("#closeLedger").addEventListener("click", close);

} // ✅ CLOSE onMount

}); // ✅ CLOSE openModal

} // ✅ CLOSE openLedger
/* =========================
   PAY54 SERVICES (ADD HERE ONLY)
========================= */

/* 💡 PAY BILLS */
function openBills(){

  openModal({
    title:"Pay Bills & Top Up",

    bodyHTML:`

      <form class="p54-form" id="billForm">

        <div>
          <div class="p54-label">Service Type</div>
          <select class="p54-select" id="billType">
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
            <option value="electricity">Electricity</option>
            <option value="tv">TV Subscription</option>
          </select>
        </div>

        <div id="billDynamic"></div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelBill">Cancel</button>
          <button class="p54-btn primary">Pay</button>
        </div>

      </form>
    `,

    onMount:({modal,close})=>{

      const typeEl = modal.querySelector("#billType");
      const dynamic = modal.querySelector("#billDynamic");

      function render(type){

        /* =========================
           AIRTIME (FIXED BUTTONS)
        ========================= */
        if(type === "airtime"){
          dynamic.innerHTML = `
            <input class="p54-input" id="billPhone" placeholder="Phone Number" required>

            <select class="p54-select" id="billProvider">
              <option>MTN</option>
              <option>Airtel</option>
              <option>Glo</option>
              <option>9mobile</option>
            </select>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button type="button" class="p54-btn amt" data-amt="500">₦500</button>
              <button type="button" class="p54-btn amt" data-amt="1000">₦1000</button>
              <button type="button" class="p54-btn amt" data-amt="1500">₦1500</button>
              <button type="button" class="p54-btn amt" data-amt="2000">₦2000</button>
              <button type="button" class="p54-btn amt" data-amt="5000">₦5000</button>
            </div>

            <input class="p54-input" id="billAmount" placeholder="Custom amount">
          `;

          /* ✅ FIX CLICK */
          dynamic.querySelectorAll(".amt").forEach(btn=>{
            btn.addEventListener("click",()=>{
              dynamic.querySelector("#billAmount").value = btn.dataset.amt;
            });
          });
        }

        /* =========================
           DATA (PROPER UX)
        ========================= */
        if(type === "data"){
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Phone Number" required>

            <select class="p54-select" id="dataProvider">
              <option value="MTN">MTN</option>
              <option value="Airtel">Airtel</option>
              <option value="Glo">Glo</option>
              <option value="9mobile">9mobile</option>
            </select>

            <select class="p54-select" id="dataBundle">
              <option value="1000">1GB - ₦1000</option>
              <option value="1500">2GB - ₦1500</option>
              <option value="5000">5GB - ₦5000</option>
            </select>

            <input class="p54-input" id="billAmount" placeholder="Custom amount (optional)">
          `;
        }

        /* =========================
           ELECTRICITY (OK)
        ========================= */
        if(type === "electricity"){
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Meter Number" required>

            <select class="p54-select">
              <option>Ikeja Electric</option>
              <option>Eko Electric</option>
              <option>Abuja Disco</option>
            </select>

            <input class="p54-input" id="billAmount" placeholder="Amount">
          `;
        }

        /* =========================
           TV (FIXED)
        ========================= */
if(type === "tv"){
  dynamic.innerHTML = `
    <input class="p54-input" placeholder="Smart Card Number" required>

    <select class="p54-select">
      <option>DSTV</option>
      <option>GOtv</option>
      <option>Startimes</option>
    </select>

    <select class="p54-select" id="tvPackage">
      <option value="">Select Package</option>
      <option value="5000">Basic - ₦5000</option>
      <option value="10000">Compact - ₦10000</option>
      <option value="20000">Premium - ₦20000</option>
    </select>

    <input class="p54-input" id="billAmount" placeholder="Custom amount">
  `;

  const pkg = dynamic.querySelector("#tvPackage");
  const amountInput = dynamic.querySelector("#billAmount");

  if(pkg && amountInput){
    pkg.addEventListener("change", () => {
      amountInput.value = pkg.value;
    });
  }
}

} // 🔥🔥🔥 THIS IS THE MISSING LINE (CRITICAL)

render("airtime");

      typeEl.addEventListener("change",(e)=>{
        render(e.target.value);
      });

      modal.querySelector("#cancelBill").onclick = close;

      modal.querySelector("#billForm").onsubmit = (e)=>{
        e.preventDefault();

        let amount = Number(modal.querySelector("#billAmount")?.value);

        /* fallback for bundles */
        if(!amount){
          const bundle = modal.querySelector("#dataBundle")?.value;
          if(bundle) amount = Number(bundle);
        }

        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"bill",
            title:"Bill Payment",
            currency,
            amount:-amount,
            icon:"💡"
          });

          processTransaction(entry,{showReceipt:true});
          close();
        });
      };

    }
  });
}
/* 🏦 SAVINGS */
function openSavings(){

  const goals = JSON.parse(localStorage.getItem(LS.GOALS) || "[]");

  openModal({
    title:"Savings & Goals",

    bodyHTML:`

      <form class="p54-form" id="saveForm">

        <input class="p54-input" id="goalName" placeholder="Goal name (e.g School Fees)" required>

        <input class="p54-input" id="goalTarget" placeholder="Target Amount">

        <input class="p54-input" id="saveAmount" placeholder="Amount to Save">

        <div id="goalList" style="margin-top:10px"></div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelSave">Cancel</button>
          <button class="p54-btn primary">Save</button>
        </div>

      </form>
    `,

    onMount:({modal,close})=>{

      const list = modal.querySelector("#goalList");

      function renderGoals(){

  list.innerHTML = goals.map(g=>`
  <div class="p54-ledger-item" data-goal="${g.name}">
      <div>
        <div class="p54-ledger-title">${g.name}</div>
        <div class="p54-small">Saved: ₦${g.saved} / ₦${g.target}</div>
      </div>
    </div>
  `).join("");

  // 🔥 ADD THIS IMMEDIATELY AFTER list.innerHTML
list.querySelectorAll("[data-goal]").forEach(el => {
  el.addEventListener("click", () => {
    openGoalDetails(el.dataset.goal);
  });
});
}
      renderGoals();

      modal.querySelector("#cancelSave").onclick = close;

      modal.querySelector("#saveForm").onsubmit = (e)=>{
        e.preventDefault();

        const name = modal.querySelector("#goalName").value;
        const target = Number(modal.querySelector("#goalTarget").value || 0);
        const amount = Number(modal.querySelector("#saveAmount").value);

        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          /* SAVE GOAL */
          let goal = goals.find(g=>g.name === name);

          if(!goal){
           goal = { 
  name, 
  target, 
  saved:0,
  standing: null
};
            goals.push(goal);
          }

          goal.saved += amount;

          localStorage.setItem(LS.GOALS, JSON.stringify(goals));

          /* LEDGER ENTRY */
          const entry = LEDGER.createEntry({
            type:"savings",
            title:`Saved to ${name}`,
            currency,
            amount:-amount,
            icon:"🏦"
          });

          processTransaction(entry,{showReceipt:true});

          renderGoals();

        });

      };

    }
  });
}
   function openGoalDetails(goalName){

  const goals = JSON.parse(localStorage.getItem(LS.GOALS) || "[]");
  const goal = goals.find(g => g.name === goalName);

  if(!goal){
    alert("Goal not found");
    return;
  }

  const txs = LEDGER.getTx().filter(tx =>
    tx.type === "savings" && tx.title.includes(goal.name)
  );

  openModal({
    title: goal.name,

    bodyHTML: `
      <div class="p54-note"><b>${goal.name}</b></div>

      <div class="p54-small">
        Saved: ₦${goal.saved} / ₦${goal.target}
      </div>

      <input class="p54-input" id="goalSearch" placeholder="Search transactions">

      <div id="goalTx"></div>

      <canvas id="goalChart" height="120"></canvas>

      <div class="p54-actions">
        <button class="p54-btn" id="saveMore">Save More</button>
        <button class="p54-btn" id="setupSO">Standing Order</button>
        <button class="p54-btn primary" id="closeGoal">Close</button>
      </div>
    `,

    onMount: ({ modal, close }) => {

      const txBox = modal.querySelector("#goalTx");

      function render(list){
        txBox.innerHTML = list.map(tx=>`
          <div class="p54-ledger-item">
            <div>${tx.title}</div>
            <div>${tx.amount}</div>
          </div>
        `).join("");
      }

     const LIMIT = 10;

function render(list){
  const display = list.slice(-LIMIT);

  txBox.innerHTML = display.map(tx=>`
    <div class="p54-ledger-item">
      <div>${tx.title}</div>
      <div>${tx.amount}</div>
    </div>
  `).join("");
}

      // 🔍 SEARCH
      modal.querySelector("#goalSearch").addEventListener("input", (e)=>{
        const term = e.target.value.toLowerCase();
        const filtered = txs.filter(tx => {

  return (
    tx.title.toLowerCase().includes(term) ||
    String(tx.amount).includes(term) ||
    (tx.currency || "").toLowerCase().includes(term)
  );

});

render(filtered);
      });

      // 💰 SAVE MORE
      modal.querySelector("#saveMore").addEventListener("click", ()=>{
        const amount = Number(prompt("Enter amount to save"));
        if(!amount) return;

        goal.saved += amount;
        localStorage.setItem(LS.GOALS, JSON.stringify(goals));

        const entry = LEDGER.createEntry({
          type:"savings",
          title:`Saved to ${goal.name}`,
          currency:getSelectedCurrency(),
          amount:-amount,
          icon:"🏦"
        });

        processTransaction(entry,{showReceipt:true});
        close();
      });

      // 🔁 STANDING ORDER
      modal.querySelector("#setupSO").addEventListener("click", ()=>{
     const amount = Number(prompt("Enter saving amount"));
const freq = prompt("Frequency: daily / weekly / monthly");

if(!amount || !freq) return;

goal.standing = {
  amount,
  frequency: freq.toLowerCase()
};

        localStorage.setItem(LS.GOALS, JSON.stringify(goals));

        alert("Standing order set ✅");
      });

      // 📊 PIE CHART
      const canvas = modal.querySelector("#goalChart");
      const ctx = canvas.getContext("2d");

      const saved = goal.saved;
      const remaining = goal.target - goal.saved;
      const total = saved + remaining;

      const angle = (saved / total) * Math.PI * 2;

      ctx.beginPath();
      ctx.moveTo(100,60);
      ctx.arc(100,60,50,0,angle);
      ctx.fillStyle="#22c55e";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(100,60);
      ctx.arc(100,60,50,angle,Math.PI*2);
      ctx.fillStyle="#e5e7eb";
      ctx.fill();

      modal.querySelector("#closeGoal").addEventListener("click", close);
    }
  });
}
   function detectCardBrand(number){
  if(number.startsWith("4")) return "Visa";
  if(number.startsWith("5")) return "Mastercard";
  return "Card";
}
/* OTHER SERVICES (SAFE PLACEHOLDERS) */
function openCards(){

  let cards = JSON.parse(localStorage.getItem("pay54_cards") || "null");

  // 🔥 INITIAL STRUCTURE (MULTI-CARD)
  if(!cards){
    cards = {
      list: [
        {
          id: "card_1",
          type: "virtual",
          brand: "PAY54",
          number: "**** **** **** 1234",
          expiry: "12/28",
          status: "active",
          isDefault: true
        }
      ]
    };
    localStorage.setItem("pay54_cards", JSON.stringify(cards));
  }

  function save(){
    localStorage.setItem("pay54_cards", JSON.stringify(cards));
  }

function render(){

  return `
  <div>

    <div style="margin-bottom:12px;font-weight:900">Your Cards</div>

    ${cards.list.map(c => `
      <div style="
        padding:16px;
        border-radius:16px;
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        color:#fff;
        margin-bottom:12px;
      ">

        <div style="display:flex;justify-content:space-between;align-items:center">

  <div style="font-size:12px;opacity:.8">${c.brand}</div>

  <div style="font-size:18px;opacity:.9">
    📶
  </div>

</div>

        <div style="font-size:18px;font-weight:900;letter-spacing:2px;margin:10px 0">
          ${c.masked || c.number || "**** **** **** 0000"}
        </div>

        <div style="display:flex;justify-content:space-between;font-size:12px">
          <div>${c.name || "PAY54 USER"}</div>
          <div>${c.expiry}</div>
        </div>
        <div style="margin-top:6px;font-size:13px;opacity:.9">
  Balance: ${LEDGER.moneyFmt(getSelectedCurrency(), c.balance || 0)}
</div>

        <div style="margin-top:10px">
          ${c.status === "frozen"
            ? `<span style="color:#facc15">❄ Frozen</span>`
            : `<span style="color:#22c55e">● Active</span>`}
        </div>

        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">

  <button class="p54-btn primary" data-pay="${c.id}">
    Tap & Pay
  </button>

  ${
    c.isDefault
      ? "✅ Default"
      : `<button class="p54-btn sm" data-set="${c.id}">Set Default</button>`
  }

  <button class="p54-btn sm" data-freeze="${c.id}">
    ${c.status === "frozen" ? "Unfreeze" : "Freeze"}
  </button>

</div>

      </div>
    `).join("")}

    <!-- 🔥 ACTION BUTTONS (CRITICAL FIX) -->
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="p54-btn" id="addCardBtn">Add Card</button>
      <button class="p54-btn" id="fundCardBtn">Fund Card</button>
      <button class="p54-btn primary" id="closeCards">Close</button>
    </div>

  </div>
`;
}

  openModal({
    title:"Virtual & Linked Cards",
    bodyHTML: render(),

    onMount: ({modal, close}) => {

  /* =========================
     SET DEFAULT CARD
  ========================= */
  modal.querySelectorAll("[data-set]").forEach(btn=>{
    btn.addEventListener("click", ()=>{

      const id = btn.dataset.set;

      cards.list.forEach(c => c.isDefault = false);
      const selected = cards.list.find(c => c.id === id);
      if(selected) selected.isDefault = true;

      save();
      close();
      setTimeout(openCards,100);

    });
  });

  /* =========================
     FREEZE / UNFREEZE CARD 🔥
  ========================= */
  modal.querySelectorAll("[data-freeze]").forEach(btn=>{
    btn.addEventListener("click",()=>{

      const id = btn.dataset.freeze;

      const card = cards.list.find(c => c.id === id);
      if(!card) return;

      card.status = card.status === "frozen" ? "active" : "frozen";

      save();
      close();
      setTimeout(openCards,100);

    });
  });
/* =========================
   TAP TO PAY (CONTACTLESS)
========================= */
modal.querySelectorAll("[data-pay]").forEach(btn=>{

  btn.addEventListener("click", ()=>{

    const id = btn.dataset.pay;
    const card = cards.list.find(c => c.id === id);

    if(!card) return;

    if(card.status === "frozen"){
      alert("Card is frozen ❄");
      return;
    }

    openModal({
      title:"Tap to Pay",

      bodyHTML:`
        <form class="p54-form" id="tapForm">

          <div class="p54-note">📶 Hold near terminal</div>

          <div>
            <div class="p54-label">Merchant</div>
            <input class="p54-input" id="tapMerchant" placeholder="Store name" required>
          </div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="tapAmount" placeholder="0.00" required>
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelTap">Cancel</button>
            <button class="p54-btn primary">Pay</button>
          </div>

        </form>
      `,

      onMount:({modal, close})=>{

        modal.querySelector("#cancelTap").onclick = close;

        modal.querySelector("#tapForm").onsubmit = (e)=>{

          e.preventDefault();

          const merchant = modal.querySelector("#tapMerchant").value;
          const amount = Number(modal.querySelector("#tapAmount").value);
          const currency = getSelectedCurrency();

          if(!amount || amount <= 0){
            alert("Enter valid amount");
            return;
          }

         const funding = resolveSmartPayment(amount, currency);

if(!funding){
  alert("Insufficient funds");
  return;
}

          requestPinVerification(()=>{

  if(funding.source === "wallet"){

    const entry = LEDGER.createEntry({
      type:"tap_pay",
      title:`Paid ${merchant} (Wallet)`,
      currency,
      amount:-amount,
      icon:"📶"
    });

    processTransaction(entry,{showReceipt:true});

  }

  else if(funding.source === "wallet_fx"){

    LEDGER.applyEntry(
      LEDGER.createEntry({
        type:"fx_debit",
        currency: funding.from,
        amount:-funding.amount,
        icon:"💱"
      })
    );

    LEDGER.applyEntry(
      LEDGER.createEntry({
        type:"fx_credit",
        currency: funding.to,
        amount: funding.amount,
        icon:"💱"
      })
    );

    const entry = LEDGER.createEntry({
      type:"tap_pay",
      title:`Paid ${merchant} (FX Wallet)`,
      currency,
      amount:-amount,
      icon:"📶"
    });

    processTransaction(entry,{showReceipt:true});

  }

  else if(funding.source === "card"){

    funding.card.balance -= amount;

    const entry = LEDGER.createEntry({
      type:"card_payment",
      title:`Paid ${merchant} (Card)`,
      currency,
      amount:-amount,
      icon:"💳"
    });

    processTransaction(entry,{showReceipt:true});

  }

  close();
});

        };

      }
    });

  });

});
   

      /* =========================
         FUND CARD (PROPER FLOW)
      ========================= */
      /* =========================
   SAFE ADD CARD BUTTON
========================= */
const addBtn = modal.querySelector("#addCardBtn");

if(addBtn){
  addBtn.addEventListener("click", ()=>{

    openModal({
      title:"Add Card",

      bodyHTML:`
        <form id="addCardForm" class="p54-form">

          <input class="p54-input" id="cardName" placeholder="Cardholder Name" required>
          <input class="p54-input" id="cardNumber" placeholder="Card Number" required>

          <div class="p54-row">
            <input class="p54-input" id="cardExpiry" placeholder="MM/YY" required>
            <input class="p54-input" id="cardCVV" placeholder="CVV" maxlength="3" required>
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelAdd">Cancel</button>
            <button class="p54-btn primary">Add Card</button>
          </div>

        </form>
      `,

      onMount:({modal, close})=>{

        modal.querySelector("#cancelAdd").onclick = close;

        modal.querySelector("#addCardForm").onsubmit = (e)=>{
          e.preventDefault();

          const name = modal.querySelector("#cardName").value;
          const number = modal.querySelector("#cardNumber").value;
          const expiry = modal.querySelector("#cardExpiry").value;

         cards.list.push({
  id: "card_" + Date.now(),
  type: "linked",
  brand: detectCardBrand(number),
  number: number.replace(/\s/g,""),
  masked: "**** **** **** " + number.slice(-4),
  expiry,
  name,
  status: "active",
  isDefault: false,

  // 🔥 NEW (IMPORTANT)
  balance: 0
});

          save();
          close();
          setTimeout(openCards,100);
        };

      }
    });

  });
}
   /* =========================
   SAFE FUND CARD BUTTON
========================= */
const fundBtn = modal.querySelector("#fundCardBtn");

if(fundBtn){
  fundBtn.addEventListener("click", ()=>{

    openModal({
      title:"Fund Card",

      bodyHTML:`
        <form class="p54-form" id="fundForm">

          <div>
            <div class="p54-label">Select Card</div>
            <select class="p54-select" id="fundCardSelect">
              ${cards.list.map(c => `
                <option value="${c.id}">
                  ${c.brand} •••• ${c.masked?.slice(-4)}
                </option>
              `).join("")}
            </select>
          </div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="fundAmount" placeholder="0.00" required>
          </div>

          <div>
            <div class="p54-label">Source</div>
            <select class="p54-select" id="fundSource">
              <option value="wallet">Wallet Balance</option>
              <option value="card">Linked Card</option>
            </select>
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelFund">Cancel</button>
            <button class="p54-btn primary">Fund Card</button>
          </div>

        </form>
      `,

      onMount:({modal, close})=>{

        const cancelBtn = modal.querySelector("#cancelFund");
        if(cancelBtn) cancelBtn.onclick = close;

        const form = modal.querySelector("#fundForm");

        if(form){
          form.onsubmit = (e)=>{

            e.preventDefault();

            const amount = Number(modal.querySelector("#fundAmount").value);
            const currency = getSelectedCurrency();
            const cardId = modal.querySelector("#fundCardSelect").value;

            if(!amount || amount <= 0){
              alert("Enter valid amount");
              return;
            }

            const selectedCard = cards.list.find(c => c.id === cardId);

            if(!selectedCard){
              alert("Card not found");
              return;
            }

       requestPinVerification(()=>{

  // 🔥 ADD MONEY TO CARD
  selectedCard.balance = (selectedCard.balance || 0) + amount;

  save(); // persist cards

  const entry = LEDGER.createEntry({
    type:"card_funding",
    title:`Funded ${selectedCard.brand} •••• ${selectedCard.masked?.slice(-4)}`,
    currency,
    amount:-amount,
    icon:"💳"
  });

  processTransaction(entry,{
    showReceipt:true,
    title:"Card Funding"
  });

  close();

});

          };
        }

      }
    });

  });
}    
      const closeBtn = modal.querySelector("#closeCards");
if(closeBtn){
  closeBtn.onclick = close;
}

    }
  });

}
  
function openCheckout(){ comingSoon("PAY54 Smart Checkout"); }
function openShop(){ comingSoon("Shop & Go"); }
function openTrading(){ comingSoon("Trading"); }
function openBet(){ comingSoon("Bet Funding"); }
function openAgent(){ comingSoon("Become an Agent"); }
function openRisk(){ comingSoon("AI Risk Watch"); }
/* =========================
   SERVICES REGISTRY (CRITICAL FIX)
========================= */

const SERVICES = {

  send: openSendUnified,
  receive: openReceive,
  scan_pay: openScanAndPay,
  add_money: openAddMoney,
  withdraw: openWithdraw,
  bank_transfer: openBankTransfer,

  fx: openGlobalTransfer,
  bills: openBills,
  savings: openSavings,
  cards: openCards,
  checkout: openCheckout,
  shop: openShop,
  merchantqr: openMerchantQR,
  trading: openTrading,
  bet: openBet,
  agent: openAgent,
  request: openRequestMoney,
  risk: openRisk
};
  /* ---------------------------
     STABLE CLICK WIRING (FIXES Step 4)
  --------------------------- */

function bindStableClickRouting(){

 document.addEventListener("click",(e)=>{

  try{

    const el = e.target.closest(".tile-btn, .shortcut-btn, .utility-btn");
    if(!el) return;

    if(typeof SERVICES === "undefined"){
      console.warn("⚠️ SERVICES not ready yet");
      return;
    }

   const action = el.dataset.action;
const service = el.dataset.service;
const shortcut = el.dataset.shortcut;

if(action && SERVICES[action]){
  SERVICES[action]();
  return;
}

if(service && SERVICES[service]){
  SERVICES[service]();
  return;
}

if(shortcut && SERVICES[shortcut]){
  SERVICES[shortcut]();
  return;
}

    if(el.id === "atmFinderBtn") return comingSoon("ATM Finder");
    if(el.id === "posFinderBtn") return comingSoon("POS / Agent Finder");

  }catch(err){
    console.error("🚨 CLICK ERROR:", err);
  }

 });

}
/* =========================
   PAYMENT RECEIPT
========================= */
function showPaymentReceipt(tx, merchant, amount, currency) {

  const receiptId = tx.id || ("P54-" + Date.now());

  openModal({
    title: "Payment Successful",
    bodyHTML: `
      <div style="text-align:center">

        <div class="pay-success-check">✔</div>

        <div style="font-weight:900;font-size:18px;margin-top:8px">
          Payment Completed
        </div>

        <div class="p54-divider"></div>

        <div class="p54-note"><b>Merchant</b></div>
        <div>${merchant}</div>

        <div class="p54-note" style="margin-top:10px"><b>Amount</b></div>
        <div style="font-size:18px;font-weight:900">
  ${safeLedger()?.moneyFmt(currency, amount) || amount}
</div>

        <div class="p54-note" style="margin-top:10px"><b>Receipt ID</b></div>
        <div>${receiptId}</div>

        <div class="p54-note" style="margin-top:10px">
          ${new Date().toLocaleString()}
        </div>

        <div class="p54-actions" style="margin-top:16px">
  <button class="p54-btn" id="copyBtn">Copy</button>
  <button class="p54-btn" id="shareBtn">WhatsApp</button>
  <button class="p54-btn" id="againBtn">Make Another Payment</button>
  <button class="p54-btn primary" id="doneBtn">Close</button>
</div>

      </div>
    `,

    onMount: ({ modal, close }) => {

  const ledger = safeLedger();
  if(!ledger) return;

  const text = `PAY54 Receipt
Merchant: ${merchant}
Amount: ${safeLedger()?.moneyFmt(currency, amount) || amount}
Ref: ${receiptId}`;

      modal.querySelector("#copyBtn").addEventListener("click", ()=>{
        navigator.clipboard.writeText(text);
        alert("Copied!");
      });

      modal.querySelector("#shareBtn").addEventListener("click", ()=>{
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
      });
modal.querySelector("#againBtn").addEventListener("click", () => {
  close();

  setTimeout(() => {

    // Smart routing based on transaction type
    if(tx.type === "add_money"){
      openAddMoney();
    }
    else if(tx.type === "withdraw"){
      openWithdraw();
    }
    else if(tx.type === "scan_pay"){
      openScanAndPay();
    }
    else if(tx.type === "global_transfer"){
      openGlobalTransfer();
    }
    else if(tx.type === "bill"){
  openBills();
}
else if(tx.type === "savings"){
  openSavings();
}
else if(tx.type === "bank_transfer"){
  openBankTransfer();
}
else{
  openSendUnified();
}

  }, 100);

});
      modal.querySelector("#doneBtn").addEventListener("click", () => {
        close();
        setTimeout(() => refreshUI(), 60);
      });

    }

  });

}
    
  /* ---------------------------
     INIT
  --------------------------- */
function init() {

  if (window.__PAY54_DASH_V81_INIT__) return;
  window.__PAY54_DASH_V81_INIT__ = true;

  try{

    console.log("✅ INIT RUNNING");

    const ledger = safeLedger();

    if(!ledger){
      console.error("🚨 INIT STOPPED — LEDGER NOT READY");
      return;
    }
  /* =========================
   SEED + INITIAL STATE
========================= */
// 🔥 CRITICAL: Seed BEFORE UI renders
seedDemoIfEmpty();
seedDemoAlertsIfEmpty();

// 🔥 FORCE UI SYNC AFTER SEED
setTimeout(()=>{
  refreshUI();
},50);

/* =========================
   INITIAL UI RENDER
========================= */
setActiveCurrency(getSelectedCurrency());
    renderRecentTransactions();
    renderAlerts();
    renderNews();
    renderFxTicker();

    /* =========================
       🔥 ADD THIS HERE (CORRECT POSITION)
    ========================= */
    if (viewAllTxBtn) {
      viewAllTxBtn.addEventListener("click", openLedger);
    }

    if (viewAllTxMobileBtn) {
      viewAllTxMobileBtn.addEventListener("click", openLedger);
    }

  }catch(err){
    console.error("🚨 INIT CRASH:", err);
  }

  /* =========================
     GLOBAL CLICK SYSTEM
  ========================= */
  bindStableClickRouting();

  /* =========================
     FINAL UI REFRESH
  ========================= */
  refreshUI();
}

    // Header buttons
if (addMoneyBtn) addMoneyBtn.addEventListener("click", openAddMoney);
if (withdrawBtn) withdrawBtn.addEventListener("click", openWithdraw);
/* Premium balance lift on scroll */

const balanceCard = document.getElementById("balanceCard");

if(balanceCard){

  window.addEventListener("scroll", () => {

    if(window.scrollY > 40){

      balanceCard.classList.add("lifted");

    }else{

      balanceCard.classList.remove("lifted");

    }

  });

}
/* Floating Scan Pay Button */
const scanFab = document.getElementById("scanPayFab");

if(scanFab){
  scanFab.addEventListener("click", () => {
    openScanAndPay();
  });
}
 
/* =========================
   WATCHDOG DISABLED (DEBUG MODE)
========================= */

// const watchdog = setInterval(()=>{

//   try{

//     if(!LEDGER) return;

//     const ledger = safeLedger();
//     if(!ledger) return;

//     const balances = ledger.getBalances() || {};
//     const sum = Object.values(balances).reduce((a,b)=>a+Number(b||0),0);

//     if(sum === 0 || isNaN(sum)){
//       console.warn("Wallet UI detected zero state — recovering...");
//       refreshUI();
//     }else{
//       clearInterval(watchdog);
//     }

//   }catch(e){
//     console.warn("Watchdog recovery triggered");
//     refreshUI();
//   }

// },5000);
     /* =========================
   🔥 FORCE CLICK SYSTEM (CRITICAL FIX)
========================= */
waitForModules(() => {

  if(typeof SERVICES === "undefined"){
    console.error("🚨 SERVICES not ready");
    return;
  }

  waitForLedgerReady(() => {
    console.log("🚀 SAFE INIT START");
    init();
  });

});

/* 🔥 CRITICAL: CLOSE THE FILE PROPERLY */
})();
