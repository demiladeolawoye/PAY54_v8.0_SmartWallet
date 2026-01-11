/* =========================
   PAY54 Dashboard — Layer 2 Wiring (v8.0 aligned) — v804
   + v805.1 DOM SAFE wrapper ONLY
========================= */

document.addEventListener("DOMContentLoaded", () => {
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
      const balances = getBalances();
      if (cur && Object.prototype.hasOwnProperty.call(balances, cur)) return cur;
      return "NGN";
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

    /* ---------------------------
       2) Modal System (injected)
    --------------------------- */

    function ensureModalStyles() {
      if (document.getElementById("pay54-modal-style")) return;
      const style = document.createElement("style");
      style.id = "pay54-modal-style";
      style.textContent = `
        .p54-modal-backdrop{ position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: grid; place-items: center; z-index: 9999; padding: 18px; }
        body.light .p54-modal-backdrop{ background: rgba(0,0,0,0.35); }
        .p54-modal{ width: min(560px, 100%); border-radius: 18px; border: 1px solid rgba(255,255,255,0.14); background: rgba(10,14,24,0.96); color: rgba(255,255,255,0.92); box-shadow: 0 18px 50px rgba(0,0,0,0.45); overflow: hidden; }
        body.light .p54-modal{ background: rgba(255,255,255,0.95); color: rgba(10,20,40,0.92); border: 1px solid rgba(10,20,40,0.12); box-shadow: 0 18px 50px rgba(20,40,80,0.18); }
        .p54-modal-head{ display:flex; align-items:center; justify-content:space-between; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.10); }
        body.light .p54-modal-head{ border-bottom: 1px solid rgba(10,20,40,0.10); }
        .p54-modal-title{ font-weight: 900; font-size: 15px; letter-spacing: .2px; }
        .p54-x{ border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.04); color: inherit; width: 36px; height: 36px; border-radius: 999px; cursor:pointer; }
        body.light .p54-x{ border-color: rgba(10,20,40,0.14); background: rgba(10,20,40,0.04); }
        .p54-modal-body{ padding: 16px; }
        .p54-form{ display:flex; flex-direction:column; gap: 10px; }
        .p54-row{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 520px){ .p54-row{ grid-template-columns: 1fr; } }
        .p54-label{ font-size: 12px; font-weight: 800; opacity: .85; }
        .p54-input, .p54-select{ height: 44px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: inherit; padding: 0 12px; outline: none; }
        body.light .p54-input, body.light .p54-select{ border-color: rgba(10,20,40,0.14); background: rgba(10,20,40,0.04); }
        .p54-actions{ display:flex; gap: 10px; justify-content:flex-end; margin-top: 10px; flex-wrap: wrap; }
        .p54-btn{ height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.05); color: inherit; padding: 0 14px; font-weight: 900; cursor:pointer; }
        body.light .p54-btn{ border-color: rgba(10,20,40,0.14); background: rgba(10,20,40,0.04); }
        .p54-btn.primary{ border-color: rgba(59,130,246,0.65); background: rgba(59,130,246,0.92); color: #fff; }
        .p54-note{ font-size: 12px; opacity: .82; line-height: 1.35; }
        .p54-divider{ height: 1px; background: rgba(255,255,255,0.10); margin: 12px 0; }
        body.light .p54-divider{ background: rgba(10,20,40,0.10); }
        .p54-receipt{ border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); border-radius: 14px; padding: 12px; font-size: 13px; }
        body.light .p54-receipt{ border-color: rgba(10,20,40,0.12); background: rgba(10,20,40,0.03); }
        .p54-ledger{ display:flex; flex-direction:column; gap: 10px; }
        .p54-ledger-item{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); border-radius: 14px; padding: 12px; }
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
      const balances = getBalances();
      const safeCur = normalizeCurrency(cur);

      pillBtns.forEach((b) => {
        const isActive = b.dataset.cur === safeCur;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      if (currencySelect) currencySelect.value = safeCur;

      if (balanceEl) {
        const amt = Number(balances[safeCur] ?? 0);
        balanceEl.textContent = moneyFmt(safeCur, amt);
      }

      localStorage.setItem(LS.CURRENCY, safeCur);
    }

    pillBtns.forEach((btn) => {
      btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur));
    });

    if (currencySelect) {
      currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));
    }

    setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

    function applyTheme(theme) {
      document.body.classList.toggle("light", theme === "light");
      localStorage.setItem(LS.THEME, theme);
      if (themeToggle) {
        const icon = themeToggle.querySelector(".icon");
        if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
      }
    }

    applyTheme(localStorage.getItem(LS.THEME) || "light");

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const isLight = document.body.classList.contains("light");
        applyTheme(isLight ? "dark" : "light");
      });
    }

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
      const feeds = Array.from(document.querySelectorAll('[data-role="recentTxFeed"]'));
      const visible = feeds.find(el => el && el.offsetParent !== null);
      return visible || feeds[0] || null;
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
       (rest of your v804 continues unchanged)
    --------------------------- */

    // ✅ Keep ALL your existing v804 functions and wiring below exactly the same
    // (openSendPay54, openReceive, openAddMoney, openWithdraw, openBankTransfer, openRequestMoney,
    //  services wiring, shortcuts wiring, etc.)

    // IMPORTANT:
    // Paste the remainder of your v804 code here unchanged (from openSendPay54 onward).
    // The ONLY fix in this file is the DOMContentLoaded wrapper at the very top.

  })();
});
