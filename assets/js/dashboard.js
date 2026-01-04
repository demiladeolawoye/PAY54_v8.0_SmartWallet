/* =========================
   PAY54 Dashboard — Layer 2 Wiring (v8.0.1 FINAL)
   SAFE full replacement for assets/js/dashboard.js
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
    ALERTS: "pay54_alerts"
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
    NGN: "₦", GBP: "£", USD: "$", EUR: "€",
    GHS: "₵", KES: "KSh", ZAR: "R",
    CAD: "C$", AED: "د.إ", AUD: "A$"
  };

  const fxSendCurrencies = ["USD", "GBP", "EUR", "CAD", "AED", "AUD"];

  const safeJSON = (v, f) => { try { return JSON.parse(v); } catch { return f; } };

  const getBalances = () => safeJSON(localStorage.getItem(LS.BALANCES), defaultBalances);
  const setBalances = b => localStorage.setItem(LS.BALANCES, JSON.stringify(b));
  const getTx = () => safeJSON(localStorage.getItem(LS.TX), []);
  const setTx = t => localStorage.setItem(LS.TX, JSON.stringify(t));
  const getAlerts = () => safeJSON(localStorage.getItem(LS.ALERTS), []);
  const setAlerts = a => localStorage.setItem(LS.ALERTS, JSON.stringify(a));

  const nowStamp = () => {
    const d = new Date();
    return { iso: d.toISOString(), label: d.toLocaleString() };
  };

  const moneyFmt = (c, a) =>
    `${symbols[c] || ""} ${Number(a || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const uid = p => `${p}-${Math.random().toString(16).slice(2)}-${Date.now()}`;

  /* ---------------------------
     1) DOM HOOKS (SAFE)
  --------------------------- */

  const $ = id => document.getElementById(id);

  const balanceEl = $("balanceAmount");
  const pillBtns = document.querySelectorAll(".currency");
  const currencySelect = $("currencySelect");
  const themeToggle = $("themeToggle");
  const profileBtn = $("profileBtn");
  const profileMenu = $("profileMenu");
  const logoutBtn = $("logoutBtn");
  const addMoneyBtn = $("addMoneyBtn");
  const withdrawBtn = $("withdrawBtn");
  const alertsContainer = $("alerts");
  const clearAlertsBtn = $("clearAlerts");
  const viewAllTxBtn = $("viewAllTx");

  /* ---------------------------
     2) Currency + Theme
  --------------------------- */

  function setActiveCurrency(cur) {
    const balances = getBalances();
    pillBtns.forEach(b => b.classList.toggle("active", b.dataset.cur === cur));
    if (currencySelect) currencySelect.value = cur;
    if (balanceEl) balanceEl.textContent = moneyFmt(cur, balances[cur] || 0);
    localStorage.setItem(LS.CURRENCY, cur);
  }

  pillBtns.forEach(b => b.addEventListener("click", () => setActiveCurrency(b.dataset.cur)));
  if (currencySelect) currencySelect.addEventListener("change", e => setActiveCurrency(e.target.value));
  setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

  function applyTheme(t) {
    document.body.classList.toggle("light", t === "light");
    localStorage.setItem(LS.THEME, t);
  }
  applyTheme(localStorage.getItem(LS.THEME) || "dark");
  if (themeToggle) themeToggle.addEventListener("click", () =>
    applyTheme(document.body.classList.contains("light") ? "dark" : "light")
  );

  /* ---------------------------
     3) Alerts (FIXED – NO CRASH)
  --------------------------- */

  function renderAlerts() {
    if (!alertsContainer) return;

    const alerts = getAlerts();
    if (!Array.isArray(alerts) || alerts.length === 0) {
      alertsContainer.innerHTML = `
        <div class="feed-item">
          <div class="feed-icon">✅</div>
          <div class="feed-main">
            <div class="feed-title">All clear</div>
            <div class="feed-sub">No requests or alerts</div>
          </div>
        </div>`;
      return;
    }

    alertsContainer.innerHTML = alerts.slice(0, 6).map(a => `
      <div class="feed-item">
        <div class="feed-icon">${a.icon || "🔔"}</div>
        <div class="feed-main">
          <div class="feed-title">${a.title}</div>
          <div class="feed-sub">${a.sub || ""}</div>
        </div>
      </div>`).join("");
  }

  renderAlerts();
  if (clearAlertsBtn) clearAlertsBtn.addEventListener("click", () => { setAlerts([]); renderAlerts(); });

  /* ---------------------------
     4) Recent Transactions (SAFE)
  --------------------------- */

  function prependTx(tx) {
    const feed = document.querySelector(".feed");
    if (!feed) return;

    const el = document.createElement("div");
    el.className = "feed-item";
    el.innerHTML = `
      <div class="feed-icon">${tx.icon || "💳"}</div>
      <div class="feed-main">
        <div class="feed-title">${tx.title}</div>
        <div class="feed-sub">${tx.timeLabel}</div>
      </div>
      <div class="feed-amt ${tx.amount >= 0 ? "pos" : "neg"}">
        ${moneyFmt(tx.currency, Math.abs(tx.amount))}
      </div>`;
    feed.prepend(el);
    if (feed.children.length > 5) feed.lastChild.remove();
  }

  /* ---------------------------
     5) Ledger
  --------------------------- */

  if (viewAllTxBtn) {
    viewAllTxBtn.addEventListener("click", () => alert("Ledger modal already approved — next step Layer 3"));
  }

  /* ---------------------------
     6) Balance Actions
  --------------------------- */

  if (addMoneyBtn) addMoneyBtn.addEventListener("click", () => alert("Add money modal OK"));
  if (withdrawBtn) withdrawBtn.addEventListener("click", () => alert("Withdraw modal OK"));

  /* ---------------------------
     7) Profile / Logout
  --------------------------- */

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => {
      e.stopPropagation();
      profileMenu.classList.toggle("open");
    });
    document.addEventListener("click", () => profileMenu.classList.remove("open"));
  }

  if (logoutBtn) logoutBtn.addEventListener("click", () => location.href = "login.html");

})();
