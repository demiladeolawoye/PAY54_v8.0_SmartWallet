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

"use strict";
/* ==========================================================
   ENTERPRISE SECURITY
========================================================== */

const SESSION =
window.PAY54_SECURITY?.session;

const SECURITY_BOOTSTRAP =
window.PAY54_SECURITY?.bootstrap;

const TRANSACTION_GUARD =
window.PAY54_SECURITY?.transactionGuard;
/* ==========================================================
   ENTERPRISE RECIPIENT REGISTRY
========================================================== */

const RECIPIENT_STORAGE_KEY =
    "pay54_recipients";

const RECIPIENT_EVENTS = Object.freeze({

    CREATED:
        "recipient.created",

    UPDATED:
        "recipient.updated",

    DELETED:
        "recipient.deleted",

    TRUSTED:
        "recipient.trusted",

    FAVOURITE:
        "recipient.favourite",

    SELECTED:
        "recipient.selected",
   
   SYNC_STARTED:
    "recipient.sync.started",

SYNC_COMPLETED:
    "recipient.sync.completed",

SYNC_FAILED:
    "recipient.sync.failed"

});

function recipientUuid(){

    if(

        window.crypto &&

        crypto.randomUUID

    ){

        return crypto.randomUUID();

    }

    return (

        Date.now().toString(36)

        +

        Math.random()
        .toString(36)
        .substring(2)

    );

}
/* ==========================================================
   RECIPIENT SECURITY AUDIT
========================================================== */

function publishRecipientAudit(
    action,
    payload = {}
){

    try{

        const eventBus =
            window.PAY54_EVENTS || null;

        if(
            !eventBus ||
            typeof eventBus.publish !== "function"
        ){
            return;
        }

        eventBus.publish(
            "recipient.security.audit",
            {
                action,
                occurredAt:
                    new Date().toISOString(),
                ...payload
            },
            {
                source:
                    "recipient"
            }
        );

    }catch(error){

        console.error(
            "[PAY54_RECIPIENTS] Security audit event failed.",
            error
        );

    }

}
/* ==========================================================
   RECIPIENT EVENT PUBLISHER
========================================================== */

function publishRecipientEvent(
    eventName,
    payload = {}
){

    try{

        const eventBus =
            window.PAY54_EVENTS || null;

        if(
            !eventBus ||
            typeof eventBus.publish !== "function"
        ){
            return;
        }

        eventBus.publish(
            eventName,
            payload,
            {
                source:
                    "recipient"
            }
        );

    }catch(error){

        console.error(
            "[PAY54_RECIPIENTS] Event publication failed.",
            error
        );

    }

}
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
  const alertsContainer =
  $("#alertsFeed");

  const viewAllTxBtn = $("#viewAllTx");
  const viewAllTxMobileBtn = $("#viewAllTxMobile");

  const newsFeedEl = $("#newsFeed");

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

if(!ledger){
  console.warn("Ledger not ready in receipt");
  return;
}

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
  console.warn("⏳ Ledger not ready — retrying balance render...");
  setTimeout(() => setActiveCurrency(cur), 200);
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

let availableEl = document.getElementById("availableBalance");

/* 🔥 AUTO-CREATE IF MISSING */
if(!availableEl){

  availableEl = document.createElement("div");
  availableEl.id = "availableBalance";

  availableEl.style.marginTop = "6px";
  availableEl.style.fontSize = "13px";
  availableEl.style.opacity = "0.85";

  const parent = document.getElementById("balanceAmount")?.parentNode;

  if(parent){
    parent.appendChild(availableEl);
  }
}

/* 🔥 ALWAYS UPDATE VALUE */
availableEl.innerHTML = `
  <span class="avail-label">Available in ${cur}:</span>
  <span class="avail-value">${ledger.moneyFmt(cur, available)}</span>
`;
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

  function renderAlerts(){

  if(!alertsContainer) return;

  const alerts = getAlerts();

  const requests = (window.PAY54_REQUESTS?.getAll() || [])
    .filter(r => r.status === "pending");

  const combined = [
    ...requests.map(r => ({
      id: r.id,
      icon: "🛍",
      title: `${r.merchant}`,
      sub: `${r.currency} ${r.amount}`,
      type: "request",
      raw: r
    })),
    ...alerts.map(a => ({ ...a, type: "alert" }))
  ];

  if(!combined.length){
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

  alertsContainer.innerHTML = combined.slice(0,5).map(item => `
    <div class="feed-item">
      <div class="feed-icon">${item.icon}</div>
      <div class="feed-main">
        <div class="feed-title">${item.title}</div>
        <div class="feed-sub">${item.sub}</div>
      </div>
      <button class="btn ghost sm" data-open="${item.id}">
        ${item.type === "request" ? "Pay" : "Open"}
      </button>
    </div>
  `).join("");

  alertsContainer.querySelectorAll("[data-open]").forEach(btn=>{
    btn.addEventListener("click", ()=>{

      const id = btn.dataset.open;

      const req = requests.find(r => r.id === id);

      if(req){
        openCheckoutFromRequest(req);
      }

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

    <div class="feed-icon">
      ${n.icon}
    </div>

    <div class="feed-main">

      <div class="feed-title">
        ${n.title}
      </div>

      <div class="feed-sub">
        ${n.sub}
      </div>

    </div>

    <button
      class="btn ghost sm"
      onclick="openNewsItem(this)"
    >
      Open
    </button>

  </div>

`).join("");
  }

  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      setAlerts([]);
      renderAlerts();
    });
  }
function renderRecipientDashboard(){

    const container =
        document.getElementById(
            "recipientDashboardWidget"
        );

    if(!container){
        return;
    }

    const recipientApi =
        window.PAY54_RECIPIENT;

    if(!recipientApi){
        return;
    }

    const favourites =
        recipientApi
        .getFavouriteRecipients()
        .slice(0,5);

    const top =
        recipientApi
        .getTopRecipient();

    container.innerHTML = `

<div class="dashboard-card">

<h3>Recipients</h3>

<p>Total:
${recipientApi.getRecipients().length}</p>

<p>Favourites:
${favourites.length}</p>

${
top
?
`<p>Top Recipient:
<b>${top.displayName}</b></p>`
:
""
}

<div class="recipient-shortcuts">

${

favourites.map(r=>`

<button
class="p54-btn sm"
data-recipient="${r.id}">

${r.displayName}

</button>

`).join("")

}

</div>

<div class="p54-actions">

<button
class="p54-btn"
id="openRecipientManager">

Recipient Manager

</button>

</div>

</div>

`;

    container

    .querySelectorAll("[data-recipient]")

    .forEach(button=>{

        button.addEventListener(

            "click",

            ()=>{

                window.PAY54_RECIPIENT
                .quickSendRecipient(

                    button.dataset.recipient

                );

            }

        );

    });

    container

    .querySelector(
        "#openRecipientManager"
    )

    .addEventListener(

        "click",

        ()=>{

            window.PAY54_UI
            .openRecipientManager();

        }

    );

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
// 🚫 PREVENT DUPLICATE TRANSACTIONS
const existing = (LEDGER.getTx() || []).find(
  tx => tx.meta?.ref && tx.meta.ref === entry.meta?.ref
);

if(existing){
  alert("Payment already processed");
  return null;
}
  // 🔒 GLOBAL VALIDATION
  if(!entry.amount || isNaN(entry.amount)){
    alert("Invalid transaction");
    return null;
  }

  if(Math.abs(entry.amount) > 100000000){
    alert("Amount exceeds limit");
    return null;
  }

  try{

    // 🔥 TRANSACTION META
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

    // ✅ ALWAYS USE tx (NOT entry)
    if(meta.showReceipt){
      showPaymentReceipt(
        tx,
        meta.title || "Transaction",
        Math.abs(tx.amount),
        tx.currency
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
 /* ==========================================================
   PAY54 PIN VERIFICATION
   Supports lifecycle cancellation callbacks so financial
   orchestration locks can be safely released.
========================================================== */

function requestPinVerification(
    callback,
    options = {}
){

    const savedPin =
        localStorage.getItem(
            LS.PIN
        );

    const onCancel =
        typeof options.onCancel ===
            "function"
            ? options.onCancel
            : null;

    if(!savedPin){

        openCreatePinModal(
            callback,
            options
        );

        return;

    }

    openModal({

        title:
            "Enter PIN",

        bodyHTML: `
            <div class="p54-note">
                Confirm your PIN to proceed
            </div>

            <input
                class="p54-input"
                id="userPin"
                type="password"
                placeholder="••••"
                maxlength="6"
                autocomplete="current-password"
                style="margin-top:12px"
            >

            <div class="p54-actions">

                <button
                    class="p54-btn"
                    type="button"
                    id="cancelPin"
                >
                    Cancel
                </button>

                <button
                    class="p54-btn primary"
                    type="button"
                    id="confirmPin"
                >
                    Confirm
                </button>

            </div>
        `,

        onMount: ({
            modal,
            close
        }) => {

            const input =
                modal.querySelector(
                    "#userPin"
                );

            const cancelButton =
                modal.querySelector(
                    "#cancelPin"
                );

            const confirmButton =
                modal.querySelector(
                    "#confirmPin"
                );

            const backdrop =
                modal.closest(
                    ".p54-modal-backdrop"
                );

            let verificationCompleted =
                false;

            let cancellationReported =
                false;

            let closeObserver =
                null;


            const reportCancellation =
                () => {

                    if(
                        verificationCompleted ||
                        cancellationReported
                    ){
                        return;
                    }

                    cancellationReported =
                        true;

                    if(onCancel){

                        try{

                            onCancel();

                        }catch(error){

                            console.error(
                                "[PAY54_SECURITY] PIN cancellation handler failed.",
                                error
                            );

                        }

                    }

                };


            /*
             * The PAY54 modal engine can close via:
             *
             * • Cancel
             * • X
             * • backdrop click
             * • Escape
             * • programmatic close
             *
             * Observe removal of the modal backdrop so all
             * cancellation paths release orchestration locks.
             */

            if(
                backdrop &&
                typeof MutationObserver ===
                    "function"
            ){

                closeObserver =
                    new MutationObserver(
                        () => {

                            if(
                                !backdrop.isConnected
                            ){

                                closeObserver
                                    ?.disconnect();

                                reportCancellation();

                            }

                        }
                    );

                closeObserver.observe(
                    document.body,
                    {
                        childList:
                            true
                    }
                );

            }


            cancelButton
                .addEventListener(
                    "click",
                    () => {

                        close();

                    }
                );


            confirmButton
                .addEventListener(
                    "click",
                    () => {

                        const entered =
                            input.value.trim();

                        if(
                            entered !==
                            savedPin
                        ){

                            window.PAY54_TOAST
                                ?.showToast(
                                    "Incorrect PIN"
                                );

                            input.focus();

                            return;

                        }


                        /*
                         * Successful verification must be recorded
                         * before closing so modal removal is not
                         * interpreted as cancellation.
                         */

                        verificationCompleted =
                            true;

                        cancellationReported =
                            true;

                        closeObserver
                            ?.disconnect();


                        close();


                        if(
                            typeof callback ===
                                "function"
                        ){

                            callback();

                        }

                    }
                );


            input.focus();

        }

    });

}


/* ==========================================================
   PAY54 CREATE TRANSACTION PIN
========================================================== */

function openCreatePinModal(
    callback,
    options = {}
){

    const onCancel =
        typeof options.onCancel ===
            "function"
            ? options.onCancel
            : null;


    openModal({

        title:
            "Create Transaction PIN",

        bodyHTML: `
            <div class="p54-note">
                Set a 4 to 6 digit PIN for secure transactions
            </div>

            <input
                class="p54-input"
                id="newPin"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                placeholder="Enter PIN"
                maxlength="6"
                style="margin-top:12px"
            >

            <input
                class="p54-input"
                id="confirmPin"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                placeholder="Confirm PIN"
                maxlength="6"
                style="margin-top:10px"
            >

            <div class="p54-actions">

                <button
                    class="p54-btn"
                    type="button"
                    id="cancelCreatePin"
                >
                    Cancel
                </button>

                <button
                    class="p54-btn primary"
                    type="button"
                    id="savePin"
                >
                    Save PIN
                </button>

            </div>
        `,

        onMount: ({
            modal,
            close
        }) => {

            const pin1 =
                modal.querySelector(
                    "#newPin"
                );

            const pin2 =
                modal.querySelector(
                    "#confirmPin"
                );

            const cancelButton =
                modal.querySelector(
                    "#cancelCreatePin"
                );

            const saveButton =
                modal.querySelector(
                    "#savePin"
                );

            const backdrop =
                modal.closest(
                    ".p54-modal-backdrop"
                );

            let verificationCompleted =
                false;

            let cancellationReported =
                false;

            let closeObserver =
                null;


            const reportCancellation =
                () => {

                    if(
                        verificationCompleted ||
                        cancellationReported
                    ){
                        return;
                    }

                    cancellationReported =
                        true;

                    if(onCancel){

                        try{

                            onCancel();

                        }catch(error){

                            console.error(
                                "[PAY54_SECURITY] PIN creation cancellation handler failed.",
                                error
                            );

                        }

                    }

                };


            if(
                backdrop &&
                typeof MutationObserver ===
                    "function"
            ){

                closeObserver =
                    new MutationObserver(
                        () => {

                            if(
                                !backdrop.isConnected
                            ){

                                closeObserver
                                    ?.disconnect();

                                reportCancellation();

                            }

                        }
                    );

                closeObserver.observe(
                    document.body,
                    {
                        childList:
                            true
                    }
                );

            }


            cancelButton
                .addEventListener(
                    "click",
                    () => {

                        close();

                    }
                );


            saveButton
                .addEventListener(
                    "click",
                    () => {

                        const p1 =
                            pin1.value.trim();

                        const p2 =
                            pin2.value.trim();


                        if(
                            !/^\d{4,6}$/.test(
                                p1
                            )
                        ){

                            window.PAY54_TOAST
                                ?.showToast(
                                    "PIN must contain 4 to 6 digits"
                                );

                            pin1.focus();

                            return;

                        }


                        if(
                            p1 !==
                            p2
                        ){

                            window.PAY54_TOAST
                                ?.showToast(
                                    "PINs do not match"
                                );

                            pin2.focus();

                            return;

                        }


                        localStorage.setItem(
                            LS.PIN,
                            p1
                        );


                        verificationCompleted =
                            true;

                        cancellationReported =
                            true;

                        closeObserver
                            ?.disconnect();


                        window.PAY54_TOAST
                            ?.showToast(
                                "PIN set successfully"
                            );


                        close();


                        if(
                            typeof callback ===
                                "function"
                        ){

                            callback();

                        }

                    }
                );


            pin1.focus();

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

      if(
  window.Html5Qrcode &&
  modal.querySelector("#qr-reader")
){

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
/* ==========================================================
   ENTERPRISE RECIPIENT REPOSITORY
========================================================== */

function getRecipients(){

    try{

        return JSON.parse(

            localStorage.getItem(

                RECIPIENT_STORAGE_KEY

            )

        ) || [];

    }

    catch{

        return [];

    }

}

function saveRecipients(

    recipients

){

    localStorage.setItem(

        RECIPIENT_STORAGE_KEY,

        JSON.stringify(

            recipients

        )

    );

}
/* ==========================================================
   RECIPIENT IMPORT / EXPORT ENGINE
========================================================== */

function exportRecipients(){

    return {

        exportedAt:

            new Date().toISOString(),

        version:

            "2H",

        recipients:

            getRecipients()

    };

}

function exportRecipientsAsJson(){

    return JSON.stringify(

        exportRecipients(),

        null,

        2

    );

}
function importRecipients(

    data,

    options = {}

){

    if(

        !data ||

        !Array.isArray(

            data.recipients

        )

    ){

        return false;

    }

    const replace =

        options.replace === true;

    if(

        replace

    ){

        saveRecipients(

            data.recipients

        );
synchroniseRecipients();
        return true;

    }

    const existing =

        getRecipients();

    data.recipients.forEach(

        recipient=>{

            if(

                !isDuplicateRecipient(

                    recipient

                )

            ){

                existing.push(

                    recipient

                );

            }

        }

    );

    saveRecipients(

        existing

    );
synchroniseRecipients();
    return true;

}

function addRecipient(

    recipient

){const validation =

    validateRecipient(

        recipient

    );

if(

    !validation.valid

){

    console.warn(

        "Recipient validation failed",

        validation.errors

    );

    return null;

}
  /* ==========================================================
   DUPLICATE CHECK
========================================================== */

const duplicate =

    isDuplicateRecipient(

        recipient

    );

if(

    duplicate

){

    publishRecipientAudit(

        "recipient.duplicate",

        {

            recipientId:

                duplicate.id,

            tag:

                duplicate.tag ||

                null,

            accountNumber:

                duplicate.accountNumber ||

                null

        }

    );

    return duplicate;

}

    const recipients =

        getRecipients();

    const exists =

        recipients.find(

            r =>

                r.tag === recipient.tag

        );

    if(exists){

        return exists;

    }

    const newRecipient = {

        id:

            recipientUuid(),

        created:

            new Date().toISOString(),

        favourite:

            false,

        trusted:

            false,

        lastUsed:

            null,

        transferCount:

            0,

        ...recipient

    };

    recipients.push(

        newRecipient

    );

    saveRecipients(

        recipients

    );

    publishRecipientEvent(

        RECIPIENT_EVENTS.CREATED,

        {

            recipient:

                newRecipient

        }

    );
  synchroniseRecipients();

renderRecipientDashboard();

return newRecipient;

}

function updateRecipientUsage(

    tag

){

    const recipients =

        getRecipients();

    const recipient =

        recipients.find(

            r =>

                r.tag === tag

        );

    if(!recipient){

        return;

    }

    recipient.lastUsed =

        new Date().toISOString();

    recipient.transferCount++;

    saveRecipients(

        recipients

    );

}
/* ==========================================================
   ENTERPRISE RECIPIENT MANAGER
========================================================== */

function findRecipient(identifier){

    return getRecipients().find(

        recipient =>

            recipient.id === identifier ||

            recipient.tag === identifier

    ) || null;

}

function updateRecipient(

    identifier,

    updates = {}

){

    const recipients =

        getRecipients();

    const recipient =

        recipients.find(

            r =>

                r.id === identifier ||

                r.tag === identifier

        );

    if(!recipient){

        return null;

    }

    Object.assign(

        recipient,

        updates,

        {

            updated:

                new Date().toISOString()

        }

    );

    saveRecipients(

        recipients

    );

    publishRecipientEvent(

        RECIPIENT_EVENTS.UPDATED,

        {

            recipient

        }

    );
synchroniseRecipients();
   renderRecipientDashboard();
    return recipient;

}

function deleteRecipient(

    identifier

){

    const recipients =

        getRecipients();

    const filtered =

        recipients.filter(

            recipient =>

                recipient.id !== identifier &&

                recipient.tag !== identifier

        );

    if(

        filtered.length === recipients.length

    ){

        return false;

    }

    saveRecipients(

        filtered

    );

    publishRecipientEvent(

        RECIPIENT_EVENTS.DELETED,

        {

            identifier

        }

    );
synchroniseRecipients();
   renderRecipientDashboard();
    return true;

}
/* ==========================================================
   RECIPIENT FAVOURITES
========================================================== */

function toggleFavourite(

    identifier

){

    const recipient =

        findRecipient(

            identifier

        );

    if(!recipient){

        return null;

    }

    return updateRecipient(

        recipient.id,

        {

            favourite:

                !recipient.favourite

        }

    );

}

function getFavouriteRecipients(){

    return getRecipients().filter(

        recipient =>

            recipient.favourite === true

    );

}
/* ==========================================================
   TRUSTED RECIPIENTS
========================================================== */

function toggleTrusted(

    identifier

){

    const recipient =

        findRecipient(

            identifier

        );

    if(!recipient){

        return null;

    }

    return updateRecipient(

        recipient.id,

        {

            trusted:

                !recipient.trusted

        }

    );

}

function getTrustedRecipients(){

    return getRecipients().filter(

        recipient =>

            recipient.trusted === true

    );

}
/* ==========================================================
   RECIPIENT STATISTICS ENGINE
========================================================== */
function getRecentRecipients(
    limit = 10
){

    return getRecipients()

        .filter(

            recipient =>

                recipient.lastUsed

        )

        .sort(

            (a,b)=>

                new Date(b.lastUsed) -

                new Date(a.lastUsed)

        )

        .slice(

            0,

            limit

        );

}
function getMostUsedRecipients(
    limit = 10
){

    return getRecipients()

        .slice()

        .sort(

            (a,b)=>

                b.transferCount -

                a.transferCount

        )

        .slice(

            0,

            limit

        );

}
function getSuggestedRecipients(
    limit = 5
){

    return getRecipients()

        .slice()

        .sort(

            (a,b)=>{

                const scoreA =

                    (a.favourite ? 1000 : 0)

                    +

                    (a.trusted ? 500 : 0)

                    +

                    (a.transferCount || 0);

                const scoreB =

                    (b.favourite ? 1000 : 0)

                    +

                    (b.trusted ? 500 : 0)

                    +

                    (b.transferCount || 0);

                return scoreB - scoreA;

            }

        )

        .slice(

            0,

            limit

        );

}
/* ==========================================================
   RECIPIENT SEARCH ENGINE
========================================================== */
function searchRecipients(

    query = ""

){

    const search =

        query
            .trim()
            .toLowerCase();

    if(!search){

        return getRecipients();

    }

    return getRecipients().filter(

        recipient =>

            (

                recipient.displayName ||

                ""

            )

            .toLowerCase()

            .includes(search)

            ||

            (

                recipient.tag ||

                ""

            )

            .toLowerCase()

            .includes(search)

            ||

            (

                recipient.accountNumber ||

                ""

            )

            .toLowerCase()

            .includes(search)

            ||

            (

                recipient.bank ||

                ""

            )

            .toLowerCase()

            .includes(search)

            ||

            (

                recipient.accountName ||

                ""

            )

            .toLowerCase()

            .includes(search)

    );

}
function searchFavouriteRecipients(

    query = ""

){

    return searchRecipients(

        query

    ).filter(

        recipient =>

            recipient.favourite

    );

}
function searchTrustedRecipients(

    query = ""

){

    return searchRecipients(

        query

    ).filter(

        recipient =>

            recipient.trusted

    );

}
function searchRecentRecipients(

    query = ""

){

    const results =

        searchRecipients(

            query

        );

    return results.sort(

        (

            a,

            b

        )=>

            new Date(

                b.lastUsed || 0

            )

            -

            new Date(

                a.lastUsed || 0

            )

    );

}
/* ==========================================================
   RECIPIENT GROUPS
========================================================== */
function assignRecipientGroup(

    identifier,

    group

){

    const recipient =

        findRecipient(

            identifier

        );

    if(!recipient){

        return null;

    }

    const groups =

        Array.isArray(

            recipient.groups

        )

        ? recipient.groups

        : [];

    if(

        !groups.includes(

            group

        )

    ){

        groups.push(

            group

        );

    }

    return updateRecipient(

        recipient.id,

        {

            groups

        }

    );

}
function removeRecipientGroup(

    identifier,

    group

){

    const recipient =

        findRecipient(

            identifier

        );

    if(!recipient){

        return null;

    }

    const groups =

        (

            recipient.groups ||

            []

        ).filter(

            value =>

                value !== group

        );

    return updateRecipient(

        recipient.id,

        {

            groups

        }

    );

}
function getRecipientGroups(){

    const groups =

        new Set();

    getRecipients()

        .forEach(

            recipient =>{

                (

                    recipient.groups ||

                    []

                ).forEach(

                    group =>

                        groups.add(

                            group

                        )

                );

            }

        );

    return [

        ...groups

    ].sort();

}
function getRecipientsByGroup(

    group

){

    return getRecipients().filter(

        recipient =>

            (

                recipient.groups ||

                []

            ).includes(

                group

            )

    );

}
/* ==========================================================
   RECIPIENT SYNCHRONISATION ENGINE
========================================================== */

function synchroniseRecipients(){

    publishRecipientEvent(

        RECIPIENT_EVENTS.SYNC_STARTED,

        {

            startedAt:

                new Date().toISOString()

        }

    );

    try{

        const recipients =

            getRecipients();

        publishRecipientAudit(

            "recipient.sync",

            {

                recipients:

                    recipients.length

            }

        );

        publishRecipientEvent(

            RECIPIENT_EVENTS.SYNC_COMPLETED,

            {

                completedAt:

                    new Date().toISOString(),

                recipients:

                    recipients.length

            }

        );

        return recipients;

    }

    catch(error){

        publishRecipientEvent(

            RECIPIENT_EVENTS.SYNC_FAILED,

            {

                error:

                    error.message,

                occurredAt:

                    new Date().toISOString()

            }

        );

        return [];

    }

}
/* ==========================================================
   RECIPIENT INTELLIGENCE ENGINE
========================================================== */
function calculateRecipientScore(
    recipient
){

    let score = 0;

    if(
        recipient.favourite
    ){
        score += 1000;
    }

    if(
        recipient.trusted
    ){
        score += 500;
    }

    score += Number(
        recipient.transferCount || 0
    );

    if(
        recipient.lastUsed
    ){

        const days =

            Math.floor(

                (

                    Date.now()

                    -

                    new Date(
                        recipient.lastUsed
                    ).getTime()

                )

                /

                86400000

            );

        if(days <= 7){

            score += 250;

        }
        else if(days <= 30){

            score += 100;

        }

    }

    return score;

}
function getRecipientRanking(){

    return getRecipients()

        .slice()

        .sort(

            (

                a,

                b

            ) =>

                calculateRecipientScore(b)

                -

                calculateRecipientScore(a)

        );

}
function getInactiveRecipients(

    days = 90

){

    return getRecipients()

        .filter(

            recipient=>{

                if(

                    !recipient.lastUsed

                ){

                    return true;

                }

                const inactiveDays =

                    Math.floor(

                        (

                            Date.now()

                            -

                            new Date(

                                recipient.lastUsed

                            ).getTime()

                        )

                        /

                        86400000

                    );

                return inactiveDays > days;

            }

        );

}
function getTopRecipient(){

    const ranking =

        getRecipientRanking();

    if(

        ranking.length === 0

    ){

        return null;

    }

    return ranking[0];

}
function getRecipientInsights(){

    return {

        total:

            getRecipients().length,

        favourites:

            getFavouriteRecipients().length,

        trusted:

            getTrustedRecipients().length,

        inactive:

            getInactiveRecipients().length,

        topRecipient:

            getTopRecipient(),

        rankingGeneratedAt:

            new Date()

            .toISOString()

    };

}
/* ==========================================================
   RECIPIENT ANALYTICS ENGINE
========================================================== */
function getRecipientAnalytics(){

    const recipients =
        getRecipients();

    const analytics = {

        generatedAt:
            new Date().toISOString(),

        totalRecipients:
            recipients.length,

        pay54Recipients: 0,

        bankRecipients: 0,

        favouriteRecipients: 0,

        trustedRecipients: 0,

        inactiveRecipients: 0,

        currencies: {},

        banks: {},

        groups: {}

    };

    recipients.forEach(recipient=>{

        if(recipient.type === "pay54"){

            analytics.pay54Recipients++;

        }

        if(recipient.type === "bank"){

            analytics.bankRecipients++;

        }

        if(recipient.favourite){

            analytics.favouriteRecipients++;

        }

        if(recipient.trusted){

            analytics.trustedRecipients++;

        }

        if(!recipient.lastUsed){

            analytics.inactiveRecipients++;

        }

        const currency =
            recipient.currency || "UNKNOWN";

        analytics.currencies[currency] =
            (analytics.currencies[currency] || 0) + 1;

        const bank =
            recipient.bank || "PAY54";

        analytics.banks[bank] =
            (analytics.banks[bank] || 0) + 1;

        (recipient.groups || []).forEach(group=>{

            analytics.groups[group] =
                (analytics.groups[group] || 0) + 1;

        });

    });

    return analytics;

}
/* ==========================================================
   RECIPIENT RISK & BEHAVIOUR ENGINE
========================================================== */
function calculateRecipientRisk(
    recipient
){

    let score = 0;

    if(!recipient){

        return score;

    }

    if(recipient.trusted){

        score += 100;

    }

    if(recipient.favourite){

        score += 50;

    }

    const transferCount =

        Number(
            recipient.transferCount || 0
        );

    if(transferCount > 25){

        score += 150;

    }

    if(transferCount > 100){

        score += 250;

    }

    if(!recipient.lastUsed){

        score -= 150;

    }else{

        const inactiveDays =

            Math.floor(

                (

                    Date.now()

                    -

                    new Date(
                        recipient.lastUsed
                    ).getTime()

                )

                /

                86400000

            );

        if(inactiveDays > 180){

            score -= 100;

        }

    }

    return score;

}
function getRecipientRiskLevel(
    recipient
){

    const score =

        calculateRecipientRisk(
            recipient
        );

    if(score >= 500){

        return "LOW";

    }

    if(score >= 250){

        return "MEDIUM";

    }

    return "HIGH";

}
function getHighRiskRecipients(){

    return getRecipients()

        .filter(

            recipient =>

                getRecipientRiskLevel(
                    recipient
                ) === "HIGH"

        );

}
function getLowRiskRecipients(){

    return getRecipients()

        .filter(

            recipient =>

                getRecipientRiskLevel(
                    recipient
                ) === "LOW"

        );

}
function getRecipientBehaviourSummary(){

    return {

        generatedAt:

            new Date().toISOString(),

        highRiskRecipients:

            getHighRiskRecipients().length,

        mediumRiskRecipients:

            getRecipients().filter(

                recipient =>

                    getRecipientRiskLevel(
                        recipient
                    ) === "MEDIUM"

            ).length,

        lowRiskRecipients:

            getLowRiskRecipients().length,

        inactiveRecipients:

            getInactiveRecipients().length,

        trustedRecipients:

            getTrustedRecipients().length,

        favouriteRecipients:

            getFavouriteRecipients().length

    };

}
/* ==========================================================
   RECIPIENT VALIDATION ENGINE
========================================================== */

function validateRecipient(recipient){

    const errors = [];

    if(

        !recipient ||

        typeof recipient !== "object"

    ){

        errors.push(
            "Recipient data missing."
        );

    }

    if(

        !recipient.type

    ){

        errors.push(
            "Recipient type required."
        );

    }

    if(

        !recipient.displayName ||

        !recipient.displayName.trim()

    ){

        errors.push(
            "Display name required."
        );

    }

    if(

        recipient.type === "pay54"

    ){

        if(

            !recipient.tag ||

            recipient.tag.length < 2

        ){

            errors.push(
                "Invalid PAY54 Tag."
            );

        }

    }

    if(

        recipient.type === "bank"

    ){

        if(

            !recipient.bank ||

            !recipient.bank.trim()

        ){

            errors.push(
                "Bank name required."
            );

        }

        if(

            !recipient.accountNumber ||

            !/^[0-9]{10}$/.test(
                recipient.accountNumber
            )

        ){

            errors.push(
                "Account number must contain exactly 10 digits."
            );

        }

        if(

            !recipient.accountName ||

            !recipient.accountName.trim()

        ){

            errors.push(
                "Account name required."
            );

        }

    }

    return {

        valid:

            errors.length === 0,

        errors

    };

}
/* ==========================================================
   RECIPIENT DUPLICATE DETECTION ENGINE
========================================================== */

function normaliseRecipient(recipient){

    return {

        type:

            String(
                recipient.type || ""
            )
            .trim()
            .toLowerCase(),

        tag:

            String(
                recipient.tag || ""
            )
            .trim()
            .toLowerCase(),

        accountNumber:

            String(
                recipient.accountNumber || ""
            )
            .replace(/\D/g,""),

        bank:

            String(
                recipient.bank || ""
            )
            .trim()
            .toLowerCase(),

        accountName:

            String(
                recipient.accountName || ""
            )
            .trim()
            .toLowerCase()

    };

}

function isDuplicateRecipient(recipient){

    const incoming =
        normaliseRecipient(
            recipient
        );

    return getRecipients().find(

        existing=>{

            const current =
                normaliseRecipient(
                    existing
                );

            /* PAY54 TAG */

            if(

                incoming.type === "pay54"

            ){

                return (

                    current.type === "pay54"

                    &&

                    current.tag === incoming.tag

                );

            }

            /* BANK ACCOUNT */

            if(

                incoming.type === "bank"

            ){

                return (

                    current.type === "bank"

                    &&

                    current.bank === incoming.bank

                    &&

                    current.accountNumber === incoming.accountNumber

                );

            }

            return false;

        }

    ) || null;

}
function resolveSmartPayment(amount, currency){

  const ledger = safeLedger();
  if(!ledger) return null;

  const balances = ledger.getBalances() || {};
  const cards = JSON.parse(localStorage.getItem("pay54_cards") || "{}");

  if((balances[currency] || 0) >= amount){
    return {
      source: "wallet",
      currency,
      amount
    };
  }

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

  return null;
}

function openSendUnified(){

    if(
        SESSION &&
        typeof SESSION.isAuthenticated === "function"
    ){

        if(
            !SESSION.isAuthenticated()
        ){

            window.PAY54_TOAST
            ?.showToast(
                "Your session has expired."
            );

            return;

        }

    }

    const CONTACTS_PICKER =
        window.PAY54_CONTACTS_PICKER || null;

       let selectedContact =
        null;

    /*
     * ==========================================================
     * PAY54 SEND — EXPLICIT WALLET FUNDING
     * WP-011B.6E.2
     * ==========================================================
     *
     * Stage 1 intentionally supports SAME-CURRENCY wallet funding
     * only.
     *
     * Cross-currency FX funding and linked-card funding remain
     * separate controlled work packages.
     *
     * The ledger remains the canonical source of wallet balances.
     * No funding balance is persisted by this UI.
     * ==========================================================
     */

  const paymentCurrency =
    String(
        getSelectedCurrency() || "NGN"
    )
    .trim()
    .toUpperCase();

if(
    !/^[A-Z]{3}$/.test(
        paymentCurrency
    )
){

    console.error(
        "[PAY54_SEND] Invalid payment currency.",
        paymentCurrency
    );

    window.PAY54_TOAST
    ?.showToast(
        "The selected payment currency is invalid."
    );

    return;

}

const fundingLedger =
    safeLedger();

    if(
        !fundingLedger ||
        typeof fundingLedger.getBalances !==
            "function"
    ){

        window.PAY54_TOAST
        ?.showToast(
            "Wallet balances are temporarily unavailable."
        );

        return;

    }

    const fundingBalances =
        fundingLedger.getBalances() || {};

    const selectedWalletBalance =
        Number(
            fundingBalances[
                paymentCurrency
            ] || 0
        );

    const formatFundingBalance = (
        currency,
        amount
    ) => {

        if(
            typeof fundingLedger.moneyFmt ===
                "function"
        ){

            return fundingLedger.moneyFmt(
                currency,
                amount
            );

        }

        return `${currency} ${Number(
            amount || 0
        ).toLocaleString(
            undefined,
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;

    };

    openModal({

        title:
            "Send Money",

        bodyHTML: `

<form
    class="p54-form"
    id="sendForm"
    novalidate
>

    <div>

        <div class="p54-label">
            Recipient
        </div>

        <div
            style="
                display:flex;
                gap:10px;
                align-items:stretch;
            "
        >

            <input
                class="p54-input"
                id="sendUser"
                name="recipient"
                type="text"
                placeholder="@username"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
                aria-label="PAY54 recipient"
                required
                style="flex:1;min-width:0;"
            >

            ${
                CONTACTS_PICKER &&
                typeof CONTACTS_PICKER.open ===
                    "function"

                    ? `

            <button
                class="p54-btn"
                type="button"
                id="chooseSendContact"
                aria-label="Choose recipient from contacts"
                title="Choose from contacts"
                style="
                    flex:0 0 auto;
                    white-space:nowrap;
                "
            >
                Contacts
            </button>

                    `

                    : ""
            }

        </div>

        <div
            id="sendRecipientStatus"
            aria-live="polite"
            style="
                min-height:18px;
                margin-top:7px;
                font-size:12px;
                opacity:.75;
            "
        >
            Enter a PAY54 tag or choose from Contacts.
        </div>

    </div>
   <div>

    <label
        class="p54-label"
        for="sendFundingSource"
    >
        Pay From
    </label>

    <select
        class="p54-select"
        id="sendFundingSource"
        name="fundingSource"
        aria-describedby="sendFundingBalance sendFundingStatus"
        required
    ></select>

    <div
        id="sendFundingBalance"
        style="
            min-height:18px;
            margin-top:7px;
            font-size:12px;
            opacity:.82;
        "
    ></div>

    <div
        id="sendFundingStatus"
        aria-live="polite"
        role="status"
        style="
            min-height:18px;
            margin-top:4px;
            font-size:12px;
            opacity:.75;
        "
    ></div>

</div>

    <div>

    <div class="p54-label">
        Amount
    </div>

    <input
        class="p54-input"
        id="sendAmount"
        name="amount"
        type="number"
        inputmode="decimal"
        min="0.01"
        max="100000000"
        step="0.01"
        placeholder="0.00"
        autocomplete="off"
        aria-label="Amount to send"
        required
    >

</div>
    <div>

        <div class="p54-label">
            Reference (optional)
        </div>

        <input
            class="p54-input"
            id="sendNote"
            name="reference"
            type="text"
            maxlength="140"
            placeholder="Optional note"
            autocomplete="off"
            aria-label="Payment reference"
        >

    </div>

    <div class="p54-actions">

        <button
            class="p54-btn"
            type="button"
            id="cancelSend"
        >
            Cancel
        </button>

        <button
            class="p54-btn primary"
            type="submit"
            id="confirmSend"
        >
            Send
        </button>

    </div>

</form>

        `,

        onMount: ({
            modal,
            close
        }) => {

            const form =
                modal.querySelector(
                    "#sendForm"
                );

            const recipientInput =
                modal.querySelector(
                    "#sendUser"
                );

                     const amountInput =
                modal.querySelector(
                    "#sendAmount"
                );

            const fundingSource =
                modal.querySelector(
                    "#sendFundingSource"
                );

            const fundingBalance =
                modal.querySelector(
                    "#sendFundingBalance"
                );

            const fundingStatus =
                modal.querySelector(
                    "#sendFundingStatus"
                );
/* ==========================================================================
   PAY54 SEND — FUNDING SOURCE SELECTOR
   Work Package: WP-011B.6E.5G.5B

   Purpose
   -------
   • Preserve the existing proven wallet funding selector.
   • Discover linked-card sources through PAY54_FUNDING_SERVICE.
   • Never read card storage directly.
   • Never authorize, capture, commit or reverse funds here.
   • Never mutate wallet/card balances.
   • Preserve legacy wallet option values until execution migration.
========================================================================== */

const getLiveFundingBalances =
    () => {

        const ledger =
            safeLedger();

        if(
            !ledger ||
            typeof ledger.getBalances !==
                "function"
        ){

            return {};

        }

        const balances =
            ledger.getBalances() || {};

        const safeBalances = {};

        Object.entries(
            balances
        ).forEach(
            ([currency, balance]) => {

                const code =
                    String(
                        currency || ""
                    )
                    .trim()
                    .toUpperCase();

                const amount =
                    Number(
                        balance || 0
                    );

                if(
                    /^[A-Z]{3}$/.test(
                        code
                    ) &&
                    Number.isFinite(
                        amount
                    ) &&
                    amount >= 0
                ){

                    safeBalances[
                        code
                    ] = amount;

                }

            }
        );

        if(
            !Object.prototype.hasOwnProperty.call(
                safeBalances,
                paymentCurrency
            )
        ){

            safeBalances[
                paymentCurrency
            ] = 0;

        }

        return safeBalances;

    };


/* ==========================================================================
   FUNDING SOURCE NORMALISATION
========================================================================== */

const fundingSourceRegistry =
    new Map();


const cleanFundingString =
    value =>
        typeof value === "string"
            ? value.trim()
            : "";


const normaliseFundingCurrency =
    value => {

        const currency =
            cleanFundingString(
                value
            ).toUpperCase();

        return /^[A-Z]{3}$/.test(
            currency
        )
            ? currency
            : "";

    };


const isLinkedCardFundingSource =
    source =>
        Boolean(
            source &&
            source.type ===
                "linked_card" &&
            cleanFundingString(
                source.id
            ).startsWith(
                "linked_card:"
            )
        );


const resolveFundingSourceDescriptor =
    value => {

        const key =
            cleanFundingString(
                value
            );

        if(
            fundingSourceRegistry.has(
                key
            )
        ){

            return fundingSourceRegistry.get(
                key
            );

        }

        /*
         * Legacy wallet compatibility.
         *
         * Until the execution path is migrated in the next
         * controlled work package, wallet option values remain
         * bare ISO currencies such as NGN / GBP / USD.
         */

        const walletCurrency =
            normaliseFundingCurrency(
                key
            );

        if(walletCurrency){

            return Object.freeze({
                id:
                    `wallet:${walletCurrency}`,
                optionValue:
                    walletCurrency,
                type:
                    "wallet",
                currency:
                    walletCurrency,
                legacyWalletValue:
                    true
            });

        }

        return null;

    };


const getLinkedCardDisplayLabel =
    source => {

        const currency =
            normaliseFundingCurrency(
                source?.currency ||
                source?.fundingCurrency ||
                source?.funding_currency
            );

        const last4 =
            cleanFundingString(
                source?.last4 ||
                source?.card?.last4 ||
                source?.display?.last4
            );

        const scheme =
            cleanFundingString(
                source?.scheme ||
                source?.brand ||
                source?.card?.scheme ||
                source?.card?.brand ||
                source?.display?.scheme ||
                source?.display?.brand
            );

        const name =
            cleanFundingString(
                source?.name ||
                source?.label ||
                source?.displayName ||
                source?.display_name
            );

        let label =
            name ||
            (
                scheme && last4
                    ? `${scheme} •••• ${last4}`
                    : last4
                        ? `Linked Card •••• ${last4}`
                        : "Linked Card"
            );

        if(currency){

            label +=
                ` — ${currency}`;

        }

        return label;

    };


/* ==========================================================================
   WALLET SOURCE POPULATION
========================================================================== */

const populateWalletFundingSources =
    () => {

        const balances =
            getLiveFundingBalances();

        const currencies =
            Object.keys(
                balances
            );

        currencies.sort(
            (a, b) => {

                if(
                    a === paymentCurrency
                ){
                    return -1;
                }

                if(
                    b === paymentCurrency
                ){
                    return 1;
                }

                return a.localeCompare(
                    b
                );

            }
        );

        currencies.forEach(
            currency => {

                const canonicalId =
                    `wallet:${currency}`;

                const descriptor =
                    Object.freeze({
                        id:
                            canonicalId,
                        optionValue:
                            currency,
                        type:
                            "wallet",
                        currency,
                        balance:
                            Number(
                                balances[
                                    currency
                                ] || 0
                            ),
                        legacyWalletValue:
                            true
                    });

                fundingSourceRegistry.set(
                    currency,
                    descriptor
                );

                fundingSourceRegistry.set(
                    canonicalId,
                    descriptor
                );

                const option =
                    document.createElement(
                        "option"
                    );

                /*
                 * IMPORTANT:
                 * Keep bare currency here during 5G.5B.
                 * The existing submit path still expects this.
                 */
                option.value =
                    currency;

                option.dataset.sourceId =
                    canonicalId;

                option.dataset.sourceType =
                    "wallet";

                option.dataset.currency =
                    currency;

                option.textContent =
                    `${currency} Wallet — ${formatFundingBalance(
                        currency,
                        balances[
                            currency
                        ]
                    )}`;

                if(
                    currency ===
                    paymentCurrency
                ){

                    option.selected =
                        true;

                }

                fundingSource.appendChild(
                    option
                );

            }
        );

    };


/* ==========================================================================
   LINKED-CARD SOURCE DISCOVERY
========================================================================== */

const discoverLinkedCardFundingSources =
    async () => {

        const service =
            window.PAY54_FUNDING_SERVICE ||
            null;

        if(
            !service ||
            typeof service.listSources !==
                "function"
        ){

            console.warn(
                "[PAY54_SEND] Funding Service unavailable; wallet funding remains available."
            );

            return [];

        }

        let result;

        try{

            result =
                await service.listSources();

        }catch(error){

            console.warn(
                "[PAY54_SEND] Funding source discovery failed.",
                error
            );

            return [];

        }

        if(
            !result ||
            result.ok !== true ||
            !Array.isArray(
                result?.data?.sources
            )
        ){

            console.warn(
                "[PAY54_SEND] Funding Service returned an invalid source catalogue.",
                result
            );

            return [];

        }

        return result.data.sources
            .filter(
                isLinkedCardFundingSource
            );

    };


const appendLinkedCardFundingSources =
    sources => {

        sources.forEach(
            source => {

                const sourceId =
                    cleanFundingString(
                        source.id
                    );

                if(
                    !sourceId ||
                    fundingSourceRegistry.has(
                        sourceId
                    )
                ){

                    return;

                }

                const currency =
                    normaliseFundingCurrency(
                        source.currency ||
                        source.fundingCurrency ||
                        source.funding_currency
                    );

                /*
                 * Fail closed:
                 * an external card without a known currency
                 * cannot be offered as a Send funding source.
                 */
                if(!currency){

                    console.warn(
                        "[PAY54_SEND] Linked-card funding source omitted because its currency is unavailable.",
                        sourceId
                    );

                    return;

                }

                const descriptor =
                    Object.freeze({
                        id:
                            sourceId,
                        optionValue:
                            sourceId,
                        type:
                            "linked_card",
                        currency,
                        source,
                        legacyWalletValue:
                            false
                    });

                fundingSourceRegistry.set(
                    sourceId,
                    descriptor
                );

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    sourceId;

                option.dataset.sourceId =
                    sourceId;

                option.dataset.sourceType =
                    "linked_card";

                option.dataset.currency =
                    currency;

                option.textContent =
                    getLinkedCardDisplayLabel(
                        source
                    );

                fundingSource.appendChild(
                    option
                );

            }
        );

    };


const populateFundingSources =
    async () => {

        const previousValue =
            cleanFundingString(
                fundingSource.value
            );

        fundingSourceRegistry.clear();

        fundingSource.innerHTML =
            "";

        /*
         * Wallets are populated synchronously first so existing
         * Send Money remains usable even if Funding Service
         * discovery is unavailable.
         */
        populateWalletFundingSources();

        const linkedCardSources =
            await discoverLinkedCardFundingSources();

        appendLinkedCardFundingSources(
            linkedCardSources
        );

        /*
         * Preserve an existing selection when possible.
         */
        if(
            previousValue &&
            Array.from(
                fundingSource.options
            ).some(
                option =>
                    option.value ===
                    previousValue
            )
        ){

            fundingSource.value =
                previousValue;

        }

        renderFundingState();

    };


/* ==========================================================================
   EXISTING CANONICAL WALLET FX RESOLUTION
   Preserved unchanged for the wallet path.
========================================================================== */

const getCanonicalFxRate =
    (
        ledger,
        fromCurrency,
        toCurrency
    ) => {

        const from =
            String(
                fromCurrency || ""
            )
            .trim()
            .toUpperCase();

        const to =
            String(
                toCurrency || ""
            )
            .trim()
            .toUpperCase();

        if(
            !/^[A-Z]{3}$/.test(from) ||
            !/^[A-Z]{3}$/.test(to)
        ){

            return null;

        }

        if(
            from === to
        ){

            return 1;

        }

        if(
            !ledger ||
            typeof ledger.getRates !==
                "function"
        ){

            return null;

        }

        let ratesPayload;

        try{

            ratesPayload =
                ledger.getRates();

        }catch(error){

            console.warn(
                "[PAY54_SEND] FX rate catalogue unavailable.",
                error
            );

            return null;

        }

        const table =
            ratesPayload &&
            typeof ratesPayload ===
                "object" &&
            ratesPayload.table &&
            typeof ratesPayload.table ===
                "object"
                ? ratesPayload.table
                : null;

        if(!table){

            return null;

        }

        const directRate =
            Number(
                table?.[from]?.[to]
            );

        if(
            Number.isFinite(
                directRate
            ) &&
            directRate > 0
        ){

            return directRate;

        }

        const inverseRate =
            Number(
                table?.[to]?.[from]
            );

        if(
            Number.isFinite(
                inverseRate
            ) &&
            inverseRate > 0
        ){

            const resolvedRate =
                1 / inverseRate;

            return (
                Number.isFinite(
                    resolvedRate
                ) &&
                resolvedRate > 0
            )
                ? resolvedRate
                : null;

        }

        return null;

    };


const resolveWalletFundingQuote =
    ({
        ledger,
        paymentCurrency:
            requestedPaymentCurrency,
        fundingCurrency:
            requestedFundingCurrency,
        paymentAmount
    }) => {

        const resolvedPaymentCurrency =
            String(
                requestedPaymentCurrency ||
                ""
            )
            .trim()
            .toUpperCase();

        const resolvedFundingCurrency =
            String(
                requestedFundingCurrency ||
                ""
            )
            .trim()
            .toUpperCase();

        const resolvedPaymentAmount =
            Number(
                paymentAmount
            );

        if(
            !ledger ||
            typeof ledger.getBalances !==
                "function" ||
            typeof ledger.convert !==
                "function"
        ){

            return {
                ok: false,
                reason:
                    "LEDGER_UNAVAILABLE"
            };

        }

        if(
            !/^[A-Z]{3}$/.test(
                resolvedPaymentCurrency
            ) ||
            !/^[A-Z]{3}$/.test(
                resolvedFundingCurrency
            ) ||
            !Number.isFinite(
                resolvedPaymentAmount
            ) ||
            resolvedPaymentAmount <= 0
        ){

            return {
                ok: false,
                reason:
                    "INVALID_REQUEST"
            };

        }

        let balances;

        try{

            balances =
                ledger.getBalances() ||
                {};

        }catch(error){

            console.warn(
                "[PAY54_SEND] Funding balances unavailable.",
                error
            );

            return {
                ok: false,
                reason:
                    "BALANCE_UNAVAILABLE"
            };

        }

        const sourceBalance =
            Number(
                balances[
                    resolvedFundingCurrency
                ] ?? 0
            );

        if(
            !Number.isFinite(
                sourceBalance
            ) ||
            sourceBalance < 0
        ){

            return {
                ok: false,
                reason:
                    "INVALID_BALANCE"
            };

        }

        if(
            resolvedFundingCurrency ===
            resolvedPaymentCurrency
        ){

            return {
                ok:
                    sourceBalance >=
                    resolvedPaymentAmount,

                reason:
                    sourceBalance >=
                    resolvedPaymentAmount
                        ? null
                        : "INSUFFICIENT_FUNDS",

                mode:
                    "same_currency",

                paymentCurrency:
                    resolvedPaymentCurrency,

                fundingCurrency:
                    resolvedFundingCurrency,

                paymentAmount:
                    resolvedPaymentAmount,

                sourceDebit:
                    resolvedPaymentAmount,

                sourceBalance,

                fxRate: 1
            };

        }

        const canonicalRate =
            getCanonicalFxRate(
                ledger,
                resolvedPaymentCurrency,
                resolvedFundingCurrency
            );

        if(
            !Number.isFinite(
                canonicalRate
            ) ||
            canonicalRate <= 0
        ){

            return {
                ok: false,
                reason:
                    "FX_PAIR_UNAVAILABLE",

                paymentCurrency:
                    resolvedPaymentCurrency,

                fundingCurrency:
                    resolvedFundingCurrency,

                paymentAmount:
                    resolvedPaymentAmount,

                sourceBalance
            };

        }

        let sourceDebit;

        try{

            sourceDebit =
                Number(
                    ledger.convert(
                        resolvedPaymentCurrency,
                        resolvedFundingCurrency,
                        resolvedPaymentAmount
                    )
                );

        }catch(error){

            console.warn(
                "[PAY54_SEND] FX conversion failed.",
                error
            );

            return {
                ok: false,
                reason:
                    "FX_CONVERSION_FAILED"
            };

        }

        if(
            !Number.isFinite(
                sourceDebit
            ) ||
            sourceDebit <= 0
        ){

            return {
                ok: false,
                reason:
                    "INVALID_FX_QUOTE"
            };

        }

        return {
            ok:
                sourceBalance >=
                sourceDebit,

            reason:
                sourceBalance >=
                sourceDebit
                    ? null
                    : "INSUFFICIENT_FUNDS",

            mode:
                "cross_currency",

            paymentCurrency:
                resolvedPaymentCurrency,

            fundingCurrency:
                resolvedFundingCurrency,

            paymentAmount:
                resolvedPaymentAmount,

            sourceDebit,

            sourceBalance,

            fxRate:
                canonicalRate
        };

    };


/* ==========================================================================
   FUNDING SOURCE PRESENTATION
   Work Package: WP-011B.6E.5G.5C

   Linked-card behaviour
   ---------------------
   • Quotes only through PAY54_FUNDING_SERVICE.
   • No authorization.
   • No commit/capture.
   • No transaction creation.
   • No wallet/card balance mutation.
   • Async quote race protection.
   • Short debounce while the customer types.
   • Linked-card Send remains disabled until the execution path is integrated.
========================================================================== */

let linkedCardQuoteSequence = 0;

let linkedCardQuoteTimer = null;

let linkedCardQuoteState =
    Object.freeze({
        status: "idle",
        sourceId: null,
        paymentAmount: null,
        paymentCurrency: null,
        quote: null,
        error: null
    });


const getConfirmSendButton =
    () =>
        modal.querySelector(
            "#confirmSend"
        );


const LINKED_CARD_SEND_GUARD_ATTRIBUTE =
    "data-pay54-linked-card-send-guard";


const setLinkedCardSendGuard =
    active => {

        const button =
            getConfirmSendButton();

        if(!button){
            return;
        }

        /*
         * WP-011B.6E.5G.5C
         *
         * Linked-card quote preview may prevent submission,
         * but this guard must never override a disabled state
         * owned by validation, PIN verification, transaction
         * execution or another PAY54 control.
         */

        if(active){

            /*
             * Record ownership only when this guard is the
             * component that changes the button from enabled
             * to disabled.
             */

            if(!button.disabled){

                button.setAttribute(
                    LINKED_CARD_SEND_GUARD_ATTRIBUTE,
                    "true"
                );

                button.disabled =
                    true;

            }

            button.setAttribute(
                "aria-disabled",
                "true"
            );

            button.title =
                "Linked-card Send execution is being prepared.";

            return;
        }

        /*
         * Release the disabled state only when this guard
         * originally acquired it.
         *
         * If another workflow disabled the button, PAY54 must
         * preserve that state.
         */

        const ownsDisabledState =
            button.getAttribute(
                LINKED_CARD_SEND_GUARD_ATTRIBUTE
            ) === "true";

        if(ownsDisabledState){

            button.disabled =
                false;

            button.removeAttribute(
                LINKED_CARD_SEND_GUARD_ATTRIBUTE
            );

            button.removeAttribute(
                "aria-disabled"
            );

        }

        /*
         * The title belongs exclusively to this linked-card
         * presentation guard and can safely be removed.
         */

        button.removeAttribute(
            "title"
        );

    };

const resetLinkedCardQuoteState =
    () => {

        linkedCardQuoteSequence += 1;

        if(linkedCardQuoteTimer !== null){

            clearTimeout(
                linkedCardQuoteTimer
            );

            linkedCardQuoteTimer =
                null;

        }

        linkedCardQuoteState =
            Object.freeze({
                status: "idle",
                sourceId: null,
                paymentAmount: null,
                paymentCurrency: null,
                quote: null,
                error: null
            });

    };


const createLinkedCardQuoteOperationId =
    () => {

        const randomPart =
            (
                globalThis.crypto &&
                typeof globalThis.crypto
                    .randomUUID ===
                    "function"
            )
                ? globalThis.crypto
                    .randomUUID()
                : `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 12)}`;

        return (
            `PAY54-SEND-PREPIN-${randomPart}`
        );

    };


const formatLinkedCardQuoteFailure =
    result => {

        const code =
            cleanFundingString(
                result?.code
            );

        if(
            code ===
                "FUNDING_FX_QUOTE_UNAVAILABLE" ||
            code ===
                "FX_QUOTE_UNAVAILABLE"
        ){

            return (
                "Linked-card FX is currently unavailable for this payment."
            );

        }

        const message =
            cleanFundingString(
                result?.message
            );

        return (
            message ||
            "Linked-card funding quote is temporarily unavailable."
        );

    };


const requestLinkedCardPrePinQuote =
    async ({
        descriptor,
        paymentAmount,
        requestSequence
    }) => {

        const sourceId =
            cleanFundingString(
                descriptor?.id
            );

        const service =
            window.PAY54_FUNDING_SERVICE ||
            null;

        if(
            !service ||
            typeof service.quote !==
                "function"
        ){

            if(
                requestSequence !==
                    linkedCardQuoteSequence
            ){
                return;
            }

            linkedCardQuoteState =
                Object.freeze({
                    status:
                        "failed",

                    sourceId,

                    paymentAmount,

                    paymentCurrency,

                    quote:
                        null,

                    error:
                        "FUNDING_SERVICE_UNAVAILABLE"
                });

            fundingStatus.textContent =
                "Linked-card funding service is temporarily unavailable.";

            return;

        }

        let result;

        try{

            result =
                await service.quote({
                    sourceId,

                    paymentAmount,

                    paymentCurrency,

                    operationId:
                        createLinkedCardQuoteOperationId(),

                    metadata: {
                        channel:
                            "send_money",

                        stage:
                            "pre_pin_quote",

                        workPackage:
                            "WP-011B.6E.5G.5C"
                    }
                });

        }catch(error){

            /*
             * A newer user input/selection invalidates this
             * asynchronous response.
             */

            if(
                requestSequence !==
                    linkedCardQuoteSequence
            ){
                return;
            }

            linkedCardQuoteState =
                Object.freeze({
                    status:
                        "failed",

                    sourceId,

                    paymentAmount,

                    paymentCurrency,

                    quote:
                        null,

                    error:
                        cleanFundingString(
                            error?.code
                        ) ||
                        "QUOTE_FAILED"
                });

            fundingStatus.textContent =
                cleanFundingString(
                    error?.message
                ) ||
                "Linked-card funding quote is temporarily unavailable.";

            return;

        }


        /*
         * Ignore stale quote responses.
         */

        if(
            requestSequence !==
                linkedCardQuoteSequence
        ){
            return;
        }


        /*
         * Ensure the user has not changed funding source while
         * the provider quote was in flight.
         */

        const currentDescriptor =
            resolveFundingSourceDescriptor(
                fundingSource.value
            );

        if(
            !currentDescriptor ||
            currentDescriptor.type !==
                "linked_card" ||
            currentDescriptor.id !==
                sourceId
        ){
            return;
        }


        /*
         * Ensure the entered amount has not changed while the
         * quote was in flight.
         */

        const currentAmount =
            Number.parseFloat(
                amountInput.value
            );

        if(
            !Number.isFinite(
                currentAmount
            ) ||
            currentAmount !==
                paymentAmount
        ){
            return;
        }


        if(
            !result ||
            result.ok !== true ||
            !result?.data?.quote
        ){

            linkedCardQuoteState =
                Object.freeze({
                    status:
                        "failed",

                    sourceId,

                    paymentAmount,

                    paymentCurrency,

                    quote:
                        null,

                    error:
                        cleanFundingString(
                            result?.code
                        ) ||
                        "QUOTE_FAILED"
                });

            fundingStatus.textContent =
                formatLinkedCardQuoteFailure(
                    result
                );

            return;

        }


        const quote =
            result.data.quote;

        const quoteId =
            cleanFundingString(
                quote.quoteId
            );

        const quoteSourceId =
            cleanFundingString(
                quote.sourceId
            );

        const quotePaymentCurrency =
            normaliseFundingCurrency(
                quote.paymentCurrency
            );

        const quoteFundingCurrency =
            normaliseFundingCurrency(
                quote.fundingCurrency
            );

        const quotePaymentAmount =
            Number(
                quote.paymentAmount
            );

        const quoteFundingAmount =
            Number(
                quote.fundingAmount
            );

        const quoteFxRate =
            Number(
                quote.fxRate
            );


        /*
         * Fail closed if the Funding Service/adapter returned
         * a quote that does not represent the exact request.
         */

        const quoteContractValid =
            Boolean(
                quoteId &&
                quoteSourceId ===
                    sourceId &&
                quotePaymentCurrency ===
                    paymentCurrency &&
                Number.isFinite(
                    quotePaymentAmount
                ) &&
                quotePaymentAmount ===
                    paymentAmount &&
                quoteFundingCurrency &&
                Number.isFinite(
                    quoteFundingAmount
                ) &&
                quoteFundingAmount > 0
            );


        if(!quoteContractValid){

            linkedCardQuoteState =
                Object.freeze({
                    status:
                        "failed",

                    sourceId,

                    paymentAmount,

                    paymentCurrency,

                    quote:
                        null,

                    error:
                        "QUOTE_CONTRACT_MISMATCH"
                });

            fundingStatus.textContent =
                "Linked-card funding quote could not be verified.";

            return;

        }


        linkedCardQuoteState =
            Object.freeze({
                status:
                    "ready",

                sourceId,

                paymentAmount,

                paymentCurrency,

                quote,

                error:
                    null
            });

       /*
 * WP-011B.6E.5G.5D
 *
 * The pre-PIN quote is now valid for the exact source,
 * amount and payment currency currently displayed.
 *
 * Release only the linked-card presentation guard so the
 * customer may proceed to PAY54 PIN verification.
 *
 * This does NOT authorize or commit the linked card.
 */

setLinkedCardSendGuard(
    false
);


        fundingBalance.textContent =
            `Funding requirement: ${formatFundingBalance(
                quoteFundingCurrency,
                quoteFundingAmount
            )}`;


        if(
            quote.fxUsed === true
        ){

            fundingStatus.textContent =
                Number.isFinite(
                    quoteFxRate
                ) &&
                quoteFxRate > 0
                    ? `${formatFundingBalance(
                        paymentCurrency,
                        quotePaymentAmount
                    )} will use ${formatFundingBalance(
                        quoteFundingCurrency,
                        quoteFundingAmount
                    )} at the provider quote rate ${quoteFxRate}.`
                    : `${formatFundingBalance(
                        paymentCurrency,
                        quotePaymentAmount
                    )} will use ${formatFundingBalance(
                        quoteFundingCurrency,
                        quoteFundingAmount
                    )}.`;

            return;

        }


        fundingStatus.textContent =
            `${formatFundingBalance(
                paymentCurrency,
                quotePaymentAmount
            )} funding quote confirmed from the selected linked card.`;

    };


const scheduleLinkedCardPrePinQuote =
    ({
        descriptor,
        paymentAmount
    }) => {

        linkedCardQuoteSequence += 1;

        const requestSequence =
            linkedCardQuoteSequence;


        if(linkedCardQuoteTimer !== null){

            clearTimeout(
                linkedCardQuoteTimer
            );

        }


        linkedCardQuoteState =
            Object.freeze({
                status:
                    "pending",

                sourceId:
                    descriptor.id,

                paymentAmount,

                paymentCurrency,

                quote:
                    null,

                error:
                    null
            });


        fundingStatus.textContent =
            "Checking linked-card funding…";


        /*
         * Small debounce prevents unnecessary provider quote
         * requests while the customer is still typing.
         */

        linkedCardQuoteTimer =
            setTimeout(
                () => {

                    linkedCardQuoteTimer =
                        null;

                    void requestLinkedCardPrePinQuote({
                        descriptor,
                        paymentAmount,
                        requestSequence
                    });

                },
                180
            );

    };


const renderFundingState =
    () => {

        const descriptor =
            resolveFundingSourceDescriptor(
                fundingSource.value
            );


        if(!descriptor){

            resetLinkedCardQuoteState();

            setLinkedCardSendGuard(
                false
            );

            fundingBalance.textContent =
                "";

            fundingStatus.textContent =
                "Select a valid funding source.";

            return;

        }


        const enteredAmount =
            Number.parseFloat(
                amountInput.value
            );


        /* ======================================================
           LINKED CARD
           WP-011B.6E.5G.5C — PRE-PIN QUOTE ONLY
        ====================================================== */

        if(
            descriptor.type ===
                "linked_card"
        ){

            /*
             * Critical safety boundary:
             *
             * The current submit handler is still wallet-only.
             * Keep Send disabled for linked cards until the
             * post-PIN Funding Service execution path is installed.
             */

            setLinkedCardSendGuard(
                true
            );


            fundingBalance.textContent =
                `Linked card • ${descriptor.currency}`;


            if(
                !Number.isFinite(
                    enteredAmount
                ) ||
                enteredAmount <= 0
            ){

                resetLinkedCardQuoteState();

                fundingStatus.textContent =
                    "Enter an amount to obtain a linked-card funding quote.";

                return;

            }


            scheduleLinkedCardPrePinQuote({
                descriptor,
                paymentAmount:
                    enteredAmount
            });

            return;

        }


        /* ======================================================
           WALLET
           Existing behaviour remains unchanged.
        ====================================================== */

        resetLinkedCardQuoteState();

        setLinkedCardSendGuard(
            false
        );


        const selectedCurrency =
            descriptor.currency;


        const balances =
            getLiveFundingBalances();


        const balance =
            Number(
                balances[
                    selectedCurrency
                ] || 0
            );


        fundingBalance.textContent =
            `Available: ${formatFundingBalance(
                selectedCurrency,
                balance
            )}`;


        if(
            !Number.isFinite(
                enteredAmount
            ) ||
            enteredAmount <= 0
        ){

            if(
                selectedCurrency ===
                    paymentCurrency
            ){

                fundingStatus.textContent =
                    `Payment will be funded from your ${selectedCurrency} wallet.`;

                return;

            }


            const fxRate =
                getCanonicalFxRate(
                    fundingLedger,
                    paymentCurrency,
                    selectedCurrency
                );


            fundingStatus.textContent =
                fxRate
                    ? `Enter an amount to view the ${selectedCurrency} funding requirement.`
                    : `FX funding from ${selectedCurrency} to ${paymentCurrency} is currently unavailable.`;

            return;

        }


        const quote =
            resolveWalletFundingQuote({
                ledger:
                    fundingLedger,

                paymentCurrency,

                fundingCurrency:
                    selectedCurrency,

                paymentAmount:
                    enteredAmount
            });


        if(
            quote.reason ===
                "FX_PAIR_UNAVAILABLE"
        ){

            fundingStatus.textContent =
                `FX funding from ${selectedCurrency} to ${paymentCurrency} is currently unavailable.`;

            return;

        }


        if(
            !quote.ok &&
            quote.reason ===
                "INSUFFICIENT_FUNDS"
        ){

            const requiredAmount =
                Number(
                    quote.sourceDebit
                );


            fundingStatus.textContent =
                Number.isFinite(
                    requiredAmount
                )
                    ? `Insufficient ${selectedCurrency} wallet balance. Required: ${formatFundingBalance(
                        selectedCurrency,
                        requiredAmount
                    )}.`
                    : `Insufficient ${selectedCurrency} wallet balance.`;

            return;

        }


        if(!quote.ok){

            fundingStatus.textContent =
                "Funding quote is temporarily unavailable.";

            return;

        }


        if(
            quote.mode ===
                "same_currency"
        ){

            fundingStatus.textContent =
                `Payment will be funded from your ${selectedCurrency} wallet.`;

            return;

        }


        fundingStatus.textContent =
            `${formatFundingBalance(
                paymentCurrency,
                quote.paymentAmount
            )} will use approximately ${formatFundingBalance(
                selectedCurrency,
                quote.sourceDebit
            )} from your ${selectedCurrency} wallet.`;

    };
/* ==========================================================================
   INITIALISATION
========================================================================== */

void populateFundingSources()
    .catch(
        error => {

            console.error(
                "[PAY54_SEND] Funding source selector failed to initialise.",
                error
            );

            /*
             * Wallet-only fallback.
             */
            fundingSourceRegistry.clear();

            fundingSource.innerHTML =
                "";

            populateWalletFundingSources();

            renderFundingState();

        }
    );


fundingSource.addEventListener(
    "change",
    renderFundingState
);


amountInput.addEventListener(
    "input",
    renderFundingState
);
            const noteInput =
                modal.querySelector(
                    "#sendNote"
                );

            const recipientStatus =
                modal.querySelector(
                    "#sendRecipientStatus"
                );

            const chooseContactButton =
                modal.querySelector(
                    "#chooseSendContact"
                );

            const cancelButton =
                modal.querySelector(
                    "#cancelSend"
                );

            const submitButton =
                modal.querySelector(
                    "#confirmSend"
                );
/* ==========================================================================
   PAY54 SEND — PRE-PIN CONCURRENT SUBMISSION GUARD
   Work Package: WP-011B.6E.5G.5H.5B

   Prevents rapid click / double-submit from starting multiple Send
   execution intents before PIN verification has completed.
========================================================================== */

let sendVerificationInProgress =
    false;


const acquireSendVerificationLock =
    () => {

        if(
            sendVerificationInProgress
        ){

            console.warn(
                "[PAY54_SEND] Duplicate Send submission blocked while payment verification is already in progress."
            );

            return false;

        }


        sendVerificationInProgress =
            true;


        submitButton.disabled =
            true;

        submitButton.setAttribute(
            "aria-disabled",
            "true"
        );

        submitButton.setAttribute(
            "aria-busy",
            "true"
        );


        return true;

    };


const releaseSendVerificationLock =
    () => {

        sendVerificationInProgress =
            false;


        submitButton.disabled =
            false;

        submitButton.removeAttribute(
            "aria-disabled"
        );

        submitButton.removeAttribute(
            "aria-busy"
        );

    };
            if(
                                !form ||
                !recipientInput ||
                !amountInput ||
                !fundingSource ||
                !fundingBalance ||
                !fundingStatus ||
                !noteInput ||
                !cancelButton ||
                !submitButton
            ){

                console.error(
                    "[PAY54_SEND] Send Money UI failed to initialise."
                );

                window.PAY54_TOAST
                ?.showToast(
                    "Send Money is temporarily unavailable."
                );

                close();

                return;

            }

            const cleanString = (
                value
            ) => {

                if(
                    value === null ||
                    value === undefined
                ){

                    return "";

                }

                return String(
                    value
                ).trim();

            };

            const normalisePay54Tag = (
                value
            ) => {

                const cleaned =
                    cleanString(
                        value
                    );

                if(
                    !cleaned
                ){

                    return "";

                }

                return cleaned.startsWith(
                    "@"
                )
                    ? cleaned
                    : `@${cleaned}`;

            };

            const resolveContactTag = (
                contact
            ) => {

                if(
                    !contact ||
                    typeof contact !== "object"
                ){

                    return "";

                }

                const candidates = [

                    contact.tag,

                    contact.pay54Tag,

                    contact.pay54_tag,

                    contact.username,

                    contact.handle,

                    contact.identity?.tag,

                    contact.identity?.pay54Tag,

                    contact.identities?.pay54,

                    contact.identities?.tag

                ];

                for(
                    const candidate
                    of candidates
                ){

                    const value =
                        cleanString(
                            candidate
                        );

                    if(
                        value
                    ){

                        return normalisePay54Tag(
                            value
                        );

                    }

                }

                return "";

            };

            const resolveContactName = (
                contact
            ) => {

                if(
                    !contact ||
                    typeof contact !== "object"
                ){

                    return "";

                }

                return cleanString(

                    contact.displayName ||

                    contact.name ||

                    contact.fullName ||

                    contact.accountName

                );

            };

            const clearSelectedContact =
                () => {

                    selectedContact =
                        null;

                    if(
                        recipientStatus
                    ){

                        recipientStatus.textContent =
                            "Enter a PAY54 tag or choose from Contacts.";

                    }

                };

            const setSelectedContact = (
                contact
            ) => {

                const tag =
                    resolveContactTag(
                        contact
                    );

                if(
                    !tag
                ){

                    window.PAY54_TOAST
                    ?.showToast(
                        "This contact does not have a PAY54 tag."
                    );

                    return false;

                }

                selectedContact = {
                    ...contact,
                    tag
                };

                recipientInput.value =
                    tag;

                const displayName =
                    resolveContactName(
                        contact
                    );

                if(
                    recipientStatus
                ){

                    recipientStatus.textContent =
                        displayName
                            ? `${displayName} • ${tag}`
                            : tag;

                }

                recipientInput.focus();

                return true;

            };

            recipientInput
            .addEventListener(
                "input",
                () => {

                    if(
                        !selectedContact
                    ){

                        return;

                    }

                    const currentValue =
                        normalisePay54Tag(
                            recipientInput.value
                        );

                    const selectedValue =
                        normalisePay54Tag(
                            selectedContact.tag
                        );

                    if(
                        currentValue !==
                        selectedValue
                    ){

                        clearSelectedContact();

                    }

                }
            );

            cancelButton
            .addEventListener(
                "click",
                close
            );

            if(
                chooseContactButton &&
                CONTACTS_PICKER &&
                typeof CONTACTS_PICKER.open ===
                    "function"
            ){

                chooseContactButton
                .addEventListener(
                    "click",
                    () => {

                        try{

                            CONTACTS_PICKER.open({

                                title:
                                    "Choose recipient",

                                subtitle:
                                    "Select a PAY54 contact to send money to.",

                                closeOnSelect:
                                    true,

                                onSelect:
                                    contact => {

                                        setSelectedContact(
                                            contact
                                        );

                                    }

                            });

                        }catch(error){

                            console.error(
                                "[PAY54_SEND] Contacts Picker failed.",
                                error
                            );

                            window.PAY54_TOAST
                            ?.showToast(
                                "Contacts are temporarily unavailable. You can still enter a PAY54 tag."
                            );

                        }

                    }
                );

            }

            form.addEventListener(
                "submit",
                e => {

                    e.preventDefault();

                    const rawUser =
                        cleanString(
                            recipientInput.value
                        );

                    const user =
                        normalisePay54Tag(
                            rawUser
                        );

                    const rawAmount =
                        Number.parseFloat(
                            amountInput.value
                        );

                    const amount =
                        Number.isFinite(
                            rawAmount
                        )
                            ? Number(
                                rawAmount.toFixed(
                                    2
                                )
                            )
                            : 0;

                    const note =
                        cleanString(
                            noteInput.value
                        );

                    const currency =
    paymentCurrency;

                    if(
                        !user ||
                        user.length < 2
                    ){

                        window.PAY54_TOAST
                        ?.showToast(
                            "Enter a valid recipient."
                        );

                        recipientInput.focus();

                        return;

                    }

                    if(
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ){

                        window.PAY54_TOAST
                        ?.showToast(
                            "Enter a valid amount."
                        );

                        amountInput.focus();

                        return;

                    }

                    if(
                        amount >
                        100000000
                    ){

                        window.PAY54_TOAST
                        ?.showToast(
                            "Amount exceeds the transaction limit."
                        );

                        amountInput.focus();

                        return;

                    }
/* ==========================================================================
   LINKED-CARD SEND — POST-PIN REVALIDATION
   Work Package: WP-011B.6E.5G.5D

   Security boundary
   -----------------
   • Requires a verified pre-PIN Funding Service quote.
   • PIN verification occurs before execution revalidation.
   • Funding source is refetched after PIN.
   • A completely fresh Funding Service quote is obtained after PIN.
   • Source / amount / currency are revalidated.
   • NO authorization occurs in this work package.
   • NO commit/capture occurs.
   • NO transaction is recorded.
   • NO wallet balance is mutated.
   • NO local linked-card balance is mutated.
========================================================================== */

const selectedFundingDescriptor =
    resolveFundingSourceDescriptor(
        fundingSource.value
    );


if(
    selectedFundingDescriptor?.type ===
        "linked_card"
){

    const sourceId =
        cleanFundingString(
            selectedFundingDescriptor.id
        );


    /*
     * ----------------------------------------------------------
     * PRE-PIN CONTRACT VERIFICATION
     * ----------------------------------------------------------
     *
     * Never enter PIN verification unless the asynchronous
     * pre-PIN quote represents the exact payment currently
     * displayed to the customer.
     */

  const prePinQuote =
    linkedCardQuoteState?.quote ||
    null;


/* ==========================================================
   WP-011B.6E.5G.5D.1
   IMMUTABLE SEND EXECUTION INTENT

   The financial contract crossing the PIN boundary must not
   depend on mutable form controls or a stale modal closure.

   This intent is deliberately created before PIN and frozen.
========================================================== */

const linkedCardExecutionIntent =
    Object.freeze({

        sourceId,

        sourceType:
            "linked_card",

        recipient:
            user,

        paymentAmount:
            amount,

        paymentCurrency:
            currency,

        prePinQuoteId:
            cleanFundingString(
                prePinQuote?.quoteId
            ),

        createdAt:
            new Date()
                .toISOString()

    });


console.info(
    "[PAY54_SEND] 5G.5D linked-card execution intent created.",
    linkedCardExecutionIntent
);


const prePinQuoteValid =
    Boolean(
            linkedCardQuoteState?.status ===
                "ready" &&

            linkedCardQuoteState?.sourceId ===
                sourceId &&

            Number(
                linkedCardQuoteState?.paymentAmount
            ) ===
                amount &&

            linkedCardQuoteState?.paymentCurrency ===
                currency &&

            prePinQuote &&

            cleanFundingString(
                prePinQuote.sourceId
            ) ===
                sourceId &&

            normaliseFundingCurrency(
                prePinQuote.paymentCurrency
            ) ===
                currency &&

            Number(
                prePinQuote.paymentAmount
            ) ===
                amount
        );


    if(!prePinQuoteValid){

        setLinkedCardSendGuard(
            true
        );

        fundingStatus.textContent =
            "The linked-card funding quote is no longer current. Please wait for a fresh quote.";

        window.PAY54_TOAST
        ?.showToast(
            "Please wait for the linked-card funding quote to refresh."
        );

        renderFundingState();

        return;

    }


    const fundingService =
        window.PAY54_FUNDING_SERVICE ||
        null;


    if(
        !fundingService ||
        typeof fundingService.getSource !==
            "function" ||
        typeof fundingService.quote !==
            "function"
    ){

        setLinkedCardSendGuard(
            true
        );

        fundingStatus.textContent =
            "Linked-card funding is temporarily unavailable.";

        window.PAY54_TOAST
        ?.showToast(
            "Linked-card funding is temporarily unavailable."
        );

        return;

    }


    /*
     * ----------------------------------------------------------
     * PIN VERIFICATION
     * ----------------------------------------------------------
     *
     * No Funding Service authorization/commit operation occurs
     * before this boundary.
     */

    try{

        requestPinVerification(
            async () => {

                /*
                 * Successful PAY54 PIN verification.
                 *
                 * Lock the form while execution-time funding
                 * revalidation is in progress.
                 */

                submitButton.disabled =
                    true;

                submitButton.setAttribute(
                    "aria-busy",
                    "true"
                );


                try{

                    /*
                     * --------------------------------------------------
                     * SOURCE REFETCH
                     * --------------------------------------------------
                     *
                     * The pre-PIN source descriptor cannot be trusted
                     * as execution-time state.
                     */

                    const sourceResult =
                        await fundingService
                            .getSource(
                                sourceId
                            );


                    if(
                        !sourceResult ||
                        sourceResult.ok !==
                            true ||
                        !sourceResult?.data?.source
                    ){

                        throw new Error(
                            "Linked-card funding source is no longer available."
                        );

                    }


                    const executionSource =
                        sourceResult.data.source;


                    const executionSourceId =
                        cleanFundingString(
                            executionSource.id
                        );


                    const executionSourceType =
                        cleanFundingString(
                            executionSource.type
                        );


                    const executionSourceCurrency =
                        normaliseFundingCurrency(
                            executionSource.currency
                        );


                    /*
                     * Fail closed if the source identity changed.
                     */

                    if(
                        executionSourceId !==
                            sourceId ||
                        executionSourceType !==
                            "linked_card"
                    ){

                        throw new Error(
                            "Linked-card funding source identity changed during verification."
                        );

                    }


                    /*
                     * Explicit execution-time eligibility checks.
                     *
                     * These conditions are intentionally defensive.
                     * If the canonical source explicitly reports that
                     * it is inactive or frozen, execution stops.
                     */

                    if(
                        executionSource.active ===
                            false ||
                        executionSource.frozen ===
                            true
                    ){

                        throw new Error(
                            "Linked-card funding source is no longer eligible."
                        );

                    }


                    if(
                        !executionSourceCurrency
                    ){

                        throw new Error(
                            "Linked-card funding currency is unavailable."
                        );

                    }


                    /*
                     * --------------------------------------------------
                     * UI CONTRACT RECHECK
                     * --------------------------------------------------
                     *
                     * The user must still be looking at the same source,
                     * amount and currency after returning from PIN.
                     */

                    const currentDescriptor =
    resolveFundingSourceDescriptor(
        fundingSource.value
    );


const currentAmount =
    Number.parseFloat(
        amountInput.value
    );


const currentRecipient =
    normalisePay54Tag(
        cleanString(
            recipientInput.value
        )
    );


const currentPaymentAmount =
    Number.isFinite(
        currentAmount
    )
        ? Number(
            currentAmount.toFixed(
                2
            )
        )
        : 0;


const executionIntentStillValid =
    Boolean(

        linkedCardExecutionIntent &&

        linkedCardExecutionIntent.sourceType ===
            "linked_card" &&

        linkedCardExecutionIntent.sourceId ===
            sourceId &&

        linkedCardExecutionIntent.sourceId ===
            currentDescriptor?.id &&

        currentDescriptor?.type ===
            "linked_card" &&

        linkedCardExecutionIntent.paymentAmount ===
            amount &&

        linkedCardExecutionIntent.paymentAmount ===
            currentPaymentAmount &&

        linkedCardExecutionIntent.paymentCurrency ===
            currency &&

        linkedCardExecutionIntent.recipient ===
            user &&

        linkedCardExecutionIntent.recipient ===
            currentRecipient &&

        linkedCardExecutionIntent.prePinQuoteId ===
            cleanFundingString(
                prePinQuote?.quoteId
            )

    );


if(!executionIntentStillValid){

    console.error(
        "[PAY54_SEND] Linked-card execution intent changed across PIN boundary.",
        {
            intended:
                linkedCardExecutionIntent,

            current: {
                sourceId:
                    currentDescriptor?.id ||
                    null,

                sourceType:
                    currentDescriptor?.type ||
                    null,

                recipient:
                    currentRecipient,

                paymentAmount:
                    currentPaymentAmount,

                paymentCurrency:
                    currency,

                prePinQuoteId:
                    cleanFundingString(
                        prePinQuote?.quoteId
                    )
            }
        }
    );


    throw new Error(
        "Payment details changed during PIN verification."
    );

}


console.info(
    "[PAY54_SEND] 5G.5D linked-card execution intent verified after PIN.",
    linkedCardExecutionIntent
);


                    /*
                     * --------------------------------------------------
                     * FRESH POST-PIN QUOTE
                     * --------------------------------------------------
                     *
                     * Never authorize against the pre-PIN quote.
                     *
                     * A new operation identifier is deliberately used
                     * because this is a new execution-time quote.
                     */

                    const executionOperationId =
                        createLinkedCardQuoteOperationId()
                            .replace(
                                "PREPIN",
                                "POSTPIN"
                            );


                    const executionQuoteResult =
                        await fundingService
                            .quote({
                                sourceId,

                                paymentAmount:
                                    amount,

                                paymentCurrency:
                                    currency,

                                operationId:
                                    executionOperationId,

                                metadata: {
                                    channel:
                                        "send_money",

                                    stage:
                                        "post_pin_revalidation",

                                    workPackage:
                                        "WP-011B.6E.5G.5D"
                                }
                            });


                    if(
                        !executionQuoteResult ||
                        executionQuoteResult.ok !==
                            true ||
                        !executionQuoteResult?.data?.quote
                    ){

                        throw new Error(
                            cleanFundingString(
                                executionQuoteResult?.message
                            ) ||
                            "Linked-card funding could not be revalidated after PIN verification."
                        );

                    }


                    const executionQuote =
                        executionQuoteResult
                            .data
                            .quote;


                    const executionQuoteId =
                        cleanFundingString(
                            executionQuote.quoteId
                        );


                    const executionQuoteSourceId =
                        cleanFundingString(
                            executionQuote.sourceId
                        );


                    const executionPaymentCurrency =
                        normaliseFundingCurrency(
                            executionQuote.paymentCurrency
                        );


                    const executionFundingCurrency =
                        normaliseFundingCurrency(
                            executionQuote.fundingCurrency
                        );


                    const executionPaymentAmount =
                        Number(
                            executionQuote.paymentAmount
                        );


                    const executionFundingAmount =
                        Number(
                            executionQuote.fundingAmount
                        );


                    /*
                     * --------------------------------------------------
                     * EXECUTION QUOTE CONTRACT
                     * --------------------------------------------------
                     *
                     * Every financially relevant field must still
                     * represent the payment approved by the customer.
                     */

                    const executionQuoteValid =
    Boolean(
        executionQuoteId &&

        executionQuoteSourceId ===
            sourceId &&

        executionPaymentCurrency ===
            currency &&

        Number.isFinite(
            executionPaymentAmount
        ) &&

        executionPaymentAmount ===
            amount &&

        executionFundingCurrency &&

        /*
         * WP-011B.6E.5G.5D
         *
         * The fresh provider quote must still settle against
         * the currency of the source that was independently
         * refetched after successful PIN verification.
         *
         * Never permit a provider quote whose funding currency
         * has diverged from the execution-time source contract.
         */

        executionFundingCurrency ===
            executionSourceCurrency &&

        Number.isFinite(
            executionFundingAmount
        ) &&

        executionFundingAmount >
            0
    );

                    if(!executionQuoteValid){

                        throw new Error(
                            "Post-PIN linked-card funding quote failed financial contract validation."
                        );

                    }


                                        /*
                     * --------------------------------------------------
                     * WP-011B.6E.5G.5E
                     * LINKED-CARD AUTHORIZATION + COMMIT
                     * --------------------------------------------------
                     *
                     * 5G.5D has already established:
                     *
                     * • PAY54 PIN verification succeeded.
                     * • Immutable execution intent survived PIN.
                     * • Funding source was refetched.
                     * • Source remained eligible.
                     * • A fresh post-PIN quote was obtained.
                     * • The execution quote matches the customer-approved
                     *   payment contract.
                     *
                     * This work package may therefore cross the external
                     * provider financial execution boundary.
                     *
                     * IMPORTANT:
                     *
                     * • Authorization MUST occur through Funding Service.
                     * • Commit MUST occur through Funding Service.
                     * • recipient.js MUST NOT call the provider directly.
                     * • recipient.js MUST NOT mutate PAY54 wallet balances.
                     * • recipient.js MUST NOT mutate linked-card balances.
                     * • recipient.js MUST NOT call PAY54_LEDGER.applyEntry().
                     * • Canonical PAY54 transaction recording remains
                     *   intentionally deferred to WP-011B.6E.5G.5F.
                     */


                    if(
                        typeof fundingService.authorize !==
                            "function" ||
                        typeof fundingService.commit !==
                            "function"
                    ){

                        throw new Error(
                            "Linked-card financial execution is temporarily unavailable."
                        );

                    }


                    /*
                     * --------------------------------------------------
                     * FINAL EXECUTION-INTENT ASSERTION
                     * --------------------------------------------------
                     *
                     * Never authorize merely because the execution quote
                     * itself is valid. The quote must also remain bound to
                     * the immutable intent that crossed the PIN boundary.
                     */

                    const authorizationIntentValid =
                        Boolean(

                            linkedCardExecutionIntent &&

                            linkedCardExecutionIntent.sourceId ===
                                sourceId &&

                            linkedCardExecutionIntent.sourceType ===
                                "linked_card" &&

                            linkedCardExecutionIntent.recipient ===
                                user &&

                            linkedCardExecutionIntent.paymentAmount ===
                                executionPaymentAmount &&

                            linkedCardExecutionIntent.paymentCurrency ===
                                executionPaymentCurrency &&

                            executionQuoteSourceId ===
                                sourceId &&

                            executionFundingCurrency ===
                                executionSourceCurrency

                        );


                    if(!authorizationIntentValid){

                        throw new Error(
                            "Linked-card execution intent no longer matches the authorized payment."
                        );

                    }


                    /*
                     * --------------------------------------------------
                     * EXECUTION IDENTIFIERS
                     * --------------------------------------------------
                     *
                     * Authorization and commit intentionally share the
                     * operation identifier associated with the fresh
                     * post-PIN execution quote.
                     *
                     * The commit idempotency key is created once for this
                     * execution attempt and must never be regenerated
                     * between retries of the same commit operation.
                     */

                    const commitIdempotencyKey =
                        `PAY54-SEND-COMMIT-${executionOperationId}`;


                    /*
                     * --------------------------------------------------
                     * AUTHORIZATION
                     * --------------------------------------------------
                     */

                    fundingBalance.textContent =
                        `Authorizing: ${formatFundingBalance(
                            executionFundingCurrency,
                            executionFundingAmount
                        )}`;


                    fundingStatus.textContent =
                        "PIN verified. Authorizing linked-card funding securely…";


                    const authorizationResult =
                        await fundingService
                            .authorize({
                                sourceId,

                                quoteId:
                                    executionQuoteId,

                                operationId:
                                    executionOperationId,

                                metadata: {
                                    channel:
                                        "send_money",

                                    stage:
                                        "linked_card_authorization",

                                    workPackage:
                                        "WP-011B.6E.5G.5E",

                                    recipient:
                                        linkedCardExecutionIntent
                                            .recipient
                                }
                            });


                    if(
                        !authorizationResult ||
                        authorizationResult.ok !==
                            true ||
                        !authorizationResult?.data?.authorization
                    ){

                        throw new Error(
                            cleanFundingString(
                                authorizationResult?.message
                            ) ||
                            "Linked-card funding authorization failed."
                        );

                    }


                    const authorization =
                        authorizationResult
                            .data
                            .authorization;


                    const authorizationId =
                        cleanFundingString(
                            authorization.authorizationId
                        );


                    const authorizationSourceId =
                        cleanFundingString(
                            authorization.sourceId
                        );


                    const authorizationQuoteId =
                        cleanFundingString(
                            authorization.quoteId
                        );


                    const authorizationOperationId =
                        cleanFundingString(
                            authorization.operationId
                        );


                    const authorizationStatus =
                        cleanFundingString(
                            authorization.status
                        );


                    /*
                     * --------------------------------------------------
                     * AUTHORIZATION CONTRACT VALIDATION
                     * --------------------------------------------------
                     *
                     * An authorization response is not trusted merely
                     * because Funding Service returned ok:true.
                     */

                    const authorizationValid =
                        Boolean(

                            authorizationId &&

                            authorizationStatus ===
                                "authorized" &&

                            authorizationSourceId ===
                                sourceId &&

                            authorizationQuoteId ===
                                executionQuoteId &&

                            authorizationOperationId ===
                                executionOperationId

                        );


                    if(!authorizationValid){

                        console.error(
                            "[PAY54_SEND] Linked-card authorization contract validation failed.",
                            {
                                expected: {
                                    sourceId,

                                    quoteId:
                                        executionQuoteId,

                                    operationId:
                                        executionOperationId,

                                    status:
                                        "authorized"
                                },

                                received: {
                                    authorizationId,

                                    sourceId:
                                        authorizationSourceId,

                                    quoteId:
                                        authorizationQuoteId,

                                    operationId:
                                        authorizationOperationId,

                                    status:
                                        authorizationStatus
                                }
                            }
                        );


                        throw new Error(
                            "Linked-card provider authorization could not be verified."
                        );

                    }


                    console.info(
                        "[PAY54_SEND] WP-011B.6E.5G.5E linked-card authorization verified.",
                        {
                            sourceId,

                            executionQuoteId,

                            authorizationId,

                            operationId:
                                executionOperationId,

                            status:
                                authorizationStatus,

                            commitExecuted:
                                false,

                            transactionRecorded:
                                false
                        }
                    );


                    /*
                     * --------------------------------------------------
                     * PRE-COMMIT EXECUTION CONTRACT RECHECK
                     * --------------------------------------------------
                     *
                     * Authorization may take time. Re-read the mutable UI
                     * immediately before crossing the provider commit
                     * boundary.
                     *
                     * The customer must still be looking at exactly the
                     * payment that was PIN-verified and authorized.
                     */

                    const preCommitDescriptor =
                        resolveFundingSourceDescriptor(
                            fundingSource.value
                        );


                    const preCommitRawAmount =
                        Number.parseFloat(
                            amountInput.value
                        );


                    const preCommitAmount =
                        Number.isFinite(
                            preCommitRawAmount
                        )
                            ? Number(
                                preCommitRawAmount.toFixed(
                                    2
                                )
                            )
                            : 0;


                    const preCommitRecipient =
                        normalisePay54Tag(
                            cleanString(
                                recipientInput.value
                            )
                        );


                    const preCommitContractValid =
                        Boolean(

                            preCommitDescriptor?.type ===
                                "linked_card" &&

                            preCommitDescriptor?.id ===
                                linkedCardExecutionIntent.sourceId &&

                            preCommitAmount ===
                                linkedCardExecutionIntent.paymentAmount &&

                            preCommitRecipient ===
                                linkedCardExecutionIntent.recipient &&

                            currency ===
                                linkedCardExecutionIntent.paymentCurrency

                        );


                    if(!preCommitContractValid){

                        console.error(
                            "[PAY54_SEND] Linked-card payment changed after authorization and before commit.",
                            {
                                intended:
                                    linkedCardExecutionIntent,

                                current: {
                                    sourceId:
                                        preCommitDescriptor?.id ||
                                        null,

                                    sourceType:
                                        preCommitDescriptor?.type ||
                                        null,

                                    recipient:
                                        preCommitRecipient,

                                    paymentAmount:
                                        preCommitAmount,

                                    paymentCurrency:
                                        currency
                                },

                                authorizationId
                            }
                        );


                        throw new Error(
                            "Payment details changed before linked-card commitment."
                        );

                    }


                    /*
                     * --------------------------------------------------
                     * COMMIT / PROVIDER CAPTURE
                     * --------------------------------------------------
                     *
                     * This is the external provider financial commitment
                     * boundary.
                     *
                     * The Funding Adapter and provider own:
                     *
                     * • authorization lookup
                     * • source revalidation
                     * • quote validation
                     * • commit idempotency
                     * • provider capture
                     * • provider commitment confirmation
                     */

                    fundingBalance.textContent =
                        `Authorized: ${formatFundingBalance(
                            executionFundingCurrency,
                            executionFundingAmount
                        )}`;


                    fundingStatus.textContent =
                        "Linked-card funding authorized. Confirming provider commitment…";


                    const commitResult =
                        await fundingService
                            .commit({
                                sourceId,

                                quoteId:
                                    executionQuoteId,

                                authorizationId,

                                operationId:
                                    executionOperationId,

                                idempotencyKey:
                                    commitIdempotencyKey,

                                metadata: {
                                    channel:
                                        "send_money",

                                    stage:
                                        "linked_card_commit",

                                    workPackage:
                                        "WP-011B.6E.5G.5E",

                                    recipient:
                                        linkedCardExecutionIntent
                                            .recipient
                                }
                            });


                    if(
                        !commitResult ||
                        commitResult.ok !==
                            true ||
                        !commitResult?.data?.commit
                    ){

                        throw new Error(
                            cleanFundingString(
                                commitResult?.message
                            ) ||
                            "Linked-card funding commitment could not be confirmed."
                        );

                    }


                    const fundingCommit =
                        commitResult
                            .data
                            .commit;


                    const commitId =
                        cleanFundingString(
                            fundingCommit.commitId
                        );


                    const commitSourceId =
                        cleanFundingString(
                            fundingCommit.sourceId
                        );


                    const commitSourceType =
                        cleanFundingString(
                            fundingCommit.sourceType
                        );


                    const commitQuoteId =
                        cleanFundingString(
                            fundingCommit.quoteId
                        );


                    const commitAuthorizationId =
                        cleanFundingString(
                            fundingCommit.authorizationId
                        );


                    const commitOperationId =
                        cleanFundingString(
                            fundingCommit.operationId
                        );


                    const commitStatus =
                        cleanFundingString(
                            fundingCommit.status
                        );


                    const commitPaymentAmount =
                        Number(
                            fundingCommit.paymentAmount
                        );


                    const commitPaymentCurrency =
                        normaliseFundingCurrency(
                            fundingCommit.paymentCurrency
                        );


                    const commitFundingAmount =
                        Number(
                            fundingCommit.fundingAmount
                        );


                    const commitFundingCurrency =
                        normaliseFundingCurrency(
                            fundingCommit.fundingCurrency
                        );


                    /*
                     * --------------------------------------------------
                     * COMMIT CONTRACT VALIDATION
                     * --------------------------------------------------
                     *
                     * Provider commitment is accepted only when every
                     * financially relevant identifier and amount matches
                     * the fresh post-PIN execution contract.
                     */

                    const commitValid =
                        Boolean(

                            commitId &&

                            commitStatus ===
                                "committed" &&

                            commitSourceId ===
                                sourceId &&

                            commitSourceType ===
                                "linked_card" &&

                            commitQuoteId ===
                                executionQuoteId &&

                            commitAuthorizationId ===
                                authorizationId &&

                            commitOperationId ===
                                executionOperationId &&

                            Number.isFinite(
                                commitPaymentAmount
                            ) &&

                            commitPaymentAmount ===
                                executionPaymentAmount &&

                            commitPaymentCurrency ===
                                executionPaymentCurrency &&

                            Number.isFinite(
                                commitFundingAmount
                            ) &&

                            commitFundingAmount ===
                                executionFundingAmount &&

                            commitFundingCurrency ===
                                executionFundingCurrency

                        );


                    if(!commitValid){

                        /*
                         * IMPORTANT:
                         *
                         * At this point Funding Service may already have
                         * received provider commitment confirmation.
                         *
                         * Do not represent this as an ordinary payment
                         * failure and do not attempt a second commitment.
                         *
                         * Automated compensation/reversal is introduced
                         * in WP-011B.6E.5G.5G.
                         */

                        console.error(
                            "[PAY54_SEND] CRITICAL: linked-card provider commitment returned an unverifiable financial contract.",
                            {
                                expected: {
                                    sourceId,

                                    sourceType:
                                        "linked_card",

                                    quoteId:
                                        executionQuoteId,

                                    authorizationId,

                                    operationId:
                                        executionOperationId,

                                    paymentAmount:
                                        executionPaymentAmount,

                                    paymentCurrency:
                                        executionPaymentCurrency,

                                    fundingAmount:
                                        executionFundingAmount,

                                    fundingCurrency:
                                        executionFundingCurrency
                                },

                                received: {
                                    commitId,

                                    sourceId:
                                        commitSourceId,

                                    sourceType:
                                        commitSourceType,

                                    quoteId:
                                        commitQuoteId,

                                    authorizationId:
                                        commitAuthorizationId,

                                    operationId:
                                        commitOperationId,

                                    status:
                                        commitStatus,

                                    paymentAmount:
                                        commitPaymentAmount,

                                    paymentCurrency:
                                        commitPaymentCurrency,

                                    fundingAmount:
                                        commitFundingAmount,

                                    fundingCurrency:
                                        commitFundingCurrency
                                }
                            }
                        );


                        fundingBalance.textContent =
                            "Provider commitment requires reconciliation.";


                        fundingStatus.textContent =
                            "Linked-card funding reached the provider but PAY54 could not verify the final commitment contract. Do not retry this payment.";


                        setLinkedCardSendGuard(
                            true
                        );


                        window.PAY54_TOAST
                        ?.showToast(
                            "Payment status requires verification. Please do not retry."
                        );


                        return;

                    }


                                      /*
                     * --------------------------------------------------
                     * WP-011B.6E.5G.5F
                     * CANONICAL EXTERNAL TRANSACTION RECORDING
                     * --------------------------------------------------
                     *
                     * Provider authorization and provider commitment have
                     * already completed successfully.
                     *
                     * The financial settlement therefore exists outside
                     * the PAY54 wallet ledger.
                     *
                     * This stage records that completed external
                     * settlement into PAY54's canonical transaction
                     * repository.
                     *
                     * CRITICAL FINANCIAL RULES
                     * --------------------------------------------------
                     *
                     * • PAY54_TX.recordTransaction() is the ONLY
                     *   transaction-recording boundary used here.
                     *
                     * • PAY54_LEDGER.applyEntry() MUST NOT be called.
                     *
                     * • No PAY54 wallet may be debited or credited.
                     *
                     * • No local linked-card balance may be mutated.
                     *
                     * • Provider authorization MUST NOT be repeated.
                     *
                     * • Provider commit/capture MUST NOT be repeated.
                     *
                     * • Final receipt rendering remains deferred.
                     *
                     * • Beneficiary transfer statistics remain deferred.
                     *
                     * • Automatic reversal/compensation is introduced
                     *   separately in WP-011B.6E.5G.5G.
                     */


                    console.info(
                        "[PAY54_SEND] WP-011B.6E.5G.5E linked-card funding committed.",
                        {
                            sourceId,

                            executionQuoteId,

                            authorizationId,

                            commitId,

                            operationId:
                                executionOperationId,

                            idempotencyKey:
                                commitIdempotencyKey,

                            paymentAmount:
                                commitPaymentAmount,

                            paymentCurrency:
                                commitPaymentCurrency,

                            fundingAmount:
                                commitFundingAmount,

                            fundingCurrency:
                                commitFundingCurrency,

                            providerReference:
                                cleanFundingString(
                                    fundingCommit.providerReference
                                ) ||
                                null,

                            authorizationExecuted:
                                true,

                            commitExecuted:
                                true,

                            walletMutationExecuted:
                                false,

                            transactionRecorded:
                                false
                        }
                    );

/* ==========================================================================
   PAY54 SEND — POST-COMMIT COMPENSATION CONTROLLER
   Work Package: WP-011B.6E.5G.5G.3

   Purpose
   -------
   A linked-card provider commitment is financially authoritative.

   If PAY54 cannot establish the canonical transaction after that commitment,
   the original Send operation MUST NOT be retried.

   Where PAY54 can prove that no canonical external-settlement transaction
   exists, this controller requests an idempotent provider reversal through
   PAY54_FUNDING_SERVICE.

   Safety invariants
   -----------------
   • Never call the provider directly.
   • Never call PAY54_LEDGER.applyEntry().
   • Never mutate a PAY54 wallet.
   • Never mutate a linked-card balance.
   • Never reverse if a canonical transaction for this commit already exists.
   • Never claim compensation unless the Funding Service confirms "reversed".
   • Failed/unknown reversal state always requires reconciliation.
   • Reversal identity is deterministic for the committed financial contract.
========================================================================== */

const compensateLinkedCardPostCommit =
    async ({
        reason,
        cause = null
    } = {}) => {

        const compensationReason =
            cleanFundingString(
                reason
            ) ||
            "POST_COMMIT_CANONICAL_RECORDING_FAILURE";


        /*
         * ----------------------------------------------------------
         * DETERMINISTIC COMPENSATION IDENTITY
         * ----------------------------------------------------------
         *
         * A reversal is a separate financial operation from the
         * original Send operation.
         *
         * The same committed payment must always produce the same
         * reversal operation/idempotency identities.
         */

        const reversalOperationId =
            `PAY54-SEND-REVERSAL-${commitId}`;

        const reversalIdempotencyKey =
            `PAY54-SEND-REVERSAL-IDEMPOTENCY-${commitId}`;


        /*
         * ----------------------------------------------------------
         * CANONICAL TRANSACTION SAFETY CHECK
         * ----------------------------------------------------------
         *
         * Before requesting any reversal, prove that PAY54 does not
         * already contain a canonical externally-settled transaction
         * for this provider commitment.
         *
         * This protects against the dangerous case where persistence
         * succeeded but a later acknowledgement/verification failed.
         */

        let canonicalTransactions;


        try{

            const compensationLedger =
                safeLedger();


            if(
                !compensationLedger ||
                typeof compensationLedger
                    .getTx !==
                    "function"
            ){

                throw new Error(
                    "Canonical transaction repository is unavailable during compensation."
                );

            }


            canonicalTransactions =
                compensationLedger
                    .getTx();


            if(
                !Array.isArray(
                    canonicalTransactions
                )
            ){

                throw new Error(
                    "Canonical transaction repository returned an invalid transaction collection."
                );

            }

        }catch(repositoryError){

            fundingBalance.textContent =
                "Payment requires reconciliation.";


            fundingStatus.textContent =
                "Linked-card funding was committed, but PAY54 cannot safely determine whether a transaction was recorded. No automatic reversal was attempted. Do not retry this payment.";


            setLinkedCardSendGuard(
                true
            );


            console.error(
                "[PAY54_SEND] WP-011B.6E.5G.5G.3 compensation blocked: canonical transaction state could not be proven.",
                {
                    sourceId,

                    commitId,

                    originalOperationId:
                        executionOperationId,

                    compensationReason,

                    repositoryError,

                    originalCause:
                        cause
                }
            );


            window.PAY54_TOAST
            ?.showToast(
                "Payment status requires verification. Please do not retry."
            );


            return Object.freeze({
                ok:
                    false,

                compensated:
                    false,

                reconciliationRequired:
                    true,

                status:
                    "canonical_state_unknown",

                reversalAttempted:
                    false,

                reversalOperationId,

                reversalIdempotencyKey
            });

        }


        const existingCanonicalTransaction =
            canonicalTransactions
                .find(
                    transaction => {

                        const transactionMeta =
                            transaction?.meta &&
                            typeof transaction.meta ===
                                "object"
                                ? transaction.meta
                                : {};


                        const transactionCommitId =
                            cleanFundingString(
                                transactionMeta
                                    .commit_id ||
                                transactionMeta
                                    .commitId
                            );


                        const transactionExternalReference =
                            cleanFundingString(
                                transactionMeta
                                    .external_reference ||
                                transactionMeta
                                    .externalReference
                            );


                        return Boolean(

                            transactionMeta
                                .externally_settled ===
                                true &&

                            cleanFundingString(
                                transactionMeta
                                    .funding_source ||
                                transactionMeta
                                    .fundingSource
                            ) ===
                                "linked_card" &&

                            (
                                transactionCommitId ===
                                    commitId ||

                                transactionExternalReference ===
                                    commitId
                            )

                        );

                    }
                ) ||
            null;


        if(
            existingCanonicalTransaction
        ){

            /*
             * A canonical PAY54 transaction already exists.
             *
             * Reversing here would create a provider refund while PAY54
             * still records the payment as successfully settled.
             *
             * Therefore automatic compensation is forbidden.
             */

            fundingBalance.textContent =
                "Recorded payment requires verification.";


            fundingStatus.textContent =
                "PAY54 detected an existing canonical transaction for this committed payment. Automatic reversal was blocked to protect financial consistency. Do not retry.";


            setLinkedCardSendGuard(
                true
            );


            console.error(
                "[PAY54_SEND] WP-011B.6E.5G.5G.3 automatic reversal blocked because canonical transaction already exists.",
                {
                    sourceId,

                    commitId,

                    transactionId:
                        existingCanonicalTransaction
                            .id ||
                        null,

                    originalOperationId:
                        executionOperationId,

                    compensationReason,

                    originalCause:
                        cause
                }
            );


            window.PAY54_TOAST
            ?.showToast(
                "Payment recorded but requires verification. Please do not retry."
            );


            return Object.freeze({
                ok:
                    false,

                compensated:
                    false,

                reconciliationRequired:
                    true,

                status:
                    "canonical_transaction_present",

                reversalAttempted:
                    false,

                transactionId:
                    existingCanonicalTransaction
                        .id ||
                    null,

                reversalOperationId,

                reversalIdempotencyKey
            });

        }


        /*
         * ----------------------------------------------------------
         * FUNDING SERVICE BOUNDARY
         * ----------------------------------------------------------
         *
         * Resolve at point-of-use because recipient.js loads before
         * the Funding Service in the dashboard boot sequence.
         */

        const compensationFundingService =
            window.PAY54_FUNDING_SERVICE;


        if(
            !compensationFundingService ||
            typeof compensationFundingService
                .reverse !==
                "function"
        ){

            fundingBalance.textContent =
                "Payment requires reconciliation.";


            fundingStatus.textContent =
                "Linked-card funding was committed, but the PAY54 compensation service is unavailable. Do not retry this payment.";


            setLinkedCardSendGuard(
                true
            );


            console.error(
                "[PAY54_SEND] WP-011B.6E.5G.5G.3 compensation unavailable after confirmed provider commitment.",
                {
                    sourceId,

                    commitId,

                    originalOperationId:
                        executionOperationId,

                    compensationReason,

                    originalCause:
                        cause
                }
            );


            window.PAY54_TOAST
            ?.showToast(
                "Payment status requires verification. Please do not retry."
            );


            return Object.freeze({
                ok:
                    false,

                compensated:
                    false,

                reconciliationRequired:
                    true,

                status:
                    "compensation_service_unavailable",

                reversalAttempted:
                    false,

                reversalOperationId,

                reversalIdempotencyKey
            });

        }


        /*
         * ----------------------------------------------------------
         * REVERSAL REQUEST
         * ----------------------------------------------------------
         *
         * Do not send amounts/currencies reconstructed from the UI.
         *
         * commitId allows the Funding Adapter to resolve the original
         * committed financial contract and supply its authoritative
         * amounts/currencies to the provider.
         */

        let reversalResult;


        try{

            reversalResult =
                await compensationFundingService
                    .reverse({
                        sourceId,

                        operationId:
                            reversalOperationId,

                        commitId,

                        idempotencyKey:
                            reversalIdempotencyKey
                    });

        }catch(reversalError){

            fundingBalance.textContent =
                "Payment requires reconciliation.";


            fundingStatus.textContent =
                "Linked-card funding was committed and PAY54 attempted compensation, but the reversal result could not be confirmed. Do not retry this payment.";


            setLinkedCardSendGuard(
                true
            );


            console.error(
                "[PAY54_SEND] WP-011B.6E.5G.5G.3 reversal request failed or returned an unknown state.",
                {
                    sourceId,

                    commitId,

                    originalOperationId:
                        executionOperationId,

                    reversalOperationId,

                    reversalIdempotencyKey,

                    compensationReason,

                    reversalError,

                    originalCause:
                        cause
                }
            );


            window.PAY54_TOAST
            ?.showToast(
                "Payment reversal requires verification. Please do not retry."
            );


            return Object.freeze({
                ok:
                    false,

                compensated:
                    false,

                reconciliationRequired:
                    true,

                status:
                    "reversal_unconfirmed",

                reversalAttempted:
                    true,

                reversalOperationId,

                reversalIdempotencyKey
            });

        }


        /*
         * ----------------------------------------------------------
         * FUNDING SERVICE RESULT VALIDATION
         * ----------------------------------------------------------
         */

        if(
            reversalResult?.ok !==
                true
        ){

            const failureCode =
                cleanFundingString(
                    reversalResult
                        ?.error
                        ?.code ||
                    reversalResult
                        ?.code ||
                    reversalResult
                        ?.failureCode
                ) ||
                "FUNDING_REVERSAL_UNCONFIRMED";


            fundingBalance.textContent =
                "Payment requires reconciliation.";


            fundingStatus.textContent =
                "PAY54 attempted to reverse the committed linked-card payment, but compensation was not confirmed. Do not retry this payment.";


            setLinkedCardSendGuard(
                true
            );


            console.error(
                "[PAY54_SEND] WP-011B.6E.5G.5G.3 Funding Service did not confirm compensation.",
                {
                    sourceId,

                    commitId,

                    originalOperationId:
                        executionOperationId,

                    reversalOperationId,

                    reversalIdempotencyKey,

                    compensationReason,

                    failureCode,

                    reversalResult,

                    originalCause:
                        cause
                }
            );


            window.PAY54_TOAST
            ?.showToast(
                "Payment reversal requires verification. Please do not retry."
            );


            return Object.freeze({
                ok:
                    false,

                compensated:
                    false,

                reconciliationRequired:
                    true,

                status:
                    "reversal_unconfirmed",

                failureCode,

                reversalAttempted:
                    true,

                reversalOperationId,

                reversalIdempotencyKey
            });

        }


        const reversal =
            reversalResult
                ?.data
                ?.reversal ||
            null;


        const reversalStatus =
            cleanFundingString(
                reversal?.status
            )
            .toLowerCase();


        const reversalId =
            cleanFundingString(
                reversal?.reversalId
            );


        const reversalSourceId =
            cleanFundingString(
                reversal?.sourceId
            );


        const reversalCommitId =
            cleanFundingString(
                reversal?.commitId
            );


        const confirmedReversal =
            Boolean(

                reversal &&

                reversalStatus ===
                    "reversed" &&

                reversalId &&

                reversalSourceId ===
                    sourceId &&

                reversalCommitId ===
                    commitId

            );


        if(
            !confirmedReversal
        ){

            fundingBalance.textContent =
                "Payment requires reconciliation.";


            fundingStatus.textContent =
                "PAY54 received a compensation response but could not verify a confirmed reversal. Do not retry this payment.";


            setLinkedCardSendGuard(
                true
            );


            console.error(
                "[PAY54_SEND] WP-011B.6E.5G.5G.3 reversal contract validation failed.",
                {
                    sourceId,

                    commitId,

                    originalOperationId:
                        executionOperationId,

                    reversalOperationId,

                    reversalIdempotencyKey,

                    compensationReason,

                    reversalResult,

                    originalCause:
                        cause
                }
            );


            window.PAY54_TOAST
            ?.showToast(
                "Payment reversal requires verification. Please do not retry."
            );


            return Object.freeze({
                ok:
                    false,

                compensated:
                    false,

                reconciliationRequired:
                    true,

                status:
                    "reversal_contract_unverified",

                reversalAttempted:
                    true,

                reversalOperationId,

                reversalIdempotencyKey
            });

        }


        /*
         * ----------------------------------------------------------
         * CONFIRMED COMPENSATION
         * ----------------------------------------------------------
         *
         * The provider commitment has been successfully reversed.
         *
         * No PAY54 wallet mutation occurs here.
         * No success receipt is generated.
         * No beneficiary transfer statistics are updated.
         */

        fundingBalance.textContent =
            `Payment reversed: ${formatFundingBalance(
                commitPaymentCurrency,
                commitPaymentAmount
            )}`;


        fundingStatus.textContent =
            "PAY54 could not complete transaction recording after the linked-card payment was committed, so the payment was automatically reversed. No PAY54 wallet balance was changed.";


        setLinkedCardSendGuard(
            true
        );


        console.info(
            "[PAY54_SEND] WP-011B.6E.5G.5G.3 automatic post-commit compensation confirmed.",
            {
                sourceId,

                commitId,

                originalOperationId:
                    executionOperationId,

                reversalOperationId,

                reversalIdempotencyKey,

                reversalId,

                reversalStatus,

                providerReference:
                    cleanFundingString(
                        reversal
                            ?.providerReference
                    ) ||
                    null,

                compensationReason,

                externallySettled:
                    false,

                walletMutationExecuted:
                    false,

                beneficiaryUpdated:
                    false,

                receiptDisplayed:
                    false
            }
        );


        window.PAY54_TOAST
        ?.showToast(
            "Payment could not be completed and was automatically reversed."
        );


        return Object.freeze({
            ok:
                true,

            compensated:
                true,

            reconciliationRequired:
                false,

            status:
                "reversed",

            reversalAttempted:
                true,

            reversalId,

            reversalOperationId,

            reversalIdempotencyKey
        });

    };
                    /*
                     * --------------------------------------------------
                     * TRANSACTION ENGINE BOUNDARY
                     * --------------------------------------------------
                     *
                     * Resolve the facade at execution time.
                     *
                     * recipient.js must never access PAY54_EXTERNAL_TX
                     * directly.
                     */

                    const transactionEngine =
                        window.PAY54_TX;


                  if(
    !transactionEngine ||
    typeof transactionEngine
        .recordTransaction !==
        "function"
){

    console.error(
        "[PAY54_SEND] CRITICAL: provider commitment succeeded but PAY54 transaction recorder is unavailable.",
        {
            sourceId,

            quoteId:
                executionQuoteId,

            authorizationId,

            commitId,

            operationId:
                executionOperationId
        }
    );


    await compensateLinkedCardPostCommit({
        reason:
            "TRANSACTION_RECORDER_UNAVAILABLE"
    });


    return;

}


                    /*
                     * --------------------------------------------------
                     * EXTERNAL SETTLEMENT REFERENCE
                     * --------------------------------------------------
                     *
                     * commitId is the canonical immutable reference for
                     * this confirmed provider financial commitment.
                     *
                     * PAY54_TX.recordTransaction() uses the external
                     * reference as its idempotency boundary.
                     */

                    const externalSettlementReference =
                        commitId;


                  if(!externalSettlementReference){

    console.error(
        "[PAY54_SEND] CRITICAL: committed linked-card funding has no external settlement reference.",
        {
            sourceId,

            executionQuoteId,

            authorizationId,

            commitId,

            operationId:
                executionOperationId
        }
    );


    await compensateLinkedCardPostCommit({
        reason:
            "SETTLEMENT_REFERENCE_UNAVAILABLE"
    });


    return;

}


                    /*
                     * --------------------------------------------------
                     * FINANCIAL ISOLATION BASELINE
                     * --------------------------------------------------
                     *
                     * Capture wallet state immediately before canonical
                     * transaction recording.
                     *
                     * This is a defence-in-depth production invariant:
                     * external settlement recording is permitted to add a
                     * transaction record, but it is NEVER permitted to
                     * change PAY54 wallet balances.
                     */

                    const recordingLedger =
                        safeLedger();

if(
    !recordingLedger ||
    typeof recordingLedger
        .getBalances !==
        "function"
){

    console.error(
        "[PAY54_SEND] CRITICAL: wallet isolation baseline unavailable after provider commitment.",
        {
            sourceId,

            commitId,

            operationId:
                executionOperationId
        }
    );


    await compensateLinkedCardPostCommit({
        reason:
            "WALLET_ISOLATION_BASELINE_UNAVAILABLE"
    });


    return;

}


                    const balancesBeforeRecording =
                        structuredClone(
                            recordingLedger
                                .getBalances()
                        );


                    /*
                     * --------------------------------------------------
                     * CANONICAL EXTERNAL TRANSACTION
                     * --------------------------------------------------
                     *
                     * Transaction amount is negative because this is a
                     * customer Send transaction.
                     *
                     * IMPORTANT:
                     *
                     * The negative transaction amount is transaction
                     * history semantics only.
                     *
                     * PAY54_TX.recordTransaction() persists the entry
                     * without applying it to wallet balances.
                     */

                    const externalTransactionMeta = {

                        /*
                         * Recipient / customer instruction
                         */

                        recipient:
                            linkedCardExecutionIntent
                                .recipient,

                        note,

                        /*
                         * External settlement contract
                         */

                        externally_settled:
                            true,

                        external_reference:
                            externalSettlementReference,

                        funding_source:
                            "linked_card",

                        funding_source_id:
                            sourceId,

                        /*
                         * Financial contract
                         */

                        payment_amount:
                            commitPaymentAmount,

                        payment_currency:
                            commitPaymentCurrency,

                        funding_amount:
                            commitFundingAmount,

                        funding_currency:
                            commitFundingCurrency,

                        funding_mode:
                            "external_linked_card",

                        funding_contract:
                            "WP-011B.6E.5G.5F",

                        /*
                         * Provider execution lineage
                         */

                        operation_id:
                            executionOperationId,

                        quote_id:
                            executionQuoteId,

                        authorization_id:
                            authorizationId,

                        commit_id:
                            commitId,

                        commit_idempotency_key:
                            commitIdempotencyKey,

                        provider_reference:
                            cleanFundingString(
                                fundingCommit
                                    .providerReference
                            ) ||
                            null,

                        /*
                         * External settlement must never mutate a PAY54
                         * wallet.
                         */

                        wallet_mutation:
                            false,

                        /*
                         * Funding characteristics
                         */

                        fx_used:
                            fundingCommit.fxUsed ===
                                true,

                        fx_rate:
                            Number.isFinite(
                                Number(
                                    fundingCommit.fxRate
                                )
                            )
                                ? Number(
                                    fundingCommit.fxRate
                                )
                                : 1,

                        /*
                         * Compatibility aliases
                         */

                        fundingSource:
                            "linked_card",

                        fundingSourceId:
                            sourceId,

                        paymentAmount:
                            commitPaymentAmount,

                        paymentCurrency:
                            commitPaymentCurrency,

                        fundingAmount:
                            commitFundingAmount,

                        fundingCurrency:
                            commitFundingCurrency,

                        operationId:
                            executionOperationId,

                        quoteId:
                            executionQuoteId,

                        authorizationId,

                        commitId,

                        externalReference:
                            externalSettlementReference

                    };


                    if(
                        selectedContact?.id
                    ){

                        externalTransactionMeta.contactId =
                            selectedContact.id;

                    }


                    let transactionRecordResult;


                    try{

                        transactionRecordResult =
                            transactionEngine
                                .recordTransaction(
                                    {
                                        type:
                                            "send",

                                        title:
                                            `Sent to ${linkedCardExecutionIntent.recipient}`,

                                        currency:
                                            commitPaymentCurrency,

                                        amount:
                                            -commitPaymentAmount,

                                        icon:
                                            "📤",

                                        meta:
                                            externalTransactionMeta
                                    },
                                    {
                                        /*
                                         * 5G.5F is deliberately a
                                         * recording-only stage.
                                         */

                                        refreshUI:
                                            false,

                                        showReceipt:
                                            false
                                    }
                                );

                   }catch(recordingError){

    /*
     * ==============================================================
     * WP-011B.6E.5G.5G.3
     * AUTOMATIC POST-COMMIT COMPENSATION
     * ==============================================================
     *
     * Provider settlement is already committed.
     *
     * The original Send operation MUST NOT be retried.
     *
     * Before requesting reversal, the compensation controller checks
     * the canonical transaction repository. If persistence actually
     * succeeded despite the thrown recording error, automatic reversal
     * is blocked and the operation moves to reconciliation instead.
     */

    console.error(
        "[PAY54_SEND] CRITICAL: provider commitment succeeded but canonical transaction recording failed.",
        {
            sourceId,

            externalReference:
                externalSettlementReference,

            quoteId:
                executionQuoteId,

            authorizationId,

            commitId,

            operationId:
                executionOperationId,

            error:
                recordingError
        }
    );


    await compensateLinkedCardPostCommit({
        reason:
            "CANONICAL_TRANSACTION_RECORDING_FAILED",

        cause:
            recordingError
    });


    return;

}

                    /*
                     * --------------------------------------------------
                     * RECORDING RESULT VALIDATION
                     * --------------------------------------------------
                     */

                    const recordedTransaction =
                        transactionRecordResult
                            ?.transaction ||
                        null;


                    const recordedMeta =
                        recordedTransaction?.meta &&
                        typeof recordedTransaction.meta ===
                            "object"
                            ? recordedTransaction.meta
                            : {};


                    const recordedAmount =
                        Number(
                            recordedTransaction?.amount
                        );


                    const recordedCurrency =
                        normaliseFundingCurrency(
                            recordedTransaction?.currency
                        );


                    const recordedTransactionValid =
                        Boolean(

                            transactionRecordResult?.ok ===
                                true &&

                            recordedTransaction?.id &&

                            recordedTransaction?.type ===
                                "send" &&

                            Number.isFinite(
                                recordedAmount
                            ) &&

                            recordedAmount ===
                                -commitPaymentAmount &&

                            recordedCurrency ===
                                commitPaymentCurrency &&

                            recordedMeta
                                .externally_settled ===
                                true &&

                            cleanFundingString(
                                recordedMeta
                                    .funding_source
                            ) ===
                                "linked_card" &&

                            cleanFundingString(
                                recordedMeta
                                    .funding_source_id
                            ) ===
                                sourceId &&

                            cleanFundingString(
                                recordedMeta
                                    .external_reference
                            ) ===
                                externalSettlementReference &&

                            cleanFundingString(
                                recordedMeta
                                    .operation_id
                            ) ===
                                executionOperationId &&

                            cleanFundingString(
                                recordedMeta
                                    .quote_id
                            ) ===
                                executionQuoteId &&

                            cleanFundingString(
                                recordedMeta
                                    .authorization_id
                            ) ===
                                authorizationId &&

                            cleanFundingString(
                                recordedMeta
                                    .commit_id
                            ) ===
                                commitId &&

                            Number(
                                recordedMeta
                                    .payment_amount
                            ) ===
                                commitPaymentAmount &&

                            normaliseFundingCurrency(
                                recordedMeta
                                    .payment_currency
                            ) ===
                                commitPaymentCurrency &&

                            Number(
                                recordedMeta
                                    .funding_amount
                            ) ===
                                commitFundingAmount &&

                            normaliseFundingCurrency(
                                recordedMeta
                                    .funding_currency
                            ) ===
                                commitFundingCurrency &&

                            recordedMeta
                                .wallet_mutation ===
                                false

                        );


                    if(!recordedTransactionValid){

                        fundingBalance.textContent =
                            "Recorded payment requires reconciliation.";


                        fundingStatus.textContent =
                            "Linked-card funding was committed, but PAY54 could not verify the canonical transaction contract. Do not retry this payment.";


                        setLinkedCardSendGuard(
                            true
                        );


                        console.error(
                            "[PAY54_SEND] CRITICAL: canonical external transaction failed post-persistence contract validation.",
                            {
                                sourceId,

                                externalReference:
                                    externalSettlementReference,

                                commitId,

                                transactionRecordResult
                            }
                        );


                        window.PAY54_TOAST
                        ?.showToast(
                            "Payment status requires verification. Please do not retry."
                        );


                        return;

                    }


                    /*
                     * --------------------------------------------------
                     * WALLET ISOLATION POSTCONDITION
                     * --------------------------------------------------
                     */

                    const balancesAfterRecording =
                        structuredClone(
                            recordingLedger
                                .getBalances()
                        );


                    const balanceCurrenciesBefore =
                        Object.keys(
                            balancesBeforeRecording
                        )
                        .sort();


                    const balanceCurrenciesAfter =
                        Object.keys(
                            balancesAfterRecording
                        )
                        .sort();


                    const walletCurrencySetUnchanged =
                        JSON.stringify(
                            balanceCurrenciesBefore
                        ) ===
                        JSON.stringify(
                            balanceCurrenciesAfter
                        );


                    const walletValuesUnchanged =
                        walletCurrencySetUnchanged &&
                        balanceCurrenciesBefore
                            .every(
                                walletCurrency =>
                                    Number(
                                        balancesBeforeRecording[
                                            walletCurrency
                                        ]
                                    ) ===
                                    Number(
                                        balancesAfterRecording[
                                            walletCurrency
                                        ]
                                    )
                            );


                    if(!walletValuesUnchanged){

                        /*
                         * This would represent a severe architecture
                         * violation because external transaction
                         * recording must never post a wallet entry.
                         */

                        fundingBalance.textContent =
                            "Payment requires reconciliation.";


                        fundingStatus.textContent =
                            "PAY54 detected an unexpected wallet-state change while recording an externally settled payment. Do not retry.";


                        setLinkedCardSendGuard(
                            true
                        );


                        console.error(
                            "[PAY54_SEND] CRITICAL: external transaction recording violated wallet financial isolation.",
                            {
                                sourceId,

                                commitId,

                                transactionId:
                                    recordedTransaction.id,

                                before:
                                    balancesBeforeRecording,

                                after:
                                    balancesAfterRecording
                            }
                        );


                        window.PAY54_TOAST
                        ?.showToast(
                            "Payment status requires verification. Please do not retry."
                        );


                        return;

                    }


                    /* ==========================================================================
   WP-011B.6E.5G.5H.2
   LINKED-CARD SEND COMPLETION
========================================================================== */

/*
 * Financial execution has already completed successfully:
 *
 * • provider authorization succeeded
 * • provider commit succeeded
 * • canonical PAY54 external transaction exists
 * • wallet financial isolation has been verified
 *
 * Everything below is non-financial post-transaction completion.
 */


/* --------------------------------------------------------------------------
   SUCCESS STATUS
-------------------------------------------------------------------------- */

fundingBalance.textContent =
    `Recorded payment: ${formatFundingBalance(
        commitPaymentCurrency,
        commitPaymentAmount
    )}`;


fundingStatus.textContent =
    "Linked-card payment committed and recorded successfully. PAY54 wallet balances were not changed.";


/* --------------------------------------------------------------------------
   BENEFICIARY ENRICHMENT
-------------------------------------------------------------------------- */

let canonicalBeneficiary =
    null;


try{

    const beneficiaryService =
        window.PAY54_BENEFICIARIES_SERVICE ||
        window.PAY54_BENEFICIARY_SERVICE ||
        null;


    if(
        beneficiaryService &&
        typeof beneficiaryService.resolveRecipient ===
            "function" &&
        typeof beneficiaryService.createBeneficiary ===
            "function" &&
        typeof beneficiaryService.recordUsage ===
            "function"
    ){

        canonicalBeneficiary =
            beneficiaryService.resolveRecipient({

                pay54Id:
                    linkedCardExecutionIntent.recipient

            });


        if(
            !canonicalBeneficiary
        ){

            canonicalBeneficiary =
                beneficiaryService.createBeneficiary({

                    contactId:
                        selectedContact?.id ||
                        null,

                    type:
                        "PAY54",

                    destinations: [

                        {

                            type:
                                "PAY54",

                            pay54Id:
                                linkedCardExecutionIntent.recipient,

                            currency:
                                commitPaymentCurrency,

                            metadata: {

                                source:
                                    selectedContact
                                        ? "contacts_picker"
                                        : "send_money"

                            }

                        }

                    ],

                    metadata: {

                        source:
                            "send_money",

                        relationship:
                            selectedContact
                                ? "contact"
                                : "manual",

                        currency:
                            commitPaymentCurrency

                    }

                });

        }

        else if(
            selectedContact?.id &&
            !canonicalBeneficiary.contactId &&
            typeof beneficiaryService.linkContact ===
                "function"
        ){

            canonicalBeneficiary =
                beneficiaryService.linkContact(

                    canonicalBeneficiary.id,

                    selectedContact.id

                );

        }


        if(
            canonicalBeneficiary?.id
        ){

            canonicalBeneficiary =
                beneficiaryService.recordUsage(

                    canonicalBeneficiary.id,

                    {

                        increment:
                            1,

                        lastUsedAt:
                            new Date()
                                .toISOString()

                    }

                );

        }

    }

}catch(
    beneficiaryError
){

    console.warn(

        "[PAY54_SEND] Linked-card beneficiary post-transaction enrichment failed.",

        beneficiaryError

    );

}


/* --------------------------------------------------------------------------
   LEGACY RECIPIENT COMPATIBILITY
-------------------------------------------------------------------------- */

try{

    const recipientTag =
        linkedCardExecutionIntent.recipient;


    const legacyRecipient =
        addRecipient({

            type:
                "pay54",

            tag:
                recipientTag,

            displayName:
                resolveContactName(
                    selectedContact
                ) ||
                recipientTag,

            currency:
                commitPaymentCurrency

        });


    if(
        legacyRecipient
    ){

        updateRecipientUsage(
            legacyRecipient.tag
        );


        publishRecipientAudit(

            "recipient.selected",

            {

                recipientId:
                    legacyRecipient.id,

                tag:
                    legacyRecipient.tag,

                contactId:
                    selectedContact?.id ||
                    null,

                beneficiaryId:
                    canonicalBeneficiary?.id ||
                    null,

                source:
                    selectedContact
                        ? "contacts_picker"
                        : "manual",

                fundingSource:
                    "linked_card",

                transactionId:
                    recordedTransaction.id

            }

        );

    }

}catch(
    legacyRecipientError
){

    console.warn(

        "[PAY54_SEND] Linked-card legacy recipient post-transaction enrichment failed.",

        legacyRecipientError

    );

}


/* --------------------------------------------------------------------------
   RECENT TRANSACTION / DASHBOARD REFRESH
-------------------------------------------------------------------------- */

try{

    prependTxToDOM(
        recordedTransaction
    );

    refreshUI();

}catch(
    refreshError
){

    console.warn(

        "[PAY54_SEND] Linked-card post-transaction UI refresh failed.",

        refreshError

    );

}


/* --------------------------------------------------------------------------
   RECEIPT
-------------------------------------------------------------------------- */

let receiptDisplayed =
    false;


try{

    const receipts =
        window.PAY54_RECEIPTS ||
        null;


    if(
        !receipts ||
        typeof receipts.openReceiptModal !==
            "function"
    ){

        throw new Error(
            "PAY54 receipt engine is unavailable."
        );

    }


    const linkedCardSource =
        fundingSourceRegistry.get(
            sourceId
        )?.source ||
        null;


    const linkedCardLabel =
        linkedCardSource
            ? getLinkedCardDisplayLabel(
                linkedCardSource
            )
            : "Linked card";


    receipts.openReceiptModal({

        title:
            "Send Money",

        tx:
            recordedTransaction,

        lines: [

            "Payment successful",

            `Recipient: ${
                linkedCardExecutionIntent.recipient
            }`,

            `Funding source: ${
                linkedCardLabel
            }`,

            `Amount: ${formatFundingBalance(
                commitPaymentCurrency,
                commitPaymentAmount
            )}`,

            `Provider reference: ${
                externalSettlementReference
            }`

        ]

    });


    receiptDisplayed =
        true;

}catch(
    receiptError
){

    console.error(

        "[PAY54_SEND] Linked-card receipt rendering failed after successful payment.",

        receiptError

    );


    window.PAY54_TOAST
    ?.showToast(
        "Payment completed successfully, but the receipt could not be displayed."
    );

}


/* --------------------------------------------------------------------------
   COMPLETION AUDIT
-------------------------------------------------------------------------- */

console.info(

    "[PAY54_SEND] WP-011B.6E.5G.5H linked-card Send completed.",

    {

        transactionId:
            recordedTransaction.id,

        replayed:
            transactionRecordResult.replayed ===
            true,

        sourceId,

        externalReference:
            externalSettlementReference,

        executionQuoteId,

        authorizationId,

        commitId,

        operationId:
            executionOperationId,

        paymentAmount:
            commitPaymentAmount,

        paymentCurrency:
            commitPaymentCurrency,

        fundingAmount:
            commitFundingAmount,

        fundingCurrency:
            commitFundingCurrency,

        externallySettled:
            true,

        walletMutationExecuted:
            false,

        beneficiaryUpdated:
            Boolean(
                canonicalBeneficiary?.id
            ),

        receiptDisplayed

    }

);


/* --------------------------------------------------------------------------
   DUPLICATE-SUBMISSION PROTECTION
-------------------------------------------------------------------------- */

/*
 * Release generic busy state.
 */

submitButton.disabled =
    false;

submitButton.removeAttribute(
    "aria-busy"
);


/*
 * Immediately re-lock linked-card submission.
 *
 * The provider commitment and canonical PAY54 transaction
 * already exist. A second submission must not be possible.
 */

setLinkedCardSendGuard(
    true
);


/* --------------------------------------------------------------------------
   SUCCESS NOTIFICATION
-------------------------------------------------------------------------- */

if(
    receiptDisplayed
){

    window.PAY54_TOAST
    ?.showToast(
        "Payment completed successfully."
    );

}


/*
 * Financial execution is already complete.
 *
 * DO NOT call:
 *
 * • PAY54_LEDGER.applyEntry()
 * • PAY54_TX.recordTransaction()
 * • PAY54_FUNDING_SERVICE.commit()
 * • PAY54_FUNDING_SERVICE.reverse()
 */

return;
                }catch(error){

                    /*
                     * Revalidation failure is fail-closed.
                     *
                     * No authorization/commit has occurred, therefore
                     * no reversal is required at this stage.
                     */

                    submitButton.disabled =
                        false;

                    submitButton.removeAttribute(
                        "aria-busy"
                    );


                    setLinkedCardSendGuard(
                        true
                    );


                    fundingStatus.textContent =
                        cleanFundingString(
                            error?.message
                        ) ||
                        "Linked-card funding could not be revalidated.";


                    console.error(
                        "[PAY54_SEND] WP-011B.6E.5G.5D post-PIN revalidation failed.",
                        error
                    );


                    window.PAY54_TOAST
                    ?.showToast(
                        "Linked-card funding could not be revalidated."
                    );


                    return;

                }

            }
        );


    }catch(error){

        setLinkedCardSendGuard(
            true
        );


        console.error(
            "[PAY54_SEND] Linked-card PIN verification failed to initialise.",
            error
        );


        window.PAY54_TOAST
        ?.showToast(
            "Payment verification is temporarily unavailable."
        );

    }


    /*
     * Critical:
     *
     * Linked-card funding must never fall through into the
     * existing wallet-only execution path below.
     */

    return;

}
                                        /*
                     * ----------------------------------------------------------
                     * EXPLICIT FUNDING VALIDATION
                     * ----------------------------------------------------------
                     *
                     * WP-011B.6E.2 does NOT use resolveSmartPayment().
                     *
                     * Send Money may debit only the wallet explicitly displayed
                     * to the customer.
                     *
                     * Balance is re-read immediately before PIN verification so
                     * the UI snapshot cannot be relied upon as financial state.
                     */

                   const ledger =
    safeLedger();

if(
    !ledger ||
    typeof ledger.getBalances !==
        "function" ||
    typeof ledger.getRates !==
        "function" ||
    typeof ledger.convert !==
        "function"
){

    window.PAY54_TOAST
    ?.showToast(
        "Wallet funding is temporarily unavailable."
    );

    return;

}

const selectedFundingCurrency =
    String(
        fundingSource.value || ""
    )
    .trim()
    .toUpperCase();

if(
    !/^[A-Z]{3}$/.test(
        selectedFundingCurrency
    )
){

    window.PAY54_TOAST
    ?.showToast(
        "Select a valid funding wallet."
    );

    fundingSource.focus();

    return;

}

/*
 * ----------------------------------------------------------
 * CANONICAL FUNDING QUOTE
 * ----------------------------------------------------------
 *
 * The quote is resolved through the verified wallet-funding
 * resolver introduced by WP-011B.6E.4B.
 *
 * Cross-currency funding is permitted only when PAY54 can
 * prove the currency pair exists in the canonical FX table.
 *
 * Unsupported pairs fail closed.
 */

const fundingQuote =
    resolveWalletFundingQuote({

        ledger,

        paymentCurrency:
            currency,

        fundingCurrency:
            selectedFundingCurrency,

        paymentAmount:
            amount

    });

if(
    !fundingQuote ||
    !fundingQuote.ok
){

    const reason =
        fundingQuote?.reason ||
        "FUNDING_UNAVAILABLE";

    if(
        reason ===
        "FX_PAIR_UNAVAILABLE"
    ){

        fundingStatus.textContent =
            `FX funding from ${selectedFundingCurrency} to ${currency} is currently unavailable.`;

        window.PAY54_TOAST
        ?.showToast(
            "This currency pair is currently unavailable."
        );

        fundingSource.focus();

        return;

    }

    if(
        reason ===
        "INSUFFICIENT_FUNDS"
    ){

        const requiredAmount =
            Number(
                fundingQuote?.sourceDebit
            );

        fundingStatus.textContent =
            Number.isFinite(
                requiredAmount
            )
                ? `Insufficient ${selectedFundingCurrency} wallet balance. Required: ${formatFundingBalance(
                    selectedFundingCurrency,
                    requiredAmount
                )}.`
                : `Insufficient ${selectedFundingCurrency} wallet balance.`;

        window.PAY54_TOAST
        ?.showToast(
            `Insufficient ${selectedFundingCurrency} wallet balance.`
        );

        amountInput.focus();

        return;

    }

    fundingStatus.textContent =
        "Funding quote is temporarily unavailable.";

    window.PAY54_TOAST
    ?.showToast(
        "We could not verify this funding source."
    );

    return;

}

fundingBalance.textContent =
    `Available: ${formatFundingBalance(
        selectedFundingCurrency,
        fundingQuote.sourceBalance
    )}`;

const funding = {

    source:
        "wallet",

    mode:
        fundingQuote.mode,

    currency:
        selectedFundingCurrency,

    paymentCurrency:
        currency,

    paymentAmount:
        amount,

    sourceDebit:
        fundingQuote.sourceDebit,

    fxRate:
        fundingQuote.fxRate,

    availableBalance:
        fundingQuote.sourceBalance,

    explicit:
        true

};

if(
    fundingQuote.mode ===
    "cross_currency"
){

    fundingStatus.textContent =
        `Funding confirmed: ${formatFundingBalance(
            currency,
            amount
        )} requires ${formatFundingBalance(
            selectedFundingCurrency,
            fundingQuote.sourceDebit
        )} from your ${selectedFundingCurrency} wallet.`;

}else{

    fundingStatus.textContent =
        `Funding confirmed from your ${selectedFundingCurrency} wallet.`;

}

                const restoreSubmitState =
    () => {

        sendVerificationInProgress =
            false;

        submitButton.disabled =
            false;

        submitButton.removeAttribute(
            "aria-disabled"
        );

        submitButton.removeAttribute(
            "aria-busy"
        );

    };
if(
    !acquireSendVerificationLock()
){

    return;

}
                    try{

                    requestPinVerification(

    () => {

        /*
         * PIN verification succeeded.
         * Hand control from the pre-PIN guard to the
         * wallet financial execution lifecycle.
         */

        sendVerificationInProgress =
            false;

        submitButton.disabled =
            true;

        submitButton.setAttribute(
            "aria-disabled",
            "true"
        );

        submitButton.setAttribute(
            "aria-busy",
            "true"
        );

        /*
         * ----------------------------------------------------------
         * TRANSACTION EXECUTION LOCK
         * ----------------------------------------------------------
         *
         * Lock Send only after successful PIN verification.
         *
         * This deliberately occurs inside the PIN callback so
         * cancelling or closing the PIN modal does not leave the
         * underlying Send Money form permanently disabled.
         */


        try{

            let tx;
           const executionLedger =
    safeLedger();

if(
    !executionLedger ||
    typeof executionLedger.getBalances !==
        "function" ||
    typeof executionLedger.getRates !==
        "function" ||
    typeof executionLedger.convert !==
        "function" ||
    typeof executionLedger.createEntry !==
        "function" ||
    typeof executionLedger.applyEntry !==
        "function"
){

    throw new Error(
        "Wallet ledger unavailable during transaction execution."
    );

}

/*
 * ----------------------------------------------------------
 * EXECUTION-TIME FUNDING REVALIDATION
 * ----------------------------------------------------------
 *
 * The quote displayed before PIN is informational only.
 *
 * After successful PIN verification PAY54 must obtain a fresh
 * balance and FX quote before any ledger mutation occurs.
 *
 * This protects the transaction from:
 *
 * • balance changes while PIN was open
 * • FX-rate changes while PIN was open
 * • unsupported/missing FX pairs
 * • stale pre-PIN funding state
 *
 * No ledger entry has been created at this point.
 */

const executionFunding =
    resolveWalletFundingQuote({

        ledger:
            executionLedger,

        paymentCurrency:
            currency,

        fundingCurrency:
            selectedFundingCurrency,

        paymentAmount:
            amount

    });

if(
    !executionFunding ||
    !executionFunding.ok
){

    const executionFailureReason =
        executionFunding?.reason ||
        "FUNDING_UNAVAILABLE";

    if(
        executionFailureReason ===
        "FX_PAIR_UNAVAILABLE"
    ){

        fundingStatus.textContent =
            `FX funding from ${selectedFundingCurrency} to ${currency} is no longer available.`;

        throw new Error(
            "FX pair unavailable at transaction execution."
        );

    }

    if(
        executionFailureReason ===
        "INSUFFICIENT_FUNDS"
    ){

        fundingStatus.textContent =
            `Insufficient ${selectedFundingCurrency} wallet balance.`;

        throw new Error(
            "Insufficient wallet balance at transaction execution."
        );

    }

    throw new Error(
        "Funding source could not be verified at transaction execution."
    );

}

const executionBalance =
    Number(
        executionFunding.sourceBalance
    );

const executionSourceDebit =
    Number(
        executionFunding.sourceDebit
    );

const executionFxRate =
    Number(
        executionFunding.fxRate
    );

/*
 * ----------------------------------------------------------
 * FINANCIAL VALUE INTEGRITY
 * ----------------------------------------------------------
 *
 * Fail closed if any value required for ledger posting is
 * malformed, zero, negative or non-finite.
 */

if(
    !Number.isFinite(
        executionBalance
    ) ||
    executionBalance < 0 ||
    !Number.isFinite(
        executionSourceDebit
    ) ||
    executionSourceDebit <= 0 ||
    !Number.isFinite(
        executionFxRate
    ) ||
    executionFxRate <= 0
){

    throw new Error(
        "Invalid funding state at transaction execution."
    );

}

/*
 * Defence in depth.
 *
 * resolveWalletFundingQuote() has already checked this, but
 * execution performs an explicit final balance comparison
 * before ledger entry construction.
 */

if(
    executionBalance <
    executionSourceDebit
){

    fundingStatus.textContent =
        `Insufficient ${selectedFundingCurrency} wallet balance.`;

    throw new Error(
        "Insufficient wallet balance at transaction execution."
    );

}

                                                                     const transactionMeta = {

    /*
     * ------------------------------------------------------
     * RECIPIENT CONTEXT
     * ------------------------------------------------------
     */

    recipient:
        user,

    note,

    /*
     * ------------------------------------------------------
     * FUNDING SOURCE
     * ------------------------------------------------------
     *
     * "wallet"
     *     Payment and funding currencies are identical.
     *
     * "wallet_fx"
     *     A different PAY54 wallet currency funds the
     *     payment through the canonical ledger FX engine.
     */

    funding_source:
        selectedFundingCurrency === currency
            ? "wallet"
            : "wallet_fx",

    funding_currency:
        selectedFundingCurrency,

    payment_currency:
        currency,

    /*
     * ------------------------------------------------------
     * FINANCIAL AMOUNTS
     * ------------------------------------------------------
     *
     * payment_amount
     *     Amount the recipient is being paid.
     *
     * funding_amount
     *     Actual amount debited from the selected source
     *     wallet.
     *
     * These values are deliberately separate for FX-funded
     * payments.
     */

    payment_amount:
        amount,

    funding_amount:
        executionSourceDebit,

    /*
     * ------------------------------------------------------
     * FUNDING CONTRACT
     * ------------------------------------------------------
     */

    funding_mode:
        selectedFundingCurrency === currency
            ? "explicit"
            : "explicit_fx",

    funding_contract:
        "WP-011B.6E.4B",

    /*
     * ------------------------------------------------------
     * FX AUDIT DATA
     * ------------------------------------------------------
     */

    fx_used:
        selectedFundingCurrency !== currency,

    fx_rate:
        executionFxRate,

    fx_route:
        executionFunding.fxRoute || "same_currency",

    /*
     * ------------------------------------------------------
     * COMPATIBILITY ALIASES
     * ------------------------------------------------------
     *
     * Preserve compatibility for existing PAY54 consumers
     * that may use camelCase transaction metadata.
     */

    fundingSource:
        selectedFundingCurrency === currency
            ? "wallet"
            : "wallet_fx",

    fundingCurrency:
        selectedFundingCurrency,

    paymentCurrency:
        currency,

    fundingMode:
        selectedFundingCurrency === currency
            ? "explicit"
            : "explicit_fx",

    fundingSourceVersion:
        "WP-011B.6E.4B"

};

                                    if(
                                        selectedContact?.id
                                    ){

                                        transactionMeta.contactId =
                                            selectedContact.id;

                                    }

                        /*
 * ==========================================================
 * PAY54 SEND — FX-AWARE SOURCE-WALLET LEDGER POSTING
 * WP-011B.6E.4B
 * ==========================================================
 *
 * Financial contract:
 *
 * • The selected funding wallet is the wallet being debited.
 * • Same-currency Send:
 *      source debit === payment amount.
 *
 * • Cross-currency Send:
 *      source debit === canonical execution-time FX quote.
 *
 * • The recipient payment amount/currency remains recorded
 *   separately in transaction metadata.
 *
 * • No synthetic destination-wallet FX credit is created.
 *
 * • The ledger remains the single source of truth for the
 *   actual wallet balance mutation.
 * ==========================================================
 */

const entry =
    executionLedger.createEntry({

        type:
            "send",

        title:
            `Sent to ${user}`,

        /*
         * The ledger entry MUST use the source wallet
         * currency because this is the wallet whose balance
         * is actually being reduced.
         */

        currency:
            selectedFundingCurrency,

        /*
         * executionSourceDebit was recalculated and
         * validated immediately before this posting.
         *
         * Ledger debits are represented as negative values.
         */

        amount:
            -executionSourceDebit,

        icon:
            "📤",

        meta:
            transactionMeta

    });

tx =
    executionLedger.applyEntry(
        entry
    );

if(
    !tx
){

    throw new Error(
        "Transaction engine did not return a transaction."
    );

}

                                                                        /*
                                     * ==========================================================
                                     * PAY54 SEND — POST-TRANSACTION RECIPIENT ENRICHMENT
                                     * WP-011B.6B
                                     * ==========================================================
                                     *
                                     * The ledger transaction has already completed successfully
                                     * before this point.
                                     *
                                     * Architectural ownership:
                                     *
                                     * Contacts
                                     *   -> canonical person / identity
                                     *
                                     * Beneficiaries
                                     *   -> canonical payment relationship / destination
                                     *
                                     * PAY54_RECIPIENT
                                     *   -> temporary legacy compatibility repository
                                     *
                                     * IMPORTANT:
                                     * Failure of Beneficiary or legacy-recipient enrichment MUST
                                     * NEVER convert a successful financial transaction into a
                                     * displayed payment failure.
                                     * ==========================================================
                                     */

                                    let canonicalBeneficiary =
                                        null;

                                    /*
                                     * ----------------------------------------------------------
                                     * CANONICAL BENEFICIARY SYNCHRONISATION
                                     * ----------------------------------------------------------
                                     *
                                     * Resolve the service at point-of-use because recipient.js
                                     * loads before services/beneficiaries.js in the current
                                     * progressive PAY54 boot sequence.
                                     */

                                    try{

                                        const beneficiaryService =
                                            window
                                                .PAY54_BENEFICIARIES_SERVICE ||
                                            null;

                                        if(
                                            beneficiaryService &&
                                            typeof beneficiaryService
                                                .resolveRecipient ===
                                                "function" &&
                                            typeof beneficiaryService
                                                .createBeneficiary ===
                                                "function" &&
                                            typeof beneficiaryService
                                                .recordUsage ===
                                                "function"
                                        ){

                                            canonicalBeneficiary =
                                                beneficiaryService
                                                    .resolveRecipient({
                                                        pay54Id:
                                                            user
                                                    });

                                            /*
                                             * Create the canonical Beneficiary only after
                                             * successful transaction posting.
                                             *
                                             * Manual PAY54 sends are valid Beneficiaries even
                                             * when there is no corresponding Contact.
                                             */

                                            if(
                                                !canonicalBeneficiary
                                            ){

                                                canonicalBeneficiary =
                                                    beneficiaryService
                                                        .createBeneficiary({

                                                            contactId:
                                                                selectedContact?.id ||
                                                                null,

                                                            type:
                                                                "PAY54",

                                                            destinations: [
                                                                {
                                                                    type:
                                                                        "PAY54",

                                                                    pay54Id:
                                                                        user,

                                                                    currency,

                                                                    metadata: {
                                                                        source:
                                                                            selectedContact
                                                                                ? "contacts_picker"
                                                                                : "send_money"
                                                                    }
                                                                }
                                                            ],

                                                            metadata: {
                                                                source:
                                                                    "send_money",

                                                                relationship:
                                                                    selectedContact
                                                                        ? "contact"
                                                                        : "manual",

                                                                currency
                                                            }

                                                        });

                                            }

                                            /*
                                             * A Beneficiary may already exist from a previous
                                             * manual payment and later become associated with a
                                             * canonical Contact.
                                             *
                                             * We only establish a missing relationship.
                                             * An existing contactId is never silently replaced.
                                             */

                                            else if(
                                                selectedContact?.id &&
                                                !canonicalBeneficiary
                                                    .contactId &&
                                                typeof beneficiaryService
                                                    .linkContact ===
                                                    "function"
                                            ){

                                                canonicalBeneficiary =
                                                    beneficiaryService
                                                        .linkContact(
                                                            canonicalBeneficiary
                                                                .id,
                                                            selectedContact
                                                                .id
                                                        );

                                            }

                                            /*
                                             * Record exactly one canonical usage increment for
                                             * this successful Send transaction.
                                             */

                                            if(
                                                canonicalBeneficiary?.id
                                            ){

                                                canonicalBeneficiary =
                                                    beneficiaryService
                                                        .recordUsage(
                                                            canonicalBeneficiary
                                                                .id,
                                                            {
                                                                increment:
                                                                    1,

                                                                lastUsedAt:
                                                                    new Date()
                                                                        .toISOString()
                                                            }
                                                        );

                                            }

                                        }

                                    }catch(
                                        beneficiaryError
                                    ){

                                        /*
                                         * Beneficiary persistence is post-transaction
                                         * enrichment.
                                         *
                                         * The financial transaction has already succeeded,
                                         * therefore this failure is deliberately isolated.
                                         */

                                        console.warn(
                                            "[PAY54_SEND] Beneficiary post-transaction enrichment failed.",
                                            beneficiaryError
                                        );

                                    }

                                    /*
                                     * ----------------------------------------------------------
                                     * LEGACY RECIPIENT COMPATIBILITY
                                     * ----------------------------------------------------------
                                     *
                                     * pay54_recipients remains operational while Recipient
                                     * Manager, Quick Send, favourites, groups, analytics and
                                     * other legacy consumers are progressively migrated.
                                     *
                                     * This is deliberately isolated from the canonical
                                     * Beneficiary operation above.
                                     */

                                    try{

                                        const legacyRecipient =
                                            addRecipient({

                                                type:
                                                    "pay54",

                                                tag:
                                                    user,

                                                displayName:
                                                    resolveContactName(
                                                        selectedContact
                                                    ) ||
                                                    user,

                                                currency

                                            });

                                        if(
                                            legacyRecipient
                                        ){

                                            updateRecipientUsage(
                                                legacyRecipient.tag
                                            );

                                            publishRecipientAudit(

                                                "recipient.selected",

                                                {
                                                    recipientId:
                                                        legacyRecipient.id,

                                                    tag:
                                                        legacyRecipient.tag,

                                                    contactId:
                                                        selectedContact?.id ||
                                                        null,

                                                    beneficiaryId:
                                                        canonicalBeneficiary?.id ||
                                                        null,

                                                    source:
                                                        selectedContact
                                                            ? "contacts_picker"
                                                            : "manual"
                                                }

                                            );

                                        }

                                    }catch(
                                        legacyRecipientError
                                    ){

                                        /*
                                         * The transaction has already succeeded.
                                         *
                                         * A compatibility-repository problem must therefore
                                         * never make PAY54 report the payment itself as failed.
                                         */

                                        console.warn(
                                            "[PAY54_SEND] Legacy recipient post-transaction enrichment failed.",
                                            legacyRecipientError
                                        );

                                    }

                                    prependTxToDOM(
                                        tx
                                    );

                                    refreshUI();

                                    showPaymentReceipt(
                                        tx,
                                        user,
                                        amount,
                                        currency
                                    );

                                    close();

                                }catch(error){

                                    restoreSubmitState();

                                    console.error(
                                        "[PAY54_SEND] Transaction failed.",
                                        error
                                    );

                                    window.PAY54_TOAST
                                    ?.showToast(
                                        "We could not complete this payment."
                                    );

                                }

                            }
                        );

                    }catch(error){

                        restoreSubmitState();

                        console.error(
                            "[PAY54_SEND] PIN verification failed to initialise.",
                            error
                        );

                        window.PAY54_TOAST
                        ?.showToast(
                            "Payment verification is temporarily unavailable."
                        );

                    }

                }
            );

            recipientInput.focus();

        }

    });

}
function openReceive(){

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

    const userTag = localStorage.getItem("pay54_name") || "pay54-user";
  const accountNo = "3001234567";

  openModal({
    title:"Receive Money",

bodyHTML: `

<div class="p54-receive-wrap">

  <div class="p54-label">
    Your PAY54 Tag
  </div>

  <div style="
    font-size:28px;
    font-weight:900;
    margin-top:6px;
  ">
    @Demi Olawoye
  </div>

  <div class="p54-label" style="margin-top:18px;">
    Account Number
  </div>

  <div style="
    font-size:32px;
    font-weight:900;
    margin-top:6px;
  ">
    3001234567
  </div>

  <div class="p54-receive-qr">
    <div id="receiveQR"></div>
  </div>

  <div class="p54-receive-actions">

    <button class="p54-btn" id="copyTag">
      Copy Tag
    </button>

    <button class="p54-btn" id="shareTag">
      Share
    </button>

    <button class="p54-btn primary" id="doneReceive">
      Done
    </button>

  </div>

</div>
`,

 onMount: ({modal, close}) => {

  const qrBox =
    modal.querySelector("#receiveQR");

  const payload =
    `PAY54|${userTag}|`;

  if(window.QRCode){

    new QRCode(qrBox,{
      text: payload,
      width: 200,
      height: 200
    });

  }else{

    qrBox.innerHTML = `
      <div class="p54-note">
        QR Engine unavailable
      </div>
    `;

  }

  modal
    .querySelector("#copyTag")
    .addEventListener("click",()=>{

      navigator.clipboard.writeText(
        `@${userTag}`
      );

      alert("Tag copied");

    });

  modal
    .querySelector("#shareTag")
    .addEventListener("click",()=>{

      const link =
        `${window.location.origin}/?pay=${encodeURIComponent(userTag)}`;

      window.open(
        `https://wa.me/?text=${encodeURIComponent(link)}`,
        "_blank"
      );

    });

 modal
  .querySelector("#doneReceive")
  .addEventListener("click", close);

} // end onMount

}); // end openModal

} // end openReceive
   /* =========================
   CHECKOUT FROM REQUEST
========================= */
function openCheckoutFromRequest(req){

  openModal({
    title: "PAY54 Smart Checkout",

    bodyHTML: `
      <div class="p54-note">Merchant Payment</div>

      <div class="p54-divider"></div>

      <div><b>Merchant:</b> ${req.merchant}</div>
      <div><b>Amount:</b> ${req.currency} ${req.amount}</div>
      <div><b>Ref:</b> ${req.ref}</div>

      <div class="p54-actions" style="margin-top:16px">
        <button class="p54-btn" id="cancel">Cancel</button>
        <button class="p54-btn primary" id="payNow">Pay Now</button>
      </div>
    `,

    onMount: ({modal, close})=>{

      modal.querySelector("#cancel").onclick = close;

      modal.querySelector("#payNow").onclick = ()=>{

        const currency = req.currency;
        const amount = req.amount;

        const funding = resolveSmartPayment(amount, currency);

        if(!funding){
          alert("Insufficient funds");
          return;
        }

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"checkout",
            title:`Paid ${req.merchant}`,
            currency,
            amount:-amount,
            icon:"🛒",
            meta:{ ref: req.ref }
          });

          processTransaction(entry,{
            showReceipt:true,
            title:"Checkout Payment"
          });

          PAY54_REQUESTS.markPaid(req.id);

          close();
          renderAlerts();

        });

      };

    }

  });

}
function openRequestMoney(){

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

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

  if(
    window.PAY54_MERCHANT_QR &&
    typeof window.PAY54_MERCHANT_QR.open === "function"
  ){

    return window.PAY54_MERCHANT_QR.open();

  }

  alert(
    "Merchant QR module unavailable"
  );

}
   /* =========================
   GLOBAL TRANSFER (FX ENGINE)
========================= */

function openGlobalTransfer(){

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

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

          const recipientType =
    modal.querySelector("#gtType").value;

let recipient;

if(recipientType === "pay54"){

    const tag =
        modal
        .querySelector("#gtRecipient input")
        .value
        .trim();

    recipient = addRecipient({

        type: "pay54",

        tag,

        displayName: tag,

        currency: toCurrency

    });

}
else{

    const inputs =
        modal.querySelectorAll(
            "#gtRecipient input"
        );

    recipient = addRecipient({

        type: "bank",

        accountName:
            inputs[0].value,

        accountNumber:
            inputs[1].value,

        bank:
            inputs[2].value,

        tag:
            inputs[1].value,

        displayName:
            inputs[0].value,

        currency:
            toCurrency

    });

}

if(recipient){

    updateRecipientUsage(
        recipient.tag
    );

    publishRecipientAudit(

        "recipient.selected",

        {

            recipientId:
                recipient.id,

            transferType:
                "global"

        }

    );

}
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

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

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

          const recipient = addRecipient({

    type: "bank",

    bank:

        modal.querySelector("#btBank").value,

    accountNumber:

        modal.querySelector("#btAcc").value,

    accountName:

        modal.querySelector("#btName").value,

    tag:

        modal.querySelector("#btAcc").value,

    displayName:

        modal.querySelector("#btName").value,

    currency

});

if(recipient){

    updateRecipientUsage(

        recipient.tag

    );

    publishRecipientAudit(

        "recipient.selected",

        {

            recipientId:
                recipient.id,

            type:
                "bank"

        }

    );

}
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

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

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

        if(type === "airtime"){
          dynamic.innerHTML = `
            <input class="p54-input" id="billPhone" placeholder="Phone Number" required>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button type="button" class="p54-btn amt" data-amt="500">₦500</button>
              <button type="button" class="p54-btn amt" data-amt="1000">₦1000</button>
            </div>

            <input class="p54-input" id="billAmount" placeholder="Custom amount">
          `;

          dynamic.querySelectorAll(".amt").forEach(btn=>{
            btn.addEventListener("click",()=>{
              dynamic.querySelector("#billAmount").value = btn.dataset.amt;
            });
          });
        }

        if(type === "data"){
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Phone Number" required>
            <input class="p54-input" id="billAmount" placeholder="Amount">
          `;
        }

        if(type === "electricity"){
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Meter Number" required>
            <input class="p54-input" id="billAmount" placeholder="Amount">
          `;
        }

        if(type === "tv"){
          dynamic.innerHTML = `
            <input class="p54-input" placeholder="Smart Card Number" required>
            <input class="p54-input" id="billAmount" placeholder="Amount">
          `;
        }
      }

      // ✅ THIS MUST BE HERE (INSIDE onMount)
      render("airtime");

      typeEl.addEventListener("change",(e)=>{
        render(e.target.value);
      });

      modal.querySelector("#cancelBill").onclick = close;

      modal.querySelector("#billForm").onsubmit = (e)=>{
        e.preventDefault();

        const amount = Number(modal.querySelector("#billAmount")?.value);
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

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

    const goals =JSON.parse(localStorage.getItem(LS.GOALS) || "[]");

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

  const goals = JSON.parse(
    localStorage.getItem(LS.GOALS) || "[]"
  );

  const goal = goals.find(g => g.name === goalName);

  if(!goal){
    alert("Goal not found");
    return;
  }

  openModal({

    title: goal.name,

    bodyHTML: `

      <div class="p54-note">
        Savings Goal Details
      </div>

      <div class="p54-divider"></div>

      <div class="p54-ledger-item">
        <div>
          <div class="p54-ledger-title">
            ${goal.name}
          </div>

          <div class="p54-small">
            Saved: ₦${goal.saved}
          </div>

          <div class="p54-small">
            Target: ₦${goal.target}
          </div>
        </div>
      </div>

      <div class="p54-actions">
        <button class="p54-btn primary" id="closeGoal">
          Close
        </button>
      </div>

    `,

    onMount: ({modal, close}) => {

      modal
        .querySelector("#closeGoal")
        .addEventListener("click", close);

    }

  });

}

/* =========================
   PLACEHOLDER SERVICES
========================= */

function openCards(){
  comingSoon("Cards");
}

function openCheckout(){
  comingSoon("Smart Checkout");
}

function openShop(){
  comingSoon("Shop & Go");
}

function openTrading(){
  comingSoon("Trading");
}

function openBetFunding(){

    if(

        SESSION &&

        typeof SESSION.isAuthenticated === "function"

    ){

        if(

            !SESSION.isAuthenticated()

        ){

            window.PAY54_TOAST
            ?.showToast(

                "Your session has expired."

            );

            return;

        }

    }

    openModal({

    title:"Bet Funding",

    bodyHTML:`

      <form
        class="p54-form"
        id="betForm"
      >

        <div>

          <div class="p54-label">
            Betting Platform
          </div>

          <select
            class="p54-select"
            id="betProvider"
          >
            <option>Bet365</option>
            <option>Betway</option>
            <option>SportyBet</option>
            <option>1xBet</option>
            <option>William Hill</option>
            <option>BetKing</option>
          </select>

        </div>

        <div>

          <div class="p54-label">
            Account Username
          </div>

          <input
            class="p54-input"
            id="betUser"
            placeholder="Bet Account Username"
            required
          >

        </div>

        <div>

          <div class="p54-label">
            Amount
          </div>

          <input
            class="p54-input"
            id="betAmount"
            type="number"
            placeholder="0.00"
            required
          >

        </div>

        <div
          class="p54-note"
          style="margin-top:12px"
        >
          🔞 18+ Only. Please gamble responsibly.
        </div>

        <div class="p54-actions">

          <button
            class="p54-btn"
            type="button"
            id="cancelBet"
          >
            Cancel
          </button>

          <button
            class="p54-btn primary"
            type="submit"
          >
            Fund Account
          </button>

        </div>

      </form>

    `,

    onMount:({modal,close})=>{

      modal
        .querySelector("#cancelBet")
        .addEventListener(
          "click",
          close
        );

      modal
        .querySelector("#betForm")
        .addEventListener(
          "submit",
          (e)=>{

            e.preventDefault();

            const provider =
              modal.querySelector("#betProvider").value;

            const username =
              modal.querySelector("#betUser").value.trim();

            const amount =
              Number(
                modal.querySelector("#betAmount").value
              );

            if(
              !username ||
              !amount ||
              amount <= 0
            ){
              alert("Enter valid details");
              return;
            }

            const currency =
              getSelectedCurrency();

            requestPinVerification(()=>{

              const entry =
                LEDGER.createEntry({

                  type:"bet",

                  title:`Bet Funding • ${provider}`,

                  currency,

                  amount:-amount,

                  icon:"🎲",

                  meta:{
                    provider,
                    username
                  }

                });

              processTransaction(
                entry,
                {
                  showReceipt:true,
                  title:"Bet Funding"
                }
              );

              close();

            });

          }
        );

    }

  });

}

function openAgent(){
  comingSoon("Become an Agent");
}

function openRisk(){

  const ledger = safeLedger();

  const txs =
    ledger?.getTx?.() || [];

  const recentCount =
    txs.filter(tx => {

      const date =
        new Date(
          tx.created_at ||
          tx.created ||
          Date.now()
        );

      const hours =
        (Date.now() - date.getTime()) /
        3600000;

      return hours <= 24;

    }).length;

  let riskLevel = "LOW";
  let riskIcon = "🟢";
  let advice = "No unusual activity detected.";

  if(recentCount > 10){

    riskLevel = "MEDIUM";
    riskIcon = "🟡";
    advice =
      "Higher than normal activity detected.";

  }

  if(recentCount > 20){

    riskLevel = "HIGH";
    riskIcon = "🔴";
    advice =
      "Multiple rapid transactions detected.";

  }

  openModal({

    title:"AI Risk Watch",

    bodyHTML:`

      <div class="p54-note">

        PAY54 AI Security Monitor

      </div>

      <div class="p54-divider"></div>

      <div class="feed-item">

        <div class="feed-icon">
          ${riskIcon}
        </div>

        <div class="feed-main">

          <div class="feed-title">
            Risk Level
          </div>

          <div class="feed-sub">
            ${riskLevel}
          </div>

        </div>

      </div>

      <div class="feed-item">

        <div class="feed-icon">
          📊
        </div>

        <div class="feed-main">

          <div class="feed-title">
            Transactions (24h)
          </div>

          <div class="feed-sub">
            ${recentCount}
          </div>

        </div>

      </div>

      <div class="feed-item">

        <div class="feed-icon">
          🤖
        </div>

        <div class="feed-main">

          <div class="feed-title">
            AI Recommendation
          </div>

          <div class="feed-sub">
            ${advice}
          </div>

        </div>

      </div>

      <div class="feed-item">

        <div class="feed-icon">
          🛡️
        </div>

        <div class="feed-main">

          <div class="feed-title">
            Device Security
          </div>

          <div class="feed-sub">
            Trusted Device
          </div>

        </div>

      </div>

      <div class="p54-actions">

        <button
          class="p54-btn primary"
          id="closeRisk"
        >
          Close
        </button>

      </div>

    `,

    onMount:({modal,close})=>{

      modal
        .querySelector("#closeRisk")
        .addEventListener(
          "click",
          close
        );

    }

  });

}

/* =========================
   BALANCE CARD BUTTONS
========================= */

document.addEventListener("DOMContentLoaded", () => {

  const addBtn =
    document.getElementById("addMoneyBtn");

  if(addBtn){

    addBtn.addEventListener("click", () => {

      if(window.PAY54_UI?.openAddMoney){
        window.PAY54_UI.openAddMoney();
      }

    });

  }

  const withdrawBtn =
    document.getElementById("withdrawBtn");

  if(withdrawBtn){

    withdrawBtn.addEventListener("click", () => {

      if(window.PAY54_UI?.openWithdraw){
        window.PAY54_UI.openWithdraw();
      }

    });

  }

});
/* ==========================================================
   RECIPIENT HEALTH
========================================================== */

function getRecipientHealth(){

    return {

        sessionManager:
            !!SESSION,

        bootstrap:
            !!SECURITY_BOOTSTRAP,

        transactionGuard:
            !!TRANSACTION_GUARD,

        eventBus:
    !!window.PAY54_EVENTS,

        ledger:
            !!window.PAY54_LEDGER,

       validationEngine:

    typeof validateRecipient ===
    "function",

       duplicateEngine:

    typeof isDuplicateRecipient ===
    "function",

recipientCount:

    getRecipients().length,

favourites:

    getFavouriteRecipients().length,

trusted:

    getTrustedRecipients().length,

groups:

    getRecipientGroups().length,

       importEngine:

    typeof importRecipients ===
    "function",

exportEngine:

    typeof exportRecipients ===
    "function",
       synchronisationEngine:

    typeof synchroniseRecipients ===
    "function",
       intelligenceEngine:

    typeof calculateRecipientScore ===
    "function",

rankingEngine:

    typeof getRecipientRanking ===
    "function",

insightsEngine:

    typeof getRecipientInsights ===
    "function",
analyticsEngine:

    typeof getRecipientAnalytics ===
    "function",
    riskEngine:

    typeof calculateRecipientRisk ===
    "function",

riskSummaryEngine:

    typeof getRecipientBehaviourSummary ===
    "function",

recipientActionsUI:

typeof handleRecipientAction ===
"function",

duplicateRecipient:

typeof duplicateRecipient ===
"function",

copyRecipient:

typeof copyRecipient ===
"function",

shareRecipient:

typeof shareRecipient ===
"function",

bulkSelection:

typeof getSelectedRecipients ===
"function",

bulkFavourite:

typeof bulkFavouriteRecipients ===
"function",

bulkTrusted:

typeof bulkTrustedRecipients ===
"function",

bulkDelete:

typeof bulkDeleteRecipients ===
"function",

recipientDashboard:

typeof renderRecipientDashboard ===
"function",

quickSendRecipient:

typeof quickSendRecipient ===
"function"

};

}

window.PAY54_RECIPIENT = {

    /* Repository */

    getRecipients,

    saveRecipients,

   exportRecipients,

exportRecipientsAsJson,

importRecipients,

    addRecipient,

   validateRecipient,

   normaliseRecipient,

isDuplicateRecipient,

    findRecipient,

    updateRecipient,

    deleteRecipient,

    updateRecipientUsage,

    /* Favourite */

    toggleFavourite,

    getFavouriteRecipients,

    /* Trusted */

    toggleTrusted,

    getTrustedRecipients,

    /* Statistics */

getRecentRecipients,

getMostUsedRecipients,

getSuggestedRecipients,
/* Search */

searchRecipients,

searchFavouriteRecipients,

searchTrustedRecipients,

searchRecentRecipients,
   /* Groups */

assignRecipientGroup,

removeRecipientGroup,

getRecipientGroups,

getRecipientsByGroup,

   synchroniseRecipients,

   calculateRecipientScore,

getRecipientRanking,

getInactiveRecipients,

getTopRecipient,

getRecipientInsights,

   quickSendRecipient,

   renderDashboard:
    renderRecipientDashboard,
  
   getRecipientAnalytics,

   calculateRecipientRisk,

getRecipientRiskLevel,

getHighRiskRecipients,

getLowRiskRecipients,

getRecipientBehaviourSummary,
    /* Diagnostics */

    health:

        getRecipientHealth

};
/* ==========================================================
   RECIPIENT UI
========================================================== */
window.PAY54_RECIPIENT_UI = {

    open:
        openRecipientManager

};
/* ==========================================================
   ENTERPRISE RECIPIENT MANAGER UI
========================================================== */

function openRecipientManager(){

    const recipients =
        getRecipients();

    openModal({

        title:
            "Recipient Manager",

        bodyHTML: `

<div class="p54-recipient-manager">

<div class="p54-row">

<input
class="p54-input"
id="recipientSearch"
placeholder="Search recipients">

<button
class="p54-btn"
id="recipientRefresh">
Refresh
</button>

<button
class="p54-btn"
id="recipientSelectAll">
Select All
</button>

</div>

<div
id="recipientStatistics"
class="p54-recipient-summary">
</div>

<div
id="recipientList"
class="p54-recipient-list">
</div>

<div class="p54-actions">

<button
class="p54-btn"
id="bulkFavourite">
Favourite Selected
</button>

<button
class="p54-btn"
id="bulkTrusted">
Trust Selected
</button>

<button
class="p54-btn"
id="bulkDelete">
Delete Selected
</button>

<button
class="p54-btn"
id="recipientClose">
Close
</button>

</div>

</div>

        `,

        onMount:({

            modal,

            close

        })=>{

            renderRecipientManager(

                modal,

                recipients

            );
           modal
.querySelector(
    "#recipientSearch"
)
.addEventListener(
    "input",
    e=>{

        const results =
            searchRecipients(
                e.target.value
            );

        renderRecipientManager(

            modal,

            results

        );

    }
);
 modal
.querySelector(
    "#recipientRefresh"
)
.addEventListener(
    "click",
    ()=>{

        renderRecipientManager(

            modal,

            getRecipients()

        );

    }
);  
       modal
.querySelector("#recipientSelectAll")
.addEventListener("click",()=>{

modal
.querySelectorAll(".recipient-selector")
.forEach(box=>{

box.checked = true;

});

});

modal
.querySelector("#bulkFavourite")
.addEventListener("click",bulkFavouriteRecipients);

modal
.querySelector("#bulkTrusted")
.addEventListener("click",bulkTrustedRecipients);

modal
.querySelector("#bulkDelete")
.addEventListener("click",bulkDeleteRecipients);    
                       modal
            .querySelector(
                "#recipientClose"
            )
            .addEventListener(
                "click",
                close
            );

        }

    });

}

function renderRecipientManager(
    modal,
    recipients
){const stats =
    modal.querySelector(
        "#recipientStatistics"
    );

const list =
    modal.querySelector(
        "#recipientList"
    );
  const analytics =
    getRecipientAnalytics();

stats.innerHTML = `

<div class="p54-grid-4">

<div>

<b>${analytics.totalRecipients}</b>

<div>Total</div>

</div>

<div>

<b>${analytics.favouriteRecipients}</b>

<div>Favourites</div>

</div>

<div>

<b>${analytics.trustedRecipients}</b>

<div>Trusted</div>

</div>

<div>

<b>${analytics.inactiveRecipients}</b>

<div>Inactive</div>

</div>

</div>

`;
 list.innerHTML =
recipients.map(recipient=>`

<div
class="p54-recipient-card"
data-id="${recipient.id}">

<input
type="checkbox"
class="recipient-selector"
value="${recipient.id}">

<div class="recipient-header">

<div>

<div class="recipient-name">

${recipient.displayName}

</div>

<div class="recipient-tag">

${recipient.tag || recipient.accountNumber}

</div>

</div>

<div>

${recipient.favourite ? "⭐" : ""}

${recipient.trusted ? "🛡️" : ""}

</div>

</div>

<div class="recipient-actions">

<button
class="p54-btn sm"
data-action="view"
data-id="${recipient.id}">
View
</button>

<button
class="p54-btn sm"
data-action="edit"
data-id="${recipient.id}">
Edit
</button>

<button
class="p54-btn sm"
data-action="fav"
data-id="${recipient.id}">
Favourite
</button>

<button
class="p54-btn sm"
data-action="trust"
data-id="${recipient.id}">
Trusted
</button>

<button
class="p54-btn sm"
data-action="groups"
data-id="${recipient.id}">
Groups
</button>

<button
class="p54-btn sm"
data-action="analytics"
data-id="${recipient.id}">
Analytics
</button>

<button
class="p54-btn sm"
data-action="risk"
data-id="${recipient.id}">
Risk
</button>

<button
class="p54-btn sm"
data-action="duplicate"
data-id="${recipient.id}">
Duplicate
</button>

<button
class="p54-btn sm"
data-action="share"
data-id="${recipient.id}">
Share
</button>

<button
class="p54-btn sm"
data-action="copy"
data-id="${recipient.id}">
Copy
</button>

<button
class="p54-btn sm danger"
data-action="delete"
data-id="${recipient.id}">
Delete
</button>

</div>

</div>

`).join("");
list
.querySelectorAll(
"[data-action]"
)
.forEach(button=>{

button.addEventListener(
"click",

()=>{

const id =
button.dataset.id;

const action =
button.dataset.action;

handleRecipientAction(
action,
id
);

}

);

});
   }
function handleRecipientAction(
action,
recipientId
){

switch(action){

case "view":
viewRecipient(recipientId);
break;

case "edit":
editRecipient(recipientId);
break;

case "fav":
toggleFavourite(recipientId);
renderRecipientManager(
document.querySelector(".p54-modal"),
getRecipients()
);
break;

case "trust":
toggleTrusted(recipientId);
renderRecipientManager(
document.querySelector(".p54-modal"),
getRecipients()
);
break;

case "groups":
manageRecipientGroups(recipientId);
break;

case "analytics":
showRecipientAnalytics(recipientId);
break;

case "risk":
showRecipientRisk(recipientId);
break;

case "duplicate":

duplicateRecipient(recipientId);

renderRecipientManager(
document.querySelector(".p54-modal"),
getRecipients()
);

break;

case "share":

shareRecipient(recipientId);

break;

case "copy":

copyRecipient(recipientId);

break;      
case "delete":

if(confirm(
"Delete this recipient?"
)){

deleteRecipient(recipientId);

renderRecipientManager(
document.querySelector(".p54-modal"),
getRecipients()
);

}

break;

}

}
function getSelectedRecipients(){

return [

...document.querySelectorAll(

".recipient-selector:checked"

)

].map(

box=>box.value

);

}
function bulkFavouriteRecipients(){

getSelectedRecipients()

.forEach(toggleFavourite);

renderRecipientManager(

document.querySelector(".p54-modal"),

getRecipients()

);

}

function bulkTrustedRecipients(){

getSelectedRecipients()

.forEach(toggleTrusted);

renderRecipientManager(

document.querySelector(".p54-modal"),

getRecipients()

);

}

function bulkDeleteRecipients(){

if(

!confirm(

"Delete selected recipients?"

)

){

return;

}

getSelectedRecipients()

.forEach(deleteRecipient);

renderRecipientManager(

document.querySelector(".p54-modal"),

getRecipients()

);

}

function viewRecipient(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }
    openModal({

        title: "Recipient Details",

        bodyHTML: `

<div class="p54-recipient-details">

<div class="p54-ledger-item">

<div>

<div class="p54-ledger-title">
${recipient.displayName}
</div>

<div class="p54-small">
${recipient.tag || ""}
</div>

</div>

</div>

<div class="p54-divider"></div>

<p><b>Type:</b> ${recipient.type}</p>

<p><b>Bank:</b> ${recipient.bank || "-"}</p>

<p><b>Account:</b> ${recipient.accountNumber || "-"}</p>

<p><b>Currency:</b> ${recipient.currency || "-"}</p>

<p><b>Favourite:</b> ${recipient.favourite ? "Yes" : "No"}</p>

<p><b>Trusted:</b> ${recipient.trusted ? "Yes" : "No"}</p>

<p><b>Transfers:</b> ${recipient.transferCount}</p>

<p><b>Last Used:</b> ${recipient.lastUsed || "Never"}</p>

<div class="p54-actions">

<button
class="p54-btn primary"
id="recipientClose">

Close

</button>

</div>

</div>

`,

        onMount:({modal,close})=>{

            modal
            .querySelector("#recipientClose")
            .addEventListener("click",close);

        }

    });

}

function editRecipient(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    openModal({

        title:"Edit Recipient",

        bodyHTML:`

<form
class="p54-form"
id="recipientEditForm">

<input
class="p54-input"
id="editDisplayName"
value="${recipient.displayName}">

<input
class="p54-input"
id="editBank"
value="${recipient.bank || ""}">

<input
class="p54-input"
id="editAccountName"
value="${recipient.accountName || ""}">

<div class="p54-actions">

<button
class="p54-btn"
type="button"
id="cancelRecipientEdit">

Cancel

</button>

<button
class="p54-btn primary">

Save

</button>

</div>

</form>

`,

        onMount:({modal,close})=>{

            modal
            .querySelector("#cancelRecipientEdit")
            .addEventListener("click",close);

            modal
            .querySelector("#recipientEditForm")
            .addEventListener("submit",(e)=>{

                e.preventDefault();

                updateRecipient(

                    recipient.id,

                    {

                        displayName:

                        modal.querySelector("#editDisplayName").value,

                        bank:

                        modal.querySelector("#editBank").value,

                        accountName:

                        modal.querySelector("#editAccountName").value

                    }

                );

                renderRecipientManager(

                    document.querySelector(".p54-modal"),

                    getRecipients()

                );

                close();

            });

        }

    });

}

function manageRecipientGroups(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    const current = (recipient.groups || []).join(", ");

    const groups = prompt(

        "Recipient Groups (comma separated)",

        current

    );

    if(groups === null){
        return;
    }

    updateRecipient(

        recipient.id,

        {

            groups:

            groups

            .split(",")

            .map(

                g=>g.trim()

            )

            .filter(Boolean)

        }

    );

    renderRecipientManager(

        document.querySelector(".p54-modal"),

        getRecipients()

    );

}

function showRecipientAnalytics(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    openModal({

        title:"Recipient Analytics",

        bodyHTML:`

<p><b>Transfer Count:</b>

${recipient.transferCount}

</p>

<p><b>Ranking Score:</b>

${calculateRecipientScore(recipient)}

</p>

<p><b>Favourite:</b>

${recipient.favourite ? "Yes":"No"}

</p>

<p><b>Trusted:</b>

${recipient.trusted ? "Yes":"No"}

</p>

<div class="p54-actions">

<button
class="p54-btn primary"
id="closeAnalytics">

Close

</button>

</div>

`,

        onMount:({modal,close})=>{

            modal
            .querySelector("#closeAnalytics")
            .addEventListener("click",close);

        }

       });

}

function showRecipientRisk(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    openModal({

        title:"Recipient Risk",

        bodyHTML:`

<p>

<b>Risk Level:</b>

${getRecipientRiskLevel(recipient)}

</p>

<p>

<b>Risk Score:</b>

${calculateRecipientRisk(recipient)}

</p>

<p>

<b>Last Used:</b>

${recipient.lastUsed || "Never"}

</p>

<div class="p54-actions">

<button
class="p54-btn primary"
id="closeRiskRecipient">

Close

</button>

</div>

`,

        onMount:({modal,close})=>{

            modal
            .querySelector("#closeRiskRecipient")
            .addEventListener("click",close);

        }

        });

}
function duplicateRecipient(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    const copy = {

        ...recipient,

        id: undefined,

        displayName:
            recipient.displayName + " Copy"

    };

    delete copy.id;
    delete copy.created;
    delete copy.updated;

    addRecipient(copy);

}
function copyRecipient(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    const text = recipient.type === "pay54"

        ? recipient.tag

        : recipient.accountNumber;

    navigator.clipboard.writeText(text);

    alert("Recipient copied.");

}
function shareRecipient(id){

    const recipient = findRecipient(id);

    if(!recipient){
        return;
    }

    const text =

`${recipient.displayName}
${recipient.bank || ""}
${recipient.accountNumber || ""}
${recipient.tag || ""}`;

    if(navigator.share){

        navigator.share({

            title:"Recipient",

            text

        });

        return;

    }

    navigator.clipboard.writeText(text);

    alert("Recipient details copied.");

}
function renderRecipientDashboard(){

    const widget =
        document.getElementById(
            "recipientDashboardWidget"
        );

    if(!widget){
        return;
    }

    const favourites =
        getFavouriteRecipients().slice(0,5);

    const recent =
        getRecentRecipients(5);

    const top =
        getTopRecipient();

    widget.innerHTML = `

<div class="p54-widget">

<h3>Recipients</h3>

<p><b>Total:</b> ${getRecipients().length}</p>

<p><b>Favourite:</b> ${favourites.length}</p>

<p><b>Recent:</b> ${recent.length}</p>

${
top
?
`<p><b>Top:</b> ${top.displayName}</p>`
:
""
}

<div class="p54-divider"></div>

${

favourites.map(r=>`

<button
class="p54-btn sm"
data-recipient="${r.id}">

${r.displayName}

</button>

`).join("")

}

</div>

`;

    widget

    .querySelectorAll(
        "[data-recipient]"
    )

    .forEach(button=>{

        button.addEventListener(

            "click",

            ()=>{

                quickSendRecipient(

                    button.dataset.recipient

                );

            }

        );

    });

}
function quickSendRecipient(id){

    const recipient =
        findRecipient(id);

    if(!recipient){
        return;
    }

    openSendUnified();

    setTimeout(()=>{

        const input =

        document.getElementById(
            "sendUser"
        );

        if(input){

            input.value =

                recipient.tag ||

                recipient.accountNumber ||

                "";

        }

    },200);

}
/* =========================
   PAY54 UI EXPORT ENGINE
========================= */

window.PAY54_UI =
window.PAY54_UI || {};

Object.assign(
    window.PAY54_UI,
    {

        openSend:
            openSendUnified,

        openReceive,

        openScanAndPay,

        openAddMoney,

        openWithdraw,

        openBankTransfer,

        openGlobalTransfer,

        openBills,

        openSavings,

        openCards,

        openCheckout,

        openShop,

        openMerchantQR,

        openRequestMoney,

        openTrading,

        openBetFunding,

        openAgent,

       openRisk,

openLedger,

openRecipientManager

    }
);
/* ==========================================================
   SECURITY BOOTSTRAP VERIFICATION
========================================================== */

if(

    SECURITY_BOOTSTRAP &&

    typeof SECURITY_BOOTSTRAP.verify === "function"

){

    SECURITY_BOOTSTRAP.verify(

        "recipient"

    );

}
console.log("✅ PAY54 UI ENGINE READY");
