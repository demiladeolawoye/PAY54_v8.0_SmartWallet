/* =========================
   PAY54 Dashboard — Layer 3A Wiring (v805.2-hotfix3)
   File: assets/js/dashboard.js

   Fixes included:
   ✅ Light mode default enforced
   ✅ Currency pills show converted total (realistic equivalents)
   ✅ Add/Withdraw update correct wallet even when viewing another currency
   ✅ Base wallet aggregation + UI refresh hardened
   ✅ Ledger "View all" includes SEARCH + DATE RANGE filters (restored)
   ✅ FX equivalents in feed + ledger + receipts retained
   ✅ Unified recipient logic for Send + Cross-border FX retained
   ✅ Scan & Pay replaces Request Money (approved)
   ✅ No dead buttons (safe init + stable wiring)
========================= */

(() => {
  "use strict";

  const LEDGER = window.PAY54_LEDGER;
  const RECIP = window.PAY54_RECIPIENT;
  const RCPT = window.PAY54_RECEIPTS;

  if (!LEDGER || !RECIP || !RCPT) {
    console.error("PAY54 Layer 3A missing modules. Check script order in dashboard.html.");
    return;
  }

  const LS = {
    THEME: "pay54_theme",
    CURRENCY: "pay54_currency",
    NAME: "pay54_name",
    EMAIL: "pay54_email",
    ALERTS: "pay54_alerts"
  };

  function safeJSONParse(v, fallback) {
    if (v === null || v === "" || v === "null" || v === "undefined") return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function nowLabel() {
    const d = new Date();
    return d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  /* ---------------------------
     1) DOM hooks
  --------------------------- */

  const balanceEl = document.getElementById("balanceAmount");
  const pillBtns = document.querySelectorAll(".currency");
  const currencySelect = document.getElementById("currencySelect");

  const themeToggle = document.getElementById("themeToggle");

  const profileNameEl = document.getElementById("profileName");
  const profileEmailEl = document.getElementById("profileEmail");
  const profileBtn = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  const addMoneyBtn = document.getElementById("addMoneyBtn");
  const withdrawBtn = document.getElementById("withdrawBtn");

  const clearAlertsBtn = document.getElementById("clearAlerts");
  const alertsContainer = document.getElementById("alerts");

  const viewAllTxBtn = document.getElementById("viewAllTx");
  const viewAllTxMobileBtn = document.getElementById("viewAllTxMobile");

  const newsFeedEl = document.getElementById("newsFeed");

  /* ---------------------------
     2) Modal system (injected)
  --------------------------- */

  function ensureModalStyles() {
    if (document.getElementById("pay54-modal-style")) return;
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
        height:44px; border-radius:12px; border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.04); color:inherit; padding:0 12px; outline:none;
        -webkit-appearance:none; appearance:none;
      }
      body.light .p54-input, body.light .p54-select{ border-color:rgba(10,20,40,.14); background:rgba(10,20,40,.04); }

      /* dropdown options visible in BOTH modes */
      .p54-select option{ color:#0a1428; background:#ffffff; }
      body:not(.light) .p54-select option{ color:#0a1428; background:#ffffff; }

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
     3) Theme (light default enforced)
  --------------------------- */

  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem(LS.THEME, theme);
    if (themeToggle) {
      const icon = themeToggle.querySelector(".icon");
      if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
    }
  }

  // Force light if nothing stored
  const storedTheme = localStorage.getItem(LS.THEME);
  applyTheme(storedTheme || "light");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.body.classList.contains("light");
      applyTheme(isLight ? "dark" : "light");
    });
  }

  /* ---------------------------
     4) Currency: converted TOTAL BALANCE display
  --------------------------- */

  function getSelectedCurrency() {
    return localStorage.getItem(LS.CURRENCY) || "NGN";
  }

  // Converts ALL wallet balances into the selected currency and sums them
  function getConvertedTotal(targetCur) {
    const balances = LEDGER.getBalances();
    let total = 0;
    Object.keys(balances).forEach((c) => {
      const amt = Number(balances[c] ?? 0);
      if (!amt) return;
      if (c === targetCur) total += amt;
      else total += Number(LEDGER.convert(c, targetCur, amt) || 0);
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

    // Base currency for FX equivalents
    LEDGER.setBaseCurrency(cur);

    // Display converted total (not just single wallet)
    if (balanceEl) {
      const convertedTotal = getConvertedTotal(cur);
      balanceEl.textContent = LEDGER.moneyFmt(cur, convertedTotal);
    }
  }

  pillBtns.forEach((btn) => btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur)));
  if (currencySelect) currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));

  setActiveCurrency(getSelectedCurrency());

  /* ---------------------------
     5) Profile + logout
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
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeProfileMenu(); });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(LS.CURRENCY);
      localStorage.removeItem(LS.THEME);
      window.location.href = "login.html";
    });
  }

  /* ---------------------------
     6) Alerts + News demo data
  --------------------------- */

  function getAlerts() {
    const v = safeJSONParse(localStorage.getItem(LS.ALERTS), []);
    return Array.isArray(v) ? v : [];
  }
  function setAlerts(list) {
    localStorage.setItem(LS.ALERTS, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function seedDemoAlertsIfEmpty() {
    const a = getAlerts();
    if (a.length) return;
    setAlerts([
      { id: "a1", icon: "🔔", title: "KYC check completed", sub: "Level 2 active", body: "Your account is verified for daily limits and FX wallets." },
      { id: "a2", icon: "🧾", title: "Statement ready", sub: "Download monthly report", body: "Your statement for this month is ready in Transaction History." },
      { id: "a3", icon: "🛡️", title: "Security tip", sub: "Keep your PIN private", body: "Never share your PAY54 PIN with anyone." },
      { id: "a4", icon: "💱", title: "FX wallets enabled", sub: "Multi-currency is on", body: "You can hold, convert and spend across currencies." },
      { id: "a5", icon: "🎁", title: "Refer & Earn", sub: "Invite friends to unlock bonuses.", body: "Share your referral link to earn bonuses." }
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

  seedDemoAlertsIfEmpty();
  renderAlerts();
  renderNews();

  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      setAlerts([]);
      renderAlerts();
    });
  }

  /* ---------------------------
     7) Recent Transactions feed helper
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

    const base = tx.base_currency;
    const equivLine = (tx.currency !== base)
      ? `<div class="feed-sub">≈ ${LEDGER.moneyFmt(base, tx.base_equiv)} • rate ${Number(tx.fx_rate_used || 1).toFixed(4)}</div>`
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

  /* ---------------------------
     8) Core action helper
  --------------------------- */

  function refreshUI() {
    setActiveCurrency(getSelectedCurrency());
  }

  function addEntryAndRefresh(entry) {
    const tx = LEDGER.applyEntry(entry);
    if (!tx) return null;
    refreshUI();
    prependTxToDOM(tx);
    return tx;
  }

  /* Chunk 1 ends here. Chunk 2 will continue below. */
  /* ---------------------------
     9) Ledger modal with SEARCH + DATE RANGE
  --------------------------- */

  function ledgerMatches(tx, q, cur, type, fromDate, toDate) {
    const text = `${tx.title || ""} ${tx.type || ""} ${tx.currency || ""} ${JSON.stringify(tx.meta || {})}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (cur && tx.currency !== cur) return false;
    if (type && tx.type !== type) return false;

    if (fromDate || toDate) {
      const t = new Date(tx.created_at || Date.now()).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate && t > new Date(toDate + "T23:59:59").getTime()) return false;
    }
    return true;
  }

  function openLedger() {
    const all = LEDGER.getTx() || [];
    const currencies = Object.keys(LEDGER.getBalances());

    openModal({
      title: "Transaction History",
      bodyHTML: `
        <div class="p54-filters">
          <input class="p54-input" id="q" placeholder="Search" />
          <select class="p54-select" id="cur"><option value="">All</option>${currencies.map(c=>`<option>${c}</option>`).join("")}</select>
          <select class="p54-select" id="type"><option value="">All</option>${[...new Set(all.map(x=>x.type))].map(t=>`<option>${t}</option>`).join("")}</select>
          <input class="p54-input" id="from" type="date"/>
          <input class="p54-input" id="to" type="date"/>
          <button class="p54-btn primary" id="apply">Apply</button>
        </div>
        <div class="p54-divider"></div>
        <div class="p54-ledger" id="list"></div>
        <div class="p54-actions"><button class="p54-btn primary" id="close">Close</button></div>
      `,
      onMount: ({ modal, close }) => {
        const list = modal.querySelector("#list");
        const render = (rows) => {
          list.innerHTML = rows.map(tx => `
            <div class="p54-ledger-item">
              <div>
                <div class="p54-ledger-title">${tx.title}</div>
                <div class="p54-ledger-sub">${new Date(tx.created_at).toLocaleString()}</div>
                ${tx.currency !== tx.base_currency ? `<div class="p54-small">≈ ${LEDGER.moneyFmt(tx.base_currency, tx.base_equiv)}</div>` : ""}
              </div>
              <div class="${tx.amount >= 0 ? "p54-pos" : "p54-neg"}">
                ${LEDGER.moneyFmt(tx.currency, Math.abs(tx.amount))}
              </div>
            </div>
          `).join("") || "<div class='p54-note'>No transactions</div>";
        };

        render(all);

        modal.querySelector("#apply").onclick = () => {
          const q = modal.querySelector("#q").value.toLowerCase();
          const cur = modal.querySelector("#cur").value;
          const type = modal.querySelector("#type").value;
          const from = modal.querySelector("#from").value;
          const to = modal.querySelector("#to").value;
          render(all.filter(tx => ledgerMatches(tx, q, cur, type, from, to)));
        };

        modal.querySelector("#close").onclick = close;
      }
    });
  }

  if (viewAllTxBtn) viewAllTxBtn.onclick = openLedger;
  if (viewAllTxMobileBtn) viewAllTxMobileBtn.onclick = openLedger;

  /* ---------------------------
     10) Core Modals
  --------------------------- */

  function openAddMoney() {
    const balances = LEDGER.getBalances();
    const curView = getSelectedCurrency();

    openModal({
      title: "Add Money",
      bodyHTML: `
        <form class="p54-form">
          <select class="p54-select" id="method"><option>Card</option><option>Agent</option></select>
          <select class="p54-select" id="cur">${Object.keys(balances).map(c=>`<option ${c===curView?"selected":""}>${c}</option>`).join("")}</select>
          <input class="p54-input" id="amt" type="number" placeholder="Amount" required />
          <button class="p54-btn primary">Add</button>
        </form>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("form").onsubmit = e => {
          e.preventDefault();
          const c = modal.querySelector("#cur").value;
          const a = +modal.querySelector("#amt").value;
          if (a <= 0) return alert("Invalid amount");

          const tx = addEntryAndRefresh(LEDGER.createEntry({
            type: "add_money", title: "Wallet funding", currency: c, amount: a, icon: "💳"
          }));

          RCPT.openReceiptModal({ openModal, title: "Add Money", tx });
          close();
        };
      }
    });
  }

  function openWithdraw() {
    const balances = LEDGER.getBalances();
    const curView = getSelectedCurrency();

    openModal({
      title: "Withdraw",
      bodyHTML: `
        <form class="p54-form">
          <select class="p54-select" id="cur">${Object.keys(balances).map(c=>`<option ${c===curView?"selected":""}>${c}</option>`).join("")}</select>
          <input class="p54-input" id="amt" type="number" placeholder="Amount" required />
          <button class="p54-btn primary">Withdraw</button>
        </form>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("form").onsubmit = e => {
          e.preventDefault();
          const c = modal.querySelector("#cur").value;
          const a = +modal.querySelector("#amt").value;
          if ((LEDGER.getBalances()[c] ?? 0) < a) return alert("Insufficient balance");

          const tx = addEntryAndRefresh(LEDGER.createEntry({
            type: "withdraw", title: "Withdrawal", currency: c, amount: -a, icon: "🏧"
          }));

          RCPT.openReceiptModal({ openModal, title: "Withdraw", tx });
          close();
        };
      }
    });
  }

  function openSendUnified() {
    const balances = LEDGER.getBalances();
    const curView = getSelectedCurrency();

    openModal({
      title: "Send",
      bodyHTML: `
        <form class="p54-form">
          <select class="p54-select" id="type">${RECIP.RECIPIENT_TYPES.map(r=>`<option value="${r.key}">${r.label}</option>`).join("")}</select>
          <input class="p54-input" id="to" placeholder="Recipient" required />
          <select class="p54-select" id="cur">${Object.keys(balances).map(c=>`<option ${c===curView?"selected":""}>${c}</option>`).join("")}</select>
          <input class="p54-input" id="amt" type="number" placeholder="Amount" required />
          <button class="p54-btn primary">Send</button>
        </form>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("form").onsubmit = e => {
          e.preventDefault();
          const c = modal.querySelector("#cur").value;
          const a = +modal.querySelector("#amt").value;
          if ((LEDGER.getBalances()[c] ?? 0) < a) return alert("Insufficient balance");

          const tx = addEntryAndRefresh(LEDGER.createEntry({
            type: "send", title: "Transfer sent", currency: c, amount: -a, icon: "↗️"
          }));

          RCPT.openReceiptModal({ openModal, title: "Send", tx });
          close();
        };
      }
    });
  }

  function openCrossBorderFXUnified() {
    openModal({
      title: "Cross-border FX",
      bodyHTML: `<div class="p54-note">FX Engine active (Mock)</div><button class="p54-btn primary" id="ok">OK</button>`,
      onMount: ({ modal, close }) => modal.querySelector("#ok").onclick = close
    });
  }

  function openReceive() {
    openModal({
      title: "Receive",
      bodyHTML: `<div class="p54-note">Acct: 3001234567<br/>Tag: @pay54-user</div><button class="p54-btn primary">Done</button>`
    });
  }

  function openBankTransfer() {
    openModal({
      title: "Bank Transfer",
      bodyHTML: `<div class="p54-note">NGN bank transfer ready</div><button class="p54-btn primary">OK</button>`
    });
  }

  /* Chunk 2 ends here. Chunk 3 will close wiring + Scan & Pay. */
  /* ---------------------------
     11) Scan & Pay (Layer 3B)
  --------------------------- */

  function openScanAndPay() {
    const balances = LEDGER.getBalances();
    const curView = getSelectedCurrency();
    let recipient = null;

    openModal({
      title: "Scan & Pay",
      bodyHTML: `
        <form class="p54-form">
          <input class="p54-input" id="qr" placeholder="Paste QR (pay54:@john)" required />
          <div class="p54-note" id="qrInfo"></div>

          <select class="p54-select" id="cur">
            ${Object.keys(balances).map(c=>`<option ${c===curView?"selected":""}>${c}</option>`).join("")}
          </select>

          <input class="p54-input" id="amt" type="number" placeholder="Amount" required />
          <button class="p54-btn primary">Pay</button>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const qr = modal.querySelector("#qr");
        const info = modal.querySelector("#qrInfo");

        qr.oninput = () => {
          const v = qr.value.trim();
          if (v.startsWith("pay54:@")) {
            recipient = { type: "pay54", tag: v.replace("pay54:", "") };
            info.textContent = `PAY54 user: ${recipient.tag}`;
          } else {
            recipient = null;
            info.textContent = "Invalid QR format";
          }
        };

        modal.querySelector("form").onsubmit = e => {
          e.preventDefault();
          if (!recipient) return alert("Invalid QR");

          const c = modal.querySelector("#cur").value;
          const a = +modal.querySelector("#amt").value;
          if ((LEDGER.getBalances()[c] ?? 0) < a) return alert("Insufficient balance");

          const tx = addEntryAndRefresh(LEDGER.createEntry({
            type: "scan_pay",
            title: "Scan & Pay",
            currency: c,
            amount: -a,
            icon: "📷",
            meta: { recipient }
          }));

          RCPT.openReceiptModal({
            openModal,
            title: "Scan & Pay",
            tx,
            lines: [`To: ${recipient.tag}`, `Amount: ${LEDGER.moneyFmt(c,a)}`]
          });

          close();
        };
      }
    });
  }

  /* ---------------------------
     12) FINAL STABLE WIRING (NO DEAD BUTTONS)
  --------------------------- */

  if (addMoneyBtn) addMoneyBtn.onclick = openAddMoney;
  if (withdrawBtn) withdrawBtn.onclick = openWithdraw;

  document.querySelectorAll(".tile-btn[data-action]").forEach(btn => {
    btn.onclick = () => {
      const a = btn.dataset.action;
      if (a === "send") return openSendUnified();
      if (a === "receive") return openReceive();
      if (a === "add") return openAddMoney();
      if (a === "withdraw") return openWithdraw();
      if (a === "banktransfer") return openBankTransfer();
      if (a === "request") return openScanAndPay(); // ✅ fixed
    };
  });

  document.querySelectorAll(".tile-btn[data-service]").forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.service === "fx") return openCrossBorderFXUnified();
      openModal({ title: "Coming soon", bodyHTML: "<div class='p54-note'>Enabled in Layer 3B</div>" });
    };
  });

  document.querySelectorAll("[data-shortcut]").forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.shortcut === "shop") {
        window.open("https://www.booking.com/?utm_source=pay54", "_blank");
      }
    };
  });

  /* ---------------------------
     13) INITIAL REFRESH
  --------------------------- */

  refreshUI();

})(); 

