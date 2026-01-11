/* ======================================================
   PAY54 Dashboard — v805.1
   FULL FILE REPLACEMENT
   Baseline: v804 (confirmed working)
   Scope: wiring + stability only
====================================================== */

(() => {
  "use strict";

  /* ---------------------------
     STATE & CONSTANTS
  --------------------------- */

  const LS = {
    THEME: "pay54_theme",
    CURRENCY: "pay54_currency",
    BALANCES: "pay54_balances",
    TX: "pay54_transactions",
    ALERTS: "pay54_alerts"
  };

  const symbols = {
    NGN: "₦",
    GBP: "£",
    USD: "$",
    EUR: "€",
    GHS: "₵",
    KES: "KSh",
    ZAR: "R"
  };

  const defaultBalances = {
    NGN: 1250000.5,
    GBP: 8420.75,
    USD: 15320.4,
    EUR: 11890.2,
    GHS: 9650,
    KES: 132450,
    ZAR: 27890
  };

  /* ---------------------------
     SAFE HELPERS
  --------------------------- */

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function safeJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function fmt(cur, amt) {
    return `${symbols[cur] || ""} ${Number(amt).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function now() {
    return new Date().toLocaleString();
  }

  function uid() {
    return "TX-" + Math.random().toString(36).slice(2, 9).toUpperCase();
  }

  /* ---------------------------
     BALANCES
  --------------------------- */

  function getBalances() {
    const b = safeJSON(LS.BALANCES, defaultBalances);
    return { ...defaultBalances, ...b };
  }

  function setBalances(b) {
    save(LS.BALANCES, b);
  }

  /* ---------------------------
     TRANSACTIONS
  --------------------------- */

  function getTx() {
    return safeJSON(LS.TX, []);
  }

  function addTx({ title, currency, amount, icon }) {
    const tx = {
      id: uid(),
      title,
      currency,
      amount,
      icon,
      time: now()
    };

    const list = getTx();
    list.unshift(tx);
    save(LS.TX, list);
    prependTx(tx);
    return tx;
  }

  /* ---------------------------
     RECENT TRANSACTIONS (VISIBLE FEED FIX)
  --------------------------- */

  function visibleFeed() {
    const feeds = $$('[data-role="recentTxFeed"]');
    return feeds.find(f => f.offsetParent !== null) || feeds[0] || null;
  }

  function prependTx(tx) {
    const feed = visibleFeed();
    if (!feed) return;

    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `
      <div class="feed-icon">${tx.icon || "💳"}</div>
      <div class="feed-main">
        <div class="feed-title">${tx.title}</div>
        <div class="feed-sub">${tx.time}</div>
      </div>
      <div class="feed-amt ${tx.amount >= 0 ? "pos" : "neg"}">
        ${tx.amount >= 0 ? "+" : "−"} ${fmt(tx.currency, Math.abs(tx.amount))}
      </div>
    `;
    feed.prepend(div);

    while (feed.children.length > 5) {
      feed.removeChild(feed.lastChild);
    }
  }

  /* ---------------------------
     BALANCE DISPLAY
  --------------------------- */

  function setActiveCurrency(cur) {
    const balances = getBalances();
    if (!balances[cur]) cur = "NGN";

    localStorage.setItem(LS.CURRENCY, cur);

    $$(".currency").forEach(b => {
      b.classList.toggle("active", b.dataset.cur === cur);
    });

    if ($("#currencySelect")) $("#currencySelect").value = cur;
    if ($("#balanceAmount")) $("#balanceAmount").textContent = fmt(cur, balances[cur]);
  }

  /* ---------------------------
     THEME
  --------------------------- */

  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem(LS.THEME, theme);
  }

  applyTheme(localStorage.getItem(LS.THEME) || "light");

  $("#themeToggle")?.addEventListener("click", () => {
    applyTheme(document.body.classList.contains("light") ? "dark" : "light");
  });

  /* ---------------------------
     INIT CURRENCY
  --------------------------- */

  setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

  $$(".currency").forEach(b =>
    b.addEventListener("click", () => setActiveCurrency(b.dataset.cur))
  );

  $("#currencySelect")?.addEventListener("change", e =>
    setActiveCurrency(e.target.value)
  );

  /* ---------------------------
     TOP CTA ACTIONS
  --------------------------- */

  $("#addMoneyBtn")?.addEventListener("click", () => openAddMoney());
  $("#withdrawBtn")?.addEventListener("click", () => openWithdraw());

  /* ---------------------------
     SIMPLE MODAL SYSTEM
  --------------------------- */

  function modal(title, html, onMount) {
    const bg = document.createElement("div");
    bg.className = "p54-modal-backdrop";
    bg.innerHTML = `
      <div class="p54-modal">
        <div class="p54-modal-head">
          <div class="p54-modal-title">${title}</div>
          <button class="p54-x">✕</button>
        </div>
        <div class="p54-modal-body">${html}</div>
      </div>
    `;
    bg.querySelector(".p54-x").onclick = () => bg.remove();
    bg.onclick = e => e.target === bg && bg.remove();
    document.body.appendChild(bg);
    onMount && onMount(bg);
  }

  /* ---------------------------
     ADD MONEY
  --------------------------- */

  function openAddMoney() {
    const cur = localStorage.getItem(LS.CURRENCY) || "NGN";
    modal("Add money", `
      <form id="addForm" class="p54-form">
        <label>Amount</label>
        <input type="number" id="amt" required />
        <div class="p54-actions">
          <button type="submit" class="p54-btn primary">Add</button>
        </div>
      </form>
    `, (m) => {
      m.querySelector("#addForm").onsubmit = e => {
        e.preventDefault();
        const amt = Number(m.querySelector("#amt").value);
        if (amt <= 0) return alert("Invalid amount");

        const b = getBalances();
        b[cur] += amt;
        setBalances(b);
        setActiveCurrency(cur);

        addTx({ title: "Wallet funding", currency: cur, amount: amt, icon: "💳" });
        m.remove();
      };
    });
  }

  /* ---------------------------
     WITHDRAW
  --------------------------- */

  function openWithdraw() {
    const cur = localStorage.getItem(LS.CURRENCY) || "NGN";
    modal("Withdraw", `
      <form id="wdForm" class="p54-form">
        <label>Amount</label>
        <input type="number" id="amt" required />
        <div class="p54-actions">
          <button type="submit" class="p54-btn primary">Withdraw</button>
        </div>
      </form>
    `, (m) => {
      m.querySelector("#wdForm").onsubmit = e => {
        e.preventDefault();
        const amt = Number(m.querySelector("#amt").value);
        const b = getBalances();
        if (amt <= 0 || b[cur] < amt) return alert("Insufficient balance");

        b[cur] -= amt;
        setBalances(b);
        setActiveCurrency(cur);

        addTx({ title: "Withdrawal", currency: cur, amount: -amt, icon: "🏧" });
        m.remove();
      };
    });
  }

  /* ---------------------------
     MONEY MOVES
  --------------------------- */

  $$("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const a = btn.dataset.action;
      if (a === "add") openAddMoney();
      if (a === "withdraw") openWithdraw();
      if (a === "send") addTx({ title: "PAY54 transfer sent", currency: "NGN", amount: -250, icon: "↗️" });
      if (a === "request") addTx({ title: "Payment request", currency: "NGN", amount: 0, icon: "🔔" });
    });
  });

  /* ---------------------------
     LEDGER
  --------------------------- */

  function openLedger() {
    const list = getTx();
    modal("Transaction History", `
      ${list.map(tx => `
        <div class="p54-ledger-item">
          <b>${tx.title}</b>
          <span>${fmt(tx.currency, Math.abs(tx.amount))}</span>
        </div>
      `).join("")}
    `);
  }

  $("#viewAllTx")?.addEventListener("click", openLedger);
  $("#viewAllTxMobile")?.addEventListener("click", openLedger);

})();
