/* =========================
   PAY54 Dashboard — Layer 2 Wiring (v8.0 aligned) — v803
   Full replacement for assets/js/dashboard.js

   Fixes:
   - Prevents "dead buttons" by hardening localStorage + null checks
   - Currency switching always works (even if storage is corrupted)
   - Add money / Withdraw / Money Moves / Services / Shortcuts wired
   - Alerts render + Clear all works
   - View all opens ledger (desktop + mobile if id added)
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
    // Handle null, "null", "undefined", empty string, corrupted JSON
    if (v === null || v === "" || v === "null" || v === "undefined") return fallback;
    try {
      return JSON.parse(v);
    } catch {
      return fallback;
    }
  }

  function isPlainObject(o) {
    return !!o && typeof o === "object" && !Array.isArray(o);
  }

  function resetBalances() {
    localStorage.setItem(LS.BALANCES, JSON.stringify(defaultBalances));
    return { ...defaultBalances };
  }

  function getBalances() {
    const stored = safeJSONParse(localStorage.getItem(LS.BALANCES), null);

    // If corrupted or not an object -> reset
    if (!isPlainObject(stored)) return resetBalances();

    // Ensure required currencies exist + are numbers
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
  const viewAllTxMobileBtn = document.getElementById("viewAllTxMobile"); // add in HTML (recommended)

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
        width: min(560px, 100%);
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

      .p54-modal-title{ font-weight: 900; font-size: 15px; letter-spacing: .2px; }
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

      .p54-label{ font-size: 12px; font-weight: 800; opacity: .85; }
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
        font-weight: 900;
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
      .p54-ledger-title{ font-weight: 900; }
      .p54-ledger-sub{ opacity:.75; font-size:12px; margin-top:3px; }
      .p54-ledger-amt{ font-weight: 900; white-space:nowrap; }
      .p54-pos{ color: #22c55e; }
      .p54-neg{ color: #ef4444; }
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
     3) Header: Currency, Theme, Profile
  --------------------------- */

  function setActiveCurrency(cur) {
    const balances = getBalances(); // SAFE

    pillBtns.forEach((b) => {
      const isActive = b.dataset.cur === cur;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (currencySelect) currencySelect.value = cur;

    if (balanceEl) {
      const amt = Number(balances[cur] ?? 0);
      balanceEl.textContent = moneyFmt(cur, amt);
    }

    localStorage.setItem(LS.CURRENCY, cur);
  }

  pillBtns.forEach((btn) => {
    btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur));
  });

  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));
  }

  // Init currency (SAFE)
  setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

  // Theme
  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem(LS.THEME, theme);
    if (themeToggle) {
      const icon = themeToggle.querySelector(".icon");
      if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
    }
  }
  applyTheme(localStorage.getItem(LS.THEME) || "dark");

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
      localStorage.removeItem(LS.THEME);
      window.location.href = "login.html";
    });
  }

  /* ---------------------------
     4) Alerts + Recent Tx rendering
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

  function recentTxFeedEl() {
    // Desktop: use viewAllTx button to locate the correct card/feed
    if (viewAllTxBtn) {
      const card = viewAllTxBtn.closest(".card");
      const feed = card ? card.querySelector(".feed") : null;
      if (feed) return feed;
    }
    // Mobile fallback: pick the first "Recent Transactions" feed in DOM order (best-effort)
    const cards = Array.from(document.querySelectorAll(".card"));
    for (const c of cards) {
      const h3 = c.querySelector("h3");
      if (h3 && h3.textContent.trim() === "Recent Transactions") {
        const feed = c.querySelector(".feed");
        if (feed) return feed;
      }
    }
    return null;
  }

  function prependTxToDOM(tx) {
    const txFeed = recentTxFeedEl();
    if (!txFeed) return;

    const amtClass = tx.amount >= 0 ? "pos" : "neg";
    const sign = tx.amount >= 0 ? "+" : "−";

    const item = document.createElement("div");
    item.className = "feed-item";
    item.innerHTML = `
      <div class="feed-icon">${tx.icon || "💳"}</div>
      <div class="feed-main">
        <div class="feed-title">${tx.title}</div>
        <div class="feed-sub">${tx.timeLabel}</div>
      </div>
      <div class="feed-amt ${amtClass}">${sign} ${moneyFmt(tx.currency, Math.abs(tx.amount))}</div>
    `;

    txFeed.prepend(item);

    const items = txFeed.querySelectorAll(".feed-item");
    if (items.length > 5) items[items.length - 1].remove();
  }

  // Init alerts
  renderAlerts();

  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener("click", () => {
      setAlerts([]);
      renderAlerts();
    });
  }

  /* ---------------------------
     5) Receipts + Ledger + Transactions
  --------------------------- */

  function addTransaction({ title, currency, amount, icon, meta }) {
    const stamp = nowStamp();
    const tx = {
      id: uid("TX"),
      title,
      currency,
      amount: Number(amount),
      icon: icon || "💳",
      meta: meta || "",
      timeISO: stamp.iso,
      timeLabel: stamp.label
    };

    const list = getTx();
    list.unshift(tx);
    setTx(list);

    prependTxToDOM(tx);
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

  function openLedger() {
    const list = getTx();
    openModal({
      title: "Transaction History",
      bodyHTML: `
        <div class="p54-note">Dashboard shows the latest 5. “View all” opens the ledger.</div>
        <div class="p54-divider"></div>
        <div class="p54-ledger" id="ledgerList"></div>
        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeLedger">Close</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const ledger = modal.querySelector("#ledgerList");
        ledger.innerHTML = (list.length ? list : []).slice(0, 50).map(tx => {
          const cls = tx.amount >= 0 ? "p54-pos" : "p54-neg";
          const sign = tx.amount >= 0 ? "+" : "−";
          return `
            <div class="p54-ledger-item">
              <div class="p54-ledger-left">
                <div class="p54-ledger-title">${tx.icon || "💳"} ${tx.title}</div>
                <div class="p54-ledger-sub">${new Date(tx.timeISO).toLocaleString()}</div>
              </div>
              <div class="p54-ledger-amt ${cls}">
                ${sign} ${moneyFmt(tx.currency, Math.abs(tx.amount))}
              </div>
            </div>
          `;
        }).join("") || `<div class="p54-note">No transactions yet.</div>`;

        modal.querySelector("#closeLedger").addEventListener("click", close);
      }
    });
  }

  if (viewAllTxBtn) viewAllTxBtn.addEventListener("click", openLedger);
  if (viewAllTxMobileBtn) viewAllTxMobileBtn.addEventListener("click", openLedger);

  /* ---------------------------
     6) Money Moves Actions
  --------------------------- */

  function openSendPay54() {
    const cur = localStorage.getItem(LS.CURRENCY) || "NGN";
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
          const c = curSel.value;
          const a = Number(amt.value || 0);
          const fee = calcFee(a);
          const total = a + fee;

          if (total <= 0) return alert("Enter a valid amount.");
          if ((balances[c] ?? 0) < total) return alert("Insufficient balance.");

          balances[c] = (balances[c] ?? 0) - total;
          setBalances(balances);
          setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

          const tx = addTransaction({
            title: "PAY54 transfer sent",
            currency: c,
            amount: -total,
            icon: "↗️",
            meta: `To ${modal.querySelector("#toTag").value}`
          });

          openReceipt({
            title: "PAY54 → PAY54 Transfer",
            txId: tx.id,
            lines: [
              `Action: Send PAY54 → PAY54`,
              `To: ${modal.querySelector("#toTag").value}`,
              `Amount: ${moneyFmt(c, a)}`,
              `Fee: ${moneyFmt(c, fee)}`,
              `Total: ${moneyFmt(c, total)}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
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
    const cur = localStorage.getItem(LS.CURRENCY) || "NGN";
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
          const c = modal.querySelector("#addCur").value;
          const a = Number(modal.querySelector("#addAmt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");

          balances[c] = (balances[c] ?? 0) + a;
          setBalances(balances);
          setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

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
              `Amount: ${moneyFmt(c, a)}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
          });

          close();
        });
      }
    });
  }

  function openWithdraw() {
    const cur = localStorage.getItem(LS.CURRENCY) || "NGN";
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
          const c = modal.querySelector("#wdCur").value;
          const a = Number(modal.querySelector("#wdAmt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");
          if ((balances[c] ?? 0) < a) return alert("Insufficient balance.");

          balances[c] = (balances[c] ?? 0) - a;
          setBalances(balances);
          setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

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
              `Amount: ${moneyFmt(c, a)}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
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
              <option>GTBank</option><option>Access Bank</option><option>Zenith</option><option>UBA</option><option>FirstBank</option>
            </select>
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

          const balances = getBalances();
          const a = Number(modal.querySelector("#amt").value || 0);
          if (a <= 0) return alert("Enter a valid amount.");
          if ((balances.NGN ?? 0) < a) return alert("Insufficient NGN balance.");

          balances.NGN -= a;
          setBalances(balances);
          setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

          const tx = addTransaction({
            title: "Bank transfer",
            currency: "NGN",
            amount: -a,
            icon: "🏦",
            meta: `To ${modal.querySelector("#bank").value} • ${acct}`
          });

          openReceipt({
            title: "Bank Transfer",
            txId: tx.id,
            lines: [
              `Action: Bank transfer`,
              `Bank: ${modal.querySelector("#bank").value}`,
              `Acct: ${acct}`,
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
     7) Services
  --------------------------- */

  function openCrossBorderFX() {
    openModal({
      title: "Cross-border FX",
      bodyHTML: `
        <form class="p54-form" id="fxForm">
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

          <div class="p54-note">Mock rate applied (Layer 3 will use live rates).</div>

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

        function mockRate(s, r) {
          const table = {
            USD: { NGN: 1650, GHS: 12.8, KES: 130 },
            GBP: { NGN: 2050, GHS: 16.1, KES: 165 },
            EUR: { NGN: 1800, GHS: 14.2, KES: 150 },
            CAD: { NGN: 1200, GHS: 9.5,  KES: 96  },
            AED: { NGN: 450,  GHS: 3.6,  KES: 37  },
            AUD: { NGN: 1100, GHS: 8.7,  KES: 90  }
          };
          return (table[s] && table[s][r]) ? table[s][r] : 1;
        }

        function updateEstimate() {
          const a = Number(amt.value || 0);
          const rate = mockRate(sendCur.value, recvCur.value);
          recvAmt.value = a ? (a * rate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "";
        }

        amt.addEventListener("input", updateEstimate);
        sendCur.addEventListener("change", updateEstimate);
        recvCur.addEventListener("change", updateEstimate);
        modal.querySelector("#cancelFX").addEventListener("click", close);

        modal.querySelector("#fxForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const balances = getBalances();
          const s = sendCur.value;
          const r = recvCur.value;
          const a = Number(amt.value || 0);
          if (a <= 0) return alert("Enter an amount.");

          balances[s] = balances[s] ?? 0;
          balances[r] = balances[r] ?? 0;

          if (balances[s] < a) return alert(`Insufficient ${s} balance.`);

          const rate = mockRate(s, r);
          const out = a * rate;

          balances[s] -= a;
          balances[r] += out;

          setBalances(balances);
          setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

          const tx = addTransaction({
            title: "FX conversion",
            currency: s,
            amount: -a,
            icon: "💱",
            meta: `${s} → ${r}`
          });

          addAlert({
            title: "FX completed",
            sub: `${moneyFmt(s, a)} → ${moneyFmt(r, out)}`,
            body: "FX conversion completed (mock).",
            icon: "💱"
          });

          openReceipt({
            title: "Cross-border FX",
            txId: tx.id,
            lines: [
              `Action: Cross-border FX`,
              `You send: ${moneyFmt(s, a)}`,
              `They receive: ${moneyFmt(r, out)}`,
              `Pair: ${s} → ${r}`,
              `Time: ${new Date(tx.timeISO).toLocaleString()}`
            ]
          });

          close();
        });
      }
    });
  }

  function openShopOnTheFly() {
    openModal({
      title: "Shop on the Fly",
      bodyHTML: `
        <div class="p54-note"><b>Partner tiles</b> open in a new tab (demo).</div>
        <div class="p54-divider"></div>
        <div class="p54-actions" style="justify-content:flex-start;">
          <button class="p54-btn" type="button" data-open="https://www.uber.com/gb/en/">Taxi / Ride-hailing</button>
          <button class="p54-btn" type="button" data-open="https://www.just-eat.co.uk/">Food delivery</button>
          <button class="p54-btn" type="button" data-open="https://www.skyscanner.net/">Flights</button>
          <button class="p54-btn" type="button" data-open="https://www.booking.com/">Hotels</button>
          <button class="p54-btn" type="button" data-open="https://www.ticketmaster.co.uk/">Tickets</button>
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
    openModal({
      title: "Virtual & Linked Cards",
      bodyHTML: `
        <div class="p54-note">
          Layer 2 demo:
          - View masked card
          - Freeze / unfreeze
          - Add card
          <br><br>
          <b>Camera Scan (approved):</b> Scan card with camera to auto-fill details (Layer 3 device APIs).
        </div>

        <div class="p54-divider"></div>

        <div class="p54-receipt">
          <b>Linked Card</b>
          <div class="muted">**** **** **** 4832 • Expires 08/28</div>
          <div class="p54-divider"></div>
          <div class="p54-actions" style="justify-content:flex-start;">
            <button class="p54-btn" type="button" id="freezeBtn">Freeze</button>
            <button class="p54-btn" type="button" id="addCardBtn">Add card</button>
            <button class="p54-btn" type="button" id="scanBtn">Scan card (camera)</button>
          </div>
        </div>

        <div class="p54-actions">
          <button class="p54-btn primary" type="button" id="closeCards">Done</button>
        </div>
      `,
      onMount: ({ modal, close }) => {
        const freezeBtn = modal.querySelector("#freezeBtn");
        let frozen = false;

        freezeBtn.addEventListener("click", () => {
          frozen = !frozen;
          freezeBtn.textContent = frozen ? "Unfreeze" : "Freeze";
          alert(frozen ? "Card frozen ✅" : "Card unfrozen ✅");
        });

        modal.querySelector("#addCardBtn").addEventListener("click", () => {
          alert("Add card flow (Layer 3: tokenised + issuer flows).");
        });

        modal.querySelector("#scanBtn").addEventListener("click", () => {
          alert("Camera scan approved — Layer 3 will use device camera APIs.");
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
          <div class="p54-note">Agent application requires <b>selfie</b> (approved).</div>
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
            <div class="p54-label">Selfie (demo)</div>
            <input class="p54-input" type="file" accept="image/*" />
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

          addAlert({
            title: "Agent application submitted",
            sub: "Pending verification",
            body: "Your agent application has been submitted and will be reviewed.",
            icon: "🧾"
          });

          const tx = addTransaction({
            title: "Agent application",
            currency: localStorage.getItem(LS.CURRENCY) || "NGN",
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
     8) Wiring Buttons in dashboard.html
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

      const names = {
        bills: "Pay Bills & Top-Up",
        savings: "Savings & Goals",
        checkout: "PAY54 Smart Checkout",
        invest: "Investments & Stocks",
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
      if (s === "savings") return placeholderService("Open Savings Pot");
      if (s === "invest") return placeholderService("Investments & Stocks");
    });
  });

})();
