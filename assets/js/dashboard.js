/* =========================
   PAY54 Dashboard — Layer 2 Wiring — v805.2
   Full replacement for assets/js/dashboard.js

   Fixes included (approved):
   ✅ Default Light mode (web + mobile)
   ✅ Action buttons readable in light mode
   ✅ Currency switching hardened (storage validation + fallback)
   ✅ All actions update correct wallet balance (mobile + web consistent)
   ✅ Non-default currency transactions show FX equivalent line (based on selected currency at time)
   ✅ Bank Transfer: recipient name + reference + reason dropdown
   ✅ Cross-border FX: recipient details + reference + reason + enhanced receipt
   ✅ Virtual & Linked Cards: card UI, default card select, delete card, add card
   ✅ Shop on the Fly: affiliate params appended to URLs
   ✅ Investments -> Trading rename (Shares · Stocks · Crypto)
   ✅ Ledger: View all + Search
   ✅ Requests & Alerts seeded with 6 demo items + Clear all
   ✅ Quick Shortcuts: Option A (Replace Savings with Refer & Earn)
   ✅ Utility Card: ATM/POS Finder modal
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
    DEFAULT_CARD: "pay54_default_card",
    SEEDED: "pay54_seeded_v8052"
  };

  const supportedCurrencies = ["NGN", "GBP", "USD", "EUR", "GHS", "KES", "ZAR", "CAD", "AED", "AUD"];

  const defaultBalances = {
    NGN: 1250000.5,
    GBP: 8420.75,
    USD: 15320.4,
    EUR: 11890.2,
    GHS: 9650.0,
    KES: 132450.0,
    ZAR: 27890.6,
    CAD: 0,
    AED: 0,
    AUD: 0
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

  function moneyFmt(cur, amt) {
    const s = symbols[cur] ?? "";
    const n = Number(amt || 0);
    return `${s} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function uid(prefix = "TX") {
    return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  }

  function normalizeCurrency(cur) {
    const c = String(cur || "").toUpperCase().trim();
    return supportedCurrencies.includes(c) ? c : "NGN";
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

  /* ---------------------------
     FX Rate Engine (mock, snapshot per transaction)
     - Used for "equivalent line" when tx currency != selected currency at the time
  --------------------------- */

  function mockRate(from, to) {
    const f = normalizeCurrency(from);
    const t = normalizeCurrency(to);
    if (f === t) return 1;

    // Core table: major -> local
    const table = {
      USD: { NGN: 1650, GHS: 12.8, KES: 130, ZAR: 18.5 },
      GBP: { NGN: 2050, GHS: 16.1, KES: 165, ZAR: 23.0 },
      EUR: { NGN: 1800, GHS: 14.2, KES: 150, ZAR: 20.0 },
      CAD: { NGN: 1200, GHS: 9.5,  KES: 96,  ZAR: 13.0 },
      AED: { NGN: 450,  GHS: 3.6,  KES: 37,  ZAR: 5.0 },
      AUD: { NGN: 1100, GHS: 8.7,  KES: 90,  ZAR: 12.0 }
    };

    if (table[f] && table[f][t]) return table[f][t];
    if (table[t] && table[t][f]) return 1 / table[t][f];

    // If neither direct, fall back to 1 (demo-safe)
    return 1;
  }

  function buildEquivalent(currency, amount, baseCurrency) {
    const c = normalizeCurrency(currency);
    const base = normalizeCurrency(baseCurrency);
    if (c === base) return null;

    const rate = mockRate(c, base);
    const eq = Number(amount || 0) * rate;
    const pair = `${c}→${base}`;

    return {
      eqCurrency: base,
      eqAmount: eq,
      fxRate: rate,
      fxPair: pair
    };
  }

  /* ---------------------------
     1) DOM Hooks
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

  const viewAllTxBtn = document.getElementById("viewAllTx"); // desktop
  const viewAllTxMobileBtn = document.getElementById("viewAllTxMobile"); // mobile

  const atmFinderBtn = document.getElementById("atmFinderBtn");
  const newsFeed = document.getElementById("newsFeed");

  /* ---------------------------
     2) Modal System (injected)
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
        background: rgba(255,255,255,0.95);
        color: rgba(10,20,40,0.92);
        border: 1px solid rgba(10,20,40,0.12);
        box-shadow: 0 18px 50px rgba(20,40,80,0.18);
      }

      .p54-modal-head{
        display:flex; align-items:center; justify-content:space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.10);
      }
      body.light .p54-modal-head{ border-bottom: 1px solid rgba(10,20,40,0.10); }

      .p54-modal-title{ font-weight: 950; font-size: 15px; letter-spacing: .2px; }
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
      body.light .p54-btn{ border-color: rgba(10,20,40,0.14); background: rgba(10,20,40,0.04); }
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
      .p54-ledger-sub2{ opacity:.65; font-size:12px; margin-top:3px; }
      .p54-ledger-amt{ font-weight: 950; white-space:nowrap; }
      .p54-pos{ color: #22c55e; }
      .p54-neg{ color: #ef4444; }

      .p54-card-ui{
        border-radius: 18px;
        padding: 16px;
        border: 1px solid rgba(255,255,255,0.14);
        background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(255,255,255,0.06));
      }
      body.light .p54-card-ui{
        border-color: rgba(10,20,40,0.12);
        background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(10,20,40,0.03));
      }
      .p54-card-row{ display:flex; justify-content:space-between; align-items:center; }
      .p54-card-num{ font-weight: 950; letter-spacing: 1px; margin-top: 10px; }
      .p54-card-meta{ opacity:.78; font-size: 12px; margin-top: 8px; display:flex; justify-content:space-between; gap:10px; }
      .p54-badge{
        font-size: 12px; font-weight: 950;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.05);
        padding: 6px 10px; border-radius: 999px;
      }
      body.light .p54-badge{
        border-color: rgba(10,20,40,0.14);
        background: rgba(10,20,40,0.04);
      }

      .p54-small{ font-size: 12px; opacity: .82; }
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

  /* ---------------------------
     3) Theme (DEFAULT LIGHT) + Profile
  --------------------------- */

  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("light", t === "light");
    localStorage.setItem(LS.THEME, t);

    if (themeToggle) {
      const icon = themeToggle.querySelector(".icon");
      // light mode shows moon (switch to dark), dark mode shows sun (switch to light)
      if (icon) icon.textContent = t === "light" ? "🌙" : "☀️";
    }
  }

  // ✅ Default Light mode if nothing saved
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
          <div class="p54-actions"><button class="p54-btn primary" type="button" id="okBtn">OK</button></div>
        `,
        onMount: ({ modal, close }) => modal.querySelector("#okBtn").addEventListener("click", close)
      });
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(LS.CURRENCY);
      // Keep theme preference
      window.location.href = "login.html";
    });
  }

  /* ---------------------------
     4) Currency Switching (hardened)
  --------------------------- */

  function setActiveCurrency(cur) {
    const balances = getBalances();
    const c = normalizeCurrency(cur);

    pillBtns.forEach((b) => {
      const isActive = b.dataset.cur === c;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (currencySelect) currencySelect.value = c;

    if (balanceEl) {
      const amt = Number(balances[c] ?? 0);
      balanceEl.textContent = moneyFmt(c, amt);
    }

    localStorage.setItem(LS.CURRENCY, c);
  }

  pillBtns.forEach((btn) => {
    btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur));
  });

  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));
  }

  // Init currency (validated)
  setActiveCurrency(normalizeCurrency(localStorage.getItem(LS.CURRENCY)));

  /* ---------------------------
     5) Seed Demo Data (once)
  --------------------------- */

  function seedIfNeeded() {
    if (localStorage.getItem(LS.SEEDED) === "1") return;

    // Seed alerts (5–6 lines)
    const demoAlerts = [
      {
        id: uid("AL"),
        title: "All clear",
        sub: "No requests or alerts",
        body: "You're good to go. No pending items.",
        icon: "✅"
      },
      {
        id: uid("AL"),
        title: "Payment request",
        sub: "@john • ₦ 45,000.00",
        body: "John requested a payment. Review and approve in Layer 3.",
        icon: "🔔"
      },
      {
        id: uid("AL"),
        title: "FX rate alert",
        sub: "GBP→NGN volatility rising",
        body: "Consider converting when rates stabilise (demo insight).",
        icon: "⚠️"
      },
      {
        id: uid("AL"),
        title: "Security check",
        sub: "Device verified",
        body: "New device verification completed successfully.",
        icon: "🛡️"
      },
      {
        id: uid("AL"),
        title: "Referral reward",
        sub: "You earned ₦ 1,000.00",
        body: "A friend signed up using your referral code.",
        icon: "🎁"
      },
      {
        id: uid("AL"),
        title: "Agent update",
        sub: "Verification pending",
        body: "Your agent verification is in progress (demo).",
        icon: "🧾"
      }
    ];
    setAlerts(demoAlerts);

    // Seed transactions (so Recent Tx + ledger search works immediately)
    const stamp = nowStamp();
    const demoTx = [
      {
        id: uid("TX"),
        title: "Wallet funding",
        currency: "NGN",
        amount: 250000,
        icon: "💳",
        meta: "Via Card",
        timeISO: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        timeLabel: "2 mins ago"
      },
      {
        id: uid("TX"),
        title: "Transfer to John",
        currency: "NGN",
        amount: -45000,
        icon: "↗️",
        meta: "To @john",
        timeISO: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        timeLabel: "Yesterday"
      },
      {
        id: uid("TX"),
        title: "Airtime purchase",
        currency: "NGN",
        amount: -2500,
        icon: "📶",
        meta: "MTN top-up",
        timeISO: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        timeLabel: "3 days ago"
      }
    ];

    setTx(demoTx);
    localStorage.setItem(LS.SEEDED, "1");
  }

  seedIfNeeded();

  /* ---------------------------
     6) Render: Alerts, News, Recent Transactions
  --------------------------- */

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
              <div class="muted">${item.sub || ""}</div>
              <div class="p54-divider"></div>
              <div>${item.body || "Details will be expanded in Layer 3."}</div>
            </div>
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
    if (!newsFeed) return;
    const items = [
      { icon: "💡", title: "USD–NGN volatility rising", sub: "Market insight" },
      { icon: "🔐", title: "Keep your account secure", sub: "Security tip" },
      { icon: "🏆", title: "Complete 3 transfers today", sub: "Earn a streak badge" }
    ];
    newsFeed.innerHTML = items.map(n => `
      <div class="feed-item">
        <div class="feed-icon">${n.icon}</div>
        <div class="feed-main">
          <div class="feed-title">${n.title}</div>
          <div class="feed-sub">${n.sub}</div>
        </div>
      </div>
    `).join("");
  }

  function recentTxFeeds() {
    return Array.from(document.querySelectorAll('[data-role="recentTxFeed"]'));
  }

  function renderRecentTx() {
    const feeds = recentTxFeeds();
    if (!feeds.length) return;

    const list = getTx().slice(0, 5);

    const html = (list.length ? list : []).map(tx => {
      const amtClass = tx.amount >= 0 ? "pos" : "neg";
      const sign = tx.amount >= 0 ? "+" : "−";
      const eqLine = tx.eqCurrency
        ? `<div class="feed-sub2">≈ ${moneyFmt(tx.eqCurrency, Math.abs(tx.eqAmount))} • FX ${tx.fxPair} @ ${tx.fxRate}</div>`
        : "";

      return `
        <div class="feed-item">
          <div class="feed-icon">${tx.icon || "💳"}</div>
          <div class="feed-main">
            <div class="feed-title">${tx.title}</div>
            <div class="feed-sub">${tx.timeLabel || ""}${tx.meta ? ` • ${tx.meta}` : ""}</div>
            ${eqLine}
          </div>
          <div class="feed-amt ${amtClass}">${sign} ${moneyFmt(tx.currency, Math.abs(tx.amount))}</div>
        </div>
      `;
    }).join("") || `
      <div class="feed-item">
        <div class="feed-icon">🧾</div>
        <div class="feed-main">
          <div class="feed-title">No transactions yet</div>
          <div class="feed-sub">Start by adding money or sending a transfer</div>
        </div>
      </div>
    `;

    feeds.forEach(f => f.innerHTML = html);
  }

  // Init renders
  renderAlerts();
  renderNews();
  renderRecentTx();

  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      setAlerts([]);
      renderAlerts();
    });
  }

  /* ---------------------------
     7) Transactions + Alerts helpers
  --------------------------- */

  function addTransaction({ title, currency, amount, icon, meta }) {
    const stamp = nowStamp();
    const active = normalizeCurrency(localStorage.getItem(LS.CURRENCY));
    const c = normalizeCurrency(currency);

    const eq = buildEquivalent(c, Number(amount), active);

    const tx = {
      id: uid("TX"),
      title,
      currency: c,
      amount: Number(amount),
      icon: icon || "💳",
      meta: meta || "",
      timeISO: stamp.iso,
      timeLabel: stamp.label,
      ...(eq || {})
    };

    const list = getTx();
    list.unshift(tx);
    setTx(list);

    renderRecentTx();
    return tx;
  }

  function addAlert({ title, sub, body, icon }) {
    const a = {
      id: uid("AL"),
      title,
      sub,
      body,
      icon: icon || "🔔"
    };
    const list = getAlerts();
    list.unshift(a);
    setAlerts(list);
    renderAlerts();
    return a;
  }

  function openReceipt({ title, lines, txId }) {
    const text = lines.join("\n");
    openModal({
      title: "Receipt",
      bodyHTML: `
        <div class="p54-receipt">
          <b>${title}</b>
          <div class="muted">Transaction ID: ${txId}</div>
          <div class="p54-divider"></div>
          <pre style="margin:0; white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;">${text}</pre>
        </div>
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
     8) Ledger (View all) + Search
  --------------------------- */

  function renderLedgerList(ledgerEl, list, query) {
    const q = String(query || "").trim().toLowerCase();

    const filtered = !q ? list : list.filter(tx => {
      const hay = [
        tx.id, tx.title, tx.currency, tx.meta,
        tx.eqCurrency, tx.fxPair
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });

    ledgerEl.innerHTML = (filtered.length ? filtered : []).slice(0, 80).map(tx => {
      const cls = tx.amount >= 0 ? "p54-pos" : "p54-neg";
      const sign = tx.amount >= 0 ? "+" : "−";
      const eqLine = tx.eqCurrency
        ? `<div class="p54-ledger-sub2">≈ ${moneyFmt(tx.eqCurrency, Math.abs(tx.eqAmount))} • FX ${tx.fxPair} @ ${tx.fxRate}</div>`
        : "";
      return `
        <div class="p54-ledger-item">
          <div class="p54-ledger-left">
            <div class="p54-ledger-title">${tx.icon || "💳"} ${tx.title}</div>
            <div class="p54-ledger-sub">${new Date(tx.timeISO).toLocaleString()}${tx.meta ? ` • ${tx.meta}` : ""}</div>
            ${eqLine}
          </div>
          <div class="p54-ledger-amt ${cls}">
            ${sign} ${moneyFmt(tx.currency, Math.abs(tx.amount))}
          </div>
        </div>
      `;
    }).join("") || `<div class="p54-note">No transactions found.</div>`;
  }

  function openLedger() {
    const list = getTx();
    openModal({
      title: "Transaction History",
      bodyHTML: `
        <div class="p54-note">Search by title, currency, amount, meta, or ID.</div>
        <div class="p54-divider"></div>
        <input class="p54-ledger-search" id="ledgerSearch" placeholder="Search transactions..." />
        <div class="p54-divider"></div>
        <div class="p54-ledger" id="ledgerList"></div>
        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeLedger">Close</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const ledger = modal.querySelector("#ledgerList");
        const search = modal.querySelector("#ledgerSearch");

        renderLedgerList(ledger, list, "");

        search.addEventListener("input", () => {
          renderLedgerList(ledger, list, search.value);
        });

        modal.querySelector("#closeLedger").addEventListener("click", close);
      }
    });
  }

  if (viewAllTxBtn) viewAllTxBtn.addEventListener("click", openLedger);
  if (viewAllTxMobileBtn) viewAllTxMobileBtn.addEventListener("click", openLedger);

  /* ---------------------------
     9) Money Moves Actions
  --------------------------- */

  function openSendPay54() {
    const cur = normalizeCurrency(localStorage.getItem(LS.CURRENCY));
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
          const c = normalizeCurrency(curSel.value);
          const a = Number(amt.value || 0);
          const fee = calcFee(a);
          const total = a + fee;

          if (total <= 0) return alert("Enter a valid amount.");
          if ((balances[c] ?? 0) < total) return alert("Insufficient balance.");

          balances[c] = (balances[c] ?? 0) - total;
          setBalances(balances);

          // keep selected currency display, but update actual balances correctly
          setActiveCurrency(normalizeCurrency(localStorage.getItem(LS.CURRENCY)));

          const toTag = modal.querySelector("#toTag").value.trim();

          const tx = addTransaction({
            title: "PAY54 transfer sent",
            currency: c,
            amount: -total,
            icon: "↗️",
            meta: `To ${toTag}`
          });

          openReceipt({
            title: "PAY54 → PAY54 Transfer",
            txId: tx.id,
            lines: [
              `Action: Send PAY54 → PAY54`,
              `To: ${toTag}`,
              `Amount: ${moneyFmt(c, a)}`,
              `Fee: ${moneyFmt(c, fee)}`,
              `Total: ${moneyFmt(c, total)}`,
              tx.eqCurrency ? `Equivalent: ≈ ${moneyFmt(tx.eqCurrency, Math.abs(tx.eqAmount))} (FX ${tx.fxPair} @ ${tx.fxRate})` : "",
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
          <b>Receive money</b>
          <div class="muted">Share your account and PAY54 tag.</div>
          <div class="p54-divider"></div>
          <div><b>Acct:</b> 3001234567</div>
          <div><b>Tag:</b> @pay54-user</div>
          <div class="p54-divider"></div>
          <div class="p54-actions" style="justify-content:flex-start;">
            <button class="p54-btn" type="button" id="copyTag">Copy Tag</button>
            <button class="p54-btn" type="button" id="shareWA">Share WhatsApp</button>
          </div>
        </div>
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
    const cur = normalizeCurrency(localStorage.getItem(LS.CURRENCY));
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
          const c = normalizeCurrency(modal.querySelector("#addCur").value);
          const a = Number(modal.querySelector("#addAmt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");

          balances[c] = (balances[c] ?? 0) + a;
          setBalances(balances);
          setActiveCurrency(normalizeCurrency(localStorage.getItem(LS.CURRENCY)));

          const tx = addTransaction({
            title: "Wallet funding",
            currency: c,
            amount: +a,
            icon: "💳",
            meta: `Via ${modal.querySelector("#method").value}`
          });

          openReceipt({
            title: "Add money",
            txId: tx.id,
            lines: [
              `Action: Add money`,
              `Method: ${modal.querySelector("#method").value}`,
              `Currency: ${c}`,
              `Amount: ${moneyFmt(c, a)}`,
              tx.eqCurrency ? `Equivalent: ≈ ${moneyFmt(tx.eqCurrency, Math.abs(tx.eqAmount))} (FX ${tx.fxPair} @ ${tx.fxRate})` : "",
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ].filter(Boolean)
          });

          close();
        });
      }
    });
  }

  function openWithdraw() {
    const cur = normalizeCurrency(localStorage.getItem(LS.CURRENCY));
    openModal({
      title: "Withdraw",
      bodyHTML: `
        <form class="p54-form" id="wdForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Route</div>
              <select class="p54-select" id="wdRoute">
                <option value="Bank">Bank</option>
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
          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="wdAmt" type="number" step="0.01" min="0" required />
          </div>
          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelWd">Cancel</button>
            <button class="p54-btn primary" type="submit">Withdraw</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const form = modal.querySelector("#wdForm");
        modal.querySelector("#cancelWd").addEventListener("click", close);

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const balances = getBalances();
          const c = normalizeCurrency(modal.querySelector("#wdCur").value);
          const a = Number(modal.querySelector("#wdAmt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");
          if ((balances[c] ?? 0) < a) return alert("Insufficient balance.");

          balances[c] = (balances[c] ?? 0) - a;
          setBalances(balances);
          setActiveCurrency(normalizeCurrency(localStorage.getItem(LS.CURRENCY)));

          const tx = addTransaction({
            title: "Withdrawal",
            currency: c,
            amount: -a,
            icon: "🏧",
            meta: `Via ${modal.querySelector("#wdRoute").value}`
          });

          openReceipt({
            title: "Withdraw",
            txId: tx.id,
            lines: [
              `Action: Withdraw`,
              `Route: ${modal.querySelector("#wdRoute").value}`,
              `Currency: ${c}`,
              `Amount: ${moneyFmt(c, a)}`,
              tx.eqCurrency ? `Equivalent: ≈ ${moneyFmt(tx.eqCurrency, Math.abs(tx.eqAmount))} (FX ${tx.fxPair} @ ${tx.fxRate})` : "",
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
          <div>
            <div class="p54-label">Bank</div>
            <select class="p54-select" id="bank">
              <option>GTBank</option>
              <option>Access Bank</option>
              <option>Zenith</option>
              <option>UBA</option>
              <option>FirstBank</option>
            </select>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Recipient Account Number</div>
              <input class="p54-input" id="acct" maxlength="10" placeholder="10 digits" required />
            </div>
            <div>
              <div class="p54-label">Recipient Account Name</div>
              <input class="p54-input" id="acctName" placeholder="Full name" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="reason">
                <option value="Family support">Family support</option>
                <option value="School fees">School fees</option>
                <option value="Business">Business</option>
                <option value="Rent">Rent</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="ref" placeholder="e.g. January support" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Amount (NGN)</div>
              <input class="p54-input" id="amt" type="number" step="0.01" min="0" required />
            </div>
            <div>
              <div class="p54-label">Fee (demo)</div>
              <input class="p54-input" id="fee" disabled />
            </div>
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelBT">Cancel</button>
            <button class="p54-btn primary" type="submit">Transfer</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const acct = modal.querySelector("#acct");
        const amt = modal.querySelector("#amt");
        const fee = modal.querySelector("#fee");

        function calcFee(a) {
          const n = Number(a || 0);
          return Math.min(n * 0.005, 200);
        }
        function updateFee() {
          fee.value = amt.value ? moneyFmt("NGN", calcFee(amt.value)) : "";
        }

        amt.addEventListener("input", updateFee);

        modal.querySelector("#cancelBT").addEventListener("click", close);

        modal.querySelector("#btForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const acctVal = acct.value.trim();
          if (!/^\d{10}$/.test(acctVal)) return alert("Account number must be 10 digits.");

          const acctName = modal.querySelector("#acctName").value.trim();
          const ref = modal.querySelector("#ref").value.trim();
          const reason = modal.querySelector("#reason").value;

          if (!acctName) return alert("Enter recipient account name.");
          if (!ref) return alert("Enter a reference.");

          const balances = getBalances();
          const a = Number(amt.value || 0);
          const f = calcFee(a);
          const total = a + f;

          if (a <= 0) return alert("Enter a valid amount.");
          if ((balances.NGN ?? 0) < total) return alert("Insufficient NGN balance.");

          balances.NGN -= total;
          setBalances(balances);
          setActiveCurrency(normalizeCurrency(localStorage.getItem(LS.CURRENCY)));

          const bank = modal.querySelector("#bank").value;

          const tx = addTransaction({
            title: "Bank transfer",
            currency: "NGN",
            amount: -total,
            icon: "🏦",
            meta: `${bank} • ${acctName} • ${acctVal} • Ref: ${ref}`
          });

          openReceipt({
            title: "Bank Transfer",
            txId: tx.id,
            lines: [
              `Action: Bank transfer`,
              `Bank: ${bank}`,
              `Recipient: ${acctName}`,
              `Account: ${acctVal}`,
              `Reason: ${reason}`,
              `Reference: ${ref}`,
              `Amount: ${moneyFmt("NGN", a)}`,
              `Fee: ${moneyFmt("NGN", f)}`,
              `Total: ${moneyFmt("NGN", total)}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
          });

          close();
        });
      }
    });
  }

  function openRequestMoney() {
    const cur = normalizeCurrency(localStorage.getItem(LS.CURRENCY));
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
                ${Object.keys(getBalances()).map(c => `<option value="${c}" ${c===cur?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="rqAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

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
          const c = normalizeCurrency(modal.querySelector("#rqCur").value);
          const a = Number(modal.querySelector("#rqAmt").value || 0);

          if (!tag) return alert("Enter a tag.");
          if (a <= 0) return alert("Enter an amount.");

          addAlert({
            title: "Payment request",
            sub: `${tag} • ${moneyFmt(c, a)}`,
            body: `Request created for ${tag}. In Layer 3 this will notify the payer.`,
            icon: "🔔"
          });

          close();
        });
      }
    });
  }

  /* ---------------------------
     10) Services
  --------------------------- */

  function openCrossBorderFX() {
    openModal({
      title: "Cross-border FX",
      bodyHTML: `
        <form class="p54-form" id="fxForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Recipient Name</div>
              <input class="p54-input" id="fxName" placeholder="Full name" required />
            </div>
            <div>
              <div class="p54-label">Recipient Account Number</div>
              <input class="p54-input" id="fxAcct" placeholder="Account number" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="fxReason">
                <option value="Family support">Family support</option>
                <option value="School fees">School fees</option>
                <option value="Business">Business</option>
                <option value="Rent">Rent</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="fxRef" placeholder="e.g. Tuition support" required />
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
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <div>
              <div class="p54-label">Estimated receive</div>
              <input class="p54-input" id="fxRecvAmt" disabled />
            </div>
          </div>

          <div class="p54-note" id="fxNote">Mock rate applied (Layer 3 will use live rates).</div>

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
        const fxNote = modal.querySelector("#fxNote");

        function updateEstimate() {
          const a = Number(amt.value || 0);
          const rate = mockRate(sendCur.value, recvCur.value);
          recvAmt.value = a ? (a * rate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "";
          fxNote.textContent = `Rate snapshot: 1 ${sendCur.value} = ${rate} ${recvCur.value} (demo)`;
        }

        amt.addEventListener("input", updateEstimate);
        sendCur.addEventListener("change", updateEstimate);
        recvCur.addEventListener("change", updateEstimate);
        modal.querySelector("#cancelFX").addEventListener("click", close);

        modal.querySelector("#fxForm").addEventListener("submit", (e) => {
          e.preventDefault();

          const name = modal.querySelector("#fxName").value.trim();
          const acct = modal.querySelector("#fxAcct").value.trim();
          const reason = modal.querySelector("#fxReason").value;
          const ref = modal.querySelector("#fxRef").value.trim();

          if (!name) return alert("Enter recipient name.");
          if (!acct) return alert("Enter recipient account number.");
          if (!ref) return alert("Enter a reference.");

          const balances = getBalances();
          const s = normalizeCurrency(sendCur.value);
          const r = normalizeCurrency(recvCur.value);
          const a = Number(amt.value || 0);
          if (a <= 0) return alert("Enter an amount.");

          balances[s] = balances[s] ?? 0;
          if (balances[s] < a) return alert(`Insufficient ${s} balance.`);

          const rate = mockRate(s, r);
          const out = a * rate;

          // Cross-border FX is an outbound send (debit only) in demo
          balances[s] -= a;
          setBalances(balances);
          setActiveCurrency(normalizeCurrency(localStorage.getItem(LS.CURRENCY)));

          const tx = addTransaction({
            title: "Cross-border FX sent",
            currency: s,
            amount: -a,
            icon: "💱",
            meta: `${name} • ${r} receive • Ref: ${ref}`
          });

          addAlert({
            title: "FX sent",
            sub: `${moneyFmt(s, a)} → ≈ ${moneyFmt(r, out)}`,
            body: `Recipient: ${name} (${acct}) • Reason: ${reason} • Ref: ${ref}`,
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
              `You sent: ${moneyFmt(s, a)}`,
              `They receive (est): ${moneyFmt(r, out)}`,
              `Rate snapshot: 1 ${s} = ${rate} ${r}`,
              tx.eqCurrency ? `Equivalent: ≈ ${moneyFmt(tx.eqCurrency, Math.abs(tx.eqAmount))} (FX ${tx.fxPair} @ ${tx.fxRate})` : "",
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ].filter(Boolean)
          });

          close();
        });

        updateEstimate();
      }
    });
  }

  function openShopOnTheFly() {
    const aff = "utm_source=pay54&utm_medium=app&utm_campaign=shop_on_the_fly&aff=PAY54";
    const links = [
      { label: "Taxi / Ride-hailing", url: `https://www.uber.com/gb/en/?${aff}` },
      { label: "Food delivery", url: `https://www.just-eat.co.uk/?${aff}` },
      { label: "Flights", url: `https://www.skyscanner.net/?${aff}` },
      { label: "Hotels", url: `https://www.booking.com/?${aff}` },
      { label: "Tickets", url: `https://www.ticketmaster.co.uk/?${aff}` }
    ];

    openModal({
      title: "Shop on the Fly",
      bodyHTML: `
        <div class="p54-note"><b>Partner tiles</b> open in a new tab (demo). Affiliate tracking is appended.</div>
        <div class="p54-divider"></div>
        <div class="p54-actions" style="justify-content:flex-start;">
          ${links.map(l => `<button class="p54-btn" type="button" data-open="${l.url}">${l.label}</button>`).join("")}
        </div>
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
    function mask(num) {
      const s = String(num || "").replace(/\s+/g, "");
      if (s.length < 8) return "**** **** **** 0000";
      return `**** **** **** ${s.slice(-4)}`;
    }

    function renderCardsUI(modal) {
      const cards = getCards();
      const defId = localStorage.getItem(LS.DEFAULT_CARD) || "";
      const listEl = modal.querySelector("#cardsList");

      if (!cards.length) {
        listEl.innerHTML = `<div class="p54-note">No cards yet. Add a card to enable POS/ePOS payments.</div>`;
        return;
      }

      listEl.innerHTML = cards.map(c => {
        const isDef = c.id === defId;
        return `
          <div class="p54-receipt" style="margin-bottom:10px;">
            <div class="p54-card-ui">
              <div class="p54-card-row">
                <div class="p54-badge">${isDef ? "Default" : "Linked"}</div>
                <div style="font-size:18px;">📶</div>
              </div>
              <div class="p54-card-num">${mask(c.number)}</div>
              <div class="p54-card-meta">
                <span>${c.name || "PAY54 User"}</span>
                <span>EXP ${c.exp || "--/--"}</span>
              </div>
            </div>

            <div class="p54-actions" style="justify-content:flex-start; margin-top:10px;">
              <button class="p54-btn" type="button" data-set-default="${c.id}">${isDef ? "Default selected" : "Set default"}</button>
              <button class="p54-btn" type="button" data-delete-card="${c.id}">Delete</button>
            </div>

            <div class="p54-small">Default card will be used for POS/ePOS approvals (Layer 3).</div>
          </div>
        `;
      }).join("");

      listEl.querySelectorAll("[data-set-default]").forEach(b => {
        b.addEventListener("click", () => {
          localStorage.setItem(LS.DEFAULT_CARD, b.getAttribute("data-set-default"));
          renderCardsUI(modal);
          alert("Default card updated ✅");
        });
      });

      listEl.querySelectorAll("[data-delete-card]").forEach(b => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-delete-card");
          const next = getCards().filter(x => x.id !== id);
          setCards(next);
          if ((localStorage.getItem(LS.DEFAULT_CARD) || "") === id) {
            localStorage.removeItem(LS.DEFAULT_CARD);
          }
          renderCardsUI(modal);
          alert("Card deleted ✅");
        });
      });
    }

    openModal({
      title: "Virtual & Linked Cards",
      bodyHTML: `
        <div class="p54-note">
          Layer 2 demo:
          - View card display (contactless)
          - Set default card for POS/ePOS approvals
          - Delete card
          <br><br>
          <b>Camera scan (approved):</b> Layer 3 will use device APIs.
        </div>

        <div class="p54-divider"></div>

        <div id="cardsList"></div>

        <div class="p54-divider"></div>

        <form class="p54-form" id="addCardForm">
          <div class="p54-row">
            <div>
              <div class="p54-label">Cardholder name</div>
              <input class="p54-input" id="cardName" placeholder="Name on card" required />
            </div>
            <div>
              <div class="p54-label">Expiry (MM/YY)</div>
              <input class="p54-input" id="cardExp" placeholder="08/28" required />
            </div>
          </div>
          <div>
            <div class="p54-label">Card number</div>
            <input class="p54-input" id="cardNum" placeholder="16 digits" required />
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="scanBtn">Scan card (camera)</button>
            <button class="p54-btn primary" type="submit">Add card</button>
          </div>
        </form>

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeCards">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        // seed one demo card if none
        if (!getCards().length) {
          const demo = [{
            id: uid("CARD"),
            name: storedName || "PAY54 User",
            number: "4111111111114832",
            exp: "08/28"
          }];
          setCards(demo);
          localStorage.setItem(LS.DEFAULT_CARD, demo[0].id);
        }

        renderCardsUI(modal);

        modal.querySelector("#scanBtn").addEventListener("click", () => {
          alert("Camera scan approved — Layer 3 will use device camera APIs.");
        });

        modal.querySelector("#addCardForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const name = modal.querySelector("#cardName").value.trim();
          const exp = modal.querySelector("#cardExp").value.trim();
          const num = modal.querySelector("#cardNum").value.replace(/\s+/g, "");

          if (!/^\d{16}$/.test(num)) return alert("Card number must be 16 digits (demo validation).");
          if (!/^\d{2}\/\d{2}$/.test(exp)) return alert("Expiry must be MM/YY.");

          const cards = getCards();
          const newCard = { id: uid("CARD"), name, number: num, exp };
          cards.unshift(newCard);
          setCards(cards);

          if (!localStorage.getItem(LS.DEFAULT_CARD)) {
            localStorage.setItem(LS.DEFAULT_CARD, newCard.id);
          }

          renderCardsUI(modal);
          alert("Card added ✅");
          e.target.reset();
        });

        modal.querySelector("#closeCards").addEventListener("click", close);
      }
    });
  }

  function openBecomeAgent() {
    openModal({
      title: "Become an Agent",
      bodyHTML: `
        <form class="p54-form" id="agentForm">
          <div class="p54-note">Agent application requires <b>NIN</b> + <b>Selfie (camera)</b> + ID documents (approved).</div>

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

          <div class="p54-row">
            <div>
              <div class="p54-label">NIN</div>
              <input class="p54-input" id="agentNIN" placeholder="National ID Number" required />
            </div>
            <div>
              <div class="p54-label">Selfie (camera)</div>
              <input class="p54-input" id="agentSelfie" type="file" accept="image/*" capture="user" required />
            </div>
          </div>

          <div>
            <div class="p54-label">Upload ID documents (license / proof)</div>
            <input class="p54-input" type="file" accept="image/*,.pdf" multiple />
          </div>

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

          const nin = modal.querySelector("#agentNIN").value.trim();
          const selfie = modal.querySelector("#agentSelfie").files?.[0];

          if (!nin) return alert("NIN is required.");
          if (!selfie) return alert("Please take a selfie (camera).");

          addAlert({
            title: "Agent application submitted",
            sub: "Pending verification",
            body: "Your agent application has been submitted and will be reviewed.",
            icon: "🧾"
          });

          const tx = addTransaction({
            title: "Agent application",
            currency: normalizeCurrency(localStorage.getItem(LS.CURRENCY)),
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
        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="okSvc">OK</button>
        </div>
      `,
      onMount: ({ modal, close }) => modal.querySelector("#okSvc").addEventListener("click", close)
    });
  }

  /* ---------------------------
     11) Quick Shortcuts: Refer & Earn + Trading
  --------------------------- */

  function openReferEarn() {
    const base = (storedName || "PAY54").replace(/\s+/g, "").slice(0, 5).toUpperCase();
    const code = `PAY54-${base}-${String(Date.now()).slice(-4)}`;

    openModal({
      title: "Refer & Earn",
      bodyHTML: `
        <div class="p54-receipt">
          <b>Your referral code</b>
          <div class="p54-divider"></div>
          <div style="font-weight:950; font-size:18px; letter-spacing:1px;">${code}</div>
          <div class="p54-divider"></div>
          <div class="p54-note">Invite friends. Earn rewards when they verify and transact (Layer 3 rules).</div>
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="copyRef">Copy</button>
          <button class="p54-btn" type="button" id="shareRef">WhatsApp</button>
          <button class="p54-btn primary" type="button" id="doneRef">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#doneRef").addEventListener("click", close);
        modal.querySelector("#copyRef").addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(code);
            alert("Copied ✅");
          } catch {
            alert("Copy failed.");
          }
        });
        modal.querySelector("#shareRef").addEventListener("click", () => {
          const msg = `Join PAY54 using my referral code: ${code}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
        });
      }
    });
  }

  function openATMPOSFinder() {
    openModal({
      title: "ATM & POS Finder",
      bodyHTML: `
        <div class="p54-note">
          Layer 2 demo utility. Layer 3 will use GPS + map providers + agent network.
        </div>
        <div class="p54-divider"></div>

        <div class="p54-receipt">
          <b>Quick actions</b>
          <div class="p54-divider"></div>
          <div class="p54-actions" style="justify-content:flex-start;">
            <button class="p54-btn" type="button" data-map="ATM near me">ATM near me</button>
            <button class="p54-btn" type="button" data-map="POS terminal near me">POS terminals</button>
            <button class="p54-btn" type="button" data-map="Money agent near me">Agents</button>
          </div>
        </div>

        <div class="p54-divider"></div>

        <div class="p54-receipt">
          <b>Suggested nearby (demo)</b>
          <div class="p54-divider"></div>
          <div class="p54-small">• PAY54 Agent Hub — Thamesmead</div>
          <div class="p54-small">• GTBank ATM — Central</div>
          <div class="p54-small">• Access POS Cluster — High Street</div>
        </div>

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeATM">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelectorAll("[data-map]").forEach(b => {
          b.addEventListener("click", () => {
            const q = encodeURIComponent(b.getAttribute("data-map"));
            window.open(`https://www.google.com/maps/search/${q}`, "_blank");
          });
        });
        modal.querySelector("#closeATM").addEventListener("click", close);
      }
    });
  }

  if (atmFinderBtn) atmFinderBtn.addEventListener("click", openATMPOSFinder);

  /* ---------------------------
     12) Wiring Buttons in dashboard.html
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
      if (s === "trading") return placeholderService("Trading — Shares · Stocks · Crypto");

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
      if (s === "referral") return openReferEarn();
      if (s === "trading") return placeholderService("Trading — Shares · Stocks · Crypto");
    });
  });

})();
