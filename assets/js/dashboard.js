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

 let LEDGER;
let RECIP;
let RCPT;

function waitForModules(callback){

  const check = () => {

    if (
      window.PAY54_LEDGER &&
      window.PAY54_RECIPIENT &&
      window.PAY54_RECEIPTS
    ){

      LEDGER = window.PAY54_LEDGER;
      RECIP = window.PAY54_RECIPIENT;
      RCPT = window.PAY54_RECEIPTS;

      callback();
      return;
    }

    setTimeout(check,50);
  };

  check();
}

  const LS = {
    THEME: "pay54_theme",
    CURRENCY: "pay54_currency",
    NAME: "pay54_name",
    EMAIL: "pay54_email",
    ALERTS: "pay54_alerts",
    SEED: "pay54_seed_v81"
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
  outline:none;
  -webkit-appearance:none;
  appearance:none;
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
      document.removeEventListener("keydown", escClose);
    }
    function escClose(e) { if (e.key === "Escape") close(); }

    backdrop.querySelector(".p54-x").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", escClose);

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

  function getSelectedCurrency() {
    return localStorage.getItem(LS.CURRENCY) || "NGN";
  }

  function getConvertedTotal(targetCur) {
    const balances = LEDGER.getBalances();
    let total = 0;
    Object.keys(balances).forEach((c) => {
      const amt = Number(balances[c] ?? 0);
      if (!amt) return;
      total += (c === targetCur) ? amt : Number(LEDGER.convert(c, targetCur, amt) || 0);
    });
    return total;
  }

  function setActiveCurrency(cur) {
    pillBtns.forEach((b) => {
      const isActive = b.dataset.cur === cur;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    if (currencySelect) currencySelect.value = cur;
    localStorage.setItem(LS.CURRENCY, cur);
    LEDGER.setBaseCurrency(cur);

    if (balanceEl) {
      const total = getConvertedTotal(cur);
      balanceEl.textContent = LEDGER.moneyFmt(cur, total);
    }
  }

  pillBtns.forEach((btn) => btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur)));
  if (currencySelect) currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));

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

  function seedDemoIfEmpty() {
    if (localStorage.getItem(LS.SEED) === "1") return;

    const balances = LEDGER.getBalances() || {};
    const txs = LEDGER.getTx ? (LEDGER.getTx() || []) : [];

    const allZero = Object.values(balances).every(v => Number(v || 0) === 0);

    if (txs.length === 0 && allZero) {
      const entry = LEDGER.createEntry({
        type: "seed",
        title: "Initial wallet funding",
        currency: "NGN",
        amount: 70284035,
        icon: "💰",
        meta: { note: "v8.1 demo seed" }
      });
      LEDGER.applyEntry(entry);
    }

    localStorage.setItem(LS.SEED, "1");
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

  function prependTxToDOM(tx) {
    const txFeed = recentTxFeedEl();
    if (!txFeed) return;

    const amtClass = tx.amount >= 0 ? "pos" : "neg";
    const sign = tx.amount >= 0 ? "+" : "−";

    const base = tx.base_currency || getSelectedCurrency();
    const equivLine = (tx.currency !== base && tx.base_equiv != null)
      ? `<div class="feed-sub">≈ ${LEDGER.moneyFmt(base, tx.base_equiv)} • rate ${(tx.fx_rate_used || 0).toFixed(4)}</div>`
      : `<div class="feed-sub">${nowLabel()}</div>`;

    const item = document.createElement("div");
    item.className = "feed-item";
    item.innerHTML = `
      <div class="feed-icon">${tx.icon || "💳"}</div>
      <div class="feed-main">
        <div class="feed-title">${tx.title}</div>
        ${equivLine}
      </div>
      <div class="feed-amt ${amtClass}">${sign} ${LEDGER.moneyFmt(tx.currency, Math.abs(tx.amount))}</div>
    `;

    txFeed.prepend(item);

    const items = txFeed.querySelectorAll(".feed-item");
    if (items.length > 5) items[items.length - 1].remove();
  }

  function renderRecentTransactions() {
    const txFeed = recentTxFeedEl();
    if (!txFeed) return;

    const txs = (LEDGER.getTx() || []).slice(-5).reverse();
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
    txs.forEach(tx => prependTxToDOM(tx));
  }

  /* ---------------------------
     Core Modals (minimal stable)
  --------------------------- */

  function refreshUI() {
  requestAnimationFrame(() => {
    setActiveCurrency(getSelectedCurrency());
    renderRecentTransactions();
  });
}

  function addEntryAndRefresh(entry) {
    const tx = LEDGER.applyEntry(entry);
    refreshUI();
    return tx;
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
          <input class="p54-input" id="spAmount" type="number" min="0" placeholder="0.00" required />
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
      const qrRegionId = "qr-reader";

      function stopCamera() {
        if (html5QrCode) {
          html5QrCode.stop().catch(()=>{});
        }
      }

      /* QR Scan Success */
      function onScanSuccess(decodedText) {

        try {

          const parts = decodedText.split("|");

          if (parts[0] === "PAY54") {

            merchantEl.value = parts[1] || "";

            if (parts[2]) {
              amountEl.value = parts[2];
            }

          } else {
            merchantEl.value = decodedText;
          }

        } catch {
          merchantEl.value = decodedText;
        }

        stopCamera();
      }

      /* Start Camera */

      if (window.Html5Qrcode) {

        html5QrCode = new Html5Qrcode(qrRegionId);

        Html5Qrcode.getCameras()
          .then(devices => {

            if (!devices || !devices.length) {
              console.warn("No camera detected");
              return;
            }

            html5QrCode.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              onScanSuccess
            );

          })
          .catch(err => console.warn("Camera error:", err));
      }

      cancelBtn.addEventListener("click", () => {
        stopCamera();
        close();
      });

      /* SUBMIT PAYMENT */
form.addEventListener("submit", (e) => {

  e.preventDefault();

  const payBtn = form.querySelector("button[type='submit']");

  if (payBtn.dataset.busy === "1") return;

  payBtn.dataset.busy = "1";
  payBtn.disabled = true;
  payBtn.textContent = "Processing...";

  try {

    const merchant = merchantEl.value.trim();
    const amount = Number(amountEl.value);
    const currency = getSelectedCurrency();

    const balances = LEDGER.getBalances();
    const currentBalance = balances[currency] || 0;

    if (!merchant || !amount || amount <= 0) {
      alert("Enter valid merchant and amount");
      throw new Error("invalid_input");
    }

    if (amount > currentBalance) {
      alert("Insufficient balance");
      throw new Error("insufficient_balance");
    }

    const entry = LEDGER.createEntry({
      type: "scan_pay",
      title: `Payment to ${merchant}`,
      currency: currency,
      amount: -amount,
      icon: "📲",
      meta: { merchant, channel: "QR" }
    });

    const tx = LEDGER.applyEntry(entry);

    stopCamera();

/* show receipt first */
showPaymentReceipt(tx, merchant, amount, currency);

/* close scan modal */
close();

/* refresh dashboard */
refreshUI();

  } catch (err) {

    console.warn("ScanPay error:", err);

  } finally {

    payBtn.disabled = false;
    payBtn.textContent = "Pay";
    payBtn.dataset.busy = "0";

  }

});
      }   // closes onMount
  });     // closes openModal

}         // closes openScanAndPay

/* =========================
   PAYMENT RECEIPT
========================= */
      
  /* =========================
   PAYMENT RECEIPT
========================= */

function showPaymentReceipt(tx, merchant, amount, currency) {

  const receiptId = tx.id || ("P54-" + Date.now());

  openModal({
    title: "Payment Successful",
    bodyHTML: `
      <div style="text-align:center">

        <div style="font-size:42px">✅</div>

        <div style="font-weight:900;font-size:18px;margin-top:8px">
          Payment Completed
        </div>

        <div class="p54-divider"></div>

        <div class="p54-note"><b>Merchant</b></div>
        <div>${merchant}</div>

        <div class="p54-note" style="margin-top:10px"><b>Amount</b></div>
        <div style="font-size:18px;font-weight:900">
          ${LEDGER.moneyFmt(currency, amount)}
        </div>

        <div class="p54-note" style="margin-top:10px"><b>Receipt ID</b></div>
        <div>${receiptId}</div>

        <div class="p54-note" style="margin-top:10px">
          ${new Date().toLocaleString()}
        </div>

        <div class="p54-actions" style="margin-top:16px">
          <button class="p54-btn primary" id="doneBtn">Done</button>
        </div>

      </div>
    `,
    onMount: ({ modal, close }) => {
    modal.querySelector("#doneBtn").addEventListener("click", () => {
 close();

setTimeout(() => {
  refreshUI();
}, 60);
});
    }
  });

}    
  /* =========================
   Add Money (Card vs Agent)
========================= */
function openAddMoney() {
  openModal({
    title: "Add Money",
    bodyHTML: `
      <form class="p54-form" id="addForm">

        <div>
          <div class="p54-label">Method</div>
          <select class="p54-select" id="addMethod" required>
            <option value="" disabled selected>Select ▾</option>
            <option value="card">Card</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <div id="addDynamic"></div>

        <div>
          <div class="p54-label">Amount</div>
          <input 
            class="p54-input" 
            id="addAmount" 
            type="number" 
            placeholder="0.00" 
            min="0" 
            required 
          />
        </div>

        <div>
          <div class="p54-label">Reference (optional)</div>
          <input 
            class="p54-input" 
            id="addReference" 
            placeholder="Optional reference"
          />
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelAdd">Cancel</button>
          <button class="p54-btn primary" type="submit">Add</button>
        </div>

      </form>
    `,
    onMount: ({ modal, close }) => {

      const methodSelect = modal.querySelector("#addMethod");
      const dynamicContainer = modal.querySelector("#addDynamic");

      // Render dynamic field only AFTER selection
      methodSelect.addEventListener("change", () => {

        if (methodSelect.value === "card") {
          dynamicContainer.innerHTML = `
            <div>
              <div class="p54-label">Select Card</div>
              <select class="p54-select" required>
                <option value="" disabled selected>Select card ▾</option>
                <option>Virtual Card •••• 9921</option>
                <option>Visa •••• 4832</option>
                <option>Mastercard •••• 1441</option>
              </select>
            </div>
          `;
        }

        if (methodSelect.value === "agent") {
          dynamicContainer.innerHTML = `
            <div>
              <div class="p54-label">Agent Username / Tag</div>
              <input 
                class="p54-input" 
                placeholder="@agent-tag or ID"
                required
              />
            </div>
          `;
        }

      });

      modal.querySelector("#cancelAdd").addEventListener("click", close);

      modal.querySelector("#addForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const amount = Number(modal.querySelector("#addAmount").value);

        if (!amount || amount <= 0) {
          alert("Enter a valid amount");
          return;
        }

        alert("Add Money captured (logic wiring next phase)");
        close();
      });

    }
  });
}
/* =========================
   Withdraw (Card vs Agent)
========================= */
function openWithdraw() {
  openModal({
    title: "Withdraw",
    bodyHTML: `
      <form class="p54-form" id="withdrawForm">

        <div>
          <div class="p54-label">Route</div>
          <select class="p54-select" id="wdRoute">
            <option value="" disabled selected>Select ▾</option>
            <option value="card">Card</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <div id="wdDynamic"></div>

        <div>
          <div class="p54-label">Amount</div>
          <input class="p54-input" id="wdAmount" type="number" placeholder="0.00" required />
        </div>

        <div>
          <div class="p54-label">Reference (optional)</div>
          <input class="p54-input" id="wdRef" placeholder="Optional" />
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="cancelWd">Cancel</button>
          <button class="p54-btn primary" type="submit">Withdraw</button>
        </div>

      </form>
    `,
    onMount: ({ modal, close }) => {

      const route = modal.querySelector("#wdRoute");
      const dynamic = modal.querySelector("#wdDynamic");

      route.addEventListener("change", () => {

        if (route.value === "card") {
          dynamic.innerHTML = `
            <div>
              <div class="p54-label">Select Card</div>
              <select class="p54-select">
                <option>Visa •••• 4832</option>
                <option>Mastercard •••• 1441</option>
              </select>
            </div>
          `;
        }

        if (route.value === "agent") {
          dynamic.innerHTML = `
            <div>
              <div class="p54-label">Agent Tag / ID</div>
              <input class="p54-input" placeholder="@agent-tag or ID" required />
            </div>
          `;
        }

      });

      modal.querySelector("#cancelWd").addEventListener("click", close);

      modal.querySelector("#withdrawForm").addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Withdraw submitted (v8.1 UI only)");
        close();
      });

    }
  });
}

  function openSendUnified() { comingSoon("Send"); }
  function openReceive() { comingSoon("Receive"); }
  function openBankTransfer() { comingSoon("Bank Transfer"); }
  function openCrossBorderFXUnified() { comingSoon("Cross-border FX"); }

  /* ---------------------------
     Ledger modal (View All)
  --------------------------- */

  function openLedger() {
    const all = LEDGER.getTx() || [];
    openModal({
      title: "Transaction History",
      bodyHTML: `
        <div class="p54-note">Your latest activity.</div>
        <div class="p54-divider"></div>
        <div class="p54-ledger" id="ledgerList"></div>
        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeLedger">Close</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const ledger = modal.querySelector("#ledgerList");
        ledger.innerHTML = all.slice(0, 80).map(tx => {
          const cls = tx.amount >= 0 ? "p54-pos" : "p54-neg";
          const sign = tx.amount >= 0 ? "+" : "−";
          return `
            <div class="p54-ledger-item">
              <div class="p54-ledger-left">
                <div class="p54-ledger-title">${tx.icon || "💳"} ${tx.title}</div>
                <div class="p54-ledger-sub">${new Date(tx.created_at || Date.now()).toLocaleString()}</div>
              </div>
              <div class="p54-ledger-amt ${cls}">
                ${sign} ${LEDGER.moneyFmt(tx.currency, Math.abs(tx.amount))}
              </div>
            </div>
          `;
        }).join("") || `<div class="p54-note">No transactions found.</div>`;

        modal.querySelector("#closeLedger").addEventListener("click", close);
      }
    });
  }

  if (viewAllTxBtn) viewAllTxBtn.addEventListener("click", openLedger);
  if (viewAllTxMobileBtn) viewAllTxMobileBtn.addEventListener("click", openLedger);

  /* ---------------------------
     STABLE CLICK WIRING (FIXES Step 4)
  --------------------------- */

  function bindStableClickRouting() {
    document.addEventListener("click", (e) => {
      const tile = e.target.closest(".tile-btn, .shortcut-btn, .utility-btn");
      if (!tile) return;

      const action = tile.getAttribute("data-action");
      const service = tile.getAttribute("data-service");
      const shortcut = tile.getAttribute("data-shortcut");
      const id = tile.id || "";

      // Money Moves
      if (action === "send") return openSendUnified();
      if (action === "receive") return openReceive();
      if (action === "add") return openAddMoney();
      if (action === "withdraw") return openWithdraw();
      if (action === "banktransfer") return openBankTransfer();
      if (action === "scanpay") return openScanAndPay();

      // Services
      if (service === "fx") return openCrossBorderFXUnified();
      if (service === "bills") return comingSoon("Pay Bills & Top Up");
      if (service === "savings") return comingSoon("Savings & Goals");
      if (service === "cards") return comingSoon("Virtual & Linked Cards");
      if (service === "checkout") return comingSoon("PAY54 Smart Checkout");
      if (service === "shop") return comingSoon("Shop & Go");
      if (service === "trading") return comingSoon("Trading");
      if (service === "bet") return comingSoon("Bet Funding");
      if (service === "agent") return comingSoon("Become an Agent");
      if (service === "risk") return comingSoon("AI Risk Watch");

      // Shortcuts
      if (shortcut === "shop") return comingSoon("Shop & Go");
      if (shortcut === "agent") return comingSoon("Become an Agent");
      if (shortcut === "referral") return comingSoon("Refer & Earn");
      if (shortcut === "trading") return comingSoon("Trading");

      // Utilities
      if (id === "atmFinderBtn") return comingSoon("ATM Finder");
      if (id === "posFinderBtn") return comingSoon("POS / Agent Finder");
    });
  }

  /* ---------------------------
     INIT
  --------------------------- */

  function init() {
    if (window.__PAY54_DASH_V81_INIT__) return;
    window.__PAY54_DASH_V81_INIT__ = true;

    seedDemoIfEmpty();
    seedDemoAlertsIfEmpty();

    // Ensure currency + totals correct
    setActiveCurrency(getSelectedCurrency());

    renderAlerts();
    renderNews();
    renderRecentTransactions();

    // Header buttons
    if (addMoneyBtn) addMoneyBtn.addEventListener("click", openAddMoney);
    if (withdrawBtn) withdrawBtn.addEventListener("click", openWithdraw);

    bindStableClickRouting();
    refreshUI();
  }

waitForModules(() => {

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

});

})();
