/* =========================
   PAY54 Dashboard — Layer 2 Wiring — v805.2
   Full replacement for assets/js/dashboard.js

   v805.2 Fix Pack:
   ✅ Default theme = LIGHT (mobile + web)
   ✅ Mobile header + spacing handled via CSS (viewport-fit + safe padding)
   ✅ No invisible modal buttons in light mode (modal system updated)
   ✅ Dark-mode dropdown/options readable (modal + global select CSS)
   ✅ TOTAL BALANCE is truly total: sums all wallets converted into active currency
   ✅ Cross-currency actions always affect TOTAL BALANCE (because totals are converted)
   ✅ Recent Transactions show FX equivalent + FX rate when tx currency differs from display currency
   ✅ View all ledger includes Search + Date range filters
   ✅ Withdraw route = Card / Agent, with card selection + Agent ID/tag
   ✅ Bank Transfer adds recipient name + reference + reason
   ✅ Cross-border FX adds recipient name + account number + reference + reason + receipt details
   ✅ Cards: display contactless, set default, delete card, add card
   ✅ Receipts: PAY54 brand heading + referral CTA hyperlink (top & bottom)
   ✅ Requests & Alerts seeded to 5–6 lines if empty
   ✅ Quick Shortcuts: Open Savings Pot replaced with Refer & Earn
   ✅ Utilities: ATM Finder + POS/Agent Finder
   ✅ Shop on the Fly adds PAY54 affiliate tags to URLs
========================= */

(() => {
  "use strict";

  /* ---------------------------
     0) Helpers / State
  --------------------------- */

  const LS = {
    THEME: "pay54_theme",
    CURRENCY: "pay54_currency",
    NAME: "pay54_name",
    EMAIL: "pay54_email",
    BALANCES: "pay54_balances",
    TX: "pay54_transactions",
    ALERTS: "pay54_alerts",
    CARDS: "pay54_cards",
    DEFAULT_CARD: "pay54_default_card"
  };

  const defaultBalances = {
    NGN: 1250000.5,
    GBP: 8420.75,
    USD: 15320.4,
    EUR: 11890.2,
    GHS: 9650.0,
    KES: 132450.0,
    ZAR: 27890.6
  };

  const symbols = {
    NGN: "₦",
    GBP: "£",
    USD: "$",
    EUR: "€",
    GHS: "₵",
    KES: "KSh",
    ZAR: "R",
    CAD: "C$",
    AED: "د.إ",
    AUD: "A$"
  };

  // FX table: anchor against NGN for simple bridging (mock Layer 2 rates)
  // rateToNGN[x] = 1 unit of currency x equals how many NGN
  const rateToNGN = {
    NGN: 1,
    USD: 1650,
    GBP: 2050,
    EUR: 1800,
    CAD: 1200,
    AED: 450,
    AUD: 1100,
    GHS: 130,   // approx demo
    KES: 12.5,  // approx demo
    ZAR: 90     // approx demo
  };

  const fxSendCurrencies = ["USD", "GBP", "EUR", "CAD", "AED", "AUD"];

  function safeJSONParse(v, fallback) {
    if (v === null || v === "" || v === "null" || v === "undefined") return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function isPlainObject(o) {
    return !!o && typeof o === "object" && !Array.isArray(o);
  }

  function nowStamp() {
    const d = new Date();
    return {
      iso: d.toISOString(),
      label: d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })
    };
  }

  function uid(prefix = "ID") {
    return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  }

  function moneyFmt(cur, amt) {
    const s = symbols[cur] ?? "";
    const n = Number(amt || 0);
    return `${s} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getFxRate(from, to) {
    if (!from || !to) return 1;
    if (from === to) return 1;
    const a = rateToNGN[from] ?? 1;
    const b = rateToNGN[to] ?? 1;
    // convert: from -> NGN -> to
    // (from * a NGN) / b = to amount
    return a / b;
  }

  function convert(from, to, amount) {
    const r = getFxRate(from, to);
    return Number(amount || 0) * r;
  }

  function resetBalances() {
    localStorage.setItem(LS.BALANCES, JSON.stringify(defaultBalances));
    return { ...defaultBalances };
  }

  function getBalances() {
    const stored = safeJSONParse(localStorage.getItem(LS.BALANCES), null);
    if (!isPlainObject(stored)) return resetBalances();

    const cleaned = { ...defaultBalances };
    for (const k of Object.keys(cleaned)) {
      const v = stored[k];
      cleaned[k] = Number.isFinite(Number(v)) ? Number(v) : cleaned[k];
    }
    localStorage.setItem(LS.BALANCES, JSON.stringify(cleaned));
    return cleaned;
  }

  function setBalances(bal) {
    if (!isPlainObject(bal)) return;
    localStorage.setItem(LS.BALANCES, JSON.stringify(bal));
  }

  function getTx() {
    const v = safeJSONParse(localStorage.getItem(LS.TX), []);
    return Array.isArray(v) ? v : [];
  }

  function setTx(list) {
    localStorage.setItem(LS.TX, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function getAlerts() {
    const v = safeJSONParse(localStorage.getItem(LS.ALERTS), []);
    return Array.isArray(v) ? v : [];
  }

  function setAlerts(list) {
    localStorage.setItem(LS.ALERTS, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function getCards() {
    const v = safeJSONParse(localStorage.getItem(LS.CARDS), []);
    return Array.isArray(v) ? v : [];
  }

  function setCards(list) {
    localStorage.setItem(LS.CARDS, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function getDefaultCardId() {
    return localStorage.getItem(LS.DEFAULT_CARD) || "";
  }

  function setDefaultCardId(id) {
    localStorage.setItem(LS.DEFAULT_CARD, id || "");
  }

  function activeDisplayCurrency() {
    const cur = localStorage.getItem(LS.CURRENCY);
    const valid = Object.keys(defaultBalances);
    return valid.includes(cur) ? cur : "NGN";
  }

  function computeTotalIn(displayCur) {
    const bal = getBalances();
    const keys = Object.keys(bal);
    let total = 0;
    for (const k of keys) {
      total += convert(k, displayCur, bal[k] ?? 0);
    }
    return total;
  }

  /* ---------------------------
     1) Seed demo data (alerts/tx/cards) if empty
  --------------------------- */

  function seedIfEmpty() {
    // balances
    getBalances();

    // tx
    const tx = getTx();
    if (!tx.length) {
      const stamp1 = nowStamp();
      const stamp2 = nowStamp();
      const stamp3 = nowStamp();
      stamp2.label = "Yesterday";
      stamp3.label = "3 days ago";

      const displayCur = activeDisplayCurrency();
      const makeTx = (title, currency, amount, icon, timeLabel) => {
        const fxRate = currency === displayCur ? 1 : getFxRate(currency, displayCur);
        const eq = currency === displayCur ? null : Math.abs(amount) * fxRate;
        return {
          id: uid("TX"),
          title,
          currency,
          amount: Number(amount),
          icon,
          meta: "",
          timeISO: new Date().toISOString(),
          timeLabel,
          displayCurrency: displayCur,
          fxRateToDisplay: fxRate,
          equivAmountDisplay: eq
        };
      };

      setTx([
        makeTx("Wallet funding", "NGN", +250000, "💳", "2 mins ago"),
        makeTx("Transfer to John", "NGN", -45000, "↗️", stamp2.label),
        makeTx("Airtime purchase", "NGN", -2500, "📶", stamp3.label)
      ]);
    }

    // alerts (need 5–6 lines)
    const alerts = getAlerts();
    if (!alerts.length) {
      setAlerts([
        { id: uid("AL"), title: "All clear", sub: "No requests or alerts", body: "You're up to date.", icon: "✅" },
        { id: uid("AL"), title: "Payment request", sub: "@mike • ₦25,000", body: "Pending request (Layer 3 will confirm).", icon: "🔔" },
        { id: uid("AL"), title: "FX alert", sub: "USD–NGN volatility rising", body: "Watch rates before converting.", icon: "⚠️" },
        { id: uid("AL"), title: "Security check", sub: "Device verified", body: "Your device verification is active.", icon: "🛡️" },
        { id: uid("AL"), title: "KYC reminder", sub: "Upload document to reach Level 3", body: "Higher limits unlock with KYC Level 3.", icon: "🧾" },
        { id: uid("AL"), title: "Promo", sub: "Refer 3 friends → earn rewards", body: "Invite friends and earn on first transactions.", icon: "🎁" }
      ]);
    }

    // cards
    const cards = getCards();
    if (!cards.length) {
      const demo = [
        { id: uid("CARD"), issuer: "VISA", last4: "4832", expiry: "08/28", cvv: "***", contactless: true },
        { id: uid("CARD"), issuer: "MASTERCARD", last4: "1029", expiry: "11/27", cvv: "***", contactless: true }
      ];
      setCards(demo);
      if (!getDefaultCardId()) setDefaultCardId(demo[0].id);
    }
  }

  /* ---------------------------
     2) DOM Hooks
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

  const viewAllTxBtn = document.getElementById("viewAllTx");         // desktop
  const viewAllTxMobileBtn = document.getElementById("viewAllTxMobile"); // mobile

  const atmFinderBtn = document.getElementById("atmFinderBtn");
  const posFinderBtn = document.getElementById("posFinderBtn");

  const newsFeed = document.getElementById("newsFeed");

  /* ---------------------------
     3) Modal System (injected)
  --------------------------- */

  function ensureModalStyles() {
    if (document.getElementById("pay54-modal-style")) return;
    const style = document.createElement("style");
    style.id = "pay54-modal-style";
    style.textContent = `
      .p54-modal-backdrop{
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55);
        display: grid; place-items: center;
        z-index: 9999;
        padding: 18px;
      }
      body.light .p54-modal-backdrop{ background: rgba(0,0,0,0.35); }

      .p54-modal{
        width: min(620px, 100%);
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(10,14,24,0.96);
        color: rgba(255,255,255,0.92);
        box-shadow: 0 18px 50px rgba(0,0,0,0.45);
        overflow: hidden;
      }
      body.light .p54-modal{
        background: rgba(255,255,255,0.97);
        color: rgba(10,20,40,0.92);
        border: 1px solid rgba(10,20,40,0.14);
        box-shadow: 0 18px 50px rgba(20,40,80,0.18);
      }

      .p54-modal-head{
        display:flex; align-items:center; justify-content:space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.10);
      }
      body.light .p54-modal-head{ border-bottom: 1px solid rgba(10,20,40,0.10); }

      .p54-modal-title{ font-weight: 950; font-size: 15px; letter-spacing: .2px; display:flex; gap:10px; align-items:center; }
      .p54-brand{ font-weight: 950; color: rgba(59,130,246,0.95); letter-spacing:.2px; }
      .p54-x{
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.04);
        color: inherit;
        width: 36px; height: 36px; border-radius: 999px;
        cursor:pointer;
      }
      body.light .p54-x{ border-color: rgba(10,20,40,0.14); background: rgba(10,20,40,0.04); }

      .p54-modal-body{ padding: 16px; }
      .p54-form{ display:flex; flex-direction:column; gap: 10px; }
      .p54-row{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 520px){ .p54-row{ grid-template-columns: 1fr; } }

      .p54-label{ font-size: 12px; font-weight: 900; opacity: .85; }
      .p54-input, .p54-select{
        height: 44px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.04);
        color: inherit;
        padding: 0 12px;
        outline: none;
      }
      body.light .p54-input, body.light .p54-select{
        border-color: rgba(10,20,40,0.14);
        background: rgba(10,20,40,0.04);
        color: rgba(10,20,40,0.92);
      }

      /* ✅ Dark mode select/options readable */
      body:not(.light) .p54-select{
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.92);
      }
      body:not(.light) .p54-select option{
        background: #0b1020;
        color: rgba(255,255,255,0.92);
      }
      body.light .p54-select option{
        background: #ffffff;
        color: rgba(10,20,40,0.92);
      }

      .p54-actions{
        display:flex; gap: 10px; justify-content:flex-end;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .p54-btn{
        height: 40px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.05);
        color: inherit;
        padding: 0 14px;
        font-weight: 950;
        cursor:pointer;
      }
      /* ✅ Light mode: always readable (fix "white on white") */
      body.light .p54-btn{
        border-color: rgba(10,20,40,0.16);
        background: rgba(10,20,40,0.06);
        color: rgba(10,20,40,0.95);
      }

      .p54-btn.primary{
        border-color: rgba(59,130,246,0.65);
        background: rgba(59,130,246,0.92);
        color: #fff;
      }

      .p54-note{ font-size: 12px; opacity: .82; line-height: 1.35; }
      .p54-divider{ height: 1px; background: rgba(255,255,255,0.10); margin: 12px 0; }
      body.light .p54-divider{ background: rgba(10,20,40,0.10); }

      .p54-receipt{
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.03);
        border-radius: 14px;
        padding: 12px;
        font-size: 13px;
      }
      body.light .p54-receipt{ border-color: rgba(10,20,40,0.12); background: rgba(10,20,40,0.03); }

      .p54-ledger{
        display:flex; flex-direction:column; gap: 10px;
      }
      .p54-ledger-item{
        display:flex; align-items:flex-start; justify-content:space-between; gap: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.03);
        border-radius: 14px;
        padding: 12px;
      }
      body.light .p54-ledger-item{ border-color: rgba(10,20,40,0.12); background: rgba(10,20,40,0.03); }
      .p54-ledger-left{ min-width:0; }
      .p54-ledger-title{ font-weight: 950; }
      .p54-ledger-sub{ opacity:.75; font-size:12px; margin-top:3px; }
      .p54-ledger-amt{ font-weight: 950; white-space:nowrap; text-align:right; }
      .p54-pos{ color: #22c55e; }
      .p54-neg{ color: #ef4444; }

      .p54-eq{
        font-size: 11px;
        opacity: .8;
        margin-top: 3px;
        display:block;
      }

      .p54-link{
        color: rgba(59,130,246,0.95);
        text-decoration: none;
        font-weight: 900;
      }
      .p54-link:hover{ text-decoration: underline; }

      .p54-chip{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:8px 10px;
        border-radius:999px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.03);
        font-size:12px;
        font-weight:900;
      }
      body.light .p54-chip{
        border-color: rgba(10,20,40,0.12);
        background: rgba(10,20,40,0.03);
      }

      .p54-card{
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.03);
        border-radius: 18px;
        padding: 14px;
        display:flex;
        justify-content:space-between;
        gap: 12px;
        align-items:center;
      }
      body.light .p54-card{
        border-color: rgba(10,20,40,0.12);
        background: rgba(10,20,40,0.03);
      }
      .p54-card-left{ min-width:0; }
      .p54-card-issuer{ font-weight: 950; }
      .p54-card-meta{ opacity:.8; font-size:12px; margin-top:4px; }
      .p54-card-actions{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
      .p54-mini{
        height: 34px;
        border-radius: 999px;
        padding: 0 12px;
        font-weight: 950;
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
          <div class="p54-modal-title"><span class="p54-brand">PAY54</span> <span>${title || ""}</span></div>
          <button class="p54-x" type="button" aria-label="Close">✕</button>
        </div>
        <div class="p54-modal-body">${bodyHTML || ""}</div>
      </div>
    `;

    const closeBtn = backdrop.querySelector(".p54-x");

    function close() {
      backdrop.remove();
      document.removeEventListener("keydown", escClose);
    }
    function escClose(e) {
      if (e.key === "Escape") close();
    }

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", escClose);

    document.body.appendChild(backdrop);

    if (typeof onMount === "function") onMount({ backdrop, modal: backdrop.querySelector(".p54-modal"), close });
    return { close };
  }

  function referralFooterHTML() {
    return `
      <div class="p54-divider"></div>
      <div class="p54-note">
        New to PAY54? <a class="p54-link" href="register.html" target="_blank" rel="noopener">Join PAY54</a> to send and receive money faster —
        <a class="p54-link" href="register.html" target="_blank" rel="noopener">Click to join & earn rewards</a>.
      </div>
    `;
  }

  /* ---------------------------
     4) Header: Currency, Theme, Profile
  --------------------------- */

  function setActiveCurrency(cur) {
    const valid = Object.keys(defaultBalances);
    const safeCur = valid.includes(cur) ? cur : "NGN";

    pillBtns.forEach((b) => {
      const isActive = b.dataset.cur === safeCur;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (currencySelect) currencySelect.value = safeCur;

    // TOTAL BALANCE (converted)
    if (balanceEl) {
      const total = computeTotalIn(safeCur);
      balanceEl.textContent = moneyFmt(safeCur, total);
    }

    localStorage.setItem(LS.CURRENCY, safeCur);
  }

  pillBtns.forEach((btn) => {
    btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur));
  });

  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));
  }

  // Theme (Default = LIGHT)
  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem(LS.THEME, theme);
    if (themeToggle) {
      const icon = themeToggle.querySelector(".icon");
      if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
    }
  }

  // Init theme: default light unless explicitly stored
  applyTheme(localStorage.getItem(LS.THEME) || "light");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.body.classList.contains("light");
      applyTheme(isLight ? "dark" : "light");
    });
  }

  // Profile name/email
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeProfileMenu();
    });
  }

  document.querySelectorAll(".pm-item[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nav = btn.dataset.nav;
      closeProfileMenu();
      openModal({
        title: "Coming soon",
        bodyHTML: `
          <div class="p54-note"><b>${nav}</b> is ready for Layer 3 / backend. For now, dashboard wiring is complete.</div>
          ${referralFooterHTML()}
          <div class="p54-actions"><button class="p54-btn primary" type="button" id="okBtn">OK</button></div>
        `,
        onMount: ({ modal, close }) => modal.querySelector("#okBtn").addEventListener("click", close)
      });
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(LS.CURRENCY);
      localStorage.removeItem(LS.THEME);
      window.location.href = "login.html";
    });
  }

  /* ---------------------------
     5) News feed (static)
  --------------------------- */

  function renderNews() {
    if (!newsFeed) return;
    newsFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-icon">💡</div>
        <div class="feed-main">
          <div class="feed-title">USD–NGN volatility rising</div>
          <div class="feed-sub">Market insight</div>
        </div>
      </div>
      <div class="feed-item">
        <div class="feed-icon">🔐</div>
        <div class="feed-main">
          <div class="feed-title">Keep your account secure</div>
          <div class="feed-sub">Security tip</div>
        </div>
      </div>
      <div class="feed-item">
        <div class="feed-icon">🏆</div>
        <div class="feed-main">
          <div class="feed-title">Complete 3 transfers today</div>
          <div class="feed-sub">Earn a streak badge</div>
        </div>
      </div>
    `;
  }

  /* ---------------------------
     6) Alerts rendering
  --------------------------- */

  function renderAlerts() {
    if (!alertsContainer) return;

    const alerts = getAlerts();
    alertsContainer.innerHTML = alerts.slice(0, 6).map(a => `
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
            <div class="p54-receipt">
              <b>${item.title}</b>
              <div class="p54-note">${item.sub || ""}</div>
              <div class="p54-divider"></div>
              <div>${item.body || "Details will be expanded in Layer 3."}</div>
            </div>
            ${referralFooterHTML()}
            <div class="p54-actions">
              <button class="p54-btn primary" type="button" id="closeA">Close</button>
            </div>
          `,
          onMount: ({ modal, close }) => modal.querySelector("#closeA").addEventListener("click", close)
        });
      });
    });
  }

  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      setAlerts([]);
      // Immediately reseed "All clear" line so UI doesn't feel empty
      setAlerts([{ id: uid("AL"), title: "All clear", sub: "No requests or alerts", body: "You're up to date.", icon: "✅" }]);
      renderAlerts();
    });
  }

  /* ---------------------------
     7) Recent Tx feed (render BOTH desktop + mobile feeds)
  --------------------------- */

  function txAmountHTML(tx) {
    const isPos = tx.amount >= 0;
    const cls = isPos ? "pos" : "neg";
    const sign = isPos ? "+" : "−";
    const main = `${sign} ${moneyFmt(tx.currency, Math.abs(tx.amount))}`;

    const displayCur = tx.displayCurrency || activeDisplayCurrency();
    if (tx.currency === displayCur || !tx.fxRateToDisplay || !tx.equivAmountDisplay) {
      return `<div class="feed-amt ${cls}"><span class="main">${main}</span></div>`;
    }

    const eq = moneyFmt(displayCur, Math.abs(tx.equivAmountDisplay));
    const rate = Number(tx.fxRateToDisplay || 1).toLocaleString(undefined, { maximumFractionDigits: 4 });
    return `
      <div class="feed-amt ${cls}">
        <span class="main">${main}</span>
        <span class="eq">≈ ${eq} (FX ${rate})</span>
      </div>
    `;
  }

  function renderRecentTxFeeds() {
    const feeds = Array.from(document.querySelectorAll('[data-role="recentTxFeed"]'));
    if (!feeds.length) return;

    const list = getTx().slice(0, 5);

    const html = list.length ? list.map(tx => `
      <div class="feed-item">
        <div class="feed-icon">${tx.icon || "💳"}</div>
        <div class="feed-main">
          <div class="feed-title">${tx.title}</div>
          <div class="feed-sub">${tx.timeLabel || ""}</div>
        </div>
        ${txAmountHTML(tx)}
      </div>
    `).join("") : `
      <div class="feed-item">
        <div class="feed-icon">✅</div>
        <div class="feed-main">
          <div class="feed-title">No transactions yet</div>
          <div class="feed-sub">Your latest activity will show here</div>
        </div>
      </div>
    `;

    feeds.forEach(f => { f.innerHTML = html; });
  }

  /* ---------------------------
     8) Transactions + Alerts + Receipts
  --------------------------- */

  function addAlert({ title, sub, body, icon }) {
    const a = { id: uid("AL"), title, sub, body, icon: icon || "🔔" };
    const list = getAlerts();
    list.unshift(a);
    setAlerts(list);
    renderAlerts();
    return a;
  }

  function addTransaction({ title, currency, amount, icon, meta }) {
    const stamp = nowStamp();
    const displayCur = activeDisplayCurrency();

    const fxRate = currency === displayCur ? 1 : getFxRate(currency, displayCur);
    const eq = currency === displayCur ? null : Math.abs(Number(amount || 0)) * fxRate;

    const tx = {
      id: uid("TX"),
      title,
      currency,
      amount: Number(amount),
      icon: icon || "💳",
      meta: meta || "",
      timeISO: stamp.iso,
      timeLabel: stamp.label,
      displayCurrency: displayCur,
      fxRateToDisplay: fxRate,
      equivAmountDisplay: eq
    };

    const list = getTx();
    list.unshift(tx);
    setTx(list);

    renderRecentTxFeeds();
    // total balance may change due to wallet change
    setActiveCurrency(activeDisplayCurrency());

    return tx;
  }

  function openReceipt({ title, lines, txId }) {
    const text = lines.join("\n");
    openModal({
      title: "Receipt",
      bodyHTML: `
        <div class="p54-receipt">
          <div class="p54-chip">PAY54 • Official Receipt</div>
          <div style="margin-top:10px;"><b>${title}</b></div>
          <div class="p54-note">Transaction ID: ${txId}</div>
          <div class="p54-divider"></div>
          <pre style="margin:0; white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;">${text}</pre>
        </div>

        ${referralFooterHTML()}

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="copyRcpt">Copy</button>
          <button class="p54-btn" type="button" id="waRcpt">WhatsApp</button>
          <button class="p54-btn primary" type="button" id="doneRcpt">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#doneRcpt").addEventListener("click", close);
        modal.querySelector("#copyRcpt").addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(text);
            alert("Copied ✅");
          } catch {
            alert("Copy failed (browser permissions).");
          }
        });
        modal.querySelector("#waRcpt").addEventListener("click", () => {
          const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
          window.open(wa, "_blank");
        });
      }
    });
  }

  /* ---------------------------
     9) Ledger (View all) with search + date range
  --------------------------- */

  function openLedger() {
    const list = getTx().slice(0, 200);

    openModal({
      title: "Transaction History",
      bodyHTML: `
        <div class="p54-note">Search + filter your transactions (Layer 2 demo).</div>

        <div class="p54-divider"></div>

        <div class="p54-row">
          <div>
            <div class="p54-label">Search</div>
            <input class="p54-input" id="q" placeholder="e.g. funding, transfer, John, FX..." />
          </div>
          <div>
            <div class="p54-label">Currency</div>
            <select class="p54-select" id="cur">
              <option value="">All</option>
              ${Object.keys(defaultBalances).map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="p54-row">
          <div>
            <div class="p54-label">From (date)</div>
            <input class="p54-input" id="from" type="date" />
          </div>
          <div>
            <div class="p54-label">To (date)</div>
            <input class="p54-input" id="to" type="date" />
          </div>
        </div>

        <div class="p54-divider"></div>

        <div class="p54-ledger" id="ledgerList"></div>

        ${referralFooterHTML()}

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeLedger">Close</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const ledger = modal.querySelector("#ledgerList");
        const q = modal.querySelector("#q");
        const cur = modal.querySelector("#cur");
        const from = modal.querySelector("#from");
        const to = modal.querySelector("#to");

        function inDateRange(txISO) {
          const d = new Date(txISO);
          const f = from.value ? new Date(from.value + "T00:00:00") : null;
          const t = to.value ? new Date(to.value + "T23:59:59") : null;
          if (f && d < f) return false;
          if (t && d > t) return false;
          return true;
        }

        function render() {
          const query = (q.value || "").trim().toLowerCase();
          const c = cur.value;

          const filtered = list.filter(tx => {
            if (c && tx.currency !== c) return false;
            if (!inDateRange(tx.timeISO)) return false;

            if (!query) return true;
            const blob = `${tx.title} ${tx.meta || ""} ${tx.currency} ${tx.amount}`.toLowerCase();
            return blob.includes(query);
          });

          ledger.innerHTML = filtered.length ? filtered.map(tx => {
            const cls = tx.amount >= 0 ? "p54-pos" : "p54-neg";
            const sign = tx.amount >= 0 ? "+" : "−";
            const main = `${sign} ${moneyFmt(tx.currency, Math.abs(tx.amount))}`;

            const displayCur = tx.displayCurrency || activeDisplayCurrency();
            const eq = (tx.currency !== displayCur && tx.equivAmountDisplay)
              ? `<span class="p54-eq">≈ ${moneyFmt(displayCur, tx.equivAmountDisplay)} (FX ${Number(tx.fxRateToDisplay||1).toLocaleString(undefined,{maximumFractionDigits:4})})</span>`
              : "";

            return `
              <div class="p54-ledger-item">
                <div class="p54-ledger-left">
                  <div class="p54-ledger-title">${tx.icon || "💳"} ${tx.title}</div>
                  <div class="p54-ledger-sub">${new Date(tx.timeISO).toLocaleString()}</div>
                  ${tx.meta ? `<div class="p54-ledger-sub">${tx.meta}</div>` : ""}
                </div>
                <div class="p54-ledger-amt ${cls}">
                  ${main}
                  ${eq}
                </div>
              </div>
            `;
          }).join("") : `<div class="p54-note">No matches found.</div>`;
        }

        q.addEventListener("input", render);
        cur.addEventListener("change", render);
        from.addEventListener("change", render);
        to.addEventListener("change", render);

        render();

        modal.querySelector("#closeLedger").addEventListener("click", close);
      }
    });
  }

  if (viewAllTxBtn) viewAllTxBtn.addEventListener("click", openLedger);
  if (viewAllTxMobileBtn) viewAllTxMobileBtn.addEventListener("click", openLedger);

  /* ---------------------------
     10) Money Moves + Services Actions
  --------------------------- */

  function openSendPay54() {
    const cur = activeDisplayCurrency();
    openModal({
      title: "Send PAY54 → PAY54",
      bodyHTML: `
        <form class="p54-form" id="sendForm">
          <div>
            <div class="p54-label">Recipient Tag</div>
            <input class="p54-input" id="toTag" placeholder="@username" required />
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Currency</div>
              <select class="p54-select" id="sendCur">
                ${Object.keys(getBalances()).map(c => `<option value="${c}" ${c===cur?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="sendAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div class="p54-note" id="feeNote">Fee preview: —</div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelSend">Cancel</button>
            <button class="p54-btn primary" type="submit">Send</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const form = modal.querySelector("#sendForm");
        const amt = modal.querySelector("#sendAmt");
        const curSel = modal.querySelector("#sendCur");
        const feeNote = modal.querySelector("#feeNote");

        function calcFee(a) {
          const n = Number(a || 0);
          return Math.min(n * 0.008, 50);
        }
        function updateFee() {
          const fee = calcFee(amt.value);
          feeNote.textContent = `Fee preview: ${moneyFmt(curSel.value, fee)}`;
        }

        amt.addEventListener("input", updateFee);
        curSel.addEventListener("change", updateFee);
        modal.querySelector("#cancelSend").addEventListener("click", close);

        form.addEventListener("submit", (e) => {
          e.preventDefault();

          const balances = getBalances();
          const c = curSel.value;
          const a = Number(amt.value || 0);
          const fee = calcFee(a);
          const total = a + fee;

          if (total <= 0) return alert("Enter a valid amount.");
          if ((balances[c] ?? 0) < total) return alert(`Insufficient ${c} wallet balance.`);

          balances[c] = (balances[c] ?? 0) - total;
          setBalances(balances);

          const tx = addTransaction({
            title: "PAY54 transfer sent",
            currency: c,
            amount: -total,
            icon: "↗️",
            meta: `To ${modal.querySelector("#toTag").value}`
          });

          const displayCur = tx.displayCurrency;
          const eqLine = (c !== displayCur)
            ? `Equivalent: ${moneyFmt(displayCur, tx.equivAmountDisplay)} (FX ${Number(tx.fxRateToDisplay||1).toLocaleString(undefined,{maximumFractionDigits:4})})`
            : "";

          openReceipt({
            title: "PAY54 → PAY54 Transfer",
            txId: tx.id,
            lines: [
              `Action: Send PAY54 → PAY54`,
              `To: ${modal.querySelector("#toTag").value}`,
              `Amount: ${moneyFmt(c, a)}`,
              `Fee: ${moneyFmt(c, fee)}`,
              `Total: ${moneyFmt(c, total)}`,
              eqLine,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ].filter(Boolean)
          });

          close();
        });
      }
    });
  }

  function openReceive() {
    openModal({
      title: "Receive",
      bodyHTML: `
        <div class="p54-receipt">
          <div class="p54-chip">PAY54 • Receive</div>
          <div style="margin-top:10px;"><b>Share your account and PAY54 tag</b></div>
          <div class="p54-divider"></div>
          <div><b>Acct:</b> 3001234567</div>
          <div><b>Tag:</b> @pay54-user</div>
          <div class="p54-divider"></div>
          <div class="p54-actions" style="justify-content:flex-start;">
            <button class="p54-btn" type="button" id="copyTag">Copy Tag</button>
            <button class="p54-btn" type="button" id="shareWA">Share WhatsApp</button>
          </div>
        </div>

        ${referralFooterHTML()}

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="doneRecv">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#doneRecv").addEventListener("click", close);
        modal.querySelector("#copyTag").addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText("@pay54-user");
            alert("Copied ✅");
          } catch {
            alert("Copy failed.");
          }
        });
        modal.querySelector("#shareWA").addEventListener("click", () => {
          const msg = `PAY54 Request\nAcct: 3001234567\nTag: @pay54-user\nSend me a payment on PAY54.`;
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
        });
      }
    });
  }

  function openAddMoney() {
    const cur = activeDisplayCurrency();
    openModal({
      title: "Add money",
      bodyHTML: `
        <form class="p54-form" id="addForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Method</div>
              <select class="p54-select" id="method">
                <option value="Card">Card</option>
                <option value="Bank">Bank</option>
                <option value="Agent">Agent</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Currency</div>
              <select class="p54-select" id="addCur">
                ${Object.keys(getBalances()).map(c => `<option value="${c}" ${c===cur?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
          </div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="addAmt" type="number" step="0.01" min="0" required />
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelAdd">Cancel</button>
            <button class="p54-btn primary" type="submit">Add</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const form = modal.querySelector("#addForm");
        modal.querySelector("#cancelAdd").addEventListener("click", close);

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const balances = getBalances();
          const c = modal.querySelector("#addCur").value;
          const a = Number(modal.querySelector("#addAmt").value || 0);
          const m = modal.querySelector("#method").value;

          if (a <= 0) return alert("Enter a valid amount.");

          balances[c] = (balances[c] ?? 0) + a;
          setBalances(balances);

          const tx = addTransaction({
            title: "Wallet funding",
            currency: c,
            amount: +a,
            icon: "💳",
            meta: `Via ${m}`
          });

          const displayCur = tx.displayCurrency;
          const eqLine = (c !== displayCur)
            ? `Equivalent: ${moneyFmt(displayCur, tx.equivAmountDisplay)} (FX ${Number(tx.fxRateToDisplay||1).toLocaleString(undefined,{maximumFractionDigits:4})})`
            : "";

          openReceipt({
            title: "Add money",
            txId: tx.id,
            lines: [
              `Action: Add money`,
              `Method: ${m}`,
              `Amount: ${moneyFmt(c, a)}`,
              eqLine,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ].filter(Boolean)
          });

          close();
        });
      }
    });
  }

  function openWithdraw() {
    const cur = activeDisplayCurrency();
    const cards = getCards();
    const defaultCard = getDefaultCardId() || (cards[0] ? cards[0].id : "");

    openModal({
      title: "Withdraw",
      bodyHTML: `
        <form class="p54-form" id="wdForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Route</div>
              <select class="p54-select" id="wdRoute">
                <option value="Card">Card</option>
                <option value="Agent">Agent</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Currency</div>
              <select class="p54-select" id="wdCur">
                ${Object.keys(getBalances()).map(c => `<option value="${c}" ${c===cur?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="p54-row" id="cardRow">
            <div>
              <div class="p54-label">Select card</div>
              <select class="p54-select" id="wdCard">
                ${cards.map(cd => `<option value="${cd.id}" ${cd.id===defaultCard?"selected":""}>${cd.issuer} •••• ${cd.last4}</option>`).join("") || `<option value="">No cards (add one)</option>`}
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="wdRef" placeholder="e.g. cash withdrawal" />
            </div>
          </div>

          <div class="p54-row" id="agentRow" style="display:none;">
            <div>
              <div class="p54-label">Agent ID / Tag</div>
              <input class="p54-input" id="agentId" placeholder="e.g. AGT-30291 or @agent" />
            </div>
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="wdReason">
                <option value="Cash withdrawal">Cash withdrawal</option>
                <option value="Family support">Family support</option>
                <option value="Business">Business</option>
                <option value="Transport">Transport</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="wdAmt" type="number" step="0.01" min="0" required />
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelWd">Cancel</button>
            <button class="p54-btn primary" type="submit">Withdraw</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const route = modal.querySelector("#wdRoute");
        const cardRow = modal.querySelector("#cardRow");
        const agentRow = modal.querySelector("#agentRow");

        function toggleRows() {
          const v = route.value;
          if (v === "Card") { cardRow.style.display = ""; agentRow.style.display = "none"; }
          else { cardRow.style.display = "none"; agentRow.style.display = ""; }
        }
        route.addEventListener("change", toggleRows);
        toggleRows();

        modal.querySelector("#cancelWd").addEventListener("click", close);

        modal.querySelector("#wdForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const balances = getBalances();

          const c = modal.querySelector("#wdCur").value;
          const a = Number(modal.querySelector("#wdAmt").value || 0);
          const r = route.value;

          if (a <= 0) return alert("Enter a valid amount.");
          if ((balances[c] ?? 0) < a) return alert(`Insufficient ${c} wallet balance.`);

          let meta = "";
          if (r === "Card") {
            const cardId = modal.querySelector("#wdCard").value;
            const card = getCards().find(x => x.id === cardId);
            if (!cardId || !card) return alert("No card selected. Please add/select a card.");
            meta = `Route: Card • ${card.issuer} •••• ${card.last4} • Ref: ${modal.querySelector("#wdRef").value || "—"}`;
          } else {
            const agentId = (modal.querySelector("#agentId").value || "").trim();
            if (!agentId) return alert("Enter Agent ID / Tag.");
            meta = `Route: Agent • ${agentId} • Reason: ${modal.querySelector("#wdReason").value}`;
          }

          balances[c] = (balances[c] ?? 0) - a;
          setBalances(balances);

          const tx = addTransaction({
            title: "Withdrawal",
            currency: c,
            amount: -a,
            icon: "🏧",
            meta
          });

          const displayCur = tx.displayCurrency;
          const eqLine = (c !== displayCur)
            ? `Equivalent: ${moneyFmt(displayCur, tx.equivAmountDisplay)} (FX ${Number(tx.fxRateToDisplay||1).toLocaleString(undefined,{maximumFractionDigits:4})})`
            : "";

          openReceipt({
            title: "Withdraw",
            txId: tx.id,
            lines: [
              `Action: Withdraw`,
              meta,
              `Amount: ${moneyFmt(c, a)}`,
              eqLine,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ].filter(Boolean)
          });

          close();
        });
      }
    });
  }

  function openBankTransfer() {
    openModal({
      title: "Bank Transfer",
      bodyHTML: `
        <form class="p54-form" id="btForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Recipient name</div>
              <input class="p54-input" id="btName" placeholder="Full name" required />
            </div>
            <div>
              <div class="p54-label">Bank</div>
              <select class="p54-select" id="bank">
                <option>GTBank</option><option>Access Bank</option><option>Zenith</option><option>UBA</option><option>FirstBank</option>
              </select>
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Account Number</div>
              <input class="p54-input" id="acct" maxlength="10" placeholder="10 digits" required />
            </div>
            <div>
              <div class="p54-label">Amount (NGN)</div>
              <input class="p54-input" id="amt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="btRef" placeholder="e.g. rent, fees, support" />
            </div>
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="btReason">
                <option value="Family support">Family support</option>
                <option value="Bills">Bills</option>
                <option value="Rent">Rent</option>
                <option value="Education">Education</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelBT">Cancel</button>
            <button class="p54-btn primary" type="submit">Transfer</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#cancelBT").addEventListener("click", close);

        modal.querySelector("#btForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const acct = modal.querySelector("#acct").value.trim();
          if (!/^\d{10}$/.test(acct)) return alert("Account number must be 10 digits.");

          const name = modal.querySelector("#btName").value.trim();
          if (!name) return alert("Enter recipient name.");

          const balances = getBalances();
          const a = Number(modal.querySelector("#amt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");
          if ((balances.NGN ?? 0) < a) return alert("Insufficient NGN wallet balance.");

          balances.NGN -= a;
          setBalances(balances);

          const bank = modal.querySelector("#bank").value;
          const reason = modal.querySelector("#btReason").value;
          const ref = modal.querySelector("#btRef").value || "—";

          const tx = addTransaction({
            title: "Bank transfer",
            currency: "NGN",
            amount: -a,
            icon: "🏦",
            meta: `To ${name} • ${bank} • ${acct} • Ref: ${ref} • Reason: ${reason}`
          });

          openReceipt({
            title: "Bank Transfer",
            txId: tx.id,
            lines: [
              `Action: Bank transfer`,
              `Recipient: ${name}`,
              `Bank: ${bank}`,
              `Acct: ${acct}`,
              `Reference: ${ref}`,
              `Reason: ${reason}`,
              `Amount: ${moneyFmt("NGN", a)}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
          });

          close();
        });
      }
    });
  }

  function openRequestMoney() {
    openModal({
      title: "Request money",
      bodyHTML: `
        <form class="p54-form" id="rqForm">
          <div>
            <div class="p54-label">From (Tag)</div>
            <input class="p54-input" id="fromTag" placeholder="@payer" required />
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Currency</div>
              <select class="p54-select" id="rqCur">
                ${Object.keys(getBalances()).map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="rqAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="rqReason">
                <option value="Family support">Family support</option>
                <option value="Bills">Bills</option>
                <option value="Rent">Rent</option>
                <option value="Education">Education</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="rqRef" placeholder="Optional reference" />
            </div>
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelRQ">Cancel</button>
            <button class="p54-btn primary" type="submit">Create request</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#cancelRQ").addEventListener("click", close);
        modal.querySelector("#rqForm").addEventListener("submit", (e) => {
          e.preventDefault();

          const tag = modal.querySelector("#fromTag").value.trim();
          const c = modal.querySelector("#rqCur").value;
          const a = Number(modal.querySelector("#rqAmt").value || 0);
          const reason = modal.querySelector("#rqReason").value;
          const ref = modal.querySelector("#rqRef").value || "—";

          if (!tag) return alert("Enter a tag.");
          if (a <= 0) return alert("Enter an amount.");

          addAlert({
            title: "Payment request created",
            sub: `${tag} • ${moneyFmt(c, a)}`,
            body: `Reason: ${reason}\nReference: ${ref}\nLayer 3 will notify the payer.`,
            icon: "🔔"
          });

          close();
        });
      }
    });
  }

  /* ---------------------------
     11) Services
  --------------------------- */

  function openCrossBorderFX() {
    openModal({
      title: "Cross-border FX",
      bodyHTML: `
        <form class="p54-form" id="fxForm">

          <div class="p54-row">
            <div>
              <div class="p54-label">Recipient name</div>
              <input class="p54-input" id="fxName" placeholder="Full name" required />
            </div>
            <div>
              <div class="p54-label">Account number</div>
              <input class="p54-input" id="fxAcct" placeholder="e.g. 3001234567" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="fxReason">
                <option value="Family support">Family support</option>
                <option value="Bills">Bills</option>
                <option value="Education">Education</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="fxRef" placeholder="e.g. school fees" />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">You send</div>
              <select class="p54-select" id="fxSendCur">
                ${fxSendCurrencies.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="fxAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">They receive</div>
              <select class="p54-select" id="fxRecvCur">
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
                <option value="KES">KES</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Estimated receive</div>
              <input class="p54-input" id="fxRecvAmt" disabled />
            </div>
          </div>

          <div class="p54-note">Mock rates applied (Layer 3 will use live rates).</div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelFX">Cancel</button>
            <button class="p54-btn primary" type="submit">Convert</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const sendCur = modal.querySelector("#fxSendCur");
        const recvCur = modal.querySelector("#fxRecvCur");
        const amt = modal.querySelector("#fxAmt");
        const recvAmt = modal.querySelector("#fxRecvAmt");

        function updateEstimate() {
          const a = Number(amt.value || 0);
          const rate = getFxRate(sendCur.value, recvCur.value);
          recvAmt.value = a ? (a * rate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "";
        }

        amt.addEventListener("input", updateEstimate);
        sendCur.addEventListener("change", updateEstimate);
        recvCur.addEventListener("change", updateEstimate);
        modal.querySelector("#cancelFX").addEventListener("click", close);

        modal.querySelector("#fxForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const balances = getBalances();

          const name = modal.querySelector("#fxName").value.trim();
          const acct = modal.querySelector("#fxAcct").value.trim();
          if (!name) return alert("Enter recipient name.");
          if (!acct) return alert("Enter recipient account number.");

          const s = sendCur.value;
          const r = recvCur.value;
          const a = Number(amt.value || 0);

          if (a <= 0) return alert("Enter an amount.");

          balances[s] = balances[s] ?? 0;
          balances[r] = balances[r] ?? 0;

          if (balances[s] < a) return alert(`Insufficient ${s} wallet balance.`);

          const rate = getFxRate(s, r);
          const out = a * rate;

          balances[s] -= a;
          balances[r] += out;

          setBalances(balances);

          const reason = modal.querySelector("#fxReason").value;
          const ref = modal.querySelector("#fxRef").value || "—";

          const tx = addTransaction({
            title: "Cross-border FX",
            currency: s,
            amount: -a,
            icon: "💱",
            meta: `To ${name} • ${acct} • ${s}→${r} • Ref: ${ref} • Reason: ${reason}`
          });

          addAlert({
            title: "FX completed",
            sub: `${moneyFmt(s, a)} → ${moneyFmt(r, out)}`,
            body: `Recipient: ${name} (${acct})\nReference: ${ref}\nReason: ${reason}`,
            icon: "💱"
          });

          openReceipt({
            title: "Cross-border FX",
            txId: tx.id,
            lines: [
              `Action: Cross-border FX`,
              `Recipient: ${name}`,
              `Account: ${acct}`,
              `Reason: ${reason}`,
              `Reference: ${ref}`,
              `You send: ${moneyFmt(s, a)}`,
              `They receive: ${moneyFmt(r, out)}`,
              `FX rate used: ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
          });

          close();
        });
      }
    });
  }

  function openShopOnTheFly() {
    const tag = "utm_source=pay54&utm_medium=affiliate&utm_campaign=shoponthefly";
    const urls = {
      taxi: `https://www.uber.com/gb/en/?${tag}`,
      food: `https://www.just-eat.co.uk/?${tag}`,
      flights: `https://www.skyscanner.net/?${tag}`,
      hotels: `https://www.booking.com/?${tag}`,
      tickets: `https://www.ticketmaster.co.uk/?${tag}`
    };

    openModal({
      title: "Shop on the Fly",
      bodyHTML: `
        <div class="p54-note"><b>Partner tiles</b> open in a new tab (demo). PAY54 affiliate tags included.</div>
        <div class="p54-divider"></div>

        <div class="p54-actions" style="justify-content:flex-start;">
          <button class="p54-btn" type="button" data-open="${urls.taxi}">Taxi / Ride-hailing</button>
          <button class="p54-btn" type="button" data-open="${urls.food}">Food delivery</button>
          <button class="p54-btn" type="button" data-open="${urls.flights}">Flights</button>
          <button class="p54-btn" type="button" data-open="${urls.hotels}">Hotels</button>
          <button class="p54-btn" type="button" data-open="${urls.tickets}">Tickets</button>
        </div>

        ${referralFooterHTML()}

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeShop">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelectorAll("[data-open]").forEach((b) => {
          b.addEventListener("click", () => window.open(b.getAttribute("data-open"), "_blank"));
        });
        modal.querySelector("#closeShop").addEventListener("click", close);
      }
    });
  }

  function openCards() {
    function cardListHTML() {
      const cards = getCards();
      const def = getDefaultCardId();
      if (!cards.length) return `<div class="p54-note">No cards yet. Add a card to continue.</div>`;

      return cards.map(cd => `
        <div class="p54-card">
          <div class="p54-card-left">
            <div class="p54-card-issuer">${cd.contactless ? "📶 " : ""}${cd.issuer} •••• ${cd.last4}</div>
            <div class="p54-card-meta">Expiry ${cd.expiry} • CVV ${cd.cvv} • Issuer: ${cd.issuer}</div>
            <div class="p54-card-meta"><b>Default:</b> ${cd.id === def ? "Yes" : "No"}</div>
          </div>
          <div class="p54-card-actions">
            <button class="p54-btn p54-mini" type="button" data-set-default="${cd.id}">Set default</button>
            <button class="p54-btn p54-mini" type="button" data-del-card="${cd.id}">Delete</button>
          </div>
        </div>
      `).join("");
    }

    openModal({
      title: "Virtual & Linked Cards",
      bodyHTML: `
        <div class="p54-note">
          Layer 2 demo:
          - Card display (contactless)
          - Set default card for ePOS spend
          - Delete card
          - Add card (manual + scan placeholder)
        </div>

        <div class="p54-divider"></div>

        <div id="cardList">${cardListHTML()}</div>

        <div class="p54-divider"></div>

        <form class="p54-form" id="addCardForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Issuer</div>
              <select class="p54-select" id="cIssuer">
                <option>VISA</option>
                <option>MASTERCARD</option>
                <option>AMEX</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Last 4 digits</div>
              <input class="p54-input" id="cLast4" maxlength="4" placeholder="1234" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Expiry (MM/YY)</div>
              <input class="p54-input" id="cExp" placeholder="08/28" required />
            </div>
            <div>
              <div class="p54-label">CVV (demo)</div>
              <input class="p54-input" id="cCvv" placeholder="***" required />
            </div>
          </div>

          <div class="p54-actions" style="justify-content:flex-start;">
            <button class="p54-btn" type="button" id="scanBtn">Scan card (camera)</button>
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn primary" type="submit">Add card</button>
            <button class="p54-btn" type="button" id="closeCards">Done</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const list = modal.querySelector("#cardList");

        function bindCardActions() {
          modal.querySelectorAll("[data-set-default]").forEach(btn => {
            btn.addEventListener("click", () => {
              setDefaultCardId(btn.getAttribute("data-set-default"));
              list.innerHTML = cardListHTML();
              bindCardActions();
              alert("Default card updated ✅");
            });
          });

          modal.querySelectorAll("[data-del-card]").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-del-card");
              const cards = getCards().filter(x => x.id !== id);
              setCards(cards);
              if (getDefaultCardId() === id) setDefaultCardId(cards[0] ? cards[0].id : "");
              list.innerHTML = cardListHTML();
              bindCardActions();
              alert("Card deleted ✅");
            });
          });
        }

        bindCardActions();

        modal.querySelector("#scanBtn").addEventListener("click", () => {
          alert("Camera scan approved — Layer 3 will use device camera APIs.");
        });

        modal.querySelector("#closeCards").addEventListener("click", close);

        modal.querySelector("#addCardForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const issuer = modal.querySelector("#cIssuer").value;
          const last4 = modal.querySelector("#cLast4").value.trim();
          const exp = modal.querySelector("#cExp").value.trim();
          const cvv = modal.querySelector("#cCvv").value.trim();
          if (!/^\d{4}$/.test(last4)) return alert("Last 4 digits must be 4 numbers.");

          const cards = getCards();
          const newCard = {
            id: uid("CARD"),
            issuer,
            last4,
            expiry: exp || "—",
            cvv: cvv || "***",
            contactless: true
          };
          cards.unshift(newCard);
          setCards(cards);
          if (!getDefaultCardId()) setDefaultCardId(newCard.id);

          list.innerHTML = cardListHTML();
          bindCardActions();
          alert("Card added ✅");
        });
      }
    });
  }

  function openBecomeAgent() {
    openModal({
      title: "Become an Agent",
      bodyHTML: `
        <form class="p54-form" id="agentForm">
          <div class="p54-note">Agent application requires <b>NIN</b> and a <b>selfie (real-time camera)</b> (demo UI).</div>

          <div>
            <div class="p54-label">Full name</div>
            <input class="p54-input" id="agentName" required />
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Phone</div>
              <input class="p54-input" id="agentPhone" required />
            </div>
            <div>
              <div class="p54-label">Area</div>
              <input class="p54-input" id="agentArea" placeholder="e.g. Thamesmead" required />
            </div>
          </div>

          <div>
            <div class="p54-label">NIN</div>
            <input class="p54-input" id="agentNin" placeholder="11 digits" maxlength="11" required />
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Selfie (camera)</div>
              <input class="p54-input" id="agentSelfieCam" type="file" accept="image/*" capture="user" />
            </div>
            <div>
              <div class="p54-label">Upload ID / Proof</div>
              <input class="p54-input" type="file" accept="image/*,.pdf" />
            </div>
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelAgent">Cancel</button>
            <button class="p54-btn primary" type="submit">Submit</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#cancelAgent").addEventListener("click", close);

        modal.querySelector("#agentForm").addEventListener("submit", (e) => {
          e.preventDefault();

          const nin = (modal.querySelector("#agentNin").value || "").trim();
          if (!/^\d{11}$/.test(nin)) return alert("NIN must be 11 digits.");

          addAlert({
            title: "Agent application submitted",
            sub: "Pending verification",
            body: "Your agent application has been submitted and will be reviewed.",
            icon: "🧾"
          });

          const tx = addTransaction({
            title: "Agent application",
            currency: activeDisplayCurrency(),
            amount: 0,
            icon: "🧾",
            meta: "Submitted"
          });

          openReceipt({
            title: "Become an Agent",
            txId: tx.id,
            lines: [
              `Action: Become an Agent`,
              `Status: Submitted`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
          });

          close();
        });
      }
    });
  }

  function placeholderService(title) {
    openModal({
      title,
      bodyHTML: `
        <div class="p54-note">
          This is wired (no dead buttons). Full flow + receipts will be expanded next (Layer 3).
        </div>
        ${referralFooterHTML()}
        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="okSvc">OK</button>
        </div>
      `,
      onMount: ({ modal, close }) => modal.querySelector("#okSvc").addEventListener("click", close)
    });
  }

  /* ---------------------------
     12) Utilities: ATM/POS Finder
  --------------------------- */

  function openFinder(kind) {
    const title = kind === "atm" ? "ATM Finder" : "POS / Agent Finder";
    const placeholder = kind === "atm" ? "e.g. Thamesmead, Greenwich" : "e.g. Thamesmead, SE28";
    const queryDefault = kind === "atm" ? "ATM near " : "POS agent near ";

    openModal({
      title,
      bodyHTML: `
        <div class="p54-note">Opens your map app in a new tab (demo).</div>
        <div class="p54-divider"></div>

        <div class="p54-form">
          <div>
            <div class="p54-label">Location</div>
            <input class="p54-input" id="loc" placeholder="${placeholder}" />
          </div>

          ${referralFooterHTML()}

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelF">Cancel</button>
            <button class="p54-btn primary" type="button" id="openF">Open Maps</button>
          </div>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const loc = modal.querySelector("#loc");
        modal.querySelector("#cancelF").addEventListener("click", close);
        modal.querySelector("#openF").addEventListener("click", () => {
          const q = encodeURIComponent(`${queryDefault}${loc.value || "me"}`);
          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
          close();
        });
      }
    });
  }

  if (atmFinderBtn) atmFinderBtn.addEventListener("click", () => openFinder("atm"));
  if (posFinderBtn) posFinderBtn.addEventListener("click", () => openFinder("pos"));

  /* ---------------------------
     13) Wiring Buttons in dashboard.html
  --------------------------- */

  // Top CTAs
  if (addMoneyBtn) addMoneyBtn.addEventListener("click", openAddMoney);
  if (withdrawBtn) withdrawBtn.addEventListener("click", openWithdraw);

  // Money Moves
  document.querySelectorAll(".tile-btn[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "send") return openSendPay54();
      if (action === "receive") return openReceive();
      if (action === "add") return openAddMoney();
      if (action === "withdraw") return openWithdraw();
      if (action === "banktransfer") return openBankTransfer();
      if (action === "request") return openRequestMoney();
    });
  });

  // Services
  document.querySelectorAll(".tile-btn[data-service]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.service;
      if (s === "fx") return openCrossBorderFX();
      if (s === "shop") return openShopOnTheFly();
      if (s === "cards") return openCards();
      if (s === "agent") return openBecomeAgent();
      if (s === "trading") return placeholderService("Trading — Shares • Stocks • Crypto");

      const names = {
        bills: "Pay Bills & Top-Up",
        savings: "Savings & Goals",
        checkout: "PAY54 Smart Checkout",
        bet: "Bet Funding",
        risk: "AI Risk Watch"
      };
      return placeholderService(names[s] || "Service");
    });
  });

  // Quick Shortcuts
  document.querySelectorAll("[data-shortcut]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.shortcut;
      if (s === "agent") return openBecomeAgent();
      if (s === "shop") return openShopOnTheFly();
      if (s === "referral") return placeholderService("Refer & Earn");
      if (s === "trading") return placeholderService("Trading — Shares • Stocks • Crypto");
    });
  });

  /* ---------------------------
     14) Init
  --------------------------- */

  // Seed data
  seedIfEmpty();

  // Init currency safely
  setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

  // Render panels
  renderRecentTxFeeds();
  renderAlerts();
  renderNews();

})();
