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
   ✅ Scan & Pay (Layer 3B)
   ✅ No dead buttons (safe init + delegated handlers)
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

  function getAlerts() {
    const v = safeJSONParse(localStorage.getItem(LS.ALERTS), []);
    return Array.isArray(v) ? v : [];
  }
  function setAlerts(list) {
    localStorage.setItem(LS.ALERTS, JSON.stringify(Array.isArray(list) ? list : []));
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

    // ✅ Display converted total (not just single wallet)
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
      ? `<div class="feed-sub">≈ ${LEDGER.moneyFmt(base, tx.base_equiv)} • rate ${tx.fx_rate_used.toFixed(4)}</div>`
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
     8) Ledger modal with SEARCH + DATE RANGE
  --------------------------- */

  function ledgerMatches(tx, q, cur, type, fromDate, toDate) {
    const text = `${tx.title || ""} ${tx.type || ""} ${tx.currency || ""} ${JSON.stringify(tx.meta || {})}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (cur && tx.currency !== cur) return false;
    if (type && tx.type !== type) return false;

    if (fromDate || toDate) {
      const t = new Date(tx.created_at || Date.now()).getTime();
      if (fromDate) {
        const f = new Date(fromDate + "T00:00:00").getTime();
        if (t < f) return false;
      }
      if (toDate) {
        const tt = new Date(toDate + "T23:59:59").getTime();
        if (t > tt) return false;
      }
    }

    return true;
  }

  function openLedger() {
    const all = LEDGER.getTx() || [];
    const balances = LEDGER.getBalances();
    const currencies = Object.keys(balances);

    openModal({
      title: "Transaction History",
      bodyHTML: `
        <div class="p54-note">Search, filter and review FX equivalents (where applicable).</div>

        <div class="p54-filters">
          <div>
            <div class="p54-label">Search</div>
            <input class="p54-input" id="q" placeholder="e.g. sent, withdrawal, @tag, bank..." />
          </div>
          <div>
            <div class="p54-label">Currency</div>
            <select class="p54-select" id="cur">
              <option value="">All</option>
              ${currencies.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>
          <div>
            <div class="p54-label">Type</div>
            <select class="p54-select" id="type">
              <option value="">All</option>
              ${[...new Set(all.map(x => x.type).filter(Boolean))].map(t => `<option value="${t}">${t}</option>`).join("")}
            </select>
          </div>

          <div>
            <div class="p54-label">From</div>
            <input class="p54-input" id="from" type="date" />
          </div>
          <div>
            <div class="p54-label">To</div>
            <input class="p54-input" id="to" type="date" />
          </div>
          <div style="display:flex; gap:10px; align-items:end;">
            <button class="p54-btn" type="button" id="reset">Reset</button>
            <button class="p54-btn primary" type="button" id="apply">Apply</button>
          </div>
        </div>

        <div class="p54-divider"></div>
        <div class="p54-ledger" id="ledgerList"></div>

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeLedger">Close</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const ledger = modal.querySelector("#ledgerList");
        const qEl = modal.querySelector("#q");
        const curEl = modal.querySelector("#cur");
        const typeEl = modal.querySelector("#type");
        const fromEl = modal.querySelector("#from");
        const toEl = modal.querySelector("#to");

        function render(list) {
          ledger.innerHTML = (list.length ? list : []).slice(0, 120).map(tx => {
            const cls = tx.amount >= 0 ? "p54-pos" : "p54-neg";
            const sign = tx.amount >= 0 ? "+" : "−";
            const fxLine = (tx.currency !== tx.base_currency)
              ? `<div class="p54-ledger-sub">≈ ${LEDGER.moneyFmt(tx.base_currency, tx.base_equiv)} • rate ${tx.fx_rate_used.toFixed(4)}</div>`
              : "";

            return `
              <div class="p54-ledger-item">
                <div class="p54-ledger-left">
                  <div class="p54-ledger-title">${tx.icon || "💳"} ${tx.title}</div>
                  <div class="p54-ledger-sub">${new Date(tx.created_at).toLocaleString()}</div>
                  ${fxLine}
                </div>
                <div class="p54-ledger-amt ${cls}">
                  ${sign} ${LEDGER.moneyFmt(tx.currency, Math.abs(tx.amount))}
                </div>
              </div>
            `;
          }).join("") || `<div class="p54-note">No transactions found.</div>`;
        }

        function applyFilters() {
          const q = (qEl.value || "").trim().toLowerCase();
          const cur = curEl.value || "";
          const type = typeEl.value || "";
          const fromDate = fromEl.value || "";
          const toDate = toEl.value || "";
          const filtered = all.filter(tx => ledgerMatches(tx, q, cur, type, fromDate, toDate));
          render(filtered);
        }

        modal.querySelector("#apply").addEventListener("click", applyFilters);
        modal.querySelector("#reset").addEventListener("click", () => {
          qEl.value = "";
          curEl.value = "";
          typeEl.value = "";
          fromEl.value = "";
          toEl.value = "";
          render(all);
        });

        render(all);
        modal.querySelector("#closeLedger").addEventListener("click", close);
      }
    });
  }

  if (viewAllTxBtn) viewAllTxBtn.addEventListener("click", openLedger);
  if (viewAllTxMobileBtn) viewAllTxMobileBtn.addEventListener("click", openLedger);

  /* ---------------------------
     9) Core action helper
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

  /* ---------------------------
     10) Core Modals (Add / Withdraw / Send / FX / Receive / Bank / Scan)
  --------------------------- */

  function openScanAndPay() {
    const curView = getSelectedCurrency();
    const balances = LEDGER.getBalances();

    openModal({
      title: "Scan & Pay",
      bodyHTML: `
        <form class="p54-form" id="scanPayForm">

          <div>
            <div class="p54-label">Merchant Tag / QR Ref</div>
            <input class="p54-input" id="merchantRef" placeholder="@merchant or QR123" required />
          </div>

          <div>
            <div class="p54-label">Wallet currency</div>
            <select class="p54-select" id="scanCur">
              ${Object.keys(balances).map(c =>
                `<option value="${c}" ${c===curView?"selected":""}>${c}</option>`
              ).join("")}
            </select>
          </div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="scanAmt" type="number" step="0.01" min="0" required />
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelScan">Cancel</button>
            <button class="p54-btn primary" type="submit">Pay</button>
          </div>

        </form>
      `,
      onMount: ({ modal, close }) => {

        modal.querySelector("#cancelScan")
          .addEventListener("click", close);

        modal.querySelector("#scanPayForm")
          .addEventListener("submit", (e) => {
            e.preventDefault();

            const ref = modal.querySelector("#merchantRef").value.trim();
            const cur = modal.querySelector("#scanCur").value;
            const amt = Number(modal.querySelector("#scanAmt").value);

            if (!ref) return alert("Enter merchant tag or QR ref.");
            if (amt <= 0) return alert("Enter valid amount.");

            const balancesNow = LEDGER.getBalances();
            if ((balancesNow[cur] ?? 0) < amt)
              return alert(`Insufficient ${cur} balance.`);

            const entry = LEDGER.createEntry({
              type: "scan_pay",
              title: "Scan & Pay",
              currency: cur,
              amount: -amt,
              icon: "📱",
              meta: { merchant: ref }
            });

            const tx = addEntryAndRefresh(entry);

            RCPT.openReceiptModal({
              openModal,
              title: "Scan & Pay",
              tx,
              lines: [
                `Merchant: ${ref}`,
                `Wallet: ${cur}`,
                `Amount: ${LEDGER.moneyFmt(cur, amt)}`
              ]
            });

            close();
          });

      }
    });
  }

  function openAddMoney() {
    const curView = getSelectedCurrency();
    const balances = LEDGER.getBalances();

    openModal({
      title: "Add money",
      bodyHTML: `
        <form class="p54-form" id="addForm">

          <div class="p54-row">
            <div>
              <div class="p54-label">Method</div>
              <select class="p54-select" id="method">
                <option value="Card">Card</option>
                <option value="Agent">Agent</option>
              </select>
            </div>

            <div>
              <div class="p54-label">Wallet currency</div>
              <select class="p54-select" id="addCur">
                ${Object.keys(balances).map(
                  c => `<option value="${c}" ${c===curView?"selected":""}>${c}</option>`
                ).join("")}
              </select>
            </div>
          </div>

          <div id="methodFields"></div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="addAmt" type="number" step="0.01" min="0" required />
          </div>

          <div>
            <div class="p54-label">Reference</div>
            <input class="p54-input" id="reference" placeholder="Optional" />
          </div>

          <div class="p54-note" id="fxInfo"></div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelAdd">Cancel</button>
            <button class="p54-btn primary" type="submit">Add</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const form = modal.querySelector("#addForm");
        const methodEl = modal.querySelector("#method");
        const addCur = modal.querySelector("#addCur");
        const fxInfo = modal.querySelector("#fxInfo");
        const methodFields = modal.querySelector("#methodFields");

        function renderMethodFields() {
          const method = methodEl.value;

          if (method === "Card") {
            methodFields.innerHTML = `
              <div class="p54-row">
                <div>
                  <div class="p54-label">Select card</div>
                  <select class="p54-select" id="cardSel">
                    <option value="Visa •••• 4832">Visa •••• 4832</option>
                    <option value="Mastercard •••• 1441">Mastercard •••• 1441</option>
                  </select>
                </div>
              </div>
            `;
            return;
          }

          methodFields.innerHTML = `
            <div>
              <div class="p54-label">Agent PAY54 Tag or Account No</div>
              <input class="p54-input" id="agentRef" placeholder="@agent-tag or 3001234567" required />
            </div>
          `;
        }

        function updateFXInfo() {
          const base = getSelectedCurrency();
          const c = addCur.value;
          fxInfo.textContent =
            c !== base
              ? `You are viewing ${base}. This will fund your ${c} wallet. Converted total updates instantly.`
              : "";
        }

        renderMethodFields();
        updateFXInfo();

        methodEl.addEventListener("change", renderMethodFields);
        addCur.addEventListener("change", updateFXInfo);

        modal.querySelector("#cancelAdd").addEventListener("click", close);

        form.addEventListener("submit", (e) => {
          e.preventDefault();

          const method = methodEl.value;
          const c = addCur.value;
          const a = Number(modal.querySelector("#addAmt").value || 0);
          const reference = modal.querySelector("#reference").value || "";

          if (a <= 0) return alert("Enter a valid amount.");

          const meta = { method, reference };

          if (method === "Card") {
            meta.card = modal.querySelector("#cardSel")?.value || "";
          } else {
            meta.agent = modal.querySelector("#agentRef")?.value || "";
            if (!meta.agent) return alert("Enter Agent PAY54 tag or account number.");
          }

          const entry = LEDGER.createEntry({
            type: "add_money",
            title: "Wallet funding",
            currency: c,
            amount: +a,
            icon: "💳",
            meta
          });

          const tx = addEntryAndRefresh(entry);

          RCPT.openReceiptModal({
            openModal,
            title: "Add money",
            tx,
            lines: [
              `Action: Add money`,
              `Method: ${method}`,
              ...(meta.card ? [`Card: ${meta.card}`] : []),
              ...(meta.agent ? [`Agent: ${meta.agent}`] : []),
              `Wallet: ${c}`,
              `Amount: ${LEDGER.moneyFmt(c, a)}`,
              ...(reference ? [`Reference: ${reference}`] : [])
            ]
          });

          close();
        });
      }
    });
  }

  function openWithdraw() {
    const curView = getSelectedCurrency();
    const balances = LEDGER.getBalances();

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
              <div class="p54-label">Wallet currency</div>
              <select class="p54-select" id="wdCur">
                ${Object.keys(balances).map(c => `<option value="${c}" ${c===curView?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
          </div>

          <div id="routeExtra"></div>

          <div>
            <div class="p54-label">Amount</div>
            <input class="p54-input" id="wdAmt" type="number" step="0.01" min="0" required />
          </div>

          <div class="p54-note" id="wdInfo"></div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelWd">Cancel</button>
            <button class="p54-btn primary" type="submit">Withdraw</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const form = modal.querySelector("#wdForm");
        const wdRoute = modal.querySelector("#wdRoute");
        const wdCur = modal.querySelector("#wdCur");
        const routeExtra = modal.querySelector("#routeExtra");
        const wdInfo = modal.querySelector("#wdInfo");

        function renderRouteExtra() {
          const route = wdRoute.value;
          if (route === "Card") {
            routeExtra.innerHTML = `
              <div class="p54-row">
                <div>
                  <div class="p54-label">Select card</div>
                  <select class="p54-select" id="cardSel">
                    <option value="Visa •••• 4832">Visa •••• 4832</option>
                    <option value="Mastercard •••• 1441">Mastercard •••• 1441</option>
                  </select>
                </div>
                <div>
                  <div class="p54-label">Note</div>
                  <input class="p54-input" id="cardNote" placeholder="Optional" />
                </div>
              </div>
            `;
          } else {
            routeExtra.innerHTML = `
              <div class="p54-row">
                <div>
                  <div class="p54-label">Agent ID / Tag</div>
                  <input class="p54-input" id="agentId" placeholder="@agent-tag or ID" required />
                </div>
                <div>
                  <div class="p54-label">Collection note</div>
                  <input class="p54-input" id="agentNote" placeholder="Optional" />
                </div>
              </div>
            `;
          }
        }

        function updateInfo() {
          const base = getSelectedCurrency();
          const c = wdCur.value;
          wdInfo.textContent =
            c !== base
              ? `You are viewing ${base}. This will withdraw from your ${c} wallet. Converted total updates instantly.`
              : "";
        }

        renderRouteExtra();
        updateInfo();
        wdRoute.addEventListener("change", renderRouteExtra);
        wdCur.addEventListener("change", updateInfo);

        modal.querySelector("#cancelWd").addEventListener("click", close);

        form.addEventListener("submit", (e) => {
          e.preventDefault();

          const balancesNow = LEDGER.getBalances();
          const route = wdRoute.value;
          const c = wdCur.value;
          const a = Number(modal.querySelector("#wdAmt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");
          if ((balancesNow[c] ?? 0) < a) return alert(`Insufficient ${c} balance.`);

          const meta = { route };
          if (route === "Card") {
            meta.card = modal.querySelector("#cardSel")?.value || "";
            meta.note = modal.querySelector("#cardNote")?.value || "";
          } else {
            meta.agent = modal.querySelector("#agentId")?.value || "";
            meta.note = modal.querySelector("#agentNote")?.value || "";
            if (!meta.agent) return alert("Enter Agent ID / Tag.");
          }

          const entry = LEDGER.createEntry({
            type: "withdraw",
            title: "Withdrawal",
            currency: c,
            amount: -a,
            icon: "🏧",
            meta
          });

          const tx = addEntryAndRefresh(entry);

          RCPT.openReceiptModal({
            openModal,
            title: "Withdraw",
            tx,
            lines: [
              `Action: Withdraw`,
              `Route: ${route}`,
              ...(meta.card ? [`Card: ${meta.card}`] : []),
              ...(meta.agent ? [`Agent: ${meta.agent}`] : []),
              `Wallet: ${c}`,
              `Amount: ${LEDGER.moneyFmt(c, a)}`
            ]
          });

          close();
        });
      }
    });
  }

  function openSendUnified() {
    const curView = getSelectedCurrency();
    const balances = LEDGER.getBalances();

    openModal({
      title: "Send",
      bodyHTML: `
        <form class="p54-form" id="sendForm">

          <div>
            <div class="p54-label">Recipient type</div>
            <select class="p54-select" id="recType">
              ${RECIP.RECIPIENT_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join("")}
            </select>
          </div>

          <div id="recFields"></div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Wallet currency</div>
              <select class="p54-select" id="sendCur">
                ${Object.keys(balances).map(c => `<option value="${c}" ${c===curView?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="sendAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="reason">
                ${RECIP.REASONS.map(r => `<option value="${r}">${r}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="reference" placeholder="e.g. Rent Jan" />
            </div>
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelSend">Cancel</button>
            <button class="p54-btn primary" type="submit">Send</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const recType = modal.querySelector("#recType");
        const recFields = modal.querySelector("#recFields");

        function renderRecipientFields() {
          const type = recType.value;

          if (type === "pay54") {
            recFields.innerHTML = `
              <div>
                <div class="p54-label">PAY54 Tag</div>
                <input class="p54-input" id="tag" placeholder="@username" required />
              </div>
            `;
            return;
          }

          if (type === "bank") {
            recFields.innerHTML = `
              <div class="p54-row">
                <div>
                  <div class="p54-label">Bank</div>
                  <select class="p54-select" id="bank">
                    <option value="">Select</option>
                    <option>GTBank</option><option>Access Bank</option><option>Zenith</option><option>UBA</option><option>FirstBank</option>
                  </select>
                </div>
                <div>
                  <div class="p54-label">Account No</div>
                  <input class="p54-input" id="account_no" maxlength="10" placeholder="10 digits" required />
                </div>
              </div>
              <div>
                <div class="p54-label">Account name</div>
                <input class="p54-input" id="account_name" placeholder="Recipient name" required />
              </div>
            `;
            return;
          }

          recFields.innerHTML = `
            <div class="p54-row">
              <div>
                <div class="p54-label">Wallet provider</div>
                <select class="p54-select" id="provider">
                  <option value="">Select</option>
                  ${RECIP.MOBILE_PROVIDERS.map(p => `<option value="${p}">${p}</option>`).join("")}
                </select>
              </div>
              <div>
                <div class="p54-label">Mobile number</div>
                <input class="p54-input" id="mobile" placeholder="+234..." required />
              </div>
            </div>
          `;
        }

        renderRecipientFields();
        recType.addEventListener("change", renderRecipientFields);

        modal.querySelector("#cancelSend").addEventListener("click", close);

        modal.querySelector("#sendForm").addEventListener("submit", (e) => {
          e.preventDefault();

          const c = modal.querySelector("#sendCur").value;
          const amt = Number(modal.querySelector("#sendAmt").value || 0);
          if (amt <= 0) return alert("Enter a valid amount.");

          const balancesNow = LEDGER.getBalances();
          if ((balancesNow[c] ?? 0) < amt) return alert(`Insufficient ${c} balance.`);

          const reason = modal.querySelector("#reason").value;
          const reference = modal.querySelector("#reference").value;

          const recipientPayload = { type: recType.value, reason, reference };

          if (recType.value === "pay54") recipientPayload.tag = modal.querySelector("#tag")?.value || "";
          if (recType.value === "bank") {
            recipientPayload.bank = modal.querySelector("#bank")?.value || "";
            recipientPayload.account_no = modal.querySelector("#account_no")?.value || "";
            recipientPayload.account_name = modal.querySelector("#account_name")?.value || "";
          }
          if (recType.value === "mobile_wallet") {
            recipientPayload.provider = modal.querySelector("#provider")?.value || "";
            recipientPayload.mobile = modal.querySelector("#mobile")?.value || "";
          }

          const v = RECIP.validateRecipient(recipientPayload);
          if (!v.ok) return alert(v.msg);

          const entry = LEDGER.createEntry({
            type: "send",
            title: "Transfer sent",
            currency: c,
            amount: -amt,
            icon: "↗️",
            meta: { recipient: v.recipient, reason, reference }
          });

          const tx = addEntryAndRefresh(entry);

          const r = v.recipient;
          const whoLine =
            r.type === "pay54" ? `To: ${r.tag}` :
            r.type === "bank" ? `To: ${r.account_name} • ${r.bank} • ${r.account_no}` :
            `To: ${r.provider} • ${r.mobile}`;

          RCPT.openReceiptModal({
            openModal,
            title: "Send",
            tx,
            lines: [
              `Action: Send`,
              whoLine,
              `Reason: ${reason}`,
              ...(reference ? [`Reference: ${reference}`] : []),
              `Wallet: ${c}`,
              `Amount: ${LEDGER.moneyFmt(c, amt)}`
            ]
          });

          close();
        });
      }
    });
  }

  function openCrossBorderFXUnified() {
    const sendCurDefault = "GBP";
    const recvCurDefault = "NGN";

    openModal({
      title: "Cross-border FX",
      bodyHTML: `
        <form class="p54-form" id="fxForm">

          <div>
            <div class="p54-label">Recipient type</div>
            <select class="p54-select" id="recType">
              ${RECIP.RECIPIENT_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join("")}
            </select>
          </div>

          <div id="recFields"></div>

          <div class="p54-row">
            <div>
              <div class="p54-label">You send</div>
              <select class="p54-select" id="sendCur">
                ${["USD","GBP","EUR","CAD","AED","AUD"].map(c => `<option value="${c}" ${c===sendCurDefault?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="sendAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">They receive</div>
              <select class="p54-select" id="recvCur">
                ${["NGN","GHS","KES","ZAR"].map(c => `<option value="${c}" ${c===recvCurDefault?"selected":""}>${c}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Estimated receive</div>
              <input class="p54-input" id="recvAmt" disabled />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="reason">
                ${RECIP.REASONS.map(r => `<option value="${r}">${r}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="reference" placeholder="e.g. School fees" />
            </div>
          </div>

          <div class="p54-note" id="rateNote">Mock rate applied (Layer 3B+ will use live rates).</div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelFX">Cancel</button>
            <button class="p54-btn primary" type="submit">Convert</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const recType = modal.querySelector("#recType");
        const recFields = modal.querySelector("#recFields");

        const sendCur = modal.querySelector("#sendCur");
        const recvCur = modal.querySelector("#recvCur");
        const sendAmt = modal.querySelector("#sendAmt");
        const recvAmt = modal.querySelector("#recvAmt");

        const rateNote = modal.querySelector("#rateNote");

        function renderRecipientFields() {
          const type = recType.value;

          if (type === "pay54") {
            recFields.innerHTML = `
              <div>
                <div class="p54-label">PAY54 Tag</div>
                <input class="p54-input" id="tag" placeholder="@username" required />
              </div>
            `;
            return;
          }

          if (type === "bank") {
            recFields.innerHTML = `
              <div class="p54-row">
                <div>
                  <div class="p54-label">Bank</div>
                  <select class="p54-select" id="bank">
                    <option value="">Select</option>
                    <option>GTBank</option><option>Access Bank</option><option>Zenith</option><option>UBA</option><option>FirstBank</option>
                  </select>
                </div>
                <div>
                  <div class="p54-label">Account No</div>
                  <input class="p54-input" id="account_no" maxlength="10" placeholder="10 digits" required />
                </div>
              </div>
              <div>
                <div class="p54-label">Account name</div>
                <input class="p54-input" id="account_name" placeholder="Recipient name" required />
              </div>
            `;
            return;
          }

          recFields.innerHTML = `
            <div class="p54-row">
              <div>
                <div class="p54-label">Wallet provider</div>
                <select class="p54-select" id="provider">
                  <option value="">Select</option>
                  ${RECIP.MOBILE_PROVIDERS.map(p => `<option value="${p}">${p}</option>`).join("")}
                </select>
              </div>
              <div>
                <div class="p54-label">Mobile number</div>
                <input class="p54-input" id="mobile" placeholder="+234..." required />
              </div>
            </div>
          `;
        }

        function updateEstimate() {
          const s = sendCur.value;
          const r = recvCur.value;
          const a = Number(sendAmt.value || 0);
          if (!a) { recvAmt.value = ""; return; }

          const out = LEDGER.convert(s, r, a);
          recvAmt.value = out.toLocaleString(undefined, { maximumFractionDigits: 2 });

          const base = getSelectedCurrency();
          const fx = LEDGER.rate(s, base);
          rateNote.textContent = `Mock FX active • Receipt includes ≈ ${base} equivalent (rate ${fx.toFixed(4)} ${base}/${s}).`;
        }

        renderRecipientFields();
        updateEstimate();

        recType.addEventListener("change", renderRecipientFields);
        sendCur.addEventListener("change", updateEstimate);
        recvCur.addEventListener("change", updateEstimate);
        sendAmt.addEventListener("input", updateEstimate);

        modal.querySelector("#cancelFX").addEventListener("click", close);

        modal.querySelector("#fxForm").addEventListener("submit", (e) => {
          e.preventDefault();

          const s = sendCur.value;
          const r = recvCur.value;
          const a = Number(sendAmt.value || 0);
          if (a <= 0) return alert("Enter an amount.");

          const balancesNow = LEDGER.getBalances();
          if ((balancesNow[s] ?? 0) < a) return alert(`Insufficient ${s} balance.`);

          const reason = modal.querySelector("#reason").value;
          const reference = modal.querySelector("#reference").value;

          const recipientPayload = { type: recType.value, reason, reference };
          if (recType.value === "pay54") recipientPayload.tag = modal.querySelector("#tag")?.value || "";
          if (recType.value === "bank") {
            recipientPayload.bank = modal.querySelector("#bank")?.value || "";
            recipientPayload.account_no = modal.querySelector("#account_no")?.value || "";
            recipientPayload.account_name = modal.querySelector("#account_name")?.value || "";
          }
          if (recType.value === "mobile_wallet") {
            recipientPayload.provider = modal.querySelector("#provider")?.value || "";
            recipientPayload.mobile = modal.querySelector("#mobile")?.value || "";
          }

          const v = RECIP.validateRecipient(recipientPayload);
          if (!v.ok) return alert(v.msg);

          const out = LEDGER.convert(s, r, a);

          const debit = LEDGER.createEntry({
            type: "fx_debit",
            title: "FX transfer (sent)",
            currency: s,
            amount: -a,
            icon: "💱",
            meta: { recipient: v.recipient, pair: `${s}→${r}`, reason, reference }
          });

          const credit = LEDGER.createEntry({
            type: "fx_credit",
            title: "FX transfer (received wallet)",
            currency: r,
            amount: +out,
            icon: "💱",
            meta: { pair: `${s}→${r}`, reason, reference }
          });

          const tx1 = addEntryAndRefresh(debit);
          addEntryAndRefresh(credit);

          const rec = v.recipient;
          const whoLine =
            rec.type === "pay54" ? `Recipient: ${rec.tag}` :
            rec.type === "bank" ? `Recipient: ${rec.account_name} • ${rec.bank} • ${rec.account_no}` :
            `Recipient: ${rec.provider} • ${rec.mobile}`;

          RCPT.openReceiptModal({
            openModal,
            title: "Cross-border FX",
            tx: tx1,
            lines: [
              `Action: Cross-border FX`,
              whoLine,
              `You send: ${LEDGER.moneyFmt(s, a)}`,
              `They receive: ${LEDGER.moneyFmt(r, out)}`,
              `Pair: ${s} → ${r}`,
              `Reason: ${reason}`,
              ...(reference ? [`Reference: ${reference}`] : [])
            ]
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
        <div class="p54-note" style="font-weight:900;">PAY54</div>
        <div class="p54-small">Receive money using your account and PAY54 tag.</div>
        <div class="p54-divider"></div>

        <div><b>Acct:</b> 3001234567</div>
        <div><b>Tag:</b> @pay54-user</div>

        <div class="p54-divider"></div>

        <div style="font-size:12px;">
          <a href="signup.html" style="font-weight:900; text-decoration:underline;">Join PAY54 — Earn rewards</a>
        </div>

        <div class="p54-actions">
          <button class="p54-btn" type="button" id="copyTag">Copy Tag</button>
          <button class="p54-btn" type="button" id="shareWA">Share WhatsApp</button>
          <button class="p54-btn primary" type="button" id="doneRecv">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        modal.querySelector("#doneRecv").addEventListener("click", close);
        modal.querySelector("#copyTag").addEventListener("click", async () => {
          try { await navigator.clipboard.writeText("@pay54-user"); alert("Copied ✅"); }
          catch { alert("Copy failed."); }
        });
        modal.querySelector("#shareWA").addEventListener("click", () => {
          const msg = `PAY54 Receive\nAcct: 3001234567\nTag: @pay54-user\nJoin PAY54: ${location.origin}/signup.html`;
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
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
              <option>GTBank</option><option>Access Bank</option><option>Zenith</option><option>UBA</option><option>FirstBank</option>
            </select>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Account Number</div>
              <input class="p54-input" id="acct" maxlength="10" placeholder="10 digits" required />
            </div>
            <div>
              <div class="p54-label">Account Name</div>
              <input class="p54-input" id="acctName" placeholder="Recipient name" required />
            </div>
          </div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Reason</div>
              <select class="p54-select" id="reason">
                ${RECIP.REASONS.map(r => `<option value="${r}">${r}</option>`).join("")}
              </select>
            </div>
            <div>
              <div class="p54-label">Reference</div>
              <input class="p54-input" id="ref" placeholder="e.g. Rent Jan" />
            </div>
          </div>

          <div>
            <div class="p54-label">Amount (NGN)</div>
            <input class="p54-input" id="amt" type="number" step="0.01" min="0" required />
          </div>

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

          const name = modal.querySelector("#acctName").value.trim();
          if (!name) return alert("Enter recipient account name.");

          const balancesNow = LEDGER.getBalances();
          const a = Number(modal.querySelector("#amt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");
          if ((balancesNow.NGN ?? 0) < a) return alert("Insufficient NGN balance.");

          const bank = modal.querySelector("#bank").value;
          const reason = modal.querySelector("#reason").value;
          const ref = modal.querySelector("#ref").value;

          const entry = LEDGER.createEntry({
            type: "bank_transfer",
            title: "Bank transfer",
            currency: "NGN",
            amount: -a,
            icon: "🏦",
            meta: {
              recipient: { type: "bank", bank, account_no: acct, account_name: name, reason, reference: ref },
              bank, account_no: acct, account_name: name, reason, reference: ref
            }
          });

          const tx = addEntryAndRefresh(entry);

          RCPT.openReceiptModal({
            openModal,
            title: "Bank Transfer",
            tx,
            lines: [
              `Action: Bank transfer`,
              `To: ${name} • ${bank} • ${acct}`,
              `Reason: ${reason}`,
              ...(ref ? [`Reference: ${ref}`] : []),
              `Amount: ${LEDGER.moneyFmt("NGN", a)}`
            ]
          });

          close();
        });
      }
    });
  }

  /* ---------------------------
     11) Tile naming (safe)
  --------------------------- */

  function renameDashboardTiles() {
    document.querySelectorAll(".tile-title").forEach(el => {
      const t = (el.textContent || "").trim();
      if (t === "Request Money") el.textContent = "Scan & Pay";
      if (t === "Shop on the Fly") el.textContent = "Pay & Go";
    });
  }

  /* ---------------------------
     12) Recent Transactions Auto Feed
  --------------------------- */

  function renderRecentTransactions() {
    const txFeed = recentTxFeedEl();
    if (!txFeed) return;

    const txs = (LEDGER.getTx() || []).slice(0, 5);

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
     13) FINAL INITIALISATION (no regressions)
  --------------------------- */

  function initPAY54Dashboard() {
    // Prevent double init if scripts reload / cache weirdness
    if (window.__PAY54_DASH_INIT_DONE__) return;
    window.__PAY54_DASH_INIT_DONE__ = true;

    renameDashboardTiles();

    // Top header buttons
    if (addMoneyBtn) addMoneyBtn.addEventListener("click", openAddMoney);
    if (withdrawBtn) withdrawBtn.addEventListener("click", openWithdraw);

    // Delegated click handler for ALL tiles (more stable than binding per element)
    document.addEventListener("click", (e) => {
      const tile = e.target.closest(".action-tile, .service-tile, .shortcut-tile");
      if (!tile) return;

      const title = (tile.querySelector(".tile-title")?.textContent || "").toLowerCase();

      // Action tiles
      if (title.includes("send")) return openSendUnified();
      if (title.includes("receive")) return openReceive();
      if (title.includes("add")) return openAddMoney();
      if (title.includes("withdraw")) return openWithdraw();
      if (title.includes("bank")) return openBankTransfer();
      if (title.includes("scan") || title.includes("qr")) return openScanAndPay();

      // Service tiles
      if (title.includes("cross") || title.includes("fx")) return openCrossBorderFXUnified();

      // Shortcut tiles
      if (title.includes("pay")) {
        return window.open(
          "https://www.booking.com/?utm_source=pay54&utm_medium=app&utm_campaign=pay_and_go",
          "_blank"
        );
      }

      // Fallback
      openModal({
        title: "Coming soon",
        bodyHTML: `
          <div class="p54-note"><b>${title || "This feature"}</b> is part of Layer 3 rollout.</div>
          <div class="p54-actions">
            <button class="p54-btn primary" type="button" id="okSoon">OK</button>
          </div>
        `,
        onMount: ({ modal, close }) => modal.querySelector("#okSoon").addEventListener("click", close)
      });
    });

    renderRecentTransactions();
    refreshUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPAY54Dashboard);
  } else {
    initPAY54Dashboard();
  }

})(); // ✅ CRITICAL: closes the IIFE (without this, the whole file breaks)
